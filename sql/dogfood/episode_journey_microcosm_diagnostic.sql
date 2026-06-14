-- Episode Journey Microcosm diagnostic for FluencyTracr V4 research.
--
-- Purpose:
--   Temporarily sample 20 users inside BigQuery, trace their AI work activity
--   across three 30-day windows, and collapse the journey evidence into
--   aggregate framework coverage summaries.
--
-- Governance:
--   This query may use person-level intermediate rows inside BigQuery only.
--   The final output is aggregate-only and must not emit user IDs, emails,
--   names, raw prompts, raw outputs, transcripts, raw event rows, manager
--   fields, team fields, or person-level metrics.
--
-- This is research-only. It does not implement a product surface, API, schema,
-- canonical event, suppression reason, score, ROI calculation, causality claim,
-- productivity claim, prediction, or individual fluency label.
--
-- Replace:
--   `PROJECT.DATASET.gce_events` with the approved GCE/customer-event table.
--   `PROJECT.DATASET.scrubbed_agentspan_*` with the approved scrubbed
--   agent-span wildcard table.
--
-- Final output sections:
--   FRAMEWORK_MICROCOSM_SUMMARY
--   FRAMEWORK_BAND_SUMMARY
--   JOURNEY_MOTIF_SUMMARY
--   PRIMITIVE_CONFIDENCE_SUMMARY

DECLARE analysis_end TIMESTAMP DEFAULT CURRENT_TIMESTAMP();
DECLARE sample_size INT64 DEFAULT 20;
DECLARE small_cell_floor INT64 DEFAULT 5;

CREATE TEMP TABLE fixed_windows AS
SELECT 1 AS window_index, 'window_1' AS window_id,
  TIMESTAMP_SUB(analysis_end, INTERVAL 90 DAY) AS window_start,
  TIMESTAMP_SUB(analysis_end, INTERVAL 60 DAY) AS window_end
UNION ALL
SELECT 2, 'window_2',
  TIMESTAMP_SUB(analysis_end, INTERVAL 60 DAY),
  TIMESTAMP_SUB(analysis_end, INTERVAL 30 DAY)
UNION ALL
SELECT 3, 'window_3',
  TIMESTAMP_SUB(analysis_end, INTERVAL 30 DAY),
  analysis_end;

CREATE TEMP TABLE gce_source_events AS
SELECT
  fixed_window.window_id,
  fixed_window.window_index,
  event.timestamp AS event_ts,
  COALESCE(
    NULLIF(TRIM(event.jsonPayload.user.userid), ''),
    NULLIF(TRIM(event.jsonPayload.productsnapshot.user.id), ''),
    NULLIF(TRIM(event.jsonPayload.productsnapshot.user.canonicalid), '')
  ) AS user_key,
  event.jsonPayload.type AS event_type,
  COALESCE(
    NULLIF(TRIM(event.jsonPayload.workflowrun.runid), ''),
    NULLIF(TRIM(event.jsonPayload.workflowrun.rootworkflowid), ''),
    NULLIF(TRIM(event.jsonPayload.chatfeedback.runid), ''),
    NULLIF(TRIM(event.jsonPayload.chatfeedback.workflowid), ''),
    NULLIF(TRIM(event.jsonPayload.action.actionrunid), '')
  ) AS run_or_action_key,
  COALESCE(
    NULLIF(TRIM(event.jsonPayload.workflowrun.sessiontrackingtoken), ''),
    NULLIF(TRIM(event.jsonPayload.chat.sessiontrackingtoken), ''),
    NULLIF(TRIM(event.jsonPayload.search.sessiontrackingtoken), ''),
    NULLIF(TRIM(event.jsonPayload.action.sessiontrackingtoken), ''),
    NULLIF(TRIM(event.jsonPayload.chatfeedback.sessiontrackingtoken), '')
  ) AS session_token,
  COALESCE(
    NULLIF(TRIM(event.jsonPayload.search.trackingtoken), ''),
    NULLIF(TRIM(event.jsonPayload.autocomplete.trackingtoken), ''),
    NULLIF(TRIM(event.jsonPayload.aianswer.trackingtoken), ''),
    NULLIF(TRIM(event.jsonPayload.aisummary.trackingtoken), ''),
    NULLIF(TRIM(event.jsonPayload.chatcitationclick.trackingtoken), ''),
    NULLIF(TRIM(event.jsonPayload.aianswervote.trackingtoken), ''),
    NULLIF(TRIM(event.jsonPayload.aisummaryvote.trackingtoken), ''),
    NULLIF(TRIM(event.jsonPayload.searchfeedback.trackingtoken), '')
  ) AS tracking_token,
  CASE event.jsonPayload.type
    WHEN 'WORKFLOW_RUN' THEN CONCAT('workflow:', COALESCE(NULLIF(TRIM(event.jsonPayload.workflowrun.feature), ''), 'UNKNOWN'))
    WHEN 'SEARCH' THEN 'standalone:SEARCH'
    WHEN 'AUTOCOMPLETE' THEN 'standalone:AUTOCOMPLETE'
    WHEN 'MCP_USAGE' THEN 'standalone:MCP_USAGE'
    WHEN 'AI_SUMMARY' THEN 'standalone:AI_SUMMARY'
    WHEN 'GLEAN_BOT_ACTIVITY' THEN 'standalone:GLEAN_BOT_ACTIVITY'
    WHEN 'CHAT_CITATION_CLICK' THEN 'verification:CHAT_CITATION_CLICK'
    WHEN 'CHAT_CITATIONS' THEN 'verification:CHAT_CITATIONS'
    WHEN 'CHAT_FEEDBACK' THEN 'feedback:CHAT'
    WHEN 'AI_ANSWER_VOTE' THEN 'feedback:AI_ANSWER'
    WHEN 'AI_SUMMARY_VOTE' THEN 'feedback:AI_SUMMARY'
    WHEN 'SEARCH_FEEDBACK' THEN 'feedback:SEARCH'
    ELSE 'other:GCE'
  END AS surface_id,
  event.jsonPayload.type IN (
    'WORKFLOW_RUN',
    'SEARCH',
    'AUTOCOMPLETE',
    'MCP_USAGE',
    'AI_SUMMARY',
    'GLEAN_BOT_ACTIVITY'
  ) AS is_ai_activity,
  event.jsonPayload.type IN (
    'CHAT_CITATION_CLICK',
    'CHAT_CITATIONS',
    'CHAT_FEEDBACK',
    'AI_ANSWER_VOTE',
    'AI_SUMMARY_VOTE',
    'SEARCH_FEEDBACK'
  ) AS is_trust_or_verification,
  event.jsonPayload.type IN ('CHAT_FEEDBACK', 'AI_ANSWER_VOTE', 'AI_SUMMARY_VOTE', 'SEARCH_FEEDBACK') AS has_feedback,
  event.jsonPayload.type IN ('CHAT_CITATION_CLICK') AS has_citation_click,
  event.jsonPayload.type IN ('CHAT_CITATIONS') AS has_citation_available,
  event.jsonPayload.action.executionstatus = 'SUCCESS' AS has_action_success,
  event.jsonPayload.action.executionstatus = 'ERROR'
    OR NULLIF(TRIM(event.jsonPayload.action.errortype), '') IS NOT NULL
    OR NULLIF(TRIM(event.jsonPayload.action.errorstr), '') IS NOT NULL AS has_action_error,
  FALSE AS has_agent_completion,
  FALSE AS has_agent_error,
  FALSE AS has_agent_cancel_or_pause,
  FALSE AS has_step_skipped,
  FALSE AS has_llm_call,
  FALSE AS has_skill_use,
  FALSE AS has_explicit_abandon
FROM `PROJECT.DATASET.gce_events` AS event
JOIN fixed_windows AS fixed_window
  ON event.timestamp >= fixed_window.window_start
 AND event.timestamp < fixed_window.window_end
WHERE event.jsonPayload.type IN (
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
  AND event.timestamp >= TIMESTAMP_SUB(analysis_end, INTERVAL 90 DAY)
  AND event.timestamp < analysis_end;

CREATE TEMP TABLE span_source_events AS
SELECT
  fixed_window.window_id,
  fixed_window.window_index,
  span.timestamp AS event_ts,
  COALESCE(
    NULLIF(TRIM(span.jsonPayload.action.user_id), ''),
    NULLIF(TRIM(span.jsonPayload.spaninfo.userid), ''),
    NULLIF(TRIM(span.jsonPayload.span_info.user_id), '')
  ) AS user_key,
  CASE
    WHEN COALESCE(span.jsonPayload.agent_run.run_id, span.jsonPayload.agentrun.runid) IS NOT NULL THEN 'AGENT_RUN_SPAN'
    WHEN span.jsonPayload.action.action_run_id IS NOT NULL THEN 'ACTION_SPAN'
    WHEN span.jsonPayload.llmcall.model IS NOT NULL THEN 'LLM_CALL_SPAN'
    WHEN span.jsonPayload.agent_step.step_execution_status = 'EXECUTED' THEN 'AGENT_STEP_EXECUTED'
    WHEN span.jsonPayload.agent_step.step_execution_status = 'SKIPPED' THEN 'AGENT_STEP_SKIPPED'
    WHEN span.jsonPayload.agent_step.step_execution_status = 'ERROR' THEN 'AGENT_STEP_ERROR'
    WHEN span.jsonPayload.agent_step.step_execution_status = 'PAUSED' THEN 'AGENT_STEP_PAUSED'
    WHEN span.jsonPayload.context.agenttrace.traceid IS NOT NULL
      OR span.jsonPayload.context.agent_trace.trace_id IS NOT NULL THEN 'AGENT_TRACE_CONTEXT'
    WHEN span.jsonPayload.context.workflow.runid IS NOT NULL
      OR span.jsonPayload.context.workflow.run_id IS NOT NULL THEN 'WORKFLOW_CONTEXT_ONLY'
    WHEN span.jsonPayload.spaninfo.sessioninfo.sessiontrackingtoken IS NOT NULL
      OR span.jsonPayload.span_info.session_info.session_tracking_token IS NOT NULL THEN 'SESSION_CONTEXT_ONLY'
    ELSE 'SPAN_UNKNOWN'
  END AS event_type,
  COALESCE(
    NULLIF(TRIM(span.jsonPayload.context.workflow.runid), ''),
    NULLIF(TRIM(span.jsonPayload.context.workflow.run_id), ''),
    NULLIF(TRIM(span.jsonPayload.agent_run.run_id), ''),
    NULLIF(TRIM(span.jsonPayload.agentrun.runid), ''),
    NULLIF(TRIM(span.jsonPayload.action.action_run_id), '')
  ) AS run_or_action_key,
  COALESCE(
    NULLIF(TRIM(span.jsonPayload.spaninfo.sessioninfo.sessiontrackingtoken), ''),
    NULLIF(TRIM(span.jsonPayload.span_info.session_info.session_tracking_token), ''),
    NULLIF(TRIM(span.jsonPayload.action.spaninfo.sessioninfo.sessiontrackingtoken), ''),
    NULLIF(TRIM(span.jsonPayload.agentrun.spaninfo.sessioninfo.sessiontrackingtoken), ''),
    NULLIF(TRIM(span.jsonPayload.llmcall.spaninfo.sessioninfo.sessiontrackingtoken), '')
  ) AS session_token,
  COALESCE(
    NULLIF(TRIM(span.jsonPayload.action.source_info.search_tracking_token), ''),
    NULLIF(TRIM(span.jsonPayload.context.agenttrace.traceid), ''),
    NULLIF(TRIM(span.jsonPayload.context.agent_trace.trace_id), ''),
    NULLIF(TRIM(span.jsonPayload.agent_run.cloud_trace_id), '')
  ) AS tracking_token,
  CASE
    WHEN COALESCE(span.jsonPayload.agent_run.run_id, span.jsonPayload.agentrun.runid) IS NOT NULL THEN 'workflow:AGENT'
    WHEN span.jsonPayload.action.action_run_id IS NOT NULL THEN 'workflow:ACTION'
    WHEN span.jsonPayload.llmcall.model IS NOT NULL THEN 'corroborative:LLM_CALL'
    WHEN span.jsonPayload.agent_step.step_execution_status IS NOT NULL THEN 'workflow:AGENT_STEP'
    WHEN span.jsonPayload.context.agenttrace.traceid IS NOT NULL
      OR span.jsonPayload.context.agent_trace.trace_id IS NOT NULL THEN 'workflow:AGENT_TRACE_CONTEXT'
    WHEN span.jsonPayload.context.workflow.runid IS NOT NULL
      OR span.jsonPayload.context.workflow.run_id IS NOT NULL THEN 'workflow:WORKFLOW_CONTEXT_ONLY'
    WHEN span.jsonPayload.spaninfo.sessioninfo.sessiontrackingtoken IS NOT NULL
      OR span.jsonPayload.span_info.session_info.session_tracking_token IS NOT NULL THEN 'workflow:SESSION_CONTEXT_ONLY'
    WHEN NULLIF(TRIM(span.jsonPayload.action.skill_reader_attributes.skill_name), '') IS NOT NULL THEN 'workflow:SKILL_READ'
    ELSE 'other:SPAN'
  END AS surface_id,
  TRUE AS is_ai_activity,
  COALESCE(span.jsonPayload.agent_step.citations_data.has_user_facing_citations, FALSE)
    OR COALESCE(ARRAY_LENGTH(span.jsonPayload.agent_step.citations_data.positioned_citations), 0) > 0
    OR COALESCE(ARRAY_LENGTH(span.jsonPayload.agent_run.citations_data.positioned_citations), 0) > 0 AS is_trust_or_verification,
  FALSE AS has_feedback,
  FALSE AS has_citation_click,
  COALESCE(span.jsonPayload.agent_step.citations_data.has_user_facing_citations, FALSE)
    OR COALESCE(ARRAY_LENGTH(span.jsonPayload.agent_step.citations_data.positioned_citations), 0) > 0
    OR COALESCE(ARRAY_LENGTH(span.jsonPayload.agent_run.citations_data.positioned_citations), 0) > 0 AS has_citation_available,
  span.jsonPayload.action.execution_status = 'SUCCESS' AS has_action_success,
  span.jsonPayload.action.execution_status = 'ERROR'
    OR NULLIF(TRIM(span.jsonPayload.action.error_type), '') IS NOT NULL
    OR NULLIF(TRIM(span.jsonPayload.action.error_str), '') IS NOT NULL AS has_action_error,
  span.jsonPayload.agent_run.run_execution_status = 'SUCCESS' AS has_agent_completion,
  span.jsonPayload.agent_run.run_execution_status = 'ERROR'
    OR NULLIF(TRIM(span.jsonPayload.agent_run.error_type), '') IS NOT NULL
    OR span.jsonPayload.agent_step.step_execution_status = 'ERROR'
    OR NULLIF(TRIM(span.jsonPayload.agent_step.error_type), '') IS NOT NULL AS has_agent_error,
  span.jsonPayload.agent_run.run_execution_status IN ('USER_CANCELLED', 'CANCELLED', 'PAUSED')
    OR span.jsonPayload.agent_step.step_execution_status = 'PAUSED' AS has_agent_cancel_or_pause,
  span.jsonPayload.agent_step.step_execution_status = 'SKIPPED' AS has_step_skipped,
  span.jsonPayload.llmcall.model IS NOT NULL AS has_llm_call,
  NULLIF(TRIM(span.jsonPayload.action.skill_reader_attributes.skill_name), '') IS NOT NULL
    OR EXISTS (
      SELECT 1
      FROM UNNEST(span.jsonPayload.action.agentmetadata.inputs) AS input
      WHERE input.name = 'skill_name'
        AND NULLIF(TRIM(input.value), '') IS NOT NULL
    )
    OR EXISTS (
      SELECT 1
      FROM UNNEST(span.jsonPayload.action.spaninfo.inputs) AS input
      WHERE input.name = 'skill_name'
        AND NULLIF(TRIM(input.value), '') IS NOT NULL
    ) AS has_skill_use,
  span.jsonPayload.agent_run.run_execution_status IN ('USER_CANCELLED', 'CANCELLED') AS has_explicit_abandon
FROM `PROJECT.DATASET.scrubbed_agentspan_*` AS span
JOIN fixed_windows AS fixed_window
  ON span.timestamp >= fixed_window.window_start
 AND span.timestamp < fixed_window.window_end
WHERE _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE(TIMESTAMP_SUB(analysis_end, INTERVAL 90 DAY)))
  AND FORMAT_DATE('%Y%m%d', DATE_SUB(DATE(analysis_end), INTERVAL 1 DAY))
  AND span.timestamp >= TIMESTAMP_SUB(analysis_end, INTERVAL 90 DAY)
  AND span.timestamp < analysis_end;

CREATE TEMP TABLE all_source_events AS
SELECT * FROM gce_source_events
UNION ALL
SELECT * FROM span_source_events;

CREATE TEMP TABLE sampled_users AS
SELECT user_key
FROM (
  SELECT
    user_key,
    ROW_NUMBER() OVER (
      ORDER BY ABS(FARM_FINGERPRINT(CONCAT(user_key, ':fluencytracr_microcosm')))
    ) AS sample_rank
  FROM all_source_events
  WHERE user_key IS NOT NULL
  GROUP BY user_key
)
WHERE sample_rank <= sample_size;

CREATE TEMP TABLE sampled_events AS
SELECT
  event.*,
  CASE
    WHEN has_action_error OR has_agent_error THEN 'FRICTION_ERROR'
    WHEN has_agent_cancel_or_pause THEN 'FRICTION_CANCEL_OR_PAUSE'
    WHEN has_step_skipped THEN 'FRICTION_STEP_SKIPPED'
    WHEN has_action_success THEN 'ACTION_SUCCESS'
    WHEN has_agent_completion THEN 'AGENT_COMPLETION'
    WHEN has_feedback THEN 'FEEDBACK'
    WHEN has_citation_click THEN 'CITATION_CLICK'
    WHEN has_citation_available THEN 'CITATION_AVAILABLE'
    WHEN has_skill_use THEN 'SKILL_USE'
    WHEN has_llm_call THEN 'LLM_CALL'
    WHEN event_type IN ('SEARCH', 'AUTOCOMPLETE') THEN event_type
    WHEN event_type IN ('WORKFLOW_RUN', 'AGENT_RUN_SPAN', 'ACTION_SPAN') THEN event_type
    WHEN event_type IN (
      'AGENT_STEP_EXECUTED',
      'AGENT_STEP_SKIPPED',
      'AGENT_STEP_ERROR',
      'AGENT_STEP_PAUSED',
      'AGENT_TRACE_CONTEXT',
      'WORKFLOW_CONTEXT_ONLY',
      'SESSION_CONTEXT_ONLY'
    ) THEN event_type
    WHEN event_type = 'GLEAN_BOT_ACTIVITY' THEN 'BOT_ACTIVITY_UNLINKED'
    WHEN event_type = 'MCP_USAGE' THEN 'MCP_ACTIVITY_UNLINKED'
    WHEN event_type = 'AI_SUMMARY' THEN 'AI_SUMMARY_WEAK_LINKAGE'
    ELSE 'OTHER_AI_EVENT'
  END AS journey_event_category,
  has_action_error OR has_agent_error OR has_agent_cancel_or_pause OR has_step_skipped AS has_friction,
  has_action_success OR has_agent_completion OR has_feedback OR has_citation_click
    OR has_citation_available OR has_skill_use OR has_llm_call
    OR event_type IN ('AGENT_STEP_EXECUTED', 'AGENT_RUN_SPAN', 'ACTION_SPAN') AS has_continuation_or_resolution
FROM all_source_events AS event
JOIN sampled_users USING (user_key);

CREATE TEMP TABLE per_user_window_base AS
SELECT
  window_id,
  window_index,
  user_key,
  COUNT(*) AS total_events,
  COUNTIF(is_ai_activity) AS ai_activity_events,
  COUNT(DISTINCT DATE(event_ts)) AS active_days,
  COUNT(DISTINCT surface_id) AS distinct_surfaces,
  COUNTIF(has_feedback) AS feedback_events,
  COUNTIF(has_citation_click) AS citation_click_events,
  COUNTIF(has_citation_available) AS citation_available_events,
  COUNTIF(has_action_success OR has_agent_completion) AS terminal_success_events,
  COUNTIF(has_friction) AS friction_events,
  COUNTIF(has_explicit_abandon) AS explicit_abandon_events,
  COUNTIF(has_llm_call) AS llm_call_events,
  COUNTIF(has_skill_use) AS skill_use_events,
  COUNTIF(surface_id = 'workflow:AGENT') AS agent_events,
  MIN(IF(has_friction, event_ts, NULL)) AS first_friction_ts,
  STRING_AGG(journey_event_category, ' > ' ORDER BY event_ts LIMIT 25) AS journey_motif
FROM sampled_events
GROUP BY window_id, window_index, user_key;

CREATE TEMP TABLE per_user_surface_repeat AS
SELECT
  window_id,
  user_key,
  surface_id,
  COUNT(*) AS surface_events
FROM sampled_events
GROUP BY window_id, user_key, surface_id;

CREATE TEMP TABLE per_user_surface_repeat_counts AS
SELECT
  window_id,
  user_key,
  COUNTIF(surface_events >= 2) AS repeated_surface_count,
  COUNTIF(surface_events >= 3) AS heavily_repeated_surface_count
FROM per_user_surface_repeat
GROUP BY window_id, user_key;

CREATE TEMP TABLE per_user_post_friction_counts AS
SELECT
  base.window_id,
  base.user_key,
  COUNTIF(event.event_ts > base.first_friction_ts AND event.has_continuation_or_resolution) AS post_friction_continuation_events,
  COUNTIF(event.event_ts > base.first_friction_ts AND (event.has_action_success OR event.has_agent_completion)) AS post_friction_success_events
FROM per_user_window_base AS base
LEFT JOIN sampled_events AS event
  ON event.window_id = base.window_id
 AND event.user_key = base.user_key
GROUP BY base.window_id, base.user_key;

CREATE TEMP TABLE per_user_window AS
SELECT
  base.*,
  COALESCE(surface.repeated_surface_count, 0) AS repeated_surface_count,
  COALESCE(surface.heavily_repeated_surface_count, 0) AS heavily_repeated_surface_count,
  COALESCE(friction.post_friction_continuation_events, 0) AS post_friction_continuation_events,
  COALESCE(friction.post_friction_success_events, 0) AS post_friction_success_events,
  SAFE_DIVIDE(base.total_events, NULLIF(base.active_days, 0)) AS frequency_runs_per_active_day,
  base.active_days AS engagement_active_days,
  base.distinct_surfaces AS breadth_distinct_surfaces
FROM per_user_window_base AS base
LEFT JOIN per_user_surface_repeat_counts AS surface
  ON surface.window_id = base.window_id
 AND surface.user_key = base.user_key
LEFT JOIN per_user_post_friction_counts AS friction
  ON friction.window_id = base.window_id
 AND friction.user_key = base.user_key;

CREATE TEMP TABLE scored_user_windows AS
SELECT
  *,
  CASE NTILE(3) OVER (PARTITION BY window_id ORDER BY frequency_runs_per_active_day, user_key)
    WHEN 1 THEN 'LOW_FREQUENCY'
    WHEN 2 THEN 'MEDIUM_FREQUENCY'
    ELSE 'HIGH_FREQUENCY'
  END AS frequency_band,
  CASE NTILE(3) OVER (PARTITION BY window_id ORDER BY engagement_active_days, user_key)
    WHEN 1 THEN 'LOW_ENGAGEMENT'
    WHEN 2 THEN 'MEDIUM_ENGAGEMENT'
    ELSE 'HIGH_ENGAGEMENT'
  END AS engagement_band,
  CASE NTILE(3) OVER (PARTITION BY window_id ORDER BY breadth_distinct_surfaces, user_key)
    WHEN 1 THEN 'LOW_BREADTH'
    WHEN 2 THEN 'MEDIUM_BREADTH'
    ELSE 'HIGH_BREADTH'
  END AS breadth_band,
  CASE
    WHEN distinct_surfaces >= 3 AND repeated_surface_count >= 2 THEN 'INTEGRATED_REPERTOIRE'
    WHEN distinct_surfaces <= 2 AND repeated_surface_count >= 2 THEN 'FOCUSED_INTEGRATION'
    WHEN total_events >= 3 THEN 'ACTIVE_BUT_SHALLOW'
    ELSE 'UNSTABLE_OR_INSUFFICIENT'
  END AS depth_repertoire_band,
  CASE
    WHEN feedback_events > 0 THEN 'DIRECT_FEEDBACK_EVIDENCE'
    WHEN citation_click_events > 0 OR citation_available_events > 0 THEN 'STRUCTURAL_VERIFICATION_EVIDENCE'
    WHEN terminal_success_events > 0 OR post_friction_continuation_events > 0 THEN 'STRUCTURAL_CONTINUATION_EVIDENCE'
    ELSE 'EVIDENCE_GAP'
  END AS trust_interpretability_tier,
  CASE
    WHEN explicit_abandon_events > 0 THEN 'DIRECT_ABANDON'
    WHEN friction_events > 0 AND post_friction_continuation_events = 0 THEN 'NO_OBSERVED_POST_FRICTION_CONTINUATION'
    WHEN terminal_success_events = 0 AND feedback_events = 0 AND citation_click_events = 0 THEN 'NO_OBSERVED_TERMINAL_EVIDENCE'
    ELSE 'NOT_ABANDONMENT_EVIDENCED'
  END AS abandonment_confidence_tier,
  CASE
    WHEN friction_events > 0 AND post_friction_success_events > 0 THEN 'DIRECT_POST_FRICTION_SUCCESS'
    WHEN friction_events > 0 AND post_friction_continuation_events > 0 THEN 'STRUCTURAL_POST_FRICTION_CONTINUATION'
    WHEN friction_events > 0 THEN 'FRICTION_WITHOUT_OBSERVED_CONTINUATION'
    ELSE 'NO_FRICTION_OBSERVED'
  END AS recovery_confidence_tier,
  CASE
    WHEN llm_call_events >= 3 OR heavily_repeated_surface_count > 0 THEN 'HEAVY_RETRY_OR_REFINEMENT_LOOP'
    WHEN llm_call_events = 2 OR repeated_surface_count > 0 THEN 'LIGHT_RETRY_OR_REFINEMENT_LOOP'
    ELSE 'NO_RETRY_OR_REFINEMENT_LOOP_OBSERVED'
  END AS refinement_confidence_tier,
  LEAST(
    1.0,
    GREATEST(
      0.0,
      0.5
      + 0.25 * IF(feedback_events > 0 OR citation_click_events > 0 OR citation_available_events > 0, 1.0, 0.0)
      + 0.25 * IF(friction_events > 0 AND post_friction_continuation_events > 0, 1.0, IF(friction_events = 0, 0.5, 0.0))
      - 0.25 * IF(explicit_abandon_events > 0 OR (friction_events > 0 AND post_friction_continuation_events = 0), 1.0, 0.0)
      - 0.25 * IF(llm_call_events >= 3 OR friction_events >= 2, 1.0, 0.0)
    )
  ) AS reliability_indicator,
  LEAST(
    1.5,
    GREATEST(
      0.5,
      1.0
      + 0.30 * IF(feedback_events > 0 OR citation_click_events > 0 OR citation_available_events > 0, 1.0, 0.0)
      + 0.25 * IF(friction_events > 0 AND post_friction_continuation_events > 0, 1.0, IF(friction_events = 0, 0.5, 0.0))
      - 0.35 * IF(explicit_abandon_events > 0 OR (friction_events > 0 AND post_friction_continuation_events = 0), 1.0, 0.0)
      - 0.30 * IF(llm_call_events >= 3 OR friction_events >= 2, 1.0, 0.0)
    )
  ) AS quality_multiplier_indicator
FROM per_user_window;

CREATE TEMP TABLE framework_user_windows AS
SELECT
  *,
  CASE
    WHEN frequency_band = 'HIGH_FREQUENCY'
      OR engagement_band = 'HIGH_ENGAGEMENT'
      OR breadth_band = 'HIGH_BREADTH' THEN 'HIGH_VELOCITY'
    WHEN frequency_band = 'LOW_FREQUENCY'
      AND engagement_band = 'LOW_ENGAGEMENT'
      AND breadth_band = 'LOW_BREADTH' THEN 'LOW_VELOCITY'
    ELSE 'MEDIUM_VELOCITY'
  END AS velocity_band,
  CASE
    WHEN trust_interpretability_tier = 'EVIDENCE_GAP' THEN 'TRUST_EVIDENCE_GAP'
    WHEN depth_repertoire_band = 'UNSTABLE_OR_INSUFFICIENT' THEN 'INSTRUMENTATION_HOLD'
    WHEN (
      frequency_band = 'HIGH_FREQUENCY'
      OR engagement_band = 'HIGH_ENGAGEMENT'
      OR breadth_band = 'HIGH_BREADTH'
    ) AND depth_repertoire_band = 'INTEGRATED_REPERTOIRE'
      AND reliability_indicator >= 0.5 THEN 'SCALE_CANDIDATE'
    WHEN depth_repertoire_band = 'ACTIVE_BUT_SHALLOW' THEN 'SHALLOW_ADOPTION'
    WHEN depth_repertoire_band = 'FOCUSED_INTEGRATION' THEN 'FOCUSED_EXPERT_USE'
    ELSE 'INSTRUMENTATION_HOLD'
  END AS readout_zone,
  CASE
    WHEN reliability_indicator >= 0.75 THEN 'HIGH_RELIABILITY_CONTEXT'
    WHEN reliability_indicator >= 0.5 THEN 'MEDIUM_RELIABILITY_CONTEXT'
    ELSE 'LOW_RELIABILITY_CONTEXT'
  END AS reliability_band,
  CASE
    WHEN quality_multiplier_indicator >= 1.15 THEN 'QUALITY_SUPPORTIVE_CONTEXT'
    WHEN quality_multiplier_indicator >= 0.85 THEN 'QUALITY_NEUTRAL_CONTEXT'
    ELSE 'QUALITY_DISCOUNT_CONTEXT'
  END AS quality_band
FROM scored_user_windows;

CREATE TEMP TABLE band_summary AS
SELECT
  window_id,
  velocity_band,
  depth_repertoire_band,
  trust_interpretability_tier,
  reliability_band,
  quality_band,
  readout_zone,
  COUNT(*) AS user_window_count,
  SUM(total_events) AS total_events,
  AVG(frequency_runs_per_active_day) AS avg_frequency,
  AVG(engagement_active_days) AS avg_engagement,
  AVG(breadth_distinct_surfaces) AS avg_breadth,
  AVG(reliability_indicator) AS avg_reliability,
  AVG(quality_multiplier_indicator) AS avg_quality_multiplier
FROM framework_user_windows
GROUP BY
  window_id,
  velocity_band,
  depth_repertoire_band,
  trust_interpretability_tier,
  reliability_band,
  quality_band,
  readout_zone;

CREATE TEMP TABLE motif_summary AS
SELECT
  window_id,
  journey_motif,
  COUNT(*) AS user_window_count,
  AVG(reliability_indicator) AS avg_reliability,
  AVG(quality_multiplier_indicator) AS avg_quality_multiplier
FROM framework_user_windows
GROUP BY window_id, journey_motif;

CREATE TEMP TABLE linked_episode_paths AS
SELECT
  event.window_id,
  event.user_key,
  COALESCE(event.run_or_action_key, event.session_token, event.tracking_token) AS linked_episode_key,
  CASE
    WHEN event.run_or_action_key IS NOT NULL THEN 'RUN_OR_ACTION_LINKED'
    WHEN event.session_token IS NOT NULL THEN 'SESSION_LINKED'
    WHEN event.tracking_token IS NOT NULL THEN 'TRACE_OR_TRACKING_LINKED'
    ELSE 'UNLINKED'
  END AS link_strength,
  STRING_AGG(event.journey_event_category, ' > ' ORDER BY event.event_ts LIMIT 20) AS linked_journey_motif,
  COUNT(*) AS linked_event_count,
  COUNT(DISTINCT event.journey_event_category) AS linked_category_count,
  LOGICAL_OR(event.has_friction) AS has_linked_friction,
  LOGICAL_OR(event.has_continuation_or_resolution) AS has_linked_continuation,
  LOGICAL_OR(event.has_citation_available OR event.has_citation_click) AS has_linked_verification
FROM sampled_events AS event
WHERE COALESCE(event.run_or_action_key, event.session_token, event.tracking_token) IS NOT NULL
GROUP BY
  event.window_id,
  event.user_key,
  linked_episode_key,
  link_strength;

CREATE TEMP TABLE linked_motif_summary AS
SELECT
  path.window_id,
  path.link_strength,
  path.linked_journey_motif,
  COUNT(*) AS linked_episode_count,
  AVG(path.linked_event_count) AS avg_linked_event_count,
  AVG(path.linked_category_count) AS avg_linked_category_count,
  AVG(IF(path.has_linked_friction, 1, 0)) AS linked_friction_rate,
  AVG(IF(path.has_linked_continuation, 1, 0)) AS linked_continuation_rate,
  AVG(IF(path.has_linked_verification, 1, 0)) AS linked_verification_rate,
  AVG(framework_window.reliability_indicator) AS avg_reliability,
  AVG(framework_window.quality_multiplier_indicator) AS avg_quality_multiplier
FROM linked_episode_paths AS path
JOIN framework_user_windows AS framework_window
  ON framework_window.window_id = path.window_id
 AND framework_window.user_key = path.user_key
GROUP BY
  path.window_id,
  path.link_strength,
  path.linked_journey_motif;

CREATE TEMP TABLE linked_motif_tier_summary AS
SELECT
  window_id,
  CASE
    WHEN link_strength = 'RUN_OR_ACTION_LINKED'
      AND REGEXP_CONTAINS(linked_journey_motif, r'(FRICTION_|AGENT_STEP_SKIPPED|AGENT_STEP_ERROR|AGENT_STEP_PAUSED)')
      AND linked_continuation_rate > 0 THEN 'POST_FRICTION_CONTINUATION'
    WHEN link_strength = 'RUN_OR_ACTION_LINKED'
      AND linked_verification_rate > 0
      AND REGEXP_CONTAINS(linked_journey_motif, r'(AGENT_|ACTION_|WORKFLOW_RUN)') THEN 'VERIFICATION_ATTACHED_WORKFLOW'
    WHEN link_strength = 'RUN_OR_ACTION_LINKED'
      AND REGEXP_CONTAINS(linked_journey_motif, r'(AGENT_|ACTION_|WORKFLOW_RUN)') THEN 'EXECUTION_LINKED_WORKFLOW'
    WHEN link_strength = 'SESSION_LINKED'
      AND REGEXP_CONTAINS(linked_journey_motif, r'SEARCH')
      AND REGEXP_CONTAINS(linked_journey_motif, r'AGENT_TRACE_CONTEXT') THEN 'SEARCH_TO_AGENT_ESCALATION'
    WHEN linked_journey_motif IN ('AUTOCOMPLETE', 'SEARCH') THEN 'HIGH_VOLUME_ASSISTIVE_SURFACE'
    WHEN REGEXP_CONTAINS(linked_journey_motif, r'(BOT_ACTIVITY_UNLINKED|MCP_ACTIVITY_UNLINKED|AI_SUMMARY_WEAK_LINKAGE|WORKFLOW_CONTEXT_ONLY|SESSION_CONTEXT_ONLY|AGENT_TRACE_CONTEXT)')
      THEN 'WEAK_LINKAGE_CONTEXT'
    ELSE 'OTHER_LINKED_CONTEXT'
  END AS motif_tier,
  COUNT(*) AS motif_shape_count,
  SUM(linked_episode_count) AS linked_episode_count,
  AVG(avg_linked_event_count) AS avg_linked_event_count,
  AVG(avg_linked_category_count) AS avg_linked_category_count,
  AVG(linked_friction_rate) AS linked_friction_rate,
  AVG(linked_continuation_rate) AS linked_continuation_rate,
  AVG(linked_verification_rate) AS linked_verification_rate,
  AVG(avg_reliability) AS avg_reliability,
  AVG(avg_quality_multiplier) AS avg_quality_multiplier
FROM linked_motif_summary
GROUP BY
  window_id,
  motif_tier;

CREATE TEMP TABLE primitive_confidence AS
SELECT window_id, 'abandonment_or_continuation' AS primitive, abandonment_confidence_tier AS confidence_tier, COUNT(*) AS user_window_count
FROM framework_user_windows
GROUP BY window_id, confidence_tier
UNION ALL
SELECT window_id, 'recovery_or_post_friction_continuation', recovery_confidence_tier, COUNT(*)
FROM framework_user_windows
GROUP BY window_id, recovery_confidence_tier
UNION ALL
SELECT window_id, 'iteration_or_refinement', refinement_confidence_tier, COUNT(*)
FROM framework_user_windows
GROUP BY window_id, refinement_confidence_tier
UNION ALL
SELECT window_id, 'trust_interpretability', trust_interpretability_tier, COUNT(*)
FROM framework_user_windows
GROUP BY window_id, trust_interpretability_tier;

CREATE TEMP TABLE classification_axis_summary AS
SELECT
  window_id,
  'velocity' AS classification_axis,
  velocity_band AS classification_value,
  COUNT(*) AS user_window_count,
  AVG(frequency_runs_per_active_day) AS avg_frequency,
  AVG(engagement_active_days) AS avg_engagement,
  AVG(breadth_distinct_surfaces) AS avg_breadth,
  AVG(reliability_indicator) AS avg_reliability,
  AVG(quality_multiplier_indicator) AS avg_quality_multiplier
FROM framework_user_windows
GROUP BY window_id, classification_value
UNION ALL
SELECT
  window_id,
  'depth_repertoire',
  depth_repertoire_band,
  COUNT(*),
  AVG(frequency_runs_per_active_day),
  AVG(engagement_active_days),
  AVG(breadth_distinct_surfaces),
  AVG(reliability_indicator),
  AVG(quality_multiplier_indicator)
FROM framework_user_windows
GROUP BY window_id, depth_repertoire_band
UNION ALL
SELECT
  window_id,
  'trust_interpretability',
  trust_interpretability_tier,
  COUNT(*),
  AVG(frequency_runs_per_active_day),
  AVG(engagement_active_days),
  AVG(breadth_distinct_surfaces),
  AVG(reliability_indicator),
  AVG(quality_multiplier_indicator)
FROM framework_user_windows
GROUP BY window_id, trust_interpretability_tier
UNION ALL
SELECT
  window_id,
  'reliability_context',
  reliability_band,
  COUNT(*),
  AVG(frequency_runs_per_active_day),
  AVG(engagement_active_days),
  AVG(breadth_distinct_surfaces),
  AVG(reliability_indicator),
  AVG(quality_multiplier_indicator)
FROM framework_user_windows
GROUP BY window_id, reliability_band
UNION ALL
SELECT
  window_id,
  'quality_context',
  quality_band,
  COUNT(*),
  AVG(frequency_runs_per_active_day),
  AVG(engagement_active_days),
  AVG(breadth_distinct_surfaces),
  AVG(reliability_indicator),
  AVG(quality_multiplier_indicator)
FROM framework_user_windows
GROUP BY window_id, quality_band
UNION ALL
SELECT
  window_id,
  'readout_zone',
  readout_zone,
  COUNT(*),
  AVG(frequency_runs_per_active_day),
  AVG(engagement_active_days),
  AVG(breadth_distinct_surfaces),
  AVG(reliability_indicator),
  AVG(quality_multiplier_indicator)
FROM framework_user_windows
GROUP BY window_id, readout_zone;

WITH final_rows AS (
SELECT
  'FRAMEWORK_MICROCOSM_SUMMARY' AS output_section,
  window_id,
  'sampled_internal_windows' AS primary_dimension,
  'all_frameworks' AS secondary_dimension,
  'aggregate_only' AS tertiary_dimension,
  COUNT(*) AS aggregate_count,
  ROUND(AVG(frequency_runs_per_active_day), 4) AS metric_1,
  ROUND(AVG(engagement_active_days), 4) AS metric_2,
  ROUND(AVG(breadth_distinct_surfaces), 4) AS metric_3,
  ROUND(AVG(reliability_indicator), 4) AS metric_4,
  ROUND(AVG(quality_multiplier_indicator), 4) AS metric_5,
  'metric_1=avg_frequency; metric_2=avg_engagement; metric_3=avg_breadth; metric_4=avg_reliability; metric_5=avg_quality_multiplier' AS metric_note
FROM framework_user_windows
GROUP BY window_id

UNION ALL

SELECT
  'CLASSIFICATION_DISTRIBUTION_SUMMARY',
  window_id,
  classification_axis,
  IF(SUM(user_window_count) < small_cell_floor, 'SMALL_CELL_SUPPRESSED', classification_value),
  'aggregate_classification',
  IF(SUM(user_window_count) < small_cell_floor, 0, SUM(user_window_count)),
  IF(SUM(user_window_count) < small_cell_floor, NULL, ROUND(AVG(avg_frequency), 4)),
  IF(SUM(user_window_count) < small_cell_floor, NULL, ROUND(AVG(avg_engagement), 4)),
  IF(SUM(user_window_count) < small_cell_floor, NULL, ROUND(AVG(avg_breadth), 4)),
  IF(SUM(user_window_count) < small_cell_floor, NULL, ROUND(AVG(avg_reliability), 4)),
  IF(SUM(user_window_count) < small_cell_floor, NULL, ROUND(AVG(avg_quality_multiplier), 4)),
  'Classification distributions are aggregate evidence bands; small cells are suppressed independently.'
FROM classification_axis_summary
GROUP BY
  window_id,
  classification_axis,
  classification_value

UNION ALL

SELECT
  'FRAMEWORK_BAND_SUMMARY',
  window_id,
  IF(SUM(user_window_count) < small_cell_floor, 'SMALL_CELL_SUPPRESSED', velocity_band),
  IF(SUM(user_window_count) < small_cell_floor, 'SMALL_CELL_SUPPRESSED', CONCAT(depth_repertoire_band, '|', trust_interpretability_tier)),
  IF(SUM(user_window_count) < small_cell_floor, 'SMALL_CELL_SUPPRESSED', CONCAT(readout_zone, '|', reliability_band, '|', quality_band)),
  IF(SUM(user_window_count) < small_cell_floor, 0, SUM(user_window_count)),
  IF(SUM(user_window_count) < small_cell_floor, NULL, ROUND(AVG(avg_frequency), 4)),
  IF(SUM(user_window_count) < small_cell_floor, NULL, ROUND(AVG(avg_engagement), 4)),
  IF(SUM(user_window_count) < small_cell_floor, NULL, ROUND(AVG(avg_breadth), 4)),
  IF(SUM(user_window_count) < small_cell_floor, NULL, ROUND(AVG(avg_reliability), 4)),
  IF(SUM(user_window_count) < small_cell_floor, NULL, ROUND(AVG(avg_quality_multiplier), 4)),
  'Small cells below the aggregate floor are suppressed; metrics retain framework context only.'
FROM band_summary
GROUP BY
  window_id,
  velocity_band,
  depth_repertoire_band,
  trust_interpretability_tier,
  readout_zone,
  reliability_band,
  quality_band

UNION ALL

SELECT
  'JOURNEY_MOTIF_SUMMARY',
  window_id,
  IF(SUM(user_window_count) < small_cell_floor, 'SMALL_CELL_SUPPRESSED', journey_motif),
  'journey_motif',
  'aggregate_path_shape',
  IF(SUM(user_window_count) < small_cell_floor, 0, SUM(user_window_count)),
  NULL,
  NULL,
  NULL,
  IF(SUM(user_window_count) < small_cell_floor, NULL, ROUND(AVG(avg_reliability), 4)),
  IF(SUM(user_window_count) < small_cell_floor, NULL, ROUND(AVG(avg_quality_multiplier), 4)),
  'Journey motifs are aggregate path shapes; no row-level sequence is emitted.'
FROM motif_summary
GROUP BY
  window_id,
  journey_motif

UNION ALL

SELECT
  'LINKED_JOURNEY_MOTIF_SUMMARY',
  window_id,
  IF(SUM(linked_episode_count) < small_cell_floor, 'SMALL_CELL_SUPPRESSED', linked_journey_motif),
  IF(SUM(linked_episode_count) < small_cell_floor, 'SMALL_CELL_SUPPRESSED', link_strength),
  'linked_aggregate_path_shape',
  IF(SUM(linked_episode_count) < small_cell_floor, 0, SUM(linked_episode_count)),
  IF(SUM(linked_episode_count) < small_cell_floor, NULL, ROUND(AVG(avg_linked_event_count), 4)),
  IF(SUM(linked_episode_count) < small_cell_floor, NULL, ROUND(AVG(avg_linked_category_count), 4)),
  IF(SUM(linked_episode_count) < small_cell_floor, NULL, ROUND(AVG(linked_friction_rate), 4)),
  IF(SUM(linked_episode_count) < small_cell_floor, NULL, ROUND(AVG(linked_continuation_rate), 4)),
  IF(SUM(linked_episode_count) < small_cell_floor, NULL, ROUND(AVG(linked_verification_rate), 4)),
  'metric_1=avg_linked_events; metric_2=avg_linked_categories; metric_3=friction_rate; metric_4=continuation_rate; metric_5=verification_rate'
FROM linked_motif_summary
GROUP BY
  window_id,
  link_strength,
  linked_journey_motif

UNION ALL

SELECT
  'MOTIF_TIER_SUMMARY',
  window_id,
  IF(SUM(linked_episode_count) < small_cell_floor, 'SMALL_CELL_SUPPRESSED', motif_tier),
  'linked_motif_tier',
  'aggregate_tier',
  IF(SUM(linked_episode_count) < small_cell_floor, 0, SUM(linked_episode_count)),
  IF(SUM(linked_episode_count) < small_cell_floor, NULL, ROUND(AVG(motif_shape_count), 4)),
  IF(SUM(linked_episode_count) < small_cell_floor, NULL, ROUND(AVG(avg_linked_event_count), 4)),
  IF(SUM(linked_episode_count) < small_cell_floor, NULL, ROUND(AVG(linked_friction_rate), 4)),
  IF(SUM(linked_episode_count) < small_cell_floor, NULL, ROUND(AVG(linked_continuation_rate), 4)),
  IF(SUM(linked_episode_count) < small_cell_floor, NULL, ROUND(AVG(linked_verification_rate), 4)),
  'metric_1=motif_shape_count; metric_2=avg_linked_events; metric_3=friction_rate; metric_4=continuation_rate; metric_5=verification_rate'
FROM linked_motif_tier_summary
GROUP BY
  window_id,
  motif_tier

UNION ALL

SELECT
  'PRIMITIVE_CONFIDENCE_SUMMARY',
  window_id,
  primitive,
  IF(SUM(user_window_count) < small_cell_floor, 'SMALL_CELL_SUPPRESSED', confidence_tier),
  'confidence_tier',
  IF(SUM(user_window_count) < small_cell_floor, 0, SUM(user_window_count)),
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  'Primitive confidence tiers classify evidence strength, not intent.'
FROM primitive_confidence
GROUP BY
  window_id,
  primitive,
  confidence_tier
)
SELECT
  output_section,
  window_id,
  primary_dimension,
  secondary_dimension,
  tertiary_dimension,
  SUM(aggregate_count) AS aggregate_count,
  ROUND(AVG(metric_1), 4) AS metric_1,
  ROUND(AVG(metric_2), 4) AS metric_2,
  ROUND(AVG(metric_3), 4) AS metric_3,
  ROUND(AVG(metric_4), 4) AS metric_4,
  ROUND(AVG(metric_5), 4) AS metric_5,
  metric_note
FROM final_rows
GROUP BY
  output_section,
  window_id,
  primary_dimension,
  secondary_dimension,
  tertiary_dimension,
  metric_note
ORDER BY output_section, window_id, aggregate_count DESC, primary_dimension;
