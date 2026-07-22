#!/usr/bin/env python3
"""Isolated stdlib bootstrap for the one-shot VBD precision diagnostic."""

from __future__ import annotations

import argparse
import hashlib
import importlib.abc
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
from datetime import datetime


MANIFEST_RELATIVE_PATH = (
    "inference/evidence/vbd_trajectory_precision_diagnostic_authorization.json"
)
MANIFEST_SCHEMA = (
    "FT_AI_VALUE_VBD_PRECISION_DIAGNOSTIC_AUTHORIZATION_MANIFEST_2026_07_V1"
)
TARGET_MODULE = (
    "fluencytracr_inference.vbd_trajectory_precision_diagnostic_authorization"
)
TARGET_FUNCTION = "bootstrap_claimed_vbd_precision_diagnostic"
FAILURE_SCHEMA = "FT_AI_VALUE_VBD_PRECISION_DIAGNOSTIC_BOOTSTRAP_FAILURE_2026_07_V1"
EXECUTION_AUTHORIZATION_SCHEMA = (
    "FT_AI_VALUE_VBD_PRECISION_DIAGNOSTIC_EXECUTION_AUTHORIZATION_2026_07_V1"
)
CLAIM_SCHEMA = "FT_AI_VALUE_VBD_PRECISION_DIAGNOSTIC_ATTEMPT_CLAIM_2026_07_V1"
AUTHORIZATION_SCOPE = "vbd_precision_design_diagnostic_v1_nonacceptance_one_launch"
CLAIM_FILENAME = "attempt_claim.json"
STAGED_OUTPUT_FILENAME = "diagnostic.staged.json"
TIMEOUT_SECONDS = 7_200
THREAD_ENV_KEYS = (
    "MKL_NUM_THREADS",
    "NUMEXPR_NUM_THREADS",
    "OMP_NUM_THREADS",
    "OPENBLAS_NUM_THREADS",
    "VECLIB_MAXIMUM_THREADS",
)
_COMMIT_RE = re.compile(r"^[0-9a-f]{40}$")
_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
_DECISION_REF_RE = re.compile(
    r"^human-authorization:vbd-mcse-diagnostic/[A-Za-z0-9._-]+$"
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
    "external_claim_root_path",
    "external_claim_root_identity_hash",
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


class BootstrapError(RuntimeError):
    pass


def _strict_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise BootstrapError("duplicate JSON key")
        result[key] = value
    return result


def _read_json(path: Path):
    try:
        if path.is_symlink() or not path.is_file():
            raise BootstrapError("JSON path is unsafe")
        return json.loads(
            path.read_text(encoding="utf-8"), object_pairs_hook=_strict_object
        )
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise BootstrapError("JSON input is invalid") from exc


def _canonical_bytes(value) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    ).encode("utf-8")


def _sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _file_sha256(path: Path) -> str:
    try:
        if path.is_symlink() or not path.is_file():
            raise BootstrapError("file is unsafe")
        return _sha256_bytes(path.read_bytes())
    except OSError as exc:
        raise BootstrapError("file cannot be hashed") from exc


def _git(git_path: str, repo_root: Path, *args: str, text: bool = False):
    environment = {
        "HOME": os.devnull,
        "PATH": str(Path(git_path).parent),
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": os.devnull,
        "LC_ALL": "C",
    }
    command = (
        git_path,
        "-c",
        "core.fsmonitor=false",
        "-c",
        "core.untrackedCache=false",
        "-c",
        f"core.hooksPath={os.devnull}",
        "-C",
        str(repo_root),
        f"--work-tree={repo_root}",
        *args,
    )
    try:
        completed = subprocess.run(
            command,
            cwd="/",
            env=environment,
            check=True,
            capture_output=True,
            text=text,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        raise BootstrapError("Git identity is unavailable") from exc
    return completed.stdout.strip() if text else completed.stdout


def _validate_manifest_shape(manifest: object) -> dict:
    if type(manifest) is not dict or set(manifest) != _MANIFEST_KEYS:
        raise BootstrapError("manifest shape is invalid")
    body = {key: value for key, value in manifest.items() if key != "manifest_hash"}
    if (
        manifest["schema_version"] != MANIFEST_SCHEMA
        or type(manifest["manifest_hash"]) is not str
        or manifest["manifest_hash"] != _sha256_bytes(_canonical_bytes(body))
        or manifest["execution_state"] != "NOT_RUN"
        or manifest["internal_only"] is not True
        or manifest["synthetic_only"] is not True
        or manifest["aggregate_only"] is not True
        or manifest["customer_output_authorized"] is not False
        or manifest["acceptance_complete"] is not False
        or manifest["task_2_6_complete"] is not False
        or manifest["task_5_6_complete"] is not False
    ):
        raise BootstrapError("manifest self-hash is invalid")
    return manifest


def _strict_sha256(value: object, label: str) -> str:
    if type(value) is not str or _SHA256_RE.fullmatch(value) is None:
        raise BootstrapError(f"{label} is invalid")
    return value


def _validate_execution_authorization(
    value: object, *, manifest: dict, authorization_commit: str
) -> dict:
    expected = {
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
        "command_hash",
        "execution_authorization_hash",
    }
    if type(value) is not dict or set(value) != expected:
        raise BootstrapError("execution authorization shape is invalid")
    body = {
        key: item
        for key, item in value.items()
        if key != "execution_authorization_hash"
    }
    try:
        datetime.strptime(value["authorized_at_utc"], "%Y-%m-%dT%H:%M:%SZ")
    except (TypeError, ValueError) as exc:
        raise BootstrapError("execution authorization timestamp is invalid") from exc
    if (
        _COMMIT_RE.fullmatch(authorization_commit) is None
        or value["schema_version"] != EXECUTION_AUTHORIZATION_SCHEMA
        or value["authorization_commit"] != authorization_commit
        or value["authorization_manifest_hash"] != manifest["manifest_hash"]
        or value["scope"] != AUTHORIZATION_SCOPE
        or type(value["authorizing_decision_ref"]) is not str
        or _DECISION_REF_RE.fullmatch(value["authorizing_decision_ref"]) is None
        or _strict_sha256(value["decision_text_hash"], "decision text hash")
        != value["decision_text_hash"]
        or type(value["maximum_launch_count"]) is not int
        or value["maximum_launch_count"] != 1
        or value["canonical_workspace_identity"]
        != manifest["canonical_workspace_identity_hash"]
        or value["external_claim_root_identity"]
        != manifest["external_claim_root_identity_hash"]
        or value["command_hash"] != manifest["command_hash"]
        or value["execution_authorization_hash"]
        != _sha256_bytes(_canonical_bytes(body))
    ):
        raise BootstrapError("execution authorization is invalid")
    return value


def _claim_body(
    *, manifest: dict, execution_authorization: dict, authorization_commit: str
) -> dict:
    return {
        "schema_version": CLAIM_SCHEMA,
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
        "diagnostic_plan_hash": manifest["diagnostic_plan_hash"],
        "seed_manifest_hash": manifest["seed_manifest_hash"],
        "maximum_launch_count": 1,
        "state": "CONSUMED_BEFORE_EXECUTION",
    }


def _consume_claim(
    *, manifest: dict, execution_authorization: dict, authorization_commit: str
) -> dict:
    claim_root = Path(manifest["external_claim_root_path"])
    if (
        not claim_root.is_absolute()
        or claim_root != Path(os.path.normpath(str(claim_root)))
        or _sha256_bytes(_canonical_bytes(str(claim_root)))
        != manifest["external_claim_root_identity_hash"]
    ):
        raise BootstrapError("claim root identity is invalid")
    try:
        claim_root.mkdir(mode=0o700, parents=False, exist_ok=True)
        opened = claim_root.lstat()
        if claim_root.is_symlink() or not stat.S_ISDIR(opened.st_mode):
            raise BootstrapError("claim root is unsafe")
        os.chmod(claim_root, 0o700)
        root_fd = os.open(
            claim_root, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
        )
    except OSError as exc:
        raise BootstrapError("claim root is unavailable") from exc
    body = _claim_body(
        manifest=manifest,
        execution_authorization=execution_authorization,
        authorization_commit=authorization_commit,
    )
    claim = {**body, "claim_hash": _sha256_bytes(_canonical_bytes(body))}
    descriptor = -1
    try:
        descriptor = os.open(
            CLAIM_FILENAME,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
            0o600,
            dir_fd=root_fd,
        )
        encoded = _canonical_bytes(claim) + b"\n"
        written = 0
        while written < len(encoded):
            written += os.write(descriptor, encoded[written:])
        os.fsync(descriptor)
        os.fsync(root_fd)
    except OSError as exc:
        raise BootstrapError("claim already exists or could not be written") from exc
    finally:
        if descriptor >= 0:
            os.close(descriptor)
        os.close(root_fd)
    return claim


class _FrozenLoader(importlib.abc.Loader):
    def __init__(self, modules: dict, fullname: str):
        self.modules = modules
        self.fullname = fullname

    def create_module(self, spec):
        return None

    def exec_module(self, module):
        source, path, is_package = self.modules[self.fullname]
        module.__file__ = path
        if is_package:
            module.__path__ = []
        code = compile(source, path, "exec", dont_inherit=True, optimize=0)
        exec(code, module.__dict__)


class _FrozenFinder(importlib.abc.MetaPathFinder):
    def __init__(self, modules: dict):
        self.modules = modules

    def find_spec(self, fullname, path=None, target=None):
        if fullname in self.modules:
            return importlib.util.spec_from_loader(
                fullname,
                _FrozenLoader(self.modules, fullname),
                is_package=self.modules[fullname][2],
            )
        if fullname.startswith("fluencytracr_inference"):
            raise ImportError("module is absent from reviewed diagnostic source")
        return None


def _reviewed_source_modules(
    manifest: dict, repo_root: Path
) -> tuple[dict, str]:
    git_path = manifest["git_executable_path"]
    if (
        type(git_path) is not str
        or not Path(git_path).is_absolute()
        or _file_sha256(Path(git_path)) != manifest["git_executable_sha256"]
    ):
        raise BootstrapError("Git executable binding is invalid")
    head = _git(git_path, repo_root, "rev-parse", "HEAD", text=True)
    status = _git(
        git_path,
        repo_root,
        "status",
        "--porcelain=v1",
        "--untracked-files=all",
        text=True,
    )
    parents = _git(
        git_path, repo_root, "rev-list", "--parents", "-n", "1", head, text=True
    ).split()
    changed = _git(
        git_path,
        repo_root,
        "diff-tree",
        "--no-commit-id",
        "--name-only",
        "-r",
        manifest["implementation_commit"],
        head,
        text=True,
    ).splitlines()
    if (
        status
        or parents != [head, manifest["implementation_commit"]]
        or changed != [MANIFEST_RELATIVE_PATH]
        or _git(
            git_path,
            repo_root,
            "rev-parse",
            f"{manifest['implementation_commit']}^{{tree}}",
            text=True,
        )
        != manifest["implementation_tree"]
    ):
        raise BootstrapError("authorization checkout is not clean sole-child A")
    modules = {}
    files = manifest["in_scope_files"]
    if type(files) is not list or not files:
        raise BootstrapError("reviewed source set is empty")
    for item in files:
        if type(item) is not dict or set(item) != {"path", "sha256"}:
            raise BootstrapError("reviewed source entry is invalid")
        relative = item["path"]
        if type(relative) is not str or relative.startswith("/") or ".." in Path(relative).parts:
            raise BootstrapError("reviewed source path is unsafe")
        source = _git(
            git_path,
            repo_root,
            "show",
            f"{manifest['implementation_commit']}:{relative}",
        )
        if _sha256_bytes(source) != item["sha256"]:
            raise BootstrapError("reviewed source hash differs")
        if not relative.startswith("inference/src/") or not relative.endswith(".py"):
            continue
        module_name = relative.removeprefix("inference/src/").removesuffix(".py").replace(
            "/", "."
        )
        is_package = module_name.endswith(".__init__")
        if is_package:
            module_name = module_name.removesuffix(".__init__")
        if module_name in modules:
            raise BootstrapError("reviewed module is duplicated")
        modules[module_name] = (source, str(repo_root / relative), is_package)
    if TARGET_MODULE not in modules or "fluencytracr_inference" not in modules:
        raise BootstrapError("diagnostic target is absent from reviewed source")
    return modules, head


def _configure_numerical_environment() -> None:
    for key in THREAD_ENV_KEYS:
        os.environ[key] = "1"


def _install_reviewed_source(modules: dict, manifest: dict) -> None:
    site_paths = manifest["site_package_paths"]
    if (
        type(site_paths) is not list
        or not site_paths
        or site_paths != sorted(site_paths)
        or len(set(site_paths)) != len(site_paths)
    ):
        raise BootstrapError("site-package path set is invalid")
    for path in site_paths:
        if (
            type(path) is not str
            or not Path(path).is_absolute()
            or not Path(path).is_dir()
        ):
            raise BootstrapError("site-package path is unavailable")
    sys.path.extend(site_paths)
    sys.meta_path.insert(0, _FrozenFinder(modules))


def _execute_claimed_child(
    *,
    modules: dict,
    manifest: dict,
    authorization_path: Path,
    authorization_commit: str,
    command_argv: list[str],
) -> None:
    try:
        _configure_numerical_environment()
        _install_reviewed_source(modules, manifest)
        module = __import__(TARGET_MODULE, fromlist=[TARGET_FUNCTION])
        function = getattr(module, TARGET_FUNCTION)
        bootstrap_token = getattr(
            module, "_VBD_PRECISION_DIAGNOSTIC_BOOTSTRAP_CHILD_TOKEN"
        )
        function(
            manifest=manifest,
            authorization_path=authorization_path,
            authorization_commit=authorization_commit,
            command_argv=command_argv,
            _bootstrap_token=bootstrap_token,
        )
    except BaseException:
        os._exit(2)
    os._exit(0)


def _wait_for_claimed_child(child_pid: int) -> None:
    deadline = time.monotonic() + TIMEOUT_SECONDS
    while True:
        try:
            waited_pid, status_value = os.waitpid(child_pid, os.WNOHANG)
        except InterruptedError:
            continue
        if waited_pid == child_pid:
            if not os.WIFEXITED(status_value) or os.WEXITSTATUS(status_value) != 0:
                raise BootstrapError("diagnostic child failed")
            return
        if time.monotonic() >= deadline:
            try:
                os.kill(child_pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            while True:
                try:
                    os.waitpid(child_pid, 0)
                    break
                except InterruptedError:
                    continue
                except ChildProcessError:
                    break
            raise BootstrapError("diagnostic child exceeded the compiled timeout")
        time.sleep(0.25)


def _open_output_workspace(manifest: dict) -> tuple[int, Path]:
    workspace = Path(manifest["canonical_workspace_path"])
    output = Path(manifest["output_path"])
    if (
        not workspace.is_absolute()
        or workspace != Path(os.path.normpath(str(workspace)))
        or output.parent != workspace
        or output.name != "diagnostic.json"
    ):
        raise BootstrapError("diagnostic output path is off-plan")
    try:
        opened = workspace.lstat()
        if workspace.is_symlink() or not stat.S_ISDIR(opened.st_mode):
            raise BootstrapError("diagnostic output workspace is unsafe")
        return (
            os.open(workspace, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW),
            output,
        )
    except OSError as exc:
        raise BootstrapError("diagnostic output workspace is unavailable") from exc


def _remove_staged_output(manifest: dict) -> None:
    workspace = Path(manifest["canonical_workspace_path"])
    if not workspace.exists() or workspace.is_symlink() or not workspace.is_dir():
        return
    workspace_fd = os.open(
        workspace, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
    )
    try:
        try:
            os.unlink(STAGED_OUTPUT_FILENAME, dir_fd=workspace_fd)
        except FileNotFoundError:
            return
        os.fsync(workspace_fd)
    finally:
        os.close(workspace_fd)


def _read_canonical_staged_output(workspace_fd: int) -> object:
    try:
        info = os.stat(
            STAGED_OUTPUT_FILENAME,
            dir_fd=workspace_fd,
            follow_symlinks=False,
        )
        if not stat.S_ISREG(info.st_mode) or info.st_size > 4 * 1024 * 1024:
            raise BootstrapError("diagnostic staged output is unsafe")
        descriptor = os.open(
            STAGED_OUTPUT_FILENAME,
            os.O_RDONLY | os.O_NOFOLLOW,
            dir_fd=workspace_fd,
        )
    except OSError as exc:
        raise BootstrapError("diagnostic staged output is unavailable") from exc
    try:
        chunks = []
        remaining = info.st_size + 1
        while remaining > 0:
            chunk = os.read(descriptor, min(remaining, 64 * 1024))
            if not chunk:
                break
            chunks.append(chunk)
            remaining -= len(chunk)
        encoded = b"".join(chunks)
    finally:
        os.close(descriptor)
    try:
        value = json.loads(
            encoded.decode("utf-8"), object_pairs_hook=_strict_object
        )
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise BootstrapError("diagnostic staged output is invalid") from exc
    if encoded != _canonical_bytes(value) + b"\n":
        raise BootstrapError("diagnostic staged output is noncanonical")
    return value


def _publish_staged_output(manifest: dict) -> object:
    workspace_fd, output = _open_output_workspace(manifest)
    try:
        value = _read_canonical_staged_output(workspace_fd)
        try:
            os.link(
                STAGED_OUTPUT_FILENAME,
                output.name,
                src_dir_fd=workspace_fd,
                dst_dir_fd=workspace_fd,
                follow_symlinks=False,
            )
            os.fsync(workspace_fd)
        except OSError as exc:
            try:
                os.unlink(output.name, dir_fd=workspace_fd)
                os.fsync(workspace_fd)
            except OSError:
                pass
            raise BootstrapError("diagnostic final output could not be published") from exc
        try:
            os.unlink(STAGED_OUTPUT_FILENAME, dir_fd=workspace_fd)
            os.fsync(workspace_fd)
        except OSError:
            pass
        return value
    finally:
        os.close(workspace_fd)


def _supervise_and_publish(child_pid: int, manifest: dict) -> object:
    try:
        _wait_for_claimed_child(child_pid)
    except BaseException:
        _remove_staged_output(manifest)
        raise
    try:
        return _publish_staged_output(manifest)
    except BaseException:
        _remove_staged_output(manifest)
        raise


def _run(authorization_path: Path) -> int:
    if (
        sys.flags.isolated != 1
        or sys.flags.no_site != 1
        or sys.dont_write_bytecode is not True
    ):
        raise BootstrapError("bootstrap requires isolated -I -S -B Python")
    script = Path(__file__).resolve()
    repo_root = script.parents[2]
    manifest_path = repo_root / MANIFEST_RELATIVE_PATH
    manifest = _validate_manifest_shape(_read_json(manifest_path))
    expected_command = manifest["command_argv"]
    actual_command = [os.path.realpath(sys.executable), *sys.orig_argv[1:]]
    if (
        script != Path(manifest["bootstrap_path"])
        or _file_sha256(script) != manifest["bootstrap_sha256"]
        or str(authorization_path) != manifest["execution_authorization_record_path"]
        or actual_command != expected_command
        or manifest["command_hash"] != _sha256_bytes(_canonical_bytes(expected_command))
    ):
        raise BootstrapError("bootstrap path, bytes, or argv differ from manifest")
    if (
        not authorization_path.is_absolute()
        or str(authorization_path)
        != manifest["execution_authorization_record_path"]
    ):
        raise BootstrapError("execution authorization path is off-plan")
    modules, authorization_commit = _reviewed_source_modules(manifest, repo_root)
    execution_authorization = _validate_execution_authorization(
        _read_json(authorization_path),
        manifest=manifest,
        authorization_commit=authorization_commit,
    )
    _consume_claim(
        manifest=manifest,
        execution_authorization=execution_authorization,
        authorization_commit=authorization_commit,
    )
    try:
        child_pid = os.fork()
    except OSError as exc:
        raise BootstrapError("diagnostic child could not start") from exc
    if child_pid == 0:
        _execute_claimed_child(
            modules=modules,
            manifest=manifest,
            authorization_path=authorization_path,
            authorization_commit=authorization_commit,
            command_argv=actual_command,
        )
    record = _supervise_and_publish(child_pid, manifest)
    sys.stdout.buffer.write(_canonical_bytes(record) + b"\n")
    sys.stdout.buffer.flush()
    return 0


def _emit_failure(phase: str, exc: BaseException) -> None:
    allowed = {
        BootstrapError,
        ImportError,
        ModuleNotFoundError,
        OSError,
        RuntimeError,
        TypeError,
        ValueError,
    }
    body = {
        "schema_version": FAILURE_SCHEMA,
        "state": "HOLD",
        "failure_phase": phase,
        "failure_category": (
            type(exc).__name__ if type(exc) in allowed else "UNCLASSIFIED_EXCEPTION"
        ),
    }
    value = {**body, "diagnostic_hash": _sha256_bytes(_canonical_bytes(body))}
    try:
        sys.stderr.buffer.write(_canonical_bytes(value) + b"\n")
        sys.stderr.buffer.flush()
    except BaseException:
        pass


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Run the authorized non-evidentiary VBD precision diagnostic."
    )
    commands = parser.add_subparsers(dest="command", required=True)
    run = commands.add_parser("run")
    run.add_argument("--execution-authorization", required=True)
    args = parser.parse_args(argv)
    try:
        return _run(Path(args.execution_authorization))
    except BaseException as exc:
        _emit_failure("authorization_or_execution", exc)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
