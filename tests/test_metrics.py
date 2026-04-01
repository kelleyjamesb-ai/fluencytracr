import unittest
from datetime import datetime, timezone, date

from src.events import EnablementEvent
from src.metrics import RollupTable, run_daily_rollup


class MetricsTests(unittest.TestCase):
    def test_daily_rollup_metrics(self) -> None:
        events = [
            EnablementEvent(
                event_type="assessment_pre",
                occurred_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
                org_id="org-1",
                team_id="team-1",
                role_id="role-1",
            ),
            EnablementEvent(
                event_type="assessment_post",
                occurred_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
                org_id="org-1",
                team_id="team-1",
                role_id="role-1",
            ),
            EnablementEvent(
                event_type="everboarding_touch",
                occurred_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
                org_id="org-1",
                team_id="team-1",
                role_id="role-1",
            ),
        ]
        table = RollupTable()
        metrics = run_daily_rollup(events, day=date(2024, 1, 1), rollup_table=table)
        self.assertEqual(len(metrics), 1)
        metric = metrics[0]
        self.assertEqual(metric.assessment_delta, 0)
        self.assertEqual(metric.everboarding_cadence, 1)
        self.assertEqual(metric.percent_enabled_by_role, 1.0)
        self.assertEqual(len(table.by_org["org-1"]), 1)
        self.assertEqual(len(table.by_role["role-1"]), 1)

    def test_rollup_skips_other_days(self) -> None:
        events = [
            EnablementEvent(
                event_type="session_attended",
                occurred_at=datetime(2024, 1, 2, tzinfo=timezone.utc),
                org_id="org-1",
                team_id="team-1",
                role_id="role-1",
            )
        ]
        table = RollupTable()
        metrics = run_daily_rollup(events, day=date(2024, 1, 1), rollup_table=table)
        self.assertEqual(metrics, [])
        self.assertEqual(table.rows, [])


if __name__ == "__main__":
    unittest.main()
