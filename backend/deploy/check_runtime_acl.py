"""TEST-only negative ACL checks; run as malars-test-runtime, never as deployer."""
import os
import uuid
import ydb

DATABASE = '/ru-central1/b1gh45ejbkk3jcuutd48/etnfksq3umfh18ghde7m'

def main():
    if not os.getenv('YDB_ACCESS_TOKEN_CREDENTIALS'):
        raise RuntimeError('explicit_runtime_token_required')
    driver = ydb.Driver(ydb.DriverConfig(
        'grpcs://ydb.serverless.yandexcloud.net:2135', DATABASE,
        credentials=ydb.credentials_from_env_variables(),
        root_certificates=ydb.load_ydb_root_certificate()))
    driver.wait(timeout=15)
    pool = ydb.QuerySessionPool(driver)
    probe_table = 'synthetic_runtime_acl_probe_' + uuid.uuid4().hex
    probes = [
        ('read schema_migrations', 'SELECT version FROM schema_migrations LIMIT 1;'),
        ('read competency_directory', 'SELECT competency_code FROM competency_directory LIMIT 1;'),
        # Intake IDs are UUIDs. This non-UUID sentinel cannot match an intake row.
        ('delete customer row', 'DELETE FROM customer_requests WHERE request_id = "__synthetic_acl_probe_never_used__";'),
        ('create schema', f'CREATE TABLE `{probe_table}` (id Utf8, PRIMARY KEY (id));'),
    ]
    try:
        for label, query in probes:
            try:
                pool.execute_with_retries(query)
            except ydb.Error as error:
                if not isinstance(error, ydb.Unauthorized) and 'AccessDenied' not in str(error):
                    raise
                print('PASS denied: ' + label, flush=True)
            else:
                raise AssertionError('Unexpected permission: ' + label + '; probe table=' + probe_table)
    finally:
        pool.stop()
        driver.stop()

if __name__ == '__main__':
    main()
