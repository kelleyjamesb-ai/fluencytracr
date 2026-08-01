"""Preimplementation readiness evidence for Section 7.6.1."""

from __future__ import annotations

import copy
import hashlib
import hmac
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import threading
from typing import Any

import pytest


ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / (
    "tests/fixtures/gcp_section_7_6_1_preexecution_ledger_readiness_v1/"
    "packet-rules.json"
)
READINESS = ROOT / (
    "openspec/changes/add-gcp-section-7-6-1-preexecution-ledger-contract/"
    "readiness.md"
)
ENVIRONMENT_WORKER = ROOT / (
    "tests/fixtures/gcp_section_7_6_1_preexecution_ledger_readiness_v1/"
    "hermetic_environment_worker.py"
)
EXPECTED_PROTOCOL_SHA256 = (
    "f1e66d7323d5ca383de1bfd22d343928c2332cfe84795d01da60a705fd13a77d"
)
EXPECTED_ATTACK_CLASSES = {
    "UNKNOWN_FIELD",
    "MISSING_FIELD",
    "WRONG_TYPE",
    "NESTED_EXTRA_FIELD",
    "TRUNCATED_OBJECT",
    "SINGLE_FIELD_SUBSTITUTION",
    "CROSS_OBJECT_SPLICE",
    "FORGED_PROVENANCE",
    "REPLAY_REUSE",
    "COORDINATED_FULL_CLOSURE_RESEAL",
    "GLOBAL_TIMESTAMP_RESEAL",
    "STALE_FUTURE_TIME",
    "MODE_CONFUSION",
    "AMBIENT_FALLBACK",
    "PARTIAL_RESOURCE",
    "CORRUPT_RESOURCE",
    "CONCURRENCY_INTERLEAVING",
    "PRIVACY_LEAKAGE",
    "AUTHORITY_ESCALATION",
}
FORBIDDEN_PUBLIC_KEYS = {
    "user_id",
    "tenant_id",
    "provider_id",
    "email",
    "prompt",
    "result",
    "request_body",
    "credential",
    "private_key",
    "signature",
    "raw_model_bytes",
    "raw_plan_bytes",
    "terminal_state",
    "retry_eligibility",
    "favorable_retry_decision",
    "retry_token_issuance",
    "crash_classification",
    "terminal_classification",
    "terminal_proof",
    "authority_mutation",
    "pre_execution_attempt_acceptance_hash",
}


def _load_fixture() -> dict[str, Any]:
    value = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert isinstance(value, dict)
    return value


def _load_trusted_context(fixture: dict[str, Any], root: Path = ROOT) -> dict[str, Any]:
    admission = fixture["synthetic_trusted_context_root"]
    raw = (root / admission["path"]).read_bytes()
    assert hashlib.sha256(raw).hexdigest() == admission["sha256"]
    value = json.loads(raw)
    assert isinstance(value, dict)
    return value


def _canonical_sha256(value: Any) -> str:
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


def _digest(label: str) -> str:
    return hashlib.sha256(label.encode()).hexdigest()


def _test_mac(context: dict[str, Any], root_name: str, purpose: str, value: Any) -> str:
    """Synthetic readiness oracle only; this does not specify runtime cryptography."""
    root = context["roots"][root_name]
    message = b"\x00".join(
        (
            root["domain"].encode(),
            purpose.encode(),
            json.dumps(value, sort_keys=True, separators=(",", ":")).encode(),
        )
    )
    return hmac.new(bytes.fromhex(root["key_hex"]), message, hashlib.sha256).hexdigest()


def _without(record: dict[str, Any], *fields: str) -> dict[str, Any]:
    return {key: value for key, value in record.items() if key not in fields}


def _contains_forbidden_key(value: Any) -> bool:
    if isinstance(value, dict):
        return bool(set(value) & FORBIDDEN_PUBLIC_KEYS) or any(
            _contains_forbidden_key(item) for item in value.values()
        )
    if isinstance(value, list):
        return any(_contains_forbidden_key(item) for item in value)
    return False


def _queue_projection(fixture: dict[str, Any], root: Path = ROOT) -> dict[str, Any]:
    queue = json.loads((root / fixture["queue_authorization_root"]["path"]).read_text())
    matches = [row for row in queue["items"] if row["id"] == fixture["queue_item_id"]]
    assert len(matches) == 1
    row = matches[0]
    assert set(row) == set(fixture["queue_authorization_root"]["exact_row_fields"])
    assert type(row["last_note"]) is str
    assert not _contains_forbidden_key(row)
    assert row["status"] in fixture["queue_authorization_root"]["admitted_statuses"]
    fields = fixture["queue_authorization_root"]["immutable_projection_fields"]
    projection = {field: row[field] for field in fields}
    assert _canonical_sha256(projection) == fixture["queue_authorization_root"]["canonical_sha256"]
    return projection


def _build_candidate(
    fixture: dict[str, Any],
    *,
    root: Path = ROOT,
    signing_context: dict[str, Any] | None = None,
    source_manifest: list[dict[str, Any]] | None = None,
    queue_projection: dict[str, Any] | None = None,
    time_shift: int = 0,
    record_time_shift: int = 0,
    lineage_kind: str = "INITIAL",
) -> dict[str, Any]:
    context = copy.deepcopy(signing_context or _load_trusted_context(fixture, root))
    seed = context["candidate_seed_namespace"]
    value = lambda label: _digest(f"{seed}:{label}")
    now = context["trusted_now_epoch_seconds"] + time_shift
    record_now = now + record_time_shift
    assert lineage_kind in {"INITIAL", "OPAQUE_RETRY"}
    head_attempt = 0 if lineage_kind == "INITIAL" else 3
    head_retry = 0 if lineage_kind == "INITIAL" else 1
    derived_attempt = head_attempt + 1
    derived_retry = 0 if lineage_kind == "INITIAL" else head_retry + 1

    plan = {
        "schema_version": "GCP_S761_PLAN_MANIFEST_V1",
        "numerical_body_hash": value("numerical-body"),
        "model_hash": value("model"),
        "execution_plan_hash": value("execution-plan"),
        "model_plan_sha256": value("model-plan-projection"),
        "runtime_profile_hash": value("runtime-profile"),
        "plan_manifest_hash": "",
    }
    plan["plan_manifest_hash"] = _test_mac(context, "plan", "PLAN_MANIFEST", _without(plan, "plan_manifest_hash"))

    allocation = {
        "schema_version": "GCP_S761_ALLOCATION_MANIFEST_V1",
        "runtime_profile_hash": plan["runtime_profile_hash"],
        "allocation_incarnation": value("allocation-incarnation"),
        "zone_commitment": value("zone"),
        "instance_commitment": value("instance"),
        "plan_manifest_hash": plan["plan_manifest_hash"],
        "allocation_manifest_hash": "",
    }
    allocation["allocation_manifest_hash"] = _test_mac(context, "allocation", "ALLOCATION_MANIFEST", _without(allocation, "allocation_manifest_hash"))

    lineage = {
        "schema_version": "GCP_S761_LINEAGE_INPUT_V1",
        "lineage_kind": lineage_kind,
        "authenticated_lineage_token_hash": value("initial-lineage-token" if lineage_kind == "INITIAL" else "opaque-retry-token"),
        "initial_token_hash": value("initial-token") if lineage_kind == "INITIAL" else "ABSENT_RETRY_LINEAGE",
        "opaque_retry_authorization_hash": "ABSENT_INITIAL_LINEAGE" if lineage_kind == "INITIAL" else value("opaque-retry-authorization"),
        "token_authentication_verification_hash": "",
        "token_freshness_verification_hash": _test_mac(context, "time", "LINEAGE_FRESHNESS", {"trusted_now": now, "token": value("initial-lineage-token" if lineage_kind == "INITIAL" else "opaque-retry-token")}),
        "token_single_use_claim": value("token-single-use"),
    }
    lineage["token_authentication_verification_hash"] = _test_mac(context, "lineage", "LINEAGE_INPUT", _without(lineage, "token_authentication_verification_hash"))

    head_in = {
        "schema_version": "GCP_S761_CURRENT_ATTEMPT_FAMILY_HEAD_V1",
        "attempt_family_key": value("attempt-family"),
        "lineage_state": "EMPTY_AUTHENTICATED_GENESIS" if lineage_kind == "INITIAL" else "AUTHENTICATED_TERMINAL_PARENT",
        "attempt_ordinal": head_attempt,
        "retry_ordinal": head_retry,
        "last_reservation_key": value("genesis-no-reservation" if lineage_kind == "INITIAL" else "prior-reservation"),
        "last_write_ahead_marker_hash": value("genesis-no-wal" if lineage_kind == "INITIAL" else "prior-wal"),
        "last_expected_request_lineage_hash": value("genesis-no-expected" if lineage_kind == "INITIAL" else "prior-expected"),
        "head_version": head_attempt,
        "head_authentication_verification_hash": "",
        "attempt_family_head_hash": "",
    }
    head_in["head_authentication_verification_hash"] = _test_mac(context, "head", "CURRENT_HEAD", _without(head_in, "head_authentication_verification_hash", "attempt_family_head_hash"))
    head_in["attempt_family_head_hash"] = _canonical_sha256(_without(head_in, "attempt_family_head_hash"))

    parent = {
        "schema_version": "GCP_S761_PARENT_ATTEMPT_ENVELOPE_V1",
        "numerical_body_hash": plan["numerical_body_hash"],
        "plan_manifest_hash": plan["plan_manifest_hash"],
        "allocation_manifest_hash": allocation["allocation_manifest_hash"],
        "authenticated_lineage_token_hash": lineage["authenticated_lineage_token_hash"],
        "admission_lineage_hash": value("admission-lineage"),
        "attempt_ordinal": derived_attempt,
        "retry_ordinal": derived_retry,
        "keyed_tenant_commitment": value("aggregate-tenant-commitment"),
        "runtime_profile_hash": plan["runtime_profile_hash"],
        "single_use_attempt_claim": value("attempt-single-use"),
        "parent_producer_policy_hash": _test_mac(context, "parent", "PARENT_POLICY", context["roots"]["parent"]["producer"]),
        "parent_record_authentication_verification_hash": "",
        "parent_attempt_envelope_hash": "",
    }
    parent["parent_record_authentication_verification_hash"] = _test_mac(context, "parent", "PARENT_ENVELOPE", _without(parent, "parent_record_authentication_verification_hash", "parent_attempt_envelope_hash"))
    parent["parent_attempt_envelope_hash"] = _canonical_sha256(_without(parent, "parent_attempt_envelope_hash"))

    expected = {
        "schema_version": "GCP_S761_EXPECTED_REQUEST_LINEAGE_V1",
        "expected_request_context_record_hash": value("expected-request-context"),
        "pre_ledger_request_context_hash": value("pre-ledger-request-context"),
        "parent_attempt_envelope_hash": parent["parent_attempt_envelope_hash"],
        "plan_manifest_hash": plan["plan_manifest_hash"],
        "allocation_manifest_hash": allocation["allocation_manifest_hash"],
        "derived_attempt_ordinal": derived_attempt,
        "derived_retry_ordinal": derived_retry,
        "single_use_attempt_claim": parent["single_use_attempt_claim"],
        "expected_request_lineage_hash": "",
    }
    expected["expected_request_lineage_hash"] = _canonical_sha256(_without(expected, "expected_request_lineage_hash"))

    lineage_hash = _canonical_sha256(lineage)
    reservation_preimage = {
        "keyed_tenant_commitment": parent["keyed_tenant_commitment"],
        "runtime_profile_hash": plan["runtime_profile_hash"],
        "allocation_incarnation": allocation["allocation_incarnation"],
        "numerical_body_hash": plan["numerical_body_hash"],
        "plan_manifest_hash": plan["plan_manifest_hash"],
        "allocation_manifest_hash": allocation["allocation_manifest_hash"],
        "lineage_input_hash": lineage_hash,
        "derived_attempt_ordinal": derived_attempt,
        "derived_retry_ordinal": derived_retry,
        "parent_attempt_envelope_hash": parent["parent_attempt_envelope_hash"],
        "expected_request_lineage_hash": expected["expected_request_lineage_hash"],
        "single_use_attempt_claim": parent["single_use_attempt_claim"],
    }
    reservation = {
        "schema_version": "GCP_S761_RESERVATION_V1",
        "reservation_key": _canonical_sha256(reservation_preimage),
        **reservation_preimage,
        "reserved_at": record_now - 150,
        "reservation_status": "RESERVED_PRE_EXECUTION",
    }
    token_marker = {
        "schema_version": "GCP_S761_TOKEN_CONSUMPTION_MARKER_V1",
        "authenticated_lineage_token_hash": lineage["authenticated_lineage_token_hash"],
        "token_single_use_claim": lineage["token_single_use_claim"],
        "reservation_key": reservation["reservation_key"],
        "derived_attempt_ordinal": derived_attempt,
        "derived_retry_ordinal": derived_retry,
        "consumed_at": record_now - 149,
        "token_consumption_marker_hash": "",
    }
    token_marker["token_consumption_marker_hash"] = _canonical_sha256(_without(token_marker, "token_consumption_marker_hash"))
    wal = {
        "schema_version": "GCP_S761_WRITE_AHEAD_MARKER_V1",
        "reservation_key": reservation["reservation_key"],
        "token_consumption_marker_hash": token_marker["token_consumption_marker_hash"],
        "expected_request_lineage_hash": expected["expected_request_lineage_hash"],
        "previous_attempt_family_head_hash": head_in["attempt_family_head_hash"],
        "derived_attempt_ordinal": derived_attempt,
        "derived_retry_ordinal": derived_retry,
        "write_order": copy.deepcopy(fixture["fixed_write_order"]),
        "marker_created_at": record_now - 148,
        "write_ahead_marker_hash": "",
    }
    wal["write_ahead_marker_hash"] = _canonical_sha256(_without(wal, "write_ahead_marker_hash"))
    head_out = {
        "schema_version": "GCP_S761_NEW_ATTEMPT_FAMILY_HEAD_V1",
        "attempt_family_key": head_in["attempt_family_key"],
        "lineage_state": "RESERVED_PRE_EXECUTION",
        "attempt_ordinal": derived_attempt,
        "retry_ordinal": derived_retry,
        "last_reservation_key": reservation["reservation_key"],
        "last_write_ahead_marker_hash": wal["write_ahead_marker_hash"],
        "last_expected_request_lineage_hash": expected["expected_request_lineage_hash"],
        "head_version": head_in["head_version"] + 1,
        "head_authentication_verification_hash": "",
        "attempt_family_head_hash": "",
    }
    head_out["head_authentication_verification_hash"] = _test_mac(context, "head", "NEW_HEAD", _without(head_out, "head_authentication_verification_hash", "attempt_family_head_hash"))
    head_out["attempt_family_head_hash"] = _canonical_sha256(_without(head_out, "attempt_family_head_hash"))
    records = {
        "plan_manifest": plan,
        "allocation_manifest": allocation,
        "lineage_input": lineage,
        "parent_attempt_envelope": parent,
        "current_attempt_family_head": head_in,
        "expected_request_lineage": expected,
        "reservation": reservation,
        "token_consumption_marker": token_marker,
        "write_ahead_marker": wal,
        "new_attempt_family_head": head_out,
    }
    transition = {
        "schema_version": "GCP_S761_TRANSITION_V1",
        "authenticated_inputs_hash": _canonical_sha256({key: records[key] for key in ("plan_manifest", "allocation_manifest", "lineage_input", "parent_attempt_envelope")}),
        "authenticated_current_head_hash": head_in["attempt_family_head_hash"],
        "reservation_absence_proof_hash": value("reservation-absent-before-write"),
        "token_absence_proof_hash": value("token-absent-before-write"),
        "atomic_write_set_hash": _canonical_sha256({key: records[key] for key in ("reservation", "token_consumption_marker", "write_ahead_marker", "new_attempt_family_head", "expected_request_lineage")}),
        "commit_disposition": "COMMITTED",
        "unknown_commit_recovery": "SAME_RESERVATION_KEY_READBACK_ONLY",
        "readback_bundle_hash": _canonical_sha256({key: records[key] for key in ("reservation", "token_consumption_marker", "write_ahead_marker", "new_attempt_family_head", "expected_request_lineage")}),
        "readback_disposition": "EXACT_BYTES_MATCH",
        "exposure_disposition": "OPAQUE_RECORD_FOR_SECTION_7_4_ONLY",
    }
    pre_record = {
        "schema_version": "GCP_S761_PRE_EXECUTION_RECORD_V1",
        "opaque_section_7_6_pre_execution_record_hash": "",
        "record_bound_pre_ledger_request_context_hash": _canonical_sha256({"record": reservation["reservation_key"], "context": expected["pre_ledger_request_context_hash"]}),
        "record_bound_parent_attempt_envelope_hash": _canonical_sha256({"record": reservation["reservation_key"], "parent": parent["parent_attempt_envelope_hash"]}),
        "record_bound_single_use_attempt_claim": _canonical_sha256({"record": reservation["reservation_key"], "claim": parent["single_use_attempt_claim"]}),
        "section_7_6_record_authentication_verification_hash": "",
        "section_7_6_record_freshness_hash": _test_mac(context, "time", "PRE_EXECUTION_FRESHNESS", {"created": record_now - 147, "expires": record_now + 150, "trusted_now": now}),
        "opaque_pre_execution_record_single_use_verification_hash": _canonical_sha256({"reservation": reservation["reservation_key"], "token": token_marker["token_consumption_marker_hash"], "wal": wal["write_ahead_marker_hash"]}),
        "approved_section_7_6_contract_hash": value("approved-section-7-6-contract"),
        "record_created_at": record_now - 147,
        "record_expires_at": record_now + 150,
        "record_status": "COMMITTED_EXACT_READBACK",
        "authority_effect": "NONE",
    }
    pre_record["section_7_6_record_authentication_verification_hash"] = _test_mac(context, "record", "PRE_EXECUTION_RECORD", _without(pre_record, "section_7_6_record_authentication_verification_hash", "opaque_section_7_6_pre_execution_record_hash"))
    pre_record["opaque_section_7_6_pre_execution_record_hash"] = _canonical_sha256(_without(pre_record, "opaque_section_7_6_pre_execution_record_hash"))
    records["pre_execution_record"] = pre_record
    candidate: dict[str, Any] = {
        "schema_version": "GCP_SECTION_7_6_1_PREEXECUTION_LEDGER_CANDIDATE_V1",
        "scope_kind": "DOCS_CONTRACT",
        "authority_effect": "NONE",
        "predecessor_contracts": copy.deepcopy(source_manifest or fixture["source_manifest"]),
        "queue_authorization_projection": copy.deepcopy(queue_projection or _queue_projection(fixture, root)),
        "records": records,
        "transition": transition,
        "ownership_exclusions": copy.deepcopy(fixture["section_7_6_2_exclusive_ownership"]),
        "public_projection": {
            field: pre_record[field]
            for field in fixture["public_projection_fields"]
        },
        "result": {
            "decision": "PRE_EXECUTION_RECORD_READY_FOR_SECTION_7_4_CONSUMPTION",
            "consumer": "SECTION_7_4_ONLY",
            "authority_effect": "NONE",
        },
    }
    return _reseal(candidate)


def _baseline_candidate(fixture: dict[str, Any], root: Path = ROOT) -> dict[str, Any]:
    return _build_candidate(fixture, root=root)


def _reseal(candidate: dict[str, Any]) -> dict[str, Any]:
    candidate.pop("hashes", None)
    candidate["hashes"] = {
        "predecessor_manifest_sha256": _canonical_sha256(candidate["predecessor_contracts"]),
        "records_bundle_sha256": _canonical_sha256(candidate["records"]),
        "transition_sha256": _canonical_sha256(candidate["transition"]),
        "public_projection_sha256": _canonical_sha256(candidate["public_projection"]),
    }
    candidate["hashes"]["candidate_sha256"] = _canonical_sha256(candidate)
    return candidate


def _leaf_paths(value: Any, prefix: str = "") -> list[str]:
    if isinstance(value, dict):
        if not value:
            return [prefix]
        return [path for key, item in value.items() for path in _leaf_paths(item, f"{prefix}/{key}")]
    if isinstance(value, list):
        if not value:
            return [prefix]
        return [path for index, item in enumerate(value) for path in _leaf_paths(item, f"{prefix}/{index}")]
    return [prefix]


def _pattern_matches(pattern: str, path: str) -> bool:
    expected = pattern.split("/")[1:]
    actual = path.split("/")[1:]
    return len(expected) == len(actual) and all(
        left == "*" or left == right
        for left, right in zip(expected, actual, strict=True)
    )


def _copy_inputs(fixture: dict[str, Any], tmp_path: Path) -> Path:
    for entry in [
        *fixture["source_manifest"],
        fixture["queue_authorization_root"],
        fixture["synthetic_trusted_context_root"],
    ]:
        source = ROOT / entry["path"]
        target = tmp_path / entry["path"]
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    return tmp_path


class _AtomicReplacement:
    def __init__(self, path: Path, replacement: bytes) -> None:
        self.path = path
        self.replacement = replacement
        self.invoked = False

    def __call__(self) -> None:
        replacement_path = self.path.with_name(f"{self.path.name}.replacement")
        replacement_path.write_bytes(self.replacement)
        os.replace(replacement_path, self.path)
        self.invoked = True


class _UnknownCommitTransaction:
    """Test-owned transaction fault surface; it contains no expected verdict."""

    def __init__(self, candidate: dict[str, Any], *, mismatch: bool) -> None:
        self.reservation_key = candidate["records"]["reservation"]["reservation_key"]
        self.readback_bundle = copy.deepcopy(candidate["records"])
        if mismatch:
            self.readback_bundle["reservation"]["reservation_status"] = "MISMATCHED_READBACK"
        self.events: list[str] = []
        self.ordinal_allocation_attempted = False

    def commit(self, _write_set: dict[str, Any]) -> str:
        self.events.append("COMMIT_UNKNOWN")
        return "UNKNOWN_AFTER_WRITE"

    def readback(self, reservation_key: str) -> dict[str, Any]:
        assert reservation_key == self.reservation_key
        self.events.append("READBACK_SAME_RESERVATION_KEY")
        return copy.deepcopy(self.readback_bundle)

    def allocate_ordinal(self) -> int:
        self.ordinal_allocation_attempted = True
        raise AssertionError("unknown commit must not allocate another ordinal")

    def expose(self, _opaque_record: dict[str, Any]) -> None:
        assert self.events == ["COMMIT_UNKNOWN", "READBACK_SAME_RESERVATION_KEY"]
        self.events.append("EXPOSE_AFTER_EXACT_READBACK")


def _variant_cases(fixture: dict[str, Any]) -> list[tuple[str, str | None]]:
    cases: list[tuple[str, str | None]] = []
    for attack in fixture["attacks"]:
        variants = fixture["attack_variants"].get(attack["id"], [None])
        cases.extend((attack["id"], variant) for variant in variants)
    return cases


def _prepare_attack(
    fixture: dict[str, Any], attack_id: str, variant: str | None, tmp_path: Path
) -> tuple[dict[str, Any], dict[str, Any]]:
    candidate = _baseline_candidate(fixture, tmp_path)
    baseline = copy.deepcopy(candidate)
    original_hash = candidate["hashes"]["candidate_sha256"]
    plan: dict[str, Any] = {"action": "single", "state": {}, "interleaving": None}
    records = candidate["records"]

    if attack_id == "A001":
        candidate["unexpected"] = True
        records["pre_execution_record"]["unexpected"] = True
    elif attack_id == "A002":
        if variant == "TOP_LEVEL_RESULT": candidate.pop("result")
        elif variant == "PREDECESSOR_DECISION": candidate["predecessor_contracts"][3].pop("decision")
        elif variant == "PREDECESSOR_HOLD":
            source = tmp_path / fixture["source_manifest"][3]["path"]
            source_value = json.loads(source.read_text(encoding="utf-8"))
            source_value["decision"] = "HOLD"
            source.write_text(json.dumps(source_value, sort_keys=True), encoding="utf-8")
            candidate["predecessor_contracts"][3]["sha256"] = hashlib.sha256(source.read_bytes()).hexdigest()
            candidate["predecessor_contracts"][3]["decision"] = "HOLD"
        elif variant == "TOKEN_MARKER": records.pop("token_consumption_marker")
        elif variant == "WRITE_AHEAD_MARKER": records.pop("write_ahead_marker")
        elif variant == "TRANSITION_READBACK": candidate["transition"].pop("readback_bundle_hash")
    elif attack_id == "A003":
        if variant == "CALLER_IDENTITY": records["parent_attempt_envelope"]["keyed_tenant_commitment"] = "caller"
        elif variant == "CALLER_ORDINAL": records["parent_attempt_envelope"]["attempt_ordinal"] = 9
        elif variant == "BOOLEAN_ATTEMPT_ORDINAL": records["parent_attempt_envelope"]["attempt_ordinal"] = True
        elif variant == "BOOLEAN_RETRY_ORDINAL": records["reservation"]["derived_retry_ordinal"] = False
        elif variant == "CALLER_STATUS": records["reservation"]["reservation_status"] = "CALLER_APPROVED"
        elif variant == "CALLER_RECORD_STATUS": records["pre_execution_record"]["record_status"] = "CALLER_APPROVED"
    elif attack_id == "A004": records["plan_manifest"]["raw_plan_bytes"] = "forbidden"
    elif attack_id == "A005":
        target = "parent_attempt_envelope" if variant == "PARENT_ENVELOPE" else "lineage_input"
        records[target].pop(next(reversed(records[target])))
    elif attack_id == "A006":
        if variant == "DERIVED_ORDINAL": records["reservation"]["derived_attempt_ordinal"] = 2
        elif variant == "HEAD_LINEAGE": records["new_attempt_family_head"]["last_reservation_key"] = _digest("other")
        elif variant == "RESERVATION_STATUS": records["reservation"]["reservation_status"] = "AVAILABLE"
        elif variant == "MISORDERED_WRITE_AHEAD": records["write_ahead_marker"]["write_order"] = list(reversed(fixture["fixed_write_order"]))
    elif attack_id == "A007":
        if variant == "PLAN_ALLOCATION": records["allocation_manifest"]["plan_manifest_hash"] = _digest("spliced-plan")
        elif variant == "PARENT_EXPECTED": records["expected_request_lineage"]["parent_attempt_envelope_hash"] = _digest("spliced-parent")
        elif variant == "PREDECESSOR_SOURCE": candidate["predecessor_contracts"][2]["sha256"] = candidate["predecessor_contracts"][1]["sha256"]
    elif attack_id == "A008":
        target = {
            "LINEAGE_AUTH": ("lineage_input", "token_authentication_verification_hash"),
            "PARENT_AUTH": ("parent_attempt_envelope", "parent_record_authentication_verification_hash"),
            "HEAD_AUTH": ("current_attempt_family_head", "head_authentication_verification_hash"),
        }.get(variant)
        if variant == "TRUSTED_CONTEXT_ROOT":
            trusted_path = tmp_path / fixture["synthetic_trusted_context_root"]["path"]
            trusted_value = json.loads(trusted_path.read_text(encoding="utf-8"))
            trusted_value["roots"]["parent"]["key_hex"] = _digest("forged-parent-root")
            trusted_path.write_text(json.dumps(trusted_value, sort_keys=True), encoding="utf-8")
        elif target:
            records[target[0]][target[1]] = _digest("attacker-key")
        else:
            candidate["predecessor_contracts"][0]["owner"] = "ATTACKER"
    elif attack_id == "A009":
        plan["action"] = "replay"
        plan["replay_variant"] = variant
        plan["first_candidate"] = copy.deepcopy(candidate)
        plan["second_candidate"] = (
            copy.deepcopy(candidate)
            if variant == "IDENTICAL_CANDIDATE"
            else _build_candidate(fixture, root=tmp_path, record_time_shift=1 if variant == "RESERVATION_KEY" else 2)
        )
        assert plan["first_candidate"]["records"]["reservation"]["reservation_key"] == plan["second_candidate"]["records"]["reservation"]["reservation_key"]
        assert plan["first_candidate"]["records"]["lineage_input"]["authenticated_lineage_token_hash"] == plan["second_candidate"]["records"]["lineage_input"]["authenticated_lineage_token_hash"]
        if variant != "IDENTICAL_CANDIDATE":
            assert plan["first_candidate"]["hashes"]["candidate_sha256"] != plan["second_candidate"]["hashes"]["candidate_sha256"]
    elif attack_id == "A010":
        queue_path = tmp_path / fixture["queue_authorization_root"]["path"]
        queue = json.loads(queue_path.read_text())
        row = next(item for item in queue["items"] if item["id"] == fixture["queue_item_id"])
        row["risk"] = "low"
        queue_path.write_text(json.dumps(queue, sort_keys=True), encoding="utf-8")
        source = tmp_path / fixture["source_manifest"][0]["path"]
        source.write_bytes(source.read_bytes() + b"\n")
        fields = fixture["queue_authorization_root"]["immutable_projection_fields"]
        alternate_queue = {field: row[field] for field in fields}
        alternate_manifest = copy.deepcopy(fixture["source_manifest"])
        alternate_manifest[0]["sha256"] = hashlib.sha256(source.read_bytes()).hexdigest()
        alternate_context = _load_trusted_context(fixture, tmp_path)
        alternate_context["candidate_seed_namespace"] = "S761_ATTACKER_RESEALED_V1"
        for name, trusted_root in alternate_context["roots"].items():
            trusted_root["key_hex"] = _digest(f"attacker:{name}")
            trusted_root["producer"] = f"ATTACKER_{name.upper()}"
        candidate = _build_candidate(
            fixture,
            root=tmp_path,
            signing_context=alternate_context,
            source_manifest=alternate_manifest,
            queue_projection=alternate_queue,
        )
        records = candidate["records"]
        baseline_hashes = {
            (record_name, field): value
            for record_name, record in baseline["records"].items()
            for field, value in record.items()
            if isinstance(value, str) and len(value) == 64
        }
        assert baseline_hashes
        assert all(candidate["records"][name][field] != value for (name, field), value in baseline_hashes.items())
        assert candidate["predecessor_contracts"] != baseline["predecessor_contracts"]
        assert candidate["queue_authorization_projection"] != baseline["queue_authorization_projection"]
    elif attack_id == "A011":
        candidate = _build_candidate(fixture, root=tmp_path, time_shift=86400)
        records = candidate["records"]
        for record_name, field in (
            ("reservation", "reservation_key"),
            ("token_consumption_marker", "token_consumption_marker_hash"),
            ("write_ahead_marker", "write_ahead_marker_hash"),
            ("new_attempt_family_head", "attempt_family_head_hash"),
            ("pre_execution_record", "opaque_section_7_6_pre_execution_record_hash"),
        ):
            assert records[record_name][field] != baseline["records"][record_name][field]
        assert candidate["transition"]["readback_bundle_hash"] != baseline["transition"]["readback_bundle_hash"]
    elif attack_id == "A012":
        records["pre_execution_record"]["record_created_at"] = 0 if variant == "STALE" else 4102444800
    elif attack_id == "A013": candidate["scope_kind"] = variant
    elif attack_id == "A014":
        source = tmp_path / fixture["source_manifest"][0]["path"]
        ambient = tmp_path / "ambient" / source.name
        ambient.parent.mkdir(parents=True)
        shutil.copyfile(source, ambient)
        source.unlink()
    elif attack_id == "A015":
        source = tmp_path / fixture["source_manifest"][1]["path"]
        source.write_bytes(source.read_bytes()[:32])
    elif attack_id == "A016":
        source = tmp_path / fixture["source_manifest"][2]["path"]
        value = json.loads(source.read_text())
        value["corrupt_probe"] = True
        source.write_text(json.dumps(value, sort_keys=True), encoding="utf-8")
    elif attack_id == "A017":
        if variant == "CONCURRENT_DUPLICATE_RESERVATION":
            plan["action"] = "concurrent_duplicate"
            plan["barrier"] = threading.Barrier(2)
        else:
            source = tmp_path / fixture["source_manifest"][3]["path"]
            original = source.read_bytes()
            plan["interleaving"] = _AtomicReplacement(source, original + b"\n")
    elif attack_id == "A018":
        key = "user_id"
        if variant == "TOP_LEVEL": candidate[key] = "forbidden"
        elif variant == "PREDECESSOR_ROW": candidate["predecessor_contracts"][0][key] = "forbidden"
        elif variant == "QUEUE_ROW": candidate["queue_authorization_projection"][key] = "forbidden"
        elif variant == "QUEUE_LAST_NOTE_NESTED":
            queue_path = tmp_path / fixture["queue_authorization_root"]["path"]
            queue_value = json.loads(queue_path.read_text(encoding="utf-8"))
            queue_row = next(item for item in queue_value["items"] if item["id"] == fixture["queue_item_id"])
            queue_row["last_note"] = {"user_id": "forbidden"}
            queue_path.write_text(json.dumps(queue_value, sort_keys=True), encoding="utf-8")
        elif variant == "PUBLIC_PROJECTION": candidate["public_projection"]["prompt"] = "forbidden"
        elif variant == "RESULT": candidate["result"]["email"] = "forbidden"
        else:
            record_name = {
                "PLAN": "plan_manifest", "ALLOCATION": "allocation_manifest", "LINEAGE": "lineage_input",
                "PARENT": "parent_attempt_envelope", "HEAD_IN": "current_attempt_family_head",
                "EXPECTED": "expected_request_lineage", "RESERVATION": "reservation",
                "TOKEN_MARKER": "token_consumption_marker", "WRITE_AHEAD": "write_ahead_marker",
                "HEAD_OUT": "new_attempt_family_head", "OPAQUE_RECORD": "pre_execution_record",
            }.get(variant)
            if record_name: records[record_name][key] = "forbidden"
            elif variant == "TRANSITION": candidate["transition"]["credential"] = "forbidden"
            else: raise AssertionError(f"unknown privacy variant: {variant}")
    elif attack_id == "A019":
        if variant == "TOP_LEVEL_AUTHORITY": candidate["authority_effect"] = "RUNTIME"
        elif variant == "PRE_EXECUTION_ACCEPTANCE_HASH": candidate["public_projection"]["pre_execution_attempt_acceptance_hash"] = _digest("forbidden")
        elif variant == "SECTION_7_4_PASS_BOOLEAN": candidate["public_projection"]["pre_execution_request_context_exact_match"] = True
        elif variant == "ACTUAL_BOOT_TRUTH": candidate["public_projection"]["actual_boot_verified"] = True
        elif variant == "TERMINAL_STATE": candidate["public_projection"]["terminal_state"] = "COMPLETED_EXECUTION"
        elif variant == "RETRY_ELIGIBILITY": candidate["public_projection"]["retry_eligibility"] = "ELIGIBLE"
        elif variant == "FAVORABLE_RETRY_DECISION": candidate["public_projection"]["favorable_retry_decision"] = "RETRY"
        elif variant == "RETRY_TOKEN_ISSUANCE": candidate["public_projection"]["retry_token_issuance"] = _digest("token")
        elif variant == "CRASH_CLASSIFICATION": candidate["public_projection"]["crash_classification"] = "CRASHED"
        elif variant == "TERMINAL_CLASSIFICATION": candidate["public_projection"]["terminal_classification"] = "SUCCESS"
        elif variant == "TERMINAL_PROOF": candidate["public_projection"]["terminal_proof"] = _digest("terminal-proof")
        elif variant == "AUTHORITY_MUTATION": candidate["public_projection"]["authority_mutation"] = "GRANTED"
    else:
        raise AssertionError(f"unprepared attack: {attack_id}")

    candidate = _reseal(candidate)
    resource_only = (
        attack_id in {"A009", "A014", "A015", "A016", "A017"}
        or (attack_id == "A008" and variant == "TRUSTED_CONTEXT_ROOT")
        or (attack_id == "A018" and variant == "QUEUE_LAST_NOTE_NESTED")
    )
    if not resource_only:
        assert candidate["hashes"]["candidate_sha256"] != original_hash
    return candidate, plan


def _load_future_verifier(fixture: dict[str, Any]) -> Any:
    paths = [ROOT / path for path in fixture["sut_paths"]]
    if not all(path.is_file() for path in paths):
        pytest.fail("MISSING_SUT")
    spec = importlib.util.spec_from_file_location("gcp_s761_future_sut", paths[-1])
    if spec is None or spec.loader is None:
        pytest.fail("MISSING_SUT")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _expected_environment(environment: str, resource: str) -> str:
    if environment == "LIVE_RUNTIME":
        return "HOLD_LIVE_RUNTIME_NOT_AUTHORIZED"
    if environment == "ARCHIVE_CLOSEOUT":
        return "HOLD_ARCHIVE_CLOSEOUT_ONLY" if resource == "EXACT" else f"HOLD_ARCHIVE_SOURCE_SET_{resource}"
    if environment == "CLEAN_CI":
        return "PRE_EXECUTION_RECORD_READY_FOR_SECTION_7_4_CONSUMPTION" if resource == "EXACT" else f"HOLD_SOURCE_SET_{resource}"
    raise AssertionError("unknown environment")


def test_source_queue_and_section_7_4_interface_are_exact() -> None:
    fixture = _load_fixture()
    assert fixture["authority_effect"] == "NONE"
    assert fixture["base_commit"] == "66fc4d89f4e2084ec4a4fc07d392d04692d18239"
    assert len(fixture["source_manifest"]) == 4
    for source in fixture["source_manifest"]:
        raw = (ROOT / source["path"]).read_bytes()
        assert hashlib.sha256(raw).hexdigest() == source["sha256"]
        if source["decision"] is not None:
            assert json.loads(raw)["decision"] == source["decision"]
    assert _queue_projection(fixture)["id"] == fixture["queue_item_id"]
    context = _load_trusted_context(fixture)
    assert context["purpose"] == "READINESS_TEST_ORACLE_ONLY_NOT_RUNTIME_CRYPTOGRAPHY"
    assert set(context["roots"]) == {"plan", "allocation", "lineage", "parent", "head", "time", "record"}
    assert len({row["key_hex"] for row in context["roots"].values()}) == len(context["roots"])
    assert all(len(row["key_hex"]) == 64 and row["producer"] for row in context["roots"].values())
    worker_root = fixture["environment_worker_root"]
    worker_bytes = (ROOT / worker_root["path"]).read_bytes()
    assert hashlib.sha256(worker_bytes).hexdigest() == worker_root["sha256"]
    assert ROOT / worker_root["path"] == ENVIRONMENT_WORKER
    consumer = fixture["section_7_4_consumer_contract"]
    assert consumer["consumer"] == "SECTION_7_4_ONLY"
    assert set(consumer["required_inputs"]).isdisjoint(consumer["section_7_4_owned_outputs"])
    assert not any((ROOT / path).exists() for path in fixture["sut_paths"])


def test_closed_schemas_hash_dag_and_public_projection() -> None:
    fixture = _load_fixture()
    candidate = _baseline_candidate(fixture)
    assert set(candidate["records"]) == set(fixture["record_schemas"])
    for name, fields in fixture["record_schemas"].items():
        assert set(candidate["records"][name]) == set(fields)
    assert set(candidate["transition"]) == set(fixture["transition_schema"])
    assert candidate["records"]["current_attempt_family_head"]["attempt_ordinal"] == 0
    assert candidate["records"]["parent_attempt_envelope"]["attempt_ordinal"] == 1
    assert type(candidate["records"]["parent_attempt_envelope"]["attempt_ordinal"]) is int
    assert candidate["records"]["write_ahead_marker"]["write_order"] == fixture["fixed_write_order"]
    reservation = candidate["records"]["reservation"]
    assert fixture["reservation_key_bindings"] == [key for key in reservation if key in fixture["reservation_key_bindings"]]
    assert reservation["reservation_key"] == _canonical_sha256({key: reservation[key] for key in fixture["reservation_key_bindings"]})
    assert candidate["records"]["allocation_manifest"]["plan_manifest_hash"] == candidate["records"]["plan_manifest"]["plan_manifest_hash"]
    assert candidate["records"]["parent_attempt_envelope"]["allocation_manifest_hash"] == candidate["records"]["allocation_manifest"]["allocation_manifest_hash"]
    assert candidate["records"]["expected_request_lineage"]["parent_attempt_envelope_hash"] == candidate["records"]["parent_attempt_envelope"]["parent_attempt_envelope_hash"]
    assert candidate["records"]["token_consumption_marker"]["reservation_key"] == reservation["reservation_key"]
    assert candidate["records"]["write_ahead_marker"]["token_consumption_marker_hash"] == candidate["records"]["token_consumption_marker"]["token_consumption_marker_hash"]
    assert candidate["records"]["new_attempt_family_head"]["last_write_ahead_marker_hash"] == candidate["records"]["write_ahead_marker"]["write_ahead_marker_hash"]
    assert candidate["transition"]["commit_disposition"] == "COMMITTED"
    assert candidate["transition"]["readback_disposition"] == "EXACT_BYTES_MATCH"
    assert candidate["transition"]["unknown_commit_recovery"] == "SAME_RESERVATION_KEY_READBACK_ONLY"
    assert candidate["transition"]["exposure_disposition"] == "OPAQUE_RECORD_FOR_SECTION_7_4_ONLY"
    assert set(candidate["public_projection"]) == set(fixture["public_projection_fields"])
    assert not (set(candidate["public_projection"]) & FORBIDDEN_PUBLIC_KEYS)
    assert candidate["result"] == {
        "decision": "PRE_EXECUTION_RECORD_READY_FOR_SECTION_7_4_CONSUMPTION",
        "consumer": "SECTION_7_4_ONLY",
        "authority_effect": "NONE",
    }
    commitments = {
        "candidate_sha256": candidate["hashes"]["candidate_sha256"],
        "plan_manifest_hash": candidate["records"]["plan_manifest"]["plan_manifest_hash"],
        "allocation_manifest_hash": candidate["records"]["allocation_manifest"]["allocation_manifest_hash"],
        "parent_attempt_envelope_hash": candidate["records"]["parent_attempt_envelope"]["parent_attempt_envelope_hash"],
        "current_attempt_family_head_hash": candidate["records"]["current_attempt_family_head"]["attempt_family_head_hash"],
        "reservation_key": reservation["reservation_key"],
        "write_ahead_marker_hash": candidate["records"]["write_ahead_marker"]["write_ahead_marker_hash"],
        "opaque_pre_execution_record_hash": candidate["records"]["pre_execution_record"]["opaque_section_7_6_pre_execution_record_hash"],
    }
    assert commitments == _load_trusted_context(fixture)["expected_baseline_commitments"]


def test_ledger_attack_and_requirement_reconciliation() -> None:
    fixture = _load_fixture()
    ledger_ids = {row["id"] for row in fixture["ledger"]}
    assert len(ledger_ids) == len(fixture["ledger"])
    assert {row["trust_class"] for row in fixture["ledger"]} <= {
        "COMPILE_PINNED", "AUTHENTICATED_OBSERVATION", "DERIVED", "OPAQUE_LATER_SECTION"
    }
    attacks = fixture["attacks"]
    assert [row["id"] for row in attacks] == [f"A{index:03d}" for index in range(1, 20)]
    assert {row["class"] for row in attacks} == EXPECTED_ATTACK_CLASSES
    assert all(row["root"] and row["expected"].startswith("HOLD") for row in attacks)
    assert all(set(row["ledger"]) <= ledger_ids for row in attacks)
    referenced = {attack for row in fixture["ledger"] for attack in row["attacks"]}
    assert referenced == {row["id"] for row in attacks}
    for attack in attacks:
        reverse = {row["id"] for row in fixture["ledger"] if attack["id"] in row["attacks"]}
        assert set(attack["ledger"]) == reverse, attack["id"]
    requirements = fixture["requirements"]
    assert [row["id"] for row in requirements] == [f"S761-R{index:02d}" for index in range(1, 17)]
    assert all(row["oracle"] and row["test"] for row in requirements)
    assert all(callable(globals().get(row["test"])) for row in requirements)
    later_fields = {field.upper() for field in fixture["section_7_6_2_exclusive_ownership"]}
    assert later_fields <= set(fixture["attack_variants"]["A019"])
    patterns = fixture["candidate_leaf_ledger_patterns"]
    assert all(row["ledger"] in ledger_ids for row in patterns)
    for path in _leaf_paths(_baseline_candidate(fixture)):
        assert sum(_pattern_matches(row["pattern"], path) for row in patterns) == 1, path


def test_scope_allowlist_and_noninterference() -> None:
    fixture = _load_fixture()
    assert fixture["section_7_6_2_exclusive_ownership"] == [
        "retry_eligibility", "favorable_retry_decision", "retry_token_issuance",
        "crash_classification", "terminal_classification", "terminal_proof", "authority_mutation",
    ]
    assert "section_7_4_cryptographic_verification_hash" not in json.dumps(fixture)
    assert "section_7_6_terminal_proof_hash" not in json.dumps(fixture)
    assert "authority_effect: NONE" in READINESS.read_text(encoding="utf-8")
    protocol = ROOT / "docs/agent/CANONICAL_RUNTIME_PHASE_READINESS.md"
    assert hashlib.sha256(protocol.read_bytes()).hexdigest() == EXPECTED_PROTOCOL_SHA256


def test_retry_lineage_and_nested_queue_privacy_oracles(tmp_path: Path) -> None:
    fixture = _load_fixture()
    root = _copy_inputs(fixture, tmp_path)
    retry = _build_candidate(fixture, root=root, lineage_kind="OPAQUE_RETRY")
    lineage = retry["records"]["lineage_input"]
    head_in = retry["records"]["current_attempt_family_head"]
    parent = retry["records"]["parent_attempt_envelope"]
    reservation = retry["records"]["reservation"]
    assert lineage["lineage_kind"] == "OPAQUE_RETRY"
    assert lineage["initial_token_hash"] == "ABSENT_RETRY_LINEAGE"
    assert lineage["opaque_retry_authorization_hash"] != "ABSENT_INITIAL_LINEAGE"
    assert parent["attempt_ordinal"] == head_in["attempt_ordinal"] + 1
    assert parent["retry_ordinal"] == head_in["retry_ordinal"] + 1
    assert reservation["derived_attempt_ordinal"] == parent["attempt_ordinal"]
    assert reservation["derived_retry_ordinal"] == parent["retry_ordinal"]
    queue_path = root / fixture["queue_authorization_root"]["path"]
    queue = json.loads(queue_path.read_text(encoding="utf-8"))
    row = next(item for item in queue["items"] if item["id"] == fixture["queue_item_id"])
    row["last_note"] = {"user_id": "forbidden"}
    queue_path.write_text(json.dumps(queue, sort_keys=True), encoding="utf-8")
    with pytest.raises(AssertionError):
        _queue_projection(fixture, root)


def test_future_sut_unknown_commit_same_key_readback() -> None:
    fixture = _load_fixture()
    candidate = _baseline_candidate(fixture)
    transaction = _UnknownCommitTransaction(candidate, mismatch=False)
    assert transaction.events == [] and not transaction.ordinal_allocation_attempted
    module = _load_future_verifier(fixture)
    result = module.evaluate_candidate(
        ROOT,
        candidate,
        mode="CLEAN_CI",
        state={},
        interleaving=None,
        trusted_context=_load_trusted_context(fixture),
        transaction=transaction,
    )
    assert result == "PRE_EXECUTION_RECORD_READY_FOR_SECTION_7_4_CONSUMPTION"
    assert transaction.events == [
        "COMMIT_UNKNOWN",
        "READBACK_SAME_RESERVATION_KEY",
        "EXPOSE_AFTER_EXACT_READBACK",
    ]
    assert not transaction.ordinal_allocation_attempted


def test_future_sut_opaque_retry_lineage_ready() -> None:
    fixture = _load_fixture()
    candidate = _build_candidate(fixture, lineage_kind="OPAQUE_RETRY")
    head = candidate["records"]["current_attempt_family_head"]
    parent = candidate["records"]["parent_attempt_envelope"]
    assert parent["attempt_ordinal"] == head["attempt_ordinal"] + 1
    assert parent["retry_ordinal"] == head["retry_ordinal"] + 1
    module = _load_future_verifier(fixture)
    result = module.evaluate_candidate(
        ROOT,
        candidate,
        mode="CLEAN_CI",
        state={},
        interleaving=None,
        trusted_context=_load_trusted_context(fixture),
    )
    assert result == "PRE_EXECUTION_RECORD_READY_FOR_SECTION_7_4_CONSUMPTION"


def test_future_sut_unknown_commit_mismatched_readback_holds() -> None:
    fixture = _load_fixture()
    candidate = _baseline_candidate(fixture)
    transaction = _UnknownCommitTransaction(candidate, mismatch=True)
    module = _load_future_verifier(fixture)
    result = module.evaluate_candidate(
        ROOT,
        candidate,
        mode="CLEAN_CI",
        state={},
        interleaving=None,
        trusted_context=_load_trusted_context(fixture),
        transaction=transaction,
    )
    assert result == "HOLD"
    assert transaction.events == ["COMMIT_UNKNOWN", "READBACK_SAME_RESERVATION_KEY"]
    assert not transaction.ordinal_allocation_attempted


ATTACK_CASES = _variant_cases(_load_fixture())


@pytest.mark.parametrize(
    ("attack_id", "variant"),
    ATTACK_CASES,
    ids=[f"{attack_id.lower()}-{(variant or 'default').lower()}" for attack_id, variant in ATTACK_CASES],
)
def test_future_sut_declared_attack(
    attack_id: str, variant: str | None, tmp_path: Path
) -> None:
    fixture = _load_fixture()
    root = _copy_inputs(fixture, tmp_path)
    candidate, plan = _prepare_attack(fixture, attack_id, variant, root)
    attack = next(row for row in fixture["attacks"] if row["id"] == attack_id)
    assert attack["expected"].startswith("HOLD")
    context = _load_trusted_context(fixture)
    barrier = plan.get("barrier")
    assert plan["action"] != "concurrent_duplicate" or isinstance(barrier, threading.Barrier)
    module = _load_future_verifier(fixture)
    call_args = {
        "mode": "CLEAN_CI",
        "state": plan["state"],
        "interleaving": plan["interleaving"],
        "trusted_context": context,
    }
    if plan["action"] == "replay":
        first = module.evaluate_candidate(root, plan["first_candidate"], **call_args)
        second = module.evaluate_candidate(root, plan["second_candidate"], **call_args)
        assert first == "PRE_EXECUTION_RECORD_READY_FOR_SECTION_7_4_CONSUMPTION"
        assert second == attack["expected"]
        return
    if plan["action"] == "concurrent_duplicate":
        results: list[str] = []
        errors: list[BaseException] = []

        def contend() -> None:
            try:
                barrier.wait(timeout=2)
                results.append(module.evaluate_candidate(root, copy.deepcopy(candidate), **call_args))
            except BaseException as exc:  # captured for an exact parent-thread assertion
                errors.append(exc)

        threads = [threading.Thread(target=contend) for _ in range(2)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=3)
        assert not errors
        assert not any(thread.is_alive() for thread in threads)
        assert sorted(results) == [
            "HOLD",
            "PRE_EXECUTION_RECORD_READY_FOR_SECTION_7_4_CONSUMPTION",
        ]
        return
    result = module.evaluate_candidate(root, candidate, **call_args)
    if plan["interleaving"] is not None:
        assert plan["interleaving"].invoked
    assert result == attack["expected"]


ENVIRONMENT_CELLS = [
    (row["environment"], row["resource"]) for row in _load_fixture()["environment_cells"]
]


@pytest.mark.parametrize(
    ("environment", "resource"),
    ENVIRONMENT_CELLS,
    ids=[f"{environment.lower()}-{resource.lower()}" for environment, resource in ENVIRONMENT_CELLS],
)
def test_future_sut_environment_cell(
    environment: str, resource: str, tmp_path: Path
) -> None:
    fixture = _load_fixture()
    root = _copy_inputs(fixture, tmp_path)
    candidate = _baseline_candidate(fixture, root)
    if resource == "ABSENT":
        (root / fixture["source_manifest"][0]["path"]).unlink()
    elif resource == "PARTIAL":
        path = root / fixture["source_manifest"][1]["path"]
        path.write_bytes(path.read_bytes()[:32])
    elif resource == "CORRUPT":
        path = root / fixture["source_manifest"][2]["path"]
        path.write_bytes(path.read_bytes() + b"\n")
    expected = _expected_environment(environment, resource)
    row = next(
        item for item in fixture["environment_cells"]
        if item["environment"] == environment and item["resource"] == resource
    )
    assert row["inner"] == expected and row["authority_effect"] == "NONE"
    if environment == "LIVE_RUNTIME":
        assert row["command"] == "NOT_AUTHORIZED"
        assert row["command_exit"] == "NOT_RUN"
        assert row["claim"] == "DESIGN_ONLY"
        return
    home = tmp_path / "home"
    cache = tmp_path / "cache"
    pycache = tmp_path / "pycache"
    for path in (home, cache, pycache):
        path.mkdir()
    controlled = {
        **fixture["environment_controls"],
        "HOME": str(home),
        "XDG_CACHE_HOME": str(cache),
        "PYTHONPYCACHEPREFIX": str(pycache),
        "PYTHONPATH": str(ROOT),
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": str(tmp_path / "empty-gitconfig"),
        "PYTHONHASHSEED": "0",
    }
    python_path = shutil.which("python3", path=controlled["PATH"])
    assert python_path is not None and Path(python_path).is_absolute()
    candidate_path = tmp_path / "candidate.json"
    candidate_path.write_text(
        json.dumps(candidate, sort_keys=True, separators=(",", ":")),
        encoding="utf-8",
    )
    expected_command = fixture["environment_command_template"].format(
        tmp_home=home,
        tmp_cache=cache,
        tmp_pycache=pycache,
        repo_root=ROOT,
        empty_gitconfig=controlled["GIT_CONFIG_GLOBAL"],
        worker_path=ENVIRONMENT_WORKER,
        isolated_root=root,
        candidate_json=candidate_path,
        environment=environment,
    )
    assert row["command"] == f"HERMETIC_WORKER:{environment}"
    assert expected_command.startswith("env -i ")
    assert " uv " not in expected_command
    assert "/usr/bin/python3 " in expected_command
    completed = subprocess.run(
        [
            python_path,
            str(ENVIRONMENT_WORKER),
            "--repo",
            str(ROOT),
            "--root",
            str(root),
            "--candidate",
            str(candidate_path),
            "--mode",
            environment,
        ],
        cwd=ROOT,
        env=controlled,
        capture_output=True,
        text=True,
        timeout=10,
        check=False,
    )
    if completed.returncode == 86 and completed.stdout.strip() == "MISSING_SUT":
        pytest.fail("MISSING_SUT")
    assert completed.returncode == 0, completed.stderr
    result = completed.stdout.strip()
    assert result == expected
