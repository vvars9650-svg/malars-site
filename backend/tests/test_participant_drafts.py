import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from backend.app import (
    RequestError, _draft_to_legacy_payload, _draft_token_hash,
    authorize_participant_draft, validate_participant_draft,
)


class ParticipantDraftTests(unittest.TestCase):
    def setUp(self):
        self.answers = {
            "displayName": "Синтетическая бригада", "workFormat": "В составе бригады",
            "mainCategories": ["Общестроительные работы"], "baseCity": "Тестовый город",
            "phone": "+7 (900) 000-00-00", "consent": True,
            "legalForm": "ООО", "companyName": "ООО Тест", "inn": "7701234567",
            "contactName": "Тестовый контакт", "email": "test@example.invalid",
            "baseRegionCode": "REG-025", "competencies": ["CON-01 — Демонтажные работы"],
            "objectExperience": ["Частные дома и коттеджи"], "objectReady": [],
            "regions": ["REG-026"], "geographyMode": "Регион",
        }

    def test_accepts_partial_server_draft(self):
        self.assertEqual(validate_participant_draft({"answers": self.answers}), self.answers)

    def test_rejects_unrecognized_fields_and_oversize_payload(self):
        with self.assertRaisesRegex(RequestError, "invalid_field"):
            validate_participant_draft({"answers": {**self.answers, "secret": "x"}})
        with self.assertRaisesRegex(RequestError, "invalid_body_size"):
            validate_participant_draft({"answers": {"comment": "x" * 17000}})

    def test_legacy_projection_keeps_reference_codes_and_contact(self):
        projected = _draft_to_legacy_payload({"answers": self.answers, "consent": True,
                                               "consent_version": "CONSENT-PARTICIPANT-PD-1.0"})
        self.assertEqual(projected["competencies"], ["CON-01"])
        self.assertEqual(projected["objectTypes"], ["OBJ-01"])
        self.assertEqual(projected["participant"]["participantType"], "Компания")
        self.assertEqual(projected["participant"]["phone"], self.answers["phone"])

    def test_secret_is_required_and_expiry_is_enforced(self):
        token = "A" * 43
        base = {"intake_id": "intake", "token_hash": _draft_token_hash(token),
                "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
                "answers": "{}", "revision": 1, "status": "draft"}
        with patch("backend.app.read_participant_draft", return_value=base):
            with self.assertRaisesRegex(RequestError, "unauthorized"):
                authorize_participant_draft(None, "intake", "")
            self.assertEqual(authorize_participant_draft(None, "intake", token)["answers"], {})
        expired = {**base, "expires_at": (datetime.now(timezone.utc) - timedelta(seconds=1)).isoformat()}
        with patch("backend.app.read_participant_draft", return_value=expired):
            with self.assertRaisesRegex(RequestError, "link_expired"):
                authorize_participant_draft(None, "intake", token)


if __name__ == "__main__":
    unittest.main()
