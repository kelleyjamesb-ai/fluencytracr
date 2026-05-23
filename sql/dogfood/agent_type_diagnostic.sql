-- AGENT sub-surface diagnostic for FluencyTracr V2.3 dogfood.
--
-- Replace `PROJECT.DATASET.gce_events` with the scio-prod export table before
-- running. The final result emits aggregate sub-surface rows only.

DECLARE window_start TIMESTAMP DEFAULT TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 60 DAY);
DECLARE window_end TIMESTAMP DEFAULT CURRENT_TIMESTAMP();

WITH source_events AS (
  SELECT
    timestamp AS event_ts,
    DATE(timestamp) AS event_date,
    jsonPayload.type AS event_type,
    NULLIF(TRIM(jsonPayload.workflowrun.feature), '') AS workflow_feature,
    NULLIF(TRIM(COALESCE(
      jsonPayload.workflowrun.rootworkflowid,
      jsonPayload.workflowrun.rootWorkflowId,
      jsonPayload.workflowrun.workflowid,
      jsonPayload.workflowrun.workflowId
    )), '') AS root_workflow_id,
    NULLIF(TRIM(COALESCE(
      jsonPayload.workflowrun.runid,
      jsonPayload.workflowrun.runId,
      jsonPayload.workflowrun.id
    )), '') AS workflow_run_id,
    COALESCE(
      NULLIF(TRIM(jsonPayload.user.userid), ''),
      NULLIF(TRIM(jsonPayload.productsnapshot.user.id), ''),
      NULLIF(TRIM(jsonPayload.productsnapshot.user.canonicalid), '')
    ) AS user_key,
    LOWER(COALESCE(
      jsonPayload.workflow.workflowexecutionstatus,
      (SELECT ANY_VALUE(execution.status) FROM UNNEST(jsonPayload.workflowrun.workflowexecutions) AS execution),
      jsonPayload.action.executionstatus,
      jsonPayload.mcpusage.status,
      ''
    )) IN ('completed', 'complete', 'success', 'succeeded') AS completed,
    LOWER(COALESCE(
      jsonPayload.workflow.workflowexecutionstatus,
      (SELECT ANY_VALUE(execution.status) FROM UNNEST(jsonPayload.workflowrun.workflowexecutions) AS execution),
      jsonPayload.action.executionstatus,
      jsonPayload.mcpusage.status,
      ''
    )) IN ('error', 'errored', 'failed', 'failure') AS errored,
    LOWER(COALESCE(
      jsonPayload.workflow.workflowexecutionstatus,
      (SELECT ANY_VALUE(execution.status) FROM UNNEST(jsonPayload.workflowrun.workflowexecutions) AS execution),
      jsonPayload.action.executionstatus,
      jsonPayload.mcpusage.status,
      ''
    )) IN ('abandoned', 'cancelled', 'canceled', 'timeout') AS abandoned,
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
    )) IN ('completed', 'complete', 'success', 'succeeded') AS recovered,
    SAFE_CAST(COALESCE(
      jsonPayload.workflowrun.totalexecutionlatency,
      jsonPayload.workflowrun.totalresponsemillis,
      jsonPayload.workflowrun.firstresponsetokenmillis
    ) AS INT64) AS latency_ms
  FROM `PROJECT.DATASET.gce_events`
  WHERE timestamp >= window_start
    AND timestamp < window_end
),

product_snapshot_events AS (
  SELECT
    timestamp AS snapshot_ts,
    NULLIF(TRIM(jsonPayload.productsnapshot.workflow.workflowid), '') AS snapshot_workflow_id,
    jsonPayload.productsnapshot.workflow.isautonomousagent AS snapshot_is_autonomous,
    NULLIF(TRIM(jsonPayload.productsnapshot.workflow.name), '') AS snapshot_workflow_name,
    jsonPayload.productsnapshot.workflow.unlisted AS snapshot_unlisted
  FROM `PROJECT.DATASET.gce_events`
  WHERE timestamp < window_end
    AND jsonPayload.type = 'PRODUCT_SNAPSHOT'
),

product_snapshot_latest AS (
  SELECT
    snapshot_workflow_id,
    ARRAY_AGG(
      STRUCT(
        snapshot_is_autonomous AS is_autonomous,
        snapshot_workflow_name AS workflow_name,
        COALESCE(snapshot_unlisted, FALSE) AS unlisted
      )
      ORDER BY snapshot_ts DESC
      LIMIT 1
    )[OFFSET(0)] AS snapshot
  FROM product_snapshot_events
  WHERE snapshot_workflow_id IS NOT NULL
  GROUP BY snapshot_workflow_id
),

product_snapshots AS (
  SELECT
    snapshot_workflow_id,
    snapshot.is_autonomous AS is_autonomous,
    snapshot.workflow_name AS workflow_name,
    snapshot.unlisted AS unlisted
  FROM product_snapshot_latest
),

agent_runs AS (
  SELECT
    CASE
      WHEN snapshot.is_autonomous IS TRUE THEN 'agent:autonomous'
      WHEN snapshot.is_autonomous IS FALSE
        AND snapshot.workflow_name IS NOT NULL
        AND snapshot.unlisted IS FALSE THEN 'agent:workflow_named'
      -- TODO(AGENT_TYPES.md section 11): NO_SNAPSHOT AGENT runs default to
      -- ephemeral for V2.3 until exclusion vs inclusion is resolved.
      ELSE 'agent:ephemeral'
    END AS workflow_id,
    user_key,
    workflow_run_id,
    completed,
    errored,
    abandoned,
    recovered,
    latency_ms
  FROM source_events AS run
  LEFT JOIN product_snapshots AS snapshot
    ON snapshot.snapshot_workflow_id = run.root_workflow_id
  WHERE run.event_type = 'WORKFLOW_RUN'
    AND UPPER(run.workflow_feature) = 'AGENT'
    AND run.user_key IS NOT NULL
)

SELECT
  workflow_id,
  COUNT(DISTINCT user_key) AS cohort_size,
  COUNT(*) AS run_count,
  SAFE_DIVIDE(COUNTIF(completed IS TRUE), COUNT(*)) AS completion_rate,
  SAFE_DIVIDE(COUNTIF(errored IS TRUE), COUNT(*)) AS error_rate,
  SAFE_DIVIDE(COUNTIF(abandoned IS TRUE), COUNT(*)) AS abandonment_rate,
  SAFE_DIVIDE(COUNTIF(recovered IS TRUE), COUNT(*)) AS recovery_rate,
  APPROX_QUANTILES(latency_ms, 100)[OFFSET(50)] AS p50_latency_ms,
  APPROX_QUANTILES(latency_ms, 100)[OFFSET(95)] AS p95_latency_ms
FROM agent_runs
GROUP BY workflow_id
ORDER BY workflow_id;
