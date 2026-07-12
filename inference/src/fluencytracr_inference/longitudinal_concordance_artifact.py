"""Summary-only internal artifact for the exact longitudinal concordance study."""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from typing import Literal

from . import __version__ as HARNESS_VERSION
from .hashing import sha256_json
from .longitudinal_concordance import (
    LongitudinalConcordanceStudyResult,
    is_runner_generated_concordance_study,
    longitudinal_concordance_plan,
    run_longitudinal_concordance_study,
)
from .longitudinal_nuts import (
    LONGITUDINAL_NUTS_BFMI_MIN,
    LONGITUDINAL_NUTS_ESS_MIN,
    LONGITUDINAL_NUTS_FULL_CHAINS,
    LONGITUDINAL_NUTS_FULL_DRAWS,
    LONGITUDINAL_NUTS_FULL_MAX_TREEDEPTH,
    LONGITUDINAL_NUTS_FULL_TARGET_ACCEPT,
    LONGITUDINAL_NUTS_FULL_TUNE,
    LONGITUDINAL_NUTS_MCSE_RATIO_MAX,
    LONGITUDINAL_NUTS_PPC_VALUE_MAX,
    LONGITUDINAL_NUTS_PPC_VALUE_MIN,
    LONGITUDINAL_NUTS_REFERENCE_ENGINE,
    LONGITUDINAL_NUTS_RHAT_MAX,
    LONGITUDINAL_PPC_STATISTIC_NAMES,
)
from .longitudinal_state_space import (
    STATE_SPACE_CUBATURE_LOG2_POINTS,
    STATE_SPACE_CUBATURE_MAX_NORMALIZED_WEIGHT,
    STATE_SPACE_CUBATURE_MIN_EFFECTIVE_SAMPLE_SIZE,
    STATE_SPACE_CUBATURE_POINT_COUNT,
    STATE_SPACE_CUBATURE_PROPOSAL_SCALE,
    STATE_SPACE_CUBATURE_T_DF,
    STATE_SPACE_FIXED_EFFECT_PRIOR_SD,
    STATE_SPACE_GROUP_SCALE_PRIOR_SD,
    STATE_SPACE_INNOVATION_SCALE_PRIOR_SD,
    STATE_SPACE_MODEL_KIND,
    STATE_SPACE_PRIMARY_ENGINE,
    STATE_SPACE_RHO_ABS_BOUND,
)
from .longitudinal_types import (
    LONGITUDINAL_BLOCKED_OUTPUTS,
    LONGITUDINAL_MODEL_FAMILY,
)

LONGITUDINAL_CONCORDANCE_ARTIFACT_SCHEMA_VERSION = (
    "FT_AI_VALUE_LONGITUDINAL_STATE_SPACE_NUTS_CONCORDANCE_2026_07_V1"
)
LONGITUDINAL_CONCORDANCE_ARTIFACT_CLASS = (
    "internal_synthetic_longitudinal_state_space_nuts_concordance"
)
LONGITUDINAL_CONCORDANCE_MODEL_SLICE = (
    "longitudinal_state_space_nuts_concordance_validation"
)
LONGITUDINAL_CONCORDANCE_UNKEYED_HASH_POSTURE = (
    "consistency_and_drift_detection_not_coordinated_replacement_authenticity"
)

_EMISSION_TOKEN = object()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _validated_generated_at(value: str | None) -> str:
    if value is None:
        return _now()
    if not isinstance(value, str) or not value:
        raise ValueError("generated_at must be a timezone-aware RFC3339 timestamp")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("generated_at must be a timezone-aware RFC3339 timestamp") from exc
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("generated_at must be a timezone-aware RFC3339 timestamp")
    return value


def longitudinal_concordance_payload_hash_body(artifact: dict) -> dict:
    body = deepcopy(artifact)
    body.pop("hash_bindings", None)
    return body


def longitudinal_concordance_payload_hash(artifact: dict) -> str:
    return sha256_json(longitudinal_concordance_payload_hash_body(artifact))


def longitudinal_concordance_self_hash_body(artifact: dict) -> dict:
    body = deepcopy(artifact)
    body["hash_bindings"]["artifact_self_hash"] = ""
    return body


def longitudinal_concordance_self_hash(artifact: dict) -> str:
    return sha256_json(longitudinal_concordance_self_hash_body(artifact))


def _model_specification() -> dict:
    return {
        "model_kind": STATE_SPACE_MODEL_KIND,
        "equation": "y[c,t]=X[c,t]beta+u[c]+r[c,t]+epsilon[c,t]",
        "state_equation": "r[c,t]=rho*r[c,t-1]+eta[c,t]",
        "likelihood_family": "continuous_normal_identity",
        "link_function": "identity",
        "known_aggregate_se_used_exactly": True,
        "additional_observation_scale": False,
        "stationary_ar1_initial_state": True,
        "rho_abs_bound": STATE_SPACE_RHO_ABS_BOUND,
        "zero_sum_panel_group_effects": True,
        "zero_sum_parameterization": "c_minus_one_orthonormal_basis",
        "pre_period_only_standardization": True,
        "velocity_and_breadth_separate": True,
        "baseline_fluency_context_included": True,
        "depth_context_only": True,
        "depth_used_in_likelihood": False,
        "minimum_worthwhile_change_used_in_inference": False,
        "fixed_effect_prior": {
            "family": "Normal",
            "mean": 0.0,
            "sd": STATE_SPACE_FIXED_EFFECT_PRIOR_SD,
        },
        "panel_group_scale_prior": {
            "family": "HalfNormal",
            "sd": STATE_SPACE_GROUP_SCALE_PRIOR_SD,
        },
        "ar1_innovation_scale_prior": {
            "family": "HalfNormal",
            "sd": STATE_SPACE_INNOVATION_SCALE_PRIOR_SD,
        },
        "rho_prior": {
            "family": "Uniform",
            "lower": -STATE_SPACE_RHO_ABS_BOUND,
            "upper": STATE_SPACE_RHO_ABS_BOUND,
        },
    }


def _engine_specification() -> dict:
    return {
        "primary": {
            "engine_kind": STATE_SPACE_PRIMARY_ENGINE,
            "gaussian_states_integrated_analytically": True,
            "fixed_effects_integrated_conditionally": True,
            "posterior_draws_generated": False,
            "cubature": {
                "rule": "unscrambled_sobol_student_t_importance_cubature",
                "log2_point_count": STATE_SPACE_CUBATURE_LOG2_POINTS,
                "point_count": STATE_SPACE_CUBATURE_POINT_COUNT,
                "student_t_degrees_of_freedom": STATE_SPACE_CUBATURE_T_DF,
                "proposal_scale": STATE_SPACE_CUBATURE_PROPOSAL_SCALE,
                "min_effective_sample_size": (
                    STATE_SPACE_CUBATURE_MIN_EFFECTIVE_SAMPLE_SIZE
                ),
                "max_normalized_weight": (
                    STATE_SPACE_CUBATURE_MAX_NORMALIZED_WEIGHT
                ),
            },
        },
        "reference": {
            "engine_kind": LONGITUDINAL_NUTS_REFERENCE_ENGINE,
            "sampler": "pymc_nuts",
            "chains": LONGITUDINAL_NUTS_FULL_CHAINS,
            "draws": LONGITUDINAL_NUTS_FULL_DRAWS,
            "tune": LONGITUDINAL_NUTS_FULL_TUNE,
            "target_accept": LONGITUDINAL_NUTS_FULL_TARGET_ACCEPT,
            "max_treedepth": LONGITUDINAL_NUTS_FULL_MAX_TREEDEPTH,
            "cores": 1,
            "blas_cores": 1,
            "raw_posterior_draws_emitted": False,
        },
        "compiled_reference_diagnostic_gates": {
            "r_hat_max": LONGITUDINAL_NUTS_RHAT_MAX,
            "bulk_ess_min": LONGITUDINAL_NUTS_ESS_MIN,
            "tail_ess_min": LONGITUDINAL_NUTS_ESS_MIN,
            "post_warmup_divergences_max": 0,
            "max_treedepth_saturation_count_max": 0,
            "energy_bfmi_min": LONGITUDINAL_NUTS_BFMI_MIN,
            "max_mcse_to_posterior_sd_ratio": LONGITUDINAL_NUTS_MCSE_RATIO_MAX,
            "posterior_predictive_p_value_min": LONGITUDINAL_NUTS_PPC_VALUE_MIN,
            "posterior_predictive_p_value_max": LONGITUDINAL_NUTS_PPC_VALUE_MAX,
            "posterior_predictive_statistics": list(
                LONGITUDINAL_PPC_STATISTIC_NAMES
            ),
        },
    }


def emit_longitudinal_concordance_artifact(
    study: LongitudinalConcordanceStudyResult,
    *,
    generated_at: str | None = None,
    _token: object | None = None,
) -> dict:
    if _token is not _EMISSION_TOKEN:
        raise ValueError("concordance artifact emission is runner-owned")
    if not is_runner_generated_concordance_study(study):
        raise ValueError("concordance artifact requires runner-generated study evidence")
    generated_at = _validated_generated_at(generated_at)
    plan = longitudinal_concordance_plan()
    if study.plan_hash != plan["plan_hash"]:
        raise ValueError("concordance study plan hash is not compiled")
    slot_results = [result.to_dict() for result in study.slot_results]
    state = (
        "valid_internal_validation_non_authorizing" if study.passed else "HOLD"
    )
    artifact = {
        "schema_version": LONGITUDINAL_CONCORDANCE_ARTIFACT_SCHEMA_VERSION,
        "artifact_class": LONGITUDINAL_CONCORDANCE_ARTIFACT_CLASS,
        "generated_at": generated_at,
        "harness_version": HARNESS_VERSION,
        "model_family": LONGITUDINAL_MODEL_FAMILY,
        "model_slice": LONGITUDINAL_CONCORDANCE_MODEL_SLICE,
        "model_specification": _model_specification(),
        "engine_specification": _engine_specification(),
        "study_plan": plan,
        "study_summary": study.to_summary_dict(),
        "slot_results": slot_results,
        "validation_scope": {
            "synthetic_only": True,
            "aggregate_only": True,
            "state_space_nuts_concordance_complete": study.passed,
            "replicated_validation_complete": False,
            "calibration_complete": False,
            "production_promotion_complete": False,
        },
        "governance_state": {
            "state": state,
            "failing_checks": list(study.failing_checks),
            "concordance_gate_passed": study.passed,
            "independent_acceptance_required": True,
            "independent_acceptance_complete": False,
            "replicated_validation_unblocked": False,
            "customer_output_authorized": False,
            "probability_output_authorized": False,
            "confidence_output_authorized": False,
            "causal_claim_authorized": False,
            "promotion_decision_ref": None,
        },
        "synthetic_data_boundary": {
            "real_data_present": False,
            "customer_data_present": False,
            "production_data_present": False,
            "live_data_source_present": False,
            "raw_rows_emitted": False,
            "posterior_draws_emitted": False,
            "latent_states_emitted": False,
        },
        "hash_bindings": {
            "study_plan_hash": plan["plan_hash"],
            "slot_results_hash": sha256_json(slot_results),
            "study_result_hash": study.study_result_hash,
            "artifact_payload_hash": "",
            "artifact_self_hash": "",
            "hash_posture": LONGITUDINAL_CONCORDANCE_UNKEYED_HASH_POSTURE,
        },
        "blocked_outputs": {
            field: False for field in LONGITUDINAL_BLOCKED_OUTPUTS
        },
        "internal_only": True,
        "synthetic_only": True,
        "numeric_values_role": "internal_validation_evidence_not_customer_output",
        "customer_output_authorized": False,
        "probability_output_authorized": False,
        "confidence_output_authorized": False,
        "roi_output_authorized": False,
        "finance_output_authorized": False,
        "causality_output_authorized": False,
        "productivity_output_authorized": False,
        "promotion_decision_ref": None,
    }
    artifact["hash_bindings"]["artifact_payload_hash"] = (
        longitudinal_concordance_payload_hash(artifact)
    )
    artifact["hash_bindings"]["artifact_self_hash"] = (
        longitudinal_concordance_self_hash(artifact)
    )
    return artifact


def run_longitudinal_concordance_artifact(
    *,
    mode: Literal["full", "smoke"],
    generated_at: str | None = None,
) -> tuple[dict, dict]:
    study = run_longitudinal_concordance_study(mode=mode)
    artifact = emit_longitudinal_concordance_artifact(
        study,
        generated_at=generated_at,
        _token=_EMISSION_TOKEN,
    )
    return artifact, study.to_summary_dict()


def emit_runner_generated_concordance_artifact(
    study: LongitudinalConcordanceStudyResult,
    *,
    generated_at: str | None = None,
) -> dict:
    """Emit an artifact from an already completed in-process runner study."""

    return emit_longitudinal_concordance_artifact(
        study,
        generated_at=generated_at,
        _token=_EMISSION_TOKEN,
    )
