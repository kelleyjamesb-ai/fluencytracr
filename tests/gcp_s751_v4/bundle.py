"""Test-only final-directory capability admission for Section 7.5.1 V4.

The harness owns component-wise path admission.  Evaluator-side reference
admission starts from an already-admitted directory descriptor and verifies
only that directory object and its exact parent-contract members.
"""

from __future__ import annotations

import hashlib
import os
from pathlib import Path
import stat
from typing import Sequence

from tests.gcp_s751_v4.model import ManifestEntry


_INVALID_PARENT_RESOURCE_SET = "INVALID_PARENT_RESOURCE_SET"
_DIRECTORY_FLAGS = (
    os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC
)
_MEMBER_FLAGS = os.O_RDONLY | os.O_NONBLOCK | os.O_NOFOLLOW | os.O_CLOEXEC
_READ_SIZE = 1024 * 1024


class BundleAdmissionError(ValueError):
    """A fixed, closed parent-resource rejection."""


def open_harness_bundle(path: Path) -> int:
    """Open every harness path component without following symbolic links."""
    current_fd: int | None = None
    try:
        candidate = Path(path)
        if any(part in {".", ".."} for part in candidate.parts):
            raise BundleAdmissionError(_INVALID_PARENT_RESOURCE_SET)

        if candidate.is_absolute():
            current_fd = os.open(candidate.anchor, _DIRECTORY_FLAGS)
            components = candidate.parts[1:]
        else:
            current_fd = os.open(".", _DIRECTORY_FLAGS)
            components = candidate.parts

        for component in components:
            next_fd = os.open(
                component,
                _DIRECTORY_FLAGS,
                dir_fd=current_fd,
            )
            previous_fd = current_fd
            current_fd = next_fd
            os.close(previous_fd)

        if current_fd is None:
            raise BundleAdmissionError(_INVALID_PARENT_RESOURCE_SET)
        return current_fd
    except BundleAdmissionError:
        if current_fd is not None:
            _close_quietly(current_fd)
        raise
    except (OSError, TypeError, ValueError):
        if current_fd is not None:
            _close_quietly(current_fd)
        raise BundleAdmissionError(_INVALID_PARENT_RESOURCE_SET) from None


def reopen_owned_bundle(incoming_fd: int) -> int:
    """Reopen ``."`` to obtain an evaluator-owned open-file description."""
    owned_fd: int | None = None
    try:
        before = os.fstat(incoming_fd)
        if not stat.S_ISDIR(before.st_mode):
            raise BundleAdmissionError(_INVALID_PARENT_RESOURCE_SET)

        owned_fd = os.open(
            ".",
            _DIRECTORY_FLAGS,
            dir_fd=incoming_fd,
        )
        owned = os.fstat(owned_fd)
        if (
            not stat.S_ISDIR(owned.st_mode)
            or _object_identity(before) != _object_identity(owned)
        ):
            raise BundleAdmissionError(_INVALID_PARENT_RESOURCE_SET)
        return owned_fd
    except BundleAdmissionError:
        if owned_fd is not None:
            _close_quietly(owned_fd)
        raise
    except (OSError, TypeError, ValueError):
        if owned_fd is not None:
            _close_quietly(owned_fd)
        raise BundleAdmissionError(_INVALID_PARENT_RESOURCE_SET) from None


def admit_parent_bundle(
    incoming_fd: int,
    manifest: Sequence[ManifestEntry],
) -> dict[str, bytes]:
    """Read and verify the exact parent members from an admitted capability."""
    owned_fd: int | None = None
    try:
        entries = _validate_manifest(manifest)
        expected_names = tuple(entry.member_name for entry in entries)
        expected_name_set = set(expected_names)

        incoming_before = os.fstat(incoming_fd)
        if not stat.S_ISDIR(incoming_before.st_mode):
            raise BundleAdmissionError(_INVALID_PARENT_RESOURCE_SET)
        incoming_identity = _object_identity(incoming_before)

        owned_fd = reopen_owned_bundle(incoming_fd)
        owned_before = os.fstat(owned_fd)
        if _object_identity(owned_before) != incoming_identity:
            raise BundleAdmissionError(_INVALID_PARENT_RESOURCE_SET)

        if set(os.listdir(owned_fd)) != expected_name_set:
            raise BundleAdmissionError(_INVALID_PARENT_RESOURCE_SET)

        admitted: dict[str, bytes] = {}
        member_snapshots: dict[str, tuple[int, ...]] = {}
        for entry in entries:
            data, snapshot = _read_stable_member(owned_fd, entry.member_name)
            if hashlib.sha256(data).hexdigest() != entry.sha256:
                raise BundleAdmissionError(_INVALID_PARENT_RESOURCE_SET)
            admitted[entry.member_name] = data
            member_snapshots[entry.member_name] = snapshot

        if set(os.listdir(owned_fd)) != expected_name_set:
            raise BundleAdmissionError(_INVALID_PARENT_RESOURCE_SET)
        for entry in entries:
            current = os.stat(
                entry.member_name,
                dir_fd=owned_fd,
                follow_symlinks=False,
            )
            if (
                not stat.S_ISREG(current.st_mode)
                or _member_snapshot(current)
                != member_snapshots[entry.member_name]
            ):
                raise BundleAdmissionError(_INVALID_PARENT_RESOURCE_SET)

        incoming_after = os.fstat(incoming_fd)
        owned_after = os.fstat(owned_fd)
        if (
            not stat.S_ISDIR(incoming_after.st_mode)
            or not stat.S_ISDIR(owned_after.st_mode)
            or _object_identity(incoming_after) != incoming_identity
            or _object_identity(owned_after) != incoming_identity
        ):
            raise BundleAdmissionError(_INVALID_PARENT_RESOURCE_SET)

        return admitted
    except BundleAdmissionError:
        raise
    except (OSError, TypeError, ValueError):
        raise BundleAdmissionError(_INVALID_PARENT_RESOURCE_SET) from None
    finally:
        if owned_fd is not None:
            _close_quietly(owned_fd)


def _validate_manifest(
    manifest: Sequence[ManifestEntry],
) -> tuple[ManifestEntry, ...]:
    entries = tuple(manifest)
    if len(entries) != 5:
        raise BundleAdmissionError(_INVALID_PARENT_RESOURCE_SET)

    names: set[str] = set()
    for entry in entries:
        if not isinstance(entry, ManifestEntry):
            raise BundleAdmissionError(_INVALID_PARENT_RESOURCE_SET)
        name = entry.member_name
        if (
            not name
            or name in {".", ".."}
            or Path(name).name != name
            or name in names
            or len(entry.sha256) != 64
            or any(character not in "0123456789abcdef" for character in entry.sha256)
        ):
            raise BundleAdmissionError(_INVALID_PARENT_RESOURCE_SET)
        names.add(name)
    return entries


def _read_stable_member(
    owned_fd: int,
    member_name: str,
) -> tuple[bytes, tuple[int, ...]]:
    member_fd: int | None = None
    try:
        path_before = os.stat(
            member_name,
            dir_fd=owned_fd,
            follow_symlinks=False,
        )
        if not stat.S_ISREG(path_before.st_mode):
            raise BundleAdmissionError(_INVALID_PARENT_RESOURCE_SET)

        member_fd = os.open(
            member_name,
            _MEMBER_FLAGS,
            dir_fd=owned_fd,
        )
        descriptor_before = os.fstat(member_fd)
        if (
            not stat.S_ISREG(descriptor_before.st_mode)
            or _object_identity(path_before)
            != _object_identity(descriptor_before)
        ):
            raise BundleAdmissionError(_INVALID_PARENT_RESOURCE_SET)

        chunks: list[bytes] = []
        while True:
            chunk = os.read(member_fd, _READ_SIZE)
            if not chunk:
                break
            chunks.append(chunk)

        descriptor_after = os.fstat(member_fd)
        path_after = os.stat(
            member_name,
            dir_fd=owned_fd,
            follow_symlinks=False,
        )
        snapshot = _member_snapshot(descriptor_before)
        if (
            not stat.S_ISREG(descriptor_after.st_mode)
            or not stat.S_ISREG(path_after.st_mode)
            or _member_snapshot(descriptor_after) != snapshot
            or _member_snapshot(path_after) != snapshot
        ):
            raise BundleAdmissionError(_INVALID_PARENT_RESOURCE_SET)
        return b"".join(chunks), snapshot
    finally:
        if member_fd is not None:
            _close_quietly(member_fd)


def _object_identity(value: os.stat_result) -> tuple[int, int]:
    return value.st_dev, value.st_ino


def _member_snapshot(value: os.stat_result) -> tuple[int, ...]:
    return (
        value.st_dev,
        value.st_ino,
        value.st_mode,
        value.st_size,
        value.st_mtime_ns,
        value.st_ctime_ns,
    )


def _close_quietly(fd: int) -> None:
    try:
        os.close(fd)
    except OSError:
        pass
