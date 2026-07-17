"""Hardened resumable execution for the fixed VBD trajectory proof plan.

The module owns process isolation and checkpoint provenance. Statistical slot
execution lives in ``vbd_trajectory_validation_execution`` so a child process
never receives a checkpoint workspace path or an earlier phase result.
"""

from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from collections.abc import Callable
from datetime import datetime, timezone
from functools import lru_cache
import base64
import fcntl
import hashlib
import importlib
import importlib.metadata
import json
import os
from pathlib import Path
import platform
import re
import secrets
import stat
import subprocess
import sys
import threading
import time

import numpy as np
from threadpoolctl import threadpool_info, threadpool_limits

from .hashing import sha256_json
from .vbd_trajectory_validation_plan import (
    VBD_TRAJECTORY_VALIDATION_CHUNK_COUNT,
    VBD_TRAJECTORY_VALIDATION_REQUIRED_SLOT_COUNT,
    VbdTrajectoryCanaryDescriptor,
    VbdTrajectoryValidationChunk,
    VbdTrajectoryValidationSlot,
    immutable_vbd_trajectory_validation_plan,
    required_vbd_trajectory_canaries,
    required_vbd_trajectory_validation_chunks,
    required_vbd_trajectory_validation_slots,
    vbd_trajectory_validation_plan_from_dict,
)
from .vbd_trajectory_validation_study import (
    VbdTrajectorySlotResult,
    build_vbd_trajectory_slot_result,
    combine_vbd_trajectory_validation_phases,
    summarize_vbd_trajectory_validation_results,
    vbd_trajectory_slot_result_from_dict,
)


VBD_TRAJECTORY_VALIDATION_PHASES = ("original", "recomputation")
VBD_TRAJECTORY_FREEZE_MANIFEST_RELATIVE_PATH = (
    "inference/evidence/vbd_trajectory_freeze_manifest.json"
)
VBD_TRAJECTORY_CONCORDANCE_RECEIPT_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_CONCORDANCE_RECEIPT_2026_07_V1"
)
VBD_TRAJECTORY_FREEZE_MANIFEST_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_FREEZE_MANIFEST_2026_07_V1"
)
VBD_TRAJECTORY_RUNNER_WORKSPACE_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_RUNNER_WORKSPACE_2026_07_V3"
)
VBD_TRAJECTORY_PHASE_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_PHASE_2026_07_V1"
)
VBD_TRAJECTORY_LAUNCH_RECEIPT_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_LAUNCH_RECEIPT_2026_07_V1"
)
VBD_TRAJECTORY_CHILD_OUTPUT_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_CHILD_OUTPUT_2026_07_V1"
)
VBD_TRAJECTORY_LAUNCH_CAPABILITY_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_LAUNCH_CAPABILITY_2026_07_V1"
)
VBD_TRAJECTORY_CHECKPOINT_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_CHECKPOINT_2026_07_V1"
)
VBD_TRAJECTORY_CHUNK_RESULT_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_CHUNK_RESULT_2026_07_V1"
)
VBD_TRAJECTORY_CANARY_RECEIPT_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_CANARY_RECEIPT_2026_07_V1"
)
VBD_TRAJECTORY_COMBINED_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_RESUMABLE_COMBINED_2026_07_V1"
)
VBD_TRAJECTORY_COMBINED_COMMIT_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_COMBINED_COMMIT_2026_07_V1"
)
VBD_TRAJECTORY_RUNNER_THREAT_MODEL = (
    "trusted_frozen_host_crash_replay_and_workspace_tamper_detection_v1"
)

_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
_COMMIT_RE = re.compile(r"^[0-9a-f]{40}$")
_TOKEN_RE = re.compile(r"^[0-9a-f]{64}$")
_REVIEW_REF_RE = re.compile(
    r"^review:(?:code|bug|adversarial|statistical-methodology)/go/"
    r"[0-9a-f]{40}/[a-z][a-z0-9._-]{0,63}$"
)
_REVIEW_ROLE_SLUGS = {
    "CODE": "code",
    "BUG": "bug",
    "ADVERSARIAL": "adversarial",
    "STATISTICAL_METHODOLOGY": "statistical-methodology",
}
_SAFE_TIMESTAMP_RE = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?\+00:00$"
)
_THREAD_ENV_KEYS = (
    "MKL_NUM_THREADS",
    "NUMEXPR_NUM_THREADS",
    "OMP_NUM_THREADS",
    "OPENBLAS_NUM_THREADS",
    "VECLIB_MAXIMUM_THREADS",
)
_EXPECTED_RUNTIME_PACKAGE_VERSIONS = {
    "arviz": "1.2.0",
    "numpy": "2.4.6",
    "pymc": "6.0.1",
    "scipy": "1.18.0",
    "threadpoolctl": "3.6.0",
}
_ALLOWED_COMMAND_IDS = (
    "vbd_trajectory_plan",
    "vbd_trajectory_runner_smoke",
    "vbd_trajectory_build_freeze_manifest",
    "vbd_trajectory_concordance_plan",
    "vbd_trajectory_concordance_initialize",
    "vbd_trajectory_concordance_run_bundle",
    "vbd_trajectory_concordance_run",
    "vbd_trajectory_concordance_combine",
    "vbd_trajectory_concordance_child",
    "vbd_trajectory_run_canary",
    "vbd_trajectory_run_original_chunk",
    "vbd_trajectory_run_recomputation_chunk",
    "vbd_trajectory_combine",
    "vbd_trajectory_child_execute_slot",
)
_RUNNER_SOURCE_PATHS = (
    "inference/pyproject.toml",
    "inference/requirements.lock",
    "inference/src/fluencytracr_inference/__init__.py",
    "inference/src/fluencytracr_inference/design_router.py",
    "inference/src/fluencytracr_inference/hashing.py",
    "inference/src/fluencytracr_inference/longitudinal_types.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_artifact.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_bootstrap_conformance.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_concordance.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_concordance_execution.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_concordance_resumable.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_concordance_cli.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_nuts.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_types.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_synthetic.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_preparation.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_statistics.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_state_space.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_validation_plan.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_validation_study.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_validation_controls.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_validation_execution.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_validation_resumable.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_validation_cli.py",
)
_ROOT_STATIC_FILES = {
    "workspace.json",
    "plan.json",
    "freeze_manifest.json",
    "concordance_receipt.json",
}
_COMBINED_GOVERNANCE_FIELDS = {
    "independent_acceptance_complete",
    "task_5_6_complete",
    "promotion_complete",
    "customer_output_authorized",
    "confidence_output_authorized",
    "probability_output_authorized",
    "roi_output_authorized",
    "causality_output_authorized",
    "productivity_output_authorized",
}
_PHASE_STATIC_FILES = {"phase.json"}
_VALIDATION_WORKSPACE_DIRECTORIES = (
    "canaries",
    "canaries/launches",
    "canaries/outputs",
    "canaries/receipts",
    "original",
    "original/chunks",
    "original/launches",
    "original/slots",
    "recomputation",
    "recomputation/chunks",
    "recomputation/launches",
    "recomputation/slots",
)
_CHILD_STDOUT_LIMIT = 2 * 1024 * 1024
_CHILD_STDERR_LIMIT = 64 * 1024
VBD_TRAJECTORY_CHILD_TIMEOUT_SECONDS = 600
VBD_TRAJECTORY_ATTEMPT_ANCHOR_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_ATTEMPT_ANCHOR_2026_07_V2"
)
VBD_TRAJECTORY_ATTEMPT_CLAIM_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_ATTEMPT_CLAIM_2026_07_V1"
)
VBD_TRAJECTORY_ATTEMPT_PERMIT_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_ATTEMPT_PERMIT_2026_07_V1"
)
VBD_TRAJECTORY_ATTEMPT_PERMIT_MANIFEST_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_TRAJECTORY_ATTEMPT_PERMIT_MANIFEST_2026_07_V1"
)
VBD_TRAJECTORY_ATTEMPT_PERMIT_MODE = "preallocated_expendable_per_slot_v1"
_ATTEMPT_PERMIT_INDEX_CACHE: dict[str, dict[tuple[str, str], dict]] = {}
VBD_TRAJECTORY_ATTEMPT_ANCHOR_PHASES = (
    "canaries",
    "original",
    "primary",
    "recomputation",
)
_EXECUTION_ATTESTATION_KEYS = {
    "attestation_version",
    "execution_kind",
    "phase",
    "phase_hash",
    "phase_token",
    "workspace_hash",
    "slot_index",
    "slot_id",
    "slot_hash",
    "plan_hash",
    "freeze_commit",
    "freeze_manifest_hash",
    "implementation_hash",
    "runtime_identity_hash",
    "command_id",
    "command_hash",
    "launch_receipt_hash",
    "process_token",
    "process_id",
    "parent_process_id",
    "process_started_at",
    "process_completed_at",
    "process_start_identity_hash",
    "executable_sha256",
    "native_library_identity_hash",
    "prepared_input_hashes_hash",
    "semantic_result_hash",
    "workspace_path_received",
    "prior_phase_inputs_received",
    "prior_phase_inputs_read",
    "result_arrays_emitted",
    "internal_only",
    "synthetic_only",
    "customer_output_authorized",
    "attestation_hash",
}

_ACTIVE_WORKSPACE_DIRECTORY: ContextVar[object | None] = ContextVar(
    "vbd_active_workspace_directory", default=None
)

_FROZEN_CHILD_BOOTSTRAP = r'''
import base64
import hashlib
import importlib.abc
import importlib.util
import json
import os
import sys

fd_text = os.environ.pop("FT_VBD_TRAJECTORY_FROZEN_SOURCE_FD", None)
if fd_text is None or not fd_text.isascii() or not fd_text.isdigit():
    raise SystemExit(97)
with os.fdopen(int(fd_text), "rb", closefd=True) as source_handle:
    encoded_bundle = source_handle.read()
try:
    bundle = json.loads(encoded_bundle.decode("utf-8"))
except Exception:
    raise SystemExit(97)
if type(bundle) is not dict or set(bundle) != {
    "schema_version", "candidate_source_commit", "freeze_manifest_hash",
    "repository_root", "site_package_paths", "modules", "bundle_hash"
}:
    raise SystemExit(97)
body = {key: value for key, value in bundle.items() if key != "bundle_hash"}
canonical_body = json.dumps(
    body, sort_keys=True, separators=(",", ":"), ensure_ascii=False
).encode("utf-8")
if hashlib.sha256(canonical_body).hexdigest() != bundle["bundle_hash"]:
    raise SystemExit(97)
modules = {}
repository_root = bundle["repository_root"]
if type(repository_root) is not str or not os.path.isabs(repository_root):
    raise SystemExit(97)
for item in bundle["modules"]:
    if type(item) is not dict or set(item) != {
        "module", "path", "sha256", "source_base64", "is_package"
    }:
        raise SystemExit(97)
    name = item["module"]
    if (
        type(name) is not str
        or not name.startswith("fluencytracr_inference")
        or name in modules
        or type(item["is_package"]) is not bool
    ):
        raise SystemExit(97)
    try:
        source = base64.b64decode(item["source_base64"], validate=True)
    except Exception:
        raise SystemExit(97)
    if hashlib.sha256(source).hexdigest() != item["sha256"]:
        raise SystemExit(97)
    modules[name] = (source, item["path"], item["is_package"])
if "fluencytracr_inference" not in modules:
    raise SystemExit(97)
site_package_paths = bundle["site_package_paths"]
if (
    type(site_package_paths) is not list
    or not site_package_paths
    or len(set(site_package_paths)) != len(site_package_paths)
    or any(type(path) is not str or not os.path.isabs(path) for path in site_package_paths)
):
    raise SystemExit(97)
sys.path.extend(site_package_paths)

class FrozenLoader(importlib.abc.Loader):
    def __init__(self, fullname):
        self.fullname = fullname

    def create_module(self, spec):
        return None

    def exec_module(self, module):
        source, path, is_package = modules[self.fullname]
        module.__file__ = os.path.join(repository_root, path)
        if is_package:
            module.__path__ = []
        code = compile(
            source,
            module.__file__,
            "exec",
            dont_inherit=True,
            optimize=0,
        )
        exec(code, module.__dict__)

class FrozenFinder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname in modules:
            return importlib.util.spec_from_loader(
                fullname,
                FrozenLoader(fullname),
                is_package=modules[fullname][2],
            )
        if fullname.startswith("fluencytracr_inference"):
            raise ImportError("module is absent from the frozen VBD source set")
        return None

sys.meta_path.insert(0, FrozenFinder())
target_module = sys.argv[1]
target_args = sys.argv[2:]
module = __import__(target_module, fromlist=["main"])
raise SystemExit(module.main(target_args))
'''.strip()


class VbdTrajectoryValidationWorkspaceError(RuntimeError):
    """The proof workspace or execution provenance is unsafe or incomplete."""


class _WorkspaceDirectoryHandle:
    def __init__(self, workspace: Path, root_descriptor: int):
        self.workspace = workspace
        self._root_device = os.fstat(root_descriptor).st_dev
        self._directories: dict[tuple[str, ...], int] = {
            (): os.dup(root_descriptor)
        }

    @staticmethod
    def _directory_flags() -> int:
        flags = os.O_RDONLY
        if hasattr(os, "O_DIRECTORY"):
            flags |= os.O_DIRECTORY
        if hasattr(os, "O_NOFOLLOW"):
            flags |= os.O_NOFOLLOW
        return flags

    @staticmethod
    def _validate_parts(parts: tuple[str, ...]) -> None:
        if any(part in {"", ".", ".."} or "/" in part for part in parts):
            raise VbdTrajectoryValidationWorkspaceError(
                "checkpoint path is not a safe workspace-relative path"
            )

    def relative_parts(self, path: Path) -> tuple[str, ...]:
        try:
            relative = path.relative_to(self.workspace)
        except ValueError as exc:
            raise VbdTrajectoryValidationWorkspaceError(
                "checkpoint path escapes its held workspace"
            ) from exc
        parts = tuple(relative.parts)
        if not parts:
            raise VbdTrajectoryValidationWorkspaceError(
                "checkpoint path cannot name the workspace root"
            )
        self._validate_parts(parts)
        return parts

    def _open_directory(
        self, parts: tuple[str, ...], *, create: bool, stop_at_missing: bool = False
    ) -> int:
        self._validate_parts(parts)
        current = os.dup(self._directories[()])
        try:
            for index, part in enumerate(parts):
                key = parts[: index + 1]
                cached = self._directories.get(key)
                if cached is not None:
                    current_entry = os.stat(
                        part, dir_fd=current, follow_symlinks=False
                    )
                    held = os.fstat(cached)
                    if (
                        not stat.S_ISDIR(current_entry.st_mode)
                        or not stat.S_ISDIR(held.st_mode)
                        or (current_entry.st_dev, current_entry.st_ino)
                        != (held.st_dev, held.st_ino)
                    ):
                        raise VbdTrajectoryValidationWorkspaceError(
                            "workspace directory identity changed"
                        )
                    child = os.dup(cached)
                else:
                    try:
                        child = os.open(
                            part,
                            self._directory_flags(),
                            dir_fd=current,
                        )
                    except FileNotFoundError:
                        if stop_at_missing:
                            return current
                        if not create:
                            raise
                        os.mkdir(part, mode=0o700, dir_fd=current)
                        child = os.open(
                            part,
                            self._directory_flags(),
                            dir_fd=current,
                        )
                    opened = os.fstat(child)
                    if (
                        not stat.S_ISDIR(opened.st_mode)
                        or opened.st_dev != self._root_device
                    ):
                        os.close(child)
                        raise VbdTrajectoryValidationWorkspaceError(
                            "checkpoint parent is not a same-device directory"
                        )
                    self._directories[key] = os.dup(child)
                os.close(current)
                current = child
            return current
        except VbdTrajectoryValidationWorkspaceError:
            os.close(current)
            raise
        except OSError as exc:
            os.close(current)
            raise VbdTrajectoryValidationWorkspaceError(
                "workspace directory cannot be opened safely"
            ) from exc

    def bind_existing_parent(self, path: Path) -> None:
        parts = self.relative_parts(path)
        descriptor = self._open_directory(
            parts[:-1], create=False, stop_at_missing=True
        )
        os.close(descriptor)

    def bind_existing_directory(self, path: Path) -> None:
        if path == self.workspace:
            return
        try:
            relative = path.relative_to(self.workspace)
        except ValueError as exc:
            raise VbdTrajectoryValidationWorkspaceError(
                "workspace directory escapes its held root"
            ) from exc
        parts = tuple(relative.parts)
        descriptor = self._open_directory(parts, create=False)
        os.close(descriptor)

    def open_parent(self, path: Path, *, create: bool) -> tuple[int, str]:
        parts = self.relative_parts(path)
        return self._open_directory(parts[:-1], create=create), parts[-1]

    def open_directory(self, path: Path, *, create: bool) -> int:
        if path == self.workspace:
            return os.dup(self._directories[()])
        try:
            relative = path.relative_to(self.workspace)
        except ValueError as exc:
            raise VbdTrajectoryValidationWorkspaceError(
                "workspace directory escapes its held root"
            ) from exc
        return self._open_directory(tuple(relative.parts), create=create)

    def verify(self) -> None:
        try:
            for parts, descriptor in sorted(
                self._directories.items(), key=lambda item: len(item[0])
            ):
                if not parts:
                    continue
                parent = self._directories[parts[:-1]]
                current = os.stat(
                    parts[-1], dir_fd=parent, follow_symlinks=False
                )
                held = os.fstat(descriptor)
                if (
                    not stat.S_ISDIR(current.st_mode)
                    or not stat.S_ISDIR(held.st_mode)
                    or (current.st_dev, current.st_ino)
                    != (held.st_dev, held.st_ino)
                ):
                    raise VbdTrajectoryValidationWorkspaceError(
                        "workspace directory identity changed"
                    )
        except OSError as exc:
            raise VbdTrajectoryValidationWorkspaceError(
                "workspace directory identity changed"
            ) from exc

    def close(self) -> None:
        for descriptor in self._directories.values():
            os.close(descriptor)
        self._directories.clear()


def validate_vbd_trajectory_recomputation_source(source_kind: str) -> None:
    """Reject every attempt to feed a primary execution product to recomputation."""

    if type(source_kind) is not str:
        raise ValueError("recomputation source kind must be a string")
    if source_kind in {
        "primary_result",
        "primary_artifact",
        "primary_checkpoint",
    }:
        raise ValueError(
            "recomputation cannot deserialize a primary execution product"
        )
    if source_kind != "compiled_slot_regeneration":
        raise ValueError("recomputation source kind is not compiled")


def validate_vbd_trajectory_combined_governance(flags: dict[str, bool]) -> None:
    """Enforce the nonauthorizing boundary on combined runner output."""

    if type(flags) is not dict or set(flags) != _COMBINED_GOVERNANCE_FIELDS:
        raise ValueError("combined governance flags are incomplete or unknown")
    if any(type(value) is not bool for value in flags.values()):
        raise ValueError("combined governance flags must be boolean")
    if any(flags.values()):
        raise ValueError("combined output cannot authorize completion or output")


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _file_sha256(path: Path) -> str:
    with _workspace_parent_descriptor(path, create=False) as target:
        if target is not None:
            directory_descriptor, name = target
            try:
                return hashlib.sha256(
                    _read_descriptor_bytes(directory_descriptor, name)
                ).hexdigest()
            except OSError as exc:
                raise VbdTrajectoryValidationWorkspaceError(
                    f"file cannot be hashed safely: {path.name}"
                ) from exc
    flags = os.O_RDONLY
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    descriptor = -1
    try:
        before = os.lstat(path)
        descriptor = os.open(path, flags)
        opened = os.fstat(descriptor)
        if (
            not stat.S_ISREG(before.st_mode)
            or not stat.S_ISREG(opened.st_mode)
            or (before.st_dev, before.st_ino) != (opened.st_dev, opened.st_ino)
        ):
            raise VbdTrajectoryValidationWorkspaceError(
                "hashed file changed identity before open"
            )
        digest = hashlib.sha256()
        while True:
            block = os.read(descriptor, 1024 * 1024)
            if not block:
                break
            digest.update(block)
        after_open = os.fstat(descriptor)
        after_path = os.lstat(path)
        identities = {
            (
                item.st_dev,
                item.st_ino,
                item.st_size,
                item.st_mtime_ns,
                item.st_ctime_ns,
            )
            for item in (before, opened, after_open, after_path)
        }
        if len(identities) != 1:
            raise VbdTrajectoryValidationWorkspaceError(
                "hashed file changed identity during read"
            )
        return digest.hexdigest()
    except OSError as exc:
        raise VbdTrajectoryValidationWorkspaceError(
            f"file cannot be hashed safely: {path.name}"
        ) from exc
    finally:
        if descriptor >= 0:
            os.close(descriptor)


def _strict_sha256(value: object, name: str) -> str:
    if type(value) is not str or _SHA256_RE.fullmatch(value) is None:
        raise VbdTrajectoryValidationWorkspaceError(
            f"{name} must be lowercase SHA-256"
        )
    return value


def _strict_token(value: object, name: str) -> str:
    if type(value) is not str or _TOKEN_RE.fullmatch(value) is None:
        raise VbdTrajectoryValidationWorkspaceError(
            f"{name} must be a 256-bit lowercase token"
        )
    return value


def _strict_timestamp(value: object, name: str) -> str:
    if type(value) is not str or _SAFE_TIMESTAMP_RE.fullmatch(value) is None:
        raise VbdTrajectoryValidationWorkspaceError(
            f"{name} must be a UTC ISO-8601 timestamp"
        )
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError as exc:
        raise VbdTrajectoryValidationWorkspaceError(
            f"{name} is not a valid timestamp"
        ) from exc
    if parsed.tzinfo != timezone.utc:
        raise VbdTrajectoryValidationWorkspaceError(f"{name} must use UTC")
    return value


def _object_without_duplicate_keys(pairs: list[tuple[str, object]]) -> dict:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("JSON object contains duplicate keys")
        result[key] = value
    return result


def _decode_json_bytes(encoded: bytes, name: str) -> object:
    try:
        return json.loads(
            encoded.decode("utf-8"),
            object_pairs_hook=_object_without_duplicate_keys,
            parse_constant=lambda value: (_ for _ in ()).throw(
                ValueError(f"non-finite JSON constant: {value}")
            ),
        )
    except (UnicodeError, ValueError, json.JSONDecodeError) as exc:
        raise VbdTrajectoryValidationWorkspaceError(
            f"{name} is not strict finite JSON"
        ) from exc


@contextmanager
def _workspace_parent_descriptor(path: Path, *, create: bool):
    handle = _ACTIVE_WORKSPACE_DIRECTORY.get()
    if handle is None:
        yield None
        return
    if not isinstance(handle, _WorkspaceDirectoryHandle):
        raise VbdTrajectoryValidationWorkspaceError(
            "active workspace directory handle is invalid"
        )
    try:
        path.relative_to(handle.workspace)
    except ValueError:
        yield None
        return
    current, name = handle.open_parent(path, create=create)
    try:
        yield current, name
    finally:
        os.close(current)


def _read_descriptor_bytes(directory_descriptor: int, name: str) -> bytes:
    flags = os.O_RDONLY
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    before = os.stat(name, dir_fd=directory_descriptor, follow_symlinks=False)
    descriptor = os.open(name, flags, dir_fd=directory_descriptor)
    try:
        opened = os.fstat(descriptor)
        if (
            not stat.S_ISREG(opened.st_mode)
            or opened.st_nlink != 1
            or (before.st_dev, before.st_ino) != (opened.st_dev, opened.st_ino)
        ):
            raise VbdTrajectoryValidationWorkspaceError(
                "checkpoint changed identity before read"
            )
        with os.fdopen(descriptor, "rb", closefd=False) as handle:
            encoded = handle.read()
        after_open = os.fstat(descriptor)
    finally:
        os.close(descriptor)
    after_name = os.stat(
        name, dir_fd=directory_descriptor, follow_symlinks=False
    )
    identities = tuple(
        (
            item.st_dev,
            item.st_ino,
            item.st_size,
            item.st_mtime_ns,
            item.st_ctime_ns,
        )
        for item in (before, opened, after_open, after_name)
    )
    if len(set(identities)) != 1 or after_name.st_nlink != 1:
        raise VbdTrajectoryValidationWorkspaceError(
            "checkpoint changed identity during read"
        )
    return encoded


def read_strict_json(path: Path) -> object:
    with _workspace_parent_descriptor(path, create=False) as target:
        if target is not None:
            directory_descriptor, name = target
            try:
                encoded = _read_descriptor_bytes(directory_descriptor, name)
            except OSError as exc:
                raise VbdTrajectoryValidationWorkspaceError(
                    f"checkpoint cannot be read: {path.name}"
                ) from exc
            value = _decode_json_bytes(encoded, path.name)
            if encoded != _canonical_json_bytes(value):
                raise VbdTrajectoryValidationWorkspaceError(
                    "checkpoint JSON is not in canonical byte form"
                )
            return value
    flags = os.O_RDONLY
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        before = os.lstat(path)
        descriptor = os.open(path, flags)
        try:
            opened = os.fstat(descriptor)
            if (
                not stat.S_ISREG(opened.st_mode)
                or opened.st_nlink != 1
                or (before.st_dev, before.st_ino)
                != (opened.st_dev, opened.st_ino)
            ):
                raise VbdTrajectoryValidationWorkspaceError(
                    "checkpoint changed identity before read"
                )
            with os.fdopen(descriptor, "rb", closefd=False) as handle:
                encoded = handle.read()
            after_open = os.fstat(descriptor)
        finally:
            os.close(descriptor)
        after_path = os.lstat(path)
        identities = (
            (before.st_dev, before.st_ino, before.st_size),
            (opened.st_dev, opened.st_ino, opened.st_size),
            (after_open.st_dev, after_open.st_ino, after_open.st_size),
            (after_path.st_dev, after_path.st_ino, after_path.st_size),
        )
        if len(set(identities)) != 1 or after_path.st_nlink != 1:
            raise VbdTrajectoryValidationWorkspaceError(
                "checkpoint changed identity during read"
            )
        value = _decode_json_bytes(encoded, path.name)
        if encoded != _canonical_json_bytes(value):
            raise VbdTrajectoryValidationWorkspaceError(
                "checkpoint JSON is not in canonical byte form"
            )
        return value
    except OSError as exc:
        raise VbdTrajectoryValidationWorkspaceError(
            f"checkpoint cannot be read: {path.name}"
        ) from exc


def _canonical_json_bytes(value: object) -> bytes:
    return (
        json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False)
        + "\n"
    ).encode("utf-8")


def write_json_create_once(
    path: Path,
    value: object,
    *,
    lock_verifier: Callable[[], None] | None = None,
) -> None:
    """Create one immutable JSON file, or accept identical existing bytes."""

    if lock_verifier is not None:
        lock_verifier()
    with _workspace_parent_descriptor(path, create=True) as target:
        if target is not None:
            directory_descriptor, name = target
            _write_json_create_once_descriptor(
                directory_descriptor,
                name,
                value,
                lock_verifier=lock_verifier,
            )
            return
    path.parent.mkdir(parents=True, exist_ok=True)
    encoded = _canonical_json_bytes(value)
    temporary = path.parent / f".{path.name}.{os.getpid()}.{time.time_ns()}.tmp"
    descriptor: int | None = None
    destination_created = False
    try:
        flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
        if hasattr(os, "O_NOFOLLOW"):
            flags |= os.O_NOFOLLOW
        descriptor = os.open(temporary, flags, 0o600)
        try:
            with os.fdopen(descriptor, "wb", closefd=False) as handle:
                handle.write(encoded)
                handle.flush()
                os.fsync(handle.fileno())
            original = os.fstat(descriptor)
            if not stat.S_ISREG(original.st_mode) or original.st_nlink != 1:
                raise VbdTrajectoryValidationWorkspaceError(
                    "atomic temporary is linked or not regular"
                )
        except Exception:
            raise
        try:
            if lock_verifier is not None:
                lock_verifier()
            os.link(temporary, path, follow_symlinks=False)
            destination_created = True
        except FileExistsError:
            _validate_regular_file(path, label="existing checkpoint")
            if path.read_bytes() != encoded:
                raise VbdTrajectoryValidationWorkspaceError(
                    f"create-once checkpoint differs: {path.name}"
                )
        if destination_created:
            try:
                current_temporary = temporary.stat(follow_symlinks=False)
                destination = path.stat(follow_symlinks=False)
            except OSError as exc:
                raise VbdTrajectoryValidationWorkspaceError(
                    "atomic publication changed identity"
                ) from exc
            original_identity = (original.st_dev, original.st_ino)
            if (
                not stat.S_ISREG(current_temporary.st_mode)
                or not stat.S_ISREG(destination.st_mode)
                or (current_temporary.st_dev, current_temporary.st_ino)
                != original_identity
                or (destination.st_dev, destination.st_ino)
                != original_identity
                or current_temporary.st_nlink != 2
                or destination.st_nlink != 2
            ):
                try:
                    path.unlink()
                except OSError:
                    pass
                raise VbdTrajectoryValidationWorkspaceError(
                    "atomic publication did not bind the original temporary"
            )
            temporary.unlink()
            destination_created = False
            published = _validate_regular_file(
                path, label="published checkpoint"
            )
            if (
                (published.st_dev, published.st_ino) != original_identity
                or path.read_bytes() != encoded
            ):
                try:
                    path.unlink()
                except OSError:
                    pass
                raise VbdTrajectoryValidationWorkspaceError(
                    "atomic publication bytes changed"
                )
        directory_fd = os.open(path.parent, os.O_RDONLY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
        if lock_verifier is not None:
            lock_verifier()
    finally:
        if descriptor is not None:
            try:
                os.close(descriptor)
            except OSError:
                pass
        try:
            if temporary.exists() or temporary.is_symlink():
                temporary.unlink()
        except OSError:
            pass


def _write_json_create_once_descriptor(
    directory_descriptor: int,
    name: str,
    value: object,
    *,
    lock_verifier: Callable[[], None] | None,
) -> None:
    encoded = _canonical_json_bytes(value)
    temporary = f".{name}.{os.getpid()}.{time.time_ns()}.tmp"
    descriptor: int | None = None
    destination_created = False
    try:
        flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
        if hasattr(os, "O_NOFOLLOW"):
            flags |= os.O_NOFOLLOW
        descriptor = os.open(
            temporary, flags, 0o600, dir_fd=directory_descriptor
        )
        with os.fdopen(descriptor, "wb", closefd=False) as handle:
            handle.write(encoded)
            handle.flush()
            os.fsync(handle.fileno())
        original = os.fstat(descriptor)
        if not stat.S_ISREG(original.st_mode) or original.st_nlink != 1:
            raise VbdTrajectoryValidationWorkspaceError(
                "atomic temporary is linked or not regular"
            )
        if lock_verifier is not None:
            lock_verifier()
        try:
            os.link(
                temporary,
                name,
                src_dir_fd=directory_descriptor,
                dst_dir_fd=directory_descriptor,
                follow_symlinks=False,
            )
            destination_created = True
        except FileExistsError:
            existing = os.stat(
                name, dir_fd=directory_descriptor, follow_symlinks=False
            )
            if not stat.S_ISREG(existing.st_mode) or existing.st_nlink != 1:
                raise VbdTrajectoryValidationWorkspaceError(
                    "existing checkpoint is linked or not regular"
                )
            if _read_descriptor_bytes(directory_descriptor, name) != encoded:
                raise VbdTrajectoryValidationWorkspaceError(
                    f"create-once checkpoint differs: {name}"
                )
        if destination_created:
            current_temporary = os.stat(
                temporary,
                dir_fd=directory_descriptor,
                follow_symlinks=False,
            )
            destination = os.stat(
                name, dir_fd=directory_descriptor, follow_symlinks=False
            )
            original_identity = (original.st_dev, original.st_ino)
            if (
                not stat.S_ISREG(current_temporary.st_mode)
                or not stat.S_ISREG(destination.st_mode)
                or (current_temporary.st_dev, current_temporary.st_ino)
                != original_identity
                or (destination.st_dev, destination.st_ino)
                != original_identity
                or current_temporary.st_nlink != 2
                or destination.st_nlink != 2
            ):
                try:
                    os.unlink(name, dir_fd=directory_descriptor)
                except OSError:
                    pass
                raise VbdTrajectoryValidationWorkspaceError(
                    "atomic publication did not bind the original temporary"
                )
            os.unlink(temporary, dir_fd=directory_descriptor)
            destination_created = False
            published = os.stat(
                name, dir_fd=directory_descriptor, follow_symlinks=False
            )
            if (
                (published.st_dev, published.st_ino) != original_identity
                or published.st_nlink != 1
                or _read_descriptor_bytes(directory_descriptor, name) != encoded
            ):
                try:
                    os.unlink(name, dir_fd=directory_descriptor)
                except OSError:
                    pass
                raise VbdTrajectoryValidationWorkspaceError(
                    "atomic publication bytes changed"
                )
        os.fsync(directory_descriptor)
        if lock_verifier is not None:
            lock_verifier()
    finally:
        if descriptor is not None:
            try:
                os.close(descriptor)
            except OSError:
                pass
        try:
            os.unlink(temporary, dir_fd=directory_descriptor)
        except OSError:
            pass


def _is_atomic_temp(path: Path) -> bool:
    return _atomic_temp_destination_name(path) is not None


def _atomic_temp_destination_name(path: Path) -> str | None:
    match = re.fullmatch(
        r"\.(?P<destination>[A-Za-z0-9_.-]+)\.\d+\.\d+\.tmp",
        path.name,
    )
    return None if match is None else match.group("destination")


def _cleanup_stale_atomic_temps(root: Path) -> None:
    if not _workspace_path_is_dir(root):
        return
    handle = _ACTIVE_WORKSPACE_DIRECTORY.get()
    root_device = (
        handle._root_device
        if isinstance(handle, _WorkspaceDirectoryHandle)
        and handle.workspace == root
        else root.stat(follow_symlinks=False).st_dev
    )
    for kind, relative in sorted(
        _workspace_tree_entries(root, include_atomic_temps=True)
    ):
        path = root / relative
        destination_name = _atomic_temp_destination_name(path)
        if destination_name is None:
            continue
        if kind != "file":
            raise VbdTrajectoryValidationWorkspaceError(
                "atomic temporary is linked or not regular"
            )
        stat_result = _workspace_entry_stat(path)
        if stat_result is None:
            raise VbdTrajectoryValidationWorkspaceError(
                "atomic temporary disappeared during cleanup"
            )
        if stat_result.st_dev != root_device:
            raise VbdTrajectoryValidationWorkspaceError(
                "atomic temporary crosses filesystem devices"
            )
        if stat_result.st_nlink == 2:
            destination = path.with_name(destination_name)
            destination_stat = _workspace_entry_stat(destination)
            if destination_stat is None or (
                destination_stat.st_dev,
                destination_stat.st_ino,
            ) != (stat_result.st_dev, stat_result.st_ino):
                raise VbdTrajectoryValidationWorkspaceError(
                    "linked atomic temporary has no matching destination"
                )
        elif stat_result.st_nlink != 1:
            raise VbdTrajectoryValidationWorkspaceError(
                "atomic temporary has an unsafe hardlink count"
            )
        with _workspace_parent_descriptor(path, create=False) as target:
            if target is None:
                path.unlink()
            else:
                directory_descriptor, name = target
                os.unlink(name, dir_fd=directory_descriptor)


def _validate_regular_file(path: Path, *, label: str) -> os.stat_result:
    if path.is_symlink() or not path.is_file():
        raise VbdTrajectoryValidationWorkspaceError(
            f"{label} is missing, linked, or not a regular file"
        )
    stat = path.stat(follow_symlinks=False)
    if stat.st_nlink != 1:
        raise VbdTrajectoryValidationWorkspaceError(
            f"{label} must not be hard-linked"
        )
    return stat


def _validate_tree_links(root: Path) -> None:
    handle = _ACTIVE_WORKSPACE_DIRECTORY.get()
    if handle is not None and not isinstance(handle, _WorkspaceDirectoryHandle):
        raise VbdTrajectoryValidationWorkspaceError(
            "active workspace directory handle is invalid"
        )
    seen_inodes: dict[tuple[int, int], str] = {}
    handle = _ACTIVE_WORKSPACE_DIRECTORY.get()
    root_device = (
        handle._root_device
        if isinstance(handle, _WorkspaceDirectoryHandle)
        and handle.workspace == root
        else root.stat(follow_symlinks=False).st_dev
    )
    for kind, relative in sorted(
        _workspace_tree_entries(root, include_atomic_temps=True)
    ):
        path = root / relative
        if kind == "symlink":
            raise VbdTrajectoryValidationWorkspaceError(
                "validation workspace must not contain symlinks"
            )
        if kind == "file":
            opened = _workspace_entry_stat(path)
            if opened is None or opened.st_nlink != 1:
                raise VbdTrajectoryValidationWorkspaceError(
                    "workspace file must be regular and not hard-linked"
                )
            if opened.st_dev != root_device:
                raise VbdTrajectoryValidationWorkspaceError(
                    "validation workspace crosses filesystem devices"
                )
            identity = (opened.st_dev, opened.st_ino)
            if identity in seen_inodes:
                raise VbdTrajectoryValidationWorkspaceError(
                    "validation workspace contains cross-path hard links"
                )
            seen_inodes[identity] = relative
        elif kind != "dir":
            raise VbdTrajectoryValidationWorkspaceError(
                "validation workspace contains a special filesystem entry"
            )
    if handle is not None and handle.workspace == root:
        handle.verify()


def _same_existing_path(left: Path, right: Path) -> bool:
    try:
        return os.path.samefile(left, right)
    except OSError:
        return False


def _safe_workspace_path(workspace: Path, *parts: str) -> Path:
    candidate = workspace.joinpath(*parts)
    try:
        candidate.relative_to(workspace)
    except ValueError as exc:
        raise VbdTrajectoryValidationWorkspaceError(
            "checkpoint path escapes its workspace"
        ) from exc
    current = candidate
    while current != workspace:
        if current.is_symlink():
            raise VbdTrajectoryValidationWorkspaceError(
                "checkpoint paths must not contain symlinks"
            )
        current = current.parent
    resolved = candidate.resolve(strict=False)
    if resolved != workspace and workspace not in resolved.parents:
        raise VbdTrajectoryValidationWorkspaceError(
            "checkpoint path resolves outside its workspace"
        )
    handle = _ACTIVE_WORKSPACE_DIRECTORY.get()
    if handle is not None:
        if not isinstance(handle, _WorkspaceDirectoryHandle):
            raise VbdTrajectoryValidationWorkspaceError(
                "active workspace directory handle is invalid"
            )
        if handle.workspace != workspace:
            return candidate
        handle.bind_existing_parent(candidate)
        handle.verify()
    return candidate


def _workspace_entry_stat(path: Path) -> os.stat_result | None:
    active = _ACTIVE_WORKSPACE_DIRECTORY.get()
    if isinstance(active, _WorkspaceDirectoryHandle) and path == active.workspace:
        return os.fstat(active._directories[()])
    with _workspace_parent_descriptor(path, create=False) as target:
        try:
            if target is None:
                return path.stat(follow_symlinks=False)
            directory_descriptor, name = target
            return os.stat(
                name, dir_fd=directory_descriptor, follow_symlinks=False
            )
        except FileNotFoundError:
            return None
        except OSError as exc:
            raise VbdTrajectoryValidationWorkspaceError(
                "workspace entry cannot be inspected safely"
            ) from exc


def _workspace_path_exists(path: Path) -> bool:
    return _workspace_entry_stat(path) is not None


def _workspace_path_is_file(path: Path) -> bool:
    opened = _workspace_entry_stat(path)
    return opened is not None and stat.S_ISREG(opened.st_mode)


def _workspace_path_is_dir(path: Path) -> bool:
    opened = _workspace_entry_stat(path)
    return opened is not None and stat.S_ISDIR(opened.st_mode)


def _workspace_directory_entries(directory: Path) -> tuple[tuple[str, str], ...]:
    handle = _ACTIVE_WORKSPACE_DIRECTORY.get()
    descriptor = -1
    try:
        if isinstance(handle, _WorkspaceDirectoryHandle):
            try:
                directory.relative_to(handle.workspace)
            except ValueError:
                handle = None
        if isinstance(handle, _WorkspaceDirectoryHandle):
            descriptor = handle.open_directory(directory, create=False)
        else:
            flags = os.O_RDONLY
            if hasattr(os, "O_DIRECTORY"):
                flags |= os.O_DIRECTORY
            if hasattr(os, "O_NOFOLLOW"):
                flags |= os.O_NOFOLLOW
            descriptor = os.open(directory, flags)
        entries = []
        for name in sorted(os.listdir(descriptor)):
            if name in {"", ".", ".."} or "/" in name:
                raise VbdTrajectoryValidationWorkspaceError(
                    "workspace directory contains an unsafe entry name"
                )
            opened = os.stat(name, dir_fd=descriptor, follow_symlinks=False)
            if stat.S_ISDIR(opened.st_mode):
                kind = "dir"
            elif stat.S_ISREG(opened.st_mode):
                kind = "file"
            elif stat.S_ISLNK(opened.st_mode):
                kind = "symlink"
            else:
                kind = "other"
            entries.append((name, kind))
        return tuple(entries)
    except FileNotFoundError as exc:
        if descriptor < 0:
            return ()
        raise VbdTrajectoryValidationWorkspaceError(
            "workspace entry disappeared during descriptor enumeration"
        ) from exc
    except VbdTrajectoryValidationWorkspaceError:
        raise
    except OSError as exc:
        raise VbdTrajectoryValidationWorkspaceError(
            "workspace directory cannot be enumerated safely"
        ) from exc
    finally:
        if descriptor >= 0:
            os.close(descriptor)


def _workspace_tree_entries(
    root: Path, *, include_atomic_temps: bool = False
) -> set[tuple[str, str]]:
    if not _workspace_path_is_dir(root):
        return set()
    entries: set[tuple[str, str]] = set()

    def walk(directory: Path, prefix: str) -> None:
        for name, kind in _workspace_directory_entries(directory):
            relative = name if not prefix else f"{prefix}/{name}"
            candidate = directory / name
            if _is_atomic_temp(candidate) and not include_atomic_temps:
                continue
            entries.add((kind, relative))
            if kind == "dir":
                walk(candidate, relative)

    walk(root, "")
    return entries


def _workspace_has_atomic_temps(root: Path) -> bool:
    return any(
        _is_atomic_temp(Path(relative))
        for _kind, relative in _workspace_tree_entries(
            root, include_atomic_temps=True
        )
    )


def _ensure_workspace_directories(
    workspace: Path, relative_directories: tuple[str, ...]
) -> None:
    handle = _ACTIVE_WORKSPACE_DIRECTORY.get()
    if not isinstance(handle, _WorkspaceDirectoryHandle) or handle.workspace != workspace:
        raise VbdTrajectoryValidationWorkspaceError(
            "workspace directories require the active held root"
        )
    for relative in sorted(
        relative_directories, key=lambda value: (value.count("/"), value)
    ):
        descriptor = handle.open_directory(workspace / relative, create=True)
        os.close(descriptor)
    handle.verify()


def _workspace_directory_bindings(
    workspace: Path, relative_directories: tuple[str, ...]
) -> list[dict]:
    handle = _ACTIVE_WORKSPACE_DIRECTORY.get()
    if handle is None:
        bindings = []
        for relative in relative_directories:
            path = _safe_workspace_path(workspace, *relative.split("/"))
            opened = path.stat(follow_symlinks=False)
            if not stat.S_ISDIR(opened.st_mode):
                raise VbdTrajectoryValidationWorkspaceError(
                    "workspace directory binding is not a directory"
                )
            bindings.append(
                {"path": relative, "device": opened.st_dev, "inode": opened.st_ino}
            )
        return bindings
    if not isinstance(handle, _WorkspaceDirectoryHandle) or handle.workspace != workspace:
        raise VbdTrajectoryValidationWorkspaceError(
            "workspace directory bindings require the active held root"
        )
    bindings = []
    for relative in relative_directories:
        descriptor = handle.open_directory(workspace / relative, create=False)
        try:
            opened = os.fstat(descriptor)
        finally:
            os.close(descriptor)
        bindings.append(
            {"path": relative, "device": opened.st_dev, "inode": opened.st_ino}
        )
    handle.verify()
    return bindings


def _attempt_anchor_root(workspace: Path) -> Path:
    if not workspace.is_absolute() or not workspace.name:
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt anchor requires an absolute named workspace"
        )
    return workspace.parent / f".{workspace.name}.vbd-proof-anchor"


def _attempt_anchor_root_binding(workspace: Path, *, create: bool) -> dict:
    root = _attempt_anchor_root(workspace)
    if create:
        root.mkdir(mode=0o700, parents=False, exist_ok=True)
    flags = os.O_RDONLY
    if hasattr(os, "O_DIRECTORY"):
        flags |= os.O_DIRECTORY
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        before = os.lstat(root)
        descriptor = os.open(root, flags)
        try:
            opened = os.fstat(descriptor)
            phase_bindings = []
            for phase in VBD_TRAJECTORY_ATTEMPT_ANCHOR_PHASES:
                if create:
                    try:
                        os.mkdir(phase, 0o700, dir_fd=descriptor)
                    except FileExistsError:
                        pass
                phase_before = os.stat(
                    phase, dir_fd=descriptor, follow_symlinks=False
                )
                phase_descriptor = os.open(phase, flags, dir_fd=descriptor)
                try:
                    phase_opened = os.fstat(phase_descriptor)
                finally:
                    os.close(phase_descriptor)
                phase_after = os.stat(
                    phase, dir_fd=descriptor, follow_symlinks=False
                )
                if (
                    not stat.S_ISDIR(phase_opened.st_mode)
                    or phase_opened.st_dev != opened.st_dev
                    or (phase_opened.st_mode & 0o077) != 0
                    or (phase_before.st_dev, phase_before.st_ino)
                    != (phase_opened.st_dev, phase_opened.st_ino)
                    or (phase_after.st_dev, phase_after.st_ino)
                    != (phase_opened.st_dev, phase_opened.st_ino)
                ):
                    raise VbdTrajectoryValidationWorkspaceError(
                        "attempt anchor phase is not a private stable directory"
                    )
                phase_bindings.append(
                    {
                        "phase": phase,
                        "device": phase_opened.st_dev,
                        "inode": phase_opened.st_ino,
                    }
                )
        finally:
            os.close(descriptor)
        after = os.lstat(root)
    except OSError as exc:
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt anchor root is missing, linked, or not a directory"
        ) from exc
    if (
        not stat.S_ISDIR(opened.st_mode)
        or (opened.st_mode & 0o077) != 0
        or (before.st_dev, before.st_ino)
        != (opened.st_dev, opened.st_ino)
        or (after.st_dev, after.st_ino)
        != (opened.st_dev, opened.st_ino)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt anchor root is missing, linked, or not a private directory"
        )
    return {
        "attempt_anchor_root_path_hash": sha256_json(str(root)),
        "attempt_anchor_root_device": opened.st_dev,
        "attempt_anchor_root_inode": opened.st_ino,
        "attempt_anchor_directory_bindings": phase_bindings,
    }


def _validate_attempt_anchor_root(workspace: Path, workspace_record: dict) -> Path:
    expected = _attempt_anchor_root_binding(workspace, create=False)
    if any(workspace_record.get(key) != value for key, value in expected.items()):
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt anchor root differs from its create-once identity"
        )
    return _attempt_anchor_root(workspace)


def _attempt_anchor_path(workspace: Path, phase: str, stem: str) -> Path:
    if (
        re.fullmatch(r"[a-z][a-z0-9_]*", phase) is None
        or re.fullmatch(r"[a-z0-9_]+\.json", stem) is None
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt anchor coordinates are invalid"
        )
    return _attempt_anchor_root(workspace) / phase / stem


_ATTEMPT_PERMIT_MANIFEST_NAME = "permit_manifest.json"


def _attempt_permit_name(stem: str) -> str:
    if re.fullmatch(r"[a-z0-9_]+\.json", stem) is None:
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt permit stem is invalid"
        )
    return f"{stem[:-5]}.permit.json"


def _attempt_claim_name(stem: str) -> str:
    if re.fullmatch(r"[a-z0-9_]+\.json", stem) is None:
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt claim stem is invalid"
        )
    return f"{stem[:-5]}.claim.json"


def _validation_attempt_stems() -> dict[str, set[str]]:
    return {
        "canaries": {f"canary_{index:02d}.json" for index in range(4)},
        "original": {f"slot_{index:04d}.json" for index in range(2_000)},
        "recomputation": {
            f"slot_{index:04d}.json" for index in range(2_000)
        },
    }


def _attempt_permit_plan_hash(
    expected_stems: dict[str, set[str]],
) -> str:
    if not expected_stems or any(
        phase not in VBD_TRAJECTORY_ATTEMPT_ANCHOR_PHASES
        or re.fullmatch(r"[a-z][a-z0-9_]*", phase) is None
        or not stems
        or any(re.fullmatch(r"[a-z0-9_]+\.json", stem) is None for stem in stems)
        for phase, stems in expected_stems.items()
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt permit plan is invalid"
        )
    return sha256_json(
        {
            phase: sorted(stems)
            for phase, stems in sorted(expected_stems.items())
        }
    )


def _initial_attempt_permit(phase: str, stem: str) -> dict:
    body = {
        "schema_version": VBD_TRAJECTORY_ATTEMPT_PERMIT_SCHEMA_VERSION,
        "phase": phase,
        "stem": stem,
        "permit_token": secrets.token_hex(32),
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }
    return {**body, "permit_hash": sha256_json(body)}


def _validate_initial_attempt_permit(
    value: object, *, phase: str, stem: str
) -> dict:
    expected_keys = {
        "schema_version",
        "phase",
        "stem",
        "permit_token",
        "internal_only",
        "synthetic_only",
        "customer_output_authorized",
        "permit_hash",
    }
    if type(value) is not dict or set(value) != expected_keys:
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt permit shape is invalid"
        )
    body = {key: item for key, item in value.items() if key != "permit_hash"}
    if (
        value["schema_version"] != VBD_TRAJECTORY_ATTEMPT_PERMIT_SCHEMA_VERSION
        or value["phase"] != phase
        or value["stem"] != stem
        or type(value["permit_token"]) is not str
        or _TOKEN_RE.fullmatch(value["permit_token"]) is None
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt permit identity is invalid"
        )
    if (
        value["internal_only"] is not True
        or value["synthetic_only"] is not True
        or value["customer_output_authorized"] is not False
        or value["permit_hash"] != sha256_json(body)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt permit posture or hash is invalid"
        )
    return value


def _validate_attempt_permit_manifest(
    value: object,
    *,
    expected_stems: dict[str, set[str]] | None = None,
) -> dict:
    expected_keys = {
        "schema_version",
        "permit_mode",
        "permit_plan_hash",
        "permit_count",
        "permits",
        "internal_only",
        "synthetic_only",
        "customer_output_authorized",
        "manifest_hash",
    }
    if type(value) is not dict or set(value) != expected_keys:
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt permit manifest shape is invalid"
        )
    body = {key: item for key, item in value.items() if key != "manifest_hash"}
    permits = value["permits"]
    if (
        value["schema_version"]
        != VBD_TRAJECTORY_ATTEMPT_PERMIT_MANIFEST_SCHEMA_VERSION
        or value["permit_mode"] != VBD_TRAJECTORY_ATTEMPT_PERMIT_MODE
        or type(permits) is not list
        or value["permit_count"] != len(permits)
        or value["internal_only"] is not True
        or value["synthetic_only"] is not True
        or value["customer_output_authorized"] is not False
        or value["manifest_hash"] != sha256_json(body)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt permit manifest is invalid"
        )
    expected_entry_keys = {"phase", "stem", "device", "inode", "permit_hash"}
    coordinates = []
    identities = []
    for item in permits:
        if (
            type(item) is not dict
            or set(item) != expected_entry_keys
            or item["phase"] not in VBD_TRAJECTORY_ATTEMPT_ANCHOR_PHASES
            or re.fullmatch(r"[a-z0-9_]+\.json", item["stem"]) is None
            or type(item["device"]) is not int
            or item["device"] < 0
            or type(item["inode"]) is not int
            or item["inode"] <= 0
        ):
            raise VbdTrajectoryValidationWorkspaceError(
                "attempt permit manifest entry is invalid"
            )
        _strict_sha256(item["permit_hash"], "attempt permit hash")
        coordinates.append((item["phase"], item["stem"]))
        identities.append((item["device"], item["inode"]))
    if (
        coordinates != sorted(coordinates)
        or len(set(coordinates)) != len(coordinates)
        or len(set(identities)) != len(identities)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt permit manifest coordinates are invalid"
        )
    represented = {
        phase: {stem for item_phase, stem in coordinates if item_phase == phase}
        for phase in sorted({phase for phase, _stem in coordinates})
    }
    if value["permit_plan_hash"] != _attempt_permit_plan_hash(represented):
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt permit manifest plan hash is invalid"
        )
    if expected_stems is not None and (
        represented != expected_stems
        or value["permit_plan_hash"] != _attempt_permit_plan_hash(expected_stems)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt permit manifest differs from the immutable execution plan"
        )
    return value


def _initialize_attempt_permit_manifest(
    workspace: Path, expected_stems: dict[str, set[str]]
) -> dict:
    root = _attempt_anchor_root(workspace)
    manifest_path = root / _ATTEMPT_PERMIT_MANIFEST_NAME
    if manifest_path.exists():
        return _validate_attempt_permit_manifest(
            read_strict_json(manifest_path), expected_stems=expected_stems
        )
    entries = []
    for phase, stems in sorted(expected_stems.items()):
        for stem in sorted(stems):
            path = root / phase / _attempt_permit_name(stem)
            if not path.exists():
                write_json_create_once(path, _initial_attempt_permit(phase, stem))
            permit = _validate_initial_attempt_permit(
                read_strict_json(path), phase=phase, stem=stem
            )
            opened = _validate_regular_file(path, label="attempt permit")
            entries.append(
                {
                    "phase": phase,
                    "stem": stem,
                    "device": opened.st_dev,
                    "inode": opened.st_ino,
                    "permit_hash": permit["permit_hash"],
                }
            )
    body = {
        "schema_version": VBD_TRAJECTORY_ATTEMPT_PERMIT_MANIFEST_SCHEMA_VERSION,
        "permit_mode": VBD_TRAJECTORY_ATTEMPT_PERMIT_MODE,
        "permit_plan_hash": _attempt_permit_plan_hash(expected_stems),
        "permit_count": len(entries),
        "permits": entries,
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }
    manifest = {**body, "manifest_hash": sha256_json(body)}
    write_json_create_once(manifest_path, manifest)
    return _validate_attempt_permit_manifest(
        read_strict_json(manifest_path), expected_stems=expected_stems
    )


def _attempt_permit_manifest_binding(
    workspace: Path, *, expected_stems: dict[str, set[str]] | None = None
) -> dict:
    path = _attempt_anchor_root(workspace) / _ATTEMPT_PERMIT_MANIFEST_NAME
    opened = _validate_regular_file(path, label="attempt permit manifest")
    manifest = _cached_attempt_permit_manifest(
        str(path),
        opened.st_dev,
        opened.st_ino,
        opened.st_size,
        _file_sha256(path),
    )
    if expected_stems is not None and (
        manifest["permit_plan_hash"] != _attempt_permit_plan_hash(expected_stems)
        or manifest["permit_count"] != sum(map(len, expected_stems.values()))
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt permit manifest differs from the immutable execution plan"
        )
    return {
        "attempt_permit_mode": VBD_TRAJECTORY_ATTEMPT_PERMIT_MODE,
        "attempt_permit_manifest_device": opened.st_dev,
        "attempt_permit_manifest_inode": opened.st_ino,
        "attempt_permit_manifest_hash": manifest["manifest_hash"],
        "attempt_permit_plan_hash": manifest["permit_plan_hash"],
        "attempt_permit_count": manifest["permit_count"],
    }


@lru_cache(maxsize=32)
def _cached_attempt_permit_manifest(
    path_text: str, device: int, inode: int, size: int, encoded_sha256: str
) -> dict:
    path = Path(path_text)
    opened = _validate_regular_file(path, label="attempt permit manifest")
    if (opened.st_dev, opened.st_ino, opened.st_size) != (device, inode, size):
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt permit manifest identity changed during read"
        )
    if _file_sha256(path) != encoded_sha256:
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt permit manifest bytes changed during read"
        )
    return _validate_attempt_permit_manifest(read_strict_json(path))


def _load_attempt_permit_manifest(
    workspace: Path,
    workspace_record: dict,
    *,
    expected_stems: dict[str, set[str]] | None = None,
) -> dict:
    binding = _attempt_permit_manifest_binding(
        workspace, expected_stems=expected_stems
    )
    if any(workspace_record.get(key) != item for key, item in binding.items()):
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt permit manifest differs from its create-once identity"
        )
    path = _attempt_anchor_root(workspace) / _ATTEMPT_PERMIT_MANIFEST_NAME
    opened = _validate_regular_file(path, label="attempt permit manifest")
    return _cached_attempt_permit_manifest(
        str(path),
        opened.st_dev,
        opened.st_ino,
        opened.st_size,
        _file_sha256(path),
    )


@contextmanager
def _attempt_anchor_phase_descriptor(
    *, workspace: Path, workspace_record: dict, phase: str, create: bool
):
    if re.fullmatch(r"[a-z][a-z0-9_]*", phase) is None:
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt anchor phase is invalid"
        )
    root = _validate_attempt_anchor_root(workspace, workspace_record)
    flags = os.O_RDONLY
    if hasattr(os, "O_DIRECTORY"):
        flags |= os.O_DIRECTORY
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    root_descriptor = -1
    phase_descriptor = -1
    try:
        root_descriptor = os.open(root, flags)
        root_stat = os.fstat(root_descriptor)
        if (
            root_stat.st_dev != workspace_record["attempt_anchor_root_device"]
            or root_stat.st_ino != workspace_record["attempt_anchor_root_inode"]
        ):
            raise VbdTrajectoryValidationWorkspaceError(
                "attempt anchor root changed before phase access"
            )
        if create:
            try:
                os.mkdir(phase, 0o700, dir_fd=root_descriptor)
            except FileExistsError:
                pass
        try:
            before = os.stat(
                phase, dir_fd=root_descriptor, follow_symlinks=False
            )
        except FileNotFoundError:
            if create:
                raise
            yield None
            return
        phase_descriptor = os.open(phase, flags, dir_fd=root_descriptor)
        opened = os.fstat(phase_descriptor)
        after = os.stat(
            phase, dir_fd=root_descriptor, follow_symlinks=False
        )
        expected_binding = next(
            (
                item
                for item in workspace_record[
                    "attempt_anchor_directory_bindings"
                ]
                if item["phase"] == phase
            ),
            None,
        )
        if (
            expected_binding is None
            or not stat.S_ISDIR(opened.st_mode)
            or opened.st_dev != root_stat.st_dev
            or opened.st_dev != expected_binding["device"]
            or opened.st_ino != expected_binding["inode"]
            or (opened.st_mode & 0o077) != 0
            or (before.st_dev, before.st_ino)
            != (opened.st_dev, opened.st_ino)
            or (after.st_dev, after.st_ino)
            != (opened.st_dev, opened.st_ino)
        ):
            raise VbdTrajectoryValidationWorkspaceError(
                "attempt anchor phase changed identity"
            )
        yield phase_descriptor
        final = os.stat(
            phase, dir_fd=root_descriptor, follow_symlinks=False
        )
        if (final.st_dev, final.st_ino) != (opened.st_dev, opened.st_ino):
            raise VbdTrajectoryValidationWorkspaceError(
                "attempt anchor phase changed during access"
            )
    except VbdTrajectoryValidationWorkspaceError:
        raise
    except OSError as exc:
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt anchor phase cannot be accessed safely"
        ) from exc
    finally:
        if phase_descriptor >= 0:
            os.close(phase_descriptor)
        if root_descriptor >= 0:
            os.close(root_descriptor)


def _attempt_permit_binding(
    *, workspace: Path, workspace_record: dict, phase: str, stem: str,
    permit_manifest: dict | None = None
) -> dict:
    manifest = (
        _load_attempt_permit_manifest(workspace, workspace_record)
        if permit_manifest is None
        else permit_manifest
    )
    manifest_hash = manifest["manifest_hash"]
    index = _ATTEMPT_PERMIT_INDEX_CACHE.get(manifest_hash)
    if index is None:
        index = {
            (item["phase"], item["stem"]): item
            for item in manifest["permits"]
        }
        if len(index) != manifest["permit_count"]:
            raise VbdTrajectoryValidationWorkspaceError(
                "attempt permit index is incomplete"
            )
        if len(_ATTEMPT_PERMIT_INDEX_CACHE) >= 32:
            _ATTEMPT_PERMIT_INDEX_CACHE.clear()
        _ATTEMPT_PERMIT_INDEX_CACHE[manifest_hash] = index
    binding = index.get((phase, stem))
    if binding is None:
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt coordinate lacks one immutable launch permit"
        )
    return binding


def _descriptor_stat_or_none(descriptor: int, name: str):
    try:
        return os.stat(name, dir_fd=descriptor, follow_symlinks=False)
    except FileNotFoundError:
        return None


def _validate_attempt_permit_descriptor(
    descriptor: int, *, phase: str, stem: str, binding: dict
) -> dict | None:
    name = _attempt_permit_name(stem)
    opened = _descriptor_stat_or_none(descriptor, name)
    if opened is None:
        return None
    if (
        not stat.S_ISREG(opened.st_mode)
        or opened.st_nlink != 1
        or opened.st_dev != binding["device"]
        or opened.st_ino != binding["inode"]
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt permit identity is stale or unsafe"
        )
    encoded = _read_descriptor_bytes(descriptor, name)
    value = _decode_json_bytes(encoded, name)
    if encoded != _canonical_json_bytes(value):
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt permit JSON is not canonical"
        )
    permit = _validate_initial_attempt_permit(value, phase=phase, stem=stem)
    if permit["permit_hash"] != binding["permit_hash"]:
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt permit differs from its frozen manifest"
        )
    return permit


def _expected_attempt_claim(
    *, workspace_record: dict, phase: str, stem: str, binding: dict,
    launch_receipt: dict
) -> dict:
    body = {
        "schema_version": VBD_TRAJECTORY_ATTEMPT_CLAIM_SCHEMA_VERSION,
        "workspace_hash": workspace_record["workspace_hash"],
        "phase": phase,
        "stem": stem,
        "permit_binding": binding,
        "launch_receipt": launch_receipt,
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }
    return {**body, "claim_hash": sha256_json(body)}


def _validate_attempt_claim_value(
    value: object, *, workspace_record: dict, phase: str, stem: str,
    binding: dict
) -> dict:
    expected_keys = {
        "schema_version",
        "workspace_hash",
        "phase",
        "stem",
        "permit_binding",
        "launch_receipt",
        "internal_only",
        "synthetic_only",
        "customer_output_authorized",
        "claim_hash",
    }
    if type(value) is not dict or set(value) != expected_keys:
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt claim shape is invalid"
        )
    body = {key: item for key, item in value.items() if key != "claim_hash"}
    if (
        value["schema_version"] != VBD_TRAJECTORY_ATTEMPT_CLAIM_SCHEMA_VERSION
        or value["workspace_hash"] != workspace_record["workspace_hash"]
        or value["phase"] != phase
        or value["stem"] != stem
        or value["permit_binding"] != binding
        or type(value["launch_receipt"]) is not dict
        or value["internal_only"] is not True
        or value["synthetic_only"] is not True
        or value["customer_output_authorized"] is not False
        or value["claim_hash"] != sha256_json(body)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt claim is invalid"
        )
    return value


def _load_attempt_claim_descriptor(
    descriptor: int, *, workspace_record: dict, phase: str, stem: str,
    binding: dict
) -> dict | None:
    name = _attempt_claim_name(stem)
    try:
        encoded = _read_descriptor_bytes(descriptor, name)
    except FileNotFoundError:
        return None
    value = _decode_json_bytes(encoded, name)
    if encoded != _canonical_json_bytes(value):
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt claim JSON is not canonical"
        )
    return _validate_attempt_claim_value(
        value,
        workspace_record=workspace_record,
        phase=phase,
        stem=stem,
        binding=binding,
    )


def _expected_attempt_anchor(
    *, workspace_record: dict, phase: str, stem: str, claim: dict
) -> dict:
    body = {
        "schema_version": VBD_TRAJECTORY_ATTEMPT_ANCHOR_SCHEMA_VERSION,
        "workspace_hash": workspace_record["workspace_hash"],
        "phase": phase,
        "stem": stem,
        "claim_hash": claim["claim_hash"],
        "launch_receipt": claim["launch_receipt"],
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }
    return {**body, "anchor_hash": sha256_json(body)}


def _validate_attempt_anchor_value(
    value: object, *, workspace_record: dict, phase: str, stem: str,
    claim: dict
) -> dict:
    expected = _expected_attempt_anchor(
        workspace_record=workspace_record, phase=phase, stem=stem, claim=claim
    )
    if value != expected:
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt anchor differs from its durable claim"
        )
    return expected


def _consume_attempt_permit_descriptor(
    descriptor: int,
    *,
    phase: str,
    stem: str,
    binding: dict,
    claim: dict,
    allow_missing: bool,
) -> None:
    if (
        claim["permit_binding"] != binding
        or claim["phase"] != phase
        or claim["stem"] != stem
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt permit consumption lacks its durable claim"
        )
    name = _attempt_permit_name(stem)
    before = _descriptor_stat_or_none(descriptor, name)
    if before is None:
        if allow_missing:
            return
        raise VbdTrajectoryValidationWorkspaceError(
            "fresh attempt permit disappeared before consumption"
        )
    flags = os.O_RDWR
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        permit_descriptor = os.open(name, flags, dir_fd=descriptor)
    except FileNotFoundError as exc:
        raise VbdTrajectoryValidationWorkspaceError(
            "fresh attempt permit disappeared during consumption"
        ) from exc
    linked = False
    identity_valid = False
    try:
        opened = os.fstat(permit_descriptor)
        after_open = _descriptor_stat_or_none(descriptor, name)
        identity_valid = (
            after_open is not None
            and stat.S_ISREG(opened.st_mode)
            and opened.st_dev == binding["device"]
            and opened.st_ino == binding["inode"]
            and (before.st_dev, before.st_ino) == (opened.st_dev, opened.st_ino)
            and (after_open.st_dev, after_open.st_ino)
            == (opened.st_dev, opened.st_ino)
        )
        linked = opened.st_nlink != 1
        os.ftruncate(permit_descriptor, 0)
        os.fsync(permit_descriptor)
        current = _descriptor_stat_or_none(descriptor, name)
        if current is not None and (current.st_dev, current.st_ino) == (
            opened.st_dev,
            opened.st_ino,
        ):
            os.unlink(name, dir_fd=descriptor)
        else:
            linked = True
        os.fsync(descriptor)
        consumed = os.fstat(permit_descriptor)
        if consumed.st_nlink != 0:
            linked = True
        if _descriptor_stat_or_none(descriptor, name) is not None:
            raise VbdTrajectoryValidationWorkspaceError(
                "attempt permit pathname survived consumption"
            )
    finally:
        os.close(permit_descriptor)
    if not identity_valid:
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt permit changed identity during consumption"
        )
    if linked:
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt permit had a surviving hard link during consumption"
        )


def _reconcile_attempt_phase_temps_descriptor(
    descriptor: int, *, workspace_record: dict, phase: str,
    manifest: dict
) -> None:
    bindings = {
        item["stem"]: item
        for item in manifest["permits"]
        if item["phase"] == phase
    }
    for name in sorted(os.listdir(descriptor)):
        destination = _atomic_temp_destination_name(Path(name))
        if destination is None:
            continue
        opened = os.stat(name, dir_fd=descriptor, follow_symlinks=False)
        if not stat.S_ISREG(opened.st_mode) or opened.st_nlink not in (1, 2):
            raise VbdTrajectoryValidationWorkspaceError(
                "attempt temporary is linked or not regular"
            )
        stem = next(
            (
                item_stem
                for item_stem in bindings
                if destination in (item_stem, _attempt_claim_name(item_stem))
            ),
            None,
        )
        if stem is None:
            raise VbdTrajectoryValidationWorkspaceError(
                "attempt temporary is outside the immutable plan"
            )
        binding = bindings[stem]
        final = _descriptor_stat_or_none(descriptor, destination)
        temporary_removed = False
        if final is not None and opened.st_nlink == 2 and (
            opened.st_dev,
            opened.st_ino,
        ) != (final.st_dev, final.st_ino):
            raise VbdTrajectoryValidationWorkspaceError(
                "attempt temporary link identity is inconsistent"
            )
        if final is not None and opened.st_nlink == 2:
            os.unlink(name, dir_fd=descriptor)
            os.fsync(descriptor)
            temporary_removed = True
        if destination == _attempt_claim_name(stem):
            permit = _validate_attempt_permit_descriptor(
                descriptor, phase=phase, stem=stem, binding=binding
            )
            if final is None:
                if permit is None:
                    raise VbdTrajectoryValidationWorkspaceError(
                        "spent permit lacks its durable attempt claim"
                    )
                encoded = _read_descriptor_bytes(descriptor, name)
                try:
                    candidate = _decode_json_bytes(encoded, name)
                    claim = _validate_attempt_claim_value(
                        candidate,
                        workspace_record=workspace_record,
                        phase=phase,
                        stem=stem,
                        binding=binding,
                    )
                except VbdTrajectoryValidationWorkspaceError:
                    os.unlink(name, dir_fd=descriptor)
                    os.fsync(descriptor)
                    continue
                if encoded != _canonical_json_bytes(claim):
                    raise VbdTrajectoryValidationWorkspaceError(
                        "attempt claim temporary is not canonical"
                    )
                os.link(
                    name,
                    destination,
                    src_dir_fd=descriptor,
                    dst_dir_fd=descriptor,
                    follow_symlinks=False,
                )
            else:
                _load_attempt_claim_descriptor(
                    descriptor,
                    workspace_record=workspace_record,
                    phase=phase,
                    stem=stem,
                    binding=binding,
                )
        else:
            claim = _load_attempt_claim_descriptor(
                descriptor,
                workspace_record=workspace_record,
                phase=phase,
                stem=stem,
                binding=binding,
            )
            if claim is None:
                raise VbdTrajectoryValidationWorkspaceError(
                    "attempt anchor temporary lacks a durable claim"
                )
            expected = _expected_attempt_anchor(
                workspace_record=workspace_record,
                phase=phase,
                stem=stem,
                claim=claim,
            )
            if final is not None:
                value = _decode_json_bytes(
                    _read_descriptor_bytes(descriptor, destination), destination
                )
                _validate_attempt_anchor_value(
                    value,
                    workspace_record=workspace_record,
                    phase=phase,
                    stem=stem,
                    claim=claim,
                )
            else:
                encoded = _read_descriptor_bytes(descriptor, name)
                if not _canonical_json_bytes(expected).startswith(encoded):
                    raise VbdTrajectoryValidationWorkspaceError(
                        "attempt anchor temporary differs from its claim"
                    )
        if not temporary_removed:
            os.unlink(name, dir_fd=descriptor)
            os.fsync(descriptor)


def _create_or_load_attempt_anchor(
    *,
    workspace: Path,
    workspace_record: dict,
    phase: str,
    stem: str,
    launch_receipt: dict,
) -> dict:
    _validate_attempt_anchor_root(workspace, workspace_record)
    manifest = _load_attempt_permit_manifest(workspace, workspace_record)
    binding = _attempt_permit_binding(
        workspace=workspace,
        workspace_record=workspace_record,
        phase=phase,
        stem=stem,
        permit_manifest=manifest,
    )
    with _attempt_anchor_phase_descriptor(
        workspace=workspace,
        workspace_record=workspace_record,
        phase=phase,
        create=True,
    ) as descriptor:
        if descriptor is None:
            raise VbdTrajectoryValidationWorkspaceError(
                "attempt anchor phase was not created"
            )
        _reconcile_attempt_phase_temps_descriptor(
            descriptor,
            workspace_record=workspace_record,
            phase=phase,
            manifest=manifest,
        )
        claim = _load_attempt_claim_descriptor(
            descriptor,
            workspace_record=workspace_record,
            phase=phase,
            stem=stem,
            binding=binding,
        )
        if claim is None:
            if _validate_attempt_permit_descriptor(
                descriptor, phase=phase, stem=stem, binding=binding
            ) is None:
                raise VbdTrajectoryValidationWorkspaceError(
                    "missing attempt permit cannot authorize a fresh launch"
                )
            claim = _expected_attempt_claim(
                workspace_record=workspace_record,
                phase=phase,
                stem=stem,
                binding=binding,
                launch_receipt=launch_receipt,
            )
            _consume_attempt_permit_descriptor(
                descriptor,
                phase=phase,
                stem=stem,
                binding=binding,
                claim=claim,
                allow_missing=False,
            )
            _write_json_create_once_descriptor(
                descriptor,
                _attempt_claim_name(stem),
                claim,
                lock_verifier=None,
            )
            claim = _load_attempt_claim_descriptor(
                descriptor,
                workspace_record=workspace_record,
                phase=phase,
                stem=stem,
                binding=binding,
            )
        else:
            _consume_attempt_permit_descriptor(
                descriptor,
                phase=phase,
                stem=stem,
                binding=binding,
                claim=claim,
                allow_missing=True,
            )
        if claim is None or claim["launch_receipt"] != launch_receipt:
            raise VbdTrajectoryValidationWorkspaceError(
                "attempt claim differs from the planned launch"
            )
        expected = _expected_attempt_anchor(
            workspace_record=workspace_record,
            phase=phase,
            stem=stem,
            claim=claim,
        )
        if _descriptor_stat_or_none(descriptor, stem) is None:
            _write_json_create_once_descriptor(
                descriptor, stem, expected, lock_verifier=None
            )
        value = _decode_json_bytes(
            _read_descriptor_bytes(descriptor, stem), stem
        )
        return _validate_attempt_anchor_value(
            value,
            workspace_record=workspace_record,
            phase=phase,
            stem=stem,
            claim=claim,
        )


def _load_attempt_anchor(
    *, workspace: Path, workspace_record: dict, phase: str, stem: str,
    permit_manifest: dict | None = None, reconcile_temps: bool = True
) -> dict | None:
    _attempt_anchor_path(workspace, phase, stem)
    manifest = (
        _load_attempt_permit_manifest(workspace, workspace_record)
        if permit_manifest is None
        else permit_manifest
    )
    binding = _attempt_permit_binding(
        workspace=workspace,
        workspace_record=workspace_record,
        phase=phase,
        stem=stem,
        permit_manifest=manifest,
    )
    with _attempt_anchor_phase_descriptor(
        workspace=workspace,
        workspace_record=workspace_record,
        phase=phase,
        create=False,
    ) as descriptor:
        if descriptor is None:
            raise VbdTrajectoryValidationWorkspaceError(
                "attempt anchor phase is missing"
            )
        if reconcile_temps:
            _reconcile_attempt_phase_temps_descriptor(
                descriptor,
                workspace_record=workspace_record,
                phase=phase,
                manifest=manifest,
            )
        claim = _load_attempt_claim_descriptor(
            descriptor,
            workspace_record=workspace_record,
            phase=phase,
            stem=stem,
            binding=binding,
        )
        if claim is None:
            permit = _validate_attempt_permit_descriptor(
                descriptor, phase=phase, stem=stem, binding=binding
            )
            if _descriptor_stat_or_none(descriptor, stem) is not None:
                raise VbdTrajectoryValidationWorkspaceError(
                    "attempt anchor exists without a durable claim"
                )
            if permit is None:
                raise VbdTrajectoryValidationWorkspaceError(
                    "spent or missing attempt permit lacks a durable claim"
                )
            return None
        _consume_attempt_permit_descriptor(
            descriptor,
            phase=phase,
            stem=stem,
            binding=binding,
            claim=claim,
            allow_missing=True,
        )
        expected = _expected_attempt_anchor(
            workspace_record=workspace_record,
            phase=phase,
            stem=stem,
            claim=claim,
        )
        if _descriptor_stat_or_none(descriptor, stem) is None:
            _write_json_create_once_descriptor(
                descriptor, stem, expected, lock_verifier=None
            )
        value = _decode_json_bytes(
            _read_descriptor_bytes(descriptor, stem), stem
        )
        return _validate_attempt_anchor_value(
            value,
            workspace_record=workspace_record,
            phase=phase,
            stem=stem,
            claim=claim,
        )


def _attempt_anchor_names(
    *, workspace: Path, workspace_record: dict, phase: str
) -> tuple[str, ...]:
    manifest = _load_attempt_permit_manifest(workspace, workspace_record)
    stems = tuple(
        item["stem"] for item in manifest["permits"] if item["phase"] == phase
    )
    with _attempt_anchor_phase_descriptor(
        workspace=workspace,
        workspace_record=workspace_record,
        phase=phase,
        create=False,
    ) as descriptor:
        if descriptor is None:
            raise VbdTrajectoryValidationWorkspaceError(
                "attempt anchor phase is missing"
            )
        _reconcile_attempt_phase_temps_descriptor(
            descriptor,
            workspace_record=workspace_record,
            phase=phase,
            manifest=manifest,
        )
    admitted = []
    for stem in stems:
        anchor = _load_attempt_anchor(
            workspace=workspace,
            workspace_record=workspace_record,
            phase=phase,
            stem=stem,
            permit_manifest=manifest,
            reconcile_temps=False,
        )
        if anchor is not None:
            admitted.append(stem)
    with _attempt_anchor_phase_descriptor(
        workspace=workspace,
        workspace_record=workspace_record,
        phase=phase,
        create=False,
    ) as descriptor:
        if descriptor is None:
            raise VbdTrajectoryValidationWorkspaceError(
                "attempt anchor phase is missing"
            )
        allowed = {
            name
            for stem in stems
            for name in (_attempt_permit_name(stem), _attempt_claim_name(stem), stem)
        }
        for name in sorted(os.listdir(descriptor)):
            opened = os.stat(name, dir_fd=descriptor, follow_symlinks=False)
            if (
                name not in allowed
                or not stat.S_ISREG(opened.st_mode)
                or opened.st_nlink != 1
            ):
                raise VbdTrajectoryValidationWorkspaceError(
                    "attempt anchor phase contains an unsafe or off-plan entry"
                )
    return tuple(admitted)


def _restore_attempt_anchored_launches(
    *,
    workspace: Path,
    workspace_record: dict,
    phase_launch_directories: dict[str, Path],
    expected_stems: dict[str, set[str]],
    verify_lock_identity: Callable[[], None],
) -> None:
    if set(phase_launch_directories) != set(expected_stems):
        raise VbdTrajectoryValidationWorkspaceError(
            "attempt anchor restoration plan is incomplete"
        )
    for phase, launch_directory in phase_launch_directories.items():
        for stem in _attempt_anchor_names(
            workspace=workspace,
            workspace_record=workspace_record,
            phase=phase,
        ):
            if stem not in expected_stems[phase]:
                raise VbdTrajectoryValidationWorkspaceError(
                    "attempt anchor is outside the immutable execution plan"
                )
            anchor = _load_attempt_anchor(
                workspace=workspace,
                workspace_record=workspace_record,
                phase=phase,
                stem=stem,
            )
            if anchor is None:
                raise VbdTrajectoryValidationWorkspaceError(
                    "enumerated attempt anchor disappeared"
                )
            launch_path = launch_directory / stem
            if not _workspace_path_exists(launch_path):
                write_json_create_once(
                    launch_path,
                    anchor["launch_receipt"],
                    lock_verifier=verify_lock_identity,
                )
            elif read_strict_json(launch_path) != anchor["launch_receipt"]:
                raise VbdTrajectoryValidationWorkspaceError(
                    "workspace launch differs from its external attempt anchor"
                )


def _restore_validation_attempt_launches(
    *,
    workspace: Path,
    workspace_record: dict,
    verify_lock_identity: Callable[[], None],
) -> None:
    _restore_attempt_anchored_launches(
        workspace=workspace,
        workspace_record=workspace_record,
        phase_launch_directories={
            "canaries": workspace / "canaries" / "launches",
            "original": workspace / "original" / "launches",
            "recomputation": workspace / "recomputation" / "launches",
        },
        expected_stems={
            "canaries": {f"canary_{index:02d}.json" for index in range(4)},
            "original": {f"slot_{index:04d}.json" for index in range(2_000)},
            "recomputation": {
                f"slot_{index:04d}.json" for index in range(2_000)
            },
        },
        verify_lock_identity=verify_lock_identity,
    )


def _validate_validation_launch_anchors(workspace: Path) -> None:
    workspace_path = workspace / "workspace.json"
    if not _workspace_path_exists(workspace_path):
        return
    workspace_record = _validate_workspace_record(
        read_strict_json(workspace_path), workspace=workspace
    )
    for phase, launch_directory in (
        ("canaries", workspace / "canaries" / "launches"),
        ("original", workspace / "original" / "launches"),
        ("recomputation", workspace / "recomputation" / "launches"),
    ):
        if not _workspace_path_is_dir(launch_directory):
            continue
        for stem, kind in _workspace_directory_entries(launch_directory):
            if kind != "file":
                raise VbdTrajectoryValidationWorkspaceError(
                    "launch directory contains a special entry"
                )
            anchor = _load_attempt_anchor(
                workspace=workspace,
                workspace_record=workspace_record,
                phase=phase,
                stem=stem,
            )
            if (
                anchor is None
                or anchor["launch_receipt"]
                != read_strict_json(launch_directory / stem)
            ):
                raise VbdTrajectoryValidationWorkspaceError(
                    "workspace launch lacks its external attempt anchor"
                )


def _workspace_from_user_path(workspace_dir: str | Path) -> Path:
    requested = Path(os.path.abspath(Path(workspace_dir).expanduser()))
    if any(path.is_symlink() for path in (requested, *requested.parents)):
        raise VbdTrajectoryValidationWorkspaceError(
            "workspace roots must not contain symlinks"
        )
    workspace = requested.resolve(strict=False)
    repo = _repo_root().resolve()
    if any(_same_existing_path(path, repo) for path in (workspace, *workspace.parents)):
        raise VbdTrajectoryValidationWorkspaceError(
            "validation checkpoints must remain outside the repository"
        )
    return workspace


@contextmanager
def _exclusive_lock(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    directory_flags = os.O_RDONLY
    if hasattr(os, "O_DIRECTORY"):
        directory_flags |= os.O_DIRECTORY
    if hasattr(os, "O_NOFOLLOW"):
        directory_flags |= os.O_NOFOLLOW
    try:
        directory_descriptor = os.open(path.parent, directory_flags)
    except OSError as exc:
        raise VbdTrajectoryValidationWorkspaceError(
            "validation workspace directory lock is unavailable"
        ) from exc
    directory_locked = False
    descriptor = None
    file_locked = False
    flags = os.O_CREAT | os.O_RDWR
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        opened_directory = os.fstat(directory_descriptor)
        if not stat.S_ISDIR(opened_directory.st_mode):
            raise VbdTrajectoryValidationWorkspaceError(
                "validation workspace lock parent is not a directory"
            )
        try:
            fcntl.flock(
                directory_descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB
            )
            directory_locked = True
        except BlockingIOError as exc:
            raise VbdTrajectoryValidationWorkspaceError(
                "validation execution is already active"
            ) from exc
        try:
            descriptor = os.open(
                path.name, flags, 0o600, dir_fd=directory_descriptor
            )
        except OSError as exc:
            raise VbdTrajectoryValidationWorkspaceError(
                "validation execution lock is unavailable"
            ) from exc
        opened = os.fstat(descriptor)
        if not stat.S_ISREG(opened.st_mode) or opened.st_nlink != 1:
            raise VbdTrajectoryValidationWorkspaceError(
                "validation execution lock is linked or not regular"
            )
        try:
            fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
            file_locked = True
        except BlockingIOError as exc:
            raise VbdTrajectoryValidationWorkspaceError(
                "validation execution is already active"
            ) from exc

        workspace_handle = _WorkspaceDirectoryHandle(
            path.parent, directory_descriptor
        )

        def verify_lock_identity() -> None:
            try:
                current_directory = path.parent.stat(follow_symlinks=False)
                held_directory = os.fstat(directory_descriptor)
                current = path.stat(follow_symlinks=False)
                held = os.fstat(descriptor)
            except OSError as exc:
                raise VbdTrajectoryValidationWorkspaceError(
                    "validation execution lock identity changed"
                ) from exc
            if (
                not stat.S_ISDIR(current_directory.st_mode)
                or not stat.S_ISDIR(held_directory.st_mode)
                or (current_directory.st_dev, current_directory.st_ino)
                != (held_directory.st_dev, held_directory.st_ino)
                or not stat.S_ISREG(current.st_mode)
                or current.st_nlink != 1
                or held.st_nlink != 1
                or (current.st_dev, current.st_ino)
                != (held.st_dev, held.st_ino)
            ):
                raise VbdTrajectoryValidationWorkspaceError(
                    "validation execution lock identity changed"
                )
            workspace_handle.verify()

        verify_lock_identity()
        active_token = _ACTIVE_WORKSPACE_DIRECTORY.set(workspace_handle)
        try:
            yield verify_lock_identity
            verify_lock_identity()
        finally:
            _ACTIVE_WORKSPACE_DIRECTORY.reset(active_token)
            workspace_handle.close()
    finally:
        if descriptor is not None:
            if file_locked:
                fcntl.flock(descriptor, fcntl.LOCK_UN)
            os.close(descriptor)
        if directory_locked:
            fcntl.flock(directory_descriptor, fcntl.LOCK_UN)
        os.close(directory_descriptor)


def _trusted_git_executable() -> Path:
    for candidate in (Path("/usr/bin/git"), Path("/bin/git")):
        if candidate.is_file():
            return candidate
    raise VbdTrajectoryValidationWorkspaceError(
        "trusted Git executable is unavailable"
    )


def _git_environment() -> dict[str, str]:
    return {
        "PATH": "/usr/bin:/bin",
        "GIT_CONFIG_GLOBAL": os.devnull,
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_OPTIONAL_LOCKS": "0",
        "GIT_TERMINAL_PROMPT": "0",
        "LC_ALL": "C",
    }


def _git_command(*args: str) -> tuple[str, ...]:
    return (
        str(_trusted_git_executable()),
        "-c",
        "core.fsmonitor=false",
        "-c",
        "core.untrackedCache=false",
        "-c",
        f"core.hooksPath={os.devnull}",
        "-C",
        str(_repo_root()),
        f"--work-tree={_repo_root()}",
        *args,
    )


def _git_output(*args: str) -> str:
    try:
        completed = subprocess.run(
            _git_command(*args),
            cwd="/",
            env=_git_environment(),
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        raise VbdTrajectoryValidationWorkspaceError(
            "Git source identity is unavailable"
        ) from exc
    return completed.stdout.strip()


def _git_bytes(*args: str) -> bytes:
    try:
        completed = subprocess.run(
            _git_command(*args),
            cwd="/",
            env=_git_environment(),
            check=True,
            capture_output=True,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        raise VbdTrajectoryValidationWorkspaceError(
            "Git source bytes are unavailable"
        ) from exc
    return completed.stdout


@lru_cache(maxsize=1)
def vbd_trajectory_runner_implementation_manifest() -> dict:
    files = []
    for relative in _RUNNER_SOURCE_PATHS:
        path = _repo_root() / relative
        _validate_regular_file(path, label=f"runner source {relative}")
        files.append({"path": relative, "sha256": _file_sha256(path)})
    body = {"files": files}
    return {**body, "implementation_hash": sha256_json(body)}


def _loaded_native_library_manifest() -> list[dict]:
    with threadpool_limits(limits=1):
        np.dot(np.ones((2, 2)), np.ones((2, 2)))
        pools = threadpool_info()
    libraries = []
    for pool in sorted(
        pools,
        key=lambda value: (
            str(value.get("internal_api", "")),
            str(value.get("prefix", "")),
            str(value.get("filepath", "")),
        ),
    ):
        path = Path(str(pool.get("filepath", ""))).resolve()
        _validate_regular_file(path, label="loaded native library")
        libraries.append(
            {
                "kind": "threadpool_library",
                "internal_api": str(pool.get("internal_api", "")),
                "prefix": str(pool.get("prefix", "")),
                "version": str(pool.get("version", "")),
                "sha256": _file_sha256(path),
                "num_threads": int(pool.get("num_threads", 0)),
            }
        )
    if any(item["num_threads"] != 1 for item in libraries):
        raise VbdTrajectoryValidationWorkspaceError(
            "native numerical libraries must be loaded single-threaded"
        )
    for module_name in (
        "numpy._core._multiarray_umath",
        "scipy.linalg._fblas",
        "scipy.linalg._flapack",
        "scipy.special._ufuncs",
    ):
        module = importlib.import_module(module_name)
        path = Path(str(module.__file__)).resolve()
        if path.is_symlink() or not path.is_file():
            raise VbdTrajectoryValidationWorkspaceError(
                "required native numerical extension is unavailable"
            )
        libraries.append(
            {
                "kind": "python_native_extension",
                "component": module_name,
                "sha256": _file_sha256(path),
                "linkage_hash": _native_linkage_hash(path),
            }
        )
    return libraries


def _native_linkage_hash(path: Path) -> str | None:
    if platform.system() != "Darwin":
        return None
    try:
        completed = subprocess.run(
            ("otool", "-L", str(path)),
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        raise VbdTrajectoryValidationWorkspaceError(
            "macOS native linkage identity is unavailable"
        ) from exc
    dependencies = [line.strip() for line in completed.stdout.splitlines()[1:]]
    if not dependencies:
        raise VbdTrajectoryValidationWorkspaceError(
            "macOS native linkage identity is empty"
        )
    return sha256_json(dependencies)


def _locked_runtime_package_versions() -> dict[str, str]:
    lock_path = _repo_root() / "inference/requirements.lock"
    _validate_regular_file(lock_path, label="inference requirements lock")
    versions: dict[str, str] = {}
    for line in lock_path.read_text(encoding="utf-8").splitlines():
        if not line or line.startswith("#"):
            continue
        name, separator, version = line.partition("==")
        if (
            separator != "=="
            or not name
            or not version
            or name in versions
            or any(character.isspace() for character in line)
        ):
            raise VbdTrajectoryValidationWorkspaceError(
                "inference requirements lock is not an exact package manifest"
            )
        versions[name] = version
    if not versions:
        raise VbdTrajectoryValidationWorkspaceError(
            "inference requirements lock is empty"
        )
    installed = {
        name: importlib.metadata.version(name) for name in sorted(versions)
    }
    if installed != {name: versions[name] for name in sorted(versions)}:
        raise VbdTrajectoryValidationWorkspaceError(
            "installed inference environment differs from requirements.lock"
        )
    return installed


@lru_cache(maxsize=1)
def build_vbd_trajectory_runtime_identity() -> dict:
    if (sys.version_info.major, sys.version_info.minor) != (3, 13):
        raise VbdTrajectoryValidationWorkspaceError(
            "VBD trajectory proof requires the pinned Python 3.13 runtime"
        )
    if threading.active_count() != 1:
        raise VbdTrajectoryValidationWorkspaceError(
            "VBD trajectory proof requires one active Python thread"
        )
    environment = {key: os.environ.get(key) for key in _THREAD_ENV_KEYS}
    if any(value != "1" for value in environment.values()):
        raise VbdTrajectoryValidationWorkspaceError(
            "all compiled numerical thread limits must equal one"
        )
    if not sys.dont_write_bytecode:
        raise VbdTrajectoryValidationWorkspaceError(
            "full VBD trajectory execution requires bytecode writes disabled"
        )
    versions = {
        name: importlib.metadata.version(name)
        for name in _EXPECTED_RUNTIME_PACKAGE_VERSIONS
    }
    if versions != _EXPECTED_RUNTIME_PACKAGE_VERSIONS:
        raise VbdTrajectoryValidationWorkspaceError(
            "VBD trajectory runtime package versions drifted"
        )
    executable = Path(sys.executable).resolve()
    _validate_regular_file(executable, label="Python executable")
    body = {
        "python_version": platform.python_version(),
        "python_implementation": platform.python_implementation(),
        "python_compiler": platform.python_compiler(),
        "platform_system": platform.system(),
        "platform_machine": platform.machine(),
        "platform_release": platform.release(),
        "platform_version": platform.version(),
        "macos_version": list(platform.mac_ver()),
        "python_build": list(platform.python_build()),
        "executable_sha256": _file_sha256(executable),
        "package_versions": versions,
        "locked_package_versions": _locked_runtime_package_versions(),
        "thread_environment": environment,
        "python_dont_write_bytecode": True,
        "numpy_build_config_hash": sha256_json(np.show_config(mode="dicts")),
        "native_libraries": _loaded_native_library_manifest(),
    }
    return {**body, "runtime_identity_hash": sha256_json(body)}


def _validate_freeze_manifest(value: object) -> dict:
    expected_keys = {
        "schema_version",
        "candidate_source_commit",
        "candidate_source_tree",
        "in_scope_files",
        "in_scope_files_hash",
        "implementation_review_refs",
        "runtime_identity_hash",
        "implementation_hash",
        "requirements_lock_hash",
        "generator_source_hash",
        "interface_source_hash",
        "plan_hash",
        "seed_manifest_hash",
        "concordance_plan_hash",
        "concordance_seed_manifest_hash",
        "pre_run_roots_hash",
        "allowed_command_ids",
        "execution_state",
        "internal_only",
        "synthetic_only",
        "aggregate_only",
        "customer_output_authorized",
        "acceptance_complete",
        "task_5_6_complete",
        "promotion_complete",
        "manifest_hash",
    }
    if type(value) is not dict or set(value) != expected_keys:
        raise VbdTrajectoryValidationWorkspaceError(
            "freeze manifest shape is invalid"
        )
    body = {key: item for key, item in value.items() if key != "manifest_hash"}
    commit = value["candidate_source_commit"]
    tree = value["candidate_source_tree"]
    reviews = value["implementation_review_refs"]
    files = value["in_scope_files"]
    if (
        value["schema_version"] != VBD_TRAJECTORY_FREEZE_MANIFEST_SCHEMA_VERSION
        or type(commit) is not str
        or _COMMIT_RE.fullmatch(commit) is None
        or type(tree) is not str
        or _COMMIT_RE.fullmatch(tree) is None
        or type(files) is not list
        or not _implementation_review_refs_are_valid(reviews, commit)
        or value["allowed_command_ids"] != list(_ALLOWED_COMMAND_IDS)
        or value["execution_state"] != "NOT_RUN"
        or value["internal_only"] is not True
        or value["synthetic_only"] is not True
        or value["aggregate_only"] is not True
        or value["customer_output_authorized"] is not False
        or value["acceptance_complete"] is not False
        or value["task_5_6_complete"] is not False
        or value["promotion_complete"] is not False
        or value["manifest_hash"] != sha256_json(body)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "freeze manifest posture or self-hash is invalid"
        )
    expected_file_keys = {"path", "sha256"}
    paths = []
    for item in files:
        if type(item) is not dict or set(item) != expected_file_keys:
            raise VbdTrajectoryValidationWorkspaceError(
                "freeze manifest file entry is invalid"
            )
        path = item["path"]
        if (
            type(path) is not str
            or not path
            or path.startswith("/")
            or ".." in Path(path).parts
        ):
            raise VbdTrajectoryValidationWorkspaceError(
                "freeze manifest path is unsafe"
            )
        _strict_sha256(item["sha256"], "freeze file hash")
        paths.append(path)
    if paths != sorted(_RUNNER_SOURCE_PATHS) or len(set(paths)) != len(paths):
        raise VbdTrajectoryValidationWorkspaceError(
            "freeze manifest must contain the exact sorted in-scope source set"
        )
    for key in (
        "in_scope_files_hash",
        "runtime_identity_hash",
        "implementation_hash",
        "requirements_lock_hash",
        "generator_source_hash",
        "interface_source_hash",
        "plan_hash",
        "seed_manifest_hash",
        "concordance_plan_hash",
        "concordance_seed_manifest_hash",
        "pre_run_roots_hash",
    ):
        _strict_sha256(value[key], key)
    if value["in_scope_files_hash"] != sha256_json(files):
        raise VbdTrajectoryValidationWorkspaceError(
            "freeze manifest file root is invalid"
        )
    return value


def _interface_source_hash() -> str:
    return sha256_json(
        [
            _file_sha256(
                _repo_root()
                / "inference/src/fluencytracr_inference/vbd_trajectory_types.py"
            ),
            _file_sha256(
                _repo_root()
                / "inference/src/fluencytracr_inference/vbd_trajectory_preparation.py"
            ),
        ]
    )


def _pre_run_roots_hash(roots: dict) -> str:
    return sha256_json(
        {
            "runtime_identity_hash": roots["runtime_identity_hash"],
            "implementation_hash": roots["implementation_hash"],
            "requirements_lock_hash": roots["requirements_lock_hash"],
            "generator_source_hash": roots["generator_source_hash"],
            "interface_source_hash": roots["interface_source_hash"],
            "plan_hash": roots["plan_hash"],
            "seed_manifest_hash": roots["seed_manifest_hash"],
            "concordance_plan_hash": roots["concordance_plan_hash"],
            "concordance_seed_manifest_hash": roots[
                "concordance_seed_manifest_hash"
            ],
            "allowed_command_ids": list(_ALLOWED_COMMAND_IDS),
        }
    )


def _implementation_review_refs_are_valid(
    value: object, candidate_source_commit: str
) -> bool:
    if (
        type(value) is not dict
        or set(value) != set(_REVIEW_ROLE_SLUGS)
        or any(type(reference) is not str for reference in value.values())
        or len(set(value.values())) != len(_REVIEW_ROLE_SLUGS)
    ):
        return False
    return all(
        type(value[role]) is str
        and _REVIEW_REF_RE.fullmatch(value[role]) is not None
        and value[role].startswith(
            f"review:{slug}/go/{candidate_source_commit}/"
        )
        for role, slug in _REVIEW_ROLE_SLUGS.items()
    )


def build_vbd_trajectory_freeze_manifest(
    *, implementation_review_refs: dict[str, str]
) -> dict:
    """Build, but never write, the create-once manifest for candidate commit S."""

    if _git_output("status", "--porcelain", "--untracked-files=all") != "":
        raise VbdTrajectoryValidationWorkspaceError(
            "freeze manifest generation requires clean candidate commit S"
        )
    candidate = _git_output("rev-parse", "HEAD")
    candidate_tree = _git_output("rev-parse", "HEAD^{tree}")
    if _COMMIT_RE.fullmatch(candidate) is None or _COMMIT_RE.fullmatch(candidate_tree) is None:
        raise VbdTrajectoryValidationWorkspaceError(
            "candidate commit or tree identity is invalid"
        )
    if not _implementation_review_refs_are_valid(
        implementation_review_refs, candidate
    ):
        raise ValueError(
            "all four unique GO review refs must bind candidate commit S"
        )
    files = []
    for relative in sorted(_RUNNER_SOURCE_PATHS):
        path = _repo_root() / relative
        _validate_regular_file(path, label=f"candidate source {relative}")
        current_hash = _file_sha256(path)
        committed_hash = hashlib.sha256(
            _git_bytes("show", f"HEAD:{relative}")
        ).hexdigest()
        if current_hash != committed_hash:
            raise VbdTrajectoryValidationWorkspaceError(
                "candidate source differs from committed bytes"
            )
        files.append({"path": relative, "sha256": current_hash})
    implementation = vbd_trajectory_runner_implementation_manifest()
    runtime = build_vbd_trajectory_runtime_identity()
    plan = immutable_vbd_trajectory_validation_plan()
    from .vbd_trajectory_concordance import (
        vbd_trajectory_concordance_plan,
        vbd_trajectory_concordance_seed_manifest_hash,
    )

    concordance_plan = vbd_trajectory_concordance_plan()
    roots = {
        "runtime_identity_hash": runtime["runtime_identity_hash"],
        "implementation_hash": implementation["implementation_hash"],
        "requirements_lock_hash": _file_sha256(
            _repo_root() / "inference/requirements.lock"
        ),
        "generator_source_hash": _file_sha256(
            _repo_root()
            / "inference/src/fluencytracr_inference/vbd_trajectory_synthetic.py"
        ),
        "interface_source_hash": _interface_source_hash(),
        "plan_hash": plan.plan_hash,
        "seed_manifest_hash": plan.seeds_hash,
        "concordance_plan_hash": concordance_plan["plan_hash"],
        "concordance_seed_manifest_hash": (
            vbd_trajectory_concordance_seed_manifest_hash()
        ),
    }
    body = {
        "schema_version": VBD_TRAJECTORY_FREEZE_MANIFEST_SCHEMA_VERSION,
        "candidate_source_commit": candidate,
        "candidate_source_tree": candidate_tree,
        "in_scope_files": files,
        "in_scope_files_hash": sha256_json(files),
        "implementation_review_refs": implementation_review_refs,
        **roots,
        "pre_run_roots_hash": _pre_run_roots_hash(roots),
        "allowed_command_ids": list(_ALLOWED_COMMAND_IDS),
        "execution_state": "NOT_RUN",
        "internal_only": True,
        "synthetic_only": True,
        "aggregate_only": True,
        "customer_output_authorized": False,
        "acceptance_complete": False,
        "task_5_6_complete": False,
        "promotion_complete": False,
    }
    return {**body, "manifest_hash": sha256_json(body)}


def _verify_current_freeze(value: dict) -> dict:
    manifest = _validate_freeze_manifest(value)
    canonical_path = _repo_root() / VBD_TRAJECTORY_FREEZE_MANIFEST_RELATIVE_PATH
    canonical_manifest = _validate_freeze_manifest(read_strict_json(canonical_path))
    if manifest != canonical_manifest:
        raise VbdTrajectoryValidationWorkspaceError(
            "freeze manifest differs from committed canonical bytes"
        )
    head = _git_output("rev-parse", "HEAD")
    parents = _git_output("rev-list", "--parents", "-n", "1", "HEAD").split()
    changed = tuple(
        line
        for line in _git_output(
            "diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"
        ).splitlines()
        if line
    )
    if (
        _COMMIT_RE.fullmatch(head) is None
        or len(parents) != 2
        or parents[1] != manifest["candidate_source_commit"]
        or changed != (VBD_TRAJECTORY_FREEZE_MANIFEST_RELATIVE_PATH,)
        or _git_output("status", "--porcelain", "--untracked-files=all") != ""
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "execution requires a clean manifest-only freeze child"
        )
    candidate_tree = _git_output("rev-parse", f"{parents[1]}^{{tree}}")
    if candidate_tree != manifest["candidate_source_tree"]:
        raise VbdTrajectoryValidationWorkspaceError(
            "candidate source tree differs from the freeze manifest"
        )
    for item in manifest["in_scope_files"]:
        path = _repo_root() / item["path"]
        _validate_regular_file(path, label="frozen in-scope source")
        current_hash = _file_sha256(path)
        candidate_hash = hashlib.sha256(
            _git_bytes("show", f"{parents[1]}:{item['path']}")
        ).hexdigest()
        if current_hash != item["sha256"] or candidate_hash != item["sha256"]:
            raise VbdTrajectoryValidationWorkspaceError(
                "an in-scope source differs from frozen candidate bytes"
            )
    implementation = vbd_trajectory_runner_implementation_manifest()
    runtime = build_vbd_trajectory_runtime_identity()
    expected_roots = {
        "implementation_hash": implementation["implementation_hash"],
        "runtime_identity_hash": runtime["runtime_identity_hash"],
        "requirements_lock_hash": _file_sha256(
            _repo_root() / "inference/requirements.lock"
        ),
        "generator_source_hash": _file_sha256(
            _repo_root()
            / "inference/src/fluencytracr_inference/vbd_trajectory_synthetic.py"
        ),
        "interface_source_hash": _interface_source_hash(),
        "plan_hash": immutable_vbd_trajectory_validation_plan().plan_hash,
        "seed_manifest_hash": immutable_vbd_trajectory_validation_plan().seeds_hash,
    }
    from .vbd_trajectory_concordance import (
        vbd_trajectory_concordance_plan,
        vbd_trajectory_concordance_seed_manifest_hash,
    )

    expected_roots.update(
        {
            "concordance_plan_hash": vbd_trajectory_concordance_plan()[
                "plan_hash"
            ],
            "concordance_seed_manifest_hash": (
                vbd_trajectory_concordance_seed_manifest_hash()
            ),
        }
    )
    for key, expected in expected_roots.items():
        if manifest[key] != expected:
            raise VbdTrajectoryValidationWorkspaceError(
                f"freeze manifest {key} differs from the current runner"
            )
    if manifest["pre_run_roots_hash"] != _pre_run_roots_hash(expected_roots):
        raise VbdTrajectoryValidationWorkspaceError(
            "freeze manifest pre-run root differs from the current runner"
        )
    return {
        "freeze_commit": head,
        "freeze_manifest_hash": manifest["manifest_hash"],
        "candidate_source_commit": manifest["candidate_source_commit"],
        "candidate_source_tree": manifest["candidate_source_tree"],
        "implementation_hash": implementation["implementation_hash"],
        "runtime_identity_hash": runtime["runtime_identity_hash"],
        "executable_sha256": runtime["executable_sha256"],
        "native_library_identity_hash": sha256_json(runtime["native_libraries"]),
        "plan_hash": manifest["plan_hash"],
        "seed_manifest_hash": manifest["seed_manifest_hash"],
    }


def _validate_concordance_receipt(
    value: object,
    freeze_identity: dict,
) -> dict:
    del value, freeze_identity
    raise VbdTrajectoryValidationWorkspaceError(
        "concordance admission remains disabled without complete external "
        "workspace verification"
    )


def _workspace_location_binding(workspace: Path) -> dict:
    opened = workspace.stat(follow_symlinks=False)
    if not stat.S_ISDIR(opened.st_mode):
        raise VbdTrajectoryValidationWorkspaceError(
            "validation workspace is not a directory"
        )
    return {
        "workspace_path_hash": sha256_json(str(workspace)),
        "workspace_device": opened.st_dev,
        "workspace_inode": opened.st_ino,
    }


def _concordance_receipt_location_binding(receipt_path: Path) -> dict:
    if not receipt_path.is_absolute():
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance receipt path must be absolute"
        )
    try:
        canonical_path = receipt_path.resolve(strict=True)
    except OSError as exc:
        raise VbdTrajectoryValidationWorkspaceError(
            "external concordance receipt is unavailable"
        ) from exc
    if canonical_path != receipt_path:
        raise VbdTrajectoryValidationWorkspaceError(
            "external concordance receipt path is no longer canonical"
        )
    opened = _validate_regular_file(
        canonical_path, label="external concordance receipt"
    )
    repo_root = _repo_root().resolve()
    if any(
        _same_existing_path(candidate, repo_root)
        for candidate in (canonical_path.parent, *canonical_path.parents)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "concordance execution receipts must remain outside the repository"
        )
    return {
        "concordance_receipt_path": str(canonical_path),
        "concordance_receipt_path_hash": sha256_json(str(canonical_path)),
        "concordance_receipt_device": opened.st_dev,
        "concordance_receipt_inode": opened.st_ino,
    }


def _workspace_record(
    freeze_identity: dict,
    concordance: dict,
    workspace: Path,
    concordance_path: Path,
) -> dict:
    body = {
        "schema_version": VBD_TRAJECTORY_RUNNER_WORKSPACE_SCHEMA_VERSION,
        **freeze_identity,
        "concordance_receipt_hash": concordance["receipt_hash"],
        **_concordance_receipt_location_binding(concordance_path),
        **_workspace_location_binding(workspace),
        **_attempt_anchor_root_binding(workspace, create=False),
        **_attempt_permit_manifest_binding(
            workspace, expected_stems=_validation_attempt_stems()
        ),
        "workspace_directory_bindings": _workspace_directory_bindings(
            workspace, _VALIDATION_WORKSPACE_DIRECTORIES
        ),
        "created_at": _utc_now(),
        "workspace_token": secrets.token_hex(32),
        "phase_order": list(VBD_TRAJECTORY_VALIDATION_PHASES),
        "required_slot_count_per_phase": (
            VBD_TRAJECTORY_VALIDATION_REQUIRED_SLOT_COUNT
        ),
        "required_canary_count": 4,
        "threat_model": VBD_TRAJECTORY_RUNNER_THREAT_MODEL,
        "internal_only": True,
        "synthetic_only": True,
        "aggregate_only": True,
        "customer_output_authorized": False,
        "acceptance_complete": False,
        "task_5_6_complete": False,
        "promotion_complete": False,
    }
    return {**body, "workspace_hash": sha256_json(body)}


def initialize_vbd_trajectory_validation_workspace(
    workspace_dir: str | Path,
    *,
    freeze_manifest_path: str | Path | None = None,
    concordance_receipt_path: str | Path,
) -> Path:
    """Create the full-study workspace only from an accepted frozen source."""

    workspace = _workspace_from_user_path(workspace_dir)
    workspace.mkdir(parents=True, exist_ok=True)
    manifest_path = (
        _repo_root() / VBD_TRAJECTORY_FREEZE_MANIFEST_RELATIVE_PATH
        if freeze_manifest_path is None
        else Path(freeze_manifest_path).expanduser().resolve()
    )
    _validate_regular_file(manifest_path, label="freeze manifest")
    canonical_manifest_path = (
        _repo_root() / VBD_TRAJECTORY_FREEZE_MANIFEST_RELATIVE_PATH
    )
    if not _same_existing_path(manifest_path, canonical_manifest_path):
        raise VbdTrajectoryValidationWorkspaceError(
            "full execution requires the canonical committed freeze manifest"
        )
    concordance_path = Path(concordance_receipt_path).expanduser().resolve()
    concordance_location = _concordance_receipt_location_binding(
        concordance_path
    )
    with _exclusive_lock(
        _safe_workspace_path(workspace, ".runner.lock")
    ) as verify_lock_identity:
        verify_lock_identity()
        _cleanup_stale_atomic_temps(workspace)
        verify_lock_identity()
        _validate_tree_links(workspace)
        _ensure_workspace_directories(
            workspace, _VALIDATION_WORKSPACE_DIRECTORIES
        )
        _attempt_anchor_root_binding(workspace, create=True)
        _initialize_attempt_permit_manifest(
            workspace, _validation_attempt_stems()
        )
        freeze_value = read_strict_json(manifest_path)
        if type(freeze_value) is not dict:
            raise VbdTrajectoryValidationWorkspaceError(
                "freeze manifest must be an object"
            )
        freeze_identity = _verify_current_freeze(freeze_value)
        from .vbd_trajectory_concordance_resumable import (
            verify_vbd_trajectory_concordance_receipt_path,
        )

        concordance = verify_vbd_trajectory_concordance_receipt_path(
            concordance_path, freeze_identity=freeze_identity
        )
        plan = immutable_vbd_trajectory_validation_plan().to_dict()
        records = (
            ("plan.json", plan),
            ("freeze_manifest.json", freeze_value),
            ("concordance_receipt.json", concordance),
        )
        for filename, value in records:
            path = _safe_workspace_path(workspace, filename)
            if _workspace_path_exists(path):
                if _canonical_json_bytes(read_strict_json(path)) != _canonical_json_bytes(
                    value
                ):
                    raise VbdTrajectoryValidationWorkspaceError(
                        f"workspace {filename} differs from frozen inputs"
                    )
            else:
                write_json_create_once(
                    path, value, lock_verifier=verify_lock_identity
                )
        workspace_path = _safe_workspace_path(workspace, "workspace.json")
        if _workspace_path_exists(workspace_path):
            existing_workspace = _validate_workspace_record(
                read_strict_json(workspace_path), workspace=workspace
            )
            if any(
                existing_workspace[key] != value
                for key, value in freeze_identity.items()
            ) or existing_workspace["concordance_receipt_hash"] != concordance[
                "receipt_hash"
            ] or any(
                existing_workspace[key] != value
                for key, value in concordance_location.items()
            ):
                raise VbdTrajectoryValidationWorkspaceError(
                    "workspace identity differs from frozen inputs"
                )
        else:
            write_json_create_once(
                workspace_path,
                _workspace_record(
                    freeze_identity,
                    concordance,
                    workspace,
                    concordance_path,
                ),
                lock_verifier=verify_lock_identity,
            )
        verify_lock_identity()
        _validate_workspace_tree(workspace, complete=False)
    return workspace


def _validate_workspace_record(
    value: object, *, workspace: Path | None = None
) -> dict:
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
        "concordance_receipt_hash",
        "concordance_receipt_path",
        "concordance_receipt_path_hash",
        "concordance_receipt_device",
        "concordance_receipt_inode",
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
        "required_slot_count_per_phase",
        "required_canary_count",
        "threat_model",
        "internal_only",
        "synthetic_only",
        "aggregate_only",
        "customer_output_authorized",
        "acceptance_complete",
        "task_5_6_complete",
        "promotion_complete",
        "workspace_hash",
    }
    if type(value) is not dict or set(value) != expected:
        raise VbdTrajectoryValidationWorkspaceError("workspace record shape is invalid")
    body = {key: item for key, item in value.items() if key != "workspace_hash"}
    if (
        value["schema_version"] != VBD_TRAJECTORY_RUNNER_WORKSPACE_SCHEMA_VERSION
        or any(
            type(value[key]) is not str
            or _SHA256_RE.fullmatch(value[key]) is None
            for key in (
                "freeze_manifest_hash",
                "implementation_hash",
                "runtime_identity_hash",
                "executable_sha256",
                "native_library_identity_hash",
                "plan_hash",
                "seed_manifest_hash",
                "concordance_receipt_hash",
            )
        )
        or _strict_sha256(value["workspace_path_hash"], "workspace path hash")
        != value["workspace_path_hash"]
        or type(value["concordance_receipt_path"]) is not str
        or not Path(value["concordance_receipt_path"]).is_absolute()
        or _strict_sha256(
            value["concordance_receipt_path_hash"],
            "concordance receipt path hash",
        )
        != value["concordance_receipt_path_hash"]
        or value["concordance_receipt_path_hash"]
        != sha256_json(value["concordance_receipt_path"])
        or type(value["concordance_receipt_device"]) is not int
        or value["concordance_receipt_device"] < 0
        or type(value["concordance_receipt_inode"]) is not int
        or value["concordance_receipt_inode"] <= 0
        or type(value["workspace_device"]) is not int
        or value["workspace_device"] < 0
        or type(value["workspace_inode"]) is not int
        or value["workspace_inode"] <= 0
        or _strict_sha256(
            value["attempt_anchor_root_path_hash"],
            "attempt anchor root path hash",
        )
        != value["attempt_anchor_root_path_hash"]
        or type(value["attempt_anchor_root_device"]) is not int
        or value["attempt_anchor_root_device"] < 0
        or type(value["attempt_anchor_root_inode"]) is not int
        or value["attempt_anchor_root_inode"] <= 0
        or type(value["attempt_anchor_directory_bindings"]) is not list
        or [
            item.get("phase") if type(item) is dict else None
            for item in value["attempt_anchor_directory_bindings"]
        ]
        != list(VBD_TRAJECTORY_ATTEMPT_ANCHOR_PHASES)
        or any(
            set(item) != {"phase", "device", "inode"}
            or type(item["device"]) is not int
            or item["device"] < 0
            or type(item["inode"]) is not int
            or item["inode"] <= 0
            for item in value["attempt_anchor_directory_bindings"]
        )
        or value["attempt_permit_mode"] != VBD_TRAJECTORY_ATTEMPT_PERMIT_MODE
        or type(value["attempt_permit_manifest_device"]) is not int
        or value["attempt_permit_manifest_device"] < 0
        or type(value["attempt_permit_manifest_inode"]) is not int
        or value["attempt_permit_manifest_inode"] <= 0
        or _strict_sha256(
            value["attempt_permit_manifest_hash"],
            "attempt permit manifest hash",
        )
        != value["attempt_permit_manifest_hash"]
        or value["attempt_permit_plan_hash"]
        != _attempt_permit_plan_hash(_validation_attempt_stems())
        or value["attempt_permit_count"] != 4_004
        or type(value["workspace_directory_bindings"]) is not list
        or [
            item.get("path") if type(item) is dict else None
            for item in value["workspace_directory_bindings"]
        ]
        != list(_VALIDATION_WORKSPACE_DIRECTORIES)
        or any(
            type(item) is not dict
            or set(item) != {"path", "device", "inode"}
            or type(item["device"]) is not int
            or item["device"] < 0
            or type(item["inode"]) is not int
            or item["inode"] <= 0
            for item in value["workspace_directory_bindings"]
        )
        or any(
            type(value[key]) is not str
            or _COMMIT_RE.fullmatch(value[key]) is None
            for key in (
                "freeze_commit",
                "candidate_source_commit",
                "candidate_source_tree",
            )
        )
        or _strict_timestamp(value["created_at"], "workspace created_at")
        != value["created_at"]
        or _strict_token(value["workspace_token"], "workspace token")
        != value["workspace_token"]
        or value["phase_order"] != list(VBD_TRAJECTORY_VALIDATION_PHASES)
        or value["required_slot_count_per_phase"] != 2_000
        or value["required_canary_count"] != 4
        or value["threat_model"] != VBD_TRAJECTORY_RUNNER_THREAT_MODEL
        or value["internal_only"] is not True
        or value["synthetic_only"] is not True
        or value["aggregate_only"] is not True
        or value["customer_output_authorized"] is not False
        or value["acceptance_complete"] is not False
        or value["task_5_6_complete"] is not False
        or value["promotion_complete"] is not False
        or value["workspace_hash"] != sha256_json(body)
    ):
        raise VbdTrajectoryValidationWorkspaceError("workspace record is invalid")
    if workspace is not None:
        expected_location = _workspace_location_binding(workspace)
        if any(value[key] != item for key, item in expected_location.items()):
            raise VbdTrajectoryValidationWorkspaceError(
                "workspace location differs from its create-once identity"
            )
        if value["workspace_directory_bindings"] != _workspace_directory_bindings(
            workspace, _VALIDATION_WORKSPACE_DIRECTORIES
        ):
            raise VbdTrajectoryValidationWorkspaceError(
                "workspace directory bindings differ from create-once identities"
            )
        _validate_attempt_anchor_root(workspace, value)
        _load_attempt_permit_manifest(
            workspace,
            value,
            expected_stems=_validation_attempt_stems(),
        )
    return value


def _load_workspace(workspace_dir: str | Path) -> tuple[Path, dict]:
    workspace = _workspace_from_user_path(workspace_dir)
    if not workspace.is_dir():
        raise VbdTrajectoryValidationWorkspaceError("workspace does not exist")
    record = _validate_workspace_record(
        read_strict_json(_safe_workspace_path(workspace, "workspace.json")),
        workspace=workspace,
    )
    try:
        plan = vbd_trajectory_validation_plan_from_dict(
            read_strict_json(_safe_workspace_path(workspace, "plan.json"))
        )
    except Exception as exc:
        raise VbdTrajectoryValidationWorkspaceError(
            "workspace plan is malformed or off plan"
        ) from exc
    if plan != immutable_vbd_trajectory_validation_plan():
        raise VbdTrajectoryValidationWorkspaceError(
            "workspace plan differs from the immutable plan"
        )
    freeze = _validate_freeze_manifest(
        read_strict_json(_safe_workspace_path(workspace, "freeze_manifest.json"))
    )
    identity = _verify_current_freeze(freeze)
    for key in identity:
        if record[key] != identity[key]:
            raise VbdTrajectoryValidationWorkspaceError(
                "workspace source identity is stale"
            )
    concordance_path = Path(record["concordance_receipt_path"])
    current_concordance_location = _concordance_receipt_location_binding(
        concordance_path
    )
    if any(
        record[key] != value
        for key, value in current_concordance_location.items()
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "external concordance receipt identity is stale"
        )
    from .vbd_trajectory_concordance_resumable import (
        verify_vbd_trajectory_concordance_receipt_path,
    )

    concordance = verify_vbd_trajectory_concordance_receipt_path(
        concordance_path, freeze_identity=identity
    )
    local_concordance = read_strict_json(
        _safe_workspace_path(workspace, "concordance_receipt.json")
    )
    if local_concordance != concordance:
        raise VbdTrajectoryValidationWorkspaceError(
            "workspace concordance receipt differs from externally recomputed evidence"
        )
    if concordance["receipt_hash"] != record["concordance_receipt_hash"]:
        raise VbdTrajectoryValidationWorkspaceError(
            "workspace concordance binding is stale"
        )
    combined_path = _safe_workspace_path(workspace, "combined.json")
    commit_path = _safe_workspace_path(workspace, "combined_commit.json")
    if _workspace_path_exists(commit_path) and not _workspace_path_exists(combined_path):
        raise VbdTrajectoryValidationWorkspaceError(
            "combined commit marker exists without its output"
        )
    if _workspace_path_exists(combined_path):
        combined = _validate_combined_value(
            read_strict_json(combined_path), record
        )
        current_evidence_snapshot = _execution_evidence_snapshot(workspace)
        if (
            current_evidence_snapshot["snapshot_hash"]
            != combined["execution_evidence_snapshot_hash"]
        ):
            raise VbdTrajectoryValidationWorkspaceError(
                "combined execution evidence snapshot is stale"
            )
        if _workspace_path_exists(commit_path):
            _validate_combined_commit(
                read_strict_json(commit_path),
                workspace_record=record,
                combined=combined,
            )
    return workspace, record


def _slot_file_stem(slot_index: int) -> str:
    if type(slot_index) is not int or not 0 <= slot_index < 2_000:
        raise ValueError("slot index must be in 0..1999")
    return f"slot_{slot_index:04d}"


def _phase_path(workspace: Path, phase: str, *parts: str) -> Path:
    if phase not in VBD_TRAJECTORY_VALIDATION_PHASES:
        raise ValueError("phase must be original or recomputation")
    return _safe_workspace_path(workspace, phase, *parts)


def _phase_manifest_body(
    *, phase: str, workspace_record: dict, original_study_hash: str | None
) -> dict:
    return {
        "schema_version": VBD_TRAJECTORY_PHASE_SCHEMA_VERSION,
        "phase": phase,
        "workspace_hash": workspace_record["workspace_hash"],
        "freeze_commit": workspace_record["freeze_commit"],
        "freeze_manifest_hash": workspace_record["freeze_manifest_hash"],
        "plan_hash": workspace_record["plan_hash"],
        "original_study_hash": original_study_hash,
        "started_at": _utc_now(),
        "phase_token": secrets.token_hex(32),
        "creator_process_token": secrets.token_hex(32),
        "creator_process_id": os.getpid(),
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }


def _create_or_load_phase_manifest(
    *,
    workspace: Path,
    phase: str,
    workspace_record: dict,
    original_study_hash: str | None,
    verify_lock_identity: Callable[[], None],
) -> dict:
    path = _phase_path(workspace, phase, "phase.json")
    if _workspace_path_exists(path):
        return _validate_phase_manifest(
            read_strict_json(path),
            phase=phase,
            workspace_record=workspace_record,
            original_study_hash=original_study_hash,
        )
    body = _phase_manifest_body(
        phase=phase,
        workspace_record=workspace_record,
        original_study_hash=original_study_hash,
    )
    value = {**body, "phase_hash": sha256_json(body)}
    write_json_create_once(path, value, lock_verifier=verify_lock_identity)
    return value


def _validate_phase_manifest(
    value: object,
    *,
    phase: str,
    workspace_record: dict,
    original_study_hash: str | None,
) -> dict:
    expected = {
        "schema_version",
        "phase",
        "workspace_hash",
        "freeze_commit",
        "freeze_manifest_hash",
        "plan_hash",
        "original_study_hash",
        "started_at",
        "phase_token",
        "workspace_hash",
        "creator_process_token",
        "creator_process_id",
        "internal_only",
        "synthetic_only",
        "customer_output_authorized",
        "phase_hash",
    }
    if type(value) is not dict or set(value) != expected:
        raise VbdTrajectoryValidationWorkspaceError("phase manifest shape is invalid")
    body = {key: item for key, item in value.items() if key != "phase_hash"}
    if (
        value["schema_version"] != VBD_TRAJECTORY_PHASE_SCHEMA_VERSION
        or value["phase"] != phase
        or value["workspace_hash"] != workspace_record["workspace_hash"]
        or value["freeze_commit"] != workspace_record["freeze_commit"]
        or value["freeze_manifest_hash"]
        != workspace_record["freeze_manifest_hash"]
        or value["plan_hash"] != workspace_record["plan_hash"]
        or value["original_study_hash"] != original_study_hash
        or _strict_timestamp(value["started_at"], "phase started_at")
        != value["started_at"]
        or _strict_token(value["phase_token"], "phase token")
        != value["phase_token"]
        or _strict_token(value["creator_process_token"], "creator process token")
        != value["creator_process_token"]
        or type(value["creator_process_id"]) is not int
        or value["creator_process_id"] <= 0
        or value["internal_only"] is not True
        or value["synthetic_only"] is not True
        or value["customer_output_authorized"] is not False
        or value["phase_hash"] != sha256_json(body)
    ):
        raise VbdTrajectoryValidationWorkspaceError("phase manifest is invalid")
    return value


def _launch_receipt(
    *,
    execution_kind: str,
    phase: str,
    phase_hash: str,
    phase_token: str,
    slot: VbdTrajectoryValidationSlot,
    slot_index: int,
    workspace_record: dict,
    canary: VbdTrajectoryCanaryDescriptor | None,
    capability_token_hash: str,
) -> dict:
    if execution_kind not in {"canary", "study"}:
        raise ValueError("execution kind is invalid")
    body = {
        "schema_version": VBD_TRAJECTORY_LAUNCH_RECEIPT_SCHEMA_VERSION,
        "execution_kind": execution_kind,
        "phase": phase,
        "phase_hash": phase_hash,
        "phase_token": phase_token,
        "workspace_hash": workspace_record["workspace_hash"],
        "slot_index": slot_index,
        "slot_id": slot.slot_id,
        "slot_hash": slot.slot_hash,
        "canary_id": None if canary is None else canary.canary_id,
        "canary_hash": None if canary is None else canary.canary_hash,
        "plan_hash": workspace_record["plan_hash"],
        "freeze_commit": workspace_record["freeze_commit"],
        "freeze_manifest_hash": workspace_record["freeze_manifest_hash"],
        "implementation_hash": workspace_record["implementation_hash"],
        "runtime_identity_hash": workspace_record["runtime_identity_hash"],
        "executable_sha256": workspace_record["executable_sha256"],
        "native_library_identity_hash": workspace_record[
            "native_library_identity_hash"
        ],
        "command_id": "vbd_trajectory_child_execute_slot",
        "command_hash": _child_command_hash(),
        "parent_process_id": os.getpid(),
        "created_at": _utc_now(),
        "launch_token": secrets.token_hex(32),
        "capability_token_hash": _strict_sha256(
            capability_token_hash, "capability token hash"
        ),
        "result_present": False,
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }
    return {**body, "launch_receipt_hash": sha256_json(body)}


def _validate_launch_receipt(
    value: object,
    *,
    execution_kind: str,
    phase: str,
    phase_manifest: dict,
    slot: VbdTrajectoryValidationSlot,
    slot_index: int,
    workspace_record: dict,
    canary: VbdTrajectoryCanaryDescriptor | None,
) -> dict:
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
        raise VbdTrajectoryValidationWorkspaceError("launch receipt shape is invalid")
    body = {key: item for key, item in value.items() if key != "launch_receipt_hash"}
    expected_canary_id = None if canary is None else canary.canary_id
    expected_canary_hash = None if canary is None else canary.canary_hash
    if (
        value["schema_version"] != VBD_TRAJECTORY_LAUNCH_RECEIPT_SCHEMA_VERSION
        or value["execution_kind"] != execution_kind
        or value["phase"] != phase
        or value["phase_hash"] != phase_manifest["phase_hash"]
        or value["phase_token"] != phase_manifest["phase_token"]
        or value["workspace_hash"] != workspace_record["workspace_hash"]
        or value["slot_index"] != slot_index
        or value["slot_id"] != slot.slot_id
        or value["slot_hash"] != slot.slot_hash
        or value["canary_id"] != expected_canary_id
        or value["canary_hash"] != expected_canary_hash
        or any(
            value[key] != workspace_record[key]
            for key in (
                "plan_hash",
                "freeze_commit",
                "freeze_manifest_hash",
                "implementation_hash",
                "runtime_identity_hash",
                "executable_sha256",
                "native_library_identity_hash",
            )
        )
        or value["command_id"] != "vbd_trajectory_child_execute_slot"
        or value["command_hash"] != _child_command_hash()
        or type(value["parent_process_id"]) is not int
        or value["parent_process_id"] <= 0
        or _strict_timestamp(value["created_at"], "launch created_at")
        != value["created_at"]
        or _strict_token(value["launch_token"], "launch token")
        != value["launch_token"]
        or _strict_sha256(
            value["capability_token_hash"], "capability token hash"
        )
        != value["capability_token_hash"]
        or value["result_present"] is not False
        or value["internal_only"] is not True
        or value["synthetic_only"] is not True
        or value["customer_output_authorized"] is not False
        or value["launch_receipt_hash"] != sha256_json(body)
    ):
        raise VbdTrajectoryValidationWorkspaceError("launch receipt is invalid")
    return value


def _launch_capability(receipt: dict, capability_token: str) -> dict:
    if (
        _strict_token(capability_token, "capability token")
        != capability_token
        or sha256_json(capability_token) != receipt["capability_token_hash"]
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "launch capability does not match its create-once receipt"
        )
    body = {
        "schema_version": VBD_TRAJECTORY_LAUNCH_CAPABILITY_SCHEMA_VERSION,
        "launch_receipt_hash": receipt["launch_receipt_hash"],
        "workspace_hash": receipt["workspace_hash"],
        "parent_process_id": os.getpid(),
        "capability_token": capability_token,
        "created_at": _utc_now(),
        "internal_only": True,
        "synthetic_only": True,
    }
    return {**body, "capability_hash": sha256_json(body)}


def _frozen_source_bundle(*, expected_freeze_manifest_hash: str) -> bytes:
    _strict_sha256(
        expected_freeze_manifest_hash, "expected freeze manifest hash"
    )
    manifest = _validate_freeze_manifest(
        read_strict_json(
            _repo_root() / VBD_TRAJECTORY_FREEZE_MANIFEST_RELATIVE_PATH
        )
    )
    if manifest["manifest_hash"] != expected_freeze_manifest_hash:
        raise VbdTrajectoryValidationWorkspaceError(
            "frozen child source manifest differs from launch admission"
        )
    modules = []
    for item in manifest["in_scope_files"]:
        path = item["path"]
        if not path.endswith(".py"):
            continue
        source = _git_bytes(
            "show", f"{manifest['candidate_source_commit']}:{path}"
        )
        if hashlib.sha256(source).hexdigest() != item["sha256"]:
            raise VbdTrajectoryValidationWorkspaceError(
                "frozen child source differs from the reviewed candidate"
            )
        module = path.removeprefix("inference/src/").removesuffix(".py").replace(
            "/", "."
        )
        is_package = module.endswith(".__init__")
        if is_package:
            module = module.removesuffix(".__init__")
        modules.append(
            {
                "module": module,
                "path": path,
                "sha256": item["sha256"],
                "source_base64": base64.b64encode(source).decode("ascii"),
                "is_package": is_package,
            }
        )
    if (
        not modules
        or modules != sorted(modules, key=lambda value: value["module"])
        or len({item["module"] for item in modules}) != len(modules)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "frozen child module set is incomplete or noncanonical"
        )
    body = {
        "schema_version": "FT_AI_VALUE_VBD_FROZEN_CHILD_SOURCE_2026_07_V1",
        "candidate_source_commit": manifest["candidate_source_commit"],
        "freeze_manifest_hash": manifest["manifest_hash"],
        "repository_root": str(_repo_root()),
        "site_package_paths": _pinned_site_package_paths(),
        "modules": modules,
    }
    return _canonical_json_bytes({**body, "bundle_hash": sha256_json(body)})


def _frozen_child_command(target_module: str, *target_args: str) -> tuple[str, ...]:
    if (
        not target_module.startswith("fluencytracr_inference.")
        or any(type(value) is not str for value in target_args)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "frozen child target is invalid"
        )
    return (
        sys.executable,
        "-I",
        "-S",
        "-c",
        _FROZEN_CHILD_BOOTSTRAP,
        target_module,
        *target_args,
    )


def _pinned_site_package_paths() -> list[str]:
    paths = sorted(
        {
            str(Path(value).resolve())
            for value in sys.path
            if type(value) is str
            and value
            and Path(value).name in {"site-packages", "dist-packages"}
            and Path(value).is_dir()
        }
    )
    if not paths:
        raise VbdTrajectoryValidationWorkspaceError(
            "pinned runtime site-packages are unavailable"
        )
    return paths


def _child_environment(
    *,
    capability_fd: int,
    parent_liveness_fd: int,
    frozen_source_fd: int,
) -> dict[str, str]:
    allowed = ("HOME", "LANG", "LC_ALL", "PATH", "TMPDIR")
    environment = {
        key: value for key in allowed if (value := os.environ.get(key)) is not None
    }
    environment.update({key: "1" for key in _THREAD_ENV_KEYS})
    environment["PYTHONDONTWRITEBYTECODE"] = "1"
    environment["PYTHONHASHSEED"] = "0"
    environment["FT_VBD_TRAJECTORY_CHILD"] = "1"
    environment["FT_VBD_TRAJECTORY_CAPABILITY_FD"] = str(capability_fd)
    environment["FT_VBD_TRAJECTORY_PARENT_LIVENESS_FD"] = str(
        parent_liveness_fd
    )
    environment["FT_VBD_TRAJECTORY_FROZEN_SOURCE_FD"] = str(
        frozen_source_fd
    )
    return environment


def _child_command() -> tuple[str, ...]:
    return _frozen_child_command(
        "fluencytracr_inference.vbd_trajectory_validation_cli",
        "_execute-slot",
    )


def _child_command_hash() -> str:
    return sha256_json(
        {
            "command_id": "vbd_trajectory_child_execute_slot",
            "python_executable_sha256": _file_sha256(Path(sys.executable).resolve()),
            "argv_tail": list(_child_command()[1:]),
        }
    )


def _revalidate_launch_admission(workspace: Path, receipt: dict) -> None:
    loaded_workspace, workspace_record = _load_workspace(workspace)
    if (
        not _same_existing_path(loaded_workspace, workspace)
        or receipt["workspace_hash"] != workspace_record["workspace_hash"]
        or receipt["parent_process_id"] != os.getpid()
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "child launch is detached from its admitted workspace"
        )
    _validate_workspace_tree(workspace, complete=False)
    slot = required_vbd_trajectory_validation_slots()[receipt["slot_index"]]
    if receipt["execution_kind"] == "canary":
        phase_path = _safe_workspace_path(workspace, "canaries", "phase.json")
        if not _workspace_path_exists(phase_path):
            raise VbdTrajectoryValidationWorkspaceError(
                "canary launch lacks its create-once phase manifest"
            )
        phase_manifest = _canary_phase_manifest(workspace, workspace_record)
        matches = tuple(
            item
            for item in required_vbd_trajectory_canaries()
            if item.canary_id == receipt["canary_id"]
            and item.canary_hash == receipt["canary_hash"]
            and item.slot == slot
        )
        if len(matches) != 1:
            raise VbdTrajectoryValidationWorkspaceError(
                "canary launch is not in the immutable canary plan"
            )
        canary = matches[0]
        launch_path = _safe_workspace_path(
            workspace,
            "canaries",
            "launches",
            f"canary_{canary.canary_ordinal:02d}.json",
        )
        anchor_phase = "canaries"
        anchor_stem = f"canary_{canary.canary_ordinal:02d}.json"
        expected_state = "CANARIES"
    else:
        phase = receipt["phase"]
        phase_path = _phase_path(workspace, phase, "phase.json")
        raw_phase = read_strict_json(phase_path)
        original_study_hash = (
            None
            if phase == "original"
            else _strict_sha256(
                raw_phase.get("original_study_hash")
                if type(raw_phase) is dict
                else None,
                "recomputation original study hash",
            )
        )
        phase_manifest = _validate_phase_manifest(
            raw_phase,
            phase=phase,
            workspace_record=workspace_record,
            original_study_hash=original_study_hash,
        )
        canary = None
        launch_path = _phase_path(
            workspace,
            phase,
            "launches",
            f"{_slot_file_stem(receipt['slot_index'])}.json",
        )
        anchor_phase = phase
        anchor_stem = f"{_slot_file_stem(receipt['slot_index'])}.json"
        expected_state = "PRIMARY" if phase == "original" else "RECOMPUTE"
    persisted = _validate_launch_receipt(
        read_strict_json(launch_path),
        execution_kind=receipt["execution_kind"],
        phase=receipt["phase"],
        phase_manifest=phase_manifest,
        slot=slot,
        slot_index=receipt["slot_index"],
        workspace_record=workspace_record,
        canary=canary,
    )
    anchor = _load_attempt_anchor(
        workspace=workspace,
        workspace_record=workspace_record,
        phase=anchor_phase,
        stem=anchor_stem,
    )
    if (
        persisted != receipt
        or anchor is None
        or anchor["launch_receipt"] != receipt
        or _validate_progress_state(workspace) != expected_state
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "child launch is not the current create-once workspace action"
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
    process = None
    try:
        verify_lock_identity()
        _revalidate_launch_admission(workspace, receipt)
        verify_lock_identity()
        process = subprocess.Popen(
            command,
            cwd="/",
            env=_child_environment(
                capability_fd=capability_read,
                parent_liveness_fd=liveness_read,
                frozen_source_fd=source_read,
            ),
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
        encoded_capability = _canonical_json_bytes(capability)
        written = 0
        while written < len(encoded_capability):
            written += os.write(capability_write, encoded_capability[written:])
        os.close(capability_write)
        capability_write = -1
        try:
            stdout, stderr = process.communicate(
                _canonical_json_bytes(receipt),
                timeout=VBD_TRAJECTORY_CHILD_TIMEOUT_SECONDS,
            )
        except subprocess.TimeoutExpired:
            process.kill()
            stdout, stderr = process.communicate()
            verify_lock_identity()
            return process.pid, 124, stdout[:_CHILD_STDOUT_LIMIT], stderr[
                :_CHILD_STDERR_LIMIT
            ]
    except OSError as exc:
        _terminate_started_child(process)
        raise VbdTrajectoryValidationWorkspaceError(
            "child process could not be launched"
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
            "child process could not be launched"
        )
    verify_lock_identity()
    if len(stdout) > _CHILD_STDOUT_LIMIT or len(stderr) > _CHILD_STDERR_LIMIT:
        return process.pid, 125, b"", b""
    return process.pid, process.returncode, stdout, stderr


def _terminate_started_child(process: subprocess.Popen | None) -> None:
    if process is None:
        return
    try:
        if process.poll() is None:
            process.kill()
    finally:
        process.wait()


def _validate_child_output(
    value: object,
    *,
    receipt: dict,
    observed_child_pid: int,
    require_current_parent: bool = True,
) -> tuple[VbdTrajectorySlotResult, dict]:
    expected = {
        "schema_version",
        "slot_result",
        "execution_attestation",
        "child_output_hash",
    }
    if type(value) is not dict or set(value) != expected:
        raise VbdTrajectoryValidationWorkspaceError("child output shape is invalid")
    body = {key: item for key, item in value.items() if key != "child_output_hash"}
    if (
        value["schema_version"] != VBD_TRAJECTORY_CHILD_OUTPUT_SCHEMA_VERSION
        or value["child_output_hash"] != sha256_json(body)
    ):
        raise VbdTrajectoryValidationWorkspaceError("child output hash is invalid")
    try:
        result = vbd_trajectory_slot_result_from_dict(value["slot_result"])
    except Exception as exc:
        raise VbdTrajectoryValidationWorkspaceError(
            "child slot result is invalid"
        ) from exc
    attestation = value["execution_attestation"]
    if type(attestation) is not dict or set(attestation) != _EXECUTION_ATTESTATION_KEYS:
        raise VbdTrajectoryValidationWorkspaceError(
            "execution attestation shape is invalid"
        )
    attestation_body = {
        key: item for key, item in attestation.items() if key != "attestation_hash"
    }
    started_at = datetime.fromisoformat(
        _strict_timestamp(attestation["process_started_at"], "process started_at")
    )
    completed_at = datetime.fromisoformat(
        _strict_timestamp(
            attestation["process_completed_at"], "process completed_at"
        )
    )
    if completed_at < started_at:
        raise VbdTrajectoryValidationWorkspaceError(
            "execution attestation completed before it started"
        )
    if (
        any(
            attestation[key] != receipt[key]
            for key in (
                "execution_kind",
                "phase",
                "phase_hash",
                "phase_token",
                "workspace_hash",
                "slot_index",
                "slot_id",
                "slot_hash",
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
        or attestation["attestation_version"] != "fresh_process_v1"
        or attestation["launch_receipt_hash"] != receipt["launch_receipt_hash"]
        or _strict_token(attestation["process_token"], "process token")
        != attestation["process_token"]
        or type(attestation["process_id"]) is not int
        or attestation["process_id"] != observed_child_pid
        or type(attestation["parent_process_id"]) is not int
        or attestation["parent_process_id"] <= 0
        or (
            require_current_parent
            and attestation["parent_process_id"] != os.getpid()
        )
        or attestation["process_id"] == attestation["parent_process_id"]
        or _strict_timestamp(
            attestation["process_started_at"], "process started_at"
        )
        != attestation["process_started_at"]
        or _strict_timestamp(
            attestation["process_completed_at"], "process completed_at"
        )
        != attestation["process_completed_at"]
        or any(
            type(attestation[key]) is not str
            or _SHA256_RE.fullmatch(attestation[key]) is None
            for key in (
                "process_start_identity_hash",
                "executable_sha256",
                "native_library_identity_hash",
                "prepared_input_hashes_hash",
                "semantic_result_hash",
            )
        )
        or attestation["process_start_identity_hash"]
        != sha256_json(
            {
                "process_token": attestation["process_token"],
                "process_id": attestation["process_id"],
                "parent_process_id": attestation["parent_process_id"],
                "process_started_at": attestation["process_started_at"],
            }
        )
        or attestation["prepared_input_hashes_hash"]
        != sha256_json(
            [lane.prepared_input_hash for lane in result.lane_results]
        )
        or attestation["semantic_result_hash"] != result.semantic_result_hash
        or attestation["workspace_path_received"] is not False
        or attestation["prior_phase_inputs_received"] is not False
        or attestation["prior_phase_inputs_read"] is not False
        or attestation["result_arrays_emitted"] is not False
        or attestation["internal_only"] is not True
        or attestation["synthetic_only"] is not True
        or attestation["customer_output_authorized"] is not False
        or attestation["attestation_hash"] != sha256_json(attestation_body)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "execution attestation is invalid"
        )
    if result.slot.slot_id != receipt["slot_id"]:
        raise VbdTrajectoryValidationWorkspaceError(
            "child result does not match its launch slot"
        )
    return result, attestation


def _decode_canonical_child_stdout(encoded: bytes) -> object:
    value = _decode_json_bytes(encoded, "child stdout")
    if encoded != _canonical_json_bytes(value):
        raise VbdTrajectoryValidationWorkspaceError(
            "child stdout is not one canonical JSON envelope"
        )
    return value


def _runner_error_result(slot: VbdTrajectoryValidationSlot, code: str) -> VbdTrajectorySlotResult:
    return build_vbd_trajectory_slot_result(
        slot=slot,
        row_state="RUNNER_ERROR",
        failure_stage="runner_execution",
        failure_code=code,
        fit_attempted=False,
        lane_results=(),
        unplanned_runner_error=True,
    )


def _checkpoint(
    *,
    phase_manifest: dict,
    receipt: dict,
    result: VbdTrajectorySlotResult,
    attestation: dict | None,
    child_process_id: int | None,
    child_return_class: str,
    child_stdout_hash: str,
    child_stderr_hash: str,
    original_semantic_result_hash: str | None,
) -> dict:
    body = {
        "schema_version": VBD_TRAJECTORY_CHECKPOINT_SCHEMA_VERSION,
        "phase": phase_manifest["phase"],
        "phase_hash": phase_manifest["phase_hash"],
        "phase_token": phase_manifest["phase_token"],
        "slot_index": receipt["slot_index"],
        "slot_id": receipt["slot_id"],
        "slot_hash": receipt["slot_hash"],
        "launch_receipt_hash": receipt["launch_receipt_hash"],
        "execution_attestation": attestation,
        "child_process_id": child_process_id,
        "child_return_class": child_return_class,
        "child_stdout_hash": child_stdout_hash,
        "child_stderr_hash": child_stderr_hash,
        "original_semantic_result_hash": original_semantic_result_hash,
        "semantic_result_matches_original": (
            None
            if original_semantic_result_hash is None
            else result.semantic_result_hash == original_semantic_result_hash
        ),
        "result": result.to_dict(),
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }
    return {**body, "checkpoint_hash": sha256_json(body)}


def _run_one_study_slot(
    *,
    workspace: Path,
    workspace_record: dict,
    phase_manifest: dict,
    slot_index: int,
    original_result: VbdTrajectorySlotResult | None,
    verify_lock_identity: Callable[[], None],
) -> tuple[VbdTrajectorySlotResult, dict]:
    verify_lock_identity()
    if phase_manifest["phase"] == "recomputation":
        validate_vbd_trajectory_recomputation_source("compiled_slot_regeneration")
        if original_result is None:
            raise VbdTrajectoryValidationWorkspaceError(
                "recomputation requires only the original semantic hash binding"
            )
    elif original_result is not None:
        raise VbdTrajectoryValidationWorkspaceError(
            "original execution cannot receive a prior phase result"
        )
    slot = required_vbd_trajectory_validation_slots()[slot_index]
    stem = _slot_file_stem(slot_index)
    launch_path = _phase_path(workspace, phase_manifest["phase"], "launches", f"{stem}.json")
    checkpoint_path = _phase_path(workspace, phase_manifest["phase"], "slots", f"{stem}.json")
    anchor = _load_attempt_anchor(
        workspace=workspace,
        workspace_record=workspace_record,
        phase=phase_manifest["phase"],
        stem=f"{stem}.json",
    )
    if anchor is not None and not _workspace_path_exists(launch_path):
        write_json_create_once(
            launch_path,
            anchor["launch_receipt"],
            lock_verifier=verify_lock_identity,
        )
    if anchor is not None and read_strict_json(launch_path) != anchor["launch_receipt"]:
        raise VbdTrajectoryValidationWorkspaceError(
            "study launch differs from its external attempt anchor"
        )
    if _workspace_path_exists(checkpoint_path):
        if anchor is None:
            raise VbdTrajectoryValidationWorkspaceError(
                "checkpoint lacks its external attempt anchor"
            )
        return _load_checkpoint(
            checkpoint_path,
            workspace_record=workspace_record,
            phase_manifest=phase_manifest,
            slot=slot,
            slot_index=slot_index,
            original_result=original_result,
        )
    if _workspace_path_exists(launch_path):
        receipt = _validate_launch_receipt(
            read_strict_json(launch_path),
            execution_kind="study",
            phase=phase_manifest["phase"],
            phase_manifest=phase_manifest,
            slot=slot,
            slot_index=slot_index,
            workspace_record=workspace_record,
            canary=None,
        )
        if anchor is None or anchor["launch_receipt"] != receipt:
            raise VbdTrajectoryValidationWorkspaceError(
                "study launch lacks its external attempt anchor"
            )
        result = _runner_error_result(slot, "interrupted_launch")
        checkpoint = _checkpoint(
            phase_manifest=phase_manifest,
            receipt=receipt,
            result=result,
            attestation=None,
            child_process_id=None,
            child_return_class="interrupted_before_checkpoint",
            child_stdout_hash=sha256_json(None),
            child_stderr_hash=sha256_json(None),
            original_semantic_result_hash=(
                None
                if original_result is None
                else original_result.semantic_result_hash
            ),
        )
        write_json_create_once(
            checkpoint_path,
            checkpoint,
            lock_verifier=verify_lock_identity,
        )
        return result, checkpoint
    capability_token = secrets.token_hex(32)
    receipt = _launch_receipt(
        execution_kind="study",
        phase=phase_manifest["phase"],
        phase_hash=phase_manifest["phase_hash"],
        phase_token=phase_manifest["phase_token"],
        slot=slot,
        slot_index=slot_index,
        workspace_record=workspace_record,
        canary=None,
        capability_token_hash=sha256_json(capability_token),
    )
    _create_or_load_attempt_anchor(
        workspace=workspace,
        workspace_record=workspace_record,
        phase=phase_manifest["phase"],
        stem=f"{stem}.json",
        launch_receipt=receipt,
    )
    write_json_create_once(
        launch_path, receipt, lock_verifier=verify_lock_identity
    )
    child_pid: int | None = None
    attestation: dict | None = None
    stdout = b""
    stderr = b""
    return_class = "runner_error"
    try:
        child_pid, return_code, stdout, stderr = _launch_child(
            receipt=receipt,
            capability_token=capability_token,
            workspace=workspace,
            verify_lock_identity=verify_lock_identity,
        )
        if return_code != 0 or stderr:
            result = _runner_error_result(slot, "child_process_failure")
            return_class = "child_nonzero_or_stderr"
        else:
            decoded = _decode_canonical_child_stdout(stdout)
            result, attestation = _validate_child_output(
                decoded, receipt=receipt, observed_child_pid=child_pid
            )
            return_class = "success"
    except Exception:
        result = _runner_error_result(slot, "child_output_invalid")
        return_class = "invalid_child_output"
    checkpoint = _checkpoint(
        phase_manifest=phase_manifest,
        receipt=receipt,
        result=result,
        attestation=attestation,
        child_process_id=child_pid,
        child_return_class=return_class,
        child_stdout_hash=hashlib.sha256(stdout).hexdigest(),
        child_stderr_hash=hashlib.sha256(stderr).hexdigest(),
        original_semantic_result_hash=(
            None if original_result is None else original_result.semantic_result_hash
        ),
    )
    write_json_create_once(
        checkpoint_path,
        checkpoint,
        lock_verifier=verify_lock_identity,
    )
    return result, checkpoint


def _load_checkpoint(
    path: Path,
    *,
    workspace_record: dict,
    phase_manifest: dict,
    slot: VbdTrajectoryValidationSlot,
    slot_index: int,
    original_result: VbdTrajectorySlotResult | None,
) -> tuple[VbdTrajectorySlotResult, dict]:
    value = read_strict_json(path)
    expected = {
        "schema_version",
        "phase",
        "phase_hash",
        "phase_token",
        "slot_index",
        "slot_id",
        "slot_hash",
        "launch_receipt_hash",
        "execution_attestation",
        "child_process_id",
        "child_return_class",
        "child_stdout_hash",
        "child_stderr_hash",
        "original_semantic_result_hash",
        "semantic_result_matches_original",
        "result",
        "internal_only",
        "synthetic_only",
        "customer_output_authorized",
        "checkpoint_hash",
    }
    if type(value) is not dict or set(value) != expected:
        raise VbdTrajectoryValidationWorkspaceError("checkpoint shape is invalid")
    body = {key: item for key, item in value.items() if key != "checkpoint_hash"}
    try:
        result = vbd_trajectory_slot_result_from_dict(value["result"])
    except Exception as exc:
        raise VbdTrajectoryValidationWorkspaceError(
            "checkpoint result is invalid"
        ) from exc
    original_hash = None if original_result is None else original_result.semantic_result_hash
    expected_match = (
        None if original_hash is None else result.semantic_result_hash == original_hash
    )
    if (
        value["schema_version"] != VBD_TRAJECTORY_CHECKPOINT_SCHEMA_VERSION
        or value["phase"] != phase_manifest["phase"]
        or value["phase_hash"] != phase_manifest["phase_hash"]
        or value["phase_token"] != phase_manifest["phase_token"]
        or value["slot_index"] != slot_index
        or value["slot_id"] != slot.slot_id
        or value["slot_hash"] != slot.slot_hash
        or result.slot != slot
        or value["original_semantic_result_hash"] != original_hash
        or value["semantic_result_matches_original"] is not expected_match
        or value["internal_only"] is not True
        or value["synthetic_only"] is not True
        or value["customer_output_authorized"] is not False
        or value["checkpoint_hash"] != sha256_json(body)
    ):
        raise VbdTrajectoryValidationWorkspaceError("checkpoint binding is invalid")
    for key in ("launch_receipt_hash", "child_stdout_hash", "child_stderr_hash"):
        _strict_sha256(value[key], key)
    launch_path = _phase_path(
        path.parents[2],
        phase_manifest["phase"],
        "launches",
        f"{_slot_file_stem(slot_index)}.json",
    )
    receipt = _validate_launch_receipt(
        read_strict_json(launch_path),
        execution_kind="study",
        phase=phase_manifest["phase"],
        phase_manifest=phase_manifest,
        slot=slot,
        slot_index=slot_index,
        workspace_record=workspace_record,
        canary=None,
    )
    anchor = _load_attempt_anchor(
        workspace=path.parents[2],
        workspace_record=workspace_record,
        phase=phase_manifest["phase"],
        stem=f"{_slot_file_stem(slot_index)}.json",
    )
    if anchor is None or anchor["launch_receipt"] != receipt:
        raise VbdTrajectoryValidationWorkspaceError(
            "checkpoint launch lacks its external attempt anchor"
        )
    if value["launch_receipt_hash"] != receipt["launch_receipt_hash"]:
        raise VbdTrajectoryValidationWorkspaceError(
            "checkpoint launch binding is invalid"
        )
    attestation = value["execution_attestation"]
    allowed_return_classes = {
        "success",
        "child_nonzero_or_stderr",
        "invalid_child_output",
        "interrupted_before_checkpoint",
    }
    if value["child_return_class"] not in allowed_return_classes:
        raise VbdTrajectoryValidationWorkspaceError(
            "checkpoint child return class is invalid"
        )
    if value["child_return_class"] == "success":
        if type(attestation) is not dict or type(value["child_process_id"]) is not int:
            raise VbdTrajectoryValidationWorkspaceError(
                "successful checkpoint lacks a child attestation"
            )
        child_body = {
            "schema_version": VBD_TRAJECTORY_CHILD_OUTPUT_SCHEMA_VERSION,
            "slot_result": result.to_dict(),
            "execution_attestation": attestation,
        }
        child_output = {
            **child_body,
            "child_output_hash": sha256_json(child_body),
        }
        _validate_child_output(
            child_output,
            receipt=receipt,
            observed_child_pid=value["child_process_id"],
            require_current_parent=False,
        )
        if (
            value["child_stdout_hash"]
            != hashlib.sha256(_canonical_json_bytes(child_output)).hexdigest()
            or value["child_stderr_hash"] != hashlib.sha256(b"").hexdigest()
            or result.unplanned_runner_error
        ):
            raise VbdTrajectoryValidationWorkspaceError(
                "successful checkpoint bytes or result posture are invalid"
            )
    elif (
        attestation is not None
        or result.row_state != "RUNNER_ERROR"
        or result.unplanned_runner_error is not True
        or result.fit_attempted is not False
        or result.lane_results
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "failed checkpoint is not a sanitized runner-error row"
        )
    return result, value


def _chunk_record(
    *,
    chunk: VbdTrajectoryValidationChunk,
    phase_manifest: dict,
    checkpoints: tuple[dict, ...],
) -> dict:
    body = {
        "schema_version": VBD_TRAJECTORY_CHUNK_RESULT_SCHEMA_VERSION,
        "phase": phase_manifest["phase"],
        "phase_hash": phase_manifest["phase_hash"],
        "chunk_index": chunk.chunk_index,
        "chunk_hash": chunk.chunk_hash,
        "slot_ids": list(chunk.slot_ids),
        "checkpoint_hashes": [value["checkpoint_hash"] for value in checkpoints],
        "semantic_result_hashes": [
            value["result"]["semantic_result_hash"] for value in checkpoints
        ],
        "runner_error_count": sum(
            value["result"]["unplanned_runner_error"] for value in checkpoints
        ),
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }
    return {**body, "chunk_result_hash": sha256_json(body)}


def _completed_chunk_indexes(workspace: Path, phase: str) -> tuple[int, ...]:
    directory = _phase_path(workspace, phase, "chunks")
    if not _workspace_path_is_dir(directory):
        return ()
    indexes = []
    for name, kind in _workspace_directory_entries(directory):
        path = directory / name
        if _is_atomic_temp(path):
            continue
        match = re.fullmatch(r"chunk_(\d{2})\.json", path.name)
        opened = _workspace_entry_stat(path)
        if match is None or kind != "file" or opened is None or opened.st_nlink != 1:
            raise VbdTrajectoryValidationWorkspaceError(
                "chunk directory contains an unexpected file"
            )
        index = int(match.group(1))
        if index >= VBD_TRAJECTORY_VALIDATION_CHUNK_COUNT:
            raise VbdTrajectoryValidationWorkspaceError("chunk index is off plan")
        indexes.append(index)
    ordered = tuple(sorted(indexes))
    if ordered != tuple(range(len(ordered))):
        raise VbdTrajectoryValidationWorkspaceError(
            "chunks must complete in canonical order"
        )
    return ordered


def _require_canaries_complete(
    workspace: Path,
    workspace_record: dict,
    *,
    verify_lock_identity: Callable[[], None] | None = None,
) -> tuple[dict, ...]:
    phase_manifest = _canary_phase_manifest(
        workspace,
        workspace_record,
        verify_lock_identity=verify_lock_identity,
    )
    previous_hash = _canary_chain_root(workspace_record)
    receipts = []
    for index, canary in enumerate(required_vbd_trajectory_canaries()):
        launch = _load_canary_launch(
            workspace=workspace,
            workspace_record=workspace_record,
            phase_manifest=phase_manifest,
            canary=canary,
        )
        path = _safe_workspace_path(
            workspace, "canaries", "receipts", f"canary_{index:02d}.json"
        )
        child_output = read_strict_json(
            _safe_workspace_path(
                workspace, "canaries", "outputs", f"canary_{index:02d}.json"
            )
        )
        value = _validate_canary_receipt(
            read_strict_json(path),
            canary=canary,
            workspace_record=workspace_record,
            previous_receipt_hash=previous_hash,
            phase_manifest=phase_manifest,
            launch=launch,
            child_output=child_output,
        )
        if value["state"] != "PASS":
            raise VbdTrajectoryValidationWorkspaceError(
                "full study cannot start after a failed canary"
            )
        previous_hash = value["receipt_hash"]
        receipts.append(value)
    return tuple(receipts)


def _canary_slot_index(canary: VbdTrajectoryCanaryDescriptor) -> int:
    return next(
        index
        for index, slot in enumerate(required_vbd_trajectory_validation_slots())
        if slot.slot_id == canary.slot.slot_id
    )


def _load_canary_launch(
    *,
    workspace: Path,
    workspace_record: dict,
    phase_manifest: dict,
    canary: VbdTrajectoryCanaryDescriptor,
) -> dict:
    path = _safe_workspace_path(
        workspace,
        "canaries",
        "launches",
        f"canary_{canary.canary_ordinal:02d}.json",
    )
    launch = _validate_launch_receipt(
        read_strict_json(path),
        execution_kind="canary",
        phase="canary",
        phase_manifest=phase_manifest,
        slot=canary.slot,
        slot_index=_canary_slot_index(canary),
        workspace_record=workspace_record,
        canary=canary,
    )
    anchor = _load_attempt_anchor(
        workspace=workspace,
        workspace_record=workspace_record,
        phase="canaries",
        stem=f"canary_{canary.canary_ordinal:02d}.json",
    )
    if anchor is None or anchor["launch_receipt"] != launch:
        raise VbdTrajectoryValidationWorkspaceError(
            "canary launch lacks its external attempt anchor"
        )
    return launch


def run_vbd_trajectory_validation_chunk(
    *, phase: str, chunk_index: int, workspace_dir: str | Path
) -> dict:
    if phase not in VBD_TRAJECTORY_VALIDATION_PHASES:
        raise ValueError("phase must be original or recomputation")
    if type(chunk_index) is not int or not 0 <= chunk_index < 40:
        raise ValueError("chunk_index must be in 0..39")
    workspace = _workspace_from_user_path(workspace_dir)
    if not workspace.is_dir():
        raise VbdTrajectoryValidationWorkspaceError("workspace does not exist")
    lock_path = _safe_workspace_path(workspace, ".runner.lock")
    with _exclusive_lock(lock_path) as verify_lock_identity:
        verify_lock_identity()
        _cleanup_stale_atomic_temps(workspace)
        verify_lock_identity()
        workspace, workspace_record = _load_workspace(workspace)
        _restore_validation_attempt_launches(
            workspace=workspace,
            workspace_record=workspace_record,
            verify_lock_identity=verify_lock_identity,
        )
        _validate_workspace_tree(workspace, complete=False)
        _require_canaries_complete(
            workspace,
            workspace_record,
            verify_lock_identity=verify_lock_identity,
        )
        original_results: tuple[VbdTrajectorySlotResult, ...] | None = None
        original_study_hash: str | None = None
        if phase == "recomputation":
            original_results, original_study = _load_complete_phase(
                workspace=workspace,
                workspace_record=workspace_record,
                phase="original",
                original_results=None,
                original_study_hash=None,
            )
            original_study_hash = original_study["study_hash"]
        phase_manifest = _create_or_load_phase_manifest(
            workspace=workspace,
            phase=phase,
            workspace_record=workspace_record,
            original_study_hash=original_study_hash,
            verify_lock_identity=verify_lock_identity,
        )
        completed = _completed_chunk_indexes(workspace, phase)
        if chunk_index not in completed and chunk_index != len(completed):
            raise VbdTrajectoryValidationWorkspaceError(
                "chunk must run in canonical serial order"
            )
        chunk = required_vbd_trajectory_validation_chunks()[chunk_index]
        start = chunk.global_start_index_inclusive
        pairs = []
        for offset in range(len(chunk.slot_ids)):
            slot_index = start + offset
            original_result = (
                None if original_results is None else original_results[slot_index]
            )
            pairs.append(
                _run_one_study_slot(
                    workspace=workspace,
                    workspace_record=workspace_record,
                    phase_manifest=phase_manifest,
                    slot_index=slot_index,
                    original_result=original_result,
                    verify_lock_identity=verify_lock_identity,
                )
            )
        checkpoints = tuple(checkpoint for _, checkpoint in pairs)
        record = _chunk_record(
            chunk=chunk, phase_manifest=phase_manifest, checkpoints=checkpoints
        )
        chunk_path = _phase_path(
            workspace, phase, "chunks", f"chunk_{chunk_index:02d}.json"
        )
        write_json_create_once(
            chunk_path, record, lock_verifier=verify_lock_identity
        )
        verify_lock_identity()
        _validate_workspace_tree(workspace, complete=False)
        return record


def run_vbd_trajectory_validation_phase(
    *, phase: str, workspace_dir: str | Path
) -> tuple[dict, ...]:
    return tuple(
        run_vbd_trajectory_validation_chunk(
            phase=phase, chunk_index=index, workspace_dir=workspace_dir
        )
        for index in range(VBD_TRAJECTORY_VALIDATION_CHUNK_COUNT)
    )


def _load_complete_phase(
    *,
    workspace: Path,
    workspace_record: dict,
    phase: str,
    original_results: tuple[VbdTrajectorySlotResult, ...] | None,
    original_study_hash: str | None,
) -> tuple[tuple[VbdTrajectorySlotResult, ...], dict]:
    phase_manifest = _validate_phase_manifest(
        read_strict_json(_phase_path(workspace, phase, "phase.json")),
        phase=phase,
        workspace_record=workspace_record,
        original_study_hash=original_study_hash,
    )
    if _completed_chunk_indexes(workspace, phase) != tuple(range(40)):
        raise VbdTrajectoryValidationWorkspaceError(
            f"{phase} phase is incomplete"
        )
    results = []
    checkpoint_records = []
    for slot_index, slot in enumerate(required_vbd_trajectory_validation_slots()):
        original_result = (
            None if original_results is None else original_results[slot_index]
        )
        result, checkpoint = _load_checkpoint(
            _phase_path(
                workspace,
                phase,
                "slots",
                f"{_slot_file_stem(slot_index)}.json",
            ),
            workspace_record=workspace_record,
            phase_manifest=phase_manifest,
            slot=slot,
            slot_index=slot_index,
            original_result=original_result,
        )
        results.append(result)
        checkpoint_records.append(checkpoint)
    for chunk_index, chunk in enumerate(required_vbd_trajectory_validation_chunks()):
        start = chunk.global_start_index_inclusive
        expected = _chunk_record(
            chunk=chunk,
            phase_manifest=phase_manifest,
            checkpoints=tuple(checkpoint_records[start : start + 50]),
        )
        observed = read_strict_json(
            _phase_path(workspace, phase, "chunks", f"chunk_{chunk_index:02d}.json")
        )
        if observed != expected:
            raise VbdTrajectoryValidationWorkspaceError(
                "chunk checkpoint does not match its exact slot records"
            )
    result_tuple = tuple(results)
    study = summarize_vbd_trajectory_validation_results(result_tuple)
    return result_tuple, study


def _canary_phase_manifest(
    workspace: Path,
    workspace_record: dict,
    *,
    verify_lock_identity: Callable[[], None] | None = None,
) -> dict:
    path = _safe_workspace_path(workspace, "canaries", "phase.json")
    if _workspace_path_exists(path):
        value = read_strict_json(path)
    else:
        body = {
            "schema_version": VBD_TRAJECTORY_PHASE_SCHEMA_VERSION,
            "phase": "canary",
            "workspace_hash": workspace_record["workspace_hash"],
            "freeze_commit": workspace_record["freeze_commit"],
            "freeze_manifest_hash": workspace_record["freeze_manifest_hash"],
            "plan_hash": workspace_record["plan_hash"],
            "original_study_hash": None,
            "started_at": _utc_now(),
            "phase_token": secrets.token_hex(32),
            "creator_process_token": secrets.token_hex(32),
            "creator_process_id": os.getpid(),
            "internal_only": True,
            "synthetic_only": True,
            "customer_output_authorized": False,
        }
        value = {**body, "phase_hash": sha256_json(body)}
        write_json_create_once(
            path, value, lock_verifier=verify_lock_identity
        )
    if type(value) is not dict or value.get("phase") != "canary":
        raise VbdTrajectoryValidationWorkspaceError(
            "canary phase manifest is invalid"
        )
    body = {key: item for key, item in value.items() if key != "phase_hash"}
    if (
        set(value)
        != {
            "schema_version",
            "phase",
            "workspace_hash",
            "freeze_commit",
            "freeze_manifest_hash",
            "plan_hash",
            "original_study_hash",
            "started_at",
            "phase_token",
            "creator_process_token",
            "creator_process_id",
            "internal_only",
            "synthetic_only",
            "customer_output_authorized",
            "phase_hash",
        }
        or value["schema_version"] != VBD_TRAJECTORY_PHASE_SCHEMA_VERSION
        or value["workspace_hash"] != workspace_record["workspace_hash"]
        or value["freeze_commit"] != workspace_record["freeze_commit"]
        or value["freeze_manifest_hash"]
        != workspace_record["freeze_manifest_hash"]
        or value["plan_hash"] != workspace_record["plan_hash"]
        or value["original_study_hash"] is not None
        or _strict_timestamp(value["started_at"], "canary started_at")
        != value["started_at"]
        or _strict_token(value["phase_token"], "canary phase token")
        != value["phase_token"]
        or _strict_token(value["creator_process_token"], "canary creator token")
        != value["creator_process_token"]
        or type(value["creator_process_id"]) is not int
        or value["creator_process_id"] <= 0
        or value["internal_only"] is not True
        or value["synthetic_only"] is not True
        or value["customer_output_authorized"] is not False
        or value["phase_hash"] != sha256_json(body)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "canary phase manifest is invalid"
        )
    return value


def _canary_receipt(
    *,
    canary: VbdTrajectoryCanaryDescriptor,
    workspace_record: dict,
    phase_manifest: dict,
    launch: dict,
    result: VbdTrajectorySlotResult,
    child_output: dict | None,
    attestation: dict | None,
    child_process_id: int | None,
    child_return_class: str,
    previous_receipt_hash: str,
) -> dict:
    passed = (
        child_return_class == "success"
        and child_output is not None
        and attestation is not None
        and result.expectation_matched
        and not result.hard_diagnostic_failure
        and not result.unplanned_runner_error
    )
    body = {
        "schema_version": VBD_TRAJECTORY_CANARY_RECEIPT_SCHEMA_VERSION,
        "canary_ordinal": canary.canary_ordinal,
        "canary_id": canary.canary_id,
        "canary_hash": canary.canary_hash,
        "slot_id": canary.slot.slot_id,
        "slot_hash": canary.slot.slot_hash,
        "workspace_hash": workspace_record["workspace_hash"],
        "phase_hash": phase_manifest["phase_hash"],
        "phase_token": phase_manifest["phase_token"],
        "launch_receipt_hash": launch["launch_receipt_hash"],
        "previous_canary_receipt_hash": previous_receipt_hash,
        "execution_attestation_hash": (
            None if attestation is None else attestation["attestation_hash"]
        ),
        "child_output_hash": (
            None if child_output is None else child_output["child_output_hash"]
        ),
        "execution_attestation": attestation,
        "prepared_input_hashes_hash": (
            None
            if attestation is None
            else attestation["prepared_input_hashes_hash"]
        ),
        "execution_process_token_hash": (
            None
            if attestation is None
            else sha256_json(attestation["process_token"])
        ),
        "child_process_id": child_process_id,
        "child_return_class": child_return_class,
        "semantic_result_hash": result.semantic_result_hash,
        "planned_row_state_observed": result.expectation_matched,
        "hard_diagnostic_failure": result.hard_diagnostic_failure,
        "runner_failure": result.unplanned_runner_error,
        "state": "PASS" if passed else "STOP",
        "aggregate_gate_computed": False,
        "outside_study_denominators": True,
        "substitutes_for_study_slot": False,
        "receipt_result_values_emitted": False,
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }
    return {**body, "receipt_hash": sha256_json(body)}


def _validate_canary_receipt(
    value: object,
    *,
    canary: VbdTrajectoryCanaryDescriptor,
    workspace_record: dict,
    previous_receipt_hash: str,
    phase_manifest: dict,
    launch: dict,
    child_output: object | None,
) -> dict:
    if type(value) is not dict or "receipt_hash" not in value:
        raise VbdTrajectoryValidationWorkspaceError("canary receipt shape is invalid")
    body = {key: item for key, item in value.items() if key != "receipt_hash"}
    expected_keys = {
        "schema_version",
        "canary_ordinal",
        "canary_id",
        "canary_hash",
        "slot_id",
        "slot_hash",
        "workspace_hash",
        "phase_hash",
        "phase_token",
        "launch_receipt_hash",
        "previous_canary_receipt_hash",
        "execution_attestation_hash",
        "child_output_hash",
        "execution_attestation",
        "prepared_input_hashes_hash",
        "execution_process_token_hash",
        "child_process_id",
        "child_return_class",
        "semantic_result_hash",
        "planned_row_state_observed",
        "hard_diagnostic_failure",
        "runner_failure",
        "state",
        "aggregate_gate_computed",
        "outside_study_denominators",
        "substitutes_for_study_slot",
        "receipt_result_values_emitted",
        "internal_only",
        "synthetic_only",
        "customer_output_authorized",
    }
    if (
        set(body) != expected_keys
        or value["schema_version"]
        != VBD_TRAJECTORY_CANARY_RECEIPT_SCHEMA_VERSION
        or value["canary_ordinal"] != canary.canary_ordinal
        or value["canary_id"] != canary.canary_id
        or value["canary_hash"] != canary.canary_hash
        or value["slot_id"] != canary.slot.slot_id
        or value["slot_hash"] != canary.slot.slot_hash
        or value["workspace_hash"] != workspace_record["workspace_hash"]
        or value["previous_canary_receipt_hash"] != previous_receipt_hash
        or value["phase_hash"] != phase_manifest["phase_hash"]
        or value["phase_token"] != phase_manifest["phase_token"]
        or value["launch_receipt_hash"] != launch["launch_receipt_hash"]
        or value["state"] not in {"PASS", "STOP"}
        or value["child_return_class"]
        not in {
            "success",
            "child_nonzero_or_stderr",
            "invalid_child_output",
            "interrupted_before_receipt",
        }
        or (
            value["child_process_id"] is not None
            and (type(value["child_process_id"]) is not int or value["child_process_id"] <= 0)
        )
        or value["aggregate_gate_computed"] is not False
        or value["outside_study_denominators"] is not True
        or value["substitutes_for_study_slot"] is not False
        or value["receipt_result_values_emitted"] is not False
        or value["internal_only"] is not True
        or value["synthetic_only"] is not True
        or value["customer_output_authorized"] is not False
        or value["receipt_hash"] != sha256_json(body)
    ):
        raise VbdTrajectoryValidationWorkspaceError("canary receipt is invalid")
    expected_pass = (
        value["child_return_class"] == "success"
        and value["execution_attestation_hash"] is not None
        and value["child_output_hash"] is not None
        and value["execution_attestation"] is not None
        and value["prepared_input_hashes_hash"] is not None
        and value["execution_process_token_hash"] is not None
        and type(value["child_process_id"]) is int
        and value["planned_row_state_observed"] is True
        and value["hard_diagnostic_failure"] is False
        and value["runner_failure"] is False
    )
    if value["state"] != ("PASS" if expected_pass else "STOP"):
        raise VbdTrajectoryValidationWorkspaceError(
            "canary receipt state is not derived"
        )
    for key in (
        "phase_hash",
        "launch_receipt_hash",
        "previous_canary_receipt_hash",
        "semantic_result_hash",
    ):
        _strict_sha256(value[key], key)
    _strict_token(value["phase_token"], "canary phase token")
    if value["execution_attestation_hash"] is not None:
        _strict_sha256(
            value["execution_attestation_hash"], "canary attestation hash"
        )
    if value["child_output_hash"] is not None:
        _strict_sha256(value["child_output_hash"], "canary child-output hash")
    if value["execution_process_token_hash"] is not None:
        _strict_sha256(
            value["execution_process_token_hash"], "canary process-token hash"
        )
    attestation = value["execution_attestation"]
    if expected_pass:
        if child_output is None:
            raise VbdTrajectoryValidationWorkspaceError(
                "passing canary lacks its immutable child output"
            )
        result, validated_attestation = _validate_child_output(
            child_output,
            receipt=launch,
            observed_child_pid=value["child_process_id"],
            require_current_parent=False,
        )
        if (
            type(child_output) is not dict
            or child_output.get("child_output_hash") != value["child_output_hash"]
            or validated_attestation != attestation
            or attestation["attestation_hash"]
            != value["execution_attestation_hash"]
            or attestation["prepared_input_hashes_hash"]
            != value["prepared_input_hashes_hash"]
            or sha256_json(attestation["process_token"])
            != value["execution_process_token_hash"]
            or result.semantic_result_hash != value["semantic_result_hash"]
            or result.expectation_matched
            is not value["planned_row_state_observed"]
            or result.hard_diagnostic_failure
            is not value["hard_diagnostic_failure"]
            or result.unplanned_runner_error is not value["runner_failure"]
        ):
            raise VbdTrajectoryValidationWorkspaceError(
                "canary child result or attestation is invalid"
            )
    elif any(
        item is not None
        for item in (
            child_output,
            attestation,
            value["execution_attestation_hash"],
            value["child_output_hash"],
            value["execution_process_token_hash"],
            value["prepared_input_hashes_hash"],
        )
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "stopped canary cannot retain a successful attestation"
        )
    return value


def _canary_chain_root(workspace_record: dict) -> str:
    return sha256_json(
        {
            "chain": "vbd_trajectory_canary_chain_v1",
            "workspace_hash": workspace_record["workspace_hash"],
            "freeze_commit": workspace_record["freeze_commit"],
            "plan_hash": workspace_record["plan_hash"],
        }
    )


def run_vbd_trajectory_validation_canary(
    *, canary_index: int, workspace_dir: str | Path
) -> dict:
    if type(canary_index) is not int or not 0 <= canary_index < 4:
        raise ValueError("canary_index must be in 0..3")
    workspace = _workspace_from_user_path(workspace_dir)
    if not workspace.is_dir():
        raise VbdTrajectoryValidationWorkspaceError("workspace does not exist")
    lock = _safe_workspace_path(workspace, ".runner.lock")
    with _exclusive_lock(lock) as verify_lock_identity:
        verify_lock_identity()
        _cleanup_stale_atomic_temps(workspace)
        verify_lock_identity()
        workspace, workspace_record = _load_workspace(workspace)
        _restore_validation_attempt_launches(
            workspace=workspace,
            workspace_record=workspace_record,
            verify_lock_identity=verify_lock_identity,
        )
        _validate_workspace_tree(workspace, complete=False)
        phase_manifest = _canary_phase_manifest(
            workspace,
            workspace_record,
            verify_lock_identity=verify_lock_identity,
        )
        canaries = required_vbd_trajectory_canaries()
        previous_receipt_hash = _canary_chain_root(workspace_record)
        for prior_index in range(canary_index):
            prior_launch = _load_canary_launch(
                workspace=workspace,
                workspace_record=workspace_record,
                phase_manifest=phase_manifest,
                canary=canaries[prior_index],
            )
            prior = _validate_canary_receipt(
                read_strict_json(
                    _safe_workspace_path(
                        workspace,
                        "canaries",
                        "receipts",
                        f"canary_{prior_index:02d}.json",
                    )
                ),
                canary=canaries[prior_index],
                workspace_record=workspace_record,
                previous_receipt_hash=previous_receipt_hash,
                phase_manifest=phase_manifest,
                launch=prior_launch,
                child_output=read_strict_json(
                    _safe_workspace_path(
                        workspace,
                        "canaries",
                        "outputs",
                        f"canary_{prior_index:02d}.json",
                    )
                ),
            )
            if prior["state"] != "PASS":
                raise VbdTrajectoryValidationWorkspaceError(
                    "canary sequence stopped after an unexpected failure"
                )
            previous_receipt_hash = prior["receipt_hash"]
        current_receipt_path = _safe_workspace_path(
            workspace,
            "canaries",
            "receipts",
            f"canary_{canary_index:02d}.json",
        )
        if _workspace_path_exists(current_receipt_path):
            current_launch = _load_canary_launch(
                workspace=workspace,
                workspace_record=workspace_record,
                phase_manifest=phase_manifest,
                canary=canaries[canary_index],
            )
            current_anchor = _load_attempt_anchor(
                workspace=workspace,
                workspace_record=workspace_record,
                phase="canaries",
                stem=f"canary_{canary_index:02d}.json",
            )
            if (
                current_anchor is None
                or current_anchor["launch_receipt"] != current_launch
            ):
                raise VbdTrajectoryValidationWorkspaceError(
                    "canary receipt lacks its external attempt anchor"
                )
            current_output_path = _safe_workspace_path(
                workspace,
                "canaries",
                "outputs",
                f"canary_{canary_index:02d}.json",
            )
            return _validate_canary_receipt(
                read_strict_json(current_receipt_path),
                canary=canaries[canary_index],
                workspace_record=workspace_record,
                previous_receipt_hash=previous_receipt_hash,
                phase_manifest=phase_manifest,
                launch=current_launch,
                child_output=(
                    read_strict_json(current_output_path)
                    if _workspace_path_exists(current_output_path)
                    else None
                ),
            )
        if any(
            _workspace_path_exists(
                _safe_workspace_path(
                    workspace,
                    "canaries",
                    "receipts",
                    f"canary_{later:02d}.json",
                )
            )
            for later in range(canary_index + 1, 4)
        ):
            raise VbdTrajectoryValidationWorkspaceError(
                "canary receipts are out of order"
            )
        canary = canaries[canary_index]
        slot_index = _canary_slot_index(canary)
        launch_path = _safe_workspace_path(
            workspace, "canaries", "launches", f"canary_{canary_index:02d}.json"
        )
        output_path = _safe_workspace_path(
            workspace, "canaries", "outputs", f"canary_{canary_index:02d}.json"
        )
        anchor = _load_attempt_anchor(
            workspace=workspace,
            workspace_record=workspace_record,
            phase="canaries",
            stem=f"canary_{canary_index:02d}.json",
        )
        if anchor is not None and not _workspace_path_exists(launch_path):
            write_json_create_once(
                launch_path,
                anchor["launch_receipt"],
                lock_verifier=verify_lock_identity,
            )
        child_output = None
        if _workspace_path_exists(launch_path):
            launch = _validate_launch_receipt(
                read_strict_json(launch_path),
                execution_kind="canary",
                phase="canary",
                phase_manifest=phase_manifest,
                slot=canary.slot,
                slot_index=slot_index,
                workspace_record=workspace_record,
                canary=canary,
            )
            if anchor is None or anchor["launch_receipt"] != launch:
                raise VbdTrajectoryValidationWorkspaceError(
                    "canary launch lacks its external attempt anchor"
                )
            if _workspace_path_exists(output_path):
                child_output = read_strict_json(output_path)
                raw_attestation = (
                    child_output.get("execution_attestation")
                    if type(child_output) is dict
                    else None
                )
                if (
                    type(raw_attestation) is not dict
                    or type(raw_attestation.get("process_id")) is not int
                ):
                    raise VbdTrajectoryValidationWorkspaceError(
                        "stored canary output lacks a child process identity"
                    )
                child_pid = raw_attestation["process_id"]
                result, attestation = _validate_child_output(
                    child_output,
                    receipt=launch,
                    observed_child_pid=child_pid,
                    require_current_parent=False,
                )
                return_class = "success"
            else:
                result = _runner_error_result(
                    canary.slot, "interrupted_canary_launch"
                )
                attestation = None
                child_pid = None
                return_class = "interrupted_before_receipt"
        else:
            if _workspace_path_exists(output_path):
                raise VbdTrajectoryValidationWorkspaceError(
                    "canary output exists without its create-once launch"
                )
            capability_token = secrets.token_hex(32)
            launch = _launch_receipt(
                execution_kind="canary",
                phase="canary",
                phase_hash=phase_manifest["phase_hash"],
                phase_token=phase_manifest["phase_token"],
                slot=canary.slot,
                slot_index=slot_index,
                workspace_record=workspace_record,
                canary=canary,
                capability_token_hash=sha256_json(capability_token),
            )
            _create_or_load_attempt_anchor(
                workspace=workspace,
                workspace_record=workspace_record,
                phase="canaries",
                stem=f"canary_{canary_index:02d}.json",
                launch_receipt=launch,
            )
            write_json_create_once(
                launch_path,
                launch,
                lock_verifier=verify_lock_identity,
            )
            verify_lock_identity()
            _validate_workspace_tree(workspace, complete=False)
            stdout = b""
            stderr = b""
            attestation = None
            child_pid = None
            try:
                child_pid, return_code, stdout, stderr = _launch_child(
                    receipt=launch,
                    capability_token=capability_token,
                    workspace=workspace,
                    verify_lock_identity=verify_lock_identity,
                )
                if return_code != 0 or stderr:
                    result = _runner_error_result(canary.slot, "canary_child_failure")
                    return_class = "child_nonzero_or_stderr"
                else:
                    child_output = _decode_canonical_child_stdout(stdout)
                    result, attestation = _validate_child_output(
                        child_output,
                        receipt=launch,
                        observed_child_pid=child_pid,
                    )
                    return_class = "success"
            except Exception:
                child_output = None
                result = _runner_error_result(canary.slot, "canary_output_invalid")
                return_class = "invalid_child_output"
            if return_class == "success":
                write_json_create_once(
                    output_path,
                    child_output,
                    lock_verifier=verify_lock_identity,
                )
        receipt = _canary_receipt(
            canary=canary,
            workspace_record=workspace_record,
            phase_manifest=phase_manifest,
            launch=launch,
            result=result,
            child_output=child_output,
            attestation=attestation,
            child_process_id=child_pid,
            child_return_class=return_class,
            previous_receipt_hash=previous_receipt_hash,
        )
        write_json_create_once(
            current_receipt_path,
            receipt,
            lock_verifier=verify_lock_identity,
        )
        verify_lock_identity()
        _validate_workspace_tree(workspace, complete=False)
        return receipt


def _validate_combined_value(value: object, workspace_record: dict) -> dict:
    expected = {
        "schema_version",
        "workspace_hash",
        "freeze_commit",
        "freeze_manifest_hash",
        "plan_hash",
        "concordance_receipt_hash",
        "original_study_hash",
        "recomputation_study_hash",
        "semantic_combined_hash",
        "canary_phase_hash",
        "original_phase_hash",
        "recomputation_phase_hash",
        "original_execution_roots",
        "recomputation_execution_roots",
        "execution_evidence_snapshot_hash",
        "original_process_tokens_hash",
        "recomputation_process_tokens_hash",
        "original_process_count",
        "recomputation_process_count",
        "process_tokens_disjoint",
        "phase_identities_disjoint",
        "canary_chain_root",
        "canary_receipt_hashes_hash",
        "canary_receipt_chain_tip",
        "canary_process_token_hashes_hash",
        "all_process_tokens_pairwise_disjoint",
        "all_execution_tokens_hash",
        "all_execution_tokens_pairwise_disjoint",
        "fresh_semantic_results_match",
        "state",
        "failing_checks",
        "threat_model",
        "internal_only",
        "synthetic_only",
        "aggregate_only",
        "customer_output_authorized",
        "confidence_output_authorized",
        "probability_output_authorized",
        "roi_output_authorized",
        "causality_output_authorized",
        "productivity_output_authorized",
        "independent_acceptance_complete",
        "task_5_6_complete",
        "promotion_complete",
        "combined_hash",
    }
    if type(value) is not dict or set(value) != expected:
        raise VbdTrajectoryValidationWorkspaceError(
            "combined output shape is invalid"
        )
    try:
        validate_vbd_trajectory_combined_governance(
            {key: value[key] for key in _COMBINED_GOVERNANCE_FIELDS}
        )
    except ValueError as exc:
        raise VbdTrajectoryValidationWorkspaceError(
            "combined output governance is invalid"
        ) from exc
    hash_fields = (
        "workspace_hash",
        "freeze_manifest_hash",
        "plan_hash",
        "concordance_receipt_hash",
        "original_study_hash",
        "recomputation_study_hash",
        "semantic_combined_hash",
        "canary_phase_hash",
        "original_phase_hash",
        "recomputation_phase_hash",
        "execution_evidence_snapshot_hash",
        "original_process_tokens_hash",
        "recomputation_process_tokens_hash",
        "canary_chain_root",
        "canary_receipt_hashes_hash",
        "canary_receipt_chain_tip",
        "canary_process_token_hashes_hash",
        "all_execution_tokens_hash",
        "combined_hash",
    )
    for field in hash_fields:
        _strict_sha256(value[field], f"combined {field}")
    if (
        type(value["freeze_commit"]) is not str
        or _COMMIT_RE.fullmatch(value["freeze_commit"]) is None
        or any(
            value[key] != workspace_record[key]
            for key in (
                "workspace_hash",
                "freeze_commit",
                "freeze_manifest_hash",
                "plan_hash",
                "concordance_receipt_hash",
            )
        )
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "combined output source binding is invalid"
        )
    for key, phase, phase_hash in (
        (
            "original_execution_roots",
            "original",
            value["original_phase_hash"],
        ),
        (
            "recomputation_execution_roots",
            "recomputation",
            value["recomputation_phase_hash"],
        ),
    ):
        root = value[key]
        root_expected = {
            "phase",
            "phase_hash",
            "ordered_checkpoint_hashes_hash",
            "ordered_launch_receipt_hashes_hash",
            "ordered_execution_attestation_hashes_hash",
            "ordered_chunk_result_hashes_hash",
            "execution_root_hash",
        }
        if type(root) is not dict or set(root) != root_expected:
            raise VbdTrajectoryValidationWorkspaceError(
                "combined execution root shape is invalid"
            )
        root_body = {
            item: content
            for item, content in root.items()
            if item != "execution_root_hash"
        }
        if root["phase"] != phase or root["phase_hash"] != phase_hash:
            raise VbdTrajectoryValidationWorkspaceError(
                "combined execution root phase binding is invalid"
            )
        for field in root_expected - {"phase"}:
            _strict_sha256(root[field], f"combined execution root {field}")
        if root["execution_root_hash"] != sha256_json(root_body):
            raise VbdTrajectoryValidationWorkspaceError(
                "combined execution root hash is invalid"
            )
    failing_checks = value["failing_checks"]
    if (
        type(failing_checks) is not list
        or len(failing_checks) != len(set(failing_checks))
        or any(
            type(item) is not str
            or re.fullmatch(r"[a-z][a-z0-9_]{0,95}", item) is None
            for item in failing_checks
        )
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "combined failing checks are invalid"
        )
    pass_predicates = (
        "process_tokens_disjoint",
        "phase_identities_disjoint",
        "all_process_tokens_pairwise_disjoint",
        "all_execution_tokens_pairwise_disjoint",
        "fresh_semantic_results_match",
    )
    if (
        type(value["original_process_count"]) is not int
        or not 0 <= value["original_process_count"] <= 2_000
        or type(value["recomputation_process_count"]) is not int
        or not 0 <= value["recomputation_process_count"] <= 2_000
        or any(type(value[key]) is not bool for key in pass_predicates)
        or value["state"] != ("HOLD" if failing_checks else "PASS")
        or (
            value["state"] == "PASS"
            and (
                value["original_process_count"] != 2_000
                or value["recomputation_process_count"] != 2_000
                or not all(value[key] for key in pass_predicates)
            )
        )
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "combined state is not derived from its evidence predicates"
        )
    body = {key: item for key, item in value.items() if key != "combined_hash"}
    if (
        value.get("schema_version") != VBD_TRAJECTORY_COMBINED_SCHEMA_VERSION
        or value.get("workspace_hash") != workspace_record["workspace_hash"]
        or value.get("state") not in {"PASS", "HOLD"}
        or _strict_sha256(
            value.get("execution_evidence_snapshot_hash"),
            "combined execution evidence snapshot hash",
        )
        != value["execution_evidence_snapshot_hash"]
        or value.get("internal_only") is not True
        or value.get("synthetic_only") is not True
        or value.get("aggregate_only") is not True
        or value.get("customer_output_authorized") is not False
        or value["combined_hash"] != sha256_json(body)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "combined output is invalid"
        )
    return value


def _combined_commit_record(
    *, workspace_record: dict, combined: dict
) -> dict:
    body = {
        "schema_version": VBD_TRAJECTORY_COMBINED_COMMIT_SCHEMA_VERSION,
        "workspace_hash": workspace_record["workspace_hash"],
        "combined_hash": combined["combined_hash"],
        "execution_evidence_snapshot_hash": combined[
            "execution_evidence_snapshot_hash"
        ],
        "combined_state": combined["state"],
        "committed_at": _utc_now(),
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }
    return {**body, "commit_hash": sha256_json(body)}


def _validate_combined_commit(
    value: object, *, workspace_record: dict, combined: dict
) -> dict:
    expected = {
        "schema_version",
        "workspace_hash",
        "combined_hash",
        "execution_evidence_snapshot_hash",
        "combined_state",
        "committed_at",
        "internal_only",
        "synthetic_only",
        "customer_output_authorized",
        "commit_hash",
    }
    if type(value) is not dict or set(value) != expected:
        raise VbdTrajectoryValidationWorkspaceError(
            "combined commit marker shape is invalid"
        )
    body = {key: item for key, item in value.items() if key != "commit_hash"}
    if (
        value["schema_version"]
        != VBD_TRAJECTORY_COMBINED_COMMIT_SCHEMA_VERSION
        or value["workspace_hash"] != workspace_record["workspace_hash"]
        or value["combined_hash"] != combined["combined_hash"]
        or value["execution_evidence_snapshot_hash"]
        != combined["execution_evidence_snapshot_hash"]
        or value["combined_state"] != combined["state"]
        or _strict_timestamp(value["committed_at"], "combined committed_at")
        != value["committed_at"]
        or value["internal_only"] is not True
        or value["synthetic_only"] is not True
        or value["customer_output_authorized"] is not False
        or value["commit_hash"] != sha256_json(body)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "combined commit marker is invalid"
        )
    return value


def _execution_evidence_snapshot(workspace: Path) -> dict:
    entries = []
    for kind, relative in sorted(_workspace_tree_entries(workspace)):
        path = workspace / relative
        if (
            kind == "dir"
            or path == workspace / ".runner.lock"
            or path == workspace / "combined.json"
            or path == workspace / "combined_commit.json"
        ):
            continue
        if kind != "file" or path.suffix != ".json":
            raise VbdTrajectoryValidationWorkspaceError(
                "execution evidence contains a non-JSON file"
            )
        value = read_strict_json(path)
        entries.append(
            {
                "path": relative,
                "sha256": hashlib.sha256(
                    _canonical_json_bytes(value)
                ).hexdigest(),
            }
        )
    expected_count = (
        len(_ROOT_STATIC_FILES)
        + 1
        + (3 * len(required_vbd_trajectory_canaries()))
        + len(VBD_TRAJECTORY_VALIDATION_PHASES)
        * (
            len(_PHASE_STATIC_FILES)
            + (2 * VBD_TRAJECTORY_VALIDATION_REQUIRED_SLOT_COUNT)
            + VBD_TRAJECTORY_VALIDATION_CHUNK_COUNT
        )
    )
    if len(entries) != expected_count:
        raise VbdTrajectoryValidationWorkspaceError(
            "execution evidence snapshot is incomplete"
        )
    body = {
        "schema_version": "FT_AI_VALUE_VBD_TRAJECTORY_EVIDENCE_SNAPSHOT_2026_07_V1",
        "file_count": len(entries),
        "ordered_file_hashes_hash": sha256_json(entries),
    }
    return {**body, "snapshot_hash": sha256_json(body)}


def combine_vbd_trajectory_validation_workspace(
    workspace_dir: str | Path,
) -> dict:
    workspace = _workspace_from_user_path(workspace_dir)
    if not workspace.is_dir():
        raise VbdTrajectoryValidationWorkspaceError("workspace does not exist")
    with _exclusive_lock(
        _safe_workspace_path(workspace, ".runner.lock")
    ) as verify_lock_identity:
        verify_lock_identity()
        _cleanup_stale_atomic_temps(workspace)
        verify_lock_identity()
        workspace, workspace_record = _load_workspace(workspace)
        _restore_validation_attempt_launches(
            workspace=workspace,
            workspace_record=workspace_record,
            verify_lock_identity=verify_lock_identity,
        )
        output = _safe_workspace_path(workspace, "combined.json")
        commit_path = _safe_workspace_path(
            workspace, "combined_commit.json"
        )
        if _workspace_path_exists(commit_path):
            _validate_workspace_tree(workspace, complete=True)
        else:
            _validate_workspace_ready_for_combined(workspace)
        initial_evidence_snapshot = _execution_evidence_snapshot(workspace)
        canary_receipts = _require_canaries_complete(
            workspace,
            workspace_record,
            verify_lock_identity=verify_lock_identity,
        )
        original_results, original_study = _load_complete_phase(
            workspace=workspace,
            workspace_record=workspace_record,
            phase="original",
            original_results=None,
            original_study_hash=None,
        )
        recompute_results, recompute_study = _load_complete_phase(
            workspace=workspace,
            workspace_record=workspace_record,
            phase="recomputation",
            original_results=original_results,
            original_study_hash=original_study["study_hash"],
        )
        semantic = combine_vbd_trajectory_validation_phases(
            original_results=original_results,
            recomputation_results=recompute_results,
        )
        (
            original_tokens,
            recompute_tokens,
            original_execution_roots,
            recompute_execution_roots,
        ) = _phase_process_tokens(
            workspace=workspace,
            original_results=original_results,
            recompute_results=recompute_results,
            workspace_record=workspace_record,
            original_study_hash=original_study["study_hash"],
        )
        failing_checks = list(semantic["failing_checks"])
        original_phase = _validate_phase_manifest(
            read_strict_json(_phase_path(workspace, "original", "phase.json")),
            phase="original",
            workspace_record=workspace_record,
            original_study_hash=None,
        )
        recompute_phase = _validate_phase_manifest(
            read_strict_json(
                _phase_path(workspace, "recomputation", "phase.json")
            ),
            phase="recomputation",
            workspace_record=workspace_record,
            original_study_hash=original_study["study_hash"],
        )
        canary_phase = _canary_phase_manifest(
            workspace,
            workspace_record,
            verify_lock_identity=verify_lock_identity,
        )
        phase_identities_disjoint = all(
            len(
                {
                    canary_phase[key],
                    original_phase[key],
                    recompute_phase[key],
                }
            )
            == 3
            for key in ("phase_hash", "phase_token", "creator_process_token")
        )
        if not phase_identities_disjoint:
            failing_checks.append("cross_phase_identity_reuse")
        if len(original_tokens) != 2_000 or len(recompute_tokens) != 2_000:
            failing_checks.append("fresh_process_token_count")
        if set(original_tokens) & set(recompute_tokens):
            failing_checks.append("cross_phase_process_token_reuse")
        canary_process_token_hashes = tuple(
            receipt["execution_process_token_hash"] for receipt in canary_receipts
        )
        canary_process_tokens = tuple(
            receipt["execution_attestation"]["process_token"]
            for receipt in canary_receipts
        )
        original_process_token_hashes = {
            sha256_json(token) for token in original_tokens
        }
        recompute_process_token_hashes = {
            sha256_json(token) for token in recompute_tokens
        }
        canary_process_token_hash_set = set(canary_process_token_hashes)
        all_process_tokens_pairwise_disjoint = (
            len(canary_process_token_hash_set) == 4
            and len(original_process_token_hashes) == 2_000
            and len(recompute_process_token_hashes) == 2_000
            and not (canary_process_token_hash_set & original_process_token_hashes)
            and not (canary_process_token_hash_set & recompute_process_token_hashes)
            and not (original_process_token_hashes & recompute_process_token_hashes)
        )
        if not all_process_tokens_pairwise_disjoint:
            failing_checks.append("cross_phase_process_token_reuse")
        phase_tokens = (
            canary_phase["phase_token"],
            canary_phase["creator_process_token"],
            original_phase["phase_token"],
            original_phase["creator_process_token"],
            recompute_phase["phase_token"],
            recompute_phase["creator_process_token"],
        )
        all_execution_tokens = (
            *phase_tokens,
            *canary_process_tokens,
            *original_tokens,
            *recompute_tokens,
        )
        all_execution_tokens_pairwise_disjoint = (
            len(all_execution_tokens) == 4_010
            and len(set(all_execution_tokens)) == 4_010
        )
        if not all_execution_tokens_pairwise_disjoint:
            failing_checks.append("cross_category_execution_token_reuse")
        canary_receipt_hashes = tuple(
            receipt["receipt_hash"] for receipt in canary_receipts
        )
        canary_chain_root = _canary_chain_root(workspace_record)
        canary_chain_tip = canary_receipt_hashes[-1]
        body = {
            "schema_version": VBD_TRAJECTORY_COMBINED_SCHEMA_VERSION,
            "workspace_hash": workspace_record["workspace_hash"],
            "freeze_commit": workspace_record["freeze_commit"],
            "freeze_manifest_hash": workspace_record["freeze_manifest_hash"],
            "plan_hash": workspace_record["plan_hash"],
            "concordance_receipt_hash": workspace_record[
                "concordance_receipt_hash"
            ],
            "original_study_hash": original_study["study_hash"],
            "recomputation_study_hash": recompute_study["study_hash"],
            "semantic_combined_hash": semantic["combined_study_hash"],
            "canary_phase_hash": canary_phase["phase_hash"],
            "original_phase_hash": original_phase["phase_hash"],
            "recomputation_phase_hash": recompute_phase["phase_hash"],
            "original_execution_roots": original_execution_roots,
            "recomputation_execution_roots": recompute_execution_roots,
            "execution_evidence_snapshot_hash": initial_evidence_snapshot[
                "snapshot_hash"
            ],
            "original_process_tokens_hash": sha256_json(original_tokens),
            "recomputation_process_tokens_hash": sha256_json(recompute_tokens),
            "original_process_count": len(original_tokens),
            "recomputation_process_count": len(recompute_tokens),
            "process_tokens_disjoint": not bool(
                set(original_tokens) & set(recompute_tokens)
            ),
            "phase_identities_disjoint": phase_identities_disjoint,
            "canary_chain_root": canary_chain_root,
            "canary_receipt_hashes_hash": sha256_json(canary_receipt_hashes),
            "canary_receipt_chain_tip": canary_chain_tip,
            "canary_process_token_hashes_hash": sha256_json(
                canary_process_token_hashes
            ),
            "all_process_tokens_pairwise_disjoint": (
                all_process_tokens_pairwise_disjoint
            ),
            "all_execution_tokens_hash": sha256_json(all_execution_tokens),
            "all_execution_tokens_pairwise_disjoint": (
                all_execution_tokens_pairwise_disjoint
            ),
            "fresh_semantic_results_match": semantic[
                "fresh_semantic_results_match"
            ],
            "state": "PASS" if not failing_checks else "HOLD",
            "failing_checks": list(dict.fromkeys(failing_checks)),
            "threat_model": VBD_TRAJECTORY_RUNNER_THREAT_MODEL,
            "internal_only": True,
            "synthetic_only": True,
            "aggregate_only": True,
            "customer_output_authorized": False,
            "confidence_output_authorized": False,
            "probability_output_authorized": False,
            "roi_output_authorized": False,
            "causality_output_authorized": False,
            "productivity_output_authorized": False,
            "independent_acceptance_complete": False,
            "task_5_6_complete": False,
            "promotion_complete": False,
        }
        validate_vbd_trajectory_combined_governance(
            {key: body[key] for key in _COMBINED_GOVERNANCE_FIELDS}
        )
        combined = {**body, "combined_hash": sha256_json(body)}
        evidence_after_validation = _execution_evidence_snapshot(workspace)
        if evidence_after_validation != initial_evidence_snapshot:
            raise VbdTrajectoryValidationWorkspaceError(
                "execution evidence changed while it was being validated"
            )
        if _workspace_path_exists(commit_path):
            _validate_workspace_tree(workspace, complete=True)
        else:
            _validate_workspace_ready_for_combined(workspace)
        verify_lock_identity()
        evidence_before_publication = _execution_evidence_snapshot(workspace)
        if evidence_before_publication != initial_evidence_snapshot:
            raise VbdTrajectoryValidationWorkspaceError(
                "execution evidence changed before combined publication"
            )
        write_json_create_once(
            output, combined, lock_verifier=verify_lock_identity
        )
        verify_lock_identity()
        published_combined = _validate_combined_value(
            read_strict_json(output), workspace_record
        )
        if published_combined != combined:
            raise VbdTrajectoryValidationWorkspaceError(
                "combined publication readback differs"
            )
        evidence_after_publication = _execution_evidence_snapshot(workspace)
        if evidence_after_publication != evidence_before_publication:
            raise VbdTrajectoryValidationWorkspaceError(
                "execution evidence changed during combined publication"
            )
        if _workspace_path_exists(commit_path):
            _validate_combined_commit(
                read_strict_json(commit_path),
                workspace_record=workspace_record,
                combined=combined,
            )
        else:
            marker = _combined_commit_record(
                workspace_record=workspace_record, combined=combined
            )
            write_json_create_once(
                commit_path,
                marker,
                lock_verifier=verify_lock_identity,
            )
            _validate_combined_commit(
                read_strict_json(commit_path),
                workspace_record=workspace_record,
                combined=combined,
            )
        verify_lock_identity()
        _validate_workspace_tree(workspace, complete=True)
        return combined


def _phase_process_tokens(
    *,
    workspace: Path,
    original_results: tuple[VbdTrajectorySlotResult, ...],
    recompute_results: tuple[VbdTrajectorySlotResult, ...],
    workspace_record: dict,
    original_study_hash: str,
) -> tuple[tuple[str, ...], tuple[str, ...], dict, dict]:
    token_sets = []
    execution_roots = []
    for phase, results, originals, original_hash in (
        ("original", original_results, None, None),
        (
            "recomputation",
            recompute_results,
            original_results,
            original_study_hash,
        ),
    ):
        manifest = _validate_phase_manifest(
            read_strict_json(_phase_path(workspace, phase, "phase.json")),
            phase=phase,
            workspace_record=workspace_record,
            original_study_hash=original_hash,
        )
        tokens = []
        checkpoint_hashes = []
        launch_receipt_hashes = []
        attestation_hashes = []
        for index, result in enumerate(results):
            _, checkpoint = _load_checkpoint(
                _phase_path(
                    workspace,
                    phase,
                    "slots",
                    f"{_slot_file_stem(index)}.json",
                ),
                workspace_record=workspace_record,
                phase_manifest=manifest,
                slot=result.slot,
                slot_index=index,
                original_result=None if originals is None else originals[index],
            )
            checkpoint_hashes.append(checkpoint["checkpoint_hash"])
            launch_receipt_hashes.append(checkpoint["launch_receipt_hash"])
            attestation = checkpoint["execution_attestation"]
            if type(attestation) is dict:
                tokens.append(attestation["process_token"])
                attestation_hashes.append(attestation["attestation_hash"])
            else:
                attestation_hashes.append(None)
        if len(tokens) != len(set(tokens)):
            raise VbdTrajectoryValidationWorkspaceError(
                f"{phase} process tokens are not unique"
            )
        token_sets.append(tuple(tokens))
        chunk_hashes = []
        for chunk_index in range(VBD_TRAJECTORY_VALIDATION_CHUNK_COUNT):
            chunk = read_strict_json(
                _phase_path(
                    workspace,
                    phase,
                    "chunks",
                    f"chunk_{chunk_index:02d}.json",
                )
            )
            if type(chunk) is not dict:
                raise VbdTrajectoryValidationWorkspaceError(
                    f"{phase} chunk record is invalid"
                )
            chunk_hashes.append(
                _strict_sha256(chunk.get("chunk_result_hash"), "chunk result hash")
            )
        root_body = {
            "phase": phase,
            "phase_hash": manifest["phase_hash"],
            "ordered_checkpoint_hashes_hash": sha256_json(checkpoint_hashes),
            "ordered_launch_receipt_hashes_hash": sha256_json(
                launch_receipt_hashes
            ),
            "ordered_execution_attestation_hashes_hash": sha256_json(
                attestation_hashes
            ),
            "ordered_chunk_result_hashes_hash": sha256_json(chunk_hashes),
        }
        execution_roots.append(
            {**root_body, "execution_root_hash": sha256_json(root_body)}
        )
    return (
        token_sets[0],
        token_sets[1],
        execution_roots[0],
        execution_roots[1],
    )


def _allowed_partial_phase_entries(phase: str) -> set[tuple[str, str]]:
    entries = {
        ("file", name) for name in _PHASE_STATIC_FILES
    } | {("dir", "launches"), ("dir", "slots"), ("dir", "chunks")}
    entries.update(
        ("file", f"launches/{_slot_file_stem(index)}.json")
        for index in range(2_000)
    )
    entries.update(
        ("file", f"slots/{_slot_file_stem(index)}.json")
        for index in range(2_000)
    )
    entries.update(("file", f"chunks/chunk_{index:02d}.json") for index in range(40))
    return entries


def _tree_entries(root: Path) -> set[tuple[str, str]]:
    return _workspace_tree_entries(root)


def _indexed_files(directory: Path, pattern: str) -> tuple[int, ...]:
    if not _workspace_path_is_dir(directory):
        return ()
    indexes = []
    for name, kind in _workspace_directory_entries(directory):
        path = directory / name
        if _is_atomic_temp(path):
            continue
        opened = _workspace_entry_stat(path)
        if kind != "file" or opened is None or opened.st_nlink != 1:
            raise VbdTrajectoryValidationWorkspaceError(
                "indexed checkpoint is linked or not regular"
            )
        match = re.fullmatch(pattern, path.name)
        if match is None:
            raise VbdTrajectoryValidationWorkspaceError(
                "checkpoint directory contains an off-plan file"
            )
        indexes.append(int(match.group(1)))
    return tuple(sorted(indexes))


def _validate_progress_state(workspace: Path) -> str:
    canary_launches = _indexed_files(
        workspace / "canaries" / "launches", r"canary_(\d{2})\.json"
    )
    canary_receipts = _indexed_files(
        workspace / "canaries" / "receipts", r"canary_(\d{2})\.json"
    )
    canary_outputs = _indexed_files(
        workspace / "canaries" / "outputs", r"canary_(\d{2})\.json"
    )
    if canary_receipts != tuple(range(len(canary_receipts))):
        raise VbdTrajectoryValidationWorkspaceError(
            "canary receipts are not a canonical prefix"
        )
    if canary_launches not in (
        canary_receipts,
        canary_receipts + (len(canary_receipts),),
    ) or any(index >= 4 for index in canary_launches):
        raise VbdTrajectoryValidationWorkspaceError(
            "canary launches are not a canonical create-once prefix"
        )
    allowed_output_prefixes = {
        canary_receipts,
        canary_receipts + (len(canary_receipts),),
    }
    if canary_receipts:
        allowed_output_prefixes.add(canary_receipts[:-1])
    if (
        canary_outputs != tuple(range(len(canary_outputs)))
        or canary_outputs not in allowed_output_prefixes
        or len(canary_outputs) > len(canary_launches)
        or any(index >= 4 for index in canary_outputs)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "canary outputs are not a canonical create-once prefix"
        )

    phase_progress: dict[str, tuple[int, int, int]] = {}
    for phase in VBD_TRAJECTORY_VALIDATION_PHASES:
        root = workspace / phase
        launches = _indexed_files(root / "launches", r"slot_(\d{4})\.json")
        slots = _indexed_files(root / "slots", r"slot_(\d{4})\.json")
        chunks = _indexed_files(root / "chunks", r"chunk_(\d{2})\.json")
        if chunks != tuple(range(len(chunks))) or any(index >= 40 for index in chunks):
            raise VbdTrajectoryValidationWorkspaceError(
                f"{phase} chunks are not a canonical prefix"
            )
        minimum_slots = len(chunks) * 50
        maximum_slots = min(2_000, minimum_slots + 50)
        if (
            slots != tuple(range(len(slots)))
            or not minimum_slots <= len(slots) <= maximum_slots
            or launches
            not in (slots, slots + (len(slots),))
            or any(index >= 2_000 for index in launches)
        ):
            raise VbdTrajectoryValidationWorkspaceError(
                f"{phase} slot progress is not a canonical prefix"
            )
        phase_progress[phase] = (len(chunks), len(slots), len(launches))

    original_chunks, original_slots, original_launches = phase_progress["original"]
    recompute_chunks, recompute_slots, recompute_launches = phase_progress[
        "recomputation"
    ]
    if original_launches and len(canary_receipts) != 4:
        raise VbdTrajectoryValidationWorkspaceError(
            "original study progress exists before all canaries passed"
        )
    if recompute_launches and (original_chunks, original_slots) != (40, 2_000):
        raise VbdTrajectoryValidationWorkspaceError(
            "recomputation progress exists before the original phase sealed"
        )
    combined_exists = _workspace_path_exists(workspace / "combined.json")
    combined_commit_exists = _workspace_path_exists(
        workspace / "combined_commit.json"
    )
    if combined_commit_exists and not combined_exists:
        raise VbdTrajectoryValidationWorkspaceError(
            "combined commit marker exists without its output"
        )
    if combined_exists and (
        (original_chunks, original_slots) != (40, 2_000)
        or (recompute_chunks, recompute_slots) != (40, 2_000)
    ):
        raise VbdTrajectoryValidationWorkspaceError(
            "combined output exists before both phases are complete"
        )
    if combined_exists and combined_commit_exists:
        return "COMBINED"
    if combined_exists:
        return "COMBINED_PENDING_COMMIT"
    if (recompute_chunks, recompute_slots) == (40, 2_000):
        return "SEALED"
    if recompute_launches:
        return "RECOMPUTE"
    if (original_chunks, original_slots) == (40, 2_000):
        return "PRIMARY_SEALED"
    if original_launches:
        return "PRIMARY"
    if len(canary_receipts) == 4:
        return "CANARIES_COMPLETE"
    if canary_launches:
        return "CANARIES"
    return "INIT"


def _validate_workspace_tree(workspace: Path, *, complete: bool) -> None:
    _validate_tree_links(workspace)
    if complete and _workspace_has_atomic_temps(workspace):
        raise VbdTrajectoryValidationWorkspaceError(
            "complete workspace contains stale atomic temporaries"
        )
    root_entries = {
        (kind, name)
        for name, kind in _workspace_directory_entries(workspace)
        if not _is_atomic_temp(workspace / name)
    }
    allowed_root = {("file", name) for name in _ROOT_STATIC_FILES}
    allowed_root.update(
        {
            ("dir", "canaries"),
            ("dir", "original"),
            ("dir", "recomputation"),
            ("file", ".runner.lock"),
            ("file", "combined.json"),
            ("file", "combined_commit.json"),
        }
    )
    if not root_entries <= allowed_root:
        raise VbdTrajectoryValidationWorkspaceError(
            "workspace root contains an unexpected entry"
        )
    if _workspace_path_is_dir(workspace / "canaries"):
        allowed_canaries = {
            ("file", "phase.json"),
            ("dir", "launches"),
            ("dir", "outputs"),
            ("dir", "receipts"),
        }
        allowed_canaries.update(
            ("file", f"launches/canary_{index:02d}.json") for index in range(4)
        )
        allowed_canaries.update(
            ("file", f"outputs/canary_{index:02d}.json") for index in range(4)
        )
        allowed_canaries.update(
            ("file", f"receipts/canary_{index:02d}.json") for index in range(4)
        )
        actual = _tree_entries(workspace / "canaries")
        if not actual <= allowed_canaries:
            raise VbdTrajectoryValidationWorkspaceError(
                "canary tree contains an unexpected entry"
            )
        receipt_indexes = sorted(
            int(match.group(1))
            for kind, relative in actual
            if kind == "file"
            and (match := re.fullmatch(r"receipts/canary_(\d{2})\.json", relative))
        )
        if receipt_indexes != list(range(len(receipt_indexes))):
            raise VbdTrajectoryValidationWorkspaceError(
                "canary receipt tree is out of order"
            )
    for phase in VBD_TRAJECTORY_VALIDATION_PHASES:
        root = workspace / phase
        if not _workspace_path_is_dir(root):
            continue
        actual = _tree_entries(root)
        allowed = _allowed_partial_phase_entries(phase)
        if not actual <= allowed:
            raise VbdTrajectoryValidationWorkspaceError(
                f"{phase} tree contains an unexpected entry"
            )
    if complete:
        _validate_validation_launch_anchors(workspace)
    if complete:
        required_root = {("file", name) for name in _ROOT_STATIC_FILES}
        required_root.update(
            {
                ("dir", "canaries"),
                ("dir", "original"),
                ("dir", "recomputation"),
                ("file", ".runner.lock"),
                ("file", "combined.json"),
                ("file", "combined_commit.json"),
            }
        )
        if root_entries != required_root:
            raise VbdTrajectoryValidationWorkspaceError(
                "complete workspace root is not exact"
            )
        required_canaries = {
            ("file", "phase.json"),
            ("dir", "launches"),
            ("dir", "outputs"),
            ("dir", "receipts"),
        }
        required_canaries.update(
            ("file", f"launches/canary_{index:02d}.json") for index in range(4)
        )
        required_canaries.update(
            ("file", f"outputs/canary_{index:02d}.json") for index in range(4)
        )
        required_canaries.update(
            ("file", f"receipts/canary_{index:02d}.json") for index in range(4)
        )
        if _tree_entries(workspace / "canaries") != required_canaries:
            raise VbdTrajectoryValidationWorkspaceError(
                "complete canary tree is not exact"
            )
        for phase in VBD_TRAJECTORY_VALIDATION_PHASES:
            if _tree_entries(workspace / phase) != _allowed_partial_phase_entries(phase):
                raise VbdTrajectoryValidationWorkspaceError(
                    f"complete {phase} tree is not exact"
                )
    state = _validate_progress_state(workspace)
    if complete and state != "COMBINED":
        raise VbdTrajectoryValidationWorkspaceError(
            "complete workspace did not reach COMBINED state"
        )


def _validate_workspace_ready_for_combined(workspace: Path) -> None:
    """Validate the exact sealed tree before atomically publishing PASS/HOLD."""

    _validate_workspace_tree(workspace, complete=False)
    _validate_validation_launch_anchors(workspace)
    if _workspace_has_atomic_temps(workspace):
        raise VbdTrajectoryValidationWorkspaceError(
            "sealed workspace contains stale atomic temporaries"
        )
    required_root = {("file", name) for name in _ROOT_STATIC_FILES}
    required_root.update(
        {
            ("dir", "canaries"),
            ("dir", "original"),
            ("dir", "recomputation"),
            ("file", ".runner.lock"),
        }
    )
    combined_exists = _workspace_path_exists(workspace / "combined.json")
    if _workspace_path_exists(workspace / "combined_commit.json"):
        raise VbdTrajectoryValidationWorkspaceError(
            "prepublication workspace already has a commit marker"
        )
    if combined_exists:
        required_root.add(("file", "combined.json"))
    observed_root = {
        (kind, name)
        for name, kind in _workspace_directory_entries(workspace)
        if not _is_atomic_temp(workspace / name)
    }
    if observed_root != required_root:
        raise VbdTrajectoryValidationWorkspaceError(
            "prepublication workspace root is not exact"
        )
    required_canaries = {
        ("file", "phase.json"),
        ("dir", "launches"),
        ("dir", "outputs"),
        ("dir", "receipts"),
    }
    for directory in ("launches", "outputs", "receipts"):
        required_canaries.update(
            ("file", f"{directory}/canary_{index:02d}.json")
            for index in range(4)
        )
    if _tree_entries(workspace / "canaries") != required_canaries:
        raise VbdTrajectoryValidationWorkspaceError(
            "prepublication canary tree is not exact"
        )
    for phase in VBD_TRAJECTORY_VALIDATION_PHASES:
        if _tree_entries(workspace / phase) != _allowed_partial_phase_entries(phase):
            raise VbdTrajectoryValidationWorkspaceError(
                f"prepublication {phase} tree is not exact"
            )
    expected_state = (
        "COMBINED_PENDING_COMMIT" if combined_exists else "SEALED"
    )
    if _validate_progress_state(workspace) != expected_state:
        raise VbdTrajectoryValidationWorkspaceError(
            "workspace is not sealed for combined publication"
        )


def vbd_trajectory_validation_runner_summary() -> dict:
    plan = immutable_vbd_trajectory_validation_plan()
    body = {
        "plan_hash": plan.plan_hash,
        "slot_count_per_phase": len(plan.slots),
        "phase_order": list(VBD_TRAJECTORY_VALIDATION_PHASES),
        "fresh_process_count_required": 4_000,
        "canary_count": len(plan.canaries),
        "chunk_count_per_phase": len(plan.chunks),
        "slots_per_chunk": 50,
        "freeze_required": True,
        "concordance_required_before_canaries": True,
        "concordance_admission_implemented": True,
        "concordance_bundle_count": 30,
        "concordance_primary_process_count": 30,
        "concordance_recomputation_process_count": 90,
        "concordance_complete": False,
        "acceptance_plan_execution_authorized": False,
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
        "task_5_6_complete": False,
        "threat_model": VBD_TRAJECTORY_RUNNER_THREAT_MODEL,
    }
    return {**body, "runner_summary_hash": sha256_json(body)}
