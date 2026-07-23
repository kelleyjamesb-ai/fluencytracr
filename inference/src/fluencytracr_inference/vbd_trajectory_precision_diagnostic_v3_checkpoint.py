"""Read and validate immutable postmortem checkpoints for diagnostic V3."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import json
import os
from pathlib import Path
import stat

from .hashing import sha256_json
from .vbd_trajectory_precision_diagnostic_constants import (
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_ID,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_COMMIT,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_MANIFEST_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_CLAIM_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_EXECUTION_AUTHORIZATION_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_IMPLEMENTATION_COMMIT,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_INPUT_BINDING_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_AUTHORIZATION_COMMIT,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_AUTHORIZATION_MANIFEST_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_CLAIM_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_EXECUTION_AUTHORIZATION_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_IMPLEMENTATION_COMMIT,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_INPUT_BINDING_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_OUTPUT_SHA256,
)


VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CHECKPOINT_SCHEMA = (
    "vbd_precision_design_diagnostic_checkpoint_v3"
)
VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CHECKPOINT_SEQUENCE = (
    ("checkpoint-00-claim_created-global.json", "claim_created", None),
    ("checkpoint-01-input_bound-global.json", "input_bound", None),
    (
        "checkpoint-02-lane_sampling_started-frequency.json",
        "lane_sampling_started",
        "frequency",
    ),
    (
        "checkpoint-03-lane_sampling_completed-frequency.json",
        "lane_sampling_completed",
        "frequency",
    ),
    (
        "checkpoint-04-lane_projection_completed-frequency.json",
        "lane_projection_completed",
        "frequency",
    ),
    (
        "checkpoint-05-lane_sampling_started-engagement.json",
        "lane_sampling_started",
        "engagement",
    ),
    (
        "checkpoint-06-lane_sampling_completed-engagement.json",
        "lane_sampling_completed",
        "engagement",
    ),
    (
        "checkpoint-07-lane_projection_completed-engagement.json",
        "lane_projection_completed",
        "engagement",
    ),
    (
        "checkpoint-08-lane_sampling_started-breadth.json",
        "lane_sampling_started",
        "breadth",
    ),
    (
        "checkpoint-09-lane_sampling_completed-breadth.json",
        "lane_sampling_completed",
        "breadth",
    ),
    (
        "checkpoint-10-lane_projection_completed-breadth.json",
        "lane_projection_completed",
        "breadth",
    ),
    (
        "checkpoint-11-result_ready_for_publication-global.json",
        "result_ready_for_publication",
        None,
    ),
)
_CHECKPOINT_KEYS = {
    "schema",
    "diagnostic_identity",
    "implementation_commit",
    "authorization_commit",
    "authorization_manifest_hash",
    "human_execution_authorization_hash",
    "attempt_claim_hash",
    "input_binding_hash",
    "ordinal",
    "phase",
    "lane",
    "predecessor_checkpoint_hash",
    "created_at_utc",
    "checkpoint_hash",
}

class VbdTrajectoryPrecisionDiagnosticV3CheckpointError(RuntimeError):
    """A V3 checkpoint root or record violates the frozen sequence."""


def _strict_sha256(value: object, name: str) -> str:
    if (
        type(value) is not str
        or len(value) != 64
        or any(character not in "0123456789abcdef" for character in value)
    ):
        raise VbdTrajectoryPrecisionDiagnosticV3CheckpointError(
            f"{name} is not a sha256"
        )
    return value


def _strict_commit(value: object, name: str) -> str:
    if (
        type(value) is not str
        or len(value) != 40
        or any(character not in "0123456789abcdef" for character in value)
    ):
        raise VbdTrajectoryPrecisionDiagnosticV3CheckpointError(
            f"{name} is not an exact commit"
        )
    return value


def _strict_timestamp(value: object) -> str:
    if type(value) is not str:
        raise VbdTrajectoryPrecisionDiagnosticV3CheckpointError(
            "checkpoint timestamp is invalid"
        )
    try:
        parsed = datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ")
    except ValueError as exc:
        raise VbdTrajectoryPrecisionDiagnosticV3CheckpointError(
            "checkpoint timestamp is invalid"
        ) from exc
    if parsed.strftime("%Y-%m-%dT%H:%M:%SZ") != value:
        raise VbdTrajectoryPrecisionDiagnosticV3CheckpointError(
            "checkpoint timestamp is not canonical"
        )
    return value


def _canonical_bytes(value: object) -> bytes:
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


def _strict_root_fd(root: Path) -> int:
    if (
        not isinstance(root, Path)
        or root.anchor != os.sep
        or any(part in (".", "..") or "\0" in part for part in root.parts[1:])
    ):
        raise VbdTrajectoryPrecisionDiagnosticV3CheckpointError(
            "checkpoint root must be canonical and absolute"
        )
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
    root_fd = -1
    try:
        root_fd = os.open(root.anchor, flags)
        for component in root.parts[1:]:
            previous_fd = root_fd
            root_fd = os.open(component, flags, dir_fd=previous_fd)
            os.close(previous_fd)
        if not stat.S_ISDIR(os.fstat(root_fd).st_mode):
            raise OSError("checkpoint root is not a directory")
        return root_fd
    except (OSError, TypeError, ValueError) as exc:
        if root_fd >= 0:
            try:
                os.close(root_fd)
            except OSError:
                pass
        raise VbdTrajectoryPrecisionDiagnosticV3CheckpointError(
            "checkpoint root is unavailable"
        ) from exc


def _enumerate_regular_entries(root_fd: int) -> tuple[tuple[str, int, int], ...]:
    try:
        entries = []
        for name in sorted(os.listdir(root_fd)):
            info = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
            if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
                raise OSError("checkpoint entry is not a unique regular file")
            entries.append((name, info.st_dev, info.st_ino))
        return tuple(entries)
    except OSError as exc:
        raise VbdTrajectoryPrecisionDiagnosticV3CheckpointError(
            "checkpoint root enumeration is unsafe"
        ) from exc


def _read_unique_regular_file(
    root_fd: int,
    filename: str,
    *,
    expected_device: int,
    expected_inode: int,
) -> bytes:
    file_fd = -1
    try:
        file_fd = os.open(
            filename,
            os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK,
            dir_fd=root_fd,
        )
        before = os.fstat(file_fd)
        if (
            not stat.S_ISREG(before.st_mode)
            or before.st_nlink != 1
            or before.st_dev != expected_device
            or before.st_ino != expected_inode
        ):
            raise OSError("checkpoint entry changed after enumeration")
        chunks = []
        while True:
            chunk = os.read(file_fd, 64 * 1024)
            if not chunk:
                break
            chunks.append(chunk)
        after = os.fstat(file_fd)
        if (
            not stat.S_ISREG(after.st_mode)
            or after.st_nlink != 1
            or (
                after.st_dev,
                after.st_ino,
                after.st_size,
                after.st_mtime_ns,
                after.st_ctime_ns,
            )
            != (
                before.st_dev,
                before.st_ino,
                before.st_size,
                before.st_mtime_ns,
                before.st_ctime_ns,
            )
        ):
            raise OSError("checkpoint entry changed while reading")
        return b"".join(chunks)
    except (OSError, TypeError, ValueError) as exc:
        raise VbdTrajectoryPrecisionDiagnosticV3CheckpointError(
            "checkpoint bytes are invalid"
        ) from exc
    finally:
        if file_fd >= 0:
            try:
                os.close(file_fd)
            except OSError:
                pass


@dataclass(frozen=True)
class VbdTrajectoryPrecisionDiagnosticV3CheckpointIdentity:
    implementation_commit: str
    authorization_commit: str
    authorization_manifest_hash: str
    human_execution_authorization_hash: str
    attempt_claim_hash: str

    def __post_init__(self) -> None:
        _strict_commit(self.implementation_commit, "implementation commit")
        _strict_commit(self.authorization_commit, "authorization commit")
        _strict_sha256(self.authorization_manifest_hash, "authorization manifest")
        _strict_sha256(
            self.human_execution_authorization_hash,
            "human execution authorization",
        )
        _strict_sha256(self.attempt_claim_hash, "attempt claim")
        consumed_commits = {
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_IMPLEMENTATION_COMMIT,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_COMMIT,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_IMPLEMENTATION_COMMIT,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_AUTHORIZATION_COMMIT,
        }
        consumed_hashes = {
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_MANIFEST_HASH,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_EXECUTION_AUTHORIZATION_HASH,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_CLAIM_HASH,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_INPUT_BINDING_HASH,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_AUTHORIZATION_MANIFEST_HASH,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_EXECUTION_AUTHORIZATION_HASH,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_CLAIM_HASH,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_INPUT_BINDING_HASH,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_OUTPUT_SHA256,
        }
        if (
            self.implementation_commit in consumed_commits
            or self.authorization_commit in consumed_commits
            or any(
                value in consumed_hashes
                for value in (
                    self.authorization_manifest_hash,
                    self.human_execution_authorization_hash,
                    self.attempt_claim_hash,
                )
            )
            or self.implementation_commit == self.authorization_commit
        ):
            raise VbdTrajectoryPrecisionDiagnosticV3CheckpointError(
                "consumed V1/V2 or non-child identity cannot satisfy V3"
            )


def validate_vbd_precision_diagnostic_v3_checkpoint(
    value: object,
    *,
    identity: VbdTrajectoryPrecisionDiagnosticV3CheckpointIdentity,
    ordinal: int,
    predecessor_hash: str | None,
    input_binding_hash: str | None,
) -> dict:
    if type(value) is not dict or set(value) != _CHECKPOINT_KEYS:
        raise VbdTrajectoryPrecisionDiagnosticV3CheckpointError(
            "checkpoint shape is invalid"
        )
    if type(ordinal) is not int or not 0 <= ordinal < len(
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CHECKPOINT_SEQUENCE
    ):
        raise VbdTrajectoryPrecisionDiagnosticV3CheckpointError(
            "checkpoint ordinal is off plan"
        )
    _filename, phase, lane = (
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CHECKPOINT_SEQUENCE[ordinal]
    )
    if ordinal == 0:
        if predecessor_hash is not None or input_binding_hash is not None:
            raise VbdTrajectoryPrecisionDiagnosticV3CheckpointError(
                "initial checkpoint bindings are not null"
            )
    else:
        _strict_sha256(predecessor_hash, "predecessor checkpoint")
        _strict_sha256(input_binding_hash, "input binding")
        if (
            input_binding_hash
            in {
                VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_MANIFEST_HASH,
                VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_EXECUTION_AUTHORIZATION_HASH,
                VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_CLAIM_HASH,
                VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_INPUT_BINDING_HASH,
                VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_AUTHORIZATION_MANIFEST_HASH,
                VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_EXECUTION_AUTHORIZATION_HASH,
                VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_CLAIM_HASH,
                VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_INPUT_BINDING_HASH,
                VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_OUTPUT_SHA256,
            }
        ):
            raise VbdTrajectoryPrecisionDiagnosticV3CheckpointError(
                "consumed V1/V2 input binding cannot satisfy V3"
            )
    body = {key: item for key, item in value.items() if key != "checkpoint_hash"}
    if (
        value["schema"]
        != VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CHECKPOINT_SCHEMA
        or value["diagnostic_identity"]
        != VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_ID
        or value["implementation_commit"] != identity.implementation_commit
        or value["authorization_commit"] != identity.authorization_commit
        or value["authorization_manifest_hash"]
        != identity.authorization_manifest_hash
        or value["human_execution_authorization_hash"]
        != identity.human_execution_authorization_hash
        or value["attempt_claim_hash"] != identity.attempt_claim_hash
        or value["input_binding_hash"] != input_binding_hash
        or type(value["ordinal"]) is not int
        or value["ordinal"] != ordinal
        or value["phase"] != phase
        or value["lane"] != lane
        or value["predecessor_checkpoint_hash"] != predecessor_hash
        or _strict_timestamp(value["created_at_utc"]) != value["created_at_utc"]
        or value["checkpoint_hash"] != sha256_json(body)
    ):
        raise VbdTrajectoryPrecisionDiagnosticV3CheckpointError(
            "checkpoint identity, sequence, or hash is invalid"
        )
    return value


def validate_vbd_precision_diagnostic_v3_checkpoint_root(
    *,
    root: Path,
    identity: VbdTrajectoryPrecisionDiagnosticV3CheckpointIdentity,
) -> tuple[dict, ...]:
    """Read the complete root for postmortem validation only."""

    root_fd = _strict_root_fd(root)
    try:
        expected_names = tuple(
            sorted(
                item[0]
                for item in VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CHECKPOINT_SEQUENCE
            )
        )
        entries = _enumerate_regular_entries(root_fd)
        if tuple(entry[0] for entry in entries) != expected_names:
            raise VbdTrajectoryPrecisionDiagnosticV3CheckpointError(
                "checkpoint root is incomplete or off plan"
            )
        entry_identities = {
            name: (device, inode) for name, device, inode in entries
        }
        values = []
        predecessor = None
        input_binding = None
        for ordinal, (filename, _phase, _lane) in enumerate(
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CHECKPOINT_SEQUENCE
        ):
            expected_device, expected_inode = entry_identities[filename]
            data = _read_unique_regular_file(
                root_fd,
                filename,
                expected_device=expected_device,
                expected_inode=expected_inode,
            )
            try:
                value = json.loads(data)
            except (RecursionError, UnicodeDecodeError, ValueError) as exc:
                raise VbdTrajectoryPrecisionDiagnosticV3CheckpointError(
                    "checkpoint bytes are invalid"
                ) from exc
            if ordinal == 1:
                input_binding = (
                    value.get("input_binding_hash")
                    if type(value) is dict
                    else None
                )
            validate_vbd_precision_diagnostic_v3_checkpoint(
                value,
                identity=identity,
                ordinal=ordinal,
                predecessor_hash=predecessor,
                input_binding_hash=input_binding if ordinal > 0 else None,
            )
            if data != _canonical_bytes(value):
                raise VbdTrajectoryPrecisionDiagnosticV3CheckpointError(
                    "checkpoint bytes are not canonical"
                )
            values.append(value)
            predecessor = value["checkpoint_hash"]
        return tuple(values)
    finally:
        os.close(root_fd)
