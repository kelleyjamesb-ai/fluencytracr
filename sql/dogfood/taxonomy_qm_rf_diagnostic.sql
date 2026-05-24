-- Taxonomy-aware Quality Multiplier / Reliability Factor diagnostic.
--
-- Dogfood/research-only. This query emits aggregate surface rows aligned to
-- docs/concepts/SURFACES.md, docs/concepts/AGENT_TYPES.md, and
-- docs/concepts/WORK_MODES.md so QM/RF calibration can use the same surface
-- language as Velocity and Depth.
--
-- Replace `PROJECT.DATASET.gce_events` with the approved GCE export table.
-- The final result is aggregate-only. Person-level rows remain inside
-- BigQuery. Never export user IDs, emails, names, raw prompts, raw outputs,
-- transcripts, or raw event rows from this diagnostic.

DECLARE window_start TIMESTAMP DEFAULT TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 60 DAY);
DECLARE window_end TIMESTAMP DEFAULT CURRENT_TIMESTAMP();

WITH source_events AS (
  SELECT
    timestamp AS event_ts,
    DATE(timestamp) AS event_date,
    jsonPayload.type AS event_type,
    NULLIF(TRIM(jsonPayload.workflowrun.feature), '') AS workflow_feature,
    NULLIF(TRIM(jsonPayload.workflowrun.rootworkflowid), '') AS root_workflow_id,
    NULLIF(TRIM(jsonPayload.workflowrun.runid), '') AS workflow_run_id,
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
      NULLIF(TRIM(jsonPayload.productsnapshot.user.id), ''),
      NULLIF(TRIM(jsonPayload.productsnapshot.user.canonicalid), '')
    ) AS user_key,
    LOWER(COALESCE(
      jsonPayload.workflow.workflowexecutionstatus,
      (SELECT ANY_VALUE(execution.status) FROM UNNEST(jsonPayload.workflowrun.workflowexecutions) AS execution),
      jsonPayload.action.executionstatus,
      jsonPayload.mcpusage.status,
      ''
    )) AS execution_status,
    EXISTS (
      SELECT 1
      FROM UNNEST(jsonPayload.workflowrun.workflowexecutions) AS execution
      WHERE execution.errortype IS NOT NULL
    ) AS has_execution_error,
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
    COALESCE(jsonPayload.productsnapshot.workflow.unlisted, FALSE) AS snapshot_unlisted
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
        snapshot_unlisted AS unlisted
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

workflow_sessions AS (
  SELECT DISTINCT session_token
  FROM source_events
  WHERE event_type = 'WORKFLOW_RUN'
    AND session_token IS NOT NULL
),

taxonomy_surface_events AS (
  SELECT
    event.user_key,
    event.event_date,
    event.event_ts,
    event.session_token,
    COALESCE(
      event.workflow_run_id,
      event.root_workflow_id,
      event.session_token,
      CONCAT(event.user_key, ':', CAST(event.event_ts AS STRING), ':', event.event_type)
    ) AS surface_join_key,
    CONCAT(
      'workflow:',
      CASE
        WHEN UPPER(event.workflow_feature) = 'AGENT' AND snapshot.is_autonomous IS TRUE THEN 'agent:autonomous'
        WHEN UPPER(event.workflow_feature) = 'AGENT'
          AND snapshot.is_autonomous IS FALSE
          AND snapshot.workflow_name IS NOT NULL
          AND snapshot.unlisted IS FALSE THEN 'agent:workflow_named'
        -- TODO(AGENT_TYPES.md section 11): NO_SNAPSHOT AGENT runs default to
        -- ephemeral for V2.3 until exclusion vs inclusion is resolved.
        WHEN UPPER(event.workflow_feature) = 'AGENT' THEN 'agent:ephemeral'
        ELSE event.workflow_feature
      END
    ) AS workflow_id,
    'workflow' AS surface_category,
    CASE
      WHEN UPPER(event.workflow_feature) = 'AI_ANSWER' THEN 'retrieval'
      WHEN UPPER(event.workflow_feature) IN ('CHAT', 'GLEANBOT', 'VOICE_CHAT') THEN 'conversational_work'
      WHEN UPPER(event.workflow_feature) IN ('THREAD_SUMMARIZER', 'SUPPORT_NEXT_STEPS') THEN 'synthesis_transformation'
      WHEN UPPER(event.workflow_feature) IN (
        'INLINE_MENU',
        'AGENT_LIVE_PREVIEW',
        'EMBEDDED_INTEGRATION_SUPPORT'
      ) THEN 'embedded_assist'
      WHEN UPPER(event.workflow_feature) = 'AGENT' AND snapshot.is_autonomous IS TRUE THEN 'delegated_execution'
      WHEN UPPER(event.workflow_feature) = 'AGENT'
        AND snapshot.is_autonomous IS FALSE
        AND snapshot.workflow_name IS NOT NULL
        AND snapshot.unlisted IS FALSE THEN 'reusable_workflow_skill'
      WHEN UPPER(event.workflow_feature) = 'AGENT' THEN 'exploratory_agent_work'
      WHEN UPPER(event.workflow_feature) = 'MCP_AGENT_WORKFLOW' THEN 'delegated_execution'
      ELSE 'specialized_workflow'
    END AS work_mode,
    CASE
      WHEN event.execution_status IN ('completed', 'complete', 'success', 'succeeded') THEN TRUE
      ELSE FALSE
    END AS completed,
    CASE
      WHEN event.execution_status IN ('error', 'errored', 'failed', 'failure')
        OR event.has_execution_error THEN TRUE
      ELSE FALSE
    END AS errored,
    CASE
      WHEN event.execution_status IN ('abandoned', 'cancelled', 'canceled', 'timeout') THEN TRUE
      ELSE FALSE
    END AS abandoned,
    event.has_execution_error
      AND event.execution_status IN ('completed', 'complete', 'success', 'succeeded') AS recovered,
    event.latency_ms,
    'workflow_status' AS metric_source
  FROM source_events AS event
  LEFT JOIN product_snapshots AS snapshot
    ON snapshot.snapshot_workflow_id = event.root_workflow_id
  WHERE event.event_type = 'WORKFLOW_RUN'
    AND event.workflow_feature IS NOT NULL
    AND event.user_key IS NOT NULL

  UNION ALL

  SELECT
    event.user_key,
    event.event_date,
    event.event_ts,
    event.session_token,
    COALESCE(
      event.workflow_run_id,
      event.session_token,
      CONCAT(event.user_key, ':', CAST(event.event_ts AS STRING), ':', event.event_type)
    ) AS surface_join_key,
    CONCAT('standalone:', event.event_type) AS workflow_id,
    'standalone' AS surface_category,
    CASE
      WHEN event.event_type = 'SEARCH' THEN 'retrieval'
      WHEN event.event_type = 'AI_SUMMARY' THEN 'synthesis_transformation'
      WHEN event.event_type = 'AUTOCOMPLETE' THEN 'embedded_assist'
      WHEN event.event_type = 'MCP_USAGE' THEN 'delegated_execution'
      ELSE 'specialized_workflow'
    END AS work_mode,
    TRUE AS completed,
    FALSE AS errored,
    FALSE AS abandoned,
    FALSE AS recovered,
    NULL AS latency_ms,
    'observed_event_proxy' AS metric_source
  FROM source_events AS event
  WHERE event.event_type IN ('SEARCH', 'AUTOCOMPLETE', 'MCP_USAGE', 'AI_SUMMARY')
    AND event.workflow_feature IS NULL
    AND event.user_key IS NOT NULL

  UNION ALL

  SELECT
    bot.user_key,
    bot.event_date,
    bot.event_ts,
    bot.session_token,
    COALESCE(
      bot.workflow_run_id,
      bot.session_token,
      CONCAT(bot.user_key, ':', CAST(bot.event_ts AS STRING), ':', bot.event_type)
    ) AS surface_join_key,
    'standalone:GLEAN_BOT_ACTIVITY' AS workflow_id,
    'standalone' AS surface_category,
    'conversational_work' AS work_mode,
    TRUE AS completed,
    FALSE AS errored,
    FALSE AS abandoned,
    FALSE AS recovered,
    NULL AS latency_ms,
    'observed_event_proxy' AS metric_source
  FROM source_events AS bot
  WHERE bot.event_type = 'GLEAN_BOT_ACTIVITY'
    AND bot.workflow_feature IS NULL
    AND bot.user_key IS NOT NULL
    AND (
      bot.session_token IS NULL
      OR NOT EXISTS (
        SELECT 1
        FROM workflow_sessions AS workflow_session
        WHERE workflow_session.session_token = bot.session_token
      )
    )
),

surface_join_aliases AS (
  SELECT DISTINCT
    user_key,
    surface_join_key,
    surface_join_key AS attribution_join_key
  FROM taxonomy_surface_events
  UNION DISTINCT
  SELECT DISTINCT
    user_key,
    surface_join_key,
    session_token AS attribution_join_key
  FROM taxonomy_surface_events
  WHERE session_token IS NOT NULL
),

verification_signals AS (
  SELECT
    user_key,
    COALESCE(
      workflow_run_id,
      session_token,
      CONCAT(user_key, ':', CAST(event_ts AS STRING), ':', event_type)
    ) AS attribution_join_key,
    event_type AS verification_event_type
  FROM source_events
  WHERE event_type IN (
      'CHAT_CITATION_CLICK',
      'CHAT_FEEDBACK',
      'AI_ANSWER_VOTE',
      'AI_SUMMARY_VOTE',
      'SEARCH_FEEDBACK'
    )
    AND user_key IS NOT NULL
),

surface_verification AS (
  SELECT
    surface.workflow_id,
    surface.surface_category,
    COUNT(*) AS verification_signal_count,
    COUNT(DISTINCT verification.user_key) AS verified_user_count,
    COUNT(DISTINCT surface.surface_join_key) AS verified_surface_count
  FROM taxonomy_surface_events AS surface
  JOIN surface_join_aliases AS alias
    ON alias.surface_join_key = surface.surface_join_key
    AND alias.user_key = surface.user_key
  JOIN verification_signals AS verification
    ON verification.attribution_join_key = alias.attribution_join_key
    AND verification.user_key = surface.user_key
  GROUP BY surface.workflow_id, surface.surface_category
),

surface_aggregates AS (
  SELECT
    surface.workflow_id,
    surface.surface_category,
    surface.work_mode,
    COUNT(DISTINCT surface.user_key) AS distinct_users,
    COUNT(DISTINCT surface.surface_join_key) AS real_cohort_size,
    DATE(window_start) AS window_start,
    DATE(window_end) AS window_end,
    DATE_DIFF(DATE(window_end), DATE(window_start), DAY) AS window_days,
    SAFE_DIVIDE(COUNTIF(surface.completed), COUNT(*)) AS completion_rate,
    SAFE_DIVIDE(COUNTIF(surface.errored), COUNT(*)) AS error_rate,
    SAFE_DIVIDE(COUNTIF(surface.abandoned), COUNT(*)) AS abandonment_rate,
    CASE
      WHEN COUNTIF(surface.errored) = 0 THEN 1.0
      ELSE SAFE_DIVIDE(COUNTIF(surface.recovered), COUNTIF(surface.errored))
    END AS recovery_rate,
    SAFE_DIVIDE(
      COALESCE(MAX(verification.verified_surface_count), 0),
      COUNT(DISTINCT surface.surface_join_key)
    ) AS verification_rate,
    COALESCE(MAX(verification.verification_signal_count), 0) AS verification_signal_count,
    COALESCE(MAX(verification.verified_user_count), 0) AS verified_user_count,
    APPROX_QUANTILES(surface.latency_ms, 100 IGNORE NULLS)[OFFSET(50)] AS p50_latency_ms,
    APPROX_QUANTILES(surface.latency_ms, 100 IGNORE NULLS)[OFFSET(95)] AS p95_latency_ms,
    SAFE_DIVIDE(COUNT(DISTINCT surface.surface_join_key), COUNT(DISTINCT surface.user_key)) AS avg_runs_per_user,
    STRING_AGG(DISTINCT surface.metric_source ORDER BY surface.metric_source) AS metric_sources
  FROM taxonomy_surface_events AS surface
  LEFT JOIN surface_verification AS verification USING (workflow_id, surface_category)
  GROUP BY surface.workflow_id, surface.surface_category, surface.work_mode
)

SELECT
  workflow_id,
  surface_category,
  work_mode,
  real_cohort_size,
  distinct_users,
  window_start,
  window_end,
  window_days,
  completion_rate,
  error_rate,
  abandonment_rate,
  recovery_rate,
  verification_rate,
  verification_signal_count,
  verified_user_count,
  COALESCE(p50_latency_ms, 0) AS p50_latency_ms,
  COALESCE(p95_latency_ms, 0) AS p95_latency_ms,
  avg_runs_per_user,
  metric_sources
FROM surface_aggregates
ORDER BY surface_category, work_mode, workflow_id;
