"""Synthetic calibration/null-study runner for Phase B2.

This module replaces the Phase B1 study fixtures with computed synthetic
study inputs. It deliberately stays inside the inference package:

- inputs come only from :mod:`.synthetic`
- outputs are Python dictionaries shaped for ``run_proof(...)``
- no routes, UI, persistence, exports, schemas, customer readouts, or live
  data paths are created

The replication evaluator is a fast aggregate Bayesian DiD approximation over
cohort-level pre/post changes. The full artifact path still calls
``artifact.run_proof`` for the expensive PyMC fit and diagnostics on the
single proof dataset; the study runner supplies the computed calibration,
null, and floor sections that the artifact gate requires.
"""

from __future__ import annotations

from dataclasses import dataclass
import math
from statistics import NormalDist

import numpy as np

from .constants import (
    CONFIDENCE_MODEL_MINIMUM_COHORT_FLOOR,
    CONFIDENCE_SERIES_READ_PATH_COHORT_FLOOR,
    INFERENCE_PROOF_CALIBRATION_COVERAGE_MAX,
    INFERENCE_PROOF_CALIBRATION_COVERAGE_MIN,
    INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
    INFERENCE_PROOF_NULL_FALSE_ELIGIBILITY_MAX,
)
from .synthetic import (
    SyntheticDataset,
    assert_synthetic_only_dataset,
    generate_did_dataset,
)

CALIBRATION_EFFECT_SIZES = (0.0, 0.2, 0.5)
CALIBRATION_COHORT_SIZES = (12, 16)
FLOOR_CHECK_COHORT_SIZES = (4, 8, 12, 16)
DEFAULT_SYNTHETIC_STUDY_BASE_SEED = 202607080

# Normal approximation constants, compiled into code. These are study-method
# constants, not product thresholds and not runtime configuration.
CREDIBLE_INTERVAL_LEVEL = 0.8
_CREDIBLE_INTERVAL_Z = NormalDist().inv_cdf(0.5 + CREDIBLE_INTERVAL_LEVEL / 2.0)
_NULL_FALSE_ELIGIBILITY_Z = NormalDist().inv_cdf(
    1.0 - INFERENCE_PROOF_NULL_FALSE_ELIGIBILITY_MAX / 2.0
)
_WEAK_PRIOR_VARIANCE = 1.0
_NULL_GUARD_COHORT_DF_RESERVE = 3


@dataclass(frozen=True)
class ReplicationResult:
    effect_size: float
    cohort_size: int
    seed: int
    posterior_mean: float
    posterior_sd: float
    ci80_lower: float
    ci80_upper: float
    null_guard_lower: float
    null_guard_upper: float
    covered_injected_effect: bool
    contribution_estimate_eligible_under_null_guard: bool


@dataclass(frozen=True)
class SyntheticStudyInputs:
    """Artifact-ready study sections for ``run_proof(...)``."""

    calibration_scenarios: list[dict]
    null_checks: dict
    floor_checks: dict

    def as_run_proof_kwargs(self) -> dict:
        return {
            "calibration_scenarios": self.calibration_scenarios,
            "null_checks": self.null_checks,
            "floor_checks": self.floor_checks,
        }


@dataclass(frozen=True)
class SyntheticStudyResult:
    """Full or smoke study result before conversion to artifact inputs."""

    base_seed: int
    replication_count_per_cell: int
    replications: tuple[ReplicationResult, ...]
    calibration_scenarios: list[dict]
    null_checks: dict
    floor_checks: dict

    @property
    def full_replication_requirement_met(self) -> bool:
        return self.replication_count_per_cell >= INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN

    def to_artifact_inputs(self) -> SyntheticStudyInputs:
        """Return study inputs only when the >=200 requirement is met.

        Smoke studies are useful for local verification of the runner mechanics
        but must not be laundered into an eligible artifact section.
        """
        if not self.full_replication_requirement_met:
            raise ValueError(
                "smoke synthetic-study outputs are not artifact inputs; "
                f"replication_count_per_cell={self.replication_count_per_cell} "
                f"is below {INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN}"
            )
        return SyntheticStudyInputs(
            calibration_scenarios=self.calibration_scenarios,
            null_checks=self.null_checks,
            floor_checks=self.floor_checks,
        )


def _coverage_standard_error(coverage_rate: float, replication_count: int) -> float:
    return math.sqrt(coverage_rate * (1.0 - coverage_rate) / replication_count)


def _study_seed(
    *, base_seed: int, effect_size: float, cohort_size: int, replication_index: int
) -> int:
    """Deterministic unique dataset seed per scenario cell and replication."""
    effect_code = int(round(effect_size * 1000))
    return int(base_seed + effect_code * 100_000 + cohort_size * 1_000 + replication_index)


def _cohort_change_values(dataset: SyntheticDataset) -> tuple[np.ndarray, np.ndarray]:
    assert_synthetic_only_dataset(dataset)
    treated_changes: list[float] = []
    comparison_changes: list[float] = []

    for cohort in np.unique(dataset.cohort_idx):
        mask = dataset.cohort_idx == cohort
        arm = int(dataset.treated[mask][0])
        pre_values = dataset.y[mask & (dataset.post == 0)]
        post_values = dataset.y[mask & (dataset.post == 1)]
        if len(pre_values) == 0 or len(post_values) == 0:
            raise ValueError("calibration replication requires pre and post windows")
        change = float(post_values.mean() - pre_values.mean())
        if arm == 1:
            treated_changes.append(change)
        else:
            comparison_changes.append(change)

    if not treated_changes or not comparison_changes:
        raise ValueError("calibration replication requires treated and comparison cohorts")
    return np.asarray(treated_changes, dtype=float), np.asarray(comparison_changes, dtype=float)


def _null_guard_finite_sample_multiplier(cohort_size: int) -> float:
    """Conservative finite-sample correction for the aggregate null guard.

    The fast study runner estimates a cohort-level DiD contrast and then uses
    a normal approximation. Reserving three cohort degrees of freedom keeps
    the null false-eligibility guard conservative without adding any runtime
    threshold knob or changing the artifact-level diagnostic gates.
    """

    if cohort_size <= _NULL_GUARD_COHORT_DF_RESERVE:
        return float("inf")
    return math.sqrt(cohort_size / (cohort_size - _NULL_GUARD_COHORT_DF_RESERVE))


def evaluate_replication(dataset: SyntheticDataset) -> ReplicationResult:
    """Compute one seeded calibration/null-study replication.

    The estimator operates on aggregate cohort-window rows only. It forms
    cohort-level pre/post changes, estimates the DiD contrast, and combines
    the synthetic evidence with the same weak mean-zero prior posture used by
    the proof harness. The null guard uses a 5% two-sided bound so null
    false-eligibility is measured independently of the artifact's own
    study-level gates.
    """
    treated_changes, comparison_changes = _cohort_change_values(dataset)
    estimated_effect = float(treated_changes.mean() - comparison_changes.mean())
    standard_error = math.sqrt(
        float(treated_changes.var(ddof=1)) / len(treated_changes)
        + float(comparison_changes.var(ddof=1)) / len(comparison_changes)
    )
    if not math.isfinite(standard_error) or standard_error <= 0.0:
        raise ValueError("calibration replication produced non-positive standard error")

    posterior_variance = 1.0 / (1.0 / _WEAK_PRIOR_VARIANCE + 1.0 / (standard_error**2))
    posterior_sd = math.sqrt(posterior_variance)
    posterior_mean = posterior_variance * estimated_effect / (standard_error**2)
    ci80_lower = posterior_mean - _CREDIBLE_INTERVAL_Z * posterior_sd
    ci80_upper = posterior_mean + _CREDIBLE_INTERVAL_Z * posterior_sd
    null_guard_sd = (
        posterior_sd * _null_guard_finite_sample_multiplier(int(dataset.k))
    )
    null_guard_lower = posterior_mean - _NULL_FALSE_ELIGIBILITY_Z * null_guard_sd
    null_guard_upper = posterior_mean + _NULL_FALSE_ELIGIBILITY_Z * null_guard_sd
    injected = float(dataset.injected_effect_sd)

    return ReplicationResult(
        effect_size=injected,
        cohort_size=int(dataset.k),
        seed=int(dataset.seed),
        posterior_mean=float(posterior_mean),
        posterior_sd=float(posterior_sd),
        ci80_lower=float(ci80_lower),
        ci80_upper=float(ci80_upper),
        null_guard_lower=float(null_guard_lower),
        null_guard_upper=float(null_guard_upper),
        covered_injected_effect=bool(ci80_lower <= injected <= ci80_upper),
        contribution_estimate_eligible_under_null_guard=bool(
            null_guard_lower > 0.0 or null_guard_upper < 0.0
        ),
    )


def build_calibration_scenarios(replications: tuple[ReplicationResult, ...]) -> list[dict]:
    scenarios: list[dict] = []
    for effect_size in CALIBRATION_EFFECT_SIZES:
        for cohort_size in CALIBRATION_COHORT_SIZES:
            cell = [
                result
                for result in replications
                if result.effect_size == effect_size and result.cohort_size == cohort_size
            ]
            replication_count = len(cell)
            coverage_rate = (
                sum(1 for result in cell if result.covered_injected_effect) / replication_count
                if replication_count
                else 0.0
            )
            scenarios.append(
                {
                    "scenario_id": (
                        f"computed-b2-effect-{effect_size:g}-k{cohort_size}-"
                        f"n{replication_count}"
                    ),
                    "injected_effect_size_sd": effect_size,
                    "cohort_size": cohort_size,
                    "replication_count": replication_count,
                    "credible_interval_level": CREDIBLE_INTERVAL_LEVEL,
                    "coverage_rate": coverage_rate,
                    "coverage_standard_error": _coverage_standard_error(
                        coverage_rate, replication_count
                    )
                    if replication_count
                    else 0.0,
                    "pass": bool(
                        replication_count >= INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
                        and INFERENCE_PROOF_CALIBRATION_COVERAGE_MIN
                        <= coverage_rate
                        <= INFERENCE_PROOF_CALIBRATION_COVERAGE_MAX
                    ),
                }
            )
    return scenarios


def build_null_checks(replications: tuple[ReplicationResult, ...]) -> dict:
    null_replications = [
        result for result in replications if result.effect_size == 0.0
    ]
    cell_rates: list[float] = []
    cell_counts: list[int] = []
    for cohort_size in CALIBRATION_COHORT_SIZES:
        cell = [
            result
            for result in null_replications
            if result.cohort_size == cohort_size
        ]
        count = len(cell)
        false_eligible = sum(
            1
            for result in cell
            if result.contribution_estimate_eligible_under_null_guard
        )
        cell_counts.append(count)
        cell_rates.append(false_eligible / count if count else 1.0)

    count = min(cell_counts) if cell_counts else 0
    rate = max(cell_rates) if cell_rates else 1.0
    return {
        "null_effect_scenario_count": count,
        "false_eligibility_rate": rate,
        "pass": bool(
            count >= INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
            and rate <= INFERENCE_PROOF_NULL_FALSE_ELIGIBILITY_MAX
        ),
    }


def compute_floor_checks() -> dict:
    """Compute the strict artifact floor-check section for k=4/8/12/16."""
    floor_status = {
        cohort_size: {
            "valid_internal": cohort_size >= CONFIDENCE_MODEL_MINIMUM_COHORT_FLOOR,
            "display_eligible": cohort_size >= CONFIDENCE_SERIES_READ_PATH_COHORT_FLOOR,
        }
        for cohort_size in FLOOR_CHECK_COHORT_SIZES
    }
    k4 = floor_status[4]
    k8 = floor_status[8]
    eligible = [
        {
            "cohort_size": cohort_size,
            "valid_internal": floor_status[cohort_size]["valid_internal"],
            "display_eligible": floor_status[cohort_size]["display_eligible"],
            "pass": bool(
                floor_status[cohort_size]["valid_internal"]
                and floor_status[cohort_size]["display_eligible"]
            ),
        }
        for cohort_size in (12, 16)
    ]
    return {
        "k4_rejected": {
            "cohort_size": 4,
            "outcome": "rejected_below_schema_floor",
            "pass": bool(not k4["valid_internal"]),
        },
        "k8_internal_only": {
            "cohort_size": 8,
            "outcome": "internal_only_display_ineligible",
            "valid_internal": bool(k8["valid_internal"]),
            "display_eligible": bool(k8["display_eligible"]),
            "pass": bool(k8["valid_internal"] and not k8["display_eligible"]),
        },
        "eligible_floor_cases": eligible,
    }


def run_synthetic_study(
    *,
    base_seed: int = DEFAULT_SYNTHETIC_STUDY_BASE_SEED,
    replication_count_per_cell: int = INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
) -> SyntheticStudyResult:
    """Run the synthetic calibration/null/floor study.

    ``replication_count_per_cell`` may be smaller for smoke verification, but
    only results meeting the full >=200 count can become artifact inputs.
    """
    if replication_count_per_cell <= 0:
        raise ValueError("replication_count_per_cell must be positive")

    replications: list[ReplicationResult] = []
    for effect_size in CALIBRATION_EFFECT_SIZES:
        for cohort_size in CALIBRATION_COHORT_SIZES:
            for replication_index in range(replication_count_per_cell):
                seed = _study_seed(
                    base_seed=base_seed,
                    effect_size=effect_size,
                    cohort_size=cohort_size,
                    replication_index=replication_index,
                )
                dataset = generate_did_dataset(
                    seed=seed,
                    k=cohort_size,
                    injected_effect_sd=effect_size,
                    scenario="computed_b2_calibration_null_study",
                )
                replications.append(evaluate_replication(dataset))

    replication_tuple = tuple(replications)
    return SyntheticStudyResult(
        base_seed=base_seed,
        replication_count_per_cell=replication_count_per_cell,
        replications=replication_tuple,
        calibration_scenarios=build_calibration_scenarios(replication_tuple),
        null_checks=build_null_checks(replication_tuple),
        floor_checks=compute_floor_checks(),
    )


def run_synthetic_study_inputs(
    *,
    base_seed: int = DEFAULT_SYNTHETIC_STUDY_BASE_SEED,
    replication_count_per_cell: int = INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
) -> SyntheticStudyInputs:
    """Run the full study and return artifact-ready inputs."""
    return run_synthetic_study(
        base_seed=base_seed,
        replication_count_per_cell=replication_count_per_cell,
    ).to_artifact_inputs()


def run_proof_with_synthetic_study(dataset: SyntheticDataset, **run_proof_kwargs):
    """Feed computed B2 study inputs into :func:`artifact.run_proof`."""
    study_inputs = run_proof_kwargs.pop("study_inputs", None)
    if study_inputs is None:
        study_inputs = run_synthetic_study_inputs(
            base_seed=run_proof_kwargs.pop(
                "study_base_seed", DEFAULT_SYNTHETIC_STUDY_BASE_SEED
            ),
            replication_count_per_cell=run_proof_kwargs.pop(
                "study_replication_count_per_cell",
                INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
            ),
        )
    from .artifact import run_proof

    return run_proof(
        dataset,
        **run_proof_kwargs,
        **study_inputs.as_run_proof_kwargs(),
    )
