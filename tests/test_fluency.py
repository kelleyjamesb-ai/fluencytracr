import unittest

from src.fluency import DimensionScores, FluencyInputs, FluencyWeights, normalize_dimension_scores, weighted_fluency_score


class FluencyTests(unittest.TestCase):
    def test_normalize_scores(self) -> None:
        inputs = FluencyInputs(
            coverage_percent=0.8,
            concentration_index=0.2,
            usage_habitual_percent=0.6,
            assessment_delta_percent=0.7,
            everboarding_touch_rate=0.5,
        )
        scores = normalize_dimension_scores(inputs)
        self.assertEqual(scores.coverage, 80.0)
        self.assertEqual(scores.depth, 48.0)
        self.assertEqual(scores.judgment, 70.0)
        self.assertEqual(scores.velocity, 50.0)

    def test_weighted_score(self) -> None:
        scores = DimensionScores(coverage=80.0, depth=60.0, judgment=40.0, velocity=20.0)
        weights = FluencyWeights(coverage=0.4, depth=0.3, judgment=0.2, velocity=0.1)
        score = weighted_fluency_score(scores, weights)
        self.assertAlmostEqual(score, 60.0)

    def test_requires_positive_weights(self) -> None:
        scores = DimensionScores(coverage=80.0, depth=60.0, judgment=40.0, velocity=20.0)
        weights = FluencyWeights(coverage=0.0, depth=0.0, judgment=0.0, velocity=0.0)
        with self.assertRaises(ValueError):
            weighted_fluency_score(scores, weights)


if __name__ == "__main__":
    unittest.main()
