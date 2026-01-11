import unittest
from datetime import datetime, timezone

from src.audit_log import AuditEvent, AuditLog


class AuditLogTests(unittest.TestCase):
    def test_log_and_list_admin_only(self) -> None:
        log = AuditLog()
        event = AuditEvent(
            event_type="data_import",
            occurred_at=datetime(2024, 5, 1, tzinfo=timezone.utc),
            metadata={"org_id": "org-1", "count": "12", "source": "csv"},
        )
        log.log_event(event)
        self.assertEqual(len(log.list_events(requester_role="admin")), 1)
        with self.assertRaises(PermissionError):
            log.list_events(requester_role="viewer")

    def test_rejects_non_collectable_metadata(self) -> None:
        log = AuditLog()
        event = AuditEvent(
            event_type="dashboard_access",
            occurred_at=datetime(2024, 5, 1, tzinfo=timezone.utc),
            metadata={"org_id": "org-1", "prompt_content": "nope"},
        )
        with self.assertRaises(ValueError):
            log.log_event(event)

    def test_rejects_invalid_metadata_keys(self) -> None:
        log = AuditLog()
        event = AuditEvent(
            event_type="role_change",
            occurred_at=datetime(2024, 5, 1, tzinfo=timezone.utc),
            metadata={"org_id": "org-1", "details": "too much"},
        )
        with self.assertRaises(ValueError):
            log.log_event(event)


if __name__ == "__main__":
    unittest.main()
