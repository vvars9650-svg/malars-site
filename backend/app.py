"""Small TEST-only customer-intake API backed by YDB."""
from __future__ import annotations

import json
import hmac
import hashlib
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
    "ĞšĞ¾Ğ¼Ğ¿Ğ°Ğ½Ğ¸Ñ": {"ĞŸĞĞ", "ĞĞ", "ĞĞĞ"},
    "Ğ˜ĞŸ": {"Ğ˜ĞŸ"},
    "Ğ¡Ğ°Ğ¼Ğ¾Ğ·Ğ°Ğ½ÑÑ‚Ñ‹Ğ¹": {"Ğ¡Ğ°Ğ¼Ğ¾Ğ·Ğ°Ğ½ÑÑ‚Ñ‹Ğ¹"},
    "Ğ‘Ñ€Ğ¸Ğ³Ğ°Ğ´Ğ°": {"Ğ¤Ğ¸Ğ·Ğ»Ğ¸Ñ†Ğ¾"},
    "Ğ§Ğ°ÑÑ‚Ğ½Ñ‹Ğ¹ ÑĞ¿ĞµÑ†Ğ¸Ğ°Ğ»Ğ¸ÑÑ‚": {"Ğ¤Ğ¸Ğ·Ğ»Ğ¸Ñ†Ğ¾"},
}
DOCUMENT_CODES = {
    "DOC-SRO", "DOC-MCHS", "DOC-ETL", "DOC-CERT", "DOC-FSTEK",
    "RES-TOOLS", "RES-EQUIP", "DOC-PORT",
}
WORK_CODES = {row[2] for row in WORKS}
OBJECT_CODES = {row[0] for row in OBJECT_TYPES}
REGION_NAMES = {row[0]: row[1] for row in REGIONS}
REGION_NAMES["RU-ALL"] = "Ğ’ÑÑ Ğ Ğ¾ÑÑĞ¸Ñ"


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

    company_required = participant_type in {"ĞšĞ¾Ğ¼Ğ¿Ğ°Ğ½Ğ¸Ñ", "Ğ˜ĞŸ", "Ğ‘Ñ€Ğ¸Ğ³Ğ°Ğ´Ğ°"}
    company_name = _text(participant, "companyName", 240, company_required)
    inn = re.sub(r"\D", "", _text(participant, "inn", 20))
    if legal_form in {"ĞŸĞĞ", "ĞĞ", "ĞĞĞ"}:
        if not re.fullmatch(r"\d{10}", inn):
            raise RequestError("invalid_inn")
    elif legal_form in {"Ğ˜ĞŸ", "Ğ¡Ğ°Ğ¼Ğ¾Ğ·Ğ°Ğ½ÑÑ‚Ñ‹Ğ¹"} or participant_type in {"Ğ˜ĞŸ", "Ğ¡Ğ°Ğ¼Ğ¾Ğ·Ğ°Ğ½ÑÑ‚Ñ‹Ğ¹"}:
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
    if not isinstance(payment_forms, list×Ş5æÚ$z{-®éÜj×ÙK™Ù]T›ÛJ	Ø]Û‰ËÈ˜[YNˆ	ô'ô`4/´-4/´.ô-´.4`´c4`t-t.taô,4`IÈJJKĞ™Uš\ÚX›J
NÂ‚ˆÛÛœİ[Øš[HH]ØZ]œ›İÜÙ\‹›™]ĞÛÛ^
ÈšY]ÜÜˆÈÚYˆÎLZYÚˆK\Ó[Øš[NˆYK\ÕİXÚˆYHJNÂˆÛÛœİ[Øš[TYÙHH]ØZ][Øš[K›™]ÔYÙJ
NÂˆ]ØZ][Øš[TYÙK™ÛİÊ™\İ[YU\›ÈØZ][[ˆ	Û™]ÛÜšÚYIÈJNÂˆ]ØZ]^Xİ
[Øš[TYÙK™Ù]T›ÛJ	ÚXY[™ÉËÈ˜[YNˆô)ô-t`4/t/´,´.4.ˆ8¡%ˆPSTL‹KÈJJKĞ™Uš\ÚX›J
NÂˆ]ØZ][Øš[TYÙK™Ù]T›ÛJ	Ø]Û‰ËÈ˜[YNˆ	ô'ô`4/´-4/´.ô-´.4`´c4`t-t.taô,4`IÈJK˜ÛXÚÊ
NÂˆ]ØZ]^Xİ
[Øš[TYÙK™Ù]T›ÛJ	ÚXY[™ÉËÈ˜[YNˆ	ô&4-4-t/t`´.4a4.4.´,4a´.4cÈ4.4.´/´/t`´,4.´`´bÉÈJJKĞ™Uš\ÚX›J
NÂˆ]ØZ]^Xİ
[Øš[TYÙK™Ù]U^
	ô&´/´.ô.4aô-t`t`´,´/ˆ4,t`4.4,ô,4-	ÊJKÒ]™PÛİ[

NÂ‚ˆ]ØZ][Øš[TYÙK›ØØ]ÜŠ	ÖÙ]KZÙ^OH›YØ[›Ü›H—IÊKœÙ[XİÜ[ÛŠÈX™[ˆ	ô)4.4-ô.ô.4a´/‰ÈJNÂˆ]ØZ][Øš[TYÙK›ØØ]ÜŠ	ÖÙ]KZÙ^OH˜ÛÛ\[S˜[YH—IÊK™š[
	ô(t.4/t`´-t`´.4aô-t`t.´.4.H4`t/ô-ta´.4,4.ô.4`t`‰ÊNÂˆ]ØZ][Øš[TYÙK›ØØ]ÜŠ	ÖÙ]KZÙ^OH˜ÛÛXİ˜[YH—IÊK™š[
	ô(t.4/t`´-t`´.4aô-t`t.´.4.H4`t/ô-ta´.4,4.ô.4`t`‰ÊNÂˆ]ØZ][Øš[TYÙK›ØØ]ÜŠ	ÖÙ]KZÙ^OH™[XZ[—IÊK™š[
	ÜŞ[]XĞ^[\Kš[˜[Y	ÊNÂˆ]ØZ][Øš[TYÙK›ØØ]ÜŠ	ÖÙ]KZÙ^OH˜ÛÛXİÚ[›™[—IÊKœÙ[XİÜ[ÛŠÈX™[ˆ	Ñ[XZ[	ÈJNÂˆ]ØZ][Øš[TYÙK™Ù]T›ÛJ	Ø]Û‰ËÈ˜[YNˆ	ô(t/´at`4,4/t.4`´c4.4/ô`4/´-4/´.ô-´.4`´c	ÈJK˜ÛXÚÊ
NÂˆ]ØZ][Øš[TYÙK›ØØ]ÜŠ	Ú[œ]Û˜[YOH˜ÛÛ\][˜ÚY\È—IÊK™š\œİ

K˜ÚXÚÊ
NÂˆ]ØZ][Øš[TYÙK™Ù]T›ÛJ	Ø]Û‰ËÈ˜[YNˆ	ô(t/´at`4,4/t.4`´c4.4/ô`4/´-4/´.ô-´.4`´c	ÈJK˜ÛXÚÊ
NÂˆ]ØZ][Øš[TYÙK™Ù]T›ÛJ	Ø]Û‰ËÈ˜[YNˆ	ô(t/´at`4,4/t.4`´c4.4/ô`4/´-4/´.ô-´.4`´c	ÈJK˜ÛXÚÊ
NÂˆ]ØZ][Øš[TYÙK›ØØ]ÜŠ	ÖÙ]KZÙ^OH˜˜\ÙT™YÚ[ÛÛÙH—IÊKœÙ[XİÜ[ÛŠÈX™[ˆ	ô'4/´`t.´,´,	ÈJNÂˆ]ØZ][Øš[TYÙK™Ù]T›ÛJ	Ø]Û‰ËÈ˜[YNˆ	ô(t/´at`4,4/t.4`´c4.4/ô`4/´-4/´.ô-´.4`´c	ÈJK˜ÛXÚÊ
NÂˆ]ØZ][Øš[TYÙK›ØØ]ÜŠ	Ú[œ]Û˜[YOH›Øš™Xİ^\šY[˜ÙH—IÊK™š\œİ

K˜ÚXÚÊ
NÂˆ]ØZ][Øš[TYÙK™Ù]T›ÛJ	Ø]Û‰ËÈ˜[YNˆ	ô(t/´at`4,4/t.4`´c4.4/ô`4/´-4/´.ô-´.4`´c	ÈJK˜ÛXÚÊ
NÂˆ]ØZ][Øš[TYÙK™Ù]T›ÛJ	Ø]Û‰ËÈ˜[YNˆ	ô(t/´at`4,4/t.4`´c4.4/ô`4/´-4/´.ô-´.4`´c	ÈJK˜ÛXÚÊ
NÂˆ]ØZ][Øš[TYÙK™Ù]T›ÛJ	Ø]Û‰ËÈ˜[YNˆ	ô'ô`4/´,´-t`4.4`´c4-4,4/t/tbô-IÈJK˜ÛXÚÊ
NÂˆ]ØZ]^Xİ
[Øš[TYÙK™Ù]T›ÛJ	ÚXY[™ÉËÈ˜[YNˆ	ô'ô`4/´,´-t`4c4`´-H4-4,4/t/tbô-IÈJJKĞ™Uš\ÚX›J
NÂˆ]ØZ][Øš[TYÙK›ØØ]ÜŠ	ÖÙ]KYš[˜[XÛÛœÙ[IÊK˜ÚXÚÊ
NÂˆ]ØZ][Øš[TYÙK™Ù]T›ÛJ	Ø]Û‰ËÈ˜[YNˆ	ô'´`´/ô`4,4,´.4`´c4,4/t.´-t`´`È4/t,4`4,4`t`t/4/´`´`4-t/t.4-IÈJK˜ÛXÚÊ
NÂˆÛÛœİ[X™\“[™HH[Øš[TYÙK™Ù]U^
ô$4/t.´-t`´,8¡%ˆPSTL‹VÌNXKY—^ÌMŸH4/ô/´.ô`ôaô-t/t,ÚJNÂˆ]ØZ]^Xİ
[X™\“[™JKĞ™Uš\ÚX›J
NÂˆÛÛœİX›XÓ[X™\ˆH
]ØZ][X™\“[™K^ÛÛ[

JK›X]Ú
ÓPSTL‹VÌNXKY—^ÌMŸKÚJVÌNÂˆ]ØZ]^Xİ
[Øš[TYÙK™]˜[X]J

HOˆØİ[Y[™Øİ[Y[[[Y[œØÜ›ÛÚYHÚ[™İËš[›™\•ÚY
JKœ™\ÛÛ™\ËĞ™JYJNÂ‚ˆ]ØZ][Øš[TYÙK™Ù]T›ÛJ	Ø]Û‰ËÈ˜[YNˆ	ô&4-ô/4-t/t.4`´c4,4/t.´-t`´`ÉÈJK˜ÛXÚÊ
NÂˆ]ØZ][Øš[TYÙK›ØØ]ÜŠ	ÖÙ]KZÙ^OHœÛ™H—IÊK™š[
	ÊÍÈLLL‰ÊNÂˆ›Üˆ
]ÙXİ[ÛˆHÈÙXİ[ÛˆÈÙXİ[Ûˆ
ÏHJHÂˆ]ØZ][Øš[TYÙK™Ù]T›ÛJ	Ø]Û‰ËÈ˜[YNˆ	ô(t/´at`4,4/t.4`´c4.4/ô`4/´-4/´.ô-´.4`´c	ÈJK˜ÛXÚÊ
NÂˆBˆ]ØZ][Øš[TYÙK™Ù]T›ÛJ	Ø]Û‰ËÈ˜[YNˆ	ô'ô`4/´,´-t`4.4`´c4-4,4/t/tbô-IÈJK˜ÛXÚÊ
NÂˆ]ØZ][Øš[TYÙK›ØØ]ÜŠ	ÖÙ]KYš[˜[XÛÛœÙ[IÊK˜ÚXÚÊ
NÂˆ]ØZ][Øš[TYÙK™Ù]T›ÛJ	Ø]Û‰ËÈ˜[YNˆ	ô'´`´/ô`4,4,´.4`´c4,4/t.´-t`´`È4/t,4`4,4`t`t/4/´`´`4-t/t.4-IÈJK˜ÛXÚÊ
NÂˆ]ØZ]^Xİ
[Øš[TYÙK™Ù]T›ÛJ	ÚXY[™ÉËÈ˜[YNˆ4$4/t.´-t`´,8¡%ˆ	ÜX›XÓ[X™\ŸH4/´,t/t/´,´.ô-t/t,JJKĞ™Uš\ÚX›J
NÂˆ]ØZ]^Xİ
[Øš[TYÙK™]˜[X]J

HOˆØİ[Y[™Øİ[Y[[[Y[œØÜ›ÛÚYHÚ[™İËš[›™\•ÚY
JKœ™\ÛÛ™\ËĞ™JYJNÂˆ]ØZ]\ÚİÜ˜ÛÜÙJ
NÂˆ]ØZ][Øš[K˜ÛÜÙJ
NÂŸJNÂ