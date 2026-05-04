import { z } from "zod";

/** EvidenceBundle v1 status tokens used in agent-safe summaries. */
const EvidenceStatusSchema = z.enum(["present", "not_present", "suppressed", "not_computed"]);

const ExposureSchema = z.object({
  shadow_ai: EvidenceStatusSchema,
  unsanctioned_tool_class: EvidenceStatusSchema
});

const CalibrationSchema = z.object({
  verification_presence: EvidenceStatusSchema,
  recovery_presence: EvidenceStatusSchema,
  escalation_to_safe_path_presence: EvidenceStatusSchema
});

const FragilitySchema = z.object({
  friction_loops_elevated: EvidenceStatusSchema,
  rapid_abandonment_elevated: EvidenceStatusSchema,
  blind_acceptance_risk_elevated: EvidenceStatusSchema
});

const TrendSchema = z.enum(["improving", "stable", "degrading", "suppressed", "not_computed"]);

const EvidenceBundleV1InputSchema = z.object({
  org_id: z.string().min(1),
  window: z.string().min(1),
  generated_at: z.string().min(1),
  schema_version: z.literal("evidence_bundle.v1"),
  suppression: z.object({
    suppression_applied: z.boolean(),
    suppression_reasons: z.array(z.string())
  }),
  coverage: z.object({
    instrumented_sources: z.array(z.string()),
    missing_sources: z.array(z.string()),
    coverage_notes: z.string().optional()
  }),
  exposure: ExposureSchema,
  calibration: CalibrationSchema,
  fragility: FragilitySchema,
  learning: z.object({
    trend_direction: TrendSchema
  })
});

export const AgentEvidenceResponseSchema = z
  .object({
    org_id: z.string().min(1),
    window: z.string().min(1),
    generated_at: z.string().min(1),
    suppression_applied: z.boolean(),
    suppression_reasons: z.array(z.string()),
    exposure: ExposureSchema,
    calibration: CalibrationSchema,
    fragility: FragilitySchema,
    coverage_summary: z.object({
      instrumented_sources: z.array(z.string()),
      missing_sources: z.array(z.string())
    }),
    decision_safe_guidance: z.string().min(1)
  })
  .strict();

export type AgentEvidenceResponse = z.infer<typeof AgentEvidenceResponseSchema>;

function deriveSafeGuidance(bundle: z.infer<typeof EvidenceBundleV1InputSchema>): string {
  const parts: string[] = [];
  if (bundle.suppression.suppression_applied) {
    parts.push("Suppression is active; report only allowed aggregates and reason codes.");
  }
  parts.push(`Learning trend for window: ${bundle.learning.trend_direction}.`);
  if (bundle.coverage.missing_sources.length > 0) {
    parts.push("Some expected instrumentation sources are missing for this window.");
  }
  parts.push("Do not infer hidden values, rankings, or individual attribution.");
  return parts.join(" ");
}

/** Builds the executive agent response template from a EvidenceBundle v1 object. */
export function buildAgentEvidenceResponse(raw: unknown): AgentEvidenceResponse {
  const bundle = EvidenceBundleV1InputSchema.parse(raw);
  return AgentEvidenceResponseSchema.parse({
    org_id: bundle.org_id,
    window: bundle.window,
    generated_at: bundle.generated_at,
    suppression_applied: bundle.suppression.suppression_applied,
    suppression_reasons: bundle.suppression.suppression_reasons,
    exposure: bundle.exposure,
    calibration: bundle.calibration,
    fragility: bundle.fragility,
    coverage_summary: {
      instrumented_sources: bundle.coverage.instrumented_sources,
      missing_sources: bundle.coverage.missing_sources
    },
    decision_safe_guidance: deriveSafeGuidance(bundle)
  });
}

export function validateAgentEvidenceResponse(raw: unknown): AgentEvidenceResponse {
  return AgentEvidenceResponseSchema.parse(raw);
}
