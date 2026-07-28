import { store, type FluencyEventRecord } from "./store";
import {
  getBaselineResetAtForRegistryVersion,
  getPolicyConfigForRegistryVersion,
  listBaselineResetsByOrg,
  listRegistryEntriesByWorkflow,
  listRegistryPolicyConfigsByOrg
} from "./workflow_registry";
import { computeWorkflowVisibility as computeVisibilityState } from "./workflow_visibility";
import { privacyHeldBehavioralPosture } from "./aggregate_disclosure_policy";

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

  const fluencyEvents = fluencyEventsOverride ?? [];
  const visibilityState = computeVisibilityState(workflowId, "60d", {
    now,
    registryEntry: latest,
    policyConfig,
    baselineResetAt,
    fluencyEvents,
    v0Signals: privacyHeldBehavioralPosture(Array.from(store.behavioralSignals.values())),
    patternInferenceRecords: []
  });

  return { visibilityState, dominantPattern: null };
};
