"""Test-only boundary for isolated Section 7.5.1 P-256 anchor proofs."""

from __future__ import annotations

from base64 import b64decode, b64encode
from dataclasses import dataclass
import hashlib
import os
from pathlib import Path
import shutil
import stat
import subprocess
from typing import Mapping, Sequence

from tests.gcp_s751_v4.model import canonical_json, strict_load_json


_ROOT = Path(__file__).resolve().parents[2]
_HELPER = _ROOT / "tests/helpers/gcp_s751_v4_crypto.mjs"


@dataclass(frozen=True)
class VerifyVector:
    preimage: bytes
    signature_der: bytes


@dataclass(frozen=True)
class SignedBatch:
    anchor_spki_der: bytes
    key_id: str
    vectors: tuple[VerifyVector, ...]


def anchor_key_id(anchor_spki_der: bytes) -> str:
    """Derive the closed public anchor identifier from admitted SPKI DER bytes."""
    if not isinstance(anchor_spki_der, bytes):
        raise ValueError("anchor must be bytes")
    return "P256_SPKI_SHA256:" + hashlib.sha256(anchor_spki_der).hexdigest()


def sign_ephemeral_batch(preimages: Sequence[bytes]) -> SignedBatch:
    """Sign a bounded test batch with a newly generated process-local P-256 key."""
    canonical_preimages = _bytes_tuple(preimages, "preimages")
    response = _run_helper(
        {
            "operation": "sign",
            "preimages_base64": [_encode_base64(value) for value in canonical_preimages],
        }
    )
    _require_exact_keys(
        response,
        {
            "anchor_spki_der_base64",
            "key_id",
            "operation",
            "signature_der_base64",
        },
    )
    if response["operation"] != "sign":
        raise ValueError("invalid ephemeral crypto response")
    anchor_spki_der = _decode_base64(response["anchor_spki_der_base64"])
    key_id = response["key_id"]
    signature_values = response["signature_der_base64"]
    if not isinstance(key_id, str) or not isinstance(signature_values, list):
        raise ValueError("invalid ephemeral crypto response")
    if key_id != anchor_key_id(anchor_spki_der):
        raise ValueError("invalid ephemeral crypto response")
    if len(signature_values) != len(canonical_preimages):
        raise ValueError("invalid ephemeral crypto response")
    return SignedBatch(
        anchor_spki_der=anchor_spki_der,
        key_id=key_id,
        vectors=tuple(
            VerifyVector(preimage, _decode_base64(signature))
            for preimage, signature in zip(canonical_preimages, signature_values)
        ),
    )


def verify_batch(
    anchor_spki_der: bytes,
    vectors: Sequence[VerifyVector],
) -> tuple[bool, ...]:
    """Verify vectors only against the caller-admitted public anchor."""
    if not isinstance(anchor_spki_der, bytes):
        raise ValueError("anchor must be bytes")
    verified_vectors = _verify_vector_tuple(vectors)
    response = _run_helper(
        {
            "anchor_spki_der_base64": _encode_base64(anchor_spki_der),
            "operation": "verify",
            "vectors": [
                {
                    "preimage_base64": _encode_base64(vector.preimage),
                    "signature_der_base64": _encode_base64(vector.signature_der),
                }
                for vector in verified_vectors
            ],
        }
    )
    _require_exact_keys(response, {"operation", "valid"})
    values = response["valid"]
    if (
        response["operation"] != "verify"
        or not isinstance(values, list)
        or len(values) != len(verified_vectors)
        or not all(type(value) is bool for value in values)
    ):
        raise ValueError("invalid ephemeral crypto response")
    return tuple(values)


def _run_helper(request: Mapping[str, object]) -> dict[str, object]:
    completed = subprocess.run(
        [str(_NODE_EXECUTABLE), str(_HELPER)],
        check=False,
        cwd=_ROOT,
        env={},
        input=canonical_json(request),
        stderr=subprocess.PIPE,
        stdout=subprocess.PIPE,
        timeout=15,
    )
    if completed.returncode != 0 or completed.stderr:
        raise ValueError("ephemeral crypto helper failed")
    try:
        response = strict_load_json(completed.stdout)
    except ValueError as exc:
        raise ValueError("invalid ephemeral crypto response") from exc
    if not isinstance(response, dict):
        raise ValueError("invalid ephemeral crypto response")
    return response


def _bytes_tuple(values: Sequence[bytes], label: str) -> tuple[bytes, ...]:
    result = tuple(values)
    if not all(isinstance(value, bytes) for value in result):
        raise ValueError(f"{label} must contain bytes")
    return result


def _verify_vector_tuple(values: Sequence[VerifyVector]) -> tuple[VerifyVector, ...]:
    result = tuple(values)
    if not all(isinstance(value, VerifyVector) for value in result):
        raise ValueError("vectors must contain verification vectors")
    if not all(
        isinstance(vector.preimage, bytes) and isinstance(vector.signature_der, bytes)
        for vector in result
    ):
        raise ValueError("verification vectors must contain bytes")
    return result


def _encode_base64(value: bytes) -> str:
    return b64encode(value).decode("ascii")


def _decode_base64(value: object) -> bytes:
    if not isinstance(value, str):
        raise ValueError("invalid ephemeral crypto response")
    try:
        decoded = b64decode(value.encode("ascii"), validate=True)
    except (UnicodeEncodeError, ValueError) as exc:
        raise ValueError("invalid ephemeral crypto response") from exc
    if _encode_base64(decoded) != value:
        raise ValueError("invalid ephemeral crypto response")
    return decoded


def _require_exact_keys(value: Mapping[str, object], expected: set[str]) -> None:
    if set(value) != expected:
        raise ValueError("invalid ephemeral crypto response")


def _resolve_node_executable() -> Path:
    located = shutil.which("node")
    if located is None:
        raise RuntimeError("node executable unavailable")
    try:
        executable = Path(located).resolve(strict=True)
        mode = os.stat(executable).st_mode
    except OSError as exc:
        raise RuntimeError("node executable unavailable") from exc
    if not executable.is_absolute() or not stat.S_ISREG(mode) or not os.access(executable, os.X_OK):
        raise RuntimeError("node executable unavailable")
    return executable


_NODE_EXECUTABLE = _resolve_node_executable()
