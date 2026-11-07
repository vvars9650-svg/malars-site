"""Small TEST-only customer-intake API backed by YDB."""
from __future__ import annotations

import json
import hmac
import hashlib
import logging
import os
import re
import traceback
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

try:
    import ydb
except ImportError:  # Keep validation tests runnable without the cloud SDK.
    ydb = None

try:
    from .reference_data import OBJECT_TYPES, REGIONS, WORKS
except ImportError:  # Running app.py directly inside the container.
    from reference_data import OBJECT_TYPES, REGIONS, WORKS

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("malars.backend")
MAX_BODY = 16 * 1024
PARTICIPANT_DRAFT_TTL_DAYS = int(os.getenv("PARTICIPANT_DRAFT_TTL_DAYS", "30"))
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
PHONE_RE = re.compile(r"^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$")
CONTACT_PHONE_RE = re.compile(r"^\+?\d[\d\s()+-]{5,30}$")
TELEGRAM_RE = re.compile(r"^@[A-Za-z0-9_]{5,32}$")
PARTICIPANT_TYPES = {
    "Компания": {"ПАО", "АО", "ООО"},
    "ИП": {"ИП"},
    "Самозанятый": {"Самозанятый"},
    "Бригада": {"Физлицо"},
    "Частный специалист": {"Физлицо"},
}
DOCUMENT_CODES = {
    "DOC-SRO", "DOC-MCHS", "DOC-ETL", "DOC-CERT", "DOC-FSTEK",
    "RES-TOOLS", "RES-EQUIP", "DOC-PORT",
}
WORK_CODES = {row[2] for row in WORKS}
OBJECT_CODES = {row[0] for row in OBJECT_TYPES}
REGION_NAMES = {row[0]: row[1] for row in REGIONS}
REGION_NAMES["RU-ALL"] = "Вся Россия"


class RequestError(ValueError):
    def __init__(self, code: str, status: int = 400):
        super().__init__(code)
        self.code = code
        self.status = status


def validate_customer_request(payload: object, consent_version: str) -> dict[str, str]:
    if not isinstance(payload, dict):
        raise RequestError("invalid_body")
    required = ("name", "contact", "region", "city", "description")
    result: dict[str, str] = {}
    for key in required:
        value = payload.get(key)
        if not isinstance(value, str) or not value.strip():
            raise RequestError(f"missing_{key}")
        value = value.strip()
        if len(value) > (4000 if key == "description" else 240):
            raise RequestError(f"invalid_{key}")
        result[key] = value
    contact = result["contact"]
    if contact.startswith("@"):
        if not TELEGRAM_RE.fullmatch(contact):
            raise RequestError("invalid_contact")
    elif "@" in contact:
        if not EMAIL_RE.fullmatch(contact):
            raise RequestError("invalid_contact")
    elif not CONTACT_PHONE_RE.fullmatch(contact):
        raise RequestError("invalid_contact")
    organization = payload.get("organization", "")
    deadline = payload.get("desired_deadline", "")
    email = payload.get("email", "")
    if not isinstance(organization, str) or len(organization.strip()) > 240:
        raise RequestError("invalid_organization")
    if not isinstance(deadline, str) or len(deadline.strip()) > 80:
        raise RequestError("invalid_desired_deadline")
    if not isinstance(email, str) or (email.strip() and not EMAIL_RE.fullmatch(email.strip())):
        raise RequestError("invalid_email")
    if payload.get("consent") is not True or payload.get("consent_version") != consent_version:
        raise RequestError("consent_required")
    result["organization"] = organization.strip()
    result["desired_deadline"] = deadline.strip()
    result["email"] = email.strip()
    result["consent_version"] = consent_version
    return result


def _text(container: dict, key: str, limit: int, required: bool = False) -> str:
    value = container.get(key, "")
    if not isinstance(value, str):
        raise RequestError(f"invalid_{key}")
    value = value.strip()
    if required and not value:
        raise RequestError(f"missing_{key}")
    if len(value) > limit:
        raise RequestError(f"invalid_{key}")
    return value


def _string_codes(value: object, allowed: set[str], field: str, limit: int) -> list[str]:
    if not isinstance(value, list) or len(value) > limit:
        raise RequestError(f"invalid_{field}")
    result = []
    for code in value:
        if not isinstance(code, str) or code not in allowed:
            raise RequestError(f"invalid_{field}")
        if code not in result:
            result.append(code)
    return sorted(result)


def validate_participant_request(payload: object, consent_version: str) -> dict:
    if not isinstance(payload, dict) or not isinstance(payload.get("participant"), dict):
        raise RequestError("invalid_body")
    participant = payload["participant"]
    participant_type = _text(participant, "participantType", 80, True)
    legal_form = _text(participant, "legalForm", 80, True)
    if legal_form not in PARTICIPANT_TYPES.get(participant_type, set()):
        raise RequestError("invalid_legal_form")

    contact_name = _text(participant, "contactName", 240, True)
    phone = _text(participant, "phone", 40, True)
    if not PHONE_RE.fullmatch(phone):
        raise RequestError("invalid_phone")
    email = _text(participant, "email", 240, True)
    if not EMAIL_RE.fullmatch(email):
        raise RequestError("invalid_email")

    company_required = participant_type in {"Компания", "ИП", "Бригада"}
    company_name = _text(participant, "companyName", 240, company_required)
    inn = re.sub(r"\D", "", _text(participant, "inn", 20))
    if legal_form in {"ПАО", "АО", "ООО"}:
        if not re.fullmatch(r"\d{10}", inn):
            raise RequestError("invalid_inn")
    elif legal_form in {"ИП", "Самозанятый"} or participant_type in {"ИП", "Самозанятый"}:
        if not re.fullmatch(r"\d{12}", inn):
            raise RequestError("invalid_inn")
    elif inn and not re.fullmatch(r"\d{12}", inn):
        raise RequestError("invalid_inn")

    base_region = _text(participant, "baseRegionCode", 16, True)
    base_city = _text(participant, "baseCity", 160, True)
    if base_region not in REGION_NAMES or base_region == "RU-ALL":
        raise RequestError("invalid_region")
    nationwide = participant.get("nationwide", False)
    if not isinstance(nationwide, bool):
        raise RequestError("invalid_nationwide")

    competencies = _string_codes(payload.get("competencies"), WORK_CODES, "competencies", 70)
    object_types = _string_codes(payload.get("objectTypes"), OBJECT_CODES, "object_types", 15)
    if not competencies:
        raise RequestError("competencies_required")
    if not object_types:
        raise RequestError("object_types_required")

    raw_regions = payload.get("regions", [])
    if not isinstance(raw_regions, list) or len(raw_regions) > 90:
        raise RequestError("invalid_regions")
    extra_region_codes = []
    for item in raw_regions:
        if not isinstance(item, dict):
            raise RequestError("invalid_regions")
        code = item.get("code")
        if not isinstance(code, str) or code not in REGION_NAMES:
            raise RequestError("invalid_regions")
        if code != base_region and code != "RU-ALL" and code not in extra_region_codes:
            extra_region_codes.append(code)
    if not nationwide and "RU-ALL" in [x.get("code") for x in raw_regions if isinstance(x, dict)]:
        raise RequestError("invalid_regions")
    region_rows = [{"code": base_region, "city": base_city, "is_base": True}]
    region_rows.extend({"code": code, "city": "", "is_base": False}
                       for code in sorted(extra_region_codes))
    if nationwide:
        region_rows.append({"code": "RU-ALL", "city": "", "is_base": False})

    documents = _string_codes(payload.get("documents", []), DOCUMENT_CODES, "documents", 8)
    payment_forms = payload.get("paymentForms", [])
    if not isinstance(payment_forms, list) or len(payment_forms) > 8 or any(
        not isinstance(item, str) or len(item.strip()) > 80 for item in payment_forms
    ):
        raise RequestError("invalid_payment_forms")
    payment_forms = sorted({item.strip() for item in payment_forms if item.strip()})

    if payload.get("consent") is not True or payload.get("consent_version") != consent_version:
        raise RequestError("consent_required")

    portfolio_url = _text(participant, "portfolioUrl", 500)
    if portfolio_url:
        parsed_portfolio = urlparse(portfolio_url)
        if parsed_portfolio.scheme not in {"https", "http"} or not parsed_portfolio.netloc:
            raise RequestError("invalid_portfolio_url")

    return {
        "participant": {
            "participant_type": participant_type,
            "legal_form": legal_form,
            "company_name": company_name,
            "inn": inn,
            "contact_name": contact_name,
            "phone": phone,
            "telegram": _text(participant, "telegram", 120),
            "email": email,
            "base_region_code": base_region,
            "base_city": base_city,
            "team_size": _text(participant, "teamSize", 80),
            "vat": _text(participant, "vat", 80),
            "payment_forms": payment_forms,
            "travel": _text(participant, "travel", 80),
            "nationwide": nationwide,
            "min_order": _text(participant, "minOrder", 120),
            "max_project": _text(participant, "maxProject", 120),
            "portfolio_url": portfolio_url,
            "comment": _text(participant, "comment", 4000),
        },
        "competencies": competencies,
        "object_types": object_types,
        "regions": region_rows,
        "documents": documents,
        "consent_version": consent_version,
    }


def validate_participant_draft(payload: object, consent_version: str | None = None,
                               require_level_one: bool = False) -> dict:
    """Validate the resumable TEST questionnaire without requiring final consent."""
    if not isinstance(payload, dict) or not isinstance(payload.get("answers"), dict):
        raise RequestError("invalid_body")
    answers = payload["answers"]
    if len(json.dumps(answers, ensure_ascii=False).encode("utf-8")) > MAX_BODY:
        raise RequestError("invalid_body_size", 413)
    allowed = {
        "participantType", "workFormat", "displayName", "mainCategories", "contactChannel", "supply",
        "legalForm", "companyName", "inn", "contactName", "phone", "email", "telegram",
        "baseRegionCode", "baseCity", "competencies", "otherWorks",
        "executionMethods", "stages", "scopes", "turnkeyDetails", "objectExperience",
        "objectReady", "geographyMode", "regions", "travel", "remote", "limits",
        "teamSize", "crewCount", "teamLeads", "canExpand", "parallelProjects",
        "availability", "resources", "comment", "experienceYears", "hasProjects",
        "role", "workExamples", "portfolioUrl", "recommendations", "credentials",
        "orderTypes", "minBudget", "maxScale", "contractReady", "vat", "paymentPreference",
        "termsComment", "consent", "consentVersion",
    }
    if any(key not in allowed for key in answers):
        raise RequestError("invalid_field")
    if "consent" in answers and not isinstance(answers["consent"], bool):
        raise RequestError("invalid_consent")
    list_fields = {"mainCategories", "competencies", "executionMethods", "stages", "scopes",
                   "objectExperience", "objectReady", "regions", "resources", "role", "orderTypes",
                   "paymentPreference"}
    for key, value in answers.items():
        if key in list_fields:
            if not isinstance(value, list) or len(value) > 100 or any(not isinstance(item, str) or len(item) > 240 for item in value):
                raise RequestError(f"invalid_{key}")
        elif key in {"consent", "supply"}:
            if not isinstance(value, bool):
                raise RequestError("invalid_consent")
        elif key in {"crewCount", "teamLeads", "parallelProjects"}:
            if not isinstance(value, str) or (value and (not value.isdigit() or int(value) > 1000)):
                raise RequestError(f"invalid_{key}")
        elif not isinstance(value, str) or len(value) > (4000 if key in {"comment", "workExamples", "recommendations", "turnkeyDetails", "termsComment", "limits"} else 500):
            raise RequestError(f"invalid_{key}")
    if answers.get("phone") and not CONTACT_PHONE_RE.fullmatch(answers["phone"]):
        raise RequestError("invalid_phone")
    if answers.get("email") and not EMAIL_RE.fullmatch(answers["email"]):
        raise RequestError("invalid_email")
    if answers.get("consent") is True and consent_version is not None and answers.get("consentVersion") != consent_version:
        raise RequestError("consent_required")
    if require_level_one:
        if not all(isinstance(answers.get(k), str) and answers[k].strip() for k in ("displayName", "workFormat", "baseCity", "phone")):
            raise RequestError("level_one_incomplete")
        if not answers.get("mainCategories") or answers.get("consent") is not True:
            raise RequestError("level_one_incomplete")
    return answers


def _first_row(pool, query: str, params: dict | None = None):
    sets = pool.execute_with_retries(query, params or {})
    rows = sets[0].rows if sets else []
    return rows[0] if rows else None


def read_customer_request(pool, request_id: str) -> dict | None:
    row = _first_row(pool, """
        DECLARE $request_id AS Utf8;
        SELECT request_id, person_id, organization_id, region, city,
               description, desired_deadline, status, created_at
        FROM customer_requests WHERE request_id = $request_id;
    """, {"$request_id": request_id})
    if row is None:
        return None
    record = {key: getattr(row, key) for key in (
        "request_id", "person_id", "organization_id", "region", "city",
        "description", "desired_deadline", "status", "created_at")}
    # Read the table separately because the public intake response does not expose it.
    sets = pool.execute_with_retries("""
        DECLARE $person_id AS Utf8;
        SELECT method_type, value FROM person_contact_methods
        WHERE person_id = $person_id;
    """, {"$person_id": record["person_id"]})
    contact_rows = sets[0].rows if sets else []
    record["contact_methods"] = sorted(
        ({"type": item.method_type, "value": item.value} for item in contact_rows),
        key=lambda item: item["type"],
    )
    return record


def save_customer_request(pool, request_id: str, data: dict[str, str]) -> tuple[dict, bool]:
    existing = read_customer_request(pool, request_id)
    if existing is not None:
        return existing, False
    person_id = str(uuid.uuid5(uuid.UUID(request_id), "person"))
    organization_id = str(uuid.uuid5(uuid.UUID(request_id), "organization")) if data["organization"] else ""
    created_at = datetime.now(timezone.utc).isoformat()
    def write_transaction(session):
        tx = session.transaction().begin()
        statements = []
        statements.append(("""
            DECLARE $person_id AS Utf8;
            DECLARE $person_name AS Utf8;
            DECLARE $contact AS Utf8;
            DECLARE $created_at AS Utf8;
            UPSERT INTO persons (person_id, display_name, primary_contact, created_at)
                VALUES ($person_id, $person_name, $contact, $created_at);
        """, {"$person_id": person_id, "$person_name": data["name"],
              "$contact": data["contact"], "$created_at": created_at}))
        primary_method = "telegram" if data["contact"].startswith("@") else "email" if "@" in data["contact"] else "phone"
        contact_methods = [{"person_id": person_id, "method_type": primary_method, "value": data["contact"]}]
        if data.get("email") and data["email"] != data["contact"]:
            contact_methods.append({"person_id": person_id, "method_type": "email", "value": data["email"]})
        _upsert_struct_rows(
            tx, "person_contact_methods", ["person_id", "method_type", "value"],
            [ydb.PrimitiveType.Utf8, ydb.PrimitiveType.Utf8, ydb.PrimitiveType.Utf8],
            contact_methods,
        )
        if organization_id:
            statements.append(("""
                DECLARE $organization_id AS Utf8;
                DECLARE $organization_name AS Utf8;
                DECLARE $created_at AS Utf8;
                UPSERT INTO organizations (organization_id, name, created_at)
                    VALUES ($organization_id, $organization_name, $created_at);
            """, {"$organization_id": organization_id,
                  "$organization_name": data["organization"], "$created_at": created_at}))
        statements.extend([
            ("""
                DECLARE $request_id AS Utf8;
                DECLARE $person_id AS Utf8;
                DECLARE $organization_id AS Utf8;
                DECLARE $region AS Utf8;
                DECLARE $city AS Utf8;
                DECLARE $description AS Utf8;
                DECLARE $desired_deadline AS Utf8;
                DECLARE $created_at AS Utf8;
                UPSERT INTO customer_requests
                    (request_id, person_id, organization_id, region, city, description,
                     desired_deadline, status, created_at)
                    VALUES ($request_id, $person_id, $organization_id, $region, $city,
                            $description, $desired_deadline, "new", $created_at);
            """, {"$request_id": request_id, "$person_id": person_id,
                  "$organization_id": organization_id, "$region": data["region"],
                  "$city": data["city"], "$description": data["description"],
                  "$desired_deadline": data["desired_deadline"], "$created_at": created_at}),
            ("""
                DECLARE $request_id AS Utf8;
                DECLARE $person_id AS Utf8;
                DECLARE $consent_version AS Utf8;
                DECLARE $created_at AS Utf8;
                UPSERT INTO consent_events
                    (event_id, person_id, request_id, consent_type, consent_version,
                     policy_version, form_version, consented, source, created_at)
                    VALUES ($request_id, $person_id, $request_id, "customer_pd",
                            $consent_version, "PPD-MALARS-1.0", "FORM-LEGAL-1.0",
                            true, "customer_form", $created_at);
            """, {"$request_id": request_id, "$person_id": person_id,
                  "$consent_version": data["consent_version"], "$created_at": created_at}),
        ])
        for statement, params in statements:
            with tx.execute(statement, params):
                pass
        tx.commit()

    pool.retry_operation_sync(write_transaction)
    record = read_customer_request(pool, request_id)
    if record is None:
        raise RuntimeError("write_readback_failed")
    return record, True


def _participant_digest(data: dict) -> str:
    canonical = json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _draft_token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("ascii")).hexdigest()


def read_participant_draft(pool, intake_id: str) -> dict | None:
    row = _first_row(pool, """
        DECLARE $intake_id AS Utf8;
        SELECT intake_id, public_number, answers, status, revision, created_at, updated_at,
               expires_at, participant_id, token_hash
        FROM participant_intakes WHERE intake_id = $intake_id;
    """, {"$intake_id": intake_id})
    if row is None:
        return None
    return {key: getattr(row, key) for key in (
        "intake_id", "public_number", "answers", "status", "revision", "created_at",
        "updated_at", "expires_at", "participant_id", "token_hash")}


def create_participant_draft(pool, answers: dict, intake_id: str, token: str) -> tuple[dict, bool]:
    if not re.fullmatch(r"[A-Za-z0-9_-]{40,60}", token or ""):
        raise RequestError("invalid_access_token")
    token_hash = _draft_token_hash(token)
    existing = read_participant_draft(pool, intake_id)
    if existing:
        if not hmac.compare_digest(existing["token_hash"], token_hash):
            raise RequestError("idempotency_conflict", 409)
        existing["answers"] = json.loads(existing["answers"])
        existing.pop("token_hash", None)
        return existing, False
    now = datetime.now(timezone.utc)
    expires = now.timestamp() + PARTICIPANT_DRAFT_TTL_DAYS * 86400
    created_at = now.isoformat()
    expires_at = datetime.fromtimestamp(expires, timezone.utc).isoformat()
    answers_json = json.dumps(answers, ensure_ascii=False, separators=(",", ":"))
    # The number is an identifier only; access always requires the 256-bit bearer token.
    public_number = f"MAL-P-26-{__import__('secrets').token_hex(8).upper()}"
    if _first_row(pool, "DECLARE $public_number AS Utf8; SELECT intake_id FROM participant_intakes WHERE public_number = $public_number;", {"$public_number": public_number}):
        return create_participant_draft(pool, answers, intake_id, token)
    try:
        pool.execute_with_retries("""
        DECLARE $intake_id AS Utf8;
        DECLARE $public_number AS Utf8;
        DECLARE $answers AS Utf8;
        DECLARE $created_at AS Utf8;
        DECLARE $updated_at AS Utf8;
        DECLARE $expires_at AS Utf8;
        DECLARE $token_hash AS Utf8;
        INSERT INTO participant_intakes
            (intake_id, public_number, answers, status, revision, created_at, updated_at,
             expires_at, participant_id, token_hash)
        VALUES ($intake_id, $public_number, $answers, "draft", 1, $created_at, $updated_at,
                $expires_at, "", $token_hash);
        """, {"$intake_id": intake_id, "$public_number": public_number, "$answers": answers_json,
              "$created_at": created_at, "$updated_at": created_at, "$expires_at": expires_at,
              "$token_hash": token_hash})
    except Exception:
        # A concurrent create or a lost response may have committed the same idempotency key.
        existing = read_participant_draft(pool, intake_id)
        if existing is None:
            raise
        if not hmac.compare_digest(existing["token_hash"], token_hash):
            raise RequestError("idempotency_conflict", 409) from None
        existing["answers"] = json.loads(existing["answers"])
        existing.pop("token_hash", None)
        return existing, False
    draft = read_participant_draft(pool, intake_id)
    draft["answers"] = answers
    return draft, True


def authorize_participant_draft(pool, intake_id: str, token: str) -> dict:
    if not re.fullmatch(r"[A-Za-z0-9_-]{40,60}", token or ""):
        raise RequestError("unauthorized", 401)
    draft = read_participant_draft(pool, intake_id)
    if not draft:
        raise RequestError("not_found", 404)
    if datetime.fromisoformat(draft["expires_at"]) <= datetime.now(timezone.utc):
        raise RequestError("link_expired", 401)
    if not hmac.compare_digest(draft["token_hash"], _draft_token_hash(token)):
        raise RequestError("unauthorized", 401)
    draft["answers"] = json.loads(draft["answers"])
    return draft


def update_participant_draft(pool, draft: dict, answers: dict) -> dict:
    if draft["status"] not in {"draft", "submitted", "review_pending"}:
        raise RequestError("invalid_status", 409)
    expected = int(draft["revision"])
    updated_at = datetime.now(timezone.utc).isoformat()
    changed = {**draft, "answers": answers, "revision": expected + 1, "updated_at": updated_at}
    changed["answers_json"] = json.dumps(answers, ensure_ascii=False, separators=(",", ":"))
    def write_transaction(session):
        tx = session.transaction().begin()
        with tx.execute("""
            DECLARE $intake_id AS Utf8;
            SELECT revision FROM participant_intakes WHERE intake_id = $intake_id;
        """, {"$intake_id": draft["intake_id"]}) as result:
            rows = result[0].rows if result else []
        if not rows or int(rows[0].revision) != expected:
            tx.rollback()
            raise RequestError("revision_conflict", 409)
        with tx.execute("""
            DECLARE $intake_id AS Utf8;
            DECLARE $answers AS Utf8;
            DECLARE $revision AS Uint64;
            DECLARE $updated_at AS Utf8;
            UPDATE participant_intakes SET answers = $answers, revision = $revision,
                updated_at = $updated_at WHERE intake_id = $intake_id;
        """, {"$intake_id": draft["intake_id"], "$answers": changed["answers_json"],
              "$revision": expected + 1, "$updated_at": updated_at}):
            pass
        tx.commit()
    pool.retry_operation_sync(write_transaction)
    return changed


def submit_participant_draft(pool, draft: dict, answers: dict, consent_version: str) -> tuple[dict, bool]:
    final_payload = {"answers": answers, "consent": True, "consent_version": consent_version}
    participant_data = validate_participant_request(_draft_to_legacy_payload(final_payload), consent_version)
    if draft["status"] in {"submitted", "review_pending"}:
        if _participant_digest({"answers": draft["answers"]}) == _participant_digest({"answers": answers}):
            return draft, False
        updated = update_participant_draft(pool, draft, answers)
        updated["status"] = "review_pending"
        return updated, False
    record, created = save_participant(pool, draft["intake_id"], participant_data, "review_pending")
    changed = {**draft, "answers": answers, "status": "review_pending", "participant_id": draft["intake_id"],
               "revision": int(draft["revision"]) + 1, "updated_at": datetime.now(timezone.utc).isoformat()}
    pool.execute_with_retries("""
        DECLARE $intake_id AS Utf8; DECLARE $public_number AS Utf8; DECLARE $answers AS Utf8;
        DECLARE $status AS Utf8; DECLARE $revision AS Uint64; DECLARE $created_at AS Utf8;
        DECLARE $updated_at AS Utf8; DECLARE $expires_at AS Utf8; DECLARE $participant_id AS Utf8;
        DECLARE $token_hash AS Utf8;
        UPSERT INTO participant_intakes (intake_id, public_number, answers, status, revision,
            created_at, updated_at, expires_at, participant_id, token_hash)
        VALUES ($intake_id, $public_number, $answers, $status, $revision, $created_at,
            $updated_at, $expires_at, $participant_id, $token_hash);
    """, {"$intake_id": draft["intake_id"], "$public_number": draft["public_number"],
          "$answers": json.dumps(answers, ensure_ascii=False, separators=(",", ":")),
          "$status": "review_pending", "$revision": changed["revision"],
          "$created_at": draft["created_at"], "$updated_at": changed["updated_at"],
          "$expires_at": draft["expires_at"], "$participant_id": draft["intake_id"],
          "$token_hash": draft["token_hash"]})
    return {**changed, "data": record}, created


def _draft_to_legacy_payload(payload: dict) -> dict:
    a = payload["answers"]
    legal = a.get("legalForm", "")
    work_format = a.get("workFormat", "")
    if legal in {"ООО", "АО", "ПАО"}:
        participant_type = "Компания"
    elif legal == "ИП":
        participant_type = "ИП"
    elif legal == "Самозанятый":
        participant_type = "Самозанятый"
    else:
        participant_type = "Бригада" if work_format == "В составе бригады" else "Частный специалист"
    legal_form = legal if legal in {"ООО", "АО", "ПАО", "ИП", "Самозанятый"} else "Физлицо"
    company_name = a.get("companyName", "")
    if participant_type == "Бригада" and not company_name:
        company_name = a.get("displayName", "")
    participant = {"participantType": participant_type, "legalForm": legal_form,
        "companyName": company_name, "inn": a.get("inn", ""),
        "contactName": a.get("contactName", a.get("displayName", "")), "phone": a.get("phone", ""),
        "email": a.get("email", ""), "telegram": a.get("telegram", ""),
        "baseRegionCode": a.get("baseRegionCode", "REG-052"), "baseCity": a.get("baseCity", ""),
        "teamSize": a.get("teamSize", ""), "vat": a.get("vat", ""),
            "paymentForms": a.get("paymentPreference", []), "travel": a.get("travel", ""),
        "nationwide": a.get("geographyMode") == "Вся Россия", "minOrder": a.get("minBudget", ""),
        "maxProject": a.get("maxScale", ""), "portfolioUrl": a.get("portfolioUrl", ""),
        "comment": a.get("termsComment", a.get("comment", ""))}
    competency_codes = []
    for value in a.get("competencies", []):
        code = value.split(" — ", 1)[0] if isinstance(value, str) else ""
        competency_codes.append(code)
    object_name_to_code = {name: code for code, name in OBJECT_TYPES}
    object_codes = [object_name_to_code.get(v, v) for v in a.get("objectExperience", []) + a.get("objectReady", [])]
    regions = [{"code": c} for c in a.get("regions", []) if isinstance(c, str)]
    if participant["nationwide"]:
        regions.append({"code": "RU-ALL"})
    return {"participant": participant, "competencies": competency_codes,
        "objectTypes": sorted(set(object_codes)),
        "regions": regions, "documents": [], "consent": payload["consent"],
        "consent_version": payload["consent_version"]}


def read_participant(pool, participant_id: str) -> dict | None:
    row = _first_row(pool, """
        DECLARE $participant_id AS Utf8;
        SELECT participant_id, person_id, organization_id, status, payload_hash, created_at
        FROM participants WHERE participant_id = $participant_id;
    """, {"$participant_id": participant_id})
    if row is None:
        return None
    return {key: getattr(row, key) for key in (
        "participant_id", "person_id", "organization_id", "status", "payload_hash", "created_at")}


def _upsert_struct_rows(transaction, table: str, columns: list[str], types: list, rows: list[dict]) -> None:
    if not rows:
        return
    if ydb is None:
        raise RuntimeError("ydb_sdk_missing")
    struct_type = ydb.StructType()
    for name, value_type in zip(columns, types):
        struct_type.add_member(name, value_type)
    yql_types = {
        ydb.PrimitiveType.Utf8: "Utf8",
        ydb.PrimitiveType.Bool: "Bool",
    }
    type_text = ", ".join(f"{name}: {yql_types[value_type]}" for name, value_type in zip(columns, types))
    column_text = ", ".join(columns)
    query = f"""
        DECLARE $rows AS List<Struct<{type_text}>>;
        UPSERT INTO {table} ({column_text})
        SELECT {column_text} FROM AS_TABLE($rows);
    """
    params = {"$rows": ydb.TypedValue(rows, ydb.ListType(struct_type))}
    with transaction.execute(query, params):
        pass


def save_participant(pool, participant_id: str, data: dict, status: str = "new") -> tuple[dict, bool]:
    digest = _participant_digest(data)
    existing = read_participant(pool, participant_id)
    if existing is not None:
        if not hmac.compare_digest(existing["payload_hash"], digest):
            raise RequestError("idempotency_conflict", 409)
        existing.pop("payload_hash", None)
        return existing, False

    participant = data["participant"]
    person_id = str(uuid.uuid5(uuid.UUID(participant_id), "participant-person"))
    has_organization = bool(participant["company_name"]) and participant["participant_type"] in {"Компания", "ИП"}
    organization_id = (str(uuid.uuid5(uuid.UUID(participant_id), "participant-organization"))
                       if has_organization else "")
    created_at = datetime.now(timezone.utc).isoformat()

    def write_transaction(session):
        tx = session.transaction().begin()
        statements = [
            ("""
                DECLARE $person_id AS Utf8;
                DECLARE $display_name AS Utf8;
                DECLARE $primary_contact AS Utf8;
                DECLARE $created_at AS Utf8;
                UPSERT INTO persons (person_id, display_name, primary_contact, created_at)
                VALUES ($person_id, $display_name, $primary_contact, $created_at);
            """, {"$person_id": person_id, "$display_name": participant["contact_name"],
                  "$primary_contact": "", "$created_at": created_at}),
        ]
        if has_organization:
            statements.extend([
                ("""
                    DECLARE $organization_id AS Utf8;
                    DECLARE $name AS Utf8;
                    DECLARE $created_at AS Utf8;
                    UPSERT INTO organizations (organization_id, name, created_at)
                    VALUES ($organization_id, $name, $created_at);
                """, {"$organization_id": organization_id, "$name": participant["company_name"],
                      "$created_at": created_at}),
                ("""
                    DECLARE $organization_id AS Utf8;
                    DECLARE $legal_form AS Utf8;
                    DECLARE $inn AS Utf8;
                    UPSERT INTO organization_registration (organization_id, legal_form, inn)
                    VALUES ($organization_id, $legal_form, $inn);
                """, {"$organization_id": organization_id, "$legal_form": participant["legal_form"],
                      "$inn": participant["inn"]}),
            ])

        statements.extend([
            ("""
                DECLARE $participant_id AS Utf8;
                DECLARE $person_id AS Utf8;
                DECLARE $organization_id AS Utf8;
                DECLARE $payload_hash AS Utf8;
                DECLARE $created_at AS Utf8;
                DECLARE $status AS Utf8;
                UPSERT INTO participants
                    (participant_id, person_id, organization_id, status, payload_hash, created_at)
                VALUES ($participant_id, $person_id, $organization_id, $status, $payload_hash, $created_at);
            """, {"$participant_id": participant_id, "$person_id": person_id,
                  "$organization_id": organization_id, "$payload_hash": digest,
                  "$created_at": created_at, "$status": status}),
            ("""
                DECLARE $participant_id AS Utf8;
                DECLARE $participant_type AS Utf8;
                DECLARE $legal_form AS Utf8;
                DECLARE $inn AS Utf8;
                DECLARE $team_size AS Utf8;
                DECLARE $vat AS Utf8;
                DECLARE $payment_forms AS Utf8;
                DECLARE $travel AS Utf8;
                DECLARE $nationwide AS Bool;
                DECLARE $min_order AS Utf8;
                DECLARE $max_project AS Utf8;
                DECLARE $portfolio_url AS Utf8;
                DECLARE $notes AS Utf8;
                UPSERT INTO participant_profiles
                    (participant_id, participant_type, legal_form, inn, team_size, vat,
                     payment_forms, travel, nationwide, min_order, max_project, portfolio_url, notes)
                VALUES ($participant_id, $participant_type, $legal_form, $inn, $team_size, $vat,
                        $payment_forms, $travel, $nationwide, $min_order, $max_project, $portfolio_url, $notes);
            """, {"$participant_id": participant_id, "$participant_type": participant["participant_type"],
                  "$legal_form": participant["legal_form"],
                  "$inn": "" if has_organization else participant["inn"],
                  "$team_size": participant["team_size"], "$vat": participant["vat"],
                  "$payment_forms": json.dumps(participant["payment_forms"], ensure_ascii=False),
                  "$travel": participant["travel"], "$nationwide": participant["nationwide"],
                  "$min_order": participant["min_order"], "$max_project": participant["max_project"],
                  "$portfolio_url": participant["portfolio_url"], "$notes": participant["comment"]}),
        ])
        for statement, params in statements:
            with tx.execute(statement, params):
                pass

        contact_rows = [
            {"person_id": person_id, "method_type": "phone", "value": participant["phone"]},
            {"person_id": person_id, "method_type": "email", "value": participant["email"]},
        ]
        if participant["telegram"]:
            contact_rows.append({"person_id": person_id, "method_type": "telegram",
                                 "value": participant["telegram"]})
        _upsert_struct_rows(tx, "person_contact_methods",
            ["person_id", "method_type", "value"],
            [ydb.PrimitiveType.Utf8, ydb.PrimitiveType.Utf8, ydb.PrimitiveType.Utf8],
            contact_rows)
        _upsert_struct_rows(tx, "participant_competencies",
            ["participant_id", "competency_code"],
            [ydb.PrimitiveType.Utf8, ydb.PrimitiveType.Utf8],
            [{"participant_id": participant_id, "competency_code": code} for code in data["competencies"]])
        _upsert_struct_rows(tx, "participant_object_types",
            ["participant_id", "object_type_code"],
            [ydb.PrimitiveType.Utf8, ydb.PrimitiveType.Utf8],
            [{"participant_id": participant_id, "object_type_code": code} for code in data["object_types"]])
        _upsert_struct_rows(tx, "participant_regions",
            ["participant_id", "region_code", "city", "is_base"],
            [ydb.PrimitiveType.Utf8, ydb.PrimitiveType.Utf8,
             ydb.PrimitiveType.Utf8, ydb.PrimitiveType.Bool],
            [{"participant_id": participant_id, "region_code": row["code"],
              "city": row["city"], "is_base": row["is_base"]}
             for row in data["regions"]])
        _upsert_struct_rows(tx, "participant_documents",
            ["participant_id", "document_code"],
            [ydb.PrimitiveType.Utf8, ydb.PrimitiveType.Utf8],
            [{"participant_id": participant_id, "document_code": code} for code in data["documents"]])

        consent_event_id = str(uuid.uuid5(uuid.UUID(participant_id), "participant-consent"))
        consent_sql = """
            DECLARE $event_id AS Utf8;
            DECLARE $person_id AS Utf8;
            DECLARE $participant_id AS Utf8;
            DECLARE $consent_version AS Utf8;
            DECLARE $created_at AS Utf8;
            UPSERT INTO participant_consent_events
                (event_id, person_id, participant_id, consent_type, consent_version,
                 policy_version, form_version, consented, source, created_at)
            VALUES ($event_id, $person_id, $participant_id, "participant_pd", $consent_version,
                    "PPD-MALARS-1.0", "FORM-LEGAL-1.0", true, "participant_form", $created_at);
        """
        with tx.execute(consent_sql, {"$event_id": consent_event_id, "$person_id": person_id,
                                     "$participant_id": participant_id,
                                     "$consent_version": data["consent_version"],
                                     "$created_at": created_at}):
            pass
        tx.commit()

    pool.retry_operation_sync(write_transaction)
    record = read_participant(pool, participant_id)
    if record is None or not hmac.compare_digest(record["payload_hash"], digest):
        raise RuntimeError("participant_write_readback_failed")
    record.pop("payload_hash", None)
    return record, True


def create_pool():
    if ydb is None:
        raise RuntimeError("ydb_sdk_missing")
    endpoint, database = os.getenv("YDB_ENDPOINT"), os.getenv("YDB_DATABASE")
    if not endpoint or not database:
        raise RuntimeError("ydb_configuration_missing")
    auth_mode = os.getenv("YDB_AUTH_MODE", "metadata")
    credentials = (ydb.iam.MetadataUrlCredentials() if auth_mode == "metadata"
                  else ydb.credentials_from_env_variables())
    config = ydb.DriverConfig(endpoint, database, credentials=credentials,
                              root_certificates=ydb.load_ydb_root_certificate())
    driver = ydb.Driver(config)
    driver.wait(timeout=10)
    return driver, ydb.QuerySessionPool(driver)


def make_handler(pool):
    expected_consent = os.getenv("CUSTOMER_CONSENT_VERSION", "CONSENT-CUSTOMER-PD-1.0")
    expected_participant_consent = os.getenv(
        "PARTICIPANT_CONSENT_VERSION", "CONSENT-PARTICIPANT-PD-1.0")

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, fmt, *args):
            # The stdlib handler normally logs the full URL; keep access logs minimal.
            logger.info("http_access status=%s", args[1] if len(args) > 1 else "unknown")

        def respond(self, status: int, body: dict):
            encoded = json.dumps(body, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("Referrer-Policy", "no-referrer")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            self.wfile.write(encoded)

        def do_GET(self):
            path = urlparse(self.path).path
            if path == "/health":
                self.respond(200, {"status": "ok"})
                return
            draft_prefix = "/api/participant-drafts/"
            if path.startswith(draft_prefix):
                try:
                    intake_id = str(uuid.UUID(unquote(path[len(draft_prefix):])))
                    draft = authorize_participant_draft(pool, intake_id, self.headers.get("X-Participant-Token", ""))
                    draft.pop("token_hash", None)
                    self.respond(200, {"data": draft})
                except RequestError as exc:
                    self.respond(exc.status, {"error": exc.code})
                except ValueError:
                    self.respond(400, {"error": "invalid_request"})
                return
            participant_prefix = "/api/participants/"
            if path.startswith(participant_prefix):
                expected = os.getenv("ADMIN_READ_TOKEN", "")
                supplied = self.headers.get("Authorization", "")
                if not expected:
                    self.respond(503, {"error": "read_endpoint_not_configured"})
                    return
                if not hmac.compare_digest(supplied, f"Bearer {expected}"):
                    self.respond(401, {"error": "unauthorized"})
                    return
                try:
                    participant_id = str(uuid.UUID(unquote(path[len(participant_prefix):])))
                except ValueError:
                    self.respond(400, {"error": "invalid_participant_id"})
                    return
                try:
                    record = read_participant(pool, participant_id)
                except Exception:
                    logger.error("operation=read_participant error_code=ydb_read_failed")
                    self.respond(503, {"error": "storage_unavailable"})
                    return
                if record is not None:
                    record.pop("payload_hash", None)
                self.respond(200, {"data": record} if record else {"error": "not_found"})
                return
            prefix = "/api/customer-requests/"
            if path.startswith(prefix):
                expected = os.getenv("ADMIN_READ_TOKEN", "")
                supplied = self.headers.get("Authorization", "")
                if not expected:
                    self.respond(503, {"error": "read_endpoint_not_configured"})
                    return
                if not hmac.compare_digest(supplied, f"Bearer {expected}"):
                    self.respond(401, {"error": "unauthorized"})
                    return
                try:
                    request_id = str(uuid.UUID(unquote(path[len(prefix):])))
                except ValueError:
                    self.respond(400, {"error": "invalid_request_id"})
                    return
                try:
                    record = read_customer_request(pool, request_id)
                except Exception:
                    logger.error("operation=read_customer_request error_code=ydb_read_failed")
                    self.respond(503, {"error": "storage_unavailable"})
                    return
                self.respond(200, {"data": record} if record else {"error": "not_found"})
                return
            self.respond(404, {"error": "not_found"})

        def do_POST(self):
            path = urlparse(self.path).path
            if path == "/api/participant-drafts":
                try:
                    length = int(self.headers.get("Content-Length", "0"))
                    if length < 1 or length > MAX_BODY:
                        raise RequestError("invalid_body_size", 413)
                    payload = json.loads(self.rfile.read(length))
                    answers = validate_participant_draft(
                        payload, expected_participant_consent, require_level_one=True)
                    intake_id = str(uuid.UUID(self.headers.get("Idempotency-Key", "")))
                    draft, created = create_participant_draft(
                        pool, answers, intake_id, self.headers.get("X-Participant-Token", ""))
                    draft.pop("token_hash", None)
                    self.respond(201 if created else 200, {"data": draft})
                except RequestError as exc:
                    self.respond(exc.status, {"error": exc.code})
                except (ValueError, json.JSONDecodeError):
                    self.respond(400, {"error": "invalid_request"})
                except Exception:
                    logger.error("operation=create_participant_draft error_code=ydb_write_failed")
                    self.respond(503, {"error": "storage_unavailable"})
                return
            draft_submit = re.fullmatch(r"/api/participant-drafts/([0-9a-fA-F-]{36})/submit", path)
            if draft_submit:
                try:
                    length = int(self.headers.get("Content-Length", "0"))
                    if length < 1 or length > MAX_BODY:
                        raise RequestError("invalid_body_size", 413)
                    payload = json.loads(self.rfile.read(length))
                    version = os.getenv("PARTICIPANT_CONSENT_VERSION", expected_participant_consent)
                    answers = validate_participant_draft(payload, version)
                    intake_id = str(uuid.UUID(draft_submit.group(1)))
                    draft = authorize_participant_draft(pool, intake_id, self.headers.get("X-Participant-Token", ""))
                    if int(self.headers.get("X-Intake-Revision", "0")) != int(draft["revision"]):
                        raise RequestError("revision_conflict", 409)
                    submitted, created = submit_participant_draft(pool, draft, answers, version)
                    submitted.pop("token_hash", None)
                    self.respond(201 if created else 200, {"data": submitted})
                except RequestError as exc:
                    self.respond(exc.status, {"error": exc.code})
                except (ValueError, json.JSONDecodeError):
                    self.respond(400, {"error": "invalid_request"})
                except Exception:
                    logger.error("operation=submit_participant_draft error_code=ydb_write_failed")
                    self.respond(503, {"error": "storage_unavailable"})
                return
            if path == "/api/participants":
                try:
                    length = int(self.headers.get("Content-Length", "0"))
                    if length < 1 or length > MAX_BODY:
                        raise RequestError("invalid_body_size", 413)
                    payload = json.loads(self.rfile.read(length))
                    data = validate_participant_request(payload, expected_participant_consent)
                    participant_id = str(uuid.UUID(self.headers.get("Idempotency-Key", "")))
                    record, created = save_participant(pool, participant_id, data)
                    self.respond(201 if created else 200, {"data": record})
                except RequestError as exc:
                    self.respond(exc.status, {"error": exc.code})
                except (ValueError, json.JSONDecodeError):
                    self.respond(400, {"error": "invalid_request"})
                except Exception as exc:
                    logger.error("operation=create_participant error_code=ydb_write_failed exception_type=%s",
                                 type(exc).__name__)
                    self.respond(503, {"error": "storage_unavailable"})
                return
            if path != "/api/customer-requests":
                self.respond(404, {"error": "not_found"})
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if length < 1 or length > MAX_BODY:
                    raise RequestError("invalid_body_size", 413)
                payload = json.loads(self.rfile.read(length))
                data = validate_customer_request(payload, expected_consent)
                request_id = str(uuid.UUID(self.headers.get("Idempotency-Key", "")))
                record, created = save_customer_request(pool, request_id, data)
                self.respond(201 if created else 200, {"data": record})
            except RequestError as exc:
                self.respond(exc.status, {"error": exc.code})
            except (ValueError, json.JSONDecodeError):
                self.respond(400, {"error": "invalid_request"})
            except Exception:
                logger.error("operation=create_customer_request error_code=ydb_write_failed")
                self.respond(503, {"error": "storage_unavailable"})

        def do_PUT(self):
            path = urlparse(self.path).path
            match = re.fullmatch(r"/api/participant-drafts/([0-9a-fA-F-]{36})", path)
            if not match:
                self.respond(404, {"error": "not_found"})
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if length < 1 or length > MAX_BODY:
                    raise RequestError("invalid_body_size", 413)
                payload = json.loads(self.rfile.read(length))
                version = os.getenv("PARTICIPANT_CONSENT_VERSION", expected_participant_consent)
                answers = validate_participant_draft(payload, version)
                intake_id = str(uuid.UUID(match.group(1)))
                draft = authorize_participant_draft(pool, intake_id, self.headers.get("X-Participant-Token", ""))
                if int(self.headers.get("X-Intake-Revision", "0")) != int(draft["revision"]):
                    raise RequestError("revision_conflict", 409)
                updated = update_participant_draft(pool, draft, answers)
                updated.pop("token_hash", None)
                self.respond(200, {"data": updated})
            except RequestError as exc:
                self.respond(exc.status, {"error": exc.code})
            except (ValueError, json.JSONDecodeError):
                self.respond(400, {"error": "invalid_request"})
            except Exception as exc:
                frame = next((item for item in reversed(traceback.extract_tb(exc.__traceback__))
                              if os.path.basename(item.filename) == "app.py"), None)
                location = f"app.py:{frame.lineno}" if frame else "unknown"
                logger.error("operation=update_participant_draft error_code=ydb_write_failed exception_type=%s error_location=%s",
                             type(exc).__name__, location)
                self.respond(503, {"error": "storage_unavailable"})

    return Handler


def main():
    _, pool = create_pool()
    server = ThreadingHTTPServer(("0.0.0.0", int(os.getenv("PORT", "8080"))), make_handler(pool))
    server.serve_forever()


if __name__ == "__main__":
    main()
