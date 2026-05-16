import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  NielsenSourceEvidenceTrialPackageSchema,
  buildNielsenSourceEvidenceTrialReview
} from "@learnaire/shared";

const repoRoot = resolve(__dirname, "../..");

const fixture = (contractPath: string, name: string) =>
  JSON.parse(readFileSync(resolve(repoRoot, "docs/contracts", contractPath, "examples", name), "utf8"));

const trialFixture = fixture("nielsen-source-evidence-trial", "nielsen-source-evidence-trial.sample.json");

describe("Nielsen Source Evidence Trial", () => {
  it("accepts the committed document-derived trial fixture", () => {
    const parsed = NielsenSourceEvidenceTrialPackageSchema.parse(trialFixture);

    expect(parsed.schema_version).toBe("NSETR_2026_05");
    expect(parsed.trial_effect).toBe("document_claim_mapping_only");
    expect(parsed.generated_aggregate_import.schema_version).toBe("AEI_2026_05");
    expect(parsed.claim_candidates.length).toBeGreaterThanOrEqual(6);
  });

  it("maps Nielsen document claims without upgrading claim readiness", () => {
    const review = buildNielsenSourceEvidenceTrialReview(trialFixture);

    expect(review.claim_readiness_effect).toBe("no_readiness_upgrade");
    expect(review.aggregate_import_review.import_effect).toBe("review_only_no_persistence");
    expect(review.aggregate_import_review.claim_readiness_effect).toBe("no_readiness_upgrade");
    expect(review.summary).toMatch(/document-derived claim candidates/i);
    expect(review.summary).toMatch(/No live ingestion occurred/i);
    expect(review.candidate_summary.accepted_for_review_count).toBeGreaterThan(0);
    expect(review.candidate_summary.withheld_count).toBeGreaterThan(0);
  });

  it("withholds financial and external outcome claims until approved source evidence exists", () => {
    const review = buildNielsenSourceEvidenceTrialReview(trialFixture);

    expect(review.withheld_candidate_ids).toEqual(
      expect.arrayContaining([
        "candidate:nielsen:financial_model_claim",
        "candidate:nielsen:cs_cx_outcome_movement",
        "candidate:nielsen:survey_opportunity"
      ])
    );
    expect(review.blocked_claim_effects).toEqual(
      expect.arrayContaining([
        "Customer-facing financial language remains blocked until finance/customer-safe approval is attached.",
        "CS/CX outcome movement remains blocked until aggregate external outcome export is approved."
      ])
    );
    expect(JSON.stringify(review)).not.toMatch(/customer-safe financial language enabled|calculated ROI/i);
  });

  it("keeps deck-derived person-level examples out of the trial output", () => {
    const serialized = JSON.stringify(buildNielsenSourceEvidenceTrialReview(trialFixture));

    expect(serialized).not.toMatch(
      /raw_prompt|raw_response|transcript|query_text|tool_payload|file_content|user_id|employee_id|person_id|manager_view|team_ranking|productivity_score|Michael|Maritza|A&E|Amazon|Facebook|Hulu|ESPN/i
    );
  });

  it("rejects forbidden raw or person-level fields in claim candidates", () => {
    const result = NielsenSourceEvidenceTrialPackageSchema.safeParse({
      ...trialFixture,
      claim_candidates: [
        ...trialFixture.claim_candidates,
        {
          claim_candidate_id: "candidate:nielsen:unsafe",
          source_artifact_id: "artifact:nielsen_value_deck",
          source_locator: "slide:21",
          claim_family: "operational_outcome_claim",
          outcome_domain: "customer_success",
          work_pattern: "troubleshoot",
          target_source_input_id: "source:staircase_ai_aggregate_outcomes",
          mapped_evidence_record_id: "aggregate:nielsen:unsafe",
          mapping_disposition: "withheld",
          claim_treatment: "suppressed",
          reason_codes: ["person_level_metric_not_allowed"],
          required_upgrade_evidence: ["Aggregate-only external outcome export."],
          raw_response: "unsafe"
        }
      ]
    });

    expect(result.success).toBe(false);
  });
});
