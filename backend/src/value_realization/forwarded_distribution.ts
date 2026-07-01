import { z } from "zod";

export const FORWARDED_DISTRIBUTION_SCHEMA_VERSION = "FT_V3_FORWARDED_DISTRIBUTION_2026_06";

const ForbiddenForwardedDistributionTokenPatterns = [
  /raw_?rows?/i,
  /query_?text/i,
  /\bsql\b/i,
  /prompt/i,
  /response/i,
  /transcript/i,
  /user_?id/i,
  /employee/i,
  /person_?id/i,
  /^email$/i,
  /confidence/i,
  /probability/i,
  /score(?:_like)?/i,
  /\broi\b/i,
  /ebitda/i,
  /causal(?:ity)?/i,
  /productivity/i
];

export const ForwardedDistributionMachineTokenSchema = z.string()
  .min(1)
  .max(180)
  .regex(/^[A-Za-z0-9:_-]+$/)
  .refine(
    (value) => !ForbiddenForwardedDistributionTokenPatterns.some((pattern) => pattern.test(value)),
    { message: "machine token contains forbidden raw, person-level, or value-claim language" }
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

const ForwardedDistributionBaseSchema = z.object({
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
  surface_taxonomy_ids: z.array(ForwardedDistributionMachineTokenSchema).min(1).max(20).optional(),
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
}).strict();

export const ForwardedDistributionSchema = ForwardedDistributionBaseSchema.refine(
  (value) => Date.parse(value.window_end) > Date.parse(value.window_start),
  { message: "window_end must be after window_start", path: ["window_end"] }
).transform((value) => ({
  ...value,
  surface_taxonomy_ids: value.surface_taxonomy_ids ?? [value.workflow_id]
}));

export type ForwardedDistribution = z.infer<typeof ForwardedDistributionSchema>;
