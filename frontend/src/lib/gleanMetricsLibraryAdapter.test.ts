import { describe, expect, it } from "vitest";

import {
  CORE_BEHAVIORAL_MIN_COHORT,
  CUSTOMER_VISIBLE_SERIES_MIN_COHORT,
  gleanMetricRegistry,
  gleanMetricsLibrarySeedCoverage,
  matchHypothesisToGleanWorkflows,
  workflowArchetypes
} from "./gleanMetricsLibraryAdapter";

describe("Glean Metrics Library adapter", () => {
  it("maps an IT hypothesis to incident resolution and aggregate customer-owned metrics", () => {
    const result = matchHypothesisToGleanWorkflows(
      "Faster verified knowledge retrieval for IT incidents will reduce mean time to resolution."
    );

    expect(result.candidates.map((candidate) => candidate.id)).toEqual([
      "it-incident-resolution",
      "it-knowledge-retrieval"
    ]);
    expect(result.candidates[0].metrics.map((metric) => metric.name)).toEqual([
      "Mean time to resolution",
      "First-contact resolution rate",
      "Ticket aging"
    ]);
    expect(result.elements).toMatchObject({
      function: "Information Technology",
      businessObject: "incidents",
      expectedChange: "faster",
      metricIntent: "mean time to resolution"
    });
  });

  it("maps a Customer Success hypothesis to QBR preparation and supporting context workflows", () => {
    const result = matchHypothesisToGleanWorkflows(
      "Customer Success will assemble account context faster to reduce QBR preparation time and improve follow-up."
    );

    expect(result.candidates[0].id).toBe("cs-qbr-preparation");
    expect(result.candidates.map((candidate) => candidate.id)).toContain("cs-account-context");
    expect(result.candidates[0].metrics.map((metric) => metric.name)).toContain(
      "QBR preparation time"
    );
  });

  it.each([
    "Make work better with AI.",
    "Improve our business case with AI.",
    "Improve account performance with AI.",
    "Audit tickets faster.",
    "Incidents",
    "Make it faster to resolve tickets.",
    "IT will improve the business case faster.",
    "Customer Success should account for tickets faster.",
    "IT incidents",
    "Customer Success QBRs"
  ])("fails closed for generic or under-specified hypothesis: %s", (hypothesis) => {
    expect(matchHypothesisToGleanWorkflows(hypothesis).candidates).toEqual([]);
  });

  it.each([
    "Customer Success incident resolution",
    "IT account context faster",
    "IT QBR preparation time",
    "Finance will reduce QBR preparation time.",
    "Sales will reduce mean time to resolution for incidents.",
    "Customer Success and IT will reduce QBR preparation time.",
    "Customer Success will reduce IT tickets faster.",
    "Sales and IT will reduce ticket resolution time.",
    "Finance and Customer Success will reduce QBR preparation time.",
    "Customer Success and Operations will prepare QBRs faster.",
    "Operations and IT will resolve incidents faster.",
    "IT incidents must not resolve faster.",
    "Customer Success must not reduce QBR preparation time.",
    "IT incidents will increase mean time to resolution.",
    "Customer Success QBR preparation will become slower.",
    "Business Operations with IT will resolve incidents faster.",
    "Customer Success and Business Operations will prepare QBRs faster.",
    "IT and Customer Support will resolve incidents faster.",
    "Customer Success and UX Research will prepare QBRs faster.",
    "IT incidents will increase MTTR.",
    "IT will increase ticket aging for incidents.",
    "IT will reduce first contact resolution for incidents.",
    "IT will lower knowledge effectiveness for documentation.",
    "Customer Success will reduce follow up completion for QBRs.",
    "Customer Success will avoid reducing QBR preparation time.",
    "IT incidents will hardly resolve faster.",
    "IT incidents will see no reduction in MTTR.",
    "IT incidents without reduced MTTR.",
    "IT incidents fail to reduce MTTR.",
    "IT incidents cannot resolve faster.",
    "IT incidents won’t resolve faster.",
    "Customer Success can’t reduce QBR preparation time.",
    "IT incidents will increase incident resolution time.",
    "Customer Success will increase average QBR preparation time.",
    "IT incidents will lower verified first contact resolution.",
    "Customer Success QBR follow-up completion will decline.",
    "IT incidents will reduce neither mean time to resolution nor ticket aging.",
    "IT incidents will be prevented from resolving faster.",
    "IT incidents will resolve faster except when unsafe.",
    "Customer Success will reduce QBR preparation time unless quality declines."
  ])("fails closed when an explicit function conflicts with the business object: %s", (hypothesis) => {
    expect(matchHypothesisToGleanWorkflows(hypothesis).candidates).toEqual([]);
  });

  it("supports bounded common inflections without broad stemming", () => {
    expect(
      matchHypothesisToGleanWorkflows("Customer Success prepares QBRs faster").candidates[0]?.id
    ).toBe("cs-qbr-preparation");
    expect(
      matchHypothesisToGleanWorkflows("IT resolves service requests faster").candidates[0]?.id
    ).toBe("it-incident-resolution");
    expect(
      matchHypothesisToGleanWorkflows("Customer Success assembles customer accounts faster").candidates[0]?.id
    ).toBe("cs-account-context");
    expect(
      matchHypothesisToGleanWorkflows(
        "Customer Success will reduce account research time for customer accounts"
      ).candidates[0]?.id
    ).toBe("cs-account-context");
    expect(
      matchHypothesisToGleanWorkflows("Customer Success will complete action items faster").candidates[0]?.id
    ).toBe("cs-qbr-follow-up");
  });

  it("keeps the adapter aggregate-only and the customer-visible series floor explicit", () => {
    expect(workflowArchetypes).toHaveLength(13);
    expect(CORE_BEHAVIORAL_MIN_COHORT).toBe(5);
    expect(CUSTOMER_VISIBLE_SERIES_MIN_COHORT).toBe(10);
    expect(gleanMetricsLibrarySeedCoverage).toMatchObject({
      status: "illustrative_seed",
      functionAreas: ["Information Technology", "Customer Success"]
    });
    expect(gleanMetricRegistry.length).toBeGreaterThan(0);
    for (const metric of gleanMetricRegistry) {
      expect(metric.grain).toBe("aggregate_workflow_or_cohort");
      expect(metric.customerDefinitionRequired).toBe(true);
      expect(metric.name).not.toMatch(/individual|employee|agent productivity|ranking/i);
    }
  });
});
