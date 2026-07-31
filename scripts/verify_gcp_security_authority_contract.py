#!/usr/bin/env python3
"""Verify Section 7.3 contract artifacts and an optional evidence snapshot."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

from gcp_security_authority_contract_validation import (
    _canonical,
    strict_load_json_bytes,
    validate_live_evidence_shape,
)

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / "docs/contracts/canonical-inference-gcp-security-authority"
CONTRACT = DIR / "security-authority-contract.json"
VECTORS = DIR / "canonicalization-vectors.json"
MATRIX = DIR / "role-capability-matrix.json"
REVALIDATION = DIR / "provider-revalidation.json"
SOURCES = DIR / "provider-source-evidence.json"
SECTION71 = ROOT / "docs/contracts/canonical-inference-gcp-provider-vocabulary"
EXPECTED_PROVIDER_SOURCE_EVIDENCE_SHA256 = (
    "83074b19ee9b2fe74409387a989a1b88c2ff5231182f8617ae0800dd19b48577"
)
EXPECTED_SOURCE_REGISTRY_SHA256 = (
    "e12d0dcb6d7ff6b1a48519e21cc7c84364cde3e9611d24b9900b2581d6670062"
)
EXPECTED_CLAIM_REGISTRY_SHA256 = (
    "d824bdd1753145992f8be94639303fc11c87ed584ddfa317cb15ce8d0cc9420c"
)
EXPECTED_PROVIDER_REVALIDATION_HASH = (
    "9d2f21c49c5bfa6d498387a7d7a30a13c6c09d3b6bc7ae4a496f8e4e58f88ef6"
)
EXPECTED_SOURCE_COUNT = 23
EXPECTED_CLAIM_COUNT = 42


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def verify_current_contract() -> dict[str, Any]:
    contract = strict_load_json_bytes(CONTRACT.read_bytes())
    expected_contract_keys = {
        "schema_version",
        "contract_version",
        "scope",
        "semantic_dependency",
        "canonicalization",
        "hash_graph",
        "role_capability_matrix_sha256",
        "policy_schema",
        "live_evidence_contract",
        "evidence_snapshot_schema",
        "project_role_contract",
        "principal_role_contract",
        "section_7_5_authority_admission_interface",
        "policy_template",
        "effective_access_evidence_schema",
        "audit_evidence_interface",
        "rollover_state_machine",
        "decision_algorithm",
        "future_interfaces",
        "privacy",
        "non_authorization",
    }
    if set(contract) != expected_contract_keys:
        raise ValueError("security authority contract root keys mismatch")
    if contract["policy_schema"]["runtime_approved_hashes"] != []:
        raise ValueError("runtime policy admission is not empty")
    if contract["evidence_snapshot_schema"]["runtime_approved_hashes"] != []:
        raise ValueError("runtime evidence admission is not empty")
    approval_domains = contract["live_evidence_contract"]["approval_domains"]
    nonempty_runtime_domains = {
        key: value
        for key, value in approval_domains.items()
        if key.startswith("runtime_approved_") and value != []
    }
    if nonempty_runtime_domains:
        raise ValueError(
            "runtime subordinate approval domains are not empty: "
            + ",".join(sorted(nonempty_runtime_domains))
        )
    if any(contract["non_authorization"].values()):
        raise ValueError("contract attempted authorization")
    if contract["role_capability_matrix_sha256"] != digest(MATRIX.read_bytes()):
        raise ValueError("role capability matrix hash mismatch")

    nodes = {node["node_id"]: node for node in contract["hash_graph"]}
    if list(nodes) != [
        "provider_revalidation_hash",
        "security_authority_policy_hash",
        "security_authority_evidence_snapshot_hash",
    ]:
        raise ValueError("hash graph node set/order mismatch")
    vectors = strict_load_json_bytes(VECTORS.read_bytes())
    expected_vector_keys = {
        "schema_version",
        "canonicalization_version",
        "security_authority_contract_sha256",
        "provider_revalidation_sha256",
        "role_capability_matrix_sha256",
        "synthetic_only",
        "authorization_effect",
        "section_7_5_authority_admission_interface_evidence",
        "vectors",
    }
    if set(vectors) != expected_vector_keys:
        raise ValueError("canonical vector artifact root keys mismatch")
    if vectors["security_authority_contract_sha256"] != digest(CONTRACT.read_bytes()):
        raise ValueError("contract artifact hash mismatch")
    if vectors["provider_revalidation_sha256"] != digest(REVALIDATION.read_bytes()):
        raise ValueError("revalidation artifact hash mismatch")
    revalidation = strict_load_json_bytes(REVALIDATION.read_bytes())
    source_evidence_bytes = SOURCES.read_bytes()
    if digest(source_evidence_bytes) != EXPECTED_PROVIDER_SOURCE_EVIDENCE_SHA256:
        raise ValueError("provider source evidence compile pin mismatch")
    source_evidence = strict_load_json_bytes(source_evidence_bytes)
    expected_revalidation_keys = {
        "schema_version",
        "source_bundle_sha256",
        "section_7_1_bindings",
        "section_7_1_claim_ids",
        "source_registry_sha256",
        "claim_registry_sha256",
        "source_count",
        "claim_count",
        "decision",
        "authority_effect",
        "provider_revalidation_hash",
        "provider_source_evidence_sha256",
        "source_bundle_locator",
        "recorded_state",
        "authorization_effect",
    }
    if set(revalidation) != expected_revalidation_keys:
        raise ValueError("provider revalidation root keys mismatch")
    expected_source_evidence_keys = {
        "schema_version",
        "contract_scope",
        "retrieved_at",
        "revalidated_at",
        "section_7_1_bindings",
        "section_7_1_claim_ids",
        "source_bundle",
        "sources",
        "source_registry_hash_basis",
        "source_registry_sha256",
        "claims",
        "claim_registry_sha256",
        "provider_revalidation",
        "decision",
        "authorization_effect",
    }
    if set(source_evidence) != expected_source_evidence_keys:
        raise ValueError("provider source evidence root keys mismatch")
    if set(source_evidence["source_bundle"]) != {
        "external_locator",
        "sha256",
        "byte_count",
        "repo_committed",
        "contains_public_example_identifiers",
        "runtime_admission",
    }:
        raise ValueError("source bundle contract keys mismatch")
    if (
        source_evidence["decision"]
        != "EXACT_SECURITY_AUTHORITY_MAPPING_RECONFIRMED"
        or source_evidence["authorization_effect"] != "NONE_DOCS_ONLY"
    ):
        raise ValueError("provider source evidence state is not closed")
    expected_source_keys = {
        "source_id",
        "requested_url",
        "resolved_url",
        "snapshot_sha256",
        "snapshot_byte_count",
        "bundle_path",
        "classification",
    }
    expected_claim_keys = {
        "claim_id",
        "statement",
        "source_id",
        "needles",
        "max_span_chars",
        "observed_span_chars",
    }
    if any(set(source) != expected_source_keys for source in source_evidence["sources"]):
        raise ValueError("source registry record keys mismatch")
    if any(set(claim) != expected_claim_keys for claim in source_evidence["claims"]):
        raise ValueError("claim registry record keys mismatch")
    source_ids = [source["source_id"] for source in source_evidence["sources"]]
    claim_ids = [claim["claim_id"] for claim in source_evidence["claims"]]
    if len(source_ids) != len(set(source_ids)) or len(claim_ids) != len(set(claim_ids)):
        raise ValueError("provider registry identity collision")
    if any(claim["source_id"] not in set(source_ids) for claim in source_evidence["claims"]):
        raise ValueError("claim references unknown source")
    if source_evidence["source_registry_hash_basis"] != (
        "EXACT_SANITIZED_SNAPSHOT_RECORDS_IN_RECOVERY_BUNDLE"
    ):
        raise ValueError("source registry hash basis mismatch")
    if (
        len(source_evidence["sources"]) != EXPECTED_SOURCE_COUNT
        or len(source_evidence["claims"]) != EXPECTED_CLAIM_COUNT
    ):
        raise ValueError("provider registry compile-pinned count mismatch")
    if source_evidence["source_registry_sha256"] != EXPECTED_SOURCE_REGISTRY_SHA256:
        raise ValueError("source registry compile pin mismatch")
    if digest(_canonical(source_evidence["sources"])) != source_evidence[
        "source_registry_sha256"
    ]:
        raise ValueError("source registry hash mismatch")
    if source_evidence["claim_registry_sha256"] != EXPECTED_CLAIM_REGISTRY_SHA256:
        raise ValueError("claim registry compile pin mismatch")
    if digest(_canonical(source_evidence["claims"])) != source_evidence[
        "claim_registry_sha256"
    ]:
        raise ValueError("claim registry hash mismatch")
    actual_section71 = {
        "provider_readme_sha256": digest((SECTION71 / "README.md").read_bytes()),
        "provider_source_evidence_sha256": digest(
            (SECTION71 / "source-evidence.json").read_bytes()
        ),
        "provider_claim_evidence_sha256": digest(
            (SECTION71 / "claim-evidence.json").read_bytes()
        ),
        "provider_compute_projection_sha256": digest(
            (SECTION71 / "compute-field-projection.json").read_bytes()
        ),
    }
    if source_evidence["section_7_1_bindings"] != actual_section71:
        raise ValueError("Section 7.1 artifact binding mismatch")
    section71_claims = strict_load_json_bytes(
        (SECTION71 / "claim-evidence.json").read_bytes()
    )["claims"]
    section71_claim_ids = {item["claim_id"] for item in section71_claims}
    if not set(source_evidence["section_7_1_claim_ids"]).issubset(
        section71_claim_ids
    ):
        raise ValueError("Section 7.1 inherited claim identity mismatch")
    expected_revalidation_body = {
        "schema_version": "GCP_SECURITY_AUTHORITY_PROVIDER_REVALIDATION_V1",
        "source_bundle_sha256": source_evidence["source_bundle"]["sha256"],
        "section_7_1_bindings": source_evidence["section_7_1_bindings"],
        "section_7_1_claim_ids": source_evidence["section_7_1_claim_ids"],
        "source_registry_sha256": source_evidence["source_registry_sha256"],
        "claim_registry_sha256": source_evidence["claim_registry_sha256"],
        "source_count": len(source_evidence["sources"]),
        "claim_count": len(source_evidence["claims"]),
        "decision": "EXACT_SECURITY_AUTHORITY_MAPPING_RECONFIRMED",
        "authority_effect": "NONE_PUBLIC_SOURCE_REVALIDATION_ONLY",
    }
    expected_revalidation_hash = digest(
        b"FLUENCYTRACR:GCP_SECURITY_AUTHORITY_PROVIDER_REVALIDATION:V1\x00"
        + _canonical(expected_revalidation_body)
    )
    for key, expected in expected_revalidation_body.items():
        if revalidation[key] != expected:
            raise ValueError(f"provider revalidation field mismatch: {key}")
    if expected_revalidation_hash != EXPECTED_PROVIDER_REVALIDATION_HASH:
        raise ValueError("provider revalidation compile pin mismatch")
    if revalidation["provider_revalidation_hash"] != expected_revalidation_hash:
        raise ValueError("provider revalidation self-hash mismatch")
    expected_embedded = {
        **expected_revalidation_body,
        "provider_revalidation_hash": expected_revalidation_hash,
    }
    if source_evidence["provider_revalidation"] != expected_embedded:
        raise ValueError("embedded provider revalidation mismatch")
    semantic_dependency = contract["semantic_dependency"]
    if revalidation["provider_revalidation_hash"] != semantic_dependency[
        "provider_revalidation_hash"
    ]:
        raise ValueError("provider revalidation hash dependency mismatch")
    if revalidation["provider_source_evidence_sha256"] != digest(
        SOURCES.read_bytes()
    ) or revalidation["provider_source_evidence_sha256"] != semantic_dependency[
        "provider_source_evidence_sha256"
    ]:
        raise ValueError("provider source evidence dependency mismatch")
    if (
        revalidation["decision"]
        != "EXACT_SECURITY_AUTHORITY_MAPPING_RECONFIRMED"
        or revalidation["recorded_state"]
        != "EXACT_SECURITY_AUTHORITY_MAPPING_RECONFIRMED"
        or revalidation["authority_effect"]
        != "NONE_PUBLIC_SOURCE_REVALIDATION_ONLY"
        or revalidation["authorization_effect"] != "NONE_DOCS_ONLY"
    ):
        raise ValueError("provider revalidation state is not closed")
    if vectors["role_capability_matrix_sha256"] != digest(MATRIX.read_bytes()):
        raise ValueError("matrix artifact hash mismatch")
    if vectors["synthetic_only"] is not True or vectors[
        "authorization_effect"
    ] != "NONE_TEST_VECTORS_ONLY":
        raise ValueError("vectors attempted authority")
    if len(vectors["vectors"]) != 2:
        raise ValueError("canonical vector count mismatch")
    by_node = {item["node_id"]: item for item in vectors["vectors"]}
    if set(by_node) != {
        "security_authority_policy_hash",
        "security_authority_evidence_snapshot_hash",
    }:
        raise ValueError("canonical vector node coverage mismatch")
    for node_id, vector in by_node.items():
        expected_keys = {
            "node_id",
            "stored_object",
            "canonical_body_utf8_base64",
            "canonical_body_sha256",
            "domain_separated_preimage_base64",
            "expected_hash",
        }
        if set(vector) != expected_keys:
            raise ValueError("canonical vector keys mismatch")
        stored = vector["stored_object"]
        if not isinstance(stored, dict) or node_id not in stored:
            raise ValueError("stored vector shape mismatch")
        body = dict(stored)
        observed_hash = body.pop(node_id)
        body_bytes = _canonical(body)
        preimage = (
            nodes[node_id]["domain_separator"].encode("ascii")
            + b"\x00"
            + body_bytes
        )
        if base64.b64decode(vector["canonical_body_utf8_base64"]) != body_bytes:
            raise ValueError("canonical body byte mismatch")
        if vector["canonical_body_sha256"] != digest(body_bytes):
            raise ValueError("canonical body hash mismatch")
        if base64.b64decode(vector["domain_separated_preimage_base64"]) != preimage:
            raise ValueError("domain preimage mismatch")
        if vector["expected_hash"] != observed_hash or observed_hash != digest(preimage):
            raise ValueError("canonical vector expected hash mismatch")
    policy = by_node["security_authority_policy_hash"]["stored_object"]
    policy_body = dict(policy)
    policy_hash = policy_body.pop("security_authority_policy_hash")
    if _canonical(policy_body) != _canonical(contract["policy_template"]):
        raise ValueError("synthetic policy does not equal compiled policy template")
    if policy_hash not in contract["policy_schema"]["synthetic_test_hashes"]:
        raise ValueError("synthetic policy hash not registered")
    absent = by_node["security_authority_evidence_snapshot_hash"]["stored_object"]
    if absent["evidence_state"] != "NOT_OBSERVED_NO_GCP_ACCESS":
        raise ValueError("current evidence vector is not explicitly absent")
    if absent["security_authority_policy_hash"] != policy_hash:
        raise ValueError("absent evidence policy dependency mismatch")
    if absent["authority_effect"] != "NONE_EVIDENCE_ABSENT_CANNOT_AUTHORIZE":
        raise ValueError("absent evidence attempted authority")
    verify_section_7_5_authority_admission_interface()
    return {
        "contract_sha256": digest(CONTRACT.read_bytes()),
        "policy_hash": policy_hash,
        "evidence_state": absent["evidence_state"],
        "decision": contract["decision_algorithm"]["recorded_decision"],
    }


def validate_full_section_7_5_target_record(
    record: dict[str, Any], schema: dict[str, Any]
) -> None:
    """Validate a future target binding without granting runtime authority."""
    required = schema["required_record_keys"]
    if set(record) != set(required):
        raise ValueError("full Section 7.5 target record keys mismatch")
    if (
        record["schema_version"] != schema["schema_version"]
        or record[schema["contract_kind_field"]] != schema["contract_kind"]
    ):
        raise ValueError("full Section 7.5 target kind mismatch")
    if record[schema["domain_separator_field"]] != schema["domain_separator"]:
        raise ValueError("full Section 7.5 target domain mismatch")
    if not isinstance(record["canonical_contract_bytes_base64"], str):
        raise ValueError("target bytes are not base64")
    try:
        target_bytes = base64.b64decode(
            record["canonical_contract_bytes_base64"], validate=True
        )
    except Exception as error:
        raise ValueError("target bytes are not base64") from error
    if (
        not isinstance(record["canonical_contract_bytes_sha256"], str)
        or record["canonical_contract_bytes_sha256"] != digest(target_bytes)
    ):
        raise ValueError("target bytes hash mismatch")
    target = strict_load_json_bytes(target_bytes)
    if not isinstance(target, dict) or _canonical(target) != target_bytes:
        raise ValueError("target bytes are not canonical JSON")
    if (
        target.get(schema["contract_schema_version_field"])
        != schema["contract_schema_version"]
        or target.get(schema["contract_kind_field"]) != schema["contract_kind"]
    ):
        raise ValueError("full Section 7.5 target bytes discriminator mismatch")
    if target.get(schema["domain_separator_field"]) != schema["domain_separator"]:
        raise ValueError("full Section 7.5 target bytes domain mismatch")
    binding = dict(record)
    observed = binding.pop("target_binding_sha256")
    expected = digest(
        schema["target_binding_domain_separator"].encode("ascii")
        + b"\x00"
        + _canonical(binding)
    )
    if not isinstance(observed, str) or observed != expected:
        raise ValueError("target binding mismatch")


def verify_section_7_5_authority_admission_interface(
    contract_path: Path = CONTRACT, vectors_path: Path = VECTORS
) -> None:
    """Verify the closed, non-authorizing Section 7.3 parent admission shape."""
    contract = strict_load_json_bytes(contract_path.read_bytes())
    vectors = strict_load_json_bytes(vectors_path.read_bytes())
    if not isinstance(contract, dict) or not isinstance(vectors, dict):
        raise ValueError("Section 7.5 admission artifacts are not objects")
    interface = contract.get("section_7_5_authority_admission_interface")
    expected_keys = {
        "authenticated_alias_provider_binding_schema",
        "authority_effect",
        "controller_fixed_point_separation_evidence_schema",
        "full_section_7_5_target_schema",
        "held_reason",
        "live_alias_provider_binding_records",
        "parent_admission_obligations",
        "schema_version",
    }
    if not isinstance(interface, dict) or set(interface) != expected_keys:
        raise ValueError("Section 7.5 authority admission interface is not closed")
    if (
        interface["schema_version"]
        != "GCP_SECTION_7_5_AUTHORITY_ADMISSION_INTERFACE_V1"
        or interface["authority_effect"] != "NONE"
        or interface["held_reason"]
        != "FULL_SECTION_7_5_EXTERNAL_APPROVAL_AND_LIVE_EVIDENCE_REQUIRED"
        or interface["live_alias_provider_binding_records"] != []
    ):
        raise ValueError("Section 7.5 authority admission interface attempted authority")
    if interface["parent_admission_obligations"] != [
        "S75A-P01",
        "S75A-P02",
        "S75A-P05_SECTION_7_3_PARENT_ADMISSION",
        "S75A-P06",
        "S75A-P08_SECTION_7_3_PARENT_ADMISSION",
        "S75A-P19_SECTION_7_3_PARENT_ADMISSION",
    ]:
        raise ValueError("Section 7.5 parent admission obligation mismatch")
    target = interface["full_section_7_5_target_schema"]
    expected_target = {
        "canonicalization_version": "FT_CANONICAL_JSON_V1",
        "candidate_bytes_required_before_hash_admission": True,
        "contract_kind": "FULL_SECTION_7_5",
        "contract_kind_field": "contract_kind",
        "contract_schema_version": "GCP_CANONICAL_RUNTIME_SECTION_7_5_FULL_V1",
        "contract_schema_version_field": "schema_version",
        "domain_separator": "FLUENCYTRACR:GCP_CANONICAL_RUNTIME:SECTION_7_5:V1",
        "domain_separator_field": "contract_domain_separator",
        "required_record_keys": [
            "schema_version",
            "contract_kind",
            "contract_domain_separator",
            "canonical_contract_bytes_base64",
            "canonical_contract_bytes_sha256",
            "target_binding_sha256",
        ],
        "schema_version": "GCP_SECTION_7_5_FULL_TARGET_ADMISSION_V1",
        "section_7_5a_substitution": "REJECT",
        "target_binding_domain_separator": "FLUENCYTRACR:GCP_SECURITY_AUTHORITY:SECTION_7_5_TARGET_BINDING:V1",
    }
    if target != expected_target:
        raise ValueError("full Section 7.5 target schema mismatch")
    aliases = interface["authenticated_alias_provider_binding_schema"]
    roles = contract["principal_role_contract"]["role_ids"]
    expected_aliases = {
        "authentication_commitment_field": "provider_binding_authentication_sha256",
        "binding_commitment_field": "provider_binding_sha256",
        "opaque_alias_field": "opaque_alias",
        "owner": "SECTION_7_3",
        "provider_identifier_retention": "PROHIBITED",
        "required_record_keys": [
            "schema_version",
            "target_binding_sha256",
            "role_id",
            "opaque_alias",
            "provider_binding_sha256",
            "provider_binding_authentication_sha256",
            "alias_provider_binding_record_sha256",
        ],
        "role_ids": roles,
        "schema_version": "GCP_AUTHENTICATED_OPAQUE_ALIAS_PROVIDER_BINDING_V1",
        "target_binding_field": "target_binding_sha256",
    }
    if aliases != expected_aliases:
        raise ValueError("authenticated alias/provider binding schema mismatch")
    controller = interface["controller_fixed_point_separation_evidence_schema"]
    expected_controller = {
        "fixed_point_evidence_must_bind": [
            "target_binding_sha256",
            "alias_provider_binding_record_sha256s",
            "credential_controller_sets_sha256",
            "completeness_witness_sha256",
            "fixed_point_reached",
            "forbidden_intersection_count",
        ],
        "fixed_point_reached_required": True,
        "forbidden_controller_intersections_source": "ROLE_CAPABILITY_MATRIX_EXACT_FORBIDDEN_CONTROLLER_INTERSECTIONS",
        "owner": "SECTION_7_3",
        "role_ids": roles,
        "schema_version": "GCP_SECTION_7_5_CONTROLLER_FIXED_POINT_SEPARATION_EVIDENCE_V1",
        "unknown_or_unviewable_edge": "HOLD",
    }
    if controller != expected_controller:
        raise ValueError("controller fixed-point evidence schema mismatch")
    if vectors.get("section_7_5_authority_admission_interface_evidence") != {
        "live_alias_provider_binding_record_count": 0,
        "state": "FULL_SECTION_7_5_EXTERNAL_APPROVAL_AND_LIVE_EVIDENCE_REQUIRED",
    }:
        raise ValueError("Section 7.5 admission vector evidence mismatch")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--evidence", type=Path)
    args = parser.parse_args()
    try:
        result = verify_current_contract()
        if args.evidence is not None:
            contract = strict_load_json_bytes(CONTRACT.read_bytes())
            evidence = strict_load_json_bytes(args.evidence.read_bytes())
            validate_live_evidence_shape(evidence, contract)
            result["validated_evidence_sha256"] = digest(args.evidence.read_bytes())
            result["validated_evidence_state"] = evidence["evidence_state"]
            result["validated_evidence_semantics"] = (
                "STRUCTURE_AND_DERIVATION_ONLY_NO_EXTERNAL_AUTHENTICITY_OR_COMPLETENESS_PROOF"
                if evidence["evidence_state"]
                == "SYNTHETIC_COMPLETE_SCHEMA_EXERCISE_NO_AUTHORITY"
                else "RUNTIME_APPROVAL_BOUND_LIVE_EVIDENCE"
            )
    except Exception:
        print(
            json.dumps(
                {
                    "decision": "REJECT_OR_HOLD",
                    "error_code": "SECURITY_AUTHORITY_CONTRACT_VALIDATION_FAILED",
                }
            )
        )
        return 1
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
