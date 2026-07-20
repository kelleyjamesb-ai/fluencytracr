"""Authorization and one-shot lifecycle for the VBD marginalization diagnostic."""

from __future__ import annotations

from datetime import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import stat

from .hashing import sha256_json
from .vbd_trajectory_group_effect_marginalization_constants import (
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LANE_ORDER,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LIFECYCLE_ROOT_PATH,
    VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_WORKSPACE_PATH,
)
from .vbd_trajectory_group_effect_geometry_constants import (
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_LIFECYCLE_ROOT_PATH,
    VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_WORKSPACE_PATH,
)
from .vbd_trajectory_group_effect_marginalization_diagnostic import (
    validate_vbd_trajectory_group_effect_marginalization_record,
    vbd_trajectory_group_effect_marginalization_plan,
    vbd_trajectory_group_effect_marginalization_seed_manifest,
)
from .vbd_trajectory_precision_diagnostic_constants import (
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_CLAIM_ROOT_PATH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_WORKSPACE_PATH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_CLAIM_ROOT_PATH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_CHECKPOINT_ROOT_PATH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_WORKSPACE_PATH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CHECKPOINT_ROOT_PATH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CLAIM_ROOT_PATH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_WORKSPACE_PATH,
)
from .vbd_trajectory_types import vbd_trajectory_model_manifest_body
from .vbd_trajectory_validation_resumable import (
    _RUNNER_SOURCE_PATHS as _BASE_RUNNER_SOURCE_PATHS,
    _file_sha256,
    _git_output,
    _implementation_review_refs_are_valid,
    _pinned_site_package_paths,
    _repo_root,
    _strict_sha256,
    _trusted_git_executable,
    build_vbd_trajectory_runtime_identity,
    read_strict_json,
    vbd_trajectory_runner_implementation_manifest,
)


_MARGINALIZATION_RUNNER_SOURCE_PATHS = tuple(
    sorted(
        (
            *_BASE_RUNNER_SOURCE_PATHS,
            "inference/scripts/vbd_trajectory_group_effect_marginalization_bootstrap.py",
            "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_marginalization.py",
            "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_marginalization_authorization.py",
            "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_marginalization_constants.py",
            "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_marginalization_diagnostic.py",
            "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_marginalization_execution.py",
            "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_marginalization_projection.py",
        )
    )
)


VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_AUTHORIZATION_MANIFEST_RELATIVE_PATH = (
    "inference/evidence/vbd_trajectory_group_effect_marginalization_authorization.json"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_BOOTSTRAP_RELATIVE_PATH = (
    "inference/scripts/vbd_trajectory_group_effect_marginalization_bootstrap.py"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_AUTHORIZATION_MANIFEST_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_GROUP_EFFECT_MARGINALIZATION_AUTHORIZATION_MANIFEST_2026_07_V1"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_EXECUTION_AUTHORIZATION_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_GROUP_EFFECT_MARGINALIZATION_EXECUTION_AUTHORIZATION_2026_07_V1"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LAUNCH_PERMIT_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_GROUP_EFFECT_MARGINALIZATION_LAUNCH_PERMIT_2026_07_V1"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CLAIM_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_GROUP_EFFECT_MARGINALIZATION_ATTEMPT_CLAIM_2026_07_V1"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_INPUT_BINDING_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_GROUP_EFFECT_MARGINALIZATION_INPUT_BINDING_2026_07_V1"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_COMPLETION_RECEIPT_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_GROUP_EFFECT_MARGINALIZATION_COMPLETION_RECEIPT_2026_07_V1"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_AUTHORIZATION_SCOPE = (
    "vbd_group_effect_marginalization_diagnostic_v1_nonacceptance_one_launch"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_EXECUTION_AUTHORIZATION_FILENAME = (
    "execution_authorization.json"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LAUNCH_PERMIT_FILENAME = (
    "launch_permit.json"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CONSUMED_PERMIT_FILENAME = (
    "launch_permit.consumed.json"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CLAIM_FILENAME = "attempt_claim.json"
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_INPUT_BINDING_FILENAME = "input_binding.json"
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_COMPLETION_RECEIPT_FILENAME = (
    "completion_receipt.json"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_OUTPUT_FILENAME = (
    "marginalization_diagnostic.json"
)
VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_STAGED_OUTPUT_FILENAME = (
    "marginalization_diagnostic.staged.json"
)
_COMMIT_RE = re.compile(r"^[0-9a-f]{40}$")
_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
_TOKEN_RE = re.compile(r"^[0-9a-f]{64}$")
_UTC_RE = re.compile(
    r"^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$"
)
_DECISION_REF_RE = re.compile(
    r"^human-authorization:vbd-marginalization-diagnostic/[A-Za-z0-9._-]+$"
)
_VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_EXECUTION_TOKEN = object()
_VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_BOOTSTRAP_CHILD_TOKEN = object()
_VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_PUBLICATION_TOKEN = object()


class VbdTrajectoryGroupEffectMarginalizationAuthorizationError(RuntimeError):
    """The marginalization diagnostic authorization lifecycle is invalid."""


def _authorization_error(message: str, exc: Exception | None = None):
    error = VbdTrajectoryGroupEffectMarginalizationAuthorizationError(message)
    if exc is None:
        raise error
    raise error from exc


def _strict_commit(value: object, name: str) -> str:
    if type(value) is not str or _COMMIT_RE.fullmatch(value) is None:
        _authorization_error(f"{name} is not an exact commit")
    return value


def _strict_hash(value: object, name: str) -> str:
    if type(value) is not str or _SHA256_RE.fullmatch(value) is None:
        _authorization_error(f"{name} is invalid")
    return value


def _strict_timestamp(value: object) -> str:
    if type(value) is not str or _UTC_RE.fullmatch(value) is None:
        _authorization_error("marginalization authorization timestamp is invalid")
    try:
        datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ")
    except ValueError as exc:
        _authorization_error("marginalization authorization timestamp is invalid", exc)
    return value


def _strict_absolute_path(value: object, name: str) -> Path:
    if type(value) is not str or not value or "\x00" in value:
        _authorization_error(f"{name} is invalid")
    path = Path(value)
    if not path.is_absolute() or path != Path(os.path.normpath(value)):
        _authorization_error(f"{name} must be a normalized absolute path")
    return path


def _open_absolute_directory_no_symlinks(
    path: Path,
    *,
    create_leaf: bool,
) -> int:
    path = _strict_absolute_path(str(path), "marginalization directory")
    descriptor = os.open("/", os.O_RDONLY | os.O_DIRECTORY)
    try:
        parts = path.parts[1:]
        for index, part in enumerate(parts):
            if create_leaf and index == len(parts) - 1:
                created = False
                try:
                    os.mkdir(part, mode=0o700, dir_fd=descriptor)
                    created = True
                except FileExistsError:
                    pass
                if created:
                    os.fsync(descriptor)
            child = os.open(
                part,
                os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW,
                dir_fd=descriptor,
            )
            info = os.fstat(child)
            if not stat.S_ISDIR(info.st_mode):
                os.close(child)
                raise OSError("path component is not a directory")
            os.close(descriptor)
            descriptor = child
        return descriptor
    except Exception:
        os.close(descriptor)
        raise


def _path_hash(path: Path) -> str:
    return sha256_json(str(path))


def _canonical_bytes(value: object) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    ).encode("utf-8") + b"\n"


def _exact_native_equal(left: object, right: object) -> bool:
    if type(left) is not type(right):
        return False
    if type(left) is dict:
        return set(left) == set(right) and all(
            _exact_native_equal(left[key], right[key]) for key in left
        )
    if type(left) in (list, tuple):
        return len(left) == len(right) and all(
            _exact_native_equal(left_item, right_item)
            for left_item, right_item in zip(left, right, strict=True)
        )
    return left == right


def _strict_pairs(pairs: list[tuple[str, object]]) -> dict:
    value = {}
    for key, item in pairs:
        if key in value:
            _authorization_error("marginalization lifecycle JSON has duplicate keys")
        value[key] = item
    return value


class _CanonicalJsonBinding:
    def __init__(
        self,
        *,
        descriptor: int,
        root_fd: int,
        name: str,
        value: dict,
        encoded: bytes,
        info: os.stat_result,
        label: str,
    ) -> None:
        self.descriptor = descriptor
        self.root_fd = root_fd
        self.name = name
        self.value = value
        self.encoded = encoded
        self.info = info
        self.file_hash = hashlib.sha256(encoded).hexdigest()
        self.label = label

    def revalidate(self, *, expected_link_count: int | None = None) -> None:
        try:
            opened = os.fstat(self.descriptor)
            current = os.stat(
                self.name,
                dir_fd=self.root_fd,
                follow_symlinks=False,
            )
            os.lseek(self.descriptor, 0, os.SEEK_SET)
            chunks = []
            while True:
                chunk = os.read(self.descriptor, 1 << 20)
                if not chunk:
                    break
                chunks.append(chunk)
            current_bytes = b"".join(chunks)
        except OSError as exc:
            _authorization_error(f"{self.label} binding cannot be revalidated", exc)
        if (
            not stat.S_ISREG(opened.st_mode)
            or not stat.S_ISREG(current.st_mode)
            or (opened.st_dev, opened.st_ino)
            != (self.info.st_dev, self.info.st_ino)
            or (current.st_dev, current.st_ino)
            != (self.info.st_dev, self.info.st_ino)
            or current_bytes != self.encoded
            or hashlib.sha256(current_bytes).hexdigest() != self.file_hash
            or (
                expected_link_count is not None
                and (
                    opened.st_nlink != expected_link_count
                    or current.st_nlink != expected_link_count
                )
            )
        ):
            _authorization_error(f"{self.label} binding changed")

    def close(self) -> None:
        os.close(self.descriptor)
        os.close(self.root_fd)


def _open_canonical_json_binding(path: Path, label: str) -> _CanonicalJsonBinding:
    descriptor = -1
    root_fd = -1
    try:
        root_fd = _open_absolute_directory_no_symlinks(
            path.parent,
            create_leaf=False,
        )
        descriptor = os.open(
            path.name,
            os.O_RDONLY | os.O_NOFOLLOW,
            dir_fd=root_fd,
        )
        info = os.fstat(descriptor)
        if not stat.S_ISREG(info.st_mode):
            raise OSError("path is not a regular file")
        chunks = []
        while True:
            chunk = os.read(descriptor, 1 << 20)
            if not chunk:
                break
            chunks.append(chunk)
        encoded = b"".join(chunks)
        value = json.loads(
            encoded.decode("utf-8"),
            object_pairs_hook=_strict_pairs,
            parse_constant=lambda _value: _authorization_error(
                f"{label} contains a nonfinite value"
            ),
        )
        if type(value) is not dict or encoded != _canonical_bytes(value):
            _authorization_error(f"{label} bytes are noncanonical")
        binding = _CanonicalJsonBinding(
            descriptor=descriptor,
            root_fd=root_fd,
            name=path.name,
            value=value,
            encoded=encoded,
            info=info,
            label=label,
        )
        descriptor = -1
        root_fd = -1
        return binding
    except VbdTrajectoryGroupEffectMarginalizationAuthorizationError:
        raise
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        _authorization_error(f"{label} cannot be read", exc)
    finally:
        if descriptor >= 0:
            os.close(descriptor)
        if root_fd >= 0:
            os.close(root_fd)


def _read_canonical_json_with_identity(
    path: Path,
    label: str,
) -> tuple[dict, os.stat_result, str]:
    binding = _open_canonical_json_binding(path, label)
    try:
        binding.revalidate()
        return binding.value, binding.info, binding.file_hash
    finally:
        binding.close()


def _read_canonical_json(path: Path, label: str) -> dict:
    value, _info, _file_hash = _read_canonical_json_with_identity(path, label)
    return value


def _read_bound_canonical_json(path: Path, label: str, validator) -> dict:
    binding = _open_canonical_json_binding(path, label)
    try:
        value = validator(binding.value)
        binding.revalidate(expected_link_count=1)
        return value
    finally:
        binding.close()


def _write_exclusive_json(path: Path, value: dict, label: str) -> None:
    encoded = _canonical_bytes(value)
    root = path.parent
    descriptor = -1
    root_fd = -1
    try:
        root_fd = _open_absolute_directory_no_symlinks(
            root,
            create_leaf=True,
        )
        os.fchmod(root_fd, 0o700)
        descriptor = os.open(
            path.name,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
            0o600,
            dir_fd=root_fd,
        )
        written = 0
        while written < len(encoded):
            written += os.write(descriptor, encoded[written:])
        os.fsync(descriptor)
        os.fsync(root_fd)
    except OSError as exc:
        _authorization_error(f"{label} could not be written create-once", exc)
    finally:
        if descriptor >= 0:
            os.close(descriptor)
        if root_fd >= 0:
            os.close(root_fd)
    if not _exact_native_equal(_read_canonical_json(path, label), value):
        _authorization_error(f"{label} readback differs")


def _manifest_keys() -> set[str]:
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
        "lifecycle_root_path",
        "lifecycle_root_identity_hash",
        "execution_authorization_record_path",
        "execution_authorization_record_path_hash",
        "launch_permit_path",
        "launch_permit_path_hash",
        "consumed_permit_path",
        "consumed_permit_path_hash",
        "claim_path",
        "claim_path_hash",
        "input_binding_path",
        "input_binding_path_hash",
        "completion_receipt_path",
        "completion_receipt_path_hash",
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
        _authorization_error("marginalization in-scope files must be a list")
    expected_paths = sorted(_MARGINALIZATION_RUNNER_SOURCE_PATHS)
    paths = []
    for item in value:
        if type(item) is not dict or set(item) != {"path", "sha256"}:
            _authorization_error("marginalization in-scope file entry is invalid")
        path = item["path"]
        if (
            type(path) is not str
            or not path
            or path.startswith("/")
            or ".." in Path(path).parts
        ):
            _authorization_error("marginalization in-scope path is unsafe")
        _strict_hash(item["sha256"], "marginalization in-scope file hash")
        paths.append(path)
    if paths != expected_paths or len(set(paths)) != len(paths):
        _authorization_error("marginalization in-scope source set is incomplete")
    return value


def _fixed_paths(manifest: dict) -> dict[str, Path]:
    return {
        "workspace": _strict_absolute_path(
            manifest["canonical_workspace_path"],
            "marginalization workspace",
        ),
        "lifecycle": _strict_absolute_path(
            manifest["lifecycle_root_path"],
            "marginalization lifecycle root",
        ),
        "authorization": _strict_absolute_path(
            manifest["execution_authorization_record_path"],
            "marginalization execution authorization",
        ),
        "permit": _strict_absolute_path(
            manifest["launch_permit_path"],
            "marginalization launch permit",
        ),
        "consumed_permit": _strict_absolute_path(
            manifest["consumed_permit_path"],
            "marginalization consumed permit",
        ),
        "claim": _strict_absolute_path(
            manifest["claim_path"],
            "marginalization claim",
        ),
        "input": _strict_absolute_path(
            manifest["input_binding_path"],
            "marginalization input binding",
        ),
        "completion": _strict_absolute_path(
            manifest["completion_receipt_path"],
            "marginalization completion receipt",
        ),
        "output": _strict_absolute_path(
            manifest["output_path"],
            "marginalization output",
        ),
    }


_ROOT_PHASE_FILES = {
    "BEFORE_PERMIT": (None, None),
    "PERMIT_AVAILABLE": (
        {VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LAUNCH_PERMIT_FILENAME},
        None,
    ),
    "READY_TO_LAUNCH": (
        {
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_EXECUTION_AUTHORIZATION_FILENAME,
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LAUNCH_PERMIT_FILENAME,
        },
        None,
    ),
    "CLAIMED": (
        {
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_EXECUTION_AUTHORIZATION_FILENAME,
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CONSUMED_PERMIT_FILENAME,
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CLAIM_FILENAME,
        },
        None,
    ),
    "INPUT_BOUND": (
        {
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_EXECUTION_AUTHORIZATION_FILENAME,
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CONSUMED_PERMIT_FILENAME,
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CLAIM_FILENAME,
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_INPUT_BINDING_FILENAME,
        },
        None,
    ),
    "COMPLETION_RECORDED": (
        {
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_EXECUTION_AUTHORIZATION_FILENAME,
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CONSUMED_PERMIT_FILENAME,
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CLAIM_FILENAME,
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_INPUT_BINDING_FILENAME,
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_COMPLETION_RECEIPT_FILENAME,
        },
        None,
    ),
    "STAGED": (
        {
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_EXECUTION_AUTHORIZATION_FILENAME,
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CONSUMED_PERMIT_FILENAME,
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CLAIM_FILENAME,
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_INPUT_BINDING_FILENAME,
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_COMPLETION_RECEIPT_FILENAME,
        },
        {VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_STAGED_OUTPUT_FILENAME},
    ),
    "PUBLISHING": (
        {
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_EXECUTION_AUTHORIZATION_FILENAME,
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CONSUMED_PERMIT_FILENAME,
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CLAIM_FILENAME,
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_INPUT_BINDING_FILENAME,
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_COMPLETION_RECEIPT_FILENAME,
        },
        {
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_STAGED_OUTPUT_FILENAME,
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_OUTPUT_FILENAME,
        },
    ),
    "PUBLISHED": (
        {
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_EXECUTION_AUTHORIZATION_FILENAME,
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CONSUMED_PERMIT_FILENAME,
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CLAIM_FILENAME,
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_INPUT_BINDING_FILENAME,
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_COMPLETION_RECEIPT_FILENAME,
        },
        {VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_OUTPUT_FILENAME},
    ),
}


def _validate_root_files(
    path: Path,
    expected: set[str] | None,
    label: str,
    *,
    expected_link_count: int = 1,
) -> int | None:
    if expected is None:
        if path.exists() or path.is_symlink():
            _authorization_error(f"{label} must not exist")
        return None
    descriptor = -1
    try:
        descriptor = _open_absolute_directory_no_symlinks(
            path,
            create_leaf=False,
        )
        names = set(os.listdir(descriptor))
        if names != expected:
            _authorization_error(f"{label} contents are off plan")
        root_info = os.fstat(descriptor)
        if (
            root_info.st_uid != os.getuid()
            or stat.S_IMODE(root_info.st_mode) != 0o700
        ):
            _authorization_error(f"{label} ownership or mode is unsafe")
        for name in names:
            child_info = os.stat(name, dir_fd=descriptor, follow_symlinks=False)
            if (
                not stat.S_ISREG(child_info.st_mode)
                or child_info.st_nlink != expected_link_count
                or child_info.st_dev != root_info.st_dev
                or child_info.st_uid != os.getuid()
                or stat.S_IMODE(child_info.st_mode) != 0o600
            ):
                _authorization_error(f"{label} file is unsafe")
        return root_info.st_dev
    except VbdTrajectoryGroupEffectMarginalizationAuthorizationError:
        raise
    except OSError as exc:
        _authorization_error(f"{label} cannot be validated", exc)
    finally:
        if descriptor >= 0:
            os.close(descriptor)


def preflight_vbd_trajectory_group_effect_marginalization_fixed_roots(
    *, manifest: dict, phase: str
) -> None:
    manifest = validate_vbd_trajectory_group_effect_marginalization_authorization_manifest(
        manifest
    )
    if phase not in _ROOT_PHASE_FILES:
        _authorization_error("marginalization root phase is invalid")
    lifecycle_files, workspace_files = _ROOT_PHASE_FILES[phase]
    paths = _fixed_paths(manifest)
    lifecycle_device = _validate_root_files(
        paths["lifecycle"], lifecycle_files, "marginalization lifecycle root"
    )
    workspace_device = _validate_root_files(
        paths["workspace"],
        workspace_files,
        "marginalization workspace",
        expected_link_count=2 if phase == "PUBLISHING" else 1,
    )
    if (
        lifecycle_device is not None
        and workspace_device is not None
        and lifecycle_device != workspace_device
    ):
        _authorization_error("marginalization fixed roots cross devices")


def validate_vbd_trajectory_group_effect_marginalization_authorization_manifest(
    value: object,
) -> dict:
    if type(value) is not dict or set(value) != _manifest_keys():
        _authorization_error("marginalization authorization manifest shape is invalid")
    body = {key: item for key, item in value.items() if key != "manifest_hash"}
    implementation_commit = _strict_commit(
        value["implementation_commit"],
        "marginalization implementation commit",
    )
    _strict_commit(value["implementation_tree"], "marginalization implementation tree")
    files = _validate_in_scope_files(value["in_scope_files"])
    current_implementation = vbd_trajectory_runner_implementation_manifest(
        source_paths=_MARGINALIZATION_RUNNER_SOURCE_PATHS
    )
    current_runtime = build_vbd_trajectory_runtime_identity()
    if not _implementation_review_refs_are_valid(
        value["implementation_review_refs"],
        implementation_commit,
    ):
        _authorization_error("marginalization implementation review refs are invalid")
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
        "lifecycle_root_identity_hash",
        "execution_authorization_record_path_hash",
        "launch_permit_path_hash",
        "consumed_permit_path_hash",
        "claim_path_hash",
        "input_binding_path_hash",
        "completion_receipt_path_hash",
        "output_path_hash",
        "command_hash",
        "manifest_hash",
    ):
        _strict_hash(value[key], key)
    paths = _fixed_paths(value)
    repo = _repo_root().resolve()
    workspace = paths["workspace"]
    lifecycle = paths["lifecycle"]
    external_prior_roots = tuple(
        Path(item)
        for item in (
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_WORKSPACE_PATH,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_CLAIM_ROOT_PATH,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_WORKSPACE_PATH,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_CLAIM_ROOT_PATH,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_CHECKPOINT_ROOT_PATH,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_WORKSPACE_PATH,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CLAIM_ROOT_PATH,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CHECKPOINT_ROOT_PATH,
            VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_WORKSPACE_PATH,
            VBD_TRAJECTORY_GROUP_EFFECT_GEOMETRY_LIFECYCLE_ROOT_PATH,
        )
    )
    lifecycle_children = {
        paths["authorization"],
        paths["permit"],
        paths["consumed_permit"],
        paths["claim"],
        paths["input"],
        paths["completion"],
    }
    bootstrap = _strict_absolute_path(
        value["bootstrap_path"],
        "marginalization bootstrap",
    )
    git_executable = _strict_absolute_path(
        value["git_executable_path"],
        "marginalization Git executable",
    )
    expected_command = [
        os.path.realpath(os.sys.executable),
        "-I",
        "-S",
        "-B",
        str(bootstrap),
        "run",
        "--execution-authorization",
        str(paths["authorization"]),
    ]
    if (
        value["schema_version"]
        != VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_AUTHORIZATION_MANIFEST_SCHEMA_VERSION
        or files
        != sorted(current_implementation["files"], key=lambda item: item["path"])
        or value["implementation_hash"]
        != current_implementation["implementation_hash"]
        or value["in_scope_files_hash"] != sha256_json(files)
        or value["runtime_identity_hash"]
        != current_runtime["runtime_identity_hash"]
        or value["native_library_manifest_hash"]
        != sha256_json(current_runtime["native_libraries"])
        or value["requirements_lock_hash"]
        != hashlib.sha256(
            (_repo_root() / "inference/requirements.lock").read_bytes()
        ).hexdigest()
        or value["model_manifest_hash"]
        != sha256_json(vbd_trajectory_model_manifest_body())
        or value["diagnostic_plan_hash"]
        != vbd_trajectory_group_effect_marginalization_plan()["plan_hash"]
        or value["seed_manifest_hash"]
        != vbd_trajectory_group_effect_marginalization_seed_manifest()[
            "seed_manifest_hash"
        ]
        or bootstrap
        != _repo_root()
        / VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_BOOTSTRAP_RELATIVE_PATH
        or paths["authorization"].parent != lifecycle
        or paths["permit"].parent != lifecycle
        or paths["consumed_permit"].parent != lifecycle
        or paths["claim"].parent != lifecycle
        or paths["input"].parent != lifecycle
        or paths["completion"].parent != lifecycle
        or len(lifecycle_children) != 6
        or paths["authorization"] != lifecycle / VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_EXECUTION_AUTHORIZATION_FILENAME
        or paths["permit"] != lifecycle / VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LAUNCH_PERMIT_FILENAME
        or paths["consumed_permit"] != lifecycle / VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CONSUMED_PERMIT_FILENAME
        or paths["claim"] != lifecycle / VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CLAIM_FILENAME
        or paths["input"] != lifecycle / VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_INPUT_BINDING_FILENAME
        or paths["completion"] != lifecycle / VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_COMPLETION_RECEIPT_FILENAME
        or paths["output"].parent != workspace
        or paths["output"].name
        != VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_OUTPUT_FILENAME
        or workspace
        != Path(VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_WORKSPACE_PATH)
        or lifecycle
        != Path(VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LIFECYCLE_ROOT_PATH)
        or workspace == lifecycle
        or workspace.is_relative_to(lifecycle)
        or lifecycle.is_relative_to(workspace)
        or workspace.is_relative_to(repo)
        or lifecycle.is_relative_to(repo)
        or any(
            root == workspace
            or root == lifecycle
            or root.is_relative_to(workspace)
            or root.is_relative_to(lifecycle)
            or workspace.is_relative_to(root)
            or lifecycle.is_relative_to(root)
            for root in external_prior_roots
        )
        or value["canonical_workspace_identity_hash"] != _path_hash(workspace)
        or value["lifecycle_root_identity_hash"] != _path_hash(lifecycle)
        or any(
            value[key] != _path_hash(paths[path_key])
            for key, path_key in (
                ("execution_authorization_record_path_hash", "authorization"),
                ("launch_permit_path_hash", "permit"),
                ("consumed_permit_path_hash", "consumed_permit"),
                ("claim_path_hash", "claim"),
                ("input_binding_path_hash", "input"),
                ("completion_receipt_path_hash", "completion"),
                ("output_path_hash", "output"),
            )
        )
        or value["bootstrap_sha256"] != _file_sha256(bootstrap)
        or value["git_executable_sha256"] != _file_sha256(git_executable)
        or value["command_argv"] != expected_command
        or value["command_hash"] != sha256_json(expected_command)
        or value["execution_state"] != "NOT_RUN"
        or value["internal_only"] is not True
        or value["synthetic_only"] is not True
        or value["aggregate_only"] is not True
        or value["customer_output_authorized"] is not False
        or value["acceptance_complete"] is not False
        or value["task_2_6_complete"] is not False
        or value["task_5_6_complete"] is not False
        or value["manifest_hash"] != sha256_json(body)
    ):
        _authorization_error("marginalization authorization manifest is invalid")
    site_paths = value["site_package_paths"]
    if (
        type(site_paths) is not list
        or not site_paths
        or site_paths != sorted(site_paths)
        or len(set(site_paths)) != len(site_paths)
        or site_paths != _pinned_site_package_paths()
        or any(
            type(path) is not str or not Path(path).is_absolute()
            for path in site_paths
        )
    ):
        _authorization_error("marginalization site-package paths are invalid")
    if not git_executable.is_absolute():
        _authorization_error("marginalization Git executable is invalid")
    if any(
        type(item) is str
        and any(
            token in item.lower()
            for token in (
                "customer",
                "production",
                "live-data",
                "roi",
                "causal",
                "productivity",
            )
        )
        for item in value.values()
    ):
        _authorization_error("marginalization manifest contains unsafe scope")
    return value


def build_vbd_trajectory_group_effect_marginalization_authorization_manifest(
    *,
    implementation_review_refs: dict[str, str],
) -> dict:
    """Build the future one-file authorization manifest without writing it."""

    implementation_commit = _git_output("rev-parse", "HEAD")
    if _git_output("status", "--porcelain=v1", "--untracked-files=all"):
        _authorization_error("marginalization implementation checkout must be clean")
    implementation_tree = _git_output("rev-parse", "HEAD^{tree}")
    if not _implementation_review_refs_are_valid(
        implementation_review_refs,
        implementation_commit,
    ):
        _authorization_error("marginalization implementation review refs are invalid")
    implementation = vbd_trajectory_runner_implementation_manifest(
        source_paths=_MARGINALIZATION_RUNNER_SOURCE_PATHS
    )
    files = sorted(implementation["files"], key=lambda item: item["path"])
    runtime = build_vbd_trajectory_runtime_identity()
    workspace = Path(VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_WORKSPACE_PATH)
    lifecycle = Path(VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LIFECYCLE_ROOT_PATH)
    authorization = lifecycle / VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_EXECUTION_AUTHORIZATION_FILENAME
    permit = lifecycle / VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LAUNCH_PERMIT_FILENAME
    consumed = lifecycle / VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CONSUMED_PERMIT_FILENAME
    claim = lifecycle / VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CLAIM_FILENAME
    input_binding = lifecycle / VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_INPUT_BINDING_FILENAME
    completion = lifecycle / VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_COMPLETION_RECEIPT_FILENAME
    output = workspace / VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_OUTPUT_FILENAME
    bootstrap = (
        _repo_root()
        / VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_BOOTSTRAP_RELATIVE_PATH
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
        str(authorization),
    ]
    body = {
        "schema_version": (
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_AUTHORIZATION_MANIFEST_SCHEMA_VERSION
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
        "implementation_hash": implementation["implementation_hash"],
        "native_library_manifest_hash": sha256_json(runtime["native_libraries"]),
        "model_manifest_hash": sha256_json(vbd_trajectory_model_manifest_body()),
        "diagnostic_plan_hash": vbd_trajectory_group_effect_marginalization_plan()[
            "plan_hash"
        ],
        "seed_manifest_hash": (
            vbd_trajectory_group_effect_marginalization_seed_manifest()[
                "seed_manifest_hash"
            ]
        ),
        "bootstrap_path": str(bootstrap),
        "bootstrap_sha256": _file_sha256(bootstrap),
        "git_executable_path": str(git_executable),
        "git_executable_sha256": _file_sha256(git_executable),
        "site_package_paths": _pinned_site_package_paths(),
        "canonical_workspace_path": str(workspace),
        "canonical_workspace_identity_hash": _path_hash(workspace),
        "lifecycle_root_path": str(lifecycle),
        "lifecycle_root_identity_hash": _path_hash(lifecycle),
        "execution_authorization_record_path": str(authorization),
        "execution_authorization_record_path_hash": _path_hash(authorization),
        "launch_permit_path": str(permit),
        "launch_permit_path_hash": _path_hash(permit),
        "consumed_permit_path": str(consumed),
        "consumed_permit_path_hash": _path_hash(consumed),
        "claim_path": str(claim),
        "claim_path_hash": _path_hash(claim),
        "input_binding_path": str(input_binding),
        "input_binding_path_hash": _path_hash(input_binding),
        "completion_receipt_path": str(completion),
        "completion_receipt_path_hash": _path_hash(completion),
        "output_path": str(output),
        "output_path_hash": _path_hash(output),
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
    return validate_vbd_trajectory_group_effect_marginalization_authorization_manifest(
        {**body, "manifest_hash": sha256_json(body)}
    )


def _permit_body(
    *,
    manifest: dict,
    authorization_commit: str,
    permit_token: str,
) -> dict:
    return {
        "schema_version": (
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LAUNCH_PERMIT_SCHEMA_VERSION
        ),
        "authorization_commit": authorization_commit,
        "authorization_manifest_hash": manifest["manifest_hash"],
        "scope": VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_AUTHORIZATION_SCOPE,
        "permit_token": permit_token,
        "maximum_launch_count": 1,
        "state": "AVAILABLE_BEFORE_EXECUTION",
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }


def validate_vbd_trajectory_group_effect_marginalization_launch_permit(
    value: object,
    *,
    manifest: dict,
    authorization_commit: str,
) -> dict:
    manifest = validate_vbd_trajectory_group_effect_marginalization_authorization_manifest(
        manifest
    )
    _strict_commit(authorization_commit, "marginalization authorization commit")
    expected_keys = set(
        _permit_body(
            manifest=manifest,
            authorization_commit=authorization_commit,
            permit_token="0" * 64,
        )
    ) | {"permit_hash"}
    if type(value) is not dict or set(value) != expected_keys:
        _authorization_error("marginalization launch permit shape is invalid")
    token = value["permit_token"]
    if type(token) is not str or _TOKEN_RE.fullmatch(token) is None:
        _authorization_error("marginalization launch permit token is invalid")
    body = _permit_body(
        manifest=manifest,
        authorization_commit=authorization_commit,
        permit_token=token,
    )
    expected = {**body, "permit_hash": sha256_json(body)}
    if not _exact_native_equal(value, expected):
        _authorization_error("marginalization launch permit is invalid")
    return value


def create_vbd_trajectory_group_effect_marginalization_launch_permit(
    *,
    manifest: dict,
    authorization_commit: str,
) -> dict:
    """Create the fixed expendable permit without starting execution."""

    manifest = validate_vbd_trajectory_group_effect_marginalization_authorization_manifest(
        manifest
    )
    verify_vbd_trajectory_group_effect_marginalization_authorization_commit(
        manifest=manifest,
        authorization_commit=authorization_commit,
    )
    preflight_vbd_trajectory_group_effect_marginalization_fixed_roots(
        manifest=manifest, phase="BEFORE_PERMIT"
    )
    body = _permit_body(
        manifest=manifest,
        authorization_commit=authorization_commit,
        permit_token=secrets.token_hex(32),
    )
    permit = {**body, "permit_hash": sha256_json(body)}
    path = Path(manifest["launch_permit_path"])
    _write_exclusive_json(path, permit, "marginalization launch permit")
    preflight_vbd_trajectory_group_effect_marginalization_fixed_roots(
        manifest=manifest, phase="PERMIT_AVAILABLE"
    )
    return validate_vbd_trajectory_group_effect_marginalization_launch_permit(
        permit,
        manifest=manifest,
        authorization_commit=authorization_commit,
    )


def _available_permit_identity(
    *,
    manifest: dict,
    authorization_commit: str,
) -> tuple[dict, int, int, str]:
    permit_path = Path(manifest["launch_permit_path"])
    permit, info, file_hash = _read_canonical_json_with_identity(
        permit_path,
        "marginalization launch permit",
    )
    permit = validate_vbd_trajectory_group_effect_marginalization_launch_permit(
        permit,
        manifest=manifest,
        authorization_commit=authorization_commit,
    )
    if (
        not stat.S_ISREG(info.st_mode)
        or info.st_nlink != 1
        or info.st_uid != os.getuid()
        or stat.S_IMODE(info.st_mode) != 0o600
    ):
        _authorization_error("marginalization launch permit identity is unsafe")
    return permit, info.st_dev, info.st_ino, file_hash


def _validate_execution_authorization_available_permit(
    value: dict,
    *,
    manifest: dict,
    authorization_commit: str,
) -> dict:
    permit, device, inode, file_hash = _available_permit_identity(
        manifest=manifest,
        authorization_commit=authorization_commit,
    )
    expected_identity = {
        "launch_permit_hash": permit["permit_hash"],
        "launch_permit_file_sha256": file_hash,
        "launch_permit_device": device,
        "launch_permit_inode": inode,
    }
    actual_identity = {
        key: value[key] for key in expected_identity
    }
    if not _exact_native_equal(actual_identity, expected_identity):
        _authorization_error("marginalization launch permit identity differs")
    return value


def build_vbd_trajectory_group_effect_marginalization_execution_authorization(
    *,
    manifest: dict,
    authorization_commit: str,
    authorizing_decision_ref: str,
    decision_text_hash: str,
    authorized_at_utc: str,
) -> dict:
    """Bind the exact human decision to the still-available fixed permit."""

    manifest = validate_vbd_trajectory_group_effect_marginalization_authorization_manifest(
        manifest
    )
    verify_vbd_trajectory_group_effect_marginalization_authorization_commit(
        manifest=manifest,
        authorization_commit=authorization_commit,
    )
    preflight_vbd_trajectory_group_effect_marginalization_fixed_roots(
        manifest=manifest, phase="PERMIT_AVAILABLE"
    )
    _strict_commit(authorization_commit, "marginalization authorization commit")
    permit, device, inode, file_hash = _available_permit_identity(
        manifest=manifest,
        authorization_commit=authorization_commit,
    )
    if (
        type(authorizing_decision_ref) is not str
        or _DECISION_REF_RE.fullmatch(authorizing_decision_ref) is None
    ):
        _authorization_error("marginalization human decision reference is invalid")
    _strict_hash(decision_text_hash, "marginalization decision text hash")
    body = {
        "schema_version": (
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_EXECUTION_AUTHORIZATION_SCHEMA_VERSION
        ),
        "authorization_commit": authorization_commit,
        "authorization_manifest_hash": manifest["manifest_hash"],
        "scope": VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_AUTHORIZATION_SCOPE,
        "authorizing_decision_ref": authorizing_decision_ref,
        "decision_text_hash": decision_text_hash,
        "authorized_at_utc": _strict_timestamp(authorized_at_utc),
        "maximum_launch_count": 1,
        "canonical_workspace_identity": manifest[
            "canonical_workspace_identity_hash"
        ],
        "lifecycle_root_identity": manifest["lifecycle_root_identity_hash"],
        "command_hash": manifest["command_hash"],
        "launch_permit_path_hash": manifest["launch_permit_path_hash"],
        "launch_permit_hash": permit["permit_hash"],
        "launch_permit_file_sha256": file_hash,
        "launch_permit_device": device,
        "launch_permit_inode": inode,
    }
    result = {
        **body,
        "execution_authorization_hash": sha256_json(body),
    }
    return _validate_execution_authorization_available_permit(
        result,
        manifest=manifest,
        authorization_commit=authorization_commit,
    )


def validate_vbd_trajectory_group_effect_marginalization_execution_authorization(
    value: object,
    *,
    manifest: dict,
    authorization_commit: str,
) -> dict:
    manifest = validate_vbd_trajectory_group_effect_marginalization_authorization_manifest(
        manifest
    )
    _strict_commit(authorization_commit, "marginalization authorization commit")
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
        "lifecycle_root_identity",
        "command_hash",
        "launch_permit_path_hash",
        "launch_permit_hash",
        "launch_permit_file_sha256",
        "launch_permit_device",
        "launch_permit_inode",
        "execution_authorization_hash",
    }
    if type(value) is not dict or set(value) != expected_keys:
        _authorization_error("marginalization execution authorization shape is invalid")
    body = {
        key: item
        for key, item in value.items()
        if key != "execution_authorization_hash"
    }
    for key in (
        "decision_text_hash",
        "command_hash",
        "launch_permit_path_hash",
        "launch_permit_hash",
        "launch_permit_file_sha256",
        "execution_authorization_hash",
    ):
        _strict_hash(value[key], f"marginalization {key}")
    if (
        value["schema_version"]
        != VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_EXECUTION_AUTHORIZATION_SCHEMA_VERSION
        or value["authorization_commit"] != authorization_commit
        or value["authorization_manifest_hash"] != manifest["manifest_hash"]
        or value["scope"]
        != VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_AUTHORIZATION_SCOPE
        or type(value["authorizing_decision_ref"]) is not str
        or _DECISION_REF_RE.fullmatch(value["authorizing_decision_ref"]) is None
        or _strict_timestamp(value["authorized_at_utc"])
        != value["authorized_at_utc"]
        or type(value["maximum_launch_count"]) is not int
        or value["maximum_launch_count"] != 1
        or value["canonical_workspace_identity"]
        != manifest["canonical_workspace_identity_hash"]
        or value["lifecycle_root_identity"]
        != manifest["lifecycle_root_identity_hash"]
        or value["command_hash"] != manifest["command_hash"]
        or value["launch_permit_path_hash"]
        != manifest["launch_permit_path_hash"]
        or type(value["launch_permit_device"]) is not int
        or value["launch_permit_device"] < 0
        or type(value["launch_permit_inode"]) is not int
        or value["launch_permit_inode"] <= 0
        or value["execution_authorization_hash"] != sha256_json(body)
    ):
        _authorization_error("marginalization execution authorization is invalid")
    return value


def write_vbd_trajectory_group_effect_marginalization_execution_authorization(
    *,
    manifest: dict,
    authorization: dict,
    authorization_commit: str,
) -> None:
    authorization = validate_vbd_trajectory_group_effect_marginalization_execution_authorization(
        authorization,
        manifest=manifest,
        authorization_commit=authorization_commit,
    )
    verify_vbd_trajectory_group_effect_marginalization_authorization_commit(
        manifest=manifest,
        authorization_commit=authorization_commit,
    )
    preflight_vbd_trajectory_group_effect_marginalization_fixed_roots(
        manifest=manifest, phase="PERMIT_AVAILABLE"
    )
    _validate_execution_authorization_available_permit(
        authorization,
        manifest=manifest,
        authorization_commit=authorization_commit,
    )
    _write_exclusive_json(
        Path(manifest["execution_authorization_record_path"]),
        authorization,
        "marginalization execution authorization",
    )
    preflight_vbd_trajectory_group_effect_marginalization_fixed_roots(
        manifest=manifest, phase="READY_TO_LAUNCH"
    )


def _claim_body(
    *,
    manifest: dict,
    execution_authorization: dict,
    authorization_commit: str,
) -> dict:
    return {
        "schema_version": (
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_CLAIM_SCHEMA_VERSION
        ),
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
        "lifecycle_root_identity_hash": manifest[
            "lifecycle_root_identity_hash"
        ],
        "diagnostic_plan_hash": manifest["diagnostic_plan_hash"],
        "seed_manifest_hash": manifest["seed_manifest_hash"],
        "consumed_permit_hash": execution_authorization["launch_permit_hash"],
        "consumed_permit_file_sha256": execution_authorization[
            "launch_permit_file_sha256"
        ],
        "consumed_permit_device": execution_authorization[
            "launch_permit_device"
        ],
        "consumed_permit_inode": execution_authorization[
            "launch_permit_inode"
        ],
        "maximum_launch_count": 1,
        "state": "CONSUMED_BEFORE_EXECUTION",
    }


def validate_vbd_trajectory_group_effect_marginalization_claim(
    value: object,
    *,
    manifest: dict,
    execution_authorization: dict,
    authorization_commit: str,
) -> dict:
    manifest = validate_vbd_trajectory_group_effect_marginalization_authorization_manifest(
        manifest
    )
    execution_authorization = (
        validate_vbd_trajectory_group_effect_marginalization_execution_authorization(
            execution_authorization,
            manifest=manifest,
            authorization_commit=authorization_commit,
        )
    )
    body = _claim_body(
        manifest=manifest,
        execution_authorization=execution_authorization,
        authorization_commit=authorization_commit,
    )
    expected = {**body, "claim_hash": sha256_json(body)}
    if not _exact_native_equal(value, expected):
        _authorization_error("marginalization attempt claim is invalid")
    return value


def read_vbd_trajectory_group_effect_marginalization_consumed_permit(
    *,
    manifest: dict,
    execution_authorization: dict,
    authorization_commit: str,
) -> dict:
    execution_authorization = (
        validate_vbd_trajectory_group_effect_marginalization_execution_authorization(
            execution_authorization,
            manifest=manifest,
            authorization_commit=authorization_commit,
        )
    )
    path = Path(manifest["consumed_permit_path"])
    binding = _open_canonical_json_binding(
        path,
        "marginalization consumed permit",
    )
    try:
        permit = validate_vbd_trajectory_group_effect_marginalization_launch_permit(
            binding.value,
            manifest=manifest,
            authorization_commit=authorization_commit,
        )
        if (
            permit["permit_hash"]
            != execution_authorization["launch_permit_hash"]
            or binding.file_hash
            != execution_authorization["launch_permit_file_sha256"]
            or binding.info.st_dev
            != execution_authorization["launch_permit_device"]
            or binding.info.st_ino
            != execution_authorization["launch_permit_inode"]
            or binding.info.st_nlink != 1
        ):
            _authorization_error("marginalization consumed permit identity differs")
        binding.revalidate(expected_link_count=1)
        return permit
    finally:
        binding.close()


def read_vbd_trajectory_group_effect_marginalization_execution_authorization(
    path: Path,
    *,
    manifest: dict,
    authorization_commit: str,
) -> dict:
    expected = Path(manifest["execution_authorization_record_path"])
    if path.resolve() != expected:
        _authorization_error("marginalization execution authorization path is off-plan")
    return _read_bound_canonical_json(
        path,
        "marginalization execution authorization",
        lambda value: validate_vbd_trajectory_group_effect_marginalization_execution_authorization(
            value,
            manifest=manifest,
            authorization_commit=authorization_commit,
        ),
    )


def read_vbd_trajectory_group_effect_marginalization_claim(
    *,
    manifest: dict,
    execution_authorization: dict,
    authorization_commit: str,
) -> dict:
    return _read_bound_canonical_json(
        Path(manifest["claim_path"]),
        "marginalization attempt claim",
        lambda value: validate_vbd_trajectory_group_effect_marginalization_claim(
            value,
            manifest=manifest,
            execution_authorization=execution_authorization,
            authorization_commit=authorization_commit,
        ),
    )


def _hash_list(values: object, count: int, label: str) -> list[str]:
    if type(values) is not list or len(values) != count:
        _authorization_error(f"{label} cardinality is invalid")
    return [
        _strict_hash(value, f"{label} hash {index}")
        for index, value in enumerate(values)
    ]


def build_vbd_trajectory_group_effect_marginalization_input_binding(
    *,
    manifest: dict,
    claim: dict,
    case_panel_hashes: list[str],
    ordered_panel_manifest_roots: list[str],
    prepared_input_hashes: list[str],
    model_input_hashes: list[str],
    deterministic_reference_hashes: list[str],
    deterministic_recomputation_hashes: list[str],
    expected_sampler_binding_hashes: list[str],
) -> dict:
    manifest = validate_vbd_trajectory_group_effect_marginalization_authorization_manifest(
        manifest
    )
    if (
        type(claim) is not dict
        or claim.get("claim_hash")
        != sha256_json(
            {
                key: item
                for key, item in claim.items()
                if key != "claim_hash"
            }
        )
        or claim.get("authorization_manifest_hash") != manifest["manifest_hash"]
    ):
        _authorization_error("marginalization input claim is invalid")
    body = {
        "schema_version": (
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_INPUT_BINDING_SCHEMA_VERSION
        ),
        "claim_hash": claim["claim_hash"],
        "diagnostic_plan_hash": manifest["diagnostic_plan_hash"],
        "seed_manifest_hash": manifest["seed_manifest_hash"],
        "case_panel_hashes": _hash_list(
            case_panel_hashes, 4, "case panel"
        ),
        "ordered_panel_manifest_roots": _hash_list(
            ordered_panel_manifest_roots, 4, "ordered panel manifest"
        ),
        "prepared_input_hashes": _hash_list(
            prepared_input_hashes, 12, "prepared input"
        ),
        "model_input_hashes": _hash_list(
            model_input_hashes, 12, "model input"
        ),
        "deterministic_reference_hashes": _hash_list(
            deterministic_reference_hashes,
            12,
            "deterministic reference",
        ),
        "deterministic_recomputation_hashes": _hash_list(
            deterministic_recomputation_hashes,
            12,
            "deterministic recomputation",
        ),
        "expected_sampler_binding_hashes": _hash_list(
            expected_sampler_binding_hashes,
            12,
            "sampler binding",
        ),
        "internal_only": True,
        "synthetic_only": True,
        "aggregate_only": True,
        "customer_output_authorized": False,
    }
    if (
        body["deterministic_reference_hashes"]
        != body["deterministic_recomputation_hashes"]
        or body["expected_sampler_binding_hashes"]
        != [
            item["binding"]["binding_hash"]
            for item in vbd_trajectory_group_effect_marginalization_plan()[
                "execution_order"
            ]
        ]
    ):
        _authorization_error("marginalization deterministic or sampler binding differs")
    return {**body, "input_binding_hash": sha256_json(body)}


def validate_vbd_trajectory_group_effect_marginalization_input_binding(
    value: object,
    *,
    manifest: dict,
    claim: dict,
) -> dict:
    if type(value) is not dict or "input_binding_hash" not in value:
        _authorization_error("marginalization input binding shape is invalid")
    rebuilt = build_vbd_trajectory_group_effect_marginalization_input_binding(
        manifest=manifest,
        claim=claim,
        case_panel_hashes=value.get("case_panel_hashes"),
        ordered_panel_manifest_roots=value.get(
            "ordered_panel_manifest_roots"
        ),
        prepared_input_hashes=value.get("prepared_input_hashes"),
        model_input_hashes=value.get("model_input_hashes"),
        deterministic_reference_hashes=value.get(
            "deterministic_reference_hashes"
        ),
        deterministic_recomputation_hashes=value.get(
            "deterministic_recomputation_hashes"
        ),
        expected_sampler_binding_hashes=value.get(
            "expected_sampler_binding_hashes"
        ),
    )
    if not _exact_native_equal(value, rebuilt):
        _authorization_error("marginalization input binding differs")
    return value


def write_vbd_trajectory_group_effect_marginalization_input_binding(
    *,
    manifest: dict,
    binding: dict,
    claim: dict,
) -> None:
    binding = validate_vbd_trajectory_group_effect_marginalization_input_binding(
        binding,
        manifest=manifest,
        claim=claim,
    )
    _write_exclusive_json(
        Path(manifest["input_binding_path"]),
        binding,
        "marginalization input binding",
    )
    preflight_vbd_trajectory_group_effect_marginalization_fixed_roots(
        manifest=manifest, phase="INPUT_BOUND"
    )


def read_vbd_trajectory_group_effect_marginalization_input_binding(
    *,
    manifest: dict,
    claim: dict,
) -> dict:
    return _read_bound_canonical_json(
        Path(manifest["input_binding_path"]),
        "marginalization input binding",
        lambda value: validate_vbd_trajectory_group_effect_marginalization_input_binding(
            value,
            manifest=manifest,
            claim=claim,
        ),
    )


def build_vbd_trajectory_group_effect_marginalization_completion_receipt(
    *,
    manifest: dict,
    claim: dict,
    input_binding: dict,
    fit_records: list[dict],
) -> dict:
    if type(fit_records) is not list or len(fit_records) != 12:
        _authorization_error("marginalization completion fit matrix is incomplete")
    fit_hashes = _hash_list(
        [record.get("fit_record_hash") for record in fit_records],
        12,
        "fit record",
    )
    body = {
        "schema_version": (
            VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_COMPLETION_RECEIPT_SCHEMA_VERSION
        ),
        "authorization_manifest_hash": manifest["manifest_hash"],
        "claim_hash": claim["claim_hash"],
        "input_binding_hash": input_binding["input_binding_hash"],
        "diagnostic_plan_hash": manifest["diagnostic_plan_hash"],
        "seed_manifest_hash": manifest["seed_manifest_hash"],
        "ordered_fit_record_hashes": fit_hashes,
        "ordered_fit_record_hashes_hash": sha256_json(fit_hashes),
        "state": "COMPLETE_PERMANENT_HOLD",
        "evidence_eligible": False,
        "acceptance_count_effect": 0,
        "customer_output_authorized": False,
    }
    return {**body, "completion_receipt_hash": sha256_json(body)}


def validate_vbd_trajectory_group_effect_marginalization_completion_receipt(
    value: object,
    *,
    manifest: dict,
    claim: dict,
    input_binding: dict,
    fit_records: list[dict],
) -> dict:
    rebuilt = build_vbd_trajectory_group_effect_marginalization_completion_receipt(
        manifest=manifest,
        claim=claim,
        input_binding=input_binding,
        fit_records=fit_records,
    )
    if not _exact_native_equal(value, rebuilt):
        _authorization_error("marginalization completion receipt differs")
    return value


def write_vbd_trajectory_group_effect_marginalization_completion_receipt(
    *,
    manifest: dict,
    receipt: dict,
    claim: dict,
    input_binding: dict,
    fit_records: list[dict],
) -> None:
    receipt = validate_vbd_trajectory_group_effect_marginalization_completion_receipt(
        receipt,
        manifest=manifest,
        claim=claim,
        input_binding=input_binding,
        fit_records=fit_records,
    )
    _write_exclusive_json(
        Path(manifest["completion_receipt_path"]),
        receipt,
        "marginalization completion receipt",
    )
    preflight_vbd_trajectory_group_effect_marginalization_fixed_roots(
        manifest=manifest, phase="COMPLETION_RECORDED"
    )


def read_vbd_trajectory_group_effect_marginalization_completion_receipt(
    *,
    manifest: dict,
    claim: dict,
    input_binding: dict,
    fit_records: list[dict],
) -> dict:
    return _read_bound_canonical_json(
        Path(manifest["completion_receipt_path"]),
        "marginalization completion receipt",
        lambda value: validate_vbd_trajectory_group_effect_marginalization_completion_receipt(
            value,
            manifest=manifest,
            claim=claim,
            input_binding=input_binding,
            fit_records=fit_records,
        ),
    )


def write_vbd_trajectory_group_effect_marginalization_staged_output(
    *,
    manifest: dict,
    record: dict,
) -> None:
    record = validate_vbd_trajectory_group_effect_marginalization_record(record)
    if record["execution_state"] != "COMPLETE":
        _authorization_error("unexecuted marginalization record cannot be staged")
    preflight_vbd_trajectory_group_effect_marginalization_fixed_roots(
        manifest=manifest, phase="COMPLETION_RECORDED"
    )
    workspace = Path(manifest["canonical_workspace_path"])
    _write_exclusive_json(
        workspace
        / VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_STAGED_OUTPUT_FILENAME,
        record,
        "marginalization staged output",
    )
    preflight_vbd_trajectory_group_effect_marginalization_fixed_roots(
        manifest=manifest,
        phase="STAGED",
    )


def _validate_vbd_trajectory_group_effect_marginalization_fit_input_bindings(
    *,
    fit_records: list[dict],
    input_binding: dict,
) -> None:
    expected_sampler_hashes = [
        item["binding"]["binding_hash"]
        for item in vbd_trajectory_group_effect_marginalization_plan()[
            "execution_order"
        ]
    ]
    if input_binding["expected_sampler_binding_hashes"] != expected_sampler_hashes:
        _authorization_error("marginalization persisted sampler plan differs")
    for fit_index, fit in enumerate(fit_records):
        binding = fit["binding"]
        case_ordinal = binding["case_ordinal"]
        lane_ordinal = binding["lane_ordinal"]
        lane_index = (
            case_ordinal
            * len(VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_LANE_ORDER)
            + lane_ordinal
        )
        if (
            binding["binding_hash"] != expected_sampler_hashes[fit_index]
            or fit["panel_hash"]
            != input_binding["case_panel_hashes"][case_ordinal]
            or fit["ordered_panel_manifest_root"]
            != input_binding["ordered_panel_manifest_roots"][
                case_ordinal
            ]
            or fit["prepared_input_hash"]
            != input_binding["prepared_input_hashes"][lane_index]
            or fit["model_input_hash"]
            != input_binding["model_input_hashes"][lane_index]
            or fit["deterministic_reference_hash"]
            != input_binding["deterministic_reference_hashes"][lane_index]
            or fit["deterministic_recomputation_hash"]
            != input_binding["deterministic_recomputation_hashes"][lane_index]
        ):
            _authorization_error("marginalization persisted fit input binding differs")


def _validate_vbd_trajectory_group_effect_marginalization_persisted_record(
    value: dict,
    *,
    manifest: dict,
    authorization_commit: str,
) -> dict:
    record = validate_vbd_trajectory_group_effect_marginalization_record(
        value
    )
    if record["execution_state"] != "COMPLETE":
        _authorization_error("marginalization persisted output is unexecuted")
    authorization = read_vbd_trajectory_group_effect_marginalization_execution_authorization(
        Path(manifest["execution_authorization_record_path"]),
        manifest=manifest,
        authorization_commit=authorization_commit,
    )
    read_vbd_trajectory_group_effect_marginalization_consumed_permit(
        manifest=manifest,
        execution_authorization=authorization,
        authorization_commit=authorization_commit,
    )
    claim = read_vbd_trajectory_group_effect_marginalization_claim(
        manifest=manifest,
        execution_authorization=authorization,
        authorization_commit=authorization_commit,
    )
    input_binding = read_vbd_trajectory_group_effect_marginalization_input_binding(
        manifest=manifest,
        claim=claim,
    )
    receipt = read_vbd_trajectory_group_effect_marginalization_completion_receipt(
        manifest=manifest,
        claim=claim,
        input_binding=input_binding,
        fit_records=record["fit_records"],
    )
    completion = record["runner_completion_binding"]
    expected = {
        "authorization_commit": authorization_commit,
        "authorization_manifest_hash": manifest["manifest_hash"],
        "execution_authorization_hash": authorization[
            "execution_authorization_hash"
        ],
        "implementation_commit": manifest["implementation_commit"],
        "implementation_tree": manifest["implementation_tree"],
        "implementation_review_refs": manifest["implementation_review_refs"],
        "launch_permit_hash": authorization["launch_permit_hash"],
        "consumed_permit_file_hash": authorization[
            "launch_permit_file_sha256"
        ],
        "external_claim_hash": claim["claim_hash"],
        "input_binding_hash": input_binding["input_binding_hash"],
        "runtime_identity_hash": manifest["runtime_identity_hash"],
        "requirements_lock_hash": manifest["requirements_lock_hash"],
        "implementation_hash": manifest["implementation_hash"],
        "native_library_manifest_hash": manifest[
            "native_library_manifest_hash"
        ],
        "model_manifest_hash": manifest["model_manifest_hash"],
        "diagnostic_plan_hash": manifest["diagnostic_plan_hash"],
        "seed_manifest_hash": manifest["seed_manifest_hash"],
        "command_hash": manifest["command_hash"],
        "terminal_completion_receipt_hash": receipt[
            "completion_receipt_hash"
        ],
    }
    if any(completion[key] != value for key, value in expected.items()):
        _authorization_error("marginalization completion provenance differs")
    if completion["ordered_fit_record_hashes_hash"] != receipt[
        "ordered_fit_record_hashes_hash"
    ]:
        _authorization_error("marginalization completion fit root differs")
    _validate_vbd_trajectory_group_effect_marginalization_fit_input_bindings(
        fit_records=record["fit_records"],
        input_binding=input_binding,
    )
    return record


def validate_vbd_trajectory_group_effect_marginalization_persisted_output(
    path: Path,
    *,
    manifest: dict,
    authorization_commit: str,
    _publication_token: object | None = None,
) -> dict:
    manifest = validate_vbd_trajectory_group_effect_marginalization_authorization_manifest(
        manifest
    )
    staged_path = (
        Path(manifest["canonical_workspace_path"])
        / VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_STAGED_OUTPUT_FILENAME
    ).resolve()
    output_path = Path(manifest["output_path"]).resolve()
    resolved_path = path.resolve()
    if resolved_path == staged_path and _publication_token is None:
        root_phase = "STAGED"
        expected_link_count = 1
    elif (
        resolved_path == output_path
        and _publication_token
        is _VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_PUBLICATION_TOKEN
    ):
        root_phase = "PUBLISHING"
        expected_link_count = 2
    elif resolved_path == output_path and _publication_token is None:
        root_phase = "PUBLISHED"
        expected_link_count = 1
    elif resolved_path in {staged_path, output_path}:
        _authorization_error("marginalization publication token is invalid")
    else:
        _authorization_error("marginalization persisted output path is off-plan")
    preflight_vbd_trajectory_group_effect_marginalization_fixed_roots(
        manifest=manifest,
        phase=root_phase,
    )
    binding = _open_canonical_json_binding(
        path,
        "marginalization persisted output",
    )
    try:
        record = _validate_vbd_trajectory_group_effect_marginalization_persisted_record(
            binding.value,
            manifest=manifest,
            authorization_commit=authorization_commit,
        )
        binding.revalidate(expected_link_count=expected_link_count)
        return record
    finally:
        binding.close()


def verify_vbd_trajectory_group_effect_marginalization_authorization_commit(
    *,
    manifest: dict,
    authorization_commit: str,
) -> None:
    """Verify clean exact A, sole parent D, and one manifest-only diff."""

    manifest = validate_vbd_trajectory_group_effect_marginalization_authorization_manifest(
        manifest
    )
    authorization_commit = _strict_commit(
        authorization_commit,
        "marginalization authorization commit",
    )
    if _git_output("status", "--porcelain=v1", "--untracked-files=all"):
        _authorization_error("marginalization authorization checkout is dirty")
    if _git_output("rev-parse", "HEAD") != authorization_commit:
        _authorization_error("marginalization checkout is not exact A")
    parents = _git_output(
        "rev-list",
        "--parents",
        "-n",
        "1",
        authorization_commit,
    ).split()
    if parents != [authorization_commit, manifest["implementation_commit"]]:
        _authorization_error("marginalization A is not the sole child of D")
    changed = _git_output(
        "diff-tree",
        "--no-commit-id",
        "--name-only",
        "-r",
        manifest["implementation_commit"],
        authorization_commit,
    ).splitlines()
    if changed != [
        VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_AUTHORIZATION_MANIFEST_RELATIVE_PATH
    ]:
        _authorization_error("marginalization D to A diff is not manifest-only")
    if _git_output(
        "rev-parse",
        f"{manifest['implementation_commit']}^{{tree}}",
    ) != manifest["implementation_tree"]:
        _authorization_error("marginalization implementation tree binding differs")


    manifest_path = (
        _repo_root()
        / VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_AUTHORIZATION_MANIFEST_RELATIVE_PATH
    )
    if (
        _read_canonical_json(manifest_path, "marginalization committed manifest")
        != manifest
        or _git_output("hash-object", str(manifest_path))
        != _git_output(
            "rev-parse",
            f"{authorization_commit}:{VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_AUTHORIZATION_MANIFEST_RELATIVE_PATH}",
        )
    ):
        _authorization_error("marginalization committed manifest bytes differ")


def bootstrap_claimed_vbd_trajectory_group_effect_marginalization(
    *,
    manifest: dict,
    authorization_path: Path,
    authorization_commit: str,
    command_argv: list[str],
    _bootstrap_token: object,
) -> dict:
    """Execute only after the standalone bootstrap spent permit and claim."""

    if (
        _bootstrap_token
        is not _VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_BOOTSTRAP_CHILD_TOKEN
    ):
        _authorization_error("marginalization execution requires bootstrap token")
    manifest = validate_vbd_trajectory_group_effect_marginalization_authorization_manifest(
        manifest
    )
    if command_argv != manifest["command_argv"]:
        _authorization_error("marginalization bootstrap argv differs")
    preflight_vbd_trajectory_group_effect_marginalization_fixed_roots(
        manifest=manifest, phase="CLAIMED"
    )
    verify_vbd_trajectory_group_effect_marginalization_authorization_commit(
        manifest=manifest,
        authorization_commit=authorization_commit,
    )
    authorization = read_vbd_trajectory_group_effect_marginalization_execution_authorization(
        authorization_path,
        manifest=manifest,
        authorization_commit=authorization_commit,
    )
    read_vbd_trajectory_group_effect_marginalization_consumed_permit(
        manifest=manifest,
        execution_authorization=authorization,
        authorization_commit=authorization_commit,
    )
    claim = read_vbd_trajectory_group_effect_marginalization_claim(
        manifest=manifest,
        execution_authorization=authorization,
        authorization_commit=authorization_commit,
    )
    from .vbd_trajectory_group_effect_marginalization_execution import (
        execute_authorized_vbd_trajectory_group_effect_marginalization,
    )

    record = execute_authorized_vbd_trajectory_group_effect_marginalization(
        manifest=manifest,
        execution_authorization=authorization,
        claim=claim,
        _execution_token=(
            _VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_EXECUTION_TOKEN
        ),
    )
    write_vbd_trajectory_group_effect_marginalization_staged_output(
        manifest=manifest,
        record=record,
    )
    return record
