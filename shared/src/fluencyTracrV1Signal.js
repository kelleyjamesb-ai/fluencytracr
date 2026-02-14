"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FluencyTracrV1EvaluationDecisionSchema = exports.FluencyTracrV1DecisionSchema = exports.FluencyTracrV1EventSchema = exports.FluencyTracrV1AbandonmentObservedSchema = exports.FluencyTracrV1LatencyObservedSchema = exports.FluencyTracrV1RecoveryObservedSchema = exports.FluencyTracrV1VerificationPresenceObservedSchema = exports.FluencyTracrV1IterationDepthObservedSchema = exports.FluencyTracrV1DispositionObservedSchema = exports.FluencyTracrV1AmbiguityReasonCodeSchema = exports.FluencyTracrV1ToolSurfaceSchema = exports.FluencyTracrV1EventNameSchema = exports.FluencyTracrV1SchemaVersionSchema = void 0;
const zod_1 = require("zod");
exports.FluencyTracrV1SchemaVersionSchema = zod_1.z.literal("FT_V1_2026_01");
exports.FluencyTracrV1EventNameSchema = zod_1.z.enum([
    "FT_V1_DISPOSITION_OBSERVED",
    "FT_V1_ITERATION_DEPTH_OBSERVED",
    "FT_V1_VERIFICATION_PRESENCE_OBSERVED",
    "FT_V1_RECOVERY_OBSERVED",
    "FT_V1_LATENCY_OBSERVED",
    "FT_V1_ABANDONMENT_OBSERVED"
]);
exports.FluencyTracrV1ToolSurfaceSchema = zod_1.z.enum(["ASSISTANT", "AGENT", "SEARCH"]);
exports.FluencyTracrV1AmbiguityReasonCodeSchema = zod_1.z.enum([
    "AMB_SCHEMA_MISSING_REQUIRED",
    "AMB_SCHEMA_INVALID_TYPE",
    "AMB_SCHEMA_OUT_OF_RANGE",
    "AMB_TEMPORAL_WINDOW_UNKNOWN",
    "AMB_TEMPORAL_EVENT_OUTSIDE_WINDOW",
    "AMB_EVIDENCE_CONFLICT",
    "AMB_EVIDENCE_INSUFFICIENT",
    "AMB_SOURCE_UNTRUSTED",
    "AMB_TOOL_SURFACE_UNKNOWN"
]);
const FluencyTracrV1BaseEventSchema = zod_1.z.object({
    schema_version: exports.FluencyTracrV1SchemaVersionSchema,
    event_name: exports.FluencyTracrV1EventNameSchema,
    org_id: zod_1.z.string().min(1),
    function_id: zod_1.z.string().min(1),
    role_class: zod_1.z.string().min(1),
    tool_surface: exports.FluencyTracrV1ToolSurfaceSchema,
    event_timestamp: zod_1.z.string().min(1),
    window_id: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}__\d{4}-\d{2}-\d{2}$/),
    ambiguity_flag: zod_1.z.boolean(),
    ambiguity_reason_code: exports.FluencyTracrV1AmbiguityReasonCodeSchema.optional()
}).strict();
exports.FluencyTracrV1DispositionObservedSchema = FluencyTracrV1BaseEventSchema.extend({
    event_name: zod_1.z.literal("FT_V1_DISPOSITION_OBSERVED"),
    disposition: zod_1.z.enum(["ACCEPT", "EDIT", "REJECT", "ABANDON"])
}).strict();
exports.FluencyTracrV1IterationDepthObservedSchema = FluencyTracrV1BaseEventSchema.extend({
    event_name: zod_1.z.literal("FT_V1_ITERATION_DEPTH_OBSERVED"),
    iteration_depth: zod_1.z.enum(["NONE", "LIGHT", "HEAVY"])
}).strict();
exports.FluencyTracrV1VerificationPresenceObservedSchema = FluencyTracrV1BaseEventSchema.extend({
    event_name: zod_1.z.literal("FT_V1_VERIFICATION_PRESENCE_OBSERVED"),
    verification_present: zod_1.z.boolean()
}).strict();
exports.FluencyTracrV1RecoveryObservedSchema = FluencyTracrV1BaseEventSchema.extend({
    event_name: zod_1.z.literal("FT_V1_RECOVERY_OBSERVED"),
    recovery_present: zod_1.z.boolean()
}).strict();
exports.FluencyTracrV1LatencyObservedSchema = FluencyTracrV1BaseEventSchema.extend({
    event_name: zod_1.z.literal("FT_V1_LATENCY_OBSERVED"),
    latency_ms: zod_1.z.number().int().nonnegative()
}).strict();
exports.FluencyTracrV1AbandonmentObservedSchema = FluencyTracrV1BaseEventSchema.extend({
    event_name: zod_1.z.literal("FT_V1_ABANDONMENT_OBSERVED"),
    abandonment_present: zod_1.z.boolean()
}).strict();
const FluencyTracrV1EventUnionSchema = zod_1.z.discriminatedUnion("event_name", [
    exports.FluencyTracrV1DispositionObservedSchema,
    exports.FluencyTracrV1IterationDepthObservedSchema,
    exports.FluencyTracrV1VerificationPresenceObservedSchema,
    exports.FluencyTracrV1RecoveryObservedSchema,
    exports.FluencyTracrV1LatencyObservedSchema,
    exports.FluencyTracrV1AbandonmentObservedSchema
]);
exports.FluencyTracrV1EventSchema = FluencyTracrV1EventUnionSchema.superRefine((event, context) => {
    if (event.ambiguity_flag && !event.ambiguity_reason_code) {
        context.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "ambiguity_reason_code must be set iff ambiguity_flag is true",
            path: ["ambiguity_reason_code"]
        });
    }
    if (!event.ambiguity_flag && event.ambiguity_reason_code) {
        context.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "ambiguity_reason_code must be set iff ambiguity_flag is true",
            path: ["ambiguity_reason_code"]
        });
    }
});
exports.FluencyTracrV1DecisionSchema = zod_1.z.literal("SURFACE");
exports.FluencyTracrV1EvaluationDecisionSchema = zod_1.z.object({
    schema_version: exports.FluencyTracrV1SchemaVersionSchema,
    org_id: zod_1.z.string().min(1),
    function_id: zod_1.z.string().min(1),
    role_class: zod_1.z.string().min(1),
    window_id: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}__\d{4}-\d{2}-\d{2}$/),
    decision: exports.FluencyTracrV1DecisionSchema
}).strict();
