import { z } from "zod";

export const FluencyWindowSchema = z.enum(["60d", "3m", "6m", "12m"]);
export type FluencyWindow = z.infer<typeof FluencyWindowSchema>;

export const FluencyScopeSchema = z.enum(["org", "function", "workflow"]);
export type FluencyScope = z.infer<typeof FluencyScopeSchema>;

export const RiskClassSchema = z.enum(["low", "medium", "high"]);
export type RiskClass = z.infer<typeof RiskClassSchema>;

const FluencyEventBaseSchema = z.object({
  timestamp: z.string().min(1),
  risk_class: RiskClassSchema,
  org_unit: z.string().min(1).optional()
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
