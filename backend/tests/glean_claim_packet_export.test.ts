import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  GleanClaimPacketExportSchema,
  buildGleanClaimPacketQbrReadinessSummary,
  buildGleanClaimPacketQbrNarrative,
  buildGleanClaimPacketExport,
  buildGleanValueEvidencePack,
  buildMethodologyReviewWorkspace,
  generateStrongestSafeClaim
} from "@learnaire/shared";

const repoRoot = resolve(__dirname, "../..");

const fixture = (contractPath: string, name: string) =>
  JSON.parse(readFileSync(resolve(repoRoot, "docs/contracts", contractPath, "examples", name), "utf8"));

const claimPacketExample = fixture("glean-claim-packet", "nielsen-style-qbr-claim-packet.json");
const methodologySnapshotRegistry = fixture("methodology-snapshot-registry", "nielsen-style-methodology-snapshots.json");
const valueEvidencePack = fixture("glean-value-evidence", "org-northstar-value-pack.json");
const graph = fixture("ai-work-value-graph", "org-northstar-ai-work-value-graph.json");
const maturityModel = fixture("ai-work-maturity-model", "nielsen-style-ai-work-maturity-examples.json");
const valueHypothesisRegistry = fixture("value-hypothesis-registry", "nielsen-style-value-hypothesis-registry.json");
const outcomeInstrumentationMap = fixture("outcome-instrumentation-map", "nielsen-style-outcome-instrumentation-map.json");

const buildPacket = () => {
  const selectedSnapshotId = "nielsen_roi_payback_internal_2025_10";
  const workspace = buildMethodologyReviewWorkspace(methodologySnapshotRegistry, selectedSnapshotId);
  const strongestSafeClaim = generateStrongestSafeClaim({
    graph,
    maturity_model: maturityModel,
    value_hypothesis_registry: valueHypothesisRegistry,
    outcome_instrumentation_map: outcomeInstrumentationMap,
    methodology_snapshot_registry: methodologySnapshotRegistry,
    preferred_hypothesis_id: "agentic_business_reporting",
    preferred_methodology_snapshot_id: selectedSnapshotId
  });

  return buildGleanClaimPacketExport({
    methodology_review_workspace: workspace,
    selected_methodology_snapshot_id: selectedSnapshotId,
    strongest_safe_claim: strongestSafeClaim,
    value_evidence_pack: buildGleanValueEvidencePack(valueEvidencePack)
  });
};

describe("Glean Claim Packet Export", () => {
  it("packages methodology review, strongest safe claim, evidence posture, and upgrade actions", () => {
    const packet = buildPacket();

    expect(packet.schema_version).toBe("GCP_2026_05");
    expect(packet.claim_packet_id).toBe("claim_packet:org-northstar:weekly:nielsen_roi_payback_internal_2025_10");
    expect(packet.selected_methodology_snapshot_id).toBe("nielsen_roi_payback_internal_2025_10");
    expect(packet.reviewer_decision_memo).toMatch(/Decision state: internal-only/i);
    expect(packet.strongest_safe_claim.strongest_claim.claim_readiness).toBe("internal_only");
    expect(packet.internal_only_claims.some((claim) => claim.claim_source === "strongest_safe_claim")).toBe(true);
    expect(packet.caveated_claims.map((claim) => claim.claim_id)).toEqual(
      expect.arrayContaining([
        "glean.time_saved.covered_surfaces",
        "glean.skills.reusable_expertise_operationalized"
      ])
    );
    expect(packet.suppressed_claims.map((claim) => claim.claim_id)).toEqual(
      expect.arrayContaining(["glean.roi.customer_value_to_cost", "glean.mcp.governed_action_boundary"])
    );
    expect(packet.evidence_gaps.some((gap) => gap.source === "glean_value_evidence")).toBe(true);
    expect(packet.upgrade_actions).toEqual(
      expect.arrayContaining([
        "Request customer-safe methodology approval before using financial value language with customers."
      ])
    );
    expect(packet.governance_boundaries.join(" ")).toMatch(/does not calculate ROI independently/i);
    expect(GleanClaimPacketExportSchema.parse(packet)).toEqual(packet);
  });

  it("accepts the committed synthetic QBR claim packet example", () => {
    const parsed = GleanClaimPacketExportSchema.parse(claimPacketExample);

    expect(parsed.schema_version).toBe("GCP_2026_05");
    expect(parsed.internal_only_claims[0].claim_readiness).toBe("internal_only");
    expect(parsed.suppressed_claims.length).toBeGreaterThanOrEqual(2);
  });

  it("rejects forbidden raw or person-level fields", () => {
    const packet = buildPacket();
    const result = GleanClaimPacketExportSchema.safeParse({
      ...packet,
      raw_prompt: "unsafe"
    });

    expect(result.success).toBe(false);
  });

  it("does not emit forbidden raw or person-level field names", () => {
    const packet = buildPacket();

    expect(JSON.stringify(packet)).not.toMatch(
      /raw_prompt|raw_response|query_text|tool_payload|file_content|user_id|employee_id|manager_view|team_ranking|productivity_score/i
    );
  });

  it("formats a QBR narrative without upgrading internal-only financial posture", () => {
    const narrative = buildGleanClaimPacketQbrNarrative(buildPacket());

    expect(narrative.executive_decision.decision_state).toBe("internal_only");
    expect(narrative.strongest_safe_claim.claim_readiness).toBe("internal_only");
    expect(narrative.internal_only_claims.some((claim) => claim.claim_id === "claim:agentic_business_reporting")).toBe(true);
    expect(narrative.methodology_snapshot_summary.selected_methodology_snapshot_id).toBe(
      "nielsen_roi_payback_internal_2025_10"
    );
    expect(JSON.stringify(narrative)).not.toMatch(/customer-safe ROI/i);
  });

  it("keeps suppressed claims, evidence gaps, upgrades, and governance visible in the QBR narrative", () => {
    const narrative = buildGleanClaimPacketQbrNarrative(buildPacket());

    expect(narrative.suppressed_or_not_computed_claims.map((claim) => claim.claim_id)).toEqual(
      expect.arrayContaining(["glean.roi.customer_value_to_cost", "glean.mcp.governed_action_boundary"])
    );
    expect(narrative.evidence_gaps.length).toBeGreaterThan(0);
    expect(narrative.upgrade_actions.length).toBeGreaterThan(0);
    expect(narrative.governance_boundaries.join(" ")).toMatch(/does not calculate ROI independently/i);
  });

  it("formats QBR narrative without forbidden raw or person-level fields", () => {
    const narrative = buildGleanClaimPacketQbrNarrative(buildPacket());

    expect(JSON.stringify(narrative)).not.toMatch(
      /raw_prompt|raw_response|query_text|tool_payload|file_content|user_id|employee_id|manager_view|team_ranking|productivity_score/i
    );
  });

  it("summarizes QBR readiness from existing claim buckets without upgrading readiness", () => {
    const summary = buildGleanClaimPacketQbrReadinessSummary(buildPacket());

    expect(summary.customer_safe_claims.summary).toMatch(/customer-safe claims? with caveats/i);
    expect(summary.caveated_claims.count).toBeGreaterThanOrEqual(0);
    expect(summary.internal_only_claims.summary).toMatch(/internal-only claim/i);
    expect(summary.suppressed_or_not_computed_claims.claim_ids).toEqual(
      expect.arrayContaining(["glean.roi.customer_value_to_cost", "glean.mcp.governed_action_boundary"])
    );
    expect(summary.top_blockers.length).toBeGreaterThan(0);
    expect(summary.next_upgrade_action).toMatch(/\S/);
    expect(JSON.stringify(summary)).not.toMatch(/customer-safe ROI/i);
  });
});
