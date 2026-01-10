import { z } from "zod";

export const RoleSchema = z.enum(["admin", "exec", "enablement_lead"]);
export type Role = z.infer<typeof RoleSchema>;

export const TimeRangeSchema = z.enum(["4w", "12w", "6m"]);
export type TimeRange = z.infer<typeof TimeRangeSchema>;

export const AggregationSchema = z.enum(["org", "team"]);
export type Aggregation = z.infer<typeof AggregationSchema>;

export const DashboardRequestSchema = z.object({
  range: TimeRangeSchema,
  team: z.string().optional(),
  aggregation: AggregationSchema.default("org")
});

export type DashboardRequest = z.infer<typeof DashboardRequestSchema>;

export const FluencyTrendPointSchema = z.object({
  date: z.string(),
  score: z.number().min(0).max(100)
});

export const CoverageItemSchema = z.object({
  label: z.string(),
  value: z.number().min(0).max(1)
});

export const AdoptionShapeSchema = z.object({
  date: z.string(),
  rare: z.number().nonnegative(),
  occasional: z.number().nonnegative(),
  regular: z.number().nonnegative(),
  habitual: z.number().nonnegative()
});

export const SpreadRiskSchema = z.object({
  date: z.string(),
  presence: z.number().min(0).max(1),
  concentration: z.number().min(0).max(1)
});

export const DashboardResponseSchema = z.object({
  range: TimeRangeSchema,
  aggregation: AggregationSchema,
  teams: z.array(z.string()),
  fluencyTrend: z.array(FluencyTrendPointSchema),
  coverage: z.array(CoverageItemSchema),
  adoptionShape: z.array(AdoptionShapeSchema),
  spreadRisk: z.array(SpreadRiskSchema)
});

export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;

export { FORBIDDEN_FIELDS, containsForbiddenFields } from "./anonymousContract";
export type { ForbiddenField } from "./anonymousContract";

export { ALLOWED_METRIC_NAMES } from "./metricConstants";
export type { AllowedMetricName } from "./metricConstants";

export {
  OrgCreateSchema,
  GroupUpsertSchema,
  MetricObservationSchema,
  MetricNameSchema,
  PolicyControlObservationSchema,
  TrainingEventRollupSchema
} from "./ingestSchemas";
export type {
  OrgCreate,
  GroupUpsert,
  MetricObservation,
  PolicyControlObservation,
  TrainingEventRollup
} from "./ingestSchemas";
