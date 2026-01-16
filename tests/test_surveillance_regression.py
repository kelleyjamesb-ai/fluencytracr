import unittest
from dataclasses import fields

from src.api import handle_dashboard_request
from src.access_control import RequestContext
from src.data_contract import NON_COLLECTABLE_FIELDS, validate_payload
from src.exceptions import PrivacyViolationError, ValidationError
from src.events import EnablementEvent
from src.organization import Signal, aggregate_signals
from src.passive_signals import SignalEvent
from src.tool_inventory import ToolRecord
from src.usage_shape import UsageShapeRecord


STORAGE_SCHEMAS = (
    EnablementEvent,
    SignalEvent,
    ToolRecord,
    UsageShapeRecord,
)

INDIVIDUAL_LEVEL_FIELDS = frozenset(
    {
        "user_id",
        "employee_id",
        "member_id",
        "name",
        "email",
        "device_id",
        "session_id",
    }
)

FIELD_CLASSIFICATIONS = {
    "EnablementEvent": {
        "event_type": "event_type",
        "occurred_at": "timestamp",
        "org_id": "org_identifier",
        "team_id": "team_identifier",
        "role_id": "role_identifier",
    },
    "SignalEvent": {
        "source": "signal_source",
        "occurred_at": "timestamp",
        "org_id": "org_identifier",
        "team_id": "team_identifier",
        "role_id": "role_identifier",
        "signal_type": "signal_type",
        "metadata": "aggregated_metadata",
        "is_shadow_ai": "shadow_ai_flag",
    },
    "ToolRecord": {
        "org_id": "org_identifier",
        "team_id": "team_identifier",
        "tool_class": "tool_class",
        "tool_name": "tool_name",
        "recorded_at": "timestamp",
    },
    "UsageShapeRecord": {
        "org_id": "org_identifier",
        "team_id": "team_identifier",
        "role_id": "role_identifier",
        "band": "usage_band",
        "confirmed_by": "confirmation_source",
        "recorded_at": "timestamp",
    },
}


def _schema_fields(schema) -> set[str]:
    return {field.name for field in fields(schema)}


class SurveillanceRegressionTests(unittest.TestCase):
    def test_individual_level_data_not_stored(self) -> None:
        for schema in STORAGE_SCHEMAS:
            schema_fields = _schema_fields(schema)
            overlap = schema_fields.intersection(INDIVIDUAL_LEVEL_FIELDS)
            self.assertFalse(
                overlap,
                msg=f"Individual-level fields found in {schema.__name__}: {sorted(overlap)}",
            )

    def test_prompt_and_output_content_rejected(self) -> None:
        self.assertIn("prompt_content", NON_COLLECTABLE_FIELDS)
        self.assertIn("output_content", NON_COLLECTABLE_FIELDS)
        payload = {
            "event": {
                "metadata": {
                    "prompt_content": "secret",
                    "output_content": "response",
                }
            }
        }
        with self.assertRaises(PrivacyViolationError):
            validate_payload(payload)

    def test_aggregation_rules_cannot_be_bypassed(self) -> None:
        request = RequestContext(
            role="exec",
            endpoint="/dashboard",
            query={"aggregation": "employee"},
        )
        with self.assertRaises(ValidationError):
            handle_dashboard_request(request)
        with self.assertRaises(ValueError):
            aggregate_signals([Signal(team_id="team-1", value=1.0)], scope="employee")

    def test_new_fields_require_classification(self) -> None:
        for schema in STORAGE_SCHEMAS:
            schema_name = schema.__name__
            classifications = FIELD_CLASSIFICATIONS.get(schema_name)
            self.assertIsNotNone(classifications, msg=f"Missing classification for {schema_name}")
            schema_fields = _schema_fields(schema)
            self.assertEqual(
                schema_fields,
                set(classifications.keys()),
                msg=f"Update FIELD_CLASSIFICATIONS for {schema_name}",
            )

if __name__ == "__main__":
    unittest.main()
