"""Python reimplementation of the TypeScript spine hashing helpers.

Byte-parity port of ``packages/confidence-engine/src/internal/hashing.ts``
(``stableStringify`` + ``sha256Json``) and
``packages/confidence-engine/src/inferenceProofArtifactHash.ts``
(self-hash with ``hash_bindings.artifact_self_hash`` omitted).

The TypeScript boundary recomputes the artifact self-hash with the same
algorithm, so this module must produce the exact same bytes:

- object keys sorted (``Object.keys(...).sort()`` — code-unit order; all
  artifact keys are ASCII so Python's default ``sorted`` matches),
- JSON semantics for scalars, with ECMAScript ``Number::toString`` formatting
  for floats (JS and CPython both emit shortest round-trip digits, but they
  format exponents differently — e.g. JS ``5e-7`` vs Python ``5e-07`` and JS
  ``0.00001`` vs Python ``1e-05`` — so the JS formatting rules are
  reimplemented here),
- sha256 over the UTF-8 bytes of the stable string.

Parity is pinned by ``tests/test_hashing.py`` against fixtures generated with
Node's ``JSON.stringify``/``createHash``.
"""

from __future__ import annotations

import copy
import hashlib
import json
import math
from typing import Any


def _js_number_string(value: float) -> str:
    """Format a float exactly as ECMAScript ``JSON.stringify`` would.

    Implements the Number::toString(10) algorithm (ECMA-262 §6.1.6.1.20)
    on top of CPython's ``repr``, which — like JS engines — produces the
    unique shortest decimal digits that round-trip to the same double.
    """
    if math.isnan(value) or math.isinf(value):
        # JSON.stringify serializes non-finite numbers as null.
        return "null"
    if value == 0.0:
        # Covers -0.0: JSON.stringify(-0) === "0".
        return "0"

    negative = value < 0.0
    text = repr(abs(float(value)))

    # Decompose repr into shortest digits and a decimal exponent n such that
    # value == 0.<digits> * 10 ** n  (i.e. int(digits) * 10 ** (n - k)).
    if "e" in text or "E" in text:
        mantissa, _, exponent_text = text.lower().partition("e")
        exponent = int(exponent_text)
    else:
        mantissa, exponent = text, 0
    if "." in mantissa:
        integer_part, _, fraction_part = mantissa.partition(".")
        digits_raw = integer_part + fraction_part
        exponent -= len(fraction_part)
    else:
        digits_raw = mantissa
    # value == int(digits_raw) * 10 ** exponent. Strip leading zeros (from
    # forms like "0.001") and trailing zeros (fold them into the exponent).
    digits = digits_raw.lstrip("0")
    stripped_trailing = len(digits) - len(digits.rstrip("0"))
    digits = digits.rstrip("0")
    exponent += stripped_trailing
    k = len(digits)
    n = exponent + k  # decimal-point position: value == 0.<digits> * 10 ** n

    if k <= n <= 21:
        body = digits + "0" * (n - k)
    elif 0 < n <= 21:
        body = digits[:n] + "." + digits[n:]
    elif -6 < n <= 0:
        body = "0." + "0" * (-n) + digits
    else:
        exponent_out = n - 1
        exponent_body = f"e+{exponent_out}" if exponent_out >= 0 else f"e-{-exponent_out}"
        if k == 1:
            body = digits + exponent_body
        else:
            body = digits[0] + "." + digits[1:] + exponent_body

    return "-" + body if negative else body


def stable_stringify(value: Any) -> str:
    """Byte-parity port of the TS spine ``stableStringify``."""
    # bool must be checked before int (bool subclasses int in Python).
    if isinstance(value, bool):
        return "true" if value else "false"
    if value is None:
        return "null"
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, float):
        return _js_number_string(float(value))
    if isinstance(value, int):
        return str(value)
    if isinstance(value, (list, tuple)):
        return "[" + ",".join(stable_stringify(item) for item in value) + "]"
    if isinstance(value, dict):
        parts = []
        for key in sorted(value.keys()):
            if not isinstance(key, str):
                raise TypeError(f"stable_stringify requires string keys, got {key!r}")
            parts.append(json.dumps(key, ensure_ascii=False) + ":" + stable_stringify(value[key]))
        return "{" + ",".join(parts) + "}"
    # Coerce numpy scalars without importing numpy here: anything exposing
    # item() that yields a supported scalar is unwrapped once.
    item = getattr(value, "item", None)
    if callable(item):
        unwrapped = item()
        if not type(unwrapped) is type(value):
            return stable_stringify(unwrapped)
    raise TypeError(f"stable_stringify cannot serialize {type(value)!r}")


def sha256_json(value: Any) -> str:
    """sha256 hex digest of ``stable_stringify(value)`` (UTF-8 bytes)."""
    return hashlib.sha256(stable_stringify(value).encode("utf-8")).hexdigest()


def inference_proof_artifact_self_hash_body(artifact: dict) -> dict:
    """The artifact body with ``hash_bindings.artifact_self_hash`` omitted.

    Mirrors ``inferenceProofArtifactSelfHashBody`` in
    ``packages/confidence-engine/src/inferenceProofArtifactHash.ts``.
    """
    clone = copy.deepcopy(artifact)
    hash_bindings = clone.get("hash_bindings")
    if isinstance(hash_bindings, dict):
        hash_bindings.pop("artifact_self_hash", None)
    return clone


def inference_proof_artifact_self_hash(artifact: dict) -> str:
    """Self-hash exactly as the TypeScript boundary recomputes it."""
    return sha256_json(inference_proof_artifact_self_hash_body(artifact))
