from __future__ import annotations

import copy
import hashlib
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any, Callable

import pytest

from scripts.verify_gcp_section_7_5_3_persistence_anchor import (
    CONTRACT_PATH as CONTRACT_RELATIVE_PATH,
    EXCLUDED_P07_NODES,
    EXPECTED_DECISION,
    EXPECTED_SOURCE_CONTRACTS,
    FORBIDDEN_SECTION_7_6,
    OWNED_P07_NODES,
    OWNED_PREREQUISITES,
    VECTORS_PATH as VECTORS_RELATIVE_PATH,
    PersistenceAnchorValidationError,
    validate_bundle,
    validate_contract,
)


ROOT = Path(__file__).resolve().parents[1]
CONTRACT_PATH = ROOT / CONTRACT_RELATIVE_PATH
REGISTRY_PATH = ROOT / EXPECTED_SOURCE_CONTRACTS[0][1]
EXPECTED_REGISTRY_SHA256 = (
    "2ff8621366dca45aade8a54029ee0fa818b366ae689e4466d536f93a9dd6b9d0"
)
SOURCE_PATHS = tuple(path for _owner, path, _digest in EXPECTED_SOURCE_CONTRACTS)


def _load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    assert isinstance(value, dict)
    return value


def _write_json(path: Path, value: dict[str, Any]) -> None:
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _copy_inputs(tmp_path: Path) -> Path:
    for relative_path in (CONTRACT_RELATIVE_PATH, VECTORS_RELATIVE_PATH, *SOURCE_PATHS):
        source = ROOT / relative_path
        target = tmp_path / relative_path
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    return tmp_path


def _fixture() -> tuple[dict[str, Any], dict[str, Any]]:
    contract = _load_json(CONTRACT_PATH)
    bundle = copy.deepcopy(_load_json(ROOT / VECTORS_RELATIVE_PATH)["valid_bundle"])
    return contract, bundle


def _rehash(contract: dict[str, Any], record: dict[str, Any]) -> None:
    schemas = {item["schema_version"]: item for item in contract["record_schemas"]}
    schema = schemas[record["schema_version"]]
    body = {key: value for key, value in record.items() if key != "record_sha256"}
    canonical = json.dumps(body, ensure_ascii=False, separators=(",", ":"), sort_keys=True).encode()
    record["record_sha256"] = hashlib.sha256(
        schema["domain_separator"].encode("ascii") + b"\x00" + canonical
    ).hexdigest()


def _mutate_record(
    index: int, mutate: Callable[[dict[str, Any]], None]
) -> tuple[dict[str, Any], dict[str, Any]]:
    contract, bundle = _fixture()
    records = bundle["records"]
    mutate(records[index])
    _rehash(contract, records[index])
    if index == 1:
        records[0]["gcs_object_record_sha256"] = records[1]["record_sha256"]
        for replay in records[4:]:
            replay["gcs_object_record_sha256"] = records[1]["record_sha256"]
            _rehash(contract, replay)
    elif index == 2:
        records[0]["spanner_transaction_record_sha256"] = records[2]["record_sha256"]
    elif index == 3:
        records[0]["anchor_record_sha256"] = records[3]["record_sha256"]
    if index in {1, 2, 3}:
        _rehash(contract, records[0])
    return contract, bundle


def test_contract_exists_without_registry_drift() -> None:
    assert CONTRACT_PATH.is_file()
    assert hashlib.sha256(REGISTRY_PATH.read_bytes()).hexdigest() == EXPECTED_REGISTRY_SHA256


def test_exact_docs_only_contract_validates_silently(
    capsys: pytest.CaptureFixture[str],
) -> None:
    contract = validate_contract(ROOT)

    assert capsys.readouterr() == ("", "")
    assert contract["decision"] == EXPECTED_DECISION
    assert contract["authority_effect"] == "NONE"
    assert tuple(contract["scope"]["owned_prerequisite_ids"]) == OWNED_PREREQUISITES
    assert tuple(contract["scope"]["owned_p07_nodes"]) == OWNED_P07_NODES
    assert tuple(contract["scope"]["excluded_p07_nodes"]) == EXCLUDED_P07_NODES
    assert tuple(contract["forbidden_section_7_6_semantics"]) == FORBIDDEN_SECTION_7_6
    assert all(not records for records in contract["runtime_evidence_registries"].values())


@pytest.mark.parametrize(
    ("index", "mutate", "expected"),
    [
        (0, lambda r: r.update(sequence_number=1), "REJECT_FORK_REPLACEMENT_OR_RETRY"),
        (0, lambda r: r.update(predecessor_checkpoint_sha256="0" * 64), "REJECT_AUTHENTICATION_FRESHNESS_OR_CURRENTNESS"),
        (0, lambda r: r.update(created_at="2026-01-01T01:00:00.000Z"), "REJECT_SCHEMA_CANONICALIZATION_OR_HASH"),
        (1, lambda r: r.update(if_generation_match=1), "REJECT_FORK_REPLACEMENT_OR_RETRY"),
        (1, lambda r: r.update(if_generation_match=False), "REJECT_FORK_REPLACEMENT_OR_RETRY"),
        (1, lambda r: r.update(no_replacement=False), "REJECT_FORK_REPLACEMENT_OR_RETRY"),
        (1, lambda r: r.update(generation=0), "HOLD_RETENTION_TRANSACTION_OR_ANCHOR_MECHANISM"),
        (1, lambda r: r.update(history_scope="ACTIVE_ONLY"), "HOLD_RETENTION_TRANSACTION_OR_ANCHOR_MECHANISM"),
        (2, lambda r: r.update(previously_begun_transaction=False), "REJECT_FORK_REPLACEMENT_OR_RETRY"),
        (2, lambda r: r.update(serializable_read_write=False), "REJECT_FORK_REPLACEMENT_OR_RETRY"),
        (2, lambda r: r.update(transport_retry_prohibited=False), "REJECT_FORK_REPLACEMENT_OR_RETRY"),
        (2, lambda r: r.update(unknown_commit_resolution="BLIND_RETRY"), "REJECT_FORK_REPLACEMENT_OR_RETRY"),
        (3, lambda r: r.update(nonrollbackable=False), "HOLD_RETENTION_TRANSACTION_OR_ANCHOR_MECHANISM"),
        (3, lambda r: r.update(linearizable_check_and_use=False), "HOLD_RETENTION_TRANSACTION_OR_ANCHOR_MECHANISM"),
        (3, lambda r: r.update(stale_reader_rejected=False), "HOLD_RETENTION_TRANSACTION_OR_ANCHOR_MECHANISM"),
        (3, lambda r: r.update(whole_state_restore_detected=False), "HOLD_RETENTION_TRANSACTION_OR_ANCHOR_MECHANISM"),
        (3, lambda r: r.update(before_commit_recovery_verified=False), "HOLD_RETENTION_TRANSACTION_OR_ANCHOR_MECHANISM"),
        (3, lambda r: r.update(after_commit_recovery_verified=False), "HOLD_RETENTION_TRANSACTION_OR_ANCHOR_MECHANISM"),
        (4, lambda r: r.update(all_required_bytes_retrieved=False), "HOLD_RETENTION_TRANSACTION_OR_ANCHOR_MECHANISM"),
        (5, lambda r: r.update(exact_target_and_challenge_match=False), "HOLD_RETENTION_TRANSACTION_OR_ANCHOR_MECHANISM"),
        (6, lambda r: r.update(retention_guaranteed_until="2026-12-31T00:00:00Z"), "HOLD_RETENTION_TRANSACTION_OR_ANCHOR_MECHANISM"),
    ],
)
def test_mechanism_and_lineage_fail_closed(
    index: int,
    mutate: Callable[[dict[str, Any]], None],
    expected: str,
) -> None:
    contract, bundle = _mutate_record(index, mutate)
    with pytest.raises(PersistenceAnchorValidationError) as raised:
        validate_bundle(contract, bundle)
    assert raised.value.code == expected


@pytest.mark.parametrize("index", range(4, 7))
def test_replay_challenge_interval_must_be_ordered(index: int) -> None:
    contract, bundle = _mutate_record(
        index, lambda record: record.update(challenge_expires_at=record["challenge_issued_at"])
    )
    with pytest.raises(PersistenceAnchorValidationError) as raised:
        validate_bundle(contract, bundle)
    assert raised.value.code == "HOLD_RETENTION_TRANSACTION_OR_ANCHOR_MECHANISM"


def test_unknown_spanner_commit_requires_unknown_timestamp() -> None:
    contract, bundle = _mutate_record(2, lambda record: record.update(commit_outcome="UNKNOWN"))
    with pytest.raises(PersistenceAnchorValidationError) as raised:
        validate_bundle(contract, bundle)
    assert raised.value.code == "REJECT_SCHEMA_CANONICALIZATION_OR_HASH"


def test_unknown_spanner_commit_with_reread_posture_validates() -> None:
    contract, bundle = _mutate_record(
        2,
        lambda record: record.update(
            commit_outcome="UNKNOWN", provider_commit_timestamp="UNKNOWN"
        ),
    )
    assert validate_bundle(contract, bundle) == EXPECTED_DECISION


@pytest.mark.parametrize(
    ("index", "field", "value", "expected"),
    [
        (0, "target_binding_sha256", "1" * 64, "REJECT_PARENT_TARGET_SOURCE_OR_OWNERSHIP"),
        (3, "checkpoint_state_sha256", "2" * 64, "REJECT_AUTHENTICATION_FRESHNESS_OR_CURRENTNESS"),
        (4, "gcs_object_record_sha256", "3" * 64, "HOLD_RETENTION_TRANSACTION_OR_ANCHOR_MECHANISM"),
        (
            4,
            "section_7_4_acceptance_node_id",
            "current_section_7_4_replay_retention_acceptance_hash",
            "REJECT_PARENT_TARGET_SOURCE_OR_OWNERSHIP",
        ),
    ],
)
def test_cross_record_binding_conflicts_reject(
    index: int, field: str, value: Any, expected: str
) -> None:
    contract, bundle = _fixture()
    bundle["records"][index][field] = value
    _rehash(contract, bundle["records"][index])
    with pytest.raises(PersistenceAnchorValidationError) as raised:
        validate_bundle(contract, bundle)
    assert raised.value.code == expected


@pytest.mark.parametrize(
    ("index", "field"),
    [
        (5, "all_manifest_bytes_retrieved_now"),
        (5, "all_nested_attestation_evidence_bytes_retrieved_now"),
        (5, "all_historical_record_bundles_retrieved_now"),
        (6, "all_manifest_bytes_retrieved_now"),
        (6, "all_nested_section_7_4_evidence_bytes_retrieved_now"),
        (6, "section_7_6_terminal_proof_bundle_retrieved_now"),
        (6, "current_replay_policy_bundle_retrieved_now"),
    ],
)
def test_phase_specific_retrieval_completeness_holds(index: int, field: str) -> None:
    contract, bundle = _mutate_record(index, lambda record: record.update({field: False}))
    with pytest.raises(PersistenceAnchorValidationError) as raised:
        validate_bundle(contract, bundle)
    assert raised.value.code == "HOLD_RETENTION_TRANSACTION_OR_ANCHOR_MECHANISM"


def test_record_bound_challenge_conflict_rejects() -> None:
    contract, bundle = _mutate_record(
        5, lambda record: record.update(record_bound_challenge_sha256="0" * 64)
    )
    with pytest.raises(PersistenceAnchorValidationError) as raised:
        validate_bundle(contract, bundle)
    assert raised.value.code == "REJECT_AUTHENTICATION_FRESHNESS_OR_CURRENTNESS"


def test_reused_retention_challenge_rejects() -> None:
    contract, bundle = _fixture()
    current = bundle["records"][5]
    initial = bundle["records"][4]
    current["challenge_sha256"] = initial["challenge_sha256"]
    current["record_bound_challenge_sha256"] = initial["challenge_sha256"]
    _rehash(contract, current)
    with pytest.raises(PersistenceAnchorValidationError) as raised:
        validate_bundle(contract, bundle)
    assert raised.value.code == "REJECT_AUTHENTICATION_FRESHNESS_OR_CURRENTNESS"


@pytest.mark.parametrize("field", ["attempt_reservation", "retry_token", "terminal_state"])
def test_section_7_6_semantics_are_rejected(field: str) -> None:
    contract, bundle = _fixture()
    bundle["records"][0][field] = "FORBIDDEN"
    with pytest.raises(PersistenceAnchorValidationError) as raised:
        validate_bundle(contract, bundle)
    assert raised.value.code == "REJECT_PRIVACY_OR_BOUNDARY"


@pytest.mark.parametrize(
    "mutate",
    [
        lambda value: value.update(authority_effect="AUTHORIZED"),
        lambda value: value["actual_evidence"].update(live_evidence_present=True),
        lambda value: value["scope"]["owned_prerequisite_ids"].append("S75A-P08"),
        lambda value: value["scope"]["owned_p07_nodes"].append("audit_mapping_acceptance_hash"),
        lambda value: value["source_contracts"][0].update(sha256="0" * 64),
        lambda value: value["runtime_evidence_registries"]["gcs_records"].append("forged"),
        lambda value: value["runtime_evidence_registries"].update(unexpected=[]),
        lambda value: value["checkpoint_mechanics"].update(unexpected="forbidden"),
    ],
)
def test_contract_authority_scope_and_pin_drift_rejects(
    tmp_path: Path, mutate: Callable[[dict[str, Any]], None]
) -> None:
    root = _copy_inputs(tmp_path)
    path = root / CONTRACT_RELATIVE_PATH
    contract = _load_json(path)
    mutate(contract)
    _write_json(path, contract)
    with pytest.raises(PersistenceAnchorValidationError):
        validate_contract(root)


@pytest.mark.parametrize("relative_path", (CONTRACT_RELATIVE_PATH, VECTORS_RELATIVE_PATH, *SOURCE_PATHS))
def test_explicit_locators_reject_symlinks(tmp_path: Path, relative_path: str) -> None:
    root = _copy_inputs(tmp_path)
    locator = root / relative_path
    target = root / f"same-{hashlib.sha256(relative_path.encode()).hexdigest()}.json"
    target.write_bytes(locator.read_bytes())
    locator.unlink()
    locator.symlink_to(target)
    with pytest.raises(PersistenceAnchorValidationError, match="unreadable"):
        validate_contract(root)


def test_nonobject_record_rejects_with_sanitized_failure() -> None:
    contract, bundle = _fixture()
    bundle["records"][3] = "not-an-object"
    with pytest.raises(PersistenceAnchorValidationError) as raised:
        validate_bundle(contract, bundle)
    assert raised.value.code == "REJECT_SCHEMA_CANONICALIZATION_OR_HASH"


def test_parent_component_symlink_rejects(tmp_path: Path) -> None:
    root = _copy_inputs(tmp_path)
    component = (root / CONTRACT_RELATIVE_PATH).parent
    moved = root / "same-contract-parent"
    component.rename(moved)
    component.symlink_to(moved, target_is_directory=True)
    with pytest.raises(PersistenceAnchorValidationError, match="unreadable"):
        validate_contract(root)


def test_fifo_rejects_without_blocking(tmp_path: Path) -> None:
    root = _copy_inputs(tmp_path)
    contract = root / CONTRACT_RELATIVE_PATH
    contract.unlink()
    os.mkfifo(contract)
    probe = subprocess.run(
        [
            sys.executable,
            "-c",
            (
                "import sys;"
                "from scripts.verify_gcp_section_7_5_3_persistence_anchor "
                "import PersistenceAnchorValidationError,validate_contract;"
                "\ntry: validate_contract(sys.argv[1])"
                "\nexcept PersistenceAnchorValidationError: raise SystemExit(0)"
                "\nraise SystemExit(1)"
            ),
            str(root),
        ],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
        timeout=5,
    )
    assert probe.returncode == 0, probe.stdout + probe.stderr


def test_duplicate_authority_key_rejects(tmp_path: Path) -> None:
    root = _copy_inputs(tmp_path)
    path = root / CONTRACT_RELATIVE_PATH
    raw = path.read_text(encoding="utf-8")
    path.write_text(
        raw.replace(
            '  "authority_effect": "NONE",',
            '  "authority_effect": "AUTHORIZED",\n  "authority_effect": "NONE",',
            1,
        ),
        encoding="utf-8",
    )
    with pytest.raises(PersistenceAnchorValidationError, match="unreadable"):
        validate_contract(root)
