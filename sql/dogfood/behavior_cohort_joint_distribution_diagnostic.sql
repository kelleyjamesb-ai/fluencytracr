-- Behavior cohort joint-distribution diagnostic for FluencyTracr V4 dogfood.
--
-- Replace `PROJECT.DATASET.gce_events` with the approved GCE export table and
-- `PROJECT.DATASET.scrubbed_agentspan_*` with the scrubbed agent span wildcard
-- table before running.
--
-- This is research-only SQL. It emits aggregate rows only and is meant to test
-- whether behavior-derived cohorts make the internal AI Scale Readiness readout
-- more actionable. It does not add a product surface, economic output, trust
-- score, ROI calculation, prediction, productivity claim, or ranking.
--
-- The query may use person-level intermediate rows inside BigQuery, but the
-- final output suppresses small cells and never emits user IDs, emails, names,
-- raw skill names, prompts, outputs, transcripts, action rows, or raw events.

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
    AND jsonPayload.type IN (
      'WORKFLOW_RUN',
      'SEARCH',
      'AUTOCOMPLETE',
      'MCP_USAGE',
      'AI_SUMMARY',
      'GLEAN_BOT_ACTIVITY',
      'CHAT_CITATION_CLICK',
      'CHAT_CITATIONS',
      'CHAT_FEEDBACK',
      'AI_ANSWER_VOTE',
      'AI_SUMMARY_VOTE',
      'SEARCH_FEEDBACK'
    )
),

source_skill_spans AS (
  SELECT
    timestamp AS span_ts,
    NULLIF(TRIM(jsonPayload.action.workflow_id), '') AS workflow_run_id,
    NULLIF(TRIM(jsonPayload.action.action_run_id), '') AS action_run_id,
    COALESCE(
      NULLIF(TRIM(jsonPayload.action.agentmetadata.sessioninfo.sessiontrackingtoken), ''),
      NULLIF(TRIM(jsonPayload.action.spaninfo.sessioninfo.sessiontrackingtoken), '')
    ) AS session_token,
    COALESCE(
      NULLIF(TRIM(jsonPayload.action.user_id), ''),
      NULLIF(TRIM(jsonPayload.spaninfo.userid), ''),
      NULLIF(TRIM(jsonPayload.span_info.user_id), '')
    ) AS user_key
  FROM `PROJECT.DATASET.scrubbed_agentspan_*`
  WHERE timestamp >= window_start
    AND timestamp < window_end
    AND _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE(window_start))
      AND FORMAT_DATE('%Y%m%d', DATE_SUB(DATE(window_end), INTERVAL 1 DAY))
    AND (
      NULLIF(TRIM(jsonPayload.action.skill_reader_attributes.skill_name), '') IS NOT NULL
      OR EXISTS (
        SELECT 1
        FROM UNNEST(jsonPayload.action.agentmetadata.inputs) AS input
        WHERE input.name = 'skill_name'
          AND NULLIF(TRIM(input.value), '') IS NOT NULL
      )
      OR EXISTS (
        SELECT 1
        FROM UNNEST(jsonPayload.action.spaninfo.inputs) AS input
        WHERE input.name = 'skill_name'
          AND NULLIF(TRIM(input.value), '') IS NOT NULL
      )
    )
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
    event_date,
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
    CONCAT('workflow:', workflow_feature) AS workflow_id,
    CONCAT('workflow:', workflow_feature) AS surface_id
  FROM source_events
  WHERE event_type = 'WORKFLOW_RUN'
    AND workflow_feature IS NOT NULL
    AND user_key IS NOT NULL
),

standalone_surfaces AS (
  SELECT
    event_ts,
    event_date,
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
    END AS workflow_id,
    CASE event_type
      WHEN 'SEARCH' THEN 'standalone:SEARCH'
      WHEN 'AUTOCOMPLETE' THEN 'standalone:AUTOCOMPLETE'
      WHEN 'MCP_USAGE' THEN 'standalone:MCP_USAGE'
      WHEN 'AI_SUMMARY' THEN 'standalone:AI_SUMMARY'
      WHEN 'GLEAN_BOT_ACTIVITY' THEN 'standalone:GLEAN_BOT_ACTIVITY'
    END AS surface_id
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

parent_join_aliases AS (
  SELECT DISTINCT
    user_key,
    workflow_id,
    parent_record_key,
    attribution_join_key
  FROM (
    SELECT user_key, workflow_id, parent_record_key, parent_record_key AS attribution_join_key
    FROM taxonomy_surfaces
    WHERE parent_record_key IS NOT NULL

    UNION ALL

    SELECT user_key, workflow_id, parent_record_key, workflow_run_id AS attribution_join_key
    FROM taxonomy_surfaces
    WHERE workflow_run_id IS NOT NULL

    UNION ALL

    SELECT user_key, workflow_id, parent_record_key, root_workflow_id AS attribution_join_key
    FROM taxonomy_surfaces
    WHERE root_workflow_id IS NOT NULL

    UNION ALL

    SELECT user_key, workflow_id, parent_record_key, tracking_token AS attribution_join_key
    FROM taxonomy_surfaces
    WHERE tracking_token IS NOT NULL
  )
),

verification_signals AS (
  SELECT
    TO_HEX(SHA256(CONCAT(
      COALESCE(user_key, ''),
      '|',
      COALESCE(event_type, ''),
      '|',
      COALESCE(workflow_run_id, ''),
      '|',
      COALESCE(root_workflow_id, ''),
      '|',
      COALESCE(session_token, ''),
      '|',
      COALESCE(tracking_token, ''),
      '|',
      CAST(event_ts AS STRING)
    ))) AS signal_key,
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
    session_token,
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
    signal.expected_parent_surface,
    signal.user_key,
    parent.workflow_id AS joined_parent_surface,
    parent.parent_record_key,
    'EXACT_PARENT_KEY' AS attribution_tier,
    1 AS attribution_priority
  FROM verification_signals AS signal
  JOIN parent_join_aliases AS parent
    ON parent.user_key = signal.user_key
    AND signal.direct_parent_key IS NOT NULL
    AND signal.direct_parent_key = parent.attribution_join_key
),

session_parent_candidates AS (
  SELECT
    signal.signal_key,
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

all_candidates AS (
  SELECT * FROM exact_parent_candidates
  UNION ALL
  SELECT * FROM session_parent_candidates
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
    signal.user_key,
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
      WHEN COUNT(DISTINCT IF(best.joined_parent_surface = signal.expected_parent_surface, best.parent_record_key, NULL)) = 0
        THEN 'CROSS_SURFACE_ALIAS'
      ELSE 'AMBIGUOUS_PARENT'
    END AS attribution_result
  FROM verification_signals AS signal
  LEFT JOIN best_candidates AS best
    ON best.signal_key = signal.signal_key
  GROUP BY
    signal.signal_key,
    signal.expected_parent_surface,
    signal.user_key
),

per_user_trust AS (
  SELECT
    user_key,
    COUNT(DISTINCT signal_key) AS trust_signal_count,
    COUNT(DISTINCT IF(attribution_result IN (
      'STRICT_PARENT_ATTRIBUTION',
      'SESSION_PARENT_ATTRIBUTION'
    ), signal_key, NULL)) AS attributed_signal_count,
    CASE
      WHEN COUNT(DISTINCT IF(attribution_result IN (
        'STRICT_PARENT_ATTRIBUTION',
        'SESSION_PARENT_ATTRIBUTION'
      ), signal_key, NULL)) > 0 THEN 'ATTRIBUTABLE_TRUST_SIGNAL'
      WHEN COUNTIF(attribution_result = 'CROSS_SURFACE_ALIAS') > 0 THEN 'TRUST_SIGNAL_WITH_ALIASING'
      WHEN COUNT(DISTINCT signal_key) > 0 THEN 'TRUST_SIGNAL_AVAILABLE_BUT_HELD'
      ELSE 'INSUFFICIENT_TRUST_EVIDENCE'
    END AS trust_classification
  FROM signal_classification
  GROUP BY user_key
),

per_user_surface AS (
  SELECT
    user_key,
    surface_id,
    COUNT(DISTINCT event_date) AS active_days_on_surface,
    COUNT(DISTINCT parent_record_key) AS interactions_on_surface,
    COUNTIF(
      LOWER(surface_id) = 'workflow:agent'
      OR STARTS_WITH(LOWER(surface_id), 'workflow:agent:')
    ) AS agent_surface_events
  FROM taxonomy_surfaces
  GROUP BY user_key, surface_id
),

per_user_depth AS (
  SELECT
    user_key,
    COUNT(DISTINCT surface_id) AS surface_repertoire,
    COUNTIF(interactions_on_surface >= 2) AS repeated_surface_count,
    SUM(interactions_on_surface) AS total_interactions,
    SUM(agent_surface_events) AS agent_interactions
  FROM per_user_surface
  GROUP BY user_key
),

per_user_skill AS (
  SELECT
    user_key,
    COUNT(*) AS skill_read_rows,
    COUNTIF(
      workflow_run_id IS NOT NULL
      OR action_run_id IS NOT NULL
      OR session_token IS NOT NULL
    ) AS skill_read_rows_with_parent_key
  FROM source_skill_spans
  WHERE user_key IS NOT NULL
  GROUP BY user_key
),

all_behavior_users AS (
  SELECT user_key FROM per_user_depth
  UNION DISTINCT
  SELECT user_key FROM per_user_trust
  UNION DISTINCT
  SELECT user_key FROM per_user_skill
),

per_user_behavior AS (
  SELECT
    user.user_key,
    COALESCE(depth.surface_repertoire, 0) AS surface_repertoire,
    COALESCE(depth.repeated_surface_count, 0) AS repeated_surface_count,
    COALESCE(depth.total_interactions, 0) AS total_interactions,
    COALESCE(depth.agent_interactions, 0) AS agent_interactions,
    COALESCE(skill.skill_read_rows, 0) AS skill_read_rows,
    COALESCE(skill.skill_read_rows_with_parent_key, 0) AS skill_read_rows_with_parent_key,
    COALESCE(trust.trust_signal_count, 0) AS trust_signal_count,
    COALESCE(trust.attributed_signal_count, 0) AS attributed_signal_count,
    COALESCE(trust.trust_classification, 'INSUFFICIENT_TRUST_EVIDENCE') AS trust_classification
  FROM all_behavior_users AS user
  LEFT JOIN per_user_depth AS depth
    ON depth.user_key = user.user_key
  LEFT JOIN per_user_skill AS skill
    ON skill.user_key = user.user_key
  LEFT JOIN per_user_trust AS trust
    ON trust.user_key = user.user_key
),

per_user_banded AS (
  SELECT
    *,
    NTILE(3) OVER (ORDER BY total_interactions, user_key) AS velocity_ntile,
    CASE
      WHEN agent_interactions >= 2 THEN 'AGENT_DELEGATION_REPEATED'
      WHEN agent_interactions = 1 THEN 'AGENT_DELEGATION_PRESENT'
      ELSE 'AGENT_DELEGATION_ABSENT'
    END AS agent_delegation_classification,
    CASE
      WHEN skill_read_rows > 0 THEN 'SKILL_READ_PRESENT'
      ELSE 'SKILL_READ_ABSENT'
    END AS skill_read_presence_classification
  FROM per_user_behavior
),

cohort_members AS (
  SELECT
    user_key,
    'velocity_band' AS behavior_cohort_dimension,
    CASE velocity_ntile
      WHEN 3 THEN 'HIGH_VELOCITY'
      WHEN 2 THEN 'MEDIUM_VELOCITY'
      ELSE 'LOW_VELOCITY'
    END AS behavior_cohort_band,
    trust_classification,
    agent_delegation_classification,
    skill_read_presence_classification,
    trust_signal_count,
    attributed_signal_count,
    agent_interactions,
    skill_read_rows
  FROM per_user_banded

  UNION ALL

  SELECT
    user_key,
    'depth_repertoire_band' AS behavior_cohort_dimension,
    CASE
      WHEN surface_repertoire >= 4 AND repeated_surface_count >= 2 THEN 'INTEGRATED_REPERTOIRE'
      WHEN surface_repertoire >= 2 THEN 'ACTIVE_BUT_SHALLOW'
      WHEN surface_repertoire = 1 AND repeated_surface_count >= 1 THEN 'FOCUSED_INTEGRATION'
      ELSE 'UNSTABLE_OR_INSUFFICIENT'
    END AS behavior_cohort_band,
    trust_classification,
    agent_delegation_classification,
    skill_read_presence_classification,
    trust_signal_count,
    attributed_signal_count,
    agent_interactions,
    skill_read_rows
  FROM per_user_banded

  UNION ALL

  SELECT
    user_key,
    'agent_delegation_band' AS behavior_cohort_dimension,
    agent_delegation_classification AS behavior_cohort_band,
    trust_classification,
    agent_delegation_classification,
    skill_read_presence_classification,
    trust_signal_count,
    attributed_signal_count,
    agent_interactions,
    skill_read_rows
  FROM per_user_banded

  UNION ALL

  SELECT
    user_key,
    'skill_read_presence_band' AS behavior_cohort_dimension,
    skill_read_presence_classification AS behavior_cohort_band,
    trust_classification,
    agent_delegation_classification,
    skill_read_presence_classification,
    trust_signal_count,
    attributed_signal_count,
    agent_interactions,
    skill_read_rows
  FROM per_user_banded
),

aggregate_joint_distribution AS (
  SELECT
    behavior_cohort_dimension,
    behavior_cohort_band,
    trust_classification,
    agent_delegation_classification,
    skill_read_presence_classification,
    COUNT(DISTINCT user_key) AS cohort_size,
    SUM(trust_signal_count) AS signal_count,
    SUM(attributed_signal_count) AS attributed_signal_count,
    COUNTIF(agent_interactions > 0) AS agent_delegation_user_count,
    COUNTIF(skill_read_rows > 0) AS skill_read_user_count
  FROM cohort_members
  GROUP BY
    behavior_cohort_dimension,
    behavior_cohort_band,
    trust_classification,
    agent_delegation_classification,
    skill_read_presence_classification
),

privacy_screened_results AS (
  SELECT
    *,
    cohort_size >= 5 AS clears_small_cell_gate
  FROM aggregate_joint_distribution
)

SELECT
  DATE(window_start) AS window_start,
  DATE(window_end) AS window_end,
  behavior_cohort_dimension,
  behavior_cohort_band,
  trust_classification,
  agent_delegation_classification,
  skill_read_presence_classification,
  CASE WHEN cohort_size >= 5 THEN cohort_size END AS cohort_size,
  CASE WHEN clears_small_cell_gate THEN signal_count END AS signal_count,
  CASE WHEN clears_small_cell_gate THEN attributed_signal_count END AS attributed_signal_count,
  CASE
    WHEN clears_small_cell_gate THEN SAFE_DIVIDE(attributed_signal_count, signal_count)
  END AS attributed_signal_share,
  CASE WHEN clears_small_cell_gate THEN agent_delegation_user_count END AS agent_delegation_user_count,
  CASE WHEN clears_small_cell_gate THEN skill_read_user_count END AS skill_read_user_count,
  CASE
    WHEN NOT clears_small_cell_gate THEN 'SUPPRESS'
    ELSE 'SURFACE_ELIGIBLE_RESEARCH_ONLY'
  END AS suppression_status,
  CASE
    WHEN NOT clears_small_cell_gate THEN 'INSUFFICIENT_VOLUME'
  END AS suppression_reason,
  CASE
    WHEN NOT clears_small_cell_gate THEN 'HOLD_SMALL_CELL_SUPPRESSED'
    WHEN trust_classification = 'ATTRIBUTABLE_TRUST_SIGNAL'
      AND behavior_cohort_dimension IN ('velocity_band', 'depth_repertoire_band')
      THEN 'PROMOTE_FOR_BEHAVIOR_COHORT_REVIEW'
    WHEN agent_delegation_classification = 'AGENT_DELEGATION_REPEATED'
      OR skill_read_presence_classification = 'SKILL_READ_PRESENT'
      THEN 'CONTINUE_RESEARCH'
    ELSE 'HOLD_FOR_EVIDENCE_GAPS'
  END AS readiness_decision
FROM privacy_screened_results
ORDER BY
  behavior_cohort_dimension,
  behavior_cohort_band,
  trust_classification,
  agent_delegation_classification,
  skill_read_presence_classification;
