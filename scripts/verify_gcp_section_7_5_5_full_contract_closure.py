#!/usr/bin/env python3
"""Verify the bounded Section 7.5.5 docs-only closure projection."""

from __future__ import annotations

import copy
import hashlib
import json
import os
import stat
import sys
from pathlib import Path
from typing import Any, Callable


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
CONTRACT_PATH = (
    "docs/contracts/canonical-inference-gcp-full-contract-closure/"
    "full-contract-closure-contract.json"
)
EXPECTED_CONTRACT_SHA256 = (
    "a23f7afad3f32d6e6a1bc2ddc4eb3fb1c02af5b12826f3f4dd412a304858cb19"
)
QUEUE_PATH = ".project/WORK_QUEUE.json"
QUEUE_ITEM_ID = "gcp-canonical-runtime-section-7-5-full-contract-gate"
QUEUE_FIELDS = ("id", "title", "bound", "risk")
QUEUE_ROW_FIELDS = frozenset({*QUEUE_FIELDS, "status", "last_note"})


def _sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def _canonical_sha256(value: Any) -> str:
    return _sha256(_canonical_bytes(value))


def _canonical_bytes(value: Any) -> bytes:
    return json.dumps(
        value, sort_keys=True, separators=(",", ":"), allow_nan=False
    ).encode()


def _load_closed_object(raw: bytes) -> dict[str, Any]:
    """Load one duplicate-key-free JSON object."""

    def reject_duplicates(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
        value: dict[str, Any] = {}
        for key, item in pairs:
            if key in value:
                raise ValueError("duplicate key")
            value[key] = item
        return value

    value = json.loads(raw.decode("utf-8"), object_pairs_hook=reject_duplicates)
    if not isinstance(value, dict):
        raise ValueError("object required")
    return value


def _read_explicit_regular_file(root: Path, relative_path: str) -> bytes:
    """Read an explicit repository-relative regular file without symlink traversal."""

    relative = Path(relative_path)
    if (
        relative.is_absolute()
        or not relative.parts
        or any(part in {"", ".", ".."} for part in relative.parts)
        or not hasattr(os, "O_NOFOLLOW")
    ):
        raise OSError("invalid explicit path")
    opened: list[int] = []
    try:
        directory_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
        current = os.open(root, directory_flags)
        opened.append(current)
        for part in relative.parts[:-1]:
            current = os.open(part, directory_flags, dir_fd=current)
            opened.append(current)
        descriptor = os.open(
            relative.parts[-1], os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK,
            dir_fd=current,
        )
        opened.append(descriptor)
        if not stat.S_ISREG(os.fstat(descriptor).st_mode):
            raise OSError("regular file required")
        chunks: list[bytes] = []
        while True:
            chunk = os.read(descriptor, 64 * 1024)
            if not chunk:
                return b"".join(chunks)
            chunks.append(chunk)
    finally:
        for descriptor in reversed(opened):
            try:
                os.close(descriptor)
            except OSError:
                pass


def _load_authoritative_contract() -> dict[str, Any]:
    raw = _read_explicit_regular_file(REPOSITORY_ROOT, CONTRACT_PATH)
    if _sha256(raw) != EXPECTED_CONTRACT_SHA256:
        raise ValueError("contract pin mismatch")
    return _load_closed_object(raw)


def _load_authoritative_source_bytes(
    contract: dict[str, Any],
) -> tuple[tuple[str, bytes], ...]:
    """Load and verify the exact predecessor bytes compiled into this gate."""

    values: list[tuple[str, bytes]] = []
    for row in contract["source_contracts"]:
        raw = _read_explicit_regular_file(REPOSITORY_ROOT, row["path"])
        if _sha256(raw) != row["sha256"]:
            raise ValueError("source pin mismatch")
        values.append((row["path"], raw))
    return tuple(values)


try:
    loaded_contract = _load_authoritative_contract()
    _AUTHORITATIVE_CONTRACT_BYTES = _canonical_bytes(loaded_contract)
    _SOURCE_ROWS = tuple(
        (row["path"], row["sha256"])
        for row in loaded_contract["source_contracts"]
    )
    _AUTHORITATIVE_SOURCE_BYTES = _load_authoritative_source_bytes(loaded_contract)
    _QUEUE_PROJECTION_BYTES = _canonical_bytes(
        loaded_contract["queue_authorization_projection"]
    )
    _QUEUE_PROJECTION_SHA256 = loaded_contract["hashes"]["queue_projection_sha256"]
    AUTHORITATIVE_CONTRACT = copy.deepcopy(loaded_contract)
    BOOTSTRAP_VALID = True
except (OSError, TypeError, ValueError):
    _AUTHORITATIVE_CONTRACT_BYTES = b""
    _SOURCE_ROWS = ()
    _AUTHORITATIVE_SOURCE_BYTES = ()
    _QUEUE_PROJECTION_BYTES = b""
    _QUEUE_PROJECTION_SHA256 = ""
    AUTHORITATIVE_CONTRACT = {}
    BOOTSTRAP_VALID = False


def _resource_state(root: Path, interleaving: Callable[[], None] | None) -> str:
    """Classify only explicit resources admitted by the authoritative contract."""

    first_reads: dict[str, bytes] = {}
    expected_bytes = dict(_AUTHORITATIVE_SOURCE_BYTES)
    for path, _expected_sha256 in _SOURCE_ROWS:
        try:
            first_reads[path] = _read_explicit_regular_file(root, path)
        except (FileNotFoundError, NotADirectoryError):
            return "ABSENT"
        except OSError:
            return "CORRUPT"

    if interleaving is not None:
        interleaving()

    for path, expected_sha256 in _SOURCE_ROWS:
        try:
            current = _read_explicit_regular_file(root, path)
        except (FileNotFoundError, NotADirectoryError):
            return "ABSENT"
        except OSError:
            return "CORRUPT"
        expected = expected_bytes[path]
        if (
            current != first_reads[path]
            or _sha256(current) != expected_sha256
            or current != expected
        ):
            return "PARTIAL" if expected.startswith(current) else "CORRUPT"
    return "EXACT"


def _queue_matches(root: Path) -> bool:
    try:
        queue = _load_closed_object(_read_explicit_regular_file(root, QUEUE_PATH))
        rows = queue["items"]
        matches = [item for item in rows if item["id"] == QUEUE_ITEM_ID]
        if len(matches) != 1:
            return False
        row = matches[0]
        if type(row) is not dict or set(row) != QUEUE_ROW_FIELDS:
            return False
        projection = {field: row[field] for field in QUEUE_FIELDS}
        return (
            row["status"] in {"in_progress", "done"}
            and _canonical_bytes(projection) == _QUEUE_PROJECTION_BYTES
            and _canonical_sha256(projection) == _QUEUE_PROJECTION_SHA256
        )
    except (KeyError, StopIteration, TypeError, ValueError, OSError):
        return False


def evaluate_candidate(
    root: Path,
    candidate: dict[str, Any],
    mode: str = "CLEAN_CI",
    interleaving: Callable[[], None] | None = None,
) -> str:
    """Evaluate a docs-only candidate without accepting test-oracle metadata."""

    if mode == "LIVE_RUNTIME":
        return "HOLD_LIVE_RUNTIME_NOT_AUTHORIZED"
    if mode not in {"CLEAN_CI", "ARCHIVE_CLOSEOUT"}:
        return "HOLD"
    try:
        candidate_matches = (
            BOOTSTRAP_VALID
            and type(candidate) is dict
            and _canonical_bytes(candidate) == _AUTHORITATIVE_CONTRACT_BYTES
        )
    except (TypeError, ValueError):
        candidate_matches = False
    if not candidate_matches:
        return "HOLD" if mode == "CLEAN_CI" else "HOLD_ARCHIVE_CLOSEOUT_ONLY"

    try:
        resource = _resource_state(Path(root), interleaving)
    except Exception:
        resource = "CORRUPT"
    if resource != "EXACT":
        prefix = "HOLD_SOURCE_SET_" if mode == "CLEAN_CI" else "HOLD_ARCHIVE_SOURCE_SET_"
        return f"{prefix}{resource}"
    if not _queue_matches(Path(root)):
        return "HOLD" if mode == "CLEAN_CI" else "HOLD_ARCHIVE_CLOSEOUT_ONLY"
    if mode == "ARCHIVE_CLOSEOUT":
        return "HOLD_ARCHIVE_CLOSEOUT_ONLY"
    return "SECTION_7_5_CONTRACT_CLOSED"


def main() -> int:
    try:
        result = evaluate_candidate(REPOSITORY_ROOT, AUTHORITATIVE_CONTRACT)
    except (OSError, TypeError, ValueError):
        return 1
    return 0 if result == "SECTION_7_5_CONTRACT_CLOSED" else 1


if __name__ == "__main__":
    sys.exit(main())
