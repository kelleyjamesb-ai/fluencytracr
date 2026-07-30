from pathlib import Path
import hashlib
import json
import os
import subprocess
import sys

import pytest

from tests.gcp_s751_v4.ledger import (
    build_rule_ledger,
    reconcile_rule_ledger,
    serialize_rule_ledger,
)
from tests.gcp_s751_v4.model import (
    canonical_json,
    enumerate_all_dynamic_paths,
    load_exact_parents,
    load_packet,
    strict_load_json,
)


ROOT = Path(__file__).resolve().parents[1]
PACKET = ROOT / (
    "tests/fixtures/"
    "gcp_section_7_5_parent_contract_authority_closure_readiness_v4/"
    "packet-rules.json"
)


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
