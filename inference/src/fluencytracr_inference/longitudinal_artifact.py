"""Internal-only longitudinal synthetic outcome proof artifact emitter."""

from __future__ import annotations

from datetime import datetime, timezone

import numpy as np

from . import __version__ as HARNESS_VERSION
from .design_router import route_evidence_design
from .hashing import sha256_json
from .longitudinal_model import (
    LongitudinalDiagnosticsResult,
    LongitudinalFitResult,
    LongitudinalHoldViolation,
    compute_longitudinal_diagnostics,
    fit_longitudinal_model,
)
from .longitudinal_types import (
    COMPILED_DIRECTIONAL_DRAW_SHARE_SMOKE_FLOOR,
    COMPILED_MEANINGFUL_DRAW_SHARE_SMOKE_FLOOR,
    LONGITUDINAL_ARTIFACT_SCHEMA_VERSION,
    LONGITUDINAL_BLOCKED_OUTPUTS,
    LONGITUDINAL_MODEL_FAMILY,
    LONGITUDINAL_MODEL_SLICE,
    LongitudinalSyntheticDataset,
    assert_longitudinal_synthetic_only,
)


def longitudinal_proof_artifact_self_hash_body(artifact: dict) -> dict:
    import copy

    clone = copy.deepcopy(artifact)
    hash_bindings = clone.get("hash_bindings")
    if isinstance(hash_bindings, dict):
        hash_bindings.pop("artifact_self_hash", None)
    return clone


def longitudinal_proof_artifact_self_hash(artifact: dict) -> str:
    return sha256_json(longitudinal_proof_artifact_self_hash_body(artifact))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _blocked_outputs() -> dict:
    return {field: False for field in LONGITUDINAL_BLOCKED_OUTPUTS}


def _window_evidence(dataset: LongitudinalSyntheticDataset) -> dict:
    return {
        "baseline_window_count": dataset.pre_window_count,
        "post_window_count": dataset.post_window_count,
        "evaluation_window_refs": list(dataset.evaluation_window_refs),
        "all_required_windows_observed": not dataset.missing_window_refs,
        "all_required_windows_unsuppressed": not dataset.suppressed_window_refs,
        "all_required_windows_fresh": not dataset.stale_window_refs,
        "imputation_used": bool(dataset.imputed_window_refs),
        "missing_window_refs": list(dataset.missing_window_refs),
        "suppressed_window_refs": list(dataset.suppressed_window_refs),
        "stale_window_refs": list(dataset.stale_window_refs),
        "imputed_window_refs": list(dataset.imputed_window_refs),
    }


def _vbd_evidence(dataset: LongitudinalSyntheticDataset) -> dict:
    movement = _vbd_movement_summary(dataset)
    return {
        "velocity_exposure_role": dataset.hypothesis_plan.expected_vbd_signature["velocity"],
        "breadth_exposure_role": dataset.hypothesis_plan.expected_vbd_signature["breadth"],
        "depth_context_role": dataset.hypothesis_plan.expected_vbd_signature["depth"],
        "lag_windows": dataset.hypothesis_plan.expected_outcome_signal_lag_windows,
        "future_values_used": False,
        "separate_velocity_breadth_terms": True,
        "depth_context_only": True,
        "movement_checks": movement,
        "source_window_refs": list(dataset.window_refs),
    }


def _business_control_evidence(
    dataset: LongitudinalSyntheticDataset,
    failing_diagnostics: list[str],
) -> dict:
    unsafe_controls = "person_level_data_present" in failing_diagnostics
    return {
        "control_names": [] if unsafe_controls else list(dataset.control_names),
        "control_source_refs": [] if unsafe_controls else list(dataset.control_source_refs),
        "synthetic_aggregate_placeholders_only": True,
        "unsafe_control_refs_redacted": bool(unsafe_controls),
        "hris_or_personnel_fields_present": False,
        "source_hashes": [] if unsafe_controls else list(dataset.control_source_hashes),
    }


def _vbd_movement_summary(dataset: LongitudinalSyntheticDataset) -> dict:
    eval_mask = np.isin(dataset.window_refs, dataset.evaluation_window_refs)
    pre_mask = dataset.post == 0

    def summarize(values: np.ndarray, role: str) -> dict:
        pre_mean = float(values[pre_mask].mean())
        eval_mean = float(values[eval_mask].mean())
        delta = eval_mean - pre_mean
        requires_positive = "POSITIVE" in role
        moved_as_expected = bool(delta >= 0.05) if requires_positive else True
        return {
            "role": role,
            "pre_period_mean": pre_mean,
            "evaluation_window_mean": eval_mean,
            "evaluation_minus_pre_delta": float(delta),
            "positive_movement_required": bool(requires_positive),
            "moved_as_expected": moved_as_expected,
        }

    signature = dataset.hypothesis_plan.expected_vbd_signature
    return {
        "velocity": summarize(dataset.velocity_exposure, signature["velocity"]),
        "breadth": summarize(dataset.breadth_exposure, signature["breadth"]),
        "depth": summarize(dataset.depth_exposure, signature["depth"]),
    }


def _pathway_evidence(
    dataset: LongitudinalSyntheticDataset,
    fit: LongitudinalFitResult | None,
    diagnostics: LongitudinalDiagnosticsResult | None,
) -> dict:
    if fit is None or diagnostics is None:
        return {
            "pathway_state": "HOLD",
            "velocity_moved_as_expected": False,
            "breadth_moved_as_expected": False,
            "depth_moved_as_expected": False,
            "meaningful_primary_outcome_movement_supported": False,
            "approved_lag_respected": False,
            "quality_guardrail_acceptable": False,
        }
    summary = fit.movement_summary()
    coefficient_summary = fit.coefficient_summary()
    movement = _vbd_movement_summary(dataset)
    draw_share_diagnostics = summary["internal_draw_share_diagnostics"]
    meaningful = (
        draw_share_diagnostics[
            "movement_exceeds_compiled_synthetic_smoke_minimum_draw_share"
        ]
        >= COMPILED_MEANINGFUL_DRAW_SHARE_SMOKE_FLOOR
        and summary["credible_interval_80"]["lower"] > 0.0
    )
    if diagnostics.failing_diagnostics:
        state = "HOLD"
    elif meaningful:
        state = "BEHAVIOR_AND_OUTCOME_ALIGNED"
    elif (
        draw_share_diagnostics["movement_greater_than_zero_draw_share"]
        > COMPILED_DIRECTIONAL_DRAW_SHARE_SMOKE_FLOOR
    ):
        state = "BEHAVIOR_MOVED_OUTCOME_UNCERTAIN"
    else:
        state = "NO_MEANINGFUL_MOVEMENT"
    return {
        "pathway_state": state,
        "velocity_moved_as_expected": movement["velocity"]["moved_as_expected"],
        "breadth_moved_as_expected": movement["breadth"]["moved_as_expected"],
        "depth_moved_as_expected": movement["depth"]["moved_as_expected"],
        "posterior_direction_beta_velocity": (
            "positive"
            if coefficient_summary["beta_velocity"]["posterior_mean"] > 0.0
            else "not_positive"
        ),
        "posterior_direction_beta_breadth": (
            "positive"
            if coefficient_summary["beta_breadth"]["posterior_mean"] > 0.0
            else "not_positive"
        ),
        "depth_context_only": True,
        "meaningful_primary_outcome_movement_supported": bool(meaningful),
        "approved_lag_respected": diagnostics.lag_sensitivity_check["pass"],
        "quality_guardrail_acceptable": True,
    }


def emit_longitudinal_proof_artifact(
    dataset: LongitudinalSyntheticDataset,
    *,
    fit: LongitudinalFitResult | None,
    diagnostics: LongitudinalDiagnosticsResult | None,
    failing_diagnostics: tuple[str, ...] = (),
    generated_at: str | None = None,
) -> dict:
    assert_longitudinal_synthetic_only(dataset)
    generated_at = generated_at or _now()
    route = route_evidence_design(
        dataset.hypothesis_plan.evidence_design,
        synthetic_only=not (
            dataset.real_data_present
            or dataset.customer_data_present
            or dataset.production_data_present
            or dataset.live_data_source_present
        ),
        historical_requirements_met=(
            dataset.pre_window_count >= 8
            and dataset.post_window_count >= 3
            and not dataset.missing_window_refs
            and not dataset.suppressed_window_refs
            and not dataset.stale_window_refs
            and not dataset.imputed_window_refs
        ),
    )
    all_failures = list(failing_diagnostics)
    if diagnostics is not None:
        all_failures.extend(diagnostics.failing_diagnostics)
    all_failures = list(dict.fromkeys(all_failures))
    movement_summary = fit.movement_summary() if fit is not None else None
    if all_failures:
        state = "HOLD"
    elif movement_summary and movement_summary["credible_interval_80"]["lower"] > 0.0:
        state = "eligible_internal_smoke_only"
    else:
        state = "valid_internal_non_authorizing"

    source_hashes = dataset.source_hashes()
    artifact = {
        "schema_version": LONGITUDINAL_ARTIFACT_SCHEMA_VERSION,
        "artifact_class": "internal_synthetic_longitudinal_outcome_proof",
        "generated_at": generated_at,
        "harness_version": HARNESS_VERSION,
        "model_family": LONGITUDINAL_MODEL_FAMILY,
        "model_slice": LONGITUDINAL_MODEL_SLICE,
        "design_route": route.to_artifact_section(),
        "hypothesis_binding": dataset.hypothesis_plan.to_artifact_section(),
        "primary_metric_binding": {
            "metric_id": dataset.hypothesis_plan.primary_metric_id,
            "metric_family": dataset.hypothesis_plan.primary_metric_family,
            "expected_direction": dataset.hypothesis_plan.expected_metric_direction,
            "minimum_worthwhile_change": float(
                dataset.hypothesis_plan.minimum_worthwhile_change
            ),
            "supporting_metric_ids": list(dataset.hypothesis_plan.supporting_metric_ids),
            "guardrail_metric_ids": list(dataset.hypothesis_plan.guardrail_metric_ids),
            "supporting_metrics_replace_primary_metric": False,
        },
        "baseline_and_post_window_evidence": _window_evidence(dataset),
        "ai_fluency_snapshot_evidence": [
            snapshot.to_artifact_section() for snapshot in dataset.ai_fluency_snapshots
        ],
        "vbd_exposure_evidence": _vbd_evidence(dataset),
        "business_control_evidence": {
            **_business_control_evidence(dataset, all_failures),
        },
        "model_specification": {
            "likelihood_family": "continuous_normal_identity",
            "link_function": "identity",
            "residual_structure": "ar1_residual_structure",
            "sampler_kind": (
                fit.sampler_kind
                if fit is not None
                else "not_fit_due_to_fail_closed_hold"
            ),
            "chains": fit.chains if fit is not None else 0,
            "synthetic_smoke_only": True,
            "replicated_calibration_complete": False,
        },
        "posterior_estimand_summary": movement_summary,
        "behavior_outcome_pathway_evidence": _pathway_evidence(dataset, fit, diagnostics),
        "diagnostics": (
            diagnostics.to_artifact_section()
            if diagnostics is not None
            else {
                "passed": False,
                "failing_diagnostics": all_failures,
            }
        ),
        "counterfactual_derivation": {
            "estimand_name": "internal_in_sample_vbd_contrast",
            "counterfactual_reference": "pre_period_velocity_breadth_reference_values_depth_context_retained",
            "retains_historical_trend": True,
            "retains_approved_business_controls": True,
            "retains_depth_as_context": True,
            "uses_future_values": False,
            "sets_predictors_to_zero": False,
            "direction_adjusted": True,
            "historical_forecast_counterfactual": False,
            "smoke_scope": "in_sample_vbd_contrast_not_historical_forecast",
        },
        "evidence_design_claim_cap": {
            "claim_cap": route.claim_cap,
            "customer_facing_claim_authorized": False,
            "causal_claim_authorized": False,
            "financial_claim_authorized": False,
        },
        "governance_state": {
            "state": state,
            "failing_diagnostics": all_failures,
            "full_pathway_coherence_authorized": False,
            "customer_output_authorized": False,
            "probability_output_authorized": False,
            "confidence_output_authorized": False,
            "promotion_decision_ref": None,
        },
        "synthetic_generator": {
            "generator_id": dataset.generator_id,
            "generator_version": dataset.generator_version,
            "seed": dataset.seed,
            "synthetic_input_hash": dataset.synthetic_input_hash(),
            "real_data_present": bool(dataset.real_data_present),
            "customer_data_present": bool(dataset.customer_data_present),
            "production_data_present": bool(dataset.production_data_present),
            "live_data_source_present": bool(dataset.live_data_source_present),
        },
        "source_hashes": source_hashes,
        "hash_bindings": {
            "synthetic_input_hash": dataset.synthetic_input_hash(),
            "source_hashes_hash": sha256_json(source_hashes),
            "artifact_self_hash": "",
        },
        "blocked_outputs": _blocked_outputs(),
        "internal_only": True,
        "synthetic_only": True,
        "numeric_values_role": "internal_validation_inputs_not_output",
        "customer_output_authorized": False,
        "probability_output_authorized": False,
        "confidence_output_authorized": False,
        "roi_output_authorized": False,
        "finance_output_authorized": False,
        "causality_output_authorized": False,
        "productivity_output_authorized": False,
        "full_pathway_coherence_authorized": False,
        "promotion_decision_ref": None,
    }
    artifact["hash_bindings"]["artifact_self_hash"] = longitudinal_proof_artifact_self_hash(
        artifact
    )
    return artifact


def run_longitudinal_proof(
    dataset: LongitudinalSyntheticDataset,
    *,
    seed: int = 20260710,
    generated_at: str | None = None,
) -> tuple[dict, dict]:
    """Fit, diagnose, and emit one synthetic longitudinal proof artifact."""

    assert_longitudinal_synthetic_only(dataset)
    fit: LongitudinalFitResult | None = None
    diagnostics: LongitudinalDiagnosticsResult | None = None
    failing: tuple[str, ...] = ()
    try:
        fit = fit_longitudinal_model(dataset, seed=seed)
        diagnostics = compute_longitudinal_diagnostics(fit)
    except LongitudinalHoldViolation as exc:
        failing = (exc.failing_diagnostic,)
    artifact = emit_longitudinal_proof_artifact(
        dataset,
        fit=fit,
        diagnostics=diagnostics,
        failing_diagnostics=failing,
        generated_at=generated_at,
    )
    return artifact, {
        "fit_available": fit is not None,
        "diagnostics_available": diagnostics is not None,
        "failing_diagnostics": artifact["governance_state"]["failing_diagnostics"],
        "synthetic_smoke_only": True,
        "replicated_calibration_complete": False,
    }
