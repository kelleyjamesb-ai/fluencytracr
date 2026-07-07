"""Byte-parity tests for the Python ``stableStringify`` + sha256 port.

Expected strings and digests in this file were generated with Node against
the exact TypeScript implementation
(``packages/confidence-engine/src/internal/hashing.ts``): ``JSON.stringify``
for scalars, sorted-key object serialization, and
``createHash("sha256")...digest("hex")`` over the UTF-8 stable string. The
number cases pin the divergent float-formatting edge cases between
ECMAScript ``Number::toString`` and CPython ``repr``.
"""

import pytest

from fluencytracr_inference.hashing import (
    inference_proof_artifact_self_hash,
    inference_proof_artifact_self_hash_body,
    sha256_json,
    stable_stringify,
)

# (value, exact JSON.stringify output from Node v20)
JS_NUMBER_CASES = [
    (0.05, "0.05"),
    (0.8, "0.8"),
    (1e-12, "1e-12"),
    (5e-7, "5e-7"),  # CPython repr: 5e-07
    (1e-5, "0.00001"),  # CPython repr: 1e-05
    (0.0001, "0.0001"),
    (123456789012345680000.0, "123456789012345680000"),
    (1e21, "1e+21"),
    (2.0, "2"),  # CPython json: 2.0
    (-0.0, "0"),  # JSON.stringify(-0) === "0"
    (0.1 + 0.2, "0.30000000000000004"),
    (0.028284271247461903, "0.0282842712474619"),
    (1.0000000001, "1.0000000001"),
    (3.141592653589793, "3.141592653589793"),
    (1e-6, "0.000001"),
    (9.999999999999999e20, "999999999999999900000"),
    (-1.5e-9, "-1.5e-9"),
    (42, "42"),
    (-0.001, "-0.001"),
    (6.02e23, "6.02e+23"),
    (1.7976931348623157e308, "1.7976931348623157e+308"),
    (5e-324, "5e-324"),
    (1000000, "1000000"),
    (10000000000000000000000.5, "1e+22"),
]


@pytest.mark.parametrize("value, expected", JS_NUMBER_CASES)
def test_js_number_formatting_parity(value, expected):
    assert stable_stringify(value) == expected


def test_scalar_and_composite_parity():
    artifact = {
        "b": [1, 2.5, "x", None, True, False],
        "a": {"z": 0.05, "y": {"nested": [1e-7, 0.30000000000000004]}},
        "s": 'quote"backslash\\tab\tunicodeé',
    }
    # Node: stableStringify(artifact)
    assert stable_stringify(artifact) == (
        '{"a":{"y":{"nested":[1e-7,0.30000000000000004]},"z":0.05},'
        '"b":[1,2.5,"x",null,true,false],'
        '"s":"quote\\"backslash\\\\tab\\tunicodeé"}'
    )
    # Node: createHash("sha256").update(stableStringify(artifact), "utf8")
    assert sha256_json(artifact) == (
        "a119a71d36967be4c99df0d936f0bbf408ad10148e4c62081b4ee77de54c84c8"
    )


def test_keys_sorted_recursively():
    assert stable_stringify({"b": 1, "a": {"d": 2, "c": 3}}) == '{"a":{"c":3,"d":2},"b":1}'


def test_self_hash_body_omits_only_artifact_self_hash():
    artifact = {
        "field": 1,
        "hash_bindings": {
            "source_posterior_hash": "a" * 64,
            "synthetic_input_hash": "b" * 64,
            "artifact_self_hash": "c" * 64,
        },
    }
    body = inference_proof_artifact_self_hash_body(artifact)
    assert "artifact_self_hash" not in body["hash_bindings"]
    assert body["hash_bindings"]["source_posterior_hash"] == "a" * 64
    # The input artifact is not mutated.
    assert artifact["hash_bindings"]["artifact_self_hash"] == "c" * 64


def test_self_hash_stable_and_sensitive():
    artifact = {
        "field": 0.5,
        "nested": {"values": [1, 2, 3]},
        "hash_bindings": {"artifact_self_hash": "ignored"},
    }
    first = inference_proof_artifact_self_hash(artifact)
    second = inference_proof_artifact_self_hash(artifact)
    assert first == second
    # The declared self-hash value itself does not affect the digest.
    artifact["hash_bindings"]["artifact_self_hash"] = "different"
    assert inference_proof_artifact_self_hash(artifact) == first
    # Any body mutation changes the digest.
    artifact["field"] = 0.5000000001
    assert inference_proof_artifact_self_hash(artifact) != first
