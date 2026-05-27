from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[2]
BRIEF_MD = ROOT / "output" / "doc" / "FluencyTracr_Trust_Calibration_Pilot_Brief.md"
BRIEF_DOCX = ROOT / "output" / "doc" / "FluencyTracr_Trust_Calibration_Pilot_Brief.docx"


def docx_text(path: Path) -> str:
    with ZipFile(path) as archive:
        xml = archive.read("word/document.xml")
    root = ET.fromstring(xml)
    namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    return "\n".join(
        node.text or ""
        for node in root.findall(".//w:t", namespace)
    )


def assert_external_brief_contract(text: str) -> None:
    for phrase in [
        "AI Work Evidence Pilot Brief",
        "Trust Calibration Context",
        "88,028,657 aggregate AI work episodes",
        "15,826,000 aggregate episodes",
        "37,484,844 aggregate episodes",
        "18.0%",
        "42.6%",
        "does not identify, score, rank, or evaluate employees",
        "not a trust score",
        "not a citation-click metric",
        "not a correctness detector",
        "does not calculate ROI",
        "does not establish causality",
        "No API is required for this pilot phase",
    ]:
        assert phrase in text

    for raw_code in [
        "resolved_with_confidence",
        "resolved_without_verification_signal",
        "recovered_after_failure",
        "stalled_after_ai_assist",
        "explicit_negative_feedback",
        "evidence_gap",
    ]:
        assert raw_code not in text

    for prohibited_claim in [
        "proves causality",
        "calculates roi",
        "scores employees",
        "ranks teams",
        "ranks managers",
        "individual productivity",
        "maturity score",
    ]:
        assert prohibited_claim not in text.lower()


def test_external_brief_markdown_is_share_safe() -> None:
    assert_external_brief_contract(BRIEF_MD.read_text())


def test_external_brief_docx_is_share_safe() -> None:
    assert_external_brief_contract(docx_text(BRIEF_DOCX))
