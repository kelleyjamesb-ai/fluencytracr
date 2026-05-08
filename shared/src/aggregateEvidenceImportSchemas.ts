import { z } from "zod";

import { RealSourceReadinessManifestSchema } from "./realSourceReadinessSchemas";

export const AggregateEvidenceImportSchemaVersionSchema = z.literal("AEI_2026_05");

const forbiddenAggregateImportFragments = [
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

const containsForbiddenAggregateFragment = (value: string) => {
  const lower = value.toLowerCase();
  return forbiddenAggregateImportFragments.some((fragment) => lower.includes(fragment));
};

const rejectForbiddenAggregateImportKeys = (
  value: unknown,
  ctx: z.RefinementCtx,
  path: Array<string | number> = []
) => {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => rejectForbiddenAggregateImportKeys(entry, ctx, [...path, index]));
    return;
  }

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    const nextPath = [...path, key];
    if (containsForbiddenAggregateFragment(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `forbidden aggregate evidence import field: ${key}`,
        path: nextPath
      });
    }
    rejectForbiddenAggregateImportKeys(nestedValue, ctx, nextPath);
  }
};

const SafeAggregateTokenSchema = z
  .string()
  .min(1)
  .max(180)
  .refine((value) => !containsForbiddenAggregateFragment(value), {
    message: "Aggregate evidence import tokens must not reference forbidden raw or person-level fields."
  });

const AggregateEvidenceValueSchema = z
  .object({
    metric_name: SafeAggregateTokenSchema,
    value: z.number().finite(),
    unit: z.enum(["count", "percent", "minutes", "hours", "state", "score", "index"]),
    aggregation_level: z
      .enum(["account_window", "source_input", "surface", "work_pattern", "outcome_domain", "methodology"])
      .default("account_window")
  })
  .strict();

export const AggregateEvidenceRecordSchema = z
  .object({
    evidence_record_id: z.string().min(1).max(180),
    source_input_id: z.string().min(1).max(180),
    evidence_type: z.enum([
      "source_coverage",
      "methodology_approval",
      "product_telemetry",
      "workflow_run",
      "artifact_output",
      "action_log",
      "control_evidence",
      "business_outcome",
      "financial_model"
    ]),
    evidence_state: z.enum(["present", "missing", "suppressed", "not_computed"]),
    aggregate_metric_refs: z.array(SafeAggregateTokenSchema).default([]),
    aggregate_values: z.array(AggregateEvidenceValueSchema).default([]),
    notes: z.array(z.string().min(1).max(500)).default([])
  })
  .strict();

export const AggregateEvidenceImportPackageSchema = z
  .object({
    schema_version: AggregateEvidenceImportSchemaVersionSchema,
    import_id: z.string().min(1).max(180),
    org_id: z.string().min(1).max(120),
    window: z.string().min(1).max(80),
    generated_at: z.string().datetime(),
    import_path: z.enum(["admin_exported_aggregate_upload"]),
    real_source_readiness_manifest: RealSourceReadinessManifestSchema,
    aggregate_evidence: z.array(AggregateEvidenceRecordSchema).min(1),
    governance_boundaries: z.array(z.string().min(1).max(500)).default([])
  })
  .strict()
  .superRefine((pkg, ctx) => {
    rejectForbiddenAggregateImportKeys(pkg, ctx);

    if (pkg.org_id !== pkg.real_source_readiness_manifest.org_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["org_id"],
        message: "Aggregate evidence import org_id must match the real-source readiness manifest."
      });
    }
    if (pkg.window !== pkg.real_source_readiness_manifest.window) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["window"],
        message: "Aggregate evidence import window must match the real-source readiness manifest."
      });
    }
    if (pkg.import_path !== pkg.real_source_readiness_manifest.ingestion_path.recommended_path) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["import_path"],
        message: "Aggregate evidence import path must match the manifest recommended path."
      });
    }

    const sourceIds = new Set(
      pkg.real_source_readiness_manifest.source_inputs.map((source) => source.source_input_id)
    );
    pkg.aggregate_evidence.forEach((record, index) => {
      if (!sourceIds.has(record.source_input_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["aggregate_evidence", index, "source_input_id"],
          message: `Aggregate evidence record references unknown source input: ${record.source_input_id}`
        });
      }
    });
  });

export type AggregateEvidenceImportPackage = z.infer<typeof AggregateEvidenceImportPackageSchema>;
export type AggregateEvidenceRecord = z.infer<typeof AggregateEvidenceRecordSchema>;

type EvidenceListSummary = {
  count: number;
  summary: string;
  evidence_record_ids: string[];
  source_input_ids: string[];
};

export type AggregateEvidenceImportReview = {
  schema_version: "AEI_REVIEW_2026_05";
  import_id: string;
  org_id: string;
  window: string;
  import_path: "admin_exported_aggregate_upload";
  import_effect: "review_only_no_persistence";
  claim_readiness_effect: "no_readiness_upgrade";
  summary: string;
  accepted_evidence: EvidenceListSummary;
  withheld_evidence: EvidenceListSummary;
  top_blockers: string[];
  next_upgrade_action: string;
  governance_boundaries: string[];
};

const summarizeEvidence = (
  records: AggregateEvidenceRecord[],
  empty: string,
  label: string
): EvidenceListSummary => ({
  count: records.length,
  summary: records.length === 0 ? empty : `${records.length} ${records.length === 1 ? label : `${label}s`}`,
  evidence_record_ids: records.map((record) => record.evidence_record_id),
  source_input_ids: Array.from(new Set(records.map((record) => record.source_input_id)))
});

export function buildAggregateEvidenceImportReview(raw: unknown): AggregateEvidenceImportReview {
  const pkg = AggregateEvidenceImportPackageSchema.parse(raw);
  const sourceById = new Map(
    pkg.real_source_readiness_manifest.source_inputs.map((source) => [source.source_input_id, source])
  );
  const accepted = pkg.aggregate_evidence.filter((record) => {
    const source = sourceById.get(record.source_input_id);
    return (
      source?.readiness_state === "ready" &&
      source.privacy_boundary.aggregate_only &&
      source.privacy_boundary.forbidden_fields_absent &&
      record.evidence_state === "present"
    );
  });
  const withheld = pkg.aggregate_evidence.filter((record) => !accepted.includes(record));
  const withheldSources = Array.from(new Set(withheld.map((record) => sourceById.get(record.source_input_id)))).filter(
    Boolean
  ) as AggregateEvidenceImportPackage["real_source_readiness_manifest"]["source_inputs"];
  const topBlockers = withheldSources.flatMap((source) => source.blockers);
  const upgradeActions = withheldSources.flatMap((source) => source.upgrade_actions);

  return {
    schema_version: "AEI_REVIEW_2026_05",
    import_id: pkg.import_id,
    org_id: pkg.org_id,
    window: pkg.window,
    import_path: pkg.import_path,
    import_effect: "review_only_no_persistence",
    claim_readiness_effect: "no_readiness_upgrade",
    summary: `Accepted ${accepted.length} aggregate evidence record${
      accepted.length === 1 ? "" : "s"
    } for review and withheld ${withheld.length} record${withheld.length === 1 ? "" : "s"} behind source-readiness gates. No live ingestion occurred.`,
    accepted_evidence: summarizeEvidence(accepted, "No aggregate evidence records were accepted.", "accepted record"),
    withheld_evidence: summarizeEvidence(withheld, "No aggregate evidence records were withheld.", "withheld record"),
    top_blockers: topBlockers.length > 0 ? topBlockers.slice(0, 4) : ["No import blockers are recorded."],
    next_upgrade_action:
      upgradeActions[0] ?? pkg.real_source_readiness_manifest.ingestion_path.next_decision,
    governance_boundaries: [
      ...pkg.governance_boundaries,
      "Aggregate Evidence Import v1 is review only, no persistence.",
      "Import review does not calculate ROI or upgrade claim readiness."
    ]
  };
}
