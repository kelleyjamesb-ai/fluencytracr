-- AGENT metadata field discovery diagnostic.
--
-- Dogfood/research-only. This query inspects matched AGENT workflow snapshots
-- to discover which native scio-prod STRUCT fields can support reusable or
-- named AGENT workflow classification. Final output is aggregate-only.
--
-- Replace `PROJECT.DATASET.gce_events` with the approved GCE export table.

DECLARE window_start TIMESTAMP DEFAULT TIMESTAMP('2026-03-23T00:00:00Z');
DECLARE window_end TIMESTAMP DEFAULT TIMESTAMP('2026-05-22T00:00:00Z');

WITH agent_workflow_runs AS (
  SELECT
    timestamp AS event_ts,
    NULLIF(TRIM(jsonPayload.workflowrun.rootworkflowid), '') AS root_workflow_id,
    NULLIF(TRIM(jsonPayload.workflowrun.runid), '') AS workflow_run_id,
    ARRAY_LENGTH(jsonPayload.workflowrun.workflowexecutions) > 0 AS has_workflowexecutions
  FROM `PROJECT.DATASET.gce_events`
  WHERE timestamp >= window_start
    AND timestamp < window_end
    AND jsonPayload.type = 'WORKFLOW_RUN'
    AND UPPER(NULLIF(TRIM(jsonPayload.workflowrun.feature), '')) = 'AGENT'
    AND jsonPayload.user.userid IS NOT NULL
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

matched_agent_snapshots AS (
  SELECT
    run.root_workflow_id,
    run.workflow_run_id,
    run.has_workflowexecutions,
    snapshot.snapshot.workflow_name,
    snapshot.snapshot.is_autonomous,
    snapshot.snapshot.unlisted,
    snapshot.snapshot.isdraftonly
  FROM agent_workflow_runs AS run
  JOIN latest_product_snapshots AS snapshot
    ON snapshot.snapshot_workflow_id = run.root_workflow_id
  WHERE run.root_workflow_id IS NOT NULL
),

aggregate_base AS (
  SELECT
    COUNT(*) AS agent_run_rows,
    COUNTIF(is_autonomous IS TRUE) AS autonomous_true_rows,
    COUNTIF(is_autonomous IS FALSE) AS autonomous_false_rows,
    COUNTIF(unlisted IS FALSE) AS unlisted_false_rows,
    COUNTIF(isdraftonly IS FALSE) AS isdraftonly_false_rows
  FROM matched_agent_snapshots
),

field_presence AS (
  SELECT
    'productsnapshot.workflow.name' AS metadata_field,
    COUNTIF(workflow_name IS NOT NULL) AS populated_rows,
    SAFE_DIVIDE(COUNTIF(workflow_name IS NOT NULL), COUNT(*)) AS populated_rate,
    COUNT(DISTINCT IF(workflow_name IS NOT NULL, TO_HEX(SHA256(workflow_name)), NULL)) AS distinct_value_count,
    'Name presence only; raw values are intentionally not emitted.' AS notes
  FROM matched_agent_snapshots

  UNION ALL

  SELECT
    'productsnapshot.workflow.isautonomousagent' AS metadata_field,
    COUNTIF(is_autonomous IS NOT NULL) AS populated_rows,
    SAFE_DIVIDE(COUNTIF(is_autonomous IS NOT NULL), COUNT(*)) AS populated_rate,
    COUNT(DISTINCT IF(is_autonomous IS NOT NULL, CAST(is_autonomous AS STRING), NULL)) AS distinct_value_count,
    'Known AGENT sub-surface discriminator for autonomous vs non-autonomous.' AS notes
  FROM matched_agent_snapshots

  UNION ALL

  SELECT
    'productsnapshot.workflow.unlisted' AS metadata_field,
    COUNTIF(unlisted IS NOT NULL) AS populated_rows,
    SAFE_DIVIDE(COUNTIF(unlisted IS NOT NULL), COUNT(*)) AS populated_rate,
    COUNT(DISTINCT IF(unlisted IS NOT NULL, CAST(unlisted AS STRING), NULL)) AS distinct_value_count,
    'Can separate listed from unlisted workflows when paired with non-autonomous status.' AS notes
  FROM matched_agent_snapshots

  UNION ALL

  SELECT
    'productsnapshot.workflow.isdraftonly' AS metadata_field,
    COUNTIF(isdraftonly IS NOT NULL) AS populated_rows,
    SAFE_DIVIDE(COUNTIF(isdraftonly IS NOT NULL), COUNT(*)) AS populated_rate,
    COUNT(DISTINCT IF(isdraftonly IS NOT NULL, CAST(isdraftonly AS STRING), NULL)) AS distinct_value_count,
    'Draft-state proxy; useful only as corroboration, not a reusable-workflow proof by itself.' AS notes
  FROM matched_agent_snapshots

  UNION ALL

  SELECT
    'workflowrun.workflowexecutions' AS metadata_field,
    COUNTIF(has_workflowexecutions IS TRUE) AS populated_rows,
    SAFE_DIVIDE(COUNTIF(has_workflowexecutions IS TRUE), COUNT(*)) AS populated_rate,
    COUNT(DISTINCT IF(has_workflowexecutions IS NOT NULL, CAST(has_workflowexecutions AS STRING), NULL)) AS distinct_value_count,
    'Array presence only; execution values are not emitted.' AS notes
  FROM matched_agent_snapshots
),

candidate_classifiers AS (
  SELECT
    'non_autonomous_not_unlisted' AS candidate_classifier,
    COUNTIF(is_autonomous IS FALSE AND unlisted IS FALSE) AS candidate_rows,
    SAFE_DIVIDE(COUNTIF(is_autonomous IS FALSE AND unlisted IS FALSE), COUNT(*)) AS candidate_rate,
    'Potential named-workflow proxy, but requires a reliable name or equivalent metadata field.' AS explanation
  FROM matched_agent_snapshots

  UNION ALL

  SELECT
    'non_autonomous_not_draft' AS candidate_classifier,
    COUNTIF(is_autonomous IS FALSE AND isdraftonly IS FALSE) AS candidate_rows,
    SAFE_DIVIDE(COUNTIF(is_autonomous IS FALSE AND isdraftonly IS FALSE), COUNT(*)) AS candidate_rate,
    'Potential reusable-workflow proxy; insufficient without a name or other stable reusable identifier.' AS explanation
  FROM matched_agent_snapshots

  UNION ALL

  SELECT
    'has_workflow_name' AS candidate_classifier,
    COUNTIF(workflow_name IS NOT NULL) AS candidate_rows,
    SAFE_DIVIDE(COUNTIF(workflow_name IS NOT NULL), COUNT(*)) AS candidate_rate,
    'Direct named-workflow evidence when populated.' AS explanation
  FROM matched_agent_snapshots

  UNION ALL

  SELECT
    'has_workflowexecutions' AS candidate_classifier,
    COUNTIF(has_workflowexecutions IS TRUE) AS candidate_rows,
    SAFE_DIVIDE(COUNTIF(has_workflowexecutions IS TRUE), COUNT(*)) AS candidate_rate,
    'Execution array presence may support future diagnostics but does not identify reusable workflows.' AS explanation
  FROM matched_agent_snapshots
)

SELECT
  field.metadata_field,
  field.populated_rows,
  field.populated_rate,
  field.distinct_value_count,
  base.agent_run_rows,
  base.autonomous_true_rows,
  base.autonomous_false_rows,
  base.unlisted_false_rows,
  base.isdraftonly_false_rows,
  field.notes,
  CAST(NULL AS STRING) AS candidate_classifier,
  CAST(NULL AS INT64) AS candidate_rows,
  CAST(NULL AS FLOAT64) AS candidate_rate,
  CAST(NULL AS STRING) AS explanation
FROM field_presence AS field
CROSS JOIN aggregate_base AS base

UNION ALL

SELECT
  CAST(NULL AS STRING) AS metadata_field,
  CAST(NULL AS INT64) AS populated_rows,
  CAST(NULL AS FLOAT64) AS populated_rate,
  CAST(NULL AS INT64) AS distinct_value_count,
  base.agent_run_rows,
  base.autonomous_true_rows,
  base.autonomous_false_rows,
  base.unlisted_false_rows,
  base.isdraftonly_false_rows,
  CAST(NULL AS STRING) AS notes,
  classifier.candidate_classifier,
  classifier.candidate_rows,
  classifier.candidate_rate,
  classifier.explanation
FROM candidate_classifiers AS classifier
CROSS JOIN aggregate_base AS base
ORDER BY metadata_field, candidate_classifier;
