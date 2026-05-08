import { z } from "zod";

import {
  AiWorkValueGraph,
  AiWorkValueGraphSchema,
  MethodologyReviewWorkspace,
  StrongestSafeClaim,
  StrongestSafeClaimSchema,
  buildMethodologyDecisionMemo
} from "./aiWorkValueGraphSchemas";
import {
  GleanValueClaimReadiness,
  GleanValueEvidencePack,
  GleanValueEvidencePackSchema
} from "./gleanValueEvidenceSchemas";

export const GleanClaimPacketSchemaVersionSchema = z.literal("GCP_2026_05");

const forbiddenClaimPacketKeyFragments = [
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

const rejectForbiddenClaimPacketKeys = (
  value: unknown,
  ctx: z.RefinementCtx,
  path: Array<string | number> = []
) => {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => rejectForbiddenClaimPacketKeys(entry, ctx, [...path, index]));
    return;
  }

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    const keyLower = key.toLowerCase();
    const matchesForbidden = forbiddenClaimPacketKeyFragments.some((fragment) => keyLower.includes(fragment));
    const nextPath = [...path, key];
    if (matchesForbidden) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `forbidden claim packet field: ${key}`,
        path: nextPath
      });
    }
    rejectForbiddenClaimPacketKeys(nestedValue, ctx, nextPath);
  }
};

const assertNoForbiddenClaimPacketKeys = (value: unknown) => {
  const result = z
    .unknown()
    .superRefine((candidate, ctx) => {
      rejectForbiddenClaimPacketKeys(candidate, ctx);
    })
    .safeParse(value);

  if (!result.success) {
    throw result.error;
  }
};

const ClaimPacketReadinessSchema = z.enum([
  "customer_safe",
  "customer_safe_with_caveats",
  "caveated",
  "internal_only",
  "not_computed",
  "suppressed"
]);

const ClaimPacketStatementSchema = z
  .object({
    claim_id: z.string().min(1).max(160),
    claim_source: z.enum(["strongest_safe_claim", "glean_value_evidence", "ai_work_value_graph", "methodology_review"]),
    claim_type: z.string().min(1).max(120),
    claim_readiness: ClaimPacketReadinessSchema,
    language: z.string().min(1).max(1000),
    caveats: z.array(z.string().min(1).max(500)).default([]),
    reason_codes: z.array(z.string().min(1).max(160)).default([])
  })
  .strict();

const ClaimPacketEvidenceGapSchema = z
  .object({
    gap_id: z.string().min(1).max(180),
    source: z.enum(["strongest_safe_claim", "glean_value_evidence", "ai_work_value_graph", "methodology_review"]),
    gap_type: z.string().min(1).max(160),
    blocks: z.string().min(1).max(160),
    action: z.string().min(1).max(500)
  })
  .strict();

export const GleanClaimPacketExportSchema = z
  .object({
    schema_version: GleanClaimPacketSchemaVersionSchema,
    claim_packet_id: z.string().min(1).max(180),
    org_id: z.string().min(1).max(120),
    window: z.string().min(1).max(80),
    generated_at: z.string().datetime(),
    selected_methodology_snapshot_id: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/),
    reviewer_decision_memo: z.string().min(1).max(8000),
    strongest_safe_claim: StrongestSafeClaimSchema,
    caveated_claims: z.array(ClaimPacketStatementSchema).default([]),
    internal_only_claims: z.array(ClaimPacketStatementSchema).default([]),
    suppressed_claims: z.array(ClaimPacketStatementSchema).default([]),
    evidence_gaps: z.array(ClaimPacketEvidenceGapSchema).default([]),
    upgrade_actions: z.array(z.string().min(1).max(500)).default([]),
    governance_boundaries: z.array(z.string().min(1).max(500)).default([])
  })
  .strict()
  .superRefine((packet, ctx) => {
    rejectForbiddenClaimPacketKeys(packet, ctx);
  });

export type GleanClaimPacketExport = z.infer<typeof GleanClaimPacketExportSchema>;
export type ClaimPacketStatement = z.infer<typeof ClaimPacketStatementSchema>;

export type GleanClaimPacketQbrNarrative = {
  executive_decision: {
    decision_state: z.infer<typeof ClaimPacketReadinessSchema>;
    headline: string;
    summary: string;
  };
  strongest_safe_claim: ClaimPacketStatement;
  caveated_claims: ClaimPacketStatement[];
  internal_only_claims: ClaimPacketStatement[];
  suppressed_or_not_computed_claims: ClaimPacketStatement[];
  evidence_gaps: GleanClaimPacketExport["evidence_gaps"];
  upgrade_actions: string[];
  governance_boundaries: string[];
  methodology_snapshot_summary: {
    selected_methodology_snapshot_id: string;
    decision_state: string;
    approval_state: string;
    financial_claim_effect: string;
  };
};

export type GleanClaimPacketQbrReadinessSummary = {
  customer_safe_claims: {
    count: number;
    summary: string;
    claim_ids: string[];
  };
  caveated_claims: {
    count: number;
    summary: string;
    claim_ids: string[];
  };
  internal_only_claims: {
    count: number;
    summary: string;
    claim_ids: string[];
  };
  suppressed_or_not_computed_claims: {
    count: number;
    summary: string;
    claim_ids: string[];
  };
  top_blockers: string[];
  next_upgrade_action: string;
};

export type BuildGleanClaimPacketExportInput = {
  methodology_review_workspace: MethodologyReviewWorkspace;
  selected_methodology_snapshot_id?: string;
  strongest_safe_claim: StrongestSafeClaim;
  value_evidence_pack?: GleanValueEvidencePack;
  ai_work_value_graph?: AiWorkValueGraph;
  claim_packet_id?: string;
  window?: string;
  generated_at?: string;
};

const dedupeStrings = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

const toClaimPacketId = (orgId: string, window: string, selectedSnapshotId: string) =>
  `claim_packet:${orgId}:${window}:${selectedSnapshotId}`;

const selectedSnapshotIdFor = (input: BuildGleanClaimPacketExportInput) =>
  input.selected_methodology_snapshot_id ?? input.methodology_review_workspace.selected_snapshot_id;

const statementFromStrongestSafeClaim = (strongestSafeClaim: StrongestSafeClaim): ClaimPacketStatement => ({
  claim_id: strongestSafeClaim.strongest_claim.claim_id,
  claim_source: "strongest_safe_claim",
  claim_type: strongestSafeClaim.strongest_claim.outcome_domain,
  claim_readiness:
    strongestSafeClaim.strongest_claim.claim_readiness === "customer_safe"
      ? "customer_safe"
      : strongestSafeClaim.strongest_claim.claim_readiness === "internal_only"
        ? "internal_only"
        : strongestSafeClaim.strongest_claim.claim_readiness === "caveated"
          ? "caveated"
          : strongestSafeClaim.strongest_claim.claim_readiness === "suppressed"
            ? "suppressed"
            : strongestSafeClaim.strongest_claim.claim_readiness === "not_measured"
              ? "not_computed"
              : "caveated",
  language: strongestSafeClaim.strongest_claim.safe_claim_language,
  caveats: strongestSafeClaim.strongest_claim.caveats,
  reason_codes: strongestSafeClaim.blocked_methodology_claims
});

const languageForGleanClaim = (claim: GleanValueClaimReadiness) =>
  claim.customer_safe_language ??
  claim.approved_language ??
  `Suppressed: ${claim.reason_codes.length > 0 ? claim.reason_codes.join(", ") : claim.evidence_state}.`;

const statementFromGleanValueClaim = (claim: GleanValueClaimReadiness): ClaimPacketStatement => ({
  claim_id: claim.claim_id,
  claim_source: "glean_value_evidence",
  claim_type: claim.claim_type,
  claim_readiness:
    claim.readiness_state === "customer_safe"
      ? "customer_safe"
      : claim.readiness_state === "customer_safe_with_caveats"
        ? "customer_safe_with_caveats"
        : claim.readiness_state === "internal_only"
          ? "internal_only"
          : claim.readiness_state === "not_computed"
            ? "not_computed"
            : "suppressed",
  language: languageForGleanClaim(claim),
  caveats: claim.reason_codes,
  reason_codes: claim.reason_codes
});

const classifyStatement = (
  statement: ClaimPacketStatement,
  buckets: Pick<GleanClaimPacketExport, "caveated_claims" | "internal_only_claims" | "suppressed_claims">
) => {
  if (statement.claim_readiness === "suppressed" || statement.claim_readiness === "not_computed") {
    buckets.suppressed_claims.push(statement);
    return;
  }
  if (statement.claim_readiness === "internal_only") {
    buckets.internal_only_claims.push(statement);
    return;
  }
  if (statement.claim_readiness === "customer_safe_with_caveats" || statement.claim_readiness === "caveated") {
    buckets.caveated_claims.push(statement);
  }
};

const evidenceGapsFromStrongestSafeClaim = (strongestSafeClaim: StrongestSafeClaim) =>
  strongestSafeClaim.evidence_gaps.map((gap) => ({
    gap_id: `strongest_safe_claim:${gap.evidence_type}`,
    source: "strongest_safe_claim" as const,
    gap_type: gap.evidence_type,
    blocks: gap.blocks,
    action: gap.action
  }));

const evidenceGapsFromValueEvidencePack = (pack?: GleanValueEvidencePack) =>
  pack
    ? pack.coverage_lanes
        .filter((lane) => lane.evidence_state !== "present" || lane.missing_surfaces.length > 0)
        .map((lane) => ({
          gap_id: `glean_value_evidence:${lane.lane}`,
          source: "glean_value_evidence" as const,
          gap_type: lane.lane,
          blocks: lane.evidence_state,
          action:
            lane.notes[0] ??
            `Add aggregate evidence for ${lane.lane.replace(/_/g, " ")} before upgrading related claims.`
        }))
    : [];

const evidenceGapsFromAiWorkValueGraph = (graph?: AiWorkValueGraph) =>
  graph
    ? graph.summary.blocked_claims.map((blockedClaim, index) => ({
        gap_id: `ai_work_value_graph:blocked_claim:${index + 1}`,
        source: "ai_work_value_graph" as const,
        gap_type: "blocked_claim",
        blocks: graph.summary.overall_claim_readiness,
        action: blockedClaim
      }))
    : [];

const methodologyUpgradeActions = (workspace: MethodologyReviewWorkspace, selectedSnapshotId: string) => {
  const snapshot =
    workspace.snapshots.find((candidate) => candidate.methodology_snapshot_id === selectedSnapshotId) ??
    workspace.selected_snapshot;
  if (snapshot.financial_claim_effect.startsWith("customer-safe")) {
    return [
      "Keep the frozen methodology snapshot, approved window, assumptions, and caveats attached to the QBR packet."
    ];
  }
  if (snapshot.financial_claim_effect.startsWith("internal-only")) {
    return ["Request customer-safe methodology approval before using financial value language with customers."];
  }
  if (snapshot.financial_claim_effect.startsWith("suppressed")) {
    return ["Replace, revise, or re-approve the methodology snapshot before emitting financial value language."];
  }
  return ["Complete methodology approval before upgrading from caveated or directional value language."];
};

export function buildGleanClaimPacketExport(input: BuildGleanClaimPacketExportInput): GleanClaimPacketExport {
  if (!input.value_evidence_pack && !input.ai_work_value_graph) {
    throw new Error("Claim packet export requires a Value Evidence Pack or AI Work Value Graph.");
  }

  const selectedMethodologySnapshotId = selectedSnapshotIdFor(input);
  const strongestSafeClaim = StrongestSafeClaimSchema.parse(input.strongest_safe_claim);
  const valueEvidencePack = input.value_evidence_pack
    ? GleanValueEvidencePackSchema.parse(input.value_evidence_pack)
    : undefined;
  const aiWorkValueGraph = input.ai_work_value_graph ? AiWorkValueGraphSchema.parse(input.ai_work_value_graph) : undefined;
  const orgId = valueEvidencePack?.org_id ?? aiWorkValueGraph?.org_id ?? input.methodology_review_workspace.org_id;
  const window = input.window ?? valueEvidencePack?.window ?? aiWorkValueGraph?.window ?? "unspecified";
  const generatedAt = input.generated_at ?? valueEvidencePack?.generated_at ?? aiWorkValueGraph?.generated_at ?? strongestSafeClaim.generated_at;
  const claimPacketId = input.claim_packet_id ?? toClaimPacketId(orgId, window, selectedMethodologySnapshotId);
  const buckets: Pick<GleanClaimPacketExport, "caveated_claims" | "internal_only_claims" | "suppressed_claims"> = {
    caveated_claims: [],
    internal_only_claims: [],
    suppressed_claims: []
  };

  classifyStatement(statementFromStrongestSafeClaim(strongestSafeClaim), buckets);
  valueEvidencePack?.claim_readiness.forEach((claim) => classifyStatement(statementFromGleanValueClaim(claim), buckets));

  const upgradeActions = dedupeStrings([
    ...strongestSafeClaim.upgrade_actions,
    ...(valueEvidencePack?.next_instrumentation_actions.map((action) => action.action) ?? []),
    ...(aiWorkValueGraph?.summary.next_evidence_actions ?? []),
    ...methodologyUpgradeActions(input.methodology_review_workspace, selectedMethodologySnapshotId)
  ]);

  const governanceBoundaries = dedupeStrings([
    ...strongestSafeClaim.governance_boundaries,
    "The packet packages admissible evidence and claim language; it does not calculate ROI independently.",
    "No raw prompts, raw responses, transcripts, query text, tool payloads, file contents, direct identifiers, rankings, manager views, or productivity scoring."
  ]);

  return GleanClaimPacketExportSchema.parse({
    schema_version: "GCP_2026_05",
    claim_packet_id: claimPacketId,
    org_id: orgId,
    window,
    generated_at: generatedAt,
    selected_methodology_snapshot_id: selectedMethodologySnapshotId,
    reviewer_decision_memo: buildMethodologyDecisionMemo(
      input.methodology_review_workspace,
      selectedMethodologySnapshotId
    ),
    strongest_safe_claim: strongestSafeClaim,
    caveated_claims: buckets.caveated_claims,
    internal_only_claims: buckets.internal_only_claims,
    suppressed_claims: buckets.suppressed_claims,
    evidence_gaps: [
      ...evidenceGapsFromStrongestSafeClaim(strongestSafeClaim),
      ...evidenceGapsFromValueEvidencePack(valueEvidencePack),
      ...evidenceGapsFromAiWorkValueGraph(aiWorkValueGraph)
    ],
    upgrade_actions: upgradeActions,
    governance_boundaries: governanceBoundaries
  });
}

const memoValueFor = (memo: string, label: string) => {
  const line = memo.split("\n").find((entry) => entry.toLowerCase().startsWith(`${label.toLowerCase()}:`));
  return line ? line.slice(label.length + 1).trim() : "Not available.";
};

const executiveDecisionStateFor = (packet: GleanClaimPacketExport): z.infer<typeof ClaimPacketReadinessSchema> => {
  const memoDecisionState = memoValueFor(packet.reviewer_decision_memo, "Decision state").toLowerCase();
  if (memoDecisionState.includes("internal-only") || memoDecisionState.includes("internal_only")) {
    return "internal_only";
  }
  if (memoDecisionState.includes("suppressed")) {
    return "suppressed";
  }
  if (memoDecisionState.includes("customer-safe") || memoDecisionState.includes("customer_safe")) {
    return "customer_safe";
  }
  if (memoDecisionState.includes("not computed") || memoDecisionState.includes("not_computed")) {
    return "not_computed";
  }

  const strongestReadiness = packet.strongest_safe_claim.strongest_claim.claim_readiness;
  if (strongestReadiness === "internal_only" || packet.internal_only_claims.length > 0) {
    return "internal_only";
  }
  if (strongestReadiness === "customer_safe") {
    return "customer_safe";
  }
  if (strongestReadiness === "suppressed") {
    return "suppressed";
  }
  if (strongestReadiness === "not_measured" && packet.caveated_claims.length === 0) {
    return packet.suppressed_claims.length > 0 ? "suppressed" : "not_computed";
  }
  return "caveated";
};

const executiveHeadlineFor = (decisionState: z.infer<typeof ClaimPacketReadinessSchema>) => {
  if (decisionState === "customer_safe") {
    return "Customer-safe claim language is available within the approved packet scope.";
  }
  if (decisionState === "internal_only") {
    return "Executive decision: internal only.";
  }
  if (decisionState === "suppressed") {
    return "Executive decision: suppressed.";
  }
  if (decisionState === "not_computed") {
    return "Executive decision: not computed.";
  }
  return "Executive decision: caveated.";
};

const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

const summarizeClaims = (
  claims: ClaimPacketStatement[],
  emptySummary: string,
  singularLabel: string,
  pluralLabel = `${singularLabel}s`
) => ({
  count: claims.length,
  summary: claims.length === 0 ? emptySummary : pluralize(claims.length, singularLabel, pluralLabel),
  claim_ids: claims.map((claim) => claim.claim_id)
});

export function buildGleanClaimPacketQbrReadinessSummary(raw: unknown): GleanClaimPacketQbrReadinessSummary {
  const packet = GleanClaimPacketExportSchema.parse(raw);
  const customerSafeClaims = packet.caveated_claims.filter(
    (claim) => claim.claim_readiness === "customer_safe" || claim.claim_readiness === "customer_safe_with_caveats"
  );
  const caveatedClaims = packet.caveated_claims.filter((claim) => claim.claim_readiness === "caveated");
  const topBlockers = packet.evidence_gaps
    .slice(0, 3)
    .map((gap) => `${gap.gap_type.replace(/_/g, " ")} blocks ${gap.blocks.replace(/_/g, " ")}: ${gap.action}`);

  const summary: GleanClaimPacketQbrReadinessSummary = {
    customer_safe_claims: summarizeClaims(
      customerSafeClaims,
      "No customer-safe claims in this packet.",
      "customer-safe claim with caveats",
      "customer-safe claims with caveats"
    ),
    caveated_claims: summarizeClaims(caveatedClaims, "No caveated claims in this packet.", "caveated claim"),
    internal_only_claims: summarizeClaims(
      packet.internal_only_claims,
      "No internal-only claims in this packet.",
      "internal-only claim"
    ),
    suppressed_or_not_computed_claims: summarizeClaims(
      packet.suppressed_claims,
      "No suppressed or not-computed claims in this packet.",
      "suppressed or not-computed claim"
    ),
    top_blockers: topBlockers.length > 0 ? topBlockers : ["No blockers are recorded in this claim packet."],
    next_upgrade_action: packet.upgrade_actions[0] ?? "No upgrade action is recorded in this claim packet."
  };

  assertNoForbiddenClaimPacketKeys(summary);

  return summary;
}

export function buildGleanClaimPacketQbrNarrative(raw: unknown): GleanClaimPacketQbrNarrative {
  const packet = GleanClaimPacketExportSchema.parse(raw);
  const decisionState = executiveDecisionStateFor(packet);
  const strongestSafeClaim = statementFromStrongestSafeClaim(packet.strongest_safe_claim);
  const narrative: GleanClaimPacketQbrNarrative = {
    executive_decision: {
      decision_state: decisionState,
      headline: executiveHeadlineFor(decisionState),
      summary:
        decisionState === "internal_only"
          ? "Use financial value language for internal planning only until customer-safe methodology approval exists."
          : "Use the packet sections below as the current QBR claim posture without calculating ROI or upgrading readiness."
    },
    strongest_safe_claim: strongestSafeClaim,
    caveated_claims: packet.caveated_claims,
    internal_only_claims: packet.internal_only_claims,
    suppressed_or_not_computed_claims: packet.suppressed_claims,
    evidence_gaps: packet.evidence_gaps,
    upgrade_actions: packet.upgrade_actions,
    governance_boundaries: packet.governance_boundaries,
    methodology_snapshot_summary: {
      selected_methodology_snapshot_id: packet.selected_methodology_snapshot_id,
      decision_state: memoValueFor(packet.reviewer_decision_memo, "Decision state"),
      approval_state: memoValueFor(packet.reviewer_decision_memo, "Approval state"),
      financial_claim_effect: memoValueFor(packet.reviewer_decision_memo, "Financial claim effect")
    }
  };

  assertNoForbiddenClaimPacketKeys(narrative);

  return narrative;
}
