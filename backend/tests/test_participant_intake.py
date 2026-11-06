import copy
import unittest
import uuid
from unittest.mock import MagicMock, patch

from ydb.convert import query_parameters_to_pb

from backend.app import RequestError, save_participant, validate_participant_request


class ParticipantRequestValidationTests(unittest.TestCase):
    def setUp(self):
        self.payload = {
            "participant": {
                "participantType": "Компания",
                "legalForm": "ООО",
                "companyName": "ООО Тест",
                "inn": "7701234567",
                "contactName": "Тестовый Контакт",
                "phone": "+7 (900) 000-00-00",
                "telegram": "@synthetic_test",
                "email": "synthetic@example.invalid",
                "baseRegionCode": "REG-025",
                "baseCity": "Тестовый город",
                "teamSize": "5-10",
                "vat": "Без НДС",
                "paymentForms": ["Аванс"],
                "travel": "По своему региону",
                "nationwide": False,
                "minOrder": "От 100 тыс. руб.",
                "maxProject": "До 1 млн руб.",
                "portfolioUrl": "https://example.invalid/portfolio",
                "comment": "Синтетическая анкета для проверки TEST",
            },
            "competencies": ["CON-01"],
            "objectTypes": ["OBJ-01"],
            "regions": [
                {"code": "REG-025", "name": "untrusted label"},
                {"code": "REG-026", "name": "also untrusted"},
            ],
            "documents": ["DOC-SRO", "RES-EQUIP"],
            "consent": True,
            "consent_version": "CONSENT-PARTICIPANT-PD-1.0",
        }

    def test_accepts_and_normalizes_synthetic_participant(self):
        result = validate_participant_request(self.payload, "CONSENT-PARTICIPANT-PD-1.0")
        self.assertEqual(result["participant"]["inn"], "7701234567")
        self.assertEqual(result["competencies"], ["CON-01"])
        self.assertEqual(result["object_types"], ["OBJ-01"])
        self.assertEqual(result["regions"][0], {
            "code": "REG-025", "city": "Тестовый город", "is_base": True,
        })
        self.assertEqual(result["regions"][1]["code"], "REG-026")
        self.assertEqual(result["documents"], ["DOC-SRO", "RES-EQUIP"])

    def test_requires_current_explicit_consent(self):
        payload = copy.deepcopy(self.payload)
        payload["consent"] = False
        with self.assertRaisesRegex(RequestError, "consent_required"):
            validate_participant_request(payload, "CONSENT-PARTICIPANT-PD-1.0")
        with self.assertRaisesRegex(RequestError, "consent_required"):
            validate_participant_request(self.payload, "CONSENT-PARTICIPANT-PD-2.0")

    def test_normalized_participant_serializes_for_ydb_transaction(self):
        data = validate_participant_request(self.payload, "CONSENT-PARTICIPANT-PD-1.0")
        participant_id = str(uuid.uuid4())
        pool = MagicMock()
        session = MagicMock()
        tx = session.transaction.return_value.begin.return_value
        encoded_regions = []

        def execute(query, params):
            encoded = query_parameters_to_pb(params)
            if "UPSERT INTO participant_regions" in query:
                encoded_regions.append(encoded["$rows"])
            return MagicMock()

        tx.execute.side_effect = execute
        pool.retry_operation_sync.side_effect = lambda operation: operation(session)
        from backend.app import _participant_digest
        stored = {"participant_id": participant_id, "payload_hash": _participant_digest(data)}
        with patch("backend.app.read_participant", side_effect=[None, stored]):
            record, created = save_participant(pool, participant_id, data)
        self.assertTrue(created)
        self.assertEqual(record["participant_id"], participant_id)
        self.assertEqual(len(encoded_regions), 1)
        rows = encoded_regions[0].value.items
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0].items[1].text_value, "REG-025")
        self.assertEqual(rows[1].items[1].text_value, "REG-026")
        tx.commit.assert_called_once()

    def test_rejects_mismatched_participant_and_legal_form(self):
        payload = copy.deepcopy(self.payload)
        payload["participant"]["legalForm"] = "ИП"
        with self.assertRaisesRegex(RequestError, "invalid_legal_form"):
            validate_participant_request(payload, "CONSENT-PARTICIPANT-PD-1.0")

    def test_rejects_invalid_tax_id_and_contact(self):
        payload = copy.deepcopy(self.payload)
        payload["participant"]["inn"] = "123"
        with self.assertRaisesRegex(RequestError, "invalid_inn"):
            validate_participant_request(payload, "CONSENT-PARTICIPANT-PD-1.0")
        payload = copy.deepcopy(self.payload)
        payload["participant"]["email"] = "not-an-email"
        with self.assertRaisesRegex(RequestError, "invalid_email"):
            validate_participant_request(payload, "CONSENT-PARTICIPANT-PD-1.0")

    def test_rejects_unknown_reference_codes(self):
        payload = copy.deepcopy(self.payload)
        payload["competencies"] = ["NOT-A-COMPETENCY"]
        with self.assertRaisesRegex(RequestError, "invalid_competencies"):
            validate_participant_request(payload, "CONSENT-PARTICIPANT-PD-1.0")

    def test_rejects_invalid_portfolio_scheme_and_non_boolean_nationwide(self):
        payload = copy.deepcopy(self.payload)
        payload["participant"]["portfolioUrl"] = "javascript:alert(1)"
        with self.assertRaisesRegex(RequestError, "invalid_portfolio_url"):
            validate_participant_request(payload, "CONSENT-PARTICIPANT-PD-1.0")
        payload = copy.deepcopy(self.payload)
        payload["participant"]["nationwide"] = "false"
        with self.assertRaisesRegex(RequestError, "invalid_nationwide"):
            validate_participant_request(payload, "CONSENT-PARTICIPANT-PD-1.0")

    def test_nationwide_adds_a_canonical_all_regions_row(self):
        payload = copy.deepcopy(self.payload)
        payload["participant"]["nationwide"] = True
        result = validate_participant_request(payload, "CONSENT-PARTICIPANT-PD-1.0")
        self.assertEqual(result["regions"][-1], {
            "code": "RU-ALL", "city": "", "is_base": False,
        })

    def test_rejects_inconsistent_nationwide_region_selection(self):
        payload = copy.deepcopy(self.payload)
        payload["regions"].append({"code": "RU-ALL", "name": "Вся Россия"})
        with self.assertRaisesRegex(RequestError, "invalid_regions"):
            validate_participant_request(payload, "CONSENT-PARTICIPANT-PD-1.0")


if __name__ == "__main__":
    unittest.main()
