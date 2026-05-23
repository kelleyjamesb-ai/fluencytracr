#!/usr/bin/env python3
"""Validate dogfood-only V4 signal probe exports across fixed windows."""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any


MIN_PROMOTION_WINDOWS = 3
STABILITY_MAX_P50_SPREAD = 1.5
MIN_NONEMPTY_ROWS = 1
MIN_COVERAGE_VALUE = 1.0

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


class InputError(ValueError):
    pass


@dataclass(frozen=True)
class SignalSpec:
    family: str
    signal_name: str
    file_stem: str
    required_columns: tuple[str, ...]
    coverage_columns: tuple[str, ...]
    nonempty_columns: tuple[str, ...]
    velocity_relationship_required: bool = False


SIGNAL_SPECS = [
    SignalSpec(
        family="refinement",
        signal_name="rapid_refinement",
        file_stem="refinement",
        required_columns=(
            "surface_family",
            "workflow_family",
            "refinement_evidence_type",
            "aggregate_join_key_count",
            "observed_event_count",
            "repeated_event_count",
            "p50",
            "p90",
            "p99",
        ),
        coverage_columns=("aggregate_join_key_count", "observed_event_count", "repeated_event_count"),
        nonempty_columns=("observed_event_count", "repeated_event_count"),
    ),
    SignalSpec(
        family="delegation",
        signal_name="delegation_depth",
        file_stem="delegation",
        required_columns=(
            "delegation_bucket",
            "aggregate_user_count",
            "aggregate_bucket_events",
            "aggregate_taxonomy_events",
            "bucket_event_share",
            "p50",
            "p90",
            "p99",
        ),
        coverage_columns=("aggregate_user_count", "aggregate_bucket_events", "aggregate_taxonomy_events"),
        nonempty_columns=("aggregate_bucket_events", "aggregate_taxonomy_events"),
    ),
    SignalSpec(
        family="reuse_propagation",
        signal_name="reusable_workflow_propagation",
        file_stem="reuse_propagation",
        required_columns=(
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
        ),
        coverage_columns=("workflow_count", "run_count", "summed_workflow_adopters"),
        nonempty_columns=("workflow_count", "run_count", "summed_workflow_adopters"),
    ),
    SignalSpec(
        family="velocity_depth",
        signal_name="velocity_depth_zone",
        file_stem="velocity_depth",
        required_columns=(
            "zone",
            "cohort_size",
            "velocity_p50",
            "depth_p50",
            "velocity_relationship",
            "p50",
            "p90",
            "p99",
        ),
        coverage_columns=("cohort_size",),
        nonempty_columns=("cohort_size",),
        velocity_relationship_required=True,
    ),
]


def normalize_header(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")


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


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise InputError(f"{path.name}: CSV input must include a header row")
        return list(reader.fieldnames), [dict(row) for row in reader]


def window_number(path: Path, file_stem: str) -> int:
    match = re.fullmatch(rf"v4_{re.escape(file_stem)}_window_(\d+)\.csv", path.name)
    if not match:
        raise InputError(f"unexpected V4 signal validation filename: {path.name}")
    return int(match.group(1))


def percentile_value(row: dict[str, str], percentile: str) -> float | None:
    candidates = [percentile, f"adopter_count_{percentile}"]
    for candidate in candidates:
        value = parse_float(row.get(candidate))
        if value is not None:
            return value
    return None


def summarize_distribution(rows: list[dict[str, str]]) -> dict[str, dict[str, float | None]]:
    summary: dict[str, dict[str, float | None]] = {}
    for percentile in ["p10", "p50", "p90", "p99"]:
        values = [
            value
            for value in (percentile_value(row, percentile) for row in rows)
            if value is not None
        ]
        summary[percentile] = {
            "min": round(min(values), 6) if values else None,
            "max": round(max(values), 6) if values else None,
            "mean": mean(values),
        }
    return summary


def coverage_summary(spec: SignalSpec, rows: list[dict[str, str]]) -> dict[str, float | None]:
    coverage: dict[str, float | None] = {}
    for column in spec.coverage_columns:
        values = [value for value in (parse_float(row.get(column)) for row in rows) if value is not None]
        coverage[column] = mean(values)
    return coverage


def total_for_columns(rows: list[dict[str, str]], columns: tuple[str, ...]) -> float:
    total = 0.0
    for row in rows:
        for column in columns:
            value = parse_float(row.get(column))
            if value is not None:
                total += value
    return total


def window_p50_means(windows: list[dict[str, Any]]) -> list[float]:
    values: list[float] = []
    for window in windows:
        p50_values = [
            value
            for value in (percentile_value(row, "p50") for row in window["rows"])
            if value is not None
        ]
        if p50_values:
            values.append(sum(p50_values) / len(p50_values))
    return values


def stable_enough(p50_values: list[float]) -> tuple[bool, str]:
    if len(p50_values) < MIN_PROMOTION_WINDOWS:
        return False, "fewer_than_three_windows"
    minimum = min(p50_values)
    maximum = max(p50_values)
    if minimum <= 0:
        return False, "zero_or_negative_distribution_floor"
    spread = maximum / minimum
    if spread <= STABILITY_MAX_P50_SPREAD:
        return True, "stable"
    return False, "unstable_distribution_shape"


def velocity_relationship_ok(spec: SignalSpec, rows: list[dict[str, str]]) -> bool:
    if not spec.velocity_relationship_required:
        return True
    relationships = {str(row.get("velocity_relationship", "")).strip().lower() for row in rows}
    return bool(relationships - {"", "usage_proxy", "pure_usage_proxy", "velocity_only"})


def evaluate_signal(input_dir: Path, spec: SignalSpec) -> dict[str, Any]:
    files = sorted(input_dir.glob(f"v4_{spec.file_stem}_window_*.csv"))
    windows: list[dict[str, Any]] = []
    missing_columns: set[str] = set()
    forbidden_fields: set[str] = set()
    all_rows: list[dict[str, str]] = []

    for path in files:
        headers, rows = read_csv(path)
        normalized_headers = {normalize_header(header): header for header in headers}
        missing_columns.update(
            column for column in spec.required_columns if column not in normalized_headers
        )
        forbidden_fields.update(
            header for header in normalized_headers if header in FORBIDDEN_FIELDS
        )
        windows.append(
            {
                "window": window_number(path, spec.file_stem),
                "path": path.name,
                "row_count": len(rows),
                "rows": rows,
            }
        )
        all_rows.extend(rows)

    windows_present = len(windows)
    row_count = len(all_rows)
    nonempty_total = total_for_columns(all_rows, spec.nonempty_columns)
    coverage = coverage_summary(spec, all_rows)
    distribution = summarize_distribution(all_rows)
    p50_values = window_p50_means(windows)
    is_stable, stability_reason = stable_enough(p50_values)
    has_required_windows = windows_present >= MIN_PROMOTION_WINDOWS
    non_empty = row_count >= MIN_NONEMPTY_ROWS and nonempty_total > 0
    coverage_values = [value for value in coverage.values() if value is not None]
    coverage_sufficient = bool(coverage_values) and max(coverage_values) >= MIN_COVERAGE_VALUE
    adds_beyond_velocity = velocity_relationship_ok(spec, all_rows)

    decision = "HOLD"
    confidence = "low"
    primary_reason = "research evidence incomplete"
    required_followup = "Run three comparable windows and complete manual governance review."
    destination = "Research Only"

    if windows_present == 0:
        primary_reason = "no exports found for this signal family"
        required_followup = "Export three comparable aggregate windows before promotion review."
    elif forbidden_fields:
        decision = "REJECT"
        confidence = "high"
        primary_reason = "forbidden person-level fields present"
        required_followup = "Remove unsafe fields and regenerate aggregate-only exports."
        destination = "Reject"
    elif missing_columns:
        decision = "REJECT"
        confidence = "high"
        primary_reason = "missing required columns"
        required_followup = "Regenerate exports with the required aggregate columns."
        destination = "Reject"
    elif row_count == 0:
        decision = "REJECT"
        confidence = "medium"
        primary_reason = "mostly missing or empty signal export"
        required_followup = "Regenerate non-empty aggregate exports before review."
        destination = "Reject"
    elif not adds_beyond_velocity:
        decision = "REJECT"
        confidence = "medium"
        primary_reason = "pure usage proxy without interpretation beyond Velocity"
        required_followup = "Document a Velocity relationship that preserves independent dimensions."
        destination = "Reject"
    elif not has_required_windows:
        primary_reason = "fewer than three comparable windows"
    elif not is_stable:
        primary_reason = stability_reason
        required_followup = "Investigate window comparability, taxonomy drift, or instrumentation drift."
    elif not non_empty:
        primary_reason = "signal is empty across available windows"
        required_followup = "Hold until non-empty aggregate signal evidence exists."
    elif not coverage_sufficient:
        primary_reason = "coverage too sparse"
        required_followup = "Improve mapping or transformer coverage before promotion."
    else:
        decision = "PROMOTE"
        confidence = "medium"
        primary_reason = "stable aggregate dogfood evidence across three windows"
        required_followup = "Manual promotion meeting and later productization PR if approved."
        destination = destination_for(spec.signal_name)

    return {
        "signal_name": spec.signal_name,
        "family": spec.family,
        "decision": decision,
        "confidence": confidence,
        "primary_reason": primary_reason,
        "product_destination": destination,
        "required_followup": required_followup,
        "windows_present": windows_present,
        "window_files": [window["path"] for window in windows],
        "row_count": row_count,
        "missing_columns": sorted(missing_columns),
        "forbidden_fields": sorted(forbidden_fields),
        "distribution_summary": distribution,
        "coverage_summary": coverage,
        "stability": {
            "classification": "stable" if is_stable else "inconclusive_or_unstable",
            "reason": stability_reason,
            "p50_window_values": [round(value, 6) for value in p50_values],
        },
        "non_empty": non_empty,
        "coverage_sufficient": coverage_sufficient,
        "adds_interpretation_beyond_velocity": adds_beyond_velocity,
        "evidence_summary": evidence_summary(
            windows_present=windows_present,
            row_count=row_count,
            is_stable=is_stable,
            non_empty=non_empty,
            coverage_sufficient=coverage_sufficient,
        ),
    }


def destination_for(signal_name: str) -> str:
    if signal_name in {"rapid_refinement", "reusable_workflow_propagation"}:
        return "Research Only"
    if signal_name == "delegation_depth":
        return "Scale Readiness Portfolio"
    if signal_name == "velocity_depth_zone":
        return "V4 Depth Contract"
    return "Research Only"


def evidence_summary(
    *,
    windows_present: int,
    row_count: int,
    is_stable: bool,
    non_empty: bool,
    coverage_sufficient: bool,
) -> str:
    parts = [
        f"{windows_present} window(s)",
        f"{row_count} aggregate row(s)",
        "stable p50 shape" if is_stable else "stability not proven",
        "non-empty" if non_empty else "empty",
        "coverage present" if coverage_sufficient else "coverage sparse",
    ]
    return "; ".join(parts)


def render_readout(signals: dict[str, dict[str, Any]], status: str) -> str:
    lines = [
        "# V4 Signal Validation Readout",
        "",
        "This is dogfood validation only.",
        "",
        f"Run Date: {date.today().isoformat()}",
        f"Status: {status}",
        "",
        "## Signal Promotion Table",
        "",
        "| signal_name | decision | confidence | evidence_summary | primary_reason | product_destination | required_followup |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ]
    for signal in signals.values():
        lines.append(
            "| {signal_name} | {decision} | {confidence} | {evidence_summary} | "
            "{primary_reason} | {product_destination} | {required_followup} |".format(**signal)
        )
    lines.extend(
        [
            "",
            "## Governance Notes",
            "",
            "- Aggregate-only output.",
            "- No user IDs, emails, names, raw prompts, raw outputs, transcripts, or raw event rows are emitted.",
            "- No canonical events, suppression reasons, tunable thresholds, admin overrides, APIs, schemas, migrations, or frontend surfaces are added.",
            "- No individual scoring, team ranking, maturity scoring, productivity scoring, ROI, causal, or prediction claims are made.",
            "",
            "## Stability Notes",
            "",
        ]
    )
    for signal in signals.values():
        stability = signal["stability"]
        lines.append(
            "- {signal_name}: {classification} ({reason}); p50 windows={values}".format(
                signal_name=signal["signal_name"],
                classification=stability["classification"],
                reason=stability["reason"],
                values=stability["p50_window_values"],
            )
        )
    return "\n".join(lines) + "\n"


def run(input_dir: Path, output_dir: Path) -> dict[str, Any]:
    if not input_dir.exists():
        raise InputError(f"input directory not found: {input_dir}")
    output_dir.mkdir(parents=True, exist_ok=True)
    evaluated = {spec.signal_name: evaluate_signal(input_dir, spec) for spec in SIGNAL_SPECS}
    has_failure = any(
        signal["forbidden_fields"] or signal["missing_columns"] for signal in evaluated.values()
    )
    status = "FAIL" if has_failure else "PASS"
    summary = {
        "status": status,
        "governance": {
            "person_level_fields_present": any(
                bool(signal["forbidden_fields"]) for signal in evaluated.values()
            ),
            "output_is_aggregate_only": True,
            "dogfood_only": True,
            "no_product_api_or_schema_changes": True,
            "no_scoring_ranking_roi_causality_or_prediction": True,
        },
        "constants": {
            "minimum_promotion_windows": MIN_PROMOTION_WINDOWS,
            "stability_max_p50_spread": STABILITY_MAX_P50_SPREAD,
        },
        "signals": evaluated,
    }
    (output_dir / "validation_summary.json").write_text(
        json.dumps(summary, indent=2, sort_keys=True) + "\n"
    )
    (output_dir / "VALIDATION_READOUT.md").write_text(render_readout(evaluated, status))
    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        summary = run(args.input_dir, args.output_dir)
    except (InputError, OSError, csv.Error) as error:
        print(f"Invalid input: {error}", file=sys.stderr)
        return 1

    failures: list[str] = []
    for signal in summary["signals"].values():
        if signal["forbidden_fields"]:
            failures.append(f"{signal['signal_name']}: forbidden person-level fields")
        if signal["missing_columns"]:
            failures.append(f"{signal['signal_name']}: missing required columns")
    if failures:
        print("; ".join(failures), file=sys.stderr)
        return 1

    print(f"Wrote V4 signal validation output to {args.output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
