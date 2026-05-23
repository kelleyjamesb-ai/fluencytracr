-- AGENT snapshot join-key diagnostic for FluencyTracr dogfood.
--
-- Research-only. This query compares candidate aggregate join keys between
-- AGENT WORKFLOW_RUN records and PRODUCT_SNAPSHOT workflow metadata. It does
-- not implement a concept, schema, endpoint, migration, or product behavior.
--
-- Replace `PROJECT.DATASET.gce_events` with the approved GCE export table.
-- Final output is aggregate-only: no user IDs, names, prompts, outputs,
-- transcripts, or raw event rows are emitted.

DECLARE window_start TIMESTAMP DEFAULT TIMESTAMP('2026-03-23T00:00:00Z');
DECLARE window_end TIMESTAMP DEFAULT TIMESTAMP('2026-05-22T00:00:00Z');

WITH agent_workflow_runs AS (
  SELECT
    timestamp AS event_ts,
    NULLIF(TRIM(jsonPayload.workflowrun.rootworkflowid), '') AS root_workflow_id,
    NULLIF(TRIM(jsonPayload.workflowrun.runid), '') AS workflow_run_id,
    COALESCE(
      NULLIF(TRIM(jsonPayload.workflowrun.sessiontrackingtoken), ''),
      NULLIF(TRIM(jsonPayload.chat.sessiontrackingtoken), ''),
      NULLIF(TRIM(jsonPayload.gleanbotactivity.eventtrackingtoken), '')
    ) AS session_token,
    EXISTS (
      SELECT 1
      FROM UNNEST(jsonPayload.workflowrun.workflowexecutions) AS execution
      WHERE execution.status IS NOT NULL
         OR execution.errortype IS NOT NULL
    ) AS has_workflowexecution_rows
  FROM `PROJECT.DATASET.gce_events`
  WHERE timestamp >= window_start
    AND timestamp < window_end
    AND jsonPayload.type = 'WORKFLOW_RUN'
    AND UPPER(NULLIF(TRIM(jsonPayload.workflowrun.feature), '')) = 'AGENT'
),

product_snapshot_events AS (
  SELECT
    timestamp AS snapshot_ts,
    NULLIF(TRIM(jsonPayload.productsnapshot.workflow.workflowid), '') AS snapshot_workflow_id,
    NULLIF(TRIM(jsonPayload.productsnapshot.workflow.name), '') AS snapshot_workflow_name,
    jsonPayload.productsnapshot.workflow.isautonomousagent AS snapshot_is_autonomous,
    COALESCE(jsonPayload.productsnapshot.workflow.unlisted, FALSE) AS snapshot_unlisted,
    COALESCE(jsonPayload.productsnapshot.workflow.isdraftonly, TRUE) AS snapshot_isdraftonly
  FROM `PROJECT.DATASET.gce_events`
  WHERE timestamp < window_end
    AND jsonPayload.type = 'PRODUCT_SNAPSHOT'
),

latest_product_snapshots AS (
  SELECT
    snapshot_workflow_id,
    ARRAY_AGG(
      STRUCT(
        snapshot_workflow_name AS workflow_name,
        snapshot_is_autonomous AS is_autonomous,
        snapshot_unlisted AS unlisted,
        snapshot_isdraftonly AS isdraftonly
      )
      ORDER BY snapshot_ts DESC
      LIMIT 1
    )[OFFSET(0)] AS snapshot
  FROM product_snapshot_events
  WHERE snapshot_workflow_id IS NOT NULL
  GROUP BY snapshot_workflow_id
),

candidate_join_keys AS (
  SELECT
    'rootworkflowid' AS candidate_join_key_name,
    root_workflow_id AS candidate_join_key,
    root_workflow_id IS NOT NULL AS candidate_key_present,
    root_workflow_id,
    workflow_run_id,
    session_token,
    has_workflowexecution_rows,
    'Current production-style join path; known insufficient for named workflow metadata in the latest diagnostic.' AS notes
  FROM agent_workflow_runs

  UNION ALL

  SELECT
    'runid' AS candidate_join_key_name,
    workflow_run_id AS candidate_join_key,
    workflow_run_id IS NOT NULL AS candidate_key_present,
    root_workflow_id,
    workflow_run_id,
    session_token,
    has_workflowexecution_rows,
    'Tests whether WORKFLOW_RUN runid can match PRODUCT_SNAPSHOT workflowid.' AS notes
  FROM agent_workflow_runs

  UNION ALL

  SELECT
    'sessiontrackingtoken' AS candidate_join_key_name,
    session_token AS candidate_join_key,
    session_token IS NOT NULL AS candidate_key_present,
    root_workflow_id,
    workflow_run_id,
    session_token,
    has_workflowexecution_rows,
    'Session token is already used safely for surface attribution; this row tests whether it is useful for snapshot metadata joins.' AS notes
  FROM agent_workflow_runs

  UNION ALL

  SELECT
    'workflowexecutions.status_only_no_join_key' AS candidate_join_key_name,
    CAST(NULL AS STRING) AS candidate_join_key,
    has_workflowexecution_rows AS candidate_key_present,
    root_workflow_id,
    workflow_run_id,
    session_token,
    has_workflowexecution_rows,
    'Existing working diagnostics only use workflowexecutions.status and errortype; no valid execution-level workflow id path is referenced here.' AS notes
  FROM agent_workflow_runs
),

candidate_matches AS (
  SELECT
    candidate.candidate_join_key_name,
    candidate.root_workflow_id,
    candidate.workflow_run_id,
    candidate.candidate_key_present,
    candidate.notes,
    snapshot.snapshot_workflow_id,
    snapshot.snapshot.workflow_name,
    snapshot.snapshot.is_autonomous,
    COALESCE(snapshot.snapshot.unlisted, FALSE) AS unlisted,
    COALESCE(snapshot.snapshot.isdraftonly, TRUE) AS isdraftonly
  FROM candidate_join_keys AS candidate
  LEFT JOIN latest_product_snapshots AS snapshot
    ON candidate.candidate_join_key IS NOT NULL
    AND snapshot.snapshot_workflow_id = candidate.candidate_join_key
),

aggregate_metrics AS (
  SELECT
    candidate_join_key_name,
    COUNT(*) AS agent_run_rows,
    COUNT(DISTINCT root_workflow_id) AS distinct_agent_workflows,
    COUNTIF(candidate_key_present) AS candidate_key_present_rows,
    COUNTIF(snapshot_workflow_id IS NOT NULL) AS product_snapshot_match_rows,
    SAFE_DIVIDE(COUNTIF(snapshot_workflow_id IS NOT NULL), COUNTIF(candidate_key_present)) AS product_snapshot_match_rate,
    COUNTIF(snapshot_workflow_id IS NOT NULL AND workflow_name IS NOT NULL) AS matched_rows_with_workflow_name,
    COUNTIF(snapshot_workflow_id IS NOT NULL AND unlisted IS FALSE) AS matched_rows_unlisted_false,
    COUNTIF(snapshot_workflow_id IS NOT NULL AND isdraftonly IS FALSE) AS matched_rows_isdraftonly_false,
    COUNTIF(snapshot_workflow_id IS NOT NULL AND is_autonomous IS TRUE) AS matched_rows_autonomous_true,
    COUNTIF(snapshot_workflow_id IS NOT NULL AND is_autonomous IS FALSE) AS matched_rows_autonomous_false,
    COUNTIF(
      snapshot_workflow_id IS NOT NULL
      AND workflow_name IS NOT NULL
      AND is_autonomous IS FALSE
      AND unlisted IS FALSE
    ) AS named_candidate_rows,
    COUNTIF(
      snapshot_workflow_id IS NOT NULL
      AND workflow_name IS NOT NULL
      AND is_autonomous IS FALSE
      AND unlisted IS FALSE
      AND isdraftonly IS FALSE
    ) AS named_not_draft_candidate_rows,
    ANY_VALUE(notes) AS notes
  FROM candidate_matches
  GROUP BY candidate_join_key_name
)

SELECT
  candidate_join_key_name,
  agent_run_rows,
  distinct_agent_workflows,
  candidate_key_present_rows,
  product_snapshot_match_rows,
  product_snapshot_match_rate,
  matched_rows_with_workflow_name,
  matched_rows_unlisted_false,
  matched_rows_isdraftonly_false,
  matched_rows_autonomous_true,
  matched_rows_autonomous_false,
  named_candidate_rows,
  named_not_draft_candidate_rows,
  notes
FROM aggregate_metrics
ORDER BY candidate_join_key_name;
