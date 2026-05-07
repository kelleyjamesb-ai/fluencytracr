import { store, type FluencyEventRecord } from "./store";
import {
  getBaselineResetAtForRegistryVersion,
  getPolicyConfigForRegistryVersion,
  listBaselineResetsByOrg,
  listRegistryEntriesByWorkflow,
  listRegistryPolicyConfigsByOrg
} from "./workflow_registry";
import { computeWorkflowVisibility as computeVisibilityState } from "./workflow_visibility";

type DominantPattern =
  | "CALIBRATED_FLUENCY"
  | "BLIND_EFFICIENCY"
  | "RECOVERY_MATURITY"
  | "FRICTION_LOOP"
  | "UNDERTRUST_AVOIDANCE";

const normalizeDominantPattern = (pattern: string | null): DominantPattern | null => {
  if (!pattern) {
    return null;
  }
  if (
    pattern === "CALIBRATED_FLUENCY" ||
    pattern === "BLIND_EFFICIENCY" ||
    pattern === "RECOVERY_MATURITY" ||
    pattern === "FRICTION_LOOP" ||
    pattern === "UNDERTRUST_AVOIDANCE"
  ) {
    return pattern;
  }
  return null;
};

export const computeWorkflowVisibility = async (
  orgId: string,
  workflowId: string,
  now: Date,
  fluencyEventsOverride?: FluencyEventRecord[]
) => {
  const entries = await listRegistryEntriesByWorkflow(orgId, workflowId);
  const latest = entries
    .slice()
    .sort((a, b) => {
      if (a.version !== b.version) {
        return a.version - b.version;
      }
      return a.createdAt.localeCompare(b.createdAt);
    })
    .at(-1);

  if (!latest) {
    return { visibilityState: "NOT_SHOWN_SAFETY" as const, dominantPattern: null };
  }

  const policyConfigs = await listRegistryPolicyConfigsByOrg(orgId);
  const baselineResets = await listBaselineResetsByOrg(orgId);
  const policyConfig = getPolicyConfigForRegistryVersion(policyConfigs, latest);
  const baselineResetAt = getBaselineResetAtForRegistryVersion(baselineResets, latest);

  const fluencyEvents = fluencyEventsOverride ?? Array.from(store.fluencyEvents.values());
  const visibilityState = computeVisibilityState(workflowId, "60d", {
    now,
    registryEntry: latest,
    policyConfig,
    baselineResetAt,
    fluencyEvents,
    v0Signals: Array.from(store.behavioralSignals.values()),
    patternInferenceRecords: store.patternInferenceRecords
  });

  const dominantPatterns = new Set(
    store.patternInferenceRecords
      .filter((record) => record.scope_key.split(":")[0] === workflowId)
      .filter((record) => record.confidence_level === "MEDIUM" || record.confidence_level === "HIGH")
      .filter((record) => record.pattern !== "NO_PATTERN")
      .map((record) => normalizeDominantPattern(record.pattern))
      .filter((pattern): pattern is DominantPattern => pattern !== null)
  );

  const dominantPattern = dominantPatterns.size === 1 ? Array.from(dominantPatterns)[0] : null;
  return { visibilityState, dominantPattern };
};
