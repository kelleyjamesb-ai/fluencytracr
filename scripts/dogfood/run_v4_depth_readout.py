#!/usr/bin/env python3
"""Compose dogfood-only V4 Velocity and Depth aggregate readouts."""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any


READOUT_FILENAME = "V4_DEPTH_READOUT.md"
SUMMARY_FILENAME = "v4_depth_summary.json"
BY_SURFACE_FILENAME = "v4_depth_by_surface.csv"

REQUIRED_FAMILIES = ("velocity", "delegation", "refinement")
OPTIONAL_FAMILIES = ("reuse_propagation",)
REQUIRED_FILES = [
    f"v4_{family}_window_{window}.csv"
    for family in REQUIRED_FAMILIES
    for window in range(1, 4)
]
OPTIONAL_FILES = [
    f"v4_{family}_window_{window}.csv"
    for family in OPTIONAL_FAMILIES
    for window in range(1, 4)
]

REQUIRED_COLUMNS = {
    "velocity": {
        "workflow_id",
        "surface_category",
        "cohort_size",
        "window_days",
        "surface_interaction_count",
        "freq_p50",
        "engagement_p50",
        "breadth_p50",
    },
    "delegation": {
        "delegation_bucket",
        "aggregate_user_count",
        "aggregate_bucket_events",
        "aggregate_taxonomy_events",
        "bucket_event_share",
        "p50",
        "p90",
        "p99",
    },
    "refinement": {
        "surface_family",
        "workflow_family",
        "refinement_evidence_type",
        "aggregate_join_key_count",
        "observed_event_count",
        "repeated_event_count",
        "p50",
        "p90",
        "p99",
    },
    "reuse_propagation": {
        "population",
        "adopter_bucket",
        "workflow_count",
        "run_count",
        "summed_workflow_adopters",
        "workflow_share",
        "run_share",
        "adopter_count_p50",
        "adopter_count_p90",
        "adopter_count_p99",
    },
}

FORBIDDEN_FIELDS = {
    "user_id",
    "userid",
    "user_email",
    "email",
    "name",
    "employee_id",
    "manager_id",
    "department_id",
    "team_id",
    "raw_prompt",
    "prompt",
    "raw_output",
    "output",
    "transcript",
    "raw_transcript",
    "raw_event",
    "raw_events",
    "raw_event_row",
    "raw_event_rows",
    "event_row",
    "event_rows",
}
FORBIDDEN_FIELD_TOKENS = {
    "email",
    "name",
    "prompt",
    "output",
    "transcript",
}
FORBIDDEN_FIELD_SUFFIXES = (
    "_id",
    "_ids",
    "_email",
    "_emails",
    "_name",
    "_names",
    "_prompt",
    "_prompts",
    "_output",
    "_outputs",
    "_transcript",
    "_transcripts",
)
AGGREGATE_SAFE_IDENTIFIER_HEADERS = {
    "workflow_id",
    "surface_id",
    "surface_category",
    "workflow_family",
    "surface_family",
    "delegation_bucket",
    "adopter_bucket",
    "population",
}

OUTPUT_COLUMNS = [
    "surface_id",
    "surface_category",
    "cohort_size",
    "velocity_index",
    "depth_index",
    "delegation_depth_index",
    "refinement_depth_index",
    "zone",
    "evidence_status",
]

ALLOWED_ZONES = [
    "OPERATING_LEVERAGE_CANDIDATE",
    "FRAGILE_SCALE_CANDIDATE",
    "FOCUSED_DEPTH_CANDIDATE",
    "THIN_USE_CANDIDATE",
    "INSUFFICIENT_EVIDENCE",
    "SUPPRESSED",
]

# Dogfood-only readout heuristics. These are compiled constants for local
# validation and must not be treated as production thresholds.
MIN_COHORT_SIZE = 5
HIGH_VELOCITY_INDEX = 0.70
HIGH_DEPTH_INDEX = 0.60
VELOCITY_BASELINE = {
    "freq_p50": 71.0,
    "engagement_p50": 61.0,
    "breadth_p50": 7.0,
}
DELEGATION_SHARE_REFERENCE = 0.20
EXPECTED_WINDOW_COUNT = 3


class InputError(ValueError):
    pass


@dataclass
class CsvInput:
    path: Path
    family: str
    headers: list[str]
    rows: list[dict[str, str]]


def normalize_header(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")


def is_forbidden_header(header: str) -> bool:
    normalized = normalize_header(header)
    if normalized in AGGREGATE_SAFE_IDENTIFIER_HEADERS:
        return False
    tokens = set(normalized.split("_"))
    return (
        normalized in FORBIDDEN_FIELDS
        or normalized.endswith(FORBIDDEN_FIELD_SUFFIXES)
        or bool(tokens & FORBIDDEN_FIELD_TOKENS)
    )


def parse_float(value: Any) -> float | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def mean(values: list[float]) -> float | None:
    if not values:
        return None
    return round(sum(values) / len(values), 6)


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def family_from_file(path: Path) -> str | None:
    match = re.fullmatch(r"v4_(.+)_window_\d+\.csv", path.name)
    return match.group(1) if match else None


def read_csv(path: Path, family: str) -> CsvInput:
    with path.open(newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise InputError(f"{path.name}: CSV input must include a header row")
        rows = [
            {
                normalize_header(key): value
                for key, value in row.items()
                if key is not None
            }
            for row in reader
        ]
        return CsvInput(path=path, family=family, headers=list(reader.fieldnames), rows=rows)


def load_inputs(input_dir: Path) -> tuple[list[CsvInput], list[str], list[str], bool]:
    if not input_dir.exists():
        raise InputError(f"input directory not found: {input_dir}")
    found = {path.name: path for path in input_dir.glob("*.csv")}
    missing_required = [name for name in REQUIRED_FILES if name not in found]
    csv_inputs: list[CsvInput] = []
    missing_columns: set[str] = set()
    forbidden_present = False
    for name, path in sorted(found.items()):
        family = family_from_file(path)
        if family not in REQUIRED_COLUMNS:
            continue
        csv_input = read_csv(path, family)
        normalized_headers = {normalize_header(header) for header in csv_input.headers}
        forbidden_present = forbidden_present or any(
            is_forbidden_header(header) for header in csv_input.headers
        )
        missing_columns.update(
            f"{name}:{column}"
            for column in REQUIRED_COLUMNS[family]
            if column not in normalized_headers
        )
        csv_inputs.append(csv_input)
    return csv_inputs, missing_required, sorted(missing_columns), forbidden_present


def velocity_index(row: dict[str, str]) -> float | None:
    values = []
    for column, baseline in VELOCITY_BASELINE.items():
        value = parse_float(row.get(column))
        if value is None:
            return None
        values.append(clamp(value / baseline))
    return round(sum(values) / len(values), 6)


def aggregate_velocity(inputs: list[CsvInput]) -> dict[str, dict[str, Any]]:
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for csv_input in inputs:
        if csv_input.family != "velocity":
            continue
        for row in csv_input.rows:
            workflow_id = str(row.get("workflow_id", "")).strip()
            if workflow_id:
                grouped[workflow_id].append(row)

    result: dict[str, dict[str, Any]] = {}
    for surface_id, rows in grouped.items():
        raw_indexes = [velocity_index(row) for row in rows]
        raw_cohorts = [parse_float(row.get("cohort_size")) for row in rows]
        has_complete_windows = len(rows) == EXPECTED_WINDOW_COUNT
        has_complete_velocity = has_complete_windows and all(value is not None for value in raw_indexes)
        has_complete_cohort = has_complete_windows and all(value is not None for value in raw_cohorts)
        indexes = [value for value in raw_indexes if value is not None]
        cohorts = [value for value in raw_cohorts if value is not None]
        interactions = [
            value for value in (parse_float(row.get("surface_interaction_count")) for row in rows) if value is not None
        ]
        result[surface_id] = {
            "surface_category": rows[0].get("surface_category", "unknown"),
            "velocity_index": mean(indexes) if has_complete_velocity else None,
            "cohort_size": mean(cohorts) if has_complete_cohort else None,
            "minimum_cohort_size": min(cohorts) if has_complete_cohort else None,
            "surface_interaction_count": mean(interactions),
            "window_count": len(rows),
        }
    return result


def aggregate_refinement(inputs: list[CsvInput]) -> dict[str, dict[str, Any]]:
    observed: dict[str, float] = defaultdict(float)
    repeated: dict[str, float] = defaultdict(float)
    for csv_input in inputs:
        if csv_input.family != "refinement":
            continue
        for row in csv_input.rows:
            surface_id = str(row.get("workflow_family", "")).strip()
            if not surface_id:
                continue
            observed[surface_id] += parse_float(row.get("observed_event_count")) or 0.0
            repeated[surface_id] += parse_float(row.get("repeated_event_count")) or 0.0
    result: dict[str, dict[str, Any]] = {}
    for surface_id, observed_count in observed.items():
        rate = (repeated[surface_id] / observed_count) if observed_count else None
        result[surface_id] = {
            "refinement_depth_index": round(clamp(rate or 0.0), 6) if rate is not None else None,
            "observed_event_count": round(observed_count, 6),
            "repeated_event_count": round(repeated[surface_id], 6),
        }
    return result


def aggregate_delegation(inputs: list[CsvInput]) -> dict[str, dict[str, Any]]:
    by_surface: dict[str, list[float]] = defaultdict(list)
    aggregate_values: list[float] = []
    for csv_input in inputs:
        if csv_input.family != "delegation":
            continue
        for row in csv_input.rows:
            share = parse_float(row.get("bucket_event_share"))
            if share is None:
                continue
            component = clamp(share / DELEGATION_SHARE_REFERENCE)
            surface_id = str(row.get("workflow_id", "")).strip()
            if surface_id:
                by_surface[surface_id].append(component)
            else:
                aggregate_values.append(component)
    aggregate_component = mean(aggregate_values)
    result: dict[str, dict[str, Any]] = {}
    for surface_id, values in by_surface.items():
        result[surface_id] = {
            "delegation_depth_index": mean(values),
            "delegation_source": "surface",
        }
    if aggregate_component is not None:
        result["__aggregate__"] = {
            "delegation_depth_index": aggregate_component,
            "delegation_source": "aggregate",
        }
    return result


def aggregate_reuse_status(inputs: list[CsvInput]) -> dict[str, Any]:
    rows = [row for csv_input in inputs if csv_input.family == "reuse_propagation" for row in csv_input.rows]
    return {
        "decision": "HOLD",
        "used_as_depth_driver": False,
        "rows_present": len(rows),
        "status": "present_but_held" if rows else "not_present",
        "reason": "Reusable Workflow Propagation and Named Workflow Leverage remain HOLD pending metadata observability.",
    }


def depth_index(
    refinement: dict[str, Any] | None,
    delegation: dict[str, Any] | None,
) -> float | None:
    values = []
    if refinement and refinement.get("refinement_depth_index") is not None:
        values.append(float(refinement["refinement_depth_index"]))
    if delegation and delegation.get("delegation_depth_index") is not None:
        values.append(float(delegation["delegation_depth_index"]))
    return mean(values)


def classify_zone(row: dict[str, Any]) -> str:
    if row["minimum_cohort_size"] is None or row["minimum_cohort_size"] < MIN_COHORT_SIZE:
        return "SUPPRESSED"
    if row["velocity_index"] is None or row["depth_index"] is None:
        return "INSUFFICIENT_EVIDENCE"
    high_velocity = row["velocity_index"] >= HIGH_VELOCITY_INDEX
    high_depth = row["depth_index"] >= HIGH_DEPTH_INDEX
    if high_velocity and high_depth:
        return "OPERATING_LEVERAGE_CANDIDATE"
    if high_velocity and not high_depth:
        return "FRAGILE_SCALE_CANDIDATE"
    if not high_velocity and high_depth:
        return "FOCUSED_DEPTH_CANDIDATE"
    return "THIN_USE_CANDIDATE"


def build_surface_rows(inputs: list[CsvInput]) -> list[dict[str, Any]]:
    velocity = aggregate_velocity(inputs)
    refinement = aggregate_refinement(inputs)
    delegation = aggregate_delegation(inputs)
    rows: list[dict[str, Any]] = []
    for surface_id in sorted(velocity):
        velocity_row = velocity[surface_id]
        refinement_row = refinement.get(surface_id)
        delegation_row = delegation.get(surface_id)
        combined_depth = depth_index(refinement_row, delegation_row)
        row = {
            "surface_id": surface_id,
            "surface_category": velocity_row["surface_category"],
            "cohort_size": velocity_row["cohort_size"],
            "minimum_cohort_size": velocity_row["minimum_cohort_size"],
            "velocity_index": velocity_row["velocity_index"],
            "depth_index": combined_depth,
            "delegation_depth_index": delegation_row.get("delegation_depth_index") if delegation_row else None,
            "refinement_depth_index": refinement_row.get("refinement_depth_index") if refinement_row else None,
            "delegation_source": delegation_row.get("delegation_source") if delegation_row else "missing",
        }
        row["zone"] = classify_zone(row)
        row["evidence_status"] = (
            "suppressed_for_sparse_cohort"
            if row["zone"] == "SUPPRESSED"
            else "missing_depth_evidence"
            if row["zone"] == "INSUFFICIENT_EVIDENCE"
            else "zone_candidate"
        )
        rows.append(row)
    return rows


def zone_counts(rows: list[dict[str, Any]]) -> dict[str, int]:
    counts = {zone: 0 for zone in ALLOWED_ZONES}
    for row in rows:
        counts[row["zone"]] += 1
    return counts


def write_by_surface(path: Path, rows: list[dict[str, Any]]) -> None:
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=OUTPUT_COLUMNS)
        writer.writeheader()
        for row in rows:
            writer.writerow({column: row.get(column) for column in OUTPUT_COLUMNS})


def render_readout(summary: dict[str, Any], rows: list[dict[str, Any]]) -> str:
    lines = [
        "# V4 Depth Readout",
        "",
        "## Executive Summary",
        "",
        f"Run Date: {date.today().isoformat()}",
        f"Status: {summary['status']}",
        "",
        "This readout is dogfood-only.",
        "Constants are dogfood-only readout heuristics, not production thresholds.",
        "",
        "## Inputs Found",
        "",
    ]
    lines.extend(f"- {name}" for name in summary["inputs_found"]) if summary["inputs_found"] else lines.append("- none")
    lines.extend(["", "## Inputs Missing", ""])
    lines.extend(f"- {name}" for name in summary["inputs_missing"]) if summary["inputs_missing"] else lines.append("- none")
    lines.extend(
        [
            "",
            "## Velocity Summary",
            "",
            f"- Surfaces evaluated: {len(rows)}",
            f"- High velocity heuristic: velocity_index >= {HIGH_VELOCITY_INDEX}",
            "",
            "## Delegation Depth Summary",
            "",
            "- Delegation depth uses surface-level exports when a `workflow_id` column is present.",
            "- Bucket-only delegation exports are treated as aggregate context and reported as an evidence gap for per-surface attribution.",
            "",
            "## Refinement Depth Summary",
            "",
            "- Refinement depth uses repeated-event share by workflow or surface family.",
            "",
            "## Velocity × Depth Zone Summary",
            "",
        ]
    )
    for zone, count in summary["zone_counts"].items():
        lines.append(f"- {zone}: {count}")
    lines.extend(
        [
            "",
            "## Surfaces by Zone",
            "",
            "| surface_id | velocity_index | depth_index | zone |",
            "| --- | ---: | ---: | --- |",
        ]
    )
    for row in rows:
        lines.append(
            f"| {row['surface_id']} | {row['velocity_index']} | {row['depth_index']} | {row['zone']} |"
        )
    lines.extend(
        [
            "",
            "## Evidence Gaps",
            "",
        ]
    )
    if summary["evidence_gaps"]:
        lines.extend(f"- {gap}" for gap in summary["evidence_gaps"])
    else:
        lines.append("- none")
    lines.extend(
        [
            "",
            "## Reusable Workflow Propagation Status",
            "",
            "- Reusable Workflow Propagation and Named Workflow Leverage remain HOLD pending metadata observability.",
            f"- Optional reuse rows present: {summary['reusable_workflow_propagation']['rows_present']}",
            "- Reusable propagation is not used as a depth score driver in this readout.",
            "",
            "## Governance Caveats",
            "",
            "- This readout does not calculate ROI.",
            "- This readout does not prove productivity lift.",
            "- This readout does not rank teams, people, managers, or departments.",
            "- This readout does not productize V4.",
            "- V4 economic readouts remain blocked until Depth readout stability is demonstrated across windows or cohorts.",
            "",
            "## Recommended Next Build",
            "",
            "- Improve per-surface Delegation Depth exports so delegation evidence can be attributed without bucket-level overclaiming.",
            "- Validate zone stability across fixed windows before any V4 economic contract work.",
            "",
            "## Non-Capabilities",
            "",
            "- No product API, schema, Prisma migration, frontend surface, backend service, or customer-facing V4 economic readout is added.",
            "- No new canonical events, suppression reasons, tunable thresholds, or admin overrides are added.",
            "- No individual scoring, team ranking, maturity scoring, productivity scoring, ROI calculation, causal claim, or prediction claim is added.",
        ]
    )
    return "\n".join(lines) + "\n"


def run(input_dir: Path, output_dir: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    output_dir.mkdir(parents=True, exist_ok=True)
    csv_inputs, missing_required, missing_columns, forbidden_present = load_inputs(input_dir)
    rows = [] if (missing_required or missing_columns or forbidden_present) else build_surface_rows(csv_inputs)
    reuse_status = aggregate_reuse_status(csv_inputs)
    evidence_gaps = []
    if "__aggregate__" in aggregate_delegation(csv_inputs):
        evidence_gaps.append("Delegation export is bucket-level for one or more surfaces.")
    if any(row["zone"] == "INSUFFICIENT_EVIDENCE" for row in rows):
        evidence_gaps.append("One or more velocity surfaces lack matching depth evidence.")
    if missing_required:
        evidence_gaps.append("One or more required fixed-window exports are missing.")
    if missing_columns:
        evidence_gaps.append("One or more exports are missing required aggregate columns.")
    if forbidden_present:
        evidence_gaps.append("One or more exports contain forbidden person-level fields.")

    status = "FAIL" if (missing_required or missing_columns or forbidden_present) else "PASS"
    summary = {
        "status": status,
        "inputs_found": sorted(csv_input.path.name for csv_input in csv_inputs),
        "inputs_missing": missing_required,
        "missing_required_column_count": len(missing_columns),
        "governance": {
            "dogfood_only": True,
            "person_level_fields_present": forbidden_present,
            "output_is_aggregate_only": True,
            "no_product_api_or_schema_changes": True,
            "no_scoring_ranking_roi_causality_or_prediction": True,
        },
        "constants": {
            "label": "dogfood-only readout heuristics, not production thresholds",
            "minimum_cohort_size": MIN_COHORT_SIZE,
            "high_velocity_index": HIGH_VELOCITY_INDEX,
            "high_depth_index": HIGH_DEPTH_INDEX,
        },
        "zone_counts": zone_counts(rows),
        "reusable_workflow_propagation": reuse_status,
        "evidence_gaps": evidence_gaps,
    }
    (output_dir / SUMMARY_FILENAME).write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n")
    write_by_surface(output_dir / BY_SURFACE_FILENAME, rows)
    (output_dir / READOUT_FILENAME).write_text(render_readout(summary, rows))
    return summary, rows


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        summary, _rows = run(args.input_dir, args.output_dir)
    except (InputError, OSError, csv.Error) as error:
        print(f"Invalid input: {error}", file=sys.stderr)
        return 1
    failures = []
    if summary["governance"]["person_level_fields_present"]:
        failures.append("forbidden person-level fields")
    if summary["inputs_missing"]:
        failures.append("missing required files")
    if summary["missing_required_column_count"]:
        failures.append("missing required columns")
    if failures:
        print("; ".join(failures), file=sys.stderr)
        return 1
    print(f"Wrote V4 depth readout output to {args.output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
