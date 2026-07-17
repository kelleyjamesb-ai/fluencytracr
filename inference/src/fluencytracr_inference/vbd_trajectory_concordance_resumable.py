"""Resumable, exact-slot workspace for frozen VBD NUTS concordance."""

from __future__ import annotations

from datetime import datetime
import hashlib
import math
import os
from pathlib import Path
import secrets
import subprocess
import sys
from typing import Callable

from .hashing import sha256_json
from .vbd_trajectory_concordance import (
    VBD_TRAJECTORY_CONCORDANCE_BUNDLE_COUNT,
    VBD_TRAJECTORY_CONCORDANCE_LANE_FIT_COUNT,
    evaluate_vbd_trajectory_quantity_concordance,
    required_vbd_trajectory_concordance_bundles,
    vbd_trajectory_concordance_bundle_from_dict,
    vbd_trajectory_concordance_plan,
)
from .vbd_trajectory_concordance_execution import (
    VBD_TRAJECTORY_CONCORDANCE_ATTESTATION_VERSION,
    VBD_TRAJECTORY_CONCORDANCE_CHILD_OUTPUT_SCHEMA_VERSION,
    VBD_TRAJECTORY_CONCORDANCE_LAUNCH_SCHEMA_VERSION,
    _truth_receipt_hash,
)
from .vbd_trajectory_nuts import (
    TrajectoryNutsError,
    TrajectoryNutsFit,
    TrajectoryNutsSettings,
    TrajectoryPpcResult,
    TrajectorySamplerDiagnostics,
    TrajectorySamplerParameterDiagnostic,
    build_vbd_trajectory_nuts_concordance_binding,
)
from .vbd_trajectory_state_space import (
    TrajectoryDeterministicFit,
    TrajectoryIntegrationError,
    TrajectoryIntegrationDiagnostics,
)
from .vbd_trajectory_statistics import TrajectoryPosteriorSummary
from .vbd_trajectory_validation_resumable import (
    VBD_TRAJECTORY_CONCORDANCE_RECEIPT_SCHEMA_VERSION,
    VBD_TRAJECTORY_FREEZE_MANIFEST_RELATIVE_PATH,
    VBD_TRAJECTORY_ATTEMPT_PERMIT_MODE,
    VBD_TRAJECTORY_RUNNER_THREAT_MODEL,
    VbdTrajectoryValidationWorkspaceError,
    _canonical_json_bytes,
    _child_environment,
    _cleanup_stale_atomic_temps,
    _create_or_load_attempt_anchor,
    _ensure_workspace_directories,
    _exclusive_lock,
    _file_sha256,
    _frozen_child_command,
    _frozen_source_bundle,
    _launch_capability,
    _load_attempt_anchor,
    _repo_root,
    _restore_attempt_anchored_launches,
    _safe_workspace_path,
    _strict_sha256,
    _strict_timestamp,
    _strict_token,
    _terminate_started_child,
    _utc_now,
    _validate_freeze_manifest,
    _validate_tree_links,
    _verify_current_freeze,
    _workspace_from_user_path,
    _attempt_anchor_root_binding,
    _attempt_permit_manifest_binding,
    _attempt_permit_plan_hash,
    _initialize_attempt_permit_manifest,
    _load_attempt_permit_manifest,
    _validate_attempt_anchor_root,
    _workspace_directory_bindings,
    _workspace_directory_entries,
    _workspace_entry_stat,
    _workspace_has_atomic_temps,
    _workspace_path_exists,
    _workspace_path_is_dir,
    _workspace_tree_entries,
    read_strict_json,
    write_json_create_once,
)


VBD_TRAJECTORY_CONCORDANCE_WORKSPACE_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_CONCORDANCE_WORKSPACE_2026_07_V3"
)
VBD_TRAJECTORY_CONCORDANCE_PHASE_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_CONCORDANCE_PHASE_2026_07_V1"
)
VBD_TRAJECTORY_CONCORDANCE_COMBINED_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_CONCORDANCE_COMBINED_2026_07_V1"
)
VBD_TRAJECTORY_CONCORDANCE_CHECKPOINT_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_CONCORDANCE_CHECKPOINT_2026_07_V1"
)
VBD_TRAJECTORY_CONCORDANCE_FAILURE_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_CONCORDANCE_FAILURE_2026_07_V1"
)
VBD_TRAJECTORY_CONCORDANCE_COMMIT_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_CONCORDANCE_COMMIT_2026_07_V1"
)
VBD_TRAJECTORY_CONCORDANCE_SUMMARY_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_CONCORDANCE_SUMMARY_2026_07_V1"
)
VBD_TRAJECTORY_CONCORDANCE_PHASES = ("primary", "recomputation")
VBD_TRAJECTORY_CONCORDANCE_CHILD_TIMEOUT_SECONDS = 7_200
_CHILD_STDOUT_LIMIT = 4 * 1024 * 1024
_CHILD_STDERR_LIMIT = 1024 * 1024
_VERIFIED_RECEIPT_TOKEN = object()
_CONCORDANCE_WORKSPACE_DIRECTORIES = (
    "primary",
    "primary/failures",
    "primary/launches",
    "primary/results",
    "recomputation",
    "recomputation/failures",
    "recomputation/launches",
    "recomputation/results",
)


def _concordance_attempt_stems() -> dict[str, set[str]]:
    return {
        "primary": {f"bundle_{index:02d}.json" for index in range(30)},
        "recomputation": {
            f"bundle_{index:02d}_lane_{lane_ordinal}.json"
            for index in range(30)
            for lane_ordinal in range(3)
        },
    }


def _workspace_location(workspace: Path) -> dict:
    opened = workspace.stat(follow_symlinks=False)
    return {
        "workspace_path_hash": sha256_json(str(workspace)),
        "workspace_device": opened.st_dev,
        "workspace_inode": opened.st_ino,
    }


def _workspace_body(workspace: Path, identity: dict) -> dict:
    plan = vbd_trajectory_concordance_plan()
    return {
        "schema_version": VBD_TRAJECTORY_CONCORDANCE_WORKSPACE_SCHEMA_VERSION,
        **identity,
        "concordance_plan_hash": plan["plan_hash"],
        **_workspace_location(workspace),
        **_attempt_anchor_root_binding(workspace, create=False),
        **_attempt_permit_manifest_binding(
            workspace, expected_stems=_concordance_attempt_stems()
        ),
        "workspace_directory_bindings": _workspace_directory_bindings(
            workspace, _CONCORDANCE_WORKSPACE_DIRECTORIES
        ),
        "created_at": _utc_now(),
        "workspace_token": secrets.token_hex(32),
        "phase_order": list(VBD_TRAJECTORY_CONCORDANCE_PHASES),
        "required_bundle_count": VBD_TRAJECTORY_CONCORDANCE_BUNDLE_COUNT,
        "required_lane_fit_count_per_engine": (
            VBD_TRAJECTORY_CONCORDANCE_LANE_FIT_COUNT
        ),
        "threat_model": VBD_TRAJECTORY_RUNNER_THREAT_MODEL,
        "internal_only": True,
        "synthetic_only": True,
        "aggregate_only": True,
        "customer_output_authorized": False,
        "acceptance_complete": False,
        "task_5_6_complete": False,
    }


def _validate_workspace(value: object, workspace: Path) -> dict:
    expected = {
        "schema_version",
        "freeze_commit",
        "freeze_manifest_hash",
        "candidate_source_commit",
        "candidate_source_tree",
        "implementation_hash",
        "runtime_identity_hash",
        "executable_sha256",
        "native_library_identity_hash",
        "plan_hash",
        "seed_manifest_hash",
        "concordance_plan_hash",
        "workspace_path_hash",
        "workspace_device",
        "workspace_inode",
        "attempt_anchor_root_path_hash",
        "attempt_anchor_root_device",
        "attempt_anchor_root_inode",
        "attempt_anchor_directory_bindings",
        "attempt_permit_mode",
        "attempt_permit_manifest_device",
        "attempt_permit_manifest_inode",
        "attempt_permit_manifest_hash",
        "attempt_permit_plan_hash",
        "attempt_permit_count",
        "workspace_directory_bindings",
        "created_at",
        "workspace_token",
        "phase_order",
        "required_bundle_count",
        "required_lane_fit_count_per_engine",
        "threat_model",
        "internal_only",
        "synthetic_only",
        "aggregate_only",
        "customer_output_authorized",
        "acceptance_complete",
        "task_5_6_complete",
        "workspace_hash",
    }
    if type(value) is not dict or set(value) != expected:
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance workspace shape is invalid"
        )
    body = {key: item for key, item in value.items() if key != "workspace_hash"}
    if (
        value["schema_version"]
        != VBD_TRAJECTORY_CONCORDANCE_WORKSPACE_SCHEMA_VERSION
        or value["concordance_plan_hash"]
        != vbd_trajectory_concordance_plan()["plan_hash"]
        or value["phase_order"] != list(VBD_TRAJECTORY_CONCORDANCE_PHASES)
        or value["required_bundle_count"] != 30
        or value["required_lane_fit_count_per_engine"] != 90
        or value["threat_model"] != VBD_TRAJECTORY_RUNNER_THREAT_MODEL
        or value["internal_only"] is not True
        or value["synthetic_only"] is not True
        or value["aggregate_only"] is not True
        or value["customer_output_authorized"] is not False
        or value["acceptance_complete"] is not False
        or value["task_5_6_complete"] is not False
        or value["workspace_hash"] != sha256_json(body)
        or any(value[key] != item for key, item in _workspace_location(workspace).items())
        or value["workspace_directory_bindings"]
        != _workspace_directory_bindings(
            workspace, _CONCORDANCE_WORKSPACE_DIRECTORIES
        )
        or value["attempt_permit_mode"] != VBD_TRAJECTORY_ATTEMPT_PERMIT_MODE
        or type(value["attempt_permit_manifest_device"]) is not int
        or value["attempt_permit_manifest_device"] < 0
        or type(value["attempt_permit_manifest_inode"]) is not int
        or value["attempt_permit_manifest_inode"] <= 0
        or value["attempt_permit_manifest_hash"] != _load_attempt_permit_manifest(
            workspace,
            value,
            expected_stems=_concordance_attempt_stems(),
        )["manifest_hash"]
        or value["attempt_permit_plan_hash"]
        != _attempt_permit_plan_hash(_concordance_attempt_stems())
        or value["attempt_permit_count"] != 120
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance workspace is invalid"
        )
    for key in (
        "freeze_manifest_hash",
        "implementation_hash",
        "runtime_identity_hash",
        "executable_sha256",
        "native_library_identity_hash",
        "plan_hash",
        "seed_manifest_hash",
        "concordance_plan_hash",
        "workspace_path_hash",
        "attempt_permit_manifest_hash",
        "attempt_permit_plan_hash",
        "workspace_token",
        "workspace_hash",
    ):
        _strict_sha256(value[key], key)
    _strict_timestamp(value["created_at"], "workspace created_at")
    _validate_attempt_anchor_root(workspace, value)
    if (
        type(value["workspace_directory_bindings"]) is not list
        or [
            item.get("path") if type(item) is dict else None
            for item in value["workspace_directory_bindings"]
        ]
        != list(_CONCORDANCE_WORKSPACE_DIRECTORIES)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance workspace directory bindings are invalid"
        )
    return value


def _phase_record(phase: str, workspace_record: dict) -> dict:
    if phase not in VBD_TRAJECTORY_CONCORDANCE_PHASES:
        raise ValueError("concordance phase is invalid")
    body = {
        "schema_version": VBD_TRAJECTORY_CONCORDANCE_PHASE_SCHEMA_VERSION,
        "phase": phase,
        "workspace_hash": workspace_record["workspace_hash"],
        "freeze_commit": workspace_record["freeze_commit"],
        "freeze_manifest_hash": workspace_record["freeze_manifest_hash"],
        "plan_hash": workspace_record["concordance_plan_hash"],
        "phase_token": secrets.token_hex(32),
        "created_at": _utc_now(),
        "required_bundle_count": 30,
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }
    return {**body, "phase_hash": sha256_json(body)}


def _validate_phase(value: object, phase: str, workspace_record: dict) -> dict:
    expected = {
        "schema_version",
        "phase",
        "workspace_hash",
        "freeze_commit",
        "freeze_manifest_hash",
        "plan_hash",
        "phase_token",
        "created_at",
        "required_bundle_count",
        "internal_only",
        "synthetic_only",
        "customer_output_authorized",
        "phase_hash",
    }
    if type(value) is not dict or set(value) != expected:
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance phase shape is invalid"
        )
    body = {key: item for key, item in value.items() if key != "phase_hash"}
    if (
        value["schema_version"] != VBD_TRAJECTORY_CONCORDANCE_PHASE_SCHEMA_VERSION
        or value["phase"] != phase
        or value["workspace_hash"] != workspace_record["workspace_hash"]
        or value["freeze_commit"] != workspace_record["freeze_commit"]
        or value["freeze_manifest_hash"]
        != workspace_record["freeze_manifest_hash"]
        or value["plan_hash"] != workspace_record["concordance_plan_hash"]
        or value["required_bundle_count"] != 30
        or value["internal_only"] is not True
        or value["synthetic_only"] is not True
        or value["customer_output_authorized"] is not False
        or value["phase_hash"] != sha256_json(body)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance phase is invalid"
        )
    _strict_token(value["phase_token"], "phase token")
    _strict_timestamp(value["created_at"], "phase created_at")
    return value


def initialize_vbd_trajectory_concordance_workspace(
    workspace_dir: str | Path,
) -> Path:
    workspace = _workspace_from_user_path(workspace_dir)
    workspace.mkdir(parents=True, exist_ok=True)
    with _exclusive_lock(_safe_workspace_path(workspace, ".runner.lock")) as verify:
        verify()
        _cleanup_stale_atomic_temps(workspace)
        _validate_tree_links(workspace)
        _ensure_workspace_directories(
            workspace, _CONCORDANCE_WORKSPACE_DIRECTORIES
        )
        _attempt_anchor_root_binding(workspace, create=True)
        _initialize_attempt_permit_manifest(
            workspace, _concordance_attempt_stems()
        )
        manifest_path = _repo_root() / VBD_TRAJECTORY_FREEZE_MANIFEST_RELATIVE_PATH
        freeze = _validate_freeze_manifest(read_strict_json(manifest_path))
        identity = _verify_current_freeze(freeze)
        plan = vbd_trajectory_concordance_plan()
        records = (
            ("freeze_manifest.json", freeze),
            ("plan.json", plan),
        )
        for filename, value in records:
            path = _safe_workspace_path(workspace, filename)
            if _workspace_path_exists(path) and read_strict_json(path) != value:
                raise VbdTrajectoryValidationWorkspaceError(
                    f"concordance {filename} differs from frozen inputs"
                )
            if not _workspace_path_exists(path):
                write_json_create_once(path, value, lock_verifier=verify)
        workspace_path = _safe_workspace_path(workspace, "workspace.json")
        if _workspace_path_exists(workspace_path):
            existing = _validate_workspace(read_strict_json(workspace_path), workspace)
            for key, item in identity.items():
                if existing[key] != item:
                    raise VbdTrajectoryValidationWorkspaceError(
                        "concordance workspace differs from current freeze"
                    )
        else:
            body = _workspace_body(workspace, identity)
            write_json_create_once(
                workspace_path,
                {**body, "workspace_hash": sha256_json(body)},
                lock_verifier=verify,
            )
        record = _validate_workspace(read_strict_json(workspace_path), workspace)
        for phase in VBD_TRAJECTORY_CONCORDANCE_PHASES:
            phase_path = _safe_workspace_path(workspace, phase, "phase.json")
            if not _workspace_path_exists(phase_path):
                write_json_create_once(
                    phase_path,
                    _phase_record(phase, record),
                    lock_verifier=verify,
                )
            _validate_phase(read_strict_json(phase_path), phase, record)
        _validate_workspace_tree(workspace, complete=False)
        verify()
    return workspace


def _load_workspace(
    workspace_dir: str | Path,
    *,
    verify_lock_identity,
    restore_launches: bool = True,
) -> tuple[Path, dict, dict, dict]:
    workspace = _workspace_from_user_path(workspace_dir)
    if not workspace.is_dir():
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance workspace does not exist"
        )
    record = _validate_workspace(
        read_strict_json(_safe_workspace_path(workspace, "workspace.json")),
        workspace,
    )
    freeze = _validate_freeze_manifest(
        read_strict_json(_safe_workspace_path(workspace, "freeze_manifest.json"))
    )
    identity = _verify_current_freeze(freeze)
    if any(record[key] != item for key, item in identity.items()):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance workspace source identity drifted"
        )
    if read_strict_json(_safe_workspace_path(workspace, "plan.json")) != (
        vbd_trajectory_concordance_plan()
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance workspace plan drifted"
        )
    primary = _validate_phase(
        read_strict_json(_safe_workspace_path(workspace, "primary", "phase.json")),
        "primary",
        record,
    )
    recomputation = _validate_phase(
        read_strict_json(
            _safe_workspace_path(workspace, "recomputation", "phase.json")
        ),
        "recomputation",
        record,
    )
    if primary["phase_token"] == recomputation["phase_token"]:
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance phase tokens must be disjoint"
        )
    if restore_launches:
        _restore_attempt_anchored_launches(
            workspace=workspace,
            workspace_record=record,
            phase_launch_directories={
                "primary": workspace / "primary" / "launches",
                "recomputation": workspace / "recomputation" / "launches",
            },
            expected_stems={
                "primary": _expected_phase_stems("primary"),
                "recomputation": _expected_phase_stems("recomputation"),
            },
            verify_lock_identity=verify_lock_identity,
        )
    _validate_tree_links(workspace)
    _validate_workspace_tree(workspace, complete=False)
    return workspace, record, primary, recomputation


def _expected_phase_stems(phase: str) -> set[str]:
    try:
        return _concordance_attempt_stems()[phase]
    except KeyError as exc:
        raise ValueError("concordance phase is invalid") from exc


def _validate_workspace_tree(workspace: Path, *, complete: bool) -> None:
    if _workspace_has_atomic_temps(workspace):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance workspace contains a stale atomic temporary"
        )
    allowed_root = {
        ".runner.lock",
        "workspace.json",
        "plan.json",
        "freeze_manifest.json",
        "combined.json",
        "concordance_receipt.json",
        "concordance_summary.json",
        "combined_commit.json",
    }
    allowed_directories = {
        tuple(relative.split("/"))
        for relative in _CONCORDANCE_WORKSPACE_DIRECTORIES
    }
    for kind, relative in sorted(_workspace_tree_entries(workspace)):
        parts = tuple(relative.split("/"))
        if kind == "dir":
            if parts not in allowed_directories:
                raise VbdTrajectoryValidationWorkspaceError(
                    "concordance workspace contains an off-plan directory"
                )
            continue
        if kind != "file":
            raise VbdTrajectoryValidationWorkspaceError(
                "concordance workspace contains a special entry"
            )
        if len(parts) == 1:
            if parts[0] not in allowed_root:
                raise VbdTrajectoryValidationWorkspaceError(
                    "concordance workspace contains an off-plan root file"
                )
            continue
        if len(parts) == 2 and parts[0] in VBD_TRAJECTORY_CONCORDANCE_PHASES:
            if parts[1] != "phase.json":
                raise VbdTrajectoryValidationWorkspaceError(
                    "concordance workspace contains an off-plan phase file"
                )
            continue
        if (
            len(parts) != 3
            or parts[0] not in VBD_TRAJECTORY_CONCORDANCE_PHASES
            or parts[1] not in ("launches", "results", "failures")
            or parts[2] not in _expected_phase_stems(parts[0])
        ):
            raise VbdTrajectoryValidationWorkspaceError(
                "concordance workspace contains off-plan execution evidence"
            )
    publication = [
        _workspace_path_exists(workspace / name)
        for name in (
            "combined.json",
            "concordance_receipt.json",
            "concordance_summary.json",
            "combined_commit.json",
        )
    ]
    if publication not in (
        [False, False, False, False],
        [True, False, False, False],
        [True, True, False, False],
        [True, True, True, False],
        [True, True, True, True],
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance publication order is invalid"
        )
    for phase in VBD_TRAJECTORY_CONCORDANCE_PHASES:
        phase_names = {}
        for directory in ("launches", "results", "failures"):
            names = set()
            for name, kind in _workspace_directory_entries(
                workspace / phase / directory
            ):
                if kind != "file":
                    raise VbdTrajectoryValidationWorkspaceError(
                        "concordance phase directory contains a special entry"
                    )
                names.add(name)
            phase_names[directory] = names
        launches = phase_names["launches"]
        results = phase_names["results"]
        failures = phase_names["failures"]
        if launches:
            workspace_record = _validate_workspace(
                read_strict_json(
                    _safe_workspace_path(workspace, "workspace.json")
                ),
                workspace,
            )
            for name in launches:
                anchor = _load_attempt_anchor(
                    workspace=workspace,
                    workspace_record=workspace_record,
                    phase=phase,
                    stem=name,
                )
                launch_value = read_strict_json(
                    _safe_workspace_path(workspace, phase, "launches", name)
                )
                if anchor is None or anchor["launch_receipt"] != launch_value:
                    raise VbdTrajectoryValidationWorkspaceError(
                        "concordance launch differs from its external attempt anchor"
                    )
        if not results.issubset(launches) or not failures.issubset(launches):
            raise VbdTrajectoryValidationWorkspaceError(
                "concordance result or failure lacks a launch"
            )
        if results & failures:
            raise VbdTrajectoryValidationWorkspaceError(
                "concordance launch has both a result and failure"
            )
        if complete and (
            launches != _expected_phase_stems(phase)
            or results != _expected_phase_stems(phase)
            or failures
        ):
            raise VbdTrajectoryValidationWorkspaceError(
                "concordance complete workspace is missing exact results"
            )
    if complete and publication != [True, True, True, True]:
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance publication marker is incomplete"
        )


def _execution_evidence_snapshot(workspace: Path) -> dict:
    excluded = {
        ".runner.lock",
        "combined.json",
        "concordance_receipt.json",
        "concordance_summary.json",
        "combined_commit.json",
    }
    files = []
    for kind, relative in sorted(_workspace_tree_entries(workspace)):
        if kind == "dir":
            continue
        if kind != "file":
            raise VbdTrajectoryValidationWorkspaceError(
                "concordance evidence contains a special entry"
            )
        path = workspace / relative
        if relative in excluded:
            continue
        files.append({"path": relative, "sha256": _file_sha256(path)})
    body = {"files": files}
    return {**body, "snapshot_hash": sha256_json(body)}


def _child_command() -> tuple[str, ...]:
    return _frozen_child_command(
        "fluencytracr_inference.vbd_trajectory_concordance_cli",
        "_execute-bundle",
    )


def _child_command_hash() -> str:
    return sha256_json(
        {
            "command_id": "vbd_trajectory_concordance_child",
            "python_executable_sha256": _file_sha256(Path(sys.executable).resolve()),
            "argv_tail": list(_child_command()[1:]),
        }
    )


def _launch_receipt(
    *,
    phase: str,
    phase_record: dict,
    bundle_index: int,
    lane_ordinal: int | None,
    workspace_record: dict,
    capability_token_hash: str,
) -> dict:
    bundle = required_vbd_trajectory_concordance_bundles()[bundle_index]
    lane = None if lane_ordinal is None else ("frequency", "engagement", "breadth")[lane_ordinal]
    body = {
        "schema_version": VBD_TRAJECTORY_CONCORDANCE_LAUNCH_SCHEMA_VERSION,
        "phase": phase,
        "phase_hash": phase_record["phase_hash"],
        "phase_token": phase_record["phase_token"],
        "workspace_hash": workspace_record["workspace_hash"],
        "bundle_index": bundle_index,
        "bundle": bundle.to_dict(),
        "lane_ordinal": lane_ordinal,
        "lane": lane,
        "plan_hash": workspace_record["concordance_plan_hash"],
        "freeze_commit": workspace_record["freeze_commit"],
        "freeze_manifest_hash": workspace_record["freeze_manifest_hash"],
        "implementation_hash": workspace_record["implementation_hash"],
        "runtime_identity_hash": workspace_record["runtime_identity_hash"],
        "executable_sha256": workspace_record["executable_sha256"],
        "native_library_identity_hash": workspace_record[
            "native_library_identity_hash"
        ],
        "command_id": "vbd_trajectory_concordance_child",
        "command_hash": _child_command_hash(),
        "parent_process_id": os.getpid(),
        "created_at": _utc_now(),
        "launch_token": secrets.token_hex(32),
        "capability_token_hash": capability_token_hash,
        "result_present": False,
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }
    return {**body, "launch_receipt_hash": sha256_json(body)}


def _validate_launch(
    value: object,
    *,
    phase: str,
    phase_record: dict,
    bundle_index: int,
    lane_ordinal: int | None,
    workspace_record: dict,
) -> dict:
    expected_keys = {
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
    if type(value) is not dict or set(value) != expected_keys:
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance launch must be an object"
        )
    body = {key: item for key, item in value.items() if key != "launch_receipt_hash"}
    bundle = required_vbd_trajectory_concordance_bundles()[bundle_index]
    expected_lane = (
        None
        if lane_ordinal is None
        else ("frequency", "engagement", "breadth")[lane_ordinal]
    )
    if (
        value.get("schema_version")
        != VBD_TRAJECTORY_CONCORDANCE_LAUNCH_SCHEMA_VERSION
        or value.get("phase") != phase
        or value.get("phase_hash") != phase_record["phase_hash"]
        or value.get("phase_token") != phase_record["phase_token"]
        or value.get("workspace_hash") != workspace_record["workspace_hash"]
        or value.get("bundle_index") != bundle_index
        or value.get("bundle") != bundle.to_dict()
        or value.get("lane_ordinal") != lane_ordinal
        or value.get("lane") != expected_lane
        or value.get("plan_hash") != workspace_record["concordance_plan_hash"]
        or any(
            value.get(key) != workspace_record[key]
            for key in (
                "freeze_commit",
                "freeze_manifest_hash",
                "implementation_hash",
                "runtime_identity_hash",
                "executable_sha256",
                "native_library_identity_hash",
            )
        )
        or value.get("command_id") != "vbd_trajectory_concordance_child"
        or value.get("command_hash") != _child_command_hash()
        or value.get("result_present") is not False
        or value.get("internal_only") is not True
        or value.get("synthetic_only") is not True
        or value.get("customer_output_authorized") is not False
        or value.get("launch_receipt_hash") != sha256_json(body)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance launch receipt is invalid"
        )
    _strict_timestamp(value["created_at"], "launch created_at")
    _strict_token(value["launch_token"], "launch token")
    _strict_sha256(value["capability_token_hash"], "capability token hash")
    return value


def _revalidate_concordance_launch_admission(
    workspace: Path, receipt: dict
) -> None:
    loaded, record, primary, recomputation = _load_workspace(
        workspace, verify_lock_identity=lambda: None, restore_launches=False
    )
    if (
        loaded != workspace
        or receipt["workspace_hash"] != record["workspace_hash"]
        or receipt["parent_process_id"] != os.getpid()
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance child launch is detached from its admitted workspace"
        )
    phase_record = primary if receipt["phase"] == "primary" else recomputation
    stem = (
        f"bundle_{receipt['bundle_index']:02d}.json"
        if receipt["lane_ordinal"] is None
        else (
            f"bundle_{receipt['bundle_index']:02d}_lane_"
            f"{receipt['lane_ordinal']}.json"
        )
    )
    persisted = _validate_launch(
        read_strict_json(
            _safe_workspace_path(
                workspace, receipt["phase"], "launches", stem
            )
        ),
        phase=receipt["phase"],
        phase_record=phase_record,
        bundle_index=receipt["bundle_index"],
        lane_ordinal=receipt["lane_ordinal"],
        workspace_record=record,
    )
    anchor = _load_attempt_anchor(
        workspace=workspace,
        workspace_record=record,
        phase=receipt["phase"],
        stem=stem,
        reconcile_temps=False,
        restore_missing=False,
    )
    if (
        persisted != receipt
        or anchor is None
        or anchor["launch_receipt"] != receipt
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance child launch is not the current create-once action"
        )


def _launch_child(
    *,
    receipt: dict,
    capability_token: str,
    workspace: Path,
    verify_lock_identity: Callable[[], None],
) -> tuple[int, int, bytes, bytes]:
    verify_lock_identity()
    command = _child_command()
    capability = _launch_capability(receipt, capability_token)
    frozen_source = _frozen_source_bundle(
        expected_freeze_manifest_hash=receipt["freeze_manifest_hash"]
    )
    capability_read, capability_write = os.pipe()
    liveness_read, liveness_write = os.pipe()
    source_read, source_write = os.pipe()
    environment = _child_environment(
        capability_fd=capability_read,
        parent_liveness_fd=liveness_read,
        frozen_source_fd=source_read,
    )
    process = None
    try:
        verify_lock_identity()
        _revalidate_concordance_launch_admission(workspace, receipt)
        process = subprocess.Popen(
            command,
            cwd="/",
            env=environment,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            close_fds=True,
            pass_fds=(capability_read, liveness_read, source_read),
        )
        os.close(capability_read)
        capability_read = -1
        os.close(liveness_read)
        liveness_read = -1
        os.close(source_read)
        source_read = -1
        source_written = 0
        while source_written < len(frozen_source):
            source_written += os.write(
                source_write, frozen_source[source_written:]
            )
        os.close(source_write)
        source_write = -1
        encoded = _canonical_json_bytes(capability)
        written = 0
        while written < len(encoded):
            written += os.write(capability_write, encoded[written:])
        os.close(capability_write)
        capability_write = -1
        try:
            stdout, stderr = process.communicate(
                _canonical_json_bytes(receipt),
                timeout=VBD_TRAJECTORY_CONCORDANCE_CHILD_TIMEOUT_SECONDS,
            )
        except subprocess.TimeoutExpired:
            process.kill()
            stdout, stderr = process.communicate()
            return process.pid, 124, stdout[:_CHILD_STDOUT_LIMIT], stderr[
                :_CHILD_STDERR_LIMIT
            ]
    except OSError as exc:
        _terminate_started_child(process)
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance child process could not be launched"
        ) from exc
    except BaseException:
        _terminate_started_child(process)
        raise
    finally:
        for descriptor in (
            capability_read,
            capability_write,
            liveness_read,
            liveness_write,
            source_read,
            source_write,
        ):
            if descriptor >= 0:
                try:
                    os.close(descriptor)
                except OSError:
                    pass
    if process is None:
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance child could not be launched"
        )
    verify_lock_identity()
    if len(stdout) > _CHILD_STDOUT_LIMIT or len(stderr) > _CHILD_STDERR_LIMIT:
        return process.pid, 125, b"", b""
    return process.pid, process.returncode, stdout, stderr


def _strict_float(value: object, name: str) -> float:
    if (
        type(value) is not float
        or not math.isfinite(value)
        or (value == 0.0 and math.copysign(1.0, value) < 0.0)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            f"concordance {name} must be a finite native float"
        )
    return value


def _summary_from_dict(value: object) -> TrajectoryPosteriorSummary:
    expected = {
        "quantity_name",
        "posterior_mean",
        "posterior_sd",
        "credible_interval_80",
        "credible_interval_99",
    }
    if type(value) is not dict or set(value) != expected:
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance posterior summary shape is invalid"
        )
    interval_80 = value["credible_interval_80"]
    interval_99 = value["credible_interval_99"]
    if (
        type(interval_80) is not dict
        or set(interval_80) != {"lower", "upper"}
        or type(interval_99) is not dict
        or set(interval_99) != {"lower", "upper"}
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance posterior interval shape is invalid"
        )
    summary = TrajectoryPosteriorSummary(
        quantity_name=value["quantity_name"],
        posterior_mean=_strict_float(value["posterior_mean"], "posterior mean"),
        posterior_sd=_strict_float(value["posterior_sd"], "posterior SD"),
        interval_80_lower=_strict_float(interval_80["lower"], "80% lower"),
        interval_80_upper=_strict_float(interval_80["upper"], "80% upper"),
        interval_99_lower=_strict_float(interval_99["lower"], "99% lower"),
        interval_99_upper=_strict_float(interval_99["upper"], "99% upper"),
    )
    if summary.to_dict() != value:
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance posterior summary is noncanonical"
        )
    return summary


def _deterministic_fit_from_dict(value: object) -> TrajectoryDeterministicFit:
    if type(value) is not dict or set(value) != {
        "lane",
        "prepared_input_hash",
        "model_input_hash",
        "engine_kind",
        "movement_summary",
        "integration_diagnostics",
        "latent_paths_emitted",
        "posterior_support_emitted",
        "fit_summary_hash",
    }:
        raise VbdTrajectoryValidationWorkspaceError(
            "deterministic concordance fit shape is invalid"
        )
    diagnostics = value["integration_diagnostics"]
    if type(diagnostics) is not dict:
        raise VbdTrajectoryValidationWorkspaceError(
            "deterministic integration diagnostics are invalid"
        )
    try:
        reconstructed_diagnostics = TrajectoryIntegrationDiagnostics(
            point_count=diagnostics["point_count"],
            finite_point_count=diagnostics["finite_point_count"],
            effective_sample_size=_strict_float(
                diagnostics["effective_sample_size"], "integration ESS"
            ),
            max_normalized_weight=_strict_float(
                diagnostics["max_normalized_weight"], "maximum weight"
            ),
            mode_transformed=tuple(
                _strict_float(item, "integration mode")
                for item in diagnostics["mode_transformed"]
            ),
            negative_log_posterior_at_mode=_strict_float(
                diagnostics["negative_log_posterior_at_mode"],
                "negative log posterior",
            ),
            hessian_condition_number=_strict_float(
                diagnostics["hessian_condition_number"], "Hessian condition"
            ),
            minimum_conditional_movement_variance=_strict_float(
                diagnostics["minimum_conditional_movement_variance"],
                "minimum movement variance",
            ),
            maximum_conditional_movement_variance=_strict_float(
                diagnostics["maximum_conditional_movement_variance"],
                "maximum movement variance",
            ),
            movement_support_count=diagnostics["conditional_movement_quadrature"][
                "movement_support_count"
            ],
        )
    except (KeyError, TypeError, ValueError, TrajectoryIntegrationError) as exc:
        raise VbdTrajectoryValidationWorkspaceError(
            "deterministic integration diagnostics are malformed"
        ) from exc
    if reconstructed_diagnostics.to_dict() != diagnostics:
        raise VbdTrajectoryValidationWorkspaceError(
            "deterministic integration diagnostics are noncanonical"
        )
    try:
        fit = TrajectoryDeterministicFit(
            lane=value["lane"],
            prepared_input_hash=value["prepared_input_hash"],
            model_input_hash=value["model_input_hash"],
            movement_summary=_summary_from_dict(value["movement_summary"]),
            integration_diagnostics=reconstructed_diagnostics,
        )
    except TrajectoryIntegrationError as exc:
        raise VbdTrajectoryValidationWorkspaceError(
            "deterministic concordance fit is malformed"
        ) from exc
    if fit.to_dict() != value:
        raise VbdTrajectoryValidationWorkspaceError(
            "deterministic concordance fit is noncanonical"
        )
    return fit


def _nuts_fit_from_dict(value: object) -> TrajectoryNutsFit:
    expected = {
        "lane",
        "prepared_input_hash",
        "model_input_hash",
        "engine_kind",
        "settings",
        "chain_seeds",
        "ppc_seed",
        "concordance_binding_hash",
        "movement_summary",
        "sampler_diagnostics",
        "posterior_predictive_checks",
        "raw_posterior_draws_emitted",
        "latent_paths_emitted",
        "posterior_predictive_replicates_emitted",
        "fit_summary_hash",
    }
    if type(value) is not dict or set(value) != expected:
        raise VbdTrajectoryValidationWorkspaceError(
            "NUTS concordance fit shape is invalid"
        )
    settings_value = value["settings"]
    if type(settings_value) is not dict:
        raise VbdTrajectoryValidationWorkspaceError(
            "NUTS settings are invalid"
        )
    try:
        settings = TrajectoryNutsSettings(
            mode=settings_value["mode"],
            chains=settings_value["chains"],
            draws=settings_value["draws"],
            tune=settings_value["tune"],
            target_accept=_strict_float(
                settings_value["target_accept"], "target_accept"
            ),
            max_treedepth=settings_value["max_treedepth"],
            sampler=settings_value["sampler"],
            cores=settings_value["cores"],
            blas_cores=settings_value["blas_cores"],
            compute_convergence_checks=settings_value[
                "compute_convergence_checks"
            ],
        )
    except (KeyError, TypeError, ValueError, TrajectoryNutsError) as exc:
        raise VbdTrajectoryValidationWorkspaceError(
            "NUTS settings are malformed"
        ) from exc
    if settings.to_dict() != settings_value:
        raise VbdTrajectoryValidationWorkspaceError(
            "NUTS settings are noncanonical"
        )
    diagnostics_value = value["sampler_diagnostics"]
    if type(diagnostics_value) is not dict:
        raise VbdTrajectoryValidationWorkspaceError(
            "NUTS diagnostics are invalid"
        )
    try:
        parameters = tuple(
            TrajectorySamplerParameterDiagnostic(
                parameter_name=item["parameter_name"],
                r_hat=_strict_float(item["r_hat"], "R-hat"),
                bulk_ess=_strict_float(item["bulk_ess"], "bulk ESS"),
                tail_ess=_strict_float(item["tail_ess"], "tail ESS"),
                posterior_mean_mcse=_strict_float(
                    item["posterior_mean_mcse"], "posterior mean MCSE"
                ),
                interval_80_endpoint_mcse=_strict_float(
                    item["interval_80_endpoint_mcse"],
                    "80 percent interval endpoint MCSE",
                ),
                interval_99_endpoint_mcse=_strict_float(
                    item["interval_99_endpoint_mcse"],
                    "99 percent interval endpoint MCSE",
                ),
                posterior_sd=_strict_float(item["posterior_sd"], "posterior SD"),
            )
            for item in diagnostics_value["parameters"]
        )
        known_extras = tuple(
            item
            for item in diagnostics_value["failing_diagnostics"]
            if item == "posterior_predictive_check"
        )
        diagnostics = TrajectorySamplerDiagnostics(
            settings=settings,
            parameters=parameters,
            required_parameter_names=tuple(
                diagnostics_value["required_parameter_names"]
            ),
            missing_parameter_variables=tuple(
                diagnostics_value["missing_parameter_variables"]
            ),
            missing_parameter_names=tuple(
                diagnostics_value["missing_parameter_names"]
            ),
            duplicate_parameter_names=tuple(
                diagnostics_value["duplicate_parameter_names"]
            ),
            off_plan_parameter_names=tuple(
                diagnostics_value["off_plan_parameter_names"]
            ),
            parameter_order_matches=diagnostics_value[
                "parameter_order_matches"
            ],
            trace_shape_matches=diagnostics_value["trace_shape_matches"],
            post_warmup_divergences=diagnostics_value[
                "post_warmup_divergences"
            ],
            max_treedepth_saturation_count=diagnostics_value[
                "max_treedepth_saturation_count"
            ],
            energy_bfmi_min=_strict_float(
                diagnostics_value["energy_bfmi_min"], "energy BFMI"
            ),
            extra_failures=known_extras,
        )
    except (KeyError, TypeError, ValueError, TrajectoryNutsError) as exc:
        raise VbdTrajectoryValidationWorkspaceError(
            "NUTS diagnostics are malformed"
        ) from exc
    if diagnostics.to_dict() != diagnostics_value:
        raise VbdTrajectoryValidationWorkspaceError(
            "NUTS diagnostics are noncanonical"
        )
    try:
        ppc = tuple(
            TrajectoryPpcResult(
                statistic_name=item["statistic_name"],
                observed_value=_strict_float(item["observed_value"], "PPC observed"),
                predictive_mean=_strict_float(
                    item["predictive_mean"], "PPC predictive mean"
                ),
                predictive_interval_80_lower=_strict_float(
                    item["predictive_interval_80"]["lower"], "PPC lower"
                ),
                predictive_interval_80_upper=_strict_float(
                    item["predictive_interval_80"]["upper"], "PPC upper"
                ),
                p_value=_strict_float(item["p_value"], "PPC p-value"),
            )
            for item in value["posterior_predictive_checks"]
        )
    except (KeyError, TypeError, ValueError, TrajectoryNutsError) as exc:
        raise VbdTrajectoryValidationWorkspaceError(
            "NUTS posterior predictive checks are malformed"
        ) from exc
    try:
        fit = TrajectoryNutsFit(
            lane=value["lane"],
            prepared_input_hash=value["prepared_input_hash"],
            model_input_hash=value["model_input_hash"],
            settings=settings,
            chain_seeds=tuple(value["chain_seeds"]),
            ppc_seed=value["ppc_seed"],
            movement_summary=_summary_from_dict(value["movement_summary"]),
            sampler_diagnostics=diagnostics,
            posterior_predictive_checks=ppc,
            concordance_binding_hash=value["concordance_binding_hash"],
        )
    except (TypeError, TrajectoryNutsError) as exc:
        raise VbdTrajectoryValidationWorkspaceError(
            "NUTS concordance fit is malformed"
        ) from exc
    if fit.to_dict() != value:
        raise VbdTrajectoryValidationWorkspaceError(
            "NUTS concordance fit is noncanonical"
        )
    return fit


def _rehash_record(
    record: object,
    *,
    reference: bool,
    bundle,
    lane_ordinal: int,
) -> tuple[dict, object]:
    if type(record) is not dict or set(record) != {
        "lane",
        "prepared_input_hash",
        "model_input_hash",
        "context_binding_hash",
        "process_phase_binding_hash",
        "fit",
        "record_hash",
    } | ({"fit_semantic_hash"} if not reference else set()):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance lane record shape is invalid"
        )
    body = {key: item for key, item in record.items() if key != "record_hash"}
    fit = (
        _nuts_fit_from_dict(record["fit"])
        if reference
        else _deterministic_fit_from_dict(record["fit"])
    )
    for key in (
        "prepared_input_hash",
        "model_input_hash",
        "context_binding_hash",
        "process_phase_binding_hash",
        "record_hash",
    ):
        _strict_sha256(record[key], f"lane record {key}")
    if (
        record["prepared_input_hash"] != fit.prepared_input_hash
        or record["model_input_hash"] != fit.model_input_hash
        or record["lane"] != fit.lane
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance lane record differs from its typed fit"
        )
    if record["record_hash"] != sha256_json(body):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance lane record hash is invalid"
        )
    if record["lane"] != ("frequency", "engagement", "breadth")[lane_ordinal]:
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance lane record order drifted"
        )
    if reference:
        binding = build_vbd_trajectory_nuts_concordance_binding(
            bundle_id=bundle.bundle_id,
            bundle_seed=bundle.bundle_seed,
            cell_ordinal=bundle.cell_ordinal,
            seed_index=bundle.seed_index,
            lane=record["lane"],
            lane_ordinal=lane_ordinal,
            plan_hash=vbd_trajectory_concordance_plan()["plan_hash"],
        )
        if (
            fit.chain_seeds != binding.chain_seeds
            or fit.ppc_seed != binding.ppc_seed
            or fit.concordance_binding_hash != binding.binding_hash
        ):
            raise VbdTrajectoryValidationWorkspaceError(
                "concordance NUTS seed binding drifted"
            )
    else:
        semantic_body = {
            key: item
            for key, item in record.items()
            if key
            not in (
                "fit_semantic_hash",
                "process_phase_binding_hash",
                "record_hash",
            )
        }
        if record["fit_semantic_hash"] != sha256_json(semantic_body):
            raise VbdTrajectoryValidationWorkspaceError(
                "deterministic fit semantic hash is invalid"
            )
    return record, fit


def _validate_child_output(
    value: object,
    *,
    receipt: dict,
    observed_child_pid: int | None,
) -> dict:
    expected_output_keys = {
        "schema_version",
        "phase",
        "bundle_index",
        "bundle",
        "lane_ordinal",
        "lane",
        "plan_hash",
        "freeze_commit",
        "freeze_manifest_hash",
        "ordered_panel_manifest_root",
        "lane_observation_roots_hash",
        "truth_receipt_hash",
        "deterministic_records",
        "deterministic_semantic_hash",
        "nuts_records",
        "concordance_records",
        "failing_checks",
        "state",
        "raw_posterior_draws_emitted",
        "latent_paths_emitted",
        "posterior_predictive_replicates_emitted",
        "input_arrays_emitted",
        "internal_only",
        "synthetic_only",
        "aggregate_only",
        "customer_output_authorized",
        "acceptance_complete",
        "task_5_6_complete",
        "semantic_result_hash",
        "execution_attestation",
        "child_output_hash",
    }
    if type(value) is not dict or set(value) != expected_output_keys:
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance child output shape is invalid"
        )
    body = {key: item for key, item in value.items() if key != "child_output_hash"}
    if (
        value.get("schema_version")
        != VBD_TRAJECTORY_CONCORDANCE_CHILD_OUTPUT_SCHEMA_VERSION
        or value.get("phase") != receipt["phase"]
        or value.get("bundle_index") != receipt["bundle_index"]
        or value.get("bundle") != receipt["bundle"]
        or value.get("lane_ordinal") != receipt["lane_ordinal"]
        or value.get("lane") != receipt["lane"]
        or value.get("plan_hash") != receipt["plan_hash"]
        or value.get("freeze_commit") != receipt["freeze_commit"]
        or value.get("freeze_manifest_hash") != receipt["freeze_manifest_hash"]
        or value.get("state") not in ("PASS", "HOLD")
        or type(value.get("failing_checks")) is not list
        or (value.get("state") == "PASS") is not (value.get("failing_checks") == [])
        or value.get("raw_posterior_draws_emitted") is not False
        or value.get("latent_paths_emitted") is not False
        or value.get("posterior_predictive_replicates_emitted") is not False
        or value.get("input_arrays_emitted") is not False
        or value.get("internal_only") is not True
        or value.get("synthetic_only") is not True
        or value.get("aggregate_only") is not True
        or value.get("customer_output_authorized") is not False
        or value.get("acceptance_complete") is not False
        or value.get("task_5_6_complete") is not False
        or value.get("child_output_hash") != sha256_json(body)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance child output is invalid"
        )
    for key in (
        "ordered_panel_manifest_root",
        "lane_observation_roots_hash",
        "truth_receipt_hash",
    ):
        _strict_sha256(value[key], f"concordance {key}")
    deterministic = value.get("deterministic_records")
    nuts = value.get("nuts_records")
    concordance = value.get("concordance_records")
    bundle = vbd_trajectory_concordance_bundle_from_dict(value["bundle"])
    expected_deterministic_ordinals = (
        tuple(range(3))
        if receipt["phase"] == "primary"
        else (receipt["lane_ordinal"],)
    )
    if (
        type(deterministic) is not list
        or len(deterministic) != (3 if receipt["phase"] == "primary" else 1)
        or [record["lane"] for record in deterministic]
        != (
            ["frequency", "engagement", "breadth"]
            if receipt["phase"] == "primary"
            else [receipt["lane"]]
        )
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance deterministic records are incomplete"
        )
    deterministic_pairs = tuple(
        _rehash_record(
            record,
            reference=False,
            bundle=bundle,
            lane_ordinal=lane_ordinal,
        )
        for record, lane_ordinal in zip(
            deterministic, expected_deterministic_ordinals, strict=True
        )
    )
    deterministic_fits = tuple(pair[1] for pair in deterministic_pairs)
    if receipt["phase"] == "primary":
        if (
            type(nuts) is not list
            or len(nuts) != 3
            or [record["lane"] for record in nuts]
            != ["frequency", "engagement", "breadth"]
            or type(concordance) is not list
            or len(concordance) != 3
        ):
            raise VbdTrajectoryValidationWorkspaceError(
                "concordance primary reference records are incomplete"
            )
        nuts_pairs = tuple(
            _rehash_record(
                record,
                reference=True,
                bundle=bundle,
                lane_ordinal=lane_ordinal,
            )
            for lane_ordinal, record in enumerate(nuts)
        )
        nuts_fits = tuple(pair[1] for pair in nuts_pairs)
        expected_concordance = [
            {
                "lane": ("frequency", "engagement", "breadth")[lane_ordinal],
                **evaluate_vbd_trajectory_quantity_concordance(
                    deterministic_fits[lane_ordinal].movement_summary,
                    nuts_fits[lane_ordinal].movement_summary,
                ),
            }
            for lane_ordinal in range(3)
        ]
        if concordance != expected_concordance:
            raise VbdTrajectoryValidationWorkspaceError(
                "cross-engine concordance was not independently rederived"
            )
        expected_failures: list[str] = []
        for fit in nuts_fits:
            expected_failures.extend(fit.sampler_diagnostics.failing_diagnostics)
            if not all(check.passed for check in fit.posterior_predictive_checks):
                expected_failures.append("posterior_predictive_check")
        if not all(item["passed"] for item in expected_concordance):
            expected_failures.append("cross_engine_concordance")
        expected_failures = list(dict.fromkeys(expected_failures))
        if value["failing_checks"] != expected_failures:
            raise VbdTrajectoryValidationWorkspaceError(
                "concordance failure list was not independently rederived"
            )
    elif nuts != [] or concordance != []:
        raise VbdTrajectoryValidationWorkspaceError(
            "recomputation emitted reference or concordance records"
        )
    elif value["failing_checks"] != []:
        raise VbdTrajectoryValidationWorkspaceError(
            "deterministic recomputation cannot self-declare a failure"
        )
    expected_deterministic_hash = sha256_json(
        {
            "bundle_hash": receipt["bundle"]["bundle_hash"],
            "ordered_panel_manifest_root": value["ordered_panel_manifest_root"],
            "truth_receipt_hash": value["truth_receipt_hash"],
            "records": [
                {
                    key: item
                    for key, item in record.items()
                    if key not in ("process_phase_binding_hash", "record_hash")
                }
                for record in deterministic
            ],
        }
    )
    if value.get("deterministic_semantic_hash") != expected_deterministic_hash:
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance deterministic semantic hash is invalid"
        )
    semantic_body = {
        key: item
        for key, item in value.items()
        if key not in (
            "semantic_result_hash",
            "execution_attestation",
            "child_output_hash",
        )
    }
    if value.get("semantic_result_hash") != sha256_json(semantic_body):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance semantic result hash is invalid"
        )
    attestation = value.get("execution_attestation")
    expected_attestation_keys = {
        "attestation_version",
        "phase",
        "phase_hash",
        "phase_token",
        "workspace_hash",
        "bundle_index",
        "bundle_hash",
        "lane_ordinal",
        "lane",
        "plan_hash",
        "freeze_commit",
        "freeze_manifest_hash",
        "implementation_hash",
        "runtime_identity_hash",
        "command_id",
        "command_hash",
        "launch_receipt_hash",
        "process_token",
        "process_phase_binding_hash",
        "process_id",
        "parent_process_id",
        "process_started_at",
        "process_completed_at",
        "executable_sha256",
        "native_library_identity_hash",
        "deterministic_semantic_hash",
        "semantic_result_hash",
        "prior_phase_inputs_received",
        "prior_phase_inputs_read",
        "result_arrays_emitted",
        "internal_only",
        "synthetic_only",
        "customer_output_authorized",
        "attestation_hash",
    }
    if type(attestation) is not dict or set(attestation) != expected_attestation_keys:
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance execution attestation is missing"
        )
    attestation_body = {
        key: item for key, item in attestation.items() if key != "attestation_hash"
    }
    started = datetime.fromisoformat(
        _strict_timestamp(attestation.get("process_started_at"), "process started_at")
    )
    completed = datetime.fromisoformat(
        _strict_timestamp(
            attestation.get("process_completed_at"), "process completed_at"
        )
    )
    if (
        completed < started
        or attestation.get("attestation_version")
        != VBD_TRAJECTORY_CONCORDANCE_ATTESTATION_VERSION
        or any(
            attestation.get(key) != receipt[key]
            for key in (
                "phase",
                "phase_hash",
                "phase_token",
                "workspace_hash",
                "bundle_index",
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
            )
        )
        or attestation.get("bundle_hash") != receipt["bundle"]["bundle_hash"]
        or attestation.get("launch_receipt_hash") != receipt["launch_receipt_hash"]
        or attestation.get("deterministic_semantic_hash")
        != value["deterministic_semantic_hash"]
        or attestation.get("semantic_result_hash") != value["semantic_result_hash"]
        or any(
            record["process_phase_binding_hash"]
            != attestation.get("process_phase_binding_hash")
            for record in (*deterministic, *nuts)
        )
        or attestation.get("process_phase_binding_hash")
        != sha256_json(
            {
                "phase": receipt["phase"],
                "phase_hash": receipt["phase_hash"],
                "phase_token": receipt["phase_token"],
                "bundle_hash": receipt["bundle"]["bundle_hash"],
                "lane_ordinal": receipt["lane_ordinal"],
                "lane": receipt["lane"],
                "process_token": attestation.get("process_token"),
                "process_id": attestation.get("process_id"),
                "parent_process_id": attestation.get("parent_process_id"),
                "process_started_at": attestation.get("process_started_at"),
            }
        )
        or type(attestation.get("process_id")) is not int
        or attestation.get("process_id") <= 0
        or type(attestation.get("parent_process_id")) is not int
        or attestation.get("parent_process_id") <= 0
        or attestation.get("process_id") == attestation.get("parent_process_id")
        or (
            observed_child_pid is not None
            and attestation.get("process_id") != observed_child_pid
        )
        or attestation.get("prior_phase_inputs_received") is not False
        or attestation.get("prior_phase_inputs_read") is not False
        or attestation.get("result_arrays_emitted") is not False
        or attestation.get("internal_only") is not True
        or attestation.get("synthetic_only") is not True
        or attestation.get("customer_output_authorized") is not False
        or attestation.get("attestation_hash") != sha256_json(attestation_body)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance execution attestation is invalid"
        )
    _strict_token(attestation["process_token"], "process token")
    return value


def _checkpoint_record(
    *,
    launch: dict,
    child_pid: int,
    return_code: int,
    stdout: bytes,
    stderr: bytes,
    child_output: dict,
) -> dict:
    body = {
        "schema_version": VBD_TRAJECTORY_CONCORDANCE_CHECKPOINT_SCHEMA_VERSION,
        "launch_receipt_hash": launch["launch_receipt_hash"],
        "observed_child_pid": child_pid,
        "child_return_code": return_code,
        "child_stdout_sha256": hashlib.sha256(stdout).hexdigest(),
        "child_stderr_sha256": hashlib.sha256(stderr).hexdigest(),
        "child_output": child_output,
        "raw_stdout_committed": False,
        "raw_stderr_committed": False,
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }
    return {**body, "checkpoint_hash": sha256_json(body)}


def _validate_checkpoint(value: object, *, receipt: dict) -> dict:
    expected = {
        "schema_version",
        "launch_receipt_hash",
        "observed_child_pid",
        "child_return_code",
        "child_stdout_sha256",
        "child_stderr_sha256",
        "child_output",
        "raw_stdout_committed",
        "raw_stderr_committed",
        "internal_only",
        "synthetic_only",
        "customer_output_authorized",
        "checkpoint_hash",
    }
    if type(value) is not dict or set(value) != expected:
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance checkpoint shape is invalid"
        )
    body = {key: item for key, item in value.items() if key != "checkpoint_hash"}
    if (
        value["schema_version"]
        != VBD_TRAJECTORY_CONCORDANCE_CHECKPOINT_SCHEMA_VERSION
        or value["launch_receipt_hash"] != receipt["launch_receipt_hash"]
        or type(value["observed_child_pid"]) is not int
        or value["observed_child_pid"] <= 0
        or value["child_return_code"] != 0
        or value["raw_stdout_committed"] is not False
        or value["raw_stderr_committed"] is not False
        or value["internal_only"] is not True
        or value["synthetic_only"] is not True
        or value["customer_output_authorized"] is not False
        or value["checkpoint_hash"] != sha256_json(body)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance checkpoint is invalid"
        )
    _strict_sha256(value["child_stdout_sha256"], "child stdout hash")
    _strict_sha256(value["child_stderr_sha256"], "child stderr hash")
    _validate_child_output(
        value["child_output"],
        receipt=receipt,
        observed_child_pid=value["observed_child_pid"],
    )
    return value


def _failure_record(
    *,
    launch: dict,
    failure_code: str,
    child_pid: int | None,
    return_code: int | None,
    stdout: bytes,
    stderr: bytes,
) -> dict:
    body = {
        "schema_version": VBD_TRAJECTORY_CONCORDANCE_FAILURE_SCHEMA_VERSION,
        "launch_receipt_hash": launch["launch_receipt_hash"],
        "failure_code": failure_code,
        "observed_child_pid": child_pid,
        "child_return_code": return_code,
        "child_stdout_sha256": hashlib.sha256(stdout).hexdigest(),
        "child_stderr_sha256": hashlib.sha256(stderr).hexdigest(),
        "raw_stdout_committed": False,
        "raw_stderr_committed": False,
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }
    return {**body, "failure_hash": sha256_json(body)}


def _validate_failure(value: object, *, receipt: dict | None) -> dict:
    expected = {
        "schema_version",
        "launch_receipt_hash",
        "failure_code",
        "observed_child_pid",
        "child_return_code",
        "child_stdout_sha256",
        "child_stderr_sha256",
        "raw_stdout_committed",
        "raw_stderr_committed",
        "internal_only",
        "synthetic_only",
        "customer_output_authorized",
        "failure_hash",
    }
    if type(value) is not dict or set(value) != expected:
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance failure checkpoint shape is invalid"
        )
    body = {key: item for key, item in value.items() if key != "failure_hash"}
    if (
        value["schema_version"]
        != VBD_TRAJECTORY_CONCORDANCE_FAILURE_SCHEMA_VERSION
        or value["failure_code"]
        not in ("interrupted_before_checkpoint", "child_process_failure")
        or (receipt is not None and value["launch_receipt_hash"] != receipt["launch_receipt_hash"])
        or value["raw_stdout_committed"] is not False
        or value["raw_stderr_committed"] is not False
        or value["internal_only"] is not True
        or value["synthetic_only"] is not True
        or value["customer_output_authorized"] is not False
        or value["failure_hash"] != sha256_json(body)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance failure checkpoint is invalid"
        )
    _strict_sha256(value["launch_receipt_hash"], "failure launch hash")
    _strict_sha256(value["child_stdout_sha256"], "failure stdout hash")
    _strict_sha256(value["child_stderr_sha256"], "failure stderr hash")
    return value


def _run_phase_bundle(
    *,
    workspace: Path,
    workspace_record: dict,
    phase_record: dict,
    bundle_index: int,
    lane_ordinal: int | None,
    verify_lock_identity: Callable[[], None],
) -> dict:
    phase = phase_record["phase"]
    if (phase == "primary") is not (lane_ordinal is None):
        raise ValueError("concordance phase/lane execution binding is invalid")
    stem = (
        f"bundle_{bundle_index:02d}.json"
        if lane_ordinal is None
        else f"bundle_{bundle_index:02d}_lane_{lane_ordinal}.json"
    )
    launch_path = _safe_workspace_path(workspace, phase, "launches", stem)
    result_path = _safe_workspace_path(workspace, phase, "results", stem)
    failure_path = _safe_workspace_path(workspace, phase, "failures", stem)
    anchor = _load_attempt_anchor(
        workspace=workspace,
        workspace_record=workspace_record,
        phase=phase,
        stem=stem,
    )
    if anchor is not None and not _workspace_path_exists(launch_path):
        write_json_create_once(
            launch_path,
            anchor["launch_receipt"],
            lock_verifier=verify_lock_identity,
        )
    if _workspace_path_exists(result_path):
        if not _workspace_path_exists(launch_path):
            raise VbdTrajectoryValidationWorkspaceError(
                "concordance result lacks its launch receipt"
            )
        launch = _validate_launch(
            read_strict_json(launch_path),
            phase=phase,
            phase_record=phase_record,
            bundle_index=bundle_index,
            lane_ordinal=lane_ordinal,
            workspace_record=workspace_record,
        )
        if anchor is None or anchor["launch_receipt"] != launch:
            raise VbdTrajectoryValidationWorkspaceError(
                "concordance result launch lacks its external attempt anchor"
            )
        return _validate_checkpoint(
            read_strict_json(result_path), receipt=launch
        )["child_output"]
    if _workspace_path_exists(failure_path):
        if not _workspace_path_exists(launch_path):
            raise VbdTrajectoryValidationWorkspaceError(
                "concordance failure lacks its launch receipt"
            )
        launch = _validate_launch(
            read_strict_json(launch_path),
            phase=phase,
            phase_record=phase_record,
            bundle_index=bundle_index,
            lane_ordinal=lane_ordinal,
            workspace_record=workspace_record,
        )
        if anchor is None or anchor["launch_receipt"] != launch:
            raise VbdTrajectoryValidationWorkspaceError(
                "concordance failure launch lacks its external attempt anchor"
            )
        _validate_failure(read_strict_json(failure_path), receipt=launch)
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance phase contains a durable runner failure"
        )
    if _workspace_path_exists(launch_path):
        launch = _validate_launch(
            read_strict_json(launch_path),
            phase=phase,
            phase_record=phase_record,
            bundle_index=bundle_index,
            lane_ordinal=lane_ordinal,
            workspace_record=workspace_record,
        )
        if anchor is None or anchor["launch_receipt"] != launch:
            raise VbdTrajectoryValidationWorkspaceError(
                "concordance launch lacks its external attempt anchor"
            )
        failure = _failure_record(
            launch=launch,
            failure_code="interrupted_before_checkpoint",
            child_pid=None,
            return_code=None,
            stdout=b"",
            stderr=b"",
        )
        write_json_create_once(
            failure_path, failure, lock_verifier=verify_lock_identity
        )
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance launch was interrupted before a create-once result"
        )
    capability_token = secrets.token_hex(32)
    launch = _launch_receipt(
        phase=phase,
        phase_record=phase_record,
        bundle_index=bundle_index,
        lane_ordinal=lane_ordinal,
        workspace_record=workspace_record,
        capability_token_hash=sha256_json(capability_token),
    )
    _create_or_load_attempt_anchor(
        workspace=workspace,
        workspace_record=workspace_record,
        phase=phase,
        stem=stem,
        launch_receipt=launch,
    )
    write_json_create_once(launch_path, launch, lock_verifier=verify_lock_identity)
    child_pid, return_code, stdout, stderr = _launch_child(
        receipt=launch,
        capability_token=capability_token,
        workspace=workspace,
        verify_lock_identity=verify_lock_identity,
    )
    if return_code != 0:
        write_json_create_once(
            failure_path,
            _failure_record(
                launch=launch,
                failure_code="child_process_failure",
                child_pid=child_pid,
                return_code=return_code,
                stdout=stdout,
                stderr=stderr,
            ),
            lock_verifier=verify_lock_identity,
        )
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance child failed after its create-once launch"
        )
    from .vbd_trajectory_validation_resumable import _decode_json_bytes

    decoded = _decode_json_bytes(stdout, "concordance child stdout")
    if stdout != _canonical_json_bytes(decoded):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance child output is not canonical JSON"
        )
    validated = _validate_child_output(
        decoded, receipt=launch, observed_child_pid=child_pid
    )
    checkpoint = _checkpoint_record(
        launch=launch,
        child_pid=child_pid,
        return_code=return_code,
        stdout=stdout,
        stderr=stderr,
        child_output=validated,
    )
    write_json_create_once(
        result_path, checkpoint, lock_verifier=verify_lock_identity
    )
    return validated


def run_vbd_trajectory_concordance_bundle(
    workspace_dir: str | Path, bundle_index: int
) -> dict:
    if type(bundle_index) is not int or not 0 <= bundle_index < 30:
        raise ValueError("concordance bundle index must be in [0,29]")
    workspace = _workspace_from_user_path(workspace_dir)
    with _exclusive_lock(_safe_workspace_path(workspace, ".runner.lock")) as verify:
        verify()
        workspace, record, primary_phase, recompute_phase = _load_workspace(
            workspace, verify_lock_identity=verify
        )
        primary = _run_phase_bundle(
            workspace=workspace,
            workspace_record=record,
            phase_record=primary_phase,
            bundle_index=bundle_index,
            lane_ordinal=None,
            verify_lock_identity=verify,
        )
        expected_source_roots = _rederive_concordance_source_roots(
            required_vbd_trajectory_concordance_bundles()[bundle_index]
        )
        if any(
            primary[key] != expected
            for key, expected in expected_source_roots.items()
        ):
            raise VbdTrajectoryValidationWorkspaceError(
                "concordance primary source roots differ from bundle regeneration"
            )
        recomputations = tuple(
            _run_phase_bundle(
                workspace=workspace,
                workspace_record=record,
                phase_record=recompute_phase,
                bundle_index=bundle_index,
                lane_ordinal=lane_ordinal,
                verify_lock_identity=verify,
            )
            for lane_ordinal in range(3)
        )
        if any(
            primary["deterministic_records"][lane_ordinal]["fit_semantic_hash"]
            != recomputations[lane_ordinal]["deterministic_records"][0][
                "fit_semantic_hash"
            ]
            for lane_ordinal in range(3)
        ):
            raise VbdTrajectoryValidationWorkspaceError(
                "fresh deterministic concordance recomputation did not match"
            )
        verify()
    return {
        "bundle_index": bundle_index,
        "bundle_id": primary["bundle"]["bundle_id"],
        "primary_child_output_hash": primary["child_output_hash"],
        "recomputation_child_output_hashes": [
            value["child_output_hash"] for value in recomputations
        ],
        "state": (
            "PASS"
            if primary["state"] == "PASS"
            and all(value["state"] == "PASS" for value in recomputations)
            else "HOLD"
        ),
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }


def run_vbd_trajectory_concordance(
    workspace_dir: str | Path,
) -> tuple[dict, ...]:
    return tuple(
        run_vbd_trajectory_concordance_bundle(workspace_dir, bundle_index)
        for bundle_index in range(30)
    )


def _load_all_results(workspace: Path, record: dict, phases: tuple[dict, dict]):
    results: dict[str, list[dict]] = {phase: [] for phase in VBD_TRAJECTORY_CONCORDANCE_PHASES}
    launches: dict[str, list[dict]] = {phase: [] for phase in VBD_TRAJECTORY_CONCORDANCE_PHASES}
    for phase_record in phases:
        phase = phase_record["phase"]
        phase_lane_ordinals = (None,) if phase == "primary" else range(3)
        for bundle_index in range(30):
            for lane_ordinal in phase_lane_ordinals:
                stem = (
                    f"bundle_{bundle_index:02d}.json"
                    if lane_ordinal is None
                    else f"bundle_{bundle_index:02d}_lane_{lane_ordinal}.json"
                )
                launch = _validate_launch(
                    read_strict_json(
                        _safe_workspace_path(workspace, phase, "launches", stem)
                    ),
                    phase=phase,
                    phase_record=phase_record,
                    bundle_index=bundle_index,
                    lane_ordinal=lane_ordinal,
                    workspace_record=record,
                )
                checkpoint = _validate_checkpoint(
                    read_strict_json(
                        _safe_workspace_path(workspace, phase, "results", stem)
                    ),
                    receipt=launch,
                )
                launches[phase].append(launch)
                results[phase].append(checkpoint["child_output"])
    return results, launches


def _rederive_concordance_source_roots(bundle) -> dict:
    from .vbd_trajectory_synthetic import (
        _CONCORDANCE_GENERATION_RUNNER_TOKEN,
        _concordance_generation_context,
        generate_vbd_trajectory_concordance_case,
    )

    with _concordance_generation_context(
        capability_hash=bundle.bundle_hash,
        capability_token_hash=sha256_json(
            ["concordance-source-rederivation", bundle.bundle_hash]
        ),
        launch_receipt_hash=sha256_json(
            ["concordance-source-rederivation-launch", bundle.bundle_hash]
        ),
        _runner_token=_CONCORDANCE_GENERATION_RUNNER_TOKEN,
    ):
        case = generate_vbd_trajectory_concordance_case(bundle)
    return {
        "ordered_panel_manifest_root": case.panel.ordered_panel_manifest_root,
        "lane_observation_roots_hash": sha256_json(
            [list(item) for item in case.panel.lane_observation_roots]
        ),
        "truth_receipt_hash": _truth_receipt_hash(case),
    }


def _diagnostic_summary(primary: list[dict], nuts: list[dict], concordance: list[dict]) -> dict:
    parameters = [
        parameter
        for record in nuts
        for parameter in record["fit"]["sampler_diagnostics"]["parameters"]
    ]
    ppc = [
        check
        for record in nuts
        for check in record["fit"]["posterior_predictive_checks"]
    ]
    cells: dict[str, dict] = {}
    for result in primary:
        bundle = result["bundle"]
        cell_id = (
            f"effect={bundle['effect_size_sd']}/"
            f"groups={bundle['panel_group_count']}"
        )
        cell = cells.setdefault(cell_id, {"bundle_count": 0, "pass_count": 0})
        cell["bundle_count"] += 1
        cell["pass_count"] += result["state"] == "PASS"
    body = {
        "cells": {key: cells[key] for key in sorted(cells)},
        "sampler_diagnostics": {
            "max_r_hat": max(item["r_hat"] for item in parameters),
            "min_bulk_ess": min(item["bulk_ess"] for item in parameters),
            "min_tail_ess": min(item["tail_ess"] for item in parameters),
            "max_mcse_to_posterior_sd_ratio": max(
                item["max_mcse_to_posterior_sd_ratio"] for item in parameters
            ),
            "min_bfmi": min(
                record["fit"]["sampler_diagnostics"]["energy_bfmi_min"]
                for record in nuts
            ),
            "post_warmup_divergence_count": sum(
                record["fit"]["sampler_diagnostics"][
                    "post_warmup_divergences"
                ]
                for record in nuts
            ),
            "max_treedepth_saturation_count": sum(
                record["fit"]["sampler_diagnostics"][
                    "max_treedepth_saturation_count"
                ]
                for record in nuts
            ),
        },
        "posterior_predictive_checks": {
            "min_p_value": min(item["p_value"] for item in ppc),
            "max_p_value": max(item["p_value"] for item in ppc),
            "failure_count": sum(not item["passed"] for item in ppc),
        },
        "cross_engine_concordance": {
            "max_mean_difference_reference_sd": max(
                item["absolute_mean_difference_reference_sd"]
                for item in concordance
            ),
            "max_interval_80_endpoint_difference_reference_sd": max(
                max(
                    item[
                        "interval_80_lower_endpoint_difference_reference_sd"
                    ],
                    item[
                        "interval_80_upper_endpoint_difference_reference_sd"
                    ],
                )
                for item in concordance
            ),
            "max_interval_99_endpoint_difference_reference_sd": max(
                max(
                    item[
                        "interval_99_lower_endpoint_difference_reference_sd"
                    ],
                    item[
                        "interval_99_upper_endpoint_difference_reference_sd"
                    ],
                )
                for item in concordance
            ),
            "min_primary_to_reference_sd_ratio": min(
                item["primary_to_reference_sd_ratio"] for item in concordance
            ),
            "max_primary_to_reference_sd_ratio": max(
                item["primary_to_reference_sd_ratio"] for item in concordance
            ),
            "failure_count": sum(not item["passed"] for item in concordance),
        },
        "posterior_means_emitted": False,
        "posterior_interval_endpoints_emitted": False,
        "raw_posterior_draws_emitted": False,
        "latent_paths_emitted": False,
        "input_arrays_emitted": False,
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }
    return {**body, "diagnostic_summary_hash": sha256_json(body)}


def _combined_value(workspace: Path, record: dict, phases: tuple[dict, dict]) -> dict:
    results, launches = _load_all_results(workspace, record, phases)
    primary = results["primary"]
    recomputation = results["recomputation"]
    expected_source_roots = tuple(
        _rederive_concordance_source_roots(bundle)
        for bundle in required_vbd_trajectory_concordance_bundles()
    )
    if any(
        primary[index]["bundle"]
        != required_vbd_trajectory_concordance_bundles()[index].to_dict()
        or any(
            primary[index][key] != expected_source_roots[index][key]
            for key in (
                "ordered_panel_manifest_root",
                "lane_observation_roots_hash",
                "truth_receipt_hash",
            )
        )
        or any(
            recomputation[3 * index + lane_ordinal]["bundle"]
            != primary[index]["bundle"]
            or recomputation[3 * index + lane_ordinal]["lane_ordinal"]
            != lane_ordinal
            or any(
                recomputation[3 * index + lane_ordinal][key]
                != primary[index][key]
                for key in (
                    "ordered_panel_manifest_root",
                    "lane_observation_roots_hash",
                    "truth_receipt_hash",
                )
            )
            or recomputation[3 * index + lane_ordinal]["deterministic_records"][0][
                "fit_semantic_hash"
            ]
            != primary[index]["deterministic_records"][lane_ordinal][
                "fit_semantic_hash"
            ]
            for lane_ordinal in range(3)
        )
        for index in range(30)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance bundle universe or recomputation equality failed"
        )
    process_tokens = [
        result["execution_attestation"]["process_token"]
        for phase in VBD_TRAJECTORY_CONCORDANCE_PHASES
        for result in results[phase]
    ]
    launch_tokens = [
        launch["launch_token"]
        for phase in VBD_TRAJECTORY_CONCORDANCE_PHASES
        for launch in launches[phase]
    ]
    capability_token_hashes = [
        launch["capability_token_hash"]
        for phase in VBD_TRAJECTORY_CONCORDANCE_PHASES
        for launch in launches[phase]
    ]
    process_binding_hashes = [
        result["execution_attestation"]["process_phase_binding_hash"]
        for phase in VBD_TRAJECTORY_CONCORDANCE_PHASES
        for result in results[phase]
    ]
    all_execution_tokens = [
        record["workspace_token"],
        *(phase["phase_token"] for phase in phases),
        *process_tokens,
        *launch_tokens,
        *capability_token_hashes,
        *process_binding_hashes,
    ]
    if (
        len(set(process_tokens)) != 120
        or len(set(launch_tokens)) != 120
        or len(set(capability_token_hashes)) != 120
        or len(set(process_binding_hashes)) != 120
        or len(set(all_execution_tokens)) != len(all_execution_tokens)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance execution tokens are not pairwise disjoint"
        )
    primary_deterministic = [
        lane for result in primary for lane in result["deterministic_records"]
    ]
    nuts = [lane for result in primary for lane in result["nuts_records"]]
    fresh_deterministic = [
        lane
        for result in recomputation
        for lane in result["deterministic_records"]
    ]
    concordance = [
        lane for result in primary for lane in result["concordance_records"]
    ]
    attestations = [
        result["execution_attestation"]
        for phase in VBD_TRAJECTORY_CONCORDANCE_PHASES
        for result in results[phase]
    ]
    if not (
        len(primary_deterministic)
        == len(nuts)
        == len(fresh_deterministic)
        == len(concordance)
        == 90
        and len(attestations) == 120
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance nested record counts are incomplete"
        )
    sampler_failure_count = sum(
        bool(
            set(record["fit"]["sampler_diagnostics"]["failing_diagnostics"])
            - {"posterior_predictive_check"}
        )
        for record in nuts
    )
    ppc_failure_count = sum(
        not all(
            check["passed"]
            for check in record["fit"]["posterior_predictive_checks"]
        )
        for record in nuts
    )
    cross_engine_failure_count = sum(not record["passed"] for record in concordance)
    state = (
        "PASS"
        if all(
            result["state"] == "PASS"
            for phase in VBD_TRAJECTORY_CONCORDANCE_PHASES
            for result in results[phase]
        )
        and sampler_failure_count
        == ppc_failure_count
        == cross_engine_failure_count
        == 0
        else "HOLD"
    )
    diagnostic_summary = _diagnostic_summary(primary, nuts, concordance)
    combined_body = {
        "schema_version": VBD_TRAJECTORY_CONCORDANCE_COMBINED_SCHEMA_VERSION,
        "workspace_hash": record["workspace_hash"],
        "freeze_commit": record["freeze_commit"],
        "freeze_manifest_hash": record["freeze_manifest_hash"],
        "plan_hash": record["concordance_plan_hash"],
        "bundle_count": 30,
        "primary_deterministic_lane_fit_count": 90,
        "nuts_lane_fit_count": 90,
        "fresh_deterministic_lane_fit_count": 90,
        "bundle_records_hash": sha256_json(
            [
                {
                    "bundle": primary[index]["bundle"],
                    "primary_output_hash": primary[index]["child_output_hash"],
                    "recomputation_output_hashes": [
                        recomputation[3 * index + lane_ordinal]["child_output_hash"]
                        for lane_ordinal in range(3)
                    ],
                }
                for index in range(30)
            ]
        ),
        "primary_deterministic_records_hash": sha256_json(primary_deterministic),
        "nuts_records_hash": sha256_json(nuts),
        "fresh_deterministic_records_hash": sha256_json(fresh_deterministic),
        "cross_engine_records_hash": sha256_json(concordance),
        "execution_attestations_hash": sha256_json(attestations),
        "diagnostic_summary": diagnostic_summary,
        "diagnostic_summary_hash": diagnostic_summary[
            "diagnostic_summary_hash"
        ],
        "execution_evidence_snapshot_hash": _execution_evidence_snapshot(
            workspace
        )["snapshot_hash"],
        "process_tokens_hash": sha256_json(process_tokens),
        "launch_tokens_hash": sha256_json(launch_tokens),
        "capability_token_hashes_hash": sha256_json(capability_token_hashes),
        "process_phase_binding_hashes_hash": sha256_json(
            process_binding_hashes
        ),
        "all_execution_tokens_hash": sha256_json(all_execution_tokens),
        "all_execution_tokens_pairwise_disjoint": True,
        "hard_failure_count": 0,
        "cross_engine_failure_count": cross_engine_failure_count,
        "sampler_failure_count": sampler_failure_count,
        "ppc_failure_count": ppc_failure_count,
        "state": state,
        "raw_posterior_draws_committed": False,
        "latent_paths_committed": False,
        "input_arrays_committed": False,
        "internal_only": True,
        "synthetic_only": True,
        "aggregate_only": True,
        "customer_output_authorized": False,
        "acceptance_complete": False,
        "task_5_6_complete": False,
    }
    return {**combined_body, "combined_hash": sha256_json(combined_body)}


def _receipt_from_combined(combined: dict) -> dict:
    body = {
        "schema_version": VBD_TRAJECTORY_CONCORDANCE_RECEIPT_SCHEMA_VERSION,
        "freeze_commit": combined["freeze_commit"],
        "freeze_manifest_hash": combined["freeze_manifest_hash"],
        "plan_hash": combined["plan_hash"],
        "bundle_count": combined["bundle_count"],
        "primary_deterministic_lane_fit_count": combined[
            "primary_deterministic_lane_fit_count"
        ],
        "nuts_lane_fit_count": combined["nuts_lane_fit_count"],
        "fresh_deterministic_lane_fit_count": combined[
            "fresh_deterministic_lane_fit_count"
        ],
        "bundle_records_hash": combined["bundle_records_hash"],
        "primary_deterministic_records_hash": combined[
            "primary_deterministic_records_hash"
        ],
        "nuts_records_hash": combined["nuts_records_hash"],
        "fresh_deterministic_records_hash": combined[
            "fresh_deterministic_records_hash"
        ],
        "execution_attestations_hash": combined["execution_attestations_hash"],
        "diagnostic_summary_hash": combined["diagnostic_summary_hash"],
        "hard_failure_count": combined["hard_failure_count"],
        "cross_engine_failure_count": combined["cross_engine_failure_count"],
        "sampler_failure_count": combined["sampler_failure_count"],
        "ppc_failure_count": combined["ppc_failure_count"],
        "state": combined["state"],
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
        "acceptance_complete": False,
        "task_5_6_complete": False,
    }
    return {**body, "receipt_hash": sha256_json(body)}


def _summary_from_combined(combined: dict, receipt: dict) -> dict:
    body = {
        "schema_version": VBD_TRAJECTORY_CONCORDANCE_SUMMARY_SCHEMA_VERSION,
        "freeze_commit": combined["freeze_commit"],
        "freeze_manifest_hash": combined["freeze_manifest_hash"],
        "plan_hash": combined["plan_hash"],
        "receipt_hash": receipt["receipt_hash"],
        "bundle_count": combined["bundle_count"],
        "primary_deterministic_lane_fit_count": combined[
            "primary_deterministic_lane_fit_count"
        ],
        "nuts_lane_fit_count": combined["nuts_lane_fit_count"],
        "fresh_deterministic_lane_fit_count": combined[
            "fresh_deterministic_lane_fit_count"
        ],
        "diagnostic_summary": combined["diagnostic_summary"],
        "state": combined["state"],
        "raw_posterior_draws_committed": False,
        "latent_paths_committed": False,
        "input_arrays_committed": False,
        "internal_only": True,
        "synthetic_only": True,
        "aggregate_only": True,
        "customer_output_authorized": False,
        "acceptance_complete": False,
        "task_5_6_complete": False,
    }
    return {**body, "summary_hash": sha256_json(body)}


def _combined_commit_record(
    *, workspace: Path, combined: dict, receipt: dict, summary: dict
) -> dict:
    body = {
        "schema_version": VBD_TRAJECTORY_CONCORDANCE_COMMIT_SCHEMA_VERSION,
        "workspace_hash": combined["workspace_hash"],
        "freeze_commit": combined["freeze_commit"],
        "freeze_manifest_hash": combined["freeze_manifest_hash"],
        "plan_hash": combined["plan_hash"],
        "combined_hash": combined["combined_hash"],
        "receipt_hash": receipt["receipt_hash"],
        "summary_hash": summary["summary_hash"],
        "combined_file_sha256": _file_sha256(workspace / "combined.json"),
        "receipt_file_sha256": _file_sha256(
            workspace / "concordance_receipt.json"
        ),
        "summary_file_sha256": _file_sha256(
            workspace / "concordance_summary.json"
        ),
        "execution_evidence_snapshot_hash": combined[
            "execution_evidence_snapshot_hash"
        ],
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }
    return {**body, "commit_hash": sha256_json(body)}


def _validate_combined_commit(
    value: object,
    *,
    workspace: Path,
    combined: dict,
    receipt: dict,
    summary: dict,
) -> dict:
    if type(value) is not dict:
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance combined commit marker is invalid"
        )
    expected = _combined_commit_record(
        workspace=workspace,
        combined=combined,
        receipt=receipt,
        summary=summary,
    )
    if value != expected:
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance combined commit marker drifted"
        )
    return value


def combine_vbd_trajectory_concordance_workspace(
    workspace_dir: str | Path,
) -> dict:
    workspace = _workspace_from_user_path(workspace_dir)
    with _exclusive_lock(_safe_workspace_path(workspace, ".runner.lock")) as verify:
        workspace, record, primary, recomputation = _load_workspace(
            workspace, verify_lock_identity=verify
        )
        combined = _combined_value(workspace, record, (primary, recomputation))
        receipt = _receipt_from_combined(combined)
        summary = _summary_from_combined(combined, receipt)
        combined_path = _safe_workspace_path(workspace, "combined.json")
        receipt_path = _safe_workspace_path(
            workspace, "concordance_receipt.json"
        )
        summary_path = _safe_workspace_path(
            workspace, "concordance_summary.json"
        )
        if _workspace_path_exists(combined_path) and read_strict_json(combined_path) != combined:
            raise VbdTrajectoryValidationWorkspaceError(
                "published concordance combined record drifted"
            )
        if _workspace_path_exists(receipt_path) and read_strict_json(receipt_path) != receipt:
            raise VbdTrajectoryValidationWorkspaceError(
                "published concordance receipt drifted"
            )
        if _workspace_path_exists(summary_path) and read_strict_json(summary_path) != summary:
            raise VbdTrajectoryValidationWorkspaceError(
                "published concordance summary drifted"
            )
        write_json_create_once(combined_path, combined, lock_verifier=verify)
        write_json_create_once(receipt_path, receipt, lock_verifier=verify)
        write_json_create_once(summary_path, summary, lock_verifier=verify)
        commit = _combined_commit_record(
            workspace=workspace,
            combined=combined,
            receipt=receipt,
            summary=summary,
        )
        write_json_create_once(
            _safe_workspace_path(workspace, "combined_commit.json"),
            commit,
            lock_verifier=verify,
        )
        _validate_workspace_tree(workspace, complete=True)
        verify()
    return receipt


def _validate_receipt_shape(
    value: object, freeze_identity: dict, *, token: object | None = None
) -> dict:
    if token is not _VERIFIED_RECEIPT_TOKEN:
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance receipt requires complete workspace recomputation"
        )
    expected = {
        "schema_version",
        "freeze_commit",
        "freeze_manifest_hash",
        "plan_hash",
        "bundle_count",
        "primary_deterministic_lane_fit_count",
        "nuts_lane_fit_count",
        "fresh_deterministic_lane_fit_count",
        "bundle_records_hash",
        "primary_deterministic_records_hash",
        "nuts_records_hash",
        "fresh_deterministic_records_hash",
        "execution_attestations_hash",
        "diagnostic_summary_hash",
        "hard_failure_count",
        "cross_engine_failure_count",
        "sampler_failure_count",
        "ppc_failure_count",
        "state",
        "internal_only",
        "synthetic_only",
        "customer_output_authorized",
        "acceptance_complete",
        "task_5_6_complete",
        "receipt_hash",
    }
    if type(value) is not dict or set(value) != expected:
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance receipt shape is invalid"
        )
    body = {key: item for key, item in value.items() if key != "receipt_hash"}
    if (
        value["schema_version"]
        != VBD_TRAJECTORY_CONCORDANCE_RECEIPT_SCHEMA_VERSION
        or value["freeze_commit"] != freeze_identity["freeze_commit"]
        or value["freeze_manifest_hash"] != freeze_identity["freeze_manifest_hash"]
        or value["plan_hash"] != vbd_trajectory_concordance_plan()["plan_hash"]
        or value["bundle_count"] != 30
        or value["primary_deterministic_lane_fit_count"] != 90
        or value["nuts_lane_fit_count"] != 90
        or value["fresh_deterministic_lane_fit_count"] != 90
        or any(
            value[key] != 0
            for key in (
                "hard_failure_count",
                "cross_engine_failure_count",
                "sampler_failure_count",
                "ppc_failure_count",
            )
        )
        or value["state"] != "PASS"
        or value["internal_only"] is not True
        or value["synthetic_only"] is not True
        or value["customer_output_authorized"] is not False
        or value["acceptance_complete"] is not False
        or value["task_5_6_complete"] is not False
        or value["receipt_hash"] != sha256_json(body)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance receipt is incomplete or mismatched"
        )
    for key in (
        "freeze_manifest_hash",
        "plan_hash",
        "bundle_records_hash",
        "primary_deterministic_records_hash",
        "nuts_records_hash",
        "fresh_deterministic_records_hash",
        "execution_attestations_hash",
        "diagnostic_summary_hash",
        "receipt_hash",
    ):
        _strict_sha256(value[key], f"concordance receipt {key}")
    return value


def verify_vbd_trajectory_concordance_receipt_path(
    receipt_path: str | Path, *, freeze_identity: dict
) -> dict:
    path = Path(receipt_path).expanduser().resolve()
    if path.name != "concordance_receipt.json":
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance receipt must use the canonical workspace path"
        )
    workspace = _workspace_from_user_path(path.parent)
    with _exclusive_lock(_safe_workspace_path(workspace, ".runner.lock")) as verify:
        workspace, record, primary, recomputation = _load_workspace(
            workspace, verify_lock_identity=verify
        )
        if any(record[key] != item for key, item in freeze_identity.items()):
            raise VbdTrajectoryValidationWorkspaceError(
                "concordance receipt workspace uses another freeze"
            )
        combined = _combined_value(workspace, record, (primary, recomputation))
        expected = _receipt_from_combined(combined)
        expected_summary = _summary_from_combined(combined, expected)
        observed_combined = read_strict_json(workspace / "combined.json")
        if observed_combined != combined:
            raise VbdTrajectoryValidationWorkspaceError(
                "concordance combined publication differs from recomputation"
            )
        observed = read_strict_json(path)
        if observed != expected:
            raise VbdTrajectoryValidationWorkspaceError(
                "concordance receipt differs from recomputed workspace evidence"
            )
        observed_summary = read_strict_json(
            workspace / "concordance_summary.json"
        )
        if observed_summary != expected_summary:
            raise VbdTrajectoryValidationWorkspaceError(
                "concordance summary differs from recomputed workspace evidence"
            )
        _validate_combined_commit(
            read_strict_json(workspace / "combined_commit.json"),
            workspace=workspace,
            combined=combined,
            receipt=observed,
            summary=observed_summary,
        )
        _validate_workspace_tree(workspace, complete=True)
        return _validate_receipt_shape(
            observed, freeze_identity, token=_VERIFIED_RECEIPT_TOKEN
        )
