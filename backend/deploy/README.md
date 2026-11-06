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
