#!/usr/bin/env python3
"""Verify the bounded Section 7.5.3 docs-only persistence contract."""

from __future__ import annotations

import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

try:
    from scripts.verify_gcp_section_7_5_2_network_local_enforcement import (
        NetworkLocalValidationError as PersistenceAnchorValidationError,
        _canonical_bytes,
        _load_object,
        _read_regular_file_once,
        _sha256,
    )
except ModuleNotFoundError:  # Direct script execution places scripts/ on sys.path.
    from verify_gcp_section_7_5_2_network_local_enforcement import (
        NetworkLocalValidationError as PersistenceAnchorValidationError,
        _canonical_bytes,
        _load_object,
        _read_regular_file_once,
        _sha256,
    )


CONTRACT_PATH = (
    "docs/contracts/canonical-inference-gcp-persistence-anchor/"
    "persistence-anchor-contract.json"
)
VECTORS_PATH = (
    "docs/contracts/canonical-inference-gcp-persistence-anchor/"
    "canonicalization-vectors.json"
)
EXPECTED_DECISION = (
    "GCP_SECTION_7_5_3_PERSISTENCE_ANCHOR_CONTRACT_CLOSED_"
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
        "SECTION_7_5_2",
        "docs/contracts/canonical-inference-gcp-network-local-enforcement/"
        "network-local-enforcement-contract.json",
        "17d33abb3ef88f04e6f08f875166204400de59721a37eaa6c12faafc1477b4c0",
    ),
)
OWNED_PREREQUISITES = ("S75A-P04", "S75A-P10", "S75A-P11")
OWNED_P07_NODES = (
    "initial_section_7_4_replay_retention_acceptance_hash",
    "current_section_7_4_replay_retention_acceptance_hash",
    "final_consumer_replay_retention_acceptance_hash",
)
EXCLUDED_P07_NODES = (
    "trust_distribution_acceptance_hash",
    "channel_enforcement_acceptance_hash",
    "pre_quote_transport_acceptance_hash",
    "terminal_quote_transport_acceptance_hash",
    "kms_sign_transport_acceptance_hash",
    "audit_mapping_acceptance_hash",
)
EXPECTED_SCHEMAS = (
    "GCP_SECTION_7_5_3_CHECKPOINT_RECORD_V1",
    "GCP_SECTION_7_5_3_GCS_IMMUTABLE_OBJECT_RECORD_V1",
    "GCP_SECTION_7_5_3_SPANNER_TRANSACTION_RECORD_V1",
    "GCP_SECTION_7_5_3_INDEPENDENT_ANCHOR_RECORD_V1",
    "GCP_SECTION_7_5_3_INITIAL_REPLAY_RETENTION_RECORD_V1",
    "GCP_SECTION_7_5_3_CURRENT_REPLAY_RETENTION_RECORD_V1",
    "GCP_SECTION_7_5_3_FINAL_REPLAY_RETENTION_RECORD_V1",
)
EXPECTED_SCHEMA_CONTRACTS = (
    (
        EXPECTED_SCHEMAS[0],
        "FLUENCYTRACR:GCP_SECTION_7_5_3:CHECKPOINT:V1",
        (
            "schema_version", "target_binding_sha256",
            "approved_section_7_5_contract_sha256", "checkpoint_identity_sha256",
            "predecessor_checkpoint_sha256", "predecessor_sequence_number",
            "sequence_number", "state_sha256", "gcs_object_record_sha256",
            "spanner_transaction_record_sha256", "anchor_record_sha256",
            "created_at", "record_sha256",
        ),
    ),
    (
        EXPECTED_SCHEMAS[1],
        "FLUENCYTRACR:GCP_SECTION_7_5_3:GCS_IMMUTABLE_OBJECT:V1",
        (
            "schema_version", "target_binding_sha256",
            "approved_section_7_5_contract_sha256", "bucket_policy_sha256",
            "bucket_incarnation_sha256", "object_identity_sha256", "generation",
            "metageneration", "content_sha256", "byte_length",
            "retention_guaranteed_until", "bucket_lock_enabled", "ubla_enabled",
            "pap_enforced", "region_policy_sha256", "cmek_policy_sha256",
            "if_generation_match", "no_replacement", "history_scope",
            "record_sha256",
        ),
    ),
    (
        EXPECTED_SCHEMAS[2],
        "FLUENCYTRACR:GCP_SECTION_7_5_3:SPANNER_TRANSACTION:V1",
        (
            "schema_version", "target_binding_sha256",
            "approved_section_7_5_contract_sha256", "transaction_identity_sha256",
            "idempotency_key_sha256", "previously_begun_transaction",
            "serializable_read_write", "transport_retry_prohibited",
            "commit_outcome", "provider_commit_timestamp",
            "unknown_commit_resolution", "record_sha256",
        ),
    ),
    (
        EXPECTED_SCHEMAS[3],
        "FLUENCYTRACR:GCP_SECTION_7_5_3:INDEPENDENT_ANCHOR:V1",
        (
            "schema_version", "target_binding_sha256",
            "approved_section_7_5_contract_sha256", "checkpoint_state_sha256",
            "current_head_sha256", "predecessor_head_sha256",
            "authentication_verification_sha256", "freshness_anti_replay_sha256",
            "observed_at", "nonrollbackable", "linearizable_check_and_use",
            "stale_reader_rejected", "whole_state_restore_detected",
            "before_commit_recovery_verified", "after_commit_recovery_verified",
            "record_sha256",
        ),
    ),
    (
        EXPECTED_SCHEMAS[4],
        "FLUENCYTRACR:GCP_SECTION_7_5_3:INITIAL_REPLAY_RETENTION:V1",
        (
            "schema_version", "target_binding_sha256",
            "approved_section_7_5_contract_sha256", "section_7_4_acceptance_node_id",
            "section_7_4_formula_sha256", "replay_manifest_sha256",
            "record_bound_replay_manifest_sha256", "challenge_sha256",
            "record_bound_challenge_sha256", "challenge_issued_at",
            "challenge_expires_at", "authentication_verification_sha256",
            "anti_replay_consumption_sha256", "retrieval_transcript_sha256",
            "durable_retention_policy_verification_sha256",
            "retrieval_and_completeness_verification_sha256", "verified_at",
            "gcs_object_record_sha256", "all_required_bytes_retrieved",
            "exact_target_and_challenge_match", "retention_guaranteed_until",
            "immutable_append_only_storage_policy_sha256", "retention_status",
            "record_sha256",
        ),
    ),
    (
        EXPECTED_SCHEMAS[5],
        "FLUENCYTRACR:GCP_SECTION_7_5_3:CURRENT_REPLAY_RETENTION:V1",
        (
            "schema_version", "target_binding_sha256",
            "approved_section_7_5_contract_sha256", "section_7_4_acceptance_node_id",
            "section_7_4_formula_sha256", "replay_manifest_sha256",
            "record_bound_replay_manifest_sha256", "challenge_sha256",
            "record_bound_challenge_sha256", "challenge_issued_at",
            "challenge_expires_at", "authentication_verification_sha256",
            "anti_replay_consumption_sha256", "retrieval_transcript_sha256",
            "durable_retention_policy_verification_sha256",
            "retrieval_and_completeness_verification_sha256", "verified_at",
            "gcs_object_record_sha256", "all_manifest_bytes_retrieved_now",
            "all_nested_attestation_evidence_bytes_retrieved_now",
            "all_historical_record_bundles_retrieved_now",
            "exact_target_and_challenge_match", "retention_guaranteed_until",
            "immutable_append_only_storage_policy_sha256", "retention_status",
            "record_sha256",
        ),
    ),
    (
        EXPECTED_SCHEMAS[6],
        "FLUENCYTRACR:GCP_SECTION_7_5_3:FINAL_REPLAY_RETENTION:V1",
        (
            "schema_version", "target_binding_sha256",
            "approved_section_7_5_contract_sha256", "section_7_4_acceptance_node_id",
            "section_7_4_formula_sha256", "replay_manifest_sha256",
            "record_bound_replay_manifest_sha256", "challenge_sha256",
            "record_bound_challenge_sha256", "challenge_issued_at",
            "challenge_expires_at", "authentication_verification_sha256",
            "anti_replay_consumption_sha256", "retrieval_transcript_sha256",
            "transitive_section_7_4_member_retrieval_transcript_sha256",
            "durable_retention_policy_verification_sha256",
            "retrieval_and_completeness_verification_sha256", "verified_at",
            "gcs_object_record_sha256", "all_manifest_bytes_retrieved_now",
            "all_nested_section_7_4_evidence_bytes_retrieved_now",
            "section_7_6_terminal_proof_bundle_retrieved_now",
            "current_replay_policy_bundle_retrieved_now",
            "exact_target_and_challenge_match", "retention_guaranteed_until",
            "immutable_append_only_storage_policy_sha256", "retention_status",
            "record_sha256",
        ),
    ),
)
FORBIDDEN_SECTION_7_6 = (
    "ATTEMPT_RESERVATION",
    "ATTEMPT_CONSUMPTION",
    "ATTEMPT_CRASH_STATE",
    "RETRY_ELIGIBILITY",
    "RETRY_TOKEN",
    "TERMINAL_STATE",
    "TERMINAL_PRECEDENCE",
)
HEX_64 = re.compile(r"[0-9a-f]{64}\Z")
UTC_TIME = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\Z")


def _fail(code: str, detail: str) -> None:
    """Raise one sanitized fail-closed result."""

    raise PersistenceAnchorValidationError(code, detail)


def _time(value: Any, label: str) -> datetime:
    """Parse one canonical UTC-second timestamp."""

    if not isinstance(value, str) or UTC_TIME.fullmatch(value) is None:
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", f"{label} is not canonical")
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _validate_record(record: dict[str, Any], schema: dict[str, Any]) -> None:
    """Validate one closed record and its exact record hash."""

    if not isinstance(record, dict):
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "record must be an object")
    required = schema["required_keys"]
    if set(record) != set(required):
        forbidden = {
            "attempt_reservation",
            "retry_token",
            "retry_eligible",
            "terminal_state",
            "user_id",
            "email",
            "resource_name",
            "credential",
        }
        code = (
            "REJECT_PRIVACY_OR_BOUNDARY"
            if forbidden.intersection(record)
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
            "bucket_lock_enabled",
            "ubla_enabled",
            "pap_enforced",
            "no_replacement",
            "previously_begun_transaction",
            "serializable_read_write",
            "transport_retry_prohibited",
            "nonrollbackable",
            "linearizable_check_and_use",
            "stale_reader_rejected",
            "whole_state_restore_detected",
            "before_commit_recovery_verified",
            "after_commit_recovery_verified",
            "all_required_bytes_retrieved",
            "all_manifest_bytes_retrieved_now",
            "all_nested_attestation_evidence_bytes_retrieved_now",
            "all_historical_record_bundles_retrieved_now",
            "all_nested_section_7_4_evidence_bytes_retrieved_now",
            "section_7_6_terminal_proof_bundle_retrieved_now",
            "current_replay_policy_bundle_retrieved_now",
            "exact_target_and_challenge_match",
        } and type(value) is not bool:
            _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "Boolean alias rejected")
    body = {key: value for key, value in record.items() if key != "record_sha256"}
    preimage = schema["domain_separator"].encode("ascii") + b"\x00" + _canonical_bytes(body)
    if record["record_sha256"] != _sha256(preimage):
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "record hash mismatch")


def _validate_contract_shape(
    contract: dict[str, Any], sources: dict[str, dict[str, Any]]
) -> None:
    """Validate exact scope, pins, ownership, and nonauthorization."""

    expected_keys = {
        "actual_evidence",
        "authority_effect",
        "canonicalization_version",
        "checkpoint_mechanics",
        "decision",
        "decision_precedence",
        "forbidden_section_7_6_semantics",
        "gcs_mechanics",
        "live_runtime",
        "record_schemas",
        "runtime_evidence_registries",
        "schema_version",
        "scope",
        "source_contracts",
        "spanner_mechanics",
    }
    if set(contract) != expected_keys:
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "contract shape drift")
    if contract["decision"] != EXPECTED_DECISION or contract["authority_effect"] != "NONE":
        _fail("REJECT_AUTHORITY_SUBSTITUTION", "decision or authority drift")
    if (
        contract["schema_version"]
        != "GCP_SECTION_7_5_3_PERSISTENCE_ANCHOR_CONTRACT_V1"
        or contract["canonicalization_version"] != "FT_CANONICAL_JSON_V1"
        or contract["decision_precedence"]
        != [
            "PRIVACY_OR_BOUNDARY_REJECT",
            "PARENT_TARGET_SOURCE_OR_OWNERSHIP_REJECT",
            "SCHEMA_CANONICALIZATION_OR_HASH_REJECT",
            "AUTHENTICATION_FRESHNESS_OR_CURRENTNESS_REJECT",
            "FORK_REPLACEMENT_OR_RETRY_REJECT",
            "RETENTION_TRANSACTION_OR_ANCHOR_MECHANISM_HOLD",
            "APPROVAL_OR_EVIDENCE_ABSENT_HOLD",
            "CONTRACT_CLOSED_RUNTIME_AUTHORITY_HELD",
        ]
    ):
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "contract version or precedence drift")
    expected_registries = {
        "anchor_records": [],
        "approval_records": [],
        "checkpoint_records": [],
        "gcs_records": [],
        "replay_retention_records": [],
        "spanner_records": [],
    }
    if contract["actual_evidence"] != {
        "approvals_present": False,
        "live_evidence_present": False,
        "runtime_records_present": False,
    } or contract["runtime_evidence_registries"] != expected_registries:
        _fail("REJECT_AUTHORITY_SUBSTITUTION", "runtime evidence must remain absent")
    if contract["live_runtime"] != {"command": "NOT_AUTHORIZED", "expected_exit": "NOT_RUN"}:
        _fail("REJECT_AUTHORITY_SUBSTITUTION", "live runtime posture drift")
    if tuple(contract["forbidden_section_7_6_semantics"]) != FORBIDDEN_SECTION_7_6:
        _fail("REJECT_OWNERSHIP_EXPANSION", "Section 7.6 exclusion drift")
    if contract["checkpoint_mechanics"] != {
        "concurrency": "SERIALIZABLE_SINGLE_SUCCESSOR",
        "currentness": "AUTHENTICATED_CURRENT_HEAD_REQUIRED",
        "fork": "REJECT",
        "predecessor": "EXACT_PREVIOUS_HEAD_AND_SEQUENCE_PLUS_ONE",
        "restore": "WHOLE_STATE_RESTORE_DETECT_AND_HOLD",
        "shared_check_and_use": "LINEARIZABLE",
        "stale_reader": "REJECT",
    }:
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "checkpoint mechanics drift")
    if contract["gcs_mechanics"] != {
        "history_scope": "ACTIVE_NONCURRENT_SOFT_DELETED_DECLARED",
        "no_replacement": True,
        "required_controls": [
            "BUCKET_LOCK",
            "RETENTION_POLICY",
            "UNIFORM_BUCKET_LEVEL_ACCESS",
            "PUBLIC_ACCESS_PREVENTION_ENFORCED",
            "EXACT_REGION",
            "CMEK",
            "BUCKET_INCARNATION",
            "IF_GENERATION_MATCH_ZERO",
            "EXACT_GENERATION_METAGENERATION_BYTES_HASH_LENGTH",
        ],
    }:
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "GCS mechanics drift")
    if contract["spanner_mechanics"] != {
        "commit_timestamp": "PROVIDER_ASSIGNED_NOT_UNIQUENESS_KEY",
        "idempotence": "EXACT_IDEMPOTENCY_KEY_REREAD",
        "transaction": "PREVIOUSLY_BEGUN_SERIALIZABLE_READ_WRITE",
        "transport_retry": "PROHIBITED",
        "unknown_commit": "REREAD_BY_IDEMPOTENCY_KEY_NO_BLIND_RETRY",
    }:
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "Spanner mechanics drift")
    scope = contract["scope"]
    if not isinstance(scope, dict) or set(scope) != {
        "excluded_p07_nodes",
        "owned_p07_nodes",
        "owned_prerequisite_ids",
        "p19_owned_portion",
        "registry_rows_owners_states_edges_unchanged",
    }:
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "scope shape drift")
    if (
        tuple(scope["owned_prerequisite_ids"]) != OWNED_PREREQUISITES
        or tuple(scope["owned_p07_nodes"]) != OWNED_P07_NODES
        or tuple(scope["excluded_p07_nodes"]) != EXCLUDED_P07_NODES
        or scope["p19_owned_portion"] != "SECTION_7_5_MECHANISM_ONLY"
        or scope["registry_rows_owners_states_edges_unchanged"] is not True
    ):
        _fail("REJECT_OWNERSHIP_EXPANSION", "scope ownership drift")
    expected_sources = [
        {"owner": owner, "path": path, "sha256": digest}
        for owner, path, digest in EXPECTED_SOURCE_CONTRACTS
    ]
    if contract["source_contracts"] != expected_sources:
        _fail("REJECT_PARENT_TARGET_SOURCE_OR_OWNERSHIP", "source pin drift")
    schemas = contract["record_schemas"]
    if (
        not isinstance(schemas, list)
        or len(schemas) != len(EXPECTED_SCHEMAS)
        or any(not isinstance(item, dict) for item in schemas)
        or tuple(item.get("schema_version") for item in schemas) != EXPECTED_SCHEMAS
    ):
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "schema registry drift")
    for schema, (version, separator, required_keys) in zip(
        schemas, EXPECTED_SCHEMA_CONTRACTS, strict=True
    ):
        if set(schema) != {"domain_separator", "required_keys", "schema_version", "unknown_fields"}:
            _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "nested schema shape drift")
        if (
            schema["schema_version"] != version
            or schema["domain_separator"] != separator
            or tuple(schema["required_keys"]) != required_keys
            or schema["unknown_fields"] != "REJECT"
        ):
            _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "schema closure drift")

    registry = sources[EXPECTED_SOURCE_CONTRACTS[0][1]]
    rows = {row["prerequisite_id"]: row for row in registry["open_prerequisite_registry"]}
    expected_owners = {
        "S75A-P04": "FUTURE_FULL_SECTION_7_5",
        "S75A-P07": "FUTURE_FULL_SECTION_7_5_SECTION_7_4",
        "S75A-P10": "FUTURE_FULL_SECTION_7_5",
        "S75A-P11": "FUTURE_FULL_SECTION_7_5",
        "S75A-P19": "SECTION_7_3_FUTURE_FULL_SECTION_7_5_SECTION_7_4",
    }
    if len(rows) != 20 or any(
        rows[key]["owner"] != owner or rows[key]["current_state"] != "OPEN_BLOCKING"
        for key, owner in expected_owners.items()
    ):
        _fail("REJECT_OWNERSHIP_EXPANSION", "registry owner or state drift")
    nodes = sources[EXPECTED_SOURCE_CONTRACTS[2][1]][
        "section_7_5_external_approval_interface"
    ]["acceptance_node_conjunction_schema"]["acceptance_node_ids"]
    if tuple(nodes) != EXCLUDED_P07_NODES[:5] + (EXCLUDED_P07_NODES[5],) + OWNED_P07_NODES:
        _fail("REJECT_PARENT_TARGET_SOURCE_OR_OWNERSHIP", "P07 universe drift")


def validate_bundle(contract: dict[str, Any], bundle: dict[str, Any]) -> str:
    """Validate one synthetic persistence/anchor structural bundle."""

    if not isinstance(bundle, dict) or set(bundle) != {"claimed_p07_nodes", "records"}:
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "bundle shape drift")
    if tuple(bundle["claimed_p07_nodes"]) != OWNED_P07_NODES:
        _fail("REJECT_OWNERSHIP_EXPANSION", "claimed P07 ownership drift")
    records = bundle["records"]
    expected_sequence = EXPECTED_SCHEMAS
    if (
        not isinstance(records, list)
        or len(records) != len(expected_sequence)
        or any(not isinstance(record, dict) for record in records)
        or tuple(record.get("schema_version") for record in records)
        != expected_sequence
    ):
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "record sequence drift")
    schemas = {item["schema_version"]: item for item in contract["record_schemas"]}
    for record in records:
        _validate_record(record, schemas[record["schema_version"]])
    if len({record["target_binding_sha256"] for record in records}) != 1 or len(
        {record["approved_section_7_5_contract_sha256"] for record in records}
    ) != 1:
        _fail("REJECT_PARENT_TARGET_SOURCE_OR_OWNERSHIP", "target or contract conflict")

    checkpoint, gcs, spanner, anchor, *retention = records
    if (
        checkpoint["gcs_object_record_sha256"] != gcs["record_sha256"]
        or checkpoint["spanner_transaction_record_sha256"] != spanner["record_sha256"]
        or checkpoint["anchor_record_sha256"] != anchor["record_sha256"]
        or anchor["checkpoint_state_sha256"] != checkpoint["state_sha256"]
        or anchor["current_head_sha256"] != checkpoint["checkpoint_identity_sha256"]
        or anchor["predecessor_head_sha256"] != checkpoint["predecessor_checkpoint_sha256"]
    ):
        _fail("REJECT_AUTHENTICATION_FRESHNESS_OR_CURRENTNESS", "checkpoint lineage conflict")
    if (
        type(checkpoint["sequence_number"]) is not int
        or type(checkpoint["predecessor_sequence_number"]) is not int
        or checkpoint["sequence_number"] != checkpoint["predecessor_sequence_number"] + 1
        or checkpoint["sequence_number"] < 1
    ):
        _fail("REJECT_FORK_REPLACEMENT_OR_RETRY", "checkpoint sequence or predecessor drift")
    _time(checkpoint["created_at"], "checkpoint creation")

    gcs_true = ("bucket_lock_enabled", "ubla_enabled", "pap_enforced", "no_replacement")
    if (
        any(gcs[field] is not True for field in gcs_true)
        or type(gcs["if_generation_match"]) is not int
        or gcs["if_generation_match"] != 0
    ):
        _fail("REJECT_FORK_REPLACEMENT_OR_RETRY", "GCS replacement control drift")
    if (
        type(gcs["generation"]) is not int
        or type(gcs["metageneration"]) is not int
        or type(gcs["byte_length"]) is not int
        or min(gcs["generation"], gcs["metageneration"], gcs["byte_length"]) < 1
        or gcs["history_scope"] != "ACTIVE_NONCURRENT_SOFT_DELETED_DECLARED"
    ):
        _fail("HOLD_RETENTION_TRANSACTION_OR_ANCHOR_MECHANISM", "GCS evidence incomplete")
    gcs_until = _time(gcs["retention_guaranteed_until"], "GCS retention")

    if (
        spanner["previously_begun_transaction"] is not True
        or spanner["serializable_read_write"] is not True
        or spanner["transport_retry_prohibited"] is not True
        or spanner["unknown_commit_resolution"] != "REREAD_BY_IDEMPOTENCY_KEY_NO_BLIND_RETRY"
        or spanner["commit_outcome"] not in {"COMMITTED", "UNKNOWN"}
    ):
        _fail("REJECT_FORK_REPLACEMENT_OR_RETRY", "Spanner transaction posture drift")
    if spanner["commit_outcome"] == "COMMITTED":
        _time(spanner["provider_commit_timestamp"], "provider commit time")
    elif spanner["provider_commit_timestamp"] != "UNKNOWN":
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "unknown commit time drift")

    anchor_true = (
        "nonrollbackable",
        "linearizable_check_and_use",
        "stale_reader_rejected",
        "whole_state_restore_detected",
        "before_commit_recovery_verified",
        "after_commit_recovery_verified",
    )
    if any(anchor[field] is not True for field in anchor_true):
        _fail("HOLD_RETENTION_TRANSACTION_OR_ANCHOR_MECHANISM", "anchor proof incomplete")
    _time(anchor["observed_at"], "anchor observation")

    expected_retention_interfaces = (
        (
            OWNED_P07_NODES[0],
            "4e2e1596339e755f60af4f5e5c20c30b28100dacf3f702d46a6f777d984a4a6f",
            ("all_required_bytes_retrieved",),
        ),
        (
            OWNED_P07_NODES[1],
            "415e58b148e101c44182403bcc3d59bb7f59e581b5668e711a1e3992b1679fa0",
            (
                "all_manifest_bytes_retrieved_now",
                "all_nested_attestation_evidence_bytes_retrieved_now",
                "all_historical_record_bundles_retrieved_now",
            ),
        ),
        (
            OWNED_P07_NODES[2],
            "95154f2c2218fa24aa97550131b9cac7dde7594f43cc8340d63a2feaf49c0b37",
            (
                "all_manifest_bytes_retrieved_now",
                "all_nested_section_7_4_evidence_bytes_retrieved_now",
                "section_7_6_terminal_proof_bundle_retrieved_now",
                "current_replay_policy_bundle_retrieved_now",
            ),
        ),
    )
    issued_times: list[datetime] = []
    challenge_hashes: set[str] = set()
    consumption_hashes: set[str] = set()
    policy_hashes: set[str] = set()
    for record, (node_id, formula_sha256, completeness_fields) in zip(
        retention, expected_retention_interfaces, strict=True
    ):
        issued = _time(record["challenge_issued_at"], "challenge issue")
        expires = _time(record["challenge_expires_at"], "challenge expiry")
        verified = _time(record["verified_at"], "retention verification")
        guaranteed = _time(record["retention_guaranteed_until"], "retention guarantee")
        if not issued <= verified < expires < guaranteed or guaranteed != gcs_until:
            _fail("HOLD_RETENTION_TRANSACTION_OR_ANCHOR_MECHANISM", "retention interval gap")
        if (
            record["section_7_4_acceptance_node_id"] != node_id
            or record["section_7_4_formula_sha256"] != formula_sha256
        ):
            _fail(
                "REJECT_PARENT_TARGET_SOURCE_OR_OWNERSHIP",
                "retention parent interface conflict",
            )
        if (
            record["record_bound_replay_manifest_sha256"]
            != record["replay_manifest_sha256"]
            or record["record_bound_challenge_sha256"] != record["challenge_sha256"]
        ):
            _fail(
                "REJECT_AUTHENTICATION_FRESHNESS_OR_CURRENTNESS",
                "retention authenticated binding conflict",
            )
        if (
            record["gcs_object_record_sha256"] != gcs["record_sha256"]
            or any(record[field] is not True for field in completeness_fields)
            or record["exact_target_and_challenge_match"] is not True
            or record["retention_status"] != "VERIFIED_DURABLE_REPLAYABLE"
        ):
            _fail("HOLD_RETENTION_TRANSACTION_OR_ANCHOR_MECHANISM", "replay retention gap")
        issued_times.append(issued)
        challenge_hashes.add(record["challenge_sha256"])
        consumption_hashes.add(record["anti_replay_consumption_sha256"])
        policy_hashes.add(record["immutable_append_only_storage_policy_sha256"])
    if (
        issued_times != sorted(issued_times)
        or len(set(issued_times)) != 3
        or len(challenge_hashes) != 3
        or len(consumption_hashes) != 3
        or len(policy_hashes) != 1
    ):
        _fail("REJECT_AUTHENTICATION_FRESHNESS_OR_CURRENTNESS", "retention sequence conflict")
    return EXPECTED_DECISION


def validate_contract(repo_root: Path | str) -> dict[str, Any]:
    """Validate source bytes, contract structure, and the synthetic bundle."""

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
    if vectors["canonicalization_version"] != "FT_CANONICAL_JSON_V1" or vectors[
        "schema_version"
    ] != "GCP_SECTION_7_5_3_CANONICALIZATION_VECTORS_V1":
        _fail("REJECT_SCHEMA_CANONICALIZATION_OR_HASH", "vector version drift")
    validate_bundle(contract, vectors["valid_bundle"])
    return contract


def main() -> int:
    """Run silently, returning nonzero on any validation failure."""

    try:
        validate_contract(Path(__file__).resolve().parents[1])
    except PersistenceAnchorValidationError:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
