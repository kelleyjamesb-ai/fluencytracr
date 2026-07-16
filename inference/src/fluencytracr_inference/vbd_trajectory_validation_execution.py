"""Fresh-process slot execution for the fixed VBD trajectory proof plan."""

from __future__ import annotations

import os
from pathlib import Path
import secrets
import stat
import sys
import threading

from .hashing import sha256_json
from .vbd_trajectory_preparation import prepare_vbd_trajectory_lane
from .vbd_trajectory_state_space import fit_vbd_trajectory_state_space
from .vbd_trajectory_synthetic import (
    _VALIDATION_GENERATION_RUNNER_TOKEN,
    _generate_vbd_trajectory_depth_validation_pair,
    _validation_generation_context,
    VBD_TRAJECTORY_COMMON_AVAILABILITY_SHOCK_TERMINAL,
    generate_vbd_trajectory_validation_case,
)
from .vbd_trajectory_types import VBD_TRAJECTORY_LANES
from .vbd_trajectory_validation_plan import (
    immutable_vbd_trajectory_validation_plan,
    required_vbd_trajectory_validation_slots,
)
from .vbd_trajectory_validation_resumable import (
    VBD_TRAJECTORY_CHILD_OUTPUT_SCHEMA_VERSION,
    VBD_TRAJECTORY_FREEZE_MANIFEST_RELATIVE_PATH,
    VBD_TRAJECTORY_LAUNCH_CAPABILITY_SCHEMA_VERSION,
    VBD_TRAJECTORY_LAUNCH_RECEIPT_SCHEMA_VERSION,
    VbdTrajectoryValidationWorkspaceError,
    _file_sha256,
    _child_command_hash,
    _canonical_json_bytes,
    _decode_json_bytes,
    _repo_root,
    _strict_timestamp,
    _utc_now,
    _validate_freeze_manifest,
    _verify_current_freeze,
    build_vbd_trajectory_runtime_identity,
    read_strict_json,
    vbd_trajectory_runner_implementation_manifest,
)
from .vbd_trajectory_validation_study import (
    VbdTrajectoryLaneResult,
    VbdTrajectorySlotResult,
    _expected_failure_code,
    _expected_result_stage,
    _expected_row_state,
    build_vbd_trajectory_lane_result,
    build_vbd_trajectory_slot_result,
)


def _validate_child_receipt(value: object) -> tuple[dict, int]:
    expected = {
        "schema_version",
        "execution_kind",
        "phase",
        "phase_hash",
        "phase_token",
        "workspace_hash",
        "slot_index",
        "slot_id",
        "slot_hash",
        "canary_id",
        "canary_hash",
        "plan_hash",
        "freeze_commit",
        "freeze_manifest_hash",
        "implementation_hash",
        "runtime_identity_hash",
        "executable_sha256",
        "native_library_identity_hash",
        "command_id",
        "command_hash",
        "parent_process_id",
        "created_at",
        "launch_token",
        "capability_token_hash",
        "result_present",
        "internal_only",
        "synthetic_only",
        "customer_output_authorized",
        "launch_receipt_hash",
    }
    if type(value) is not dict or set(value) != expected:
        raise VbdTrajectoryValidationWorkspaceError(
            "child launch receipt shape is invalid"
        )
    body = {key: item for key, item in value.items() if key != "launch_receipt_hash"}
    slots = required_vbd_trajectory_validation_slots()
    slot_index = value["slot_index"]
    if type(slot_index) is not int or not 0 <= slot_index < len(slots):
        raise VbdTrajectoryValidationWorkspaceError("child slot ordinal is off plan")
    slot = slots[slot_index]
    execution_kind = value["execution_kind"]
    phase = value["phase"]
    if (
        value["schema_version"] != VBD_TRAJECTORY_LAUNCH_RECEIPT_SCHEMA_VERSION
        or execution_kind not in {"canary", "study"}
        or phase not in {"canary", "original", "recomputation"}
        or (execution_kind == "canary") is not (phase == "canary")
        or value["slot_id"] != slot.slot_id
        or value["slot_hash"] != slot.slot_hash
        or value["plan_hash"]
        != immutable_vbd_trajectory_validation_plan().plan_hash
        or value["command_id"] != "vbd_trajectory_child_execute_slot"
        or value["command_hash"] != _child_command_hash()
        or type(value["parent_process_id"]) is not int
        or value["parent_process_id"] <= 0
        or value["result_present"] is not False
        or value["internal_only"] is not True
        or value["synthetic_only"] is not True
        or value["customer_output_authorized"] is not False
        or value["launch_receipt_hash"] != sha256_json(body)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "child launch receipt is invalid"
        )
    for key in (
        "phase_hash",
        "phase_token",
        "workspace_hash",
        "slot_hash",
        "plan_hash",
        "freeze_manifest_hash",
        "implementation_hash",
        "runtime_identity_hash",
        "executable_sha256",
        "native_library_identity_hash",
        "command_hash",
        "launch_token",
        "capability_token_hash",
        "launch_receipt_hash",
    ):
        item = value[key]
        if (
            type(item) is not str
            or len(item) != 64
            or any(character not in "0123456789abcdef" for character in item)
        ):
            raise VbdTrajectoryValidationWorkspaceError(
                f"child launch {key} is invalid"
            )
    if (
        type(value["freeze_commit"]) is not str
        or len(value["freeze_commit"]) != 40
        or any(
            character not in "0123456789abcdef"
            for character in value["freeze_commit"]
        )
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "child launch freeze commit is invalid"
        )
    return value, slot_index


def _inherited_pipe_fd(environment_key: str) -> int:
    raw = os.environ.pop(environment_key, None)
    try:
        descriptor = int(raw) if raw is not None else -1
    except ValueError as exc:
        raise VbdTrajectoryValidationWorkspaceError(
            "slot execution lacks an inherited runner pipe"
        ) from exc
    if descriptor <= 2:
        raise VbdTrajectoryValidationWorkspaceError(
            "slot execution lacks an inherited runner pipe"
        )
    try:
        opened = os.fstat(descriptor)
    except OSError as exc:
        raise VbdTrajectoryValidationWorkspaceError(
            "slot execution inherited runner pipe is unavailable"
        ) from exc
    if not stat.S_ISFIFO(opened.st_mode):
        raise VbdTrajectoryValidationWorkspaceError(
            "slot execution capability is not an inherited pipe"
        )
    return descriptor


def _read_launch_capability(receipt: dict) -> dict:
    descriptor = _inherited_pipe_fd("FT_VBD_TRAJECTORY_CAPABILITY_FD")
    encoded = bytearray()
    try:
        while True:
            block = os.read(descriptor, 4096)
            if not block:
                break
            encoded.extend(block)
            if len(encoded) > 64 * 1024:
                raise VbdTrajectoryValidationWorkspaceError(
                    "slot launch capability exceeds its bound"
                )
    finally:
        os.close(descriptor)
    value = _decode_json_bytes(bytes(encoded), "slot launch capability")
    expected = {
        "schema_version",
        "launch_receipt_hash",
        "workspace_hash",
        "parent_process_id",
        "capability_token",
        "created_at",
        "internal_only",
        "synthetic_only",
        "capability_hash",
    }
    if type(value) is not dict or set(value) != expected:
        raise VbdTrajectoryValidationWorkspaceError(
            "slot launch capability shape is invalid"
        )
    body = {key: item for key, item in value.items() if key != "capability_hash"}
    if (
        bytes(encoded) != _canonical_json_bytes(value)
        or value["schema_version"]
        != VBD_TRAJECTORY_LAUNCH_CAPABILITY_SCHEMA_VERSION
        or value["launch_receipt_hash"] != receipt["launch_receipt_hash"]
        or value["workspace_hash"] != receipt["workspace_hash"]
        or value["parent_process_id"] != receipt["parent_process_id"]
        or value["parent_process_id"] != os.getppid()
        or type(value["capability_token"]) is not str
        or len(value["capability_token"]) != 64
        or any(
            character not in "0123456789abcdef"
            for character in value["capability_token"]
        )
        or sha256_json(value["capability_token"])
        != receipt["capability_token_hash"]
        or _strict_timestamp(value["created_at"], "capability created_at")
        != value["created_at"]
        or value["internal_only"] is not True
        or value["synthetic_only"] is not True
        or value["capability_hash"] != sha256_json(body)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "slot launch capability is invalid"
        )
    return value


def _start_parent_liveness_watchdog(receipt: dict) -> None:
    descriptor = _inherited_pipe_fd(
        "FT_VBD_TRAJECTORY_PARENT_LIVENESS_FD"
    )

    def terminate_on_parent_loss() -> None:
        try:
            while os.read(descriptor, 1):
                os._exit(70)
        except OSError:
            os._exit(70)
        finally:
            try:
                os.close(descriptor)
            except OSError:
                pass
        os._exit(70)

    if os.getppid() != receipt["parent_process_id"]:
        os.close(descriptor)
        raise VbdTrajectoryValidationWorkspaceError(
            "slot child lost its launch parent before execution"
        )
    threading.Thread(
        target=terminate_on_parent_loss,
        name="vbd-parent-liveness",
        daemon=True,
    ).start()


def _verify_child_source_identity(receipt: dict) -> tuple[dict, dict, dict]:
    if os.environ.get("FT_VBD_TRAJECTORY_CHILD") != "1":
        raise VbdTrajectoryValidationWorkspaceError(
            "slot execution is restricted to the fresh child path"
        )
    if os.getppid() != receipt["parent_process_id"]:
        raise VbdTrajectoryValidationWorkspaceError(
            "slot child is detached from its launch parent"
        )
    manifest_path = _repo_root() / VBD_TRAJECTORY_FREEZE_MANIFEST_RELATIVE_PATH
    freeze = _validate_freeze_manifest(read_strict_json(manifest_path))
    identity = _verify_current_freeze(freeze)
    implementation = vbd_trajectory_runner_implementation_manifest()
    runtime = build_vbd_trajectory_runtime_identity()
    for key in (
        "freeze_commit",
        "freeze_manifest_hash",
        "implementation_hash",
        "runtime_identity_hash",
        "plan_hash",
    ):
        if receipt[key] != identity[key]:
            raise VbdTrajectoryValidationWorkspaceError(
                "child launch differs from frozen execution identity"
            )
    if implementation["implementation_hash"] != receipt["implementation_hash"]:
        raise VbdTrajectoryValidationWorkspaceError(
            "child implementation identity drifted"
        )
    if runtime["runtime_identity_hash"] != receipt["runtime_identity_hash"]:
        raise VbdTrajectoryValidationWorkspaceError(
            "child runtime identity drifted"
        )
    if (
        runtime["executable_sha256"] != receipt["executable_sha256"]
        or sha256_json(runtime["native_libraries"])
        != receipt["native_library_identity_hash"]
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "child executable or native-library identity drifted"
        )
    return identity, implementation, runtime


def _lane_result(
    *,
    slot,
    lane_index: int,
    prepared,
    fit,
) -> VbdTrajectoryLaneResult:
    summary = fit.movement_summary
    return build_vbd_trajectory_lane_result(
        lane=VBD_TRAJECTORY_LANES[lane_index],
        raw_truth=float(slot.truth_vector[lane_index]),
        direction_sign=slot.direction_vector[lane_index],
        posterior_mean=float(summary.posterior_mean),
        posterior_sd=float(summary.posterior_sd),
        interval_80_lower=float(summary.interval_80_lower),
        interval_80_upper=float(summary.interval_80_upper),
        interval_99_lower=float(summary.interval_99_lower),
        interval_99_upper=float(summary.interval_99_upper),
        prepared_input_hash=prepared.prepared_input_hash,
        model_input_hash=prepared.model_input_hash,
        context_binding_hash=prepared.context_binding_hash,
        fit_summary_hash=fit.fit_summary_hash(),
        diagnostics_hash=sha256_json(fit.integration_diagnostics.to_dict()),
    )


def _require_launch_parent(expected_parent_process_id: int) -> None:
    if os.getppid() != expected_parent_process_id:
        raise VbdTrajectoryValidationWorkspaceError(
            "slot child lost its launch parent"
        )


def _fit_generated_case(
    slot, case, expected_parent_process_id: int
) -> VbdTrajectorySlotResult:
    _require_launch_parent(expected_parent_process_id)
    regenerated = generate_vbd_trajectory_validation_case(slot)
    if (
        regenerated.panel.ordered_panel_manifest_root
        != case.panel.ordered_panel_manifest_root
        or regenerated.panel.lane_observation_roots
        != case.panel.lane_observation_roots
        or regenerated.panel.seed_manifest_root != case.panel.seed_manifest_root
        or regenerated.panel.study_plan_root != case.panel.study_plan_root
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "generated inputs did not match fresh exact regeneration"
        )
    prepared = tuple(
        prepare_vbd_trajectory_lane(case.panel, lane)
        for lane in VBD_TRAJECTORY_LANES
    )
    if slot.family == "floor":
        expected_series_eligibility = slot.k >= 10
        if any(
            item.series_evidence_eligible is not expected_series_eligibility
            for item in prepared
        ):
            raise VbdTrajectoryValidationWorkspaceError(
                "floor control series eligibility drifted"
            )
    if (
        slot.scenario_or_control_id == "common_availability_shock"
        and (
            case.truth.shock_kind != "common_availability"
            or case.truth.structural_terminal_truth != (0.0, 0.0, 0.0)
            or case.truth.common_shock_terminal_shift
            != VBD_TRAJECTORY_COMMON_AVAILABILITY_SHOCK_TERMINAL
        )
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "common-shock control lost its truth-sidecar binding"
        )
    fits_list = []
    for item in prepared:
        _require_launch_parent(expected_parent_process_id)
        fits_list.append(fit_vbd_trajectory_state_space(item, case.panel))
        _require_launch_parent(expected_parent_process_id)
    fits = tuple(fits_list)
    lane_results = tuple(
        _lane_result(
            slot=slot,
            lane_index=index,
            prepared=prepared[index],
            fit=fits[index],
        )
        for index in range(3)
    )
    return build_vbd_trajectory_slot_result(
        slot=slot,
        row_state=_expected_row_state(slot),
        failure_stage=_expected_result_stage(slot),
        failure_code=_expected_failure_code(slot),
        fit_attempted=True,
        lane_results=lane_results,
        controlled_subject_study_hold=slot.matched_outcome_holds_full_study,
    )


def _execute_depth_perturbation(
    slot, expected_parent_process_id: int
) -> VbdTrajectorySlotResult:
    _require_launch_parent(expected_parent_process_id)
    first, second = _generate_vbd_trajectory_depth_validation_pair(slot)
    first_prepared = tuple(
        prepare_vbd_trajectory_lane(first.panel, lane)
        for lane in VBD_TRAJECTORY_LANES
    )
    second_prepared = tuple(
        prepare_vbd_trajectory_lane(second.panel, lane)
        for lane in VBD_TRAJECTORY_LANES
    )
    if tuple(item.prepared_input_hash for item in first_prepared) != tuple(
        item.prepared_input_hash for item in second_prepared
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "Depth context changed a prepared numerical input"
        )
    first_fits_list = []
    second_fits_list = []
    for item in first_prepared:
        _require_launch_parent(expected_parent_process_id)
        first_fits_list.append(fit_vbd_trajectory_state_space(item, first.panel))
        _require_launch_parent(expected_parent_process_id)
    for item in second_prepared:
        _require_launch_parent(expected_parent_process_id)
        second_fits_list.append(fit_vbd_trajectory_state_space(item, second.panel))
        _require_launch_parent(expected_parent_process_id)
    first_fits = tuple(first_fits_list)
    second_fits = tuple(second_fits_list)
    if tuple(item.fit_summary_hash() for item in first_fits) != tuple(
        item.fit_summary_hash() for item in second_fits
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "Depth context changed a deterministic fit"
        )
    lane_results = tuple(
        _lane_result(
            slot=slot,
            lane_index=index,
            prepared=first_prepared[index],
            fit=first_fits[index],
        )
        for index in range(3)
    )
    if any(result.internal_false_movement for result in lane_results):
        raise VbdTrajectoryValidationWorkspaceError(
            "Depth perturbation produced false terminal movement"
        )
    return build_vbd_trajectory_slot_result(
        slot=slot,
        row_state="FIT_COMPLETE",
        failure_stage="none",
        failure_code="none",
        fit_attempted=True,
        lane_results=lane_results,
    )


def _execute_slot(
    slot, expected_parent_process_id: int
) -> VbdTrajectorySlotResult:
    _require_launch_parent(expected_parent_process_id)
    if slot.scenario_or_control_id == "depth_context_perturbation":
        return _execute_depth_perturbation(slot, expected_parent_process_id)
    if slot.fit_expected:
        case = generate_vbd_trajectory_validation_case(slot)
        return _fit_generated_case(slot, case, expected_parent_process_id)
    from .vbd_trajectory_validation_controls import (
        _VBD_TRAJECTORY_CONTROL_RUNNER_TOKEN,
        execute_vbd_trajectory_control_slot,
    )

    result = execute_vbd_trajectory_control_slot(
        slot, _token=_VBD_TRAJECTORY_CONTROL_RUNNER_TOKEN
    )
    _require_launch_parent(expected_parent_process_id)
    return result


def execute_vbd_trajectory_child(value: object) -> dict:
    """Execute exactly one compiled slot and emit one canonical envelope."""

    started_at = _utc_now()
    process_token = secrets.token_hex(32)
    receipt, slot_index = _validate_child_receipt(value)
    capability = _read_launch_capability(receipt)
    _, _, runtime = _verify_child_source_identity(receipt)
    _start_parent_liveness_watchdog(receipt)
    with _validation_generation_context(
        capability_hash=capability["capability_hash"],
        capability_token_hash=receipt["capability_token_hash"],
        launch_receipt_hash=receipt["launch_receipt_hash"],
        _runner_token=_VALIDATION_GENERATION_RUNNER_TOKEN,
    ):
        result = _execute_slot(
            required_vbd_trajectory_validation_slots()[slot_index],
            receipt["parent_process_id"],
        )
    _require_launch_parent(receipt["parent_process_id"])
    prepared_hashes = [
        lane.prepared_input_hash for lane in result.lane_results
    ]
    process_identity = {
        "process_token": process_token,
        "process_id": os.getpid(),
        "parent_process_id": os.getppid(),
        "process_started_at": started_at,
    }
    executable_sha256 = _file_sha256(Path(sys.executable).resolve())
    attestation_body = {
        "attestation_version": "fresh_process_v1",
        "execution_kind": receipt["execution_kind"],
        "phase": receipt["phase"],
        "phase_hash": receipt["phase_hash"],
        "phase_token": receipt["phase_token"],
        "workspace_hash": receipt["workspace_hash"],
        "slot_index": receipt["slot_index"],
        "slot_id": receipt["slot_id"],
        "slot_hash": receipt["slot_hash"],
        "plan_hash": receipt["plan_hash"],
        "freeze_commit": receipt["freeze_commit"],
        "freeze_manifest_hash": receipt["freeze_manifest_hash"],
        "implementation_hash": receipt["implementation_hash"],
        "runtime_identity_hash": receipt["runtime_identity_hash"],
        "command_id": receipt["command_id"],
        "command_hash": receipt["command_hash"],
        "launch_receipt_hash": receipt["launch_receipt_hash"],
        "process_token": process_token,
        "process_id": os.getpid(),
        "parent_process_id": os.getppid(),
        "process_started_at": started_at,
        "process_completed_at": _utc_now(),
        "process_start_identity_hash": sha256_json(process_identity),
        "executable_sha256": executable_sha256,
        "native_library_identity_hash": sha256_json(runtime["native_libraries"]),
        "prepared_input_hashes_hash": sha256_json(prepared_hashes),
        "semantic_result_hash": result.semantic_result_hash,
        "workspace_path_received": False,
        "prior_phase_inputs_received": False,
        "prior_phase_inputs_read": False,
        "result_arrays_emitted": False,
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }
    attestation = {
        **attestation_body,
        "attestation_hash": sha256_json(attestation_body),
    }
    body = {
        "schema_version": VBD_TRAJECTORY_CHILD_OUTPUT_SCHEMA_VERSION,
        "slot_result": result.to_dict(),
        "execution_attestation": attestation,
    }
    return {**body, "child_output_hash": sha256_json(body)}
