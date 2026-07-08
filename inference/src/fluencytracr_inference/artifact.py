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
    INFERENCE_PROOF_MCSE_TO_POSTERIOR_SD_RATIO_MAX,
    INFERENCE_PROOF_NULL_FALSE_ELIGIBILITY_MAX,
    INFERENCE_PROOF_PPC_P_VALUE_MAX,
    INFERENCE_PROOF_PPC_P_VALUE_MIN,
    INFERENCE_PROOF_PRIOR_SENSITIVITY_MAX_POSTERIOR_SD,
    INFERENCE_PROOF_RHAT_MAX,
    LIKELIHOOD_FAMILY_LINKS,
    SUPPORTED_LIKELIHOOD_FAMILY,
)
from .diagnostics import DiagnosticsResult, compute_diagnostics, evaluate_gates
from .hashing import inference_proof_artifact_self_hash, sha256_json
from .model import FitResult, HoldViolation, fit_did_model
from .synthetic import SyntheticDataset, assert_synthetic_only_dataset

LOCKFILE_PATH = Path(__file__).resolve().parents[2] / "requirements.lock"
DEFAULT_STUDY_RESULTS_PATH = Path(__file__).resolve().parents[2] / (
    "calibration_study_results.json"
)


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
MISSING_STUDY_INPUT_PREFIX = "missing-task-3.3-study-input"
CALIBRATION_SCENARIO_PREFIX = "calibration-"
STRUCTURAL_CONTROL_SCENARIO_PREFIX = "structural-control-"
_REQUIRED_CALIBRATION_CELLS = (
    (0, 12),
    (0, 16),
    (0.2, 12),
    (0.2, 16),
    (0.5, 12),
    (0.5, 16),
)


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


def missing_study_input_calibration_scenarios() -> list[dict]:
    """Fail-closed calibration cells used when no study result is supplied."""
    scenarios = []
    for effect in (0, 0.2, 0.5):
        for cohort_size in (12, 16):
            scenarios.append(
                {
                    "scenario_id": f"{MISSING_STUDY_INPUT_PREFIX}-effect-{effect}-k{cohort_size}",
                    "injected_effect_size_sd": effect,
                    "cohort_size": cohort_size,
                    "replication_count": INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
                    "credible_interval_level": 0.8,
                    "coverage_rate": 0.0,
                    "coverage_standard_error": 0.0,
                    "pass": False,
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


def missing_study_input_null_checks() -> dict:
    """Fail-closed null-check section used when no null study is supplied."""
    return {
        "null_effect_scenario_count": INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
        "false_eligibility_rate": 1.0,
        "pass": False,
    }


def phase_b1_fixture_floor_checks() -> dict:
    """PHASE B1 FIXTURE: placeholder floor-enforcement summary."""
    return canonical_floor_checks()


def canonical_floor_checks() -> dict:
    """Schema-literal floor-check declaration used by structural study cells."""
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


def _scenario_cell(scenario: dict) -> tuple[float | int, int]:
    effect = scenario.get("injected_effect_size_sd")
    if float(effect) == 0.0:
        effect = 0
    return effect, int(scenario.get("cohort_size"))


def _study_calibration_inputs_pass(
    calibration_scenarios: list[dict],
    *,
    allow_structural_control_inputs: bool = False,
) -> bool:
    """Require the exact task-3.3 effect/cohort grid before eligibility.

    The TypeScript boundary also enforces the six cells. Python mirrors that
    rule before deriving ``eligible_internal_only`` so callers cannot authorize
    proof by passing a partial or Phase-B1 fixture-labeled study object.
    ``structural-control-*`` scenarios remain allowed for internal floor and
    negative-control isolation cells; those are generated by this module and
    still carry the complete six-cell grid.
    """
    if len(calibration_scenarios) != len(_REQUIRED_CALIBRATION_CELLS):
        return False
    try:
        observed = [_scenario_cell(scenario) for scenario in calibration_scenarios]
    except (TypeError, ValueError):
        return False
    if set(observed) != set(_REQUIRED_CALIBRATION_CELLS):
        return False
    if len(set(observed)) != len(observed):
        return False
    for scenario in calibration_scenarios:
        try:
            scenario_id = str(scenario.get("scenario_id", ""))
            if scenario_id.startswith(STRUCTURAL_CONTROL_SCENARIO_PREFIX):
                if not allow_structural_control_inputs:
                    return False
            elif not scenario_id.startswith(CALIBRATION_SCENARIO_PREFIX):
                return False
            n = int(scenario.get("replication_count", 0))
            coverage = float(scenario.get("coverage_rate", -1.0))
            expected_se = math.sqrt(coverage * (1.0 - coverage) / n) if n > 0 else -1.0
            if (
                n < INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
                or scenario.get("credible_interval_level") != 0.8
                or not math.isfinite(coverage)
                or coverage < INFERENCE_PROOF_CALIBRATION_COVERAGE_MIN
                or coverage > INFERENCE_PROOF_CALIBRATION_COVERAGE_MAX
                or not bool(scenario.get("pass"))
                or not math.isclose(
                    float(scenario.get("coverage_standard_error", -1.0)),
                    expected_se,
                    rel_tol=0.0,
                    abs_tol=1e-12,
                )
            ):
                return False
        except (TypeError, ValueError):
            return False
    return True


def _study_null_inputs_pass(null_checks: dict) -> bool:
    expected_null_replications = 2 * INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
    try:
        false_eligibility_rate = float(null_checks.get("false_eligibility_rate", 1.0))
        return bool(
            int(null_checks.get("null_effect_scenario_count", 0)) >= expected_null_replications
            and math.isfinite(false_eligibility_rate)
            and false_eligibility_rate <= INFERENCE_PROOF_NULL_FALSE_ELIGIBILITY_MAX
            and null_checks.get("pass") is True
        )
    except (TypeError, ValueError):
        return False


# --- Section builders ---------------------------------------------------------


def _synthetic_generator_section(dataset: SyntheticDataset) -> dict:
    assert_synthetic_only_dataset(dataset)
    return {
        "generator_id": dataset.generator_id,
        "generator_version": dataset.generator_version,
        "seed_range": {"start_seed": int(dataset.seed), "end_seed": int(dataset.seed)},
        "synthetic_input_hash": dataset.synthetic_input_hash(),
        "real_data_present": bool(getattr(dataset, "real_data_present", False)),
        "customer_data_present": bool(getattr(dataset, "customer_data_present", False)),
        "production_data_present": bool(getattr(dataset, "production_data_present", False)),
        "live_data_source_present": bool(getattr(dataset, "live_data_source_present", False)),
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


def _finite_or(value: float, fallback: float) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return fallback
    return parsed if math.isfinite(parsed) else fallback


def _nonnegative_finite_or(value: float, fallback: float) -> float:
    parsed = _finite_or(value, fallback)
    return parsed if parsed >= 0.0 else fallback


def _nonnegative_int_or(value: int, fallback: int) -> int:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return fallback
    if not math.isfinite(parsed) or parsed < 0:
        return fallback
    return int(parsed)


def _all_finite(*values: float) -> bool:
    try:
        return all(math.isfinite(float(value)) for value in values)
    except (TypeError, ValueError):
        return False


def _serialized_parameter_diagnostic(parameter) -> dict:
    mcse_fields_finite = _all_finite(
        parameter.posterior_mean_mcse,
        parameter.interval_endpoint_mcse,
        parameter.posterior_sd,
        parameter.max_mcse_to_posterior_sd_ratio,
    )
    posterior_mean_mcse = _nonnegative_finite_or(parameter.posterior_mean_mcse, 1.0)
    interval_endpoint_mcse = _nonnegative_finite_or(parameter.interval_endpoint_mcse, 1.0)
    posterior_sd = _nonnegative_finite_or(parameter.posterior_sd, 1.0)
    if not mcse_fields_finite:
        posterior_mean_mcse = max(posterior_mean_mcse, 1.0)
        interval_endpoint_mcse = max(interval_endpoint_mcse, 1.0)
        posterior_sd = max(posterior_sd, 1.0)

    max_mcse = max(posterior_mean_mcse, interval_endpoint_mcse)
    if posterior_sd == 0.0:
        ratio = 0.0 if max_mcse == 0.0 else INFERENCE_PROOF_MCSE_TO_POSTERIOR_SD_RATIO_MAX + 1.0
    else:
        ratio = max_mcse / posterior_sd
    ratio = _finite_or(ratio, INFERENCE_PROOF_MCSE_TO_POSTERIOR_SD_RATIO_MAX + 1.0)

    return {
        "parameter_name": parameter.parameter_name,
        "r_hat": _nonnegative_finite_or(parameter.r_hat, INFERENCE_PROOF_RHAT_MAX + 1.0),
        "bulk_ess": _nonnegative_finite_or(parameter.bulk_ess, 0.0),
        "tail_ess": _nonnegative_finite_or(parameter.tail_ess, 0.0),
        "posterior_mean_mcse": posterior_mean_mcse,
        "interval_endpoint_mcse": interval_endpoint_mcse,
        "posterior_sd": posterior_sd,
        "max_mcse_to_posterior_sd_ratio": ratio,
    }


def _diagnostics_section(diagnostics: DiagnosticsResult) -> dict:
    sampler = diagnostics.sampler
    section: dict = {
        "sampler": {
            "parameters": [
                _serialized_parameter_diagnostic(p)
                for p in sampler.parameters
            ],
            "post_warmup_divergences": _nonnegative_int_or(
                sampler.post_warmup_divergences,
                1,
            ),
            "max_treedepth_saturation_rate": min(
                _nonnegative_finite_or(sampler.max_treedepth_saturation_rate, 1.0),
                1.0,
            ),
            "max_treedepth_warning": bool(sampler.max_treedepth_warning),
            "energy_bfmi_min": _nonnegative_finite_or(sampler.energy_bfmi_min, 0.0),
            "energy_bfmi_warning": bool(sampler.energy_bfmi_warning),
            # Rank and energy plot data are recorded as compact numeric
            # summaries in the internal report (no image files).
            "rank_plots_recorded": True,
            "energy_plots_recorded": True,
        },
        "pre_trend": {
            "pseudo_effect_credible_interval_80": {
                "lower": _finite_or(diagnostics.pre_trend.ci80_lower, 1.0),
                "upper": _finite_or(diagnostics.pre_trend.ci80_upper, 1.0),
            },
            "includes_zero": False,
            "pass": False,
        },
    }
    pre_trend_interval = section["pre_trend"]["pseudo_effect_credible_interval_80"]
    section["pre_trend"]["includes_zero"] = bool(
        pre_trend_interval["lower"] <= 0.0 <= pre_trend_interval["upper"]
    )
    section["pre_trend"]["pass"] = bool(
        diagnostics.pre_trend.passed and section["pre_trend"]["includes_zero"]
    )
    if diagnostics.posterior_predictive_checks is None:
        section["posterior_predictive_checks"] = None
    else:
        section["posterior_predictive_checks"] = [
            {
                "statistic_name": s.statistic_name,
                "observed_value": _finite_or(s.observed_value, 0.0),
                "posterior_predictive_summary": {
                    "mean": _finite_or(s.predictive_mean, 0.0),
                    "credible_interval_80": {
                        "lower": _finite_or(s.predictive_ci80_lower, 0.0),
                        "upper": _finite_or(s.predictive_ci80_upper, 0.0),
                    },
                },
                "p_value": min(_nonnegative_finite_or(s.p_value, 1.0), 1.0),
                "pass": bool(
                    s.passed
                    and _all_finite(s.p_value)
                    and INFERENCE_PROOF_PPC_P_VALUE_MIN
                    <= float(s.p_value)
                    <= INFERENCE_PROOF_PPC_P_VALUE_MAX
                ),
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
            "posterior_mean_shift_in_posterior_sd": _nonnegative_finite_or(
                sensitivity.posterior_mean_shift_in_posterior_sd,
                INFERENCE_PROOF_PRIOR_SENSITIVITY_MAX_POSTERIOR_SD,
            ),
            "pass": bool(
                sensitivity.passed
                and _all_finite(sensitivity.posterior_mean_shift_in_posterior_sd)
            ),
        }
    return section


def _peeking_control_section(
    dataset: SyntheticDataset, *, repeated_evaluation_detected: bool
) -> dict:
    """Fixed-horizon one-look control: exactly one milestone/metric/cohort."""
    return {
        "procedure": "fixed_horizon_one_look_only",
        "repeated_evaluation": bool(repeated_evaluation_detected),
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
        "pass": not repeated_evaluation_detected,
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


def _assert_fit_binds_dataset(*, fit: FitResult, dataset: SyntheticDataset) -> str:
    dataset_hash = dataset.synthetic_input_hash()
    fit_hash = getattr(fit, "synthetic_input_hash", None)
    fit_dataset_hash = fit.dataset.synthetic_input_hash()
    if fit_hash != dataset_hash or fit_dataset_hash != dataset_hash:
        raise ValueError(
            "fit result must be bound to the same synthetic input hash as the emitted dataset"
        )
    return dataset_hash


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
    allow_structural_control_inputs: bool = False,
) -> dict:
    """Build the schema-shaped artifact and derive its governance state.

    The state is ``eligible_internal_only`` only when the failing set is
    empty; otherwise HOLD with every failing diagnostic named. This mirrors
    the TypeScript gate logic so a Python-eligible artifact parses eligible
    at the boundary and a Python-HOLD artifact parses as a valid HOLD.
    """
    if requested_likelihood_family not in INFERENCE_PROOF_LIKELIHOOD_FAMILIES:
        raise ValueError(f"unknown likelihood family: {requested_likelihood_family!r}")

    assert_synthetic_only_dataset(dataset)
    dataset_hash = _assert_fit_binds_dataset(fit=fit, dataset=dataset)

    calibration_scenarios = (
        calibration_scenarios
        if calibration_scenarios is not None
        else missing_study_input_calibration_scenarios()
    )
    null_checks = null_checks if null_checks is not None else missing_study_input_null_checks()
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
        dataset, repeated_evaluation_detected=repeated_evaluation_detected
    )
    if sorted(window_section["required_milestone_days"]) != sorted(
        peeking_section["milestone_days_included"]
    ):
        failing.add("missing_or_suppressed_windows")
    planned_milestones = set(peeking_section["milestone_days_included"])
    observed_or_sidecar_milestones = set(
        window_section["observed_milestone_days"]
        + window_section["suppressed_milestone_days"]
        + window_section["stale_milestone_days"]
        + window_section["imputed_milestone_days"]
    )
    if not observed_or_sidecar_milestones.issubset(planned_milestones):
        failing.add("peeking_control")

    # Comparison-cohort rule: no credible comparison cohort, no
    # comparison-supported contribution estimate — evidence-tier label only.
    comparison_section = _comparison_adequacy_section(dataset)
    if not comparison_section["all_required_checks_pass"]:
        failing.add("comparison_cohort_adequacy")

    # Fixed-horizon peeking pin: naive repeated evaluation HOLDS.
    if repeated_evaluation_detected:
        failing.add("peeking_control")

    # Study-level inputs (Phase B2 computes; the gates still bind here).
    if not _study_calibration_inputs_pass(
        calibration_scenarios,
        allow_structural_control_inputs=allow_structural_control_inputs,
    ):
        failing.add("calibration_coverage")
    if not _study_null_inputs_pass(null_checks):
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
            "synthetic_input_hash": dataset_hash,
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
    tune: int = 5000,
    chains: int = 2,
    seed: int = 20260706,
    target_accept: float = 0.999,
    max_treedepth: int = 15,
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
