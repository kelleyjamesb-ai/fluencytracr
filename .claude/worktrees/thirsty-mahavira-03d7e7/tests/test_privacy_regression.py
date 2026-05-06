import json
import unittest
from dataclasses import fields
from pathlib import Path

from src.data_contract import NON_COLLECTABLE_FIELDS, validate_schema_fields
from src.events import EnablementEvent
from src.passive_signals import SignalEvent
from src.tool_inventory import ToolRecord
from src.usage_shape import UsageShapeRecord


SNAPSHOT_PATH = Path(__file__).parent / "snapshots" / "privacy_schema.json"


def _schema_fields(schema) -> list[str]:
    return [field.name for field in fields(schema)]


class PrivacyRegressionTests(unittest.TestCase):
    def test_schema_snapshot(self) -> None:
        snapshot = json.loads(SNAPSHOT_PATH.read_text())
        current = {
            "EnablementEvent": _schema_fields(EnablementEvent),
            "SignalEvent": _schema_fields(SignalEvent),
            "ToolRecord": _schema_fields(ToolRecord),
            "UsageShapeRecord": _schema_fields(UsageShapeRecord),
            "non_collectable_fields": sorted(NON_COLLECTABLE_FIELDS),
        }
        self.assertEqual(snapshot, current)

    def test_schema_fields_reject_non_collectable(self) -> None:
        for schema in (EnablementEvent, SignalEvent, ToolRecord, UsageShapeRecord):
            validate_schema_fields(_schema_fields(schema))


if __name__ == "__main__":
    unittest.main()
