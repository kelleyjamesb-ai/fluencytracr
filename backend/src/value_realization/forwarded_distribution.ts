import { z } from "zod";

export const FORWARDED_DISTRIBUTION_SCHEMA_VERSION = "FT_V3_FORWARDED_DISTRIBUTION_2026_06";

const ForbiddenForwardedTokenPatterns = [
  /(?:^|[:_-])actor[:_-]?(?:id|identifier)(?=[:_-]|$)/i,
  /(?:^|[:_-])user[:_-]?(?:id|identifier|email|name|hash)(?:s)?(?=[:_-]|$)/i,
  /(?:^|[:_-])employee[:_-]?(?:id|identifier|email|name|hash)(?:s)?(?=[:_-]|$)/i,
  /(?:^|[:_-])person[:_-]?(?:id|identifier|email|name|hash)(?:s)?(?=[:_-]|$)/i,
  /(?:^|[:_-])email[:_-]?(?:id|identifier|address|hash)(?=[:_-]|$)/i,
  /(?:^|[:_-])skill[:_-]?(?:id|name|identifier|reader)(?:s)?(?=[:_-]|$)/i,
  /(?:^|[:_-])raw[:_-]?skill[:_-]?(?:id|name|identifier|reader)(?:s)?(?=[:_-]|$)/i
];

export const ForwardedDistributionMachineTokenSchema = z.string()
  .min(1)
  .max(180)
  .regex(/^[A-Za-z0-9:_-]+$/)
  .refine(
    (value) => !ForbiddenForwardedTokenPatterns.some((pattern) => pattern.test(value)),
    { message: "machine token must not carry actor, person, email, or raw skill identifiers" }
  );

const DistributionValueSchema = z.object({
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

export const ForwardedDistributionSchema = z.object({
  schema_version: z.literal(FORWARDED_DISTRIBUTION_SCHEMA_VERSION),
  source_schema_version: z.literal("FT_V3_2026_05"),
  cohort_id: ForwardedDistributionMachineTokenSchema,
  workflow_id: ForwardedDistributionMachineTokenSchema,
  jbtd_id: z.string().max(64).regex(/^[a-z0-9_-]+$/).nullable(),
  persona_id: z.string().max(64).regex(/^[a-z0-9_-]+$/).nullable(),
  window_start: z.string().datetime({ offset: true }),
  window_end: z.string().datetime({ offset: true }),
  window_days: z.number().int().nonnegative(),
  cohort_size: z.number().int().positive(),
  ambiguity_rate: z.number().min(0).max(1),
  calibration_id: ForwardedDistributionMachineTokenSchema,
  surface_taxonomy_ids: z.array(ForwardedDistributionMachineTokenSchema).min(1).max(20),
  velocity: z.object({
    frequency: DistributionValueSchema,
    engagement: DistributionValueSchema,
    breadth: DistributionValueSchema
  }).strict(),
  quality_signals: QualitySignalsSchema,
  distribution_moments: z.object({
    frequency_mean: z.number().finite().nonnegative(),
    engagement_mean: z.number().finite().nonnegative(),
    breadth_mean: z.number().finite().nonnegative()
  }).strict(),
  baseline_stable: z.boolean(),
  value_type: z.enum(["ACCELERATION", "QUALITY_PREMIUM", "NET_NEW", "UNCLASSIFIED"]),
  evidence_grade: z.enum(["OBJECTIVE", "CALIBRATED", "QUALITATIVE"]),
  privacy: z.object({
    aggregate_only: z.literal(true),
    person_level_fields_included: z.literal(false)
  }).strict()
}).strict().refine(
  (value) => Date.parse(value.window_end) > Date.parse(value.window_start),
  { message: "window_end must be after window_start", path: ["window_end"] }
);

export const ForwardedDistributionLegacyCompatibleSchema = z.preprocess((value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(record, "surface_taxonomy_ids")) return value;
  return {
    ...record,
    surface_taxonomy_ids: [record.workflow_id]
  };
}, ForwardedDistributionSchema);

export type ForwardedDistribution = z.infer<typeof ForwardedDistributionSchema>;

export type ForwardedDistributionSliceBinding = {
  cohortId: string;
  workflowId: string;
  jbtdId?: string | null;
  personaId?: string | null;
  windowStart?: string;
  windowEnd?: string;
  calibrationId?: string;
};

const sameInstant = (left: string, right: string): boolean => {
  const leftMs = Date.parse(left);
  const rightMs = Date.parse(right);
  return Number.isFinite(leftMs) && Number.isFinite(rightMs) && leftMs === rightMs;
};

export const forwardedDistributionMatchesSlice = (
  distribution: ForwardedDistribution,
  binding: ForwardedDistributionSliceBinding
): boolean => {
  if (distribution.cohort_id !== binding.cohortId) return false;
  if (distribution.workflow_id !== binding.workflowId) return false;
  if (distribution.jbtd_id !== (binding.jbtdId ?? null)) return false;
  if (distribution.persona_id !== (binding.personaId ?? null)) return false;
  if (binding.windowStart !== undefined && !sameInstant(distribution.window_start, binding.windowStart)) {
    return false;
  }
  if (binding.windowEnd !== undefined && !sameInstant(distribution.window_end, binding.windowEnd)) {
    return false;
  }
  if (binding.calibrationId !== undefined && distribution.calibration_id !== binding.calibrationId) {
    return false;
  }
  return true;
};
