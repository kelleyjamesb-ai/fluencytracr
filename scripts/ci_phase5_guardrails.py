#!/usr/bin/env python3
from __future__ import annotations

import os
import re
import subprocess
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

PHASE1_CONTRACT = ROOT / "docs" / "contracts" / "FluencyTracr_V1_Phase1_Event_Contract.md"
EGAS_SPEC = ROOT / "docs" / "governance" / "phase5" / "EXEC_GOV_ASSURANCE_SPEC.md"
ECM_PATH = ROOT / "docs" / "governance" / "phase5" / "ENFORCEMENT_COVERAGE_MATRIX.md"
PRIVACY_PATH = ROOT / "shared" / "src" / "privacy.ts"

RUNTIME_DIRS = [
    ROOT / "backend" / "src",
    ROOT / "backend" / "tests",
    ROOT / "frontend" / "src",
    ROOT / "shared" / "src",
    ROOT / "src",
    ROOT / "tests",
]

SCHEMA_DIRS = [
    ROOT / "schemas",
    ROOT / "backend" / "src" / "contracts",
]

TEXT_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".py", ".json"}

ORDERED_OR_ACCUMULATIVE_KEYS = {
    "order",
    "ordered",
    "sequence",
    "streak",
    "duration",
    "cumulative",
    "accumulated",
    "accumulator",
    "count",
    "sum",
    "avg",
    "average",
    "total",
    "rate",
    "ratio",
    "trend",
    "delta",
    "change",
    "comparison",
    "compare",
    "baseline",
}

MULTI_WINDOW_KEYS = {
    "window_start",
    "window_end",
    "previous_window",
    "next_window",
    "window_ids",
    "window_history",
    "window_series",
    "time_series",
    "series",
    "rolling_window",
    "multi_window",
    "bucket_start",
    "bucket_end",
    "history",
}

EXEC_EXPANSION_TOKENS = [
    "executive",
    "EXEC_VIEWER",
    "/api/v1/executive",
    "executive view",
    "executive-level",
]

REQUIRED_FORBIDDEN_FIELDS = {
    "order",
    "ordered",
    "sequence",
    "streak",
    "duration",
    "baseline",
    "compare",
    "comparison",
    "cumulative",
    "accumulated",
    "accumulator",
    "trend",
    "delta",
    "change",
}

REQUIRED_ECM_FIELDS = [
    "Runtime enforcement locations",
    "Tests proving enforcement",
    "CI checks failing on violation",
]


def fail(message: str) -> None:
    raise SystemExit(f"Phase 5A guardrail failed: {message}")


def read_text(path: Path) -> str:
    if not path.exists():
        fail(f"missing required file: {path}")
    return path.read_text(encoding="utf-8")


def iter_text_files(directory: Path) -> list[Path]:
    files: list[Path] = []
    if not directory.exists():
        return files
    for path in directory.rglob("*"):
        if path.is_file() and path.suffix in TEXT_EXTENSIONS:
            files.append(path)
    return files


def parse_phase1_event_names() -> set[str]:
    text = read_text(PHASE1_CONTRACT)
    return set(re.findall(r"^\-\s+(FT_V1_[A-Z0-9_]+_OBSERVED)$", text, flags=re.MULTILINE))


def scan_for_unknown_ft_v1_tokens(allowlist: set[str]) -> None:
    unknown: dict[str, set[str]] = {}
    token_pattern = re.compile(r"FT_V1_[A-Z0-9_]+_OBSERVED")
    for directory in RUNTIME_DIRS:
        for path in iter_text_files(directory):
            content = path.read_text(encoding="utf-8", errors="ignore")
            for token in token_pattern.findall(content):
                if token not in allowlist:
                    unknown.setdefault(str(path), set()).add(token)
    if unknown:
        lines = []
        for path, tokens in sorted(unknown.items()):
            lines.append(f"{path}: {', '.join(sorted(tokens))}")
        fail("unknown FT_V1_* tokens detected (not in Phase 1 contract):\n" + "\n".join(lines))


def scan_for_governance_doc_imports() -> None:
    violations: list[str] = []
    for directory in RUNTIME_DIRS:
        for path in iter_text_files(directory):
            content = path.read_text(encoding="utf-8", errors="ignore")
            if "docs/governance" in content:
                violations.append(str(path))
    if violations:
        fail(
            "Governance violation (GEM-TG5-12-ENFORCEMENT_VALIDITY_RULE): "
            "runtime/test code references docs/governance (hard prohibited):\n"
            + "\n".join(sorted(violations))
        )


def parse_forbidden_fields() -> set[str]:
    text = read_text(PRIVACY_PATH)
    match = re.search(r"GOVERNANCE_FORBIDDEN_FIELDS\s*=\s*\[(.*?)\]", text, re.S)
    if not match:
        fail("GOVERNANCE_FORBIDDEN_FIELDS not found in shared/src/privacy.ts")
    body = match.group(1)
    items = re.findall(r"\"([^\"]+)\"", body)
    if not items:
        fail("GOVERNANCE_FORBIDDEN_FIELDS is empty")
    return {item.strip().lower() for item in items}


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"invalid JSON schema {path}: {exc}")


def find_schema_keys(schema: dict) -> set[str]:
    keys: set[str] = set()

    def walk(node: object) -> None:
        if isinstance(node, dict):
            props = node.get("properties")
            if isinstance(props, dict):
                keys.update(props.keys())
            required = node.get("required")
            if isinstance(required, list):
                for item in required:
                    if isinstance(item, str):
                        keys.add(item)
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(schema)
    return keys


def scan_schema_forbidden_keys() -> None:
    violations: list[str] = []
    forbidden = ORDERED_OR_ACCUMULATIVE_KEYS | MULTI_WINDOW_KEYS
    schema_files: list[Path] = []
    for directory in SCHEMA_DIRS:
        if not directory.exists():
            continue
        schema_files.extend(directory.rglob("*.schema.json"))

    for schema_path in schema_files:
        schema = load_json(schema_path)
        keys = {key.lower() for key in find_schema_keys(schema)}
        hits = sorted({key for key in keys if key in forbidden})
        if hits:
            violations.append(f"{schema_path}: {', '.join(hits)}")

    if violations:
        fail(
            "Governance violation (GEM-TG5-01-NO_CROSS_WINDOW_LINKAGE, "
            "GEM-TG5-02-NO_ORDERING_STREAKS_OR_DURATION, "
            "GEM-TG5-03-NO_DELTAS_COMPARISONS_OR_TRENDS): "
            "ordered/accumulative or multi-window keys detected in schema:\n"
            + "\n".join(violations)
        )


def git_diff_base() -> str | None:
    base_ref = os.environ.get("GITHUB_BASE_REF")
    if base_ref:
        return f"origin/{base_ref}"
    try:
        return subprocess.check_output(["git", "merge-base", "HEAD", "origin/main"], text=True).strip()
    except subprocess.CalledProcessError:
        return None


def git_changed_files(base: str | None) -> set[str]:
    if not base:
        return set()
    try:
        output = subprocess.check_output(["git", "diff", "--name-only", f"{base}..HEAD"], text=True)
        return {line.strip() for line in output.splitlines() if line.strip()}
    except subprocess.CalledProcessError:
        return set()


def diff_added_lines(base: str | None, paths: list[str] | None = None) -> list[str]:
    if not base:
        return []
    cmd = ["git", "diff", "-U0", f"{base}..HEAD"]
    if paths:
        cmd.append("--")
        cmd.extend(paths)
    try:
        output = subprocess.check_output(cmd, text=True)
    except subprocess.CalledProcessError:
        return []
    added: list[str] = []
    for line in output.splitlines():
        if line.startswith("+++") or line.startswith("@@"):
            continue
        if line.startswith("+"):
            added.append(line[1:])
    return added


def guard_exec_observability_expansion() -> None:
    if not EGAS_SPEC.exists():
        fail("missing EGAS spec (docs/governance/phase5/EXEC_GOV_ASSURANCE_SPEC.md)")

    base = git_diff_base()
    changed_files = git_changed_files(base)

    runtime_roots = {
        str(ROOT / "backend" / "src"),
        str(ROOT / "frontend" / "src"),
        str(ROOT / "shared" / "src"),
        str(ROOT / "src"),
    }
    runtime_changed = [
        path for path in changed_files if any(path.startswith(root) for root in runtime_roots)
    ]

    if not runtime_changed:
        return

    added_lines = diff_added_lines(base, runtime_changed)

    if not added_lines:
        return

    expansion_detected = any(
        any(token.lower() in line.lower() for token in EXEC_EXPANSION_TOKENS)
        for line in added_lines
    )
    if expansion_detected and str(EGAS_SPEC.relative_to(ROOT)) not in changed_files:
        fail("executive-facing changes detected without EGAS spec update")


def guard_required_forbidden_fields() -> None:
    forbidden = parse_forbidden_fields()
    missing = sorted({field for field in REQUIRED_FORBIDDEN_FIELDS if field not in forbidden})
    if missing:
        fail(
            "Governance violation (GEM-TG5-02-NO_ORDERING_STREAKS_OR_DURATION, "
            "GEM-TG5-03-NO_DELTAS_COMPARISONS_OR_TRENDS): "
            "GOVERNANCE_FORBIDDEN_FIELDS missing required tokens: "
            + ", ".join(missing)
        )


def guard_ecm_completeness() -> None:
    if not ECM_PATH.exists():
        fail("missing ECM at docs/governance/phase5/ENFORCEMENT_COVERAGE_MATRIX.md")
    text = read_text(ECM_PATH)
    sections = re.split(r"^##\s+", text, flags=re.MULTILINE)
    if len(sections) <= 1:
        fail("ECM has no GEM rows")

    failures: list[str] = []
    for section in sections[1:]:
        title_line = section.splitlines()[0].strip()
        body = section
        if "Status: COMPLETE" not in body:
            failures.append(f"{title_line}: Status not COMPLETE")
        for field in REQUIRED_ECM_FIELDS:
            pattern = rf"-\s*{re.escape(field)}.*:"
            if not re.search(pattern, body):
                failures.append(f"{title_line}: missing field '{field}'")
            if re.search(rf"{re.escape(field)}.*:.*TODO", body):
                failures.append(f"{title_line}: {field} still TODO")

    if failures:
        fail(
            "Governance violation (GEM-TG5-12-ENFORCEMENT_VALIDITY_RULE): "
            "ECM completeness check failed:\n" + "\n".join(failures)
        )


def main() -> None:
    allowlist = parse_phase1_event_names()
    if not allowlist:
        fail("no FT_V1 event names found in Phase 1 contract")

    scan_for_unknown_ft_v1_tokens(allowlist)
    scan_for_governance_doc_imports()
    scan_schema_forbidden_keys()
    guard_required_forbidden_fields()
    guard_exec_observability_expansion()
    guard_ecm_completeness()

    print("Phase 5A guardrails ok")


if __name__ == "__main__":
    main()
