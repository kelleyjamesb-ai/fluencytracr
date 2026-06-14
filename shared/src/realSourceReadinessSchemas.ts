import { z } from "zod";

import { GleanClaimPacketExport, GleanClaimPacketExportSchema } from "./gleanClaimPacketSchemas";

export const RealSourceReadinessManifestSchemaVersionSchema = z.literal("RSRM_2026_05");

const forbiddenRealSourceKeyFragments = [
  "prompt",
  "raw_prompt",
  "response",
  "raw_response",
  "transcript",
  "query_text",
  "tool_payload",
  "file_content",
  "email",
  "user_id",
  "employee_id",
  "person_id",
  "direct_employee_identifier",
  "hashed_employee_id",
  "hashed_user_id",
  "hashed_person_id",
  "hashed_or_joinable_person_identifier",
  "pseudonymous_employee_identifier",
  "pseudonymous_person_identifier",
  "tokenized_employee_identifier",
  "tokenized_person_identifier",
  "person_level_hris",
  "direct_identifier",
  "ranking",
  "manager_id",
  "manager_chain",
  "manager_view",
  "manager_ranking",
  "manager_comparison",
  "team_ranking",
  "team_or_manager_ranking",
  "manager_or_team_ranking",
  "productivity_score",
  "productivity_scoring",
  "individual_productivity",
  "people_decisioning",
  "compensation",
  "performance_rating",
  "promotion",
  "discipline",
  "attrition_prediction",
  "hris_inference",
  "hidden_reconstruction"
];

const containsForbiddenFragment = (value: string) => {
  const lower = value.toLowerCase();
  return forbiddenRealSourceKeyFragments.some((fragment) => lower.includes(fragment));
};

const rejectForbiddenRealSourceKeys = (
  value: unknown,
  ctx: z.RefinementCtx,
  path: Array<string | number> = []
) => {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => rejectForbiddenRealSourceKeys(entry, ctx, [...path, index]));
    return;
  }

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    const nextPath = [...path, key];
    if (containsForbiddenFragment(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `forbidden real-source readiness field: ${key}`,
        path: nextPath
      });
    }
    rejectForbiddenRealSourceKeys(nestedValue, ctx, nextPath);
  }
};

const SafeSourceFieldNameSchema = z
  .string()
  .min(1)
  .max(160)
  .refine((value) => !containsForbiddenFragment(value), {
    message: "Source field names must not reference forbidden raw or person-level fields."
  });

export const RealSourceReadinessStateSchema = z.enum([
  "ready",
  "blocked",
  "unknown",
  "needs_approval",
  "synthetic_only",
  "not_applicable"
]);

export const RealSourceClaimBucketSchema = z.enum([
  "customer_safe",
  "caveated",
  "internal_only",
  "suppressed_or_not_computed"
]);

const RealSourceFieldStatusSchema = z
  .object({
    field_name: SafeSourceFieldNameSchema,
    status: z.enum(["known", "unknown", "missing", "blocked", "approved", "not_required"]),
    impact: z.string().min(1).max(500)
  })
  .strict();

const RealSourcePrivacyBoundarySchema = z
  .object({
    aggregate_only: z.boolean(),
    forbidden_fields_absent: z.boolean(),
    privacy_review_state: z.enum(["approved", "needs_review", "rejected", "unknown"]),
    notes: z.array(z.string().min(1).max(500)).default([])
  })
  .strict();

const RealSourceInputSchema = z
  .object({
    source_input_id: z.string().min(1).max(180),
    label: z.string().min(1).max(180),
    source_type: z.enum([
      "methodology_snapshot",
      "strongest_safe_claim",
      "value_evidence_pack",
      "ai_work_value_graph",
      "outcome_instrumentation_map",
      "reviewer_decision_memo",
      "governance_boundaries",
      "approval_workflow",
      "mcp_action_boundary",
      "control_evidence"
    ]),
    source_system: z.enum(["Glean", "FluencyTracr", "customer_system", "external_system", "synthetic_fixture"]),
    readiness_state: RealSourceReadinessStateSchema,
    required_fields: z.array(RealSourceFieldStatusSchema).default([]),
    privacy_boundary: RealSourcePrivacyBoundarySchema,
    approval_state: z.enum([
      "not_required",
      "not_requested",
      "in_review",
      "approved_internal",
      "customer_safe",
      "rejected",
      "expired"
    ]),
    affects_claim_buckets: z.array(RealSourceClaimBucketSchema).default([]),
    blockers: z.array(z.string().min(1).max(500)).default([]),
    upgrade_actions: z.array(z.string().min(1).max(500)).default([])
  })
  .strict();

const RealSourceIngestionPathSchema = z
  .object({
    recommended_path: z.enum([
      "admin_exported_aggregate_upload",
      "glean_hosted_mcp_read_access",
      "live_event_ingestion"
    ]),
    implementation_state: z.enum(["not_implemented", "proposal_required", "ready_for_proposal"]),
    rationale: z.string().min(1).max(800),
    next_decision: z.string().min(1).max(500)
  })
  .strict();

export const RealSourceReadinessManifestSchema = z
  .object({
    schema_version: RealSourceReadinessManifestSchemaVersionSchema,
    manifest_id: z.string().min(1).max(180),
    org_id: z.string().min(1).max(120),
    window: z.string().min(1).max(80),
    generated_at: z.string().datetime(),
    claim_packet_id: z.string().min(1).max(180),
    selected_methodology_snapshot_id: z.string().min(1).max(180),
    source_inputs: z.array(RealSourceInputSchema).min(1),
    ingestion_path: RealSourceIngestionPathSchema,
    governance_boundaries: z.array(z.string().min(1).max(500)).default([])
  })
  .strict()
  .superRefine((manifest, ctx) => {
    rejectForbiddenRealSourceKeys(manifest, ctx);
  });

export type RealSourceReadinessManifest = z.infer<typeof RealSourceReadinessManifestSchema>;
export type RealSourceReadinessState = z.infer<typeof RealSourceReadinessStateSchema>;
export type RealSourceClaimBucket = z.infer<typeof RealSourceClaimBucketSchema>;

type SourceListSummary = {
  count: number;
  summary: string;
  source_input_ids: string[];
};

export type RealSourceReadinessReview = {
  overall_state: RealSourceReadinessState;
  claim_readiness_effect: "no_readiness_upgrade";
  summary: string;
  ready_sources: SourceListSummary;
  blocked_or_unknown_sources: SourceListSummary;
  approval_required_sources: SourceListSummary;
  affected_claim_buckets: Array<{
    claim_bucket: RealSourceClaimBucket;
    source_input_ids: string[];
    summary: string;
  }>;
  top_blockers: string[];
  next_upgrade_action: string;
  ingestion_decision: RealSourceReadinessManifest["ingestion_path"];
  claim_packet_reference?: {
    claim_packet_id: string;
    suppressed_or_not_computed_claim_count: number;
    internal_only_claim_count: number;
    caveated_claim_count: number;
  };
};

export type BuildRealSourceReadinessReviewInput = {
  manifest: unknown;
  claim_packet?: unknown;
};

const formatState = (state: string) => state.replace(/_/g, " ");

const sourceSummary = (
  sources: RealSourceReadinessManifest["source_inputs"],
  empty: string,
  label: string
): SourceListSummary => ({
  count: sources.length,
  summary: sources.length === 0 ? empty : `${sources.length} ${sources.length === 1 ? label : `${label}s`}`,
  source_input_ids: sources.map((source) => source.source_input_id)
});

const overallStateFor = (manifest: RealSourceReadinessManifest): RealSourceReadinessState => {
  const states = manifest.source_inputs.map((source) => source.readiness_state);
  if (states.includes("blocked")) {
    return "blocked";
  }
  if (states.includes("needs_approval")) {
    return "needs_approval";
  }
  if (states.includes("unknown")) {
    return "unknown";
  }
  if (states.includes("synthetic_only")) {
    return "synthetic_only";
  }
  return "ready";
};

const affectedClaimBucketsFor = (manifest: RealSourceReadinessManifest) =>
  RealSourceClaimBucketSchema.options
    .map((claimBucket) => {
      const sourceInputIds = manifest.source_inputs
        .filter((source) => source.affects_claim_buckets.includes(claimBucket))
        .map((source) => source.source_input_id);
      return {
        claim_bucket: claimBucket,
        source_input_ids: sourceInputIds,
        summary:
          sourceInputIds.length === 0
            ? `No source inputs currently affect ${formatState(claimBucket)} claims.`
            : `${sourceInputIds.length} source input${sourceInputIds.length === 1 ? "" : "s"} affect ${formatState(
                claimBucket
              )} claims.`
      };
    })
    .filter((bucket) => bucket.source_input_ids.length > 0);

const claimPacketReferenceFor = (raw: unknown) => {
  if (!raw) {
    return undefined;
  }
  const packet: GleanClaimPacketExport = GleanClaimPacketExportSchema.parse(raw);
  return {
    claim_packet_id: packet.claim_packet_id,
    suppressed_or_not_computed_claim_count: packet.suppressed_claims.length,
    internal_only_claim_count: packet.internal_only_claims.length,
    caveated_claim_count: packet.caveated_claims.length
  };
};

export function buildRealSourceReadinessReview(input: BuildRealSourceReadinessReviewInput): RealSourceReadinessReview {
  const manifest = RealSourceReadinessManifestSchema.parse(input.manifest);
  const overallState = overallStateFor(manifest);
  const readySources = manifest.source_inputs.filter((source) => source.readiness_state === "ready");
  const blockedOrUnknownSources = manifest.source_inputs.filter((source) =>
    ["blocked", "unknown", "synthetic_only"].includes(source.readiness_state)
  );
  const approvalRequiredSources = manifest.source_inputs.filter(
    (source) => source.readiness_state === "needs_approval" || source.approval_state === "in_review"
  );
  const blockers = manifest.source_inputs.flatMap((source) => source.blockers);
  const upgradeActions = manifest.source_inputs.flatMap((source) => source.upgrade_actions);

  return {
    overall_state: overallState,
    claim_readiness_effect: "no_readiness_upgrade",
    summary: `Real-source readiness is ${formatState(
      overallState
    )}. This review prepares fixture replacement only; it does not implement ingestion, calculate ROI, or upgrade claim readiness.`,
    ready_sources: sourceSummary(readySources, "No real-source inputs are ready.", "ready source"),
    blocked_or_unknown_sources: sourceSummary(
      blockedOrUnknownSources,
      "No blocked or unknown sources are recorded.",
      "blocked or unknown source"
    ),
    approval_required_sources: sourceSummary(
      approvalRequiredSources,
      "No approval-required sources are recorded.",
      "approval-required source"
    ),
    affected_claim_buckets: affectedClaimBucketsFor(manifest),
    top_blockers: blockers.length > 0 ? blockers.slice(0, 4) : ["No source blockers are recorded."],
    next_upgrade_action: upgradeActions[0] ?? manifest.ingestion_path.next_decision,
    ingestion_decision: manifest.ingestion_path,
    claim_packet_reference: claimPacketReferenceFor(input.claim_packet)
  };
}
