"""Compiled floor, lag, shock, and negative controls for replicated validation."""

from __future__ import annotations

from dataclasses import asdict, dataclass, replace
import math
from pathlib import Path
from typing import Literal, Sequence

import numpy as np

from .hashing import sha256_json
from .longitudinal_replicated_validation import (
    ExecutionIdentity,
    LONGITUDINAL_REPLICATED_VALIDATION_AGGREGATE_K,
    LONGITUDINAL_REPLICATED_VALIDATION_NULL_SIGNAL_Z,
    LONGITUDINAL_REPLICATED_VALIDATION_PROVENANCE_FLOOR_K,
    LONGITUDINAL_REPLICATED_VALIDATION_VALIDATION_FLOOR_K,
    ReplicatedValidationWorkspaceError,
    build_execution_identity,
    initialize_replicated_validation_workspace,
    read_json,
    replicated_validation_workspace_path,
    strict_json_equal,
    write_json_atomic,
)
from .longitudinal_state_space import (
    fit_deterministic_state_space,
    prepare_longitudinal_state_space,
)
from .longitudinal_synthetic import generate_longitudinal_dataset
from .longitudinal_types import LongitudinalSyntheticDataset
from .longitudinal_validation_synthetic import (
    LONGITUDINAL_VALIDATION_PRE_WINDOW_COUNT,
    generate_longitudinal_validation_case,
)


LONGITUDINAL_FLOOR_CONTROL_K_VALUES = (4, 8, 12, 16)
LONGITUDINAL_LAG_TRUE_WINDOWS = (1, 2, 3)
LONGITUDINAL_LAG_CANDIDATE_WINDOWS = (0, 1, 2, 3, 4)
LONGITUDINAL_LAG_REPLICATIONS_PER_TRUTH = 30
LONGITUDINAL_LAG_REQUIRED_RECOVERIES_PER_TRUTH = 24
LONGITUDINAL_LAG_SCORE_TIE_EPSILON = 1e-9
LONGITUDINAL_LAG_EFFECT_SIZE_SD = 0.5
LONGITUDINAL_LAG_PANEL_GROUP_COUNT = 6
LONGITUDINAL_CONTROL_PLAN_VERSION = "1.0.0"
LONGITUDINAL_FLOOR_CONTROL_BASE_SEED = 203010000
LONGITUDINAL_LAG_CONTROL_BASE_SEED = 203020000
LONGITUDINAL_NEGATIVE_CONTROL_BASE_SEED = 203100000

LONGITUDINAL_NEGATIVE_CONTROL_IDS = (
    "uncontrolled_common_shock",
    "approved_control_shock",
    "unrelated_outcome_shock",
    "temporary_movement",
    "weak_history",
    "missing_windows",
    "unsafe_data",
    "unsupported_route",
    "target_contamination",
)

_STRUCTURAL_NEGATIVE_REJECTIONS = {
    "weak_history": (
        "StateSpaceInputError",
        "state-space validation requires sufficient history",
    ),
    "missing_windows": (
        "StateSpaceInputError",
        "required windows must be complete and observed",
    ),
    "unsafe_data": (
        "ValueError",
        "longitudinal proof accepts synthetic aggregate inputs only; "
        "rejected dataset flags: real_data_present",
    ),
    "unsupported_route": (
        "StateSpaceInputError",
        "evidence design does not route to longitudinal validation",
    ),
    "target_contamination": (
        "StateSpaceInputError",
        "target contamination is prohibited",
    ),
}

_VELOCITY_WEIGHT = 0.55
_BREADTH_WEIGHT = 0.45
_LAG_POST_WINDOW_COUNT = 12
_LAG_VELOCITY_SIGNATURE = (
    0.15,
    0.45,
    0.05,
    0.35,
    0.10,
    0.50,
    0.08,
    0.30,
    0.18,
    0.42,
    0.12,
    0.38,
)
_LAG_BREADTH_SIGNATURE = (
    0.40,
    0.08,
    0.32,
    0.12,
    0.48,
    0.06,
    0.28,
    0.16,
    0.44,
    0.10,
    0.36,
    0.14,
)
_LAG_DEPTH_SIGNATURE = (
    0.18,
    0.30,
    0.16,
    0.26,
    0.22,
    0.34,
    0.19,
    0.28,
    0.24,
    0.32,
    0.20,
    0.29,
)


@dataclass(frozen=True, order=True)
class LagControlSlot:
    true_lag_windows: int
    replication_index: int
    seed: int

    @property
    def control_id(self) -> str:
        return (
            f"lag_true_{self.true_lag_windows}"
            f"__rep_{self.replication_index:02d}__seed_{self.seed}"
        )

    def to_dict(self) -> dict:
        return {
            "control_id": self.control_id,
            "true_lag_windows": self.true_lag_windows,
            "replication_index": self.replication_index,
            "seed": self.seed,
            "candidate_lag_windows": list(LONGITUDINAL_LAG_CANDIDATE_WINDOWS),
            "aggregate_measurement_cell_k": (
                LONGITUDINAL_REPLICATED_VALIDATION_AGGREGATE_K
            ),
            "panel_group_count": LONGITUDINAL_LAG_PANEL_GROUP_COUNT,
            "effect_size_sd": LONGITUDINAL_LAG_EFFECT_SIZE_SD,
        }


@dataclass(frozen=True)
class LagCandidateScore:
    candidate_lag_windows: int
    declared_input_lag_windows: int
    status: Literal["PASS", "HOLD"]
    negative_log_posterior_at_mode: float | None
    synthetic_input_hash: str | None
    prepared_input_hash: str | None
    model_input_hash: str | None
    context_binding_hash: str | None
    truth_receipt_hash: str | None
    case_binding_hash: str | None
    fit_summary_hash: str | None
    runner_error_type: str | None
    candidate_result_hash: str = ""

    def body_without_hash(self) -> dict:
        return {
            "candidate_lag_windows": self.candidate_lag_windows,
            "declared_input_lag_windows": self.declared_input_lag_windows,
            "status": self.status,
            "negative_log_posterior_at_mode": (
                self.negative_log_posterior_at_mode
            ),
            "synthetic_input_hash": self.synthetic_input_hash,
            "prepared_input_hash": self.prepared_input_hash,
            "model_input_hash": self.model_input_hash,
            "context_binding_hash": self.context_binding_hash,
            "truth_receipt_hash": self.truth_receipt_hash,
            "case_binding_hash": self.case_binding_hash,
            "fit_summary_hash": self.fit_summary_hash,
            "runner_error_type": self.runner_error_type,
        }

    def to_dict(self) -> dict:
        return {
            **self.body_without_hash(),
            "candidate_result_hash": self.candidate_result_hash,
        }


@dataclass(frozen=True)
class LagValidationCase:
    dataset: LongitudinalSyntheticDataset
    truth_receipt: dict


@dataclass(frozen=True)
class ControlResult:
    control_id: str
    control_family: Literal["floor", "lag", "negative"]
    execution_mode: Literal["full", "smoke"]
    plan: dict
    evidence: dict
    expected_outcome: str
    observed_outcome: str
    control_passed: bool
    execution_identity_hash: str
    result_hash: str = ""

    def body_without_hash(self) -> dict:
        return {
            "control_id": self.control_id,
            "control_family": self.control_family,
            "execution_mode": self.execution_mode,
            "plan": self.plan,
            "evidence": self.evidence,
            "expected_outcome": self.expected_outcome,
            "observed_outcome": self.observed_outcome,
            "control_passed": self.control_passed,
            "execution_identity_hash": self.execution_identity_hash,
        }

    def to_dict(self) -> dict:
        return {**self.body_without_hash(), "result_hash": self.result_hash}


@dataclass(frozen=True)
class ControlStudyResult:
    execution_mode: Literal["full", "smoke"]
    floor_results: tuple[ControlResult, ...]
    lag_results: tuple[ControlResult, ...]
    negative_results: tuple[ControlResult, ...]
    lag_recovery_summaries: tuple[dict, ...]
    exact_manifest_complete: bool
    floor_gate_passed: bool
    lag_gate_passed: bool
    negative_control_gate_passed: bool
    study_status: Literal["PASS", "HOLD"]
    failing_checks: tuple[str, ...]
    execution_identity: ExecutionIdentity
    study_result_hash: str

    def body_without_hash(self) -> dict:
        return {
            "report_class": "longitudinal_replicated_validation_controls_v1",
            "control_plan": longitudinal_control_plan(),
            "execution_mode": self.execution_mode,
            "floor_results": [result.to_dict() for result in self.floor_results],
            "lag_results": [result.to_dict() for result in self.lag_results],
            "negative_results": [
                result.to_dict() for result in self.negative_results
            ],
            "lag_recovery_summaries": list(self.lag_recovery_summaries),
            "exact_manifest_complete": self.exact_manifest_complete,
            "floor_gate_passed": self.floor_gate_passed,
            "lag_gate_passed": self.lag_gate_passed,
            "negative_control_gate_passed": self.negative_control_gate_passed,
            "study_status": self.study_status,
            "failing_checks": list(self.failing_checks),
            "execution_identity": self.execution_identity.to_dict(),
            "internal_only": True,
            "synthetic_only": True,
            "customer_output_authorized": False,
            "probability_output_authorized": False,
            "confidence_output_authorized": False,
        }

    def to_dict(self) -> dict:
        return {**self.body_without_hash(), "study_result_hash": self.study_result_hash}


def floor_control_seed(aggregate_k: int) -> int:
    if aggregate_k not in LONGITUDINAL_FLOOR_CONTROL_K_VALUES:
        raise ValueError("floor control k must be one of 4, 8, 12, or 16")
    return LONGITUDINAL_FLOOR_CONTROL_BASE_SEED + aggregate_k


def lag_control_seed(*, true_lag_windows: int, replication_index: int) -> int:
    if true_lag_windows not in LONGITUDINAL_LAG_TRUE_WINDOWS:
        raise ValueError("true lag must be one of 1, 2, or 3")
    if (
        isinstance(replication_index, bool)
        or not isinstance(replication_index, int)
        or replication_index < 0
        or replication_index >= LONGITUDINAL_LAG_REPLICATIONS_PER_TRUTH
    ):
        raise ValueError("lag replication index must be in 0..29")
    true_index = LONGITUDINAL_LAG_TRUE_WINDOWS.index(true_lag_windows)
    return (
        LONGITUDINAL_LAG_CONTROL_BASE_SEED
        + true_index * 1_000
        + replication_index
    )


def negative_control_seed(control_id: str) -> int:
    try:
        index = LONGITUDINAL_NEGATIVE_CONTROL_IDS.index(control_id)
    except ValueError as exc:
        raise ValueError("negative control ID is not compiled") from exc
    return LONGITUDINAL_NEGATIVE_CONTROL_BASE_SEED + index


def required_lag_control_slots() -> tuple[LagControlSlot, ...]:
    return tuple(
        LagControlSlot(
            true_lag_windows=true_lag,
            replication_index=replication_index,
            seed=lag_control_seed(
                true_lag_windows=true_lag,
                replication_index=replication_index,
            ),
        )
        for true_lag in LONGITUDINAL_LAG_TRUE_WINDOWS
        for replication_index in range(LONGITUDINAL_LAG_REPLICATIONS_PER_TRUTH)
    )


def _floor_plan_entry(aggregate_k: int) -> dict:
    if aggregate_k < LONGITUDINAL_REPLICATED_VALIDATION_PROVENANCE_FLOOR_K:
        expected = "REJECTED_BEFORE_FIT_BELOW_PROVENANCE_FLOOR"
        fit_expected = False
    elif aggregate_k < LONGITUDINAL_REPLICATED_VALIDATION_VALIDATION_FLOOR_K:
        expected = "VALID_INTERNAL_ONLY_BELOW_VALIDATION_FLOOR"
        fit_expected = True
    else:
        expected = "VALIDATION_FLOOR_PASSED_NONAUTHORIZING"
        fit_expected = True
    return {
        "control_id": f"floor_k_{aggregate_k}",
        "aggregate_measurement_cell_k": aggregate_k,
        "panel_group_count": 6,
        "effect_size_sd": 0.2,
        "seed": floor_control_seed(aggregate_k),
        "aggregate_provenance_floor_k": (
            LONGITUDINAL_REPLICATED_VALIDATION_PROVENANCE_FLOOR_K
        ),
        "validation_floor_k": (
            LONGITUDINAL_REPLICATED_VALIDATION_VALIDATION_FLOOR_K
        ),
        "expected_outcome": expected,
        "fit_expected": fit_expected,
        "customer_output_authorized": False,
    }


def _negative_plan_entry(control_id: str) -> dict:
    expected = {
        "uncontrolled_common_shock": "HOLD_UNMEASURED_COMMON_SHOCK",
        "approved_control_shock": "PASS_NO_INTERNAL_SIGNAL",
        "unrelated_outcome_shock": "PASS_NO_INTERNAL_SIGNAL",
        "temporary_movement": "HOLD_NO_LATE_WINDOW_PERSISTENCE",
        "weak_history": "REJECTED_BEFORE_FIT",
        "missing_windows": "REJECTED_BEFORE_FIT",
        "unsafe_data": "REJECTED_BEFORE_FIT",
        "unsupported_route": "REJECTED_BEFORE_FIT",
        "target_contamination": "REJECTED_BEFORE_FIT",
    }[control_id]
    return {
        "control_id": control_id,
        "seed": negative_control_seed(control_id),
        "aggregate_measurement_cell_k": (
            LONGITUDINAL_REPLICATED_VALIDATION_AGGREGATE_K
        ),
        "panel_group_count": 6,
        "expected_outcome": expected,
        "customer_output_authorized": False,
    }


def _matches_structural_negative_rejection(
    control_id: str, exc: Exception
) -> bool:
    expected = _STRUCTURAL_NEGATIVE_REJECTIONS.get(control_id)
    return expected is not None and (type(exc).__name__, str(exc)) == expected


def _exception_fingerprint(exc: Exception) -> str:
    return sha256_json(
        {"exception_type": type(exc).__name__, "message": str(exc)}
    )


def longitudinal_control_plan() -> dict:
    floor_controls = [
        _floor_plan_entry(aggregate_k)
        for aggregate_k in LONGITUDINAL_FLOOR_CONTROL_K_VALUES
    ]
    lag_slots = [slot.to_dict() for slot in required_lag_control_slots()]
    negative_controls = [
        _negative_plan_entry(control_id)
        for control_id in LONGITUDINAL_NEGATIVE_CONTROL_IDS
    ]
    seeds = [entry["seed"] for entry in floor_controls]
    seeds.extend(slot.seed for slot in required_lag_control_slots())
    seeds.extend(entry["seed"] for entry in negative_controls)
    if len(seeds) != len(set(seeds)):
        raise AssertionError("compiled control seeds must be globally unique")
    body = {
        "plan_version": LONGITUDINAL_CONTROL_PLAN_VERSION,
        "floor_controls": floor_controls,
        "lag_controls": {
            "true_lag_windows": list(LONGITUDINAL_LAG_TRUE_WINDOWS),
            "candidate_lag_windows": list(LONGITUDINAL_LAG_CANDIDATE_WINDOWS),
            "replications_per_true_lag": LONGITUDINAL_LAG_REPLICATIONS_PER_TRUTH,
            "required_recoveries_per_true_lag": (
                LONGITUDINAL_LAG_REQUIRED_RECOVERIES_PER_TRUTH
            ),
            "score": "negative_integrated_log_posterior_at_mode",
            "selection": "minimum_score",
            "tie_epsilon": LONGITUDINAL_LAG_SCORE_TIE_EPSILON,
            "slots": lag_slots,
        },
        "negative_controls": negative_controls,
        "runtime_configurable": False,
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }
    return {**body, "plan_hash": sha256_json(body)}


def _standardize_from_pre(values: np.ndarray, pre_mask: np.ndarray) -> np.ndarray:
    pre = np.asarray(values, dtype=float)[pre_mask]
    sd = float(pre.std(ddof=1))
    if not math.isfinite(sd) or sd <= 1e-12:
        raise ValueError("lag validation predictor needs pre-period variation")
    return (np.asarray(values, dtype=float) - float(pre.mean())) / sd


def _retimed_validation_exposures(
    dataset, *, lag_windows: int
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    time = np.asarray(dataset.time_index, dtype=float)
    base_velocity = np.asarray(dataset.velocity_exposure, dtype=float)
    base_breadth = np.asarray(dataset.breadth_exposure, dtype=float)
    base_depth = np.asarray(dataset.depth_exposure, dtype=float)
    target_start = LONGITUDINAL_VALIDATION_PRE_WINDOW_COUNT + lag_windows
    relative = time.astype(int) - target_start
    velocity_increment = np.zeros_like(time, dtype=float)
    breadth_increment = np.zeros_like(time, dtype=float)
    depth_increment = np.zeros_like(time, dtype=float)
    for index in range(len(_LAG_VELOCITY_SIGNATURE)):
        mask = relative == index
        velocity_increment[mask] = _LAG_VELOCITY_SIGNATURE[index]
        breadth_increment[mask] = _LAG_BREADTH_SIGNATURE[index]
        depth_increment[mask] = _LAG_DEPTH_SIGNATURE[index]
    velocity = base_velocity + velocity_increment
    breadth = base_breadth + breadth_increment
    depth = base_depth + depth_increment
    return velocity, breadth, depth


def _calibrate_lag_movement_scale(
    *,
    target_effect: float,
    base_outcome: np.ndarray,
    movement_score: np.ndarray,
    pre_mask: np.ndarray,
    evaluation_mask: np.ndarray,
) -> float:
    evaluation_mean = float(movement_score[evaluation_mask].mean())
    if not math.isfinite(evaluation_mean) or evaluation_mean <= 0.0:
        raise ValueError("lag validation movement contrast must be positive")

    def realized(scale: float) -> float:
        pre_sd = float(
            (base_outcome[pre_mask] + scale * movement_score[pre_mask]).std(
                ddof=1
            )
        )
        return scale * evaluation_mean / pre_sd

    lower = 0.0
    upper = 1.0
    while realized(upper) < target_effect:
        upper *= 2.0
        if upper > 1_000_000.0:
            raise ValueError("lag validation effect calibration failed")
    for _ in range(80):
        midpoint = (lower + upper) / 2.0
        if realized(midpoint) < target_effect:
            lower = midpoint
        else:
            upper = midpoint
    return (lower + upper) / 2.0


def generate_lag_validation_case(
    *, true_lag_windows: int, candidate_lag_windows: int, seed: int
) -> LagValidationCase:
    if true_lag_windows not in LONGITUDINAL_LAG_TRUE_WINDOWS:
        raise ValueError("true lag is not compiled")
    if candidate_lag_windows not in LONGITUDINAL_LAG_CANDIDATE_WINDOWS:
        raise ValueError("candidate lag is not compiled")
    dataset = generate_longitudinal_dataset(
        scenario="null_pathway",
        seed=seed,
        pre_window_count=LONGITUDINAL_VALIDATION_PRE_WINDOW_COUNT,
        post_window_count=_LAG_POST_WINDOW_COUNT,
        cohort_count=LONGITUDINAL_LAG_PANEL_GROUP_COUNT,
    )
    time = np.asarray(dataset.time_index, dtype=int)
    pre_mask = np.asarray(dataset.post, dtype=int) == 0
    true_velocity, true_breadth, _true_depth = _retimed_validation_exposures(
        dataset, lag_windows=true_lag_windows
    )
    candidate_velocity, candidate_breadth, candidate_depth = (
        _retimed_validation_exposures(
            dataset, lag_windows=candidate_lag_windows
        )
    )
    true_score = (
        _VELOCITY_WEIGHT * _standardize_from_pre(true_velocity, pre_mask)
        + _BREADTH_WEIGHT * _standardize_from_pre(true_breadth, pre_mask)
    )
    true_start = LONGITUDINAL_VALIDATION_PRE_WINDOW_COUNT + true_lag_windows
    true_evaluation_mask = time >= true_start
    base_outcome = np.asarray(dataset.observed_outcome, dtype=float)
    movement_scale = _calibrate_lag_movement_scale(
        target_effect=LONGITUDINAL_LAG_EFFECT_SIZE_SD,
        base_outcome=base_outcome,
        movement_score=true_score,
        pre_mask=pre_mask,
        evaluation_mask=true_evaluation_mask,
    )
    outcome = base_outcome + movement_scale * true_score
    pre_sd = float(outcome[pre_mask].std(ddof=1))
    evaluation_movement = float(
        movement_scale * true_score[true_evaluation_mask].mean()
    )
    realized_effect = evaluation_movement / pre_sd

    # The governed input contract requires a positive declared evaluation lag.
    # Candidate zero changes the exposure projection while retaining the
    # minimum one-window evaluation horizon; model selection uses the fit score.
    declared_lag = max(candidate_lag_windows, 1)
    post_refs = tuple(
        f"m{window:02d}"
        for window in range(
            LONGITUDINAL_VALIDATION_PRE_WINDOW_COUNT,
            LONGITUDINAL_VALIDATION_PRE_WINDOW_COUNT
            + _LAG_POST_WINDOW_COUNT,
        )
    )
    plan = replace(
        dataset.hypothesis_plan,
        expected_outcome_signal_lag_windows=declared_lag,
    )
    candidate_dataset = replace(
        dataset,
        hypothesis_plan=plan,
        observed_outcome=outcome,
        velocity_exposure=candidate_velocity,
        breadth_exposure=candidate_breadth,
        depth_exposure=candidate_depth,
        evaluation_window_refs=post_refs[declared_lag:],
    )

    true_refs = post_refs[true_lag_windows:]
    truth_receipt = {
        "truth_class": "longitudinal_lag_validation_truth_v1",
        "seed": seed,
        "true_lag_windows": true_lag_windows,
        "requested_effect_size_sd": LONGITUDINAL_LAG_EFFECT_SIZE_SD,
        "realized_effect_size_sd": float(realized_effect),
        "pre_period_outcome_sd": pre_sd,
        "evaluation_movement_outcome_units": evaluation_movement,
        "evaluation_window_refs": list(true_refs),
        "base_dataset_hash": dataset.synthetic_input_hash(),
        "final_observed_outcome_hash": sha256_json(
            [float(value) for value in outcome]
        ),
        "true_velocity_hash": sha256_json([float(value) for value in true_velocity]),
        "true_breadth_hash": sha256_json([float(value) for value in true_breadth]),
        "truth_label_not_supplied_to_candidate_fit": True,
    }
    return LagValidationCase(
        dataset=candidate_dataset,
        truth_receipt=truth_receipt,
    )


def _control_result_with_hash(**kwargs) -> ControlResult:
    unbound = ControlResult(**kwargs)
    return ControlResult(
        **{**kwargs, "result_hash": sha256_json(unbound.body_without_hash())}
    )


def _candidate_score_with_hash(**kwargs) -> LagCandidateScore:
    unbound = LagCandidateScore(**kwargs)
    return LagCandidateScore(
        **{
            **kwargs,
            "candidate_result_hash": sha256_json(unbound.body_without_hash()),
        }
    )


def _fit_summary(
    dataset: LongitudinalSyntheticDataset,
    *,
    seed: int,
    binding_context: dict,
) -> dict:
    prepared = prepare_longitudinal_state_space(dataset)
    case_binding_hash = sha256_json(
        {
            **binding_context,
            "synthetic_input_hash": dataset.synthetic_input_hash(),
            "prepared_input_hash": prepared.prepared_input_hash,
            "model_input_hash": prepared.model_input_hash,
            "context_binding_hash": prepared.context_binding_hash,
        }
    )
    fit = fit_deterministic_state_space(prepared, seed=seed)
    movement = fit.summary_by_name()["longitudinal_movement"]
    if not all(
        math.isfinite(value)
        for value in (
            movement.posterior_mean,
            movement.posterior_sd,
            movement.interval_80_lower,
            movement.interval_80_upper,
        )
    ) or movement.posterior_sd <= 0.0:
        raise ValueError("control fit produced an invalid movement summary")
    signal = (
        abs(movement.posterior_mean / movement.posterior_sd)
        > LONGITUDINAL_REPLICATED_VALIDATION_NULL_SIGNAL_Z
    )
    negative_log_posterior = float(
        fit.integration_diagnostics["negative_log_posterior_at_mode"]
    )
    posterior_mean = float(movement.posterior_mean)
    posterior_sd = float(movement.posterior_sd)
    return {
        "synthetic_input_hash": dataset.synthetic_input_hash(),
        "prepared_input_hash": prepared.prepared_input_hash,
        "model_input_hash": prepared.model_input_hash,
        "context_binding_hash": prepared.context_binding_hash,
        "case_binding_hash": case_binding_hash,
        "fit_summary_hash": sha256_json(
            {
                "case_binding_hash": case_binding_hash,
                "synthetic_input_hash": dataset.synthetic_input_hash(),
                "prepared_input_hash": prepared.prepared_input_hash,
                "model_input_hash": prepared.model_input_hash,
                "context_binding_hash": prepared.context_binding_hash,
                "posterior_mean": posterior_mean,
                "posterior_sd": posterior_sd,
                "internal_validation_signal_detected": bool(signal),
                "negative_log_posterior_at_mode": negative_log_posterior,
            }
        ),
        "posterior_mean": posterior_mean,
        "posterior_sd": posterior_sd,
        "internal_validation_signal_detected": bool(signal),
        "negative_log_posterior_at_mode": negative_log_posterior,
    }


def run_floor_control(
    aggregate_k: int,
    *,
    execution_identity: ExecutionIdentity,
    execution_mode: Literal["full", "smoke"],
) -> ControlResult:
    plan = _floor_plan_entry(aggregate_k)
    expected = plan["expected_outcome"]
    if aggregate_k < LONGITUDINAL_REPLICATED_VALIDATION_PROVENANCE_FLOOR_K:
        observed = "REJECTED_BEFORE_FIT_BELOW_PROVENANCE_FLOOR"
        evidence = {
            "aggregate_measurement_cell_k": aggregate_k,
            "fit_attempted": False,
            "truth_receipt_hash": None,
            "synthetic_input_hash": None,
            "prepared_input_hash": None,
            "model_input_hash": None,
            "context_binding_hash": None,
            "case_binding_hash": None,
            "fit_summary_hash": None,
            "posterior_mean": None,
            "posterior_sd": None,
            "internal_validation_signal_detected": None,
            "negative_log_posterior_at_mode": None,
            "customer_output_authorized": False,
        }
    else:
        stage = "generate"
        try:
            case = generate_longitudinal_validation_case(
                effect_size_sd=plan["effect_size_sd"],
                panel_group_count=plan["panel_group_count"],
                seed=plan["seed"],
            )
            truth_receipt_hash = sha256_json(asdict(case.truth))
            stage = "fit"
            fit_summary = _fit_summary(
                case.dataset,
                seed=plan["seed"],
                binding_context={
                    "control_id": plan["control_id"],
                    "aggregate_measurement_cell_k": aggregate_k,
                    "truth_receipt_hash": truth_receipt_hash,
                    "execution_identity_hash": execution_identity.identity_hash,
                },
            )
            observed = (
                "VALID_INTERNAL_ONLY_BELOW_VALIDATION_FLOOR"
                if aggregate_k
                < LONGITUDINAL_REPLICATED_VALIDATION_VALIDATION_FLOOR_K
                else "VALIDATION_FLOOR_PASSED_NONAUTHORIZING"
            )
            evidence = {
                "aggregate_measurement_cell_k": aggregate_k,
                "fit_attempted": True,
                "truth_receipt_hash": truth_receipt_hash,
                "synthetic_input_hash": fit_summary["synthetic_input_hash"],
                "prepared_input_hash": fit_summary["prepared_input_hash"],
                "model_input_hash": fit_summary["model_input_hash"],
                "context_binding_hash": fit_summary["context_binding_hash"],
                "case_binding_hash": fit_summary["case_binding_hash"],
                "fit_summary_hash": fit_summary["fit_summary_hash"],
                "posterior_mean": fit_summary["posterior_mean"],
                "posterior_sd": fit_summary["posterior_sd"],
                "internal_validation_signal_detected": fit_summary[
                    "internal_validation_signal_detected"
                ],
                "negative_log_posterior_at_mode": fit_summary[
                    "negative_log_posterior_at_mode"
                ],
                "customer_output_authorized": False,
            }
        except Exception as exc:
            observed = "RUNNER_ERROR"
            evidence = {
                "aggregate_measurement_cell_k": aggregate_k,
                "fit_attempted": True,
                "truth_receipt_hash": None,
                "synthetic_input_hash": None,
                "prepared_input_hash": None,
                "model_input_hash": None,
                "context_binding_hash": None,
                "case_binding_hash": None,
                "fit_summary_hash": None,
                "posterior_mean": None,
                "posterior_sd": None,
                "internal_validation_signal_detected": None,
                "negative_log_posterior_at_mode": None,
                "customer_output_authorized": False,
                "runner_error_stage": stage,
                "runner_error_type": type(exc).__name__,
            }
    return _control_result_with_hash(
        control_id=plan["control_id"],
        control_family="floor",
        execution_mode=execution_mode,
        plan=plan,
        evidence=evidence,
        expected_outcome=expected,
        observed_outcome=observed,
        control_passed=observed == expected,
        execution_identity_hash=execution_identity.identity_hash,
    )


def _run_lag_candidate(
    slot: LagControlSlot,
    *,
    candidate_lag_windows: int,
    execution_identity: ExecutionIdentity,
) -> LagCandidateScore:
    truth_hash = None
    synthetic_hash = None
    prepared_hash = None
    model_hash = None
    context_hash = None
    case_hash = None
    try:
        case = generate_lag_validation_case(
            true_lag_windows=slot.true_lag_windows,
            candidate_lag_windows=candidate_lag_windows,
            seed=slot.seed,
        )
        truth_hash = sha256_json(case.truth_receipt)
        synthetic_hash = case.dataset.synthetic_input_hash()
        prepared = prepare_longitudinal_state_space(case.dataset)
        prepared_hash = prepared.prepared_input_hash
        model_hash = prepared.model_input_hash
        context_hash = prepared.context_binding_hash
        case_hash = sha256_json(
            {
                "lag_slot": slot.to_dict(),
                "candidate_lag_windows": candidate_lag_windows,
                "truth_receipt_hash": truth_hash,
                "synthetic_input_hash": synthetic_hash,
                "prepared_input_hash": prepared.prepared_input_hash,
                "model_input_hash": prepared.model_input_hash,
                "context_binding_hash": prepared.context_binding_hash,
                "execution_identity_hash": execution_identity.identity_hash,
            }
        )
        fit = fit_deterministic_state_space(prepared, seed=slot.seed)
        score = float(
            fit.integration_diagnostics["negative_log_posterior_at_mode"]
        )
        if not math.isfinite(score):
            raise ValueError("lag candidate score must be finite")
        fit_hash = sha256_json(
            {
                "case_binding_hash": case_hash,
                "synthetic_input_hash": synthetic_hash,
                "prepared_input_hash": prepared_hash,
                "model_input_hash": model_hash,
                "context_binding_hash": context_hash,
                "truth_receipt_hash": truth_hash,
                "candidate_lag_windows": candidate_lag_windows,
                "declared_input_lag_windows": max(candidate_lag_windows, 1),
                "negative_log_posterior_at_mode": score,
            }
        )
    except Exception as exc:
        return _candidate_score_with_hash(
            candidate_lag_windows=candidate_lag_windows,
            declared_input_lag_windows=max(candidate_lag_windows, 1),
            status="HOLD",
            negative_log_posterior_at_mode=None,
            synthetic_input_hash=synthetic_hash,
            prepared_input_hash=prepared_hash,
            model_input_hash=model_hash,
            context_binding_hash=context_hash,
            truth_receipt_hash=truth_hash,
            case_binding_hash=case_hash,
            fit_summary_hash=None,
            runner_error_type=type(exc).__name__,
        )
    return _candidate_score_with_hash(
        candidate_lag_windows=candidate_lag_windows,
        declared_input_lag_windows=max(candidate_lag_windows, 1),
        status="PASS",
        negative_log_posterior_at_mode=score,
        synthetic_input_hash=synthetic_hash,
        prepared_input_hash=prepared_hash,
        model_input_hash=model_hash,
        context_binding_hash=context_hash,
        truth_receipt_hash=truth_hash,
        case_binding_hash=case_hash,
        fit_summary_hash=fit_hash,
        runner_error_type=None,
    )


def run_lag_control(
    slot: LagControlSlot,
    *,
    execution_identity: ExecutionIdentity,
    execution_mode: Literal["full", "smoke"],
) -> ControlResult:
    if slot not in required_lag_control_slots():
        raise ValueError("lag control slot is not compiled")
    scores = tuple(
        _run_lag_candidate(
            slot,
            candidate_lag_windows=candidate,
            execution_identity=execution_identity,
        )
        for candidate in LONGITUDINAL_LAG_CANDIDATE_WINDOWS
    )
    all_candidates_passed = all(score.status == "PASS" for score in scores)
    selected: int | None = None
    score_tie = False
    if all_candidates_passed:
        ordered = sorted(
            scores,
            key=lambda item: (
                float(item.negative_log_posterior_at_mode),
                item.candidate_lag_windows,
            ),
        )
        assert ordered[0].negative_log_posterior_at_mode is not None
        assert ordered[1].negative_log_posterior_at_mode is not None
        score_tie = (
            abs(
                ordered[1].negative_log_posterior_at_mode
                - ordered[0].negative_log_posterior_at_mode
            )
            <= LONGITUDINAL_LAG_SCORE_TIE_EPSILON
        )
        if not score_tie:
            selected = ordered[0].candidate_lag_windows
    if not all_candidates_passed:
        observed = "LAG_CANDIDATE_RUNNER_ERROR"
    elif score_tie:
        observed = "LAG_SCORE_TIE"
    else:
        observed = "LAG_SELECTION_COMPLETED"
    expected = "LAG_SELECTION_COMPLETED"
    evidence = {
        "true_lag_windows": slot.true_lag_windows,
        "replication_index": slot.replication_index,
        "seed": slot.seed,
        "candidate_scores": [score.to_dict() for score in scores],
        "all_candidates_passed": all_candidates_passed,
        "score_tie": score_tie,
        "selected_lag_windows": selected,
        "true_lag_recovered": selected == slot.true_lag_windows,
        "customer_output_authorized": False,
    }
    return _control_result_with_hash(
        control_id=slot.control_id,
        control_family="lag",
        execution_mode=execution_mode,
        plan=slot.to_dict(),
        evidence=evidence,
        expected_outcome=expected,
        observed_outcome=observed,
        control_passed=observed == expected,
        execution_identity_hash=execution_identity.identity_hash,
    )


def _dataset_for_negative_control(control_id: str, seed: int):
    scenario_by_id = {
        "uncontrolled_common_shock": "null_pathway",
        "approved_control_shock": "null_pathway",
        "unrelated_outcome_shock": "null_pathway",
        "temporary_movement": "null_pathway",
        "weak_history": "insufficient_history",
        "missing_windows": "missing_or_suppressed_windows",
        "unsafe_data": "real_data_flag",
        "unsupported_route": "staggered_rollout_misroute",
        "target_contamination": "target_contamination",
    }
    dataset = generate_longitudinal_dataset(
        scenario=scenario_by_id[control_id],
        seed=seed,
        cohort_count=6,
    )
    if control_id in {"uncontrolled_common_shock", "approved_control_shock"}:
        time = np.asarray(dataset.time_index, dtype=int)
        shock = (
            time
            >= LONGITUDINAL_VALIDATION_PRE_WINDOW_COUNT
            + dataset.hypothesis_plan.expected_outcome_signal_lag_windows
        ).astype(float)
        controls = np.asarray(dataset.control_matrix, dtype=float).copy()
        controls[:, 1] += shock
        outcome = np.asarray(dataset.observed_outcome, dtype=float) + 0.30 * shock
        dataset = replace(
            dataset,
            observed_outcome=outcome,
            control_matrix=controls,
        )
    if control_id == "uncontrolled_common_shock":
        dataset = replace(
            dataset,
            control_matrix=np.asarray(dataset.control_matrix[:, :1], dtype=float),
            control_names=dataset.control_names[:1],
            control_source_refs=dataset.control_source_refs[:1],
            control_source_hashes=dataset.control_source_hashes[:1],
        )
    if control_id in {"unrelated_outcome_shock", "temporary_movement"}:
        outcome = np.asarray(dataset.observed_outcome, dtype=float).copy()
        time = np.asarray(dataset.time_index, dtype=int)
        cohorts = np.asarray(dataset.cohort_idx, dtype=int)
        if control_id == "unrelated_outcome_shock":
            shock_time = LONGITUDINAL_VALIDATION_PRE_WINDOW_COUNT + 3
            group_sign = np.where(cohorts % 2 == 0, 1.0, -1.0)
            outcome += (time == shock_time) * group_sign * 0.50
        else:
            early = np.isin(
                time,
                (
                    LONGITUDINAL_VALIDATION_PRE_WINDOW_COUNT + 1,
                    LONGITUDINAL_VALIDATION_PRE_WINDOW_COUNT + 2,
                ),
            )
            outcome += early * 0.50
        dataset = replace(dataset, observed_outcome=outcome)
    return dataset


def _late_window_dataset(dataset: LongitudinalSyntheticDataset):
    late_lag = 4
    post_refs = tuple(
        ref
        for ref, post in zip(dataset.window_refs, dataset.post)
        if int(post) == 1
    )
    unique_post_refs = tuple(dict.fromkeys(post_refs))
    return replace(
        dataset,
        hypothesis_plan=replace(
            dataset.hypothesis_plan,
            expected_outcome_signal_lag_windows=late_lag,
        ),
        evaluation_window_refs=unique_post_refs[late_lag:],
    )


def run_negative_control(
    control_id: str,
    *,
    execution_identity: ExecutionIdentity,
    execution_mode: Literal["full", "smoke"],
) -> ControlResult:
    plan = _negative_plan_entry(control_id)
    expected = plan["expected_outcome"]
    fit_attempted = False
    primary = None
    late = None
    truth_receipt_hash = None
    rejection_stage = None
    rejection_type = None
    rejection_fingerprint = None
    stage = "generate"
    try:
        dataset = _dataset_for_negative_control(control_id, plan["seed"])
        truth_receipt_hash = sha256_json(
            {
                "control_id": control_id,
                "seed": plan["seed"],
                "expected_outcome": expected,
                "synthetic_input_hash": dataset.synthetic_input_hash(),
            }
        )
        if expected == "REJECTED_BEFORE_FIT":
            stage = "prepare"
            rejection_stage = "prepare"
            prepare_longitudinal_state_space(dataset)
            observed = "UNEXPECTED_PREPARATION_PASS"
        else:
            fit_attempted = True
            stage = "primary_fit"
            primary = _fit_summary(
                dataset,
                seed=plan["seed"],
                binding_context={
                    "control_id": control_id,
                    "truth_receipt_hash": truth_receipt_hash,
                    "execution_identity_hash": execution_identity.identity_hash,
                },
            )
            if control_id == "uncontrolled_common_shock":
                observed = "HOLD_UNMEASURED_COMMON_SHOCK"
            elif control_id in {
                "approved_control_shock",
                "unrelated_outcome_shock",
            }:
                observed = (
                    "PASS_NO_INTERNAL_SIGNAL"
                    if not primary["internal_validation_signal_detected"]
                    else "HOLD_UNEXPECTED_INTERNAL_SIGNAL"
                )
            elif control_id == "temporary_movement":
                stage = "late_window_fit"
                late = _fit_summary(
                    _late_window_dataset(dataset),
                    seed=plan["seed"],
                    binding_context={
                        "control_id": control_id,
                        "refit": "late_window_persistence",
                        "truth_receipt_hash": truth_receipt_hash,
                        "execution_identity_hash": execution_identity.identity_hash,
                    },
                )
                observed = (
                    "HOLD_NO_LATE_WINDOW_PERSISTENCE"
                    if not late["internal_validation_signal_detected"]
                    else "HOLD_UNEXPECTED_PERSISTENCE"
                )
            else:
                raise AssertionError("negative control branch is not compiled")
    except Exception as exc:
        rejection_stage = stage
        rejection_type = type(exc).__name__
        rejection_fingerprint = _exception_fingerprint(exc)
        if (
            expected == "REJECTED_BEFORE_FIT"
            and not fit_attempted
            and _matches_structural_negative_rejection(control_id, exc)
        ):
            observed = "REJECTED_BEFORE_FIT"
        else:
            observed = "RUNNER_ERROR"
    evidence = {
        "seed": plan["seed"],
        "truth_receipt_hash": truth_receipt_hash,
        "fit_attempted": fit_attempted,
        "primary_fit": primary,
        "late_window_fit": late,
        "rejection_stage": rejection_stage,
        "rejection_type": rejection_type,
        "rejection_fingerprint": rejection_fingerprint,
        "truth_bound_negative_control": True,
        "customer_output_authorized": False,
    }
    return _control_result_with_hash(
        control_id=control_id,
        control_family="negative",
        execution_mode=execution_mode,
        plan=plan,
        evidence=evidence,
        expected_outcome=expected,
        observed_outcome=observed,
        control_passed=observed == expected,
        execution_identity_hash=execution_identity.identity_hash,
    )


def validate_lag_candidate_score(score: LagCandidateScore) -> LagCandidateScore:
    if not isinstance(score, LagCandidateScore):
        raise ValueError("lag candidate score has the wrong type")
    if score.candidate_lag_windows not in LONGITUDINAL_LAG_CANDIDATE_WINDOWS:
        raise ValueError("lag candidate score is off plan")
    if score.declared_input_lag_windows != max(score.candidate_lag_windows, 1):
        raise ValueError("declared input lag must preserve the positive-lag contract")
    if score.candidate_result_hash != sha256_json(score.body_without_hash()):
        raise ValueError("lag candidate result hash mismatch")
    hashes = (
        score.synthetic_input_hash,
        score.prepared_input_hash,
        score.model_input_hash,
        score.context_binding_hash,
        score.truth_receipt_hash,
        score.case_binding_hash,
        score.fit_summary_hash,
    )
    if score.status == "PASS":
        if (
            score.negative_log_posterior_at_mode is None
            or not math.isfinite(score.negative_log_posterior_at_mode)
            or any(not _is_sha256(value) for value in hashes)
            or score.runner_error_type is not None
        ):
            raise ValueError("passing lag candidate score is incomplete")
    elif score.status == "HOLD":
        if (
            not isinstance(score.runner_error_type, str)
            or not score.runner_error_type
        ):
            raise ValueError("HOLD lag candidate must name a runner error type")
    else:
        raise ValueError("lag candidate status is invalid")
    return score


def validate_control_result(
    result: ControlResult,
    *,
    expected_identity: ExecutionIdentity | None = None,
) -> ControlResult:
    if not isinstance(result, ControlResult):
        raise ValueError("control result has the wrong type")
    if result.execution_mode not in {"full", "smoke"}:
        raise ValueError("control execution mode is invalid")
    if result.result_hash != sha256_json(result.body_without_hash()):
        raise ValueError("control result hash mismatch")
    if expected_identity is not None and (
        result.execution_identity_hash != expected_identity.identity_hash
    ):
        raise ValueError("control execution identity mismatch")

    if result.control_family == "floor":
        expected_plans = {
            entry["control_id"]: entry
            for entry in longitudinal_control_plan()["floor_controls"]
        }
    elif result.control_family == "lag":
        expected_plans = {
            slot.control_id: slot.to_dict() for slot in required_lag_control_slots()
        }
    elif result.control_family == "negative":
        expected_plans = {
            entry["control_id"]: entry
            for entry in longitudinal_control_plan()["negative_controls"]
        }
    else:
        raise ValueError("control family is invalid")
    if result.control_id not in expected_plans or not strict_json_equal(
        result.plan, expected_plans[result.control_id]
    ):
        raise ValueError("control result plan binding mismatch")

    evidence = result.evidence
    if not isinstance(evidence, dict):
        raise ValueError("control evidence must be an object")
    if result.control_family == "floor":
        _validate_floor_evidence(result)
    elif result.control_family == "lag":
        _validate_lag_evidence(result)
    else:
        _validate_negative_evidence(result)
    if (
        result.control_family != "lag"
        and result.expected_outcome != result.plan["expected_outcome"]
    ):
        raise ValueError("control expected outcome must match the plan")
    if result.control_family == "lag" and result.expected_outcome != "LAG_SELECTION_COMPLETED":
        raise ValueError("lag expected outcome is invalid")
    if result.control_passed is not (
        result.observed_outcome == result.expected_outcome
    ):
        raise ValueError("control pass must be derived from expected behavior")
    return result


def _validate_floor_evidence(result: ControlResult) -> None:
    evidence = result.evidence
    allowed = {
        "aggregate_measurement_cell_k",
        "fit_attempted",
        "truth_receipt_hash",
        "synthetic_input_hash",
        "prepared_input_hash",
        "model_input_hash",
        "context_binding_hash",
        "case_binding_hash",
        "fit_summary_hash",
        "posterior_mean",
        "posterior_sd",
        "internal_validation_signal_detected",
        "negative_log_posterior_at_mode",
        "customer_output_authorized",
    }
    if result.observed_outcome == "RUNNER_ERROR":
        allowed.update(("runner_error_stage", "runner_error_type"))
    _require_keys(evidence, allowed, "floor evidence")
    aggregate_k = result.plan["aggregate_measurement_cell_k"]
    if evidence["aggregate_measurement_cell_k"] != aggregate_k:
        raise ValueError("floor evidence k mismatch")
    if evidence["customer_output_authorized"] is not False:
        raise ValueError("floor evidence cannot authorize customer output")
    if aggregate_k < LONGITUDINAL_REPLICATED_VALIDATION_PROVENANCE_FLOOR_K:
        if result.observed_outcome != result.plan["expected_outcome"]:
            raise ValueError("below-floor outcome must follow compiled policy")
        if evidence["fit_attempted"] is not False or any(
            evidence[key] is not None
            for key in (
                "prepared_input_hash",
                "truth_receipt_hash",
                "synthetic_input_hash",
                "model_input_hash",
                "context_binding_hash",
                "case_binding_hash",
                "fit_summary_hash",
                "posterior_mean",
                "posterior_sd",
                "internal_validation_signal_detected",
                "negative_log_posterior_at_mode",
            )
        ):
            raise ValueError("k=4 must reject before fitting")
    elif result.observed_outcome != "RUNNER_ERROR":
        if result.observed_outcome != result.plan["expected_outcome"]:
            raise ValueError("floor outcome must follow compiled policy")
        if evidence["fit_attempted"] is not True or any(
            not _is_sha256(evidence[key])
            for key in (
                "truth_receipt_hash",
                "synthetic_input_hash",
                "prepared_input_hash",
                "model_input_hash",
                "context_binding_hash",
                "case_binding_hash",
                "fit_summary_hash",
            )
        ):
            raise ValueError("floor control fit evidence is incomplete")
        mean = _finite(evidence["posterior_mean"], "floor posterior mean")
        sd = _finite(evidence["posterior_sd"], "floor posterior SD")
        if sd <= 0.0:
            raise ValueError("floor posterior SD must be positive")
        expected_signal = (
            abs(mean / sd) > LONGITUDINAL_REPLICATED_VALIDATION_NULL_SIGNAL_Z
        )
        negative_log_posterior = _finite(
            evidence["negative_log_posterior_at_mode"],
            "floor negative log posterior",
        )
        if evidence["internal_validation_signal_detected"] is not expected_signal:
            raise ValueError("floor signal flag must be derived")
        expected_case_hash = sha256_json(
            {
                "control_id": result.control_id,
                "aggregate_measurement_cell_k": aggregate_k,
                "truth_receipt_hash": evidence["truth_receipt_hash"],
                "execution_identity_hash": result.execution_identity_hash,
                "synthetic_input_hash": evidence["synthetic_input_hash"],
                "prepared_input_hash": evidence["prepared_input_hash"],
                "model_input_hash": evidence["model_input_hash"],
                "context_binding_hash": evidence["context_binding_hash"],
            }
        )
        if evidence["case_binding_hash"] != expected_case_hash:
            raise ValueError("floor case binding hash must be derived")
        expected_fit_hash = sha256_json(
            {
                "case_binding_hash": expected_case_hash,
                "synthetic_input_hash": evidence["synthetic_input_hash"],
                "prepared_input_hash": evidence["prepared_input_hash"],
                "model_input_hash": evidence["model_input_hash"],
                "context_binding_hash": evidence["context_binding_hash"],
                "posterior_mean": mean,
                "posterior_sd": sd,
                "internal_validation_signal_detected": expected_signal,
                "negative_log_posterior_at_mode": negative_log_posterior,
            }
        )
        if evidence["fit_summary_hash"] != expected_fit_hash:
            raise ValueError("floor fit summary hash must be derived")
    else:
        if (
            evidence["fit_attempted"] is not True
            or evidence["runner_error_stage"] not in {"generate", "fit"}
            or not isinstance(evidence["runner_error_type"], str)
            or not evidence["runner_error_type"]
        ):
            raise ValueError("floor runner error evidence is incomplete")


def _validate_lag_evidence(result: ControlResult) -> None:
    evidence = result.evidence
    _require_keys(
        evidence,
        {
            "true_lag_windows",
            "replication_index",
            "seed",
            "candidate_scores",
            "all_candidates_passed",
            "score_tie",
            "selected_lag_windows",
            "true_lag_recovered",
            "customer_output_authorized",
        },
        "lag evidence",
    )
    if evidence["customer_output_authorized"] is not False:
        raise ValueError("lag evidence cannot authorize customer output")
    for key in ("true_lag_windows", "replication_index", "seed"):
        if _integer(evidence[key], f"lag evidence {key}") != result.plan[key]:
            raise ValueError("lag evidence plan identity mismatch")
    raw_scores = evidence["candidate_scores"]
    if not isinstance(raw_scores, list) or len(raw_scores) != len(
        LONGITUDINAL_LAG_CANDIDATE_WINDOWS
    ):
        raise ValueError("lag evidence must contain every candidate")
    scores = tuple(lag_candidate_score_from_dict(value) for value in raw_scores)
    if tuple(score.candidate_lag_windows for score in scores) != (
        LONGITUDINAL_LAG_CANDIDATE_WINDOWS
    ):
        raise ValueError("lag candidate scores must follow compiled order")
    passing_scores = tuple(score for score in scores if score.status == "PASS")
    if passing_scores and len(
        {score.truth_receipt_hash for score in passing_scores}
    ) != 1:
        raise ValueError("lag candidates must share one truth/outcome receipt")
    for score in passing_scores:
        expected_case_hash = sha256_json(
            {
                "lag_slot": result.plan,
                "candidate_lag_windows": score.candidate_lag_windows,
                "truth_receipt_hash": score.truth_receipt_hash,
                "synthetic_input_hash": score.synthetic_input_hash,
                "prepared_input_hash": score.prepared_input_hash,
                "model_input_hash": score.model_input_hash,
                "context_binding_hash": score.context_binding_hash,
                "execution_identity_hash": result.execution_identity_hash,
            }
        )
        if score.case_binding_hash != expected_case_hash:
            raise ValueError("lag candidate case binding must be derived")
        expected_fit_hash = sha256_json(
            {
                "case_binding_hash": expected_case_hash,
                "synthetic_input_hash": score.synthetic_input_hash,
                "prepared_input_hash": score.prepared_input_hash,
                "model_input_hash": score.model_input_hash,
                "context_binding_hash": score.context_binding_hash,
                "truth_receipt_hash": score.truth_receipt_hash,
                "candidate_lag_windows": score.candidate_lag_windows,
                "declared_input_lag_windows": score.declared_input_lag_windows,
                "negative_log_posterior_at_mode": (
                    score.negative_log_posterior_at_mode
                ),
            }
        )
        if score.fit_summary_hash != expected_fit_hash:
            raise ValueError("lag candidate fit hash must be derived")
    all_passed = all(score.status == "PASS" for score in scores)
    if evidence["all_candidates_passed"] is not all_passed:
        raise ValueError("lag all-candidates flag must be derived")
    selected = None
    tied = False
    if all_passed:
        ordered = sorted(
            scores,
            key=lambda score: (
                float(score.negative_log_posterior_at_mode),
                score.candidate_lag_windows,
            ),
        )
        tied = (
            abs(
                float(ordered[1].negative_log_posterior_at_mode)
                - float(ordered[0].negative_log_posterior_at_mode)
            )
            <= LONGITUDINAL_LAG_SCORE_TIE_EPSILON
        )
        if not tied:
            selected = ordered[0].candidate_lag_windows
    if evidence["score_tie"] is not tied:
        raise ValueError("lag tie flag must be derived")
    observed_selected = (
        None
        if evidence["selected_lag_windows"] is None
        else _integer(evidence["selected_lag_windows"], "selected_lag_windows")
    )
    if observed_selected != selected:
        raise ValueError("selected lag must be derived from candidate scores")
    if evidence["true_lag_recovered"] is not (
        selected == result.plan["true_lag_windows"]
    ):
        raise ValueError("lag recovery flag must be derived")
    expected_observed = (
        "LAG_CANDIDATE_RUNNER_ERROR"
        if not all_passed
        else "LAG_SCORE_TIE"
        if tied
        else "LAG_SELECTION_COMPLETED"
    )
    if result.observed_outcome != expected_observed:
        raise ValueError("lag observed outcome must be derived")


def _validate_fit_evidence(value: object, name: str) -> dict | None:
    if value is None:
        return None
    if not isinstance(value, dict):
        raise ValueError(f"{name} must be an object or null")
    _require_keys(
        value,
        {
            "synthetic_input_hash",
            "prepared_input_hash",
            "model_input_hash",
            "context_binding_hash",
            "case_binding_hash",
            "fit_summary_hash",
            "posterior_mean",
            "posterior_sd",
            "internal_validation_signal_detected",
            "negative_log_posterior_at_mode",
        },
        name,
    )
    for key in (
        "synthetic_input_hash",
        "prepared_input_hash",
        "model_input_hash",
        "context_binding_hash",
        "case_binding_hash",
        "fit_summary_hash",
    ):
        if not _is_sha256(value[key]):
            raise ValueError(f"{name}.{key} must be SHA-256")
    mean = _finite(value["posterior_mean"], f"{name}.posterior_mean")
    sd = _finite(value["posterior_sd"], f"{name}.posterior_sd")
    negative_log_posterior = _finite(
        value["negative_log_posterior_at_mode"],
        f"{name}.negative_log_posterior_at_mode",
    )
    if sd <= 0.0:
        raise ValueError(f"{name}.posterior_sd must be positive")
    expected_signal = (
        abs(mean / sd) > LONGITUDINAL_REPLICATED_VALIDATION_NULL_SIGNAL_Z
    )
    if value["internal_validation_signal_detected"] is not expected_signal:
        raise ValueError(f"{name} signal flag must be derived")
    expected_fit_hash = sha256_json(
        {
            "case_binding_hash": value["case_binding_hash"],
            "synthetic_input_hash": value["synthetic_input_hash"],
            "prepared_input_hash": value["prepared_input_hash"],
            "model_input_hash": value["model_input_hash"],
            "context_binding_hash": value["context_binding_hash"],
            "posterior_mean": mean,
            "posterior_sd": sd,
            "internal_validation_signal_detected": expected_signal,
            "negative_log_posterior_at_mode": negative_log_posterior,
        }
    )
    if value["fit_summary_hash"] != expected_fit_hash:
        raise ValueError(f"{name} fit summary hash must be derived")
    return value


def _validate_negative_evidence(result: ControlResult) -> None:
    evidence = result.evidence
    _require_keys(
        evidence,
        {
            "seed",
            "truth_receipt_hash",
            "fit_attempted",
            "primary_fit",
            "late_window_fit",
            "rejection_stage",
            "rejection_type",
            "rejection_fingerprint",
            "truth_bound_negative_control",
            "customer_output_authorized",
        },
        "negative-control evidence",
    )
    if evidence["seed"] != result.plan["seed"]:
        raise ValueError("negative-control seed mismatch")
    if (
        evidence["truth_bound_negative_control"] is not True
        or evidence["customer_output_authorized"] is not False
    ):
        raise ValueError("negative-control governance pins are invalid")
    primary = _validate_fit_evidence(evidence["primary_fit"], "primary_fit")
    late = _validate_fit_evidence(evidence["late_window_fit"], "late_window_fit")
    expected = result.expected_outcome
    if expected == "REJECTED_BEFORE_FIT":
        if (
            evidence["fit_attempted"] is not False
            or primary is not None
            or late is not None
            or evidence["rejection_stage"] != "prepare"
            or not _is_sha256(evidence["truth_receipt_hash"])
        ):
            raise ValueError("structural negative control must reject before fit")
        expected_type, expected_message = _STRUCTURAL_NEGATIVE_REJECTIONS[
            result.control_id
        ]
        expected_fingerprint = sha256_json(
            {"exception_type": expected_type, "message": expected_message}
        )
        if (
            evidence["rejection_type"] is None
            and evidence["rejection_fingerprint"] is None
        ):
            expected_observed = "UNEXPECTED_PREPARATION_PASS"
        elif (
            evidence["rejection_type"] == expected_type
            and evidence["rejection_fingerprint"] == expected_fingerprint
        ):
            expected_observed = "REJECTED_BEFORE_FIT"
        elif (
            isinstance(evidence["rejection_type"], str)
            and evidence["rejection_type"]
            and _is_sha256(evidence["rejection_fingerprint"])
        ):
            expected_observed = "RUNNER_ERROR"
        else:
            raise ValueError("structural rejection evidence is incomplete")
        if result.observed_outcome != expected_observed:
            raise ValueError("structural rejection outcome must be derived")
    else:
        if result.observed_outcome == "RUNNER_ERROR":
            expected_fit_attempted = evidence["rejection_stage"] != "generate"
            if (
                evidence["rejection_stage"]
                not in {"generate", "primary_fit", "late_window_fit"}
                or evidence["fit_attempted"] is not expected_fit_attempted
                or not isinstance(evidence["rejection_type"], str)
                or not evidence["rejection_type"]
                or not _is_sha256(evidence["rejection_fingerprint"])
                or (
                    evidence["rejection_stage"] != "generate"
                    and not _is_sha256(evidence["truth_receipt_hash"])
                )
            ):
                raise ValueError("negative-control runner error is incomplete")
            return
        if (
            evidence["rejection_stage"] is not None
            or evidence["rejection_type"] is not None
            or evidence["rejection_fingerprint"] is not None
            or not _is_sha256(evidence["truth_receipt_hash"])
        ):
            raise ValueError("successful negative control cannot carry rejection evidence")
        if evidence["fit_attempted"] is not True or primary is None:
            raise ValueError("statistical negative control requires a primary fit")
        if result.control_id != "temporary_movement" and late is not None:
            raise ValueError(
                "only the temporary-movement control may carry a late-window refit"
            )
        expected_primary_case_hash = sha256_json(
            {
                "control_id": result.control_id,
                "truth_receipt_hash": evidence["truth_receipt_hash"],
                "execution_identity_hash": result.execution_identity_hash,
                "synthetic_input_hash": primary["synthetic_input_hash"],
                "prepared_input_hash": primary["prepared_input_hash"],
                "model_input_hash": primary["model_input_hash"],
                "context_binding_hash": primary["context_binding_hash"],
            }
        )
        if primary["case_binding_hash"] != expected_primary_case_hash:
            raise ValueError("negative-control primary case hash must be derived")
        if result.control_id in {
            "approved_control_shock",
            "unrelated_outcome_shock",
        }:
            expected_observed = (
                "PASS_NO_INTERNAL_SIGNAL"
                if primary["internal_validation_signal_detected"] is False
                else "HOLD_UNEXPECTED_INTERNAL_SIGNAL"
            )
        elif result.control_id == "uncontrolled_common_shock":
            expected_observed = "HOLD_UNMEASURED_COMMON_SHOCK"
        elif result.control_id == "temporary_movement":
            if late is None:
                raise ValueError("temporary control requires a late-window refit")
            expected_late_case_hash = sha256_json(
                {
                    "control_id": result.control_id,
                    "refit": "late_window_persistence",
                    "truth_receipt_hash": evidence["truth_receipt_hash"],
                    "execution_identity_hash": result.execution_identity_hash,
                    "synthetic_input_hash": late["synthetic_input_hash"],
                    "prepared_input_hash": late["prepared_input_hash"],
                    "model_input_hash": late["model_input_hash"],
                    "context_binding_hash": late["context_binding_hash"],
                }
            )
            if late["case_binding_hash"] != expected_late_case_hash:
                raise ValueError("temporary-control late case hash must be derived")
            expected_observed = (
                "HOLD_NO_LATE_WINDOW_PERSISTENCE"
                if late["internal_validation_signal_detected"] is False
                else "HOLD_UNEXPECTED_PERSISTENCE"
            )
        else:
            raise ValueError("negative control ID is not compiled")
        if result.observed_outcome != expected_observed:
            raise ValueError("negative-control outcome must be derived")


def recompute_control_case_receipts(result: ControlResult) -> ControlResult:
    """Regenerate deterministic control inputs before resume or combine."""

    validate_control_result(result)
    if result.control_family == "floor":
        if result.observed_outcome == "RUNNER_ERROR":
            return result
        aggregate_k = result.plan["aggregate_measurement_cell_k"]
        if aggregate_k < LONGITUDINAL_REPLICATED_VALIDATION_PROVENANCE_FLOOR_K:
            return result
        case = generate_longitudinal_validation_case(
            effect_size_sd=result.plan["effect_size_sd"],
            panel_group_count=result.plan["panel_group_count"],
            seed=result.plan["seed"],
        )
        prepared = prepare_longitudinal_state_space(case.dataset)
        truth_hash = sha256_json(asdict(case.truth))
        evidence = result.evidence
        expected = (
            truth_hash,
            case.dataset.synthetic_input_hash(),
            prepared.prepared_input_hash,
            prepared.model_input_hash,
            prepared.context_binding_hash,
        )
        observed = (
            evidence["truth_receipt_hash"],
            evidence["synthetic_input_hash"],
            evidence["prepared_input_hash"],
            evidence["model_input_hash"],
            evidence["context_binding_hash"],
        )
        if observed != expected:
            raise ValueError("floor control failed deterministic case recomputation")
        return result

    if result.control_family == "lag":
        truth_hashes = set()
        for score_value in result.evidence["candidate_scores"]:
            score = lag_candidate_score_from_dict(score_value)
            if score.status != "PASS":
                continue
            case = generate_lag_validation_case(
                true_lag_windows=result.plan["true_lag_windows"],
                candidate_lag_windows=score.candidate_lag_windows,
                seed=result.plan["seed"],
            )
            prepared = prepare_longitudinal_state_space(case.dataset)
            truth_hash = sha256_json(case.truth_receipt)
            truth_hashes.add(truth_hash)
            expected = (
                max(score.candidate_lag_windows, 1),
                case.dataset.synthetic_input_hash(),
                prepared.prepared_input_hash,
                prepared.model_input_hash,
                prepared.context_binding_hash,
                truth_hash,
            )
            observed = (
                score.declared_input_lag_windows,
                score.synthetic_input_hash,
                score.prepared_input_hash,
                score.model_input_hash,
                score.context_binding_hash,
                score.truth_receipt_hash,
            )
            if observed != expected:
                raise ValueError("lag control failed deterministic case recomputation")
        if len(truth_hashes) > 1:
            raise ValueError("lag candidates do not share one outcome/truth receipt")
        return result

    if result.observed_outcome in {
        "RUNNER_ERROR",
        "UNEXPECTED_PREPARATION_PASS",
    }:
        return result
    dataset = _dataset_for_negative_control(result.control_id, result.plan["seed"])
    truth_hash = sha256_json(
        {
            "control_id": result.control_id,
            "seed": result.plan["seed"],
            "expected_outcome": result.expected_outcome,
            "synthetic_input_hash": dataset.synthetic_input_hash(),
        }
    )
    if result.evidence["truth_receipt_hash"] != truth_hash:
        raise ValueError("negative control truth receipt recomputation failed")
    if result.expected_outcome == "REJECTED_BEFORE_FIT":
        try:
            prepare_longitudinal_state_space(dataset)
        except Exception as exc:
            if (
                not _matches_structural_negative_rejection(result.control_id, exc)
                or type(exc).__name__ != result.evidence["rejection_type"]
                or _exception_fingerprint(exc)
                != result.evidence["rejection_fingerprint"]
            ):
                raise ValueError(
                    "structural negative control rejection reason changed"
                ) from exc
            return result
        raise ValueError("structural negative control no longer rejects")
    prepared = prepare_longitudinal_state_space(dataset)
    primary = result.evidence["primary_fit"]
    expected_primary = (
        dataset.synthetic_input_hash(),
        prepared.prepared_input_hash,
        prepared.model_input_hash,
        prepared.context_binding_hash,
    )
    observed_primary = (
        primary["synthetic_input_hash"],
        primary["prepared_input_hash"],
        primary["model_input_hash"],
        primary["context_binding_hash"],
    )
    if observed_primary != expected_primary:
        raise ValueError("negative control primary case recomputation failed")
    if result.control_id == "temporary_movement":
        late_dataset = _late_window_dataset(dataset)
        late_prepared = prepare_longitudinal_state_space(late_dataset)
        late = result.evidence["late_window_fit"]
        expected_late = (
            late_dataset.synthetic_input_hash(),
            late_prepared.prepared_input_hash,
            late_prepared.model_input_hash,
            late_prepared.context_binding_hash,
        )
        observed_late = (
            late["synthetic_input_hash"],
            late["prepared_input_hash"],
            late["model_input_hash"],
            late["context_binding_hash"],
        )
        if observed_late != expected_late:
            raise ValueError("temporary control late case recomputation failed")
    return result


def lag_candidate_score_from_dict(value: object) -> LagCandidateScore:
    if not isinstance(value, dict):
        raise ValueError("lag candidate score must be an object")
    _require_keys(
        value,
        {
            "candidate_lag_windows",
            "declared_input_lag_windows",
            "status",
            "negative_log_posterior_at_mode",
            "synthetic_input_hash",
            "prepared_input_hash",
            "model_input_hash",
            "context_binding_hash",
            "truth_receipt_hash",
            "case_binding_hash",
            "fit_summary_hash",
            "runner_error_type",
            "candidate_result_hash",
        },
        "lag candidate score",
    )
    score = LagCandidateScore(
        candidate_lag_windows=_integer(
            value["candidate_lag_windows"], "candidate_lag_windows"
        ),
        declared_input_lag_windows=_integer(
            value["declared_input_lag_windows"], "declared_input_lag_windows"
        ),
        status=value["status"],
        negative_log_posterior_at_mode=(
            None
            if value["negative_log_posterior_at_mode"] is None
            else _finite(
                value["negative_log_posterior_at_mode"],
                "negative_log_posterior_at_mode",
            )
        ),
        synthetic_input_hash=value["synthetic_input_hash"],
        prepared_input_hash=value["prepared_input_hash"],
        model_input_hash=value["model_input_hash"],
        context_binding_hash=value["context_binding_hash"],
        truth_receipt_hash=value["truth_receipt_hash"],
        case_binding_hash=value["case_binding_hash"],
        fit_summary_hash=value["fit_summary_hash"],
        runner_error_type=value["runner_error_type"],
        candidate_result_hash=value["candidate_result_hash"],
    )
    return validate_lag_candidate_score(score)


def control_result_from_dict(value: object) -> ControlResult:
    if not isinstance(value, dict):
        raise ValueError("control result must be an object")
    _require_keys(
        value,
        {
            "control_id",
            "control_family",
            "execution_mode",
            "plan",
            "evidence",
            "expected_outcome",
            "observed_outcome",
            "control_passed",
            "execution_identity_hash",
            "result_hash",
        },
        "control result",
    )
    for key in (
        "control_id",
        "control_family",
        "execution_mode",
        "expected_outcome",
        "observed_outcome",
        "execution_identity_hash",
        "result_hash",
    ):
        if not isinstance(value[key], str) or not value[key]:
            raise ValueError(f"control result {key} must be a nonempty string")
    if not isinstance(value["control_passed"], bool):
        raise ValueError("control_passed must be boolean")
    if not isinstance(value["plan"], dict) or not isinstance(value["evidence"], dict):
        raise ValueError("control plan and evidence must be objects")
    result = ControlResult(
        control_id=value["control_id"],
        control_family=value["control_family"],
        execution_mode=value["execution_mode"],
        plan=value["plan"],
        evidence=value["evidence"],
        expected_outcome=value["expected_outcome"],
        observed_outcome=value["observed_outcome"],
        control_passed=value["control_passed"],
        execution_identity_hash=value["execution_identity_hash"],
        result_hash=value["result_hash"],
    )
    if not _is_sha256(result.execution_identity_hash) or not _is_sha256(
        result.result_hash
    ):
        raise ValueError("control hashes must be SHA-256")
    return validate_control_result(result)


def assemble_control_study(
    *,
    floor_results: Sequence[ControlResult],
    lag_results: Sequence[ControlResult],
    negative_results: Sequence[ControlResult],
    execution_identity: ExecutionIdentity,
    execution_mode: Literal["full", "smoke"],
) -> ControlStudyResult:
    floors = tuple(floor_results)
    lags = tuple(lag_results)
    negatives = tuple(negative_results)
    all_results = (*floors, *lags, *negatives)
    for result in all_results:
        validate_control_result(result, expected_identity=execution_identity)
        if result.execution_mode != execution_mode:
            raise ValueError("control study execution modes must match")
    expected_floor_ids = tuple(
        f"floor_k_{aggregate_k}"
        for aggregate_k in LONGITUDINAL_FLOOR_CONTROL_K_VALUES
    )
    expected_lag_ids = tuple(slot.control_id for slot in required_lag_control_slots())
    expected_negative_ids = LONGITUDINAL_NEGATIVE_CONTROL_IDS
    exact = (
        execution_mode == "full"
        and tuple(result.control_id for result in floors) == expected_floor_ids
        and tuple(result.control_id for result in lags) == expected_lag_ids
        and tuple(result.control_id for result in negatives)
        == expected_negative_ids
        and len({result.result_hash for result in all_results}) == len(all_results)
    )
    floor_passed = len(floors) == len(expected_floor_ids) and all(
        result.control_passed for result in floors
    )
    lag_summaries = []
    for true_lag in LONGITUDINAL_LAG_TRUE_WINDOWS:
        rows = tuple(
            result
            for result in lags
            if result.plan["true_lag_windows"] == true_lag
        )
        valid_count = sum(result.control_passed for result in rows)
        recovered = sum(
            result.evidence["true_lag_recovered"] is True for result in rows
        )
        lag_summaries.append(
            {
                "true_lag_windows": true_lag,
                "expected_replication_count": (
                    LONGITUDINAL_LAG_REPLICATIONS_PER_TRUTH
                ),
                "observed_replication_count": len(rows),
                "valid_selection_count": valid_count,
                "exact_recovery_count": recovered,
                "exact_recovery_rate": (
                    recovered / LONGITUDINAL_LAG_REPLICATIONS_PER_TRUTH
                ),
                "required_recovery_count": (
                    LONGITUDINAL_LAG_REQUIRED_RECOVERIES_PER_TRUTH
                ),
                "passed": (
                    len(rows) == LONGITUDINAL_LAG_REPLICATIONS_PER_TRUTH
                    and valid_count == LONGITUDINAL_LAG_REPLICATIONS_PER_TRUTH
                    and recovered
                    >= LONGITUDINAL_LAG_REQUIRED_RECOVERIES_PER_TRUTH
                ),
            }
        )
    lag_passed = bool(lag_summaries) and all(
        summary["passed"] for summary in lag_summaries
    )
    negative_passed = len(negatives) == len(expected_negative_ids) and all(
        result.control_passed for result in negatives
    )
    failures = []
    if execution_mode != "full":
        failures.append("full_control_execution_required")
    if not exact:
        failures.append("control_manifest_incomplete")
    if not floor_passed:
        failures.append("floor_controls")
    if not lag_passed:
        failures.append("lag_recovery")
    if not negative_passed:
        failures.append("negative_controls")
    passed = exact and floor_passed and lag_passed and negative_passed
    unbound = ControlStudyResult(
        execution_mode=execution_mode,
        floor_results=floors,
        lag_results=lags,
        negative_results=negatives,
        lag_recovery_summaries=tuple(lag_summaries),
        exact_manifest_complete=exact,
        floor_gate_passed=floor_passed,
        lag_gate_passed=lag_passed,
        negative_control_gate_passed=negative_passed,
        study_status="PASS" if passed else "HOLD",
        failing_checks=tuple(failures),
        execution_identity=execution_identity,
        study_result_hash="",
    )
    return replace(
        unbound,
        study_result_hash=sha256_json(unbound.body_without_hash()),
    )


def control_study_result_from_dict(value: object) -> ControlStudyResult:
    if not isinstance(value, dict):
        raise ValueError("control study must be an object")
    expected_keys = {
        "report_class",
        "control_plan",
        "execution_mode",
        "floor_results",
        "lag_results",
        "negative_results",
        "lag_recovery_summaries",
        "exact_manifest_complete",
        "floor_gate_passed",
        "lag_gate_passed",
        "negative_control_gate_passed",
        "study_status",
        "failing_checks",
        "execution_identity",
        "internal_only",
        "synthetic_only",
        "customer_output_authorized",
        "probability_output_authorized",
        "confidence_output_authorized",
        "study_result_hash",
    }
    _require_keys(value, expected_keys, "control study")
    if not strict_json_equal(value["control_plan"], longitudinal_control_plan()):
        raise ValueError("control study plan mismatch")
    from .longitudinal_replicated_validation import execution_identity_from_dict

    identity = execution_identity_from_dict(value["execution_identity"])
    study = assemble_control_study(
        floor_results=tuple(
            control_result_from_dict(item) for item in value["floor_results"]
        ),
        lag_results=tuple(
            control_result_from_dict(item) for item in value["lag_results"]
        ),
        negative_results=tuple(
            control_result_from_dict(item) for item in value["negative_results"]
        ),
        execution_identity=identity,
        execution_mode=value["execution_mode"],
    )
    if not strict_json_equal(value, study.to_dict()):
        raise ValueError("control study failed exact recomputation")
    return study


def _control_result_path(workspace: Path, family: str, control_id: str) -> Path:
    return replicated_validation_workspace_path(
        workspace, "controls", family, f"{control_id}.json"
    )


def _load_or_run_control(
    *,
    path: Path,
    expected_identity: ExecutionIdentity,
    runner,
) -> ControlResult:
    if path.exists():
        try:
            result = control_result_from_dict(read_json(path))
            validate_control_result(result, expected_identity=expected_identity)
            recompute_control_case_receipts(result)
        except Exception as exc:
            raise ReplicatedValidationWorkspaceError(
                f"existing control result is invalid: {path.stem}"
            ) from exc
        return result
    result = runner()
    recompute_control_case_receipts(result)
    write_json_atomic(path, result.to_dict())
    return result


def run_control_workspace(workspace_dir: str | Path) -> ControlStudyResult:
    workspace = initialize_replicated_validation_workspace(workspace_dir)
    identity = build_execution_identity(require_clean=True)
    floors = tuple(
        _load_or_run_control(
            path=_control_result_path(workspace, "floor", f"floor_k_{aggregate_k}"),
            expected_identity=identity,
            runner=lambda aggregate_k=aggregate_k: run_floor_control(
                aggregate_k,
                execution_identity=identity,
                execution_mode="full",
            ),
        )
        for aggregate_k in LONGITUDINAL_FLOOR_CONTROL_K_VALUES
    )
    lags = tuple(
        _load_or_run_control(
            path=_control_result_path(workspace, "lag", slot.control_id),
            expected_identity=identity,
            runner=lambda slot=slot: run_lag_control(
                slot,
                execution_identity=identity,
                execution_mode="full",
            ),
        )
        for slot in required_lag_control_slots()
    )
    negatives = tuple(
        _load_or_run_control(
            path=_control_result_path(workspace, "negative", control_id),
            expected_identity=identity,
            runner=lambda control_id=control_id: run_negative_control(
                control_id,
                execution_identity=identity,
                execution_mode="full",
            ),
        )
        for control_id in LONGITUDINAL_NEGATIVE_CONTROL_IDS
    )
    study = assemble_control_study(
        floor_results=floors,
        lag_results=lags,
        negative_results=negatives,
        execution_identity=identity,
        execution_mode="full",
    )
    manifest_path = replicated_validation_workspace_path(
        workspace, "controls", "control_study.json"
    )
    if manifest_path.exists():
        existing = read_json(manifest_path)
        if not strict_json_equal(existing, study.to_dict()):
            raise ReplicatedValidationWorkspaceError(
                "existing control study manifest is invalid"
            )
    else:
        write_json_atomic(manifest_path, study.to_dict())
    return study


def load_control_workspace(workspace_dir: str | Path) -> ControlStudyResult:
    workspace = initialize_replicated_validation_workspace(workspace_dir)
    path = replicated_validation_workspace_path(
        workspace, "controls", "control_study.json"
    )
    if not path.is_file():
        raise ReplicatedValidationWorkspaceError("control study manifest is missing")
    try:
        study = control_study_result_from_dict(read_json(path))
    except Exception as exc:
        raise ReplicatedValidationWorkspaceError(
            "control study manifest is malformed"
        ) from exc
    if not study.execution_identity.source_tree_clean:
        raise ReplicatedValidationWorkspaceError(
            "full control evidence must bind a clean source tree"
        )
    expected_files = {
        "floor": {
            f"floor_k_{aggregate_k}.json"
            for aggregate_k in LONGITUDINAL_FLOOR_CONTROL_K_VALUES
        },
        "lag": {
            f"{slot.control_id}.json" for slot in required_lag_control_slots()
        },
        "negative": {
            f"{control_id}.json" for control_id in LONGITUDINAL_NEGATIVE_CONTROL_IDS
        },
    }
    loaded: dict[str, list[ControlResult]] = {
        "floor": [],
        "lag": [],
        "negative": [],
    }
    for family, expected in expected_files.items():
        directory = replicated_validation_workspace_path(
            workspace, "controls", family
        )
        actual = {candidate.name for candidate in directory.glob("*.json")}
        if actual != expected:
            raise ReplicatedValidationWorkspaceError(
                f"{family} control checkpoint manifest is not exact"
            )
        for name in sorted(expected):
            try:
                result = control_result_from_dict(read_json(directory / name))
                validate_control_result(
                    result, expected_identity=study.execution_identity
                )
                recompute_control_case_receipts(result)
            except Exception as exc:
                raise ReplicatedValidationWorkspaceError(
                    f"control checkpoint is invalid: {name}"
                ) from exc
            loaded[family].append(result)
    floor_order = {f"floor_k_{value}": index for index, value in enumerate(LONGITUDINAL_FLOOR_CONTROL_K_VALUES)}
    lag_order = {slot.control_id: index for index, slot in enumerate(required_lag_control_slots())}
    negative_order = {value: index for index, value in enumerate(LONGITUDINAL_NEGATIVE_CONTROL_IDS)}
    recomputed = assemble_control_study(
        floor_results=tuple(
            sorted(loaded["floor"], key=lambda result: floor_order[result.control_id])
        ),
        lag_results=tuple(
            sorted(loaded["lag"], key=lambda result: lag_order[result.control_id])
        ),
        negative_results=tuple(
            sorted(
                loaded["negative"],
                key=lambda result: negative_order[result.control_id],
            )
        ),
        execution_identity=study.execution_identity,
        execution_mode="full",
    )
    if not strict_json_equal(recomputed.to_dict(), study.to_dict()):
        raise ReplicatedValidationWorkspaceError(
            "control aggregate manifest does not match its checkpoints"
        )
    current_identity = build_execution_identity(require_clean=True)
    if current_identity != study.execution_identity:
        raise ReplicatedValidationWorkspaceError(
            "control evidence identity differs from the current runner"
        )
    return recomputed


def run_control_smoke() -> ControlStudyResult:
    identity = build_execution_identity(require_clean=False)
    floors = tuple(
        run_floor_control(
            aggregate_k,
            execution_identity=identity,
            execution_mode="smoke",
        )
        for aggregate_k in (4, 8)
    )
    lag_slot = required_lag_control_slots()[0]
    lags = (
        run_lag_control(
            lag_slot,
            execution_identity=identity,
            execution_mode="smoke",
        ),
    )
    negatives = tuple(
        run_negative_control(
            control_id,
            execution_identity=identity,
            execution_mode="smoke",
        )
        for control_id in (
            "uncontrolled_common_shock",
            "approved_control_shock",
            "temporary_movement",
            "unsafe_data",
        )
    )
    return assemble_control_study(
        floor_results=floors,
        lag_results=lags,
        negative_results=negatives,
        execution_identity=identity,
        execution_mode="smoke",
    )


def _require_keys(record: dict, expected: set[str], name: str) -> None:
    if set(record) != expected:
        raise ValueError(f"{name} has missing or unknown fields")


def _is_sha256(value: object) -> bool:
    return (
        isinstance(value, str)
        and len(value) == 64
        and all(character in "0123456789abcdef" for character in value)
    )


def _finite(value: object, name: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{name} must be numeric")
    numeric = float(value)
    if not math.isfinite(numeric):
        raise ValueError(f"{name} must be finite")
    return numeric


def _integer(value: object, name: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"{name} must be an integer")
    return value
