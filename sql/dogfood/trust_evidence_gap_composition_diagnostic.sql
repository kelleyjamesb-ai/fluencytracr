-- Trust Evidence Gap Composition diagnostic for FluencyTracr dogfood research.
--
-- Research-only. This query does not implement a V4 concept, schema, endpoint,
-- contract, score, canonical event, suppression reason, ROI calculation, or
-- product behavior.
--
-- Purpose:
--   Decompose the public Trust Episode Boundary evidence-gap bucket into
--   aggregate composition buckets. These buckets are diagnostic labels only;
--   they are not canonical events and are not suppression reasons.
--
-- Note:
--   This query follows the Trust Episode Boundary diagnostic layer and emits
--   aggregate candidate-key composition. To compare directly with the retained
--   43.1% product-episode evidence gap, apply the same run-first/trace-first
--   product-episode dedup overlay used by
--   TRUST_PRODUCT_EPISODE_DEDUP_BIGQUERY_READOUT.md before interpreting totals.
--
-- Replace:
--   `PROJECT.DATASET.gce_events` with the approved scrubbed GCE/customer-event table.
--   `PROJECT.DATASET.agent_span_events` with the approved scrubbed agent-span table.
--
-- The final SELECT is aggregate-only. It must not emit user IDs, emails, names,
-- raw prompts, raw responses, transcripts, raw event rows, manager fields, team
-- fields, or person-level metrics.

DECLARE window_start TIMESTAMP DEFAULT TIMESTAMP('2026-05-25T00:00:00Z');
DECLARE window_end TIMESTAMP DEFAULT TIMESTAMP('2026-05-26T00:00:00Z');

WITH trust_signal_events AS (
  SELECT
    timestamp AS event_ts,
    'feedback_signal' AS evidence_family,
    'chat_feedback' AS signal_type,
    key.key_type,
    key.key_value,
    LOWER(COALESCE(jsonPayload.chatfeedback.vote, jsonPayload.chatfeedback.ratingkey, jsonPayload.chatfeedback.event, '')) AS signal_value,
    jsonPayload.chatfeedback.rating AS rating_value,
    FALSE AS citation_click_present,
    FALSE AS citation_available_present
  FROM `PROJECT.DATASET.gce_events`,
  UNNEST([
    STRUCT('run_id' AS key_type, NULLIF(TRIM(jsonPayload.chatfeedback.runid), '') AS key_value),
    STRUCT('workflow_id' AS key_type, NULLIF(TRIM(jsonPayload.chatfeedback.workflowid), '') AS key_value),
    STRUCT('session_token' AS key_type, NULLIF(TRIM(jsonPayload.chatfeedback.sessiontrackingtoken), '') AS key_value),
    STRUCT('trace_id' AS key_type, NULLIF(TRIM(jsonPayload.chatfeedback.traceid), '') AS key_value)
  ]) AS key
  WHERE timestamp >= window_start
    AND timestamp < window_end
    AND key.key_value IS NOT NULL

  UNION ALL

  SELECT
    timestamp AS event_ts,
    'verification_source_behavior' AS evidence_family,
    'citation_click' AS signal_type,
    'tracking_token' AS key_type,
    NULLIF(TRIM(jsonPayload.chatcitationclick.trackingtoken), '') AS key_value,
    '' AS signal_value,
    NULL AS rating_value,
    TRUE AS citation_click_present,
    FALSE AS citation_available_present
  FROM `PROJECT.DATASET.gce_events`
  WHERE timestamp >= window_start
    AND timestamp < window_end
    AND NULLIF(TRIM(jsonPayload.chatcitationclick.trackingtoken), '') IS NOT NULL

  UNION ALL

  SELECT
    timestamp AS event_ts,
    'verification_source_behavior' AS evidence_family,
    'chat_citations_available' AS signal_type,
    'run_id' AS key_type,
    NULLIF(TRIM(jsonPayload.chatcitations.workflowrunid), '') AS key_value,
    '' AS signal_value,
    NULL AS rating_value,
    FALSE AS citation_click_present,
    TRUE AS citation_available_present
  FROM `PROJECT.DATASET.gce_events`
  WHERE timestamp >= window_start
    AND timestamp < window_end
    AND NULLIF(TRIM(jsonPayload.chatcitations.workflowrunid), '') IS NOT NULL

  UNION ALL

  SELECT
    timestamp AS event_ts,
    'feedback_signal' AS evidence_family,
    'ai_answer_vote' AS signal_type,
    'tracking_token' AS key_type,
    NULLIF(TRIM(jsonPayload.aianswervote.trackingtoken), '') AS key_value,
    LOWER(COALESCE(jsonPayload.aianswervote.vote, '')) AS signal_value,
    NULL AS rating_value,
    FALSE AS citation_click_present,
    FALSE AS citation_available_present
  FROM `PROJECT.DATASET.gce_events`
  WHERE timestamp >= window_start
    AND timestamp < window_end
    AND NULLIF(TRIM(jsonPayload.aianswervote.trackingtoken), '') IS NOT NULL

  UNION ALL

  SELECT
    timestamp AS event_ts,
    'feedback_signal' AS evidence_family,
    'ai_summary_vote' AS signal_type,
    'tracking_token' AS key_type,
    NULLIF(TRIM(jsonPayload.aisummaryvote.trackingtoken), '') AS key_value,
    LOWER(COALESCE(jsonPayload.aisummaryvote.vote, '')) AS signal_value,
    NULL AS rating_value,
    FALSE AS citation_click_present,
    FALSE AS citation_available_present
  FROM `PROJECT.DATASET.gce_events`
  WHERE timestamp >= window_start
    AND timestamp < window_end
    AND NULLIF(TRIM(jsonPayload.aisummaryvote.trackingtoken), '') IS NOT NULL
),

gce_action_events AS (
  SELECT
    timestamp AS event_ts,
    key.key_type,
    key.key_value,
    jsonPayload.action.executionstatus = 'SUCCESS' AS has_action_success,
    jsonPayload.action.executionstatus = 'ERROR'
      OR NULLIF(TRIM(jsonPayload.action.errortype), '') IS NOT NULL
      OR NULLIF(TRIM(jsonPayload.action.errorstr), '') IS NOT NULL AS has_action_error
  FROM `PROJECT.DATASET.gce_events`,
  UNNEST(ARRAY_CONCAT(
    [
      STRUCT('action_run_id' AS key_type, NULLIF(TRIM(jsonPayload.action.actionrunid), '') AS key_value),
      STRUCT('workflow_id' AS key_type, NULLIF(TRIM(jsonPayload.action.workflowid), '') AS key_value),
      STRUCT('session_token' AS key_type, NULLIF(TRIM(jsonPayload.action.sessiontrackingtoken), '') AS key_value)
    ],
    ARRAY(
      SELECT AS STRUCT 'tracking_token' AS key_type, NULLIF(TRIM(token), '') AS key_value
      FROM UNNEST(IFNULL(jsonPayload.action.searchtrackingtokens, ARRAY<STRING>[])) AS token
      WHERE NULLIF(TRIM(token), '') IS NOT NULL
    )
  )) AS key
  WHERE timestamp >= window_start
    AND timestamp < window_end
    AND key.key_value IS NOT NULL
),

span_key_events AS (
  SELECT
    timestamp AS event_ts,
    key.key_type,
    key.key_value,
    jsonPayload.action.action_run_id IS NOT NULL
      OR jsonPayload.action.execution_status IS NOT NULL AS has_action_span,
    jsonPayload.action.execution_status = 'SUCCESS' AS has_action_success,
    jsonPayload.action.execution_status = 'ERROR'
      OR NULLIF(TRIM(jsonPayload.action.error_type), '') IS NOT NULL
      OR NULLIF(TRIM(jsonPayload.action.error_str), '') IS NOT NULL AS has_action_error,
    COALESCE(jsonPayload.agent_run.run_id, jsonPayload.agentrun.runid) IS NOT NULL
      OR COALESCE(jsonPayload.agent_run.run_execution_status, jsonPayload.agentrun.spaninfo.executionstatus.code) IS NOT NULL AS has_agent_run,
    jsonPayload.agent_run.run_execution_status = 'SUCCESS' AS has_agent_completion,
    jsonPayload.agent_run.run_execution_status IN ('USER_CANCELLED', 'CANCELLED', 'PAUSED')
      OR jsonPayload.agent_step.step_execution_status = 'PAUSED' AS has_agent_cancel_or_pause,
    jsonPayload.agent_run.run_execution_status = 'ERROR'
      OR NULLIF(TRIM(jsonPayload.agent_run.error_type), '') IS NOT NULL
      OR jsonPayload.agent_step.step_execution_status = 'ERROR'
      OR NULLIF(TRIM(jsonPayload.agent_step.error_type), '') IS NOT NULL AS has_agent_error,
    jsonPayload.agent_step.step_execution_status = 'SKIPPED' AS has_step_skipped,
    jsonPayload.llmcall.model IS NOT NULL AS has_llm_call,
    NULLIF(TRIM(jsonPayload.action.skill_reader_attributes.skill_name), '') IS NOT NULL AS has_skill_use,
    COALESCE(jsonPayload.agent_step.citations_data.has_user_facing_citations, FALSE)
      OR COALESCE(ARRAY_LENGTH(jsonPayload.agent_step.citations_data.positioned_citations), 0) > 0
      OR COALESCE(ARRAY_LENGTH(jsonPayload.agent_run.citations_data.positioned_citations), 0) > 0 AS has_citations_present
  FROM `PROJECT.DATASET.agent_span_events`,
  UNNEST(ARRAY_CONCAT(
    [
      STRUCT('run_id' AS key_type, COALESCE(
        NULLIF(TRIM(jsonPayload.context.workflow.runid), ''),
        NULLIF(TRIM(jsonPayload.context.workflow.run_id), ''),
        NULLIF(TRIM(jsonPayload.agent_run.run_id), ''),
        NULLIF(TRIM(jsonPayload.agentrun.runid), '')
      ) AS key_value),
      STRUCT('workflow_id' AS key_type, COALESCE(
        NULLIF(TRIM(jsonPayload.context.workflow.workflowid), ''),
        NULLIF(TRIM(jsonPayload.context.workflow.workflow_id), ''),
        NULLIF(TRIM(jsonPayload.context.workflow.rootworkflowid), ''),
        NULLIF(TRIM(jsonPayload.context.workflow.root_workflow_id), ''),
        NULLIF(TRIM(jsonPayload.agent_run.workflow_id), ''),
        NULLIF(TRIM(jsonPayload.agentrun.workflowid), ''),
        NULLIF(TRIM(jsonPayload.action.workflow_id), '')
      ) AS key_value),
      STRUCT('session_token' AS key_type, COALESCE(
        NULLIF(TRIM(jsonPayload.spaninfo.sessioninfo.sessiontrackingtoken), ''),
        NULLIF(TRIM(jsonPayload.span_info.session_info.session_tracking_token), ''),
        NULLIF(TRIM(jsonPayload.action.spaninfo.sessioninfo.sessiontrackingtoken), ''),
        NULLIF(TRIM(jsonPayload.agentrun.spaninfo.sessioninfo.sessiontrackingtoken), ''),
        NULLIF(TRIM(jsonPayload.llmcall.spaninfo.sessioninfo.sessiontrackingtoken), '')
      ) AS key_value),
      STRUCT('trace_id' AS key_type, COALESCE(
        NULLIF(TRIM(jsonPayload.context.agenttrace.traceid), ''),
        NULLIF(TRIM(jsonPayload.context.agent_trace.trace_id), ''),
        NULLIF(TRIM(jsonPayload.agent_run.cloud_trace_id), '')
      ) AS key_value),
      STRUCT('action_run_id' AS key_type, NULLIF(TRIM(jsonPayload.action.action_run_id), '') AS key_value)
    ],
    ARRAY(
      SELECT AS STRUCT 'tracking_token' AS key_type, NULLIF(TRIM(token), '') AS key_value
      FROM UNNEST(ARRAY_CONCAT(
        IF(jsonPayload.action.source_info.search_tracking_token IS NULL, ARRAY<STRING>[], [jsonPayload.action.source_info.search_tracking_token]),
        IFNULL(jsonPayload.action.search_tracking_tokens, ARRAY<STRING>[])
      )) AS token
      WHERE NULLIF(TRIM(token), '') IS NOT NULL
    )
  )) AS key
  WHERE timestamp >= window_start
    AND timestamp < window_end
    AND key.key_value IS NOT NULL
),

trust_features AS (
  SELECT
    key_type,
    key_value,
    COUNT(*) AS trust_signal_count,
    COUNTIF(evidence_family = 'feedback_signal') AS explicit_feedback_count,
    COUNTIF(
      evidence_family = 'feedback_signal'
      AND (
        signal_value IN ('up', 'thumbs_up', 'positive', 'like', 'helpful')
        OR rating_value >= 4
      )
    ) AS positive_feedback_count,
    COUNTIF(
      evidence_family = 'feedback_signal'
      AND (
        signal_value IN ('down', 'thumbs_down', 'negative', 'dislike', 'unhelpful')
        OR rating_value <= 2
      )
    ) AS negative_feedback_count,
    COUNTIF(citation_click_present) AS citation_click_count,
    COUNTIF(citation_available_present) AS citation_available_count
  FROM trust_signal_events
  GROUP BY key_type, key_value
),

gce_action_features AS (
  SELECT
    key_type,
    key_value,
    COUNT(*) AS gce_action_count,
    COUNTIF(has_action_success) AS gce_action_success_count,
    COUNTIF(has_action_error) AS gce_action_error_count
  FROM gce_action_events
  GROUP BY key_type, key_value
),

span_base_features AS (
  SELECT
    key_type,
    key_value,
    COUNT(*) AS span_rows,
    COUNTIF(has_action_span) AS action_span_count,
    COUNTIF(has_action_success) AS action_success_count,
    COUNTIF(has_action_error) AS action_error_count,
    COUNTIF(has_agent_run) AS agent_run_count,
    COUNTIF(has_agent_completion) AS agent_completion_count,
    COUNTIF(has_agent_error OR has_agent_cancel_or_pause OR has_step_skipped) AS failure_or_friction_count,
    COUNTIF(has_skill_use) AS skill_use_count,
    COUNTIF(has_llm_call) AS llm_call_count,
    COUNTIF(has_citations_present) AS citation_present_count,
    MIN(IF(has_agent_error OR has_agent_cancel_or_pause OR has_step_skipped OR has_action_error, event_ts, NULL)) AS first_failure_ts,
    MIN(IF(has_skill_use, event_ts, NULL)) AS first_skill_ts
  FROM span_key_events
  GROUP BY key_type, key_value
),

span_features AS (
  SELECT
    base.key_type,
    base.key_value,
    base.span_rows,
    base.action_span_count,
    base.action_success_count,
    base.action_error_count,
    base.agent_run_count,
    base.agent_completion_count,
    base.failure_or_friction_count,
    base.skill_use_count,
    base.llm_call_count,
    base.citation_present_count,
    COUNTIF(
      base.first_failure_ts IS NOT NULL
      AND event.event_ts > base.first_failure_ts
      AND (
        event.has_action_success
        OR event.has_agent_completion
        OR event.has_skill_use
        OR event.has_llm_call
      )
    ) AS post_failure_continuation_count,
    COUNTIF(
      base.first_skill_ts IS NOT NULL
      AND event.event_ts > base.first_skill_ts
      AND (
        event.has_action_success
        OR event.has_agent_completion
        OR event.has_citations_present
      )
    ) AS post_skill_continuation_count
  FROM span_base_features AS base
  JOIN span_key_events AS event
    ON event.key_type = base.key_type
   AND event.key_value = base.key_value
  GROUP BY
    base.key_type,
    base.key_value,
    base.span_rows,
    base.action_span_count,
    base.action_success_count,
    base.action_error_count,
    base.agent_run_count,
    base.agent_completion_count,
    base.failure_or_friction_count,
    base.skill_use_count,
    base.llm_call_count,
    base.citation_present_count
),

episode_candidates AS (
  SELECT key_type, key_value FROM trust_features
  UNION DISTINCT
  SELECT key_type, key_value FROM gce_action_features
  UNION DISTINCT
  SELECT key_type, key_value FROM span_features
),

episodes AS (
  SELECT
    candidate.key_type,
    candidate.key_value,
    COALESCE(trust.trust_signal_count, 0) AS trust_signal_count,
    COALESCE(trust.explicit_feedback_count, 0) AS explicit_feedback_count,
    COALESCE(trust.positive_feedback_count, 0) AS positive_feedback_count,
    COALESCE(trust.negative_feedback_count, 0) AS negative_feedback_count,
    COALESCE(trust.citation_click_count, 0) AS citation_click_count,
    COALESCE(trust.citation_available_count, 0) AS citation_available_count,
    COALESCE(span.span_rows, 0) AS span_rows,
    COALESCE(span.action_span_count, 0) + COALESCE(gce.gce_action_count, 0) AS action_count,
    COALESCE(span.action_success_count, 0) + COALESCE(gce.gce_action_success_count, 0) AS action_success_count,
    COALESCE(span.action_error_count, 0) + COALESCE(gce.gce_action_error_count, 0) AS action_error_count,
    COALESCE(span.agent_run_count, 0) AS agent_run_count,
    COALESCE(span.agent_completion_count, 0) AS agent_completion_count,
    COALESCE(span.failure_or_friction_count, 0) AS failure_or_friction_count,
    COALESCE(span.skill_use_count, 0) AS skill_use_count,
    COALESCE(span.llm_call_count, 0) AS llm_call_count,
    COALESCE(span.citation_present_count, 0) AS citation_present_count,
    COALESCE(span.post_failure_continuation_count, 0) AS post_failure_continuation_count,
    COALESCE(span.post_skill_continuation_count, 0) AS post_skill_continuation_count
  FROM episode_candidates AS candidate
  LEFT JOIN trust_features AS trust
    ON trust.key_type = candidate.key_type
   AND trust.key_value = candidate.key_value
  LEFT JOIN gce_action_features AS gce
    ON gce.key_type = candidate.key_type
   AND gce.key_value = candidate.key_value
  LEFT JOIN span_features AS span
    ON span.key_type = candidate.key_type
   AND span.key_value = candidate.key_value
),

episode_patterns AS (
  SELECT
    key_type,
    key_value,
    CASE
      WHEN negative_feedback_count > 0 THEN 'explicit_negative_feedback'
      WHEN failure_or_friction_count > 0 AND post_failure_continuation_count > 0 THEN 'recovered_after_failure'
      WHEN failure_or_friction_count > 0 AND post_failure_continuation_count = 0 THEN 'stalled_after_ai_assist'
      WHEN (action_success_count > 0 OR agent_completion_count > 0)
        AND (
          positive_feedback_count > 0
          OR citation_click_count > 0
          OR citation_available_count > 0
          OR citation_present_count > 0
        ) THEN 'resolved_with_confidence'
      WHEN action_success_count > 0 OR agent_completion_count > 0 THEN 'resolved_without_verification_signal'
      ELSE 'evidence_gap'
    END AS episode_pattern,
    CASE
      WHEN key_type IN ('run_id', 'workflow_id') THEN 'immediate_episode'
      WHEN key_type = 'session_token' THEN 'same_session_continuation'
      WHEN key_type IN ('action_run_id', 'tracking_token') THEN 'downstream_governed_action'
      WHEN key_type = 'trace_id' THEN 'trace_context'
      ELSE 'unknown_boundary'
    END AS boundary_layer,
    trust_signal_count,
    explicit_feedback_count,
    positive_feedback_count,
    negative_feedback_count,
    citation_click_count,
    citation_available_count,
    citation_present_count,
    span_rows,
    action_count,
    action_success_count,
    action_error_count,
    agent_run_count,
    agent_completion_count,
    failure_or_friction_count,
    skill_use_count,
    llm_call_count,
    post_failure_continuation_count,
    post_skill_continuation_count
  FROM episodes
),

pattern_groups AS (
  SELECT
    episode_pattern,
    boundary_layer,
    COUNT(*) AS group_episode_count
  FROM episode_patterns
  GROUP BY episode_pattern, boundary_layer
),

gap_candidates AS (
  SELECT
    pattern.*,
    pattern_group.group_episode_count,
    pattern.episode_pattern != 'evidence_gap'
      AND pattern.boundary_layer NOT IN ('immediate_episode', 'same_session_continuation') AS has_unsafe_boundary,
    pattern.episode_pattern != 'evidence_gap'
      AND pattern_group.group_episode_count < 5 AS has_sub_floor_pattern
  FROM episode_patterns AS pattern
  JOIN pattern_groups AS pattern_group
    ON pattern_group.episode_pattern = pattern.episode_pattern
   AND pattern_group.boundary_layer = pattern.boundary_layer
  WHERE pattern.episode_pattern = 'evidence_gap'
    OR pattern.boundary_layer NOT IN ('immediate_episode', 'same_session_continuation')
    OR pattern_group.group_episode_count < 5
),

gap_composition AS (
  SELECT
    CASE
      WHEN has_sub_floor_pattern THEN 'small_cell_withheld'
      WHEN has_unsafe_boundary THEN 'ambiguous_boundary_folded'
      WHEN episode_pattern = 'evidence_gap'
        AND (
          trust_signal_count > 0
          OR explicit_feedback_count > 0
          OR positive_feedback_count > 0
          OR negative_feedback_count > 0
          OR citation_click_count > 0
          OR citation_available_count > 0
          OR citation_present_count > 0
        ) THEN 'verification_or_feedback_without_observed_resolution'
      WHEN episode_pattern = 'evidence_gap'
        AND (
          action_count > 0
          OR agent_run_count > 0
          OR skill_use_count > 0
        ) THEN 'ai_activity_without_terminal_outcome'
      WHEN episode_pattern = 'evidence_gap'
        AND (
          span_rows > 0
          OR llm_call_count > 0
        ) THEN 'span_or_llm_activity_without_governed_outcome'
      WHEN episode_pattern = 'evidence_gap'
        AND key_type IN ('tracking_token', 'session_token', 'workflow_id') THEN 'weak_parent_linkage'
      WHEN episode_pattern = 'evidence_gap' THEN 'raw_gap_insufficient_downstream_evidence'
      ELSE 'other_evidence_gap'
    END AS gap_component,
    CASE
      WHEN has_sub_floor_pattern
        THEN 'rare aggregate component below output floor; exact value must be withheld from shareable readouts'
      WHEN has_unsafe_boundary
        THEN 'candidate episode-key count; trace, run, action, or session keys may overlap'
      WHEN episode_pattern = 'evidence_gap'
        AND (
          trust_signal_count > 0
          OR citation_click_count > 0
          OR citation_available_count > 0
          OR citation_present_count > 0
        ) THEN 'verification or feedback exists without observed aggregate resolution'
      WHEN episode_pattern = 'evidence_gap'
        AND (
          action_count > 0
          OR agent_run_count > 0
          OR skill_use_count > 0
        ) THEN 'AI work activity exists without terminal aggregate outcome evidence'
      WHEN episode_pattern = 'evidence_gap'
        AND (
          span_rows > 0
          OR llm_call_count > 0
        ) THEN 'span or LLM activity exists without governed aggregate outcome evidence'
      WHEN episode_pattern = 'evidence_gap'
        AND key_type IN ('tracking_token', 'session_token', 'workflow_id')
        THEN 'parent linkage is present but too weak for trust interpretation'
      WHEN episode_pattern = 'evidence_gap'
        THEN 'episode has insufficient downstream evidence for trust interpretation'
      ELSE 'aggregate evidence gap'
    END AS coverage_caveat
  FROM gap_candidates
)

SELECT
  gap_component,
  COUNT(*) AS episode_count,
  SAFE_DIVIDE(COUNT(*), SUM(COUNT(*)) OVER ()) AS episode_share_of_gap,
  coverage_caveat
FROM gap_composition
GROUP BY gap_component, coverage_caveat
ORDER BY episode_count DESC, gap_component;
