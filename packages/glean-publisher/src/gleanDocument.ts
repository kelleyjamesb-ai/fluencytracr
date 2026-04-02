import { z } from "zod";

const StatusEnum = z.enum(["present", "not_present", "suppressed", "not_computed"]);

const EvidenceBundleSchema = z
  .object({
    schema_version: z.literal("evidence_bundle.v1"),
    org_id: z.string().min(1),
    window: z.string().min(1),
    generated_at: z.string().min(1),
    suppression: z.object({
      k_min: z.number().optional(),
      suppression_applied: z.boolean(),
      suppression_reasons: z.array(z.string())
    }),
    coverage: z
      .object({
        instrumented_sources: z.array(z.string()),
        missing_sources: z.array(z.string()),
        coverage_notes: z.string().optional()
      })
      .strict(),
    exposure: z.object({
      shadow_ai: StatusEnum,
      unsanctioned_tool_class: StatusEnum
    }),
    calibration: z.object({
      verification_presence: StatusEnum,
      recovery_presence: StatusEnum,
      escalation_to_safe_path_presence: StatusEnum
    }),
    fragility: z.object({
      friction_loops_elevated: StatusEnum,
      rapid_abandonment_elevated: StatusEnum,
      blind_acceptance_risk_elevated: StatusEnum
    }),
    learning: z.object({
      trend_direction: z.enum(["improving", "stable", "degrading", "suppressed", "not_computed"])
    })
  })
  .strict();

export const GleanEvidenceDocumentSchema = z
  .object({
    doc_id: z.string().min(1),
    title: z.string().min(1),
    org_id: z.string().min(1),
    schema_version: z.literal("evidence_bundle.v1"),
    window: z.string().min(1),
    generated_at: z.string().min(1),
    suppression_applied: z.boolean(),
    suppression_reasons: z.array(z.string()),
    trend_direction: z.enum(["improving", "stable", "degrading", "suppressed", "not_computed"]),
    exposure_shadow_ai_status: StatusEnum,
    exposure_unsanctioned_tool_class_status: StatusEnum,
    calibration_verification_presence_status: StatusEnum,
    calibration_recovery_presence_status: StatusEnum,
    calibration_escalation_to_safe_path_presence_status: StatusEnum,
    fragility_friction_loops_elevated_status: StatusEnum,
    fragility_rapid_abandonment_elevated_status: StatusEnum,
    fragility_blind_acceptance_risk_elevated_status: StatusEnum,
    coverage_instrumented_sources: z.array(z.string()),
    coverage_missing_sources: z.array(z.string()),
    metadata: z.object({
      source_system: z.literal("fluencytracr"),
      contract: z.literal("evidence_bundle.v1"),
      window: z.string(),
      suppression: z.enum(["true", "false"]),
      classification: z.literal("governance_evidence")
    })
  })
  .strict();

export type GleanEvidenceDocument = z.infer<typeof GleanEvidenceDocumentSchema>;

function utcDateOnly(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid generated_at: ${iso}`);
  }
  return d.toISOString().slice(0, 10);
}

export function buildGleanDocument(raw: unknown): GleanEvidenceDocument {
  const bundle = EvidenceBundleSchema.parse(raw);
  const day = utcDateOnly(bundle.generated_at);
  const doc: GleanEvidenceDocument = {
    doc_id: `org_${bundle.org_id}_${bundle.window}_${day}`,
    title: `FluencyTracr EvidenceBundle ${bundle.window} - ${bundle.org_id} - ${day}`,
    org_id: bundle.org_id,
    schema_version: "evidence_bundle.v1",
    window: bundle.window,
    generated_at: bundle.generated_at,
    suppression_applied: bundle.suppression.suppression_applied,
    suppression_reasons: bundle.suppression.suppression_reasons,
    trend_direction: bundle.learning.trend_direction,
    exposure_shadow_ai_status: bundle.exposure.shadow_ai,
    exposure_unsanctioned_tool_class_status: bundle.exposure.unsanctioned_tool_class,
    calibration_verification_presence_status: bundle.calibration.verification_presence,
    calibration_recovery_presence_status: bundle.calibration.recovery_presence,
    calibration_escalation_to_safe_path_presence_status: bundle.calibration.escalation_to_safe_path_presence,
    fragility_friction_loops_elevated_status: bundle.fragility.friction_loops_elevated,
    fragility_rapid_abandonment_elevated_status: bundle.fragility.rapid_abandonment_elevated,
    fragility_blind_acceptance_risk_elevated_status: bundle.fragility.blind_acceptance_risk_elevated,
    coverage_instrumented_sources: bundle.coverage.instrumented_sources,
    coverage_missing_sources: bundle.coverage.missing_sources,
    metadata: {
      source_system: "fluencytracr",
      contract: "evidence_bundle.v1",
      window: bundle.window,
      suppression: bundle.suppression.suppression_applied ? "true" : "false",
      classification: "governance_evidence"
    }
  };
  return GleanEvidenceDocumentSchema.parse(doc);
}

export function validateGleanDocument(raw: unknown): GleanEvidenceDocument {
  return GleanEvidenceDocumentSchema.parse(raw);
}
