import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  buildAiContributionReportingSpineViewModel,
  applyReviewerMetricSelectionDraftIntake
} from "../lib/aiValueContributionReportingSpine";
import { buildAiValueUiViewModelAdapter } from "../lib/aiValueUiViewModelAdapter";
import {
  AiContributionReportingSpinePanel,
  AiValueUiViewModelPanel
} from "./AiContributionReportingSpinePanel";

const unsafeUiPattern =
  /confidence|probability|\bROI\b|productivity|causality|cause[- ]and[- ]effect|posterior|success|failure|proof|source[-_ ]ref|source[-_ ]hash|reviewer[-_ ]owned payload|raw .*payload|select\s+\*\s+from|employee_id|prompt|transcript|[a-f0-9]{64}/i;

function stateModel(stateId = "NO_BLUEPRINT", overrides = {}) {
  return {
    measurement_journey_state: {
      state_id: stateId,
      status_label: "Internal source status",
      plain_language_description: "Internal source description",
      next_action: "internal_next_action",
      user_should_do_next: "Internal source next step"
    },
    model_review_posture: "BLOCKED_UNTIL_GOVERNED_DIAGNOSTICS_EVIDENCE",
    creates_evidence: false,
    diagnostics_evidence_satisfied: false,
    bayesian_readiness_authorized: false,
    promotion_authorized: false,
    posterior_interpretation_authorized: false,
    confidence_probability_authorized: false,
    customer_economic_output_authorized: false,
    blocked_outputs: {
      confidence_output: false,
      probability_output: false,
      roi_output: false,
      productivity_output: false,
      causality_output: false,
      export_creation: false,
      persistence_write: false
    },
    feeds: {
      governed_diagnostics_sufficiency_evidence_source: false,
      bayesian_promotion_decision_gate: false,
      route_or_ui_creation: false,
      schema_persistence_or_export_creation: false
    },
    ...overrides
  };
}

describe("AiContributionReportingSpinePanel adapter integration", () => {
  it("renders adapter-safe default held state without exposing hidden sections or unsafe terms", () => {
    render(
      <AiContributionReportingSpinePanel
        spine={buildAiContributionReportingSpineViewModel({})}
      />
    );

    const uiView = screen.getByRole("region", {
      name: /AI value UI view model/i
    });
    expect(
      within(uiView).getByRole("heading", { name: /Blueprint Needed/i })
    ).toBeInTheDocument();
    expect(within(uiView).getByText(/Step 1 of 13/i)).toBeInTheDocument();
    expect(within(uiView).getByText(/Model review blocked/i)).toBeInTheDocument();
    expect(
      within(uiView).getByText(/Supply the Blueprint hypothesis/i)
    ).toBeInTheDocument();
    expect(within(uiView).queryByText(/Metric options visible/i)).not.toBeInTheDocument();
    expect(within(uiView).queryByText(/Measurement plan visible/i)).not.toBeInTheDocument();
    expect(uiView.textContent).not.toMatch(unsafeUiPattern);
  });

  it("uses the adapter state for metric recommendation and local draft posture without approving evidence", () => {
    const spine = buildAiContributionReportingSpineViewModel({
      blueprintHypothesisRef: "blueprint_hypothesis.support_resolution",
      metricLibraryRef: "metrics_library.support_resolution",
      workflowFunctionScope: "Support case resolution",
      valueRouteLabel: "Capacity creation",
      questionMetricBridge: {
        available: true,
        items: [
          {
            id: "median_resolution_time",
            metricName: "Median resolution time",
            valueRouteLabel: "Capacity creation",
            sourceSystem: "Customer-owned aggregate outcome source",
            measurementUnit: "hours",
            owner: "Support operations",
            successMeasure: "Track aggregate movement across approved milestone windows."
          }
        ]
      }
    });

    const { rerender } = render(<AiContributionReportingSpinePanel spine={spine} />);
    const recommendedUiView = screen.getByRole("region", {
      name: /AI value UI view model/i
    });
    expect(
      within(recommendedUiView).getByRole("heading", { name: /Metrics Recommended/i })
    ).toBeInTheDocument();
    expect(within(recommendedUiView).getByText(/Step 3 of 13/i)).toBeInTheDocument();
    expect(
      within(recommendedUiView).getByText(/Candidate aggregate metrics are available as planning inputs only/i)
    ).toBeInTheDocument();
    expect(
      within(recommendedUiView).queryByText(/Evidence streams for review/i)
    ).not.toBeInTheDocument();
    expect(
      within(recommendedUiView).queryByText(/AI Fluency Instrument \(SED\)/i)
    ).not.toBeInTheDocument();

    const draftSpine = applyReviewerMetricSelectionDraftIntake(spine, {
      functionArea: "Customer Support",
      metrics: [
        {
          id: "median_resolution_time",
          name: "Median resolution time",
          valueRoute: "Capacity creation",
          sourceSystem: "Customer-owned aggregate outcome source",
          measurementUnit: "hours",
          owner: "Support operations"
        }
      ]
    });
    rerender(<AiContributionReportingSpinePanel spine={draftSpine} />);

    const draftedUiView = screen.getByRole("region", {
      name: /AI value UI view model/i
    });
    expect(
      within(draftedUiView).getByRole("heading", {
        name: /Measurement Plan Drafted/i
      })
    ).toBeInTheDocument();
    expect(within(draftedUiView).getByText(/Step 4 of 13/i)).toBeInTheDocument();
    expect(
      within(draftedUiView).getAllByText(/reviewer approval/i).length
    ).toBeGreaterThan(0);
    expect(
      within(draftedUiView).queryByText(/Evidence streams for review/i)
    ).not.toBeInTheDocument();
    expect(draftedUiView.textContent).not.toMatch(/approved=true|evidence satisfied/i);
    expect(draftedUiView.textContent).not.toMatch(unsafeUiPattern);
  });

  it("renders the supplied adapter view model instead of recomputing state in the panel", () => {
    const spine = buildAiContributionReportingSpineViewModel({
      blueprintHypothesisRef: "blueprint_hypothesis.support_resolution",
      metricLibraryRef: "metrics_library.support_resolution",
      workflowFunctionScope: "Support case resolution",
      valueRouteLabel: "Capacity creation",
      questionMetricBridge: {
        available: true,
        items: [
          {
            id: "median_resolution_time",
            metricName: "Median resolution time",
            valueRouteLabel: "Capacity creation",
            sourceSystem: "Customer-owned aggregate outcome source",
            measurementUnit: "hours",
            owner: "Support operations",
            successMeasure: "Track aggregate movement across approved milestone windows."
          }
        ]
      },
      selectedOutcomeMetricSelection: {
        metrics: [
          {
            id: "median_resolution_time",
            name: "Median resolution time",
            valueRoute: "Capacity creation",
            sourceSystem: "Customer-owned aggregate outcome source",
            measurementUnit: "hours",
            owner: "Support operations"
          }
        ]
      }
    });
    const adapterOverride = buildAiValueUiViewModelAdapter({
      measurementJourneyStateModel: stateModel("MODEL_REVIEW_BLOCKED")
    });

    render(
      <AiContributionReportingSpinePanel
        spine={{
          ...spine,
          uiViewModel: adapterOverride
        }}
      />
    );

    const uiView = screen.getByRole("region", {
      name: /AI value UI view model/i
    });
    expect(
      within(uiView).getByRole("heading", { name: /Model Review Blocked/i })
    ).toBeInTheDocument();
    expect(within(uiView).getByText(/Step 13 of 13/i)).toBeInTheDocument();
    expect(uiView.textContent).not.toMatch(unsafeUiPattern);
  });

  it("renders aligned, divergent, partial, and held alignment language without overinterpretation", () => {
    for (const [stateId, label] of [
      ["EVIDENCE_ALIGNMENT_ALIGNED", "Evidence Aligned for Review"],
      ["EVIDENCE_ALIGNMENT_DIVERGENT", "Evidence Divergent for Review"],
      ["EVIDENCE_ALIGNMENT_PARTIAL", "Evidence Partially Aligned"],
      ["EVIDENCE_ALIGNMENT_HELD", "Evidence Alignment Held"]
    ]) {
      const { unmount } = render(
        <AiValueUiViewModelPanel
          viewModel={buildAiValueUiViewModelAdapter({
            measurementJourneyStateModel: stateModel(stateId)
          })}
        />
      );

      const uiView = screen.getByRole("region", {
        name: /AI value UI view model/i
      });
      expect(
        within(uiView).getByRole("heading", { name: label })
      ).toBeInTheDocument();
      expect(
        within(uiView).getAllByText(/Model review blocked/i).length
      ).toBeGreaterThan(0);
      expect(uiView.textContent).not.toMatch(unsafeUiPattern);
      unmount();
    }
  });

  it("renders missing, held, and suppressed requirement labels from the adapter only", () => {
    render(
      <AiValueUiViewModelPanel
        viewModel={buildAiValueUiViewModelAdapter({
          measurementJourneyStateModel: stateModel("EVIDENCE_ALIGNMENT_HELD"),
          upstreamPosture: {
            missing_requirements: [
              "Missing aggregate outcome window",
              "source_ref.internal.secret",
              "a".repeat(64)
            ],
            held_requirements: ["Held for reviewed aggregate inputs"],
            suppressed_requirements: ["Suppressed milestone window"]
          }
        })}
      />
    );

    const uiView = screen.getByRole("region", {
      name: /AI value UI view model/i
    });
    expect(
      within(uiView).getByText(/Missing aggregate outcome window/i)
    ).toBeInTheDocument();
    expect(
      within(uiView).getByText(/Held for reviewed aggregate inputs/i)
    ).toBeInTheDocument();
    expect(within(uiView).getByText(/Suppressed milestone window/i)).toBeInTheDocument();
    expect(within(uiView).queryByText(/source_ref/i)).not.toBeInTheDocument();
    expect(uiView.textContent).not.toMatch(/[a-f0-9]{64}/i);
  });
});
