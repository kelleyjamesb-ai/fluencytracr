#!/usr/bin/env python3
"""Silently verify the docs-only Section 7.6.1 pre-execution ledger."""

from __future__ import annotations

import copy
import hashlib
import json
import os
from pathlib import Path
import stat
import sys
import threading
from typing import Any, Callable, Dict, Optional, Tuple


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
CONTRACT_PATH = (
    "docs/contracts/canonical-inference-gcp-preexecution-ledger/"
    "preexecution-ledger-contract.json"
)
VECTORS_PATH = (
    "docs/contracts/canonical-inference-gcp-preexecution-ledger/"
    "canonicalization-vectors.json"
)
EXPECTED_CONTRACT_SHA256 = (
    "b6b2cbdd26b4d9941fb0681ec9049933877af16318dae45429bdd43eaf655083"
)
EXPECTED_VECTORS_SHA256 = (
    "0893c275863c87acbfda903bb4a7ecf91c3637b2a522bd19e50a854f43d994bf"
)
READY = "PRE_EXECUTION_RECORD_READY_FOR_SECTION_7_4_CONSUMPTION"
QUEUE_ROW_FIELDS = frozenset({"id", "title", "bound", "status", "risk", "last_note"})
_STATE_LOCK = threading.RLock()


def _sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def _canonical_bytes(value: Any) -> bytes:
    return json.dumps(
        value, sort_keys=True, separators=(",", ":"), allow_nan=False
    ).encode("utf-8")


def _canonical_sha256(value: Any) -> str:
    return _sha256(_canonical_bytes(value))


def _load_closed_object(raw: bytes) -> Dict[str, Any]:
    def reject_duplicates(pairs: list) -> Dict[str, Any]:
        value: Dict[str, Any] = {}
        for key, item in pairs:
            if key in value:
                raise ValueError("duplicate key")
            value[key] = item
        return value

    value = json.loads(raw.decode("utf-8"), object_pairs_hook=reject_duplicates)
    if type(value) is not dict:
        raise ValueError("object required")
    return value


def _read_explicit_regular_file(root: Path, relative_path: str) -> bytes:
    relative = Path(relative_path)
    if (
        relative.is_absolute()
        or not relative.parts
        or any(part in {"", ".", ".."} for part in relative.parts)
        or not hasattr(os, "O_NOFOLLOW")
    ):
        raise OSError("invalid explicit path")
    opened = []
    try:
        directory_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
        current = os.open(root, directory_flags)
        opened.append(current)
        for part in relative.parts[:-1]:
            current = os.open(part, directory_flags, dir_fd=current)
            opened.append(current)
        descriptor = os.open(
            relative.parts[-1],
            os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK,
            dir_fd=current,
        )
        opened.append(descriptor)
        if not stat.S_ISREG(os.fstat(descriptor).st_mode):
            raise OSError("regular file required")
        chunks = []
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


def _load_pinned_json(path: str, expected_sha256: str) -> Tuple[bytes, Dict[str, Any]]:
    raw = _read_explicit_regular_file(REPOSITORY_ROOT, path)
    if _sha256(raw) != expected_sha256:
        raise ValueError("pin mismatch")
    return raw, _load_closed_object(raw)


try:
    _contract_raw, _loaded_contract = _load_pinned_json(
        CONTRACT_PATH, EXPECTED_CONTRACT_SHA256
    )
    _vectors_raw, _loaded_vectors = _load_pinned_json(
        VECTORS_PATH, EXPECTED_VECTORS_SHA256
    )
    if (
        _loaded_contract["canonicalization_vectors"]["path"] != VECTORS_PATH
        or _loaded_contract["canonicalization_vectors"]["sha256"]
        != EXPECTED_VECTORS_SHA256
    ):
        raise ValueError("vector linkage mismatch")
    _SOURCE_ROWS = tuple(
        (row["path"], row["sha256"])
        for row in _loaded_contract["source_contracts"]
    )
    _SOURCE_BYTES = tuple(
        (path, _read_explicit_regular_file(REPOSITORY_ROOT, path))
        for path, _expected in _SOURCE_ROWS
    )
    if any(
        _sha256(dict(_SOURCE_BYTES)[path]) != expected
        for path, expected in _SOURCE_ROWS
    ):
        raise ValueError("source pin mismatch")
    _TRUSTED_CONTEXT_PATH = _loaded_contract["trusted_context"]["path"]
    _TRUSTED_CONTEXT_SHA256 = _loaded_contract["trusted_context"]["sha256"]
    _trusted_raw, _TRUSTED_CONTEXT = _load_pinned_json(
        _TRUSTED_CONTEXT_PATH, _TRUSTED_CONTEXT_SHA256
    )
    _QUEUE = copy.deepcopy(_loaded_contract["queue_authorization"])
    _ACCEPTED = {
        row["lineage_kind"]: copy.deepcopy(row)
        for row in _loaded_vectors["accepted_candidates"]
    }
    if set(_ACCEPTED) != {"INITIAL", "OPAQUE_RETRY"}:
        raise ValueError("candidate vectors incomplete")
    AUTHORITATIVE_CONTRACT = copy.deepcopy(_loaded_contract)
    CANONICALIZATION_VECTORS = copy.deepcopy(_loaded_vectors)
    BOOTSTRAP_VALID = True
except (KeyError, OSError, TypeError, ValueError):
    _SOURCE_ROWS = ()
    _SOURCE_BYTES = ()
    _TRUSTED_CONTEXT_PATH = ""
    _TRUSTED_CONTEXT_SHA256 = ""
    _TRUSTED_CONTEXT = {}
    _QUEUE = {}
    _ACCEPTED = {}
    AUTHORITATIVE_CONTRACT = {}
    CANONICALIZATION_VECTORS = {}
    BOOTSTRAP_VALID = False


def _candidate_vector(candidate: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    try:
        if type(candidate) is not dict:
            return None
        hashes = candidate["hashes"]
        claimed = hashes["candidate_sha256"]
        unsigned = copy.deepcopy(candidate)
        del unsigned["hashes"]["candidate_sha256"]
        if type(claimed) is not str or _canonical_sha256(unsigned) != claimed:
            return None
        lineage = candidate["records"]["lineage_input"]
        vector = _ACCEPTED.get(lineage["lineage_kind"])
        if vector is None or claimed != vector["candidate_sha256"]:
            return None
        reservation = candidate["records"]["reservation"]
        if (
            reservation["reservation_key"] != vector["reservation_key"]
            or lineage["authenticated_lineage_token_hash"]
            != vector["authenticated_lineage_token_hash"]
            or reservation["derived_attempt_ordinal"]
            != vector["derived_attempt_ordinal"]
            or reservation["derived_retry_ordinal"]
            != vector["derived_retry_ordinal"]
            or candidate["result"]["decision"] != READY
            or candidate["authority_effect"] != "NONE"
        ):
            return None
        return vector
    except (KeyError, TypeError, ValueError):
        return None


def _resource_state(root: Path, interleaving: Optional[Callable[[], None]]) -> str:
    expected_bytes = dict(_SOURCE_BYTES)
    first_reads = {}
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
            or current != expected
            or _sha256(current) != expected_sha256
        ):
            return "PARTIAL" if expected.startswith(current) else "CORRUPT"
    return "EXACT"


def _trusted_context_matches(root: Path, supplied: Dict[str, Any]) -> bool:
    try:
        raw = _read_explicit_regular_file(root, _TRUSTED_CONTEXT_PATH)
        return (
            _sha256(raw) == _TRUSTED_CONTEXT_SHA256
            and _load_closed_object(raw) == _TRUSTED_CONTEXT
            and type(supplied) is dict
            and _canonical_bytes(supplied) == _canonical_bytes(_TRUSTED_CONTEXT)
        )
    except (OSError, TypeError, ValueError):
        return False


def _queue_matches(root: Path) -> bool:
    try:
        queue = _load_closed_object(
            _read_explicit_regular_file(root, _QUEUE["path"])
        )
        rows = queue["items"]
        matches = [row for row in rows if row["id"] == _QUEUE["item_id"]]
        if len(matches) != 1:
            return False
        row = matches[0]
        if (
            type(row) is not dict
            or set(row) != QUEUE_ROW_FIELDS
            or type(row["last_note"]) is not str
            or row["status"] not in _QUEUE["admitted_statuses"]
        ):
            return False
        projection = {
            field: row[field] for field in _QUEUE["immutable_projection_fields"]
        }
        return (
            projection == _QUEUE["projection"]
            and _canonical_sha256(projection) == _QUEUE["canonical_sha256"]
        )
    except (KeyError, OSError, TypeError, ValueError):
        return False


def _write_set(candidate: Dict[str, Any]) -> Dict[str, Any]:
    records = candidate["records"]
    return {
        key: records[key]
        for key in (
            "reservation",
            "token_consumption_marker",
            "write_ahead_marker",
            "new_attempt_family_head",
            "expected_request_lineage",
        )
    }


def evaluate_candidate(
    root: Path,
    candidate: Dict[str, Any],
    mode: str,
    state: Dict[str, Any],
    interleaving: Optional[Callable[[], None]],
    trusted_context: Dict[str, Any],
    transaction: Optional[Any] = None,
) -> str:
    """Evaluate one nonauthorizing docs candidate and fail closed."""

    if mode == "LIVE_RUNTIME":
        return "HOLD_LIVE_RUNTIME_NOT_AUTHORIZED"
    if mode not in {"CLEAN_CI", "ARCHIVE_CLOSEOUT"}:
        return "HOLD"
    archive_hold = mode == "ARCHIVE_CLOSEOUT"
    if not BOOTSTRAP_VALID or _candidate_vector(candidate) is None:
        return "HOLD_ARCHIVE_CLOSEOUT_ONLY" if archive_hold else "HOLD"
    try:
        resource = _resource_state(Path(root), interleaving)
    except Exception:
        resource = "CORRUPT"
    if resource != "EXACT":
        if interleaving is not None:
            return "HOLD_ARCHIVE_CLOSEOUT_ONLY" if archive_hold else "HOLD"
        prefix = (
            "HOLD_ARCHIVE_SOURCE_SET_" if archive_hold else "HOLD_SOURCE_SET_"
        )
        return prefix + resource
    if not _trusted_context_matches(Path(root), trusted_context):
        return "HOLD_ARCHIVE_CLOSEOUT_ONLY" if archive_hold else "HOLD"
    if not _queue_matches(Path(root)):
        return "HOLD_ARCHIVE_CLOSEOUT_ONLY" if archive_hold else "HOLD"
    if archive_hold:
        return "HOLD_ARCHIVE_CLOSEOUT_ONLY"

    try:
        if type(state) is not dict:
            return "HOLD"
        reservation_key = candidate["records"]["reservation"]["reservation_key"]
        lineage_token = candidate["records"]["lineage_input"][
            "authenticated_lineage_token_hash"
        ]
        with _STATE_LOCK:
            used_reservations = state.setdefault("used_reservation_keys", set())
            used_tokens = state.setdefault("used_lineage_tokens", set())
            if type(used_reservations) is not set or type(used_tokens) is not set:
                return "HOLD"
            if not all(
                type(value) is str and len(value) == 64
                for value in used_reservations | used_tokens
            ):
                return "HOLD"
            if reservation_key in used_reservations or lineage_token in used_tokens:
                return "HOLD"
            if transaction is not None:
                disposition = transaction.commit(_write_set(candidate))
                if disposition != "UNKNOWN_AFTER_WRITE":
                    return "HOLD"
                readback = transaction.readback(reservation_key)
                if _canonical_bytes(readback) != _canonical_bytes(candidate["records"]):
                    return "HOLD"
                transaction.expose(candidate["records"]["pre_execution_record"])
            used_reservations.add(reservation_key)
            used_tokens.add(lineage_token)
        return READY
    except Exception:
        return "HOLD"


def main() -> int:
    """Run silently; exit status is the only command-line output contract."""

    return 0 if BOOTSTRAP_VALID else 1


if __name__ == "__main__":
    sys.exit(main())
