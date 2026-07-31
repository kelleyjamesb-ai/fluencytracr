from base64 import b64decode, b64encode
from dataclasses import replace
import hashlib
import json
import os
from pathlib import Path
import subprocess
import stat
import sys
import threading
from typing import Iterator

import pytest

import tests.gcp_s751_v4.bundle as bundle_module
import tests.gcp_s751_v4.corpus as corpus_module
import tests.gcp_s751_v4.corpus_declarations as declarations_module
import tests.gcp_s751_v4.crypto as crypto_module
import tests.gcp_s751_v4.oracle as oracle_module
from tests.gcp_s751_v4.bundle import (
    BundleAdmissionError,
    admit_parent_bundle,
    open_harness_bundle,
    reopen_owned_bundle,
)
from tests.gcp_s751_v4.ledger import (
    build_rule_ledger,
    reconcile_rule_ledger,
    serialize_rule_ledger,
)
from tests.gcp_s751_v4.crypto import (
    VerifyVector,
    anchor_key_id,
    sign_ephemeral_batch,
    verify_batch,
)
from tests.gcp_s751_v4.corpus import (
    EnvironmentCell,
    PreparedCase,
    build_attack_cases,
    build_case_observations,
    build_environment_cells,
    build_fd_discriminator_cases,
    build_metamorphic_groups,
    evaluate_in_isolated_children_with_dup2,
    evaluate_reference_case,
    evaluate_reference_sequence,
    invoke_future_sut,
    parse_closed_result_bytes,
)
from tests.gcp_s751_v4.model import (
    EvaluationResult,
    OracleInput,
    ResultMapping,
    RulePacket,
    canonical_json,
    enumerate_all_dynamic_paths,
    load_exact_parents,
    load_packet,
    signature_preimage,
    strict_load_json,
)
from tests.gcp_s751_v4.oracle import (
    ReferenceOracle,
    evaluate_controller_fixed_point,
)


ROOT = Path(__file__).resolve().parents[1]
PACKET = ROOT / (
    "tests/fixtures/"
    "gcp_section_7_5_parent_contract_authority_closure_readiness_v4/"
    "packet-rules.json"
)
EXACT_MEMBER_NAMES = tuple(
    entry.member_name for entry in load_packet().parent_manifest
)


@pytest.fixture
def exact_parent_bytes() -> dict[str, bytes]:
    packet = load_packet()
    return load_exact_parents(packet)


@pytest.fixture
def exact_bundle(
    tmp_path: Path,
    exact_parent_bytes: dict[str, bytes],
) -> Path:
    bundle = tmp_path / "exact-parent-bundle"
    bundle.mkdir()
    for member_name, data in exact_parent_bytes.items():
        (bundle / member_name).write_bytes(data)
    return bundle


def _candidate_from_parents(
    parents: dict[str, bytes],
) -> dict[str, object]:
    matrix = json.loads(parents["role-capability-matrix.json"])
    return {
        "schema_version": "GCP_SECTION_7_5_1_CANDIDATE_V4",
        "requested_action": "EVALUATE_ONLY",
        "observation": {
            "governed_roles": sorted(
                role["role_id"] for role in matrix["roles"]
            ),
            "synthetic_aliases": [],
            "controller_edges": [],
            "controller_cycles": [],
            "unknown_edge_count": 0,
        },
    }


def _valid_candidate() -> dict[str, object]:
    return _candidate_from_parents(load_exact_parents(load_packet()))


def _signed_oracle_material(
    *,
    mode: str = "CLEAN_CI",
    nonce: str = "00112233445566778899aabbccddeeff",
    candidate: dict[str, object] | None = None,
    payload_overrides: dict[str, object] | None = None,
    packet_override: RulePacket | None = None,
) -> tuple[bytes, bytes, bytes]:
    packet = packet_override or load_packet()
    candidate_bytes = canonical_json(candidate or _valid_candidate())
    parent_manifest = [
        {"member_name": entry.member_name, "sha256": entry.sha256}
        for entry in packet.parent_manifest
    ]
    base_head_sha256 = hashlib.sha256(
        bytes.fromhex(packet.base_commit)
    ).hexdigest()
    payload: dict[str, object] = {
        "schema_version": "GCP_SECTION_7_5_1_SIGNED_CONTEXT_PAYLOAD_V4",
        "policy_id": "FT_CANONICAL_JSON_V1",
        "candidate_sha256": hashlib.sha256(candidate_bytes).hexdigest(),
        "mode": mode,
        "parent_manifest": parent_manifest,
        "registry_sha256": hashlib.sha256(
            canonical_json(parent_manifest)
        ).hexdigest(),
        "receipt_sha256": next(
            entry.sha256
            for entry in packet.parent_manifest
            if entry.member_name == "attestation-receipt-contract.json"
        ),
        "approval_target_sha256": next(
            entry.sha256
            for entry in packet.parent_manifest
            if entry.member_name == "attestation-receipt-contract.json"
        ),
        "current_head_sha256": base_head_sha256,
        "anti_rollback_sha256": base_head_sha256,
        "role_matrix_sha256": next(
            entry.sha256
            for entry in packet.parent_manifest
            if entry.member_name == "role-capability-matrix.json"
        ),
        "signer_purpose": "RUNTIME_RECEIPT_SIGNING_CRYPTOKEY",
        "nonce_time": {
            "nonce": nonce,
            "valid_from": "2026-07-30T00:00:00Z",
            "valid_until": "2026-07-30T00:10:00Z",
            "trusted_time": "2026-07-30T00:05:00Z",
        },
        "authority_effect": "NONE",
    }
    if payload_overrides:
        payload.update(payload_overrides)
    signed = sign_ephemeral_batch([signature_preimage(packet, payload)])
    payload["key_id"] = signed.key_id
    envelope = {
        "schema_version": "GCP_SECTION_7_5_1_SIGNED_CONTEXT_ENVELOPE_V4",
        "algorithm": "ECDSA_P256_SHA256_DER",
        "payload": payload,
        "signature_der_base64": b64encode(
            signed.vectors[0].signature_der
        ).decode("ascii"),
    }
    return candidate_bytes, canonical_json(envelope), signed.anchor_spki_der


def _evaluate_mutated_parent_bundle(
    *,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    mutations: dict[str, object],
) -> EvaluationResult:
    packet = load_packet()
    parents = load_exact_parents(packet)
    for member_name, mutation in mutations.items():
        parent = json.loads(parents[member_name])
        assert callable(mutation)
        mutation(parent)
        parents[member_name] = canonical_json(parent)
    manifest = tuple(
        replace(
            entry,
            sha256=hashlib.sha256(parents[entry.member_name]).hexdigest(),
        )
        for entry in packet.parent_manifest
    )
    mutated_packet = replace(packet, parent_manifest=manifest)
    bundle = tmp_path / "mutated-parent-bundle"
    bundle.mkdir()
    for member_name, data in parents.items():
        (bundle / member_name).write_bytes(data)
    candidate, envelope, anchor = _signed_oracle_material(
        candidate=_candidate_from_parents(parents),
        nonce=hashlib.sha256(canonical_json(sorted(mutations))).hexdigest()[:32],
        packet_override=mutated_packet,
    )
    monkeypatch.setattr(
        oracle_module,
        "load_packet",
        lambda: mutated_packet,
    )
    incoming = open_harness_bundle(bundle)
    try:
        return ReferenceOracle().evaluate(
            candidate,
            envelope,
            anchor,
            incoming,
        )
    finally:
        os.close(incoming)


@pytest.fixture
def valid_oracle_input(exact_bundle: Path) -> Iterator[OracleInput]:
    candidate_bytes, envelope_bytes, anchor_spki = _signed_oracle_material()
    incoming = open_harness_bundle(exact_bundle)
    try:
        yield OracleInput(
            candidate_bytes=candidate_bytes,
            signed_context_envelope_bytes=envelope_bytes,
            verifier_anchor_spki=anchor_spki,
            trusted_parent_bundle_fd=incoming,
        )
    finally:
        os.close(incoming)


def test_v4_packet_is_compact_closed_and_has_no_sut() -> None:
    packet = json.loads(PACKET.read_text(encoding="utf-8"))
    assert packet["schema_version"] == (
        "GCP_SECTION_7_5_1_READINESS_RULE_PACKET_V4"
    )
    assert packet["authority_effect"] == "NONE"
    assert len(packet["parent_manifest"]) == 5
    assert "generated_ledger" not in packet
    assert "parent_snapshots" not in packet
    assert "signature" not in packet
    assert not (
        ROOT / "scripts/"
        "gcp_section_7_5_parent_contract_authority_closure_v4.py"
    ).exists()


def test_v4_packet_enumerates_all_eight_dynamic_boundaries() -> None:
    packet = json.loads(PACKET.read_text(encoding="utf-8"))
    schemas = packet["closed_schemas"]
    assert set(schemas) == {
        "candidate",
        "signed_context_payload",
        "signed_context_envelope",
        "verifier_anchor",
        "nonce_time",
        "replay_record",
        "parent_bundle_descriptor",
        "result",
    }
    expected_pointers = {
        "candidate": {
            "/schema_version", "/requested_action", "/observation",
            "/observation/governed_roles", "/observation/governed_roles/*",
            "/observation/synthetic_aliases",
            "/observation/synthetic_aliases/*",
            "/observation/controller_edges",
            "/observation/controller_edges/*",
            "/observation/controller_edges/*/controller",
            "/observation/controller_edges/*/controlled",
            "/observation/controller_cycles",
            "/observation/controller_cycles/*",
            "/observation/controller_cycles/*/*",
            "/observation/unknown_edge_count",
        },
        "signed_context_payload": {
            "/schema_version", "/policy_id", "/candidate_sha256", "/mode",
            "/parent_manifest", "/parent_manifest/*",
            "/parent_manifest/*/member_name", "/parent_manifest/*/sha256",
            "/registry_sha256", "/receipt_sha256", "/approval_target_sha256",
            "/current_head_sha256", "/anti_rollback_sha256",
            "/role_matrix_sha256", "/signer_purpose", "/key_id",
            "/nonce_time", "/authority_effect",
        },
        "signed_context_envelope": {
            "/schema_version", "/algorithm", "/payload",
            "/signature_der_base64",
        },
        "verifier_anchor": {"/spki_der_base64", "/key_id"},
        "nonce_time": {"/nonce", "/valid_from", "/valid_until", "/trusted_time"},
        "replay_record": {"/key_id", "/nonce", "/candidate_sha256", "/accepted_at"},
        "parent_bundle_descriptor": {"/fd", "/device", "/inode", "/member_names"},
        "result": {
            "/schema_version", "/decision", "/reason", "/authority_effect",
            "/claim_grade",
        },
    }
    for name, schema in schemas.items():
        assert schema["strict_object"] is True, name
        assert schema["additional_properties"] is False, name
        assert schema["fields"], name
        pointers = [field["pointer"] for field in schema["fields"]]
        assert set(pointers) == expected_pointers[name], name
        assert len(pointers) == len(set(pointers)), name
        for field in schema["fields"]:
            assert set(field) >= {
                "pointer",
                "type",
                "required",
                "cardinality",
                "value_rule",
            }, (name, field)
    metadata = {
        (name, field["pointer"]): (
            field["type"], field["cardinality"], field["value_rule"]
        )
        for name, schema in schemas.items()
        for field in schema["fields"]
    }
    assert metadata[("candidate", "/observation/synthetic_aliases/*")] == (
        "STRING", "ONE_PER_MEMBER",
        "PATTERN:^[0-9a-f]{32}$;CONTEXT_BOUND_SYNTHETIC_ONLY",
    )
    assert metadata[("signed_context_payload", "/parent_manifest")] == (
        "ARRAY", "EXACTLY_FIVE", "ORDERED_EXACT_PARENT_MANIFEST",
    )
    assert metadata[("signed_context_envelope", "/payload")] == (
        "OBJECT", "ONE", "REF:signed_context_payload",
    )
    assert metadata[("verifier_anchor", "/key_id")] == (
        "STRING", "ONE",
        "PATTERN:^P256_SPKI_SHA256:[0-9a-f]{64}$;DERIVED_FROM_SPKI",
    )
    assert metadata[("nonce_time", "/valid_until")] == (
        "STRING", "ONE", "UTC_RFC3339_SECONDS_Z;STRICTLY_AFTER:valid_from",
    )
    assert metadata[("parent_bundle_descriptor", "/fd")] == (
        "INTEGER", "ONE", "NONNEGATIVE_INTEGER;NONSEMANTIC",
    )
    assert metadata[("result", "/claim_grade")] == (
        "STRING", "ONE",
        "ENUM:NONE|STRUCTURAL_ONLY|ARCHIVE_CLOSEOUT_ONLY|DESIGN_ONLY",
    )


def test_v4_rule_failures_are_closed_and_deterministic() -> None:
    packet = json.loads(PACKET.read_text(encoding="utf-8"))
    rules = {rule["rule_id"]: rule for rule in packet["rule_templates"]}
    assert {rule["failure"] for rule in rules.values()} <= {"REJECT", "HOLD"}
    assert rules["RULE-SECTION-7-3-AUTHORITY-INVALID"]["failure"] == "REJECT"
    assert rules["RULE-CURRENT-BLOCKERS"]["failure"] == "HOLD"


def test_result_reason_mapping_is_closed_and_exhaustive() -> None:
    packet = load_packet()
    expected = {
        ResultMapping("REJECT", "INVALID_CANDIDATE_SHAPE", "NONE", "NONE"),
        ResultMapping("REJECT", "INVALID_ENVELOPE_SHAPE", "NONE", "NONE"),
        ResultMapping("REJECT", "INVALID_SIGNATURE", "NONE", "NONE"),
        ResultMapping(
            "REJECT", "INVALID_SIGNED_CONTEXT_BINDING", "NONE", "NONE"
        ),
        ResultMapping(
            "REJECT", "INVALID_CONTEXT_CONJUNCTION", "NONE", "NONE"
        ),
        ResultMapping("REJECT", "REPLAY_DETECTED", "NONE", "NONE"),
        ResultMapping(
            "REJECT", "INVALID_PARENT_RESOURCE_SET", "NONE", "NONE"
        ),
        ResultMapping(
            "REJECT", "INVALID_SECTION_7_3_AUTHORITY", "NONE", "NONE"
        ),
        ResultMapping(
            "REJECT",
            "PRIVACY_OR_NONAUTHORIZATION_INVALID",
            "NONE",
            "NONE",
        ),
        ResultMapping(
            "HOLD", "UNKNOWN_CONTROLLER_EDGE", "NONE", "STRUCTURAL_ONLY"
        ),
        ResultMapping(
            "HOLD",
            "CURRENT_PARENT_OBLIGATIONS_OPEN",
            "NONE",
            "STRUCTURAL_ONLY",
        ),
        ResultMapping(
            "HOLD",
            "ARCHIVE_CLOSEOUT_PARENT_OBLIGATIONS_OPEN",
            "NONE",
            "ARCHIVE_CLOSEOUT_ONLY",
        ),
        ResultMapping(
            "HOLD",
            "LIVE_RUNTIME_NOT_AUTHORIZED",
            "NONE",
            "DESIGN_ONLY",
        ),
    }

    assert set(packet.result_mappings) == expected
    reason_rule = next(
        path.value_rule
        for path in enumerate_all_dynamic_paths(packet)
        if path.boundary == "result" and path.pointer == "/reason"
    )
    assert reason_rule == "ENUM:" + "|".join(
        sorted(mapping.reason for mapping in expected)
    )
    mapping_by_disposition = {
        f"{mapping.decision}:{mapping.reason}": mapping
        for mapping in packet.result_mappings
    }
    for cell in packet.environment_table:
        mapping = mapping_by_disposition[cell["expected_disposition"]]
        assert mapping.claim_grade == cell["claim_grade"]
        assert mapping.authority_effect == cell["authority_effect"]
    for mapping in packet.result_mappings:
        assert EvaluationResult(
            "GCP_SECTION_7_5_1_EVALUATION_RESULT_V4",
            mapping.decision,
            mapping.reason,
            mapping.authority_effect,
            mapping.claim_grade,
        )
    with pytest.raises(ValueError):
        EvaluationResult(
            "GCP_SECTION_7_5_1_EVALUATION_RESULT_V4",
            "REJECT",
            "ARBITRARY_REASON",
            "NONE",
            "NONE",
        )
    with pytest.raises(ValueError):
        EvaluationResult(
            "GCP_SECTION_7_5_1_EVALUATION_RESULT_V4",
            "HOLD",
            "INVALID_SIGNATURE",
            "NONE",
            "STRUCTURAL_ONLY",
        )


def test_closed_schemas_cover_every_dynamic_boundary() -> None:
    packet = load_packet()

    paths = enumerate_all_dynamic_paths(packet)

    assert {path.boundary for path in paths} == {
        "candidate",
        "signed_context_payload",
        "signed_context_envelope",
        "verifier_anchor",
        "nonce_time",
        "replay",
        "bundle_capability",
        "result",
    }
    assert len(paths) == len({(path.boundary, path.pointer) for path in paths})
    assert all("locator" not in path.pointer for path in paths)
    for path in paths:
        if path.json_type == "STRING":
            assert path.value_rule.startswith(
                (
                    "ENUM:",
                    "PATTERN:",
                    "EXACT_",
                    "BASE64_",
                    "UTC_",
                    "FIXED_CLOSED_",
                )
            ), path

    result_paths = {
        path.pointer for path in paths if path.boundary == "result"
    }
    assert result_paths == {
        "/schema_version",
        "/decision",
        "/reason",
        "/authority_effect",
        "/claim_grade",
    }
    assert next(
        path for path in paths
        if path.boundary == "result" and path.pointer == "/authority_effect"
    ).value_rule == "ENUM:NONE"


def test_strict_json_rejects_duplicate_keys_floats_and_noncanonical_bytes() -> None:
    for raw in (
        b'{"a":1,"a":2}',
        b'{"a":1.0}',
        b'{ "a": 1 }',
    ):
        with pytest.raises(ValueError):
            strict_load_json(raw)


def test_exact_parents_match_packet_hashes_and_canonical_manifest_bytes() -> None:
    packet = load_packet()

    parents = load_exact_parents(packet)

    assert tuple(parents) == tuple(entry.member_name for entry in packet.parent_manifest)
    assert len(parents) == 5
    for entry in packet.parent_manifest:
        assert hashlib.sha256(parents[entry.member_name]).hexdigest() == entry.sha256
        manifest_bytes = canonical_json(
            {"member_name": entry.member_name, "sha256": entry.sha256}
        )
        assert strict_load_json(manifest_bytes) == {
            "member_name": entry.member_name,
            "sha256": entry.sha256,
        }


def test_rule_ledger_reconciles_static_and_dynamic_paths() -> None:
    packet = load_packet()

    rows = build_rule_ledger(packet)

    reconcile_rule_ledger(packet, rows)
    keys = [(row.resource, row.pointer) for row in rows]
    assert len(keys) == len(set(keys))
    assert all(row.dependencies for row in rows if not row.is_root)
    assert all(row.anchor_rule for row in rows)
    assert not any(row.instance_value for row in rows if row.dynamic)


def test_attack_catalog_and_rule_ledger_reconcile_exactly() -> None:
    packet = load_packet()
    rows = build_rule_ledger(packet)
    cases = build_attack_cases(packet)

    assert {case.attack_id for case in cases} == {
        attack["attack_id"] for attack in packet.attack_catalog
    }
    row_ids = {row.rule_id for row in rows}
    assert all(
        len(case.covered_rule_ids) == 1
        and case.covered_rule_ids[0] in row_ids
        for case in cases
    )


def test_packet_owns_one_closed_record_for_every_emitted_case() -> None:
    loader = getattr(declarations_module, "load_case_records", None)
    observation_builder = getattr(
        corpus_module, "build_case_observations", None
    )
    reconciler = getattr(
        declarations_module, "reconcile_case_records", None
    )

    assert loader is not None, "per-case packet record loader is missing"
    assert observation_builder is not None
    assert reconciler is not None

    packet = load_packet()
    rows = build_rule_ledger(packet)
    records = loader(packet)
    observations = observation_builder(packet)

    assert len(records) == len(observations) == 159
    assert {record.case_id for record in records} == {
        observation.case_id for observation in observations
    }
    assert len({record.case_id for record in records}) == len(records)
    assert all(record.mutation_operator for record in records)
    assert all(record.mutation_parameters for record in records)
    assert all(record.source_relationship for record in records)
    assert all(record.target_relationship for record in records)
    assert all(record.immutable_root_id for record in records)
    assert all(record.immutable_root_sha256 for record in records)
    assert all(record.expected_sequence for record in records)
    assert all(record.oracle_id for record in records)
    assert all(record.pytest_node.startswith("tests/") for record in records)
    reconciler(packet, rows, records, observations)


def test_per_case_reconciliation_rejects_every_record_corruption_class() -> None:
    loader = getattr(declarations_module, "load_case_records", None)
    observation_builder = getattr(
        corpus_module, "build_case_observations", None
    )
    reconciler = getattr(
        declarations_module, "reconcile_case_records", None
    )
    resolver = getattr(
        declarations_module, "resolve_case_ledger_row", None
    )
    assert all(
        value is not None
        for value in (loader, observation_builder, reconciler, resolver)
    )

    packet = load_packet()
    rows = build_rule_ledger(packet)
    records = loader(packet)
    observations = observation_builder(packet)
    first = records[0]

    with pytest.raises(ValueError, match="case record set mismatch"):
        reconciler(packet, rows, records[:-1], observations)
    with pytest.raises(ValueError, match="case record set mismatch"):
        reconciler(packet, rows, records + (first,), observations)

    changed_mutation = replace(
        first,
        mutation_operator="WRONG_MUTATION_OPERATOR",
    )
    with pytest.raises(
        ValueError, match="case record does not match observed mutation"
    ):
        reconciler(
            packet,
            rows,
            (changed_mutation,) + records[1:],
            observations,
        )

    wrong_sequence = replace(
        first,
        expected_sequence=records[1].expected_sequence,
    )
    with pytest.raises(
        ValueError, match="case record expected sequence mismatch"
    ):
        reconciler(
            packet,
            rows,
            (wrong_sequence,) + records[1:],
            observations,
        )

    alternate_root = next(
        record
        for record in records
        if record.immutable_root_id != first.immutable_root_id
    )
    wrong_root = replace(
        first,
        immutable_root_id=alternate_root.immutable_root_id,
        immutable_root_sha256=alternate_root.immutable_root_sha256,
    )
    with pytest.raises(
        ValueError, match="case record immutable root mismatch"
    ):
        reconciler(
            packet,
            rows,
            (wrong_root,) + records[1:],
            observations,
        )

    wrong_selector = replace(
        first,
        ledger_selector=replace(
            first.ledger_selector,
            pointer="/not-a-ledger-row",
        ),
    )
    with pytest.raises(
        ValueError, match="case ledger selector must match exactly one row"
    ):
        reconciler(
            packet,
            rows,
            (wrong_selector,) + records[1:],
            observations,
        )

    replay_record = next(
        record
        for record in records
        if record.case_id == "a009-process-local-replay"
    )
    wrong_stage_selector = replace(
        first,
        ledger_selector=replay_record.ledger_selector,
    )
    with pytest.raises(
        ValueError,
        match="case ledger selector does not match observed selector",
    ):
        reconciler(
            packet,
            rows,
            (wrong_stage_selector,) + records[1:],
            observations,
        )

    candidate_observation = next(
        value
        for value in observations
        if value.case_id == first.case_id
    )
    candidate_same_stage_swap = replace(
        first,
        ledger_selector=declarations_module.ExactLedgerSelector(
            resource="candidate",
            pointer="/observation",
            rule_id=(
                "RULE-LEDGER-"
                "d4a0b6b95f4f89c97bae84b8e99adc42b2ce4986611ae0287"
                "ca199b88e451281"
            ),
        ),
    )
    with pytest.raises(
        ValueError,
        match="case ledger selector does not match observed selector",
    ):
        reconciler(
            packet,
            rows,
            (candidate_same_stage_swap,) + records[1:],
            observations,
        )
    assert candidate_observation.ledger_selector == (
        declarations_module.ExactLedgerSelector(
            resource="candidate",
            pointer="/schema_version",
            rule_id=(
                "RULE-LEDGER-"
                "41342576504e2575ea2db3c1afdbc58860f427e213b60a043f"
                "0f3655a7b15616"
            ),
        )
    )

    role_one = next(
        value
        for value in records
        if value.case_id == "a019-every-section-7-3-role-1"
    )
    role_two = next(
        value
        for value in records
        if value.case_id == "a019-every-section-7-3-role-2"
    )
    role_one_observation = next(
        value
        for value in observations
        if value.case_id == role_one.case_id
    )
    role_same_stage_swap = replace(
        role_one,
        ledger_selector=role_two.ledger_selector,
    )
    with pytest.raises(
        ValueError,
        match="case ledger selector does not match observed selector",
    ):
        reconciler(
            packet,
            rows,
            tuple(
                role_same_stage_swap
                if value is role_one
                else value
                for value in records
            ),
            observations,
        )
    assert role_one_observation.ledger_selector == (
        declarations_module.ExactLedgerSelector(
            resource="role-capability-matrix.json",
            pointer="/roles/0/role_id",
            rule_id=(
                "RULE-LEDGER-"
                "cbd61fe83a685942351b192d9430e9e34051921f1856d5c09"
                "444489abdfe1dc7"
            ),
        )
    )

    selected = resolver(first, rows)
    with pytest.raises(
        ValueError, match="case ledger selector must match exactly one row"
    ):
        resolver(first, tuple(rows) + (selected,))

    candidate_exact = declarations_module.ExactLedgerSelector(
        "candidate",
        "/requested_action",
        "RULE-LEDGER-"
        "4a3da32ae3b0e8bf17ffcb54e88ed2029acf7f4709886bc3d"
        "c85e52faf6392aa",
    )
    payload_exact = declarations_module.ExactLedgerSelector(
        "signed_context_payload",
        "/policy_id",
        "RULE-LEDGER-"
        "415417d6ae5e29046e2ab4fdc7c11d5dfb1984c3131ba52cc"
        "8d32f6c797649d4",
    )
    envelope_exact = declarations_module.ExactLedgerSelector(
        "signed_context_envelope",
        "/algorithm",
        "RULE-LEDGER-"
        "520a61718686da54f3843261949b6cee35dee3d0df896fe3fe"
        "2b63be3cc0e216",
    )
    nonce_exact = declarations_module.ExactLedgerSelector(
        "nonce_time",
        "/trusted_time",
        "RULE-LEDGER-"
        "ab966c2280bce7375ba0e5fef5e1acb93fd3e6ac983d955a5"
        "3c55e09be33299c",
    )
    candidate_observation_exact = declarations_module.ExactLedgerSelector(
        "candidate",
        "/observation",
        "RULE-LEDGER-"
        "d4a0b6b95f4f89c97bae84b8e99adc42b2ce4986611ae0287"
        "ca199b88e451281",
    )
    payload_manifest_entry_exact = (
        declarations_module.ExactLedgerSelector(
            "signed_context_payload",
            "/parent_manifest/*",
            "RULE-LEDGER-"
            "cafccc2d2825024f28bff3a16d440e392724fa2b503c842f2e"
            "b38c3c7fa36406",
        )
    )
    expected_selectors = {
        "a002-raw-candidate-missing-field": candidate_exact,
        "a002-raw-payload-missing-field": payload_exact,
        "a002-raw-envelope-missing-field": envelope_exact,
        "a002-raw-nonce-missing-field": nonce_exact,
        "a003-raw-candidate-wrong-type": candidate_exact,
        "a003-raw-payload-wrong-type": payload_exact,
        "a003-raw-envelope-wrong-type": envelope_exact,
        "a003-raw-nonce-wrong-type": nonce_exact,
        "a004-candidate-nested-extra-field": candidate_observation_exact,
        "a004-payload-nested-extra-field": payload_manifest_entry_exact,
    }
    observations_by_id = {
        observation.case_id: observation
        for observation in observations
    }
    records_by_id = {record.case_id: record for record in records}

    assert {
        case_id: observations_by_id[case_id].ledger_selector
        for case_id in expected_selectors
    } == expected_selectors

    substitutions = {
        "a002-raw-candidate-missing-field": (
            declarations_module.ExactLedgerSelector(
                "candidate",
                "/schema_version",
                "RULE-LEDGER-"
                "41342576504e2575ea2db3c1afdbc58860f427e213b60a043f"
                "0f3655a7b15616",
            ),
            declarations_module.ExactLedgerSelector(
                "candidate",
                "/observation",
                "RULE-LEDGER-"
                "d4a0b6b95f4f89c97bae84b8e99adc42b2ce4986611ae0287"
                "ca199b88e451281",
            ),
        ),
        "a002-raw-payload-missing-field": (
            declarations_module.ExactLedgerSelector(
                "signed_context_payload",
                "/schema_version",
                "RULE-LEDGER-"
                "87c47001c75ee7eaf68607e8560105c3e6d0d772c43ef3c945"
                "9bd6fe8579f368",
            ),
            declarations_module.ExactLedgerSelector(
                "signed_context_payload",
                "/mode",
                "RULE-LEDGER-"
                "bd8cb70e55010f98add7a13112bda593ddf854c29572ed2dc4"
                "a7bd9b323154e8",
            ),
        ),
        "a002-raw-envelope-missing-field": (
            declarations_module.ExactLedgerSelector(
                "signed_context_envelope",
                "/schema_version",
                "RULE-LEDGER-"
                "ff1b4d2a5e7ccad697c3faa2c0821c2663c3e2e226993256ea"
                "d4836cff7ef5ae",
            ),
            declarations_module.ExactLedgerSelector(
                "signed_context_envelope",
                "/signature_der_base64",
                "RULE-LEDGER-"
                "3684c81d230e88a6b5507f27c26d0be5e03a014119a7e5069b"
                "5f3fffe8d93b8a",
            ),
        ),
        "a002-raw-nonce-missing-field": (
            declarations_module.ExactLedgerSelector(
                "signed_context_payload",
                "/schema_version",
                "RULE-LEDGER-"
                "87c47001c75ee7eaf68607e8560105c3e6d0d772c43ef3c945"
                "9bd6fe8579f368",
            ),
            declarations_module.ExactLedgerSelector(
                "nonce_time",
                "/nonce",
                "RULE-LEDGER-"
                "ff222ba218947d0d6d30ab8329ea783eef5007fd534ea165271e"
                "37391b8f5b50",
            ),
        ),
    }
    root_selectors = {
        ("candidate", "/schema_version"),
        ("signed_context_payload", "/schema_version"),
        ("signed_context_envelope", "/schema_version"),
    }
    legitimate_raw_roots = {
        "a005-candidate-truncation",
        "a005-envelope-truncation",
    }

    assert not {
        record.case_id
        for record in records
        if record.attack_id
        in {"A002", "A003", "A004", "A005", "A006", "A007"}
        and (
            record.ledger_selector.resource,
            record.ledger_selector.pointer,
        )
        in root_selectors
        and record.case_id not in legitimate_raw_roots
    }

    for case_id, (generic_root, same_stage_wrong_field) in (
        substitutions.items()
    ):
        record = records_by_id[case_id]
        for replacement in (generic_root, same_stage_wrong_field):
            corrupted = replace(record, ledger_selector=replacement)
            with pytest.raises(
                ValueError,
                match=(
                    "case ledger selector does not match observed selector"
                ),
            ):
                declarations_module.reconcile_case_records(
                    packet,
                    rows,
                    tuple(
                        corrupted if value is record else value
                        for value in records
                    ),
                    observations,
                )


def test_a019_records_stop_at_the_actual_ledger_failure_stage() -> None:
    loader = getattr(declarations_module, "load_case_records", None)
    resolver = getattr(
        declarations_module, "resolve_case_ledger_row", None
    )
    assert loader is not None and resolver is not None

    packet = load_packet()
    rows = build_rule_ledger(packet)
    records = {
        record.case_id: record
        for record in loader(packet)
        if record.attack_id == "A019"
    }
    cases = {
        case.case_id: case
        for case in build_attack_cases(packet)
        if case.attack_id == "A019"
    }

    assert records.keys() == cases.keys()
    for case_id, case in cases.items():
        row = resolver(records[case_id], rows)
        if case.expected.reason == "INVALID_SECTION_7_3_AUTHORITY":
            assert row.resource == "role-capability-matrix.json"
            assert row.pointer.startswith("/roles/")
            assert row.pointer.endswith("/role_id")
            assert "SECTION_7_3_ROLE_CAPABILITY_ADMISSION" in (
                row.decision_use
            )
        else:
            assert case.expected.reason == "INVALID_PARENT_RESOURCE_SET"
            assert row.resource == "bundle_capability"
            assert row.pointer == "/member_names"
            assert "EXACT_PARENT_BUNDLE_ADMISSION" in row.decision_use
            assert "SECTION_7_3" not in row.decision_use
            assert "OPEN_BLOCKER" not in row.decision_use


def test_packet_attack_generators_are_closed_and_executable() -> None:
    packet = load_packet()
    cases = build_attack_cases(packet)

    generators = {
        generator
        for attack in packet.attack_catalog
        for generator in attack["generators"]
    }
    assert generators
    assert all(
        isinstance(attack["generators"], tuple)
        and attack["generators"]
        for attack in packet.attack_catalog
    )
    for attack in packet.attack_catalog:
        attack_id = attack["attack_id"]
        assert any(case.attack_id == attack_id for case in cases)
        for generator in attack["generators"]:
            fragment = generator.lower().replace("_", "-")
            assert any(
                case.attack_id == attack_id
                and fragment in case.case_id
                for case in cases
            )


def test_semantic_equivalence_ignores_dynamic_test_artifacts() -> None:
    groups = build_metamorphic_groups(load_packet())
    for group in groups:
        results = [
            evaluate_reference_case(case)
            for case in group.equivalent_cases
        ]
        assert len(set(results)) == 1
    by_id = {group.group_id: group for group in groups}
    key_cases = by_id["M001"].equivalent_cases
    assert len({case.admitted_anchor_spki for case in key_cases}) == 2
    assert len({case.envelope_bytes for case in key_cases}) == 2
    alias_cases = by_id["M002"].equivalent_cases
    assert len({case.candidate_bytes for case in alias_cases}) == 2
    descriptor_cases = by_id["M003"].equivalent_cases
    with descriptor_cases[0].bundle_factory() as first_fd:
        with descriptor_cases[1].bundle_factory() as second_fd:
            assert first_fd != second_fd


def test_same_normalized_fd_number_can_produce_opposing_results() -> None:
    exact, corrupt = build_fd_discriminator_cases()
    outcomes = evaluate_in_isolated_children_with_dup2(
        normalized_fd=751,
        cases=(exact, corrupt),
    )
    assert outcomes == (
        EvaluationResult(
            "GCP_SECTION_7_5_1_EVALUATION_RESULT_V4",
            "HOLD",
            "CURRENT_PARENT_OBLIGATIONS_OPEN",
            "NONE",
            "STRUCTURAL_ONLY",
        ),
        EvaluationResult(
            "GCP_SECTION_7_5_1_EVALUATION_RESULT_V4",
            "REJECT",
            "INVALID_PARENT_RESOURCE_SET",
            "NONE",
            "NONE",
        ),
    )


def test_environment_cells_are_packet_exact_and_cell_specific() -> None:
    packet = load_packet()
    cells = build_environment_cells(packet)

    assert {
        (cell.environment, cell.resource_state)
        for cell in cells
    } == {
        (row["environment"], row["resource_state"])
        for row in packet.environment_table
    }
    assert sum(cell.executable for cell in cells) == 8
    assert all(
        not cell.executable
        and cell.command == "NOT_AUTHORIZED"
        and cell.expected_exit == "NOT_RUN"
        for cell in cells
        if cell.environment == "LIVE_RUNTIME"
    )
    for cell in cells:
        if cell.executable:
            assert cell.case is not None
            assert evaluate_reference_case(cell.case) == cell.case.expected
        else:
            assert cell.case is None


def test_replay_case_reuses_identical_normative_inputs() -> None:
    replay_cases = [
        case for case in build_attack_cases(load_packet())
        if case.attack_id == "A009"
    ]
    assert len(replay_cases) == 1
    case = replay_cases[0]
    oracle = ReferenceOracle()
    with case.bundle_factory() as reference_fd:
        first = oracle.evaluate(
            case.candidate_bytes,
            case.envelope_bytes,
            case.admitted_anchor_spki,
            reference_fd,
        )
        second = oracle.evaluate(
            case.candidate_bytes,
            case.envelope_bytes,
            case.admitted_anchor_spki,
            reference_fd,
        )
    assert first.reason == "CURRENT_PARENT_OBLIGATIONS_OPEN"
    assert second.reason == "REPLAY_DETECTED"


def test_replay_case_computes_first_and_second_outcomes_in_one_session() -> None:
    case = next(
        case for case in build_attack_cases(load_packet())
        if case.attack_id == "A009"
    )

    sequence = evaluate_reference_sequence(case)

    assert sequence == case.expected_sequence == (
        EvaluationResult(
            "GCP_SECTION_7_5_1_EVALUATION_RESULT_V4",
            "HOLD",
            "CURRENT_PARENT_OBLIGATIONS_OPEN",
            "NONE",
            "STRUCTURAL_ONLY",
        ),
        EvaluationResult(
            "GCP_SECTION_7_5_1_EVALUATION_RESULT_V4",
            "REJECT",
            "REPLAY_DETECTED",
            "NONE",
            "NONE",
        ),
    )


def test_future_replay_protocol_executes_both_calls_in_one_process(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_sut = tmp_path / "stateful-replay-sut.py"
    fake_sut.write_text(
        "\n".join(
            (
                "import argparse",
                "import os",
                "parser = argparse.ArgumentParser()",
                "for name in ('candidate', 'envelope', 'anchor', 'replay-candidate', 'replay-envelope', 'replay-anchor', 'bundle', 'result'):",
                "    parser.add_argument(f'--{name}-fd', type=int, required=True)",
                "args = parser.parse_args()",
                "def read_all(fd):",
                "    chunks = []",
                "    while chunk := os.read(fd, 4096): chunks.append(chunk)",
                "    return b''.join(chunks)",
                "first = tuple(read_all(fd) for fd in (args.candidate_fd, args.envelope_fd, args.anchor_fd))",
                "second = tuple(read_all(fd) for fd in (args.replay_candidate_fd, args.replay_envelope_fd, args.replay_anchor_fd))",
                "assert first == second",
                "os.fstat(args.bundle_fd)",
                "result = b'{\"authority_effect\":\"NONE\",\"claim_grade\":\"NONE\",\"decision\":\"REJECT\",\"reason\":\"REPLAY_DETECTED\",\"schema_version\":\"GCP_SECTION_7_5_1_EVALUATION_RESULT_V4\"}'",
                "os.write(args.result_fd, result)",
                "os.close(args.result_fd)",
            )
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(corpus_module, "SUT_PATH", fake_sut)
    case = next(
        case for case in build_attack_cases(load_packet())
        if case.attack_id == "A009"
    )

    with pytest.raises(AssertionError, match="^INVALID_SUT_RESULT$"):
        invoke_future_sut(case)

    fake_sut.write_text(
        "\n".join(
            (
                "import argparse",
                "import os",
                "parser = argparse.ArgumentParser()",
                "for name in ('candidate', 'envelope', 'anchor', 'replay-candidate', 'replay-envelope', 'replay-anchor', 'bundle', 'result'):",
                "    parser.add_argument(f'--{name}-fd', type=int, required=True)",
                "args = parser.parse_args()",
                "result = b'[{\"authority_effect\":\"NONE\",\"claim_grade\":\"STRUCTURAL_ONLY\",\"decision\":\"HOLD\",\"reason\":\"CURRENT_PARENT_OBLIGATIONS_OPEN\",\"schema_version\":\"GCP_SECTION_7_5_1_EVALUATION_RESULT_V4\"},{\"authority_effect\":\"NONE\",\"claim_grade\":\"NONE\",\"decision\":\"REJECT\",\"reason\":\"REPLAY_DETECTED\",\"schema_version\":\"GCP_SECTION_7_5_1_EVALUATION_RESULT_V4\"}]'",
                "os.write(args.result_fd, result)",
                "os.close(args.result_fd)",
            )
        ),
        encoding="utf-8",
    )
    invalid_candidate = EvaluationResult(
        "GCP_SECTION_7_5_1_EVALUATION_RESULT_V4",
        "REJECT",
        "INVALID_CANDIDATE_SHAPE",
        "NONE",
        "NONE",
    )
    challenged_case = replace(
        case,
        candidate_bytes=b"{}",
        expected=invalid_candidate,
        expected_sequence=(invalid_candidate, invalid_candidate),
    )
    with pytest.raises(AssertionError, match="^SUT_ORACLE_MISMATCH$"):
        invoke_future_sut(challenged_case)


def test_prepared_case_metadata_never_enters_normative_inputs() -> None:
    for case in build_attack_cases(load_packet()):
        normative_bytes = (
            case.candidate_bytes
            + case.envelope_bytes
            + case.admitted_anchor_spki
        )
        assert case.case_id.encode("ascii") not in normative_bytes
        assert case.attack_id.encode("ascii") not in normative_bytes


def test_prepared_case_metadata_never_enters_bundle_names_or_contents() -> None:
    for case in build_attack_cases(load_packet()):
        labels = (
            case.case_id.encode("ascii"),
            case.attack_id.encode("ascii"),
        )
        with case.bundle_factory() as bundle_fd:
            for member_name in os.listdir(bundle_fd):
                encoded_name = member_name.encode("utf-8")
                assert all(label not in encoded_name for label in labels)
                member_fd: int | None = None
                try:
                    member_fd = os.open(
                        member_name,
                        os.O_RDONLY | os.O_NONBLOCK | os.O_NOFOLLOW,
                        dir_fd=bundle_fd,
                    )
                    if not stat.S_ISREG(os.fstat(member_fd).st_mode):
                        continue
                    chunks: list[bytes] = []
                    while chunk := os.read(member_fd, 1024 * 1024):
                        chunks.append(chunk)
                    content = b"".join(chunks)
                    assert all(label not in content for label in labels)
                except OSError:
                    continue
                finally:
                    if member_fd is not None:
                        os.close(member_fd)


def test_identifier_probes_cover_every_public_string_input_path(
    exact_bundle: Path,
) -> None:
    packet = load_packet()
    cases = [
        case for case in build_attack_cases(packet)
        if case.attack_id == "A018"
    ]
    observations = [
        observation
        for observation in build_case_observations(packet)
        if observation.attack_id == "A018"
        and observation.generator_id == "EVERY_PUBLIC_STRING_PATH"
    ]
    input_boundaries = {
        "candidate",
        "signed_context_payload",
        "signed_context_envelope",
        "verifier_anchor",
        "nonce_time",
    }
    expected_count = sum(
        1
        for boundary in input_boundaries
        for field in packet.closed_schemas[boundary]["fields"]
        if field["type"] == "STRING"
    )
    assert len(cases) == expected_count
    assert len(observations) == expected_count
    assert {
        (
            observation.ledger_selector.resource,
            observation.ledger_selector.pointer,
        )
        for observation in observations
    } == {
        (boundary, field["pointer"])
        for boundary in input_boundaries
        for field in packet.closed_schemas[boundary]["fields"]
        if field["type"] == "STRING"
    }
    assert all(
        case.expected.reason != "INVALID_SIGNATURE"
        for case in cases
        if "signed-context-payload" in case.case_id
        or "nonce-time" in case.case_id
    )
    observations_by_id = {
        observation.case_id: observation
        for observation in observations
    }
    alias_probe = hashlib.md5(b"victim@example.com").hexdigest().encode(
        "ascii"
    )
    key_id_probe = hashlib.sha256(
        b"synthetic-probe@example.invalid"
    ).hexdigest().encode("ascii")
    for case in cases:
        normative_bytes = (
            case.candidate_bytes
            + case.envelope_bytes
            + case.admitted_anchor_spki
        )
        selector = observations_by_id[case.case_id].ledger_selector
        if (selector.resource, selector.pointer) == (
            "candidate",
            "/observation/synthetic_aliases/*",
        ):
            assert alias_probe in normative_bytes
        elif (selector.resource, selector.pointer) == (
            "verifier_anchor",
            "/key_id",
        ):
            assert key_id_probe in normative_bytes
        else:
            assert (
                b"synthetic-probe@example.invalid" in normative_bytes
            )

    candidate = _valid_candidate()
    observation = candidate["observation"]
    assert isinstance(observation, dict)
    observation["synthetic_aliases"] = [
        hashlib.md5(b"victim@example.com").hexdigest()
    ]
    candidate_bytes, envelope_bytes, anchor = _signed_oracle_material(
        candidate=candidate,
        nonce="a018a018a018a018a018a018a018a018",
    )
    incoming = open_harness_bundle(exact_bundle)
    try:
        assert ReferenceOracle().evaluate(
            candidate_bytes,
            envelope_bytes,
            anchor,
            incoming,
        ) == EvaluationResult(
            "GCP_SECTION_7_5_1_EVALUATION_RESULT_V4",
            "REJECT",
            "PRIVACY_OR_NONAUTHORIZATION_INVALID",
            "NONE",
            "NONE",
        )
    finally:
        os.close(incoming)
    assert all(
        "synthetic-probe@example.invalid"
        not in (
            case.expected.schema_version,
            case.expected.decision,
            case.expected.reason,
            case.expected.authority_effect,
            case.expected.claim_grade,
        )
        for case in cases
    )


@pytest.mark.parametrize(
    "field",
    ("schema_version", "decision", "reason", "authority_effect", "claim_grade"),
)
def test_result_boundary_rejects_identifier_class_outputs(field: str) -> None:
    result = {
        "schema_version": "GCP_SECTION_7_5_1_EVALUATION_RESULT_V4",
        "decision": "HOLD",
        "reason": "CURRENT_PARENT_OBLIGATIONS_OPEN",
        "authority_effect": "NONE",
        "claim_grade": "STRUCTURAL_ONLY",
    }
    result[field] = "synthetic-probe@example.invalid"

    with pytest.raises(AssertionError, match="^INVALID_SUT_RESULT$"):
        parse_closed_result_bytes(canonical_json(result))


@pytest.mark.parametrize(
    "data",
    (
        b"",
        b"{}",
        canonical_json(
            {
                "schema_version": "GCP_SECTION_7_5_1_EVALUATION_RESULT_V4",
                "decision": "HOLD",
                "reason": "CURRENT_PARENT_OBLIGATIONS_OPEN",
                "authority_effect": "NONE",
                "claim_grade": "STRUCTURAL_ONLY",
                "extra": "NONE",
            }
        ),
        canonical_json(
            {
                "schema_version": "GCP_SECTION_7_5_1_EVALUATION_RESULT_V4",
                "decision": "HOLD",
                "reason": "CURRENT_PARENT_OBLIGATIONS_OPEN",
                "authority_effect": "NONE",
                "claim_grade": "STRUCTURAL_ONLY",
            }
        )
        + b"\n",
    ),
)
def test_child_result_protocol_rejects_missing_extra_or_multiple_output(
    data: bytes,
) -> None:
    with pytest.raises(AssertionError, match="^INVALID_SUT_RESULT$"):
        parse_closed_result_bytes(data)


def test_closed_child_result_must_match_the_independent_oracle(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_sut = tmp_path / "future-sut-protocol-double.py"
    fake_sut.write_text(
        "\n".join(
            (
                "import argparse",
                "import os",
                "parser = argparse.ArgumentParser()",
                "for name in ('candidate', 'envelope', 'anchor', 'bundle', 'result'):",
                "    parser.add_argument(f'--{name}-fd', type=int, required=True)",
                "arguments = parser.parse_args()",
                "for fd in (arguments.candidate_fd, arguments.envelope_fd, arguments.anchor_fd):",
                "    while os.read(fd, 4096):",
                "        pass",
                "os.fstat(arguments.bundle_fd)",
                "result = (",
                "    b'{\"authority_effect\":\"NONE\",\"claim_grade\":\"NONE\",'",
                "    b'\"decision\":\"REJECT\",\"reason\":\"INVALID_CANDIDATE_SHAPE\",'",
                "    b'\"schema_version\":\"GCP_SECTION_7_5_1_EVALUATION_RESULT_V4\"}'",
                ")",
                "os.write(arguments.result_fd, result)",
                "os.close(arguments.result_fd)",
            )
        ),
        encoding="utf-8",
    )
    monkeypatch.setattr(corpus_module, "SUT_PATH", fake_sut)
    exact, _ = build_fd_discriminator_cases()

    with pytest.raises(AssertionError, match="^SUT_ORACLE_MISMATCH$"):
        invoke_future_sut(exact)


def test_authority_generators_cover_every_role_capability_hsm_and_owner() -> None:
    packet = load_packet()
    parents = {
        name: json.loads(data)
        for name, data in load_exact_parents(packet).items()
    }
    expected = (
        len(parents["role-capability-matrix.json"]["roles"])
        + len(parents["role-capability-matrix.json"]["capabilities"])
        + len(
            parents["security-authority-contract.json"][
                "policy_template"
            ]["hsm_key_profiles"]
        )
        + len(
            parents["constraints-open-obligations-contract.json"][
                "open_prerequisite_registry"
            ]
        )
    )
    cases = [
        case for case in build_attack_cases(packet)
        if case.attack_id == "A019"
    ]
    assert len(cases) == expected
    for case in cases:
        expected_reason = (
            "INVALID_SECTION_7_3_AUTHORITY"
            if case.generator == "EVERY_SECTION_7_3_ROLE"
            else "INVALID_PARENT_RESOURCE_SET"
        )
        assert evaluate_reference_case(case).reason == expected_reason


def test_time_reseal_uses_original_anchor_and_compile_pinned_time_root() -> None:
    packet = load_packet()
    cases = build_attack_cases(packet)
    reseal = next(case for case in cases if case.attack_id == "A011")
    baseline = next(case for case in cases if case.attack_id == "A009")
    payload = strict_load_json(reseal.envelope_bytes)["payload"]

    assert reseal.admitted_anchor_spki == baseline.admitted_anchor_spki
    assert payload["nonce_time"]["trusted_time"] == "2026-07-31T00:05:00Z"
    assert reseal.mutation_evidence.immutable_root_id == (
        "TRUSTED_TIME_POLICY_V1"
    )
    assert reseal.expected.reason == "INVALID_SIGNED_CONTEXT_BINDING"


def test_candidate_splice_uses_an_independently_authenticated_source_object() -> None:
    splice = next(
        case for case in build_attack_cases(load_packet())
        if case.generator == "CANDIDATE_SPLICE"
    )

    assert splice.mutation_evidence.source_object_sha256 == (
        hashlib.sha256(splice.candidate_bytes).hexdigest()
    )
    assert splice.mutation_evidence.source_envelope_sha256
    assert splice.mutation_evidence.source_anchor_sha256 != hashlib.sha256(
        splice.admitted_anchor_spki
    ).hexdigest()
    assert splice.mutation_evidence.source_result == EvaluationResult(
        "GCP_SECTION_7_5_1_EVALUATION_RESULT_V4",
        "HOLD",
        "CURRENT_PARENT_OBLIGATIONS_OPEN",
        "NONE",
        "STRUCTURAL_ONLY",
    )
    assert splice.expected.reason == "INVALID_SIGNED_CONTEXT_BINDING"


def test_replaced_member_opens_capability_before_atomic_replacement() -> None:
    cases = {
        case.generator: case
        for case in build_attack_cases(load_packet())
        if case.generator in {"REPLACED_MEMBER", "CONCURRENT_REPLACEMENT"}
    }

    assert cases["REPLACED_MEMBER"].mutation_evidence.observed_ordering == (
        "CAPABILITY_OPENED",
        "MEMBER_REPLACED",
    )
    assert cases[
        "CONCURRENT_REPLACEMENT"
    ].mutation_evidence.observed_ordering == (
        "CAPABILITY_OPENED",
        "CONCURRENT_REPLACEMENT_STARTED",
    )


def test_attack_reference_cases_match_independent_expectations() -> None:
    for case in build_attack_cases(load_packet()):
        assert evaluate_reference_case(case) == case.expected


def test_named_splices_and_substitutions_execute_their_declared_mutations() -> None:
    packet = load_packet()
    parents = load_exact_parents(packet)
    cases = {case.case_id: case for case in build_attack_cases(packet)}

    assert cases["a007-candidate-splice"].expected.reason == (
        "INVALID_SIGNED_CONTEXT_BINDING"
    )
    assert cases["a007-payload-splice"].expected.reason == "INVALID_SIGNATURE"
    assert cases["a007-signature-splice"].expected.reason == "INVALID_SIGNATURE"
    payload_envelope = strict_load_json(
        cases["a007-payload-splice"].envelope_bytes
    )
    assert isinstance(payload_envelope, dict)
    assert "key_id" in payload_envelope["payload"]

    for index, entry in enumerate(packet.parent_manifest, start=1):
        splice = cases[f"a007-each-parent-splice-{index}"]
        with splice.bundle_factory() as bundle_fd:
            member_fd = os.open(
                entry.member_name,
                os.O_RDONLY | os.O_NOFOLLOW,
                dir_fd=bundle_fd,
            )
            try:
                spliced_bytes = b""
                while chunk := os.read(member_fd, 1024 * 1024):
                    spliced_bytes += chunk
            finally:
                os.close(member_fd)
        assert spliced_bytes != parents[entry.member_name]
        assert spliced_bytes in {
            data for name, data in parents.items()
            if name != entry.member_name
        }

        substitution = cases[f"a006-each-parent-substitution-{index}"]
        with substitution.bundle_factory() as bundle_fd:
            member_fd = os.open(
                entry.member_name,
                os.O_RDONLY | os.O_NOFOLLOW,
                dir_fd=bundle_fd,
            )
            try:
                substituted_bytes = b""
                while chunk := os.read(member_fd, 1024 * 1024):
                    substituted_bytes += chunk
            finally:
                os.close(member_fd)
        assert strict_load_json(substituted_bytes)
        assert _json_scalar_difference_count(
            json.loads(parents[entry.member_name]),
            json.loads(substituted_bytes),
        ) == 1


def _json_scalar_difference_count(left: object, right: object) -> int:
    if type(left) is not type(right):
        return 1
    if isinstance(left, dict):
        if set(left) != set(right):
            return 1
        return sum(
            _json_scalar_difference_count(left[key], right[key])
            for key in left
        )
    if isinstance(left, list):
        if len(left) != len(right):
            return 1
        return sum(
            _json_scalar_difference_count(left_value, right_value)
            for left_value, right_value in zip(left, right)
        )
    return int(left != right)


@pytest.mark.parametrize(
    "case",
    build_attack_cases(load_packet()),
    ids=lambda case: case.case_id,
)
def test_future_sut_attack_case(case: PreparedCase) -> None:
    invoke_future_sut(case)


@pytest.mark.parametrize(
    "cell",
    tuple(
        cell for cell in build_environment_cells(load_packet())
        if cell.executable
    ),
    ids=lambda cell: f"environment-{cell.environment}-{cell.resource_state}",
)
def test_future_sut_environment_cell(cell: EnvironmentCell) -> None:
    assert cell.case is not None
    invoke_future_sut(cell.case)


def test_rule_ledger_is_cold_process_deterministic_and_in_memory_only() -> None:
    def workspace_files() -> set[Path]:
        return {
            path.relative_to(ROOT)
            for path in ROOT.rglob("*")
            if path.is_file()
            and not {".git", ".pytest_cache", "__pycache__"}.intersection(
                path.relative_to(ROOT).parts
            )
        }

    script = "\n".join(
        (
            "import sys",
            "from tests.gcp_s751_v4.ledger import build_rule_ledger, serialize_rule_ledger",
            "from tests.gcp_s751_v4.model import load_packet",
            "sys.stdout.buffer.write(serialize_rule_ledger(build_rule_ledger(load_packet())))",
        )
    )
    command = [sys.executable, "-c", script]
    environment = {**os.environ, "PYTHONHASHSEED": "0"}
    files_before = workspace_files()

    first = subprocess.run(
        command,
        cwd=ROOT,
        env=environment,
        check=True,
        capture_output=True,
    )
    second = subprocess.run(
        command,
        cwd=ROOT,
        env=environment,
        check=True,
        capture_output=True,
    )

    assert first.stdout == second.stdout
    assert workspace_files() == files_before


def test_ephemeral_batches_bind_an_out_of_band_anchor() -> None:
    first = sign_ephemeral_batch([b"one", b"two"])
    second = sign_ephemeral_batch([b"one", b"two"])

    assert first.anchor_spki_der != second.anchor_spki_der
    assert first.key_id == anchor_key_id(first.anchor_spki_der)
    assert first.key_id.startswith("P256_SPKI_SHA256:")
    assert verify_batch(first.anchor_spki_der, first.vectors) == (True, True)
    assert verify_batch(first.anchor_spki_der, second.vectors) == (False, False)


def test_signature_projection_is_versioned_domain_separated_and_anchor_bound(
) -> None:
    packet = load_packet()
    candidate, envelope_bytes, anchor = _signed_oracle_material(
        nonce="ffff2222333344445555666677778888"
    )
    del candidate
    envelope = strict_load_json(envelope_bytes)
    assert isinstance(envelope, dict)
    payload = envelope["payload"]
    signature = b64decode(envelope["signature_der_base64"])

    assert packet.signature_projection == {
        "schema_version": "GCP_SECTION_7_5_1_SIGNATURE_PROJECTION_V1",
        "domain_separator": (
            "FLUENCYTRACR:GCP_SECTION_7_5_1_SIGNED_CONTEXT:V1"
        ),
        "excluded_payload_field": "key_id",
        "key_id_binding": (
            "EXACT_P256_SPKI_SHA256_OF_OUT_OF_BAND_ADMITTED_SPKI"
        ),
        "preimage": (
            "DOMAIN_SEPARATOR_UTF8 || 0x00 || "
            "CANONICAL_JSON(PAYLOAD_WITHOUT_KEY_ID)"
        ),
    }
    preimage = signature_preimage(packet, payload)
    assert preimage.startswith(
        b"FLUENCYTRACR:GCP_SECTION_7_5_1_SIGNED_CONTEXT:V1\x00"
    )
    assert verify_batch(
        anchor,
        (VerifyVector(preimage, signature),),
    ) == (True,)


def test_reference_oracle_rejects_key_id_and_anchor_substitution(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    candidate, envelope_bytes, anchor = _signed_oracle_material(
        nonce="abcd2222333344445555666677778888"
    )
    envelope = strict_load_json(envelope_bytes)
    assert isinstance(envelope, dict)
    payload = envelope["payload"]
    assert isinstance(payload, dict)
    original_key_id = payload["key_id"]
    assert isinstance(original_key_id, str)
    payload["key_id"] = original_key_id[:-1] + (
        "0" if original_key_id[-1] != "0" else "1"
    )
    tampered_key_id = ReferenceOracle().evaluate(
        candidate,
        canonical_json(envelope),
        anchor,
        -1,
    )

    replacement_anchor = sign_ephemeral_batch([b"replacement-anchor"])
    payload["key_id"] = replacement_anchor.key_id
    mismatched_fingerprint = ReferenceOracle().evaluate(
        candidate,
        canonical_json(envelope),
        anchor,
        -1,
    )
    substituted_anchor = ReferenceOracle().evaluate(
        candidate,
        envelope_bytes,
        replacement_anchor.anchor_spki_der,
        -1,
    )

    assert tampered_key_id.reason == "INVALID_SIGNED_CONTEXT_BINDING"
    assert mismatched_fingerprint.reason == "INVALID_SIGNED_CONTEXT_BINDING"
    assert substituted_anchor.reason == "INVALID_SIGNATURE"

    for helper_failure in (
        subprocess.TimeoutExpired("node", 15),
        OSError("crypto helper unavailable"),
    ):
        def fail_helper(*args: object, **kwargs: object) -> object:
            del args, kwargs
            raise helper_failure

        monkeypatch.setattr(crypto_module.subprocess, "run", fail_helper)
        assert ReferenceOracle().evaluate(
            candidate,
            envelope_bytes,
            anchor,
            -1,
        ) == EvaluationResult(
            "GCP_SECTION_7_5_1_EVALUATION_RESULT_V4",
            "REJECT",
            "INVALID_SIGNATURE",
            "NONE",
            "NONE",
        )


def test_private_material_is_absent_from_helper_fixture_environment_and_arguments(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    sentinel = "s751-v4-private-material-must-not-cross-the-boundary"
    monkeypatch.setenv("GCP_S751_V4_TEST_SECRET", sentinel)

    batch = sign_ephemeral_batch([b"canonical-preimage"])
    public_artifacts = (
        batch.anchor_spki_der,
        batch.key_id.encode("ascii"),
        batch.vectors[0].preimage,
        batch.vectors[0].signature_der,
    )
    prohibited_fragments = (
        b"-----BEGIN " + b"PRIVATE " + b"KEY-----",
        b"private" + b"_scalar",
        b"fixed" + b"_signing_seed",
        b"signer" + b"_capable_key",
        b"third" + b"_hsm_purpose",
        sentinel.encode("ascii"),
    )

    for artifact in public_artifacts:
        assert not any(fragment in artifact for fragment in prohibited_fragments)

    fixture_and_boundary_sources = (
        PACKET.read_bytes(),
        (ROOT / "tests/gcp_s751_v4/crypto.py").read_bytes(),
        (ROOT / "tests/helpers/gcp_s751_v4_crypto.mjs").read_bytes(),
    )
    for source in fixture_and_boundary_sources:
        assert not any(fragment in source for fragment in prohibited_fragments[:-1])


def test_hermetic_node_uses_a_pre_resolved_executable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("PATH", "")
    monkeypatch.setenv("NODE_OPTIONS", "--require=/not-a-real-s751-v4-module")

    batch = sign_ephemeral_batch([b"hermetic"])

    assert batch.key_id == anchor_key_id(batch.anchor_spki_der)


def test_bundle_admission_uses_an_independent_open_description(
    exact_bundle: Path,
) -> None:
    incoming = open_harness_bundle(exact_bundle)
    owned = reopen_owned_bundle(incoming)
    try:
        incoming_stat = os.fstat(incoming)
        owned_stat = os.fstat(owned)
        assert (incoming_stat.st_dev, incoming_stat.st_ino) == (
            owned_stat.st_dev,
            owned_stat.st_ino,
        )
        os.lseek(incoming, 7, os.SEEK_SET)
        assert os.lseek(owned, 0, os.SEEK_CUR) == 0
        os.listdir(incoming)
        assert set(os.listdir(owned)) == set(EXACT_MEMBER_NAMES)
    finally:
        os.close(owned)
        os.close(incoming)


@pytest.mark.parametrize(
    ("capability_state", "member_count", "corrupt", "accepted"),
    (
        ("ABSENT", 0, False, False),
        ("PARTIAL", 4, False, False),
        ("CORRUPT", 5, True, False),
        ("EXACT", 5, False, True),
    ),
)
def test_bundle_capability_cells_require_exact_parent_bytes(
    tmp_path: Path,
    exact_parent_bytes: dict[str, bytes],
    capability_state: str,
    member_count: int,
    corrupt: bool,
    accepted: bool,
) -> None:
    bundle = tmp_path / capability_state.lower()
    bundle.mkdir()
    for member_name in EXACT_MEMBER_NAMES[:member_count]:
        data = exact_parent_bytes[member_name]
        if corrupt and member_name == EXACT_MEMBER_NAMES[-1]:
            data += b"\n"
        (bundle / member_name).write_bytes(data)
    incoming = open_harness_bundle(bundle)
    try:
        if accepted:
            assert admit_parent_bundle(
                incoming, load_packet().parent_manifest
            ) == exact_parent_bytes
        else:
            with pytest.raises(
                BundleAdmissionError,
                match=r"^INVALID_PARENT_RESOURCE_SET$",
            ):
                admit_parent_bundle(incoming, load_packet().parent_manifest)
        os.fstat(incoming)
    finally:
        os.close(incoming)


def test_bundle_admission_rejects_an_extra_member(
    exact_bundle: Path,
) -> None:
    (exact_bundle / "unexpected.json").write_bytes(b"{}")
    incoming = open_harness_bundle(exact_bundle)
    try:
        with pytest.raises(
            BundleAdmissionError,
            match=r"^INVALID_PARENT_RESOURCE_SET$",
        ):
            admit_parent_bundle(incoming, load_packet().parent_manifest)
        os.fstat(incoming)
    finally:
        os.close(incoming)


@pytest.mark.parametrize("replacement_kind", ("directory", "fifo"))
def test_bundle_admission_rejects_non_regular_members(
    exact_bundle: Path,
    replacement_kind: str,
) -> None:
    member = exact_bundle / EXACT_MEMBER_NAMES[0]
    member.unlink()
    if replacement_kind == "directory":
        member.mkdir()
    else:
        os.mkfifo(member)
    incoming = open_harness_bundle(exact_bundle)
    try:
        with pytest.raises(
            BundleAdmissionError,
            match=r"^INVALID_PARENT_RESOURCE_SET$",
        ):
            admit_parent_bundle(incoming, load_packet().parent_manifest)
        os.fstat(incoming)
    finally:
        os.close(incoming)


def test_bundle_admission_rejects_a_symlink_member(
    exact_bundle: Path,
    tmp_path: Path,
) -> None:
    member = exact_bundle / EXACT_MEMBER_NAMES[0]
    target = tmp_path / "symlink-target"
    target.write_bytes(member.read_bytes())
    member.unlink()
    member.symlink_to(target)
    incoming = open_harness_bundle(exact_bundle)
    try:
        with pytest.raises(
            BundleAdmissionError,
            match=r"^INVALID_PARENT_RESOURCE_SET$",
        ):
            admit_parent_bundle(incoming, load_packet().parent_manifest)
        os.fstat(incoming)
    finally:
        os.close(incoming)


def test_bundle_admission_rejects_a_renamed_member(
    exact_bundle: Path,
    tmp_path: Path,
) -> None:
    member = exact_bundle / EXACT_MEMBER_NAMES[0]
    member.rename(tmp_path / "renamed-parent")
    incoming = open_harness_bundle(exact_bundle)
    try:
        with pytest.raises(
            BundleAdmissionError,
            match=r"^INVALID_PARENT_RESOURCE_SET$",
        ):
            admit_parent_bundle(incoming, load_packet().parent_manifest)
        os.fstat(incoming)
    finally:
        os.close(incoming)


def test_harness_path_admission_rejects_every_symlink_component(
    exact_bundle: Path,
    tmp_path: Path,
) -> None:
    final_link = tmp_path / "final-link"
    final_link.symlink_to(exact_bundle, target_is_directory=True)
    with pytest.raises(
        BundleAdmissionError,
        match=r"^INVALID_PARENT_RESOURCE_SET$",
    ):
        open_harness_bundle(final_link)

    real_ancestor = tmp_path / "real-ancestor"
    real_ancestor.mkdir()
    nested_bundle = real_ancestor / "nested-bundle"
    exact_bundle.rename(nested_bundle)
    ancestor_link = tmp_path / "ancestor-link"
    ancestor_link.symlink_to(real_ancestor, target_is_directory=True)
    with pytest.raises(
        BundleAdmissionError,
        match=r"^INVALID_PARENT_RESOURCE_SET$",
    ):
        open_harness_bundle(ancestor_link / nested_bundle.name)


def test_harness_path_admission_closes_new_descriptor_if_prior_close_fails(
    exact_bundle: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    real_open = os.open
    real_close = os.close
    real_fstat = os.fstat
    opened_descriptors: list[int] = []
    injected_failure = False

    def recording_open(
        path: str | bytes | os.PathLike[str] | os.PathLike[bytes],
        flags: int,
        mode: int = 0o777,
        *,
        dir_fd: int | None = None,
    ) -> int:
        opened_fd = real_open(path, flags, mode, dir_fd=dir_fd)
        opened_descriptors.append(opened_fd)
        return opened_fd

    def fail_first_close(fd: int) -> None:
        nonlocal injected_failure
        if not injected_failure:
            injected_failure = True
            real_close(fd)
            raise OSError("injected close failure")
        real_close(fd)

    monkeypatch.setattr(bundle_module.os, "open", recording_open)
    monkeypatch.setattr(bundle_module.os, "close", fail_first_close)
    try:
        with pytest.raises(
            BundleAdmissionError,
            match=r"^INVALID_PARENT_RESOURCE_SET$",
        ):
            open_harness_bundle(exact_bundle)
        assert len(opened_descriptors) >= 2
        for opened_fd in set(opened_descriptors):
            with pytest.raises(OSError):
                real_fstat(opened_fd)
    finally:
        for opened_fd in set(opened_descriptors):
            try:
                real_close(opened_fd)
            except OSError:
                pass


def test_evaluator_boundary_starts_at_the_admitted_final_directory_object(
    exact_bundle: Path,
    exact_parent_bytes: dict[str, bytes],
    tmp_path: Path,
) -> None:
    real_ancestor = tmp_path / "real-evaluator-ancestor"
    real_ancestor.mkdir()
    nested_bundle = real_ancestor / "nested-bundle"
    exact_bundle.rename(nested_bundle)
    ancestor_link = tmp_path / "evaluator-ancestor-link"
    ancestor_link.symlink_to(real_ancestor, target_is_directory=True)
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC
    incoming = os.open(ancestor_link / nested_bundle.name, flags)
    try:
        assert admit_parent_bundle(
            incoming, load_packet().parent_manifest
        ) == exact_parent_bytes
    finally:
        os.close(incoming)


@pytest.mark.parametrize("invalid_population", (False, True))
def test_bundle_admission_closes_owned_descriptors_but_not_the_callers(
    exact_bundle: Path,
    monkeypatch: pytest.MonkeyPatch,
    invalid_population: bool,
) -> None:
    if invalid_population:
        corrupt_member = exact_bundle / EXACT_MEMBER_NAMES[-1]
        corrupt_member.write_bytes(corrupt_member.read_bytes() + b"\n")
    owned_descriptors: list[int] = []
    real_open = os.open

    def recording_open(
        path: str | bytes | os.PathLike[str] | os.PathLike[bytes],
        flags: int,
        mode: int = 0o777,
        *,
        dir_fd: int | None = None,
    ) -> int:
        opened_fd = real_open(path, flags, mode, dir_fd=dir_fd)
        owned_descriptors.append(opened_fd)
        return opened_fd

    incoming = open_harness_bundle(exact_bundle)
    monkeypatch.setattr(bundle_module.os, "open", recording_open)
    try:
        if invalid_population:
            with pytest.raises(BundleAdmissionError):
                admit_parent_bundle(incoming, load_packet().parent_manifest)
        else:
            admit_parent_bundle(incoming, load_packet().parent_manifest)
        os.fstat(incoming)
        assert len(owned_descriptors) == 6
        for owned_fd in set(owned_descriptors):
            with pytest.raises(OSError):
                os.fstat(owned_fd)
    finally:
        os.close(incoming)


def test_bundle_admission_rejects_a_closed_caller_descriptor(
    exact_bundle: Path,
) -> None:
    incoming = open_harness_bundle(exact_bundle)
    os.close(incoming)

    with pytest.raises(
        BundleAdmissionError,
        match=r"^INVALID_PARENT_RESOURCE_SET$",
    ):
        admit_parent_bundle(incoming, load_packet().parent_manifest)


@pytest.mark.parametrize("changed_field", ("device", "inode"))
def test_bundle_admission_rejects_pre_post_directory_identity_change(
    exact_bundle: Path,
    monkeypatch: pytest.MonkeyPatch,
    changed_field: str,
) -> None:
    incoming = open_harness_bundle(exact_bundle)
    real_fstat = os.fstat
    incoming_fstat_calls = 0

    def changing_fstat(fd: int) -> os.stat_result:
        nonlocal incoming_fstat_calls
        result = real_fstat(fd)
        if fd != incoming:
            return result
        incoming_fstat_calls += 1
        if incoming_fstat_calls < 3:
            return result
        fields = list(result)
        index = 2 if changed_field == "device" else 1
        fields[index] += 1
        return os.stat_result(fields)

    monkeypatch.setattr(bundle_module.os, "fstat", changing_fstat)
    try:
        with pytest.raises(
            BundleAdmissionError,
            match=r"^INVALID_PARENT_RESOURCE_SET$",
        ):
            admit_parent_bundle(incoming, load_packet().parent_manifest)
    finally:
        os.close(incoming)


def test_bundle_admission_rejects_fifo_swap_in_stat_open_gap_without_blocking(
    exact_bundle: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    member_name = EXACT_MEMBER_NAMES[0]
    member = exact_bundle / member_name
    incoming = open_harness_bundle(exact_bundle)
    real_open = os.open
    real_stat = os.stat
    real_fstat = os.fstat
    stat_complete = threading.Event()
    fifo_ready = threading.Event()
    intercepted = False
    owned_descriptors: list[int] = []
    outcomes: list[BaseException] = []

    def pausing_stat(
        path: str | bytes | os.PathLike[str] | os.PathLike[bytes],
        *,
        dir_fd: int | None = None,
        follow_symlinks: bool = True,
    ) -> os.stat_result:
        nonlocal intercepted
        result = real_stat(
            path,
            dir_fd=dir_fd,
            follow_symlinks=follow_symlinks,
        )
        if path == member_name and dir_fd is not None and not intercepted:
            intercepted = True
            stat_complete.set()
            assert fifo_ready.wait(timeout=5)
        return result

    def recording_open(
        path: str | bytes | os.PathLike[str] | os.PathLike[bytes],
        flags: int,
        mode: int = 0o777,
        *,
        dir_fd: int | None = None,
    ) -> int:
        opened_fd = real_open(path, flags, mode, dir_fd=dir_fd)
        owned_descriptors.append(opened_fd)
        return opened_fd

    def run_admission() -> None:
        try:
            admit_parent_bundle(incoming, load_packet().parent_manifest)
        except BaseException as exc:
            outcomes.append(exc)

    monkeypatch.setattr(bundle_module.os, "stat", pausing_stat)
    monkeypatch.setattr(bundle_module.os, "open", recording_open)
    worker = threading.Thread(target=run_admission)
    worker.start()
    assert stat_complete.wait(timeout=5)
    member.unlink()
    os.mkfifo(member)
    assert member.is_fifo()
    fifo_ready.set()

    worker.join(timeout=1)
    completed_without_blocking = not worker.is_alive()
    if worker.is_alive():
        unblock_fd = real_open(member, os.O_RDWR | os.O_NONBLOCK)
        os.close(unblock_fd)
        worker.join(timeout=5)

    try:
        assert completed_without_blocking
        assert len(outcomes) == 1
        assert isinstance(outcomes[0], BundleAdmissionError)
        assert str(outcomes[0]) == "INVALID_PARENT_RESOURCE_SET"
        real_fstat(incoming)
        assert owned_descriptors
        for owned_fd in set(owned_descriptors):
            with pytest.raises(OSError):
                real_fstat(owned_fd)
    finally:
        os.close(incoming)
    assert not worker.is_alive()


def test_bundle_admission_rejects_concurrent_exact_content_replacement(
    exact_bundle: Path,
    exact_parent_bytes: dict[str, bytes],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    member_name = EXACT_MEMBER_NAMES[0]
    member = exact_bundle / member_name
    member_inode = member.stat().st_ino
    replacement = exact_bundle.parent / "exact-replacement"
    replacement.write_bytes(exact_parent_bytes[member_name])
    member_opened = threading.Event()
    replacement_done = threading.Event()
    real_read = os.read

    def pausing_read(fd: int, size: int) -> bytes:
        if os.fstat(fd).st_ino == member_inode and not member_opened.is_set():
            member_opened.set()
            assert replacement_done.wait(timeout=5)
        return real_read(fd, size)

    def replace_member() -> None:
        assert member_opened.wait(timeout=5)
        os.replace(replacement, member)
        replacement_done.set()

    monkeypatch.setattr(bundle_module.os, "read", pausing_read)
    replacer = threading.Thread(target=replace_member)
    replacer.start()
    incoming = open_harness_bundle(exact_bundle)
    try:
        with pytest.raises(
            BundleAdmissionError,
            match=r"^INVALID_PARENT_RESOURCE_SET$",
        ):
            admit_parent_bundle(incoming, load_packet().parent_manifest)
    finally:
        os.close(incoming)
        replacement_done.set()
        replacer.join(timeout=5)
    assert not replacer.is_alive()


def test_bundle_admission_rejects_concurrent_content_mutation(
    exact_bundle: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    member = exact_bundle / EXACT_MEMBER_NAMES[0]
    member_inode = member.stat().st_ino
    member_opened = threading.Event()
    mutation_done = threading.Event()
    real_read = os.read

    def pausing_read(fd: int, size: int) -> bytes:
        if os.fstat(fd).st_ino == member_inode and not member_opened.is_set():
            member_opened.set()
            assert mutation_done.wait(timeout=5)
        return real_read(fd, size)

    def mutate_member() -> None:
        assert member_opened.wait(timeout=5)
        member.write_bytes(b"concurrently-corrupted")
        mutation_done.set()

    monkeypatch.setattr(bundle_module.os, "read", pausing_read)
    mutator = threading.Thread(target=mutate_member)
    mutator.start()
    incoming = open_harness_bundle(exact_bundle)
    try:
        with pytest.raises(
            BundleAdmissionError,
            match=r"^INVALID_PARENT_RESOURCE_SET$",
        ):
            admit_parent_bundle(incoming, load_packet().parent_manifest)
    finally:
        os.close(incoming)
        mutation_done.set()
        mutator.join(timeout=5)
    assert not mutator.is_alive()


def test_concurrent_caller_directory_iteration_does_not_perturb_admission(
    exact_bundle: Path,
    exact_parent_bytes: dict[str, bytes],
) -> None:
    incoming = open_harness_bundle(exact_bundle)
    started = threading.Event()
    stop = threading.Event()
    failures: list[BaseException] = []

    def iterate_caller_descriptor() -> None:
        try:
            started.set()
            while not stop.is_set():
                assert set(os.listdir(incoming)) == set(EXACT_MEMBER_NAMES)
        except BaseException as exc:
            failures.append(exc)

    iterator = threading.Thread(target=iterate_caller_descriptor)
    iterator.start()
    assert started.wait(timeout=5)
    try:
        assert admit_parent_bundle(
            incoming, load_packet().parent_manifest
        ) == exact_parent_bytes
    finally:
        stop.set()
        iterator.join(timeout=5)
        os.close(incoming)
    assert not iterator.is_alive()
    assert failures == []


def test_bundle_admission_ignores_fd_numbers_and_filesystem_names(
    exact_bundle: Path,
    exact_parent_bytes: dict[str, bytes],
    tmp_path: Path,
) -> None:
    differently_named = tmp_path / "absent-corrupt-hold-answer-key-name"
    differently_named.mkdir()
    for member_name, data in exact_parent_bytes.items():
        (differently_named / member_name).write_bytes(data)

    first = open_harness_bundle(exact_bundle)
    second = open_harness_bundle(differently_named)
    try:
        assert first != second
        assert admit_parent_bundle(
            first, load_packet().parent_manifest
        ) == admit_parent_bundle(second, load_packet().parent_manifest)
    finally:
        os.close(second)
        os.close(first)


def test_bundle_admission_errors_are_fixed_and_silent(
    exact_bundle: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    (exact_bundle / "extra").write_bytes(b"extra")
    incoming = open_harness_bundle(exact_bundle)
    try:
        with pytest.raises(BundleAdmissionError) as raised:
            admit_parent_bundle(incoming, load_packet().parent_manifest)
        assert str(raised.value) == "INVALID_PARENT_RESOURCE_SET"
    finally:
        os.close(incoming)
    captured = capsys.readouterr()
    assert captured.out == ""
    assert captured.err == ""


def test_reference_oracle_is_total_and_preserves_current_blockers(
    valid_oracle_input: OracleInput,
) -> None:
    result = ReferenceOracle().evaluate(
        candidate_bytes=valid_oracle_input.candidate_bytes,
        signed_context_envelope_bytes=(
            valid_oracle_input.signed_context_envelope_bytes
        ),
        verifier_anchor_spki=valid_oracle_input.verifier_anchor_spki,
        trusted_parent_bundle_fd=valid_oracle_input.trusted_parent_bundle_fd,
    )
    assert result == EvaluationResult(
        schema_version="GCP_SECTION_7_5_1_EVALUATION_RESULT_V4",
        decision="HOLD",
        reason="CURRENT_PARENT_OBLIGATIONS_OPEN",
        authority_effect="NONE",
        claim_grade="STRUCTURAL_ONLY",
    )


def test_reference_oracle_uses_deterministic_multifault_precedence(
    valid_oracle_input: OracleInput,
) -> None:
    oracle = ReferenceOracle()
    result = oracle.evaluate(
        candidate_bytes=b'{ "unknown": true }',
        signed_context_envelope_bytes=b'{"truncated":',
        verifier_anchor_spki=b"not-an-anchor",
        trusted_parent_bundle_fd=-1,
    )
    assert result == EvaluationResult(
        "GCP_SECTION_7_5_1_EVALUATION_RESULT_V4",
        "REJECT",
        "INVALID_CANDIDATE_SHAPE",
        "NONE",
        "NONE",
    )


def test_reference_oracle_precedence_is_stable_after_shape_admission() -> None:
    bad_binding_candidate, bad_binding_envelope, bad_binding_anchor = (
        _signed_oracle_material(
            nonce="aaaa2222333344445555666677778888",
            payload_overrides={
                "candidate_sha256": "0" * 64,
                "registry_sha256": "0" * 64,
            },
        )
    )
    envelope = strict_load_json(bad_binding_envelope)
    assert isinstance(envelope, dict)
    signature = bytearray(
        b64decode(envelope["signature_der_base64"])
    )
    signature[-1] ^= 1
    envelope["signature_der_base64"] = b64encode(signature).decode("ascii")
    invalid_signature = ReferenceOracle().evaluate(
        bad_binding_candidate,
        canonical_json(envelope),
        bad_binding_anchor,
        -1,
    )

    invalid_binding = ReferenceOracle().evaluate(
        bad_binding_candidate,
        bad_binding_envelope,
        bad_binding_anchor,
        -1,
    )

    bad_context_candidate, bad_context_envelope, bad_context_anchor = (
        _signed_oracle_material(
            nonce="bbbb2222333344445555666677778888",
            payload_overrides={"registry_sha256": "0" * 64},
        )
    )
    invalid_context = ReferenceOracle().evaluate(
        bad_context_candidate,
        bad_context_envelope,
        bad_context_anchor,
        -1,
    )

    valid_candidate, valid_envelope, valid_anchor = _signed_oracle_material(
        nonce="cccc2222333344445555666677778888",
    )
    invalid_parent = ReferenceOracle().evaluate(
        valid_candidate,
        valid_envelope,
        valid_anchor,
        -1,
    )

    assert [
        result.reason
        for result in (
            invalid_signature,
            invalid_binding,
            invalid_context,
            invalid_parent,
        )
    ] == [
        "INVALID_SIGNATURE",
        "INVALID_SIGNED_CONTEXT_BINDING",
        "INVALID_CONTEXT_CONJUNCTION",
        "INVALID_PARENT_RESOURCE_SET",
    ]


@pytest.mark.parametrize(
    ("mode", "nonce", "reason", "claim_grade"),
    (
        (
            "CLEAN_CI",
            "11112222333344445555666677778888",
            "CURRENT_PARENT_OBLIGATIONS_OPEN",
            "STRUCTURAL_ONLY",
        ),
        (
            "ARCHIVE_CLOSEOUT",
            "22223333444455556666777788889999",
            "ARCHIVE_CLOSEOUT_PARENT_OBLIGATIONS_OPEN",
            "ARCHIVE_CLOSEOUT_ONLY",
        ),
        (
            "LIVE_RUNTIME",
            "3333444455556666777788889999aaaa",
            "LIVE_RUNTIME_NOT_AUTHORIZED",
            "DESIGN_ONLY",
        ),
    ),
)
def test_reference_oracle_preserves_environment_blockers(
    exact_bundle: Path,
    mode: str,
    nonce: str,
    reason: str,
    claim_grade: str,
) -> None:
    candidate_bytes, envelope_bytes, anchor_spki = _signed_oracle_material(
        mode=mode,
        nonce=nonce,
    )
    incoming = open_harness_bundle(exact_bundle)
    try:
        assert ReferenceOracle().evaluate(
            candidate_bytes,
            envelope_bytes,
            anchor_spki,
            incoming,
        ) == EvaluationResult(
            "GCP_SECTION_7_5_1_EVALUATION_RESULT_V4",
            "HOLD",
            reason,
            "NONE",
            claim_grade,
        )
    finally:
        os.close(incoming)


def test_reference_oracle_rejects_replay_per_instance_only(
    valid_oracle_input: OracleInput,
) -> None:
    arguments = (
        valid_oracle_input.candidate_bytes,
        valid_oracle_input.signed_context_envelope_bytes,
        valid_oracle_input.verifier_anchor_spki,
        valid_oracle_input.trusted_parent_bundle_fd,
    )
    first_oracle = ReferenceOracle()
    assert first_oracle.evaluate(*arguments).reason == (
        "CURRENT_PARENT_OBLIGATIONS_OPEN"
    )
    assert first_oracle.evaluate(*arguments) == EvaluationResult(
        "GCP_SECTION_7_5_1_EVALUATION_RESULT_V4",
        "REJECT",
        "REPLAY_DETECTED",
        "NONE",
        "NONE",
    )
    assert ReferenceOracle().evaluate(*arguments).reason == (
        "CURRENT_PARENT_OBLIGATIONS_OPEN"
    )


def test_reference_oracle_live_validates_conjunction_before_hold() -> None:
    candidate, envelope, anchor = _signed_oracle_material(
        mode="LIVE_RUNTIME",
        nonce="dddd2222333344445555666677778888",
        payload_overrides={"registry_sha256": "0" * 64},
    )

    assert ReferenceOracle().evaluate(candidate, envelope, anchor, -1) == (
        EvaluationResult(
            "GCP_SECTION_7_5_1_EVALUATION_RESULT_V4",
            "REJECT",
            "INVALID_CONTEXT_CONJUNCTION",
            "NONE",
            "NONE",
        )
    )


def test_reference_oracle_rejects_repeated_live_nonce() -> None:
    candidate, envelope, anchor = _signed_oracle_material(
        mode="LIVE_RUNTIME",
        nonce="eeee2222333344445555666677778888",
    )
    oracle = ReferenceOracle()

    assert oracle.evaluate(candidate, envelope, anchor, -1).reason == (
        "LIVE_RUNTIME_NOT_AUTHORIZED"
    )
    assert oracle.evaluate(candidate, envelope, anchor, -1).reason == (
        "REPLAY_DETECTED"
    )


def test_reference_oracle_preserves_parent_authority_ceiling_and_owners(
    exact_parent_bytes: dict[str, bytes],
) -> None:
    security = json.loads(
        exact_parent_bytes["security-authority-contract.json"]
    )
    matrix = json.loads(exact_parent_bytes["role-capability-matrix.json"])
    receipt = json.loads(
        exact_parent_bytes["attestation-receipt-contract.json"]
    )
    constraints = json.loads(
        exact_parent_bytes["constraints-open-obligations-contract.json"]
    )

    assert len(security["project_role_contract"]["role_ids"]) == 5
    assert len(matrix["roles"]) == 14
    assert len(matrix["capabilities"]) == 16
    assert len(security["policy_template"]["hsm_key_profiles"]) == 2
    capability_ids = {
        capability["capability_id"] for capability in matrix["capabilities"]
    }
    for role in matrix["roles"]:
        allowed = set(role["allowed_capability_ids"])
        forbidden = set(role["forbidden_capability_ids"])
        assert allowed.isdisjoint(forbidden)
        assert allowed | forbidden == capability_ids
        assert role["default"] == (
            "DENY_UNLISTED_SECURITY_SENSITIVE_CAPABILITY_OR_PERMISSION"
        )
    assert all(value == [] for value in receipt["approval_registries"].values())

    expected_owners = {
        "S75A-P00": "SECTION_7_2",
        "S75A-P01": "SECTION_7_3",
        "S75A-P02": "SECTION_7_3",
        "S75A-P03": "SECTION_7_4",
        "S75A-P04": "FUTURE_FULL_SECTION_7_5",
        "S75A-P05": "SECTION_7_3_SECTION_7_4_FUTURE_FULL_SECTION_7_5",
        "S75A-P06": "SECTION_7_3",
        "S75A-P07": "FUTURE_FULL_SECTION_7_5_SECTION_7_4",
        "S75A-P08": "SECTION_7_3_FUTURE_FULL_SECTION_7_5",
        "S75A-P09": "FUTURE_FULL_SECTION_7_5",
        "S75A-P10": "FUTURE_FULL_SECTION_7_5",
        "S75A-P11": "FUTURE_FULL_SECTION_7_5",
        "S75A-P12": "FUTURE_FULL_SECTION_7_5",
        "S75A-P13": "FUTURE_FULL_SECTION_7_5_SECTION_7_7",
        "S75A-P14": "SECTION_7_4",
        "S75A-P15": "SECTION_7_7",
        "S75A-P16": "SECTION_7_8",
        "S75A-P17": "HUMAN",
        "S75A-P18": "SECTION_7_3_FUTURE_FULL_SECTION_7_5",
        "S75A-P19": "SECTION_7_3_FUTURE_FULL_SECTION_7_5_SECTION_7_4",
    }
    observed = {
        prerequisite["prerequisite_id"]: prerequisite["owner"]
        for prerequisite in constraints["open_prerequisite_registry"]
    }
    assert observed == expected_owners
    assert {
        prerequisite["current_state"]
        for prerequisite in constraints["open_prerequisite_registry"]
    } == {"OPEN_BLOCKING"}


def _mutate_prerequisite_owner(parent: dict[str, object]) -> None:
    parent["open_prerequisite_registry"][0]["owner"] = "HUMAN"


def _mutate_prerequisite_state(parent: dict[str, object]) -> None:
    parent["open_prerequisite_registry"][0]["current_state"] = "CLOSED"


def _remove_role(parent: dict[str, object]) -> None:
    removed = parent["roles"].pop()["role_id"]
    parent["forbidden_controller_intersections"] = [
        pair
        for pair in parent["forbidden_controller_intersections"]
        if removed not in pair
    ]


def _remove_principal_role(parent: dict[str, object]) -> None:
    removed = parent["principal_role_contract"]["role_ids"].pop()
    parent["principal_role_contract"][
        "forbidden_controller_intersections"
    ] = [
        pair
        for pair in parent["principal_role_contract"][
            "forbidden_controller_intersections"
        ]
        if removed not in pair
    ]


def _remove_capability_and_partition(parent: dict[str, object]) -> None:
    removed = parent["capabilities"].pop()["capability_id"]
    for role in parent["roles"]:
        if removed in role["allowed_capability_ids"]:
            role["allowed_capability_ids"].remove(removed)
        if removed in role["forbidden_capability_ids"]:
            role["forbidden_capability_ids"].remove(removed)


def _mutate_default_deny(parent: dict[str, object]) -> None:
    parent["roles"][0]["default"] = "ALLOW_UNLISTED"


def _mutate_hsm_purpose(parent: dict[str, object]) -> None:
    parent["policy_template"]["hsm_key_profiles"][0][
        "key_purpose_id"
    ] = "SUBSTITUTED_SIGNING_KEY"


def _add_section_7_4_approval(parent: dict[str, object]) -> None:
    parent["approval_registries"]["receipt_hashes"].append("0" * 64)


def _splice_controller_pairs(parent: dict[str, object]) -> None:
    parent["principal_role_contract"][
        "forbidden_controller_intersections"
    ].pop()


def _authorize_runtime(parent: dict[str, object]) -> None:
    parent["non_authorization"]["runtime_authority"] = True


def _allow_public_identifiers(parent: dict[str, object]) -> None:
    parent["privacy"]["raw_identifiers_in_public_artifacts"] = True


@pytest.mark.parametrize(
    ("mutations", "expected_reason"),
    (
        (
            {
                "constraints-open-obligations-contract.json": (
                    _mutate_prerequisite_owner
                )
            },
            "INVALID_SECTION_7_3_AUTHORITY",
        ),
        (
            {
                "constraints-open-obligations-contract.json": (
                    _mutate_prerequisite_state
                )
            },
            "INVALID_SECTION_7_3_AUTHORITY",
        ),
        (
            {
                "role-capability-matrix.json": _remove_role,
                "security-authority-contract.json": _remove_principal_role,
            },
            "INVALID_SECTION_7_3_AUTHORITY",
        ),
        (
            {
                "role-capability-matrix.json": (
                    _remove_capability_and_partition
                )
            },
            "INVALID_SECTION_7_3_AUTHORITY",
        ),
        (
            {"role-capability-matrix.json": _mutate_default_deny},
            "INVALID_SECTION_7_3_AUTHORITY",
        ),
        (
            {"security-authority-contract.json": _mutate_hsm_purpose},
            "INVALID_SECTION_7_3_AUTHORITY",
        ),
        (
            {"attestation-receipt-contract.json": _add_section_7_4_approval},
            "INVALID_SECTION_7_3_AUTHORITY",
        ),
        (
            {"security-authority-contract.json": _splice_controller_pairs},
            "INVALID_SECTION_7_3_AUTHORITY",
        ),
        (
            {"runtime-object-contract.json": _authorize_runtime},
            "PRIVACY_OR_NONAUTHORIZATION_INVALID",
        ),
        (
            {
                "attestation-receipt-contract.json": (
                    _allow_public_identifiers
                )
            },
            "PRIVACY_OR_NONAUTHORIZATION_INVALID",
        ),
    ),
    ids=(
        "owner_substitution",
        "blocker_state_substitution",
        "reduced_roles",
        "reduced_capabilities",
        "default_deny_drift",
        "hsm_purpose_drift",
        "nonempty_approval",
        "controller_cross_object_splice",
        "nonauthorization_drift",
        "privacy_drift",
    ),
)
def test_reference_oracle_rejects_authenticated_parent_semantic_mutations(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    mutations: dict[str, object],
    expected_reason: str,
) -> None:
    result = _evaluate_mutated_parent_bundle(
        tmp_path=tmp_path,
        monkeypatch=monkeypatch,
        mutations=mutations,
    )

    assert result.reason == expected_reason


def test_controller_fixed_point_retains_cycle_before_separation_reject() -> None:
    observation = _valid_candidate()["observation"]
    assert isinstance(observation, dict)
    first, second = observation["governed_roles"][:2]
    observation["controller_edges"] = sorted(
        [
            {"controller": first, "controlled": second},
            {"controller": second, "controlled": first},
        ],
        key=canonical_json,
    )
    observation["controller_cycles"] = [[first, second]]

    assert evaluate_controller_fixed_point(observation) == (
        "REJECT_INVALID_GRAPH"
    )


def test_controller_fixed_point_holds_unknown_edges() -> None:
    observation = _valid_candidate()["observation"]
    assert isinstance(observation, dict)
    observation["unknown_edge_count"] = 1

    assert evaluate_controller_fixed_point(observation) == "HOLD_UNKNOWN_EDGE"


@pytest.mark.parametrize(
    "edge_indexes",
    (
        ((0, 1),),
        ((0, 1), (1, 2)),
        ((0, 1), (0, 2)),
    ),
    ids=("direct", "transitive", "fan_out"),
)
def test_controller_fixed_point_rejects_forbidden_upstream_intersections(
    edge_indexes: tuple[tuple[int, int], ...],
) -> None:
    observation = _valid_candidate()["observation"]
    assert isinstance(observation, dict)
    roles = observation["governed_roles"]
    observation["controller_edges"] = sorted(
        [
            {
                "controller": roles[controller],
                "controlled": roles[controlled],
            }
            for controller, controlled in edge_indexes
        ],
        key=canonical_json,
    )

    assert evaluate_controller_fixed_point(observation) == (
        "REJECT_INVALID_GRAPH"
    )


def test_controller_fixed_point_rejects_malformed_cycle_semantics() -> None:
    observation = _valid_candidate()["observation"]
    assert isinstance(observation, dict)
    first, second = observation["governed_roles"][:2]
    observation["controller_edges"] = sorted(
        [
            {"controller": first, "controlled": second},
            {"controller": second, "controlled": first},
        ],
        key=canonical_json,
    )
    observation["controller_cycles"] = []

    assert evaluate_controller_fixed_point(observation) == (
        "REJECT_INVALID_GRAPH"
    )
