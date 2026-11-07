"""Opt-in real-YDB test. Uses synthetic data and fresh keys for each run."""
import os
import json
import secrets
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

        request_id = str(uuid.uuid4())
        payload = {
            "name": "Тестовый заказчик", "contact": "+7 (900) 000-00-01",
            "region": "Тестовый регион", "city": "Тестовый город",
            "description": "Синтетическая проверка записи и чтения",
            "organization": "Тестовая организация", "desired_deadline": "2026-12",
            "email": f"customer-{uuid.uuid4().hex[:10]}@example.invalid",
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

        participant_id = str(uuid.uuid4())
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
                             headers=participant_headers), timeout=60) as response:
            self.assertEqual(response.status, 201)
            participant_created = json.loads(response.read())["data"]
        with urlopen(Request(url + "/api/participants", data=participant_body,
                             headers=participant_headers), timeout=60) as response:
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
                            headers=participant_headers), timeout=60)
        self.assertEqual(conflict.exception.code, 409)

        self.assertEqual(created["request_id"], request_id)
        self.assertEqual(
            {item["type"]: item["value"] for item in created["contact_methods"]},
            {"phone": payload["contact"], "email": payload["email"]},
        )
        self.assertEqual(repeated, created)
        self.assertEqual(read_back, created)
        self.assertEqual(participant_created["participant_id"], participant_id)
        self.assertEqual(participant_repeated, participant_created)
        self.assertEqual(participant_read_back, participant_created)
        with self.assertRaises(HTTPError) as unauthorized:
            urlopen(url + f"/api/customer-requests/{request_id}", timeout=10)
        self.assertEqual(unauthorized.exception.code, 401)

        draft_id = str(uuid.uuid4())
        access_token = secrets.token_urlsafe(32)
        consent_version = os.getenv("PARTICIPANT_CONSENT_VERSION", "CONSENT-PARTICIPANT-PD-1.0")
        draft_answers = {
            "displayName": "Синтетическая TEST компания", "workFormat": "От имени компании",
            "mainCategories": ["Общестроительные работы"], "baseCity": "Тестовый город",
            "phone": "+7 (900) 000-00-00", "consent": True, "consentVersion": consent_version,
        }
        draft_headers = {"Content-Type": "application/json", "Idempotency-Key": draft_id,
                         "X-Participant-Token": access_token}
        draft_url = url + "/api/participant-drafts"
        draft_body = json.dumps({"answers": draft_answers}).encode("utf-8")
        with urlopen(Request(draft_url, data=draft_body, headers=draft_headers), timeout=30) as response:
            self.assertEqual(response.status, 201)
            first_draft = json.loads(response.read())["data"]
        with urlopen(Request(draft_url, data=draft_body, headers=draft_headers), timeout=30) as response:
            self.assertEqual(response.status, 200)
            self.assertEqual(json.loads(response.read())["data"]["intake_id"], draft_id)
        draft_resource = url + f"/api/participant-drafts/{draft_id}"
        with self.assertRaises(HTTPError) as missing_token:
            urlopen(draft_resource, timeout=10)
        self.assertEqual(missing_token.exception.code, 401)
        with self.assertRaises(HTTPError) as wrong_token:
            urlopen(Request(draft_resource, headers={"X-Participant-Token": secrets.token_urlsafe(32)}), timeout=10)
        self.assertEqual(wrong_token.exception.code, 401)
        with urlopen(Request(draft_resource, headers={"X-Participant-Token": access_token}), timeout=10) as response:
            self.assertEqual(response.status, 200)
            draft_read = json.loads(response.read())["data"]
        full_answers = {
            **draft_answers, "legalForm": "ООО", "companyName": "ООО Синтетический тест",
            "inn": "7701234567", "contactName": "Синтетический контакт",
            "email": f"participant-{uuid.uuid4().hex[:10]}@example.invalid",
            "contactChannel": "Email", "baseRegionCode": "REG-025",
            "competencies": ["CON-01 — Демонтажные работы"], "otherWorks": "",
            "executionMethods": ["Собственными силами"], "supply": False,
            "stages": ["Работы на объекте: строительство, монтаж, демонтаж, отделка"],
            "scopes": ["Отдельная работа"], "turnkeyDetails": "",
            "objectExperience": ["Частные дома и коттеджи"], "objectReady": [],
            "geographyMode": "Регион", "regions": ["REG-026"], "travel": "Да",
            "remote": "Нет", "limits": "", "teamSize": "5–10", "crewCount": "2",
            "teamLeads": "1", "canExpand": "Партнёры", "parallelProjects": "2",
            "availability": "Сейчас", "resources": ["Инструмент"], "comment": "",
            "experienceYears": "5–10 лет", "hasProjects": "Да", "role": ["Исполнитель"],
            "workExamples": "Синтетический пример, 2025", "portfolioUrl": "",
            "recommendations": "", "credentials": "", "orderTypes": ["Отдельные этапы или разделы"],
            "minBudget": "Зависит от задачи", "maxScale": "Средний", "contractReady": "Да",
            "vat": "Без НДС", "paymentPreference": ["Поэтапная оплата"], "termsComment": "",
        }
        save_headers = {"Content-Type": "application/json", "X-Participant-Token": access_token,
                        "X-Intake-Revision": str(draft_read["revision"])}
        with urlopen(Request(draft_resource, data=json.dumps({"answers": full_answers}).encode(),
                             headers=save_headers, method="PUT"), timeout=30) as response:
            self.assertEqual(response.status, 200)
            saved = json.loads(response.read())["data"]
        stale_headers = {**save_headers, "X-Intake-Revision": "1"}
        with self.assertRaises(HTTPError) as stale:
            urlopen(Request(draft_resource, data=json.dumps({"answers": full_answers}).encode(),
                            headers=stale_headers, method="PUT"), timeout=10)
        self.assertEqual(stale.exception.code, 409)
        submit_headers = {**save_headers, "X-Intake-Revision": str(saved["revision"])}
        with urlopen(Request(draft_resource + "/submit",
                             data=json.dumps({"answers": full_answers}).encode(),
                             headers=submit_headers), timeout=60) as response:
            self.assertEqual(response.status, 201)
            submitted = json.loads(response.read())["data"]
        self.assertEqual(submitted["public_number"], first_draft["public_number"])
        self.assertEqual(submitted["status"], "review_pending")
        updated_answers = {**full_answers, "phone": "+7 (900) 000-00-02"}
        update_headers = {**save_headers, "X-Intake-Revision": str(submitted["revision"])}
        with urlopen(Request(draft_resource, data=json.dumps({"answers": updated_answers}).encode(),
                             headers=update_headers, method="PUT"), timeout=30) as response:
            self.assertEqual(response.status, 200)
            updated = json.loads(response.read())["data"]
        resubmit_headers = {**save_headers, "X-Intake-Revision": str(updated["revision"])}
        with urlopen(Request(draft_resource + "/submit",
                             data=json.dumps({"answers": updated_answers}).encode(),
                             headers=resubmit_headers), timeout=60) as response:
            self.assertEqual(response.status, 200)
            resubmitted = json.loads(response.read())["data"]
        self.assertEqual(resubmitted["public_number"], first_draft["public_number"])
        self.assertEqual(resubmitted["participant_id"], draft_id)
        self.assertEqual(resubmitted["answers"]["phone"], updated_answers["phone"])
        with urlopen(Request(draft_resource, headers={"X-Participant-Token": access_token}), timeout=10) as response:
            read_submitted = json.loads(response.read())["data"]
        self.assertEqual(read_submitted["participant_id"], draft_id)
        self.assertEqual(read_submitted["public_number"], first_draft["public_number"])


if __name__ == "__main__":
    unittest.main()
