"""Typed aggregate inputs for the first longitudinal synthetic proof slice."""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from .hashing import sha256_json


LONGITUDINAL_GENERATOR_ID = "fluencytracr_inference.synthetic.longitudinal_outcome"
LONGITUDINAL_GENERATOR_VERSION = "0.1.0"
LONGITUDINAL_ARTIFACT_SCHEMA_VERSION = (
    "FT_AI_VALUE_LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_2026_07"
)
LONGITUDINAL_MODEL_FAMILY = (
    "bayesian_ai_value_realization_and_human_transformation_model_family"
)
LONGITUDINAL_MODEL_SLICE = "first_longitudinal_synthetic_model_slice"

MIN_PRE_WINDOWS = 8
MIN_POST_WINDOWS = 3
DEFAULT_PRE_WINDOWS = 12
DEFAULT_POST_WINDOWS = 6
DEFAULT_LAG_WINDOWS = 2
MAX_APPROVED_BUSINESS_CONTROLS = 4
COMPILED_MEANINGFUL_DRAW_SHARE_SMOKE_FLOOR = 0.8
COMPILED_DIRECTIONAL_DRAW_SHARE_SMOKE_FLOOR = 0.6

LONGITUDINAL_BLOCKED_OUTPUTS = (
    "customer_output_authorized",
    "probability_output_authorized",
    "confidence_output_authorized",
    "roi_output_authorized",
    "finance_output_authorized",
    "causality_output_authorized",
    "productivity_output_authorized",
    "full_pathway_coherence_authorized",
    "creates_route",
    "creates_ui",
    "writes_persistence",
    "creates_export",
    "renders_readout",
    "executes_connector",
)

LONGITUDINAL_FAILING_DIAGNOSTICS = (
    "unsupported_likelihood_family",
    "real_data_not_authorized",
    "person_level_data_present",
    "unsafe_output_authorization",
    "insufficient_history",
    "missing_or_suppressed_windows",
    "missing_measurement_uncertainty",
    "design_matrix_identifiability",
    "residual_autocorrelation",
    "pre_period_fit",
    "pre_period_rolling_backtest",
    "placebo_intervention_date",
    "counterfactual_stability",
    "lag_sensitivity",
    "common_shock_sensitivity",
    "temporary_effect_persistence",
    "prior_sensitivity",
    "target_contamination",
    "unsupported_evidence_design",
    "unsupported_staggered_event_study",
    "baseline_only_no_contribution_confidence",
)

UNSAFE_CONTROL_NAME_FRAGMENTS = (
    "hris",
    "manager",
    "employee",
    "person",
    "user",
    "respondent",
    "level",
    "tenure",
    "compensation",
    "performance",
    "productivity",
)


@dataclass(frozen=True)
class LongitudinalHypothesisPlan:
    hypothesis_id: str
    hypothesis_statement: str
    function_area: str
    workflow_family: str
    cohort_scope: str
    value_route: str
    expected_work_change: str
    expected_metric_direction: str
    minimum_worthwhile_change: float
    primary_metric_id: str
    primary_metric_family: str
    supporting_metric_ids: tuple[str, ...]
    guardrail_metric_ids: tuple[str, ...]
    relevant_fluency_dimensions: tuple[str, ...]
    expected_vbd_signature: dict[str, str]
    baseline_window: str
    observation_schedule: tuple[str, ...]
    source_system_ref: str
    metric_owner_ref: str
    business_owner_ref: str
    known_confounders: tuple[str, ...]
    evidence_design: str
    finance_pathway_ref: str | None
    approval_state: str
    approved_at: str
    approved_by_role: str
    source_hashes: tuple[str, ...]
    expected_outcome_signal_lag_windows: int = DEFAULT_LAG_WINDOWS
    target_value_used_as_prior: bool = False

    def to_artifact_section(self) -> dict:
        return {
            "hypothesis_id": self.hypothesis_id,
            "hypothesis_statement": self.hypothesis_statement,
            "function_area": self.function_area,
            "workflow_family": self.workflow_family,
            "cohort_scope": self.cohort_scope,
            "value_route": self.value_route,
            "expected_metric_direction": self.expected_metric_direction,
            "minimum_worthwhile_change": float(self.minimum_worthwhile_change),
            "primary_metric_id": self.primary_metric_id,
            "primary_metric_family": self.primary_metric_family,
            "supporting_metric_ids": list(self.supporting_metric_ids),
            "guardrail_metric_ids": list(self.guardrail_metric_ids),
            "relevant_fluency_dimensions": list(self.relevant_fluency_dimensions),
            "expected_vbd_signature": self.expected_vbd_signature,
            "expected_outcome_signal_lag_windows": int(
                self.expected_outcome_signal_lag_windows
            ),
            "evidence_design": self.evidence_design,
            "approval_state": self.approval_state,
            "approved_at": self.approved_at,
            "approved_by_role": self.approved_by_role,
            "owner_refs_are_non_personal": True,
            "source_hashes": list(self.source_hashes),
        }

    def to_hash_section(self) -> dict:
        """Full immutable plan projection for model-input hash bindings."""

        return {
            **self.to_artifact_section(),
            "expected_work_change": self.expected_work_change,
            "baseline_window": self.baseline_window,
            "observation_schedule": list(self.observation_schedule),
            "source_system_ref": self.source_system_ref,
            "metric_owner_ref": self.metric_owner_ref,
            "business_owner_ref": self.business_owner_ref,
            "known_confounders": list(self.known_confounders),
            "finance_pathway_ref": self.finance_pathway_ref,
            "target_value_used_as_prior": bool(self.target_value_used_as_prior),
        }


@dataclass(frozen=True)
class AIFluencySnapshotRef:
    snapshot_id: str
    source_ref: str
    source_hash: str
    overall_ai_fluency_score: float
    confidence_score: float
    usage_quality_score: float
    behavior_change_score: float
    leadership_reinforcement_score: float
    capability_growth_score: float
    overall_standard_error: float | None
    dimension_standard_errors: dict[str, float | None]
    measurement_uncertainty_state: str
    aggregate_only: bool = True
    person_level_data_present: bool = False

    def to_artifact_section(self) -> dict:
        return {
            "snapshot_id": self.snapshot_id,
            "source_ref": self.source_ref,
            "source_hash": self.source_hash,
            "overall_ai_fluency_score": float(self.overall_ai_fluency_score),
            "dimension_scores": {
                "confidence": float(self.confidence_score),
                "usage_quality": float(self.usage_quality_score),
                "behavior_change": float(self.behavior_change_score),
                "leadership_reinforcement": float(self.leadership_reinforcement_score),
                "capability_growth": float(self.capability_growth_score),
            },
            "overall_standard_error": self.overall_standard_error,
            "dimension_standard_errors": self.dimension_standard_errors,
            "measurement_uncertainty_state": self.measurement_uncertainty_state,
            "aggregate_only": bool(self.aggregate_only),
            "person_level_data_present": bool(self.person_level_data_present),
        }


@dataclass(frozen=True)
class LongitudinalSyntheticDataset:
    hypothesis_plan: LongitudinalHypothesisPlan
    ai_fluency_snapshots: tuple[AIFluencySnapshotRef, ...]
    organization_idx: np.ndarray
    function_idx: np.ndarray
    workflow_idx: np.ndarray
    cohort_idx: np.ndarray
    time_index: np.ndarray
    post: np.ndarray
    observed_outcome: np.ndarray
    known_aggregate_se: np.ndarray
    velocity_exposure: np.ndarray
    breadth_exposure: np.ndarray
    depth_exposure: np.ndarray
    baseline_fluency_context: np.ndarray
    control_matrix: np.ndarray
    control_names: tuple[str, ...]
    control_source_refs: tuple[str, ...]
    control_source_hashes: tuple[str, ...]
    window_refs: tuple[str, ...]
    evaluation_window_refs: tuple[str, ...]
    missing_window_refs: tuple[str, ...] = ()
    suppressed_window_refs: tuple[str, ...] = ()
    stale_window_refs: tuple[str, ...] = ()
    imputed_window_refs: tuple[str, ...] = ()
    scenario: str = "clean_historical_pathway"
    seed: int = 20260710
    generator_id: str = LONGITUDINAL_GENERATOR_ID
    generator_version: str = LONGITUDINAL_GENERATOR_VERSION
    ground_truth: dict = field(default_factory=dict)
    real_data_present: bool = False
    customer_data_present: bool = False
    production_data_present: bool = False
    live_data_source_present: bool = False

    @property
    def pre_window_count(self) -> int:
        return len(set(int(t) for t, p in zip(self.time_index, self.post) if int(p) == 0))

    @property
    def post_window_count(self) -> int:
        return len(set(int(t) for t, p in zip(self.time_index, self.post) if int(p) == 1))

    @property
    def cohort_count(self) -> int:
        return len(set(int(c) for c in self.cohort_idx))

    def source_hashes(self) -> dict:
        return {
            "hypothesis_plan_hash": sha256_json(self.hypothesis_plan.to_hash_section()),
            "ai_fluency_snapshot_hashes": [
                snapshot.source_hash for snapshot in self.ai_fluency_snapshots
            ],
            "control_source_hashes": list(self.control_source_hashes),
            "vbd_source_hash": sha256_json(
                {
                    "velocity": [float(v) for v in self.velocity_exposure],
                    "breadth": [float(v) for v in self.breadth_exposure],
                    "depth": [float(v) for v in self.depth_exposure],
                    "window_refs": list(self.window_refs),
                }
            ),
            "outcome_source_hash": sha256_json(
                {
                    "observed_outcome": [float(v) for v in self.observed_outcome],
                    "known_aggregate_se": [float(v) for v in self.known_aggregate_se],
                    "window_refs": list(self.window_refs),
                }
            ),
        }

    def synthetic_input_hash(self) -> str:
        return sha256_json(
            {
                "hypothesis_plan": self.hypothesis_plan.to_artifact_section(),
                "hypothesis_plan_hash_projection": self.hypothesis_plan.to_hash_section(),
                "ai_fluency_snapshots": [
                    snapshot.to_artifact_section() for snapshot in self.ai_fluency_snapshots
                ],
                "organization_idx": [int(v) for v in self.organization_idx],
                "function_idx": [int(v) for v in self.function_idx],
                "workflow_idx": [int(v) for v in self.workflow_idx],
                "cohort_idx": [int(v) for v in self.cohort_idx],
                "time_index": [int(v) for v in self.time_index],
                "post": [int(v) for v in self.post],
                "observed_outcome": [float(v) for v in self.observed_outcome],
                "known_aggregate_se": [float(v) for v in self.known_aggregate_se],
                "velocity_exposure": [float(v) for v in self.velocity_exposure],
                "breadth_exposure": [float(v) for v in self.breadth_exposure],
                "depth_exposure": [float(v) for v in self.depth_exposure],
                "baseline_fluency_context": [
                    float(v) for v in self.baseline_fluency_context
                ],
                "control_matrix": [
                    [float(v) for v in row] for row in self.control_matrix.tolist()
                ],
                "control_names": list(self.control_names),
                "control_source_refs": list(self.control_source_refs),
                "control_source_hashes": list(self.control_source_hashes),
                "window_refs": list(self.window_refs),
                "evaluation_window_refs": list(self.evaluation_window_refs),
                "missing_window_refs": list(self.missing_window_refs),
                "suppressed_window_refs": list(self.suppressed_window_refs),
                "stale_window_refs": list(self.stale_window_refs),
                "imputed_window_refs": list(self.imputed_window_refs),
                "seed": int(self.seed),
                "generator_id": self.generator_id,
                "generator_version": self.generator_version,
                "real_data_present": bool(self.real_data_present),
                "customer_data_present": bool(self.customer_data_present),
                "production_data_present": bool(self.production_data_present),
                "live_data_source_present": bool(self.live_data_source_present),
            }
        )


def assert_longitudinal_synthetic_only(dataset: LongitudinalSyntheticDataset) -> None:
    flags = {
        "real_data_present": bool(dataset.real_data_present),
        "customer_data_present": bool(dataset.customer_data_present),
        "production_data_present": bool(dataset.production_data_present),
        "live_data_source_present": bool(dataset.live_data_source_present),
    }
    marked = [name for name, present in flags.items() if present]
    if marked:
        raise ValueError(
            "longitudinal proof accepts synthetic aggregate inputs only; "
            f"rejected dataset flags: {', '.join(marked)}"
        )
    for snapshot in dataset.ai_fluency_snapshots:
        if snapshot.person_level_data_present or not snapshot.aggregate_only:
            raise ValueError("AI Fluency snapshots must be aggregate-only")
