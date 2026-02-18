"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BehavioralPatternSchema = exports.BehavioralPatternTrendSchema = exports.BehavioralPatternSignalSchema = exports.ConnectorEventImportSchema = exports.ExternalEventSchema = exports.ConnectorSignalImportSchema = exports.ConnectorSignalAggregateSchema = exports.BehavioralSignalImportSchema = exports.BehavioralSignalAggregateSchema = exports.BehavioralSignalMetadataSchema = exports.PatternTypeSchema = exports.GroupTypeSchema = exports.AnySignalNameSchema = exports.SignalNameSchema = exports.DashboardRequestSchema = exports.OrgCreateSchema = exports.TrainingEventRollupSchema = exports.PolicyControlObservationSchema = exports.MetricObservationSchema = exports.GroupUpsertSchema = exports.RoleSchema = exports.V0SignalNameSchema = exports.ToolClassSchema = void 0;
const zod_1 = require("zod");
const types_1 = require("./types");
exports.ToolClassSchema = zod_1.z.enum(types_1.TOOL_CLASSES);
exports.V0SignalNameSchema = zod_1.z.enum(types_1.V0_SIGNAL_NAMES);
exports.RoleSchema = zod_1.z.enum(["ADMIN", "GOV_OPERATOR", "EXEC_VIEWER", "ENABLEMENT_LEAD", "MANAGER", "EMPLOYEE"]);
exports.GroupUpsertSchema = zod_1.z.object({
    group_key: zod_1.z.string(),
    name: zod_1.z.string().optional(),
    group_type: zod_1.z.string().optional(),
    vendor: zod_1.z.string().optional()
});
exports.MetricObservationSchema = zod_1.z.object({
    group_key: zod_1.z.string(),
    group_type: zod_1.z.enum(["org", "team", "role"]),
    metric_name: zod_1.z.string(),
    metric_value: zod_1.z.number().nullable(),
    bucket_start: zod_1.z.string(),
    bucket_end: zod_1.z.string().optional(),
    vendor: zod_1.z.string().optional(),
    is_user_count: zod_1.z.boolean().optional()
});
exports.PolicyControlObservationSchema = zod_1.z.object({
    group_key: zod_1.z.string(),
    group_type: zod_1.z.enum(["org", "team", "role"]),
    control_name: zod_1.z.string(),
    control_value: zod_1.z.boolean(),
    bucket_start: zod_1.z.string(),
    bucket_end: zod_1.z.string(),
    vendor: zod_1.z.string().optional()
});
exports.TrainingEventRollupSchema = zod_1.z.object({
    group_key: zod_1.z.string(),
    group_type: zod_1.z.enum(["org", "team", "role"]),
    event_type: zod_1.z.string(),
    event_count: zod_1.z.number(),
    bucket_start: zod_1.z.string(),
    bucket_end: zod_1.z.string(),
    vendor: zod_1.z.string().optional()
});
exports.OrgCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    minGroupSize: zod_1.z.number().int().positive().optional()
});
exports.DashboardRequestSchema = zod_1.z.object({
    orgId: zod_1.z.string(),
    aggregation: zod_1.z.enum(["org", "team", "role"]).optional(),
    metricNames: zod_1.z.array(zod_1.z.string()).optional()
});
exports.SignalNameSchema = zod_1.z.enum(types_1.SIGNAL_NAMES);
// Combined schema that accepts both legacy and v0 signal names
exports.AnySignalNameSchema = zod_1.z.union([exports.SignalNameSchema, exports.V0SignalNameSchema]);
exports.GroupTypeSchema = zod_1.z.enum(types_1.GROUP_TYPES);
exports.PatternTypeSchema = zod_1.z.enum(types_1.PATTERN_TYPES);
exports.BehavioralSignalMetadataSchema = zod_1.z.object({
    has_human_review: zod_1.z.boolean().optional(),
    is_cross_system: zod_1.z.boolean().optional(),
    requires_approval: zod_1.z.boolean().optional(),
    external_side_effect: zod_1.z.boolean().optional()
}).strict().optional();
exports.BehavioralSignalAggregateSchema = zod_1.z.object({
    org_id: zod_1.z.string().min(1),
    group_id: zod_1.z.string().min(1),
    group_type: exports.GroupTypeSchema,
    function_id: zod_1.z.string().min(1).optional(),
    bucket_start: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // ISO date format YYYY-MM-DD
    signal_name: exports.SignalNameSchema,
    count: zod_1.z.number().int().nonnegative(),
    tool_class: exports.ToolClassSchema.optional(),
    suppressed: zod_1.z.boolean().optional(),
    metadata: exports.BehavioralSignalMetadataSchema
}).strict().refine((data) => {
    // Require function_id for team and role group types
    if ((data.group_type === "team" || data.group_type === "role") && !data.function_id) {
        return false;
    }
    return true;
}, {
    message: "function_id is required when group_type is 'team' or 'role'"
});
exports.BehavioralSignalImportSchema = zod_1.z.object({
    aggregates: zod_1.z.array(exports.BehavioralSignalAggregateSchema).min(1)
}).strict();
// Schema for connector-transformed signals (supports v0 signal names)
exports.ConnectorSignalAggregateSchema = zod_1.z.object({
    org_id: zod_1.z.string().min(1),
    group_id: zod_1.z.string().min(1),
    group_type: exports.GroupTypeSchema,
    function_id: zod_1.z.string().min(1).optional(),
    bucket_start: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    signal_name: exports.AnySignalNameSchema, // Supports both legacy and v0 signal names
    count: zod_1.z.number().int().nonnegative(),
    tool_class: exports.ToolClassSchema.optional(),
    suppressed: zod_1.z.boolean().optional(),
    metadata: exports.BehavioralSignalMetadataSchema
}).strict().refine((data) => {
    if ((data.group_type === "team" || data.group_type === "role") && !data.function_id) {
        return false;
    }
    return true;
}, {
    message: "function_id is required when group_type is 'team' or 'role'"
});
exports.ConnectorSignalImportSchema = zod_1.z.object({
    aggregates: zod_1.z.array(exports.ConnectorSignalAggregateSchema).min(1)
}).strict();
// Schema for connector event import (external events before transformation)
exports.ExternalEventSchema = zod_1.z.object({
    event_type: zod_1.z.string().min(1),
    timestamp: zod_1.z.string(),
}).passthrough(); // Allow additional fields
exports.ConnectorEventImportSchema = zod_1.z.object({
    vendor: zod_1.z.string().min(1),
    connector_name: zod_1.z.string().min(1),
    org_id: zod_1.z.string().min(1),
    group_id: zod_1.z.string().min(1),
    group_type: exports.GroupTypeSchema,
    function_id: zod_1.z.string().min(1).optional(),
    bucket_start: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    events: zod_1.z.array(exports.ExternalEventSchema).min(1)
}).strict().refine((data) => {
    if ((data.group_type === "team" || data.group_type === "role") && !data.function_id) {
        return false;
    }
    return true;
}, {
    message: "function_id is required when group_type is 'team' or 'role'"
});
exports.BehavioralPatternSignalSchema = zod_1.z.object({
    signal_name: exports.SignalNameSchema,
    count: zod_1.z.number().int().nonnegative()
});
exports.BehavioralPatternTrendSchema = zod_1.z.object({
    direction: zod_1.z.enum(["increasing", "stable", "decreasing"]),
    magnitude: zod_1.z.enum(["slight", "moderate", "significant"])
}).strict().optional();
exports.BehavioralPatternSchema = zod_1.z.object({
    pattern_type: exports.PatternTypeSchema,
    group_id: zod_1.z.string().min(1),
    group_type: zod_1.z.enum(["function", "org"]), // Patterns only at function+ level
    bucket_start: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    description: zod_1.z.string().min(1),
    confidence: zod_1.z.enum(["low", "medium", "high"]),
    signals: zod_1.z.array(exports.BehavioralPatternSignalSchema),
    trends: exports.BehavioralPatternTrendSchema
}).strict();
