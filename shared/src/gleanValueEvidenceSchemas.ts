import { z } from "zod";

export const GleanValueEvidenceSchemaVersionSchema = z.literal("GVE_2026_05");

export const GleanValuePostureSchema = z.enum([
  "validated",
  "directional",
  "assumption_heavy",
  "coverage_limited",
  "internal_only",
  "not_computed",
  "suppressed"
]);

export const GleanValueEvidenceLaneSchema = z.enum([
  "surface_usage",
  "skill_lifecycle",
  "agent_lifecycle",
  "mcp_action_boundary",
  "artifact_output",
  "control_evidence",
  "assumptions"
]);

export const GleanValueEvidenceStateSchema = z.enum([
  "present",
  "not_present",
  "suppressed",
  "not_computed"
]);

export const GleanValueSurfaceSchema = z.enum([
  "ui_chat",
  "ui_search",
  "ai_answers",
  "chat_api",
  "search_api",
  "gleanbot",
  "autocomplete",
  "skills",
  "auto_mode_agents",
  "content_triggered_agents",
  "scheduled_agents",
  "mcp_actions",
  "embedded_hosts",
  "canvas_artifacts",
  "protect_runtime_controls"
]);

export const GleanClaimLanguageModeSchema = z.enum([
  "executive_safe",
  "customer_safe_with_caveats",
  "internal_only",
  "suppressed"
]);

export const GleanValueClaimReadinessStateSchema = z.enum([
  "customer_safe",
  "customer_safe_with_caveats",
  "internal_only",
  "not_computed",
  "suppressed"
]);

export const GleanValueReasonCodeSchema = z.enum([
  "evidence_present",
  "directional_only",
  "assumption_dominates_result",
  "coverage_limited",
  "missing_source",
  "source_suppressed",
  "not_mapped",
  "governance_approval_missing",
  "customer_unsafe_claim",
  "raw_content_required",
  "direct_identifier_required",
  "join_keys_unstable",
  "roi_translation_not_approved"
]);

const ShortTextSchema = z.string().min(1).max(500);

const GleanValueExecutiveSummarySchema = z
  .object({
    summary: ShortTextSchema,
    approved_language: ShortTextSchema,
    caveats: z.array(ShortTextSchema).default([])
  })
  .strict();

const GleanValueCoverageLaneSchema = z
  .object({
    lane: GleanValueEvidenceLaneSchema,
    evidence_state: GleanValueEvidenceStateSchema,
    covered_surfaces: z.array(GleanValueSurfaceSchema).default([]),
    missing_surfaces: z.array(GleanValueSurfaceSchema).default([]),
    notes: z.array(ShortTextSchema).default([])
  })
  .strict();

const SkillLifecycleEvidenceSchema = z
  .object({
    evidence_state: GleanValueEvidenceStateSchema,
    skill_types: z.array(z.enum(["platform", "personal", "org", "imported"])).default([]),
    enabled_skill_count: z.number().int().nonnegative().optional(),
    invocation_count: z.number().int().nonnegative().optional(),
    successful_invocation_count: z.number().int().nonnegative().optional(),
    reused_skill_count: z.number().int().nonnegative().optional(),
    associated_agent_count: z.number().int().nonnegative().optional(),
    notes: z.array(ShortTextSchema).default([])
  })
  .strict();

const AgentLifecycleEvidenceSchema = z
  .object({
    evidence_state: GleanValueEvidenceStateSchema,
    agent_types: z.array(z.enum(["auto_mode", "content_triggered", "scheduled", "manual", "other"])).default([]),
    created_count: z.number().int().nonnegative().optional(),
    tested_count: z.number().int().nonnegative().optional(),
    enabled_count: z.number().int().nonnegative().optional(),
    run_count: z.number().int().nonnegative().optional(),
    completed_run_count: z.number().int().nonnegative().optional(),
    failed_run_count: z.number().int().nonnegative().optional(),
    retried_run_count: z.number().int().nonnegative().optional(),
    triggered_run_count: z.number().int().nonnegative().optional(),
    artifact_output_count: z.number().int().nonnegative().optional(),
    action_invocation_count: z.number().int().nonnegative().optional(),
    notes: z.array(ShortTextSchema).default([])
  })
  .strict();

const McpActionBoundaryEvidenceSchema = z
  .object({
    evidence_state: GleanValueEvidenceStateSchema,
    host_classes: z.array(z.enum(["managed_saas", "embedded_host", "local_ide", "gateway", "other"])).default([]),
    operation_classes: z.array(z.enum(["read", "write", "mixed"])).default([]),
    approved_tool_count: z.number().int().nonnegative().optional(),
    hitl_state: GleanValueEvidenceStateSchema,
    activity_log_state: GleanValueEvidenceStateSchema,
    policy_decision_state: GleanValueEvidenceStateSchema,
    host_attribution_confidence: z.enum(["high", "medium", "low", "unknown", "not_computed"]),
    notes: z.array(ShortTextSchema).default([])
  })
  .strict();

const ArtifactOutputEvidenceSchema = z
  .object({
    evidence_state: GleanValueEvidenceStateSchema,
    artifact_types: z.array(z.enum(["document", "slide", "diagram", "spreadsheet", "interactive_page", "other"])).default([]),
    artifact_count: z.number().int().nonnegative().optional(),
    created_count: z.number().int().nonnegative().optional(),
    refreshed_artifact_count: z.number().int().nonnegative().optional(),
    refreshed_count: z.number().int().nonnegative().optional(),
    externally_shared_count: z.number().int().nonnegative().optional(),
    notes: z.array(ShortTextSchema).default([])
  })
  .strict();

const ControlEvidenceSchema = z
  .object({
    evidence_state: GleanValueEvidenceStateSchema,
    control_families: z
      .array(z.enum(["sensitive_content_policy", "runtime_ai_guardrail", "agent_alignment", "restricted_topic", "overshared_data"]))
      .default([]),
    policy_surfaces: z.array(z.enum(["assistant", "interactive_agents", "automatic_agents", "mcp_actions", "artifacts"])).default([]),
    policy_coverage_state: GleanValueEvidenceStateSchema,
    blocked_event_state: GleanValueEvidenceStateSchema,
    flagged_event_state: GleanValueEvidenceStateSchema,
    review_event_state: GleanValueEvidenceStateSchema,
    alignment_check_state: GleanValueEvidenceStateSchema,
    notes: z.array(ShortTextSchema).default([])
  })
  .strict();

const AssumptionEvidenceSchema = z
  .object({
    evidence_state: GleanValueEvidenceStateSchema,
    assumption_count: z.number().int().nonnegative(),
    low_confidence_count: z.number().int().nonnegative(),
    low_confidence_assumption_count: z.number().int().nonnegative().optional(),
    high_sensitivity_count: z.number().int().nonnegative(),
    high_sensitivity_assumption_count: z.number().int().nonnegative().optional(),
    approved_for_customer_claims: z.boolean(),
    approval_state: z.enum(["draft", "internal_only", "finance_reviewed", "customer_safe"]).optional(),
    notes: z.array(ShortTextSchema).default([])
  })
  .strict();

export const GleanValueClaimReadinessSchema = z
  .object({
    claim_id: z.string().min(1).max(120),
    claim_type: z.enum([
      "time_saved",
      "roi",
      "payback",
      "surface_coverage",
      "skill_reuse",
      "agent_completion",
      "automation_deflection",
      "artifact_creation",
      "governed_action",
      "control_effectiveness"
    ]),
    evaluation_state: z.enum(["surface", "suppress"]),
    evidence_state: z.enum(["present", "missing", "suppressed", "not_computed", "not_safe_to_claim"]),
    confidence_basis: z.enum(["direct_observed", "derived_aggregate", "assumption_backed", "insufficient"]),
    readiness_state: GleanValueClaimReadinessStateSchema,
    language_mode: GleanClaimLanguageModeSchema,
    reason_codes: z.array(GleanValueReasonCodeSchema).default([]),
    contributing_lanes: z.array(GleanValueEvidenceLaneSchema).default([]),
    approved_language: ShortTextSchema.optional(),
    customer_safe_language: ShortTextSchema.nullable().optional()
  })
  .strict()
  .superRefine((claim, ctx) => {
    const unsafeEvidence = ["missing", "suppressed", "not_computed", "not_safe_to_claim"].includes(
      claim.evidence_state
    );
    const safeLanguage = claim.language_mode === "executive_safe" || claim.language_mode === "customer_safe_with_caveats";
    const safeReadiness =
      claim.readiness_state === "customer_safe" || claim.readiness_state === "customer_safe_with_caveats";

    if (claim.evaluation_state === "suppress" || unsafeEvidence) {
      if (claim.language_mode !== "suppressed") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["language_mode"],
          message: "Suppressed or unsafe claims must use suppressed language mode."
        });
      }
      if (claim.readiness_state !== "suppressed" && claim.readiness_state !== "not_computed") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["readiness_state"],
          message: "Suppressed or unsafe claims must be suppressed or not_computed."
        });
      }
      if (claim.reason_codes.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reason_codes"],
          message: "Suppressed or unsafe claims must include at least one reason code."
        });
      }
      if (claim.customer_safe_language) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customer_safe_language"],
          message: "Suppressed or unsafe claims must not include customer-safe language."
        });
      }
      if (claim.approved_language) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["approved_language"],
          message: "Suppressed or unsafe claims must not include approved language."
        });
      }
    }

    if (safeLanguage && !claim.customer_safe_language && !claim.approved_language) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customer_safe_language"],
        message: "Customer-safe claim language requires approved language."
      });
    }

    if (safeReadiness && !safeLanguage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["language_mode"],
        message: "Customer-safe readiness requires customer-safe language mode."
      });
    }

    if (claim.claim_type === "roi" && (safeLanguage || safeReadiness)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["language_mode"],
        message: "ROI claim readiness must not use customer-safe language until assumption governance approves it."
      });
    }
  });

const NextInstrumentationActionSchema = z
  .object({
    lane: GleanValueEvidenceLaneSchema,
    action: ShortTextSchema,
    owner: z.enum(["glean_admin", "customer_admin", "fluencytracr_operator", "data_governance"]),
    priority: z.enum(["high", "medium", "low"])
  })
  .strict();

export const GleanValueEvidencePackSchema = z
  .object({
    schema_version: GleanValueEvidenceSchemaVersionSchema,
    org_id: z.string().min(1),
    window: z.string().min(1),
    generated_at: z.string().datetime(),
    source_system: z.literal("Glean"),
    value_posture: GleanValuePostureSchema,
    executive_summary: GleanValueExecutiveSummarySchema,
    coverage_lanes: z.array(GleanValueCoverageLaneSchema).min(1),
    skill_lifecycle: SkillLifecycleEvidenceSchema,
    agent_lifecycle: AgentLifecycleEvidenceSchema,
    mcp_action_boundary: McpActionBoundaryEvidenceSchema,
    artifact_outputs: ArtifactOutputEvidenceSchema,
    control_evidence: ControlEvidenceSchema,
    assumptions: AssumptionEvidenceSchema,
    claim_readiness: z.array(GleanValueClaimReadinessSchema).min(1),
    next_instrumentation_actions: z.array(NextInstrumentationActionSchema).default([])
  })
  .strict();

export type GleanValueEvidencePack = z.infer<typeof GleanValueEvidencePackSchema>;
export type GleanValueEvidenceLane = z.infer<typeof GleanValueEvidenceLaneSchema>;
export type GleanValueClaimReadinessState = z.infer<typeof GleanValueClaimReadinessStateSchema>;
export type GleanValueClaimReadiness = z.infer<typeof GleanValueClaimReadinessSchema>;

export function buildGleanValueEvidencePack(raw: unknown): GleanValueEvidencePack {
  return GleanValueEvidencePackSchema.parse(raw);
}
