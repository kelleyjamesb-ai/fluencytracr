import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  AggregateEvidenceImportPackageSchema,
  buildAggregateEvidenceImportReview
} from "@learnaire/shared";

const repoRoot = resolve(__dirname, "../..");

const fixture = (contractPath: string, name: string) =>
  JSON.parse(readFileSync(resolve(repoRoot, "docs/contracts", contractPath, "examples", name), "utf8"));

const importFixture = fixture("aggregate-evidence-import", "glean-aggregate-evidence-import.sample.json");

describe("Aggregate Evidence Import v1", () => {
  it("accepts the committed aggregate-only import package fixture", () => {
    const parsed = AggregateEvidenceImportPackageSchema.parse(importFixture);

    expect(parsed.schema_version).toBe("AEI_2026_05");
    expect(parsed.import_path).toBe("admin_exported_aggregate_upload");
    expect(parsed.real_source_readiness_manifest.schema_version).toBe("RSRM_2026_05");
    expect(parsed.aggregate_evidence.length).toBeGreaterThanOrEqual(4);
  });

  it("accepts only ready-source records and withholds blocked or approval-dependent records", () => {
    const review = buildAggregateEvidenceImportReview(importFixture);

    expect(review.claim_readiness_effect).toBe("no_readiness_upgrade");
    expect(review.import_effect).toBe("review_only_no_persistence");
    expect(review.accepted_evidence.source_input_ids).toContain("source:methodology_snapshot");
    expect(review.withheld_evidence.source_input_ids).toEqual(
      expect.arrayContaining([
        "source:value_evidence_pack",
        "source:mcp_action_boundary",
        "source:customer_safe_financial_approval"
      ])
    );
    expect(review.top_blockers).toEqual(
      expect.arrayContaining([
        "Confirm aggregate Glean export fields for surface, Skill, Agent, and artifact evidence."
      ])
    );
    expect(JSON.stringify(review)).not.toMatch(/customer-safe ROI|calculated ROI/i);
  });

  it("rejects aggregate evidence that references a source not present in the readiness manifest", () => {
    const result = AggregateEvidenceImportPackageSchema.safeParse({
      ...importFixture,
      aggregate_evidence: [
        ...importFixture.aggregate_evidence,
        {
          evidence_record_id: "aggregate:unknown_source",
          source_input_id: "source:not_in_manifest",
          evidence_type: "source_coverage",
          evidence_state: "present",
          aggregate_metric_refs: ["unknown.coverage.window"],
          aggregate_values: [
            {
              metric_name: "coverage_count",
              value: 1,
              unit: "count"
            }
          ],
          notes: ["This source is not in the manifest."]
        }
      ]
    });

    expect(result.success).toBe(false);
  });

  it("rejects forbidden raw or person-level fields", () => {
    const result = AggregateEvidenceImportPackageSchema.safeParse({
      ...importFixture,
      aggregate_evidence: [
        ...importFixture.aggregate_evidence,
        {
          evidence_record_id: "aggregate:unsafe",
          source_input_id: "source:methodology_snapshot",
          evidence_type: "source_coverage",
          evidence_state: "present",
          aggregate_metric_refs: ["unsafe.metric.window"],
          aggregate_values: [
            {
              metric_name: "user_id_count",
              value: 10,
              unit: "count"
            }
          ],
          raw_prompt: "unsafe"
        }
      ]
    });

    expect(result.success).toBe(false);
  });

  it("emits no forbidden raw or person-level fields in the import review", () => {
    const review = buildAggregateEvidenceImportReview(importFixture);

    expect(JSON.stringify(review)).not.toMatch(
      /raw_prompt|raw_response|transcript|query_text|tool_payload|file_content|user_id|employee_id|person_id|manager_view|team_ranking|productivity_score/i
    );
  });
});
