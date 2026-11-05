"""Opt-in real-YDB test. Uses only a deterministic synthetic request."""
import os
import json
import threading
import unittest
import uuid
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from backend.app import create_pool, make_handler
from backend.migrate import apply


@unittest.skipUnless(os.getenv("RUN_YDB_INTEGRATION") == "1", "set RUN_YDB_INTEGRATION=1 for TEST YDB")
class YdbIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.driver, cls.pool = create_pool()
        cls.migration_dir = os.path.join(os.path.dirname(__file__), "..", "migrations")
        os.environ["ADMIN_READ_TOKEN"] = "synthetic-test-only-token"
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(cls.pool))
        cls.server_thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.server_thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        os.environ.pop("ADMIN_READ_TOKEN", None)
        cls.pool.stop()
        cls.driver.stop()

    def test_migrations_write_read_and_repeat(self):
        first = apply(self.pool, self.migration_dir)
        second = apply(self.pool, self.migration_dir)
        self.assertEqual(second[0], 0)
        self.assertEqual(first[1], second[1])

        request_id = str(uuid.uuid5(uuid.NAMESPACE_URL, "malars-test-synthetic-customer-request-v1"))
        payload = {
            "name": "Тестовый заказчик", "contact": "test@example.invalid",
            "region": "Тестовый регион", "city": "Тестовый город",
            "description": "Синтетическая проверка записи и чтения",
            "organization": "Тестовая организация", "desired_deadline": "2026-12",
            "consent": True, "consent_version": os.getenv("CUSTOMER_CONSENT_VERSION", "CONSENT-CUSTOMER-PD-1.0"),
        }
        url = f"http://127.0.0.1:{self.server.server_port}"
        body = json.dumps(payload).encode("utf-8")
        headers = {"Content-Type": "application/json", "Idempotency-Key": request_id}
        with urlopen(Request(url + "/api/customer-requests", data=body, headers=headers), timeout=10) as response:
            self.assertEqual(response.status, 201)
            created = json.loads(response.read())["data"]
        with urlopen(Request(url + "/api/customer-requests", data=body, headers=headers), timeout=10) as response:
            self.assertEqual(response.status, 200)
            repeated = json.loads(response.read())["data"]
        read_request = Request(url + f"/api/customer-requests/{request_id}",
                               headers={"Authorization": "Bearer synthetic-test-only-token"})
        with urlopen(read_request, timeout=10) as response:
            self.assertEqual(response.status, 200)
            read_back = json.loads(response.read())["data"]
        self.assertEqual(created["request_id"], request_id)
        self.assertEqual(repeated, created)
        self.assertEqual(read_back, created)
        with self.assertRaises(HTTPError) as unauthorized:
            urlopen(url + f"/api/customer-requests/{request_id}", timeout=10)
        self.assertEqual(unauthorized.exception.code, 401)


if __name__ == "__main__":
    unittest.main()
