import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

import type { SuppressionReason } from "@learnaire/shared";
import { PERSON_IDENTIFIER_FIELDS } from "@learnaire/shared";
import type { VelocityDistributionRecord, VelocityEventName } from "../store";

export type VelocityIndexVerdict = "SURFACE" | "SUPPRESS";
export type VelocityIndexEvidenceGrade = "OBJECTIVE" | "CALIBRATED" | "QUALITATIVE";

export type VelocityIndexResponse = {
  workflow_id: string;
  jbtd_id: string | null;
  persona_id: string | null;
  window_days: number;
  verdict: VelocityIndexVerdict;
  suppression_reason: SuppressionReason | null;
  frequency_index: number | null;
  engagement_index: number | null;
  breadth_index: number | null;
  velocity_index: number | null;
  cohort_size: number;
  calibration_reference: string;
  evidence_grade: VelocityIndexEvidenceGrade;
  computed_at: string;
};

export type VelocityBaseline = {
  calibration_id: string;
  frequency_p50: number;
  frequency_p99: number;
  engagement_p50: number;
  engagement_p99: number;
  breadth_p50: number;
  breadth_p99: number;
  source: string;
};

class VelocityBaselineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VelocityBaselineError";
  }
}

export const VELOCITY_SCHEMA_VERSION = "FT_V2_2026_05";
export const VELOCITY_MIN_WINDOW_DAYS = 60;
export const VELOCITY_MIN_COHORT_SIZE = 5;
const VELOCITY_AMBIGUITY_RATE_THRESHOLD = 0.2;
const OBJECTIVE_COHORT_SIZE = 30;
const OBJECTIVE_WINDOW_DAYS = 90;

const VelocityDistributionValueSchema = z.object({
  p10: z.number().finite().nonnegative(),
  p50: z.number().finite().nonnegative(),
  p90: z.number().finite().nonnegative(),
  p99: z.number().finite().nonnegative()
}).strict().refine(
  (value) => value.p10 <= value.p50 && value.p50 <= value.p90 && value.p90 <= value.p99,
  { message: "distribution percentiles must be ordered p10 <= p50 <= p90 <= p99" }
);

const VelocityBaselineSchema = z.object({
  calibration_id: z.string().min(1),
  frequency_p50: z.number().finite().positive(),
  frequency_p99: z.number().finite().positive(),
  engagement_p50: z.number().finite().positive(),
  engagement_p99: z.number().finite().positive(),
  breadth_p50: z.number().finite().positive(),
  breadth_p99: z.number().finite().positive(),
  source: z.string().min(1)
}).strict();

const VelocityJoinKeySchema = z.string().max(64).regex(/^[a-z0-9_-]+$/);

export const VelocityDistributionSchema = z.object({
  schema_version: z.literal(VELOCITY_SCHEMA_VERSION),
  event_name: z.enum([
    "USER_FREQUENCY_OBSERVED",
    "USER_ENGAGEMENT_OBSERVED",
    "USER_BREADTH_OBSERVED"
  ]),
  workflow_id: z.string().min(1),
  jbtd_id: VelocityJoinKeySchema.nullable().optional(),
  persona_id: VelocityJoinKeySchema.nullable().optional(),
  window_start: z.string().datetime({ offset: true }),
  window_end: z.string().datetime({ offset: true }),
  cohort_size: z.number().int().positive(),
  ambiguity_rate: z.number().min(0).max(1).optional(),
  distribution: VelocityDistributionValueSchema,
  calibration_reference: z.string().min(1).optional(),
  privacy: z.object({
    person_level_fields_included: z.literal(false)
  }).strict()
}).strict().refine(
  (value) => Date.parse(value.window_end) > Date.parse(value.window_start),
  { message: "window_end must be after window_start", path: ["window_end"] }
);

export type VelocityDistributionInput = z.infer<typeof VelocityDistributionSchema>;

const personIdentifierFieldSet = new Set([
  ...PERSON_IDENTIFIER_FIELDS,
  "person_name",
  "employee_name",
  "user_email",
  "employee_email",
  "raw_user_id"
].map((field) => field.toLowerCase()));

export const findVelocityPersonField = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const stack: Array<{ value: unknown; path: string }> = [{ value: payload, path: "" }];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || !current.value || typeof current.value !== "object") {
      continue;
    }
    if (Array.isArray(current.value)) {
      current.value.forEach((value, index) => stack.push({ value, path: `${current.path}[${index}]` }));
      continue;
    }
    for (const [key, value] of Object.entries(current.value as Record<string, unknown>)) {
      const nextPath = current.path ? `${current.path}.${key}` : key;
      if (personIdentifierFieldSet.has(key.toLowerCase())) {
        return nextPath;
      }
      if (value && typeof value === "object") {
        stack.push({ value, path: nextPath });
      }
    }
  }
  return null;
};

export const loadVelocityBaseline = (): VelocityBaseline => {
  const filePath = path.resolve(__dirname, "../../../calibration/velocity_baselines.json");
  const parsed = VelocityBaselineSchema.safeParse(JSON.parse(fs.readFileSync(filePath, "utf8")));
  if (!parsed.success) {
    throw new VelocityBaselineError(parsed.error.message);
  }
  return parsed.data;
};

export const velocityStoreKey = (
  orgId: string,
  workflowId: string,
  eventName: VelocityEventName,
  jbtdId: string | null,
  personaId: string | null
): string => `${orgId}::${workflowId}::${eventName}::${jbtdId ?? ""}::${personaId ?? ""}`;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const round = (value: number): number => Number(value.toFixed(3));

const eventIndex = (
  record: VelocityDistributionRecord | undefined,
  baselineP50: number
): number | null => {
  if (!record || baselineP50 <= 0) {
    return null;
  }
  return round(clamp(record.distribution.p50 / baselineP50, 0, 1.5));
};

const evidenceGrade = (
  verdict: VelocityIndexVerdict,
  cohortSize: number,
  windowDays: number
): VelocityIndexEvidenceGrade => {
  if (verdict === "SURFACE" && cohortSize >= OBJECTIVE_COHORT_SIZE && windowDays >= OBJECTIVE_WINDOW_DAYS) {
    return "OBJECTIVE";
  }
  return "QUALITATIVE";
};

const distributionCoversWindow = (
  record: VelocityDistributionRecord,
  windowDays: number,
  now: Date
): boolean => {
  const dayMs = 24 * 60 * 60 * 1000;
  const start = Date.parse(record.window_start);
  const end = Date.parse(record.window_end);
  const nowMs = now.getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start || end > nowMs + dayMs) {
    return false;
  }
  const requestedStart = nowMs - windowDays * dayMs;
  const durationDays = (end - start) / (24 * 60 * 60 * 1000);
  return durationDays >= windowDays && start <= requestedStart && end >= nowMs - dayMs;
};

const suppress = (params: {
  workflowId: string;
  jbtdId: string | null;
  personaId: string | null;
  windowDays: number;
  reason: SuppressionReason;
  cohortSize: number;
  calibrationReference: string;
  computedAt: string;
}): VelocityIndexResponse => ({
  workflow_id: params.workflowId,
  jbtd_id: params.jbtdId,
  persona_id: params.personaId,
  window_days: params.windowDays,
  verdict: "SUPPRESS",
  suppression_reason: params.reason,
  frequency_index: null,
  engagement_index: null,
  breadth_index: null,
  velocity_index: null,
  cohort_size: params.cohortSize,
  calibration_reference: params.calibrationReference,
  evidence_grade: evidenceGrade("SUPPRESS", params.cohortSize, params.windowDays),
  computed_at: params.computedAt
});

export const computeVelocityIndex = (params: {
  workflowId: string;
  jbtdId?: string | null;
  personaId?: string | null;
  windowDays: number;
  distributions: VelocityDistributionRecord[];
  baseline?: VelocityBaseline;
  now?: Date;
}): VelocityIndexResponse => {
  const now = params.now ?? new Date();
  let baseline: VelocityBaseline;
  try {
    baseline = params.baseline ?? loadVelocityBaseline();
  } catch {
    baseline = {
      calibration_id: "invalid",
      frequency_p50: 1,
      frequency_p99: 1,
      engagement_p50: 1,
      engagement_p99: 1,
      breadth_p50: 1,
      breadth_p99: 1,
      source: "invalid"
    };
    return suppress({
      workflowId: params.workflowId,
      jbtdId: params.jbtdId ?? null,
      personaId: params.personaId ?? null,
      windowDays: params.windowDays,
      reason: "BASELINE_UNSTABLE",
      cohortSize: 0,
      calibrationReference: baseline.calibration_id,
      computedAt: now.toISOString()
    });
  }
  const computedAt = now.toISOString();
  const jbtdId = params.jbtdId ?? null;
  const personaId = params.personaId ?? null;
  const scoped = params.distributions.filter(
    (record) =>
      record.workflow_id === params.workflowId &&
      record.jbtd_id === jbtdId &&
      record.persona_id === personaId &&
      distributionCoversWindow(record, params.windowDays, now)
  );
  const cohortSize = scoped.reduce((min, record) => Math.min(min, record.cohort_size), Infinity);
  const effectiveCohortSize = Number.isFinite(cohortSize) ? cohortSize : 0;

  if (params.windowDays < VELOCITY_MIN_WINDOW_DAYS) {
    return suppress({
      workflowId: params.workflowId,
      jbtdId,
      personaId,
      windowDays: params.windowDays,
      reason: "INSUFFICIENT_TIME",
      cohortSize: effectiveCohortSize,
      calibrationReference: baseline.calibration_id,
      computedAt
    });
  }

  if (scoped.some((record) => (record.ambiguity_rate ?? 0) > VELOCITY_AMBIGUITY_RATE_THRESHOLD)) {
    return suppress({
      workflowId: params.workflowId,
      jbtdId,
      personaId,
      windowDays: params.windowDays,
      reason: "HIGH_AMBIGUITY",
      cohortSize: effectiveCohortSize,
      calibrationReference: baseline.calibration_id,
      computedAt
    });
  }

  if (effectiveCohortSize < VELOCITY_MIN_COHORT_SIZE) {
    return suppress({
      workflowId: params.workflowId,
      jbtdId,
      personaId,
      windowDays: params.windowDays,
      reason: "INSUFFICIENT_VOLUME",
      cohortSize: effectiveCohortSize,
      calibrationReference: baseline.calibration_id,
      computedAt
    });
  }

  const byEvent = new Map(scoped.map((record) => [record.event_name, record]));
  const frequency = byEvent.get("USER_FREQUENCY_OBSERVED");
  const engagement = byEvent.get("USER_ENGAGEMENT_OBSERVED");
  const breadth = byEvent.get("USER_BREADTH_OBSERVED");
  if (!frequency || !engagement || !breadth) {
    return suppress({
      workflowId: params.workflowId,
      jbtdId,
      personaId,
      windowDays: params.windowDays,
      reason: "NO_CONVERGENCE",
      cohortSize: effectiveCohortSize,
      calibrationReference: baseline.calibration_id,
      computedAt
    });
  }
  if (
    [frequency, engagement, breadth].some(
      (record) => record.calibration_reference !== baseline.calibration_id
    )
  ) {
    return suppress({
      workflowId: params.workflowId,
      jbtdId,
      personaId,
      windowDays: params.windowDays,
      reason: "BASELINE_UNSTABLE",
      cohortSize: effectiveCohortSize,
      calibrationReference: baseline.calibration_id,
      computedAt
    });
  }

  const frequencyIndex = eventIndex(frequency, baseline.frequency_p50) ?? 0;
  const engagementIndex = eventIndex(engagement, baseline.engagement_p50) ?? 0;
  const breadthIndex = eventIndex(breadth, baseline.breadth_p50) ?? 0;
  const velocityIndex = round((frequencyIndex + engagementIndex + breadthIndex) / 3);

  return {
    workflow_id: params.workflowId,
    jbtd_id: jbtdId,
    persona_id: personaId,
    window_days: params.windowDays,
    verdict: "SURFACE",
    suppression_reason: null,
    frequency_index: frequencyIndex,
    engagement_index: engagementIndex,
    breadth_index: breadthIndex,
    velocity_index: velocityIndex,
    cohort_size: effectiveCohortSize,
    calibration_reference: baseline.calibration_id,
    evidence_grade: evidenceGrade("SURFACE", effectiveCohortSize, params.windowDays),
    computed_at: computedAt
  };
};

export const velocityAdjustmentFactor = (velocityIndex: number): number =>
  round(clamp(velocityIndex, 0.7, 1.3));
