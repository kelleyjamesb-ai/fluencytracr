"""Exact V4 admission and fit binding for the frozen V3 joint likelihood."""

from __future__ import annotations

from dataclasses import dataclass
import math
from pathlib import Path

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
    consume_execution_claim,
    persist_sampler_timeout_hold,
)
from .vbd_joint_types import VBDJointStructureError
from .vbd_joint_replicated_validation_plan import (
    VBDJointReplicatedValidationClaim,
    VBDJointReplicatedValidationSlot,
    vbd_joint_replicated_validation_plan,
)


class VBDJointReplicatedBridgeError(ValueError):
    """Raised before model construction when V4 identity is not exact."""


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
    fit: VBDJointFit
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
    if (
        type(diagnostics) is not dict
        or set(diagnostics.get("failing_diagnostics", ())) != allowed_failures
        or diagnostics.get("state")
        != ("HOLD" if allowed_failures else "PASS")
    ):
        raise VBDJointReplicatedBridgeError(
            "full-model diagnostics require a durable HOLD disposition"
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
        raise VBDJointReplicatedBridgeError(
            "full-model summaries require a durable SUMMARY_NONFINITE HOLD"
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
        raise VBDJointReplicatedBridgeError(str(exc)) from exc


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
        fit = _fit_vbd_joint_model_with_settings(
            prepared,
            variant=spec.variant,
            settings=settings,
            chain_seeds=spec.chain_seeds,
            summary_seed=slot.sampler_seed_base,
            replicated_slot=slot,
            replicated_packet=packet,
            replicated_claim=claim,
            replicated_authorization=authorization,
            replicated_runtime_manifest=runtime_manifest,
            replicated_review_receipt=review_receipt,
            replicated_launch_receipt=launch_receipt,
            replicated_execution_root=execution_root,
        )
        fit_receipt = _validated_fit_receipt(
            fit,
            slot=slot,
            claim=claim,
            launch_receipt=launch_receipt,
        )
        return VBDJointReplicatedFitExecution(
            fit=fit,
            launch_receipt=launch_receipt,
            fit_receipt=fit_receipt,
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


__all__ = [
    "VBDJointReplicatedBridgeError",
    "VBDJointReplicatedFitSpec",
    "VBDJointReplicatedFitExecution",
    "build_vbd_joint_replicated_fit_spec",
    "fit_vbd_joint_replicated_model",
    "prepare_vbd_joint_replicated_dataset",
]
