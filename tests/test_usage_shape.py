import unittest
from datetime import datetime, timezone

from src.usage_shape import UsageShapeRecord, UsageShapeStore, usage_trends


class UsageShapeTests(unittest.TestCase):
    def test_add_and_list_usage(self) -> None:
        store = UsageShapeStore()
        record = UsageShapeRecord(
            org_id="org-1",
            team_id="team-1",
            role_id="role-1",
            band="regular",
            confirmed_by="admin",
            recorded_at=datetime(2024, 2, 1, tzinfo=timezone.utc),
        )
        store.add_usage(record)
        self.assertEqual(len(store.list_usage(org_id="org-1")), 1)
        self.assertEqual(len(store.list_usage(team_id="team-1")), 1)
        self.assertEqual(len(store.list_usage(role_id="role-1")), 1)

    def test_rejects_invalid_band_or_confirmation(self) -> None:
        store = UsageShapeStore()
        with self.assertRaises(ValueError):
            store.add_usage(
                UsageShapeRecord(
                    org_id="org-1",
                    team_id="team-1",
                    role_id="role-1",
                    band="daily",  # type: ignore[arg-type]
                    confirmed_by="admin",
                    recorded_at=datetime(2024, 2, 1, tzinfo=timezone.utc),
                )
            )
        with self.assertRaises(ValueError):
            store.add_usage(
                UsageShapeRecord(
                    org_id="org-1",
                    team_id="team-1",
                    role_id="role-1",
                    band="rare",
                    confirmed_by="manager",  # type: ignore[arg-type]
                    recorded_at=datetime(2024, 2, 1, tzinfo=timezone.utc),
                )
            )

    def test_usage_trends_by_day(self) -> None:
        records = [
            UsageShapeRecord(
                org_id="org-1",
                team_id="team-1",
                role_id="role-1",
                band="rare",
                confirmed_by="pulse",
                recorded_at=datetime(2024, 2, 1, 10, tzinfo=timezone.utc),
            ),
            UsageShapeRecord(
                org_id="org-1",
                team_id="team-1",
                role_id="role-1",
                band="habitual",
                confirmed_by="admin",
                recorded_at=datetime(2024, 2, 1, 15, tzinfo=timezone.utc),
            ),
            UsageShapeRecord(
                org_id="org-1",
                team_id="team-2",
                role_id="role-2",
                band="regular",
                confirmed_by="admin",
                recorded_at=datetime(2024, 2, 2, 9, tzinfo=timezone.utc),
            ),
        ]
        trends = usage_trends(records, org_id="org-1", team_id="team-1")
        self.assertEqual(trends[datetime(2024, 2, 1, tzinfo=timezone.utc).date()]["rare"], 1)
        self.assertEqual(trends[datetime(2024, 2, 1, tzinfo=timezone.utc).date()]["habitual"], 1)


if __name__ == "__main__":
    unittest.main()
