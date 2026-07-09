"""Internal proof-artifact emitter (``InferenceProofArtifactSchema`` shape).

Emits the internal-only synthetic proof artifact exactly as the TypeScript
boundary (``packages/confidence-engine/src/confidenceModel.ts``,
``InferenceProofArtifactSchema``) validates it:

- ``eligible_internal_only`` ONLY when every diagnostic gate passes, the
  aggregate floors pass, the Measurement Cell window evidence is complete
  (observed, unsuppressed, fresh, unimputed), the comparison-cohort adequacy
  rubric is complete and passing, and the fixed-horizon peeking control
  passes. Contribution-estimate authorization is narrower: eligible internal
  artifacts authorize the comparison-supported estimate only when the internal
  null false-eligibility guard excludes zero. Valid-but-null/uncertain
  artifacts stay internal-valid and non-authorizing. Anything with failed gates
  emits HOLD with every failing diagnostic named using the schema's
  failing-diagnostic vocabulary.
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
from statistics import NormalDist

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
    INFERENCE_PROOF_FLOAT_TOLERANCE,
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
_NULL_FALSE_ELIGIBILITY_Z = NormalDist().inv_cdf(
    1.0 - INFERENCE_PROOF_NULL_FALSE_ELIGIBILITY_MAX / 2.0
)


def lockfile_hash() -> str:
    return hashlib.sha256(LOCKFILE_PATH.read_bytes()).hexdigest()


# --- Study-level section helpers ---------------------------------------------

MISSING_STUDY_INPUT_PREFIX = "missing-task-3.3-study-input"
CALIBRATION_EFFECT_SIZES = (0.0, 0.2, 0.5)
CALIBRATION_COHORT_SIZES = (12, 16)
CALIBRATION_CELLS = tuple(
    (effect, cohort_size)
    for effect in CALIBRATION_EFFECT_SIZES
    for cohort_size in CALIBRATION_COHORT_SIZES
)


def phase_b1_fixture_calibration_scenarios() -> list[dict]:
    """Removed Phase B1 fixture path.

    Phase B2 callers must use ``synthetic_study.run_synthetic_study_inputs``.
    Keeping this name as a hard failure prevents stale fixture imports from
    silently producing eligible artifacts.
    """
    raise RuntimeError(
        "Phase B1 fixture calibration inputs are retired; use computed "
        "synthetic_study.run_synthetic_study_inputs() outputs"
    )


def missing_study_input_calibration_scenarios() -> list[dict]:
    """Fail-closed calibration cells used when no study result is supplied."""
    scenarios = []
    for effect, cohort_size in CALIBRATION_CELLS:
        scenarios.append(
            {
                "scenario_id": f"{MISSING_STUDY_INPUT_PREFIX}-effect-{effect:g}-k{cohort_size}",
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
    """Removed Phase B1 fixture path."""
    raise RuntimeError(
        "Phase B1 fixture null inputs are retired; use computed "
        "synthetic_study.run_synthetic_study_inputs() outputs"
    )


def missing_study_input_null_checks() -> dict:
    """Fail-closed null-check section used when no null study is supplied."""
    return {
        "null_effect_scenario_count": INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN,
        "false_eligibility_rate": 1.0,
        "pass": False,
    }


def phase_b1_fixture_floor_checks() -> dict:
    """Removed Phase B1 fixture path."""
    raise RuntimeError(
        "Phase B1 fixture floor inputs are retired; use computed "
        "synthetic_study.compute_floor_checks() outputs"
    )


def _computed_floor_checks() -> dict:
    from .synthetic_study import compute_floor_checks

    return compute_floor_checks()


def _coverage_standard_error(coverage_rate: float, replication_count: int) -> float:
    return math.sqrt(coverage_rate * (1.0 - coverage_rate) / replication_count)


def _canonicalize_calibration_scenarios(
    supplied: list[dict] | None,
) -> tuple[list[dict], bool]:
    if supplied is None:
        return missing_study_input_calibration_scenarios(), False
    if not isinstance(supplied, list):
        return missing_study_input_calibration_scenarios(), False

    valid_by_cell: dict[tuple[float, int], dict] = {}
    all_valid = True
    for scenario in supplied:
        if not isinstance(scenario, dict):
            all_valid = False
            continue
        try:
            effect = float(scenario["injected_effect_size_sd"])
            cohort_size = int(scenario["cohort_size"])
            replication_count = int(scenario["replication_count"])
            credible_interval_level = float(scenario["credible_interval_level"])
            coverage_rate = float(scenario["coverage_rate"])
            coverage_standard_error = float(scenario["coverage_standard_error"])
            scenario_pass = scenario["pass"]
            scenario_id = str(scenario["scenario_id"])
        except (KeyError, TypeError, ValueError):
            all_valid = False
            continue

        cell = (effect, cohort_size)
        expected_se = (
            _coverage_standard_error(coverage_rate, replication_count)
            if replication_count > 0 and math.isfinite(coverage_rate)
            else float("nan")
        )
        valid = (
            cell in CALIBRATION_CELLS
            and cell not in valid_by_cell
            and scenario_id != ""
            and isinstance(scenario_pass, bool)
            and replication_count >= INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
            and credible_interval_level == 0.8
            and math.isfinite(coverage_rate)
            and 0.0 <= coverage_rate <= 1.0
            and math.isfinite(coverage_standard_error)
            and coverage_standard_error >= 0.0
            and math.isfinite(expected_se)
            and abs(coverage_standard_error - expected_se) <= INFERENCE_PROOF_FLOAT_TOLERANCE
        )
        if not valid:
            all_valid = False
            continue
        valid_by_cell[cell] = {
            "scenario_id": scenario_id,
            "injected_effect_size_sd": effect,
            "cohort_size": cohort_size,
            "replication_count": replication_count,
            "credible_interval_level": 0.8,
            "coverage_rate": coverage_rate,
            "coverage_standard_error": coverage_standard_error,
            "pass": scenario_pass,
        }

    canonical: list[dict] = []
    missing = missing_study_input_calibration_scenarios()
    missing_by_cell = {
        (float(s["injected_effect_size_sd"]), int(s["cohort_size"])): s
        for s in missing
    }
    for cell in CALIBRATION_CELLS:
        scenario = valid_by_cell.get(cell)
        if scenario is None:
            canonical.append(missing_by_cell[cell])
            all_valid = False
        else:
            canonical.append(scenario)

    if len(supplied) != len(valid_by_cell):
        all_valid = False
    return canonical, all_valid


def _canonicalize_null_checks(supplied: dict | None) -> tuple[dict, bool]:
    if supplied is None or not isinstance(supplied, dict):
        return missing_study_input_null_checks(), False
    try:
        count = int(supplied["null_effect_scenario_count"])
        rate = float(supplied["false_eligibility_rate"])
        passed = supplied["pass"]
    except (KeyError, TypeError, ValueError):
        return missing_study_input_null_checks(), False

    if (
        not isinstance(passed, bool)
        or count < INFERENCE_PROOF_CALIBRATION_REPLICATIONS_MIN
        or not math.isfinite(rate)
        or rate < 0.0
        or rate > 1.0
    ):
        return missing_study_input_null_checks(), False
    return {
        "null_effect_scenario_count": count,
        "false_eligibility_rate": rate,
        "pass": passed,
    }, True


def _canonicalize_floor_checks(supplied: dict | None) -> tuple[dict, bool]:
    expected = _computed_floor_checks()
    if supplied is None or not isinstance(supplied, dict):
        return expected, False
    return expected, supplied == expected


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


def _comparison_supported_contribution_estimate_authorized(
    *, state: str, comparison_section: dict, fit: FitResult
) -> bool:
    if state != "eligible_internal_only":
        return False
    if comparison_section.get("all_required_checks_pass") is not True:
        return False
    try:
        summary = fit.estimand_summary()
        posterior_mean = float(summary["posterior_mean"])
        posterior_sd = float(summary["posterior_sd"])
    except (KeyError, TypeError, ValueError):
        return False
    if (
        not math.isfinite(posterior_mean)
        or not math.isfinite(posterior_sd)
        or posterior_sd <= 0.0
    ):
        return False
    lower = posterior_mean - _NULL_FALSE_ELIGIBILITY_Z * posterior_sd
    upper = posterior_mean + _NULL_FALSE_ELIGIBILITY_Z * posterior_sd
    return bool(lower > 0.0 or upper < 0.0)


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
    empty; otherwise HOLD with every failing diagnostic named. Eligible
    internal artifacts authorize a comparison-supported contribution estimate
    only when the internal null false-eligibility guard excludes zero; valid
    null/uncertain artifacts remain non-authorizing. This mirrors the
    TypeScript gate logic so a Python-eligible artifact parses eligible at the
    boundary and a Python-HOLD artifact parses as a valid HOLD.
    """
    if requested_likelihood_family not in INFERENCE_PROOF_LIKELIHOOD_FAMILIES:
        raise ValueError(f"unknown likelihood family: {requested_likelihood_family!r}")

    assert_synthetic_only_dataset(dataset)
    dataset_hash = _assert_fit_binds_dataset(fit=fit, dataset=dataset)

    calibration_scenarios, calibration_inputs_complete = _canonicalize_calibration_scenarios(
        calibration_scenarios
    )
    null_checks, null_inputs_complete = _canonicalize_null_checks(null_checks)
    floor_checks, floor_inputs_complete = _canonicalize_floor_checks(floor_checks)

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
    if not calibration_inputs_complete:
        failing.add("calibration_coverage")
    for scenario in calibration_scenarios:
        if (
            not scenario["pass"]
            or scenario["coverage_rate"] < INFERENCE_PROOF_CALIBRATION_COVERAGE_MIN
            or scenario["coverage_rate"] > INFERENCE_PROOF_CALIBRATION_COVERAGE_MAX
        ):
            failing.add("calibration_coverage")
    if not null_inputs_complete:
        failing.add("null_false_eligibility")
    if (
        not null_checks["pass"]
        or null_checks["false_eligibility_rate"] > INFERENCE_PROOF_NULL_FALSE_ELIGIBILITY_MAX
    ):
        failing.add("null_false_eligibility")
    if not floor_inputs_complete:
        failing.add("floor_check")

    failing_ordered = [
        name for name in INFERENCE_PROOF_FAILING_DIAGNOSTICS if name in failing
    ]
    state = "eligible_internal_only" if not failing_ordered else "HOLD"
    comparison_supported_contribution_estimate_authorized = (
        _comparison_supported_contribution_estimate_authorized(
            state=state,
            comparison_section=comparison_section,
            fit=fit,
        )
    )

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
            # HOLD never authorizes. Eligible internal artifacts authorize a
            # contribution estimate only when the internal null
            # false-eligibility guard excludes zero; null/uncertain artifacts
            # stay valid but non-authorizing.
            "comparison_supported_contribution_estimate_authorized": (
                comparison_supported_contribution_estimate_authorized
            ),
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
