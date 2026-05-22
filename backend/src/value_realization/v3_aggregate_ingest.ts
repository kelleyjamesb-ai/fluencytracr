import { z } from "zod";

import type { SuppressionReason } from "@learnaire/shared";
import { FluencyJoinKeySchema } from "@learnaire/shared";
import type { CalibrationBaseline } from "./calibration_registry";
import type { VelocityDistributionRecord } from "../store";
import { VELOCITY_SCHEMA_VERSION } from "./velocity_index";

export type V3VerdictDecision = "SURFACE" | "SUPPRESS";
export type V3EvidenceGrade = "OBJECTIVE" | "CALIBRATED" | "QUALITATIVE";

export type V3AggregateVerdict = {
  cohort_id: string;
  workflow_id: string;
  jbtd_id: string | null;
  persona_id: string | null;
  window_start: string;
  window_end: string;
  window_days: number;
  calibration_id: string;
  verdict: V3VerdictDecision;
  suppression_reason: SuppressionReason | null;
  cohort_size: number;
  evidence_grade: V3EvidenceGrade;
  frequency_index: number | null;
  engagement_index: number | null;
  breadth_index: number | null;
  velocity_index: number | null;
  quality_multiplier: number | null;
  reliability_factor: number | null;
  computed_at: string;
};

const DistributionSchema = z.object({
  p10: z.number().finite().nonnegative(),
  p50: z.number().finite().nonnegative(),
  p90: z.number().finite().nonnegative(),
  p99: z.number().finite().nonnegative()
}).strict().refine(
  (value) => value.p10 <= value.p50 && value.p50 <= value.p90 && value.p90 <= value.p99,
  { message: "distribution percentiles must be ordered p10 <= p50 <= p90 <= p99" }
);

const QualitySignalsSchema = z.object({
  completion_rate: z.number().min(0).max(1),
  error_rate: z.number().min(0).max(1),
  abandonment_rate: z.number().min(0).max(1),
  recovery_rate: z.number().min(0).max(1),
  verification_rate: z.number().min(0).max(1),
  p50_latency_ms: z.number().int().nonnegative(),
  p95_latency_ms: z.number().int().nonnegative()
}).strict();

export const V3AggregateIngestSchema = z.object({
  schema_version: z.literal("FT_V3_2026_05"),
  cohort_id: z.string().min(1),
  workflow_id: z.string().min(1),
  jbtd_id: FluencyJoinKeySchema.nullable().optional(),
  persona_id: FluencyJoinKeySchema.nullable().optional(),
  window_start: z.string().datetime({ offset: true }),
  window_end: z.string().datetime({ offset: true }),
  cohort_size: z.number().int().positive(),
  ambiguity_rate: z.number().min(0).max(1).optional(),
  calibration_id: z.string().min(1),
  velocity: z.object({
    frequency: DistributionSchema,
    engagement: DistributionSchema,
    breadth: DistributionSchema
  }).strict(),
  quality_signals: QualitySignalsSchema,
  privacy: z.object({
    person_level_fields_included: z.literal(false)
  }).strict()
}).strict().refine(
  (value) => Date.parse(value.window_end) > Date.parse(value.window_start),
  { message: "window_end must be after window_start", path: ["window_end"] }
);

export type V3AggregateIngestInput = z.infer<typeof V3AggregateIngestSchema>;

const MIN_WINDOW_DAYS = 60;
const MIN_COHORT_SIZE = 5;
const AMBIGUITY_RATE_THRESHOLD = 0.2;
const OBJECTIVE_COHORT_SIZE = 30;
const OBJECTIVE_WINDOW_DAYS = 90;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const round = (value: number): number => Number(value.toFixed(3));

export const windowDaysFor = (windowStart: string, windowEnd: string): number => {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.floor((Date.parse(windowEnd) - Date.parse(windowStart)) / dayMs);
};

const evidenceGrade = (
  verdict: V3VerdictDecision,
  cohortSize: number,
  windowDays: number
): V3EvidenceGrade => {
  if (verdict === "SURFACE" && cohortSize >= OBJECTIVE_COHORT_SIZE && windowDays >= OBJECTIVE_WINDOW_DAYS) {
    return "OBJECTIVE";
  }
  return "QUALITATIVE";
};

const suppress = (
  input: V3AggregateIngestInput,
  windowDays: number,
  reason: SuppressionReason,
  computedAt: string
): V3AggregateVerdict => ({
  cohort_id: input.cohort_id,
  workflow_id: input.workflow_id,
  jbtd_id: input.jbtd_id ?? null,
  persona_id: input.persona_id ?? null,
  window_start: input.window_start,
  window_end: input.window_end,
  window_days: windowDays,
  calibration_id: input.calibration_id,
  verdict: "SUPPRESS",
  suppression_reason: reason,
  cohort_size: input.cohort_size,
  evidence_grade: evidenceGrade("SUPPRESS", input.cohort_size, windowDays),
  frequency_index: null,
  engagement_index: null,
  breadth_index: null,
  velocity_index: null,
  quality_multiplier: null,
  reliability_factor: null,
  computed_at: computedAt
});

const dimensionIndex = (value: number, baseline: number): number =>
  round(clamp(value / baseline, 0, 1.5));

export const computeV3AggregateVerdict = (
  input: V3AggregateIngestInput,
  baseline: CalibrationBaseline,
  now = new Date()
): V3AggregateVerdict => {
  const computedAt = now.toISOString();
  const windowDays = windowDaysFor(input.window_start, input.window_end);

  if (windowDays < MIN_WINDOW_DAYS) {
    return suppress(input, windowDays, "INSUFFICIENT_TIME", computedAt);
  }
  if ((input.ambiguity_rate ?? 0) > AMBIGUITY_RATE_THRESHOLD) {
    return suppress(input, windowDays, "HIGH_AMBIGUITY", computedAt);
  }
  if (input.cohort_size < MIN_COHORT_SIZE) {
    return suppress(input, windowDays, "INSUFFICIENT_VOLUME", computedAt);
  }
  const quality = input.quality_signals;
  const hasQualityConvergence =
    quality.completion_rate > 0 ||
    quality.error_rate > 0 ||
    quality.abandonment_rate > 0 ||
    quality.recovery_rate > 0 ||
    quality.verification_rate > 0;
  if (!hasQualityConvergence) {
    return suppress(input, windowDays, "NO_CONVERGENCE", computedAt);
  }

  const frequencyIndex = dimensionIndex(input.velocity.frequency.p50, baseline.frequency_p50);
  const engagementIndex = dimensionIndex(input.velocity.engagement.p50, baseline.engagement_p50);
  const breadthIndex = dimensionIndex(input.velocity.breadth.p50, baseline.breadth_p50);
  const velocityIndex = round((frequencyIndex + engagementIndex + breadthIndex) / 3);
  const qualityMultiplier = round(clamp(
    1 +
      0.3 * quality.verification_rate +
      0.25 * quality.recovery_rate -
      0.35 * quality.abandonment_rate -
      0.3 * quality.error_rate,
    0.5,
    1.5
  ));
  const reliabilityFactor = round(clamp(
    0.5 +
      0.2 * quality.verification_rate +
      0.2 * quality.recovery_rate -
      0.25 * quality.abandonment_rate -
      0.15 * quality.error_rate,
    0,
    1
  ));

  return {
    cohort_id: input.cohort_id,
    workflow_id: input.workflow_id,
    jbtd_id: input.jbtd_id ?? null,
    persona_id: input.persona_id ?? null,
    window_start: input.window_start,
    window_end: input.window_end,
    window_days: windowDays,
    calibration_id: input.calibration_id,
    verdict: "SURFACE",
    suppression_reason: null,
    cohort_size: input.cohort_size,
    evidence_grade: evidenceGrade("SURFACE", input.cohort_size, windowDays),
    frequency_index: frequencyIndex,
    engagement_index: engagementIndex,
    breadth_index: breadthIndex,
    velocity_index: velocityIndex,
    quality_multiplier: qualityMultiplier,
    reliability_factor: reliabilityFactor,
    computed_at: computedAt
  };
};

export const velocityRecordsFromV3Aggregate = (
  orgId: string,
  input: V3AggregateIngestInput,
  ingestedAt: string
): VelocityDistributionRecord[] => ([
  ["USER_FREQUENCY_OBSERVED", input.velocity.frequency],
  ["USER_ENGAGEMENT_OBSERVED", input.velocity.engagement],
  ["USER_BREADTH_OBSERVED", input.velocity.breadth]
] as Array<[VelocityDistributionRecord["event_name"], VelocityDistributionRecord["distribution"]]>).map(([eventName, distribution]) => ({
  org_id: orgId,
  schema_version: VELOCITY_SCHEMA_VERSION,
  event_name: eventName as VelocityDistributionRecord["event_name"],
  workflow_id: input.workflow_id,
  jbtd_id: input.jbtd_id ?? null,
  persona_id: input.persona_id ?? null,
  window_start: input.window_start,
  window_end: input.window_end,
  cohort_size: input.cohort_size,
  ambiguity_rate: input.ambiguity_rate,
  distribution,
  calibration_reference: input.calibration_id,
  privacy: { person_level_fields_included: false },
  ingested_at: ingestedAt
}));
