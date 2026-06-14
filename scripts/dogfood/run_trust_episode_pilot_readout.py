#!/usr/bin/env python3
"""Compose an aggregate Trust Episode Boundary pilot readout from CSV export."""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any


SUMMARY_OUTPUT = "trust_episode_pilot_summary.json"
READOUT_OUTPUT = "TRUST_EPISODE_PILOT_EXECUTIVE_READOUT.md"
PATTERN_OUTPUT = "trust_episode_pilot_pattern_summary.csv"
MIN_AGGREGATE_PATTERN_COUNT = 5
SMALL_CELL_CAVEAT = (
    "Rare pattern cells below the aggregate safety floor are withheld from "
    "pattern rows and carried into evidence-gap caveat language."
)
SOURCE_COVERAGE_CAVEAT = (
    "Rows with incomplete, ambiguous, or undocumented source coverage are "
    "withheld from pattern rows and carried into evidence-gap caveat language."
)
ADEQUATE_PATTERN_BOUNDARY_LAYERS = {
    "immediate_episode",
    "same_session_continuation",
}
AMBIGUOUS_COVERAGE_TOKENS = (
    "ambiguous",
    "candidate",
    "incomplete",
    "insufficient",
    "may overlap",
    "not documented",
    "overlap",
    "partial",
    "unknown",
)

REQUIRED_COLUMNS = {
    "episode_pattern",
    "episode_count",
}

PATTERN_LABELS = {
    "resolved_with_confidence": "Work resolved with corroboration",
    "resolved_without_verification_signal": "Work resolved without explicit verification",
    "recovered_after_failure": "Work recovered after friction",
    "stalled_after_ai_assist": "Work stalled after AI assistance",
    "explicit_negative_feedback": "Explicit negative feedback appeared",
    "evidence_gap": "Evidence gap remains",
}

PATTERN_ORDER = tuple(PATTERN_LABELS)

FORBIDDEN_FIELDS = {
    "user_id",
    "userid",
    "username",
    "user_name",
    "user_email",
    "email",
    "name",
    "full_name",
    "display_name",
    "screen_name",
    "first_name",
    "last_name",
    "given_name",
    "family_name",
    "employee_id",
    "employee_name",
    "manager_id",
    "manager_name",
    "department_id",
    "team_id",
    "person_id",
    "person_name",
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
    "trust_score",
    "productivity_score",
    "rank",
    "ranking",
}

FORBIDDEN_FIELD_TOKENS = {
    "email",
    "employee",
    "manager",
    "name",
    "names",
    "person",
    "prompt",
    "output",
    "transcript",
    "score",
    "rank",
    "ranking",
    "raw",
    "user",
    "users",
    "username",
}

FORBIDDEN_FIELD_SUFFIXES = (
    "_user",
    "_users",
    "_email",
    "_emails",
    "_employee",
    "_employees",
    "_manager",
    "_managers",
    "_name",
    "_names",
    "_person",
    "_people",
    "_prompt",
    "_prompts",
    "_output",
    "_outputs",
    "_transcript",
    "_transcripts",
    "_score",
    "_scores",
    "_rank",
    "_ranks",
)


class InputError(ValueError):
    pass


@dataclass(frozen=True)
class CsvInput:
    headers: list[str]
    rows: list[dict[str, str]]


@dataclass(frozen=True)
class AggregateResult:
    counts: dict[str, int]
    gap_composition: dict[str, int]


def normalize_header(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")


def is_forbidden_header(header: str) -> bool:
    normalized = normalize_header(header)
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


def parse_count(value: Any, label: str) -> int:
    parsed = parse_float(value)
    if parsed is None:
        raise InputError(f"{label}: episode_count must be numeric")
    if parsed < 0 or int(parsed) != parsed:
        raise InputError(f"{label}: episode_count must be a non-negative integer")
    return int(parsed)


def parse_optional_positive_int(value: Any, label: str) -> int | None:
    parsed = parse_float(value)
    if parsed is None:
        return None
    if parsed <= 0 or int(parsed) != parsed:
        raise InputError(f"{label} must be a positive integer")
    return int(parsed)


def parse_optional_share(value: Any, label: str) -> float | None:
    parsed = parse_float(value)
    if parsed is None:
        return None
    if parsed < 0 or parsed > 1:
        raise InputError(f"{label} must be between 0 and 1")
    return parsed


def read_csv(path: Path) -> CsvInput:
    if not path.exists():
        raise InputError(f"input CSV not found: {path}")
    with path.open(newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise InputError("input CSV must include a header row")
        headers = list(reader.fieldnames)
        rows = [
            {
                normalize_header(key): value
                for key, value in row.items()
                if key is not None
            }
            for row in reader
        ]
    return CsvInput(headers=headers, rows=rows)


def format_count(value: int) -> str:
    return f"{value:,}"


def format_share(value: float) -> str:
    if 0 < value < 0.001:
        return "<0.1%"
    return f"{value * 100:.1f}%"


def invalid_summary(reason: str) -> dict[str, Any]:
    return {
        "status": "INVALID_INPUT",
        "reason": reason,
        "governance": {
            "output_is_aggregate_only": False,
            "adds_runtime_api": False,
            "adds_canonical_events": False,
            "adds_suppression_reasons": False,
            "calculates_roi": False,
            "establishes_causality": False,
        },
    }


def aggregate_patterns(csv_input: CsvInput) -> AggregateResult:
    normalized_headers = {normalize_header(header) for header in csv_input.headers}
    missing = sorted(REQUIRED_COLUMNS - normalized_headers)
    if missing:
        raise InputError(f"missing required columns: {', '.join(missing)}")

    forbidden = [normalize_header(header) for header in csv_input.headers if is_forbidden_header(header)]
    if forbidden:
        raise InputError("forbidden person-level fields are present")

    counts = {pattern: 0 for pattern in PATTERN_ORDER}
    gap_composition = {
        "raw_gap_insufficient_downstream_evidence": 0,
        "ambiguous_boundary_folded": 0,
        "small_cell_withheld": 0,
    }
    unknown_count = 0
    for row in csv_input.rows:
        pattern = str(row.get("episode_pattern", "")).strip()
        if pattern not in PATTERN_LABELS:
            unknown_count += 1
            continue
        count = parse_count(row.get("episode_count"), PATTERN_LABELS[pattern])
        if pattern == "evidence_gap":
            gap_composition["raw_gap_insufficient_downstream_evidence"] += count
        if has_unsafe_source_coverage(row, pattern):
            gap_composition["ambiguous_boundary_folded"] += count
            counts["evidence_gap"] += count
            continue
        counts[pattern] += count

    if unknown_count:
        raise InputError("unknown Trust Episode Boundary pattern")
    if sum(counts.values()) <= 0:
        raise InputError("input CSV must contain at least one aggregate episode")
    for pattern, count in counts.items():
        if pattern != "evidence_gap" and 0 < count < MIN_AGGREGATE_PATTERN_COUNT:
            gap_composition["small_cell_withheld"] += count
    return AggregateResult(counts=counts, gap_composition=gap_composition)


def has_unsafe_source_coverage(row: dict[str, str], pattern: str) -> bool:
    if pattern == "evidence_gap":
        return False
    boundary_layer = str(row.get("boundary_layer", "")).strip().lower()
    coverage_caveat = str(row.get("coverage_caveat", "")).strip().lower()
    return (
        not boundary_layer
        or boundary_layer not in ADEQUATE_PATTERN_BOUNDARY_LAYERS
        or not coverage_caveat
        or any(token in coverage_caveat for token in AMBIGUOUS_COVERAGE_TOKENS)
    )


def apply_small_cell_safety_floor(counts: dict[str, int]) -> dict[str, int]:
    safe_counts = dict(counts)
    folded_count = 0
    for pattern, count in counts.items():
        if pattern == "evidence_gap" or count == 0 or count >= MIN_AGGREGATE_PATTERN_COUNT:
            continue
        safe_counts[pattern] = 0
        folded_count += count
    if folded_count:
        safe_counts["evidence_gap"] += folded_count
    return safe_counts


def build_summary(
    *,
    customer_label: str,
    window_label: str,
    counts: dict[str, int],
    gap_composition: dict[str, int],
    raw_candidate_key_count: int | None = None,
    high_confidence_coverage_share: float | None = None,
) -> dict[str, Any]:
    counts = apply_small_cell_safety_floor(counts)
    total = sum(counts.values())
    patterns = {
        pattern: {
            "label": PATTERN_LABELS[pattern],
            "episode_count": count,
            "share": round(count / total, 6),
        }
        for pattern, count in counts.items()
    }
    composition = {
        "raw_gap_insufficient_downstream_evidence": {
            "label": "True downstream-evidence gap",
            "episode_count": gap_composition["raw_gap_insufficient_downstream_evidence"],
            "share_of_gap": round(
                gap_composition["raw_gap_insufficient_downstream_evidence"]
                / counts["evidence_gap"],
                6,
            )
            if counts["evidence_gap"]
            else 0,
            "withheld_below_floor": False,
        },
        "ambiguous_boundary_folded": {
            "label": "Ambiguous boundary fold-in",
            "episode_count": gap_composition["ambiguous_boundary_folded"],
            "share_of_gap": round(gap_composition["ambiguous_boundary_folded"] / counts["evidence_gap"], 6)
            if counts["evidence_gap"]
            else 0,
            "withheld_below_floor": False,
        },
        "small_cell_withheld": {
            "label": "Small-cell safety fold-in",
            "episode_count": None
            if 0 < gap_composition["small_cell_withheld"] < MIN_AGGREGATE_PATTERN_COUNT
            else gap_composition["small_cell_withheld"],
            "share_of_gap": None
            if 0 < gap_composition["small_cell_withheld"] < MIN_AGGREGATE_PATTERN_COUNT
            else (
                round(gap_composition["small_cell_withheld"] / counts["evidence_gap"], 6)
                if counts["evidence_gap"]
                else 0
            ),
            "withheld_below_floor": 0
            < gap_composition["small_cell_withheld"]
            < MIN_AGGREGATE_PATTERN_COUNT,
        },
    }
    quality_reliability: dict[str, Any] = {
        "raw_candidate_key_count": raw_candidate_key_count,
        "product_episode_dedup_ratio": round(raw_candidate_key_count / total, 3)
        if raw_candidate_key_count is not None
        else None,
        "high_confidence_coverage_share": high_confidence_coverage_share,
        "interpretable_episode_share": round(1 - (counts["evidence_gap"] / total), 6),
        "boundary_ambiguity_share_of_total": round(
            gap_composition["ambiguous_boundary_folded"] / total,
            6,
        ),
        "evidence_gap_share": round(counts["evidence_gap"] / total, 6),
        "caveat": (
            "Evidence quality describes aggregate measurement readiness only; "
            "it is not output correctness, ROI, causality, or employee fluency."
        ),
    }
    return {
        "status": "EVIDENCE_CONTEXT_ONLY",
        "customer_label": customer_label,
        "window_label": window_label,
        "total_episode_count": total,
        "patterns": patterns,
        "evidence_gap_composition": composition,
        "evidence_quality_reliability": quality_reliability,
        "small_cell_policy": {
            "minimum_aggregate_pattern_count": MIN_AGGREGATE_PATTERN_COUNT,
            "emits_sub_floor_pattern_values": False,
            "folds_sub_floor_pattern_values_into_evidence_gap": True,
            "caveat": SMALL_CELL_CAVEAT,
        },
        "source_coverage_policy": {
            "adequate_pattern_boundary_layers": sorted(ADEQUATE_PATTERN_BOUNDARY_LAYERS),
            "emits_ambiguous_coverage_pattern_values": False,
            "folds_unsafe_coverage_rows_into_evidence_gap": True,
            "caveat": SOURCE_COVERAGE_CAVEAT,
        },
        "governance": {
            "output_is_aggregate_only": True,
            "requires_customer_approved_aggregate_scope": True,
            "adds_runtime_api": False,
            "adds_canonical_events": False,
            "adds_suppression_reasons": False,
            "calculates_roi": False,
            "establishes_causality": False,
            "identifies_or_scores_employees": False,
            "ranks_teams_or_managers": False,
        },
        "required_citations": [
            "docs/contracts/value-confidence/trust-episode-boundary-input.md",
            "docs/research/V4_TRUST_EPISODE_BOUNDARY_VALIDATION_READOUT.md",
            "dogfood-output/trust-episode-boundary/TRUST_EPISODE_BOUNDARY_BIGQUERY_READOUT.md",
            "dogfood-output/trust-episode-boundary/TRUST_PRODUCT_EPISODE_DEDUP_BIGQUERY_READOUT.md",
            "dogfood-output/trust-episode-boundary/TRUST_KEY_CONFIDENCE_BIGQUERY_READOUT.md",
        ],
    }


def pattern_line(pattern: str, count: int, total: int) -> str:
    label = PATTERN_LABELS[pattern]
    share = count / total
    return f"- {label}: {format_count(count)} aggregate episodes ({format_share(share)})."


def visible_patterns(summary: dict[str, Any]) -> list[str]:
    return [
        pattern
        for pattern in PATTERN_ORDER
        if int(summary["patterns"][pattern]["episode_count"]) > 0
    ]


def build_readout(summary: dict[str, Any]) -> str:
    total = int(summary["total_episode_count"])
    counts = {
        pattern: int(summary["patterns"][pattern]["episode_count"])
        for pattern in PATTERN_ORDER
    }
    recovered_share = counts["recovered_after_failure"] / total
    evidence_gap_share = counts["evidence_gap"] / total
    resolved_without_share = counts["resolved_without_verification_signal"] / total
    gap_composition = summary["evidence_gap_composition"]
    evidence_quality = summary["evidence_quality_reliability"]

    lines = [
        "# Trust Episode Boundary Pilot Executive Readout",
        "",
        "Status: `EVIDENCE_CONTEXT_ONLY`",
        "",
        f"Scope: {summary['customer_label']}",
        "",
        f"Window: {summary['window_label']}",
        "",
        "This readout is generated from aggregate BigQuery-exported data. It does not call a backend API, persist customer telemetry, or inspect raw event rows.",
        "",
        "## Executive Interpretation",
        "",
        "FluencyTracr observes aggregate AI work episodes and shows where AI-assisted work resolves, recovers after friction, stalls, or lacks enough evidence for confident interpretation.",
        "",
        "Use this as Trust Calibration context: it helps leaders see where trust loops, source coverage, recovery behavior, or outcome-readiness evidence need improvement.",
        "",
        "This output does not identify, score, rank, or evaluate employees.",
        "",
        "## Aggregate Episode Evidence",
        "",
        f"The export contains {format_count(total)} aggregate AI work episodes.",
        "",
    ]
    lines.extend(pattern_line(pattern, counts[pattern], total) for pattern in visible_patterns(summary))
    lines.extend(
        [
            "",
            SMALL_CELL_CAVEAT,
            "",
            SOURCE_COVERAGE_CAVEAT,
            "",
            "## Trust Calibration Context",
            "",
            f"Work recovered after friction appears in {format_share(recovered_share)} of aggregate episodes. This is evidence that work continued after failure, pause, skip, cancellation, or other friction; it is not proof of output quality.",
            "",
            f"Work resolved without explicit verification appears in {format_share(resolved_without_share)} of aggregate episodes. This can be normal in low-risk work, but it needs workflow-risk and source-coverage context before interpretation.",
            "",
            f"The evidence gap appears in {format_share(evidence_gap_share)} of aggregate episodes. Missing evidence must stay visible and must not be upgraded into healthy trust, poor trust, value, or causality.",
            "",
            "## Evidence Gap Composition",
            "",
            f"True downstream-evidence gap: {format_count(int(gap_composition['raw_gap_insufficient_downstream_evidence']['episode_count']))} aggregate episodes. These episodes exist, but the aggregate record does not show enough downstream behavior to interpret whether AI-assisted work resolved, recovered, stalled, or was verified.",
            "",
            f"Ambiguous boundary fold-in: {format_count(int(gap_composition['ambiguous_boundary_folded']['episode_count']))} aggregate episodes. These rows stay inside evidence-gap language because trace, run, session, or action keys may overlap.",
            "",
            "Small-cell safety fold-in: present below the aggregate safety floor; exact count withheld. Rare cells are acknowledged without publishing exact values.",
            "",
        ]
    )
    if (
        evidence_quality["raw_candidate_key_count"] is not None
        and evidence_quality["high_confidence_coverage_share"] is not None
    ):
        lines.extend(
            [
                "## Evidence Quality And Reliability",
                "",
                f"Product-episode normalization: {format_count(int(evidence_quality['raw_candidate_key_count']))} raw candidate keys were compressed to {format_count(total)} aggregate AI work episodes, preventing a {evidence_quality['product_episode_dedup_ratio']:.1f}x overcount from entering the executive readout.",
                "",
                f"Key-confidence coverage: {format_share(float(evidence_quality['high_confidence_coverage_share']))} of episodes have high-confidence trace, run, or action coverage.",
                "",
                f"Interpretation completeness: {format_share(float(evidence_quality['interpretable_episode_share']))} of episodes have enough aggregate evidence to classify as resolved, resolved without explicit verification, or recovered after friction.",
                "",
                f"Boundary ambiguity: {format_share(float(evidence_quality['boundary_ambiguity_share_of_total']))} of all episodes were folded into evidence-gap language instead of being published as precise stalled values.",
                "",
                evidence_quality["caveat"],
                "",
            ]
        )
    lines.extend(
        [
            "## Source Coverage And Caveats",
            "",
            "- Citation behavior is optional corroboration, not the trust anchor.",
            "- Recovery after friction is a behavioral continuation signal, not a correctness detector.",
            "- Approved aggregate scope, workflow labels, surface labels, and source coverage must be declared by the customer before external interpretation.",
            "- If source coverage is incomplete or ambiguous, do not emit Trust Episode Boundary pattern values; use evidence-gap language only.",
            "",
            "## Required Citations",
            "",
            "- [trust-episode-boundary-input.md](../../docs/contracts/value-confidence/trust-episode-boundary-input.md)",
            "- [V4_TRUST_EPISODE_BOUNDARY_VALIDATION_READOUT.md](../../docs/research/V4_TRUST_EPISODE_BOUNDARY_VALIDATION_READOUT.md)",
            "- [TRUST_EPISODE_BOUNDARY_BIGQUERY_READOUT.md](../trust-episode-boundary/TRUST_EPISODE_BOUNDARY_BIGQUERY_READOUT.md)",
            "- [TRUST_PRODUCT_EPISODE_DEDUP_BIGQUERY_READOUT.md](../trust-episode-boundary/TRUST_PRODUCT_EPISODE_DEDUP_BIGQUERY_READOUT.md)",
            "- [TRUST_KEY_CONFIDENCE_BIGQUERY_READOUT.md](../trust-episode-boundary/TRUST_KEY_CONFIDENCE_BIGQUERY_READOUT.md)",
            "",
            "## Non-Goals",
            "",
            "- This is not a trust score.",
            "- This is not a citation-click metric.",
            "- This is not a correctness detector.",
            "- It does not calculate ROI.",
            "- It does not establish causality.",
            "- It does not add canonical events.",
            "- It does not add suppression reasons.",
            "- It does not rank teams or managers.",
            "- It does not produce person-level productivity metrics.",
        ]
    )
    return "\n".join(lines) + "\n"


def write_pattern_csv(path: Path, summary: dict[str, Any]) -> None:
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "pattern_label",
                "episode_count",
                "episode_share",
            ],
            lineterminator="\n",
        )
        writer.writeheader()
        for pattern in visible_patterns(summary):
            value = summary["patterns"][pattern]
            writer.writerow(
                {
                    "pattern_label": value["label"],
                    "episode_count": value["episode_count"],
                    "episode_share": value["share"],
                }
            )


def write_outputs(output_dir: Path, summary: dict[str, Any], readout: str | None = None) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / SUMMARY_OUTPUT).write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n")
    if readout is not None:
        (output_dir / READOUT_OUTPUT).write_text(readout)
        write_pattern_csv(output_dir / PATTERN_OUTPUT, summary)
    else:
        for stale_output in (READOUT_OUTPUT, PATTERN_OUTPUT):
            (output_dir / stale_output).unlink(missing_ok=True)


def run(args: argparse.Namespace) -> int:
    output_dir = Path(args.output_dir)
    try:
        csv_input = read_csv(Path(args.input_csv))
        aggregate = aggregate_patterns(csv_input)
        summary = build_summary(
            customer_label=args.customer_label,
            window_label=args.window_label,
            counts=aggregate.counts,
            gap_composition=aggregate.gap_composition,
            raw_candidate_key_count=parse_optional_positive_int(
                args.raw_candidate_key_count,
                "--raw-candidate-key-count",
            ),
            high_confidence_coverage_share=parse_optional_share(
                args.high_confidence_coverage_share,
                "--high-confidence-coverage-share",
            ),
        )
        write_outputs(output_dir, summary, build_readout(summary))
        return 0
    except InputError as exc:
        write_outputs(output_dir, invalid_summary(str(exc)))
        print(str(exc), file=sys.stderr)
        return 1


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Generate an executive-safe Trust Episode Boundary pilot readout from aggregate CSV."
    )
    parser.add_argument("--input-csv", required=True, help="Aggregate Trust Episode Boundary CSV export.")
    parser.add_argument("--output-dir", required=True, help="Directory for Markdown, JSON, and CSV outputs.")
    parser.add_argument("--customer-label", default="customer aggregate pilot")
    parser.add_argument("--window-label", default="approved aggregate window")
    parser.add_argument(
        "--raw-candidate-key-count",
        help="Optional aggregate count of pre-dedup candidate keys used to show product-episode normalization.",
    )
    parser.add_argument(
        "--high-confidence-coverage-share",
        help="Optional aggregate share of product episodes with high-confidence trace, run, or action coverage.",
    )
    return parser


def main() -> int:
    return run(build_parser().parse_args())


if __name__ == "__main__":
    raise SystemExit(main())
