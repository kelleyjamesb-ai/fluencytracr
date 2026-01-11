import { z } from "zod";
import { TOOL_CLASSES } from "./types";

export const ToolClassSchema = z.enum(TOOL_CLASSES);

export const RoleSchema = z.enum(["ADMIN", "EXEC_VIEWER", "ENABLEMENT_LEAD", "MANAGER", "EMPLOYEE"]);

export const GroupUpsertSchema = z.object({
  group_key: z.string(),
  name: z.string().optional(),
  group_type: z.string().optional(),
  vendor: z.string().optional()
});

export type GroupUpsert = z.infer<typeof GroupUpsertSchema>;

export const MetricObservationSchema = z.object({
  group_key: z.string(),
  group_type: z.enum(["org", "team", "role"]),
  metric_name: z.string(),
  metric_value: z.number().nullable(),
  bucket_start: z.string(),
  bucket_end: z.string().optional(),
  vendor: z.string().optional(),
  is_user_count: z.boolean().optional()
});

export type MetricObservation = z.infer<typeof MetricObservationSchema>;

export const PolicyControlObservationSchema = z.object({
  group_key: z.string(),
  group_type: z.enum(["org", "team", "role"]),
  control_name: z.string(),
  control_value: z.boolean(),
  bucket_start: z.string(),
  bucket_end: z.string(),
  vendor: z.string().optional()
});

export type PolicyControlObservation = z.infer<typeof PolicyControlObservationSchema>;

export const TrainingEventRollupSchema = z.object({
  group_key: z.string(),
  group_type: z.enum(["org", "team", "role"]),
  event_type: z.string(),
  event_count: z.number(),
  bucket_start: z.string(),
  bucket_end: z.string(),
  vendor: z.string().optional()
});

export type TrainingEventRollup = z.infer<typeof TrainingEventRollupSchema>;

export const OrgCreateSchema = z.object({
  name: z.string().min(1),
  minGroupSize: z.number().int().positive().optional()
});

export const DashboardRequestSchema = z.object({
  orgId: z.string(),
  aggregation: z.enum(["org", "team", "role"]).optional(),
  metricNames: z.array(z.string()).optional()
});

export type DashboardResponse = {
  metrics: MetricObservation[];
  controls: PolicyControlObservation[];
  enablement: TrainingEventRollup[];
};
