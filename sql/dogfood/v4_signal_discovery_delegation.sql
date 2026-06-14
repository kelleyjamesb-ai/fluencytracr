-- V4 signal discovery probe: delegation depth.
--
-- Research-only. This query uses governed surface and AGENT sub-surface
-- taxonomy to test candidate delegation buckets without productizing them.
-- Replace `PROJECT.DATASET.gce_events` with the approved GCE export table.
--
-- Stability testing: run unchanged logic across multiple fixed windows by
-- editing window_start and window_end. Do not promote a signal from
-- distribution shape alone.

DECLARE window_start TIMESTAMP DEFAULT TIMESTAMP('2026-03-23T00:00:00Z');
DECLARE window_end TIMESTAMP DEFAULT TIMESTAMP('2026-05-22T00:00:00Z');

WITH source_events AS (
  SELECT
    timestamp AS event_ts,
    jsonPayload.type AS event_type,
    NULLIF(TRIM(jsonPayload.workflowrun.feature), '') AS workflow_feature,
    NULLIF(TRIM(jsonPayload.workflowrun.rootworkflowid), '') AS root_workflow_id,
    NULLIF(TRIM(jsonPayload.workflowrun.runid), '') AS workflow_run_id,
    COALESCE(
      NULLIF(TRIM(jsonPayload.workflowrun.sessiontrackingtoken), ''),
      NULLIF(TRIM(jsonPayload.chat.sessiontrackingtoken), ''),
      NULLIF(TRIM(jsonPayload.search.sessiontrackingtoken), ''),
      NULLIF(TRIM(jsonPayload.autocomplete.sessiontrackingtoken), ''),
      NULLIF(TRIM(jsonPayload.action.sessiontrackingtoken), ''),
      NULLIF(TRIM(jsonPayload.gleanbotactivity.eventtrackingtoken), '')
    ) AS session_token,
    COALESCE(
      NULLIF(TRIM(jsonPayload.user.userid), ''),
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
    COALESCE(jsonPayload.productsnapshot.workflow.unlisted, FALSE) AS snapshot_unlisted,
    COALESCE(jsonPayload.productsnapshot.workflow.isdraftonly, TRUE) AS snapshot_isdraftonly
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
        snapshot_unlisted AS unlisted,
        snapshot_isdraftonly AS isdraftonly
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
    event.user_key,
    COALESCE(
      event.workflow_run_id,
      event.root_workflow_id,
      event.session_token,
      CONCAT(event.user_key, ':', CAST(event.event_ts AS STRING), ':', event.event_type)
    ) AS surface_join_key,
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
    snapshot.snapshot.workflow_name AS workflow_name,
    COALESCE(snapshot.snapshot.isdraftonly, TRUE) AS isdraftonly
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

-- Ambiguous surfaces are intentionally left unmapped and excluded from ratio
-- numerators. This avoids inventing semantics for autocomplete, bot activity,
-- or workflow features whose delegation meaning depends on local context.
-- Buckets are not mutually exclusive: named workflow agents intentionally
-- remain in structured_delegation while also contributing to reusable_leverage
-- when reusable fields support that narrower interpretation.
bucketed_events AS (
  SELECT
    user_key,
    surface_join_key,
    surface_id,
    'retrieval' AS delegation_bucket
  FROM taxonomy_events
  WHERE surface_id IN ('standalone:SEARCH', 'workflow:AI_ANSWER')

  UNION ALL

  SELECT
    user_key,
    surface_join_key,
    surface_id,
    'transformation' AS delegation_bucket
  FROM taxonomy_events
  WHERE surface_id IN ('workflow:CHAT', 'standalone:AI_SUMMARY')
    OR REGEXP_CONTAINS(LOWER(surface_id), r'(summary|summar|draft|write)')

  UNION ALL

  SELECT
    user_key,
    surface_join_key,
    surface_id,
    'exploratory_delegation' AS delegation_bucket
  FROM taxonomy_events
  WHERE surface_id = 'workflow:agent:ephemeral'

  UNION ALL

  SELECT
    user_key,
    surface_join_key,
    surface_id,
    'structured_delegation' AS delegation_bucket
  FROM taxonomy_events
  WHERE surface_id IN (
    'workflow:agent:autonomous',
    'workflow:agent:workflow_named',
    'standalone:MCP_USAGE'
  )

  UNION ALL

  SELECT
    user_key,
    surface_join_key,
    surface_id,
    'reusable_leverage' AS delegation_bucket
  FROM taxonomy_events
  WHERE surface_id = 'workflow:agent:workflow_named'
    AND workflow_name IS NOT NULL
    AND isdraftonly IS FALSE
),

per_user_bucket AS (
  SELECT
    delegation_bucket,
    user_key,
    COUNT(DISTINCT TO_JSON_STRING(STRUCT(user_key, surface_id, surface_join_key))) AS bucket_events,
    COUNT(DISTINCT surface_id) AS distinct_surfaces
  FROM bucketed_events
  WHERE delegation_bucket IS NOT NULL
  GROUP BY delegation_bucket, user_key
),

overall_taxonomy AS (
  SELECT
    COUNT(DISTINCT TO_JSON_STRING(STRUCT(user_key, surface_id, surface_join_key))) AS total_taxonomy_events
  FROM taxonomy_events
  WHERE surface_id IS NOT NULL
),

aggregate_metrics AS (
  SELECT
    bucket.delegation_bucket,
    COUNT(*) AS aggregate_user_count,
    SUM(bucket.bucket_events) AS aggregate_bucket_events,
    MAX(overall.total_taxonomy_events) AS aggregate_taxonomy_events,
    SAFE_DIVIDE(SUM(bucket.bucket_events), MAX(overall.total_taxonomy_events)) AS bucket_event_share,
    APPROX_QUANTILES(bucket.bucket_events, 100)[OFFSET(50)] AS p50,
    APPROX_QUANTILES(bucket.bucket_events, 100)[OFFSET(90)] AS p90,
    APPROX_QUANTILES(bucket.bucket_events, 100)[OFFSET(99)] AS p99
  FROM per_user_bucket AS bucket
  CROSS JOIN overall_taxonomy AS overall
  GROUP BY bucket.delegation_bucket
)

SELECT
  delegation_bucket,
  aggregate_user_count,
  aggregate_bucket_events,
  aggregate_taxonomy_events,
  bucket_event_share,
  p50,
  p90,
  p99,
  SAFE_DIVIDE(p90, NULLIF(p50, 0)) AS p90_over_p50,
  SAFE_DIVIDE(p99, NULLIF(p50, 0)) AS p99_over_p50
FROM aggregate_metrics
ORDER BY delegation_bucket;
