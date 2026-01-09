import unittest
from datetime import datetime, timezone

from src.events import EnablementEvent, parse_event, validate_event


class EventsTests(unittest.TestCase):
    def test_validate_event_accepts_known_types(self) -> None:
        event = EnablementEvent(
            event_type="assessment_pre",
            occurred_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
            org_id="org-1",
            team_id="team-1",
            role_id="role-1",
        )
        validate_event(event)

    def test_validate_event_rejects_unknown_type(self) -> None:
        event = EnablementEvent(
            event_type="unknown",  # type: ignore[arg-type]
            occurred_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
            org_id="org-1",
            team_id="team-1",
            role_id="role-1",
        )
        with self.assertRaises(ValueError):
            validate_event(event)

    def test_validate_event_requires_timezone(self) -> None:
        event = EnablementEvent(
            event_type="session_attended",
            occurred_at=datetime(2024, 1, 1),
            org_id="org-1",
            team_id="team-1",
            role_id="role-1",
        )
        with self.assertRaises(ValueError):
            validate_event(event)

    def test_parse_event_defaults_timezone(self) -> None:
        payload = {
            "event_type": "assessment_post",
            "occurred_at": "2024-01-01T00:00:00",
            "org_id": "org-1",
            "team_id": "team-1",
            "role_id": "role-1",
        }
        event = parse_event(payload)
        self.assertEqual(event.occurred_at.tzinfo, timezone.utc)


if __name__ == "__main__":
    unittest.main()
