import unittest

from src.opportunity import OPPORTUNITY_LIBRARY, match_opportunities


class OpportunityTests(unittest.TestCase):
    def test_library_has_patterns(self) -> None:
        self.assertGreater(len(OPPORTUNITY_LIBRARY), 0)

    def test_match_opportunities_by_maturity(self) -> None:
        matches = match_opportunities(maturity="emerging")
        self.assertTrue(all(pattern.maturity == "emerging" for pattern in matches))


if __name__ == "__main__":
    unittest.main()
