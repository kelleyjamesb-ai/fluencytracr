import crypto from "crypto";
import {
  insertWorkflowRegistryAudit,
  insertWorkflowRegistryEntry,
  insertWorkflowVisibilityPolicyConfig,
  store,
  type WorkflowRegistryAuditRecord,
  type WorkflowRegistryRecord,
  type WorkflowVisibilityPolicyConfigRecord,
  type WorkflowRiskClass
} from "./store";
import {
  listWorkflowRegistryAuditByOrg,
  listWorkflowRegistryEntriesByOrg,
  listWorkflowVisibilityPolicyConfigsByOrg,
  persistWorkflowRegistryAuditEvent,
  persistWorkflowRegistryEntry,
  persistWorkflowVisibilityPolicyConfig
} from "./workflow_registry_persistence";
import {
  defaultWorkflowVisibilityPolicyConfig,
  resolvePolicyForRegistryVersion
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

export const registerWorkflowVersion = async (params: {
  orgId: string;
  workflowId: string;
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

  const record: WorkflowRegistryRecord = {
    id: crypto.randomUUID(),
    orgId: params.orgId,
    workflowId: params.workflowId,
    version,
    riskClass: params.riskClass,
    changeReason: params.changeReason,
    actorSub: params.actorSub,
    actorRole: params.actorRole,
    createdAt
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
  const policyConfig: WorkflowVisibilityPolicyConfigRecord = {
    ...(params.policyConfig
      ? {
          id: crypto.randomUUID(),
          orgId: params.orgId,
          workflowId: params.workflowId,
          registryVersion: version,
          policyVersion: params.policyConfig.policyVersion,
          lowMinEvents: params.policyConfig.lowMinEvents,
          mediumMinEvents: params.policyConfig.mediumMinEvents,
          highMinEvents: params.policyConfig.highMinEvents,
          minWindowDays: params.policyConfig.minWindowDays,
          highSparseMinEvents: params.policyConfig.highSparseMinEvents,
          highSparseMinWindowDays: params.policyConfig.highSparseMinWindowDays,
          createdAt
        }
      : defaultWorkflowVisibilityPolicyConfig(params.orgId, params.workflowId, version))
  };
  const baselineResetAt = createdAt;
  const baselineResetAudit: WorkflowRegistryAuditRecord = {
    id: crypto.randomUUID(),
    orgId: params.orgId,
    workflowId: params.workflowId,
    version,
    action: "BASELINE_RESET",
    actorSub: params.actorSub,
    actorRole: params.actorRole,
    metadata: {
      reset_at: baselineResetAt,
      policy_version: policyConfig.policyVersion
    },
    createdAt
  };

  insertWorkflowRegistryEntry(record);
  insertWorkflowRegistryAudit(audit);
  insertWorkflowRegistryAudit(baselineResetAudit);
  insertWorkflowVisibilityPolicyConfig(policyConfig);
  await persistWorkflowRegistryEntry(record);
  await persistWorkflowRegistryAuditEvent(audit);
  await persistWorkflowRegistryAuditEvent(baselineResetAudit);
  await persistWorkflowVisibilityPolicyConfig(policyConfig);

  return record;
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
      if (a.workflowId !== b.workflowId) {
        return a.workflowId.localeCompare(b.workflowId);
      }
      if (a.registryVersion !== b.registryVersion) {
        return a.registryVersion - b.registryVersion;
      }
      return a.createdAt.localeCompare(b.createdAt);
    });
};

export const getPolicyConfigForRegistryVersion = (
  configs: WorkflowVisibilityPolicyConfigRecord[],
  registry: WorkflowRegistryRecord
) => {
  return resolvePolicyForRegistryVersion(
    configs,
    registry.orgId,
    registry.workflowId,
    registry.version
  );
};

export const getBaselineResetAtForRegistryVersion = (
  audits: WorkflowRegistryAuditRecord[],
  registry: WorkflowRegistryRecord
) => {
  const resetEvents = audits
    .filter(
      (event) =>
        event.orgId === registry.orgId &&
        event.workflowId === registry.workflowId &&
        event.version === registry.version &&
        event.action === "BASELINE_RESET"
    )
    .sort((a, b) => {
      if (a.createdAt !== b.createdAt) {
        return a.createdAt.localeCompare(b.createdAt);
      }
      return a.id.localeCompare(b.id);
    });
  const latest = resetEvents[resetEvents.length - 1];
  if (!latest) {
    return null;
  }
  const raw = latest.metadata.reset_at;
  return typeof raw === "string" ? raw : latest.createdAt;
};
