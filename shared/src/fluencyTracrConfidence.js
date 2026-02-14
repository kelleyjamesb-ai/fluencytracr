"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunctionWindowAggregateSchema = exports.SuppressionReasonSchema = exports.SignalDecisionSchema = exports.SignalClassSchema = exports.TaskEpisodeSchema = exports.IterationDepthSchema = exports.SignalPrimitivesSchema = exports.AmbiguityStateSchema = exports.AmbiguityReasonCodeSchema = exports.AmbiguityStatusSchema = exports.ClosureReasonSchema = exports.ConfidenceSchemaVersionSchema = void 0;
const zod_1 = require("zod");
exports.ConfidenceSchemaVersionSchema = zod_1.z.literal("v1");
exports.ClosureReasonSchema = zod_1.z.enum([
    "EVENT_ADVANCE",
    "ROLE_TIMEOUT",
    "SESSION_END",
    "AMBIGUOUS"
]);
exports.AmbiguityStatusSchema = zod_1.z.enum(["CLEAR", "AMBIGUOUS"]);
exports.AmbiguityReasonCodeSchema = zod_1.z.enum([
    "NO_ADVANCE",
    "TIMEOUT",
    "CONFLICT",
    "INSTRUMENTATION"
]);
exports.AmbiguityStateSchema = zod_1.z.object({
    status: exports.AmbiguityStatusSchema,
    reason_code: exports.AmbiguityReasonCodeSchema.nullable()
}).strict().refine((state) => (state.status === "AMBIGUOUS" ? state.reason_code !== null : state.reason_code === null), {
    message: "ambiguity_state.reason_code must be set for AMBIGUOUS and null for CLEAR"
});
exports.SignalPrimitivesSchema = zod_1.z.object({
    iteration_count: zod_1.z.number().int().nonnegative(),
    verification_present: zod_1.z.boolean(),
    recovery_present: zod_1.z.boolean(),
    latency_ms: zod_1.z.number().int().nonnegative().nullable(),
    abandonment: zod_1.z.boolean()
}).strict();
exports.IterationDepthSchema = zod_1.z.enum(["None", "Light", "Heavy"]);
exports.TaskEpisodeSchema = zod_1.z.object({
    episode_id: zod_1.z.string().uuid(),
    org_id: zod_1.z.string().min(1),
    function_id: zod_1.z.string().min(1),
    role_class: zod_1.z.string().min(1),
    schema_version: exports.ConfidenceSchemaVersionSchema,
    start_ts: zod_1.z.string().min(1),
    end_ts: zod_1.z.string().min(1).nullable(),
    closure_reason: exports.ClosureReasonSchema,
    ambiguity_state: exports.AmbiguityStateSchema,
    signal_primitives: exports.SignalPrimitivesSchema
}).strict();
exports.SignalClassSchema = zod_1.z.enum([
    "INTERACTION",
    "ITERATION",
    "VERIFICATION",
    "RECOVERY",
    "LATENCY",
    "ABANDONMENT"
]);
exports.SignalDecisionSchema = zod_1.z.enum(["SURFACE", "SUPPRESS"]);
exports.SuppressionReasonSchema = zod_1.z.enum([
    "INSUFFICIENT_TIME",
    "INSUFFICIENT_VOLUME",
    "NO_CONVERGENCE",
    "BASELINE_UNSTABLE",
    "HIGH_AMBIGUITY"
]);
exports.FunctionWindowAggregateSchema = zod_1.z.object({
    org_id: zod_1.z.string().min(1),
    function_id: zod_1.z.string().min(1),
    schema_version: exports.ConfidenceSchemaVersionSchema,
    window_start: zod_1.z.string().min(1),
    window_end: zod_1.z.string().min(1),
    decision: exports.SignalDecisionSchema,
    suppression_reason: exports.SuppressionReasonSchema.nullable(),
    signal_classes: zod_1.z.array(exports.SignalClassSchema),
    positive_evidence_present: zod_1.z.boolean(),
    ghost_use_evaluated: zod_1.z.boolean(),
    rolled_up: zod_1.z.boolean(),
    ambiguity_rate: zod_1.z.number().min(0).max(1),
    eligible_contributors: zod_1.z.number().int().nonnegative(),
    population_episodes: zod_1.z.number().int().nonnegative(),
    non_ambiguous_episodes: zod_1.z.number().int().nonnegative()
}).strict();
