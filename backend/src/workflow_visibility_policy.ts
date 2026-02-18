import type { WorkflowVisibilityPolicyConfigRecord } from "./store";

export const DEFAULT_WORKFLOW_VISIBILITY_POLICY_VERSION = "dashboard-v1-default-2026-02-18";

export const defaultWorkflowVisibilityPolicyConfig = (
  orgId: string,
  workflowId: string,
  registryVersion: number
): WorkflowVisibilityPolicyConfigRecord => ({
  id: `default-${orgId}-${workflowId}-${registryVersion}`,
  orgId,
  workflowId,
  registryVersion,
  policyVersion: DEFAULT_WORKFLOW_VISIBILITY_POLICY_VERSION,
  lowMinEvents: 3,
  mediumMinEvents: 5,
  highMinEvents: 8,
  minWindowDays: 30,
  highSparseMinEvents: 12,
  highSparseMinWindowDays: 60,
  createdAt: new Date(0).toISOString()
});

export const resolvePolicyForRegistryVersion = (
  configs: WorkflowVisibilityPolicyConfigRecord[],
  orgId: string,
  workflowId: string,
  registryVersion: number
) => {
  const exact = configs
    .filter((config) => config.orgId === orgId && config.workflowId === workflowId && config.registryVersion === registryVersion)
    .sort((a, b) => {
      if (a.createdAt !== b.createdAt) {
        return a.createdAt.localeCompare(b.createdAt);
      }
      return a.id.localeCompare(b.id);
    });

  if (exact.length > 0) {
    return exact[exact.length - 1];
  }

  return null;
};
