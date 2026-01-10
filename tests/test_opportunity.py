import unittest

from src.opportunity import OPPORTUNITY_LIBRARY, match_opportunities


class OpportunityTests(unittest.TestCase):
    def test_library_has_patterns(self) -> None:
        self.assertGreater(len(OPPORTUNITY_LIBRARY), 0)

    def test_match_opportunities_by_role_maturity_and_gap(self) -> None:
        matches = match_opportunities(
            role="Sales",
            maturity="emerging",
            gaps=["coverage_low"],
        )
        self.assertTrue(any(pattern.role == "sales" for pattern in matches))

    def test_no_match_when_gaps_missing(self) -> None:
        matches = match_opportunities(
            role="sales",
            maturity="emerging",
            gaps=[],
        )
        self.assertEqual(matches, [])


if __name__ == "__main__":
    unittest.main()
