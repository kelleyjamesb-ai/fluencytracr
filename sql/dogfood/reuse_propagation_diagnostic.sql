-- Reusable workflow propagation diagnostic for FluencyTracr dogfood.
--
-- Research-only. This query tests whether named workflow candidates and
-- confirmed reusable candidates spread across adopters without productizing a
-- V4 signal. It emits aggregate rows only; person-level rows remain inside
-- BigQuery.
--
-- Replace `PROJECT.DATASET.gce_events` with the approved GCE export table.
--
-- Stability testing: run unchanged logic across multiple fixed windows by
-- editing window_start and window_end. Do not promote a signal from one
-- distribution shape alone.

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
    COALESCE(jsonPayload.productsnapshot.workflow.published, FALSE) AS snapshot_published,
    COALESCE(jsonPayload.productsnapshot.workflow.ispublished, FALSE) AS snapshot_ispublished,
    COALESCE(jsonPayload.productsnapshot.workflow.reusable, FALSE) AS snapshot_reusable
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
        snapshot_published AS published,
        snapshot_ispublished AS ispublished,
        snapshot_reusable AS reusable
      )
      ORDER BY snapshot_ts DESC
      LIMIT 1
    )[OFFSET(0)] AS snapshot
  FROM product_snapshot_events
  WHERE snapshot_workflow_id IS NOT NULL
  GROUP BY snapshot_workflow_id
),

agent_workflow_runs AS (
  SELECT
    event.user_key,
    COALESCE(event.root_workflow_id, event.workflow_run_id) AS workflow_key,
    COALESCE(
      event.workflow_run_id,
      event.root_workflow_id,
      CONCAT(event.user_key, ':', CAST(event.event_ts AS STRING))
    ) AS run_key,
    snapshot.snapshot_workflow_id IS NOT NULL AS has_snapshot_match,
    snapshot.snapshot.workflow_name AS workflow_name,
    snapshot.snapshot.is_autonomous AS is_autonomous,
    COALESCE(snapshot.snapshot.unlisted, FALSE) AS unlisted,
    COALESCE(snapshot.snapshot.published, FALSE) AS published,
    COALESCE(snapshot.snapshot.ispublished, FALSE) AS ispublished,
    COALESCE(snapshot.snapshot.reusable, FALSE) AS reusable,
    (
      snapshot.snapshot_workflow_id IS NOT NULL
      AND snapshot.snapshot.is_autonomous IS FALSE
      AND snapshot.snapshot.workflow_name IS NOT NULL
      AND COALESCE(snapshot.snapshot.unlisted, FALSE) IS FALSE
    ) AS is_named_workflow_candidate,
    (
      snapshot.snapshot_workflow_id IS NOT NULL
      AND snapshot.snapshot.is_autonomous IS FALSE
      AND snapshot.snapshot.workflow_name IS NOT NULL
      AND COALESCE(snapshot.snapshot.unlisted, FALSE) IS FALSE
      AND (
        COALESCE(snapshot.snapshot.published, FALSE) IS TRUE
        OR COALESCE(snapshot.snapshot.ispublished, FALSE) IS TRUE
        OR COALESCE(snapshot.snapshot.reusable, FALSE) IS TRUE
      )
    ) AS is_confirmed_reusable_candidate
  FROM source_events AS event
  LEFT JOIN product_snapshots AS snapshot
    ON snapshot.snapshot_workflow_id = event.root_workflow_id
  WHERE event.event_type = 'WORKFLOW_RUN'
    AND UPPER(event.workflow_feature) = 'AGENT'
    AND event.user_key IS NOT NULL
),

snapshot_join_coverage AS (
  SELECT
    COUNT(*) AS total_agent_workflow_run_count,
    COUNT(DISTINCT workflow_key) AS total_agent_workflow_count,
    COUNTIF(has_snapshot_match) AS snapshot_matched_run_count,
    SAFE_DIVIDE(COUNTIF(has_snapshot_match), COUNT(*)) AS snapshot_match_rate,
    COUNT(DISTINCT IF(is_named_workflow_candidate, workflow_key, NULL)) AS named_candidate_count,
    COUNT(DISTINCT IF(is_confirmed_reusable_candidate, workflow_key, NULL)) AS confirmed_reusable_candidate_count,
    COUNT(DISTINCT IF(NOT has_snapshot_match, workflow_key, NULL)) AS unmatched_agent_workflow_count
  FROM agent_workflow_runs
),

classified_agent_runs AS (
  SELECT
    user_key,
    workflow_key,
    run_key,
    CASE
      WHEN NOT has_snapshot_match THEN 'unmatched_agent_workflow'
      WHEN is_autonomous IS TRUE THEN 'autonomous_agent'
      WHEN is_named_workflow_candidate THEN 'named_workflow_candidate'
      WHEN is_autonomous IS FALSE AND (workflow_name IS NULL OR unlisted IS TRUE) THEN 'ephemeral_or_unlisted_agent'
      ELSE 'unclassified_agent_workflow'
    END AS population
  FROM agent_workflow_runs
),

named_workflow_candidate AS (
  SELECT
    'named_workflow_candidate' AS population,
    workflow_key,
    COUNT(DISTINCT user_key) AS adopter_count,
    COUNT(DISTINCT run_key) AS run_count
  FROM agent_workflow_runs
  WHERE is_named_workflow_candidate
  GROUP BY workflow_key
),

confirmed_reusable_candidate AS (
  SELECT
    'confirmed_reusable_candidate' AS population,
    workflow_key,
    COUNT(DISTINCT user_key) AS adopter_count,
    COUNT(DISTINCT run_key) AS run_count
  FROM agent_workflow_runs
  WHERE is_confirmed_reusable_candidate
  GROUP BY workflow_key
),

candidate_workflows AS (
  SELECT * FROM named_workflow_candidate
  UNION ALL
  SELECT * FROM confirmed_reusable_candidate
),

candidate_bucketed AS (
  SELECT
    population,
    workflow_key,
    adopter_count,
    run_count,
    CASE
      WHEN adopter_count = 1 THEN 'solo'
      WHEN adopter_count BETWEEN 2 AND 5 THEN 'small_reuse'
      WHEN adopter_count BETWEEN 6 AND 20 THEN 'team_scale_reuse'
      WHEN adopter_count >= 21 THEN 'org_scale_reuse'
    END AS adopter_bucket
  FROM candidate_workflows
),

candidate_overall AS (
  SELECT
    population,
    COUNT(*) AS candidate_workflow_count,
    SUM(run_count) AS candidate_run_count,
    APPROX_QUANTILES(adopter_count, 100)[OFFSET(50)] AS adopter_count_p50,
    APPROX_QUANTILES(adopter_count, 100)[OFFSET(90)] AS adopter_count_p90,
    APPROX_QUANTILES(adopter_count, 100)[OFFSET(99)] AS adopter_count_p99
  FROM candidate_bucketed
  GROUP BY population
),

candidate_bucket_metrics AS (
  SELECT
    population,
    adopter_bucket,
    COUNT(*) AS workflow_count,
    SUM(run_count) AS run_count,
    SUM(adopter_count) AS summed_workflow_adopters,
    APPROX_QUANTILES(adopter_count, 100)[OFFSET(50)] AS bucket_adopter_count_p50,
    APPROX_QUANTILES(adopter_count, 100)[OFFSET(90)] AS bucket_adopter_count_p90,
    APPROX_QUANTILES(adopter_count, 100)[OFFSET(99)] AS bucket_adopter_count_p99
  FROM candidate_bucketed
  GROUP BY population, adopter_bucket
),

separate_population_metrics AS (
  SELECT
    population,
    COUNT(DISTINCT workflow_key) AS workflow_count,
    COUNT(DISTINCT run_key) AS run_count,
    COUNT(DISTINCT user_key) AS summed_workflow_adopters
  FROM classified_agent_runs
  WHERE population IN (
    'autonomous_agent',
    'ephemeral_or_unlisted_agent',
    'unclassified_agent_workflow',
    'unmatched_agent_workflow'
  )
  GROUP BY population
)

SELECT
  bucket.population,
  bucket.adopter_bucket,
  bucket.workflow_count,
  bucket.run_count,
  bucket.summed_workflow_adopters,
  SAFE_DIVIDE(bucket.workflow_count, coverage.total_agent_workflow_count) AS workflow_share,
  SAFE_DIVIDE(bucket.run_count, coverage.total_agent_workflow_run_count) AS run_share,
  overall.adopter_count_p50,
  overall.adopter_count_p90,
  overall.adopter_count_p99,
  bucket.bucket_adopter_count_p50,
  bucket.bucket_adopter_count_p90,
  bucket.bucket_adopter_count_p99,
  coverage.snapshot_match_rate,
  coverage.named_candidate_count,
  coverage.confirmed_reusable_candidate_count,
  coverage.unmatched_agent_workflow_count
FROM candidate_bucket_metrics AS bucket
JOIN candidate_overall AS overall USING (population)
CROSS JOIN snapshot_join_coverage AS coverage

UNION ALL

SELECT
  population,
  population AS adopter_bucket,
  workflow_count,
  run_count,
  summed_workflow_adopters,
  SAFE_DIVIDE(workflow_count, coverage.total_agent_workflow_count) AS workflow_share,
  SAFE_DIVIDE(run_count, coverage.total_agent_workflow_run_count) AS run_share,
  NULL AS adopter_count_p50,
  NULL AS adopter_count_p90,
  NULL AS adopter_count_p99,
  NULL AS bucket_adopter_count_p50,
  NULL AS bucket_adopter_count_p90,
  NULL AS bucket_adopter_count_p99,
  coverage.snapshot_match_rate,
  coverage.named_candidate_count,
  coverage.confirmed_reusable_candidate_count,
  coverage.unmatched_agent_workflow_count
FROM separate_population_metrics
CROSS JOIN snapshot_join_coverage AS coverage
ORDER BY population, adopter_bucket;
