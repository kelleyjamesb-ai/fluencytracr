import { store } from "./store";

export const LEGACY_FLUENCY_INDEX_QUARANTINED = true;

export type LegacyFluencyIndexPreview = {
  score: null;
  dataCompleteness: 0;
  confidence: 0;
  dimensionScores: {
    coverage: null;
    depth: null;
    judgment: null;
    velocity: null;
  };
};

const QUARANTINED_PREVIEW: LegacyFluencyIndexPreview = {
  score: null,
  dataCompleteness: 0,
  confidence: 0,
  dimensionScores: {
    coverage: null,
    depth: null,
    judgment: null,
    velocity: null
  }
};

/**
 * Deprecated compatibility boundary.
 *
 * The historical Fluency Index computed a weighted score from aggregate
 * dashboard metrics. That model is not part of the current Glean
 * value-realization evidence layer and must not write customer-facing score
 * metrics. Keep this no-op export only so old internal imports fail closed
 * instead of recreating `fluency_index` output.
 */
export const runFluencyIndexJob = (_orgId: string) => {
  return;
};

/**
 * Deprecated compatibility boundary for legacy tests/internal callers.
 * Current value-realization surfaces should consume SURFACE/SUPPRESS verdicts,
 * Quality Multiplier, Reliability Factor, Causal Delta, Outcome Evidence, or
 * Velocity Index outputs instead of a general score.
 */
export const computeFluencyIndexPreview = (_orgId: string, _bucketStart: string): LegacyFluencyIndexPreview => {
  return QUARANTINED_PREVIEW;
};

export const clearLegacyFluencyIndexArtifacts = (orgId: string) => {
  for (const [key, metric] of store.metrics.entries()) {
    if (metric.orgId === orgId && metric.metric_name === "fluency_index") {
      store.metrics.delete(key);
    }
  }
  for (const key of store.fluencyMeta.keys()) {
    if (key.startsWith(`${orgId}:`)) {
      store.fluencyMeta.delete(key);
    }
  }
  for (const key of store.fluencyDimensions.keys()) {
    if (key.startsWith(`${orgId}:`)) {
      store.fluencyDimensions.delete(key);
    }
  }
  for (const key of store.fluencySnapshots.keys()) {
    if (key.startsWith(`${orgId}:`)) {
      store.fluencySnapshots.delete(key);
    }
  }
};
