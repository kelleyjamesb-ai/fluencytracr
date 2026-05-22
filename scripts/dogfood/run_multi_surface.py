#!/usr/bin/env python3
"""Run dogfood fixtures across multiple Glean surfaces from aggregate rows."""

from __future__ import annotations

import argparse
import csv
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
GENERATOR = ROOT / "scripts" / "dogfood" / "generate_gce_fixtures.py"
RUNNER = ROOT / "scripts" / "dogfood" / "run_end_to_end.py"

REQUIRED_FIELDS = [
    "real_cohort_size",
    "distinct_users",
    "window_days",
    "completion_rate",
    "error_rate",
    "abandonment_rate",
    "recovery_rate",
    "p50_latency_ms",
    "p95_latency_ms",
]

BLANK_WORKFLOW_ID_REASON = "Blank workflow_id in input — likely unclassified BigQuery feature rows"

MANAGER_REVIEW_SURFACES = {"CHAT", "AI_ANSWER"}
ENG_ON_CALL_SURFACES = {
    "AGENT",
    "GLEANBOT",
    "SUPPORT_NEXT_STEPS",
    "INTERACTIVE_COMPILER",
    "PRISM",
    "AGENT_LIVE_PREVIEW",
}


class InputError(ValueError):
    pass


def workflow_family_for(workflow_id: str) -> str:
    normalized = workflow_id.strip().upper()
    if normalized in MANAGER_REVIEW_SURFACES:
        return "manager-review-writer"
    if normalized in ENG_ON_CALL_SURFACES:
        return "eng-on-call-triage"
    return "eng-on-call-triage"


def surface_filename(workflow_id: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9_.-]+", "_", workflow_id.strip())
    return f"{safe or 'surface'}.md"


def read_rows(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        raise InputError(f"input file not found: {path}")
    if path.suffix.lower() == ".json":
        raw = json.loads(path.read_text())
        if isinstance(raw, dict) and isinstance(raw.get("rows"), list):
            rows = raw["rows"]
        else:
            rows = raw
        if not isinstance(rows, list):
            raise InputError("JSON input must be a list of rows or an object with a rows array")
        return [dict(row) for row in rows]

    with path.open(newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise InputError("CSV input must include a header row")
        return [dict(row) for row in reader]


def _require(row: dict[str, Any], field: str, row_number: int) -> Any:
    value = row.get(field)
    if value is None or value == "":
        raise InputError(f"row {row_number}: missing required field {field}")
    return value


def _to_int(row: dict[str, Any], field: str, row_number: int) -> int:
    try:
        return int(_require(row, field, row_number))
    except (TypeError, ValueError) as error:
        raise InputError(f"row {row_number}: {field} must be an integer") from error


def _to_float(row: dict[str, Any], field: str, row_number: int, *, default: float | None = None) -> float:
    value = row.get(field)
    if (value is None or value == "") and default is not None:
        return default
    if value is None or value == "":
        raise InputError(f"row {row_number}: missing required field {field}")
    try:
        parsed = float(value)
    except (TypeError, ValueError) as error:
        raise InputError(f"row {row_number}: {field} must be a number") from error
    if parsed < 0.0 or parsed > 1.0:
        raise InputError(f"row {row_number}: {field} must be between 0.0 and 1.0")
    return parsed


def normalize_workflow_id(value: Any) -> str:
    if value is None:
        return "UNCLASSIFIED"
    workflow_id = str(value).strip()
    return workflow_id or "UNCLASSIFIED"


def normalize_row(row: dict[str, Any], row_number: int) -> dict[str, Any]:
    for field in REQUIRED_FIELDS:
        _require(row, field, row_number)
    return {
        "workflow_id": normalize_workflow_id(row.get("workflow_id")),
        "real_cohort_size": _to_int(row, "real_cohort_size", row_number),
        "distinct_users": _to_int(row, "distinct_users", row_number),
        "window_days": _to_int(row, "window_days", row_number),
        "completion_rate": _to_float(row, "completion_rate", row_number),
        "error_rate": _to_float(row, "error_rate", row_number),
        "abandonment_rate": _to_float(row, "abandonment_rate", row_number),
        "recovery_rate": _to_float(row, "recovery_rate", row_number),
        "verification_rate": _to_float(row, "verification_rate", row_number, default=0.0),
        "p50_latency_ms": _to_int(row, "p50_latency_ms", row_number),
        "p95_latency_ms": _to_int(row, "p95_latency_ms", row_number),
    }


def run_command(args: list[str]) -> str:
    completed = subprocess.run(
        args,
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
        timeout=60,
    )
    if completed.returncode != 0:
        detail = completed.stderr.strip() or completed.stdout.strip()
        raise RuntimeError(detail or f"command failed: {' '.join(args)}")
    return completed.stdout


def generate_fixture(row: dict[str, Any], output_dir: Path, cohort_size: int) -> Path:
    fixture_path = output_dir / f"{surface_filename(row['workflow_id']).removesuffix('.md')}.json"
    run_command(
        [
            sys.executable,
            str(GENERATOR),
            "--workflow-family",
            workflow_family_for(row["workflow_id"]),
            "--cohort-size",
            str(cohort_size),
            "--abandonment-rate",
            str(row["abandonment_rate"]),
            "--recovery-rate",
            str(row["recovery_rate"]),
            "--verification-rate",
            str(row["verification_rate"]),
            "--friction-rate",
            str(row["error_rate"]),
            "--output",
            str(fixture_path),
        ]
    )
    fixture = json.loads(fixture_path.read_text())
    fixture["days"] = row["window_days"]
    fixture["source_surface"] = {
        "workflow_id": row["workflow_id"],
        "real_cohort_size": row["real_cohort_size"],
        "distinct_users": row["distinct_users"],
        "completion_rate": row["completion_rate"],
        "p50_latency_ms": row["p50_latency_ms"],
        "p95_latency_ms": row["p95_latency_ms"],
    }
    fixture_path.write_text(json.dumps(fixture, indent=2, sort_keys=True) + "\n")
    return fixture_path


def parse_number(value: str) -> float | None:
    cleaned = value.strip()
    if cleaned in {"None", "none", "null", ""}:
        return None
    return float(cleaned)


def parse_readout(text: str) -> dict[str, Any]:
    parsed: dict[str, Any] = {}
    for line in text.splitlines():
        if line.startswith("Verdict: "):
            parsed["verdict"] = line.removeprefix("Verdict: ").strip()
        elif line.startswith("Suppression reason: "):
            reason = line.removeprefix("Suppression reason: ").strip()
            parsed["suppression_reason"] = None if reason == "none" else reason
        elif line.startswith("AIVM: "):
            aivm = line.removeprefix("AIVM: ").strip().split()
            parsed["value_type"] = aivm[0].split("=", 1)[1]
            parsed["evidence_grade"] = aivm[1].split("=", 1)[1]
        elif line.startswith("Reliability factor: "):
            parsed["reliability_factor"] = parse_number(line.removeprefix("Reliability factor: "))
        elif line.startswith("Quality multiplier: "):
            parsed["quality_multiplier"] = parse_number(line.removeprefix("Quality multiplier: "))
        elif line.startswith("Canonical events ingested: "):
            parsed["canonical_event_count"] = int(line.removeprefix("Canonical events ingested: ").strip())
    for key in ["verdict", "value_type", "evidence_grade", "canonical_event_count"]:
        if key not in parsed:
            raise RuntimeError(f"could not parse {key} from dogfood readout")
    parsed.setdefault("suppression_reason", None)
    parsed.setdefault("reliability_factor", None)
    parsed.setdefault("quality_multiplier", None)
    return parsed


def run_surface(row: dict[str, Any], output_dir: Path, cohort_size: int) -> dict[str, Any]:
    fixture_path = generate_fixture(row, output_dir, cohort_size)
    readout_text = run_command([sys.executable, str(RUNNER), "--fixture", str(fixture_path)])
    surface_readout = output_dir / surface_filename(row["workflow_id"])
    surface_readout.write_text(readout_text)
    parsed = parse_readout(readout_text)
    return {**row, **parsed, "readout_path": str(surface_readout)}


def fmt(value: float | None) -> str:
    if value is None:
        return "n/a"
    return f"{value:.3f}".rstrip("0").rstrip(".")


def weighted(rows: list[dict[str, Any]], metric: str) -> float | None:
    surface_rows = [
        row
        for row in rows
        if row["verdict"] == "SURFACE" and isinstance(row.get(metric), float)
    ]
    denominator = sum(row["real_cohort_size"] for row in surface_rows)
    if denominator == 0:
        return None
    numerator = sum(row["real_cohort_size"] * row[metric] for row in surface_rows)
    return round(numerator / denominator, 3)


def render_readout(
    *,
    results: list[dict[str, Any]],
    skipped: list[dict[str, Any]],
    cohort_size: int,
) -> str:
    weighted_reliability = weighted(results, "reliability_factor")
    weighted_quality = weighted(results, "quality_multiplier")
    lines = [
        "# Multi-Surface Dogfood Readout",
        "",
    ]
    if weighted_reliability is None or weighted_quality is None:
        lines.append("No surfaces qualified for weighted rollup.")
    else:
        lines.extend(
            [
                f"Weighted Reliability Factor: {fmt(weighted_reliability)}",
                f"Weighted Quality Multiplier: {fmt(weighted_quality)}",
            ]
        )
    lines.extend(
        [
            "",
            "## Per-surface Results",
            "",
            "| workflow_id | real cohort | verdict | reliability | quality multiplier | AIVM tags |",
            "| --- | ---: | --- | ---: | ---: | --- |",
        ]
    )
    for row in results:
        tags = f"{row['value_type']} / {row['evidence_grade']}"
        lines.append(
            f"| {row['workflow_id']} | {row['real_cohort_size']} | {row['verdict']} | "
            f"{fmt(row['reliability_factor'])} | {fmt(row['quality_multiplier'])} | {tags} |"
        )
    if not results:
        lines.append("| none | 0 | n/a | n/a | n/a | n/a |")

    lines.extend(
        [
            "",
            "## Skipped Surfaces",
            "",
            "| workflow_id | real cohort | reason |",
            "| --- | ---: | --- |",
        ]
    )
    for row in skipped:
        lines.append(f"| {row['workflow_id']} | {row['real_cohort_size']} | {row['reason']} |")
    if not skipped:
        lines.append("| none | 0 | n/a |")

    lines.extend(
        [
            "",
            "## Methodology Footnote",
            "",
            f"Rates come from customer-supplied BigQuery aggregate rows. The driver expands each included surface into {cohort_size} synthetic GCE-shaped workflow runs so the V1 dogfood ingest path can evaluate the same aggregate behavior without using real customer data or row-level records.",
            "Weighted rollups use real_cohort_size from the input rows and include SURFACE rows only. Each surface is evaluated independently before any read-only weighted summary is computed.",
        ]
    )
    return "\n".join(lines) + "\n"


def run(input_path: Path, output_dir: Path, readout_path: Path, cohort_size: int) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    raw_rows = read_rows(input_path)
    results: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    for index, raw_row in enumerate(raw_rows, start=2):
        row = normalize_row(raw_row, index)
        if row["workflow_id"] == "UNCLASSIFIED":
            skipped.append({**row, "reason": BLANK_WORKFLOW_ID_REASON})
            continue
        if row["window_days"] < 60:
            skipped.append({**row, "reason": "window_days < 60"})
            continue
        if row["real_cohort_size"] < 100:
            skipped.append({**row, "reason": "real_cohort_size < 100"})
            continue
        results.append(run_surface(row, output_dir, cohort_size))

    readout_path.parent.mkdir(parents=True, exist_ok=True)
    readout_path.write_text(render_readout(results=results, skipped=skipped, cohort_size=cohort_size))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, default=Path("./dogfood-output/"))
    parser.add_argument("--readout", type=Path, default=Path("./dogfood-output/READOUT.md"))
    parser.add_argument("--cohort-size", type=int, default=1000)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        if args.cohort_size < 5:
            raise InputError("--cohort-size must be at least 5")
        run(args.input, args.output_dir, args.readout, args.cohort_size)
        print(f"Wrote consolidated dogfood readout to {args.readout}")
        return 0
    except (InputError, json.JSONDecodeError) as error:
        print(f"Invalid input: {error}", file=sys.stderr)
        return 1
    except Exception as error:
        print(f"Dogfood run failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
