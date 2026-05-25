-- Trust signal availability diagnostic for FluencyTracr dogfood.
--
-- Replace `PROJECT.DATASET.gce_events` with the scio-prod export table before
-- running. This is research-only SQL. It emits aggregate rows only and is meant
-- to determine whether verification/feedback signals exist and can be joined
-- back to governed parent surfaces. It does not score trust behavior.

DECLARE window_start TIMESTAMP DEFAULT TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 60 DAY);
DECLARE window_end TIMESTAMP DEFAULT CURRENT_TIMESTAMP();

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

workflow_surfaces AS (
  SELECT
    event.user_key,
    event.session_token,
    event.tracking_token,
    COALESCE(
      event.workflow_run_id,
      event.root_workflow_id,
      event.session_token,
      event.tracking_token,
      CONCAT(event.user_key, ':', CAST(event.event_ts AS STRING), ':', event.event_type)
    ) AS surface_join_key,
    CONCAT('workflow:', event.workflow_feature) AS workflow_id
  FROM source_events AS event
  WHERE event.event_type = 'WORKFLOW_RUN'
    AND event.workflow_feature IS NOT NULL
    AND event.user_key IS NOT NULL
),

standalone_surfaces AS (
  SELECT
    event.user_key,
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
    END AS workflow_id
  FROM source_events AS event
  WHERE event.event_type IN ('SEARCH', 'AUTOCOMPLETE', 'MCP_USAGE', 'AI_SUMMARY', 'GLEAN_BOT_ACTIVITY')
    AND event.workflow_feature IS NULL
    AND event.user_key IS NOT NULL
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
  SELECT DISTINCT
    user_key,
    workflow_id,
    surface_join_key,
    surface_join_key AS attribution_join_key
  FROM taxonomy_surfaces
  UNION DISTINCT
  SELECT DISTINCT
    user_key,
    workflow_id,
    surface_join_key,
    session_token AS attribution_join_key
  FROM taxonomy_surfaces
  WHERE session_token IS NOT NULL
  UNION DISTINCT
  SELECT DISTINCT
    user_key,
    workflow_id,
    surface_join_key,
    tracking_token AS attribution_join_key
  FROM taxonomy_surfaces
  WHERE tracking_token IS NOT NULL
),

verification_signals AS (
  SELECT
    user_key,
    event_type AS verification_event_type,
    CASE event_type
      WHEN 'CHAT_CITATION_CLICK' THEN 'workflow:CHAT'
      WHEN 'CHAT_CITATIONS' THEN 'workflow:CHAT'
      WHEN 'CHAT_FEEDBACK' THEN 'workflow:CHAT'
      WHEN 'AI_ANSWER_VOTE' THEN 'workflow:AI_ANSWER'
      WHEN 'AI_SUMMARY_VOTE' THEN 'standalone:AI_SUMMARY'
      WHEN 'SEARCH_FEEDBACK' THEN 'standalone:SEARCH'
      ELSE 'unknown'
    END AS expected_parent_surface,
    COALESCE(
      workflow_run_id,
      session_token,
      tracking_token
    ) AS attribution_join_key
  FROM source_events
  WHERE event_type IN (
      'CHAT_CITATION_CLICK',
      'CHAT_CITATIONS',
      'CHAT_FEEDBACK',
      'AI_ANSWER_VOTE',
      'AI_SUMMARY_VOTE',
      'SEARCH_FEEDBACK'
    )
),

signal_availability AS (
  SELECT
    verification_event_type,
    expected_parent_surface,
    COUNT(*) AS total_signal_count,
    COUNTIF(user_key IS NOT NULL) AS signal_count_with_user_key,
    COUNTIF(attribution_join_key IS NOT NULL) AS signal_count_with_join_key,
    COUNT(DISTINCT user_key) AS distinct_signal_users
  FROM verification_signals
  GROUP BY verification_event_type, expected_parent_surface
),

signal_joinability AS (
  SELECT
    verification.verification_event_type,
    verification.expected_parent_surface,
    alias.workflow_id AS joined_parent_surface,
    COUNT(*) AS joined_signal_count,
    COUNT(DISTINCT alias.surface_join_key) AS joined_surface_count,
    COUNT(DISTINCT verification.user_key) AS joined_user_count
  FROM verification_signals AS verification
  JOIN surface_join_aliases AS alias
    ON alias.user_key = verification.user_key
    AND alias.attribution_join_key = verification.attribution_join_key
  WHERE verification.attribution_join_key IS NOT NULL
    AND verification.user_key IS NOT NULL
  GROUP BY
    verification.verification_event_type,
    verification.expected_parent_surface,
    alias.workflow_id
)

SELECT
  DATE(window_start) AS window_start,
  DATE(window_end) AS window_end,
  availability.verification_event_type,
  availability.expected_parent_surface,
  COALESCE(joinability.joined_parent_surface, 'NO_JOIN') AS joined_parent_surface,
  availability.total_signal_count,
  availability.signal_count_with_user_key,
  availability.signal_count_with_join_key,
  availability.distinct_signal_users,
  COALESCE(joinability.joined_signal_count, 0) AS joined_signal_count,
  COALESCE(joinability.joined_surface_count, 0) AS joined_surface_count,
  COALESCE(joinability.joined_user_count, 0) AS joined_user_count,
  SAFE_DIVIDE(
    COALESCE(joinability.joined_signal_count, 0),
    availability.total_signal_count
  ) AS signal_join_rate,
  CASE
    WHEN availability.total_signal_count = 0 THEN 'NO_SIGNAL_VOLUME'
    WHEN COALESCE(joinability.joined_signal_count, 0) = 0 THEN 'SIGNALS_PRESENT_NO_JOIN'
    WHEN SAFE_DIVIDE(COALESCE(joinability.joined_signal_count, 0), availability.total_signal_count) < 0.5
      THEN 'PARTIAL_JOIN'
    ELSE 'JOINABLE'
  END AS availability_status
FROM signal_availability AS availability
LEFT JOIN signal_joinability AS joinability
  ON joinability.verification_event_type = availability.verification_event_type
  AND joinability.expected_parent_surface = availability.expected_parent_surface
ORDER BY
  availability.verification_event_type,
  joined_parent_surface;
