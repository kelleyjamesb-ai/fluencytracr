"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoardSnapshotResponseSchema = exports.BoardSnapshotWorkflowRowSchema = exports.BoardSnapshotVisibilityLabelSchema = exports.BoardSnapshotWorkingStyleSchema = exports.OrientationWorkflowVisibilitySummaryResponseSchema = exports.OrientationWorkflowVisibilitySummarySchema = exports.WorkflowRegistryAuditResponseSchema = exports.WorkflowRegistryAuditEventSchema = exports.WorkflowRegistryWorkflowsResponseSchema = exports.WorkflowRegistryWorkflowSummarySchema = exports.WorkflowRegistryCreateVersionResponseSchema = exports.WorkflowRegistryVersionsResponseSchema = exports.WorkflowRegistryVersionRecordSchema = exports.WorkflowRegistryVersionCreateSchema = exports.WorkflowVisibilityPolicyConfigSchema = exports.CoverageSummarySchema = exports.DecisionLedgerEvaluationInputSchema = exports.DecisionLedgerCreateSchema = exports.DecisionLedgerEntrySchema = exports.LedgerMetaSchema = exports.LedgerEvaluationSchema = exports.LedgerObservationSchema = exports.LedgerRationaleSchema = exports.DecisionSchema = exports.SignalMovementSchema = exports.LoggedByRoleSchema = exports.DecisionScopeSchema = exports.DecisionTypeSchema = exports.OrientationSignalResponseSchema = exports.OrientationSuppressionInEffectSchema = exports.OrientationObservationDetectedSchema = exports.OrientationSuppressionStateSchema = exports.OrientationObservationDetectedStateSchema = exports.FluencyPatternSchema = exports.FluencyRecommendedPostureSchema = exports.FluencyConfidenceSchema = exports.FluencySignalStatusSchema = exports.FluencyPatternNameSchema = exports.FluencyEventIngestSchema = exports.FluencyEventSchema = exports.AiAbandonmentEventSchema = exports.VerificationSignalEventSchema = exports.WorkflowStageTransitionEventSchema = exports.AiRecoveryLoopEventSchema = exports.AiOutputDispositionEventSchema = exports.RiskClassSchema = exports.FluencyScopeSchema = exports.FluencyWindowSchema = void 0;
const zod_1 = require("zod");
exports.FluencyWindowSchema = zod_1.z.enum(["30d", "60d", "3m", "6m", "12m"]);
exports.FluencyScopeSchema = zod_1.z.enum(["org", "function", "workflow"]);
exports.RiskClassSchema = zod_1.z.enum(["low", "medium", "high"]);
const FluencyEventBaseSchema = zod_1.z.object({
    timestamp: zod_1.z.string().min(1),
    risk_class: exports.RiskClassSchema,
    org_unit: zod_1.z.string().min(1).optional()
});
exports.AiOutputDispositionEventSchema = FluencyEventBaseSchema.extend({
    event_type: zod_1.z.literal("ai_output_disposition"),
    workflow_id: zod_1.z.string().min(1),
    disposition: zod_1.z.enum(["accepted", "edited", "rejected", "abandoned"]),
    edit_distance_bucket: zod_1.z.enum(["none", "light", "heavy"]),
    verification_present: zod_1.z.boolean(),
    time_to_action_ms: zod_1.z.number().int().nonnegative()
}).strict();
exports.AiRecoveryLoopEventSchema = FluencyEventBaseSchema.extend({
    event_type: zod_1.z.literal("ai_recovery_loop"),
    workflow_id: zod_1.z.string().min(1),
    recovery_type: zod_1.z.enum(["human_correction", "re_prompt", "escalation"]),
    cycles: zod_1.z.number().int().nonnegative(),
    resolution_time_ms: zod_1.z.number().int().nonnegative()
}).strict();
exports.WorkflowStageTransitionEventSchema = FluencyEventBaseSchema.extend({
    event_type: zod_1.z.literal("workflow_stage_transition"),
    workflow_id: zod_1.z.string().min(1),
    stage_from: zod_1.z.string().min(1),
    stage_to: zod_1.z.string().min(1),
    ai_assisted: zod_1.z.boolean()
}).strict();
exports.VerificationSignalEventSchema = FluencyEventBaseSchema.extend({
    event_type: zod_1.z.literal("verification_signal"),
    workflow_id: zod_1.z.string().min(1),
    verification_type: zod_1.z.enum(["policy_check", "data_lookup", "peer_review"]),
    verification_latency_ms: zod_1.z.number().int().nonnegative()
}).strict();
exports.AiAbandonmentEventSchema = FluencyEventBaseSchema.extend({
    event_type: zod_1.z.literal("ai_abandonment"),
    workflow_id: zod_1.z.string().min(1),
    abandonment_stage: zod_1.z.enum(["prompted", "generated", "reviewed"]),
    reason_bucket: zod_1.z.enum(["low_quality", "low_trust", "time_pressure", "unknown"])
}).strict();
exports.FluencyEventSchema = zod_1.z.discriminatedUnion("event_type", [
    exports.AiOutputDispositionEventSchema,
    exports.AiRecoveryLoopEventSchema,
    exports.WorkflowStageTransitionEventSchema,
    exports.VerificationSignalEventSchema,
    exports.AiAbandonmentEventSchema
]);
exports.FluencyEventIngestSchema = zod_1.z.object({
    events: zod_1.z.array(exports.FluencyEventSchema).min(1)
}).strict();
exports.FluencyPatternNameSchema = zod_1.z.enum([
    "Calibrated Fluency",
    "Blind Efficiency",
    "Recovery Maturity",
    "Friction Loop",
    "Undertrust Avoidance"
]);
exports.FluencySignalStatusSchema = zod_1.z.enum([
    "Directional Signal",
    "Emerging Pattern",
    "Observed Behavioral Shift",
    "Sustained Pattern",
    "Structural Signal",
    "Organizational Maturity Signal"
]);
exports.FluencyConfidenceSchema = zod_1.z.enum(["Medium", "High"]);
exports.FluencyRecommendedPostureSchema = zod_1.z.enum(["Scale", "Stabilize", "Study"]);
exports.FluencyPatternSchema = zod_1.z.object({
    pattern_name: exports.FluencyPatternNameSchema,
    signal_status: exports.FluencySignalStatusSchema,
    confidence: exports.FluencyConfidenceSchema,
    window: exports.FluencyWindowSchema,
    risk_context: exports.RiskClassSchema,
    coverage: zod_1.z.number().min(0).max(1),
    what_we_see: zod_1.z.string().min(1),
    might_suggest: zod_1.z.string().min(1),
    does_not_mean: zod_1.z.string().min(1),
    recommended_posture: exports.FluencyRecommendedPostureSchema
}).strict();
// -----------------------------
// Phase 2: Human Orientation Signals (OSS)
// Orientation only. No evaluation, narrative, or progress inference.
// -----------------------------
exports.OrientationObservationDetectedStateSchema = zod_1.z.enum([
    "DETECTED",
    "NONE",
    "SUPPRESSED"
]);
exports.OrientationSuppressionStateSchema = zod_1.z.enum([
    "IN_EFFECT",
    "SUPPRESSED"
]);
exports.OrientationObservationDetectedSchema = zod_1.z
    .object({
    state: exports.OrientationObservationDetectedStateSchema,
    /**
     * Session Scope Note:
     * “Session” refers to a bounded, transient interaction context and carries no temporal continuity across sessions.
     */
    session_scope_note: zod_1.z.string().min(1),
    does_not_mean: zod_1.z.array(zod_1.z.string().min(1)).min(1)
})
    .strict();
exports.OrientationSuppressionInEffectSchema = zod_1.z
    .object({
    state: exports.OrientationSuppressionStateSchema,
    does_not_mean: zod_1.z.array(zod_1.z.string().min(1)).min(1)
})
    .strict();
exports.OrientationSignalResponseSchema = zod_1.z
    .object({
    org_id: zod_1.z.string().min(1),
    observation_detected: exports.OrientationObservationDetectedSchema,
    suppression_in_effect: exports.OrientationSuppressionInEffectSchema,
    generated_at: zod_1.z.string().min(1)
})
    .strict();
exports.DecisionTypeSchema = zod_1.z.enum(["process_change", "guidance", "enablement", "pilot", "pause"]);
exports.DecisionScopeSchema = zod_1.z.enum(["org", "function", "workflow"]);
exports.LoggedByRoleSchema = zod_1.z.enum(["executive", "exec_staff"]);
exports.SignalMovementSchema = zod_1.z.enum(["aligned", "unchanged", "counter"]);
exports.DecisionSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().min(1),
    decision_type: exports.DecisionTypeSchema,
    scope: exports.DecisionScopeSchema,
    decision_date: zod_1.z.string().min(1),
    logged_by_role: exports.LoggedByRoleSchema
}).strict();
exports.LedgerRationaleSchema = zod_1.z.object({
    primary_pattern: exports.FluencyPatternNameSchema,
    secondary_pattern: exports.FluencyPatternNameSchema.optional(),
    signal_status_at_decision: exports.FluencySignalStatusSchema,
    confidence_at_decision: exports.FluencyConfidenceSchema
}).strict();
exports.LedgerObservationSchema = zod_1.z.object({
    window_type: zod_1.z.literal("rolling"),
    window_length_days: zod_1.z.number().int().positive().default(60),
    observation_start: zod_1.z.string().min(1),
    observation_end: zod_1.z.string().min(1),
    status: zod_1.z.enum(["observing", "complete"])
}).strict();
exports.LedgerEvaluationSchema = zod_1.z.object({
    signal_movement: exports.SignalMovementSchema,
    observed_patterns: zod_1.z.array(zod_1.z.object({
        pattern: exports.FluencyPatternNameSchema,
        direction: zod_1.z.enum(["up", "down", "flat"])
    }).strict()),
    confidence: exports.FluencyConfidenceSchema,
    confounds: zod_1.z.array(zod_1.z.string().min(1)).default([]),
    interpretation: zod_1.z.string().min(1)
}).strict();
exports.LedgerMetaSchema = zod_1.z.object({
    coverage_at_evaluation: zod_1.z.number().min(0).max(1).optional(),
    created_at: zod_1.z.string().min(1),
    locked_at: zod_1.z.string().min(1)
}).strict();
exports.DecisionLedgerEntrySchema = zod_1.z.object({
    ledger_id: zod_1.z.string().uuid(),
    decision: exports.DecisionSchema,
    rationale: exports.LedgerRationaleSchema,
    observation: exports.LedgerObservationSchema,
    evaluation: exports.LedgerEvaluationSchema.optional(),
    meta: exports.LedgerMetaSchema
}).strict();
exports.DecisionLedgerCreateSchema = zod_1.z.object({
    decision: exports.DecisionSchema,
    rationale: exports.LedgerRationaleSchema,
    observation: exports.LedgerObservationSchema.optional()
}).strict();
exports.DecisionLedgerEvaluationInputSchema = zod_1.z.object({
    evaluation: exports.LedgerEvaluationSchema
}).strict();
exports.CoverageSummarySchema = zod_1.z.object({
    window: exports.FluencyWindowSchema,
    cohort_size: zod_1.z.number().int().nonnegative(),
    coverage: zod_1.z.number().min(0).max(1),
    verification_rate: zod_1.z.number().min(0).max(1),
    risk_mix: zod_1.z.object({
        low: zod_1.z.number().min(0).max(1),
        medium: zod_1.z.number().min(0).max(1),
        high: zod_1.z.number().min(0).max(1)
    })
}).strict();
exports.WorkflowVisibilityPolicyConfigSchema = zod_1.z.object({
    policy_version: zod_1.z.string().min(1),
    low_min_events: zod_1.z.number().int().positive(),
    medium_min_events: zod_1.z.number().int().positive(),
    high_min_events: zod_1.z.number().int().positive(),
    min_window_days: zod_1.z.number().int().positive(),
    high_sparse_min_events: zod_1.z.number().int().positive(),
    high_sparse_min_window_days: zod_1.z.number().int().positive()
}).strict();
exports.WorkflowRegistryVersionCreateSchema = zod_1.z.object({
    risk_class: exports.RiskClassSchema,
    change_reason: zod_1.z.string().min(1).optional(),
    policy_config: exports.WorkflowVisibilityPolicyConfigSchema.optional()
}).strict();
exports.WorkflowRegistryVersionRecordSchema = zod_1.z.object({
    version: zod_1.z.number().int().positive(),
    risk_class: exports.RiskClassSchema,
    change_reason: zod_1.z.string().nullable(),
    actor_sub: zod_1.z.string().nullable(),
    actor_role: zod_1.z.string().nullable(),
    policy_config: exports.WorkflowVisibilityPolicyConfigSchema.nullable(),
    created_at: zod_1.z.string().min(1)
}).strict();
exports.WorkflowRegistryVersionsResponseSchema = zod_1.z.object({
    org_id: zod_1.z.string().min(1),
    workflow_id: zod_1.z.string().min(1),
    versions: zod_1.z.array(exports.WorkflowRegistryVersionRecordSchema)
}).strict();
exports.WorkflowRegistryCreateVersionResponseSchema = zod_1.z.object({
    workflow_id: zod_1.z.string().min(1),
    version: zod_1.z.number().int().positive(),
    risk_class: exports.RiskClassSchema,
    change_reason: zod_1.z.string().nullable(),
    created_at: zod_1.z.string().min(1)
}).strict();
exports.WorkflowRegistryWorkflowSummarySchema = zod_1.z.object({
    workflow_id: zod_1.z.string().min(1),
    version: zod_1.z.number().int().positive(),
    risk_class: exports.RiskClassSchema,
    created_at: zod_1.z.string().min(1)
}).strict();
exports.WorkflowRegistryWorkflowsResponseSchema = zod_1.z.object({
    org_id: zod_1.z.string().min(1),
    workflows: zod_1.z.array(exports.WorkflowRegistryWorkflowSummarySchema)
}).strict();
exports.WorkflowRegistryAuditEventSchema = zod_1.z.object({
    workflow_id: zod_1.z.string().min(1),
    version: zod_1.z.number().int().positive(),
    action: zod_1.z.enum(["REGISTERED", "BASELINE_RESET"]),
    actor_sub: zod_1.z.string().nullable(),
    actor_role: zod_1.z.string().nullable(),
    metadata: zod_1.z.record(zod_1.z.unknown()),
    created_at: zod_1.z.string().min(1)
}).strict();
exports.WorkflowRegistryAuditResponseSchema = zod_1.z.object({
    org_id: zod_1.z.string().min(1),
    events: zod_1.z.array(exports.WorkflowRegistryAuditEventSchema)
}).strict();
exports.OrientationWorkflowVisibilitySummarySchema = zod_1.z.object({
    visible: zod_1.z.number().int().nonnegative(),
    not_enough_data_yet: zod_1.z.number().int().nonnegative(),
    not_shown_safety: zod_1.z.number().int().nonnegative()
}).strict();
exports.OrientationWorkflowVisibilitySummaryResponseSchema = zod_1.z.object({
    org_id: zod_1.z.string().min(1),
    workflow_visibility_summary: exports.OrientationWorkflowVisibilitySummarySchema
}).strict();
exports.BoardSnapshotWorkingStyleSchema = zod_1.z.enum([
    "Balanced AI use",
    "Fast AI use",
    "Strong recovery behavior",
    "High back-and-forth",
    "AI started but not used"
]);
exports.BoardSnapshotVisibilityLabelSchema = zod_1.z.enum([
    "Clear enough to show",
    "Not enough data yet",
    "Not shown (safety)"
]);
exports.BoardSnapshotWorkflowRowSchema = zod_1.z.object({
    workflow_id: zod_1.z.string().min(1),
    workflow_display_name: zod_1.z.string().min(1),
    working_style: exports.BoardSnapshotWorkingStyleSchema.nullable(),
    visibility_state: zod_1.z.enum(["VISIBLE", "NOT_ENOUGH_DATA_YET", "NOT_SHOWN_SAFETY"]),
    visibility_label: exports.BoardSnapshotVisibilityLabelSchema,
    observation_window: exports.FluencyWindowSchema
}).strict();
exports.BoardSnapshotResponseSchema = zod_1.z.object({
    org_id: zod_1.z.string().min(1),
    header: zod_1.z.object({
        observation_window: exports.FluencyWindowSchema,
        visible: zod_1.z.number().int().nonnegative(),
        not_enough_data_yet: zod_1.z.number().int().nonnegative(),
        not_shown_safety: zod_1.z.number().int().nonnegative()
    }).strict(),
    workflows: zod_1.z.array(exports.BoardSnapshotWorkflowRowSchema)
}).strict();
