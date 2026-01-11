import unittest
from datetime import date, datetime, timezone

from src.organization import Team
from src.spread_metrics import SpreadRollupTable, run_spread_rollup
from src.tool_inventory import ToolRecord


class SpreadMetricsTests(unittest.TestCase):
    def test_spread_rollup_org_only(self) -> None:
        teams = [Team(team_id="team-1", name="Team 1"), Team(team_id="team-2", name="Team 2")]
        records = [
            ToolRecord(
                org_id="org-1",
                team_id="team-1",
                tool_class="llm_chat",
                tool_name="ChatTool",
                recorded_at=datetime(2024, 3, 1, tzinfo=timezone.utc),
            ),
            ToolRecord(
                org_id="org-1",
                team_id="team-1",
                tool_class="coding",
                tool_name="CodeTool",
                recorded_at=datetime(2024, 3, 1, tzinfo=timezone.utc),
            ),
        ]
        table = SpreadRollupTable()
        rollup = run_spread_rollup(
            org_id="org-1",
            day=date(2024, 3, 1),
            teams=teams,
            tool_records=records,
            rollup_table=table,
        )
        self.assertAlmostEqual(rollup.percent_teams_with_ai_presence, 0.5)
        self.assertAlmostEqual(rollup.concentration_index, 1.0)
        self.assertEqual(len(table.by_org["org-1"]), 1)

    def test_zero_presence(self) -> None:
        teams = [Team(team_id="team-1", name="Team 1")]
        table = SpreadRollupTable()
        rollup = run_spread_rollup(
            org_id="org-1",
            day=date(2024, 3, 1),
            teams=teams,
            tool_records=[],
            rollup_table=table,
        )
        self.assertEqual(rollup.percent_teams_with_ai_presence, 0.0)
        self.assertEqual(rollup.concentration_index, 0.0)


if __name__ == "__main__":
    unittest.main()
