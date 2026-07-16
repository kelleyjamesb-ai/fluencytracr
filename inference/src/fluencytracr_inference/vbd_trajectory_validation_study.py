"""Pure summary and combine rules for the fixed VBD trajectory validation plan."""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from functools import lru_cache
import math
import re

from scipy.stats import beta as beta_distribution

from .hashing import sha256_json
from .vbd_trajectory_types import VBD_TRAJECTORY_LANES
from .vbd_trajectory_validation_plan import (
    VBD_TRAJECTORY_VALIDATION_DRIFT_ORDER,
    VBD_TRAJECTORY_VALIDATION_GROUP_ORDER,
    VBD_TRAJECTORY_VALIDATION_REQUIRED_SLOT_COUNT,
    VbdTrajectoryValidationSlot,
    _compiled_gate_and_mutation_contract,
    immutable_vbd_trajectory_validation_plan,
    required_vbd_trajectory_validation_slots,
    vbd_trajectory_validation_slot_from_dict,
)


VBD_TRAJECTORY_VALIDATION_RESULT_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_VALIDATION_RESULT_2026_07_V1"
)
VBD_TRAJECTORY_VALIDATION_STUDY_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_VALIDATION_STUDY_2026_07_V1"
)
VBD_PRIMARY_COVERAGE_RATE_MIN = 0.74
VBD_PRIMARY_COVERAGE_RATE_MAX = 0.86
VBD_TARGETED_FAMILY_ALPHA = 0.05
VBD_TARGETED_CELL_COUNT = 36
VBD_NULL_FALSE_MOVEMENT_RATE_MAX = 0.05
VBD_ABSOLUTE_BIAS_MAX = 0.10

_COMPILED_GATE_CONTRACT = _compiled_gate_and_mutation_contract()
if (
    _COMPILED_GATE_CONTRACT["primary_coverage_rate_band"]
    != [VBD_PRIMARY_COVERAGE_RATE_MIN, VBD_PRIMARY_COVERAGE_RATE_MAX]
    or _COMPILED_GATE_CONTRACT["targeted_family_alpha"]
    != VBD_TARGETED_FAMILY_ALPHA
    or _COMPILED_GATE_CONTRACT["targeted_cell_count"]
    != VBD_TARGETED_CELL_COUNT
    or _COMPILED_GATE_CONTRACT["familywise_null_rate_max"]
    != VBD_NULL_FALSE_MOVEMENT_RATE_MAX
    or _COMPILED_GATE_CONTRACT["absolute_bias_max"] != VBD_ABSOLUTE_BIAS_MAX
):
    raise RuntimeError("VBD validation study gates drifted from the plan root")

_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
_SAFE_CODE_RE = re.compile(r"^[a-z][a-z0-9_]{0,95}$")
_ROW_STATES = (
    "FIT_COMPLETE",
    "FIT_INELIGIBLE",
    "EXPECTED_REJECTION",
    "EXPECTED_HOLD",
    "RECOMPUTE_REFUSED",
    "CONTROLLED_RUNNER_ERROR",
    "ARTIFACT_REJECTED",
    "HARD_DIAGNOSTIC_HOLD",
    "RUNNER_ERROR",
)
_FAILURE_CODES = (
    "none",
    "expected_control_state",
    "expected_subject_study_hold",
    "controlled_runner_error",
    "expected_artifact_rejection",
    "hard_diagnostic_failure",
    "interrupted_launch",
    "child_process_failure",
    "child_output_invalid",
    "interrupted_canary_launch",
    "canary_child_failure",
    "canary_output_invalid",
)


@lru_cache(maxsize=1)
def _compiled_failure_stages() -> frozenset[str]:
    return frozenset(
        {"none", "runner_execution"}
        | {
            slot.expected_failure_stage
            for slot in required_vbd_trajectory_validation_slots()
        }
    )


class VbdTrajectoryValidationStudyError(ValueError):
    """A row or study cannot be admitted to the fixed validation universe."""


def _strict_sha256(value: object, name: str) -> str:
    if type(value) is not str or _SHA256_RE.fullmatch(value) is None:
        raise VbdTrajectoryValidationStudyError(
            f"{name} must be lowercase SHA-256"
        )
    return value


def _strict_finite(value: object, name: str) -> float:
    if type(value) is not float or not math.isfinite(value):
        raise VbdTrajectoryValidationStudyError(f"{name} must be a finite float")
    return value


def _strict_code(value: object, name: str) -> str:
    if type(value) is not str or _SAFE_CODE_RE.fullmatch(value) is None:
        raise VbdTrajectoryValidationStudyError(f"{name} must be a safe code")
    return value


def _expected_row_state(slot: VbdTrajectoryValidationSlot) -> str:
    if slot.fit_expected:
        if slot.family == "floor" and slot.k in (5, 8):
            return "FIT_INELIGIBLE"
        return "FIT_COMPLETE"
    if slot.expected_outcome == "reject_before_fit":
        return "EXPECTED_REJECTION"
    if slot.expected_outcome in ("hold_before_fit", "full_study_hold"):
        return "EXPECTED_HOLD"
    if slot.expected_outcome == "runner_refusal_and_full_study_hold":
        return "RECOMPUTE_REFUSED"
    if slot.expected_outcome == "durable_runner_error_and_full_study_hold":
        return "CONTROLLED_RUNNER_ERROR"
    if slot.expected_outcome == "reject_artifact":
        return "ARTIFACT_REJECTED"
    raise VbdTrajectoryValidationStudyError(
        f"slot has no compiled row state: {slot.slot_id}"
    )


def _expected_result_stage(slot: VbdTrajectoryValidationSlot) -> str:
    if slot.scenario_or_control_id == "understated_uncertainty":
        return "none"
    return slot.expected_failure_stage


def _expected_failure_code(slot: VbdTrajectoryValidationSlot) -> str:
    if slot.fit_expected:
        return "none"
    if slot.expected_outcome == "durable_runner_error_and_full_study_hold":
        return "controlled_runner_error"
    if slot.matched_outcome_holds_full_study:
        return "expected_subject_study_hold"
    if slot.expected_outcome == "reject_artifact":
        return "expected_artifact_rejection"
    return "expected_control_state"


@dataclass(frozen=True, slots=True)
class VbdTrajectoryLaneResult:
    lane: str
    raw_truth: float
    direction_sign: int
    direction_adjusted_truth: float
    posterior_mean: float
    posterior_sd: float
    interval_80_lower: float
    interval_80_upper: float
    interval_99_lower: float
    interval_99_upper: float
    interval_80_covers_truth: bool
    internal_false_movement: bool
    prepared_input_hash: str
    model_input_hash: str
    context_binding_hash: str
    fit_summary_hash: str
    diagnostics_hash: str
    lane_result_hash: str

    def __post_init__(self) -> None:
        if self.lane not in VBD_TRAJECTORY_LANES:
            raise VbdTrajectoryValidationStudyError("lane result is off plan")
        for name in (
            "raw_truth",
            "direction_adjusted_truth",
            "posterior_mean",
            "posterior_sd",
            "interval_80_lower",
            "interval_80_upper",
            "interval_99_lower",
            "interval_99_upper",
        ):
            _strict_finite(getattr(self, name), f"lane {name}")
        if type(self.direction_sign) is not int or self.direction_sign not in (-1, 1):
            raise VbdTrajectoryValidationStudyError("lane direction is invalid")
        if self.posterior_sd <= 0.0:
            raise VbdTrajectoryValidationStudyError("posterior SD must be positive")
        if not (
            self.interval_99_lower
            <= self.interval_80_lower
            <= self.interval_80_upper
            <= self.interval_99_upper
        ):
            raise VbdTrajectoryValidationStudyError(
                "posterior intervals must be ordered and nested"
            )
        expected_truth = self.direction_sign * self.raw_truth
        if not math.isclose(
            self.direction_adjusted_truth,
            expected_truth,
            rel_tol=0.0,
            abs_tol=1e-15,
        ):
            raise VbdTrajectoryValidationStudyError(
                "direction-adjusted truth is inconsistent"
            )
        expected_coverage = (
            self.interval_80_lower
            <= self.direction_adjusted_truth
            <= self.interval_80_upper
        )
        if self.interval_80_covers_truth is not expected_coverage:
            raise VbdTrajectoryValidationStudyError("coverage flag is not derived")
        if self.internal_false_movement is not (self.interval_99_lower > 0.0):
            raise VbdTrajectoryValidationStudyError(
                "false-movement flag must use strict 99% lower > 0"
            )
        for name in (
            "prepared_input_hash",
            "model_input_hash",
            "context_binding_hash",
            "fit_summary_hash",
            "diagnostics_hash",
        ):
            _strict_sha256(getattr(self, name), name)
        if self.lane_result_hash != sha256_json(self.body_without_hash()):
            raise VbdTrajectoryValidationStudyError("lane result hash mismatch")

    def body_without_hash(self) -> dict:
        return {
            "lane": self.lane,
            "raw_truth": self.raw_truth,
            "direction_sign": self.direction_sign,
            "direction_adjusted_truth": self.direction_adjusted_truth,
            "posterior_summary": {
                "mean": self.posterior_mean,
                "sd": self.posterior_sd,
                "credible_interval_80": {
                    "lower": self.interval_80_lower,
                    "upper": self.interval_80_upper,
                },
                "credible_interval_99": {
                    "lower": self.interval_99_lower,
                    "upper": self.interval_99_upper,
                },
            },
            "interval_80_covers_truth": self.interval_80_covers_truth,
            "internal_false_movement": self.internal_false_movement,
            "prepared_input_hash": self.prepared_input_hash,
            "model_input_hash": self.model_input_hash,
            "context_binding_hash": self.context_binding_hash,
            "fit_summary_hash": self.fit_summary_hash,
            "diagnostics_hash": self.diagnostics_hash,
        }

    def to_dict(self) -> dict:
        return {**self.body_without_hash(), "lane_result_hash": self.lane_result_hash}


def build_vbd_trajectory_lane_result(
    *,
    lane: str,
    raw_truth: float,
    direction_sign: int,
    posterior_mean: float,
    posterior_sd: float,
    interval_80_lower: float,
    interval_80_upper: float,
    interval_99_lower: float,
    interval_99_upper: float,
    prepared_input_hash: str,
    model_input_hash: str,
    context_binding_hash: str,
    fit_summary_hash: str,
    diagnostics_hash: str,
) -> VbdTrajectoryLaneResult:
    direction_adjusted_truth = float(direction_sign * raw_truth)
    body = {
        "lane": lane,
        "raw_truth": float(raw_truth),
        "direction_sign": direction_sign,
        "direction_adjusted_truth": direction_adjusted_truth,
        "posterior_summary": {
            "mean": float(posterior_mean),
            "sd": float(posterior_sd),
            "credible_interval_80": {
                "lower": float(interval_80_lower),
                "upper": float(interval_80_upper),
            },
            "credible_interval_99": {
                "lower": float(interval_99_lower),
                "upper": float(interval_99_upper),
            },
        },
        "interval_80_covers_truth": (
            interval_80_lower <= direction_adjusted_truth <= interval_80_upper
        ),
        "internal_false_movement": interval_99_lower > 0.0,
        "prepared_input_hash": prepared_input_hash,
        "model_input_hash": model_input_hash,
        "context_binding_hash": context_binding_hash,
        "fit_summary_hash": fit_summary_hash,
        "diagnostics_hash": diagnostics_hash,
    }
    return VbdTrajectoryLaneResult(
        lane=lane,
        raw_truth=float(raw_truth),
        direction_sign=direction_sign,
        direction_adjusted_truth=direction_adjusted_truth,
        posterior_mean=float(posterior_mean),
        posterior_sd=float(posterior_sd),
        interval_80_lower=float(interval_80_lower),
        interval_80_upper=float(interval_80_upper),
        interval_99_lower=float(interval_99_lower),
        interval_99_upper=float(interval_99_upper),
        interval_80_covers_truth=body["interval_80_covers_truth"],
        internal_false_movement=body["internal_false_movement"],
        prepared_input_hash=prepared_input_hash,
        model_input_hash=model_input_hash,
        context_binding_hash=context_binding_hash,
        fit_summary_hash=fit_summary_hash,
        diagnostics_hash=diagnostics_hash,
        lane_result_hash=sha256_json(body),
    )


@dataclass(frozen=True, slots=True)
class VbdTrajectorySlotResult:
    slot: VbdTrajectoryValidationSlot
    row_state: str
    failure_stage: str
    failure_code: str
    fit_attempted: bool
    lane_results: tuple[VbdTrajectoryLaneResult, ...]
    hard_diagnostic_failure: bool
    unplanned_runner_error: bool
    controlled_subject_study_hold: bool
    semantic_result_hash: str

    def __post_init__(self) -> None:
        if type(self.slot) is not VbdTrajectoryValidationSlot:
            raise VbdTrajectoryValidationStudyError("slot result has an invalid slot")
        canonical = next(
            (
                slot
                for slot in required_vbd_trajectory_validation_slots()
                if slot.slot_id == self.slot.slot_id
            ),
            None,
        )
        if canonical is None or self.slot != canonical:
            raise VbdTrajectoryValidationStudyError("slot result is off plan")
        if self.row_state not in _ROW_STATES:
            raise VbdTrajectoryValidationStudyError("row state is unsupported")
        _strict_code(self.failure_stage, "failure_stage")
        _strict_code(self.failure_code, "failure_code")
        if self.failure_stage not in _compiled_failure_stages():
            raise VbdTrajectoryValidationStudyError(
                "failure_stage is not in the compiled internal vocabulary"
            )
        if self.failure_code not in _FAILURE_CODES:
            raise VbdTrajectoryValidationStudyError(
                "failure_code is not in the compiled internal vocabulary"
            )
        for name in (
            "fit_attempted",
            "hard_diagnostic_failure",
            "unplanned_runner_error",
            "controlled_subject_study_hold",
        ):
            if type(getattr(self, name)) is not bool:
                raise VbdTrajectoryValidationStudyError(f"{name} must be boolean")
        if type(self.lane_results) is not tuple or any(
            type(value) is not VbdTrajectoryLaneResult
            for value in self.lane_results
        ):
            raise VbdTrajectoryValidationStudyError(
                "lane results must be exact immutable records"
            )
        if self.fit_attempted and not (
            len(self.lane_results) == 3
            and tuple(result.lane for result in self.lane_results)
            == VBD_TRAJECTORY_LANES
        ):
            raise VbdTrajectoryValidationStudyError(
                "attempted fit requires all three ordered lane summaries"
            )
        if not self.fit_attempted and self.lane_results:
            raise VbdTrajectoryValidationStudyError(
                "non-fit result cannot contain lane summaries"
            )
        for index, lane_result in enumerate(self.lane_results):
            if (
                lane_result.raw_truth != self.slot.truth_vector[index]
                or lane_result.direction_sign != self.slot.direction_vector[index]
            ):
                raise VbdTrajectoryValidationStudyError(
                    "lane truth does not match its compiled slot"
                )
        if self.semantic_result_hash != sha256_json(self.body_without_hash()):
            raise VbdTrajectoryValidationStudyError("semantic result hash mismatch")

    @property
    def expectation_matched(self) -> bool:
        return (
            self.row_state == _expected_row_state(self.slot)
            and self.failure_stage == _expected_result_stage(self.slot)
            and self.failure_code == _expected_failure_code(self.slot)
            and self.fit_attempted is self.slot.fit_expected
            and self.hard_diagnostic_failure is False
            and self.unplanned_runner_error is False
            and self.controlled_subject_study_hold
            is self.slot.matched_outcome_holds_full_study
        )

    def body_without_hash(self) -> dict:
        return {
            "schema_version": VBD_TRAJECTORY_VALIDATION_RESULT_SCHEMA_VERSION,
            "plan_hash": immutable_vbd_trajectory_validation_plan().plan_hash,
            "slot": self.slot.to_dict(),
            "row_state": self.row_state,
            "failure_stage": self.failure_stage,
            "failure_code": self.failure_code,
            "fit_attempted": self.fit_attempted,
            "lane_results": [result.to_dict() for result in self.lane_results],
            "hard_diagnostic_failure": self.hard_diagnostic_failure,
            "unplanned_runner_error": self.unplanned_runner_error,
            "controlled_subject_study_hold": self.controlled_subject_study_hold,
        }

    def to_dict(self) -> dict:
        return {
            **self.body_without_hash(),
            "expectation_matched": self.expectation_matched,
            "semantic_result_hash": self.semantic_result_hash,
        }


def build_vbd_trajectory_slot_result(
    *,
    slot: VbdTrajectoryValidationSlot,
    row_state: str,
    failure_stage: str,
    failure_code: str,
    fit_attempted: bool,
    lane_results: tuple[VbdTrajectoryLaneResult, ...],
    hard_diagnostic_failure: bool = False,
    unplanned_runner_error: bool = False,
    controlled_subject_study_hold: bool = False,
) -> VbdTrajectorySlotResult:
    provisional = VbdTrajectorySlotResult.__new__(VbdTrajectorySlotResult)
    values = {
        "slot": slot,
        "row_state": row_state,
        "failure_stage": failure_stage,
        "failure_code": failure_code,
        "fit_attempted": fit_attempted,
        "lane_results": lane_results,
        "hard_diagnostic_failure": hard_diagnostic_failure,
        "unplanned_runner_error": unplanned_runner_error,
        "controlled_subject_study_hold": controlled_subject_study_hold,
        "semantic_result_hash": "",
    }
    for name, value in values.items():
        object.__setattr__(provisional, name, value)
    semantic_hash = sha256_json(provisional.body_without_hash())
    return VbdTrajectorySlotResult(
        slot=slot,
        row_state=row_state,
        failure_stage=failure_stage,
        failure_code=failure_code,
        fit_attempted=fit_attempted,
        lane_results=lane_results,
        hard_diagnostic_failure=hard_diagnostic_failure,
        unplanned_runner_error=unplanned_runner_error,
        controlled_subject_study_hold=controlled_subject_study_hold,
        semantic_result_hash=semantic_hash,
    )


def targeted_clopper_pearson_interval(success_count: int) -> tuple[float, float]:
    if type(success_count) is not int or not 0 <= success_count <= 30:
        raise VbdTrajectoryValidationStudyError(
            "targeted success count must be in 0..30"
        )
    alpha_cell = VBD_TARGETED_FAMILY_ALPHA / VBD_TARGETED_CELL_COUNT
    lower = (
        0.0
        if success_count == 0
        else float(
            beta_distribution.ppf(
                alpha_cell / 2.0,
                success_count,
                30 - success_count + 1,
            )
        )
    )
    upper = (
        1.0
        if success_count == 30
        else float(
            beta_distribution.ppf(
                1.0 - alpha_cell / 2.0,
                success_count + 1,
                30 - success_count,
            )
        )
    )
    if not math.isfinite(lower) or not math.isfinite(upper):
        raise VbdTrajectoryValidationStudyError("Clopper-Pearson interval failed")
    return lower, upper


def targeted_coverage_gate(success_count: int) -> bool:
    lower, upper = targeted_clopper_pearson_interval(success_count)
    return lower <= VBD_PRIMARY_COVERAGE_RATE_MAX and upper >= (
        VBD_PRIMARY_COVERAGE_RATE_MIN
    )


def primary_coverage_gate(success_count: int) -> bool:
    if type(success_count) is not int or not 0 <= success_count <= 200:
        raise VbdTrajectoryValidationStudyError(
            "primary success count must be in 0..200"
        )
    rate = success_count / 200
    return VBD_PRIMARY_COVERAGE_RATE_MIN <= rate <= (
        VBD_PRIMARY_COVERAGE_RATE_MAX
    )


def _coverage_cell(
    *,
    family: str,
    scenario: str,
    groups: int,
    lane: str,
    rows: tuple[VbdTrajectorySlotResult, ...],
) -> dict:
    lane_index = VBD_TRAJECTORY_LANES.index(lane)
    count = sum(row.lane_results[lane_index].interval_80_covers_truth for row in rows)
    denominator = len(rows)
    rate = count / denominator
    if family == "primary":
        gate = VBD_PRIMARY_COVERAGE_RATE_MIN <= rate <= VBD_PRIMARY_COVERAGE_RATE_MAX
        interval = None
    else:
        lower, upper = targeted_clopper_pearson_interval(count)
        gate = lower <= VBD_PRIMARY_COVERAGE_RATE_MAX and upper >= (
            VBD_PRIMARY_COVERAGE_RATE_MIN
        )
        interval = {"lower": lower, "upper": upper}
    return {
        "family": family,
        "scenario": scenario,
        "panel_group_count": groups,
        "lane": lane,
        "coverage_count": count,
        "replication_count": denominator,
        "coverage_rate": rate,
        "simultaneous_interval": interval,
        "gate_passed": gate,
    }


def evaluate_vbd_trajectory_result_manifest(
    observed_ids: tuple[str, ...],
) -> dict:
    """Evaluate the exact ordered result-key universe used by the combiner."""

    if type(observed_ids) is not tuple or any(
        type(value) is not str for value in observed_ids
    ):
        raise VbdTrajectoryValidationStudyError(
            "result manifest ids must be an immutable string tuple"
        )
    canonical_ids = tuple(
        slot.slot_id for slot in required_vbd_trajectory_validation_slots()
    )
    counts = Counter(observed_ids)
    duplicate_ids = tuple(
        sorted(key for key, count in counts.items() if count > 1)
    )
    canonical_set = set(canonical_ids)
    missing_ids = tuple(
        slot_id for slot_id in canonical_ids if slot_id not in counts
    )
    off_plan_ids = tuple(
        sorted(key for key in counts if key not in canonical_set)
    )
    exact_manifest = (
        len(observed_ids) == VBD_TRAJECTORY_VALIDATION_REQUIRED_SLOT_COUNT
        and not duplicate_ids
        and not missing_ids
        and not off_plan_ids
        and observed_ids == canonical_ids
    )
    return {
        "canonical_ids": canonical_ids,
        "duplicate_ids": duplicate_ids,
        "missing_ids": missing_ids,
        "off_plan_ids": off_plan_ids,
        "exact_manifest_complete": exact_manifest,
        "canonical_order_complete": observed_ids == canonical_ids,
    }


def summarize_vbd_trajectory_validation_results(
    results: tuple[VbdTrajectorySlotResult, ...],
) -> dict:
    if type(results) is not tuple or any(
        type(result) is not VbdTrajectorySlotResult for result in results
    ):
        raise VbdTrajectoryValidationStudyError(
            "study results must be exact immutable result records"
        )
    observed_ids = tuple(result.slot.slot_id for result in results)
    manifest = evaluate_vbd_trajectory_result_manifest(observed_ids)
    canonical_ids = manifest["canonical_ids"]
    duplicate_ids = manifest["duplicate_ids"]
    missing_ids = manifest["missing_ids"]
    off_plan_ids = manifest["off_plan_ids"]
    exact_manifest = manifest["exact_manifest_complete"]
    failing_checks = []
    if not exact_manifest:
        failing_checks.append("exact_manifest_incomplete")
    expectation_failure_count = sum(not result.expectation_matched for result in results)
    if expectation_failure_count:
        failing_checks.append("slot_expectation_failure")
    hard_failure_count = sum(
        result.hard_diagnostic_failure or result.unplanned_runner_error
        for result in results
    )
    if hard_failure_count:
        failing_checks.append("hard_or_runner_failure")

    coverage_cells: list[dict] = []
    null_cells: list[dict] = []
    bias_cells: list[dict] = []
    understated_cells: list[dict] = []
    if exact_manifest and expectation_failure_count == 0 and hard_failure_count == 0:
        by_cell: dict[tuple[str, str, int], list[VbdTrajectorySlotResult]] = {}
        for result in results:
            key = (
                result.slot.family,
                result.slot.scenario_or_control_id,
                result.slot.panel_group_count,
            )
            by_cell.setdefault(key, []).append(result)

        for (family, scenario, groups), cell_rows in by_cell.items():
            rows = tuple(cell_rows)
            if family == "primary":
                if len(rows) != 200:
                    failing_checks.append("primary_cell_count")
                    continue
                for lane in VBD_TRAJECTORY_LANES:
                    coverage_cells.append(
                        _coverage_cell(
                            family=family,
                            scenario=scenario,
                            groups=groups,
                            lane=lane,
                            rows=rows,
                        )
                    )
            elif family == "targeted":
                if len(rows) != 30:
                    failing_checks.append("targeted_cell_count")
                    continue
                for lane in VBD_TRAJECTORY_LANES:
                    coverage_cells.append(
                        _coverage_cell(
                            family=family,
                            scenario=scenario,
                            groups=groups,
                            lane=lane,
                            rows=rows,
                        )
                    )
            elif family == "drift" and scenario == "understated_uncertainty":
                for lane_index, lane in enumerate(VBD_TRAJECTORY_LANES):
                    count = sum(
                        row.lane_results[lane_index].interval_80_covers_truth
                        for row in rows
                    )
                    understated_cells.append(
                        {
                            "scenario": scenario,
                            "panel_group_count": groups,
                            "lane": lane,
                            "coverage_count": count,
                            "replication_count": len(rows),
                            "coverage_rate": count / len(rows),
                        }
                    )

            if family in ("primary", "targeted"):
                zero_indexes = tuple(
                    index
                    for index, truth in enumerate(rows[0].slot.truth_vector)
                    if truth == 0.0
                )
                if zero_indexes:
                    false_count = sum(
                        any(
                            row.lane_results[index].internal_false_movement
                            for index in zero_indexes
                        )
                        for row in rows
                    )
                    null_cells.append(
                        {
                            "family": family,
                            "scenario": scenario,
                            "panel_group_count": groups,
                            "zero_truth_lanes": [
                                VBD_TRAJECTORY_LANES[index]
                                for index in zero_indexes
                            ],
                            "false_movement_count": false_count,
                            "replication_count": len(rows),
                            "false_movement_rate": false_count / len(rows),
                            "gate_passed": false_count / len(rows)
                            <= VBD_NULL_FALSE_MOVEMENT_RATE_MAX,
                        }
                    )
                for lane_index, lane in enumerate(VBD_TRAJECTORY_LANES):
                    truths = [
                        row.lane_results[lane_index].direction_adjusted_truth
                        for row in rows
                    ]
                    if truths[0] == 0.0:
                        continue
                    mean_estimate = sum(
                        row.lane_results[lane_index].posterior_mean for row in rows
                    ) / len(rows)
                    mean_truth = sum(truths) / len(truths)
                    absolute_bias = abs(mean_estimate - mean_truth)
                    bias_cells.append(
                        {
                            "family": family,
                            "scenario": scenario,
                            "panel_group_count": groups,
                            "lane": lane,
                            "mean_posterior_estimate": mean_estimate,
                            "direction_adjusted_truth": mean_truth,
                            "absolute_bias": absolute_bias,
                            "gate_passed": absolute_bias <= VBD_ABSOLUTE_BIAS_MAX
                            and mean_estimate * mean_truth > 0.0,
                        }
                    )

        if any(not cell["gate_passed"] for cell in coverage_cells):
            primary_failed = any(
                cell["family"] == "primary" and not cell["gate_passed"]
                for cell in coverage_cells
            )
            targeted_failed = any(
                cell["family"] == "targeted" and not cell["gate_passed"]
                for cell in coverage_cells
            )
            if primary_failed:
                failing_checks.append("primary_coverage_gate")
            if targeted_failed:
                failing_checks.append("targeted_coverage_gate")
        if any(not cell["gate_passed"] for cell in null_cells):
            failing_checks.append("familywise_null_gate")
        if any(not cell["gate_passed"] for cell in bias_cells):
            failing_checks.append("bias_or_sign_gate")
        if not understated_cells or not any(
            cell["coverage_rate"] < VBD_PRIMARY_COVERAGE_RATE_MIN
            for cell in understated_cells
        ):
            failing_checks.append("understated_uncertainty_control")
        expected_structural_drift = set(VBD_TRAJECTORY_VALIDATION_DRIFT_ORDER[:5])
        observed_structural_drift = {
            result.slot.scenario_or_control_id
            for result in results
            if result.slot.family == "drift"
            and result.row_state == "EXPECTED_REJECTION"
            and result.expectation_matched
        }
        if observed_structural_drift != expected_structural_drift:
            failing_checks.append("structural_drift_controls")

    failing_checks = tuple(dict.fromkeys(failing_checks))
    worst_null_rate = (
        max(cell["false_movement_rate"] for cell in null_cells)
        if null_cells
        else None
    )
    body = {
        "schema_version": VBD_TRAJECTORY_VALIDATION_STUDY_SCHEMA_VERSION,
        "plan_hash": immutable_vbd_trajectory_validation_plan().plan_hash,
        "expected_slot_count": VBD_TRAJECTORY_VALIDATION_REQUIRED_SLOT_COUNT,
        "observed_slot_count": len(results),
        "exact_manifest_complete": exact_manifest,
        "canonical_order_complete": observed_ids == canonical_ids,
        "missing_slot_id_hashes": [sha256_json(value) for value in missing_ids],
        "duplicate_slot_id_hashes": [sha256_json(value) for value in duplicate_ids],
        "off_plan_slot_id_hashes": [sha256_json(value) for value in off_plan_ids],
        "expectation_failure_count": expectation_failure_count,
        "hard_failure_count": hard_failure_count,
        "slot_result_hashes_hash": sha256_json(
            [result.semantic_result_hash for result in results]
        ),
        "coverage_cells": coverage_cells,
        "null_cells": null_cells,
        "bias_cells": bias_cells,
        "understated_uncertainty_cells": understated_cells,
        "worst_null_false_movement_rate": worst_null_rate,
        "state": "PASS" if not failing_checks else "HOLD",
        "failing_checks": list(failing_checks),
        "internal_only": True,
        "synthetic_only": True,
        "aggregate_only": True,
        "customer_output_authorized": False,
        "independent_acceptance_complete": False,
        "task_5_6_complete": False,
        "promotion_complete": False,
    }
    return {**body, "study_hash": sha256_json(body)}


def combine_vbd_trajectory_validation_phases(
    *,
    original_results: tuple[VbdTrajectorySlotResult, ...],
    recomputation_results: tuple[VbdTrajectorySlotResult, ...],
) -> dict:
    original = summarize_vbd_trajectory_validation_results(original_results)
    recomputation = summarize_vbd_trajectory_validation_results(
        recomputation_results
    )
    same_order = tuple(result.slot.slot_id for result in original_results) == tuple(
        result.slot.slot_id for result in recomputation_results
    )
    semantic_match = tuple(
        result.semantic_result_hash for result in original_results
    ) == tuple(result.semantic_result_hash for result in recomputation_results)
    failing_checks = []
    if original["state"] != "PASS":
        failing_checks.append("original_study_hold")
    if recomputation["state"] != "PASS":
        failing_checks.append("recomputation_study_hold")
    if not same_order:
        failing_checks.append("phase_slot_order_mismatch")
    if not semantic_match:
        failing_checks.append("fresh_semantic_recomputation_mismatch")
    body = {
        "schema_version": "FT_AI_VALUE_VBD_TRAJECTORY_COMBINED_2026_07_V1",
        "plan_hash": immutable_vbd_trajectory_validation_plan().plan_hash,
        "original_study_hash": original["study_hash"],
        "recomputation_study_hash": recomputation["study_hash"],
        "original_slot_count": len(original_results),
        "recomputation_slot_count": len(recomputation_results),
        "exact_phase_slot_order_match": same_order,
        "fresh_semantic_results_match": semantic_match,
        "state": (
            "SEMANTIC_MATCH_NON_PUBLISHING"
            if not failing_checks
            else "HOLD"
        ),
        "failing_checks": failing_checks,
        "fresh_process_provenance_validated": False,
        "publication_ready": False,
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
        "independent_acceptance_complete": False,
        "task_5_6_complete": False,
        "promotion_complete": False,
    }
    return {**body, "combined_study_hash": sha256_json(body)}


def vbd_trajectory_slot_result_from_dict(value: object) -> VbdTrajectorySlotResult:
    if type(value) is not dict:
        raise VbdTrajectoryValidationStudyError("slot result must be an object")
    expected = {
        "schema_version",
        "plan_hash",
        "slot",
        "row_state",
        "failure_stage",
        "failure_code",
        "fit_attempted",
        "lane_results",
        "hard_diagnostic_failure",
        "unplanned_runner_error",
        "controlled_subject_study_hold",
        "expectation_matched",
        "semantic_result_hash",
    }
    if set(value) != expected:
        raise VbdTrajectoryValidationStudyError(
            "slot result has missing or unknown fields"
        )
    if value["schema_version"] != VBD_TRAJECTORY_VALIDATION_RESULT_SCHEMA_VERSION:
        raise VbdTrajectoryValidationStudyError("slot result schema drifted")
    if value["plan_hash"] != immutable_vbd_trajectory_validation_plan().plan_hash:
        raise VbdTrajectoryValidationStudyError("slot result plan hash drifted")
    row_state = value["row_state"]
    if type(row_state) is not str or row_state not in _ROW_STATES:
        raise VbdTrajectoryValidationStudyError("row state is unsupported")
    slot = vbd_trajectory_validation_slot_from_dict(value["slot"])
    if type(value["lane_results"]) is not list:
        raise VbdTrajectoryValidationStudyError("lane results must be an array")
    lane_results = tuple(_lane_result_from_dict(item) for item in value["lane_results"])
    result = VbdTrajectorySlotResult(
        slot=slot,
        row_state=row_state,
        failure_stage=_strict_code(value["failure_stage"], "failure_stage"),
        failure_code=_strict_code(value["failure_code"], "failure_code"),
        fit_attempted=value["fit_attempted"],
        lane_results=lane_results,
        hard_diagnostic_failure=value["hard_diagnostic_failure"],
        unplanned_runner_error=value["unplanned_runner_error"],
        controlled_subject_study_hold=value["controlled_subject_study_hold"],
        semantic_result_hash=_strict_sha256(
            value["semantic_result_hash"], "semantic_result_hash"
        ),
    )
    if type(value["expectation_matched"]) is not bool or (
        value["expectation_matched"] is not result.expectation_matched
    ):
        raise VbdTrajectoryValidationStudyError(
            "expectation-matched flag is not derived"
        )
    if result.to_dict() != value:
        raise VbdTrajectoryValidationStudyError("slot result bytes are noncanonical")
    return result


def _lane_result_from_dict(value: object) -> VbdTrajectoryLaneResult:
    if type(value) is not dict:
        raise VbdTrajectoryValidationStudyError("lane result must be an object")
    expected = {
        "lane",
        "raw_truth",
        "direction_sign",
        "direction_adjusted_truth",
        "posterior_summary",
        "interval_80_covers_truth",
        "internal_false_movement",
        "prepared_input_hash",
        "model_input_hash",
        "context_binding_hash",
        "fit_summary_hash",
        "diagnostics_hash",
        "lane_result_hash",
    }
    if set(value) != expected or type(value["posterior_summary"]) is not dict:
        raise VbdTrajectoryValidationStudyError("lane result shape is invalid")
    posterior = value["posterior_summary"]
    if set(posterior) != {"mean", "sd", "credible_interval_80", "credible_interval_99"}:
        raise VbdTrajectoryValidationStudyError("posterior summary shape is invalid")
    interval80 = posterior["credible_interval_80"]
    interval99 = posterior["credible_interval_99"]
    if (
        type(interval80) is not dict
        or type(interval99) is not dict
        or set(interval80) != {"lower", "upper"}
        or set(interval99) != {"lower", "upper"}
    ):
        raise VbdTrajectoryValidationStudyError("posterior interval shape is invalid")
    return VbdTrajectoryLaneResult(
        lane=value["lane"],
        raw_truth=_strict_finite(value["raw_truth"], "raw_truth"),
        direction_sign=value["direction_sign"],
        direction_adjusted_truth=_strict_finite(
            value["direction_adjusted_truth"], "direction_adjusted_truth"
        ),
        posterior_mean=_strict_finite(posterior["mean"], "posterior mean"),
        posterior_sd=_strict_finite(posterior["sd"], "posterior sd"),
        interval_80_lower=_strict_finite(interval80["lower"], "80 lower"),
        interval_80_upper=_strict_finite(interval80["upper"], "80 upper"),
        interval_99_lower=_strict_finite(interval99["lower"], "99 lower"),
        interval_99_upper=_strict_finite(interval99["upper"], "99 upper"),
        interval_80_covers_truth=value["interval_80_covers_truth"],
        internal_false_movement=value["internal_false_movement"],
        prepared_input_hash=_strict_sha256(
            value["prepared_input_hash"], "prepared_input_hash"
        ),
        model_input_hash=_strict_sha256(value["model_input_hash"], "model_input_hash"),
        context_binding_hash=_strict_sha256(
            value["context_binding_hash"], "context_binding_hash"
        ),
        fit_summary_hash=_strict_sha256(value["fit_summary_hash"], "fit_summary_hash"),
        diagnostics_hash=_strict_sha256(value["diagnostics_hash"], "diagnostics_hash"),
        lane_result_hash=_strict_sha256(value["lane_result_hash"], "lane_result_hash"),
    )
