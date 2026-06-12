#!/usr/bin/env python3
"""Run the Glean dogfood BigQuery adapter in dry-run or fixture mode."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.connectors.glean_dogfood_bq.adapter import (  # noqa: E402
    MAX_BYTES_SCANNED,
    build_union_query,
    enforce_cost_guard,
    load_fixture_rows,
    rows_to_v3_payloads,
    validate_query_partition_guard,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Read-only Glean dogfood BigQuery aggregate ingest adapter.")
    parser.add_argument("--start-date", required=True, help="Inclusive shard date, YYYY-MM-DD.")
    parser.add_argument("--end-date", required=True, help="Inclusive shard date, YYYY-MM-DD.")
    parser.add_argument(
        "--tables",
        default="scrubbed_llm_call,scrubbed_client_analytics,scrubbed_workflows",
        help="Comma-separated table keys to include.",
    )
    parser.add_argument("--fixture-dir", type=Path, help="Synthetic fixture directory. Skips BigQuery when provided.")
    parser.add_argument("--output-dir", type=Path, default=Path("out/glean-dogfood-bq"))
    parser.add_argument("--cohort-id", default="glean-dogfood")
    parser.add_argument("--calibration-id", default="scio-prod-60d-2026-05")
    parser.add_argument("--dry-run", default="true", choices=["true", "false"])
    parser.add_argument("--allow-large-scan", action="store_true")
    return parser.parse_args()


def _tables(raw: str) -> list[str]:
    return [part.strip() for part in raw.split(",") if part.strip()]


def _run_bq_dry_run(query: str) -> int:
    completed = subprocess.run(
        [
            "bq",
            "query",
            "--use_legacy_sql=false",
            "--dry_run",
            "--format=json",
            query,
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    output = (completed.stdout or completed.stderr or "").strip()
    try:
        parsed = json.loads(output)
    except json.JSONDecodeError:
        match = __import__("re").search(r"([0-9,]+) bytes", output)
        return int(match.group(1).replace(",", "")) if match else 0
    if isinstance(parsed, dict):
        stats = parsed.get("statistics", {})
        return int(stats.get("totalBytesProcessed") or stats.get("totalBytesBilled") or 0)
    return 0


def _run_bq_query(query: str) -> list[dict[str, Any]]:
    completed = subprocess.run(
        ["bq", "query", "--use_legacy_sql=false", "--format=json", query],
        check=True,
        capture_output=True,
        text=True,
    )
    parsed = json.loads(completed.stdout or "[]")
    if not isinstance(parsed, list):
        raise ValueError("BigQuery query did not return a JSON row list")
    return parsed


def _write_payloads(payloads: list[dict[str, Any]], report: dict[str, Any], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for index, payload in enumerate(payloads, start=1):
        workflow_id = payload["workflow_id"].replace(":", "_")
        path = output_dir / f"{index:02d}-{workflow_id}.json"
        path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    (output_dir / "run-report.json").write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")


def main() -> int:
    args = parse_args()
    tables = _tables(args.tables)
    query = build_union_query(tables, start_date=args.start_date, end_date=args.end_date)
    validate_query_partition_guard(query)

    if args.fixture_dir:
        rows = load_fixture_rows(args.fixture_dir)
        dry_run = True
        estimated_bytes = 0
    else:
        estimated_bytes = _run_bq_dry_run(query)
        enforce_cost_guard(estimated_bytes, allow_large_scan=args.allow_large_scan)
        dry_run = args.dry_run == "true"
        rows = [] if dry_run else _run_bq_query(query)

    payloads: list[dict[str, Any]] = []
    report: dict[str, Any] = {
        "dry_run": dry_run,
        "tables": tables,
        "start_date": args.start_date,
        "end_date": args.end_date,
        "estimated_bytes_scanned": estimated_bytes,
        "max_bytes_scanned": MAX_BYTES_SCANNED,
        "actual_bytes_billed": None,
        "payloads_emitted": 0,
        "suppressed_slices": [],
    }

    if rows:
        payloads, connector_report = rows_to_v3_payloads(
            rows,
            cohort_id=args.cohort_id,
            calibration_id=args.calibration_id,
            window_start=f"{args.start_date}T00:00:00Z",
            window_end=f"{args.end_date}T00:00:00Z",
        )
        report = {**report, **connector_report}

    _write_payloads(payloads, report, args.output_dir)
    print(json.dumps({
        "status": "PASS",
        "dry_run": dry_run,
        "payloads_written": len(payloads),
        "report": str(args.output_dir / "run-report.json"),
        "estimated_bytes_scanned": estimated_bytes,
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
