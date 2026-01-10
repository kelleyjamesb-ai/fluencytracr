import {
  GroupUpsert,
  MetricObservation,
  PolicyControlObservation,
  TrainingEventRollup
} from "@learnaire/shared";

export type OrgRecord = {
  id: string;
  name: string;
  minGroupSize: number;
  createdAt: string;
};

export type TeamRecord = {
  id: string;
  orgId: string;
  name: string;
  parentTeamId?: string;
};

export type RoleRecord = {
  id: string;
  orgId: string;
  name: string;
};

export type EmployeeRecord = {
  orgId: string;
  employeeHash: string;
  teamIds: Set<string>;
  roleIds: Set<string>;
};

export type EnablementEventRecord = {
  eventId: string;
  orgId: string;
  teamId: string;
  roleId: string;
  timestamp: string;
  eventType: string;
  payload: Record<string, unknown>;
};

export type EnablementRollupRecord = {
  orgId: string;
  teamId: string;
  roleId: string;
  day: string;
  totalEvents: number;
  percentEnabledByRole: number | null;
  assessmentDelta: number | null;
  everboardingCadence: number | null;
  suppressed: boolean;
};

export type ToolInventoryRecord = {
  orgId: string;
  teamId: string;
  toolClass: string;
  firstSeen: string;
  lastSeen: string;
};

export type UsageShapeRecord = {
  orgId: string;
  teamId?: string;
  roleId?: string;
  toolClass: string;
  category: string;
  recordedAt: string;
};

export type SpreadRollupRecord = {
  orgId: string;
  day: string;
  totalTeams: number;
  teamsWithAi: number;
  percentTeamsWithAi: number | null;
  adoptionSpread: number | null;
  concentrationIndex: number | null;
  suppressed: boolean;
};

export type GroupRecord = {
  orgId: string;
  groupKey: string;
  name?: string;
  groupType?: string;
  vendor?: string;
};

export type MetricRecord = MetricObservation & {
  orgId: string;
  suppressed: boolean;
};

export type PolicyControlRecord = PolicyControlObservation & {
  orgId: string;
};

export type TrainingEventRecord = TrainingEventRollup & {
  orgId: string;
};

export type FluencyMetaRecord = {
  orgId: string;
  bucketStart: string;
  dataCompleteness: number;
  confidence: number;
};

export type FluencyDimensionRecord = {
  orgId: string;
  bucketStart: string;
  dimension: "coverage" | "depth" | "judgment" | "velocity";
  score: number;
};

export type FluencySnapshotRecord = {
  orgId: string;
  bucketStart: string;
  totalScore: number;
  dimensionScores: {
    coverage: number | null;
    depth: number | null;
    judgment: number | null;
    velocity: number | null;
  };
  dataCompleteness: number;
};

class MemoryStore {
  orgs = new Map<string, OrgRecord>();
  teams = new Map<string, TeamRecord>();
  roles = new Map<string, RoleRecord>();
  employees = new Map<string, EmployeeRecord>();
  enablementEvents = new Map<string, EnablementEventRecord>();
  enablementRollups = new Map<string, EnablementRollupRecord>();
  toolInventory = new Map<string, ToolInventoryRecord>();
  usageShapes = new Map<string, UsageShapeRecord>();
  spreadRollups = new Map<string, SpreadRollupRecord>();
  groups = new Map<string, GroupRecord>();
  metrics = new Map<string, MetricRecord>();
  controls = new Map<string, PolicyControlRecord>();
  enablement = new Map<string, TrainingEventRecord>();
  fluencyMeta = new Map<string, FluencyMetaRecord>();
  fluencyDimensions = new Map<string, FluencyDimensionRecord>();
  fluencySnapshots = new Map<string, FluencySnapshotRecord>();

  reset() {
    this.orgs.clear();
    this.teams.clear();
    this.roles.clear();
    this.employees.clear();
    this.enablementEvents.clear();
    this.enablementRollups.clear();
    this.toolInventory.clear();
    this.usageShapes.clear();
    this.spreadRollups.clear();
    this.groups.clear();
    this.metrics.clear();
    this.controls.clear();
    this.enablement.clear();
    this.fluencyMeta.clear();
    this.fluencyDimensions.clear();
    this.fluencySnapshots.clear();
  }
}

export const store = new MemoryStore();

export const upsertGroup = (orgId: string, group: GroupUpsert): { inserted: boolean } => {
  const key = `${orgId}:${group.group_key}`;
  const existing = store.groups.get(key);
  const record: GroupRecord = {
    orgId,
    groupKey: group.group_key,
    name: group.name ?? existing?.name,
    groupType: group.group_type ?? existing?.groupType,
    vendor: group.vendor ?? existing?.vendor
  };
  store.groups.set(key, record);
  return { inserted: !existing };
};

export const upsertMetric = (record: MetricRecord): { inserted: boolean } => {
  const key = `${record.orgId}:${record.group_key}:${record.bucket_start}:${record.metric_name}:${record.vendor ?? ""}`;
  const existing = store.metrics.get(key);
  store.metrics.set(key, record);
  return { inserted: !existing };
};

export const upsertControl = (record: PolicyControlRecord): { inserted: boolean } => {
  const key = `${record.orgId}:${record.group_key}:${record.bucket_start}:${record.control_name}:${record.vendor ?? ""}`;
  const existing = store.controls.get(key);
  store.controls.set(key, record);
  return { inserted: !existing };
};

export const upsertEnablement = (record: TrainingEventRecord): { inserted: boolean } => {
  const key = `${record.orgId}:${record.group_key}:${record.bucket_start}:${record.event_type}:${record.vendor ?? ""}`;
  const existing = store.enablement.get(key);
  store.enablement.set(key, record);
  return { inserted: !existing };
};
