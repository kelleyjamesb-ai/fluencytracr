import { z } from "zod";
import { ALLOWED_METRIC_NAMES } from "./metricConstants";

export const OrgCreateSchema = z
  .object({
    name: z.string().min(1),
    min_group_size: z.number().int().positive().default(10)
  })
  .strict();

export type OrgCreate = z.infer<typeof OrgCreateSchema>;

export const GroupUpsertSchema = z
  .object({
    group_key: z.string().min(1),
    name: z.string().min(1).optional(),
    group_type: z.string().min(1).optional(),
    vendor: z.string().min(1).optional()
  })
  .strict();

export type GroupUpsert = z.infer<typeof GroupUpsertSchema>;

export const MetricNameSchema = z.enum(ALLOWED_METRIC_NAMES);

export const MetricObservationSchema = z
  .object({
    group_key: z.string().min(1),
    group_type: z.string().min(1).optional(),
    vendor: z.string().min(1).optional(),
    bucket_start: z.string().min(1),
    bucket_end: z.string().min(1).optional(),
    metric_name: MetricNameSchema,
    metric_unit: z.string().min(1).optional(),
    metric_value: z.number().nullable(),
    is_user_count: z.boolean()
  })
  .strict();

export type MetricObservation = z.infer<typeof MetricObservationSchema>;

export const PolicyControlObservationSchema = z
  .object({
    group_key: z.string().min(1),
    group_type: z.string().min(1).optional(),
    vendor: z.string().min(1).optional(),
    bucket_start: z.string().min(1),
    bucket_end: z.string().min(1).optional(),
    control_name: z.string().min(1),
    status: z.enum(["enabled", "disabled", "partial"])
  })
  .strict();

export type PolicyControlObservation = z.infer<typeof PolicyControlObservationSchema>;

export const TrainingEventRollupSchema = z
  .object({
    group_key: z.string().min(1),
    group_type: z.string().min(1).optional(),
    vendor: z.string().min(1).optional(),
    bucket_start: z.string().min(1),
    bucket_end: z.string().min(1).optional(),
    event_type: z.string().min(1),
    count: z.number().int().nonnegative()
  })
  .strict();

export type TrainingEventRollup = z.infer<typeof TrainingEventRollupSchema>;
