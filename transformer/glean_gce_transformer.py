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
from types import SimpleNamespace
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
      NULLIF(TRIM(jsonPayload.user.id), ''),
      NULLIF(TRIM(jsonPayload.user.canonicalid), '')
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
    AND COALESCE(UPPER(jsonPayload.type), '') != 'PRODUCT_SNAPSHOT'
    AND COALESCE(
      NULLIF(TRIM(jsonPayload.user.userid), ''),
      NULLIF(TRIM(jsonPayload.user.id), ''),
      NULLIF(TRIM(jsonPayload.user.canonicalid), '')
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
    attribution_join_key,
    event_type AS verification_event_type
  FROM source_events,
    UNNEST([workflow_run_id, root_workflow_id, session_token, tracking_token]) AS attribution_join_key
  WHERE event_type IN (
      'CHAT_CITATION_CLICK',
      'CHAT_CITATIONS',
      'AI_ANSWER_VOTE',
      'AI_SUMMARY_VOTE',
      'SEARCH_FEEDBACK',
      'CHAT_FEEDBACK'
    )
    AND attribution_join_key IS NOT NULL
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


def _nested(value: dict[str, Any], *path: str) -> Any:
    current: Any = value
    for key in path:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


def _first_text(value: dict[str, Any], paths: list[tuple[str, ...]]) -> str | None:
    for path in paths:
        raw = _nested(value, *path)
        if raw is None:
            continue
        text = str(raw).strip()
        if text:
            return text
    return None


def _event_day(row: dict[str, Any]) -> str:
    timestamp = str(row["timestamp"]).replace("Z", "+00:00")
    return datetime.fromisoformat(timestamp).astimezone(timezone.utc).date().isoformat()


def _status(payload: dict[str, Any]) -> str | None:
    status = _first_text(payload, [
        ("workflow", "workflowexecutionstatus"),
        ("action", "executionstatus"),
        ("mcpusage", "status"),
    ])
    if status:
        return status
    executions = _nested(payload, "workflowrun", "workflowexecutions")
    if isinstance(executions, list):
        for execution in executions:
            if isinstance(execution, dict) and execution.get("status"):
                return str(execution["status"])
    if payload.get("type") in {"SEARCH", "AUTOCOMPLETE", "AI_SUMMARY", "GLEAN_BOT_ACTIVITY", "MCP_USAGE"}:
        return "completed"
    return None


def _latency_ms(payload: dict[str, Any]) -> int:
    raw = _first_text(payload, [
        ("workflowrun", "totalexecutionlatency"),
        ("workflowrun", "totalresponsemillis"),
        ("chat", "totalresponsemillis"),
        ("search", "backendmillis"),
        ("autocomplete", "backendmillis"),
        ("voicechat", "totaltextresponsems"),
        ("mcpusage", "durationms"),
    ])
    if raw is None:
        return 0
    return int(float(raw))


def _has_error(payload: dict[str, Any]) -> bool:
    if _nested(payload, "action", "errortype") or _nested(payload, "mcpusage", "errorcode"):
        return True
    executions = _nested(payload, "workflowrun", "workflowexecutions")
    return isinstance(executions, list) and any(
        isinstance(execution, dict) and execution.get("errortype") for execution in executions
    )


def _percentile(values: list[float], percentile: int) -> float:
    if not values:
        return 0
    ordered = sorted(values)
    index = round((len(ordered) - 1) * percentile / 100)
    return float(ordered[index])


def _distribution(values: list[float]) -> dict[str, float]:
    return {
        "p10": _percentile(values, 10),
        "p50": _percentile(values, 50),
        "p90": _percentile(values, 90),
        "p99": _percentile(values, 99),
    }


def _agent_workflow_id(feature: str, snapshot: dict[str, Any] | None) -> str:
    if feature.upper() != "AGENT":
        return f"workflow:{feature}"
    if snapshot and snapshot.get("is_autonomous") is True:
        return "workflow:agent:autonomous"
    if (
        snapshot
        and snapshot.get("is_autonomous") is False
        and snapshot.get("workflow_name") is not None
        and snapshot.get("unlisted") is False
    ):
        return "workflow:agent:workflow_named"
    return "workflow:agent:ephemeral"


def _source_event(row: dict[str, Any]) -> dict[str, Any]:
    payload = row.get("jsonPayload", {})
    event_type = payload.get("type")
    workflow_feature = _first_text(payload, [("workflowrun", "feature")])
    workflow_run_id = _first_text(payload, [("workflowrun", "runid")])
    session_token = _first_text(payload, [
        ("workflowrun", "sessiontrackingtoken"),
        ("chat", "sessiontrackingtoken"),
        ("autocomplete", "sessiontrackingtoken"),
        ("search", "sessiontrackingtoken"),
        ("action", "sessiontrackingtoken"),
        ("voicechat", "sessiontrackingtoken"),
        ("chatfeedback", "sessiontrackingtoken"),
        ("gleanbotactivity", "eventtrackingtoken"),
    ])
    tracking_token = _first_text(payload, [
        ("search", "trackingtoken"),
        ("autocomplete", "trackingtoken"),
        ("aianswer", "trackingtoken"),
        ("aisummary", "trackingtoken"),
        ("chatcitationclick", "trackingtoken"),
        ("chatcitations", "workflowrunid"),
        ("chatcitations", "chatsessionid"),
        ("aianswervote", "trackingtoken"),
        ("aisummaryvote", "trackingtoken"),
        ("searchfeedback", "trackingtoken"),
        ("chatfeedback", "runid"),
        ("chatfeedback", "workflowid"),
        ("chatfeedback", "chatsessionid"),
    ])
    return {
        "row": row,
        "payload": payload,
        "event_type": event_type,
        "event_day": _event_day(row),
        "workflow_feature": workflow_feature,
        "root_workflow_id": _first_text(payload, [("workflowrun", "rootworkflowid")]),
        "workflow_run_id": workflow_run_id,
        "session_token": session_token,
        "tracking_token": tracking_token,
        "user_key": _first_text(payload, [
            ("user", "userid"),
            ("user", "id"),
            ("user", "canonicalid"),
            ("productsnapshot", "user", "id"),
            ("productsnapshot", "user", "canonicalid"),
        ]),
        "status": _status(payload),
        "latency_ms": _latency_ms(payload),
        "has_error": _has_error(payload),
    }


def _surface_join_key(event: dict[str, Any]) -> str:
    return (
        event["workflow_run_id"]
        or event["root_workflow_id"]
        or event["session_token"]
        or event["tracking_token"]
        or f"{event['user_key']}:{event['row']['timestamp']}:{event['event_type']}"
    )


def aggregate_gce_rows_to_payloads(
    rows: list[dict[str, Any]],
    *,
    cohort_id: str,
    calibration_id: str,
    window_start: str,
    window_end: str,
) -> list[dict[str, Any]]:
    """Aggregate synthetic GCE-shaped rows using the customer-side taxonomy rules.

    This helper is intentionally aggregate-only: per-user rows are local
    intermediates and never appear in returned V3 payloads.
    """
    events = [_source_event(row) for row in rows]
    snapshots: dict[str, dict[str, Any]] = {}
    for event in events:
        if event["event_type"] != "PRODUCT_SNAPSHOT":
            continue
        workflow_id = _first_text(event["payload"], [("productsnapshot", "workflow", "workflowid")])
        if workflow_id is None:
            continue
        snapshots[workflow_id] = {
            "is_autonomous": _nested(event["payload"], "productsnapshot", "workflow", "isautonomousagent"),
            "workflow_name": _first_text(event["payload"], [("productsnapshot", "workflow", "name")]),
            "unlisted": bool(_nested(event["payload"], "productsnapshot", "workflow", "unlisted") or False),
        }

    workflow_sessions = {
        event["session_token"]
        for event in events
        if event["event_type"] == "WORKFLOW_RUN" and event["session_token"] is not None
    }
    surfaces: list[dict[str, Any]] = []
    for event in events:
        if event["user_key"] is None:
            continue
        if event["event_type"] == "WORKFLOW_RUN" and event["workflow_feature"] is not None:
            surfaces.append({
                **event,
                "workflow_id": _agent_workflow_id(
                    event["workflow_feature"],
                    snapshots.get(event["root_workflow_id"] or ""),
                ),
                "surface_join_key": _surface_join_key(event),
            })
            continue
        standalone_ids = {
            "SEARCH": "standalone:SEARCH",
            "AUTOCOMPLETE": "standalone:AUTOCOMPLETE",
            "MCP_USAGE": "standalone:MCP_USAGE",
            "AI_SUMMARY": "standalone:AI_SUMMARY",
            "GLEAN_BOT_ACTIVITY": "standalone:GLEAN_BOT_ACTIVITY",
        }
        if event["event_type"] not in standalone_ids or event["workflow_feature"] is not None:
            continue
        if event["event_type"] == "GLEAN_BOT_ACTIVITY" and event["session_token"] in workflow_sessions:
            continue
        surfaces.append({
            **event,
            "workflow_id": standalone_ids[event["event_type"]],
            "surface_join_key": _surface_join_key(event),
        })

    if not surfaces:
        return []

    verification_events = {
        "CHAT_CITATION_CLICK",
        "CHAT_CITATIONS",
        "AI_ANSWER_VOTE",
        "AI_SUMMARY_VOTE",
        "SEARCH_FEEDBACK",
        "CHAT_FEEDBACK",
    }
    aliases: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for surface in surfaces:
        for alias in {surface["surface_join_key"], surface["session_token"], surface["tracking_token"]}:
            if alias is not None:
                aliases.setdefault((surface["user_key"], alias), []).append(surface)

    verified_surface_keys: dict[str, set[str]] = {}
    for event in events:
        if event["event_type"] not in verification_events or event["user_key"] is None:
            continue
        candidate_keys = {
            event["workflow_run_id"],
            event["root_workflow_id"],
            event["session_token"],
            event["tracking_token"],
        }
        for attribution_key in candidate_keys:
            if attribution_key is None:
                continue
            for surface in aliases.get((event["user_key"], attribution_key), []):
                verified_surface_keys.setdefault(surface["workflow_id"], set()).add(surface["surface_join_key"])

    rows_for_payload: list[dict[str, Any]] = []
    workflow_ids = sorted({surface["workflow_id"] for surface in surfaces})
    breadth_by_user: dict[str, int] = {}
    for user_key in {surface["user_key"] for surface in surfaces}:
        breadth_by_user[user_key] = len({
            surface["workflow_id"] for surface in surfaces if surface["user_key"] == user_key
        })

    for workflow_id in workflow_ids:
        group = [surface for surface in surfaces if surface["workflow_id"] == workflow_id]
        user_keys = sorted({surface["user_key"] for surface in group})
        surface_keys = {surface["surface_join_key"] for surface in group}
        per_user_runs: list[float] = []
        per_user_days: list[float] = []
        per_user_breadth: list[float] = []
        for user_key in user_keys:
            user_group = [surface for surface in group if surface["user_key"] == user_key]
            active_days = {surface["event_day"] for surface in user_group}
            per_user_days.append(float(len(active_days)))
            per_user_runs.append(float(len({surface["surface_join_key"] for surface in user_group}) / len(active_days)))
            per_user_breadth.append(float(breadth_by_user[user_key]))

        status_values = [str(surface["status"] or "").lower() for surface in group]
        completion_rate = sum(status in {"completed", "complete", "success", "succeeded"} for status in status_values) / len(group)
        error_rate = sum(
            surface["has_error"] or status in {"error", "errored", "failed", "failure"}
            for surface, status in zip(group, status_values)
        ) / len(group)
        abandonment_rate = sum(status in {"abandoned", "cancelled", "canceled", "timeout"} for status in status_values) / len(group)
        row = {
            "workflow_id": workflow_id,
            "cohort_size": len(user_keys),
            "completion_rate": completion_rate,
            "error_rate": error_rate,
            "abandonment_rate": abandonment_rate,
            "recovery_rate": 0,
            "verification_rate": len(verified_surface_keys.get(workflow_id, set())) / len(surface_keys),
            "p50_latency_ms": _percentile([surface["latency_ms"] for surface in group], 50),
            "p95_latency_ms": _percentile([surface["latency_ms"] for surface in group], 95),
        }
        for prefix, values in [
            ("freq", per_user_runs),
            ("engagement", per_user_days),
            ("breadth", per_user_breadth),
        ]:
            for key, value in _distribution(values).items():
                row[f"{prefix}_{key}"] = value
        rows_for_payload.append(row)

    args = SimpleNamespace(
        cohort_id=cohort_id,
        calibration_id=calibration_id,
        window_start=window_start,
        window_end=window_end,
    )
    return [row_to_payload(row, args) for row in rows_for_payload]


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
