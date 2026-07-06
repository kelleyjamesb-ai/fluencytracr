"""Internal proof-artifact emitter (``InferenceProofArtifactSchema`` shape).

Emits the internal-only synthetic proof artifact exactly as the TypeScript
boundary (``packages/confidence-engine/src/confidenceModel.ts``,
``InferenceProofArtifactSchema``) validates it:

- ``eligible_internal_only`` ONLY when every diagnostic gate passes, the
  aggregate floors pass, the Measurement Cell window evidence is complete
  (observed, unsuppressed, fresh, unimputed), the comparison-cohort adequacy
  rubric is complete and passing, and the fixed-horizon peeking control
  passes. Anything else emits HOLD with every failing diagnostic named using
  the schema's failing-diagnostic vocabulary.
- Governance pins exactly as the schema demands: ``internal_only: true``,
  customer/probability/confidence/finance output false,
  ``promotion_decision_ref: null``, the full ordered blocked-uses list, and
  ``numeric_values_role: internal_validation_inputs_not_output``.
- Fixed-horizon one-look peeking fields: look 1 of 1, exactly one milestone,
  one metric, one cohort family.
- The artifact self-hash uses the Python reimplementation of the TS
  ``stableStringify`` + sha256 (:mod:`.hashing`) with
  ``hash_bindings.artifact_self_hash`` omitted, so the TypeScript boundary
  recomputes the identical digest.
"""

from __future__ import annotations

import hashlib
import math
from datetime import datetime, timezone
from pathlib import Path

from . import __version__ as HARNESS_VERSION
from .constants import (
    CONFIDENCE_MODEL_BLOCKED_USES,
    CONFIDENCE_MODEL_MINIMUM_COHORT_FLOOR,
    INFERENCE_PROOF_ARTIFACT_SCHEMA_VERSION,
    INFERENCE_PROOF_CALIBRATION_COVERAGE_MAX,
    INFERENCE_PROOF_CALIBRATION_COVERAGE_MIN,
    INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
    INFERENCE_PROOF_COMPARISON_COHORT_CRITERIA,
    INFERENCE_PROOF_FAILING_DIAGNOSTICS,
    INFERENCE_PROOF_LIKELIHOOD_FAMILIES,
    INFERENCE_PROOF_NULL_FALSE_ELIGIBILITY_MAX,
    LIKELIHOOD_FAMILY_LINKS,
    SUPPORTED_LIKELIHOOD_FAMILY,
)
from .diagnostics import DiagnosticsResult, compute_diagnostics, evaluate_gates
from .hashing import inference_proof_artifact_self_hash, sha256_json
from .model import FitResult, HoldViolation, fit_did_model
from .synthetic import SyntheticDataset

LOCKFILE_PATH = Path(__file__).resolve().parents[2] / "requirements.lock"


def lockfile_hash() -> str:
    return hashlib.sha256(LOCKFILE_PATH.read_bytes()).hexdigest()


# --- Phase B1 fixture inputs for the study-level sections --------------------
#
# The calibration study (>= 200 replications per effect/cohort cell), the
# null false-eligibility study, and the floor-enforcement study are Phase B2
# (task 3.3). The schema requires their sections in every artifact, so Phase
# B1 provides clearly labeled fixture inputs that prove the emitter and the
# gates; Phase B2 replaces them with computed replication results.

PHASE_B1_FIXTURE_SCENARIO_PREFIX = "phase-b1-fixture"


def phase_b1_fixture_calibration_scenarios() -> list[dict]:
    """PHASE B1 FIXTURE: placeholder calibration cells (B2 computes for real)."""
    scenarios = []
    for effect in (0, 0.2, 0.5):
        for cohort_size in (12, 16):
            replications = INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
            coverage = 0.8
            scenarios.append(
                {
                    "scenario_id": f"{PHASE_B1_FIXTURE_SCENARIO_PREFIX}-effect-{effect}-k{cohort_size}",
                    "injected_effect_size_sd": effect,
                    "cohort_size": cohort_size,
                    "replication_count": replications,
                    "credible_interval_level": 0.8,
                    "coverage_rate": coverage,
                    "coverage_standard_error": math.sqrt(
                        coverage * (1 - coverage) / replications
                    ),
                    "pass": True,
                }
            )
    return scenarios


def phase_b1_fixture_null_checks() -> dict:
    """PHASE B1 FIXTURE: placeholder null false-eligibility summary."""
    return {
        "null_effect_scenario_count": INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
        "false_eligibility_rate": 0.02,
        "pass": True,
    }


def phase_b1_fixture_floor_checks() -> dict:
    """PHASE B1 FIXTURE: placeholder floor-enforcement summary."""
    return {
        "k4_rejected": {
            "cohort_size": 4,
            "outcome": "rejected_below_schema_floor",
            "pass": True,
        },
        "k8_internal_only": {
            "cohort_size": 8,
            "outcome": "internal_only_display_ineligible",
            "valid_internal": True,
            "display_eligible": False,
            "pass": True,
        },
        "eligible_floor_cases": [
            {"cohort_size": 12, "valid_internal": True, "display_eligible": True, "pass": True},
            {"cohort_size": 16, "valid_internal": True, "display_eligible": True, "pass": True},
        ],
    }


# --- Section builders ---------------------------------------------------------


def _synthetic_generator_section(dataset: SyntheticDataset) -> dict:
    return {
        "generator_id": dataset.generator_id,
        "generator_version": dataset.generator_version,
        "seed_range": {"start_seed": int(dataset.seed), "end_seed": int(dataset.seed)},
        "synthetic_input_hash": dataset.synthetic_input_hash(),
        "real_data_present": False,
        "customer_data_present": False,
        "production_data_present": False,
        "live_data_source_present": False,
    }


def _model_spec_binding_section(likelihood_family: str) -> dict:
    return {
        "model_family": "bayesian_hierarchical_difference_in_differences_candidate",
        "estimand_name": "aggregate_selected_metric_movement",
        "estimand_units": "standardized_effect_sd",
        "likelihood_family": likelihood_family,
        "link_function": LIKELIHOOD_FAMILY_LINKS[likelihood_family],
        "aggregate_cell_variance_mode": "cohort_size_weighted_known_variance",
        "cohort_size_enters_likelihood": True,
        "missing_or_suppressed_windows_hold": True,
        "treatment_effect_pooling": "global",
        "pooling_structure": {
            "expectation_path": True,
            "workflow": True,
            "function": True,
            "cohort": True,
            "organization": True,
        },
    }


def _diagnostics_section(diagnostics: DiagnosticsResult) -> dict:
    sampler = diagnostics.sampler
    section: dict = {
        "sampler": {
            "parameters": [
                {
                    "parameter_name": p.parameter_name,
                    "r_hat": float(p.r_hat),
                    "bulk_ess": float(p.bulk_ess),
                    "tail_ess": float(p.tail_ess),
                    "posterior_mean_mcse": float(p.posterior_mean_mcse),
                    "interval_endpoint_mcse": float(p.interval_endpoint_mcse),
                    "posterior_sd": float(p.posterior_sd),
                    "max_mcse_to_posterior_sd_ratio": float(p.max_mcse_to_posterior_sd_ratio),
                }
                for p in sampler.parameters
            ],
            "post_warmup_divergences": int(sampler.post_warmup_divergences),
            "max_treedepth_saturation_rate": float(sampler.max_treedepth_saturation_rate),
            "max_treedepth_warning": bool(sampler.max_treedepth_warning),
            "energy_bfmi_min": float(sampler.energy_bfmi_min),
            "energy_bfmi_warning": bool(sampler.energy_bfmi_warning),
            # Rank and energy plot data are recorded as compact numeric
            # summaries in the internal report (no image files).
            "rank_plots_recorded": True,
            "energy_plots_recorded": True,
        },
        "pre_trend": {
            "pseudo_effect_credible_interval_80": {
                "lower": float(diagnostics.pre_trend.ci80_lower),
                "upper": float(diagnostics.pre_trend.ci80_upper),
            },
            "includes_zero": bool(diagnostics.pre_trend.includes_zero),
            "pass": bool(diagnostics.pre_trend.passed),
        },
    }
    if diagnostics.posterior_predictive_checks is None:
        section["posterior_predictive_checks"] = None
    else:
        section["posterior_predictive_checks"] = [
            {
                "statistic_name": s.statistic_name,
                "observed_value": float(s.observed_value),
                "posterior_predictive_summary": {
                    "mean": float(s.predictive_mean),
                    "credible_interval_80": {
                        "lower": float(s.predictive_ci80_lower),
                        "upper": float(s.predictive_ci80_upper),
                    },
                },
                "p_value": float(s.p_value),
                "pass": bool(s.passed),
            }
            for s in diagnostics.posterior_predictive_checks
        ]
    if diagnostics.prior_sensitivity is None:
        section["prior_sensitivity"] = None
    else:
        sensitivity = diagnostics.prior_sensitivity
        section["prior_sensitivity"] = {
            "empirical_prior_justification_documented": bool(sensitivity.documented),
            "empirical_prior_justification_ref": sensitivity.justification_ref,
            "empirical_prior_justification_hash": sensitivity.justification_hash,
            "posterior_mean_shift_in_posterior_sd": float(
                sensitivity.posterior_mean_shift_in_posterior_sd
            ),
            "pass": bool(sensitivity.passed),
        }
    return section


def _peeking_control_section(dataset: SyntheticDataset, *, control_pass: bool) -> dict:
    """Fixed-horizon one-look control: exactly one milestone/metric/cohort."""
    return {
        "procedure": "fixed_horizon_one_look_only",
        "repeated_evaluation": False,
        "look_index": 1,
        "total_planned_looks": 1,
        "milestone_days_included": [int(dataset.milestone_day)],
        "metrics_included": [dataset.metric_id],
        "cohorts_included": [dataset.cohort_family_id],
        "metric_family_bound": True,
        "cohort_family_bound": True,
        "sequential_method_name": None,
        "synthetic_null_proof_hash": None,
        "false_eligibility_bound": INFERENCE_PROOF_NULL_FALSE_ELIGIBILITY_MAX,
        "pass": bool(control_pass),
    }


def _comparison_adequacy_section(dataset: SyntheticDataset) -> dict:
    required_checks = [
        {"criterion": criterion, "pass": bool(dataset.comparison_rubric[criterion])}
        for criterion in INFERENCE_PROOF_COMPARISON_COHORT_CRITERIA
    ]
    all_pass = bool(dataset.comparison_cohort_present) and all(
        check["pass"] for check in required_checks
    )
    body = {
        "comparison_cohort_present": bool(dataset.comparison_cohort_present),
        "reviewer_owned_comparison_design_adequacy_ref": None,
        "required_checks": required_checks,
        "all_required_checks_pass": all_pass,
    }
    body["adequacy_proof_hash"] = sha256_json(body)
    return body


# --- Emitter --------------------------------------------------------------------


def emit_proof_artifact(
    *,
    dataset: SyntheticDataset,
    fit: FitResult,
    diagnostics: DiagnosticsResult,
    requested_likelihood_family: str = SUPPORTED_LIKELIHOOD_FAMILY,
    calibration_scenarios: list[dict] | None = None,
    null_checks: dict | None = None,
    floor_checks: dict | None = None,
    repeated_evaluation_detected: bool = False,
    generated_at: str | None = None,
) -> dict:
    """Build the schema-shaped artifact and derive its governance state.

    The state is ``eligible_internal_only`` only when the failing set is
    empty; otherwise HOLD with every failing diagnostic named. This mirrors
    the TypeScript gate logic so a Python-eligible artifact parses eligible
    at the boundary and a Python-HOLD artifact parses as a valid HOLD.
    """
    if requested_likelihood_family not in INFERENCE_PROOF_LIKELIHOOD_FAMILIES:
        raise ValueError(f"unknown likelihood family: {requested_likelihood_family!r}")

    calibration_scenarios = (
        calibration_scenarios
        if calibration_scenarios is not None
        else phase_b1_fixture_calibration_scenarios()
    )
    null_checks = null_checks if null_checks is not None else phase_b1_fixture_null_checks()
    floor_checks = floor_checks if floor_checks is not None else phase_b1_fixture_floor_checks()

    failing: set[str] = set(evaluate_gates(diagnostics))

    # Unsupported likelihood family: structurally typed, held (HoldViolation
    # path — the model refuses to fit non-normal families, and the artifact
    # names the family both here and in model_spec_binding).
    if requested_likelihood_family != SUPPORTED_LIKELIHOOD_FAMILY:
        failing.add("unsupported_likelihood_family")

    # Aggregate floors: k >= 5 schema floor plus stated-floor cross-check.
    declared_floor = int(dataset.declared_minimum_cohort_floor)
    if dataset.k < max(CONFIDENCE_MODEL_MINIMUM_COHORT_FLOOR, declared_floor):
        failing.add("floor_check")

    # Window evidence: missing/suppressed/stale/imputed windows HOLD; no
    # imputation rescue.
    window_section = dataset.window_evidence.to_artifact_section()
    if dataset.window_evidence.holds:
        failing.add("missing_or_suppressed_windows")
    peeking_section = _peeking_control_section(
        dataset, control_pass=not repeated_evaluation_detected
    )
    if sorted(window_section["required_milestone_days"]) != sorted(
        peeking_section["milestone_days_included"]
    ):
        failing.add("missing_or_suppressed_windows")

    # Comparison-cohort rule: no credible comparison cohort, no
    # comparison-supported contribution estimate — evidence-tier label only.
    comparison_section = _comparison_adequacy_section(dataset)
    if not comparison_section["all_required_checks_pass"]:
        failing.add("comparison_cohort_adequacy")

    # Fixed-horizon peeking pin: naive repeated evaluation HOLDS.
    if repeated_evaluation_detected:
        failing.add("peeking_control")

    # Study-level inputs (Phase B2 computes; the gates still bind here).
    for scenario in calibration_scenarios:
        if (
            not scenario["pass"]
            or scenario["coverage_rate"] < INFERENCE_PROOF_CALIBRATION_COVERAGE_MIN
            or scenario["coverage_rate"] > INFERENCE_PROOF_CALIBRATION_COVERAGE_MAX
        ):
            failing.add("calibration_coverage")
    if (
        not null_checks["pass"]
        or null_checks["false_eligibility_rate"] > INFERENCE_PROOF_NULL_FALSE_ELIGIBILITY_MAX
    ):
        failing.add("null_false_eligibility")

    failing_ordered = [
        name for name in INFERENCE_PROOF_FAILING_DIAGNOSTICS if name in failing
    ]
    state = "eligible_internal_only" if not failing_ordered else "HOLD"

    artifact = {
        "schema_version": INFERENCE_PROOF_ARTIFACT_SCHEMA_VERSION,
        "artifact_class": "internal_synthetic_inference_proof",
        "generated_at": generated_at
        if generated_at is not None
        else datetime.now(timezone.utc).isoformat(),
        "harness_version": HARNESS_VERSION,
        "lockfile_hash": lockfile_hash(),
        "synthetic_generator": _synthetic_generator_section(dataset),
        "model_spec_binding": _model_spec_binding_section(requested_likelihood_family),
        "measurement_cell_window_evidence": window_section,
        "diagnostics": _diagnostics_section(diagnostics),
        "calibration": {
            "scenarios": calibration_scenarios,
            "per_scenario_required": True,
        },
        "null_checks": null_checks,
        "floor_checks": floor_checks,
        "peeking_control": peeking_section,
        "comparison_adequacy": comparison_section,
        "governance_state": {
            "state": state,
            "failing_diagnostics": failing_ordered,
            # HOLD never authorizes; eligible authorizes only with a complete
            # passing comparison rubric (which eligibility already requires).
            "comparison_supported_contribution_estimate_authorized": state
            == "eligible_internal_only",
            "evidence_tier_only": not comparison_section["all_required_checks_pass"],
        },
        "hash_bindings": {
            "source_posterior_hash": sha256_json(fit.estimand_summary()),
            "synthetic_input_hash": dataset.synthetic_input_hash(),
        },
        "blocked_uses": list(CONFIDENCE_MODEL_BLOCKED_USES),
        "numeric_values_role": "internal_validation_inputs_not_output",
        "numeric_posterior_values_customer_authorized": False,
        "internal_only": True,
        "customer_output_authorized": False,
        "probability_output_authorized": False,
        "confidence_output_authorized": False,
        "finance_output_authorized": False,
        "creates_route": False,
        "creates_ui": False,
        "writes_persistence": False,
        "creates_export": False,
        "renders_readout": False,
        "executes_connector": False,
        "promotion_decision_ref": None,
    }
    artifact["hash_bindings"]["artifact_self_hash"] = inference_proof_artifact_self_hash(
        artifact
    )
    return artifact


def run_proof(
    dataset: SyntheticDataset,
    *,
    likelihood_family: str = SUPPORTED_LIKELIHOOD_FAMILY,
    draws: int = 2000,
    tune: int = 1000,
    chains: int = 2,
    seed: int = 20260706,
    target_accept: float = 0.99,
    max_treedepth: int = 12,
    prior_sensitivity_draws: int = 300,
    prior_sensitivity_tune: int = 400,
    pre_trend_draws: int = 400,
    pre_trend_tune: int = 400,
    calibration_scenarios: list[dict] | None = None,
    null_checks: dict | None = None,
    floor_checks: dict | None = None,
    repeated_evaluation_detected: bool = False,
    generated_at: str | None = None,
) -> tuple[dict, dict]:
    """Fit, diagnose, and emit: returns ``(artifact, internal_report)``.

    A non-normal ``likelihood_family`` raises :class:`HoldViolation` inside
    the model layer; this orchestrator turns it into a HOLD artifact naming
    the family: the diagnostics carrier is still the (supported) normal
    identity-link fit — documented, since the artifact must remain
    schema-complete — while ``model_spec_binding.likelihood_family`` records
    the requested family and the governance state HOLDS naming
    ``unsupported_likelihood_family``.
    """
    try:
        fit = fit_did_model(
            dataset,
            likelihood_family=likelihood_family,
            draws=draws,
            tune=tune,
            chains=chains,
            seed=seed,
            target_accept=target_accept,
            max_treedepth=max_treedepth,
        )
    except HoldViolation as violation:
        if violation.failing_diagnostic != "unsupported_likelihood_family":
            raise
        # Turn the HoldViolation into a HOLD artifact naming the family:
        # refit the supported normal identity-link carrier so the artifact
        # stays schema-complete, then HOLD below.
        fit = fit_did_model(
            dataset,
            likelihood_family=SUPPORTED_LIKELIHOOD_FAMILY,
            draws=draws,
            tune=tune,
            chains=chains,
            seed=seed,
            target_accept=target_accept,
            max_treedepth=max_treedepth,
        )
    diagnostics = compute_diagnostics(
        fit,
        prior_sensitivity_draws=prior_sensitivity_draws,
        prior_sensitivity_tune=prior_sensitivity_tune,
        pre_trend_draws=pre_trend_draws,
        pre_trend_tune=pre_trend_tune,
    )
    artifact = emit_proof_artifact(
        dataset=dataset,
        fit=fit,
        diagnostics=diagnostics,
        requested_likelihood_family=likelihood_family,
        calibration_scenarios=calibration_scenarios,
        null_checks=null_checks,
        floor_checks=floor_checks,
        repeated_evaluation_detected=repeated_evaluation_detected,
        generated_at=generated_at,
    )
    internal_report = {
        **diagnostics.internal_report,
        "estimand_summary": fit.estimand_summary(),
        "governance_state": artifact["governance_state"],
    }
    return artifact, internal_report
