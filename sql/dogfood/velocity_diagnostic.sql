-- Taxonomy-aware velocity diagnostic for FluencyTracr dogfood.
--
-- Replace `PROJECT.DATASET.gce_events` with the scio-prod export table before
-- running. The final result intentionally emits aggregate percentile
-- distributions only; person-level rows stay inside BigQuery.

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
      NULLIF(TRIM(jsonPayload.chatfeedback.sessiontrackingtoken), ''),
      NULLIF(TRIM(jsonPayload.gleanbotactivity.eventtrackingtoken), '')
    ) AS session_token,
    -- Precise run/workflow identifier for verification events. The run id
    -- arrives here as tracking_token (e.g. chatfeedback.runid), NOT as
    -- workflow_run_id, so attribution must prefer it before the session token.
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

workflow_sessions AS (
  SELECT DISTINCT session_token
  FROM source_events
  WHERE event_type = 'WORKFLOW_RUN'
    AND session_token IS NOT NULL
),

workflow_surfaces AS (
  SELECT
    user_key,
    event_date,
    session_token,
    COALESCE(
      workflow_run_id,
      session_token,
      CONCAT(user_key, ':', CAST(event_ts AS STRING), ':', event_type)
    ) AS surface_join_key,
    CONCAT(
      'workflow:',
      CASE
        WHEN UPPER(workflow_feature) = 'AGENT' AND snapshot.is_autonomous IS TRUE THEN 'agent:autonomous'
        WHEN UPPER(workflow_feature) = 'AGENT'
          AND snapshot.is_autonomous IS FALSE
          AND snapshot.workflow_name IS NOT NULL
          AND snapshot.unlisted IS FALSE THEN 'agent:workflow_named'
        -- TODO(AGENT_TYPES.md section 11): NO_SNAPSHOT AGENT runs default to
        -- ephemeral for V2.3 until exclusion vs inclusion is resolved.
        WHEN UPPER(workflow_feature) = 'AGENT' THEN 'agent:ephemeral'
        ELSE workflow_feature
      END
    ) AS workflow_id,
    'workflow' AS surface_category
  FROM source_events
  LEFT JOIN product_snapshots AS snapshot
    ON snapshot.snapshot_workflow_id = root_workflow_id
  WHERE event_type = 'WORKFLOW_RUN'
    AND workflow_feature IS NOT NULL
    AND user_key IS NOT NULL
),

standalone_search AS (
  SELECT
    user_key,
    event_date,
    session_token,
    COALESCE(
      workflow_run_id,
      session_token,
      CONCAT(user_key, ':', CAST(event_ts AS STRING), ':', event_type)
    ) AS surface_join_key,
    'standalone:SEARCH' AS workflow_id,
    'standalone' AS surface_category
  FROM source_events
  WHERE event_type = 'SEARCH'
    AND workflow_feature IS NULL
    AND user_key IS NOT NULL
),

standalone_autocomplete AS (
  SELECT
    user_key,
    event_date,
    session_token,
    COALESCE(
      workflow_run_id,
      session_token,
      CONCAT(user_key, ':', CAST(event_ts AS STRING), ':', event_type)
    ) AS surface_join_key,
    'standalone:AUTOCOMPLETE' AS workflow_id,
    'standalone' AS surface_category
  FROM source_events
  WHERE event_type = 'AUTOCOMPLETE'
    AND workflow_feature IS NULL
    AND user_key IS NOT NULL
),

standalone_mcp_usage AS (
  SELECT
    user_key,
    event_date,
    session_token,
    COALESCE(
      workflow_run_id,
      session_token,
      CONCAT(user_key, ':', CAST(event_ts AS STRING), ':', event_type)
    ) AS surface_join_key,
    'standalone:MCP_USAGE' AS workflow_id,
    'standalone' AS surface_category
  FROM source_events
  WHERE event_type = 'MCP_USAGE'
    AND workflow_feature IS NULL
    AND user_key IS NOT NULL
),

standalone_ai_summary AS (
  SELECT
    user_key,
    event_date,
    session_token,
    COALESCE(
      workflow_run_id,
      session_token,
      CONCAT(user_key, ':', CAST(event_ts AS STRING), ':', event_type)
    ) AS surface_join_key,
    'standalone:AI_SUMMARY' AS workflow_id,
    'standalone' AS surface_category
  FROM source_events
  WHERE event_type = 'AI_SUMMARY'
    AND workflow_feature IS NULL
    AND user_key IS NOT NULL
),

standalone_glean_bot_activity AS (
  SELECT
    bot.user_key,
    bot.event_date,
    bot.session_token,
    COALESCE(
      bot.workflow_run_id,
      bot.session_token,
      CONCAT(bot.user_key, ':', CAST(bot.event_ts AS STRING), ':', bot.event_type)
    ) AS surface_join_key,
    'standalone:GLEAN_BOT_ACTIVITY' AS workflow_id,
    'standalone' AS surface_category
  FROM source_events AS bot
  WHERE bot.event_type = 'GLEAN_BOT_ACTIVITY'
    AND bot.workflow_feature IS NULL
    AND bot.user_key IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM workflow_sessions AS workflow_session
      WHERE workflow_session.session_token = bot.session_token
    )
),

-- Verification signals such as CHAT_CITATION_CLICK, AI_ANSWER_VOTE,
-- AI_SUMMARY_VOTE, and SEARCH_FEEDBACK are attribute joins onto parent records,
-- not standalone velocity surfaces. CLIENT_EVENT, PRODUCT_SNAPSHOT, LLM_CALL,
-- and ACTION are explicitly excluded from surface volume for the same
-- anti-double-count reason.
taxonomy_surfaces AS (
  SELECT * FROM workflow_surfaces
  UNION ALL SELECT * FROM standalone_search
  UNION ALL SELECT * FROM standalone_autocomplete
  UNION ALL SELECT * FROM standalone_mcp_usage
  UNION ALL SELECT * FROM standalone_ai_summary
  UNION ALL SELECT * FROM standalone_glean_bot_activity
),

surface_join_aliases AS (
  SELECT DISTINCT
    user_key,
    surface_join_key,
    surface_join_key AS attribution_join_key
  FROM taxonomy_surfaces
  UNION DISTINCT
  SELECT DISTINCT
    user_key,
    surface_join_key,
    session_token AS attribution_join_key
  FROM taxonomy_surfaces
  WHERE session_token IS NOT NULL
),

verification_signals AS (
  SELECT
    user_key,
    attribution_join_key,
    event_type AS verification_event_type
  FROM source_events,
    UNNEST(
      IF(
        workflow_run_id IS NOT NULL OR root_workflow_id IS NOT NULL OR tracking_token IS NOT NULL,
        [workflow_run_id, root_workflow_id, tracking_token],
        [session_token]
      )
    ) AS attribution_join_key
  WHERE event_type IN (
      'CHAT_CITATION_CLICK',
      'CHAT_CITATIONS',
      'AI_ANSWER_VOTE',
      'AI_SUMMARY_VOTE',
      'SEARCH_FEEDBACK',
      'CHAT_FEEDBACK'
    )
    AND user_key IS NOT NULL
    AND attribution_join_key IS NOT NULL
),

surface_verification AS (
  SELECT
    surface.workflow_id,
    surface.surface_category,
    COUNT(*) AS verification_signal_count,
    COUNT(DISTINCT verification.user_key) AS verified_user_count,
    COUNT(DISTINCT surface.surface_join_key) AS verified_surface_count
  FROM taxonomy_surfaces AS surface
  JOIN surface_join_aliases AS alias
    ON alias.surface_join_key = surface.surface_join_key
    AND alias.user_key = surface.user_key
  JOIN verification_signals AS verification
    ON verification.attribution_join_key = alias.attribution_join_key
    AND verification.user_key = surface.user_key
  GROUP BY surface.workflow_id, surface.surface_category
),

user_surface_activity AS (
  SELECT
    user_key,
    workflow_id,
    surface_category,
    COUNT(*) AS total_events,
    COUNT(DISTINCT surface_join_key) AS surface_interaction_count,
    COUNT(DISTINCT event_date) AS active_days,
    SAFE_DIVIDE(COUNT(*), COUNT(DISTINCT event_date)) AS runs_per_active_day
  FROM taxonomy_surfaces
  GROUP BY user_key, workflow_id, surface_category
),

user_breadth AS (
  SELECT
    user_key,
    COUNT(DISTINCT workflow_id) AS distinct_surfaces_touched
  FROM taxonomy_surfaces
  GROUP BY user_key
),

surface_with_breadth AS (
  SELECT
    activity.workflow_id,
    activity.surface_category,
    activity.user_key,
    activity.surface_interaction_count,
    activity.active_days,
    activity.runs_per_active_day,
    breadth.distinct_surfaces_touched
  FROM user_surface_activity AS activity
  JOIN user_breadth AS breadth USING (user_key)
),

surface_percentiles AS (
  SELECT
    workflow_id,
    surface_category,
    COUNT(DISTINCT user_key) AS cohort_size,
    DATE_DIFF(DATE(window_end), DATE(window_start), DAY) AS window_days,
    SUM(surface_interaction_count) AS surface_interaction_count,
    COALESCE(MAX(verification.verification_signal_count), 0) AS verification_signal_count,
    COALESCE(MAX(verification.verified_user_count), 0) AS verified_user_count,
    SAFE_DIVIDE(
      COALESCE(MAX(verification.verified_surface_count), 0),
      SUM(surface_interaction_count)
    ) AS verification_rate,
    APPROX_QUANTILES(runs_per_active_day, 100)[OFFSET(10)] AS freq_p10,
    APPROX_QUANTILES(runs_per_active_day, 100)[OFFSET(50)] AS freq_p50,
    APPROX_QUANTILES(runs_per_active_day, 100)[OFFSET(90)] AS freq_p90,
    APPROX_QUANTILES(runs_per_active_day, 100)[OFFSET(99)] AS freq_p99,
    APPROX_QUANTILES(active_days, 100)[OFFSET(10)] AS engagement_p10,
    APPROX_QUANTILES(active_days, 100)[OFFSET(50)] AS engagement_p50,
    APPROX_QUANTILES(active_days, 100)[OFFSET(90)] AS engagement_p90,
    APPROX_QUANTILES(active_days, 100)[OFFSET(99)] AS engagement_p99,
    APPROX_QUANTILES(distinct_surfaces_touched, 100)[OFFSET(10)] AS breadth_p10,
    APPROX_QUANTILES(distinct_surfaces_touched, 100)[OFFSET(50)] AS breadth_p50,
    APPROX_QUANTILES(distinct_surfaces_touched, 100)[OFFSET(90)] AS breadth_p90,
    APPROX_QUANTILES(distinct_surfaces_touched, 100)[OFFSET(99)] AS breadth_p99
  FROM surface_with_breadth
  LEFT JOIN surface_verification AS verification USING (workflow_id, surface_category)
  GROUP BY workflow_id, surface_category
)

SELECT
  workflow_id,
  surface_category,
  cohort_size,
  window_days,
  surface_interaction_count,
  verification_signal_count,
  verified_user_count,
  verification_rate,
  freq_p10,
  freq_p50,
  freq_p90,
  freq_p99,
  engagement_p10,
  engagement_p50,
  engagement_p90,
  engagement_p99,
  breadth_p10,
  breadth_p50,
  breadth_p90,
  breadth_p99
FROM surface_percentiles
ORDER BY surface_category, workflow_id;
