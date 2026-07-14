"""Summary-only artifact for the synthetic measurement calibration study."""

from __future__ import annotations

from datetime import datetime, timezone
import re

from . import __version__
from .ai_fluency_measurement_calibration import (
    MAXIMUM_INVARIANT_FALSE_HOLD_RATE,
    MEASUREMENT_FULL_REPLICATIONS_PER_SCENARIO,
    MINIMUM_DRIFT_DETECTION_RATE,
    MINIMUM_RECOVERY_PASS_RATE,
    MeasurementCalibrationStudy,
    validate_measurement_calibration_study,
    verify_study_execution_by_recomputation,
)
from .ai_fluency_measurement_diagnostics import (
    LOADING_INVARIANCE_ROPE_HALF_WIDTH,
    MAXIMUM_LOADING_RECOVERY_RMSE,
    MAXIMUM_SECOND_ORDER_RECOVERY_RMSE,
    MAXIMUM_THRESHOLD_RECOVERY_RMSE,
    MINIMUM_FIRST_ORDER_LOADING,
    MINIMUM_INVARIANCE_POSTERIOR_PROBABILITY,
    MINIMUM_ORDINAL_OMEGA,
    MINIMUM_SECOND_ORDER_LOADING,
    THRESHOLD_INVARIANCE_ROPE_HALF_WIDTH,
)
from .ai_fluency_measurement_evidence import (
    AGGREGATE_OBSERVED_COUNT_FLOOR,
    blocked_output_authorizations,
)
from .ai_fluency_measurement_manifest import (
    LONG_FORM_ID,
    SHORT_FORM_ID,
    measurement_manifest_hash,
)
from .ai_fluency_ordinal_measurement import (
    CATEGORY_DIRICHLET_PRIOR,
    FISHER_Z_PRIOR_SD,
    LOADING_PRIOR_MEAN,
    LOADING_PRIOR_SD,
    ORDINAL_MEASUREMENT_ENGINE,
    ORDINAL_MEASUREMENT_MODEL_KIND,
)
from .hashing import sha256_json


MEASUREMENT_CALIBRATION_ARTIFACT_SCHEMA_VERSION = (
    "FT_AI_FLUENCY_ORDINAL_MEASUREMENT_CALIBRATION_2026_07_V1"
)
MEASUREMENT_CALIBRATION_ARTIFACT_CLASS = (
    "internal_synthetic_ai_fluency_measurement_calibration"
)
_RFC3339_RE = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$"
)


def _generated_at(value: str | None) -> str:
    generated_at = value or datetime.now(timezone.utc).isoformat()
    if not isinstance(generated_at, str) or not _RFC3339_RE.fullmatch(generated_at):
        raise ValueError("generated_at must be timezone-aware RFC3339")
    parsed = datetime.fromisoformat(generated_at.replace("Z", "+00:00"))
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("generated_at must include a timezone offset")
    return generated_at


def measurement_calibration_artifact_payload_hash_body(artifact: dict) -> dict:
    return {key: value for key, value in artifact.items() if key != "hash_bindings"}


def measurement_calibration_artifact_payload_hash(artifact: dict) -> str:
    return sha256_json(measurement_calibration_artifact_payload_hash_body(artifact))


def measurement_calibration_artifact_self_hash_body(artifact: dict) -> dict:
    body = dict(artifact)
    bindings = dict(body["hash_bindings"])
    bindings["artifact_self_hash"] = ""
    body["hash_bindings"] = bindings
    return body


def measurement_calibration_artifact_self_hash(artifact: dict) -> str:
    return sha256_json(measurement_calibration_artifact_self_hash_body(artifact))


def emit_measurement_calibration_artifact(
    study: MeasurementCalibrationStudy,
    *,
    generated_at: str | None = None,
) -> dict:
    validate_measurement_calibration_study(study)
    execution_recomputation_hash = verify_study_execution_by_recomputation(study)
    failing_checks = list(study.failing_checks)
    state = (
        "VALID_INTERNAL_SYNTHETIC_NON_AUTHORIZING"
        if study.complete_full_plan and not failing_checks
        else "HOLD"
    )
    artifact = {
        "schema_version": MEASUREMENT_CALIBRATION_ARTIFACT_SCHEMA_VERSION,
        "artifact_class": MEASUREMENT_CALIBRATION_ARTIFACT_CLASS,
        "generated_at": _generated_at(generated_at),
        "harness_version": __version__,
        "state": state,
        "failing_checks": failing_checks,
        "scope": {
            "internal_only": True,
            "synthetic_only": True,
            "aggregate_only": True,
            "noncausal": True,
            "nonauthorizing": True,
            "real_data_admitted": False,
            "customer_data_admitted": False,
            "production_data_admitted": False,
            "live_data_source_admitted": False,
        },
        "measurement_manifest": {
            "form_id": LONG_FORM_ID,
            "manifest_hash": measurement_manifest_hash(),
            "item_count": 24,
            "first_order_construct_count": 8,
            "core_second_order_construct_count": 5,
            "short_form_id": SHORT_FORM_ID,
            "short_form_role": "pulse_only_unequated",
            "behavior_evidence_role": "separate_pathway_and_corroboration_only",
        },
        "evidence_contract": {
            "independent_repeated_cross_sectional_waves": True,
            "required_wave_count": 2,
            "required_item_count_vectors_per_wave": 24,
            "required_pair_tables_per_wave": 276,
            "pair_table_shape": [5, 5],
            "aggregate_observed_count_floor": AGGREGATE_OBSERVED_COUNT_FLOOR,
            "respondent_rows_consumed_by_model": False,
            "respondent_identifiers_emitted": False,
            "raw_answers_emitted": False,
            "behavior_fields_emitted": False,
            "pairwise_tables_prove_global_joint_distribution": False,
            "synthetic_packages_freshly_regenerated_before_fit": True,
            "real_source_attestation_required_by_future_admission": True,
        },
        "model_specification": {
            "engine_kind": ORDINAL_MEASUREMENT_ENGINE,
            "model_kind": ORDINAL_MEASUREMENT_MODEL_KIND,
            "likelihood": "ordinal_probit_pairwise_composite",
            "category_prior": {
                "family": "symmetric_dirichlet",
                "concentration_per_category": CATEGORY_DIRICHLET_PRIOR,
            },
            "pair_correlation_prior": {
                "family": "normal_on_fisher_z",
                "sd": FISHER_Z_PRIOR_SD,
            },
            "loading_prior": {
                "family": "truncated_normal_laplace_approximation",
                "mean": LOADING_PRIOR_MEAN,
                "sd": LOADING_PRIOR_SD,
            },
            "full_information_sem": False,
            "nuts_used": False,
            "posterior_draws_generated": False,
            "latent_states_emitted": False,
            "respondent_scores_emitted": False,
            "structural_paths_estimated": False,
            "diagnostic_followup_construct_latent_means_free": True,
            "diagnostic_threshold_invariance_after_construct_mean_alignment": True,
            "threshold_uncertainty_representation": (
                "joint_cumulative_dirichlet_delta_laplace"
            ),
            "loading_curvature": "exact_nonlinear_product_hessian",
            "second_order_ratio_pooling": "gls_with_shared_loading_covariance",
        },
        "compiled_validation_gates": {
            "minimum_ordinal_omega": MINIMUM_ORDINAL_OMEGA,
            "minimum_first_order_loading": MINIMUM_FIRST_ORDER_LOADING,
            "minimum_second_order_loading": MINIMUM_SECOND_ORDER_LOADING,
            "loading_invariance_rope_half_width": LOADING_INVARIANCE_ROPE_HALF_WIDTH,
            "threshold_invariance_rope_half_width": THRESHOLD_INVARIANCE_ROPE_HALF_WIDTH,
            "minimum_invariance_posterior_probability": MINIMUM_INVARIANCE_POSTERIOR_PROBABILITY,
            "maximum_loading_recovery_rmse": MAXIMUM_LOADING_RECOVERY_RMSE,
            "maximum_threshold_recovery_rmse": MAXIMUM_THRESHOLD_RECOVERY_RMSE,
            "maximum_second_order_recovery_rmse": MAXIMUM_SECOND_ORDER_RECOVERY_RMSE,
            "full_replications_per_scenario": MEASUREMENT_FULL_REPLICATIONS_PER_SCENARIO,
            "maximum_invariant_false_hold_rate": MAXIMUM_INVARIANT_FALSE_HOLD_RATE,
            "minimum_drift_detection_rate": MINIMUM_DRIFT_DETECTION_RATE,
            "minimum_recovery_pass_rate": MINIMUM_RECOVERY_PASS_RATE,
            "thresholds_runtime_configurable": False,
        },
        "study": study.to_summary_dict(),
        "execution_recomputation": {
            "all_compiled_slots_freshly_recomputed": True,
            "slot_result_hashes_hash": execution_recomputation_hash,
        },
        "completion_posture": {
            "full_study_executed": study.complete_full_plan,
            "independent_code_review": "NOT_RUN",
            "independent_bug_review": "NOT_RUN",
            "independent_adversarial_review": "NOT_RUN",
            "parent_openspec_task_5_5_complete": False,
            "real_data_calibration_complete": False,
            "short_form_equating_complete": False,
            "structural_path_calibration_complete": False,
        },
        "blocked_outputs": blocked_output_authorizations(),
        "hash_bindings": {
            "manifest_hash": measurement_manifest_hash(),
            "study_hash": study.study_hash,
            "artifact_payload_hash": "",
            "artifact_self_hash": "",
            "hash_posture": "consistency_and_drift_detection_not_authenticity",
        },
    }
    artifact["hash_bindings"]["artifact_payload_hash"] = (
        measurement_calibration_artifact_payload_hash(artifact)
    )
    artifact["hash_bindings"]["artifact_self_hash"] = (
        measurement_calibration_artifact_self_hash(artifact)
    )
    return artifact


def run_measurement_calibration_proof(
    *, execution_mode: str = "smoke", generated_at: str | None = None
) -> dict:
    from .ai_fluency_measurement_calibration import run_measurement_calibration_study

    return emit_measurement_calibration_artifact(
        run_measurement_calibration_study(execution_mode=execution_mode),
        generated_at=generated_at,
    )
