"""Resumable synthetic replicated validation for the longitudinal engine."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import json
import math
import os
import platform
from pathlib import Path
import re
import subprocess
from typing import Literal, Sequence

import numpy as np

from .hashing import sha256_json
from .longitudinal_state_space import (
    DeterministicStateSpaceFit,
    fit_deterministic_state_space,
    prepare_longitudinal_state_space,
)
from .longitudinal_validation_synthetic import (
    LONGITUDINAL_VALIDATION_EFFECT_SIZES_SD,
    LONGITUDINAL_VALIDATION_PANEL_GROUP_COUNTS,
    generate_longitudinal_validation_case,
)


LONGITUDINAL_REPLICATED_VALIDATION_PLAN_VERSION = "1.0.0"
LONGITUDINAL_REPLICATED_VALIDATION_BASE_SEED = 202607130
LONGITUDINAL_REPLICATED_VALIDATION_REPLICATIONS_PER_CELL = 200
LONGITUDINAL_REPLICATED_VALIDATION_REQUIRED_SLOT_COUNT = 1_200
LONGITUDINAL_REPLICATED_VALIDATION_CHUNK_COUNT = 20
LONGITUDINAL_REPLICATED_VALIDATION_INDEXES_PER_CHUNK = 10
LONGITUDINAL_REPLICATED_VALIDATION_SLOTS_PER_CHUNK = 60
LONGITUDINAL_REPLICATED_VALIDATION_AGGREGATE_K = 16
LONGITUDINAL_REPLICATED_VALIDATION_COVERAGE_COUNT_MIN = 148
LONGITUDINAL_REPLICATED_VALIDATION_COVERAGE_COUNT_MAX = 172
LONGITUDINAL_REPLICATED_VALIDATION_NULL_SIGNAL_COUNT_MAX = 10
LONGITUDINAL_REPLICATED_VALIDATION_NULL_SIGNAL_Z = 1.959963984540054
LONGITUDINAL_REPLICATED_VALIDATION_PROVENANCE_FLOOR_K = 5
LONGITUDINAL_REPLICATED_VALIDATION_VALIDATION_FLOOR_K = 10
LONGITUDINAL_REPLICATED_VALIDATION_PLAN_MODE = "full"
LONGITUDINAL_REPLICATED_VALIDATION_HASH_POSTURE = (
    "consistency_and_drift_detection_not_coordinated_replacement_authenticity"
)
LONGITUDINAL_ACCEPTED_CONCORDANCE_REVIEWED_COMMIT = (
    "6c0b0faa7511dc0cdc7119c2856bdbe0ad06ad5c"
)
LONGITUDINAL_ACCEPTED_CONCORDANCE_RECORD_PATH = (
    "inference/evidence/"
    "longitudinal_state_space_nuts_concordance_acceptance_2026_07.json"
)
LONGITUDINAL_ACCEPTED_CONCORDANCE_RECORD_SHA256 = (
    "1c71c5e7befa9e8a1995de24f3660e2b48921ea37b8318d7e7ddcfd5051bbbf6"
)
LONGITUDINAL_ACCEPTED_CONCORDANCE_ARTIFACT_SHA256 = (
    "0497ec12e432da0f0e270093df616c3b2a822b1fbc3c9c40070f963c53fd7b08"
)
LONGITUDINAL_ACCEPTED_CONCORDANCE_ARTIFACT_PATH = (
    "inference/evidence/"
    "longitudinal_state_space_nuts_concordance_full_2026_07.json"
)
LONGITUDINAL_ACCEPTED_CONCORDANCE_COMPACT_SUMMARY_PATH = (
    "inference/evidence/longitudinal_state_space_nuts_concordance_2026_07.json"
)
LONGITUDINAL_ACCEPTED_CONCORDANCE_COMPACT_SUMMARY_SHA256 = (
    "ce7d28408546bb0f91a19f4c79a7074190ec25e8b969afe403d9b95728dbb2b8"
)

_EFFECT_SEED_OFFSET = 100_000
_GROUP_SEED_OFFSET = 1_000
_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
_COMMIT_RE = re.compile(r"^[0-9a-f]{40}$")
_RUNNER_SOURCE_PATHS = (
    "inference/src/fluencytracr_inference/__init__.py",
    "inference/src/fluencytracr_inference/design_router.py",
    "inference/src/fluencytracr_inference/hashing.py",
    "inference/src/fluencytracr_inference/longitudinal_synthetic.py",
    "inference/src/fluencytracr_inference/longitudinal_replicated_validation.py",
    "inference/src/fluencytracr_inference/longitudinal_replicated_validation_controls.py",
    "inference/src/fluencytracr_inference/longitudinal_replicated_validation_artifact.py",
    "inference/src/fluencytracr_inference/longitudinal_replicated_validation_cli.py",
    "inference/src/fluencytracr_inference/longitudinal_state_space.py",
    "inference/src/fluencytracr_inference/longitudinal_types.py",
    "inference/src/fluencytracr_inference/longitudinal_validation_synthetic.py",
    "packages/confidence-engine/src/longitudinalReplicatedValidation.ts",
    "packages/confidence-engine/src/internal/hashing.ts",
    "packages/confidence-engine/src/index.ts",
    "packages/confidence-engine/package.json",
    "packages/confidence-engine/tsconfig.json",
    "package-lock.json",
    "openspec/changes/add-longitudinal-replicated-validation-runner/design.md",
    "openspec/changes/add-longitudinal-replicated-validation-runner/specs/bayesian-ai-value-realization-and-human-transformation-model-family/spec.md",
    LONGITUDINAL_ACCEPTED_CONCORDANCE_RECORD_PATH,
    LONGITUDINAL_ACCEPTED_CONCORDANCE_ARTIFACT_PATH,
    LONGITUDINAL_ACCEPTED_CONCORDANCE_COMPACT_SUMMARY_PATH,
)
_EXPECTED_RUNTIME_PACKAGE_VERSIONS = {
    "pymc": "6.0.1",
    "arviz": "1.2.0",
    "numpy": "2.4.6",
    "scipy": "1.18.0",
}


class ReplicatedValidationError(RuntimeError):
    """The replicated study cannot continue or be combined safely."""


class ReplicatedValidationWorkspaceError(ReplicatedValidationError):
    """A resumable workspace contains malformed or mismatched evidence."""


@dataclass(frozen=True, order=True)
class CalibrationSlot:
    effect_size_sd: float
    panel_group_count: int
    replication_index: int
    seed: int
    aggregate_measurement_cell_k: int = (
        LONGITUDINAL_REPLICATED_VALIDATION_AGGREGATE_K
    )

    @property
    def cell_id(self) -> str:
        return (
            f"effect_{_effect_token(self.effect_size_sd)}"
            f"__groups_{self.panel_group_count}"
        )

    @property
    def slot_id(self) -> str:
        return f"{self.cell_id}__rep_{self.replication_index:03d}__seed_{self.seed}"

    def to_dict(self) -> dict:
        return {
            "slot_id": self.slot_id,
            "cell_id": self.cell_id,
            "effect_size_sd": float(self.effect_size_sd),
            "panel_group_count": int(self.panel_group_count),
            "replication_index": int(self.replication_index),
            "seed": int(self.seed),
            "aggregate_measurement_cell_k": int(
                self.aggregate_measurement_cell_k
            ),
        }


@dataclass(frozen=True)
class ExecutionIdentity:
    source_commit: str
    source_tree_clean: bool
    implementation_hash: str
    requirements_lock_hash: str
    runtime: dict[str, str]
    plan_hash: str
    accepted_concordance_record_hash: str
    accepted_concordance_artifact_hash: str
    accepted_concordance_reviewed_commit: str
    accepted_concordance_commit_is_ancestor: bool
    identity_hash: str

    def body_without_hash(self) -> dict:
        return {
            "source_commit": self.source_commit,
            "source_tree_clean": self.source_tree_clean,
            "implementation_hash": self.implementation_hash,
            "requirements_lock_hash": self.requirements_lock_hash,
            "runtime": dict(self.runtime),
            "plan_hash": self.plan_hash,
            "accepted_concordance_record_hash": (
                self.accepted_concordance_record_hash
            ),
            "accepted_concordance_artifact_hash": (
                self.accepted_concordance_artifact_hash
            ),
            "accepted_concordance_reviewed_commit": (
                self.accepted_concordance_reviewed_commit
            ),
            "accepted_concordance_commit_is_ancestor": (
                self.accepted_concordance_commit_is_ancestor
            ),
        }

    def to_dict(self) -> dict:
        return {**self.body_without_hash(), "identity_hash": self.identity_hash}


@dataclass(frozen=True)
class CalibrationSlotResult:
    slot: CalibrationSlot
    execution_mode: Literal["full", "canary", "smoke"]
    status: Literal["PASS", "HOLD"]
    failing_checks: tuple[str, ...]
    truth_effect_size_sd: float | None
    posterior_mean: float | None
    posterior_sd: float | None
    interval_80_lower: float | None
    interval_80_upper: float | None
    interval_covers_truth: bool | None
    internal_validation_signal_detected: bool | None
    prepared_input_hash: str | None
    model_input_hash: str | None
    context_binding_hash: str | None
    truth_receipt_hash: str | None
    case_binding_hash: str | None
    fit_summary_hash: str | None
    integration_diagnostics: dict | None
    execution_identity_hash: str
    runner_error_stage: str | None = None
    runner_error_type: str | None = None
    result_hash: str = ""

    @property
    def passed(self) -> bool:
        return self.status == "PASS" and not self.failing_checks

    def body_without_hash(self) -> dict:
        return {
            **self.slot.to_dict(),
            "execution_mode": self.execution_mode,
            "status": self.status,
            "failing_checks": list(self.failing_checks),
            "truth_effect_size_sd": self.truth_effect_size_sd,
            "posterior_summary": (
                {
                    "posterior_mean": self.posterior_mean,
                    "posterior_sd": self.posterior_sd,
                    "credible_interval_80": {
                        "lower": self.interval_80_lower,
                        "upper": self.interval_80_upper,
                    },
                }
                if self.posterior_mean is not None
                else None
            ),
            "interval_covers_truth": self.interval_covers_truth,
            "internal_validation_signal_detected": (
                self.internal_validation_signal_detected
            ),
            "prepared_input_hash": self.prepared_input_hash,
            "model_input_hash": self.model_input_hash,
            "context_binding_hash": self.context_binding_hash,
            "truth_receipt_hash": self.truth_receipt_hash,
            "case_binding_hash": self.case_binding_hash,
            "fit_summary_hash": self.fit_summary_hash,
            "integration_diagnostics": self.integration_diagnostics,
            "execution_identity_hash": self.execution_identity_hash,
            "runner_error_stage": self.runner_error_stage,
            "runner_error_type": self.runner_error_type,
        }

    def to_dict(self) -> dict:
        return {**self.body_without_hash(), "result_hash": self.result_hash}


@dataclass(frozen=True)
class CalibrationChunkResult:
    chunk_index: int
    execution_mode: Literal["full", "canary", "smoke"]
    slot_results: tuple[CalibrationSlotResult, ...]
    execution_identity: ExecutionIdentity
    chunk_hash: str

    def body_without_hash(self) -> dict:
        chunk = calibration_chunk_plan(self.chunk_index)
        return {
            "report_class": "longitudinal_replicated_validation_chunk_v1",
            "plan_version": LONGITUDINAL_REPLICATED_VALIDATION_PLAN_VERSION,
            "plan_hash": self.execution_identity.plan_hash,
            "chunk_index": self.chunk_index,
            "chunk_id": chunk["chunk_id"],
            "execution_mode": self.execution_mode,
            "expected_slot_count": len(chunk["slot_ids"]),
            "slot_ids": [result.slot.slot_id for result in self.slot_results],
            "slot_result_hashes": [result.result_hash for result in self.slot_results],
            "execution_identity": self.execution_identity.to_dict(),
            "internal_only": True,
            "synthetic_only": True,
            "customer_output_authorized": False,
        }

    def to_dict(self) -> dict:
        return {**self.body_without_hash(), "chunk_hash": self.chunk_hash}


@dataclass(frozen=True)
class CalibrationCellSummary:
    effect_size_sd: float
    panel_group_count: int
    expected_replication_count: int
    observed_replication_count: int
    passing_row_count: int
    hard_failure_count: int
    coverage_count: int
    coverage_rate: float
    coverage_standard_error: float
    coverage_gate_passed: bool
    null_signal_count: int | None
    null_signal_rate: float | None
    null_gate_passed: bool | None

    def to_dict(self) -> dict:
        return {
            "cell_id": (
                f"effect_{_effect_token(self.effect_size_sd)}"
                f"__groups_{self.panel_group_count}"
            ),
            "effect_size_sd": float(self.effect_size_sd),
            "panel_group_count": int(self.panel_group_count),
            "expected_replication_count": self.expected_replication_count,
            "observed_replication_count": self.observed_replication_count,
            "passing_row_count": self.passing_row_count,
            "hard_failure_count": self.hard_failure_count,
            "coverage_count": self.coverage_count,
            "coverage_rate": self.coverage_rate,
            "coverage_standard_error": self.coverage_standard_error,
            "coverage_gate_passed": self.coverage_gate_passed,
            "null_signal_count": self.null_signal_count,
            "null_signal_rate": self.null_signal_rate,
            "null_gate_passed": self.null_gate_passed,
        }


@dataclass(frozen=True)
class CalibrationStudySummary:
    execution_mode: Literal["full", "canary", "smoke"]
    cell_summaries: tuple[CalibrationCellSummary, ...]
    expected_slot_count: int
    observed_slot_count: int
    missing_slot_ids: tuple[str, ...]
    duplicate_slot_ids: tuple[str, ...]
    off_plan_slot_ids: tuple[str, ...]
    duplicate_case_binding_hashes: tuple[str, ...]
    duplicate_fit_summary_hashes: tuple[str, ...]
    exact_manifest_complete: bool
    hard_failure_count: int
    calibration_gate_passed: bool
    null_gate_passed: bool
    worst_null_signal_rate: float | None
    study_status: Literal["PASS", "HOLD"]
    failing_checks: tuple[str, ...]
    study_result_hash: str

    def body_without_hash(self) -> dict:
        return {
            "execution_mode": self.execution_mode,
            "cell_summaries": [summary.to_dict() for summary in self.cell_summaries],
            "expected_slot_count": self.expected_slot_count,
            "observed_slot_count": self.observed_slot_count,
            "missing_slot_ids": list(self.missing_slot_ids),
            "duplicate_slot_ids": list(self.duplicate_slot_ids),
            "off_plan_slot_ids": list(self.off_plan_slot_ids),
            "duplicate_case_binding_hashes": list(
                self.duplicate_case_binding_hashes
            ),
            "duplicate_fit_summary_hashes": list(
                self.duplicate_fit_summary_hashes
            ),
            "exact_manifest_complete": self.exact_manifest_complete,
            "hard_failure_count": self.hard_failure_count,
            "calibration_gate_passed": self.calibration_gate_passed,
            "null_gate_passed": self.null_gate_passed,
            "worst_null_signal_rate": self.worst_null_signal_rate,
            "study_status": self.study_status,
            "failing_checks": list(self.failing_checks),
        }

    def to_dict(self) -> dict:
        return {**self.body_without_hash(), "study_result_hash": self.study_result_hash}


def _effect_token(effect_size_sd: float) -> str:
    return {0.0: "0p0", 0.2: "0p2", 0.5: "0p5"}.get(
        float(effect_size_sd), "off_plan"
    )


def calibration_seed(
    *, effect_size_sd: float, panel_group_count: int, replication_index: int
) -> int:
    try:
        effect_index = LONGITUDINAL_VALIDATION_EFFECT_SIZES_SD.index(
            float(effect_size_sd)
        )
        group_index = LONGITUDINAL_VALIDATION_PANEL_GROUP_COUNTS.index(
            int(panel_group_count)
        )
    except ValueError as exc:
        raise ValueError("calibration seed inputs must use the compiled cells") from exc
    if (
        isinstance(replication_index, bool)
        or not isinstance(replication_index, int)
        or replication_index < 0
        or replication_index
        >= LONGITUDINAL_REPLICATED_VALIDATION_REPLICATIONS_PER_CELL
    ):
        raise ValueError("replication_index must be in the compiled range 0..199")
    return (
        LONGITUDINAL_REPLICATED_VALIDATION_BASE_SEED
        + effect_index * _EFFECT_SEED_OFFSET
        + group_index * _GROUP_SEED_OFFSET
        + replication_index
    )


def required_calibration_slots() -> tuple[CalibrationSlot, ...]:
    slots = tuple(
        CalibrationSlot(
            effect_size_sd=float(effect),
            panel_group_count=int(groups),
            replication_index=replication_index,
            seed=calibration_seed(
                effect_size_sd=float(effect),
                panel_group_count=int(groups),
                replication_index=replication_index,
            ),
        )
        for effect in LONGITUDINAL_VALIDATION_EFFECT_SIZES_SD
        for groups in LONGITUDINAL_VALIDATION_PANEL_GROUP_COUNTS
        for replication_index in range(
            LONGITUDINAL_REPLICATED_VALIDATION_REPLICATIONS_PER_CELL
        )
    )
    if len(slots) != LONGITUDINAL_REPLICATED_VALIDATION_REQUIRED_SLOT_COUNT:
        raise AssertionError("compiled calibration plan must contain exactly 1,200 slots")
    if len({slot.seed for slot in slots}) != len(slots):
        raise AssertionError("compiled calibration seeds must be unique")
    return slots


def calibration_chunk_plan(chunk_index: int) -> dict:
    if (
        isinstance(chunk_index, bool)
        or not isinstance(chunk_index, int)
        or chunk_index < 0
        or chunk_index >= LONGITUDINAL_REPLICATED_VALIDATION_CHUNK_COUNT
    ):
        raise ValueError("chunk_index must be in the compiled range 0..19")
    start = chunk_index * LONGITUDINAL_REPLICATED_VALIDATION_INDEXES_PER_CHUNK
    stop = start + LONGITUDINAL_REPLICATED_VALIDATION_INDEXES_PER_CHUNK
    slots = tuple(
        slot
        for slot in required_calibration_slots()
        if start <= slot.replication_index < stop
    )
    if len(slots) != LONGITUDINAL_REPLICATED_VALIDATION_SLOTS_PER_CHUNK:
        raise AssertionError("compiled chunk must contain exactly 60 slots")
    body = {
        "chunk_index": chunk_index,
        "chunk_id": f"calibration_chunk_{chunk_index:02d}",
        "replication_index_start_inclusive": start,
        "replication_index_end_exclusive": stop,
        "expected_slot_count": len(slots),
        "slot_ids": [slot.slot_id for slot in slots],
    }
    return {**body, "chunk_plan_hash": sha256_json(body)}


def longitudinal_replicated_validation_plan() -> dict:
    slots = required_calibration_slots()
    chunks = [
        calibration_chunk_plan(index)
        for index in range(LONGITUDINAL_REPLICATED_VALIDATION_CHUNK_COUNT)
    ]
    body = {
        "plan_version": LONGITUDINAL_REPLICATED_VALIDATION_PLAN_VERSION,
        "execution_mode": LONGITUDINAL_REPLICATED_VALIDATION_PLAN_MODE,
        "base_seed": LONGITUDINAL_REPLICATED_VALIDATION_BASE_SEED,
        "effect_sizes_sd": list(LONGITUDINAL_VALIDATION_EFFECT_SIZES_SD),
        "panel_group_counts": list(
            LONGITUDINAL_VALIDATION_PANEL_GROUP_COUNTS
        ),
        "replication_indexes": list(
            range(LONGITUDINAL_REPLICATED_VALIDATION_REPLICATIONS_PER_CELL)
        ),
        "replications_per_cell": (
            LONGITUDINAL_REPLICATED_VALIDATION_REPLICATIONS_PER_CELL
        ),
        "required_slot_count": (
            LONGITUDINAL_REPLICATED_VALIDATION_REQUIRED_SLOT_COUNT
        ),
        "aggregate_measurement_cell_k": (
            LONGITUDINAL_REPLICATED_VALIDATION_AGGREGATE_K
        ),
        "accepted_concordance": {
            "acceptance_record_path": (
                LONGITUDINAL_ACCEPTED_CONCORDANCE_RECORD_PATH
            ),
            "acceptance_record_sha256": (
                LONGITUDINAL_ACCEPTED_CONCORDANCE_RECORD_SHA256
            ),
            "reviewed_implementation_commit": (
                LONGITUDINAL_ACCEPTED_CONCORDANCE_REVIEWED_COMMIT
            ),
            "full_artifact_sha256": (
                LONGITUDINAL_ACCEPTED_CONCORDANCE_ARTIFACT_SHA256
            ),
            "required_overall_decision": "GO",
            "required_replicated_validation_unblocked": True,
        },
        "compiled_gates": {
            "credible_interval_level": 0.8,
            "coverage_count_min_inclusive": (
                LONGITUDINAL_REPLICATED_VALIDATION_COVERAGE_COUNT_MIN
            ),
            "coverage_count_max_inclusive": (
                LONGITUDINAL_REPLICATED_VALIDATION_COVERAGE_COUNT_MAX
            ),
            "null_signal_z": LONGITUDINAL_REPLICATED_VALIDATION_NULL_SIGNAL_Z,
            "null_signal_count_max_inclusive": (
                LONGITUDINAL_REPLICATED_VALIDATION_NULL_SIGNAL_COUNT_MAX
            ),
            "aggregate_provenance_floor_k": (
                LONGITUDINAL_REPLICATED_VALIDATION_PROVENANCE_FLOOR_K
            ),
            "validation_floor_k": (
                LONGITUDINAL_REPLICATED_VALIDATION_VALIDATION_FLOOR_K
            ),
        },
        "slot_ids_hash": sha256_json([slot.slot_id for slot in slots]),
        "chunk_count": LONGITUDINAL_REPLICATED_VALIDATION_CHUNK_COUNT,
        "slots_per_chunk": LONGITUDINAL_REPLICATED_VALIDATION_SLOTS_PER_CHUNK,
        "replication_indexes_per_chunk": (
            LONGITUDINAL_REPLICATED_VALIDATION_INDEXES_PER_CHUNK
        ),
        "chunks": chunks,
        "thresholds_runtime_configurable": False,
        "seeds_runtime_configurable": False,
        "cells_runtime_configurable": False,
        "replication_count_runtime_configurable": False,
        "chunk_size_runtime_configurable": False,
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }
    return {**body, "plan_hash": sha256_json(body)}


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def runner_implementation_manifest() -> dict:
    root = _repo_root()
    paths = (*_RUNNER_SOURCE_PATHS, "inference/requirements.lock")
    files = []
    for relative_path in paths:
        path = root / relative_path
        if not path.is_file():
            raise ReplicatedValidationError(
                f"runner implementation source is missing: {relative_path}"
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
        raise ReplicatedValidationError("git source identity is unavailable") from exc
    return completed.stdout.strip()


def _git_bytes(*args: str) -> bytes:
    try:
        completed = subprocess.run(
            ("git", *args),
            cwd=_repo_root(),
            check=True,
            capture_output=True,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        raise ReplicatedValidationError("git source identity is unavailable") from exc
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


def _git_is_ancestor(ancestor: str, descendant: str) -> bool:
    completed = subprocess.run(
        ("git", "merge-base", "--is-ancestor", ancestor, descendant),
        cwd=_repo_root(),
        check=False,
        capture_output=True,
    )
    return completed.returncode == 0


def _validated_concordance_acceptance_record() -> dict:
    path = _repo_root() / LONGITUDINAL_ACCEPTED_CONCORDANCE_RECORD_PATH
    if _file_sha256(path) != LONGITUDINAL_ACCEPTED_CONCORDANCE_RECORD_SHA256:
        raise ReplicatedValidationError("accepted concordance record hash mismatch")
    record = read_json(path)
    if not isinstance(record, dict):
        raise ReplicatedValidationError("accepted concordance record is malformed")
    source = record.get("source_evidence")
    next_step = record.get("next_step_state")
    if not isinstance(source, dict):
        raise ReplicatedValidationError(
            "accepted concordance record source evidence is malformed"
        )
    try:
        full_artifact_hash = _file_sha256(
            _repo_root() / LONGITUDINAL_ACCEPTED_CONCORDANCE_ARTIFACT_PATH
        )
        compact_summary_hash = _file_sha256(
            _repo_root() / LONGITUDINAL_ACCEPTED_CONCORDANCE_COMPACT_SUMMARY_PATH
        )
    except OSError as exc:
        raise ReplicatedValidationError(
            "accepted concordance evidence files are unavailable"
        ) from exc
    if (
        record.get("overall_decision") != "GO"
        or record.get("reviewed_implementation_commit")
        != LONGITUDINAL_ACCEPTED_CONCORDANCE_REVIEWED_COMMIT
        or source.get("full_artifact_path")
        != LONGITUDINAL_ACCEPTED_CONCORDANCE_ARTIFACT_PATH
        or source.get("full_artifact_sha256")
        != LONGITUDINAL_ACCEPTED_CONCORDANCE_ARTIFACT_SHA256
        or full_artifact_hash != LONGITUDINAL_ACCEPTED_CONCORDANCE_ARTIFACT_SHA256
        or source.get("compact_summary_path")
        != LONGITUDINAL_ACCEPTED_CONCORDANCE_COMPACT_SUMMARY_PATH
        or source.get("compact_summary_sha256")
        != LONGITUDINAL_ACCEPTED_CONCORDANCE_COMPACT_SUMMARY_SHA256
        or compact_summary_hash
        != LONGITUDINAL_ACCEPTED_CONCORDANCE_COMPACT_SUMMARY_SHA256
        or source.get("requirements_lock_hash")
        != _file_sha256(_repo_root() / "inference/requirements.lock")
        or not isinstance(next_step, dict)
        or next_step.get("replicated_validation_unblocked") is not True
        or next_step.get("replicated_validation_complete") is not False
        or next_step.get("full_longitudinal_proof_complete") is not False
    ):
        raise ReplicatedValidationError(
            "accepted concordance record does not unblock this runner"
        )
    return record


def build_execution_identity(*, require_clean: bool) -> ExecutionIdentity:
    plan_hash = longitudinal_replicated_validation_plan()["plan_hash"]
    implementation = runner_implementation_manifest()
    commit = _git_output("rev-parse", "HEAD")
    if not _COMMIT_RE.fullmatch(commit):
        raise ReplicatedValidationError("source commit must be a full Git SHA-1")
    worktree_status = _git_output(
        "status",
        "--porcelain",
        "--ignored=matching",
        "--untracked-files=all",
    )
    clean = worktree_status == "" and _governed_sources_match_head()
    if require_clean and not clean:
        raise ReplicatedValidationError(
            "full replicated validation requires an entirely clean worktree"
        )
    if require_clean and not os.sys.dont_write_bytecode:
        raise ReplicatedValidationError(
            "full replicated validation requires Python bytecode writes disabled"
        )
    if (os.sys.version_info.major, os.sys.version_info.minor) != (3, 13):
        raise ReplicatedValidationError(
            "replicated validation requires the pinned Python 3.13 runtime"
        )
    runtime = {
        "python": (
            f"{os.sys.version_info.major}.{os.sys.version_info.minor}."
            f"{os.sys.version_info.micro}"
        )
    }
    for package, expected_version in _EXPECTED_RUNTIME_PACKAGE_VERSIONS.items():
        actual_version = importlib.metadata.version(package)
        if actual_version != expected_version:
            raise ReplicatedValidationError(
                f"replicated validation requires pinned {package} {expected_version}"
            )
        runtime[package] = actual_version
    runtime["platform_system"] = platform.system()
    runtime["platform_machine"] = platform.machine()
    runtime["python_implementation"] = platform.python_implementation()
    runtime["numpy_build_config_hash"] = sha256_json(np.__config__.CONFIG)
    runtime["blas_thread_env_hash"] = sha256_json(
        {
            name: os.environ.get(name)
            for name in (
                "OPENBLAS_NUM_THREADS",
                "OMP_NUM_THREADS",
                "MKL_NUM_THREADS",
                "VECLIB_MAXIMUM_THREADS",
            )
        }
    )
    _validated_concordance_acceptance_record()
    concordance_is_ancestor = _git_is_ancestor(
        LONGITUDINAL_ACCEPTED_CONCORDANCE_REVIEWED_COMMIT, commit
    )
    if not concordance_is_ancestor:
        raise ReplicatedValidationError(
            "accepted concordance commit is not an ancestor of the runner"
        )
    body = {
        "source_commit": commit,
        "source_tree_clean": clean,
        "implementation_hash": implementation["implementation_hash"],
        "requirements_lock_hash": _file_sha256(
            _repo_root() / "inference/requirements.lock"
        ),
        "runtime": runtime,
        "plan_hash": plan_hash,
        "accepted_concordance_record_hash": (
            LONGITUDINAL_ACCEPTED_CONCORDANCE_RECORD_SHA256
        ),
        "accepted_concordance_artifact_hash": (
            LONGITUDINAL_ACCEPTED_CONCORDANCE_ARTIFACT_SHA256
        ),
        "accepted_concordance_reviewed_commit": (
            LONGITUDINAL_ACCEPTED_CONCORDANCE_REVIEWED_COMMIT
        ),
        "accepted_concordance_commit_is_ancestor": concordance_is_ancestor,
    }
    return ExecutionIdentity(**body, identity_hash=sha256_json(body))


def _fit_binding_hash(
    *,
    case_binding_hash: str,
    truth_effect_size_sd: float,
    posterior_mean: float,
    posterior_sd: float,
    interval_80_lower: float,
    interval_80_upper: float,
    interval_covers_truth: bool,
    internal_validation_signal_detected: bool,
    integration_diagnostics: dict,
) -> str:
    return sha256_json(
        {
            "case_binding_hash": case_binding_hash,
            "truth_effect_size_sd": truth_effect_size_sd,
            "posterior_summary": {
                "posterior_mean": posterior_mean,
                "posterior_sd": posterior_sd,
                "credible_interval_80": {
                    "lower": interval_80_lower,
                    "upper": interval_80_upper,
                },
            },
            "interval_covers_truth": interval_covers_truth,
            "internal_validation_signal_detected": (
                internal_validation_signal_detected
            ),
            "integration_diagnostics": integration_diagnostics,
        }
    )


def _slot_result_with_hash(**kwargs) -> CalibrationSlotResult:
    unbound = CalibrationSlotResult(**kwargs)
    return CalibrationSlotResult(
        **{**kwargs, "result_hash": sha256_json(unbound.body_without_hash())}
    )


def _compact_integration_diagnostics(fit: DeterministicStateSpaceFit) -> dict:
    diagnostics = fit.integration_diagnostics
    return {
        "status": diagnostics["status"],
        "point_count": diagnostics["point_count"],
        "finite_point_count": diagnostics["finite_point_count"],
        "effective_sample_size": diagnostics["effective_sample_size"],
        "compiled_min_effective_sample_size": diagnostics[
            "compiled_min_effective_sample_size"
        ],
        "max_normalized_weight": diagnostics["max_normalized_weight"],
        "compiled_max_normalized_weight": diagnostics[
            "compiled_max_normalized_weight"
        ],
        "negative_log_posterior_at_mode": diagnostics[
            "negative_log_posterior_at_mode"
        ],
        "hessian_condition_number": diagnostics["hessian_condition_number"],
        "random_numbers_used": diagnostics["random_numbers_used"],
        "seed_used_for_computation": diagnostics["seed_used_for_computation"],
    }


def run_calibration_slot(
    slot: CalibrationSlot,
    *,
    execution_identity: ExecutionIdentity,
    execution_mode: Literal["full", "canary", "smoke"],
) -> CalibrationSlotResult:
    if slot not in required_calibration_slots():
        raise ValueError("calibration slot is not in the compiled plan")
    if execution_mode not in ("full", "canary", "smoke"):
        raise ValueError("execution_mode must be full, canary, or smoke")
    if execution_identity.plan_hash != longitudinal_replicated_validation_plan()[
        "plan_hash"
    ]:
        raise ValueError("execution identity does not bind the compiled plan")
    if (
        slot.aggregate_measurement_cell_k
        != LONGITUDINAL_REPLICATED_VALIDATION_AGGREGATE_K
    ):
        raise ValueError("calibration slots require compiled aggregate k=16")

    stage = "generate"
    prepared = None
    truth_hash = None
    case_hash = None
    try:
        case = generate_longitudinal_validation_case(
            effect_size_sd=slot.effect_size_sd,
            panel_group_count=slot.panel_group_count,
            seed=slot.seed,
        )
        truth_hash = sha256_json(asdict(case.truth))
        stage = "prepare"
        prepared = prepare_longitudinal_state_space(case.dataset)
        case_hash = sha256_json(
            {
                "slot": slot.to_dict(),
                "truth_receipt_hash": truth_hash,
                "prepared_input_hash": prepared.prepared_input_hash,
                "model_input_hash": prepared.model_input_hash,
                "context_binding_hash": prepared.context_binding_hash,
                "execution_identity_hash": execution_identity.identity_hash,
            }
        )
        stage = "fit"
        fit = fit_deterministic_state_space(prepared, seed=slot.seed)
        stage = "summarize"
        movement = fit.summary_by_name()["longitudinal_movement"]
        truth = float(case.truth.realized_effect_size_sd)
        values = (
            truth,
            movement.posterior_mean,
            movement.posterior_sd,
            movement.interval_80_lower,
            movement.interval_80_upper,
        )
        if not all(math.isfinite(value) for value in values):
            raise ValueError("calibration summary must be finite")
        if movement.posterior_sd <= 0.0:
            raise ValueError("calibration posterior SD must be positive")
        if movement.interval_80_lower > movement.interval_80_upper:
            raise ValueError("calibration interval endpoints must be ordered")
        if not math.isclose(
            truth, slot.effect_size_sd, rel_tol=0.0, abs_tol=1e-10
        ):
            raise ValueError("synthetic truth does not match the compiled slot")
        covered = movement.interval_80_lower <= truth <= movement.interval_80_upper
        signal = (
            abs(movement.posterior_mean / movement.posterior_sd)
            > LONGITUDINAL_REPLICATED_VALIDATION_NULL_SIGNAL_Z
        )
        compact_diagnostics = _compact_integration_diagnostics(fit)
        if (
            compact_diagnostics["status"] != "PASS"
            or compact_diagnostics["effective_sample_size"]
            < compact_diagnostics["compiled_min_effective_sample_size"]
            or compact_diagnostics["max_normalized_weight"]
            > compact_diagnostics["compiled_max_normalized_weight"]
        ):
            raise ValueError("deterministic integration diagnostics failed")
    except Exception as exc:
        return _slot_result_with_hash(
            slot=slot,
            execution_mode=execution_mode,
            status="HOLD",
            failing_checks=("runner_error",),
            truth_effect_size_sd=None,
            posterior_mean=None,
            posterior_sd=None,
            interval_80_lower=None,
            interval_80_upper=None,
            interval_covers_truth=None,
            internal_validation_signal_detected=None,
            prepared_input_hash=(prepared.prepared_input_hash if prepared else None),
            model_input_hash=(prepared.model_input_hash if prepared else None),
            context_binding_hash=(prepared.context_binding_hash if prepared else None),
            truth_receipt_hash=truth_hash,
            case_binding_hash=case_hash,
            fit_summary_hash=None,
            integration_diagnostics=None,
            execution_identity_hash=execution_identity.identity_hash,
            runner_error_stage=stage,
            runner_error_type=type(exc).__name__,
        )

    return _slot_result_with_hash(
        slot=slot,
        execution_mode=execution_mode,
        status="PASS",
        failing_checks=(),
        truth_effect_size_sd=truth,
        posterior_mean=float(movement.posterior_mean),
        posterior_sd=float(movement.posterior_sd),
        interval_80_lower=float(movement.interval_80_lower),
        interval_80_upper=float(movement.interval_80_upper),
        interval_covers_truth=bool(covered),
        internal_validation_signal_detected=bool(signal),
        prepared_input_hash=prepared.prepared_input_hash,
        model_input_hash=prepared.model_input_hash,
        context_binding_hash=prepared.context_binding_hash,
        truth_receipt_hash=truth_hash,
        case_binding_hash=case_hash,
        fit_summary_hash=_fit_binding_hash(
            case_binding_hash=case_hash,
            truth_effect_size_sd=truth,
            posterior_mean=float(movement.posterior_mean),
            posterior_sd=float(movement.posterior_sd),
            interval_80_lower=float(movement.interval_80_lower),
            interval_80_upper=float(movement.interval_80_upper),
            interval_covers_truth=bool(covered),
            internal_validation_signal_detected=bool(signal),
            integration_diagnostics=compact_diagnostics,
        ),
        integration_diagnostics=compact_diagnostics,
        execution_identity_hash=execution_identity.identity_hash,
    )


def validate_calibration_slot_result(
    result: CalibrationSlotResult,
    *,
    expected_slot: CalibrationSlot | None = None,
    expected_identity: ExecutionIdentity | None = None,
) -> CalibrationSlotResult:
    if not isinstance(result, CalibrationSlotResult):
        raise ValueError("calibration result has the wrong type")
    if result.slot not in required_calibration_slots():
        raise ValueError("calibration result is off plan")
    if expected_slot is not None and result.slot != expected_slot:
        raise ValueError("calibration result slot identity mismatch")
    if expected_identity is not None and (
        result.execution_identity_hash != expected_identity.identity_hash
    ):
        raise ValueError("calibration result execution identity mismatch")
    if result.result_hash != sha256_json(result.body_without_hash()):
        raise ValueError("calibration result hash mismatch")
    if result.passed:
        values = (
            result.truth_effect_size_sd,
            result.posterior_mean,
            result.posterior_sd,
            result.interval_80_lower,
            result.interval_80_upper,
        )
        if any(value is None or not math.isfinite(value) for value in values):
            raise ValueError("passing calibration result requires finite summaries")
        assert result.truth_effect_size_sd is not None
        assert result.posterior_mean is not None
        assert result.posterior_sd is not None
        assert result.interval_80_lower is not None
        assert result.interval_80_upper is not None
        if result.posterior_sd <= 0.0:
            raise ValueError("passing calibration result requires positive SD")
        if result.interval_80_lower > result.interval_80_upper:
            raise ValueError("passing calibration interval endpoints must be ordered")
        expected_coverage = (
            result.interval_80_lower
            <= result.truth_effect_size_sd
            <= result.interval_80_upper
        )
        expected_signal = (
            abs(result.posterior_mean / result.posterior_sd)
            > LONGITUDINAL_REPLICATED_VALIDATION_NULL_SIGNAL_Z
        )
        if result.interval_covers_truth is not expected_coverage:
            raise ValueError("coverage flag must be derived from the interval")
        if result.internal_validation_signal_detected is not expected_signal:
            raise ValueError("internal signal flag must be derived from mean and SD")
        if not math.isclose(
            result.truth_effect_size_sd,
            result.slot.effect_size_sd,
            rel_tol=0.0,
            abs_tol=1e-10,
        ):
            raise ValueError("calibration truth must match the compiled slot")
        if any(
            value is None or not _SHA256_RE.fullmatch(value)
            for value in (
                result.prepared_input_hash,
                result.model_input_hash,
                result.context_binding_hash,
                result.truth_receipt_hash,
                result.case_binding_hash,
                result.fit_summary_hash,
            )
        ):
            raise ValueError("passing calibration result requires every hash binding")
        if result.integration_diagnostics is None:
            raise ValueError("passing calibration result requires diagnostics")
        _validate_integration_diagnostics(result.integration_diagnostics)
        expected_case_hash = sha256_json(
            {
                "slot": result.slot.to_dict(),
                "truth_receipt_hash": result.truth_receipt_hash,
                "prepared_input_hash": result.prepared_input_hash,
                "model_input_hash": result.model_input_hash,
                "context_binding_hash": result.context_binding_hash,
                "execution_identity_hash": result.execution_identity_hash,
            }
        )
        if result.case_binding_hash != expected_case_hash:
            raise ValueError("calibration case binding hash must be derived")
        if result.fit_summary_hash != _fit_binding_hash(
            case_binding_hash=expected_case_hash,
            truth_effect_size_sd=result.truth_effect_size_sd,
            posterior_mean=result.posterior_mean,
            posterior_sd=result.posterior_sd,
            interval_80_lower=result.interval_80_lower,
            interval_80_upper=result.interval_80_upper,
            interval_covers_truth=expected_coverage,
            internal_validation_signal_detected=expected_signal,
            integration_diagnostics=result.integration_diagnostics,
        ):
            raise ValueError("calibration fit summary hash must be derived")
        if result.runner_error_stage is not None or result.runner_error_type is not None:
            raise ValueError("passing calibration result cannot carry a runner error")
    else:
        if result.status != "HOLD" or not result.failing_checks:
            raise ValueError("non-passing calibration result must HOLD with failures")
    return result


def _validate_integration_diagnostics(value: dict) -> None:
    expected_keys = {
        "status",
        "point_count",
        "finite_point_count",
        "effective_sample_size",
        "compiled_min_effective_sample_size",
        "max_normalized_weight",
        "compiled_max_normalized_weight",
        "negative_log_posterior_at_mode",
        "hessian_condition_number",
        "random_numbers_used",
        "seed_used_for_computation",
    }
    _require_exact_keys(value, expected_keys, "integration diagnostics")
    if (
        value["status"] != "PASS"
        or value["point_count"] != 8192
        or isinstance(value["finite_point_count"], bool)
        or not isinstance(value["finite_point_count"], int)
        or not 4096 <= value["finite_point_count"] <= 8192
        or value["compiled_min_effective_sample_size"] != 256.0
        or value["compiled_max_normalized_weight"] != 0.05
        or value["random_numbers_used"] is not False
        or value["seed_used_for_computation"] is not False
    ):
        raise ValueError("integration diagnostics do not match compiled settings")
    effective_sample_size = _strict_finite(
        value["effective_sample_size"], "integration effective sample size"
    )
    max_weight = _strict_finite(
        value["max_normalized_weight"], "integration max weight"
    )
    _strict_finite(
        value["negative_log_posterior_at_mode"],
        "integration negative log posterior",
    )
    condition_number = _strict_finite(
        value["hessian_condition_number"], "integration condition number"
    )
    if effective_sample_size < 256.0 or not 0.0 <= max_weight <= 0.05:
        raise ValueError("integration diagnostics failed compiled stability gates")
    if condition_number <= 0.0:
        raise ValueError("integration Hessian condition number must be positive")


def recompute_calibration_case_receipt(
    result: CalibrationSlotResult,
) -> CalibrationSlotResult:
    """Regenerate deterministic case/input receipts before durable combine."""

    validate_calibration_slot_result(result)
    if not result.passed:
        return result
    case = generate_longitudinal_validation_case(
        effect_size_sd=result.slot.effect_size_sd,
        panel_group_count=result.slot.panel_group_count,
        seed=result.slot.seed,
    )
    truth_hash = sha256_json(asdict(case.truth))
    prepared = prepare_longitudinal_state_space(case.dataset)
    expected_case_hash = sha256_json(
        {
            "slot": result.slot.to_dict(),
            "truth_receipt_hash": truth_hash,
            "prepared_input_hash": prepared.prepared_input_hash,
            "model_input_hash": prepared.model_input_hash,
            "context_binding_hash": prepared.context_binding_hash,
            "execution_identity_hash": result.execution_identity_hash,
        }
    )
    expected = (
        float(case.truth.realized_effect_size_sd),
        prepared.prepared_input_hash,
        prepared.model_input_hash,
        prepared.context_binding_hash,
        truth_hash,
        expected_case_hash,
        prepared.panel_group_count,
        len(case.truth.panel_group_effects),
    )
    observed = (
        result.truth_effect_size_sd,
        result.prepared_input_hash,
        result.model_input_hash,
        result.context_binding_hash,
        result.truth_receipt_hash,
        result.case_binding_hash,
        result.slot.panel_group_count,
        result.slot.panel_group_count,
    )
    if observed != expected:
        raise ValueError("calibration checkpoint failed deterministic case recomputation")
    return result


def calibration_slot_result_from_dict(value: object) -> CalibrationSlotResult:
    record = _strict_record(value, "calibration slot result")
    _require_exact_keys(
        record,
        {
            "slot_id",
            "cell_id",
            "effect_size_sd",
            "panel_group_count",
            "replication_index",
            "seed",
            "aggregate_measurement_cell_k",
            "execution_mode",
            "status",
            "failing_checks",
            "truth_effect_size_sd",
            "posterior_summary",
            "interval_covers_truth",
            "internal_validation_signal_detected",
            "prepared_input_hash",
            "model_input_hash",
            "context_binding_hash",
            "truth_receipt_hash",
            "case_binding_hash",
            "fit_summary_hash",
            "integration_diagnostics",
            "execution_identity_hash",
            "runner_error_stage",
            "runner_error_type",
            "result_hash",
        },
        "calibration slot result",
    )
    effect = _strict_finite(record["effect_size_sd"], "effect_size_sd")
    groups = _strict_int(record["panel_group_count"], "panel_group_count")
    replication_index = _strict_int(
        record["replication_index"], "replication_index"
    )
    seed = _strict_int(record["seed"], "seed")
    slot = CalibrationSlot(effect, groups, replication_index, seed)
    if record["slot_id"] != slot.slot_id or record["cell_id"] != slot.cell_id:
        raise ValueError("calibration slot IDs must be derived")
    if (
        _strict_int(
            record["aggregate_measurement_cell_k"],
            "aggregate_measurement_cell_k",
        )
        != LONGITUDINAL_REPLICATED_VALIDATION_AGGREGATE_K
    ):
        raise ValueError("calibration result aggregate k must equal 16")
    posterior = record["posterior_summary"]
    if posterior is None:
        posterior_mean = posterior_sd = lower = upper = None
    else:
        posterior_record = _strict_record(posterior, "posterior_summary")
        _require_exact_keys(
            posterior_record,
            {"posterior_mean", "posterior_sd", "credible_interval_80"},
            "posterior_summary",
        )
        interval = _strict_record(
            posterior_record["credible_interval_80"], "credible_interval_80"
        )
        _require_exact_keys(interval, {"lower", "upper"}, "credible_interval_80")
        posterior_mean = _strict_finite(
            posterior_record["posterior_mean"], "posterior_mean"
        )
        posterior_sd = _strict_finite(
            posterior_record["posterior_sd"], "posterior_sd"
        )
        lower = _strict_finite(interval["lower"], "interval lower")
        upper = _strict_finite(interval["upper"], "interval upper")
    execution_mode = record["execution_mode"]
    status = record["status"]
    if execution_mode not in {"full", "canary", "smoke"}:
        raise ValueError("calibration result execution mode is invalid")
    if status not in {"PASS", "HOLD"}:
        raise ValueError("calibration result status is invalid")
    failures = _strict_string_tuple(record["failing_checks"], "failing_checks")
    result = CalibrationSlotResult(
        slot=slot,
        execution_mode=execution_mode,
        status=status,
        failing_checks=failures,
        truth_effect_size_sd=_optional_finite(
            record["truth_effect_size_sd"], "truth_effect_size_sd"
        ),
        posterior_mean=posterior_mean,
        posterior_sd=posterior_sd,
        interval_80_lower=lower,
        interval_80_upper=upper,
        interval_covers_truth=_optional_bool(
            record["interval_covers_truth"], "interval_covers_truth"
        ),
        internal_validation_signal_detected=_optional_bool(
            record["internal_validation_signal_detected"],
            "internal_validation_signal_detected",
        ),
        prepared_input_hash=_optional_sha256(
            record["prepared_input_hash"], "prepared_input_hash"
        ),
        model_input_hash=_optional_sha256(
            record["model_input_hash"], "model_input_hash"
        ),
        context_binding_hash=_optional_sha256(
            record["context_binding_hash"], "context_binding_hash"
        ),
        truth_receipt_hash=_optional_sha256(
            record["truth_receipt_hash"], "truth_receipt_hash"
        ),
        case_binding_hash=_optional_sha256(
            record["case_binding_hash"], "case_binding_hash"
        ),
        fit_summary_hash=_optional_sha256(
            record["fit_summary_hash"], "fit_summary_hash"
        ),
        integration_diagnostics=(
            None
            if record["integration_diagnostics"] is None
            else _strict_record(
                record["integration_diagnostics"], "integration_diagnostics"
            )
        ),
        execution_identity_hash=_strict_sha256(
            record["execution_identity_hash"], "execution_identity_hash"
        ),
        runner_error_stage=_optional_string(
            record["runner_error_stage"], "runner_error_stage"
        ),
        runner_error_type=_optional_string(
            record["runner_error_type"], "runner_error_type"
        ),
        result_hash=_strict_sha256(record["result_hash"], "result_hash"),
    )
    return validate_calibration_slot_result(result)


def execution_identity_from_dict(value: object) -> ExecutionIdentity:
    record = _strict_record(value, "execution identity")
    _require_exact_keys(
        record,
        {
            "source_commit",
            "source_tree_clean",
            "implementation_hash",
            "requirements_lock_hash",
            "runtime",
            "plan_hash",
            "accepted_concordance_record_hash",
            "accepted_concordance_artifact_hash",
            "accepted_concordance_reviewed_commit",
            "accepted_concordance_commit_is_ancestor",
            "identity_hash",
        },
        "execution identity",
    )
    runtime_record = _strict_record(record["runtime"], "runtime")
    runtime_keys = (
        "python",
        "pymc",
        "arviz",
        "numpy",
        "scipy",
        "platform_system",
        "platform_machine",
        "python_implementation",
        "numpy_build_config_hash",
        "blas_thread_env_hash",
    )
    if set(runtime_record) != set(runtime_keys):
        raise ValueError("runtime manifest must contain the compiled packages")
    runtime = {
        key: _strict_string(runtime_record[key], f"runtime.{key}")
        for key in runtime_keys
    }
    for key in ("numpy_build_config_hash", "blas_thread_env_hash"):
        _strict_sha256(runtime[key], f"runtime.{key}")
    identity = ExecutionIdentity(
        source_commit=_strict_string(record["source_commit"], "source_commit"),
        source_tree_clean=_strict_bool(
            record["source_tree_clean"], "source_tree_clean"
        ),
        implementation_hash=_strict_sha256(
            record["implementation_hash"], "implementation_hash"
        ),
        requirements_lock_hash=_strict_sha256(
            record["requirements_lock_hash"], "requirements_lock_hash"
        ),
        runtime=runtime,
        plan_hash=_strict_sha256(record["plan_hash"], "plan_hash"),
        accepted_concordance_record_hash=_strict_sha256(
            record["accepted_concordance_record_hash"],
            "accepted_concordance_record_hash",
        ),
        accepted_concordance_artifact_hash=_strict_sha256(
            record["accepted_concordance_artifact_hash"],
            "accepted_concordance_artifact_hash",
        ),
        accepted_concordance_reviewed_commit=_strict_string(
            record["accepted_concordance_reviewed_commit"],
            "accepted_concordance_reviewed_commit",
        ),
        accepted_concordance_commit_is_ancestor=_strict_bool(
            record["accepted_concordance_commit_is_ancestor"],
            "accepted_concordance_commit_is_ancestor",
        ),
        identity_hash=_strict_sha256(record["identity_hash"], "identity_hash"),
    )
    if not _COMMIT_RE.fullmatch(identity.source_commit):
        raise ValueError("execution identity source commit is invalid")
    if identity.identity_hash != sha256_json(identity.body_without_hash()):
        raise ValueError("execution identity hash mismatch")
    if identity.plan_hash != longitudinal_replicated_validation_plan()["plan_hash"]:
        raise ValueError("execution identity plan hash mismatch")
    if (
        identity.accepted_concordance_record_hash
        != LONGITUDINAL_ACCEPTED_CONCORDANCE_RECORD_SHA256
        or identity.accepted_concordance_artifact_hash
        != LONGITUDINAL_ACCEPTED_CONCORDANCE_ARTIFACT_SHA256
        or identity.accepted_concordance_reviewed_commit
        != LONGITUDINAL_ACCEPTED_CONCORDANCE_REVIEWED_COMMIT
        or identity.accepted_concordance_commit_is_ancestor is not True
        or not _git_is_ancestor(
            identity.accepted_concordance_reviewed_commit,
            identity.source_commit,
        )
    ):
        raise ValueError("execution identity concordance binding is invalid")
    return identity


def assemble_calibration_chunk(
    *,
    chunk_index: int,
    slot_results: Sequence[CalibrationSlotResult],
    execution_identity: ExecutionIdentity,
    execution_mode: Literal["full", "canary", "smoke"],
) -> CalibrationChunkResult:
    chunk = calibration_chunk_plan(chunk_index)
    expected_slots = tuple(
        slot
        for slot in required_calibration_slots()
        if slot.slot_id in chunk["slot_ids"]
    )
    results = tuple(slot_results)
    if len(results) != len(expected_slots):
        raise ValueError("calibration chunk must contain its exact 60 slots")
    for expected, result in zip(expected_slots, results):
        validate_calibration_slot_result(
            result,
            expected_slot=expected,
            expected_identity=execution_identity,
        )
        if result.execution_mode != execution_mode:
            raise ValueError("calibration chunk execution modes must match")
    unbound = CalibrationChunkResult(
        chunk_index=chunk_index,
        execution_mode=execution_mode,
        slot_results=results,
        execution_identity=execution_identity,
        chunk_hash="",
    )
    return CalibrationChunkResult(
        chunk_index=chunk_index,
        execution_mode=execution_mode,
        slot_results=results,
        execution_identity=execution_identity,
        chunk_hash=sha256_json(unbound.body_without_hash()),
    )


def calibration_chunk_result_from_dict(
    value: object, *, include_slot_results: Sequence[CalibrationSlotResult]
) -> CalibrationChunkResult:
    record = _strict_record(value, "calibration chunk")
    _require_exact_keys(
        record,
        {
            "report_class",
            "plan_version",
            "plan_hash",
            "chunk_index",
            "chunk_id",
            "execution_mode",
            "expected_slot_count",
            "slot_ids",
            "slot_result_hashes",
            "execution_identity",
            "internal_only",
            "synthetic_only",
            "customer_output_authorized",
            "chunk_hash",
        },
        "calibration chunk",
    )
    if record["report_class"] != "longitudinal_replicated_validation_chunk_v1":
        raise ValueError("calibration chunk report class is invalid")
    if record["plan_version"] != LONGITUDINAL_REPLICATED_VALIDATION_PLAN_VERSION:
        raise ValueError("calibration chunk plan version is invalid")
    if (
        record["internal_only"] is not True
        or record["synthetic_only"] is not True
        or record["customer_output_authorized"] is not False
    ):
        raise ValueError("calibration chunk governance pins are invalid")
    identity = execution_identity_from_dict(record["execution_identity"])
    chunk_index = _strict_int(record["chunk_index"], "chunk_index")
    execution_mode = record["execution_mode"]
    if execution_mode not in {"full", "canary", "smoke"}:
        raise ValueError("calibration chunk execution mode is invalid")
    chunk = assemble_calibration_chunk(
        chunk_index=chunk_index,
        slot_results=include_slot_results,
        execution_identity=identity,
        execution_mode=execution_mode,
    )
    if not strict_json_equal(record, chunk.to_dict()):
        raise ValueError("calibration chunk failed exact recomputation")
    return chunk


def _slot_path(workspace: Path, slot: CalibrationSlot) -> Path:
    return replicated_validation_workspace_path(
        workspace, "calibration_slots", f"{slot.slot_id}.json"
    )


def _chunk_path(workspace: Path, chunk_index: int) -> Path:
    return replicated_validation_workspace_path(
        workspace, "calibration_chunks", f"chunk_{chunk_index:02d}.json"
    )


def _plan_path(workspace: Path) -> Path:
    return replicated_validation_workspace_path(workspace, "plan.json")


def replicated_validation_workspace_path(workspace: Path, *parts: str) -> Path:
    """Return a checkpoint path only when no child symlink escapes the workspace."""

    candidate = workspace.joinpath(*parts)
    try:
        candidate.relative_to(workspace)
    except ValueError as exc:
        raise ReplicatedValidationWorkspaceError(
            "replicated-validation checkpoint path escapes its workspace"
        ) from exc
    current = candidate
    while current != workspace:
        if current.is_symlink():
            raise ReplicatedValidationWorkspaceError(
                "replicated-validation checkpoint paths must not contain symlinks"
            )
        if current == current.parent:
            raise ReplicatedValidationWorkspaceError(
                "replicated-validation checkpoint path escapes its workspace"
            )
        current = current.parent
    resolved = candidate.resolve(strict=False)
    if resolved != workspace and workspace not in resolved.parents:
        raise ReplicatedValidationWorkspaceError(
            "replicated-validation checkpoint path escapes its workspace"
        )
    return candidate


def _same_existing_filesystem_path(left: Path, right: Path) -> bool:
    try:
        return os.path.samefile(left, right)
    except OSError:
        return False


def initialize_replicated_validation_workspace(workspace_dir: str | Path) -> Path:
    requested = Path(os.path.abspath(Path(workspace_dir).expanduser()))
    if any(candidate.is_symlink() for candidate in (requested, *requested.parents)):
        raise ReplicatedValidationWorkspaceError(
            "replicated-validation checkpoint roots must not contain symlinks"
        )
    workspace = requested.resolve()
    repo_root = _repo_root()
    workspace_chain = (workspace, *workspace.parents)
    if any(
        _same_existing_filesystem_path(candidate, repo_root)
        for candidate in workspace_chain
    ):
        raise ReplicatedValidationWorkspaceError(
            "replicated-validation checkpoints must remain outside the repository"
        )
    workspace.mkdir(parents=True, exist_ok=True)
    if any(candidate.is_symlink() for candidate in workspace.rglob("*")):
        raise ReplicatedValidationWorkspaceError(
            "replicated-validation checkpoint workspaces must not contain symlinks"
        )
    plan_path = _plan_path(workspace)
    plan = longitudinal_replicated_validation_plan()
    if plan_path.exists():
        existing = read_json(plan_path)
        if not strict_json_equal(existing, plan):
            raise ReplicatedValidationWorkspaceError(
                "workspace plan does not match the compiled runner plan"
            )
    else:
        write_json_atomic(plan_path, plan)
    return workspace


def run_calibration_chunk(
    *, chunk_index: int, workspace_dir: str | Path
) -> CalibrationChunkResult:
    workspace = initialize_replicated_validation_workspace(workspace_dir)
    identity = build_execution_identity(require_clean=True)
    plan = calibration_chunk_plan(chunk_index)
    slots_by_id = {slot.slot_id: slot for slot in required_calibration_slots()}
    results: list[CalibrationSlotResult] = []
    for slot_id in plan["slot_ids"]:
        slot = slots_by_id[slot_id]
        path = _slot_path(workspace, slot)
        if path.exists():
            try:
                result = calibration_slot_result_from_dict(read_json(path))
                validate_calibration_slot_result(
                    result, expected_slot=slot, expected_identity=identity
                )
                recompute_calibration_case_receipt(result)
            except Exception as exc:
                raise ReplicatedValidationWorkspaceError(
                    f"existing calibration slot is invalid: {slot.slot_id}"
                ) from exc
        else:
            result = run_calibration_slot(
                slot, execution_identity=identity, execution_mode="full"
            )
            write_json_atomic(path, result.to_dict())
        results.append(result)
    chunk = assemble_calibration_chunk(
        chunk_index=chunk_index,
        slot_results=results,
        execution_identity=identity,
        execution_mode="full",
    )
    chunk_path = _chunk_path(workspace, chunk_index)
    if chunk_path.exists():
        existing = read_json(chunk_path)
        if not strict_json_equal(existing, chunk.to_dict()):
            raise ReplicatedValidationWorkspaceError(
                f"existing chunk manifest is invalid: {chunk_index}"
            )
    else:
        write_json_atomic(chunk_path, chunk.to_dict())
    return chunk


def load_complete_calibration_workspace(
    workspace_dir: str | Path,
) -> tuple[ExecutionIdentity, tuple[CalibrationChunkResult, ...], tuple[CalibrationSlotResult, ...]]:
    workspace = initialize_replicated_validation_workspace(workspace_dir)
    chunks: list[CalibrationChunkResult] = []
    all_results: list[CalibrationSlotResult] = []
    identity: ExecutionIdentity | None = None
    planned_slots = required_calibration_slots()
    slots_by_id = {slot.slot_id: slot for slot in planned_slots}
    expected_slot_files = {
        f"{slot.slot_id}.json" for slot in planned_slots
    }
    actual_slot_files = {
        path.name
        for path in replicated_validation_workspace_path(
            workspace, "calibration_slots"
        ).glob("*.json")
    }
    expected_chunk_files = {
        f"chunk_{index:02d}.json"
        for index in range(LONGITUDINAL_REPLICATED_VALIDATION_CHUNK_COUNT)
    }
    actual_chunk_files = {
        path.name
        for path in replicated_validation_workspace_path(
            workspace, "calibration_chunks"
        ).glob("*.json")
    }
    if actual_slot_files != expected_slot_files:
        raise ReplicatedValidationWorkspaceError(
            "calibration workspace slot file manifest is not exact"
        )
    if actual_chunk_files != expected_chunk_files:
        raise ReplicatedValidationWorkspaceError(
            "calibration workspace chunk file manifest is not exact"
        )
    for chunk_index in range(LONGITUDINAL_REPLICATED_VALIDATION_CHUNK_COUNT):
        chunk_plan = calibration_chunk_plan(chunk_index)
        slot_results = []
        for slot_id in chunk_plan["slot_ids"]:
            slot_path = _slot_path(workspace, slots_by_id[slot_id])
            if not slot_path.is_file():
                raise ReplicatedValidationWorkspaceError(
                    f"calibration workspace is missing slot: {slot_id}"
                )
            result = calibration_slot_result_from_dict(read_json(slot_path))
            try:
                recompute_calibration_case_receipt(result)
            except ValueError as exc:
                raise ReplicatedValidationWorkspaceError(
                    f"calibration slot failed deterministic recomputation: {slot_id}"
                ) from exc
            slot_results.append(result)
        chunk_path = _chunk_path(workspace, chunk_index)
        if not chunk_path.is_file():
            raise ReplicatedValidationWorkspaceError(
                f"calibration workspace is missing chunk: {chunk_index}"
            )
        chunk_record = read_json(chunk_path)
        chunk = calibration_chunk_result_from_dict(
            chunk_record, include_slot_results=slot_results
        )
        if identity is None:
            identity = chunk.execution_identity
        elif chunk.execution_identity != identity:
            raise ReplicatedValidationWorkspaceError(
                "calibration workspace mixes execution identities"
            )
        chunks.append(chunk)
        all_results.extend(chunk.slot_results)
    assert identity is not None
    if not identity.source_tree_clean:
        raise ReplicatedValidationWorkspaceError(
            "full calibration evidence must bind a clean source tree"
        )
    current_identity = build_execution_identity(require_clean=True)
    if current_identity != identity:
        raise ReplicatedValidationWorkspaceError(
            "calibration evidence identity differs from the current runner"
        )
    by_id = {result.slot.slot_id: result for result in all_results}
    if len(by_id) != len(all_results):
        raise ReplicatedValidationWorkspaceError(
            "calibration workspace contains duplicate slot identities"
        )
    ordered_results = tuple(by_id[slot.slot_id] for slot in planned_slots)
    return identity, tuple(chunks), ordered_results


def summarize_calibration_results(
    slot_results: Sequence[CalibrationSlotResult],
    *,
    execution_mode: Literal["full", "canary", "smoke"],
) -> CalibrationStudySummary:
    results = tuple(slot_results)
    planned = required_calibration_slots()
    planned_ids = tuple(slot.slot_id for slot in planned)
    observed_ids = tuple(result.slot.slot_id for result in results)
    duplicates = tuple(
        sorted(
            {
                slot_id
                for slot_id in observed_ids
                if observed_ids.count(slot_id) > 1
            }
        )
    )
    off_plan = tuple(sorted(set(observed_ids).difference(planned_ids)))
    missing = tuple(slot_id for slot_id in planned_ids if slot_id not in observed_ids)
    expected_present_order = tuple(
        slot_id for slot_id in planned_ids if slot_id in observed_ids
    )
    compiled_order = observed_ids == expected_present_order
    result_hashes_valid = True
    for result in results:
        try:
            validate_calibration_slot_result(result)
        except ValueError:
            result_hashes_valid = False
            break
    case_hashes = [
        result.case_binding_hash
        for result in results
        if result.case_binding_hash is not None
    ]
    fit_hashes = [
        result.fit_summary_hash
        for result in results
        if result.fit_summary_hash is not None
    ]
    duplicate_case_hashes = tuple(
        sorted({value for value in case_hashes if case_hashes.count(value) > 1})
    )
    duplicate_fit_hashes = tuple(
        sorted({value for value in fit_hashes if fit_hashes.count(value) > 1})
    )
    identity_hashes = {result.execution_identity_hash for result in results}
    exact_manifest = (
        execution_mode == "full"
        and len(results) == LONGITUDINAL_REPLICATED_VALIDATION_REQUIRED_SLOT_COUNT
        and not missing
        and not duplicates
        and not off_plan
        and not duplicate_case_hashes
        and not duplicate_fit_hashes
        and compiled_order
        and result_hashes_valid
        and len(identity_hashes) == 1
        and all(result.execution_mode == "full" for result in results)
    )
    hard_failure_count = sum(not result.passed for result in results)
    cell_summaries = []
    for effect in LONGITUDINAL_VALIDATION_EFFECT_SIZES_SD:
        for groups in LONGITUDINAL_VALIDATION_PANEL_GROUP_COUNTS:
            cell = tuple(
                result
                for result in results
                if result.slot.effect_size_sd == effect
                and result.slot.panel_group_count == groups
            )
            passing = sum(result.passed for result in cell)
            coverage_count = sum(
                result.interval_covers_truth is True for result in cell
            )
            denominator = LONGITUDINAL_REPLICATED_VALIDATION_REPLICATIONS_PER_CELL
            coverage_rate = coverage_count / denominator
            coverage_se = math.sqrt(
                coverage_rate * (1.0 - coverage_rate) / denominator
            )
            coverage_passed = (
                len(cell) == denominator
                and passing == denominator
                and LONGITUDINAL_REPLICATED_VALIDATION_COVERAGE_COUNT_MIN
                <= coverage_count
                <= LONGITUDINAL_REPLICATED_VALIDATION_COVERAGE_COUNT_MAX
            )
            if effect == 0.0:
                null_signal_count = sum(
                    result.internal_validation_signal_detected is True
                    for result in cell
                )
                null_signal_rate = null_signal_count / denominator
                null_passed = (
                    len(cell) == denominator
                    and passing == denominator
                    and null_signal_count
                    <= LONGITUDINAL_REPLICATED_VALIDATION_NULL_SIGNAL_COUNT_MAX
                )
            else:
                null_signal_count = None
                null_signal_rate = None
                null_passed = None
            cell_summaries.append(
                CalibrationCellSummary(
                    effect_size_sd=float(effect),
                    panel_group_count=int(groups),
                    expected_replication_count=denominator,
                    observed_replication_count=len(cell),
                    passing_row_count=passing,
                    hard_failure_count=len(cell) - passing,
                    coverage_count=coverage_count,
                    coverage_rate=coverage_rate,
                    coverage_standard_error=coverage_se,
                    coverage_gate_passed=coverage_passed,
                    null_signal_count=null_signal_count,
                    null_signal_rate=null_signal_rate,
                    null_gate_passed=null_passed,
                )
            )
    calibration_passed = all(
        summary.coverage_gate_passed for summary in cell_summaries
    )
    null_summaries = [
        summary
        for summary in cell_summaries
        if summary.null_signal_rate is not None
    ]
    null_passed = bool(null_summaries) and all(
        summary.null_gate_passed is True for summary in null_summaries
    )
    worst_null_rate = (
        max(summary.null_signal_rate for summary in null_summaries)
        if null_summaries
        else None
    )
    failures = []
    if execution_mode != "full":
        failures.append("full_execution_required")
    if missing:
        failures.append("missing_slots")
    if duplicates:
        failures.append("duplicate_slots")
    if off_plan:
        failures.append("off_plan_slots")
    if not compiled_order or not result_hashes_valid or len(identity_hashes) != 1:
        failures.append("manifest_integrity")
    if duplicate_case_hashes or duplicate_fit_hashes:
        failures.append("duplicate_evidence_bindings")
    if hard_failure_count:
        failures.append("hard_slot_failures")
    if not calibration_passed:
        failures.append("calibration_coverage")
    if not null_passed:
        failures.append("null_false_signal")
    expected_pass = (
        exact_manifest
        and hard_failure_count == 0
        and calibration_passed
        and null_passed
    )
    body = {
        "execution_mode": execution_mode,
        "cell_summaries": [summary.to_dict() for summary in cell_summaries],
        "expected_slot_count": LONGITUDINAL_REPLICATED_VALIDATION_REQUIRED_SLOT_COUNT,
        "observed_slot_count": len(results),
        "missing_slot_ids": list(missing),
        "duplicate_slot_ids": list(duplicates),
        "off_plan_slot_ids": list(off_plan),
        "duplicate_case_binding_hashes": list(duplicate_case_hashes),
        "duplicate_fit_summary_hashes": list(duplicate_fit_hashes),
        "exact_manifest_complete": exact_manifest,
        "hard_failure_count": hard_failure_count,
        "calibration_gate_passed": calibration_passed,
        "null_gate_passed": null_passed,
        "worst_null_signal_rate": worst_null_rate,
        "study_status": "PASS" if expected_pass else "HOLD",
        "failing_checks": failures,
    }
    return CalibrationStudySummary(
        execution_mode=execution_mode,
        cell_summaries=tuple(cell_summaries),
        expected_slot_count=LONGITUDINAL_REPLICATED_VALIDATION_REQUIRED_SLOT_COUNT,
        observed_slot_count=len(results),
        missing_slot_ids=missing,
        duplicate_slot_ids=duplicates,
        off_plan_slot_ids=off_plan,
        duplicate_case_binding_hashes=duplicate_case_hashes,
        duplicate_fit_summary_hashes=duplicate_fit_hashes,
        exact_manifest_complete=exact_manifest,
        hard_failure_count=hard_failure_count,
        calibration_gate_passed=calibration_passed,
        null_gate_passed=null_passed,
        worst_null_signal_rate=worst_null_rate,
        study_status="PASS" if expected_pass else "HOLD",
        failing_checks=tuple(failures),
        study_result_hash=sha256_json(body),
    )


def run_calibration_canary(*, replication_index: int) -> dict:
    if (
        isinstance(replication_index, bool)
        or not isinstance(replication_index, int)
        or replication_index < 0
        or replication_index
        >= LONGITUDINAL_REPLICATED_VALIDATION_REPLICATIONS_PER_CELL
    ):
        raise ValueError("canary replication index must be in 0..199")
    identity = build_execution_identity(require_clean=False)
    slots = tuple(
        slot
        for slot in required_calibration_slots()
        if slot.replication_index == replication_index
    )
    results = tuple(
        run_calibration_slot(
            slot, execution_identity=identity, execution_mode="canary"
        )
        for slot in slots
    )
    summary = summarize_calibration_results(results, execution_mode="canary")
    body = {
        "report_class": "longitudinal_replicated_validation_canary_v1",
        "replication_index": replication_index,
        "execution_identity": identity.to_dict(),
        "slot_results": [result.to_dict() for result in results],
        "study_summary": summary.to_dict(),
        "governance_state": "HOLD",
        "full_evidence": False,
        "internal_only": True,
        "synthetic_only": True,
        "customer_output_authorized": False,
    }
    return {**body, "report_hash": sha256_json(body)}


def generated_at_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def read_json(path: Path) -> object:
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise ReplicatedValidationWorkspaceError(
            f"could not read strict JSON evidence: {path.name}"
        ) from exc


def strict_json_equal(left: object, right: object) -> bool:
    """Compare parsed JSON without Python's bool/int or int/float coercion."""

    if type(left) is not type(right):
        return False
    if isinstance(left, dict):
        return set(left) == set(right) and all(
            strict_json_equal(left[key], right[key]) for key in left
        )
    if isinstance(left, list):
        return len(left) == len(right) and all(
            strict_json_equal(left_item, right_item)
            for left_item, right_item in zip(left, right)
        )
    return left == right


def write_json_atomic(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    encoded = (
        json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False)
        + "\n"
    ).encode("utf-8")
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    try:
        with temporary.open("xb") as handle:
            handle.write(encoded)
            handle.flush()
            os.fsync(handle.fileno())
        try:
            os.link(temporary, path)
        except FileExistsError as exc:
            try:
                existing = path.read_bytes()
            except OSError as read_exc:
                raise ReplicatedValidationWorkspaceError(
                    f"existing atomic checkpoint cannot be read: {path.name}"
                ) from read_exc
            if existing != encoded:
                raise ReplicatedValidationWorkspaceError(
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


def _strict_record(value: object, name: str) -> dict:
    if not isinstance(value, dict) or any(not isinstance(key, str) for key in value):
        raise ValueError(f"{name} must be an object with string keys")
    return value


def _require_exact_keys(record: dict, expected: set[str], name: str) -> None:
    if set(record) != expected:
        raise ValueError(f"{name} has missing or unknown fields")


def _strict_int(value: object, name: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"{name} must be an integer")
    return value


def _strict_finite(value: object, name: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{name} must be numeric")
    numeric = float(value)
    if not math.isfinite(numeric):
        raise ValueError(f"{name} must be finite")
    return numeric


def _optional_finite(value: object, name: str) -> float | None:
    return None if value is None else _strict_finite(value, name)


def _strict_bool(value: object, name: str) -> bool:
    if not isinstance(value, bool):
        raise ValueError(f"{name} must be boolean")
    return value


def _optional_bool(value: object, name: str) -> bool | None:
    return None if value is None else _strict_bool(value, name)


def _strict_string(value: object, name: str) -> str:
    if not isinstance(value, str) or not value:
        raise ValueError(f"{name} must be a nonempty string")
    return value


def _optional_string(value: object, name: str) -> str | None:
    return None if value is None else _strict_string(value, name)


def _strict_sha256(value: object, name: str) -> str:
    string = _strict_string(value, name)
    if not _SHA256_RE.fullmatch(string):
        raise ValueError(f"{name} must be a lowercase SHA-256 hash")
    return string


def _optional_sha256(value: object, name: str) -> str | None:
    return None if value is None else _strict_sha256(value, name)


def _strict_string_tuple(value: object, name: str) -> tuple[str, ...]:
    if not isinstance(value, list):
        raise ValueError(f"{name} must be an array")
    result = tuple(_strict_string(item, name) for item in value)
    if len(set(result)) != len(result):
        raise ValueError(f"{name} must not contain duplicates")
    return result
