import { z } from "zod";

import {
  GleanClaimLanguageModeSchema,
  GleanValueClaimReadinessSchema,
  GleanValueClaimReadinessStateSchema,
  GleanValueEvidenceLaneSchema,
  GleanValueReasonCodeSchema,
  GleanValueSurfaceSchema
} from "./gleanValueEvidenceSchemas";

export const GleanClaimRegistrySchemaVersionSchema = z.literal("GCR_2026_05");

export const GleanClaimTypeSchema = z.enum([
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
]);

export const GleanForbiddenClaimInputSchema = z.enum([
  "direct_identifier",
  "raw_prompt",
  "raw_response",
  "transcript",
  "query_text",
  "tool_payload",
  "file_content",
  "team_ranking",
  "productivity_score",
  "hidden_suppressed_value"
]);

export const UNIVERSAL_GLEAN_FORBIDDEN_CLAIM_INPUTS = [
  "direct_identifier",
  "raw_prompt",
  "raw_response",
  "transcript",
  "query_text",
  "tool_payload",
  "file_content",
  "team_ranking",
  "productivity_score",
  "hidden_suppressed_value"
] as const;

export const GleanClaimEvaluationStateSchema = z.enum(["surface", "suppress"]);

export const GleanClaimEvidenceStateSchema = z.enum([
  "present",
  "missing",
  "suppressed",
  "not_computed",
  "not_safe_to_claim"
]);

export const GleanClaimConfidenceBasisSchema = z.enum([
  "direct_observed",
  "derived_aggregate",
  "assumption_backed",
  "insufficient"
]);

const ShortTextSchema = z.string().min(1).max(500);

const ClaimTemplateSchema = z
  .object({
    claim_id: z.string().min(1).max(120),
    claim_type: GleanClaimTypeSchema,
    description: ShortTextSchema,
    required_lanes: z.array(GleanValueEvidenceLaneSchema).min(1),
    optional_lanes: z.array(GleanValueEvidenceLaneSchema).default([]),
    required_surfaces: z.array(GleanValueSurfaceSchema).default([]),
    forbidden_inputs: z.array(GleanForbiddenClaimInputSchema).min(1),
    minimum_aggregation_scope: z.literal("org_window"),
    default_language_mode: GleanClaimLanguageModeSchema,
    allowed_language_modes: z.array(GleanClaimLanguageModeSchema).min(1),
    safe_language_template: ShortTextSchema.optional(),
    suppression_reasons: z.array(GleanValueReasonCodeSchema).min(1),
    review_owner: z.enum(["finance", "legal", "customer_success", "product", "data_governance"]),
    notes: z.array(ShortTextSchema).default([])
  })
  .strict()
  .superRefine((template, ctx) => {
    if (
      (template.default_language_mode === "executive_safe" ||
        template.default_language_mode === "customer_safe_with_caveats" ||
        template.allowed_language_modes.some((mode) => mode === "executive_safe" || mode === "customer_safe_with_caveats")) &&
      !template.safe_language_template
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["safe_language_template"],
        message: "Customer-safe default language requires a safe language template."
      });
    }

    if (template.claim_type === "roi" && !template.required_lanes.includes("assumptions")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["required_lanes"],
        message: "ROI claims must require the assumptions lane."
      });
    }

    if (template.claim_type === "roi" && template.default_language_mode === "executive_safe") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["default_language_mode"],
        message: "ROI claims must not default to executive_safe language."
      });
    }

    if (
      template.claim_type === "roi" &&
      template.allowed_language_modes.some((mode) => mode === "executive_safe" || mode === "customer_safe_with_caveats")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["allowed_language_modes"],
        message: "ROI claims must remain internal_only or suppressed until assumption governance approves them."
      });
    }

    for (const forbiddenInput of UNIVERSAL_GLEAN_FORBIDDEN_CLAIM_INPUTS) {
      if (!template.forbidden_inputs.includes(forbiddenInput)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["forbidden_inputs"],
          message: `Missing universal forbidden input: ${forbiddenInput}.`
        });
      }
    }
  });

const ClaimEvaluationRecordSchema = z
  .object({
    claim_id: z.string().min(1).max(120),
    claim_type: GleanClaimTypeSchema,
    evaluation_state: GleanClaimEvaluationStateSchema,
    evidence_state: GleanClaimEvidenceStateSchema,
    confidence_basis: GleanClaimConfidenceBasisSchema,
    readiness_state: GleanValueClaimReadinessStateSchema,
    language_mode: GleanClaimLanguageModeSchema,
    reason_codes: z.array(GleanValueReasonCodeSchema).default([]),
    contributing_lanes: z.array(GleanValueEvidenceLaneSchema).default([]),
    missing_lanes: z.array(GleanValueEvidenceLaneSchema).default([]),
    approved_language: ShortTextSchema.nullable().optional()
  })
  .strict()
  .superRefine((evaluation, ctx) => {
    const unsafeEvidence = ["missing", "suppressed", "not_computed", "not_safe_to_claim"].includes(
      evaluation.evidence_state
    );
    const safeLanguage =
      evaluation.language_mode === "executive_safe" ||
      evaluation.language_mode === "customer_safe_with_caveats";
    const safeReadiness =
      evaluation.readiness_state === "customer_safe" || evaluation.readiness_state === "customer_safe_with_caveats";

    if (evaluation.evaluation_state === "suppress" || unsafeEvidence) {
      if (evaluation.language_mode !== "suppressed") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["language_mode"],
          message: "Suppressed or unsafe evaluations must use suppressed language mode."
        });
      }
      if (evaluation.readiness_state !== "suppressed" && evaluation.readiness_state !== "not_computed") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["readiness_state"],
          message: "Suppressed or unsafe evaluations must be suppressed or not_computed."
        });
      }
      if (evaluation.reason_codes.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reason_codes"],
          message: "Suppressed or unsafe evaluations must include reason codes."
        });
      }
      if (evaluation.approved_language) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["approved_language"],
          message: "Suppressed or unsafe evaluations must not include approved language."
        });
      }
    }

    if (safeLanguage && !evaluation.approved_language) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["approved_language"],
        message: "Customer-safe evaluations require approved language."
      });
    }

    if (safeReadiness && !safeLanguage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["language_mode"],
        message: "Customer-safe readiness requires customer-safe language mode."
      });
    }

    if (evaluation.claim_type === "roi" && (safeLanguage || safeReadiness)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["language_mode"],
        message: "ROI evaluations must not use customer-safe language until assumption governance approves them."
      });
    }
  });

export const GleanClaimRegistrySchema = z
  .object({
    schema_version: GleanClaimRegistrySchemaVersionSchema,
    registry_id: z.string().min(1).max(120),
    generated_at: z.string().datetime(),
    source_system: z.literal("FluencyTracr"),
    claim_templates: z.array(ClaimTemplateSchema).min(1)
  })
  .strict();

export const GleanClaimEvaluationSetSchema = z
  .object({
    schema_version: GleanClaimRegistrySchemaVersionSchema,
    registry_id: z.string().min(1).max(120),
    org_id: z.string().min(1),
    window: z.string().min(1),
    evaluated_at: z.string().datetime(),
    source_system: z.literal("Glean"),
    evaluations: z.array(ClaimEvaluationRecordSchema).min(1)
  })
  .strict();

export type GleanClaimRegistry = z.infer<typeof GleanClaimRegistrySchema>;
export type GleanClaimTemplate = z.infer<typeof ClaimTemplateSchema>;
export type GleanClaimEvaluationSet = z.infer<typeof GleanClaimEvaluationSetSchema>;
export type GleanClaimEvaluationRecord = z.infer<typeof ClaimEvaluationRecordSchema>;

export function buildGleanClaimRegistry(raw: unknown): GleanClaimRegistry {
  return GleanClaimRegistrySchema.parse(raw);
}

export function buildGleanClaimEvaluationSet(raw: unknown): GleanClaimEvaluationSet {
  return GleanClaimEvaluationSetSchema.parse(raw);
}

export function buildGleanClaimEvaluationSetForRegistry(
  rawEvaluationSet: unknown,
  rawRegistry: unknown
): GleanClaimEvaluationSet {
  const registry = buildGleanClaimRegistry(rawRegistry);
  const evaluationSet = buildGleanClaimEvaluationSet(rawEvaluationSet);

  if (evaluationSet.registry_id !== registry.registry_id) {
    throw new Error("Claim evaluation set registry_id does not match registry.");
  }

  const templatesById = new Map<string, GleanClaimTemplate>();
  for (const template of registry.claim_templates) {
    if (templatesById.has(template.claim_id)) {
      throw new Error(`Duplicate claim template id: ${template.claim_id}`);
    }
    templatesById.set(template.claim_id, template);
  }

  const seenEvaluationIds = new Set<string>();
  for (const evaluation of evaluationSet.evaluations) {
    if (seenEvaluationIds.has(evaluation.claim_id)) {
      throw new Error(`Duplicate claim evaluation id: ${evaluation.claim_id}`);
    }
    seenEvaluationIds.add(evaluation.claim_id);

    const template = templatesById.get(evaluation.claim_id);
    if (!template) {
      throw new Error(`Claim evaluation references unknown claim_id: ${evaluation.claim_id}`);
    }
    if (template.claim_type !== evaluation.claim_type) {
      throw new Error(`Claim evaluation claim_type mismatch for ${evaluation.claim_id}`);
    }
    if (!template.allowed_language_modes.includes(evaluation.language_mode)) {
      throw new Error(`Claim evaluation language_mode is not allowed for ${evaluation.claim_id}`);
    }
    if (evaluation.evaluation_state === "surface") {
      for (const requiredLane of template.required_lanes) {
        if (!evaluation.contributing_lanes.includes(requiredLane)) {
          throw new Error(`Claim evaluation for ${evaluation.claim_id} is missing required lane ${requiredLane}`);
        }
      }
    }
    if (evaluation.evaluation_state === "suppress") {
      for (const reasonCode of evaluation.reason_codes) {
        if (!template.suppression_reasons.includes(reasonCode)) {
          throw new Error(`Claim evaluation reason ${reasonCode} is not allowed for ${evaluation.claim_id}`);
        }
      }
    }
  }

  return evaluationSet;
}

export function mapClaimEvaluationToValueEvidenceClaimReadiness(
  evaluation: GleanClaimEvaluationRecord
): z.infer<typeof GleanValueClaimReadinessSchema> {
  return GleanValueClaimReadinessSchema.parse({
    claim_id: evaluation.claim_id,
    claim_type: evaluation.claim_type,
    evaluation_state: evaluation.evaluation_state,
    evidence_state: evaluation.evidence_state,
    confidence_basis: evaluation.confidence_basis,
    readiness_state: evaluation.readiness_state,
    language_mode: evaluation.language_mode,
    reason_codes: evaluation.reason_codes,
    contributing_lanes: evaluation.contributing_lanes,
    customer_safe_language: evaluation.approved_language ?? null
  });
}
