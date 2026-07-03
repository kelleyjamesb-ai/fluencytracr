import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ValueEvidenceCasePanel } from "./ValueEvidenceCasePanel";
import * as aiValueApi from "../lib/aiValueApi";

const SELECTED_OUTCOME_METRICS_KEY = "aiValue.selectedOutcomeMetrics";
const SELECTED_OUTCOME_METRIC_WATCH_PLAN_KEY = "aiValue.selectedOutcomeMetricWatchPlan";

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

const unsafeLanguageCase = {
  ...supportCase,
  value_evidence_case_id: "value_evidence_case_unsafe_language_v1",
  safe_value_language: {
    allowed_claim_level: "SUPPORTED_VALUE_MOVEMENT",
    allowed_phrases: [
      "ROI, return on investment, EBITDA, savings, cost reduction, revenue, headcount, productivity, efficiency, lift, confidence, probability, and causality language are ready."
    ],
    required_caveats: [
      "Financial impact, economic attribution, and causal proof are blocked.",
      "Not blocked: ROI proof and causal attribution are ready.",
      "This does not block ROI proof.",
      "No restriction applies to customer-facing economic claims.",
      "Cannot be interpreted as blocking causality proof."
    ]
  },
  claim_gates: [
    { claim: "individual_scoring", state: "UNLOCKED" },
    {
      claim: "unexpected_future_claim",
      state: "UNLOCKED",
      unlock_requirements:
        "Future ROI proof can use source_ref abc123, prompt transcript, confidence probability, and causal attribution."
    }
  ]
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
    expect(within(strategicChoice).getByText(/Recommended: Prepare caveated internal readout/i)).toBeInTheDocument();
    expect(
      within(strategicChoice).getByText(/Review directional value movement with caveats/i)
    ).toBeInTheDocument();
    expect(
      within(strategicChoice).getByText(/Keep stronger value language held/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Internal review can use a caveated value investigation for this workflow; customer-facing value language remains held."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("This does not prove ROI or causality.")).toBeInTheDocument();
    // Privacy boundaries render as permanent; value claims render as gates.
    expect(screen.getByText("Individual scoring")).toBeInTheDocument();
    expect(screen.getByText("ROI proof")).toBeInTheDocument();
    expect(screen.getAllByText("Blocked / review only").length).toBe(4);
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

    // Even validated source context stays review-only in the current product surface.
    expect(
      screen.getAllByText(/Stronger value language remains blocked until a promoted contract authorizes it/i).length
    ).toBeGreaterThan(0);
    const updatedStrategicChoice = screen.getByRole("region", { name: /Strategic value choice/i });
    expect(
      within(updatedStrategicChoice).getByText(/Recommended: Model internally/i)
    ).toBeInTheDocument();
    expect(
      within(updatedStrategicChoice).getByText(/not as a client-facing value claim/i)
    ).toBeInTheDocument();
    const claimGates = screen.getByRole("region", { name: /Evidence-gated claims/i });
    expect(within(claimGates).getAllByText("Blocked / review only")).toHaveLength(4);
    expect(within(claimGates).queryByText("Unlocked")).not.toBeInTheDocument();
    expect(within(claimGates).queryByText(/supports this claim/i)).not.toBeInTheDocument();
    expect(
      within(claimGates).getAllByText(
        /Later promotion required before this can become customer-facing value language/i
      )
    ).toHaveLength(4);
    expect(screen.getByText(/reviewed by Sales finance partner/i)).toBeInTheDocument();
  });

  it("replaces unsafe payload phrases before rendering safe language lists", async () => {
    vi.spyOn(aiValueApi, "listAiValueObjects").mockResolvedValue({
      objects: [summaryOf(unsafeLanguageCase)]
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
              ...summaryOf(unsafeLanguageCase),
              payload: unsafeLanguageCase
            }) as never
    );

    render(<ValueEvidenceCasePanel />);

    await waitFor(() =>
      expect(
        screen.getByText(/What can we safely say about this workflow/i)
      ).toBeInTheDocument()
    );

    const allowedLanguage = screen
      .getByRole("heading", { name: /What we can say now/i })
      .closest(".ai-value-case-language-col") as HTMLElement;
    const requiredCaveats = screen
      .getByRole("heading", { name: /Always said with/i })
      .closest(".ai-value-case-language-col") as HTMLElement;

    expect(allowedLanguage.textContent ?? "").not.toMatch(
      /\bROI\b|return on investment|EBITDA|savings|cost reduction|revenue|headcount|productivity|efficiency|lift|confidence|probability|causality|causal|financial impact|economic attribution|proof/i
    );
    expect(
      within(allowedLanguage).getByText(
        /Stronger value language remains blocked until a promoted contract authorizes it/i
      )
    ).toBeInTheDocument();
    expect(
      within(requiredCaveats).getByText(
        /Financial impact, economic attribution, and causal proof are blocked/i
      )
    ).toBeInTheDocument();
    expect(requiredCaveats.textContent ?? "").not.toMatch(
      /not blocked|does not block ROI proof|no restriction applies|cannot be interpreted as blocking|ROI proof|causal attribution|are ready/i
    );
    expect(
      within(requiredCaveats).getAllByText(
        /Stronger value language remains blocked until a promoted contract authorizes it/i
      )
    ).toHaveLength(4);

    const claimGates = screen.getByRole("region", { name: /Evidence-gated claims/i });
    expect(within(claimGates).getAllByText("Blocked / review only")).toHaveLength(2);
    expect(within(claimGates).queryByText("Available for review")).not.toBeInTheDocument();
    expect(claimGates.textContent).not.toMatch(/unexpected_future_claim/i);
    expect(claimGates.textContent).not.toMatch(
      /source_ref|prompt transcript|\bROI\b|confidence|probability|causal attribution|proof/i
    );
    expect(
      within(claimGates).getAllByText(
        /Later promotion required before this can become customer-facing value language/i
      )
    ).toHaveLength(2);
  });

  it("shows the held empty state when no case exists", async () => {
    vi.spyOn(aiValueApi, "listAiValueObjects").mockResolvedValue({ objects: [] } as never);

    render(<ValueEvidenceCasePanel />);

    await waitFor(() =>
      expect(screen.getByText(/No evidence case yet/i)).toBeInTheDocument()
    );
    const panel = screen.getByRole("region", { name: /Value evidence case/i });
    expect(panel).toHaveAttribute("aria-live", "polite");
    expect(within(panel).getByText(/Missing: an Evidence Checkpoint/i)).toBeInTheDocument();
    expect(within(panel).getByText(/Why: this case can support planning only/i)).toBeInTheDocument();
    expect(within(panel).getByText(/Next action: create an Evidence Checkpoint/i)).toBeInTheDocument();

    const intake = screen.getByRole("region", { name: /Metric evidence intake/i });
    expect(intake).toHaveAttribute("aria-live", "polite");
    expect(within(intake).getByText(/Add aggregate metric evidence/i)).toBeInTheDocument();
    const outcomeMetric = within(intake).getByLabelText(/Outcome metric/i);
    expect(outcomeMetric).toHaveValue("Median resolution time");
    expect(outcomeMetric).toHaveAttribute("aria-required", "true");
    expect(outcomeMetric).toHaveAttribute("aria-invalid", "false");
    expect(within(intake).getByLabelText(/Source system/i)).toHaveValue("Support case management system");
    const baselineValue = within(intake).getByLabelText(/Baseline value/i);
    expect(baselineValue).toHaveAttribute("aria-required", "true");
    expect(baselineValue).toHaveAttribute("aria-invalid", "true");
    expect(baselineValue).toHaveAccessibleDescription(/Required: add the aggregate baseline value/i);
    expect(within(intake).getByLabelText(/Current value/i)).toBeInTheDocument();
    expect(within(intake).getByLabelText(/Eligible population/i)).toBeInTheDocument();
    expect(within(intake).getByLabelText(/Evidence owner/i)).toBeInTheDocument();
    expect(within(intake).getByLabelText(/Import aggregate evidence file/i)).toBeInTheDocument();

    fireEvent.change(within(intake).getByLabelText(/Baseline value/i), {
      target: { value: "18.4" }
    });
    expect(baselineValue).toHaveAttribute("aria-invalid", "false");
    expect(baselineValue).not.toHaveAccessibleDescription(/Required: add the aggregate baseline value/i);
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

  it("lets the user choose which selected outcome metric to stage evidence for", async () => {
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
            sourceSystem: "GitHub review analytics",
            measurementUnit: "hours",
            owner: "Engineering Operations"
          },
          {
            id: "eng-deployment-frequency",
            name: "Deployment Frequency",
            valueRoute: "Acceleration",
            sourceSystem: "Deployment system",
            measurementUnit: "deployments",
            owner: "Platform Operations"
          }
        ]
      })
    );

    render(<ValueEvidenceCasePanel />);

    await waitFor(() =>
      expect(screen.getByText(/No evidence case yet/i)).toBeInTheDocument()
    );

    const intake = screen.getByRole("region", { name: /Metric evidence intake/i });
    const metricQueue = within(intake).getByRole("list", { name: /Selected metrics needing evidence/i });
    expect(within(metricQueue).getByRole("button", { name: /Lead Time for Changes/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(
      within(metricQueue).getByRole("button", { name: /Code Review Turnaround Time/i })
    ).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(within(metricQueue).getByRole("button", { name: /Code Review Turnaround Time/i }));

    expect(within(intake).getByLabelText("Outcome metric", { exact: true })).toHaveValue(
      "Code Review Turnaround Time"
    );
    expect(within(intake).getByLabelText("Source system", { exact: true })).toHaveValue(
      "GitHub review analytics"
    );
    expect(within(intake).getByLabelText("Measurement unit", { exact: true })).toHaveValue("hours");

    fireEvent.click(within(metricQueue).getByRole("button", { name: /Deployment Frequency/i }));

    expect(within(intake).getByLabelText("Outcome metric", { exact: true })).toHaveValue(
      "Deployment Frequency"
    );
    expect(within(intake).getByLabelText("Evidence owner", { exact: true })).toHaveValue(
      "Platform Operations"
    );
  });

  it("shows saved outcome metrics across functions when the watch plan has multiple selections", async () => {
    vi.spyOn(aiValueApi, "listAiValueObjects").mockResolvedValue({ objects: [] } as never);
    const engineeringSelection = {
      functionArea: "Engineering / Software Development",
      quadrantLabel: "High-fluency flow",
      vbdBaseline: "Velocity 88 · Breadth 86 · Depth 88",
      metrics: [
        {
          id: "eng-deployment-frequency",
          name: "Deployment Frequency",
          valueRoute: "Acceleration",
          sourceSystem: "CI/CD system",
          measurementUnit: "deployments per week",
          owner: "Engineering Operations"
        }
      ]
    };
    const dataSelection = {
      functionArea: "Data & Analytics",
      quadrantLabel: "Deep but slow",
      vbdBaseline: "Velocity 52 · Breadth 64 · Depth 81",
      metrics: [
        {
          id: "data-request-cycle-time",
          name: "Analytics request cycle time",
          valueRoute: "Acceleration",
          sourceSystem: "Analytics intake system",
          measurementUnit: "days",
          owner: "Data Operations"
        }
      ]
    };
    localStorage.setItem(SELECTED_OUTCOME_METRICS_KEY, JSON.stringify(engineeringSelection));
    localStorage.setItem(
      SELECTED_OUTCOME_METRIC_WATCH_PLAN_KEY,
      JSON.stringify({
        activeFunctionArea: engineeringSelection.functionArea,
        selectionsByFunction: {
          [engineeringSelection.functionArea]: engineeringSelection,
          [dataSelection.functionArea]: dataSelection
        }
      })
    );

    render(<ValueEvidenceCasePanel />);

    await waitFor(() =>
      expect(screen.getByText(/No evidence case yet/i)).toBeInTheDocument()
    );

    const intake = screen.getByRole("region", { name: /Metric evidence intake/i });
    expect(within(intake).getByText(/2 outcome metrics selected across 2 functions/i)).toBeInTheDocument();
    const metricQueue = within(intake).getByRole("list", { name: /Selected metrics needing evidence/i });
    expect(within(metricQueue).getByRole("button", { name: /Deployment Frequency/i })).toBeInTheDocument();
    expect(
      within(metricQueue).getByRole("button", { name: /Analytics request cycle time/i })
    ).toBeInTheDocument();

    fireEvent.click(within(metricQueue).getByRole("button", { name: /Analytics request cycle time/i }));

    expect(within(intake).getByText("Data & Analytics")).toBeInTheDocument();
    expect(within(intake).getByLabelText("Outcome metric", { exact: true })).toHaveValue(
      "Analytics request cycle time"
    );
    expect(within(intake).getByLabelText("Source system", { exact: true })).toHaveValue(
      "Analytics intake system"
    );
    expect(within(intake).getByLabelText("Evidence owner", { exact: true })).toHaveValue(
      "Data Operations"
    );
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
