import { randomUUID } from "node:crypto";

import { aiValueEngine } from "@learnaire/shared";
import type { Prisma } from "@prisma/client";

import { getPrisma } from "../db";
import {
  store,
  type AiValueEvidenceSnapshotStoredRecord,
  type AiValueHypothesisStoredRecord,
  type AiValueMeasurementPlanStoredRecord,
  type AiValueSourcePackageRefStoredRecord
} from "../store";

const usePrisma = () => Boolean(process.env.DATABASE_URL);

export class AiValuePersistenceValidationError extends Error {
  gaps: string[];

  constructor(message: string, gaps: string[]) {
    super(message);
    this.name = "AiValuePersistenceValidationError";
    this.gaps = gaps;
  }
}

export class AiValuePersistenceAlreadyExistsError extends Error {
  constructor(message = "AI Value persistence record already exists") {
    super(message);
    this.name = "AiValuePersistenceAlreadyExistsError";
  }
}

const FORBIDDEN_PERSISTENCE_KEY_PATTERNS = [
  /(^|_)user_id($|_)/i,
  /(^|_)user_email($|_)/i,
  /employee_(?:id|email|name|record|identifier)/i,
  /person_(?:id|identifier|level|record|analytics)/i,
  /hashed_(?:user|person|employee)_id/i,
  /pseudonymous_(?:user|person|employee)_identifier/i,
  /tokenized_(?:user|person|employee)_identifier/i,
  /joinable_(?:user|person|employee)_identifier/i,
  /direct_identifier/i,
  /raw_(?:rows?|prompt|response|transcript|content)/i,
  /^prompts?$/i,
  /^responses?$/i,
  /transcript/i,
  /query_text/i,
  /sql_text/i,
  /file_contents?/i,
  /person_level_hris/i,
  /person_level_productivity/i,
  /manager_(?:id|ranking|view|chain)/i,
  /team_ranking/i,
  /manager_or_team_ranking/i,
  /people_decisioning/i,
  /compensation/i,
  /performance_rating/i,
  /promotion/i,
  /discipline/i,
  /attrition_prediction/i,
  /hris_inference/i,
  /customer_facing_financial_output/i
];

const FORBIDDEN_PERSISTENCE_STRING_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /(^|[^a-z0-9])(?:user|person|employee)[-_:](?:id[-_:])?[0-9][a-z0-9_-]*/i,
  /(?:hashed|joinable|pseudonymous|tokenized)[-_](?:user|person|employee)[-_](?:id|identifier)/i,
  /raw[-_](?:rows?|prompt|response|transcript|content)(?:$|[-_])/i,
  /\bselect\s+.+\bfrom\b/i,
  /(?:query_text|sql_text|file_contents?)/i,
  /person_level_(?:hris|productivity|analytics|record)/i
];

const ALLOWED_SOURCE_REF_KEYS = new Set([
  "aggregate_export_id",
  "aggregate_outcome_export_id",
  "aggregate_probe_id",
  "aggregate_workforce_context_export_id",
  "aggregate_workforce_context_export_ids",
  "assumption_approval_export_id",
  "assumption_approval_export_ids",
  "bigquery_probe_result_id",
  "fluency_baseline_ids",
  "governance_control_export_id",
  "governance_control_export_ids",
  "measurement_plan_id",
  "notes",
  "outcome_evidence_ids",
  "real_source_manifest_ids",
  "source_package_ids",
  "source_readiness_id",
  "source_readiness_ids",
  "v3_verdict_ids",
  "value_hypothesis_id",
  "velocity_observation_ids"
]);

export interface PersistAiValueHypothesisInput {
  measurementPlan: Record<string, unknown>;
  version: number;
  createdByRole: string;
  sourceRefs?: Record<string, unknown>;
  supersedesId?: string | null;
  status?: string;
}

export interface PersistAiValueMeasurementPlanInput {
  measurementPlan: Record<string, unknown>;
  version: number;
  valueHypothesisId: string;
  createdByRole: string;
  sourceRefs?: Record<string, unknown>;
  supersedesId?: string | null;
}

export interface PersistAiValueSourcePackageRefInput {
  sourcePackage: Record<string, unknown>;
  version: number;
  measurementPlanId?: string | null;
  workflowFamily?: string | null;
  createdByRole: string;
  supersedesId?: string | null;
}

export interface PersistAiValueEvidenceSnapshotInput {
  evidenceSnapshot: Record<string, unknown>;
  version: number;
  createdByRole: string;
  supersedesId?: string | null;
}

export interface LoadAiValueMeasurementPlanInput {
  orgId: string;
  measurementPlanId: string;
  version?: number;
}

export interface ListAiValueSourcePackageRefsInput {
  orgId: string;
  measurementPlanId: string;
  latestOnly?: boolean;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown): string => (typeof value === "string" ? value : "");

const asOptionalString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];

const kMinThresholdMetForSnapshot = (snapshot: Record<string, unknown>): boolean => {
  const telemetrySummary = asRecord(snapshot.aggregate_telemetry_summary);
  const kMinSummary = asRecord(telemetrySummary.k_min_summary);
  if (kMinSummary.suppressed_or_unknown_slices !== undefined) {
    return (
      Number(kMinSummary.k_min_clear_slices) > 0 &&
      Number(kMinSummary.suppressed_or_unknown_slices) === 0
    );
  }

  const workforceContext = asRecord(snapshot.aggregate_workforce_context);
  if (workforceContext.cohort_threshold_met !== undefined) {
    return workforceContext.cohort_threshold_met === true;
  }

  return false;
};

const parseDate = (value: unknown, label: string): Date => {
  const parsed = new Date(asString(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new AiValuePersistenceValidationError("invalid persistence timestamp", [
      `${label} must be a valid timestamp`
    ]);
  }
  return parsed;
};

const ensureVersion = (version: number) => {
  if (!Number.isInteger(version) || version < 1) {
    throw new AiValuePersistenceValidationError("invalid persistence version", [
      "version must be a positive integer"
    ]);
  }
};

const requireValid = (
  validation: { valid: boolean; gaps?: string[] },
  objectLabel: string
) => {
  if (!validation.valid) {
    throw new AiValuePersistenceValidationError(
      `${objectLabel} failed validation before persistence`,
      validation.gaps ?? [`${objectLabel} validation failed`]
    );
  }
};

const scanForbiddenPersistenceKeys = (
  value: unknown,
  path: string,
  gaps: string[]
) => {
  if (typeof value === "string") {
    const posturePath =
      /(^|\.)(blocked_uses|blocked_claims|blocked_dimensions|blocked_interpretation|required_controls|coverage_signals|covered_signals)(\.|\[|$)/.test(
        path
      ) || /(^|\.)(required_signals|expected_signals|missing_signals|present_signals)(\.|\[|$)/.test(path);
    if (
      !posturePath &&
      FORBIDDEN_PERSISTENCE_STRING_PATTERNS.some((pattern) => pattern.test(value))
    ) {
      gaps.push(`forbidden persistence value at ${path || "<root>"} is not allowed`);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      scanForbiddenPersistenceKeys(entry, `${path}[${index}]`, gaps)
    );
    return;
  }

  if (!value || typeof value !== "object") return;

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const nestedPath = path ? `${path}.${key}` : key;
    const safeFalsePrivacyFlag = key.startsWith("contains_") && nested === false;
    if (
      !safeFalsePrivacyFlag &&
      FORBIDDEN_PERSISTENCE_KEY_PATTERNS.some((pattern) => pattern.test(key))
    ) {
      gaps.push(`forbidden persistence field ${nestedPath} is not allowed`);
    }
    scanForbiddenPersistenceKeys(nested, nestedPath, gaps);
  }
};

const enforcePersistenceDenylist = (value: unknown, objectLabel: string) => {
  const gaps: string[] = [];
  scanForbiddenPersistenceKeys(value, "", gaps);
  if (gaps.length > 0) {
    throw new AiValuePersistenceValidationError(
      `${objectLabel} contains fields that cannot be persisted`,
      gaps
    );
  }
};

const enforceSafeMetadata = (value: Record<string, unknown>, objectLabel: string) => {
  enforcePersistenceDenylist(value, objectLabel);
};

const enforceSourceRefs = (value: Record<string, unknown>, objectLabel: string) => {
  const gaps = Object.keys(value)
    .filter((key) => !ALLOWED_SOURCE_REF_KEYS.has(key))
    .map((key) => `source ref field ${key} is not allowed`);
  if (gaps.length > 0) {
    throw new AiValuePersistenceValidationError(
      `${objectLabel} contains unsupported source refs`,
      gaps
    );
  }
  enforcePersistenceDenylist(value, objectLabel);
};

const measurementPlanKey = (orgId: string, measurementPlanId: string, version: number) =>
  `${orgId}:${measurementPlanId}:${version}`;

const hypothesisKey = (orgId: string, hypothesisId: string, version: number) =>
  `${orgId}:${hypothesisId}:${version}`;

const sourcePackageRefKey = (orgId: string, sourcePackageId: string, version: number) =>
  `${orgId}:${sourcePackageId}:${version}`;

const evidenceSnapshotKey = (orgId: string, evidenceSnapshotId: string, version: number) =>
  `${orgId}:${evidenceSnapshotId}:${version}`;

const latestByVersion = <T extends { version: number }>(records: T[]): T | null =>
  records.sort((a, b) => b.version - a.version)[0] ?? null;

const rejectDuplicate = (exists: boolean) => {
  if (exists) {
    throw new AiValuePersistenceAlreadyExistsError();
  }
};

const translatePrismaDuplicate = (error: any): never => {
  if (error?.code === "P2002") {
    throw new AiValuePersistenceAlreadyExistsError();
  }
  throw error;
};

export async function loadAiValueMeasurementPlan(
  input: LoadAiValueMeasurementPlanInput
): Promise<AiValueMeasurementPlanStoredRecord | null> {
  if (!usePrisma()) {
    const records = Array.from(store.aiValueMeasurementPlans.values()).filter(
      (record) =>
        record.org_id === input.orgId &&
        record.measurement_plan_id === input.measurementPlanId &&
        (input.version === undefined || record.version === input.version)
    );
    return latestByVersion(records);
  }

  const row = await getPrisma().measurementPlan.findFirst({
    where: {
      orgId: input.orgId,
      measurementPlanId: input.measurementPlanId,
      ...(input.version === undefined ? {} : { version: input.version })
    },
    orderBy: { version: "desc" }
  });
  return row ? measurementPlanRowToRecord(row) : null;
}

export async function listAiValueSourcePackageRefs(
  input: ListAiValueSourcePackageRefsInput
): Promise<AiValueSourcePackageRefStoredRecord[]> {
  const latestOnly = input.latestOnly !== false;
  if (!usePrisma()) {
    const records = Array.from(store.aiValueSourcePackageRefs.values())
      .filter(
        (record) =>
          record.org_id === input.orgId &&
          record.measurement_plan_id === input.measurementPlanId
      )
      .sort((a, b) =>
        a.source_package_id.localeCompare(b.source_package_id) ||
        b.version - a.version
      );
    if (!latestOnly) return records;
    const latest = new Map<string, AiValueSourcePackageRefStoredRecord>();
    for (const record of records) {
      if (!latest.has(record.source_package_id)) {
        latest.set(record.source_package_id, record);
      }
    }
    return [...latest.values()];
  }

  const rows = await getPrisma().sourcePackageRef.findMany({
    where: {
      orgId: input.orgId,
      measurementPlanId: input.measurementPlanId
    },
    orderBy: [
      { sourcePackageId: "asc" },
      { version: "desc" }
    ]
  });
  const records = rows.map(sourcePackageRefRowToRecord);
  if (!latestOnly) return records;
  const latest = new Map<string, AiValueSourcePackageRefStoredRecord>();
  for (const record of records) {
    if (!latest.has(record.source_package_id)) {
      latest.set(record.source_package_id, record);
    }
  }
  return [...latest.values()];
}

export async function persistAiValueHypothesisFromMeasurementPlan(
  input: PersistAiValueHypothesisInput
): Promise<AiValueHypothesisStoredRecord> {
  ensureVersion(input.version);
  enforceSafeMetadata(
    {
      createdByRole: input.createdByRole,
      supersedesId: input.supersedesId ?? null,
      status: input.status ?? null
    },
    "Value Hypothesis metadata"
  );
  enforceSourceRefs(input.sourceRefs ?? {}, "Value Hypothesis source refs");
  enforcePersistenceDenylist(input.measurementPlan, "Measurement Plan");
  const validation = aiValueEngine.validateMeasurementPlan(input.measurementPlan);
  requireValid(validation, "Measurement Plan");

  const plan = input.measurementPlan;
  const valueHypothesis = asRecord(plan.value_hypothesis);
  const workflowScope = asRecord(plan.workflow_scope);
  const orgId = asString(plan.org_id);
  const valueHypothesisId = asString(valueHypothesis.value_hypothesis_id);
  const key = hypothesisKey(orgId, valueHypothesisId, input.version);
  rejectDuplicate(store.aiValueHypotheses.has(key));

  const record: AiValueHypothesisStoredRecord = {
    id: randomUUID(),
    org_id: orgId,
    value_hypothesis_id: valueHypothesisId,
    schema_version: asString(plan.schema_version),
    derivation_version: asString(plan.derivation_version),
    workflow_family: asString(workflowScope.workflow_family),
    function_area: asOptionalString(workflowScope.function_area),
    value_route: asString(valueHypothesis.value_route),
    hypothesis_statement: asString(valueHypothesis.hypothesis_statement),
    business_objective: asString(valueHypothesis.business_objective),
    status: input.status ?? "active",
    payload: valueHypothesis,
    validation: validation as unknown as Record<string, unknown>,
    source_refs: input.sourceRefs ?? {},
    version: input.version,
    supersedes_id: input.supersedesId ?? null,
    created_at: new Date().toISOString(),
    created_by_role: input.createdByRole
  };

  if (!usePrisma()) {
    store.aiValueHypotheses.set(key, record);
    return record;
  }

  try {
    const created = await getPrisma().valueHypothesis.create({
      data: {
        id: record.id,
        orgId: record.org_id,
        valueHypothesisId: record.value_hypothesis_id,
        schemaVersion: record.schema_version,
        derivationVersion: record.derivation_version,
        workflowFamily: record.workflow_family,
        functionArea: record.function_area,
        valueRoute: record.value_route,
        hypothesisStatement: record.hypothesis_statement,
        businessObjective: record.business_objective,
        status: record.status,
        payloadJson: record.payload as Prisma.InputJsonValue,
        validationJson: record.validation as Prisma.InputJsonValue,
        sourceRefsJson: record.source_refs as Prisma.InputJsonValue,
        version: record.version,
        supersedesId: record.supersedes_id,
        createdAt: new Date(record.created_at),
        createdByRole: record.created_by_role
      }
    });
    const createdRecord = valueHypothesisRowToRecord(created);
    store.aiValueHypotheses.set(key, createdRecord);
    return createdRecord;
  } catch (error: any) {
    return translatePrismaDuplicate(error);
  }
}

export async function persistAiValueMeasurementPlan(
  input: PersistAiValueMeasurementPlanInput
): Promise<AiValueMeasurementPlanStoredRecord> {
  ensureVersion(input.version);
  enforceSafeMetadata(
    {
      valueHypothesisId: input.valueHypothesisId,
      createdByRole: input.createdByRole,
      supersedesId: input.supersedesId ?? null
    },
    "Measurement Plan metadata"
  );
  enforceSourceRefs(input.sourceRefs ?? {}, "Measurement Plan source refs");
  enforcePersistenceDenylist(input.measurementPlan, "Measurement Plan");
  const validation = aiValueEngine.validateMeasurementPlan(input.measurementPlan);
  requireValid(validation, "Measurement Plan");

  const plan = input.measurementPlan;
  const workflowScope = asRecord(plan.workflow_scope);
  const windows = asRecord(plan.windows);
  const readiness = asRecord(plan.readiness);
  const orgId = asString(plan.org_id);
  const measurementPlanId = asString(plan.measurement_plan_id);
  const key = measurementPlanKey(orgId, measurementPlanId, input.version);
  rejectDuplicate(store.aiValueMeasurementPlans.has(key));

  const record: AiValueMeasurementPlanStoredRecord = {
    id: randomUUID(),
    org_id: orgId,
    measurement_plan_id: measurementPlanId,
    value_hypothesis_id: input.valueHypothesisId,
    schema_version: asString(plan.schema_version),
    derivation_version: asString(plan.derivation_version),
    workflow_family: asString(workflowScope.workflow_family),
    approved_aggregate_grain: asString(workflowScope.approved_aggregate_grain),
    minimum_cohort_threshold: Number(workflowScope.minimum_cohort_threshold),
    baseline_window_start: asString(windows.baseline_window_start),
    baseline_window_end: asString(windows.baseline_window_end),
    comparison_window_start: asOptionalString(windows.comparison_window_start),
    comparison_window_end: asOptionalString(windows.comparison_window_end),
    coverage_goal: asString(readiness.max_snapshot_type),
    readiness_state: asString(readiness.measurement_plan_readiness),
    payload: plan,
    validation: validation as unknown as Record<string, unknown>,
    source_package_requirements: asRecord(plan.source_package_requirements),
    assumptions: asRecord(plan.assumptions),
    source_refs: input.sourceRefs ?? {},
    version: input.version,
    supersedes_id: input.supersedesId ?? null,
    created_at: new Date().toISOString(),
    created_by_role: input.createdByRole
  };

  parseDate(record.baseline_window_start, "baseline_window_start");
  parseDate(record.baseline_window_end, "baseline_window_end");
  if (record.comparison_window_start) {
    parseDate(record.comparison_window_start, "comparison_window_start");
  }
  if (record.comparison_window_end) {
    parseDate(record.comparison_window_end, "comparison_window_end");
  }

  if (!usePrisma()) {
    store.aiValueMeasurementPlans.set(key, record);
    return record;
  }

  try {
    const created = await getPrisma().measurementPlan.create({
      data: {
        id: record.id,
        orgId: record.org_id,
        measurementPlanId: record.measurement_plan_id,
        valueHypothesisId: record.value_hypothesis_id,
        schemaVersion: record.schema_version,
        derivationVersion: record.derivation_version,
        workflowFamily: record.workflow_family,
        approvedAggregateGrain: record.approved_aggregate_grain,
        minimumCohortThreshold: record.minimum_cohort_threshold,
        baselineWindowStart: parseDate(record.baseline_window_start, "baseline_window_start"),
        baselineWindowEnd: parseDate(record.baseline_window_end, "baseline_window_end"),
        comparisonWindowStart: record.comparison_window_start
          ? parseDate(record.comparison_window_start, "comparison_window_start")
          : null,
        comparisonWindowEnd: record.comparison_window_end
          ? parseDate(record.comparison_window_end, "comparison_window_end")
          : null,
        coverageGoal: record.coverage_goal,
        readinessState: record.readiness_state,
        payloadJson: record.payload as Prisma.InputJsonValue,
        validationJson: record.validation as Prisma.InputJsonValue,
        sourcePackageRequirementsJson:
          record.source_package_requirements as Prisma.InputJsonValue,
        assumptionsJson: record.assumptions as Prisma.InputJsonValue,
        sourceRefsJson: record.source_refs as Prisma.InputJsonValue,
        version: record.version,
        supersedesId: record.supersedes_id,
        createdAt: new Date(record.created_at),
        createdByRole: record.created_by_role
      }
    });
    const createdRecord = measurementPlanRowToRecord(created);
    store.aiValueMeasurementPlans.set(key, createdRecord);
    return createdRecord;
  } catch (error: any) {
    return translatePrismaDuplicate(error);
  }
}

export async function persistAiValueSourcePackageRef(
  input: PersistAiValueSourcePackageRefInput
): Promise<AiValueSourcePackageRefStoredRecord> {
  ensureVersion(input.version);
  enforceSafeMetadata(
    {
      measurementPlanId: input.measurementPlanId ?? null,
      workflowFamily: input.workflowFamily ?? null,
      createdByRole: input.createdByRole,
      supersedesId: input.supersedesId ?? null
    },
    "Source Package Ref metadata"
  );
  enforcePersistenceDenylist(input.sourcePackage, "Source Package");
  const validation = aiValueEngine.validateSourcePackage(input.sourcePackage);
  requireValid(validation, "Source Package");

  const pkg = input.sourcePackage;
  const coveredWindow = asRecord(pkg.covered_window);
  const orgId = asString(pkg.org_id);
  const sourcePackageId = asString(pkg.source_package_id);
  const key = sourcePackageRefKey(orgId, sourcePackageId, input.version);
  rejectDuplicate(store.aiValueSourcePackageRefs.has(key));
  enforceSourceRefs(asRecord(pkg.source_refs), "Source Package source refs");

  const record: AiValueSourcePackageRefStoredRecord = {
    id: randomUUID(),
    org_id: orgId,
    source_package_id: sourcePackageId,
    source_package_type: asString(pkg.source_package_type),
    schema_version: asString(pkg.schema_version),
    derivation_version: asString(pkg.derivation_version),
    measurement_plan_id: input.measurementPlanId ?? null,
    workflow_family: input.workflowFamily ?? null,
    generated_at: asString(pkg.generated_at),
    covered_window_start: asString(coveredWindow.window_start),
    covered_window_end: asString(coveredWindow.window_end),
    approved_aggregate_grain: asString(pkg.approved_aggregate_grain),
    minimum_cohort_threshold: Number(pkg.minimum_cohort_threshold),
    evidence_state: asString(pkg.evidence_state),
    k_min_posture: asRecord(pkg.k_min_posture),
    privacy_boundary: asRecord(pkg.privacy_boundary),
    source_refs: asRecord(pkg.source_refs),
    validation: validation as unknown as Record<string, unknown>,
    caveats: asStringArray(pkg.caveats),
    version: input.version,
    supersedes_id: input.supersedesId ?? null,
    created_at: new Date().toISOString(),
    created_by_role: input.createdByRole
  };

  parseDate(record.generated_at, "generated_at");
  parseDate(record.covered_window_start, "covered_window_start");
  parseDate(record.covered_window_end, "covered_window_end");

  if (!usePrisma()) {
    store.aiValueSourcePackageRefs.set(key, record);
    return record;
  }

  try {
    const created = await getPrisma().sourcePackageRef.create({
      data: {
        id: record.id,
        orgId: record.org_id,
        sourcePackageId: record.source_package_id,
        sourcePackageType: record.source_package_type,
        schemaVersion: record.schema_version,
        derivationVersion: record.derivation_version,
        measurementPlanId: record.measurement_plan_id,
        workflowFamily: record.workflow_family,
        generatedAt: parseDate(record.generated_at, "generated_at"),
        coveredWindowStart: parseDate(record.covered_window_start, "covered_window_start"),
        coveredWindowEnd: parseDate(record.covered_window_end, "covered_window_end"),
        approvedAggregateGrain: record.approved_aggregate_grain,
        minimumCohortThreshold: record.minimum_cohort_threshold,
        evidenceState: record.evidence_state,
        kMinPostureJson: record.k_min_posture as Prisma.InputJsonValue,
        privacyBoundaryJson: record.privacy_boundary as Prisma.InputJsonValue,
        sourceRefsJson: record.source_refs as Prisma.InputJsonValue,
        validationJson: record.validation as Prisma.InputJsonValue,
        caveatsJson: record.caveats as Prisma.InputJsonValue,
        version: record.version,
        supersedesId: record.supersedes_id,
        createdAt: new Date(record.created_at),
        createdByRole: record.created_by_role
      }
    });
    const createdRecord = sourcePackageRefRowToRecord(created);
    store.aiValueSourcePackageRefs.set(key, createdRecord);
    return createdRecord;
  } catch (error: any) {
    return translatePrismaDuplicate(error);
  }
}

export async function persistAiValueEvidenceSnapshot(
  input: PersistAiValueEvidenceSnapshotInput
): Promise<AiValueEvidenceSnapshotStoredRecord> {
  ensureVersion(input.version);
  enforceSafeMetadata(
    {
      createdByRole: input.createdByRole,
      supersedesId: input.supersedesId ?? null
    },
    "Evidence Snapshot metadata"
  );
  enforcePersistenceDenylist(input.evidenceSnapshot, "Evidence Snapshot");
  const validation = aiValueEngine.validateEvidenceSnapshot(input.evidenceSnapshot);
  requireValid(validation, "Evidence Snapshot");

  const snapshot = input.evidenceSnapshot;
  const workflow = asRecord(snapshot.workflow);
  const window = asRecord(snapshot.window);
  const playbookCoverage = asRecord(snapshot.playbook_coverage);
  const suppression = asRecord(snapshot.suppression);
  const privacyBoundary = asRecord(snapshot.privacy_boundary);
  const orgId = asString(snapshot.org_id);
  const evidenceSnapshotId = asString(snapshot.evidence_snapshot_id);
  const key = evidenceSnapshotKey(orgId, evidenceSnapshotId, input.version);
  rejectDuplicate(store.aiValueEvidenceSnapshots.has(key));
  enforceSourceRefs(asRecord(snapshot.source_refs), "Evidence Snapshot source refs");

  const record: AiValueEvidenceSnapshotStoredRecord = {
    id: randomUUID(),
    org_id: orgId,
    evidence_snapshot_id: evidenceSnapshotId,
    measurement_plan_id: asString(snapshot.measurement_plan_id),
    schema_version: asString(snapshot.schema_version),
    derivation_version: asString(snapshot.derivation_version),
    workflow_family: asString(workflow.workflow_family),
    snapshot_type: asString(snapshot.snapshot_type),
    coverage_status: asString(playbookCoverage.coverage_status),
    window_start: asString(window.window_start),
    window_end: asString(window.window_end),
    suppression_default_verdict: asString(suppression.default_verdict),
    privacy_aggregate_only: privacyBoundary.aggregate_only === true,
    k_min_threshold_met: kMinThresholdMetForSnapshot(snapshot),
    payload: snapshot,
    validation: validation as unknown as Record<string, unknown>,
    source_refs: asRecord(snapshot.source_refs),
    required_caveats: asStringArray(snapshot.required_caveats),
    blocked_uses: asStringArray(snapshot.blocked_uses),
    version: input.version,
    supersedes_id: input.supersedesId ?? null,
    generated_at: asString(snapshot.generated_at),
    created_at: new Date().toISOString(),
    created_by_role: input.createdByRole
  };

  parseDate(record.window_start, "window_start");
  parseDate(record.window_end, "window_end");
  parseDate(record.generated_at, "generated_at");

  if (!usePrisma()) {
    store.aiValueEvidenceSnapshots.set(key, record);
    return record;
  }

  try {
    const created = await getPrisma().evidenceSnapshot.create({
      data: {
        id: record.id,
        orgId: record.org_id,
        evidenceSnapshotId: record.evidence_snapshot_id,
        measurementPlanId: record.measurement_plan_id,
        schemaVersion: record.schema_version,
        derivationVersion: record.derivation_version,
        workflowFamily: record.workflow_family,
        snapshotType: record.snapshot_type,
        coverageStatus: record.coverage_status,
        windowStart: parseDate(record.window_start, "window_start"),
        windowEnd: parseDate(record.window_end, "window_end"),
        suppressionDefaultVerdict: record.suppression_default_verdict,
        privacyAggregateOnly: record.privacy_aggregate_only,
        kMinThresholdMet: record.k_min_threshold_met,
        payloadJson: record.payload as Prisma.InputJsonValue,
        validationJson: record.validation as Prisma.InputJsonValue,
        sourceRefsJson: record.source_refs as Prisma.InputJsonValue,
        requiredCaveatsJson: record.required_caveats as Prisma.InputJsonValue,
        blockedUsesJson: record.blocked_uses as Prisma.InputJsonValue,
        version: record.version,
        supersedesId: record.supersedes_id,
        generatedAt: parseDate(record.generated_at, "generated_at"),
        createdAt: new Date(record.created_at),
        createdByRole: record.created_by_role
      }
    });
    const createdRecord = evidenceSnapshotRowToRecord(created);
    store.aiValueEvidenceSnapshots.set(key, createdRecord);
    return createdRecord;
  } catch (error: any) {
    return translatePrismaDuplicate(error);
  }
}

function valueHypothesisRowToRecord(row: {
  id: string;
  orgId: string;
  valueHypothesisId: string;
  schemaVersion: string;
  derivationVersion: string;
  workflowFamily: string;
  functionArea: string | null;
  valueRoute: string;
  hypothesisStatement: string;
  businessObjective: string;
  status: string;
  payloadJson: Prisma.JsonValue;
  validationJson: Prisma.JsonValue;
  sourceRefsJson: Prisma.JsonValue;
  version: number;
  supersedesId: string | null;
  createdAt: Date;
  createdByRole: string;
}): AiValueHypothesisStoredRecord {
  return {
    id: row.id,
    org_id: row.orgId,
    value_hypothesis_id: row.valueHypothesisId,
    schema_version: row.schemaVersion,
    derivation_version: row.derivationVersion,
    workflow_family: row.workflowFamily,
    function_area: row.functionArea,
    value_route: row.valueRoute,
    hypothesis_statement: row.hypothesisStatement,
    business_objective: row.businessObjective,
    status: row.status,
    payload: row.payloadJson as Record<string, unknown>,
    validation: row.validationJson as Record<string, unknown>,
    source_refs: row.sourceRefsJson as Record<string, unknown>,
    version: row.version,
    supersedes_id: row.supersedesId,
    created_at: row.createdAt.toISOString(),
    created_by_role: row.createdByRole
  };
}

function measurementPlanRowToRecord(row: {
  id: string;
  orgId: string;
  measurementPlanId: string;
  valueHypothesisId: string;
  schemaVersion: string;
  derivationVersion: string;
  workflowFamily: string;
  approvedAggregateGrain: string;
  minimumCohortThreshold: number;
  baselineWindowStart: Date;
  baselineWindowEnd: Date;
  comparisonWindowStart: Date | null;
  comparisonWindowEnd: Date | null;
  coverageGoal: string;
  readinessState: string;
  payloadJson: Prisma.JsonValue;
  validationJson: Prisma.JsonValue;
  sourcePackageRequirementsJson: Prisma.JsonValue;
  assumptionsJson: Prisma.JsonValue;
  sourceRefsJson: Prisma.JsonValue;
  version: number;
  supersedesId: string | null;
  createdAt: Date;
  createdByRole: string;
}): AiValueMeasurementPlanStoredRecord {
  return {
    id: row.id,
    org_id: row.orgId,
    measurement_plan_id: row.measurementPlanId,
    value_hypothesis_id: row.valueHypothesisId,
    schema_version: row.schemaVersion,
    derivation_version: row.derivationVersion,
    workflow_family: row.workflowFamily,
    approved_aggregate_grain: row.approvedAggregateGrain,
    minimum_cohort_threshold: row.minimumCohortThreshold,
    baseline_window_start: row.baselineWindowStart.toISOString(),
    baseline_window_end: row.baselineWindowEnd.toISOString(),
    comparison_window_start: row.comparisonWindowStart?.toISOString() ?? null,
    comparison_window_end: row.comparisonWindowEnd?.toISOString() ?? null,
    coverage_goal: row.coverageGoal,
    readiness_state: row.readinessState,
    payload: row.payloadJson as Record<string, unknown>,
    validation: row.validationJson as Record<string, unknown>,
    source_package_requirements:
      row.sourcePackageRequirementsJson as Record<string, unknown>,
    assumptions: row.assumptionsJson as Record<string, unknown>,
    source_refs: row.sourceRefsJson as Record<string, unknown>,
    version: row.version,
    supersedes_id: row.supersedesId,
    created_at: row.createdAt.toISOString(),
    created_by_role: row.createdByRole
  };
}

function sourcePackageRefRowToRecord(row: {
  id: string;
  orgId: string;
  sourcePackageId: string;
  sourcePackageType: string;
  schemaVersion: string;
  derivationVersion: string;
  measurementPlanId: string | null;
  workflowFamily: string | null;
  generatedAt: Date;
  coveredWindowStart: Date;
  coveredWindowEnd: Date;
  approvedAggregateGrain: string;
  minimumCohortThreshold: number;
  evidenceState: string;
  kMinPostureJson: Prisma.JsonValue;
  privacyBoundaryJson: Prisma.JsonValue;
  sourceRefsJson: Prisma.JsonValue;
  validationJson: Prisma.JsonValue;
  caveatsJson: Prisma.JsonValue;
  version: number;
  supersedesId: string | null;
  createdAt: Date;
  createdByRole: string;
}): AiValueSourcePackageRefStoredRecord {
  return {
    id: row.id,
    org_id: row.orgId,
    source_package_id: row.sourcePackageId,
    source_package_type: row.sourcePackageType,
    schema_version: row.schemaVersion,
    derivation_version: row.derivationVersion,
    measurement_plan_id: row.measurementPlanId,
    workflow_family: row.workflowFamily,
    generated_at: row.generatedAt.toISOString(),
    covered_window_start: row.coveredWindowStart.toISOString(),
    covered_window_end: row.coveredWindowEnd.toISOString(),
    approved_aggregate_grain: row.approvedAggregateGrain,
    minimum_cohort_threshold: row.minimumCohortThreshold,
    evidence_state: row.evidenceState,
    k_min_posture: row.kMinPostureJson as Record<string, unknown>,
    privacy_boundary: row.privacyBoundaryJson as Record<string, unknown>,
    source_refs: row.sourceRefsJson as Record<string, unknown>,
    validation: row.validationJson as Record<string, unknown>,
    caveats: row.caveatsJson as string[],
    version: row.version,
    supersedes_id: row.supersedesId,
    created_at: row.createdAt.toISOString(),
    created_by_role: row.createdByRole
  };
}

function evidenceSnapshotRowToRecord(row: {
  id: string;
  orgId: string;
  evidenceSnapshotId: string;
  measurementPlanId: string;
  schemaVersion: string;
  derivationVersion: string;
  workflowFamily: string;
  snapshotType: string;
  coverageStatus: string;
  windowStart: Date;
  windowEnd: Date;
  suppressionDefaultVerdict: string;
  privacyAggregateOnly: boolean;
  kMinThresholdMet: boolean;
  payloadJson: Prisma.JsonValue;
  validationJson: Prisma.JsonValue;
  sourceRefsJson: Prisma.JsonValue;
  requiredCaveatsJson: Prisma.JsonValue;
  blockedUsesJson: Prisma.JsonValue;
  version: number;
  supersedesId: string | null;
  generatedAt: Date;
  createdAt: Date;
  createdByRole: string;
}): AiValueEvidenceSnapshotStoredRecord {
  return {
    id: row.id,
    org_id: row.orgId,
    evidence_snapshot_id: row.evidenceSnapshotId,
    measurement_plan_id: row.measurementPlanId,
    schema_version: row.schemaVersion,
    derivation_version: row.derivationVersion,
    workflow_family: row.workflowFamily,
    snapshot_type: row.snapshotType,
    coverage_status: row.coverageStatus,
    window_start: row.windowStart.toISOString(),
    window_end: row.windowEnd.toISOString(),
    suppression_default_verdict: row.suppressionDefaultVerdict,
    privacy_aggregate_only: row.privacyAggregateOnly,
    k_min_threshold_met: row.kMinThresholdMet,
    payload: row.payloadJson as Record<string, unknown>,
    validation: row.validationJson as Record<string, unknown>,
    source_refs: row.sourceRefsJson as Record<string, unknown>,
    required_caveats: row.requiredCaveatsJson as string[],
    blocked_uses: row.blockedUsesJson as string[],
    version: row.version,
    supersedes_id: row.supersedesId,
    generated_at: row.generatedAt.toISOString(),
    created_at: row.createdAt.toISOString(),
    created_by_role: row.createdByRole
  };
}
