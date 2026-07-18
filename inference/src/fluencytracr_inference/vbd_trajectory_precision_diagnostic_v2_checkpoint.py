"""Create-once postmortem checkpoints for the non-evidentiary V2 diagnostic."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import json
import os
from pathlib import Path
import stat

from .hashing import sha256_json
from .vbd_trajectory_precision_diagnostic_constants import (
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_ID,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_COMMIT,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_CLAIM_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_EXECUTION_AUTHORIZATION_HASH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_IMPLEMENTATION_COMMIT,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_INPUT_BINDING_HASH,
)


VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHECKPOINT_SCHEMA = (
    "vbd_precision_design_diagnostic_checkpoint_v2"
)
VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHECKPOINT_SEQUENCE = (
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
_SESSION_TOKEN = object()


class VbdTrajectoryPrecisionDiagnosticV2CheckpointError(RuntimeError):
    """A V2 checkpoint root or record violates the frozen sequence."""


def _strict_sha256(value: object, name: str) -> str:
    if (
        type(value) is not str
        or len(value) != 64
        or any(character not in "0123456789abcdef" for character in value)
    ):
        raise VbdTrajectoryPrecisionDiagnosticV2CheckpointError(
            f"{name} is not a sha256"
        )
    return value


def _strict_commit(value: object, name: str) -> str:
    if (
        type(value) is not str
        or len(value) != 40
        or any(character not in "0123456789abcdef" for character in value)
    ):
        raise VbdTrajectoryPrecisionDiagnosticV2CheckpointError(
            f"{name} is not an exact commit"
        )
    return value


def _strict_timestamp(value: object) -> str:
    if type(value) is not str:
        raise VbdTrajectoryPrecisionDiagnosticV2CheckpointError(
            "checkpoint timestamp is invalid"
        )
    try:
        parsed = datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ")
    except ValueError as exc:
        raise VbdTrajectoryPrecisionDiagnosticV2CheckpointError(
            "checkpoint timestamp is invalid"
        ) from exc
    if parsed.strftime("%Y-%m-%dT%H:%M:%SZ") != value:
        raise VbdTrajectoryPrecisionDiagnosticV2CheckpointError(
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
    if not root.is_absolute():
        raise VbdTrajectoryPrecisionDiagnosticV2CheckpointError(
            "checkpoint root must be absolute"
        )
    try:
        info = root.lstat()
        if root.is_symlink() or not stat.S_ISDIR(info.st_mode):
            raise OSError("checkpoint root is not a directory")
        return os.open(root, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    except OSError as exc:
        raise VbdTrajectoryPrecisionDiagnosticV2CheckpointError(
            "checkpoint root is unavailable"
        ) from exc


def _enumerate_regular_names(root_fd: int) -> tuple[str, ...]:
    try:
        names = tuple(sorted(os.listdir(root_fd)))
        for name in names:
            info = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
            if not stat.S_ISREG(info.st_mode):
                raise OSError("checkpoint entry is not a regular file")
        return names
    except OSError as exc:
        raise VbdTrajectoryPrecisionDiagnosticV2CheckpointError(
            "checkpoint root enumeration is unsafe"
        ) from exc


@dataclass(frozen=True)
class VbdTrajectoryPrecisionDiagnosticV2CheckpointIdentity:
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
        if (
            self.implementation_commit
            == VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_IMPLEMENTATION_COMMIT
            or self.authorization_commit
            == VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_AUTHORIZATION_COMMIT
            or self.human_execution_authorization_hash
            == VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_EXECUTION_AUTHORIZATION_HASH
            or self.attempt_claim_hash
            == VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_CLAIM_HASH
            or self.implementation_commit == self.authorization_commit
        ):
            raise VbdTrajectoryPrecisionDiagnosticV2CheckpointError(
                "consumed V1 or non-child identity cannot satisfy V2"
            )


@dataclass
class _CheckpointSession:
    root: Path
    root_fd: int
    identity: VbdTrajectoryPrecisionDiagnosticV2CheckpointIdentity
    next_ordinal: int
    predecessor_hash: str | None
    input_binding_hash: str | None
    token: object

    def close(self) -> None:
        if self.root_fd >= 0:
            os.close(self.root_fd)
            self.root_fd = -1


def start_vbd_precision_diagnostic_v2_checkpoint_session(
    *,
    root: Path,
    identity: VbdTrajectoryPrecisionDiagnosticV2CheckpointIdentity,
) -> _CheckpointSession:
    """Start only on an empty root; a partial root can never be resumed."""

    if type(identity) is not VbdTrajectoryPrecisionDiagnosticV2CheckpointIdentity:
        raise VbdTrajectoryPrecisionDiagnosticV2CheckpointError(
            "checkpoint identity is invalid"
        )
    root_fd = _strict_root_fd(root)
    if _enumerate_regular_names(root_fd):
        os.close(root_fd)
        raise VbdTrajectoryPrecisionDiagnosticV2CheckpointError(
            "checkpoint root is not empty; resume is forbidden"
        )
    return _CheckpointSession(
        root=root,
        root_fd=root_fd,
        identity=identity,
        next_ordinal=0,
        predecessor_hash=None,
        input_binding_hash=None,
        token=_SESSION_TOKEN,
    )


def validate_vbd_precision_diagnostic_v2_checkpoint(
    value: object,
    *,
    identity: VbdTrajectoryPrecisionDiagnosticV2CheckpointIdentity,
    ordinal: int,
    predecessor_hash: str | None,
    input_binding_hash: str | None,
) -> dict:
    if type(value) is not dict or set(value) != _CHECKPOINT_KEYS:
        raise VbdTrajectoryPrecisionDiagnosticV2CheckpointError(
            "checkpoint shape is invalid"
        )
    if type(ordinal) is not int or not 0 <= ordinal < len(
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHECKPOINT_SEQUENCE
    ):
        raise VbdTrajectoryPrecisionDiagnosticV2CheckpointError(
            "checkpoint ordinal is off plan"
        )
    _filename, phase, lane = (
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHECKPOINT_SEQUENCE[ordinal]
    )
    if ordinal == 0:
        if predecessor_hash is not None or input_binding_hash is not None:
            raise VbdTrajectoryPrecisionDiagnosticV2CheckpointError(
                "initial checkpoint bindings are not null"
            )
    else:
        _strict_sha256(predecessor_hash, "predecessor checkpoint")
        _strict_sha256(input_binding_hash, "input binding")
        if (
            input_binding_hash
            == VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_INPUT_BINDING_HASH
        ):
            raise VbdTrajectoryPrecisionDiagnosticV2CheckpointError(
                "consumed V1 input binding cannot satisfy V2"
            )
    body = {key: item for key, item in value.items() if key != "checkpoint_hash"}
    if (
        value["schema"]
        != VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHECKPOINT_SCHEMA
        or value["diagnostic_identity"]
        != VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_ID
        or value["implementation_commit"] != identity.implementation_commit
        or value["authorization_commit"] != identity.authorization_commit
        or value["authorization_manifest_hash"]
        != identity.authorization_manifest_hash
        or value["human_execution_authorization_hash"]
        != identity.human_execution_authorization_hash
        or value["attempt_claim_hash"] != identity.attempt_claim_hash
        or value["input_binding_hash"] != input_binding_hash
        or value["ordinal"] != ordinal
        or value["phase"] != phase
        or value["lane"] != lane
        or value["predecessor_checkpoint_hash"] != predecessor_hash
        or _strict_timestamp(value["created_at_utc"]) != value["created_at_utc"]
        or value["checkpoint_hash"] != sha256_json(body)
    ):
        raise VbdTrajectoryPrecisionDiagnosticV2CheckpointError(
            "checkpoint identity, sequence, or hash is invalid"
        )
    return value


def write_vbd_precision_diagnostic_v2_checkpoint(
    session: _CheckpointSession,
    *,
    created_at_utc: str,
    input_binding_hash: str | None,
) -> dict:
    """Write the next fixed checkpoint from one live in-memory session."""

    if (
        type(session) is not _CheckpointSession
        or session.token is not _SESSION_TOKEN
        or session.root_fd < 0
        or not 0 <= session.next_ordinal
        < len(VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHECKPOINT_SEQUENCE)
    ):
        raise VbdTrajectoryPrecisionDiagnosticV2CheckpointError(
            "checkpoint session is invalid or complete"
        )
    ordinal = session.next_ordinal
    expected_input_hash = None if ordinal == 0 else input_binding_hash
    if ordinal == 0:
        if input_binding_hash is not None:
            raise VbdTrajectoryPrecisionDiagnosticV2CheckpointError(
                "claim checkpoint cannot bind input"
            )
    else:
        _strict_sha256(input_binding_hash, "input binding")
        if (
            input_binding_hash
            == VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_INPUT_BINDING_HASH
        ):
            raise VbdTrajectoryPrecisionDiagnosticV2CheckpointError(
                "consumed V1 input binding cannot satisfy V2"
            )
        if session.input_binding_hash not in (None, input_binding_hash):
            raise VbdTrajectoryPrecisionDiagnosticV2CheckpointError(
                "checkpoint input binding changed"
            )
        session.input_binding_hash = input_binding_hash
    expected_prefix = tuple(
        item[0]
        for item in VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHECKPOINT_SEQUENCE[
            :ordinal
        ]
    )
    if _enumerate_regular_names(session.root_fd) != tuple(sorted(expected_prefix)):
        raise VbdTrajectoryPrecisionDiagnosticV2CheckpointError(
            "checkpoint root does not equal its exact written prefix"
        )
    filename, phase, lane = (
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHECKPOINT_SEQUENCE[ordinal]
    )
    body = {
        "schema": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHECKPOINT_SCHEMA,
        "diagnostic_identity": VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_ID,
        "implementation_commit": session.identity.implementation_commit,
        "authorization_commit": session.identity.authorization_commit,
        "authorization_manifest_hash": (
            session.identity.authorization_manifest_hash
        ),
        "human_execution_authorization_hash": (
            session.identity.human_execution_authorization_hash
        ),
        "attempt_claim_hash": session.identity.attempt_claim_hash,
        "input_binding_hash": expected_input_hash,
        "ordinal": ordinal,
        "phase": phase,
        "lane": lane,
        "predecessor_checkpoint_hash": session.predecessor_hash,
        "created_at_utc": _strict_timestamp(created_at_utc),
    }
    value = {**body, "checkpoint_hash": sha256_json(body)}
    validate_vbd_precision_diagnostic_v2_checkpoint(
        value,
        identity=session.identity,
        ordinal=ordinal,
        predecessor_hash=session.predecessor_hash,
        input_binding_hash=expected_input_hash,
    )
    encoded = _canonical_bytes(value)
    file_fd = -1
    try:
        file_fd = os.open(
            filename,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
            0o600,
            dir_fd=session.root_fd,
        )
        written = 0
        while written < len(encoded):
            written += os.write(file_fd, encoded[written:])
        os.fsync(file_fd)
        os.fsync(session.root_fd)
    except OSError as exc:
        raise VbdTrajectoryPrecisionDiagnosticV2CheckpointError(
            "checkpoint already exists or could not be written"
        ) from exc
    finally:
        if file_fd >= 0:
            os.close(file_fd)
    session.predecessor_hash = value["checkpoint_hash"]
    session.next_ordinal += 1
    return value


def validate_vbd_precision_diagnostic_v2_checkpoint_root(
    *,
    root: Path,
    identity: VbdTrajectoryPrecisionDiagnosticV2CheckpointIdentity,
) -> tuple[dict, ...]:
    """Read the complete root for postmortem validation only."""

    root_fd = _strict_root_fd(root)
    try:
        expected_names = tuple(
            sorted(
                item[0]
                for item in VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHECKPOINT_SEQUENCE
            )
        )
        if _enumerate_regular_names(root_fd) != expected_names:
            raise VbdTrajectoryPrecisionDiagnosticV2CheckpointError(
                "checkpoint root is incomplete or off plan"
            )
        values = []
        predecessor = None
        input_binding = None
        for ordinal, (filename, _phase, _lane) in enumerate(
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CHECKPOINT_SEQUENCE
        ):
            try:
                file_fd = os.open(filename, os.O_RDONLY | os.O_NOFOLLOW, dir_fd=root_fd)
                try:
                    data = b""
                    while True:
                        chunk = os.read(file_fd, 64 * 1024)
                        if not chunk:
                            break
                        data += chunk
                finally:
                    os.close(file_fd)
                value = json.loads(data)
            except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
                raise VbdTrajectoryPrecisionDiagnosticV2CheckpointError(
                    "checkpoint bytes are invalid"
                ) from exc
            if ordinal == 1:
                input_binding = value.get("input_binding_hash")
            validate_vbd_precision_diagnostic_v2_checkpoint(
                value,
                identity=identity,
                ordinal=ordinal,
                predecessor_hash=predecessor,
                input_binding_hash=input_binding if ordinal > 0 else None,
            )
            if data != _canonical_bytes(value):
                raise VbdTrajectoryPrecisionDiagnosticV2CheckpointError(
                    "checkpoint bytes are not canonical"
                )
            values.append(value)
            predecessor = value["checkpoint_hash"]
        return tuple(values)
    finally:
        os.close(root_fd)
