"""Synthetic aggregate generator for the first longitudinal outcome slice."""

from __future__ import annotations

from dataclasses import replace

import numpy as np

from .hashing import sha256_json
from .longitudinal_types import (
    DEFAULT_LAG_WINDOWS,
    DEFAULT_POST_WINDOWS,
    DEFAULT_PRE_WINDOWS,
    AIFluencySnapshotRef,
    LongitudinalHypothesisPlan,
    LongitudinalSyntheticDataset,
)

DEFAULT_LONGITUDINAL_SEED = 202607100


def _hash(label: str) -> str:
    return sha256_json({"synthetic_source_ref": label})


def synthetic_hypothesis_plan(
    *,
    evidence_design: str = "HISTORICAL_STATE_SPACE",
    primary_metric_family: str = "continuous_normal_identity",
    expected_metric_direction: str = "increase",
    target_value_used_as_prior: bool = False,
) -> LongitudinalHypothesisPlan:
    return LongitudinalHypothesisPlan(
        hypothesis_id="hypothesis-cs-account-health",
        hypothesis_statement=(
            "If account teams use Glean-supported account-health workflows, "
            "renewal-risk review quality should improve in aggregate."
        ),
        function_area="Customer Success",
        workflow_family="account_health_review",
        cohort_scope="cs-approved-aggregate",
        value_route="Quality",
        expected_work_change="faster evidence gathering with stronger verification",
        expected_metric_direction=expected_metric_direction,
        minimum_worthwhile_change=0.15,
        primary_metric_id="account_health_review_quality_index",
        primary_metric_family=primary_metric_family,
        supporting_metric_ids=("review_cycle_time",),
        guardrail_metric_ids=("escalation_reopen_rate",),
        relevant_fluency_dimensions=("usage_quality", "behavior_change"),
        expected_vbd_signature={
            "velocity": "CONTEXT",
            "breadth": "POSITIVE",
            "depth": "PRIMARY_POSITIVE",
        },
        baseline_window="m00-m11",
        observation_schedule=tuple(f"m{i:02d}" for i in range(18)),
        source_system_ref="synthetic-source://customer-success/account-health",
        metric_owner_ref="role:customer-success-operations",
        business_owner_ref="role:ai-value-review-board",
        known_confounders=("seasonality", "demand_index"),
        evidence_design=evidence_design,
        finance_pathway_ref=None,
        approval_state="approved_for_internal_review",
        approved_at="2026-07-10T00:00:00+00:00",
        approved_by_role="AI Value methodology reviewer",
        source_hashes=(_hash("hypothesis-plan"),),
        expected_outcome_signal_lag_windows=DEFAULT_LAG_WINDOWS,
        target_value_used_as_prior=target_value_used_as_prior,
    )


def synthetic_ai_fluency_snapshot(
    *,
    missing_uncertainty: bool = False,
    person_level_data_present: bool = False,
) -> AIFluencySnapshotRef:
    se = None if missing_uncertainty else 1.8
    return AIFluencySnapshotRef(
        snapshot_id="ai-fluency-snapshot-cs-baseline-2026-01",
        source_ref="synthetic-ai-fluency://cs/baseline",
        source_hash=_hash("ai-fluency-baseline"),
        overall_ai_fluency_score=72.0,
        confidence_score=70.0,
        usage_quality_score=74.0,
        behavior_change_score=68.0,
        leadership_reinforcement_score=76.0,
        capability_growth_score=73.0,
        overall_standard_error=se,
        dimension_standard_errors={
            "overall_ai_fluency": se,
            "confidence": se,
            "usage_quality": se,
            "behavior_change": se,
            "leadership_reinforcement": se,
            "capability_growth": se,
        },
        measurement_uncertainty_state=(
            "missing_uncertainty_visible"
            if missing_uncertainty
            else "aggregate_uncertainty_available"
        ),
        aggregate_only=True,
        person_level_data_present=person_level_data_present,
    )


def _lagged(values: np.ndarray, lag: int) -> np.ndarray:
    out = np.zeros_like(values, dtype=float)
    for t in range(len(values)):
        start = max(0, t - lag)
        prior = values[start:t]
        out[t] = float(prior.mean()) if prior.size else float(values[0])
    return out


def _ar1_noise(rng: np.random.Generator, n: int, *, rho: float, sigma: float) -> np.ndarray:
    noise = np.zeros(n, dtype=float)
    noise[0] = rng.normal(0.0, sigma / max(np.sqrt(1.0 - rho**2), 0.1))
    for index in range(1, n):
        noise[index] = rho * noise[index - 1] + rng.normal(0.0, sigma)
    return noise


def generate_longitudinal_dataset(
    *,
    scenario: str = "clean_historical_pathway",
    seed: int = DEFAULT_LONGITUDINAL_SEED,
    pre_window_count: int = DEFAULT_PRE_WINDOWS,
    post_window_count: int = DEFAULT_POST_WINDOWS,
    cohort_count: int = 3,
) -> LongitudinalSyntheticDataset:
    """Generate one synthetic aggregate longitudinal proof dataset."""

    if scenario == "insufficient_history":
        pre_window_count = 6
    total_windows = pre_window_count + post_window_count
    rng = np.random.default_rng(seed)
    plan = synthetic_hypothesis_plan()
    if scenario == "non_normal_metric_request":
        plan = replace(plan, primary_metric_family="count")
    if scenario == "staggered_rollout_misroute":
        plan = replace(plan, evidence_design="STAGGERED_ROLLOUT")
    if scenario == "baseline_only":
        plan = replace(plan, evidence_design="BASELINE_ONLY")
    if scenario == "target_contamination":
        plan = replace(plan, target_value_used_as_prior=True)

    baseline_snapshot = synthetic_ai_fluency_snapshot(
        missing_uncertainty=scenario == "missing_measurement_uncertainty",
        person_level_data_present=scenario == "respondent_data_leak",
    )

    organization_idx: list[int] = []
    function_idx: list[int] = []
    workflow_idx: list[int] = []
    cohort_idx: list[int] = []
    time_index: list[int] = []
    post: list[int] = []
    y: list[float] = []
    se: list[float] = []
    velocity: list[float] = []
    breadth: list[float] = []
    depth: list[float] = []
    fluency: list[float] = []
    controls: list[list[float]] = []
    window_refs: list[str] = []

    base_time = np.arange(total_windows, dtype=float)
    post_mask = base_time >= pre_window_count
    raw_velocity = 0.25 + 0.05 * np.tanh((base_time - pre_window_count) / 2.0)
    raw_breadth = 0.30 + 0.28 * post_mask.astype(float)
    raw_depth = 0.22 + 0.42 * np.clip((base_time - pre_window_count + 1) / 4.0, 0.0, 1.0)
    if scenario in {"null_pathway", "fluency_only"}:
        raw_velocity = 0.25 + 0.015 * np.sin(2.0 * np.pi * base_time / 7.0)
        raw_breadth = 0.30 + 0.012 * np.cos(2.0 * np.pi * base_time / 8.0)
        raw_depth = 0.22 + 0.010 * np.sin(2.0 * np.pi * base_time / 5.0)
    if scenario == "vbd_only":
        pass
    if scenario == "collinear_vbd":
        raw_breadth = raw_velocity.copy()
        raw_depth = raw_velocity.copy()

    lag = plan.expected_outcome_signal_lag_windows
    lagged_velocity = _lagged(raw_velocity, lag)
    lagged_breadth = _lagged(raw_breadth, lag)
    lagged_depth = _lagged(raw_depth, lag)
    seasonality = np.sin(2.0 * np.pi * base_time / 6.0)
    demand_index = 0.15 * np.cos(2.0 * np.pi * base_time / 9.0)
    if scenario in {"outcome_only_common_shock", "unrecorded_common_shock"}:
        demand_index[pre_window_count + lag :] += 1.0

    beta_velocity = 0.05
    beta_breadth = 0.24
    beta_depth = 0.50
    if scenario in {"null_pathway", "fluency_only", "vbd_only"}:
        beta_velocity = beta_breadth = beta_depth = 0.0
    if scenario == "outcome_only_common_shock":
        beta_velocity = beta_breadth = beta_depth = 0.0
    if scenario == "wrong_lag":
        beta_velocity = beta_breadth = beta_depth = 0.0

    missing_refs: tuple[str, ...] = ()
    suppressed_refs: tuple[str, ...] = ()
    stale_refs: tuple[str, ...] = ()
    imputed_refs: tuple[str, ...] = ()
    if scenario == "missing_or_suppressed_windows":
        missing_refs = ("m13",)
        suppressed_refs = ("m14",)

    for cohort in range(cohort_count):
        cohort_shift = rng.normal(0.0, 0.08)
        cohort_fluency_context = (
            (baseline_snapshot.overall_ai_fluency_score - 50.0) / 20.0
            + (cohort - (cohort_count - 1) / 2.0) * 0.08
        )
        serial = _ar1_noise(rng, total_windows, rho=0.45, sigma=0.04)
        for t in range(total_windows):
            organization_idx.append(0)
            function_idx.append(0)
            workflow_idx.append(0)
            cohort_idx.append(cohort)
            time_index.append(t)
            post.append(1 if t >= pre_window_count else 0)
            window_ref = f"m{t:02d}"
            window_refs.append(window_ref)
            velocity.append(float(lagged_velocity[t]))
            breadth.append(float(lagged_breadth[t]))
            depth.append(float(lagged_depth[t]))
            fluency.append(float(cohort_fluency_context))
            controls.append([float(seasonality[t]), float(demand_index[t])])

            trend = 0.03 * t
            outcome = (
                1.5
                + cohort_shift
                + trend
                + 0.08 * seasonality[t]
                + 0.30 * demand_index[t]
                + beta_velocity * lagged_velocity[t]
                + beta_breadth * lagged_breadth[t]
                + beta_depth * lagged_depth[t]
                + 0.03 * cohort_fluency_context
                + serial[t]
            )
            if scenario == "wrong_lag" and t == pre_window_count:
                outcome += 0.45
            if scenario == "temporary_spike" and t in {pre_window_count + 1, pre_window_count + 2}:
                outcome += 0.5
            y.append(float(outcome + rng.normal(0.0, 0.02)))
            se.append(0.08)

    evaluation_window_refs = tuple(f"m{t:02d}" for t in range(pre_window_count + lag, total_windows))
    dataset = LongitudinalSyntheticDataset(
        hypothesis_plan=plan,
        ai_fluency_snapshots=(baseline_snapshot,),
        organization_idx=np.asarray(organization_idx, dtype=int),
        function_idx=np.asarray(function_idx, dtype=int),
        workflow_idx=np.asarray(workflow_idx, dtype=int),
        cohort_idx=np.asarray(cohort_idx, dtype=int),
        time_index=np.asarray(time_index, dtype=int),
        post=np.asarray(post, dtype=int),
        observed_outcome=np.asarray(y, dtype=float),
        known_aggregate_se=np.asarray(se, dtype=float),
        velocity_exposure=np.asarray(velocity, dtype=float),
        breadth_exposure=np.asarray(breadth, dtype=float),
        depth_exposure=np.asarray(depth, dtype=float),
        baseline_fluency_context=np.asarray(fluency, dtype=float),
        control_matrix=np.asarray(controls, dtype=float),
        control_names=("seasonality_index", "customer_demand_index"),
        control_source_refs=(
            "synthetic-control://seasonality",
            "synthetic-control://demand-index",
        ),
        control_source_hashes=(_hash("seasonality"), _hash("demand-index")),
        window_refs=tuple(window_refs),
        evaluation_window_refs=evaluation_window_refs,
        missing_window_refs=missing_refs,
        suppressed_window_refs=suppressed_refs,
        stale_window_refs=stale_refs,
        imputed_window_refs=imputed_refs,
        scenario=scenario,
        seed=seed,
        ground_truth={
            "beta_velocity": beta_velocity,
            "beta_breadth": beta_breadth,
            "beta_depth": beta_depth,
            "rho": 0.45,
            "lag_windows": lag,
            "known_meaningful_movement": scenario == "clean_historical_pathway",
        },
        real_data_present=scenario == "real_data_flag",
        customer_data_present=False,
        production_data_present=False,
        live_data_source_present=False,
    )
    if scenario == "unsafe_business_control":
        dataset = replace(
            dataset,
            control_names=("seasonality_index", "manager_performance_rating"),
            control_source_refs=(
                "synthetic-control://seasonality",
                "synthetic-control://unsafe-manager-performance",
            ),
        )
    return dataset
