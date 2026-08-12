"""Strict aggregate-only types for the VBD human-behavior joint proof."""

from __future__ import annotations

from dataclasses import dataclass
import math
import re

from .hashing import sha256_json


VBD_JOINT_SCHEMA_VERSION = "FT_VBD_HUMAN_BEHAVIOR_OUTCOME_SYNTHETIC_V3"
VBD_JOINT_MODEL_FAMILY = "vbd_human_behavior_outcome_joint_model"
VBD_JOINT_MODEL_VERSION = "0.3.0"
VBD_JOINT_OUTCOME_FAMILY = "continuous_normal_identity"
VBD_JOINT_GENERATOR_ID = "fluencytracr_inference:synthetic:vbd_joint"
VBD_JOINT_GENERATOR_VERSION = "v0_3_0"

VBD_JOINT_PANEL_COUNT = 6
VBD_JOINT_PRE_WINDOWS = 12
VBD_JOINT_POST_WINDOWS = 6
VBD_JOINT_WINDOW_COUNT = VBD_JOINT_PRE_WINDOWS + VBD_JOINT_POST_WINDOWS
VBD_JOINT_ELIGIBLE_FAMILIES = 48
VBD_JOINT_CAPABILITY_BEHAVIOR_LAG = 1
VBD_JOINT_BEHAVIOR_OUTCOME_LAG = 1
VBD_JOINT_CAPABILITY_OUTCOME_LAG = 1
VBD_JOINT_CONTROL_NAMES = ("seasonality_index", "customer_demand_index")
VBD_JOINT_BEHAVIOR_BASIS = ("embedded_state", "active_nonembedded_state")

VBD_JOINT_PRIMARY_SEED = 202_608_110
VBD_JOINT_NULL_SEED = 202_608_111
VBD_JOINT_CAPABILITY_STANDARD_ERROR = 0.15
VBD_JOINT_CAPABILITY_INNOVATION_STANDARD_DEVIATION = 0.30
VBD_JOINT_CAPABILITY_INNOVATION_SCALE_PRIOR_SD = 0.50
VBD_JOINT_OUTCOME_STANDARD_ERROR = 0.12

VBD_JOINT_FIXED_EFFECT_PRIOR_SD = 1.0
VBD_JOINT_INTERCEPT_PRIOR_SD = 1.5
VBD_JOINT_GROUP_SCALE_PRIOR_SD = 0.75
VBD_JOINT_RESIDUAL_SCALE_PRIOR_SD = 0.5
VBD_JOINT_RHO_ABS_BOUND = 0.8

VBD_JOINT_SMOKE_CHAINS = 2
VBD_JOINT_SMOKE_DRAWS = 300
VBD_JOINT_SMOKE_TUNE = 300
VBD_JOINT_SMOKE_TARGET_ACCEPT = 0.90
VBD_JOINT_SMOKE_MAX_TREEDEPTH = 10
VBD_JOINT_FULL_CHAINS = 4
VBD_JOINT_FULL_DRAWS = 1_000
VBD_JOINT_FULL_TUNE = 1_000
VBD_JOINT_FULL_TARGET_ACCEPT = 0.95
VBD_JOINT_FULL_MAX_TREEDEPTH = 12
VBD_JOINT_INTERVAL_LOWER = 0.10
VBD_JOINT_INTERVAL_UPPER = 0.90
VBD_JOINT_FULL_RHAT_MAX = 1.01
VBD_JOINT_FULL_ESS_MIN = 400.0
VBD_JOINT_NONFINITE_DIAGNOSTIC_SENTINEL = -1.0

VBD_JOINT_TRUTH = {
    "capability_retention": 0.35,
    "capability_embedding": 0.70,
    "capability_active_nonembedded": 0.45,
    "outcome_embedded": 0.85,
    "outcome_active_nonembedded": 0.30,
    "outcome_capability": 0.25,
    "outcome_capability_by_embedded": 0.40,
}
VBD_JOINT_ARTIFACT_SCHEMA = "FT_VBD_HUMAN_BEHAVIOR_OUTCOME_SYNTHETIC_SUMMARY_V3"
VBD_JOINT_BLOCKED_OUTPUTS = (
    "customer_output_authorized",
    "probability_output_authorized",
    "confidence_output_authorized",
    "causal_impact_authorized",
    "productivity_output_authorized",
    "roi_output_authorized",
    "ranking_output_authorized",
    "economic_output_authorized",
    "real_data_authorized",
    "runtime_integration_authorized",
)

VBD_JOINT_ALLOWED_GATE_STATE = "SURFACE"
VBD_JOINT_CAPABILITY_FACTOR = "aggregate_ai_capability"
VBD_JOINT_DECISION_STATES = (
    "HOLD_FOR_MODEL_REPAIR",
    "HOLD_FOR_MORE_SYNTHETIC_VALIDATION",
    "PROMOTE_NEXT_SYNTHETIC_SCOPE",
    "PROPOSE_BOUNDED_REAL_AGGREGATE_ADMISSION_REVIEW",
)


def vbd_joint_freeze_hashes() -> dict[str, str]:
    """Return the compiled research-profile commitments."""

    return {
        "geometry_hash": sha256_json(
            {
                "model_version": VBD_JOINT_MODEL_VERSION,
                "panel_count": VBD_JOINT_PANEL_COUNT,
                "pre_windows": VBD_JOINT_PRE_WINDOWS,
                "post_windows": VBD_JOINT_POST_WINDOWS,
                "eligible_families": VBD_JOINT_ELIGIBLE_FAMILIES,
                "capability_behavior_lag": VBD_JOINT_CAPABILITY_BEHAVIOR_LAG,
                "behavior_outcome_lag": VBD_JOINT_BEHAVIOR_OUTCOME_LAG,
                "capability_outcome_lag": VBD_JOINT_CAPABILITY_OUTCOME_LAG,
                "control_names": list(VBD_JOINT_CONTROL_NAMES),
                "behavior_basis": list(VBD_JOINT_BEHAVIOR_BASIS),
                "outcome_family": VBD_JOINT_OUTCOME_FAMILY,
                "capability_time_structure": "panel_time_post",
                "capability_innovation_structure": "iid_panel_window_hierarchical_scale",
                "capability_innovation_dgp_sd": (
                    VBD_JOINT_CAPABILITY_INNOVATION_STANDARD_DEVIATION
                ),
                "behavior_time_structure": "process_specific_time_post",
                "future_prediction": "strict_three_window_conditional_ar1",
                "behavior_outcome_state": "expected_transition_state",
                "evaluation_state_anchor": "final_modeled_training_state",
            }
        ),
        "prior_hash": sha256_json(
            {
                "fixed_effect_sd": VBD_JOINT_FIXED_EFFECT_PRIOR_SD,
                "intercept_sd": VBD_JOINT_INTERCEPT_PRIOR_SD,
                "group_scale_sd": VBD_JOINT_GROUP_SCALE_PRIOR_SD,
                "capability_innovation_scale_sd": (
                    VBD_JOINT_CAPABILITY_INNOVATION_SCALE_PRIOR_SD
                ),
                "residual_scale_sd": VBD_JOINT_RESIDUAL_SCALE_PRIOR_SD,
                "rho_abs_bound": VBD_JOINT_RHO_ABS_BOUND,
            }
        ),
        "sampler_hash": sha256_json(
            {
                "smoke": {
                    "chains": VBD_JOINT_SMOKE_CHAINS,
                    "draws": VBD_JOINT_SMOKE_DRAWS,
                    "tune": VBD_JOINT_SMOKE_TUNE,
                    "target_accept": VBD_JOINT_SMOKE_TARGET_ACCEPT,
                    "max_treedepth": VBD_JOINT_SMOKE_MAX_TREEDEPTH,
                    "qualifying": False,
                },
                "full": {
                    "chains": VBD_JOINT_FULL_CHAINS,
                    "draws": VBD_JOINT_FULL_DRAWS,
                    "tune": VBD_JOINT_FULL_TUNE,
                    "target_accept": VBD_JOINT_FULL_TARGET_ACCEPT,
                    "max_treedepth": VBD_JOINT_FULL_MAX_TREEDEPTH,
                },
            }
        ),
        "validation_hash": sha256_json(
            {
                "seeds": [VBD_JOINT_PRIMARY_SEED, VBD_JOINT_NULL_SEED],
                "scenarios": [
                    "truth_recovery",
                    "behavior_pathway_null",
                    "lag",
                    "confounding",
                    "capability_error",
                    "source_drift",
                    "cohort_alignment",
                    "algebraic_duplication",
                    "future_window_prediction",
                ],
                "interval": [VBD_JOINT_INTERVAL_LOWER, VBD_JOINT_INTERVAL_UPPER],
                "full_rhat_max": VBD_JOINT_FULL_RHAT_MAX,
                "full_ess_min": VBD_JOINT_FULL_ESS_MIN,
            }
        ),
        "artifact_shape_hash": sha256_json(
            {
                "schema_version": VBD_JOINT_ARTIFACT_SCHEMA,
                "blocked_outputs": list(VBD_JOINT_BLOCKED_OUTPUTS),
                "posterior_draws": False,
                "latent_paths": False,
                "per_slice_output": False,
            }
        ),
    }

_SAFE_ID = re.compile(r"^[a-z0-9][a-z0-9:_-]{2,127}$")
_UNSAFE_METADATA = re.compile(
    r"(?:email|employee|manager|person|user|respondent|prompt|transcript|ssn|phone)",
    re.IGNORECASE,
)


class VBDJointStructureError(ValueError):
    """Raised when a joint synthetic input must fail closed."""


def require_safe_id(name: str, value: object) -> str:
    if not isinstance(value, str) or not _SAFE_ID.fullmatch(value):
        raise VBDJointStructureError(f"{name} must be a safe opaque identifier")
    if _UNSAFE_METADATA.search(value):
        raise VBDJointStructureError(f"{name} contains unsafe metadata")
    return value


def require_sha256(name: str, value: object) -> str:
    if (
        not isinstance(value, str)
        or len(value) != 64
        or any(character not in "0123456789abcdef" for character in value)
    ):
        raise VBDJointStructureError(f"{name} must be a lowercase SHA-256 hash")
    return value


def require_exact_int(name: str, value: object, *, minimum: int = 0) -> int:
    if not isinstance(value, int) or isinstance(value, bool) or value < minimum:
        raise VBDJointStructureError(f"{name} must be an integer >= {minimum}")
    return value


def require_finite(name: str, value: object, *, positive: bool = False) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise VBDJointStructureError(f"{name} must be finite")
    result = float(value)
    if not math.isfinite(result) or (positive and result <= 0.0):
        qualifier = "finite and positive" if positive else "finite"
        raise VBDJointStructureError(f"{name} must be {qualifier}")
    return result


@dataclass(frozen=True)
class VBDJointAnalysisPlan:
    analysis_unit_id: str
    hypothesis_id: str
    organization_ref: str
    checkpoint_plan_hash: str
    capability_definition_hash: str
    outcome_definition_hash: str
    control_set_hash: str
    model_specification_hash: str
    comparison_specification_hash: str
    canonical_slice_manifest_root: str
    cohort_manifest_root: str
    family_registry_manifest_root: str
    source_universe_manifest_root: str
    outcome_access_receipt_hash: str
    frozen_at: str
    outcome_accessed_before_freeze: bool
    panel_count: int = VBD_JOINT_PANEL_COUNT
    pre_window_count: int = VBD_JOINT_PRE_WINDOWS
    post_window_count: int = VBD_JOINT_POST_WINDOWS
    eligible_family_count: int = VBD_JOINT_ELIGIBLE_FAMILIES
    outcome_family: str = VBD_JOINT_OUTCOME_FAMILY
    capability_factor: str = VBD_JOINT_CAPABILITY_FACTOR
    behavior_basis: tuple[str, ...] = VBD_JOINT_BEHAVIOR_BASIS
    control_names: tuple[str, ...] = VBD_JOINT_CONTROL_NAMES
    capability_behavior_lag: int = VBD_JOINT_CAPABILITY_BEHAVIOR_LAG
    behavior_outcome_lag: int = VBD_JOINT_BEHAVIOR_OUTCOME_LAG
    capability_outcome_lag: int = VBD_JOINT_CAPABILITY_OUTCOME_LAG
    synthetic_only: bool = True
    real_data_present: bool = False
    customer_data_present: bool = False
    live_data_source_present: bool = False
    production_data_present: bool = False

    def to_hash_body(self) -> dict:
        return {
            "analysis_unit_id": self.analysis_unit_id,
            "hypothesis_id": self.hypothesis_id,
            "organization_ref": self.organization_ref,
            "checkpoint_plan_hash": self.checkpoint_plan_hash,
            "capability_definition_hash": self.capability_definition_hash,
            "outcome_definition_hash": self.outcome_definition_hash,
            "control_set_hash": self.control_set_hash,
            "model_specification_hash": self.model_specification_hash,
            "comparison_specification_hash": self.comparison_specification_hash,
            "canonical_slice_manifest_root": self.canonical_slice_manifest_root,
            "cohort_manifest_root": self.cohort_manifest_root,
            "family_registry_manifest_root": self.family_registry_manifest_root,
            "source_universe_manifest_root": self.source_universe_manifest_root,
            "outcome_access_receipt_hash": self.outcome_access_receipt_hash,
            "frozen_at": self.frozen_at,
            "outcome_accessed_before_freeze": self.outcome_accessed_before_freeze,
            "panel_count": self.panel_count,
            "pre_window_count": self.pre_window_count,
            "post_window_count": self.post_window_count,
            "eligible_family_count": self.eligible_family_count,
            "outcome_family": self.outcome_family,
            "capability_factor": self.capability_factor,
            "behavior_basis": list(self.behavior_basis),
            "control_names": list(self.control_names),
            "capability_behavior_lag": self.capability_behavior_lag,
            "behavior_outcome_lag": self.behavior_outcome_lag,
            "capability_outcome_lag": self.capability_outcome_lag,
            "synthetic_only": self.synthetic_only,
            "real_data_present": self.real_data_present,
            "customer_data_present": self.customer_data_present,
            "live_data_source_present": self.live_data_source_present,
            "production_data_present": self.production_data_present,
        }

    @property
    def plan_hash(self) -> str:
        return sha256_json(self.to_hash_body())


def vbd_joint_outcome_access_receipt_hash(plan: VBDJointAnalysisPlan) -> str:
    """Bind pre-outcome access to every plan field without a hash cycle."""

    body = plan.to_hash_body()
    body.pop("outcome_access_receipt_hash", None)
    return sha256_json(
        {
            "frozen_plan_without_access_receipt": body,
            "post_baseline_outcome_accessed_before_freeze": False,
            "synthetic_only": True,
        }
    )


@dataclass(frozen=True)
class VBDJointCheckpoint:
    panel_index: int
    workflow_id: str
    jbtd_id: str
    persona_id: str
    cohort_ref: str
    cohort_hash: str
    family_registry_root: str
    checkpoint_index: int
    checkpoint_id: str
    window_start: str
    window_end: str
    eligible_count: int
    active_count: int
    embedded_count: int
    source_universe_hash: str
    semantic_policy_hash: str
    gate_receipt_hash: str
    gate_state: str = VBD_JOINT_ALLOWED_GATE_STATE
    finalized: bool = True
    suppressed: bool = False
    stale: bool = False
    imputed: bool = False

    def to_hash_body(self) -> dict:
        return {
            "panel_index": self.panel_index,
            "slice": [self.workflow_id, self.jbtd_id, self.persona_id],
            "cohort_ref": self.cohort_ref,
            "cohort_hash": self.cohort_hash,
            "family_registry_root": self.family_registry_root,
            "checkpoint_index": self.checkpoint_index,
            "checkpoint_id": self.checkpoint_id,
            "window_start": self.window_start,
            "window_end": self.window_end,
            "eligible_count": self.eligible_count,
            "active_count": self.active_count,
            "embedded_count": self.embedded_count,
            "source_universe_hash": self.source_universe_hash,
            "semantic_policy_hash": self.semantic_policy_hash,
            "gate_receipt_hash": self.gate_receipt_hash,
            "gate_state": self.gate_state,
            "finalized": self.finalized,
            "suppressed": self.suppressed,
            "stale": self.stale,
            "imputed": self.imputed,
        }

    @property
    def record_hash(self) -> str:
        return sha256_json(self.to_hash_body())


@dataclass(frozen=True)
class VBDJointTransition:
    panel_index: int
    transition_index: int
    previous_checkpoint_hash: str
    current_checkpoint_hash: str
    eligible_count: int
    retained_count: int
    newly_embedded_count: int
    lapsed_count: int
    remaining_nonembedded_count: int
    intersection_receipt_hash: str

    def to_hash_body(self) -> dict:
        return {
            "panel_index": self.panel_index,
            "transition_index": self.transition_index,
            "previous_checkpoint_hash": self.previous_checkpoint_hash,
            "current_checkpoint_hash": self.current_checkpoint_hash,
            "eligible_count": self.eligible_count,
            "retained_count": self.retained_count,
            "newly_embedded_count": self.newly_embedded_count,
            "lapsed_count": self.lapsed_count,
            "remaining_nonembedded_count": self.remaining_nonembedded_count,
            "intersection_receipt_hash": self.intersection_receipt_hash,
        }

    @property
    def record_hash(self) -> str:
        return sha256_json(self.to_hash_body())


@dataclass(frozen=True)
class VBDJointCapabilityObservation:
    panel_index: int
    checkpoint_index: int
    checkpoint_id: str
    cohort_hash: str
    factor_id: str
    observed_value: float
    standard_error: float
    measurement_model_hash: str
    finalized: bool = True
    suppressed: bool = False
    stale: bool = False
    imputed: bool = False

    def to_hash_body(self) -> dict:
        return {
            "panel_index": self.panel_index,
            "checkpoint_index": self.checkpoint_index,
            "checkpoint_id": self.checkpoint_id,
            "cohort_hash": self.cohort_hash,
            "factor_id": self.factor_id,
            "observed_value": self.observed_value,
            "standard_error": self.standard_error,
            "measurement_model_hash": self.measurement_model_hash,
            "finalized": self.finalized,
            "suppressed": self.suppressed,
            "stale": self.stale,
            "imputed": self.imputed,
        }


@dataclass(frozen=True)
class VBDJointOutcomeObservation:
    panel_index: int
    checkpoint_index: int
    checkpoint_id: str
    cohort_hash: str
    family_registry_root: str
    metric_family: str
    observed_value: float
    standard_error: float
    source_hash: str
    finalized: bool = True
    suppressed: bool = False
    stale: bool = False
    imputed: bool = False

    def to_hash_body(self) -> dict:
        return {
            "panel_index": self.panel_index,
            "checkpoint_index": self.checkpoint_index,
            "checkpoint_id": self.checkpoint_id,
            "cohort_hash": self.cohort_hash,
            "family_registry_root": self.family_registry_root,
            "metric_family": self.metric_family,
            "observed_value": self.observed_value,
            "standard_error": self.standard_error,
            "source_hash": self.source_hash,
            "finalized": self.finalized,
            "suppressed": self.suppressed,
            "stale": self.stale,
            "imputed": self.imputed,
        }


@dataclass(frozen=True)
class VBDJointControlObservation:
    panel_index: int
    checkpoint_index: int
    checkpoint_id: str
    control_name: str
    observed_value: float
    source_hash: str
    finalized: bool = True
    suppressed: bool = False
    stale: bool = False
    imputed: bool = False

    def to_hash_body(self) -> dict:
        return {
            "panel_index": self.panel_index,
            "checkpoint_index": self.checkpoint_index,
            "checkpoint_id": self.checkpoint_id,
            "control_name": self.control_name,
            "observed_value": self.observed_value,
            "source_hash": self.source_hash,
            "finalized": self.finalized,
            "suppressed": self.suppressed,
            "stale": self.stale,
            "imputed": self.imputed,
        }


@dataclass(frozen=True)
class VBDJointAlignmentReceipt:
    plan_hash: str
    checkpoint_root: str
    transition_root: str
    capability_root: str
    outcome_root: str
    control_root: str
    outcome_access_receipt_hash: str
    exact_scope_alignment: bool
    exact_window_alignment: bool
    outcome_accessed_before_freeze: bool

    def to_hash_body(self) -> dict:
        return {
            "plan_hash": self.plan_hash,
            "checkpoint_root": self.checkpoint_root,
            "transition_root": self.transition_root,
            "capability_root": self.capability_root,
            "outcome_root": self.outcome_root,
            "control_root": self.control_root,
            "outcome_access_receipt_hash": self.outcome_access_receipt_hash,
            "exact_scope_alignment": self.exact_scope_alignment,
            "exact_window_alignment": self.exact_window_alignment,
            "outcome_accessed_before_freeze": self.outcome_accessed_before_freeze,
        }

    @property
    def receipt_hash(self) -> str:
        return sha256_json(self.to_hash_body())


@dataclass(frozen=True)
class VBDJointFreezeReceipt:
    plan_hash: str
    geometry_hash: str
    prior_hash: str
    sampler_hash: str
    validation_hash: str
    artifact_shape_hash: str
    frozen_at: str
    frozen_before_outcome_access: bool

    def to_hash_body(self) -> dict:
        return {
            "plan_hash": self.plan_hash,
            "geometry_hash": self.geometry_hash,
            "prior_hash": self.prior_hash,
            "sampler_hash": self.sampler_hash,
            "validation_hash": self.validation_hash,
            "artifact_shape_hash": self.artifact_shape_hash,
            "frozen_at": self.frozen_at,
            "frozen_before_outcome_access": self.frozen_before_outcome_access,
        }

    @property
    def receipt_hash(self) -> str:
        return sha256_json(self.to_hash_body())


@dataclass(frozen=True)
class VBDJointRegistryAudit:
    panel_allocation_commitments: tuple[tuple[str, ...], ...]
    allocation_manifest_root: str
    exact_disjoint_allocation: bool
    synthetic_only: bool = True
    emitted_to_model_or_artifact: bool = False

    def to_hash_body(self) -> dict:
        return {
            "panel_allocation_commitment_roots": [
                sha256_json(list(panel)) for panel in self.panel_allocation_commitments
            ],
            "allocation_manifest_root": self.allocation_manifest_root,
            "exact_disjoint_allocation": self.exact_disjoint_allocation,
            "synthetic_only": self.synthetic_only,
            "emitted_to_model_or_artifact": self.emitted_to_model_or_artifact,
        }

    @property
    def receipt_hash(self) -> str:
        return sha256_json(self.to_hash_body())


@dataclass(frozen=True)
class VBDJointSyntheticDataset:
    plan: VBDJointAnalysisPlan
    checkpoints: tuple[VBDJointCheckpoint, ...]
    transitions: tuple[VBDJointTransition, ...]
    capability_observations: tuple[VBDJointCapabilityObservation, ...]
    outcome_observations: tuple[VBDJointOutcomeObservation, ...]
    control_observations: tuple[VBDJointControlObservation, ...]
    alignment_receipt: VBDJointAlignmentReceipt
    freeze_receipt: VBDJointFreezeReceipt
    registry_audit: VBDJointRegistryAudit
    synthetic_scenario: str
    generator_id: str
    generator_version: str
    seed: int
    synthetic_only: bool = True
    real_data_present: bool = False
    customer_data_present: bool = False
    live_data_source_present: bool = False
    production_data_present: bool = False

    def content_hash(self) -> str:
        return sha256_json(
            {
                "schema_version": VBD_JOINT_SCHEMA_VERSION,
                "model_family": VBD_JOINT_MODEL_FAMILY,
                "plan_hash": self.plan.plan_hash,
                "checkpoint_hashes": [item.record_hash for item in self.checkpoints],
                "transition_hashes": [item.record_hash for item in self.transitions],
                "capability": [item.to_hash_body() for item in self.capability_observations],
                "outcomes": [item.to_hash_body() for item in self.outcome_observations],
                "controls": [item.to_hash_body() for item in self.control_observations],
                "alignment_receipt_hash": self.alignment_receipt.receipt_hash,
                "freeze_receipt_hash": self.freeze_receipt.receipt_hash,
                "registry_audit_receipt_hash": self.registry_audit.receipt_hash,
                "synthetic_scenario": self.synthetic_scenario,
                "generator_id": self.generator_id,
                "generator_version": self.generator_version,
                "seed": self.seed,
                "synthetic_only": self.synthetic_only,
                "real_data_present": self.real_data_present,
                "customer_data_present": self.customer_data_present,
                "live_data_source_present": self.live_data_source_present,
                "production_data_present": self.production_data_present,
            }
        )
