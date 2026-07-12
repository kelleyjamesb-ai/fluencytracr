"""Internal-only longitudinal synthetic outcome proof artifact emitter."""

from __future__ import annotations

from datetime import datetime, timezone
import re

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
    LONGITUDINAL_FAILING_DIAGNOSTICS,
    LONGITUDINAL_MODEL_FAMILY,
    LONGITUDINAL_MODEL_SLICE,
    LongitudinalSyntheticDataset,
    validate_longitudinal_dataset_structure,
    validate_longitudinal_seed,
)


_RUN_LONGITUDINAL_PROOF_EMISSION_TOKEN = object()
_RFC3339_TIMESTAMP = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$"
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


def longitudinal_proof_artifact_payload_hash_body(artifact: dict) -> dict:
    """Return the emitted payload without its opaque/hash-binding envelope."""

    import copy

    clone = copy.deepcopy(artifact)
    clone.pop("hash_bindings", None)
    return clone


def longitudinal_proof_artifact_payload_hash(artifact: dict) -> str:
    return sha256_json(longitudinal_proof_artifact_payload_hash_body(artifact))


def longitudinal_proof_input_evidence_hash_body(artifact: dict) -> dict:
    diagnostics = artifact["diagnostics"]
    no_fit = diagnostics.get("fit_summary_hash") is None
    generator = artifact["synthetic_generator"]
    return {
        "design_route": artifact["design_route"],
        "hypothesis_binding": artifact["hypothesis_binding"],
        "primary_metric_binding": artifact["primary_metric_binding"],
        "baseline_and_post_window_evidence": artifact[
            "baseline_and_post_window_evidence"
        ],
        "ai_fluency_snapshot_evidence": artifact["ai_fluency_snapshot_evidence"],
        "vbd_exposure_evidence": artifact["vbd_exposure_evidence"],
        "business_control_evidence": artifact["business_control_evidence"],
        "model_input_governance": artifact["model_input_governance"],
        "synthetic_generator": {
            key: generator[key]
            for key in (
                "generator_id",
                "generator_version",
                "seed",
                "real_data_present",
                "customer_data_present",
                "production_data_present",
                "live_data_source_present",
            )
        },
        "source_hashes": artifact["source_hashes"],
        "no_fit_evidence": (
            {
                "failing_diagnostics": diagnostics["failing_diagnostics"],
                "pre_fit_design_matrix_check": diagnostics[
                    "pre_fit_design_matrix_check"
                ],
            }
            if no_fit
            else None
        ),
    }


def longitudinal_proof_input_evidence_hash(artifact: dict) -> str:
    return sha256_json(longitudinal_proof_input_evidence_hash_body(artifact))


def longitudinal_proof_fit_output_evidence_hash_body(artifact: dict) -> dict:
    return {
        "posterior_estimand_summary": artifact["posterior_estimand_summary"],
        "model_fit_outputs": {
            "analytic_posterior_draw_count": artifact["model_specification"][
                "analytic_posterior_draw_count"
            ],
        },
        "behavior_outcome_pathway_evidence": artifact[
            "behavior_outcome_pathway_evidence"
        ],
    }


def longitudinal_proof_fit_output_evidence_hash(artifact: dict) -> str:
    return sha256_json(longitudinal_proof_fit_output_evidence_hash_body(artifact))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _validated_generated_at(value: str | None) -> str:
    if value is None:
        return _now()
    if not isinstance(value, str) or not _RFC3339_TIMESTAMP.fullmatch(value):
        raise ValueError("generated_at must be a timezone-aware RFC3339 timestamp")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(
            "generated_at must be a timezone-aware RFC3339 timestamp"
        ) from exc
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("generated_at must be a timezone-aware RFC3339 timestamp")
    return value


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
) -> dict:
    return {
        "control_names": list(dataset.control_names),
        "control_source_refs": list(dataset.control_source_refs),
        "synthetic_aggregate_placeholders_only": True,
        "unsafe_control_refs_redacted": False,
        "hris_or_personnel_fields_present": False,
        "source_hashes": list(dataset.control_source_hashes),
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
            "quality_guardrail_state": "NOT_EVALUATED",
            "pathway_evidence_authorized": False,
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
        state = "INTERNAL_SMOKE_CONTRAST_OBSERVED"
    elif (
        draw_share_diagnostics["movement_greater_than_zero_draw_share"]
        > COMPILED_DIRECTIONAL_DRAW_SHARE_SMOKE_FLOOR
    ):
        state = "INTERNAL_SMOKE_DIRECTIONAL_ONLY"
    else:
        state = "NO_INTERNAL_SMOKE_MOVEMENT"
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
        "quality_guardrail_state": "NOT_EVALUATED",
        "pathway_evidence_authorized": False,
    }


def _validate_fit_and_diagnostics_bindings(
    dataset: LongitudinalSyntheticDataset,
    fit: LongitudinalFitResult | None,
    diagnostics: LongitudinalDiagnosticsResult | None,
) -> None:
    if (fit is None) != (diagnostics is None):
        raise ValueError("longitudinal fit and diagnostics must be emitted together")
    if fit is None or diagnostics is None:
        return
    if not isinstance(fit, LongitudinalFitResult):
        raise ValueError("longitudinal fit must be a LongitudinalFitResult")
    if not isinstance(diagnostics, LongitudinalDiagnosticsResult):
        raise ValueError(
            "longitudinal diagnostics must be a LongitudinalDiagnosticsResult"
        )

    validate_longitudinal_seed(fit.seed, name="longitudinal fit seed")
    synthetic_input_hash = dataset.synthetic_input_hash()
    if fit.synthetic_input_hash != synthetic_input_hash:
        raise ValueError("longitudinal fit is not bound to the emitted dataset")
    if fit.dataset.synthetic_input_hash() != synthetic_input_hash:
        raise ValueError("longitudinal fit dataset does not match emitted dataset")
    if fit.sampler_kind != "closed_form_gaussian_analytic_smoke":
        raise ValueError("longitudinal fit is not the approved closed-form smoke engine")
    if fit.mcmc_chains != 0:
        raise ValueError("longitudinal smoke fit must not claim MCMC chains")
    expected_parameter_names = (
        "intercept",
        "historical_time_trend",
        "beta_velocity",
        "beta_breadth",
        "beta_fluency_context",
        *(f"control_{name}" for name in dataset.control_names),
    )
    if fit.parameter_names != expected_parameter_names:
        raise ValueError(
            "longitudinal fit parameters do not match the approved Depth-free design"
        )
    parameter_count = len(expected_parameter_names)
    posterior_mean = np.asarray(fit.posterior_mean)
    posterior_covariance = np.asarray(fit.posterior_covariance)
    posterior_draws = np.asarray(fit.posterior_draws)
    movement_draws = np.asarray(fit.movement_draws)
    counterfactual_movement_draws = np.asarray(fit.counterfactual_movement_draws)
    if posterior_mean.shape != (parameter_count,):
        raise ValueError("longitudinal posterior mean has invalid shape")
    if posterior_covariance.shape != (parameter_count, parameter_count):
        raise ValueError("longitudinal posterior covariance has invalid shape")
    if (
        posterior_draws.ndim != 3
        or posterior_draws.shape[-1] != parameter_count
        or any(size < 1 for size in posterior_draws.shape[:2])
    ):
        raise ValueError("longitudinal analytic posterior draws have invalid shape")
    analytic_draw_count = int(np.prod(posterior_draws.shape[:2]))
    if (
        isinstance(fit.analytic_posterior_draw_count, bool)
        or not isinstance(fit.analytic_posterior_draw_count, int)
        or fit.analytic_posterior_draw_count != analytic_draw_count
        or movement_draws.size != analytic_draw_count
        or counterfactual_movement_draws.size != analytic_draw_count
    ):
        raise ValueError("longitudinal analytic draw counts are inconsistent")
    for name, values in (
        ("posterior_mean", posterior_mean),
        ("posterior_covariance", posterior_covariance),
        ("posterior_draws", posterior_draws),
        ("movement_draws", movement_draws),
        ("counterfactual_movement_draws", counterfactual_movement_draws),
    ):
        if (
            not np.issubdtype(values.dtype, np.number)
            or not np.isrealobj(values)
            or not np.all(np.isfinite(values))
        ):
            raise ValueError(f"longitudinal fit {name} must be finite")
    fit_scalars = (
        fit.residual_rho_estimate,
        fit.residual_sd_estimate,
        fit.design_matrix_condition_number,
    )
    if not all(np.isfinite(value) for value in fit_scalars):
        raise ValueError("longitudinal fit scalar summaries must be finite")
    if fit.residual_sd_estimate <= 0.0 or fit.design_matrix_condition_number <= 0.0:
        raise ValueError("longitudinal fit scale summaries must be positive")
    if fit.design_matrix_rank != parameter_count:
        raise ValueError("longitudinal fit rank does not match the approved design")

    expected_diagnostics = compute_longitudinal_diagnostics(fit)
    if diagnostics.fit_summary_hash != expected_diagnostics.fit_summary_hash:
        raise ValueError("longitudinal diagnostics are not bound to the emitted fit")
    if diagnostics.to_artifact_section() != expected_diagnostics.to_artifact_section():
        raise ValueError("longitudinal diagnostics do not match the emitted fit")


def emit_longitudinal_proof_artifact(
    dataset: LongitudinalSyntheticDataset,
    *,
    fit: LongitudinalFitResult | None,
    diagnostics: LongitudinalDiagnosticsResult | None,
    failing_diagnostics: tuple[str, ...] = (),
    pre_fit_hold_evidence: dict | None = None,
    generated_at: str | None = None,
    _runner_token: object | None = None,
) -> dict:
    validate_longitudinal_dataset_structure(dataset)
    generated_at = _validated_generated_at(generated_at)
    synthetic_input_private_remainder_hash = dataset.synthetic_input_hash()
    _validate_fit_and_diagnostics_bindings(dataset, fit, diagnostics)
    unsupported_failures = sorted(
        set(failing_diagnostics).difference(LONGITUDINAL_FAILING_DIAGNOSTICS)
    )
    if unsupported_failures:
        raise ValueError(
            "unsupported longitudinal failing diagnostics: "
            + ", ".join(unsupported_failures)
        )
    if diagnostics is not None and failing_diagnostics:
        raise ValueError(
            "runner-level failing diagnostics cannot be attached to a completed fit"
        )
    if pre_fit_hold_evidence is not None and failing_diagnostics != (
        "design_matrix_identifiability",
    ):
        raise ValueError(
            "pre-fit design evidence requires design_matrix_identifiability HOLD"
        )
    if fit is None and not failing_diagnostics:
        raise ValueError(
            "non-HOLD longitudinal artifact emission is owned by run_longitudinal_proof"
        )
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
    else:
        state = "valid_internal_smoke_non_authorizing"
    if _runner_token is not _RUN_LONGITUDINAL_PROOF_EMISSION_TOKEN:
        raise ValueError(
            "longitudinal artifact emission is owned by run_longitudinal_proof"
        )

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
            **_business_control_evidence(dataset),
        },
        "model_specification": {
            "model_kind": "closed_form_gaussian_longitudinal_smoke_regression",
            "likelihood_family": "continuous_normal_identity",
            "link_function": "identity",
            "residual_structure": "independent_gaussian_with_posthoc_ar1_diagnostic_only",
            "posterior_engine": "closed_form_gaussian_analytic_draws",
            "nuts_sampler_used": False,
            "ar1_likelihood_modeled": False,
            "partial_pooling_implemented": False,
            "historical_forecast": False,
            "mcmc_chains": 0,
            "analytic_posterior_draw_count": (
                fit.analytic_posterior_draw_count if fit is not None else 0
            ),
            "synthetic_smoke_only": True,
            "replicated_calibration_complete": False,
        },
        "model_input_governance": {
            "target_value_used_as_prior": bool(
                dataset.hypothesis_plan.target_value_used_as_prior
            ),
            "minimum_worthwhile_change_used_in_inference": False,
        },
        "posterior_estimand_summary": movement_summary,
        "behavior_outcome_pathway_evidence": _pathway_evidence(dataset, fit, diagnostics),
        "diagnostics": (
            diagnostics.to_artifact_section()
            if diagnostics is not None
            else {
                "executed_checks_passed": False,
                "fit_summary_hash": None,
                "failing_diagnostics": all_failures,
                "pre_fit_design_matrix_check": pre_fit_hold_evidence,
                "placebo_intervention_date_check": {
                    "status": "NOT_RUN",
                    "reason": "pre_period_placebo_not_run_in_closed_form_smoke",
                },
                "counterfactual_stability_check": {
                    "status": "NOT_RUN",
                    "reason": (
                        "full_counterfactual_stability_not_run_in_closed_form_smoke"
                    ),
                },
                "prior_sensitivity_check": {
                    "status": "NOT_RUN",
                    "reason": "prior_sensitivity_refits_not_run_in_closed_form_smoke",
                },
                "posterior_predictive_check": {
                    "status": "NOT_RUN",
                    "reason": (
                        "posterior_predictive_check_not_run_in_closed_form_smoke"
                    ),
                },
                "sampler_diagnostics": {
                    "status": "NOT_RUN",
                    "reason": "closed_form_smoke_has_no_mcmc_sampler",
                },
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
            "synthetic_input_hash": "",
            "real_data_present": bool(dataset.real_data_present),
            "customer_data_present": bool(dataset.customer_data_present),
            "production_data_present": bool(dataset.production_data_present),
            "live_data_source_present": bool(dataset.live_data_source_present),
        },
        "source_hashes": source_hashes,
        "hash_bindings": {
            "synthetic_input_hash": "",
            "synthetic_input_private_remainder_hash": (
                synthetic_input_private_remainder_hash
            ),
            "input_evidence_hash": "",
            "fit_summary_hash": "" if diagnostics is not None else None,
            "diagnostics_fit_summary_hash": (
                diagnostics.fit_summary_hash if diagnostics is not None else None
            ),
            "fit_private_remainder_hash": (
                fit.fit_summary_hash() if fit is not None else None
            ),
            "diagnostics_evidence_hash": (
                diagnostics.evidence_hash() if diagnostics is not None else None
            ),
            "fit_output_evidence_hash": "" if diagnostics is not None else None,
            "source_hashes_hash": sha256_json(source_hashes),
            "artifact_payload_hash": "",
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
    input_evidence_hash = longitudinal_proof_input_evidence_hash(artifact)
    synthetic_input_hash = sha256_json(
        {
            "input_evidence_hash": input_evidence_hash,
            "synthetic_input_private_remainder_hash": (
                synthetic_input_private_remainder_hash
            ),
        }
    )
    artifact["synthetic_generator"]["synthetic_input_hash"] = synthetic_input_hash
    artifact["hash_bindings"]["synthetic_input_hash"] = synthetic_input_hash
    artifact["hash_bindings"]["input_evidence_hash"] = input_evidence_hash
    if diagnostics is not None:
        fit_output_evidence_hash = longitudinal_proof_fit_output_evidence_hash(
            artifact
        )
        artifact["hash_bindings"][
            "fit_output_evidence_hash"
        ] = fit_output_evidence_hash
        artifact["hash_bindings"]["fit_summary_hash"] = sha256_json(
            {
                "synthetic_input_hash": synthetic_input_hash,
                "diagnostics_fit_summary_hash": diagnostics.fit_summary_hash,
                "fit_output_evidence_hash": fit_output_evidence_hash,
            }
        )
    artifact["hash_bindings"]["artifact_payload_hash"] = (
        longitudinal_proof_artifact_payload_hash(artifact)
    )
    artifact["hash_bindings"]["artifact_self_hash"] = (
        longitudinal_proof_artifact_self_hash(artifact)
    )
    return artifact


def run_longitudinal_proof(
    dataset: LongitudinalSyntheticDataset,
    *,
    seed: int = 20260710,
    generated_at: str | None = None,
) -> tuple[dict, dict]:
    """Fit, diagnose, and emit one synthetic longitudinal proof artifact."""

    validate_longitudinal_dataset_structure(dataset)
    fit: LongitudinalFitResult | None = None
    diagnostics: LongitudinalDiagnosticsResult | None = None
    failing: tuple[str, ...] = ()
    pre_fit_hold_evidence: dict | None = None
    try:
        fit = fit_longitudinal_model(dataset, seed=seed)
        diagnostics = compute_longitudinal_diagnostics(fit)
    except LongitudinalHoldViolation as exc:
        failing = (exc.failing_diagnostic,)
        pre_fit_hold_evidence = exc.hold_evidence
    artifact = emit_longitudinal_proof_artifact(
        dataset,
        fit=fit,
        diagnostics=diagnostics,
        failing_diagnostics=failing,
        pre_fit_hold_evidence=pre_fit_hold_evidence,
        generated_at=generated_at,
        _runner_token=_RUN_LONGITUDINAL_PROOF_EMISSION_TOKEN,
    )
    return artifact, {
        "fit_available": fit is not None,
        "diagnostics_available": diagnostics is not None,
        "failing_diagnostics": artifact["governance_state"]["failing_diagnostics"],
        "synthetic_smoke_only": True,
        "replicated_calibration_complete": False,
    }
