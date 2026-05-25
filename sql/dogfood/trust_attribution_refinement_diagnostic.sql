-- Trust attribution refinement diagnostic for FluencyTracr dogfood.
--
-- Replace `PROJECT.DATASET.gce_events` with the scio-prod export table before
-- running. This is research-only SQL. It emits aggregate rows only and is meant
-- to determine whether verification/feedback signals attach to exactly one
-- governed parent surface. It does not score trust behavior.

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
    NULLIF(TRIM(jsonPayload.chatfeedback.runid), '') AS chat_feedback_run_id,
    NULLIF(TRIM(jsonPayload.chatfeedback.workflowid), '') AS chat_feedback_workflow_id,
    NULLIF(TRIM(jsonPayload.chatfeedback.chatsessionid), '') AS chat_feedback_session_id,
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
    event_ts,
    user_key,
    session_token,
    tracking_token,
    root_workflow_id,
    workflow_run_id,
    COALESCE(
      workflow_run_id,
      root_workflow_id,
      session_token,
      tracking_token,
      CONCAT(user_key, ':', CAST(event_ts AS STRING), ':', event_type)
    ) AS parent_record_key,
    CONCAT('workflow:', workflow_feature) AS workflow_id
  FROM source_events
  WHERE event_type = 'WORKFLOW_RUN'
    AND workflow_feature IS NOT NULL
    AND user_key IS NOT NULL
),

standalone_surfaces AS (
  SELECT
    event_ts,
    user_key,
    session_token,
    tracking_token,
    root_workflow_id,
    workflow_run_id,
    COALESCE(
      workflow_run_id,
      session_token,
      tracking_token,
      CONCAT(user_key, ':', CAST(event_ts AS STRING), ':', event_type)
    ) AS parent_record_key,
    CASE event_type
      WHEN 'SEARCH' THEN 'standalone:SEARCH'
      WHEN 'AUTOCOMPLETE' THEN 'standalone:AUTOCOMPLETE'
      WHEN 'MCP_USAGE' THEN 'standalone:MCP_USAGE'
      WHEN 'AI_SUMMARY' THEN 'standalone:AI_SUMMARY'
      WHEN 'GLEAN_BOT_ACTIVITY' THEN 'standalone:GLEAN_BOT_ACTIVITY'
    END AS workflow_id
  FROM source_events AS event
  WHERE event_type IN ('SEARCH', 'AUTOCOMPLETE', 'MCP_USAGE', 'AI_SUMMARY', 'GLEAN_BOT_ACTIVITY')
    AND workflow_feature IS NULL
    AND user_key IS NOT NULL
    AND (
      event_type != 'GLEAN_BOT_ACTIVITY'
      OR session_token IS NULL
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

verification_signals AS (
  SELECT
    CONCAT(user_key, ':', event_type, ':', CAST(event_ts AS STRING), ':', COALESCE(workflow_run_id, root_workflow_id, session_token, tracking_token, 'NO_KEY')) AS signal_key,
    event_ts,
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
    workflow_run_id,
    root_workflow_id,
    session_token,
    tracking_token,
    COALESCE(
      workflow_run_id,
      root_workflow_id,
      chat_feedback_run_id,
      chat_feedback_workflow_id,
      chat_feedback_session_id,
      tracking_token
    ) AS direct_parent_key
  FROM source_events
  WHERE event_type IN (
      'CHAT_CITATION_CLICK',
      'CHAT_CITATIONS',
      'CHAT_FEEDBACK',
      'AI_ANSWER_VOTE',
      'AI_SUMMARY_VOTE',
      'SEARCH_FEEDBACK'
    )
    AND user_key IS NOT NULL
),

exact_parent_candidates AS (
  SELECT
    signal.signal_key,
    signal.verification_event_type,
    signal.expected_parent_surface,
    signal.user_key,
    parent.workflow_id AS joined_parent_surface,
    parent.parent_record_key,
    'EXACT_PARENT_KEY' AS attribution_tier,
    1 AS attribution_priority
  FROM verification_signals AS signal
  JOIN taxonomy_surfaces AS parent
    ON parent.user_key = signal.user_key
    AND signal.direct_parent_key IS NOT NULL
    AND signal.direct_parent_key IN (
      parent.parent_record_key,
      parent.workflow_run_id,
      parent.root_workflow_id,
      parent.tracking_token
    )
),

session_parent_candidates AS (
  SELECT
    signal.signal_key,
    signal.verification_event_type,
    signal.expected_parent_surface,
    signal.user_key,
    parent.workflow_id AS joined_parent_surface,
    parent.parent_record_key,
    'SESSION_PARENT_KEY' AS attribution_tier,
    2 AS attribution_priority
  FROM verification_signals AS signal
  JOIN taxonomy_surfaces AS parent
    ON parent.user_key = signal.user_key
    AND signal.session_token IS NOT NULL
    AND parent.session_token = signal.session_token
    AND parent.workflow_id = signal.expected_parent_surface
),

proximity_parent_candidates AS (
  SELECT
    signal.signal_key,
    signal.verification_event_type,
    signal.expected_parent_surface,
    signal.user_key,
    parent.workflow_id AS joined_parent_surface,
    parent.parent_record_key,
    'PROXIMITY_RESEARCH_ONLY' AS attribution_tier,
    3 AS attribution_priority
  FROM verification_signals AS signal
  JOIN taxonomy_surfaces AS parent
    ON parent.user_key = signal.user_key
    AND parent.workflow_id = signal.expected_parent_surface
    AND ABS(TIMESTAMP_DIFF(signal.event_ts, parent.event_ts, SECOND)) <= 300
),

all_candidates AS (
  SELECT * FROM exact_parent_candidates
  UNION ALL
  SELECT * FROM session_parent_candidates
  UNION ALL
  SELECT * FROM proximity_parent_candidates
),

best_candidate_priority AS (
  SELECT
    signal_key,
    MIN(attribution_priority) AS attribution_priority
  FROM all_candidates
  GROUP BY signal_key
),

best_candidates AS (
  SELECT candidate.*
  FROM all_candidates AS candidate
  JOIN best_candidate_priority AS best
    ON best.signal_key = candidate.signal_key
    AND best.attribution_priority = candidate.attribution_priority
),

signal_classification AS (
  SELECT
    signal.signal_key,
    signal.verification_event_type,
    signal.expected_parent_surface,
    signal.user_key,
    COALESCE(MIN(best.attribution_tier), 'NO_PARENT') AS attribution_tier,
    COUNT(DISTINCT best.parent_record_key) AS candidate_parent_count,
    COUNT(DISTINCT best.joined_parent_surface) AS candidate_surface_count,
    COUNT(DISTINCT IF(best.joined_parent_surface = signal.expected_parent_surface, best.parent_record_key, NULL)) AS expected_parent_count,
    CASE
      WHEN COUNT(best.signal_key) = 0 THEN 'NO_PARENT'
      WHEN COUNT(DISTINCT best.parent_record_key) = 1
        AND COUNT(DISTINCT best.joined_parent_surface) = 1
        AND COUNT(DISTINCT IF(best.joined_parent_surface = signal.expected_parent_surface, best.parent_record_key, NULL)) = 1
        AND MIN(best.attribution_tier) = 'EXACT_PARENT_KEY'
        THEN 'STRICT_PARENT_ATTRIBUTION'
      WHEN COUNT(DISTINCT best.parent_record_key) = 1
        AND COUNT(DISTINCT best.joined_parent_surface) = 1
        AND COUNT(DISTINCT IF(best.joined_parent_surface = signal.expected_parent_surface, best.parent_record_key, NULL)) = 1
        AND MIN(best.attribution_tier) = 'SESSION_PARENT_KEY'
        THEN 'SESSION_PARENT_ATTRIBUTION'
      WHEN COUNT(DISTINCT best.parent_record_key) = 1
        AND COUNT(DISTINCT best.joined_parent_surface) = 1
        AND COUNT(DISTINCT IF(best.joined_parent_surface = signal.expected_parent_surface, best.parent_record_key, NULL)) = 1
        AND MIN(best.attribution_tier) = 'PROXIMITY_RESEARCH_ONLY'
        THEN 'PROXIMITY_RESEARCH_ONLY'
      WHEN COUNT(DISTINCT IF(best.joined_parent_surface = signal.expected_parent_surface, best.parent_record_key, NULL)) = 0
        THEN 'CROSS_SURFACE_ALIAS'
      ELSE 'AMBIGUOUS_PARENT'
    END AS attribution_result
  FROM verification_signals AS signal
  LEFT JOIN best_candidates AS best
    ON best.signal_key = signal.signal_key
  GROUP BY
    signal.signal_key,
    signal.verification_event_type,
    signal.expected_parent_surface,
    signal.user_key
),

aggregate_results AS (
  SELECT
    verification_event_type,
    expected_parent_surface,
    attribution_tier,
    attribution_result,
    COUNT(*) AS signal_count,
    COUNTIF(attribution_result IN (
      'STRICT_PARENT_ATTRIBUTION',
      'SESSION_PARENT_ATTRIBUTION',
      'PROXIMITY_RESEARCH_ONLY'
    )) AS attributed_signal_count,
    COUNT(DISTINCT user_key) AS distinct_signal_users,
    SUM(candidate_parent_count) AS candidate_parent_count,
    SUM(candidate_surface_count) AS candidate_surface_count,
    SUM(expected_parent_count) AS expected_parent_count
  FROM signal_classification
  GROUP BY
    verification_event_type,
    expected_parent_surface,
    attribution_tier,
    attribution_result
),

privacy_screened_results AS (
  SELECT
    *,
    distinct_signal_users >= 5 AS clears_small_cell_gate
  FROM aggregate_results
)

SELECT
  DATE(window_start) AS window_start,
  DATE(window_end) AS window_end,
  verification_event_type,
  expected_parent_surface,
  attribution_tier,
  CASE
    WHEN clears_small_cell_gate THEN attribution_result
    ELSE 'SMALL_CELL_SUPPRESSED'
  END AS attribution_result,
  CASE WHEN clears_small_cell_gate THEN signal_count END AS signal_count,
  CASE WHEN clears_small_cell_gate THEN attributed_signal_count END AS attributed_signal_count,
  CASE
    WHEN clears_small_cell_gate
      THEN SAFE_DIVIDE(attributed_signal_count, signal_count)
  END AS attribution_rate,
  CASE WHEN clears_small_cell_gate THEN distinct_signal_users END AS distinct_signal_users,
  CASE WHEN clears_small_cell_gate THEN candidate_parent_count END AS candidate_parent_count,
  CASE WHEN clears_small_cell_gate THEN candidate_surface_count END AS candidate_surface_count,
  CASE WHEN clears_small_cell_gate THEN expected_parent_count END AS expected_parent_count,
  CASE
    WHEN NOT clears_small_cell_gate THEN 'SMALL_CELL_SUPPRESSED'
    WHEN attribution_result = 'STRICT_PARENT_ATTRIBUTION' THEN 'TRUST_ATTRIBUTION_STRICT'
    WHEN attribution_result = 'SESSION_PARENT_ATTRIBUTION' THEN 'TRUST_ATTRIBUTION_SESSION'
    WHEN attribution_result = 'PROXIMITY_RESEARCH_ONLY' THEN 'TRUST_ATTRIBUTION_RESEARCH_ONLY'
    WHEN attribution_result = 'AMBIGUOUS_PARENT' THEN 'TRUST_ATTRIBUTION_AMBIGUOUS'
    WHEN attribution_result = 'CROSS_SURFACE_ALIAS' THEN 'TRUST_ATTRIBUTION_CROSS_SURFACE_ALIAS'
    ELSE 'TRUST_ATTRIBUTION_NO_PARENT'
  END AS attribution_status
FROM privacy_screened_results
ORDER BY
  verification_event_type,
  expected_parent_surface,
  attribution_tier,
  attribution_result;
