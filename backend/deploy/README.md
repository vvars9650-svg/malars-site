# TEST deployment

Verified real-YDB integration: https://github.com/vvars9650-svg/malars-site/actions/runs/42275259447
Commit: `2ff0a1a95c89580a6d9f8d9cc3169e8b7c60418c`.

Function: `malars-test-intake`, ID `d4eei0qik3o9n3ac5n66`.
Source ZIP root: app.py, function.py, reference_data.py, requirements.txt.
Runtime: python312; entrypoint: function.handler; timeout: 60 seconds.
Identity: malars-test-runtime (`ajeiujenn2jakrrak0gf`), metadata authentication.
Environment: YDB_ENDPOINT and YDB_DATABASE from backend/README.md;
YDB_AUTH_MODE=metadata. ADMIN_READ_TOKEN is intentionally absent.

Apply runtime-grants.test.sql only to malars-test-ydb after explicit ACL approval.
Replace database-scoped ydb.viewer with ydb.auditor; do not grant ydb.editor
or schema/ACL/delete permissions to runtime. The script grants the read layer
required by update_row on the thirteen written tables. It excludes directories,
legal_documents, and schema_migrations.

Before applying api-gateway.test.yaml, grant functions.functionInvoker to
serviceAccount:ajeiujenn2jakrrak0gf on this function only. Keep the function
private. The gateway exposes only health and the two POST routes; no GET data
routes or catch-all proxy. CORS remains disabled until a TEST frontend origin
is selected. Do not wire the PROD frontend or DNS to this gateway.

Sources:
- https://yandex.cloud/en/docs/ydb/security/
- https://ydb.tech/docs/en/yql/reference/syntax/grant
- https://yandex.cloud/en/docs/api-gateway/concepts/extensions/cloud-functions


## Applied state (2026-11-06)

Owner approved the ACL and TEST endpoint changes. Runtime GRANT applied;
its database-scoped role is now ydb.auditor. The private function's only
explicit binding is functions.functionInvoker for malars-test-runtime.
Version d4e16fngs09r39j0f21c is Active (128 MB).

Gateway malars-test-intake-api (d5dmc1cn4hgv2sulpdpq) is Active:
https://d5dmc1cn4hgv2sulpdpq.d8epmcec.apigw.yandexcloud.net

Both synthetic POST routes passed create/replay checks (201/200), participant
conflict returned 409, health returned 200, data GET routes returned 404,
and unauthenticated direct function invocation returned 403.

check_runtime_acl.py was executed with a short-lived token impersonating
malars-test-runtime. It verified AccessDenied for reading schema_migrations
and competency_directory, deleting a customer row, and creating a table.
Supply YDB_ACCESS_TOKEN_CREDENTIALS only in the process environment. Never run
this negative test as deployer or owner: if permissions are unexpectedly broad,
it can create a uniquely named empty synthetic probe table. The DELETE probe
uses a non-UUID sentinel so no normal intake row can match it.
