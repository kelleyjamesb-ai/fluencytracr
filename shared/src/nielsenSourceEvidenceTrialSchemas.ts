import { z } from "zod";

import {
  AggregateEvidenceImportPackageSchema,
  AggregateEvidenceImportReview,
  buildAggregateEvidenceImportReview
} from "./aggregateEvidenceImportSchemas";

export const NielsenSourceEvidenceTrialSchemaVersionSchema = z.literal("NSETR_2026_05");

const forbiddenNielsenTrialFragments = [
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
  "direct_identifier",
  "ranking",
  "manager",
  "productivity_score",
  "productivity_scoring",
  "hidden_reconstruction"
];

const containsForbiddenNielsenTrialFragment = (value: string) => {
  const lower = value.toLowerCase();
  return forbiddenNielsenTrialFragments.some((fragment) => lower.includes(fragment));
};

const rejectForbiddenNielsenTrialKeys = (
  value: unknown,
  ctx: z.RefinementCtx,
  path: Array<string | number> = []
) => {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => rejectForbiddenNielsenTrialKeys(entry, ctx, [...path, index]));
    return;
  }

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    const nextPath = [...path, key];
    if (containsForbiddenNielsenTrialFragment(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `forbidden Nielsen source evidence trial field: ${key}`,
        path: nextPath
      });
    }
    rejectForbiddenNielsenTrialKeys(nestedValue, ctx, nextPath);
  }
};

const SafeNielsenTrialTokenSchema = z
  .string()
  .min(1)
  .max(220)
  .refine((value) => !containsForbiddenNielsenTrialFragment(value), {
    message: "Nielsen source evidence trial tokens must not reference forbidden raw or person-level fields."
  });

const SourceArtifactSchema = z
  .object({
    source_artifact_id: SafeNielsenTrialTokenSchema,
    artifact_type: z.enum(["customer_value_deck", "methodology_packet"]),
    artifact_label: z.string().min(1).max(180),
    artifact_role: z.enum(["customer_value_narrative", "methodology_context"]),
    provenance_note: z.string().min(1).max(500)
  })
  .strict();

const ClaimCandidateSchema = z
  .object({
    claim_candidate_id: SafeNielsenTrialTokenSchema,
    source_artifact_id: SafeNielsenTrialTokenSchema,
    source_locator: SafeNielsenTrialTokenSchema,
    claim_family: z.enum([
      "strategic_transformation",
      "agent_opportunity",
      "survey_opportunity",
      "methodology_context",
      "operational_outcome_claim",
      "financial_value_claim",
      "product_telemetry_gap"
    ]),
    outcome_domain: z.enum([
      "cross_functional",
      "sales",
      "customer_success",
      "support",
      "engineering",
      "product",
      "IT",
      "HR",
      "legal",
      "finance",
      "security",
      "operations"
    ]),
    work_pattern: z.enum([
      "find",
      "understand",
      "summarize",
      "draft",
      "decide",
      "analyze",
      "troubleshoot",
      "automate",
      "orchestrate"
    ]),
    target_source_input_id: SafeNielsenTrialTokenSchema,
    mapped_evidence_record_id: SafeNielsenTrialTokenSchema,
    mapping_disposition: z.enum(["accepted_for_review", "withheld"]),
    claim_treatment: z.enum(["directional", "caveated", "internal_only", "suppressed", "not_computed"]),
    reason_codes: z.array(SafeNielsenTrialTokenSchema).min(1),
    required_upgrade_evidence: z.array(z.string().min(1).max(500)).min(1)
  })
  .strict();

export const NielsenSourceEvidenceTrialPackageSchema = z
  .object({
    schema_version: NielsenSourceEvidenceTrialSchemaVersionSchema,
    trial_id: SafeNielsenTrialTokenSchema,
    org_id: z.string().min(1).max(120),
    window: z.string().min(1).max(80),
    generated_at: z.string().datetime(),
    trial_effect: z.literal("document_claim_mapping_only"),
    source_artifacts: z.array(SourceArtifactSchema).min(1),
    claim_candidates: z.array(ClaimCandidateSchema).min(1),
    generated_aggregate_import: AggregateEvidenceImportPackageSchema,
    governance_boundaries: z.array(z.string().min(1).max(500)).default([])
  })
  .strict()
  .superRefine((trial, ctx) => {
    rejectForbiddenNielsenTrialKeys(trial, ctx);

    if (trial.org_id !== trial.generated_aggregate_import.org_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["org_id"],
        message: "Nielsen source evidence trial org_id must match the generated aggregate import."
      });
    }
    if (trial.window !== trial.generated_aggregate_import.window) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["window"],
        message: "Nielsen source evidence trial window must match the generated aggregate import."
      });
    }

    const artifactIds = new Set(trial.source_artifacts.map((artifact) => artifact.source_artifact_id));
    const recordIds = new Set(
      trial.generated_aggregate_import.aggregate_evidence.map((record) => record.evidence_record_id)
    );
    trial.claim_candidates.forEach((candidate, index) => {
      if (!artifactIds.has(candidate.source_artifact_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["claim_candidates", index, "source_artifact_id"],
          message: `Nielsen claim candidate references unknown source artifact: ${candidate.source_artifact_id}`
        });
      }
      if (!recordIds.has(candidate.mapped_evidence_record_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["claim_candidates", index, "mapped_evidence_record_id"],
          message: `Nielsen claim candidate references unknown aggregate evidence record: ${candidate.mapped_evidence_record_id}`
        });
      }
    });
  });

export type NielsenSourceEvidenceTrialPackage = z.infer<typeof NielsenSourceEvidenceTrialPackageSchema>;

export type NielsenSourceEvidenceTrialReview = {
  schema_version: "NSETR_REVIEW_2026_05";
  trial_id: string;
  org_id: string;
  window: string;
  trial_effect: "document_claim_mapping_only";
  claim_readiness_effect: "no_readiness_upgrade";
  summary: string;
  candidate_summary: {
    total_count: number;
    accepted_for_review_count: number;
    withheld_count: number;
    internal_only_count: number;
    suppressed_or_not_computed_count: number;
  };
  accepted_candidate_ids: string[];
  withheld_candidate_ids: string[];
  blocked_claim_effects: string[];
  next_upgrade_actions: string[];
  aggregate_import_review: AggregateEvidenceImportReview;
  governance_boundaries: string[];
};

export function buildNielsenSourceEvidenceTrialReview(raw: unknown): NielsenSourceEvidenceTrialReview {
  const trial = NielsenSourceEvidenceTrialPackageSchema.parse(raw);
  const aggregateImportReview = buildAggregateEvidenceImportReview(trial.generated_aggregate_import);
  const accepted = trial.claim_candidates.filter(
    (candidate) => candidate.mapping_disposition === "accepted_for_review"
  );
  const withheld = trial.claim_candidates.filter((candidate) => candidate.mapping_disposition === "withheld");
  const blockedEffects = new Set<string>();
  const upgradeActions = new Set<string>();

  for (const candidate of withheld) {
    candidate.required_upgrade_evidence.forEach((action) => upgradeActions.add(action));
    if (candidate.claim_family === "financial_value_claim") {
      blockedEffects.add(
        "Customer-facing financial language remains blocked until finance/customer-safe approval is attached."
      );
    }
    if (candidate.claim_family === "operational_outcome_claim") {
      blockedEffects.add(
        "CS/CX outcome movement remains blocked until aggregate external outcome export is approved."
      );
    }
    if (candidate.claim_family === "survey_opportunity") {
      blockedEffects.add("Survey opportunity remains directional until aggregate survey export is approved.");
    }
  }

  return {
    schema_version: "NSETR_REVIEW_2026_05",
    trial_id: trial.trial_id,
    org_id: trial.org_id,
    window: trial.window,
    trial_effect: trial.trial_effect,
    claim_readiness_effect: "no_readiness_upgrade",
    summary: `Mapped ${trial.claim_candidates.length} document-derived claim candidates into Source Evidence Import review. No live ingestion occurred.`,
    candidate_summary: {
      total_count: trial.claim_candidates.length,
      accepted_for_review_count: accepted.length,
      withheld_count: withheld.length,
      internal_only_count: trial.claim_candidates.filter((candidate) => candidate.claim_treatment === "internal_only")
        .length,
      suppressed_or_not_computed_count: trial.claim_candidates.filter((candidate) =>
        ["suppressed", "not_computed"].includes(candidate.claim_treatment)
      ).length
    },
    accepted_candidate_ids: accepted.map((candidate) => candidate.claim_candidate_id),
    withheld_candidate_ids: withheld.map((candidate) => candidate.claim_candidate_id),
    blocked_claim_effects:
      blockedEffects.size > 0 ? Array.from(blockedEffects) : ["No blocked claim effects are recorded."],
    next_upgrade_actions:
      upgradeActions.size > 0 ? Array.from(upgradeActions).slice(0, 5) : ["No upgrade actions are recorded."],
    aggregate_import_review: aggregateImportReview,
    governance_boundaries: [
      ...trial.governance_boundaries,
      "Nielsen Source Evidence Trial maps document-derived claim candidates only.",
      "Trial output does not calculate ROI, ingest live data, persist records, or upgrade claim readiness."
    ]
  };
}
