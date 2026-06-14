#!/usr/bin/env python3
"""Generate aggregate Trust Evidence Gap Composition readouts."""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path
from typing import Any


SUMMARY_OUTPUT = "trust_evidence_gap_composition_summary.json"
READOUT_OUTPUT = "TRUST_EVIDENCE_GAP_COMPOSITION_READOUT.md"
COMPOSITION_OUTPUT = "trust_evidence_gap_composition_summary.csv"

MIN_AGGREGATE_COMPONENT_COUNT = 5

REQUIRED_COLUMNS = {"gap_component", "episode_count"}

FORBIDDEN_EXACT_HEADERS = {
    "email",
    "employee",
    "employee_id",
    "manager",
    "manager_id",
    "name",
    "person",
    "prompt",
    "output",
    "raw",
    "rank",
    "ranking",
    "score",
    "team",
    "transcript",
    "user",
    "user_id",
}

FORBIDDEN_FIELD_TOKENS = {
    "email",
    "employee",
    "manager",
    "name",
    "person",
    "prompt",
    "output",
    "raw",
    "rank",
    "ranking",
    "score",
    "team",
    "transcript",
    "user",
}

COMPONENT_LABELS = {
    "raw_gap_insufficient_downstream_evidence": "True downstream-evidence gap",
    "verification_or_feedback_without_observed_resolution": "Verification signal without observed resolution",
    "ai_activity_without_terminal_outcome": "AI activity without terminal outcome",
    "span_or_llm_activity_without_governed_outcome": "Span or LLM activity without governed outcome",
    "skill_or_agent_activity_without_downstream_outcome": "Skill or agent activity without downstream outcome",
    "weak_parent_linkage": "Weak parent linkage",
    "ambiguous_boundary_folded": "Ambiguous boundary fold-in",
    "small_cell_withheld": "Small-cell safety fold-in",
    "other_evidence_gap": "Other aggregate evidence gap",
}

COMPONENT_ORDER = [
    "raw_gap_insufficient_downstream_evidence",
    "verification_or_feedback_without_observed_resolution",
    "ai_activity_without_terminal_outcome",
    "span_or_llm_activity_without_governed_outcome",
    "skill_or_agent_activity_without_downstream_outcome",
    "weak_parent_linkage",
    "ambiguous_boundary_folded",
    "small_cell_withheld",
    "other_evidence_gap",
]


class InputError(Exception):
    """Raised when the aggregate composition CSV is unsafe or malformed."""


def normalize_header(header: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", header.strip().lower()).strip("_")


def header_tokens(header: str) -> set[str]:
    return {token for token in normalize_header(header).split("_") if token}


def is_forbidden_header(header: str) -> bool:
    normalized = normalize_header(header)
    if normalized in FORBIDDEN_EXACT_HEADERS:
        return True
    return bool(header_tokens(header) & FORBIDDEN_FIELD_TOKENS)


def parse_count(value: object, label: str) -> int:
    try:
        count = int(str(value).strip())
    except (TypeError, ValueError) as exc:
        raise InputError(f"{label} episode_count must be a non-negative integer") from exc
    if count < 0:
        raise InputError(f"{label} episode_count must be a non-negative integer")
    return count


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    try:
        with path.open(newline="") as handle:
            reader = csv.DictReader(handle)
            headers = list(reader.fieldnames or [])
            rows = list(reader)
    except FileNotFoundError as exc:
        raise InputError("input CSV does not exist") from exc
    if not headers:
        raise InputError("input CSV must include a header row")
    if not rows:
        raise InputError("input CSV must include at least one aggregate row")
    return headers, rows


def aggregate_components(headers: list[str], rows: list[dict[str, str]]) -> dict[str, Any]:
    normalized_headers = {normalize_header(header) for header in headers}
    missing = sorted(REQUIRED_COLUMNS - normalized_headers)
    if missing:
        raise InputError(f"missing required columns: {', '.join(missing)}")

    if any(is_forbidden_header(header) for header in headers):
        raise InputError("forbidden person-level fields are present")

    counts = {component: 0 for component in COMPONENT_ORDER}
    caveats = {component: set() for component in COMPONENT_ORDER}
    unknown_count = 0
    for row in rows:
        component = str(row.get("gap_component", "")).strip()
        if component not in COMPONENT_LABELS:
            unknown_count += 1
            continue
        count = parse_count(row.get("episode_count"), COMPONENT_LABELS[component])
        counts[component] += count
        coverage_caveat = str(row.get("coverage_caveat", "")).strip()
        if coverage_caveat:
            caveats[component].add(coverage_caveat)

    if unknown_count:
        raise InputError("unknown Trust Evidence Gap Composition component")

    total = sum(counts.values())
    if total <= 0:
        raise InputError("input CSV must contain at least one aggregate gap episode")

    return {
        "counts": counts,
        "coverage_caveats": {
            component: sorted(component_caveats)
            for component, component_caveats in caveats.items()
            if component_caveats
        },
        "total": total,
    }


def format_count(count: int) -> str:
    return f"{count:,}"


def format_share(numerator: int, denominator: int) -> str:
    if denominator <= 0:
        return "0.0%"
    return f"{(numerator / denominator) * 100:.1f}%"


def build_summary(
    *,
    customer_label: str,
    window_label: str,
    total: int,
    counts: dict[str, int],
    coverage_caveats: dict[str, list[str]],
    pilot_total_episodes: int | None,
) -> dict[str, Any]:
    components: dict[str, dict[str, Any]] = {}
    for component in COMPONENT_ORDER:
        count = counts[component]
        withheld = 0 < count < MIN_AGGREGATE_COMPONENT_COUNT
        components[component] = {
            "label": COMPONENT_LABELS[component],
            "episode_count": None if withheld else count,
            "share": None if withheld else round(count / total, 6),
            "withheld_below_floor": withheld,
            "coverage_caveats": coverage_caveats.get(component, []),
        }

    return {
        "status": "RESEARCH_CONTEXT_ONLY",
        "customer_label": customer_label,
        "window_label": window_label,
        "total_gap_episode_count": total,
        "pilot_total_episode_count": pilot_total_episodes,
        "gap_share_of_pilot": (
            round(total / pilot_total_episodes, 6)
            if pilot_total_episodes and pilot_total_episodes > 0
            else None
        ),
        "components": components,
        "small_cell_policy": {
            "minimum_aggregate_component_count": MIN_AGGREGATE_COMPONENT_COUNT,
            "emits_sub_floor_component_values": False,
            "caveat": (
                "Sub-floor composition cells are reported as present but their exact "
                "episode counts are withheld."
            ),
        },
        "governance": {
            "output_is_aggregate_only": True,
            "adds_runtime_api": False,
            "adds_canonical_events": False,
            "adds_suppression_reasons": False,
            "calculates_roi": False,
            "establishes_causality": False,
            "identifies_or_scores_employees": False,
            "ranks_teams_or_managers": False,
        },
    }


def visible_component_rows(summary: dict[str, Any]) -> list[tuple[str, dict[str, Any]]]:
    rows = []
    for component in COMPONENT_ORDER:
        detail = summary["components"][component]
        if detail["episode_count"] or detail["withheld_below_floor"]:
            rows.append((component, detail))
    return rows


def build_csv_rows(summary: dict[str, Any]) -> list[dict[str, str]]:
    rows = []
    total = int(summary["total_gap_episode_count"])
    for _, detail in visible_component_rows(summary):
        count = detail["episode_count"]
        rows.append(
            {
                "component_label": detail["label"],
                "episode_count": "WITHHELD" if detail["withheld_below_floor"] else str(count),
                "episode_share_of_gap": (
                    "WITHHELD" if detail["withheld_below_floor"] else f"{count / total:.6f}"
                ),
                "caveat": "; ".join(detail["coverage_caveats"]),
            }
        )
    return rows


def build_readout(summary: dict[str, Any]) -> str:
    total = int(summary["total_gap_episode_count"])
    pilot_total = summary.get("pilot_total_episode_count")
    total_line = f"The public evidence gap is {format_count(total)} aggregate episodes"
    if pilot_total:
        total_line += f" ({format_share(total, int(pilot_total))} of the pilot episode total)"
    total_line += "."

    lines = [
        "# Trust Evidence Gap Composition Readout",
        "",
        "Status: `RESEARCH_CONTEXT_ONLY`",
        "",
        f"Scope: {summary['customer_label']}",
        "",
        f"Window: {summary['window_label']}",
        "",
        total_line,
        "",
        "This readout decomposes the aggregate evidence-gap bucket. It does not call a backend API, persist customer telemetry, or inspect raw event rows.",
        "",
        "## What The Gap Is Comprised Of",
        "",
    ]

    for _, detail in visible_component_rows(summary):
        if detail["withheld_below_floor"]:
            value = "present below the aggregate safety floor; exact count withheld"
        else:
            value = f"{format_count(int(detail['episode_count']))} aggregate episodes"
        lines.append(f"- {detail['label']}: {value}.")

    lines.extend(
        [
            "",
            "## Interpretation",
            "",
            "The largest visible component is the true downstream-evidence gap: episodes exist, but the aggregate record does not yet show enough downstream behavior to interpret whether AI-assisted work resolved, recovered, stalled, or was verified.",
            "",
            "The ambiguous boundary fold-in captures rows where the pattern shape looked interpretable, but trace, run, session, or action keys could overlap. Those rows stay in evidence-gap language until the boundary is safer.",
            "",
            "The small-cell safety fold-in preserves aggregate safety: rare composition cells can be acknowledged as present below the aggregate safety floor without publishing exact values.",
            "",
            "## What This Does Not Mean",
            "",
            "- This is not a trust score.",
            "- This is not a correctness detector.",
            "- It does not identify, score, rank, or evaluate employees.",
            "- It does not calculate ROI.",
            "- It does not establish causality.",
            "- It does not add canonical events.",
            "- It does not add suppression reasons.",
            "- It does not rank teams or managers.",
            "",
            "## Recommended Next Diagnostic",
            "",
            "Run the BigQuery gap-composition diagnostic against customer-approved aggregate exports to split the true downstream-evidence gap into source-readiness buckets such as verification-only episodes, AI activity without terminal outcome, span/LLM activity without governed outcome, skill or agent activity without downstream outcome, and weak parent linkage.",
            "",
        ]
    )
    return "\n".join(lines)


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


def write_outputs(
    output_dir: Path,
    summary: dict[str, Any],
    readout: str | None = None,
    rows: list[dict[str, str]] | None = None,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / SUMMARY_OUTPUT).write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n")
    if readout is None or rows is None:
        (output_dir / READOUT_OUTPUT).unlink(missing_ok=True)
        (output_dir / COMPOSITION_OUTPUT).unlink(missing_ok=True)
        return

    (output_dir / READOUT_OUTPUT).write_text(readout)
    with (output_dir / COMPOSITION_OUTPUT).open("w", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["component_label", "episode_count", "episode_share_of_gap", "caveat"],
            lineterminator="\n",
        )
        writer.writeheader()
        writer.writerows(rows)


def positive_int(value: str) -> int:
    try:
        parsed = int(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("must be an integer") from exc
    if parsed <= 0:
        raise argparse.ArgumentTypeError("must be positive")
    return parsed


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-csv", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--customer-label", required=True)
    parser.add_argument("--window-label", required=True)
    parser.add_argument("--pilot-total-episodes", type=positive_int)
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    try:
        headers, rows = read_csv(args.input_csv)
        aggregate = aggregate_components(headers, rows)
        summary = build_summary(
            customer_label=args.customer_label,
            window_label=args.window_label,
            total=aggregate["total"],
            counts=aggregate["counts"],
            coverage_caveats=aggregate["coverage_caveats"],
            pilot_total_episodes=args.pilot_total_episodes,
        )
        write_outputs(args.output_dir, summary, build_readout(summary), build_csv_rows(summary))
    except InputError as exc:
        write_outputs(args.output_dir, invalid_summary(str(exc)))
        print(str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
