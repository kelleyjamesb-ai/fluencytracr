import {
  GroupUpsert,
  MetricObservation,
  PolicyControlObservation,
  TrainingEventRollup,
  ConnectorSignalAggregate,
  FluencyEvent,
  FluencyPattern,
  DecisionLedgerEntry,
  DecisionLedgerEvaluationInput,
  UnifiedTelemetryEvent,
  OutcomeEvidenceRecord,
  resolveFluencyExecutionId} from "@learnaire/shared";
import type { InferenceAuditRecord, PatternInferenceRecord } from "./inference/types";

export type AiValueObjectStoredRecord = {
  org_id: string;
  object_type: string;
  object_id: string;
  schema_version: string;
  workflow_family: string | null;
  payload: Record<string, unknown>;
  validation: Record<string, unknown>;
  valid: boolean;
  created_at: string;
  updated_at: string;
};

export type AiValueHypothesisStoredRecord = {
  id: string;
  org_id: string;
  value_hypothesis_id: string;
  schema_version: string;
  derivation_version: string;
  workflow_family: string;
  function_area: string | null;
  value_route: string;
  hypothesis_statement: string;
  business_objective: string;
  status: string;
  payload: Record<string, unknown>;
  validation: Record<string, unknown>;
  source_refs: Record<string, unknown>;
  version: number;
  supersedes_id: string | null;
  created_at: string;
  created_by_role: string;
};

export type AiValueMeasurementPlanStoredRecord = {
  id: string;
  org_id: string;
  measurement_plan_id: string;
  value_hypothesis_id: string;
  schema_version: string;
  derivation_version: string;
  workflow_family: string;
  approved_aggregate_grain: string;
  minimum_cohort_threshold: number;
  baseline_window_start: string;
  baseline_window_end: string;
  comparison_window_start: string | null;
  comparison_window_end: string | null;
  coverage_goal: string;
  readiness_state: string;
  payload: Record<string, unknown>;
  validation: Record<string, unknown>;
  source_package_requirements: Record<string, unknown>;
  assumptions: Record<string, unknown>;
  source_refs: Record<string, unknown>;
  version: number;
  supersedes_id: string | null;
  created_at: string;
  created_by_role: string;
};

export type AiValueSourcePackageRefStoredRecord = {
  id: string;
  org_id: string;
  source_package_id: string;
  source_package_type: string;
  schema_version: string;
  derivation_version: string;
  measurement_plan_id: string | null;
  workflow_family: string | null;
  generated_at: string;
  covered_window_start: string;
  covered_window_end: string;
  approved_aggregate_grain: string;
  minimum_cohort_threshold: number;
  evidence_state: string;
  k_min_posture: Record<string, unknown>;
  privacy_boundary: Record<string, unknown>;
  source_refs: Record<string, unknown>;
  validation: Record<string, unknown>;
  caveats: string[];
  version: number;
  supersedes_id: string | null;
  created_at: string;
  created_by_role: string;
};

export type AiValueEvidenceSnapshotStoredRecord = {
  id: string;
  org_id: string;
  evidence_snapshot_id: string;
  measurement_plan_id: string;
  schema_version: string;
  derivation_version: string;
  workflow_family: string;
  snapshot_type: string;
  coverage_status: string;
  window_start: string;
  window_end: string;
  suppression_default_verdict: string;
  privacy_aggregate_only: boolean;
  k_min_threshold_met: boolean;
  payload: Record<string, unknown>;
  validation: Record<string, unknown>;
  source_refs: Record<string, unknown>;
  required_caveats: string[];
  blocked_uses: string[];
  version: number;
  supersedes_id: string | null;
  generated_at: string;
  created_at: string;
  created_by_role: string;
};

export type OrgRecord = {
  id: string;
  name: string;
  minGroupSize: number;
  createdAt: string;
  complianceMode?: "shadow" | "enforced";
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
  decision?: "map" | "ignore" | "defer";
  decision_rationale?: string;
  mapped_control_name?: string;
  mapped_status?: CanonicalControlState;
  decided_at?: string;
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
  eventType:
    | "policy_uploaded"
    | "policy_mapped"
    | "control_state_updated"
    | "compliance_status_refreshed"
    | "unresolved_clause_decided"
    | "compliance_mode_updated";
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

/** Deprecated legacy score dimension record. Retained only for quarantined compatibility storage. */
export type FluencyDimensionRecord = {
  orgId: string;
  bucketStart: string;
  dimension: "coverage" | "depth" | "judgment" | "velocity";
  score: number;
};

/** Deprecated legacy score snapshot record. Retained only for quarantined compatibility storage. */
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

export type BehavioralSignalRecord = ConnectorSignalAggregate & {
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
  /** Normalized execution boundary (PRD Phase 1). */
  execution_id: string;
};

export type VelocityEventName =
  | "USER_FREQUENCY_OBSERVED"
  | "USER_ENGAGEMENT_OBSERVED"
  | "USER_BREADTH_OBSERVED";

export type VelocityDistributionRecord = {
  org_id: string;
  schema_version: "FT_V2_2026_05";
  event_name: VelocityEventName;
  workflow_id: string;
  jbtd_id: string | null;
  persona_id: string | null;
  window_start: string;
  window_end: string;
  cohort_size: number;
  ambiguity_rate?: number;
  distribution: {
    p10: number;
    p50: number;
    p90: number;
    p99: number;
  };
  calibration_reference: string;
  privacy: {
    person_level_fields_included: false;
  };
  ingested_at: string;
};

export type FluencyTracrVerdictRecord = {
  id: string;
  org_id: string;
  cohort_id: string;
  workflow_id: string;
  jbtd_id: string | null;
  persona_id: string | null;
  slice_key: string;
  window_start: string;
  window_end: string;
  calibration_id: string;
  verdict: "SURFACE" | "SUPPRESS";
  suppression_reason: string | null;
  cohort_size: number;
  evidence_grade: string;
  velocity_index: number | null;
  quality_multiplier: number | null;
  payload_json: Record<string, unknown>;
  computed_at: string;
  created_at: string;
};

export const buildFluencyEventRecord = (event: FluencyEvent, eventId: string): FluencyEventRecord => ({
  ...event,
  event_id: eventId,
  execution_id: resolveFluencyExecutionId(event.workflow_id, {
    run_id: event.run_id,
    workflow_run_id: event.workflow_run_id,
    event_id: eventId
  })
});

export type UnifiedTelemetryEventRecord = UnifiedTelemetryEvent;
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

export type SuppressionAuditLogRecord = {
  id: string;
  orgId: string;
  workflowId: string;
  executionId: string;
  suppressionReason: string;
  diagnostics: Record<string, unknown>;
  decidedAt: string;
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

export type OutcomeEvidenceStoredRecord = OutcomeEvidenceRecord;

export type IngestReceiptRecord = {
  idempotencyKey: string;
  payloadHash: string;
  response: {
    receipt_id: string;
    accepted_count: number;
    rejected_count: number;
    rejections: Array<{
      index: number;
      reason_code: string;
      field_path: string;
    }>;
  };
  createdAt: string;
};

export type WorkflowRiskClass = "low" | "medium" | "high";

export type WorkflowRegistryRecord = {
  id: string;
  orgId: string;
  workflowId: string;
  displayName: string;
  version: number;
  riskClass: WorkflowRiskClass;
  changeReason?: string;
  changedByUser: string;
  changedByRole: string;
  createdAt: string;
};

export type WorkflowRegistryAuditRecord = {
  id: string;
  orgId: string;
  workflowId: string;
  version: number;
  action: "REGISTERED" | "BASELINE_RESET";
  actorSub?: string;
  actorRole?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type WorkflowVisibilityPolicyConfigRecord = {
  id: string;
  orgId: string;
  versionName: string;
  changeReason: string;
  changedByUser: string;
  changedByRole: string;
  windowDaysLow: number;
  windowDaysMedium: number;
  windowDaysHigh: number;
  minEventsLow: number;
  minEventsMedium: number;
  minEventsHigh: number;
  requireVerificationHigh: boolean;
  createdAt: string;
};

export type WorkflowRegistryCurrentRecord = {
  id: string;
  orgId: string;
  workflowId: string;
  displayName: string;
  riskClass: WorkflowRiskClass;
  effectiveVersionId: string;
  updatedAt: string;
};

export type BaselineResetEventRecord = {
  id: string;
  orgId: string;
  controlConfigVersionId: string;
  resetAt: string;
  reason: string;
  triggeredByUser: string;
  triggeredByRole: string;
};

export type DerivedWorkflowPolicyConfigRecord = {
  id: string;
  orgId: string;
  workflowId: string;
  registryVersion: number;
  policyVersion: string;
  lowMinEvents: number;
  mediumMinEvents: number;
  highMinEvents: number;
  minWindowDays: number;
  highSparseMinEvents: number;
  highSparseMinWindowDays: number;
  createdAt: string;
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
  unifiedTelemetryEvents = new Map<string, UnifiedTelemetryEventRecord>();  fluencyPatterns = new Map<string, FluencyPatternRecord>();
  patternInferenceRecords: PatternInferenceRecord[] = [];
  inferenceAuditLogs: InferenceAuditRecord[] = [];
  decisionLedgerEntries = new Map<string, DecisionLedgerEntryRecord>();
  decisionLedgerEvaluations = new Map<string, DecisionLedgerEvaluationRecord>();
  auditLogs = new Map<string, AuditLogRecord>();
  suppressionAuditLogs = new Map<string, SuppressionAuditLogRecord>();
  connectorEventQuarantine = new Map<string, ConnectorEventQuarantineRecord>();
  outcomeEvidence = new Map<string, OutcomeEvidenceStoredRecord>();
  velocityDistributions = new Map<string, VelocityDistributionRecord>();
  fluencyTracrVerdicts = new Map<string, FluencyTracrVerdictRecord>();
  ingestReceipts = new Map<string, IngestReceiptRecord>();
  workflowRegistry = new Map<string, WorkflowRegistryRecord>();
  workflowRegistryCurrent = new Map<string, WorkflowRegistryCurrentRecord>();
  workflowRegistryAudit = new Map<string, WorkflowRegistryAuditRecord>();
  aiValueObjects = new Map<string, AiValueObjectStoredRecord>();
  aiValueHypotheses = new Map<string, AiValueHypothesisStoredRecord>();
  aiValueMeasurementPlans = new Map<string, AiValueMeasurementPlanStoredRecord>();
  aiValueSourcePackageRefs = new Map<string, AiValueSourcePackageRefStoredRecord>();
  aiValueEvidenceSnapshots = new Map<string, AiValueEvidenceSnapshotStoredRecord>();
  workflowVisibilityPolicyConfigs = new Map<string, WorkflowVisibilityPolicyConfigRecord>();
  baselineResetEvents = new Map<string, BaselineResetEventRecord>();

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
    this.unifiedTelemetryEvents.clear();    this.fluencyPatterns.clear();
    this.patternInferenceRecords = [];
    this.inferenceAuditLogs = [];
    this.decisionLedgerEntries.clear();
    this.decisionLedgerEvaluations.clear();
    this.auditLogs.clear();
    this.suppressionAuditLogs.clear();
    this.connectorEventQuarantine.clear();
    this.outcomeEvidence.clear();
    this.velocityDistributions.clear();
    this.fluencyTracrVerdicts.clear();
    this.ingestReceipts.clear();
    this.workflowRegistry.clear();
    this.workflowRegistryCurrent.clear();
    this.workflowRegistryAudit.clear();
    this.aiValueObjects.clear();
    this.aiValueHypotheses.clear();
    this.aiValueMeasurementPlans.clear();
    this.aiValueSourcePackageRefs.clear();
    this.aiValueEvidenceSnapshots.clear();
    this.workflowVisibilityPolicyConfigs.clear();
    this.baselineResetEvents.clear();
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

export const insertUnifiedTelemetryEvent = (event: UnifiedTelemetryEventRecord) => {
  store.unifiedTelemetryEvents.set(event.event_id, event);
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

export const insertWorkflowRegistryEntry = (record: WorkflowRegistryRecord) => {
  store.workflowRegistry.set(record.id, record);
};

export const upsertWorkflowRegistryCurrent = (record: WorkflowRegistryCurrentRecord) => {
  const key = `${record.orgId}:${record.workflowId}`;
  store.workflowRegistryCurrent.set(key, record);
};

export const insertWorkflowRegistryAudit = (record: WorkflowRegistryAuditRecord) => {
  store.workflowRegistryAudit.set(record.id, record);
};

export const insertWorkflowVisibilityPolicyConfig = (record: WorkflowVisibilityPolicyConfigRecord) => {
  store.workflowVisibilityPolicyConfigs.set(record.id, record);
};

export const insertBaselineResetEvent = (record: BaselineResetEventRecord) => {
  store.baselineResetEvents.set(record.id, record);
};
