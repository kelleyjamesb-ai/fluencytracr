"""Exact V4 admission and fit binding for the frozen V3 joint likelihood."""

from __future__ import annotations

from dataclasses import dataclass

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
from .vbd_joint_types import VBDJointStructureError
from .vbd_joint_replicated_validation_plan import (
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


__all__ = [
    "VBDJointReplicatedBridgeError",
    "VBDJointReplicatedFitSpec",
    "build_vbd_joint_replicated_fit_spec",
    "prepare_vbd_joint_replicated_dataset",
]
