export type Metric = {
  metricName: string;
  bucketStart: string;
  groupKey?: string;
  metricValue?: number | null;
  isUserCount?: boolean;
  suppressed?: boolean;
};

export const applySuppression = (_metrics: Metric[], _minGroupSize: number): Metric[] => {
  return [];
};

export const rollupSuppressedToOrg = (_metrics: Metric[], _minGroupSize: number): Metric[] => {
  return [];
};

export const suppressAndRollup = (_metrics: Metric[], _minGroupSize: number): Metric[] => {
  return [];
};
