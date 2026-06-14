#!/usr/bin/env python3
"""Run dogfood fixtures across multiple Glean surfaces from aggregate rows."""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
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

BLANK_WORKFLOW_ID_REASON = (
    "Blank workflow_id in input — likely unclassified BigQuery feature rows; relabeled UNCLASSIFIED"
)
MIN_CANONICAL_COHORT_SIZE = 5
MIN_VELOCITY_WINDOW_DAYS = 60
MIN_VELOCITY_COHORT_SIZE = 5
VELOCITY_BASELINE_PATH = ROOT / "calibration" / "velocity_baselines.json"

VELOCITY_FIELDS = [
    "workflow_id",
    "surface_category",
    "cohort_size",
    "window_days",
    "freq_p10",
    "freq_p50",
    "freq_p90",
    "freq_p99",
    "engagement_p10",
    "engagement_p50",
    "engagement_p90",
    "engagement_p99",
    "breadth_p10",
    "breadth_p50",
    "breadth_p90",
    "breadth_p99",
]

MANAGER_REVIEW_SURFACES = {"CHAT", "AI_ANSWER"}
ENG_ON_CALL_SURFACES = {
    "AGENT",
    "AGENT:AUTONOMOUS",
    "AGENT:WORKFLOW_NAMED",
    "AGENT:EPHEMERAL",
    "GLEANBOT",
    "SUPPORT_NEXT_STEPS",
    "INTERACTIVE_COMPILER",
    "PRISM",
    "AGENT_LIVE_PREVIEW",
}

AGENT_SUB_SURFACES = {
    "agent:autonomous": "autonomous",
    "agent:workflow_named": "workflow_named",
    "agent:ephemeral": "ephemeral",
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


def display_workflow_id(workflow_id: str) -> str:
    if workflow_id.startswith("workflow:"):
        return workflow_id.removeprefix("workflow:")
    return workflow_id


def velocity_match_key(workflow_id: str) -> str:
    return display_workflow_id(workflow_id).strip().upper()


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


def _to_nonnegative_float(row: dict[str, Any], field: str, row_number: int) -> float:
    value = _require(row, field, row_number)
    try:
        parsed = float(value)
    except (TypeError, ValueError) as error:
        raise InputError(f"row {row_number}: {field} must be a number") from error
    if parsed < 0.0:
        raise InputError(f"row {row_number}: {field} must be non-negative")
    return parsed


def read_velocity_rows(path: Path) -> list[dict[str, Any]]:
    raw_rows = read_rows(path)
    return [normalize_velocity_row(row, index) for index, row in enumerate(raw_rows, start=2)]


def normalize_velocity_row(row: dict[str, Any], row_number: int) -> dict[str, Any]:
    for field in VELOCITY_FIELDS:
        _require(row, field, row_number)
    workflow_id = str(row.get("workflow_id", "")).strip()
    if not workflow_id:
        raise InputError(f"row {row_number}: velocity workflow_id must not be blank")
    surface_category = str(row.get("surface_category", "")).strip().lower()
    if surface_category not in {"workflow", "standalone"}:
        raise InputError(f"row {row_number}: surface_category must be workflow or standalone")
    normalized = {
        "workflow_id": workflow_id,
        "display_workflow_id": display_workflow_id(workflow_id),
        "surface_category": surface_category,
        "cohort_size": _to_int(row, "cohort_size", row_number),
        "window_days": _to_int(row, "window_days", row_number),
        "frequency_distribution": {
            "p10": _to_nonnegative_float(row, "freq_p10", row_number),
            "p50": _to_nonnegative_float(row, "freq_p50", row_number),
            "p90": _to_nonnegative_float(row, "freq_p90", row_number),
            "p99": _to_nonnegative_float(row, "freq_p99", row_number),
        },
        "engagement_distribution": {
            "p10": _to_nonnegative_float(row, "engagement_p10", row_number),
            "p50": _to_nonnegative_float(row, "engagement_p50", row_number),
            "p90": _to_nonnegative_float(row, "engagement_p90", row_number),
            "p99": _to_nonnegative_float(row, "engagement_p99", row_number),
        },
        "breadth_distribution": {
            "p10": _to_nonnegative_float(row, "breadth_p10", row_number),
            "p50": _to_nonnegative_float(row, "breadth_p50", row_number),
            "p90": _to_nonnegative_float(row, "breadth_p90", row_number),
            "p99": _to_nonnegative_float(row, "breadth_p99", row_number),
        },
    }
    for name in ["frequency_distribution", "engagement_distribution", "breadth_distribution"]:
        values = normalized[name]
        if not (values["p10"] <= values["p50"] <= values["p90"] <= values["p99"]):
            raise InputError(f"row {row_number}: {name} percentiles must be ordered")
    if row.get("verification_rate") not in {None, ""}:
        normalized["verification_rate"] = _to_float(row, "verification_rate", row_number)
    return normalized


def load_velocity_baseline() -> dict[str, Any]:
    return json.loads(VELOCITY_BASELINE_PATH.read_text())


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _round(value: float) -> float:
    return round(value, 3)


def evaluate_velocity_row(row: dict[str, Any], baseline: dict[str, Any]) -> dict[str, Any]:
    result = {
        **row,
        "verdict": "SURFACE",
        "suppression_reason": None,
        "frequency_index": None,
        "engagement_index": None,
        "breadth_index": None,
        "velocity_index": None,
    }
    if row["window_days"] < MIN_VELOCITY_WINDOW_DAYS:
        return {**result, "verdict": "SUPPRESS", "suppression_reason": "INSUFFICIENT_TIME"}
    if row["cohort_size"] < MIN_VELOCITY_COHORT_SIZE:
        return {**result, "verdict": "SUPPRESS", "suppression_reason": "INSUFFICIENT_VOLUME"}

    frequency_index = _round(_clamp(row["frequency_distribution"]["p50"] / baseline["frequency_p50"], 0.0, 1.5))
    engagement_index = _round(_clamp(row["engagement_distribution"]["p50"] / baseline["engagement_p50"], 0.0, 1.5))
    breadth_index = _round(_clamp(row["breadth_distribution"]["p50"] / baseline["breadth_p50"], 0.0, 1.5))
    velocity_index = _round((frequency_index + engagement_index + breadth_index) / 3)
    return {
        **result,
        "frequency_index": frequency_index,
        "engagement_index": engagement_index,
        "breadth_index": breadth_index,
        "velocity_index": velocity_index,
    }


def velocity_distribution_payloads(row: dict[str, Any], baseline: dict[str, Any]) -> list[dict[str, Any]]:
    window_end = datetime.now(timezone.utc)
    window_start = window_end - timedelta(days=row["window_days"])
    base = {
        "schema_version": "FT_V2_2026_05",
        "workflow_id": row["workflow_id"],
        "window_start": window_start.isoformat().replace("+00:00", "Z"),
        "window_end": window_end.isoformat().replace("+00:00", "Z"),
        "cohort_size": row["cohort_size"],
        "calibration_reference": baseline["calibration_id"],
        "privacy": {"person_level_fields_included": False},
    }
    return [
        {**base, "event_name": "USER_FREQUENCY_OBSERVED", "distribution": row["frequency_distribution"]},
        {**base, "event_name": "USER_ENGAGEMENT_OBSERVED", "distribution": row["engagement_distribution"]},
        {**base, "event_name": "USER_BREADTH_OBSERVED", "distribution": row["breadth_distribution"]},
    ]


def api_json(
    backend_url: str,
    method: str,
    path: str,
    body: dict[str, Any] | None = None,
) -> dict[str, Any]:
    url = f"{backend_url.rstrip('/')}{path}"
    headers = {
        "Content-Type": "application/json",
        "x-role": "ADMIN",
        "x-org-id": os.environ.get("ORG_ID", "org-dogfood-synthetic"),
        "x-schema-version": "0.1",
    }
    data = json.dumps(body).encode("utf-8") if body is not None else None
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8")
        raise RuntimeError(f"{method} {path} failed with HTTP {error.code}: {detail}") from error


def api_velocity_context(
    row: dict[str, Any],
    baseline: dict[str, Any],
    backend_url: str,
) -> dict[str, Any]:
    for payload in velocity_distribution_payloads(row, baseline):
        api_json(backend_url, "POST", "/api/v2/ingest/velocity-distribution", payload)
    encoded = urllib.parse.urlencode(
        {"workflow_id": row["workflow_id"], "window_days": row["window_days"]}
    )
    velocity_response = api_json(backend_url, "GET", f"/api/v2/velocity-index?{encoded}")
    return {
        **row,
        "verdict": velocity_response.get("verdict", "SUPPRESS"),
        "suppression_reason": velocity_response.get("suppression_reason"),
        "frequency_index": velocity_response.get("frequency_index"),
        "engagement_index": velocity_response.get("engagement_index"),
        "breadth_index": velocity_response.get("breadth_index"),
        "velocity_index": velocity_response.get("velocity_index"),
    }


def api_quality_multiplier(
    workflow_id: str,
    window_days: int,
    backend_url: str,
) -> float | None:
    encoded = urllib.parse.urlencode(
        {"workflow_id": workflow_id, "window_days": window_days, "include_velocity": "true"}
    )
    response = api_json(backend_url, "GET", f"/api/v1/quality-multiplier?{encoded}")
    if response.get("verdict") == "SURFACE" and isinstance(response.get("multiplier"), (int, float)):
        return float(response["multiplier"])
    return None


def velocity_adjusted_multiplier(base_multiplier: float | None, velocity: dict[str, Any] | None) -> float | None:
    if base_multiplier is None:
        return None
    if not velocity or velocity.get("verdict") != "SURFACE" or not isinstance(velocity.get("velocity_index"), (int, float)):
        return base_multiplier
    factor = _round(_clamp(float(velocity["velocity_index"]), 0.7, 1.3))
    return _round(_clamp(base_multiplier * factor, 0.5, 1.5))


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


def fixture_cohort_size(row: dict[str, Any], configured_cohort_size: int) -> int:
    if row["real_cohort_size"] < MIN_CANONICAL_COHORT_SIZE:
        return row["real_cohort_size"]
    return configured_cohort_size


def generate_fixture(row: dict[str, Any], output_dir: Path, cohort_size: int) -> Path:
    fixture_path = output_dir / f"{surface_filename(row['workflow_id']).removesuffix('.md')}.json"
    generated_cohort_size = fixture_cohort_size(row, cohort_size)
    run_command(
        [
            sys.executable,
            str(GENERATOR),
            "--workflow-family",
            workflow_family_for(row["workflow_id"]),
            "--cohort-size",
            str(generated_cohort_size),
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
        "verification_rate": row["verification_rate"],
        "verification_rate_source": row.get("verification_rate_source", "surface_input"),
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
    return {
        **row,
        **parsed,
        "surface_category": "workflow",
        "velocity_index": None,
        "velocity_adjusted_multiplier": None,
        "synthetic_cohort_size": fixture_cohort_size(row, cohort_size),
        "readout_path": str(surface_readout),
    }


def fmt(value: float | None) -> str:
    if value is None:
        return "n/a"
    return f"{value:.3f}".rstrip("0").rstrip(".")


def fmt_percent(value: float) -> str:
    return f"{value:.1f}".rstrip("0").rstrip(".")


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


def weighted_by_category(rows: list[dict[str, Any]], metric: str) -> dict[str, float | None]:
    return {
        category: weighted([row for row in rows if row.get("surface_category") == category], metric)
        for category in ["workflow", "standalone"]
    }


def agent_sub_surface_key(workflow_id: str) -> str | None:
    return AGENT_SUB_SURFACES.get(workflow_id.strip().lower())


def agent_sub_surface_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [row for row in rows if agent_sub_surface_key(row["workflow_id"])]


def merge_velocity_context(
    results: list[dict[str, Any]],
    velocity_rows: list[dict[str, Any]],
    output_dir: Path,
    backend_url: str | None = None,
) -> list[dict[str, Any]]:
    baseline = load_velocity_baseline()
    velocity_results = [
        api_velocity_context(row, baseline, backend_url)
        if backend_url
        else evaluate_velocity_row(row, baseline)
        for row in velocity_rows
    ]
    by_key = {velocity_match_key(row["workflow_id"]): row for row in velocity_results}
    merged: list[dict[str, Any]] = []
    seen: set[str] = set()
    for row in results:
        velocity = by_key.get(velocity_match_key(row["workflow_id"]))
        seen.add(velocity_match_key(row["workflow_id"]))
        adjusted_multiplier = velocity_adjusted_multiplier(row.get("quality_multiplier"), velocity)
        if backend_url and velocity:
            api_multiplier = api_quality_multiplier(
                velocity["workflow_id"],
                velocity["window_days"],
                backend_url,
            )
            adjusted_multiplier = api_multiplier if api_multiplier is not None else adjusted_multiplier
        merged.append(
            {
                **row,
                "surface_category": velocity["surface_category"] if velocity else "workflow",
                "velocity_index": velocity["velocity_index"] if velocity else None,
                "velocity_suppression_reason": velocity["suppression_reason"] if velocity else None,
                "velocity_adjusted_multiplier": adjusted_multiplier,
            }
        )

    for velocity in velocity_results:
        key = velocity_match_key(velocity["workflow_id"])
        if key in seen:
            continue
        surface_readout = output_dir / surface_filename(velocity["display_workflow_id"])
        text = "\n".join(
            [
                "# FluencyTracr Velocity Dogfood Readout",
                "",
                f"Surface: {velocity['display_workflow_id']}",
                f"Surface category: {velocity['surface_category']}",
                f"Velocity verdict: {velocity['verdict']}",
                f"Velocity suppression reason: {velocity['suppression_reason'] or 'none'}",
                f"Velocity index: {velocity['velocity_index']}",
                f"Frequency index: {velocity['frequency_index']}",
                f"Engagement index: {velocity['engagement_index']}",
                f"Breadth index: {velocity['breadth_index']}",
                "",
            ]
        )
        surface_readout.write_text(text)
        merged.append(
            {
                "workflow_id": velocity["display_workflow_id"],
                "row_type": "velocity_only",
                "real_cohort_size": velocity["cohort_size"],
                "distinct_users": velocity["cohort_size"],
                "window_days": velocity["window_days"],
                "completion_rate": None,
                "error_rate": None,
                "abandonment_rate": None,
                "recovery_rate": None,
                "verification_rate": None,
                "p50_latency_ms": None,
                "p95_latency_ms": None,
                "verdict": velocity["verdict"],
                "suppression_reason": velocity["suppression_reason"],
                "value_type": None,
                "evidence_grade": None,
                "reliability_factor": None,
                "quality_multiplier": None,
                "canonical_event_count": None,
                "surface_category": velocity["surface_category"],
                "velocity_index": velocity["velocity_index"],
                "velocity_suppression_reason": velocity["suppression_reason"],
                "velocity_adjusted_multiplier": None,
                "synthetic_cohort_size": None,
                "readout_path": str(surface_readout),
            }
        )
    return merged


def apply_velocity_overrides(
    row: dict[str, Any],
    velocity_by_key: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    velocity = velocity_by_key.get(velocity_match_key(row["workflow_id"]))
    if not velocity or not isinstance(velocity.get("verification_rate"), float):
        return {**row, "verification_rate_source": "surface_input"}
    return {
        **row,
        "verification_rate": velocity["verification_rate"],
        "verification_rate_source": "velocity_input",
    }


def render_readout(
    *,
    results: list[dict[str, Any]],
    skipped: list[dict[str, Any]],
    cohort_size: int,
    velocity_enabled: bool = False,
) -> str:
    weighted_reliability = weighted(results, "reliability_factor")
    weighted_quality = weighted(results, "quality_multiplier")
    weighted_velocity_quality = weighted(results, "velocity_adjusted_multiplier") if velocity_enabled else None
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
    if velocity_enabled:
        lines.append(f"Weighted Velocity-Adjusted Quality Multiplier: {fmt(weighted_velocity_quality)}")
        category_weights = weighted_by_category(results, "velocity_adjusted_multiplier")
        lines.extend(
            [
                "",
                "## By Surface Category",
                "",
                "| surface_category | SURFACE real cohort | velocity-adjusted quality multiplier |",
                "| --- | ---: | ---: |",
            ]
        )
        for category in ["workflow", "standalone"]:
            cohort = sum(
                row["real_cohort_size"]
                for row in results
                if row.get("surface_category") == category
                and row.get("verdict") == "SURFACE"
                and isinstance(row.get("velocity_adjusted_multiplier"), float)
            )
            lines.append(f"| {category} | {cohort} | {fmt(category_weights[category])} |")
    lines.extend(
        [
            "",
            "## Per-surface Results",
            "",
        ]
    )
    if velocity_enabled:
        lines.extend(
            [
                "| workflow_id | surface_category | row type | real cohort | verdict | suppression reason | reliability | quality multiplier | velocity index | velocity-adjusted quality multiplier | AIVM tags |",
                "| --- | --- | --- | ---: | --- | --- | ---: | ---: | ---: | ---: | --- |",
            ]
        )
    else:
        lines.extend(
            [
                "| workflow_id | real cohort | verdict | suppression reason | reliability | quality multiplier | AIVM tags |",
                "| --- | ---: | --- | --- | ---: | ---: | --- |",
            ]
        )
    for row in results:
        tags = (
            f"{row['value_type']} / {row['evidence_grade']}"
            if row.get("value_type") and row.get("evidence_grade")
            else "n/a"
        )
        suppression_reason = row["suppression_reason"] or "none"
        if velocity_enabled:
            lines.append(
                f"| {row['workflow_id']} | {row.get('surface_category', 'workflow')} | "
                f"{row.get('row_type', 'surface')} | {row['real_cohort_size']} | "
                f"{row['verdict']} | {suppression_reason} | {fmt(row['reliability_factor'])} | "
                f"{fmt(row['quality_multiplier'])} | {fmt(row.get('velocity_index'))} | "
                f"{fmt(row.get('velocity_adjusted_multiplier'))} | {tags} |"
            )
        else:
            lines.append(
                f"| {row['workflow_id']} | {row['real_cohort_size']} | {row['verdict']} | {suppression_reason} | "
                f"{fmt(row['reliability_factor'])} | {fmt(row['quality_multiplier'])} | {tags} |"
            )
    if not results:
        lines.append("| none | 0 | n/a | n/a | n/a | n/a | n/a |")

    agent_rows = agent_sub_surface_rows(results)
    if agent_rows:
        total_agent_volume = sum(row["real_cohort_size"] for row in agent_rows)
        legacy_metric = "velocity_adjusted_multiplier" if velocity_enabled else "quality_multiplier"
        lines.extend(
            [
                "",
                "## AGENT sub-surface composition",
                "",
                f"Legacy AGENT derived cohort: {total_agent_volume}",
                f"Legacy AGENT derived velocity-adjusted Quality Multiplier: {fmt(weighted(agent_rows, legacy_metric))}",
                "",
                "| sub-surface | runs | AGENT mix | velocity_adjusted_QM |",
                "| --- | ---: | ---: | ---: |",
            ]
        )
        by_sub_surface = {agent_sub_surface_key(row["workflow_id"]): row for row in agent_rows}
        for sub_surface in ["autonomous", "workflow_named", "ephemeral"]:
            row = by_sub_surface.get(sub_surface)
            runs = row["real_cohort_size"] if row else 0
            mix = (runs / total_agent_volume * 100) if total_agent_volume else 0.0
            metric_value = row.get(legacy_metric) if row else None
            lines.append(f"| {sub_surface} | {runs} | {fmt_percent(mix)}% | {fmt(metric_value)} |")

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
            f"Rates come from customer-supplied BigQuery aggregate rows. When velocity input includes joined verification_rate, that aggregate verification rate overrides the base surface row so verification signals enrich the parent surface without becoming standalone surfaces. The CSV/JSON files are a replaceable developer adapter boundary, not a production data architecture. The driver expands each included surface into synthetic GCE-shaped workflow runs so the V1 dogfood ingest path can evaluate the same aggregate behavior without using real customer data or row-level records. Surfaces use the configured synthetic cohort size of {cohort_size}, except real cohorts below 5 preserve the real cohort count so canonical volume suppression applies.",
            "Weighted rollups use real_cohort_size from the input rows and include SURFACE rows only. Each surface is evaluated independently before any read-only weighted summary is computed.",
        ]
    )
    return "\n".join(lines) + "\n"


def run(
    input_path: Path,
    output_dir: Path,
    readout_path: Path,
    cohort_size: int,
    velocity_input: Path | None = None,
    backend_url: str | None = None,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    raw_rows = read_rows(input_path)
    velocity_rows = read_velocity_rows(velocity_input) if velocity_input is not None else []
    velocity_by_key = {velocity_match_key(row["workflow_id"]): row for row in velocity_rows}
    results: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    for index, raw_row in enumerate(raw_rows, start=2):
        row = normalize_row(raw_row, index)
        if row["workflow_id"] == "UNCLASSIFIED":
            skipped.append({**row, "reason": BLANK_WORKFLOW_ID_REASON})
            continue
        row = apply_velocity_overrides(row, velocity_by_key)
        results.append(run_surface(row, output_dir, cohort_size))
    if velocity_input is not None:
        results = merge_velocity_context(
            results,
            velocity_rows,
            output_dir,
            backend_url,
        )

    readout_path.parent.mkdir(parents=True, exist_ok=True)
    readout_path.write_text(
        render_readout(
            results=results,
            skipped=skipped,
            cohort_size=cohort_size,
            velocity_enabled=velocity_input is not None,
        )
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--velocity-input", type=Path)
    parser.add_argument("--backend-url", default=os.environ.get("BACKEND_URL"))
    parser.add_argument("--output-dir", type=Path, default=Path("./dogfood-output/"))
    parser.add_argument("--readout", type=Path, default=Path("./dogfood-output/READOUT.md"))
    parser.add_argument("--cohort-size", type=int, default=1000)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        if args.cohort_size < 5:
            raise InputError("--cohort-size must be at least 5")
        run(
            args.input,
            args.output_dir,
            args.readout,
            args.cohort_size,
            args.velocity_input,
            args.backend_url,
        )
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
