import { z } from "zod";
import { TOOL_CLASSES, SIGNAL_NAMES, V0_SIGNAL_NAMES, GROUP_TYPES, PATTERN_TYPES } from "./types";

export const ToolClassSchema = z.enum(TOOL_CLASSES);

export const V0SignalNameSchema = z.enum(V0_SIGNAL_NAMES);

export const RoleSchema = z.enum(["ADMIN", "GOV_OPERATOR", "EXEC_VIEWER", "ENABLEMENT_LEAD", "MANAGER", "EMPLOYEE"]);

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

export const SignalNameSchema = z.enum(SIGNAL_NAMES);

// Combined schema that accepts both legacy and v0 signal names
export const AnySignalNameSchema = z.union([SignalNameSchema, V0SignalNameSchema]);

export const GroupTypeSchema = z.enum(GROUP_TYPES);

export const PatternTypeSchema = z.enum(PATTERN_TYPES);

export const BehavioralSignalMetadataSchema = z.object({
  has_human_review: z.boolean().optional(),
  is_cross_system: z.boolean().optional(),
  requires_approval: z.boolean().optional(),
  external_side_effect: z.boolean().optional()
}).strict().optional();

export const BehavioralSignalAggregateSchema = z.object({
  org_id: z.string().min(1),
  group_id: z.string().min(1),
  group_type: GroupTypeSchema,
  function_id: z.string().min(1).optional(),
  bucket_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // ISO date format YYYY-MM-DD
  signal_name: SignalNameSchema,
  count: z.number().int().nonnegative(),
  tool_class: ToolClassSchema.optional(),
  suppressed: z.boolean().optional(),
  metadata: BehavioralSignalMetadataSchema
}).strict().refine(
  (data) => {
    // Require function_id for team and role group types
    if ((data.group_type === "team" || data.group_type === "role") && !data.function_id) {
      return false;
    }
    return true;
  },
  {
    message: "function_id is required when group_type is 'team' or 'role'"
  }
);

export type BehavioralSignalAggregate = z.infer<typeof BehavioralSignalAggregateSchema>;

export const BehavioralSignalImportSchema = z.object({
  aggregates: z.array(BehavioralSignalAggregateSchema).min(1)
}).strict();

export type BehavioralSignalImport = z.infer<typeof BehavioralSignalImportSchema>;

// Schema for connector-transformed signals (supports v0 signal names)
export const ConnectorSignalAggregateSchema = z.object({
  org_id: z.string().min(1),
  group_id: z.string().min(1),
  group_type: GroupTypeSchema,
  function_id: z.string().min(1).optional(),
  bucket_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  signal_name: AnySignalNameSchema, // Supports both legacy and v0 signal names
  count: z.number().int().nonnegative(),
  tool_class: ToolClassSchema.optional(),
  suppressed: z.boolean().optional(),
  metadata: BehavioralSignalMetadataSchema
}).strict().refine(
  (data) => {
    if ((data.group_type === "team" || data.group_type === "role") && !data.function_id) {
      return false;
    }
    return true;
  },
  {
    message: "function_id is required when group_type is 'team' or 'role'"
  }
);

export type ConnectorSignalAggregate = z.infer<typeof ConnectorSignalAggregateSchema>;

export const ConnectorSignalImportSchema = z.object({
  aggregates: z.array(ConnectorSignalAggregateSchema).min(1)
}).strict();

export type ConnectorSignalImport = z.infer<typeof ConnectorSignalImportSchema>;

// Schema for connector event import (external events before transformation)
export const ExternalEventSchema = z.object({
  event_type: z.string().min(1),
  timestamp: z.string(),
}).passthrough(); // Allow additional fields

export const ConnectorEventImportSchema = z.object({
  vendor: z.string().min(1),
  connector_name: z.string().min(1),
  org_id: z.string().min(1),
  group_id: z.string().min(1),
  group_type: GroupTypeSchema,
  function_id: z.string().min(1).optional(),
  bucket_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  events: z.array(ExternalEventSchema).min(1)
}).strict().refine(
  (data) => {
    if ((data.group_type === "team" || data.group_type === "role") && !data.function_id) {
      return false;
    }
    return true;
  },
  {
    message: "function_id is required when group_type is 'team' or 'role'"
  }
);

export type ConnectorEventImport = z.infer<typeof ConnectorEventImportSchema>;

export const BehavioralPatternSignalSchema = z.object({
  signal_name: SignalNameSchema,
  count: z.number().int().nonnegative()
});

export const BehavioralPatternTrendSchema = z.object({
  direction: z.enum(["increasing", "stable", "decreasing"]),
  magnitude: z.enum(["slight", "moderate", "significant"])
}).strict().optional();

export const BehavioralPatternSchema = z.object({
  pattern_type: PatternTypeSchema,
  group_id: z.string().min(1),
  group_type: z.enum(["function", "org"]), // Patterns only at function+ level
  bucket_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1),
  confidence: z.enum(["low", "medium", "high"]),
  signals: z.array(BehavioralPatternSignalSchema),
  trends: BehavioralPatternTrendSchema
}).strict();

export type BehavioralPattern = z.infer<typeof BehavioralPatternSchema>;
