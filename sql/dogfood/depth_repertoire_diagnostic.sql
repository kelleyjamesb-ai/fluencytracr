-- Depth Repertoire diagnostic for FluencyTracr dogfood research.
--
-- Replace `PROJECT.DATASET.gce_events` with the scio-prod export table before
-- running. This diagnostic is research-only and emits aggregate rows only. It
-- never emits user IDs, emails, names, raw prompts, raw outputs, transcripts,
-- or raw event rows.
--
-- Purpose:
--   Test the V4 Depth spine:
--     Depth = Surface Repertoire x Repeat Use / Refinement
--
-- The query computes person-level intermediate statistics inside BigQuery, then
-- emits only aggregate percentile distributions and bucket counts.

DECLARE window_start TIMESTAMP DEFAULT TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 60 DAY);
DECLARE window_end TIMESTAMP DEFAULT CURRENT_TIMESTAMP();

WITH source_events AS (
  SELECT
    timestamp AS event_ts,
    DATE(timestamp) AS event_date,
    jsonPayload.type AS event_type,
    NULLIF(TRIM(jsonPayload.workflowrun.feature), '') AS workflow_feature,
    NULLIF(TRIM(jsonPayload.workflowrun.runid), '') AS workflow_run_id,
    COALESCE(
      NULLIF(TRIM(jsonPayload.workflowrun.sessiontrackingtoken), ''),
      NULLIF(TRIM(jsonPayload.chat.sessiontrackingtoken), ''),
      NULLIF(TRIM(jsonPayload.autocomplete.sessiontrackingtoken), ''),
      NULLIF(TRIM(jsonPayload.search.sessiontrackingtoken), ''),
      NULLIF(TRIM(jsonPayload.voicechat.sessiontrackingtoken), ''),
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

workflow_sessions AS (
  SELECT DISTINCT session_token
  FROM source_events
  WHERE event_type = 'WORKFLOW_RUN'
    AND session_token IS NOT NULL
),

taxonomy_surfaces AS (
  SELECT
    user_key,
    event_date,
    COALESCE(
      workflow_run_id,
      session_token,
      CONCAT(user_key, ':', CAST(event_ts AS STRING), ':', event_type)
    ) AS interaction_key,
    CONCAT('workflow:', workflow_feature) AS surface_id,
    'workflow' AS surface_category
  FROM source_events
  WHERE event_type = 'WORKFLOW_RUN'
    AND workflow_feature IS NOT NULL
    AND user_key IS NOT NULL

  UNION ALL

  SELECT
    user_key,
    event_date,
    COALESCE(
      workflow_run_id,
      session_token,
      CONCAT(user_key, ':', CAST(event_ts AS STRING), ':', event_type)
    ) AS interaction_key,
    CONCAT('standalone:', event_type) AS surface_id,
    'standalone' AS surface_category
  FROM source_events
  WHERE event_type IN ('SEARCH', 'AUTOCOMPLETE', 'MCP_USAGE', 'AI_SUMMARY')
    AND workflow_feature IS NULL
    AND user_key IS NOT NULL

  UNION ALL

  SELECT
    bot.user_key,
    bot.event_date,
    COALESCE(
      bot.workflow_run_id,
      bot.session_token,
      CONCAT(bot.user_key, ':', CAST(bot.event_ts AS STRING), ':', bot.event_type)
    ) AS interaction_key,
    'standalone:GLEAN_BOT_ACTIVITY' AS surface_id,
    'standalone' AS surface_category
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

per_user_surface AS (
  SELECT
    user_key,
    surface_id,
    ANY_VALUE(surface_category) AS surface_category,
    COUNT(DISTINCT event_date) AS active_days_on_surface,
    COUNT(DISTINCT interaction_key) AS interactions_on_surface
  FROM taxonomy_surfaces
  GROUP BY user_key, surface_id
),

per_user_depth AS (
  SELECT
    user_key,
    COUNT(DISTINCT surface_id) AS surface_repertoire,
    COUNTIF(interactions_on_surface >= 2) AS repeated_surface_count,
    COUNTIF(active_days_on_surface >= 2) AS multi_day_surface_count,
    SUM(interactions_on_surface) AS total_interactions,
    SUM(active_days_on_surface) AS summed_surface_active_days,
    COUNTIF(surface_category = 'workflow') AS workflow_surface_count,
    COUNTIF(surface_category = 'standalone') AS standalone_surface_count
  FROM per_user_surface
  GROUP BY user_key
),

overall_depth AS (
  SELECT
    'overall' AS segment,
    COUNT(*) AS cohort_size,
    APPROX_QUANTILES(surface_repertoire, 100)[OFFSET(10)] AS repertoire_p10,
    APPROX_QUANTILES(surface_repertoire, 100)[OFFSET(50)] AS repertoire_p50,
    APPROX_QUANTILES(surface_repertoire, 100)[OFFSET(90)] AS repertoire_p90,
    APPROX_QUANTILES(surface_repertoire, 100)[OFFSET(99)] AS repertoire_p99,
    APPROX_QUANTILES(repeated_surface_count, 100)[OFFSET(10)] AS repeated_surface_p10,
    APPROX_QUANTILES(repeated_surface_count, 100)[OFFSET(50)] AS repeated_surface_p50,
    APPROX_QUANTILES(repeated_surface_count, 100)[OFFSET(90)] AS repeated_surface_p90,
    APPROX_QUANTILES(repeated_surface_count, 100)[OFFSET(99)] AS repeated_surface_p99,
    APPROX_QUANTILES(multi_day_surface_count, 100)[OFFSET(10)] AS multi_day_surface_p10,
    APPROX_QUANTILES(multi_day_surface_count, 100)[OFFSET(50)] AS multi_day_surface_p50,
    APPROX_QUANTILES(multi_day_surface_count, 100)[OFFSET(90)] AS multi_day_surface_p90,
    APPROX_QUANTILES(multi_day_surface_count, 100)[OFFSET(99)] AS multi_day_surface_p99,
    APPROX_QUANTILES(surface_repertoire * repeated_surface_count, 100)[OFFSET(50)] AS depth_candidate_p50,
    APPROX_QUANTILES(surface_repertoire * repeated_surface_count, 100)[OFFSET(90)] AS depth_candidate_p90,
    APPROX_QUANTILES(surface_repertoire * repeated_surface_count, 100)[OFFSET(99)] AS depth_candidate_p99,
    APPROX_QUANTILES(workflow_surface_count, 100)[OFFSET(50)] AS workflow_surface_p50,
    APPROX_QUANTILES(standalone_surface_count, 100)[OFFSET(50)] AS standalone_surface_p50
  FROM per_user_depth
),

repertoire_buckets AS (
  SELECT
    CASE
      WHEN surface_repertoire = 1 THEN '01_single_surface'
      WHEN surface_repertoire BETWEEN 2 AND 3 THEN '02_two_to_three_surfaces'
      WHEN surface_repertoire BETWEEN 4 AND 6 THEN '03_four_to_six_surfaces'
      WHEN surface_repertoire BETWEEN 7 AND 10 THEN '04_seven_to_ten_surfaces'
      ELSE '05_eleven_plus_surfaces'
    END AS segment,
    COUNT(*) AS cohort_size,
    APPROX_QUANTILES(surface_repertoire, 100)[OFFSET(10)] AS repertoire_p10,
    APPROX_QUANTILES(surface_repertoire, 100)[OFFSET(50)] AS repertoire_p50,
    APPROX_QUANTILES(surface_repertoire, 100)[OFFSET(90)] AS repertoire_p90,
    APPROX_QUANTILES(surface_repertoire, 100)[OFFSET(99)] AS repertoire_p99,
    APPROX_QUANTILES(repeated_surface_count, 100)[OFFSET(10)] AS repeated_surface_p10,
    APPROX_QUANTILES(repeated_surface_count, 100)[OFFSET(50)] AS repeated_surface_p50,
    APPROX_QUANTILES(repeated_surface_count, 100)[OFFSET(90)] AS repeated_surface_p90,
    APPROX_QUANTILES(repeated_surface_count, 100)[OFFSET(99)] AS repeated_surface_p99,
    APPROX_QUANTILES(multi_day_surface_count, 100)[OFFSET(10)] AS multi_day_surface_p10,
    APPROX_QUANTILES(multi_day_surface_count, 100)[OFFSET(50)] AS multi_day_surface_p50,
    APPROX_QUANTILES(multi_day_surface_count, 100)[OFFSET(90)] AS multi_day_surface_p90,
    APPROX_QUANTILES(multi_day_surface_count, 100)[OFFSET(99)] AS multi_day_surface_p99,
    APPROX_QUANTILES(surface_repertoire * repeated_surface_count, 100)[OFFSET(50)] AS depth_candidate_p50,
    APPROX_QUANTILES(surface_repertoire * repeated_surface_count, 100)[OFFSET(90)] AS depth_candidate_p90,
    APPROX_QUANTILES(surface_repertoire * repeated_surface_count, 100)[OFFSET(99)] AS depth_candidate_p99,
    APPROX_QUANTILES(workflow_surface_count, 100)[OFFSET(50)] AS workflow_surface_p50,
    APPROX_QUANTILES(standalone_surface_count, 100)[OFFSET(50)] AS standalone_surface_p50
  FROM per_user_depth
  GROUP BY segment
)

SELECT * FROM overall_depth
UNION ALL
SELECT * FROM repertoire_buckets
ORDER BY segment;
