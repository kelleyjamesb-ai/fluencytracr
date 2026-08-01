"""Preimplementation readiness evidence for Section 7.5.5."""

from __future__ import annotations

import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
from typing import Any

import pytest


ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / (
    "tests/fixtures/gcp_section_7_5_5_full_contract_readiness_v1/"
    "packet-rules.json"
)
READINESS = ROOT / (
    "openspec/changes/add-gcp-section-7-5-5-full-contract-gate/readiness.md"
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


def _load_fixture() -> dict[str, Any]:
    """Load the compact closed readiness fixture."""
    value = json.loads(FIXTURE.read_text(encoding="utf-8"))
    assert isinstance(value, dict)
    return value


def _canonical_sha256(value: Any) -> str:
    """Return the canonical JSON SHA-256 for a JSON value."""
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()


def _queue_projection(fixture: dict[str, Any], root: Path = ROOT) -> dict[str, Any]:
    """Derive the immutable human-authored P17 projection from the live queue."""
    queue = json.loads((root / fixture["queue_authorization_root"]["path"]).read_text())
    row = next(item for item in queue["items"] if item["id"] == fixture["queue_item_id"])
    fields = fixture["queue_authorization_root"]["immutable_projection_fields"]
    projection = {field: row[field] for field in fields}
    assert row["status"] in fixture["queue_authorization_root"]["admitted_statuses"]
    assert _canonical_sha256(projection) == fixture["queue_authorization_root"]["canonical_sha256"]
    return projection


def _baseline_candidate(fixture: dict[str, Any]) -> dict[str, Any]:
    """Build the future contract candidate independently from admitted sources."""
    registry = json.loads((ROOT / fixture["source_manifest"][0]["path"]).read_text())
    candidate: dict[str, Any] = {
        "schema_version": "GCP_SECTION_7_5_5_FULL_CONTRACT_CLOSURE_V1",
        "scope_kind": "DOCS_CONTRACT",
        "authority_effect": "NONE",
        "decision": "SECTION_7_5_CONTRACT_CLOSED",
        "source_contracts": copy.deepcopy(fixture["source_manifest"]),
        "predecessor_decisions": {
            row["owner"]: row["decision"]
            for row in fixture["source_manifest"]
            if row["decision"] is not None
        },
        "queue_authorization_projection": _queue_projection(fixture),
        "registry_rows": [
            {key: row[key] for key in ("prerequisite_id", "owner", "current_state")}
            for row in registry["open_prerequisite_registry"]
        ],
        "edge_projection": registry["prerequisite_edge_registry"],
        "owner_portions": copy.deepcopy(fixture["owner_portions"]),
        "opaque_later_prerequisites": copy.deepcopy(fixture["opaque_later_prerequisites"]),
        "actual_evidence": {"approvals_present": False, "live_evidence_present": False, "runtime_records_present": False},
        "runtime_evidence_registries": {},
        "live_runtime": {"command": "NOT_AUTHORIZED", "expected_exit": "NOT_RUN"},
    }
    return _reseal(candidate)


def _reseal(candidate: dict[str, Any]) -> dict[str, Any]:
    """Recompute every attacker-owned descendant hash in a candidate."""
    candidate.pop("hashes", None)
    candidate["hashes"] = {
        "source_manifest_sha256": _canonical_sha256(candidate["source_contracts"]),
        "ownership_projection_sha256": _canonical_sha256(candidate["owner_portions"]),
        "edge_projection_sha256": _canonical_sha256(candidate["edge_projection"]),
        "queue_projection_sha256": _canonical_sha256(candidate["queue_authorization_projection"]),
    }
    candidate["hashes"]["closure_projection_sha256"] = _canonical_sha256(candidate)
    return candidate


def _leaf_paths(value: Any, prefix: str = "") -> list[str]:
    """Enumerate every leaf or empty-container path in a JSON value."""
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
    """Match one JSON-pointer pattern where star consumes one component."""
    pattern_parts = pattern.split("/")[1:]
    path_parts = path.split("/")[1:]
    return len(pattern_parts) == len(path_parts) and all(
        expected == "*" or expected == actual
        for expected, actual in zip(pattern_parts, path_parts, strict=True)
    )


def _copy_inputs(fixture: dict[str, Any], tmp_path: Path) -> Path:
    """Copy explicit sources and queue into an isolated root."""
    for entry in [*fixture["source_manifest"], fixture["queue_authorization_root"]]:
        source = ROOT / entry["path"]
        target = tmp_path / entry["path"]
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    return tmp_path


def _expected_environment(environment: str, resource: str) -> str:
    """Return an independent closed truth-table result."""
    if environment == "LIVE_RUNTIME":
        return "HOLD_LIVE_RUNTIME_NOT_AUTHORIZED"
    if environment == "ARCHIVE_CLOSEOUT":
        return "HOLD_ARCHIVE_CLOSEOUT_ONLY" if resource == "EXACT" else f"HOLD_ARCHIVE_SOURCE_SET_{resource}"
    if environment == "CLEAN_CI":
        return "SECTION_7_5_CONTRACT_CLOSED" if resource == "EXACT" else f"HOLD_SOURCE_SET_{resource}"
    raise AssertionError("unknown environment")


class _AtomicReplacement:
    """Test-owned one-shot atomic source replacement barrier."""

    def __init__(self, path: Path, replacement: bytes) -> None:
        self.path = path
        self.replacement = replacement
        self.invoked = False

    def __call__(self) -> None:
        """Atomically replace the target exactly once."""
        replacement_path = self.path.with_name(f"{self.path.name}.replacement")
        replacement_path.write_bytes(self.replacement)
        os.replace(replacement_path, self.path)
        self.invoked = True


def _prepare_attack(
    fixture: dict[str, Any], attack: dict[str, Any], tmp_path: Path, variant: str | None
) -> tuple[dict[str, Any], _AtomicReplacement | None]:
    """Perform the named mutation before the future verifier is loaded."""
    candidate = _baseline_candidate(fixture)
    interleaving: _AtomicReplacement | None = None
    attack_class = attack["class"]
    if attack_class == "UNKNOWN_FIELD": candidate["unexpected"] = True
    elif attack_class == "MISSING_FIELD":
        if variant is None: candidate.pop("decision")
        else: candidate["predecessor_decisions"][variant] = "HOLD"
    elif attack_class == "WRONG_TYPE": candidate["authority_effect"] = False
    elif attack_class == "NESTED_EXTRA_FIELD": candidate["source_contracts"][0]["unexpected"] = True
    elif attack_class == "TRUNCATED_OBJECT": candidate["owner_portions"].pop()
    elif attack_class == "SINGLE_FIELD_SUBSTITUTION": candidate["owner_portions"][0]["owner"] = "SECTION_7_3"
    elif attack_class == "CROSS_OBJECT_SPLICE": candidate["source_contracts"][4]["sha256"] = candidate["source_contracts"][3]["sha256"]
    elif attack_class == "FORGED_PROVENANCE": candidate["source_contracts"][1].update(owner="SECTION_7_5_4", path=candidate["source_contracts"][4]["path"])
    elif attack_class == "REPLAY_REUSE":
        candidate["source_contracts"].append(dict(candidate["source_contracts"][1]))
        candidate["owner_portions"].append(dict(candidate["owner_portions"][0]))
    elif attack_class == "COORDINATED_FULL_CLOSURE_RESEAL":
        queue_path = tmp_path / fixture["queue_authorization_root"]["path"]
        queue = json.loads(queue_path.read_text())
        queue_row = next(row for row in queue["items"] if row["id"] == fixture["queue_item_id"])
        queue_row["risk"] = "low"
        queue_path.write_text(json.dumps(queue, sort_keys=True), encoding="utf-8")
        candidate["queue_authorization_projection"]["risk"] = "low"

        registry_path = tmp_path / fixture["source_manifest"][0]["path"]
        registry = json.loads(registry_path.read_text())
        registry["open_prerequisite_registry"][0]["owner"] = "SECTION_7_3"
        registry["prerequisite_edge_registry"]["forward_edges"]["S75A-C-AUDIT"].remove("S75A-P19")
        registry["prerequisite_edge_registry"]["reverse_edges"]["S75A-P19"].remove("S75A-C-AUDIT")
        registry_path.write_text(json.dumps(registry, sort_keys=True), encoding="utf-8")
        candidate["registry_rows"] = [
            {key: row[key] for key in ("prerequisite_id", "owner", "current_state")}
            for row in registry["open_prerequisite_registry"]
        ]
        candidate["edge_projection"] = registry["prerequisite_edge_registry"]
        candidate["owner_portions"][0]["owner"] = "SECTION_7_3"

        predecessor_path = tmp_path / fixture["source_manifest"][1]["path"]
        predecessor = json.loads(predecessor_path.read_text())
        predecessor["decision"] = "HOLD"
        predecessor_path.write_text(json.dumps(predecessor, sort_keys=True), encoding="utf-8")
        candidate["source_contracts"][0]["sha256"] = hashlib.sha256(registry_path.read_bytes()).hexdigest()
        candidate["source_contracts"][1]["sha256"] = hashlib.sha256(predecessor_path.read_bytes()).hexdigest()
        candidate["source_contracts"][1]["decision"] = "HOLD"
        candidate["predecessor_decisions"]["SECTION_7_5_1"] = "HOLD"
    elif attack_class == "GLOBAL_TIMESTAMP_RESEAL": candidate["generated_at"] = "2099-01-01T00:00:00Z"
    elif attack_class == "STALE_FUTURE_TIME": candidate["observed_at"] = "1970-01-01T00:00:00Z"
    elif attack_class == "MODE_CONFUSION": candidate["scope_kind"] = "LIVE_RUNTIME"
    elif attack_class == "AMBIENT_FALLBACK":
        source = tmp_path / fixture["source_manifest"][0]["path"]
        ambient = tmp_path / "ambient" / source.name
        ambient.parent.mkdir(parents=True)
        shutil.copyfile(source, ambient)
        source.unlink()
    elif attack_class == "PARTIAL_RESOURCE":
        source = tmp_path / fixture["source_manifest"][1]["path"]
        source.write_bytes(source.read_bytes()[:32])
    elif attack_class == "CORRUPT_RESOURCE":
        source = tmp_path / fixture["source_manifest"][2]["path"]
        value = json.loads(source.read_text())
        value["corrupt_probe"] = True
        source.write_text(json.dumps(value, sort_keys=True), encoding="utf-8")
    elif attack_class == "CONCURRENCY_INTERLEAVING":
        source = tmp_path / fixture["source_manifest"][3]["path"]
        original = source.read_bytes()
        probe = _AtomicReplacement(source, original + b"\n")
        probe()
        assert probe.invoked and source.read_bytes() != original
        source.write_bytes(original)
        interleaving = _AtomicReplacement(source, original + b"\n")
    elif attack_class == "PRIVACY_LEAKAGE":
        boundary = variant or "TOP_LEVEL"
        if boundary == "TOP_LEVEL": candidate.update(user_id="forbidden", customer_payload="forbidden")
        elif boundary == "ACTUAL_EVIDENCE": candidate["actual_evidence"]["user_id"] = "forbidden"
        elif boundary == "SOURCE_ROW": candidate["source_contracts"][0]["user_id"] = "forbidden"
        elif boundary == "QUEUE_ROW": candidate["queue_authorization_projection"]["user_id"] = "forbidden"
        elif boundary == "OWNER_ROW": candidate["owner_portions"][0]["user_id"] = "forbidden"
        elif boundary == "REGISTRY_ROW": candidate["registry_rows"][0]["user_id"] = "forbidden"
        else: raise AssertionError("unknown privacy boundary")
    elif attack_class == "AUTHORITY_ESCALATION":
        boundary = variant or "TOP_LEVEL"
        if boundary == "TOP_LEVEL": candidate.update(authority_effect="RUNTIME", live_runtime={"command":"RUN","expected_exit":0})
        elif boundary == "RUNTIME_REGISTRY": candidate["runtime_evidence_registries"] = {"forbidden_records": [{"authority":"RUNTIME"}]}
        else: raise AssertionError("unknown authority boundary")
    else: raise AssertionError(f"unprepared attack class: {attack_class}")
    return _reseal(candidate), interleaving


def _load_future_verifier(fixture: dict[str, Any]) -> Any:
    """Load the future bounded verifier or fail only for its absence."""
    paths = [ROOT / path for path in fixture["sut_paths"]]
    if not all(path.is_file() for path in paths):
        pytest.fail("MISSING_SUT")
    verifier_path = paths[-1]
    spec = importlib.util.spec_from_file_location("gcp_s755_future_sut", verifier_path)
    if spec is None or spec.loader is None:
        pytest.fail("MISSING_SUT")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_packet_sources_are_exact_and_preimplementation_sut_is_absent() -> None:
    """Pin every predecessor while proving no closure implementation exists."""
    fixture = _load_fixture()
    assert fixture["authority_effect"] == "NONE"
    assert len(fixture["source_manifest"]) == 5
    for source in fixture["source_manifest"]:
        raw = (ROOT / source["path"]).read_bytes()
        assert hashlib.sha256(raw).hexdigest() == source["sha256"]
        value = json.loads(raw)
        if source["decision"] is not None:
            assert value["decision"] == source["decision"]
        assert value.get("authority_effect") == "NONE"
    assert not any((ROOT / path).exists() for path in fixture["sut_paths"])


def test_registry_rows_edges_and_scope_reconcile_exactly() -> None:
    """Prove the immutable row set and both edge directions are exact."""
    fixture = _load_fixture()
    registry = json.loads((ROOT / fixture["source_manifest"][0]["path"]).read_text())
    rows = registry["open_prerequisite_registry"]
    assert [row["prerequisite_id"] for row in rows] == [
        f"S75A-P{index:02d}" for index in range(20)
    ]
    assert {row["current_state"] for row in rows} == {"OPEN_BLOCKING"}
    edges = registry["prerequisite_edge_registry"]
    assert _canonical_sha256(edges) == fixture["edge_projection"]["canonical_sha256"]
    forward = edges["forward_edges"]
    reverse = edges["reverse_edges"]
    assert sum(map(len, forward.values())) == 91
    assert sum(map(len, reverse.values())) == 91
    for source, targets in forward.items():
        assert targets == sorted(targets)
        assert len(targets) == len(set(targets))
        for target in targets:
            assert source in reverse[target]
    for target, sources in reverse.items():
        assert sources == sorted(sources)
        assert len(sources) == len(set(sources))
        for source in sources:
            assert target in forward[source]
    in_scope = set(fixture["in_scope_prerequisite_ids"])
    later = {row["prerequisite_id"] for row in fixture["opaque_later_prerequisites"]}
    assert in_scope == {f"S75A-P{index:02d}" for index in range(15)} | {
        "S75A-P17", "S75A-P18", "S75A-P19"
    }
    assert later == {"S75A-P15", "S75A-P16"}
    assert in_scope.isdisjoint(later)


def test_every_semantic_portion_has_one_existing_owner() -> None:
    """Reject duplicate portion authority and missing prerequisite coverage."""
    fixture = _load_fixture()
    assert _queue_projection(fixture)["id"] == fixture["queue_item_id"]
    portions = fixture["owner_portions"]
    ids = [row["id"] for row in portions]
    assert len(ids) == len(set(ids))
    assert all(set(row) == {"id", "p", "owner", "state"} for row in portions)
    assert {row["p"] for row in portions} == set(fixture["in_scope_prerequisite_ids"])
    expected_owner_sets = {
        "S75A-P00": {"SECTION_7_2"}, "S75A-P01": {"SECTION_7_3"},
        "S75A-P02": {"SECTION_7_3"}, "S75A-P03": {"SECTION_7_4"},
        "S75A-P04": {"SECTION_7_5_3"},
        "S75A-P05": {"SECTION_7_3", "SECTION_7_4", "SECTION_7_5_2", "SECTION_7_5_3", "SECTION_7_5_4"},
        "S75A-P06": {"SECTION_7_3"},
        "S75A-P07": {"SECTION_7_4", "SECTION_7_5_2", "SECTION_7_5_3", "SECTION_7_5_4"},
        "S75A-P08": {"SECTION_7_3", "SECTION_7_5_2", "SECTION_7_5_3", "SECTION_7_5_4"},
        "S75A-P09": {"SECTION_7_5_2"}, "S75A-P10": {"SECTION_7_5_3"},
        "S75A-P11": {"SECTION_7_5_3"}, "S75A-P12": {"SECTION_7_5_4"},
        "S75A-P13": {"SECTION_7_5_4", "SECTION_7_7"}, "S75A-P14": {"SECTION_7_4"},
        "S75A-P17": {"HUMAN"}, "S75A-P18": {"SECTION_7_3", "SECTION_7_5_2"},
        "S75A-P19": {"SECTION_7_3", "SECTION_7_4", "SECTION_7_5_3"},
    }
    assert {
        prerequisite: {row["owner"] for row in portions if row["p"] == prerequisite}
        for prerequisite in fixture["in_scope_prerequisite_ids"]
    } == expected_owner_sets
    assert {row["owner"] for row in portions} <= {
        "HUMAN", "SECTION_7_2", "SECTION_7_3", "SECTION_7_4",
        "SECTION_7_5_2", "SECTION_7_5_3", "SECTION_7_5_4", "SECTION_7_7",
    }
    p07 = [row for row in portions if row["p"] == "S75A-P07"]
    assert len(p07) == 10
    assert sum(row["owner"] == "SECTION_7_4" for row in p07) == 1
    assert sum(row["state"] == "MECHANISM_CONTRACT_CLOSED" for row in p07) == 9
    assert [row for row in portions if row["p"] == "S75A-P17"] == [{
        "id": "P17_HUMAN_QUEUE_ACTIVATION",
        "p": "S75A-P17",
        "owner": "HUMAN",
        "state": "MACHINE_DISTINCT_QUEUE_SATISFIED",
    }]
    assert [row for row in portions if row["state"] == "DEFERRED_BLOCKING_LATER_SECTION"] == [{
        "id": "P13_SECTION_7_7_DECISION",
        "p": "S75A-P13",
        "owner": "SECTION_7_7",
        "state": "DEFERRED_BLOCKING_LATER_SECTION",
    }]


def test_attack_and_environment_catalogs_are_closed() -> None:
    """Bind every mandatory attack class and all twelve environment cells."""
    fixture = _load_fixture()
    pointers = [row["pointer"] for row in fixture["candidate_field_ledger"]]
    assert len(pointers) == len(set(pointers)) == 23
    assert all(row["ledger"] in fixture["ledger_ids"] for row in fixture["candidate_field_ledger"])
    patterns = fixture["candidate_leaf_ledger_patterns"]
    assert all(row["ledger"] in fixture["ledger_ids"] for row in patterns)
    for path in _leaf_paths(_baseline_candidate(fixture)):
        assert sum(_pattern_matches(row["pattern"], path) for row in patterns) == 1, path
    attacks = fixture["attacks"]
    assert [row["id"] for row in attacks] == [f"A{index:03d}" for index in range(1, 20)]
    assert {row["class"] for row in attacks} == EXPECTED_ATTACK_CLASSES
    assert all(row["expected"] == "HOLD" and row["root"] for row in attacks)
    assert all(row["mutation"] and row["ledger"] for row in attacks)
    assert all(set(row["ledger"]) <= set(fixture["ledger_ids"]) for row in attacks)
    full = next(row for row in attacks if row["id"] == "A010")
    assert full["descendants"] == [
        "queue_authorization_projection", "registry_rows", "forward_edges", "reverse_edges", "owner_portions",
        "source_contracts", "predecessor_decisions", "source_manifest_sha256",
        "ownership_projection_sha256", "edge_projection_sha256", "queue_projection_sha256",
        "closure_projection_sha256",
    ]
    cells = fixture["environment_cells"]
    assert len(cells) == 12
    assert {(row["environment"], row["resource"]) for row in cells} == {
        (environment, resource)
        for environment in ("CLEAN_CI", "ARCHIVE_CLOSEOUT", "LIVE_RUNTIME")
        for resource in ("ABSENT", "PARTIAL", "CORRUPT", "EXACT")
    }
    clean_exact = next(row for row in cells if row["environment"] == "CLEAN_CI" and row["resource"] == "EXACT")
    archive_exact = next(row for row in cells if row["environment"] == "ARCHIVE_CLOSEOUT" and row["resource"] == "EXACT")
    assert clean_exact["inner"] == "SECTION_7_5_CONTRACT_CLOSED"
    assert archive_exact["inner"] == "HOLD_ARCHIVE_CLOSEOUT_ONLY"
    assert all(row["command_exit"] == "NOT_RUN" for row in cells if row["environment"] == "LIVE_RUNTIME")
    assert fixture["environment_command"].endswith("::{pytest_node}")
    assert fixture["environment_oracle_id"] == "S755_INDEPENDENT_ENVIRONMENT_ORACLE_V1"
    assert len(fixture["environment_controlled_prerequisites"]) == 6


def test_readiness_packet_is_complete_externalized_and_protocol_bound() -> None:
    """Reject placeholders, self-approval, or an incorrect protocol binding."""
    text = READINESS.read_text(encoding="utf-8")
    protocol = (ROOT / "docs/agent/CANONICAL_RUNTIME_PHASE_READINESS.md").read_bytes()
    assert hashlib.sha256(protocol).hexdigest() == EXPECTED_PROTOCOL_SHA256
    assert "<required>" not in text
    assert "PREIMPLEMENTATION_EVIDENCE_READY" in text
    assert "50c3d081fed5a697cf688dbcd6b747d537a6701f" in text
    assert EXPECTED_PROTOCOL_SHA256 in text
    assert "authority_effect: NONE" in text
    assert "evidence commit" not in text.lower()
    assert "review verdict" not in text.lower()


def _declared_attack_cases() -> list[tuple[dict[str, Any], str | None]]:
    """Expand the missing-field class into all predecessor-HOLD dominance cases."""
    fixture = _load_fixture()
    cases: list[tuple[dict[str, Any], str | None]] = []
    for attack in fixture["attacks"]:
        cases.append((attack, None))
        if attack["id"] == "A002":
            cases.extend((attack, owner) for owner in fixture["predecessor_hold_cases"])
        elif attack["id"] == "A018":
            cases.extend((attack, boundary) for boundary in fixture["privacy_injection_cases"][1:])
        elif attack["id"] == "A019":
            cases.extend((attack, boundary) for boundary in fixture["authority_injection_cases"][1:])
    return cases


@pytest.mark.parametrize(
    ("attack", "variant"),
    _declared_attack_cases(),
    ids=lambda value: value["id"].lower() if isinstance(value, dict) else (value or "missing-decision").lower(),
)
def test_future_sut_declared_attack(
    attack: dict[str, Any], variant: str | None, tmp_path: Path
) -> None:
    """Execute one frozen attack through the future docs-only verifier."""
    fixture = _load_fixture()
    root = _copy_inputs(fixture, tmp_path)
    candidate, interleaving = _prepare_attack(fixture, attack, root, variant)
    if attack["id"] == "A010":
        forward_pairs = {
            (source, target)
            for source, targets in candidate["edge_projection"]["forward_edges"].items()
            for target in targets
        }
        reverse_pairs = {
            (source, target)
            for target, sources in candidate["edge_projection"]["reverse_edges"].items()
            for source in sources
        }
        assert forward_pairs == reverse_pairs
        for source in candidate["source_contracts"]:
            assert hashlib.sha256((root / source["path"]).read_bytes()).hexdigest() == source["sha256"]
            if source["decision"] is not None:
                assert candidate["predecessor_decisions"][source["owner"]] == source["decision"]
        alternate_registry = json.loads((root / candidate["source_contracts"][0]["path"]).read_text())
        assert candidate["edge_projection"] == alternate_registry["prerequisite_edge_registry"]
        assert candidate["registry_rows"] == [
            {key: row[key] for key in ("prerequisite_id", "owner", "current_state")}
            for row in alternate_registry["open_prerequisite_registry"]
        ]
        queue = json.loads((root / fixture["queue_authorization_root"]["path"]).read_text())
        row = next(item for item in queue["items"] if item["id"] == fixture["queue_item_id"])
        assert candidate["queue_authorization_projection"] == {
            field: row[field]
            for field in fixture["queue_authorization_root"]["immutable_projection_fields"]
        }
    if attack["class"] in {"AMBIENT_FALLBACK", "PARTIAL_RESOURCE", "CORRUPT_RESOURCE", "CONCURRENCY_INTERLEAVING"}:
        assert interleaving is not None or any(
            not (root / row["path"]).exists()
            or hashlib.sha256((root / row["path"]).read_bytes()).hexdigest() != row["sha256"]
            for row in fixture["source_manifest"]
        )
    else:
        assert candidate != _baseline_candidate(fixture)
    module = _load_future_verifier(fixture)
    result = module.evaluate_candidate(root, candidate, mode="CLEAN_CI", interleaving=interleaving)
    if interleaving is not None:
        assert interleaving.invoked
    assert result == "HOLD"


@pytest.mark.parametrize(
    "cell",
    _load_fixture()["environment_cells"],
    ids=lambda row: f"{row['environment'].lower()}-{row['resource'].lower()}",
)
def test_future_sut_environment_cell(cell: dict[str, Any]) -> None:
    """Execute one frozen environment cell through the future verifier."""
    fixture = _load_fixture()
    # State construction happens before the absent implementation gate.
    import tempfile
    with tempfile.TemporaryDirectory() as directory:
        root = _copy_inputs(fixture, Path(directory))
        candidate = _baseline_candidate(fixture)
        if cell["resource"] == "ABSENT":
            (root / fixture["source_manifest"][0]["path"]).unlink()
        elif cell["resource"] == "PARTIAL":
            path = root / fixture["source_manifest"][1]["path"]
            path.write_bytes(path.read_bytes()[:32])
        elif cell["resource"] == "CORRUPT":
            path = root / fixture["source_manifest"][2]["path"]
            path.write_bytes(path.read_bytes() + b"\n")
        assert cell["resource"] == "EXACT" or any(
            hashlib.sha256((root / row["path"]).read_bytes()).hexdigest() != row["sha256"]
            for row in fixture["source_manifest"] if (root / row["path"]).exists()
        ) or cell["resource"] == "ABSENT"
        module = _load_future_verifier(fixture)
        result = module.evaluate_candidate(root, candidate, mode=cell["environment"], interleaving=None)
        expected = _expected_environment(cell["environment"], cell["resource"])
        assert expected == cell["inner"]
        assert result == expected
