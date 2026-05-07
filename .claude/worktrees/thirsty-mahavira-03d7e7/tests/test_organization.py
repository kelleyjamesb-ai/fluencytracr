import unittest

from src.organization import Signal, aggregate_signals


class OrganizationTests(unittest.TestCase):
    def test_org_level_aggregation(self) -> None:
        signals = [Signal(team_id="team-a", value=1.5), Signal(team_id="team-b", value=2.5)]
        result = aggregate_signals(signals, scope="org")
        self.assertEqual(result, {"org": 4.0})

    def test_team_level_aggregation(self) -> None:
        signals = [
            Signal(team_id="team-a", value=1.0),
            Signal(team_id="team-a", value=2.0),
            Signal(team_id="team-b", value=3.0),
        ]
        result = aggregate_signals(signals, scope="team")
        self.assertEqual(result, {"team-a": 3.0, "team-b": 3.0})

    def test_invalid_scope_rejected(self) -> None:
        with self.assertRaises(ValueError):
            aggregate_signals([], scope="employee")  # type: ignore[arg-type]


if __name__ == "__main__":
    unittest.main()
