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
    Record<string, { total: number; bucketEnd?: string; groupType?: string; vendor?: string }>
  >((acc, metric) => {
    if (!metric.isUserCount || metric.metricValue === null) {
      return acc;
    }
    const key = `${metric.bucketStart}:${metric.metricName}:${metric.vendor ?? ""}`;
    const current = acc[key] ?? {
      total: 0,
      bucketEnd: metric.bucketEnd,
      groupType: metric.groupType,
      vendor: metric.vendor
    };
    acc[key] = {
      total: current.total + metric.metricValue,
      bucketEnd: metric.bucketEnd ?? current.bucketEnd,
      groupType: metric.groupType ?? current.groupType,
      vendor: metric.vendor ?? current.vendor
    };
    return acc;
  }, {});

  return Object.entries(byBucketMetric).map(([key, payload]) => {
    const [bucketStart, metricName, vendor] = key.split(":");
    const suppressed = payload.total < minGroupSize;
    return {
      groupKey: "org",
      groupType: payload.groupType ?? "org",
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
    (metric) => metric.isUserCount && metric.metricValue === null && metric.suppressed
  );

  if (!hasSuppressed) {
    return metrics;
  }

  const orgMetrics = buildOrgRollups(metrics, minGroupSize);
  return [...metrics, ...orgMetrics];
};

export const suppressAndRollup = (metrics: Metric[], minGroupSize: number): Metric[] => {
  const suppressed = applySuppression(metrics, minGroupSize);
  return rollupSuppressedToOrg(suppressed, minGroupSize);
};
