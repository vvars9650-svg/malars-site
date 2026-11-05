"""Opt-in real-YDB test. Uses only a deterministic synthetic request."""
import os
import unittest
import uuid

from backend.app import create_pool, save_customer_request, validate_customer_request
from backend.migrate import apply


@unittest.skipUnless(os.getenv("RUN_YDB_INTEGRATION") == "1", "set RUN_YDB_INTEGRATION=1 for TEST YDB")
class YdbIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.driver, cls.pool = create_pool()
        cls.migration_dir = os.path.join(os.path.dirname(__file__), "..", "migrations")

    @classmethod
    def tearDownClass(cls):
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
        data = validate_customer_request(payload, payload["consent_version"])
        written, created = save_customer_request(self.pool, request_id, data)
        read_back, created_again = save_customer_request(self.pool, request_id, data)
        self.assertTrue(created)
        self.assertFalse(created_again)
        self.assertEqual(written["request_id"], request_id)
        self.assertEqual(read_back, written)


if __name__ == "__main__":
    unittest.main()
