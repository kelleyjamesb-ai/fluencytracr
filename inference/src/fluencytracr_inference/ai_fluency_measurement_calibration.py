"""Fixed replicated study for the synthetic ordinal measurement proof."""

from __future__ import annotations

from dataclasses import dataclass, field
import math
import re

from .ai_fluency_measurement_diagnostics import (
    MEASUREMENT_FAILING_DIAGNOSTICS,
    MeasurementDiagnostics,
    compute_measurement_diagnostics,
)
from .ai_fluency_measurement_synthetic import (
    MEASUREMENT_SYNTHETIC_SAMPLE_SIZE,
    MEASUREMENT_SYNTHETIC_SCENARIOS,
    generate_measurement_synthetic_case,
)
from .ai_fluency_ordinal_measurement import fit_ordinal_measurement_model
from .hashing import sha256_json


MEASUREMENT_FULL_REPLICATIONS_PER_SCENARIO = 200
MEASUREMENT_SMOKE_REPLICATIONS_PER_SCENARIO = 1
MEASUREMENT_STUDY_BASE_SEED = 202607140000
MAXIMUM_INVARIANT_FALSE_HOLD_NUMERATOR = 5
MAXIMUM_INVARIANT_FALSE_HOLD_DENOMINATOR = 100
MAXIMUM_INVARIANT_FALSE_HOLD_RATE = (
    MAXIMUM_INVARIANT_FALSE_HOLD_NUMERATOR
    / MAXIMUM_INVARIANT_FALSE_HOLD_DENOMINATOR
)
MINIMUM_DRIFT_DETECTION_RATE = 0.80
MINIMUM_RECOVERY_PASS_RATE = 0.90
MINIMUM_DRIFT_DETECTION_NUMERATOR = 80
MINIMUM_RECOVERY_PASS_NUMERATOR = 90
RATE_DENOMINATOR = 100
MEASUREMENT_STUDY_MODES = ("smoke", "full")
_SCENARIO_EXPECTED_DIAGNOSTIC = {
    "invariant": None,
    "invariant_latent_shift": None,
    "loading_drift": "loading_invariance",
    "threshold_drift": "threshold_invariance",
}
_SCENARIO_ALLOWED_FAILURES = {
    "invariant": frozenset(),
    "invariant_latent_shift": frozenset(),
    "loading_drift": frozenset(
        {"loading_invariance", "first_order_loading", "ordinal_reliability"}
    ),
    "threshold_drift": frozenset({"threshold_invariance"}),
}
_RUNNER_TOKEN = object()
_EXECUTION_VERIFICATION_TOKEN = object()
_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


class MeasurementCalibrationStudyError(RuntimeError):
    """The fixed calibration study could not be validated."""


@dataclass(frozen=True)
class MeasurementCalibrationSlotResult:
    scenario: str
    replication_index: int
    seed: int
    expected_failing_diagnostic: str | None
    failing_diagnostics: tuple[str, ...]
    expected_result_observed: bool
    recovery_passed: bool
    runner_error: str | None
    package_hash: str | None
    fit_hash: str | None
    diagnostics_hash: str | None
    result_hash: str

    def to_dict(self) -> dict:
        return {
            "scenario": self.scenario,
            "replication_index": self.replication_index,
            "seed": self.seed,
            "expected_failing_diagnostic": self.expected_failing_diagnostic,
            "failing_diagnostics": list(self.failing_diagnostics),
            "expected_result_observed": self.expected_result_observed,
            "recovery_passed": self.recovery_passed,
            "runner_error": self.runner_error,
            "package_hash": self.package_hash,
            "fit_hash": self.fit_hash,
            "diagnostics_hash": self.diagnostics_hash,
            "result_hash": self.result_hash,
        }


@dataclass(frozen=True)
class ScenarioStudySummary:
    scenario: str
    replication_count: int
    expected_result_count: int
    expected_result_rate: float
    recovery_pass_count: int
    recovery_pass_rate: float
    runner_error_count: int

    def to_dict(self) -> dict:
        return {
            "scenario": self.scenario,
            "replication_count": self.replication_count,
            "expected_result_count": self.expected_result_count,
            "expected_result_rate": float(self.expected_result_rate),
            "recovery_pass_count": self.recovery_pass_count,
            "recovery_pass_rate": float(self.recovery_pass_rate),
            "runner_error_count": self.runner_error_count,
        }


@dataclass(frozen=True)
class MeasurementCalibrationStudy:
    execution_mode: str
    replications_per_scenario: int
    sample_size_per_wave: int
    slot_results: tuple[MeasurementCalibrationSlotResult, ...]
    scenario_summaries: tuple[ScenarioStudySummary, ...]
    complete_full_plan: bool
    failing_checks: tuple[str, ...]
    study_hash: str
    _runner_token: object = field(repr=False, compare=False)

    def to_hash_body(self) -> dict:
        return {
            "execution_mode": self.execution_mode,
            "replications_per_scenario": self.replications_per_scenario,
            "sample_size_per_wave": self.sample_size_per_wave,
            "slot_results": [result.to_dict() for result in self.slot_results],
            "scenario_summaries": [summary.to_dict() for summary in self.scenario_summaries],
            "complete_full_plan": self.complete_full_plan,
            "failing_checks": list(self.failing_checks),
        }

    def to_summary_dict(self) -> dict:
        return {
            "execution_mode": self.execution_mode,
            "replications_per_scenario": self.replications_per_scenario,
            "sample_size_per_wave": self.sample_size_per_wave,
            "total_slot_count": len(self.slot_results),
            "scenario_summaries": [summary.to_dict() for summary in self.scenario_summaries],
            "slot_result_hashes_hash": sha256_json(
                [result.result_hash for result in self.slot_results]
            ),
            "complete_full_plan": self.complete_full_plan,
            "failing_checks": list(self.failing_checks),
            "study_hash": self.study_hash,
        }


@dataclass(frozen=True)
class MeasurementCalibrationExecutionVerification:
    study_hash: str
    execution_identity_hash: str
    primary_phase_hash: str
    recompute_phase_hash: str
    primary_checkpoint_manifest_hash: str
    recompute_checkpoint_manifest_hash: str
    primary_process_tokens_hash: str
    recompute_process_tokens_hash: str
    primary_slot_result_hashes_hash: str
    recomputation_slot_result_hashes_hash: str
    recomputed_slot_count: int
    verification_hash: str
    _runner_token: object = field(repr=False, compare=False)

    def to_hash_body(self) -> dict:
        return {
            "study_hash": self.study_hash,
            "execution_identity_hash": self.execution_identity_hash,
            "primary_phase_hash": self.primary_phase_hash,
            "recompute_phase_hash": self.recompute_phase_hash,
            "primary_checkpoint_manifest_hash": (
                self.primary_checkpoint_manifest_hash
            ),
            "recompute_checkpoint_manifest_hash": (
                self.recompute_checkpoint_manifest_hash
            ),
            "primary_process_tokens_hash": self.primary_process_tokens_hash,
            "recompute_process_tokens_hash": self.recompute_process_tokens_hash,
            "primary_slot_result_hashes_hash": (
                self.primary_slot_result_hashes_hash
            ),
            "recomputation_slot_result_hashes_hash": (
                self.recomputation_slot_result_hashes_hash
            ),
            "recomputed_slot_count": self.recomputed_slot_count,
        }


def _slot_seed(scenario: str, replication_index: int) -> int:
    scenario_index = MEASUREMENT_SYNTHETIC_SCENARIOS.index(scenario)
    return MEASUREMENT_STUDY_BASE_SEED + scenario_index * 100_000 + replication_index


def _recovery_passed(diagnostics: MeasurementDiagnostics) -> bool:
    return not any(
        diagnostic in diagnostics.failing_diagnostics
        for diagnostic in (
            "loading_recovery",
            "threshold_recovery",
            "second_order_recovery",
        )
    )


def _expected_result_observed(
    scenario: str, diagnostics: MeasurementDiagnostics
) -> bool:
    expected = _SCENARIO_EXPECTED_DIAGNOSTIC[scenario]
    if expected is None:
        return not diagnostics.failing_diagnostics
    failures = frozenset(diagnostics.failing_diagnostics)
    return expected in failures and failures <= _SCENARIO_ALLOWED_FAILURES[scenario]


def _run_slot(scenario: str, replication_index: int) -> MeasurementCalibrationSlotResult:
    seed = _slot_seed(scenario, replication_index)
    expected = _SCENARIO_EXPECTED_DIAGNOSTIC[scenario]
    try:
        case = generate_measurement_synthetic_case(
            seed=seed,
            scenario=scenario,
            sample_size=MEASUREMENT_SYNTHETIC_SAMPLE_SIZE,
        )
        fit = fit_ordinal_measurement_model(case.package)
        diagnostics = compute_measurement_diagnostics(fit, case.truth)
        body = {
            "scenario": scenario,
            "replication_index": replication_index,
            "seed": seed,
            "expected_failing_diagnostic": expected,
            "failing_diagnostics": list(diagnostics.failing_diagnostics),
            "expected_result_observed": _expected_result_observed(scenario, diagnostics),
            "recovery_passed": _recovery_passed(diagnostics),
            "runner_error": None,
            "package_hash": case.package.package_hash(),
            "fit_hash": fit.fit_hash,
            "diagnostics_hash": diagnostics.diagnostics_hash,
        }
    except Exception as exc:  # fail closed: runner errors are study failures
        body = {
            "scenario": scenario,
            "replication_index": replication_index,
            "seed": seed,
            "expected_failing_diagnostic": expected,
            "failing_diagnostics": ["runner_error"],
            "expected_result_observed": False,
            "recovery_passed": False,
            "runner_error": type(exc).__name__,
            "package_hash": None,
            "fit_hash": None,
            "diagnostics_hash": None,
        }
    return MeasurementCalibrationSlotResult(
        scenario=scenario,
        replication_index=replication_index,
        seed=seed,
        expected_failing_diagnostic=expected,
        failing_diagnostics=tuple(body["failing_diagnostics"]),
        expected_result_observed=bool(body["expected_result_observed"]),
        recovery_passed=bool(body["recovery_passed"]),
        runner_error=body["runner_error"],
        package_hash=body["package_hash"],
        fit_hash=body["fit_hash"],
        diagnostics_hash=body["diagnostics_hash"],
        result_hash=sha256_json(body),
    )


def run_measurement_calibration_slot(
    *, scenario: str, replication_index: int
) -> MeasurementCalibrationSlotResult:
    """Run one compiled full-plan slot without exposing seed or gate tuning."""

    if scenario not in MEASUREMENT_SYNTHETIC_SCENARIOS:
        raise MeasurementCalibrationStudyError("measurement scenario is off-plan")
    if (
        isinstance(replication_index, bool)
        or not isinstance(replication_index, int)
        or replication_index < 0
        or replication_index >= MEASUREMENT_FULL_REPLICATIONS_PER_SCENARIO
    ):
        raise MeasurementCalibrationStudyError("replication index is off-plan")
    return _run_slot(scenario, replication_index)


def validate_measurement_calibration_slot_result(
    result: MeasurementCalibrationSlotResult,
) -> None:
    if not isinstance(result, MeasurementCalibrationSlotResult):
        raise MeasurementCalibrationStudyError("slot result has an invalid type")
    if result.scenario not in MEASUREMENT_SYNTHETIC_SCENARIOS:
        raise MeasurementCalibrationStudyError("slot scenario is off-plan")
    if (
        isinstance(result.replication_index, bool)
        or not isinstance(result.replication_index, int)
        or result.replication_index < 0
        or result.replication_index >= MEASUREMENT_FULL_REPLICATIONS_PER_SCENARIO
    ):
        raise MeasurementCalibrationStudyError("slot replication index is off-plan")
    if result.seed != _slot_seed(result.scenario, result.replication_index):
        raise MeasurementCalibrationStudyError("slot seed is off-plan")
    expected_diagnostic = _SCENARIO_EXPECTED_DIAGNOSTIC[result.scenario]
    if result.expected_failing_diagnostic != expected_diagnostic:
        raise MeasurementCalibrationStudyError("slot expected diagnostic is invalid")
    failures = frozenset(result.failing_diagnostics)
    if not failures <= frozenset((*MEASUREMENT_FAILING_DIAGNOSTICS, "runner_error")):
        raise MeasurementCalibrationStudyError("slot contains unknown diagnostics")
    expected_observed = (
        not failures
        if expected_diagnostic is None
        else expected_diagnostic in failures
        and failures <= _SCENARIO_ALLOWED_FAILURES[result.scenario]
    )
    if result.expected_result_observed is not expected_observed:
        raise MeasurementCalibrationStudyError("slot expected-result state is invalid")
    recovery_passed = result.runner_error is None and not any(
        diagnostic in failures
        for diagnostic in (
            "loading_recovery",
            "threshold_recovery",
            "second_order_recovery",
        )
    )
    if result.recovery_passed is not recovery_passed:
        raise MeasurementCalibrationStudyError("slot recovery state is invalid")
    if result.runner_error is None:
        if "runner_error" in failures:
            raise MeasurementCalibrationStudyError(
                "successful slot cannot claim a runner error"
            )
        if not all(
            isinstance(value, str) and _SHA256_RE.fullmatch(value)
            for value in (
                result.package_hash,
                result.fit_hash,
                result.diagnostics_hash,
            )
        ):
            raise MeasurementCalibrationStudyError("successful slot hashes are invalid")
    elif (
        not isinstance(result.runner_error, str)
        or not result.runner_error
        or result.package_hash is not None
        or result.fit_hash is not None
        or result.diagnostics_hash is not None
        or failures != frozenset({"runner_error"})
    ):
        raise MeasurementCalibrationStudyError("runner-error slot shape is invalid")
    slot_body = {
        "scenario": result.scenario,
        "replication_index": result.replication_index,
        "seed": result.seed,
        "expected_failing_diagnostic": result.expected_failing_diagnostic,
        "failing_diagnostics": list(result.failing_diagnostics),
        "expected_result_observed": result.expected_result_observed,
        "recovery_passed": result.recovery_passed,
        "runner_error": result.runner_error,
        "package_hash": result.package_hash,
        "fit_hash": result.fit_hash,
        "diagnostics_hash": result.diagnostics_hash,
    }
    if result.result_hash != sha256_json(slot_body):
        raise MeasurementCalibrationStudyError("slot result hash mismatch")


def measurement_calibration_slot_result_from_dict(
    value: object,
) -> MeasurementCalibrationSlotResult:
    if not isinstance(value, dict) or any(not isinstance(key, str) for key in value):
        raise MeasurementCalibrationStudyError("slot result must be an object")
    expected_keys = {
        "scenario",
        "replication_index",
        "seed",
        "expected_failing_diagnostic",
        "failing_diagnostics",
        "expected_result_observed",
        "recovery_passed",
        "runner_error",
        "package_hash",
        "fit_hash",
        "diagnostics_hash",
        "result_hash",
    }
    if set(value) != expected_keys:
        raise MeasurementCalibrationStudyError(
            "slot result has missing or unknown fields"
        )
    if not isinstance(value["scenario"], str):
        raise MeasurementCalibrationStudyError("slot scenario must be a string")
    for key in ("replication_index", "seed"):
        if isinstance(value[key], bool) or not isinstance(value[key], int):
            raise MeasurementCalibrationStudyError(f"slot {key} must be an integer")
    if value["expected_failing_diagnostic"] is not None and not isinstance(
        value["expected_failing_diagnostic"], str
    ):
        raise MeasurementCalibrationStudyError(
            "slot expected diagnostic must be a string or null"
        )
    failures = value["failing_diagnostics"]
    if not isinstance(failures, list) or any(
        not isinstance(item, str) for item in failures
    ):
        raise MeasurementCalibrationStudyError(
            "slot failing diagnostics must be a string array"
        )
    for key in ("expected_result_observed", "recovery_passed"):
        if not isinstance(value[key], bool):
            raise MeasurementCalibrationStudyError(f"slot {key} must be boolean")
    for key in ("runner_error", "package_hash", "fit_hash", "diagnostics_hash"):
        if value[key] is not None and not isinstance(value[key], str):
            raise MeasurementCalibrationStudyError(f"slot {key} must be a string or null")
    if not isinstance(value["result_hash"], str):
        raise MeasurementCalibrationStudyError("slot result_hash must be a string")
    result = MeasurementCalibrationSlotResult(
        scenario=value["scenario"],
        replication_index=value["replication_index"],
        seed=value["seed"],
        expected_failing_diagnostic=value["expected_failing_diagnostic"],
        failing_diagnostics=tuple(failures),
        expected_result_observed=value["expected_result_observed"],
        recovery_passed=value["recovery_passed"],
        runner_error=value["runner_error"],
        package_hash=value["package_hash"],
        fit_hash=value["fit_hash"],
        diagnostics_hash=value["diagnostics_hash"],
        result_hash=value["result_hash"],
    )
    validate_measurement_calibration_slot_result(result)
    return result


def _summarize_scenario(
    scenario: str,
    results: tuple[MeasurementCalibrationSlotResult, ...],
) -> ScenarioStudySummary:
    scenario_results = tuple(result for result in results if result.scenario == scenario)
    count = len(scenario_results)
    if count == 0:
        raise MeasurementCalibrationStudyError("study scenario has no results")
    expected_count = sum(result.expected_result_observed for result in scenario_results)
    recovery_count = sum(result.recovery_passed for result in scenario_results)
    return ScenarioStudySummary(
        scenario=scenario,
        replication_count=count,
        expected_result_count=expected_count,
        expected_result_rate=expected_count / count,
        recovery_pass_count=recovery_count,
        recovery_pass_rate=recovery_count / count,
        runner_error_count=sum(result.runner_error is not None for result in scenario_results),
    )


def _study_failures(
    *,
    execution_mode: str,
    summaries: tuple[ScenarioStudySummary, ...],
    complete_full_plan: bool,
) -> tuple[str, ...]:
    failures = []
    if execution_mode != "full" or not complete_full_plan:
        failures.append("full_replication_plan_incomplete")
    by_scenario = {summary.scenario: summary for summary in summaries}
    for invariant_scenario in ("invariant", "invariant_latent_shift"):
        invariant = by_scenario[invariant_scenario]
        false_hold_count = invariant.replication_count - invariant.expected_result_count
        if (
            false_hold_count * MAXIMUM_INVARIANT_FALSE_HOLD_DENOMINATOR
            > invariant.replication_count * MAXIMUM_INVARIANT_FALSE_HOLD_NUMERATOR
        ):
            failures.append(f"{invariant_scenario}_false_hold_rate")
    loading_drift = by_scenario["loading_drift"]
    if (
        loading_drift.expected_result_count * RATE_DENOMINATOR
        < loading_drift.replication_count * MINIMUM_DRIFT_DETECTION_NUMERATOR
    ):
        failures.append("loading_drift_detection_rate")
    threshold_drift = by_scenario["threshold_drift"]
    if (
        threshold_drift.expected_result_count * RATE_DENOMINATOR
        < threshold_drift.replication_count * MINIMUM_DRIFT_DETECTION_NUMERATOR
    ):
        failures.append("threshold_drift_detection_rate")
    for scenario, summary in by_scenario.items():
        if (
            summary.recovery_pass_count * RATE_DENOMINATOR
            < summary.replication_count * MINIMUM_RECOVERY_PASS_NUMERATOR
        ):
            failures.append(f"{scenario}_recovery_rate")
        if summary.runner_error_count:
            failures.append(f"{scenario}_runner_errors")
    return tuple(failures)


def validate_measurement_calibration_study(study: MeasurementCalibrationStudy) -> None:
    if study._runner_token is not _RUNNER_TOKEN:
        raise MeasurementCalibrationStudyError("study was not produced by the runner")
    if study.execution_mode not in MEASUREMENT_STUDY_MODES:
        raise MeasurementCalibrationStudyError("unsupported study mode")
    expected_replications = (
        MEASUREMENT_FULL_REPLICATIONS_PER_SCENARIO
        if study.execution_mode == "full"
        else MEASUREMENT_SMOKE_REPLICATIONS_PER_SCENARIO
    )
    if study.replications_per_scenario != expected_replications:
        raise MeasurementCalibrationStudyError("study replication count is off-plan")
    if study.sample_size_per_wave != MEASUREMENT_SYNTHETIC_SAMPLE_SIZE:
        raise MeasurementCalibrationStudyError("study sample size is off-plan")
    expected_slots = tuple(
        (scenario, replication_index, _slot_seed(scenario, replication_index))
        for scenario in MEASUREMENT_SYNTHETIC_SCENARIOS
        for replication_index in range(expected_replications)
    )
    actual_slots = tuple(
        (result.scenario, result.replication_index, result.seed)
        for result in study.slot_results
    )
    if actual_slots != expected_slots:
        raise MeasurementCalibrationStudyError("study slots are missing, duplicate, or off-plan")
    for result in study.slot_results:
        validate_measurement_calibration_slot_result(result)
    expected_summaries = tuple(
        _summarize_scenario(scenario, study.slot_results)
        for scenario in MEASUREMENT_SYNTHETIC_SCENARIOS
    )
    if study.scenario_summaries != expected_summaries:
        raise MeasurementCalibrationStudyError("study summaries do not recompute")
    complete_full_plan = (
        study.execution_mode == "full"
        and expected_replications == MEASUREMENT_FULL_REPLICATIONS_PER_SCENARIO
        and len(study.slot_results)
        == len(MEASUREMENT_SYNTHETIC_SCENARIOS)
        * MEASUREMENT_FULL_REPLICATIONS_PER_SCENARIO
    )
    if study.complete_full_plan is not complete_full_plan:
        raise MeasurementCalibrationStudyError("full-plan completion state is invalid")
    expected_failures = _study_failures(
        execution_mode=study.execution_mode,
        summaries=study.scenario_summaries,
        complete_full_plan=complete_full_plan,
    )
    if study.failing_checks != expected_failures:
        raise MeasurementCalibrationStudyError("study failure list does not recompute")
    if study.study_hash != sha256_json(study.to_hash_body()):
        raise MeasurementCalibrationStudyError("study hash mismatch")
    rates = [
        value
        for summary in study.scenario_summaries
        for value in (summary.expected_result_rate, summary.recovery_pass_rate)
    ]
    if not all(math.isfinite(value) and 0.0 <= value <= 1.0 for value in rates):
        raise MeasurementCalibrationStudyError("study rates must be finite probabilities")


def verify_study_execution_by_recomputation(
    study: MeasurementCalibrationStudy,
) -> str:
    """Rerun every compiled slot before an artifact can trust study execution."""

    validate_measurement_calibration_study(study)
    recomputed = tuple(
        _run_slot(result.scenario, result.replication_index)
        for result in study.slot_results
    )
    if recomputed != study.slot_results:
        raise MeasurementCalibrationStudyError(
            "study slot evidence does not match fresh compiled-seed recomputation"
        )
    return sha256_json([result.result_hash for result in recomputed])


def _build_execution_verification_from_recomputed_results(
    study: MeasurementCalibrationStudy,
    recomputed_results: tuple[MeasurementCalibrationSlotResult, ...],
    *,
    execution_identity_hash: str,
    primary_phase_hash: str,
    recompute_phase_hash: str,
    primary_checkpoint_manifest_hash: str,
    recompute_checkpoint_manifest_hash: str,
    primary_process_tokens_hash: str,
    recompute_process_tokens_hash: str,
) -> MeasurementCalibrationExecutionVerification:
    """Bind an exact separate-phase recomputation to one compiled study."""

    validate_measurement_calibration_study(study)
    if not isinstance(recomputed_results, tuple):
        raise MeasurementCalibrationStudyError(
            "recomputed slot results must use canonical tuple order"
        )
    provenance_hashes = (
        execution_identity_hash,
        primary_phase_hash,
        recompute_phase_hash,
        primary_checkpoint_manifest_hash,
        recompute_checkpoint_manifest_hash,
        primary_process_tokens_hash,
        recompute_process_tokens_hash,
    )
    if not all(
        isinstance(value, str) and _SHA256_RE.fullmatch(value)
        for value in provenance_hashes
    ):
        raise MeasurementCalibrationStudyError("execution provenance hash is invalid")
    if (
        primary_phase_hash == recompute_phase_hash
        or primary_checkpoint_manifest_hash == recompute_checkpoint_manifest_hash
        or primary_process_tokens_hash == recompute_process_tokens_hash
    ):
        raise MeasurementCalibrationStudyError(
            "primary and recomputation provenance must be distinct"
        )
    for result in recomputed_results:
        validate_measurement_calibration_slot_result(result)
    if recomputed_results != study.slot_results:
        raise MeasurementCalibrationStudyError(
            "study slot evidence does not match fresh compiled-seed recomputation"
        )
    primary_hash = sha256_json(
        [result.result_hash for result in study.slot_results]
    )
    recomputation_hash = sha256_json(
        [result.result_hash for result in recomputed_results]
    )
    body = {
        "study_hash": study.study_hash,
        "execution_identity_hash": execution_identity_hash,
        "primary_phase_hash": primary_phase_hash,
        "recompute_phase_hash": recompute_phase_hash,
        "primary_checkpoint_manifest_hash": primary_checkpoint_manifest_hash,
        "recompute_checkpoint_manifest_hash": recompute_checkpoint_manifest_hash,
        "primary_process_tokens_hash": primary_process_tokens_hash,
        "recompute_process_tokens_hash": recompute_process_tokens_hash,
        "primary_slot_result_hashes_hash": primary_hash,
        "recomputation_slot_result_hashes_hash": recomputation_hash,
        "recomputed_slot_count": len(recomputed_results),
    }
    return MeasurementCalibrationExecutionVerification(
        study_hash=study.study_hash,
        execution_identity_hash=execution_identity_hash,
        primary_phase_hash=primary_phase_hash,
        recompute_phase_hash=recompute_phase_hash,
        primary_checkpoint_manifest_hash=primary_checkpoint_manifest_hash,
        recompute_checkpoint_manifest_hash=recompute_checkpoint_manifest_hash,
        primary_process_tokens_hash=primary_process_tokens_hash,
        recompute_process_tokens_hash=recompute_process_tokens_hash,
        primary_slot_result_hashes_hash=primary_hash,
        recomputation_slot_result_hashes_hash=recomputation_hash,
        recomputed_slot_count=len(recomputed_results),
        verification_hash=sha256_json(body),
        _runner_token=_EXECUTION_VERIFICATION_TOKEN,
    )


def validate_measurement_calibration_execution_verification(
    study: MeasurementCalibrationStudy,
    verification: MeasurementCalibrationExecutionVerification,
) -> None:
    validate_measurement_calibration_study(study)
    if (
        not isinstance(verification, MeasurementCalibrationExecutionVerification)
        or verification._runner_token is not _EXECUTION_VERIFICATION_TOKEN
    ):
        raise MeasurementCalibrationStudyError(
            "execution verification was not produced by the runner"
        )
    expected_slot_hash = sha256_json(
        [result.result_hash for result in study.slot_results]
    )
    if (
        verification.study_hash != study.study_hash
        or verification.primary_slot_result_hashes_hash != expected_slot_hash
        or verification.recomputation_slot_result_hashes_hash != expected_slot_hash
        or verification.recomputed_slot_count != len(study.slot_results)
        or not all(
            _SHA256_RE.fullmatch(value)
            for value in (
                verification.execution_identity_hash,
                verification.primary_phase_hash,
                verification.recompute_phase_hash,
                verification.primary_checkpoint_manifest_hash,
                verification.recompute_checkpoint_manifest_hash,
                verification.primary_process_tokens_hash,
                verification.recompute_process_tokens_hash,
            )
        )
        or verification.primary_phase_hash == verification.recompute_phase_hash
        or verification.primary_checkpoint_manifest_hash
        == verification.recompute_checkpoint_manifest_hash
        or verification.primary_process_tokens_hash
        == verification.recompute_process_tokens_hash
        or verification.verification_hash != sha256_json(verification.to_hash_body())
    ):
        raise MeasurementCalibrationStudyError(
            "execution verification does not bind the exact study"
        )


def assemble_measurement_calibration_study(
    *,
    execution_mode: str,
    slot_results: tuple[MeasurementCalibrationSlotResult, ...],
) -> MeasurementCalibrationStudy:
    """Assemble only an exact compiled study from validated runner results."""

    if execution_mode not in MEASUREMENT_STUDY_MODES:
        raise MeasurementCalibrationStudyError("execution mode must be smoke or full")
    if not isinstance(slot_results, tuple):
        raise MeasurementCalibrationStudyError("slot results must use canonical tuple order")
    replications = (
        MEASUREMENT_FULL_REPLICATIONS_PER_SCENARIO
        if execution_mode == "full"
        else MEASUREMENT_SMOKE_REPLICATIONS_PER_SCENARIO
    )
    summaries = tuple(
        _summarize_scenario(scenario, slot_results)
        for scenario in MEASUREMENT_SYNTHETIC_SCENARIOS
    )
    complete_full_plan = execution_mode == "full"
    failures = _study_failures(
        execution_mode=execution_mode,
        summaries=summaries,
        complete_full_plan=complete_full_plan,
    )
    body = {
        "execution_mode": execution_mode,
        "replications_per_scenario": replications,
        "sample_size_per_wave": MEASUREMENT_SYNTHETIC_SAMPLE_SIZE,
        "slot_results": [result.to_dict() for result in slot_results],
        "scenario_summaries": [summary.to_dict() for summary in summaries],
        "complete_full_plan": complete_full_plan,
        "failing_checks": list(failures),
    }
    study = MeasurementCalibrationStudy(
        execution_mode=execution_mode,
        replications_per_scenario=replications,
        sample_size_per_wave=MEASUREMENT_SYNTHETIC_SAMPLE_SIZE,
        slot_results=slot_results,
        scenario_summaries=summaries,
        complete_full_plan=complete_full_plan,
        failing_checks=failures,
        study_hash=sha256_json(body),
        _runner_token=_RUNNER_TOKEN,
    )
    validate_measurement_calibration_study(study)
    return study


def run_measurement_calibration_study(
    *, execution_mode: str = "smoke"
) -> MeasurementCalibrationStudy:
    if execution_mode not in MEASUREMENT_STUDY_MODES:
        raise MeasurementCalibrationStudyError("execution mode must be smoke or full")
    if execution_mode == "full":
        raise MeasurementCalibrationStudyError(
            "full evidence requires the hardened resumable runner"
        )
    replications = (
        MEASUREMENT_FULL_REPLICATIONS_PER_SCENARIO
        if execution_mode == "full"
        else MEASUREMENT_SMOKE_REPLICATIONS_PER_SCENARIO
    )
    results = tuple(
        _run_slot(scenario, replication_index)
        for scenario in MEASUREMENT_SYNTHETIC_SCENARIOS
        for replication_index in range(replications)
    )
    return assemble_measurement_calibration_study(
        execution_mode=execution_mode, slot_results=results
    )
