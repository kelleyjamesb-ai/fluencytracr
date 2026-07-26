#!/usr/bin/env python3
"""Pure offline validation helpers for the GCP Section 7.4 contract.

This module performs no network, GCP, credential, signing, persistence, or
runtime action. It validates checked-in docs-only contracts and deterministic
synthetic inputs. Hashes prove byte consistency only; they do not grant
runtime authority.
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import json
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[1]
CONTRACT_DIR = (
    ROOT / "docs/contracts/canonical-inference-gcp-attestation-receipt"
)
CONTRACT_PATH = CONTRACT_DIR / "attestation-receipt-contract.json"
SOURCE_PATH = CONTRACT_DIR / "provider-source-evidence.json"
REVALIDATION_PATH = CONTRACT_DIR / "provider-revalidation.json"
VECTORS_PATH = CONTRACT_DIR / "canonicalization-vectors.json"
EXPECTED_EMBEDDED_SOURCE_EVIDENCE_SHA256 = "60355202cccd7157d3a102a30379f3a5e5aa74de0ce43b77a41a2ff87a35dc12"
EXPECTED_EMBEDDED_REVALIDATION_SHA256 = "ad7dfcfa345274c22952aeaea3fe6aae7c00e9eb4a0a8e63aa2da3c484376ead"

HEX64 = re.compile(r"^[0-9a-f]{64}$")
HEX128 = re.compile(r"^[0-9a-f]{128}$")
BASE64URL43 = re.compile(r"^[A-Za-z0-9_-]{43}$")
ASCII_DOMAIN = re.compile(r"^[A-Z0-9:_-]+$")
SYNTHETIC_OIDC_KID = "synthetic-key-1"
SYNTHETIC_OIDC_N = "sjcOsUyVrrLnJshR-5qwwq2VGFy2-dTYSuAuoTq5c6eJr0fI5yXnQFEvneGMeiO2-7OPtXXXH5Hxu3GU3AlP08p4Tc0ZHKYEp-BVqo6Isj9cKnCc3E-edU0hwT9N_lV1rVVeqBeAecIDchGyX5-jVhqjsImwCLg8X5oIjSVBpB0h912uB4rqJsKD-VLqqgikSUZCFnLV57UXLpvZG_DKzfcUj4TsGLuzXcVoyRZMe5VtTqm2W8k4JtC3BQPX8PGKkcTUxd0n5ApQcDaWVJVxlJkigkfH2ZL_Ctu497uedZqVWZHpCnfP2G4eMTUu95QIFh8N_mXwYrSGdk-irjC0Ew"
SYNTHETIC_OIDC_E = "AQAB"
SYNTHETIC_OIDC_JWK_SHA256 = "19f7182f7801d0eb32368e29dfc3d7daae029db130b3f92024e9d35a20ea0f17"
FIXED_OIDC_ISSUER = "https://confidentialcomputing.googleapis.com"
FIXED_OIDC_AUDIENCE = "urn:fluencytracr:canonical-inference:gcp-attestation-verifier:v1"
SYNTHETIC_RESULT_CONTRACT_HASH = hashlib.sha256(
    b"FLUENCYTRACR:GCP_SYNTHETIC_RESULT_CONTRACT:V1\x00"
    + json.dumps(
        {
            "schema_version": "SYNTHETIC_CANONICAL_RESULT_V1",
            "required_keys": ["posterior", "value"],
            "unknown_fields": "REJECT",
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
).hexdigest()

P256_ORDER = int(
    "ffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551",
    16,
)

EXPECTED_SOURCE_REGISTRY_SHA256 = "fda800e66800833486b69bd2fcf6a3e94057a98e554e76f00e47c64c97468e35"
EXPECTED_CLAIM_REGISTRY_SHA256 = "45b178a04d866b5ba7c8fe49528b00765d779564b342cc268e16f2e9f636f16e"
EXPECTED_APPLICABILITY_REGISTRY_SHA256 = "4127243f164ce5fbcf35df31069fa593f12dd2a935a5a748b3140a27aaf7c675"

EXPECTED_CONTRACT_ROOT_KEYS = {
    "schema_version",
    "contract_version",
    "implements_candidate_section",
    "scope",
    "normative_design_binding",
    "canonicalization",
    "compiled_constants",
    "dependency_contract",
    "hash_node_registry",
    "selector_registry",
    "terminal_coherence_contract",
    "object_envelope_contract",
    "composition_contract",
    "replay_manifest_contract",
    "approval_registries",
    "source_trust_condition_registry",
    "decision_algorithms",
    "privacy",
    "future_interfaces",
    "non_authorization",
}
EXPECTED_APPROVAL_REGISTRIES = {
    "challenge_store",
    "consumer_verifier",
    "current_replay_policy",
    "current_replay_verifier",
    "expected_context_resolver",
    "kms_audit_mapping",
    "launcher_image_evidence_capability",
    "oidc_trust_snapshots",
    "quote_verifier_trust_collateral",
    "receipt_hashes",
    "receipt_signer_policy",
    "result_contract",
    "section_7_5_transport_retention",
    "section_7_6_contract",
    "tls_channel",
    "trusted_clock",
}
EXPECTED_METADATA_EXCLUSIONS = [
    "SECTION_7_4_OBJECT_KIND_REGISTRY",
    "SECTION_7_4_SELECTOR_REGISTRY",
    "SECTION_7_4_COMPOSITION_REGISTRY",
    "NON_AUTHORIZING_OBJECT_ENVELOPE",
    "NON_AUTHORIZING_COMPOSITION_ENVELOPE",
]
EXPECTED_REPLAY_KINDS = [
    "OIDC_DISCOVERY_JWKS_BUNDLE",
    "OIDC_TOKEN",
    "TRUST_DISTRIBUTION_RECORD",
    "PARENT_ATTEMPT_ENVELOPE",
    "PRE_EXECUTION_ATTEMPT_RECORD",
    "EXPECTED_REQUEST_RECORD",
    "EXPECTED_REQUEST_RESOLVER_RECORD",
    "FRESHNESS_TIMELINE_RECORD",
    "PRE_QUOTE_TRANSPORT_RECORD",
    "PRE_TDX_QUOTE",
    "PRE_CCEL_CEL_BUNDLE",
    "PRE_COLLATERAL_BUNDLE",
    "TERMINAL_RECEIPT_BODY",
    "TERMINAL_QUOTE_TRANSPORT_RECORD",
    "TERMINAL_TDX_QUOTE",
    "TERMINAL_CCEL_CEL_BUNDLE",
    "TERMINAL_COLLATERAL_BUNDLE",
    "TERMINAL_OBSERVATION_RECORD",
    "TERMINAL_OBSERVATION_RESOLVER_RECORD",
    "KMS_SIGN_TRANSPORT_RECORD",
    "KMS_REQUEST_RESPONSE_BUNDLE",
    "KMS_KEY_STATE",
    "AUDIT_MAPPING_RECORD",
    "CHANNEL_ENFORCEMENT_RECORD",
    "RUNTIME_PROFILE_OBJECT",
    "RUNTIME_INSTANCE_OBSERVATION",
    "RUNTIME_MEASUREMENT_MANIFEST",
    "EXPECTED_BINDER_MANIFEST",
    "SECTION_7_3_POLICY_EVIDENCE_BUNDLE",
    "ATTESTED_RUNTIME_IDENTITY_OBJECT",
    "SOURCE_EVIDENCE_ENVELOPE",
    "PROVIDER_SOURCE_AUTHENTICATION_REFERENCE_RECORD",
    "SECTION_7_4_CONTRACT_CANONICALIZATION_BUNDLE",
    "PROVIDER_SOURCE_REVALIDATION_BUNDLE",
    "VERIFIER_BINARIES_BUNDLE",
    "REPLAY_PROCEDURES_BUNDLE",
    "APPROVED_OPAQUE_CONTRACTS_AND_POLICIES_BUNDLE",
    "APPROVAL_SNAPSHOTS_AND_TRUST_ROOTS_BUNDLE",
    "EXPECTED_ACTUAL_CONTEXT_VERIFICATION_BUNDLE",
    "INHERITED_SECTION_7_1_7_2_CONTRACT_ARTIFACTS_BUNDLE",
    "OPERATIONAL_FAILURE_BODY_BUNDLE",
    "NUMERICAL_BODY_MODEL_PLAN_DEFINITION_BUNDLE",
]
EXPECTED_TERMINAL_SELECTORS = [
    "terminal_quote_binding_hash",
    "terminal_result_context_hash",
    "actual_request_receipt_context_projection_hash",
    "expected_to_actual_context_verification_hash",
    "terminal_receipt_body_hash",
    "terminal_result_binding_verification_hash",
]
EXPECTED_CONDITIONS = [f"R{i}" for i in range(1, 9)]
EXPECTED_LIVE_OUTCOMES = {
    "R1": "REJECT_FOR_PRIVACY_OR_BOUNDARY_LEAKAGE",
    "R2_INHERITED": "REJECT_C3_TDX_FOR_PROVIDER_CONFLICT",
    "R2_SECTION_7_4": "REJECT_SECTION_7_4_FOR_SOURCE_CONFLICT",
    "R3": "REJECT_FOR_MALFORMED_OR_AMBIGUOUS_ENCODING",
    "R4": "HOLD_FOR_PROVIDER_SOURCE_OR_TRUST_MATERIAL_UNAVAILABLE_OR_DRIFT",
    "R5": "REJECT_FOR_WRONG_CONTEXT_OR_TERMINAL_VARIANT",
    "R6": "REJECT_FOR_SIGNATURE_OR_INTEGRITY_MISMATCH",
    "R7": "HOLD_FOR_ATTESTATION_VERIFIER_UNCLOSED",
    "R8": "HOLD_FOR_INCOMPLETE_STALE_REVOKED_OR_UNCORRELATED_EVIDENCE",
    "E9": "SECTION_7_4_VERIFIED_INPUT_ONLY_AUTHORITY_EFFECT_NONE",
}
EXPECTED_PARENT_PATHS = {
    "SECTION_7_1": {
        "docs/contracts/canonical-inference-gcp-provider-vocabulary/README.md",
        "docs/contracts/canonical-inference-gcp-provider-vocabulary/claim-evidence.json",
        "docs/contracts/canonical-inference-gcp-provider-vocabulary/compute-field-projection.json",
        "docs/contracts/canonical-inference-gcp-provider-vocabulary/source-evidence.json",
    },
    "SECTION_7_2": {
        "docs/contracts/canonical-inference-gcp-runtime-object/README.md",
        "docs/contracts/canonical-inference-gcp-runtime-object/canonicalization-vectors.json",
        "docs/contracts/canonical-inference-gcp-runtime-object/control-plane-projection.json",
        "docs/contracts/canonical-inference-gcp-runtime-object/provider-revalidation.json",
        "docs/contracts/canonical-inference-gcp-runtime-object/runtime-object-contract.json",
    },
    "SECTION_7_3": {
        "docs/contracts/canonical-inference-gcp-security-authority/README.md",
        "docs/contracts/canonical-inference-gcp-security-authority/canonicalization-vectors.json",
        "docs/contracts/canonical-inference-gcp-security-authority/provider-revalidation.json",
        "docs/contracts/canonical-inference-gcp-security-authority/provider-source-evidence.json",
        "docs/contracts/canonical-inference-gcp-security-authority/role-capability-matrix.json",
        "docs/contracts/canonical-inference-gcp-security-authority/security-authority-contract.json",
    },
}


class ContractValidationError(ValueError):
    """Stable, non-reflective validation error."""


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _validate_string(value: str) -> None:
    if unicodedata.normalize("NFC", value) != value:
        raise ContractValidationError("non-NFC string")
    if any(unicodedata.category(char) in {"Cc", "Cs"} for char in value):
        raise ContractValidationError("control or surrogate string")


def validate_canonical_value(value: Any) -> None:
    if value is None or isinstance(value, float):
        raise ContractValidationError("null or float prohibited")
    if type(value) in (bool, int):
        if type(value) is int and not -(2**63) <= value <= 2**63 - 1:
            raise ContractValidationError("integer outside signed 64-bit domain")
        return
    if isinstance(value, str):
        _validate_string(value)
        return
    if isinstance(value, list):
        for item in value:
            validate_canonical_value(item)
        return
    if isinstance(value, dict):
        for key, item in value.items():
            if not isinstance(key, str):
                raise ContractValidationError("non-string object key")
            _validate_string(key)
            validate_canonical_value(item)
        return
    raise ContractValidationError("unsupported JSON type")


def canonical_json_bytes(value: Any) -> bytes:
    validate_canonical_value(value)
    return json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")


def strict_load_json_bytes(data: bytes) -> Any:
    def pairs(items: list[tuple[str, Any]]) -> dict[str, Any]:
        output: dict[str, Any] = {}
        for key, value in items:
            if key in output:
                raise ContractValidationError("duplicate JSON key")
            output[key] = value
        return output

    def parse_int(value: str) -> int:
        if value == "-0":
            raise ContractValidationError("negative zero")
        parsed = int(value)
        if not -(2**63) <= parsed <= 2**63 - 1:
            raise ContractValidationError("integer outside signed 64-bit domain")
        return parsed

    try:
        result = json.loads(
            data.decode("utf-8"),
            object_pairs_hook=pairs,
            parse_int=parse_int,
            parse_float=lambda _: (_ for _ in ()).throw(
                ContractValidationError("floating JSON number")
            ),
            parse_constant=lambda _: (_ for _ in ()).throw(
                ContractValidationError("non-finite JSON number")
            ),
        )
    except UnicodeDecodeError as exc:
        raise ContractValidationError("invalid UTF-8") from exc
    validate_canonical_value(result)
    return result


def load_json(path: Path) -> dict[str, Any]:
    value = strict_load_json_bytes(path.read_bytes())
    if not isinstance(value, dict):
        raise ContractValidationError("JSON root must be object")
    return value


def domain_hash(domain: str, body: Any, algorithm: str = "sha256") -> str:
    if not ASCII_DOMAIN.fullmatch(domain):
        raise ContractValidationError("invalid domain separator")
    preimage = domain.encode("ascii") + b"\x00" + canonical_json_bytes(body)
    if algorithm == "sha256":
        return hashlib.sha256(preimage).hexdigest()
    if algorithm == "sha512":
        return hashlib.sha512(preimage).hexdigest()
    raise ContractValidationError("unsupported hash algorithm")


def _ensure_exact_keys(value: dict[str, Any], expected: set[str], label: str) -> None:
    if set(value) != expected:
        raise ContractValidationError(f"{label} keys mismatch")


def _node_map(contract: dict[str, Any]) -> dict[str, dict[str, Any]]:
    entries = contract["hash_node_registry"]["entries"]
    return {entry["node_id"]: entry for entry in entries}


def _selector_map(contract: dict[str, Any]) -> dict[str, dict[str, Any]]:
    entries = contract["selector_registry"]["entries"]
    return {entry["node_id"]: entry for entry in entries}


def _extract_design_formulas(design_text: str) -> list[dict[str, Any]]:
    assignment = re.compile(
        r"(?m)^([a-z][a-z0-9_]*) = (SHA256|SHA512|EXACTLY_ONE)\("
    )
    matches = list(assignment.finditer(design_text))

    def expression(start: int) -> str:
        opening = design_text.find("(", start)
        depth = 0
        quoted = False
        escaped = False
        for index in range(opening, len(design_text)):
            char = design_text[index]
            if quoted:
                if escaped:
                    escaped = False
                elif char == "\\":
                    escaped = True
                elif char == '"':
                    quoted = False
                continue
            if char == '"':
                quoted = True
            elif char == "(":
                depth += 1
            elif char == ")":
                depth -= 1
                if depth == 0:
                    return " ".join(design_text[start : index + 1].split())
        raise ContractValidationError("unbalanced normative design formula")

    formulas: list[dict[str, Any]] = []
    for match in matches:
        node_id, base_algorithm = match.group(1), match.group(2)
        formula = expression(match.start(2))
        domain_match = re.match(
            r'(?:SHA256|SHA512)\("([A-Z0-9:_-]+)"', formula
        )
        algorithm = base_algorithm
        if base_algorithm == "EXACTLY_ONE":
            domain = "SELECTOR_ALIAS_NO_DOMAIN"
        elif domain_match:
            domain = domain_match.group(1)
        else:
            algorithm += "_RAW_CONTENT"
            domain = "RAW_CONTENT_NO_DOMAIN"
        formulas.append(
            {
                "node_id": node_id,
                "algorithm": algorithm,
                "domain_separator": domain,
                "formula": formula,
                "design_line": design_text.count("\n", 0, match.start()) + 1,
            }
        )
    ids = {entry["node_id"] for entry in formulas}
    if len(ids) != len(formulas):
        raise ContractValidationError("duplicate normative design formula")
    for entry in formulas:
        entry["direct_dependencies"] = sorted(
            node_id
            for node_id in ids
            if node_id != entry["node_id"]
            and re.search(rf"\b{re.escape(node_id)}\b", entry["formula"])
        )
        entry["formula_sha256"] = digest(entry["formula"].encode("utf-8"))
        if entry["algorithm"] == "EXACTLY_ONE":
            entry["allowed_variants"] = list(entry["direct_dependencies"])
    return formulas


def _validate_dag(nodes: dict[str, dict[str, Any]]) -> None:
    temporary: set[str] = set()
    complete: set[str] = set()

    def visit(node_id: str) -> None:
        if node_id in temporary:
            raise ContractValidationError("hash graph cycle")
        if node_id in complete:
            return
        temporary.add(node_id)
        for dep in nodes[node_id]["direct_dependencies"]:
            if dep in nodes:
                visit(dep)
        temporary.remove(node_id)
        complete.add(node_id)

    for node_id in nodes:
        visit(node_id)


def _expected_parent_owner_registries() -> dict[str, dict[str, Any]]:
    section71_source = json.loads(
        (
            ROOT
            / "docs/contracts/canonical-inference-gcp-provider-vocabulary/source-evidence.json"
        ).read_text(encoding="utf-8")
    )
    section71_claims = json.loads(
        (
            ROOT
            / "docs/contracts/canonical-inference-gcp-provider-vocabulary/claim-evidence.json"
        ).read_text(encoding="utf-8")
    )["claims"]
    section72 = json.loads(
        (
            ROOT
            / "docs/contracts/canonical-inference-gcp-runtime-object/provider-revalidation.json"
        ).read_text(encoding="utf-8")
    )
    section73 = json.loads(
        (
            ROOT
            / "docs/contracts/canonical-inference-gcp-security-authority/provider-source-evidence.json"
        ).read_text(encoding="utf-8")
    )
    source71 = sorted(
        [
            {
                "source_id": item["source_id"],
                "expected_source_sha256": item["sha256"],
            }
            for item in section71_source["external_snapshot_bundle"]["members"]
            if item.get("source_id")
        ],
        key=lambda item: item["source_id"],
    )
    claims71 = sorted(
        [
            {
                "claim_id": item["claim_id"],
                "source_ids": item["source_ids"],
                "statement_sha256": digest(item["frozen_mapping"].encode("utf-8")),
            }
            for item in section71_claims
        ],
        key=lambda item: item["claim_id"],
    )
    source72_map: dict[str, str] = {}
    for claim in section72["claims"]:
        for observation in claim["source_observations"]:
            source72_map[observation["source_id"]] = observation[
                "current_source_sha256"
            ]
    source72 = [
        {"source_id": key, "expected_source_sha256": value}
        for key, value in sorted(source72_map.items())
    ]
    claims72 = sorted(
        [
            {
                "claim_id": item["claim_id"],
                "source_ids": item["source_ids"],
                "statement_sha256": digest(item["frozen_mapping"].encode("utf-8")),
            }
            for item in section72["claims"]
        ],
        key=lambda item: item["claim_id"],
    )
    source73 = sorted(
        [
            {
                "source_id": item["source_id"],
                "expected_source_sha256": item["snapshot_sha256"],
            }
            for item in section73["sources"]
        ],
        key=lambda item: item["source_id"],
    )
    claims73 = sorted(
        [
            {
                "claim_id": item["claim_id"],
                "source_ids": [item["source_id"]],
                "statement_sha256": digest(item["statement"].encode("utf-8")),
            }
            for item in section73["claims"]
        ],
        key=lambda item: item["claim_id"],
    )
    definitions = {
        "SECTION_7_1": (
            source71,
            claims71,
            "external-recovery://fluencytracr/gcp-provider-vocabulary-source-snapshot-20260724T030000Z.zip",
            "ceed3461f1e95305f4182eda6ffc9a1093f524704afd7b0f8ee71dc223359f21",
        ),
        "SECTION_7_2": (
            source72,
            claims72,
            "external-recovery://fluencytracr/gcp-runtime-object-revalidation-source-snapshot-20260724T151043Z.zip",
            "99f2387fa1bed1b491dfd34a5b5c365f37822af4a26cb96a3d29fc649b0372b9",
        ),
        "SECTION_7_3": (
            source73,
            claims73,
            "external-recovery://fluencytracr/gcp-security-authority-source-snapshot-20260724T232044Z.zip",
            "6f87fa394a9ae88032dfa28ebfba03b2e92408f1bb703975a8c146f2453fdae3",
        ),
    }
    output: dict[str, dict[str, Any]] = {}
    for owner, (sources, claims, locator, bundle_hash) in definitions.items():
        body = {
            "source_entries": sources,
            "claim_entries": claims,
            "source_bundle_locator": locator,
            "source_bundle_sha256": bundle_hash,
            "source_count": len(sources),
            "claim_count": len(claims),
            "source_keyset_sha256": digest(
                canonical_json_bytes([item["source_id"] for item in sources])
            ),
            "claim_keyset_sha256": digest(
                canonical_json_bytes([item["claim_id"] for item in claims])
            ),
        }
        body["registry_sha256"] = digest(canonical_json_bytes(body))
        output[owner] = body
    return output


def _validate_parent_dependencies(contract: dict[str, Any]) -> None:
    manifest = contract["dependency_contract"]["inherited_manifest"]
    entries = manifest["dependency_artifacts"]
    if len(entries) != 15 or contract["dependency_contract"]["exact_dependency_count"] != 15:
        raise ContractValidationError("parent dependency count mismatch")
    observed: dict[str, set[str]] = {owner: set() for owner in EXPECTED_PARENT_PATHS}
    for entry in entries:
        _ensure_exact_keys(
            entry,
            {"owner_section", "repository_path", "raw_file_sha256"},
            "parent dependency",
        )
        owner = entry["owner_section"]
        if owner not in observed:
            raise ContractValidationError("unknown parent owner")
        path = entry["repository_path"]
        observed[owner].add(path)
        candidate = ROOT / path
        if not candidate.is_file() or digest(candidate.read_bytes()) != entry["raw_file_sha256"]:
            raise ContractValidationError("parent dependency bytes mismatch")
    if observed != EXPECTED_PARENT_PATHS:
        raise ContractValidationError("parent dependency path set mismatch")
    expected_registries = _expected_parent_owner_registries()
    if manifest["owner_registries"] != expected_registries:
        raise ContractValidationError("parent source or claim registry mismatch")
    challenge = manifest["revalidation_challenge"]
    if challenge != {
        "challenge_id": "SECTION_7_4_INITIAL_COMPILE_SOURCE_REPLAY_20260726T072745Z",
        "challenge_secret_sha256": digest(
            b"SECTION_7_4_INITIAL_COMPILE_SOURCE_REPLAY_20260726T072745Z"
        ),
        "issued_at": 1785050865,
        "expires_at": 1785051165,
        "retrieval_started_at": 1785050866,
        "retrieval_finished_at": 1785050985,
        "revalidation_finished_at": 1785050986,
        "consuming_action_started_at": 1785050987,
        "consuming_action_id": "SECTION_7_4_CONTRACT_COMPILATION",
        "retrieval_authentication": "HTTPS_SYSTEM_TRUST_AT_RETRIEVAL_PLUS_IMMUTABLE_GIT_COMMIT_PINS",
        "every_parent_and_section_7_4_entry_bound_to_challenge": True,
        "runtime_evidence": False,
    }:
        raise ContractValidationError("parent revalidation challenge mismatch")
    body = {
        "owner_registries": manifest["owner_registries"],
        "dependency_artifacts": entries,
        "revalidation_challenge": challenge,
    }
    if digest(canonical_json_bytes(body)) != manifest["manifest_sha256"]:
        raise ContractValidationError("parent dependency manifest hash mismatch")


def _expected_replay_member_schemas() -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    for ordinal, kind in enumerate(EXPECTED_REPLAY_KINDS):
        paths = [kind.lower() + "/payload.bin"]
        presence = "ALWAYS"
        if ordinal == 28:
            paths = [
                "section-7-3/" + Path(path).name
                for path in sorted(EXPECTED_PARENT_PATHS["SECTION_7_3"])
            ]
        if ordinal == 39:
            paths = [
                "inherited/" + path
                for owner in ("SECTION_7_1", "SECTION_7_2")
                for path in sorted(EXPECTED_PARENT_PATHS[owner])
            ]
        if ordinal == 40:
            presence = "OPERATIONAL_FAILURE_ONLY"
            paths = ["operational-failure/body.json"]
        if ordinal == 41:
            paths = [
                "numerical/numerical-body.json",
                "numerical/model-definition.json",
                "numerical/execution-plan.json",
            ]
        members = []
        for path in paths:
            media_type = (
                "application/json"
                if path.endswith(".json")
                else "text/markdown"
                if path.endswith(".md")
                else "application/octet-stream"
            )
            members.append({"member_path": path, "media_type": media_type})
        output.append(
            {
                "ordinal": ordinal,
                "kind_id": kind,
                "required_presence": presence,
                "members": members,
                "minimum_bundle_byte_count": 1,
                "maximum_bundle_byte_count": 67108864,
            }
        )
    return output


def validate_contract(contract: dict[str, Any]) -> None:
    _ensure_exact_keys(contract, EXPECTED_CONTRACT_ROOT_KEYS, "contract")
    if contract["schema_version"] != "GCP_ATTESTATION_RECEIPT_CONTRACT_V1":
        raise ContractValidationError("contract schema mismatch")
    if contract["implements_candidate_section"] != "7.4":
        raise ContractValidationError("section mismatch")

    design = ROOT / contract["normative_design_binding"]["design_path"]
    spec = ROOT / contract["normative_design_binding"]["spec_path"]
    if not design.is_file() or digest(design.read_bytes()) != contract[
        "normative_design_binding"
    ]["design_sha256"]:
        raise ContractValidationError("normative design binding mismatch")
    if not spec.is_file() or digest(spec.read_bytes()) != contract[
        "normative_design_binding"
    ]["spec_sha256"]:
        raise ContractValidationError("normative spec binding mismatch")

    expected_constants = {
        "challenge_lifetime_seconds": 300,
        "challenge_secret_bytes": 32,
        "clock_skew_seconds": 0,
        "kms_algorithm": "EC_SIGN_P256_SHA256",
        "kms_version_id": "1",
        "oidc_signature_algorithm": "RS256",
        "oidc_issuer": "https://confidentialcomputing.googleapis.com",
        "oidc_audience": "urn:fluencytracr:canonical-inference:gcp-attestation-verifier:v1",
        "retention_duration_seconds": 31536000,
        "tls_exporter_context": "EMPTY_BYTES",
        "tls_exporter_label": "EXPORTER-FluencyTracr-GCP-Attestation-V1",
        "tls_exporter_length_bytes": 32,
        "tls_version": "TLS1.3",
        "token_max_age_seconds": 300,
        "trust_snapshot_max_age_seconds": 300,
        "wire_nonce_ascii_bytes": 43,
    }
    if contract["compiled_constants"] != expected_constants:
        raise ContractValidationError("compiled constants mismatch")
    if set(contract["approval_registries"]) != EXPECTED_APPROVAL_REGISTRIES:
        raise ContractValidationError("approval registry keyset mismatch")
    if any(value != [] for value in contract["approval_registries"].values()):
        raise ContractValidationError("runtime approval registry is not empty")
    if any(contract["non_authorization"].values()):
        raise ContractValidationError("contract attempted authorization")
    if contract["privacy"] != {
        "restricted_evidence_only": True,
        "public_receipt_projection": False,
        "raw_identifiers_in_public_artifacts": False,
        "hashes_are_authenticity_or_anonymization": False,
        "canonical_model_plan_bytes_public_projection": False,
    }:
        raise ContractValidationError("privacy contract mismatch")

    _validate_parent_dependencies(contract)
    if digest(SOURCE_PATH.read_bytes()) != contract["dependency_contract"][
        "provider_source_evidence_sha256"
    ]:
        raise ContractValidationError("provider source artifact binding mismatch")

    registry = contract["hash_node_registry"]
    entries = registry["entries"]
    if registry["entry_count"] != len(entries):
        raise ContractValidationError("hash node count mismatch")
    nodes = _node_map(contract)
    if len(nodes) != len(entries):
        raise ContractValidationError("duplicate hash node")
    all_ids = set(nodes)
    formula_ids = all_ids | {
        entry["node_id"] for entry in contract["selector_registry"]["entries"]
    }
    domains: list[str] = []
    for entry in entries:
        required = {
            "node_id",
            "algorithm",
            "domain_separator",
            "formula",
            "design_line",
            "direct_dependencies",
            "formula_sha256",
        }
        _ensure_exact_keys(entry, required, "hash node")
        if digest(entry["formula"].encode("utf-8")) != entry["formula_sha256"]:
            raise ContractValidationError("formula commitment mismatch")
        expected_deps = sorted(
            node_id
            for node_id in formula_ids
            if node_id != entry["node_id"]
            and re.search(rf"\b{re.escape(node_id)}\b", entry["formula"])
        )
        if entry["direct_dependencies"] != expected_deps:
            raise ContractValidationError("hash dependency projection mismatch")
        algorithm = entry["algorithm"]
        domain = entry["domain_separator"]
        if algorithm in {"SHA256", "SHA512"}:
            if not isinstance(domain, str) or not ASCII_DOMAIN.fullmatch(domain):
                raise ContractValidationError("domain-separated node missing domain")
            domains.append(domain)
        elif algorithm in {"SHA256_RAW_CONTENT", "SHA512_RAW_CONTENT"}:
            if domain != "RAW_CONTENT_NO_DOMAIN":
                raise ContractValidationError("raw content digest domain marker mismatch")
        else:
            raise ContractValidationError("unknown node algorithm")
    if len(domains) != len(set(domains)):
        raise ContractValidationError("duplicate domain separator")
    _validate_dag(nodes)

    selector_registry = contract["selector_registry"]
    selectors = selector_registry["entries"]
    if selector_registry["entry_count"] != len(selectors):
        raise ContractValidationError("selector count mismatch")
    if selector_registry["registry_sha256"] != digest(
        canonical_json_bytes(selectors)
    ):
        raise ContractValidationError("selector registry hash mismatch")
    selector_map = _selector_map(contract)
    if len(selector_map) != len(selectors):
        raise ContractValidationError("duplicate selector")
    for entry in selectors:
        _ensure_exact_keys(
            entry,
            {
                "node_id",
                "algorithm",
                "domain_separator",
                "formula",
                "design_line",
                "direct_dependencies",
                "formula_sha256",
                "allowed_variants",
            },
            "selector",
        )
        if (
            entry["algorithm"] != "EXACTLY_ONE"
            or entry["domain_separator"] != "SELECTOR_ALIAS_NO_DOMAIN"
        ):
            raise ContractValidationError("selector encoding mismatch")
        if entry["allowed_variants"] != entry["direct_dependencies"]:
            raise ContractValidationError("selector variant mismatch")

    design_formulas = _extract_design_formulas(design.read_text(encoding="utf-8"))
    expected_hash_entries = [
        entry for entry in design_formulas if entry["algorithm"] != "EXACTLY_ONE"
    ]
    expected_selector_entries = [
        entry for entry in design_formulas if entry["algorithm"] == "EXACTLY_ONE"
    ]
    if entries != expected_hash_entries:
        raise ContractValidationError("machine hash registry differs from normative design")
    if selectors != expected_selector_entries:
        raise ContractValidationError("machine selector registry differs from normative design")

    combined_nodes = {
        entry["node_id"]: entry for entry in expected_hash_entries + expected_selector_entries
    }
    _validate_dag(combined_nodes)

    coherence = contract["terminal_coherence_contract"]
    if coherence["selector_ids"] != EXPECTED_TERMINAL_SELECTORS:
        raise ContractValidationError("terminal selector coherence set mismatch")
    if coherence["authoritative_derivation_node"] not in nodes:
        raise ContractValidationError("authoritative variant derivation missing")
    if coherence["presented_payload_binding_node"] not in nodes:
        raise ContractValidationError("presented payload binding missing")

    envelope = contract["object_envelope_contract"]
    if envelope["metadata_exclusion_set"] != EXPECTED_METADATA_EXCLUSIONS:
        raise ContractValidationError("metadata exclusion set mismatch")
    if envelope["domain_separator"] != "FLUENCYTRACR:GCP_SECTION_7_4_NONAUTHORIZING_OBJECT:V1":
        raise ContractValidationError("object envelope domain mismatch")
    expected_object_registry = [
        {"node_id": entry["node_id"], "formula_sha256": entry["formula_sha256"]}
        for entry in entries
    ]
    if envelope["object_kind_count"] != len(entries) or envelope[
        "object_kind_registry_sha256"
    ] != digest(canonical_json_bytes(expected_object_registry)):
        raise ContractValidationError("object kind registry mismatch")
    if envelope["authority_effect"] != "NONE" or not envelope[
        "all_nonexcluded_nodes_required"
    ]:
        raise ContractValidationError("object envelope authority mismatch")

    expected_compositions = []
    object_node_ids = {entry["node_id"] for entry in entries}
    for entry in entries:
        components = [
            dependency
            for dependency in entry["direct_dependencies"]
            if dependency in object_node_ids
        ]
        if len(components) >= 2:
            expected_compositions.append(
                {
                    "composition_id": entry["node_id"].upper() + "_COMPOSITION",
                    "node_id": entry["node_id"],
                    "ordered_component_node_ids": components,
                    "authority_effect": "NONE",
                }
            )
    composition = contract["composition_contract"]
    if composition["entries"] != expected_compositions:
        raise ContractValidationError("composition registry mismatch")
    if composition["domain_separator"] != "FLUENCYTRACR:GCP_SECTION_7_4_NONAUTHORIZING_COMPOSITION:V1":
        raise ContractValidationError("composition envelope domain mismatch")
    if composition["registry_sha256"] != digest(
        canonical_json_bytes(expected_compositions)
    ):
        raise ContractValidationError("composition registry hash mismatch")
    if composition["entry_count"] != len(expected_compositions):
        raise ContractValidationError("composition count mismatch")
    if composition["authority_effect"] != "NONE":
        raise ContractValidationError("composition attempted authority")

    replay = contract["replay_manifest_contract"]
    if replay["kind_count"] != 42:
        raise ContractValidationError("replay kind count mismatch")
    if replay["kinds"] != [
        {"ordinal": index, "kind_id": value}
        for index, value in enumerate(EXPECTED_REPLAY_KINDS)
    ]:
        raise ContractValidationError("replay kind registry mismatch")
    expected_member_schemas = _expected_replay_member_schemas()
    if replay["member_schema_registry"] != expected_member_schemas:
        raise ContractValidationError("replay member schema registry mismatch")
    if replay["member_schema_registry_sha256"] != digest(
        canonical_json_bytes(expected_member_schemas)
    ):
        raise ContractValidationError("replay member schema registry hash mismatch")
    if replay["current_action_id"] != "CURRENT_SECTION_7_4_REPLAY" or replay[
        "final_action_id"
    ] != "FINAL_CONSUMER_REPLAY":
        raise ContractValidationError("replay action identity mismatch")
    if replay["checkout_fallback"] != "PROHIBITED" or replay[
        "digest_only_fallback"
    ] != "PROHIBITED":
        raise ContractValidationError("replay fallback enabled")

    condition_entries = contract["source_trust_condition_registry"]
    expected_condition_entries = [
        {"condition_id":"APPLICABILITY_REVIEW","root_cause_key":"APPLICABILITY_REVIEW","current_state":"REVIEW_COMPLETE","classification":"CLEAR","state_mapping":{"REVIEW_COMPLETE":"CLEAR","REVIEW_INCOMPLETE":"SOURCE_OR_TRUST_UNAVAILABLE_R4"}},
        {"condition_id":"GCP_ATTESTATION_EVIDENCE_CAPABILITY","root_cause_key":"GCP_ATTESTATION_EVIDENCE_CAPABILITY","current_state":"SOURCE_CODE_INTERFACE_TEST_ONLY_RUNTIME_CAPABILITY_UNOBSERVED","classification":"APPROVAL_UNCLOSED_R7","state_mapping":{"APPROVED_OBSERVATION_STALE":"EVIDENCE_STALE_REVOKED_OR_UNCORRELATED_R8","APPLICABILITY_REVIEW_INCOMPLETE":"SOURCE_OR_TRUST_UNAVAILABLE_R4","DEFAULT_DISABLED":"APPROVAL_UNCLOSED_R7","OBSERVED_PRESENT_APPROVAL_MISSING":"APPROVAL_UNCLOSED_R7","OBSERVED_PRESENT_APPROVED_FRESH":"CLEAR","SOURCE_BYTES_UNAVAILABLE":"SOURCE_OR_TRUST_UNAVAILABLE_R4","SOURCE_CODE_INTERFACE_TEST_ONLY_RUNTIME_CAPABILITY_UNOBSERVED":"APPROVAL_UNCLOSED_R7"}},
        {"condition_id":"PROVIDER_SOURCE_BYTES","root_cause_key":"PROVIDER_SOURCE_BYTES","current_state":"EXACT_BYTES_AND_CLAIM_WINDOWS_REPLAYED","classification":"CLEAR","state_mapping":{"EXACT_BYTES_AND_CLAIM_WINDOWS_REPLAYED":"CLEAR","SOURCE_BYTES_UNAVAILABLE":"SOURCE_OR_TRUST_UNAVAILABLE_R4"}},
        {"condition_id":"REVIEWED_PROVIDER_CONFLICT","root_cause_key":"REVIEWED_PROVIDER_CONFLICT","current_state":"ABSENT","classification":"CLEAR","state_mapping":{"ABSENT":"CLEAR","INHERITED_CONTRADICTION":"REVIEWED_CONTRADICTION_R2","SECTION_7_4_CONTRADICTION":"REVIEWED_CONTRADICTION_R2"}},
        {"condition_id":"RUNTIME_APPROVAL_REGISTRIES","root_cause_key":"RUNTIME_APPROVAL_REGISTRIES","current_state":"ALL_EMPTY","classification":"APPROVAL_UNCLOSED_R7","state_mapping":{"ALL_EMPTY":"APPROVAL_UNCLOSED_R7","COMPLETE_APPROVED":"CLEAR"}},
        {"condition_id":"TRUST_COLLATERAL_CURRENT_STATE","root_cause_key":"TRUST_COLLATERAL_CURRENT_STATE","current_state":"NOT_RUNTIME_OBSERVED","classification":"EVIDENCE_STALE_REVOKED_OR_UNCORRELATED_R8","state_mapping":{"CURRENT_APPROVED":"CLEAR","NOT_RUNTIME_OBSERVED":"EVIDENCE_STALE_REVOKED_OR_UNCORRELATED_R8","REVOKED_OR_UNCORRELATED":"EVIDENCE_STALE_REVOKED_OR_UNCORRELATED_R8"}},
    ]
    if condition_entries != expected_condition_entries:
        raise ContractValidationError("condition/root-cause registry mismatch")
    if contract["decision_algorithms"]["live_precedence"] != [
        "R1", "R2_INHERITED", "R2_SECTION_7_4", "R3", "R4", "R5", "R6", "R7", "R8", "E9"
    ]:
        raise ContractValidationError("live precedence mismatch")
    if contract["decision_algorithms"]["caller_supplied_predicates"] != "REJECT":
        raise ContractValidationError("caller predicate injection enabled")

    # Ownership guard: Section 7.4 may accept opaque records but cannot define
    # the later sections' ledger/transport producer schemas.
    prohibited_nodes = {
        "section_7_6_terminal_proof_hash",
        "section_7_6_attempt_ledger_hash",
        "section_7_6_retry_token_hash",
        "section_7_5_transport_record_hash",
        "section_7_5_retention_record_hash",
    }
    if prohibited_nodes & all_ids:
        raise ContractValidationError("later-section schema smuggled into Section 7.4")
    if "section_7_6_terminal_proof_acceptance_hash" not in all_ids:
        raise ContractValidationError("opaque Section 7.6 acceptance interface missing")


def validate_source_evidence(source: dict[str, Any]) -> None:
    _ensure_exact_keys(
        source,
        {
            "schema_version",
            "contract_scope",
            "retrieved_at",
            "revalidated_at",
            "source_bundle",
            "inherited_registry_manifest",
            "sources",
            "source_registry_sha256",
            "claims",
            "claim_registry_sha256",
            "applicability_reviews",
            "applicability_registry_sha256",
            "recorded_source_state",
            "decision",
            "authority_effect",
            "authorization_effect",
        },
        "source evidence",
    )
    if source["schema_version"] != "GCP_ATTESTATION_RECEIPT_PROVIDER_SOURCE_EVIDENCE_V1":
        raise ContractValidationError("source evidence schema mismatch")
    if len(source["sources"]) != 29 or len(source["claims"]) != 42:
        raise ContractValidationError("source registry count mismatch")
    source_ids = [entry["source_id"] for entry in source["sources"]]
    claim_ids = [entry["claim_id"] for entry in source["claims"]]
    if len(source_ids) != len(set(source_ids)) or len(claim_ids) != len(set(claim_ids)):
        raise ContractValidationError("source or claim identity collision")
    if (
        source["source_registry_sha256"] != EXPECTED_SOURCE_REGISTRY_SHA256
        or digest(canonical_json_bytes(source["sources"]))
        != source["source_registry_sha256"]
    ):
        raise ContractValidationError("source registry hash mismatch")
    if (
        source["claim_registry_sha256"] != EXPECTED_CLAIM_REGISTRY_SHA256
        or digest(canonical_json_bytes(source["claims"]))
        != source["claim_registry_sha256"]
    ):
        raise ContractValidationError("claim registry hash mismatch")
    if (
        source["applicability_registry_sha256"]
        != EXPECTED_APPLICABILITY_REGISTRY_SHA256
        or digest(canonical_json_bytes(source["applicability_reviews"]))
        != source["applicability_registry_sha256"]
    ):
        raise ContractValidationError("applicability registry hash mismatch")
    inherited = source["inherited_registry_manifest"]
    if inherited["owner_registries"] != _expected_parent_owner_registries():
        raise ContractValidationError("inherited source/claim registry mismatch")
    inherited_body = {
        "owner_registries": inherited["owner_registries"],
        "dependency_artifacts": inherited["dependency_artifacts"],
        "revalidation_challenge": inherited["revalidation_challenge"],
    }
    if digest(canonical_json_bytes(inherited_body)) != inherited["manifest_sha256"]:
        raise ContractValidationError("inherited registry manifest hash mismatch")
    known_sources = set(source_ids)
    for claim in source["claims"]:
        if claim["source_id"] not in known_sources:
            raise ContractValidationError("claim references unknown source")
        if claim["observed_span_chars"] > claim["max_span_chars"]:
            raise ContractValidationError("claim span exceeds bound")
    bundle = source["source_bundle"]
    if bundle["repo_committed"] or bundle["runtime_admission"] != "PROHIBITED":
        raise ContractValidationError("source bundle entered runtime admission")
    if source["authority_effect"] != "NONE_DOCS_ONLY" or source[
        "authorization_effect"
    ] != "NONE_DOCS_ONLY":
        raise ContractValidationError("source evidence attempted authority")


def validate_revalidation(revalidation: dict[str, Any], source: dict[str, Any]) -> None:
    expected_keys = {
        "schema_version",
        "contract_scope",
        "provider_source_evidence_sha256",
        "source_bundle_sha256",
        "source_bundle_byte_count",
        "source_count",
        "claim_count",
        "source_registry_sha256",
        "claim_registry_sha256",
        "applicability_registry_sha256",
        "inherited_registry_manifest_sha256",
        "inherited_dependency_artifact_count",
        "inherited_source_entry_count",
        "inherited_claim_entry_count",
        "inherited_bundle_sha256_by_owner",
        "inherited_revalidation_result",
        "revalidation_challenge",
        "source_revalidation_entries",
        "claim_revalidation_entries",
        "producing_revalidation_verifier_identity_hash",
        "current_replay_verifier_identity_hash",
        "replay_procedure_hash",
        "compile_revalidation_result",
        "live_revalidation_state",
        "decision",
        "authority_effect",
        "authorization_effect",
        "provider_revalidation_hash",
    }
    _ensure_exact_keys(revalidation, expected_keys, "provider revalidation")
    if revalidation["provider_source_evidence_sha256"] != digest(SOURCE_PATH.read_bytes()):
        raise ContractValidationError("provider source artifact hash mismatch")
    expected = {
        "source_bundle_sha256": source["source_bundle"]["sha256"],
        "source_bundle_byte_count": source["source_bundle"]["byte_count"],
        "source_count": len(source["sources"]),
        "claim_count": len(source["claims"]),
        "source_registry_sha256": source["source_registry_sha256"],
        "claim_registry_sha256": source["claim_registry_sha256"],
        "applicability_registry_sha256": source["applicability_registry_sha256"],
        "inherited_registry_manifest_sha256": source["inherited_registry_manifest"][
            "manifest_sha256"
        ],
        "inherited_dependency_artifact_count": 15,
        "inherited_source_entry_count": 55,
        "inherited_claim_entry_count": 82,
        "inherited_bundle_sha256_by_owner": {
            owner: registry["source_bundle_sha256"]
            for owner, registry in source["inherited_registry_manifest"][
                "owner_registries"
            ].items()
        },
        "inherited_revalidation_result": "EXACT_PARENT_SOURCE_AND_CLAIM_SETS_REPLAYED",
    }
    for key, value in expected.items():
        if revalidation[key] != value:
            raise ContractValidationError("provider revalidation mapping mismatch")
    if revalidation["revalidation_challenge"] != source[
        "inherited_registry_manifest"
    ]["revalidation_challenge"]:
        raise ContractValidationError("provider revalidation challenge mismatch")
    challenge_hash = revalidation["revalidation_challenge"]["challenge_secret_sha256"]
    source_entries = revalidation["source_revalidation_entries"]
    claim_entries = revalidation["claim_revalidation_entries"]
    if len(source_entries) != 84 or len(claim_entries) != 124:
        raise ContractValidationError("provider per-entry revalidation count mismatch")
    for entry in source_entries:
        expected_keys = {
            "owner_section", "source_id", "source_sha256", "bundle_sha256",
            "challenge_secret_sha256", "observed_source_sha256",
            "authenticated_retrieval_evidence_hash", "result",
        }
        if not isinstance(entry, dict) or set(entry) != expected_keys:
            raise ContractValidationError("source revalidation entry keys mismatch")
        evidence_body = {
            "owner_section": entry["owner_section"],
            "source_id": entry["source_id"],
            "source_sha256": entry["source_sha256"],
            "bundle_sha256": entry["bundle_sha256"],
            "challenge_secret_sha256": challenge_hash,
        }
        expected_hash = digest(
            b"FLUENCYTRACR:GCP_SOURCE_RETRIEVAL_EVIDENCE:V1\x00"
            + canonical_json_bytes(evidence_body)
        )
        if (
            entry["challenge_secret_sha256"] != challenge_hash
            or entry["observed_source_sha256"] != entry["source_sha256"]
            or entry["authenticated_retrieval_evidence_hash"] != expected_hash
            or entry["result"] != "EXACT_BYTES_RECONFIRMED"
        ):
            raise ContractValidationError("source revalidation entry mismatch")
    for entry in claim_entries:
        expected_keys = {
            "owner_section", "claim_id", "statement_sha256", "source_ids",
            "challenge_secret_sha256", "claim_evidence_hash", "result",
        }
        if not isinstance(entry, dict) or set(entry) != expected_keys:
            raise ContractValidationError("claim revalidation entry keys mismatch")
        evidence_body = {
            "owner_section": entry["owner_section"],
            "claim_id": entry["claim_id"],
            "statement_sha256": entry["statement_sha256"],
            "source_ids": entry["source_ids"],
            "challenge_secret_sha256": challenge_hash,
        }
        expected_hash = digest(
            b"FLUENCYTRACR:GCP_CLAIM_REVALIDATION_EVIDENCE:V1\x00"
            + canonical_json_bytes(evidence_body)
        )
        if (
            entry["challenge_secret_sha256"] != challenge_hash
            or entry["claim_evidence_hash"] != expected_hash
            or entry["result"] != "EXACT_CLAIM_MAPPING_RECONFIRMED"
        ):
            raise ContractValidationError("claim revalidation entry mismatch")
    expected_source_entries: dict[tuple[str, str], dict[str, Any]] = {}
    for owner, registry in source["inherited_registry_manifest"][
        "owner_registries"
    ].items():
        for item in registry["source_entries"]:
            expected_source_entries[(owner, item["source_id"])] = {
                "source_sha256": item["expected_source_sha256"],
                "bundle_sha256": registry["source_bundle_sha256"],
            }
    for item in source["sources"]:
        expected_source_entries[("SECTION_7_4", item["source_id"])] = {
            "source_sha256": item["snapshot_sha256"],
            "bundle_sha256": source["source_bundle"]["sha256"],
        }
    observed_source_entries = {
        (item["owner_section"], item["source_id"]): {
            "source_sha256": item["source_sha256"],
            "bundle_sha256": item["bundle_sha256"],
        }
        for item in source_entries
    }
    if len(observed_source_entries) != len(source_entries) or observed_source_entries != expected_source_entries:
        raise ContractValidationError("source revalidation exact set mismatch")

    expected_claim_entries: dict[tuple[str, str], dict[str, Any]] = {}
    for owner, registry in source["inherited_registry_manifest"][
        "owner_registries"
    ].items():
        for item in registry["claim_entries"]:
            expected_claim_entries[(owner, item["claim_id"])] = {
                "statement_sha256": item["statement_sha256"],
                "source_ids": item["source_ids"],
            }
    for item in source["claims"]:
        expected_claim_entries[("SECTION_7_4", item["claim_id"])] = {
            "statement_sha256": digest(item["statement"].encode("utf-8")),
            "source_ids": [item["source_id"]],
        }
    observed_claim_entries = {
        (item["owner_section"], item["claim_id"]): {
            "statement_sha256": item["statement_sha256"],
            "source_ids": item["source_ids"],
        }
        for item in claim_entries
    }
    if len(observed_claim_entries) != len(claim_entries) or observed_claim_entries != expected_claim_entries:
        raise ContractValidationError("claim revalidation exact set mismatch")

    if revalidation["producing_revalidation_verifier_identity_hash"] != (
        "3299296931dd1d1388f41a569333ac8ad6fe96dd2b38b97e6448df3e1602ecbd"
    ):
        raise ContractValidationError("source producing verifier identity mismatch")
    if revalidation["current_replay_verifier_identity_hash"] != digest(
        (ROOT / "scripts/verify_gcp_attestation_receipt_revalidation.py").read_bytes()
    ):
        raise ContractValidationError("current source replay verifier identity mismatch")
    if revalidation["replay_procedure_hash"] != digest(
        b"GCP_ATTESTATION_RECEIPT_SOURCE_REPLAY_PROCEDURE_V1"
    ):
        raise ContractValidationError("source replay procedure mismatch")
    if revalidation["schema_version"] != "GCP_ATTESTATION_RECEIPT_PROVIDER_REVALIDATION_V1":
        raise ContractValidationError("provider revalidation schema mismatch")
    if revalidation["contract_scope"] != "SECTION_7_4_DOCS_ONLY":
        raise ContractValidationError("provider revalidation scope mismatch")
    if revalidation["compile_revalidation_result"] != "EXACT_SOURCE_BYTES_AND_CLAIM_WINDOWS_REPLAYED_REVIEWED_INTERPRETATION_PINNED_CAPABILITY_UNOBSERVED":
        raise ContractValidationError("provider compile revalidation result mismatch")
    if revalidation["decision"] != "GCP_ATTESTATION_RECEIPT_CONTRACT_CLOSED_EVIDENCE_ABSENT_RUNTIME_AUTHORITY_HELD":
        raise ContractValidationError("provider revalidation decision mismatch")
    if revalidation["live_revalidation_state"] != "NOT_CREATED_NO_RUNTIME_ACTION":
        raise ContractValidationError("checked-in artifact claims live revalidation")
    body = dict(revalidation)
    observed = body.pop("provider_revalidation_hash")
    expected_hash = domain_hash(
        "FLUENCYTRACR:GCP_ATTESTATION_RECEIPT_PROVIDER_REVALIDATION:V1", body
    )
    if observed != expected_hash:
        raise ContractValidationError("provider revalidation self hash mismatch")
    if revalidation["authority_effect"] != "NONE" or revalidation[
        "authorization_effect"
    ] != "NONE_DOCS_ONLY":
        raise ContractValidationError("provider revalidation attempted authority")


def validate_current_artifacts() -> dict[str, Any]:
    contract = load_json(CONTRACT_PATH)
    source = load_json(SOURCE_PATH)
    revalidation = load_json(REVALIDATION_PATH)
    validate_contract(contract)
    validate_source_evidence(source)
    validate_revalidation(revalidation, source)
    vectors = load_json(VECTORS_PATH)
    validate_vectors(vectors, contract)
    return {
        "contract": contract,
        "source": source,
        "revalidation": revalidation,
        "vectors": vectors,
    }


def challenge_wire_value(challenge: bytes) -> str:
    if len(challenge) != 32:
        raise ContractValidationError("challenge length mismatch")
    wire = base64.urlsafe_b64encode(challenge).rstrip(b"=")
    if len(wire) != 43:
        raise ContractValidationError("wire nonce length mismatch")
    return wire.decode("ascii")


def derive_wire_nonce(domain: str, preimage: bytes) -> str:
    if not isinstance(preimage, bytes):
        raise ContractValidationError("nonce preimage malformed")
    raw = hashlib.sha256(domain.encode("ascii") + b"\x00" + preimage).digest()
    wire = base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")
    if not BASE64URL43.fullmatch(wire):
        raise ContractValidationError("derived nonce wire encoding mismatch")
    return wire


def validate_nonce_lineage(
    challenge: bytes,
    eat_nonce: list[str],
    *,
    tls_exporter: bytes,
    challenge_context_hash: bytes,
) -> None:
    wire = challenge_wire_value(challenge)
    if len(tls_exporter) != 32 or len(challenge_context_hash) != 32:
        raise ContractValidationError("nonce lineage preimage length mismatch")
    expected = [
        wire,
        derive_wire_nonce("FLUENCYTRACR:GCP_CHANNEL_NONCE:V1", tls_exporter),
        derive_wire_nonce(
            "FLUENCYTRACR:GCP_CONTEXT_NONCE:V1", challenge_context_hash
        ),
    ]
    if (
        len(eat_nonce) != 3
        or any(not isinstance(item, str) for item in eat_nonce)
        or any(not BASE64URL43.fullmatch(item) for item in eat_nonce)
    ):
        raise ContractValidationError("eat_nonce shape or wire encoding mismatch")
    if len(set(eat_nonce)) != 3 or eat_nonce != expected:
        raise ContractValidationError("eat_nonce lineage mismatch")
    if any(not 10 <= len(item.encode("ascii")) <= 74 for item in eat_nonce):
        raise ContractValidationError("custom nonce range mismatch")
    if any(not 8 <= len(item.encode("ascii")) <= 88 for item in eat_nonce):
        raise ContractValidationError("token nonce range mismatch")


def _decode_base64url_unpadded(value: str) -> bytes:
    if not isinstance(value, str) or "=" in value or not re.fullmatch(
        r"[A-Za-z0-9_-]+", value
    ):
        raise ContractValidationError("base64url encoding malformed")
    padding = "=" * ((4 - len(value) % 4) % 4)
    try:
        decoded = base64.urlsafe_b64decode(value + padding)
    except (ValueError, binascii.Error) as exc:
        raise ContractValidationError("base64url encoding malformed") from exc
    if base64.urlsafe_b64encode(decoded).rstrip(b"=").decode("ascii") != value:
        raise ContractValidationError("base64url encoding noncanonical")
    return decoded


def synthetic_oidc_submods() -> dict[str, Any]:
    return {
        "confidential_space": {
            "support_attributes": ["LATEST"],
            "monitoring_enabled": {"memory": False},
        },
        "gce": {
            "instance_id": "synthetic-instance-1",
            "instance_name": "synthetic-canonical-runtime",
            "project_id": "synthetic-project",
            "project_number": "111111111111",
            "zone": "us-central1-a",
        },
        "container": {
            "args": [],
            "cmd_override": [],
            "env": {},
            "env_override": {},
            "image_digest": "sha256:" + "a" * 64,
            "image_id": "synthetic-image-id",
            "image_reference": "synthetic.invalid/canonical@sha256:" + "a" * 64,
            "image_signatures": [],
            "restart_policy": "Never",
        },
    }


def expected_synthetic_trust_snapshot_hash(
    *, kid: str, jwk_n: str, jwk_e: str
) -> str:
    return domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_OIDC_TRUST_SNAPSHOT:V1",
        {
            "issuer": FIXED_OIDC_ISSUER,
            "discovery_sha256": digest(b"synthetic-oidc-discovery-v1"),
            "kid": kid,
            "jwk_n": jwk_n,
            "jwk_e": jwk_e,
            "observed_at": 100,
        },
    )


def expected_synthetic_challenge_context_hash(
    *,
    challenge: bytes,
    tls_exporter: bytes,
    expected_context: dict[str, str],
    model_plan_projection: dict[str, Any],
    signer_key_projection: dict[str, Any],
) -> bytes:
    channel_binding = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_CHANNEL_BINDING:V1",
        {
            "tls_exporter_sha256": digest(tls_exporter),
            "expected_binder_measurement_hash": digest(
                b"synthetic-attestation-binder-v1"
            ),
        },
    )
    context_hash = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_CHALLENGE_CONTEXT:V1",
        {
            "challenge_secret_sha256": digest(challenge),
            "expected_context_hash": digest(canonical_json_bytes(expected_context)),
            "model_plan_projection_hash": digest(
                canonical_json_bytes(model_plan_projection)
            ),
            "signer_context_hash": signer_key_projection["signer_context_hash"],
            "channel_binding_commitment": channel_binding,
        },
    )
    return bytes.fromhex(context_hash)


def validate_oidc_token(
    record: dict[str, Any], *, outer_eat_nonce: list[str]
) -> None:
    expected_keys = {
        "compact_jws",
        "jwk_kid",
        "jwk_n",
        "jwk_e",
        "approved_jwk_sha256",
        "trust_snapshot_hash",
        "expected_eat_nonce",
        "verification_time",
    }
    if not isinstance(record, dict) or set(record) != expected_keys:
        raise ContractValidationError("OIDC evidence keys mismatch")
    compact = record["compact_jws"]
    if not isinstance(compact, str) or compact.count(".") != 2:
        raise ContractValidationError("OIDC compact JWS malformed")
    header_part, payload_part, signature_part = compact.split(".")
    header = strict_load_json_bytes(_decode_base64url_unpadded(header_part))
    payload = strict_load_json_bytes(_decode_base64url_unpadded(payload_part))
    signature = _decode_base64url_unpadded(signature_part)
    if not isinstance(header, dict) or set(header) != {"alg", "kid", "typ"}:
        raise ContractValidationError("OIDC header keys mismatch")
    if header != {"alg": "RS256", "kid": SYNTHETIC_OIDC_KID, "typ": "JWT"}:
        raise ContractValidationError("OIDC header policy mismatch")
    if (
        record["jwk_kid"] != SYNTHETIC_OIDC_KID
        or record["jwk_n"] != SYNTHETIC_OIDC_N
        or record["jwk_e"] != SYNTHETIC_OIDC_E
        or record["approved_jwk_sha256"] != SYNTHETIC_OIDC_JWK_SHA256
        or record["trust_snapshot_hash"]
        != expected_synthetic_trust_snapshot_hash(
            kid=record["jwk_kid"], jwk_n=record["jwk_n"], jwk_e=record["jwk_e"]
        )
    ):
        raise ContractValidationError("OIDC approved trust snapshot mismatch")
    if digest(
        canonical_json_bytes(
            {"kid": record["jwk_kid"], "n": record["jwk_n"], "e": record["jwk_e"]}
        )
    ) != record["approved_jwk_sha256"]:
        raise ContractValidationError("OIDC JWK commitment mismatch")
    payload_keys = {
        "iss",
        "aud",
        "iat",
        "nbf",
        "exp",
        "eat_nonce",
        "attester_tcb",
        "google_service_accounts",
        "sub",
        "submods",
        "tdx",
        "swname",
        "swversion",
        "secboot",
        "dbgstat",
        "hwmodel",
        "oemid",
    }
    if not isinstance(payload, dict) or set(payload) != payload_keys:
        raise ContractValidationError("OIDC payload keys mismatch")
    if payload["iss"] != FIXED_OIDC_ISSUER or payload["aud"] != FIXED_OIDC_AUDIENCE:
        raise ContractValidationError("OIDC issuer or audience mismatch")
    if record["expected_eat_nonce"] != outer_eat_nonce:
        raise ContractValidationError("OIDC outer nonce lineage mismatch")
    if payload["eat_nonce"] != record["expected_eat_nonce"]:
        raise ContractValidationError("OIDC nonce mismatch")
    if (
        not isinstance(payload["eat_nonce"], list)
        or len(payload["eat_nonce"]) != 3
        or any(
            not isinstance(value, str) or not BASE64URL43.fullmatch(value)
            for value in payload["eat_nonce"]
        )
    ):
        raise ContractValidationError("OIDC nonce shape mismatch")
    for field in ("iat", "nbf", "exp"):
        if type(payload[field]) is not int:
            raise ContractValidationError("OIDC timestamp type mismatch")
    verification_time = record["verification_time"]
    if type(verification_time) is not int:
        raise ContractValidationError("OIDC verification time malformed")
    if not payload["nbf"] <= payload["iat"] <= verification_time < payload["exp"]:
        raise ContractValidationError("OIDC timestamp ordering mismatch")
    if verification_time - payload["iat"] > 300:
        raise ContractValidationError("OIDC token age mismatch")
    if payload["secboot"] is not True or payload["dbgstat"] != "disabled-since-boot":
        raise ContractValidationError("OIDC security posture mismatch")
    if payload["hwmodel"] != "GCP_INTEL_TDX" or payload["oemid"] != 11129 or type(payload["oemid"]) is not int:
        raise ContractValidationError("OIDC hardware claim type or value mismatch")
    if payload["attester_tcb"] != ["INTEL"]:
        raise ContractValidationError("OIDC attester TCB mismatch")
    if (
        not isinstance(payload["google_service_accounts"], list)
        or any(not isinstance(item, str) for item in payload["google_service_accounts"])
        or payload["google_service_accounts"] != []
        or payload["sub"] != "synthetic-subject"
        or payload["submods"] != synthetic_oidc_submods()
        or not isinstance(payload["tdx"], list)
        or len(payload["tdx"]) != 1
        or payload["tdx"][0] != {
            "gcp_attester_tcb_status": "UpToDate",
            "gcp_attester_tcb_date": "2026-07-25T00:00:00Z",
        }
        or payload["swname"] != "CONFIDENTIAL_SPACE"
        or not isinstance(payload["swversion"], list)
        or len(payload["swversion"]) != 1
        or payload["swversion"] != ["202607##"]
    ):
        raise ContractValidationError("OIDC closed provider claim mismatch")
    try:
        modulus = int.from_bytes(_decode_base64url_unpadded(record["jwk_n"]), "big")
        exponent = int.from_bytes(_decode_base64url_unpadded(record["jwk_e"]), "big")
    except (TypeError, ValueError) as exc:
        raise ContractValidationError("OIDC JWK malformed") from exc
    if modulus.bit_length() < 2048 or exponent != 65537:
        raise ContractValidationError("OIDC JWK policy mismatch")
    size = (modulus.bit_length() + 7) // 8
    if len(signature) != size:
        raise ContractValidationError("OIDC signature length mismatch")
    signature_representative = int.from_bytes(signature, "big")
    if signature_representative >= modulus:
        raise ContractValidationError("OIDC RS256 signature representative out of range")
    encoded = pow(signature_representative, exponent, modulus).to_bytes(
        size, "big"
    )
    digest_info = bytes.fromhex("3031300d060960864801650304020105000420") + hashlib.sha256(
        (header_part + "." + payload_part).encode("ascii")
    ).digest()
    padding_length = size - len(digest_info) - 3
    expected_encoded = b"\x00\x01" + b"\xff" * padding_length + b"\x00" + digest_info
    if padding_length < 8 or encoded != expected_encoded:
        raise ContractValidationError("OIDC RS256 signature mismatch")


def launcher_tdx_report_data(quote_binding: bytes) -> bytes:
    if len(quote_binding) != 64:
        raise ContractValidationError("quote binding length mismatch")
    return hashlib.sha512(
        b"WORKLOAD_ATTESTATION" + hashlib.sha512(quote_binding).digest()
    ).digest()


def validate_timeline(times: dict[str, int]) -> None:
    keys = [
        "challenge_issued_at",
        "pre_token_iat",
        "pre_token_verified_at",
        "pre_quote_request_sent_at",
        "pre_quote_response_received_at",
        "pre_quote_verified_at",
        "execution_started_at",
        "result_or_failure_committed_at",
        "execution_ended_at",
        "terminal_observation_accepted_at",
        "terminal_quote_request_sent_at",
        "terminal_quote_response_received_at",
        "terminal_quote_verified_at",
        "sign_requested_at",
        "sign_sent_at",
        "sign_response_verified_at",
        "challenge_expires_at",
    ]
    if set(times) != set(keys) or any(type(times[key]) is not int for key in keys):
        raise ContractValidationError("timeline shape mismatch")
    ordered = [times[key] for key in keys if key != "execution_ended_at"]
    if ordered != sorted(ordered):
        raise ContractValidationError("timeline order mismatch")
    if times["execution_ended_at"] != times["result_or_failure_committed_at"]:
        raise ContractValidationError("execution end commitment mismatch")
    if times["challenge_expires_at"] - times["challenge_issued_at"] != 300:
        raise ContractValidationError("challenge lifetime mismatch")
    if times["sign_response_verified_at"] >= times["challenge_expires_at"]:
        raise ContractValidationError("signing after challenge expiry")


def validate_terminal_coherence(
    authoritative_variant: str,
    selectors: dict[str, str],
    presented_variant: str,
) -> None:
    allowed = {"COMPLETED_EXECUTION", "OPERATIONAL_FAILURE"}
    if authoritative_variant not in allowed:
        raise ContractValidationError("unknown terminal variant")
    if set(selectors) != set(EXPECTED_TERMINAL_SELECTORS):
        raise ContractValidationError("terminal selector set mismatch")
    if any(value != authoritative_variant for value in selectors.values()):
        raise ContractValidationError("terminal selector coherence mismatch")
    if presented_variant != authoritative_variant:
        raise ContractValidationError("presented payload variant mismatch")


def validate_expected_actual_context(expected: dict[str, str], actual: dict[str, str]) -> None:
    required = {
        "tenant",
        "numerical_body",
        "runtime_profile",
        "runtime_instance",
        "source_manifest",
        "image_manifest",
        "model",
        "execution_plan",
        "signer_generation",
        "signer_policy",
        "trust_policy",
        "result_contract",
    }
    if (
        not isinstance(expected, dict)
        or not isinstance(actual, dict)
        or set(expected) != required
        or set(actual) != required
    ):
        raise ContractValidationError("expected/actual context keyset mismatch")
    if any(
        not isinstance(value, str) or not HEX64.fullmatch(value)
        for value in list(expected.values()) + list(actual.values())
    ):
        raise ContractValidationError("expected/actual context type mismatch")
    if expected != actual:
        raise ContractValidationError("expected/actual context mismatch")


def validate_replay_manifest(
    entries: list[dict[str, Any]],
    terminal_variant: str,
    contract: dict[str, Any] | None = None,
) -> None:
    if not isinstance(entries, list) or len(entries) != 42:
        raise ContractValidationError("replay manifest cardinality mismatch")
    if contract is None:
        contract = load_json(CONTRACT_PATH)
    schemas = contract["replay_manifest_contract"]["member_schema_registry"]
    if len(schemas) != 42:
        raise ContractValidationError("replay member schema cardinality mismatch")
    if terminal_variant not in {"COMPLETED_EXECUTION", "OPERATIONAL_FAILURE"}:
        raise ContractValidationError("unknown replay terminal variant")
    for index, (entry, schema) in enumerate(zip(entries, schemas)):
        if not isinstance(entry, dict):
            raise ContractValidationError("replay entry type mismatch")
        if (
            type(entry.get("ordinal")) is not int
            or entry.get("ordinal") != index
            or entry.get("kind_id") != EXPECTED_REPLAY_KINDS[index]
        ):
            raise ContractValidationError("replay manifest kind mismatch")
        absent = index == 40 and terminal_variant == "COMPLETED_EXECUTION"
        if absent:
            if entry != {
                "ordinal": index,
                "kind_id": EXPECTED_REPLAY_KINDS[index],
                "presence": "PROHIBITED_ABSENT",
            }:
                raise ContractValidationError("failure bundle present for completed result")
            continue
        required_keys = {
            "ordinal",
            "kind_id",
            "presence",
            "bundle_sha256",
            "byte_length",
            "restricted_reference",
            "member_manifest",
        }
        if set(entry) != required_keys or entry["presence"] != "PRESENT":
            raise ContractValidationError("replay entry keys or presence mismatch")
        if not isinstance(entry["bundle_sha256"], str) or not HEX64.fullmatch(entry["bundle_sha256"]):
            raise ContractValidationError("replay bundle digest malformed")
        if (
            type(entry["byte_length"]) is not int
            or not schema["minimum_bundle_byte_count"]
            <= entry["byte_length"]
            <= schema["maximum_bundle_byte_count"]
        ):
            raise ContractValidationError("replay bundle byte length malformed")
        if (
            not isinstance(entry["restricted_reference"], str)
            or not entry["restricted_reference"].startswith("restricted://")
        ):
            raise ContractValidationError("replay restricted reference malformed")
        members = entry["member_manifest"]
        if not isinstance(members, list) or len(members) != len(schema["members"]):
            raise ContractValidationError("replay member cardinality mismatch")
        total = 0
        observed_paths: list[str] = []
        for member in members:
            if not isinstance(member, dict) or set(member) != {
                "member_path",
                "raw_content_sha256",
                "raw_content_hex",
                "byte_length",
                "media_type",
            }:
                raise ContractValidationError("replay member keys mismatch")
            schema_member = schema["members"][len(observed_paths)]
            try:
                if (
                    not isinstance(member["raw_content_hex"], str)
                    or member["raw_content_hex"] != member["raw_content_hex"].lower()
                ):
                    raise ContractValidationError("replay member bytes encoding malformed")
                raw_content = bytes.fromhex(member["raw_content_hex"])
            except (TypeError, ValueError) as exc:
                raise ContractValidationError("replay member bytes malformed") from exc
            if (
                not isinstance(member["raw_content_sha256"], str)
                or not HEX64.fullmatch(member["raw_content_sha256"])
                or digest(raw_content) != member["raw_content_sha256"]
                or type(member["byte_length"]) is not int
                or member["byte_length"] != len(raw_content)
                or member["byte_length"] <= 0
                or member["media_type"] != schema_member["media_type"]
            ):
                raise ContractValidationError("replay member type or bytes mismatch")
            observed_paths.append(member["member_path"])
            total += member["byte_length"]
        if observed_paths != [item["member_path"] for item in schema["members"]]:
            raise ContractValidationError("replay member path mismatch")
        if total != entry["byte_length"]:
            raise ContractValidationError("replay member byte total mismatch")
        expected_bundle_hash = domain_hash(
            "FLUENCYTRACR:GCP_SYNTHETIC_REPLAY_BUNDLE:V1",
            {"kind_id": entry["kind_id"], "member_manifest": members},
        )
        if entry["bundle_sha256"] != expected_bundle_hash:
            raise ContractValidationError("replay bundle commitment mismatch")

def validate_verifier_identity(
    expected: dict[str, str], manifest: dict[str, str], actual: dict[str, str]
) -> None:
    required = {"binary_hash", "policy_hash", "procedure_hash"}
    if (
        not isinstance(expected, dict)
        or not isinstance(manifest, dict)
        or not isinstance(actual, dict)
        or set(expected) != required
        or set(manifest) != required
        or set(actual) != required
    ):
        raise ContractValidationError("verifier identity keyset mismatch")
    if any(
        not isinstance(value, str) or not HEX64.fullmatch(value)
        for value in list(expected.values())
        + list(manifest.values())
        + list(actual.values())
    ):
        raise ContractValidationError("verifier identity type mismatch")
    if expected != manifest or expected != actual:
        raise ContractValidationError("verifier identity mismatch")


def _synthetic_verifier_identity(seed: str) -> dict[str, str]:
    return {
        "binary_hash": digest((seed + "-binary").encode("utf-8")),
        "policy_hash": digest((seed + "-policy").encode("utf-8")),
        "procedure_hash": digest((seed + "-procedure").encode("utf-8")),
    }


def expected_runtime_instance_projection(
    contract: dict[str, Any]
) -> dict[str, Any]:
    dependencies = contract["dependency_contract"]["inherited_manifest"][
        "dependency_artifacts"
    ]
    section72_contract_sha = next(
        item["raw_file_sha256"]
        for item in dependencies
        if item["repository_path"].endswith(
            "canonical-inference-gcp-runtime-object/runtime-object-contract.json"
        )
    )
    submods = synthetic_oidc_submods()
    body = {
        "schema_version": "SECTION_7_4_RUNTIME_INSTANCE_PROJECTION_V1",
        "parent_section_7_2_contract_sha256": section72_contract_sha,
        "submods_sha256": digest(canonical_json_bytes(submods)),
        "instance_id": submods["gce"]["instance_id"],
        "project_id": submods["gce"]["project_id"],
        "project_number": submods["gce"]["project_number"],
        "zone": submods["gce"]["zone"],
        "image_digest": submods["container"]["image_digest"],
        "swversion": "202607##",
    }
    return {
        **body,
        "runtime_instance_observation_hash": domain_hash(
            "FLUENCYTRACR:GCP_SECTION_7_4_RUNTIME_INSTANCE_PROJECTION:V1", body
        ),
    }


def expected_synthetic_context(
    model_plan_projection: dict[str, Any],
    runtime_profile_projection: dict[str, Any],
    signer_key_projection: dict[str, Any],
    runtime_instance_projection: dict[str, Any],
) -> dict[str, str]:
    keys = [
        "tenant", "numerical_body", "runtime_profile", "runtime_instance",
        "source_manifest",
        "image_manifest", "model", "execution_plan", "signer_generation",
        "signer_policy", "trust_policy", "result_contract",
    ]
    context = {key: digest(("a" + key).encode("utf-8")) for key in keys}
    context.update(
        {
            "numerical_body": model_plan_projection["numerical_body_hash"],
            "runtime_profile": runtime_profile_projection["profile_hash"],
            "runtime_instance": runtime_instance_projection[
                "runtime_instance_observation_hash"
            ],
            "model": model_plan_projection["model_hash"],
            "execution_plan": model_plan_projection["execution_plan_hash"],
            "signer_generation": signer_key_projection["signer_context_hash"],
            "signer_policy": signer_key_projection["signer_policy_hash"],
            "result_contract": SYNTHETIC_RESULT_CONTRACT_HASH,
        }
    )
    return context


def validate_runtime_profile_and_signer_projection(
    runtime_profile: dict[str, Any],
    runtime_instance: dict[str, Any],
    signer_context: dict[str, Any],
    expected_context: dict[str, str],
    model_plan_projection: dict[str, Any],
    contract: dict[str, Any],
) -> None:
    if runtime_instance != expected_runtime_instance_projection(contract):
        raise ContractValidationError("runtime instance projection mismatch")
    if not isinstance(runtime_profile, dict) or set(runtime_profile) != {
        "schema_version", "parent_section_7_2_contract_sha256",
        "model_plan_sha256", "profile_hash"
    }:
        raise ContractValidationError("runtime profile object keys mismatch")
    dependencies = contract["dependency_contract"]["inherited_manifest"][
        "dependency_artifacts"
    ]
    section72_contract_sha = next(
        item["raw_file_sha256"]
        for item in dependencies
        if item["repository_path"].endswith(
            "canonical-inference-gcp-runtime-object/runtime-object-contract.json"
        )
    )
    section73_contract_sha = next(
        item["raw_file_sha256"]
        for item in dependencies
        if item["repository_path"].endswith(
            "canonical-inference-gcp-security-authority/security-authority-contract.json"
        )
    )
    profile_body = {
        "schema_version": "SECTION_7_4_RUNTIME_PROFILE_PROJECTION_V1",
        "parent_section_7_2_contract_sha256": section72_contract_sha,
        "model_plan_sha256": model_plan_projection["model_plan_sha256"],
    }
    expected_profile_hash = domain_hash(
        "FLUENCYTRACR:GCP_SECTION_7_4_RUNTIME_PROFILE_PROJECTION:V1", profile_body
    )
    if runtime_profile != {**profile_body, "profile_hash": expected_profile_hash}:
        raise ContractValidationError("runtime profile object mismatch")
    if expected_context["runtime_profile"] != expected_profile_hash:
        raise ContractValidationError("runtime profile context mismatch")
    if model_plan_projection["runtime_profile_model_plan_sha256"] != runtime_profile[
        "model_plan_sha256"
    ]:
        raise ContractValidationError("runtime profile model-plan mapping mismatch")

    signer_keys = {
        "parent_section_7_3_contract_sha256",
        "key_purpose_id", "generation_alias", "version_id",
        "spki_der_hex", "spki_der_sha256",        "exact_crypto_key_version_name", "public_key_x_hex", "public_key_y_hex",
        "signer_context_hash", "signer_policy_hash",
    }
    if not isinstance(signer_context, dict) or set(signer_context) != signer_keys:
        raise ContractValidationError("signer key context keys mismatch")
    spki_der = bytes.fromhex(
        "3059301306072a8648ce3d020106082a8648ce3d03010703420004"
        + f"{P256_G[0]:064x}"
        + f"{P256_G[1]:064x}"
    )
    signer_body = {
        "parent_section_7_3_contract_sha256": section73_contract_sha,
        "key_purpose_id": "RUNTIME_RECEIPT_SIGNING_KEY",
        "generation_alias": "receipt-generation-1",
        "version_id": "1",
        "spki_der_hex": spki_der.hex(),
        "spki_der_sha256": digest(spki_der),
        "exact_crypto_key_version_name": SYNTHETIC_KMS_KEY_NAME,
        "public_key_x_hex": f"{P256_G[0]:064x}",
        "public_key_y_hex": f"{P256_G[1]:064x}",
    }
    signer_hash = domain_hash(
        "FLUENCYTRACR:GCP_SECTION_7_4_SIGNER_KEY_PROJECTION:V1", signer_body
    )
    signer_policy_hash = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_SIGNER_POLICY:V1",
        {"signer_context_hash": signer_hash, "algorithm": "EC_SIGN_P256_SHA256"},
    )
    if signer_context != {
        **signer_body,
        "signer_context_hash": signer_hash,
        "signer_policy_hash": signer_policy_hash,
    }:
        raise ContractValidationError("signer key context mismatch")
    if (
        expected_context["signer_generation"] != signer_hash
        or expected_context["signer_policy"] != signer_policy_hash
    ):
        raise ContractValidationError("signer expected context mismatch")
    if expected_context != expected_synthetic_context(
        model_plan_projection, runtime_profile, signer_context, runtime_instance
    ):
        raise ContractValidationError("synthetic expected context mismatch")


def validate_model_plan_projection(
    projection: dict[str, Any], expected_context: dict[str, str]
) -> None:
    expected_keys = {
        "numerical_body_hex",
        "model_definition_hex",
        "execution_plan_hex",
        "numerical_body_hash",
        "model_hash",
        "execution_plan_hash",
        "model_plan_sha256",
        "runtime_profile_model_plan_sha256",
    }
    if not isinstance(projection, dict) or set(projection) != expected_keys:
        raise ContractValidationError("model/plan projection keys mismatch")
    expected_raw_hex = {
        "numerical_body_hex": canonical_json_bytes(
            {"model_id": "synthetic-model", "plan_id": "synthetic-plan"}
        ).hex(),
        "model_definition_hex": canonical_json_bytes(
            {"family": "bayesian", "version": "synthetic-v1"}
        ).hex(),
        "execution_plan_hex": canonical_json_bytes(
            {"backend": "canonical", "steps": 1}
        ).hex(),
    }
    if any(projection[key] != value for key, value in expected_raw_hex.items()):
        raise ContractValidationError("synthetic model/plan definition mismatch")
    parsed: dict[str, Any] = {}
    for source_key, name in (
        ("numerical_body_hex", "numerical"),
        ("model_definition_hex", "model"),
        ("execution_plan_hex", "plan"),
    ):
        if (
            not isinstance(projection[source_key], str)
            or projection[source_key] != projection[source_key].lower()
            or len(projection[source_key]) % 2
        ):
            raise ContractValidationError("model/plan canonical bytes encoding malformed")
        try:
            raw = bytes.fromhex(projection[source_key])
        except (TypeError, ValueError) as exc:
            raise ContractValidationError("model/plan canonical bytes malformed") from exc
        if not raw:
            raise ContractValidationError("model/plan canonical bytes empty")
        value = strict_load_json_bytes(raw)
        if canonical_json_bytes(value) != raw:
            raise ContractValidationError("model/plan bytes not canonical")
        parsed[name] = value
    numerical_hash = digest(bytes.fromhex(projection["numerical_body_hex"]))
    model_hash = domain_hash(
        "FLUENCYTRACR:CANONICAL_INFERENCE_MODEL:V1", parsed["model"]
    )
    plan_hash = domain_hash(
        "FLUENCYTRACR:CANONICAL_INFERENCE_EXECUTION_PLAN:V1", parsed["plan"]
    )
    model_plan_hash = domain_hash(
        "FLUENCYTRACR:CANONICAL_INFERENCE_MODEL_PLAN:V1",
        {"model_hash": model_hash, "execution_plan_hash": plan_hash},
    )
    if projection != {
        **{key: projection[key] for key in ("numerical_body_hex", "model_definition_hex", "execution_plan_hex")},
        "numerical_body_hash": numerical_hash,
        "model_hash": model_hash,
        "execution_plan_hash": plan_hash,
        "model_plan_sha256": model_plan_hash,
        "runtime_profile_model_plan_sha256": model_plan_hash,
    }:
        raise ContractValidationError("model/plan projection mismatch")
    if (
        expected_context["numerical_body"] != numerical_hash
        or expected_context["model"] != model_hash
        or expected_context["execution_plan"] != plan_hash
    ):
        raise ContractValidationError("model/plan expected context mismatch")


def expected_synthetic_replay_member_bytes(
    candidate: dict[str, Any], contract: dict[str, Any]
) -> dict[tuple[int, str], bytes]:
    context_hash = digest(canonical_json_bytes(candidate["expected_context"]))
    defaults: dict[int, bytes] = {
        ordinal: canonical_json_bytes(
            {
                "kind_id": kind,
                "synthetic_fixture": "SECTION_7_4_SYNTHETIC_V1",
                "expected_context_hash": context_hash,
            }
        )
        for ordinal, kind in enumerate(EXPECTED_REPLAY_KINDS)
    }
    defaults.update(
        {
            0: canonical_json_bytes(
                {
                    "kid": candidate["oidc_evidence"]["jwk_kid"],
                    "n": candidate["oidc_evidence"]["jwk_n"],
                    "e": candidate["oidc_evidence"]["jwk_e"],
                    "trust_snapshot_hash": candidate["oidc_evidence"]["trust_snapshot_hash"],
                }
            ),
            1: candidate["oidc_evidence"]["compact_jws"].encode("ascii"),
            2: canonical_json_bytes(candidate["opaque_acceptances"]["trust_distribution"]),
            4: canonical_json_bytes(candidate["opaque_acceptances"]["pre_execution_attempt"]),
            5: canonical_json_bytes(candidate["expected_context"]),
            6: canonical_json_bytes(candidate["expected_context"]),
            7: canonical_json_bytes(candidate["timeline"]),
            8: canonical_json_bytes(candidate["opaque_acceptances"]["pre_quote_transport"]),
            9: bytes.fromhex(candidate["quote_evidence"]["pre"]["raw_quote_hex"]),
            10: canonical_json_bytes(
                {
                    "ccel_sha256": candidate["quote_evidence"]["pre"]["ccel_sha256"],
                    "cel_sha256": candidate["quote_evidence"]["pre"]["cel_sha256"],
                    "rtmr_map_sha256": candidate["quote_evidence"]["pre"]["rtmr_map_sha256"],
                }
            ),
            11: canonical_json_bytes(
                {
                    "pck_chain_sha256": candidate["quote_evidence"]["pre"]["pck_chain_sha256"],
                    "collateral_sha256": candidate["quote_evidence"]["pre"]["collateral_sha256"],
                    "crl_sha256": candidate["quote_evidence"]["pre"]["crl_sha256"],
                }
            ),
            12: canonical_json_bytes(candidate["terminal_payload"]),
            13: canonical_json_bytes(candidate["opaque_acceptances"]["terminal_quote_transport"]),
            14: bytes.fromhex(candidate["quote_evidence"]["terminal"]["raw_quote_hex"]),
            15: canonical_json_bytes(
                {
                    "ccel_sha256": candidate["quote_evidence"]["terminal"]["ccel_sha256"],
                    "cel_sha256": candidate["quote_evidence"]["terminal"]["cel_sha256"],
                    "rtmr_map_sha256": candidate["quote_evidence"]["terminal"]["rtmr_map_sha256"],
                }
            ),
            16: canonical_json_bytes(
                {
                    "pck_chain_sha256": candidate["quote_evidence"]["terminal"]["pck_chain_sha256"],
                    "collateral_sha256": candidate["quote_evidence"]["terminal"]["collateral_sha256"],
                    "crl_sha256": candidate["quote_evidence"]["terminal"]["crl_sha256"],
                }
            ),
            17: canonical_json_bytes(candidate["terminal_payload"]),
            18: canonical_json_bytes(candidate["terminal_payload"]),
            19: canonical_json_bytes(candidate["opaque_acceptances"]["kms_transport"]),
            20: canonical_json_bytes(candidate["kms_evidence"]),
            21: canonical_json_bytes(candidate["signer_key_projection"]),
            22: canonical_json_bytes(candidate["opaque_acceptances"]["audit_mapping"]),
            23: canonical_json_bytes(candidate["opaque_acceptances"]["channel_enforcement"]),
            24: canonical_json_bytes(candidate["runtime_profile_projection"]),
            25: canonical_json_bytes(candidate["runtime_instance_projection"]),
            26: canonical_json_bytes(candidate["model_plan_projection"]),
            27: canonical_json_bytes(
                {
                    "expected_verifier_binary_hash": candidate["quote_evidence"]["expected_verifier_binary_hash"],
                    "expected_verifier_policy_hash": candidate["quote_evidence"]["expected_verifier_policy_hash"],
                }
            ),
            29: canonical_json_bytes(
                {"runtime_profile_hash": candidate["runtime_profile_projection"]["profile_hash"]}
            ),
            31: canonical_json_bytes(
                {"provider_source_authentication_reference": digest(SOURCE_PATH.read_bytes())}
            ),
            32: canonical_json_bytes(
                {
                    "design_sha256": contract["normative_design_binding"]["design_sha256"],
                    "object_kind_registry_sha256": contract["object_envelope_contract"]["object_kind_registry_sha256"],
                }
            ),
            34: canonical_json_bytes(
                {
                    "quote_verifier": {
                        "binary_hash": digest(b"quote-verifier-binary"),
                        "policy_hash": digest(b"quote-verifier-policy"),
                    },
                    "current_replay_verifier": _synthetic_verifier_identity("current"),
                    "final_replay_verifier": _synthetic_verifier_identity("final"),
                }
            ),
            35: canonical_json_bytes(
                {
                    "current_action_id": contract["replay_manifest_contract"]["current_action_id"],
                    "final_action_id": contract["replay_manifest_contract"]["final_action_id"],
                    "current_procedure_hash": _synthetic_verifier_identity("current")["procedure_hash"],
                    "final_procedure_hash": _synthetic_verifier_identity("final")["procedure_hash"],
                }
            ),
            36: canonical_json_bytes(contract["approval_registries"]),
            37: canonical_json_bytes(
                {"trust_snapshot_hash": candidate["oidc_evidence"]["trust_snapshot_hash"]}
            ),
            38: canonical_json_bytes(
                {"expected": candidate["expected_context"], "actual": candidate["actual_context"]}
            ),
        }
    )
    if candidate["authoritative_terminal_variant"] == "OPERATIONAL_FAILURE":
        defaults[40] = canonical_json_bytes(candidate["terminal_payload"])
    schemas = contract["replay_manifest_contract"]["member_schema_registry"]
    output: dict[tuple[int, str], bytes] = {}
    for schema in schemas:
        ordinal = schema["ordinal"]
        if ordinal in {28, 30, 33, 39}:
            # Parent bytes are supplied by the replay candidate and checked
            # against the contract's immutable dependency-artifact hashes in
            # validate_replay_semantic_bindings; no checkout read occurs here.
            continue
        if ordinal == 41:
            values = [
                bytes.fromhex(candidate["model_plan_projection"]["numerical_body_hex"]),
                bytes.fromhex(candidate["model_plan_projection"]["model_definition_hex"]),
                bytes.fromhex(candidate["model_plan_projection"]["execution_plan_hex"]),
            ]
            for member, raw in zip(schema["members"], values):
                output[(ordinal, member["member_path"])] = raw
            continue
        if ordinal == 40 and candidate["authoritative_terminal_variant"] == "COMPLETED_EXECUTION":
            continue
        raw = defaults[ordinal]
        for member in schema["members"]:
            output[(ordinal, member["member_path"])] = raw
    return output


def validate_replay_semantic_bindings(
    candidate: dict[str, Any], contract: dict[str, Any]
) -> None:
    expected = expected_synthetic_replay_member_bytes(candidate, contract)
    observed: dict[tuple[int, str], bytes] = {}
    for entry in candidate["replay_manifest"]:
        if entry["presence"] == "PROHIBITED_ABSENT":
            continue
        for member in entry["member_manifest"]:
            observed[(entry["ordinal"], member["member_path"])] = bytes.fromhex(
                member["raw_content_hex"]
            )
    parent_expected_hashes: dict[tuple[int, str], str] = {}
    dependencies = contract["dependency_contract"]["inherited_manifest"][
        "dependency_artifacts"
    ]
    dependency_by_path = {
        item["repository_path"]: item["raw_file_sha256"] for item in dependencies
    }
    dependency_by_section73_name = {
        Path(item["repository_path"]).name: item["raw_file_sha256"]
        for item in dependencies
        if item["owner_section"] == "SECTION_7_3"
    }
    for entry in candidate["replay_manifest"]:
        if entry["ordinal"] == 28:
            for member in entry["member_manifest"]:
                name = Path(member["member_path"]).name
                if name not in dependency_by_section73_name:
                    raise ContractValidationError("Section 7.3 replay member unknown")
                parent_expected_hashes[(28, member["member_path"])] = (
                    dependency_by_section73_name[name]
                )
        if entry["ordinal"] == 39:
            for member in entry["member_manifest"]:
                repository_path = member["member_path"].removeprefix("inherited/")
                if repository_path not in dependency_by_path:
                    raise ContractValidationError("inherited replay member unknown")
                parent_expected_hashes[(39, member["member_path"])] = dependency_by_path[
                    repository_path
                ]
    embedded_keys = {
        key for key in observed if key[0] in {30, 33}
    }
    if len(embedded_keys) != 2:
        raise ContractValidationError("embedded source/revalidation replay members missing")
    source_key = next(key for key in embedded_keys if key[0] == 30)
    revalidation_key = next(key for key in embedded_keys if key[0] == 33)
    embedded_source_bytes = observed[source_key]
    embedded_revalidation_bytes = observed[revalidation_key]
    if (
        digest(embedded_source_bytes)
        != contract["dependency_contract"]["provider_source_evidence_sha256"]
        or digest(embedded_source_bytes)
        != EXPECTED_EMBEDDED_SOURCE_EVIDENCE_SHA256
        or digest(embedded_revalidation_bytes)
        != EXPECTED_EMBEDDED_REVALIDATION_SHA256
    ):
        raise ContractValidationError("embedded provider source/revalidation artifact mismatch")
    embedded_source = strict_load_json_bytes(embedded_source_bytes)
    embedded_revalidation = strict_load_json_bytes(embedded_revalidation_bytes)
    if (
        embedded_revalidation["provider_source_evidence_sha256"]
        != digest(embedded_source_bytes)
        or embedded_revalidation["source_count"] != len(embedded_source["sources"])
        or embedded_revalidation["claim_count"] != len(embedded_source["claims"])
        or embedded_source["inherited_registry_manifest"]["owner_registries"]
        != contract["dependency_contract"]["inherited_manifest"]["owner_registries"]
    ):
        raise ContractValidationError("embedded provider revalidation mapping mismatch")
    expected_source_keys = {
        (owner, item["source_id"])
        for owner, registry in embedded_source["inherited_registry_manifest"]["owner_registries"].items()
        for item in registry["source_entries"]
    } | {("SECTION_7_4", item["source_id"]) for item in embedded_source["sources"]}
    observed_source_keys = {
        (item["owner_section"], item["source_id"])
        for item in embedded_revalidation["source_revalidation_entries"]
    }
    expected_claim_keys = {
        (owner, item["claim_id"])
        for owner, registry in embedded_source["inherited_registry_manifest"]["owner_registries"].items()
        for item in registry["claim_entries"]
    } | {("SECTION_7_4", item["claim_id"]) for item in embedded_source["claims"]}
    observed_claim_keys = {
        (item["owner_section"], item["claim_id"])
        for item in embedded_revalidation["claim_revalidation_entries"]
    }
    if observed_source_keys != expected_source_keys or observed_claim_keys != expected_claim_keys:
        raise ContractValidationError("embedded source revalidation exact set mismatch")
    if set(observed) != set(expected) | set(parent_expected_hashes) | embedded_keys:
        raise ContractValidationError("replay semantic member set mismatch")
    for key, expected_hash in parent_expected_hashes.items():
        if digest(observed[key]) != expected_hash:
            raise ContractValidationError("parent replay bytes differ from immutable contract hash")
    for key, raw in expected.items():
        if observed[key] != raw:
            raise ContractValidationError("replay member bytes do not match candidate evidence")
        # JSON-labeled members must independently parse and be canonical.
        ordinal, path = key
        schema = contract["replay_manifest_contract"]["member_schema_registry"][ordinal]
        media_type = next(
            member["media_type"]
            for member in schema["members"]
            if member["member_path"] == path
        )
        if media_type == "application/json" and ordinal not in {28, 32, 33, 39}:
            value = strict_load_json_bytes(raw)
            if canonical_json_bytes(value) != raw:
                raise ContractValidationError("replay JSON member is not canonical")


def expected_synthetic_initial_retention_acceptance(
    challenge_hex: str, execution_manifest_hash: str
) -> dict[str, Any]:
    authentication_hash = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_INITIAL_RETENTION_AUTHENTICATION:V1",
        {
            "action_id": "INITIAL_SECTION_7_4_RETENTION",
            "challenge_hex": challenge_hex,
            "execution_manifest_hash": execution_manifest_hash,
        },
    )
    acceptance_hash = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_INITIAL_RETENTION_ACCEPTANCE:V1",
        {
            "authentication_hash": authentication_hash,
            "issued_at": 100,
            "verified_at": 280,
            "expires_at": 400,
            "retention_guaranteed_until": 31536280,
        },
    )
    return {
        "action_id": "INITIAL_SECTION_7_4_RETENTION",
        "challenge_hex": challenge_hex,
        "execution_manifest_hash": execution_manifest_hash,
        "issued_at": 100,
        "verified_at": 280,
        "expires_at": 400,
        "retention_guaranteed_until": 31536280,
        "authentication_hash": authentication_hash,
        "acceptance_hash": acceptance_hash,
    }


def validate_initial_retention_acceptance(
    record: dict[str, Any], challenge_hex: str, execution_manifest_hash: str
) -> None:
    if record != expected_synthetic_initial_retention_acceptance(
        challenge_hex, execution_manifest_hash
    ):
        raise ContractValidationError("initial retention acceptance mismatch")


def candidate_component_root_hash(candidate: dict[str, Any]) -> str:
    keys = [
        "eat_nonce", "timeline", "expected_context", "actual_context",
        "model_plan_projection", "runtime_profile_projection",
        "runtime_instance_projection", "signer_key_projection",
        "terminal_payload", "oidc_evidence", "quote_evidence", "kms_evidence",
        "opaque_acceptances", "replay_manifest", "initial_retention_acceptance",
        "current_replay_expected_verifier", "current_replay_manifest_verifier",
        "current_replay_actual_verifier", "final_replay_expected_verifier",
        "final_replay_manifest_verifier", "final_replay_actual_verifier",
    ]
    return domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_CANDIDATE_COMPONENT_ROOT:V1",
        {
            **{key: candidate[key] for key in keys},
            "synthetic_current_replay_challenge_hex": bytes(range(64, 96)).hex(),
            "synthetic_final_replay_challenge_hex": bytes(range(96, 128)).hex(),
        },
    )


def candidate_envelope_root_hash(candidate: dict[str, Any]) -> str:
    return domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_CANDIDATE_ENVELOPE_ROOT:V1",
        {
            "candidate_component_root_hash": candidate_component_root_hash(candidate),
            "cross_bindings": candidate["cross_bindings"],
            "replay_chain": candidate["replay_chain"],
        },
    )


def replay_manifest_hash(entries: list[dict[str, Any]]) -> str:
    return domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_EXECUTION_REPLAY_MANIFEST:V1", entries
    )


def expected_synthetic_object_store(
    contract: dict[str, Any], candidate: dict[str, Any]
) -> list[dict[str, Any]]:
    nodes = contract["hash_node_registry"]["entries"]
    node_map = {node["node_id"]: node for node in nodes}
    component_root = candidate_envelope_root_hash(candidate)
    expected_context_hash = digest(canonical_json_bytes(candidate["expected_context"]))
    terminal_payload_hash = digest(canonical_json_bytes(candidate["terminal_payload"]))
    pre_binding = hashlib.sha512(
        b"FLUENCYTRACR:GCP_SYNTHETIC_PRE_QUOTE_BINDING:V1\x00"
        + canonical_json_bytes(
            {
                "expected_context_hash": expected_context_hash,
                "eat_nonce_hash": digest(canonical_json_bytes(candidate["eat_nonce"])),
                "pre_execution_target_hash": expected_context_hash,
            }
        )
    ).hexdigest()
    terminal_binding = hashlib.sha512(
        b"FLUENCYTRACR:GCP_SYNTHETIC_TERMINAL_QUOTE_BINDING:V1\x00"
        + canonical_json_bytes(
            {
                "pre_quote_hash": candidate["quote_evidence"]["pre"]["raw_quote_sha256"],
                "terminal_payload_hash": terminal_payload_hash,
                "terminal_proof_target_hash": terminal_payload_hash,
                "timeline_hash": digest(canonical_json_bytes(candidate["timeline"])),
            }
        )
    ).hexdigest()
    component_commitments = {
        "oidc": digest(canonical_json_bytes(candidate["oidc_evidence"])),
        "pre_quote": digest(canonical_json_bytes(candidate["quote_evidence"]["pre"])),
        "terminal_quote": digest(canonical_json_bytes(candidate["quote_evidence"]["terminal"])),
        "terminal_payload": digest(canonical_json_bytes(candidate["terminal_payload"])),
        "kms": digest(canonical_json_bytes(candidate["kms_evidence"])),
        "opaque": digest(canonical_json_bytes(candidate["opaque_acceptances"])),
        "replay": digest(canonical_json_bytes(candidate["replay_chain"])),
        "replay_manifest": replay_manifest_hash(candidate["replay_manifest"]),
        "context": digest(canonical_json_bytes(candidate["expected_context"])),
        "runtime": digest(
            canonical_json_bytes(
                {
                    "profile": candidate["runtime_profile_projection"],
                    "instance": candidate["runtime_instance_projection"],
                }
            )
        ),
        "signer": digest(canonical_json_bytes(candidate["signer_key_projection"])),
        "model": digest(canonical_json_bytes(candidate["model_plan_projection"])),
    }

    exact_components = {
        "pre_quote_binding_hash": pre_binding,
        "terminal_quote_binding_hash": terminal_binding,
        "signature_statement_hash": candidate["kms_evidence"]["statement_digest_hex"],
        "terminal_receipt_body_hash": terminal_payload_hash,
        "expected_request_context_projection_hash": expected_context_hash,
        "actual_request_receipt_context_projection_hash": digest(
            canonical_json_bytes(candidate["actual_context"])
        ),
    }

    def component_for(node_id: str) -> str:
        if node_id in exact_components:
            return exact_components[node_id]
        lowered = node_id.lower()
        if "pre_" in lowered and "quote" in lowered:
            return component_commitments["pre_quote"]
        if "terminal" in lowered and "quote" in lowered:
            return component_commitments["terminal_quote"]
        if any(word in lowered for word in ("oidc", "token", "jwks")):
            return component_commitments["oidc"]
        if any(word in lowered for word in ("receipt", "result", "failure", "payload")):
            return component_commitments["terminal_payload"]
        if any(word in lowered for word in ("kms", "signature", "signer", "audit")):
            return component_commitments["kms"]
        if any(word in lowered for word in ("replay", "retention")):
            return component_commitments["replay"]
        if "manifest" in lowered:
            return component_commitments["replay_manifest"]
        if any(word in lowered for word in ("runtime", "profile", "measurement", "boot")):
            return component_commitments["runtime"]
        if any(word in lowered for word in ("model", "plan", "numerical")):
            return component_commitments["model"]
        if any(word in lowered for word in ("context", "expected", "challenge")):
            return component_commitments["context"]
        if any(word in lowered for word in ("transport", "enforcement", "proof", "acceptance")):
            return component_commitments["opaque"]
        return component_root

    computed: dict[str, dict[str, Any]] = {}

    def compute(node_id: str) -> dict[str, Any]:
        if node_id in computed:
            return computed[node_id]
        node = node_map[node_id]
        dependencies = [
            dependency
            for dependency in node["direct_dependencies"]
            if dependency in node_map
        ]
        dependency_hashes = [compute(dependency)["object_hash"] for dependency in dependencies]
        body = {
            "synthetic_fixture_id": "SECTION_7_4_SYNTHETIC_V1",
            "formula_sha256": node["formula_sha256"],
            "candidate_component_root_hash": component_root,
            "actual_component_hash": component_for(node_id),
            "ordered_dependency_object_hashes": dependency_hashes,
        }
        if node["algorithm"] in {"SHA256", "SHA512"}:
            object_hash = domain_hash(
                node["domain_separator"],
                body,
                "sha512" if node["algorithm"] == "SHA512" else "sha256",
            )
        else:
            object_hash = digest(canonical_json_bytes(body))
        computed[node_id] = {
            "node_id": node_id,
            "object_body": body,
            "object_hash": object_hash,
        }
        return computed[node_id]

    return [compute(node["node_id"]) for node in nodes]


def build_envelope_graph(
    contract: dict[str, Any], candidate: dict[str, Any]
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    object_store = expected_synthetic_object_store(contract, candidate)
    object_envelopes: list[dict[str, Any]] = []
    envelope_by_node: dict[str, str] = {}
    object_domain = contract["object_envelope_contract"]["domain_separator"]
    for stored in object_store:
        envelope_hash = domain_hash(
            object_domain,
            {
                "object_kind": stored["node_id"],
                "object_hash": stored["object_hash"],
                "authority_effect": "NONE",
            },
        )
        object_envelopes.append(
            {
                "node_id": stored["node_id"],
                "object_body": stored["object_body"],
                "object_hash": stored["object_hash"],
                "authority_effect": "NONE",
                "envelope_hash": envelope_hash,
            }
        )
        envelope_by_node[stored["node_id"]] = envelope_hash
    composition_envelopes: list[dict[str, Any]] = []
    composition_domain = contract["composition_contract"]["domain_separator"]
    registry_hash = contract["composition_contract"]["registry_sha256"]
    for definition in contract["composition_contract"]["entries"]:
        component_hashes = sorted(
            envelope_by_node[node_id]
            for node_id in definition["ordered_component_node_ids"]
        )
        envelope_hash = domain_hash(
            composition_domain,
            {
                "composition_kind": definition["composition_id"],
                "section_7_4_composition_registry_hash": registry_hash,
                "ordered_component_envelope_hashes": component_hashes,
                "authority_effect": "NONE",
            },
        )
        composition_envelopes.append(
            {
                "composition_id": definition["composition_id"],
                "node_id": definition["node_id"],
                "ordered_component_envelope_hashes": component_hashes,
                "authority_effect": "NONE",
                "envelope_hash": envelope_hash,
            }
        )
    return object_envelopes, composition_envelopes


def validate_envelope_graph(
    contract: dict[str, Any],
    candidate: dict[str, Any],
    object_envelopes: list[dict[str, Any]],
    composition_envelopes: list[dict[str, Any]],
    *,
    component_root_hash: str,
) -> None:
    nodes = contract["hash_node_registry"]["entries"]
    if not isinstance(object_envelopes, list) or len(object_envelopes) != len(nodes):
        raise ContractValidationError("object envelope cardinality mismatch")
    if not isinstance(component_root_hash, str) or not HEX64.fullmatch(component_root_hash):
        raise ContractValidationError("candidate component root malformed")
    expected_store = expected_synthetic_object_store(contract, candidate)
    object_domain = contract["object_envelope_contract"]["domain_separator"]
    envelope_by_node: dict[str, str] = {}
    for expected_object, envelope in zip(expected_store, object_envelopes):
        if not isinstance(envelope, dict) or set(envelope) != {
            "node_id", "object_body", "object_hash", "authority_effect", "envelope_hash"
        }:
            raise ContractValidationError("object envelope keys mismatch")
        if (
            envelope["node_id"] != expected_object["node_id"]
            or envelope["object_body"] != expected_object["object_body"]
            or envelope["object_hash"] != expected_object["object_hash"]
            or envelope["authority_effect"] != "NONE"
        ):
            raise ContractValidationError("object envelope actual-object mismatch")
        expected_envelope = domain_hash(
            object_domain,
            {
                "object_kind": expected_object["node_id"],
                "object_hash": expected_object["object_hash"],
                "authority_effect": "NONE",
            },
        )
        if envelope["envelope_hash"] != expected_envelope:
            raise ContractValidationError("object envelope hash mismatch")
        envelope_by_node[expected_object["node_id"]] = expected_envelope

    definitions = contract["composition_contract"]["entries"]
    if not isinstance(composition_envelopes, list) or len(composition_envelopes) != len(definitions):
        raise ContractValidationError("composition envelope cardinality mismatch")
    composition_domain = contract["composition_contract"]["domain_separator"]
    registry_hash = contract["composition_contract"]["registry_sha256"]
    for definition, envelope in zip(definitions, composition_envelopes):
        if not isinstance(envelope, dict) or set(envelope) != {
            "composition_id", "node_id", "ordered_component_envelope_hashes",
            "authority_effect", "envelope_hash"
        }:
            raise ContractValidationError("composition envelope keys mismatch")
        component_hashes = sorted(
            envelope_by_node[node_id]
            for node_id in definition["ordered_component_node_ids"]
        )
        if (
            envelope["composition_id"] != definition["composition_id"]
            or envelope["node_id"] != definition["node_id"]
            or envelope["ordered_component_envelope_hashes"] != component_hashes
            or envelope["authority_effect"] != "NONE"
        ):
            raise ContractValidationError("composition envelope projection mismatch")
        expected_hash = domain_hash(
            composition_domain,
            {
                "composition_kind": definition["composition_id"],
                "section_7_4_composition_registry_hash": registry_hash,
                "ordered_component_envelope_hashes": component_hashes,
                "authority_effect": "NONE",
            },
        )
        if envelope["envelope_hash"] != expected_hash:
            raise ContractValidationError("composition envelope hash mismatch")


def validate_synthetic_cross_bindings(candidate: dict[str, Any]) -> str:
    expected_context_hash = digest(canonical_json_bytes(candidate["expected_context"]))
    actual_context_hash = digest(canonical_json_bytes(candidate["actual_context"]))
    terminal_payload_hash = digest(canonical_json_bytes(candidate["terminal_payload"]))
    timeline_hash = digest(canonical_json_bytes(candidate["timeline"]))
    eat_nonce_hash = digest(canonical_json_bytes(candidate["eat_nonce"]))
    oidc_evidence_hash = digest(canonical_json_bytes(candidate["oidc_evidence"]))
    model_plan_projection_hash = digest(
        canonical_json_bytes(candidate["model_plan_projection"])
    )
    pre_target = expected_context_hash
    terminal_target = terminal_payload_hash
    pre_binding = hashlib.sha512(
        b"FLUENCYTRACR:GCP_SYNTHETIC_PRE_QUOTE_BINDING:V1\x00"
        + canonical_json_bytes(
            {
                "expected_context_hash": expected_context_hash,
                "eat_nonce_hash": eat_nonce_hash,
                "pre_execution_target_hash": pre_target,
            }
        )
    ).digest()
    terminal_binding = hashlib.sha512(
        b"FLUENCYTRACR:GCP_SYNTHETIC_TERMINAL_QUOTE_BINDING:V1\x00"
        + canonical_json_bytes(
            {
                "pre_quote_hash": candidate["quote_evidence"]["pre"]["raw_quote_sha256"],
                "terminal_payload_hash": terminal_payload_hash,
                "terminal_proof_target_hash": terminal_target,
                "timeline_hash": timeline_hash,
            }
        )
    ).digest()
    if candidate["quote_evidence"]["pre"]["expected_report_data_hex"] != launcher_tdx_report_data(pre_binding).hex():
        raise ContractValidationError("pre quote report-data cross-binding mismatch")
    if candidate["quote_evidence"]["terminal"]["expected_report_data_hex"] != launcher_tdx_report_data(terminal_binding).hex():
        raise ContractValidationError("terminal quote report-data cross-binding mismatch")
    if candidate["oidc_evidence"]["expected_eat_nonce"] != candidate["eat_nonce"]:
        raise ContractValidationError("OIDC candidate nonce cross-binding mismatch")
    oidc_payload = strict_load_json_bytes(
        _decode_base64url_unpadded(
            candidate["oidc_evidence"]["compact_jws"].split(".")[1]
        )
    )
    if (
        candidate["oidc_evidence"]["verification_time"]
        != candidate["timeline"]["pre_token_verified_at"]
        or oidc_payload["iat"] != candidate["timeline"]["pre_token_iat"]
    ):
        raise ContractValidationError("OIDC timeline cross-binding mismatch")
    if candidate["terminal_payload"].get("result_contract_hash") != candidate[
        "actual_context"
    ]["result_contract"]:
        raise ContractValidationError("terminal result-contract cross-binding mismatch")
    if candidate["authoritative_terminal_variant"] == "OPERATIONAL_FAILURE":
        failure_time = candidate["terminal_payload"]["failure_committed_at"]
        failure_phase = candidate["terminal_payload"]["failure_phase"]
        if (
            failure_time != candidate["timeline"]["result_or_failure_committed_at"]
            or failure_time != candidate["timeline"]["execution_ended_at"]
        ):
            raise ContractValidationError("failure commitment timeline cross-binding mismatch")
        if (
            failure_phase
            in {"PRE_EXECUTION_RUNTIME_VALIDATION", "MODEL_IMPORT"}
            and failure_time > candidate["timeline"]["execution_started_at"]
        ):
            raise ContractValidationError("failure phase contradicts execution chronology")
    signature_statement_hash = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_SIGNATURE_STATEMENT:V1",
        {
            "terminal_payload_hash": terminal_payload_hash,
            "terminal_quote_hash": candidate["quote_evidence"]["terminal"]["raw_quote_sha256"],
            "expected_context_hash": expected_context_hash,
            "signer_context_hash": candidate["signer_key_projection"]["signer_context_hash"],
            "timeline_hash": timeline_hash,
        },
    )
    if candidate["kms_evidence"]["statement_digest_hex"] != signature_statement_hash:
        raise ContractValidationError("KMS statement cross-binding mismatch")
    kms_evidence_hash = digest(canonical_json_bytes(candidate["kms_evidence"]))
    quote_evidence_hash = digest(canonical_json_bytes(candidate["quote_evidence"]))
    if (
        candidate["kms_evidence"]["requested_name"]
        != candidate["signer_key_projection"]["exact_crypto_key_version_name"]
        or candidate["kms_evidence"]["public_key_x_hex"]
        != candidate["signer_key_projection"]["public_key_x_hex"]
        or candidate["kms_evidence"]["public_key_y_hex"]
        != candidate["signer_key_projection"]["public_key_y_hex"]
    ):
        raise ContractValidationError("KMS signer key-context mapping mismatch")
    opaque_targets = {
        "trust_distribution": oidc_evidence_hash,
        "pre_quote_transport": candidate["quote_evidence"]["pre"]["raw_quote_sha256"],
        "terminal_quote_transport": candidate["quote_evidence"]["terminal"]["raw_quote_sha256"],
        "kms_transport": signature_statement_hash,
        "channel_enforcement": domain_hash(
            "FLUENCYTRACR:GCP_SYNTHETIC_CHANNEL_ENFORCEMENT_TARGET:V1",
            {"quote_evidence_hash": quote_evidence_hash, "kms_evidence_hash": kms_evidence_hash},
        ),
        "audit_mapping": kms_evidence_hash,
        "pre_execution_attempt": pre_target,
        "terminal_proof": terminal_target,
    }
    for kind, target in opaque_targets.items():
        record = candidate["opaque_acceptances"][kind]
        if record["target_hash"] != target:
            raise ContractValidationError("opaque target cross-binding mismatch")
        if (
            record["expires_at"] - record["issued_at"] != 300
            or not record["issued_at"] <= record["verified_at"] < record["expires_at"]
        ):
            raise ContractValidationError("opaque acceptance attempt freshness mismatch")
    phase_verified_at = {
        kind: candidate["opaque_acceptances"][kind]["verified_at"]
        for kind in opaque_targets
    }
    timeline = candidate["timeline"]
    if not (
        phase_verified_at["pre_execution_attempt"]
        <= timeline["challenge_issued_at"]
        <= phase_verified_at["trust_distribution"]
        <= timeline["pre_token_verified_at"]
        <= timeline["pre_quote_request_sent_at"]
        <= phase_verified_at["pre_quote_transport"]
        <= timeline["pre_quote_verified_at"]
        <= timeline["result_or_failure_committed_at"]
        <= timeline["terminal_quote_request_sent_at"]
        <= phase_verified_at["terminal_quote_transport"]
        <= timeline["terminal_quote_verified_at"]
        <= timeline["sign_requested_at"]
        <= phase_verified_at["kms_transport"]
        <= timeline["sign_response_verified_at"]
        <= phase_verified_at["channel_enforcement"]
        <= phase_verified_at["audit_mapping"]
        <= phase_verified_at["terminal_proof"]
        < timeline["challenge_expires_at"]
    ):
        raise ContractValidationError("opaque acceptance causal ordering mismatch")
    manifest_hash = replay_manifest_hash(candidate["replay_manifest"])
    current_expected = _synthetic_verifier_identity("current")
    final_expected = _synthetic_verifier_identity("final")
    for key in (
        "current_replay_expected_verifier", "current_replay_manifest_verifier",
        "current_replay_actual_verifier",
    ):
        if candidate[key] != current_expected:
            raise ContractValidationError("current replay verifier policy mismatch")
    for key in (
        "final_replay_expected_verifier", "final_replay_manifest_verifier",
        "final_replay_actual_verifier",
    ):
        if candidate[key] != final_expected:
            raise ContractValidationError("final replay verifier policy mismatch")
    component_root_hash = candidate_component_root_hash(candidate)
    base = {
        "candidate_component_root_hash": component_root_hash,
        "expected_context_hash": expected_context_hash,
        "actual_context_hash": actual_context_hash,
        "model_plan_projection_hash": model_plan_projection_hash,
        "eat_nonce_hash": eat_nonce_hash,
        "oidc_evidence_hash": oidc_evidence_hash,
        "terminal_payload_hash": terminal_payload_hash,
        "timeline_hash": timeline_hash,
        "quote_evidence_hash": quote_evidence_hash,
        "kms_evidence_hash": kms_evidence_hash,
        "pre_quote_binding_sha512": pre_binding.hex(),
        "terminal_quote_binding_sha512": terminal_binding.hex(),
        "signature_statement_hash": signature_statement_hash,
        "opaque_target_set_hash": digest(canonical_json_bytes(opaque_targets)),
        "opaque_acceptance_set_hash": digest(
            canonical_json_bytes(candidate["opaque_acceptances"])
        ),
        "runtime_profile_projection_hash": digest(
            canonical_json_bytes(candidate["runtime_profile_projection"])
        ),
        "runtime_instance_projection_hash": digest(
            canonical_json_bytes(candidate["runtime_instance_projection"])
        ),
        "signer_key_projection_hash": digest(
            canonical_json_bytes(candidate["signer_key_projection"])
        ),
        "replay_manifest_hash": manifest_hash,
        "initial_retention_acceptance_hash": candidate[
            "initial_retention_acceptance"
        ]["acceptance_hash"],
    }
    graph_hash = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_CANDIDATE_GRAPH:V1", base
    )
    expected = {**base, "candidate_graph_hash": graph_hash}
    if candidate["cross_bindings"] != expected:
        raise ContractValidationError("candidate cross-binding graph mismatch")
    return graph_hash


def source_replay_result_hash(result: dict[str, Any]) -> str:
    base_keys = {
        "source_count", "claim_count", "source_bundle_sha256",
        "inherited_source_count", "inherited_claim_count", "decision",
        "replay_mode", "authority_effect",
    }
    common = {
        "source_count": 29,
        "claim_count": 42,
        "source_bundle_sha256": "6f7ea9cb42afba261f859a257d879a088ed0ab473756a1994ba941be13b3204a",
        "inherited_source_count": 55,
        "inherited_claim_count": 82,
        "authority_effect": "NONE",
    }
    base_expected_by_mode = {
        "EXACT_ARCHIVE_REPLAY": {
            **common,
            "decision": "EXACT_SOURCE_BYTES_AND_CLAIM_WINDOWS_REPLAYED_REVIEWED_INTERPRETATION_PINNED_CAPABILITY_UNOBSERVED",
            "replay_mode": "EXACT_ARCHIVE_REPLAY",
        },
        "CONTRACT_ONLY_NO_ARCHIVE": {
            **common,
            "decision": "CONTRACT_ONLY_EXTERNAL_BUNDLES_UNAVAILABLE",
            "replay_mode": "CONTRACT_ONLY_NO_ARCHIVE",
        },
    }
    context_keys = {
        "action_id", "challenge_hex", "issued_at", "retrieval_started_at",
        "retrieval_finished_at", "observed_at", "expires_at", "invocation_id",
        "producer_identity_hash", "producer_mac",
    }
    if not isinstance(result, dict) or set(result) != base_keys | context_keys:
        raise ContractValidationError("source replay receipt keys mismatch")
    base_result = {key: result[key] for key in base_keys}
    if base_result != base_expected_by_mode.get(base_result.get("replay_mode")):
        raise ContractValidationError("source replay base result mismatch")
    fixed_challenges = {
        "CURRENT_SECTION_7_4_REPLAY": bytes(range(64, 96)).hex(),
        "FINAL_CONSUMER_REPLAY": bytes(range(96, 128)).hex(),
    }
    if result["action_id"] not in fixed_challenges or result["challenge_hex"] != fixed_challenges[result["action_id"]]:
        raise ContractValidationError("source replay action/challenge mismatch")
    if any(
        type(result[key]) is not int
        for key in (
            "issued_at", "retrieval_started_at", "retrieval_finished_at",
            "observed_at", "expires_at",
        )
    ) or not (
        result["issued_at"]
        <= result["retrieval_started_at"]
        <= result["retrieval_finished_at"]
        <= result["observed_at"]
        < result["expires_at"]
        and result["expires_at"] - result["issued_at"] == 300
    ):
        raise ContractValidationError("source replay receipt timeline mismatch")
    invocation_body = {
        "base_result": base_result,
        "action_id": result["action_id"],
        "challenge_hex": result["challenge_hex"],
        "issued_at": result["issued_at"],
        "retrieval_started_at": result["retrieval_started_at"],
        "retrieval_finished_at": result["retrieval_finished_at"],
        "observed_at": result["observed_at"],
        "expires_at": result["expires_at"],
    }
    if (
        not isinstance(result["producer_identity_hash"], str)
        or not HEX64.fullmatch(result["producer_identity_hash"])
        or not isinstance(result["producer_mac"], str)
        or not HEX64.fullmatch(result["producer_mac"])
    ):
        raise ContractValidationError("source replay producer evidence malformed")
    expected_invocation_id = domain_hash(
        "FLUENCYTRACR:GCP_SOURCE_REPLAY_INVOCATION:V1", invocation_body
    )
    if result["invocation_id"] != expected_invocation_id:
        raise ContractValidationError("source replay invocation commitment mismatch")
    return domain_hash("FLUENCYTRACR:GCP_SOURCE_REPLAY_RESULT:V1", result)


def synthetic_structural_source_replay_receipt(action_id: str) -> dict[str, Any]:
    context = {
        "CURRENT_SECTION_7_4_REPLAY": {
            "challenge_hex": bytes(range(64, 96)).hex(),
            "issued_at": 1000,
            "retrieval_started_at": 1001,
            "retrieval_finished_at": 1099,
            "observed_at": 1100,
            "expires_at": 1300,
        },
        "FINAL_CONSUMER_REPLAY": {
            "challenge_hex": bytes(range(96, 128)).hex(),
            "issued_at": 2000,
            "retrieval_started_at": 2001,
            "retrieval_finished_at": 2099,
            "observed_at": 2100,
            "expires_at": 2300,
        },
    }
    if action_id not in context:
        raise ContractValidationError("synthetic source replay action mismatch")
    base = {
        "source_count": 29,
        "claim_count": 42,
        "source_bundle_sha256": "6f7ea9cb42afba261f859a257d879a088ed0ab473756a1994ba941be13b3204a",
        "inherited_source_count": 55,
        "inherited_claim_count": 82,
        "decision": "EXACT_SOURCE_BYTES_AND_CLAIM_WINDOWS_REPLAYED_REVIEWED_INTERPRETATION_PINNED_CAPABILITY_UNOBSERVED",
        "replay_mode": "EXACT_ARCHIVE_REPLAY",
        "authority_effect": "NONE",
    }
    invocation_body = {"base_result": base, "action_id": action_id, **context[action_id]}
    return {
        **base,
        "action_id": action_id,
        **context[action_id],
        "invocation_id": domain_hash(
            "FLUENCYTRACR:GCP_SOURCE_REPLAY_INVOCATION:V1", invocation_body
        ),
        "producer_identity_hash": digest(b"synthetic-replay-producer"),
        "producer_mac": digest(
            ("synthetic-replay-producer-mac-" + action_id).encode("utf-8")
        ),
    }


SYNTHETIC_CURRENT_REPLAY_CHALLENGE_HEX = bytes(range(64, 96)).hex()
SYNTHETIC_FINAL_REPLAY_CHALLENGE_HEX = bytes(range(96, 128)).hex()


REPLAY_CHAIN_KEYS = {
    "current_action_id", "final_action_id", "current_challenge_hex",
    "final_challenge_hex", "current_issued_at", "current_verified_at",
    "current_expires_at", "current_retention_guaranteed_until",
    "final_issued_at", "final_verified_at", "final_expires_at",
    "final_retention_guaranteed_until", "execution_manifest_hash",
    "initial_retention_acceptance_hash", "current_source_revalidation_hash",
    "final_source_revalidation_hash", "current_retention_authentication_hash",
    "current_retention_acceptance_hash", "current_replay_result_hash",
    "verified_historical_manifest_hash", "final_consumer_manifest_hash",
    "final_retention_authentication_hash", "final_retention_acceptance_hash",
    "final_replay_result_hash",
}


def validate_structural_replay_chain_shape(chain: dict[str, Any]) -> None:
    if not isinstance(chain, dict) or set(chain) != REPLAY_CHAIN_KEYS:
        raise ContractValidationError("replay chain keys mismatch")
    if (
        chain["current_action_id"] != "CURRENT_SECTION_7_4_REPLAY"
        or chain["final_action_id"] != "FINAL_CONSUMER_REPLAY"
        or chain["current_challenge_hex"]
        != SYNTHETIC_CURRENT_REPLAY_CHALLENGE_HEX
        or chain["final_challenge_hex"] != SYNTHETIC_FINAL_REPLAY_CHALLENGE_HEX
    ):
        raise ContractValidationError("replay chain action/challenge mismatch")
    time_keys = (
        "current_issued_at", "current_verified_at", "current_expires_at",
        "current_retention_guaranteed_until", "final_issued_at",
        "final_verified_at", "final_expires_at",
        "final_retention_guaranteed_until",
    )
    if any(type(chain[key]) is not int for key in time_keys):
        raise ContractValidationError("replay chain timestamp type mismatch")
    if not (
        chain["current_issued_at"]
        <= chain["current_verified_at"]
        < chain["current_expires_at"]
        and chain["current_verified_at"]
        < chain["final_issued_at"]
        <= chain["final_verified_at"]
        < chain["final_expires_at"]
        and chain["current_expires_at"] - chain["current_issued_at"] == 300
        and chain["final_expires_at"] - chain["final_issued_at"] == 300
        and chain["current_retention_guaranteed_until"]
        == chain["current_verified_at"] + 31536000
        and chain["final_retention_guaranteed_until"]
        == chain["final_verified_at"] + 31536000
    ):
        raise ContractValidationError("replay chain ordering or retention mismatch")
    hash_keys = REPLAY_CHAIN_KEYS - set(time_keys) - {
        "current_action_id", "final_action_id", "current_challenge_hex",
        "final_challenge_hex",
    }
    if any(
        not isinstance(chain[key], str) or not HEX64.fullmatch(chain[key])
        for key in hash_keys
    ):
        raise ContractValidationError("replay chain hash encoding mismatch")


def validate_structural_replay_chain_commitments(
    chain: dict[str, Any],
    *,
    execution_manifest_hash: str,
    candidate_graph_hash: str,
    initial_retention_acceptance_hash: str,
    provider_revalidation_artifact_sha256: str,
) -> None:
    validate_structural_replay_chain_shape(chain)
    if (
        chain["execution_manifest_hash"] != execution_manifest_hash
        or chain["initial_retention_acceptance_hash"]
        != initial_retention_acceptance_hash
    ):
        raise ContractValidationError("structural replay root commitment mismatch")
    current_structural_receipt = synthetic_structural_source_replay_receipt(
        "CURRENT_SECTION_7_4_REPLAY"
    )
    final_structural_receipt = synthetic_structural_source_replay_receipt(
        "FINAL_CONSUMER_REPLAY"
    )
    if (
        chain["current_issued_at"] != current_structural_receipt["issued_at"]
        or chain["current_verified_at"]
        != current_structural_receipt["observed_at"]
        or chain["current_expires_at"] != current_structural_receipt["expires_at"]
        or chain["current_retention_guaranteed_until"]
        != current_structural_receipt["observed_at"] + 31536000
        or chain["final_issued_at"] != final_structural_receipt["issued_at"]
        or chain["final_verified_at"] != final_structural_receipt["observed_at"]
        or chain["final_expires_at"] != final_structural_receipt["expires_at"]
        or chain["final_retention_guaranteed_until"]
        != final_structural_receipt["observed_at"] + 31536000
    ):
        raise ContractValidationError("structural replay receipt timeline mismatch")
    expected_current_source_root = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_CURRENT_SOURCE_REVALIDATION:V1",
        {
            "action_id": chain["current_action_id"],
            "challenge_hex": chain["current_challenge_hex"],
            "provider_revalidation_artifact_sha256": provider_revalidation_artifact_sha256,
            "source_replay_result_hash": source_replay_result_hash(
                current_structural_receipt
            ),
        },
    )
    expected_final_source_root = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_FINAL_SOURCE_REVALIDATION:V1",
        {
            "action_id": chain["final_action_id"],
            "challenge_hex": chain["final_challenge_hex"],
            "provider_revalidation_artifact_sha256": provider_revalidation_artifact_sha256,
            "source_replay_result_hash": source_replay_result_hash(
                final_structural_receipt
            ),
        },
    )
    if (
        chain["current_source_revalidation_hash"] != expected_current_source_root
        or chain["final_source_revalidation_hash"] != expected_final_source_root
    ):
        raise ContractValidationError("structural source revalidation root mismatch")
    current_authentication = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_CURRENT_RETENTION_AUTHENTICATION:V1",
        {
            "action_id": chain["current_action_id"],
            "challenge_hex": chain["current_challenge_hex"],
            "execution_manifest_hash": execution_manifest_hash,
            "initial_retention_acceptance_hash": initial_retention_acceptance_hash,
            "current_source_revalidation_hash": chain[
                "current_source_revalidation_hash"
            ],
            "verifier_identity": _synthetic_verifier_identity("current"),
        },
    )
    current_acceptance = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_CURRENT_RETENTION_ACCEPTANCE:V1",
        {
            "authentication_hash": current_authentication,
            "issued_at": chain["current_issued_at"],
            "verified_at": chain["current_verified_at"],
            "expires_at": chain["current_expires_at"],
            "retention_guaranteed_until": chain[
                "current_retention_guaranteed_until"
            ],
        },
    )
    current_result = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_CURRENT_REPLAY_RESULT:V1",
        {
            "retention_acceptance_hash": current_acceptance,
            "execution_manifest_hash": execution_manifest_hash,
            "candidate_graph_hash": candidate_graph_hash,
        },
    )
    historical = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_VERIFIED_HISTORICAL_MANIFEST:V1",
        {
            "current_replay_result_hash": current_result,
            "execution_manifest_hash": execution_manifest_hash,
            "candidate_graph_hash": candidate_graph_hash,
        },
    )
    final_manifest = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_FINAL_CONSUMER_MANIFEST:V1",
        {
            "verified_historical_manifest_hash": historical,
            "final_source_revalidation_hash": chain[
                "final_source_revalidation_hash"
            ],
            "current_verifier_identity": _synthetic_verifier_identity("current"),
            "final_verifier_identity": _synthetic_verifier_identity("final"),
        },
    )
    final_authentication = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_FINAL_RETENTION_AUTHENTICATION:V1",
        {
            "action_id": chain["final_action_id"],
            "challenge_hex": chain["final_challenge_hex"],
            "final_consumer_manifest_hash": final_manifest,
            "verifier_identity": _synthetic_verifier_identity("final"),
        },
    )
    final_acceptance = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_FINAL_RETENTION_ACCEPTANCE:V1",
        {
            "authentication_hash": final_authentication,
            "issued_at": chain["final_issued_at"],
            "verified_at": chain["final_verified_at"],
            "expires_at": chain["final_expires_at"],
            "retention_guaranteed_until": chain[
                "final_retention_guaranteed_until"
            ],
        },
    )
    final_result = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_FINAL_REPLAY_RESULT:V1",
        {
            "retention_acceptance_hash": final_acceptance,
            "final_consumer_manifest_hash": final_manifest,
            "candidate_graph_hash": candidate_graph_hash,
        },
    )
    expected = {
        "current_retention_authentication_hash": current_authentication,
        "current_retention_acceptance_hash": current_acceptance,
        "current_replay_result_hash": current_result,
        "verified_historical_manifest_hash": historical,
        "final_consumer_manifest_hash": final_manifest,
        "final_retention_authentication_hash": final_authentication,
        "final_retention_acceptance_hash": final_acceptance,
        "final_replay_result_hash": final_result,
    }
    if any(chain[key] != value for key, value in expected.items()):
        raise ContractValidationError("structural replay commitment mismatch")


def rebind_replay_chain_source_results(
    chain: dict[str, Any],
    *,
    execution_manifest_hash: str,
    candidate_graph_hash: str,
    initial_retention_acceptance_hash: str,
    provider_revalidation_artifact_sha256: str,
    current_source_replay_receipt: dict[str, Any],
    final_source_replay_receipt: dict[str, Any],
) -> dict[str, Any]:
    validate_structural_replay_chain_shape(chain)
    if (
        current_source_replay_receipt.get("replay_mode") != "EXACT_ARCHIVE_REPLAY"
        or final_source_replay_receipt.get("replay_mode") != "EXACT_ARCHIVE_REPLAY"
    ):
        raise ContractValidationError(
            "contract-only receipt cannot enter archive replay chain"
        )
    current_source_replay_result_hash = source_replay_result_hash(
        current_source_replay_receipt
    )
    final_source_replay_result_hash = source_replay_result_hash(
        final_source_replay_receipt
    )
    if (
        current_source_replay_receipt["action_id"]
        != "CURRENT_SECTION_7_4_REPLAY"
        or current_source_replay_receipt["challenge_hex"]
        != SYNTHETIC_CURRENT_REPLAY_CHALLENGE_HEX
        or final_source_replay_receipt["action_id"] != "FINAL_CONSUMER_REPLAY"
        or final_source_replay_receipt["challenge_hex"]
        != SYNTHETIC_FINAL_REPLAY_CHALLENGE_HEX
    ):
        raise ContractValidationError("source replay receipt role mismatch")
    rebound = dict(chain)
    rebound.update(
        {
            "current_issued_at": current_source_replay_receipt["issued_at"],
            "current_verified_at": current_source_replay_receipt["observed_at"],
            "current_expires_at": current_source_replay_receipt["expires_at"],
            "current_retention_guaranteed_until": current_source_replay_receipt[
                "observed_at"
            ]
            + 31536000,
            "final_issued_at": final_source_replay_receipt["issued_at"],
            "final_verified_at": final_source_replay_receipt["observed_at"],
            "final_expires_at": final_source_replay_receipt["expires_at"],
            "final_retention_guaranteed_until": final_source_replay_receipt[
                "observed_at"
            ]
            + 31536000,
        }
    )
    current_source_revalidation_hash = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_CURRENT_SOURCE_REVALIDATION:V1",
        {
            "action_id": rebound["current_action_id"],
            "challenge_hex": rebound["current_challenge_hex"],
            "provider_revalidation_artifact_sha256": provider_revalidation_artifact_sha256,
            "source_replay_result_hash": current_source_replay_result_hash,
        },
    )
    final_source_revalidation_hash = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_FINAL_SOURCE_REVALIDATION:V1",
        {
            "action_id": rebound["final_action_id"],
            "challenge_hex": rebound["final_challenge_hex"],
            "provider_revalidation_artifact_sha256": provider_revalidation_artifact_sha256,
            "source_replay_result_hash": final_source_replay_result_hash,
        },
    )
    current_authentication = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_CURRENT_RETENTION_AUTHENTICATION:V1",
        {
            "action_id": rebound["current_action_id"],
            "challenge_hex": rebound["current_challenge_hex"],
            "execution_manifest_hash": execution_manifest_hash,
            "initial_retention_acceptance_hash": initial_retention_acceptance_hash,
            "current_source_revalidation_hash": current_source_revalidation_hash,
            "verifier_identity": _synthetic_verifier_identity("current"),
        },
    )
    current_acceptance = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_CURRENT_RETENTION_ACCEPTANCE:V1",
        {
            "authentication_hash": current_authentication,
            "issued_at": rebound["current_issued_at"],
            "verified_at": rebound["current_verified_at"],
            "expires_at": rebound["current_expires_at"],
            "retention_guaranteed_until": rebound[
                "current_retention_guaranteed_until"
            ],
        },
    )
    current_result = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_CURRENT_REPLAY_RESULT:V1",
        {
            "retention_acceptance_hash": current_acceptance,
            "execution_manifest_hash": execution_manifest_hash,
            "candidate_graph_hash": candidate_graph_hash,
        },
    )
    historical = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_VERIFIED_HISTORICAL_MANIFEST:V1",
        {
            "current_replay_result_hash": current_result,
            "execution_manifest_hash": execution_manifest_hash,
            "candidate_graph_hash": candidate_graph_hash,
        },
    )
    final_manifest = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_FINAL_CONSUMER_MANIFEST:V1",
        {
            "verified_historical_manifest_hash": historical,
            "final_source_revalidation_hash": final_source_revalidation_hash,
            "current_verifier_identity": _synthetic_verifier_identity("current"),
            "final_verifier_identity": _synthetic_verifier_identity("final"),
        },
    )
    final_authentication = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_FINAL_RETENTION_AUTHENTICATION:V1",
        {
            "action_id": rebound["final_action_id"],
            "challenge_hex": rebound["final_challenge_hex"],
            "final_consumer_manifest_hash": final_manifest,
            "verifier_identity": _synthetic_verifier_identity("final"),
        },
    )
    final_acceptance = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_FINAL_RETENTION_ACCEPTANCE:V1",
        {
            "authentication_hash": final_authentication,
            "issued_at": rebound["final_issued_at"],
            "verified_at": rebound["final_verified_at"],
            "expires_at": rebound["final_expires_at"],
            "retention_guaranteed_until": rebound[
                "final_retention_guaranteed_until"
            ],
        },
    )
    final_result = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_FINAL_REPLAY_RESULT:V1",
        {
            "retention_acceptance_hash": final_acceptance,
            "final_consumer_manifest_hash": final_manifest,
            "candidate_graph_hash": candidate_graph_hash,
        },
    )
    rebound.update(
        {
            "initial_retention_acceptance_hash": initial_retention_acceptance_hash,
            "current_source_revalidation_hash": current_source_revalidation_hash,
            "final_source_revalidation_hash": final_source_revalidation_hash,
            "current_retention_authentication_hash": current_authentication,
            "current_retention_acceptance_hash": current_acceptance,
            "current_replay_result_hash": current_result,
            "verified_historical_manifest_hash": historical,
            "final_consumer_manifest_hash": final_manifest,
            "final_retention_authentication_hash": final_authentication,
            "final_retention_acceptance_hash": final_acceptance,
            "final_replay_result_hash": final_result,
        }
    )
    return rebound


def validate_replay_chain(
    chain: dict[str, Any],
    *,
    execution_manifest_hash: str,
    candidate_graph_hash: str,
    initial_retention_acceptance_hash: str,
    provider_revalidation_artifact_sha256: str,
    current_source_replay_receipt: dict[str, Any],
    final_source_replay_receipt: dict[str, Any],
) -> None:
    validate_structural_replay_chain_shape(chain)
    if (
        current_source_replay_receipt.get("replay_mode") != "EXACT_ARCHIVE_REPLAY"
        or final_source_replay_receipt.get("replay_mode") != "EXACT_ARCHIVE_REPLAY"
    ):
        raise ContractValidationError(
            "contract-only receipt cannot enter archive replay chain"
        )
    current_source_replay_result_hash = source_replay_result_hash(
        current_source_replay_receipt
    )
    final_source_replay_result_hash = source_replay_result_hash(
        final_source_replay_receipt
    )
    expected_keys = {
        "current_action_id", "final_action_id", "current_challenge_hex",
        "final_challenge_hex", "current_issued_at", "current_verified_at",
        "current_expires_at", "current_retention_guaranteed_until",
        "final_issued_at", "final_verified_at", "final_expires_at",
        "final_retention_guaranteed_until", "execution_manifest_hash",
        "initial_retention_acceptance_hash",
        "current_source_revalidation_hash", "final_source_revalidation_hash",
        "current_retention_authentication_hash", "current_retention_acceptance_hash",
        "current_replay_result_hash", "verified_historical_manifest_hash",
        "final_consumer_manifest_hash", "final_retention_authentication_hash",
        "final_retention_acceptance_hash", "final_replay_result_hash",
    }
    if not isinstance(chain, dict) or set(chain) != expected_keys:
        raise ContractValidationError("replay chain keys mismatch")
    if (
        chain["current_challenge_hex"] != SYNTHETIC_CURRENT_REPLAY_CHALLENGE_HEX
        or chain["final_challenge_hex"] != SYNTHETIC_FINAL_REPLAY_CHALLENGE_HEX
        or current_source_replay_receipt["action_id"]
        != chain["current_action_id"]
        or current_source_replay_receipt["challenge_hex"]
        != chain["current_challenge_hex"]
        or final_source_replay_receipt["action_id"] != chain["final_action_id"]
        or final_source_replay_receipt["challenge_hex"]
        != chain["final_challenge_hex"]
        or current_source_replay_receipt["issued_at"]
        != chain["current_issued_at"]
        or current_source_replay_receipt["observed_at"]
        != chain["current_verified_at"]
        or current_source_replay_receipt["expires_at"]
        != chain["current_expires_at"]
        or final_source_replay_receipt["issued_at"] != chain["final_issued_at"]
        or final_source_replay_receipt["observed_at"]
        != chain["final_verified_at"]
        or final_source_replay_receipt["expires_at"] != chain["final_expires_at"]
    ):
        raise ContractValidationError("synthetic replay challenge/receipt mismatch")
    if chain["current_action_id"] != "CURRENT_SECTION_7_4_REPLAY" or chain[
        "final_action_id"
    ] != "FINAL_CONSUMER_REPLAY":
        raise ContractValidationError("replay action identity mismatch")
    for prefix in ("current", "final"):
        issued = chain[f"{prefix}_issued_at"]
        verified = chain[f"{prefix}_verified_at"]
        expires = chain[f"{prefix}_expires_at"]
        if (
            type(issued) is not int
            or type(verified) is not int
            or type(expires) is not int
            or expires - issued != 300
            or not issued <= verified < expires
        ):
            raise ContractValidationError("replay freshness interval mismatch")
    if (
        chain["current_verified_at"] >= chain["final_issued_at"]
        or chain["current_retention_guaranteed_until"]
        != chain["current_verified_at"] + 31536000
        or chain["final_retention_guaranteed_until"]
        != chain["final_verified_at"] + 31536000
    ):
        raise ContractValidationError("replay ordering or retention guarantee mismatch")
    if chain["execution_manifest_hash"] != execution_manifest_hash:
        raise ContractValidationError("replay execution manifest mismatch")
    if chain["initial_retention_acceptance_hash"] != initial_retention_acceptance_hash:
        raise ContractValidationError("initial retention chain binding mismatch")
    if current_source_replay_result_hash == final_source_replay_result_hash:
        raise ContractValidationError("current/final source replay receipts are not distinct")
    current_source_revalidation_hash = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_CURRENT_SOURCE_REVALIDATION:V1",
        {
            "action_id": chain["current_action_id"],
            "challenge_hex": chain["current_challenge_hex"],
            "provider_revalidation_artifact_sha256": provider_revalidation_artifact_sha256,
            "source_replay_result_hash": current_source_replay_result_hash,
        },
    )
    final_source_revalidation_hash = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_FINAL_SOURCE_REVALIDATION:V1",
        {
            "action_id": chain["final_action_id"],
            "challenge_hex": chain["final_challenge_hex"],
            "provider_revalidation_artifact_sha256": provider_revalidation_artifact_sha256,
            "source_replay_result_hash": final_source_replay_result_hash,
        },
    )
    current_authentication = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_CURRENT_RETENTION_AUTHENTICATION:V1",
        {
            "action_id": chain["current_action_id"],
            "challenge_hex": chain["current_challenge_hex"],
            "execution_manifest_hash": execution_manifest_hash,
            "initial_retention_acceptance_hash": initial_retention_acceptance_hash,
            "current_source_revalidation_hash": current_source_revalidation_hash,
            "verifier_identity": _synthetic_verifier_identity("current"),
        },
    )
    current_acceptance = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_CURRENT_RETENTION_ACCEPTANCE:V1",
        {
            "authentication_hash": current_authentication,
            "issued_at": chain["current_issued_at"],
            "verified_at": chain["current_verified_at"],
            "expires_at": chain["current_expires_at"],
            "retention_guaranteed_until": chain[
                "current_retention_guaranteed_until"
            ],
        },
    )
    current_result = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_CURRENT_REPLAY_RESULT:V1",
        {
            "retention_acceptance_hash": current_acceptance,
            "execution_manifest_hash": execution_manifest_hash,
            "candidate_graph_hash": candidate_graph_hash,
        },
    )
    historical = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_VERIFIED_HISTORICAL_MANIFEST:V1",
        {
            "current_replay_result_hash": current_result,
            "execution_manifest_hash": execution_manifest_hash,
            "candidate_graph_hash": candidate_graph_hash,
        },
    )
    final_manifest = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_FINAL_CONSUMER_MANIFEST:V1",
        {
            "verified_historical_manifest_hash": historical,
            "final_source_revalidation_hash": final_source_revalidation_hash,
            "current_verifier_identity": _synthetic_verifier_identity("current"),
            "final_verifier_identity": _synthetic_verifier_identity("final"),
        },
    )
    final_authentication = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_FINAL_RETENTION_AUTHENTICATION:V1",
        {
            "action_id": chain["final_action_id"],
            "challenge_hex": chain["final_challenge_hex"],
            "final_consumer_manifest_hash": final_manifest,
            "verifier_identity": _synthetic_verifier_identity("final"),
        },
    )
    final_acceptance = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_FINAL_RETENTION_ACCEPTANCE:V1",
        {
            "authentication_hash": final_authentication,
            "issued_at": chain["final_issued_at"],
            "verified_at": chain["final_verified_at"],
            "expires_at": chain["final_expires_at"],
            "retention_guaranteed_until": chain[
                "final_retention_guaranteed_until"
            ],
        },
    )
    final_result = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_FINAL_REPLAY_RESULT:V1",
        {
            "retention_acceptance_hash": final_acceptance,
            "final_consumer_manifest_hash": final_manifest,
            "candidate_graph_hash": candidate_graph_hash,
        },
    )
    expected = {
        "current_source_revalidation_hash": current_source_revalidation_hash,
        "final_source_revalidation_hash": final_source_revalidation_hash,
        "current_retention_authentication_hash": current_authentication,        "current_retention_acceptance_hash": current_acceptance,
        "current_replay_result_hash": current_result,
        "verified_historical_manifest_hash": historical,
        "final_consumer_manifest_hash": final_manifest,
        "final_retention_authentication_hash": final_authentication,
        "final_retention_acceptance_hash": final_acceptance,
        "final_replay_result_hash": final_result,
    }
    if any(chain[key] != value for key, value in expected.items()):
        raise ContractValidationError("replay chain recomputation mismatch")


@dataclass(frozen=True)
class ValidatedEvidenceFacts:
    parent_boundary_and_privacy_clear: bool
    inherited_provider_conflict: bool
    section_7_4_provider_conflict: bool
    local_structure_and_encoding_valid: bool
    source_and_trust_review_complete_current: bool
    context_and_terminal_variant_valid: bool
    cryptographic_and_integrity_checks_passed: bool
    runtime_capability_observed: bool
    evidence_complete_current_correlated: bool

    def __post_init__(self) -> None:
        if any(type(value) is not bool for value in self.__dict__.values()):
            raise ContractValidationError("validated evidence fact type mismatch")


def derive_validated_candidate_facts(
    contract: dict[str, Any], source_evidence: dict[str, Any]
) -> ValidatedEvidenceFacts:
    # Called only after all structural, cryptographic, cross-binding, replay,
    # envelope, source, and current-artifact validators have returned.
    if source_evidence["recorded_source_state"] != (
        "EXACT_PUBLIC_SOURCE_BYTES_REPLAYED_CAPABILITY_UNOBSERVED"
    ):
        raise ContractValidationError("source capability state mismatch")
    if any(value != [] for value in contract["approval_registries"].values()):
        raise ContractValidationError("unreviewed runtime approval present")
    return ValidatedEvidenceFacts(
        parent_boundary_and_privacy_clear=True,
        inherited_provider_conflict=False,
        section_7_4_provider_conflict=False,
        local_structure_and_encoding_valid=True,
        source_and_trust_review_complete_current=True,
        context_and_terminal_variant_valid=True,
        cryptographic_and_integrity_checks_passed=True,
        runtime_capability_observed=False,
        evidence_complete_current_correlated=True,
    )


def derive_live_disposition(
    *,
    contract: dict[str, Any],
    facts: ValidatedEvidenceFacts | None = None,
    caller_payload: dict[str, Any] | None = None,
) -> str:
    if caller_payload and any(
        key in caller_payload
        for key in EXPECTED_CONDITIONS
        + ["conditions", "trusted_conditions", "selected_outcome", "facts"]
    ):
        raise ContractValidationError("caller predicate injection")
    if facts is None:
        return EXPECTED_LIVE_OUTCOMES["R1"]
    if not facts.parent_boundary_and_privacy_clear:
        return EXPECTED_LIVE_OUTCOMES["R1"]
    if facts.inherited_provider_conflict:
        return EXPECTED_LIVE_OUTCOMES["R2_INHERITED"]
    if facts.section_7_4_provider_conflict:
        return EXPECTED_LIVE_OUTCOMES["R2_SECTION_7_4"]
    if not facts.local_structure_and_encoding_valid:
        return EXPECTED_LIVE_OUTCOMES["R3"]
    classifications = [
        entry["classification"]
        for entry in contract["source_trust_condition_registry"]
    ]
    if (
        not facts.source_and_trust_review_complete_current
        or "SOURCE_OR_TRUST_UNAVAILABLE_R4" in classifications
    ):
        return EXPECTED_LIVE_OUTCOMES["R4"]
    if not facts.context_and_terminal_variant_valid:
        return EXPECTED_LIVE_OUTCOMES["R5"]
    if not facts.cryptographic_and_integrity_checks_passed:
        return EXPECTED_LIVE_OUTCOMES["R6"]
    if any(value != [] for value in contract["approval_registries"].values()):
        raise ContractValidationError("unreviewed nonempty approval registry")
    if (
        not facts.runtime_capability_observed
        or "APPROVAL_UNCLOSED_R7" in classifications
    ):
        return EXPECTED_LIVE_OUTCOMES["R7"]
    if (
        not facts.evidence_complete_current_correlated
        or "EVIDENCE_STALE_REVOKED_OR_UNCORRELATED_R8" in classifications
    ):
        return EXPECTED_LIVE_OUTCOMES["R8"]
    return EXPECTED_LIVE_OUTCOMES["E9"]

def validate_quote_evidence(record: dict[str, Any]) -> None:
    expected_root = {
        "expected_verifier_binary_hash",
        "expected_verifier_policy_hash",
        "pre",
        "terminal",
    }
    if not isinstance(record, dict) or set(record) != expected_root:
        raise ContractValidationError("quote evidence keys mismatch")
    expected_binary = record["expected_verifier_binary_hash"]
    expected_policy = record["expected_verifier_policy_hash"]
    if not isinstance(expected_binary, str) or not HEX64.fullmatch(expected_binary):
        raise ContractValidationError("quote verifier binary malformed")
    if not isinstance(expected_policy, str) or not HEX64.fullmatch(expected_policy):
        raise ContractValidationError("quote verifier policy malformed")
    phase_keys = {
        "phase",
        "raw_quote_sha256",
        "raw_quote_hex",
        "expected_report_data_hex",
        "observed_report_data_hex",
        "pck_chain_sha256",
        "collateral_sha256",
        "crl_sha256",
        "tcb_status",
        "mrtd_sha256",
        "rtmr_map_sha256",
        "ccel_sha256",
        "cel_sha256",
        "attestation_key_identity_hash",
        "platform_identity_hash",
        "verifier_binary_hash",
        "verifier_policy_hash",
        "trusted_roots_mode",
        "collateral_checked",
        "crl_checked",
        "tcb_checked",
        "event_log_replayed",
        "outcome",
    }
    hash_fields = {
        "raw_quote_sha256",
        "pck_chain_sha256",
        "collateral_sha256",
        "crl_sha256",
        "mrtd_sha256",
        "rtmr_map_sha256",
        "ccel_sha256",
        "cel_sha256",
        "attestation_key_identity_hash",
        "platform_identity_hash",
        "verifier_binary_hash",
        "verifier_policy_hash",
    }
    phases: dict[str, dict[str, Any]] = {}
    for expected_phase in ("PRE", "TERMINAL"):
        value = record[expected_phase.lower()]
        if not isinstance(value, dict) or set(value) != phase_keys:
            raise ContractValidationError("quote phase keys mismatch")
        if value["phase"] != expected_phase:
            raise ContractValidationError("quote phase mismatch")
        if any(
            not isinstance(value[field], str) or not HEX64.fullmatch(value[field])
            for field in hash_fields
        ):
            raise ContractValidationError("quote phase hash malformed")
        if (
            not isinstance(value["raw_quote_hex"], str)
            or value["raw_quote_hex"] != value["raw_quote_hex"].lower()
        ):
            raise ContractValidationError("quote raw bytes encoding malformed")
        try:
            raw_quote = bytes.fromhex(value["raw_quote_hex"])
        except (TypeError, ValueError) as exc:
            raise ContractValidationError("quote raw bytes malformed") from exc
        if not raw_quote or digest(raw_quote) != value["raw_quote_sha256"]:
            raise ContractValidationError("quote raw-byte hash mismatch")
        if (
            not isinstance(value["expected_report_data_hex"], str)
            or not HEX128.fullmatch(value["expected_report_data_hex"])
            or value["observed_report_data_hex"]
            != value["expected_report_data_hex"]
        ):
            raise ContractValidationError("quote report data mismatch")
        if value["verifier_binary_hash"] != expected_binary or value[
            "verifier_policy_hash"
        ] != expected_policy:
            raise ContractValidationError("quote verifier identity mismatch")
        if value["trusted_roots_mode"] != "EXPLICIT_PINNED":
            raise ContractValidationError("quote trusted roots are permissive")
        if any(
            value[key] is not True
            for key in (
                "collateral_checked",
                "crl_checked",
                "tcb_checked",
                "event_log_replayed",
            )
        ):
            raise ContractValidationError("quote verification control disabled")
        if value["tcb_status"] != "UP_TO_DATE" or value["outcome"] != "PASS":
            raise ContractValidationError("quote TCB or outcome mismatch")
        phases[expected_phase] = value
    for field in (
        "pck_chain_sha256",
        "mrtd_sha256",
        "rtmr_map_sha256",
        "attestation_key_identity_hash",
        "platform_identity_hash",
    ):
        if phases["PRE"][field] != phases["TERMINAL"][field]:
            raise ContractValidationError("pre/terminal quote continuity mismatch")
    if phases["PRE"]["raw_quote_sha256"] == phases["TERMINAL"]["raw_quote_sha256"]:
        raise ContractValidationError("pre/terminal quote bytes unexpectedly reused")


def _expected_synthetic_opaque_record(
    record_kind: str, target_hash: str
) -> dict[str, Any]:
    order = [
        "trust_distribution", "pre_quote_transport", "terminal_quote_transport",
        "kms_transport", "channel_enforcement", "audit_mapping",
        "pre_execution_attempt", "terminal_proof",
    ]
    phase_times = {
        "trust_distribution": (100, 105),
        "pre_quote_transport": (120, 130),
        "terminal_quote_transport": (220, 230),
        "kms_transport": (250, 260),
        "channel_enforcement": (250, 270),
        "audit_mapping": (270, 280),
        "pre_execution_attempt": (90, 99),
        "terminal_proof": (270, 290),
    }
    issued_at, verified_at = phase_times[record_kind]
    expires_at = issued_at + 300
    synthetic_contract_identity_hash = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_OPAQUE_CONTRACT_IDENTITY:V1",
        {"record_kind": record_kind},
    )
    record_hash = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_OPAQUE_RECORD:V1",
        {
            "record_kind": record_kind,
            "target_hash": target_hash,
            "synthetic_contract_identity_hash": synthetic_contract_identity_hash,
        },
    )
    authentication_hash = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_OPAQUE_AUTHENTICATION:V1",
        {"record_kind": record_kind, "record_hash": record_hash},
    )
    freshness_hash = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_OPAQUE_FRESHNESS:V1",
        {
            "record_kind": record_kind,
            "record_hash": record_hash,
            "issued_at": issued_at,
            "verified_at": verified_at,
            "expires_at": expires_at,
        },
    )
    return {
        "record_kind": record_kind,
        "record_hash": record_hash,
        "authentication_verification_hash": authentication_hash,
        "freshness_verification_hash": freshness_hash,
        "synthetic_contract_identity_hash": synthetic_contract_identity_hash,
        "target_hash": target_hash,
        "record_bound_target_hash": target_hash,
        "issued_at": issued_at,
        "verified_at": verified_at,
        "expires_at": expires_at,
        "status": "SYNTHETIC_VERIFIED_NO_RUNTIME_APPROVAL",
    }


def validate_opaque_acceptances(records: dict[str, dict[str, Any]]) -> None:
    expected_ids = {
        "trust_distribution", "pre_quote_transport", "terminal_quote_transport",
        "kms_transport", "channel_enforcement", "audit_mapping",
        "pre_execution_attempt", "terminal_proof",
    }
    if not isinstance(records, dict) or set(records) != expected_ids:
        raise ContractValidationError("opaque acceptance set mismatch")
    for record_kind, record in records.items():
        if not isinstance(record, dict):
            raise ContractValidationError("opaque acceptance record malformed")
        target_hash = record.get("target_hash")
        if not isinstance(target_hash, str) or not HEX64.fullmatch(target_hash):
            raise ContractValidationError("opaque acceptance target malformed")
        if record != _expected_synthetic_opaque_record(record_kind, target_hash):
            raise ContractValidationError("opaque acceptance authentication or freshness mismatch")


P256_FIELD = int(
    "ffffffff00000001000000000000000000000000ffffffffffffffffffffffff", 16
)
P256_A = P256_FIELD - 3
P256_B = int(
    "5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b", 16
)
SYNTHETIC_KMS_KEY_NAME = "projects/synthetic/locations/global/keyRings/runtime/cryptoKeys/receipt/cryptoKeyVersions/1"

P256_G = (
    int("6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296", 16),
    int("4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5", 16),
)


def _p256_add(
    left: tuple[int, int] | None, right: tuple[int, int] | None
) -> tuple[int, int] | None:
    if left is None:
        return right
    if right is None:
        return left
    x1, y1 = left
    x2, y2 = right
    if x1 == x2 and (y1 + y2) % P256_FIELD == 0:
        return None
    if left == right:
        slope = (3 * x1 * x1 + P256_A) * pow(2 * y1, -1, P256_FIELD)
    else:
        slope = (y2 - y1) * pow(x2 - x1, -1, P256_FIELD)
    slope %= P256_FIELD
    x3 = (slope * slope - x1 - x2) % P256_FIELD
    y3 = (slope * (x1 - x3) - y1) % P256_FIELD
    return x3, y3


def _p256_multiply(scalar: int, point: tuple[int, int]) -> tuple[int, int] | None:
    result: tuple[int, int] | None = None
    addend: tuple[int, int] | None = point
    while scalar:
        if scalar & 1:
            result = _p256_add(result, addend)
        addend = _p256_add(addend, addend)
        scalar >>= 1
    return result


def verify_p256_ecdsa(
    digest_bytes: bytes, signature_der: bytes, public_x: int, public_y: int
) -> bool:
    if len(digest_bytes) != 32:
        return False
    if not (0 <= public_x < P256_FIELD and 0 <= public_y < P256_FIELD):
        return False
    if (public_y * public_y - (public_x**3 + P256_A * public_x + P256_B)) % P256_FIELD:
        return False
    try:
        r, s = parse_strict_p256_der(signature_der)
    except ContractValidationError:
        return False
    z = int.from_bytes(digest_bytes, "big")
    inverse = pow(s, -1, P256_ORDER)
    point = _p256_add(
        _p256_multiply((z * inverse) % P256_ORDER, P256_G),
        _p256_multiply((r * inverse) % P256_ORDER, (public_x, public_y)),
    )
    return point is not None and point[0] % P256_ORDER == r


def validate_kms_evidence(record: dict[str, Any]) -> None:
    expected_keys = {
        "algorithm",
        "version_id",
        "statement_digest_hex",
        "request_digest_hex",
        "digest_crc32c",
        "requested_name",
        "response_name",
        "verified_digest_crc32c",
        "protection_level",
        "raw_signature_der_hex",
        "canonical_signature_der_hex",
        "signature_crc32c",
        "public_key_x_hex",
        "public_key_y_hex",
    }
    if not isinstance(record, dict) or set(record) != expected_keys:
        raise ContractValidationError("KMS evidence keys mismatch")
    if record["algorithm"] != "EC_SIGN_P256_SHA256" or record["version_id"] != "1":
        raise ContractValidationError("KMS algorithm or version mismatch")
    for field in ("statement_digest_hex", "request_digest_hex"):
        if not isinstance(record[field], str) or not HEX64.fullmatch(record[field]):
            raise ContractValidationError("KMS digest malformed")
    if record["statement_digest_hex"] != record["request_digest_hex"]:
        raise ContractValidationError("KMS digest projection mismatch")
    digest_bytes = bytes.fromhex(record["statement_digest_hex"])
    if type(record["digest_crc32c"]) is not int or record["digest_crc32c"] != crc32c(digest_bytes):
        raise ContractValidationError("KMS digest CRC mismatch")
    if record["verified_digest_crc32c"] is not True:
        raise ContractValidationError("KMS digest CRC not verified")
    if (
        record["requested_name"] != SYNTHETIC_KMS_KEY_NAME
        or record["response_name"] != record["requested_name"]
    ):
        raise ContractValidationError("KMS response name mismatch")
    if record["protection_level"] != "HSM":
        raise ContractValidationError("KMS protection level mismatch")
    for field in (
        "raw_signature_der_hex", "canonical_signature_der_hex",
        "public_key_x_hex", "public_key_y_hex",
    ):
        if (
            not isinstance(record[field], str)
            or record[field] != record[field].lower()
            or len(record[field]) % 2
            or not re.fullmatch(r"[0-9a-f]+", record[field])
        ):
            raise ContractValidationError("KMS signature or key encoding malformed")
    if not HEX64.fullmatch(record["public_key_x_hex"]) or not HEX64.fullmatch(
        record["public_key_y_hex"]
    ):
        raise ContractValidationError("KMS public key encoding malformed")
    try:
        raw_signature = bytes.fromhex(record["raw_signature_der_hex"])
        canonical_signature = bytes.fromhex(record["canonical_signature_der_hex"])
        public_x = int(record["public_key_x_hex"], 16)
        public_y = int(record["public_key_y_hex"], 16)
    except (TypeError, ValueError) as exc:
        raise ContractValidationError("KMS signature or key encoding malformed") from exc
    if (public_x, public_y) != P256_G:
        raise ContractValidationError("KMS approved public key mismatch")
    if type(record["signature_crc32c"]) is not int or record["signature_crc32c"] != crc32c(raw_signature):
        raise ContractValidationError("KMS signature CRC mismatch")
    if not verify_p256_ecdsa(digest_bytes, raw_signature, public_x, public_y):
        raise ContractValidationError("KMS ECDSA verification failed")
    if normalize_p256_low_s_der(raw_signature) != canonical_signature:
        raise ContractValidationError("KMS canonical low-S mapping mismatch")


def validate_terminal_payload(payload: dict[str, Any], variant: str) -> None:
    if not isinstance(payload, dict):
        raise ContractValidationError("terminal payload type mismatch")
    if variant == "COMPLETED_EXECUTION":
        expected = {
            "variant",
            "semantic_result_hash",
            "result_contract_hash",
            "presented_bytes_sha256",
            "presented_bytes_hex",
            "byte_length",
        }
        if set(payload) != expected or payload["variant"] != variant:
            raise ContractValidationError("completed terminal payload keys mismatch")
        if any(
            not isinstance(payload[key], str) or not HEX64.fullmatch(payload[key])
            for key in ("semantic_result_hash", "result_contract_hash", "presented_bytes_sha256")
        ):
            raise ContractValidationError("completed terminal payload hash malformed")
        if (
            not isinstance(payload["presented_bytes_hex"], str)
            or payload["presented_bytes_hex"] != payload["presented_bytes_hex"].lower()
            or len(payload["presented_bytes_hex"]) % 2
        ):
            raise ContractValidationError("presented semantic result bytes malformed")
        try:
            presented_bytes = bytes.fromhex(payload["presented_bytes_hex"])
        except (TypeError, ValueError) as exc:
            raise ContractValidationError("presented semantic result bytes malformed") from exc
        if (
            not presented_bytes
            or payload["presented_bytes_hex"] != payload["presented_bytes_hex"].lower()
            or digest(presented_bytes) != payload["presented_bytes_sha256"]
            or payload["semantic_result_hash"] != payload["presented_bytes_sha256"]
            or payload["result_contract_hash"] != SYNTHETIC_RESULT_CONTRACT_HASH
        ):
            raise ContractValidationError("presented semantic result mismatch")
        result_value = strict_load_json_bytes(presented_bytes)
        if (
            not isinstance(result_value, dict)
            or set(result_value) != {"posterior", "value"}
            or result_value["posterior"] != "synthetic"
            or type(result_value["value"]) is not int
            or canonical_json_bytes(result_value) != presented_bytes
        ):
            raise ContractValidationError("presented result contract validation failed")
        if type(payload["byte_length"]) is not int or payload["byte_length"] != len(presented_bytes):
            raise ContractValidationError("presented semantic result length malformed")
        return
    if variant == "OPERATIONAL_FAILURE":
        expected = {
            "variant",
            "failure_body_hash",
            "presented_failure_body_hash",
            "presented_failure_body_hex",
            "result_contract_hash",
            "failure_phase",
            "error_class",
            "failure_committed_at",
            "partial_result_posture",
            "semantic_result_presence",
        }
        if set(payload) != expected or payload["variant"] != variant:
            raise ContractValidationError("failure terminal payload keys mismatch")
        if (
            not isinstance(payload["failure_body_hash"], str)
            or not HEX64.fullmatch(payload["failure_body_hash"])
            or payload["presented_failure_body_hash"] != payload["failure_body_hash"]
            or payload["result_contract_hash"] != SYNTHETIC_RESULT_CONTRACT_HASH
        ):
            raise ContractValidationError("failure body hash mismatch")
        if payload["failure_phase"] not in {
            "PRE_EXECUTION_RUNTIME_VALIDATION",
            "MODEL_IMPORT",
            "INFERENCE_EXECUTION",
            "RESULT_CONSTRUCTION",
        } or payload["error_class"] not in {
            "RESOURCE_LIMIT",
            "DEPENDENCY_LOAD_FAILURE",
            "NUMERICAL_RUNTIME_FAILURE",
            "INTERNAL_INVARIANT_FAILURE",
            "TIMEOUT",
            "TERMINATED_BEFORE_RESULT",
        }:
            raise ContractValidationError("failure enum mismatch")
        if type(payload["failure_committed_at"]) is not int:
            raise ContractValidationError("failure timestamp malformed")
        if payload["partial_result_posture"] != "DISCARDED_NOT_HASHED_NOT_RETAINED":
            raise ContractValidationError("failure partial-result posture mismatch")
        if payload["semantic_result_presence"] != "EXPLICITLY_ABSENT":
            raise ContractValidationError("failure semantic result present")
        failure_body = {
            "schema_version": "GCP_OPERATIONAL_FAILURE_BODY_V1",
            "closed_failure_phase": payload["failure_phase"],
            "closed_error_class": payload["error_class"],
            "failure_committed_at": payload["failure_committed_at"],
            "partial_result_posture": payload["partial_result_posture"],
        }
        expected_failure_bytes = canonical_json_bytes(failure_body)
        if (
            not isinstance(payload["presented_failure_body_hex"], str)
            or payload["presented_failure_body_hex"]
            != expected_failure_bytes.hex()
            or payload["failure_body_hash"]
            != domain_hash(
                "FLUENCYTRACR:GCP_OPERATIONAL_FAILURE_BODY:V1", failure_body
            )
        ):
            raise ContractValidationError("failure body recomputation mismatch")
        return
    raise ContractValidationError("unknown terminal payload variant")


def validate_tcb_cutoff(sign_time: int, adverse_effective_at: int | None) -> str:
    if type(sign_time) is not int:
        raise ContractValidationError("sign time malformed")
    if adverse_effective_at is None:
        return "NO_ADVERSE_STATE"
    if type(adverse_effective_at) is not int:
        raise ContractValidationError("TCB effective time malformed")
    if adverse_effective_at <= sign_time:
        return "REJECT_ADVERSE_AT_OR_BEFORE_SIGNING"
    return "ADVERSE_AFTER_SIGNING"


def _read_der_length(data: bytes, offset: int) -> tuple[int, int]:
    if offset >= len(data):
        raise ContractValidationError("truncated DER length")
    first = data[offset]
    if first < 0x80:
        return first, offset + 1
    count = first & 0x7F
    if count == 0 or count > 2 or offset + 1 + count > len(data):
        raise ContractValidationError("invalid DER length")
    raw = data[offset + 1 : offset + 1 + count]
    if raw[0] == 0 or int.from_bytes(raw, "big") < 0x80:
        raise ContractValidationError("nonminimal DER length")
    return int.from_bytes(raw, "big"), offset + 1 + count


def _read_der_integer(data: bytes, offset: int) -> tuple[int, int]:
    if offset >= len(data) or data[offset] != 0x02:
        raise ContractValidationError("DER integer tag missing")
    length, start = _read_der_length(data, offset + 1)
    end = start + length
    if length == 0 or end > len(data):
        raise ContractValidationError("DER integer truncated")
    raw = data[start:end]
    if raw[0] & 0x80:
        raise ContractValidationError("negative DER integer")
    if len(raw) > 1 and raw[0] == 0 and not raw[1] & 0x80:
        raise ContractValidationError("nonminimal DER integer")
    value = int.from_bytes(raw, "big")
    if not 1 <= value < P256_ORDER:
        raise ContractValidationError("DER integer outside P-256 range")
    return value, end


def parse_strict_p256_der(signature: bytes) -> tuple[int, int]:
    if not signature or signature[0] != 0x30:
        raise ContractValidationError("DER sequence tag missing")
    length, offset = _read_der_length(signature, 1)
    if offset + length != len(signature):
        raise ContractValidationError("DER sequence length or trailing bytes mismatch")
    r, offset = _read_der_integer(signature, offset)
    s, offset = _read_der_integer(signature, offset)
    if offset != len(signature):
        raise ContractValidationError("DER trailing bytes")
    return r, s


def _encode_der_integer(value: int) -> bytes:
    raw = value.to_bytes((value.bit_length() + 7) // 8 or 1, "big")
    if raw[0] & 0x80:
        raw = b"\x00" + raw
    return b"\x02" + bytes([len(raw)]) + raw


def normalize_p256_low_s_der(signature: bytes) -> bytes:
    r, s = parse_strict_p256_der(signature)
    s = min(s, P256_ORDER - s)
    body = _encode_der_integer(r) + _encode_der_integer(s)
    if len(body) >= 0x80:
        raise ContractValidationError("unexpected P-256 DER length")
    return b"\x30" + bytes([len(body)]) + body


def crc32c(data: bytes) -> int:
    crc = 0xFFFFFFFF
    polynomial = 0x82F63B78
    for byte in data:
        crc ^= byte
        for _ in range(8):
            crc = (crc >> 1) ^ (polynomial if crc & 1 else 0)
    return (~crc) & 0xFFFFFFFF


def validate_vectors(vectors: dict[str, Any], contract: dict[str, Any]) -> None:
    expected_keys = {
        "schema_version",
        "canonicalization_version",
        "artifact_bindings",
        "synthetic_only",
        "authorization_effect",
        "approval_registries_expected_empty",
        "primitive_vectors",
        "graph_summary",
        "structural_scenarios",
        "decision_vectors",
        "adversarial_case_ids",
    }
    _ensure_exact_keys(vectors, expected_keys, "vectors")
    if not vectors["synthetic_only"] or vectors["authorization_effect"] != "NONE":
        raise ContractValidationError("vectors attempted authority")
    if vectors["approval_registries_expected_empty"] != sorted(
        EXPECTED_APPROVAL_REGISTRIES
    ):
        raise ContractValidationError("vector approval registry mismatch")
    bindings = vectors["artifact_bindings"]
    if bindings != {
        "attestation_receipt_contract_sha256": digest(CONTRACT_PATH.read_bytes()),
        "provider_source_evidence_sha256": digest(SOURCE_PATH.read_bytes()),
        "provider_revalidation_sha256": digest(REVALIDATION_PATH.read_bytes()),
    }:
        raise ContractValidationError("vector artifact binding mismatch")
    primitive = {entry["vector_id"]: entry for entry in vectors["primitive_vectors"]}
    canonical = primitive["CANONICAL_JSON"]
    if bytes.fromhex(canonical["canonical_utf8_hex"]) != canonical_json_bytes(
        canonical["input"]
    ):
        raise ContractValidationError("canonical JSON vector mismatch")
    if canonical["sha256"] != digest(canonical_json_bytes(canonical["input"])):
        raise ContractValidationError("canonical JSON digest mismatch")
    challenge = primitive["CHALLENGE_WIRE"]
    if challenge_wire_value(bytes.fromhex(challenge["challenge_hex"])) != challenge[
        "wire_ascii"
    ] or challenge["wire_byte_count"] != 43:
        raise ContractValidationError("challenge wire vector mismatch")
    nonce = primitive["NONCE_DERIVATIONS"]
    tls_exporter = bytes.fromhex(nonce["tls_exporter_hex"])
    context_hash = bytes.fromhex(nonce["challenge_context_hash"])
    if nonce["channel_nonce_wire"] != derive_wire_nonce(
        "FLUENCYTRACR:GCP_CHANNEL_NONCE:V1", tls_exporter
    ):
        raise ContractValidationError("channel nonce vector mismatch")
    if nonce["context_nonce_wire"] != derive_wire_nonce(
        "FLUENCYTRACR:GCP_CONTEXT_NONCE:V1", context_hash
    ):
        raise ContractValidationError("context nonce vector mismatch")
    expected_execution = base64.urlsafe_b64encode(
        hashlib.sha256(
            b"FLUENCYTRACR:GCP_EXECUTION_NONCE:V1\x00"
            + bytes.fromhex(nonce["execution_preimage_hex"])
        ).digest()
    ).rstrip(b"=").decode("ascii")
    if nonce["execution_nonce_wire"] != expected_execution:
        raise ContractValidationError("execution nonce vector mismatch")
    report = primitive["PRE_QUOTE_REPORT_DATA"]
    if launcher_tdx_report_data(bytes.fromhex(report["quote_binding_sha512"])) != bytes.fromhex(
        report["launcher_report_data_sha512"]
    ):
        raise ContractValidationError("launcher report-data vector mismatch")
    if len(vectors["decision_vectors"]) != 256:
        raise ContractValidationError("decision totality vector count mismatch")
    for entry in vectors["decision_vectors"]:
        expected = next(
            (f"R{i + 1}" for i, value in enumerate(entry["conditions"]) if value),
            "E9",
        )
        if entry["selected"] != expected:
            raise ContractValidationError("decision vector mismatch")
    low_s = primitive["P256_LOW_S_RULE"]
    if int(low_s["curve_order_hex"], 16) != P256_ORDER:
        raise ContractValidationError("P-256 order vector mismatch")
    if min(
        int(low_s["input_s_hex"], 16),
        P256_ORDER - int(low_s["input_s_hex"], 16),
    ) != int(low_s["expected_low_s_hex"], 16):
        raise ContractValidationError("low-S vector mismatch")
    graph = vectors["graph_summary"]
    if graph["hash_node_count"] != contract["hash_node_registry"]["entry_count"]:
        raise ContractValidationError("vector node count mismatch")
    if graph["selector_count"] != contract["selector_registry"]["entry_count"]:
        raise ContractValidationError("vector selector count mismatch")
    if graph["composition_count"] != contract["composition_contract"]["entry_count"]:
        raise ContractValidationError("vector composition count mismatch")
    if graph["replay_kind_count"] != 42:
        raise ContractValidationError("vector replay kind count mismatch")
    domains = sorted(
        entry["domain_separator"]
        for entry in contract["hash_node_registry"]["entries"]
        if entry["algorithm"] in {"SHA256", "SHA512"}
    )
    if graph["domain_registry_sha256"] != digest(canonical_json_bytes(domains)):
        raise ContractValidationError("vector domain registry hash mismatch")
    if graph["node_registry_sha256"] != digest(
        canonical_json_bytes(contract["hash_node_registry"]["entries"])
    ):
        raise ContractValidationError("vector node registry hash mismatch")
    expected_adversarial_ids = [
        "NULL_FIELD", "FLOAT_FIELD", "DUPLICATE_KEY", "UNKNOWN_FIELD",
        "NON_NFC", "CONTROL_CHARACTER", "NEGATIVE_ZERO", "SOURCE_OMISSION",
        "SOURCE_RESEAL", "NIL_PRESENT_EMPTY_ALIAS", "QUOTE_PHASE_SPLICE",
        "QUOTE_VERIFIER_SUBSTITUTION", "TERMINAL_SELECTOR_SPLICE",
        "PRESENTED_PAYLOAD_VARIANT_SPLICE", "KMS_DOUBLE_HASH",
        "KMS_WRONG_VERSION", "DER_NONMINIMAL", "HIGH_S_NOT_NORMALIZED",
        "REPLAY_ACTION_SUBSTITUTION", "REPLAY_VERIFIER_SUBSTITUTION",
        "MODEL_PLAN_BYTES_MISSING", "SECTION_7_6_SCHEMA_SMUGGLING",
        "CALLER_PREDICATE_INJECTION", "AUTHORITY_ADDITION",
    ]
    if vectors["adversarial_case_ids"] != expected_adversarial_ids:
        raise ContractValidationError("adversarial case registry mismatch")
    for scenario in vectors["structural_scenarios"]:
        if scenario["authority_effect"] != "NONE":
            raise ContractValidationError("synthetic scenario attempted authority")
        if scenario["live_result"] != "HOLD_FOR_ATTESTATION_VERIFIER_UNCLOSED":
            raise ContractValidationError("synthetic scenario escaped empty approvals")
