"""Repeatable sampler-free persistence rehearsal for V3 diagnostic mechanics."""

from __future__ import annotations

import json
import os
from pathlib import Path
import stat

from .vbd_trajectory_precision_diagnostic import (
    validate_vbd_trajectory_precision_diagnostic_v3_record_with_checkpoints,
)
from .vbd_trajectory_precision_diagnostic_constants import (
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_CLAIM_ROOT_PATH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_WORKSPACE_PATH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_CHECKPOINT_ROOT_PATH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_CLAIM_ROOT_PATH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_WORKSPACE_PATH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CHECKPOINT_ROOT_PATH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CLAIM_ROOT_PATH,
    VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_WORKSPACE_PATH,
)
from .vbd_trajectory_validation_resumable import read_strict_json


VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_REHEARSAL_STAGED_FILENAME = (
    "diagnostic.rehearsal.staged.json"
)
VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_REHEARSAL_FINAL_FILENAME = (
    "diagnostic.rehearsal.json"
)


class VbdTrajectoryPrecisionDiagnosticV3RehearsalError(RuntimeError):
    """A non-evidentiary V3 persistence rehearsal failed closed."""


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


def _strict_rehearsal_directory(path: Path, label: str) -> Path:
    if (
        not path.is_absolute()
        or path != Path(os.path.normpath(str(path)))
        or path.resolve(strict=False) != path
    ):
        raise VbdTrajectoryPrecisionDiagnosticV3RehearsalError(
            f"{label} must be a normalized absolute path"
        )
    try:
        info = path.lstat()
    except OSError as exc:
        raise VbdTrajectoryPrecisionDiagnosticV3RehearsalError(
            f"{label} is unavailable"
        ) from exc
    if path.is_symlink() or not stat.S_ISDIR(info.st_mode):
        raise VbdTrajectoryPrecisionDiagnosticV3RehearsalError(
            f"{label} is unsafe"
        )
    return path


def _validate_rehearsal_roots(*, workspace: Path, checkpoint_root: Path) -> None:
    workspace = _strict_rehearsal_directory(workspace, "rehearsal workspace")
    checkpoint_root = _strict_rehearsal_directory(
        checkpoint_root, "rehearsal checkpoint root"
    )
    protected = tuple(
        Path(value)
        for value in (
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_WORKSPACE_PATH,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V1_CONSUMED_CLAIM_ROOT_PATH,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_WORKSPACE_PATH,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_CLAIM_ROOT_PATH,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V2_CONSUMED_CHECKPOINT_ROOT_PATH,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_WORKSPACE_PATH,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CLAIM_ROOT_PATH,
            VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_CHECKPOINT_ROOT_PATH,
        )
    )
    if (
        workspace == checkpoint_root
        or workspace.is_relative_to(checkpoint_root)
        or checkpoint_root.is_relative_to(workspace)
        or any(
            rehearsal == frozen
            or rehearsal.is_relative_to(frozen)
            or frozen.is_relative_to(rehearsal)
            for rehearsal in (workspace, checkpoint_root)
            for frozen in protected
        )
    ):
        raise VbdTrajectoryPrecisionDiagnosticV3RehearsalError(
            "rehearsal roots overlap a governed identity"
        )


def _write_create_once(path: Path, value: dict) -> None:
    descriptor = -1
    try:
        descriptor = os.open(
            path,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
            0o600,
        )
        encoded = _canonical_bytes(value)
        written = 0
        while written < len(encoded):
            written += os.write(descriptor, encoded[written:])
        os.fsync(descriptor)
    except OSError as exc:
        raise VbdTrajectoryPrecisionDiagnosticV3RehearsalError(
            "rehearsal output already exists or could not be written"
        ) from exc
    finally:
        if descriptor >= 0:
            os.close(descriptor)


def write_vbd_precision_diagnostic_v3_rehearsal_staged(
    *,
    record: dict,
    workspace: Path,
    checkpoint_root: Path,
    checkpoint_identity,
) -> Path:
    _validate_rehearsal_roots(
        workspace=workspace, checkpoint_root=checkpoint_root
    )
    validated = validate_vbd_trajectory_precision_diagnostic_v3_record_with_checkpoints(
        record,
        checkpoint_root=checkpoint_root,
        checkpoint_identity=checkpoint_identity,
    )
    staged = workspace / (
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_REHEARSAL_STAGED_FILENAME
    )
    _write_create_once(staged, validated)
    persisted = read_strict_json(staged)
    persisted = validate_vbd_trajectory_precision_diagnostic_v3_record_with_checkpoints(
        persisted,
        checkpoint_root=checkpoint_root,
        checkpoint_identity=checkpoint_identity,
    )
    if persisted != validated:
        raise VbdTrajectoryPrecisionDiagnosticV3RehearsalError(
            "rehearsal staged semantic readback differs"
        )
    return staged


def publish_vbd_precision_diagnostic_v3_rehearsal(
    *,
    workspace: Path,
    checkpoint_root: Path,
    checkpoint_identity,
) -> dict:
    _validate_rehearsal_roots(
        workspace=workspace, checkpoint_root=checkpoint_root
    )
    staged = workspace / (
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_REHEARSAL_STAGED_FILENAME
    )
    final = workspace / (
        VBD_TRAJECTORY_PRECISION_DIAGNOSTIC_V3_REHEARSAL_FINAL_FILENAME
    )
    staged_value = read_strict_json(staged)
    staged_bytes = _canonical_bytes(staged_value)
    staged_value = validate_vbd_trajectory_precision_diagnostic_v3_record_with_checkpoints(
        staged_value,
        checkpoint_root=checkpoint_root,
        checkpoint_identity=checkpoint_identity,
    )
    published = False
    try:
        os.link(staged, final, follow_symlinks=False)
        published = True
        os.unlink(staged)
        final_value = read_strict_json(final)
        final_value = validate_vbd_trajectory_precision_diagnostic_v3_record_with_checkpoints(
            final_value,
            checkpoint_root=checkpoint_root,
            checkpoint_identity=checkpoint_identity,
        )
        if _canonical_bytes(final_value) != staged_bytes or final_value != staged_value:
            raise VbdTrajectoryPrecisionDiagnosticV3RehearsalError(
                "rehearsal final readback differs from staging"
            )
        return final_value
    except BaseException:
        if published:
            try:
                final.unlink(missing_ok=True)
            except OSError:
                pass
        raise


def run_vbd_precision_diagnostic_v3_persistence_rehearsal(
    *,
    record: dict,
    workspace: Path,
    checkpoint_root: Path,
    checkpoint_identity,
) -> dict:
    """Run one repeatable, sampler-free, permanently non-evidentiary rehearsal."""

    write_vbd_precision_diagnostic_v3_rehearsal_staged(
        record=record,
        workspace=workspace,
        checkpoint_root=checkpoint_root,
        checkpoint_identity=checkpoint_identity,
    )
    return publish_vbd_precision_diagnostic_v3_rehearsal(
        workspace=workspace,
        checkpoint_root=checkpoint_root,
        checkpoint_identity=checkpoint_identity,
    )
