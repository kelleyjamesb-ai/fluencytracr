#!/usr/bin/env python3
"""Verify the bounded Section 7.5.2 docs-only network-local contract."""

from __future__ import annotations

import copy
import hashlib
import json
import os
import re
import stat
import sys
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Any


CONTRACT_PATH = (
    "docs/contracts/canonical-inference-gcp-network-local-enforcement/"
    "network-local-enforcement-contract.json"
)
VECTORS_PATH = (
    "docs/contracts/canonical-inference-gcp-network-local-enforcement/"
    "canonicalization-vectors.json"
)
EXPECTED_DECISION = (
    "GCP_SECTION_7_5_2_NETWORK_LOCAL_CONTRACT_CLOSED_"
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
        "SECTION_7_5_1",
        "docs/contracts/canonical-inference-gcp-transport-persistence-constraints/"
        "section-7-5-1-parent-interface-closure-projection.json",
        "275dbfabae763830047950ccddf5557fc2d6b5f4fb80cda62e45971be9051414",
    ),
    (
        "SECTION_7_2",
        "docs/contracts/canonical-inference-gcp-runtime-object/"
        "runtime-object-contract.json",
        "450946eca205f190482b644ef02ad79547f44e1a0eb4689f1807123382516587",
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
)
OWNED_PREREQUISITES = ("S75A-P09", "S75A-P18")
OWNED_P07_NODES = (
    "trust_distribution_acceptance_hash",
    "channel_enforcement_acceptance_hash",
    "pre_quote_transport_acceptance_hash",
    "terminal_quote_transport_acceptance_hash",
    "kms_sign_transport_acceptance_hash",
)
EXCLUDED_P07_NODES = (
    "audit_mapping_acceptance_hash",
    "initial_section_7_4_replay_retention_acceptance_hash",
    "current_section_7_4_replay_retention_acceptance_hash",
    "final_consumer_replay_retention_acceptance_hash",
)
EXPECTED_SCHEMA_VERSIONS = (
    "GCP_SECTION_7_5_2_TRUST_DISTRIBUTION_ENFORCEMENT_RECORD_V1",
    "GCP_SECTION_7_5_2_CHANNEL_INTERVAL_ENFORCEMENT_RECORD_V1",
    "GCP_SECTION_7_5_2_QUOTE_TRANSPORT_ENFORCEMENT_RECORD_V1",
    "GCP_SECTION_7_5_2_KMS_SIGN_TRANSPORT_ENFORCEMENT_RECORD_V1",
    "GCP_SECTION_7_5_2_NETWORK_CONTROL_OBSERVATION_RECORD_V1",
    "GCP_SECTION_7_5_2_LOCAL_EPHEMERAL_ENFORCEMENT_RECORD_V1",
)
EXPECTED_CALLER_METHOD_IDS = ("KMS_ASYMMETRIC_SIGN", "STS_TOKEN_EXCHANGE")
EXPECTED_AUTHORITY_OPERATION_IDS = ("ASYMMETRIC_SIGN_ALLOW_DENY", "TOKEN_EXCHANGE")
EXPECTED_PRECEDENCE = (
    "PRIVACY_OR_BOUNDARY_REJECT",
    "PARENT_TARGET_OR_SOURCE_CONFLICT_REJECT",
    "SCHEMA_OR_CANONICALIZATION_REJECT",
    "AUTHENTICATION_OR_FRESHNESS_REJECT",
    "INTERVAL_COMPLETENESS_HOLD",
    "NETWORK_CHANNEL_OR_LOCAL_MECHANISM_HOLD",
    "APPROVAL_OR_EVIDENCE_ABSENT_HOLD",
    "CONTRACT_CLOSED_RUNTIME_AUTHORITY_HELD",
)
HEX_64 = re.compile(r"[0-9a-f]{64}\Z")
UTC_TIME = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\Z")


class NetworkLocalValidationError(ValueError):
    """Represent one fail-closed Section 7.5.2 validation result."""

    def __init__(self, code: str, detail: str) -> None:
        """Initialize a sanitized validation failure."""

        super().__init__(detail)
        self.code = code


def _fail(code: str, detail: str) -> None:
    """Raise a sanitized validation failure."""

    raise NetworkLocalValidationError(code, detail)


def _read_regular_file_once(root: Path, relative_path: str, label: str) -> bytes:
    """Read one descriptor-pinned regular file without following symlinks."""

    path = Path(relative_path)
    parts = path.parts
    if (
        path.is_absolute()
        or not parts
        or any(part in {"", ".", ".."} for part in parts)
        or not hasattr(os, "O_NOFOLLOW")
    ):
        _fail("REJECT_SCHEMA_OR_CANONICALIZATION", f"{label} is unreadable")
    opened: list[int] = []
    try:
        directory_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
        current = os.open(root, directory_flags)
        opened.append(current)
        for part in parts[:-1]:
            current = os.open(part, directory_flags, dir_fd=current)
            opened.append(current)
        file_descriptor = os.open(
            parts[-1],
            os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK,
            dir_fd=current,
        )
        opened.append(file_descriptor)
        if not stat.S_ISREG(os.fstat(file_descriptor).st_mode):
            raise OSError("not a regular file")
        chunks: list[bytes] = []
        while True:
            chunk = os.read(file_descriptor, 64 * 1024)
            if not chunk:
                return b"".join(chunks)
            chunks.append(chunk)
    except OSError as exc:
        raise NetworkLocalValidationError(
            "REJECT_SCHEMA_OR_CANONICALIZATION", f"{label} is unreadable"
        ) from exc
    finally:
        for descriptor in reversed(opened):
            try:
                os.close(descriptor)
            except OSError:
                pass


def _validate_canonical_value(value: Any) -> None:
    """Reject values outside the repository canonical JSON subset."""

    if value is None or isinstance(value, float):
        raise ValueError("null or float prohibited")
    if type(value) is int:
        if not -(2**63) <= value <= 2**63 - 1:
            raise ValueError("integer outside signed 64-bit range")
        return
    if type(value) is bool:
        return
    if isinstance(value, str):
        if unicodedata.normalize("NFC", value) != value:
            raise ValueError("non-NFC string")
        if any(unicodedata.category(character) in {"Cc", "Cs"} for character in value):
            raise ValueError("control or surrogate string")
        return
    if isinstance(value, list):
        for item in value:
            _validate_canonical_value(item)
        return
    if isinstance(value, dict):
        for key, item in value.items():
            if not isinstance(key, str):
                raise ValueError("non-string key")
            _validate_canonical_value(key)
            _validate_canonical_value(item)
        return
    raise ValueError("unsupported JSON value")


def _load_object(raw: bytes, label: str) -> dict[str, Any]:
    """Parse a canonical JSON object while rejecting duplicate keys."""

    try:
        def reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
            value: dict[str, Any] = {}
            for key, item in pairs:
                if key in value:
                    raise ValueError("duplicate JSON key")
                value[key] = item
            return value

        def parse_integer(token: str) -> int:
            if token == "-0":
                raise ValueError("negative zero")
            value = int(token)
            if not -(2**63) <= value <= 2**63 - 1:
                raise ValueError("integer outside signed 64-bit range")
            return value

        def reject_noninteger(token: str) -> float:
            raise ValueError(f"noninteger number: {token}")

        value = json.loads(
            raw.decode("utf-8"),
            object_pairs_hook=reject_duplicate_keys,
            parse_int=parse_integer,
            parse_float=reject_noninteger,
            parse_constant=reject_noninteger,
        )
        _validate_canonical_value(value)
    except (UnicodeError, json.JSONDecodeError, ValueError) as exc:
        raise NetworkLocalValidationError(
            "REJECT_SCHEMA_OR_CANONICALIZATION", f"{label} is unreadable"
        ) from exc
    if not isinstance(value, dict):
        _fail("REJECT_SCHEMA_OR_CANONICALIZATION", f"{label} must be an object")
    return value


def _sha256(raw: bytes) -> str:
    """Return a lowercase SHA-256 digest."""

    return hashlib.sha256(raw).hexdigest()


def _canonical_bytes(value: Any) -> bytes:
    """Encode a value using the frozen canonical JSON rules."""

    return json.dumps(
        value, ensure_ascii=False, separators=(",", ":"), sort_keys=True
    ).encode("utf-8")


def _validate_contract(contract: dict[str, Any], sources: dict[str, dict[str, Any]]) -> None:
    """Validate exact ownership, authority, source, and schema posture."""

    expected_top_keys = {
        "actual_evidence",
        "authority_effect",
        "canonicalization",
        "decision",
        "decision_precedence",
        "full_section_7_5_target_schema",
        "live_runtime",
        "network_method_contract",
        "privacy",
        "record_schemas",
        "runtime_evidence_registries",
        "schema_version",
        "scope",
        "section_7_4_clock_equality",
        "source_contracts",
    }
    if set(contract) != expected_top_keys:
        _fail("REJECT_SCHEMA_OR_CANONICALIZATION", "contract top-level shape drift")
    if contract["schema_version"] != (
        "GCP_SECTION_7_5_2_NETWORK_LOCAL_ENFORCEMENT_CONTRACT_V1"
    ):
        _fail("REJECT_SCHEMA_OR_CANONICALIZATION", "contract schema drift")
    if contract["decision"] != EXPECTED_DECISION:
        _fail("REJECT_AUTHORITY_SUBSTITUTION", "contract decision drift")
    if contract["authority_effect"] != "NONE":
        _fail("REJECT_AUTHORITY_SUBSTITUTION", "authority effect is not NONE")
    if contract["actual_evidence"] != {
        "approvals_present": False,
        "live_evidence_present": False,
        "runtime_records_present": False,
    }:
        _fail("REJECT_AUTHORITY_SUBSTITUTION", "actual evidence must remain absent")
    if any(contract["runtime_evidence_registries"].values()):
        _fail("REJECT_AUTHORITY_SUBSTITUTION", "runtime registries must remain empty")
    if set(contract["runtime_evidence_registries"]) != {
        "approval_records",
        "authentication_records",
        "enforcement_records",
        "freshness_records",
    }:
        _fail("REJECT_SCHEMA_OR_CANONICALIZATION", "runtime registry shape drift")
    if contract["live_runtime"] != {
        "command": "NOT_AUTHORIZED",
        "expected_exit": "NOT_RUN",
    }:
        _fail("REJECT_AUTHORITY_SUBSTITUTION", "live runtime posture drift")
    if tuple(contract["decision_precedence"]) != EXPECTED_PRECEDENCE:
        _fail("REJECT_SCHEMA_OR_CANONICALIZATION", "decision precedence drift")

    scope = contract["scope"]
    if set(scope) != {
        "excluded_p07_nodes",
        "immutable_registry",
        "owned_p07_nodes",
        "owned_prerequisite_ids",
        "registry_rows_owners_states_edges_unchanged",
    }:
        _fail("REJECT_SCHEMA_OR_CANONICALIZATION", "scope shape drift")
    if tuple(scope["owned_prerequisite_ids"]) != OWNED_PREREQUISITES:
        _fail("REJECT_OWNERSHIP_EXPANSION", "prerequisite ownership drift")
    if tuple(scope["owned_p07_nodes"]) != OWNED_P07_NODES:
        _fail("REJECT_OWNERSHIP_EXPANSION", "P07 owned-node drift")
    if tuple(scope["excluded_p07_nodes"]) != EXCLUDED_P07_NODES:
        _fail("REJECT_OWNERSHIP_EXPANSION", "P07 excluded-node drift")
    if scope["registry_rows_owners_states_edges_unchanged"] is not True:
        _fail("REJECT_OWNERSHIP_EXPANSION", "registry preservation drift")

    method_contract = contract["network_method_contract"]
    if set(method_contract) != {
        "caller_method_ids",
        "missing_duplicate_or_unknown_method",
        "source_authority_operation_ids",
    }:
        _fail("REJECT_SCHEMA_OR_CANONICALIZATION", "method contract shape drift")
    if tuple(method_contract["caller_method_ids"]) != EXPECTED_CALLER_METHOD_IDS:
        _fail("REJECT_AUTHENTICATION_OR_FRESHNESS", "caller method contract drift")
    if tuple(method_contract["source_authority_operation_ids"]) != (
        EXPECTED_AUTHORITY_OPERATION_IDS
    ) or method_contract["missing_duplicate_or_unknown_method"] != (
        "REJECT_AUTHENTICATION_OR_FRESHNESS"
    ):
        _fail("REJECT_PARENT_TARGET_OR_SOURCE_CONFLICT", "method authority binding drift")

    expected_sources = [
        {"owner": owner, "path": path, "sha256": digest}
        for owner, path, digest in EXPECTED_SOURCE_CONTRACTS
    ]
    if contract["source_contracts"] != expected_sources:
        _fail("REJECT_PARENT_TARGET_OR_SOURCE_CONFLICT", "source pin drift")

    registry = sources[EXPECTED_SOURCE_CONTRACTS[0][1]]
    rows = registry.get("open_prerequisite_registry")
    if not isinstance(rows, list) or len(rows) != 20:
        _fail("REJECT_OWNERSHIP_EXPANSION", "registry row cardinality drift")
    row_projection = {
        row.get("prerequisite_id"): (row.get("owner"), row.get("current_state"))
        for row in rows
    }
    expected_owned_rows = {
        "S75A-P07": ("FUTURE_FULL_SECTION_7_5_SECTION_7_4", "OPEN_BLOCKING"),
        "S75A-P09": ("FUTURE_FULL_SECTION_7_5", "OPEN_BLOCKING"),
        "S75A-P18": ("SECTION_7_3_FUTURE_FULL_SECTION_7_5", "OPEN_BLOCKING"),
    }
    if any(row_projection.get(key) != value for key, value in expected_owned_rows.items()):
        _fail("REJECT_OWNERSHIP_EXPANSION", "owned registry row drift")

    schemas = contract["record_schemas"]
    if not isinstance(schemas, list) or tuple(
        schema.get("schema_version") for schema in schemas
    ) != EXPECTED_SCHEMA_VERSIONS:
        _fail("REJECT_SCHEMA_OR_CANONICALIZATION", "record schema registry drift")
    common = {
        "schema_version",
        "target_binding_sha256",
        "observation_interval_start",
        "observation_interval_end",
        "authentication_verification_sha256",
        "freshness_anti_replay_sha256",
        "approved_section_7_5_contract_sha256",
        "record_sha256",
    }
    for schema in schemas:
        if set(schema) != {
            "domain_separator",
            "record_hash_field",
            "required_keys",
            "schema_version",
            "unknown_fields",
        }:
            _fail("REJECT_SCHEMA_OR_CANONICALIZATION", "record schema shape drift")
        if schema["unknown_fields"] != "REJECT":
            _fail("REJECT_SCHEMA_OR_CANONICALIZATION", "unknown fields not rejected")
        if schema["record_hash_field"] != "record_sha256":
            _fail("REJECT_SCHEMA_OR_CANONICALIZATION", "record hash field drift")
        if not common.issubset(set(schema["required_keys"])):
            _fail("REJECT_SCHEMA_OR_CANONICALIZATION", "common binding field missing")

    security_target = sources[EXPECTED_SOURCE_CONTRACTS[3][1]][
        "section_7_5_authority_admission_interface"
    ]["full_section_7_5_target_schema"]
    attestation_target = sources[EXPECTED_SOURCE_CONTRACTS[4][1]][
        "section_7_5_external_approval_interface"
    ]["full_section_7_5_target_schema"]
    target = contract["full_section_7_5_target_schema"]
    if set(target) != {
        "candidate_bytes_required_before_hash_admission",
        "canonicalization_version",
        "contract_domain_separator",
        "contract_kind",
        "contract_schema_version",
        "required_record_keys",
        "section_7_5a_substitution",
    }:
        _fail("REJECT_SCHEMA_OR_CANONICALIZATION", "target schema shape drift")
    for field in (
        "candidate_bytes_required_before_hash_admission",
        "canonicalization_version",
        "contract_kind",
        "contract_schema_version",
        "required_record_keys",
        "section_7_5a_substitution",
    ):
        if target[field] != security_target[field] or target[field] != attestation_target[field]:
            _fail("REJECT_PARENT_TARGET_OR_SOURCE_CONFLICT", "parent target schema mismatch")
    if target["contract_domain_separator"] != security_target["domain_separator"]:
        _fail("REJECT_PARENT_TARGET_OR_SOURCE_CONFLICT", "target domain mismatch")
    acceptance_nodes = sources[EXPECTED_SOURCE_CONTRACTS[4][1]][
        "section_7_5_external_approval_interface"
    ]["acceptance_node_conjunction_schema"]["acceptance_node_ids"]
    if tuple(acceptance_nodes) != OWNED_P07_NODES + EXCLUDED_P07_NODES:
        _fail("REJECT_PARENT_TARGET_OR_SOURCE_CONFLICT", "Section 7.4 node universe drift")

    authority_operations = sources[EXPECTED_SOURCE_CONTRACTS[3][1]][
        "audit_evidence_interface"
    ]["required_authority_operation_ids"]
    if not set(EXPECTED_AUTHORITY_OPERATION_IDS).issubset(set(authority_operations)):
        _fail("REJECT_PARENT_TARGET_OR_SOURCE_CONFLICT", "authority operation binding drift")


def _validate_time(value: Any, label: str) -> datetime:
    """Validate the exact UTC second timestamp representation."""

    if not isinstance(value, str) or UTC_TIME.fullmatch(value) is None:
        _fail("REJECT_SCHEMA_OR_CANONICALIZATION", f"{label} is not canonical UTC")
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _validate_record(record: dict[str, Any], schema: dict[str, Any]) -> None:
    """Validate one closed record and its domain-separated record hash."""

    required = schema["required_keys"]
    if set(record) != set(required):
        privacy_keys = {
            "runtime_authority",
            "user_id",
            "email",
            "project_id",
            "resource_name",
            "raw_token",
            "raw_quote",
            "certificate_bytes",
            "credential",
        }
        code = (
            "REJECT_PRIVACY_OR_BOUNDARY"
            if privacy_keys.intersection(record)
            else "REJECT_SCHEMA_OR_CANONICALIZATION"
        )
        _fail(code, "record fields differ from closed schema")
    if list(record) != sorted(record):
        _fail("REJECT_SCHEMA_OR_CANONICALIZATION", "record keys are not canonical")
    if record["schema_version"] != schema["schema_version"]:
        _fail("REJECT_SCHEMA_OR_CANONICALIZATION", "record schema version mismatch")
    for key, value in record.items():
        if key.endswith("sha256"):
            if not isinstance(value, str) or HEX_64.fullmatch(value) is None:
                _fail("REJECT_SCHEMA_OR_CANONICALIZATION", "noncanonical SHA-256")
        if key.endswith("_full_interval") or key in {
            "exact_target_match",
            "caller_method_authentication_complete",
            "tls_target_certificate_binding_verified",
            "uds_only_local_delivery",
            "no_relay_process",
            "exact_wire_match",
            "measured_context_match",
            "binder_owned_send",
            "dns_observation_complete",
            "firewall_observation_complete",
            "route_observation_complete",
            "perimeter_observation_complete",
        }:
            if type(value) is not bool:
                _fail("REJECT_SCHEMA_OR_CANONICALIZATION", "boolean alias rejected")
    start = _validate_time(record["observation_interval_start"], "interval start")
    end = _validate_time(record["observation_interval_end"], "interval end")
    if start >= end:
        _fail("HOLD_INTERVAL_COMPLETENESS", "invalid observation interval")

    body = {key: value for key, value in record.items() if key != "record_sha256"}
    preimage = schema["domain_separator"].encode("ascii") + b"\x00" + _canonical_bytes(body)
    if record["record_sha256"] != _sha256(preimage):
        _fail("REJECT_SCHEMA_OR_CANONICALIZATION", "record hash mismatch")


def validate_bundle(
    contract: dict[str, Any], bundle: dict[str, Any]
) -> str:
    """Validate one synthetic structural bundle and return the held decision."""

    if set(bundle) != {"claimed_p07_nodes", "records", "token_freshness_interface"}:
        _fail("REJECT_SCHEMA_OR_CANONICALIZATION", "bundle shape drift")
    claimed = bundle["claimed_p07_nodes"]
    if not isinstance(claimed, list) or tuple(claimed) != OWNED_P07_NODES:
        _fail("REJECT_OWNERSHIP_EXPANSION", "claimed P07 ownership drift")
    records = bundle["records"]
    if not isinstance(records, list) or len(records) != 7:
        _fail("REJECT_SCHEMA_OR_CANONICALIZATION", "record cardinality drift")
    schemas = {item["schema_version"]: item for item in contract["record_schemas"]}
    expected_sequence = (
        EXPECTED_SCHEMA_VERSIONS[0],
        EXPECTED_SCHEMA_VERSIONS[1],
        EXPECTED_SCHEMA_VERSIONS[2],
        EXPECTED_SCHEMA_VERSIONS[2],
        EXPECTED_SCHEMA_VERSIONS[3],
        EXPECTED_SCHEMA_VERSIONS[4],
        EXPECTED_SCHEMA_VERSIONS[5],
    )
    if tuple(record.get("schema_version") for record in records) != expected_sequence:
        _fail("REJECT_SCHEMA_OR_CANONICALIZATION", "record sequence drift")
    for record in records:
        _validate_record(record, schemas[record["schema_version"]])

    targets = {record["target_binding_sha256"] for record in records}
    approved = {record["approved_section_7_5_contract_sha256"] for record in records}
    intervals = {
        (record["observation_interval_start"], record["observation_interval_end"])
        for record in records
    }
    if len(targets) != 1 or len(approved) != 1:
        _fail("REJECT_PARENT_TARGET_OR_SOURCE_CONFLICT", "target or contract conflict")
    if len(intervals) != 1:
        _fail("HOLD_INTERVAL_COMPLETENESS", "whole-interval coverage conflict")

    trust = records[0]
    token = bundle["token_freshness_interface"]
    if set(token) != {
        "section_7_5_trust_record_verified_at",
        "trusted_utc_clock_policy_sha256",
    }:
        _fail("REJECT_SCHEMA_OR_CANONICALIZATION", "token freshness shape drift")
    verified_at = _validate_time(
        trust["section_7_5_trust_record_verified_at"], "trust verification time"
    )
    start = _validate_time(trust["observation_interval_start"], "interval start")
    end = _validate_time(trust["observation_interval_end"], "interval end")
    if not start <= verified_at <= end:
        _fail("REJECT_AUTHENTICATION_OR_FRESHNESS", "trust time outside interval")
    if (
        trust["section_7_5_trust_record_verified_at"]
        != token["section_7_5_trust_record_verified_at"]
        or trust["trusted_utc_clock_policy_sha256"]
        != token["trusted_utc_clock_policy_sha256"]
    ):
        _fail("REJECT_AUTHENTICATION_OR_FRESHNESS", "Section 7.4 clock mismatch")

    required_true = {
        0: ("exact_target_match",),
        1: (
            "private_ingress_full_interval",
            "private_egress_full_interval",
            "uds_only_local_delivery",
            "no_relay_process",
            "caller_method_authentication_complete",
            "tls_target_certificate_binding_verified",
        ),
        2: ("exact_wire_match",),
        3: ("exact_wire_match",),
        4: ("measured_context_match", "binder_owned_send", "no_relay_process"),
        5: (
            "dns_observation_complete",
            "firewall_observation_complete",
            "route_observation_complete",
            "perimeter_observation_complete",
        ),
        6: (
            "disk_policy_approved_full_interval",
            "tmpfs_only_full_interval",
            "swap_disabled_full_interval",
            "prohibited_logging_disabled_full_interval",
            "unapproved_local_persistence_absent_full_interval",
        ),
    }
    for index, fields in required_true.items():
        if any(records[index][field] is not True for field in fields):
            _fail("HOLD_NETWORK_CHANNEL_OR_LOCAL_MECHANISM", "mechanism proof absent")
    if records[2]["transport_phase"] != "PRE_EXECUTION" or records[3]["transport_phase"] != "TERMINAL":
        _fail("REJECT_SCHEMA_OR_CANONICALIZATION", "quote phase drift")
    for record in records[2:4]:
        if record["expected_wire_request_sha256"] != record["recomputed_wire_request_sha256"]:
            _fail("REJECT_PARENT_TARGET_OR_SOURCE_CONFLICT", "quote wire mismatch")
    if records[4]["expected_wire_request_sha256"] != records[4]["recomputed_wire_request_sha256"]:
        _fail("REJECT_PARENT_TARGET_OR_SOURCE_CONFLICT", "KMS wire mismatch")
    methods = records[5]["caller_method_ids"]
    if not isinstance(methods, list) or tuple(methods) != EXPECTED_CALLER_METHOD_IDS:
        _fail("REJECT_AUTHENTICATION_OR_FRESHNESS", "caller method map incomplete")
    return EXPECTED_DECISION


def _apply_mutation(
    contract: dict[str, Any], bundle: dict[str, Any], mutation: dict[str, Any]
) -> dict[str, Any]:
    """Apply one declared adversarial vector without implicit behavior."""

    changed = copy.deepcopy(bundle)
    index = mutation["record_index"]
    if index == -1:
        changed[mutation["field"]] = mutation["value"]
    else:
        record = changed["records"][index]
        record[mutation["field"]] = mutation["value"]
        schemas = {
            item["schema_version"]: item for item in contract["record_schemas"]
        }
        schema = schemas[record["schema_version"]]
        body = {key: value for key, value in record.items() if key != "record_sha256"}
        preimage = (
            schema["domain_separator"].encode("ascii")
            + b"\x00"
            + _canonical_bytes(body)
        )
        record["record_sha256"] = _sha256(preimage)
    return changed


def validate_contract(repo_root: Path | str) -> dict[str, Any]:
    """Validate all exact source bytes, contract structure, and vectors."""

    root = Path(repo_root)
    contract = _load_object(
        _read_regular_file_once(root, CONTRACT_PATH, "contract"), "contract"
    )
    vectors = _load_object(
        _read_regular_file_once(root, VECTORS_PATH, "vectors"), "vectors"
    )
    sources: dict[str, dict[str, Any]] = {}
    for _owner, relative_path, expected_digest in EXPECTED_SOURCE_CONTRACTS:
        raw = _read_regular_file_once(root, relative_path, "source contract")
        if _sha256(raw) != expected_digest:
            _fail("REJECT_PARENT_TARGET_OR_SOURCE_CONFLICT", "source byte hash mismatch")
        sources[relative_path] = _load_object(raw, "source contract")
    _validate_contract(contract, sources)
    if vectors.get("schema_version") != (
        "GCP_SECTION_7_5_2_CANONICALIZATION_VECTORS_V1"
    ) or vectors.get("canonicalization_version") != "FT_CANONICAL_JSON_V1":
        _fail("REJECT_SCHEMA_OR_CANONICALIZATION", "vector envelope drift")
    valid_bundle = vectors.get("valid_bundle")
    mutations = vectors.get("mutations")
    if not isinstance(valid_bundle, dict) or not isinstance(mutations, list):
        _fail("REJECT_SCHEMA_OR_CANONICALIZATION", "vector payload drift")
    if validate_bundle(contract, valid_bundle) != EXPECTED_DECISION:
        _fail("REJECT_AUTHORITY_SUBSTITUTION", "valid vector decision drift")
    for mutation in mutations:
        try:
            validate_bundle(
                contract, _apply_mutation(contract, valid_bundle, mutation)
            )
        except NetworkLocalValidationError as exc:
            if exc.code != mutation.get("expected"):
                _fail("REJECT_SCHEMA_OR_CANONICALIZATION", "mutation result drift")
        else:
            _fail("REJECT_SCHEMA_OR_CANONICALIZATION", "mutation was accepted")
    return contract


def main() -> int:
    """Run silently and return nonzero on any contract failure."""

    try:
        validate_contract(Path(__file__).resolve().parents[1])
    except NetworkLocalValidationError:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
