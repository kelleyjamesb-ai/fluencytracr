"""Hardened resumable execution for the fixed measurement calibration proof."""

from __future__ import annotations

from datetime import datetime, timezone
from contextlib import contextmanager
from dataclasses import dataclass, field
import fcntl
from functools import lru_cache
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import platform
import re
import secrets
import subprocess
import sys
import sysconfig
import threading

import numpy as np
from threadpoolctl import threadpool_info, threadpool_limits

from .ai_fluency_measurement_calibration import (
    MEASUREMENT_FULL_REPLICATIONS_PER_SCENARIO,
    MEASUREMENT_STUDY_BASE_SEED,
    MeasurementCalibrationSlotResult,
    MeasurementCalibrationStudy,
    _build_execution_verification_from_recomputed_results,
    assemble_measurement_calibration_study,
    measurement_calibration_slot_result_from_dict,
    run_measurement_calibration_slot,
)
from .ai_fluency_measurement_calibration_artifact import (
    _emit_measurement_calibration_artifact_from_execution_verification,
)
from .ai_fluency_measurement_synthetic import (
    MEASUREMENT_SYNTHETIC_SAMPLE_SIZE,
    MEASUREMENT_SYNTHETIC_SCENARIOS,
)
from .hashing import sha256_json


MEASUREMENT_CALIBRATION_RESUMABLE_PLAN_VERSION = (
    "FT_AI_FLUENCY_MEASUREMENT_CALIBRATION_RESUMABLE_2026_07_V1"
)
MEASUREMENT_CALIBRATION_REPLICATION_INDEXES_PER_CHUNK = 10
MEASUREMENT_CALIBRATION_CHUNK_COUNT = 20
MEASUREMENT_CALIBRATION_SLOTS_PER_CHUNK = 40
MEASUREMENT_CALIBRATION_REQUIRED_SLOT_COUNT = 800
MEASUREMENT_CALIBRATION_PHASES = ("primary", "recompute")
_CHECKPOINT_SCHEMA_VERSION = (
    "FT_AI_FLUENCY_MEASUREMENT_CALIBRATION_CHECKPOINT_2026_07_V1"
)
_PHASE_SCHEMA_VERSION = (
    "FT_AI_FLUENCY_MEASUREMENT_CALIBRATION_PHASE_2026_07_V1"
)
_CHUNK_SCHEMA_VERSION = (
    "FT_AI_FLUENCY_MEASUREMENT_CALIBRATION_CHUNK_2026_07_V1"
)
_COMMIT_RE = re.compile(r"^[0-9a-f]{40}$")
_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
_PROCESS_TOKEN_RE = re.compile(r"^[0-9a-f]{32}$")
_PROCESS_RUN_TOKEN = secrets.token_hex(16)
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
_RUNNER_SOURCE_PATHS = (
    "inference/pyproject.toml",
    "inference/src/fluencytracr_inference/__init__.py",
    "inference/src/fluencytracr_inference/ai_fluency_long_v1_manifest.json",
    "inference/src/fluencytracr_inference/ai_fluency_measurement_calibration.py",
    "inference/src/fluencytracr_inference/ai_fluency_measurement_calibration_artifact.py",
    "inference/src/fluencytracr_inference/ai_fluency_measurement_calibration_resumable.py",
    "inference/src/fluencytracr_inference/ai_fluency_measurement_calibration_resumable_cli.py",
    "inference/src/fluencytracr_inference/ai_fluency_measurement_diagnostics.py",
    "inference/src/fluencytracr_inference/ai_fluency_measurement_evidence.py",
    "inference/src/fluencytracr_inference/ai_fluency_measurement_manifest.py",
    "inference/src/fluencytracr_inference/ai_fluency_measurement_synthetic.py",
    "inference/src/fluencytracr_inference/ai_fluency_ordinal_measurement.py",
    "inference/src/fluencytracr_inference/hashing.py",
)


class MeasurementCalibrationWorkspaceError(RuntimeError):
    """A checkpoint workspace is incomplete, stale, or unsafe."""


_FRESH_RECOMPUTATION_TOKEN = object()


@dataclass(frozen=True)
class _FreshRecomputationExecution:
    result: MeasurementCalibrationSlotResult
    attestation: dict
    _runner_token: object = field(repr=False, compare=False)


def _run_fresh_recomputation_slot(
    *, scenario: str, replication_index: int
) -> _FreshRecomputationExecution:
    started_at = datetime.now(timezone.utc).isoformat()
    challenge = secrets.token_hex(16)
    with threadpool_limits(limits=1):
        result = run_measurement_calibration_slot(
            scenario=scenario, replication_index=replication_index
        )
    body = {
        "attestation_version": "fresh_recomputation_v1",
        "slot_id": _slot_id(scenario, replication_index),
        "result_hash": result.result_hash,
        "process_run_token": _PROCESS_RUN_TOKEN,
        "execution_challenge": challenge,
        "started_at": started_at,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }
    return _FreshRecomputationExecution(
        result=result,
        attestation={**body, "attestation_hash": sha256_json(body)},
        _runner_token=_FRESH_RECOMPUTATION_TOKEN,
    )


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


@lru_cache(maxsize=1)
def _native_binary_manifest_hash() -> str:
    files = [
        {
            "component": "python_executable",
            "path": Path(sys.executable).resolve().name,
            "sha256": _file_sha256(Path(sys.executable).resolve()),
        }
    ]
    for package in (np, __import__("scipy")):
        package_root = Path(package.__file__).resolve().parent
        for path in sorted(package_root.rglob("*")):
            if path.is_file() and path.suffix in {".so", ".dylib"}:
                files.append(
                    {
                        "component": package.__name__,
                        "path": path.relative_to(package_root).as_posix(),
                        "sha256": _file_sha256(path),
                    }
                )
    return sha256_json(files)


def _slot_id(scenario: str, replication_index: int) -> str:
    return f"{scenario}__rep_{replication_index:03d}"


def required_measurement_calibration_slot_keys() -> tuple[tuple[str, int, int], ...]:
    slots = tuple(
        (
            scenario,
            replication_index,
            MEASUREMENT_STUDY_BASE_SEED
            + MEASUREMENT_SYNTHETIC_SCENARIOS.index(scenario) * 100_000
            + replication_index,
        )
        for scenario in MEASUREMENT_SYNTHETIC_SCENARIOS
        for replication_index in range(MEASUREMENT_FULL_REPLICATIONS_PER_SCENARIO)
    )
    if len(slots) != MEASUREMENT_CALIBRATION_REQUIRED_SLOT_COUNT:
        raise AssertionError("compiled measurement plan must contain exactly 800 slots")
    if len({seed for _, _, seed in slots}) != len(slots):
        raise AssertionError("compiled measurement seeds must be unique")
    return slots


def measurement_calibration_chunk_plan(chunk_index: int) -> dict:
    if (
        isinstance(chunk_index, bool)
        or not isinstance(chunk_index, int)
        or chunk_index < 0
        or chunk_index >= MEASUREMENT_CALIBRATION_CHUNK_COUNT
    ):
        raise ValueError("chunk_index must be in the compiled range 0..19")
    start = chunk_index * MEASUREMENT_CALIBRATION_REPLICATION_INDEXES_PER_CHUNK
    stop = start + MEASUREMENT_CALIBRATION_REPLICATION_INDEXES_PER_CHUNK
    slot_ids = [
        _slot_id(scenario, replication_index)
        for scenario, replication_index, _ in required_measurement_calibration_slot_keys()
        if start <= replication_index < stop
    ]
    if len(slot_ids) != MEASUREMENT_CALIBRATION_SLOTS_PER_CHUNK:
        raise AssertionError("compiled measurement chunk must contain exactly 40 slots")
    body = {
        "chunk_index": chunk_index,
        "chunk_id": f"measurement_calibration_chunk_{chunk_index:02d}",
        "replication_index_start_inclusive": start,
        "replication_index_end_exclusive": stop,
        "expected_slot_count": len(slot_ids),
        "slot_ids": slot_ids,
    }
    return {**body, "chunk_plan_hash": sha256_json(body)}


def measurement_calibration_resumable_plan() -> dict:
    slots = required_measurement_calibration_slot_keys()
    chunks = [
        measurement_calibration_chunk_plan(index)
        for index in range(MEASUREMENT_CALIBRATION_CHUNK_COUNT)
    ]
    body = {
        "plan_version": MEASUREMENT_CALIBRATION_RESUMABLE_PLAN_VERSION,
        "execution_mode": "full",
        "scenarios": list(MEASUREMENT_SYNTHETIC_SCENARIOS),
        "replications_per_scenario": MEASUREMENT_FULL_REPLICATIONS_PER_SCENARIO,
        "sample_size_per_wave": MEASUREMENT_SYNTHETIC_SAMPLE_SIZE,
        "required_slot_count": MEASUREMENT_CALIBRATION_REQUIRED_SLOT_COUNT,
        "base_seed": MEASUREMENT_STUDY_BASE_SEED,
        "slot_ids_hash": sha256_json(
            [_slot_id(scenario, index) for scenario, index, _ in slots]
        ),
        "slot_seeds_hash": sha256_json([seed for _, _, seed in slots]),
        "phase_order": list(MEASUREMENT_CALIBRATION_PHASES),
        "chunk_count": MEASUREMENT_CALIBRATION_CHUNK_COUNT,
        "slots_per_chunk": MEASUREMENT_CALIBRATION_SLOTS_PER_CHUNK,
        "replication_indexes_per_chunk": (
            MEASUREMENT_CALIBRATION_REPLICATION_INDEXES_PER_CHUNK
        ),
        "chunks": chunks,
        "thresholds_runtime_configurable": False,
        "seeds_runtime_configurable": False,
        "scenarios_runtime_configurable": False,
        "replication_count_runtime_configurable": False,
        "chunk_size_runtime_configurable": False,
        "worker_count_runtime_configurable": False,
        "serial_execution": True,
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }
    return {**body, "plan_hash": sha256_json(body)}


@lru_cache(maxsize=1)
def runner_implementation_manifest() -> dict:
    root = _repo_root()
    files = []
    for relative_path in (*_RUNNER_SOURCE_PATHS, "inference/requirements.lock"):
        path = root / relative_path
        if path.is_symlink() or not path.is_file():
            raise MeasurementCalibrationWorkspaceError(
                f"runner implementation source is missing or unsafe: {relative_path}"
            )
        files.append({"path": relative_path, "sha256": _file_sha256(path)})
    body = {"files": files}
    return {**body, "implementation_hash": sha256_json(body)}


def _git_output(*args: str) -> str:
    try:
        completed = subprocess.run(
            ("git", *args),
            cwd=_repo_root(),
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        raise MeasurementCalibrationWorkspaceError(
            "git source identity is unavailable"
        ) from exc
    return completed.stdout.strip()


def _git_bytes(*args: str) -> bytes:
    try:
        completed = subprocess.run(
            ("git", *args), cwd=_repo_root(), check=True, capture_output=True
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        raise MeasurementCalibrationWorkspaceError(
            "git source identity is unavailable"
        ) from exc
    return completed.stdout


def _governed_sources_match_head() -> bool:
    root = _repo_root()
    for relative_path in (*_RUNNER_SOURCE_PATHS, "inference/requirements.lock"):
        path = root / relative_path
        if path.is_symlink() or not path.is_file():
            return False
        head_bytes = _git_bytes("show", f"HEAD:{relative_path}")
        if _file_sha256(path) != hashlib.sha256(head_bytes).hexdigest():
            return False
    return True


def build_measurement_calibration_execution_identity(*, require_clean: bool) -> dict:
    commit = _git_output("rev-parse", "HEAD")
    if not _COMMIT_RE.fullmatch(commit):
        raise MeasurementCalibrationWorkspaceError(
            "source commit must be a full Git SHA-1"
        )
    clean = (
        _git_output("status", "--porcelain", "--untracked-files=all") == ""
        and _governed_sources_match_head()
    )
    if require_clean and not clean:
        raise MeasurementCalibrationWorkspaceError(
            "full measurement calibration requires a clean committed source tree"
        )
    if require_clean and not sys.dont_write_bytecode:
        raise MeasurementCalibrationWorkspaceError(
            "full measurement calibration requires Python bytecode writes disabled"
        )
    if (sys.version_info.major, sys.version_info.minor) != (3, 13):
        raise MeasurementCalibrationWorkspaceError(
            "measurement calibration requires the pinned Python 3.13 runtime"
        )
    thread_environment = {key: os.environ.get(key) for key in _THREAD_ENV_KEYS}
    if any(value != "1" for value in thread_environment.values()):
        raise MeasurementCalibrationWorkspaceError(
            "measurement calibration requires all compiled BLAS thread limits set to 1"
        )
    numpy_build_config = np.show_config(mode="dicts")
    with threadpool_limits(limits=1):
        np.dot(np.ones((2, 2)), np.ones((2, 2)))
        active_threadpools = threadpool_info()
    python_thread_count = threading.active_count()
    if python_thread_count != 1:
        raise MeasurementCalibrationWorkspaceError(
            "measurement calibration requires one active Python thread"
        )
    runtime = {
        "python": (
            f"{sys.version_info.major}.{sys.version_info.minor}."
            f"{sys.version_info.micro}"
        ),
        "python_implementation": platform.python_implementation(),
        "python_compiler": platform.python_compiler(),
        "platform_system": platform.system(),
        "platform_release": platform.release(),
        "platform_machine": platform.machine(),
        "platform_tag": sysconfig.get_platform(),
        "python_executable_sha256": _file_sha256(Path(sys.executable).resolve()),
        "native_binary_manifest_hash": _native_binary_manifest_hash(),
        "numpy_build_config_hash": sha256_json(numpy_build_config),
        "blas_backend_hash": sha256_json(
            numpy_build_config.get("Build Dependencies", {}).get("blas", {})
        ),
        "threadpool_runtime_hash": sha256_json(active_threadpools),
        "threadpool_runtime_entry_count": len(active_threadpools),
        "python_thread_count": python_thread_count,
        "thread_environment": thread_environment,
    }
    for package, expected_version in _EXPECTED_RUNTIME_PACKAGE_VERSIONS.items():
        actual_version = importlib.metadata.version(package)
        if actual_version != expected_version:
            raise MeasurementCalibrationWorkspaceError(
                f"measurement calibration requires pinned {package} {expected_version}"
            )
        runtime[package] = actual_version
    implementation = runner_implementation_manifest()
    body = {
        "source_commit": commit,
        "source_tree_clean": clean,
        "plan_hash": measurement_calibration_resumable_plan()["plan_hash"],
        "implementation_manifest": implementation,
        "requirements_lock_hash": _file_sha256(
            _repo_root() / "inference/requirements.lock"
        ),
        "runtime": runtime,
    }
    return {**body, "identity_hash": sha256_json(body)}


def strict_json_equal(left: object, right: object) -> bool:
    if type(left) is not type(right):
        return False
    if isinstance(left, dict):
        return set(left) == set(right) and all(
            strict_json_equal(left[key], right[key]) for key in left
        )
    if isinstance(left, list):
        return len(left) == len(right) and all(
            strict_json_equal(a, b) for a, b in zip(left, right)
        )
    return left == right


def _object_without_duplicate_keys(pairs: list[tuple[str, object]]) -> dict:
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("JSON object contains duplicate keys")
        result[key] = value
    return result


def read_json(path: Path) -> object:
    if path.is_symlink() or not path.is_file():
        raise MeasurementCalibrationWorkspaceError(
            f"checkpoint is missing or unsafe: {path.name}"
        )
    try:
        return json.loads(
            path.read_text(encoding="utf-8"),
            object_pairs_hook=_object_without_duplicate_keys,
            parse_constant=lambda value: (_ for _ in ()).throw(
                ValueError(f"non-finite JSON constant: {value}")
            ),
        )
    except (OSError, UnicodeError, ValueError, json.JSONDecodeError) as exc:
        raise MeasurementCalibrationWorkspaceError(
            f"checkpoint cannot be read: {path.name}"
        ) from exc


def write_json_atomic(
    path: Path, value: object, *, temporary_directory: Path | None = None
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    encoded = (
        json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False)
        + "\n"
    ).encode("utf-8")
    temporary_parent = temporary_directory or path.parent
    temporary_parent.mkdir(parents=True, exist_ok=True)
    temporary = temporary_parent / f".{path.name}.{os.getpid()}.tmp"
    try:
        with temporary.open("xb") as handle:
            handle.write(encoded)
            handle.flush()
            os.fsync(handle.fileno())
        try:
            os.link(temporary, path)
        except FileExistsError as exc:
            if path.is_symlink() or path.read_bytes() != encoded:
                raise MeasurementCalibrationWorkspaceError(
                    f"atomic checkpoint already exists with different content: {path.name}"
                ) from exc
        directory_fd = os.open(path.parent, os.O_RDONLY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
    finally:
        if temporary.exists():
            temporary.unlink()


def _same_existing_filesystem_path(left: Path, right: Path) -> bool:
    try:
        return os.path.samefile(left, right)
    except OSError:
        return False


def _cleanup_stale_atomic_temps(root: Path, *, recursive: bool) -> None:
    paths = root.rglob(".*.tmp") if recursive else root.glob(".*.tmp")
    for path in paths:
        if not re.fullmatch(r"\.[A-Za-z0-9_.-]+\.\d+\.tmp", path.name):
            continue
        if path.is_symlink() or not path.is_file():
            raise MeasurementCalibrationWorkspaceError(
                "stale atomic temporary path is unsafe"
            )
        path.unlink()


@contextmanager
def _initialization_lock(workspace: Path):
    lock_path = workspace / ".initialization.lock"
    flags = os.O_CREAT | os.O_RDWR
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    descriptor = os.open(lock_path, flags, 0o600)
    try:
        fcntl.flock(descriptor, fcntl.LOCK_EX)
        _cleanup_stale_atomic_temps(workspace, recursive=False)
        yield
    finally:
        fcntl.flock(descriptor, fcntl.LOCK_UN)
        os.close(descriptor)


def measurement_calibration_workspace_path(workspace: Path, *parts: str) -> Path:
    candidate = workspace.joinpath(*parts)
    try:
        candidate.relative_to(workspace)
    except ValueError as exc:
        raise MeasurementCalibrationWorkspaceError(
            "measurement calibration checkpoint path escapes its workspace"
        ) from exc
    current = candidate
    while current != workspace:
        if current.is_symlink():
            raise MeasurementCalibrationWorkspaceError(
                "measurement calibration checkpoint paths must not contain symlinks"
            )
        current = current.parent
    resolved = candidate.resolve(strict=False)
    if resolved != workspace and workspace not in resolved.parents:
        raise MeasurementCalibrationWorkspaceError(
            "measurement calibration checkpoint path escapes its workspace"
        )
    return candidate


def initialize_measurement_calibration_workspace(workspace_dir: str | Path) -> Path:
    requested = Path(os.path.abspath(Path(workspace_dir).expanduser()))
    if any(candidate.is_symlink() for candidate in (requested, *requested.parents)):
        raise MeasurementCalibrationWorkspaceError(
            "measurement calibration checkpoint roots must not contain symlinks"
        )
    workspace = requested.resolve()
    repo_root = _repo_root()
    if any(
        _same_existing_filesystem_path(candidate, repo_root)
        for candidate in (workspace, *workspace.parents)
    ):
        raise MeasurementCalibrationWorkspaceError(
            "measurement calibration checkpoints must remain outside the repository"
        )
    workspace.mkdir(parents=True, exist_ok=True)
    if any(candidate.is_symlink() for candidate in workspace.rglob("*")):
        raise MeasurementCalibrationWorkspaceError(
            "measurement calibration workspace must not contain symlinks"
        )
    with _initialization_lock(workspace):
        plan = measurement_calibration_resumable_plan()
        identity = build_measurement_calibration_execution_identity(require_clean=True)
        for filename, expected in (
            ("plan.json", plan),
            ("execution_identity.json", identity),
        ):
            path = measurement_calibration_workspace_path(workspace, filename)
            if path.exists():
                if not strict_json_equal(read_json(path), expected):
                    raise MeasurementCalibrationWorkspaceError(
                        f"workspace {filename} differs from the current runner"
                    )
            else:
                write_json_atomic(path, expected)
    return workspace


def _phase_manifest_path(workspace: Path, phase: str) -> Path:
    return measurement_calibration_workspace_path(workspace, phase, "phase.json")


def _phase_manifest(
    *, phase: str, execution_identity_hash: str, primary_study_hash: str | None
) -> dict:
    body = {
        "schema_version": _PHASE_SCHEMA_VERSION,
        "phase": phase,
        "execution_identity_hash": execution_identity_hash,
        "primary_study_hash": primary_study_hash,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "phase_run_nonce": secrets.token_hex(16),
        "creator_process_run_token": _PROCESS_RUN_TOKEN,
        "process_id": os.getpid(),
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }
    return {**body, "phase_hash": sha256_json(body)}


def _validate_phase_manifest(
    value: object,
    *,
    phase: str,
    execution_identity_hash: str,
    primary_study_hash: str | None,
) -> dict:
    if not isinstance(value, dict) or set(value) != {
        "schema_version",
        "phase",
        "execution_identity_hash",
        "primary_study_hash",
        "started_at",
        "phase_run_nonce",
        "creator_process_run_token",
        "process_id",
        "internal_only",
        "synthetic_only",
        "customer_output_authorized",
        "phase_hash",
    }:
        raise MeasurementCalibrationWorkspaceError("phase manifest shape is invalid")
    body = {key: item for key, item in value.items() if key != "phase_hash"}
    if (
        value["schema_version"] != _PHASE_SCHEMA_VERSION
        or value["phase"] != phase
        or value["execution_identity_hash"] != execution_identity_hash
        or value["primary_study_hash"] != primary_study_hash
        or not isinstance(value["started_at"], str)
        or not isinstance(value["phase_run_nonce"], str)
        or len(value["phase_run_nonce"]) != 32
        or not isinstance(value["creator_process_run_token"], str)
        or not _PROCESS_TOKEN_RE.fullmatch(value["creator_process_run_token"])
        or isinstance(value["process_id"], bool)
        or not isinstance(value["process_id"], int)
        or value["internal_only"] is not True
        or value["synthetic_only"] is not True
        or value["customer_output_authorized"] is not False
        or value["phase_hash"] != sha256_json(body)
    ):
        raise MeasurementCalibrationWorkspaceError("phase manifest is invalid")
    return value


def _load_or_create_phase_manifest(
    workspace: Path,
    *,
    phase: str,
    execution_identity_hash: str,
    primary_study_hash: str | None,
) -> dict:
    path = _phase_manifest_path(workspace, phase)
    if path.exists():
        return _validate_phase_manifest(
            read_json(path),
            phase=phase,
            execution_identity_hash=execution_identity_hash,
            primary_study_hash=primary_study_hash,
        )
    value = _phase_manifest(
        phase=phase,
        execution_identity_hash=execution_identity_hash,
        primary_study_hash=primary_study_hash,
    )
    write_json_atomic(path, value)
    return value


def _slot_path(workspace: Path, phase: str, slot_id: str) -> Path:
    return measurement_calibration_workspace_path(
        workspace, phase, "slots", f"{slot_id}.json"
    )


def _chunk_path(workspace: Path, phase: str, chunk_index: int) -> Path:
    return measurement_calibration_workspace_path(
        workspace, phase, "chunks", f"chunk_{chunk_index:02d}.json"
    )


def _checkpoint_record(
    *,
    phase: str,
    phase_hash: str,
    primary_study_hash: str | None,
    result: MeasurementCalibrationSlotResult,
    fresh_execution: _FreshRecomputationExecution | None = None,
) -> dict:
    if phase == "primary":
        if fresh_execution is not None:
            raise MeasurementCalibrationWorkspaceError(
                "primary checkpoint cannot contain recomputation attestation"
            )
        execution_attestation = None
    elif (
        not isinstance(fresh_execution, _FreshRecomputationExecution)
        or fresh_execution._runner_token is not _FRESH_RECOMPUTATION_TOKEN
        or fresh_execution.result != result
    ):
        raise MeasurementCalibrationWorkspaceError(
            "recompute checkpoint requires a fresh execution attestation"
        )
    else:
        execution_attestation = fresh_execution.attestation
    body = {
        "schema_version": _CHECKPOINT_SCHEMA_VERSION,
        "phase": phase,
        "phase_hash": phase_hash,
        "primary_study_hash": primary_study_hash,
        "process_run_token": _PROCESS_RUN_TOKEN,
        "slot_id": _slot_id(result.scenario, result.replication_index),
        "execution_attestation": execution_attestation,
        "result": result.to_dict(),
    }
    return {**body, "checkpoint_hash": sha256_json(body)}


def _checkpoint_result_from_dict(
    value: object,
    *,
    phase: str,
    phase_hash: str,
    primary_study_hash: str | None,
    expected_slot: tuple[str, int, int],
) -> tuple[MeasurementCalibrationSlotResult, str]:
    if not isinstance(value, dict) or set(value) != {
        "schema_version",
        "phase",
        "phase_hash",
        "primary_study_hash",
        "process_run_token",
        "slot_id",
        "execution_attestation",
        "result",
        "checkpoint_hash",
    }:
        raise MeasurementCalibrationWorkspaceError("slot checkpoint shape is invalid")
    body = {key: item for key, item in value.items() if key != "checkpoint_hash"}
    scenario, replication_index, seed = expected_slot
    if (
        value["schema_version"] != _CHECKPOINT_SCHEMA_VERSION
        or value["phase"] != phase
        or value["phase_hash"] != phase_hash
        or value["primary_study_hash"] != primary_study_hash
        or not isinstance(value["process_run_token"], str)
        or not _PROCESS_TOKEN_RE.fullmatch(value["process_run_token"])
        or value["slot_id"] != _slot_id(scenario, replication_index)
        or value["checkpoint_hash"] != sha256_json(body)
    ):
        raise MeasurementCalibrationWorkspaceError("slot checkpoint binding is invalid")
    try:
        result = measurement_calibration_slot_result_from_dict(value["result"])
    except Exception as exc:
        raise MeasurementCalibrationWorkspaceError(
            "slot checkpoint result is invalid"
        ) from exc
    if (result.scenario, result.replication_index, result.seed) != (
        scenario,
        replication_index,
        seed,
    ):
        raise MeasurementCalibrationWorkspaceError("slot checkpoint is off-plan")
    attestation = value["execution_attestation"]
    if phase == "primary":
        if attestation is not None:
            raise MeasurementCalibrationWorkspaceError(
                "primary checkpoint has recomputation attestation"
            )
    else:
        if not isinstance(attestation, dict) or set(attestation) != {
            "attestation_version",
            "slot_id",
            "result_hash",
            "process_run_token",
            "execution_challenge",
            "started_at",
            "completed_at",
            "attestation_hash",
        }:
            raise MeasurementCalibrationWorkspaceError(
                "recompute execution attestation shape is invalid"
            )
        attestation_body = {
            key: item for key, item in attestation.items() if key != "attestation_hash"
        }
        if (
            attestation["attestation_version"] != "fresh_recomputation_v1"
            or attestation["slot_id"] != value["slot_id"]
            or attestation["result_hash"] != result.result_hash
            or attestation["process_run_token"] != value["process_run_token"]
            or not isinstance(attestation["execution_challenge"], str)
            or not _PROCESS_TOKEN_RE.fullmatch(attestation["execution_challenge"])
            or not isinstance(attestation["started_at"], str)
            or not isinstance(attestation["completed_at"], str)
            or attestation["attestation_hash"] != sha256_json(attestation_body)
        ):
            raise MeasurementCalibrationWorkspaceError(
                "recompute execution attestation is invalid"
            )
    return result, value["process_run_token"]


def _chunk_record(
    *, phase: str, phase_hash: str, chunk_index: int, results: tuple
) -> dict:
    plan = measurement_calibration_chunk_plan(chunk_index)
    body = {
        "schema_version": _CHUNK_SCHEMA_VERSION,
        "phase": phase,
        "phase_hash": phase_hash,
        "chunk_index": chunk_index,
        "chunk_plan_hash": plan["chunk_plan_hash"],
        "slot_ids": plan["slot_ids"],
        "slot_result_hashes": [result.result_hash for result in results],
        "runner_error_count": sum(result.runner_error is not None for result in results),
    }
    return {**body, "chunk_hash": sha256_json(body)}


def _validate_chunk_record(
    value: object,
    *,
    phase: str,
    phase_hash: str,
    chunk_index: int,
    results: tuple[MeasurementCalibrationSlotResult, ...],
) -> None:
    expected = _chunk_record(
        phase=phase,
        phase_hash=phase_hash,
        chunk_index=chunk_index,
        results=results,
    )
    if not strict_json_equal(value, expected):
        raise MeasurementCalibrationWorkspaceError("chunk checkpoint is invalid")


def _identity(workspace: Path) -> dict:
    value = read_json(
        measurement_calibration_workspace_path(workspace, "execution_identity.json")
    )
    if not isinstance(value, dict) or not _SHA256_RE.fullmatch(
        value.get("identity_hash", "")
    ):
        raise MeasurementCalibrationWorkspaceError("execution identity is malformed")
    return value


def _canonical_slots_by_id() -> dict[str, tuple[str, int, int]]:
    return {
        _slot_id(scenario, replication_index): (scenario, replication_index, seed)
        for scenario, replication_index, seed in required_measurement_calibration_slot_keys()
    }


def _phase_tree_entries(workspace: Path, phase: str) -> set[tuple[str, str]]:
    root = measurement_calibration_workspace_path(workspace, phase)
    if not root.exists():
        return set()
    entries = set()
    for path in root.rglob("*"):
        if path.is_symlink():
            raise MeasurementCalibrationWorkspaceError(
                f"{phase} checkpoint tree must not contain symlinks"
            )
        kind = "dir" if path.is_dir() else "file" if path.is_file() else "other"
        entries.add((kind, path.relative_to(root).as_posix()))
    return entries


def _allowed_phase_tree_entries(phase: str) -> set[tuple[str, str]]:
    entries = {
        ("file", "phase.json"),
        ("file", ".execution.lock"),
        ("dir", "slots"),
        ("dir", "chunks"),
    }
    entries.update(
        ("file", f"slots/{_slot_id(scenario, replication_index)}.json")
        for scenario, replication_index, _ in required_measurement_calibration_slot_keys()
    )
    entries.update(
        ("file", f"chunks/chunk_{index:02d}.json")
        for index in range(MEASUREMENT_CALIBRATION_CHUNK_COUNT)
    )
    return entries


@contextmanager
def _phase_execution_lock(workspace: Path, phase: str):
    phase_root = measurement_calibration_workspace_path(workspace, phase)
    phase_root.mkdir(parents=True, exist_ok=True)
    lock_path = measurement_calibration_workspace_path(
        workspace, phase, ".execution.lock"
    )
    flags = os.O_CREAT | os.O_RDWR
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        descriptor = os.open(lock_path, flags, 0o600)
    except OSError as exc:
        raise MeasurementCalibrationWorkspaceError(
            f"{phase} execution lock is unavailable"
        ) from exc
    try:
        try:
            fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as exc:
            raise MeasurementCalibrationWorkspaceError(
                f"{phase} execution is already active"
            ) from exc
        _cleanup_stale_atomic_temps(phase_root, recursive=True)
        yield
    finally:
        fcntl.flock(descriptor, fcntl.LOCK_UN)
        os.close(descriptor)


def _validate_phase_tree(workspace: Path, phase: str, *, complete: bool) -> None:
    actual = _phase_tree_entries(workspace, phase)
    allowed = _allowed_phase_tree_entries(phase)
    if (complete and actual != allowed) or (not complete and not actual <= allowed):
        raise MeasurementCalibrationWorkspaceError(
            f"{phase} checkpoint tree is not exact"
        )


def _completed_chunk_indexes(workspace: Path, phase: str) -> tuple[int, ...]:
    chunk_dir = measurement_calibration_workspace_path(workspace, phase, "chunks")
    if not chunk_dir.exists():
        return ()
    indexes = []
    for path in chunk_dir.iterdir():
        match = re.fullmatch(r"chunk_(\d{2})\.json", path.name)
        if path.is_symlink() or not path.is_file() or match is None:
            raise MeasurementCalibrationWorkspaceError(
                f"{phase} chunk progress contains an unexpected entry"
            )
        index = int(match.group(1))
        if index >= MEASUREMENT_CALIBRATION_CHUNK_COUNT:
            raise MeasurementCalibrationWorkspaceError(
                f"{phase} chunk progress contains an off-plan index"
            )
        indexes.append(index)
    ordered = tuple(sorted(indexes))
    if ordered != tuple(range(len(ordered))):
        raise MeasurementCalibrationWorkspaceError(
            f"{phase} chunks must complete in canonical serial order"
        )
    return ordered


def _validate_chunk_start_order(
    workspace: Path, *, phase: str, chunk_index: int
) -> None:
    _validate_phase_tree(workspace, phase, complete=False)
    completed = _completed_chunk_indexes(workspace, phase)
    if chunk_index in completed:
        return
    if chunk_index != len(completed):
        raise MeasurementCalibrationWorkspaceError(
            f"{phase} chunk must run in canonical serial order"
        )
    allowed_slot_ids = {
        slot_id
        for index in (*completed, chunk_index)
        for slot_id in measurement_calibration_chunk_plan(index)["slot_ids"]
    }
    slot_dir = measurement_calibration_workspace_path(workspace, phase, "slots")
    actual_slot_ids = (
        {path.stem for path in slot_dir.iterdir()} if slot_dir.exists() else set()
    )
    if not actual_slot_ids <= allowed_slot_ids:
        raise MeasurementCalibrationWorkspaceError(
            f"{phase} slot progress is ahead of canonical chunk order"
        )


def _validate_workspace_root(workspace: Path, *, artifact_optional: bool) -> None:
    actual = {
        ("dir" if path.is_dir() else "file" if path.is_file() else "other", path.name)
        for path in workspace.iterdir()
    }
    expected = {
        ("file", ".initialization.lock"),
        ("file", "plan.json"),
        ("file", "execution_identity.json"),
        ("dir", "primary"),
        ("dir", "recompute"),
    }
    artifact_entry = ("file", "ai_fluency_measurement_calibration_artifact.json")
    if artifact_optional:
        if actual not in (expected, expected | {artifact_entry}):
            raise MeasurementCalibrationWorkspaceError(
                "measurement calibration workspace root is not exact"
            )
    elif actual != expected:
        raise MeasurementCalibrationWorkspaceError(
            "measurement calibration workspace root is not exact"
        )


def run_measurement_calibration_chunk(
    *, phase: str, chunk_index: int, workspace_dir: str | Path
) -> dict:
    if phase not in MEASUREMENT_CALIBRATION_PHASES:
        raise ValueError("phase must be primary or recompute")
    workspace = initialize_measurement_calibration_workspace(workspace_dir)
    with _phase_execution_lock(workspace, phase):
        return _run_measurement_calibration_chunk_locked(
            phase=phase, chunk_index=chunk_index, workspace=workspace
        )


def _run_measurement_calibration_chunk_locked(
    *, phase: str, chunk_index: int, workspace: Path
) -> dict:
    identity = _identity(workspace)
    primary_study = None
    primary_study_hash = None
    if phase == "recompute":
        (
            primary_phase,
            primary_results,
            primary_process_tokens,
            _,
        ) = _load_complete_phase(
            workspace, phase="primary", primary_study_hash=None
        )
        if (
            _PROCESS_RUN_TOKEN in primary_process_tokens
            or primary_phase["creator_process_run_token"] == _PROCESS_RUN_TOKEN
        ):
            raise MeasurementCalibrationWorkspaceError(
                "recomputation must start in a process that executed no primary slots"
            )
        primary_study = assemble_measurement_calibration_study(
            execution_mode="full", slot_results=primary_results
        )
        primary_study_hash = primary_study.study_hash
    phase_manifest = _load_or_create_phase_manifest(
        workspace,
        phase=phase,
        execution_identity_hash=identity["identity_hash"],
        primary_study_hash=primary_study_hash,
    )
    _validate_chunk_start_order(
        workspace, phase=phase, chunk_index=chunk_index
    )
    plan = measurement_calibration_chunk_plan(chunk_index)
    slots_by_id = _canonical_slots_by_id()
    primary_by_id = (
        {
            _slot_id(result.scenario, result.replication_index): result
            for result in primary_study.slot_results
        }
        if primary_study is not None
        else {}
    )
    results = []
    for slot_id in plan["slot_ids"]:
        slot = slots_by_id[slot_id]
        path = _slot_path(workspace, phase, slot_id)
        if path.exists():
            result, _ = _checkpoint_result_from_dict(
                read_json(path),
                phase=phase,
                phase_hash=phase_manifest["phase_hash"],
                primary_study_hash=primary_study_hash,
                expected_slot=slot,
            )
        else:
            fresh_execution = None
            if phase == "recompute":
                fresh_execution = _run_fresh_recomputation_slot(
                    scenario=slot[0], replication_index=slot[1]
                )
                result = fresh_execution.result
            else:
                with threadpool_limits(limits=1):
                    result = run_measurement_calibration_slot(
                        scenario=slot[0], replication_index=slot[1]
                    )
            if phase == "recompute" and result != primary_by_id[slot_id]:
                raise MeasurementCalibrationWorkspaceError(
                    f"fresh recomputation differs from primary slot: {slot_id}"
                )
            write_json_atomic(
                path,
                _checkpoint_record(
                    phase=phase,
                    phase_hash=phase_manifest["phase_hash"],
                    primary_study_hash=primary_study_hash,
                    result=result,
                    fresh_execution=fresh_execution,
                ),
            )
        if phase == "recompute" and result != primary_by_id[slot_id]:
            raise MeasurementCalibrationWorkspaceError(
                f"recomputation checkpoint differs from primary slot: {slot_id}"
            )
        results.append(result)
    result_tuple = tuple(results)
    chunk = _chunk_record(
        phase=phase,
        phase_hash=phase_manifest["phase_hash"],
        chunk_index=chunk_index,
        results=result_tuple,
    )
    chunk_path = _chunk_path(workspace, phase, chunk_index)
    if chunk_path.exists():
        _validate_chunk_record(
            read_json(chunk_path),
            phase=phase,
            phase_hash=phase_manifest["phase_hash"],
            chunk_index=chunk_index,
            results=result_tuple,
        )
    else:
        write_json_atomic(chunk_path, chunk)
    return chunk


def run_measurement_calibration_phase(
    *, phase: str, workspace_dir: str | Path
) -> tuple[dict, ...]:
    return tuple(
        run_measurement_calibration_chunk(
            phase=phase, chunk_index=index, workspace_dir=workspace_dir
        )
        for index in range(MEASUREMENT_CALIBRATION_CHUNK_COUNT)
    )


def _load_complete_phase(
    workspace: Path,
    *,
    phase: str,
    primary_study_hash: str | None,
) -> tuple[
    dict,
    tuple[MeasurementCalibrationSlotResult, ...],
    frozenset[str],
    str,
]:
    _validate_phase_tree(workspace, phase, complete=True)
    identity = _identity(workspace)
    phase_manifest = _validate_phase_manifest(
        read_json(_phase_manifest_path(workspace, phase)),
        phase=phase,
        execution_identity_hash=identity["identity_hash"],
        primary_study_hash=primary_study_hash,
    )
    slots_by_id = _canonical_slots_by_id()
    by_id = {}
    process_tokens = set()
    checkpoint_hashes = []
    for slot_id, slot in slots_by_id.items():
        record = read_json(_slot_path(workspace, phase, slot_id))
        result, process_token = _checkpoint_result_from_dict(
            record,
            phase=phase,
            phase_hash=phase_manifest["phase_hash"],
            primary_study_hash=primary_study_hash,
            expected_slot=slot,
        )
        by_id[slot_id] = result
        process_tokens.add(process_token)
        checkpoint_hashes.append(record["checkpoint_hash"])
    chunk_hashes = []
    for index in range(MEASUREMENT_CALIBRATION_CHUNK_COUNT):
        chunk_plan = measurement_calibration_chunk_plan(index)
        results = tuple(by_id[slot_id] for slot_id in chunk_plan["slot_ids"])
        chunk_record = read_json(_chunk_path(workspace, phase, index))
        _validate_chunk_record(
            chunk_record,
            phase=phase,
            phase_hash=phase_manifest["phase_hash"],
            chunk_index=index,
            results=results,
        )
        chunk_hashes.append(chunk_record["chunk_hash"])
    ordered = tuple(
        by_id[_slot_id(scenario, replication_index)]
        for scenario, replication_index, _ in required_measurement_calibration_slot_keys()
    )
    checkpoint_manifest_hash = sha256_json(
        {
            "phase_hash": phase_manifest["phase_hash"],
            "checkpoint_hashes": checkpoint_hashes,
            "chunk_hashes": chunk_hashes,
        }
    )
    return (
        phase_manifest,
        ordered,
        frozenset(process_tokens),
        checkpoint_manifest_hash,
    )


def load_complete_primary_study(
    workspace_dir: str | Path,
) -> MeasurementCalibrationStudy:
    workspace = initialize_measurement_calibration_workspace(workspace_dir)
    _, results, _, _ = _load_complete_phase(
        workspace, phase="primary", primary_study_hash=None
    )
    return assemble_measurement_calibration_study(
        execution_mode="full", slot_results=results
    )


def emit_resumable_measurement_calibration_artifact(
    *, workspace_dir: str | Path, generated_at: str | None = None
) -> dict:
    workspace = initialize_measurement_calibration_workspace(workspace_dir)
    with _phase_execution_lock(workspace, "primary"):
        with _phase_execution_lock(workspace, "recompute"):
            return _emit_resumable_measurement_calibration_artifact_locked(
                workspace=workspace, generated_at=generated_at
            )


def _emit_resumable_measurement_calibration_artifact_locked(
    *, workspace: Path, generated_at: str | None
) -> dict:
    current_identity = build_measurement_calibration_execution_identity(
        require_clean=True
    )
    identity = _identity(workspace)
    if not strict_json_equal(identity, current_identity):
        raise MeasurementCalibrationWorkspaceError(
            "workspace execution identity differs from the current runner"
        )
    _validate_workspace_root(workspace, artifact_optional=True)
    (
        primary_phase,
        primary_results,
        primary_process_tokens,
        primary_checkpoint_manifest_hash,
    ) = _load_complete_phase(
        workspace, phase="primary", primary_study_hash=None
    )
    study = assemble_measurement_calibration_study(
        execution_mode="full", slot_results=primary_results
    )
    (
        recompute_phase,
        recomputed_results,
        recompute_process_tokens,
        recompute_checkpoint_manifest_hash,
    ) = _load_complete_phase(
        workspace, phase="recompute", primary_study_hash=study.study_hash
    )
    if (
        primary_phase["phase_run_nonce"] == recompute_phase["phase_run_nonce"]
        or primary_process_tokens & recompute_process_tokens
    ):
        raise MeasurementCalibrationWorkspaceError(
            "primary and recomputation phases must use disjoint process identities"
        )
    primary_process_tokens_hash = sha256_json(sorted(primary_process_tokens))
    recompute_process_tokens_hash = sha256_json(sorted(recompute_process_tokens))
    generation_identity_body = {
        **{key: value for key, value in identity.items() if key != "identity_hash"},
        "workspace_identity_hash": identity["identity_hash"],
        "primary_phase_hash": primary_phase["phase_hash"],
        "recompute_phase_hash": recompute_phase["phase_hash"],
        "primary_checkpoint_manifest_hash": primary_checkpoint_manifest_hash,
        "recompute_checkpoint_manifest_hash": recompute_checkpoint_manifest_hash,
        "primary_process_tokens_hash": primary_process_tokens_hash,
        "recompute_process_tokens_hash": recompute_process_tokens_hash,
        "separate_phase_execution": True,
    }
    generation_identity = {
        **generation_identity_body,
        "identity_hash": sha256_json(generation_identity_body),
    }
    verification = _build_execution_verification_from_recomputed_results(
        study,
        recomputed_results,
        execution_identity_hash=generation_identity["identity_hash"],
        primary_phase_hash=primary_phase["phase_hash"],
        recompute_phase_hash=recompute_phase["phase_hash"],
        primary_checkpoint_manifest_hash=primary_checkpoint_manifest_hash,
        recompute_checkpoint_manifest_hash=recompute_checkpoint_manifest_hash,
        primary_process_tokens_hash=primary_process_tokens_hash,
        recompute_process_tokens_hash=recompute_process_tokens_hash,
    )
    output = measurement_calibration_workspace_path(
        workspace, "ai_fluency_measurement_calibration_artifact.json"
    )
    existing = read_json(output) if output.exists() else None
    if existing is not None and not isinstance(existing, dict):
        raise MeasurementCalibrationWorkspaceError(
            "existing measurement artifact must be an object"
        )
    effective_generated_at = (
        existing.get("generated_at")
        if generated_at is None and existing is not None
        else generated_at
    )
    artifact = _emit_measurement_calibration_artifact_from_execution_verification(
        study,
        execution_verification=verification,
        execution_identity=generation_identity,
        generated_at=effective_generated_at,
    )
    if output.exists():
        if not strict_json_equal(existing, artifact):
            raise MeasurementCalibrationWorkspaceError(
                "existing measurement artifact failed exact regeneration"
            )
    else:
        write_json_atomic(
            output,
            artifact,
            temporary_directory=measurement_calibration_workspace_path(
                workspace, "recompute"
            ),
        )
    return artifact
