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

        participant_id = str(uuid.uuid5(uuid.NAMESPACE_URL, "malars-test-synthetic-participant-v1"))
        participant_payload = {
            "participant": {
                "participantType": "Компания", "legalForm": "ООО",
                "companyName": "ООО Синтетический Тест", "inn": "7701234567",
                "contactName": "Синтетический Контакт", "phone": "+7 (900) 000-00-00",
                "telegram": "@synthetic_test", "email": "synthetic@example.invalid",
                "baseRegionCode": "REG-025", "baseCity": "Тестовый город",
                "teamSize": "5-10", "vat": "Без НДС", "paymentForms": ["Аванс"],
                "travel": "По своему региону", "nationwide": False,
                "minOrder": "От 100 тыс. руб.", "maxProject": "До 1 млн руб.",
                "portfolioUrl": "", "comment": "Синтетическая TEST анкета",
            },
            "competencies": ["CON-01", "FIN-03"],
            "objectTypes": ["OBJ-01", "OBJ-03"],
            "regions": [{"code": "REG-025", "name": "Тестовый регион"},
                        {"code": "REG-026", "name": "Другой тестовый регион"}],
            "documents": ["DOC-SRO"],
            "consent": True,
            "consent_version": os.getenv(
                "PARTICIPANT_CONSENT_VERSION", "CONSENT-PARTICIPANT-PD-1.0"),
        }
        participant_body = json.dumps(participant_payload).encode("utf-8")
        participant_headers = {
            "Content-Type": "application/json", "Idempotency-Key": participant_id,
        }
        with urlopen(Request(url + "/api/participants", data=participant_body,
                             headers=participant_headers), timeout=10) as response:
            self.assertEqual(response.status, 201)
            participant_created = json.loads(response.read())["data"]
        with urlopen(Request(url + "/api/participants", data=participant_body,
                             headers=participant_headers), timeout=10) as response:
            self.assertEqual(response.status, 200)
            participant_repeated = json.loads(response.read())["data"]
        participant_read_request = Request(
            url + f"/api/participants/{participant_id}",
            headers={"Authorization": "Bearer synthetic-test-only-token"})
        with urlopen(participant_read_request, timeout=10) as response:
            self.assertEqual(response.status, 200)
            participant_read_back = json.loads(response.read())["data"]

        conflict_payload = dict(participant_payload)
        conflict_payload["participant"] = dict(participant_payload["participant"])
        conflict_payload["participant"]["comment"] = "Другой запрос с тем же ключом"
        with self.assertRaises(HTTPError) as conflict:
            urlopen(Request(url + "/api/participants",
                            data=json.dumps(conflict_payload).encode("utf-8"),
                            headers=participant_headers), timeout=10)
        self.assertEqual(conflict.exception.code, 409)

        self.assertEqual(created["request_id"], request_id)
        self.assertEqual(repeated, created)
        self.assertEqual(read_back, created)
        self.assertEqual(participant_created["participant_id"], participant_id)
        self.assertEqual(participant_repeated, participant_created)
        self.assertEqual(participant_read_back, participant_created)
        with self.assertRaises(HTTPError) as unauthorized:
            urlopen(url + f"/api/customer-requests/{request_id}", timeout=10)
        self.assertEqual(unauthorized.exception.code, 401)


if __name__ == "__main__":
    unittest.main()
