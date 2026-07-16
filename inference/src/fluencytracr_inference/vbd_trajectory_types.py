"""Strict synthetic-only records for VBD primitive trajectory calibration."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import math
import re
import sys
from typing import Iterable

import numpy as np
import scipy

from .hashing import sha256_json
from .longitudinal_types import MAX_JAVASCRIPT_SAFE_INTEGER


VBD_TRAJECTORY_SCHEMA_VERSION = "FT_AI_VALUE_VBD_TRAJECTORY_INPUT_2026_07_V1"
VBD_TRAJECTORY_EVENT_SCHEMA_VERSION = "FT_V2_2026_05"
VBD_TRAJECTORY_MODEL_FAMILY = (
    "bayesian_ai_value_realization_and_human_transformation_model_family"
)
VBD_TRAJECTORY_MODEL_COMPONENT = "bayesian_vbd_behavioral_trajectory_model"
VBD_TRAJECTORY_LANES = ("frequency", "engagement", "breadth")
VBD_TRAJECTORY_PERCENTILES = ("p10", "p50", "p90", "p99")
VBD_TRAJECTORY_COVARIANCE_LANE_ORDER = VBD_TRAJECTORY_LANES
VBD_TRAJECTORY_PRE_WINDOW_COUNT = 12
VBD_TRAJECTORY_POST_WINDOW_COUNT = 6
VBD_TRAJECTORY_TOTAL_WINDOW_COUNT = 18
VBD_TRAJECTORY_EVALUATION_WINDOW_INDEXES = (15, 16, 17)
VBD_TRAJECTORY_PANEL_GROUP_COUNTS = (6, 12)
VBD_TRAJECTORY_WINDOW_DAYS = 60
VBD_TRAJECTORY_EPOCH = datetime(2000, 1, 1, tzinfo=timezone.utc)
VBD_TRAJECTORY_QUANTILE_ALGORITHM = "hyndman_fan_type7_linear_v1"
VBD_TRAJECTORY_SYNTHETIC_DERIVATION = (
    "synthetic_known_aggregate_uncertainty_v1"
)
VBD_TRAJECTORY_BOOTSTRAP_DERIVATION = (
    "source_side_synchronized_type7_bootstrap_v1"
)
VBD_TRAJECTORY_RUNTIME_REF = (
    "runtime:vbd-trajectory-python-3.13-numpy-2.4.6-scipy-1.18.0"
)
VBD_TRAJECTORY_NUMPY_VERSION = "2.4.6"
VBD_TRAJECTORY_SCIPY_VERSION = "1.18.0"
VBD_TRAJECTORY_GENERATOR_ID = "vbd_trajectory_direct_aggregate_dgp_v1"
VBD_TRAJECTORY_RNG_ID = "numpy.random.PCG64DXSM"
VBD_TRAJECTORY_SMOKE_SEED_MIN = 2_055_900_000
VBD_TRAJECTORY_SMOKE_SEED_MAX = 2_055_900_999
VBD_TRAJECTORY_SMOKE_PLAN_REF = "plan:vbd-trajectory-development-smoke-v1"
VBD_TRAJECTORY_VALIDATION_PLAN_REF = "plan:vbd-trajectory-validation-v1"
VBD_TRAJECTORY_SMOKE_SEED_NAMESPACE = "development_smoke_nonacceptance"
VBD_TRAJECTORY_VALIDATION_SEED_NAMESPACE = "validation_plan_acceptance"
VBD_TRAJECTORY_TRANSFORMS = {
    "frequency": "log1p_p50_v1",
    "engagement": "asin_sqrt_proportion_p50_v1",
    "breadth": "asin_sqrt_proportion_p50_v1",
}
VBD_TRAJECTORY_EVENTS = {
    "frequency": "USER_FREQUENCY_OBSERVED",
    "engagement": "USER_ENGAGEMENT_OBSERVED",
    "breadth": "USER_BREADTH_OBSERVED",
}
VBD_TRAJECTORY_STATISTICS = {
    "frequency": "distribution.p50",
    "engagement": "distribution.p50",
    "breadth": "distribution.p50",
}
VBD_TRAJECTORY_UNITS = {
    "frequency": "runs_per_active_day",
    "engagement": "active_days",
    "breadth": "distinct_governed_surfaces",
}
VBD_TRAJECTORY_DENOMINATORS = {
    "frequency": None,
    "engagement": 60,
    "breadth": 12,
}
VBD_TRAJECTORY_RAW_SCALES = {
    "frequency": 0.25,
    "engagement": 0.12,
    "breadth": 0.12,
}
VBD_TRAJECTORY_QUANTILE_DELTAS = {
    "p10": -0.20,
    "p50": 0.0,
    "p90": 0.20,
    "p99": 0.30,
}
VBD_TRAJECTORY_BLOCKED_USES = (
    "real_data_admission",
    "customer_output",
    "confidence_output",
    "probability_output",
    "causal_claim",
    "roi_output",
    "productivity_output",
    "ranking",
    "outcome_model_integration",
    "route_creation",
    "ui_creation",
    "persistence",
    "connector_execution",
    "export_creation",
)
VBD_TRAJECTORY_DEPTH_REFS = (
    "depth-context:a",
    "depth-context:b",
    "depth-context:unavailable",
)
_CANONICAL_UNAVAILABLE_DEPTH_BODY = {
    "context_ref": "depth-context:unavailable",
    "definition_ref": "definition:depth-context-v1",
    "source_ref": "source:vbd-synthetic-depth-context",
    "source_hash": sha256_json(
        {"context_ref": "depth-context:unavailable", "synthetic": True}
    ),
    "aggregate_review_state": "unavailable",
    "suppression_posture": "unavailable",
    "caveat_refs": ["caveat:depth-context-only"],
    "used_in_likelihood": False,
    "used_in_eligibility": False,
}
VBD_TRAJECTORY_MISSING_DEPTH_CONTEXT_ROOT = sha256_json(
    _CANONICAL_UNAVAILABLE_DEPTH_BODY
)
VBD_TRAJECTORY_REFERENCE_SPEC = {
    "definition:frequency-runs-per-active-day-v1": (
        "frequency_definition",
        "definition:frequency-runs-per-active-day-v1",
    ),
    "definition:frequency-active-day-v1": (
        "frequency_denominator_definition",
        "definition:frequency-active-day-v1",
    ),
    "definition:engagement-active-days-v1": (
        "engagement_definition",
        "definition:engagement-active-days-v1",
    ),
    "definition:eligible-day-60-v1": (
        "engagement_denominator_definition",
        "definition:eligible-day-60-v1",
    ),
    "definition:breadth-distinct-governed-surfaces-v1": (
        "breadth_definition",
        "definition:breadth-distinct-governed-surfaces-v1",
    ),
    "definition:synthetic-surface-taxonomy-v1": (
        "breadth_denominator_definition",
        "definition:synthetic-surface-taxonomy-v1",
    ),
    "source:vbd-synthetic-frequency": (
        "frequency_source",
        "definition:frequency-runs-per-active-day-v1",
    ),
    "source:vbd-synthetic-engagement": (
        "engagement_source",
        "definition:engagement-active-days-v1",
    ),
    "source:vbd-synthetic-breadth": (
        "breadth_source",
        "definition:breadth-distinct-governed-surfaces-v1",
    ),
    "source:vbd-synthetic-uncertainty": (
        "uncertainty_derivation",
        "definition:synthetic-known-aggregate-uncertainty-v1",
    ),
    "definition:synthetic-known-aggregate-uncertainty-v1": (
        "uncertainty_definition",
        "definition:synthetic-known-aggregate-uncertainty-v1",
    ),
    VBD_TRAJECTORY_RUNTIME_REF: (
        "runtime",
        "definition:synthetic-known-aggregate-uncertainty-v1",
    ),
    "gate:vbd-synthetic-window-clear": (
        "gate_receipt",
        "definition:synthetic-known-aggregate-uncertainty-v1",
    ),
    VBD_TRAJECTORY_SMOKE_PLAN_REF: (
        "study_plan",
        "definition:synthetic-known-aggregate-uncertainty-v1",
    ),
    "definition:depth-context-v1": (
        "depth_definition",
        "definition:depth-context-v1",
    ),
    "source:vbd-synthetic-depth-context": (
        "depth_source",
        "definition:depth-context-v1",
    ),
    "caveat:depth-context-only": (
        "depth_caveat",
        "definition:depth-context-v1",
    ),
    "depth-context:a": ("depth_context", "definition:depth-context-v1"),
    "depth-context:b": ("depth_context", "definition:depth-context-v1"),
    "depth-context:unavailable": (
        "depth_context",
        "definition:depth-context-v1",
    ),
}

_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
_REF_RE = re.compile(
    r"^(?:source|definition|cohort|plan|gate|review|depth-context|caveat|runtime):"
    r"[a-z][a-z0-9._/-]{0,95}$"
)
_SAFE_ID_RE = re.compile(r"^[A-Za-z][A-Za-z0-9._:/-]{0,95}$")
_FORBIDDEN_KEY_RE = re.compile(
    r"(?:^|_)(?:user|email|employee|respondent|person|member_id|raw_rows?|"
    r"prompt|response|transcript|customer_name|overall_vbd_score|"
    r"integration_score|vbd_quadrant|velocity_index|depth_value|"
    r"blueprint_target_value|primary_outcome_value|ai_fluency_value)(?:_|$)",
    re.IGNORECASE,
)
_FORBIDDEN_REF_FRAGMENT_RE = re.compile(
    r"(?:\s|@|\?|#|user|email|employee|respondent|person|customer|raw|secret)",
    re.IGNORECASE,
)


class TrajectoryStructureError(ValueError):
    """An aggregate trajectory record is malformed or unsafe."""


class TrajectoryCovarianceError(TrajectoryStructureError):
    """The joint uncertainty covariance failed a compiled gate."""

    def __init__(self, stage: str, message: str):
        super().__init__(message)
        self.stage = stage


def validate_vbd_trajectory_runtime() -> None:
    """Fail closed unless generation/validation uses the frozen numerical runtime."""

    if (
        sys.version_info[:2] != (3, 13)
        or np.__version__ != VBD_TRAJECTORY_NUMPY_VERSION
        or scipy.__version__ != VBD_TRAJECTORY_SCIPY_VERSION
    ):
        raise TrajectoryStructureError(
            "VBD trajectory runtime does not match the frozen Python/NumPy/SciPy identity"
        )


def _strict_int(value: object, name: str, *, minimum: int | None = None) -> int:
    if type(value) is not int:
        raise TrajectoryStructureError(f"{name} must be an integer")
    if value < 0 or value > MAX_JAVASCRIPT_SAFE_INTEGER:
        raise TrajectoryStructureError(f"{name} is outside the supported range")
    if minimum is not None and value < minimum:
        raise TrajectoryStructureError(f"{name} must be at least {minimum}")
    return value


def _finite(value: object, name: str, *, positive: bool = False) -> float:
    if type(value) not in (int, float):
        raise TrajectoryStructureError(f"{name} must be numeric")
    result = float(value)
    if not math.isfinite(result):
        raise TrajectoryStructureError(f"{name} must be finite")
    if positive and result <= 0.0:
        raise TrajectoryStructureError(f"{name} must be positive")
    return result


def _strict_bool(value: object, name: str) -> bool:
    if type(value) is not bool:
        raise TrajectoryStructureError(f"{name} must be a boolean")
    return value


def _sha256(value: object, name: str) -> str:
    if type(value) is not str or not _SHA256_RE.fullmatch(value):
        raise TrajectoryStructureError(f"{name} must be lowercase SHA-256")
    return value


def _safe_id(value: object, name: str) -> str:
    if type(value) is not str or not _SAFE_ID_RE.fullmatch(value):
        raise TrajectoryStructureError(f"{name} must be safe compact metadata")
    return value


def _ref(value: object, name: str) -> str:
    if type(value) is not str or not _REF_RE.fullmatch(value):
        raise TrajectoryStructureError(f"{name} has an unsupported namespace or shape")
    if _FORBIDDEN_REF_FRAGMENT_RE.search(value):
        raise TrajectoryStructureError(f"{name} contains unsafe reference content")
    return value


def _assert_no_forbidden_keys(value: object, path: str = "trajectory") -> None:
    if type(value) is dict:
        for key, nested in value.items():
            if type(key) is not str:
                raise TrajectoryStructureError(f"{path} has a non-string key")
            if _FORBIDDEN_KEY_RE.search(key):
                raise TrajectoryStructureError(f"{path}.{key} is forbidden")
            _assert_no_forbidden_keys(nested, f"{path}.{key}")
    elif type(value) in (list, tuple):
        for index, nested in enumerate(value):
            _assert_no_forbidden_keys(nested, f"{path}[{index}]")


def trajectory_window_bounds(index: int) -> tuple[str, str]:
    validated = _strict_int(index, "window index")
    if validated >= VBD_TRAJECTORY_TOTAL_WINDOW_COUNT:
        raise TrajectoryStructureError("window index is off plan")
    start = VBD_TRAJECTORY_EPOCH + timedelta(
        days=VBD_TRAJECTORY_WINDOW_DAYS * validated
    )
    end = start + timedelta(days=VBD_TRAJECTORY_WINDOW_DAYS)
    return (
        start.strftime("%Y-%m-%dT%H:%M:%SZ"),
        end.strftime("%Y-%m-%dT%H:%M:%SZ"),
    )


def vbd_trajectory_model_manifest_body() -> dict:
    return {
        "model_family": VBD_TRAJECTORY_MODEL_FAMILY,
        "model_component": VBD_TRAJECTORY_MODEL_COMPONENT,
        "equation": "x_star=alpha+u+beta*tau+r+known_se_error",
        "priors": {
            "alpha": "Normal(0,1)",
            "beta": "Normal(0,1)",
            "sigma_u": "HalfNormal(1)",
            "sigma_r": "HalfNormal(1)",
            "rho": "Uniform(-0.95,0.95)",
        },
        "estimand": {
            "id": "fixed_interval_smoothed_terminal_movement_v1",
            "pre_window_indexes": list(range(12)),
            "evaluation_window_indexes": [15, 16, 17],
            "panel_and_window_weighting": "equal",
            "direction_adjusted": True,
            "forecast": False,
        },
        "deterministic_engine": {
            "engine_id": "deterministic_gaussian_state_space_integration",
            "outer_sequence": "unscrambled_sobol_v1",
            "outer_point_count": 8192,
            "proposal": "student_t_df_5_v1",
            "proposal_scale": 1.5,
            "minimum_finite_point_count": 4096,
            "minimum_effective_sample_size": 256.0,
            "maximum_normalized_weight": 0.05,
            "conditional_quadrature": "normal_quadrature_v1",
            "conditional_quadrature_point_count": 16,
            "stable_support_index": "16*original_sobol_ordinal+quadrature_index",
            "random_numbers_used": False,
        },
        "reference_engine": {
            "engine_id": "pymc_nuts_state_space_reference",
            "sampler": "pymc",
            "chains": 4,
            "draws": 1000,
            "tune": 2000,
            "target_accept": 0.99,
            "max_treedepth": 15,
            "trajectory_movement": "conditional_normal_smoothed_contrast_v1",
            "explicit_chain_seeds": True,
        },
        "posterior_statistics": {
            "weighted_quantile": "weighted_quantile_v1",
            "interval_80_probabilities": [0.10, 0.90],
            "interval_99_probabilities": [0.005, 0.995],
        },
        "posterior_predictive_check": {
            "manifest_id": "vbd_trajectory_ppc_v1",
            "rng": "numpy.random.PCG64DXSM",
            "state_generation": "conditional_smoothed_ar1_path_v1",
            "tail": "upper_inclusive",
            "statistics": [
                "pre_post_mean_movement",
                "between_panel_group_variance",
                "within_panel_group_variance",
                "tail_or_extreme_aggregate_statistic",
                "lag_one_within_group_autocorrelation",
            ],
        },
        "diagnostic_gates": {
            "r_hat_max": 1.01,
            "bulk_ess_min": 400.0,
            "tail_ess_min": 400.0,
            "post_warmup_divergences_max": 0,
            "max_treedepth_saturation_count_max": 0,
            "energy_bfmi_min": 0.3,
            "max_mcse_to_posterior_sd_ratio": 0.1,
            "ppc_value_range_inclusive": [0.05, 0.95],
        },
        "depth_used_in_likelihood": False,
        "additional_observation_scale": False,
    }


def vbd_eligible_surface_set_hash() -> str:
    return sha256_json(
        {
            "taxonomy_ref": "definition:synthetic-surface-taxonomy-v1",
            "eligible_surfaces": [f"surface-{index:02d}" for index in range(1, 13)],
        }
    )


def expected_static_reference_content_hash(
    ref_value: str,
    field_role: str,
    source_definition_ref: str,
) -> str:
    lane_definition_refs = {
        "definition:frequency-runs-per-active-day-v1": "frequency",
        "definition:engagement-active-days-v1": "engagement",
        "definition:breadth-distinct-governed-surfaces-v1": "breadth",
    }
    if ref_value in lane_definition_refs:
        lane = lane_definition_refs[ref_value]
        return sha256_json(
            {
                "definition_ref": ref_value,
                "event_name": VBD_TRAJECTORY_EVENTS[lane],
                "statistic_name": VBD_TRAJECTORY_STATISTICS[lane],
                "unit": VBD_TRAJECTORY_UNITS[lane],
                "transform_id": VBD_TRAJECTORY_TRANSFORMS[lane],
                "quantile_algorithm": VBD_TRAJECTORY_QUANTILE_ALGORITHM,
            }
        )
    denominator_specs = {
        "definition:frequency-active-day-v1": (None, None),
        "definition:eligible-day-60-v1": (60, None),
        "definition:synthetic-surface-taxonomy-v1": (
            12,
            "definition:synthetic-surface-taxonomy-v1",
        ),
    }
    if ref_value in denominator_specs:
        denominator, taxonomy = denominator_specs[ref_value]
        return sha256_json(
            {
                "definition_ref": ref_value,
                "denominator": denominator,
                "synthetic_taxonomy": taxonomy,
            }
        )
    return sha256_json(
        {
            "ref": ref_value,
            "field_role": field_role,
            "source_definition_ref": source_definition_ref,
        }
    )


def transform_trajectory_value(lane: str, value: float, denominator: int | None) -> float:
    numeric = _finite(value, f"{lane} value")
    if lane == "frequency":
        if numeric < 0.0 or denominator is not None:
            raise TrajectoryStructureError("frequency requires a nonnegative value and no denominator")
        return float(math.log1p(numeric))
    if lane not in ("engagement", "breadth"):
        raise TrajectoryStructureError("unsupported trajectory lane")
    if denominator is None:
        raise TrajectoryStructureError(f"{lane} requires an exact denominator")
    validated_denominator = _strict_int(denominator, f"{lane} denominator", minimum=1)
    if numeric < 0.0 or numeric > validated_denominator:
        raise TrajectoryStructureError(f"{lane} value is outside its denominator domain")
    return float(math.asin(math.sqrt(numeric / validated_denominator)))


@dataclass(frozen=True)
class PrimitiveDistribution:
    p10: float
    p50: float
    p90: float
    p99: float

    def to_dict(self) -> dict:
        return {
            "p10": float(self.p10),
            "p50": float(self.p50),
            "p90": float(self.p90),
            "p99": float(self.p99),
        }

    def values(self) -> tuple[float, float, float, float]:
        return tuple(
            _finite(value, f"distribution.{name}")
            for name, value in zip(VBD_TRAJECTORY_PERCENTILES, (self.p10, self.p50, self.p90, self.p99))
        )


@dataclass(frozen=True)
class TrajectoryReferenceEntry:
    ref: str
    field_role: str
    owner_role: str
    source_definition_ref: str
    bound_content_hash: str = ""
    aggregate_only: bool = True
    blocked_uses: tuple[str, ...] = VBD_TRAJECTORY_BLOCKED_USES

    def to_dict(self) -> dict:
        return {
            "ref": self.ref,
            "field_role": self.field_role,
            "owner_role": self.owner_role,
            "source_definition_ref": self.source_definition_ref,
            "bound_content_hash": self.bound_content_hash,
            "aggregate_only": self.aggregate_only,
            "blocked_uses": list(self.blocked_uses),
        }


@dataclass(frozen=True)
class TrajectoryReferenceManifest:
    entries: tuple[TrajectoryReferenceEntry, ...]
    manifest_hash: str

    def to_dict(self) -> dict:
        return {
            "entries": [entry.to_dict() for entry in self.entries],
            "manifest_hash": self.manifest_hash,
        }

    def by_ref(self) -> dict[str, TrajectoryReferenceEntry]:
        return {entry.ref: entry for entry in self.entries}


@dataclass(frozen=True)
class PrimitiveTrajectoryObservation:
    lane: str
    event_schema_version: str
    event_name: str
    statistic_name: str
    unit: str
    transform_id: str
    distribution: PrimitiveDistribution
    denominator: int | None
    transformed_p50: float
    transformed_standard_error: float
    definition_ref: str
    definition_hash: str
    denominator_definition_ref: str
    denominator_definition_hash: str
    source_ref: str
    source_hash: str
    uncertainty_derivation_ref: str
    gate_receipt_ref: str
    gate_receipt_hash: str
    direction_sign: int
    direction_vector_root: str
    cohort_size: int
    observed_count: int
    missing_count: int
    eligible_surface_set_hash: str | None
    suppressed: bool
    stale: bool
    imputed: bool
    lane_source_content_hash: str
    marginal_uncertainty_root: str

    def to_dict(self) -> dict:
        return {
            "lane": self.lane,
            "event_schema_version": self.event_schema_version,
            "event_name": self.event_name,
            "statistic_name": self.statistic_name,
            "unit": self.unit,
            "transform_id": self.transform_id,
            "distribution": self.distribution.to_dict(),
            "denominator": self.denominator,
            "transformed_p50": float(self.transformed_p50),
            "transformed_standard_error": float(self.transformed_standard_error),
            "definition_ref": self.definition_ref,
            "definition_hash": self.definition_hash,
            "denominator_definition_ref": self.denominator_definition_ref,
            "denominator_definition_hash": self.denominator_definition_hash,
            "source_ref": self.source_ref,
            "source_hash": self.source_hash,
            "uncertainty_derivation_ref": self.uncertainty_derivation_ref,
            "gate_receipt_ref": self.gate_receipt_ref,
            "gate_receipt_hash": self.gate_receipt_hash,
            "direction_sign": self.direction_sign,
            "direction_vector_root": self.direction_vector_root,
            "cohort_size": self.cohort_size,
            "observed_count": self.observed_count,
            "missing_count": self.missing_count,
            "eligible_surface_set_hash": self.eligible_surface_set_hash,
            "suppressed": self.suppressed,
            "stale": self.stale,
            "imputed": self.imputed,
            "lane_source_content_hash": self.lane_source_content_hash,
            "marginal_uncertainty_root": self.marginal_uncertainty_root,
        }


@dataclass(frozen=True)
class TrajectoryDepthContext:
    context_ref: str
    definition_ref: str
    source_ref: str
    source_hash: str
    aggregate_review_state: str
    suppression_posture: str
    caveat_refs: tuple[str, ...]
    context_root: str

    def __post_init__(self) -> None:
        safe_identity = (
            self.context_ref in VBD_TRAJECTORY_DEPTH_REFS
            and self.definition_ref == "definition:depth-context-v1"
            and self.source_ref == "source:vbd-synthetic-depth-context"
            and isinstance(self.caveat_refs, (tuple, list))
            and all(
                caveat == "caveat:depth-context-only"
                for caveat in self.caveat_refs
            )
        )
        if not safe_identity:
            return
        unavailable = self.context_ref == "depth-context:unavailable"
        expected_body = {
            "context_ref": self.context_ref,
            "definition_ref": self.definition_ref,
            "source_ref": self.source_ref,
            "source_hash": sha256_json(
                {"context_ref": self.context_ref, "synthetic": True}
            ),
            "aggregate_review_state": "unavailable" if unavailable else "reviewed",
            "suppression_posture": "unavailable" if unavailable else "available",
            "caveat_refs": ["caveat:depth-context-only"],
            "used_in_likelihood": False,
            "used_in_eligibility": False,
        }
        valid = (
            self.source_hash == expected_body["source_hash"]
            and self.aggregate_review_state
            == expected_body["aggregate_review_state"]
            and self.suppression_posture == expected_body["suppression_posture"]
            and self.caveat_refs == ("caveat:depth-context-only",)
            and self.context_root == sha256_json(expected_body)
        )
        if valid:
            return
        canonical_body = {
            "context_ref": "depth-context:unavailable",
            "definition_ref": "definition:depth-context-v1",
            "source_ref": "source:vbd-synthetic-depth-context",
            "source_hash": sha256_json(
                {"context_ref": "depth-context:unavailable", "synthetic": True}
            ),
            "aggregate_review_state": "unavailable",
            "suppression_posture": "unavailable",
            "caveat_refs": ["caveat:depth-context-only"],
            "used_in_likelihood": False,
            "used_in_eligibility": False,
        }
        for name, value in (
            ("context_ref", canonical_body["context_ref"]),
            ("definition_ref", canonical_body["definition_ref"]),
            ("source_ref", canonical_body["source_ref"]),
            ("source_hash", canonical_body["source_hash"]),
            ("aggregate_review_state", canonical_body["aggregate_review_state"]),
            ("suppression_posture", canonical_body["suppression_posture"]),
            ("caveat_refs", tuple(canonical_body["caveat_refs"])),
            ("context_root", sha256_json(canonical_body)),
        ):
            object.__setattr__(self, name, value)

    def to_dict(self) -> dict:
        return {
            "context_ref": self.context_ref,
            "definition_ref": self.definition_ref,
            "source_ref": self.source_ref,
            "source_hash": self.source_hash,
            "aggregate_review_state": self.aggregate_review_state,
            "suppression_posture": self.suppression_posture,
            "caveat_refs": list(self.caveat_refs),
            "context_root": self.context_root,
            "used_in_likelihood": False,
            "used_in_eligibility": False,
        }


def canonical_unavailable_depth_context_dict() -> dict:
    body = dict(_CANONICAL_UNAVAILABLE_DEPTH_BODY)
    body["caveat_refs"] = list(_CANONICAL_UNAVAILABLE_DEPTH_BODY["caveat_refs"])
    return {**body, "context_root": sha256_json(body)}


@dataclass(frozen=True)
class TrajectoryObservationBundle:
    schema_version: str
    workflow_id: str
    jbtd_id: str
    persona_id: str
    panel_group_index: int
    window_index: int
    window_id: str
    window_start: str
    window_end: str
    source_cutoff: str
    post: bool
    k: int
    cohort_size: int
    cohort_ref: str
    cohort_hash: str
    active_set_commitment: str
    partition_attestation_root: str
    plan_ref: str
    plan_hash: str
    direction_vector: tuple[int, int, int]
    direction_vector_root: str
    covariance_lane_order: tuple[str, str, str]
    transformed_covariance: tuple[tuple[float, float, float], ...]
    uncertainty_derivation_id: str
    quantile_algorithm_id: str
    runtime_ref: str
    source_derivation_receipt: str
    aggregate_output_hash: str
    joint_uncertainty_derivation_root: str
    bundle_source_content_root: str
    observations: tuple[PrimitiveTrajectoryObservation, ...]
    depth_context: TrajectoryDepthContext | None
    synthetic_only: bool
    aggregate_only: bool
    real_data_present: bool
    customer_data_present: bool
    production_data_present: bool
    live_data_source_present: bool

    def tuple_key(self) -> tuple[str, str, str]:
        return (self.workflow_id, self.jbtd_id, self.persona_id)

    def to_dict(self) -> dict:
        return {
            "schema_version": self.schema_version,
            "workflow_id": self.workflow_id,
            "jbtd_id": self.jbtd_id,
            "persona_id": self.persona_id,
            "panel_group_index": self.panel_group_index,
            "window_index": self.window_index,
            "window_id": self.window_id,
            "window_start": self.window_start,
            "window_end": self.window_end,
            "source_cutoff": self.source_cutoff,
            "post": self.post,
            "k": self.k,
            "cohort_size": self.cohort_size,
            "cohort_ref": self.cohort_ref,
            "cohort_hash": self.cohort_hash,
            "active_set_commitment": self.active_set_commitment,
            "partition_attestation_root": self.partition_attestation_root,
            "plan_ref": self.plan_ref,
            "plan_hash": self.plan_hash,
            "direction_vector": list(self.direction_vector),
            "direction_vector_root": self.direction_vector_root,
            "covariance_lane_order": list(self.covariance_lane_order),
            "transformed_covariance": [list(row) for row in self.transformed_covariance],
            "uncertainty_derivation_id": self.uncertainty_derivation_id,
            "quantile_algorithm_id": self.quantile_algorithm_id,
            "runtime_ref": self.runtime_ref,
            "source_derivation_receipt": self.source_derivation_receipt,
            "aggregate_output_hash": self.aggregate_output_hash,
            "joint_uncertainty_derivation_root": self.joint_uncertainty_derivation_root,
            "bundle_source_content_root": self.bundle_source_content_root,
            "observations": [observation.to_dict() for observation in self.observations],
            "depth_context": (
                canonical_unavailable_depth_context_dict()
                if self.depth_context is None
                else self.depth_context.to_dict()
            ),
            "synthetic_only": self.synthetic_only,
            "aggregate_only": self.aggregate_only,
            "real_data_present": self.real_data_present,
            "customer_data_present": self.customer_data_present,
            "production_data_present": self.production_data_present,
            "live_data_source_present": self.live_data_source_present,
        }


@dataclass(frozen=True)
class TrajectoryObservationPanel:
    schema_version: str
    panel_group_count: int
    pre_window_count: int
    post_window_count: int
    aggregate_k: int
    direction_vector: tuple[int, int, int]
    direction_vector_root: str
    reference_manifest: TrajectoryReferenceManifest
    bundles: tuple[TrajectoryObservationBundle, ...]
    lane_observation_roots: tuple[tuple[str, str], ...]
    ordered_panel_manifest_root: str
    depth_context_root: str
    cohort_partition_root: str
    model_manifest_root: str
    study_plan_root: str
    scenario_id: str
    dgp_group_correlation: float
    dgp_innovation_correlation: float
    dgp_observation_correlation: float
    seed_namespace: str
    seed: int
    generator_id: str
    rng_id: str
    seed_manifest_root: str
    synthetic_only: bool
    aggregate_only: bool
    real_data_present: bool
    customer_data_present: bool
    production_data_present: bool
    live_data_source_present: bool

    def __post_init__(self) -> None:
        if type(self.bundles) is not tuple or not self.bundles:
            return
        contexts = [
            bundle.depth_context
            for bundle in self.bundles
            if type(bundle) is TrajectoryObservationBundle
        ]
        if len(contexts) != len(self.bundles):
            return
        available = [
            type(context) is TrajectoryDepthContext
            and context.context_ref in ("depth-context:a", "depth-context:b")
            and context.aggregate_review_state == "reviewed"
            and context.suppression_posture == "available"
            for context in contexts
        ]
        if not all(available):
            object.__setattr__(
                self,
                "depth_context_root",
                VBD_TRAJECTORY_MISSING_DEPTH_CONTEXT_ROOT,
            )
            return
        roots = {context.context_root for context in contexts}
        if len(roots) == 1:
            object.__setattr__(self, "depth_context_root", next(iter(roots)))

    def to_dict(self) -> dict:
        return {
            "schema_version": self.schema_version,
            "panel_group_count": self.panel_group_count,
            "pre_window_count": self.pre_window_count,
            "post_window_count": self.post_window_count,
            "aggregate_k": self.aggregate_k,
            "direction_vector": list(self.direction_vector),
            "direction_vector_root": self.direction_vector_root,
            "reference_manifest": self.reference_manifest.to_dict(),
            "bundles": [bundle.to_dict() for bundle in self.bundles],
            "lane_observation_roots": [
                {"lane": lane, "root": root}
                for lane, root in self.lane_observation_roots
            ],
            "ordered_panel_manifest_root": self.ordered_panel_manifest_root,
            "depth_context_root": self.depth_context_root,
            "depth_context_status": (
                "available"
                if trajectory_panel_depth_context_available(self)
                else "unavailable"
            ),
            "cohort_partition_root": self.cohort_partition_root,
            "model_manifest_root": self.model_manifest_root,
            "study_plan_root": self.study_plan_root,
            "scenario_id": self.scenario_id,
            "dgp_group_correlation": self.dgp_group_correlation,
            "dgp_innovation_correlation": self.dgp_innovation_correlation,
            "dgp_observation_correlation": self.dgp_observation_correlation,
            "seed_namespace": self.seed_namespace,
            "seed": self.seed,
            "generator_id": self.generator_id,
            "rng_id": self.rng_id,
            "seed_manifest_root": self.seed_manifest_root,
            "synthetic_only": self.synthetic_only,
            "aggregate_only": self.aggregate_only,
            "real_data_present": self.real_data_present,
            "customer_data_present": self.customer_data_present,
            "production_data_present": self.production_data_present,
            "live_data_source_present": self.live_data_source_present,
        }


def reference_manifest_hash(entries: Iterable[TrajectoryReferenceEntry]) -> str:
    return sha256_json([entry.to_dict() for entry in entries])


def validate_reference_manifest(manifest: TrajectoryReferenceManifest) -> None:
    if type(manifest) is not TrajectoryReferenceManifest:
        raise TrajectoryStructureError("reference manifest has an unsupported type")
    if type(manifest.entries) is not tuple or not manifest.entries:
        raise TrajectoryStructureError("reference manifest must not be empty")
    refs: set[str] = set()
    for entry in manifest.entries:
        if type(entry) is not TrajectoryReferenceEntry:
            raise TrajectoryStructureError(
                "reference manifest entry has an unsupported type"
            )
        _ref(entry.ref, "reference_manifest.ref")
        _safe_id(entry.field_role, "reference_manifest.field_role")
        _safe_id(entry.owner_role, "reference_manifest.owner_role")
        _ref(entry.source_definition_ref, "reference_manifest.source_definition_ref")
        _sha256(entry.bound_content_hash, "reference_manifest.bound_content_hash")
        if entry.ref in refs:
            raise TrajectoryStructureError("reference manifest contains duplicate refs")
        refs.add(entry.ref)
        if entry.aggregate_only is not True:
            raise TrajectoryStructureError("reference manifest entries must be aggregate-only")
        if (
            type(entry.blocked_uses) is not tuple
            or entry.blocked_uses != VBD_TRAJECTORY_BLOCKED_USES
        ):
            raise TrajectoryStructureError("reference manifest blocked uses drifted")
    if manifest.manifest_hash != reference_manifest_hash(manifest.entries):
        raise TrajectoryStructureError("reference manifest hash drifted")


def expected_synthetic_cohort_hash(panel_group_index: int, aggregate_k: int) -> str:
    cohort_ref = f"cohort:vbd-synthetic-g{panel_group_index:02d}"
    return sha256_json(
        {
            "cohort_ref": cohort_ref,
            "tuple_key": [
                f"workflow-vbd-{panel_group_index:02d}",
                "jbtd-vbd-trajectory",
                "persona-vbd-synthetic",
            ],
            "aggregate_k": aggregate_k,
        }
    )


def _reference_spec_for_plan_ref(
    plan_ref: str,
) -> dict[str, tuple[str, str]]:
    if plan_ref == VBD_TRAJECTORY_SMOKE_PLAN_REF:
        return dict(VBD_TRAJECTORY_REFERENCE_SPEC)
    if plan_ref != VBD_TRAJECTORY_VALIDATION_PLAN_REF:
        raise TrajectoryStructureError("reference manifest study plan is off plan")
    return {
        (
            VBD_TRAJECTORY_VALIDATION_PLAN_REF
            if ref_value == VBD_TRAJECTORY_SMOKE_PLAN_REF
            else ref_value
        ): semantics
        for ref_value, semantics in VBD_TRAJECTORY_REFERENCE_SPEC.items()
    }


def _manifest_study_plan_ref(manifest: TrajectoryReferenceManifest) -> str:
    plan_refs = tuple(
        entry.ref for entry in manifest.entries if entry.field_role == "study_plan"
    )
    if len(plan_refs) != 1:
        raise TrajectoryStructureError(
            "reference manifest must bind exactly one study plan"
        )
    plan_ref = plan_refs[0]
    _reference_spec_for_plan_ref(plan_ref)
    return plan_ref


def validate_synthetic_reference_manifest(
    manifest: TrajectoryReferenceManifest,
    *,
    aggregate_k: int,
) -> int:
    """Validate the complete frozen manifest and return its panel-group count."""

    validate_reference_manifest(manifest)
    entries = manifest.by_ref()
    plan_ref = _manifest_study_plan_ref(manifest)
    reference_spec = _reference_spec_for_plan_ref(plan_ref)
    static_refs = set(reference_spec)
    cohort_refs = sorted(ref for ref in entries if ref.startswith("cohort:"))
    expected_group_count = len(cohort_refs)
    if expected_group_count not in VBD_TRAJECTORY_PANEL_GROUP_COUNTS:
        raise TrajectoryStructureError("reference manifest cohort count is off plan")
    expected_cohort_refs = [
        f"cohort:vbd-synthetic-g{group:02d}"
        for group in range(expected_group_count)
    ]
    expected_ref_order = list(reference_spec) + expected_cohort_refs
    if [entry.ref for entry in manifest.entries] != expected_ref_order:
        raise TrajectoryStructureError("reference manifest order drifted")
    if cohort_refs != expected_cohort_refs or set(entries) != static_refs | set(
        expected_cohort_refs
    ):
        raise TrajectoryStructureError("reference manifest ref set drifted")
    for ref_value, (expected_role, expected_source_definition) in (
        reference_spec.items()
    ):
        entry = entries[ref_value]
        if (
            entry.field_role != expected_role
            or entry.source_definition_ref != expected_source_definition
            or entry.owner_role != "synthetic_generator"
        ):
            raise TrajectoryStructureError("reference manifest semantic role drifted")
        if ref_value != plan_ref:
            expected_bound_hash = expected_static_reference_content_hash(
                ref_value, expected_role, expected_source_definition
            )
            if entry.bound_content_hash != expected_bound_hash:
                raise TrajectoryStructureError(
                    "reference manifest content hash drifted"
                )
    cohort_hashes: set[str] = set()
    for group, cohort_ref in enumerate(expected_cohort_refs):
        entry = entries[cohort_ref]
        if (
            entry.field_role != "cohort"
            or entry.source_definition_ref
            != "definition:synthetic-known-aggregate-uncertainty-v1"
            or entry.owner_role != "synthetic_generator"
        ):
            raise TrajectoryStructureError("reference manifest cohort role drifted")
        expected_hash = expected_synthetic_cohort_hash(group, aggregate_k)
        if entry.bound_content_hash != expected_hash:
            raise TrajectoryStructureError("reference manifest cohort hash drifted")
        cohort_hashes.add(entry.bound_content_hash)
    if len(cohort_hashes) != expected_group_count:
        raise TrajectoryStructureError("reference manifest cohort hashes must be unique")
    return expected_group_count


def _require_manifest_role(
    manifest: TrajectoryReferenceManifest,
    ref_value: str,
    expected_role: str,
    name: str,
) -> None:
    entry = manifest.by_ref().get(_ref(ref_value, name))
    if entry is None or entry.field_role != expected_role:
        raise TrajectoryStructureError(f"{name} is not allowlisted for {expected_role}")


def _manifest_entry(
    manifest: TrajectoryReferenceManifest,
    ref_value: str,
) -> TrajectoryReferenceEntry:
    entry = manifest.by_ref().get(ref_value)
    if entry is None:
        raise TrajectoryStructureError("reference is not present in the immutable manifest")
    return entry


def primitive_lane_source_content_body(observation: PrimitiveTrajectoryObservation) -> dict:
    body = observation.to_dict()
    body.pop("lane_source_content_hash", None)
    body.pop("marginal_uncertainty_root", None)
    return body


def primitive_lane_source_content_hash(observation: PrimitiveTrajectoryObservation) -> str:
    return sha256_json(primitive_lane_source_content_body(observation))


def primitive_marginal_uncertainty_root(
    observation: PrimitiveTrajectoryObservation,
    joint_uncertainty_derivation_root: str,
) -> str:
    return sha256_json(
        {
            "lane": observation.lane,
            "lane_source_content_hash": observation.lane_source_content_hash,
            "transformed_standard_error": float(observation.transformed_standard_error),
            "joint_uncertainty_derivation_root": joint_uncertainty_derivation_root,
            "covariance_lane_order": list(VBD_TRAJECTORY_COVARIANCE_LANE_ORDER),
        }
    )


def expected_gate_receipt_hash(
    bundle: TrajectoryObservationBundle,
    observation: PrimitiveTrajectoryObservation,
) -> str:
    return sha256_json(
        {
            "tuple_key": list(bundle.tuple_key()),
            "window_id": bundle.window_id,
            "source_cutoff": bundle.source_cutoff,
            "lane": observation.lane,
            "gate_receipt_ref": observation.gate_receipt_ref,
            "plan_hash": bundle.plan_hash,
            "suppressed": observation.suppressed,
            "stale": observation.stale,
            "imputed": observation.imputed,
        }
    )


def synthetic_lane_source_hash_body(
    bundle: TrajectoryObservationBundle,
    observation: PrimitiveTrajectoryObservation,
) -> dict:
    return {
        "tuple_key": list(bundle.tuple_key()),
        "window_id": bundle.window_id,
        "event_schema_version": observation.event_schema_version,
        "event_name": observation.event_name,
        "lane": observation.lane,
        "statistic_name": observation.statistic_name,
        "unit": observation.unit,
        "distribution": observation.distribution.to_dict(),
        "denominator": observation.denominator,
        "definition_hash": observation.definition_hash,
        "denominator_definition_hash": observation.denominator_definition_hash,
        "transformed_p50": float(observation.transformed_p50),
        "raw_transformed_se": float(observation.transformed_standard_error),
        "observed_count": observation.observed_count,
        "missing_count": observation.missing_count,
        "eligible_surface_set_hash": observation.eligible_surface_set_hash,
        "gate_receipt_hash": observation.gate_receipt_hash,
    }


def aggregate_output_hash_body(bundle: TrajectoryObservationBundle) -> dict:
    return {
        "tuple_key": list(bundle.tuple_key()),
        "panel_group_index": bundle.panel_group_index,
        "window": {
            "index": bundle.window_index,
            "id": bundle.window_id,
            "start": bundle.window_start,
            "end": bundle.window_end,
            "source_cutoff": bundle.source_cutoff,
        },
        "k": bundle.k,
        "cohort_size": bundle.cohort_size,
        "cohort_ref": bundle.cohort_ref,
        "cohort_hash": bundle.cohort_hash,
        "active_set_commitment": bundle.active_set_commitment,
        "plan_ref": bundle.plan_ref,
        "plan_hash": bundle.plan_hash,
        "direction_vector": list(bundle.direction_vector),
        "direction_vector_root": bundle.direction_vector_root,
        "uncertainty_derivation_id": bundle.uncertainty_derivation_id,
        "quantile_algorithm_id": bundle.quantile_algorithm_id,
        "runtime_ref": bundle.runtime_ref,
        "covariance_lane_order": list(bundle.covariance_lane_order),
        "transformed_covariance": [list(row) for row in bundle.transformed_covariance],
        "observations": [
            primitive_lane_source_content_body(observation)
            for observation in bundle.observations
        ],
        "synthetic_only": bundle.synthetic_only,
        "aggregate_only": bundle.aggregate_only,
    }


def expected_synthetic_source_derivation_receipt(bundle: TrajectoryObservationBundle) -> str:
    # Synthetic-only stand-in for the source-held secret. It is deliberately
    # excluded from every record and is never valid for real-source admission.
    synthetic_secret = hashlib.sha256(
        sha256_json(
            {
                "purpose": "vbd-synthetic-receipt-secret-v1",
                "tuple_key": list(bundle.tuple_key()),
                "window_id": bundle.window_id,
                "plan_hash": bundle.plan_hash,
            }
        ).encode("ascii")
    ).digest()
    return hmac.new(
        synthetic_secret,
        f"{bundle.aggregate_output_hash}|vbd-receipt-v1".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def expected_joint_uncertainty_root(bundle: TrajectoryObservationBundle) -> str:
    return sha256_json(
        {
            "source_derivation_receipt": bundle.source_derivation_receipt,
            "uncertainty_derivation_id": bundle.uncertainty_derivation_id,
            "runtime_ref": bundle.runtime_ref,
            "derivation_sample_count": None,
            "covariance_lane_order": list(bundle.covariance_lane_order),
            "transformed_covariance": [list(row) for row in bundle.transformed_covariance],
            "transformed_standard_errors": [
                float(observation.transformed_standard_error)
                for observation in bundle.observations
            ],
        }
    )


def expected_bundle_source_content_root(bundle: TrajectoryObservationBundle) -> str:
    return sha256_json(
        {
            "source_derivation_receipt": bundle.source_derivation_receipt,
            "tuple_key": list(bundle.tuple_key()),
            "window_id": bundle.window_id,
            "ordered_lane_child_roots": [
                observation.marginal_uncertainty_root
                for observation in bundle.observations
            ],
            "joint_uncertainty_derivation_root": bundle.joint_uncertainty_derivation_root,
        }
    )


def validate_trajectory_covariance(
    covariance: object,
    lane_standard_errors: tuple[float, float, float],
) -> np.ndarray:
    if type(covariance) is not tuple or len(covariance) != 3:
        raise TrajectoryCovarianceError("required_covariance_presence", "covariance must be a 3x3 tuple")
    if any(type(row) is not tuple or len(row) != 3 for row in covariance):
        raise TrajectoryCovarianceError("required_covariance_presence", "covariance must be a 3x3 tuple")
    try:
        matrix = np.asarray(
            [[_finite(value, "covariance value") for value in row] for row in covariance],
            dtype=float,
        )
    except TrajectoryStructureError as exc:
        raise TrajectoryCovarianceError("required_covariance_presence", str(exc)) from exc
    scale = max(1.0, float(np.max(np.abs(matrix))))
    if float(np.max(np.abs(matrix - matrix.T))) > 1e-12 * scale:
        raise TrajectoryCovarianceError("covariance_symmetry", "covariance is not symmetric")
    expected_diagonal = np.square(
        np.asarray(
            [_finite(value, "lane standard error", positive=True) for value in lane_standard_errors]
        )
    )
    if float(np.max(np.abs(np.diag(matrix) - expected_diagonal))) > 1e-12 * scale:
        raise TrajectoryCovarianceError(
            "covariance_diagonal_consistency",
            "covariance diagonal does not match marginal standard errors",
        )
    minimum_eigenvalue = float(np.linalg.eigvalsh(matrix).min())
    if minimum_eigenvalue < -1e-10 * scale:
        raise TrajectoryCovarianceError("covariance_positive_semidefinite", "covariance is not positive semidefinite")
    return matrix


def _validate_covariance_presence(covariance: object) -> None:
    if type(covariance) is not tuple or len(covariance) != 3:
        raise TrajectoryCovarianceError(
            "required_covariance_presence", "covariance must be a 3x3 tuple"
        )
    if any(type(row) is not tuple or len(row) != 3 for row in covariance):
        raise TrajectoryCovarianceError(
            "required_covariance_presence", "covariance must be a 3x3 tuple"
        )
    for row in covariance:
        for value in row:
            try:
                _finite(value, "covariance value")
            except TrajectoryStructureError as exc:
                raise TrajectoryCovarianceError(
                    "required_covariance_presence", str(exc)
                ) from exc


def _validate_distribution(
    observation: PrimitiveTrajectoryObservation,
) -> None:
    if type(observation.distribution) is not PrimitiveDistribution:
        raise TrajectoryStructureError("primitive distribution has an unsupported type")
    values = observation.distribution.values()
    denominator = observation.denominator
    expected_denominator = VBD_TRAJECTORY_DENOMINATORS.get(observation.lane)
    if observation.lane == "frequency":
        if denominator is not None or any(value < 0.0 for value in values):
            raise TrajectoryStructureError("frequency distribution is outside its domain")
    else:
        if denominator != expected_denominator:
            raise TrajectoryStructureError(
                f"{observation.lane} denominator drifted from the frozen definition"
            )
        bound = _strict_int(denominator, f"{observation.lane} denominator", minimum=1)
        if any(value < 0.0 or value > bound for value in values):
            raise TrajectoryStructureError(f"{observation.lane} distribution is outside its domain")
        if not 0.0 < values[1] < bound:
            raise TrajectoryStructureError(f"{observation.lane} p50 is at a nonregular boundary")
    if tuple(sorted(values)) != values:
        raise TrajectoryStructureError(f"{observation.lane} distribution must be ordered")
    expected = transform_trajectory_value(observation.lane, values[1], denominator)
    if not math.isclose(expected, observation.transformed_p50, rel_tol=1e-12, abs_tol=1e-12):
        raise TrajectoryStructureError(f"{observation.lane} transformed p50 drifted")
    scale = VBD_TRAJECTORY_RAW_SCALES[observation.lane]
    for quantile, actual in zip(VBD_TRAJECTORY_PERCENTILES, values):
        transformed_quantile = observation.transformed_p50 + (
            scale * VBD_TRAJECTORY_QUANTILE_DELTAS[quantile]
        )
        if observation.lane == "frequency":
            expected_quantile = math.expm1(transformed_quantile)
        else:
            if not 0.0 < transformed_quantile < math.pi / 2.0:
                raise TrajectoryStructureError(
                    f"{observation.lane} synthetic quantile left its regular domain"
                )
            expected_quantile = float(
                expected_denominator * math.sin(transformed_quantile) ** 2
            )
        if not math.isclose(
            actual, expected_quantile, rel_tol=1e-12, abs_tol=1e-12
        ):
            raise TrajectoryStructureError(
                f"{observation.lane} synthetic quantile formula drifted"
            )


def validate_primitive_observation(
    observation: PrimitiveTrajectoryObservation,
    manifest: TrajectoryReferenceManifest,
    *,
    expected_k: int,
    expected_direction_root: str,
    joint_uncertainty_derivation_root: str,
) -> None:
    if type(observation) is not PrimitiveTrajectoryObservation:
        raise TrajectoryStructureError("primitive observation has an unsupported type")
    for name, value in (
        ("lane", observation.lane),
        ("event_schema_version", observation.event_schema_version),
        ("event_name", observation.event_name),
        ("statistic_name", observation.statistic_name),
        ("unit", observation.unit),
        ("transform_id", observation.transform_id),
    ):
        _safe_id(value, f"observation {name}")
    if observation.lane not in VBD_TRAJECTORY_LANES:
        raise TrajectoryStructureError("observation has an unsupported lane")
    if observation.event_schema_version != VBD_TRAJECTORY_EVENT_SCHEMA_VERSION:
        raise TrajectoryStructureError("observation event schema identity drifted")
    if observation.event_name != VBD_TRAJECTORY_EVENTS[observation.lane]:
        raise TrajectoryStructureError("observation event identity drifted")
    if observation.statistic_name != VBD_TRAJECTORY_STATISTICS[observation.lane]:
        raise TrajectoryStructureError("observation statistic identity drifted")
    if observation.unit != VBD_TRAJECTORY_UNITS[observation.lane]:
        raise TrajectoryStructureError("observation unit drifted")
    if observation.transform_id != VBD_TRAJECTORY_TRANSFORMS[observation.lane]:
        raise TrajectoryStructureError("observation transform drifted")
    _validate_distribution(observation)
    _finite(observation.transformed_standard_error, "transformed standard error", positive=True)
    _sha256(observation.definition_hash, "definition_hash")
    _sha256(observation.denominator_definition_hash, "denominator_definition_hash")
    _sha256(observation.source_hash, "source_hash")
    _sha256(observation.gate_receipt_hash, "gate_receipt_hash")
    _sha256(observation.direction_vector_root, "direction_vector_root")
    _sha256(observation.lane_source_content_hash, "lane_source_content_hash")
    _sha256(observation.marginal_uncertainty_root, "marginal_uncertainty_root")
    _require_manifest_role(manifest, observation.definition_ref, f"{observation.lane}_definition", "definition_ref")
    _require_manifest_role(
        manifest,
        observation.denominator_definition_ref,
        f"{observation.lane}_denominator_definition",
        "denominator_definition_ref",
    )
    _require_manifest_role(manifest, observation.source_ref, f"{observation.lane}_source", "source_ref")
    _require_manifest_role(manifest, observation.uncertainty_derivation_ref, "uncertainty_derivation", "uncertainty_derivation_ref")
    _require_manifest_role(manifest, observation.gate_receipt_ref, "gate_receipt", "gate_receipt_ref")
    if observation.definition_hash != _manifest_entry(
        manifest, observation.definition_ref
    ).bound_content_hash:
        raise TrajectoryStructureError("observation definition hash drifted")
    if observation.denominator_definition_hash != _manifest_entry(
        manifest, observation.denominator_definition_ref
    ).bound_content_hash:
        raise TrajectoryStructureError("observation denominator definition hash drifted")
    if type(observation.direction_sign) is not int or observation.direction_sign not in (-1, 1):
        raise TrajectoryStructureError("direction sign must be -1 or +1")
    if observation.direction_vector_root != expected_direction_root:
        raise TrajectoryStructureError("observation direction root drifted")
    if _strict_int(observation.cohort_size, "observation cohort_size") != expected_k:
        raise TrajectoryStructureError("observation cohort_size must equal bundle k")
    if _strict_int(observation.observed_count, "observation observed_count") != expected_k:
        raise TrajectoryStructureError("observation observed_count must equal bundle k")
    if _strict_int(observation.missing_count, "observation missing_count") != 0:
        raise TrajectoryStructureError("observation missing_count must be zero")
    if observation.lane == "breadth":
        if observation.eligible_surface_set_hash != vbd_eligible_surface_set_hash():
            raise TrajectoryStructureError("eligible surface-set commitment drifted")
    elif observation.eligible_surface_set_hash is not None:
        raise TrajectoryStructureError("eligible surface-set commitment is breadth-only")
    for name, value in (
        ("suppressed", observation.suppressed),
        ("stale", observation.stale),
        ("imputed", observation.imputed),
    ):
        _strict_bool(value, f"observation {name}")
    if observation.suppressed or observation.stale or observation.imputed:
        raise TrajectoryStructureError("suppressed, stale, or imputed observations cannot enter a fit")
    if observation.lane_source_content_hash != primitive_lane_source_content_hash(observation):
        raise TrajectoryStructureError("lane source-content hash drifted")
    expected_root = primitive_marginal_uncertainty_root(
        observation, joint_uncertainty_derivation_root
    )
    if observation.marginal_uncertainty_root != expected_root:
        raise TrajectoryStructureError("marginal uncertainty root drifted")


def _validate_depth_context(
    depth_context: TrajectoryDepthContext | None,
    manifest: TrajectoryReferenceManifest,
) -> tuple[str, str | None, bool]:
    if depth_context is None:
        return (
            "depth-context:unavailable",
            None,
            False,
        )
    if type(depth_context) is not TrajectoryDepthContext:
        raise TrajectoryStructureError("Depth context must be nonnumeric governed metadata")
    if depth_context.context_ref not in VBD_TRAJECTORY_DEPTH_REFS:
        raise TrajectoryStructureError("Depth context ref is not allowlisted")
    _require_manifest_role(manifest, depth_context.context_ref, "depth_context", "depth context ref")
    _require_manifest_role(manifest, depth_context.definition_ref, "depth_definition", "Depth definition ref")
    _require_manifest_role(manifest, depth_context.source_ref, "depth_source", "Depth source ref")
    if (
        type(depth_context.source_hash) is not str
        or not _SHA256_RE.fullmatch(depth_context.source_hash)
    ):
        raise TrajectoryStructureError(
            "invalid Depth context must be canonical unavailable metadata"
        )
    expected_source_hash = sha256_json(
        {"context_ref": depth_context.context_ref, "synthetic": True}
    )
    if depth_context.source_hash != expected_source_hash:
        raise TrajectoryStructureError(
            "invalid Depth context must be canonical unavailable metadata"
        )
    unavailable = depth_context.context_ref == "depth-context:unavailable"
    _safe_id(depth_context.aggregate_review_state, "Depth aggregate_review_state")
    _safe_id(depth_context.suppression_posture, "Depth suppression_posture")
    expected_review_state = "unavailable" if unavailable else "reviewed"
    expected_suppression_posture = "unavailable" if unavailable else "available"
    if depth_context.aggregate_review_state != expected_review_state:
        raise TrajectoryStructureError(
            "invalid Depth context must be canonical unavailable metadata"
        )
    if depth_context.suppression_posture != expected_suppression_posture:
        raise TrajectoryStructureError(
            "invalid Depth context must be canonical unavailable metadata"
        )
    if type(depth_context.caveat_refs) is not tuple:
        raise TrajectoryStructureError(
            "invalid Depth context must be canonical unavailable metadata"
        )
    for caveat in depth_context.caveat_refs:
        _require_manifest_role(manifest, caveat, "depth_caveat", "Depth caveat ref")
    if depth_context.caveat_refs != ("caveat:depth-context-only",):
        raise TrajectoryStructureError(
            "invalid Depth context must be canonical unavailable metadata"
        )
    expected = sha256_json(
        {
            "context_ref": depth_context.context_ref,
            "definition_ref": depth_context.definition_ref,
            "source_ref": depth_context.source_ref,
            "source_hash": depth_context.source_hash,
            "aggregate_review_state": depth_context.aggregate_review_state,
            "suppression_posture": depth_context.suppression_posture,
            "caveat_refs": list(depth_context.caveat_refs),
            "used_in_likelihood": False,
            "used_in_eligibility": False,
        }
    )
    if depth_context.context_root != expected:
        raise TrajectoryStructureError(
            "invalid Depth context must be canonical unavailable metadata"
        )
    return depth_context.context_ref, depth_context.context_root, not unavailable


def trajectory_panel_depth_context_available(
    panel: TrajectoryObservationPanel,
) -> bool:
    """Return the nonauthorizing context status; it never enters fit eligibility."""

    statuses = [
        _validate_depth_context(bundle.depth_context, panel.reference_manifest)[2]
        for bundle in panel.bundles
    ]
    return bool(statuses) and all(statuses)


def validate_trajectory_bundle(
    bundle: TrajectoryObservationBundle,
    manifest: TrajectoryReferenceManifest,
) -> None:
    if type(bundle) is not TrajectoryObservationBundle:
        raise TrajectoryStructureError("trajectory bundle has an unsupported type")
    validate_vbd_trajectory_runtime()
    validate_reference_manifest(manifest)
    if bundle.schema_version != VBD_TRAJECTORY_SCHEMA_VERSION:
        raise TrajectoryStructureError("trajectory bundle schema version drifted")
    _safe_id(bundle.schema_version, "bundle schema_version")
    _safe_id(bundle.workflow_id, "workflow_id")
    _safe_id(bundle.jbtd_id, "jbtd_id")
    _safe_id(bundle.persona_id, "persona_id")
    group_index = _strict_int(bundle.panel_group_index, "panel_group_index")
    if bundle.workflow_id != f"workflow-vbd-{group_index:02d}":
        raise TrajectoryStructureError("workflow_id is outside the frozen slice manifest")
    if bundle.jbtd_id != "jbtd-vbd-trajectory":
        raise TrajectoryStructureError("jbtd_id is outside the frozen slice manifest")
    if bundle.persona_id != "persona-vbd-synthetic":
        raise TrajectoryStructureError("persona_id is outside the frozen slice manifest")
    window_index = _strict_int(bundle.window_index, "window_index")
    if bundle.window_id != f"w{window_index:02d}":
        raise TrajectoryStructureError("window id is off plan")
    expected_start, expected_end = trajectory_window_bounds(window_index)
    if (bundle.window_start, bundle.window_end) != (expected_start, expected_end):
        raise TrajectoryStructureError("window schedule drifted")
    if bundle.source_cutoff != expected_end:
        raise TrajectoryStructureError("source cutoff must equal the half-open window end")
    _strict_bool(bundle.post, "bundle post")
    if bundle.post is not (window_index >= VBD_TRAJECTORY_PRE_WINDOW_COUNT):
        raise TrajectoryStructureError("post indicator drifted")
    k = _strict_int(bundle.k, "bundle k", minimum=1)
    if _strict_int(bundle.cohort_size, "bundle cohort_size") != k:
        raise TrajectoryStructureError("bundle cohort_size must equal k")
    manifest_group_count = validate_synthetic_reference_manifest(
        manifest, aggregate_k=k
    )
    if group_index >= manifest_group_count:
        raise TrajectoryStructureError("panel group index is outside the manifest")
    _require_manifest_role(manifest, bundle.cohort_ref, "cohort", "cohort_ref")
    _require_manifest_role(manifest, bundle.plan_ref, "study_plan", "plan_ref")
    if bundle.cohort_ref != f"cohort:vbd-synthetic-g{group_index:02d}":
        raise TrajectoryStructureError("cohort ref drifted from the panel group")
    if bundle.cohort_hash != _manifest_entry(manifest, bundle.cohort_ref).bound_content_hash:
        raise TrajectoryStructureError("cohort hash drifted from the reference manifest")
    if bundle.cohort_hash != expected_synthetic_cohort_hash(group_index, k):
        raise TrajectoryStructureError("cohort hash drifted from deterministic content")
    if bundle.plan_hash != _manifest_entry(manifest, bundle.plan_ref).bound_content_hash:
        raise TrajectoryStructureError("plan hash drifted from the reference manifest")
    for name, value in (
        ("cohort_hash", bundle.cohort_hash),
        ("active_set_commitment", bundle.active_set_commitment),
        ("partition_attestation_root", bundle.partition_attestation_root),
        ("plan_hash", bundle.plan_hash),
        ("direction_vector_root", bundle.direction_vector_root),
        ("source_derivation_receipt", bundle.source_derivation_receipt),
        ("aggregate_output_hash", bundle.aggregate_output_hash),
        ("joint_uncertainty_derivation_root", bundle.joint_uncertainty_derivation_root),
        ("bundle_source_content_root", bundle.bundle_source_content_root),
    ):
        _sha256(value, name)
    if (
        type(bundle.direction_vector) is not tuple
        or len(bundle.direction_vector) != 3
        or any(type(value) is not int or value not in (-1, 1) for value in bundle.direction_vector)
    ):
        raise TrajectoryStructureError("direction vector must contain three -1/+1 values")
    expected_direction_root = sha256_json(
        {
            "lane_order": list(VBD_TRAJECTORY_LANES),
            "direction_vector": list(bundle.direction_vector),
            "plan_ref": bundle.plan_ref,
        }
    )
    if bundle.direction_vector_root != expected_direction_root:
        raise TrajectoryStructureError("direction vector root drifted")
    if bundle.uncertainty_derivation_id != VBD_TRAJECTORY_SYNTHETIC_DERIVATION:
        raise TrajectoryStructureError(
            "only direct synthetic known aggregate uncertainty can enter preparation"
        )
    _safe_id(bundle.uncertainty_derivation_id, "uncertainty_derivation_id")
    _safe_id(bundle.quantile_algorithm_id, "quantile_algorithm_id")
    _ref(bundle.runtime_ref, "bundle runtime_ref")
    if bundle.quantile_algorithm_id != VBD_TRAJECTORY_QUANTILE_ALGORITHM:
        raise TrajectoryStructureError("quantile algorithm identity drifted")
    if bundle.runtime_ref != VBD_TRAJECTORY_RUNTIME_REF:
        raise TrajectoryStructureError("bundle runtime identity drifted")
    _require_manifest_role(
        manifest, bundle.runtime_ref, "runtime", "bundle runtime_ref"
    )
    if type(bundle.observations) is not tuple or len(bundle.observations) != 3 or tuple(
        observation.lane for observation in bundle.observations
    ) != VBD_TRAJECTORY_LANES:
        raise TrajectoryStructureError("bundle must contain exactly three canonical lanes")
    for observation in bundle.observations:
        _validate_distribution(observation)
    _validate_covariance_presence(bundle.transformed_covariance)
    if (
        type(bundle.covariance_lane_order) is not tuple
        or bundle.covariance_lane_order != VBD_TRAJECTORY_COVARIANCE_LANE_ORDER
    ):
        raise TrajectoryCovarianceError("covariance_lane_order", "covariance lane order drifted")
    validate_trajectory_covariance(
        bundle.transformed_covariance,
        tuple(observation.transformed_standard_error for observation in bundle.observations),
    )
    expected_active_set = sha256_json(
        {
            "cohort_ref": bundle.cohort_ref,
            "active_set": "fixed-across-windows",
            "aggregate_k": bundle.k,
        }
    )
    if bundle.active_set_commitment != expected_active_set:
        raise TrajectoryStructureError("active-set commitment drifted")
    for observation in bundle.observations:
        if observation.gate_receipt_hash != expected_gate_receipt_hash(
            bundle, observation
        ):
            raise TrajectoryStructureError("independent gate receipt hash drifted")
        expected_source_hash = sha256_json(
            synthetic_lane_source_hash_body(bundle, observation)
        )
        if observation.source_hash != expected_source_hash:
            raise TrajectoryStructureError("synthetic lane source hash drifted")
    if bundle.aggregate_output_hash != sha256_json(aggregate_output_hash_body(bundle)):
        raise TrajectoryStructureError("aggregate output hash drifted")
    if bundle.source_derivation_receipt != expected_synthetic_source_derivation_receipt(bundle):
        raise TrajectoryStructureError("synthetic source derivation receipt drifted")
    if bundle.joint_uncertainty_derivation_root != expected_joint_uncertainty_root(bundle):
        raise TrajectoryStructureError("joint uncertainty derivation root drifted")
    for lane_index, observation in enumerate(bundle.observations):
        if observation.direction_sign != bundle.direction_vector[lane_index]:
            raise TrajectoryStructureError("lane direction component drifted")
        validate_primitive_observation(
            observation,
            manifest,
            expected_k=k,
            expected_direction_root=bundle.direction_vector_root,
            joint_uncertainty_derivation_root=bundle.joint_uncertainty_derivation_root,
        )
    if bundle.bundle_source_content_root != expected_bundle_source_content_root(bundle):
        raise TrajectoryStructureError("bundle source-content root drifted")
    _validate_depth_context(bundle.depth_context, manifest)
    _strict_bool(bundle.synthetic_only, "bundle synthetic_only")
    _strict_bool(bundle.aggregate_only, "bundle aggregate_only")
    if bundle.synthetic_only is not True or bundle.aggregate_only is not True:
        raise TrajectoryStructureError("trajectory bundles must be synthetic-only and aggregate-only")
    for name, value in (
        ("real_data_present", bundle.real_data_present),
        ("customer_data_present", bundle.customer_data_present),
        ("production_data_present", bundle.production_data_present),
        ("live_data_source_present", bundle.live_data_source_present),
    ):
        _strict_bool(value, f"bundle {name}")
    if (
        bundle.real_data_present
        or bundle.customer_data_present
        or bundle.production_data_present
        or bundle.live_data_source_present
    ):
        raise TrajectoryStructureError("real, customer, production, or live data is prohibited")
    if group_index >= max(VBD_TRAJECTORY_PANEL_GROUP_COUNTS):
        raise TrajectoryStructureError("panel group index is off plan")
    _assert_no_forbidden_keys(bundle.to_dict())


def _expected_lane_observation_roots(
    bundles: tuple[TrajectoryObservationBundle, ...],
) -> tuple[tuple[str, str], ...]:
    return tuple(
        (
            lane,
            sha256_json(
                [
                    bundle.observations[VBD_TRAJECTORY_LANES.index(lane)].marginal_uncertainty_root
                    for bundle in bundles
                ]
            ),
        )
        for lane in VBD_TRAJECTORY_LANES
    )


def expected_ordered_panel_manifest_root(panel: TrajectoryObservationPanel) -> str:
    return sha256_json(
        {
            "panel_group_count": panel.panel_group_count,
            "pre_window_count": panel.pre_window_count,
            "post_window_count": panel.post_window_count,
            "aggregate_k": panel.aggregate_k,
            "direction_vector_root": panel.direction_vector_root,
            "reference_manifest_hash": panel.reference_manifest.manifest_hash,
            "cohort_partition_root": panel.cohort_partition_root,
            "model_manifest_root": panel.model_manifest_root,
            "study_plan_root": panel.study_plan_root,
            "scenario_id": panel.scenario_id,
            "dgp_group_correlation": panel.dgp_group_correlation,
            "dgp_innovation_correlation": panel.dgp_innovation_correlation,
            "dgp_observation_correlation": panel.dgp_observation_correlation,
            "seed_manifest_root": panel.seed_manifest_root,
            "generator_id": panel.generator_id,
            "rng_id": panel.rng_id,
            "ordered_bundle_roots": [
                bundle.bundle_source_content_root for bundle in panel.bundles
            ],
            "lane_observation_roots": [
                {"lane": lane, "root": root}
                for lane, root in panel.lane_observation_roots
            ],
        }
    )


def _validation_slot_and_plan_hash(seed: int):
    from .vbd_trajectory_validation_plan import (
        immutable_vbd_trajectory_validation_plan,
        required_vbd_trajectory_validation_slots,
    )

    matches = tuple(
        slot for slot in required_vbd_trajectory_validation_slots() if slot.seed == seed
    )
    if len(matches) != 1:
        raise TrajectoryStructureError(
            "validation seed does not resolve one unique compiled slot"
        )
    return matches[0], immutable_vbd_trajectory_validation_plan().plan_hash


def _validation_panel_scenario_id(slot) -> str:
    return f"{slot.family}_{slot.scenario_or_control_id}".replace("=", "_")


def validate_trajectory_lane_window_manifest(
    keys: tuple[tuple[int, str, int], ...], *, panel_group_count: int
) -> None:
    """Validate the exact lane/window universe admitted by panel preparation."""

    if type(keys) is not tuple or type(panel_group_count) is not int:
        raise TrajectoryStructureError("lane/window manifest is malformed")
    if any(
        type(key) is not tuple
        or len(key) != 3
        or type(key[0]) is not int
        or key[1] not in VBD_TRAJECTORY_LANES
        or type(key[2]) is not int
        for key in keys
    ):
        raise TrajectoryStructureError("lane/window manifest is malformed")
    if len(set(keys)) != len(keys):
        raise TrajectoryStructureError("lane/window key is duplicated")

    grouped: dict[tuple[int, str], set[int]] = {}
    for group, lane, window in keys:
        grouped.setdefault((group, lane), set()).add(window)
    for group in range(panel_group_count):
        lane_sets = [
            grouped.get((group, lane), set()) for lane in VBD_TRAJECTORY_LANES
        ]
        if not all(value == lane_sets[0] for value in lane_sets[1:]):
            raise TrajectoryStructureError("lane windows are misaligned")

    windows = tuple(window for _, _, window in keys)
    if VBD_TRAJECTORY_TOTAL_WINDOW_COUNT in windows:
        raise TrajectoryStructureError("fit input contains a lookahead window")
    if any(
        window < 0 or window >= VBD_TRAJECTORY_TOTAL_WINDOW_COUNT
        for window in windows
    ):
        raise TrajectoryStructureError("lane/window key is off plan")

    expected = {
        (group, lane, window)
        for group in range(panel_group_count)
        for lane in VBD_TRAJECTORY_LANES
        for window in range(VBD_TRAJECTORY_TOTAL_WINDOW_COUNT)
    }
    if set(keys) != expected or len(keys) != len(expected):
        raise TrajectoryStructureError("lane/window manifest is incomplete")


def validate_trajectory_panel(panel: TrajectoryObservationPanel) -> None:
    if type(panel) is not TrajectoryObservationPanel:
        raise TrajectoryStructureError("trajectory panel has an unsupported type")
    validate_vbd_trajectory_runtime()
    if panel.schema_version != VBD_TRAJECTORY_SCHEMA_VERSION:
        raise TrajectoryStructureError("trajectory panel schema version drifted")
    _safe_id(panel.schema_version, "panel schema_version")
    if type(panel.bundles) is not tuple:
        raise TrajectoryStructureError("trajectory panel bundles must be an immutable tuple")
    if type(panel.lane_observation_roots) is not tuple or any(
        type(item) is not tuple or len(item) != 2
        for item in panel.lane_observation_roots
    ):
        raise TrajectoryStructureError(
            "trajectory lane observation roots must be immutable tuples"
        )
    for lane, root in panel.lane_observation_roots:
        _safe_id(lane, "panel lane observation root lane")
        _sha256(root, "panel lane observation root")
    panel_group_count = _strict_int(
        panel.panel_group_count, "panel panel_group_count"
    )
    if panel_group_count not in VBD_TRAJECTORY_PANEL_GROUP_COUNTS:
        raise TrajectoryStructureError("panel group count is off plan")
    pre_window_count = _strict_int(panel.pre_window_count, "panel pre_window_count")
    post_window_count = _strict_int(
        panel.post_window_count, "panel post_window_count"
    )
    if (
        pre_window_count != VBD_TRAJECTORY_PRE_WINDOW_COUNT
        or post_window_count != VBD_TRAJECTORY_POST_WINDOW_COUNT
    ):
        raise TrajectoryStructureError("trajectory panel requires exactly 12 pre and 6 post windows")
    aggregate_k = _strict_int(panel.aggregate_k, "panel aggregate_k", minimum=1)
    if (
        type(panel.direction_vector) is not tuple
        or len(panel.direction_vector) != 3
        or any(type(value) is not int for value in panel.direction_vector)
    ):
        raise TrajectoryStructureError("panel direction vector is malformed")
    validate_reference_manifest(panel.reference_manifest)
    plan_ref = _manifest_study_plan_ref(panel.reference_manifest)
    expected_reference_spec = _reference_spec_for_plan_ref(plan_ref)
    for group in range(panel.panel_group_count):
        expected_reference_spec[f"cohort:vbd-synthetic-g{group:02d}"] = (
            "cohort",
            "definition:synthetic-known-aggregate-uncertainty-v1",
        )
    actual_entries = panel.reference_manifest.by_ref()
    if set(actual_entries) != set(expected_reference_spec):
        raise TrajectoryStructureError("reference manifest ref set drifted")
    for ref_value, (expected_role, expected_source_definition) in expected_reference_spec.items():
        entry = actual_entries[ref_value]
        if (
            entry.field_role != expected_role
            or entry.source_definition_ref != expected_source_definition
            or entry.owner_role != "synthetic_generator"
        ):
            raise TrajectoryStructureError("reference manifest semantic role drifted")
        if not ref_value.startswith("cohort:") and ref_value != plan_ref:
            expected_bound_hash = expected_static_reference_content_hash(
                ref_value, expected_role, expected_source_definition
            )
            if entry.bound_content_hash != expected_bound_hash:
                raise TrajectoryStructureError("reference manifest content hash drifted")
    expected_count = panel.panel_group_count * VBD_TRAJECTORY_TOTAL_WINDOW_COUNT
    if len(panel.bundles) != expected_count:
        raise TrajectoryStructureError("trajectory panel is incomplete")
    validate_trajectory_lane_window_manifest(
        tuple(
            (bundle.panel_group_index, lane, bundle.window_index)
            for bundle in panel.bundles
            for lane in VBD_TRAJECTORY_LANES
        ),
        panel_group_count=panel.panel_group_count,
    )
    seen: set[tuple[int, int]] = set()
    tuple_keys: list[tuple[str, str, str]] = []
    depth_context_statuses: list[tuple[str, str | None, bool]] = []
    for ordinal, bundle in enumerate(panel.bundles):
        expected_group = ordinal // VBD_TRAJECTORY_TOTAL_WINDOW_COUNT
        expected_window = ordinal % VBD_TRAJECTORY_TOTAL_WINDOW_COUNT
        if (bundle.panel_group_index, bundle.window_index) != (
            expected_group,
            expected_window,
        ):
            raise TrajectoryStructureError("trajectory panel ordering drifted")
        key = (bundle.panel_group_index, bundle.window_index)
        if key in seen:
            raise TrajectoryStructureError("trajectory panel contains a duplicate window")
        seen.add(key)
        if bundle.k != aggregate_k or bundle.cohort_size != aggregate_k:
            raise TrajectoryStructureError("trajectory panel k drifted")
        if bundle.direction_vector != panel.direction_vector:
            raise TrajectoryStructureError("trajectory panel direction vector drifted")
        if bundle.direction_vector_root != panel.direction_vector_root:
            raise TrajectoryStructureError("trajectory panel direction root drifted")
        validate_trajectory_bundle(bundle, panel.reference_manifest)
        depth_context_statuses.append(
            _validate_depth_context(bundle.depth_context, panel.reference_manifest)
        )
        if bundle.partition_attestation_root != panel.cohort_partition_root:
            raise TrajectoryStructureError("bundle partition attestation drifted")
        if expected_window == 0:
            tuple_keys.append(bundle.tuple_key())
        elif bundle.tuple_key() != tuple_keys[expected_group]:
            raise TrajectoryStructureError("panel group tuple changed across windows")
    if len(set(tuple_keys)) != panel.panel_group_count:
        raise TrajectoryStructureError("panel groups must use disjoint tuple keys")
    if all(status[2] for status in depth_context_statuses):
        available_refs = {status[0] for status in depth_context_statuses}
        available_roots = {status[1] for status in depth_context_statuses}
        if len(available_refs) != 1 or len(available_roots) != 1:
            raise TrajectoryStructureError(
                "panel must bind one immutable nonnumeric Depth context root"
            )
        if panel.depth_context_root not in available_roots:
            raise TrajectoryStructureError(
                "panel Depth context root drifted from its valid context"
            )
    else:
        if panel.depth_context_root != VBD_TRAJECTORY_MISSING_DEPTH_CONTEXT_ROOT:
            raise TrajectoryStructureError(
                "panel unavailable Depth context root drifted"
            )
    expected_partition = sha256_json(
        {
            "tuple_keys": [list(key) for key in tuple_keys],
            "disjoint": True,
            "nested": False,
            "complementary": False,
            "differenceable": False,
        }
    )
    if panel.cohort_partition_root != expected_partition:
        raise TrajectoryStructureError("cohort partition root drifted")
    expected_lane_roots = _expected_lane_observation_roots(panel.bundles)
    if panel.lane_observation_roots != expected_lane_roots:
        raise TrajectoryStructureError("lane observation roots drifted")
    for name, value in (
        ("direction_vector_root", panel.direction_vector_root),
        ("depth_context_root", panel.depth_context_root),
        ("cohort_partition_root", panel.cohort_partition_root),
        ("model_manifest_root", panel.model_manifest_root),
        ("study_plan_root", panel.study_plan_root),
        ("seed_manifest_root", panel.seed_manifest_root),
    ):
        _sha256(value, name)
    if panel.model_manifest_root != sha256_json(vbd_trajectory_model_manifest_body()):
        raise TrajectoryStructureError("model manifest root drifted")
    if any(bundle.plan_hash != panel.study_plan_root for bundle in panel.bundles):
        raise TrajectoryStructureError("study plan root drifted")
    if actual_entries[plan_ref].bound_content_hash != panel.study_plan_root:
        raise TrajectoryStructureError("study plan manifest binding drifted")
    _safe_id(panel.scenario_id, "panel scenario_id")
    for name, value in (
        ("group correlation", panel.dgp_group_correlation),
        ("innovation correlation", panel.dgp_innovation_correlation),
        ("observation correlation", panel.dgp_observation_correlation),
    ):
        correlation = _finite(value, name)
        if not -0.49 < correlation < 1.0:
            raise TrajectoryStructureError(f"{name} is outside the compiled range")
    _safe_id(panel.seed_namespace, "panel seed_namespace")
    seed = _strict_int(panel.seed, "panel seed")
    if panel.generator_id != VBD_TRAJECTORY_GENERATOR_ID:
        raise TrajectoryStructureError("generator id drifted")
    if panel.rng_id != VBD_TRAJECTORY_RNG_ID:
        raise TrajectoryStructureError("RNG id drifted")
    _safe_id(panel.generator_id, "panel generator_id")
    _safe_id(panel.rng_id, "panel rng_id")
    acceptance_slot_key = None
    if plan_ref == VBD_TRAJECTORY_SMOKE_PLAN_REF:
        if not panel.scenario_id.startswith("development_smoke_"):
            raise TrajectoryStructureError(
                "panel scenario is outside the smoke namespace"
            )
        if panel.seed_namespace != VBD_TRAJECTORY_SMOKE_SEED_NAMESPACE:
            raise TrajectoryStructureError(
                "seed namespace is not a development-smoke namespace"
            )
        if not VBD_TRAJECTORY_SMOKE_SEED_MIN <= seed <= VBD_TRAJECTORY_SMOKE_SEED_MAX:
            raise TrajectoryStructureError("panel seed is outside the smoke namespace")
    else:
        if panel.seed_namespace != VBD_TRAJECTORY_VALIDATION_SEED_NAMESPACE:
            raise TrajectoryStructureError(
                "seed namespace is not the compiled validation namespace"
            )
        slot, validation_plan_hash = _validation_slot_and_plan_hash(seed)
        if panel.study_plan_root != validation_plan_hash:
            raise TrajectoryStructureError(
                "validation panel does not bind the global compiled plan hash"
            )
        observed_slot_semantics = (
            panel.scenario_id,
            panel.panel_group_count,
            panel.aggregate_k,
            panel.direction_vector,
            (
                panel.dgp_group_correlation,
                panel.dgp_innovation_correlation,
                panel.dgp_observation_correlation,
            ),
        )
        expected_slot_semantics = (
            _validation_panel_scenario_id(slot),
            slot.panel_group_count,
            slot.k,
            slot.direction_vector,
            slot.correlations,
        )
        if observed_slot_semantics != expected_slot_semantics:
            raise TrajectoryStructureError(
                "validation panel metadata drifted from its seed-resolved slot"
            )
        acceptance_slot_key = slot.slot_id
    expected_seed_root = sha256_json(
        {
            "seed_namespace": panel.seed_namespace,
            "seed": seed,
            "generator_id": panel.generator_id,
            "rng_id": panel.rng_id,
            "acceptance_slot_key": acceptance_slot_key,
        }
    )
    if panel.seed_manifest_root != expected_seed_root:
        raise TrajectoryStructureError("seed manifest root drifted")
    if panel.ordered_panel_manifest_root != expected_ordered_panel_manifest_root(panel):
        raise TrajectoryStructureError("ordered panel manifest root drifted")
    _strict_bool(panel.synthetic_only, "panel synthetic_only")
    _strict_bool(panel.aggregate_only, "panel aggregate_only")
    if panel.synthetic_only is not True or panel.aggregate_only is not True:
        raise TrajectoryStructureError("trajectory panel must be synthetic-only and aggregate-only")
    for name, value in (
        ("real_data_present", panel.real_data_present),
        ("customer_data_present", panel.customer_data_present),
        ("production_data_present", panel.production_data_present),
        ("live_data_source_present", panel.live_data_source_present),
    ):
        _strict_bool(value, f"panel {name}")
    if (
        panel.real_data_present
        or panel.customer_data_present
        or panel.production_data_present
        or panel.live_data_source_present
    ):
        raise TrajectoryStructureError("real, customer, production, or live panel data is prohibited")
    from .vbd_trajectory_synthetic import validate_vbd_trajectory_synthetic_generation

    validate_vbd_trajectory_synthetic_generation(panel)
    _assert_no_forbidden_keys(panel.to_dict())
