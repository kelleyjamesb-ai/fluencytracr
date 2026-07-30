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
