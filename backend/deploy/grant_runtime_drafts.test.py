"""Apply the single-table runtime row grant required by participant drafts (TEST only)."""
from __future__ import annotations

import os
import ydb


def main() -> None:
    endpoint = os.environ["YDB_ENDPOINT"]
    database = os.environ["YDB_DATABASE"]
    credentials = ydb.credentials_from_env_variables()
    config = ydb.DriverConfig(endpoint, database, credentials=credentials,
                              root_certificates=ydb.load_ydb_root_certificate())
    with ydb.Driver(config) as driver:
        driver.wait(timeout=10)
        with ydb.QuerySessionPool(driver) as pool:
            pool.execute_with_retries("""
                GRANT SELECT ROW, UPDATE ROW ON `participant_intakes`
                TO `ajeiujenn2jakrrak0gf@as`;
            """)
    print("TEST runtime row access granted on participant_intakes only.")


if __name__ == "__main__":
    main()
