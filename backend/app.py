"""Small TEST-only customer-intake API backed by YDB."""
from __future__ import annotations

import json
import hmac
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

try:
    import ydb
except ImportError:  # Keep validation tests runnable without the cloud SDK.
    ydb = None

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("malars.backend")
MAX_BODY = 16 * 1024
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")


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
    if "@" in result["contact"] and not EMAIL_RE.fullmatch(result["contact"]):
        raise RequestError("invalid_contact")
    organization = payload.get("organization", "")
    deadline = payload.get("desired_deadline", "")
    if not isinstance(organization, str) or len(organization.strip()) > 240:
        raise RequestError("invalid_organization")
    if not isinstance(deadline, str) or len(deadline.strip()) > 80:
        raise RequestError("invalid_desired_deadline")
    if payload.get("consent") is not True or payload.get("consent_version") != consent_version:
        raise RequestError("consent_required")
    result["organization"] = organization.strip()
    result["desired_deadline"] = deadline.strip()
    result["consent_version"] = consent_version
    return result


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
    return {key: getattr(row, key) for key in (
        "request_id", "person_id", "organization_id", "region", "city",
        "description", "desired_deadline", "status", "created_at")}


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
            self.end_headers()
            self.wfile.write(encoded)

        def do_GET(self):
            path = urlparse(self.path).path
            if path == "/health":
                self.respond(200, {"status": "ok"})
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
            if urlparse(self.path).path != "/api/customer-requests":
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

    return Handler


def main():
    _, pool = create_pool()
    server = ThreadingHTTPServer(("0.0.0.0", int(os.getenv("PORT", "8080"))), make_handler(pool))
    server.serve_forever()


if __name__ == "__main__":
    main()
