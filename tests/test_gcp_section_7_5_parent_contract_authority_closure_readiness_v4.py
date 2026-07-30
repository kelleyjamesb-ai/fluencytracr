from pathlib import Path
import json


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
