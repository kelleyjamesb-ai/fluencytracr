#!/usr/bin/env python3
"""Standalone consume-before-import bootstrap for the VBD marginalization diagnostic."""

from __future__ import annotations

import argparse
from datetime import datetime
import hashlib
import importlib.abc
import importlib.machinery
import importlib.util
import json
import os
from pathlib import Path
import re
import signal
import stat
import subprocess
import sys
import time


_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_GROUP_EFFECT_MARGINALIZATION_AUTHORIZATION_MANIFEST_2026_07_V1"
)
_EXECUTION_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_GROUP_EFFECT_MARGINALIZATION_EXECUTION_AUTHORIZATION_2026_07_V1"
)
_PERMIT_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_GROUP_EFFECT_MARGINALIZATION_LAUNCH_PERMIT_2026_07_V1"
)
_CLAIM_SCHEMA_VERSION = (
    "FT_AI_VALUE_VBD_GROUP_EFFECT_MARGINALIZATION_ATTEMPT_CLAIM_2026_07_V1"
)
_SCOPE = "vbd_group_effect_marginalization_diagnostic_v1_nonacceptance_one_launch"
_MANIFEST_RELATIVE_PATH = (
    "inference/evidence/vbd_trajectory_group_effect_marginalization_authorization.json"
)
_BOOTSTRAP_RELATIVE_PATH = (
    "inference/scripts/vbd_trajectory_group_effect_marginalization_bootstrap.py"
)
_WORKSPACE = Path(
    "/Users/jkelley/.codex/evidence/vbd-group-effect-marginalization-diagnostic-v1-workspace"
)
_LIFECYCLE = Path(
    "/Users/jkelley/.codex/evidence/vbd-group-effect-marginalization-diagnostic-v1-lifecycle"
)
_AUTHORIZATION_NAME = "execution_authorization.json"
_PERMIT_NAME = "launch_permit.json"
_CONSUMED_NAME = "launch_permit.consumed.json"
_CLAIM_NAME = "attempt_claim.json"
_INPUT_NAME = "input_binding.json"
_COMPLETION_NAME = "completion_receipt.json"
_STAGED_NAME = "marginalization_diagnostic.staged.json"
_OUTPUT_NAME = "marginalization_diagnostic.json"
_TIMEOUT_SECONDS = 43_200
_TERMINATION_SIGNALS = (signal.SIGHUP, signal.SIGINT, signal.SIGTERM)
_HASH_RE = re.compile(r"^[0-9a-f]{64}$")
_COMMIT_RE = re.compile(r"^[0-9a-f]{40}$")
_REVIEW_RE = re.compile(
    r"^review:(code|bug|adversarial|statistical-methodology)/go/"
    r"([0-9a-f]{40})/[A-Za-z0-9._-]+$"
)
_DECISION_RE = re.compile(
    r"^human-authorization:vbd-marginalization-diagnostic/[A-Za-z0-9._-]+$"
)
_TIMESTAMP_RE = re.compile(
    r"^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$"
)
_MANIFEST_KEYS = {
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
_REQUIRED_MARGINALIZATION_SOURCES = {
    _BOOTSTRAP_RELATIVE_PATH,
    "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_marginalization.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_marginalization_authorization.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_marginalization_constants.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_marginalization_diagnostic.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_marginalization_execution.py",
    "inference/src/fluencytracr_inference/vbd_trajectory_group_effect_marginalization_projection.py",
}
_THREAD_ENV = (
    "MKL_NUM_THREADS",
    "NUMEXPR_NUM_THREADS",
    "OMP_NUM_THREADS",
    "OPENBLAS_NUM_THREADS",
    "VECLIB_MAXIMUM_THREADS",
)
_FIRST_PARTY_PACKAGE = "fluencytracr_inference"
_FIRST_PARTY_SOURCE_PREFIX = "inference/src/fluencytracr_inference/"
_REVIEWED_SOURCE_LOADER_TOKEN = object()
_SUPERVISOR_ROOT_GUARD = None


class BootstrapError(RuntimeError):
    """The marginalization launch failed closed."""


class _ReviewedSourceLoader(importlib.abc.Loader):
    def __init__(self, entry: dict):
        self._entry = entry
        self._reviewed_source_loader_token = _REVIEWED_SOURCE_LOADER_TOKEN

    def create_module(self, _spec):
        return None

    def exec_module(self, module) -> None:
        source_path = self._entry["source_path"]
        module.__file__ = source_path
        module.__cached__ = None
        if self._entry["is_package"]:
            module.__path__ = [str(Path(source_path).parent)]
        code = compile(
            self._entry["source_bytes"],
            source_path,
            "exec",
            dont_inherit=True,
        )
        exec(code, module.__dict__)


class _ReviewedSourceFinder(importlib.abc.MetaPathFinder):
    def __init__(self, reviewed_sources: dict):
        self.reviewed_sources = reviewed_sources
        self._reviewed_source_loader_token = _REVIEWED_SOURCE_LOADER_TOKEN

    def find_spec(self, fullname, _path=None, _target=None):
        entry = self.reviewed_sources.get(fullname)
        if entry is None:
            if fullname == _FIRST_PARTY_PACKAGE or fullname.startswith(
                f"{_FIRST_PARTY_PACKAGE}."
            ):
                raise ImportError("unreviewed first-party module import rejected")
            return None
        return importlib.util.spec_from_loader(
            fullname,
            _ReviewedSourceLoader(entry),
            origin=entry["source_path"],
            is_package=entry["is_package"],
        )


def _strict_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise BootstrapError("JSON contains duplicate keys")
        result[key] = value
    return result


def _canonical_bytes(value) -> bytes:
    return (
        json.dumps(
            value,
            sort_keys=True,
            separators=(",", ":"),
            ensure_ascii=False,
            allow_nan=False,
        ).encode("utf-8")
        + b"\n"
    )


def _exact_native_equal(left, right) -> bool:
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


def _hash_json(value) -> str:
    return hashlib.sha256(_canonical_bytes(value)[:-1]).hexdigest()


def _hash_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _strict_hash(value, label: str) -> str:
    if type(value) is not str or _HASH_RE.fullmatch(value) is None:
        raise BootstrapError(f"{label} is invalid")
    return value


def _strict_commit(value, label: str) -> str:
    if type(value) is not str or _COMMIT_RE.fullmatch(value) is None:
        raise BootstrapError(f"{label} is invalid")
    return value


def _strict_path(value, label: str) -> Path:
    if type(value) is not str or not value or "\x00" in value:
        raise BootstrapError(f"{label} is invalid")
    path = Path(value)
    if not path.is_absolute() or path != Path(os.path.normpath(value)):
        raise BootstrapError(f"{label} is not a normalized absolute path")
    return path


def _open_directory(path: Path) -> int:
    path = _strict_path(str(path), "directory")
    descriptor = os.open("/", os.O_RDONLY | os.O_DIRECTORY)
    try:
        for part in path.parts[1:]:
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


def _open_directory_identity_chain(
    path: Path,
) -> tuple[list[int], tuple[tuple[int, int], ...]]:
    """Open every absolute component so later checks detect ancestor rebinding."""

    path = _strict_path(str(path), "directory")
    descriptors = [os.open("/", os.O_RDONLY | os.O_DIRECTORY)]
    identities = []
    try:
        root_info = os.fstat(descriptors[0])
        identities.append((root_info.st_dev, root_info.st_ino))
        for part in path.parts[1:]:
            child = os.open(
                part,
                os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW,
                dir_fd=descriptors[-1],
            )
            info = os.fstat(child)
            if not stat.S_ISDIR(info.st_mode):
                os.close(child)
                raise OSError("path component is not a directory")
            descriptors.append(child)
            identities.append((info.st_dev, info.st_ino))
        return descriptors, tuple(identities)
    except BaseException:
        for descriptor in reversed(descriptors):
            os.close(descriptor)
        raise


class _DirectoryBinding:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._chain_fds, self._chain_identities = _open_directory_identity_chain(
            path
        )
        self.parent_fd = self._chain_fds[-2]
        self.root_fd = -1
        try:
            self.root_fd = self._chain_fds[-1]
            info = os.fstat(self.root_fd)
            if not stat.S_ISDIR(info.st_mode):
                raise OSError("bound root is not a directory")
            self.identity = (info.st_dev, info.st_ino)
            self.revalidate()
        except BaseException:
            self.close()
            raise

    def revalidate(self) -> None:
        current_fds: list[int] = []
        try:
            current_fds, current_identities = _open_directory_identity_chain(self.path)
            opened_identities = tuple(
                (info.st_dev, info.st_ino)
                for info in (os.fstat(descriptor) for descriptor in self._chain_fds)
            )
            if (
                opened_identities != self._chain_identities
                or current_identities != self._chain_identities
                or opened_identities[-1] != self.identity
            ):
                raise BootstrapError("fixed-root directory name binding differs")
        except OSError as exc:
            raise BootstrapError("fixed-root directory name binding differs") from exc
        finally:
            for descriptor in reversed(current_fds):
                os.close(descriptor)

    def names(self) -> tuple[str, ...]:
        self.revalidate()
        names = tuple(sorted(os.listdir(self.root_fd)))
        self.revalidate()
        return names

    def close(self) -> None:
        for descriptor in reversed(getattr(self, "_chain_fds", [])):
            os.close(descriptor)
        self._chain_fds = []
        self.root_fd = -1
        self.parent_fd = -1


def _create_directory_binding(path: Path) -> _DirectoryBinding:
    parent = _DirectoryBinding(path.parent)
    try:
        parent.revalidate()
        os.mkdir(path.name, mode=0o700, dir_fd=parent.root_fd)
        os.fsync(parent.root_fd)
        binding = _DirectoryBinding(path)
        parent.revalidate()
        binding.revalidate()
        return binding
    finally:
        parent.close()


def _read_file_at(
    binding: _DirectoryBinding,
    name: str,
    label: str,
) -> tuple[bytes, os.stat_result]:
    descriptor = -1
    try:
        binding.revalidate()
        descriptor = os.open(
            name,
            os.O_RDONLY | os.O_NOFOLLOW,
            dir_fd=binding.root_fd,
        )
        info = os.fstat(descriptor)
        if not stat.S_ISREG(info.st_mode):
            raise OSError("not a regular file")
        chunks = []
        while True:
            chunk = os.read(descriptor, 1 << 20)
            if not chunk:
                break
            chunks.append(chunk)
        encoded = b"".join(chunks)
        info = os.fstat(descriptor)
        current = os.stat(
            name,
            dir_fd=binding.root_fd,
            follow_symlinks=False,
        )
        if (
            not stat.S_ISREG(info.st_mode)
            or not stat.S_ISREG(current.st_mode)
            or (current.st_dev, current.st_ino) != (info.st_dev, info.st_ino)
        ):
            raise OSError("current file name binding differs")
        binding.revalidate()
        return encoded, info
    except OSError as exc:
        raise BootstrapError(f"{label} cannot be read safely") from exc
    finally:
        if descriptor >= 0:
            os.close(descriptor)


def _read_json_at(
    binding: _DirectoryBinding,
    name: str,
    label: str,
) -> tuple[dict, os.stat_result]:
    encoded, info = _read_file_at(binding, name, label)
    try:
        value = json.loads(
            encoded.decode("utf-8"),
            object_pairs_hook=_strict_object,
            parse_constant=lambda _value: (_ for _ in ()).throw(
                BootstrapError(f"{label} contains a nonfinite value")
            ),
        )
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise BootstrapError(f"{label} is not strict JSON") from exc
    if type(value) is not dict or encoded != _canonical_bytes(value):
        raise BootstrapError(f"{label} is not canonical JSON")
    binding.revalidate()
    return value, info


def _read_file(path: Path, label: str) -> tuple[bytes, os.stat_result]:
    root_fd = -1
    descriptor = -1
    try:
        root_fd = _open_directory(path.parent)
        descriptor = os.open(
            path.name,
            os.O_RDONLY | os.O_NOFOLLOW,
            dir_fd=root_fd,
        )
        info = os.fstat(descriptor)
        if not stat.S_ISREG(info.st_mode):
            raise OSError("not a regular file")
        chunks = []
        while True:
            chunk = os.read(descriptor, 1 << 20)
            if not chunk:
                break
            chunks.append(chunk)
        encoded = b"".join(chunks)
        info = os.fstat(descriptor)
        current = os.stat(
            path.name,
            dir_fd=root_fd,
            follow_symlinks=False,
        )
        if (
            not stat.S_ISREG(info.st_mode)
            or not stat.S_ISREG(current.st_mode)
            or (current.st_dev, current.st_ino) != (info.st_dev, info.st_ino)
        ):
            raise OSError("current file name binding differs")
        return encoded, info
    except OSError as exc:
        raise BootstrapError(f"{label} cannot be read safely") from exc
    finally:
        if descriptor >= 0:
            os.close(descriptor)
        if root_fd >= 0:
            os.close(root_fd)


def _read_json(path: Path, label: str) -> tuple[dict, os.stat_result]:
    encoded, info = _read_file(path, label)
    try:
        value = json.loads(
            encoded.decode("utf-8"),
            object_pairs_hook=_strict_object,
            parse_constant=lambda _value: (_ for _ in ()).throw(
                BootstrapError(f"{label} contains a nonfinite value")
            ),
        )
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise BootstrapError(f"{label} is not strict JSON") from exc
    if type(value) is not dict or encoded != _canonical_bytes(value):
        raise BootstrapError(f"{label} is not canonical JSON")
    return value, info


def _root_names(path: Path) -> tuple[str, ...] | None:
    parent_fd = -1
    root_fd = -1
    try:
        parent_fd = _open_directory(path.parent)
        try:
            root_fd = os.open(
                path.name,
                os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW,
                dir_fd=parent_fd,
            )
        except FileNotFoundError:
            return None
        info = os.fstat(root_fd)
        if (
            not stat.S_ISDIR(info.st_mode)
            or info.st_uid != os.getuid()
            or stat.S_IMODE(info.st_mode) != 0o700
        ):
            raise OSError("root is not a directory")
        names = tuple(sorted(os.listdir(root_fd)))
        for name in names:
            child = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
            if (
                not stat.S_ISREG(child.st_mode)
                or child.st_nlink != 1
                or child.st_dev != info.st_dev
                or child.st_uid != os.getuid()
                or stat.S_IMODE(child.st_mode) != 0o600
            ):
                raise BootstrapError("fixed-root entry is unsafe")
        return names
    except OSError as exc:
        raise BootstrapError("fixed root is unsafe") from exc
    finally:
        if root_fd >= 0:
            os.close(root_fd)
        if parent_fd >= 0:
            os.close(parent_fd)


def _git(git_path: Path, repo: Path, *args: str) -> str:
    env = {
        "HOME": os.environ.get("HOME", "/"),
        "PATH": "/usr/bin:/bin",
        "LC_ALL": "C",
        "LANG": "C",
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_OPTIONAL_LOCKS": "0",
        "GIT_TERMINAL_PROMPT": "0",
    }
    command = [
        str(git_path),
        "-c",
        "core.fsmonitor=false",
        "-c",
        "core.untrackedCache=false",
        "-c",
        f"core.hooksPath={os.devnull}",
        "-C",
        str(repo),
        f"--work-tree={repo}",
        *args,
    ]
    try:
        completed = subprocess.run(
            command,
            cwd="/",
            env=env,
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        raise BootstrapError("Git identity validation failed") from exc
    return completed.stdout.strip()


def _validate_environment() -> None:
    if (
        sys.flags.isolated != 1
        or sys.flags.no_site != 1
        or sys.flags.dont_write_bytecode != 1
        or os.environ.get("PYTHONHASHSEED") != "0"
        or any(os.environ.get(name) != "1" for name in _THREAD_ENV)
    ):
        raise BootstrapError("isolated numerical environment is invalid")


def _validate_manifest(manifest: dict, repo: Path, script: Path) -> tuple[Path, str]:
    if set(manifest) != _MANIFEST_KEYS:
        raise BootstrapError("authorization manifest shape is invalid")
    body = {key: value for key, value in manifest.items() if key != "manifest_hash"}
    implementation = _strict_commit(
        manifest["implementation_commit"], "implementation commit"
    )
    _strict_commit(manifest["implementation_tree"], "implementation tree")
    if (
        manifest["schema_version"] != _SCHEMA_VERSION
        or manifest["manifest_hash"] != _hash_json(body)
        or manifest["execution_state"] != "NOT_RUN"
        or manifest["internal_only"] is not True
        or manifest["synthetic_only"] is not True
        or manifest["aggregate_only"] is not True
        or manifest["customer_output_authorized"] is not False
        or manifest["acceptance_complete"] is not False
        or manifest["task_2_6_complete"] is not False
        or manifest["task_5_6_complete"] is not False
    ):
        raise BootstrapError("authorization manifest posture is invalid")
    for key in (
        "manifest_hash",
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
    ):
        _strict_hash(manifest[key], key)
    refs = manifest["implementation_review_refs"]
    expected_roles = {
        "CODE": "code",
        "BUG": "bug",
        "ADVERSARIAL": "adversarial",
        "STATISTICAL_METHODOLOGY": "statistical-methodology",
    }
    if type(refs) is not dict or set(refs) != set(expected_roles):
        raise BootstrapError("implementation review references are incomplete")
    for role, slug in expected_roles.items():
        match = _REVIEW_RE.fullmatch(refs[role]) if type(refs[role]) is str else None
        if match is None or match.group(1) != slug or match.group(2) != implementation:
            raise BootstrapError("implementation review reference is invalid")
    if len(set(refs.values())) != 4:
        raise BootstrapError("implementation review references are duplicated")

    bootstrap = _strict_path(manifest["bootstrap_path"], "bootstrap path")
    git_path = _strict_path(manifest["git_executable_path"], "Git path")
    site_paths = manifest["site_package_paths"]
    if (
        type(site_paths) is not list
        or not site_paths
        or site_paths != sorted(site_paths)
        or len(site_paths) != len(set(site_paths))
        or any(
            type(value) is not str or not Path(value).is_absolute()
            for value in site_paths
        )
    ):
        raise BootstrapError("site-package paths are invalid")
    expected_paths = {
        "canonical_workspace_path": _WORKSPACE,
        "lifecycle_root_path": _LIFECYCLE,
        "execution_authorization_record_path": _LIFECYCLE / _AUTHORIZATION_NAME,
        "launch_permit_path": _LIFECYCLE / _PERMIT_NAME,
        "consumed_permit_path": _LIFECYCLE / _CONSUMED_NAME,
        "claim_path": _LIFECYCLE / _CLAIM_NAME,
        "input_binding_path": _LIFECYCLE / _INPUT_NAME,
        "completion_receipt_path": _LIFECYCLE / _COMPLETION_NAME,
        "output_path": _WORKSPACE / _OUTPUT_NAME,
    }
    if any(
        _strict_path(manifest[key], key) != expected
        for key, expected in expected_paths.items()
    ):
        raise BootstrapError("fixed path binding differs")
    expected_command = [
        os.path.realpath(sys.executable),
        "-I",
        "-S",
        "-B",
        str(script),
        "run",
        "--execution-authorization",
        str(_LIFECYCLE / _AUTHORIZATION_NAME),
    ]
    if (
        bootstrap != script
        or manifest["command_argv"] != expected_command
        or manifest["command_hash"] != _hash_json(expected_command)
    ):
        raise BootstrapError("bootstrap command binding differs")

    script_bytes, script_info = _read_file(script, "bootstrap")
    git_bytes, git_info = _read_file(git_path, "Git executable")
    if (
        script_info.st_nlink != 1
        or git_info.st_nlink < 1
        or _hash_bytes(script_bytes) != manifest["bootstrap_sha256"]
        or _hash_bytes(git_bytes) != manifest["git_executable_sha256"]
    ):
        raise BootstrapError("bootstrap or Git executable bytes differ")
    lock_bytes, _ = _read_file(
        repo / "inference/requirements.lock", "requirements lock"
    )
    if _hash_bytes(lock_bytes) != manifest["requirements_lock_hash"]:
        raise BootstrapError("requirements lock differs")

    files = manifest["in_scope_files"]
    if type(files) is not list:
        raise BootstrapError("source manifest is invalid")
    paths = []
    for item in files:
        if (
            type(item) is not dict
            or set(item) != {"path", "sha256"}
            or type(item["path"]) is not str
            or item["path"].startswith("/")
            or ".." in Path(item["path"]).parts
        ):
            raise BootstrapError("source manifest entry is unsafe")
        _strict_hash(item["sha256"], "source hash")
        paths.append(item["path"])
        source_bytes, info = _read_file(repo / item["path"], "reviewed source")
        if info.st_nlink != 1 or _hash_bytes(source_bytes) != item["sha256"]:
            raise BootstrapError("reviewed source bytes differ")
    if (
        paths != sorted(paths)
        or len(paths) != len(set(paths))
        or len(paths) != 52
        or not _REQUIRED_MARGINALIZATION_SOURCES.issubset(paths)
        or manifest["in_scope_files_hash"] != _hash_json(files)
        or manifest["implementation_hash"] != _hash_json({"files": files})
    ):
        raise BootstrapError("reviewed source set is incomplete")

    if _hash_bytes(git_bytes) != manifest["git_executable_sha256"]:
        raise BootstrapError("Git executable changed")
    authorization = _git(git_path, repo, "rev-parse", "HEAD")
    if (
        _COMMIT_RE.fullmatch(authorization) is None
        or _git(git_path, repo, "status", "--porcelain=v1", "--untracked-files=all")
        or _git(git_path, repo, "rev-parse", f"{implementation}^{{tree}}")
        != manifest["implementation_tree"]
    ):
        raise BootstrapError("checkout is not clean exact authorization state")
    parents = _git(
        git_path, repo, "rev-list", "--parents", "-n", "1", authorization
    ).split()
    changed = _git(
        git_path,
        repo,
        "diff-tree",
        "--no-commit-id",
        "--name-only",
        "-r",
        implementation,
        authorization,
    ).splitlines()
    if parents != [authorization, implementation] or changed != [
        _MANIFEST_RELATIVE_PATH
    ]:
        raise BootstrapError("authorization commit is not sole-child manifest-only")
    manifest_blob = _git(
        git_path, repo, "rev-parse", f"{authorization}:{_MANIFEST_RELATIVE_PATH}"
    )
    manifest_path = repo / _MANIFEST_RELATIVE_PATH
    if _git(git_path, repo, "hash-object", str(manifest_path)) != manifest_blob:
        raise BootstrapError("committed authorization manifest differs")
    return git_path, authorization


def _validate_launch_records_in_binding(
    manifest: dict,
    authorization_commit: str,
    authorization_path: Path,
    binding: _DirectoryBinding,
) -> tuple[dict, dict, os.stat_result]:
    if authorization_path != _LIFECYCLE / _AUTHORIZATION_NAME:
        raise BootstrapError("execution authorization path is off plan")
    binding.revalidate()
    workspace_names = _root_names(_WORKSPACE)
    binding.revalidate()
    if workspace_names is not None:
        raise BootstrapError("marginalization workspace already exists")
    if binding.names() != tuple(sorted((_AUTHORIZATION_NAME, _PERMIT_NAME))):
        raise BootstrapError("marginalization lifecycle is not ready for one launch")
    authorization, authorization_info = _read_json_at(
        binding,
        _AUTHORIZATION_NAME,
        "execution authorization",
    )
    permit, permit_info = _read_json_at(
        binding,
        _PERMIT_NAME,
        "launch permit",
    )
    if authorization_info.st_nlink != 1 or permit_info.st_nlink != 1:
        raise BootstrapError("launch records have unsafe link counts")

    permit_body = {
        "schema_version": _PERMIT_SCHEMA_VERSION,
        "authorization_commit": authorization_commit,
        "authorization_manifest_hash": manifest["manifest_hash"],
        "scope": _SCOPE,
        "permit_token": permit.get("permit_token"),
        "maximum_launch_count": 1,
        "state": "AVAILABLE_BEFORE_EXECUTION",
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }
    if (
        type(permit.get("permit_token")) is not str
        or _HASH_RE.fullmatch(permit["permit_token"]) is None
        or not _exact_native_equal(
            permit,
            {**permit_body, "permit_hash": _hash_json(permit_body)},
        )
    ):
        raise BootstrapError("launch permit is invalid")

    authorization_keys = {
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
    body = {
        key: value
        for key, value in authorization.items()
        if key != "execution_authorization_hash"
    }
    timestamp = authorization.get("authorized_at_utc")
    try:
        if type(timestamp) is not str or _TIMESTAMP_RE.fullmatch(timestamp) is None:
            raise ValueError
        datetime.strptime(timestamp, "%Y-%m-%dT%H:%M:%SZ")
    except ValueError as exc:
        raise BootstrapError("authorization timestamp is invalid") from exc
    if (
        set(authorization) != authorization_keys
        or authorization["schema_version"] != _EXECUTION_SCHEMA_VERSION
        or authorization["authorization_commit"] != authorization_commit
        or authorization["authorization_manifest_hash"] != manifest["manifest_hash"]
        or authorization["scope"] != _SCOPE
        or type(authorization["authorizing_decision_ref"]) is not str
        or _DECISION_RE.fullmatch(authorization["authorizing_decision_ref"]) is None
        or _strict_hash(authorization["decision_text_hash"], "decision hash")
        != authorization["decision_text_hash"]
        or type(authorization["maximum_launch_count"]) is not int
        or authorization["maximum_launch_count"] != 1
        or authorization["canonical_workspace_identity"]
        != manifest["canonical_workspace_identity_hash"]
        or authorization["lifecycle_root_identity"]
        != manifest["lifecycle_root_identity_hash"]
        or authorization["command_hash"] != manifest["command_hash"]
        or authorization["launch_permit_path_hash"]
        != manifest["launch_permit_path_hash"]
        or authorization["launch_permit_hash"] != permit["permit_hash"]
        or authorization["launch_permit_file_sha256"]
        != _hash_bytes(_canonical_bytes(permit))
        or type(authorization["launch_permit_device"]) is not int
        or authorization["launch_permit_device"] != permit_info.st_dev
        or type(authorization["launch_permit_inode"]) is not int
        or authorization["launch_permit_inode"] != permit_info.st_ino
        or authorization["execution_authorization_hash"] != _hash_json(body)
    ):
        raise BootstrapError("execution authorization is invalid")
    binding.revalidate()
    return authorization, permit, permit_info


def _validate_launch_records(
    manifest: dict,
    authorization_commit: str,
    authorization_path: Path,
) -> tuple[dict, dict, os.stat_result, _DirectoryBinding]:
    binding = _DirectoryBinding(_LIFECYCLE)
    try:
        values = _validate_launch_records_in_binding(
            manifest,
            authorization_commit,
            authorization_path,
            binding,
        )
        return (*values, binding)
    except BaseException:
        binding.close()
        raise


def _write_exclusive_at(root_fd: int, name: str, value: dict) -> None:
    encoded = _canonical_bytes(value)
    descriptor = -1
    try:
        descriptor = os.open(
            name,
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
        raise BootstrapError("create-once lifecycle write failed") from exc
    finally:
        if descriptor >= 0:
            os.close(descriptor)


def _consume_permit_and_claim(
    manifest: dict,
    authorization_commit: str,
    authorization: dict,
    permit: dict,
    permit_info: os.stat_result,
    lifecycle_binding: _DirectoryBinding | None = None,
) -> dict:
    binding = lifecycle_binding or _DirectoryBinding(_LIFECYCLE)
    owns_binding = lifecycle_binding is None
    root_fd = binding.root_fd
    try:
        binding.revalidate()
        try:
            os.link(
                _PERMIT_NAME,
                _CONSUMED_NAME,
                src_dir_fd=root_fd,
                dst_dir_fd=root_fd,
                follow_symlinks=False,
            )
            os.fsync(root_fd)
        except OSError as exc:
            raise BootstrapError("launch permit could not be durably consumed") from exc
        source = os.stat(_PERMIT_NAME, dir_fd=root_fd, follow_symlinks=False)
        consumed = os.stat(_CONSUMED_NAME, dir_fd=root_fd, follow_symlinks=False)
        if (
            not stat.S_ISREG(source.st_mode)
            or not stat.S_ISREG(consumed.st_mode)
            or source.st_dev != permit_info.st_dev
            or source.st_ino != permit_info.st_ino
            or consumed.st_dev != source.st_dev
            or consumed.st_ino != source.st_ino
            or source.st_nlink != 2
            or consumed.st_nlink != 2
        ):
            raise BootstrapError("launch permit hard-link transition differs")
        os.unlink(_PERMIT_NAME, dir_fd=root_fd)
        os.fsync(root_fd)
        consumed = os.stat(_CONSUMED_NAME, dir_fd=root_fd, follow_symlinks=False)
        if (
            consumed.st_dev != permit_info.st_dev
            or consumed.st_ino != permit_info.st_ino
            or consumed.st_nlink != 1
        ):
            raise BootstrapError("consumed launch permit identity differs")
        consumed_bytes, consumed_read_info = _read_file_at(
            binding,
            _CONSUMED_NAME,
            "consumed launch permit",
        )
        if (
            consumed_read_info.st_dev != permit_info.st_dev
            or consumed_read_info.st_ino != permit_info.st_ino
            or consumed_read_info.st_nlink != 1
            or _hash_bytes(consumed_bytes)
            != authorization["launch_permit_file_sha256"]
            or consumed_bytes != _canonical_bytes(permit)
        ):
            raise BootstrapError("consumed launch permit bytes differ")

        claim_body = {
            "schema_version": _CLAIM_SCHEMA_VERSION,
            "authorization_commit": authorization_commit,
            "authorization_manifest_hash": manifest["manifest_hash"],
            "execution_authorization_hash": authorization[
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
            "consumed_permit_hash": authorization["launch_permit_hash"],
            "consumed_permit_file_sha256": authorization[
                "launch_permit_file_sha256"
            ],
            "consumed_permit_device": authorization["launch_permit_device"],
            "consumed_permit_inode": authorization["launch_permit_inode"],
            "maximum_launch_count": 1,
            "state": "CONSUMED_BEFORE_EXECUTION",
        }
        claim = {**claim_body, "claim_hash": _hash_json(claim_body)}
        _write_exclusive_at(root_fd, _CLAIM_NAME, claim)
        binding.revalidate()
        reread, info = _read_json_at(binding, _CLAIM_NAME, "attempt claim")
        if not _exact_native_equal(reread, claim) or info.st_nlink != 1:
            raise BootstrapError("attempt claim readback differs")
        expected = tuple(sorted((_AUTHORIZATION_NAME, _CONSUMED_NAME, _CLAIM_NAME)))
        if binding.names() != expected:
            raise BootstrapError("post-claim lifecycle state differs")
        binding.revalidate()
        workspace_names = _root_names(_WORKSPACE)
        binding.revalidate()
        if workspace_names is not None:
            raise BootstrapError("post-claim workspace state differs")
        binding.revalidate()
    finally:
        if owns_binding:
            binding.close()
    return claim


def _reviewed_module_name(relative_path: str) -> tuple[str, bool] | None:
    if not relative_path.startswith(_FIRST_PARTY_SOURCE_PREFIX):
        return None
    suffix = relative_path[len(_FIRST_PARTY_SOURCE_PREFIX) :]
    parts = Path(suffix).parts
    if not parts or not parts[-1].endswith(".py"):
        return None
    stem = Path(parts[-1]).stem
    if stem == "__init__":
        module_parts = parts[:-1]
        is_package = True
    else:
        module_parts = (*parts[:-1], stem)
        is_package = False
    if any(not part.isidentifier() for part in module_parts):
        raise BootstrapError("reviewed first-party module path is invalid")
    name = ".".join((_FIRST_PARTY_PACKAGE, *module_parts))
    return name, is_package


def _reject_alternate_first_party_imports(reviewed_sources: dict) -> None:
    package_directories = {
        Path(entry["source_path"]).parent for entry in reviewed_sources.values()
    }
    for directory in package_directories:
        pycache = directory / "__pycache__"
        if pycache.exists() or pycache.is_symlink():
            raise BootstrapError("alternate first-party import artifact exists")
    for entry in reviewed_sources.values():
        source_path = Path(entry["source_path"])
        candidates = [source_path.with_suffix(".pyc")]
        if entry["is_package"]:
            candidates.extend(
                source_path.parent.parent
                / f"{source_path.parent.name}{extension_suffix}"
                for extension_suffix in importlib.machinery.EXTENSION_SUFFIXES
            )
        else:
            candidates.extend(
                source_path.with_name(f"{source_path.stem}{extension_suffix}")
                for extension_suffix in importlib.machinery.EXTENSION_SUFFIXES
            )
        if any(
            candidate.exists() or candidate.is_symlink()
            for candidate in candidates
        ):
            raise BootstrapError("alternate first-party import artifact exists")


def _freeze_reviewed_first_party_sources(manifest: dict, repo: Path) -> dict:
    reviewed_sources = {}
    for item in manifest["in_scope_files"]:
        identity = _reviewed_module_name(item["path"])
        if identity is None:
            continue
        module_name, is_package = identity
        if module_name in reviewed_sources:
            raise BootstrapError("reviewed first-party module is duplicated")
        source_path = repo / item["path"]
        source_bytes, info = _read_file(source_path, "reviewed first-party source")
        if (
            info.st_nlink != 1
            or _hash_bytes(source_bytes) != item["sha256"]
        ):
            raise BootstrapError("reviewed first-party source bytes differ")
        reviewed_sources[module_name] = {
            "source_path": str(source_path),
            "source_bytes": source_bytes,
            "is_package": is_package,
            "sha256": item["sha256"],
        }
    if _FIRST_PARTY_PACKAGE not in reviewed_sources:
        raise BootstrapError("reviewed first-party package source is incomplete")
    _reject_alternate_first_party_imports(reviewed_sources)
    return reviewed_sources


def _install_reviewed_source_loader(
    manifest: dict,
    reviewed_sources: dict,
) -> None:
    for value in reversed(manifest["site_package_paths"]):
        if value not in sys.path:
            sys.path.insert(0, value)
    existing_finders = [
        finder
        for finder in sys.meta_path
        if getattr(finder, "_reviewed_source_loader_token", None)
        is _REVIEWED_SOURCE_LOADER_TOKEN
    ]
    existing_modules = [
        module
        for name, module in sys.modules.items()
        if name == _FIRST_PARTY_PACKAGE
        or name.startswith(f"{_FIRST_PARTY_PACKAGE}.")
    ]
    if existing_finders:
        if (
            len(existing_finders) != 1
            or not _exact_native_equal(
                existing_finders[0].reviewed_sources,
                reviewed_sources,
            )
            or any(
                getattr(
                    getattr(module, "__loader__", None),
                    "_reviewed_source_loader_token",
                    None,
                )
                is not _REVIEWED_SOURCE_LOADER_TOKEN
                for module in existing_modules
            )
        ):
            raise BootstrapError("reviewed first-party import state differs")
        return
    if existing_modules:
        raise BootstrapError("first-party module was imported outside reviewed loader")
    sys.meta_path.insert(0, _ReviewedSourceFinder(reviewed_sources))


def _execute_child(
    manifest: dict,
    authorization_path: Path,
    authorization_commit: str,
    repo: Path,
    reviewed_sources: dict,
    lifecycle_binding: _DirectoryBinding,
    workspace_binding: _DirectoryBinding,
) -> None:
    try:
        _revalidate_source_binding(manifest, authorization_commit, repo)
        _reject_alternate_first_party_imports(reviewed_sources)
        _install_reviewed_source_loader(manifest, reviewed_sources)
        from fluencytracr_inference import (
            vbd_trajectory_group_effect_marginalization_authorization as candidate,
        )

        def revalidate_roots() -> None:
            lifecycle_binding.revalidate()
            workspace_binding.revalidate()
            lifecycle_binding.revalidate()

        candidate._install_vbd_trajectory_group_effect_marginalization_root_guard(
            revalidate_roots,
            _bootstrap_token=(
                candidate._VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_BOOTSTRAP_CHILD_TOKEN
            ),
        )
        revalidate_roots()

        candidate.bootstrap_claimed_vbd_trajectory_group_effect_marginalization(
            manifest=manifest,
            authorization_path=authorization_path,
            authorization_commit=authorization_commit,
            command_argv=manifest["command_argv"],
            _bootstrap_token=(
                candidate._VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_BOOTSTRAP_CHILD_TOKEN
            ),
        )
    except BaseException as exc:
        payload = {
            "status": "HOLD",
            "phase": "claimed_execution",
            "error_type": type(exc).__name__,
        }
        os.write(2, _canonical_bytes(payload))
        os._exit(70)
    os._exit(0)


def _raise_supervisor_termination(signum: int, _frame) -> None:
    raise BootstrapError(f"marginalization supervisor interrupted by signal {signum}")


def _terminate_and_reap_child(child_pid: int) -> None:
    try:
        os.kill(child_pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    deadline = time.monotonic() + 10.0
    while True:
        try:
            pid, _status = os.waitpid(child_pid, os.WNOHANG)
        except ChildProcessError:
            return
        if pid == child_pid:
            return
        if time.monotonic() >= deadline:
            break
        time.sleep(0.05)
    try:
        os.kill(child_pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
    try:
        os.waitpid(child_pid, 0)
    except ChildProcessError:
        return


def _run_claimed_child(
    manifest: dict,
    authorization_path: Path,
    authorization_commit: str,
    repo: Path,
    reviewed_sources: dict,
    lifecycle_binding: _DirectoryBinding | None = None,
    workspace_binding: _DirectoryBinding | None = None,
) -> None:
    global _SUPERVISOR_ROOT_GUARD
    if _SUPERVISOR_ROOT_GUARD is not None:
        raise BootstrapError("claimed root supervisor is already active")

    def revalidate_roots() -> None:
        if lifecycle_binding is not None:
            lifecycle_binding.revalidate()
        if workspace_binding is not None:
            workspace_binding.revalidate()
        if lifecycle_binding is not None:
            lifecycle_binding.revalidate()

    revalidate_roots()
    _SUPERVISOR_ROOT_GUARD = revalidate_roots
    original_mask = signal.pthread_sigmask(
        signal.SIG_BLOCK,
        _TERMINATION_SIGNALS,
    )
    previous_handlers = {
        signum: signal.getsignal(signum) for signum in _TERMINATION_SIGNALS
    }
    child_pid = None
    child_reaped = False
    try:
        for signum in _TERMINATION_SIGNALS:
            signal.signal(signum, _raise_supervisor_termination)
        child_pid = os.fork()
        if child_pid == 0:
            try:
                if lifecycle_binding is None or workspace_binding is None:
                    raise BootstrapError("claimed root bindings are unavailable")
                for signum, handler in previous_handlers.items():
                    signal.signal(signum, handler)
                signal.pthread_sigmask(signal.SIG_SETMASK, original_mask)
                _execute_child(
                    manifest,
                    authorization_path,
                    authorization_commit,
                    repo,
                    reviewed_sources,
                    lifecycle_binding,
                    workspace_binding,
                )
            finally:
                os._exit(70)
        try:
            signal.pthread_sigmask(signal.SIG_SETMASK, original_mask)
            _wait_for_child(child_pid)
            child_reaped = True
            if lifecycle_binding is not None:
                lifecycle_binding.revalidate()
            if workspace_binding is not None:
                workspace_binding.revalidate()
            if lifecycle_binding is not None:
                lifecycle_binding.revalidate()
        finally:
            signal.pthread_sigmask(signal.SIG_BLOCK, _TERMINATION_SIGNALS)
            if not child_reaped:
                _terminate_and_reap_child(child_pid)
    finally:
        for signum, handler in previous_handlers.items():
            signal.signal(signum, handler)
        signal.pthread_sigmask(signal.SIG_SETMASK, original_mask)
        _SUPERVISOR_ROOT_GUARD = None


def _wait_for_child(child_pid: int) -> None:
    deadline = time.monotonic() + _TIMEOUT_SECONDS
    while True:
        if _SUPERVISOR_ROOT_GUARD is not None:
            _SUPERVISOR_ROOT_GUARD()
        pid, status = os.waitpid(child_pid, os.WNOHANG)
        if pid == child_pid:
            if not os.WIFEXITED(status) or os.WEXITSTATUS(status) != 0:
                raise BootstrapError("claimed marginalization child failed")
            return
        if time.monotonic() >= deadline:
            try:
                os.kill(child_pid, signal.SIGKILL)
            finally:
                os.waitpid(child_pid, 0)
            raise BootstrapError("claimed marginalization child exceeded compiled timeout")
        time.sleep(0.1)


def _validate_actual_command(manifest: dict) -> None:
    original = list(getattr(sys, "orig_argv", ()))
    expected = manifest["command_argv"]
    base_executable = getattr(sys, "_base_executable", None)
    if (
        not original
        or type(base_executable) is not str
        or os.path.realpath(base_executable) != expected[0]
        or os.path.realpath(sys.executable) != expected[0]
        or original[1:] != expected[1:]
    ):
        raise BootstrapError("actual bootstrap command differs")


def _revalidate_source_binding(
    manifest: dict,
    authorization_commit: str,
    repo: Path,
) -> None:
    _git_path, current_authorization = _validate_manifest(
        manifest,
        repo,
        Path(__file__).resolve(),
    )
    if current_authorization != authorization_commit:
        raise BootstrapError("post-run authorization commit differs")


def _validate_persisted(
    manifest: dict,
    authorization_commit: str,
    path: Path,
    repo: Path,
    *,
    allow_pending_alias: bool = False,
    reviewed_sources: dict,
) -> None:
    if type(reviewed_sources) is not dict or not reviewed_sources:
        raise BootstrapError("reviewed first-party source set is unavailable")
    _revalidate_source_binding(manifest, authorization_commit, repo)
    _reject_alternate_first_party_imports(reviewed_sources)
    _install_reviewed_source_loader(manifest, reviewed_sources)
    from fluencytracr_inference import (
        vbd_trajectory_group_effect_marginalization_authorization as candidate,
    )

    _revalidate_source_binding(manifest, authorization_commit, repo)
    publication_token = (
        candidate._VBD_TRAJECTORY_GROUP_EFFECT_MARGINALIZATION_PUBLICATION_TOKEN
        if allow_pending_alias
        else None
    )
    candidate.validate_vbd_trajectory_group_effect_marginalization_persisted_output(
        path,
        manifest=manifest,
        authorization_commit=authorization_commit,
        _publication_token=publication_token,
    )
    _revalidate_source_binding(manifest, authorization_commit, repo)


def _durably_preserve_staged_alias(
    root_fd: int,
    expected_identity: tuple[int, int],
) -> bool:
    try:
        final_info = os.stat(
            _OUTPUT_NAME, dir_fd=root_fd, follow_symlinks=False
        )
    except FileNotFoundError:
        return False
    except OSError as exc:
        raise BootstrapError("final-output rollback state cannot be inspected") from exc
    if (
        not stat.S_ISREG(final_info.st_mode)
        or (final_info.st_dev, final_info.st_ino) != expected_identity
    ):
        raise BootstrapError("final-output rollback identity differs")
    try:
        staged_info = os.stat(
            _STAGED_NAME, dir_fd=root_fd, follow_symlinks=False
        )
    except FileNotFoundError:
        try:
            os.link(
                _OUTPUT_NAME,
                _STAGED_NAME,
                src_dir_fd=root_fd,
                dst_dir_fd=root_fd,
                follow_symlinks=False,
            )
            staged_info = os.stat(
                _STAGED_NAME, dir_fd=root_fd, follow_symlinks=False
            )
            final_info = os.stat(
                _OUTPUT_NAME, dir_fd=root_fd, follow_symlinks=False
            )
        except OSError as exc:
            raise BootstrapError("staged rollback alias could not be restored") from exc
    except OSError as exc:
        raise BootstrapError("staged rollback alias cannot be inspected") from exc
    if (
        not stat.S_ISREG(staged_info.st_mode)
        or not stat.S_ISREG(final_info.st_mode)
        or (staged_info.st_dev, staged_info.st_ino) != expected_identity
        or (final_info.st_dev, final_info.st_ino) != expected_identity
        or staged_info.st_nlink < 2
        or final_info.st_nlink < 2
    ):
        raise BootstrapError("failed publication is not alias-invalid")
    try:
        os.fsync(root_fd)
        staged_after = os.stat(
            _STAGED_NAME, dir_fd=root_fd, follow_symlinks=False
        )
        final_after = os.stat(
            _OUTPUT_NAME, dir_fd=root_fd, follow_symlinks=False
        )
    except OSError as exc:
        raise BootstrapError("staged rollback alias could not be made durable") from exc
    if (
        not stat.S_ISREG(staged_after.st_mode)
        or not stat.S_ISREG(final_after.st_mode)
        or (staged_after.st_dev, staged_after.st_ino) != expected_identity
        or (final_after.st_dev, final_after.st_ino) != expected_identity
        or staged_after.st_nlink < 2
        or final_after.st_nlink < 2
    ):
        raise BootstrapError("durable staged rollback alias is invalid")
    return True


def _rollback_final(
    root_fd: int,
    expected_identity: tuple[int, int],
) -> None:
    try:
        if not _durably_preserve_staged_alias(root_fd, expected_identity):
            return
    except BootstrapError:
        try:
            final_info = os.stat(
                _OUTPUT_NAME,
                dir_fd=root_fd,
                follow_symlinks=False,
            )
            if (
                not stat.S_ISREG(final_info.st_mode)
                or (final_info.st_dev, final_info.st_ino) != expected_identity
            ):
                raise BootstrapError("fallback rollback identity differs")
            os.unlink(_OUTPUT_NAME, dir_fd=root_fd)
            os.fsync(root_fd)
            try:
                os.stat(_OUTPUT_NAME, dir_fd=root_fd, follow_symlinks=False)
            except FileNotFoundError:
                return
            raise BootstrapError("fallback rollback left final output present")
        except FileNotFoundError:
            return
        except BaseException as fallback_exc:
            try:
                marker_fd = os.open(
                    _STAGED_NAME,
                    os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
                    0o600,
                    dir_fd=root_fd,
                )
                try:
                    marker = b"ROLLBACK_UNCONFIRMED\n"
                    written = 0
                    while written < len(marker):
                        written += os.write(marker_fd, marker[written:])
                    os.fsync(marker_fd)
                finally:
                    os.close(marker_fd)
                os.fsync(root_fd)
            except BaseException:
                pass
            raise BootstrapError(
                "final-output fallback rollback could not be confirmed"
            ) from fallback_exc
    try:
        os.unlink(_OUTPUT_NAME, dir_fd=root_fd)
        os.fsync(root_fd)
    except FileNotFoundError:
        return
    except OSError as exc:
        raise BootstrapError("final-output rollback could not be confirmed") from exc
    try:
        os.stat(_OUTPUT_NAME, dir_fd=root_fd, follow_symlinks=False)
    except FileNotFoundError:
        staged_info = os.stat(
            _STAGED_NAME, dir_fd=root_fd, follow_symlinks=False
        )
        if (
            not stat.S_ISREG(staged_info.st_mode)
            or (staged_info.st_dev, staged_info.st_ino) != expected_identity
            or staged_info.st_nlink != 1
        ):
            raise BootstrapError("staged rollback identity differs")
        return
    except OSError as exc:
        raise BootstrapError("final-output rollback could not be confirmed") from exc
    raise BootstrapError("final output remained after rollback")


def _publish(
    manifest: dict,
    authorization_commit: str,
    repo: Path,
    reviewed_sources: dict,
    workspace_binding: _DirectoryBinding | None = None,
    lifecycle_binding: _DirectoryBinding | None = None,
) -> None:
    staged = _WORKSPACE / _STAGED_NAME
    final = _WORKSPACE / _OUTPUT_NAME
    binding = workspace_binding or _DirectoryBinding(_WORKSPACE)
    owns_binding = workspace_binding is None
    try:
        if lifecycle_binding is not None:
            lifecycle_binding.revalidate()
        if binding.names() != (_STAGED_NAME,):
            raise BootstrapError("staged marginalization workspace is off plan")
        binding.revalidate()
        if lifecycle_binding is not None:
            lifecycle_binding.revalidate()
        _validate_persisted(
            manifest,
            authorization_commit,
            staged,
            repo,
            reviewed_sources=reviewed_sources,
        )
        binding.revalidate()
    except BaseException:
        if owns_binding:
            binding.close()
        raise
    root_fd = binding.root_fd
    linked = False
    committed = False
    publication_identity = None
    original_mask = signal.pthread_sigmask(
        signal.SIG_BLOCK,
        _TERMINATION_SIGNALS,
    )
    previous_handlers = {
        signum: signal.getsignal(signum) for signum in _TERMINATION_SIGNALS
    }
    try:
        for signum in _TERMINATION_SIGNALS:
            signal.signal(signum, _raise_supervisor_termination)
        staged_info = os.stat(
            _STAGED_NAME, dir_fd=root_fd, follow_symlinks=False
        )
        if (
            not stat.S_ISREG(staged_info.st_mode)
            or staged_info.st_nlink != 1
        ):
            raise BootstrapError("staged publication identity differs")
        publication_identity = (staged_info.st_dev, staged_info.st_ino)
        os.link(
            _STAGED_NAME,
            _OUTPUT_NAME,
            src_dir_fd=root_fd,
            dst_dir_fd=root_fd,
            follow_symlinks=False,
        )
        linked = True
        os.fsync(root_fd)
        staged_info = os.stat(
            _STAGED_NAME, dir_fd=root_fd, follow_symlinks=False
        )
        final_info = os.stat(
            _OUTPUT_NAME, dir_fd=root_fd, follow_symlinks=False
        )
        if (
            not stat.S_ISREG(staged_info.st_mode)
            or not stat.S_ISREG(final_info.st_mode)
            or (staged_info.st_dev, staged_info.st_ino) != publication_identity
            or (final_info.st_dev, final_info.st_ino) != publication_identity
            or staged_info.st_nlink != 2
            or final_info.st_nlink != 2
        ):
            raise BootstrapError("pending publication alias differs")
        binding.revalidate()
        if lifecycle_binding is not None:
            lifecycle_binding.revalidate()
        _validate_persisted(
            manifest,
            authorization_commit,
            final,
            repo,
            allow_pending_alias=True,
            reviewed_sources=reviewed_sources,
        )
        binding.revalidate()
        if lifecycle_binding is not None:
            lifecycle_binding.revalidate()
        os.unlink(_STAGED_NAME, dir_fd=root_fd)
        os.fsync(root_fd)
        final_info = os.stat(
            _OUTPUT_NAME, dir_fd=root_fd, follow_symlinks=False
        )
        if (
            not stat.S_ISREG(final_info.st_mode)
            or (final_info.st_dev, final_info.st_ino) != publication_identity
            or final_info.st_nlink != 1
        ):
            raise BootstrapError("final publication link count differs")
        if binding.names() != (_OUTPUT_NAME,):
            raise BootstrapError("final marginalization workspace is off plan")
        binding.revalidate()
        if lifecycle_binding is not None:
            lifecycle_binding.revalidate()
        _validate_persisted(
            manifest,
            authorization_commit,
            final,
            repo,
            reviewed_sources=reviewed_sources,
        )
        binding.revalidate()
        final_info = os.stat(
            _OUTPUT_NAME, dir_fd=root_fd, follow_symlinks=False
        )
        if (
            not stat.S_ISREG(final_info.st_mode)
            or (final_info.st_dev, final_info.st_ino) != publication_identity
            or final_info.st_nlink != 1
        ):
            raise BootstrapError("final publication identity changed")
        os.fsync(root_fd)
        binding.revalidate()
        signal.pthread_sigmask(signal.SIG_SETMASK, original_mask)
        signal.pthread_sigmask(signal.SIG_BLOCK, _TERMINATION_SIGNALS)
        committed = True
    except BaseException:
        signal.pthread_sigmask(signal.SIG_BLOCK, _TERMINATION_SIGNALS)
        if linked and not committed and publication_identity is not None:
            _rollback_final(root_fd, publication_identity)
        raise
    finally:
        signal.pthread_sigmask(signal.SIG_BLOCK, _TERMINATION_SIGNALS)
        for signum, handler in previous_handlers.items():
            signal.signal(signum, handler)
        if owns_binding:
            binding.close()
        signal.pthread_sigmask(signal.SIG_SETMASK, original_mask)


def _run(authorization_path: Path) -> int:
    _validate_environment()
    script = Path(__file__).resolve()
    repo = script.parents[2]
    manifest_path = repo / _MANIFEST_RELATIVE_PATH
    manifest, manifest_info = _read_json(manifest_path, "authorization manifest")
    if manifest_info.st_nlink != 1:
        raise BootstrapError("authorization manifest link count is unsafe")
    _git_path, authorization_commit = _validate_manifest(manifest, repo, script)
    _validate_actual_command(manifest)
    authorization, permit, permit_info, lifecycle_binding = _validate_launch_records(
        manifest,
        authorization_commit,
        authorization_path,
    )
    workspace_binding = None
    try:
        reviewed_sources = _freeze_reviewed_first_party_sources(manifest, repo)
        _consume_permit_and_claim(
            manifest,
            authorization_commit,
            authorization,
            permit,
            permit_info,
            lifecycle_binding,
        )
        lifecycle_binding.revalidate()
        workspace_binding = _create_directory_binding(_WORKSPACE)
        lifecycle_binding.revalidate()
        workspace_binding.revalidate()
        _run_claimed_child(
            manifest,
            authorization_path,
            authorization_commit,
            repo,
            reviewed_sources,
            lifecycle_binding,
            workspace_binding,
        )
        lifecycle_binding.revalidate()
        workspace_binding.revalidate()
        _publish(
            manifest,
            authorization_commit,
            repo,
            reviewed_sources,
            workspace_binding,
            lifecycle_binding,
        )
        lifecycle_binding.revalidate()
        workspace_binding.revalidate()
    finally:
        if workspace_binding is not None:
            workspace_binding.close()
        lifecycle_binding.close()
    payload = {
        "status": "COMPLETE_PERMANENT_HOLD",
        "authorization_commit": authorization_commit,
        "output_path": str(_WORKSPACE / _OUTPUT_NAME),
    }
    try:
        os.write(1, _canonical_bytes(payload))
    except OSError:
        pass
    return 0


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(add_help=False)
    subparsers = parser.add_subparsers(dest="command", required=True)
    run = subparsers.add_parser("run", add_help=False)
    run.add_argument("--execution-authorization", required=True)
    return parser


def main(argv: list[str] | None = None) -> int:
    try:
        arguments = _parser().parse_args(argv)
        if arguments.command != "run":
            raise BootstrapError("unsupported bootstrap command")
        authorization_path = _strict_path(
            arguments.execution_authorization,
            "execution authorization",
        )
        return _run(authorization_path)
    except BaseException as exc:
        payload = {
            "status": "HOLD",
            "phase": "bootstrap",
            "error_type": type(exc).__name__,
        }
        os.write(2, _canonical_bytes(payload))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
