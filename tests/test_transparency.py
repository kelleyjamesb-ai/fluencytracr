import unittest

from src.data_contract import NON_COLLECTABLE_FIELDS
from src.transparency import TransparencyConfig, generate_transparency_report


class TransparencyTests(unittest.TestCase):
    def test_report_includes_non_collectable_fields(self) -> None:
        config = TransparencyConfig(
            collectable_fields=("org_id", "team_id"),
            enabled_integrations=("training_platform",),
            aggregation_rules=("org_only", "team_only"),
        )
        report = generate_transparency_report(config)
        self.assertTrue(set(NON_COLLECTABLE_FIELDS).issubset(report.non_collectable_fields))

    def test_report_sorts_fields(self) -> None:
        config = TransparencyConfig(
            collectable_fields=("team_id", "org_id"),
            enabled_integrations=("support", "training"),
            aggregation_rules=("org_only",),
        )
        report = generate_transparency_report(config)
        self.assertEqual(report.collectable_fields, ("org_id", "team_id"))
        self.assertEqual(report.enabled_integrations, ("support", "training"))


if __name__ == "__main__":
    unittest.main()
