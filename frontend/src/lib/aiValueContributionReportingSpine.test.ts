import { describe, expect, it } from "vitest";

import {
  REQUIRED_CONTRIBUTION_REPORTING_MILESTONES,
  buildAiContributionReportingSpineViewModel
} from "./aiValueContributionReportingSpine";

const bridge = {
  available: true,
  statusLabel: "Metric setup ready",
  summary: "Metric planning summary.",
  items: [
    {
      id: "support_resolution_hours",
      sponsorQuestion: "Which support outcome should we watch?",
      successMeasure: "Reduce median support resolution hours",
      metricName: "Median resolution time",
      valueRouteLabel: "Capacity creation",
      sourceSystem: "Support case management system",
      measurementUnit: "hours",
      baselineRule: "Compare against an approved pre-period window.",
      owner: "Customer data owner",
      evidenceStatus: "Customer outcome export missing",
      allowedClaimLevel: "Planning language only",
      feedsNext: "Next: Evidence Readiness"
    }
  ]
};
const unsafeTestTerm = (...parts: string[]) => parts.join("");
const escapedTestPatternText = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

describe("AI contribution reporting spine view model", () => {
  it("fails closed when no Blueprint hypothesis is supplied", () => {
    const spine = buildAiContributionReportingSpineViewModel({});

    expect(spine.reportingSpineState).toBe("HOLD_FOR_BLUEPRINT_HYPOTHESIS");
    expect(spine.statusLabel).toBe("Needs Blueprint hypothesis");
    expect(spine.allowedNextEvidenceAction).toBe("clarify_blueprint_hypothesis");
    expect(spine.candidateMetricRecommendations).toEqual([]);
    expect(spine.milestonePlan.requiredMilestones.map((milestone) => milestone.label)).toEqual([
      "T0",
      "T30",
      "T60",
      "T90",
      "T120",
      "T180",
      "T270",
      "T365"
    ]);
    expect(spine.promotionAuthorized).toBe(false);
    expect(spine.diagnosticsEvidenceSatisfied).toBe(false);
    expect(Object.values(spine.blockedOutputs).every((value) => value === false)).toBe(true);
  });

  it("renders candidate recommendations as planning inputs without selected metric approval", () => {
    const spine = buildAiContributionReportingSpineViewModel({
      blueprintHypothesisRef: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
      workflowFunctionScope: "Customer Support case resolution",
      valueRouteLabel: "Capacity creation",
      metricLibraryRef: "metrics_library.customer_support.aggregate_outcomes",
      questionMetricBridge: bridge
    });

    expect(spine.reportingSpineState).toBe(
      "AI_CONTRIBUTION_REPORTING_SPINE_READY_WITH_EVIDENCE_GAPS"
    );
    expect(spine.candidateMetricRecommendations).toHaveLength(1);
    expect(spine.candidateMetricRecommendations[0]).toMatchObject({
      candidateMetricId: "support_resolution_hours",
      metricLabel: "Median resolution time",
      recommendationIsEvidence: false,
      selectedMetricApproved: false
    });
    expect(spine.selectedMetricApprovalState).toBe("HOLD_FOR_REVIEWER_APPROVAL");
    expect(spine.selectedMetricApproved).toBe(false);
    expect(spine.evidenceGapList).toContain("missing_reviewer_metric_approval");
    expect(spine.evidenceGapList).toContain("missing_comparison_design_source_package");
    expect(spine.allowedNextEvidenceAction).toBe("complete_reviewer_metric_selection_approval");
  });

  it("holds for metric library refs before rendering candidate recommendations", () => {
    const spine = buildAiContributionReportingSpineViewModel({
      blueprintHypothesisRef: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
      workflowFunctionScope: "Customer Support case resolution",
      valueRouteLabel: "Capacity creation",
      questionMetricBridge: bridge
    });

    expect(spine.reportingSpineState).toBe("HOLD_FOR_METRIC_LIBRARY_REFS");
    expect(spine.candidateMetricRecommendations).toEqual([]);
    expect(spine.evidenceGapList).toEqual(["missing_metric_library_refs"]);
    expect(spine.allowedNextEvidenceAction).toBe("supply_metric_library_refs");
    expect(spine.recommendationsCreateEvidence).toBe(false);
    expect(spine.selectedMetricApproved).toBe(false);
  });

  it("keeps browser-local metric selection separate from reviewer approval", () => {
    const spine = buildAiContributionReportingSpineViewModel({
      blueprintHypothesisRef: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
      workflowFunctionScope: "Customer Support case resolution",
      valueRouteLabel: "Capacity creation",
      metricLibraryRef: "metrics_library.customer_support.aggregate_outcomes",
      questionMetricBridge: bridge,
      selectedOutcomeMetricSelection: {
        functionArea: "Customer or Account Success",
        quadrantLabel: "Deep but slow",
        vbdBaseline: "Velocity 42 · Breadth 55 · Depth 66",
        metrics: [
          {
            id: "support_resolution_hours",
            name: "Median resolution time",
            valueRoute: "Capacity creation",
            sourceSystem: "Support case management system",
            measurementUnit: "hours",
            owner: "Customer data owner"
          }
        ]
      }
    });

    expect(spine.selectedMetricApprovalState).toBe("LOCAL_SELECTION_NOT_REVIEWER_APPROVED");
    expect(spine.selectedMetricPosture.label).toBe("Local selection only");
    expect(spine.selectedMetricPosture.metricLabel).toBe("Median resolution time");
    expect(spine.selectedMetricApproved).toBe(false);
    expect(spine.evidenceGapList).toContain("missing_reviewer_metric_approval");
  });

  it("scrubs unsafe browser-local selected metric labels", () => {
    const spine = buildAiContributionReportingSpineViewModel({
      blueprintHypothesisRef: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
      workflowFunctionScope: "Customer Support case resolution",
      valueRouteLabel: "Capacity creation",
      metricLibraryRef: "metrics_library.customer_support.aggregate_outcomes",
      questionMetricBridge: bridge,
      selectedOutcomeMetricSelection: {
        metrics: [
          {
            id: "local_metric",
            name: unsafeTestTerm("alex", "@", "example", ".", "com select * from table"),
            valueRoute: "Capacity creation",
            sourceSystem: "Support case management system",
            measurementUnit: "hours",
            owner: "Customer data owner"
          }
        ]
      }
    });

    expect(spine.selectedMetricPosture.metricLabel).toBe(
      "Selected metric held for safe display review"
    );
  });

  it("uses the reporting-spine milestone schedule and keeps model posture held", () => {
    const spine = buildAiContributionReportingSpineViewModel({
      blueprintHypothesisRef: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
      workflowFunctionScope: "Customer Support case resolution",
      valueRouteLabel: "Capacity creation",
      metricLibraryRef: "metrics_library.customer_support.aggregate_outcomes",
      questionMetricBridge: bridge
    });

    expect(REQUIRED_CONTRIBUTION_REPORTING_MILESTONES.map((milestone) => milestone.key)).toEqual([
      "T0_baseline",
      "T30",
      "T60",
      "T90",
      "T120",
      "T180_6_month",
      "T270_9_month",
      "T365_12_month"
    ]);
    expect(spine.modelReviewInputPosture).toBe("MODEL_REVIEW_INPUT_HELD_FOR_EVIDENCE_GAPS");
    expect(spine.modelEligibilityStatus).toBe("HELD_FOR_EVIDENCE_GAPS");
    expect(spine.bayesianChainState.currentState).toBe(
      "HOLD_FOR_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE"
    );
    expect(spine.bayesianChainState.changedByThisSpine).toBe(false);
  });

  it("scrubs unsafe recommendation display text before it reaches UI surfaces", () => {
    const spine = buildAiContributionReportingSpineViewModel({
      blueprintHypothesisRef: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
      workflowFunctionScope: "Customer Support case resolution",
      valueRouteLabel: "Capacity creation",
      metricLibraryRef: unsafeTestTerm("source", "_", "ref", ".customer_metrics"),
      questionMetricBridge: {
        available: true,
        items: [
          {
            id: unsafeTestTerm("metric", "_", "id", ".", "raw", "_", "prompt"),
            metricName: unsafeTestTerm(
              "raw",
              " ",
              "prompt",
              " ",
              "produc",
              "tivity",
              " ",
              "score with ",
              "R",
              "OI ",
              "confi",
              "dence"
            ),
            valueRouteLabel: "Capacity creation",
            sourceSystem: unsafeTestTerm("select", " owner_email from table"),
            measurementUnit: "hours",
            owner: "Customer data owner",
            successMeasure: unsafeTestTerm(
              "employ",
              "ee",
              "_",
              "id",
              " ",
              "produc",
              "tivity",
              " score"
            )
          }
        ]
      }
    });

    expect(spine.candidateMetricRecommendations).toHaveLength(1);
    expect(spine.candidateMetricRecommendations[0]).toMatchObject({
      candidateMetricId: "candidate_aggregate_metric",
      metricLabel: "Candidate aggregate metric held for safe display review",
      sourceMetricLibraryRef: "Existing aggregate metric library",
      expectedSourceSystemPosture: "Customer-owned aggregate outcome source",
      rationale: "Candidate aggregate metric from the existing outcome metric bridge."
    });
    const recommendationPayload = JSON.stringify(spine.candidateMetricRecommendations);
    for (const term of [
      unsafeTestTerm("raw", " prompt"),
      unsafeTestTerm("raw", "_", "prompt"),
      unsafeTestTerm("produc", "tivity", " score"),
      unsafeTestTerm("R", "OI"),
      unsafeTestTerm("confi", "dence"),
      unsafeTestTerm("employ", "ee", "_", "id"),
      unsafeTestTerm("source", "_", "ref"),
      unsafeTestTerm("select", " owner_email from table")
    ]) {
      expect(recommendationPayload).not.toMatch(
        new RegExp(escapedTestPatternText(term), "i")
      );
    }
  });
});
