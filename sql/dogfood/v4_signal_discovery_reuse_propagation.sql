-- V4 signal discovery probe: reusable workflow propagation.
--
-- Research-only. This query tests whether named, non-unlisted, reusable
-- workflows spread across adopters. It does not implement a concept, schema,
-- endpoint, or product behavior.
--
-- Replace `PROJECT.DATASET.gce_events` with the approved GCE export table.
--
-- Stability testing: run unchanged logic across multiple fixed windows by
-- editing window_start and window_end. Compare adopter buckets and percentile
-- shape across windows before making any promotion decision.

DECLARE window_start TIMESTAMP DEFAULT TIMESTAMP('2026-03-23T00:00:00Z');
DECLARE window_end TIMESTAMP DEFAULT TIMESTAMP('2026-05-22T00:00:00Z');

WITH source_events AS (
  SELECT
    timestamp AS event_ts,
    jsonPayload.type AS event_type,
    NULLIF(TRIM(jsonPayload.workflowrun.feature), '') AS workflow_feature,
    NULLIF(TRIM(jsonPayload.workflowrun.rootworkflowid), '') AS root_workflow_id,
    NULLIF(TRIM(jsonPayload.workflowrun.runid), '') AS workflow_run_id,
    COALESCE(
      NULLIF(TRIM(jsonPayload.user.userid), ''),
      NULLIF(TRIM(jsonPayload.productsnapshot.user.id), ''),
      NULLIF(TRIM(jsonPayload.productsnapshot.user.canonicalid), '')
    ) AS user_key
  FROM `PROJECT.DATASET.gce_events`
  WHERE timestamp >= window_start
    AND timestamp < window_end
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

product_snapshots AS (
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

workflow_runs AS (
  SELECT
    event.user_key,
    COALESCE(event.root_workflow_id, event.workflow_run_id) AS workflow_key,
    COALESCE(event.workflow_run_id, CONCAT(event.user_key, ':', CAST(event.event_ts AS STRING))) AS run_key,
    CASE
      WHEN UPPER(event.workflow_feature) = 'AGENT'
        AND snapshot.snapshot.is_autonomous IS FALSE
        AND snapshot.snapshot.workflow_name IS NOT NULL
        AND snapshot.snapshot.unlisted IS FALSE THEN 'named_reusable_workflow'
      WHEN UPPER(event.workflow_feature) = 'AGENT'
        AND snapshot.snapshot.unlisted IS TRUE THEN 'ephemeral_or_unlisted_workflow'
      WHEN UPPER(event.workflow_feature) = 'AGENT' THEN 'unclassified_agent_workflow'
      ELSE 'non_agent_workflow'
    END AS workflow_classification,
    snapshot.snapshot.workflow_name AS workflow_name,
    COALESCE(snapshot.snapshot.isdraftonly, TRUE) AS isdraftonly
  FROM source_events AS event
  LEFT JOIN product_snapshots AS snapshot
    ON snapshot.snapshot_workflow_id = event.root_workflow_id
  WHERE event.event_type = 'WORKFLOW_RUN'
    AND event.user_key IS NOT NULL
    AND event.root_workflow_id IS NOT NULL
),

named_reusable_workflows AS (
  SELECT
    workflow_key,
    COUNT(DISTINCT user_key) AS adopter_count,
    COUNT(DISTINCT run_key) AS run_count
  FROM workflow_runs
  WHERE workflow_classification = 'named_reusable_workflow'
    AND workflow_name IS NOT NULL
    AND isdraftonly IS FALSE
  GROUP BY workflow_key
),

excluded_or_separate_workflows AS (
  SELECT
    workflow_classification,
    COUNT(DISTINCT workflow_key) AS workflow_count,
    COUNT(DISTINCT user_key) AS adopter_count,
    COUNT(DISTINCT run_key) AS run_count
  FROM workflow_runs
  WHERE workflow_classification != 'named_reusable_workflow'
     OR workflow_name IS NULL
     OR isdraftonly IS TRUE
  GROUP BY workflow_classification
),

adopter_bucketed AS (
  SELECT
    workflow_key,
    adopter_count,
    run_count,
    CASE
      WHEN adopter_count = 1 THEN 'solo'
      WHEN adopter_count BETWEEN 2 AND 5 THEN 'small_reuse'
      WHEN adopter_count BETWEEN 6 AND 20 THEN 'team_scale_reuse'
      WHEN adopter_count >= 21 THEN 'org_scale_reuse'
    END AS adopter_bucket
  FROM named_reusable_workflows
),

overall_metrics AS (
  SELECT
    COUNT(*) AS reusable_workflow_count,
    SUM(run_count) AS reusable_run_count,
    APPROX_QUANTILES(adopter_count, 100)[OFFSET(50)] AS adopter_count_p50,
    APPROX_QUANTILES(adopter_count, 100)[OFFSET(90)] AS adopter_count_p90,
    APPROX_QUANTILES(adopter_count, 100)[OFFSET(99)] AS adopter_count_p99
  FROM adopter_bucketed
),

bucket_metrics AS (
  SELECT
    adopter_bucket,
    COUNT(*) AS workflow_count,
    SUM(run_count) AS run_count,
    SUM(adopter_count) AS summed_workflow_adopters,
    APPROX_QUANTILES(adopter_count, 100)[OFFSET(50)] AS bucket_adopter_count_p50,
    APPROX_QUANTILES(adopter_count, 100)[OFFSET(90)] AS bucket_adopter_count_p90,
    APPROX_QUANTILES(adopter_count, 100)[OFFSET(99)] AS bucket_adopter_count_p99
  FROM adopter_bucketed
  GROUP BY adopter_bucket
)

SELECT
  'named_reusable_workflows' AS population,
  bucket.adopter_bucket,
  bucket.workflow_count,
  bucket.run_count,
  bucket.summed_workflow_adopters,
  SAFE_DIVIDE(bucket.workflow_count, overall.reusable_workflow_count) AS workflow_share,
  SAFE_DIVIDE(bucket.run_count, overall.reusable_run_count) AS run_share,
  overall.adopter_count_p50,
  overall.adopter_count_p90,
  overall.adopter_count_p99,
  bucket.bucket_adopter_count_p50,
  bucket.bucket_adopter_count_p90,
  bucket.bucket_adopter_count_p99
FROM bucket_metrics AS bucket
CROSS JOIN overall_metrics AS overall

UNION ALL

SELECT
  'excluded_or_separate_workflows' AS population,
  workflow_classification AS adopter_bucket,
  workflow_count,
  run_count,
  adopter_count AS summed_workflow_adopters,
  NULL AS workflow_share,
  NULL AS run_share,
  NULL AS adopter_count_p50,
  NULL AS adopter_count_p90,
  NULL AS adopter_count_p99,
  NULL AS bucket_adopter_count_p50,
  NULL AS bucket_adopter_count_p90,
  NULL AS bucket_adopter_count_p99
FROM excluded_or_separate_workflows
ORDER BY population, adopter_bucket;
