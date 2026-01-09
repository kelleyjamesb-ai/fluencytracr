import unittest
from datetime import datetime, timezone

from src.passive_signals import SignalEvent, parse_signal_event, validate_signal_event


class PassiveSignalsTests(unittest.TestCase):
    def test_validate_signal_event_rejects_prohibited_metadata(self) -> None:
        event = SignalEvent(
            source="training_platform",
            occurred_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
            org_id="org-1",
            team_id="team-1",
            role_id="role-1",
            signal_type="course_completed",
            metadata={"prompt_content": "secret"},
        )
        with self.assertRaises(ValueError):
            validate_signal_event(event)

    def test_parse_signal_event_defaults_timezone(self) -> None:
        payload = {
            "source": "support_ticketing",
            "occurred_at": "2024-01-01T00:00:00",
            "org_id": "org-1",
            "team_id": "team-1",
            "role_id": "role-1",
            "signal_type": "ai_tag_applied",
            "ticket_count": "3",
        }
        event = parse_signal_event(payload)
        self.assertEqual(event.occurred_at.tzinfo, timezone.utc)
        self.assertEqual(event.metadata["ticket_count"], "3")


if __name__ == "__main__":
    unittest.main()
