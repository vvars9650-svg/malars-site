import os
import unittest
from unittest.mock import patch

from backend.function import handler


class CloudFunctionAdapterTests(unittest.TestCase):
    def test_health_is_a_liveness_response_without_opening_ydb(self):
        response = handler({"httpMethod": "GET", "path": "/health", "headers": {}}, None)
        self.assertEqual(response["statusCode"], 200)
        self.assertIn('"status": "ok"', response["body"])

    def test_preflight_allows_only_the_configured_test_origin(self):
        with patch.dict(os.environ, {"CORS_ALLOWED_ORIGINS": "https://test.example.invalid"}):
            allowed = handler({
                "httpMethod": "OPTIONS", "path": "/api/participants",
                "headers": {"origin": "https://test.example.invalid"},
            }, None)
            denied = handler({
                "httpMethod": "OPTIONS", "path": "/api/participants",
                "headers": {"origin": "https://other.example.invalid"},
            }, None)
        self.assertEqual(allowed["statusCode"], 204)
        self.assertEqual(allowed["headers"]["Access-Control-Allow-Origin"], "https://test.example.invalid")
        self.assertNotIn("Access-Control-Allow-Origin", denied["headers"])

    def test_unknown_route_does_not_initialize_database(self):
        response = handler({"httpMethod": "GET", "path": "/not-found", "headers": {}}, None)
        self.assertEqual(response["statusCode"], 404)


if __name__ == "__main__":
    unittest.main()
