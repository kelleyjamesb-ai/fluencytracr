import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FluencyBaselineResultsPanel } from "./FluencyBaselineResultsPanel";
import * as aiValueApi from "../lib/aiValueApi";

const scores = (mean: number) => ({
  confidence: { mean },
  usage_quality: { mean: mean - 0.5 },
  behavior_change: { mean: mean - 1 },
  leadership_reinforcement: { mean: mean - 1.5 },
  capability_growth: { mean: mean - 0.25 }
});

const supportBaseline = {
  baseline_id: "fluency_baseline_customer_support_kickoff",
  cohorts: [
    {
      cohort_id: "cohort_support_agents",
      respondent_count: 300,
      construct_scores: scores(4)
    },
    { cohort_id: "cohort_knowledge_owners", respondent_count: 3, suppressed: true }
  ]
};

const salesBaseline = {
  baseline_id: "fluency_baseline_sales_kickoff",
  cohorts: [
    {
      cohort_id: "cohort_account_executives",
      respondent_count: 200,
      construct_scores: scores(4.5)
    }
  ]
};

const summaryOf = (payload: { baseline_id: string }) => ({
  object_type: "fluency_baseline",
  object_id: payload.baseline_id,
  schema_version: "FT_AI_VALUE_FLUENCY_BASELINE_2026_06",
  workflow_family: null,
  valid: true,
  validation: {},
  updated_at: "2026-06-11T00:00:00Z"
});

describe("FluencyBaselineResultsPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("aggregates stored baselines into percent results with privacy notes", async () => {
    vi.spyOn(aiValueApi, "listAiValueObjects").mockResolvedValue({
      objects: [summaryOf(supportBaseline), summaryOf(salesBaseline)]
    } as never);
    vi.spyOn(aiValueApi, "fetchAiValueObject").mockImplementation(
      async (_role, _type, objectId) =>
        ({
          ...summaryOf({ baseline_id: objectId }),
          payload: objectId.includes("sales") ? salesBaseline : supportBaseline
        }) as never
    );

    render(<FluencyBaselineResultsPanel />);

    await waitFor(() => expect(screen.getByText("average fluency")).toBeInTheDocument());

    // 500 responses across both functions; one small group withheld.
    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText(/1 small group withheld/i)).toBeInTheDocument();

    // Confidence is the strongest signal, leadership the growth edge.
    const strongest = screen.getByText("Strongest signal").parentElement;
    expect(strongest?.textContent).toContain("Confidence");
    const growth = screen.getByText("Growth edge").parentElement;
    expect(growth?.textContent).toContain("Leadership Reinforcement");

    // Per-dimension percent meters render (confidence weighted mean 4.2/5 = 84%).
    expect(
      screen.getByRole("meter", { name: /Confidence 84%/i })
    ).toBeInTheDocument();

    // Function breakdown shows both functions, highest first.
    expect(screen.getByText("Customer Support")).toBeInTheDocument();
    expect(screen.getByText("Sales")).toBeInTheDocument();
  });

  it("falls back to dimension definitions when no baselines are stored", async () => {
    vi.spyOn(aiValueApi, "listAiValueObjects").mockResolvedValue({ objects: [] } as never);

    render(<FluencyBaselineResultsPanel />);

    await waitFor(() =>
      expect(screen.getByText("How ready people feel to use AI in real work.")).toBeInTheDocument()
    );
    expect(screen.queryByText("average fluency")).not.toBeInTheDocument();
  });
});
