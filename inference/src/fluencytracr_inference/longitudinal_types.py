"""Typed aggregate inputs for the first longitudinal synthetic proof slice."""

from __future__ import annotations

from dataclasses import dataclass
import re

import numpy as np

from .design_router import EVIDENCE_DESIGNS
from .hashing import sha256_json


LONGITUDINAL_GENERATOR_ID = "fluencytracr_inference.synthetic.longitudinal_outcome"
LONGITUDINAL_GENERATOR_VERSION = "0.1.0"
LONGITUDINAL_ARTIFACT_SCHEMA_VERSION_V1 = (
    "FT_AI_VALUE_LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_2026_07"
)
LONGITUDINAL_ARTIFACT_SCHEMA_VERSION_V2 = (
    "FT_AI_VALUE_LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_2026_07_V2"
)
LONGITUDINAL_ARTIFACT_SCHEMA_VERSION = LONGITUDINAL_ARTIFACT_SCHEMA_VERSION_V2
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
MAX_JAVASCRIPT_SAFE_INTEGER = 9_007_199_254_740_991
COMPILED_MEANINGFUL_DRAW_SHARE_SMOKE_FLOOR = 0.8
COMPILED_DIRECTIONAL_DRAW_SHARE_SMOKE_FLOOR = 0.6
COMPILED_SYNTHETIC_SMOKE_MINIMUM_MOVEMENT = 0.15
APPROVED_LONGITUDINAL_HYPOTHESIS_STATE = "approved_for_internal_review"
APPROVED_LONGITUDINAL_VBD_SIGNATURE = {
    "velocity": "CONTEXT",
    "breadth": "POSITIVE",
    "depth": "PRIMARY_POSITIVE",
}
AI_FLUENCY_UNCERTAINTY_DIMENSIONS = (
    "overall_ai_fluency",
    "confidence",
    "usage_quality",
    "behavior_change",
    "leadership_reinforcement",
    "capability_growth",
)

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
    "ssn",
    "social_security",
    "email",
    "phone",
    "telephone",
    "mobile",
    "date_of_birth",
    "birth_date",
    "first_name",
    "last_name",
    "full_name",
    "address",
)

APPROVED_SYNTHETIC_CONTROL_SOURCE_REFS = {
    "seasonality_index": "synthetic-control://seasonality",
    "customer_demand_index": "synthetic-control://demand-index",
    "campaign_index": "synthetic-control://campaign_index",
    "policy_index": "synthetic-control://policy_index",
    "volume_index": "synthetic-control://volume_index",
}

UNSAFE_AGGREGATE_METADATA_PATTERNS = (
    re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE),
    re.compile(r"\b\d{3}[-_. ]\d{2}[-_. ]\d{4}\b"),
    re.compile(r"\b(?:\+?1[-. ]?)?\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b"),
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
    seed: int = 20260710
    generator_id: str = LONGITUDINAL_GENERATOR_ID
    generator_version: str = LONGITUDINAL_GENERATOR_VERSION
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


class LongitudinalStructureError(ValueError):
    """Unsafe or malformed aggregate structure that cannot emit an artifact."""


def validate_longitudinal_seed(value: object, *, name: str = "longitudinal seed") -> int:
    if (
        isinstance(value, (bool, np.bool_))
        or not isinstance(value, int)
        or value < 0
        or value > MAX_JAVASCRIPT_SAFE_INTEGER
    ):
        raise LongitudinalStructureError(
            f"{name} must be a nonnegative JavaScript-safe integer"
        )
    return value


def _require_finite_vector(name: str, values: np.ndarray, expected_length: int) -> None:
    array = np.asarray(values)
    if array.ndim != 1 or len(array) != expected_length:
        raise LongitudinalStructureError(
            f"{name} must be a one-dimensional vector with {expected_length} rows"
        )
    if (
        not np.issubdtype(array.dtype, np.number)
        or np.issubdtype(array.dtype, np.bool_)
        or not np.isrealobj(array)
        or not np.all(np.isfinite(array))
    ):
        raise LongitudinalStructureError(f"{name} must contain only finite numeric values")


def _require_index_vector(name: str, values: np.ndarray, expected_length: int) -> None:
    _require_finite_vector(name, values, expected_length)
    array = np.asarray(values, dtype=float)
    if np.any(array < 0) or not np.all(array == np.floor(array)):
        raise LongitudinalStructureError(f"{name} must contain nonnegative integer indexes")


def _require_finite_optional(name: str, value: float | None) -> None:
    if value is None:
        return
    if isinstance(value, (bool, np.bool_)):
        raise LongitudinalStructureError(
            f"{name} must be a finite positive value when present"
        )
    try:
        numeric_value = float(value)
    except (TypeError, ValueError, OverflowError) as exc:
        raise LongitudinalStructureError(
            f"{name} must be a finite positive value when present"
        ) from exc
    if not np.isfinite(numeric_value) or numeric_value <= 0.0:
        raise LongitudinalStructureError(
            f"{name} must be a finite positive value when present"
        )


def _require_finite_scalar(name: str, value: object) -> float:
    if isinstance(value, (bool, np.bool_)):
        raise LongitudinalStructureError(f"{name} must be a finite numeric value")
    try:
        numeric_value = float(value)
    except (TypeError, ValueError, OverflowError) as exc:
        raise LongitudinalStructureError(
            f"{name} must be a finite numeric value"
        ) from exc
    if not np.isfinite(numeric_value):
        raise LongitudinalStructureError(f"{name} must be a finite numeric value")
    return numeric_value


def _require_nonempty_string(name: str, value: object) -> None:
    if not isinstance(value, str) or not value.strip():
        raise LongitudinalStructureError(f"{name} must be a nonempty string")


def _require_safe_aggregate_metadata(name: str, value: object) -> None:
    _require_nonempty_string(name, value)
    assert isinstance(value, str)
    lowered = value.lower()
    normalized = re.sub(r"[^a-z0-9]+", "_", lowered).strip("_")
    if (
        "@" in value
        or any(fragment in normalized for fragment in UNSAFE_CONTROL_NAME_FRAGMENTS)
        or any(pattern.search(value) for pattern in UNSAFE_AGGREGATE_METADATA_PATTERNS)
    ):
        raise LongitudinalStructureError(
            f"{name} contains unsafe person-level or workforce metadata"
        )


def _require_sha256(name: str, value: object) -> None:
    _require_nonempty_string(name, value)
    assert isinstance(value, str)
    if len(value) != 64 or any(character not in "0123456789abcdef" for character in value):
        raise LongitudinalStructureError(f"{name} must be a lowercase SHA-256 hash")


def validate_longitudinal_dataset_structure(dataset: LongitudinalSyntheticDataset) -> None:
    """Validate the aggregate panel before fitting, hashing, or artifact emission."""

    if not isinstance(dataset, LongitudinalSyntheticDataset):
        raise LongitudinalStructureError(
            "longitudinal input must be a LongitudinalSyntheticDataset"
        )
    if not isinstance(dataset.hypothesis_plan, LongitudinalHypothesisPlan):
        raise LongitudinalStructureError(
            "hypothesis_plan must be a LongitudinalHypothesisPlan"
        )
    for field_name in (
        "ai_fluency_snapshots",
        "control_names",
        "control_source_refs",
        "control_source_hashes",
        "window_refs",
        "evaluation_window_refs",
        "missing_window_refs",
        "suppressed_window_refs",
        "stale_window_refs",
        "imputed_window_refs",
    ):
        if not isinstance(getattr(dataset, field_name), tuple):
            raise LongitudinalStructureError(f"{field_name} must be an immutable tuple")
    if any(
        not isinstance(snapshot, AIFluencySnapshotRef)
        for snapshot in dataset.ai_fluency_snapshots
    ):
        raise LongitudinalStructureError(
            "ai_fluency_snapshots must contain AIFluencySnapshotRef values"
        )
    if dataset.generator_id != LONGITUDINAL_GENERATOR_ID:
        raise LongitudinalStructureError("longitudinal generator_id is not approved")
    if dataset.generator_version != LONGITUDINAL_GENERATOR_VERSION:
        raise LongitudinalStructureError("longitudinal generator_version is not approved")
    validate_longitudinal_seed(dataset.seed)
    assert_longitudinal_synthetic_only(dataset)
    observed = np.asarray(dataset.observed_outcome)
    if observed.ndim != 1 or len(observed) == 0:
        raise LongitudinalStructureError("observed_outcome must be a nonempty vector")
    row_count = len(observed)

    for name in (
        "organization_idx",
        "function_idx",
        "workflow_idx",
        "cohort_idx",
        "time_index",
    ):
        _require_index_vector(name, getattr(dataset, name), row_count)
    for name in (
        "post",
        "observed_outcome",
        "known_aggregate_se",
        "velocity_exposure",
        "breadth_exposure",
        "depth_exposure",
        "baseline_fluency_context",
    ):
        _require_finite_vector(name, getattr(dataset, name), row_count)

    post = np.asarray(dataset.post, dtype=float)
    if not np.all(np.isin(post, (0.0, 1.0))):
        raise LongitudinalStructureError("post must contain only binary 0/1 values")
    if np.any(np.asarray(dataset.known_aggregate_se, dtype=float) <= 0.0):
        raise LongitudinalStructureError("known_aggregate_se must be strictly positive")

    controls = np.asarray(dataset.control_matrix)
    expected_control_shape = (row_count, len(dataset.control_names))
    if controls.ndim != 2 or controls.shape != expected_control_shape:
        raise LongitudinalStructureError(
            f"control_matrix must have shape {expected_control_shape}"
        )
    if (
        not np.issubdtype(controls.dtype, np.number)
        or np.issubdtype(controls.dtype, np.bool_)
        or not np.isrealobj(controls)
        or not np.all(np.isfinite(controls))
    ):
        raise LongitudinalStructureError("control_matrix must contain only finite values")
    if len(dataset.control_source_refs) != len(dataset.control_names):
        raise LongitudinalStructureError("control_source_refs must align with control_names")
    if len(dataset.control_source_hashes) != len(dataset.control_names):
        raise LongitudinalStructureError("control_source_hashes must align with control_names")
    if len(set(dataset.control_names)) != len(dataset.control_names):
        raise LongitudinalStructureError("control_names must be unique")
    for index, control_name in enumerate(dataset.control_names):
        _require_safe_aggregate_metadata(f"control_names[{index}]", control_name)
        _require_safe_aggregate_metadata(
            f"control_source_refs[{index}]", dataset.control_source_refs[index]
        )
        if not dataset.control_source_refs[index].startswith("synthetic-control://"):
            raise LongitudinalStructureError(
                "control_source_refs must use the synthetic-control scheme"
            )
        if (
            APPROVED_SYNTHETIC_CONTROL_SOURCE_REFS.get(control_name)
            != dataset.control_source_refs[index]
        ):
            raise LongitudinalStructureError(
                "business controls must use compiled approved synthetic identities"
            )
        _require_sha256(
            f"control_source_hashes[{index}]", dataset.control_source_hashes[index]
        )
    if len(dataset.window_refs) != row_count:
        raise LongitudinalStructureError("window_refs must align to every aggregate row")
    for index, ref in enumerate(dataset.window_refs):
        _require_safe_aggregate_metadata(f"window_refs[{index}]", ref)
    if not dataset.evaluation_window_refs:
        raise LongitudinalStructureError("evaluation_window_refs must be nonempty")
    for index, ref in enumerate(dataset.evaluation_window_refs):
        _require_safe_aggregate_metadata(f"evaluation_window_refs[{index}]", ref)
    if len(set(dataset.evaluation_window_refs)) != len(dataset.evaluation_window_refs):
        raise LongitudinalStructureError("evaluation_window_refs must be unique")
    observed_refs = set(dataset.window_refs)
    for field_name in (
        "missing_window_refs",
        "suppressed_window_refs",
        "stale_window_refs",
        "imputed_window_refs",
    ):
        refs = getattr(dataset, field_name)
        for index, ref in enumerate(refs):
            _require_safe_aggregate_metadata(f"{field_name}[{index}]", ref)
        if len(set(refs)) != len(refs):
            raise LongitudinalStructureError(f"{field_name} must contain unique refs")
        if field_name != "missing_window_refs" and not set(refs).issubset(observed_refs):
            raise LongitudinalStructureError(
                f"{field_name} must reference observed windows"
            )
    if not set(dataset.evaluation_window_refs).issubset(observed_refs):
        raise LongitudinalStructureError("evaluation_window_refs must reference observed windows")

    cohort_idx = np.asarray(dataset.cohort_idx, dtype=int)
    time_index = np.asarray(dataset.time_index, dtype=int)
    window_refs = np.asarray(dataset.window_refs, dtype=object)
    cohort_values = sorted(set(int(value) for value in cohort_idx))
    if cohort_values != list(range(len(cohort_values))):
        raise LongitudinalStructureError(
            "cohort_idx must use contiguous zero-based aggregate cohort indexes"
        )
    panel_signature: tuple[tuple[int, str, int], ...] | None = None
    for cohort in cohort_values:
        mask = cohort_idx == cohort
        cohort_times = time_index[mask]
        cohort_refs = window_refs[mask]
        cohort_post = post[mask].astype(int)
        if len(cohort_times) > 1 and np.any(np.diff(cohort_times) <= 0):
            raise LongitudinalStructureError("panel time indexes must be strictly ordered")
        if len(set(str(ref) for ref in cohort_refs)) != len(cohort_refs):
            raise LongitudinalStructureError(
                "panel must contain one distinct window ref per cohort/time"
            )
        if len(cohort_post) > 1 and np.any(np.diff(cohort_post) < 0):
            raise LongitudinalStructureError(
                "post flags must be ordered from pre-period to post-period"
            )
        for index_name in ("organization_idx", "function_idx", "workflow_idx"):
            context_values = np.asarray(getattr(dataset, index_name))[mask]
            if len(set(int(value) for value in context_values)) != 1:
                raise LongitudinalStructureError(
                    f"{index_name} must be constant within each aggregate cohort"
                )
        signature = tuple(
            (
                int(time),
                str(cohort_refs[index]),
                int(cohort_post[index]),
            )
            for index, time in enumerate(cohort_times)
        )
        if panel_signature is None:
            panel_signature = signature
        elif signature != panel_signature:
            raise LongitudinalStructureError("longitudinal panel must be balanced across cohorts")

    panel_positions = list(zip(cohort_idx.tolist(), time_index.tolist()))
    if panel_positions != sorted(panel_positions):
        raise LongitudinalStructureError(
            "panel rows must be ordered by aggregate cohort and time"
        )

    assert panel_signature is not None
    post_by_ref = {ref: period for _time, ref, period in panel_signature}
    if any(post_by_ref.get(ref) != 1 for ref in dataset.evaluation_window_refs):
        raise LongitudinalStructureError("evaluation windows must be post-period windows")
    panel_ref_order = {ref: index for index, (_time, ref, _post) in enumerate(panel_signature)}
    evaluation_positions = [panel_ref_order[ref] for ref in dataset.evaluation_window_refs]
    if evaluation_positions != sorted(evaluation_positions):
        raise LongitudinalStructureError("evaluation_window_refs must follow panel time order")

    plan = dataset.hypothesis_plan
    if plan.approval_state != APPROVED_LONGITUDINAL_HYPOTHESIS_STATE:
        raise LongitudinalStructureError("hypothesis plan is not approved for internal review")
    if plan.expected_metric_direction not in {"increase", "decrease"}:
        raise LongitudinalStructureError("expected metric direction is invalid")
    for field_name in (
        "hypothesis_id",
        "hypothesis_statement",
        "function_area",
        "workflow_family",
        "cohort_scope",
        "value_route",
        "expected_work_change",
        "primary_metric_id",
        "primary_metric_family",
        "baseline_window",
        "source_system_ref",
        "metric_owner_ref",
        "business_owner_ref",
        "evidence_design",
        "approved_at",
        "approved_by_role",
    ):
        _require_safe_aggregate_metadata(
            f"hypothesis_plan.{field_name}", getattr(plan, field_name)
        )
    if plan.evidence_design not in EVIDENCE_DESIGNS:
        raise LongitudinalStructureError(
            "hypothesis plan evidence_design is not an approved design"
        )
    if plan.evidence_design == "TWO_GROUP_PRE_POST_COMPARISON":
        raise LongitudinalStructureError(
            "two-group pre/post comparisons must use the isolated DiD review path"
        )
    if not plan.source_system_ref.startswith("synthetic-source://"):
        raise LongitudinalStructureError(
            "hypothesis plan source_system_ref must use the synthetic-source scheme"
        )
    for owner_field in ("metric_owner_ref", "business_owner_ref"):
        if not getattr(plan, owner_field).startswith("role:"):
            raise LongitudinalStructureError(
                f"hypothesis_plan.{owner_field} must be a non-personal role ref"
            )
    _require_finite_scalar(
        "hypothesis plan minimum_worthwhile_change",
        plan.minimum_worthwhile_change,
    )
    if (
        not isinstance(plan.expected_outcome_signal_lag_windows, int)
        or isinstance(plan.expected_outcome_signal_lag_windows, bool)
        or plan.expected_outcome_signal_lag_windows < 1
    ):
        raise LongitudinalStructureError(
            "hypothesis plan expected lag must be a positive integer"
        )
    post_refs = tuple(ref for _time, ref, period in panel_signature if period == 1)
    expected_evaluation_refs = post_refs[plan.expected_outcome_signal_lag_windows :]
    if dataset.evaluation_window_refs != expected_evaluation_refs:
        raise LongitudinalStructureError(
            "evaluation_window_refs must begin after the approved outcome lag"
        )
    if not isinstance(plan.expected_vbd_signature, dict) or set(
        plan.expected_vbd_signature
    ) != {"velocity", "breadth", "depth"}:
        raise LongitudinalStructureError(
            "hypothesis plan expected_vbd_signature must cover Velocity, Breadth, and Depth"
        )
    for dimension, role in plan.expected_vbd_signature.items():
        _require_nonempty_string(
            f"hypothesis_plan.expected_vbd_signature.{dimension}", role
        )
    if plan.expected_vbd_signature != APPROVED_LONGITUDINAL_VBD_SIGNATURE:
        raise LongitudinalStructureError(
            "hypothesis plan expected_vbd_signature is not approved for V2 smoke"
        )
    for field_name in (
        "supporting_metric_ids",
        "guardrail_metric_ids",
        "relevant_fluency_dimensions",
        "observation_schedule",
        "known_confounders",
        "source_hashes",
    ):
        values = getattr(plan, field_name)
        if not isinstance(values, tuple):
            raise LongitudinalStructureError(
                f"hypothesis_plan.{field_name} must be an immutable tuple"
            )
        for index, value in enumerate(values):
            _require_safe_aggregate_metadata(
                f"hypothesis_plan.{field_name}[{index}]", value
            )
        if len(set(values)) != len(values):
            raise LongitudinalStructureError(
                f"hypothesis_plan.{field_name} must contain unique values"
            )
    if not plan.relevant_fluency_dimensions:
        raise LongitudinalStructureError(
            "hypothesis_plan.relevant_fluency_dimensions must be nonempty"
        )
    if not isinstance(plan.target_value_used_as_prior, bool):
        raise LongitudinalStructureError(
            "hypothesis_plan.target_value_used_as_prior must be boolean"
        )
    if plan.finance_pathway_ref is not None:
        raise LongitudinalStructureError(
            "hypothesis_plan.finance_pathway_ref must remain absent in smoke inputs"
        )
    expected_schedule = tuple(ref for _time, ref, _post in panel_signature)
    if plan.observation_schedule != expected_schedule:
        raise LongitudinalStructureError(
            "hypothesis plan observation_schedule must match the balanced panel"
        )
    if not plan.source_hashes:
        raise LongitudinalStructureError("hypothesis plan source hashes are required")
    for index, source_hash in enumerate(plan.source_hashes):
        _require_sha256(f"hypothesis_plan.source_hashes[{index}]", source_hash)
    if not dataset.ai_fluency_snapshots:
        raise LongitudinalStructureError("at least one aggregate AI Fluency snapshot is required")
    snapshot_ids: set[str] = set()
    for snapshot_index, snapshot in enumerate(dataset.ai_fluency_snapshots):
        if not isinstance(snapshot, AIFluencySnapshotRef):
            raise LongitudinalStructureError(
                "ai_fluency_snapshots must contain AIFluencySnapshotRef values"
            )
        _require_safe_aggregate_metadata(
            f"ai_fluency_snapshots[{snapshot_index}].snapshot_id", snapshot.snapshot_id
        )
        if snapshot.snapshot_id in snapshot_ids:
            raise LongitudinalStructureError("AI Fluency snapshot IDs must be unique")
        snapshot_ids.add(snapshot.snapshot_id)
        _require_safe_aggregate_metadata(
            f"ai_fluency_snapshots[{snapshot_index}].source_ref", snapshot.source_ref
        )
        if not snapshot.source_ref.startswith("synthetic-ai-fluency://"):
            raise LongitudinalStructureError(
                "AI Fluency snapshot source_ref must use the synthetic scheme"
            )
        _require_sha256(
            f"ai_fluency_snapshots[{snapshot_index}].source_hash", snapshot.source_hash
        )
        for name in (
            "overall_ai_fluency_score",
            "confidence_score",
            "usage_quality_score",
            "behavior_change_score",
            "leadership_reinforcement_score",
            "capability_growth_score",
        ):
            _require_finite_scalar(f"snapshot {name}", getattr(snapshot, name))
        _require_finite_optional("snapshot overall_standard_error", snapshot.overall_standard_error)
        if not isinstance(snapshot.dimension_standard_errors, dict):
            raise LongitudinalStructureError(
                "snapshot dimension_standard_errors must be a mapping"
            )
        if set(snapshot.dimension_standard_errors) != set(
            AI_FLUENCY_UNCERTAINTY_DIMENSIONS
        ):
            raise LongitudinalStructureError(
                "snapshot dimension_standard_errors must cover every AI Fluency dimension"
            )
        for dimension, standard_error in snapshot.dimension_standard_errors.items():
            _require_finite_optional(
                f"snapshot dimension_standard_errors.{dimension}", standard_error
            )
        if snapshot.measurement_uncertainty_state not in {
            "aggregate_uncertainty_available",
            "missing_uncertainty_visible",
        }:
            raise LongitudinalStructureError(
                "snapshot measurement_uncertainty_state is invalid"
            )
        uncertainty_values = (
            snapshot.overall_standard_error,
            *snapshot.dimension_standard_errors.values(),
        )
        uncertainty_missing = any(value is None for value in uncertainty_values)
        if (
            snapshot.measurement_uncertainty_state
            == "aggregate_uncertainty_available"
            and uncertainty_missing
        ):
            raise LongitudinalStructureError(
                "available snapshot uncertainty must be complete"
            )
        if (
            snapshot.measurement_uncertainty_state == "missing_uncertainty_visible"
            and not uncertainty_missing
        ):
            raise LongitudinalStructureError(
                "missing snapshot uncertainty state must expose a missing value"
            )


def assert_longitudinal_synthetic_only(dataset: LongitudinalSyntheticDataset) -> None:
    flags = {
        "real_data_present": dataset.real_data_present,
        "customer_data_present": dataset.customer_data_present,
        "production_data_present": dataset.production_data_present,
        "live_data_source_present": dataset.live_data_source_present,
    }
    marked = [name for name, present in flags.items() if present is not False]
    if marked:
        raise ValueError(
            "longitudinal proof accepts synthetic aggregate inputs only; "
            f"rejected dataset flags: {', '.join(marked)}"
        )
    for snapshot in dataset.ai_fluency_snapshots:
        if (
            snapshot.person_level_data_present is not False
            or snapshot.aggregate_only is not True
        ):
            raise ValueError("AI Fluency snapshots must be aggregate-only")
