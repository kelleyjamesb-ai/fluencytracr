-- Skill read availability diagnostic for FluencyTracr dogfood.
--
-- Replace `PROJECT.DATASET.scrubbed_agentspan_*` with the scrubbed agent span
-- wildcard table before running. Usage evidence should come from raw agent
-- spans such as `scio-apps.scrubbed_agentspan.scrubbed_agentspan_*` or the dbt
-- `action_runs_v2` / `action_runs` fact tables. Skill definition stores such
-- as `data/skills/`, `data/plugin_skills/`, PluginSkillStore, or UGC
-- ListAccessibleSkills are catalog/eligibility sources, not usage sources.
--
-- This is research-only SQL. It emits aggregate rows only and is meant to
-- determine whether skill-read telemetry is available, how much of it is
-- unspecified, and whether the reads carry enough parent identifiers to support
-- later governed attribution.
--
-- This diagnostic intentionally does not output raw skill names, user IDs,
-- emails, prompts, outputs, transcripts, raw event rows, or stable per-user
-- identifiers. Skill display names can be sensitive; the first governed
-- question is availability and joinability, not a per-skill leaderboard.
--
-- Caveats:
-- - Native/platform skills only: detection requires logging through
--   SkillReaderAttributes and the skill-reader enum mapping.
-- - UGC/user-created skills are not yet logged by canonical ID.
-- - Plugin/MCP find_skills downloads may not produce repeat skill-reader spans
--   after a skill has been downloaded.
-- - The proposed canonical schema with skill_id, skill_version_id,
--   invocation mode, and trigger method is not assumed by this diagnostic.

DECLARE window_start TIMESTAMP DEFAULT TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 60 DAY);
DECLARE window_end TIMESTAMP DEFAULT CURRENT_TIMESTAMP();

WITH source_spans AS (
  SELECT
    timestamp AS span_ts,
    COALESCE(
      (
        SELECT NULLIF(TRIM(input.value), '')
        FROM UNNEST(jsonPayload.action.agentmetadata.inputs) AS input
        WHERE input.name = 'skill_name'
        LIMIT 1
      ),
      (
        SELECT NULLIF(TRIM(input.value), '')
        FROM UNNEST(jsonPayload.action.spaninfo.inputs) AS input
        WHERE input.name = 'skill_name'
        LIMIT 1
      )
    ) AS legacy_skill_name,
    NULLIF(TRIM(jsonPayload.action.skill_reader_attributes.skill_name), '') AS shell_skill_name,
    NULLIF(TRIM(jsonPayload.action.workflow_id), '') AS workflow_run_id,
    NULLIF(TRIM(jsonPayload.action.action_run_id), '') AS action_run_id,
    COALESCE(
      NULLIF(TRIM(jsonPayload.action.agentmetadata.sessioninfo.sessiontrackingtoken), ''),
      NULLIF(TRIM(jsonPayload.action.spaninfo.sessioninfo.sessiontrackingtoken), '')
    ) AS session_token
  FROM `PROJECT.DATASET.scrubbed_agentspan_*`
  WHERE timestamp >= window_start
    AND timestamp < window_end
    AND _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', DATE(window_start))
      AND FORMAT_DATE('%Y%m%d', DATE_SUB(DATE(window_end), INTERVAL 1 DAY))
),

skill_reads AS (
  SELECT
    span_ts,
    workflow_run_id,
    action_run_id,
    session_token,
    legacy_skill_name,
    shell_skill_name,
    COALESCE(shell_skill_name, legacy_skill_name) AS observed_skill_name,
    CASE
      WHEN shell_skill_name IS NOT NULL AND legacy_skill_name IS NOT NULL THEN 'both_paths'
      WHEN shell_skill_name IS NOT NULL THEN 'shell_skill_reader_attributes'
      WHEN legacy_skill_name IS NOT NULL THEN 'legacy_action_input'
      ELSE 'no_skill_name'
    END AS read_mechanism
  FROM source_spans
  WHERE legacy_skill_name IS NOT NULL
     OR shell_skill_name IS NOT NULL
),

classified_reads AS (
  SELECT
    *,
    CASE
      WHEN observed_skill_name IS NULL THEN 'missing'
      WHEN LOWER(observed_skill_name) = 'unspecified' THEN 'unspecified'
      ELSE 'specified'
    END AS skill_name_status,
    CASE
      WHEN workflow_run_id IS NOT NULL
        OR action_run_id IS NOT NULL
        OR session_token IS NOT NULL THEN 'has_parent_join_key'
      ELSE 'missing_parent_join_key'
    END AS parent_join_status
  FROM skill_reads
),

aggregate_by_path AS (
  SELECT
    read_mechanism,
    skill_name_status,
    parent_join_status,
    COUNT(*) AS skill_read_rows,
    COUNT(DISTINCT IF(skill_name_status = 'specified', observed_skill_name, NULL)) AS distinct_specified_skill_names,
    COUNTIF(workflow_run_id IS NOT NULL) AS rows_with_workflow_run_id,
    COUNTIF(action_run_id IS NOT NULL) AS rows_with_action_run_id,
    COUNTIF(session_token IS NOT NULL) AS rows_with_session_token,
    COUNT(DISTINCT workflow_run_id) AS distinct_workflow_runs,
    COUNT(DISTINCT action_run_id) AS distinct_action_runs,
    COUNT(DISTINCT session_token) AS distinct_sessions
  FROM classified_reads
  GROUP BY
    read_mechanism,
    skill_name_status,
    parent_join_status
),

overall AS (
  SELECT
    COUNT(*) AS total_skill_read_rows,
    COUNTIF(skill_name_status = 'unspecified') AS unspecified_skill_read_rows,
    COUNTIF(skill_name_status = 'specified') AS specified_skill_read_rows,
    COUNTIF(parent_join_status = 'has_parent_join_key') AS rows_with_parent_join_key
  FROM classified_reads
)

SELECT
  DATE(window_start) AS window_start,
  DATE(window_end) AS window_end,
  aggregate_by_path.read_mechanism,
  aggregate_by_path.skill_name_status,
  aggregate_by_path.parent_join_status,
  aggregate_by_path.skill_read_rows,
  aggregate_by_path.distinct_specified_skill_names,
  aggregate_by_path.rows_with_workflow_run_id,
  aggregate_by_path.rows_with_action_run_id,
  aggregate_by_path.rows_with_session_token,
  aggregate_by_path.distinct_workflow_runs,
  aggregate_by_path.distinct_action_runs,
  aggregate_by_path.distinct_sessions,
  SAFE_DIVIDE(aggregate_by_path.skill_read_rows, overall.total_skill_read_rows) AS skill_read_share,
  SAFE_DIVIDE(overall.unspecified_skill_read_rows, overall.total_skill_read_rows) AS overall_unspecified_share,
  SAFE_DIVIDE(overall.rows_with_parent_join_key, overall.total_skill_read_rows) AS overall_parent_join_key_share,
  CASE
    WHEN overall.total_skill_read_rows = 0 THEN 'NO_SKILL_READ_VOLUME'
    WHEN SAFE_DIVIDE(overall.unspecified_skill_read_rows, overall.total_skill_read_rows) > 0.5
      THEN 'HOLD_HIGH_UNSPECIFIED_SHARE'
    WHEN SAFE_DIVIDE(overall.rows_with_parent_join_key, overall.total_skill_read_rows) < 0.5
      THEN 'HOLD_LOW_PARENT_JOIN_COVERAGE'
    ELSE 'SKILL_READ_EVIDENCE_AVAILABLE'
  END AS availability_status
FROM aggregate_by_path
CROSS JOIN overall
ORDER BY
  aggregate_by_path.read_mechanism,
  aggregate_by_path.skill_name_status,
  aggregate_by_path.parent_join_status;
