#!/usr/bin/env python3
"""Generate deterministic mocked Glean GCE workflow fixtures."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


ALLOWED_WORKFLOWS = ("manager-review-writer", "eng-on-call-triage")
SCHEMA_VERSION = "GCE_MOCK_2026_05"
DEFAULT_ANCHOR = datetime(2026, 5, 22, tzinfo=timezone.utc)


def _bounded_rate(value: float) -> float:
    if value < 0 or value > 1:
        raise ValueError("rates must be between 0.0 and 1.0")
    return value


def _iso(at: datetime) -> str:
    return at.isoformat().replace("+00:00", "Z")


def _flag(index: int, cohort_size: int, rate: float) -> bool:
    return index < round(cohort_size * rate)


def build_fixture(
    *,
    workflow_family: str,
    cohort_size: int,
    abandonment_rate: float,
    recovery_rate: float,
    verification_rate: float,
    friction_rate: float = 0.1,
    days: int = 60,
    start_offset_days: int = 0,
    run_prefix: str = "run",
    change_event: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if workflow_family not in ALLOWED_WORKFLOWS:
        raise ValueError(f"workflow_family must be one of: {', '.join(ALLOWED_WORKFLOWS)}")
    if cohort_size < 0:
        raise ValueError("cohort_size must be non-negative")

    abandonment_rate = _bounded_rate(abandonment_rate)
    recovery_rate = _bounded_rate(recovery_rate)
    verification_rate = _bounded_rate(verification_rate)
    friction_rate = _bounded_rate(friction_rate)

    events: list[dict[str, Any]] = []
    start = DEFAULT_ANCHOR - timedelta(days=days + start_offset_days)
    spacing_hours = max(1, int((days * 24) / max(1, cohort_size)))

    for index in range(cohort_size):
        abandoned = _flag(index, cohort_size, abandonment_rate)
        recovered = _flag(index, cohort_size, recovery_rate)
        verified = _flag(index, cohort_size, verification_rate)
        friction = _flag(index, cohort_size, friction_rate)
        at = start + timedelta(hours=index * spacing_hours)

        events.append(
            {
                "schema_version": SCHEMA_VERSION,
                "source_type": "workflow_run",
                "event_name": "gce.workflow_run.completed",
                "event_timestamp": _iso(at),
                "org_id": "org-dogfood-synthetic",
                "workflow_family": workflow_family,
                "workflow_id": f"gce:{workflow_family}",
                "workflow_run_id": f"{run_prefix}-{workflow_family}-{index + 1:04d}",
                "join_keys": {
                    "workflow_run_id": f"{run_prefix}-{workflow_family}-{index + 1:04d}"
                },
                "signals": {
                    "abandonment_present": abandoned,
                    "recovery_present": recovered and not abandoned,
                    "verification_present": verified and not abandoned,
                    "friction_loop_present": friction,
                    "latency_ms": 120_000 if friction else 45_000,
                },
                "privacy": {
                    "raw_content_included": False,
                    "person_level_fields_included": False,
                },
            }
        )

    return {
        "schema_version": SCHEMA_VERSION,
        "generated_at": _iso(DEFAULT_ANCHOR),
        "fixture_kind": "mock_glean_gce",
        "workflow_family": workflow_family,
        "days": days,
        "parameters": {
            "cohort_size": cohort_size,
            "abandonment_rate": abandonment_rate,
            "recovery_rate": recovery_rate,
            "verification_rate": verification_rate,
            "friction_rate": friction_rate,
        },
        "change_event": change_event,
        "events": events,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workflow-family", choices=ALLOWED_WORKFLOWS, default="manager-review-writer")
    parser.add_argument("--cohort-size", type=int, required=True)
    parser.add_argument("--abandonment-rate", type=float, required=True)
    parser.add_argument("--recovery-rate", type=float, required=True)
    parser.add_argument("--verification-rate", type=float, required=True)
    parser.add_argument("--friction-rate", type=float, default=0.1)
    parser.add_argument("--output", type=Path, required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    fixture = build_fixture(
        workflow_family=args.workflow_family,
        cohort_size=args.cohort_size,
        abandonment_rate=args.abandonment_rate,
        recovery_rate=args.recovery_rate,
        verification_rate=args.verification_rate,
        friction_rate=args.friction_rate,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(fixture, indent=2, sort_keys=True) + "\n")
    print(f"Wrote {len(fixture['events'])} mocked GCE events to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
