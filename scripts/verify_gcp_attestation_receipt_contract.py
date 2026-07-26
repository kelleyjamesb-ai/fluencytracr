#!/usr/bin/env python3
"""Verify the checked-in GCP Section 7.4 contract and synthetic candidates."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any

from gcp_attestation_receipt_contract_validation import (
    CONTRACT_DIR,
    HEX64,
    ContractValidationError,
    build_envelope_graph,
    candidate_envelope_root_hash,
    derive_live_disposition,
    derive_validated_candidate_facts,
    expected_synthetic_challenge_context_hash,
    digest,
    load_json,
    rebind_replay_chain_source_results,
    replay_manifest_hash,
    validate_current_artifacts,
    validate_expected_actual_context,
    validate_envelope_graph,
    validate_initial_retention_acceptance,
    validate_kms_evidence,
    validate_model_plan_projection,
    validate_nonce_lineage,
    validate_oidc_token,
    validate_opaque_acceptances,
    validate_quote_evidence,
    validate_replay_chain,
    validate_replay_manifest,
    validate_replay_semantic_bindings,
    validate_runtime_profile_and_signer_projection,
    validate_synthetic_cross_bindings,
    validate_terminal_coherence,
    validate_terminal_payload,
    validate_timeline,
    validate_verifier_identity,
)

EXPECTED_ARTIFACT_SHA256 = {
    "README.md": "f006950908a6c29bdc7cdef602415283a1983cb1131948ca65ce8e12b8ff16a3",
    "attestation-receipt-contract.json": "88c58b9a07ab84fffe6a98f6c14561b522a18428e355ee2d8a636fd901d85200",
    "canonicalization-vectors.json": "f8ef43df1f9ffb93d48e99210d91c0e0d710c491b7ff37c1c4831cee8972edda",
    "provider-revalidation.json": "ea2f9aee988612e909a487aba33556ef5fc2414494dbfdbd8c09787f579df654",
    "provider-source-evidence.json": "60355202cccd7157d3a102a30379f3a5e5aa74de0ce43b77a41a2ff87a35dc12",
}
EXPECTED_SOURCE_IDS = ('TOKEN_CLAIMS', 'EXTERNAL_RESOURCES', 'TOKEN_VALIDATION_FIELDS', 'CVM_ATTESTATION', 'KMS_SIGNATURES', 'KMS_ALGORITHMS', 'KMS_ASYMMETRIC_SIGN_REST', 'KMS_GET_PUBLIC_KEY_REST', 'KMS_DATA_INTEGRITY', 'KMS_AUDIT_LOGGING', 'CLOUD_AUDIT_LOGS', 'GO_TPM_TEE_SERVER', 'GO_TPM_TEE_PROTO', 'GO_TPM_AGENT', 'GO_TPM_AGENT_TEST', 'GO_TPM_LAUNCHER_GO_MOD', 'GO_TPM_EXPERIMENTS', 'GO_TPM_BC_EXPERIMENT', 'CS_LABELS', 'CS_ATTESTATION_PROTO', 'TDX_VERIFY', 'TDX_VALIDATE', 'TDX_CCEL', 'TDX_CLIENT_LINUX', 'EVENTLOG_CEL', 'EVENTLOG_RTMR', 'EVENTLOG_CCEL_REPLAY', 'CONFIGFS_REPORT', 'CONFIGFS_LINUXTSM')
EXPECTED_CLAIM_IDS = ('TOKEN_NONCE_RANGE_8_88', 'TOKEN_NONCE_MAX_SIX', 'TOKEN_CUSTOM_AUDIENCE_ECHO', 'CUSTOM_REQUEST_NONCE_RANGE_10_74', 'CUSTOM_REQUEST_NONCE_ECHO_REJECT', 'TLS_EKM_NONCE_BINDING', 'OIDC_DISCOVERY_RS256_JWKS', 'TDX_MRTD_RTMR3', 'TDX_GUEST_REFERENCE', 'KMS_P256_SHA256_ALGORITHM', 'KMS_DER_SIGNATURE', 'KMS_PARSE_PUBLIC_KEY', 'KMS_ASYMMETRIC_SIGN_INTEGRITY_FIELDS', 'KMS_PUBLIC_KEY_PROTECTION_LEVEL', 'KMS_DATA_INTEGRITY_CRC32C', 'KMS_AUDIT_ASYMMETRIC_SIGN', 'DATA_ACCESS_DEFAULT_DISABLED', 'EVIDENCE_ENDPOINT_POST', 'EVIDENCE_ENDPOINT_NIL_EXTRA_DATA', 'EVIDENCE_REQUEST_CHALLENGE_ONLY', 'EVIDENCE_EXPERIMENT_GATE', 'TDX_NESTED_SHA512_NIL_BRANCH', 'EVIDENCE_RETURNS_QUOTE_CCEL_CEL', 'NIL_EXTRA_DATA_TESTED', 'TRANSITIVE_MODULE_PINS', 'TRANSITIVE_EVENTLOG_CONFIGFS_PINS', 'EXPERIMENT_DEFAULT_EMPTY', 'PACKAGED_BC_EXPERIMENT_ENABLED', 'BC_MODE_TOKEN_UNSUPPORTED', 'WORKLOAD_ATTESTATION_LABEL', 'GENERIC_PROTO_REPORT_DATA_FORMULA', 'PROTO_CCEL_CEL_QUOTE_FIELDS', 'TDX_VERIFY_COLLATERAL_OPTIONS', 'TDX_VALIDATE_OMITTED_FIELDS_SKIP', 'TDX_VALIDATE_REPORT_DATA', 'TDX_CCEL_REPLAY', 'TDX_CONFIGFS_64_BYTE_REPORT_DATA', 'EVENTLOG_CEL_TYPED_TLV', 'EVENTLOG_RTMR_INDEX_MAPPING', 'EVENTLOG_CCEL_REPLAY_TRUST_BOUNDARY', 'CONFIGFS_REPORT_IN_OUT_BLOB', 'CONFIGFS_LINUX_REPORT_SUBSYSTEM')


def verify_artifact_pins() -> None:
    if set(EXPECTED_ARTIFACT_SHA256) != {
        "README.md",
        "attestation-receipt-contract.json",
        "canonicalization-vectors.json",
        "provider-revalidation.json",
        "provider-source-evidence.json",
    }:
        raise ContractValidationError("artifact pin keyset mismatch")
    for name, expected in EXPECTED_ARTIFACT_SHA256.items():
        path = CONTRACT_DIR / name
        if not path.is_file() or digest(path.read_bytes()) != expected:
            raise ContractValidationError("normative artifact compile pin mismatch")


def verify_literal_registries(artifacts: dict[str, Any]) -> None:
    source = artifacts["source"]
    if tuple(entry["source_id"] for entry in source["sources"]) != EXPECTED_SOURCE_IDS:
        raise ContractValidationError("source registry literal mismatch")
    if tuple(entry["claim_id"] for entry in source["claims"]) != EXPECTED_CLAIM_IDS:
        raise ContractValidationError("claim registry literal mismatch")
    contract = artifacts["contract"]
    if contract["hash_node_registry"]["entry_count"] != 116:
        raise ContractValidationError("hash node compile-pinned count mismatch")
    if contract["selector_registry"]["entry_count"] != 9:
        raise ContractValidationError("selector compile-pinned count mismatch")
    if contract["composition_contract"]["entry_count"] != 64:
        raise ContractValidationError("composition compile-pinned count mismatch")
    if contract["replay_manifest_contract"]["kind_count"] != 42:
        raise ContractValidationError("replay kind compile-pinned count mismatch")


def _candidate(
    path: Path,
    contract: dict[str, Any],
    source_evidence: dict[str, Any],
    current_source_replay_receipt: dict[str, Any],
    final_source_replay_receipt: dict[str, Any],
) -> str:
    candidate = load_json(path)
    expected_keys = {
        "schema_version",
        "challenge_hex",
        "eat_nonce",
        "tls_exporter_hex",
        "challenge_context_hash",
        "timeline",
        "authoritative_terminal_variant",
        "terminal_selectors",
        "presented_terminal_variant",
        "expected_context",
        "actual_context",
        "model_plan_projection",
        "runtime_profile_projection",
        "runtime_instance_projection",
        "signer_key_projection",
        "terminal_payload",
        "oidc_evidence",
        "quote_evidence",
        "kms_evidence",
        "opaque_acceptances",
        "replay_manifest",
        "initial_retention_acceptance",
        "current_replay_expected_verifier",
        "current_replay_manifest_verifier",
        "current_replay_actual_verifier",
        "final_replay_expected_verifier",
        "final_replay_manifest_verifier",
        "final_replay_actual_verifier",
        "cross_bindings",
        "replay_chain",
        "authority_effect",
    }
    if set(candidate) != expected_keys:
        raise ContractValidationError("candidate keys mismatch")
    if candidate["schema_version"] != "GCP_ATTESTATION_RECEIPT_SYNTHETIC_CANDIDATE_V1":
        raise ContractValidationError("candidate schema mismatch")
    if (
        not isinstance(candidate["challenge_hex"], str)
        or not HEX64.fullmatch(candidate["challenge_hex"])
        or not isinstance(candidate["tls_exporter_hex"], str)
        or not HEX64.fullmatch(candidate["tls_exporter_hex"])
        or not isinstance(candidate["challenge_context_hash"], str)
        or not HEX64.fullmatch(candidate["challenge_context_hash"])
    ):
        raise ContractValidationError("candidate cryptographic encoding type mismatch")
    try:
        challenge = bytes.fromhex(candidate["challenge_hex"])
        tls_exporter = bytes.fromhex(candidate["tls_exporter_hex"])
        challenge_context_hash = bytes.fromhex(candidate["challenge_context_hash"])
    except ValueError as exc:
        raise ContractValidationError("candidate cryptographic encoding malformed") from exc
    expected_challenge_context = expected_synthetic_challenge_context_hash(
        challenge=challenge,
        tls_exporter=tls_exporter,
        expected_context=candidate["expected_context"],
        model_plan_projection=candidate["model_plan_projection"],
        signer_key_projection=candidate["signer_key_projection"],
    )
    if challenge_context_hash != expected_challenge_context:
        raise ContractValidationError("candidate challenge context mismatch")
    validate_nonce_lineage(
        challenge,
        candidate["eat_nonce"],
        tls_exporter=tls_exporter,
        challenge_context_hash=challenge_context_hash,
    )
    validate_timeline(candidate["timeline"])
    validate_terminal_coherence(
        candidate["authoritative_terminal_variant"],
        candidate["terminal_selectors"],
        candidate["presented_terminal_variant"],
    )
    validate_expected_actual_context(
        candidate["expected_context"], candidate["actual_context"]
    )
    validate_model_plan_projection(
        candidate["model_plan_projection"], candidate["expected_context"]
    )
    validate_runtime_profile_and_signer_projection(
        candidate["runtime_profile_projection"],
        candidate["runtime_instance_projection"],
        candidate["signer_key_projection"],
        candidate["expected_context"],
        candidate["model_plan_projection"],
        contract,
    )
    validate_terminal_payload(
        candidate["terminal_payload"], candidate["authoritative_terminal_variant"]
    )
    validate_oidc_token(
        candidate["oidc_evidence"], outer_eat_nonce=candidate["eat_nonce"]
    )
    validate_quote_evidence(candidate["quote_evidence"])
    validate_kms_evidence(candidate["kms_evidence"])
    validate_opaque_acceptances(candidate["opaque_acceptances"])
    validate_replay_manifest(
        candidate["replay_manifest"],
        candidate["authoritative_terminal_variant"],
        contract,
    )
    validate_replay_semantic_bindings(candidate, contract)
    validate_initial_retention_acceptance(
        candidate["initial_retention_acceptance"],
        candidate["challenge_hex"],
        replay_manifest_hash(candidate["replay_manifest"]),
    )
    validate_verifier_identity(
        candidate["current_replay_expected_verifier"],
        candidate["current_replay_manifest_verifier"],
        candidate["current_replay_actual_verifier"],
    )
    validate_verifier_identity(
        candidate["final_replay_expected_verifier"],
        candidate["final_replay_manifest_verifier"],
        candidate["final_replay_actual_verifier"],
    )
    graph_hash = validate_synthetic_cross_bindings(candidate)
    provider_revalidation_bytes = bytes.fromhex(
        candidate["replay_manifest"][33]["member_manifest"][0]["raw_content_hex"]
    )
    trusted_replay_chain = rebind_replay_chain_source_results(
        candidate["replay_chain"],
        execution_manifest_hash=replay_manifest_hash(candidate["replay_manifest"]),
        candidate_graph_hash=graph_hash,
        initial_retention_acceptance_hash=candidate[
            "initial_retention_acceptance"
        ]["acceptance_hash"],
        provider_revalidation_artifact_sha256=digest(provider_revalidation_bytes),
        current_source_replay_receipt=current_source_replay_receipt,
        final_source_replay_receipt=final_source_replay_receipt,
    )
    validate_replay_chain(
        trusted_replay_chain,
        execution_manifest_hash=replay_manifest_hash(candidate["replay_manifest"]),
        candidate_graph_hash=graph_hash,
        initial_retention_acceptance_hash=candidate[
            "initial_retention_acceptance"
        ]["acceptance_hash"],
        provider_revalidation_artifact_sha256=digest(provider_revalidation_bytes),
        current_source_replay_receipt=current_source_replay_receipt,
        final_source_replay_receipt=final_source_replay_receipt,
    )
    trusted_candidate = dict(candidate)
    trusted_candidate["replay_chain"] = trusted_replay_chain
    trusted_object_envelopes, trusted_composition_envelopes = build_envelope_graph(
        contract, trusted_candidate
    )
    envelope_root_hash = candidate_envelope_root_hash(trusted_candidate)
    validate_envelope_graph(
        contract,
        trusted_candidate,
        trusted_object_envelopes,
        trusted_composition_envelopes,
        component_root_hash=envelope_root_hash,
    )
    if candidate["authority_effect"] != "NONE":
        raise ContractValidationError("candidate attempted authority")
    return derive_live_disposition(
        contract=contract,
        facts=derive_validated_candidate_facts(contract, source_evidence),
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate", type=Path)
    args = parser.parse_args()
    try:
        verify_artifact_pins()
        artifacts = validate_current_artifacts()
        verify_literal_registries(artifacts)
        if args.candidate:
            from verify_gcp_attestation_receipt_revalidation import (
                DEFAULT_SECTION71_BUNDLE,
                DEFAULT_SECTION72_BUNDLE,
                DEFAULT_SECTION73_BUNDLE,
                replay_bound as replay_sources_bound,
                verify_replay_receipt,
            )

            section74_bundle = Path(
                "~/.glean/recovery/fluencytracr/"
                "gcp-attestation-receipt-source-snapshot-20260726T072745Z.zip"
            ).expanduser()
            current_source_result = replay_sources_bound(
                section74_bundle,
                DEFAULT_SECTION71_BUNDLE,
                DEFAULT_SECTION72_BUNDLE,
                DEFAULT_SECTION73_BUNDLE,
                action_id="CURRENT_SECTION_7_4_REPLAY",
                challenge_hex=bytes(range(64, 96)).hex(),
            )
            final_source_result = replay_sources_bound(
                section74_bundle,
                DEFAULT_SECTION71_BUNDLE,
                DEFAULT_SECTION72_BUNDLE,
                DEFAULT_SECTION73_BUNDLE,
                action_id="FINAL_CONSUMER_REPLAY",
                challenge_hex=bytes(range(96, 128)).hex(),
                not_before=current_source_result["observed_at"],
            )
            verify_replay_receipt(current_source_result, consume=True)
            verify_replay_receipt(final_source_result, consume=True)
            result = _candidate(
                args.candidate,
                artifacts["contract"],
                artifacts["source"],
                current_source_result,
                final_source_result,
            )
            if result != "HOLD_FOR_ATTESTATION_VERIFIER_UNCLOSED":
                raise ContractValidationError("synthetic candidate escaped empty approvals")
    except (OSError, ContractValidationError, TypeError, ValueError):
        print("GCP_ATTESTATION_RECEIPT_CONTRACT_VERIFICATION_FAILED", file=sys.stderr)
        return 1
    print(
        "GCP_ATTESTATION_RECEIPT_CONTRACT_CLOSED_EVIDENCE_ABSENT_"
        "RUNTIME_AUTHORITY_HELD"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
