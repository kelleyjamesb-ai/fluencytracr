import { store, FluencyMetaRecord, FluencyDimensionRecord, FluencySnapshotRecord, MetricRecord } from "./store";
import { upsertMetric } from "./store";

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const normalizeSessions = (value: number) => clamp((value / 10) * 100);

const computeHabitualShare = (metrics: MetricRecord[], bucketStart: string) => {
  const bands = [
    "usage_frequency_band_rare_count",
    "usage_frequency_band_occasional_count",
    "usage_frequency_band_regular_count",
    "usage_frequency_band_habitual_count"
  ];
  const values = bands.map((name) => {
    const match = metrics.find(
      (metric) => metric.bucket_start === bucketStart && metric.metric_name === name
    );
    return match?.suppressed || match?.metric_value === null ? null : match?.metric_value ?? null;
  });
  if (values.every((value) => value === null)) {
    return { share: null, completeness: 0 };
  }
  const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const habitual = values[3] ?? 0;
  const share = total > 0 ? clamp((habitual / total) * 100) : 0;
  const completeness = values.filter((value) => value !== null).length / values.length;
  return { share, completeness };
};

const computeJudgment = (metrics: MetricRecord[], bucketStart: string) => {
  const requiredControls = [
    "ai_enabled_status",
    "data_retention_policy_status",
    "model_training_opt_out_status",
    "external_sharing_disabled_status"
  ];
  const controlRecords = Array.from(store.controls.values()).filter(
    (control) => control.bucket_start === bucketStart && requiredControls.includes(control.control_name)
  );
  if (controlRecords.length === 0) {
    return { score: null, completeness: 0 };
  }
  const enabledCount = controlRecords.filter((control) => control.control_value === true).length;
  const completeness = controlRecords.length / requiredControls.length;
  const score = clamp((enabledCount / requiredControls.length) * 100);
  return { score, completeness };
};

const computeBucketScore = (orgId: string, bucketStart: string) => {
  const metrics = Array.from(store.metrics.values()).filter(
    (metric) =>
      metric.orgId === orgId &&
      metric.group_key === "org" &&
      metric.bucket_start === bucketStart
  );

  const coverageMetric = metrics.find(
    (metric) => metric.metric_name === "active_users_percent_of_assigned"
  );
  const coverageScore = coverageMetric?.suppressed || coverageMetric?.metric_value === null
    ? null
    : clamp((coverageMetric?.metric_value ?? 0) * 100);
  const coverageCompleteness = coverageScore === null ? 0 : 1;

  const sessionsMetric = metrics.find(
    (metric) => metric.metric_name === "avg_sessions_per_active_user"
  );
  const sessionsScore = sessionsMetric?.suppressed || sessionsMetric?.metric_value === null
    ? null
    : normalizeSessions(sessionsMetric?.metric_value ?? 0);
  const sessionsCompleteness = sessionsScore === null ? 0 : 1;

  const habitual = computeHabitualShare(metrics, bucketStart);
  const depthComponents = [sessionsScore, habitual.share].filter(
    (value): value is number => value !== null
  );
  const depthScore = depthComponents.length
    ? clamp(depthComponents.reduce((sum, value) => sum + value, 0) / depthComponents.length)
    : null;
  const depthCompleteness = (sessionsCompleteness + habitual.completeness) / 2;

  const growthMetric = metrics.find(
    (metric) => metric.metric_name === "week_over_week_usage_growth_percent"
  );
  const adoptionMetric = metrics.find(
    (metric) => metric.metric_name === "adoption_delta_post_training_percent"
  );
  const growthScore = growthMetric?.suppressed || growthMetric?.metric_value === null
    ? null
    : clamp(growthMetric?.metric_value ?? 0);
  const adoptionScore = adoptionMetric?.suppressed || adoptionMetric?.metric_value === null
    ? null
    : clamp(adoptionMetric?.metric_value ?? 0);
  const velocityComponents = [growthScore, adoptionScore].filter(
    (value): value is number => value !== null
  );
  const velocityScore = velocityComponents.length
    ? clamp(velocityComponents.reduce((sum, value) => sum + value, 0) / velocityComponents.length)
    : null;
  const velocityCompleteness = velocityComponents.length / 2;

  const judgment = computeJudgment(metrics, bucketStart);

  const subscores = [
    { score: coverageScore, weight: 0.25, completeness: coverageCompleteness },
    { score: depthScore, weight: 0.25, completeness: depthCompleteness },
    { score: velocityScore, weight: 0.25, completeness: velocityCompleteness },
    { score: judgment.score, weight: 0.25, completeness: judgment.completeness }
  ];

  const available = subscores.filter((item) => item.score !== null);
  const totalWeight = available.reduce((sum, item) => sum + item.weight, 0);
  if (available.length === 0) {
    return { score: null, dataCompleteness: 0, confidence: 0 };
  }
  const score = clamp(
    available.reduce((sum, item) => sum + (item.score ?? 0) * item.weight, 0) / totalWeight
  );

  const dataCompleteness = subscores.reduce((sum, item) => sum + item.completeness, 0) / subscores.length;
  const confidence = Number(dataCompleteness.toFixed(2));
  return {
    score,
    dataCompleteness,
    confidence,
    dimensionScores: {
      coverage: coverageScore,
      depth: depthScore,
      judgment: judgment.score,
      velocity: velocityScore
    }
  };
};

export const runFluencyIndexJob = (orgId: string) => {
  const buckets = Array.from(store.metrics.values())
    .filter((metric) => metric.orgId === orgId && metric.group_key === "org")
    .map((metric) => metric.bucket_start);
  const uniqueBuckets = Array.from(new Set(buckets));

  uniqueBuckets.forEach((bucketStart) => {
    const result = computeBucketScore(orgId, bucketStart);
    if (result.score === null) {
      return;
    }
    const snapshotKey = `${orgId}:${bucketStart}`;
    if (store.fluencySnapshots.has(snapshotKey)) {
      return;
    }
    const record: MetricRecord = {
      orgId,
      group_key: "org",
      group_type: "org",
      vendor: "all",
      bucket_start: bucketStart,
      metric_name: "fluency_index",
      metric_value: result.score,
      is_user_count: false,
      suppressed: false
    };
    upsertMetric(record);
    const metaKey = `${orgId}:${bucketStart}`;
    const meta: FluencyMetaRecord = {
      orgId,
      bucketStart,
      dataCompleteness: result.dataCompleteness,
      confidence: result.confidence
    };
    store.fluencyMeta.set(metaKey, meta);
    const dimensions: FluencyDimensionRecord[] = [
      { orgId, bucketStart, dimension: "coverage", score: result.dimensionScores.coverage ?? 0 },
      { orgId, bucketStart, dimension: "depth", score: result.dimensionScores.depth ?? 0 },
      { orgId, bucketStart, dimension: "judgment", score: result.dimensionScores.judgment ?? 0 },
      { orgId, bucketStart, dimension: "velocity", score: result.dimensionScores.velocity ?? 0 }
    ];
    dimensions.forEach((dimension) => {
      if (result.dimensionScores[dimension.dimension] === null) {
        return;
      }
      const key = `${orgId}:${bucketStart}:${dimension.dimension}`;
      if (!store.fluencyDimensions.has(key)) {
        store.fluencyDimensions.set(key, dimension);
      }
    });
    const snapshot: FluencySnapshotRecord = {
      orgId,
      bucketStart,
      totalScore: result.score,
      dimensionScores: result.dimensionScores,
      dataCompleteness: result.dataCompleteness
    };
    store.fluencySnapshots.set(snapshotKey, snapshot);
  });
};

export const computeFluencyIndexPreview = (orgId: string, bucketStart: string) => {
  return computeBucketScore(orgId, bucketStart);
};
