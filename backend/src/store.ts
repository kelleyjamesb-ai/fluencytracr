import {
  GroupUpsert,
  MetricObservation,
  PolicyControlObservation,
  TrainingEventRollup,
  BehavioralSignalAggregate,
  FluencyEvent,
  FluencyPattern,
  DecisionLedgerEntry,
  DecisionLedgerEvaluationInput
} from "@learnaire/shared";
import type { InferenceAuditRecord, PatternInferenceRecord } from "./inference/types";

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
  functionId?: string;  // Links team to a business function for rollup grouping
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

export type CanonicalControlState = "enabled" | "disabled" | "partial" | "unknown";

export type PolicyDocumentRecord = {
  policyId: string;
  orgId: string;
  fileName: string;
  contentType: string;
  rawText: string;
  sourceFormat: "text" | "json" | "base64";
  clauseCount: number;
  createdAt: string;
};

export type PolicyControlMappingRecord = {
  control_name: string;
  status: CanonicalControlState;
  confidence: number;
  matched_clause_ids: string[];
  rationale: string;
};

export type PolicyUnresolvedClauseRecord = {
  clause_id: string;
  text: string;
  reason: string;
};

export type PolicyMappingRecord = {
  mappingId: string;
  policyId: string;
  orgId: string;
  controls: PolicyControlMappingRecord[];
  unresolvedClauses: PolicyUnresolvedClauseRecord[];
  generatedAt: string;
};

export type CanonicalControlSnapshotRecord = {
  orgId: string;
  control_name: string;
  status: CanonicalControlState;
  source: "legacy_import" | "policy_mapping";
  bucket_start: string;
  bucket_end: string;
  updatedAt: string;
};

export type ComplianceEventRecord = {
  eventId: string;
  orgId: string;
  eventType: "policy_uploaded" | "policy_mapped" | "control_state_updated" | "compliance_status_refreshed";
  policyId?: string;
  controlName?: string;
  status?: CanonicalControlState;
  createdAt: string;
  metadata: Record<string, unknown>;
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

export type BehavioralSignalRecord = BehavioralSignalAggregate & {
  originalCount?: number;  // Store original count before suppression for rollups
  includesRollup?: boolean;  // Indicates this record includes rolled-up small teams
};

export type FunctionRecord = {
  id: string;
  orgId: string;
  name: string;
};

export type FluencyEventRecord = FluencyEvent & {
  event_id: string;
};

export type FluencyPatternRecord = FluencyPattern;

export type DecisionLedgerEntryRecord = DecisionLedgerEntry;

export type DecisionLedgerEvaluationRecord = {
  evaluation_id: string;
  ledger_id: string;
  evaluation: DecisionLedgerEvaluationInput["evaluation"];
  meta: {
    coverage_at_evaluation: number;
    created_at: string;
    locked_at: string;
  };
};

export type AuditLogRecord = {
  id: string;
  orgId: string;
  action: "dashboard_access" | "dashboard_export";
  actorRole: string;
  metadata: Record<string, unknown>;
  timestamp: string;
};

export type ConnectorEventQuarantineRecord = {
  vendor: string;
  connector_name: string;
  org_id: string;
  group_id: string;
  bucket_start: string;
  unknown_event_types: string[];
  invalid_event_types?: string[];
  invalid_event_count?: number;
  invalid_sample_events?: Array<{ event_type: string; timestamp: string; reason: string }>;
  sample_events: Array<{ event_type: string; timestamp: string }>;
  received_at: string;
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
  policyDocuments = new Map<string, PolicyDocumentRecord>();
  policyMappings = new Map<string, PolicyMappingRecord>();
  canonicalControlSnapshots = new Map<string, CanonicalControlSnapshotRecord>();
  complianceEvents = new Map<string, ComplianceEventRecord>();
  enablement = new Map<string, TrainingEventRecord>();
  fluencyMeta = new Map<string, FluencyMetaRecord>();
  fluencyDimensions = new Map<string, FluencyDimensionRecord>();
  fluencySnapshots = new Map<string, FluencySnapshotRecord>();
  functions = new Map<string, FunctionRecord>();
  behavioralSignals = new Map<string, BehavioralSignalRecord>();
  fluencyEvents = new Map<string, FluencyEventRecord>();
  fluencyPatterns = new Map<string, FluencyPatternRecord>();
  patternInferenceRecords: PatternInferenceRecord[] = [];
  inferenceAuditLogs: InferenceAuditRecord[] = [];
  decisionLedgerEntries = new Map<string, DecisionLedgerEntryRecord>();
  decisionLedgerEvaluations = new Map<string, DecisionLedgerEvaluationRecord>();
  auditLogs = new Map<string, AuditLogRecord>();
  connectorEventQuarantine = new Map<string, ConnectorEventQuarantineRecord>();

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
    this.policyDocuments.clear();
    this.policyMappings.clear();
    this.canonicalControlSnapshots.clear();
    this.complianceEvents.clear();
    this.enablement.clear();
    this.fluencyMeta.clear();
    this.fluencyDimensions.clear();
    this.fluencySnapshots.clear();
    this.functions.clear();
    this.behavioralSignals.clear();
    this.fluencyEvents.clear();
    this.fluencyPatterns.clear();
    this.patternInferenceRecords = [];
    this.inferenceAuditLogs = [];
    this.decisionLedgerEntries.clear();
    this.decisionLedgerEvaluations.clear();
    this.auditLogs.clear();
    this.connectorEventQuarantine.clear();
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

export const insertFluencyEvent = (event: FluencyEventRecord) => {
  store.fluencyEvents.set(event.event_id, event);
};

export const upsertFluencyPattern = (key: string, pattern: FluencyPatternRecord) => {
  store.fluencyPatterns.set(key, pattern);
};

export const insertDecisionLedgerEntry = (entry: DecisionLedgerEntryRecord) => {
  store.decisionLedgerEntries.set(entry.ledger_id, entry);
};

export const insertDecisionLedgerEvaluation = (evaluation: DecisionLedgerEvaluationRecord) => {
  store.decisionLedgerEvaluations.set(evaluation.evaluation_id, evaluation);
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

export const upsertCanonicalControl = (record: CanonicalControlSnapshotRecord): { inserted: boolean } => {
  const key = `${record.orgId}:${record.control_name}:${record.bucket_start}`;
  const existing = store.canonicalControlSnapshots.get(key);
  store.canonicalControlSnapshots.set(key, record);
  return { inserted: !existing };
};

export const insertComplianceEvent = (record: ComplianceEventRecord) => {
  store.complianceEvents.set(record.eventId, record);
};

export const upsertEnablement = (record: TrainingEventRecord): { inserted: boolean } => {
  const key = `${record.orgId}:${record.group_key}:${record.bucket_start}:${record.event_type}:${record.vendor ?? ""}`;
  const existing = store.enablement.get(key);
  store.enablement.set(key, record);
  return { inserted: !existing };
};

export const upsertBehavioralSignal = (record: BehavioralSignalRecord): { inserted: boolean } => {
  const key = `${record.org_id}:${record.group_id}:${record.bucket_start}:${record.signal_name}:${record.tool_class ?? ""}`;
  const existing = store.behavioralSignals.get(key);
  store.behavioralSignals.set(key, record);
  return { inserted: !existing };
};

export const upsertFunction = (orgId: string, id: string, name: string): { inserted: boolean } => {
  const existing = store.functions.get(id);
  store.functions.set(id, { id, orgId, name });
  return { inserted: !existing };
};
