"""Apply ordered SQL migrations explicitly; this module is never imported by app.py."""
from __future__ import annotations

import glob
import os
from datetime import datetime, timezone

import ydb


def migration_statements(source: str) -> list[str]:
    """Return only executable SQL chunks; ignore the preamble before the first marker."""
    marker = "-- migrate:statement"
    chunks = source.split(marker)
    if len(chunks) < 2:
        raise ValueError("migration_missing_statement_marker")
    statements = [
        part.strip() for part in chunks[1:]
        if any(line.strip() and not line.lstrip().startswith("--")
               for line in part.splitlines())
    ]
    if not statements:
        raise ValueError("migration_has_no_sql_statements")
    return statements


def apply(pool, migration_dir: str) -> tuple[int, int]:
    pool.execute_with_retries("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version Utf8, applied_at Utf8, PRIMARY KEY (version)
        );
    """)
    result = pool.execute_with_retries("SELECT version FROM schema_migrations;")
    applied = {row.version for row in result[0].rows}
    added = 0
    for path in sorted(glob.glob(os.path.join(migration_dir, "*.sql"))):
        version = os.path.basename(path)
        if version in applied:
            continue
        source = open(path, encoding="utf-8").read()
        statements = migration_statements(source)
        for statement in statements:
            pool.execute_with_retries(statement)
        pool.execute_with_retries("""
            DECLARE $version AS Utf8;
            DECLARE $applied_at AS Utf8;
            UPSERT INTO schema_migrations (version, applied_at) VALUES ($version, $applied_at);
        """, {"$version": version, "$applied_at": datetime.now(timezone.utc).isoformat()})
        added += 1
    return added, len(applied) + added


def main():
    endpoint = os.environ["YDB_ENDPOINT"]
    database = os.environ["YDB_DATABASE"]
    auth = os.getenv("YDB_AUTH_MODE", "metadata")
    credentials = ydb.iam.MetadataUrlCredentials() if auth == "metadata" else ydb.credentials_from_env_variables()
    config = ydb.DriverConfig(endpoint, database, credentials=credentials,
                              root_certificates=ydb.load_ydb_root_certificate())
    with ydb.Driver(config) as driver:
        driver.wait(timeout=10)
        with ydb.QuerySessionPool(driver) as pool:
            added, total = apply(pool, os.path.join(os.path.dirname(__file__), "migrations"))
    print(f"migrations_added={added} migrations_total={total}")


if __name__ == "__main__":
    main()
