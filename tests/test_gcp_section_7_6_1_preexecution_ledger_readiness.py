"""Preimplementation readiness evidence for Section 7.6.1."""

from __future__ import annotations

import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
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
    "retry_token_issuance",
    "authority_mutation",
    "pre_execution_attempt_acceptance_hash",
}


def _load_fixture() -> dict[str, Any]:
    value = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert isinstance(value, dict)
    return value


def _canonical_sha256(value: Any) -> str:
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


def _digest(label: str) -> str:
    return hashlib.sha256(label.encode()).hexdigest()


def _queue_projection(fixture: dict[str, Any], root: Path = ROOT) -> dict[str, Any]:
    queue = json.loads((root / fixture["queue_authorization_root"]["path"]).read_text())
    matches = [row for row in queue["items"] if row["id"] == fixture["queue_item_id"]]
    assert len(matches) == 1
    row = matches[0]
    assert set(row) == set(fixture["queue_authorization_root"]["exact_row_fields"])
    assert row["status"] in fixture["queue_authorization_root"]["admitted_statuses"]
    fields = fixture["queue_authorization_root"]["immutable_projection_fields"]
    projection = {field: row[field] for field in fields}
    assert _canonical_sha256(projection) == fixture["queue_authorization_root"]["canonical_sha256"]
    return projection


def _record(schema: list[str], name: str) -> dict[str, Any]:
    record: dict[str, Any] = {field: _digest(f"{name}:{field}") for field in schema}
    record["schema_version"] = f"GCP_S761_{name.upper()}_V1"
    for field in ("attempt_ordinal", "retry_ordinal", "derived_attempt_ordinal", "derived_retry_ordinal", "head_version"):
        if field in record:
            record[field] = 1 if "retry" not in field else 0
    for field in ("reserved_at", "consumed_at", "marker_created_at", "record_created_at"):
        if field in record:
            record[field] = 1767225600
    if "record_expires_at" in record:
        record["record_expires_at"] = 1767225900
    if "write_order" in record:
        record["write_order"] = []
    return record


def _baseline_candidate(fixture: dict[str, Any]) -> dict[str, Any]:
    records = {
        name: _record(fields, name)
        for name, fields in fixture["record_schemas"].items()
    }
    records["lineage_input"].update(
        lineage_kind="INITIAL",
        opaque_retry_authorization_hash="ABSENT_INITIAL_LINEAGE",
    )
    records["current_attempt_family_head"].update(
        lineage_state="EMPTY_AUTHENTICATED_GENESIS",
        attempt_ordinal=0,
        retry_ordinal=0,
    )
    records["parent_attempt_envelope"].update(attempt_ordinal=1, retry_ordinal=0)
    records["expected_request_lineage"].update(derived_attempt_ordinal=1, derived_retry_ordinal=0)
    records["reservation"].update(
        derived_attempt_ordinal=1,
        derived_retry_ordinal=0,
        reservation_status="RESERVED_PRE_EXECUTION",
    )
    records["token_consumption_marker"].update(derived_attempt_ordinal=1, derived_retry_ordinal=0)
    records["write_ahead_marker"].update(
        derived_attempt_ordinal=1,
        derived_retry_ordinal=0,
        write_order=copy.deepcopy(fixture["fixed_write_order"]),
    )
    records["new_attempt_family_head"].update(
        lineage_state="RESERVED_PRE_EXECUTION",
        attempt_ordinal=1,
        retry_ordinal=0,
        head_version=1,
    )
    records["pre_execution_record"].update(
        record_status="COMMITTED_EXACT_READBACK",
        authority_effect="NONE",
    )
    transition = _record(fixture["transition_schema"], "transition")
    transition.update(
        commit_disposition="COMMITTED",
        unknown_commit_recovery="SAME_RESERVATION_KEY_READBACK_ONLY",
        readback_disposition="EXACT_BYTES_MATCH",
        exposure_disposition="OPAQUE_RECORD_FOR_SECTION_7_4_ONLY",
    )
    candidate: dict[str, Any] = {
        "schema_version": "GCP_SECTION_7_6_1_PREEXECUTION_LEDGER_CANDIDATE_V1",
        "scope_kind": "DOCS_CONTRACT",
        "authority_effect": "NONE",
        "predecessor_contracts": copy.deepcopy(fixture["source_manifest"]),
        "queue_authorization_projection": _queue_projection(fixture),
        "records": records,
        "transition": transition,
        "ownership_exclusions": copy.deepcopy(fixture["section_7_6_2_exclusive_ownership"]),
        "public_projection": {
            field: records["pre_execution_record"][field]
            for field in fixture["public_projection_fields"]
        },
        "result": {
            "decision": "PRE_EXECUTION_RECORD_READY_FOR_SECTION_7_4_CONSUMPTION",
            "consumer": "SECTION_7_4_ONLY",
            "authority_effect": "NONE",
        },
    }
    return _reseal(candidate)


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
    for entry in [*fixture["source_manifest"], fixture["queue_authorization_root"]]:
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


def _prove_exactly_one_test_winner() -> dict[str, Any]:
    barrier = threading.Barrier(2)
    lock = threading.Lock()
    winners: list[int] = []

    def contend(index: int) -> None:
        barrier.wait()
        with lock:
            if not winners:
                winners.append(index)

    threads = [threading.Thread(target=contend, args=(index,)) for index in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=2)
    assert len(winners) == 1
    return {"contenders": 2, "test_oracle_winner_count": 1}


def _variant_cases(fixture: dict[str, Any]) -> list[tuple[str, str | None]]:
    cases: list[tuple[str, str | None]] = []
    for attack in fixture["attacks"]:
        variants = fixture["attack_variants"].get(attack["id"], [None])
        cases.extend((attack["id"], variant) for variant in variants)
    return cases


def _prepare_attack(
    fixture: dict[str, Any], attack_id: str, variant: str | None, tmp_path: Path
) -> tuple[dict[str, Any], dict[str, Any]]:
    candidate = _baseline_candidate(fixture)
    original_hash = candidate["hashes"]["candidate_sha256"]
    plan: dict[str, Any] = {"state": {}, "interleaving": None}
    records = candidate["records"]

    if attack_id == "A001":
        candidate["unexpected"] = True
        records["pre_execution_record"]["unexpected"] = True
    elif attack_id == "A002":
        if variant == "TOP_LEVEL_RESULT": candidate.pop("result")
        elif variant == "PREDECESSOR_DECISION": candidate["predecessor_contracts"][3].pop("decision")
        elif variant == "TOKEN_MARKER": records.pop("token_consumption_marker")
        elif variant == "WRITE_AHEAD_MARKER": records.pop("write_ahead_marker")
        elif variant == "TRANSITION_READBACK": candidate["transition"].pop("readback_bundle_hash")
    elif attack_id == "A003":
        if variant == "CALLER_IDENTITY": records["parent_attempt_envelope"]["keyed_tenant_commitment"] = "caller"
        elif variant == "CALLER_ORDINAL": records["parent_attempt_envelope"]["attempt_ordinal"] = 9
        elif variant == "BOOLEAN_ATTEMPT_ORDINAL": records["parent_attempt_envelope"]["attempt_ordinal"] = True
        elif variant == "BOOLEAN_RETRY_ORDINAL": records["reservation"]["derived_retry_ordinal"] = False
        elif variant == "CALLER_STATUS": records["reservation"]["reservation_status"] = "CALLER_APPROVED"
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
        if target:
            records[target[0]][target[1]] = _digest("attacker-key")
        else:
            candidate["predecessor_contracts"][0]["owner"] = "ATTACKER"
    elif attack_id == "A009":
        plan["state"] = {
            "preloaded_candidate": copy.deepcopy(candidate),
            "preloaded_reservation_key": records["reservation"]["reservation_key"],
            "preloaded_lineage_token": records["lineage_input"]["authenticated_lineage_token_hash"],
            "variant": variant,
        }
        assert plan["state"]["preloaded_candidate"] == candidate
    elif attack_id == "A010":
        queue_path = tmp_path / fixture["queue_authorization_root"]["path"]
        queue = json.loads(queue_path.read_text())
        row = next(item for item in queue["items"] if item["id"] == fixture["queue_item_id"])
        row["risk"] = "low"
        queue_path.write_text(json.dumps(queue, sort_keys=True), encoding="utf-8")
        source = tmp_path / fixture["source_manifest"][0]["path"]
        source.write_bytes(source.read_bytes() + b"\n")
        candidate["queue_authorization_projection"]["risk"] = "low"
        candidate["predecessor_contracts"][0]["sha256"] = hashlib.sha256(source.read_bytes()).hexdigest()
        for record in records.values():
            for key, value in list(record.items()):
                if isinstance(value, str) and len(value) == 64:
                    record[key] = _digest(f"alternate:{key}")
    elif attack_id == "A011":
        for record in records.values():
            for field in ("reserved_at", "consumed_at", "marker_created_at", "record_created_at", "record_expires_at"):
                if field in record:
                    record[field] += 86400
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
            plan["concurrency"] = _prove_exactly_one_test_winner()
        else:
            source = tmp_path / fixture["source_manifest"][3]["path"]
            original = source.read_bytes()
            probe = _AtomicReplacement(source, original + b"\n")
            probe()
            assert probe.invoked and source.read_bytes() != original
            source.write_bytes(original)
            plan["interleaving"] = _AtomicReplacement(source, original + b"\n")
    elif attack_id == "A018":
        key = "user_id"
        if variant == "TOP_LEVEL": candidate[key] = "forbidden"
        elif variant == "PREDECESSOR_ROW": candidate["predecessor_contracts"][0][key] = "forbidden"
        elif variant == "QUEUE_ROW": candidate["queue_authorization_projection"][key] = "forbidden"
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
        elif variant == "RETRY_TOKEN_ISSUANCE": candidate["public_projection"]["retry_token_issuance"] = _digest("token")
        elif variant == "AUTHORITY_MUTATION": candidate["public_projection"]["authority_mutation"] = "GRANTED"
    else:
        raise AssertionError(f"unprepared attack: {attack_id}")

    candidate = _reseal(candidate)
    resource_only = attack_id in {"A009", "A014", "A015", "A016", "A017"}
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
    assert set(fixture["reservation_key_bindings"]) <= set(candidate["records"]["reservation"])
    assert set(candidate["public_projection"]) == set(fixture["public_projection_fields"])
    assert not (set(candidate["public_projection"]) & FORBIDDEN_PUBLIC_KEYS)
    assert candidate["result"] == {
        "decision": "PRE_EXECUTION_RECORD_READY_FOR_SECTION_7_4_CONSUMPTION",
        "consumer": "SECTION_7_4_ONLY",
        "authority_effect": "NONE",
    }


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
    requirements = fixture["requirements"]
    assert [row["id"] for row in requirements] == [f"S761-R{index:02d}" for index in range(1, 17)]
    assert all(row["oracle"] and row["test"] for row in requirements)
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
    module = _load_future_verifier(fixture)
    result = module.evaluate_candidate(
        root,
        candidate,
        mode="CLEAN_CI",
        state=plan["state"],
        interleaving=plan["interleaving"],
        concurrency=plan.get("concurrency"),
    )
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
def test_future_sut_environment_cell(environment: str, resource: str, tmp_path: Path) -> None:
    fixture = _load_fixture()
    root = _copy_inputs(fixture, tmp_path)
    candidate = _baseline_candidate(fixture)
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
    module = _load_future_verifier(fixture)
    result = module.evaluate_candidate(
        root, candidate, mode=environment, state={}, interleaving=None, concurrency=None
    )
    assert result == expected
