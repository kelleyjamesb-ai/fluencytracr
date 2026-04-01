import { z } from "zod";

export const FluencyWindowSchema = z.enum([
  "30d",
  "60d",
  "90d",
  "180d",
  "360d",
  "3m",
  "6m",
  "12m"
]);
export type FluencyWindow = z.infer<typeof FluencyWindowSchema>;

/** All tokens accepted for `window` / baseline-style query params (observability, traces, etc.). */
export const FLUENCY_WINDOW_VALUES = FluencyWindowSchema.options as readonly FluencyWindow[];

export const FluencyScopeSchema = z.enum(["org", "function", "workflow"]);
export type FluencyScope = z.infer<typeof FluencyScopeSchema>;

export const RiskClassSchema = z.enum(["low", "medium", "high"]);
export type RiskClass = z.infer<typeof RiskClassSchema>;

const FluencyEventBaseSchema = z.object({
  timestamp: z.string().min(1),
  risk_class: RiskClassSchema,
  org_unit: z.string().min(1).optional(),
  /** Platform agent/workflow run identifier (canonical when present). */
  run_id: z.string().min(1).optional(),
  /** Assistant/workflow run correlation (secondary to run_id). */
  workflow_run_id: z.string().min(1).optional(),
  /** Optional lineage; must not contain raw content (opaque IDs only). */
  agent_run_id: z.string().min(1).optional(),
  chat_id: z.string().min(1).optional()
});

export const AiOutputDispositionEventSchema = FluencyEventBaseSchema.extend({
  event_type: z.literal("ai_output_disposition"),
  workflow_id: z.string().min(1),
  disposition: z.enum(["accepted", "edited", "rejected", "abandoned"]),
  edit_distance_bucket: z.enum(["none", "light", "heavy"]),
  verification_present: z.boolean(),
  time_to_action_ms: z.number().int().nonnegative()
}).strict();

export const AiRecoveryLoopEventSchema = FluencyEventBaseSchema.extend({
  event_type: z.literal("ai_recovery_loop"),
  workflow_id: z.string().min(1),
  recovery_type: z.enum(["human_correction", "re_prompt", "escalation"]),
  cycles: z.number().int().nonnegative(),
  resolution_time_ms: z.number().int().nonnegative()
}).strict();

export const WorkflowStageTransitionEventSchema = FluencyEventBaseSchema.extend({
  event_type: z.literal("workflow_stage_transition"),
  workflow_id: z.string().min(1),
  stage_from: z.string().min(1),
  stage_to: z.string().min(1),
  ai_assisted: z.boolean()
}).strict();

export const VerificationSignalEventSchema = FluencyEventBaseSchema.extend({
  event_type: z.literal("verification_signal"),
  workflow_id: z.string().min(1),
  verification_type: z.enum(["policy_check", "data_lookup", "peer_review"]),
  verification_latency_ms: z.number().int().nonnegative()
}).strict();

export const AiAbandonmentEventSchema = FluencyEventBaseSchema.extend({
  event_type: z.literal("ai_abandonment"),
  workflow_id: z.string().min(1),
  abandonment_stage: z.enum(["prompted", "generated", "reviewed"]),
  reason_bucket: z.enum(["low_quality", "low_trust", "time_pressure", "unknown"])
}).strict();

export const FluencyEventSchema = z.discriminatedUnion("event_type", [
  AiOutputDispositionEventSchema,
  AiRecoveryLoopEventSchema,
  WorkflowStageTransitionEventSchema,
  VerificationSignalEventSchema,
  AiAbandonmentEventSchema
]);

export type FluencyEvent = z.infer<typeof FluencyEventSchema>;

export const FluencyEventIngestSchema = z.object({
  events: z.array(FluencyEventSchema).min(1)
}).strict();

export type FluencyEventIngest = z.infer<typeof FluencyEventIngestSchema>;

export const FluencyPatternNameSchema = z.enum([
  "Calibrated Fluency",
  "Blind Efficiency",
  "Recovery Maturity",
  "Friction Loop",
  "Undertrust Avoidance"
]);
export type FluencyPatternName = z.infer<typeof FluencyPatternNameSchema>;

export const FluencySignalStatusSchema = z.enum([
  "Directional Signal",
  "Emerging Pattern",
  "Observed Behavioral Shift",
  "Sustained Pattern",
  "Structural Signal",
  "Organizational Maturity Signal"
]);
export type FluencySignalStatus = z.infer<typeof FluencySignalStatusSchema>;

export const FluencyConfidenceSchema = z.enum(["Medium", "High"]);
export type FluencyConfidence = z.infer<typeof FluencyConfidenceSchema>;

export const FluencyRecommendedPostureSchema = z.enum(["Scale", "Stabilize", "Study"]);
export type FluencyRecommendedPosture = z.infer<typeof FluencyRecommendedPostureSchema>;

export const FluencyPatternSchema = z.object({
  pattern_name: FluencyPatternNameSchema,
  signal_status: FluencySignalStatusSchema,
  confidence: FluencyConfidenceSchema,
  window: FluencyWindowSchema,
  risk_context: RiskClassSchema,
  coverage: z.number().min(0).max(1),
  what_we_see: z.string().min(1),
  might_suggest: z.string().min(1),
  does_not_mean: z.string().min(1),
  recommended_posture: FluencyRecommendedPostureSchema
}).strict();

export type FluencyPattern = z.infer<typeof FluencyPatternSchema>;

// -----------------------------
// Phase 2: Human Orientation Signals (OSS)
// Orientation only. No evaluation, narrative, or progress inference.
// -----------------------------

export const OrientationObservationDetectedStateSchema = z.enum([
  "DETECTED",
  "NONE",
  "SUPPRESSED"
]);
export type OrientationObservationDetectedState = z.infer<
  typeof OrientationObservationDetectedStateSchema
>;

export const OrientationSuppressionStateSchema = z.enum([
  "IN_EFFECT",
  "SUPPRESSED"
]);
export type OrientationSuppressionState = z.infer<
  typeof OrientationSuppressionStateSchema
>;

export const OrientationObservationDetectedSchema = z
  .object({
    state: OrientationObservationDetectedStateSchema,
    /**
     * Session Scope Note:
     * “Session” refers to a bounded, transient interaction context and carries no temporal continuity across sessions.
     */
    session_scope_note: z.string().min(1),
    does_not_mean: z.array(z.string().min(1)).min(1)
  })
  .strict();

export type OrientationObservationDetected = z.infer<
  typeof OrientationObservationDetectedSchema
>;

export const OrientationSuppressionInEffectSchema = z
  .object({
    state: OrientationSuppressionStateSchema,
    does_not_mean: z.array(z.string().min(1)).min(1)
  })
  .strict();

export type OrientationSuppressionInEffect = z.infer<
  typeof OrientationSuppressionInEffectSchema
>;

export const OrientationSignalResponseSchema = z
  .object({
    org_id: z.string().min(1),
    observation_detected: OrientationObservationDetectedSchema,
    suppression_in_effect: OrientationSuppressionInEffectSchema,
    generated_at: z.string().min(1)
  })
  .strict();

export type OrientationSignalResponse = z.infer<
  typeof OrientationSignalResponseSchema
>;

export const DecisionTypeSchema = z.enum(["process_change", "guidance", "enablement", "pilot", "pause"]);
export const DecisionScopeSchema = z.enum(["org", "function", "workflow"]);
export const LoggedByRoleSchema = z.enum(["executive", "exec_staff"]);
export const SignalMovementSchema = z.enum(["aligned", "unchanged", "counter"]);

export const DecisionSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  decision_type: DecisionTypeSchema,
  scope: DecisionScopeSchema,
  decision_date: z.string().min(1),
  logged_by_role: LoggedByRoleSchema
}).strict();

export const LedgerRationaleSchema = z.object({
  primary_pattern: FluencyPatternNameSchema,
  secondary_pattern: FluencyPatternNameSchema.optional(),
  signal_status_at_decision: FluencySignalStatusSchema,
  confidence_at_decision: FluencyConfidenceSchema
}).strict();

export const LedgerObservationSchema = z.object({
  window_type: z.literal("rolling"),
  window_length_days: z.number().int().positive().default(60),
  observation_start: z.string().min(1),
  observation_end: z.string().min(1),
  status: z.enum(["observing", "complete"])
}).strict();

export const LedgerEvaluationSchema = z.object({
  signal_movement: SignalMovementSchema,
  observed_patterns: z.array(
    z.object({
      pattern: FluencyPatternNameSchema,
      direction: z.enum(["up", "down", "flat"])
    }).strict()
  ),
  confidence: FluencyConfidenceSchema,
  confounds: z.array(z.string().min(1)).default([]),
  interpretation: z.string().min(1)
}).strict();

export const LedgerMetaSchema = z.object({
  coverage_at_evaluation: z.number().min(0).max(1).optional(),
  created_at: z.string().min(1),
  locked_at: z.string().min(1)
}).strict();

export const DecisionLedgerEntrySchema = z.object({
  ledger_id: z.string().uuid(),
  decision: DecisionSchema,
  rationale: LedgerRationaleSchema,
  observation: LedgerObservationSchema,
  evaluation: LedgerEvaluationSchema.optional(),
  meta: LedgerMetaSchema
}).strict();

export type DecisionLedgerEntry = z.infer<typeof DecisionLedgerEntrySchema>;

export const DecisionLedgerCreateSchema = z.object({
  decision: DecisionSchema,
  rationale: LedgerRationaleSchema,
  observation: LedgerObservationSchema.optional()
}).strict();

export type DecisionLedgerCreate = z.infer<typeof DecisionLedgerCreateSchema>;

export const DecisionLedgerEvaluationInputSchema = z.object({
  evaluation: LedgerEvaluationSchema
}).strict();

export type DecisionLedgerEvaluationInput = z.infer<typeof DecisionLedgerEvaluationInputSchema>;

export const CoverageSummarySchema = z.object({
  window: FluencyWindowSchema,
  cohort_size: z.number().int().nonnegative(),
  coverage: z.number().min(0).max(1),
  verification_rate: z.number().min(0).max(1),
  risk_mix: z.object({
    low: z.number().min(0).max(1),
    medium: z.number().min(0).max(1),
    high: z.number().min(0).max(1)
  })
}).strict();

export type CoverageSummary = z.infer<typeof CoverageSummarySchema>;

export const WorkflowVisibilityPolicyConfigSchema = z.object({
  policy_version: z.string().min(1),
  low_min_events: z.number().int().positive(),
  medium_min_events: z.number().int().positive(),
  high_min_events: z.number().int().positive(),
  min_window_days: z.number().int().positive(),
  high_sparse_min_events: z.number().int().positive(),
  high_sparse_min_window_days: z.number().int().positive()
}).strict();
export type WorkflowVisibilityPolicyConfig = z.infer<typeof WorkflowVisibilityPolicyConfigSchema>;

export const WorkflowRegistryVersionCreateSchema = z.object({
  risk_class: RiskClassSchema,
  change_reason: z.string().min(1).optional(),
  policy_config: WorkflowVisibilityPolicyConfigSchema.optional()
}).strict();
export type WorkflowRegistryVersionCreate = z.infer<typeof WorkflowRegistryVersionCreateSchema>;

export const WorkflowRegistryVersionRecordSchema = z.object({
  version: z.number().int().positive(),
  risk_class: RiskClassSchema,
  change_reason: z.string().nullable(),
  actor_sub: z.string().nullable(),
  actor_role: z.string().nullable(),
  policy_config: WorkflowVisibilityPolicyConfigSchema.nullable(),
  created_at: z.string().min(1)
}).strict();
export type WorkflowRegistryVersionRecord = z.infer<typeof WorkflowRegistryVersionRecordSchema>;

export const WorkflowRegistryVersionsResponseSchema = z.object({
  org_id: z.string().min(1),
  workflow_id: z.string().min(1),
  versions: z.array(WorkflowRegistryVersionRecordSchema)
}).strict();
export type WorkflowRegistryVersionsResponse = z.infer<typeof WorkflowRegistryVersionsResponseSchema>;

export const WorkflowRegistryCreateVersionResponseSchema = z.object({
  workflow_id: z.string().min(1),
  version: z.number().int().positive(),
  risk_class: RiskClassSchema,
  change_reason: z.string().nullable(),
  created_at: z.string().min(1)
}).strict();
export type WorkflowRegistryCreateVersionResponse = z.infer<
  typeof WorkflowRegistryCreateVersionResponseSchema
>;

export const WorkflowRegistryWorkflowSummarySchema = z.object({
  workflow_id: z.string().min(1),
  version: z.number().int().positive(),
  risk_class: RiskClassSchema,
  created_at: z.string().min(1)
}).strict();
export type WorkflowRegistryWorkflowSummary = z.infer<typeof WorkflowRegistryWorkflowSummarySchema>;

export const WorkflowRegistryWorkflowsResponseSchema = z.object({
  org_id: z.string().min(1),
  workflows: z.array(WorkflowRegistryWorkflowSummarySchema)
}).strict();
export type WorkflowRegistryWorkflowsResponse = z.infer<typeof WorkflowRegistryWorkflowsResponseSchema>;

export const WorkflowRegistryAuditEventSchema = z.object({
  workflow_id: z.string().min(1),
  version: z.number().int().positive(),
  action: z.enum(["REGISTERED", "BASELINE_RESET"]),
  actor_sub: z.string().nullable(),
  actor_role: z.string().nullable(),
  metadata: z.record(z.unknown()),
  created_at: z.string().min(1)
}).strict();
export type WorkflowRegistryAuditEvent = z.infer<typeof WorkflowRegistryAuditEventSchema>;

export const WorkflowRegistryAuditResponseSchema = z.object({
  org_id: z.string().min(1),
  events: z.array(WorkflowRegistryAuditEventSchema)
}).strict();
export type WorkflowRegistryAuditResponse = z.infer<typeof WorkflowRegistryAuditResponseSchema>;

export const OrientationWorkflowVisibilitySummarySchema = z.object({
  visible: z.number().int().nonnegative(),
  not_enough_data_yet: z.number().int().nonnegative(),
  not_shown_safety: z.number().int().nonnegative()
}).strict();
export type OrientationWorkflowVisibilitySummary = z.infer<
  typeof OrientationWorkflowVisibilitySummarySchema
>;

export const OrientationWorkflowVisibilitySummaryResponseSchema = z.object({
  org_id: z.string().min(1),
  workflow_visibility_summary: OrientationWorkflowVisibilitySummarySchema
}).strict();
export type OrientationWorkflowVisibilitySummaryResponse = z.infer<
  typeof OrientationWorkflowVisibilitySummaryResponseSchema
>;

export const BoardSnapshotWorkingStyleSchema = z.enum([
  "Balanced AI use",
  "Fast AI use",
  "Strong recovery behavior",
  "High back-and-forth",
  "AI started but not used"
]);
export type BoardSnapshotWorkingStyle = z.infer<typeof BoardSnapshotWorkingStyleSchema>;

export const BoardSnapshotVisibilityLabelSchema = z.enum([
  "Clear enough to show",
  "Not enough data yet",
  "Not shown (safety)"
]);
export type BoardSnapshotVisibilityLabel = z.infer<typeof BoardSnapshotVisibilityLabelSchema>;

export const BoardSnapshotWorkflowRowSchema = z.object({
  workflow_id: z.string().min(1),
  workflow_display_name: z.string().min(1),
  working_style: BoardSnapshotWorkingStyleSchema.nullable(),
  visibility_state: z.enum(["VISIBLE", "NOT_ENOUGH_DATA_YET", "NOT_SHOWN_SAFETY"]),
  visibility_label: BoardSnapshotVisibilityLabelSchema,
  observation_window: FluencyWindowSchema
}).strict();
export type BoardSnapshotWorkflowRow = z.infer<typeof BoardSnapshotWorkflowRowSchema>;

export const BoardSnapshotResponseSchema = z.object({
  org_id: z.string().min(1),
  header: z.object({
    observation_window: FluencyWindowSchema,
    visible: z.number().int().nonnegative(),
    not_enough_data_yet: z.number().int().nonnegative(),
    not_shown_safety: z.number().int().nonnegative()
  }).strict(),
  workflows: z.array(BoardSnapshotWorkflowRowSchema)
}).strict();
export type BoardSnapshotResponse = z.infer<typeof BoardSnapshotResponseSchema>;

/** PRD Phase 4 — fixed key order; counts are not ranks (no sorting by value in API). */
export const ObservabilityPatternDistributionSchema = z
  .object({
    "Calibrated Fluency": z.number().int().nonnegative(),
    "Blind Efficiency": z.number().int().nonnegative(),
    "Recovery Maturity": z.number().int().nonnegative(),
    "Friction Loop": z.number().int().nonnegative(),
    "Undertrust Avoidance": z.number().int().nonnegative()
  })
  .strict();
export type ObservabilityPatternDistribution = z.infer<typeof ObservabilityPatternDistributionSchema>;

export const ObservabilityWorkflowRowSchema = z
  .object({
    workflow_id: z.string().min(1),
    executions_total: z.number().int().nonnegative(),
    executions_disclosed: z.number().int().nonnegative(),
    executions_suppressed: z.number().int().nonnegative(),
    disclosure: z.enum(["ALLOWED", "SUPPRESSED"]),
    suppression_reasons: z.array(z.string().min(1)),
    pattern_distribution: ObservabilityPatternDistributionSchema.nullable(),
    allowed_interpretation_hints: z.array(z.string().min(1))
  })
  .strict();
export type ObservabilityWorkflowRow = z.infer<typeof ObservabilityWorkflowRowSchema>;

export const ObservabilityResponseSchema = z
  .object({
    org_id: z.string().min(1),
    observation_window: FluencyWindowSchema,
    workflows: z.array(ObservabilityWorkflowRowSchema)
  })
  .strict();
export type ObservabilityResponse = z.infer<typeof ObservabilityResponseSchema>;
