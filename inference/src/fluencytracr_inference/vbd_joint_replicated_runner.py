"""V4 execution admission, durable receipts, ledger, and sanitized artifact.

The runner boundary is intentionally narrower than model execution.  It binds
one frozen plan slot to one runtime manifest and one create-once claim, then
records only sanitized receipts, hashes, and closed categorical states. This
module never imports PyMC or runs a sampler; it authenticates review evidence,
atomically consumes claims, and persists launch or timeout receipts for the
model bridge.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import json
import math
import os
from pathlib import Path
import platform
import re
import subprocess

from .hashing import sha256_json
from .vbd_joint_types import VBD_JOINT_FULL_ESS_MIN, VBD_JOINT_FULL_RHAT_MAX
from .vbd_joint_replicated_synthetic import (
    generate_vbd_joint_replicated_case_for_slot,
    validate_vbd_joint_replicated_dataset,
)
from .vbd_joint_replicated_validation_plan import (
    VBD_JOINT_REPLICATED_ARTIFACT_SCHEMA,
    VBD_JOINT_REPLICATED_FAILURE_CODES,
    VBD_JOINT_REPLICATED_NAMESPACES,
    VBD_JOINT_REPLICATED_PER_FIT_TIMEOUT_SECONDS,
    VBD_JOINT_REPLICATED_STUDY_TIMEOUT_SECONDS,
    VBD_JOINT_REPLICATED_STATES,
    VBDJointReplicatedPlanError,
    VBDJointReplicatedValidationClaim,
    VBDJointReplicatedValidationDisposition,
    VBDJointReplicatedValidationPlan,
    VBDJointReplicatedValidationSlot,
    validate_claim_for_slot,
    validate_disposition_for_claim,
    validate_replicated_slot_manifest,
    validate_seed_manifest,
    vbd_joint_replicated_validation_plan,
)


VBD_JOINT_REPLICATED_RUNTIME_PYTHON = "3.13.14"
VBD_JOINT_REPLICATED_RUNTIME_PLATFORM = "macOS arm64"
VBD_JOINT_REPLICATED_RUNTIME_LOCKFILE_HASH = (
    "2a7ef1c0266a89ba1c4bbb9d2b40ecfa804325e2f5705bcb3b7d976ca7e92801"
)
VBD_JOINT_REPLICATED_RUNTIME_PACKAGES = {
    "pymc": "6.0.1",
    "arviz": "1.2.0",
    "pytensor": "3.0.7",
    "numpy": "2.4.6",
    "scipy": "1.18.0",
}
VBD_JOINT_REPLICATED_STUDY_GATE_NAMES = (
    "recovery",
    "coverage",
    "uncertainty_ratio",
    "null",
    "predictive",
    "high_error",
    "confounding",
    "diagnostic",
    "runtime",
    "artifact",
    "review",
)
VBD_JOINT_REPLICATED_GATE_STATES = ("PASS", "HOLD")
_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
_COMMIT_RE = re.compile(r"^[0-9a-f]{40,64}$")
_FORBIDDEN_ARTIFACT_TOKENS = (
    "draw",
    "latent",
    "observation",
    "family",
    "member",
    "prompt",
    "transcript",
    "user",
    "employee",
    "raw",
)
_REVIEW_REPOSITORY = "kelleyjamesb-ai/fluencytracr"
_TRUSTED_REVIEW_ASSOCIATIONS = ("COLLABORATOR", "MEMBER", "OWNER")


class VBDJointReplicatedRunnerError(VBDJointReplicatedPlanError):
    """Raised when a runner identity or sanitized artifact fails closed."""


def _require_canonical_plan(
    plan: VBDJointReplicatedValidationPlan,
) -> VBDJointReplicatedValidationPlan:
    if type(plan) is not VBDJointReplicatedValidationPlan:
        raise VBDJointReplicatedRunnerError("plan must use the exact frozen plan type")
    canonical = vbd_joint_replicated_validation_plan()
    if plan != canonical:
        raise VBDJointReplicatedRunnerError("plan does not match the canonical frozen plan")
    return canonical


def _require_canonical_slot(
    slot: VBDJointReplicatedValidationSlot,
) -> VBDJointReplicatedValidationSlot:
    if type(slot) is not VBDJointReplicatedValidationSlot:
        raise VBDJointReplicatedRunnerError("slot must use the exact frozen slot type")
    plan = vbd_joint_replicated_validation_plan()
    expected = next(
        (
            candidate
            for candidate in plan.qualifying_slots + plan.preflight_slots + plan.canary_slots
            if candidate.slot_id == slot.slot_id
        ),
        None,
    )
    if expected is None or slot != expected:
        raise VBDJointReplicatedRunnerError("slot does not match the canonical frozen plan")
    return expected


def _sha(name: str, value: object) -> str:
    if type(value) is not str or _SHA256_RE.fullmatch(value) is None:
        raise VBDJointReplicatedRunnerError(f"{name} must be a lowercase SHA-256 hash")
    return value


def _commit(name: str, value: object) -> str:
    if type(value) is not str or _COMMIT_RE.fullmatch(value) is None:
        raise VBDJointReplicatedRunnerError(f"{name} must be a full source commit hash")
    return value


def _timestamp(name: str, value: object) -> datetime:
    if type(value) is not str:
        raise VBDJointReplicatedRunnerError(f"{name} must be an RFC3339 timestamp")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise VBDJointReplicatedRunnerError(
            f"{name} must be an RFC3339 timestamp"
        ) from exc
    if parsed.tzinfo is None:
        raise VBDJointReplicatedRunnerError(f"{name} must include a timezone")
    return parsed


def _require_frozen_claim_deadline(
    claim: VBDJointReplicatedValidationClaim,
) -> None:
    deadline_delta = _timestamp("deadline_at", claim.deadline_at) - _timestamp(
        "started_at", claim.started_at
    )
    if deadline_delta.total_seconds() != VBD_JOINT_REPLICATED_PER_FIT_TIMEOUT_SECONDS:
        raise VBDJointReplicatedRunnerError(
            "claim deadline must equal the frozen two-hour per-fit timeout"
        )


def _closed(name: str, value: object, allowed: tuple[str, ...]) -> str:
    if type(value) is not str or value not in allowed:
        raise VBDJointReplicatedRunnerError(f"{name} is outside the frozen enum")
    return value


def _nonnegative_finite(name: str, value: object) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise VBDJointReplicatedRunnerError(f"{name} must be finite")
    result = float(value)
    if not math.isfinite(result) or result < 0:
        raise VBDJointReplicatedRunnerError(f"{name} must be finite and nonnegative")
    return result


@dataclass(frozen=True, slots=True)
class VBDJointReplicatedRuntimeManifest:
    """Exact runtime identity required before any sampler execution."""

    python_version: str
    platform: str
    lockfile_hash: str
    package_versions: tuple[tuple[str, str], ...]
    source_commit: str
    manifest_hash: str

    def __post_init__(self) -> None:
        if self.python_version != VBD_JOINT_REPLICATED_RUNTIME_PYTHON:
            raise VBDJointReplicatedRunnerError("Python runtime does not match the frozen protocol")
        if self.platform != VBD_JOINT_REPLICATED_RUNTIME_PLATFORM:
            raise VBDJointReplicatedRunnerError("platform does not match the frozen protocol")
        if self.lockfile_hash != VBD_JOINT_REPLICATED_RUNTIME_LOCKFILE_HASH:
            raise VBDJointReplicatedRunnerError("lockfile hash does not match the frozen protocol")
        if type(self.package_versions) is not tuple:
            raise VBDJointReplicatedRunnerError("package versions must be immutable")
        expected_packages = tuple(sorted(VBD_JOINT_REPLICATED_RUNTIME_PACKAGES.items()))
        if self.package_versions != expected_packages:
            raise VBDJointReplicatedRunnerError("package versions do not match the frozen protocol")
        _commit("source_commit", self.source_commit)
        _sha("manifest_hash", self.manifest_hash)
        if self.manifest_hash != sha256_json(self.body_without_hash()):
            raise VBDJointReplicatedRunnerError("runtime manifest hash is invalid")

    def body_without_hash(self) -> dict:
        return {
            "python_version": self.python_version,
            "platform": self.platform,
            "lockfile_hash": self.lockfile_hash,
            "package_versions": [list(item) for item in self.package_versions],
            "source_commit": self.source_commit,
        }

    def to_dict(self) -> dict:
        return {**self.body_without_hash(), "manifest_hash": self.manifest_hash}


def _sha256_file(path: Path) -> str:
    try:
        return hashlib.sha256(path.read_bytes()).hexdigest()
    except OSError as exc:
        raise VBDJointReplicatedRunnerError(
            "observed runtime lockfile is unavailable"
        ) from exc


def _observed_source_commit() -> str:
    repo_root = Path(__file__).resolve().parents[3]
    try:
        completed = subprocess.run(
            ("git", "rev-parse", "HEAD"),
            cwd=repo_root,
            check=True,
            capture_output=True,
            text=True,
        )
        status = subprocess.run(
            ("git", "status", "--porcelain", "--untracked-files=all"),
            cwd=repo_root,
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        raise VBDJointReplicatedRunnerError(
            "observed runtime source commit is unavailable"
        ) from exc
    if status.stdout:
        raise VBDJointReplicatedRunnerError(
            "observed runtime source tree is not clean"
        )
    return _commit("observed source_commit", completed.stdout.strip())


def _locked_package_versions(lockfile_path: Path) -> dict[str, str]:
    try:
        lines = lockfile_path.read_text(encoding="utf-8").splitlines()
    except OSError as exc:
        raise VBDJointReplicatedRunnerError(
            "observed runtime lockfile is unavailable"
        ) from exc
    versions: dict[str, str] = {}
    for line in lines:
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
            raise VBDJointReplicatedRunnerError(
                "observed runtime lockfile is not an exact package manifest"
            )
        versions[name] = version
    if not versions:
        raise VBDJointReplicatedRunnerError("observed runtime lockfile is empty")
    return versions


def observe_runtime_manifest() -> VBDJointReplicatedRuntimeManifest:
    """Observe the process, lockfile, installed packages, platform, and Git HEAD."""

    lockfile_path = Path(__file__).resolve().parents[2] / "requirements.lock"
    python_version = platform.python_version()
    observed_platform = f"{platform.system()} {platform.machine()}"
    if platform.system() == "Darwin":
        observed_platform = f"macOS {platform.machine()}"
    lockfile_hash = _sha256_file(lockfile_path)
    locked_versions = _locked_package_versions(lockfile_path)
    try:
        installed_versions = {
            name: importlib.metadata.version(name) for name in sorted(locked_versions)
        }
    except importlib.metadata.PackageNotFoundError as exc:
        raise VBDJointReplicatedRunnerError(
            "observed runtime is missing a frozen package"
        ) from exc
    if installed_versions != {
        name: locked_versions[name] for name in sorted(locked_versions)
    }:
        raise VBDJointReplicatedRunnerError(
            "observed runtime packages differ from requirements.lock"
        )
    observed_packages = {
        name: installed_versions[name]
        for name in VBD_JOINT_REPLICATED_RUNTIME_PACKAGES
    }
    if python_version != VBD_JOINT_REPLICATED_RUNTIME_PYTHON:
        raise VBDJointReplicatedRunnerError(
            "observed runtime Python does not match the frozen protocol"
        )
    if observed_platform != VBD_JOINT_REPLICATED_RUNTIME_PLATFORM:
        raise VBDJointReplicatedRunnerError(
            "observed runtime platform does not match the frozen protocol"
        )
    if lockfile_hash != VBD_JOINT_REPLICATED_RUNTIME_LOCKFILE_HASH:
        raise VBDJointReplicatedRunnerError(
            "observed runtime lockfile does not match the frozen protocol"
        )
    if observed_packages != VBD_JOINT_REPLICATED_RUNTIME_PACKAGES:
        raise VBDJointReplicatedRunnerError(
            "observed runtime package versions do not match the frozen protocol"
        )
    source_commit = _observed_source_commit()
    body = {
        "python_version": python_version,
        "platform": observed_platform,
        "lockfile_hash": lockfile_hash,
        "package_versions": [list(item) for item in sorted(observed_packages.items())],
        "source_commit": source_commit,
    }
    return VBDJointReplicatedRuntimeManifest(
        python_version=body["python_version"],
        platform=body["platform"],
        lockfile_hash=body["lockfile_hash"],
        package_versions=tuple(tuple(item) for item in body["package_versions"]),
        source_commit=body["source_commit"],
        manifest_hash=sha256_json(body),
    )


def _require_observed_runtime_manifest(
    runtime_manifest: VBDJointReplicatedRuntimeManifest,
) -> None:
    if type(runtime_manifest) is not VBDJointReplicatedRuntimeManifest:
        raise VBDJointReplicatedRunnerError(
            "runtime manifest must use the exact frozen type"
        )
    observed = observe_runtime_manifest()
    if runtime_manifest != observed:
        raise VBDJointReplicatedRunnerError(
            "runtime manifest does not match the observed runtime"
        )


def _require_claim_runtime_provenance(
    claim: VBDJointReplicatedValidationClaim,
    runtime_manifest: VBDJointReplicatedRuntimeManifest,
) -> None:
    if (
        claim.source_commit != runtime_manifest.source_commit
        or claim.runtime_manifest_hash != runtime_manifest.manifest_hash
    ):
        raise VBDJointReplicatedRunnerError(
            "claim runtime provenance does not match the expected manifest"
        )


@dataclass(frozen=True, slots=True)
class VBDJointReplicatedExecutionPacket:
    """Hash-only packet passed to a future reviewed execution worker."""

    namespace: str
    slot_id: str
    slot_hash: str
    plan_hash: str
    scenario_id: str
    variant: str
    dataset_seed: int
    chain_seeds: tuple[int, ...]
    source_commit: str
    runtime_manifest_hash: str
    dataset_hash: str
    packet_hash: str

    def __post_init__(self) -> None:
        _closed("namespace", self.namespace, VBD_JOINT_REPLICATED_NAMESPACES)
        _sha("slot_hash", self.slot_hash)
        _sha("plan_hash", self.plan_hash)
        _sha("runtime_manifest_hash", self.runtime_manifest_hash)
        _sha("dataset_hash", self.dataset_hash)
        _commit("source_commit", self.source_commit)
        if type(self.slot_id) is not str or not self.slot_id:
            raise VBDJointReplicatedRunnerError("slot ID is invalid")
        if type(self.scenario_id) is not str or not self.scenario_id:
            raise VBDJointReplicatedRunnerError("scenario ID is invalid")
        if self.variant not in ("full", "restricted"):
            raise VBDJointReplicatedRunnerError("model variant is invalid")
        if type(self.dataset_seed) is not int or self.dataset_seed <= 0:
            raise VBDJointReplicatedRunnerError("dataset seed is invalid")
        if type(self.chain_seeds) is not tuple or not self.chain_seeds:
            raise VBDJointReplicatedRunnerError("chain seeds are invalid")
        if any(type(seed) is not int or seed <= 0 for seed in self.chain_seeds):
            raise VBDJointReplicatedRunnerError("chain seeds are invalid")
        _sha("packet_hash", self.packet_hash)
        if self.packet_hash != sha256_json(self.body_without_hash()):
            raise VBDJointReplicatedRunnerError("execution packet hash is invalid")

    def body_without_hash(self) -> dict:
        return {
            "namespace": self.namespace,
            "slot_id": self.slot_id,
            "slot_hash": self.slot_hash,
            "plan_hash": self.plan_hash,
            "scenario_id": self.scenario_id,
            "variant": self.variant,
            "dataset_seed": self.dataset_seed,
            "chain_seeds": list(self.chain_seeds),
            "source_commit": self.source_commit,
            "runtime_manifest_hash": self.runtime_manifest_hash,
            "dataset_hash": self.dataset_hash,
        }

    def to_dict(self) -> dict:
        return {**self.body_without_hash(), "packet_hash": self.packet_hash}


@dataclass(frozen=True, slots=True)
class VBDJointReplicatedExecutionAuthorization:
    """Hash-bound receipt proving one external pre-execution review returned GO."""

    slot_id: str
    packet_hash: str
    claim_hash: str
    runtime_manifest_hash: str
    source_commit: str
    review_state: str
    review_receipt_hash: str
    authorization_hash: str

    def __post_init__(self) -> None:
        if type(self.slot_id) is not str or not self.slot_id:
            raise VBDJointReplicatedRunnerError("authorization slot ID is invalid")
        for name, value in (
            ("packet_hash", self.packet_hash),
            ("claim_hash", self.claim_hash),
            ("runtime_manifest_hash", self.runtime_manifest_hash),
            ("review_receipt_hash", self.review_receipt_hash),
            ("authorization_hash", self.authorization_hash),
        ):
            _sha(name, value)
        _commit("source_commit", self.source_commit)
        if self.review_state != "GO":
            raise VBDJointReplicatedRunnerError("pre-execution review did not return GO")
        if self.authorization_hash != sha256_json(self.body_without_hash()):
            raise VBDJointReplicatedRunnerError("execution authorization hash is invalid")

    def body_without_hash(self) -> dict:
        return {
            "slot_id": self.slot_id,
            "packet_hash": self.packet_hash,
            "claim_hash": self.claim_hash,
            "runtime_manifest_hash": self.runtime_manifest_hash,
            "source_commit": self.source_commit,
            "review_state": self.review_state,
            "review_receipt_hash": self.review_receipt_hash,
        }


@dataclass(frozen=True, slots=True)
class VBDJointReplicatedReviewReceipt:
    """Authenticated GitHub approval for one exact source commit."""

    repository: str
    pull_number: int
    review_id: int
    reviewer_login: str
    author_login: str
    author_association: str
    reviewed_commit: str
    state: str
    submitted_at: str
    receipt_hash: str

    def __post_init__(self) -> None:
        if self.repository != _REVIEW_REPOSITORY:
            raise VBDJointReplicatedRunnerError("authenticated review repository is invalid")
        if type(self.pull_number) is not int or self.pull_number <= 0:
            raise VBDJointReplicatedRunnerError("authenticated review pull number is invalid")
        if type(self.review_id) is not int or self.review_id <= 0:
            raise VBDJointReplicatedRunnerError("authenticated review ID is invalid")
        if (
            type(self.reviewer_login) is not str
            or not self.reviewer_login
            or type(self.author_login) is not str
            or not self.author_login
            or self.reviewer_login == self.author_login
        ):
            raise VBDJointReplicatedRunnerError("authenticated review must be independent")
        if self.author_association not in _TRUSTED_REVIEW_ASSOCIATIONS:
            raise VBDJointReplicatedRunnerError("authenticated reviewer is not trusted")
        _commit("reviewed_commit", self.reviewed_commit)
        if self.state != "APPROVED":
            raise VBDJointReplicatedRunnerError("authenticated review did not approve execution")
        _timestamp("submitted_at", self.submitted_at)
        _sha("receipt_hash", self.receipt_hash)
        if self.receipt_hash != sha256_json(self.body_without_hash()):
            raise VBDJointReplicatedRunnerError("authenticated review receipt hash is invalid")

    def body_without_hash(self) -> dict:
        return {
            "repository": self.repository,
            "pull_number": self.pull_number,
            "review_id": self.review_id,
            "reviewer_login": self.reviewer_login,
            "author_login": self.author_login,
            "author_association": self.author_association,
            "reviewed_commit": self.reviewed_commit,
            "state": self.state,
            "submitted_at": self.submitted_at,
        }


def observe_github_review_receipt(
    *, pull_number: int, review_id: int
) -> VBDJointReplicatedReviewReceipt:
    """Read independently authenticated approval evidence from GitHub."""

    try:
        review_result = subprocess.run(
            (
                "gh", "api",
                f"repos/{_REVIEW_REPOSITORY}/pulls/{pull_number}/reviews/{review_id}",
            ),
            check=True,
            capture_output=True,
            text=True,
        )
        pull_result = subprocess.run(
            ("gh", "api", f"repos/{_REVIEW_REPOSITORY}/pulls/{pull_number}"),
            check=True,
            capture_output=True,
            text=True,
        )
        review = json.loads(review_result.stdout)
        pull = json.loads(pull_result.stdout)
    except (OSError, subprocess.CalledProcessError, json.JSONDecodeError) as exc:
        raise VBDJointReplicatedRunnerError(
            "authenticated review evidence is unavailable"
        ) from exc
    if (
        review.get("id") != review_id
        or pull.get("number") != pull_number
        or pull.get("base", {}).get("repo", {}).get("full_name")
        != _REVIEW_REPOSITORY
        or review.get("commit_id") != pull.get("head", {}).get("sha")
    ):
        raise VBDJointReplicatedRunnerError(
            "authenticated review does not match the exact pull request head"
        )
    body = {
        "repository": _REVIEW_REPOSITORY,
        "pull_number": pull_number,
        "review_id": review_id,
        "reviewer_login": review.get("user", {}).get("login"),
        "author_login": pull.get("user", {}).get("login"),
        "author_association": review.get("author_association"),
        "reviewed_commit": review.get("commit_id"),
        "state": review.get("state"),
        "submitted_at": review.get("submitted_at"),
    }
    return VBDJointReplicatedReviewReceipt(
        **body,
        receipt_hash=sha256_json(body),
    )


@dataclass(frozen=True, slots=True)
class VBDJointReplicatedLaunchReceipt:
    """Durable create-once proof that one immutable claim was consumed."""

    slot_id: str
    packet_hash: str
    claim_hash: str
    authorization_hash: str
    review_receipt_hash: str
    consumed_at: str
    launch_receipt_hash: str

    def __post_init__(self) -> None:
        if type(self.slot_id) is not str or not self.slot_id:
            raise VBDJointReplicatedRunnerError("launch slot ID is invalid")
        for name, value in (
            ("packet_hash", self.packet_hash),
            ("claim_hash", self.claim_hash),
            ("authorization_hash", self.authorization_hash),
            ("review_receipt_hash", self.review_receipt_hash),
            ("launch_receipt_hash", self.launch_receipt_hash),
        ):
            _sha(name, value)
        _timestamp("consumed_at", self.consumed_at)
        if self.launch_receipt_hash != sha256_json(self.body_without_hash()):
            raise VBDJointReplicatedRunnerError("launch receipt hash is invalid")

    def body_without_hash(self) -> dict:
        return {
            "slot_id": self.slot_id,
            "packet_hash": self.packet_hash,
            "claim_hash": self.claim_hash,
            "authorization_hash": self.authorization_hash,
            "review_receipt_hash": self.review_receipt_hash,
            "consumed_at": self.consumed_at,
        }

    def to_dict(self) -> dict:
        return {**self.body_without_hash(), "launch_receipt_hash": self.launch_receipt_hash}


def _launch_receipt_path(execution_root: Path, claim_hash: str) -> Path:
    if not isinstance(execution_root, Path):
        raise VBDJointReplicatedRunnerError("execution root must use the exact path type")
    try:
        resolved_root = execution_root.resolve(strict=True)
    except OSError as exc:
        raise VBDJointReplicatedRunnerError("execution root is unavailable") from exc
    if not resolved_root.is_dir():
        raise VBDJointReplicatedRunnerError("execution root is not a directory")
    launches = resolved_root / "launches"
    launches.mkdir(mode=0o700, exist_ok=True)
    if launches.is_symlink():
        raise VBDJointReplicatedRunnerError("execution launch directory is unsafe")
    return launches / f"{_sha('claim_hash', claim_hash)}.json"


def consume_execution_claim(
    execution_root: Path,
    slot: VBDJointReplicatedValidationSlot,
    *,
    prepared_dataset_hash: str,
    packet: VBDJointReplicatedExecutionPacket,
    claim: VBDJointReplicatedValidationClaim,
    authorization: VBDJointReplicatedExecutionAuthorization,
    runtime_manifest: VBDJointReplicatedRuntimeManifest,
    review_receipt: VBDJointReplicatedReviewReceipt,
) -> VBDJointReplicatedLaunchReceipt:
    """Atomically consume a reviewed claim immediately before model construction."""

    validate_reviewed_execution_authorization(
        slot,
        prepared_dataset_hash=prepared_dataset_hash,
        packet=packet,
        claim=claim,
        authorization=authorization,
        runtime_manifest=runtime_manifest,
        review_receipt=review_receipt,
    )
    body = {
        "slot_id": slot.slot_id,
        "packet_hash": packet.packet_hash,
        "claim_hash": claim.claim_hash,
        "authorization_hash": authorization.authorization_hash,
        "review_receipt_hash": review_receipt.receipt_hash,
        "consumed_at": datetime.now(timezone.utc).isoformat(),
    }
    receipt = VBDJointReplicatedLaunchReceipt(
        **body,
        launch_receipt_hash=sha256_json(body),
    )
    path = _launch_receipt_path(execution_root, claim.claim_hash)
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        descriptor = os.open(path, flags, 0o600)
    except FileExistsError as exc:
        raise VBDJointReplicatedRunnerError(
            "execution claim was already consumed"
        ) from exc
    except OSError as exc:
        raise VBDJointReplicatedRunnerError("launch receipt could not be persisted") from exc
    try:
        payload = (
            json.dumps(receipt.to_dict(), sort_keys=True, separators=(",", ":"))
            + "\n"
        ).encode()
        os.write(descriptor, payload)
        os.fsync(descriptor)
    finally:
        os.close(descriptor)
    return receipt


def validate_consumed_execution_claim(
    execution_root: Path,
    receipt: VBDJointReplicatedLaunchReceipt,
) -> None:
    if type(receipt) is not VBDJointReplicatedLaunchReceipt:
        raise VBDJointReplicatedRunnerError("launch receipt must use the exact type")
    path = _launch_receipt_path(execution_root, receipt.claim_hash)
    try:
        stored = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise VBDJointReplicatedRunnerError("persisted launch receipt is unavailable") from exc
    if stored != receipt.to_dict():
        raise VBDJointReplicatedRunnerError("persisted launch receipt does not match")


@dataclass(frozen=True, slots=True)
class VBDJointReplicatedFitReceipt:
    """Closed sanitized proof that one exact launched fit completed cleanly."""

    slot_id: str
    claim_hash: str
    launch_receipt_hash: str
    prepared_input_hash: str
    dataset_hash: str
    variant: str
    fit_summary_hash: str
    diagnostics_hash: str
    max_r_hat: float
    min_bulk_ess: float
    min_tail_ess: float
    divergence_count: int
    max_treedepth_count: int
    wall_time_seconds: float
    receipt_hash: str

    def __post_init__(self) -> None:
        if type(self.slot_id) is not str or not self.slot_id:
            raise VBDJointReplicatedRunnerError("fit receipt slot ID is invalid")
        for name, value in (
            ("claim_hash", self.claim_hash),
            ("launch_receipt_hash", self.launch_receipt_hash),
            ("prepared_input_hash", self.prepared_input_hash),
            ("dataset_hash", self.dataset_hash),
            ("fit_summary_hash", self.fit_summary_hash),
            ("diagnostics_hash", self.diagnostics_hash),
            ("receipt_hash", self.receipt_hash),
        ):
            _sha(name, value)
        if self.variant not in ("full", "restricted"):
            raise VBDJointReplicatedRunnerError("fit receipt variant is invalid")
        max_r_hat = _nonnegative_finite("fit receipt max_r_hat", self.max_r_hat)
        min_bulk = _nonnegative_finite("fit receipt min_bulk_ess", self.min_bulk_ess)
        min_tail = _nonnegative_finite("fit receipt min_tail_ess", self.min_tail_ess)
        wall_time = _nonnegative_finite(
            "fit receipt wall_time_seconds", self.wall_time_seconds
        )
        if (
            max_r_hat > VBD_JOINT_FULL_RHAT_MAX
            or min_bulk < VBD_JOINT_FULL_ESS_MIN
            or min_tail < VBD_JOINT_FULL_ESS_MIN
            or type(self.divergence_count) is not int
            or self.divergence_count != 0
            or type(self.max_treedepth_count) is not int
            or self.max_treedepth_count != 0
            or wall_time >= VBD_JOINT_REPLICATED_PER_FIT_TIMEOUT_SECONDS
        ):
            raise VBDJointReplicatedRunnerError(
                "fit receipt diagnostics do not support COMPLETE"
            )
        if self.receipt_hash != sha256_json(self.body_without_hash()):
            raise VBDJointReplicatedRunnerError("fit receipt hash is invalid")

    def body_without_hash(self) -> dict:
        return {
            "slot_id": self.slot_id,
            "claim_hash": self.claim_hash,
            "launch_receipt_hash": self.launch_receipt_hash,
            "prepared_input_hash": self.prepared_input_hash,
            "dataset_hash": self.dataset_hash,
            "variant": self.variant,
            "fit_summary_hash": self.fit_summary_hash,
            "diagnostics_hash": self.diagnostics_hash,
            "max_r_hat": self.max_r_hat,
            "min_bulk_ess": self.min_bulk_ess,
            "min_tail_ess": self.min_tail_ess,
            "divergence_count": self.divergence_count,
            "max_treedepth_count": self.max_treedepth_count,
            "wall_time_seconds": self.wall_time_seconds,
        }

    def to_dict(self) -> dict:
        return {**self.body_without_hash(), "receipt_hash": self.receipt_hash}


def build_sampler_free_execution_packet(
    slot: VBDJointReplicatedValidationSlot,
    *,
    plan: VBDJointReplicatedValidationPlan | None = None,
    runtime_manifest: VBDJointReplicatedRuntimeManifest,
) -> VBDJointReplicatedExecutionPacket:
    """Bind a slot and deterministic dataset without initializing a sampler."""

    slot = _require_canonical_slot(slot)
    _require_observed_runtime_manifest(runtime_manifest)
    plan = _require_canonical_plan(
        vbd_joint_replicated_validation_plan() if plan is None else plan
    )
    expected_slot = next(
        (
            candidate
            for candidate in (
                plan.qualifying_slots + plan.preflight_slots + plan.canary_slots
            )
            if candidate.slot_id == slot.slot_id
        ),
        None,
    )
    if expected_slot != slot:
        raise VBDJointReplicatedRunnerError("slot is not in the frozen plan")
    case = generate_vbd_joint_replicated_case_for_slot(slot)
    validate_vbd_joint_replicated_dataset(case)
    body = {
        "namespace": slot.namespace,
        "slot_id": slot.slot_id,
        "slot_hash": slot.slot_hash,
        "plan_hash": plan.plan_hash,
        "scenario_id": slot.scenario_id,
        "variant": slot.variant,
        "dataset_seed": slot.dataset_seed,
        "chain_seeds": tuple(slot.chain_seeds),
        "source_commit": runtime_manifest.source_commit,
        "runtime_manifest_hash": runtime_manifest.manifest_hash,
        "dataset_hash": case.content_hash(),
    }
    return VBDJointReplicatedExecutionPacket(
        **body,
        packet_hash=sha256_json(body),
    )


def authorize_reviewed_execution(
    slot: VBDJointReplicatedValidationSlot,
    *,
    packet: VBDJointReplicatedExecutionPacket,
    claim: VBDJointReplicatedValidationClaim,
    runtime_manifest: VBDJointReplicatedRuntimeManifest,
    review_state: str,
    review_receipt_hash: str,
    review_receipt: VBDJointReplicatedReviewReceipt | None = None,
) -> VBDJointReplicatedExecutionAuthorization:
    """Bind an external GO receipt to one exact packet and immutable claim."""

    slot = _require_canonical_slot(slot)
    _require_observed_runtime_manifest(runtime_manifest)
    expected_packet = build_sampler_free_execution_packet(
        slot, runtime_manifest=runtime_manifest
    )
    if type(packet) is not VBDJointReplicatedExecutionPacket or packet != expected_packet:
        raise VBDJointReplicatedRunnerError("execution packet is not the exact frozen packet")
    plan = vbd_joint_replicated_validation_plan()
    validate_claim_for_slot(claim, slot, plan.plan_hash)
    _require_frozen_claim_deadline(claim)
    _require_claim_runtime_provenance(claim, runtime_manifest)
    if (
        claim.slot_hash != packet.slot_hash
        or claim.plan_hash != packet.plan_hash
        or claim.scenario_id != packet.scenario_id
        or claim.variant != packet.variant
        or claim.dataset_seed != packet.dataset_seed
        or claim.chain_seeds != packet.chain_seeds
    ):
        raise VBDJointReplicatedRunnerError("claim does not bind the execution packet")
    if type(review_receipt) is not VBDJointReplicatedReviewReceipt:
        raise VBDJointReplicatedRunnerError(
            "authenticated review receipt is required"
        )
    observed_review = observe_github_review_receipt(
        pull_number=review_receipt.pull_number,
        review_id=review_receipt.review_id,
    )
    if review_receipt != observed_review:
        raise VBDJointReplicatedRunnerError(
            "authenticated review receipt does not match GitHub"
        )
    if (
        review_receipt.reviewed_commit != runtime_manifest.source_commit
        or review_receipt.receipt_hash != review_receipt_hash
        or review_state != "GO"
    ):
        raise VBDJointReplicatedRunnerError(
            "authenticated review does not bind the execution source"
        )
    body = {
        "slot_id": slot.slot_id,
        "packet_hash": packet.packet_hash,
        "claim_hash": claim.claim_hash,
        "runtime_manifest_hash": runtime_manifest.manifest_hash,
        "source_commit": runtime_manifest.source_commit,
        "review_state": review_state,
        "review_receipt_hash": _sha("review_receipt_hash", review_receipt_hash),
    }
    return VBDJointReplicatedExecutionAuthorization(
        **body,
        authorization_hash=sha256_json(body),
    )


def validate_reviewed_execution_authorization(
    slot: VBDJointReplicatedValidationSlot,
    *,
    prepared_dataset_hash: str,
    packet: VBDJointReplicatedExecutionPacket,
    claim: VBDJointReplicatedValidationClaim,
    authorization: VBDJointReplicatedExecutionAuthorization,
    runtime_manifest: VBDJointReplicatedRuntimeManifest,
    review_receipt: VBDJointReplicatedReviewReceipt,
) -> None:
    if type(packet) is not VBDJointReplicatedExecutionPacket:
        raise VBDJointReplicatedRunnerError(
            "execution packet must use the exact frozen type"
        )
    if type(claim) is not VBDJointReplicatedValidationClaim:
        raise VBDJointReplicatedRunnerError(
            "execution claim must use the exact frozen type"
        )
    if type(authorization) is not VBDJointReplicatedExecutionAuthorization:
        raise VBDJointReplicatedRunnerError(
            "execution authorization must use the exact frozen type"
        )
    if type(runtime_manifest) is not VBDJointReplicatedRuntimeManifest:
        raise VBDJointReplicatedRunnerError(
            "runtime manifest must use the exact frozen type"
        )
    expected = authorize_reviewed_execution(
        slot,
        packet=packet,
        claim=claim,
        runtime_manifest=runtime_manifest,
        review_state=authorization.review_state,
        review_receipt_hash=authorization.review_receipt_hash,
        review_receipt=review_receipt,
    )
    if authorization != expected:
        raise VBDJointReplicatedRunnerError(
            "execution authorization does not bind the packet and claim"
        )
    if packet.dataset_hash != _sha("prepared_dataset_hash", prepared_dataset_hash):
        raise VBDJointReplicatedRunnerError(
            "prepared dataset does not bind the reviewed execution packet"
        )
    now = datetime.now(timezone.utc)
    if not (
        _timestamp("started_at", claim.started_at)
        <= now
        < _timestamp("deadline_at", claim.deadline_at)
    ):
        raise VBDJointReplicatedRunnerError(
            "reviewed execution claim is not active at sampler initialization"
        )


@dataclass(frozen=True, slots=True)
class VBDJointReplicatedAttemptCheckpoint:
    """One append-only hash-only checkpoint for one disposition."""

    namespace: str
    slot_id: str
    claim_hash: str
    state: str
    failure_code: str
    completed_at: str
    case_hash: str
    result_hash: str
    checkpoint_hash: str
    fit_receipt: VBDJointReplicatedFitReceipt | None = None

    def __post_init__(self) -> None:
        _closed("namespace", self.namespace, VBD_JOINT_REPLICATED_NAMESPACES)
        _closed("state", self.state, VBD_JOINT_REPLICATED_STATES)
        _closed("failure_code", self.failure_code, VBD_JOINT_REPLICATED_FAILURE_CODES)
        for name, value in (
            ("claim_hash", self.claim_hash),
            ("case_hash", self.case_hash),
            ("result_hash", self.result_hash),
            ("checkpoint_hash", self.checkpoint_hash),
        ):
            _sha(name, value)
        if self.state == "COMPLETE":
            if type(self.fit_receipt) is not VBDJointReplicatedFitReceipt:
                raise VBDJointReplicatedRunnerError(
                    "complete checkpoint lacks a validated fit receipt"
                )
            if (
                self.result_hash != self.fit_receipt.receipt_hash
                or self.claim_hash != self.fit_receipt.claim_hash
                or self.slot_id != self.fit_receipt.slot_id
                or self.case_hash != self.fit_receipt.dataset_hash
            ):
                raise VBDJointReplicatedRunnerError(
                    "complete result does not bind the validated fit receipt"
                )
        elif self.fit_receipt is not None:
            raise VBDJointReplicatedRunnerError(
                "held checkpoint cannot carry a complete fit receipt"
            )
        if self.state == "COMPLETE" and self.failure_code != "NONE":
            raise VBDJointReplicatedRunnerError("complete checkpoint has a failure")
        if self.state == "HOLD" and self.failure_code == "NONE":
            raise VBDJointReplicatedRunnerError("held checkpoint lacks a failure")
        if type(self.slot_id) is not str or not self.slot_id:
            raise VBDJointReplicatedRunnerError("checkpoint slot ID is invalid")
        _timestamp("completed_at", self.completed_at)
        if self.checkpoint_hash != sha256_json(self.body_without_hash()):
            raise VBDJointReplicatedRunnerError("checkpoint hash is invalid")

    def body_without_hash(self) -> dict:
        return {
            "namespace": self.namespace,
            "slot_id": self.slot_id,
            "claim_hash": self.claim_hash,
            "state": self.state,
            "failure_code": self.failure_code,
            "completed_at": self.completed_at,
            "case_hash": self.case_hash,
            "result_hash": self.result_hash,
            "fit_receipt": None if self.fit_receipt is None else self.fit_receipt.to_dict(),
        }


@dataclass(frozen=True, slots=True)
class VBDJointReplicatedAttemptLedger:
    """Immutable append-only claim, disposition, and checkpoint ledger."""

    claims: tuple[VBDJointReplicatedValidationClaim, ...] = ()
    dispositions: tuple[VBDJointReplicatedValidationDisposition, ...] = ()
    checkpoints: tuple[VBDJointReplicatedAttemptCheckpoint, ...] = ()

    def __post_init__(self) -> None:
        if type(self.claims) is not tuple or type(self.dispositions) is not tuple:
            raise VBDJointReplicatedRunnerError("ledger collections must be immutable")
        if type(self.checkpoints) is not tuple:
            raise VBDJointReplicatedRunnerError("ledger checkpoints must be immutable")
        if any(type(item) is not VBDJointReplicatedValidationClaim for item in self.claims):
            raise VBDJointReplicatedRunnerError("ledger contains an invalid claim")
        if any(
            type(item) is not VBDJointReplicatedValidationDisposition
            for item in self.dispositions
        ):
            raise VBDJointReplicatedRunnerError("ledger contains an invalid disposition")
        if any(
            type(item) is not VBDJointReplicatedAttemptCheckpoint
            for item in self.checkpoints
        ):
            raise VBDJointReplicatedRunnerError("ledger contains an invalid checkpoint")
        claim_slots = [claim.slot_id for claim in self.claims]
        if len(set(claim_slots)) != len(claim_slots):
            raise VBDJointReplicatedRunnerError("claim slot identities collide")
        disposition_slots = [item.slot_id for item in self.dispositions]
        if len(set(disposition_slots)) != len(disposition_slots):
            raise VBDJointReplicatedRunnerError("disposition slot identities collide")
        checkpoint_slots = [item.slot_id for item in self.checkpoints]
        if len(set(checkpoint_slots)) != len(checkpoint_slots):
            raise VBDJointReplicatedRunnerError("checkpoint slot identities collide")

    def append_claim(
        self,
        claim: VBDJointReplicatedValidationClaim,
        slot: VBDJointReplicatedValidationSlot,
        plan_hash: str,
        *,
        runtime_manifest: VBDJointReplicatedRuntimeManifest,
    ) -> "VBDJointReplicatedAttemptLedger":
        _require_observed_runtime_manifest(runtime_manifest)
        slot = _require_canonical_slot(slot)
        if plan_hash != vbd_joint_replicated_validation_plan().plan_hash:
            raise VBDJointReplicatedRunnerError("claim plan hash is not canonical")
        validate_claim_for_slot(claim, slot, plan_hash)
        _require_frozen_claim_deadline(claim)
        _require_claim_runtime_provenance(claim, runtime_manifest)
        if claim.slot_id in {item.slot_id for item in self.claims}:
            raise VBDJointReplicatedRunnerError("claim already exists for slot")
        prospective = replace(self, claims=self.claims + (claim,))
        if not _attempt_within_frozen_study_timeout(prospective):
            raise VBDJointReplicatedRunnerError(
                "claim exceeds the frozen fourteen-day study timeout"
            )
        return prospective

    def append_disposition(
        self,
        disposition: VBDJointReplicatedValidationDisposition,
        checkpoint: VBDJointReplicatedAttemptCheckpoint,
    ) -> "VBDJointReplicatedAttemptLedger":
        claim = next(
            (item for item in self.claims if item.claim_hash == disposition.claim_hash),
            None,
        )
        if claim is None:
            raise VBDJointReplicatedRunnerError("disposition claim is not in the ledger")
        validate_disposition_for_claim(disposition, claim)
        if checkpoint.slot_id != disposition.slot_id:
            raise VBDJointReplicatedRunnerError("checkpoint slot does not bind disposition")
        if checkpoint.claim_hash != disposition.claim_hash:
            raise VBDJointReplicatedRunnerError("checkpoint claim does not bind disposition")
        if checkpoint.state != disposition.state or checkpoint.failure_code != disposition.failure_code:
            raise VBDJointReplicatedRunnerError("checkpoint state does not bind disposition")
        if checkpoint.result_hash != disposition.result_hash:
            raise VBDJointReplicatedRunnerError("checkpoint result does not bind disposition")
        completed_at = _timestamp("completed_at", checkpoint.completed_at)
        if not _checkpoint_completion_matches_claim(disposition, claim, completed_at):
            raise VBDJointReplicatedRunnerError(
                "checkpoint completion is outside the claimed execution window"
            )
        if disposition.slot_id in {item.slot_id for item in self.dispositions}:
            raise VBDJointReplicatedRunnerError("disposition already exists for slot")
        if checkpoint.slot_id in {item.slot_id for item in self.checkpoints}:
            raise VBDJointReplicatedRunnerError("checkpoint already exists for slot")
        return replace(
            self,
            dispositions=self.dispositions + (disposition,),
            checkpoints=self.checkpoints + (checkpoint,),
        )

    def namespace_root(self, namespace: str) -> str:
        _closed("namespace", namespace, VBD_JOINT_REPLICATED_NAMESPACES)
        return sha256_json(
            {
                "namespace": namespace,
                "claims": [
                    item.body_without_hash()
                    for item in _canonical_ledger_rows(
                        item for item in self.claims if item.namespace == namespace
                    )
                ],
                "dispositions": [
                    item.body_without_hash()
                    for item in _canonical_ledger_rows(
                        item
                        for item in self.dispositions
                        if item.namespace == namespace
                    )
                ],
                "checkpoints": [
                    item.body_without_hash()
                    for item in _canonical_ledger_rows(
                        item
                        for item in self.checkpoints
                        if item.namespace == namespace
                    )
                ],
            }
        )

    @property
    def attempt_root(self) -> str:
        return sha256_json(
            {
                "claims": [
                    item.body_without_hash()
                    for item in _canonical_ledger_rows(self.claims)
                ],
                "dispositions": [
                    item.body_without_hash()
                    for item in _canonical_ledger_rows(self.dispositions)
                ],
                "checkpoints": [
                    item.body_without_hash()
                    for item in _canonical_ledger_rows(self.checkpoints)
                ],
            }
        )


def _canonical_ledger_rows(rows):
    plan = vbd_joint_replicated_validation_plan()
    ordered_slots = plan.qualifying_slots + plan.preflight_slots + plan.canary_slots
    rank = {slot.slot_id: index for index, slot in enumerate(ordered_slots)}
    materialized = tuple(rows)
    if any(item.slot_id not in rank for item in materialized):
        raise VBDJointReplicatedRunnerError("ledger contains an off-plan slot identity")
    return tuple(sorted(materialized, key=lambda item: rank[item.slot_id]))


def _attempt_within_frozen_study_timeout(
    ledger: VBDJointReplicatedAttemptLedger,
) -> bool:
    if not ledger.claims:
        return True
    attempt_start = min(_timestamp("started_at", claim.started_at) for claim in ledger.claims)
    completed_by_slot = {
        checkpoint.slot_id: _timestamp("completed_at", checkpoint.completed_at)
        for checkpoint in ledger.checkpoints
    }
    attempt_end = max(
        completed_by_slot.get(
            claim.slot_id,
            _timestamp("deadline_at", claim.deadline_at),
        )
        for claim in ledger.claims
    )
    return (
        attempt_end - attempt_start
    ).total_seconds() <= VBD_JOINT_REPLICATED_STUDY_TIMEOUT_SECONDS


def _checkpoint_completion_matches_claim(
    disposition: VBDJointReplicatedValidationDisposition,
    claim: VBDJointReplicatedValidationClaim,
    completed_at: datetime,
) -> bool:
    started_at = _timestamp("started_at", claim.started_at)
    deadline_at = _timestamp("deadline_at", claim.deadline_at)
    if completed_at < started_at:
        return False
    if disposition.failure_code == "SAMPLER_TIMEOUT":
        return disposition.state == "HOLD" and completed_at >= deadline_at
    return completed_at < deadline_at


def _observed_fit_count(summary: "VBDJointReplicatedNamespaceSummary") -> int:
    """Count every durable fit disposition, including protocol HOLDs."""

    return summary.complete_count + summary.hold_count


def dataset_regeneration_failure_case_hash(
    claim: VBDJointReplicatedValidationClaim,
) -> str:
    """Return the deterministic receipt used when a claimed case cannot regenerate."""

    if type(claim) is not VBDJointReplicatedValidationClaim:
        raise VBDJointReplicatedRunnerError(
            "dataset regeneration failure receipt requires the exact claim type"
        )
    return sha256_json(
        {
            "receipt_schema": "VBD_JOINT_REPLICATED_DATASET_REGENERATION_FAILURE_V1",
            "namespace": claim.namespace,
            "slot_id": claim.slot_id,
            "scenario_id": claim.scenario_id,
            "dataset_seed": claim.dataset_seed,
            "slot_hash": claim.slot_hash,
            "claim_hash": claim.claim_hash,
            "failure_code": "DATASET_REGENERATION_FAILURE",
        }
    )


def make_claim_for_slot(
    slot: VBDJointReplicatedValidationSlot,
    *,
    plan_hash: str,
    runtime_manifest: VBDJointReplicatedRuntimeManifest,
    started_at: str,
    deadline_at: str,
    ) -> VBDJointReplicatedValidationClaim:
    """Create one immutable claim without sampling or persistence."""

    slot = _require_canonical_slot(slot)
    if plan_hash != vbd_joint_replicated_validation_plan().plan_hash:
        raise VBDJointReplicatedRunnerError("claim plan hash is not canonical")
    _require_observed_runtime_manifest(runtime_manifest)
    body = {
        "namespace": slot.namespace,
        "slot_id": slot.slot_id,
        "scenario_id": slot.scenario_id,
        "variant": slot.variant,
        "dataset_seed": slot.dataset_seed,
        "chain_seeds": tuple(slot.chain_seeds),
        "slot_hash": slot.slot_hash,
        "plan_hash": plan_hash,
        "source_commit": runtime_manifest.source_commit,
        "runtime_manifest_hash": runtime_manifest.manifest_hash,
        "started_at": started_at,
        "deadline_at": deadline_at,
    }
    claim = VBDJointReplicatedValidationClaim(
        **body,
        claim_hash=sha256_json(body),
    )
    _require_frozen_claim_deadline(claim)
    return claim


def make_checkpoint_for_disposition(
    disposition: VBDJointReplicatedValidationDisposition,
    *,
    case_hash: str,
    completed_at: str,
    fit_receipt: VBDJointReplicatedFitReceipt | None = None,
) -> VBDJointReplicatedAttemptCheckpoint:
    body = {
        "namespace": disposition.namespace,
        "slot_id": disposition.slot_id,
        "claim_hash": disposition.claim_hash,
        "state": disposition.state,
        "failure_code": disposition.failure_code,
        "completed_at": _timestamp("completed_at", completed_at).isoformat(),
        "case_hash": _sha("case_hash", case_hash),
        "result_hash": disposition.result_hash,
        "fit_receipt": None if fit_receipt is None else fit_receipt.to_dict(),
    }
    return VBDJointReplicatedAttemptCheckpoint(
        namespace=body["namespace"],
        slot_id=body["slot_id"],
        claim_hash=body["claim_hash"],
        state=body["state"],
        failure_code=body["failure_code"],
        completed_at=body["completed_at"],
        case_hash=body["case_hash"],
        result_hash=body["result_hash"],
        fit_receipt=fit_receipt,
        checkpoint_hash=sha256_json(body),
    )


def persist_sampler_timeout_hold(
    execution_root: Path,
    slot: VBDJointReplicatedValidationSlot,
    *,
    claim: VBDJointReplicatedValidationClaim,
    launch_receipt: VBDJointReplicatedLaunchReceipt,
    case_hash: str,
) -> tuple[
    VBDJointReplicatedValidationDisposition,
    VBDJointReplicatedAttemptCheckpoint,
]:
    """Persist the required durable HOLD after the deadline interrupts sampling."""

    slot = _require_canonical_slot(slot)
    validate_claim_for_slot(
        claim, slot, vbd_joint_replicated_validation_plan().plan_hash
    )
    if (
        launch_receipt.slot_id != slot.slot_id
        or launch_receipt.claim_hash != claim.claim_hash
    ):
        raise VBDJointReplicatedRunnerError("timeout launch receipt does not bind claim")
    validate_consumed_execution_claim(execution_root, launch_receipt)
    result_hash = sha256_json(
        {
            "receipt_schema": "VBD_JOINT_REPLICATED_SAMPLER_TIMEOUT_V1",
            "slot_id": slot.slot_id,
            "claim_hash": claim.claim_hash,
            "launch_receipt_hash": launch_receipt.launch_receipt_hash,
            "failure_code": "SAMPLER_TIMEOUT",
        }
    )
    disposition_body = {
        "namespace": slot.namespace,
        "slot_id": slot.slot_id,
        "claim_hash": claim.claim_hash,
        "state": "HOLD",
        "failure_code": "SAMPLER_TIMEOUT",
        "result_hash": result_hash,
    }
    disposition = VBDJointReplicatedValidationDisposition(
        **disposition_body,
        disposition_hash=sha256_json(disposition_body),
    )
    completed_at = max(
        datetime.now(timezone.utc),
        _timestamp("deadline_at", claim.deadline_at),
    ).isoformat()
    checkpoint = make_checkpoint_for_disposition(
        disposition,
        case_hash=case_hash,
        completed_at=completed_at,
    )
    resolved_root = execution_root.resolve(strict=True)
    timeouts = resolved_root / "timeouts"
    timeouts.mkdir(mode=0o700, exist_ok=True)
    if timeouts.is_symlink():
        raise VBDJointReplicatedRunnerError("execution timeout directory is unsafe")
    path = timeouts / f"{claim.claim_hash}.json"
    payload = {
        "disposition": {
            **disposition.body_without_hash(),
            "disposition_hash": disposition.disposition_hash,
        },
        "checkpoint": {
            **checkpoint.body_without_hash(),
            "checkpoint_hash": checkpoint.checkpoint_hash,
        },
        "launch_receipt_hash": launch_receipt.launch_receipt_hash,
    }
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        descriptor = os.open(path, flags, 0o600)
    except FileExistsError as exc:
        raise VBDJointReplicatedRunnerError("sampler timeout HOLD already exists") from exc
    except OSError as exc:
        raise VBDJointReplicatedRunnerError("sampler timeout HOLD could not persist") from exc
    try:
        serialized = (json.dumps(payload, sort_keys=True, separators=(",", ":")) + "\n").encode()
        os.write(descriptor, serialized)
        os.fsync(descriptor)
    finally:
        os.close(descriptor)
    return disposition, checkpoint


def persist_execution_hold(
    execution_root: Path,
    slot: VBDJointReplicatedValidationSlot,
    *,
    claim: VBDJointReplicatedValidationClaim,
    launch_receipt: VBDJointReplicatedLaunchReceipt,
    case_hash: str,
    failure_code: str,
    evidence_hash: str,
) -> tuple[
    VBDJointReplicatedValidationDisposition,
    VBDJointReplicatedAttemptCheckpoint,
]:
    """Persist one sanitized terminal HOLD for a consumed non-timeout attempt."""

    if failure_code not in {
        "SAMPLER_ERROR",
        "DIAGNOSTIC_HOLD",
        "SUMMARY_NONFINITE",
    }:
        raise VBDJointReplicatedRunnerError(
            "execution HOLD failure code is not a persisted fit outcome"
        )
    slot = _require_canonical_slot(slot)
    validate_claim_for_slot(
        claim, slot, vbd_joint_replicated_validation_plan().plan_hash
    )
    if (
        launch_receipt.slot_id != slot.slot_id
        or launch_receipt.claim_hash != claim.claim_hash
    ):
        raise VBDJointReplicatedRunnerError("execution HOLD launch does not bind claim")
    validate_consumed_execution_claim(execution_root, launch_receipt)
    completed_at = datetime.now(timezone.utc)
    if not (
        _timestamp("started_at", claim.started_at)
        <= completed_at
        < _timestamp("deadline_at", claim.deadline_at)
    ):
        raise VBDJointReplicatedRunnerError(
            "non-timeout execution HOLD is outside the claimed execution window"
        )
    result_hash = sha256_json(
        {
            "receipt_schema": "VBD_JOINT_REPLICATED_EXECUTION_HOLD_V1",
            "slot_id": slot.slot_id,
            "claim_hash": claim.claim_hash,
            "launch_receipt_hash": launch_receipt.launch_receipt_hash,
            "failure_code": failure_code,
            "evidence_hash": _sha("evidence_hash", evidence_hash),
        }
    )
    disposition_body = {
        "namespace": slot.namespace,
        "slot_id": slot.slot_id,
        "claim_hash": claim.claim_hash,
        "state": "HOLD",
        "failure_code": failure_code,
        "result_hash": result_hash,
    }
    disposition = VBDJointReplicatedValidationDisposition(
        **disposition_body,
        disposition_hash=sha256_json(disposition_body),
    )
    checkpoint = make_checkpoint_for_disposition(
        disposition,
        case_hash=case_hash,
        completed_at=completed_at.isoformat(),
    )
    resolved_root = execution_root.resolve(strict=True)
    holds = resolved_root / "holds"
    holds.mkdir(mode=0o700, exist_ok=True)
    if holds.is_symlink():
        raise VBDJointReplicatedRunnerError("execution HOLD directory is unsafe")
    path = holds / f"{claim.claim_hash}.json"
    payload = {
        "disposition": {
            **disposition.body_without_hash(),
            "disposition_hash": disposition.disposition_hash,
        },
        "checkpoint": {
            **checkpoint.body_without_hash(),
            "checkpoint_hash": checkpoint.checkpoint_hash,
        },
        "launch_receipt_hash": launch_receipt.launch_receipt_hash,
        "evidence_hash": evidence_hash,
    }
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        descriptor = os.open(path, flags, 0o600)
    except FileExistsError as exc:
        raise VBDJointReplicatedRunnerError("execution HOLD already exists") from exc
    except OSError as exc:
        raise VBDJointReplicatedRunnerError("execution HOLD could not persist") from exc
    try:
        serialized = (
            json.dumps(payload, sort_keys=True, separators=(",", ":")) + "\n"
        ).encode()
        os.write(descriptor, serialized)
        os.fsync(descriptor)
    finally:
        os.close(descriptor)
    return disposition, checkpoint


@dataclass(frozen=True, slots=True)
class VBDJointReplicatedNamespaceSummary:
    namespace: str
    expected_slot_count: int
    observed_claim_count: int
    observed_disposition_count: int
    expected_dataset_count: int
    observed_dataset_count: int
    complete_count: int
    hold_count: int
    failure_codes: tuple[str, ...]
    manifest_hash: str
    attempt_root: str
    state: str
    summary_hash: str

    def __post_init__(self) -> None:
        _closed("namespace", self.namespace, VBD_JOINT_REPLICATED_NAMESPACES)
        _closed("state", self.state, VBD_JOINT_REPLICATED_STATES)
        for name in (
            "expected_slot_count",
            "observed_claim_count",
            "observed_disposition_count",
            "expected_dataset_count",
            "observed_dataset_count",
            "complete_count",
            "hold_count",
        ):
            value = getattr(self, name)
            if type(value) is not int or value < 0:
                raise VBDJointReplicatedRunnerError(f"{name} must be a nonnegative integer")
        if type(self.failure_codes) is not tuple:
            raise VBDJointReplicatedRunnerError("failure codes must be immutable")
        for code in self.failure_codes:
            _closed("failure_code", code, VBD_JOINT_REPLICATED_FAILURE_CODES)
        _sha("manifest_hash", self.manifest_hash)
        _sha("attempt_root", self.attempt_root)
        _sha("summary_hash", self.summary_hash)
        if self.summary_hash != sha256_json(self.body_without_hash()):
            raise VBDJointReplicatedRunnerError("namespace summary hash is invalid")

    def body_without_hash(self) -> dict:
        return {
            "namespace": self.namespace,
            "expected_slot_count": self.expected_slot_count,
            "observed_claim_count": self.observed_claim_count,
            "observed_disposition_count": self.observed_disposition_count,
            "expected_dataset_count": self.expected_dataset_count,
            "observed_dataset_count": self.observed_dataset_count,
            "complete_count": self.complete_count,
            "hold_count": self.hold_count,
            "failure_codes": list(self.failure_codes),
            "manifest_hash": self.manifest_hash,
            "attempt_root": self.attempt_root,
            "state": self.state,
        }

    def to_dict(self) -> dict:
        return {**self.body_without_hash(), "summary_hash": self.summary_hash}


def _slots_for_namespace(
    plan: VBDJointReplicatedValidationPlan, namespace: str
) -> tuple[VBDJointReplicatedValidationSlot, ...]:
    _closed("namespace", namespace, VBD_JOINT_REPLICATED_NAMESPACES)
    return {
        "qualifying": plan.qualifying_slots,
        "preflight": plan.preflight_slots,
        "runtime_canary": plan.canary_slots,
    }[namespace]


def combine_namespace(
    ledger: VBDJointReplicatedAttemptLedger,
    *,
    namespace: str,
    plan: VBDJointReplicatedValidationPlan | None = None,
    runtime_manifest: VBDJointReplicatedRuntimeManifest,
) -> VBDJointReplicatedNamespaceSummary:
    """Combine exactly one namespace without admitting another namespace's rows."""

    if type(ledger) is not VBDJointReplicatedAttemptLedger:
        raise VBDJointReplicatedRunnerError("ledger must use the exact immutable type")
    _require_observed_runtime_manifest(runtime_manifest)
    plan = _require_canonical_plan(
        vbd_joint_replicated_validation_plan() if plan is None else plan
    )
    slots = _slots_for_namespace(plan, namespace)
    expected_ids = tuple(item.slot_id for item in slots)
    validate_replicated_slot_manifest(namespace, expected_ids)
    expected_hashes = {item.slot_id: item.slot_hash for item in slots}
    namespace_claims = [item for item in ledger.claims if item.namespace == namespace]
    namespace_dispositions = [
        item for item in ledger.dispositions if item.namespace == namespace
    ]
    namespace_checkpoints = [
        item for item in ledger.checkpoints if item.namespace == namespace
    ]
    extra_claims = {item.slot_id for item in namespace_claims} - set(expected_ids)
    extra_dispositions = {item.slot_id for item in namespace_dispositions} - set(expected_ids)
    extra_checkpoints = {item.slot_id for item in namespace_checkpoints} - set(expected_ids)
    if extra_claims or extra_dispositions or extra_checkpoints:
        raise VBDJointReplicatedRunnerError("namespace contains off-manifest rows")
    claim_by_slot = {item.slot_id: item for item in namespace_claims}
    disposition_by_slot = {item.slot_id: item for item in namespace_dispositions}
    checkpoint_by_slot = {item.slot_id: item for item in namespace_checkpoints}
    if (
        len(claim_by_slot) != len(namespace_claims)
        or len(disposition_by_slot) != len(namespace_dispositions)
        or len(checkpoint_by_slot) != len(namespace_checkpoints)
    ):
        raise VBDJointReplicatedRunnerError("namespace contains duplicate identities")
    failure_codes = set()
    if not _attempt_within_frozen_study_timeout(ledger):
        failure_codes.add("INTERRUPTED_OR_AMBIGUOUS")
    complete_count = 0
    hold_count = 0
    dataset_bindings = set()
    expected_case_hashes: dict[tuple[str, int], str] = {}
    for slot in slots:
        claim = claim_by_slot.get(slot.slot_id)
        if claim is None:
            failure_codes.add("INTERRUPTED_OR_AMBIGUOUS")
            continue
        validate_claim_for_slot(claim, slot, plan.plan_hash)
        _require_frozen_claim_deadline(claim)
        _require_claim_runtime_provenance(claim, runtime_manifest)
        if claim.slot_hash != expected_hashes[slot.slot_id]:
            raise VBDJointReplicatedRunnerError("claim slot hash does not match manifest")
        # Full and restricted fits share one dataset. The cell and replicate
        # scenario therefore belong in the dataset identity, not the seed alone.
        dataset_bindings.add((claim.scenario_id, claim.dataset_seed))
        disposition = disposition_by_slot.get(slot.slot_id)
        if disposition is None:
            failure_codes.add("INTERRUPTED_OR_AMBIGUOUS")
            continue
        validate_disposition_for_claim(disposition, claim)
        checkpoint = checkpoint_by_slot.get(slot.slot_id)
        if checkpoint is None:
            failure_codes.add("INTERRUPTED_OR_AMBIGUOUS")
            continue
        if (
            checkpoint.claim_hash != disposition.claim_hash
            or checkpoint.state != disposition.state
            or checkpoint.failure_code != disposition.failure_code
            or checkpoint.result_hash != disposition.result_hash
        ):
            raise VBDJointReplicatedRunnerError(
                "checkpoint does not bind the namespace disposition"
            )
        completed_at = _timestamp("completed_at", checkpoint.completed_at)
        if not _checkpoint_completion_matches_claim(disposition, claim, completed_at):
            raise VBDJointReplicatedRunnerError(
                "checkpoint completion is outside the claimed execution window"
            )
        dataset_identity = (claim.scenario_id, claim.dataset_seed)
        if disposition.failure_code == "DATASET_REGENERATION_FAILURE":
            expected_case_hash = dataset_regeneration_failure_case_hash(claim)
        else:
            expected_case_hash = expected_case_hashes.get(dataset_identity)
            if expected_case_hash is None:
                expected_case_hash = generate_vbd_joint_replicated_case_for_slot(
                    slot
                ).content_hash()
                expected_case_hashes[dataset_identity] = expected_case_hash
        if checkpoint.case_hash != expected_case_hash:
            raise VBDJointReplicatedRunnerError(
                "checkpoint case provenance does not match deterministic regeneration"
            )
        if disposition.state == "COMPLETE":
            complete_count += 1
        else:
            hold_count += 1
            failure_codes.add(disposition.failure_code)
    if len(dataset_bindings) != (400 if namespace == "qualifying" else 4 if namespace == "preflight" else 1):
        failure_codes.add("INTERRUPTED_OR_AMBIGUOUS")
    expected_dataset_count = 400 if namespace == "qualifying" else 4 if namespace == "preflight" else 1
    state = "COMPLETE" if (
        len(namespace_claims) == len(slots)
        and len(namespace_dispositions) == len(slots)
        and len(namespace_checkpoints) == len(slots)
        and complete_count == len(slots)
        and not failure_codes
        and len(dataset_bindings) == expected_dataset_count
    ) else "HOLD"
    manifest_hash = sha256_json(
        {
            "namespace": namespace,
            "slot_ids": list(expected_ids),
            "slot_hashes": [item.slot_hash for item in slots],
        }
    )
    body = {
        "namespace": namespace,
        "expected_slot_count": len(slots),
        "observed_claim_count": len(namespace_claims),
        "observed_disposition_count": len(namespace_dispositions),
        "expected_dataset_count": expected_dataset_count,
        "observed_dataset_count": len(dataset_bindings),
        "complete_count": complete_count,
        "hold_count": hold_count,
        "failure_codes": sorted(failure_codes),
        "manifest_hash": manifest_hash,
        "attempt_root": ledger.namespace_root(namespace),
        "state": state,
    }
    summary_body = {**body, "failure_codes": tuple(body["failure_codes"])}
    return VBDJointReplicatedNamespaceSummary(
        **summary_body,
        summary_hash=sha256_json(body),
    )


def _artifact_json_value(value: object, *, path: str = "") -> None:
    if value is None or isinstance(value, (bool, int, float, str)):
        if isinstance(value, float) and not math.isfinite(value):
            raise VBDJointReplicatedRunnerError(f"artifact contains nonfinite value at {path}")
        if isinstance(value, str) and any(token in value.lower() for token in _FORBIDDEN_ARTIFACT_TOKENS):
            raise VBDJointReplicatedRunnerError(f"artifact contains unsafe value at {path}")
        return
    if isinstance(value, list):
        for index, item in enumerate(value):
            _artifact_json_value(item, path=f"{path}[{index}]")
        return
    if isinstance(value, dict):
        for key, item in value.items():
            if type(key) is not str:
                raise VBDJointReplicatedRunnerError("artifact keys must be strings")
            if any(token in key.lower() for token in _FORBIDDEN_ARTIFACT_TOKENS):
                raise VBDJointReplicatedRunnerError(f"artifact contains unsafe key {key}")
            _artifact_json_value(item, path=f"{path}.{key}")
        return
    raise VBDJointReplicatedRunnerError(f"artifact contains unsupported value at {path}")


@dataclass(frozen=True, slots=True)
class VBDJointReplicatedEnsembleArtifact:
    """Sanitized aggregate study summary with all authorization fixed false."""

    schema_version: str
    protocol_id: str
    plan_hash: str
    runtime_manifest_hash: str
    preflight_summary_hash: str
    canary_summary_hash: str
    qualifying_summary_hash: str
    complete_attempt_root: str
    state: str
    expected_dataset_count: int
    observed_dataset_count: int
    expected_fit_count: int
    observed_fit_count: int
    namespace_states: tuple[tuple[str, str], ...]
    gate_states: tuple[tuple[str, str], ...]
    failure_codes: tuple[str, ...]
    authorization_flags: tuple[tuple[str, bool], ...]
    artifact_hash: str

    def __post_init__(self) -> None:
        if self.schema_version != VBD_JOINT_REPLICATED_ARTIFACT_SCHEMA:
            raise VBDJointReplicatedRunnerError("artifact schema is off plan")
        if self.protocol_id != "FT_VBD_JOINT_REPLICATED_VALIDATION_V4":
            raise VBDJointReplicatedRunnerError("artifact protocol is off plan")
        _sha("plan_hash", self.plan_hash)
        _sha("runtime_manifest_hash", self.runtime_manifest_hash)
        for name, value in (
            ("preflight_summary_hash", self.preflight_summary_hash),
            ("canary_summary_hash", self.canary_summary_hash),
            ("qualifying_summary_hash", self.qualifying_summary_hash),
            ("complete_attempt_root", self.complete_attempt_root),
            ("artifact_hash", self.artifact_hash),
        ):
            _sha(name, value)
        _closed("state", self.state, VBD_JOINT_REPLICATED_STATES)
        for name in (
            "expected_dataset_count",
            "observed_dataset_count",
            "expected_fit_count",
            "observed_fit_count",
        ):
            value = getattr(self, name)
            if type(value) is not int or value < 0:
                raise VBDJointReplicatedRunnerError(f"{name} must be a nonnegative integer")
        if type(self.namespace_states) is not tuple or tuple(name for name, _ in self.namespace_states) != VBD_JOINT_REPLICATED_NAMESPACES:
            raise VBDJointReplicatedRunnerError("namespace states are incomplete or reordered")
        for name, value in self.namespace_states:
            _closed("namespace", name, VBD_JOINT_REPLICATED_NAMESPACES)
            _closed("namespace state", value, VBD_JOINT_REPLICATED_STATES)
        if type(self.gate_states) is not tuple or tuple(name for name, _ in self.gate_states) != VBD_JOINT_REPLICATED_STUDY_GATE_NAMES:
            raise VBDJointReplicatedRunnerError("gate states are incomplete or reordered")
        for name, value in self.gate_states:
            _closed("gate state", value, VBD_JOINT_REPLICATED_GATE_STATES)
        if type(self.failure_codes) is not tuple:
            raise VBDJointReplicatedRunnerError("failure codes must be immutable")
        for code in self.failure_codes:
            _closed("failure code", code, VBD_JOINT_REPLICATED_FAILURE_CODES)
        expected_flags = (
            ("customer_output_authorized", False),
            ("probability_output_authorized", False),
            ("confidence_output_authorized", False),
            ("causal_impact_authorized", False),
            ("productivity_output_authorized", False),
            ("roi_output_authorized", False),
            ("ranking_output_authorized", False),
            ("economic_output_authorized", False),
            ("real_data_authorized", False),
            ("runtime_integration_authorized", False),
        )
        if self.authorization_flags != expected_flags:
            raise VBDJointReplicatedRunnerError("authorization flags are not fixed false")
        if self.artifact_hash != sha256_json(self.body_without_hash()):
            raise VBDJointReplicatedRunnerError("artifact self-hash is invalid")

    def body_without_hash(self) -> dict:
        return {
            "schema_version": self.schema_version,
            "protocol_id": self.protocol_id,
            "plan_hash": self.plan_hash,
            "runtime_manifest_hash": self.runtime_manifest_hash,
            "preflight_summary_hash": self.preflight_summary_hash,
            "canary_summary_hash": self.canary_summary_hash,
            "qualifying_summary_hash": self.qualifying_summary_hash,
            "complete_attempt_root": self.complete_attempt_root,
            "state": self.state,
            "expected_dataset_count": self.expected_dataset_count,
            "observed_dataset_count": self.observed_dataset_count,
            "expected_fit_count": self.expected_fit_count,
            "observed_fit_count": self.observed_fit_count,
            "namespace_states": [list(item) for item in self.namespace_states],
            "gate_states": [list(item) for item in self.gate_states],
            "failure_codes": list(self.failure_codes),
            "authorization_flags": [list(item) for item in self.authorization_flags],
        }

    def to_dict(self) -> dict:
        return {**self.body_without_hash(), "artifact_hash": self.artifact_hash}


def emit_sanitized_ensemble_artifact(
    ledger: VBDJointReplicatedAttemptLedger,
    *,
    runtime_manifest: VBDJointReplicatedRuntimeManifest,
    plan: VBDJointReplicatedValidationPlan | None = None,
) -> dict:
    """Emit a sanitized V4 ensemble state, HOLDing until study gates exist."""

    _require_observed_runtime_manifest(runtime_manifest)
    plan = _require_canonical_plan(
        vbd_joint_replicated_validation_plan() if plan is None else plan
    )
    validate_seed_manifest()
    summaries = {
        namespace: combine_namespace(
            ledger,
            namespace=namespace,
            plan=plan,
            runtime_manifest=runtime_manifest,
        )
        for namespace in VBD_JOINT_REPLICATED_NAMESPACES
    }
    failure_codes = sorted(
        {
            code
            for summary in summaries.values()
            for code in summary.failure_codes
        }
    )
    namespace_states = tuple(
        (namespace, summaries[namespace].state)
        for namespace in VBD_JOINT_REPLICATED_NAMESPACES
    )
    # The runner scaffolding cannot claim recovery, predictive, diagnostic, or
    # review gates.  They remain HOLD until the reviewed sampler path supplies
    # aggregate summaries and independent study review.
    gate_states = tuple(
        (name, "HOLD") for name in VBD_JOINT_REPLICATED_STUDY_GATE_NAMES
    )
    expected_fit_count = 600
    observed_fit_count = _observed_fit_count(summaries["qualifying"])
    expected_dataset_count = 400
    observed_dataset_count = summaries["qualifying"].observed_dataset_count
    body = {
        "schema_version": VBD_JOINT_REPLICATED_ARTIFACT_SCHEMA,
        "protocol_id": "FT_VBD_JOINT_REPLICATED_VALIDATION_V4",
        "plan_hash": plan.plan_hash,
        "runtime_manifest_hash": runtime_manifest.manifest_hash,
        "preflight_summary_hash": summaries["preflight"].summary_hash,
        "canary_summary_hash": summaries["runtime_canary"].summary_hash,
        "qualifying_summary_hash": summaries["qualifying"].summary_hash,
        "complete_attempt_root": ledger.attempt_root,
        "state": "HOLD",
        "expected_dataset_count": expected_dataset_count,
        "observed_dataset_count": observed_dataset_count,
        "expected_fit_count": expected_fit_count,
        "observed_fit_count": observed_fit_count,
        "namespace_states": [list(item) for item in namespace_states],
        "gate_states": [list(item) for item in gate_states],
        "failure_codes": failure_codes,
        "authorization_flags": [
            ["customer_output_authorized", False],
            ["probability_output_authorized", False],
            ["confidence_output_authorized", False],
            ["causal_impact_authorized", False],
            ["productivity_output_authorized", False],
            ["roi_output_authorized", False],
            ["ranking_output_authorized", False],
            ["economic_output_authorized", False],
            ["real_data_authorized", False],
            ["runtime_integration_authorized", False],
        ],
    }
    artifact_kwargs = {
        **body,
        "namespace_states": tuple(tuple(item) for item in body["namespace_states"]),
        "gate_states": tuple(tuple(item) for item in body["gate_states"]),
        "failure_codes": tuple(body["failure_codes"]),
        "authorization_flags": tuple(tuple(item) for item in body["authorization_flags"]),
        "artifact_hash": sha256_json(body),
    }
    artifact = VBDJointReplicatedEnsembleArtifact(**artifact_kwargs).to_dict()
    validate_sanitized_ensemble_artifact(
        artifact,
        ledger=ledger,
        runtime_manifest=runtime_manifest,
        plan=plan,
    )
    return artifact


def validate_sanitized_ensemble_artifact(
    artifact: dict,
    *,
    ledger: VBDJointReplicatedAttemptLedger,
    runtime_manifest: VBDJointReplicatedRuntimeManifest,
    plan: VBDJointReplicatedValidationPlan | None = None,
) -> None:
    """Validate sanitized shape and recompute its complete ledger semantics."""

    _require_observed_runtime_manifest(runtime_manifest)
    if type(ledger) is not VBDJointReplicatedAttemptLedger:
        raise VBDJointReplicatedRunnerError("ledger must use the exact immutable type")
    plan = _require_canonical_plan(
        vbd_joint_replicated_validation_plan() if plan is None else plan
    )
    if type(artifact) is not dict:
        raise VBDJointReplicatedRunnerError("artifact must be a dictionary")
    expected_keys = {
        "schema_version",
        "protocol_id",
        "plan_hash",
        "runtime_manifest_hash",
        "preflight_summary_hash",
        "canary_summary_hash",
        "qualifying_summary_hash",
        "complete_attempt_root",
        "state",
        "expected_dataset_count",
        "observed_dataset_count",
        "expected_fit_count",
        "observed_fit_count",
        "namespace_states",
        "gate_states",
        "failure_codes",
        "authorization_flags",
        "artifact_hash",
    }
    if set(artifact) != expected_keys:
        raise VBDJointReplicatedRunnerError("artifact keys are incomplete or unsafe")
    _artifact_json_value(artifact)
    for name in (
        "schema_version",
        "protocol_id",
        "state",
        "plan_hash",
        "runtime_manifest_hash",
        "preflight_summary_hash",
        "canary_summary_hash",
        "qualifying_summary_hash",
        "complete_attempt_root",
        "artifact_hash",
    ):
        if name.endswith("hash") or name in {
            "plan_hash",
            "runtime_manifest_hash",
            "preflight_summary_hash",
            "canary_summary_hash",
            "qualifying_summary_hash",
            "complete_attempt_root",
            "artifact_hash",
        }:
            _sha(name, artifact[name])
    if artifact["runtime_manifest_hash"] != runtime_manifest.manifest_hash:
        raise VBDJointReplicatedRunnerError(
            "artifact runtime provenance does not match the expected manifest"
        )
    if artifact["schema_version"] != VBD_JOINT_REPLICATED_ARTIFACT_SCHEMA:
        raise VBDJointReplicatedRunnerError("artifact schema is invalid")
    if artifact["protocol_id"] != "FT_VBD_JOINT_REPLICATED_VALIDATION_V4":
        raise VBDJointReplicatedRunnerError("artifact protocol is invalid")
    for name in (
        "expected_dataset_count",
        "observed_dataset_count",
        "expected_fit_count",
        "observed_fit_count",
    ):
        if type(artifact[name]) is not int or artifact[name] < 0:
            raise VBDJointReplicatedRunnerError(f"artifact {name} is invalid")
    if type(artifact["namespace_states"]) is not list or any(
        type(item) is not list
        or len(item) != 2
        or type(item[0]) is not str
        or type(item[1]) is not str
        for item in artifact["namespace_states"]
    ):
        raise VBDJointReplicatedRunnerError("artifact namespace states are malformed")
    namespace_states = tuple(tuple(item) for item in artifact["namespace_states"])
    if tuple(item[0] for item in namespace_states) != VBD_JOINT_REPLICATED_NAMESPACES:
        raise VBDJointReplicatedRunnerError("artifact namespace states are incomplete")
    for name, state in namespace_states:
        _closed("artifact namespace", name, VBD_JOINT_REPLICATED_NAMESPACES)
        _closed("artifact namespace state", state, VBD_JOINT_REPLICATED_STATES)
    if type(artifact["gate_states"]) is not list or any(
        type(item) is not list
        or len(item) != 2
        or type(item[0]) is not str
        or type(item[1]) is not str
        for item in artifact["gate_states"]
    ):
        raise VBDJointReplicatedRunnerError("artifact gate states are malformed")
    gate_states = tuple(tuple(item) for item in artifact["gate_states"])
    if tuple(item[0] for item in gate_states) != VBD_JOINT_REPLICATED_STUDY_GATE_NAMES:
        raise VBDJointReplicatedRunnerError("artifact gate states are incomplete")
    for name, state in gate_states:
        if name not in VBD_JOINT_REPLICATED_STUDY_GATE_NAMES:
            raise VBDJointReplicatedRunnerError("artifact gate name is invalid")
        _closed("artifact gate state", state, VBD_JOINT_REPLICATED_GATE_STATES)
    if type(artifact["failure_codes"]) is not list:
        raise VBDJointReplicatedRunnerError("artifact failure codes are invalid")
    for code in artifact["failure_codes"]:
        _closed("artifact failure code", code, VBD_JOINT_REPLICATED_FAILURE_CODES)
    if artifact["artifact_hash"] != sha256_json(
        {key: value for key, value in artifact.items() if key != "artifact_hash"}
    ):
        raise VBDJointReplicatedRunnerError("artifact self-hash is invalid")

    summaries = {
        namespace: combine_namespace(
            ledger,
            namespace=namespace,
            plan=plan,
            runtime_manifest=runtime_manifest,
        )
        for namespace in VBD_JOINT_REPLICATED_NAMESPACES
    }
    expected_failure_codes = sorted(
        {
            code
            for summary in summaries.values()
            for code in summary.failure_codes
        }
    )
    expected_semantics = {
        "plan_hash": plan.plan_hash,
        "preflight_summary_hash": summaries["preflight"].summary_hash,
        "canary_summary_hash": summaries["runtime_canary"].summary_hash,
        "qualifying_summary_hash": summaries["qualifying"].summary_hash,
        "complete_attempt_root": ledger.attempt_root,
        "state": "HOLD",
        "expected_dataset_count": 400,
        "observed_dataset_count": summaries["qualifying"].observed_dataset_count,
        "expected_fit_count": 600,
        "observed_fit_count": _observed_fit_count(summaries["qualifying"]),
        "namespace_states": [
            [namespace, summaries[namespace].state]
            for namespace in VBD_JOINT_REPLICATED_NAMESPACES
        ],
        "gate_states": [
            [name, "HOLD"] for name in VBD_JOINT_REPLICATED_STUDY_GATE_NAMES
        ],
        "failure_codes": expected_failure_codes,
    }
    if any(artifact[name] != value for name, value in expected_semantics.items()):
        raise VBDJointReplicatedRunnerError(
            "artifact summary semantics do not match the immutable ledger"
        )
    if artifact["state"] != "HOLD":
        raise VBDJointReplicatedRunnerError("sampler-free artifact cannot PASS")
    if type(artifact["authorization_flags"]) is not list or any(
        type(item) is not list
        or len(item) != 2
        or type(item[0]) is not str
        or type(item[1]) is not bool
        for item in artifact["authorization_flags"]
    ):
        raise VBDJointReplicatedRunnerError("artifact authorization flags are invalid")
    flags = tuple(tuple(item) for item in artifact["authorization_flags"])
    expected_flags = (
        ("customer_output_authorized", False),
        ("probability_output_authorized", False),
        ("confidence_output_authorized", False),
        ("causal_impact_authorized", False),
        ("productivity_output_authorized", False),
        ("roi_output_authorized", False),
        ("ranking_output_authorized", False),
        ("economic_output_authorized", False),
        ("real_data_authorized", False),
        ("runtime_integration_authorized", False),
    )
    if flags != expected_flags:
        raise VBDJointReplicatedRunnerError("artifact authority is not fixed false")


__all__ = [
    "VBD_JOINT_REPLICATED_RUNTIME_PYTHON",
    "VBD_JOINT_REPLICATED_RUNTIME_PLATFORM",
    "VBD_JOINT_REPLICATED_RUNTIME_LOCKFILE_HASH",
    "VBD_JOINT_REPLICATED_RUNTIME_PACKAGES",
    "VBDJointReplicatedRuntimeManifest",
    "VBDJointReplicatedExecutionPacket",
    "VBDJointReplicatedExecutionAuthorization",
    "VBDJointReplicatedAttemptCheckpoint",
    "VBDJointReplicatedAttemptLedger",
    "VBDJointReplicatedNamespaceSummary",
    "VBDJointReplicatedEnsembleArtifact",
    "VBDJointReplicatedRunnerError",
    "observe_runtime_manifest",
    "build_sampler_free_execution_packet",
    "authorize_reviewed_execution",
    "validate_reviewed_execution_authorization",
    "make_claim_for_slot",
    "dataset_regeneration_failure_case_hash",
    "make_checkpoint_for_disposition",
    "combine_namespace",
    "emit_sanitized_ensemble_artifact",
    "validate_sanitized_ensemble_artifact",
]
