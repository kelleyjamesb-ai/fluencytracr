"""Pure immutable plan for the VBD trajectory task-2.5 validation universe.

This module only describes compiled cases. Importing or calling it does not
generate synthetic observations, initialize a random generator, or run a fit.
"""

from __future__ import annotations

from dataclasses import dataclass, fields
from functools import lru_cache
import math
import re

from .hashing import sha256_json


VBD_TRAJECTORY_VALIDATION_PLAN_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_VALIDATION_PLAN_2026_07_V1"
)
VBD_TRAJECTORY_VALIDATION_PLAN_CLASS = "vbd_trajectory_task_2_5_plan_v1"
VBD_TRAJECTORY_VALIDATION_FAMILY_ORDER = (
    "primary",
    "targeted",
    "drift",
    "floor",
    "negative_control",
)
VBD_TRAJECTORY_VALIDATION_EFFECT_ORDER = (0.0, 0.2, 0.5)
VBD_TRAJECTORY_VALIDATION_GROUP_ORDER = (6, 12)
VBD_TRAJECTORY_VALIDATION_TARGETED_ORDER = (
    "frequency_only",
    "engagement_only",
    "breadth_only",
    "correlated_null",
    "composition_rotation",
    "temporary_pulse",
)
VBD_TRAJECTORY_VALIDATION_DRIFT_ORDER = (
    "quantile_algorithm_drift",
    "run_definition_drift",
    "active_membership_commitment_drift",
    "eligible_day_denominator_drift",
    "surface_taxonomy_drift",
    "understated_uncertainty",
)
VBD_TRAJECTORY_VALIDATION_FLOOR_K_ORDER = (4, 5, 8, 10, 12, 16)
VBD_TRAJECTORY_VALIDATION_NEGATIVE_CONTROL_ORDER = (
    "common_availability_shock",
    "depth_context_perturbation",
    "weak_history",
    "zero_pre_period_variance",
    "engagement_ceiling",
    "breadth_ceiling",
    "missing_window",
    "suppressed_window",
    "stale_window",
    "imputed_window",
    "duplicate_window",
    "off_plan_window",
    "legacy_composite_input",
    "breadth_duplicated_in_velocity",
    "numeric_depth_dependency",
    "post_period_standardization",
    "lookahead_window",
    "lane_window_misalignment",
    "blueprint_target_contamination",
    "outcome_contamination",
    "fluency_contamination",
    "semantic_hash_drift",
    "copied_recompute",
    "direct_identifier",
    "raw_content",
    "real_data_flags",
    "runner_error",
    "partial_study",
    "self_completion",
    "unsafe_output_flags",
    "missing_joint_covariance",
    "permuted_covariance_lane_order",
    "covariance_diagonal_mismatch",
    "non_psd_covariance",
)

VBD_TRAJECTORY_VALIDATION_PRIMARY_COUNT = 1_200
VBD_TRAJECTORY_VALIDATION_TARGETED_COUNT = 360
VBD_TRAJECTORY_VALIDATION_DRIFT_COUNT = 360
VBD_TRAJECTORY_VALIDATION_FLOOR_COUNT = 12
VBD_TRAJECTORY_VALIDATION_NEGATIVE_CONTROL_COUNT = 68
VBD_TRAJECTORY_VALIDATION_REQUIRED_SLOT_COUNT = 2_000
VBD_TRAJECTORY_VALIDATION_CHUNK_COUNT = 40
VBD_TRAJECTORY_VALIDATION_SLOTS_PER_CHUNK = 50

_PRIMARY_BASE_SEED = 2_056_100_000
_TARGETED_BASE_SEED = 2_056_200_000
_DRIFT_BASE_SEED = 2_056_250_000
_FLOOR_BASE_SEED = 2_056_300_000
_NEGATIVE_CONTROL_BASE_SEED = 2_056_400_000
_PRIMARY_REPLICATION_COUNT = 200
_TARGETED_AND_DRIFT_REPLICATION_COUNT = 30
_PRIMARY_K = 16
_BASE_TRUTH = (0.5, 0.5, 0.5)
_ZERO_TRUTH = (0.0, 0.0, 0.0)
_POSITIVE_DIRECTIONS = (1, 1, 1)
_BASE_CORRELATIONS = (0.35, 0.35, 0.25)
_CORRELATED_NULL_CORRELATIONS = (0.8, 0.8, 0.8)
_SUSTAINED_POST_PATTERN = "sustained_all_six_post_windows"
_TEMPORARY_PULSE_POST_PATTERN = (
    "plus_0.5_all_lanes_w12_w14_then_zero_w15_w17"
)
_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")

_RUNTIME_CONFIGURABILITY_FIELDS = (
    "thresholds_runtime_configurable",
    "families_runtime_configurable",
    "scenario_order_runtime_configurable",
    "control_order_runtime_configurable",
    "group_counts_runtime_configurable",
    "replication_counts_runtime_configurable",
    "seeds_runtime_configurable",
    "k_values_runtime_configurable",
    "truth_vectors_runtime_configurable",
    "direction_vectors_runtime_configurable",
    "post_patterns_runtime_configurable",
    "correlations_runtime_configurable",
    "expected_outcomes_runtime_configurable",
    "chunking_runtime_configurable",
)
_AUTHORIZATION_FIELDS = (
    "acceptance_plan_execution_authorized",
    "acceptance_seed_execution_authorized",
    "fit_execution_authorized",
    "evidence_generation_authorized",
    "real_data_authorized",
    "customer_data_authorized",
    "live_data_authorized",
    "production_data_authorized",
    "customer_output_authorized",
    "confidence_output_authorized",
    "probability_output_authorized",
    "causality_output_authorized",
    "roi_output_authorized",
    "productivity_output_authorized",
    "ranking_output_authorized",
    "outcome_integration_authorized",
    "task_5_6_completion_authorized",
    "promotion_authorized",
)

_SLOT_DICT_KEYS = {
    "slot_id",
    "family",
    "scenario_or_control_id",
    "panel_group_count",
    "replication_index",
    "seed",
    "k",
    "truth_vector",
    "direction_vector",
    "post_pattern",
    "correlations",
    "expected_outcome",
    "expected_failure_stage",
    "fit_expected",
    "matched_outcome_holds_full_study",
    "slot_hash",
}


def _compiled_gate_and_mutation_contract() -> dict:
    """Return the immutable numerical gates and exact control mechanics."""

    return {
        "interval_algorithm": "weighted_quantile_v1",
        "interval_80_probabilities": [0.10, 0.90],
        "interval_99_probabilities": [0.005, 0.995],
        "coverage_includes_endpoints": True,
        "null_false_movement_rule": "direction_adjusted_99_lower_strictly_gt_zero",
        "primary_coverage_rate_band": [0.74, 0.86],
        "targeted_family_alpha": 0.05,
        "targeted_cell_count": 36,
        "targeted_interval": "two_sided_exact_clopper_pearson_scipy_beta_ppf",
        "familywise_null_rate_max": 0.05,
        "absolute_bias_max": 0.10,
        "floor_expected_states": {
            "4": "reject_aggregate_minimum_before_fit",
            "5": "fit_internal_only_below_series_floor",
            "8": "fit_internal_only_below_series_floor",
            "10": "fit_series_eligible",
            "12": "fit_series_eligible",
            "16": "fit_primary_provenance",
        },
        "ceiling_mutations": {
            "engagement_ceiling": [59, 60, 60, 60],
            "breadth_ceiling": [11, 12, 12, 12],
            "window_scope": "ordered_pre_windows",
            "inverse_context_regeneration": False,
        },
        "covariance_mutations": {
            "validation_order": [
                "p50_domain",
                "required_field",
                "lane_order",
                "diagonal_consistency",
                "positive_semidefinite",
            ],
            "missing_joint_covariance": "remove_covariance_field",
            "permuted_covariance_lane_order": [
                "breadth",
                "engagement",
                "frequency",
            ],
            "covariance_diagonal_mismatch": "frequency_se_equals_1.1_sqrt_c00",
            "non_psd_correlation": [
                [1.0, 0.9, 0.9],
                [0.9, 1.0, -0.9],
                [0.9, -0.9, 1.0],
            ],
        },
        "structural_drift_mutations": {
            "quantile_algorithm_drift": "fixed_wrong_nearest_index_oracle",
            "run_definition_drift": "compiled_run_definition_ref_change",
            "active_membership_commitment_drift": (
                "post_active_set_a_to_active_set_b_fixed_k"
            ),
            "eligible_day_denominator_drift": "60_to_61",
            "surface_taxonomy_drift": "12_to_13",
            "understated_uncertainty": {
                "reported_se_ratio": 0.5,
                "reported_covariance_ratio": 0.25,
            },
        },
        "negative_control_order": list(
            VBD_TRAJECTORY_VALIDATION_NEGATIVE_CONTROL_ORDER
        ),
        "runner_policy": {
            "one_new_os_process_per_case": True,
            "fresh_recomputation_required": True,
            "create_once_launch_receipts": True,
            "symlinks_allowed": False,
            "hardlinks_allowed": False,
            "runner_errors_remain_in_denominator": True,
            "canary_count": 4,
            "canary_order_enforced": True,
        },
    }


@dataclass(frozen=True, slots=True)
class VbdTrajectoryValidationSlot:
    """One fully bound validation case; every constructor field is required."""

    family: str
    scenario_or_control_id: str
    panel_group_count: int
    replication_index: int
    seed: int
    k: int
    truth_vector: tuple[float, float, float]
    direction_vector: tuple[int, int, int]
    post_pattern: str
    correlations: tuple[float, float, float]
    expected_outcome: str
    expected_failure_stage: str
    fit_expected: bool
    matched_outcome_holds_full_study: bool

    def __post_init__(self) -> None:
        _validate_slot(self)

    @property
    def case_id(self) -> str:
        return self.scenario_or_control_id

    @property
    def scenario_id(self) -> str | None:
        if self.family in {"primary", "targeted", "drift"}:
            return self.scenario_or_control_id
        return None

    @property
    def control_id(self) -> str | None:
        if self.family in {"floor", "negative_control"}:
            return self.scenario_or_control_id
        return None

    @property
    def slot_id(self) -> str:
        return (
            f"{self.family}/{self.scenario_or_control_id}"
            f"/groups={self.panel_group_count}"
            f"/replication={self.replication_index}"
        )

    def body_without_hash(self) -> dict:
        return {
            "slot_id": self.slot_id,
            "family": self.family,
            "scenario_or_control_id": self.scenario_or_control_id,
            "panel_group_count": self.panel_group_count,
            "replication_index": self.replication_index,
            "seed": self.seed,
            "k": self.k,
            "truth_vector": list(self.truth_vector),
            "direction_vector": list(self.direction_vector),
            "post_pattern": self.post_pattern,
            "correlations": {
                "group": self.correlations[0],
                "innovation": self.correlations[1],
                "observation_error": self.correlations[2],
            },
            "expected_outcome": self.expected_outcome,
            "expected_failure_stage": self.expected_failure_stage,
            "fit_expected": self.fit_expected,
            "matched_outcome_holds_full_study": (
                self.matched_outcome_holds_full_study
            ),
        }

    @property
    def slot_hash(self) -> str:
        return sha256_json(self.body_without_hash())

    def to_dict(self) -> dict:
        return {**self.body_without_hash(), "slot_hash": self.slot_hash}


@dataclass(frozen=True, slots=True)
class VbdTrajectoryCanaryDescriptor:
    """A full-slot canary descriptor that never enters a study denominator."""

    canary_ordinal: int
    slot: VbdTrajectoryValidationSlot
    outside_study_denominators: bool
    seed_reuse_only_for_same_slot: bool
    aggregate_gate_computed: bool
    substitutes_for_study_slot: bool
    execution_authorized: bool

    def __post_init__(self) -> None:
        _validate_canary(self)

    @property
    def canary_id(self) -> str:
        return f"vbd_trajectory_canary_{self.canary_ordinal:02d}"

    def body_without_hash(self) -> dict:
        return {
            "canary_ordinal": self.canary_ordinal,
            "canary_id": self.canary_id,
            "slot": self.slot.to_dict(),
            "seed": self.slot.seed,
            "outside_study_denominators": self.outside_study_denominators,
            "seed_reuse_only_for_same_slot": self.seed_reuse_only_for_same_slot,
            "aggregate_gate_computed": self.aggregate_gate_computed,
            "substitutes_for_study_slot": self.substitutes_for_study_slot,
            "execution_authorized": self.execution_authorized,
        }

    @property
    def canary_hash(self) -> str:
        return sha256_json(self.body_without_hash())

    def to_dict(self) -> dict:
        return {**self.body_without_hash(), "canary_hash": self.canary_hash}


@dataclass(frozen=True, slots=True)
class VbdTrajectoryValidationChunk:
    """One fixed consecutive 50-slot slice of the global validation order."""

    chunk_index: int
    global_start_index_inclusive: int
    global_end_index_exclusive: int
    slot_ids: tuple[str, ...]
    slot_hashes: tuple[str, ...]

    def __post_init__(self) -> None:
        _validate_chunk(self)

    @property
    def chunk_id(self) -> str:
        return f"vbd_trajectory_validation_chunk_{self.chunk_index:02d}"

    def body_without_hash(self) -> dict:
        return {
            "chunk_index": self.chunk_index,
            "chunk_id": self.chunk_id,
            "global_start_index_inclusive": self.global_start_index_inclusive,
            "global_end_index_exclusive": self.global_end_index_exclusive,
            "expected_slot_count": len(self.slot_ids),
            "slot_ids": list(self.slot_ids),
            "slot_hashes": list(self.slot_hashes),
        }

    @property
    def chunk_hash(self) -> str:
        return sha256_json(self.body_without_hash())

    def to_dict(self) -> dict:
        return {**self.body_without_hash(), "chunk_hash": self.chunk_hash}


@dataclass(frozen=True, slots=True)
class VbdTrajectoryValidationPlan:
    """Immutable canonical plan and its independent semantic hash roots."""

    slots: tuple[VbdTrajectoryValidationSlot, ...]
    canaries: tuple[VbdTrajectoryCanaryDescriptor, ...]
    chunks: tuple[VbdTrajectoryValidationChunk, ...]
    slot_bodies_hash: str
    seeds_hash: str
    canaries_hash: str
    chunks_hash: str
    runtime_configurability: tuple[tuple[str, bool], ...]
    authorization: tuple[tuple[str, bool], ...]
    plan_hash: str

    def __post_init__(self) -> None:
        _validate_plan(self)

    def body_without_hash(self) -> dict:
        body = {
            "plan_version": VBD_TRAJECTORY_VALIDATION_PLAN_VERSION,
            "plan_class": VBD_TRAJECTORY_VALIDATION_PLAN_CLASS,
            "canonical_family_order": list(
                VBD_TRAJECTORY_VALIDATION_FAMILY_ORDER
            ),
            "primary_effect_order": list(VBD_TRAJECTORY_VALIDATION_EFFECT_ORDER),
            "targeted_scenario_order": list(
                VBD_TRAJECTORY_VALIDATION_TARGETED_ORDER
            ),
            "drift_scenario_order": list(VBD_TRAJECTORY_VALIDATION_DRIFT_ORDER),
            "floor_k_order": list(VBD_TRAJECTORY_VALIDATION_FLOOR_K_ORDER),
            "negative_control_order": list(
                VBD_TRAJECTORY_VALIDATION_NEGATIVE_CONTROL_ORDER
            ),
            "panel_group_order": list(VBD_TRAJECTORY_VALIDATION_GROUP_ORDER),
            "primary_replication_indexes": list(
                range(_PRIMARY_REPLICATION_COUNT)
            ),
            "targeted_and_drift_replication_indexes": list(
                range(_TARGETED_AND_DRIFT_REPLICATION_COUNT)
            ),
            "family_counts": {
                "primary": VBD_TRAJECTORY_VALIDATION_PRIMARY_COUNT,
                "targeted": VBD_TRAJECTORY_VALIDATION_TARGETED_COUNT,
                "drift": VBD_TRAJECTORY_VALIDATION_DRIFT_COUNT,
                "floor": VBD_TRAJECTORY_VALIDATION_FLOOR_COUNT,
                "negative_control": (
                    VBD_TRAJECTORY_VALIDATION_NEGATIVE_CONTROL_COUNT
                ),
            },
            "required_slot_count": VBD_TRAJECTORY_VALIDATION_REQUIRED_SLOT_COUNT,
            "compiled_gate_and_mutation_contract": (
                _compiled_gate_and_mutation_contract()
            ),
            "slots": [slot.to_dict() for slot in self.slots],
            "slot_bodies_hash": self.slot_bodies_hash,
            "seeds_hash": self.seeds_hash,
            "canaries": [canary.to_dict() for canary in self.canaries],
            "canaries_hash": self.canaries_hash,
            "chunk_count": VBD_TRAJECTORY_VALIDATION_CHUNK_COUNT,
            "slots_per_chunk": VBD_TRAJECTORY_VALIDATION_SLOTS_PER_CHUNK,
            "chunks": [chunk.to_dict() for chunk in self.chunks],
            "chunks_hash": self.chunks_hash,
            "internal_only": True,
            "synthetic_only": True,
            "aggregate_only": True,
            "execution_state": "NOT_RUN",
        }
        body.update(dict(self.runtime_configurability))
        body.update(dict(self.authorization))
        return body

    def to_dict(self) -> dict:
        return {**self.body_without_hash(), "plan_hash": self.plan_hash}


def _strict_record(value: object, name: str) -> dict:
    if type(value) is not dict or any(type(key) is not str for key in value):
        raise ValueError(f"{name} must be an exact object with string keys")
    return value


def _require_exact_keys(record: dict, expected: set[str], name: str) -> None:
    if set(record) != expected:
        raise ValueError(f"{name} has missing or unknown fields")


def _strict_string(value: object, name: str) -> str:
    if type(value) is not str or not value:
        raise ValueError(f"{name} must be a nonempty string")
    return value


def _strict_int(value: object, name: str) -> int:
    if type(value) is not int:
        raise ValueError(f"{name} must be an integer")
    return value


def _strict_bool(value: object, name: str) -> bool:
    if type(value) is not bool:
        raise ValueError(f"{name} must be boolean")
    return value


def _strict_float(value: object, name: str) -> float:
    if type(value) is not float or not math.isfinite(value):
        raise ValueError(f"{name} must be a finite float")
    return value


def _strict_sha256(value: object, name: str) -> str:
    string = _strict_string(value, name)
    if not _SHA256_RE.fullmatch(string):
        raise ValueError(f"{name} must be lowercase SHA-256 hex")
    return string


def _strict_list(value: object, name: str, *, length: int | None = None) -> list:
    if type(value) is not list:
        raise ValueError(f"{name} must be an array")
    if length is not None and len(value) != length:
        raise ValueError(f"{name} must contain exactly {length} items")
    return value


def _strict_float_vector(value: object, name: str) -> tuple[float, float, float]:
    items = _strict_list(value, name, length=3)
    return (
        _strict_float(items[0], f"{name}[0]"),
        _strict_float(items[1], f"{name}[1]"),
        _strict_float(items[2], f"{name}[2]"),
    )


def _strict_direction_vector(value: object) -> tuple[int, int, int]:
    items = _strict_list(value, "direction_vector", length=3)
    result = tuple(_strict_int(item, "direction_vector item") for item in items)
    if any(item not in (-1, 1) for item in result):
        raise ValueError("direction_vector items must be -1 or 1")
    return result  # type: ignore[return-value]


def _validate_tuple_field(
    value: object,
    name: str,
    *,
    item_type: type,
    length: int = 3,
) -> None:
    if type(value) is not tuple or len(value) != length:
        raise ValueError(f"{name} must be an exact {length}-item tuple")
    if any(type(item) is not item_type for item in value):
        raise ValueError(f"{name} has an invalid item type")
    if item_type is float and any(not math.isfinite(item) for item in value):
        raise ValueError(f"{name} must be finite")


def _primary_case_id(effect: float) -> str:
    if effect == 0.0:
        return "effect=0"
    return f"effect={effect}"


def _base_slot_semantics() -> dict:
    return {
        "k": _PRIMARY_K,
        "truth_vector": _BASE_TRUTH,
        "direction_vector": _POSITIVE_DIRECTIONS,
        "post_pattern": _SUSTAINED_POST_PATTERN,
        "correlations": _BASE_CORRELATIONS,
        "expected_outcome": "valid_internal_trajectory",
        "expected_failure_stage": "none",
        "fit_expected": True,
        "matched_outcome_holds_full_study": False,
    }


def _canonical_slot_semantics(
    family: str,
    case_id: str,
    panel_group_count: int,
    replication_index: int,
) -> dict:
    if panel_group_count not in VBD_TRAJECTORY_VALIDATION_GROUP_ORDER:
        raise ValueError("panel_group_count is not compiled")
    group_ordinal = VBD_TRAJECTORY_VALIDATION_GROUP_ORDER.index(panel_group_count)
    semantics = _base_slot_semantics()

    if family == "primary":
        case_order = tuple(
            _primary_case_id(effect)
            for effect in VBD_TRAJECTORY_VALIDATION_EFFECT_ORDER
        )
        if case_id not in case_order:
            raise ValueError("primary scenario is not compiled")
        if not 0 <= replication_index < _PRIMARY_REPLICATION_COUNT:
            raise ValueError("primary replication_index is outside 0..199")
        effect_ordinal = case_order.index(case_id)
        effect = VBD_TRAJECTORY_VALIDATION_EFFECT_ORDER[effect_ordinal]
        semantics.update(
            {
                "seed": (
                    _PRIMARY_BASE_SEED
                    + 1_000 * (2 * effect_ordinal + group_ordinal)
                    + replication_index
                ),
                "truth_vector": (effect, effect, effect),
            }
        )
        return semantics

    if family == "targeted":
        if case_id not in VBD_TRAJECTORY_VALIDATION_TARGETED_ORDER:
            raise ValueError("targeted scenario is not compiled")
        if not 0 <= replication_index < _TARGETED_AND_DRIFT_REPLICATION_COUNT:
            raise ValueError("targeted replication_index is outside 0..29")
        scenario_ordinal = VBD_TRAJECTORY_VALIDATION_TARGETED_ORDER.index(case_id)
        targeted_truths = {
            "frequency_only": (0.5, 0.0, 0.0),
            "engagement_only": (0.0, 0.5, 0.0),
            "breadth_only": (0.0, 0.0, 0.5),
            "correlated_null": _ZERO_TRUTH,
            "composition_rotation": (0.5, -0.5, 0.0),
            "temporary_pulse": _ZERO_TRUTH,
        }
        semantics.update(
            {
                "seed": (
                    _TARGETED_BASE_SEED
                    + 1_000 * scenario_ordinal
                    + 100 * group_ordinal
                    + replication_index
                ),
                "truth_vector": targeted_truths[case_id],
                "direction_vector": (
                    (1, -1, 1)
                    if case_id == "composition_rotation"
                    else _POSITIVE_DIRECTIONS
                ),
                "post_pattern": (
                    _TEMPORARY_PULSE_POST_PATTERN
                    if case_id == "temporary_pulse"
                    else _SUSTAINED_POST_PATTERN
                ),
                "correlations": (
                    _CORRELATED_NULL_CORRELATIONS
                    if case_id == "correlated_null"
                    else _BASE_CORRELATIONS
                ),
            }
        )
        return semantics

    if family == "drift":
        if case_id not in VBD_TRAJECTORY_VALIDATION_DRIFT_ORDER:
            raise ValueError("drift scenario is not compiled")
        if not 0 <= replication_index < _TARGETED_AND_DRIFT_REPLICATION_COUNT:
            raise ValueError("drift replication_index is outside 0..29")
        scenario_ordinal = VBD_TRAJECTORY_VALIDATION_DRIFT_ORDER.index(case_id)
        drift_stages = {
            "quantile_algorithm_drift": "quantile_algorithm_gate_before_fit",
            "run_definition_drift": "definition_binding_gate_before_fit",
            "active_membership_commitment_drift": (
                "active_membership_commitment_gate_before_fit"
            ),
            "eligible_day_denominator_drift": "denominator_gate_before_fit",
            "surface_taxonomy_drift": "taxonomy_gate_before_fit",
        }
        semantics["seed"] = (
            _DRIFT_BASE_SEED
            + 1_000 * scenario_ordinal
            + 100 * group_ordinal
            + replication_index
        )
        if case_id == "understated_uncertainty":
            semantics.update(
                {
                    "expected_outcome": "scenario_hold_after_fit",
                    "expected_failure_stage": "coverage_gate_after_fit",
                }
            )
        else:
            semantics.update(
                {
                    "expected_outcome": "reject_before_fit",
                    "expected_failure_stage": drift_stages[case_id],
                    "fit_expected": False,
                }
            )
        return semantics

    if family == "floor":
        floor_case_order = tuple(
            f"k={k}" for k in VBD_TRAJECTORY_VALIDATION_FLOOR_K_ORDER
        )
        if case_id not in floor_case_order:
            raise ValueError("floor control is not compiled")
        if replication_index != 0:
            raise ValueError("floor replication_index must equal zero")
        k_ordinal = floor_case_order.index(case_id)
        k = VBD_TRAJECTORY_VALIDATION_FLOOR_K_ORDER[k_ordinal]
        semantics.update(
            {
                "seed": _FLOOR_BASE_SEED + 10 * k_ordinal + group_ordinal,
                "k": k,
            }
        )
        if k == 4:
            semantics.update(
                {
                    "expected_outcome": "reject_before_fit",
                    "expected_failure_stage": "aggregate_minimum_gate_before_fit",
                    "fit_expected": False,
                }
            )
        elif k in (5, 8):
            semantics.update(
                {
                    "expected_outcome": (
                        "valid_internal_only_below_series_evidence_floor"
                    ),
                    "expected_failure_stage": (
                        "series_read_path_evidence_floor_after_fit"
                    ),
                }
            )
        else:
            semantics["expected_outcome"] = "valid_numerical_control"
        return semantics

    if family == "negative_control":
        if case_id not in VBD_TRAJECTORY_VALIDATION_NEGATIVE_CONTROL_ORDER:
            raise ValueError("negative control is not compiled")
        if replication_index != 0:
            raise ValueError("negative-control replication_index must equal zero")
        control_ordinal = VBD_TRAJECTORY_VALIDATION_NEGATIVE_CONTROL_ORDER.index(
            case_id
        )
        semantics["seed"] = (
            _NEGATIVE_CONTROL_BASE_SEED
            + 10 * control_ordinal
            + group_ordinal
        )
        if case_id == "depth_context_perturbation":
            semantics.update(
                {
                    "truth_vector": _ZERO_TRUTH,
                    "expected_outcome": (
                        "identical_prepared_inputs_and_fits_no_false_movement"
                    ),
                }
            )
            return semantics
        if case_id == "common_availability_shock":
            semantics["expected_outcome"] = (
                "valid_internal_trajectory_all_output_flags_false"
            )
            return semantics

        reject_before_fit_stages = {
            "weak_history": "history_length_gate_before_fit",
            "engagement_ceiling": "p50_domain_gate_before_fit",
            "breadth_ceiling": "p50_domain_gate_before_fit",
            "missing_window": "window_completeness_gate_before_fit",
            "suppressed_window": "suppression_gate_before_fit",
            "stale_window": "staleness_gate_before_fit",
            "imputed_window": "imputation_gate_before_fit",
            "duplicate_window": "window_uniqueness_gate_before_fit",
            "off_plan_window": "plan_membership_gate_before_fit",
            "legacy_composite_input": "prohibited_composite_gate_before_fit",
            "breadth_duplicated_in_velocity": (
                "statistic_identity_gate_before_fit"
            ),
            "numeric_depth_dependency": "depth_dependency_gate_before_fit",
            "post_period_standardization": (
                "pre_period_standardization_gate_before_fit"
            ),
            "lookahead_window": "lookahead_gate_before_fit",
            "lane_window_misalignment": "lane_alignment_gate_before_fit",
            "blueprint_target_contamination": (
                "blueprint_contamination_gate_before_fit"
            ),
            "outcome_contamination": "outcome_contamination_gate_before_fit",
            "fluency_contamination": "fluency_contamination_gate_before_fit",
            "direct_identifier": "direct_identifier_gate_before_fit",
            "raw_content": "raw_content_gate_before_fit",
            "real_data_flags": "data_boundary_gate_before_fit",
            "missing_joint_covariance": (
                "required_covariance_presence_gate_before_fit"
            ),
            "permuted_covariance_lane_order": (
                "covariance_lane_order_gate_before_fit"
            ),
            "covariance_diagonal_mismatch": (
                "covariance_diagonal_consistency_gate_before_fit"
            ),
            "non_psd_covariance": "covariance_psd_gate_before_fit",
        }
        if case_id == "zero_pre_period_variance":
            semantics.update(
                {
                    "expected_outcome": "hold_before_fit",
                    "expected_failure_stage": "pre_period_scale_gate_before_fit",
                    "fit_expected": False,
                }
            )
            return semantics
        if case_id in reject_before_fit_stages:
            semantics.update(
                {
                    "expected_outcome": "reject_before_fit",
                    "expected_failure_stage": reject_before_fit_stages[case_id],
                    "fit_expected": False,
                }
            )
            return semantics
        full_study_hold_stages = {
            "semantic_hash_drift": "semantic_hash_gate_before_fit",
            "copied_recompute": "recomputation_isolation_gate_before_fit",
            "runner_error": "runner_execution",
            "partial_study": "combine_exact_key_set",
        }
        if case_id in full_study_hold_stages:
            outcome = "full_study_hold"
            if case_id == "copied_recompute":
                outcome = "runner_refusal_and_full_study_hold"
            elif case_id == "runner_error":
                outcome = "durable_runner_error_and_full_study_hold"
            semantics.update(
                {
                    "expected_outcome": outcome,
                    "expected_failure_stage": full_study_hold_stages[case_id],
                    "fit_expected": False,
                    "matched_outcome_holds_full_study": True,
                }
            )
            return semantics
        if case_id in {"self_completion", "unsafe_output_flags"}:
            semantics.update(
                {
                    "expected_outcome": "reject_artifact",
                    "expected_failure_stage": "artifact_governance_validation",
                    "fit_expected": False,
                }
            )
            return semantics
        raise AssertionError("compiled negative-control semantics are incomplete")

    raise ValueError("slot family is not compiled")


def _validate_slot(slot: VbdTrajectoryValidationSlot) -> None:
    if type(slot.family) is not str or type(slot.scenario_or_control_id) is not str:
        raise ValueError("slot family and scenario/control id must be exact strings")
    for name, value in (
        ("panel_group_count", slot.panel_group_count),
        ("replication_index", slot.replication_index),
        ("seed", slot.seed),
        ("k", slot.k),
    ):
        if type(value) is not int:
            raise ValueError(f"slot {name} must be an integer")
    _validate_tuple_field(slot.truth_vector, "truth_vector", item_type=float)
    _validate_tuple_field(slot.direction_vector, "direction_vector", item_type=int)
    if any(item not in (-1, 1) for item in slot.direction_vector):
        raise ValueError("direction_vector items must be -1 or 1")
    _validate_tuple_field(slot.correlations, "correlations", item_type=float)
    for name, value in (
        ("post_pattern", slot.post_pattern),
        ("expected_outcome", slot.expected_outcome),
        ("expected_failure_stage", slot.expected_failure_stage),
    ):
        if type(value) is not str or not value:
            raise ValueError(f"slot {name} must be a nonempty string")
    if type(slot.fit_expected) is not bool:
        raise ValueError("slot fit_expected must be boolean")
    if type(slot.matched_outcome_holds_full_study) is not bool:
        raise ValueError("slot matched-outcome posture must be boolean")
    expected = _canonical_slot_semantics(
        slot.family,
        slot.scenario_or_control_id,
        slot.panel_group_count,
        slot.replication_index,
    )
    observed = {
        "seed": slot.seed,
        "k": slot.k,
        "truth_vector": slot.truth_vector,
        "direction_vector": slot.direction_vector,
        "post_pattern": slot.post_pattern,
        "correlations": slot.correlations,
        "expected_outcome": slot.expected_outcome,
        "expected_failure_stage": slot.expected_failure_stage,
        "fit_expected": slot.fit_expected,
        "matched_outcome_holds_full_study": (
            slot.matched_outcome_holds_full_study
        ),
    }
    if observed != expected:
        raise ValueError("slot body does not match its compiled canonical semantics")


def _make_slot(
    family: str,
    case_id: str,
    panel_group_count: int,
    replication_index: int,
) -> VbdTrajectoryValidationSlot:
    semantics = _canonical_slot_semantics(
        family, case_id, panel_group_count, replication_index
    )
    return VbdTrajectoryValidationSlot(
        family=family,
        scenario_or_control_id=case_id,
        panel_group_count=panel_group_count,
        replication_index=replication_index,
        seed=semantics["seed"],
        k=semantics["k"],
        truth_vector=semantics["truth_vector"],
        direction_vector=semantics["direction_vector"],
        post_pattern=semantics["post_pattern"],
        correlations=semantics["correlations"],
        expected_outcome=semantics["expected_outcome"],
        expected_failure_stage=semantics["expected_failure_stage"],
        fit_expected=semantics["fit_expected"],
        matched_outcome_holds_full_study=semantics[
            "matched_outcome_holds_full_study"
        ],
    )


@lru_cache(maxsize=1)
def required_vbd_trajectory_validation_slots() -> tuple[
    VbdTrajectoryValidationSlot, ...
]:
    primary = tuple(
        _make_slot("primary", _primary_case_id(effect), groups, replication)
        for effect in VBD_TRAJECTORY_VALIDATION_EFFECT_ORDER
        for groups in VBD_TRAJECTORY_VALIDATION_GROUP_ORDER
        for replication in range(_PRIMARY_REPLICATION_COUNT)
    )
    targeted = tuple(
        _make_slot("targeted", scenario, groups, replication)
        for scenario in VBD_TRAJECTORY_VALIDATION_TARGETED_ORDER
        for groups in VBD_TRAJECTORY_VALIDATION_GROUP_ORDER
        for replication in range(_TARGETED_AND_DRIFT_REPLICATION_COUNT)
    )
    drift = tuple(
        _make_slot("drift", scenario, groups, replication)
        for scenario in VBD_TRAJECTORY_VALIDATION_DRIFT_ORDER
        for groups in VBD_TRAJECTORY_VALIDATION_GROUP_ORDER
        for replication in range(_TARGETED_AND_DRIFT_REPLICATION_COUNT)
    )
    floor = tuple(
        _make_slot("floor", f"k={k}", groups, 0)
        for k in VBD_TRAJECTORY_VALIDATION_FLOOR_K_ORDER
        for groups in VBD_TRAJECTORY_VALIDATION_GROUP_ORDER
    )
    negative = tuple(
        _make_slot("negative_control", control, groups, 0)
        for control in VBD_TRAJECTORY_VALIDATION_NEGATIVE_CONTROL_ORDER
        for groups in VBD_TRAJECTORY_VALIDATION_GROUP_ORDER
    )
    slots = primary + targeted + drift + floor + negative
    expected_counts = (
        (primary, VBD_TRAJECTORY_VALIDATION_PRIMARY_COUNT),
        (targeted, VBD_TRAJECTORY_VALIDATION_TARGETED_COUNT),
        (drift, VBD_TRAJECTORY_VALIDATION_DRIFT_COUNT),
        (floor, VBD_TRAJECTORY_VALIDATION_FLOOR_COUNT),
        (negative, VBD_TRAJECTORY_VALIDATION_NEGATIVE_CONTROL_COUNT),
    )
    if any(len(values) != expected for values, expected in expected_counts):
        raise AssertionError("compiled family counts drifted")
    if len(slots) != VBD_TRAJECTORY_VALIDATION_REQUIRED_SLOT_COUNT:
        raise AssertionError("compiled plan must contain exactly 2,000 slots")
    if len({slot.slot_id for slot in slots}) != len(slots):
        raise AssertionError("compiled slot ids must be unique")
    if len({slot.seed for slot in slots}) != len(slots):
        raise AssertionError("compiled seeds must be unique across distinct slots")
    return slots


def vbd_trajectory_validation_slot_from_dict(
    value: object,
) -> VbdTrajectoryValidationSlot:
    record = _strict_record(value, "VBD trajectory validation slot")
    _require_exact_keys(record, _SLOT_DICT_KEYS, "VBD trajectory validation slot")
    correlations = _strict_record(record["correlations"], "correlations")
    _require_exact_keys(
        correlations,
        {"group", "innovation", "observation_error"},
        "correlations",
    )
    slot = VbdTrajectoryValidationSlot(
        family=_strict_string(record["family"], "family"),
        scenario_or_control_id=_strict_string(
            record["scenario_or_control_id"], "scenario_or_control_id"
        ),
        panel_group_count=_strict_int(
            record["panel_group_count"], "panel_group_count"
        ),
        replication_index=_strict_int(
            record["replication_index"], "replication_index"
        ),
        seed=_strict_int(record["seed"], "seed"),
        k=_strict_int(record["k"], "k"),
        truth_vector=_strict_float_vector(record["truth_vector"], "truth_vector"),
        direction_vector=_strict_direction_vector(record["direction_vector"]),
        post_pattern=_strict_string(record["post_pattern"], "post_pattern"),
        correlations=(
            _strict_float(correlations["group"], "correlations.group"),
            _strict_float(
                correlations["innovation"], "correlations.innovation"
            ),
            _strict_float(
                correlations["observation_error"],
                "correlations.observation_error",
            ),
        ),
        expected_outcome=_strict_string(
            record["expected_outcome"], "expected_outcome"
        ),
        expected_failure_stage=_strict_string(
            record["expected_failure_stage"], "expected_failure_stage"
        ),
        fit_expected=_strict_bool(record["fit_expected"], "fit_expected"),
        matched_outcome_holds_full_study=_strict_bool(
            record["matched_outcome_holds_full_study"],
            "matched_outcome_holds_full_study",
        ),
    )
    if record["slot_id"] != slot.slot_id:
        raise ValueError("slot_id does not match the contract key grammar")
    if _strict_sha256(record["slot_hash"], "slot_hash") != slot.slot_hash:
        raise ValueError("slot_hash does not match the complete slot body")
    return slot


_CANARY_SLOT_IDS = (
    "primary/effect=0/groups=6/replication=0",
    "primary/effect=0.5/groups=12/replication=199",
    "targeted/composition_rotation/groups=6/replication=0",
    "targeted/correlated_null/groups=12/replication=29",
)


def _validate_canary(canary: VbdTrajectoryCanaryDescriptor) -> None:
    if type(canary.canary_ordinal) is not int or not 0 <= canary.canary_ordinal < 4:
        raise ValueError("canary_ordinal must be in the compiled range 0..3")
    if type(canary.slot) is not VbdTrajectoryValidationSlot:
        raise ValueError("canary slot must use the exact immutable slot type")
    if canary.slot.slot_id != _CANARY_SLOT_IDS[canary.canary_ordinal]:
        raise ValueError("canary slot order does not match the contract")
    expected_flags = (
        canary.outside_study_denominators is True
        and canary.seed_reuse_only_for_same_slot is True
        and canary.aggregate_gate_computed is False
        and canary.substitutes_for_study_slot is False
        and canary.execution_authorized is False
    )
    if not expected_flags or any(
        type(value) is not bool
        for value in (
            canary.outside_study_denominators,
            canary.seed_reuse_only_for_same_slot,
            canary.aggregate_gate_computed,
            canary.substitutes_for_study_slot,
            canary.execution_authorized,
        )
    ):
        raise ValueError("canary posture does not match the contract")


@lru_cache(maxsize=1)
def required_vbd_trajectory_canaries() -> tuple[
    VbdTrajectoryCanaryDescriptor, ...
]:
    slots_by_id = {
        slot.slot_id: slot for slot in required_vbd_trajectory_validation_slots()
    }
    return tuple(
        VbdTrajectoryCanaryDescriptor(
            canary_ordinal=ordinal,
            slot=slots_by_id[slot_id],
            outside_study_denominators=True,
            seed_reuse_only_for_same_slot=True,
            aggregate_gate_computed=False,
            substitutes_for_study_slot=False,
            execution_authorized=False,
        )
        for ordinal, slot_id in enumerate(_CANARY_SLOT_IDS)
    )


def vbd_trajectory_canary_from_dict(
    value: object,
) -> VbdTrajectoryCanaryDescriptor:
    record = _strict_record(value, "VBD trajectory canary")
    _require_exact_keys(
        record,
        {
            "canary_ordinal",
            "canary_id",
            "slot",
            "seed",
            "outside_study_denominators",
            "seed_reuse_only_for_same_slot",
            "aggregate_gate_computed",
            "substitutes_for_study_slot",
            "execution_authorized",
            "canary_hash",
        },
        "VBD trajectory canary",
    )
    canary = VbdTrajectoryCanaryDescriptor(
        canary_ordinal=_strict_int(record["canary_ordinal"], "canary_ordinal"),
        slot=vbd_trajectory_validation_slot_from_dict(record["slot"]),
        outside_study_denominators=_strict_bool(
            record["outside_study_denominators"], "outside_study_denominators"
        ),
        seed_reuse_only_for_same_slot=_strict_bool(
            record["seed_reuse_only_for_same_slot"],
            "seed_reuse_only_for_same_slot",
        ),
        aggregate_gate_computed=_strict_bool(
            record["aggregate_gate_computed"], "aggregate_gate_computed"
        ),
        substitutes_for_study_slot=_strict_bool(
            record["substitutes_for_study_slot"],
            "substitutes_for_study_slot",
        ),
        execution_authorized=_strict_bool(
            record["execution_authorized"], "execution_authorized"
        ),
    )
    if record["canary_id"] != canary.canary_id or record["seed"] != canary.slot.seed:
        raise ValueError("canary derived identity does not match its full slot")
    if _strict_sha256(record["canary_hash"], "canary_hash") != canary.canary_hash:
        raise ValueError("canary_hash does not match the complete descriptor")
    return canary


def _validate_chunk(chunk: VbdTrajectoryValidationChunk) -> None:
    for name, value in (
        ("chunk_index", chunk.chunk_index),
        ("global_start_index_inclusive", chunk.global_start_index_inclusive),
        ("global_end_index_exclusive", chunk.global_end_index_exclusive),
    ):
        if type(value) is not int:
            raise ValueError(f"chunk {name} must be an integer")
    if not 0 <= chunk.chunk_index < VBD_TRAJECTORY_VALIDATION_CHUNK_COUNT:
        raise ValueError("chunk_index must be in the compiled range 0..39")
    expected_start = chunk.chunk_index * VBD_TRAJECTORY_VALIDATION_SLOTS_PER_CHUNK
    expected_end = expected_start + VBD_TRAJECTORY_VALIDATION_SLOTS_PER_CHUNK
    if (
        chunk.global_start_index_inclusive != expected_start
        or chunk.global_end_index_exclusive != expected_end
    ):
        raise ValueError("chunk bounds are not the compiled consecutive slice")
    if type(chunk.slot_ids) is not tuple or type(chunk.slot_hashes) is not tuple:
        raise ValueError("chunk slot ids and hashes must be immutable tuples")
    if len(chunk.slot_ids) != VBD_TRAJECTORY_VALIDATION_SLOTS_PER_CHUNK:
        raise ValueError("chunk must contain exactly 50 slot ids")
    if len(chunk.slot_hashes) != VBD_TRAJECTORY_VALIDATION_SLOTS_PER_CHUNK:
        raise ValueError("chunk must contain exactly 50 slot hashes")
    if any(type(slot_id) is not str or not slot_id for slot_id in chunk.slot_ids):
        raise ValueError("chunk slot ids must be nonempty strings")
    if any(not _SHA256_RE.fullmatch(value) for value in chunk.slot_hashes):
        raise ValueError("chunk slot hashes must be lowercase SHA-256 hex")
    slots = required_vbd_trajectory_validation_slots()[expected_start:expected_end]
    if chunk.slot_ids != tuple(slot.slot_id for slot in slots):
        raise ValueError("chunk slot ids do not match the canonical global slice")
    if chunk.slot_hashes != tuple(slot.slot_hash for slot in slots):
        raise ValueError("chunk slot hashes do not match the canonical global slice")


@lru_cache(maxsize=1)
def required_vbd_trajectory_validation_chunks() -> tuple[
    VbdTrajectoryValidationChunk, ...
]:
    slots = required_vbd_trajectory_validation_slots()
    chunks = []
    for chunk_index in range(VBD_TRAJECTORY_VALIDATION_CHUNK_COUNT):
        start = chunk_index * VBD_TRAJECTORY_VALIDATION_SLOTS_PER_CHUNK
        end = start + VBD_TRAJECTORY_VALIDATION_SLOTS_PER_CHUNK
        selected = slots[start:end]
        chunks.append(
            VbdTrajectoryValidationChunk(
                chunk_index=chunk_index,
                global_start_index_inclusive=start,
                global_end_index_exclusive=end,
                slot_ids=tuple(slot.slot_id for slot in selected),
                slot_hashes=tuple(slot.slot_hash for slot in selected),
            )
        )
    return tuple(chunks)


def vbd_trajectory_validation_chunk(
    chunk_index: int,
) -> VbdTrajectoryValidationChunk:
    if type(chunk_index) is not int or not 0 <= chunk_index < 40:
        raise ValueError("chunk_index must be in the compiled range 0..39")
    return required_vbd_trajectory_validation_chunks()[chunk_index]


def vbd_trajectory_validation_chunk_from_dict(
    value: object,
) -> VbdTrajectoryValidationChunk:
    record = _strict_record(value, "VBD trajectory validation chunk")
    _require_exact_keys(
        record,
        {
            "chunk_index",
            "chunk_id",
            "global_start_index_inclusive",
            "global_end_index_exclusive",
            "expected_slot_count",
            "slot_ids",
            "slot_hashes",
            "chunk_hash",
        },
        "VBD trajectory validation chunk",
    )
    slot_ids = tuple(
        _strict_string(item, "chunk slot id")
        for item in _strict_list(record["slot_ids"], "slot_ids")
    )
    slot_hashes = tuple(
        _strict_sha256(item, "chunk slot hash")
        for item in _strict_list(record["slot_hashes"], "slot_hashes")
    )
    chunk = VbdTrajectoryValidationChunk(
        chunk_index=_strict_int(record["chunk_index"], "chunk_index"),
        global_start_index_inclusive=_strict_int(
            record["global_start_index_inclusive"],
            "global_start_index_inclusive",
        ),
        global_end_index_exclusive=_strict_int(
            record["global_end_index_exclusive"],
            "global_end_index_exclusive",
        ),
        slot_ids=slot_ids,
        slot_hashes=slot_hashes,
    )
    if record["chunk_id"] != chunk.chunk_id:
        raise ValueError("chunk_id does not match chunk_index")
    if _strict_int(record["expected_slot_count"], "expected_slot_count") != 50:
        raise ValueError("expected_slot_count must equal 50")
    if _strict_sha256(record["chunk_hash"], "chunk_hash") != chunk.chunk_hash:
        raise ValueError("chunk_hash does not match the complete chunk body")
    return chunk


def combine_vbd_trajectory_validation_chunks(
    chunks: tuple[VbdTrajectoryValidationChunk, ...],
) -> tuple[VbdTrajectoryValidationSlot, ...]:
    """Validate a complete chunk set and restore canonical global slot order."""

    if type(chunks) is not tuple:
        raise ValueError("chunks must be an immutable tuple")
    if len(chunks) != VBD_TRAJECTORY_VALIDATION_CHUNK_COUNT:
        raise ValueError("exactly 40 chunks are required")
    if any(type(chunk) is not VbdTrajectoryValidationChunk for chunk in chunks):
        raise ValueError("chunks must use the exact immutable chunk type")
    by_index: dict[int, VbdTrajectoryValidationChunk] = {}
    for chunk in chunks:
        if chunk.chunk_index in by_index:
            raise ValueError("chunk indexes must be unique")
        expected = required_vbd_trajectory_validation_chunks()[chunk.chunk_index]
        if chunk != expected:
            raise ValueError("chunk differs from its canonical descriptor")
        by_index[chunk.chunk_index] = chunk
    if set(by_index) != set(range(VBD_TRAJECTORY_VALIDATION_CHUNK_COUNT)):
        raise ValueError("chunk index set is incomplete")
    canonical_slots = required_vbd_trajectory_validation_slots()
    slots_by_id = {slot.slot_id: slot for slot in canonical_slots}
    restored = tuple(
        slots_by_id[slot_id]
        for index in range(VBD_TRAJECTORY_VALIDATION_CHUNK_COUNT)
        for slot_id in by_index[index].slot_ids
    )
    if restored != canonical_slots:
        raise ValueError("chunk union is not a bijection over the global plan")
    return restored


def _validate_plan(plan: VbdTrajectoryValidationPlan) -> None:
    if type(plan.slots) is not tuple or any(
        type(slot) is not VbdTrajectoryValidationSlot for slot in plan.slots
    ):
        raise ValueError("plan slots must be exact immutable slot records")
    if type(plan.canaries) is not tuple or any(
        type(canary) is not VbdTrajectoryCanaryDescriptor
        for canary in plan.canaries
    ):
        raise ValueError("plan canaries must be exact immutable descriptors")
    if type(plan.chunks) is not tuple or any(
        type(chunk) is not VbdTrajectoryValidationChunk for chunk in plan.chunks
    ):
        raise ValueError("plan chunks must be exact immutable descriptors")
    if plan.slots != required_vbd_trajectory_validation_slots():
        raise ValueError("plan slot order or bodies are not canonical")
    if plan.canaries != required_vbd_trajectory_canaries():
        raise ValueError("plan canary order or bodies are not canonical")
    if plan.chunks != required_vbd_trajectory_validation_chunks():
        raise ValueError("plan chunk order or bodies are not canonical")
    combine_vbd_trajectory_validation_chunks(plan.chunks)
    expected_slot_bodies_hash = sha256_json(
        [slot.body_without_hash() for slot in plan.slots]
    )
    expected_seeds_hash = sha256_json(
        [{"slot_id": slot.slot_id, "seed": slot.seed} for slot in plan.slots]
    )
    expected_canaries_hash = sha256_json(
        [canary.to_dict() for canary in plan.canaries]
    )
    expected_chunks_hash = sha256_json([chunk.to_dict() for chunk in plan.chunks])
    for name, observed, expected in (
        ("slot_bodies_hash", plan.slot_bodies_hash, expected_slot_bodies_hash),
        ("seeds_hash", plan.seeds_hash, expected_seeds_hash),
        ("canaries_hash", plan.canaries_hash, expected_canaries_hash),
        ("chunks_hash", plan.chunks_hash, expected_chunks_hash),
    ):
        if type(observed) is not str or observed != expected:
            raise ValueError(f"plan {name} does not match canonical content")
    if plan.runtime_configurability != tuple(
        (name, False) for name in _RUNTIME_CONFIGURABILITY_FIELDS
    ):
        raise ValueError("all plan runtime configurability must be false")
    if plan.authorization != tuple((name, False) for name in _AUTHORIZATION_FIELDS):
        raise ValueError("all plan authorization must be false")
    if type(plan.plan_hash) is not str or plan.plan_hash != sha256_json(
        plan.body_without_hash()
    ):
        raise ValueError("plan_hash does not match the complete plan body")


@lru_cache(maxsize=1)
def immutable_vbd_trajectory_validation_plan() -> VbdTrajectoryValidationPlan:
    slots = required_vbd_trajectory_validation_slots()
    canaries = required_vbd_trajectory_canaries()
    chunks = required_vbd_trajectory_validation_chunks()
    slot_bodies_hash = sha256_json(
        [slot.body_without_hash() for slot in slots]
    )
    seeds_hash = sha256_json(
        [{"slot_id": slot.slot_id, "seed": slot.seed} for slot in slots]
    )
    canaries_hash = sha256_json([canary.to_dict() for canary in canaries])
    chunks_hash = sha256_json([chunk.to_dict() for chunk in chunks])
    runtime_configurability = tuple(
        (name, False) for name in _RUNTIME_CONFIGURABILITY_FIELDS
    )
    authorization = tuple((name, False) for name in _AUTHORIZATION_FIELDS)
    provisional = object.__new__(VbdTrajectoryValidationPlan)
    values = {
        "slots": slots,
        "canaries": canaries,
        "chunks": chunks,
        "slot_bodies_hash": slot_bodies_hash,
        "seeds_hash": seeds_hash,
        "canaries_hash": canaries_hash,
        "chunks_hash": chunks_hash,
        "runtime_configurability": runtime_configurability,
        "authorization": authorization,
        "plan_hash": "",
    }
    for name, value in values.items():
        object.__setattr__(provisional, name, value)
    plan_hash = sha256_json(provisional.body_without_hash())
    return VbdTrajectoryValidationPlan(
        slots=slots,
        canaries=canaries,
        chunks=chunks,
        slot_bodies_hash=slot_bodies_hash,
        seeds_hash=seeds_hash,
        canaries_hash=canaries_hash,
        chunks_hash=chunks_hash,
        runtime_configurability=runtime_configurability,
        authorization=authorization,
        plan_hash=plan_hash,
    )


def vbd_trajectory_validation_plan() -> dict:
    """Return a fresh JSON-shaped copy of the immutable canonical plan."""

    return immutable_vbd_trajectory_validation_plan().to_dict()


def _plan_dict_keys() -> set[str]:
    return {
        "plan_version",
        "plan_class",
        "canonical_family_order",
        "primary_effect_order",
        "targeted_scenario_order",
        "drift_scenario_order",
        "floor_k_order",
        "negative_control_order",
        "panel_group_order",
        "primary_replication_indexes",
        "targeted_and_drift_replication_indexes",
        "family_counts",
        "required_slot_count",
        "compiled_gate_and_mutation_contract",
        "slots",
        "slot_bodies_hash",
        "seeds_hash",
        "canaries",
        "canaries_hash",
        "chunk_count",
        "slots_per_chunk",
        "chunks",
        "chunks_hash",
        "internal_only",
        "synthetic_only",
        "aggregate_only",
        "execution_state",
        *_RUNTIME_CONFIGURABILITY_FIELDS,
        *_AUTHORIZATION_FIELDS,
        "plan_hash",
    }


def vbd_trajectory_validation_plan_from_dict(
    value: object,
) -> VbdTrajectoryValidationPlan:
    """Parse only the exact canonical plan, not merely a self-consistent rehash."""

    record = _strict_record(value, "VBD trajectory validation plan")
    _require_exact_keys(record, _plan_dict_keys(), "VBD trajectory validation plan")
    canonical = immutable_vbd_trajectory_validation_plan()
    canonical_dict = canonical.to_dict()
    scalar_keys = _plan_dict_keys() - {
        "slots",
        "canaries",
        "chunks",
        "slot_bodies_hash",
        "seeds_hash",
        "canaries_hash",
        "chunks_hash",
        "plan_hash",
    }
    for key in scalar_keys:
        if (
            type(record[key]) is not type(canonical_dict[key])
            or record[key] != canonical_dict[key]
        ):
            raise ValueError(f"plan field {key} does not match the compiled value")
    slots = tuple(
        vbd_trajectory_validation_slot_from_dict(item)
        for item in _strict_list(record["slots"], "slots")
    )
    canaries = tuple(
        vbd_trajectory_canary_from_dict(item)
        for item in _strict_list(record["canaries"], "canaries")
    )
    chunks = tuple(
        vbd_trajectory_validation_chunk_from_dict(item)
        for item in _strict_list(record["chunks"], "chunks")
    )
    plan = VbdTrajectoryValidationPlan(
        slots=slots,
        canaries=canaries,
        chunks=chunks,
        slot_bodies_hash=_strict_sha256(
            record["slot_bodies_hash"], "slot_bodies_hash"
        ),
        seeds_hash=_strict_sha256(record["seeds_hash"], "seeds_hash"),
        canaries_hash=_strict_sha256(
            record["canaries_hash"], "canaries_hash"
        ),
        chunks_hash=_strict_sha256(record["chunks_hash"], "chunks_hash"),
        runtime_configurability=tuple(
            (
                name,
                _strict_bool(record[name], name),
            )
            for name in _RUNTIME_CONFIGURABILITY_FIELDS
        ),
        authorization=tuple(
            (
                name,
                _strict_bool(record[name], name),
            )
            for name in _AUTHORIZATION_FIELDS
        ),
        plan_hash=_strict_sha256(record["plan_hash"], "plan_hash"),
    )
    if plan != canonical or plan.to_dict() != record:
        raise ValueError("plan is not the exact compiled canonical plan")
    return plan


def vbd_trajectory_validation_slot_constructor_fields() -> tuple[str, ...]:
    """Expose the complete no-default slot constructor contract for review."""

    return tuple(field.name for field in fields(VbdTrajectoryValidationSlot))
