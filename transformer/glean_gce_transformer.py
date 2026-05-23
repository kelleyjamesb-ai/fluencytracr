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
WITH source_events AS (
  SELECT
    timestamp AS event_ts,
    DATE(timestamp) AS event_day,
    jsonPayload.type AS event_type,
    NULLIF(TRIM(jsonPayload.workflowrun.feature), '') AS workflow_feature,
    NULLIF(TRIM(jsonPayload.workflowrun.rootworkflowid), '') AS root_workflow_id,
    NULLIF(TRIM(jsonPayload.workflowrun.runid), '') AS workflow_run_id,
    COALESCE(
      NULLIF(TRIM(jsonPayload.workflowrun.sessiontrackingtoken), ''),
      NULLIF(TRIM(jsonPayload.chat.sessiontrackingtoken), ''),
      NULLIF(TRIM(jsonPayload.autocomplete.sessiontrackingtoken), ''),
      NULLIF(TRIM(jsonPayload.search.sessiontrackingtoken), ''),
      NULLIF(TRIM(jsonPayload.action.sessiontrackingtoken), ''),
      NULLIF(TRIM(jsonPayload.voicechat.sessiontrackingtoken), ''),
      NULLIF(TRIM(jsonPayload.chatfeedback.sessiontrackingtoken), ''),
      NULLIF(TRIM(jsonPayload.gleanbotactivity.eventtrackingtoken), '')
    ) AS session_token,
    COALESCE(
      NULLIF(TRIM(jsonPayload.search.trackingtoken), ''),
      NULLIF(TRIM(jsonPayload.autocomplete.trackingtoken), ''),
      NULLIF(TRIM(jsonPayload.aianswer.trackingtoken), ''),
      NULLIF(TRIM(jsonPayload.aisummary.trackingtoken), ''),
      NULLIF(TRIM(jsonPayload.chatcitationclick.trackingtoken), ''),
      NULLIF(TRIM(jsonPayload.chatcitations.workflowrunid), ''),
      NULLIF(TRIM(jsonPayload.chatcitations.chatsessionid), ''),
      NULLIF(TRIM(jsonPayload.aianswervote.trackingtoken), ''),
      NULLIF(TRIM(jsonPayload.aisummaryvote.trackingtoken), ''),
      NULLIF(TRIM(jsonPayload.searchfeedback.trackingtoken), ''),
      NULLIF(TRIM(jsonPayload.chatfeedback.runid), ''),
      NULLIF(TRIM(jsonPayload.chatfeedback.workflowid), ''),
      NULLIF(TRIM(jsonPayload.chatfeedback.chatsessionid), '')
    ) AS tracking_token,
    COALESCE(
      NULLIF(TRIM(jsonPayload.user.userid), ''),
      NULLIF(TRIM(jsonPayload.productsnapshot.user.id), ''),
      NULLIF(TRIM(jsonPayload.productsnapshot.user.canonicalid), '')
    ) AS user_key,
    COALESCE(
      jsonPayload.workflow.workflowexecutionstatus,
      (SELECT ANY_VALUE(execution.status) FROM UNNEST(jsonPayload.workflowrun.workflowexecutions) AS execution),
      jsonPayload.action.executionstatus,
      jsonPayload.mcpusage.status,
      CASE
        WHEN jsonPayload.type IN ('SEARCH', 'AUTOCOMPLETE', 'AI_SUMMARY', 'GLEAN_BOT_ACTIVITY') THEN 'completed'
        WHEN jsonPayload.type = 'MCP_USAGE' AND jsonPayload.mcpusage.status IS NULL THEN 'completed'
        ELSE NULL
      END
    ) AS status,
    SAFE_CAST(COALESCE(
      jsonPayload.workflowrun.totalexecutionlatency,
      jsonPayload.workflowrun.totalresponsemillis,
      jsonPayload.chat.totalresponsemillis,
      jsonPayload.search.backendmillis,
      jsonPayload.autocomplete.backendmillis,
      jsonPayload.voicechat.totaltextresponsems,
      jsonPayload.mcpusage.durationms,
      jsonPayload.action.endtimems - jsonPayload.action.starttimems
    ) AS INT64) AS latency_ms,
    EXISTS (
      SELECT 1
      FROM UNNEST(jsonPayload.workflowrun.workflowexecutions) AS execution
      WHERE execution.errortype IS NOT NULL
    )
    OR jsonPayload.action.errortype IS NOT NULL
    OR jsonPayload.mcpusage.errorcode IS NOT NULL AS has_error,
    EXISTS (
      SELECT 1
      FROM UNNEST(jsonPayload.workflowrun.workflowexecutions) AS execution
      WHERE execution.errortype IS NOT NULL
    )
    AND LOWER(COALESCE(
      jsonPayload.workflow.workflowexecutionstatus,
      (SELECT ANY_VALUE(execution.status) FROM UNNEST(jsonPayload.workflowrun.workflowexecutions) AS execution),
      jsonPayload.action.executionstatus,
      jsonPayload.mcpusage.status,
      ''
    )) IN ('completed', 'complete', 'success', 'succeeded') AS recovered
  FROM `{project}.{dataset}.{table}`
  WHERE timestamp >= TIMESTAMP('{window_start}')
    AND timestamp < TIMESTAMP('{window_end}')
    AND COALESCE(
      NULLIF(TRIM(jsonPayload.user.userid), ''),
      NULLIF(TRIM(jsonPayload.productsnapshot.user.id), ''),
      NULLIF(TRIM(jsonPayload.productsnapshot.user.canonicalid), '')
    ) IS NOT NULL
),

product_snapshot_events AS (
  SELECT
    timestamp AS snapshot_ts,
    NULLIF(TRIM(jsonPayload.productsnapshot.workflow.workflowid), '') AS snapshot_workflow_id,
    jsonPayload.productsnapshot.workflow.isautonomousagent AS snapshot_is_autonomous,
    NULLIF(TRIM(jsonPayload.productsnapshot.workflow.name), '') AS snapshot_workflow_name,
    COALESCE(jsonPayload.productsnapshot.workflow.unlisted, FALSE) AS snapshot_unlisted
  FROM `{project}.{dataset}.{table}`
  WHERE timestamp < TIMESTAMP('{window_end}')
    AND jsonPayload.type = 'PRODUCT_SNAPSHOT'
),

product_snapshots AS (
  SELECT
    snapshot_workflow_id,
    ARRAY_AGG(
      STRUCT(
        snapshot_is_autonomous AS is_autonomous,
        snapshot_workflow_name AS workflow_name,
        snapshot_unlisted AS unlisted
      )
      ORDER BY snapshot_ts DESC
      LIMIT 1
    )[OFFSET(0)] AS snapshot
  FROM product_snapshot_events
  WHERE snapshot_workflow_id IS NOT NULL
  GROUP BY snapshot_workflow_id
),

workflow_sessions AS (
  SELECT DISTINCT session_token
  FROM source_events
  WHERE event_type = 'WORKFLOW_RUN'
    AND session_token IS NOT NULL
),

workflow_surfaces AS (
  SELECT
    run.user_key,
    run.event_day,
    run.session_token,
    run.tracking_token,
    COALESCE(
      run.workflow_run_id,
      run.root_workflow_id,
      run.session_token,
      run.tracking_token,
      CONCAT(run.user_key, ':', CAST(run.event_ts AS STRING), ':', run.event_type)
    ) AS surface_join_key,
    CASE
      WHEN UPPER(run.workflow_feature) = 'AGENT' AND snapshot.snapshot.is_autonomous IS TRUE THEN 'workflow:agent:autonomous'
      WHEN UPPER(run.workflow_feature) = 'AGENT'
        AND snapshot.snapshot.is_autonomous IS FALSE
        AND snapshot.snapshot.workflow_name IS NOT NULL
        AND snapshot.snapshot.unlisted IS FALSE THEN 'workflow:agent:workflow_named'
      WHEN UPPER(run.workflow_feature) = 'AGENT' THEN 'workflow:agent:ephemeral'
      ELSE CONCAT('workflow:', run.workflow_feature)
    END AS workflow_id,
    run.status,
    run.latency_ms,
    run.has_error,
    run.recovered
  FROM source_events AS run
  LEFT JOIN product_snapshots AS snapshot
    ON snapshot.snapshot_workflow_id = run.root_workflow_id
  WHERE run.event_type = 'WORKFLOW_RUN'
    AND run.workflow_feature IS NOT NULL
),

standalone_surfaces AS (
  SELECT
    event.user_key,
    event.event_day,
    event.session_token,
    event.tracking_token,
    COALESCE(
      event.workflow_run_id,
      event.session_token,
      event.tracking_token,
      CONCAT(event.user_key, ':', CAST(event.event_ts AS STRING), ':', event.event_type)
    ) AS surface_join_key,
    CASE event.event_type
      WHEN 'SEARCH' THEN 'standalone:SEARCH'
      WHEN 'AUTOCOMPLETE' THEN 'standalone:AUTOCOMPLETE'
      WHEN 'MCP_USAGE' THEN 'standalone:MCP_USAGE'
      WHEN 'AI_SUMMARY' THEN 'standalone:AI_SUMMARY'
      WHEN 'GLEAN_BOT_ACTIVITY' THEN 'standalone:GLEAN_BOT_ACTIVITY'
    END AS workflow_id,
    event.status,
    event.latency_ms,
    event.has_error,
    event.recovered
  FROM source_events AS event
  WHERE event.event_type IN ('SEARCH', 'AUTOCOMPLETE', 'MCP_USAGE', 'AI_SUMMARY', 'GLEAN_BOT_ACTIVITY')
    AND event.workflow_feature IS NULL
    AND (
      event.event_type != 'GLEAN_BOT_ACTIVITY'
      OR event.session_token IS NULL
      OR NOT EXISTS (
        SELECT 1
        FROM workflow_sessions AS workflow_session
        WHERE workflow_session.session_token = event.session_token
      )
    )
),

taxonomy_surfaces AS (
  SELECT * FROM workflow_surfaces
  UNION ALL
  SELECT * FROM standalone_surfaces
),

surface_join_aliases AS (
  SELECT DISTINCT user_key, workflow_id, surface_join_key, surface_join_key AS attribution_join_key
  FROM taxonomy_surfaces
  UNION DISTINCT
  SELECT DISTINCT user_key, workflow_id, surface_join_key, session_token AS attribution_join_key
  FROM taxonomy_surfaces
  WHERE session_token IS NOT NULL
  UNION DISTINCT
  SELECT DISTINCT user_key, workflow_id, surface_join_key, tracking_token AS attribution_join_key
  FROM taxonomy_surfaces
  WHERE tracking_token IS NOT NULL
),

verification_signals AS (
  SELECT
    user_key,
    COALESCE(workflow_run_id, session_token, tracking_token) AS attribution_join_key,
    event_type AS verification_event_type
  FROM source_events
  WHERE event_type IN (
      'CHAT_CITATION_CLICK',
      'CHAT_CITATIONS',
      'AI_ANSWER_VOTE',
      'AI_SUMMARY_VOTE',
      'SEARCH_FEEDBACK',
      'CHAT_FEEDBACK'
    )
    AND COALESCE(workflow_run_id, session_token, tracking_token) IS NOT NULL
),

surface_verification AS (
  SELECT
    alias.workflow_id,
    COUNT(*) AS verification_signal_count,
    COUNT(DISTINCT alias.surface_join_key) AS verified_surface_count
  FROM surface_join_aliases AS alias
  JOIN verification_signals AS verification
    ON verification.user_key = alias.user_key
    AND verification.attribution_join_key = alias.attribution_join_key
  GROUP BY alias.workflow_id
),

per_user_surface AS (
  SELECT
    workflow_id,
    user_key,
    COUNT(DISTINCT surface_join_key) AS total_events,
    COUNT(DISTINCT event_day) AS active_days,
    SAFE_DIVIDE(COUNT(DISTINCT surface_join_key), COUNT(DISTINCT event_day)) AS runs_per_active_day
  FROM taxonomy_surfaces
  GROUP BY workflow_id, user_key
),
per_user_breadth AS (
  SELECT
    user_key,
    COUNT(DISTINCT workflow_id) AS breadth
  FROM taxonomy_surfaces
  GROUP BY user_key
),
quality AS (
  SELECT
    workflow_id,
    COUNT(DISTINCT user_key) AS cohort_size,
    AVG(CASE WHEN LOWER(status) IN ('completed', 'complete', 'success', 'succeeded') THEN 1 ELSE 0 END) AS completion_rate,
    AVG(CASE WHEN has_error OR LOWER(status) IN ('error', 'errored', 'failed', 'failure') THEN 1 ELSE 0 END) AS error_rate,
    AVG(CASE WHEN LOWER(status) IN ('abandoned', 'cancelled', 'canceled', 'timeout') THEN 1 ELSE 0 END) AS abandonment_rate,
    AVG(CASE WHEN recovered THEN 1 ELSE 0 END) AS recovery_rate,
    SAFE_DIVIDE(COALESCE(MAX(verification.verified_surface_count), 0), COUNT(DISTINCT surface_join_key)) AS verification_rate,
    APPROX_QUANTILES(latency_ms, 100)[OFFSET(50)] AS p50_latency_ms,
    APPROX_QUANTILES(latency_ms, 100)[OFFSET(95)] AS p95_latency_ms
  FROM taxonomy_surfaces
  LEFT JOIN surface_verification AS verification USING (workflow_id)
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
