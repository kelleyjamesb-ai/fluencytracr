export type Metric = {
  groupKey: string;
  groupType?: string;
  vendor?: string;
  bucketStart: string;
  bucketEnd?: string;
  metricName: string;
  metricValue: number | null;
  isUserCount: boolean;
  suppressed: boolean;
};

const metricPartitionKey = (metric: Metric): string =>
  `${metric.bucketStart}:${metric.metricName}:${metric.vendor ?? ""}:${metric.groupType ?? ""}`;

const metricEquationKey = (metric: Metric): string =>
  `${metric.bucketStart}:${metric.metricName}:${metric.vendor ?? ""}`;

export const applySuppression = (metrics: Metric[], minGroupSize: number): Metric[] => {
  return metrics.map((metric) => {
    if (metric.isUserCount && metric.metricValue !== null && metric.metricValue < minGroupSize) {
      return { ...metric, suppressed: true, metricValue: null };
    }
    return metric;
  });
};

const buildOrgRollups = (metrics: Metric[], minGroupSize: number): Metric[] => {
  const byBucketMetric = metrics.reduce<
    Record<
      string,
      {
        total: number;
        hasSuppressedChild: boolean;
        bucketEnd?: string;
        groupType?: string;
        vendor?: string;
      }
    >
  >((acc, metric) => {
    if (!metric.isUserCount || metric.metricValue === null) {
      return acc;
    }
    if (metric.groupKey === "org") {
      return acc;
    }
    const key = metricPartitionKey(metric);
    const current = acc[key] ?? {
      total: 0,
      hasSuppressedChild: false,
      bucketEnd: metric.bucketEnd,
      groupType: metric.groupType,
      vendor: metric.vendor
    };
    acc[key] = {
      total: current.total + metric.metricValue,
      hasSuppressedChild:
        current.hasSuppressedChild || metric.suppressed || metric.metricValue < minGroupSize,
      bucketEnd: metric.bucketEnd ?? current.bucketEnd,
      groupType: metric.groupType ?? current.groupType,
      vendor: metric.vendor ?? current.vendor
    };
    return acc;
  }, {});

  return Object.entries(byBucketMetric).map(([key, payload]) => {
    const [bucketStart, metricName, vendor, groupType] = key.split(":");
    const suppressed = payload.hasSuppressedChild || payload.total < minGroupSize;
    return {
      groupKey: "org",
      groupType: groupType || payload.groupType || "org",
      vendor: vendor || payload.vendor,
      bucketStart,
      bucketEnd: payload.bucketEnd,
      metricName,
      metricValue: suppressed ? null : payload.total,
      isUserCount: true,
      suppressed
    };
  });
};

export const rollupSuppressedToOrg = (metrics: Metric[], minGroupSize: number): Metric[] => {
  const hasSuppressed = metrics.some(
    (metric) => metric.isUserCount && metric.suppressed
  );

  if (!hasSuppressed) {
    return metrics;
  }

  const orgMetrics = buildOrgRollups(metrics, minGroupSize);
  return [...metrics, ...orgMetrics];
};

export const suppressAndRollup = (metrics: Metric[], minGroupSize: number): Metric[] => {
  const explicitParentPartitions = new Set(
    metrics
      .filter((metric) => metric.groupKey === "org" && metric.groupType !== "org")
      .map(metricPartitionKey)
  );
  const ambiguousParentEquations = new Set(
    metrics
      .filter((metric) => metric.groupKey === "org" && (metric.groupType ?? "org") === "org")
      .map(metricEquationKey)
  );
  const childPartitions = new Set(
    metrics.filter((metric) => metric.groupKey !== "org").map(metricPartitionKey)
  );
  const childEquations = new Set(
    metrics.filter((metric) => metric.groupKey !== "org").map(metricEquationKey)
  );
  const orgRollups = buildOrgRollups(metrics, minGroupSize).map((metric) =>
    explicitParentPartitions.has(metricPartitionKey(metric)) ||
    ambiguousParentEquations.has(metricEquationKey(metric))
      ? { ...metric, metricValue: null, suppressed: true }
      : metric
  );
  const suppressed = applySuppression(metrics, minGroupSize).map((metric) =>
    metric.groupKey === "org" &&
    (childPartitions.has(metricPartitionKey(metric)) ||
      ((metric.groupType ?? "org") === "org" && childEquations.has(metricEquationKey(metric))))
      ? { ...metric, metricValue: null, suppressed: true }
      : metric
  );
  return [...suppressed, ...orgRollups];
};
