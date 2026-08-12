"""Exact V4 admission and fit binding for the frozen V3 joint likelihood."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import math
import multiprocessing
from pathlib import Path

from .hashing import sha256_json
from .vbd_joint_model import (
    VBDJointFit,
    VBDJointReplicatedSamplerTimeout,
    VBDJointSamplerSettings,
    _fit_vbd_joint_model_with_settings,
)
from .vbd_joint_preparation import (
    PreparedVBDJointData,
    _prepare_vbd_joint_dataset,
    validate_prepared_vbd_joint_data,
)
from .vbd_joint_replicated_synthetic import (
    VBD_JOINT_REPLICATED_GENERATOR_VERSION,
    VBDJointReplicatedSyntheticDataset,
    generate_vbd_joint_replicated_case_for_slot,
    validate_vbd_joint_replicated_dataset,
)
from .vbd_joint_replicated_runner import (
    VBDJointReplicatedExecutionAuthorization,
    VBDJointReplicatedExecutionPacket,
    VBDJointReplicatedFitReceipt,
    VBDJointReplicatedLaunchReceipt,
    VBDJointReplicatedRuntimeManifest,
    VBDJointReplicatedReviewReceipt,
    VBDJointReplicatedRunnerError,
    _VBDJointReplicatedWorkerHoldReceipt,
    _persist_worker_execution_hold,
    consume_execution_claim,
    persist_sampler_timeout_hold,
    persist_validated_fit_receipt,
)
from .vbd_joint_types import VBDJointStructureError
from .vbd_joint_replicated_validation_plan import (
    VBDJointReplicatedValidationClaim,
    VBDJointReplicatedValidationSlot,
    vbd_joint_replicated_validation_plan,
)


class VBDJointReplicatedBridgeError(ValueError):
    """Raised before model construction when V4 identity is not exact."""


class _VBDJointReplicatedFitHold(VBDJointReplicatedBridgeError):
    """Internal classification for a sampled fit that must terminate in HOLD."""

    def __init__(self, failure_code: str, message: str) -> None:
        super().__init__(message)
        self.failure_code = failure_code


def _worker_hold_receipt(
    *,
    slot: VBDJointReplicatedValidationSlot,
    claim: VBDJointReplicatedValidationClaim,
    launch_receipt: VBDJointReplicatedLaunchReceipt,
    failure_code: str,
    evidence_hash: str,
    worker_process_id: int,
) -> _VBDJointReplicatedWorkerHoldReceipt:
    body = {
        "slot_id": slot.slot_id,
        "claim_hash": claim.claim_hash,
        "launch_receipt_hash": launch_receipt.launch_receipt_hash,
        "failure_code": failure_code,
        "evidence_hash": evidence_hash,
        "worker_process_id": worker_process_id,
    }
    return _VBDJointReplicatedWorkerHoldReceipt(
        **body,
        receipt_hash=sha256_json(body),
    )


class _VBDJointReplicatedWorkerError(RuntimeError):
    """Sanitized signal that the isolated sampler worker failed."""


def _replicated_fit_worker_entry(connection, arguments: dict) -> None:
    """Run the full fit in a killable process and return no raw error text."""

    phase = "SAMPLER_ERROR"
    try:
        model_arguments = arguments["model_arguments"]
        fit = _fit_vbd_joint_model_with_settings(**model_arguments)
        phase = "DIAGNOSTIC_HOLD"
        receipt = _validated_fit_receipt(
            fit,
            slot=arguments["slot"],
            claim=arguments["claim"],
            launch_receipt=arguments["launch_receipt"],
        )
        connection.send(("FIT_RECEIPT", receipt))
    except _VBDJointReplicatedFitHold as exc:
        connection.send(
            (
                "FIT_HOLD",
                (
                    exc.failure_code,
                    sha256_json(
                        {
                            "fit_summary_hash": fit.fit_summary_hash(),
                            "failure_code": exc.failure_code,
                        }
                    ),
                ),
            )
        )
    except VBDJointReplicatedSamplerTimeout:
        connection.send(("TIMEOUT", None))
    except BaseException as exc:
        connection.send(
            (
                "ERROR",
                (
                    phase,
                    sha256_json(
                        {
                            "receipt_schema": "VBD_JOINT_REPLICATED_WORKER_ERROR_V1",
                            "phase": phase,
                            "exception_type": type(exc).__name__,
                        }
                    ),
                ),
            )
        )
    finally:
        connection.close()


def _run_replicated_fit_worker(
    arguments: dict,
    *,
    claim: VBDJointReplicatedValidationClaim,
) -> VBDJointReplicatedFitReceipt:
    """Wait only until the immutable deadline, then terminate the worker."""

    deadline = datetime.fromisoformat(claim.deadline_at.replace("Z", "+00:00"))
    remaining = (deadline - datetime.now(timezone.utc)).total_seconds()
    if remaining <= 0.0:
        raise VBDJointReplicatedSamplerTimeout(
            "frozen two-hour sampler deadline elapsed"
        )
    context = multiprocessing.get_context("spawn")
    receive_connection, send_connection = context.Pipe(duplex=False)
    process = context.Process(
        target=_replicated_fit_worker_entry,
        args=(send_connection, arguments),
        daemon=False,
    )
    process.start()
    send_connection.close()
    try:
        if not receive_connection.poll(remaining):
            process.terminate()
            process.join(timeout=5.0)
            if process.is_alive():
                process.kill()
                process.join(timeout=5.0)
            raise VBDJointReplicatedSamplerTimeout(
                "frozen two-hour sampler deadline elapsed"
            )
        try:
            state, payload = receive_connection.recv()
        except EOFError as exc:
            raise _VBDJointReplicatedWorkerError(
                "isolated full-model worker exited without a result"
            ) from exc
    finally:
        receive_connection.close()
        process.join(timeout=5.0)
        if process.is_alive():
            process.terminate()
            process.join(timeout=5.0)
        if process.is_alive():
            process.kill()
            process.join(timeout=5.0)
    if process.exitcode != 0:
        error = _VBDJointReplicatedWorkerError(
            "isolated full-model worker exited unsuccessfully"
        )
        error.failure_code = "SAMPLER_ERROR"
        error.evidence_hash = sha256_json(
            {
                "receipt_schema": "VBD_JOINT_REPLICATED_WORKER_EXIT_V1",
                "exit_code": process.exitcode,
            }
        )
        error.worker_process_id = process.pid
        raise error
    if state == "TIMEOUT":
        raise VBDJointReplicatedSamplerTimeout(
            "frozen two-hour sampler deadline elapsed"
        )
    if state == "FIT_HOLD":
        failure_code, evidence_hash = payload
        error = _VBDJointReplicatedFitHold(
            failure_code,
            "full-model fit requires a durable HOLD disposition",
        )
        error.evidence_hash = evidence_hash
        error.worker_process_id = process.pid
        raise error
    if state == "ERROR":
        failure_code, evidence_hash = payload
        error = _VBDJointReplicatedWorkerError(
            "isolated full-model worker failed"
        )
        error.failure_code = failure_code
        error.evidence_hash = evidence_hash
        error.worker_process_id = process.pid
        raise error
    if state != "FIT_RECEIPT" or type(payload) is not VBDJointReplicatedFitReceipt:
        raise _VBDJointReplicatedWorkerError(
            "isolated full-model worker failed"
        )
    return payload


def _require_exact_slot(slot: VBDJointReplicatedValidationSlot) -> None:
    if type(slot) is not VBDJointReplicatedValidationSlot:
        raise VBDJointReplicatedBridgeError("slot must use the exact frozen type")
    plan = vbd_joint_replicated_validation_plan()
    expected = next(
        (
            candidate
            for candidate in (
                plan.qualifying_slots + plan.preflight_slots + plan.canary_slots
            )
            if candidate.slot_id == slot.slot_id
        ),
        None,
    )
    if expected != slot:
        raise VBDJointReplicatedBridgeError("slot is not in the frozen plan")


def _require_case_slot_binding(
    case: VBDJointReplicatedSyntheticDataset,
    slot: VBDJointReplicatedValidationSlot,
) -> None:
    _require_exact_slot(slot)
    if type(case) is not VBDJointReplicatedSyntheticDataset:
        raise VBDJointReplicatedBridgeError("case must use the exact V4 type")
    try:
        validate_vbd_joint_replicated_dataset(case)
    except VBDJointStructureError as exc:
        raise VBDJointReplicatedBridgeError(str(exc)) from exc
    if (
        case.cell_id != slot.cell_id
        or case.replicate_index != slot.replicate_index
        or case.scenario_id != slot.scenario_id
        or case.dataset_seed != slot.dataset_seed
    ):
        raise VBDJointReplicatedBridgeError("case does not bind the frozen slot")
    expected = generate_vbd_joint_replicated_case_for_slot(slot)
    if case.content_hash() != expected.content_hash():
        raise VBDJointReplicatedBridgeError("case does not match the frozen slot dataset")


def prepare_vbd_joint_replicated_dataset(
    case: VBDJointReplicatedSyntheticDataset,
    *,
    slot: VBDJointReplicatedValidationSlot,
) -> PreparedVBDJointData:
    """Admit one exact V4 envelope into the unchanged joint-model projection."""

    _require_case_slot_binding(case, slot)
    return _prepare_vbd_joint_dataset(
        case.dataset,
        source_profile="replicated_v4",
        generator_version=VBD_JOINT_REPLICATED_GENERATOR_VERSION,
        expected_seed=slot.dataset_seed,
        expected_capability_standard_error=case.capability_standard_error,
        dataset_hash=case.content_hash(),
        replicated_cell_id=case.cell_id,
        replicate_index=case.replicate_index,
        scenario_id=case.scenario_id,
    )


@dataclass(frozen=True, slots=True)
class VBDJointReplicatedFitSpec:
    slot_hash: str
    prepared_input_hash: str
    variant: str
    chain_seeds: tuple[int, ...]
    chains: int
    draws: int
    tune: int
    target_accept: float
    max_treedepth: int


@dataclass(frozen=True, slots=True)
class VBDJointReplicatedFitExecution:
    launch_receipt: VBDJointReplicatedLaunchReceipt
    fit_receipt: VBDJointReplicatedFitReceipt


def _validated_fit_receipt(
    fit: VBDJointFit,
    *,
    slot: VBDJointReplicatedValidationSlot,
    claim: VBDJointReplicatedValidationClaim,
    launch_receipt: VBDJointReplicatedLaunchReceipt,
) -> VBDJointReplicatedFitReceipt:
    if type(fit) is not VBDJointFit:
        raise VBDJointReplicatedBridgeError("fit must use the exact full-model type")
    if (
        launch_receipt.slot_id != slot.slot_id
        or launch_receipt.claim_hash != claim.claim_hash
        or fit.prepared.source_profile != "replicated_v4"
        or fit.prepared.replicated_cell_id != slot.cell_id
        or fit.prepared.replicate_index != slot.replicate_index
        or fit.prepared.scenario_id != slot.scenario_id
        or fit.prepared.seed != slot.dataset_seed
        or fit.variant != slot.variant
    ):
        raise VBDJointReplicatedBridgeError(
            "full-model fit does not bind the launched V4 slot"
        )
    diagnostics = fit.diagnostics
    allowed_failures = (
        {"smoke_settings_nonqualifying"} if slot.namespace == "preflight" else set()
    )
    observed_failures = (
        set(diagnostics.get("failing_diagnostics", ()))
        if type(diagnostics) is dict
        else set()
    )
    numeric_summary_values = (
        fit.bayesian_r_squared_mean,
        fit.future_window_rmse,
        fit.future_window_log_score,
        *(value for item in fit.coefficient_summaries for value in (
            item.posterior_mean,
            item.posterior_sd,
            item.interval_80_lower,
            item.interval_80_upper,
        )),
    )
    if any(
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or not math.isfinite(float(value))
        for value in numeric_summary_values
    ):
        raise _VBDJointReplicatedFitHold(
            "SUMMARY_NONFINITE",
            "full-model summaries require a durable SUMMARY_NONFINITE HOLD"
        )
    if (
        type(diagnostics) is not dict
        or observed_failures != allowed_failures
        or diagnostics.get("state")
        != ("HOLD" if allowed_failures else "PASS")
    ):
        raise _VBDJointReplicatedFitHold(
            (
                "SUMMARY_NONFINITE"
                if "summary_nonfinite" in observed_failures
                else "DIAGNOSTIC_HOLD"
            ),
            "full-model diagnostics require a durable HOLD disposition"
        )
    body = {
        "slot_id": slot.slot_id,
        "claim_hash": claim.claim_hash,
        "launch_receipt_hash": launch_receipt.launch_receipt_hash,
        "prepared_input_hash": fit.prepared.prepared_input_hash,
        "dataset_hash": fit.prepared.dataset_hash,
        "variant": fit.variant,
        "fit_summary_hash": fit.fit_summary_hash(),
        "diagnostics_hash": sha256_json(diagnostics),
        "max_r_hat": diagnostics["max_r_hat"],
        "min_bulk_ess": diagnostics["min_bulk_ess"],
        "min_tail_ess": diagnostics["min_tail_ess"],
        "divergence_count": diagnostics["divergence_count"],
        "max_treedepth_count": diagnostics["max_treedepth_count"],
        "wall_time_seconds": fit.wall_time_seconds,
    }
    try:
        return VBDJointReplicatedFitReceipt(
            **body,
            receipt_hash=sha256_json(body),
        )
    except VBDJointReplicatedRunnerError as exc:
        raise _VBDJointReplicatedFitHold(
            "DIAGNOSTIC_HOLD",
            "full-model diagnostics require a durable HOLD disposition",
        ) from exc


def build_vbd_joint_replicated_fit_spec(
    prepared: PreparedVBDJointData,
    *,
    slot: VBDJointReplicatedValidationSlot,
) -> VBDJointReplicatedFitSpec:
    """Bind the exact V4 slot settings before any sampler can initialize."""

    _require_exact_slot(slot)
    if type(prepared) is not PreparedVBDJointData:
        raise VBDJointReplicatedBridgeError(
            "prepared input must use the exact frozen type"
        )
    if prepared.source_profile != "replicated_v4":
        raise VBDJointReplicatedBridgeError("prepared input is not a V4 case")
    if (
        prepared.replicated_cell_id != slot.cell_id
        or prepared.replicate_index != slot.replicate_index
        or prepared.scenario_id != slot.scenario_id
        or prepared.seed != slot.dataset_seed
    ):
        raise VBDJointReplicatedBridgeError("prepared input does not bind the slot")
    try:
        validate_prepared_vbd_joint_data(prepared)
    except ValueError as exc:
        raise VBDJointReplicatedBridgeError(str(exc)) from exc
    return VBDJointReplicatedFitSpec(
        slot_hash=slot.slot_hash,
        prepared_input_hash=prepared.prepared_input_hash,
        variant=slot.variant,
        chain_seeds=slot.chain_seeds,
        chains=slot.chains,
        draws=slot.draws,
        tune=slot.tune,
        target_accept=slot.target_accept,
        max_treedepth=slot.max_treedepth,
    )


def fit_vbd_joint_replicated_model(
    prepared: PreparedVBDJointData,
    *,
    slot: VBDJointReplicatedValidationSlot,
    packet: VBDJointReplicatedExecutionPacket,
    claim: VBDJointReplicatedValidationClaim,
    authorization: VBDJointReplicatedExecutionAuthorization,
    runtime_manifest: VBDJointReplicatedRuntimeManifest,
    review_receipt: VBDJointReplicatedReviewReceipt,
    execution_root: Path,
) -> VBDJointReplicatedFitExecution:
    """Fit one exact V4 slot through the unchanged joint-model likelihood."""

    spec = build_vbd_joint_replicated_fit_spec(prepared, slot=slot)
    settings = VBDJointSamplerSettings(
        mode="smoke" if slot.namespace == "preflight" else "full",
        chains=spec.chains,
        draws=spec.draws,
        tune=spec.tune,
        target_accept=spec.target_accept,
        max_treedepth=spec.max_treedepth,
    )
    try:
        launch_receipt = consume_execution_claim(
            execution_root,
            slot,
            prepared_dataset_hash=prepared.dataset_hash,
            packet=packet,
            claim=claim,
            authorization=authorization,
            runtime_manifest=runtime_manifest,
            review_receipt=review_receipt,
        )
    except VBDJointReplicatedRunnerError as exc:
        raise VBDJointReplicatedBridgeError(str(exc)) from exc
    try:
        fit_receipt = _run_replicated_fit_worker(
            {
                "model_arguments": {
                    "prepared": prepared,
                    "variant": spec.variant,
                    "settings": settings,
                    "chain_seeds": spec.chain_seeds,
                    "summary_seed": slot.sampler_seed_base,
                    "replicated_slot": slot,
                    "replicated_packet": packet,
                    "replicated_claim": claim,
                    "replicated_authorization": authorization,
                    "replicated_runtime_manifest": runtime_manifest,
                    "replicated_review_receipt": review_receipt,
                    "replicated_launch_receipt": launch_receipt,
                    "replicated_execution_root": execution_root,
                },
                "slot": slot,
                "claim": claim,
                "launch_receipt": launch_receipt,
            },
            claim=claim,
        )
    except VBDJointReplicatedSamplerTimeout as exc:
        try:
            persist_sampler_timeout_hold(
                execution_root,
                slot,
                claim=claim,
                launch_receipt=launch_receipt,
                case_hash=packet.dataset_hash,
            )
        except VBDJointReplicatedRunnerError as persist_exc:
            raise VBDJointReplicatedBridgeError(str(persist_exc)) from persist_exc
        raise VBDJointReplicatedBridgeError(str(exc)) from exc
    except _VBDJointReplicatedFitHold as exc:
        try:
            _persist_worker_execution_hold(
                execution_root,
                slot,
                claim=claim,
                launch_receipt=launch_receipt,
                case_hash=packet.dataset_hash,
                worker_receipt=_worker_hold_receipt(
                    slot=slot,
                    claim=claim,
                    launch_receipt=launch_receipt,
                    failure_code=exc.failure_code,
                    evidence_hash=exc.evidence_hash,
                    worker_process_id=exc.worker_process_id,
                ),
            )
        except VBDJointReplicatedRunnerError as persist_exc:
            raise VBDJointReplicatedBridgeError(str(persist_exc)) from persist_exc
        raise VBDJointReplicatedBridgeError(str(exc)) from exc
    except Exception as exc:
        failure_code = getattr(exc, "failure_code", "SAMPLER_ERROR")
        evidence_hash = getattr(
            exc,
            "evidence_hash",
            sha256_json(
                {
                    "receipt_schema": "VBD_JOINT_REPLICATED_PARENT_ERROR_V1",
                    "exception_type": type(exc).__name__,
                }
            ),
        )
        try:
            _persist_worker_execution_hold(
                execution_root,
                slot,
                claim=claim,
                launch_receipt=launch_receipt,
                case_hash=packet.dataset_hash,
                worker_receipt=_worker_hold_receipt(
                    slot=slot,
                    claim=claim,
                    launch_receipt=launch_receipt,
                    failure_code=failure_code,
                    evidence_hash=evidence_hash,
                    worker_process_id=getattr(exc, "worker_process_id", 0),
                ),
            )
        except VBDJointReplicatedRunnerError as persist_exc:
            raise VBDJointReplicatedBridgeError(str(persist_exc)) from persist_exc
        raise VBDJointReplicatedBridgeError(
            f"full-model worker failed; durable {failure_code} HOLD persisted"
        ) from exc
    try:
        persist_validated_fit_receipt(
            execution_root,
            fit_receipt,
            launch_receipt=launch_receipt,
        )
    except VBDJointReplicatedRunnerError as exc:
        raise VBDJointReplicatedBridgeError(str(exc)) from exc
    deadline = datetime.fromisoformat(claim.deadline_at.replace("Z", "+00:00"))
    if datetime.now(timezone.utc) >= deadline:
        try:
            persist_sampler_timeout_hold(
                execution_root,
                slot,
                claim=claim,
                launch_receipt=launch_receipt,
                case_hash=packet.dataset_hash,
            )
        except VBDJointReplicatedRunnerError as exc:
            raise VBDJointReplicatedBridgeError(str(exc)) from exc
        raise VBDJointReplicatedBridgeError(
            "frozen two-hour sampler deadline elapsed before receipt durability"
        )
    return VBDJointReplicatedFitExecution(
        launch_receipt=launch_receipt,
        fit_receipt=fit_receipt,
    )


__all__ = [
    "VBDJointReplicatedBridgeError",
    "VBDJointReplicatedFitSpec",
    "VBDJointReplicatedFitExecution",
    "build_vbd_joint_replicated_fit_spec",
    "fit_vbd_joint_replicated_model",
    "prepare_vbd_joint_replicated_dataset",
]
