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
    JSON_VALUE(jsonPayload, '$.type') AS event_type,
    NULLIF(TRIM(JSON_VALUE(jsonPayload, '$.workflowrun.feature')), '') AS workflow_feature,
    NULLIF(TRIM(COALESCE(
      JSON_VALUE(jsonPayload, '$.workflowrun.rootworkflowid'),
      JSON_VALUE(jsonPayload, '$.workflowrun.rootWorkflowId'),
      JSON_VALUE(jsonPayload, '$.workflowrun.workflowid'),
      JSON_VALUE(jsonPayload, '$.workflowrun.workflowId')
    )), '') AS root_workflow_id,
    NULLIF(TRIM(COALESCE(
      JSON_VALUE(jsonPayload, '$.workflowrun.runId'),
      JSON_VALUE(jsonPayload, '$.workflowrun.id'),
      JSON_VALUE(jsonPayload, '$.workflow_run_id'),
      JSON_VALUE(jsonPayload, '$.run_id')
    )), '') AS workflow_run_id,
    COALESCE(
      JSON_VALUE(jsonPayload, '$.actor.stable_user_key'),
      JSON_VALUE(jsonPayload, '$.user.stable_user_key'),
      JSON_VALUE(jsonPayload, '$.user_id')
    ) AS user_key,
    SAFE_CAST(JSON_VALUE(jsonPayload, '$.workflowrun.completed') AS BOOL) AS completed,
    SAFE_CAST(JSON_VALUE(jsonPayload, '$.workflowrun.error') AS BOOL) AS errored,
    SAFE_CAST(JSON_VALUE(jsonPayload, '$.workflowrun.abandoned') AS BOOL) AS abandoned,
    SAFE_CAST(JSON_VALUE(jsonPayload, '$.workflowrun.recovered') AS BOOL) AS recovered,
    SAFE_CAST(JSON_VALUE(jsonPayload, '$.workflowrun.latency_ms') AS INT64) AS latency_ms
  FROM `PROJECT.DATASET.gce_events`
  WHERE timestamp >= window_start
    AND timestamp < window_end
),

product_snapshot_events AS (
  SELECT
    timestamp AS snapshot_ts,
    NULLIF(TRIM(JSON_VALUE(jsonPayload, '$.productsnapshot.workflow.workflowid')), '') AS snapshot_workflow_id,
    SAFE_CAST(JSON_VALUE(jsonPayload, '$.productsnapshot.workflow.isautonomousagent') AS BOOL) AS snapshot_is_autonomous,
    NULLIF(TRIM(JSON_VALUE(jsonPayload, '$.productsnapshot.workflow.name')), '') AS snapshot_workflow_name,
    SAFE_CAST(JSON_VALUE(jsonPayload, '$.productsnapshot.workflow.unlisted') AS BOOL) AS snapshot_unlisted
  FROM `PROJECT.DATASET.gce_events`
  WHERE timestamp < window_end
    AND JSON_VALUE(jsonPayload, '$.type') = 'PRODUCT_SNAPSHOT'
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
