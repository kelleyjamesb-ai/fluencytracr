#!/usr/bin/env python3
"""Customer-side GCE aggregate transformer for FluencyTracr V3.

This tool is designed to run in the customer's cloud environment. Raw GCE rows
stay there; only aggregate cohort distributions are written to JSON.
"""

from __future__ import annotations

import argparse
import csv
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


VELOCITY_SQL = """
WITH source AS (
  SELECT
    JSON_VALUE(jsonPayload, '$.actor.user_id') AS user_key,
    COALESCE(
      JSON_VALUE(jsonPayload, '$.workflowrun.feature'),
      JSON_VALUE(jsonPayload, '$.type')
    ) AS workflow_id,
    DATE(timestamp) AS event_day,
    JSON_VALUE(jsonPayload, '$.status') AS status,
    SAFE_CAST(JSON_VALUE(jsonPayload, '$.latency_ms') AS INT64) AS latency_ms,
    SAFE_CAST(JSON_VALUE(jsonPayload, '$.verification_present') AS BOOL) AS verification_present,
    SAFE_CAST(JSON_VALUE(jsonPayload, '$.recovered') AS BOOL) AS recovered
  FROM `{project}.{dataset}.{table}`
  WHERE timestamp >= TIMESTAMP('{window_start}')
    AND timestamp < TIMESTAMP('{window_end}')
    AND JSON_VALUE(jsonPayload, '$.actor.user_id') IS NOT NULL
),
per_user_surface AS (
  SELECT
    workflow_id,
    user_key,
    COUNT(*) AS total_events,
    COUNT(DISTINCT event_day) AS active_days,
    SAFE_DIVIDE(COUNT(*), COUNT(DISTINCT event_day)) AS runs_per_active_day
  FROM source
  WHERE workflow_id IS NOT NULL
  GROUP BY workflow_id, user_key
),
per_user_breadth AS (
  SELECT
    user_key,
    COUNT(DISTINCT workflow_id) AS breadth
  FROM source
  WHERE workflow_id IS NOT NULL
  GROUP BY user_key
),
quality AS (
  SELECT
    workflow_id,
    COUNT(*) AS real_cohort_size,
    COUNT(DISTINCT user_key) AS cohort_size,
    AVG(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completion_rate,
    AVG(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS error_rate,
    AVG(CASE WHEN status = 'abandoned' THEN 1 ELSE 0 END) AS abandonment_rate,
    AVG(CASE WHEN recovered THEN 1 ELSE 0 END) AS recovery_rate,
    AVG(CASE WHEN verification_present THEN 1 ELSE 0 END) AS verification_rate,
    APPROX_QUANTILES(latency_ms, 100)[OFFSET(50)] AS p50_latency_ms,
    APPROX_QUANTILES(latency_ms, 100)[OFFSET(95)] AS p95_latency_ms
  FROM source
  WHERE workflow_id IS NOT NULL
  GROUP BY workflow_id
)
SELECT
  p.workflow_id,
  q.cohort_size,
  q.completion_rate,
  q.error_rate,
  q.abandonment_rate,
  q.recovery_rate,
  q.verification_rate,
  q.p50_latency_ms,
  q.p95_latency_ms,
  APPROX_QUANTILES(p.runs_per_active_day, 100)[OFFSET(10)] AS freq_p10,
  APPROX_QUANTILES(p.runs_per_active_day, 100)[OFFSET(50)] AS freq_p50,
  APPROX_QUANTILES(p.runs_per_active_day, 100)[OFFSET(90)] AS freq_p90,
  APPROX_QUANTILES(p.runs_per_active_day, 100)[OFFSET(99)] AS freq_p99,
  APPROX_QUANTILES(p.active_days, 100)[OFFSET(10)] AS engagement_p10,
  APPROX_QUANTILES(p.active_days, 100)[OFFSET(50)] AS engagement_p50,
  APPROX_QUANTILES(p.active_days, 100)[OFFSET(90)] AS engagement_p90,
  APPROX_QUANTILES(p.active_days, 100)[OFFSET(99)] AS engagement_p99,
  APPROX_QUANTILES(b.breadth, 100)[OFFSET(10)] AS breadth_p10,
  APPROX_QUANTILES(b.breadth, 100)[OFFSET(50)] AS breadth_p50,
  APPROX_QUANTILES(b.breadth, 100)[OFFSET(90)] AS breadth_p90,
  APPROX_QUANTILES(b.breadth, 100)[OFFSET(99)] AS breadth_p99
FROM per_user_surface p
JOIN per_user_breadth b USING (user_key)
JOIN quality q USING (workflow_id)
GROUP BY
  p.workflow_id, q.cohort_size, q.completion_rate, q.error_rate,
  q.abandonment_rate, q.recovery_rate, q.verification_rate,
  q.p50_latency_ms, q.p95_latency_ms
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Transform customer-side GCE into V3 aggregate payloads.")
    parser.add_argument("--project", required=True)
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--table", required=True)
    parser.add_argument("--window-start", required=True)
    parser.add_argument("--window-end", required=True)
    parser.add_argument("--cohort-id", required=True)
    parser.add_argument("--calibration-id", required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--input-csv", type=Path, help="Optional pre-aggregated CSV for local dry runs.")
    parser.add_argument("--print-query", action="store_true")
    return parser.parse_args()


def distribution(row: dict[str, Any], prefix: str) -> dict[str, float]:
    return {
        "p10": float(row[f"{prefix}_p10"]),
        "p50": float(row[f"{prefix}_p50"]),
        "p90": float(row[f"{prefix}_p90"]),
        "p99": float(row[f"{prefix}_p99"]),
    }


def row_to_payload(row: dict[str, Any], args: argparse.Namespace) -> dict[str, Any]:
    return {
        "schema_version": "FT_V3_2026_05",
        "cohort_id": args.cohort_id,
        "workflow_id": row["workflow_id"],
        "window_start": datetime.fromisoformat(args.window_start.replace("Z", "+00:00")).astimezone(timezone.utc).isoformat(),
        "window_end": datetime.fromisoformat(args.window_end.replace("Z", "+00:00")).astimezone(timezone.utc).isoformat(),
        "cohort_size": int(row["cohort_size"]),
        "calibration_id": args.calibration_id,
        "velocity": {
            "frequency": distribution(row, "freq"),
            "engagement": distribution(row, "engagement"),
            "breadth": distribution(row, "breadth"),
        },
        "quality_signals": {
            "completion_rate": float(row.get("completion_rate") or 0),
            "error_rate": float(row.get("error_rate") or 0),
            "abandonment_rate": float(row.get("abandonment_rate") or 0),
            "recovery_rate": float(row.get("recovery_rate") or 0),
            "verification_rate": float(row.get("verification_rate") or 0),
            "p50_latency_ms": int(float(row.get("p50_latency_ms") or 0)),
            "p95_latency_ms": int(float(row.get("p95_latency_ms") or 0)),
        },
        "privacy": {"person_level_fields_included": False},
    }


def read_csv(path: Path) -> list[dict[str, Any]]:
    with path.open(newline="") as handle:
        return list(csv.DictReader(handle))


def read_bigquery(args: argparse.Namespace) -> list[dict[str, Any]]:
    try:
        from google.cloud import bigquery  # type: ignore
    except ImportError as exc:
        raise SystemExit("google-cloud-bigquery is required unless --input-csv is provided") from exc
    client = bigquery.Client(project=args.project)
    query = VELOCITY_SQL.format(
        project=args.project,
        dataset=args.dataset,
        table=args.table,
        window_start=args.window_start,
        window_end=args.window_end,
    )
    return [dict(row) for row in client.query(query).result()]


def main() -> int:
    args = parse_args()
    query = VELOCITY_SQL.format(
        project=args.project,
        dataset=args.dataset,
        table=args.table,
        window_start=args.window_start,
        window_end=args.window_end,
    )
    if args.print_query:
        print(query)
    rows = read_csv(args.input_csv) if args.input_csv else read_bigquery(args)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for row in rows:
        payload = row_to_payload(row, args)
        safe_workflow = "".join(ch if ch.isalnum() or ch in "._-" else "_" for ch in payload["workflow_id"])
        (args.output_dir / f"{safe_workflow}.json").write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps({"status": "PASS", "payloads_written": len(rows), "output_dir": str(args.output_dir)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
