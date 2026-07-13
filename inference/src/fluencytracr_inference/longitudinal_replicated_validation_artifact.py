"""Strict summary-only artifact for longitudinal replicated validation."""

from __future__ import annotations

from datetime import datetime
import math
import re

from . import __version__
from .hashing import sha256_json
from .longitudinal_replicated_validation import (
    CalibrationChunkResult,
    CalibrationSlotResult,
    ExecutionIdentity,
    build_execution_identity,
    generated_at_now,
    load_complete_calibration_workspace,
    longitudinal_replicated_validation_plan,
    required_calibration_slots,
    run_calibration_slot,
    runner_implementation_manifest,
    summarize_calibration_results,
)
from .longitudinal_replicated_validation_controls import (
    ControlStudyResult,
    load_control_workspace,
    longitudinal_control_plan,
    run_control_smoke,
)
from .longitudinal_state_space import (
    STATE_SPACE_CUBATURE_POINT_COUNT,
    STATE_SPACE_FIXED_EFFECT_PRIOR_SD,
    STATE_SPACE_GROUP_SCALE_PRIOR_SD,
    STATE_SPACE_INNOVATION_SCALE_PRIOR_SD,
    STATE_SPACE_MODEL_KIND,
    STATE_SPACE_PRIMARY_ENGINE,
    STATE_SPACE_RHO_ABS_BOUND,
)


LONGITUDINAL_REPLICATED_VALIDATION_ARTIFACT_SCHEMA_VERSION = (
    "FT_AI_VALUE_LONGITUDINAL_REPLICATED_VALIDATION_2026_07_V1"
)
LONGITUDINAL_REPLICATED_VALIDATION_ARTIFACT_CLASS = (
    "internal_synthetic_longitudinal_replicated_validation"
)
LONGITUDINAL_REPLICATED_VALIDATION_MODEL_FAMILY = (
    "bayesian_ai_value_realization_and_human_transformation_model_family"
)
LONGITUDINAL_REPLICATED_VALIDATION_MODEL_SLICE = (
    "longitudinal_state_space_replicated_validation"
)
LONGITUDINAL_REPLICATED_VALIDATION_PYTHON_REQUIRES = ">=3.13,<3.14"
LONGITUDINAL_REPLICATED_VALIDATION_HASH_POSTURE = (
    "consistency_and_drift_detection_not_coordinated_replacement_authenticity"
)
_FULL_EMISSION_TOKEN = object()
_RFC3339_WITH_SECONDS_RE = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$"
)


def _validated_generated_at(value: str | None) -> str:
    generated_at = value or generated_at_now()
    if (
        not isinstance(generated_at, str)
        or not _RFC3339_WITH_SECONDS_RE.fullmatch(generated_at)
    ):
        raise ValueError("generated_at must be a timezone-aware RFC3339 string")
    try:
        parsed = datetime.fromisoformat(generated_at.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("generated_at must be a timezone-aware RFC3339 string") from exc
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("generated_at must include a timezone offset")
    return generated_at


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
        "primary_engine": STATE_SPACE_PRIMARY_ENGINE,
        "posterior_draws_generated": False,
        "latent_states_emitted": False,
        "deterministic_cubature_point_count": STATE_SPACE_CUBATURE_POINT_COUNT,
        "calibration_engine": "deterministic_state_space_primary_only",
        "nuts_concordance_reused_not_rerun": True,
        "accepted_concordance_artifact_sha256": (
            "0497ec12e432da0f0e270093df616c3b2a822b1fbc3c9c40070f963c53fd7b08"
        ),
        "accepted_concordance_review_record": (
            "inference/evidence/"
            "longitudinal_state_space_nuts_concordance_acceptance_2026_07.json"
        ),
        "thresholds_runtime_configurable": False,
    }


def _blocked_outputs() -> dict:
    return {
        "customer_output_authorized": False,
        "probability_output_authorized": False,
        "confidence_output_authorized": False,
        "roi_output_authorized": False,
        "finance_output_authorized": False,
        "causality_output_authorized": False,
        "productivity_output_authorized": False,
        "creates_route": False,
        "creates_ui": False,
        "writes_persistence": False,
        "creates_export": False,
        "renders_readout": False,
        "executes_connector": False,
    }


def longitudinal_replicated_validation_payload_hash_body(artifact: dict) -> dict:
    return {key: value for key, value in artifact.items() if key != "hash_bindings"}


def longitudinal_replicated_validation_payload_hash(artifact: dict) -> str:
    return sha256_json(longitudinal_replicated_validation_payload_hash_body(artifact))


def longitudinal_replicated_validation_self_hash_body(artifact: dict) -> dict:
    body = dict(artifact)
    bindings = dict(body["hash_bindings"])
    bindings["artifact_self_hash"] = ""
    body["hash_bindings"] = bindings
    return body


def longitudinal_replicated_validation_self_hash(artifact: dict) -> str:
    return sha256_json(longitudinal_replicated_validation_self_hash_body(artifact))


def _chunk_manifest_summary(chunk: CalibrationChunkResult) -> dict:
    return {
        "chunk_index": chunk.chunk_index,
        "chunk_id": f"calibration_chunk_{chunk.chunk_index:02d}",
        "execution_mode": chunk.execution_mode,
        "slot_count": len(chunk.slot_results),
        "slot_result_hashes_hash": sha256_json(
            [result.result_hash for result in chunk.slot_results]
        ),
        "execution_identity_hash": chunk.execution_identity.identity_hash,
        "chunk_hash": chunk.chunk_hash,
    }


def emit_longitudinal_replicated_validation_artifact(
    *,
    execution_identity: ExecutionIdentity,
    calibration_results: tuple[CalibrationSlotResult, ...],
    calibration_chunks: tuple[CalibrationChunkResult, ...],
    control_study: ControlStudyResult,
    execution_mode: str,
    generated_at: str | None = None,
    _full_emission_token: object | None = None,
) -> dict:
    if execution_mode not in {"full", "smoke", "canary"}:
        raise ValueError("artifact execution mode must be full, smoke, or canary")
    if execution_mode == "full" and _full_emission_token is not _FULL_EMISSION_TOKEN:
        raise ValueError("full artifact emission requires the strict workspace loader")
    if control_study.execution_identity != execution_identity:
        raise ValueError("control and calibration execution identities must match")
    if any(chunk.execution_identity != execution_identity for chunk in calibration_chunks):
        raise ValueError("all calibration chunks must share the execution identity")
    if any(
        result.execution_identity_hash != execution_identity.identity_hash
        for result in calibration_results
    ):
        raise ValueError("all calibration rows must share the execution identity")
    current_manifest = runner_implementation_manifest()
    if current_manifest["implementation_hash"] != execution_identity.implementation_hash:
        raise ValueError("execution identity does not match the runner implementation")

    summary_mode = "full" if execution_mode == "full" else execution_mode
    calibration_summary = summarize_calibration_results(
        calibration_results,
        execution_mode=summary_mode,
    )
    chunk_summaries = tuple(
        _chunk_manifest_summary(chunk) for chunk in calibration_chunks
    )
    chunk_manifest_complete = (
        execution_mode == "full"
        and tuple(summary["chunk_index"] for summary in chunk_summaries)
        == tuple(range(20))
        and all(summary["execution_mode"] == "full" for summary in chunk_summaries)
    )
    failures = []
    if not execution_identity.source_tree_clean:
        failures.append("source_tree_not_clean")
    if not chunk_manifest_complete:
        failures.append("chunk_manifest_incomplete")
    failures.extend(
        f"calibration:{failure}"
        for failure in calibration_summary.failing_checks
    )
    failures.extend(
        f"controls:{failure}" for failure in control_study.failing_checks
    )
    numerical_pass = (
        execution_mode == "full"
        and execution_identity.source_tree_clean
        and chunk_manifest_complete
        and calibration_summary.study_status == "PASS"
        and control_study.study_status == "PASS"
    )
    full_evidence_generation_complete = (
        execution_mode == "full"
        and execution_identity.source_tree_clean
        and chunk_manifest_complete
        and calibration_summary.exact_manifest_complete
        and control_study.exact_manifest_complete
    )
    failures = list(dict.fromkeys(failures))
    combined_study_body = {
        "execution_mode": execution_mode,
        "execution_identity_hash": execution_identity.identity_hash,
        "calibration_study_result_hash": calibration_summary.study_result_hash,
        "control_study_result_hash": control_study.study_result_hash,
        "chunk_manifest_hashes": [summary["chunk_hash"] for summary in chunk_summaries],
        "calibration_result_hashes_hash": sha256_json(
            [result.result_hash for result in calibration_results]
        ),
        "numerical_validation_gate_passed": numerical_pass,
        "failing_checks": failures,
    }
    combined_study_hash = sha256_json(combined_study_body)
    artifact = {
        "schema_version": LONGITUDINAL_REPLICATED_VALIDATION_ARTIFACT_SCHEMA_VERSION,
        "artifact_class": LONGITUDINAL_REPLICATED_VALIDATION_ARTIFACT_CLASS,
        "generated_at": _validated_generated_at(generated_at),
        "harness_version": __version__,
        "python_requires": LONGITUDINAL_REPLICATED_VALIDATION_PYTHON_REQUIRES,
        "model_family": LONGITUDINAL_REPLICATED_VALIDATION_MODEL_FAMILY,
        "model_slice": LONGITUDINAL_REPLICATED_VALIDATION_MODEL_SLICE,
        "execution_mode": execution_mode,
        "execution_identity": execution_identity.to_dict(),
        "implementation_manifest": current_manifest,
        "model_specification": _model_specification(),
        "engine_specification": _engine_specification(),
        "calibration_plan": longitudinal_replicated_validation_plan(),
        "control_plan": longitudinal_control_plan(),
        "chunk_manifests": list(chunk_summaries),
        "calibration_slot_results": [
            result.to_dict() for result in calibration_results
        ],
        "calibration_summary": calibration_summary.to_dict(),
        "control_study": control_study.to_dict(),
        "combined_study": {
            **combined_study_body,
            "combined_study_hash": combined_study_hash,
        },
        "validation_scope": {
            "synthetic_only": True,
            "aggregate_only": True,
            "state_space_nuts_concordance_accepted": True,
            "replicated_validation_numerical_gate_passed": numerical_pass,
            "full_evidence_generation_complete": (
                full_evidence_generation_complete
            ),
            "independent_acceptance_complete": False,
            "longitudinal_proof_complete": False,
            "production_promotion_complete": False,
        },
        "governance_state": {
            "state": (
                "valid_internal_validation_non_authorizing"
                if numerical_pass
                else "HOLD"
            ),
            "failing_checks": failures,
            "numerical_validation_gate_passed": numerical_pass,
            "independent_acceptance_required": True,
            "independent_acceptance_complete": False,
            "proof_completion_authorized": False,
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
            "direct_identifiers_emitted": False,
        },
        "hash_bindings": {
            "calibration_plan_hash": longitudinal_replicated_validation_plan()[
                "plan_hash"
            ],
            "control_plan_hash": longitudinal_control_plan()["plan_hash"],
            "execution_identity_hash": execution_identity.identity_hash,
            "implementation_hash": current_manifest["implementation_hash"],
            "chunk_manifests_hash": sha256_json(list(chunk_summaries)),
            "calibration_slot_results_hash": sha256_json(
                [result.to_dict() for result in calibration_results]
            ),
            "calibration_study_result_hash": calibration_summary.study_result_hash,
            "control_study_result_hash": control_study.study_result_hash,
            "combined_study_hash": combined_study_hash,
            "artifact_payload_hash": "",
            "artifact_self_hash": "",
            "hash_posture": LONGITUDINAL_REPLICATED_VALIDATION_HASH_POSTURE,
        },
        "blocked_outputs": _blocked_outputs(),
        "internal_only": True,
        "synthetic_only": True,
        "numeric_values_role": "internal_synthetic_validation_not_customer_output",
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
        longitudinal_replicated_validation_payload_hash(artifact)
    )
    artifact["hash_bindings"]["artifact_self_hash"] = (
        longitudinal_replicated_validation_self_hash(artifact)
    )
    return artifact


def run_full_replicated_validation_artifact(
    *, workspace_dir: str, generated_at: str | None = None
) -> dict:
    identity, chunks, results = load_complete_calibration_workspace(workspace_dir)
    controls = load_control_workspace(workspace_dir)
    return emit_longitudinal_replicated_validation_artifact(
        execution_identity=identity,
        calibration_results=results,
        calibration_chunks=chunks,
        control_study=controls,
        execution_mode="full",
        generated_at=generated_at,
        _full_emission_token=_FULL_EMISSION_TOKEN,
    )


def run_replicated_validation_smoke_artifact(
    *, generated_at: str | None = None
) -> dict:
    identity = build_execution_identity(require_clean=False)
    result = run_calibration_slot(
        required_calibration_slots()[0],
        execution_identity=identity,
        execution_mode="smoke",
    )
    controls = run_control_smoke()
    if controls.execution_identity != identity:
        # Each smoke call gathers the same source/runtime identity. Rebuild the
        # control rows against the artifact identity if a commit changed mid-run.
        raise ValueError("smoke execution identity changed during execution")
    artifact = emit_longitudinal_replicated_validation_artifact(
        execution_identity=identity,
        calibration_results=(result,),
        calibration_chunks=(),
        control_study=controls,
        execution_mode="smoke",
        generated_at=generated_at,
    )
    if artifact["governance_state"]["state"] != "HOLD":
        raise AssertionError("replicated-validation smoke artifacts must HOLD")
    return artifact
