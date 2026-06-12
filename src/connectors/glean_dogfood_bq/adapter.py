"""Read-only Glean dogfood BigQuery adapter.

The adapter is intentionally split into two contracts:

- broad source awareness: pinned, table-specific allowlists document the safe
  scrubbed fields the connector may use while aggregating inside BigQuery;
- narrow FluencyTracr output: only V3 aggregate ingest payloads leave the
  connector boundary.

Raw rows, person identifiers, prompts, outputs, URLs, messages, transcripts, and
raw skill names are never part of emitted payloads.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


MAX_BYTES_SCANNED = 100 * 1024 * 1024 * 1024
MIN_COHORT_SIZE = 5

FORBIDDEN_FIELD_KEYS = {
    "email",
    "user_id",
    "actor_id",
    "userid",
    "query",
    "query_text",
    "prompt",
    "response",
    "output",
    "message",
    "transcript",
    "body",
    "document_url",
    "url",
    "skill_name",
    "actor_email",
}

OUTPUT_ALLOWED_TOP_LEVEL = {
    "schema_version",
    "cohort_id",
    "workflow_id",
    "jbtd_id",
    "persona_id",
    "window_start",
    "window_end",
    "cohort_size",
    "calibration_id",
    "velocity",
    "quality_signals",
    "privacy",
}

SAFE_TOKEN_RE = re.compile(r"^[A-Za-z0-9:_-]+$")


@dataclass(frozen=True)
class TableSpec:
    """Pinned source shape for one scrubbed BigQuery family."""

    table_name: str
    table_pattern: str
    source_allowlist: tuple[str, ...]
    aggregate_sql: str


SCRUBBED_LLM_CALL_ALLOWLIST = (
    "timestamp",
    "receiveTimestamp",
    "severity",
    "insertId",
    "resource.type",
    "resource.labels.project_id",
    "resource.labels.module_id",
    "resource.labels.zone",
    "resource.labels.location",
    "labels.commit_hash",
    "labels.full_version",
    "labels.branch",
    "jsonPayload.timestamp.seconds",
    "jsonPayload.timestamp.nanos",
    "jsonPayload.llmmodel",
    "jsonPayload.model",
    "jsonPayload.modelid",
    "jsonPayload.llmprovider",
    "jsonPayload.llmkeysku",
    "jsonPayload.platform",
    "jsonPayload.region",
    "jsonPayload.deploymenttype",
    "jsonPayload.feature",
    "jsonPayload.datasource",
    "jsonPayload.codeinitiator",
    "jsonPayload.clientinitiator",
    "jsonPayload.llminitiator",
    "jsonPayload.workflowrunid",
    "jsonPayload.workflowstepid",
    "jsonPayload.workflowid",
    "jsonPayload.rootworkflowid",
    "jsonPayload.statuscode",
    "jsonPayload.finishreason",
    "jsonPayload.llmerrorcategory",
    "jsonPayload.reasoningtokens",
    "jsonPayload.cachecreationinputtokens",
    "jsonPayload.imagetokens",
    "jsonPayload.completiontokencost",
    "jsonPayload.timetofirsttokenmillis",
    "jsonPayload.totallatencymillis",
    "jsonPayload.ptuutilizationpercentage",
)

SCRUBBED_CLIENT_ANALYTICS_ALLOWLIST = (
    "timestamp",
    "receiveTimestamp",
    "severity",
    "insertId",
    "resource.type",
    "resource.labels.project_id",
    "resource.labels.module_id",
    "resource.labels.zone",
    "resource.labels.location",
    "labels.commit_hash",
    "labels.full_version",
    "labels.branch",
    "labels.sciorequestid",
    "jsonPayload.trackingparams.eventname",
    "jsonPayload.trackingparams.webappversion",
    "jsonPayload.trackingparams.debugmode",
    "jsonPayload.trackingparams.extensionversion",
    "jsonPayload.trackingparams.theme",
    "jsonPayload.trackingparams.category",
    "jsonPayload.trackingparams.modality",
    "jsonPayload.trackingparams.uielement",
    "jsonPayload.trackingparams.label",
    "jsonPayload.trackingparams.datasource",
    "jsonPayload.trackingparams.doctype",
    "jsonPayload.trackingparams.attribution",
    "jsonPayload.trackingparams.rate",
    "jsonPayload.events.trackingparams.eventname",
    "jsonPayload.events.trackingparams.category",
    "jsonPayload.events.trackingparams.uielement",
    "jsonPayload.events.trackingparams.label",
    "jsonPayload.events.trackingparams.datasource",
    "jsonPayload.events.trackingparams.doctype",
    "jsonPayload.events.trackingparams.attribution",
    "jsonPayload.events.trackingparams.rate",
    "jsonPayload.events.trackingparams.timing.overalltimems",
    "jsonPayload.events.trackingparams.timing.backendtimems",
    "jsonPayload.events.trackingparams.timing.fetchtimems",
    "jsonPayload.commonparams.theme",
    "jsonPayload.commonparams.webappversion",
    "jsonPayload.commonparams.modality",
    "jsonPayload.commonparams.extensionversion",
    "jsonPayload.commonparams.debugmode",
    "jsonPayload.commonparams.experimentids",
    "jsonPayload.commonparams.deploymenttype",
    "jsonPayload.commonparams.locale",
    "jsonPayload.commonparams.websdkversion",
    "jsonPayload.commonparams.mobileappversion",
    "jsonPayload.project",
    "jsonPayload.geo.country",
    "jsonPayload.domain",
)

SCRUBBED_WORKFLOWS_ALLOWLIST = (
    "timestamp",
    "receiveTimestamp",
    "severity",
    "insertId",
    "resource.type",
    "resource.labels.project_id",
    "resource.labels.module_id",
    "resource.labels.zone",
    "resource.labels.location",
    "labels.commit_hash",
    "labels.full_version",
    "labels.branch",
    "jsonPayload.workflowid",
    "jsonPayload.type",
    "jsonPayload.initiator",
    "jsonPayload.sessioninfo.sessiontrackingtoken",
    "jsonPayload.sessioninfo.tabid",
    "jsonPayload.sessioninfo.lastseen",
    "jsonPayload.debug.executiondebug.executiontimemillis",
    "jsonPayload.debug.executiondebug.success",
    "jsonPayload.workflow.workflow_id",
    "jsonPayload.workflow.run_id",
    "jsonPayload.workflow.workflow_execution.execution_time_millis",
    "jsonPayload.workflow.workflow_execution.status",
    "jsonPayload.workflow.error_type",
    "jsonPayload.workflow.step_execution.status",
    "jsonPayload.workflow.step_execution.execution_time_millis",
    "jsonPayload.workflow.step_execution.time_to_first_token_millis",
    "jsonPayload.workflow.step_id",
    "jsonPayload.workflow.session_info.tab_id",
    "jsonPayload.workflow.session_info.session_tracking_token",
    "jsonPayload.workflow.session_info.last_seen_micros",
    "jsonPayload.workflow.execute_data.execution_summary.execution_time_millis",
    "jsonPayload.workflow.execute_data.execution_summary.action_instance_id",
    "jsonPayload.workflow.execute_data.execution_summary.num_docs_retrieved",
    "jsonPayload.workflow.execute_data.execution_summary.search_results_displayed",
    "jsonPayload.workflow.execute_data.execution_time_millis",
    "jsonPayload.workflow.trace_id",
    "jsonPayload.workflow.source_info.initiator",
    "jsonPayload.workflow.source_info.platform",
    "jsonPayload.workflow.source_info.datasource",
    "jsonPayload.workflow.source_info.feature",
    "jsonPayload.workflow.source_info.is_debug",
    "jsonPayload.workflow.source_info.ui_tree",
    "jsonPayload.workflow.global_action_configuration.application_id",
    "jsonPayload.workflow.setup_timestamps.start_time_millis",
    "jsonPayload.workflow.intermediate_message_data.execution_timestamps.start_time_millis",
    "jsonPayload.workflow.intermediate_message_data.execution_timestamps.end_time_millis",
    "jsonPayload.workflow.endpoint_request_id",
    "jsonPayload.workflow.plan_data.actions.action_instance_id",
    "jsonPayload.workflow.plan_data.memory_management_info.num_tokens_final",
    "jsonPayload.workflow.plan_data.memory_management_info.num_tokens_truncated",
    "jsonPayload.workflow.plan_data.knowledge_mode",
    "jsonPayload.workflow.plan_data.force_artifacts",
    "jsonPayload.workflow.citations_data.has_user_facing_citations",
    "jsonPayload.workflow.citations_data.positioned_citations.type",
    "jsonPayload.workflow.citations_data.positioned_citations.datasource",
    "jsonPayload.workflow.citations_data.positioned_citations.doc_type",
    "jsonPayload.workflow.citations_data.positioned_citations.connector_type",
    "jsonPayload.workflow.chat_session_id",
    "jsonPayload.workflow.creation_source",
    "jsonPayload.workflow.namespace",
    "jsonPayload.workflow.trigger_data.trigger_type",
    "jsonPayload.workflow.trigger_data.time_event.scheduled_at_millis",
    "jsonPayload.workflow.trigger_data.time_event.observed_at_millis",
    "jsonPayload.workflow.trigger_data.document_change_event.event_time_millis",
    "jsonPayload.workflow.trigger_data.document_change_event.object_type",
    "jsonPayload.workflow.trigger_data.document_change_event.ingested_at_millis",
    "jsonPayload.workflow.trigger_data.document_change_event.reason",
    "jsonPayload.workflow.trigger_data.document_change_event.datasource",
    "jsonPayload.workflow.routed_to_agent",
    "jsonPayload.workflow.artifacts_data.artifact_type",
    "jsonPayload.workflow.artifacts_data.file_extension",
    "jsonPayload.workflow.start_time_millis",
    "jsonPayload.workflow.workflow_run_start_time",
    "jsonPayload.workflow.workflow_created_at",
    "jsonPayload.workflow.endpoint_start_time_millis",
    "jsonPayload.workflow.voice_realtime_telemetry.event_type",
    "jsonPayload.workflow.voice_realtime_telemetry.signaling_event.success",
    "jsonPayload.workflow.voice_realtime_telemetry.signaling_event.step",
    "jsonPayload.workflow.voice_realtime_telemetry.signaling_event.elapsed_ms",
    "jsonPayload.workflow.voice_realtime_telemetry.recovery_attempt.action",
    "jsonPayload.workflow.voice_realtime_telemetry.recovery_attempt.attempt",
    "jsonPayload.workflow.voice_realtime_telemetry.recovery_attempt.success",
    "jsonPayload.workflow.voice_realtime_telemetry.user_impact_event.impact",
    "jsonPayload.workflow.voice_realtime_telemetry.user_impact_event.reason",
    "jsonPayload.workflow.voice_realtime_telemetry.user_impact_event.retry_count",
    "jsonPayload.workflow.notification_event.notification_type",
    "jsonPayload.workflow.notification_event.dispatch_status",
    "jsonPayload.workflow.notification_event.channel",
    "jsonPayload.workflow.notification_event.event_type",
    "jsonPayload.workflow.notification_event.source",
    "jsonPayload.workflow_compiler.run_id",
    "jsonPayload.workflow_compiler.session_info.session_tracking_token",
    "jsonPayload.workflow_compiler.session_info.tab_id",
    "jsonPayload.workflow_compiler.execution_data.status",
    "jsonPayload.workflow_compiler.execution_data.execution_timestamps.start_time_millis",
    "jsonPayload.workflow_compiler.execution_data.execution_timestamps.end_time_millis",
    "jsonPayload.context.workflow.run_id",
    "jsonPayload.context.workflow.workflow_id",
    "jsonPayload.context.workflow.step_id",
    "jsonPayload.context.workflow.root_workflow_id",
    "jsonPayload.context.workflow.inner_workflow_id",
    "jsonPayload.context.workflow.namespace",
    "jsonPayload.context.workflow.workflow_created_at",
    "jsonPayload.context.agent_trace.span_id",
    "jsonPayload.context.agent_trace.trace_id",
    "jsonPayload.context.agent_trace.parent_id",
    "jsonPayload.context.agent_trace.timestamps.start_time_millis",
    "jsonPayload.context.agent_trace.external_parent_id",
    "jsonPayload.truncated_field_metadata.original_size_bytes",
    "jsonPayload.truncated_field_metadata.field_tag_path",
    "jsonPayload.truncated_field_metadata.unscrubbed_size_bytes",
    "jsonPayload.truncated_field_metadata.scrubbed_size_bytes",
    "jsonPayload.llm_call.total_latency_millis",
    "jsonPayload.llm_call.input_tokens",
    "jsonPayload.llm_call.provider",
    "jsonPayload.llm_call.cached_input_tokens",
    "jsonPayload.llm_call.model",
    "jsonPayload.llm_call.cache_creation_input_tokens",
    "jsonPayload.llm_call.llm_initiator",
    "jsonPayload.llm_call.client_initiator",
    "jsonPayload.span_info.start_end_timestamps.start_time_millis",
    "jsonPayload.span_info.start_end_timestamps.end_time_millis",
    "jsonPayload.span_info.span_name",
    "jsonPayload.span_info.execution_status.code",
)


def _llm_call_sql(table_pattern: str, start_suffix: str, end_suffix: str) -> str:
    return f"""
SELECT
  'scrubbed_llm_call' AS source_table,
  COALESCE(
    NULLIF(TRIM(jsonPayload.workflowid), ''),
    NULLIF(TRIM(jsonPayload.rootworkflowid), ''),
    NULLIF(TRIM(jsonPayload.workflowrunid), ''),
    CONCAT('workflow:', COALESCE(NULLIF(TRIM(jsonPayload.feature), ''), 'assistant'))
  ) AS workflow_id,
  CAST(NULL AS STRING) AS jbtd_id,
  CAST(NULL AS STRING) AS persona_id,
  COUNT(DISTINCT jsonPayload.userid) AS cohort_size,
  COUNT(*) AS event_count,
  AVG(CASE WHEN SAFE_CAST(jsonPayload.statuscode AS INT64) BETWEEN 200 AND 399 OR jsonPayload.finishreason IS NOT NULL THEN 1 ELSE 0 END) AS completion_rate,
  AVG(CASE WHEN SAFE_CAST(jsonPayload.statuscode AS INT64) >= 400 OR jsonPayload.llmerrorcategory IS NOT NULL THEN 1 ELSE 0 END) AS error_rate,
  AVG(CASE WHEN jsonPayload.finishreason IN ('cancelled', 'timeout') THEN 1 ELSE 0 END) AS abandonment_rate,
  0.0 AS recovery_rate,
  0.0 AS verification_rate,
  CAST(COALESCE(APPROX_QUANTILES(SAFE_CAST(jsonPayload.totallatencymillis AS INT64), 100)[OFFSET(50)], 0) AS INT64) AS p50_latency_ms,
  CAST(COALESCE(APPROX_QUANTILES(SAFE_CAST(jsonPayload.totallatencymillis AS INT64), 100)[OFFSET(95)], 0) AS INT64) AS p95_latency_ms,
  1.0 AS freq_p10,
  1.0 AS freq_p50,
  1.0 AS freq_p90,
  1.0 AS freq_p99,
  1.0 AS engagement_p10,
  1.0 AS engagement_p50,
  1.0 AS engagement_p90,
  1.0 AS engagement_p99,
  1.0 AS breadth_p10,
  1.0 AS breadth_p50,
  1.0 AS breadth_p90,
  1.0 AS breadth_p99
FROM `{table_pattern}`
WHERE _TABLE_SUFFIX BETWEEN '{start_suffix}' AND '{end_suffix}'
GROUP BY workflow_id
""".strip()


def _client_analytics_sql(table_pattern: str, start_suffix: str, end_suffix: str) -> str:
    return f"""
SELECT
  'scrubbed_client_analytics' AS source_table,
  'standalone:client-analytics' AS workflow_id,
  CAST(NULL AS STRING) AS jbtd_id,
  CAST(NULL AS STRING) AS persona_id,
  COUNT(DISTINCT jsonPayload.user.userid) AS cohort_size,
  COUNT(*) AS event_count,
  1.0 AS completion_rate,
  0.0 AS error_rate,
  0.0 AS abandonment_rate,
  0.0 AS recovery_rate,
  0.0 AS verification_rate,
  CAST(0 AS INT64) AS p50_latency_ms,
  CAST(0 AS INT64) AS p95_latency_ms,
  1.0 AS freq_p10,
  1.0 AS freq_p50,
  1.0 AS freq_p90,
  1.0 AS freq_p99,
  1.0 AS engagement_p10,
  1.0 AS engagement_p50,
  1.0 AS engagement_p90,
  1.0 AS engagement_p99,
  1.0 AS breadth_p10,
  1.0 AS breadth_p50,
  1.0 AS breadth_p90,
  1.0 AS breadth_p99
FROM `{table_pattern}`
WHERE _TABLE_SUFFIX BETWEEN '{start_suffix}' AND '{end_suffix}'
GROUP BY workflow_id
""".strip()


def _workflows_sql(table_pattern: str, start_suffix: str, end_suffix: str) -> str:
    return f"""
SELECT
  'scrubbed_workflows' AS source_table,
  COALESCE(
    NULLIF(TRIM(jsonPayload.workflow.workflow_id), ''),
    NULLIF(TRIM(jsonPayload.workflowid), ''),
    NULLIF(TRIM(jsonPayload.context.workflow.workflow_id), ''),
    'workflow:unknown'
  ) AS workflow_id,
  CAST(NULL AS STRING) AS jbtd_id,
  CAST(NULL AS STRING) AS persona_id,
  COUNT(DISTINCT COALESCE(jsonPayload.userid, jsonPayload.workflow.user_id, jsonPayload.workflow_compiler.user_id)) AS cohort_size,
  COUNT(*) AS event_count,
  AVG(CASE WHEN LOWER(COALESCE(jsonPayload.workflow.workflow_execution.status, jsonPayload.workflow_compiler.execution_data.status, '')) IN ('completed', 'complete', 'success', 'succeeded') THEN 1 ELSE 0 END) AS completion_rate,
  AVG(CASE WHEN jsonPayload.workflow.error_type IS NOT NULL OR LOWER(COALESCE(jsonPayload.workflow.workflow_execution.status, jsonPayload.workflow_compiler.execution_data.status, '')) IN ('error', 'errored', 'failed', 'failure') THEN 1 ELSE 0 END) AS error_rate,
  AVG(CASE WHEN LOWER(COALESCE(jsonPayload.workflow.workflow_execution.status, jsonPayload.workflow_compiler.execution_data.status, '')) IN ('abandoned', 'cancelled', 'canceled', 'timeout') THEN 1 ELSE 0 END) AS abandonment_rate,
  AVG(CASE WHEN jsonPayload.workflow.error_type IS NOT NULL AND LOWER(COALESCE(jsonPayload.workflow.workflow_execution.status, jsonPayload.workflow_compiler.execution_data.status, '')) IN ('completed', 'complete', 'success', 'succeeded') THEN 1 ELSE 0 END) AS recovery_rate,
  AVG(CASE WHEN jsonPayload.workflow.citations_data.has_user_facing_citations THEN 1 ELSE 0 END) AS verification_rate,
  CAST(COALESCE(APPROX_QUANTILES(COALESCE(SAFE_CAST(jsonPayload.workflow.workflow_execution.execution_time_millis AS INT64), SAFE_CAST(jsonPayload.llm_call.total_latency_millis AS INT64)), 100)[OFFSET(50)], 0) AS INT64) AS p50_latency_ms,
  CAST(COALESCE(APPROX_QUANTILES(COALESCE(SAFE_CAST(jsonPayload.workflow.workflow_execution.execution_time_millis AS INT64), SAFE_CAST(jsonPayload.llm_call.total_latency_millis AS INT64)), 100)[OFFSET(95)], 0) AS INT64) AS p95_latency_ms,
  1.0 AS freq_p10,
  1.0 AS freq_p50,
  1.0 AS freq_p90,
  1.0 AS freq_p99,
  1.0 AS engagement_p10,
  1.0 AS engagement_p50,
  1.0 AS engagement_p90,
  1.0 AS engagement_p99,
  1.0 AS breadth_p10,
  1.0 AS breadth_p50,
  1.0 AS breadth_p90,
  1.0 AS breadth_p99
FROM `{table_pattern}`
WHERE _TABLE_SUFFIX BETWEEN '{start_suffix}' AND '{end_suffix}'
GROUP BY workflow_id
""".strip()


TABLE_SPECS: dict[str, TableSpec] = {
    "scrubbed_llm_call": TableSpec(
        table_name="scrubbed_llm_call",
        table_pattern="scio-apps.scrubbed_llm_call.scrubbed_llm_call_*",
        source_allowlist=SCRUBBED_LLM_CALL_ALLOWLIST,
        aggregate_sql="llm_call",
    ),
    "scrubbed_client_analytics": TableSpec(
        table_name="scrubbed_client_analytics",
        table_pattern="scio-apps.scrubbed_client_analytics.scrubbed_client_analytics_*",
        source_allowlist=SCRUBBED_CLIENT_ANALYTICS_ALLOWLIST,
        aggregate_sql="client_analytics",
    ),
    "scrubbed_workflows": TableSpec(
        table_name="scrubbed_workflows",
        table_pattern="scio-apps.scrubbed_workflows.scrubbed_workflows_*",
        source_allowlist=SCRUBBED_WORKFLOWS_ALLOWLIST,
        aggregate_sql="workflows",
    ),
}


def _normalize_key(key: str) -> str:
    return key.replace("-", "_").replace(" ", "_").lower()


def guard_no_forbidden_fields(value: Any, path: tuple[str, ...] = ()) -> None:
    """Fail closed if a row or payload contains forbidden field names."""

    if isinstance(value, dict):
        for key, nested in value.items():
            normalized = _normalize_key(str(key))
            if normalized in FORBIDDEN_FIELD_KEYS:
                dotted = ".".join((*path, str(key)))
                raise ValueError(f"forbidden field at {dotted}: {key}")
            guard_no_forbidden_fields(nested, (*path, str(key)))
        return
    if isinstance(value, list):
        for index, nested in enumerate(value):
            guard_no_forbidden_fields(nested, (*path, str(index)))


def _table_suffix(date_value: str) -> str:
    parsed = datetime.fromisoformat(date_value.replace("Z", "+00:00"))
    return parsed.strftime("%Y%m%d")


def _iso_utc(value: str) -> str:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _query_for_table(table: str, start_suffix: str, end_suffix: str) -> str:
    spec = TABLE_SPECS[table]
    if table == "scrubbed_llm_call":
        return _llm_call_sql(spec.table_pattern, start_suffix, end_suffix)
    if table == "scrubbed_client_analytics":
        return _client_analytics_sql(spec.table_pattern, start_suffix, end_suffix)
    if table == "scrubbed_workflows":
        return _workflows_sql(spec.table_pattern, start_suffix, end_suffix)
    raise ValueError(f"unsupported table: {table}")


def build_union_query(tables: Iterable[str], *, start_date: str, end_date: str) -> str:
    """Build a read-only sharded BigQuery aggregate query."""

    start_suffix = _table_suffix(start_date)
    end_suffix = _table_suffix(end_date)
    if end_suffix < start_suffix:
        raise ValueError("end_date must be on or after start_date")

    requested = list(tables)
    unknown = sorted(set(requested) - set(TABLE_SPECS))
    if unknown:
        raise ValueError(f"unsupported table(s): {', '.join(unknown)}")
    if not requested:
        raise ValueError("at least one table is required")

    selects = [_query_for_table(table, start_suffix, end_suffix) for table in requested]
    query = "\nUNION ALL\n".join(f"({select})" for select in selects)
    validate_query_partition_guard(query)
    return query


def validate_query_partition_guard(query: str) -> None:
    normalized = " ".join(query.upper().split())
    has_partition = any(token in normalized for token in ("_PARTITIONTIME", "_PARTITIONDATE"))
    has_suffix_range = "_TABLE_SUFFIX BETWEEN" in normalized
    if not (has_partition or has_suffix_range):
        raise ValueError("BigQuery query must include a partition or _TABLE_SUFFIX guard")


def enforce_cost_guard(bytes_scanned: int, *, allow_large_scan: bool) -> None:
    if bytes_scanned > MAX_BYTES_SCANNED and not allow_large_scan:
        raise ValueError("estimated scan exceeds 100 GB; pass --allow-large-scan to override")


def _slice_key(row: dict[str, Any]) -> tuple[str, str | None, str | None]:
    return (
        str(row.get("workflow_id") or ""),
        row.get("jbtd_id"),
        row.get("persona_id"),
    )


def apply_slice_k_min(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Apply connector-side k-min per independent slice."""

    slice_min: dict[tuple[str, str | None, str | None], int] = {}
    for row in rows:
        key = _slice_key(row)
        cohort_size = int(row.get("cohort_size") or 0)
        slice_min[key] = min(slice_min.get(key, cohort_size), cohort_size)

    emitted: list[dict[str, Any]] = []
    suppressed: dict[tuple[str, str | None, str | None], dict[str, Any]] = {}
    for row in rows:
        key = _slice_key(row)
        cohort_size = slice_min[key]
        if cohort_size < MIN_COHORT_SIZE:
            suppressed.setdefault(
                key,
                {
                    "workflow_id": key[0],
                    "jbtd_id": key[1],
                    "persona_id": key[2],
                    "cohort_size": cohort_size,
                    "suppression_reason": "INSUFFICIENT_VOLUME",
                },
            )
            continue
        emitted.append(row)

    return emitted, {
        "k_min": MIN_COHORT_SIZE,
        "suppressed_slices": list(suppressed.values()),
        "emitted_slices": len({_slice_key(row) for row in emitted}),
    }


def _weighted_numeric(rows: list[dict[str, Any]], key: str, *, integer: bool = False) -> float | int:
    total_weight = sum(max(0, int(row.get("event_count") or 0)) for row in rows)
    if total_weight <= 0:
        values = [float(row.get(key, 0) or 0) for row in rows]
        value = sum(values) / len(values) if values else 0.0
    else:
        value = (
            sum(float(row.get(key, 0) or 0) * max(0, int(row.get("event_count") or 0)) for row in rows)
            / total_weight
        )
    return int(round(value)) if integer else value


def coalesce_duplicate_slices(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Merge duplicate source-table aggregates into one V3 slice row."""

    grouped: dict[tuple[str, str | None, str | None], list[dict[str, Any]]] = {}
    for row in rows:
        grouped.setdefault(_slice_key(row), []).append(row)

    coalesced: list[dict[str, Any]] = []
    for key, slice_rows in grouped.items():
        if len(slice_rows) == 1:
            coalesced.append(slice_rows[0])
            continue

        base = dict(slice_rows[0])
        base["workflow_id"], base["jbtd_id"], base["persona_id"] = key
        base["source_table"] = ",".join(
            sorted({str(row.get("source_table")) for row in slice_rows if row.get("source_table")})
        )
        base["cohort_size"] = min(int(row.get("cohort_size") or 0) for row in slice_rows)
        base["event_count"] = sum(int(row.get("event_count") or 0) for row in slice_rows)

        for rate_key in (
            "completion_rate",
            "error_rate",
            "abandonment_rate",
            "recovery_rate",
            "verification_rate",
        ):
            base[rate_key] = _weighted_numeric(slice_rows, rate_key)

        for latency_key in ("p50_latency_ms", "p95_latency_ms"):
            base[latency_key] = _weighted_numeric(slice_rows, latency_key, integer=True)

        for prefix in ("freq", "engagement", "breadth"):
            for percentile in ("p10", "p50", "p90", "p99"):
                base[f"{prefix}_{percentile}"] = _weighted_numeric(
                    slice_rows,
                    f"{prefix}_{percentile}",
                )

        coalesced.append(base)
    return coalesced


def load_fixture_rows(fixture_dir: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for path in sorted(fixture_dir.glob("*.json")):
        if path.name.startswith("poisoned-"):
            continue
        rows.append(json.loads(path.read_text()))
    return rows


def _rate(row: dict[str, Any], key: str) -> float:
    value = float(row.get(key, 0) or 0)
    return min(1.0, max(0.0, value))


def _latency(row: dict[str, Any], key: str) -> int:
    return max(0, int(float(row.get(key, 0) or 0)))


def _distribution(row: dict[str, Any], nested_key: str, flat_prefix: str) -> dict[str, float]:
    if isinstance(row.get(nested_key), dict):
        source = row[nested_key]
        distribution = {
            "p10": float(source["p10"]),
            "p50": float(source["p50"]),
            "p90": float(source["p90"]),
            "p99": float(source["p99"]),
        }
    else:
        distribution = {
            "p10": float(row.get(f"{flat_prefix}_p10", 0) or 0),
            "p50": float(row.get(f"{flat_prefix}_p50", 0) or 0),
            "p90": float(row.get(f"{flat_prefix}_p90", 0) or 0),
            "p99": float(row.get(f"{flat_prefix}_p99", 0) or 0),
        }
    if not (distribution["p10"] <= distribution["p50"] <= distribution["p90"] <= distribution["p99"]):
        raise ValueError(f"{nested_key} distribution percentiles must be ordered")
    return distribution


def row_to_v3_payload(
    row: dict[str, Any],
    *,
    cohort_id: str,
    calibration_id: str,
    window_start: str,
    window_end: str,
) -> dict[str, Any]:
    payload = {
        "schema_version": "FT_V3_2026_05",
        "cohort_id": cohort_id,
        "workflow_id": str(row["workflow_id"]),
        "jbtd_id": row.get("jbtd_id"),
        "persona_id": row.get("persona_id"),
        "window_start": _iso_utc(window_start),
        "window_end": _iso_utc(window_end),
        "cohort_size": int(row["cohort_size"]),
        "calibration_id": calibration_id,
        "velocity": {
            "frequency": _distribution(row, "frequency", "freq"),
            "engagement": _distribution(row, "engagement", "engagement"),
            "breadth": _distribution(row, "breadth", "breadth"),
        },
        "quality_signals": {
            "completion_rate": _rate(row, "completion_rate"),
            "error_rate": _rate(row, "error_rate"),
            "abandonment_rate": _rate(row, "abandonment_rate"),
            "recovery_rate": _rate(row, "recovery_rate"),
            "verification_rate": _rate(row, "verification_rate"),
            "p50_latency_ms": _latency(row, "p50_latency_ms"),
            "p95_latency_ms": _latency(row, "p95_latency_ms"),
        },
        "privacy": {"person_level_fields_included": False},
    }
    validate_output_payload(payload)
    return payload


def rows_to_v3_payloads(
    rows: list[dict[str, Any]],
    *,
    cohort_id: str,
    calibration_id: str,
    window_start: str,
    window_end: str,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    for row in rows:
        guard_no_forbidden_fields(row)
    emitted, report = apply_slice_k_min(rows)
    emitted = coalesce_duplicate_slices(emitted)
    payloads = [
        row_to_v3_payload(
            row,
            cohort_id=cohort_id,
            calibration_id=calibration_id,
            window_start=window_start,
            window_end=window_end,
        )
        for row in emitted
    ]
    report = {
        **report,
        "payloads_emitted": len(payloads),
        "source_rows_reviewed": len(rows),
        "source_tables": sorted({str(row.get("source_table")) for row in rows if row.get("source_table")}),
    }
    return payloads, report


def _validate_machine_token(value: Any, path: str) -> None:
    if not isinstance(value, str) or not SAFE_TOKEN_RE.match(value):
        raise ValueError(f"{path} must be a machine-safe token")


def validate_output_payload(payload: dict[str, Any]) -> None:
    guard_no_forbidden_fields(payload)
    if set(payload) != OUTPUT_ALLOWED_TOP_LEVEL:
        extra = sorted(set(payload) - OUTPUT_ALLOWED_TOP_LEVEL)
        missing = sorted(OUTPUT_ALLOWED_TOP_LEVEL - set(payload))
        raise ValueError(f"unexpected V3 payload keys; extra={extra}, missing={missing}")
    if payload["schema_version"] != "FT_V3_2026_05":
        raise ValueError("unsupported V3 schema version")
    _validate_machine_token(payload["cohort_id"], "cohort_id")
    _validate_machine_token(payload["workflow_id"], "workflow_id")
    _validate_machine_token(payload["calibration_id"], "calibration_id")
    if int(payload["cohort_size"]) < 1:
        raise ValueError("cohort_size must be positive")
    if payload["privacy"] != {"person_level_fields_included": False}:
        raise ValueError("privacy marker must explicitly reject person-level fields")

    for dimension in ("frequency", "engagement", "breadth"):
        distribution = payload["velocity"].get(dimension)
        if set(distribution) != {"p10", "p50", "p90", "p99"}:
            raise ValueError(f"{dimension} distribution has unexpected shape")
        if not (distribution["p10"] <= distribution["p50"] <= distribution["p90"] <= distribution["p99"]):
            raise ValueError(f"{dimension} distribution percentiles must be ordered")

    for key in ("completion_rate", "error_rate", "abandonment_rate", "recovery_rate", "verification_rate"):
        value = payload["quality_signals"].get(key)
        if not isinstance(value, (int, float)) or not 0 <= value <= 1:
            raise ValueError(f"{key} must be a rate between 0 and 1")
    for key in ("p50_latency_ms", "p95_latency_ms"):
        value = payload["quality_signals"].get(key)
        if not isinstance(value, int) or value < 0:
            raise ValueError(f"{key} must be a nonnegative integer")
