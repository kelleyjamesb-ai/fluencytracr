"""
Adoption Curve Normalizer
4-level framework based on standard deviation boundaries
"""

from .models import AdoptionClassification


class AdoptionCurveNormalizer:
    """
    Classify adoption levels using statistically grounded thresholds

    Levels:
    - LOW (0-16%): Innovators + Early Adopters (pre-chasm)
    - MEDIUM (16-50%): Early Majority (crossed chasm)
    - HIGH (50-84%): Late Majority (mainstream saturation)
    - SATURATED (84%+): Laggards (near-complete)
    """

    # Statistical boundaries (σ thresholds)
    THRESHOLDS = {
        "low": 0.16,        # μ - 1σ (16th percentile)
        "medium": 0.50,     # μ (50th percentile, median)
        "high": 0.84,       # μ + 1σ (84th percentile)
    }

    def classify_adoption_level(
        self,
        count: int,
        group_size: int
    ) -> AdoptionClassification:
        """
        Classify adoption level using 4-tier framework

        Args:
            count: Number of signals/people observed
            group_size: Total group population

        Returns:
            AdoptionClassification with level, penetration, interpretation
        """
        if group_size <= 0:
            raise ValueError(f"group_size must be positive, got {group_size}")

        penetration = count / group_size

        # Classify into 4 levels
        if penetration < self.THRESHOLDS["low"]:
            level = "low"
            segment = "innovators_early_adopters"
            statistical_note = "Below μ - 1σ (16th percentile)"
            interpretation = (
                f"Early adoption phase ({penetration:.1%}). "
                "Innovators and early adopters testing. "
                "Pre-chasm, high uncertainty."
            )

        elif penetration < self.THRESHOLDS["medium"]:
            level = "medium"
            segment = "early_majority"
            statistical_note = "Between μ - 1σ and μ (16th-50th percentile)"
            interpretation = (
                f"Mainstream scaling phase ({penetration:.1%}). "
                "Early majority adopting. "
                "Successfully crossed chasm, accelerating toward median."
            )

        elif penetration < self.THRESHOLDS["high"]:
            level = "high"
            segment = "late_majority"
            statistical_note = "Between μ and μ + 1σ (50th-84th percentile)"
            interpretation = (
                f"Late majority saturation ({penetration:.1%}). "
                "Mainstream established. "
                "Conservative adopters joining, approaching maturity."
            )

        else:  # >= 0.84
            level = "saturated"
            segment = "laggards"
            statistical_note = "Above μ + 1σ (84th+ percentile)"
            interpretation = (
                f"Near-complete adoption ({penetration:.1%}). "
                "Only laggards remain. "
                "Diminishing returns on further adoption efforts."
            )

        return AdoptionClassification(
            level=level,
            penetration=penetration,
            penetration_pct=round(penetration * 100, 1),
            segment=segment,
            group_size=group_size,
            interpretation=interpretation,
            statistical_note=statistical_note
        )
