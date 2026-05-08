import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  GleanClaimPacketExportSchema,
  RealSourceReadinessManifestSchema,
  buildRealSourceReadinessReview
} from "@learnaire/shared";

const repoRoot = resolve(__dirname, "../..");

const fixture = (contractPath: string, name: string) =>
  JSON.parse(readFileSync(resolve(repoRoot, "docs/contracts", contractPath, "examples", name), "utf8"));

const manifestFixture = fixture("real-source-readiness", "glean-claim-packet-real-source-readiness.json");
const claimPacketFixture = fixture("glean-claim-packet", "nielsen-style-qbr-claim-packet.json");

describe("Real Source Readiness Manifest", () => {
  it("accepts the committed aggregate-only manifest fixture", () => {
    const manifest = RealSourceReadinessManifestSchema.parse(manifestFixture);

    expect(manifest.schema_version).toBe("RSRM_2026_05");
    expect(manifest.source_inputs.map((source) => source.source_type)).toEqual(
      expect.arrayContaining(["methodology_snapshot", "value_evidence_pack", "outcome_instrumentation_map"])
    );
    expect(manifest.ingestion_path.recommended_path).toBe("admin_exported_aggregate_upload");
    expect(manifest.ingestion_path.implementation_state).toBe("not_implemented");
  });

  it("summarizes real-source readiness without upgrading claim readiness", () => {
    const claimPacket = GleanClaimPacketExportSchema.parse(claimPacketFixture);
    const review = buildRealSourceReadinessReview({
      manifest: manifestFixture,
      claim_packet: claimPacket
    });

    expect(review.claim_readiness_effect).toBe("no_readiness_upgrade");
    expect(review.overall_state).toBe("blocked");
    expect(review.ready_sources.source_input_ids).toContain("source:methodology_snapshot");
    expect(review.approval_required_sources.source_input_ids).toContain("source:customer_safe_financial_approval");
    expect(review.blocked_or_unknown_sources.source_input_ids).toEqual(
      expect.arrayContaining(["source:mcp_action_boundary", "source:control_evidence"])
    );
    expect(review.affected_claim_buckets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          claim_bucket: "suppressed_or_not_computed",
          source_input_ids: expect.arrayContaining(["source:mcp_action_boundary"])
        }),
        expect.objectContaining({
          claim_bucket: "internal_only",
          source_input_ids: expect.arrayContaining(["source:customer_safe_financial_approval"])
        })
      ])
    );
    expect(claimPacket.suppressed_claims.map((claim) => claim.claim_id)).toEqual(
      expect.arrayContaining(["glean.roi.customer_value_to_cost", "glean.mcp.governed_action_boundary"])
    );
    expect(JSON.stringify(review)).not.toMatch(/customer-safe ROI|calculated ROI/i);
  });

  it("rejects forbidden raw or person-level fields", () => {
    const result = RealSourceReadinessManifestSchema.safeParse({
      ...manifestFixture,
      source_inputs: [
        ...manifestFixture.source_inputs,
        {
          source_input_id: "source:unsafe",
          source_type: "value_evidence_pack",
          source_system: "Glean",
          readiness_state: "ready",
          required_fields: [
            {
              field_name: "raw_prompt",
              status: "known",
              impact: "unsafe raw field"
            }
          ],
          privacy_boundary: {
            aggregate_only: true,
            forbidden_fields_absent: false,
            privacy_review_state: "rejected",
            notes: ["Unsafe."]
          },
          approval_state: "rejected",
          affects_claim_buckets: ["suppressed_or_not_computed"],
          blockers: ["Unsafe field."],
          upgrade_actions: ["Remove unsafe field."]
        }
      ]
    });

    expect(result.success).toBe(false);
  });

  it("contains no forbidden raw or person-level fields in the review output", () => {
    const review = buildRealSourceReadinessReview({
      manifest: manifestFixture,
      claim_packet: claimPacketFixture
    });

    expect(JSON.stringify(review)).not.toMatch(
      /raw_prompt|raw_response|transcript|query_text|tool_payload|file_content|user_id|employee_id|person_id|manager_view|team_ranking|productivity_score/i
    );
  });
});
