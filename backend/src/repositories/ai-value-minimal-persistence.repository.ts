import { createHash, randomUUID } from "node:crypto";

import { aiValueEngine } from "@learnaire/shared";
import { Prisma } from "@prisma/client";

import { getPrisma } from "../db";
import {
  store,
  type AiValueClaimReadinessSnapshotStoredRecord,
  type AiValueEvidenceSnapshotStoredRecord,
  type AiValueExecutiveReadoutSnapshotStoredRecord,
  type AiValueHypothesisStoredRecord,
  type AiValueMeasurementCellSnapshotStoredRecord,
  type AiValueMeasurementPlanStoredRecord,
  type AiValuePilotRunStoredRecord,
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
  /(^|_)row_id($|_)/i,
  /(^|_)span_id($|_)/i,
  /(^|_)trace_id($|_)/i,
  /employee_(?:id|email|name|record|identifier)/i,
  /person_(?:id|identifier|level|record|analytics)/i,
  /(?:^|_)(?:email|user|person|employee)_hash(?:$|_)/i,
  /(?:^|_)hashed_email(?:$|_)/i,
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
  /(^|[^a-z0-9])(?:row|span|trace)[-_:]id[-_:][a-z0-9_-]+/i,
  /(^|[^a-z0-9])(?:row|span|trace)[-_][a-z0-9_-]*[0-9][a-z0-9_-]*/i,
  /(?:email|user|person|employee)[-_]hash/i,
  /hashed[-_](?:email|user|person|employee)/i,
  /(?:hashed|joinable|pseudonymous|tokenized)[-_](?:user|person|employee)[-_](?:id|identifier)/i,
  /raw[-_](?:rows?|prompt|response|transcript|content)(?:$|[-_])/i,
  /\bselect\s+.+\bfrom\b/i,
  /(?:query_text|sql_text|file_contents?)/i,
  /(?:^|[_-])(?:prompt|response|transcript)[_-](?:text|content)(?:[_-]|$)/i,
  /person_level_(?:hris|productivity|analytics|record)/i
];

const FORBIDDEN_SOURCE_REF_STRING_PATTERNS = [
  /\b(?:roi|ebitda?|causality|productivity|probability|confidence|score)\b/i,
  /\b(?:finance|financial)\s+(?:output|impact|claim|attribution)\b/i,
  /\bcustomer[-_\s]?facing\s+(?:finance|financial|economic)\s+output\b/i,
  /(?:^|[_-])(?:roi|ebitda?|causality|productivity|probability|confidence|score)(?:[_-]|$)/i,
  /(?:^|[_-])finance[_-](?:output|impact|claim|attribution)(?:[_-]|$)/i,
  /(?:^|[_-])(?:prompt|response|transcript)[_-](?:text|content)(?:[_-]|$)/i
];

const FORBIDDEN_RAW_SOURCE_IDENTIFIER_KEY_PATTERNS = [
  /(^|_)row_id($|_)/i,
  /(^|_)span_id($|_)/i,
  /(^|_)trace_id($|_)/i,
  /(?:^|_)(?:email|user|person|employee)_hash(?:$|_)/i,
  /(?:^|_)hashed_email(?:$|_)/i
];

const FORBIDDEN_RAW_SOURCE_IDENTIFIER_STRING_PATTERNS = [
  /(^|[^a-z0-9])(?:row|span|trace)[-_:]id[-_:][a-z0-9_-]+/i,
  /(^|[^a-z0-9])(?:row|span|trace)[-_][a-z0-9_-]*[0-9][a-z0-9_-]*/i,
  /(?:email|user|person|employee)[-_]hash/i,
  /hashed[-_](?:email|user|person|employee)/i
];

const FORBIDDEN_MEASUREMENT_CELL_SNAPSHOT_KEY_PATTERNS = [
  /(^|_)(?:confidence|probability)(?:$|_)/i,
  /(^|_)score(?:$|_)/i,
  /(^|_)(?:roi|ebitda?)(?:$|_)/i,
  /financial_(?:output|impact|claim|attribution)/i,
  /(^|_)causality(?:$|_)/i,
  /(^|_)productivity(?:$|_)/i
];

const FORBIDDEN_MEASUREMENT_CELL_SNAPSHOT_STRING_PATTERNS = [
  /\b(?:roi|ebitda?|causality|productivity|probability|confidence|score)\b/i,
  /\b(?:finance|financial)\s+(?:output|impact|claim|attribution)\b/i,
  /\bcustomer[-_\s]?facing\s+(?:finance|financial|economic)\s+output\b/i,
  /(?:^|[_-])(?:roi|ebitda?|causality|productivity|probability|confidence|score)(?:[_-]|$)/i,
  /(?:^|[_-])finance[_-](?:output|impact|claim|attribution)(?:[_-]|$)/i,
  /(?:^|[_-])(?:prompt|response|transcript)[_-](?:text|content)(?:[_-]|$)/i
];

const MEASUREMENT_CELL_SNAPSHOT_REQUIRED_CAVEATS = [
  "Measurement Cells are aggregate alignment objects, not ROI proof, financial attribution, causality, productivity measurement, or customer-facing financial output.",
  "Metric movement cannot rescue suppressed VBD, AI Fluency, or governance evidence.",
  "Bayesian modeling remains future research until a later governed decision promotes it."
];

const MEASUREMENT_CELL_SNAPSHOT_REQUIRED_CAVEAT_SET = new Set(
  MEASUREMENT_CELL_SNAPSHOT_REQUIRED_CAVEATS
);

const normalizeKey = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

const ALLOWED_SOURCE_REF_KEYS = new Set([
  "aggregate_export_id",
  "aggregate_outcome_export_id",
  "aggregate_probe_id",
  "aggregate_entry_ref",
  "aggregate_workforce_context_export_id",
  "aggregate_workforce_context_export_ids",
  "assumption_approval_export_id",
  "assumption_approval_export_ids",
  "bigquery_probe_result_id",
  "client_evidence_entry_id",
  "client_evidence_request_id",
  "covered_signal_families",
  "fluency_baseline_ids",
  "governance_control_export_id",
  "governance_control_export_ids",
  "measurement_plan_id",
  "notes",
  "outcome_evidence_ids",
  "real_source_manifest_ids",
  "reportability_signal_families",
  "source_export_id",
  "source_package_ids",
  "source_readiness_id",
  "source_readiness_ids",
  "source_tables",
  "table_families_checked",
  "v3_verdict_ids",
  "value_hypothesis_id",
  "velocity_observation_ids",
  "vbd_summary",
  "blueprint_source_ref",
  "ai_fluency_source_ref",
  "vbd_source_ref",
  "metric_source_ref",
  "token_source_ref"
]);

const MEASUREMENT_CELL_SNAPSHOT_SOURCE_REF_KEYS = [
  "blueprint_source_ref",
  "ai_fluency_source_ref",
  "vbd_source_ref",
  "metric_source_ref",
  "token_source_ref"
];

const MEASUREMENT_CELL_SNAPSHOT_SOURCE_REF_KEY_SET = new Set(
  MEASUREMENT_CELL_SNAPSHOT_SOURCE_REF_KEYS
);

const COMPACT_MEASUREMENT_CELL_SNAPSHOT_SOURCE_REF_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,191}$/;

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

export interface PersistAiValueClaimReadinessSnapshotInput {
  claimReadinessSnapshot: Record<string, unknown>;
  version: number;
  createdByRole: string;
  supersedesId?: string | null;
}

export interface PersistAiValueExecutiveReadoutSnapshotInput {
  executiveReadoutSnapshot: Record<string, unknown>;
  version: number;
  createdByRole: string;
  supersedesId?: string | null;
}

export interface PersistAiValuePilotRunInput {
  pilotRun: Record<string, unknown>;
  version: number;
  createdByRole: string;
  supersedesId?: string | null;
}

export interface PersistAiValueMeasurementCellSnapshotInput {
  measurementCellAssemblyRun: Record<string, unknown>;
  version: number;
  createdByRole: string;
  supersedesId?: string | null;
  assemblyPayload?: Record<string, unknown> | null;
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

const asBoolean = (value: unknown): boolean => value === true;

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

const stableHash = (value: unknown): string =>
  createHash("sha256").update(stableStringify(value)).digest("hex");

const titleCaseValueDriver = (value: unknown): string | null => {
  const normalized = asString(value).toLowerCase();
  const drivers: Record<string, string> = {
    revenue: "Revenue",
    cost: "Cost",
    capacity: "Capacity",
    quality: "Quality",
    risk: "Risk"
  };
  return drivers[normalized] ?? null;
};

const requireStringField = (
  value: unknown,
  label: string,
  gaps: string[]
): string => {
  const text = asString(value);
  if (!text) {
    gaps.push(`${label} is required`);
  }
  return text;
};

const requirePositiveIntegerField = (
  value: unknown,
  label: string,
  gaps: string[]
): number => {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1) {
    gaps.push(`${label} must be a positive integer`);
    return 0;
  }
  return numeric;
};

const requireIntegerOrNull = (
  value: unknown,
  label: string,
  gaps: string[]
): number | null => {
  if (value === undefined || value === null) return null;
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) {
    gaps.push(`${label} must be an integer when present`);
    return null;
  }
  return numeric;
};

const compactValidation = (
  validation: Record<string, unknown>,
  validator: string
): Record<string, unknown> => ({
  schema_version: asString(validation.schema_version),
  validator,
  valid: validation.valid === true,
  measurement_cell_id: asOptionalString(validation.measurement_cell_id),
  run_id: asOptionalString(validation.run_id),
  gaps: asStringArray(validation.gaps)
});

const unsupportedFields = (
  value: Record<string, unknown>,
  allowed: Set<string>,
  label: string
): string[] =>
  Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map((key) => `${label}.${key} is not allowed`);

const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

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
    const normalizedKey = normalizeKey(key);
    const safeFalsePrivacyFlag = normalizedKey.startsWith("contains_") && nested === false;
    const safeFalseGovernanceFlag = [
      "can_authorize_people_decisioning",
      "ebita_claim_allowed",
      "ebitda_claim_allowed",
      "financial_attribution_allowed",
      "financial_claim_allowed",
      "financial_output_allowed",
      "productivity_claim_allowed",
      "roi_claim_allowed",
      "customer_facing_financial_output_allowed",
      "customer_facing_readout_allowed"
    ].includes(normalizedKey) && nested === false;
    if (
      !safeFalsePrivacyFlag &&
      !safeFalseGovernanceFlag &&
      FORBIDDEN_PERSISTENCE_KEY_PATTERNS.some((pattern) => pattern.test(normalizedKey))
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

const scanForbiddenRawSourceIdentifiers = (
  value: unknown,
  path: string,
  gaps: string[]
) => {
  if (typeof value === "string") {
    if (
      FORBIDDEN_RAW_SOURCE_IDENTIFIER_STRING_PATTERNS.some((pattern) =>
        pattern.test(value)
      )
    ) {
      gaps.push(`raw source identifier value at ${path || "<root>"} is not allowed`);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      scanForbiddenRawSourceIdentifiers(entry, `${path}[${index}]`, gaps)
    );
    return;
  }

  if (!value || typeof value !== "object") return;

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const nestedPath = path ? `${path}.${key}` : key;
    const normalizedKey = normalizeKey(key);
    if (
      FORBIDDEN_RAW_SOURCE_IDENTIFIER_KEY_PATTERNS.some((pattern) =>
        pattern.test(normalizedKey)
      )
    ) {
      gaps.push(`raw source identifier field ${nestedPath} is not allowed`);
    }
    scanForbiddenRawSourceIdentifiers(nested, nestedPath, gaps);
  }
};

const enforceRawSourceIdentifierDenylist = (
  value: unknown,
  objectLabel: string
) => {
  const gaps: string[] = [];
  scanForbiddenRawSourceIdentifiers(value, "", gaps);
  if (gaps.length > 0) {
    throw new AiValuePersistenceValidationError(
      `${objectLabel} contains raw source identifiers that cannot be persisted`,
      gaps
    );
  }
};

const enforceSafeMetadata = (value: Record<string, unknown>, objectLabel: string) => {
  enforcePersistenceDenylist(value, objectLabel);
};

const pathIsPostureText = (path: string): boolean =>
  /(^|\.)(blocked_uses|blocked_claims|blocked_dimensions|blocked_interpretation|required_controls|coverage_signals|covered_signals)(\.|\[|$)/.test(
    path
  ) || /(^|\.)(required_signals|expected_signals|missing_signals|present_signals)(\.|\[|$)/.test(path);

const pathIsRequiredCaveat = (path: string): boolean =>
  /(^|\.)required_caveats(\.|\[|$)/.test(path);

const safeRequiredCaveatText = (value: string): boolean =>
  MEASUREMENT_CELL_SNAPSHOT_REQUIRED_CAVEAT_SET.has(value);

const scanForbiddenMeasurementCellSnapshotTerms = (
  value: unknown,
  path: string,
  gaps: string[]
) => {
  if (typeof value === "string") {
    if (
      !pathIsPostureText(path) &&
      !(pathIsRequiredCaveat(path) && safeRequiredCaveatText(value)) &&
      FORBIDDEN_MEASUREMENT_CELL_SNAPSHOT_STRING_PATTERNS.some((pattern) =>
        pattern.test(value)
      )
    ) {
      gaps.push(`forbidden Measurement Cell Snapshot value at ${path || "<root>"} is not allowed`);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      scanForbiddenMeasurementCellSnapshotTerms(entry, `${path}[${index}]`, gaps)
    );
    return;
  }

  if (!value || typeof value !== "object") return;

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const nestedPath = path ? `${path}.${key}` : key;
    const normalizedKey = normalizeKey(key);
    const safeFalseGovernanceFlag = [
      "ebita_claim_allowed",
      "ebitda_claim_allowed",
      "financial_attribution_allowed",
      "financial_claim_allowed",
      "financial_output_allowed",
      "productivity_claim_allowed",
      "roi_claim_allowed",
      "customer_facing_financial_output_allowed"
    ].includes(normalizedKey) && nested === false;
    if (
      !safeFalseGovernanceFlag &&
      FORBIDDEN_MEASUREMENT_CELL_SNAPSHOT_KEY_PATTERNS.some((pattern) =>
        pattern.test(normalizedKey)
      )
    ) {
      gaps.push(`forbidden Measurement Cell Snapshot field ${nestedPath} is not allowed`);
    }
    scanForbiddenMeasurementCellSnapshotTerms(nested, nestedPath, gaps);
  }
};

const enforceMeasurementCellSnapshotDenylist = (
  value: unknown,
  objectLabel: string
) => {
  enforcePersistenceDenylist(value, objectLabel);
  const gaps: string[] = [];
  scanForbiddenMeasurementCellSnapshotTerms(value, "", gaps);
  if (gaps.length > 0) {
    throw new AiValuePersistenceValidationError(
      `${objectLabel} contains fields that cannot be persisted`,
      gaps
    );
  }
};

const scanForbiddenSourceRefValues = (
  value: unknown,
  path: string,
  gaps: string[]
) => {
  if (typeof value === "string") {
    if (FORBIDDEN_SOURCE_REF_STRING_PATTERNS.some((pattern) => pattern.test(value))) {
      gaps.push(`forbidden source ref value at ${path || "<root>"} is not allowed`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      scanForbiddenSourceRefValues(entry, `${path}[${index}]`, gaps)
    );
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const nestedPath = path ? `${path}.${key}` : key;
    scanForbiddenSourceRefValues(nested, nestedPath, gaps);
  }
};

const enforceSourceRefs = (value: Record<string, unknown>, objectLabel: string) => {
  const gaps = Object.keys(value)
    .filter((key) => !ALLOWED_SOURCE_REF_KEYS.has(key))
    .map((key) => `source ref field ${key} is not allowed`);
  for (const [key, sourceRefValue] of Object.entries(value)) {
    if (
      typeof sourceRefValue === "string" ||
      (Array.isArray(sourceRefValue) &&
        sourceRefValue.every((entry): entry is string => typeof entry === "string"))
    ) {
      continue;
    }
    gaps.push(`source ref field ${key} must be a string or string array`);
  }
  scanForbiddenSourceRefValues(value, "", gaps);
  if (gaps.length > 0) {
    throw new AiValuePersistenceValidationError(
      `${objectLabel} contains unsupported source refs`,
      gaps
    );
  }
  enforcePersistenceDenylist(value, objectLabel);
};

const enforceCompactMeasurementCellSnapshotSourceRef = (
  key: string,
  value: unknown,
  gaps: string[]
): string => {
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    !COMPACT_MEASUREMENT_CELL_SNAPSHOT_SOURCE_REF_PATTERN.test(value) ||
    /[{}[\]"'`]/.test(value) ||
    FORBIDDEN_SOURCE_REF_STRING_PATTERNS.some((pattern) => pattern.test(value)) ||
    FORBIDDEN_MEASUREMENT_CELL_SNAPSHOT_STRING_PATTERNS.some((pattern) =>
      pattern.test(value)
    )
  ) {
    gaps.push(`source_refs.${key} must be a compact governed source ref`);
    return "";
  }
  return value;
};

const compactMeasurementCellSnapshotSourceRefs = (
  sourceRefs: Record<string, unknown>
): Record<string, string> => {
  const gaps: string[] = [];
  for (const key of Object.keys(sourceRefs)) {
    if (!MEASUREMENT_CELL_SNAPSHOT_SOURCE_REF_KEY_SET.has(key)) {
      gaps.push(`source_refs.${key} is not allowed for Measurement Cell Snapshot persistence`);
    }
  }
  const compact: Record<string, string> = {};
  for (const key of MEASUREMENT_CELL_SNAPSHOT_SOURCE_REF_KEYS) {
    compact[key] = enforceCompactMeasurementCellSnapshotSourceRef(
      key,
      sourceRefs[key],
      gaps
    );
  }
  if (gaps.length > 0) {
    throw new AiValuePersistenceValidationError(
      "Measurement Cell Snapshot source refs must be compact lane refs only",
      gaps
    );
  }
  return compact;
};

const measurementPlanKey = (orgId: string, measurementPlanId: string, version: number) =>
  `${orgId}:${measurementPlanId}:${version}`;

const hypothesisKey = (orgId: string, hypothesisId: string, version: number) =>
  `${orgId}:${hypothesisId}:${version}`;

const sourcePackageRefKey = (orgId: string, sourcePackageId: string, version: number) =>
  `${orgId}:${sourcePackageId}:${version}`;

const evidenceSnapshotKey = (orgId: string, evidenceSnapshotId: string, version: number) =>
  `${orgId}:${evidenceSnapshotId}:${version}`;

const claimReadinessSnapshotKey = (
  orgId: string,
  claimReadinessSnapshotId: string,
  version: number
) => `${orgId}:${claimReadinessSnapshotId}:${version}`;

const executiveReadoutSnapshotKey = (
  orgId: string,
  executiveReadoutSnapshotId: string,
  version: number
) => `${orgId}:${executiveReadoutSnapshotId}:${version}`;

const pilotRunKey = (orgId: string, pilotRunId: string, version: number) =>
  `${orgId}:${pilotRunId}:${version}`;

const measurementCellSnapshotKey = (
  orgId: string,
  measurementCellId: string,
  version: number
) => `${orgId}:${measurementCellId}:${version}`;

const latestByVersion = <T extends { version: number }>(records: T[]): T | null =>
  records.sort((a, b) => b.version - a.version)[0] ?? null;

const exactByVersion = <T extends { version: number }>(
  records: T[],
  version: number
): T | null => records.find((record) => record.version === version) ?? null;

const getPath = (value: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>(
    (current, key) => asRecord(current)[key],
    value
  );

const asPositiveIntegerOrNull = (value: unknown): number | null =>
  Number.isInteger(value) && Number(value) >= 1 ? Number(value) : null;

const requirePersistenceVersion = (
  value: Record<string, unknown>,
  label: string,
  paths: string[]
): number => {
  const versions: Array<{ path: string; version: number }> = [];
  const gaps: string[] = [];
  for (const path of paths) {
    const rawVersion = getPath(value, path);
    if (rawVersion === undefined) continue;
    const version = asPositiveIntegerOrNull(rawVersion);
    if (version === null) {
      gaps.push(`${path} must be a positive integer`);
    } else {
      versions.push({ path, version });
    }
  }
  if (gaps.length > 0) {
    throw new AiValuePersistenceValidationError(
      `${label} has invalid persisted source version`,
      gaps
    );
  }
  if (versions.length === 0) {
    throw new AiValuePersistenceValidationError(
      `${label} is missing explicit persisted source version`,
      [`${label} must carry one of: ${paths.join(", ")}`]
    );
  }
  const distinctVersions = new Set(versions.map((entry) => entry.version));
  if (distinctVersions.size > 1) {
    throw new AiValuePersistenceValidationError(
      `${label} has conflicting persisted source versions`,
      [
        `${label} version markers must agree: ${versions
          .map((entry) => `${entry.path}=${entry.version}`)
          .join(", ")}`
      ]
    );
  }
  return versions[0].version;
};

const requireSourcePackageRefVersions = (
  validation: Record<string, unknown>,
  sourcePackageIds: string[]
): Record<string, number> => {
  const versionMap = asRecord(validation.source_package_ref_versions);
  const gaps: string[] = [];
  const resolved: Record<string, number> = {};
  const expectedIds = new Set(sourcePackageIds);
  for (const sourcePackageId of Object.keys(versionMap)) {
    if (!expectedIds.has(sourcePackageId)) {
      gaps.push(`validation.source_package_ref_versions.${sourcePackageId} is not referenced by source_package_ids`);
    }
  }
  for (const sourcePackageId of sourcePackageIds) {
    const version = asPositiveIntegerOrNull(versionMap[sourcePackageId]);
    if (version === null) {
      gaps.push(`validation.source_package_ref_versions.${sourcePackageId} must be a positive integer`);
    } else {
      resolved[sourcePackageId] = version;
    }
  }
  if (gaps.length > 0) {
    throw new AiValuePersistenceValidationError(
      "Pilot Run source package lineage is missing explicit versions",
      gaps
    );
  }
  return resolved;
};

const sortedStrings = (values: string[]): string[] => [...values].sort((a, b) => a.localeCompare(b));

const missingFrom = (required: string[], actual: string[]): string[] => {
  const actualSet = new Set(actual);
  return sortedStrings(required.filter((value) => !actualSet.has(value)));
};

const compareField = (
  gaps: string[],
  label: string,
  expected: unknown,
  actual: unknown
) => {
  if (stableStringify(expected) !== stableStringify(actual)) {
    gaps.push(label);
  }
};

const normalizeDateOnlyForComparison = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
};

const expectedPilotRunStatus = (
  coverageStatus: string,
  requiredCaveats: string[]
): string => {
  if (coverageStatus === "held_for_governance") return "held_for_governance";
  if (coverageStatus === "held_for_customer_exports") return "held_for_source_binding";
  return requiredCaveats.length > 0 ? "completed_with_caveats" : "completed";
};

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

const PILOT_RUN_ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "pilot_run_id",
  "org_id",
  "measurement_plan_id",
  "workflow_family",
  "source_package_ids",
  "evidence_snapshot_id",
  "claim_readiness_handoff_id",
  "claim_readiness_snapshot_id",
  "executive_readout_snapshot_id",
  "coverage_status",
  "run_status",
  "required_caveats",
  "blocked_uses",
  "validation",
  "generated_at"
]);

const PILOT_RUN_ALLOWED_VALIDATION_FIELDS = new Set([
  "valid",
  "evidence_snapshot_persisted",
  "evidence_snapshot_version",
  "evidence_snapshot_persistence_version",
  "source_package_ref_versions",
  "claim_readiness_handoff_validated",
  "claim_readiness_snapshot_persisted",
  "claim_readiness_snapshot_version",
  "claim_readiness_snapshot_persistence_version",
  "executive_readout_snapshot_persisted",
  "executive_readout_snapshot_version",
  "executive_readout_snapshot_persistence_version"
]);

const PILOT_RUN_COVERAGE_STATUSES = new Set([
  "layer_1_only",
  "layer_1_plus_partial_layer_2",
  "layer_1_plus_partial_layer_3",
  "layer_1_plus_layer_2_and_layer_3",
  "full_playbook_coverage",
  "held_for_customer_exports",
  "held_for_governance"
]);

const PILOT_RUN_STATUSES = new Set([
  "started",
  "completed",
  "completed_with_caveats",
  "failed_closed",
  "held_for_governance",
  "held_for_source_binding"
]);

const MEASUREMENT_CELL_ASSEMBLY_PAYLOAD_ALLOWED_FIELDS = new Set([
  "assembly_run_id",
  "assembly_decision",
  "measurement_cell_id",
  "source_refs",
  "validation",
  "required_caveats",
  "blocked_uses"
]);

const MEASUREMENT_CELL_ASSEMBLY_PAYLOAD_VALIDATION_ALLOWED_FIELDS = new Set([
  "schema_version",
  "validator",
  "valid",
  "measurement_cell_id",
  "run_id",
  "gaps"
]);

const MEASUREMENT_CELL_SNAPSHOT_BLOCKED_REQUIRED_USES = [
  "realized_roi",
  "ebita_claim",
  "ebitda_claim",
  "financial_attribution",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "department_ranking",
  "people_decisioning",
  "customer_facing_financial_output",
  "customer_facing_prediction",
  "customer_facing_output",
  "customer_facing_economic_output",
  "snapshot_read_projection",
  "snapshot_read_route",
  "snapshot_export",
  "rendered_readout",
  "frontend_ui",
  "live_connector_execution",
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "measurement_cell_series_persistence",
  "contribution_model",
  "research_model_feed",
  "probability_output",
  "score_output"
];

const MEASUREMENT_CELL_SNAPSHOT_BLOCKED_REQUIRED_USE_SET = new Set(
  MEASUREMENT_CELL_SNAPSHOT_BLOCKED_REQUIRED_USES
);

const MEASUREMENT_CELL_SNAPSHOT_INPUT_REQUIRED_BLOCKED_USES = [
  "realized_roi",
  "ebita_claim",
  "ebitda_claim",
  "financial_attribution",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "department_ranking",
  "people_decisioning",
  "customer_facing_financial_output",
  "customer_facing_prediction"
];

const canonicalMeasurementCellSnapshotCaveats = (
  caveats: string[]
): string[] => {
  const gaps: string[] = [];
  for (const caveat of MEASUREMENT_CELL_SNAPSHOT_REQUIRED_CAVEATS) {
    if (!caveats.includes(caveat)) {
      gaps.push(`required_caveats missing governed caveat: ${caveat}`);
    }
  }
  for (const caveat of caveats) {
    if (!MEASUREMENT_CELL_SNAPSHOT_REQUIRED_CAVEAT_SET.has(caveat)) {
      gaps.push(`required_caveats contains unsupported caveat: ${caveat}`);
    }
  }
  if (gaps.length > 0) {
    throw new AiValuePersistenceValidationError(
      "Measurement Cell Snapshot caveats must match the governed caveat set",
      gaps
    );
  }
  return [...MEASUREMENT_CELL_SNAPSHOT_REQUIRED_CAVEATS];
};

const canonicalMeasurementCellSnapshotBlockedUses = (
  blockedUses: string[]
): string[] => {
  const gaps: string[] = [];
  for (const use of MEASUREMENT_CELL_SNAPSHOT_INPUT_REQUIRED_BLOCKED_USES) {
    if (!blockedUses.includes(use)) {
      gaps.push(`blocked_uses missing ${use}`);
    }
  }
  for (const use of blockedUses) {
    if (!MEASUREMENT_CELL_SNAPSHOT_BLOCKED_REQUIRED_USE_SET.has(use)) {
      gaps.push(`blocked_uses contains unsupported use ${use}`);
    }
  }
  if (gaps.length > 0) {
    throw new AiValuePersistenceValidationError(
      "Measurement Cell Snapshot blocked uses must match the governed blocked-use set",
      gaps
    );
  }
  return [...MEASUREMENT_CELL_SNAPSHOT_BLOCKED_REQUIRED_USES];
};

const validatePilotRunLedgerShape = (pilotRun: Record<string, unknown>): void => {
  const gaps: string[] = [];
  for (const key of Object.keys(pilotRun)) {
    if (!PILOT_RUN_ALLOWED_TOP_LEVEL_FIELDS.has(key)) {
      gaps.push(`pilot run field ${key} is not allowed`);
    }
  }

  for (const field of [
    "pilot_run_id",
    "org_id",
    "measurement_plan_id",
    "workflow_family",
    "evidence_snapshot_id",
    "claim_readiness_handoff_id",
    "coverage_status",
    "run_status",
    "generated_at"
  ]) {
    if (!asString(pilotRun[field])) {
      gaps.push(`${field} is required`);
    }
  }

  const sourcePackageIds = asStringArray(pilotRun.source_package_ids);
  if (sourcePackageIds.length === 0) {
    gaps.push("source_package_ids must include at least one persisted Source Package ref id");
  }
  if (
    Array.isArray(pilotRun.source_package_ids) &&
    sourcePackageIds.length !== pilotRun.source_package_ids.length
  ) {
    gaps.push("source_package_ids must contain only strings");
  }
  if (!Array.isArray(pilotRun.source_package_ids)) {
    gaps.push("source_package_ids must be an array");
  }
  if (!Array.isArray(pilotRun.required_caveats)) {
    gaps.push("required_caveats must be an array");
  }
  if (!Array.isArray(pilotRun.blocked_uses)) {
    gaps.push("blocked_uses must be an array");
  }
  if (
    pilotRun.coverage_status &&
    !PILOT_RUN_COVERAGE_STATUSES.has(asString(pilotRun.coverage_status))
  ) {
    gaps.push(`coverage_status is invalid: ${asString(pilotRun.coverage_status)}`);
  }
  if (pilotRun.run_status && !PILOT_RUN_STATUSES.has(asString(pilotRun.run_status))) {
    gaps.push(`run_status is invalid: ${asString(pilotRun.run_status)}`);
  }
  if (
    PILOT_RUN_COVERAGE_STATUSES.has(asString(pilotRun.coverage_status)) &&
    PILOT_RUN_STATUSES.has(asString(pilotRun.run_status))
  ) {
    const expectedStatus = expectedPilotRunStatus(
      asString(pilotRun.coverage_status),
      asStringArray(pilotRun.required_caveats)
    );
    if (asString(pilotRun.run_status) !== expectedStatus) {
      gaps.push(`run_status must be ${expectedStatus} for coverage_status ${asString(pilotRun.coverage_status)} and carried caveats`);
    }
  }

  const validation = asRecord(pilotRun.validation);
  for (const key of Object.keys(validation)) {
    if (!PILOT_RUN_ALLOWED_VALIDATION_FIELDS.has(key)) {
      gaps.push(`validation.${key} is not allowed`);
    }
  }
  if (Object.keys(validation).length === 0) {
    gaps.push("validation is required");
  }
  if (validation.valid !== true) {
    gaps.push("validation.valid must be true");
  }
  if (validation.evidence_snapshot_persisted !== true) {
    gaps.push("validation.evidence_snapshot_persisted must be true");
  }
  if (validation.claim_readiness_handoff_validated !== true) {
    gaps.push("validation.claim_readiness_handoff_validated must be true");
  }
  if (typeof validation.claim_readiness_snapshot_persisted !== "boolean") {
    gaps.push("validation.claim_readiness_snapshot_persisted must be boolean");
  }
  if (typeof validation.executive_readout_snapshot_persisted !== "boolean") {
    gaps.push("validation.executive_readout_snapshot_persisted must be boolean");
  }

  const claimSnapshotPersisted = validation.claim_readiness_snapshot_persisted === true;
  const executiveReadoutPersisted = validation.executive_readout_snapshot_persisted === true;
  const claimSnapshotId = asOptionalString(pilotRun.claim_readiness_snapshot_id);
  const executiveReadoutId = asOptionalString(pilotRun.executive_readout_snapshot_id);
  if (claimSnapshotPersisted && !claimSnapshotId) {
    gaps.push("claim_readiness_snapshot_id is required when claim_readiness_snapshot_persisted is true");
  }
  if (!claimSnapshotPersisted && claimSnapshotId) {
    gaps.push("claim_readiness_snapshot_id must be omitted unless claim_readiness_snapshot_persisted is true");
  }
  if (executiveReadoutPersisted && !executiveReadoutId) {
    gaps.push("executive_readout_snapshot_id is required when executive_readout_snapshot_persisted is true");
  }
  if (!executiveReadoutPersisted && executiveReadoutId) {
    gaps.push("executive_readout_snapshot_id must be omitted unless executive_readout_snapshot_persisted is true");
  }
  if (executiveReadoutPersisted && !claimSnapshotPersisted) {
    gaps.push("executive_readout_snapshot_persisted requires claim_readiness_snapshot_persisted");
  }

  if (gaps.length > 0) {
    throw new AiValuePersistenceValidationError(
      "Pilot Run ledger record failed validation before persistence",
      gaps
    );
  }
};

async function loadLatestEvidenceSnapshotRecord(
  orgId: string,
  evidenceSnapshotId: string,
  version?: number
): Promise<AiValueEvidenceSnapshotStoredRecord | null> {
  if (!usePrisma()) {
    const records = Array.from(store.aiValueEvidenceSnapshots.values()).filter(
      (record) =>
        record.org_id === orgId &&
        record.evidence_snapshot_id === evidenceSnapshotId
    );
    return version === undefined ? latestByVersion(records) : exactByVersion(records, version);
  }

  const row = await getPrisma().evidenceSnapshot.findFirst({
    where: {
      orgId,
      evidenceSnapshotId,
      ...(version === undefined ? {} : { version })
    },
    orderBy: { version: "desc" }
  });
  return row ? evidenceSnapshotRowToRecord(row) : null;
}

async function loadLatestClaimReadinessSnapshotRecord(
  orgId: string,
  claimReadinessSnapshotId: string,
  version?: number
): Promise<AiValueClaimReadinessSnapshotStoredRecord | null> {
  if (!usePrisma()) {
    const records = Array.from(store.aiValueClaimReadinessSnapshots.values()).filter(
      (record) =>
        record.org_id === orgId &&
        record.claim_readiness_snapshot_id === claimReadinessSnapshotId
    );
    return version === undefined ? latestByVersion(records) : exactByVersion(records, version);
  }

  const row = await getPrisma().claimReadinessSnapshot.findFirst({
    where: {
      orgId,
      claimReadinessSnapshotId,
      ...(version === undefined ? {} : { version })
    },
    orderBy: { version: "desc" }
  });
  return row ? claimReadinessSnapshotRowToRecord(row) : null;
}

async function loadLatestExecutiveReadoutSnapshotRecord(
  orgId: string,
  executiveReadoutSnapshotId: string,
  version?: number
): Promise<AiValueExecutiveReadoutSnapshotStoredRecord | null> {
  if (!usePrisma()) {
    const records = Array.from(store.aiValueExecutiveReadoutSnapshots.values()).filter(
      (record) =>
        record.org_id === orgId &&
        record.executive_readout_snapshot_id === executiveReadoutSnapshotId
    );
    return version === undefined ? latestByVersion(records) : exactByVersion(records, version);
  }

  const row = await getPrisma().executiveReadoutSnapshot.findFirst({
    where: {
      orgId,
      executiveReadoutSnapshotId,
      ...(version === undefined ? {} : { version })
    },
    orderBy: { version: "desc" }
  });
  return row ? executiveReadoutSnapshotRowToRecord(row) : null;
}

async function loadSourcePackageRefRecord(
  orgId: string,
  sourcePackageId: string,
  version: number
): Promise<AiValueSourcePackageRefStoredRecord | null> {
  if (!usePrisma()) {
    return store.aiValueSourcePackageRefs.get(
      sourcePackageRefKey(orgId, sourcePackageId, version)
    ) ?? null;
  }

  const row = await getPrisma().sourcePackageRef.findFirst({
    where: {
      orgId,
      sourcePackageId,
      version
    }
  });
  return row ? sourcePackageRefRowToRecord(row) : null;
}

const ensureClaimSnapshotBoundToPersistedEvidence = async (
  snapshot: Record<string, unknown>
): Promise<AiValueEvidenceSnapshotStoredRecord> => {
  const orgId = asString(snapshot.org_id);
  const evidenceSnapshotId = asString(snapshot.evidence_snapshot_id);
  const evidenceSnapshotVersion = requirePersistenceVersion(
    snapshot,
    "Claim Readiness Snapshot evidence source binding",
    [
      "derived_from.evidence_snapshot_persistence_version",
      "source_provenance.evidence_snapshot_persistence_version",
      "validation.evidence_snapshot_persistence_version"
    ]
  );
  const persistedEvidence = await loadLatestEvidenceSnapshotRecord(
    orgId,
    evidenceSnapshotId,
    evidenceSnapshotVersion
  );
  if (!persistedEvidence) {
    throw new AiValuePersistenceValidationError(
      "Claim Readiness Snapshot is not bound to a persisted Evidence Snapshot",
      [`persisted Evidence Snapshot version ${evidenceSnapshotVersion} is required before Claim Readiness Snapshot persistence`]
    );
  }

  const gaps: string[] = [];
  const persistedPayload = persistedEvidence.payload;
  const comparisons: Array<[string, unknown, unknown]> = [
    ["org_id", persistedEvidence.org_id, snapshot.org_id],
    ["evidence_snapshot_id", persistedEvidence.evidence_snapshot_id, snapshot.evidence_snapshot_id],
    ["measurement_plan_id", persistedEvidence.measurement_plan_id, snapshot.measurement_plan_id],
    ["coverage_status", persistedEvidence.coverage_status, snapshot.coverage_status]
  ];
  for (const [field, expected, actual] of comparisons) {
    if (String(expected) !== String(actual)) {
      gaps.push(`Claim Readiness Snapshot ${field} does not match persisted Evidence Snapshot`);
    }
  }
  if (stableStringify(persistedPayload.workflow) !== stableStringify(snapshot.workflow)) {
    gaps.push("Claim Readiness Snapshot workflow does not match persisted Evidence Snapshot");
  }
  if (stableStringify(persistedPayload.window) !== stableStringify(snapshot.window)) {
    gaps.push("Claim Readiness Snapshot window does not match persisted Evidence Snapshot");
  }
  if (stableStringify(persistedEvidence.source_refs) !== stableStringify(asRecord(snapshot.source_refs))) {
    gaps.push("Claim Readiness Snapshot source_refs do not match persisted Evidence Snapshot");
  }
  for (const field of [
    "playbook_coverage",
    "suppression",
    "privacy_boundary",
    "aggregate_workforce_context",
    "vbd_operating_map"
  ]) {
    compareField(
      gaps,
      `Claim Readiness Snapshot ${field} does not match persisted Evidence Snapshot`,
      persistedPayload[field],
      snapshot[field]
    );
  }
  const missingCaveats = missingFrom(
    persistedEvidence.required_caveats,
    asStringArray(snapshot.required_caveats)
  );
  if (missingCaveats.length > 0) {
    gaps.push(`Claim Readiness Snapshot required_caveats missing persisted Evidence Snapshot caveat(s): ${missingCaveats.join(", ")}`);
  }
  const missingBlockedUses = missingFrom(
    persistedEvidence.blocked_uses,
    asStringArray(snapshot.blocked_uses)
  );
  if (missingBlockedUses.length > 0) {
    gaps.push(`Claim Readiness Snapshot blocked_uses missing persisted Evidence Snapshot blocked use(s): ${missingBlockedUses.join(", ")}`);
  }
  if (gaps.length > 0) {
    throw new AiValuePersistenceValidationError(
      "Claim Readiness Snapshot source binding failed before persistence",
      gaps
    );
  }
  return persistedEvidence;
};

const ensureExecutiveReadoutBoundToPersistedClaimSnapshot = async (
  snapshot: Record<string, unknown>
): Promise<AiValueClaimReadinessSnapshotStoredRecord> => {
  const orgId = asString(snapshot.org_id);
  const claimReadinessSnapshotId = asString(snapshot.claim_readiness_snapshot_id);
  const claimReadinessSnapshotVersion = requirePersistenceVersion(
    snapshot,
    "Executive Readout Snapshot claim source binding",
    [
      "derived_from.claim_readiness_snapshot_persistence_version",
      "source_provenance.claim_readiness_snapshot_persistence_version",
      "validation.claim_readiness_snapshot_persistence_version"
    ]
  );
  const persistedClaim = await loadLatestClaimReadinessSnapshotRecord(
    orgId,
    claimReadinessSnapshotId,
    claimReadinessSnapshotVersion
  );
  if (!persistedClaim) {
    throw new AiValuePersistenceValidationError(
      "Executive Readout Snapshot is not bound to a persisted Claim Readiness Snapshot",
      [`persisted Claim Readiness Snapshot version ${claimReadinessSnapshotVersion} is required before Executive Readout Snapshot persistence`]
    );
  }

  const gaps: string[] = [];
  const persistedPayload = persistedClaim.payload;
  const comparisons: Array<[string, unknown, unknown]> = [
    ["org_id", persistedClaim.org_id, snapshot.org_id],
    ["claim_readiness_snapshot_id", persistedClaim.claim_readiness_snapshot_id, snapshot.claim_readiness_snapshot_id],
    ["evidence_snapshot_id", persistedClaim.evidence_snapshot_id, snapshot.evidence_snapshot_id],
    ["handoff_id", persistedClaim.handoff_id, snapshot.handoff_id],
    ["measurement_plan_id", persistedClaim.measurement_plan_id, snapshot.measurement_plan_id],
    ["coverage_status", persistedClaim.coverage_status, snapshot.coverage_status]
  ];
  for (const [field, expected, actual] of comparisons) {
    if (String(expected) !== String(actual)) {
      gaps.push(`Executive Readout Snapshot ${field} does not match persisted Claim Readiness Snapshot`);
    }
  }
  if (stableStringify(persistedPayload.workflow) !== stableStringify(snapshot.workflow)) {
    gaps.push("Executive Readout Snapshot workflow does not match persisted Claim Readiness Snapshot");
  }
  if (stableStringify(persistedPayload.window) !== stableStringify(snapshot.window)) {
    gaps.push("Executive Readout Snapshot window does not match persisted Claim Readiness Snapshot");
  }
  if (stableStringify(persistedClaim.source_refs) !== stableStringify(asRecord(snapshot.source_refs))) {
    gaps.push("Executive Readout Snapshot source_refs do not match persisted Claim Readiness Snapshot");
  }
  const expectedReadoutSnapshot = aiValueEngine.buildExecutiveReadoutSnapshotFromClaimReadinessSnapshot(
    persistedPayload,
    {
      executiveReadoutSnapshotId: asString(snapshot.executive_readout_snapshot_id),
      createdAt: asString(snapshot.created_at)
    }
  ) as unknown as Record<string, unknown>;
  if (asString(expectedReadoutSnapshot.readout_state) !== asString(snapshot.readout_state)) {
    gaps.push("Executive Readout Snapshot readout_state does not match persisted Claim Readiness Snapshot posture");
  }
  for (const field of [
    "playbook_coverage",
    "financial_boundary",
    "executive_readout_boundary",
    "suppression",
    "privacy_boundary"
  ]) {
    compareField(
      gaps,
      `Executive Readout Snapshot ${field} does not match persisted Claim Readiness Snapshot`,
      persistedPayload[field],
      snapshot[field]
    );
  }
  const missingCaveats = missingFrom(
    persistedClaim.required_caveats,
    asStringArray(snapshot.required_caveats)
  );
  if (missingCaveats.length > 0) {
    gaps.push(`Executive Readout Snapshot required_caveats missing persisted Claim Readiness Snapshot caveat(s): ${missingCaveats.join(", ")}`);
  }
  const missingBlockedUses = missingFrom(
    persistedClaim.blocked_uses,
    asStringArray(snapshot.blocked_uses)
  );
  if (missingBlockedUses.length > 0) {
    gaps.push(`Executive Readout Snapshot blocked_uses missing persisted Claim Readiness Snapshot blocked use(s): ${missingBlockedUses.join(", ")}`);
  }
  const missingBlockedClaims = missingFrom(
    persistedClaim.blocked_claims,
    asStringArray(snapshot.blocked_claims)
  );
  if (missingBlockedClaims.length > 0) {
    gaps.push(`Executive Readout Snapshot blocked_claims missing persisted Claim Readiness Snapshot blocked claim(s): ${missingBlockedClaims.join(", ")}`);
  }
  if (gaps.length > 0) {
    throw new AiValuePersistenceValidationError(
      "Executive Readout Snapshot source binding failed before persistence",
      gaps
    );
  }
  return persistedClaim;
};

const ensurePilotRunSnapshotLineage = async (
  pilotRun: Record<string, unknown>
): Promise<void> => {
  const validation = asRecord(pilotRun.validation);
  const orgId = asString(pilotRun.org_id);
  const claimSnapshotPersisted = validation.claim_readiness_snapshot_persisted === true;
  const executiveReadoutPersisted = validation.executive_readout_snapshot_persisted === true;
  const gaps: string[] = [];
  const evidenceSnapshotVersion = requirePersistenceVersion(
    pilotRun,
    "Pilot Run Evidence Snapshot lineage",
    [
      "validation.evidence_snapshot_version",
      "validation.evidence_snapshot_persistence_version"
    ]
  );
  const persistedEvidence = await loadLatestEvidenceSnapshotRecord(
    orgId,
    asString(pilotRun.evidence_snapshot_id),
    evidenceSnapshotVersion
  );
  if (!persistedEvidence) {
    gaps.push(`persisted Evidence Snapshot version ${evidenceSnapshotVersion} is required before pilot run lineage can record it`);
  } else {
    const comparisons: Array<[string, unknown, unknown]> = [
      ["evidence_snapshot_id", persistedEvidence.evidence_snapshot_id, pilotRun.evidence_snapshot_id],
      ["measurement_plan_id", persistedEvidence.measurement_plan_id, pilotRun.measurement_plan_id],
      ["coverage_status", persistedEvidence.coverage_status, pilotRun.coverage_status]
    ];
    for (const [field, expected, actual] of comparisons) {
      if (String(expected) !== String(actual)) {
        gaps.push(`pilot run ${field} does not match persisted Evidence Snapshot`);
      }
    }
    const pilotSourcePackageIds = sortedStrings(asStringArray(pilotRun.source_package_ids));
    const evidenceSourcePackageIds = sortedStrings(asStringArray(
      asRecord(persistedEvidence.source_refs).source_package_ids
    ));
    if (evidenceSourcePackageIds.length === 0) {
      gaps.push("persisted Evidence Snapshot source_refs.source_package_ids must bind pilot run source packages");
    } else if (stableStringify(evidenceSourcePackageIds) !== stableStringify(pilotSourcePackageIds)) {
      gaps.push("pilot run source_package_ids do not match persisted Evidence Snapshot source_refs.source_package_ids");
    }
    const sourcePackageVersions = requireSourcePackageRefVersions(
      validation,
      pilotSourcePackageIds
    );
    for (const sourcePackageId of pilotSourcePackageIds) {
      const persistedSourcePackage = await loadSourcePackageRefRecord(
        orgId,
        sourcePackageId,
        sourcePackageVersions[sourcePackageId]
      );
      if (!persistedSourcePackage) {
        gaps.push(`persisted Source Package ref ${sourcePackageId} version ${sourcePackageVersions[sourcePackageId]} is required before pilot run lineage can record it`);
      } else if (persistedSourcePackage.measurement_plan_id !== asString(pilotRun.measurement_plan_id)) {
        gaps.push(`pilot run source package ${sourcePackageId} measurement_plan_id does not match pilot run`);
      }
    }
    const missingEvidenceCaveats = missingFrom(
      persistedEvidence.required_caveats,
      asStringArray(pilotRun.required_caveats)
    );
    if (missingEvidenceCaveats.length > 0) {
      gaps.push(`pilot run required_caveats missing persisted Evidence Snapshot caveat(s): ${missingEvidenceCaveats.join(", ")}`);
    }
    const missingEvidenceBlockedUses = missingFrom(
      persistedEvidence.blocked_uses,
      asStringArray(pilotRun.blocked_uses)
    );
    if (missingEvidenceBlockedUses.length > 0) {
      gaps.push(`pilot run blocked_uses missing persisted Evidence Snapshot blocked use(s): ${missingEvidenceBlockedUses.join(", ")}`);
    }
    if (validation.claim_readiness_handoff_validated === true) {
      const expectedHandoff = aiValueEngine.buildClaimReadinessHandoffFromEvidenceSnapshot(
        persistedEvidence.payload,
        {
          handoffId: asString(pilotRun.claim_readiness_handoff_id),
          createdAt: asString(pilotRun.generated_at)
        }
      );
      const missingHandoffCaveats = missingFrom(
        expectedHandoff.required_caveats,
        asStringArray(pilotRun.required_caveats)
      );
      if (missingHandoffCaveats.length > 0) {
        gaps.push(`pilot run required_caveats missing validated Claim Readiness Handoff caveat(s): ${missingHandoffCaveats.join(", ")}`);
      }
      const missingHandoffBlockedUses = missingFrom(
        expectedHandoff.blocked_uses,
        asStringArray(pilotRun.blocked_uses)
      );
      if (missingHandoffBlockedUses.length > 0) {
        gaps.push(`pilot run blocked_uses missing validated Claim Readiness Handoff blocked use(s): ${missingHandoffBlockedUses.join(", ")}`);
      }
    }
  }
  let persistedClaim: AiValueClaimReadinessSnapshotStoredRecord | null = null;

  if (claimSnapshotPersisted) {
    const claimReadinessSnapshotVersion = requirePersistenceVersion(
      pilotRun,
      "Pilot Run Claim Readiness Snapshot lineage",
      [
        "validation.claim_readiness_snapshot_version",
        "validation.claim_readiness_snapshot_persistence_version"
      ]
    );
    persistedClaim = await loadLatestClaimReadinessSnapshotRecord(
      orgId,
      asString(pilotRun.claim_readiness_snapshot_id),
      claimReadinessSnapshotVersion
    );
    if (!persistedClaim) {
      gaps.push(`persisted Claim Readiness Snapshot version ${claimReadinessSnapshotVersion} is required before pilot run lineage can record it`);
    } else {
      const comparisons: Array<[string, unknown, unknown]> = [
        ["evidence_snapshot_id", persistedClaim.evidence_snapshot_id, pilotRun.evidence_snapshot_id],
        ["claim_readiness_handoff_id", persistedClaim.handoff_id, pilotRun.claim_readiness_handoff_id],
        ["measurement_plan_id", persistedClaim.measurement_plan_id, pilotRun.measurement_plan_id],
        ["coverage_status", persistedClaim.coverage_status, pilotRun.coverage_status]
      ];
      for (const [field, expected, actual] of comparisons) {
        if (String(expected) !== String(actual)) {
          gaps.push(`pilot run ${field} does not match persisted Claim Readiness Snapshot`);
        }
      }
      const missingCaveats = missingFrom(
        persistedClaim.required_caveats,
        asStringArray(pilotRun.required_caveats)
      );
      if (missingCaveats.length > 0) {
        gaps.push(`pilot run required_caveats missing persisted Claim Readiness Snapshot caveat(s): ${missingCaveats.join(", ")}`);
      }
      const missingBlockedUses = missingFrom(
        persistedClaim.blocked_uses,
        asStringArray(pilotRun.blocked_uses)
      );
      if (missingBlockedUses.length > 0) {
        gaps.push(`pilot run blocked_uses missing persisted Claim Readiness Snapshot blocked use(s): ${missingBlockedUses.join(", ")}`);
      }
    }
  }

  if (executiveReadoutPersisted) {
    const executiveReadoutSnapshotVersion = requirePersistenceVersion(
      pilotRun,
      "Pilot Run Executive Readout Snapshot lineage",
      [
        "validation.executive_readout_snapshot_version",
        "validation.executive_readout_snapshot_persistence_version"
      ]
    );
    const persistedReadout = await loadLatestExecutiveReadoutSnapshotRecord(
      orgId,
      asString(pilotRun.executive_readout_snapshot_id),
      executiveReadoutSnapshotVersion
    );
    if (!persistedReadout) {
      gaps.push(`persisted Executive Readout Snapshot version ${executiveReadoutSnapshotVersion} is required before pilot run lineage can record it`);
    } else {
      const comparisons: Array<[string, unknown, unknown]> = [
        ["claim_readiness_snapshot_id", persistedReadout.claim_readiness_snapshot_id, pilotRun.claim_readiness_snapshot_id],
        ["evidence_snapshot_id", persistedReadout.evidence_snapshot_id, pilotRun.evidence_snapshot_id],
        ["claim_readiness_handoff_id", persistedReadout.handoff_id, pilotRun.claim_readiness_handoff_id],
        ["measurement_plan_id", persistedReadout.measurement_plan_id, pilotRun.measurement_plan_id],
        ["coverage_status", persistedReadout.coverage_status, pilotRun.coverage_status]
      ];
      for (const [field, expected, actual] of comparisons) {
        if (String(expected) !== String(actual)) {
          gaps.push(`pilot run ${field} does not match persisted Executive Readout Snapshot`);
        }
      }
      const missingCaveats = missingFrom(
        persistedReadout.required_caveats,
        asStringArray(pilotRun.required_caveats)
      );
      if (missingCaveats.length > 0) {
        gaps.push(`pilot run required_caveats missing persisted Executive Readout Snapshot caveat(s): ${missingCaveats.join(", ")}`);
      }
      const missingBlockedUses = missingFrom(
        persistedReadout.blocked_uses,
        asStringArray(pilotRun.blocked_uses)
      );
      if (missingBlockedUses.length > 0) {
        gaps.push(`pilot run blocked_uses missing persisted Executive Readout Snapshot blocked use(s): ${missingBlockedUses.join(", ")}`);
      }
    }
  }

  if (gaps.length > 0) {
    throw new AiValuePersistenceValidationError(
      "Pilot Run snapshot lineage failed validation before persistence",
      gaps
    );
  }
};

const validateMeasurementCellAssemblyPayload = (
  payload: Record<string, unknown> | null | undefined,
  expected: {
    run: Record<string, unknown>;
    cell: Record<string, unknown>;
  }
): Record<string, unknown> | null => {
  if (payload === undefined || payload === null) return null;
  const gaps = unsupportedFields(
    payload,
    MEASUREMENT_CELL_ASSEMBLY_PAYLOAD_ALLOWED_FIELDS,
    "assembly_payload"
  );
  const validation = asRecord(payload.validation);
  if (Object.keys(validation).length > 0) {
    gaps.push(
      ...unsupportedFields(
        validation,
        MEASUREMENT_CELL_ASSEMBLY_PAYLOAD_VALIDATION_ALLOWED_FIELDS,
        "assembly_payload.validation"
      )
    );
  }
  compareField(
    gaps,
    "assembly_payload.assembly_run_id must match Measurement Cell Assembly Run",
    asString(expected.run.run_id),
    payload.assembly_run_id
  );
  compareField(
    gaps,
    "assembly_payload.assembly_decision must match Measurement Cell Assembly Run",
    asString(expected.run.decision),
    payload.assembly_decision
  );
  compareField(
    gaps,
    "assembly_payload.measurement_cell_id must match Measurement Cell",
    asString(expected.cell.measurement_cell_id),
    payload.measurement_cell_id
  );
  if (Object.keys(validation).length === 0) {
    gaps.push("assembly_payload.validation is required when assembly_payload is present");
  } else {
    compareField(
      gaps,
      "assembly_payload.validation.validator must be validateMeasurementCellAssemblyRun",
      "validateMeasurementCellAssemblyRun",
      validation.validator
    );
    compareField(
      gaps,
      "assembly_payload.validation.valid must be true",
      true,
      validation.valid
    );
    compareField(
      gaps,
      "assembly_payload.validation.run_id must match Measurement Cell Assembly Run",
      asString(expected.run.run_id),
      validation.run_id
    );
    const validationMeasurementCellId = asOptionalString(
      validation.measurement_cell_id
    );
    if (validationMeasurementCellId !== null) {
      compareField(
        gaps,
        "assembly_payload.validation.measurement_cell_id must match Measurement Cell",
        asString(expected.cell.measurement_cell_id),
        validationMeasurementCellId
      );
    }
  }
  compareField(
    gaps,
    "assembly_payload.required_caveats must match Measurement Cell caveats",
    sortedStrings(asStringArray(expected.cell.required_caveats)),
    sortedStrings(asStringArray(payload.required_caveats))
  );
  compareField(
    gaps,
    "assembly_payload.blocked_uses must match Measurement Cell blocked uses",
    sortedStrings(asStringArray(expected.cell.blocked_uses)),
    sortedStrings(asStringArray(payload.blocked_uses))
  );
  enforceMeasurementCellSnapshotDenylist(
    payload,
    "Measurement Cell Snapshot assembly payload"
  );
  if (payload.source_refs !== undefined && payload.source_refs !== null) {
    const compactPayloadSourceRefs = compactMeasurementCellSnapshotSourceRefs(
      asRecord(payload.source_refs)
    );
    compareField(
      gaps,
      "assembly_payload.source_refs must match compact Measurement Cell Snapshot source refs",
      asRecord(expected.cell.source_refs),
      compactPayloadSourceRefs
    );
  }
  if (gaps.length > 0) {
    throw new AiValuePersistenceValidationError(
      "Measurement Cell Snapshot assembly payload is not compact",
      gaps
    );
  }
  return payload;
};

const measurementCellSnapshotVersionLineageGaps = (
  record: AiValueMeasurementCellSnapshotStoredRecord,
  superseded: AiValueMeasurementCellSnapshotStoredRecord
): string[] => {
  if (superseded.version !== record.version - 1) {
    return [
      `supersedes_id must reference the immediately previous version ${record.version - 1}; referenced version ${superseded.version}`
    ];
  }
  return [];
};

const ensureMeasurementCellSnapshotSupersedes = async (
  record: AiValueMeasurementCellSnapshotStoredRecord
): Promise<void> => {
  if (record.version === 1) {
    if (record.supersedes_id) {
      throw new AiValuePersistenceValidationError(
        "Initial Measurement Cell Snapshot versions cannot supersede another snapshot",
        ["supersedes_id must be null when version is 1"]
      );
    }
    return;
  }
  if (!record.supersedes_id) {
    throw new AiValuePersistenceValidationError(
      "Measurement Cell Snapshot corrections require explicit lineage",
      ["supersedes_id is required when version is greater than 1"]
    );
  }
  if (!usePrisma()) {
    const superseded = Array.from(store.aiValueMeasurementCellSnapshots.values()).find(
      (entry) => entry.id === record.supersedes_id
    );
    if (
      !superseded ||
      superseded.org_id !== record.org_id ||
      superseded.measurement_cell_id !== record.measurement_cell_id
    ) {
      throw new AiValuePersistenceValidationError(
        "Measurement Cell Snapshot supersedes_id must reference the same cell",
        ["supersedes_id must reference an existing snapshot for the same org and measurement_cell_id"]
      );
    }
    const versionGaps = measurementCellSnapshotVersionLineageGaps(record, superseded);
    if (versionGaps.length > 0) {
      throw new AiValuePersistenceValidationError(
        "Measurement Cell Snapshot correction must supersede the immediately previous version",
        versionGaps
      );
    }
    const lineageGaps = measurementCellSnapshotLineageDriftGaps(record, superseded);
    if (lineageGaps.length > 0) {
      throw new AiValuePersistenceValidationError(
        "Measurement Cell Snapshot correction cannot change selected path, metric, or milestone identity",
        lineageGaps
      );
    }
    return;
  }
  const superseded = await getPrisma().measurementCellSnapshot.findUnique({
    where: { id: record.supersedes_id }
  });
  if (
    !superseded ||
    superseded.orgId !== record.org_id ||
    superseded.measurementCellId !== record.measurement_cell_id
  ) {
    throw new AiValuePersistenceValidationError(
      "Measurement Cell Snapshot supersedes_id must reference the same cell",
      ["supersedes_id must reference an existing snapshot for the same org and measurement_cell_id"]
    );
  }
  const supersededRecord = measurementCellSnapshotRowToRecord(superseded);
  const versionGaps = measurementCellSnapshotVersionLineageGaps(
    record,
    supersededRecord
  );
  if (versionGaps.length > 0) {
    throw new AiValuePersistenceValidationError(
      "Measurement Cell Snapshot correction must supersede the immediately previous version",
      versionGaps
    );
  }
  const lineageGaps = measurementCellSnapshotLineageDriftGaps(
    record,
    supersededRecord
  );
  if (lineageGaps.length > 0) {
    throw new AiValuePersistenceValidationError(
      "Measurement Cell Snapshot correction cannot change selected path, metric, or milestone identity",
      lineageGaps
    );
  }
};

const measurementCellSnapshotLineageDriftGaps = (
  record: AiValueMeasurementCellSnapshotStoredRecord,
  superseded: AiValueMeasurementCellSnapshotStoredRecord
): string[] => {
  const gaps: string[] = [];
  const dateOnlyFields = new Set([
    "baseline_window_start",
    "baseline_window_end",
    "comparison_window_start",
    "comparison_window_end"
  ]);
  for (const field of [
    "measurement_plan_id",
    "value_hypothesis_id",
    "value_hypothesis_ref",
    "value_hypothesis_binding_state",
    "approved_blueprint_ref",
    "approved_blueprint_payload_hash",
    "blueprint_expectation_ref",
    "expectation_path_id",
    "expectation_path_version",
    "expectation_path_hash",
    "approval_state",
    "approved_at",
    "approved_by_role",
    "value_driver",
    "metric_id",
    "metric_definition_ref",
    "metric_definition_hash",
    "metric_owner_approval_state",
    "metric_direction",
    "metric_unit",
    "expected_metric_lag_days",
    "workflow_family",
    "workflow_id",
    "function_area",
    "cohort_key",
    "window_mode",
    "milestone_day",
    "baseline_window_start",
    "baseline_window_end",
    "comparison_window_start",
    "comparison_window_end"
  ] as const) {
    const expected = dateOnlyFields.has(field)
      ? normalizeDateOnlyForComparison(superseded[field])
      : superseded[field];
    const actual = dateOnlyFields.has(field)
      ? normalizeDateOnlyForComparison(record[field])
      : record[field];
    compareField(
      gaps,
      `superseded Measurement Cell Snapshot ${field} must match correction`,
      expected,
      actual
    );
  }
  return gaps;
};

const buildMeasurementCellSnapshotRecord = (
  input: PersistAiValueMeasurementCellSnapshotInput
): AiValueMeasurementCellSnapshotStoredRecord => {
  const run = input.measurementCellAssemblyRun;
  enforceRawSourceIdentifierDenylist(
    run,
    "Measurement Cell Assembly Run"
  );
  const cell = asRecord(run.measurement_cell);
  const measurementCellValidation = aiValueEngine.validateMeasurementCell(cell);
  requireValid(measurementCellValidation, "Measurement Cell");
  const assemblyValidation = aiValueEngine.validateMeasurementCellAssemblyRun(run);
  requireValid(assemblyValidation, "Measurement Cell Assembly Run");

  const embeddedCellValidation = asRecord(run.measurement_cell_validation_result);
  if (
    Object.keys(embeddedCellValidation).length === 0 ||
    stableStringify(embeddedCellValidation) !== stableStringify(measurementCellValidation)
  ) {
    throw new AiValuePersistenceValidationError(
      "Measurement Cell Snapshot validation must be recomputed and match embedded validation",
      ["measurement_cell_validation_result must match recomputed Measurement Cell validation"]
    );
  }

  const alignment = asRecord(cell.blueprint_alignment);
  if (hasOwn(alignment, "approved_expectation_paths")) {
    throw new AiValuePersistenceValidationError(
      "Measurement Cell Snapshot cannot persist full expectation-path registries",
      ["measurement_cell.blueprint_alignment.approved_expectation_paths is not allowed"]
    );
  }
  const selectedPath = asRecord(alignment.approved_expectation_path);
  const metric = asRecord(cell.selected_metric);
  const timeWindow = asRecord(cell.time_window);
  const baselineWindow = asRecord(timeWindow.baseline_window);
  const comparisonWindow = asRecord(timeWindow.comparison_window);
  const valueHypothesis = asRecord(asRecord(run.measurement_plan).value_hypothesis);
  const handoff = asRecord(run.blueprint_operator_source_handoff);
  const handoffContext = asRecord(handoff.blueprint_alignment_context);
  const sourceRefs = compactMeasurementCellSnapshotSourceRefs(
    asRecord(cell.source_refs)
  );
  const gaps: string[] = [];

  const expectationPathId = requireStringField(
    alignment.expectation_path_id,
    "expectation_path_id",
    gaps
  );
  compareField(
    gaps,
    "Measurement Cell selected path id must match approved expectation path",
    expectationPathId,
    selectedPath.expectation_path_id
  );
  compareField(
    gaps,
    "Measurement Cell selected path id must match Blueprint handoff",
    expectationPathId,
    handoffContext.expectation_path_id
  );
  compareField(
    gaps,
    "Measurement Cell selected metric must match approved expectation path",
    metric.metric_id,
    selectedPath.expected_metric_id
  );
  compareField(
    gaps,
    "Measurement Cell metric direction must match approved expectation path",
    metric.metric_direction,
    selectedPath.expected_metric_direction
  );
  compareField(
    gaps,
    "Measurement Cell expected lag must match approved expectation path",
    metric.expected_lag_days,
    selectedPath.expected_metric_lag_days
  );
  const approvalState = requireStringField(
    alignment.blueprint_customer_approval_state,
    "approval_state",
    gaps
  );
  if (approvalState !== "approved") {
    gaps.push("approval_state must be approved");
  }
  const approvedByRole = requireStringField(
    alignment.blueprint_customer_approver_role ?? selectedPath.approver_role,
    "approved_by_role",
    gaps
  );
  const valueDriver = titleCaseValueDriver(selectedPath.value_driver ?? alignment.value_driver);
  if (!valueDriver) {
    gaps.push("value_driver must be one of Revenue, Cost, Capacity, Quality, or Risk");
  }
  const expectationPathVersion = requirePositiveIntegerField(
    selectedPath.expectation_path_version ?? 1,
    "expectation_path_version",
    gaps
  );
  const metricId = requireStringField(metric.metric_id, "metric_id", gaps);
  const metricDefinitionRef = requireStringField(
    metric.source_ref,
    "metric_definition_ref",
    gaps
  );
  const metricOwnerApprovalState = requireStringField(
    metric.owner_approval_state,
    "metric_owner_approval_state",
    gaps
  );
  const metricDirection = requireStringField(
    metric.metric_direction,
    "metric_direction",
    gaps
  );
  const metricUnit = requireStringField(metric.metric_unit, "metric_unit", gaps);
  const expectedMetricLagDays = Number(metric.expected_lag_days);
  if (!Number.isInteger(expectedMetricLagDays) || expectedMetricLagDays < 0) {
    gaps.push("expected_metric_lag_days must be a non-negative integer");
  }
  const approvedAt = requireStringField(
    selectedPath.approved_at ??
      alignment.blueprint_customer_approved_at ??
      handoffContext.blueprint_customer_approved_at,
    "approved_at",
    gaps
  );
  compareField(
    gaps,
    "Measurement Cell approval timestamp must match approved expectation path",
    approvedAt,
    selectedPath.approved_at
  );
  compareField(
    gaps,
    "Measurement Cell approval timestamp must match Blueprint alignment",
    approvedAt,
    alignment.blueprint_customer_approved_at
  );
  compareField(
    gaps,
    "Measurement Cell approval timestamp must match Blueprint handoff",
    approvedAt,
    handoffContext.blueprint_customer_approved_at
  );
  const milestoneDay = requireIntegerOrNull(
    timeWindow.days_since_launch,
    "milestone_day",
    gaps
  );
  if (timeWindow.window_mode === "milestone" && milestoneDay === null) {
    gaps.push("milestone_day is required for milestone Measurement Cell snapshots");
  }
  if (
    milestoneDay !== null &&
    ![0, 30, 60, 90, 180, 365].includes(milestoneDay)
  ) {
    gaps.push("milestone_day must be one of Day 0, 30, 60, 90, 180, or 365");
  }
  const generatedAt = requireStringField(run.generated_at, "generated_at", gaps);
  const blockedUses = canonicalMeasurementCellSnapshotBlockedUses(
    asStringArray(cell.blocked_uses)
  );
  const requiredCaveats = canonicalMeasurementCellSnapshotCaveats(
    asStringArray(cell.required_caveats)
  );
  if (timeWindow.window_mode === "rolling_30_day") {
    gaps.push("rolling_30_day Measurement Cells cannot be persisted as milestone evidence");
  }
  if (gaps.length > 0) {
    throw new AiValuePersistenceValidationError(
      "Measurement Cell Snapshot binding failed validation before persistence",
      gaps
    );
  }

  parseDate(asString(baselineWindow.window_start), "baseline_window_start");
  parseDate(asString(baselineWindow.window_end), "baseline_window_end");
  parseDate(asString(comparisonWindow.window_start), "comparison_window_start");
  parseDate(asString(comparisonWindow.window_end), "comparison_window_end");
  parseDate(approvedAt, "approved_at");
  parseDate(generatedAt, "generated_at");

  const expectationPathHash = stableHash(selectedPath);
  const approvedBlueprintPayloadHash = stableHash(handoffContext);
  const metricDefinitionHash = stableHash({
    metric_id: metricId,
    metric_name: metric.metric_name,
    metric_source_system: metric.metric_source_system,
    metric_unit: metricUnit,
    metric_direction: metricDirection,
    owner_approval_state: metricOwnerApprovalState,
    source_ref: metricDefinitionRef
  });
  const blueprintPathBinding = {
    expectation_path_id: expectationPathId,
    expectation_path_version: expectationPathVersion,
    expectation_path_hash: expectationPathHash,
    approved_blueprint_payload_hash: approvedBlueprintPayloadHash,
    approved_blueprint_ref: asString(alignment.source_ref),
    blueprint_expectation_ref: asString(alignment.blueprint_expectation_ref),
    approval_state: approvalState,
    approved_at: approvedAt,
    approved_by_role: approvedByRole,
    value_driver: valueDriver,
    expected_metric_id: metricId,
    expected_metric_direction: metricDirection,
    expected_metric_lag_days: expectedMetricLagDays
  };
  const compactPayload = {
    measurement_cell_id: asString(cell.measurement_cell_id),
    org_id: asString(cell.org_id),
    client_id: asOptionalString(run.client_id),
    measurement_plan_id: asString(run.measurement_plan_id),
    measurement_cell_assembly_run_id: asString(run.run_id),
    workflow_family: asString(cell.workflow_family),
    workflow_id: asOptionalString(cell.workflow_id),
    function_area: asString(cell.function_area),
    cohort_key: asString(cell.cohort_key),
    time_window: {
      time_window_id: asString(timeWindow.time_window_id),
      window_mode: asString(timeWindow.window_mode),
      milestone_day: milestoneDay,
      baseline_window: {
        window_start: asString(baselineWindow.window_start),
        window_end: asString(baselineWindow.window_end)
      },
      comparison_window: {
        window_start: asString(comparisonWindow.window_start),
        window_end: asString(comparisonWindow.window_end)
      }
    },
    selected_path: blueprintPathBinding,
    selected_metric: {
      metric_id: metricId,
      metric_definition_ref: metricDefinitionRef,
      metric_definition_hash: metricDefinitionHash,
      metric_owner_approval_state: metricOwnerApprovalState,
      metric_direction: metricDirection,
      metric_unit: metricUnit,
      expected_metric_lag_days: expectedMetricLagDays,
      baseline_value: metric.baseline_value ?? null,
      comparison_value: metric.comparison_value ?? null
    },
    source_refs: sourceRefs,
    assembly_decision: asString(run.decision)
  };
  const assemblyPayload = validateMeasurementCellAssemblyPayload(
    input.assemblyPayload ?? null,
    {
      run,
      cell: {
        ...cell,
        source_refs: sourceRefs,
        required_caveats: requiredCaveats,
        blocked_uses: blockedUses
      }
    }
  );

  enforceMeasurementCellSnapshotDenylist(compactPayload, "Measurement Cell Snapshot payload");
  enforceMeasurementCellSnapshotDenylist(
    compactValidation(measurementCellValidation as unknown as Record<string, unknown>, "validateMeasurementCell"),
    "Measurement Cell Snapshot validation"
  );
  enforceMeasurementCellSnapshotDenylist(
    compactValidation(assemblyValidation as unknown as Record<string, unknown>, "validateMeasurementCellAssemblyRun"),
    "Measurement Cell Snapshot assembly validation"
  );
  enforceSourceRefs(sourceRefs, "Measurement Cell Snapshot source refs");
  enforceMeasurementCellSnapshotDenylist(
    sourceRefs,
    "Measurement Cell Snapshot source refs"
  );
  enforceMeasurementCellSnapshotDenylist(
    blueprintPathBinding,
    "Measurement Cell Snapshot Blueprint path binding"
  );
  enforceMeasurementCellSnapshotDenylist(
    { required_caveats: requiredCaveats },
    "Measurement Cell Snapshot caveats"
  );
  enforceMeasurementCellSnapshotDenylist(
    { blocked_uses: blockedUses },
    "Measurement Cell Snapshot blocked uses"
  );

  return {
    id: randomUUID(),
    org_id: asString(cell.org_id),
    client_id: asOptionalString(run.client_id),
    measurement_cell_id: asString(cell.measurement_cell_id),
    measurement_cell_assembly_run_id: asString(run.run_id),
    measurement_plan_id: asString(run.measurement_plan_id),
    value_hypothesis_id: asOptionalString(valueHypothesis.value_hypothesis_id),
    value_hypothesis_ref: asOptionalString(valueHypothesis.value_hypothesis_ref),
    value_hypothesis_binding_state: asOptionalString(valueHypothesis.value_hypothesis_id) ||
      asOptionalString(valueHypothesis.value_hypothesis_ref)
      ? "bound"
      : "inapplicable",
    approved_blueprint_ref: asString(alignment.source_ref),
    approved_blueprint_payload_hash: approvedBlueprintPayloadHash,
    blueprint_expectation_ref: asString(alignment.blueprint_expectation_ref),
    expectation_path_id: expectationPathId,
    expectation_path_version: expectationPathVersion,
    expectation_path_hash: expectationPathHash,
    approval_state: approvalState,
    approved_at: approvedAt,
    approved_by_role: approvedByRole,
    value_driver: valueDriver ?? "",
    metric_id: metricId,
    metric_definition_ref: metricDefinitionRef,
    metric_definition_hash: metricDefinitionHash,
    metric_owner_approval_state: metricOwnerApprovalState,
    metric_direction: metricDirection,
    metric_unit: metricUnit,
    expected_metric_lag_days: expectedMetricLagDays,
    workflow_family: asString(cell.workflow_family),
    workflow_id: asOptionalString(cell.workflow_id),
    function_area: asString(cell.function_area),
    cohort_key: asString(cell.cohort_key),
    window_mode: asString(timeWindow.window_mode),
    milestone_day: milestoneDay as number,
    baseline_window_start: asString(baselineWindow.window_start),
    baseline_window_end: asString(baselineWindow.window_end),
    comparison_window_start: asString(comparisonWindow.window_start),
    comparison_window_end: asString(comparisonWindow.window_end),
    assembly_decision: asString(run.decision),
    payload: compactPayload,
    assembly_payload: assemblyPayload,
    validation: compactValidation(
      measurementCellValidation as unknown as Record<string, unknown>,
      "validateMeasurementCell"
    ),
    assembly_validation: compactValidation(
      assemblyValidation as unknown as Record<string, unknown>,
      "validateMeasurementCellAssemblyRun"
    ),
    source_refs: sourceRefs,
    blueprint_path_binding: blueprintPathBinding,
    required_caveats: requiredCaveats,
    blocked_uses: blockedUses,
    version: input.version,
    supersedes_id: input.supersedesId ?? null,
    generated_at: generatedAt,
    created_at: new Date().toISOString(),
    created_by_role: input.createdByRole
  };
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

export async function persistAiValueMeasurementCellSnapshot(
  input: PersistAiValueMeasurementCellSnapshotInput
): Promise<AiValueMeasurementCellSnapshotStoredRecord> {
  ensureVersion(input.version);
  enforceSafeMetadata(
    {
      createdByRole: input.createdByRole,
      supersedesId: input.supersedesId ?? null
    },
    "Measurement Cell Snapshot metadata"
  );
  const record = buildMeasurementCellSnapshotRecord(input);
  const key = measurementCellSnapshotKey(
    record.org_id,
    record.measurement_cell_id,
    record.version
  );
  rejectDuplicate(store.aiValueMeasurementCellSnapshots.has(key));
  await ensureMeasurementCellSnapshotSupersedes(record);

  if (!usePrisma()) {
    store.aiValueMeasurementCellSnapshots.set(key, record);
    return record;
  }

  try {
    const created = await getPrisma().measurementCellSnapshot.create({
      data: {
        id: record.id,
        orgId: record.org_id,
        clientId: record.client_id,
        measurementCellId: record.measurement_cell_id,
        measurementCellAssemblyRunId: record.measurement_cell_assembly_run_id,
        measurementPlanId: record.measurement_plan_id,
        valueHypothesisId: record.value_hypothesis_id,
        valueHypothesisRef: record.value_hypothesis_ref,
        valueHypothesisBindingState: record.value_hypothesis_binding_state,
        approvedBlueprintRef: record.approved_blueprint_ref,
        approvedBlueprintPayloadHash: record.approved_blueprint_payload_hash,
        blueprintExpectationRef: record.blueprint_expectation_ref,
        expectationPathId: record.expectation_path_id,
        expectationPathVersion: record.expectation_path_version,
        expectationPathHash: record.expectation_path_hash,
        approvalState: record.approval_state,
        approvedAt: parseDate(record.approved_at, "approved_at"),
        approvedByRole: record.approved_by_role,
        valueDriver: record.value_driver,
        metricId: record.metric_id,
        metricDefinitionRef: record.metric_definition_ref,
        metricDefinitionHash: record.metric_definition_hash,
        metricOwnerApprovalState: record.metric_owner_approval_state,
        metricDirection: record.metric_direction,
        metricUnit: record.metric_unit,
        expectedMetricLagDays: record.expected_metric_lag_days,
        workflowFamily: record.workflow_family,
        workflowId: record.workflow_id,
        functionArea: record.function_area,
        cohortKey: record.cohort_key,
        windowMode: record.window_mode,
        milestoneDay: record.milestone_day,
        baselineWindowStart: parseDate(record.baseline_window_start, "baseline_window_start"),
        baselineWindowEnd: parseDate(record.baseline_window_end, "baseline_window_end"),
        comparisonWindowStart: parseDate(record.comparison_window_start, "comparison_window_start"),
        comparisonWindowEnd: parseDate(record.comparison_window_end, "comparison_window_end"),
        assemblyDecision: record.assembly_decision,
        payloadJson: record.payload as Prisma.InputJsonValue,
        assemblyPayloadJson: record.assembly_payload === null
          ? Prisma.DbNull
          : record.assembly_payload as Prisma.InputJsonValue,
        validationJson: record.validation as Prisma.InputJsonValue,
        assemblyValidationJson: record.assembly_validation as Prisma.InputJsonValue,
        sourceRefsJson: record.source_refs as Prisma.InputJsonValue,
        blueprintPathBindingJson: record.blueprint_path_binding as Prisma.InputJsonValue,
        requiredCaveatsJson: record.required_caveats as Prisma.InputJsonValue,
        blockedUsesJson: record.blocked_uses as Prisma.InputJsonValue,
        version: record.version,
        supersedesId: record.supersedes_id,
        generatedAt: parseDate(record.generated_at, "generated_at"),
        createdAt: new Date(record.created_at),
        createdByRole: record.created_by_role
      }
    });
    const createdRecord = measurementCellSnapshotRowToRecord(created);
    store.aiValueMeasurementCellSnapshots.set(key, createdRecord);
    return createdRecord;
  } catch (error: any) {
    return translatePrismaDuplicate(error);
  }
}

export async function persistAiValueClaimReadinessSnapshot(
  input: PersistAiValueClaimReadinessSnapshotInput
): Promise<AiValueClaimReadinessSnapshotStoredRecord> {
  ensureVersion(input.version);
  enforceSafeMetadata(
    {
      createdByRole: input.createdByRole,
      supersedesId: input.supersedesId ?? null
    },
    "Claim Readiness Snapshot metadata"
  );
  enforcePersistenceDenylist(
    input.claimReadinessSnapshot,
    "Claim Readiness Snapshot"
  );
  const validation = aiValueEngine.validateClaimReadinessSnapshot(
    input.claimReadinessSnapshot
  );
  requireValid(validation, "Claim Readiness Snapshot");
  await ensureClaimSnapshotBoundToPersistedEvidence(input.claimReadinessSnapshot);

  const snapshot = input.claimReadinessSnapshot;
  const orgId = asString(snapshot.org_id);
  const claimReadinessSnapshotId = asString(snapshot.claim_readiness_snapshot_id);
  const key = claimReadinessSnapshotKey(
    orgId,
    claimReadinessSnapshotId,
    input.version
  );
  rejectDuplicate(store.aiValueClaimReadinessSnapshots.has(key));
  enforceSourceRefs(
    asRecord(snapshot.source_refs),
    "Claim Readiness Snapshot source refs"
  );

  const financialBoundary = asRecord(snapshot.financial_boundary);
  const executiveBoundary = asRecord(snapshot.executive_readout_boundary);
  const record: AiValueClaimReadinessSnapshotStoredRecord = {
    id: randomUUID(),
    org_id: orgId,
    claim_readiness_snapshot_id: claimReadinessSnapshotId,
    evidence_snapshot_id: asString(snapshot.evidence_snapshot_id),
    handoff_id: asString(snapshot.handoff_id),
    measurement_plan_id: asString(snapshot.measurement_plan_id),
    schema_version: asString(snapshot.schema_version),
    derivation_version: asString(snapshot.derivation_version),
    coverage_status: asString(snapshot.coverage_status),
    claim_readiness_state: asString(snapshot.claim_readiness_state),
    financial_boundary_state: asString(financialBoundary.financial_claim_governance_state),
    executive_readout_allowed: asBoolean(executiveBoundary.executive_readout_allowed),
    customer_facing_readout_allowed: asBoolean(executiveBoundary.customer_facing_readout_allowed),
    customer_facing_financial_output_allowed:
      asBoolean(financialBoundary.customer_facing_financial_output_allowed),
    payload: snapshot,
    validation: validation as unknown as Record<string, unknown>,
    source_refs: asRecord(snapshot.source_refs),
    required_caveats: asStringArray(snapshot.required_caveats),
    blocked_uses: asStringArray(snapshot.blocked_uses),
    blocked_claims: asStringArray(snapshot.blocked_claims),
    version: input.version,
    supersedes_id: input.supersedesId ?? null,
    created_at: asString(snapshot.created_at),
    created_by_role: input.createdByRole
  };

  parseDate(record.created_at, "created_at");
  if (record.customer_facing_readout_allowed) {
    throw new AiValuePersistenceValidationError(
      "Claim Readiness Snapshot customer-facing readout is blocked",
      ["customer_facing_readout_allowed must be false"]
    );
  }
  if (record.customer_facing_financial_output_allowed) {
    throw new AiValuePersistenceValidationError(
      "Claim Readiness Snapshot customer-facing financial output is blocked",
      ["customer_facing_financial_output_allowed must be false"]
    );
  }

  if (!usePrisma()) {
    store.aiValueClaimReadinessSnapshots.set(key, record);
    return record;
  }

  try {
    const created = await getPrisma().claimReadinessSnapshot.create({
      data: {
        id: record.id,
        orgId: record.org_id,
        claimReadinessSnapshotId: record.claim_readiness_snapshot_id,
        evidenceSnapshotId: record.evidence_snapshot_id,
        handoffId: record.handoff_id,
        measurementPlanId: record.measurement_plan_id,
        schemaVersion: record.schema_version,
        derivationVersion: record.derivation_version,
        coverageStatus: record.coverage_status,
        claimReadinessState: record.claim_readiness_state,
        financialBoundaryState: record.financial_boundary_state,
        executiveReadoutAllowed: record.executive_readout_allowed,
        customerFacingReadoutAllowed: record.customer_facing_readout_allowed,
        customerFacingFinancialOutputAllowed:
          record.customer_facing_financial_output_allowed,
        payloadJson: record.payload as Prisma.InputJsonValue,
        validationJson: record.validation as Prisma.InputJsonValue,
        sourceRefsJson: record.source_refs as Prisma.InputJsonValue,
        requiredCaveatsJson: record.required_caveats as Prisma.InputJsonValue,
        blockedUsesJson: record.blocked_uses as Prisma.InputJsonValue,
        blockedClaimsJson: record.blocked_claims as Prisma.InputJsonValue,
        version: record.version,
        supersedesId: record.supersedes_id,
        createdAt: parseDate(record.created_at, "created_at"),
        createdByRole: record.created_by_role
      }
    });
    const createdRecord = claimReadinessSnapshotRowToRecord(created);
    store.aiValueClaimReadinessSnapshots.set(key, createdRecord);
    return createdRecord;
  } catch (error: any) {
    return translatePrismaDuplicate(error);
  }
}

export async function persistAiValueExecutiveReadoutSnapshot(
  input: PersistAiValueExecutiveReadoutSnapshotInput
): Promise<AiValueExecutiveReadoutSnapshotStoredRecord> {
  ensureVersion(input.version);
  enforceSafeMetadata(
    {
      createdByRole: input.createdByRole,
      supersedesId: input.supersedesId ?? null
    },
    "Executive Readout Snapshot metadata"
  );
  enforcePersistenceDenylist(
    input.executiveReadoutSnapshot,
    "Executive Readout Snapshot"
  );
  const validation = aiValueEngine.validateExecutiveReadoutSnapshot(
    input.executiveReadoutSnapshot
  );
  requireValid(validation, "Executive Readout Snapshot");
  await ensureExecutiveReadoutBoundToPersistedClaimSnapshot(
    input.executiveReadoutSnapshot
  );

  const snapshot = input.executiveReadoutSnapshot;
  const orgId = asString(snapshot.org_id);
  const executiveReadoutSnapshotId = asString(snapshot.executive_readout_snapshot_id);
  const key = executiveReadoutSnapshotKey(
    orgId,
    executiveReadoutSnapshotId,
    input.version
  );
  rejectDuplicate(store.aiValueExecutiveReadoutSnapshots.has(key));
  enforceSourceRefs(
    asRecord(snapshot.source_refs),
    "Executive Readout Snapshot source refs"
  );

  const financialBoundary = asRecord(snapshot.financial_boundary);
  const executiveBoundary = asRecord(snapshot.executive_readout_boundary);
  const record: AiValueExecutiveReadoutSnapshotStoredRecord = {
    id: randomUUID(),
    org_id: orgId,
    executive_readout_snapshot_id: executiveReadoutSnapshotId,
    claim_readiness_snapshot_id: asString(snapshot.claim_readiness_snapshot_id),
    evidence_snapshot_id: asString(snapshot.evidence_snapshot_id),
    handoff_id: asString(snapshot.handoff_id),
    measurement_plan_id: asString(snapshot.measurement_plan_id),
    schema_version: asString(snapshot.schema_version),
    derivation_version: asString(snapshot.derivation_version),
    readout_audience: asString(snapshot.readout_audience),
    readout_state: asString(snapshot.readout_state),
    coverage_status: asString(snapshot.coverage_status),
    customer_facing_readout_allowed:
      asBoolean(executiveBoundary.customer_facing_readout_allowed),
    customer_facing_financial_output_allowed:
      asBoolean(financialBoundary.customer_facing_financial_output_allowed),
    payload: snapshot,
    validation: validation as unknown as Record<string, unknown>,
    source_refs: asRecord(snapshot.source_refs),
    required_caveats: asStringArray(snapshot.required_caveats),
    blocked_uses: asStringArray(snapshot.blocked_uses),
    blocked_claims: asStringArray(snapshot.blocked_claims),
    version: input.version,
    supersedes_id: input.supersedesId ?? null,
    created_at: asString(snapshot.created_at),
    created_by_role: input.createdByRole
  };

  parseDate(record.created_at, "created_at");
  if (record.customer_facing_readout_allowed) {
    throw new AiValuePersistenceValidationError(
      "Executive Readout Snapshot customer-facing readout is blocked",
      ["customer_facing_readout_allowed must be false"]
    );
  }
  if (record.customer_facing_financial_output_allowed) {
    throw new AiValuePersistenceValidationError(
      "Executive Readout Snapshot customer-facing financial output is blocked",
      ["customer_facing_financial_output_allowed must be false"]
    );
  }

  if (!usePrisma()) {
    store.aiValueExecutiveReadoutSnapshots.set(key, record);
    return record;
  }

  try {
    const created = await getPrisma().executiveReadoutSnapshot.create({
      data: {
        id: record.id,
        orgId: record.org_id,
        executiveReadoutSnapshotId: record.executive_readout_snapshot_id,
        claimReadinessSnapshotId: record.claim_readiness_snapshot_id,
        evidenceSnapshotId: record.evidence_snapshot_id,
        handoffId: record.handoff_id,
        measurementPlanId: record.measurement_plan_id,
        schemaVersion: record.schema_version,
        derivationVersion: record.derivation_version,
        readoutAudience: record.readout_audience,
        readoutState: record.readout_state,
        coverageStatus: record.coverage_status,
        customerFacingReadoutAllowed: record.customer_facing_readout_allowed,
        customerFacingFinancialOutputAllowed:
          record.customer_facing_financial_output_allowed,
        payloadJson: record.payload as Prisma.InputJsonValue,
        validationJson: record.validation as Prisma.InputJsonValue,
        sourceRefsJson: record.source_refs as Prisma.InputJsonValue,
        requiredCaveatsJson: record.required_caveats as Prisma.InputJsonValue,
        blockedUsesJson: record.blocked_uses as Prisma.InputJsonValue,
        blockedClaimsJson: record.blocked_claims as Prisma.InputJsonValue,
        version: record.version,
        supersedesId: record.supersedes_id,
        createdAt: parseDate(record.created_at, "created_at"),
        createdByRole: record.created_by_role
      }
    });
    const createdRecord = executiveReadoutSnapshotRowToRecord(created);
    store.aiValueExecutiveReadoutSnapshots.set(key, createdRecord);
    return createdRecord;
  } catch (error: any) {
    return translatePrismaDuplicate(error);
  }
}

export async function persistAiValuePilotRun(
  input: PersistAiValuePilotRunInput
): Promise<AiValuePilotRunStoredRecord> {
  ensureVersion(input.version);
  enforceSafeMetadata(
    {
      createdByRole: input.createdByRole,
      supersedesId: input.supersedesId ?? null
    },
    "Pilot Run metadata"
  );
  enforcePersistenceDenylist(input.pilotRun, "Pilot Run ledger record");
  validatePilotRunLedgerShape(input.pilotRun);
  await ensurePilotRunSnapshotLineage(input.pilotRun);

  const pilotRun = input.pilotRun;
  const orgId = asString(pilotRun.org_id);
  const pilotRunId = asString(pilotRun.pilot_run_id);
  const key = pilotRunKey(orgId, pilotRunId, input.version);
  rejectDuplicate(store.aiValuePilotRuns.has(key));

  const validation = asRecord(pilotRun.validation);
  const record: AiValuePilotRunStoredRecord = {
    id: randomUUID(),
    org_id: orgId,
    pilot_run_id: pilotRunId,
    measurement_plan_id: asString(pilotRun.measurement_plan_id),
    workflow_family: asString(pilotRun.workflow_family),
    source_package_ids: asStringArray(pilotRun.source_package_ids),
    evidence_snapshot_id: asString(pilotRun.evidence_snapshot_id),
    claim_readiness_handoff_id: asString(pilotRun.claim_readiness_handoff_id),
    coverage_status: asString(pilotRun.coverage_status),
    run_status: asString(pilotRun.run_status),
    validation,
    required_caveats: asStringArray(pilotRun.required_caveats),
    blocked_uses: asStringArray(pilotRun.blocked_uses),
    claim_readiness_snapshot_persisted: asBoolean(validation.claim_readiness_snapshot_persisted),
    executive_readout_snapshot_persisted: asBoolean(validation.executive_readout_snapshot_persisted),
    claim_readiness_snapshot_id: asOptionalString(pilotRun.claim_readiness_snapshot_id),
    executive_readout_snapshot_id: asOptionalString(pilotRun.executive_readout_snapshot_id),
    version: input.version,
    supersedes_id: input.supersedesId ?? null,
    generated_at: asString(pilotRun.generated_at),
    created_at: new Date().toISOString(),
    created_by_role: input.createdByRole
  };

  parseDate(record.generated_at, "generated_at");

  if (!usePrisma()) {
    store.aiValuePilotRuns.set(key, record);
    return record;
  }

  try {
    const created = await getPrisma().aiValuePilotRun.create({
      data: {
        id: record.id,
        orgId: record.org_id,
        pilotRunId: record.pilot_run_id,
        measurementPlanId: record.measurement_plan_id,
        workflowFamily: record.workflow_family,
        sourcePackageIdsJson: record.source_package_ids as Prisma.InputJsonValue,
        evidenceSnapshotId: record.evidence_snapshot_id,
        claimReadinessHandoffId: record.claim_readiness_handoff_id,
        coverageStatus: record.coverage_status,
        runStatus: record.run_status,
        validationJson: record.validation as Prisma.InputJsonValue,
        requiredCaveatsJson: record.required_caveats as Prisma.InputJsonValue,
        blockedUsesJson: record.blocked_uses as Prisma.InputJsonValue,
        claimReadinessSnapshotPersisted: record.claim_readiness_snapshot_persisted,
        executiveReadoutSnapshotPersisted: record.executive_readout_snapshot_persisted,
        claimReadinessSnapshotId: record.claim_readiness_snapshot_id,
        executiveReadoutSnapshotId: record.executive_readout_snapshot_id,
        version: record.version,
        supersedesId: record.supersedes_id,
        generatedAt: parseDate(record.generated_at, "generated_at"),
        createdAt: new Date(record.created_at),
        createdByRole: record.created_by_role
      }
    });
    const createdRecord = pilotRunRowToRecord(created);
    store.aiValuePilotRuns.set(key, createdRecord);
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

function claimReadinessSnapshotRowToRecord(row: {
  id: string;
  orgId: string;
  claimReadinessSnapshotId: string;
  evidenceSnapshotId: string;
  handoffId: string;
  measurementPlanId: string;
  schemaVersion: string;
  derivationVersion: string;
  coverageStatus: string;
  claimReadinessState: string;
  financialBoundaryState: string;
  executiveReadoutAllowed: boolean;
  customerFacingReadoutAllowed: boolean;
  customerFacingFinancialOutputAllowed: boolean;
  payloadJson: Prisma.JsonValue;
  validationJson: Prisma.JsonValue;
  sourceRefsJson: Prisma.JsonValue;
  requiredCaveatsJson: Prisma.JsonValue;
  blockedUsesJson: Prisma.JsonValue;
  blockedClaimsJson: Prisma.JsonValue;
  version: number;
  supersedesId: string | null;
  createdAt: Date;
  createdByRole: string;
}): AiValueClaimReadinessSnapshotStoredRecord {
  return {
    id: row.id,
    org_id: row.orgId,
    claim_readiness_snapshot_id: row.claimReadinessSnapshotId,
    evidence_snapshot_id: row.evidenceSnapshotId,
    handoff_id: row.handoffId,
    measurement_plan_id: row.measurementPlanId,
    schema_version: row.schemaVersion,
    derivation_version: row.derivationVersion,
    coverage_status: row.coverageStatus,
    claim_readiness_state: row.claimReadinessState,
    financial_boundary_state: row.financialBoundaryState,
    executive_readout_allowed: row.executiveReadoutAllowed,
    customer_facing_readout_allowed: row.customerFacingReadoutAllowed,
    customer_facing_financial_output_allowed:
      row.customerFacingFinancialOutputAllowed,
    payload: row.payloadJson as Record<string, unknown>,
    validation: row.validationJson as Record<string, unknown>,
    source_refs: row.sourceRefsJson as Record<string, unknown>,
    required_caveats: row.requiredCaveatsJson as string[],
    blocked_uses: row.blockedUsesJson as string[],
    blocked_claims: row.blockedClaimsJson as string[],
    version: row.version,
    supersedes_id: row.supersedesId,
    created_at: row.createdAt.toISOString(),
    created_by_role: row.createdByRole
  };
}

function executiveReadoutSnapshotRowToRecord(row: {
  id: string;
  orgId: string;
  executiveReadoutSnapshotId: string;
  claimReadinessSnapshotId: string;
  evidenceSnapshotId: string;
  handoffId: string;
  measurementPlanId: string;
  schemaVersion: string;
  derivationVersion: string;
  readoutAudience: string;
  readoutState: string;
  coverageStatus: string;
  customerFacingReadoutAllowed: boolean;
  customerFacingFinancialOutputAllowed: boolean;
  payloadJson: Prisma.JsonValue;
  validationJson: Prisma.JsonValue;
  sourceRefsJson: Prisma.JsonValue;
  requiredCaveatsJson: Prisma.JsonValue;
  blockedUsesJson: Prisma.JsonValue;
  blockedClaimsJson: Prisma.JsonValue;
  version: number;
  supersedesId: string | null;
  createdAt: Date;
  createdByRole: string;
}): AiValueExecutiveReadoutSnapshotStoredRecord {
  return {
    id: row.id,
    org_id: row.orgId,
    executive_readout_snapshot_id: row.executiveReadoutSnapshotId,
    claim_readiness_snapshot_id: row.claimReadinessSnapshotId,
    evidence_snapshot_id: row.evidenceSnapshotId,
    handoff_id: row.handoffId,
    measurement_plan_id: row.measurementPlanId,
    schema_version: row.schemaVersion,
    derivation_version: row.derivationVersion,
    readout_audience: row.readoutAudience,
    readout_state: row.readoutState,
    coverage_status: row.coverageStatus,
    customer_facing_readout_allowed: row.customerFacingReadoutAllowed,
    customer_facing_financial_output_allowed:
      row.customerFacingFinancialOutputAllowed,
    payload: row.payloadJson as Record<string, unknown>,
    validation: row.validationJson as Record<string, unknown>,
    source_refs: row.sourceRefsJson as Record<string, unknown>,
    required_caveats: row.requiredCaveatsJson as string[],
    blocked_uses: row.blockedUsesJson as string[],
    blocked_claims: row.blockedClaimsJson as string[],
    version: row.version,
    supersedes_id: row.supersedesId,
    created_at: row.createdAt.toISOString(),
    created_by_role: row.createdByRole
  };
}

function measurementCellSnapshotRowToRecord(row: {
  id: string;
  orgId: string;
  clientId: string | null;
  measurementCellId: string;
  measurementCellAssemblyRunId: string;
  measurementPlanId: string;
  valueHypothesisId: string | null;
  valueHypothesisRef: string | null;
  valueHypothesisBindingState: string;
  approvedBlueprintRef: string;
  approvedBlueprintPayloadHash: string;
  blueprintExpectationRef: string;
  expectationPathId: string;
  expectationPathVersion: number;
  expectationPathHash: string;
  approvalState: string;
  approvedAt: Date;
  approvedByRole: string;
  valueDriver: string;
  metricId: string;
  metricDefinitionRef: string;
  metricDefinitionHash: string;
  metricOwnerApprovalState: string;
  metricDirection: string;
  metricUnit: string;
  expectedMetricLagDays: number;
  workflowFamily: string;
  workflowId: string | null;
  functionArea: string;
  cohortKey: string;
  windowMode: string;
  milestoneDay: number;
  baselineWindowStart: Date;
  baselineWindowEnd: Date;
  comparisonWindowStart: Date;
  comparisonWindowEnd: Date;
  assemblyDecision: string;
  payloadJson: Prisma.JsonValue;
  assemblyPayloadJson: Prisma.JsonValue | null;
  validationJson: Prisma.JsonValue;
  assemblyValidationJson: Prisma.JsonValue;
  sourceRefsJson: Prisma.JsonValue;
  blueprintPathBindingJson: Prisma.JsonValue;
  requiredCaveatsJson: Prisma.JsonValue;
  blockedUsesJson: Prisma.JsonValue;
  version: number;
  supersedesId: string | null;
  generatedAt: Date;
  createdAt: Date;
  createdByRole: string;
}): AiValueMeasurementCellSnapshotStoredRecord {
  return {
    id: row.id,
    org_id: row.orgId,
    client_id: row.clientId,
    measurement_cell_id: row.measurementCellId,
    measurement_cell_assembly_run_id: row.measurementCellAssemblyRunId,
    measurement_plan_id: row.measurementPlanId,
    value_hypothesis_id: row.valueHypothesisId,
    value_hypothesis_ref: row.valueHypothesisRef,
    value_hypothesis_binding_state: row.valueHypothesisBindingState,
    approved_blueprint_ref: row.approvedBlueprintRef,
    approved_blueprint_payload_hash: row.approvedBlueprintPayloadHash,
    blueprint_expectation_ref: row.blueprintExpectationRef,
    expectation_path_id: row.expectationPathId,
    expectation_path_version: row.expectationPathVersion,
    expectation_path_hash: row.expectationPathHash,
    approval_state: row.approvalState,
    approved_at: row.approvedAt.toISOString(),
    approved_by_role: row.approvedByRole,
    value_driver: row.valueDriver,
    metric_id: row.metricId,
    metric_definition_ref: row.metricDefinitionRef,
    metric_definition_hash: row.metricDefinitionHash,
    metric_owner_approval_state: row.metricOwnerApprovalState,
    metric_direction: row.metricDirection,
    metric_unit: row.metricUnit,
    expected_metric_lag_days: row.expectedMetricLagDays,
    workflow_family: row.workflowFamily,
    workflow_id: row.workflowId,
    function_area: row.functionArea,
    cohort_key: row.cohortKey,
    window_mode: row.windowMode,
    milestone_day: row.milestoneDay,
    baseline_window_start: row.baselineWindowStart.toISOString(),
    baseline_window_end: row.baselineWindowEnd.toISOString(),
    comparison_window_start: row.comparisonWindowStart.toISOString(),
    comparison_window_end: row.comparisonWindowEnd.toISOString(),
    assembly_decision: row.assemblyDecision,
    payload: row.payloadJson as Record<string, unknown>,
    assembly_payload: row.assemblyPayloadJson as Record<string, unknown> | null,
    validation: row.validationJson as Record<string, unknown>,
    assembly_validation: row.assemblyValidationJson as Record<string, unknown>,
    source_refs: row.sourceRefsJson as Record<string, unknown>,
    blueprint_path_binding: row.blueprintPathBindingJson as Record<string, unknown>,
    required_caveats: row.requiredCaveatsJson as string[],
    blocked_uses: row.blockedUsesJson as string[],
    version: row.version,
    supersedes_id: row.supersedesId,
    generated_at: row.generatedAt.toISOString(),
    created_at: row.createdAt.toISOString(),
    created_by_role: row.createdByRole
  };
}

function pilotRunRowToRecord(row: {
  id: string;
  orgId: string;
  pilotRunId: string;
  measurementPlanId: string;
  workflowFamily: string;
  sourcePackageIdsJson: Prisma.JsonValue;
  evidenceSnapshotId: string;
  claimReadinessHandoffId: string;
  coverageStatus: string;
  runStatus: string;
  validationJson: Prisma.JsonValue;
  requiredCaveatsJson: Prisma.JsonValue;
  blockedUsesJson: Prisma.JsonValue;
  claimReadinessSnapshotPersisted: boolean;
  executiveReadoutSnapshotPersisted: boolean;
  claimReadinessSnapshotId: string | null;
  executiveReadoutSnapshotId: string | null;
  version: number;
  supersedesId: string | null;
  generatedAt: Date;
  createdAt: Date;
  createdByRole: string;
}): AiValuePilotRunStoredRecord {
  return {
    id: row.id,
    org_id: row.orgId,
    pilot_run_id: row.pilotRunId,
    measurement_plan_id: row.measurementPlanId,
    workflow_family: row.workflowFamily,
    source_package_ids: row.sourcePackageIdsJson as string[],
    evidence_snapshot_id: row.evidenceSnapshotId,
    claim_readiness_handoff_id: row.claimReadinessHandoffId,
    coverage_status: row.coverageStatus,
    run_status: row.runStatus,
    validation: row.validationJson as Record<string, unknown>,
    required_caveats: row.requiredCaveatsJson as string[],
    blocked_uses: row.blockedUsesJson as string[],
    claim_readiness_snapshot_persisted: row.claimReadinessSnapshotPersisted,
    executive_readout_snapshot_persisted: row.executiveReadoutSnapshotPersisted,
    claim_readiness_snapshot_id: row.claimReadinessSnapshotId,
    executive_readout_snapshot_id: row.executiveReadoutSnapshotId,
    version: row.version,
    supersedes_id: row.supersedesId,
    generated_at: row.generatedAt.toISOString(),
    created_at: row.createdAt.toISOString(),
    created_by_role: row.createdByRole
  };
}
