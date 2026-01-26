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
    reason_codes = set(
        decision_schema.get("properties", {})
        .get("suppress_reason_code", {})
        .get("enum", [])
    )
    if not reason_codes:
        _fail("no suppress_reason_code enum found in evaluation decision schema")

    suppress_tokens = set()
    for path in ROOT.rglob("*"):
        if path.is_dir():
            continue
        if any(part in path.parts for part in (".git", "node_modules", ".venv", "__pycache__")):
            continue
        if path.suffix not in {".ts", ".js", ".py", ".md", ".json"}:
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except Exception:
            continue
        suppress_tokens.update(re.findall(r"SUPP_[A-Z0-9_]+", content))

    if not suppress_tokens.issubset(reason_codes):
        unknown = sorted(suppress_tokens.difference(reason_codes))
        _fail(f"unknown suppress reason codes detected: {unknown}")

    code_text = _read_text(EVAL_DECISION_CODE)
    if "FT_V1_2026_01" not in code_text or "FT_V1_EVALUATION_DECISION" not in code_text:
        _fail("evaluationDecision.ts does not include required schema_version/artifact_name")

    test_text = _read_text(DEFAULT_SUPPRESS_TEST)
    if "defaults to SUPPRESS" not in test_text:
        _fail("default SUPPRESS test missing in v1_evaluation_decision.test.ts")
    if "SUPP_NO_QUALIFYING_EVIDENCE" not in test_text:
        _fail("default SUPPRESS reason code assertion missing in v1_evaluation_decision.test.ts")


if __name__ == "__main__":
    main()
