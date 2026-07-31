from __future__ import annotations

import base64
import copy
import hashlib
import importlib.util
import json
import os
import subprocess
import sys
import zipfile
from pathlib import Path
from typing import Any

import pytest

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / "docs/contracts/canonical-inference-gcp-attestation-receipt"
CONTRACT = DIR / "attestation-receipt-contract.json"
SOURCES = DIR / "provider-source-evidence.json"
REVALIDATION = DIR / "provider-revalidation.json"
VECTORS = DIR / "canonicalization-vectors.json"
README = DIR / "README.md"
VALIDATION = ROOT / "scripts/gcp_attestation_receipt_contract_validation.py"
CONTRACT_VERIFIER = ROOT / "scripts/verify_gcp_attestation_receipt_contract.py"
SOURCE_VERIFIER = ROOT / "scripts/verify_gcp_attestation_receipt_revalidation.py"
DESIGN = ROOT / "openspec/changes/add-gcp-attestation-receipt-contract/design.md"
SPEC = ROOT / "openspec/changes/add-gcp-attestation-receipt-contract/specs/gcp-attestation-receipt/spec.md"
BUNDLE = Path(
    os.environ.get(
        "GCP_ATTESTATION_RECEIPT_SOURCE_BUNDLE",
        "~/.glean/recovery/fluencytracr/"
        "gcp-attestation-receipt-source-snapshot-20260726T072745Z.zip",
    )
).expanduser()

sys.path.insert(0, str(ROOT / "scripts"))
from gcp_attestation_receipt_contract_validation import (  # noqa: E402
    CONTRACT_DIR,
    ContractValidationError,
    EXPECTED_APPROVAL_REGISTRIES,
    EXPECTED_LIVE_OUTCOMES,
    EXPECTED_REPLAY_KINDS,
    EXPECTED_TERMINAL_SELECTORS,
    P256_G,
    P256_ORDER,
    SYNTHETIC_RESULT_CONTRACT_HASH,
    ValidatedEvidenceFacts,
    _expected_synthetic_opaque_record,
    _p256_multiply,
    build_envelope_graph,
    candidate_component_root_hash,
    canonical_json_bytes,
    challenge_wire_value,
    crc32c,
    derive_live_disposition,
    derive_wire_nonce,
    digest,
    expected_runtime_instance_projection,
    expected_synthetic_challenge_context_hash,
    expected_synthetic_initial_retention_acceptance,
    expected_synthetic_trust_snapshot_hash,
    expected_synthetic_object_store,
    expected_synthetic_replay_member_bytes,
    domain_hash,
    launcher_tdx_report_data,
    load_json,
    normalize_p256_low_s_der,
    parse_strict_p256_der,
    replay_manifest_hash,
    source_replay_result_hash,
    strict_load_json_bytes,
    synthetic_oidc_submods,
    validate_contract,
    validate_current_artifacts,
    validate_expected_actual_context,
    validate_kms_evidence,
    validate_nonce_lineage,
    validate_oidc_token,
    validate_opaque_acceptances,
    validate_quote_evidence,
    validate_replay_chain,
    validate_replay_manifest,
    validate_source_evidence,
    validate_synthetic_cross_bindings,
    validate_tcb_cutoff,
    validate_terminal_coherence,
    validate_terminal_payload,
    validate_timeline,
    validate_vectors,
    validate_verifier_identity,
)

_source_spec = importlib.util.spec_from_file_location(
    "section74_source_verifier", SOURCE_VERIFIER
)
assert _source_spec and _source_spec.loader
_source_module = importlib.util.module_from_spec(_source_spec)
_source_spec.loader.exec_module(_source_module)


def _sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


RSA_N = int("b2370eb14c95aeb2e726c851fb9ab0c2ad95185cb6f9d4d84ae02ea13ab973a789af47c8e725e740512f9de18c7a23b6fbb38fb575d71f91f1bb7194dc094fd3ca784dcd191ca604a7e055aa8e88b23f5c2a709cdc4f9e754d21c13f4dfe5575ad555ea8178079c2037211b25f9fa3561aa3b089b008b83c5f9a088d2541a41d21f75dae078aea26c283f952eaaa08a44946421672d5e7b5172e9bd91bf0cacdf7148f84ec18bbb35dc568c9164c7b956d4ea9b65bc93826d0b70503d7f0f18a91c4d4c5dd27e40a507036965495719499228247c7d992ff0adbb8f7bb9e759a955991e90a77cfd86e1e31352ef79408161f0dfe65f062b486764fa2ae30b413", 16)
RSA_E = 65537
RSA_D = int("56c31b321218e53e4feebfa3ba1c6b65bbe05445ff06ce2aa6f9517a48feb461a254655c57bc4a4333c33cd7ebee22a9190d282fadb917b393be2fe3cae3f5ab246d4163529071fade48072ccbcb9d0bdfb101b63c43bedf58b7d03f239768bfabad5e31f38f26b7dfb98f080a29cbf9456adfad88b81609be795d246a38f4ce31a37c4870e9e8d042851be43cc14aa2ec4a0cac5e045c532fe2bd269b60658956ae20ad5ec6fba6547a7c3fc658699e4ec4d66fb58ea0da8417123a7e545191a8742f0be03aedc27b78ed9b70a1cc3ddbc5114a24488dc4d1b574b30e7dcc14cc1fc102a594fc70faac2dd466d16e98db7b6ce06212297acdcf008ff5e6c941", 16)


def _b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _h(seed: str) -> str:
    return hashlib.sha256(seed.encode("utf-8")).hexdigest()


def _source_replay_base_result() -> dict[str, Any]:
    return {
        "source_count": 29,
        "claim_count": 42,
        "source_bundle_sha256": "6f7ea9cb42afba261f859a257d879a088ed0ab473756a1994ba941be13b3204a",
        "inherited_source_count": 55,
        "inherited_claim_count": 82,
        "decision": "EXACT_SOURCE_BYTES_AND_CLAIM_WINDOWS_REPLAYED_REVIEWED_INTERPRETATION_PINNED_CAPABILITY_UNOBSERVED",
        "replay_mode": "EXACT_ARCHIVE_REPLAY",
        "authority_effect": "NONE",
    }


def _synthetic_source_replay_receipt(action_id: str) -> dict[str, Any]:
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
    }[action_id]
    body = {
        "base_result": _source_replay_base_result(),
        "action_id": action_id,
        **context,
    }
    return {
        **_source_replay_base_result(),
        "action_id": action_id,
        **context,
        "invocation_id": domain_hash(
            "FLUENCYTRACR:GCP_SOURCE_REPLAY_INVOCATION:V1", body
        ),
        "producer_identity_hash": _h("synthetic-replay-producer"),
        "producer_mac": _h("synthetic-replay-producer-mac-" + action_id),
    }


def _context(seed: str = "a") -> dict[str, str]:
    keys = [
        "tenant", "numerical_body", "runtime_profile", "runtime_instance",
        "source_manifest",
        "image_manifest", "model", "execution_plan", "signer_generation",
        "signer_policy", "trust_policy", "result_contract",
    ]
    return {key: _h(seed + key) for key in keys}


def _timeline() -> dict[str, int]:
    return {
        "challenge_issued_at": 100,
        "pre_token_iat": 100,
        "pre_token_verified_at": 110,
        "pre_quote_request_sent_at": 120,
        "pre_quote_response_received_at": 130,
        "pre_quote_verified_at": 140,
        "execution_started_at": 150,
        "result_or_failure_committed_at": 200,
        "execution_ended_at": 200,
        "terminal_observation_accepted_at": 210,
        "terminal_quote_request_sent_at": 220,
        "terminal_quote_response_received_at": 230,
        "terminal_quote_verified_at": 240,
        "sign_requested_at": 250,
        "sign_sent_at": 260,
        "sign_response_verified_at": 270,
        "challenge_expires_at": 400,
    }


def _replay(
    variant: str, candidate_components: dict[str, Any]
) -> list[dict[str, Any]]:
    contract = load_json(CONTRACT)
    candidate_components["authoritative_terminal_variant"] = variant
    expected_bytes = expected_synthetic_replay_member_bytes(
        candidate_components, contract
    )
    entries: list[dict[str, Any]] = []
    for schema in contract["replay_manifest_contract"]["member_schema_registry"]:
        ordinal = schema["ordinal"]
        if ordinal == 40 and variant == "COMPLETED_EXECUTION":
            entries.append({
                "ordinal": ordinal,
                "kind_id": schema["kind_id"],
                "presence": "PROHIBITED_ABSENT",
            })
            continue
        members = []
        for schema_member in schema["members"]:
            key = (ordinal, schema_member["member_path"])
            if key in expected_bytes:
                raw = expected_bytes[key]
            elif ordinal == 28:
                raw = (
                    ROOT
                    / "docs/contracts/canonical-inference-gcp-security-authority"
                    / Path(schema_member["member_path"]).name
                ).read_bytes()
            elif ordinal == 30:
                raw = SOURCES.read_bytes()
            elif ordinal == 33:
                raw = REVALIDATION.read_bytes()
            elif ordinal == 39:
                raw = (
                    ROOT
                    / schema_member["member_path"].removeprefix("inherited/")
                ).read_bytes()
            else:
                raise AssertionError("missing synthetic replay member bytes")
            members.append({
                "member_path": schema_member["member_path"],
                "raw_content_sha256": _sha(raw),
                "raw_content_hex": raw.hex(),
                "byte_length": len(raw),
                "media_type": schema_member["media_type"],
            })
        bundle_hash = domain_hash(
            "FLUENCYTRACR:GCP_SYNTHETIC_REPLAY_BUNDLE:V1",
            {"kind_id": schema["kind_id"], "member_manifest": members},
        )
        entries.append({
            "ordinal": ordinal,
            "kind_id": schema["kind_id"],
            "presence": "PRESENT",
            "bundle_sha256": bundle_hash,
            "byte_length": sum(item["byte_length"] for item in members),
            "restricted_reference": "restricted://synthetic/" + schema["kind_id"],
            "member_manifest": members,
        })
    return entries

def _identity(seed: str) -> dict[str, str]:
    return {
        "binary_hash": _h(seed + "-binary"),
        "policy_hash": _h(seed + "-policy"),
        "procedure_hash": _h(seed + "-procedure"),
    }


def _oidc_evidence(
    eat_nonce: list[str],
    *,
    audience: str = "urn:fluencytracr:canonical-inference:gcp-attestation-verifier:v1",
    hwmodel: str = "GCP_INTEL_TDX",
    oemid: int | bool = 11129,
    submods: dict[str, Any] | None = None,
    swversion: list[str] | None = None,
) -> dict[str, Any]:
    header = {"alg": "RS256", "kid": "synthetic-key-1", "typ": "JWT"}
    payload = {
        "iss": "https://confidentialcomputing.googleapis.com",
        "aud": audience,
        "iat": 100,
        "nbf": 100,
        "exp": 399,
        "eat_nonce": eat_nonce,
        "attester_tcb": ["INTEL"],
        "google_service_accounts": [],
        "sub": "synthetic-subject",
        "submods": submods if submods is not None else synthetic_oidc_submods(),
        "tdx": [{
            "gcp_attester_tcb_status": "UpToDate",
            "gcp_attester_tcb_date": "2026-07-25T00:00:00Z",
        }],
        "swname": "CONFIDENTIAL_SPACE",
        "swversion": swversion if swversion is not None else ["202607##"],
        "secboot": True,
        "dbgstat": "disabled-since-boot",
        "hwmodel": hwmodel,
        "oemid": oemid,
    }
    header_part = _b64u(canonical_json_bytes(header))
    payload_part = _b64u(canonical_json_bytes(payload))
    signing_input = (header_part + "." + payload_part).encode("ascii")
    digest_info = bytes.fromhex("3031300d060960864801650304020105000420") + hashlib.sha256(signing_input).digest()
    size = (RSA_N.bit_length() + 7) // 8
    encoded = b"\x00\x01" + b"\xff" * (size - len(digest_info) - 3) + b"\x00" + digest_info
    signature = pow(int.from_bytes(encoded, "big"), RSA_D, RSA_N).to_bytes(size, "big")
    jwk_n = _b64u(RSA_N.to_bytes(size, "big"))
    jwk_e = _b64u(RSA_E.to_bytes(3, "big"))
    jwk_sha256 = _sha(
        canonical_json_bytes({"kid": "synthetic-key-1", "n": jwk_n, "e": jwk_e})
    )
    return {
        "compact_jws": header_part + "." + payload_part + "." + _b64u(signature),
        "jwk_kid": "synthetic-key-1",
        "jwk_n": jwk_n,
        "jwk_e": jwk_e,
        "approved_jwk_sha256": jwk_sha256,
        "trust_snapshot_hash": expected_synthetic_trust_snapshot_hash(
            kid="synthetic-key-1", jwk_n=jwk_n, jwk_e=jwk_e
        ),
        "expected_eat_nonce": eat_nonce,
        "verification_time": 110,
    }


def _quote_evidence(
    pre_report_data: str | None = None,
    terminal_report_data: str | None = None,
) -> dict[str, Any]:
    binary = _h("quote-verifier-binary")
    policy = _h("quote-verifier-policy")
    common = {
        "pck_chain_sha256": _h("pck"),
        "mrtd_sha256": _h("mrtd"),
        "rtmr_map_sha256": _h("rtmr"),
        "attestation_key_identity_hash": _h("attestation-key"),
        "platform_identity_hash": _h("platform"),
        "verifier_binary_hash": binary,
        "verifier_policy_hash": policy,
        "trusted_roots_mode": "EXPLICIT_PINNED",
        "collateral_checked": True,
        "crl_checked": True,
        "tcb_checked": True,
        "event_log_replayed": True,
        "tcb_status": "UP_TO_DATE",
        "outcome": "PASS",
    }
    pre_raw = b"synthetic-pre-quote-bytes"
    terminal_raw = b"synthetic-terminal-quote-bytes"
    pre = {
        **common,
        "phase": "PRE",
        "raw_quote_sha256": _sha(pre_raw),
        "raw_quote_hex": pre_raw.hex(),
        "expected_report_data_hex": pre_report_data or hashlib.sha512(b"pre-report").hexdigest(),
        "observed_report_data_hex": pre_report_data or hashlib.sha512(b"pre-report").hexdigest(),
        "collateral_sha256": _h("pre-collateral"),
        "crl_sha256": _h("pre-crl"),
        "ccel_sha256": _h("pre-ccel"),
        "cel_sha256": _h("pre-cel"),
    }
    terminal = {
        **common,
        "phase": "TERMINAL",
        "raw_quote_sha256": _sha(terminal_raw),
        "raw_quote_hex": terminal_raw.hex(),
        "expected_report_data_hex": terminal_report_data or hashlib.sha512(b"terminal-report").hexdigest(),
        "observed_report_data_hex": terminal_report_data or hashlib.sha512(b"terminal-report").hexdigest(),
        "collateral_sha256": _h("terminal-collateral"),
        "crl_sha256": _h("terminal-crl"),
        "ccel_sha256": _h("terminal-ccel"),
        "cel_sha256": _h("terminal-cel"),
    }
    return {
        "expected_verifier_binary_hash": binary,
        "expected_verifier_policy_hash": policy,
        "pre": pre,
        "terminal": terminal,
    }


def _kms_evidence(statement_digest_hex: str | None = None) -> dict[str, Any]:
    digest_bytes = (
        bytes.fromhex(statement_digest_hex)
        if statement_digest_hex is not None
        else hashlib.sha256(b"statement").digest()
    )
    z = int.from_bytes(digest_bytes, "big")
    nonce = 2
    point = _p256_multiply(nonce, P256_G)
    assert point is not None
    r = point[0] % P256_ORDER
    s = (pow(nonce, -1, P256_ORDER) * (z + r)) % P256_ORDER
    raw = _der(r, s)
    canonical = normalize_p256_low_s_der(raw)
    return {
        "algorithm": "EC_SIGN_P256_SHA256",
        "version_id": "1",
        "statement_digest_hex": digest_bytes.hex(),
        "request_digest_hex": digest_bytes.hex(),
        "digest_crc32c": crc32c(digest_bytes),
        "requested_name": "projects/synthetic/locations/global/keyRings/runtime/cryptoKeys/receipt/cryptoKeyVersions/1",
        "response_name": "projects/synthetic/locations/global/keyRings/runtime/cryptoKeys/receipt/cryptoKeyVersions/1",
        "verified_digest_crc32c": True,
        "protection_level": "HSM",
        "raw_signature_der_hex": raw.hex(),
        "canonical_signature_der_hex": canonical.hex(),
        "signature_crc32c": crc32c(raw),
        "public_key_x_hex": f"{P256_G[0]:064x}",
        "public_key_y_hex": f"{P256_G[1]:064x}",
    }


def _opaque_acceptances(
    targets: dict[str, str] | None = None,
) -> dict[str, dict[str, Any]]:
    names = {
        "trust_distribution", "pre_quote_transport", "terminal_quote_transport",
        "kms_transport", "channel_enforcement", "audit_mapping",
        "pre_execution_attempt", "terminal_proof",
    }
    output = {}
    for name in names:
        target = targets[name] if targets is not None else _h(name + "-target")
        output[name] = _expected_synthetic_opaque_record(name, target)
    return output


def _model_plan_projection() -> dict[str, str]:
    numerical_raw = canonical_json_bytes({"model_id": "synthetic-model", "plan_id": "synthetic-plan"})
    model_raw = canonical_json_bytes({"family": "bayesian", "version": "synthetic-v1"})
    plan_raw = canonical_json_bytes({"backend": "canonical", "steps": 1})
    model_hash = domain_hash(
        "FLUENCYTRACR:CANONICAL_INFERENCE_MODEL:V1",
        strict_load_json_bytes(model_raw),
    )
    plan_hash = domain_hash(
        "FLUENCYTRACR:CANONICAL_INFERENCE_EXECUTION_PLAN:V1",
        strict_load_json_bytes(plan_raw),
    )
    model_plan_hash = domain_hash(
        "FLUENCYTRACR:CANONICAL_INFERENCE_MODEL_PLAN:V1",
        {"model_hash": model_hash, "execution_plan_hash": plan_hash},
    )
    return {
        "numerical_body_hex": numerical_raw.hex(),
        "model_definition_hex": model_raw.hex(),
        "execution_plan_hex": plan_raw.hex(),
        "numerical_body_hash": _sha(numerical_raw),
        "model_hash": model_hash,
        "execution_plan_hash": plan_hash,
        "model_plan_sha256": model_plan_hash,
        "runtime_profile_model_plan_sha256": model_plan_hash,
    }


def _parent_contract_hash(suffix: str) -> str:
    contract = load_json(CONTRACT)
    return next(
        item["raw_file_sha256"]
        for item in contract["dependency_contract"]["inherited_manifest"][
            "dependency_artifacts"
        ]
        if item["repository_path"].endswith(suffix)
    )


def _runtime_profile(projection: dict[str, str]) -> dict[str, str]:
    body = {
        "schema_version": "SECTION_7_4_RUNTIME_PROFILE_PROJECTION_V1",
        "parent_section_7_2_contract_sha256": _parent_contract_hash(
            "canonical-inference-gcp-runtime-object/runtime-object-contract.json"
        ),
        "model_plan_sha256": projection["model_plan_sha256"],
    }
    return {
        **body,
        "profile_hash": domain_hash(
            "FLUENCYTRACR:GCP_SECTION_7_4_RUNTIME_PROFILE_PROJECTION:V1", body
        ),
    }


def _signer_context() -> dict[str, str]:
    spki_der = bytes.fromhex(
        "3059301306072a8648ce3d020106082a8648ce3d03010703420004"
        + f"{P256_G[0]:064x}"
        + f"{P256_G[1]:064x}"
    )
    body = {
        "parent_section_7_3_contract_sha256": _parent_contract_hash(
            "canonical-inference-gcp-security-authority/security-authority-contract.json"
        ),
        "key_purpose_id": "RUNTIME_RECEIPT_SIGNING_KEY",
        "generation_alias": "receipt-generation-1",
        "version_id": "1",
        "spki_der_hex": spki_der.hex(),
        "spki_der_sha256": _sha(spki_der),
        "exact_crypto_key_version_name": "projects/synthetic/locations/global/keyRings/runtime/cryptoKeys/receipt/cryptoKeyVersions/1",
        "public_key_x_hex": f"{P256_G[0]:064x}",
        "public_key_y_hex": f"{P256_G[1]:064x}",
    }
    signer_hash = domain_hash(
        "FLUENCYTRACR:GCP_SECTION_7_4_SIGNER_KEY_PROJECTION:V1", body
    )
    signer_policy = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_SIGNER_POLICY:V1",
        {"signer_context_hash": signer_hash, "algorithm": "EC_SIGN_P256_SHA256"},
    )
    return {**body, "signer_context_hash": signer_hash, "signer_policy_hash": signer_policy}


def _terminal_payload(
    variant: str, context: dict[str, str] | None = None
) -> dict[str, Any]:
    context = dict(context or _context())
    context["result_contract"] = SYNTHETIC_RESULT_CONTRACT_HASH
    if variant == "COMPLETED_EXECUTION":
        result_bytes = canonical_json_bytes({"posterior": "synthetic", "value": 1})
        result = _sha(result_bytes)
        return {
            "variant": variant,
            "semantic_result_hash": result,
            "result_contract_hash": context["result_contract"],
            "presented_bytes_sha256": result,
            "presented_bytes_hex": result_bytes.hex(),
            "byte_length": len(result_bytes),
        }
    failure_body = {
        "schema_version": "GCP_OPERATIONAL_FAILURE_BODY_V1",
        "closed_failure_phase": "INFERENCE_EXECUTION",
        "closed_error_class": "NUMERICAL_RUNTIME_FAILURE",
        "failure_committed_at": 200,
        "partial_result_posture": "DISCARDED_NOT_HASHED_NOT_RETAINED",
    }
    failure_bytes = canonical_json_bytes(failure_body)
    failure = domain_hash(
        "FLUENCYTRACR:GCP_OPERATIONAL_FAILURE_BODY:V1", failure_body
    )
    return {
        "variant": variant,
        "failure_body_hash": failure,
        "presented_failure_body_hash": failure,
        "presented_failure_body_hex": failure_bytes.hex(),
        "result_contract_hash": context["result_contract"],
        "failure_phase": "INFERENCE_EXECUTION",
        "error_class": "NUMERICAL_RUNTIME_FAILURE",
        "failure_committed_at": 200,
        "partial_result_posture": "DISCARDED_NOT_HASHED_NOT_RETAINED",
        "semantic_result_presence": "EXPLICITLY_ABSENT",
    }


def _evidence_trace() -> dict[str, Any]:
    return {
        "schema_version": "GCP_ATTESTATION_RECEIPT_EVIDENCE_TRACE_V1",
        "parent_boundary_and_privacy_clear": True,
        "inherited_provider_conflict": False,
        "section_7_4_provider_conflict": False,
        "local_structure_and_encoding_valid": True,
        "source_and_trust_review_complete_current": True,
        "context_and_terminal_variant_valid": True,
        "cryptographic_and_integrity_checks_passed": True,
        "runtime_capability_observed": True,
        "evidence_complete_current_correlated": True,
        "condition_trace_hash": _h("condition-trace"),
        "decision_verifier_binary_hash": _h("decision-verifier"),
    }


def _candidate(variant: str = "COMPLETED_EXECUTION") -> dict[str, Any]:
    contract = load_json(CONTRACT)
    challenge = bytes(range(32))
    tls_exporter = bytes(range(32, 64))
    wire = challenge_wire_value(challenge)
    channel = derive_wire_nonce("FLUENCYTRACR:GCP_CHANNEL_NONCE:V1", tls_exporter)
    projection = _model_plan_projection()
    runtime_profile = _runtime_profile(projection)
    runtime_instance = expected_runtime_instance_projection(contract)
    signer_context = _signer_context()
    expected_context = _context()
    expected_context["numerical_body"] = projection["numerical_body_hash"]
    expected_context["model"] = projection["model_hash"]
    expected_context["execution_plan"] = projection["execution_plan_hash"]
    expected_context["runtime_profile"] = runtime_profile["profile_hash"]
    expected_context["runtime_instance"] = runtime_instance[
        "runtime_instance_observation_hash"
    ]
    expected_context["signer_generation"] = signer_context["signer_context_hash"]
    expected_context["signer_policy"] = signer_context["signer_policy_hash"]
    expected_context["result_contract"] = SYNTHETIC_RESULT_CONTRACT_HASH
    context_hash = expected_synthetic_challenge_context_hash(
        challenge=challenge,
        tls_exporter=tls_exporter,
        expected_context=expected_context,
        model_plan_projection=projection,
        signer_key_projection=signer_context,
    )
    context_nonce = derive_wire_nonce(
        "FLUENCYTRACR:GCP_CONTEXT_NONCE:V1", context_hash
    )
    eat_nonce = [wire, channel, context_nonce]
    actual_context = dict(expected_context)
    payload = _terminal_payload(variant, expected_context)
    quote = _quote_evidence()
    expected_context_hash = _sha(canonical_json_bytes(expected_context))
    actual_context_hash = _sha(canonical_json_bytes(actual_context))
    terminal_payload_hash = _sha(canonical_json_bytes(payload))
    timeline_hash = _sha(canonical_json_bytes(_timeline()))
    eat_nonce_hash = _sha(canonical_json_bytes(eat_nonce))
    oidc = _oidc_evidence(eat_nonce)
    oidc_evidence_hash = _sha(canonical_json_bytes(oidc))
    model_projection_hash = _sha(canonical_json_bytes(projection))
    pre_binding = hashlib.sha512(
        b"FLUENCYTRACR:GCP_SYNTHETIC_PRE_QUOTE_BINDING:V1\x00"
        + canonical_json_bytes({
            "expected_context_hash": expected_context_hash,
            "eat_nonce_hash": eat_nonce_hash,
            "pre_execution_target_hash": expected_context_hash,
        })
    ).digest()
    terminal_binding = hashlib.sha512(
        b"FLUENCYTRACR:GCP_SYNTHETIC_TERMINAL_QUOTE_BINDING:V1\x00"
        + canonical_json_bytes({
            "pre_quote_hash": quote["pre"]["raw_quote_sha256"],
            "terminal_payload_hash": terminal_payload_hash,
            "terminal_proof_target_hash": terminal_payload_hash,
            "timeline_hash": timeline_hash,
        })
    ).digest()
    quote = _quote_evidence(
        launcher_tdx_report_data(pre_binding).hex(),
        launcher_tdx_report_data(terminal_binding).hex(),
    )
    quote_evidence_hash = _sha(canonical_json_bytes(quote))
    statement_hash = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_SIGNATURE_STATEMENT:V1",
        {
            "terminal_payload_hash": terminal_payload_hash,
            "terminal_quote_hash": quote["terminal"]["raw_quote_sha256"],
            "expected_context_hash": expected_context_hash,
            "signer_context_hash": signer_context["signer_context_hash"],
            "timeline_hash": timeline_hash,
        },
    )
    kms = _kms_evidence(statement_hash)
    kms_evidence_hash = _sha(canonical_json_bytes(kms))
    opaque_targets = {
        "trust_distribution": oidc_evidence_hash,
        "pre_quote_transport": quote["pre"]["raw_quote_sha256"],
        "terminal_quote_transport": quote["terminal"]["raw_quote_sha256"],
        "kms_transport": statement_hash,
        "channel_enforcement": domain_hash(
            "FLUENCYTRACR:GCP_SYNTHETIC_CHANNEL_ENFORCEMENT_TARGET:V1",
            {"quote_evidence_hash": quote_evidence_hash, "kms_evidence_hash": kms_evidence_hash},
        ),
        "audit_mapping": kms_evidence_hash,
        "pre_execution_attempt": expected_context_hash,
        "terminal_proof": terminal_payload_hash,
    }
    opaque = _opaque_acceptances(opaque_targets)
    current = _identity("current")
    final = _identity("final")
    replay_components = {
        "expected_context": expected_context,
        "actual_context": actual_context,
        "model_plan_projection": projection,
        "runtime_profile_projection": runtime_profile,
        "runtime_instance_projection": runtime_instance,
        "signer_key_projection": signer_context,
        "terminal_payload": payload,
        "oidc_evidence": oidc,
        "quote_evidence": quote,
        "kms_evidence": kms,
        "opaque_acceptances": opaque,
        "timeline": _timeline(),
    }
    replay = _replay(variant, replay_components)
    manifest_hash = replay_manifest_hash(replay)
    initial_retention_acceptance = expected_synthetic_initial_retention_acceptance(
        challenge.hex(), manifest_hash
    )
    component_candidate = {
        "eat_nonce": eat_nonce,
        "timeline": _timeline(),
        "expected_context": expected_context,
        "actual_context": actual_context,
        "model_plan_projection": projection,
        "runtime_profile_projection": runtime_profile,
        "runtime_instance_projection": runtime_instance,
        "signer_key_projection": signer_context,
        "terminal_payload": payload,
        "oidc_evidence": oidc,
        "quote_evidence": quote,
        "kms_evidence": kms,
        "opaque_acceptances": opaque,
        "replay_manifest": replay,
        "initial_retention_acceptance": initial_retention_acceptance,
        "current_replay_expected_verifier": current,
        "current_replay_manifest_verifier": current,
        "current_replay_actual_verifier": current,
        "final_replay_expected_verifier": final,
        "final_replay_manifest_verifier": final,
        "final_replay_actual_verifier": final,
    }
    component_root = candidate_component_root_hash(component_candidate)
    cross_base = {
        "candidate_component_root_hash": component_root,
        "expected_context_hash": expected_context_hash,
        "actual_context_hash": actual_context_hash,
        "model_plan_projection_hash": model_projection_hash,
        "eat_nonce_hash": eat_nonce_hash,
        "oidc_evidence_hash": oidc_evidence_hash,
        "terminal_payload_hash": terminal_payload_hash,
        "timeline_hash": timeline_hash,
        "quote_evidence_hash": quote_evidence_hash,
        "kms_evidence_hash": kms_evidence_hash,
        "pre_quote_binding_sha512": pre_binding.hex(),
        "terminal_quote_binding_sha512": terminal_binding.hex(),
        "signature_statement_hash": statement_hash,
        "opaque_target_set_hash": _sha(canonical_json_bytes(opaque_targets)),
        "opaque_acceptance_set_hash": _sha(canonical_json_bytes(opaque)),
        "runtime_profile_projection_hash": _sha(canonical_json_bytes(runtime_profile)),
        "runtime_instance_projection_hash": _sha(canonical_json_bytes(runtime_instance)),
        "signer_key_projection_hash": _sha(canonical_json_bytes(signer_context)),
        "replay_manifest_hash": manifest_hash,
        "initial_retention_acceptance_hash": initial_retention_acceptance["acceptance_hash"],
    }
    graph_hash = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_CANDIDATE_GRAPH:V1", cross_base
    )
    cross_bindings = {**cross_base, "candidate_graph_hash": graph_hash}
    current_challenge_hex = bytes(range(64, 96)).hex()
    final_challenge_hex = bytes(range(96, 128)).hex()
    current_issued_at, current_verified_at, current_expires_at = 1000, 1100, 1300
    final_issued_at, final_verified_at, final_expires_at = 2000, 2100, 2300
    current_retention_guaranteed_until = current_verified_at + 31536000
    final_retention_guaranteed_until = final_verified_at + 31536000
    provider_revalidation_bytes = bytes.fromhex(
        replay[33]["member_manifest"][0]["raw_content_hex"]
    )
    provider_revalidation_sha256 = _sha(provider_revalidation_bytes)
    # Synthetic fixture receipts only. The candidate CLI discards their chain
    # hashes and rebuilds from receipts produced inside replay_bound.
    current_source_receipt = _synthetic_source_replay_receipt(
        "CURRENT_SECTION_7_4_REPLAY"
    )
    final_source_receipt = _synthetic_source_replay_receipt(
        "FINAL_CONSUMER_REPLAY"
    )
    current_trusted_source_replay_hash = source_replay_result_hash(
        current_source_receipt
    )
    final_trusted_source_replay_hash = source_replay_result_hash(
        final_source_receipt
    )
    current_source_revalidation_hash = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_CURRENT_SOURCE_REVALIDATION:V1",
        {
            "action_id": "CURRENT_SECTION_7_4_REPLAY",
            "challenge_hex": current_challenge_hex,
            "provider_revalidation_artifact_sha256": provider_revalidation_sha256,
            "source_replay_result_hash": current_trusted_source_replay_hash,
        },
    )
    final_source_revalidation_hash = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_FINAL_SOURCE_REVALIDATION:V1",
        {
            "action_id": "FINAL_CONSUMER_REPLAY",
            "challenge_hex": final_challenge_hex,
            "provider_revalidation_artifact_sha256": provider_revalidation_sha256,
            "source_replay_result_hash": final_trusted_source_replay_hash,
        },
    )
    current_authentication = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_CURRENT_RETENTION_AUTHENTICATION:V1",
        {
            "action_id": "CURRENT_SECTION_7_4_REPLAY",
            "challenge_hex": current_challenge_hex,
            "execution_manifest_hash": manifest_hash,
            "initial_retention_acceptance_hash": initial_retention_acceptance["acceptance_hash"],
            "current_source_revalidation_hash": current_source_revalidation_hash,
            "verifier_identity": current,
        },
    )
    current_acceptance = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_CURRENT_RETENTION_ACCEPTANCE:V1",
        {
            "authentication_hash": current_authentication,
            "issued_at": current_issued_at,
            "verified_at": current_verified_at,
            "expires_at": current_expires_at,
            "retention_guaranteed_until": current_retention_guaranteed_until,
        },
    )
    current_result = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_CURRENT_REPLAY_RESULT:V1",
        {
            "retention_acceptance_hash": current_acceptance,
            "execution_manifest_hash": manifest_hash,
            "candidate_graph_hash": graph_hash,
        },
    )
    historical = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_VERIFIED_HISTORICAL_MANIFEST:V1",
        {
            "current_replay_result_hash": current_result,
            "execution_manifest_hash": manifest_hash,
            "candidate_graph_hash": graph_hash,
        },
    )
    final_manifest = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_FINAL_CONSUMER_MANIFEST:V1",
        {
            "verified_historical_manifest_hash": historical,
            "final_source_revalidation_hash": final_source_revalidation_hash,
            "current_verifier_identity": current,
            "final_verifier_identity": final,
        },
    )
    final_authentication = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_FINAL_RETENTION_AUTHENTICATION:V1",
        {
            "action_id": "FINAL_CONSUMER_REPLAY",
            "challenge_hex": final_challenge_hex,
            "final_consumer_manifest_hash": final_manifest,
            "verifier_identity": final,
        },
    )
    final_acceptance = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_FINAL_RETENTION_ACCEPTANCE:V1",
        {
            "authentication_hash": final_authentication,
            "issued_at": final_issued_at,
            "verified_at": final_verified_at,
            "expires_at": final_expires_at,
            "retention_guaranteed_until": final_retention_guaranteed_until,
        },
    )
    final_result = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_FINAL_REPLAY_RESULT:V1",
        {
            "retention_acceptance_hash": final_acceptance,
            "final_consumer_manifest_hash": final_manifest,
            "candidate_graph_hash": graph_hash,
        },
    )
    replay_chain = {
        "current_action_id": "CURRENT_SECTION_7_4_REPLAY",
        "final_action_id": "FINAL_CONSUMER_REPLAY",
        "current_challenge_hex": current_challenge_hex,
        "final_challenge_hex": final_challenge_hex,
        "current_issued_at": current_issued_at,
        "current_verified_at": current_verified_at,
        "current_expires_at": current_expires_at,
        "current_retention_guaranteed_until": current_retention_guaranteed_until,
        "final_issued_at": final_issued_at,
        "final_verified_at": final_verified_at,
        "final_expires_at": final_expires_at,
        "final_retention_guaranteed_until": final_retention_guaranteed_until,
        "execution_manifest_hash": manifest_hash,
        "initial_retention_acceptance_hash": initial_retention_acceptance["acceptance_hash"],
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
    selectors = {key: variant for key in EXPECTED_TERMINAL_SELECTORS}
    return {
        "schema_version": "GCP_ATTESTATION_RECEIPT_SYNTHETIC_CANDIDATE_V1",
        "challenge_hex": challenge.hex(),
        "eat_nonce": eat_nonce,
        "tls_exporter_hex": tls_exporter.hex(),
        "challenge_context_hash": context_hash.hex(),
        "timeline": _timeline(),
        "authoritative_terminal_variant": variant,
        "terminal_selectors": selectors,
        "presented_terminal_variant": variant,
        "expected_context": expected_context,
        "actual_context": actual_context,
        "model_plan_projection": projection,
        "runtime_profile_projection": runtime_profile,
        "runtime_instance_projection": runtime_instance,
        "signer_key_projection": signer_context,
        "terminal_payload": payload,
        "oidc_evidence": oidc,
        "quote_evidence": quote,
        "kms_evidence": kms,
        "opaque_acceptances": opaque,
        "replay_manifest": replay,
        "initial_retention_acceptance": initial_retention_acceptance,
        "current_replay_expected_verifier": current,
        "current_replay_manifest_verifier": current,
        "current_replay_actual_verifier": current,
        "final_replay_expected_verifier": final,
        "final_replay_manifest_verifier": final,
        "final_replay_actual_verifier": final,
        "cross_bindings": cross_bindings,
        "replay_chain": replay_chain,
        "authority_effect": "NONE",
    }

def _der_int(value: int) -> bytes:
    raw = value.to_bytes((value.bit_length() + 7) // 8 or 1, "big")
    if raw[0] & 0x80:
        raw = b"\x00" + raw
    return b"\x02" + bytes([len(raw)]) + raw


def _der(r: int, s: int) -> bytes:
    body = _der_int(r) + _der_int(s)
    return b"\x30" + bytes([len(body)]) + body


def test_current_contract_and_source_bundle_verify() -> None:
    result = subprocess.run(
        [sys.executable, str(CONTRACT_VERIFIER)],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == (
        "GCP_ATTESTATION_RECEIPT_CONTRACT_CLOSED_EVIDENCE_ABSENT_"
        "RUNTIME_AUTHORITY_HELD"
    )
    if not BUNDLE.is_file():
        pytest.skip("restricted public-source recovery bundle unavailable")
    source = subprocess.run(
        [sys.executable, str(SOURCE_VERIFIER), str(BUNDLE)],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    assert source.returncode == 0, source.stderr
    assert "REVIEWED_INTERPRETATION_PINNED_CAPABILITY_UNOBSERVED_RUNTIME_AUTHORITY_HELD" in source.stdout
    assert "sources=29 claims=42 inherited_sources=55 inherited_claims=82" in source.stdout


def test_default_deny_nested_types_unknown_fields_and_empty_hashes() -> None:
    context = _context()
    malformed_context = dict(context)
    malformed_context["tenant"] = True
    with pytest.raises(ContractValidationError, match="type"):
        validate_expected_actual_context(context, malformed_context)  # type: ignore[arg-type]
    empty_identity = {"binary_hash": "", "policy_hash": "", "procedure_hash": ""}
    with pytest.raises(ContractValidationError, match="type"):
        validate_verifier_identity(empty_identity, empty_identity, empty_identity)
    replay = copy.deepcopy(_candidate()["replay_manifest"])
    replay[0]["unexpected"] = "RUNTIME_APPROVED"
    with pytest.raises(ContractValidationError, match="keys"):
        validate_replay_manifest(replay, "COMPLETED_EXECUTION")
    candidate = _candidate()
    candidate["challenge_hex"] = 7
    assert not isinstance(candidate["challenge_hex"], str)


def test_contract_graph_registries_and_ownership_are_exact() -> None:
    artifacts = validate_current_artifacts()
    contract = artifacts["contract"]
    assert contract["hash_node_registry"]["entry_count"] == 116
    assert contract["selector_registry"]["entry_count"] == 9
    assert contract["composition_contract"]["entry_count"] == 64
    assert contract["replay_manifest_contract"]["kind_count"] == 42
    assert [x["kind_id"] for x in contract["replay_manifest_contract"]["kinds"]] == EXPECTED_REPLAY_KINDS
    assert contract["terminal_coherence_contract"]["selector_ids"] == EXPECTED_TERMINAL_SELECTORS
    assert set(contract["approval_registries"]) == EXPECTED_APPROVAL_REGISTRIES
    assert all(value == [] for value in contract["approval_registries"].values())
    assert not any(contract["non_authorization"].values())
    node_ids = {x["node_id"] for x in contract["hash_node_registry"]["entries"]}
    assert "section_7_6_terminal_proof_acceptance_hash" in node_ids
    assert "section_7_6_terminal_proof_hash" not in node_ids
    assert "section_7_6_attempt_ledger_hash" not in node_ids
    assert "section_7_5_transport_record_hash" not in node_ids


def test_section_7_5_external_approval_interface_is_typed_bound_and_held(
    tmp_path: Path,
) -> None:
    """Section 7.4 admits only typed future approval evidence, never live state."""
    contract = load_json(CONTRACT)
    vectors = load_json(VECTORS)
    interface = contract["section_7_5_external_approval_interface"]

    acceptance_nodes = [
        "trust_distribution_acceptance_hash",
        "channel_enforcement_acceptance_hash",
        "pre_quote_transport_acceptance_hash",
        "terminal_quote_transport_acceptance_hash",
        "kms_sign_transport_acceptance_hash",
        "audit_mapping_acceptance_hash",
        "initial_section_7_4_replay_retention_acceptance_hash",
        "current_section_7_4_replay_retention_acceptance_hash",
        "final_consumer_replay_retention_acceptance_hash",
    ]
    assert set(interface) == {
        "acceptance_node_conjunction_schema",
        "authority_effect",
        "external_approval_policy_verifier_record_schema",
        "full_section_7_5_target_schema",
        "held_reason",
        "live_external_approval_policy_verifier_records",
        "live_trust_distribution_approval_records",
        "parent_approval_obligations",
        "p14_trust_distribution_approval_schema",
        "schema_version",
        "trust_lineage_evidence_schema",
    }
    assert interface["schema_version"] == "GCP_SECTION_7_5_EXTERNAL_APPROVAL_INTERFACE_V1"
    assert interface["authority_effect"] == "NONE"
    assert interface["held_reason"] == "FULL_SECTION_7_5_EXTERNAL_APPROVAL_AND_LIVE_EVIDENCE_REQUIRED"
    assert interface["live_external_approval_policy_verifier_records"] == []
    assert interface["live_trust_distribution_approval_records"] == []
    assert interface["parent_approval_obligations"] == [
        "S75A-P03",
        "S75A-P05_SECTION_7_4_PARENT_VERIFICATION_TIME",
        "S75A-P07_SECTION_7_4_PARENT_VERIFICATION_TIME",
        "S75A-P14",
        "S75A-P19_SECTION_7_4_APPROVAL_ONLY",
    ]

    target_schema = interface["full_section_7_5_target_schema"]
    assert target_schema["contract_kind"] == "FULL_SECTION_7_5"
    assert target_schema["section_7_5a_substitution"] == "REJECT"
    assert target_schema["candidate_bytes_required_before_hash_admission"] is True

    approval_schema = interface["external_approval_policy_verifier_record_schema"]
    assert approval_schema["external_authentication_required"] is True
    assert approval_schema["owner"] == "SECTION_7_4"
    assert approval_schema["target_binding_field"] == "target_binding_sha256"
    assert approval_schema["current_head_field"] == "approved_current_head_sha256"
    assert approval_schema["record_mechanics_owner"] == "FULL_SECTION_7_5"

    lineage_schema = interface["trust_lineage_evidence_schema"]
    assert lineage_schema["owner"] == "SECTION_7_4"
    assert lineage_schema["record_mechanics_owner"] == "FULL_SECTION_7_5"
    assert lineage_schema["required_predicates"] == [
        "AUTHENTICATED_CURRENT_HEAD",
        "STRICT_MONOTONIC_PREDECESSOR_LINEAGE",
        "SHARED_LINEARIZABLE_CHECK_AND_USE",
        "INDEPENDENT_NONROLLBACKABLE_EXTERNAL_ANCHOR",
        "STALE_READER_REJECTION",
        "WHOLE_STATE_RESTORE_DETECTION",
        "FAIL_CLOSED_BEFORE_COMMIT_RECOVERY",
        "FAIL_CLOSED_AFTER_COMMIT_RECOVERY",
    ]
    assert interface["p14_trust_distribution_approval_schema"] == {
        "approval_record_schema": "GCP_SECTION_7_5_TRUST_DISTRIBUTION_APPROVAL_V1",
        "approval_required": True,
        "authority_effect": "NONE",
        "owner": "SECTION_7_4",
        "required_acceptance_node_id": "trust_distribution_acceptance_hash",
        "required_lineage_predicates": lineage_schema["required_predicates"],
        "section_7_5a_substitution": "REJECT",
    }

    conjunction = interface["acceptance_node_conjunction_schema"]
    assert conjunction["acceptance_node_ids"] == acceptance_nodes
    assert conjunction["required_conjunct_fields"] == [
        "target_binding_sha256",
        "external_approval_policy_verifier_record_sha256",
        "trust_lineage_evidence_record_sha256",
        "acceptance_node_evidence_sha256",
        "acceptance_node_conjunction_sha256",
    ]
    assert conjunction["all_nodes_required"] is True
    assert conjunction["record_mechanics_owner"] == "FULL_SECTION_7_5"

    spec = importlib.util.spec_from_file_location("gcp74_contract_verifier", CONTRACT_VERIFIER)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.path.insert(0, str(ROOT / "scripts"))
    try:
        spec.loader.exec_module(module)
    finally:
        sys.path.pop(0)
    module.verify_section_7_5_external_approval_interface()

    mutated_contract = copy.deepcopy(contract)
    mutated_contract["section_7_5_external_approval_interface"][
        "p14_trust_distribution_approval_schema"
    ]["required_acceptance_node_id"] = "audit_mapping_acceptance_hash"
    mutated_contract_path = tmp_path / "attestation-receipt-contract.json"
    mutated_contract_path.write_text(json.dumps(mutated_contract), encoding="utf-8")
    with pytest.raises(ValueError, match="P14 trust-distribution approval schema mismatch"):
        module.verify_section_7_5_external_approval_interface(
            mutated_contract_path, VECTORS
        )

    target_bytes = canonical_json_bytes(
        {
            "canonical_contract_body_sha256": "a" * 64,
            "contract_domain_separator": target_schema["domain_separator"],
            "contract_kind": target_schema["contract_kind"],
            "schema_version": target_schema["contract_schema_version"],
        }
    )
    target_record = {
        "schema_version": target_schema["schema_version"],
        "contract_kind": target_schema["contract_kind"],
        "contract_domain_separator": target_schema["domain_separator"],
        "canonical_contract_bytes_base64": base64.b64encode(target_bytes).decode("ascii"),
        "canonical_contract_bytes_sha256": _sha(target_bytes),
    }
    target_record["target_binding_sha256"] = _sha(
        target_schema["target_binding_domain_separator"].encode("ascii")
        + b"\x00"
        + canonical_json_bytes(target_record)
    )
    module.validate_full_section_7_5_external_approval_target_record(
        target_record, target_schema
    )

    section_7_5a_substitution = copy.deepcopy(target_record)
    section_7_5a_substitution["contract_kind"] = "SECTION_7_5A"
    section_7_5a_substitution["target_binding_sha256"] = _sha(
        target_schema["target_binding_domain_separator"].encode("ascii")
        + b"\x00"
        + canonical_json_bytes(
            {key: value for key, value in section_7_5a_substitution.items() if key != "target_binding_sha256"}
        )
    )
    with pytest.raises(ValueError, match="full Section 7.5 target kind mismatch"):
        module.validate_full_section_7_5_external_approval_target_record(
            section_7_5a_substitution, target_schema
        )

    assert vectors["section_7_5_external_approval_interface_evidence"] == {
        "live_external_approval_policy_verifier_record_count": 0,
        "live_trust_distribution_approval_record_count": 0,
        "state": "FULL_SECTION_7_5_EXTERNAL_APPROVAL_AND_LIVE_EVIDENCE_REQUIRED",
    }


def test_composition_envelope_and_condition_registry_resealing_reject() -> None:
    contract = load_json(CONTRACT)
    attacked = copy.deepcopy(contract)
    attacked["composition_contract"]["entries"].pop()
    attacked["composition_contract"]["entry_count"] -= 1
    with pytest.raises(ContractValidationError, match="composition"):
        validate_contract(attacked)
    attacked = copy.deepcopy(contract)
    attacked["object_envelope_contract"]["metadata_exclusion_set"].append("ATTACK")
    with pytest.raises(ContractValidationError, match="metadata"):
        validate_contract(attacked)
    attacked = copy.deepcopy(contract)
    attacked["source_trust_condition_registry"][2]["root_cause_key"] = (
        attacked["source_trust_condition_registry"][1]["root_cause_key"]
    )
    with pytest.raises(ContractValidationError, match="condition/root-cause"):
        validate_contract(attacked)


def test_machine_registry_must_match_approved_design_even_when_resealed() -> None:
    contract = load_json(CONTRACT)
    attacked = copy.deepcopy(contract)
    attacked["hash_node_registry"]["entries"][0]["formula"] += " ATTACK"
    attacked["hash_node_registry"]["entries"][0]["formula_sha256"] = _sha(
        attacked["hash_node_registry"]["entries"][0]["formula"].encode()
    )
    with pytest.raises(ContractValidationError, match="normative design"):
        validate_contract(attacked)


@pytest.mark.parametrize(
    "payload",
    [
        b'{"a":null}',
        b'{"a":1.5}',
        b'{"a":NaN}',
        b'{"a":-0}',
        b'{"a":1,"a":1}',
        b'{"a":"e\\u0301"}',
        b'{"a":"\\u0001"}',
        b'{"a":9223372036854775808}',
    ],
)
def test_strict_json_rejects_ambiguous_values(payload: bytes) -> None:
    with pytest.raises(ContractValidationError):
        strict_load_json_bytes(payload)


def test_canonicalization_and_domain_separation_vectors() -> None:
    sample = {"b": ["x", True], "a": 1}
    assert canonical_json_bytes(sample) == b'{"a":1,"b":["x",true]}'
    assert domain_hash("FLUENCYTRACR:TEST:V1", sample) != _sha(
        canonical_json_bytes(sample)
    )
    vectors = load_json(VECTORS)
    validate_vectors(vectors, load_json(CONTRACT))
    assert len(vectors["decision_vectors"]) == 256


def test_revalidation_metadata_and_vector_commitment_resealing_reject() -> None:
    artifacts = validate_current_artifacts()
    revalidation = copy.deepcopy(artifacts["revalidation"])
    revalidation["decision"] = "RUNTIME_APPROVED"
    body = dict(revalidation)
    body.pop("provider_revalidation_hash")
    revalidation["provider_revalidation_hash"] = domain_hash(
        "FLUENCYTRACR:GCP_ATTESTATION_RECEIPT_PROVIDER_REVALIDATION:V1", body
    )
    from gcp_attestation_receipt_contract_validation import validate_revalidation
    with pytest.raises(ContractValidationError, match="decision"):
        validate_revalidation(revalidation, artifacts["source"])
    duplicate = copy.deepcopy(artifacts["revalidation"])
    duplicate["source_revalidation_entries"][-1] = copy.deepcopy(
        duplicate["source_revalidation_entries"][0]
    )
    duplicate["claim_revalidation_entries"][-1] = copy.deepcopy(
        duplicate["claim_revalidation_entries"][0]
    )
    duplicate_body = dict(duplicate)
    duplicate_body.pop("provider_revalidation_hash")
    duplicate["provider_revalidation_hash"] = domain_hash(
        "FLUENCYTRACR:GCP_ATTESTATION_RECEIPT_PROVIDER_REVALIDATION:V1",
        duplicate_body,
    )
    with pytest.raises(ContractValidationError, match="exact set"):
        validate_revalidation(duplicate, artifacts["source"])
    vectors = copy.deepcopy(artifacts["vectors"])
    vectors["graph_summary"]["node_registry_sha256"] = "0" * 64
    with pytest.raises(ContractValidationError, match="node registry"):
        validate_vectors(vectors, artifacts["contract"])


def test_source_registry_resealing_and_omission_reject() -> None:
    source = load_json(SOURCES)
    attacked = copy.deepcopy(source)
    attacked["claims"].pop()
    attacked["claim_registry_sha256"] = _sha(canonical_json_bytes(attacked["claims"]))
    with pytest.raises(ContractValidationError, match="count"):
        validate_source_evidence(attacked)

    attacked = copy.deepcopy(source)
    attacked["applicability_reviews"][0]["disposition"] = "PRESENT_EMPTY_ALIASES_NIL"
    attacked["applicability_registry_sha256"] = _sha(
        canonical_json_bytes(attacked["applicability_reviews"])
    )
    with pytest.raises(ContractValidationError, match="applicability"):
        validate_source_evidence(attacked)


def test_source_bundle_paths_and_git_pins_are_exact() -> None:
    if not BUNDLE.is_file():
        pytest.skip("restricted public-source recovery bundle unavailable")
    result = _source_module.replay(BUNDLE)
    assert result == {
        "source_count": 29,
        "claim_count": 42,
        "source_bundle_sha256": "6f7ea9cb42afba261f859a257d879a088ed0ab473756a1994ba941be13b3204a",
        "inherited_source_count": 55,
        "inherited_claim_count": 82,
        "decision": "EXACT_SOURCE_BYTES_AND_CLAIM_WINDOWS_REPLAYED_REVIEWED_INTERPRETATION_PINNED_CAPABILITY_UNOBSERVED",
        "replay_mode": "EXACT_ARCHIVE_REPLAY",
        "authority_effect": "NONE",
    }
    current_receipt = _source_module.replay_bound(
        BUNDLE,
        _source_module.DEFAULT_SECTION71_BUNDLE,
        _source_module.DEFAULT_SECTION72_BUNDLE,
        _source_module.DEFAULT_SECTION73_BUNDLE,
        action_id="CURRENT_SECTION_7_4_REPLAY",
        challenge_hex=bytes(range(64, 96)).hex(),
    )
    final_receipt = _source_module.replay_bound(
        BUNDLE,
        _source_module.DEFAULT_SECTION71_BUNDLE,
        _source_module.DEFAULT_SECTION72_BUNDLE,
        _source_module.DEFAULT_SECTION73_BUNDLE,
        action_id="FINAL_CONSUMER_REPLAY",
        challenge_hex=bytes(range(96, 128)).hex(),
    )
    _source_module.verify_replay_receipt(current_receipt, consume=True)
    _source_module.verify_replay_receipt(final_receipt, consume=True)
    with pytest.raises(ContractValidationError, match="already consumed"):
        _source_module.verify_replay_receipt(current_receipt, consume=True)
    assert source_replay_result_hash(current_receipt) != source_replay_result_hash(
        final_receipt
    )
    assert current_receipt["retrieval_started_at"] <= current_receipt[
        "retrieval_finished_at"
    ] <= current_receipt["observed_at"]
    with pytest.raises(ContractValidationError):
        _source_module.replay_bound(
            BUNDLE,
            _source_module.DEFAULT_SECTION71_BUNDLE,
            _source_module.DEFAULT_SECTION72_BUNDLE,
            _source_module.DEFAULT_SECTION73_BUNDLE,
            action_id="CURRENT_SECTION_7_4_REPLAY",
            challenge_hex="0" * 64,
        )
    with pytest.raises(ContractValidationError):
        _source_module._safe_member("../escape")
    source = load_json(SOURCES)
    git_sources = [x for x in source["sources"] if x["source_type"] == "IMMUTABLE_GIT_BLOB"]
    assert len(git_sources) == 18
    assert all(len(x["commit"]) == 40 for x in git_sources)
    reviews = {x["review_id"]: x for x in source["applicability_reviews"]}
    assert reviews["NIL_EXTRA_DATA_SELECTED_ENDPOINT"]["disposition"] == (
        "PROVEN_NIL_EXECUTABLE_PATH_GENERIC_PROTO_NON_APPLICABLE"
    )
    assert reviews["EVIDENCE_ENDPOINT_CAPABILITY"]["capability_effect"] == "LIVE_R7_HOLD"
    assert reviews["BC_OIDC_DIRECT_QUOTE_COMPOSITION"]["capability_effect"] == (
        "HOLD_SELECTED_IMAGE_MODE_UNPROVEN"
    )
    assert reviews["CCEL_TABLE_BOUNDARY"]["capability_effect"] == (        "HOLD_UNTIL_LATER_INTERFACE_APPROVED"
    )


def test_nonce_ranges_order_duplicates_and_report_data() -> None:
    challenge = bytes(range(32))
    wire = challenge_wire_value(challenge)
    tls_exporter = bytes(range(32, 64))
    context_hash = hashlib.sha256(b"context").digest()
    n2 = derive_wire_nonce("FLUENCYTRACR:GCP_CHANNEL_NONCE:V1", tls_exporter)
    n3 = derive_wire_nonce("FLUENCYTRACR:GCP_CONTEXT_NONCE:V1", context_hash)
    validate_nonce_lineage(
        challenge,
        [wire, n2, n3],
        tls_exporter=tls_exporter,
        challenge_context_hash=context_hash,
    )
    for bad in ([wire, n2], [n2, wire, n3], [wire, n2, n2], [wire + "=", n2, n3]):
        with pytest.raises(ContractValidationError):
            validate_nonce_lineage(
                challenge,
                list(bad),
                tls_exporter=tls_exporter,
                challenge_context_hash=context_hash,
            )
    with pytest.raises(ContractValidationError):
        challenge_wire_value(b"x" * 31)
    quote_binding = hashlib.sha512(b"binding").digest()
    expected = hashlib.sha512(
        b"WORKLOAD_ATTESTATION" + hashlib.sha512(quote_binding).digest()
    ).digest()
    assert launcher_tdx_report_data(quote_binding) == expected
    present_empty = hashlib.sha512(
        b"WORKLOAD_ATTESTATION"
        + hashlib.sha512(quote_binding + hashlib.sha512(b"").digest()).digest()
    ).digest()
    assert launcher_tdx_report_data(quote_binding) != present_empty


def test_timeline_terminal_observation_and_expiry_boundaries() -> None:
    valid = _timeline()
    validate_timeline(valid)
    late_observation = dict(valid)
    late_observation["terminal_observation_accepted_at"] = 225
    with pytest.raises(ContractValidationError, match="order"):
        validate_timeline(late_observation)
    expired = dict(valid)
    expired["sign_response_verified_at"] = 400
    with pytest.raises(ContractValidationError, match="expiry"):
        validate_timeline(expired)
    wrong_lifetime = dict(valid)
    wrong_lifetime["challenge_expires_at"] = 401
    with pytest.raises(ContractValidationError, match="lifetime"):
        validate_timeline(wrong_lifetime)


def test_terminal_selector_and_presented_payload_cross_splices_reject() -> None:
    for variant, opposite in [
        ("COMPLETED_EXECUTION", "OPERATIONAL_FAILURE"),
        ("OPERATIONAL_FAILURE", "COMPLETED_EXECUTION"),
    ]:
        selectors = {key: variant for key in EXPECTED_TERMINAL_SELECTORS}
        validate_terminal_coherence(variant, selectors, variant)
        with pytest.raises(ContractValidationError, match="presented"):
            validate_terminal_coherence(variant, selectors, opposite)
        attacked = dict(selectors)
        attacked[EXPECTED_TERMINAL_SELECTORS[2]] = opposite
        with pytest.raises(ContractValidationError, match="selector"):
            validate_terminal_coherence(variant, attacked, variant)


def test_expected_actual_model_plan_signer_and_result_contract_substitution_reject() -> None:
    expected = _context()
    validate_expected_actual_context(expected, dict(expected))
    for field in expected:
        actual = dict(expected)
        actual[field] += "-substituted"
        with pytest.raises(ContractValidationError, match="context"):
            validate_expected_actual_context(expected, actual)
    contract_text = CONTRACT.read_text()
    assert "runtime_profile_model_plan_sha256" in contract_text
    assert "NUMERICAL_BODY_MODEL_PLAN_DEFINITION_BUNDLE" in contract_text
    assert "result_contract_exact_match: true" in contract_text


def test_replay_manifest_variant_gates_and_required_model_plan_bytes() -> None:
    for variant in ["COMPLETED_EXECUTION", "OPERATIONAL_FAILURE"]:
        replay = copy.deepcopy(_candidate(variant)["replay_manifest"])
        validate_replay_manifest(replay, variant)
        missing = copy.deepcopy(replay)
        missing.pop(10)
        with pytest.raises(ContractValidationError):
            validate_replay_manifest(missing, variant)
        wrong_kind = copy.deepcopy(replay)
        wrong_kind[3]["kind_id"] = "UNKNOWN"
        with pytest.raises(ContractValidationError, match="kind"):
            validate_replay_manifest(wrong_kind, variant)
        no_model_plan = copy.deepcopy(replay)
        no_model_plan[41]["presence"] = "ABSENT"
        with pytest.raises(ContractValidationError):
            validate_replay_manifest(no_model_plan, variant)
    completed = copy.deepcopy(_candidate()["replay_manifest"])
    completed[40]["presence"] = "PRESENT"
    with pytest.raises(ContractValidationError, match="failure bundle"):
        validate_replay_manifest(completed, "COMPLETED_EXECUTION")


def test_replay_verifier_binary_policy_and_procedure_substitution_reject() -> None:
    expected = _identity("approved")
    validate_verifier_identity(expected, dict(expected), dict(expected))
    for stage in ("manifest", "actual"):
        for field in expected:
            manifest = dict(expected)
            actual = dict(expected)
            (manifest if stage == "manifest" else actual)[field] += "-attack"
            with pytest.raises(ContractValidationError, match="identity"):
                validate_verifier_identity(expected, manifest, actual)
    design = DESIGN.read_text()
    assert "CURRENT_SECTION_7_4_REPLAY" in design
    assert "FINAL_CONSUMER_REPLAY" in design
    assert "final_replay_verifier_identity_verification_hash" in design
    assert "current_replay_verifier_identity_verification_hash" in design


def test_noncanonical_hex_and_boolean_ordinal_aliases_reject() -> None:
    candidate = _candidate()
    replay = copy.deepcopy(candidate["replay_manifest"])
    replay[0]["ordinal"] = False
    with pytest.raises(ContractValidationError):
        validate_replay_manifest(replay, "COMPLETED_EXECUTION")
    replay = copy.deepcopy(candidate["replay_manifest"])
    replay[0]["member_manifest"][0]["raw_content_hex"] = (
        replay[0]["member_manifest"][0]["raw_content_hex"] + " "
    )
    with pytest.raises(ContractValidationError):
        validate_replay_manifest(replay, "COMPLETED_EXECUTION")
    projection = copy.deepcopy(candidate["model_plan_projection"])
    projection["model_definition_hex"] = projection["model_definition_hex"].upper()
    with pytest.raises(ContractValidationError):
        from gcp_attestation_receipt_contract_validation import validate_model_plan_projection
        validate_model_plan_projection(projection, candidate["expected_context"])
    kms = copy.deepcopy(candidate["kms_evidence"])
    kms["raw_signature_der_hex"] = kms["raw_signature_der_hex"][:2] + " " + kms["raw_signature_der_hex"][2:]
    with pytest.raises(ContractValidationError):
        validate_kms_evidence(kms)


def test_tcb_cutoff_before_equal_after_is_total() -> None:
    assert validate_tcb_cutoff(100, None) == "NO_ADVERSE_STATE"
    assert validate_tcb_cutoff(100, 99) == "REJECT_ADVERSE_AT_OR_BEFORE_SIGNING"
    assert validate_tcb_cutoff(100, 100) == "REJECT_ADVERSE_AT_OR_BEFORE_SIGNING"
    assert validate_tcb_cutoff(100, 101) == "ADVERSE_AFTER_SIGNING"


def test_strict_der_and_low_s_normalization() -> None:
    high = _der(1, P256_ORDER - 1)
    assert parse_strict_p256_der(high) == (1, P256_ORDER - 1)
    normalized = normalize_p256_low_s_der(high)
    assert parse_strict_p256_der(normalized) == (1, 1)
    assert normalize_p256_low_s_der(normalized) == normalized
    malformed = [
        b"",
        b"\x31\x00",
        high + b"\x00",
        b"\x30\x06\x02\x01\x00\x02\x01\x01",
        b"\x30\x07\x02\x02\x00\x01\x02\x01\x01",
        b"\x30\x06\x02\x01\x80\x02\x01\x01",
        b"\x30\x06\x02\x01\x01\x02\x01\x00",
    ]
    for value in malformed:
        with pytest.raises(ContractValidationError):
            parse_strict_p256_der(value)


def test_crc32c_reference_vector() -> None:
    assert crc32c(b"123456789") == 0xE3069283


def _facts(**overrides: bool) -> ValidatedEvidenceFacts:
    values = {
        "parent_boundary_and_privacy_clear": True,
        "inherited_provider_conflict": False,
        "section_7_4_provider_conflict": False,
        "local_structure_and_encoding_valid": True,
        "source_and_trust_review_complete_current": True,
        "context_and_terminal_variant_valid": True,
        "cryptographic_and_integrity_checks_passed": True,
        "runtime_capability_observed": True,
        "evidence_complete_current_correlated": True,
    }
    values.update(overrides)
    return ValidatedEvidenceFacts(**values)


def test_live_decision_totality_precedence_and_empty_approval_hold() -> None:
    contract = load_json(CONTRACT)
    assert derive_live_disposition(contract=contract) == (
        "REJECT_FOR_PRIVACY_OR_BOUNDARY_LEAKAGE"
    )
    assert derive_live_disposition(contract=contract, facts=_facts()) == (
        "HOLD_FOR_ATTESTATION_VERIFIER_UNCLOSED"
    )
    cases = [
        ({"parent_boundary_and_privacy_clear": False}, "REJECT_FOR_PRIVACY_OR_BOUNDARY_LEAKAGE"),
        ({"inherited_provider_conflict": True}, "REJECT_C3_TDX_FOR_PROVIDER_CONFLICT"),
        ({"section_7_4_provider_conflict": True}, "REJECT_SECTION_7_4_FOR_SOURCE_CONFLICT"),
        ({"local_structure_and_encoding_valid": False}, "REJECT_FOR_MALFORMED_OR_AMBIGUOUS_ENCODING"),
        ({"source_and_trust_review_complete_current": False}, "HOLD_FOR_PROVIDER_SOURCE_OR_TRUST_MATERIAL_UNAVAILABLE_OR_DRIFT"),
        ({"context_and_terminal_variant_valid": False}, "REJECT_FOR_WRONG_CONTEXT_OR_TERMINAL_VARIANT"),
        ({"cryptographic_and_integrity_checks_passed": False}, "REJECT_FOR_SIGNATURE_OR_INTEGRITY_MISMATCH"),
        ({"runtime_capability_observed": False}, "HOLD_FOR_ATTESTATION_VERIFIER_UNCLOSED"),
    ]
    for overrides, expected in cases:
        assert derive_live_disposition(contract=contract, facts=_facts(**overrides)) == expected
    assert derive_live_disposition(
        contract=contract,
        facts=_facts(inherited_provider_conflict=True, section_7_4_provider_conflict=True),
    ) == "REJECT_C3_TDX_FOR_PROVIDER_CONFLICT"
    mutated_contract = copy.deepcopy(contract)
    mutated_contract["approval_registries"]["consumer_verifier"] = [_h("forged-approval")]
    with pytest.raises(ContractValidationError, match="approval"):
        derive_live_disposition(contract=mutated_contract, facts=_facts())
    with pytest.raises(ContractValidationError, match="caller predicate"):
        derive_live_disposition(contract=contract, caller_payload={"R1": False})
    with pytest.raises(ContractValidationError, match="type"):
        ValidatedEvidenceFacts(
            parent_boundary_and_privacy_clear=1,  # type: ignore[arg-type]
            inherited_provider_conflict=False,
            section_7_4_provider_conflict=False,
            local_structure_and_encoding_valid=True,
            source_and_trust_review_complete_current=True,
            context_and_terminal_variant_valid=True,
            cryptographic_and_integrity_checks_passed=True,
            runtime_capability_observed=False,
            evidence_complete_current_correlated=True,
        )


def test_nonverified_disposition_blocks_retry_and_verified_manifest_fabrication() -> None:
    design = DESIGN.read_text()
    spec = SPEC.read_text()
    assert 'downstream_retry_posture: "BLOCKED_SECTION_7_6_OWNS_DECISION"' in design
    assert 'replay_posture: "NO_VERIFIED_CRYPTOGRAPHIC_REPLAY_MANIFEST"' in design
    assert "no Section 7.4 outcome grants retry" in spec
    assert "nonverified_section_7_4_evidence_record_hash" in design


def test_quote_verifier_phase_identity_and_platform_continuity_are_explicit() -> None:
    design = DESIGN.read_text()
    for needle in [
        "pre_quote_verifier_binary_exact_match: true",
        "terminal_quote_verifier_binary_exact_match: true",
        "pre_raw_tdx_quote_sha256",
        "terminal_raw_tdx_quote_sha256",
        "attestation_key_identity_exact_match: true",
        "platform_identity_exact_match: true",
        "pck_chain_identity_exact_match: true",
        "mrtd_exact_match: true, rtmr_map_exact_match: true",
    ]:
        assert needle in design


def test_oidc_rs256_issuer_audience_nonce_and_freshness_mutations_reject() -> None:
    candidate = _candidate()
    record = candidate["oidc_evidence"]
    outer_nonce = candidate["eat_nonce"]
    validate_oidc_token(record, outer_eat_nonce=outer_nonce)
    coordinated_attacks = [
        _oidc_evidence(outer_nonce, audience="https://sts.googleapis.com"),
        _oidc_evidence(outer_nonce, hwmodel="AMD_SEV_SNP"),
        _oidc_evidence(outer_nonce, oemid=True),
        _oidc_evidence(outer_nonce, oemid=2),
        _oidc_evidence(
            outer_nonce,
            submods={**synthetic_oidc_submods(), "attacker_namespace": {"unknown": True}},
        ),
        _oidc_evidence(outer_nonce, swversion=["000000##"]),
        _oidc_evidence([_b64u(hashlib.sha256(b"a").digest()), _b64u(hashlib.sha256(b"b").digest()), _b64u(hashlib.sha256(b"c").digest())]),
    ]
    for attacked in coordinated_attacks:
        with pytest.raises(ContractValidationError):
            validate_oidc_token(attacked, outer_eat_nonce=outer_nonce)
    attacked = copy.deepcopy(record)
    attacked["verification_time"] = 500
    with pytest.raises(ContractValidationError):
        validate_oidc_token(attacked, outer_eat_nonce=outer_nonce)
    attacked = copy.deepcopy(record)
    attacked["compact_jws"] = attacked["compact_jws"][:-1] + (
        "A" if attacked["compact_jws"][-1] != "A" else "B"
    )
    with pytest.raises(ContractValidationError):
        validate_oidc_token(attacked, outer_eat_nonce=outer_nonce)
    representative_attack = copy.deepcopy(record)
    header_part, payload_part, signature_part = representative_attack[
        "compact_jws"
    ].split(".")
    signature = base64.urlsafe_b64decode(
        signature_part + "=" * ((4 - len(signature_part) % 4) % 4)
    )
    representative = RSA_N
    assert representative < 1 << (8 * len(signature))
    representative_attack["compact_jws"] = (
        header_part
        + "."
        + payload_part
        + "."
        + _b64u(representative.to_bytes(len(signature), "big"))
    )
    with pytest.raises(ContractValidationError, match="representative"):
        validate_oidc_token(representative_attack, outer_eat_nonce=outer_nonce)


def test_quote_evidence_policy_phase_and_continuity_mutations_reject() -> None:
    record = _quote_evidence()
    validate_quote_evidence(record)
    mutations = [
        ("pre", "verifier_binary_hash", _h("substituted-binary")),
        ("terminal", "verifier_policy_hash", _h("substituted-policy")),
        ("pre", "trusted_roots_mode", "EMBEDDED_DEFAULT"),
        ("pre", "collateral_checked", False),
        ("terminal", "crl_checked", False),
        ("terminal", "tcb_status", "OUT_OF_DATE"),
        ("terminal", "observed_report_data_hex", hashlib.sha512(b"wrong").hexdigest()),
        ("terminal", "platform_identity_hash", _h("other-platform")),
        ("terminal", "pck_chain_sha256", _h("other-pck")),
        ("terminal", "mrtd_sha256", _h("other-mrtd")),
        ("terminal", "rtmr_map_sha256", _h("other-rtmr")),
    ]
    for phase, field, value in mutations:
        attacked = copy.deepcopy(record)
        attacked[phase][field] = value
        with pytest.raises(ContractValidationError):
            validate_quote_evidence(attacked)
    reused = copy.deepcopy(record)
    reused["terminal"]["raw_quote_sha256"] = reused["pre"]["raw_quote_sha256"]
    with pytest.raises(ContractValidationError):
        validate_quote_evidence(reused)


def test_kms_evidence_digest_crc_name_hsm_signature_and_low_s_mutations_reject() -> None:
    record = _kms_evidence()
    validate_kms_evidence(record)
    mutations = [
        ("algorithm", "EC_SIGN_P384_SHA384"),
        ("version_id", "2"),
        ("request_digest_hex", _h("double-hash")),
        ("digest_crc32c", 0),
        ("verified_digest_crc32c", False),
        ("response_name", record["requested_name"].replace("/1", "/2")),
        ("protection_level", "SOFTWARE"),
        ("signature_crc32c", 0),
        ("public_key_x_hex", f"{2:064x}"),
        ("canonical_signature_der_hex", record["raw_signature_der_hex"] + "00"),
    ]
    for field, value in mutations:
        attacked = dict(record)
        attacked[field] = value
        with pytest.raises(ContractValidationError):
            validate_kms_evidence(attacked)


def test_opaque_section75_section76_acceptance_splices_reject() -> None:
    records = _opaque_acceptances()
    validate_opaque_acceptances(records)
    attacked = copy.deepcopy(records)
    attacked["terminal_proof"]["record_bound_target_hash"] = _h("other-target")
    with pytest.raises(ContractValidationError):
        validate_opaque_acceptances(attacked)
    attacked = copy.deepcopy(records)
    attacked["pre_quote_transport"]["status"] = "CALLER_ASSERTED"
    with pytest.raises(ContractValidationError):
        validate_opaque_acceptances(attacked)
    attacked = copy.deepcopy(records)
    attacked["section_7_6_attempt_ledger"] = attacked["terminal_proof"]
    with pytest.raises(ContractValidationError, match="set"):
        validate_opaque_acceptances(attacked)


def test_terminal_payload_presented_bytes_and_failure_schema_reject() -> None:
    for variant in ("COMPLETED_EXECUTION", "OPERATIONAL_FAILURE"):
        payload = _terminal_payload(variant)
        validate_terminal_payload(payload, variant)
    completed = _terminal_payload("COMPLETED_EXECUTION")
    completed["presented_bytes_sha256"] = _h("wrong-result")
    with pytest.raises(ContractValidationError, match="semantic"):
        validate_terminal_payload(completed, "COMPLETED_EXECUTION")
    noncanonical = _terminal_payload("COMPLETED_EXECUTION")
    raw = b'{ "posterior": "synthetic", "value": 1 }'
    noncanonical["presented_bytes_hex"] = raw.hex()
    noncanonical["presented_bytes_sha256"] = _sha(raw)
    noncanonical["semantic_result_hash"] = _sha(raw)
    noncanonical["byte_length"] = len(raw)
    with pytest.raises(ContractValidationError, match="contract"):
        validate_terminal_payload(noncanonical, "COMPLETED_EXECUTION")
    failure = _terminal_payload("OPERATIONAL_FAILURE")
    failure["semantic_result_presence"] = "PRESENT"
    with pytest.raises(ContractValidationError, match="semantic"):
        validate_terminal_payload(failure, "OPERATIONAL_FAILURE")
    failure = _terminal_payload("OPERATIONAL_FAILURE")
    failure["failure_phase"] = "UNKNOWN"
    with pytest.raises(ContractValidationError, match="enum"):
        validate_terminal_payload(failure, "OPERATIONAL_FAILURE")


def test_failure_timeline_and_replay_phase_order_cross_bindings_reject() -> None:
    candidate = _candidate("OPERATIONAL_FAILURE")
    candidate["terminal_payload"]["failure_committed_at"] = 199
    body = {
        "schema_version": "GCP_OPERATIONAL_FAILURE_BODY_V1",
        "closed_failure_phase": candidate["terminal_payload"]["failure_phase"],
        "closed_error_class": candidate["terminal_payload"]["error_class"],
        "failure_committed_at": 199,
        "partial_result_posture": candidate["terminal_payload"]["partial_result_posture"],
    }
    raw = canonical_json_bytes(body)
    body_hash = domain_hash("FLUENCYTRACR:GCP_OPERATIONAL_FAILURE_BODY:V1", body)
    candidate["terminal_payload"]["presented_failure_body_hex"] = raw.hex()
    candidate["terminal_payload"]["failure_body_hash"] = body_hash
    candidate["terminal_payload"]["presented_failure_body_hash"] = body_hash
    validate_terminal_payload(candidate["terminal_payload"], "OPERATIONAL_FAILURE")
    with pytest.raises(ContractValidationError):
        validate_synthetic_cross_bindings(candidate)

    baseline = _candidate()
    chain = copy.deepcopy(baseline["replay_chain"])
    chain["final_issued_at"] = 0
    chain["final_verified_at"] = 1
    chain["final_expires_at"] = 300
    chain["final_retention_guaranteed_until"] = 31536001
    with pytest.raises(ContractValidationError):
        validate_replay_chain(
            chain,
            execution_manifest_hash=replay_manifest_hash(baseline["replay_manifest"]),
            candidate_graph_hash=baseline["cross_bindings"]["candidate_graph_hash"],
            initial_retention_acceptance_hash=baseline["initial_retention_acceptance"]["acceptance_hash"],
            provider_revalidation_artifact_sha256=_sha(
                bytes.fromhex(
                    baseline["replay_manifest"][33]["member_manifest"][0]["raw_content_hex"]
                )
            ),
            current_source_replay_receipt=_synthetic_source_replay_receipt(
                "CURRENT_SECTION_7_4_REPLAY"
            ),
            final_source_replay_receipt=_synthetic_source_replay_receipt(
                "FINAL_CONSUMER_REPLAY"
            ),
        )
    with pytest.raises(ContractValidationError):
        validate_replay_chain(
            baseline["replay_chain"],
            execution_manifest_hash=replay_manifest_hash(baseline["replay_manifest"]),
            candidate_graph_hash=baseline["cross_bindings"]["candidate_graph_hash"],
            initial_retention_acceptance_hash=baseline["initial_retention_acceptance"]["acceptance_hash"],
            provider_revalidation_artifact_sha256=_sha(
                bytes.fromhex(
                    baseline["replay_manifest"][33]["member_manifest"][0]["raw_content_hex"]
                )
            ),
            current_source_replay_receipt=_synthetic_source_replay_receipt(
                "CURRENT_SECTION_7_4_REPLAY"
            ),
            final_source_replay_receipt=_synthetic_source_replay_receipt(
                "CURRENT_SECTION_7_4_REPLAY"
            ),
        )


def test_kms_contract_has_one_digest_exact_version_crc_name_hsm_and_der() -> None:
    design = DESIGN.read_text()
    assert 'algorithm: "EC_SIGN_P256_SHA256"' in design
    assert 'version_id: "1"' in design
    assert "digest.sha256: signature_statement_hash" in design
    assert "digest_crc32c" in design
    assert "response_name_exact_match: true" in design
    assert 'protection_level: "HSM"' in design
    assert "strict_raw_der_parse_hash" in design
    assert "raw_to_canonical_mapping_verified: true" in design
    assert "does not establish that the event exposes the signed digest" in design


def _run_candidate_cli(tmp_path: Path, candidate: dict[str, Any]) -> subprocess.CompletedProcess[str]:
    path = tmp_path / "candidate-mutation.json"
    path.write_text(json.dumps(candidate, sort_keys=True))
    return subprocess.run(
        [sys.executable, str(CONTRACT_VERIFIER), "--candidate", str(path)],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )


def test_full_candidate_coordinated_cross_object_splices_reject(tmp_path: Path) -> None:
    baseline = _candidate()
    assert _run_candidate_cli(tmp_path, baseline).returncode == 0
    attacks = []

    attack = copy.deepcopy(baseline)
    attack["challenge_context_hash"] = _h("unrelated-challenge-context")
    attacks.append(attack)

    attack = copy.deepcopy(baseline)
    attack["oidc_evidence"]["trust_snapshot_hash"] = _h("unrelated-trust-snapshot")
    attacks.append(attack)

    attack = copy.deepcopy(baseline)
    attack["oidc_evidence"] = _oidc_evidence(
        baseline["eat_nonce"], audience="https://sts.googleapis.com"
    )
    attacks.append(attack)

    attack = copy.deepcopy(baseline)
    attack["oidc_evidence"] = _oidc_evidence(
        [_b64u(hashlib.sha256(x).digest()) for x in (b"a", b"b", b"c")]
    )
    attacks.append(attack)

    attack = copy.deepcopy(baseline)
    changed_model = _h("coordinated-other-model")
    attack["expected_context"]["model"] = changed_model
    attack["actual_context"]["model"] = changed_model
    attacks.append(attack)

    attack = copy.deepcopy(baseline)
    model_raw = canonical_json_bytes({"family": "other", "version": "v2"})
    model_hash = domain_hash(
        "FLUENCYTRACR:CANONICAL_INFERENCE_MODEL:V1",
        strict_load_json_bytes(model_raw),
    )
    attack["model_plan_projection"]["model_definition_hex"] = model_raw.hex()
    attack["model_plan_projection"]["model_hash"] = model_hash
    attack["expected_context"]["model"] = model_hash
    attack["actual_context"]["model"] = model_hash
    attacks.append(attack)

    attack = copy.deepcopy(baseline)
    attack["expected_context"]["signer_generation"] = _h("other-generation")
    attack["actual_context"]["signer_generation"] = _h("other-generation")
    attacks.append(attack)

    attack = copy.deepcopy(baseline)
    changed_result = _h("coordinated-other-result")
    attack["terminal_payload"]["semantic_result_hash"] = changed_result
    attack["terminal_payload"]["presented_bytes_sha256"] = changed_result
    attacks.append(attack)

    attack = copy.deepcopy(baseline)
    changed_report = hashlib.sha512(b"coordinated-other-report").hexdigest()
    attack["quote_evidence"]["terminal"]["expected_report_data_hex"] = changed_report
    attack["quote_evidence"]["terminal"]["observed_report_data_hex"] = changed_report
    attacks.append(attack)

    attack = copy.deepcopy(baseline)
    attacker_key = "projects/attacker/locations/global/keyRings/r/cryptoKeys/k/cryptoKeyVersions/1"
    attack["kms_evidence"]["requested_name"] = attacker_key
    attack["kms_evidence"]["response_name"] = attacker_key
    attacks.append(attack)

    attack = copy.deepcopy(baseline)
    attack["replay_manifest"][0]["bundle_sha256"] = _h("coordinated-other-bundle")
    attacks.append(attack)

    attack = copy.deepcopy(baseline)
    other_target = _h("coordinated-other-terminal-proof")
    attack["opaque_acceptances"]["terminal_proof"]["target_hash"] = other_target
    attack["opaque_acceptances"]["terminal_proof"]["record_bound_target_hash"] = other_target
    attacks.append(attack)

    attack = copy.deepcopy(baseline)
    attacker_identity = _identity("attacker")
    for key in (
        "current_replay_expected_verifier",
        "current_replay_manifest_verifier",
        "current_replay_actual_verifier",
    ):
        attack[key] = attacker_identity
    attacks.append(attack)

    attack = copy.deepcopy(baseline)
    model_member = attack["replay_manifest"][41]["member_manifest"][1]
    model_member["raw_content_hex"] = b'{"family":"attacker"}'.hex()
    model_member["raw_content_sha256"] = _sha(bytes.fromhex(model_member["raw_content_hex"]))
    model_member["byte_length"] = len(bytes.fromhex(model_member["raw_content_hex"]))
    attack["replay_manifest"][41]["byte_length"] = sum(
        item["byte_length"] for item in attack["replay_manifest"][41]["member_manifest"]
    )
    attack["replay_manifest"][41]["bundle_sha256"] = domain_hash(
        "FLUENCYTRACR:GCP_SYNTHETIC_REPLAY_BUNDLE:V1",
        {
            "kind_id": attack["replay_manifest"][41]["kind_id"],
            "member_manifest": attack["replay_manifest"][41]["member_manifest"],
        },
    )
    attacks.append(attack)

    attack = copy.deepcopy(baseline)
    attack["replay_chain"]["current_challenge_hex"] = bytes(range(1, 33)).hex()
    attacks.append(attack)

    attack = copy.deepcopy(baseline)
    attack["opaque_acceptances"]["terminal_proof"]["authentication_verification_hash"] = _h("other-authentication")
    attacks.append(attack)

    for index, attacked in enumerate(attacks):
        result = _run_candidate_cli(tmp_path, attacked)
        assert result.returncode == 1, f"attack {index} unexpectedly passed"
        assert result.stderr.strip() == (
            "GCP_ATTESTATION_RECEIPT_CONTRACT_VERIFICATION_FAILED"
        )

    malformed_commitment = copy.deepcopy(baseline)
    malformed_commitment["replay_chain"]["final_replay_result_hash"] = _h(
        "candidate-controlled-replay-result"
    )
    assert _run_candidate_cli(tmp_path, malformed_commitment).returncode == 1


def test_object_and_composition_envelopes_bind_actual_candidate_root() -> None:
    completed = _candidate("COMPLETED_EXECUTION")
    failure = _candidate("OPERATIONAL_FAILURE")
    completed_objects, completed_compositions = build_envelope_graph(
        load_json(CONTRACT), completed
    )
    failure_objects, failure_compositions = build_envelope_graph(
        load_json(CONTRACT), failure
    )
    assert completed_objects != failure_objects
    assert completed_compositions != failure_compositions
    assert (
        completed["cross_bindings"]["candidate_component_root_hash"]
        != failure["cross_bindings"]["candidate_component_root_hash"]
    )


def test_candidate_cli_accepts_structure_but_cannot_escape_r7(tmp_path: Path) -> None:
    candidate = _candidate()
    path = tmp_path / "candidate.json"
    path.write_text(json.dumps(candidate, sort_keys=True))
    result = subprocess.run(
        [sys.executable, str(CONTRACT_VERIFIER), "--candidate", str(path)],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    attacked = _candidate()
    attacked["authority_effect"] = "RUNTIME_APPROVED"
    attacked["secret"] = "do-not-reflect-this@example.invalid"
    path.write_text(json.dumps(attacked))
    failed = subprocess.run(
        [sys.executable, str(CONTRACT_VERIFIER), "--candidate", str(path)],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    assert failed.returncode == 1
    assert failed.stderr.strip() == "GCP_ATTESTATION_RECEIPT_CONTRACT_VERIFICATION_FAILED"
    assert "do-not-reflect" not in failed.stderr
    malformed_type = _candidate()
    malformed_type["challenge_hex"] = 7
    path.write_text(json.dumps(malformed_type))
    type_failed = subprocess.run(
        [sys.executable, str(CONTRACT_VERIFIER), "--candidate", str(path)],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    assert type_failed.returncode == 1
    assert type_failed.stderr.strip() == (
        "GCP_ATTESTATION_RECEIPT_CONTRACT_VERIFICATION_FAILED"
    )


def test_candidate_cli_contract_only_mode_is_distinct_and_non_closeout(
    tmp_path: Path,
) -> None:
    candidate_path = tmp_path / "candidate-contract-only.json"
    candidate_path.write_text(json.dumps(_candidate(), sort_keys=True))
    isolated_home = tmp_path / "isolated-home"
    isolated_home.mkdir()
    env = dict(os.environ)
    env["HOME"] = str(isolated_home)
    env["GCP_ATTESTATION_RECEIPT_SOURCE_BUNDLE"] = str(
        isolated_home / "missing.zip"
    )
    result = subprocess.run(
        [sys.executable, str(CONTRACT_VERIFIER), "--candidate", str(candidate_path)],
        cwd=ROOT,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == (
        "GCP_ATTESTATION_RECEIPT_STRUCTURAL_CI_ONLY_"
        "EXTERNAL_ARCHIVES_UNAVAILABLE_RUNTIME_AUTHORITY_HELD"
    )
    malformed_candidates = []
    unknown = _candidate()
    unknown["replay_chain"]["unknown_attacker_field"] = "x"
    malformed_candidates.append(unknown)
    missing = _candidate()
    missing["replay_chain"].pop("final_replay_result_hash")
    malformed_candidates.append(missing)
    wrong_type = _candidate()
    wrong_type["replay_chain"]["current_issued_at"] = "1000"
    malformed_candidates.append(wrong_type)
    wrong_roots = _candidate()
    wrong_roots["replay_chain"]["current_source_revalidation_hash"] = _h(
        "wrong-current-source-root"
    )
    wrong_roots["replay_chain"]["final_source_revalidation_hash"] = _h(
        "wrong-final-source-root"
    )
    malformed_candidates.append(wrong_roots)
    shifted_times = _candidate()
    for prefix in ("current", "final"):
        shifted_times["replay_chain"][f"{prefix}_issued_at"] += 10
        shifted_times["replay_chain"][f"{prefix}_verified_at"] += 10
        shifted_times["replay_chain"][f"{prefix}_expires_at"] += 10
        shifted_times["replay_chain"][
            f"{prefix}_retention_guaranteed_until"
        ] += 10
    malformed_candidates.append(shifted_times)
    wrong_commitments = _candidate()
    for field in (        "execution_manifest_hash",
        "initial_retention_acceptance_hash",
        "current_replay_result_hash",
        "final_replay_result_hash",
    ):
        wrong_commitments["replay_chain"][field] = _h("wrong-" + field)
    malformed_candidates.append(wrong_commitments)
    truncated = _candidate()
    truncated["replay_chain"] = {
        key: truncated["replay_chain"][key]
        for key in (
            "current_action_id",
            "final_action_id",
            "current_challenge_hex",
            "final_challenge_hex",
        )
    }
    malformed_candidates.append(truncated)
    for malformed in malformed_candidates:
        candidate_path.write_text(json.dumps(malformed, sort_keys=True))
        rejected = subprocess.run(
            [sys.executable, str(CONTRACT_VERIFIER), "--candidate", str(candidate_path)],
            cwd=ROOT,
            env=env,
            text=True,
            capture_output=True,
            check=False,
        )
        assert rejected.returncode == 1
        assert rejected.stderr.strip() == (
            "GCP_ATTESTATION_RECEIPT_CONTRACT_VERIFICATION_FAILED"
        )

    candidate_path.write_text(json.dumps(_candidate(), sort_keys=True))
    required = subprocess.run(
        [
            sys.executable,
            str(CONTRACT_VERIFIER),
            "--candidate",
            str(candidate_path),
            "--require-archives",
        ],
        cwd=ROOT,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )
    assert required.returncode == 1
    assert required.stderr.strip() == (
        "GCP_ATTESTATION_RECEIPT_CONTRACT_VERIFICATION_FAILED"
    )
    invalid_combination = subprocess.run(
        [sys.executable, str(CONTRACT_VERIFIER), "--require-archives"],
        cwd=ROOT,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )
    assert invalid_combination.returncode == 1
    assert invalid_combination.stderr.strip() == (
        "GCP_ATTESTATION_RECEIPT_CONTRACT_VERIFICATION_FAILED"
    )


def test_privacy_and_no_public_receipt_projection() -> None:
    contract = load_json(CONTRACT)
    assert contract["privacy"] == {
        "restricted_evidence_only": True,
        "public_receipt_projection": False,
        "raw_identifiers_in_public_artifacts": False,
        "hashes_are_authenticity_or_anonymization": False,
        "canonical_model_plan_bytes_public_projection": False,
    }
    assert "No public receipt projection exists" in DESIGN.read_text()
    assert contract["non_authorization"]["runtime_authority"] is False


def test_all_checked_in_json_is_strict_and_null_free() -> None:
    for path in [CONTRACT, SOURCES, REVALIDATION, VECTORS]:
        loaded = strict_load_json_bytes(path.read_bytes())
        assert loaded is not None
        assert b": null" not in path.read_bytes()


# Filled only after the implementation is final. This intentionally excludes
# this test file to avoid self-reference.
PINNED_ARTIFACTS: dict[str, str] = {
    "docs/contracts/canonical-inference-gcp-attestation-receipt/README.md": "fe23d45a3f7c20b491ec94d2544fe901ca0dd7cb62d382a22f90c23026b06b1f",
    "docs/contracts/canonical-inference-gcp-attestation-receipt/attestation-receipt-contract.json": "a9cddaf665f72d8cbb415fa15c6004663e7a33125fc589ced55a186e27e7cbf2",
    "docs/contracts/canonical-inference-gcp-attestation-receipt/canonicalization-vectors.json": "0399772b61073bc21af481803120a7da165d3e9b06b9c40410ebd6ffafda3766",
    "docs/contracts/canonical-inference-gcp-attestation-receipt/provider-revalidation.json": "ad7dfcfa345274c22952aeaea3fe6aae7c00e9eb4a0a8e63aa2da3c484376ead",
    "docs/contracts/canonical-inference-gcp-attestation-receipt/provider-source-evidence.json": "60355202cccd7157d3a102a30379f3a5e5aa74de0ce43b77a41a2ff87a35dc12",
    "scripts/gcp_attestation_receipt_contract_validation.py": "7f34c48872cb7519f88cec974e50a24041760b183fcd02db5396ceefbaab2b37",
    "scripts/verify_gcp_attestation_receipt_contract.py": "780ac12ecfc216063cf7e107a949aa2892d4ac48d2e70f0a3868974c5966ea8e",
    "scripts/verify_gcp_attestation_receipt_revalidation.py": "d49120a1cece5e3e5d5e0b3ce24248b23de8580b86995859d18d428d199ff5d0",
    "openspec/changes/add-gcp-attestation-receipt-contract/proposal.md": "c7bbb75ed949439301f2259fe541a66a82a943b88800401c9756899fa8cc0c91",
    "openspec/changes/add-gcp-attestation-receipt-contract/design.md": "f2480f8079675a83fda2f3495453fa95cb643d3c85e3b71b35dc109fcab2c290",
    "openspec/changes/add-gcp-attestation-receipt-contract/specs/gcp-attestation-receipt/spec.md": "b652e2451a3d1aa3c3286cb2b4dc71130a5a3797ea9b961604f8dee9bf7cb698",
    "docs/contracts/canonical-inference-gcp-runtime-candidate/README.md": "b2ff9b6654d676afecdd40b9479c219e481f5b102454622d17cf668f03470d57",
    "ATTRIBUTION.md": "a0bc7c212feae50e5ec268240e09fdf6a2985ae04e28377d6ecfcd8c51f9e4a3",
}


def test_normative_artifact_and_verifier_bytes_are_pinned() -> None:
    if not PINNED_ARTIFACTS:
        pytest.skip("final exact-byte pins not populated yet")
    for relative, expected in PINNED_ARTIFACTS.items():
        assert _sha((ROOT / relative).read_bytes()) == expected
