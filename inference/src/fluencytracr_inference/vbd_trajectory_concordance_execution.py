"""Fresh-process execution for one frozen VBD concordance bundle."""

from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import os
import secrets

from .hashing import sha256_json
from .vbd_trajectory_concordance import (
    VbdTrajectoryConcordanceError,
    evaluate_vbd_trajectory_quantity_concordance,
    vbd_trajectory_concordance_bundle_from_dict,
    vbd_trajectory_concordance_plan,
)
from .vbd_trajectory_nuts import (
    TrajectoryNutsError,
    _VBD_TRAJECTORY_CONCORDANCE_RUNNER_TOKEN,
    build_vbd_trajectory_nuts_concordance_binding,
    fit_vbd_trajectory_nuts_reference,
)
from .vbd_trajectory_preparation import (
    TrajectoryPreparationError,
    prepare_vbd_trajectory_lane,
)
from .vbd_trajectory_state_space import (
    TrajectoryIntegrationError,
    fit_vbd_trajectory_state_space,
)
from .vbd_trajectory_statistics import TrajectoryStatisticsError
from .vbd_trajectory_synthetic import (
    VbdSyntheticRunnerError,
    _CONCORDANCE_GENERATION_RUNNER_TOKEN,
    _concordance_generation_context,
    generate_vbd_trajectory_concordance_case,
)
from .vbd_trajectory_types import (
    VBD_TRAJECTORY_LANES,
    TrajectoryCovarianceError,
    TrajectoryStructureError,
)
from .vbd_trajectory_validation_execution import (
    _read_launch_capability,
    _start_parent_liveness_watchdog,
)
from .vbd_trajectory_validation_resumable import (
    VBD_TRAJECTORY_FREEZE_MANIFEST_RELATIVE_PATH,
    VbdTrajectoryValidationWorkspaceError,
    _repo_root,
    _strict_timestamp,
    _validate_freeze_manifest,
    _verify_current_freeze,
    build_vbd_trajectory_runtime_identity,
    read_strict_json,
    vbd_trajectory_runner_implementation_manifest,
)


VBD_TRAJECTORY_CONCORDANCE_CHILD_OUTPUT_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_CONCORDANCE_CHILD_OUTPUT_2026_07_V1"
)
VBD_TRAJECTORY_CONCORDANCE_LAUNCH_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_CONCORDANCE_LAUNCH_2026_07_V1"
)
VBD_TRAJECTORY_CONCORDANCE_ATTESTATION_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_CONCORDANCE_ATTESTATION_2026_07_V1"
)
VBD_TRAJECTORY_CONCORDANCE_CHILD_FAILURE_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_CONCORDANCE_CHILD_FAILURE_2026_07_V1"
)
VBD_TRAJECTORY_CONCORDANCE_CHILD_FAILURE_PHASES = (
    "child_entrypoint",
    "stdin_decode",
    "launch_receipt_validation",
    "launch_capability_validation",
    "source_identity_validation",
    "parent_watchdog_start",
    "synthetic_generation",
    "synthetic_regeneration_check",
    "lane_preparation",
    "deterministic_fit",
    "nuts_binding",
    "nuts_fit",
    "concordance_evaluation",
    "result_assembly",
    "result_emit",
)
VBD_TRAJECTORY_CONCORDANCE_CHILD_EXCEPTION_TYPES = (
    "AssertionError",
    "AttributeError",
    "FileNotFoundError",
    "FloatingPointError",
    "ImportError",
    "IndexError",
    "KeyError",
    "MemoryError",
    "ModuleNotFoundError",
    "NotImplementedError",
    "OSError",
    "OverflowError",
    "RuntimeError",
    "TrajectoryCovarianceError",
    "TrajectoryIntegrationError",
    "TrajectoryNutsError",
    "TrajectoryPreparationError",
    "TrajectoryStatisticsError",
    "TrajectoryStructureError",
    "TypeError",
    "UNCLASSIFIED_EXCEPTION",
    "ValueError",
    "VbdSyntheticRunnerError",
    "VbdTrajectoryConcordanceError",
    "VbdTrajectoryValidationWorkspaceError",
)
_CHILD_FAILURE_PHASE_ATTRIBUTE = "_ft_vbd_concordance_failure_phase"
_CHILD_EXCEPTION_TYPE_LABELS = {
    AssertionError: "AssertionError",
    AttributeError: "AttributeError",
    FileNotFoundError: "FileNotFoundError",
    FloatingPointError: "FloatingPointError",
    ImportError: "ImportError",
    IndexError: "IndexError",
    KeyError: "KeyError",
    MemoryError: "MemoryError",
    ModuleNotFoundError: "ModuleNotFoundError",
    NotImplementedError: "NotImplementedError",
    OSError: "OSError",
    OverflowError: "OverflowError",
    RuntimeError: "RuntimeError",
    TrajectoryCovarianceError: "TrajectoryCovarianceError",
    TrajectoryIntegrationError: "TrajectoryIntegrationError",
    TrajectoryNutsError: "TrajectoryNutsError",
    TrajectoryPreparationError: "TrajectoryPreparationError",
    TrajectoryStatisticsError: "TrajectoryStatisticsError",
    TrajectoryStructureError: "TrajectoryStructureError",
    TypeError: "TypeError",
    ValueError: "ValueError",
    VbdSyntheticRunnerError: "VbdSyntheticRunnerError",
    VbdTrajectoryConcordanceError: "VbdTrajectoryConcordanceError",
    VbdTrajectoryValidationWorkspaceError: "VbdTrajectoryValidationWorkspaceError",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _strict_hash(value: object, name: str) -> str:
    if (
        type(value) is not str
        or len(value) != 64
        or any(character not in "0123456789abcdef" for character in value)
    ):
        raise VbdTrajectoryValidationWorkspaceError(f"{name} is invalid")
    return value


def _tag_child_failure_phase(exc: Exception, phase: str) -> None:
    if phase not in VBD_TRAJECTORY_CONCORDANCE_CHILD_FAILURE_PHASES:
        phase = "child_entrypoint"
    try:
        setattr(exc, _CHILD_FAILURE_PHASE_ATTRIBUTE, phase)
    except Exception:
        pass


def build_vbd_trajectory_concordance_child_failure(exc: Exception) -> dict:
    """Build a fixed, message-free diagnostic for the private child."""

    phase = getattr(exc, _CHILD_FAILURE_PHASE_ATTRIBUTE, "child_entrypoint")
    if phase not in VBD_TRAJECTORY_CONCORDANCE_CHILD_FAILURE_PHASES:
        phase = "child_entrypoint"
    body = {
        "schema_version": VBD_TRAJECTORY_CONCORDANCE_CHILD_FAILURE_SCHEMA_VERSION,
        "failure_phase": phase,
        "exception_type": _CHILD_EXCEPTION_TYPE_LABELS.get(
            type(exc), "UNCLASSIFIED_EXCEPTION"
        ),
    }
    return {**body, "diagnostic_hash": sha256_json(body)}


def validate_vbd_trajectory_concordance_child_failure(value: object) -> dict:
    expected = {
        "schema_version",
        "failure_phase",
        "exception_type",
        "diagnostic_hash",
    }
    if type(value) is not dict or set(value) != expected:
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance child failure diagnostic shape is invalid"
        )
    body = {key: item for key, item in value.items() if key != "diagnostic_hash"}
    if (
        value["schema_version"]
        != VBD_TRAJECTORY_CONCORDANCE_CHILD_FAILURE_SCHEMA_VERSION
        or value["failure_phase"]
        not in VBD_TRAJECTORY_CONCORDANCE_CHILD_FAILURE_PHASES
        or value["exception_type"]
        not in VBD_TRAJECTORY_CONCORDANCE_CHILD_EXCEPTION_TYPES
        or value["diagnostic_hash"] != sha256_json(body)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance child failure diagnostic is invalid"
        )
    _strict_hash(value["diagnostic_hash"], "concordance child diagnostic hash")
    return value


def _validate_launch_receipt(value: object) -> tuple[dict, object]:
    expected = {
        "schema_version",
        "phase",
        "phase_hash",
        "phase_token",
        "workspace_hash",
        "bundle_index",
        "bundle",
        "lane_ordinal",
        "lane",
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
            "concordance launch receipt shape is invalid"
        )
    body = {key: item for key, item in value.items() if key != "launch_receipt_hash"}
    bundle = vbd_trajectory_concordance_bundle_from_dict(value["bundle"])
    bundles = vbd_trajectory_concordance_plan()["bundles"]
    expected_lane_ordinal = value["lane_ordinal"]
    expected_lane = value["lane"]
    lane_binding_valid = (
        expected_lane_ordinal is None and expected_lane is None
        if value["phase"] == "primary"
        else type(expected_lane_ordinal) is int
        and 0 <= expected_lane_ordinal < 3
        and expected_lane == VBD_TRAJECTORY_LANES[expected_lane_ordinal]
    )
    if (
        value["schema_version"]
        != VBD_TRAJECTORY_CONCORDANCE_LAUNCH_SCHEMA_VERSION
        or value["phase"] not in ("primary", "recomputation")
        or type(value["bundle_index"]) is not int
        or not 0 <= value["bundle_index"] < len(bundles)
        or bundles[value["bundle_index"]] != bundle.to_dict()
        or not lane_binding_valid
        or value["plan_hash"] != vbd_trajectory_concordance_plan()["plan_hash"]
        or value["command_id"] != "vbd_trajectory_concordance_child"
        or type(value["parent_process_id"]) is not int
        or value["parent_process_id"] <= 0
        or value["result_present"] is not False
        or value["internal_only"] is not True
        or value["synthetic_only"] is not True
        or value["customer_output_authorized"] is not False
        or value["launch_receipt_hash"] != sha256_json(body)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance launch receipt is invalid"
        )
    for key in (
        "phase_hash",
        "phase_token",
        "workspace_hash",
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
        _strict_hash(value[key], key)
    if (
        type(value["freeze_commit"]) is not str
        or len(value["freeze_commit"]) != 40
        or any(
            character not in "0123456789abcdef"
            for character in value["freeze_commit"]
        )
        or _strict_timestamp(value["created_at"], "launch created_at")
        != value["created_at"]
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance launch source or time is invalid"
        )
    return value, bundle


def _truth_receipt_hash(case) -> str:
    truth = case.truth
    return sha256_json(
        {
            "scenario_id": truth.scenario_id,
            "seed": truth.seed,
            "requested_terminal_truth": list(truth.requested_terminal_truth),
            "direction_vector": list(truth.direction_vector),
            "direction_adjusted_truth": list(truth.direction_adjusted_truth),
            "post_pattern": truth.post_pattern,
            "shock_kind": truth.shock_kind,
            "latent_paths_sha256": hashlib.sha256(
                truth.transformed_latent_paths.tobytes(order="C")
            ).hexdigest(),
            "group_effects_sha256": hashlib.sha256(
                truth.working_group_effects.tobytes(order="C")
            ).hexdigest(),
            "ar1_states_sha256": hashlib.sha256(
                truth.working_ar1_states.tobytes(order="C")
            ).hexdigest(),
        }
    )


def _require_parent(parent_process_id: int) -> None:
    if os.getppid() != parent_process_id:
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance child lost its launch parent"
        )


def _deterministic_record(prepared, fit, process_phase_binding_hash: str) -> dict:
    semantic_body = {
        "lane": prepared.lane,
        "prepared_input_hash": prepared.prepared_input_hash,
        "model_input_hash": prepared.model_input_hash,
        "context_binding_hash": prepared.context_binding_hash,
        "fit": fit.to_dict(),
    }
    body = {
        **semantic_body,
        "fit_semantic_hash": sha256_json(semantic_body),
        "process_phase_binding_hash": process_phase_binding_hash,
    }
    return {**body, "record_hash": sha256_json(body)}


def _verify_concordance_child_source_identity(receipt: dict):
    if os.environ.get("FT_VBD_TRAJECTORY_CHILD") != "1":
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance execution is restricted to the fresh child path"
        )
    if os.getppid() != receipt["parent_process_id"]:
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance child is detached from its launch parent"
        )
    freeze = _validate_freeze_manifest(
        read_strict_json(
            _repo_root() / VBD_TRAJECTORY_FREEZE_MANIFEST_RELATIVE_PATH
        )
    )
    identity = _verify_current_freeze(freeze)
    implementation = vbd_trajectory_runner_implementation_manifest()
    runtime = build_vbd_trajectory_runtime_identity()
    for key in (
        "freeze_commit",
        "freeze_manifest_hash",
        "implementation_hash",
        "runtime_identity_hash",
    ):
        if receipt[key] != identity[key]:
            raise VbdTrajectoryValidationWorkspaceError(
                "concordance child differs from frozen execution identity"
            )
    if receipt["plan_hash"] != freeze["concordance_plan_hash"]:
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance child plan differs from the frozen plan"
        )
    if (
        runtime["executable_sha256"] != receipt["executable_sha256"]
        or sha256_json(runtime["native_libraries"])
        != receipt["native_library_identity_hash"]
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance child runtime binary identity drifted"
        )
    return identity, implementation, runtime


def _nuts_record(prepared, fit, process_phase_binding_hash: str) -> dict:
    body = {
        "lane": prepared.lane,
        "prepared_input_hash": prepared.prepared_input_hash,
        "model_input_hash": prepared.model_input_hash,
        "context_binding_hash": prepared.context_binding_hash,
        "process_phase_binding_hash": process_phase_binding_hash,
        "fit": fit.to_dict(),
    }
    return {**body, "record_hash": sha256_json(body)}


def _execute_vbd_trajectory_concordance_child(
    receipt_value: object, phase_tracker: list[str]
) -> dict:
    phase_tracker[0] = "launch_receipt_validation"
    receipt, bundle = _validate_launch_receipt(receipt_value)
    phase_tracker[0] = "launch_capability_validation"
    capability = _read_launch_capability(receipt)
    phase_tracker[0] = "source_identity_validation"
    identity, _implementation, runtime = _verify_concordance_child_source_identity(
        receipt
    )
    phase_tracker[0] = "parent_watchdog_start"
    _start_parent_liveness_watchdog(receipt)
    started_at = _now()
    process_token = secrets.token_hex(32)
    parent_process_id = receipt["parent_process_id"]
    _require_parent(parent_process_id)
    process_phase_binding_body = {
        "phase": receipt["phase"],
        "phase_hash": receipt["phase_hash"],
        "phase_token": receipt["phase_token"],
        "bundle_hash": bundle.bundle_hash,
        "lane_ordinal": receipt["lane_ordinal"],
        "lane": receipt["lane"],
        "process_token": process_token,
        "process_id": os.getpid(),
        "parent_process_id": parent_process_id,
        "process_started_at": started_at,
    }
    process_phase_binding_hash = sha256_json(process_phase_binding_body)
    phase_tracker[0] = "synthetic_generation"
    with _concordance_generation_context(
        capability_hash=capability["capability_hash"],
        capability_token_hash=receipt["capability_token_hash"],
        launch_receipt_hash=receipt["launch_receipt_hash"],
        _runner_token=_CONCORDANCE_GENERATION_RUNNER_TOKEN,
    ):
        case = generate_vbd_trajectory_concordance_case(bundle)
        regenerated = generate_vbd_trajectory_concordance_case(bundle)
    phase_tracker[0] = "synthetic_regeneration_check"
    if (
        case.panel.ordered_panel_manifest_root
        != regenerated.panel.ordered_panel_manifest_root
        or case.panel.lane_observation_roots
        != regenerated.panel.lane_observation_roots
        or case.panel.seed_manifest_root != regenerated.panel.seed_manifest_root
        or _truth_receipt_hash(case) != _truth_receipt_hash(regenerated)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance generator failed exact pre-fit regeneration"
        )
    _require_parent(parent_process_id)
    phase_tracker[0] = "lane_preparation"
    prepared = tuple(
        prepare_vbd_trajectory_lane(case.panel, lane)
        for lane in VBD_TRAJECTORY_LANES
    )
    selected_ordinals = (
        range(3)
        if receipt["phase"] == "primary"
        else (receipt["lane_ordinal"],)
    )
    phase_tracker[0] = "deterministic_fit"
    deterministic_fits = {}
    for lane_ordinal in selected_ordinals:
        item = prepared[lane_ordinal]
        _require_parent(parent_process_id)
        deterministic_fits[lane_ordinal] = fit_vbd_trajectory_state_space(
            item, case.panel
        )
    deterministic_records = tuple(
        _deterministic_record(
            prepared[index],
            deterministic_fits[index],
            process_phase_binding_hash,
        )
        for index in selected_ordinals
    )
    deterministic_semantic_hash = sha256_json(
        {
            "bundle_hash": bundle.bundle_hash,
            "ordered_panel_manifest_root": case.panel.ordered_panel_manifest_root,
            "truth_receipt_hash": _truth_receipt_hash(case),
            "records": [
                {
                    key: value
                    for key, value in record.items()
                    if key not in ("process_phase_binding_hash", "record_hash")
                }
                for record in deterministic_records
            ],
        }
    )
    nuts_records = ()
    concordance_records = ()
    failures: list[str] = []
    if receipt["phase"] == "primary":
        reference_fits = []
        plan_hash = vbd_trajectory_concordance_plan()["plan_hash"]
        for lane_ordinal, item in enumerate(prepared):
            _require_parent(parent_process_id)
            phase_tracker[0] = "nuts_binding"
            binding = build_vbd_trajectory_nuts_concordance_binding(
                bundle_id=bundle.bundle_id,
                bundle_seed=bundle.bundle_seed,
                cell_ordinal=bundle.cell_ordinal,
                seed_index=bundle.seed_index,
                lane=item.lane,
                lane_ordinal=lane_ordinal,
                plan_hash=plan_hash,
            )
            phase_tracker[0] = "nuts_fit"
            reference_fits.append(
                fit_vbd_trajectory_nuts_reference(
                    item,
                    case.panel,
                    chain_seeds=binding.chain_seeds,
                    ppc_seed=binding.ppc_seed,
                    mode="full",
                    concordance_binding=binding,
                    _runner_token=_VBD_TRAJECTORY_CONCORDANCE_RUNNER_TOKEN,
                )
            )
        nuts_records = tuple(
            _nuts_record(
                prepared[index],
                reference_fits[index],
                process_phase_binding_hash,
            )
            for index in range(3)
        )
        phase_tracker[0] = "concordance_evaluation"
        concordance_records = tuple(
            {
                "lane": VBD_TRAJECTORY_LANES[index],
                **evaluate_vbd_trajectory_quantity_concordance(
                    deterministic_fits[index].movement_summary,
                    reference_fits[index].movement_summary,
                ),
            }
            for index in range(3)
        )
        for fit in reference_fits:
            failures.extend(fit.sampler_diagnostics.failing_diagnostics)
            if not all(check.passed for check in fit.posterior_predictive_checks):
                failures.append("posterior_predictive_check")
        if not all(record["passed"] for record in concordance_records):
            failures.append("cross_engine_concordance")
    phase_tracker[0] = "result_assembly"
    failures = list(dict.fromkeys(failures))
    result_body = {
        "schema_version": VBD_TRAJECTORY_CONCORDANCE_CHILD_OUTPUT_SCHEMA_VERSION,
        "phase": receipt["phase"],
        "bundle_index": receipt["bundle_index"],
        "bundle": bundle.to_dict(),
        "lane_ordinal": receipt["lane_ordinal"],
        "lane": receipt["lane"],
        "plan_hash": receipt["plan_hash"],
        "freeze_commit": identity["freeze_commit"],
        "freeze_manifest_hash": identity["freeze_manifest_hash"],
        "ordered_panel_manifest_root": case.panel.ordered_panel_manifest_root,
        "lane_observation_roots_hash": sha256_json(
            [list(item) for item in case.panel.lane_observation_roots]
        ),
        "truth_receipt_hash": _truth_receipt_hash(case),
        "deterministic_records": list(deterministic_records),
        "deterministic_semantic_hash": deterministic_semantic_hash,
        "nuts_records": list(nuts_records),
        "concordance_records": list(concordance_records),
        "failing_checks": failures,
        "state": "PASS" if not failures else "HOLD",
        "raw_posterior_draws_emitted": False,
        "latent_paths_emitted": False,
        "posterior_predictive_replicates_emitted": False,
        "input_arrays_emitted": False,
        "internal_only": True,
        "synthetic_only": True,
        "aggregate_only": True,
        "customer_output_authorized": False,
        "acceptance_complete": False,
        "task_5_6_complete": False,
    }
    semantic_result_hash = sha256_json(result_body)
    completed_at = _now()
    attestation_body = {
        "attestation_version": VBD_TRAJECTORY_CONCORDANCE_ATTESTATION_VERSION,
        "phase": receipt["phase"],
        "phase_hash": receipt["phase_hash"],
        "phase_token": receipt["phase_token"],
        "workspace_hash": receipt["workspace_hash"],
        "bundle_index": receipt["bundle_index"],
        "bundle_hash": bundle.bundle_hash,
        "lane_ordinal": receipt["lane_ordinal"],
        "lane": receipt["lane"],
        "plan_hash": receipt["plan_hash"],
        "freeze_commit": identity["freeze_commit"],
        "freeze_manifest_hash": identity["freeze_manifest_hash"],
        "implementation_hash": identity["implementation_hash"],
        "runtime_identity_hash": identity["runtime_identity_hash"],
        "command_id": receipt["command_id"],
        "command_hash": receipt["command_hash"],
        "launch_receipt_hash": receipt["launch_receipt_hash"],
        "process_token": process_token,
        "process_phase_binding_hash": process_phase_binding_hash,
        "process_id": os.getpid(),
        "parent_process_id": parent_process_id,
        "process_started_at": started_at,
        "process_completed_at": completed_at,
        "executable_sha256": runtime["executable_sha256"],
        "native_library_identity_hash": sha256_json(runtime["native_libraries"]),
        "deterministic_semantic_hash": deterministic_semantic_hash,
        "semantic_result_hash": semantic_result_hash,
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
    output_body = {
        **result_body,
        "semantic_result_hash": semantic_result_hash,
        "execution_attestation": attestation,
    }
    return {**output_body, "child_output_hash": sha256_json(output_body)}


def execute_vbd_trajectory_concordance_child(receipt_value: object) -> dict:
    """Execute one primary/reference or fresh deterministic bundle phase."""

    phase_tracker = ["child_entrypoint"]
    try:
        return _execute_vbd_trajectory_concordance_child(
            receipt_value, phase_tracker
        )
    except Exception as exc:
        _tag_child_failure_phase(exc, phase_tracker[0])
        raise
