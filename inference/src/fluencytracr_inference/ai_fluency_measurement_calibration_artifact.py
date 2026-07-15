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
    MeasurementCalibrationExecutionVerification,
    MeasurementCalibrationStudy,
    validate_measurement_calibration_execution_verification,
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
_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
_COMMIT_RE = re.compile(r"^[0-9a-f]{40}$")
_THREAD_ENV_KEYS = {
    "MKL_NUM_THREADS",
    "NUMEXPR_NUM_THREADS",
    "OMP_NUM_THREADS",
    "OPENBLAS_NUM_THREADS",
    "VECLIB_MAXIMUM_THREADS",
}
_REQUIRED_IMPLEMENTATION_PATHS = {
    "inference/pyproject.toml",
    "inference/requirements.lock",
    "inference/src/fluencytracr_inference/__init__.py",
    "inference/src/fluencytracr_inference/ai_fluency_long_v1_manifest.json",
    "inference/src/fluencytracr_inference/ai_fluency_measurement_calibration.py",
    "inference/src/fluencytracr_inference/ai_fluency_measurement_calibration_artifact.py",
    "inference/src/fluencytracr_inference/ai_fluency_measurement_calibration_resumable.py",
    "inference/src/fluencytracr_inference/ai_fluency_measurement_calibration_resumable_cli.py",
    "inference/src/fluencytracr_inference/ai_fluency_measurement_diagnostics.py",
    "inference/src/fluencytracr_inference/ai_fluency_measurement_evidence.py",
    "inference/src/fluencytracr_inference/ai_fluency_measurement_manifest.py",
    "inference/src/fluencytracr_inference/ai_fluency_measurement_synthetic.py",
    "inference/src/fluencytracr_inference/ai_fluency_ordinal_measurement.py",
    "inference/src/fluencytracr_inference/hashing.py",
}
_EXPECTED_RUNTIME_PACKAGE_VERSIONS = {
    "arviz": "1.2.0",
    "numpy": "2.4.6",
    "pymc": "6.0.1",
    "scipy": "1.18.0",
    "threadpoolctl": "3.6.0",
}


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


def validate_measurement_calibration_execution_identity(identity: object) -> None:
    expected_keys = {
        "source_commit",
        "source_tree_clean",
        "plan_hash",
        "implementation_manifest",
        "requirements_lock_hash",
        "runtime",
        "workspace_identity_hash",
        "primary_phase_hash",
        "recompute_phase_hash",
        "primary_checkpoint_manifest_hash",
        "recompute_checkpoint_manifest_hash",
        "primary_process_tokens_hash",
        "recompute_process_tokens_hash",
        "separate_phase_execution",
        "identity_hash",
    }
    if not isinstance(identity, dict) or set(identity) != expected_keys:
        raise ValueError("execution identity shape is invalid")
    hash_keys = (
        "plan_hash",
        "requirements_lock_hash",
        "workspace_identity_hash",
        "primary_phase_hash",
        "recompute_phase_hash",
        "primary_checkpoint_manifest_hash",
        "recompute_checkpoint_manifest_hash",
        "primary_process_tokens_hash",
        "recompute_process_tokens_hash",
        "identity_hash",
    )
    if (
        not isinstance(identity["source_commit"], str)
        or not _COMMIT_RE.fullmatch(identity["source_commit"])
        or identity["source_tree_clean"] is not True
        or identity["separate_phase_execution"] is not True
        or not all(
            isinstance(identity[key], str) and _SHA256_RE.fullmatch(identity[key])
            for key in hash_keys
        )
        or identity["primary_phase_hash"] == identity["recompute_phase_hash"]
        or identity["primary_checkpoint_manifest_hash"]
        == identity["recompute_checkpoint_manifest_hash"]
        or identity["primary_process_tokens_hash"]
        == identity["recompute_process_tokens_hash"]
    ):
        raise ValueError("execution identity values are invalid")
    implementation = identity["implementation_manifest"]
    if not isinstance(implementation, dict) or set(implementation) != {
        "files",
        "implementation_hash",
    }:
        raise ValueError("execution implementation manifest is invalid")
    files = implementation["files"]
    if not isinstance(files, list) or not files:
        raise ValueError("execution implementation files are missing")
    seen_paths = set()
    for item in files:
        if (
            not isinstance(item, dict)
            or set(item) != {"path", "sha256"}
            or not isinstance(item["path"], str)
            or not item["path"].startswith("inference/")
            or item["path"] in seen_paths
            or not isinstance(item["sha256"], str)
            or not _SHA256_RE.fullmatch(item["sha256"])
        ):
            raise ValueError("execution implementation file binding is invalid")
        seen_paths.add(item["path"])
    if seen_paths != _REQUIRED_IMPLEMENTATION_PATHS:
        raise ValueError("execution implementation file manifest is not exact")
    if implementation["implementation_hash"] != sha256_json({"files": files}):
        raise ValueError("execution implementation hash is invalid")
    runtime = identity["runtime"]
    expected_runtime_keys = {
        "python",
        "python_implementation",
        "python_compiler",
        "platform_system",
        "platform_release",
        "platform_machine",
        "platform_tag",
        "python_executable_sha256",
        "native_binary_manifest_hash",
        "numpy_build_config_hash",
        "blas_backend_hash",
        "threadpool_runtime_hash",
        "threadpool_runtime_entry_count",
        "python_thread_count",
        "thread_environment",
        "arviz",
        "numpy",
        "pymc",
        "scipy",
        "threadpoolctl",
    }
    if not isinstance(runtime, dict) or set(runtime) != expected_runtime_keys:
        raise ValueError("execution runtime shape is invalid")
    integer_runtime_keys = {"threadpool_runtime_entry_count", "python_thread_count"}
    string_runtime_keys = (
        expected_runtime_keys - {"thread_environment"} - integer_runtime_keys
    )
    if any(
        not isinstance(runtime[key], str) or not runtime[key]
        for key in string_runtime_keys
    ) or not all(
        _SHA256_RE.fullmatch(runtime[key])
        for key in (
            "python_executable_sha256",
            "native_binary_manifest_hash",
            "numpy_build_config_hash",
            "blas_backend_hash",
            "threadpool_runtime_hash",
        )
    ):
        raise ValueError("execution runtime values are invalid")
    if (
        isinstance(runtime["threadpool_runtime_entry_count"], bool)
        or not isinstance(runtime["threadpool_runtime_entry_count"], int)
        or runtime["threadpool_runtime_entry_count"] < 0
        or isinstance(runtime["python_thread_count"], bool)
        or runtime["python_thread_count"] != 1
    ):
        raise ValueError("execution runtime thread counts are invalid")
    if any(
        runtime[package] != version
        for package, version in _EXPECTED_RUNTIME_PACKAGE_VERSIONS.items()
    ):
        raise ValueError("execution runtime package versions are invalid")
    thread_environment = runtime["thread_environment"]
    if (
        not isinstance(thread_environment, dict)
        or set(thread_environment) != _THREAD_ENV_KEYS
        or any(value != "1" for value in thread_environment.values())
    ):
        raise ValueError("execution thread environment is not pinned")
    body = {key: value for key, value in identity.items() if key != "identity_hash"}
    if identity["identity_hash"] != sha256_json(body):
        raise ValueError("execution identity hash is invalid")


def _emit_measurement_calibration_artifact(
    study: MeasurementCalibrationStudy,
    *,
    execution_recomputation_hash: str,
    execution_verification: MeasurementCalibrationExecutionVerification | None,
    execution_identity: dict | None,
    generated_at: str | None = None,
) -> dict:
    validate_measurement_calibration_study(study)
    if study.execution_mode == "full" and execution_verification is None:
        raise ValueError("full evidence requires verified resumable execution")
    if execution_verification is None:
        if execution_identity is not None:
            raise ValueError("unverified execution identity cannot enter the artifact")
    else:
        validate_measurement_calibration_execution_verification(
            study, execution_verification
        )
        validate_measurement_calibration_execution_identity(execution_identity)
        if (
            execution_identity["identity_hash"]
            != execution_verification.execution_identity_hash
            or execution_identity["primary_phase_hash"]
            != execution_verification.primary_phase_hash
            or execution_identity["recompute_phase_hash"]
            != execution_verification.recompute_phase_hash
            or execution_identity["primary_checkpoint_manifest_hash"]
            != execution_verification.primary_checkpoint_manifest_hash
            or execution_identity["recompute_checkpoint_manifest_hash"]
            != execution_verification.recompute_checkpoint_manifest_hash
            or execution_identity["primary_process_tokens_hash"]
            != execution_verification.primary_process_tokens_hash
            or execution_identity["recompute_process_tokens_hash"]
            != execution_verification.recompute_process_tokens_hash
        ):
            raise ValueError("execution identity does not match recomputation proof")
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
        "execution_identity": execution_identity
        or {
            "binding_state": "NOT_BOUND_SAME_PROCESS_EXECUTION",
            "identity_hash": None,
            "source_tree_clean": None,
        },
        "execution_recomputation": {
            "all_compiled_slots_freshly_recomputed": True,
            "slot_result_hashes_hash": execution_recomputation_hash,
            "verification_mode": (
                "separate_process_resumable_phase"
                if execution_verification is not None
                else "same_process_direct"
            ),
            "verification_hash": (
                execution_verification.verification_hash
                if execution_verification is not None
                else None
            ),
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


def emit_measurement_calibration_artifact(
    study: MeasurementCalibrationStudy,
    *,
    generated_at: str | None = None,
) -> dict:
    if study.execution_mode == "full":
        raise ValueError("full evidence requires the hardened resumable runner")
    execution_recomputation_hash = verify_study_execution_by_recomputation(study)
    return _emit_measurement_calibration_artifact(
        study,
        execution_recomputation_hash=execution_recomputation_hash,
        execution_verification=None,
        execution_identity=None,
        generated_at=generated_at,
    )


def _emit_measurement_calibration_artifact_from_execution_verification(
    study: MeasurementCalibrationStudy,
    *,
    execution_verification: MeasurementCalibrationExecutionVerification,
    execution_identity: dict,
    generated_at: str | None = None,
) -> dict:
    """Emit only from the runner's exact separate-phase recomputation proof."""

    return _emit_measurement_calibration_artifact(
        study,
        execution_recomputation_hash=(
            execution_verification.recomputation_slot_result_hashes_hash
        ),
        execution_verification=execution_verification,
        execution_identity=execution_identity,
        generated_at=generated_at,
    )


def run_measurement_calibration_proof(
    *, execution_mode: str = "smoke", generated_at: str | None = None
) -> dict:
    from .ai_fluency_measurement_calibration import run_measurement_calibration_study

    if execution_mode == "full":
        raise ValueError("full evidence requires the hardened resumable runner")
    return emit_measurement_calibration_artifact(
        run_measurement_calibration_study(execution_mode=execution_mode),
        generated_at=generated_at,
    )
