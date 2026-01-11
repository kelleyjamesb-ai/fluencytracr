import unittest

from src.data_contract import (
    NON_COLLECTABLE_FIELDS,
    validate_payload,
    validate_schema_fields,
)
from src.exceptions import PrivacyViolationError


class DataContractTests(unittest.TestCase):
    def test_non_collectable_fields_match_contract(self) -> None:
        expected = {
            "prompt_content",
            "output_content",
            "keystrokes",
            "file_names",
            "message_text",
            "raw logs",
        }
        self.assertEqual(NON_COLLECTABLE_FIELDS, expected)

    def test_validate_schema_fields_rejects_prohibited(self) -> None:
        with self.assertRaises(PrivacyViolationError):
            validate_schema_fields({"event_name", "prompt_content"})

    def test_validate_payload_rejects_nested_prohibited(self) -> None:
        payload = {
            "event": {
                "metadata": [
                    {"file_names": ["secret.txt"]},
                ]
            }
        }
        with self.assertRaises(PrivacyViolationError):
            validate_payload(payload)

    def test_validate_payload_allows_safe_fields(self) -> None:
        payload = {"event": {"metadata": {"team_count": 3}}}
        validate_payload(payload)


if __name__ == "__main__":
    unittest.main()
