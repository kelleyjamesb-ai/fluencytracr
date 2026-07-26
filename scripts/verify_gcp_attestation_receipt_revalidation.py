#!/usr/bin/env python3
"""Replay the Section 7.4 public-source bundle without network or GCP access."""

from __future__ import annotations

import argparse
import hashlib
import hmac
import importlib.util
import secrets
import sys
import time
import zipfile
from pathlib import Path, PurePosixPath
from typing import Any

from gcp_attestation_receipt_contract_validation import (
    ContractValidationError,
    canonical_json_bytes,
    digest,
    domain_hash,
    load_json,
    strict_load_json_bytes,
    validate_revalidation,
    validate_source_evidence,
)

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / "docs/contracts/canonical-inference-gcp-attestation-receipt"
EVIDENCE_PATH = DIR / "provider-source-evidence.json"
REVALIDATION_PATH = DIR / "provider-revalidation.json"
EXPECTED_EVIDENCE_SHA256 = "60355202cccd7157d3a102a30379f3a5e5aa74de0ce43b77a41a2ff87a35dc12"
EXPECTED_BUNDLE_SHA256 = "6f7ea9cb42afba261f859a257d879a088ed0ab473756a1994ba941be13b3204a"
EXPECTED_BUNDLE_BYTES = 2295351
EXPECTED_SOURCE_REGISTRY_SHA256 = "fda800e66800833486b69bd2fcf6a3e94057a98e554e76f00e47c64c97468e35"
EXPECTED_CLAIM_REGISTRY_SHA256 = "45b178a04d866b5ba7c8fe49528b00765d779564b342cc268e16f2e9f636f16e"
EXPECTED_APPLICABILITY_REGISTRY_SHA256 = "4127243f164ce5fbcf35df31069fa593f12dd2a935a5a748b3140a27aaf7c675"
DEFAULT_SECTION71_BUNDLE = Path("~/.glean/recovery/fluencytracr/gcp-provider-vocabulary-source-snapshot-20260724T030000Z.zip").expanduser()
DEFAULT_SECTION72_BUNDLE = Path("~/.glean/recovery/fluencytracr/gcp-runtime-object-revalidation-source-snapshot-20260724T151043Z.zip").expanduser()
DEFAULT_SECTION73_BUNDLE = Path("~/.glean/recovery/fluencytracr/gcp-security-authority-source-snapshot-20260724T232044Z.zip").expanduser()

EXPECTED_SOURCE_IDS = ('TOKEN_CLAIMS', 'EXTERNAL_RESOURCES', 'TOKEN_VALIDATION_FIELDS', 'CVM_ATTESTATION', 'KMS_SIGNATURES', 'KMS_ALGORITHMS', 'KMS_ASYMMETRIC_SIGN_REST', 'KMS_GET_PUBLIC_KEY_REST', 'KMS_DATA_INTEGRITY', 'KMS_AUDIT_LOGGING', 'CLOUD_AUDIT_LOGS', 'GO_TPM_TEE_SERVER', 'GO_TPM_TEE_PROTO', 'GO_TPM_AGENT', 'GO_TPM_AGENT_TEST', 'GO_TPM_LAUNCHER_GO_MOD', 'GO_TPM_EXPERIMENTS', 'GO_TPM_BC_EXPERIMENT', 'CS_LABELS', 'CS_ATTESTATION_PROTO', 'TDX_VERIFY', 'TDX_VALIDATE', 'TDX_CCEL', 'TDX_CLIENT_LINUX', 'EVENTLOG_CEL', 'EVENTLOG_RTMR', 'EVENTLOG_CCEL_REPLAY', 'CONFIGFS_REPORT', 'CONFIGFS_LINUXTSM')
_REPLAY_RECEIPT_KEY = secrets.token_bytes(32)
_REPLAY_PRODUCER_ID = digest(_REPLAY_RECEIPT_KEY)
_CONSUMED_REPLAY_INVOCATIONS: set[str] = set()

EXPECTED_CLAIM_IDS = ('TOKEN_NONCE_RANGE_8_88', 'TOKEN_NONCE_MAX_SIX', 'TOKEN_CUSTOM_AUDIENCE_ECHO', 'CUSTOM_REQUEST_NONCE_RANGE_10_74', 'CUSTOM_REQUEST_NONCE_ECHO_REJECT', 'TLS_EKM_NONCE_BINDING', 'OIDC_DISCOVERY_RS256_JWKS', 'TDX_MRTD_RTMR3', 'TDX_GUEST_REFERENCE', 'KMS_P256_SHA256_ALGORITHM', 'KMS_DER_SIGNATURE', 'KMS_PARSE_PUBLIC_KEY', 'KMS_ASYMMETRIC_SIGN_INTEGRITY_FIELDS', 'KMS_PUBLIC_KEY_PROTECTION_LEVEL', 'KMS_DATA_INTEGRITY_CRC32C', 'KMS_AUDIT_ASYMMETRIC_SIGN', 'DATA_ACCESS_DEFAULT_DISABLED', 'EVIDENCE_ENDPOINT_POST', 'EVIDENCE_ENDPOINT_NIL_EXTRA_DATA', 'EVIDENCE_REQUEST_CHALLENGE_ONLY', 'EVIDENCE_EXPERIMENT_GATE', 'TDX_NESTED_SHA512_NIL_BRANCH', 'EVIDENCE_RETURNS_QUOTE_CCEL_CEL', 'NIL_EXTRA_DATA_TESTED', 'TRANSITIVE_MODULE_PINS', 'TRANSITIVE_EVENTLOG_CONFIGFS_PINS', 'EXPERIMENT_DEFAULT_EMPTY', 'PACKAGED_BC_EXPERIMENT_ENABLED', 'BC_MODE_TOKEN_UNSUPPORTED', 'WORKLOAD_ATTESTATION_LABEL', 'GENERIC_PROTO_REPORT_DATA_FORMULA', 'PROTO_CCEL_CEL_QUOTE_FIELDS', 'TDX_VERIFY_COLLATERAL_OPTIONS', 'TDX_VALIDATE_OMITTED_FIELDS_SKIP', 'TDX_VALIDATE_REPORT_DATA', 'TDX_CCEL_REPLAY', 'TDX_CONFIGFS_64_BYTE_REPORT_DATA', 'EVENTLOG_CEL_TYPED_TLV', 'EVENTLOG_RTMR_INDEX_MAPPING', 'EVENTLOG_CCEL_REPLAY_TRUST_BOUNDARY', 'CONFIGFS_REPORT_IN_OUT_BLOB', 'CONFIGFS_LINUX_REPORT_SUBSYSTEM')


def _safe_member(name: str) -> None:
    path = PurePosixPath(name)
    if not name or name.endswith("/") or path.is_absolute() or ".." in path.parts or "\\" in name:
        raise ContractValidationError("unsafe source bundle member")


def _span(text: str, needles: list[str]) -> int:
    positions: list[tuple[int, int]] = []
    for needle in needles:
        position = text.find(needle)
        if position < 0:
            raise ContractValidationError("source claim needle missing")
        positions.append((position, len(needle)))
    return max(position + length for position, length in positions) - min(
        position for position, _ in positions
    )


def _load_parent_module(name: str, path: Path) -> Any:
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise ContractValidationError("parent source verifier unavailable")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def replay(
    bundle: Path,
    section71_bundle: Path = DEFAULT_SECTION71_BUNDLE,
    section72_bundle: Path = DEFAULT_SECTION72_BUNDLE,
    section73_bundle: Path = DEFAULT_SECTION73_BUNDLE,
) -> dict[str, Any]:
    evidence_bytes = EVIDENCE_PATH.read_bytes()
    if digest(evidence_bytes) != EXPECTED_EVIDENCE_SHA256:
        raise ContractValidationError("provider source evidence compile pin mismatch")
    evidence = strict_load_json_bytes(evidence_bytes)
    if not isinstance(evidence, dict):
        raise ContractValidationError("provider source evidence root malformed")
    validate_source_evidence(evidence)
    revalidation = load_json(REVALIDATION_PATH)
    validate_revalidation(revalidation, evidence)

    if tuple(item["source_id"] for item in evidence["sources"]) != EXPECTED_SOURCE_IDS:
        raise ContractValidationError("source identity compile pin mismatch")
    if tuple(item["claim_id"] for item in evidence["claims"]) != EXPECTED_CLAIM_IDS:
        raise ContractValidationError("claim identity compile pin mismatch")
    if evidence["source_registry_sha256"] != EXPECTED_SOURCE_REGISTRY_SHA256:
        raise ContractValidationError("source registry compile pin mismatch")
    if evidence["claim_registry_sha256"] != EXPECTED_CLAIM_REGISTRY_SHA256:
        raise ContractValidationError("claim registry compile pin mismatch")
    if evidence["applicability_registry_sha256"] != EXPECTED_APPLICABILITY_REGISTRY_SHA256:
        raise ContractValidationError("applicability registry compile pin mismatch")

    bundle_bytes = bundle.read_bytes()
    if len(bundle_bytes) != EXPECTED_BUNDLE_BYTES or digest(bundle_bytes) != EXPECTED_BUNDLE_SHA256:
        raise ContractValidationError("source bundle bytes mismatch")
    contract = evidence["source_bundle"]
    if contract["sha256"] != EXPECTED_BUNDLE_SHA256 or contract["byte_count"] != EXPECTED_BUNDLE_BYTES:
        raise ContractValidationError("source bundle contract mismatch")

    with zipfile.ZipFile(bundle) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)):
            raise ContractValidationError("duplicate source bundle member")
        for name in names:
            _safe_member(name)
        expected_names = {"manifest.json"} | {
            item["bundle_path"] for item in evidence["sources"]
        }
        if set(names) != expected_names:
            raise ContractValidationError("source bundle member set mismatch")
        manifest = strict_load_json_bytes(archive.read("manifest.json"))
        if not isinstance(manifest, dict) or set(manifest) != {"schema_version", "sources"}:
            raise ContractValidationError("source bundle manifest malformed")
        if manifest["schema_version"] != "GCP_ATTESTATION_RECEIPT_SOURCE_BUNDLE_V1":
            raise ContractValidationError("source bundle manifest version mismatch")
        manifest_map = {item["source_id"]: item for item in manifest["sources"]}
        if tuple(manifest_map) != EXPECTED_SOURCE_IDS:
            raise ContractValidationError("source bundle manifest identity mismatch")

        bytes_by_source: dict[str, bytes] = {}
        for source in evidence["sources"]:
            source_id = source["source_id"]
            raw = archive.read(source["bundle_path"])
            bytes_by_source[source_id] = raw
            if len(raw) != source["snapshot_byte_count"] or digest(raw) != source["snapshot_sha256"]:
                raise ContractValidationError("source snapshot bytes mismatch")
            manifest_record = manifest_map[source_id]
            expected_manifest_record = {
                "source_id": source_id,
                "requested_url": source["requested_url"],
                "resolved_url": source["resolved_url"],
                "bundle_path": source["bundle_path"],
                "snapshot_sha256": source["snapshot_sha256"],
                "snapshot_byte_count": source["snapshot_byte_count"],
            }
            if manifest_record != expected_manifest_record:
                raise ContractValidationError("source manifest projection mismatch")
            if source["source_type"] == "IMMUTABLE_GIT_BLOB":
                commit = source["commit"]
                repository_path = source["repository_path"]
                if commit not in source["requested_url"] or repository_path not in source["requested_url"]:
                    raise ContractValidationError("immutable Git source URL mismatch")

        for claim in evidence["claims"]:
            text = bytes_by_source[claim["source_id"]].decode("utf-8", "replace")
            observed = _span(text, claim["needles"])
            if observed != claim["observed_span_chars"] or observed > claim["max_span_chars"]:
                raise ContractValidationError("source claim span mismatch")

    # Replay every inherited owner-scoped source/claim registry from its own
    # exact external bundle. These parent verifiers carry independent literal
    # source, claim, artifact, and bundle commitments.
    provider = _load_parent_module(
        "section71_provider_source_replay",
        ROOT / "scripts/verify_gcp_provider_source_bundle.py",
    )
    runtime = _load_parent_module(
        "section72_runtime_source_replay",
        ROOT / "scripts/verify_gcp_runtime_object_revalidation.py",
    )
    authority = _load_parent_module(
        "section73_authority_source_replay",
        ROOT / "scripts/verify_gcp_security_authority_revalidation.py",
    )
    provider.verify_bundle(section71_bundle)
    runtime.verify_revalidation_bundle(section72_bundle)
    authority_result = authority.replay(section73_bundle)
    if authority_result["source_count"] != 23 or authority_result["claim_count"] != 42:
        raise ContractValidationError("Section 7.3 inherited replay count mismatch")
    owner_registries = evidence["inherited_registry_manifest"]["owner_registries"]
    if sum(item["source_count"] for item in owner_registries.values()) != 55:
        raise ContractValidationError("inherited source count mismatch")
    if sum(item["claim_count"] for item in owner_registries.values()) != 82:
        raise ContractValidationError("inherited claim count mismatch")
    for owner, path in {
        "SECTION_7_1": section71_bundle,
        "SECTION_7_2": section72_bundle,
        "SECTION_7_3": section73_bundle,
    }.items():
        if digest(path.read_bytes()) != owner_registries[owner]["source_bundle_sha256"]:
            raise ContractValidationError("inherited source bundle hash mismatch")

    # Independently check the semantics assigned to applicability records.
    reviews = {item["review_id"]: item for item in evidence["applicability_reviews"]}
    claim_ids = {item["claim_id"] for item in evidence["claims"]}
    applicability_claim_requirements = {
        "NIL_EXTRA_DATA_SELECTED_ENDPOINT": {
            "EVIDENCE_ENDPOINT_NIL_EXTRA_DATA",
            "TDX_NESTED_SHA512_NIL_BRANCH",
            "NIL_EXTRA_DATA_TESTED",
            "GENERIC_PROTO_REPORT_DATA_FORMULA",
        },
        "EVIDENCE_ENDPOINT_CAPABILITY": {
            "EVIDENCE_ENDPOINT_POST",
            "EVIDENCE_EXPERIMENT_GATE",
            "PACKAGED_BC_EXPERIMENT_ENABLED",
        },
        "BC_OIDC_DIRECT_QUOTE_COMPOSITION": {
            "PACKAGED_BC_EXPERIMENT_ENABLED",
            "BC_MODE_TOKEN_UNSUPPORTED",
        },
        "TDX_VERIFIER_DEFAULTS": {
            "TDX_VERIFY_COLLATERAL_OPTIONS",
            "TDX_VALIDATE_OMITTED_FIELDS_SKIP",
            "TDX_VALIDATE_REPORT_DATA",
        },
        "CCEL_TABLE_BOUNDARY": {
            "EVIDENCE_RETURNS_QUOTE_CCEL_CEL",
            "TDX_CCEL_REPLAY",
        },
        "KMS_AUDIT_LIMIT": {
            "KMS_AUDIT_ASYMMETRIC_SIGN",
            "DATA_ACCESS_DEFAULT_DISABLED",
        },
    }
    if set(reviews) != set(applicability_claim_requirements):
        raise ContractValidationError("applicability review identity mismatch")
    if any(
        not required.issubset(claim_ids)
        for required in applicability_claim_requirements.values()
    ):
        raise ContractValidationError("applicability claim evidence incomplete")
    if reviews["NIL_EXTRA_DATA_SELECTED_ENDPOINT"]["disposition"] != "PROVEN_NIL_EXECUTABLE_PATH_GENERIC_PROTO_NON_APPLICABLE":
        raise ContractValidationError("nil-extraData applicability mapping mismatch")
    if reviews["EVIDENCE_ENDPOINT_CAPABILITY"]["capability_effect"] != "LIVE_R7_HOLD":
        raise ContractValidationError("source-code capability mapping mismatch")
    if reviews["BC_OIDC_DIRECT_QUOTE_COMPOSITION"]["capability_effect"] != "HOLD_SELECTED_IMAGE_MODE_UNPROVEN":
        raise ContractValidationError("BC OIDC/direct-quote composition mapping mismatch")
    if reviews["TDX_VERIFIER_DEFAULTS"]["capability_effect"] != "PERMISSIVE_DEFAULTS_REJECT":
        raise ContractValidationError("TDX default-policy mapping mismatch")
    if reviews["KMS_AUDIT_LIMIT"]["capability_effect"] != "NO_SAME_BOOT_CLAIM_FROM_AUDIT":
        raise ContractValidationError("audit limitation mapping mismatch")

    # Independent registry replay after source bytes and claim needles pass.
    if digest(canonical_json_bytes(evidence["sources"])) != EXPECTED_SOURCE_REGISTRY_SHA256:
        raise ContractValidationError("source registry replay mismatch")
    if digest(canonical_json_bytes(evidence["claims"])) != EXPECTED_CLAIM_REGISTRY_SHA256:
        raise ContractValidationError("claim registry replay mismatch")
    return {
        "source_count": len(evidence["sources"]),
        "claim_count": len(evidence["claims"]),
        "source_bundle_sha256": digest(bundle_bytes),
        "inherited_source_count": 55,
        "inherited_claim_count": 82,
        "decision": "EXACT_SOURCE_BYTES_AND_CLAIM_WINDOWS_REPLAYED_REVIEWED_INTERPRETATION_PINNED_CAPABILITY_UNOBSERVED",
        "authority_effect": "NONE",
    }


def replay_bound(
    bundle: Path,
    section71_bundle: Path,
    section72_bundle: Path,
    section73_bundle: Path,
    *,
    action_id: str,
    challenge_hex: str,
    not_before: int | None = None,
) -> dict[str, Any]:
    """Perform the full replay inside one compile-pinned invocation context."""
    expected_challenge = {
        "CURRENT_SECTION_7_4_REPLAY": bytes(range(64, 96)).hex(),
        "FINAL_CONSUMER_REPLAY": bytes(range(96, 128)).hex(),
    }.get(action_id)
    if expected_challenge is None or challenge_hex != expected_challenge:
        raise ContractValidationError("source replay action or challenge mismatch")
    if not_before is not None:
        if type(not_before) is not int:
            raise ContractValidationError("source replay not-before time malformed")
        while int(time.time()) <= not_before:
            time.sleep(0.01)
    issued_at = int(time.time())
    retrieval_started_at = int(time.time())
    base_result = replay(
        bundle, section71_bundle, section72_bundle, section73_bundle
    )
    retrieval_finished_at = int(time.time())
    observed_at = int(time.time())
    invocation_body = {
        "base_result": base_result,
        "action_id": action_id,
        "challenge_hex": challenge_hex,
        "issued_at": issued_at,
        "retrieval_started_at": retrieval_started_at,
        "retrieval_finished_at": retrieval_finished_at,
        "observed_at": observed_at,
        "expires_at": issued_at + 300,
    }
    invocation_id = domain_hash(
        "FLUENCYTRACR:GCP_SOURCE_REPLAY_INVOCATION:V1", invocation_body
    )
    receipt_body = {
        **base_result,
        "action_id": action_id,
        "challenge_hex": challenge_hex,
        "issued_at": issued_at,
        "retrieval_started_at": retrieval_started_at,
        "retrieval_finished_at": retrieval_finished_at,
        "observed_at": observed_at,
        "expires_at": issued_at + 300,
        "invocation_id": invocation_id,
        "producer_identity_hash": _REPLAY_PRODUCER_ID,
    }
    return {
        **receipt_body,
        "producer_mac": hmac.new(
            _REPLAY_RECEIPT_KEY,
            canonical_json_bytes(receipt_body),
            hashlib.sha256,
        ).hexdigest(),
    }


def verify_replay_receipt(receipt: dict[str, Any], *, consume: bool) -> None:
    if not isinstance(receipt, dict) or "producer_mac" not in receipt:
        raise ContractValidationError("replay receipt producer evidence missing")
    body = dict(receipt)
    observed_mac = body.pop("producer_mac")
    if body.get("producer_identity_hash") != _REPLAY_PRODUCER_ID:
        raise ContractValidationError("replay receipt producer identity mismatch")
    expected_mac = hmac.new(
        _REPLAY_RECEIPT_KEY,
        canonical_json_bytes(body),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(observed_mac, expected_mac):
        raise ContractValidationError("replay receipt producer MAC mismatch")
    now = int(time.time())
    if not receipt["issued_at"] <= now < receipt["expires_at"]:
        raise ContractValidationError("replay receipt is not current")
    invocation_id = receipt["invocation_id"]
    if consume:
        if invocation_id in _CONSUMED_REPLAY_INVOCATIONS:
            raise ContractValidationError("replay receipt already consumed")
        _CONSUMED_REPLAY_INVOCATIONS.add(invocation_id)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("bundle", type=Path)
    parser.add_argument("--section71-bundle", type=Path, default=DEFAULT_SECTION71_BUNDLE)
    parser.add_argument("--section72-bundle", type=Path, default=DEFAULT_SECTION72_BUNDLE)
    parser.add_argument("--section73-bundle", type=Path, default=DEFAULT_SECTION73_BUNDLE)
    args = parser.parse_args()
    try:
        result = replay(
            args.bundle.expanduser(),
            args.section71_bundle.expanduser(),
            args.section72_bundle.expanduser(),
            args.section73_bundle.expanduser(),
        )
    except (OSError, zipfile.BadZipFile, ContractValidationError, ValueError):
        print("GCP_ATTESTATION_RECEIPT_SOURCE_REVALIDATION_FAILED", file=sys.stderr)
        return 1
    print(
        "GCP_ATTESTATION_RECEIPT_SOURCE_BYTES_AND_CLAIM_WINDOWS_REPLAYED_"
        "REVIEWED_INTERPRETATION_PINNED_CAPABILITY_UNOBSERVED_RUNTIME_AUTHORITY_HELD"
    )
    print(
        f"sources={result['source_count']} claims={result['claim_count']} "
        f"inherited_sources={result['inherited_source_count']} "
        f"inherited_claims={result['inherited_claim_count']} "
        f"bundle_sha256={result['source_bundle_sha256']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
