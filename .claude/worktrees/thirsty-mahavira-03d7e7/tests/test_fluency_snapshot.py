import unittest
from datetime import date

from src.fluency import FluencyInputs, FluencyWeights
from src.fluency_snapshot import FluencySnapshotStore, generate_daily_snapshot


class FluencySnapshotTests(unittest.TestCase):
    def test_generate_snapshot(self) -> None:
        store = FluencySnapshotStore()
        inputs = FluencyInputs(
            coverage_percent=0.5,
            concentration_index=0.3,
            usage_habitual_percent=0.4,
            assessment_delta_percent=0.6,
            everboarding_touch_rate=0.2,
        )
        snapshot = generate_daily_snapshot(
            org_id="org-1",
            day=date(2024, 4, 1),
            inputs=inputs,
            data_complete=True,
            weights=FluencyWeights(coverage=0.25, depth=0.25, judgment=0.25, velocity=0.25),
            store=store,
        )
        self.assertEqual(snapshot.org_id, "org-1")
        self.assertEqual(snapshot.score, 39.5)
        self.assertEqual(len(store.list_by_org("org-1")), 1)

    def test_snapshots_are_immutable(self) -> None:
        store = FluencySnapshotStore()
        inputs = FluencyInputs(
            coverage_percent=0.5,
            concentration_index=0.3,
            usage_habitual_percent=0.4,
            assessment_delta_percent=0.6,
            everboarding_touch_rate=0.2,
        )
        snapshot = generate_daily_snapshot(
            org_id="org-1",
            day=date(2024, 4, 1),
            inputs=inputs,
            data_complete=False,
            store=store,
        )
        with self.assertRaises(AttributeError):
            snapshot.score = 10.0


if __name__ == "__main__":
    unittest.main()
