export const AI_VALUE_SELECTED_OUTCOME_METRICS_KEY = "aiValue.selectedOutcomeMetrics";
export const AI_VALUE_SELECTED_OUTCOME_METRIC_WATCH_PLAN_KEY =
  "aiValue.selectedOutcomeMetricWatchPlan";

export interface SelectedOutcomeMetric {
  id: string;
  name: string;
  valueRoute: string;
  sourceSystem: string;
  measurementUnit: string;
  owner: string;
  question?: string;
  watches?: string;
}

export interface SelectedOutcomeMetricSelection {
  functionArea: string;
  quadrantLabel: string;
  vbdBaseline: string;
  metrics: SelectedOutcomeMetric[];
  updatedAt?: string;
}

export interface SelectedOutcomeMetricWatchPlan {
  activeFunctionArea: string;
  selectionsByFunction: Record<string, SelectedOutcomeMetricSelection>;
  updatedAt?: string;
}

const storageAvailable = () => {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
};

const isMetric = (value: unknown): value is SelectedOutcomeMetric => {
  if (!value || typeof value !== "object") return false;
  const metric = value as Record<string, unknown>;
  return (
    typeof metric.id === "string" &&
    typeof metric.name === "string" &&
    typeof metric.sourceSystem === "string" &&
    typeof metric.measurementUnit === "string" &&
    typeof metric.owner === "string" &&
    typeof metric.valueRoute === "string"
  );
};

const isSelection = (value: unknown): value is SelectedOutcomeMetricSelection => {
  if (!value || typeof value !== "object") return false;
  const selection = value as Record<string, unknown>;
  return (
    typeof selection.functionArea === "string" &&
    typeof selection.quadrantLabel === "string" &&
    typeof selection.vbdBaseline === "string" &&
    Array.isArray(selection.metrics) &&
    selection.metrics.every(isMetric)
  );
};

const isSelectionRecord = (
  value: unknown
): value is Record<string, SelectedOutcomeMetricSelection> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every(isSelection);
};

const isWatchPlan = (value: unknown): value is SelectedOutcomeMetricWatchPlan => {
  if (!value || typeof value !== "object") return false;
  const watchPlan = value as Record<string, unknown>;
  return (
    typeof watchPlan.activeFunctionArea === "string" &&
    isSelectionRecord(watchPlan.selectionsByFunction) &&
    (watchPlan.updatedAt === undefined || typeof watchPlan.updatedAt === "string")
  );
};

export const readSelectedOutcomeMetricSelection = (): SelectedOutcomeMetricSelection | null => {
  if (!storageAvailable()) return null;
  try {
    const raw = localStorage.getItem(AI_VALUE_SELECTED_OUTCOME_METRICS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isSelection(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const writeSelectedOutcomeMetricSelection = (
  selection: SelectedOutcomeMetricSelection
) => {
  if (!storageAvailable()) return;
  try {
    localStorage.setItem(
      AI_VALUE_SELECTED_OUTCOME_METRICS_KEY,
      JSON.stringify({
        ...selection,
        updatedAt: new Date().toISOString()
      })
    );
  } catch {
    return;
  }
};

export const readSelectedOutcomeMetricWatchPlan = (): SelectedOutcomeMetricWatchPlan | null => {
  if (!storageAvailable()) return null;
  try {
    const raw = localStorage.getItem(AI_VALUE_SELECTED_OUTCOME_METRIC_WATCH_PLAN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isWatchPlan(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const writeSelectedOutcomeMetricWatchPlan = (
  watchPlan: SelectedOutcomeMetricWatchPlan
) => {
  if (!storageAvailable()) return;
  try {
    localStorage.setItem(
      AI_VALUE_SELECTED_OUTCOME_METRIC_WATCH_PLAN_KEY,
      JSON.stringify({
        ...watchPlan,
        updatedAt: new Date().toISOString()
      })
    );
  } catch {
    return;
  }
};
