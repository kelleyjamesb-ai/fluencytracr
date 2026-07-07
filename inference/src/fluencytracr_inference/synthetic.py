"""Seeded synthetic generators for aggregate Measurement Cell windows.

Synthetic data ONLY: this module is the sole input source for the proof
harness (contract: real observations are rejected; harness inputs come from
synthetic generators). Every generator is fully seeded, works on aggregate
cohort-window rows — never persons — and returns a ``SyntheticDataset``
carrying the known ground truth so recovery and calibration can be asserted.

Data-generating process (the contract's implementation-grade equation, normal
continuous aggregate path, identity link):

    y_i ~ Normal(mu_i, se_i)
    mu_i = alpha + beta_post * post_i + beta_treated * treated_i
         + delta * post_i * treated_i
         + u_expectation_path + u_workflow + u_function + u_cohort
         + u_organization

with ``se_i = aggregate_unit_sd / sqrt(members_i)`` (aggregate standard error
weighted by cohort size) and ``delta`` — the estimand — injected in SD units
of ``aggregate_unit_sd``.

Negative-control generators (consumed by Phase B2, hooks built here):
violated pre-trend, mismatched comparison cohort, missing/suppressed windows,
prior-dominated weak data, and no-comparison-cohort scenarios.
"""

from __future__ import annotations

from dataclasses import dataclass, field, replace

import numpy as np

from .constants import (
    CONFIDENCE_OBSERVATION_MILESTONE_DAYS,
    INFERENCE_PROOF_COMPARISON_COHORT_CRITERIA,
)
from .hashing import sha256_json

GENERATOR_ID = "fluencytracr_inference.synthetic.did_aggregate"
GENERATOR_VERSION = "1.0.0"

# Ground-truth fixed effects shared by all scenarios (in aggregate_unit_sd
# units; alpha is an arbitrary metric level).
TRUE_ALPHA = 2.0
TRUE_BETA_POST = 0.3
TRUE_BETA_TREATED = 0.2

# Ground-truth random-effect scales (SD units).
TRUE_GROUP_SD = {
    "expectation_path": 0.10,
    "workflow": 0.15,
    "function": 0.10,
    "cohort": 0.25,
    "organization": 0.10,
}

GROUPINGS = ("expectation_path", "workflow", "function", "cohort", "organization")


@dataclass(frozen=True)
class WindowEvidenceDeclaration:
    """Compact Measurement Cell window evidence declared by the generator.

    Field names and derivation rules mirror
    ``InferenceProofMeasurementCellWindowEvidenceSchema``: one compact window
    ref per milestone day per bucket; missing = required minus observed;
    suppressed/stale/imputed windows HOLD (no imputation rescue).
    """

    required_milestone_days: tuple[int, ...]
    observed_milestone_days: tuple[int, ...]
    suppressed_milestone_days: tuple[int, ...] = ()
    stale_milestone_days: tuple[int, ...] = ()
    imputed_milestone_days: tuple[int, ...] = ()

    @staticmethod
    def _window_ref(day: int) -> str:
        return f"mcw-d{day:03d}"

    @property
    def missing_milestone_days(self) -> tuple[int, ...]:
        return tuple(
            day for day in self.required_milestone_days if day not in self.observed_milestone_days
        )

    def refs(self, days: tuple[int, ...]) -> list[str]:
        return [self._window_ref(day) for day in days]

    def to_artifact_section(self) -> dict:
        required = tuple(self.required_milestone_days)
        observed = tuple(self.observed_milestone_days)
        missing = self.missing_milestone_days
        suppressed = tuple(self.suppressed_milestone_days)
        stale = tuple(self.stale_milestone_days)
        imputed = tuple(self.imputed_milestone_days)
        section = {
            "required_milestone_days": list(required),
            "observed_milestone_days": list(observed),
            "missing_milestone_days": list(missing),
            "suppressed_milestone_days": list(suppressed),
            "stale_milestone_days": list(stale),
            "imputed_milestone_days": list(imputed),
            "required_window_refs": self.refs(required),
            "observed_window_refs": self.refs(observed),
            "missing_window_refs": self.refs(missing),
            "suppressed_window_refs": self.refs(suppressed),
            "stale_window_refs": self.refs(stale),
            "imputed_window_refs": self.refs(imputed),
            # Derived booleans, exactly as the TS schema re-derives them.
            "all_required_windows_observed": len(missing) == 0,
            "all_windows_unsuppressed_and_fresh": len(suppressed) == 0 and len(stale) == 0,
            "imputation_used": len(imputed) > 0,
        }
        section["measurement_cell_window_evidence_hash"] = sha256_json(section)
        return section

    @property
    def holds(self) -> bool:
        """True when this evidence forces a HOLD (missing/suppressed/stale/imputed)."""
        return bool(
            self.missing_milestone_days
            or self.suppressed_milestone_days
            or self.stale_milestone_days
            or self.imputed_milestone_days
        )


def clean_window_evidence(milestone_day: int) -> WindowEvidenceDeclaration:
    if milestone_day not in CONFIDENCE_OBSERVATION_MILESTONE_DAYS:
        raise ValueError(f"milestone_day must be one of {CONFIDENCE_OBSERVATION_MILESTONE_DAYS}")
    return WindowEvidenceDeclaration(
        required_milestone_days=(milestone_day,),
        observed_milestone_days=(milestone_day,),
    )


@dataclass(frozen=True)
class SyntheticDataset:
    """Aggregate Measurement Cell windows plus declared metadata.

    ``k`` is the cohort count per arm (the floor quantity: the k >= 5 schema
    floor and the k >= 10 series display floor bind on it). ``members`` is the
    aggregate denominator per window, which weights the aggregate standard
    error — no person rows exist anywhere.
    """

    # Row-level arrays (one row per aggregate cohort window).
    y: np.ndarray
    se: np.ndarray
    members: np.ndarray
    post: np.ndarray
    treated: np.ndarray
    time_index: np.ndarray
    expectation_path_idx: np.ndarray
    workflow_idx: np.ndarray
    function_idx: np.ndarray
    cohort_idx: np.ndarray
    organization_idx: np.ndarray
    # Level labels per grouping.
    expectation_path_labels: tuple[str, ...]
    workflow_labels: tuple[str, ...]
    function_labels: tuple[str, ...]
    cohort_labels: tuple[str, ...]
    organization_labels: tuple[str, ...]
    # Scenario metadata / ground truth.
    seed: int
    k: int
    injected_effect_sd: float
    aggregate_unit_sd: float
    declared_minimum_cohort_floor: int
    milestone_day: int
    metric_id: str
    cohort_family_id: str
    scenario: str
    ground_truth: dict
    window_evidence: WindowEvidenceDeclaration
    comparison_cohort_present: bool
    comparison_rubric: dict[str, bool]
    generator_id: str = GENERATOR_ID
    generator_version: str = GENERATOR_VERSION
    real_data_present: bool = field(default=False)  # synthetic-only pin

    @property
    def n_pre_time_points(self) -> int:
        return int(self.time_index[self.post == 0].max()) + 1 if (self.post == 0).any() else 0

    def group_idx(self, grouping: str) -> np.ndarray:
        return getattr(self, f"{grouping}_idx")

    def group_labels(self, grouping: str) -> tuple[str, ...]:
        return getattr(self, f"{grouping}_labels")

    def synthetic_input_hash(self) -> str:
        """Deterministic hash over the full synthetic input and gate metadata."""
        return sha256_json(
            {
                "generator_id": self.generator_id,
                "generator_version": self.generator_version,
                "seed": self.seed,
                "k": self.k,
                "declared_minimum_cohort_floor": int(self.declared_minimum_cohort_floor),
                "scenario": self.scenario,
                "injected_effect_sd": float(self.injected_effect_sd),
                "aggregate_unit_sd": float(self.aggregate_unit_sd),
                "milestone_day": self.milestone_day,
                "metric_id": self.metric_id,
                "cohort_family_id": self.cohort_family_id,
                "ground_truth": self.ground_truth,
                "window_evidence": self.window_evidence.to_artifact_section(),
                "comparison_cohort_present": bool(self.comparison_cohort_present),
                "comparison_rubric": {
                    criterion: bool(self.comparison_rubric[criterion])
                    for criterion in sorted(self.comparison_rubric)
                },
                "real_data_present": bool(self.real_data_present),
                "y": [float(v) for v in self.y],
                "se": [float(v) for v in self.se],
                "members": [int(v) for v in self.members],
                "post": [int(v) for v in self.post],
                "treated": [int(v) for v in self.treated],
                "time_index": [int(v) for v in self.time_index],
                "expectation_path_idx": [int(v) for v in self.expectation_path_idx],
                "workflow_idx": [int(v) for v in self.workflow_idx],
                "function_idx": [int(v) for v in self.function_idx],
                "cohort_idx": [int(v) for v in self.cohort_idx],
                "organization_idx": [int(v) for v in self.organization_idx],
                "expectation_path_labels": list(self.expectation_path_labels),
                "workflow_labels": list(self.workflow_labels),
                "function_labels": list(self.function_labels),
                "cohort_labels": list(self.cohort_labels),
                "organization_labels": list(self.organization_labels),
            }
        )


def assert_synthetic_only_dataset(dataset: SyntheticDataset) -> None:
    """Reject any marked real/customer/live dataset before fitting or emitting."""
    flags = {
        "real_data_present": bool(getattr(dataset, "real_data_present", False)),
        "customer_data_present": bool(getattr(dataset, "customer_data_present", False)),
        "production_data_present": bool(getattr(dataset, "production_data_present", False)),
        "live_data_source_present": bool(getattr(dataset, "live_data_source_present", False)),
    }
    marked = [name for name, present in flags.items() if present]
    if marked:
        raise ValueError(
            "inference proof harness accepts synthetic generators only; "
            f"rejected dataset flags: {', '.join(marked)}"
        )


def _clean_rubric() -> dict[str, bool]:
    return {criterion: True for criterion in INFERENCE_PROOF_COMPARISON_COHORT_CRITERIA}


def generate_did_dataset(
    *,
    seed: int,
    k: int = 16,
    injected_effect_sd: float = 0.5,
    milestone_day: int = 30,
    pre_windows_per_cohort: int = 2,
    post_windows_per_cohort: int = 1,
    members_mean: int = 40,
    aggregate_unit_sd: float = 1.0,
    aggregate_se_scale: float = 1.0,
    treated_pre_trend_slope: float = 0.0,
    comparison_context_mismatch: bool = False,
    comparison_cohort_present: bool = True,
    declared_minimum_cohort_floor: int = 5,
    window_evidence: WindowEvidenceDeclaration | None = None,
    scenario: str = "clean_known_effect",
    n_expectation_paths: int = 2,
    n_workflows: int = 4,
    n_functions: int = 3,
    n_organizations: int = 2,
) -> SyntheticDataset:
    """Generate seeded aggregate DiD windows from a known ground truth.

    ``k`` cohorts per arm (treated + comparison unless
    ``comparison_cohort_present`` is False), each contributing
    ``pre_windows_per_cohort`` pre windows (time_index 0..) and
    ``post_windows_per_cohort`` post windows at the single declared milestone
    day. ``injected_effect_sd`` is the ground-truth ``delta`` in SD units.
    """
    rng = np.random.default_rng(seed)

    arms = (1, 0) if comparison_cohort_present else (1,)
    n_cohorts = k * len(arms)

    cohort_labels = []
    cohort_treated = []
    for arm in arms:
        prefix = "treated" if arm == 1 else "comparison"
        for i in range(k):
            cohort_labels.append(f"{prefix}-cohort-{i:02d}")
            cohort_treated.append(arm)
    cohort_treated = np.asarray(cohort_treated)

    expectation_path_labels = tuple(f"expectation-path-{i}" for i in range(n_expectation_paths))
    workflow_labels = tuple(f"workflow-{i}" for i in range(n_workflows))
    function_labels = tuple(f"function-{i}" for i in range(n_functions))
    organization_labels = tuple(f"organization-{i}" for i in range(n_organizations))

    cohort_positions = np.arange(n_cohorts)
    cohort_expectation_path = cohort_positions % n_expectation_paths
    cohort_workflow = cohort_positions % n_workflows
    cohort_function = cohort_positions % n_functions
    cohort_organization = cohort_positions % n_organizations
    if comparison_context_mismatch:
        # Badly mismatched comparison: comparison cohorts sit in a different
        # expectation path / workflow context and at a shifted metric level.
        comparison_mask = cohort_treated == 0
        cohort_expectation_path = np.where(
            comparison_mask, (cohort_expectation_path + 1) % n_expectation_paths,
            cohort_expectation_path,
        )
        cohort_workflow = np.where(
            comparison_mask, (cohort_workflow + 2) % n_workflows, cohort_workflow
        )

    u = {
        grouping: rng.normal(0.0, TRUE_GROUP_SD[grouping] * aggregate_unit_sd, size=n_levels)
        for grouping, n_levels in (
            ("expectation_path", n_expectation_paths),
            ("workflow", n_workflows),
            ("function", n_functions),
            ("cohort", n_cohorts),
            ("organization", n_organizations),
        )
    }

    rows: list[tuple] = []
    n_time_points = pre_windows_per_cohort + post_windows_per_cohort
    for cohort in range(n_cohorts):
        treated = int(cohort_treated[cohort])
        for t in range(n_time_points):
            post = int(t >= pre_windows_per_cohort)
            members = max(5, int(rng.poisson(members_mean)))
            se = aggregate_unit_sd * aggregate_se_scale / np.sqrt(members)
            mu = (
                TRUE_ALPHA
                + TRUE_BETA_POST * aggregate_unit_sd * post
                + TRUE_BETA_TREATED * aggregate_unit_sd * treated
                + injected_effect_sd * aggregate_unit_sd * post * treated
                + u["expectation_path"][cohort_expectation_path[cohort]]
                + u["workflow"][cohort_workflow[cohort]]
                + u["function"][cohort_function[cohort]]
                + u["cohort"][cohort]
                + u["organization"][cohort_organization[cohort]]
            )
            if comparison_context_mismatch and treated == 0:
                mu += 1.5 * aggregate_unit_sd
            if post == 0 and treated == 1:
                # Violated pre-trend control: differential trend in the
                # treated arm across pre-period time points.
                mu += treated_pre_trend_slope * aggregate_unit_sd * t
            y = rng.normal(mu, se)
            rows.append(
                (
                    y, se, members, post, treated, t,
                    cohort_expectation_path[cohort], cohort_workflow[cohort],
                    cohort_function[cohort], cohort, cohort_organization[cohort],
                )
            )

    columns = list(zip(*rows))
    rubric = _clean_rubric()
    if not comparison_cohort_present:
        rubric = {criterion: False for criterion in rubric}
    if comparison_context_mismatch:
        rubric["same_expectation_path_and_context"] = False
        rubric["similar_pre_period_level_trend"] = False

    evidence = window_evidence if window_evidence is not None else clean_window_evidence(milestone_day)
    if evidence.suppressed_milestone_days or evidence.stale_milestone_days:
        rubric["no_suppressed_or_stale_windows"] = False

    return SyntheticDataset(
        y=np.asarray(columns[0], dtype=float),
        se=np.asarray(columns[1], dtype=float),
        members=np.asarray(columns[2], dtype=int),
        post=np.asarray(columns[3], dtype=int),
        treated=np.asarray(columns[4], dtype=int),
        time_index=np.asarray(columns[5], dtype=int),
        expectation_path_idx=np.asarray(columns[6], dtype=int),
        workflow_idx=np.asarray(columns[7], dtype=int),
        function_idx=np.asarray(columns[8], dtype=int),
        cohort_idx=np.asarray(columns[9], dtype=int),
        organization_idx=np.asarray(columns[10], dtype=int),
        expectation_path_labels=expectation_path_labels,
        workflow_labels=workflow_labels,
        function_labels=function_labels,
        cohort_labels=tuple(cohort_labels),
        organization_labels=organization_labels,
        seed=seed,
        k=k,
        injected_effect_sd=float(injected_effect_sd),
        aggregate_unit_sd=float(aggregate_unit_sd),
        declared_minimum_cohort_floor=declared_minimum_cohort_floor,
        milestone_day=milestone_day,
        metric_id="synthetic_selected_metric",
        cohort_family_id="synthetic_cohort_family",
        scenario=scenario,
        ground_truth={
            "alpha": TRUE_ALPHA,
            "beta_post": TRUE_BETA_POST,
            "beta_treated": TRUE_BETA_TREATED,
            "delta": float(injected_effect_sd),
            "group_sd": dict(TRUE_GROUP_SD),
        },
        window_evidence=evidence,
        comparison_cohort_present=comparison_cohort_present,
        comparison_rubric=rubric,
    )


# --- Negative-control generators (Phase B2 consumes these; hooks live here) --


def generate_violated_pre_trend(*, seed: int, k: int = 16, **kwargs) -> SyntheticDataset:
    """Pre-period trend violation: treated arm drifts before treatment."""
    return generate_did_dataset(
        seed=seed,
        k=k,
        treated_pre_trend_slope=kwargs.pop("treated_pre_trend_slope", 1.5),
        pre_windows_per_cohort=kwargs.pop("pre_windows_per_cohort", 2),
        scenario="negative_control_violated_pre_trend",
        **kwargs,
    )


def generate_mismatched_comparison(*, seed: int, k: int = 16, **kwargs) -> SyntheticDataset:
    """Badly mismatched comparison cohort: context and level differ."""
    return generate_did_dataset(
        seed=seed,
        k=k,
        comparison_context_mismatch=True,
        scenario="negative_control_mismatched_comparison",
        **kwargs,
    )


def generate_no_comparison_cohort(*, seed: int, k: int = 16, **kwargs) -> SyntheticDataset:
    """No credible comparison cohort: evidence-tier-only / HOLD."""
    return generate_did_dataset(
        seed=seed,
        k=k,
        comparison_cohort_present=False,
        scenario="negative_control_no_comparison_cohort",
        **kwargs,
    )


def generate_missing_windows(*, seed: int, k: int = 16, **kwargs) -> SyntheticDataset:
    """Required milestone window not observed: HOLD, no imputation rescue."""
    milestone_day = kwargs.pop("milestone_day", 30)
    evidence = WindowEvidenceDeclaration(
        required_milestone_days=(0, milestone_day),
        observed_milestone_days=(0,),
    )
    return generate_did_dataset(
        seed=seed,
        k=k,
        milestone_day=milestone_day,
        window_evidence=evidence,
        scenario="negative_control_missing_windows",
        **kwargs,
    )


def generate_suppressed_windows(*, seed: int, k: int = 16, **kwargs) -> SyntheticDataset:
    """Suppressed milestone window: HOLD, no imputation rescue."""
    milestone_day = kwargs.pop("milestone_day", 30)
    evidence = WindowEvidenceDeclaration(
        required_milestone_days=(milestone_day,),
        observed_milestone_days=(milestone_day,),
        suppressed_milestone_days=(milestone_day,),
    )
    return generate_did_dataset(
        seed=seed,
        k=k,
        milestone_day=milestone_day,
        window_evidence=evidence,
        scenario="negative_control_suppressed_windows",
        **kwargs,
    )


def generate_prior_dominated_weak(*, seed: int, k: int = 6, **kwargs) -> SyntheticDataset:
    """Prior-dominated weak data: few cohorts, huge aggregate SEs.

    The apparent effect is large but the evidence weak enough that the
    posterior mean moves materially under the declared prior family — the
    prior-sensitivity gate must HOLD naming prior_sensitivity. (If the data
    were made even weaker the posterior would collapse to the mean-zero
    prior under every scaling and the shift would vanish; these defaults
    keep the likelihood just strong enough to be prior-driven, not inert.)
    """
    return generate_did_dataset(
        seed=seed,
        k=k,
        injected_effect_sd=kwargs.pop("injected_effect_sd", 4.0),
        aggregate_se_scale=kwargs.pop("aggregate_se_scale", 6.0),
        members_mean=kwargs.pop("members_mean", 8),
        scenario="negative_control_prior_dominated_weak_data",
        **kwargs,
    )


def with_scenario(dataset: SyntheticDataset, **overrides) -> SyntheticDataset:
    """Return a copy of ``dataset`` with metadata overrides (test hook)."""
    return replace(dataset, **overrides)
