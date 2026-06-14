import { GleanValueEvidencePackSchema, type GleanValueEvidencePack } from "@learnaire/shared";
import { z } from "zod";

const ClaimReadinessCountSchema = z
  .object({
    customer_safe: z.number().int().nonnegative(),
    customer_safe_with_caveats: z.number().int().nonnegative(),
    internal_only: z.number().int().nonnegative(),
    not_computed: z.number().int().nonnegative(),
    suppressed: z.number().int().nonnegative()
  })
  .strict();

const ClaimSafetySchema = z
  .object({
    claim_id: z.string().min(1),
    claim_type: z.string().min(1),
    readiness_state: z.enum(["customer_safe", "customer_safe_with_caveats", "internal_only", "not_computed", "suppressed"]),
    language_mode: z.enum(["executive_safe", "customer_safe_with_caveats", "internal_only", "suppressed"]),
    reason_codes: z.array(z.string()),
    customer_safe_language: z.string().nullable().optional()
  })
  .strict();

export const ValueEvidenceSummarySchema = z
  .object({
    org_id: z.string().min(1),
    window: z.string().min(1),
    generated_at: z.string().min(1),
    source_system: z.literal("Glean"),
    value_posture: z.enum([
      "validated",
      "directional",
      "assumption_heavy",
      "coverage_limited",
      "internal_only",
      "not_computed",
      "suppressed"
    ]),
    evidence_lanes: z.array(
      z
        .object({
          lane: z.string().min(1),
          evidence_state: z.enum(["present", "not_present", "suppressed", "not_computed"]),
          covered_surfaces: z.array(z.string()),
          missing_surfaces: z.array(z.string())
        })
        .strict()
    ),
    claim_readiness_counts: ClaimReadinessCountSchema,
    customer_safe_claims: z.array(ClaimSafetySchema),
    non_computable_claims: z.array(ClaimSafetySchema),
    next_instrumentation_actions: z.array(
      z
        .object({
          lane: z.string().min(1),
          action: z.string().min(1),
          owner: z.enum(["glean_admin", "customer_admin", "fluencytracr_operator", "data_governance"]),
          priority: z.enum(["high", "medium", "low"])
        })
        .strict()
    ),
    decision_safe_guidance: z.string().min(1)
  })
  .strict();

export type ValueEvidenceSummary = z.infer<typeof ValueEvidenceSummarySchema>;

function claimSafety(claim: GleanValueEvidencePack["claim_readiness"][number]): z.infer<typeof ClaimSafetySchema> {
  return ClaimSafetySchema.parse({
    claim_id: claim.claim_id,
    claim_type: claim.claim_type,
    readiness_state: claim.readiness_state,
    language_mode: claim.language_mode,
    reason_codes: claim.reason_codes,
    customer_safe_language:
      claim.readiness_state === "customer_safe" || claim.readiness_state === "customer_safe_with_caveats"
        ? claim.customer_safe_language
        : undefined
  });
}

function guidanceFor(pack: GleanValueEvidencePack): string {
  const parts = ["Use this as aggregate Glean value evidence only."];
  if (pack.value_posture !== "validated") {
    parts.push("Preserve value posture and caveats before using customer-facing language.");
  }
  if (pack.claim_readiness.some((claim) => claim.claim_type === "roi" && claim.language_mode === "suppressed")) {
    parts.push("ROI claims are suppressed until assumption governance approves customer-safe language.");
  }
  parts.push("Do not infer raw source records, users, teams, rankings, or hidden suppressed values.");
  return parts.join(" ");
}

export function buildValueEvidenceSummary(raw: unknown): ValueEvidenceSummary {
  const pack = GleanValueEvidencePackSchema.parse(raw);
  const claimCounts = {
    customer_safe: 0,
    customer_safe_with_caveats: 0,
    internal_only: 0,
    not_computed: 0,
    suppressed: 0
  };
  for (const claim of pack.claim_readiness) {
    claimCounts[claim.readiness_state] += 1;
  }
  const customerSafeClaims = pack.claim_readiness.filter(
    (claim) => claim.readiness_state === "customer_safe" || claim.readiness_state === "customer_safe_with_caveats"
  );
  const nonComputableClaims = pack.claim_readiness.filter(
    (claim) => claim.readiness_state === "not_computed" || claim.readiness_state === "suppressed"
  );

  return ValueEvidenceSummarySchema.parse({
    org_id: pack.org_id,
    window: pack.window,
    generated_at: pack.generated_at,
    source_system: pack.source_system,
    value_posture: pack.value_posture,
    evidence_lanes: pack.coverage_lanes.map((lane) => ({
      lane: lane.lane,
      evidence_state: lane.evidence_state,
      covered_surfaces: lane.covered_surfaces,
      missing_surfaces: lane.missing_surfaces
    })),
    claim_readiness_counts: claimCounts,
    customer_safe_claims: customerSafeClaims.map(claimSafety),
    non_computable_claims: nonComputableClaims.map(claimSafety),
    next_instrumentation_actions: pack.next_instrumentation_actions,
    decision_safe_guidance: guidanceFor(pack)
  });
}

export function findValueClaimSafety(raw: unknown, claimId: string): z.infer<typeof ClaimSafetySchema> {
  const pack = GleanValueEvidencePackSchema.parse(raw);
  const claim = pack.claim_readiness.find((candidate) => candidate.claim_id === claimId);
  if (!claim) {
    throw new Error("value_claim_not_found");
  }
  return claimSafety(claim);
}
