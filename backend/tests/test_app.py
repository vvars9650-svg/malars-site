import unittest
import uuid

from backend.app import RequestError, validate_customer_request


class CustomerRequestValidationTests(unittest.TestCase):
    def setUp(self):
        self.payload = {
            "name": "Тестовый заказчик", "contact": "test@example.invalid",
            "region": "Тестовый регион", "city": "Тестовый город",
            "description": "Синтетическая тестовая заявка",
            "organization": "Тестовая организация", "desired_deadline": "2026-12",
            "email": "test-contact@example.invalid",
            "consent": True, "consent_version": "CONSENT-CUSTOMER-PD-1.0",
        }

    def test_accepts_synthetic_valid_request(self):
        result = validate_customer_request(self.payload, "CONSENT-CUSTOMER-PD-1.0")
        self.assertEqual(result["name"], "Тестовый заказчик")
        self.assertEqual(result["organization"], "Тестовая организация")
        self.assertEqual(result["email"], "test-contact@example.invalid")

    def test_rejects_invalid_optional_email(self):
        self.payload["email"] = "not-an-email"
        with self.assertRaisesRegex(RequestError, "invalid_email"):
            validate_customer_request(self.payload, "CONSENT-CUSTOMER-PD-1.0")

    def test_requires_explicit_consent_and_current_version(self):
        self.payload["consent"] = False
        with self.assertRaisesRegex(RequestError, "consent_required"):
            validate_customer_request(self.payload, "CONSENT-CUSTOMER-PD-1.0")

    def test_rejects_mismatched_consent_version(self):
        with self.assertRaisesRegex(RequestError, "consent_required"):
            validate_customer_request(self.payload, "CONSENT-CUSTOMER-PD-1.1")

    def test_rejects_missing_required_fields(self):
        del self.payload["description"]
        with self.assertRaisesRegex(RequestError, "missing_description"):
            validate_customer_request(self.payload, "CONSENT-CUSTOMER-PD-1.0")

    def test_rejects_oversized_description(self):
        self.payload["description"] = "x" * 4001
        with self.assertRaisesRegex(RequestError, "invalid_description"):
            validate_customer_request(self.payload, "CONSENT-CUSTOMER-PD-1.0")

    def test_accepts_telegram_contact_and_rejects_unstructured_contact(self):
        self.payload["contact"] = "@synthetic_test"
        self.assertEqual(
            validate_customer_request(self.payload, "CONSENT-CUSTOMER-PD-1.0")["contact"],
            "@synthetic_test",
        )
        self.payload["contact"] = "contact me maybe"
        with self.assertRaisesRegex(RequestError, "invalid_contact"):
            validate_customer_request(self.payload, "CONSENT-CUSTOMER-PD-1.0")


if __name__ == "__main__":
    unittest.main()
