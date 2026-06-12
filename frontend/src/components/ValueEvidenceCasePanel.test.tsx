import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ValueEvidenceCasePanel } from "./ValueEvidenceCasePanel";
import * as aiValueApi from "../lib/aiValueApi";

const SELECTED_OUTCOME_METRICS_KEY = "aiValue.selectedOutcomeMetrics";

const supportCase = {
  value_evidence_case_id: "value_evidence_case_customer_support_case_resolution_v1",
  client_context: {
    engagement_label: "Northstar Enterprise Customer Support value engagement",
    function_area: "Customer Support",
    sponsor_role: "customer_support_business_sponsor"
  },
  workflow: {
    workflow_name: "Support case resolution",
    workflow_family: "customer_support_case_resolution",
    function_area: "Customer Support"
  },
  source_refs: {
    outcome_export_id: "outcome_export_support_v1"
  },
  vbd_summary: {
    velocity: { status: "STALLING" },
    breadth: { status: "LIMITED" },
    depth: { status: "SHALLOW" }
  },
  outcome_metric: {
    metric_id: "support_median_resolution_hours",
    metric_name: "Median resolution time",
    measurement_unit: "hours",
    source_system: "Support case management system",
    expected_direction: "REDUCE"
  },
  outcome_evidence_status: { review_state: "ACCEPTED", statement: "Accepted." },
  baseline_comparison: {
    baseline_window: "2026-02-01_to_2026-03-31",
    comparison_window: "2026-04-01_to_2026-05-31"
  },
  customer_owned_assumptions: [
    { assumption_id: "volume_context", state: "CAVEATED", owner: "support_operations" }
  ],
  evidence_quality: { evidence_level: "CAVEATED", rationale: "Open assumptions." },
  safe_value_language: {
    allowed_claim_level: "CAVEATED_VALUE_INVESTIGATION",
    allowed_phrases: [
      "Customer-owned outcome evidence supports a caveated value investigation for this workflow slice."
    ],
    required_caveats: ["This does not prove ROI or causality."]
  },
  blocked_claims: [
    "individual_scoring",
    "team_or_manager_ranking",
    "hr_analytics",
    "productivity_measurement",
    "roi_proof",
    "realized_roi_calculation",
    "customer_facing_economic_output",
    "causality_claim"
  ],
  claim_gates: [
    { claim: "roi_proof", state: "LOCKED" },
    { claim: "realized_roi_calculation", state: "LOCKED" },
    { claim: "customer_facing_economic_output", state: "LOCKED" },
    { claim: "causality_claim", state: "LOCKED" }
  ],
  sponsor_decision: {
    decision_state: "STRENGTHEN_EVIDENCE",
    decision_owner_role: "customer_support_business_sponsor",
    decision_basis: "Resolve assumptions."
  },
  intervention_retest: {
    next_action: "Resolve the staffing and volume assumptions, then retest.",
    retest_window_label: "30-45 days after intervention",
    retest_measurement_plan: "Recheck the same workflow slice."
  }
};

const salesCase = {
  ...supportCase,
  value_evidence_case_id: "value_evidence_case_sales_proposal_response_v1",
  client_context: {
    engagement_label: "Northstar Enterprise Sales value engagement",
    function_area: "Sales",
    sponsor_role: "sales_business_sponsor"
  },
  workflow: {
    workflow_name: "Sales proposal and RFP response",
    workflow_family: "sales_proposal_response",
    function_area: "Sales"
  },
  outcome_metric: {
    metric_name: "Proposal turnaround time",
    measurement_unit: "days",
    source_system: "CRM and proposal workspace",
    expected_direction: "REDUCE"
  },
  customer_owned_assumptions: [
    { assumption_id: "deal_mix_stability", state: "PRESENT", owner: "revenue_operations" }
  ],
  evidence_quality: { evidence_level: "STRONG", rationale: "Validated." },
  safe_value_language: {
    allowed_claim_level: "VALIDATED_VALUE_REALIZATION",
    allowed_phrases: [
      "Customer-validated realized value is supportable for this workflow slice."
    ],
    required_caveats: [
      "Realized-value figures are customer-computed and customer-approved; this does not prove causality."
    ]
  },
  blocked_claims: [
    "individual_scoring",
    "team_or_manager_ranking",
    "hr_analytics",
    "productivity_measurement",
    "causality_claim"
  ],
  claim_gates: [
    { claim: "roi_proof", state: "UNLOCKED" },
    { claim: "realized_roi_calculation", state: "UNLOCKED" },
    { claim: "customer_facing_economic_output", state: "UNLOCKED" },
    { claim: "causality_claim", state: "LOCKED" }
  ],
  customer_validation: {
    approved_by_role: "sales_finance_partner",
    validation_reference: "fy26_q2_memo"
  }
};

const supportOutcomeExport = {
  export_id: "outcome_export_support_v1",
  source_system: {
    source_name: "Support case management system",
    approved_grain: "aggregate_workflow_window"
  },
  windows: {
    baseline: "2026-02-01_to_2026-03-31",
    comparison: "2026-04-01_to_2026-05-31"
  },
  metrics: [
    {
      metric_id: "support_median_resolution_hours",
      measurement_unit: "hours",
      baseline_value: 18.4,
      comparison_value: 15.1,
      eligible_population: 2300
    },
    {
      metric_id: "support_backlog_count",
      measurement_unit: "cases",
      baseline_value: 1240,
      comparison_value: 1102,
      eligible_population: 2300
    }
  ]
};

const summaryOf = (payload: typeof supportCase) => ({
  object_type: "value_evidence_case",
  object_id: payload.value_evidence_case_id,
  schema_version: "FT_AI_VALUE_EVIDENCE_CASE_2026_06",
  workflow_family: payload.workflow.workflow_family,
  valid: true,
  validation: {},
  updated_at: "2026-06-11T00:00:00Z"
});

describe("ValueEvidenceCasePanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("renders the evidence ladder and safe language for the seeded cases", async () => {
    vi.spyOn(aiValueApi, "listAiValueObjects").mockResolvedValue({
      objects: [summaryOf(supportCase), summaryOf(salesCase)]
    } as never);
    vi.spyOn(aiValueApi, "fetchAiValueObject").mockImplementation(
      async (_role, _type, objectId) =>
        _type === "outcome_evidence_export"
          ? ({
              object_type: "outcome_evidence_export",
              object_id: objectId,
              schema_version: "FT_AI_VALUE_OUTCOME_EVIDENCE_EXPORT_2026_06",
              workflow_family: null,
              valid: true,
              validation: {},
              updated_at: "2026-06-11T00:00:00Z",
              payload: supportOutcomeExport
            } as never)
          : ({
              ...summaryOf(objectId.includes("sales") ? salesCase : supportCase),
              payload: objectId.includes("sales") ? salesCase : supportCase
            }) as never
    );

    render(<ValueEvidenceCasePanel />);

    await waitFor(() =>
      expect(
        screen.getByText(/What can we safely say about this workflow/i)
      ).toBeInTheDocument()
    );

    // Customer Support sorts first; its caveated rung is current.
    expect(screen.getByText("Support case resolution")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Data outputs on file/i })).toBeInTheDocument();
    expect(screen.getByText("18.4 hours")).toBeInTheDocument();
    expect(screen.getByText("15.1 hours")).toBeInTheDocument();
    expect(screen.getByText(/3.3 hours lower/i)).toBeInTheDocument();
    expect(screen.getByText(/2,300 aggregate records/i)).toBeInTheDocument();
    expect(screen.getByText(/1 more aggregate metric on file/i)).toBeInTheDocument();
    const strategicChoice = screen.getByRole("region", { name: /Strategic value choice/i });
    expect(
      within(strategicChoice).getByRole("heading", { name: /What should the client do next/i })
    ).toBeInTheDocument();
    expect(within(strategicChoice).getByText(/Recommended: Use caveated executive readout/i)).toBeInTheDocument();
    expect(
      within(strategicChoice).getByText(/Share directional value movement with caveats/i)
    ).toBeInTheDocument();
    expect(
      within(strategicChoice).getByText(/Do not present realized ROI yet/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText("We can present a caveated value investigation for this workflow.")
    ).toBeInTheDocument();
    expect(screen.getByText("This does not prove ROI or causality.")).toBeInTheDocument();
    // Privacy boundaries render as permanent; value claims render as gates.
    expect(screen.getByText("Individual scoring")).toBeInTheDocument();
    expect(screen.getByText("ROI proof")).toBeInTheDocument();
    expect(screen.getAllByText("Locked").length).toBe(4);
    // No internal tokens leak to the client.
    expect(screen.queryByText("CAVEATED_VALUE_INVESTIGATION")).not.toBeInTheDocument();
    expect(screen.queryByText("customer_support_case_resolution")).not.toBeInTheDocument();

    // Switching functions swaps the case detail.
    fireEvent.click(screen.getByRole("tab", { name: /Sales/i }));
    await waitFor(() =>
      expect(screen.getByText("Sales proposal and RFP response")).toBeInTheDocument()
    );
    expect(screen.getByText("Sales proposal and RFP response")).toBeInTheDocument();
    expect(screen.getByText("Proposal turnaround time")).toBeInTheDocument();

    // The validated case unlocks ROI-family gates while causality stays locked.
    expect(
      screen.getAllByText(/customer-validated realized value/i).length
    ).toBeGreaterThan(0);
    const updatedStrategicChoice = screen.getByRole("region", { name: /Strategic value choice/i });
    expect(
      within(updatedStrategicChoice).getByText(/Recommended: Use validated value story/i)
    ).toBeInTheDocument();
    expect(
      within(updatedStrategicChoice).getByText(/Keep causality blocked unless the evidence design supports it/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText("Unlocked").length).toBe(3);
    expect(screen.getAllByText("Locked").length).toBe(1);
    expect(screen.getByText(/approved by Sales finance partner/i)).toBeInTheDocument();
  });

  it("shows the held empty state when no case exists", async () => {
    vi.spyOn(aiValueApi, "listAiValueObjects").mockResolvedValue({ objects: [] } as never);

    render(<ValueEvidenceCasePanel />);

    await waitFor(() =>
      expect(screen.getByText(/No evidence case yet/i)).toBeInTheDocument()
    );

    const intake = screen.getByRole("region", { name: /Metric evidence intake/i });
    expect(within(intake).getByText(/Add aggregate metric evidence/i)).toBeInTheDocument();
    expect(within(intake).getByLabelText(/Outcome metric/i)).toHaveValue("Median resolution time");
    expect(within(intake).getByLabelText(/Source system/i)).toHaveValue("Support case management system");
    expect(within(intake).getByLabelText(/Baseline value/i)).toBeInTheDocument();
    expect(within(intake).getByLabelText(/Current value/i)).toBeInTheDocument();
    expect(within(intake).getByLabelText(/Eligible population/i)).toBeInTheDocument();
    expect(within(intake).getByLabelText(/Evidence owner/i)).toBeInTheDocument();
    expect(within(intake).getByLabelText(/Import aggregate evidence file/i)).toBeInTheDocument();

    fireEvent.change(within(intake).getByLabelText(/Baseline value/i), {
      target: { value: "18.4" }
    });
    fireEvent.change(within(intake).getByLabelText(/Current value/i), {
      target: { value: "15.1" }
    });
    fireEvent.change(within(intake).getByLabelText(/Eligible population/i), {
      target: { value: "2300" }
    });

    expect(within(intake).getByText(/Evidence staged locally/i)).toBeInTheDocument();
    expect(within(intake).getByText(/18.4 to 15.1 hours/i)).toBeInTheDocument();
    expect(within(intake).getByText(/No person-level rows, names, or manager rankings/i)).toBeInTheDocument();
  });

  it("starts the intake from the outcome metrics selected by the user", async () => {
    vi.spyOn(aiValueApi, "listAiValueObjects").mockResolvedValue({ objects: [] } as never);
    localStorage.setItem(
      SELECTED_OUTCOME_METRICS_KEY,
      JSON.stringify({
        functionArea: "Engineering / Software Development",
        quadrantLabel: "High-fluency flow",
        vbdBaseline: "Velocity 88 · Breadth 86 · Depth 88",
        metrics: [
          {
            id: "eng-lead-time-for-changes",
            name: "Lead Time for Changes",
            valueRoute: "Acceleration",
            sourceSystem: "Version control and deployment systems",
            measurementUnit: "days",
            owner: "Engineering Operations"
          },
          {
            id: "eng-code-review-turnaround",
            name: "Code Review Turnaround Time",
            valueRoute: "Acceleration",
            sourceSystem: "GitHub or GitLab review analytics",
            measurementUnit: "hours",
            owner: "Engineering Operations"
          }
        ]
      })
    );

    render(<ValueEvidenceCasePanel />);

    await waitFor(() =>
      expect(screen.getByText(/No evidence case yet/i)).toBeInTheDocument()
    );

    const intake = screen.getByRole("region", { name: /Metric evidence intake/i });
    expect(within(intake).getByText(/Selected on Outcome Metrics/i)).toBeInTheDocument();
    expect(within(intake).getByText("Engineering / Software Development")).toBeInTheDocument();
    expect(within(intake).getByText(/2 outcome metrics selected/i)).toBeInTheDocument();
    expect(within(intake).getByLabelText("Outcome metric", { exact: true })).toHaveValue("Lead Time for Changes");
    expect(within(intake).getByLabelText("Source system", { exact: true })).toHaveValue(
      "Version control and deployment systems"
    );
    expect(within(intake).getByLabelText("Measurement unit", { exact: true })).toHaveValue("days");
    expect(within(intake).getByLabelText("Evidence owner", { exact: true })).toHaveValue("Engineering Operations");
    expect(within(intake).getByText("Code Review Turnaround Time")).toBeInTheDocument();
  });

  it("keeps metric evidence intake available when case records are unavailable", async () => {
    vi.spyOn(aiValueApi, "listAiValueObjects").mockRejectedValue(new Error("offline"));
    localStorage.setItem(
      SELECTED_OUTCOME_METRICS_KEY,
      JSON.stringify({
        functionArea: "Engineering / Software Development",
        quadrantLabel: "High-fluency flow",
        vbdBaseline: "Velocity 88 · Breadth 86 · Depth 88",
        metrics: [
          {
            id: "eng-deployment-frequency",
            name: "Deployment Frequency",
            valueRoute: "Acceleration",
            sourceSystem: "Version control and deployment systems",
            measurementUnit: "deployments",
            owner: "Engineering Operations"
          }
        ]
      })
    );

    render(<ValueEvidenceCasePanel />);

    await waitFor(() =>
      expect(screen.getByText(/Evidence case not connected yet/i)).toBeInTheDocument()
    );

    expect(
      screen.getByText(/Case records are unavailable in this local session/i)
    ).toBeInTheDocument();
    const intake = screen.getByRole("region", { name: /Metric evidence intake/i });
    expect(within(intake).getByText(/Selected on Outcome Metrics/i)).toBeInTheDocument();
    expect(within(intake).getByText("Engineering / Software Development")).toBeInTheDocument();
    expect(within(intake).getByLabelText("Outcome metric", { exact: true })).toHaveValue(
      "Deployment Frequency"
    );
  });

  it("preserves blocked value warnings for legacy cases without claim gates", async () => {
    const legacyCase = {
      ...supportCase,
      claim_gates: undefined
    };
    vi.spyOn(aiValueApi, "listAiValueObjects").mockResolvedValue({
      objects: [summaryOf(legacyCase)]
    } as never);
    vi.spyOn(aiValueApi, "fetchAiValueObject").mockResolvedValue({
      ...summaryOf(legacyCase),
      payload: legacyCase
    } as never);

    render(<ValueEvidenceCasePanel />);

    await waitFor(() =>
      expect(screen.getByText(/What can we safely say about this workflow/i)).toBeInTheDocument()
    );

    expect(screen.getByText("ROI proof")).toBeInTheDocument();
    expect(screen.getByText("Customer-facing dollar figures")).toBeInTheDocument();
    expect(screen.getByText("Causality claims")).toBeInTheDocument();
    expect(screen.queryByLabelText("Evidence-gated claims")).not.toBeInTheDocument();
  });
});
