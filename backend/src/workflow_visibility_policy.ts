import type { WorkflowVisibilityPolicyConfigRecord } from "./store";

export const DEFAULT_WORKFLOW_VISIBILITY_POLICY_VERSION = "dashboard-v1-default-2026-02-18";

export const defaultWorkflowVisibilityPolicyConfig = (
  orgId: string
): WorkflowVisibilityPolicyConfigRecord => ({
  id: `default-${orgId}`,
  orgId,
  versionName: DEFAULT_WORKFLOW_VISIBILITY_POLICY_VERSION,
  changeReason: "System default control configuration",
  changedByUser: "system",
  changedByRole: "SYSTEM",
  windowDaysLow: 60,
  windowDaysMedium: 60,
  windowDaysHigh: 60,
  minEventsLow: 5,
  minEventsMedium: 5,
  minEventsHigh: 8,
  requireVerificationHigh: true,
  createdAt: new Date(0).toISOString()
});

export const resolveLatestPolicyConfig = (
  configs: WorkflowVisibilityPolicyConfigRecord[],
  orgId: string
) => {
  const sorted = configs
    .filter((config) => config.orgId === orgId)
    .sort((a, b) => {
      if (a.createdAt !== b.createdAt) {
        return a.createdAt.localeCompare(b.createdAt);
      }
      return a.id.localeCompare(b.id);
    });

  if (sorted.length > 0) {
    return sorted[sorted.length - 1];
  }

  return null;
};
