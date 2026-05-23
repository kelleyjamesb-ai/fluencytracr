-- V4 signal discovery probe: rapid refinement behavior.
--
-- Research-only. This query does not implement a V4 concept, schema, endpoint,
-- or product behavior. Replace `PROJECT.DATASET.gce_events` with the approved
-- GCE export table before running.
--
-- Stability testing: run the same query across multiple fixed windows by
-- editing window_start and window_end, for example consecutive 30-day or
-- 60-day windows. Do not promote any candidate signal from one distribution
-- shape alone.

DECLARE window_start TIMESTAMP DEFAULT TIMESTAMP('2026-03-23T00:00:00Z');
DECLARE window_end TIMESTAMP DEFAULT TIMESTAMP('2026-05-22T00:00:00Z');

WITH source_events AS (
  SELECT
    timestamp AS event_ts,
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
      NULLIF(TRIM(jsonPayload.workflowrun.sessiontrackingtoken), ''),
      NULLIF(TRIM(jsonPayload.chat.sessiontrackingtoken), ''),
      NULLIF(TRIM(jsonPayload.autocomplete.sessiontrackingtoken), ''),
      NULLIF(TRIM(jsonPayload.action.sessiontrackingtoken), ''),
      NULLIF(TRIM(jsonPayload.search.sessiontrackingtoken), ''),
      NULLIF(TRIM(jsonPayload.voicechat.sessiontrackingtoken), ''),
      NULLIF(TRIM(jsonPayload.gleanbotactivity.eventtrackingtoken), '')
    ) AS session_token,
    COALESCE(
      NULLIF(TRIM(jsonPayload.user.userid), ''),
      NULLIF(TRIM(jsonPayload.user.id), ''),
      NULLIF(TRIM(jsonPayload.user.canonicalid), ''),
      NULLIF(TRIM(jsonPayload.productsnapshot.user.id), ''),
      NULLIF(TRIM(jsonPayload.productsnapshot.user.canonicalid), '')
    ) AS user_key
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
    COALESCE(jsonPayload.productsnapshot.workflow.unlisted, FALSE) AS snapshot_unlisted
  FROM `PROJECT.DATASET.gce_events`
  WHERE timestamp < window_end
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

taxonomy_events AS (
  SELECT
    event.event_ts,
    event.user_key,
    event.session_token,
    COALESCE(event.workflow_run_id, event.root_workflow_id, event.session_token) AS strong_join_key,
    CASE
      WHEN event.event_type = 'WORKFLOW_RUN' AND UPPER(event.workflow_feature) = 'AGENT'
        AND snapshot.snapshot.is_autonomous IS TRUE THEN 'workflow:agent:autonomous'
      WHEN event.event_type = 'WORKFLOW_RUN' AND UPPER(event.workflow_feature) = 'AGENT'
        AND snapshot.snapshot.is_autonomous IS FALSE
        AND snapshot.snapshot.workflow_name IS NOT NULL
        AND snapshot.snapshot.unlisted IS FALSE THEN 'workflow:agent:workflow_named'
      WHEN event.event_type = 'WORKFLOW_RUN' AND UPPER(event.workflow_feature) = 'AGENT' THEN 'workflow:agent:ephemeral'
      WHEN event.event_type = 'WORKFLOW_RUN' THEN CONCAT('workflow:', event.workflow_feature)
      WHEN event.event_type IN ('SEARCH', 'AUTOCOMPLETE', 'MCP_USAGE', 'AI_SUMMARY') THEN CONCAT('standalone:', event.event_type)
      WHEN event.event_type = 'GLEAN_BOT_ACTIVITY' THEN 'standalone:GLEAN_BOT_ACTIVITY'
    END AS surface_id,
    CASE
      WHEN event.event_type = 'WORKFLOW_RUN' THEN 'workflow'
      WHEN event.event_type IN ('SEARCH', 'AUTOCOMPLETE', 'MCP_USAGE', 'AI_SUMMARY', 'GLEAN_BOT_ACTIVITY') THEN 'standalone'
    END AS surface_family
  FROM source_events AS event
  LEFT JOIN product_snapshots AS snapshot
    ON snapshot.snapshot_workflow_id = event.root_workflow_id
  WHERE event.user_key IS NOT NULL
    AND (
      (event.event_type = 'WORKFLOW_RUN' AND event.workflow_feature IS NOT NULL)
      OR (event.event_type IN ('SEARCH', 'AUTOCOMPLETE', 'MCP_USAGE', 'AI_SUMMARY') AND event.workflow_feature IS NULL)
      OR (
        event.event_type = 'GLEAN_BOT_ACTIVITY'
        AND event.workflow_feature IS NULL
        AND (
          event.session_token IS NULL
          OR NOT EXISTS (
            SELECT 1
            FROM workflow_sessions AS workflow_session
            WHERE workflow_session.session_token = event.session_token
          )
        )
      )
    )
),

ordered_events AS (
  SELECT
    *,
    LAG(event_ts) OVER (
      PARTITION BY user_key, surface_id, COALESCE(session_token, strong_join_key)
      ORDER BY event_ts
    ) AS prior_same_session_ts,
    LAG(event_ts) OVER (
      PARTITION BY user_key, surface_id
      ORDER BY event_ts
    ) AS prior_same_surface_ts
  FROM taxonomy_events
  WHERE surface_id IS NOT NULL
),

refinement_events AS (
  SELECT
    surface_family,
    surface_id,
    CASE
      WHEN session_token IS NOT NULL AND prior_same_session_ts IS NOT NULL THEN 'confirmed_same_session_refinement'
      WHEN prior_same_surface_ts IS NOT NULL THEN 'rapid_same_surface_reuse'
      ELSE 'first_observed_use'
    END AS refinement_evidence_type,
    user_key,
    COALESCE(session_token, strong_join_key, CONCAT(user_key, ':', surface_id)) AS internal_join_key,
    TIMESTAMP_DIFF(event_ts, COALESCE(prior_same_session_ts, prior_same_surface_ts), SECOND) AS seconds_since_prior
  FROM ordered_events
),

per_internal_join AS (
  SELECT
    surface_family,
    surface_id,
    refinement_evidence_type,
    internal_join_key,
    COUNT(*) AS observed_events,
    COUNTIF(seconds_since_prior IS NOT NULL) AS repeated_events,
    APPROX_QUANTILES(seconds_since_prior, 100 IGNORE NULLS)[OFFSET(50)] AS p50_seconds_since_prior
  FROM refinement_events
  GROUP BY surface_family, surface_id, refinement_evidence_type, internal_join_key
),

aggregate_metrics AS (
  SELECT
    surface_family,
    surface_id,
    refinement_evidence_type,
    COUNT(*) AS aggregate_join_key_count,
    SUM(observed_events) AS observed_event_count,
    SUM(repeated_events) AS repeated_event_count,
    APPROX_QUANTILES(repeated_events, 100)[OFFSET(50)] AS p50,
    APPROX_QUANTILES(repeated_events, 100)[OFFSET(90)] AS p90,
    APPROX_QUANTILES(repeated_events, 100)[OFFSET(99)] AS p99
  FROM per_internal_join
  WHERE refinement_evidence_type != 'first_observed_use'
  GROUP BY surface_family, surface_id, refinement_evidence_type
)

SELECT
  surface_family,
  surface_id AS workflow_family,
  refinement_evidence_type,
  aggregate_join_key_count,
  observed_event_count,
  repeated_event_count,
  p50,
  p90,
  p99,
  SAFE_DIVIDE(p90, NULLIF(p50, 0)) AS p90_over_p50,
  SAFE_DIVIDE(p99, NULLIF(p50, 0)) AS p99_over_p50
FROM aggregate_metrics
ORDER BY surface_family, workflow_family, refinement_evidence_type;
