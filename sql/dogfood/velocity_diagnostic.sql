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
    JSON_VALUE(jsonPayload, '$.type') AS event_type,
    JSON_VALUE(jsonPayload, '$.workflowrun.feature') AS workflow_feature,
    JSON_VALUE(jsonPayload, '$.session_token') AS session_token,
    COALESCE(
      JSON_VALUE(jsonPayload, '$.actor.stable_user_key'),
      JSON_VALUE(jsonPayload, '$.user.stable_user_key'),
      JSON_VALUE(jsonPayload, '$.user_id')
    ) AS user_key
  FROM `PROJECT.DATASET.gce_events`
  WHERE timestamp >= window_start
    AND timestamp < window_end
),

workflow_sessions AS (
  SELECT DISTINCT session_token
  FROM source_events
  WHERE event_type = 'WORKFLOW_RUN'
    AND workflow_feature IS NOT NULL
    AND session_token IS NOT NULL
),

workflow_surfaces AS (
  SELECT
    user_key,
    event_date,
    session_token,
    CONCAT('workflow:', workflow_feature) AS workflow_id,
    'workflow' AS surface_category
  FROM source_events
  WHERE event_type = 'WORKFLOW_RUN'
    AND workflow_feature IS NOT NULL
    AND user_key IS NOT NULL
),

standalone_search AS (
  SELECT user_key, event_date, session_token, 'standalone:SEARCH' AS workflow_id, 'standalone' AS surface_category
  FROM source_events
  WHERE event_type = 'SEARCH'
    AND user_key IS NOT NULL
),

standalone_autocomplete AS (
  SELECT user_key, event_date, session_token, 'standalone:AUTOCOMPLETE' AS workflow_id, 'standalone' AS surface_category
  FROM source_events
  WHERE event_type = 'AUTOCOMPLETE'
    AND user_key IS NOT NULL
),

standalone_mcp_usage AS (
  SELECT user_key, event_date, session_token, 'standalone:MCP_USAGE' AS workflow_id, 'standalone' AS surface_category
  FROM source_events
  WHERE event_type = 'MCP_USAGE'
    AND user_key IS NOT NULL
),

standalone_ai_summary AS (
  SELECT user_key, event_date, session_token, 'standalone:AI_SUMMARY' AS workflow_id, 'standalone' AS surface_category
  FROM source_events
  WHERE event_type = 'AI_SUMMARY'
    AND user_key IS NOT NULL
),

standalone_glean_bot_activity AS (
  SELECT
    bot.user_key,
    bot.event_date,
    bot.session_token,
    'standalone:GLEAN_BOT_ACTIVITY' AS workflow_id,
    'standalone' AS surface_category
  FROM source_events AS bot
  WHERE bot.event_type = 'GLEAN_BOT_ACTIVITY'
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

user_surface_activity AS (
  SELECT
    user_key,
    workflow_id,
    surface_category,
    COUNT(*) AS total_events,
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
  GROUP BY workflow_id, surface_category
)

SELECT
  workflow_id,
  surface_category,
  cohort_size,
  window_days,
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
