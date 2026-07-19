"""Authorization and consume-once claim for the VBD MCSE diagnostic."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import stat
from datetime import datetime

from .hashing import sha256_json
from .vbd_trajectory_precision_diagnostic import (
    vbd_trajectory_precision_diagnostic_v2_plan,
    vbd_trajectory_precision_diagnostic_v2_seed_manifest,
)
from .vbd_trajectory_precision_diagnostic_constants import (
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_COMMIT,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_CLAIM_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_EXECUTION_AUTHORIZATION_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_IMPLEMENTATION_COMMIT,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_INPUT_BINDING_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_CLAIM_ROOT_PATH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_WORKSPACE_PATH,
)
from .vbd_trajectory_validation_resumable import (
    _RUNNER_SOURCE_PATHS_V2 as _RUNNER_SOURCE_PATHS,
    _file_sha256,
    _git_output,
    _implementation_review_refs_are_valid,
    _locked_runtime_package_versions,
    _pinned_site_package_paths,
    _repo_root,
    _strict_sha256,
    _trusted_git_executable,
    build_vbd_trajectory_runtime_identity,
    read_strict_json,
    vbd_trajectory_runner_implementation_manifest,
)
from .vbd_trajectory_types import vbd_trajectory_model_manifest_body


VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_AUTHORIZATION_MANIFEST_RELATIVE_PATH = (
    "inference/evidence/vbd_trajectory_precision_diagnostic_v2_authorization.json"
)
VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_BOOTSTRAP_RELATIVE_PATH = (
    "inference/scripts/vbd_trajectory_precision_diagnostic_v2_bootstrap.py"
)
VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_AUTHORIZATION_MANIFEST_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_PRECISION_DIAGNOSTIC_AUTHORIZATION_MANIFEST_2026_07_V2"
)
VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_EXECUTION_AUTHORIZATION_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_PRECISION_DIAGNOSTIC_EXECUTION_AUTHORIZATION_2026_07_V2"
)
VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CLAIM_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_PRECISION_DIAGNOSTIC_ATTEMPT_CLAIM_2026_07_V2"
)
VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_AUTHORIZATION_SCOPE = (
    "vbd_precision_design_diagnostic_v2_nonacceptance_one_launch"
)
VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CLAIM_FILENAME = "attempt_claim.json"
VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_INPUT_BINDING_FILENAME = "input_binding.json"
VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_OUTPUT_FILENAME = "diagnostic.json"
VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_STAGED_OUTPUT_FILENAME = (
    "diagnostic.staged.json"
)
_COMMIT_RE = re.compile(r"^[0-9a-f]{40}$")
_UTC_RE = re.compile(r"^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$")
_DECISION_REF_RE = re.compile(r"^human-authorization:vbd-mcse-diagnostic/[A-Za-z0-9._-]+$")
_VBD_PRECISION_DIAGNOSTIC_V2_EXECUTION_TOKEN = object()
_VBD_PRECISION_DIAGNOSTIC_V2_BOOTSTRAP_CHILD_TOKEN = object()


class VbdTrajectoryPrecisionDiagnosticV2AuthorizationError(RuntimeError):
    """The diagnostic authorization or one-shot claim is invalid."""


def _authorization_error(message: str, exc: Exception | None = None):
    error = VbdTrajectoryPrecisionDiagnosticV2AuthorizationError(message)
    if exc is None:
        raise error
    raise error from exc


def _strict_commit(value: object, name: str) -> str:
    if type(value) is not str or _COMMIT_RE.fullmatch(value) is None:
        _authorization_error(f"{name} is not an exact commit")
    return value


def _strict_absolute_path(value: object, name: str) -> Path:
    if type(value) is not str or not value or "\x00" in value:
        _authorization_error(f"{name} is invalid")
    path = Path(value)
    if not path.is_absolute() or path != Path(os.path.normpath(value)):
        _authorization_error(f"{name} must be a normalized absolute path")
    return path


def _path_hash(path: Path) -> str:
    return sha256_json(str(path))


def _strict_utc_timestamp(value: object) -> str:
    if type(value) is not str or _UTC_RE.fullmatch(value) is None:
        _authorization_error("diagnostic authorization timestamp is invalid")
    try:
        datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ")
    except ValueError as exc:
        _authorization_error("diagnostic authorization timestamp is invalid", exc)
    return value


def _canonical_json_bytes(value: object) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    ).encode("utf-8")


def _manifest_expected_keys() -> set[str]:
    return {
        "schema_version",
        "implementation_commit",
        "implementation_tree",
        "in_scope_files",
        "in_scope_files_hash",
        "implementation_review_refs",
        "runtime_identity_hash",
        "requirements_lock_hash",
        "implementation_hash",
        "native_library_manifest_hash",
        "model_manifest_hash",
        "diagnostic_plan_hash",
        "seed_manifest_hash",
        "bootstrap_path",
        "bootstrap_sha256",
        "git_executable_path",
        "git_executable_sha256",
        "site_package_paths",
        "canonical_workspace_path",
        "canonical_workspace_identity_hash",
        "external_claim_root_path",
        "external_claim_root_identity_hash",
        "checkpoint_root_path",
        "checkpoint_root_identity_hash",
        "execution_authorization_record_path",
        "execution_authorization_record_path_hash",
        "output_path",
        "output_path_hash",
        "command_argv",
        "command_hash",
        "execution_state",
        "internal_only",
        "synthetic_only",
        "aggregate_only",
        "customer_output_authorized",
        "acceptance_complete",
        "task_2_6_complete",
        "task_5_6_complete",
        "manifest_hash",
    }


def _validate_in_scope_files(value: object) -> list[dict]:
    if type(value) is not list:
        _authorization_error("diagnostic in-scope files must be a list")
    expected_paths = sorted(_RUNNER_SOURCE_PATHS)
    paths = []
    for item in value:
        if type(item) is not dict or set(item) != {"path", "sha256"}:
            _authorization_error("diagnostic in-scope file entry is invalid")
        path = item["path"]
        if (
            type(path) is not str
            or not path
            or path.startswith("/")
            or ".." in Path(path).parts
        ):
            _authorization_error("diagnostic in-scope path is unsafe")
        try:
            _strict_sha256(item["sha256"], "diagnostic in-scope file hash")
        except Exception as exc:
            _authorization_error("diagnostic in-scope file hash is invalid", exc)
        paths.append(path)
    if paths != expected_paths or len(set(paths)) != len(paths):
        _authorization_error("diagnostic in-scope source set is incomplete")
    return value


def validate_vbd_precision_diagnostic_v2_authorization_manifest(value: object) -> dict:
    if type(value) is not dict or set(value) != _manifest_expected_keys():
        _authorization_error("diagnostic authorization manifest shape is invalid")
    body = {key: item for key, item in value.items() if key != "manifest_hash"}
    implementation_commit = _strict_commit(
        value["implementation_commit"], "diagnostic implementation commit"
    )
    _strict_commit(value["implementation_tree"], "diagnostic implementation tree")
    files = _validate_in_scope_files(value["in_scope_files"])
    if not _implementation_review_refs_are_valid(
        value["implementation_review_refs"], implementation_commit
    ):
        _authorization_error("diagnostic implementation review refs are invalid")
    for key in (
        "in_scope_files_hash",
        "runtime_identity_hash",
        "requirements_lock_hash",
        "implementation_hash",
        "native_library_manifest_hash",
        "model_manifest_hash",
        "diagnostic_plan_hash",
        "seed_manifest_hash",
        "bootstrap_sha256",
        "git_executable_sha256",
        "canonical_workspace_identity_hash",
        "external_claim_root_identity_hash",
        "checkpoint_root_identity_hash",
        "execution_authorization_record_path_hash",
        "output_path_hash",
        "command_hash",
        "manifest_hash",
    ):
        try:
            _strict_sha256(value[key], key)
        except Exception as exc:
            _authorization_error(f"{key} is invalid", exc)
    bootstrap = _strict_absolute_path(value["bootstrap_path"], "bootstrap path")
    git_executable = _strict_absolute_path(
        value["git_executable_path"], "Git executable path"
    )
    workspace = _strict_absolute_path(
        value["canonical_workspace_path"], "canonical workspace path"
    )
    claim_root = _strict_absolute_path(
        value["external_claim_root_path"], "external claim root path"
    )
    checkpoint_root = _strict_absolute_path(
        value["checkpoint_root_path"], "checkpoint root path"
    )
    authorization_path = _strict_absolute_path(
        value["execution_authorization_record_path"],
        "execution authorization record path",
    )
    output_path = _strict_absolute_path(value["output_path"], "output path")
    repository_root = _repo_root().resolve()
    if (
        bootstrap
        != _repo_root() / VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_BOOTSTRAP_RELATIVE_PATH
        or any(
            left == right
            or left.is_relative_to(right)
            or right.is_relative_to(left)
            for index, left in enumerate((workspace, claim_root, checkpoint_root))
            for right in (workspace, claim_root, checkpoint_root)[index + 1 :]
        )
        or any(
            path.is_relative_to(repository_root)
            for path in (workspace, claim_root, checkpoint_root)
        )
        or workspace
        == Path(VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_WORKSPACE_PATH)
        or claim_root
        == Path(VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_CLAIM_ROOT_PATH)
        or checkpoint_root
        in {
            Path(VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_WORKSPACE_PATH),
            Path(VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_CLAIM_ROOT_PATH),
        }
        or authorization_path.parent != claim_root
        or output_path.parent != workspace
        or output_path.name != VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_OUTPUT_FILENAME
        or value["canonical_workspace_identity_hash"] != _path_hash(workspace)
        or value["external_claim_root_identity_hash"] != _path_hash(claim_root)
        or value["checkpoint_root_identity_hash"] != _path_hash(checkpoint_root)
        or value["execution_authorization_record_path_hash"]
        != _path_hash(authorization_path)
        or value["output_path_hash"] != _path_hash(output_path)
    ):
        _authorization_error("diagnostic fixed path identities are inconsistent")
    site_paths = value["site_package_paths"]
    if (
        type(site_paths) is not list
        or not site_paths
        or site_paths != sorted(site_paths)
        or len(set(site_paths)) != len(site_paths)
        or any(type(path) is not str or not Path(path).is_absolute() for path in site_paths)
    ):
        _authorization_error("diagnostic site-package paths are invalid")
    command = value["command_argv"]
    expected_command = [
        os.path.realpath(os.sys.executable),
        "-I",
        "-S",
        "-B",
        str(bootstrap),
        "run",
        "--execution-authorization",
        str(authorization_path),
    ]
    if command != expected_command or value["command_hash"] != sha256_json(command):
        _authorization_error("diagnostic command binding is invalid")
    if (
        value["schema_version"]
        != VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_AUTHORIZATION_MANIFEST_SCHEMA_VERSION
        or value["in_scope_files_hash"] != sha256_json(files)
        or value["diagnostic_plan_hash"]
        != vbd_trajectory_precision_diagnostic_v2_plan()["diagnostic_plan_hash"]
        or value["seed_manifest_hash"]
        != vbd_trajectory_precision_diagnostic_v2_seed_manifest()["seed_manifest_hash"]
        or value["execution_state"] != "NOT_RUN"
        or value["internal_only"] is not True
        or value["synthetic_only"] is not True
        or value["aggregate_only"] is not True
        or value["customer_output_authorized"] is not False
        or value["acceptance_complete"] is not False
        or value["task_2_6_complete"] is not False
        or value["task_5_6_complete"] is not False
        or value["manifest_hash"] != sha256_json(body)
        or implementation_commit
        == VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_IMPLEMENTATION_COMMIT
    ):
        _authorization_error("diagnostic manifest posture or hash is invalid")
    return value


def build_vbd_precision_diagnostic_v2_authorization_manifest(
    *,
    implementation_review_refs: dict[str, str],
    canonical_workspace_path: Path,
    external_claim_root_path: Path,
    checkpoint_root_path: Path,
) -> dict:
    """Build manifest-only bytes for later review; never write or authorize them."""

    implementation_commit = _git_output("rev-parse", "HEAD")
    if _git_output("status", "--porcelain=v1", "--untracked-files=all"):
        _authorization_error("diagnostic implementation tree must be clean")
    implementation_tree = _git_output("rev-parse", "HEAD^{tree}")
    if not _implementation_review_refs_are_valid(
        implementation_review_refs, implementation_commit
    ):
        _authorization_error("diagnostic implementation review refs are invalid")
    implementation_manifest = vbd_trajectory_runner_implementation_manifest()
    files = sorted(
        implementation_manifest["files"], key=lambda item: item["path"]
    )
    runtime = build_vbd_trajectory_runtime_identity()
    workspace = canonical_workspace_path.resolve()
    claim_root = external_claim_root_path.resolve()
    checkpoint_root = checkpoint_root_path.resolve()
    authorization_path = claim_root / "execution_authorization.json"
    output_path = workspace / VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_OUTPUT_FILENAME
    bootstrap = (
        _repo_root() / VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_BOOTSTRAP_RELATIVE_PATH
    ).resolve()
    git_executable = _trusted_git_executable().resolve()
    command = [
        os.path.realpath(os.sys.executable),
        "-I",
        "-S",
        "-B",
        str(bootstrap),
        "run",
        "--execution-authorization",
        str(authorization_path),
    ]
    body = {
        "schema_version": (
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_AUTHORIZATION_MANIFEST_SCHEMA_VERSION
        ),
        "implementation_commit": implementation_commit,
        "implementation_tree": implementation_tree,
        "in_scope_files": files,
        "in_scope_files_hash": sha256_json(files),
        "implementation_review_refs": implementation_review_refs,
        "runtime_identity_hash": runtime["runtime_identity_hash"],
        "requirements_lock_hash": hashlib.sha256(
            (_repo_root() / "inference/requirements.lock").read_bytes()
        ).hexdigest(),
        "implementation_hash": implementation_manifest["implementation_hash"],
        "native_library_manifest_hash": sha256_json(runtime["native_libraries"]),
        "model_manifest_hash": sha256_json(vbd_trajectory_model_manifest_body()),
        "diagnostic_plan_hash": vbd_trajectory_precision_diagnostic_v2_plan()[
            "diagnostic_plan_hash"
        ],
        "seed_manifest_hash": vbd_trajectory_precision_diagnostic_v2_seed_manifest()[
            "seed_manifest_hash"
        ],
        "bootstrap_path": str(bootstrap),
        "bootstrap_sha256": _file_sha256(bootstrap),
        "git_executable_path": str(git_executable),
        "git_executable_sha256": _file_sha256(git_executable),
        "site_package_paths": _pinned_site_package_paths(),
        "canonical_workspace_path": str(workspace),
        "canonical_workspace_identity_hash": _path_hash(workspace),
        "external_claim_root_path": str(claim_root),
        "external_claim_root_identity_hash": _path_hash(claim_root),
        "checkpoint_root_path": str(checkpoint_root),
        "checkpoint_root_identity_hash": _path_hash(checkpoint_root),
        "execution_authorization_record_path": str(authorization_path),
        "execution_authorization_record_path_hash": _path_hash(authorization_path),
        "output_path": str(output_path),
        "output_path_hash": _path_hash(output_path),
        "command_argv": command,
        "command_hash": sha256_json(command),
        "execution_state": "NOT_RUN",
        "internal_only": True,
        "synthetic_only": True,
        "aggregate_only": True,
        "customer_output_authorized": False,
        "acceptance_complete": False,
        "task_2_6_complete": False,
        "task_5_6_complete": False,
    }
    return validate_vbd_precision_diagnostic_v2_authorization_manifest(
        {**body, "manifest_hash": sha256_json(body)}
    )


def validate_vbd_precision_diagnostic_v2_execution_authorization(
    value: object,
    *,
    manifest: dict,
    authorization_commit: str,
) -> dict:
    manifest = validate_vbd_precision_diagnostic_v2_authorization_manifest(manifest)
    expected_keys = {
        "schema_version",
        "authorization_commit",
        "authorization_manifest_hash",
        "scope",
        "authorizing_decision_ref",
        "decision_text_hash",
        "authorized_at_utc",
        "maximum_launch_count",
        "canonical_workspace_identity",
        "external_claim_root_identity",
        "checkpoint_root_identity",
        "command_hash",
        "execution_authorization_hash",
    }
    if type(value) is not dict or set(value) != expected_keys:
        _authorization_error("diagnostic execution authorization shape is invalid")
    body = {
        key: item
        for key, item in value.items()
        if key != "execution_authorization_hash"
    }
    _strict_commit(authorization_commit, "diagnostic authorization commit")
    try:
        _strict_sha256(value["decision_text_hash"], "decision text hash")
    except Exception as exc:
        _authorization_error("diagnostic decision text hash is invalid", exc)
    if (
        value["schema_version"]
        != VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_EXECUTION_AUTHORIZATION_SCHEMA_VERSION
        or value["authorization_commit"] != authorization_commit
        or value["authorization_manifest_hash"] != manifest["manifest_hash"]
        or value["scope"] != VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_AUTHORIZATION_SCOPE
        or type(value["authorizing_decision_ref"]) is not str
        or _DECISION_REF_RE.fullmatch(value["authorizing_decision_ref"]) is None
        or _strict_utc_timestamp(value["authorized_at_utc"])
        != value["authorized_at_utc"]
        or type(value["maximum_launch_count"]) is not int
        or value["maximum_launch_count"] != 1
        or value["canonical_workspace_identity"]
        != manifest["canonical_workspace_identity_hash"]
        or value["external_claim_root_identity"]
        != manifest["external_claim_root_identity_hash"]
        or value["checkpoint_root_identity"]
        != manifest["checkpoint_root_identity_hash"]
        or value["command_hash"] != manifest["command_hash"]
        or value["execution_authorization_hash"] != sha256_json(body)
        or authorization_commit
        == VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_COMMIT
        or value["execution_authorization_hash"]
        == VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_EXECUTION_AUTHORIZATION_HASH
    ):
        _authorization_error("diagnostic execution authorization is invalid")
    return value


def _ensure_private_directory(path: Path) -> int:
    try:
        path.mkdir(mode=0o700, parents=False, exist_ok=True)
        info = path.lstat()
        if path.is_symlink() or not stat.S_ISDIR(info.st_mode):
            _authorization_error("diagnostic claim root is unsafe")
        os.chmod(path, 0o700)
        return os.open(path, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    except (OSError, VbdTrajectoryPrecisionDiagnosticV2AuthorizationError) as exc:
        _authorization_error("diagnostic claim root is unavailable", exc)


def _write_exclusive_json_at(
    *, root_fd: int, filename: str, value: dict, label: str
) -> None:
    encoded = _canonical_json_bytes(value) + b"\n"
    file_fd = -1
    try:
        file_fd = os.open(
            filename,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
            0o600,
            dir_fd=root_fd,
        )
        written = 0
        while written < len(encoded):
            written += os.write(file_fd, encoded[written:])
        os.fsync(file_fd)
        os.fsync(root_fd)
    except OSError as exc:
        _authorization_error(f"{label} already exists or could not be written", exc)
    finally:
        if file_fd >= 0:
            os.close(file_fd)


def _vbd_precision_diagnostic_v2_claim_body(
    *, manifest: dict, execution_authorization: dict, authorization_commit: str
) -> dict:
    return {
        "schema_version": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CLAIM_SCHEMA_VERSION,
        "authorization_commit": authorization_commit,
        "authorization_manifest_hash": manifest["manifest_hash"],
        "execution_authorization_hash": execution_authorization[
            "execution_authorization_hash"
        ],
        "implementation_commit": manifest["implementation_commit"],
        "implementation_review_refs": manifest["implementation_review_refs"],
        "command_hash": manifest["command_hash"],
        "bootstrap_sha256": manifest["bootstrap_sha256"],
        "canonical_workspace_identity_hash": manifest[
            "canonical_workspace_identity_hash"
        ],
        "external_claim_root_identity_hash": manifest[
            "external_claim_root_identity_hash"
        ],
        "checkpoint_root_identity_hash": manifest["checkpoint_root_identity_hash"],
        "diagnostic_plan_hash": manifest["diagnostic_plan_hash"],
        "seed_manifest_hash": manifest["seed_manifest_hash"],
        "maximum_launch_count": 1,
        "state": "CONSUMED_BEFORE_EXECUTION",
    }


def validate_vbd_precision_diagnostic_v2_claim(
    value: object,
    *,
    manifest: dict,
    execution_authorization: dict,
    authorization_commit: str,
) -> dict:
    manifest = validate_vbd_precision_diagnostic_v2_authorization_manifest(manifest)
    execution_authorization = validate_vbd_precision_diagnostic_v2_execution_authorization(
        execution_authorization,
        manifest=manifest,
        authorization_commit=authorization_commit,
    )
    body = _vbd_precision_diagnostic_v2_claim_body(
        manifest=manifest,
        execution_authorization=execution_authorization,
        authorization_commit=authorization_commit,
    )
    expected = {**body, "claim_hash": sha256_json(body)}
    if (
        value != expected
        or value.get("claim_hash")
        == VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_CLAIM_HASH
    ):
        _authorization_error("diagnostic launch claim is invalid")
    return value


def consume_vbd_precision_diagnostic_v2_claim(
    *,
    manifest: dict,
    execution_authorization: dict,
    authorization_commit: str,
) -> dict:
    """Consume the one diagnostic launch; every existing claim rejects."""

    manifest = validate_vbd_precision_diagnostic_v2_authorization_manifest(manifest)
    execution_authorization = validate_vbd_precision_diagnostic_v2_execution_authorization(
        execution_authorization,
        manifest=manifest,
        authorization_commit=authorization_commit,
    )
    claim_root = _strict_absolute_path(
        manifest["external_claim_root_path"], "external claim root"
    )
    body = _vbd_precision_diagnostic_v2_claim_body(
        manifest=manifest,
        execution_authorization=execution_authorization,
        authorization_commit=authorization_commit,
    )
    claim = {**body, "claim_hash": sha256_json(body)}
    root_fd = _ensure_private_directory(claim_root)
    try:
        _write_exclusive_json_at(
            root_fd=root_fd,
            filename=VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CLAIM_FILENAME,
            value=claim,
            label="diagnostic launch claim",
        )
    finally:
        os.close(root_fd)
    return claim


def bind_vbd_precision_diagnostic_v2_input(
    *,
    manifest: dict,
    claim: dict,
    synthetic_input_hash: str,
    panel_manifest_root: str,
    prepared_input_hashes: list[str],
    model_input_hashes: list[str],
) -> dict:
    """Bind generated input after the launch is already irreversibly consumed."""

    manifest = validate_vbd_precision_diagnostic_v2_authorization_manifest(manifest)
    if (
        type(claim) is not dict
        or claim.get("claim_hash")
        != sha256_json({key: item for key, item in claim.items() if key != "claim_hash"})
        or claim.get("authorization_manifest_hash") != manifest["manifest_hash"]
    ):
        _authorization_error("diagnostic input binding claim is invalid")
    for name, value in (
        ("synthetic input hash", synthetic_input_hash),
        ("panel manifest root", panel_manifest_root),
    ):
        try:
            _strict_sha256(value, name)
        except Exception as exc:
            _authorization_error(f"{name} is invalid", exc)
    if (
        type(prepared_input_hashes) is not list
        or type(model_input_hashes) is not list
        or len(prepared_input_hashes) != 3
        or len(model_input_hashes) != 3
    ):
        _authorization_error("diagnostic lane input hashes are incomplete")
    for index, value in enumerate((*prepared_input_hashes, *model_input_hashes)):
        try:
            _strict_sha256(value, f"diagnostic lane input hash {index}")
        except Exception as exc:
            _authorization_error("diagnostic lane input hash is invalid", exc)
    body = {
        "schema_version": "FT_AI_VALUE_VBD_PRECISION_DIAGNOSTIC_INPUT_BINDING_2026_07_V2",
        "claim_hash": claim["claim_hash"],
        "synthetic_input_hash": synthetic_input_hash,
        "panel_manifest_root": panel_manifest_root,
        "prepared_input_hashes": prepared_input_hashes,
        "model_input_hashes": model_input_hashes,
    }
    binding = {**body, "input_binding_hash": sha256_json(body)}
    if (
        binding["input_binding_hash"]
        == VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_INPUT_BINDING_HASH
    ):
        _authorization_error("consumed V1 input binding cannot satisfy V2")
    root_fd = _ensure_private_directory(
        Path(manifest["external_claim_root_path"])
    )
    try:
        _write_exclusive_json_at(
            root_fd=root_fd,
            filename=VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_INPUT_BINDING_FILENAME,
            value=binding,
            label="diagnostic input binding",
        )
    finally:
        os.close(root_fd)
    return binding


def write_vbd_precision_diagnostic_v2_staged_output(
    *, manifest: dict, record: dict
) -> None:
    manifest = validate_vbd_precision_diagnostic_v2_authorization_manifest(manifest)
    workspace = Path(manifest["canonical_workspace_path"])
    if workspace.exists():
        if workspace.is_symlink() or not workspace.is_dir():
            _authorization_error("diagnostic workspace is unsafe")
    else:
        try:
            workspace.mkdir(mode=0o700, parents=False)
        except OSError as exc:
            _authorization_error("diagnostic workspace cannot be created", exc)
    os.chmod(workspace, 0o700)
    workspace_fd = os.open(
        workspace, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
    )
    try:
        _write_exclusive_json_at(
            root_fd=workspace_fd,
            filename=VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_STAGED_OUTPUT_FILENAME,
            value=record,
            label="diagnostic staged output",
        )
    finally:
        os.close(workspace_fd)


def verify_vbd_precision_diagnostic_v2_authorization_commit(
    *, manifest: dict, authorization_commit: str
) -> None:
    """Verify clean exact A, sole parent D, and its one-file manifest diff."""

    manifest = validate_vbd_precision_diagnostic_v2_authorization_manifest(manifest)
    authorization_commit = _strict_commit(
        authorization_commit, "diagnostic authorization commit"
    )
    if _git_output("status", "--porcelain=v1", "--untracked-files=all"):
        _authorization_error("diagnostic authorization checkout is dirty")
    if _git_output("rev-parse", "HEAD") != authorization_commit:
        _authorization_error("diagnostic checkout is not exact authorization commit")
    parents = _git_output(
        "rev-list", "--parents", "-n", "1", authorization_commit
    ).split()
    if parents != [authorization_commit, manifest["implementation_commit"]]:
        _authorization_error("diagnostic authorization commit is not sole-child A")
    changed = _git_output(
        "diff-tree",
        "--no-commit-id",
        "--name-only",
        "-r",
        manifest["implementation_commit"],
        authorization_commit,
    ).splitlines()
    if changed != [
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_AUTHORIZATION_MANIFEST_RELATIVE_PATH
    ]:
        _authorization_error("diagnostic D..A diff is not manifest-only")
    if _git_output("rev-parse", f"{manifest['implementation_commit']}^{{tree}}") != manifest[
        "implementation_tree"
    ]:
        _authorization_error("diagnostic implementation tree binding is invalid")


def read_vbd_precision_diagnostic_v2_execution_authorization(
    path: Path,
    *,
    manifest: dict,
    authorization_commit: str,
) -> dict:
    expected = _strict_absolute_path(
        manifest["execution_authorization_record_path"],
        "execution authorization path",
    )
    if path.resolve() != expected:
        _authorization_error("diagnostic execution authorization path is off-plan")
    try:
        value = read_strict_json(path)
    except Exception as exc:
        _authorization_error("diagnostic execution authorization cannot be read", exc)
    return validate_vbd_precision_diagnostic_v2_execution_authorization(
        value,
        manifest=manifest,
        authorization_commit=authorization_commit,
    )


def read_vbd_precision_diagnostic_v2_claim(
    *,
    manifest: dict,
    execution_authorization: dict,
    authorization_commit: str,
) -> dict:
    claim_path = (
        Path(manifest["external_claim_root_path"])
        / VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CLAIM_FILENAME
    )
    try:
        claim = read_strict_json(claim_path)
    except Exception as exc:
        _authorization_error("diagnostic launch claim cannot be read", exc)
    return validate_vbd_precision_diagnostic_v2_claim(
        claim,
        manifest=manifest,
        execution_authorization=execution_authorization,
        authorization_commit=authorization_commit,
    )


def bootstrap_claimed_vbd_precision_diagnostic_v2(
    *,
    manifest: dict,
    authorization_path: Path,
    authorization_commit: str,
    command_argv: list[str],
    _bootstrap_token: object,
) -> dict:
    """Execute only after the standalone bootstrap consumed the fixed claim."""

    if _bootstrap_token is not _VBD_PRECISION_DIAGNOSTIC_V2_BOOTSTRAP_CHILD_TOKEN:
        _authorization_error("diagnostic execution requires its bootstrap child token")
    manifest = validate_vbd_precision_diagnostic_v2_authorization_manifest(manifest)
    if command_argv != manifest["command_argv"]:
        _authorization_error("diagnostic bootstrap argv differs from its manifest")
    verify_vbd_precision_diagnostic_v2_authorization_commit(
        manifest=manifest,
        authorization_commit=authorization_commit,
    )
    authorization = read_vbd_precision_diagnostic_v2_execution_authorization(
        authorization_path,
        manifest=manifest,
        authorization_commit=authorization_commit,
    )
    claim = read_vbd_precision_diagnostic_v2_claim(
        manifest=manifest,
        execution_authorization=authorization,
        authorization_commit=authorization_commit,
    )
    from .vbd_trajectory_precision_diagnostic_v2_execution import (
        execute_authorized_vbd_precision_diagnostic_v2,
    )

    record = execute_authorized_vbd_precision_diagnostic_v2(
        manifest=manifest,
        execution_authorization=authorization,
        claim=claim,
        _execution_token=_VBD_PRECISION_DIAGNOSTIC_V2_EXECUTION_TOKEN,
    )
    write_vbd_precision_diagnostic_v2_staged_output(
        manifest=manifest, record=record
    )
    return record
