import { z } from "zod";

import { GleanClaimTypeSchema } from "./gleanClaimRegistrySchemas";

export const GleanAssumptionLedgerSchemaVersionSchema = z.literal("GAL_2026_05");

export const GleanAssumptionKindSchema = z.enum([
  "base_rate",
  "quality_multiplier",
  "hourly_rate",
  "productivity_recapture",
  "cost_model",
  "confidence_discount",
  "customer_override",
  "benchmark_mapping"
]);

export const GleanAssumptionScopeSchema = z.enum(["global_default", "org_window", "customer_override"]);

export const GleanAssumptionSourceSchema = z.enum([
  "telemetry",
  "time_saves_mvp",
  "literature",
  "customer_study",
  "benchmark",
  "finance_input",
  "expert_estimate",
  "vendor_prior"
]);

export const GleanAssumptionConfidenceSchema = z.enum(["high", "medium", "low"]);

export const GleanAssumptionSensitivityTierSchema = z.enum(["high", "medium", "low"]);

export const GleanAssumptionApprovalStateSchema = z.enum([
  "draft",
  "internal_only",
  "finance_reviewed",
  "customer_safe",
  "rejected"
]);

export const GleanAssumptionClaimLanguageConstraintSchema = z.enum([
  "customer_safe_allowed",
  "customer_safe_with_caveats",
  "internal_only",
  "suppressed"
]);

const ShortTextSchema = z.string().min(1).max(500);

const AssumptionSensitivitySchema = z
  .object({
    tier: GleanAssumptionSensitivityTierSchema,
    rank: z.number().int().positive().optional(),
    note: ShortTextSchema
  })
  .strict();

const AssumptionEntrySchema = z
  .object({
    assumption_id: z.string().min(1).max(120),
    assumption_kind: GleanAssumptionKindSchema,
    scope: GleanAssumptionScopeSchema,
    name: z.string().min(1).max(160),
    description: ShortTextSchema,
    used_by_claim_ids: z.array(z.string().min(1).max(120)).min(1),
    used_by_claim_types: z.array(GleanClaimTypeSchema).min(1),
    value_type: z.enum(["point_estimate", "range", "boolean", "formula", "text"]),
    value_label: z.string().min(1).max(240),
    source: GleanAssumptionSourceSchema,
    source_note: ShortTextSchema,
    confidence: GleanAssumptionConfidenceSchema,
    sensitivity: AssumptionSensitivitySchema,
    approval_state: GleanAssumptionApprovalStateSchema,
    approved_for_customer_claims: z.boolean(),
    claim_language_constraint: GleanAssumptionClaimLanguageConstraintSchema,
    customer_visible: z.boolean(),
    last_reviewed_at: z.string().datetime(),
    caveats: z.array(ShortTextSchema).default([])
  })
  .strict()
  .superRefine((assumption, ctx) => {
    if (assumption.approved_for_customer_claims && assumption.approval_state !== "customer_safe") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["approved_for_customer_claims"],
        message: "Customer claim approval requires approval_state customer_safe."
      });
    }

    const riskyForCustomer = assumption.confidence === "low" || assumption.sensitivity.tier === "high";
    const customerFacingConstraint =
      assumption.claim_language_constraint === "customer_safe_allowed" ||
      assumption.claim_language_constraint === "customer_safe_with_caveats";

    if (assumption.approved_for_customer_claims && riskyForCustomer) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["approved_for_customer_claims"],
        message: "Low-confidence or high-sensitivity assumptions cannot be approved for customer claims."
      });
    }

    if (riskyForCustomer && assumption.approval_state === "customer_safe") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["approval_state"],
        message: "Low-confidence or high-sensitivity assumptions cannot use customer_safe approval state."
      });
    }

    if (
      assumption.claim_language_constraint === "customer_safe_allowed" &&
      !assumption.approved_for_customer_claims
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["claim_language_constraint"],
        message: "Customer-safe language requires customer claim approval."
      });
    }

    if (riskyForCustomer && customerFacingConstraint) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["claim_language_constraint"],
        message: "Low-confidence or high-sensitivity assumptions must remain internal_only or suppressed."
      });
    }

    if (riskyForCustomer && assumption.customer_visible) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customer_visible"],
        message: "Low-confidence or high-sensitivity assumptions must not be customer visible."
      });
    }

    if (assumption.customer_visible && assumption.claim_language_constraint === "suppressed") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customer_visible"],
        message: "Suppressed assumptions must not be customer visible."
      });
    }
  });

const AssumptionLedgerSummarySchema = z
  .object({
    assumption_count: z.number().int().nonnegative(),
    low_confidence_count: z.number().int().nonnegative(),
    high_sensitivity_count: z.number().int().nonnegative(),
    customer_safe_count: z.number().int().nonnegative(),
    internal_only_count: z.number().int().nonnegative()
  })
  .strict();

export const GleanAssumptionLedgerSchema = z
  .object({
    schema_version: GleanAssumptionLedgerSchemaVersionSchema,
    ledger_id: z.string().min(1).max(120),
    generated_at: z.string().datetime(),
    source_system: z.literal("FluencyTracr"),
    org_id: z.string().min(1).optional(),
    window: z.string().min(1).optional(),
    summary: AssumptionLedgerSummarySchema,
    assumptions: z.array(AssumptionEntrySchema).min(1)
  })
  .strict()
  .superRefine((ledger, ctx) => {
    const lowConfidenceCount = ledger.assumptions.filter((assumption) => assumption.confidence === "low").length;
    const highSensitivityCount = ledger.assumptions.filter(
      (assumption) => assumption.sensitivity.tier === "high"
    ).length;
    const customerSafeCount = ledger.assumptions.filter((assumption) => assumption.approved_for_customer_claims).length;
    const internalOnlyCount = ledger.assumptions.filter(
      (assumption) => assumption.claim_language_constraint === "internal_only"
    ).length;

    const checks: Array<[number, number, string]> = [
      [ledger.summary.assumption_count, ledger.assumptions.length, "summary.assumption_count"],
      [ledger.summary.low_confidence_count, lowConfidenceCount, "summary.low_confidence_count"],
      [ledger.summary.high_sensitivity_count, highSensitivityCount, "summary.high_sensitivity_count"],
      [ledger.summary.customer_safe_count, customerSafeCount, "summary.customer_safe_count"],
      [ledger.summary.internal_only_count, internalOnlyCount, "summary.internal_only_count"]
    ];

    for (const [actual, expected, path] of checks) {
      if (actual !== expected) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: path.split("."),
          message: `Expected ${expected}, received ${actual}.`
        });
      }
    }
  });

export type GleanAssumptionLedger = z.infer<typeof GleanAssumptionLedgerSchema>;
export type GleanAssumptionEntry = z.infer<typeof AssumptionEntrySchema>;

export function buildGleanAssumptionLedger(raw: unknown): GleanAssumptionLedger {
  return GleanAssumptionLedgerSchema.parse(raw);
}
