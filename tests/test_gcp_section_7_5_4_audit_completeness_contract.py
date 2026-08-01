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

from scripts.verify_gcp_section_7_5_4_audit_completeness import (
    APPLICABILITY_EVIDENCE_DOMAIN,
    CONDITIONAL_MAPPING_IDS,
    CONTRACT_PATH as CONTRACT_RELATIVE_PATH,
    DENIED_CANARY_MAPPING_ID,
    EXCLUDED_P07_NODES,
    EXPECTED_DECISION,
    EXPECTED_SOURCE_CONTRACTS,
    OWNED_P07_NODES,
    OWNED_PREREQUISITES,
    UNCONDITIONAL_POLICY_DENIED_MAPPING_IDS,
    VECTORS_PATH as VECTORS_RELATIVE_PATH,
    AuditCompletenessValidationError,
    _validate_inventory,
    _mapping_ids_sha256,
    validate_bundle,
    validate_contract,
)


ROOT = Path(__file__).resolve().parents[1]
CONTRACT_PATH = ROOT / CONTRACT_RELATIVE_PATH
REGISTRY_PATH = ROOT / EXPECTED_SOURCE_CONTRACTS[0][1]
INVENTORY_PATH = ROOT / EXPECTED_SOURCE_CONTRACTS[1][1]
EXPECTED_REGISTRY_SHA256 = EXPECTED_SOURCE_CONTRACTS[0][2]
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
    if index < 4:
        fields = (
            "audit_universe_record_sha256",
            "audit_route_timeline_record_sha256",
            "audit_delivery_completeness_record_sha256",
            "audit_privacy_projection_record_sha256",
        )
        records[4][fields[index]] = records[index]["record_sha256"]
        _rehash(contract, records[4])
    return contract, bundle


def _mutate_applicability(
    mutate: Callable[[dict[str, Any]], None]
) -> tuple[dict[str, Any], dict[str, Any]]:
    contract, bundle = _fixture()
    universe = bundle["records"][0]
    projection = universe["applicability_evidence_projection"]
    mutate(projection)
    body = {key: value for key, value in projection.items() if key != "record_sha256"}
    projection["record_sha256"] = hashlib.sha256(
        APPLICABILITY_EVIDENCE_DOMAIN.encode("ascii")
        + b"\x00"
        + json.dumps(
            body, ensure_ascii=False, separators=(",", ":"), sort_keys=True
        ).encode()
    ).hexdigest()
    universe["applicability_evidence_projection_sha256"] = projection["record_sha256"]
    _rehash(contract, universe)
    bundle["records"][4]["audit_universe_record_sha256"] = universe["record_sha256"]
    _rehash(contract, bundle["records"][4])
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
    assert all(not records for records in contract["runtime_evidence_registries"].values())


@pytest.mark.parametrize(
    ("index", "field", "value", "expected"),
    [
        (0, "all_rows_classified", False, "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE"),
        (0, "all_methods_accounted", False, "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE"),
        (0, "data_access_enabled", False, "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE"),
        (0, "policy_denied_total_applicability", False, "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE"),
        (0, "exclusion_methods_fully_classified", False, "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE"),
        (0, "observed_row_count", 88, "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE"),
        (1, "full_route_timeline_complete", False, "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE"),
        (1, "policy_denied_no_exclusion", False, "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE"),
        (1, "all_exclusion_methods_observed", False, "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE"),
        (1, "router_buffer_not_used_as_completeness", False, "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE"),
        (2, "all_services_supported", False, "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE"),
        (2, "all_routes_observed", False, "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE"),
        (2, "sink_errors_checked", False, "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE"),
        (2, "missing_method_count", 1, "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE"),
        (2, "missing_route_count", 1, "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE"),
        (2, "missing_policy_denied_count", 1, "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE"),
        (3, "raw_evidence_restricted", False, "REJECT_PRIVACY_OR_BOUNDARY"),
        (3, "identifier_fields_excluded", False, "REJECT_PRIVACY_OR_BOUNDARY"),
        (3, "request_response_metadata_excluded", False, "REJECT_PRIVACY_OR_BOUNDARY"),
        (3, "resource_name_excluded", False, "REJECT_PRIVACY_OR_BOUNDARY"),
        (3, "principal_subject_excluded", False, "REJECT_PRIVACY_OR_BOUNDARY"),
    ],
)
def test_required_audit_mechanisms_fail_closed(
    index: int, field: str, value: Any, expected: str
) -> None:
    contract, bundle = _mutate_record(index, lambda record: record.update({field: value}))
    with pytest.raises(AuditCompletenessValidationError) as raised:
        validate_bundle(contract, bundle)
    assert raised.value.code == expected


def test_named_canary_and_conditional_path_evidence_are_required() -> None:
    contract, bundle = _fixture()
    universe = bundle["records"][0]
    universe.pop("applicability_evidence_projection", None)
    universe.pop("applicability_evidence_projection_sha256", None)
    _rehash(contract, universe)
    bundle["records"][4]["audit_universe_record_sha256"] = universe["record_sha256"]
    _rehash(contract, bundle["records"][4])
    with pytest.raises(AuditCompletenessValidationError):
        validate_bundle(contract, bundle)


@pytest.mark.parametrize(
    "mutate",
    [
        lambda value: value["denied_canary"].update(mapping_id="S75-M036"),
        lambda value: value["denied_canary"].update(observed_disposition="ALLOWED"),
        lambda value: value["denied_canary"].update(evidence_kind="CLAIM_ONLY"),
        lambda value: value["denied_canary"].update(evidence_sha256="0" * 64),
        lambda value: value["conditional_paths"].pop(),
        lambda value: value["conditional_paths"].reverse(),
        lambda value: value["conditional_paths"][0].update(mapping_id="S75-M999"),
        lambda value: value["conditional_paths"][0].update(
            disposition="NOT_APPLICABLE"
        ),
        lambda value: value["conditional_paths"][0].update(
            evidence_sha256=value["denied_canary"]["evidence_sha256"]
        ),
        lambda value: value.update(applicable_mapping_ids_sha256="0" * 64),
        lambda value: value.update(
            observed_policy_denied_mapping_ids_sha256="0" * 64
        ),
    ],
)
def test_canary_or_path_applicability_false_clear_holds(
    mutate: Callable[[dict[str, Any]], None]
) -> None:
    contract, bundle = _mutate_applicability(mutate)
    with pytest.raises(AuditCompletenessValidationError) as raised:
        validate_bundle(contract, bundle)
    assert raised.value.code == "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE"


def test_substantiated_not_applicable_path_validates() -> None:
    def mutate(projection: dict[str, Any]) -> None:
        projection["conditional_paths"][0].update(
            disposition="NOT_APPLICABLE",
            evidence_kind="PATH_NOT_APPLICABLE_PROOF",
        )
        applicable = sorted(
            [
                *UNCONDITIONAL_POLICY_DENIED_MAPPING_IDS,
                DENIED_CANARY_MAPPING_ID,
                *CONDITIONAL_MAPPING_IDS[1:],
            ]
        )
        digest = _mapping_ids_sha256(applicable)
        projection["applicable_mapping_ids_sha256"] = digest
        projection["observed_policy_denied_mapping_ids_sha256"] = digest

    contract, bundle = _mutate_applicability(mutate)
    assert validate_bundle(contract, bundle) == EXPECTED_DECISION


def test_route_timeline_must_be_nonempty() -> None:
    contract, bundle = _mutate_record(
        1, lambda record: record.update(interval_end=record["interval_start"])
    )
    with pytest.raises(AuditCompletenessValidationError) as raised:
        validate_bundle(contract, bundle)
    assert raised.value.code == "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE"


def test_impossible_calendar_timestamp_is_categorized() -> None:
    contract, bundle = _mutate_record(
        1, lambda record: record.update(interval_start="2026-02-30T00:00:00Z")
    )
    with pytest.raises(AuditCompletenessValidationError) as raised:
        validate_bundle(contract, bundle)
    assert raised.value.code == "REJECT_SCHEMA_CANONICALIZATION_OR_HASH"


def test_delivery_interval_must_match_route_timeline() -> None:
    contract, bundle = _mutate_record(
        2, lambda record: record.update(interval_start="2025-12-31T00:00:00Z")
    )
    with pytest.raises(AuditCompletenessValidationError) as raised:
        validate_bundle(contract, bundle)
    assert raised.value.code == "REJECT_AUTHENTICATION_FRESHNESS_OR_TIMELINE"


@pytest.mark.parametrize(
    ("index", "left", "right"),
    [
        (1, "independent_observation_root_sha256", "source_project_roots_sha256"),
        (2, "independent_delivery_observation_sha256", "source_delivery_receipts_sha256"),
    ],
)
def test_independent_evidence_cannot_reuse_route_root(
    index: int, left: str, right: str
) -> None:
    contract, bundle = _mutate_record(
        index, lambda record: record.update({left: record[right]})
    )
    with pytest.raises(AuditCompletenessValidationError) as raised:
        validate_bundle(contract, bundle)
    assert raised.value.code == "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE"


def test_route_and_delivery_independent_roots_must_differ() -> None:
    contract, bundle = _fixture()
    bundle["records"][2]["independent_delivery_observation_sha256"] = bundle["records"][1][
        "independent_observation_root_sha256"
    ]
    _rehash(contract, bundle["records"][2])
    bundle["records"][4]["audit_delivery_completeness_record_sha256"] = bundle["records"][2][
        "record_sha256"
    ]
    _rehash(contract, bundle["records"][4])
    with pytest.raises(AuditCompletenessValidationError) as raised:
        validate_bundle(contract, bundle)
    assert raised.value.code == "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE"


def test_route_and_delivery_root_families_must_be_disjoint() -> None:
    contract, bundle = _fixture()
    delivery = bundle["records"][2]
    route = bundle["records"][1]
    delivery["source_delivery_receipts_sha256"] = route["source_project_roots_sha256"]
    delivery["destination_delivery_receipts_sha256"] = route["destination_roots_sha256"]
    _rehash(contract, delivery)
    bundle["records"][4]["audit_delivery_completeness_record_sha256"] = delivery[
        "record_sha256"
    ]
    _rehash(contract, bundle["records"][4])
    with pytest.raises(AuditCompletenessValidationError) as raised:
        validate_bundle(contract, bundle)
    assert raised.value.code == "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE"


def test_sink_error_observation_cannot_reuse_delivery_receipt_root() -> None:
    contract, bundle = _fixture()
    delivery = bundle["records"][2]
    delivery["sink_error_observation_sha256"] = delivery[
        "source_delivery_receipts_sha256"
    ]
    _rehash(contract, delivery)
    bundle["records"][4]["audit_delivery_completeness_record_sha256"] = delivery[
        "record_sha256"
    ]
    _rehash(contract, bundle["records"][4])
    with pytest.raises(AuditCompletenessValidationError) as raised:
        validate_bundle(contract, bundle)
    assert raised.value.code == "HOLD_METHOD_ROUTE_DELIVERY_OR_DENIED_COVERAGE"


def test_boolean_integer_alias_rejects() -> None:
    contract, bundle = _mutate_record(0, lambda record: record.update(all_rows_classified=1))
    with pytest.raises(AuditCompletenessValidationError) as raised:
        validate_bundle(contract, bundle)
    assert raised.value.code == "REJECT_SCHEMA_CANONICALIZATION_OR_HASH"


def test_delivery_integer_boolean_alias_rejects() -> None:
    contract, bundle = _mutate_record(2, lambda record: record.update(missing_method_count=False))
    with pytest.raises(AuditCompletenessValidationError) as raised:
        validate_bundle(contract, bundle)
    assert raised.value.code == "REJECT_SCHEMA_CANONICALIZATION_OR_HASH"


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("section_7_4_acceptance_node_id", "final_consumer_replay_retention_acceptance_hash"),
        ("section_7_4_formula_sha256", "0" * 64),
        ("audit_universe_record_sha256", "1" * 64),
        ("record_bound_bounded_audit_field_profile_sha256", "2" * 64),
        ("audit_status", "PARTIAL"),
    ],
)
def test_audit_mapping_conflicts_reject(field: str, value: str) -> None:
    contract, bundle = _mutate_record(4, lambda record: record.update({field: value}))
    with pytest.raises(AuditCompletenessValidationError) as raised:
        validate_bundle(contract, bundle)
    assert raised.value.code == "REJECT_PARENT_TARGET_SOURCE_OR_OWNERSHIP"


@pytest.mark.parametrize("field", ["authenticationInfo", "request", "resourceName", "principalSubject"])
def test_raw_audit_fields_are_privacy_rejections(field: str) -> None:
    contract, bundle = _fixture()
    bundle["records"][3][field] = "forbidden"
    with pytest.raises(AuditCompletenessValidationError) as raised:
        validate_bundle(contract, bundle)
    assert raised.value.code == "REJECT_PRIVACY_OR_BOUNDARY"


@pytest.mark.parametrize("field", ["email", "principalSubject", "resourceName"])
def test_raw_or_unknown_public_projection_fields_reject(field: str) -> None:
    contract, bundle = _fixture()
    bundle["records"][3]["public_projection"][field] = "private"
    _rehash(contract, bundle["records"][3])
    bundle["records"][4]["audit_privacy_projection_record_sha256"] = bundle["records"][3][
        "record_sha256"
    ]
    _rehash(contract, bundle["records"][4])
    with pytest.raises(AuditCompletenessValidationError) as raised:
        validate_bundle(contract, bundle)
    assert raised.value.code == "REJECT_PRIVACY_OR_BOUNDARY"


def test_public_projection_digest_is_recomputed() -> None:
    contract, bundle = _fixture()
    bundle["records"][3]["public_projection_sha256"] = "0" * 64
    _rehash(contract, bundle["records"][3])
    bundle["records"][4]["audit_privacy_projection_record_sha256"] = bundle["records"][3][
        "record_sha256"
    ]
    _rehash(contract, bundle["records"][4])
    with pytest.raises(AuditCompletenessValidationError) as raised:
        validate_bundle(contract, bundle)
    assert raised.value.code == "REJECT_PRIVACY_OR_BOUNDARY"


def test_inventory_has_exact_complete_classifier_rows() -> None:
    _validate_inventory(_load_json(INVENTORY_PATH))


@pytest.mark.parametrize(
    "mutate",
    [
        lambda value: value["rows"].pop(),
        lambda value: value["rows"][0].update(mapping_id="S75-M999"),
        lambda value: value["rows"][0].update(classification_mode="UNKNOWN"),
        lambda value: value["rows"][48].update(resource_class="OTHER"),
    ],
)
def test_inventory_gaps_hold_or_reject(mutate: Callable[[dict[str, Any]], None]) -> None:
    inventory = _load_json(INVENTORY_PATH)
    mutate(inventory)
    with pytest.raises(AuditCompletenessValidationError):
        _validate_inventory(inventory)


@pytest.mark.parametrize(
    "mutate",
    [
        lambda value: value.update(decision_precedence=["PASS"]),
        lambda value: value.update(authority_effect="AUTHORIZED"),
        lambda value: value["actual_evidence"].update(live_delivery_evidence_present=True),
        lambda value: value["scope"]["owned_prerequisite_ids"].append("S75A-P15"),
        lambda value: value["scope"].update(section_7_7_decision_excluded=False),
        lambda value: value["source_contracts"][0].update(sha256="0" * 64),
        lambda value: value["runtime_evidence_registries"]["audit_mapping_records"].append("forged"),
        lambda value: value["runtime_evidence_registries"].update(unexpected=[]),
        lambda value: value["classifier_contract"].update(unknown_service_or_method="ALLOW"),
        lambda value: value["classifier_contract"]["applicability_evidence"][
            "conditional_mapping_ids"
        ].pop(),
        lambda value: value["privacy_projection"]["allowed_public_keys"].append("resourceName"),
        lambda value: value["record_schemas"][0]["required_keys"].append("extra"),
    ],
)
def test_contract_authority_scope_privacy_and_schema_drift_rejects(
    tmp_path: Path, mutate: Callable[[dict[str, Any]], None]
) -> None:
    root = _copy_inputs(tmp_path)
    path = root / CONTRACT_RELATIVE_PATH
    contract = _load_json(path)
    mutate(contract)
    _write_json(path, contract)
    with pytest.raises(AuditCompletenessValidationError):
        validate_contract(root)


@pytest.mark.parametrize("relative_path", (CONTRACT_RELATIVE_PATH, VECTORS_RELATIVE_PATH, *SOURCE_PATHS))
def test_explicit_locators_reject_symlinks(tmp_path: Path, relative_path: str) -> None:
    root = _copy_inputs(tmp_path)
    locator = root / relative_path
    target = root / f"same-{hashlib.sha256(relative_path.encode()).hexdigest()}.json"
    target.write_bytes(locator.read_bytes())
    locator.unlink()
    locator.symlink_to(target)
    with pytest.raises(AuditCompletenessValidationError, match="unreadable"):
        validate_contract(root)


def test_parent_component_symlink_rejects(tmp_path: Path) -> None:
    root = _copy_inputs(tmp_path)
    component = (root / CONTRACT_RELATIVE_PATH).parent
    moved = root / "same-contract-parent"
    component.rename(moved)
    component.symlink_to(moved, target_is_directory=True)
    with pytest.raises(AuditCompletenessValidationError, match="unreadable"):
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
                "from scripts.verify_gcp_section_7_5_4_audit_completeness "
                "import AuditCompletenessValidationError,validate_contract;"
                "\ntry: validate_contract(sys.argv[1])"
                "\nexcept AuditCompletenessValidationError: raise SystemExit(0)"
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
    with pytest.raises(AuditCompletenessValidationError, match="unreadable"):
        validate_contract(root)
