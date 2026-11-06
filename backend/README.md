# TEST backend: customer intake to YDB

This is a small first vertical slice for `malars-test-ydb`. It accepts one customer request, persists the contact person separately from an optional organization, records the consent event, and provides an ID-based read endpoint. Request bodies and contact fields are never logged. Use synthetic values only.

## Run

Set `YDB_ENDPOINT=grpcs://ydb.serverless.yandexcloud.net:2135`, `YDB_DATABASE=/ru-central1/b1gh45ejbkk3jcuutd48/etnfksq3umfh18ghde7m`, and `YDB_AUTH_MODE=metadata` in a Yandex Cloud runtime with its dedicated runtime service account attached. Install `requirements.txt` and run `python app.py`.

Apply schema changes separately with `python -m backend.migrate`; migrations are versioned and are never run on backend startup. For a local/service-account test environment set `YDB_AUTH_MODE=env` and configure the YDB SDK credential environment variables. Do not put service-account keys in GitHub or application logs.

`POST /api/customer-requests` requires a UUID `Idempotency-Key` header and JSON fields `name`, `contact`, `region`, `city`, `description`, `consent: true`, and `consent_version`. `organization` and `desired_deadline` are optional. The configured accepted consent version is `CUSTOMER_CONSENT_VERSION`, defaulting to `CONSENT-CUSTOMER-PD-1.0` for this TEST slice only. `GET /api/customer-requests/{uuid}` reads a record back only when `ADMIN_READ_TOKEN` is configured and supplied as a Bearer token; without that secret the endpoint stays disabled. Do not expose a database read route publicly.

## Checks

Run offline validation tests with `python -m unittest discover -s backend/tests -v`. Run the real TEST YDB scenario with `RUN_YDB_INTEGRATION=1 python -m unittest backend.tests.test_ydb_integration -v` after attaching an authorized TEST runtime identity and applying no manually entered DDL. The integration test applies migrations twice, inserts synthetic customer and participant requests with fresh UUID4 keys for every run, reads it back, and verifies idempotent replay.

The manual GitHub Actions workflow `MALARS TEST YDB integration` uses the existing `malars-test` OIDC environment to run this integration test against only `malars-test-ydb`. Its CI identity needs `ydb.editor` on this database to apply DDL; grant it at database scope only and remove it after the one-off setup if CI migrations are not needed. The application runtime account is separate: give it database connection/read access and YDB row-update access only on the required tables. Do not grant the runtime account schema-management or database-management access.

The first migration creates only the tables needed for this slice and migration tracking. The second migration adds participant intake, competency and object/region directories; `privacy_requests` and file metadata remain planned schema modules; physical files stay outside YDB in private Object Storage. Organizations are never folded into `persons`.
