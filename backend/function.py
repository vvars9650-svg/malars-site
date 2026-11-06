"""Yandex Cloud Functions adapter for the transport-neutral TEST intake API."""
from __future__ import annotations

import base64
import hmac
import json
import logging
import os
import uuid
from urllib.parse import unquote

try:
    from .app import (
        MAX_BODY, RequestError, create_pool, read_customer_request, read_participant,
        save_customer_request, save_participant, validate_customer_request,
        validate_participant_request,
    )
except ImportError:  # Cloud Functions source root is the backend directory.
    from app import (
        MAX_BODY, RequestError, create_pool, read_customer_request, read_participant,
        save_customer_request, save_participant, validate_customer_request,
        validate_participant_request,
    )

logger = logging.getLogger("malars.function")
_driver = None
_pool = None


def _response(status: int, body: dict | str, headers: dict[str, str] | None = None) -> dict:
    if isinstance(body, str):
        encoded = body
    else:
        encoded = json.dumps(body, ensure_ascii=False)
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            **(headers or {}),
        },
        "isBase64Encoded": False,
        "body": encoded,
    }


def _cors(origin: str) -> dict[str, str]:
    allowed = {item.strip() for item in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",") if item.strip()}
    if origin and origin in allowed:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key",
            "Access-Control-Max-Age": "600",
            "Vary": "Origin",
        }
    return {}


def _path_and_method(event: dict) -> tuple[str, str]:
    context = event.get("requestContext") or {}
    http_context = context.get("http") or {}
    path = event.get("path") or event.get("rawPath") or event.get("url") or "/"
    method = event.get("httpMethod") or http_context.get("method") or "GET"
    return str(method).upper(), str(path).split("?", 1)[0]


def _body_bytes(event: dict) -> bytes:
    body = event.get("body") or ""
    if not isinstance(body, str):
        raise RequestError("invalid_body")
    try:
        raw = base64.b64decode(body, validate=True) if event.get("isBase64Encoded") else body.encode("utf-8")
    except (ValueError, TypeError):
        raise RequestError("invalid_body") from None
    if len(raw) > MAX_BODY:
        raise RequestError("invalid_body_size", 413)
    return raw


def _admin_read(event: dict) -> bool | None:
    expected = os.getenv("ADMIN_READ_TOKEN", "")
    headers = {str(k).lower(): str(v) for k, v in (event.get("headers") or {}).items()}
    supplied = headers.get("authorization", "")
    if not expected:
        return None
    return hmac.compare_digest(supplied, f"Bearer {expected}")


def _get_pool():
    global _driver, _pool
    if _pool is None:
        _driver, _pool = create_pool()
    return _pool


def handler(event: dict, context) -> dict:
    """Cloud Functions entry point used by API Gateway's cloud_functions integration."""
    if not isinstance(event, dict):
        return _response(400, {"error": "invalid_request"})
    method, path = _path_and_method(event)
    headers = {str(k).lower(): str(v) for k, v in (event.get("headers") or {}).items()}
    cors_headers = _cors(headers.get("origin", ""))

    if method == "OPTIONS":
        return {"statusCode": 204, "headers": cors_headers, "isBase64Encoded": False, "body": ""}
    if method == "GET" and path == "/health":
        return _response(200, {"status": "ok"}, cors_headers)

    is_customer_read = method == "GET" and path.startswith("/api/customer-requests/")
    is_participant_read = method == "GET" and path.startswith("/api/participants/")
    is_intake_write = method == "POST" and path in {"/api/customer-requests", "/api/participants"}
    if not (is_customer_read or is_participant_read or is_intake_write):
        return _response(404, {"error": "not_found"}, cors_headers)

    try:
        pool = _get_pool()
        if is_customer_read:
            authorized = _admin_read(event)
            if authorized is None:
                return _response(503, {"error": "read_endpoint_not_configured"}, cors_headers)
            if not authorized:
                return _response(401, {"error": "unauthorized"}, cors_headers)
            request_id = str(uuid.UUID(unquote(path[len("/api/customer-requests/"):])) )
            record = read_customer_request(pool, request_id)
            return _response(200, {"data": record} if record else {"error": "not_found"}, cors_headers)

        if is_participant_read:
            authorized = _admin_read(event)
            if authorized is None:
                return _response(503, {"error": "read_endpoint_not_configured"}, cors_headers)
            if not authorized:
                return _response(401, {"error": "unauthorized"}, cors_headers)
            participant_id = str(uuid.UUID(unquote(path[len("/api/participants/"):])) )
            record = read_participant(pool, participant_id)
            if record:
                record.pop("payload_hash", None)
            return _response(200, {"data": record} if record else {"error": "not_found"}, cors_headers)

        if is_intake_write:
            payload = json.loads(_body_bytes(event))
            key = str(uuid.UUID(headers.get("idempotency-key", "")))
            if path == "/api/customer-requests":
                version = os.getenv("CUSTOMER_CONSENT_VERSION", "CONSENT-CUSTOMER-PD-1.0")
                data = validate_customer_request(payload, version)
                record, created = save_customer_request(pool, key, data)
            else:
                version = os.getenv("PARTICIPANT_CONSENT_VERSION", "CONSENT-PARTICIPANT-PD-1.0")
                data = validate_participant_request(payload, version)
                record, created = save_participant(pool, key, data)
            return _response(201 if created else 200, {"data": record}, cors_headers)

        return _response(404, {"error": "not_found"}, cors_headers)
    except RequestError as exc:
        return _response(exc.status, {"error": exc.code}, cors_headers)
    except (ValueError, json.JSONDecodeError):
        return _response(400, {"error": "invalid_request"}, cors_headers)
    except Exception:
        logger.error("operation=function_request error_code=storage_or_runtime_failure")
        return _response(503, {"error": "storage_unavailable"}, cors_headers)
