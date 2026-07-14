#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

CONTRACT_PHASE1 = ROOT / "docs" / "contracts" / "FluencyTracr_V1_Phase1_Event_Contract.md"
CONTRACT_PHASE2 = ROOT / "docs" / "contracts" / "FluencyTracr_V1_Phase2_Signal_Evaluation_Contract.md"
ENFORCEMENT_SPEC = ROOT / "docs" / "ENFORCEMENT_SPEC.md"
EVAL_DECISION_SCHEMA = ROOT / "schemas" / "ft_v1_evaluation_decision.schema.json"
EVAL_DECISION_CODE = ROOT / "backend" / "src" / "v1" / "evaluationDecision.ts"
DEFAULT_SUPPRESS_TEST = ROOT / "backend" / "tests" / "v1_evaluation_decision.test.ts"
CANONICAL_SUPPRESSION_SOURCE = ROOT / "shared" / "src" / "fluencyTracrConfidence.ts"
INTERNAL_DIAGNOSTIC_SOURCE = ROOT / "shared" / "src" / "fluencyTracrV1Signal.ts"

EXPECTED_CANONICAL_SUPPRESSION_REASONS = {
    "INSUFFICIENT_TIME",
    "INSUFFICIENT_VOLUME",
    "NO_CONVERGENCE",
    "BASELINE_UNSTABLE",
    "HIGH_AMBIGUITY",
}


def _fail(message: str) -> None:
    raise SystemExit(f"V1 governance gate failed: {message}")


def _read_text(path: Path) -> str:
    if not path.exists():
        _fail(f"missing required file: {path}")
    return path.read_text(encoding="utf-8")


def _load_json(path: Path) -> dict:
    return json.loads(_read_text(path))


def main() -> None:
    _read_text(CONTRACT_PHASE1)
    _read_text(CONTRACT_PHASE2)

    enforcement_spec = _read_text(ENFORCEMENT_SPEC)
    if "docs/contracts/FluencyTracr_V1_Phase1_Event_Contract.md" not in enforcement_spec:
        _fail("ENFORCEMENT_SPEC.md does not reference Phase 1 contract canonical path")
    if "docs/contracts/FluencyTracr_V1_Phase2_Signal_Evaluation_Contract.md" not in enforcement_spec:
        _fail("ENFORCEMENT_SPEC.md does not reference Phase 2 contract canonical path")

    phase1_text = _read_text(CONTRACT_PHASE1)
    contract_events = set(
        re.findall(r"^-\s+(FT_V1_[A-Z0-9_]+)$", phase1_text, flags=re.MULTILINE)
    )
    if not contract_events:
        _fail("no event names found in Phase 1 contract")

    schema_events = set()
    for schema_path in (ROOT / "schemas").glob("ft_v1_*_observed.schema.json"):
        payload = _load_json(schema_path)
        event_const = (
            payload.get("properties", {})
            .get("event_name", {})
            .get("const")
        )
        if event_const:
            schema_events.add(event_const)
    if contract_events != schema_events:
        _fail(
            "Phase 1 contract event names do not match schema event_name consts"
        )

    decision_schema = _load_json(EVAL_DECISION_SCHEMA)
    decision_enum = (
        decision_schema.get("properties", {})
        .get("decision", {})
        .get("enum", [])
    )
    if decision_enum != ["SURFACE"]:
        _fail("evaluation decision schema must allow only SURFACE decisions")

    if "renderable" in decision_schema.get("properties", {}):
        _fail("evaluation decision schema must not include renderable")

    if "suppress_reason_code" in decision_schema.get("properties", {}):
        _fail("evaluation decision schema must not include suppress_reason_code")

    if "SURFACE Export Projection" not in decision_schema.get("title", ""):
        _fail("evaluation decision schema must identify the unbound SURFACE export projection")

    canonical_source = _read_text(CANONICAL_SUPPRESSION_SOURCE)
    canonical_reasons = set(
        re.findall(
            r'"(INSUFFICIENT_TIME|INSUFFICIENT_VOLUME|NO_CONVERGENCE|BASELINE_UNSTABLE|HIGH_AMBIGUITY)"',
            canonical_source,
        )
    )
    if canonical_reasons != EXPECTED_CANONICAL_SUPPRESSION_REASONS:
        _fail("canonical suppression reason source does not match the locked five")

    internal_diagnostics = set(
        re.findall(r'"(SUPP_[A-Z0-9_]+)"', _read_text(INTERNAL_DIAGNOSTIC_SOURCE))
    )
    if not internal_diagnostics:
        _fail("no internal SUPP diagnostics found")
    if canonical_reasons.intersection(internal_diagnostics):
        _fail("internal SUPP diagnostics overlap canonical suppression reasons")

    for boundary_root in (ROOT / "schemas", ROOT / "docs" / "api"):
        for boundary_path in boundary_root.rglob("*"):
            if boundary_path.is_file() and "SUPP_" in _read_text(boundary_path):
                _fail(f"internal SUPP diagnostic leaked into product boundary: {boundary_path}")

    code_text = _read_text(EVAL_DECISION_CODE)
    if "FT_V1_2026_01" not in code_text or "FT_V1_EVALUATION_DECISION" not in code_text:
        _fail("evaluationDecision.ts does not include required schema_version/artifact_name")

    test_text = _read_text(DEFAULT_SUPPRESS_TEST)
    if "suppresses ambiguous inputs" not in test_text:
        _fail("ambiguity suppression test missing in v1_evaluation_decision.test.ts")


if __name__ == "__main__":
    main()
