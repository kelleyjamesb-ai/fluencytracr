import crypto from "crypto";
import {
  insertBaselineResetEvent,
  insertWorkflowRegistryAudit,
  insertWorkflowRegistryEntry,
  insertWorkflowVisibilityPolicyConfig,
  store,
  upsertWorkflowRegistryCurrent,
  type BaselineResetEventRecord,
  type WorkflowRegistryAuditRecord,
  type WorkflowRegistryCurrentRecord,
  type WorkflowRegistryRecord,
  type WorkflowRiskClass,
  type WorkflowVisibilityPolicyConfigRecord
} from "./store";
import {
  listBaselineResetEventsByOrg,
  listWorkflowRegistryAuditByOrg,
  listWorkflowRegistryEntriesByOrg,
  listWorkflowVisibilityPolicyConfigsByOrg,
  persistBaselineResetEvent,
  persistWorkflowRegistryAuditEvent,
  persistWorkflowRegistryEntry,
  persistWorkflowVisibilityPolicyConfig,
  upsertWorkflowRegistryCurrent as persistWorkflowRegistryCurrent
} from "./workflow_registry_persistence";
import {
  defaultWorkflowVisibilityPolicyConfig,
  resolveLatestPolicyConfig
} from "./workflow_visibility_policy";

const sortRegistry = (records: WorkflowRegistryRecord[]) => {
  return records.slice().sort((a, b) => {
    if (a.workflowId !== b.workflowId) {
      return a.workflowId.localeCompare(b.workflowId);
    }
    if (a.version !== b.version) {
      return a.version - b.version;
    }
    return a.createdAt.localeCompare(b.createdAt);
  });
};

const sortAudit = (records: WorkflowRegistryAuditRecord[]) => {
  return records.slice().sort((a, b) => {
    if (a.createdAt !== b.createdAt) {
      return a.createdAt.localeCompare(b.createdAt);
    }
    return a.id.localeCompare(b.id);
  });
};

const listFromMemoryByOrg = (orgId: string) => {
  return sortRegistry(Array.from(store.workflowRegistry.values()).filter((record) => record.orgId === orgId));
};

export const listRegistryEntriesByOrg = async (orgId: string) => {
  if (process.env.DATABASE_URL) {
    return sortRegistry(await listWorkflowRegistryEntriesByOrg(orgId));
  }
  return listFromMemoryByOrg(orgId);
};

export const listRegistryEntriesByWorkflow = async (orgId: string, workflowId: string) => {
  const rows = await listRegistryEntriesByOrg(orgId);
  return rows.filter((row) => row.workflowId === workflowId);
};

const toControlConfig = (
  orgId: string,
  createdAt: string,
  actorSub: string | undefined,
  actorRole: string | undefined,
  changeReason: string | undefined,
  policyConfig: {
    policyVersion: string;
    lowMinEvents: number;
    mediumMinEvents: number;
    highMinEvents: number;
    minWindowDays: number;
    highSparseMinEvents: number;
    highSparseMinWindowDays: number;
  }
): WorkflowVisibilityPolicyConfigRecord => ({
  id: crypto.randomUUID(),
  orgId,
  versionName: policyConfig.policyVersion,
  changeReason: changeReason ?? "policy update",
  changedByUser: actorSub ?? "system",
  changedByRole: actorRole ?? "SYSTEM",
  windowDaysLow: policyConfig.minWindowDays,
  windowDaysMedium: policyConfig.minWindowDays,
  windowDaysHigh: policyConfig.highSparseMinWindowDays,
  minEventsLow: policyConfig.lowMinEvents,
  minEventsMedium: policyConfig.mediumMinEvents,
  minEventsHigh: policyConfig.highMinEvents,
  requireVerificationHigh: true,
  createdAt
});

export const registerWorkflowVersion = async (params: {
  orgId: string;
  workflowId: string;
  displayName?: string;
  riskClass: WorkflowRiskClass;
  changeReason?: string;
  actorSub?: string;
  actorRole?: string;
  policyConfig?: {
    policyVersion: string;
    lowMinEvents: number;
    mediumMinEvents: number;
    highMinEvents: number;
    minWindowDays: number;
    highSparseMinEvents: number;
    highSparseMinWindowDays: number;
  };
}) => {
  const versions = await listRegistryEntriesByWorkflow(params.orgId, params.workflowId);
  const version = versions.length === 0 ? 1 : versions[versions.length - 1].version + 1;
  const createdAt = new Date().toISOString();
  const changedByUser = params.actorSub ?? "system";
  const changedByRole = params.actorRole ?? "SYSTEM";

  const record: WorkflowRegistryRecord = {
    id: crypto.randomUUID(),
    orgId: params.orgId,
    workflowId: params.workflowId,
    displayName: params.displayName ?? params.workflowId,
    version,
    riskClass: params.riskClass,
    changeReason: params.changeReason ?? "",
    changedByUser,
    changedByRole,
    createdAt
  };

  const existingPolicyConfigs = await listRegistryPolicyConfigsByOrg(params.orgId);
  const selectedPolicyConfig =
    (params.policyConfig
      ? toControlConfig(
          params.orgId,
          createdAt,
          params.actorSub,
          params.actorRole,
          params.changeReason,
          params.policyConfig
        )
      : resolveLatestPolicyConfig(existingPolicyConfigs, params.orgId)) ??
    defaultWorkflowVisibilityPolicyConfig(params.orgId);

  const currentRecord: WorkflowRegistryCurrentRecord = {
    id: `current-${params.orgId}-${params.workflowId}`,
    orgId: params.orgId,
    workflowId: params.workflowId,
    displayName: params.displayName ?? params.workflowId,
    riskClass: params.riskClass,
    effectiveVersionId: record.id,
    updatedAt: createdAt
  };

  const baselineResetRecord: BaselineResetEventRecord = {
    id: crypto.randomUUID(),
    orgId: params.orgId,
    controlConfigVersionId: selectedPolicyConfig.id,
    resetAt: createdAt,
    reason: params.changeReason ?? "workflow registry update",
    triggeredByUser: changedByUser,
    triggeredByRole: changedByRole
  };

  const audit: WorkflowRegistryAuditRecord = {
    id: crypto.randomUUID(),
    orgId: params.orgId,
    workflowId: params.workflowId,
    version,
    action: "REGISTERED",
    actorSub: params.actorSub,
    actorRole: params.actorRole,
    metadata: {
      risk_class: params.riskClass,
      change_reason: params.changeReason ?? null
    },
    createdAt
  };
  const baselineResetAudit: WorkflowRegistryAuditRecord = {
    id: crypto.randomUUID(),
    orgId: params.orgId,
    workflowId: params.workflowId,
    version,
    action: "BASELINE_RESET",
    actorSub: params.actorSub,
    actorRole: params.actorRole,
    metadata: {
      reset_at: baselineResetRecord.resetAt,
      policy_version: selectedPolicyConfig.versionName
    },
    createdAt
  };

  insertWorkflowRegistryEntry(record);
  upsertWorkflowRegistryCurrent(currentRecord);
  insertWorkflowVisibilityPolicyConfig(selectedPolicyConfig);
  insertBaselineResetEvent(baselineResetRecord);
  insertWorkflowRegistryAudit(audit);
  insertWorkflowRegistryAudit(baselineResetAudit);

  await persistWorkflowRegistryEntry(record);
  await persistWorkflowRegistryCurrent(currentRecord);
  await persistWorkflowVisibilityPolicyConfig(selectedPolicyConfig);
  await persistBaselineResetEvent(baselineResetRecord);
  await persistWorkflowRegistryAuditEvent(audit);
  await persistWorkflowRegistryAuditEvent(baselineResetAudit);

  return record;
};

export const createControlConfigVersion = async (params: {
  orgId: string;
  versionName: string;
  changeReason: string;
  changedByUser?: string;
  changedByRole?: string;
  windowDaysLow: number;
  windowDaysMedium: number;
  windowDaysHigh: number;
  minEventsLow: number;
  minEventsMedium: number;
  minEventsHigh: number;
  requireVerificationHigh: boolean;
}) => {
  const createdAt = new Date().toISOString();
  const record: WorkflowVisibilityPolicyConfigRecord = {
    id: crypto.randomUUID(),
    orgId: params.orgId,
    versionName: params.versionName,
    changeReason: params.changeReason,
    changedByUser: params.changedByUser ?? "system",
    changedByRole: params.changedByRole ?? "SYSTEM",
    windowDaysLow: params.windowDaysLow,
    windowDaysMedium: params.windowDaysMedium,
    windowDaysHigh: params.windowDaysHigh,
    minEventsLow: params.minEventsLow,
    minEventsMedium: params.minEventsMedium,
    minEventsHigh: params.minEventsHigh,
    requireVerificationHigh: params.requireVerificationHigh,
    createdAt
  };
  insertWorkflowVisibilityPolicyConfig(record);
  await persistWorkflowVisibilityPolicyConfig(record);
  return record;
};

export const resetBaseline = async (params: {
  orgId: string;
  controlConfigVersionId: string;
  reason: string;
  triggeredByUser?: string;
  triggeredByRole?: string;
}) => {
  const event: BaselineResetEventRecord = {
    id: crypto.randomUUID(),
    orgId: params.orgId,
    controlConfigVersionId: params.controlConfigVersionId,
    resetAt: new Date().toISOString(),
    reason: params.reason,
    triggeredByUser: params.triggeredByUser ?? "system",
    triggeredByRole: params.triggeredByRole ?? "SYSTEM"
  };
  insertBaselineResetEvent(event);
  await persistBaselineResetEvent(event);
  return event;
};

export const listRegistryAudit = async (orgId: string, workflowId?: string) => {
  if (process.env.DATABASE_URL) {
    return sortAudit(await listWorkflowRegistryAuditByOrg(orgId, workflowId));
  }

  const rows = Array.from(store.workflowRegistryAudit.values()).filter(
    (record) => record.orgId === orgId && (!workflowId || record.workflowId === workflowId)
  );
  return sortAudit(rows);
};

export const listRegistryPolicyConfigsByOrg = async (orgId: string) => {
  if (process.env.DATABASE_URL) {
    return await listWorkflowVisibilityPolicyConfigsByOrg(orgId);
  }
  return Array.from(store.workflowVisibilityPolicyConfigs.values())
    .filter((config) => config.orgId === orgId)
    .sort((a, b) => {
      if (a.createdAt !== b.createdAt) {
        return a.createdAt.localeCompare(b.createdAt);
      }
      return a.id.localeCompare(b.id);
    });
};

export const listBaselineResetsByOrg = async (orgId: string) => {
  if (process.env.DATABASE_URL) {
    return await listBaselineResetEventsByOrg(orgId);
  }
  return Array.from(store.baselineResetEvents.values())
    .filter((event) => event.orgId === orgId)
    .sort((a, b) => {
      if (a.resetAt !== b.resetAt) {
        return a.resetAt.localeCompare(b.resetAt);
      }
      return a.id.localeCompare(b.id);
    });
};

export const getPolicyConfigForRegistryVersion = (
  configs: WorkflowVisibilityPolicyConfigRecord[],
  registry: WorkflowRegistryRecord
) => {
  const candidates = configs
    .filter((config) => config.orgId === registry.orgId)
    .filter((config) => config.createdAt <= registry.createdAt)
    .sort((a, b) => {
      if (a.createdAt !== b.createdAt) {
        return a.createdAt.localeCompare(b.createdAt);
      }
      return a.id.localeCompare(b.id);
    });
  if (candidates.length > 0) {
    return candidates[candidates.length - 1];
  }
  return resolveLatestPolicyConfig(configs, registry.orgId);
};

export const getBaselineResetAtForRegistryVersion = (
  baselineResets: BaselineResetEventRecord[],
  registry: WorkflowRegistryRecord
) => {
  const candidates = baselineResets
    .filter((event) => event.orgId === registry.orgId)
    .filter((event) => event.resetAt <= registry.createdAt)
    .sort((a, b) => {
      if (a.resetAt !== b.resetAt) {
        return a.resetAt.localeCompare(b.resetAt);
      }
      return a.id.localeCompare(b.id);
    });
  if (candidates.length > 0) {
    return candidates[candidates.length - 1].resetAt;
  }
  return null;
};
