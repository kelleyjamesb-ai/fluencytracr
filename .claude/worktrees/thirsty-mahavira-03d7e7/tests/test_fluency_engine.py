import unittest
from datetime import datetime, timedelta, timezone

from src.enablement_import import EnablementStore
from src.events import EnablementEvent
from src.fluency_service import compute_team_scores
from src.passive_signals import PassiveSignalStore, SignalEvent
from src.teams_roles import Directory, Team


class FluencyEngineTests(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = Directory()
        self.directory.create_team(Team(team_id="team-1", name="Marketing"))
        self.directory.create_team(Team(team_id="team-2", name="Sales"))
        for index in range(5):
            self.directory.map_employee_to_team(f"employee-a-{index}", "team-1")
        for index in range(4):
            self.directory.map_employee_to_team(f"employee-b-{index}", "team-2")

    def test_identify_high_fluency_low_safety_team(self) -> None:
        now = datetime(2024, 1, 15, tzinfo=timezone.utc)
        passive_store = PassiveSignalStore()
        for _ in range(10):
            passive_store.add(
                SignalEvent(
                    source="training_platform",
                    occurred_at=now - timedelta(days=1),
                    org_id="org-1",
                    team_id="team-1",
                    role_id="role-1",
                    signal_type="ai_usage",
                    metadata={"tool_id": "unknown-ai"},
                )
            )
        enablement_store = EnablementStore()
        for _ in range(3):
            enablement_store.add(
                EnablementEvent(
                    event_type="assessment_post",
                    occurred_at=now,
                    org_id="org-1",
                    team_id="team-1",
                    role_id="role-1",
                )
            )

        scores = compute_team_scores(
            "org-1",
            directory=self.directory,
            passive_store=passive_store,
            enablement_store=enablement_store,
            approved_ai_list=["approved-ai"],
            reference_time=now,
        )
        marketing = scores[0]
        self.assertGreaterEqual(marketing.depth or 0.0, 0.9)
        self.assertEqual(marketing.judgment, 0.0)
        self.assertGreater(marketing.fluency_index or 0.0, 0.5)

    def test_training_impact_analysis(self) -> None:
        now = datetime(2024, 2, 1, tzinfo=timezone.utc)
        passive_store = PassiveSignalStore()
        for _ in range(6):
            passive_store.add(
                SignalEvent(
                    source="support_ticketing",
                    occurred_at=now - timedelta(days=2),
                    org_id="org-1",
                    team_id="team-2",
                    role_id="role-1",
                    signal_type="ai_tag_applied",
                    metadata={"tool_id": "approved-ai"},
                )
            )
        enablement_store = EnablementStore()
        enablement_store.add(
            EnablementEvent(
                event_type="workshop",
                occurred_at=now - timedelta(days=7),
                org_id="org-1",
                team_id="team-2",
                role_id="role-1",
            )
        )

        scores_with_training = compute_team_scores(
            "org-1",
            directory=self.directory,
            passive_store=passive_store,
            enablement_store=enablement_store,
            approved_ai_list=["approved-ai"],
            reference_time=now,
        )
        velocity_with_training = scores_with_training[0].velocity or 0.0
        self.assertGreater(velocity_with_training, 0.5)

        scores_without_training = compute_team_scores(
            "org-1",
            directory=self.directory,
            passive_store=passive_store,
            enablement_store=EnablementStore(),
            approved_ai_list=["approved-ai"],
            reference_time=now,
        )
        velocity_without_training = scores_without_training[0].velocity or 0.0
        self.assertEqual(velocity_without_training, 0.0)


if __name__ == "__main__":
    unittest.main()
