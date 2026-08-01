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

from scripts.verify_gcp_section_7_5_2_network_local_enforcement import (
    CONTRACT_PATH as CONTRACT_RELATIVE_PATH,
    EXCLUDED_P07_NODES,
    EXPECTED_DECISION,
    EXPECTED_SOURCE_CONTRACTS,
    OWNED_P07_NODES,
    OWNED_PREREQUISITES,
    VECTORS_PATH as VECTORS_RELATIVE_PATH,
    NetworkLocalValidationError,
    validate_bundle,
    validate_contract,
)


ROOT = Path(__file__).resolve().parents[1]
CONTRACT_PATH = ROOT / (
    "docs/contracts/canonical-inference-gcp-network-local-enforcement/"
    "network-local-enforcement-contract.json"
)
REGISTRY_PATH = ROOT / (
    "docs/contracts/canonical-inference-gcp-transport-persistence-constraints/"
    "constraints-open-obligations-contract.json"
)
EXPECTED_REGISTRY_SHA256 = (
    "2ff8621366dca45aade8a54029ee0fa818b366ae689e4466d536f93a9dd6b9d0"
)
SOURCE_PATHS = tuple(path for _owner, path, _digest in EXPECTED_SOURCE_CONTRACTS)


def _load_json(path: Path) -> dict[str, Any]:
    """Load one JSON object for test-only mutation."""

    value = json.loads(path.read_text(encoding="utf-8"))
    assert isinstance(value, dict)
    return value


def _write_json(path: Path, value: dict[str, Any]) -> None:
    """Write one deterministic JSON object in a temporary test tree."""

    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _copy_inputs(tmp_path: Path) -> Path:
    """Copy every explicit verifier input into a temporary repository root."""

    for relative_path in (
        CONTRACT_RELATIVE_PATH,
        VECTORS_RELATIVE_PATH,
        *SOURCE_PATHS,
    ):
        source = ROOT / relative_path
        target = tmp_path / relative_path
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    return tmp_path


def _rehash_record(contract: dict[str, Any], record: dict[str, Any]) -> None:
    """Recompute a mutated synthetic record hash so semantics are reached."""

    schemas = {
        schema["schema_version"]: schema for schema in contract["record_schemas"]
    }
    schema = schemas[record["schema_version"]]
    body = {key: value for key, value in record.items() if key != "record_sha256"}
    canonical = json.dumps(
        body, ensure_ascii=False, separators=(",", ":"), sort_keys=True
    ).encode("utf-8")
    record["record_sha256"] = hashlib.sha256(
        schema["domain_separator"].encode("ascii") + b"\x00" + canonical
    ).hexdigest()


def test_contract_exists_without_registry_drift() -> None:
    """Require the new contract while pinning the immutable Section 7.5A bytes."""

    assert CONTRACT_PATH.is_file(), f"missing contract: {CONTRACT_PATH}"
    assert hashlib.sha256(REGISTRY_PATH.read_bytes()).hexdigest() == (
        EXPECTED_REGISTRY_SHA256
    )


def test_contract_closes_only_owned_structure_and_stays_silent(
    capsys: pytest.CaptureFixture[str],
) -> None:
    """Validate the exact docs-only closure without producing verifier output."""

    contract = validate_contract(ROOT)

    assert capsys.readouterr() == ("", "")
    assert contract["decision"] == EXPECTED_DECISION
    assert contract["authority_effect"] == "NONE"
    assert contract["actual_evidence"] == {
        "approvals_present": False,
        "live_evidence_present": False,
        "runtime_records_present": False,
    }
    assert tuple(contract["scope"]["owned_prerequisite_ids"]) == OWNED_PREREQUISITES
    assert tuple(contract["scope"]["owned_p07_nodes"]) == OWNED_P07_NODES
    assert tuple(contract["scope"]["excluded_p07_nodes"]) == EXCLUDED_P07_NODES


def test_declared_adversarial_vectors_fail_with_exact_dispositions() -> None:
    """Prove every checked-in mutation reaches its declared fail-closed result."""

    contract = _load_json(ROOT / CONTRACT_RELATIVE_PATH)
    vectors = _load_json(ROOT / VECTORS_RELATIVE_PATH)
    for mutation in vectors["mutations"]:
        bundle = copy.deepcopy(vectors["valid_bundle"])
        index = mutation["record_index"]
        if index == -1:
            bundle[mutation["field"]] = mutation["value"]
        else:
            record = bundle["records"][index]
            record[mutation["field"]] = mutation["value"]
            _rehash_record(contract, record)
        with pytest.raises(NetworkLocalValidationError) as raised:
            validate_bundle(contract, bundle)
        assert raised.value.code == mutation["expected"]


@pytest.mark.parametrize(
    ("record_index", "field"),
    [
        (1, "private_ingress_full_interval"),
        (1, "private_egress_full_interval"),
        (1, "uds_only_local_delivery"),
        (1, "no_relay_process"),
        (1, "caller_method_authentication_complete"),
        (1, "tls_target_certificate_binding_verified"),
        (4, "binder_owned_send"),
        (5, "dns_observation_complete"),
        (5, "firewall_observation_complete"),
        (5, "route_observation_complete"),
        (5, "perimeter_observation_complete"),
        (6, "disk_policy_approved_full_interval"),
        (6, "tmpfs_only_full_interval"),
        (6, "swap_disabled_full_interval"),
        (6, "prohibited_logging_disabled_full_interval"),
        (6, "unapproved_local_persistence_absent_full_interval"),
    ],
)
def test_missing_whole_interval_mechanism_holds(
    record_index: int, field: str
) -> None:
    """Hold on every individual network, channel, or local mechanism gap."""

    contract = _load_json(ROOT / CONTRACT_RELATIVE_PATH)
    bundle = _load_json(ROOT / VECTORS_RELATIVE_PATH)["valid_bundle"]
    record = bundle["records"][record_index]
    record[field] = False
    _rehash_record(contract, record)

    with pytest.raises(
        NetworkLocalValidationError,
        match="mechanism proof absent",
    ) as raised:
        validate_bundle(contract, bundle)
    assert raised.value.code == "HOLD_NETWORK_CHANNEL_OR_LOCAL_MECHANISM"


@pytest.mark.parametrize(
    "mutate",
    [
        lambda bundle: bundle["records"][5].update(
            caller_method_ids=["KMS_ASYMMETRIC_SIGN", "KMS_ASYMMETRIC_SIGN"]
        ),
        lambda bundle: bundle["records"][5].update(
            caller_method_ids=["KMS_ASYMMETRIC_SIGN", "UNKNOWN_METHOD"]
        ),
        lambda bundle: bundle["records"][5].update(
            caller_method_ids=["KMS_ASYMMETRIC_SIGN"]
        ),
        lambda bundle: bundle["records"][0].update(
            section_7_5_trust_record_verified_at="2025-12-31T23:59:59Z"
        ),
        lambda bundle: bundle["records"][0].update(
            section_7_5_trust_record_verified_at="2026-01-02T00:00:01Z"
        ),
    ],
    ids=[
        "duplicate-method",
        "unknown-method",
        "missing-method",
        "stale-trust-time",
        "future-trust-time",
    ],
)
def test_authentication_and_freshness_drift_rejects(
    mutate: Callable[[dict[str, Any]], None],
) -> None:
    """Reject incomplete method identity and out-of-interval trust evidence."""

    contract = _load_json(ROOT / CONTRACT_RELATIVE_PATH)
    bundle = _load_json(ROOT / VECTORS_RELATIVE_PATH)["valid_bundle"]
    mutate(bundle)
    for record in bundle["records"]:
        _rehash_record(contract, record)

    with pytest.raises(NetworkLocalValidationError) as raised:
        validate_bundle(contract, bundle)
    assert raised.value.code == "REJECT_AUTHENTICATION_OR_FRESHNESS"


def test_interval_mismatch_holds() -> None:
    """Hold when any record fails to cover the exact shared interval."""

    contract = _load_json(ROOT / CONTRACT_RELATIVE_PATH)
    bundle = _load_json(ROOT / VECTORS_RELATIVE_PATH)["valid_bundle"]
    record = bundle["records"][6]
    record["observation_interval_start"] = "2026-01-01T00:00:01Z"
    _rehash_record(contract, record)

    with pytest.raises(NetworkLocalValidationError) as raised:
        validate_bundle(contract, bundle)
    assert raised.value.code == "HOLD_INTERVAL_COMPLETENESS"


@pytest.mark.parametrize(
    "mutate",
    [
        lambda value: value.update(authority_effect="AUTHORIZED"),
        lambda value: value["runtime_evidence_registries"][
            "approval_records"
        ].append("forged"),
        lambda value: value["scope"]["owned_prerequisite_ids"].append("S75A-P10"),
        lambda value: value["source_contracts"][0].update(sha256="0" * 64),
        lambda value: value["scope"].update(unexpected="forbidden"),
        lambda value: value["runtime_evidence_registries"].update(
            unexpected=[]
        ),
        lambda value: value["network_method_contract"]["caller_method_ids"].append(
            "UNKNOWN_METHOD"
        ),
    ],
    ids=[
        "authority",
        "live-evidence",
        "scope-expansion",
        "parent-pin",
        "nested-scope-field",
        "nested-registry-field",
        "method-contract-expansion",
    ],
)
def test_contract_mutations_fail_closed(
    tmp_path: Path, mutate: Callable[[dict[str, Any]], None]
) -> None:
    """Reject authority, evidence, ownership, and source-pin drift."""

    root = _copy_inputs(tmp_path)
    path = root / CONTRACT_RELATIVE_PATH
    contract = _load_json(path)
    mutate(contract)
    _write_json(path, contract)

    with pytest.raises(NetworkLocalValidationError):
        validate_contract(root)


@pytest.mark.parametrize(
    "relative_path",
    (CONTRACT_RELATIVE_PATH, VECTORS_RELATIVE_PATH, *SOURCE_PATHS),
)
def test_verifier_rejects_symlinked_explicit_locator(
    tmp_path: Path, relative_path: str
) -> None:
    """Reject symlink substitution at every explicit file locator."""

    root = _copy_inputs(tmp_path)
    locator = root / relative_path
    target = root / f"same-bytes-{hashlib.sha256(relative_path.encode()).hexdigest()}.json"
    target.write_bytes(locator.read_bytes())
    locator.unlink()
    locator.symlink_to(target)

    with pytest.raises(NetworkLocalValidationError, match="unreadable"):
        validate_contract(root)


def test_verifier_rejects_symlinked_parent_component(tmp_path: Path) -> None:
    """Reject a symlink in an explicit contract directory component."""

    root = _copy_inputs(tmp_path)
    contract = root / CONTRACT_RELATIVE_PATH
    component = contract.parent
    moved = root / "same-contract-parent"
    component.rename(moved)
    component.symlink_to(moved, target_is_directory=True)

    with pytest.raises(NetworkLocalValidationError, match="unreadable"):
        validate_contract(root)


def test_verifier_rejects_fifo_without_blocking(tmp_path: Path) -> None:
    """Reject a FIFO locator without waiting for a writer."""

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
                "from scripts.verify_gcp_section_7_5_2_network_local_enforcement "
                "import NetworkLocalValidationError,validate_contract;"
                "\ntry: validate_contract(sys.argv[1])"
                "\nexcept NetworkLocalValidationError: raise SystemExit(0)"
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


def test_verifier_rejects_duplicate_authority_key(tmp_path: Path) -> None:
    """Reject duplicate JSON keys before any authority decision is evaluated."""

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

    with pytest.raises(NetworkLocalValidationError, match="unreadable"):
        validate_contract(root)
