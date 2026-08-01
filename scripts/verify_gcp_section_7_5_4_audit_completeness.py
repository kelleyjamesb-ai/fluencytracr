#!/usr/bin/env python3
"""Verify the bounded Section 7.5.4 docs-only audit contract."""

from __future__ import annotations

import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

try:
    from scripts.verify_gcp_section_7_5_2_network_local_enforcement import (
        NetworkLocalValidationError as AuditCompletenessValidationError,
        _canonical_bytes,
        _load_object,
        _read_regular_file_once,
        _sha256,
    )
except ModuleNotFoundError:  # Direct execution places scripts/ on sys.path.
    from verify_gcp_section_7_5_2_network_local_enforcement import (
        NetworkLocalValidationError as AuditCompletenessValidationError,
        _canonical_bytes,
        _load_object,
        _read_regular_file_once,
        _sha256,
    )


CONTRACT_PATH = (
    "docs/contracts/canonical-inference-gcp-audit-completeness/"
    "audit-completeness-contract.json"
)
VECTORS_PATH = (
    "docs/contracts/canonical-inference-gcp-audit-completeness/"
    "canonicalization-vectors.json"
)
EXPECTED_DECISION = (
    "GCP_SECTION_7_5_4_AUDIT_COMPLETENESS_CONTRACT_CLOSED_"
    "EVIDENCE_ABSENT_RUNTIME_AUTHORITY_HELD"
)
EXPECTED_SOURCE_CONTRACTS = (
    (
        "SECTION_7_5A",
        "docs/contracts/canonical-inference-gcp-transport-persistence-constraints/"
        "constraints-open-obligations-contract.json",
        "2ff8621366dca45aade8a54029ee0fa818b366ae689e4466d536f93a9dd6b9d0",
    ),
    (
        "SECTION_7_5A_AUDIT_INVENTORY",
        "docs/contracts/canonical-inference-gcp-transport-persistence-constraints/"
        "audit-method-inventory.json",
        "e13cf9889947115859d684f7377fd38caa6e5207969eda073f534bc94af87bbf",
    ),
    (
        "SECTION_7_3",
        "docs/contracts/canonical-inference-gcp-security-authority/"
        "security-authority-contract.json",
        "96ae43764b78189735c65e0b257971faa31a9f98a31a2c58fb00ef75f805716a",
    ),
    (
        "SECTION_7_4",
        "docs/contracts/canonical-inference-gcp-attestation-receipt/"
        "attestation-receipt-contract.json",
        "a9cddaf665f72d8cbb415fa15c6004663e7a33125fc589ced55a186e27e7cbf2",
    ),
    (
        "SECTION_7_5_3",
        "docs/contracts/canonical-inference-gcp-persistence-anchor/"
        "persistence-anchor-contract.json",
        "cbc187987a3e4b36fe6e419cea96007a7a6456d77cd0aef982875e6993454ff9",
    ),
)
OWNED_PREREQUISITES = ("S75A-P12",)
OWNED_P07_NODES = ("audit_mapping_acceptance_hash",)
EXCLUDED_P07_NODES = (
    "trust_distribution_acceptance_hash",
    "channel_enforcement_acceptance_hash",
    "pre_quote_transport_acceptance_hash",
    "terminal_quote_transport_acceptance_hash",
    "kms_sign_transport_acceptance_hash",
    "initial_section_7_4_replay_retention_acceptance_hash",
    "current_section_7_4_replay_retention_acceptance_hash",
    "final_consumer_replay_retention_acceptance_hash",
)
EXPECTED_SCHEMAS = (
    "GCP_SECTION_7_5_4_AUDIT_UNIVERSE_RECORD_V1",
    "GCP_SECTION_7_5_4_AUDIT_ROUTE_TIMELINE_RECORD_V1",
    "GCP_SECTION_7_5_4_AUDIT_DELIVERY_COMPLETENESS_RECORD_V1",
    "GCP_SECTION_7_5_4_AUDIT_PRIVACY_PROJECTION_RECORD_V1",
    "GCP_SECTION_7_5_4_AUDIT_MAPPING_RECORD_V1",
)
EXPECTED_DOMAINS = (
    "FLUENCYTRACR:GCP_SECTION_7_5_4:AUDIT_UNIVERSE:V1",
    "FLUENCYTRACR:GCP_SECTION_7_5_4:AUDIT_ROUTE_TIMELINE:V1",
    "FLUENCYTRACR:GCP_SECTION_7_5_4:AUDIT_DELIVERY_COMPLETENESS:V1",
    "FLUENCYTRACR:GCP_SECTION_7_5_4:AUDIT_PRIVACY_PROJECTION:V1",
    "FLUENCYTRACR:GCP_SECTION_7_5_4:AUDIT_MAPPING:V1",
)
EXPECTED_REQUIRED_KEYS = (
    (
        "schema_version", "target_binding_sha256",
        "approved_section_7_5_contract_sha256", "applicability_evidence_projection",
        "applicability_evidence_projection_sha256", "inventory_bytes_sha256",
        "row_keyset_sha256", "registry_sha256", "observed_row_count",
        "observed_method_row_count", "classifier_binary_sha256",
        "all_rows_classified", "all_methods_accounted", "data_access_enabled",
        "policy_denied_total_applicability", "exclusion_methods_fully_classified",
        "record_sha256",
    ),
    (
        "schema_version", "target_binding_sha256",
        "approved_section_7_5_contract_sha256", "interval_start", "interval_end",
        "route_universe_sha256", "source_project_roots_sha256",
        "destination_roots_sha256", "independent_observation_root_sha256",
        "routing_configuration_sha256", "exclusion_configuration_sha256",
        "data_access_configuration_sha256", "full_route_timeline_complete",
        "policy_denied_no_exclusion", "all_exclusion_methods_observed",
        "router_buffer_not_used_as_completeness", "record_sha256",
    ),
    (
        "schema_version", "target_binding_sha256",
        "approved_section_7_5_contract_sha256", "interval_start", "interval_end",
        "expected_service_method_keyset_sha256",
        "observed_service_method_keyset_sha256", "expected_row_count",
        "observed_row_count", "source_delivery_receipts_sha256",
        "destination_delivery_receipts_sha256",
        "independent_delivery_observation_sha256", "sink_error_observation_sha256",
        "all_services_supported", "all_routes_observed", "sink_errors_checked",
        "missing_method_count", "missing_route_count",
        "missing_policy_denied_count", "record_sha256",
    ),
    (
        "schema_version", "target_binding_sha256",
        "approved_section_7_5_contract_sha256", "raw_evidence_restricted",
        "public_projection", "public_projection_sha256",
        "public_projection_keyset_sha256",
        "identifier_fields_excluded", "request_response_metadata_excluded",
        "resource_name_excluded", "principal_subject_excluded", "record_sha256",
    ),
    (
        "schema_version", "target_binding_sha256",
        "approved_section_7_5_contract_sha256", "section_7_4_acceptance_node_id",
        "section_7_4_formula_sha256", "bounded_audit_field_profile_sha256",
        "record_bound_bounded_audit_field_profile_sha256",
        "audit_record_authentication_verification_sha256",
        "audit_record_freshness_and_anti_replay_sha256",
        "audit_universe_record_sha256", "audit_route_timeline_record_sha256",
        "audit_delivery_completeness_record_sha256",
        "audit_privacy_projection_record_sha256", "exact_target_hash_match",
        "audit_status", "record_sha256",
    ),
)
EXPECTED_KEYSET_SHA256 = (
    "ffd46355eb1e3eefa5d7ddd4d432712e151ad67292314fd8bb8a915f2a23216b"
)
EXPECTED_REGISTRY_SHA256 = (
    "3a984f6b7ffc704a89efc627529d1c250897df7a12da19e01f5c986ce90b49ef"
)
EXPECTED_PUBLIC_KEYSET_SHA256 = (
    "dfaa464e72ace6f2bc8c1ff0553761b6790a0e1e03abad2f6292d3d90f8df422"
)
PUBLIC_PROJECTION_DOMAIN = "FLUENCYTRACR:GCP_SECTION_7_5_4:PUBLIC_PROJECTION:V1"
APPLICABILITY_EVIDENCE_DOMAIN = (
    "FLUENCYTRACR:GCP_SECTION_7_5_4:APPLICABILITY_EVIDENCE:V1"
)
POLICY_DENIED_MAPPING_IDS_DOMAIN = (
    "FLUENCYTRACR:GCP_SECTION_7_5_4:POLICY_DENIED_MAPPING_IDS:V1"
)
DENIED_CANARY_MAPPING_ID = "S75-M037"
CONDITIONAL_MAPPING_IDS = ("S75-M038", "S75-M039", "S75-M040", "S75-M041")
UNCONDITIONAL_POLICY_DENIED_MAPPING_IDS = tuple(
    f"S75-M{index:03d}" for index in (*range(1, 37), *range(45, 89))
)
HEX_64 = re.compile(r"[0-9a-f]{64}\Z")
UTC_TIME = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\Z")


def _fail(code: str, detail: str) -> None:
    raise AuditCompletenessValidationError(code, detail)


def _time(value: Any, label: str) -> datetime:
    if not isinstance(value, str) or UTC_TIME.fullmatch(value) is None:
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", f"{label} is not canonical")
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", f"{label} is not canonical")


def _validate_record(record: Any, schema: dict[str, Any]) -> None:
    if not isinstance(record, dict) or set(record) != set(schema["required_keys"]):
        forbidden = {
            "authenticationInfo", "authorizationInfo", "metadata",
            "principalSubject", "request", "resourceName", "response",
            "user_id", "email", "credential",
        }
        code = (
            "REJECT_PRIVACY_OR_BOUNDARY"
            if isinstance(record, dict) and forbidden.intersection(record)
            else "REJECT_SCHEMA_CANONICALIZATION_OR_HASH"
        )
        _fail(code, "record differs from closed schema")
    if list(record) != sorted(record):
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "record key order drift")
    if record["schema_version"] != schema["schema_version"]:
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "schema version drift")
    for key, value in record.items():
        if key.endswith("sha256") and (
            not isinstance(value, str) or HEX_64.fullmatch(value) is None
        ):
            _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "noncanonical SHA-256")
        if key in {
            "all_rows_classified", "all_methods_accounted", "data_access_enabled",
            "policy_denied_total_applicability", "exclusion_methods_fully_classified",
            "full_route_timeline_complete", "policy_denied_no_exclusion",
            "all_exclusion_methods_observed", "router_buffer_not_used_as_completeness",
            "all_services_supported", "all_routes_observed", "sink_errors_checked",
            "raw_evidence_restricted", "identifier_fields_excluded",
            "request_response_metadata_excluded", "resource_name_excluded",
            "principal_subject_excluded", "exact_target_hash_match",
        } and type(value) is not bool:
            _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "Boolean alias rejected")
    body = {key: value for key, value in record.items() if key != "record_sha256"}
    preimage = schema["domain_separator"].encode("ascii") + b"\x00" + _canonical_bytes(body)
    if record["record_sha256"] != _sha256(preimage):
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "record hash mismatch")


def _validate_inventory(inventory: dict[str, Any]) -> None:
    expected = {
        "schema_version": "SECTION_7_5A_AUDIT_METHOD_RESEARCH_INVENTORY_V3",
        "state": "RESEARCH_INVENTORY_LITERAL_REPLAY_PASS_SEMANTIC_CLASSIFIER_UNCLOSED",
        "authority_effect": "NONE",
        "row_count": 89,
        "method_row_count": 88,
        "row_keyset_sha256": EXPECTED_KEYSET_SHA256,
        "registry_sha256": EXPECTED_REGISTRY_SHA256,
        "source_manifest_sha256": "5f98896e8bd11e0232b14eca46670f6273bb65cbb61f94629095949aa859fd50",
    }
    if any(inventory.get(key) != value for key, value in expected.items()):
        _fail("REJECT_PARENT_TARGET_SOURCE_OR_OWNERSHIP", "inventory header drift")
    rows = inventory.get("rows")
    if not isinstance(rows, list) or len(rows) != 89:
        _fail("HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE", "inventory rows missing")
    mapping_ids = [row.get("mapping_id") for row in rows if isinstance(row, dict)]
    if mapping_ids != [f"S75-M{index:03d}" for index in range(1, 90)]:
        _fail("HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE", "method universe gap")
    if sum("method_name" in row for row in rows) != 88:
        _fail("HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE", "method count drift")
    for row in rows:
        if row.get("row_sha256") != _sha256(
            _canonical_bytes({key: value for key, value in row.items() if key != "row_sha256"})
        ):
            _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "inventory row hash mismatch")
        if row.get("classification_mode") not in {
            "MULTI_LABEL_SORTED_OPERATION_IDS", "SINGLE_LABEL",
            "SINGLE_PLATFORM_LOG_LABEL",
        }:
            _fail("HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE", "classifier gap")
    exclusions = {
        row["mapping_id"] for row in rows if "EXCLUSION" in row.get("resource_class", "")
    }
    if exclusions != {"S75-M049", "S75-M050", "S75-M051", "S75-M070", "S75-M071"}:
        _fail("HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE", "exclusion universe gap")
    applicability = {row["mapping_id"]: row.get("applicability") for row in rows}
    if (
        applicability.get(DENIED_CANARY_MAPPING_ID) != "DENIED_CANARY_REQUIRED"
        or any(
            applicability.get(mapping_id)
            != "SUCCESS_AND_DENIAL_IF_PATH_APPLICABLE"
            for mapping_id in CONDITIONAL_MAPPING_IDS
        )
        or {
            mapping_id
            for mapping_id, value in applicability.items()
            if value == "SUCCESS_AND_DENIAL"
        }
        != set(UNCONDITIONAL_POLICY_DENIED_MAPPING_IDS)
    ):
        _fail(
            "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE",
            "Policy Denied applicability classifier drift",
        )


def _validate_contract_shape(
    contract: dict[str, Any], sources: dict[str, dict[str, Any]]
) -> None:
    expected_keys = {
        "actual_evidence", "authority_effect", "canonicalization_version",
        "classifier_contract", "decision", "decision_precedence",
        "inventory_contract", "live_runtime", "privacy_projection",
        "record_schemas", "runtime_evidence_registries", "schema_version",
        "scope", "source_contracts",
    }
    if set(contract) != expected_keys:
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "contract shape drift")
    if contract["decision"] != EXPECTED_DECISION or contract["authority_effect"] != "NONE":
        _fail("REJECT_AUTHORITY_SUBSTITUTION", "decision or authority drift")
    if (
        contract["schema_version"] != "GCP_SECTION_7_5_4_AUDIT_COMPLETENESS_CONTRACT_V1"
        or contract["canonicalization_version"] != "FT_CANONICAL_JSON_V1"
        or contract["decision_precedence"] != [
            "PRIVACY_OR_BOUNDARY_REJECT",
            "PARENT_TARGET_SOURCE_OR_OWNERSHIP_REJECT",
            "SCHEMA_CANONICALIZATION_OR_HASH_REJECT",
            "AUTHENTICATION_FRESHNESS_OR_TIMELINE_REJECT",
            "METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE_HOLD",
            "APPROVAL_OR_EVIDENCE_ABSENT_HOLD",
            "CONTRACT_CLOSED_RUNTIME_AUTHORITY_HELD",
        ]
    ):
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "contract version or precedence drift")
    if contract["actual_evidence"] != {
        "approvals_present": False,
        "live_delivery_evidence_present": False,
        "runtime_records_present": False,
    } or contract["runtime_evidence_registries"] != {
        "audit_delivery_records": [], "audit_mapping_records": [],
        "audit_privacy_records": [], "audit_route_records": [],
        "audit_universe_records": [], "approval_records": [],
    }:
        _fail("REJECT_AUTHORITY_SUBSTITUTION", "runtime evidence must remain absent")
    if contract["live_runtime"] != {"command": "NOT_AUTHORIZED", "expected_exit": "NOT_RUN"}:
        _fail("REJECT_AUTHORITY_SUBSTITUTION", "live runtime posture drift")
    if contract["classifier_contract"] != {
        "applicability_evidence": {
            "conditional_mapping_ids": list(CONDITIONAL_MAPPING_IDS),
            "denied_canary_mapping_id": DENIED_CANARY_MAPPING_ID,
            "mapping_ids_domain_separator": POLICY_DENIED_MAPPING_IDS_DOMAIN,
            "projection_domain_separator": APPLICABILITY_EVIDENCE_DOMAIN,
        },
        "data_access": "ENABLED_FOR_ALL_INVENTORY_DATA_ACCESS_ROWS",
        "denied_canary": "REQUIRED_FOR_KMS_ASYMMETRIC_SIGN",
        "exclusion_method_disposition": "CREATE_UPDATE_DELETE_GET_LIST_ALL_CLASSIFIED",
        "missing_inventory_row": "HOLD",
        "path_applicability": "EXPLICIT_REQUIRED_OR_NOT_APPLICABLE_WITH_EVIDENCE",
        "policy_denied": "TOTAL_FOR_ALL_APPLICABLE_METHOD_ROWS_NO_EXCLUSION",
        "recognized_modes": ["MULTI_LABEL_SORTED_OPERATION_IDS", "SINGLE_LABEL", "SINGLE_PLATFORM_LOG_LABEL"],
        "unknown_service_or_method": "HOLD",
    }:
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "classifier contract drift")
    if contract["inventory_contract"] != {
        "authority_effect": "NONE",
        "expected_exclusion_method_ids": ["S75-M049", "S75-M050", "S75-M051", "S75-M070", "S75-M071"],
        "method_row_count": 88,
        "registry_sha256": EXPECTED_REGISTRY_SHA256,
        "row_count": 89,
        "row_keyset_sha256": EXPECTED_KEYSET_SHA256,
        "schema_version": "SECTION_7_5A_AUDIT_METHOD_RESEARCH_INVENTORY_V3",
        "source_manifest_sha256": "5f98896e8bd11e0232b14eca46670f6273bb65cbb61f94629095949aa859fd50",
    }:
        _fail("REJECT_PARENT_TARGET_SOURCE_OR_OWNERSHIP", "inventory contract drift")
    if contract["privacy_projection"] != {
        "allowed_public_keys": ["aggregate_count", "coverage_status", "interval_end", "interval_start", "record_sha256", "service_method_keyset_sha256"],
        "domain_separator": PUBLIC_PROJECTION_DOMAIN,
        "forbidden_raw_fields": ["authenticationInfo", "authorizationInfo", "metadata", "principalSubject", "request", "resourceName", "response"],
        "raw_evidence": "RESTRICTED_ONLY", "unknown_public_fields": "REJECT",
    }:
        _fail("REJECT_PRIVACY_OR_BOUNDARY", "privacy projection drift")
    if contract["scope"] != {
        "excluded_p07_nodes": list(EXCLUDED_P07_NODES),
        "owned_p07_nodes": list(OWNED_P07_NODES),
        "owned_prerequisite_ids": list(OWNED_PREREQUISITES),
        "p13_owned_portion": "SECTION_7_5_MECHANISM_ONLY",
        "registry_rows_owners_states_edges_unchanged": True,
        "section_7_7_decision_excluded": True,
    }:
        _fail("REJECT_OWNERSHIP_EXPANSION", "scope ownership drift")
    expected_sources = [
        {"owner": owner, "path": path, "sha256": digest}
        for owner, path, digest in EXPECTED_SOURCE_CONTRACTS
    ]
    if contract["source_contracts"] != expected_sources:
        _fail("REJECT_PARENT_TARGET_SOURCE_OR_OWNERSHIP", "source pin drift")
    schemas = contract["record_schemas"]
    if not isinstance(schemas, list) or len(schemas) != 5:
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "schema registry drift")
    for index, schema in enumerate(schemas):
        if not isinstance(schema, dict) or schema != {
            "domain_separator": EXPECTED_DOMAINS[index],
            "required_keys": list(EXPECTED_REQUIRED_KEYS[index]),
            "schema_version": EXPECTED_SCHEMAS[index],
            "unknown_fields": "REJECT",
        }:
            _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "schema closure drift")
    registry = sources[EXPECTED_SOURCE_CONTRACTS[0][1]]
    rows = {row["prerequisite_id"]: row for row in registry["open_prerequisite_registry"]}
    if (
        len(rows) != 20
        or rows["S75A-P07"]["owner"] != "FUTURE_FULL_SECTION_7_5_SECTION_7_4"
        or rows["S75A-P12"]["owner"] != "FUTURE_FULL_SECTION_7_5"
        or rows["S75A-P13"]["owner"] != "FUTURE_FULL_SECTION_7_5_SECTION_7_7"
        or any(rows[key]["current_state"] != "OPEN_BLOCKING" for key in ("S75A-P07", "S75A-P12", "S75A-P13"))
    ):
        _fail("REJECT_OWNERSHIP_EXPANSION", "registry owner or state drift")
    nodes = sources[EXPECTED_SOURCE_CONTRACTS[3][1]]["section_7_5_external_approval_interface"]["acceptance_node_conjunction_schema"]["acceptance_node_ids"]
    expected_nodes = EXCLUDED_P07_NODES[:5] + OWNED_P07_NODES + EXCLUDED_P07_NODES[5:]
    if tuple(nodes) != expected_nodes:
        _fail("REJECT_PARENT_TARGET_SOURCE_OR_OWNERSHIP", "P07 universe drift")
    _validate_inventory(sources[EXPECTED_SOURCE_CONTRACTS[1][1]])


def _mapping_ids_sha256(mapping_ids: list[str]) -> str:
    return _sha256(
        POLICY_DENIED_MAPPING_IDS_DOMAIN.encode("ascii")
        + b"\x00"
        + _canonical_bytes(mapping_ids)
    )


def _validate_applicability_evidence(universe: dict[str, Any]) -> None:
    projection = universe["applicability_evidence_projection"]
    expected_projection_keys = {
        "applicable_mapping_ids_sha256",
        "conditional_paths",
        "denied_canary",
        "observed_policy_denied_mapping_ids_sha256",
        "record_sha256",
    }
    if (
        not isinstance(projection, dict)
        or set(projection) != expected_projection_keys
        or list(projection) != sorted(projection)
    ):
        _fail(
            "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE",
            "applicability evidence projection missing or open",
        )

    canary = projection["denied_canary"]
    if (
        not isinstance(canary, dict)
        or set(canary)
        != {"evidence_kind", "evidence_sha256", "mapping_id", "observed_disposition"}
        or list(canary) != sorted(canary)
        or canary["mapping_id"] != DENIED_CANARY_MAPPING_ID
        or canary["observed_disposition"] != "DENIED"
        or canary["evidence_kind"] != "POLICY_DENIED_CANARY_OBSERVATION"
        or not isinstance(canary["evidence_sha256"], str)
        or HEX_64.fullmatch(canary["evidence_sha256"]) is None
        or canary["evidence_sha256"] == "0" * 64
    ):
        _fail(
            "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE",
            "denied AsymmetricSign canary evidence missing",
        )

    conditional_paths = projection["conditional_paths"]
    if not isinstance(conditional_paths, list) or len(conditional_paths) != 4:
        _fail(
            "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE",
            "conditional path applicability incomplete",
        )
    required_mapping_ids: list[str] = []
    evidence_hashes = {canary["evidence_sha256"]}
    for mapping_id, entry in zip(CONDITIONAL_MAPPING_IDS, conditional_paths, strict=True):
        if (
            not isinstance(entry, dict)
            or set(entry) != {"disposition", "evidence_kind", "evidence_sha256", "mapping_id"}
            or list(entry) != sorted(entry)
            or entry["mapping_id"] != mapping_id
            or entry["disposition"] not in {"REQUIRED", "NOT_APPLICABLE"}
            or not isinstance(entry["evidence_sha256"], str)
            or HEX_64.fullmatch(entry["evidence_sha256"]) is None
            or entry["evidence_sha256"] == "0" * 64
            or entry["evidence_sha256"] in evidence_hashes
        ):
            _fail(
                "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE",
                "conditional path evidence invalid",
            )
        expected_kind = (
            "POLICY_DENIED_OBSERVATION"
            if entry["disposition"] == "REQUIRED"
            else "PATH_NOT_APPLICABLE_PROOF"
        )
        if entry["evidence_kind"] != expected_kind:
            _fail(
                "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE",
                "conditional path disposition unsubstantiated",
            )
        evidence_hashes.add(entry["evidence_sha256"])
        if entry["disposition"] == "REQUIRED":
            required_mapping_ids.append(mapping_id)

    applicable_mapping_ids = sorted(
        [
            *UNCONDITIONAL_POLICY_DENIED_MAPPING_IDS,
            DENIED_CANARY_MAPPING_ID,
            *required_mapping_ids,
        ]
    )
    expected_mapping_ids_sha256 = _mapping_ids_sha256(applicable_mapping_ids)
    if (
        projection["applicable_mapping_ids_sha256"] != expected_mapping_ids_sha256
        or projection["observed_policy_denied_mapping_ids_sha256"]
        != expected_mapping_ids_sha256
    ):
        _fail(
            "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE",
            "applicable or observed Policy Denied keyset incomplete",
        )

    body = {key: value for key, value in projection.items() if key != "record_sha256"}
    projection_digest = _sha256(
        APPLICABILITY_EVIDENCE_DOMAIN.encode("ascii")
        + b"\x00"
        + _canonical_bytes(body)
    )
    if (
        projection["record_sha256"] != projection_digest
        or universe["applicability_evidence_projection_sha256"] != projection_digest
    ):
        _fail(
            "REJECT_SCHEMA_CANONICALIZATION_OR_HASH",
            "applicability evidence projection hash mismatch",
        )


def validate_bundle(contract: dict[str, Any], bundle: Any) -> str:
    if not isinstance(bundle, dict) or set(bundle) != {"claimed_p07_nodes", "records"}:
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "bundle shape drift")
    if tuple(bundle["claimed_p07_nodes"]) != OWNED_P07_NODES:
        _fail("REJECT_OWNERSHIP_EXPANSION", "claimed P07 ownership drift")
    records = bundle["records"]
    if (
        not isinstance(records, list) or len(records) != 5
        or any(not isinstance(record, dict) for record in records)
        or tuple(record.get("schema_version") for record in records) != EXPECTED_SCHEMAS
    ):
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "record sequence drift")
    schemas = {item["schema_version"]: item for item in contract["record_schemas"]}
    for record in records:
        _validate_record(record, schemas[record["schema_version"]])
    if len({record["target_binding_sha256"] for record in records}) != 1 or len(
        {record["approved_section_7_5_contract_sha256"] for record in records}
    ) != 1:
        _fail("REJECT_PARENT_TARGET_SOURCE_OR_OWNERSHIP", "target or contract conflict")
    universe, route, delivery, privacy, mapping = records
    if (
        universe["inventory_bytes_sha256"] != EXPECTED_SOURCE_CONTRACTS[1][2]
        or universe["row_keyset_sha256"] != EXPECTED_KEYSET_SHA256
        or universe["registry_sha256"] != EXPECTED_REGISTRY_SHA256
        or type(universe["observed_row_count"]) is not int
        or type(universe["observed_method_row_count"]) is not int
        or universe["observed_row_count"] != 89
        or universe["observed_method_row_count"] != 88
        or any(universe[field] is not True for field in (
            "all_rows_classified", "all_methods_accounted", "data_access_enabled",
            "policy_denied_total_applicability", "exclusion_methods_fully_classified",
        ))
    ):
        _fail("HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE", "audit universe gap")
    _validate_applicability_evidence(universe)
    start = _time(route["interval_start"], "route interval start")
    end = _time(route["interval_end"], "route interval end")
    if start >= end or any(route[field] is not True for field in (
        "full_route_timeline_complete", "policy_denied_no_exclusion",
        "all_exclusion_methods_observed", "router_buffer_not_used_as_completeness",
    )):
        _fail("HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE", "route timeline gap")
    if len({route["source_project_roots_sha256"], route["destination_roots_sha256"], route["independent_observation_root_sha256"]}) != 3:
        _fail("HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE", "route evidence not independent")
    if delivery["interval_start"] != route["interval_start"] or delivery["interval_end"] != route["interval_end"]:
        _fail("REJECT_AUTHENTICATION_FRESHNESS_OR_TIMELINE", "delivery interval conflict")
    count_fields = ("expected_row_count", "observed_row_count", "missing_method_count", "missing_route_count", "missing_policy_denied_count")
    if any(type(delivery[field]) is not int for field in count_fields):
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "delivery integer alias rejected")
    if (
        delivery["expected_service_method_keyset_sha256"] != EXPECTED_KEYSET_SHA256
        or delivery["observed_service_method_keyset_sha256"] != EXPECTED_KEYSET_SHA256
        or delivery["expected_row_count"] != 89 or delivery["observed_row_count"] != 89
        or any(delivery[field] != 0 for field in count_fields[2:])
        or any(delivery[field] is not True for field in ("all_services_supported", "all_routes_observed", "sink_errors_checked"))
    ):
        _fail("HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE", "delivery completeness gap")
    if len({
        delivery["source_delivery_receipts_sha256"],
        delivery["destination_delivery_receipts_sha256"],
        delivery["independent_delivery_observation_sha256"],
        delivery["sink_error_observation_sha256"],
    }) != 4:
        _fail("HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE", "delivery evidence not independent")
    route_roots = {
        route["source_project_roots_sha256"], route["destination_roots_sha256"],
        route["independent_observation_root_sha256"],
    }
    delivery_roots = {
        delivery["source_delivery_receipts_sha256"],
        delivery["destination_delivery_receipts_sha256"],
        delivery["independent_delivery_observation_sha256"],
        delivery["sink_error_observation_sha256"],
    }
    if not route_roots.isdisjoint(delivery_roots):
        _fail("HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE", "route and delivery roots not independent")
    projection = privacy["public_projection"]
    projection_keys = {
        "aggregate_count", "coverage_status", "interval_end", "interval_start",
        "record_sha256", "service_method_keyset_sha256",
    }
    if (
        not isinstance(projection, dict)
        or set(projection) != projection_keys
        or list(projection) != sorted(projection)
    ):
        _fail("REJECT_PRIVACY_OR_BOUNDARY", "public projection shape drift")
    projection_body = {
        key: value for key, value in projection.items() if key != "record_sha256"
    }
    projection_digest = _sha256(
        PUBLIC_PROJECTION_DOMAIN.encode("ascii") + b"\x00" + _canonical_bytes(projection_body)
    )
    if (
        type(projection["aggregate_count"]) is not int
        or projection["aggregate_count"] != delivery["observed_row_count"]
        or projection["coverage_status"] != "COMPLETE"
        or projection["interval_start"] != route["interval_start"]
        or projection["interval_end"] != route["interval_end"]
        or projection["service_method_keyset_sha256"] != EXPECTED_KEYSET_SHA256
        or projection["record_sha256"] != projection_digest
        or privacy["public_projection_sha256"] != projection_digest
        or privacy["public_projection_keyset_sha256"] != EXPECTED_PUBLIC_KEYSET_SHA256
        or any(
        privacy[field] is not True for field in (
            "raw_evidence_restricted", "identifier_fields_excluded",
            "request_response_metadata_excluded", "resource_name_excluded",
            "principal_subject_excluded",
        )
        )
    ):
        _fail("REJECT_PRIVACY_OR_BOUNDARY", "privacy projection gap")
    if (
        mapping["section_7_4_acceptance_node_id"] != OWNED_P07_NODES[0]
        or mapping["section_7_4_formula_sha256"] != "5c7ade7d5fae23259d6767bf6de549b69288b1810b15c32121a85acdd858854a"
        or mapping["bounded_audit_field_profile_sha256"] != mapping["record_bound_bounded_audit_field_profile_sha256"]
        or mapping["audit_universe_record_sha256"] != universe["record_sha256"]
        or mapping["audit_route_timeline_record_sha256"] != route["record_sha256"]
        or mapping["audit_delivery_completeness_record_sha256"] != delivery["record_sha256"]
        or mapping["audit_privacy_projection_record_sha256"] != privacy["record_sha256"]
        or mapping["exact_target_hash_match"] is not True
        or mapping["audit_status"] != "VERIFIED"
    ):
        _fail("REJECT_PARENT_TARGET_SOURCE_OR_OWNERSHIP", "audit mapping conflict")
    return EXPECTED_DECISION


def validate_contract(repo_root: Path | str) -> dict[str, Any]:
    root = Path(repo_root)
    contract = _load_object(_read_regular_file_once(root, CONTRACT_PATH, "contract"), "contract")
    vectors = _load_object(_read_regular_file_once(root, VECTORS_PATH, "vectors"), "vectors")
    sources: dict[str, dict[str, Any]] = {}
    for _owner, path, digest in EXPECTED_SOURCE_CONTRACTS:
        raw = _read_regular_file_once(root, path, "source contract")
        if _sha256(raw) != digest:
            _fail("REJECT_PARENT_TARGET_SOURCE_OR_OWNERSHIP", "source byte hash mismatch")
        sources[path] = _load_object(raw, "source contract")
    _validate_contract_shape(contract, sources)
    if set(vectors) != {"canonicalization_version", "schema_version", "valid_bundle"}:
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "vector envelope drift")
    if (
        vectors["canonicalization_version"] != "FT_CANONICAL_JSON_V1"
        or vectors["schema_version"] != "GCP_SECTION_7_5_4_CANONICALIZATION_VECTORS_V1"
    ):
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "vector version drift")
    validate_bundle(contract, vectors["valid_bundle"])
    return contract


def main() -> int:
    try:
        validate_contract(Path(__file__).resolve().parents[1])
    except AuditCompletenessValidationError:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
