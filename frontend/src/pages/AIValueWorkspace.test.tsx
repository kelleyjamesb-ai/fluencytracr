import { readFileSync } from "node:fs";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AIValueWorkspace } from "./AIValueWorkspace";
import {
  ACTIVE_AI_VALUE_BLUEPRINT_ID_KEY,
  ACTIVE_AI_VALUE_ENGAGEMENT_ID_KEY
} from "../lib/aiValueApi";

const uiTerm = (...parts: string[]) => parts.join("");
const SELECTED_OUTCOME_METRICS_KEY = "aiValue.selectedOutcomeMetrics";
const SELECTED_OUTCOME_METRIC_WATCH_PLAN_KEY = "aiValue.selectedOutcomeMetricWatchPlan";
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const workspaceCss = readFileSync(`${process.cwd()}/src/styles.css`, "utf8");
const workspaceSource = readFileSync(`${process.cwd()}/src/pages/AIValueWorkspace.tsx`, "utf8");
const cssHasDeclaration = (selector: string, declaration: string) => {
  const rules = workspaceCss.matchAll(/([^{}]+)\{([^{}]+)\}/g);
  return Array.from(rules).some(([, selectors, body]) =>
    selectors
      .split(",")
      .map((item) => item.trim())
      .includes(selector) && body.includes(declaration)
  );
};
const expectNoUnsafeUiLanguage = (
  text: string | null | undefined,
  extraTerms: string[] = []
) => {
  const terms = [
    uiTerm("workflow", "_", "state"),
    uiTerm("metric", "_", "state"),
    uiTerm("claim", " ", "boundary"),
    uiTerm("raw", "_", "prompt"),
    uiTerm("raw", "_", "response"),
    uiTerm("employee", "_", "id"),
    uiTerm("user", "_", "id"),
    uiTerm("manager", "_", "view"),
    uiTerm("team", "_", "ranking"),
    uiTerm("productivity", "_", "score"),
    uiTerm("Glean", " ", "proved", " ", "ROI"),
    ...extraTerms
  ];
  expect(text ?? "").not.toMatch(new RegExp(terms.map(escapeRegExp).join("|"), "i"));
};

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });

const customerProjectionResponse = {
  schema_version: "FT_AI_VALUE_CUSTOMER_DATA_MODEL_ROUTE_PROJECTION_2026_06",
  projection_state: "SOURCE_BOUND_CUSTOMER_EVIDENCE_STATUS_READY",
  display_mode: "customer_evidence_status",
  source_bound: true,
  filter_applied: "latest_org_scoped",
  live_connector_execution: false,
  allowed_customer_outputs: [
    "Aggregate evidence status",
    "Measurement context",
    "Source-bound caveats",
    "Next evidence action"
  ],
  blocked_customer_outputs: [
    "ROI proof",
    "Financial output",
    "Causal proof",
    "Productivity output",
    "Confidence, probability, or score output",
    "Live connector output",
    "Export package",
    "Raw data or source payload"
  ],
  projections: [
    {
      value_driver: "Capacity",
      metric: {
        label: "Capacity metric",
        direction: "decrease",
        unit: "hours",
        owner_review_state: "Metric owner approved"
      },
      workflow_context: {
        function_area: "Customer Support",
        workflow_label: "Customer Support workflow"
      },
      milestone: {
        day: 60,
        baseline_window: { start: "2026-02-01", end: "2026-03-31" },
        comparison_window: { start: "2026-05-01", end: "2026-06-30" }
      },
      evidence_status: {
        aggregate_review_state: "Aggregate export review passed",
        validation_state: "clear"
      },
      caveats: [
        "Aggregate evidence status only; customer-owned outcome review remains required."
      ],
      allowed_output: "Aggregate evidence status only",
      blocked_outputs: [
        "ROI proof",
        "Financial output",
        "Causal proof",
        "Productivity output",
        "Confidence, probability, or score output",
        "Live connector output",
        "Export package",
        "Raw data or source payload"
      ],
      next_action:
        "Customer-owned outcome review is required before any stronger claim is considered."
    },
    {
      value_driver: "Risk",
      metric: {
        label: "Risk metric",
        direction: "maintain",
        unit: "rate",
        owner_review_state: "Metric owner approved"
      },
      workflow_context: {
        function_area: "Legal",
        workflow_label: "Legal workflow"
      },
      milestone: {
        day: 90,
        baseline_window: { start: "2026-01-01", end: "2026-03-31" },
        comparison_window: { start: "2026-07-01", end: "2026-09-30" }
      },
      evidence_status: {
        aggregate_review_state: "Aggregate export review passed",
        validation_state: "clear"
      },
      caveats: [
        "Aggregate evidence status only; customer-owned outcome review remains required."
      ],
      allowed_output: "Aggregate evidence status only",
      blocked_outputs: [
        "ROI proof",
        "Financial output",
        "Causal proof",
        "Productivity output",
        "Confidence, probability, or score output",
        "Live connector output",
        "Export package",
        "Raw data or source payload"
      ],
      next_action:
        "Customer-owned outcome review is required before any stronger claim is considered."
    }
  ]
};

const renderWorkspace = (path = "/ai-value-workspace") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AIValueWorkspace />
    </MemoryRouter>
  );


describe("AIValueWorkspace executive spine", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ objects: [] }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("renders a meaty executive value evidence report with fail-closed export controls", () => {
    const { container } = renderWorkspace("/ai-value-workspace/decisions");

    const report = screen.getByRole("region", { name: /Value Evidence Report/i });
    expect(within(report).getByRole("heading", { name: /Is enterprise AI becoming valuable work/i })).toBeInTheDocument();
    expect(within(report).getByText(/For Customer Support case resolution/i)).toBeInTheDocument();
    expect(within(report).getByText(/Hypothesis status/i)).toBeInTheDocument();
    expect(within(report).getByText(/Evidence posture/i)).toBeInTheDocument();
    expect(within(report).getByText(/Spend posture/i)).toBeInTheDocument();
    expect(within(report).getByText(/Caveated report actions only/i)).toBeInTheDocument();
    const reportActions = within(report).getByRole("group", { name: /Report actions/i });
    expect(within(reportActions).getByRole("button", { name: /Open internal preview/i })).toBeInTheDocument();
    expect(within(reportActions).getByRole("button", { name: /Export not authorized/i })).toBeDisabled();
    expect(within(reportActions).getByRole("button", { name: /Share not authorized/i })).toBeDisabled();
    expect(within(report).getByText(/Preview only. Export not authorized/i)).toBeInTheDocument();
    expect(within(report).queryByRole("button", { name: /Download/i })).not.toBeInTheDocument();
    expect(within(report).queryByRole("button", { name: /Share caveated package/i })).not.toBeInTheDocument();

    for (const section of [
      "Approved Hypothesis",
      "Human Readiness",
      "Behavior Evidence / VBD",
      "Business Metric Linkage",
      "Spend & Scale Judgment",
      "Executive Recommendations",
      "Governance Notes"
    ]) {
      expect(within(report).getByRole("heading", { name: section })).toBeInTheDocument();
    }

    expect(within(report).getByText(/Run a targeted enablement sprint/i)).toBeInTheDocument();
    expect(within(report).getByText(/Review high-token, low-depth workflows/i)).toBeInTheDocument();
    expect(within(report).getByText(/The strongest current conclusion/i)).toBeInTheDocument();
    expect(
      within(report).getAllByText(/does not claim ROI, causality, productivity lift, financial impact/i).length
    ).toBeGreaterThan(0);
    expectNoUnsafeUiLanguage(container.textContent);
  });

  it("uses the sidebar and toolbar instead of a duplicate step-card row", () => {
    const { container } = renderWorkspace();

    expect(
      screen.getByRole("region", { name: /AI value workspace report frame/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Value Case: AI Assistant Value Assessment/i })
    ).toBeInTheDocument();
    const reportHeader = screen
      .getByRole("heading", { name: /Value Case: AI Assistant Value Assessment/i })
      .closest("header") as HTMLElement;
    expect(within(reportHeader).getByLabelText(/Step 1 of 7: Blueprint/i)).toHaveTextContent(
      "Step 1 of 7"
    );
    expect(
      screen.queryByRole("heading", { name: /Value Evidence Console/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: /Value journey steps/i })
    ).not.toBeInTheDocument();
    const workspaceNav = screen.getByRole("navigation", { name: "Workspace" });
    for (const link of [
      "Home",
      "Value cases",
      "AI Fluency",
      "Evidence",
      "Metrics",
      "Workflows",
      "Decisions"
    ]) {
      expect(within(workspaceNav).getByRole("link", { name: link })).toBeInTheDocument();
    }
    const modeNav = screen.getByRole("navigation", { name: /Value case modes/i });
    expect(within(modeNav).getByRole("link", { name: /Cockpit/i })).toBeInTheDocument();
    expect(within(modeNav).getByRole("link", { name: /Report/i })).toBeInTheDocument();
    expect(
      within(workspaceNav).getAllByRole("link", { current: "page" })
    ).toHaveLength(1);
    expect(screen.getByRole("region", { name: /Current guided action/i })).toHaveTextContent("Blueprint Hypothesis");
    expect(screen.getByRole("region", { name: /Blueprint hypothesis summary/i })).toBeInTheDocument();
    const journeyPreview = screen.getByRole("region", { name: /Value journey preview/i });
    expect(within(journeyPreview).getByRole("heading", { name: /Evidence Sources/i })).toBeInTheDocument();
    expect(within(journeyPreview).getByRole("heading", { name: /Behavior Evidence/i })).toBeInTheDocument();
    expect(within(journeyPreview).getByRole("heading", { name: /Evidence Checkpoint/i })).toBeInTheDocument();
    expect(within(journeyPreview).getByRole("heading", { name: /Executive Report/i })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Velocity Breadth Depth map/i })).not.toBeInTheDocument();

    expectNoUnsafeUiLanguage(container.textContent);
  });

  it("renders the Evidence Sources step inside the executive report-frame toolbar", () => {
    const { container } = renderWorkspace("/ai-value-workspace/sources");

    const frame = screen.getByRole("region", {
      name: /AI value workspace report frame/i
    });
    expect(
      within(frame).queryByRole("toolbar", { name: /AI value report controls/i })
    ).not.toBeInTheDocument();
    const reportHeader = screen
      .getByRole("heading", { name: /Value Case: AI Assistant Value Assessment/i })
      .closest("header") as HTMLElement;
    expect(reportHeader).toHaveAttribute("aria-label", "AI value report header");
    expect(within(reportHeader).getByText(/AI Value Platform/i)).toBeInTheDocument();
    expect(within(reportHeader).getByText(/^Evidence Sources$/i)).toBeInTheDocument();
    expect(within(reportHeader).getByLabelText(/Step 3 of 7: Sources/i)).toHaveTextContent(
      "Step 3 of 7"
    );
    expect(
      within(reportHeader).getByText(/Caveated review only: aggregate source readiness supports planning/i)
    ).toBeInTheDocument();
    expect(within(reportHeader).getByText(/not proof of ROI/i)).toBeInTheDocument();
    expect(within(reportHeader).getByText(/Causality, productivity, financial calculations/i)).toBeInTheDocument();

    const modeNav = within(reportHeader).getByRole("navigation", {
      name: /Value case modes/i
    });
    expect(within(modeNav).getByRole("link", { name: /Cockpit/i })).toHaveClass(
      "active"
    );
    expect(within(modeNav).getByRole("link", { name: /Report/i })).toHaveAttribute(
      "href",
      "/ai-value-workspace/decisions"
    );

    const reportFrameActions = within(reportHeader).getByRole("group", {
      name: /Report frame actions/i
    });
    expect(
      within(reportFrameActions).getByRole("button", {
        name: /Review aggregate evidence status/i
      })
    ).toBeEnabled();
    expect(
      within(reportFrameActions).getByRole("button", { name: /Export not authorized/i })
    ).toBeDisabled();
    expect(
      within(reportFrameActions).getByRole("button", { name: /Share not authorized/i })
    ).toBeDisabled();
    expect(
      within(reportFrameActions).queryByRole("button", { name: /Sync read-only/i })
    ).not.toBeInTheDocument();
    expect(within(reportFrameActions).getByText(/Read-only status/i)).toBeInTheDocument();
    expect(
      within(reportFrameActions).queryByRole("button", { name: /Settings|Review caveats|More/i })
    ).not.toBeInTheDocument();

    expect(screen.queryByRole("heading", { name: /Value Evidence Console/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /Workspace navigation/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Alex Morgan/i)).not.toBeInTheDocument();
    expectNoUnsafeUiLanguage(container.textContent, [
      "Download report",
      "Share package",
      "customer-facing financial output"
    ]);
  });

  it("shows the governed source package review queue on the Evidence Sources step", () => {
    const { container } = renderWorkspace("/ai-value-workspace/sources");

    const queue = screen.getByRole("region", { name: /Source Review Queue/i });
    expect(queue).toBeInTheDocument();
    expect(within(queue).getByRole("heading", { name: /Source Review Queue/i })).toBeInTheDocument();
    expect(within(queue).getByText(/Evidence intake queue/i)).toBeInTheDocument();
    expect(
      within(queue).getByText(/Data Spine gate before Evidence Checkpoint assembly/i)
    ).toBeInTheDocument();
    expect(
      within(queue).getByText(/Review aggregate source lanes before the Data Spine gate tests them/i)
    ).toBeInTheDocument();

    const lanes = within(queue).getAllByRole("article");
    expect(lanes).toHaveLength(6);
    expect(within(queue).getByText("Blueprint")).toBeInTheDocument();
    expect(within(queue).getByText("AI Fluency")).toBeInTheDocument();
    expect(within(queue).getByText("VBD / Token")).toBeInTheDocument();
    expect(within(queue).getByText("Customer metric")).toBeInTheDocument();
    expect(within(queue).getByText("Value assumption context")).toBeInTheDocument();
    expect(within(queue).getByText("Governance")).toBeInTheDocument();
    expect(within(queue).getByText("Aggregate instrument review")).toBeInTheDocument();
    expect(within(queue).getByText("Scrubbed aggregate telemetry review")).toBeInTheDocument();
    expect(within(queue).queryByText(uiTerm("ai", "_", "fluency", "_", "dashboard", "_", "export"))).not.toBeInTheDocument();
    expect(within(queue).queryByText(uiTerm("scrubbed", "_", "glean", "_", "bigquery", "_", "export"))).not.toBeInTheDocument();
    expect(within(queue).queryByText(uiTerm("customer", "_", "metric", "_", "aggregate", "_", "export"))).not.toBeInTheDocument();

    for (const status of ["parsed", "approved", "aligned", "held", "uploaded", "suppressed", "missing"]) {
      expect(within(queue).getAllByText(status).length).toBeGreaterThan(0);
    }
    expect(within(queue).getByText("3 of 6 lanes clear for Data Spine review")).toBeInTheDocument();
    expect(
      within(queue).getByText(/Held or suppressed lanes stay out of executive review readiness/i)
    ).toBeInTheDocument();
    expect(within(queue).getAllByText(/Action needed/i).length).toBeGreaterThan(0);
    expect(within(queue).getByText(/Map parsed value routes to workflow_family/i)).toBeInTheDocument();
    expect(within(queue).getByText(/Resolve metric owner approval/i)).toBeInTheDocument();
    expect(within(queue).getByText(/Regenerate at aggregate threshold/i)).toBeInTheDocument();

    expect(within(queue).getByText("Data Spine alignment keys")).toBeInTheDocument();
    expect(within(queue).getByText("Approved organization boundary")).toBeInTheDocument();
    expect(within(queue).getByText("Approved client boundary")).toBeInTheDocument();
    expect(within(queue).getByText("Workflow family")).toBeInTheDocument();
    expect(within(queue).getByText("Function area")).toBeInTheDocument();
    expect(within(queue).getByText("Aggregate cohort")).toBeInTheDocument();
    expect(within(queue).getByText("Baseline window")).toBeInTheDocument();
    expect(within(queue).getByText("Comparison window")).toBeInTheDocument();
    expect(within(queue).getByText("Review queue labels")).toBeInTheDocument();
    expect(within(queue).getByText("Metric owner review")).toBeInTheDocument();
    expect(within(queue).getByText("Source package review")).toBeInTheDocument();
    expect(within(queue).getByText("Reviewer role")).toBeInTheDocument();
    expect(within(queue).getByText("Review decision")).toBeInTheDocument();
    expect(within(queue).getAllByText("Review packet")).toHaveLength(6);
    expect(within(queue).getByText("Blueprint extraction packet")).toBeInTheDocument();
    expect(within(queue).queryByText("Source reference")).not.toBeInTheDocument();
    expect(within(queue).queryByText("org_id")).not.toBeInTheDocument();
    expect(within(queue).queryByText("client_id")).not.toBeInTheDocument();
    expect(within(queue).queryByText("metric_id")).not.toBeInTheDocument();
    expect(within(queue).queryByText("source_ref")).not.toBeInTheDocument();
    expect(within(queue).getAllByText("Clear for review")).toHaveLength(3);
    expect(within(queue).getAllByText("Hold before review")).toHaveLength(3);
    expect(within(queue).getByText(/aggregate evidence status only/i)).toBeInTheDocument();
    expect(
      within(queue).getByText(/Evidence Checkpoint, model-review, or report-output readiness/i)
    ).toBeInTheDocument();
    expect(within(queue).queryByText(/prepare_finance_context_investigation_packet/i)).not.toBeInTheDocument();

    expect(queue.textContent).not.toMatch(/confidence\s*%|probability|financial attribution|causal proof/i);
    expect(queue.textContent).not.toMatch(/individual|person-level|manager ranking|team ranking/i);
    expectNoUnsafeUiLanguage(container.textContent, [
      "org_id",
      "client_id",
      "metric_id",
      "source_ref",
      "ROI proof",
      "productivity proof",
      "customer-facing financial output"
    ]);
  });

  it("renders source-bound customer data model projections from the route contract", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/v1/ai-value/customer-data-model/projections")) {
        return jsonResponse(customerProjectionResponse);
      }
      return jsonResponse({ objects: [] });
    });

    const { container } = renderWorkspace();

    const panel = await screen.findByRole("region", {
      name: /Customer evidence projection/i
    });
    expect(within(panel).getByText(/Customer evidence projection/i)).toBeInTheDocument();
    expect(within(panel).getByText(/Source-bound status/i)).toBeInTheDocument();
    expect(within(panel).getByText(/Capacity metric/i)).toBeInTheDocument();
    expect(within(panel).getByText(/Risk metric/i)).toBeInTheDocument();
    expect(within(panel).getByText("Customer Support", { selector: "strong" })).toBeInTheDocument();
    expect(within(panel).getByText("Legal", { selector: "strong" })).toBeInTheDocument();
    expect(within(panel).getByText(/Day 60/i)).toBeInTheDocument();
    expect(within(panel).getByText(/Day 90/i)).toBeInTheDocument();
    expect(within(panel).getByText(/2026-05-01 to 2026-06-30/i)).toBeInTheDocument();
    expect(within(panel).getByText(/2026-07-01 to 2026-09-30/i)).toBeInTheDocument();
    expect(within(panel).getAllByText(/Aggregate export review passed/i)).toHaveLength(2);
    expect(within(panel).getByText(/Aggregate evidence status only/i)).toBeInTheDocument();
    expect(within(panel).getByText(/Live connector output/i)).toBeInTheDocument();
    expect(within(panel).queryByText(/db_row_do_not_expose/i)).not.toBeInTheDocument();
    expect(within(panel).queryByText(/source_refs/i)).not.toBeInTheDocument();
    expect(within(panel).queryByText(/projection_hash/i)).not.toBeInTheDocument();
    expect(within(panel).queryByText(/support_median_resolution_hours/i)).not.toBeInTheDocument();
    expect(within(panel).queryByText(/workflow_support_case_resolution/i)).not.toBeInTheDocument();
    expect(within(panel).queryByText(/org-northstar-enterprise/i)).not.toBeInTheDocument();
    expect(within(panel).queryByText(/customer-facing financial output/i)).not.toBeInTheDocument();
    expectNoUnsafeUiLanguage(container.textContent, [
      "confidence",
      "probability",
      "score output",
      "financial output"
    ]);
  });

  it("does not apply stale local measurement-plan filters to the default customer projection", async () => {
    localStorage.setItem(
      "aiValue.customerDataModelMeasurementPlanId",
      "measurement_plan_stale_do_not_use"
    );
    const requestedUrls: string[] = [];
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      requestedUrls.push(url);
      if (url.includes("/api/v1/ai-value/customer-data-model/projections")) {
        return jsonResponse(customerProjectionResponse);
      }
      return jsonResponse({ objects: [] });
    });

    renderWorkspace();

    await waitFor(() =>
      expect(
        requestedUrls.some((url) =>
          url.includes("/api/v1/ai-value/customer-data-model/projections")
        )
      ).toBe(true)
    );
    const projectionUrl = requestedUrls.find((url) =>
      url.includes("/api/v1/ai-value/customer-data-model/projections")
    );
    expect(projectionUrl).toBe("/api/v1/ai-value/customer-data-model/projections");
  });

  it("keeps the customer data model projection held when the route has no snapshots", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/v1/ai-value/customer-data-model/projections")) {
        return jsonResponse({
          schema_version: "FT_AI_VALUE_CUSTOMER_DATA_MODEL_ROUTE_PROJECTION_2026_06",
          projection_state: "HOLD_FOR_CUSTOMER_DATA_MODEL_SNAPSHOTS",
          display_mode: "customer_evidence_status",
          source_bound: true,
          filter_applied: "latest_org_scoped",
          live_connector_execution: false,
          allowed_customer_outputs: [],
          blocked_customer_outputs: ["Live connector output"],
          projections: []
        });
      }
      return jsonResponse({ objects: [] });
    });

    const { container } = renderWorkspace();
    const panel = await screen.findByRole("region", {
      name: /Customer evidence projection/i
    });

    expect(panel).toHaveAttribute("aria-live", "polite");
    expect(within(panel).getByText(/No governed customer projection available/i)).toBeInTheDocument();
    expect(within(panel).getByText(/Missing: a compact, source-bound customer data model snapshot/i)).toBeInTheDocument();
    expect(within(panel).getByText(/Why: this panel can support planning only/i)).toBeInTheDocument();
    expect(within(panel).getByText(/Next action: create the governed customer projection/i)).toBeInTheDocument();
    expect(within(panel).queryByText(/Customer Success account health review/i)).not.toBeInTheDocument();
    expectNoUnsafeUiLanguage(container.textContent, [
      "customer-facing financial output",
      "Glean proved ROI"
    ]);
  });

  it("keeps AI Fluency capture, profile, translation, and report interpretation on one evidence screen", () => {
    const { container } = renderWorkspace("/ai-value-workspace/readiness");

    const evidence = screen.getByRole("region", { name: /AI Fluency Evidence/i });
    expect(within(evidence).getByRole("heading", { name: /AI Fluency Evidence/i })).toBeInTheDocument();
    expect(within(evidence).getByText(/Instrument-derived evidence/i)).toBeInTheDocument();
    expect(within(evidence).getByText(/AIOM-facilitated capture/i)).toBeInTheDocument();
    expect(within(evidence).getByText(/Value Realization uses the readout/i)).toBeInTheDocument();
    expect(within(evidence).getByText(/Sample scenario data/i)).toBeInTheDocument();
    expect(within(evidence).getByText(/illustrative instrument outputs/i)).toBeInTheDocument();
    expect(within(evidence).getByText(/approved aggregate customer results/i)).toBeInTheDocument();
    expect(within(evidence).getByText(/internal reviewed report draft/i)).toBeInTheDocument();
    expect(within(evidence).getByText(/not FluencyTracr scores/i)).toBeInTheDocument();

    const views = within(evidence).getByRole("group", { name: /AI Fluency evidence views/i });
    for (const view of ["Capture", "Profile", "Translation", "Report Read"]) {
      const button = within(views).getByRole("button", { name: view });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute("aria-describedby");
    }
    expect(within(views).getByRole("button", { name: "Capture" })).toHaveAttribute("aria-pressed", "true");
    expect(within(evidence).getByRole("region", { name: /Fluency capture view/i })).toBeInTheDocument();
    expect(within(evidence).getByText(/Target cohort/i)).toBeInTheDocument();
    expect(within(evidence).getByText(/Participation/i)).toBeInTheDocument();
    expect(within(evidence).getByText(/Coverage review open/i)).toBeInTheDocument();
    expect(within(evidence).getByText(/Segment coverage/i)).toBeInTheDocument();
    expect(within(evidence).getByText(/Most planned segments represented/i)).toBeInTheDocument();
    expect(within(evidence).getByText(/Legal review remains held/i)).toBeInTheDocument();
    expect(within(evidence).getByText(/AIOM handoff/i)).toBeInTheDocument();

    fireEvent.click(within(views).getByRole("button", { name: "Profile" }));
    expect(within(views).getByRole("button", { name: "Profile" })).toHaveAttribute("aria-pressed", "true");
    expect(within(evidence).getByRole("region", { name: /Five-factor profile view/i })).toBeInTheDocument();
    expect(within(evidence).getByText("Confidence")).toBeInTheDocument();
    expect(within(evidence).getByText(/Read: developing strength/i)).toBeInTheDocument();
    expect(within(evidence).getByText("Usage Quality")).toBeInTheDocument();
    expect(within(evidence).getByText("Behavior Change")).toBeInTheDocument();
    expect(within(evidence).getByText("Leadership Reinforcement")).toBeInTheDocument();
    expect(within(evidence).getByText("Capability Growth")).toBeInTheDocument();

    fireEvent.click(within(views).getByRole("button", { name: "Translation" }));
    expect(within(evidence).getByRole("region", { name: /Fluency translation view/i })).toBeInTheDocument();
    expect(within(evidence).getByText(/AI Attitude/i)).toBeInTheDocument();
    expect(within(evidence).getByText(/Read: favorable/i)).toBeInTheDocument();
    expect(within(evidence).getByText(/Behavioral Intent/i)).toBeInTheDocument();
    expect(within(evidence).getByText(/Perceived AI Impact/i)).toBeInTheDocument();
    expect(within(evidence).getByText(/capability is becoming belief, willingness, and perceived work value/i)).toBeInTheDocument();

    fireEvent.click(within(views).getByRole("button", { name: "Report Read" }));
    expect(within(evidence).getByRole("region", { name: /AI Fluency report read view/i })).toBeInTheDocument();
    expect(within(evidence).getByText(/Reported fluency is an instrument signal/i)).toBeInTheDocument();
    expect(within(evidence).getByText(/Observed behavior is reviewed later in Behavior \/ VBD/i)).toBeInTheDocument();
    expect(within(evidence).getByText(/Value Realization owns the final value narrative/i)).toBeInTheDocument();
    expect(within(evidence).getByText(/AIOM supports capture and context/i)).toBeInTheDocument();
    const unsafePeoplePattern = new RegExp(
      [
        uiTerm("employee", " ", "performance"),
        uiTerm("people", " ", "performance"),
        uiTerm("workforce", " ", "performance"),
        uiTerm("team", " ", "ranking"),
        uiTerm("manager", " ", "ranking"),
        uiTerm("leader", "board"),
        uiTerm("customer-ready", " ", "score")
      ]
        .map(escapeRegExp)
        .join("|"),
      "i"
    );
    for (const view of ["Capture", "Profile", "Translation", "Report Read"]) {
      fireEvent.click(within(views).getByRole("button", { name: view }));
      expect(within(evidence).getByText(/Sample scenario data/i)).toBeInTheDocument();
      expect(within(evidence).getByText(/approved aggregate customer results/i)).toBeInTheDocument();
      expect(evidence.textContent).not.toMatch(/\d+\/100|Index\s+\d+|\d+%\s*complete/i);
      expect(evidence.textContent).not.toMatch(unsafePeoplePattern);
      expect(evidence.textContent).not.toMatch(
        /ROI proof|causal proof|productivity measurement|probability|confidence\s*(score|%)/i
      );
    }
    expect(workspaceSource).toMatch(/approved aggregate usage extracts/i);
    expect(workspaceSource).not.toMatch(
      /live usage actuals|live telemetry|connector authorization|live connector authorization|export authorized|share authorized|financial output authorized|pricing, volume, revenue|loaded-cost assumptions/i
    );

    // Practitioner clutter stays off the executive page.
    expect(screen.queryByRole("region", { name: /Velocity Breadth Depth map/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Client Value Questions/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Client kickoff/i)).not.toBeInTheDocument();

    expectNoUnsafeUiLanguage(container.textContent);
  });

  it("uses the report-frame toolbar on every workspace page", async () => {
    for (const path of [
      "/ai-value-workspace",
      "/ai-value-workspace/readiness",
      "/ai-value-workspace/sources",
      "/ai-value-workspace/vbd",
      "/ai-value-workspace/metrics",
      "/ai-value-workspace/case",
      "/ai-value-workspace/roi",
      "/ai-value-workspace/decisions"
    ]) {
      const view = renderWorkspace(path);

      await waitFor(() => {
        expect(
          screen.getByRole("region", { name: /AI value workspace report frame/i })
        ).toBeInTheDocument();
      });

      const frame = screen.getByRole("region", {
        name: /AI value workspace report frame/i
      });
      expect(
        within(frame).getByRole("heading", {
          name: /Value Case: AI Assistant Value Assessment/i
        })
      ).toBeInTheDocument();
      expect(
        within(frame).queryByRole("navigation", { name: /Value journey steps/i })
      ).not.toBeInTheDocument();
      expect(
        within(frame).getByRole("navigation", { name: "Workspace" })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("heading", { name: /Value Evidence Console/i })
      ).not.toBeInTheDocument();

      view.unmount();
    }
  });

  it("keeps report-frame text readable on light report surfaces", () => {
    expect(
      cssHasDeclaration(".ai-value-workspace-report-frame .ai-value-map-label", "color: #334155")
    ).toBe(true);
    expect(
      cssHasDeclaration(".ai-value-workspace-report-frame .ai-value-workspace-card-status", "color: #334155")
    ).toBe(true);
    expect(
      cssHasDeclaration(".ai-value-workspace-report-frame .ai-value-blueprint-primary p", "color: #374151")
    ).toBe(true);
    expect(
      cssHasDeclaration(".ai-value-workspace-report-frame .ai-value-blueprint-side h3", "color: #051c55")
    ).toBe(true);
    expect(
      cssHasDeclaration(".ai-value-workspace-report-frame .ai-value-blueprint-side .eyebrow", "color: #334155")
    ).toBe(true);
    expect(
      cssHasDeclaration(".ai-value-workspace-report-frame .ai-value-page-handoff", "background: #fffffb")
    ).toBe(true);
    expect(
      cssHasDeclaration(".ai-value-workspace-report-frame .ai-value-page-handoff p", "color: #1f2937")
    ).toBe(true);
    expect(
      cssHasDeclaration(".ai-value-workspace-report-frame .ai-value-pill", "color: #09276e")
    ).toBe(true);
    expect(
      cssHasDeclaration(".ai-value-workspace-report-frame .ai-value-pill-good", "color: #14532d")
    ).toBe(true);
    expect(
      cssHasDeclaration(".ai-value-workspace-report-frame .ai-value-pill-warn", "color: #7a4b0a")
    ).toBe(true);
    expect(
      cssHasDeclaration(".ai-value-workspace-report-frame .ai-value-vbd-bridge .ai-value-map-label", "color: #8ea0bd")
    ).toBe(true);
    expect(
      cssHasDeclaration(".ai-value-workspace-report-frame .ai-value-report-posture-grid .ai-value-map-label", "color: #8ea0bd")
    ).toBe(true);
    expect(
      cssHasDeclaration(".ai-value-workspace-report-frame .ai-value-vbd-y-axis", "color: #334155")
    ).toBe(true);
    expect(
      cssHasDeclaration(".ai-value-workspace-report-frame .ai-value-checkpoint-panel .ai-value-section-head p:not(.eyebrow)", "color: #4b5563")
    ).toBe(true);
    expect(
      cssHasDeclaration(".ai-value-workspace-report-frame .ai-value-roi-access-panel h3", "color: #051c55")
    ).toBe(true);
    expect(
      cssHasDeclaration(".ai-value-workspace-report-frame .ai-value-decision-preview h3", "color: #051c55")
    ).toBe(true);
    expect(
      cssHasDeclaration(".ai-value-workspace-report-frame .ai-value-metrics-flow p", "color: #4b5563")
    ).toBe(true);
    expect(
      cssHasDeclaration(".ai-value-console-layout.ai-value-workspace-report-layout", "grid-template-columns: 1fr")
    ).toBe(true);
  });

  it("does not split instrument-derived fluency reads into separate workspace steps", () => {
    const { container } = renderWorkspace("/ai-value-workspace/readiness");

    const nav = screen.getByRole("navigation", { name: "Workspace" });
    expect(within(nav).getByRole("link", { name: /AI Fluency/i })).toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: /Fluency Profile/i })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: /Fluency Translation/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /Value journey steps/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Organizational AI Fluency example/i })).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Organizational AI Fluency example/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Send AI Fluency and view results/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Open client assessment/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Copy client link/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Show aggregate results/i })).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/explore-your-ai-fluency-instruments/i);

    expectNoUnsafeUiLanguage(container.textContent);
  });

  it("maps Behavior / VBD content to Workflows and keeps the old blueprint route on Home", () => {
    const vbd = renderWorkspace("/ai-value-workspace/vbd");
    const vbdMap = screen.getByRole("region", { name: /Velocity Breadth Depth map/i });
    expect(vbdMap).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Organizational AI Fluency framework/i })).not.toBeInTheDocument();
    expect(within(vbdMap).getAllByText(/High-fluency flow/i).length).toBeGreaterThan(0);
    expect(
      within(screen.getByRole("navigation", { name: "Workspace" })).getByRole("link", {
        current: "page"
      })
    ).toHaveTextContent("Workflows");
    vbd.unmount();

    renderWorkspace("/ai-value-workspace/blueprint");
    expect(screen.getByRole("region", { name: /Blueprint hypothesis summary/i })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Velocity Breadth Depth map/i })).not.toBeInTheDocument();
    const activeLink = within(screen.getByRole("navigation", { name: "Workspace" })).getByRole(
      "link",
      { current: "page" }
    );
    expect(activeLink).toHaveTextContent("Home");
  });

  it("plots org functions from the AI Fluency results on the VBD map", () => {
    const { container } = renderWorkspace("/ai-value-workspace/vbd");

    const map = screen.getByRole("region", { name: /Velocity Breadth Depth map/i });
    expect(within(map).getByText(/Function behavior map/i)).toBeInTheDocument();
    const postureModel = within(map).getByRole("region", { name: /Aggregate VBD posture model/i });
    expect(within(postureModel).getByText(/Overall VBD posture/i)).toBeInTheDocument();
    expect(within(postureModel).getByText(/Aggregate review lens/i)).toBeInTheDocument();
    expect(within(postureModel).getByText(/posture review only/i)).toBeInTheDocument();
    expect(within(postureModel).getByText(/Integration posture/i)).toBeInTheDocument();
    expect(within(postureModel).getByText(/not a people or team measure/i)).toBeInTheDocument();
    expect(within(postureModel).getByText(/Fixed quadrant line 60/i)).toBeInTheDocument();
    expect(within(postureModel).getByText(/not a configurable control/i)).toBeInTheDocument();
    expect(within(map).getAllByText(/Engineering \/ Software Development/i).length).toBeGreaterThan(0);
    expect(within(map).getAllByText(/Customer or Account Success/i).length).toBeGreaterThan(0);
    expect(within(map).getAllByText(/Finance or Accounting/i).length).toBeGreaterThan(0);
    expect(within(map).getAllByText(/Legal & Compliance/i).length).toBeGreaterThan(0);
    expect(within(map).getByText(/Measured AI surfaces:/i)).toBeInTheDocument();
    expect(within(map).getByText(/Search, Assistant, Skills, Agents, Artifacts, workflow automations/i)).toBeInTheDocument();
    expect(within(map).getByText(/Quadrant definitions/i)).toBeInTheDocument();
    expect(within(map).getByText(/Bubble size shows aggregate posture context/i)).toBeInTheDocument();
    expect(map.textContent).not.toMatch(/Overall VBD Score|Integration Score|Quadrant Strength/i);
    const highIntegrationGuide = within(map).getByLabelText(/High integration quadrant guide/i);
    expect(within(highIntegrationGuide).getByText(/Deep but slow/i)).toBeInTheDocument();
    expect(within(highIntegrationGuide).getByText(/High-fluency flow/i)).toBeInTheDocument();
    expect(within(highIntegrationGuide).getByText(/low velocity \/ high integration/i)).toBeInTheDocument();
    expect(within(highIntegrationGuide).getByText(/high velocity \/ high integration/i)).toBeInTheDocument();
    const lowIntegrationGuide = within(map).getByLabelText(/Low integration quadrant guide/i);
    expect(within(lowIntegrationGuide).getByText("Low integration")).toBeInTheDocument();
    expect(within(lowIntegrationGuide).getByText("Fast but shallow")).toBeInTheDocument();
    expect(within(lowIntegrationGuide).getByText(/low velocity \/ low integration/i)).toBeInTheDocument();
    expect(within(lowIntegrationGuide).getByText(/high velocity \/ low integration/i)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Organizational AI Fluency framework/i })).not.toBeInTheDocument();
    const quadrantMap = within(map).getByLabelText("VBD quadrant map");
    expect(within(quadrantMap).queryByText(/Fast but shallow/)).not.toBeInTheDocument();
    expect(within(quadrantMap).queryByText(/High-fluency flow/)).not.toBeInTheDocument();
    expect(within(quadrantMap).queryByText(/Low integration/)).not.toBeInTheDocument();
    expect(within(quadrantMap).queryByText(/Deep but slow/)).not.toBeInTheDocument();
    expect(quadrantMap.textContent).not.toMatch(/Quadrant Strength/i);
    expect(quadrantMap.textContent).not.toMatch(/Quadrant Share/i);
    expect(within(quadrantMap).queryByText(/Adoption is ahead of workflow change/i)).not.toBeInTheDocument();
    expect(within(quadrantMap).queryByText(/AI is embedded enough to scale/i)).not.toBeInTheDocument();
    expect(within(quadrantMap).queryByText(/Find the work fit before scaling/i)).not.toBeInTheDocument();
    expect(within(quadrantMap).queryByText(/Good use case, slow spread/i)).not.toBeInTheDocument();
    expect(within(quadrantMap).queryByText(/Watch for/i)).not.toBeInTheDocument();
    expect(within(quadrantMap).queryByText(/Low verification/i)).not.toBeInTheDocument();
    expect(quadrantMap.querySelectorAll("[aria-label]")).toHaveLength(0);
    expect(quadrantMap.querySelectorAll('[aria-hidden="true"]')).toHaveLength(4);
    const definitions = within(map).getByLabelText(/Quadrant definitions/i);
    expect(within(definitions).getByText(/Quadrant posture high · Function share 29%/)).toBeInTheDocument();
    expect(within(definitions).getByText(/Quadrant posture held · Function share 18%/)).toBeInTheDocument();
    expect(within(definitions).getByText(/Watch for: Immediate accept, Low verification/i)).toBeInTheDocument();
    expect(within(definitions).getByText(/Watch for: Repeat use, Verification/i)).toBeInTheDocument();
    expect(within(definitions).getByText(/Workflow-connected use/i)).toBeInTheDocument();
    expect(within(definitions).getByText(/Human-only fallback/i)).toBeInTheDocument();
    expect(within(definitions).getByText(/Workflow drag/i)).toBeInTheDocument();
    expect(within(definitions).getByText(/Engineering \/ Software Development/i)).toBeInTheDocument();
    expect(within(definitions).getByText(/Customer or Account Success/i)).toBeInTheDocument();
    const yAxis = container.querySelector(".ai-value-vbd-y-axis");
    expect(yAxis).toBeInstanceOf(HTMLElement);
    expect(within(yAxis as HTMLElement).getByText("High")).toHaveClass("ai-value-vbd-axis-high");
    expect(within(yAxis as HTMLElement).getByText("Integration")).toHaveClass("ai-value-vbd-axis-title");
    expect(within(yAxis as HTMLElement).getByText("Low")).toHaveClass("ai-value-vbd-axis-low");
    expect(container.querySelectorAll(".ai-value-vbd-grid h4, .ai-value-vbd-grid .ai-value-map-label")).toHaveLength(0);
    expect(container.querySelectorAll(".ai-value-vbd-function-marker")).toHaveLength(0);
    const bubbles = container.querySelectorAll(".ai-value-vbd-function-bubble");
    expect(bubbles).toHaveLength(17);
    expect(Array.from(bubbles).every((bubble) => bubble instanceof HTMLElement && bubble.style.getPropertyValue("--vbd-bubble-size"))).toBe(true);
    const engineeringBubble = container.querySelector(
      '[aria-label^="Engineering / Software Development"]'
    );
    expect(engineeringBubble).toBeInstanceOf(HTMLElement);
    expect(engineeringBubble).toHaveAttribute(
      "aria-label",
      expect.stringContaining("aggregate posture review")
    );
    expect(engineeringBubble).toHaveAttribute(
      "aria-label",
      expect.stringContaining("Integration high")
    );
    expect(engineeringBubble).not.toHaveAttribute(
      "aria-label",
      expect.stringMatching(/Overall VBD Score|Integration Score|\b87\b/i)
    );
    const marketingBubble = container.querySelector(
      '[aria-label^="Marketing & Communications"]'
    );
    const businessOperationsBubble = container.querySelector(
      '[aria-label^="Corporate Strategy or Business Operations"]'
    );
    expect(marketingBubble).toBeInstanceOf(HTMLElement);
    expect(businessOperationsBubble).toBeInstanceOf(HTMLElement);
    expect(parseFloat((marketingBubble as HTMLElement).style.left)).toBeGreaterThan(60);
    expect(parseFloat((marketingBubble as HTMLElement).style.top)).toBeGreaterThan(40);
    expect(parseFloat((businessOperationsBubble as HTMLElement).style.left)).toBeGreaterThan(60);
    expect(parseFloat((businessOperationsBubble as HTMLElement).style.top)).toBeGreaterThan(40);
    expect(
      Array.from(bubbles).some(
        (bubble) => bubble instanceof HTMLElement && bubble.style.getPropertyValue("--vbd-bubble-size") !== bubbles[0].style.getPropertyValue("--vbd-bubble-size")
      )
    ).toBe(true);
    expect(within(map).queryByText(/No functions here yet/i)).not.toBeInTheDocument();

    expectNoUnsafeUiLanguage(container.textContent);
  });

  it("shows aggregate token controls with dynamic VBD month-window movement", () => {
    const { container } = renderWorkspace("/ai-value-workspace/vbd");

    const map = screen.getByRole("region", { name: /Velocity Breadth Depth map/i });
    expect(within(map).queryByRole("button", { name: /Token usage overlay/i })).not.toBeInTheDocument();
    expect(container.querySelectorAll(".ai-value-vbd-function-bubble")).toHaveLength(17);

    const overlay = within(map).getByRole("region", { name: /VBD scenario controls/i });
    expect(within(overlay).getByRole("button", { name: "VBD" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(within(overlay).getByRole("button", { name: "VBD + Token" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(within(overlay).queryByRole("button", { name: "VBD with Token" })).not.toBeInTheDocument();
    expect(within(overlay).getByRole("button", { name: "1 month" })).toHaveAttribute("aria-pressed", "true");
    expect(within(overlay).getByRole("button", { name: "3 months" })).toBeInTheDocument();
    expect(within(overlay).getByRole("button", { name: "6 months" })).toBeInTheDocument();
    expect(within(overlay).getByRole("button", { name: "12 months" })).toBeInTheDocument();
    expect(within(overlay).getByText(/Window: 1 month \(held for context\)/i)).toBeInTheDocument();
    expect(within(overlay).getByText(/VBD review lens: Fast but shallow/i)).toBeInTheDocument();
    expect(within(overlay).getByText(/Token context off/i)).toBeInTheDocument();
    expect(within(overlay).getByText(/Strategy context only/i)).toBeInTheDocument();
    expect(within(overlay).getByText(/VBD scenario controls/i)).toBeInTheDocument();
    expect(within(overlay).getByText(/Simulated aggregate context for workflow review/i)).toBeInTheDocument();
    expect(within(overlay).getByText(/Month controls switch between example aggregate snapshots/i)).toBeInTheDocument();
    expect(within(overlay).getByText(/VBD \+ Token adds a token intensity overlay/i)).toBeInTheDocument();
    expect(within(overlay).getByText(/not ROI, productivity, causality, people attribution, financial output, savings, or efficiency proof/i)).toBeInTheDocument();
    const graphic = container.querySelector(".ai-value-vbd-layout");
    const overlayControls = container.querySelector(".ai-value-vbd-token-overlay");
    expect(graphic).toBeInstanceOf(HTMLElement);
    expect(overlayControls).toBeInstanceOf(HTMLElement);
    expect(container.querySelector(".ai-value-vbd-token-quadrants")).not.toBeInTheDocument();
    expect(
      (overlayControls as HTMLElement).compareDocumentPosition(graphic as HTMLElement) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    const customerSuccessBubble = container.querySelector(
      '[aria-label^="Customer or Account Success"]'
    ) as HTMLElement;
    expect(customerSuccessBubble).toBeInstanceOf(HTMLElement);
    expect(customerSuccessBubble.style.left).toBe("42%");
    expect(customerSuccessBubble.style.top).toBe("38%");
    expect(customerSuccessBubble).toHaveClass("ai-value-vbd-function-bubble-deep-slow");
    expect(customerSuccessBubble.getAttribute("aria-label")).toMatch(/Deep but slow/i);
    const customerSuccessVbdOneMonth = {
      left: customerSuccessBubble.style.left,
      top: customerSuccessBubble.style.top
    };

    fireEvent.click(within(overlay).getByRole("button", { name: "12 months" }));
    expect(within(overlay).getByRole("button", { name: "12 months" })).toHaveAttribute("aria-pressed", "true");
    expect(within(overlay).getByText(/Window: 12 months/i)).toBeInTheDocument();
    expect(within(overlay).getByRole("button", { name: "VBD" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(customerSuccessBubble.style.left).not.toBe(customerSuccessVbdOneMonth.left);
    expect(customerSuccessBubble.style.top).not.toBe(customerSuccessVbdOneMonth.top);
    expect(customerSuccessBubble).toHaveClass("ai-value-vbd-function-bubble-flow");
    expect(customerSuccessBubble.getAttribute("aria-label")).toMatch(/High-fluency flow/i);
    const customerSuccessVbdTwelveMonths = {
      left: customerSuccessBubble.style.left,
      top: customerSuccessBubble.style.top
    };

    fireEvent.click(within(overlay).getByRole("button", { name: "VBD + Token" }));
    expect(within(overlay).getByRole("button", { name: "VBD + Token" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(customerSuccessBubble.style.left).toBe(customerSuccessVbdTwelveMonths.left);
    expect(customerSuccessBubble.style.top).toBe(customerSuccessVbdTwelveMonths.top);
    expect(customerSuccessBubble).toHaveClass("ai-value-vbd-function-bubble-token-overlay");
    expect(customerSuccessBubble.getAttribute("aria-label")).toMatch(/aggregate token intensity/i);
    expect(within(map).queryByText(/Overall VBD Score/i)).not.toBeInTheDocument();
    expect(within(map).queryByText(/Quadrant Strength/i)).not.toBeInTheDocument();
    expect(within(map).getByText(/Token usage by quadrant/i)).toBeInTheDocument();
    expect(within(map).getByText(/Token usage by function/i)).toBeInTheDocument();
    expect(within(map).queryByRole("heading", { name: /Function review context/i })).not.toBeInTheDocument();
    expect(within(overlay).getByText(/High token context/i)).toBeInTheDocument();
    const quadrantContext = container.querySelector(".ai-value-vbd-token-quadrants");
    expect(quadrantContext).toBeInstanceOf(HTMLElement);
    expect(
      (graphic as HTMLElement).compareDocumentPosition(quadrantContext as HTMLElement) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    const customerSuccessTokenLeftAtTwelveMonths = customerSuccessBubble.style.left;
    fireEvent.click(within(overlay).getByRole("button", { name: "3 months" }));
    expect(customerSuccessBubble.style.left).not.toBe(customerSuccessTokenLeftAtTwelveMonths);
    expect(customerSuccessBubble.getAttribute("aria-label")).toMatch(/aggregate token intensity Very high/i);

    expect(container.querySelectorAll(".ai-value-vbd-function-bubble")).toHaveLength(17);
    expect(container.textContent).not.toMatch(/highest|leader|leaderboard|rank|function usage order/i);
    expect(container.textContent).not.toMatch(
      /680000|420000|10968|2194|org-synthetic|evidence_snapshot|token_probe|source_readiness|aggregate_interaction_count|users_in_scope|workflow_id|customer_id|pilot_id|source_id/i
    );
    expectNoUnsafeUiLanguage(container.textContent, [
      "live telemetry",
      "real-time",
      "cost savings",
      "token savings",
      "ROI proof",
      uiTerm("manager", " ", "ranking"),
      uiTerm("team", " ", "ranking")
    ]);
  });

  it("keeps the contract-only VBD token pilot runner out of the VBD UI step", () => {
    const { container } = renderWorkspace("/ai-value-workspace/vbd");

    expect(screen.queryByRole("region", { name: /VBD token pilot movement review/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/VBD and token movement/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Replicate governed pattern/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Baseline window/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Comparison window/i)).not.toBeInTheDocument();

    expectNoUnsafeUiLanguage(container.textContent);
  });

  it("redirects demoted evidence, scenario, and readout pages to spine steps", () => {
    const evidence = renderWorkspace("/ai-value-workspace/evidence");
    expect(screen.getByRole("region", { name: /Evidence Checkpoint workspace/i })).toBeInTheDocument();
    expect(
      within(screen.getByRole("navigation", { name: "Workspace" })).getByRole("link", {
        current: "page"
      })
    ).toHaveTextContent("Value cases");
    evidence.unmount();

    const scenario = renderWorkspace("/ai-value-workspace/scenario");
    expect(screen.getByRole("region", { name: /Evidence Checkpoint workspace/i })).toBeInTheDocument();
    expect(
      within(screen.getByRole("navigation", { name: "Workspace" })).getByRole("link", {
        current: "page"
      })
    ).toHaveTextContent("Value cases");
    scenario.unmount();

    renderWorkspace("/ai-value-workspace/readout");
    const activeLink = within(screen.getByRole("navigation", { name: "Workspace" })).getByRole(
      "link",
      { current: "page" }
    );
    expect(activeLink).toHaveTextContent("Decisions");
  });

  it("closes the loop from the Executive Report back to AI Fluency Evidence", () => {
    renderWorkspace("/ai-value-workspace/decisions");
    const checkpointAccess = screen.getByRole("region", { name: /Evidence Checkpoint access/i });
    expect(checkpointAccess).toBeInTheDocument();
    expect(within(checkpointAccess).getByText(/selected outcome metric/i)).toBeInTheDocument();
    expect(within(checkpointAccess).queryByText(/No outcome metric selected/i)).not.toBeInTheDocument();
    expect(within(checkpointAccess).queryByText(/No workflow selected yet/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open Evidence Checkpoint/i })).toHaveAttribute(
      "href",
      "/ai-value-workspace/case"
    );
    expect(screen.getByRole("link", { name: /Remeasure from AI Fluency/i })).toHaveAttribute(
      "href",
      "/ai-value-workspace/readiness"
    );
  });
});

describe("AIValueWorkspace journey continuity", () => {
  const journeyObjects = [
    {
      object_type: "engagement",
      object_id: "engagement_support",
      workflow_family: null,
      valid: true,
      validation: { client_id: "client_support" }
    },
    {
      object_type: "blueprint",
      object_id: "bp_support",
      workflow_family: "customer_support_case_resolution",
      valid: true,
      validation: {}
    },
    {
      object_type: "metrics_library",
      object_id: "metrics_support",
      workflow_family: "customer_support_case_resolution",
      valid: true,
      validation: { metric_count: 1 }
    },
    {
      object_type: "evidence_readiness",
      object_id: "readiness_v1",
      workflow_family: "customer_support_case_resolution",
      valid: true,
      validation: { decision: "HOLD_FOR_ASSUMPTIONS" }
    },
    {
      object_type: "outcome_evidence_export",
      object_id: "export_v1",
      workflow_family: "customer_support_case_resolution",
      valid: true,
      validation: { review_state: "SUBMITTED" }
    },
    {
      object_type: "roi_scenario",
      object_id: "roi_support",
      workflow_family: "customer_support_case_resolution",
      valid: true,
      validation: {}
    },
    {
      object_type: "executive_packet",
      object_id: "packet_v1",
      workflow_family: "customer_support_case_resolution",
      valid: true,
      validation: {}
    }
  ];

  const journeyDetails: Record<string, Record<string, unknown>> = {
    "engagement/engagement_support": {
      engagement_id: "engagement_support",
      client: {
        client_id: "client_support",
        client_name: "Northstar Support"
      },
      business_objectives: [
        {
          objective_id: "support_capacity",
          objective_statement: "Create support capacity by reducing resolution effort.",
          success_measures: [
            {
              measure: "Reduce median support resolution hours",
              expected_direction: "REDUCE"
            }
          ]
        }
      ]
    },
    "blueprint/bp_support": {
      workflow_family: "customer_support_case_resolution",
      workflow_name: "Support case resolution",
      value_routes: { primary: "CAPACITY_CREATION" }
    },
    "metrics_library/metrics_support": {
      workflow_family: "customer_support_case_resolution",
      metrics: [
        {
          metric_id: "support_resolution_hours",
          workflow_family: "customer_support_case_resolution",
          name: "Median resolution time",
          value_route: "CAPACITY_CREATION",
          source_system: {
            source_type: "support_system",
            source_name: "Support case management system",
            approved_grain: "aggregate workflow window"
          },
          measurement_unit: "hours",
          baseline_rule: "Compare against an approved pre-period window.",
          allowed_claim_level: "CAVEATED_VALUE_INVESTIGATION"
        }
      ]
    },
    "evidence_readiness/readiness_v1": {
      source_coverage: {
        ai_activity: "PRESENT",
        workflow: "PRESENT",
        baseline: "MISSING",
        assumptions: "CAVEATED",
        trust: "PRESENT",
        suppression: "PRESENT"
      },
      next_actions: [
        "Review missing staffing, rollout, baseline, and metric assumptions with customer owners."
      ]
    },
    "roi_scenario/roi_support": {
      roi_scenario_id: "roi_support",
      workflow: {
        workflow_family: "customer_support_case_resolution",
        workflow_name: "Support case resolution",
        value_route: "CAPACITY_CREATION"
      },
      evidence_status: {
        readiness_decision: "HOLD_FOR_ASSUMPTIONS",
        outcome_evidence_review_state: "SUBMITTED",
        source_coverage: {
          ai_activity: "PRESENT",
          workflow: "PRESENT",
          outcome: "PRESENT",
          baseline: "PRESENT",
          trust: "PRESENT",
          assumptions: "CAVEATED",
          suppression: "PRESENT"
        }
      },
      baseline_comparison: {
        baseline_window: {
          state: "PRESENT",
          owner: "support_operations",
          rule: "Compare against an approved pre-period window."
        },
        comparison_window: {
          state: "PRESENT",
          owner: "support_operations",
          rule: "Compare against the approved post-period window; report directional movement only."
        }
      },
      metric_models: [
        {
          metric_id: "support_median_resolution_hours",
          name: "Median resolution time",
          value_route: "CAPACITY_CREATION",
          measurement_unit: "hours",
          source_system: {
            source_type: "support_system",
            source_name: "Support case management system",
            approved_grain: "aggregate_workflow_window"
          },
          baseline_rule: "Compare against an approved pre-period window.",
          comparison_rule: "Compare against the approved post-period window.",
          formula_template: "aggregate comparison only; customer computes directional delta",
          allowed_claim_level: "CAVEATED_VALUE_INVESTIGATION",
          value_model_role: "PRIMARY"
        }
      ],
      customer_owned_assumptions: [
        {
          assumption_id: "case_mix_stability",
          state: "PRESENT",
          owner: "support_operations"
        },
        {
          assumption_id: "staffing_and_coverage_context",
          state: "MISSING",
          owner: "support_leader"
        }
      ],
      scenario_bands: [
        {
          band: "CONSERVATIVE",
          interpretation: "Use the narrowest customer-owned assumption set.",
          included_metric_ids: ["support_median_resolution_hours"]
        },
        {
          band: "BASE_CASE",
          interpretation: "Use approved baseline and comparison windows with current caveats.",
          included_metric_ids: ["support_median_resolution_hours"]
        },
        {
          band: "EXPANDED",
          interpretation: "Use only after customer assumptions and outcome evidence are accepted.",
          included_metric_ids: ["support_median_resolution_hours"]
        }
      ],
      safe_value_language: {
        allowed_claim_level: "CAVEATED_VALUE_INVESTIGATION",
        allowed_phrases: [
          "Potential capacity-creation opportunity for customer-owned validation."
        ],
        required_caveats: [
          "Scenario bands are planning ranges, not realized ROI.",
          "This artifact does not create customer-facing economic output."
        ],
        blocked_claims: [
          "roi_proof",
          "causality_claim",
          "individual_scoring",
          "team_or_manager_ranking",
          "hr_analytics",
          "productivity_measurement",
          "realized_roi_calculation",
          "customer_facing_economic_output"
        ]
      },
      economic_output_policy: {
        mode: "MODELED_RANGE_ONLY",
        customer_facing_economic_output: false,
        dollarized_output: false,
        realized_roi_calculation: false
      }
    }
  };

  const cloneJourneyDetails = () =>
    JSON.parse(JSON.stringify(journeyDetails)) as Record<string, Record<string, unknown>>;

  const withOutcomeReviewState = (state: "MISSING" | "SUBMITTED" | "ACCEPTED" | "REJECTED") => {
    const nextDetails = cloneJourneyDetails();
    const roiScenario = nextDetails["roi_scenario/roi_support"] as Record<string, any>;
    roiScenario.evidence_status.outcome_evidence_review_state = state;
    const nextObjects =
      state === "MISSING"
        ? journeyObjects.filter((item) => item.object_type !== "outcome_evidence_export")
        : journeyObjects.map((item) =>
            item.object_type === "outcome_evidence_export"
              ? { ...item, validation: { review_state: state } }
              : item
          );
    return { objects: nextObjects, details: nextDetails };
  };

  const withRealEvidenceReadiness = () => {
    const nextDetails = cloneJourneyDetails();
    const readiness = nextDetails["evidence_readiness/readiness_v1"] as Record<string, any>;
    readiness.source_refs = {
      v3_verdict_id: "verdict_real_evidence_v1",
      velocity_observations_ref: "velocity_observations:3",
      outcome_evidence_export_id: "export_v1"
    };
    return { objects: journeyObjects, details: nextDetails };
  };

  const stubJourneyFetch = (
    objects: Array<Record<string, unknown>>,
    details: Record<string, Record<string, unknown>> = journeyDetails
  ) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/ai-value/readout/")) {
          return new Response("<html>Executive report</html>", {
            status: 200,
            headers: { "content-type": "text/html" }
          });
        }
        for (const [path, payload] of Object.entries(details)) {
          if (url.includes(`/ai-value/objects/${path}`)) {
            const [object_type, object_id] = path.split("/");
            return jsonResponse({
              object_type,
              object_id,
              schema_version: "test",
              workflow_family: "customer_support_case_resolution",
              valid: true,
              validation: {},
              updated_at: "2026-06-10T00:00:00Z",
              payload
            });
          }
        }
        if (url.includes("/ai-value/objects")) {
          return jsonResponse({ objects });
        }
        return jsonResponse({ objects: [] });
      })
    );
  };

  const stubMaterializerFetch = (
    materializerBody: Record<string, unknown>,
    objectsAfterMaterialize: Array<Record<string, unknown>>,
    detailsAfterMaterialize: Record<string, Record<string, unknown>>
  ) => {
    let materializerCalled = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/ai-value/materialize/real-evidence")) {
          materializerCalled = true;
          return jsonResponse(materializerBody);
        }
        const objects = materializerCalled ? objectsAfterMaterialize : journeyObjects;
        const details = materializerCalled ? detailsAfterMaterialize : journeyDetails;
        for (const [path, payload] of Object.entries(details)) {
          if (url.includes(`/ai-value/objects/${path}`)) {
            const [object_type, object_id] = path.split("/");
            return jsonResponse({
              object_type,
              object_id,
              schema_version: "test",
              workflow_family: "customer_support_case_resolution",
              valid: true,
              validation: {},
              updated_at: "2026-06-10T00:00:00Z",
              payload
            });
          }
        }
        if (url.includes("/ai-value/objects")) {
          return jsonResponse({ objects });
        }
        return jsonResponse({ objects: [] });
      })
    );
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });


  it("keeps ROI Bot scenario packaging blocked by the promoted report-output contract", async () => {
    expect(workspaceSource).toMatch(/promoted report-output contract/i);
    expect(workspaceSource).not.toMatch(
      /HTML or PPTX output may carry caveats after FluencyTracr report review is applied/i
    );
  });

  it("turns the metrics page into the function outcome metric step", async () => {
    stubJourneyFetch(journeyObjects);
    const { container } = renderWorkspace("/ai-value-workspace/metrics");

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Outcome metric setup/i })).toBeInTheDocument();
    });

    expect(
      within(screen.getByRole("region", { name: /Metric review guide/i })).getByRole("heading", {
        name: "Metric Review"
      })
    ).toBeInTheDocument();
    const bridge = screen.getByRole("region", { name: /Outcome metric setup/i });
    expect(within(bridge).getByRole("heading", { name: /Choose function and outcome metrics/i })).toBeInTheDocument();
    const functionSelect = within(bridge).getByRole("combobox", { name: /Org function/i }) as HTMLSelectElement;
    expect(functionSelect.options).toHaveLength(17);
    expect(within(functionSelect).getByRole("option", { name: "Data & Analytics" })).toBeInTheDocument();
    expect(within(functionSelect).getByRole("option", { name: "Legal & Compliance" })).toBeInTheDocument();
    expect(within(functionSelect).getByRole("option", { name: "Education or Training" })).toBeInTheDocument();

    fireEvent.change(functionSelect, { target: { value: "Engineering / Software Development" } });
    const deploymentFrequency = within(bridge).getByRole("checkbox", { name: /Deployment Frequency/i });
    const leadTimeForChanges = within(bridge).getByRole("checkbox", { name: /Lead Time for Changes/i });
    const codeReviewTurnaround = within(bridge).getByRole("checkbox", { name: /Code Review Turnaround Time/i });
    expect(deploymentFrequency).toBeChecked();
    fireEvent.click(leadTimeForChanges);
    fireEvent.click(codeReviewTurnaround);
    expect(leadTimeForChanges).toBeChecked();
    expect(codeReviewTurnaround).toBeChecked();
    const watchPlan = within(bridge).getByRole("region", { name: /VBD metric watch plan/i });
    expect(within(watchPlan).getByText(/Engineering \/ Software Development/i)).toBeInTheDocument();
    expect(within(watchPlan).getByText(/Deployment Frequency/i)).toBeInTheDocument();
    expect(within(watchPlan).getByText(/Lead Time for Changes/i)).toBeInTheDocument();
    expect(within(watchPlan).getByText(/Code Review Turnaround Time/i)).toBeInTheDocument();
    expect(within(watchPlan).getByText(/Compare selected outcomes against Velocity, Breadth, and Depth movement over time/i)).toBeInTheDocument();
    const storedMetricHandoff = JSON.parse(localStorage.getItem(SELECTED_OUTCOME_METRICS_KEY) ?? "{}");
    expect(storedMetricHandoff.functionArea).toBe("Engineering / Software Development");
    expect(storedMetricHandoff.metrics.map((metric: { name: string }) => metric.name)).toEqual([
      "Deployment Frequency",
      "Lead Time for Changes",
      "Code Review Turnaround Time"
    ]);
    expect(storedMetricHandoff.metrics[0]).toMatchObject({
      sourceSystem: "CI/CD system",
      measurementUnit: "deployments per week",
      owner: "Engineering Operations"
    });
    expect(within(bridge).getAllByText(/Support Operations/i).length).toBeGreaterThan(0);
    const candidateMetrics = screen.getByRole("article", { name: /Candidate outcome metrics/i });
    expect(candidateMetrics).toBeInTheDocument();
    expect(within(candidateMetrics).getByText(/Engineering \/ Software Development/i)).toBeInTheDocument();
    expect(within(candidateMetrics).getByText(/Is production deployment frequency increasing/i)).toBeInTheDocument();
    expect(within(candidateMetrics).getByText("Deployment Frequency")).toBeInTheDocument();
    expect(within(candidateMetrics).queryByText(/Are cases resolving faster/i)).not.toBeInTheDocument();

    fireEvent.change(functionSelect, { target: { value: "IT Systems or Security" } });
    expect(within(bridge).getAllByText(/Mean Time to Resolution/i).length).toBeGreaterThan(0);
    expect(within(bridge).getByText(/First Contact Resolution Rate/i)).toBeInTheDocument();
    expect(within(bridge).getByText(/Cost per Ticket/i)).toBeInTheDocument();
    expect(within(candidateMetrics).getByText(/IT Systems or Security/i)).toBeInTheDocument();
    expect(within(candidateMetrics).getByText(/Are IT tickets resolving faster/i)).toBeInTheDocument();
    expect(within(candidateMetrics).getByText("Cost per Ticket")).toBeInTheDocument();

    fireEvent.change(functionSelect, { target: { value: "Data & Analytics" } });
    expect(within(bridge).getAllByText(/Analytics request cycle time/i).length).toBeGreaterThan(0);
    expect(within(bridge).getByText(/Dashboard adoption rate/i)).toBeInTheDocument();
    expect(within(candidateMetrics).getByText(/Data & Analytics/i)).toBeInTheDocument();
    expect(within(candidateMetrics).getByText(/Are analytics requests moving faster/i)).toBeInTheDocument();
    expect(within(candidateMetrics).getByText(/Analytics request cycle time/i)).toBeInTheDocument();
    expect(within(candidateMetrics).queryByText(/Is production deployment frequency increasing/i)).not.toBeInTheDocument();

    fireEvent.change(functionSelect, { target: { value: "Customer or Account Success" } });
    expect(within(bridge).getByText(/Customer onboarding time/i)).toBeInTheDocument();
    expect(within(bridge).getByText(/Time to First Value/i)).toBeInTheDocument();
    expect(within(bridge).getByText(/QBR preparation time/i)).toBeInTheDocument();
    expect(within(candidateMetrics).getByText(/Customer or Account Success/i)).toBeInTheDocument();
    expect(within(candidateMetrics).getByText(/Are customers reaching implementation faster/i)).toBeInTheDocument();

    fireEvent.change(functionSelect, { target: { value: "Education or Training" } });
    expect(within(bridge).getAllByText(/Training Material Creation Time/i).length).toBeGreaterThan(0);
    expect(within(bridge).getByText(/Learning Resource Discovery Time/i)).toBeInTheDocument();
    expect(within(candidateMetrics).getByText(/Education or Training/i)).toBeInTheDocument();
    expect(within(candidateMetrics).getByText(/Can learners find relevant resources faster/i)).toBeInTheDocument();

    fireEvent.change(functionSelect, { target: { value: "Finance or Accounting" } });
    expect(within(candidateMetrics).getByText(/Finance or Accounting/i)).toBeInTheDocument();
    expect(within(candidateMetrics).getByText(/Is the close cycle getting shorter/i)).toBeInTheDocument();
    expect(within(candidateMetrics).getByText(/Close cycle time/i)).toBeInTheDocument();
    expect(within(candidateMetrics).queryByText(/Is production deployment frequency increasing/i)).not.toBeInTheDocument();

    fireEvent.change(functionSelect, { target: { value: "Customer or Account Success" } });
    expect(within(bridge).getByRole("checkbox", { name: /Median resolution time/i })).toBeChecked();

    // The old step-guide and duplicate opportunity map stay removed.
    expect(screen.queryByText(/Step 4 of 8/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Outcome and ROI opportunity map/i })).not.toBeInTheDocument();

    const reportingSpine = screen.getByRole("region", {
      name: /AI contribution reporting spine/i
    });
    expect(within(reportingSpine).getByText(/Candidate metric recommendations are planning inputs/i)).toBeInTheDocument();
    expect(within(reportingSpine).getByText(/Selected metric approval/i)).toBeInTheDocument();
    expect(within(reportingSpine).getByText(/Held for reviewer approval/i)).toBeInTheDocument();
    expect(within(reportingSpine).getByText(/Reviewer metric-selection draft intake/i)).toBeInTheDocument();
    expect(within(reportingSpine).getByText(/Comparison-design intake readiness/i)).toBeInTheDocument();
    expect(
      within(reportingSpine).getAllByText(/Source package draft assembly/i).length
    ).toBeGreaterThan(0);
    expect(
      within(reportingSpine).getAllByText(/Reviewer-owned source package collection/i).length
    ).toBeGreaterThan(0);
    expect(
      within(reportingSpine).getAllByText(/Comparison-design source package review/i).length
    ).toBeGreaterThan(0);
    expect(within(reportingSpine).getByText(/Draft intake held/i)).toBeInTheDocument();
    expect(within(reportingSpine).getByText(/Readiness held/i)).toBeInTheDocument();
    expect(
      within(reportingSpine).getByText(/Choose a candidate metric before draft intake preparation/i)
    ).toBeInTheDocument();
    const adapterView = within(reportingSpine).getByRole("region", {
      name: /AI value UI view model/i
    });
    expect(
      within(adapterView).getByRole("heading", { name: /Metrics Recommended/i })
    ).toBeInTheDocument();
    expect(within(adapterView).getByText(/Step 3 of 13/i)).toBeInTheDocument();
    expect(within(adapterView).getByText(/Model review blocked/i)).toBeInTheDocument();
    expect(
      within(adapterView).queryByText(/Evidence streams for review/i)
    ).not.toBeInTheDocument();
    expect(
      within(adapterView).queryByText(/AI Fluency Instrument \(SED\)/i)
    ).not.toBeInTheDocument();
    expect(adapterView.textContent).not.toMatch(
      /confidence|probability|posterior|source_ref|source_hash|reviewer_owned_payload|employee_id|prompt|transcript|[a-f0-9]{64}/i
    );

    fireEvent.click(within(bridge).getByRole("checkbox", { name: /Time to First Value/i }));
    expect(within(reportingSpine).getByText(/Draft intake held/i)).toBeInTheDocument();

    const customerSuccessWatchPlan = within(bridge).getByRole("region", {
      name: /VBD metric watch plan/i
    });
    const medianResolutionItem = within(customerSuccessWatchPlan)
      .getByText(/^Median resolution time$/)
      .closest("li") as HTMLElement;
    fireEvent.click(
      within(medianResolutionItem).getByRole("button", { name: /Prepare draft intake/i })
    );

    expect(within(reportingSpine).getByText(/Local selection only/i)).toBeInTheDocument();
    expect(within(reportingSpine).getByText(/Draft selected metric prepared/i)).toBeInTheDocument();
    expect(
      within(adapterView).getByRole("heading", { name: /Measurement Plan Drafted/i })
    ).toBeInTheDocument();
    expect(within(adapterView).getByText(/Step 4 of 13/i)).toBeInTheDocument();
    expect(within(reportingSpine).getByText(/Ready for draft package review/i)).toBeInTheDocument();
    expect(within(reportingSpine).getByText(/Reviewer approval still required/i)).toBeInTheDocument();
    const draftSelectedMetric = within(reportingSpine)
      .getByText(/Draft selected metric candidate/i)
      .closest(".ai-value-map-cell") as HTMLElement;
    expect(within(draftSelectedMetric).getByText(/^Median resolution time$/)).toBeInTheDocument();
    expect(
      within(reportingSpine).getAllByText(/Metric owner \/ reviewer role/i).length
    ).toBeGreaterThan(0);
    expect(within(reportingSpine).getByText(/Expected direction/i)).toBeInTheDocument();
    expect(
      within(reportingSpine).getByText(/Direction requires reviewer expectation path/i)
    ).toBeInTheDocument();
    expect(within(reportingSpine).getByText(/Baseline source posture/i)).toBeInTheDocument();
    expect(
      within(reportingSpine).getByText(/Suppression, missing, or held window precheck required/i)
    ).toBeInTheDocument();
    expect(within(reportingSpine).getByText(/Draft package ready for review preparation/i)).toBeInTheDocument();
    expect(
      within(reportingSpine).getAllByText(/Complete comparison-design source package draft review/i)
        .length
    ).toBeGreaterThan(0);
    expect(
      within(reportingSpine).getAllByText(/Draft review required/i).length
    ).toBeGreaterThan(0);
    expect(within(reportingSpine).getByText(/Collection held/i)).toBeInTheDocument();
    expect(within(reportingSpine).getByText(/Source package review held/i)).toBeInTheDocument();
    expect(
      within(reportingSpine).queryByText(
        /Collect reviewer-owned comparison-design source package outside product flow/i
      )
    ).not.toBeInTheDocument();
    expect(
      within(reportingSpine).getByText(/Collection stays held until the draft source package review is complete/i)
    ).toBeInTheDocument();
    expect(
      within(reportingSpine).getByText(/Pending attestation: metric-selection review/i)
    ).toBeInTheDocument();
    expect(
      within(reportingSpine).getByText(/Pending attestation: expectation path direction and lag review/i)
    ).toBeInTheDocument();
    expect(
      within(reportingSpine).getByText(/Source package draft assembly does not create governed evidence/i)
    ).toBeInTheDocument();
    expect(
      within(reportingSpine).getByText(/Reviewer-owned collection remains outside this product flow/i)
    ).toBeInTheDocument();
    expect(
      within(reportingSpine).getAllByText(
        /Source package review checks reviewer-owned completeness and admissibility only/i
      ).length
    ).toBeGreaterThan(0);
    expect(
      within(reportingSpine).getByText(/Comparison-design readiness does not create a source package/i)
    ).toBeInTheDocument();
    expect(
      within(reportingSpine).getByText(/Draft intake does not approve the metric/i)
    ).toBeInTheDocument();
    expect(within(reportingSpine).getByText(/Milestone plan/i)).toBeInTheDocument();
    expect(
      within(reportingSpine).getAllByText(/Missing comparison-design source package/i)
        .length
    ).toBeGreaterThan(0);
    const draftMilestoneSchedule = within(reportingSpine)
      .getByText(/Draft milestone schedule/i)
      .closest(".ai-value-map-cell") as HTMLElement;
    const milestonePlan = within(reportingSpine)
      .getByText(/^Milestone plan$/i)
      .closest(".ai-value-map-cell") as HTMLElement;
    for (const milestone of ["T0", "T30", "T60", "T90", "T120", "T180", "T270", "T365"]) {
      expect(within(draftMilestoneSchedule).getByText(milestone)).toBeInTheDocument();
      expect(within(milestonePlan).getByText(milestone)).toBeInTheDocument();
    }
    expect(
      within(reportingSpine).getAllByText(/Complete reviewer metric selection approval/i)
        .length
    ).toBeGreaterThan(0);

    expectNoUnsafeUiLanguage(container.textContent, [
      uiTerm("metrics", "_", "library")
    ]);
  });

  it("auto-saves selected outcome metrics by function while keeping the active handoff", async () => {
    stubJourneyFetch(journeyObjects);
    renderWorkspace("/ai-value-workspace/metrics");

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Outcome metric setup/i })).toBeInTheDocument();
    });

    const bridge = screen.getByRole("region", { name: /Outcome metric setup/i });
    const functionSelect = within(bridge).getByRole("combobox", { name: /Org function/i }) as HTMLSelectElement;

    fireEvent.change(functionSelect, { target: { value: "Engineering / Software Development" } });
    fireEvent.click(within(bridge).getByRole("checkbox", { name: /Lead Time for Changes/i }));
    fireEvent.click(within(bridge).getByRole("checkbox", { name: /Code Review Turnaround Time/i }));

    fireEvent.change(functionSelect, { target: { value: "Data & Analytics" } });
    fireEvent.click(within(bridge).getByRole("checkbox", { name: /Dashboard adoption rate/i }));

    fireEvent.change(functionSelect, { target: { value: "Engineering / Software Development" } });
    expect(within(bridge).getByRole("checkbox", { name: /Lead Time for Changes/i })).toBeChecked();
    expect(within(bridge).getByRole("checkbox", { name: /Code Review Turnaround Time/i })).toBeChecked();

    const storedWatchPlan = JSON.parse(
      localStorage.getItem(SELECTED_OUTCOME_METRIC_WATCH_PLAN_KEY) ?? "{}"
    );
    expect(storedWatchPlan.activeFunctionArea).toBe("Engineering / Software Development");
    expect(
      storedWatchPlan.selectionsByFunction["Engineering / Software Development"].metrics.map(
        (metric: { name: string }) => metric.name
      )
    ).toEqual([
      "Deployment Frequency",
      "Lead Time for Changes",
      "Code Review Turnaround Time"
    ]);
    expect(
      storedWatchPlan.selectionsByFunction["Data & Analytics"].metrics.map(
        (metric: { name: string }) => metric.name
      )
    ).toEqual(["Analytics request cycle time", "Dashboard adoption rate"]);

    const activeHandoff = JSON.parse(localStorage.getItem(SELECTED_OUTCOME_METRICS_KEY) ?? "{}");
    expect(activeHandoff.functionArea).toBe("Engineering / Software Development");
    expect(activeHandoff.metrics.map((metric: { name: string }) => metric.name)).toEqual([
      "Deployment Frequency",
      "Lead Time for Changes",
      "Code Review Turnaround Time"
    ]);
  });

  it("keeps function-based metric choice while showing modeled readiness checks for selected metrics", async () => {
    stubJourneyFetch(journeyObjects);
    renderWorkspace("/ai-value-workspace/metrics");

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Outcome metric setup/i })).toBeInTheDocument();
    });

    const bridge = screen.getByRole("region", { name: /Outcome metric setup/i });
    const functionSelect = within(bridge).getByRole("combobox", { name: /Org function/i }) as HTMLSelectElement;

    fireEvent.change(functionSelect, { target: { value: "Sales or Business Development" } });
    expect(within(bridge).getByRole("checkbox", { name: /Pipeline velocity improvement/i })).toBeInTheDocument();
    expect(within(bridge).queryByRole("checkbox", { name: /Forecast variance/i })).not.toBeInTheDocument();

    fireEvent.click(within(bridge).getByRole("checkbox", { name: /Pipeline velocity improvement/i }));

    const watchPlan = within(bridge).getByRole("region", { name: /VBD metric watch plan/i });
    const scenario = within(watchPlan).getByRole("region", { name: /Illustrative review scenario/i });
    expect(within(watchPlan).getByText(/Same-window context for review, not attribution/i)).toBeInTheDocument();
    expect(within(watchPlan).getByText(/Month 1 0% baseline .* Month 6 \+8.5%/i)).toBeInTheDocument();
    expect(within(watchPlan).getAllByText(/Pipeline velocity improvement/i).length).toBeGreaterThan(1);
    expect(within(watchPlan).getByText(/AI Fluency 64% to 77%/i)).toBeInTheDocument();
    expect(within(watchPlan).getByText(/VBD 72\/76\/74 to 77\/81\/78/i)).toBeInTheDocument();
    expect(
      within(watchPlan).getByText(
        /Aggregate token intensity context changed from 74 to 79; not a value, productivity, or efficiency score/i
      )
    ).toBeInTheDocument();
    expect(within(scenario).getByText(/Readiness check/i)).toBeInTheDocument();
    expect(
      within(scenario).getByText(/Candidate for business-owner review after evidence and controls check/i)
    ).toBeInTheDocument();
    expect(
      within(scenario).getByText(
        /Planning-only comparison range \+2% to \+12%; not predicted or attributed movement/i
      )
    ).toBeInTheDocument();
    expect(within(scenario).getByText(/Aggregate sample basis 1,250 to 1,410 aggregate responses/i)).toBeInTheDocument();
    expect(
      within(watchPlan).getByText(
        /Finance review status: no FluencyTracr financial calculation; any finance context must come from customer-owned review/i
      )
    ).toBeInTheDocument();
    expect(within(watchPlan).getByText(/Review candidate only/i)).toBeInTheDocument();
    expect(
      within(watchPlan).getByText(/does not prove ROI, causality, productivity/i)
    ).toBeInTheDocument();
    expect(scenario.textContent).not.toMatch(/synthetic/i);

    const storedWatchPlan = JSON.parse(
      localStorage.getItem(SELECTED_OUTCOME_METRIC_WATCH_PLAN_KEY) ?? "{}"
    );
    const pipelineMetric = storedWatchPlan.selectionsByFunction[
      "Sales or Business Development"
    ].metrics.find((metric: { id: string }) => metric.id === "sales-pipeline-velocity");
    expect(pipelineMetric).toMatchObject({
      id: "sales-pipeline-velocity",
      name: "Pipeline velocity improvement",
      sourceSystem: "CRM",
      measurementUnit: "percentage",
      owner: "Revenue Operations"
    });
    expect(pipelineMetric.movementScenario).toBeUndefined();
  });

  it("falls back for stale saved metric IDs", async () => {
    const savedWatchPlan = (metrics: Array<Record<string, string>>) => ({
      activeFunctionArea: "Customer or Account Success",
      selectionsByFunction: {
        "Customer or Account Success": {
          functionArea: "Customer or Account Success",
          quadrantLabel: "Deep but slow",
          vbdBaseline: "Velocity 42 · Breadth 55 · Depth 66",
          metrics
        }
      }
    });
    const staleMetric = {
      id: "stale-support-resolution-metric",
      name: "Legacy resolution metric",
      question: "Did a previous saved metric survive?",
      valueRoute: "Capacity creation",
      sourceSystem: "Legacy support system",
      measurementUnit: "hours",
      owner: "Support Operations",
      watches: "Legacy saved selection"
    };

    localStorage.setItem(
      SELECTED_OUTCOME_METRIC_WATCH_PLAN_KEY,
      JSON.stringify(savedWatchPlan([staleMetric]))
    );
    stubJourneyFetch(journeyObjects);
    renderWorkspace("/ai-value-workspace/metrics");

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Outcome metric setup/i })).toBeInTheDocument();
    });

    const bridge = screen.getByRole("region", { name: /Outcome metric setup/i });
    expect(within(bridge).getByRole("checkbox", { name: /Median resolution time/i })).toBeChecked();
    expect(
      within(screen.getByRole("region", { name: /VBD metric watch plan/i })).getByText(
        /Median resolution time/i
      )
    ).toBeInTheDocument();
  });

  it("preserves an explicit empty saved metric selection", async () => {
    const savedWatchPlan = (metrics: Array<Record<string, string>>) => ({
      activeFunctionArea: "Customer or Account Success",
      selectionsByFunction: {
        "Customer or Account Success": {
          functionArea: "Customer or Account Success",
          quadrantLabel: "Deep but slow",
          vbdBaseline: "Velocity 42 · Breadth 55 · Depth 66",
          metrics
        }
      }
    });

    localStorage.setItem(
      SELECTED_OUTCOME_METRIC_WATCH_PLAN_KEY,
      JSON.stringify(savedWatchPlan([]))
    );

    stubJourneyFetch(journeyObjects);
    renderWorkspace("/ai-value-workspace/metrics");

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Outcome metric setup/i })).toBeInTheDocument();
    });

    const bridge = screen.getByRole("region", { name: /Outcome metric setup/i });
    expect(
      within(bridge).getByRole("checkbox", { name: /Median resolution time/i })
    ).not.toBeChecked();
    const watchPlan = screen.getByRole("region", { name: /VBD metric watch plan/i });
    expect(within(watchPlan).getByText(/Choose at least one client-owned metric/i)).toBeInTheDocument();
    expect(within(watchPlan).queryByText(/Median resolution time/i)).not.toBeInTheDocument();

    const reportingSpine = screen.getByRole("region", {
      name: /AI contribution reporting spine/i
    });
    fireEvent.click(within(bridge).getByRole("checkbox", { name: /Median resolution time/i }));
    expect(within(reportingSpine).getByText(/Draft intake held/i)).toBeInTheDocument();
    expect(within(reportingSpine).queryByText(/Local selection only/i)).not.toBeInTheDocument();
    const medianResolutionItem = within(watchPlan)
      .getByText(/^Median resolution time$/)
      .closest("li") as HTMLElement;
    fireEvent.click(
      within(medianResolutionItem).getByRole("button", { name: /Prepare draft intake/i })
    );
    expect(within(reportingSpine).getByText(/Draft selected metric prepared/i)).toBeInTheDocument();
    expect(within(reportingSpine).getByText(/Local selection only/i)).toBeInTheDocument();
  });

  it("lets users clear a default outcome metric selection", async () => {
    stubJourneyFetch(journeyObjects);
    renderWorkspace("/ai-value-workspace/metrics");

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Outcome metric setup/i })).toBeInTheDocument();
    });

    const bridge = screen.getByRole("region", { name: /Outcome metric setup/i });
    const functionSelect = within(bridge).getByRole("combobox", { name: /Org function/i }) as HTMLSelectElement;

    fireEvent.change(functionSelect, { target: { value: "Engineering / Software Development" } });
    const deploymentFrequency = within(bridge).getByRole("checkbox", { name: /Deployment Frequency/i });
    expect(deploymentFrequency).toBeChecked();

    fireEvent.click(deploymentFrequency);

    expect(deploymentFrequency).not.toBeChecked();
    await waitFor(() => {
      const storedWatchPlan = JSON.parse(
        localStorage.getItem(SELECTED_OUTCOME_METRIC_WATCH_PLAN_KEY) ?? "{}"
      );
      expect(
        storedWatchPlan.selectionsByFunction["Engineering / Software Development"].metrics
      ).toEqual([]);
    });

    const activeHandoff = JSON.parse(localStorage.getItem(SELECTED_OUTCOME_METRICS_KEY) ?? "{}");
    expect(activeHandoff.functionArea).toBe("Engineering / Software Development");
    expect(activeHandoff.metrics).toEqual([]);
  });

  it.each([
    {
      state: "ACCEPTED" as const,
      status: /Caveated sponsor review/i,
      included: /accepted aggregate Median resolution time evidence/i,
      held: /Realized ROI, causality, productivity, and individual scoring stay out/i,
      owner: /Support Operations and the sponsor/i,
      action: /Review the caveated report with accepted evidence/i,
      caveat: /Accepted evidence is caveated support only; it is not ROI proof and does not establish causality/i,
      canOpen: true
    },
    {
      state: "SUBMITTED" as const,
      status: /Review pending/i,
      included: /preview stays held until the submitted evidence is accepted or rejected/i,
      held: /Stronger value language stays held until Support Operations accepts or rejects the export/i,
      owner: /Support Operations/i,
      action: /Accept the export only if the metric, source, export level, baseline window, and comparison window match the request/i,
      caveat: /Submitted evidence does not validate value yet/i,
      canOpen: false
    },
    {
      state: "REJECTED" as const,
      status: /Corrected export needed/i,
      included: /preview stays held until a corrected aggregate export is accepted/i,
      held: /Validated value language stays held until a corrected aggregate export is accepted/i,
      owner: /Support Operations/i,
      action: /Keep stronger value language blocked until a corrected export is accepted/i,
      caveat: /Rejected evidence cannot support value claims/i,
      canOpen: false
    },
    {
      state: "MISSING" as const,
      status: /Data owner request needed/i,
      included: /preview stays held until the aggregate export arrives and passes review/i,
      held: /Outcome validation and stronger ROI language stay held until the aggregate export arrives and passes review/i,
      owner: /Support Operations/i,
      action: /Ask Support Operations for an aggregate Median resolution time export/i,
      caveat: /Missing evidence keeps the report in planning status/i,
      canOpen: false
    }
  ])("carries $state evidence into the Executive Report preview", async ({
    state,
    status,
    included,
    held,
    owner,
    action,
    caveat,
    canOpen
  }) => {
    const fixture = withOutcomeReviewState(state);
    stubJourneyFetch(fixture.objects, fixture.details);
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:workspace-readout-preview")
    });
    const { container } = renderWorkspace("/ai-value-workspace/decisions");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Executive Report Preview/i })).toBeInTheDocument();
    });

    const preview = screen.getByRole("region", { name: /Executive report preview/i });
    expect(within(preview).getByText(status)).toBeInTheDocument();
    expect(within(preview).getByText(included)).toBeInTheDocument();
    expect(within(preview).getByText(held)).toBeInTheDocument();
    expect(within(preview).getAllByText(owner).length).toBeGreaterThan(0);
    expect(within(preview).getByText(action)).toBeInTheDocument();
    expect(within(preview).getByText(caveat)).toBeInTheDocument();

    if (canOpen) {
      fireEvent.click(within(preview).getByRole("button", { name: /Open caveated internal preview/i }));
      await waitFor(() => {
        expect(open).toHaveBeenCalledWith("blob:workspace-readout-preview", "_blank", "noopener");
      });
    } else {
      expect(
        within(preview).queryByRole("button", { name: /Open caveated internal preview/i })
      ).not.toBeInTheDocument();
      expect(within(preview).getByText(/Preview held for evidence review/i)).toBeInTheDocument();
      expect(open).not.toHaveBeenCalled();
    }

    expectNoUnsafeUiLanguage(container.textContent, [
      uiTerm("workflow", "_", "family"),
      uiTerm("metric", "_", "id"),
      uiTerm("schema", "_", "version"),
      uiTerm("outcome", "_", "evidence", "_", "export"),
      uiTerm("executive", "_", "packet"),
      "export_v1"
    ]);
    expect(container.textContent).not.toMatch(/\bMISSING\b|\bSUBMITTED\b|\bACCEPTED\b|\bREJECTED\b/);
  });

  it("redirects the old ROI route into Evidence Checkpoint without exposing ROI modeling UI", async () => {
    stubJourneyFetch(journeyObjects);
    const { container } = renderWorkspace("/ai-value-workspace/roi");

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Evidence Checkpoint workspace/i })).toBeInTheDocument();
    });

    const activeLink = within(screen.getByRole("navigation", { name: "Workspace" })).getByRole(
      "link",
      { current: "page" }
    );
    expect(activeLink).toHaveTextContent("Value cases");
    const checkpoint = screen.getByRole("region", { name: /Evidence Checkpoint status/i });
    expect(within(checkpoint).getByRole("heading", { name: /Evidence Checkpoint/i })).toBeInTheDocument();
    expect(within(checkpoint).getByText(/Hypothesis binding/i)).toBeInTheDocument();
    expect(within(checkpoint).getByText(/Source package state/i)).toBeInTheDocument();
    expect(within(checkpoint).getAllByText(/Metric evidence/i).length).toBeGreaterThan(0);
    expect(within(checkpoint).getByText(/Day 0 \/ 30 \/ 60 \/ 90 \/ 180 \/ 365/i)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Value and ROI readiness/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /ROI Bot modeling context/i })).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(
      /ROI Bot modeling context|Value and ROI readiness|pricing|revenue|EBITDA|loaded-cost|Scenario bands/i
    );
    expect(screen.getByRole("link", { name: /Back to Metrics/i })).toHaveAttribute(
      "href",
      "/ai-value-workspace/metrics"
    );
    expect(screen.getByRole("link", { name: /Continue to Report/i })).toHaveAttribute(
      "href",
      "/ai-value-workspace/decisions"
    );

    expectNoUnsafeUiLanguage(container.textContent, [
      uiTerm("workflow", "_", "family"),
      uiTerm("metric", "_", "id"),
      "roi_scenario"
    ]);
  });

  it("updates the workspace decision handoff preview locally when a different move is selected", async () => {
    const fixture = withOutcomeReviewState("ACCEPTED");
    stubJourneyFetch(fixture.objects, fixture.details);
    const { container } = renderWorkspace("/ai-value-workspace/decisions");

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Sponsor decision loop/i })).toBeInTheDocument();
    });

    const decision = screen.getByRole("region", { name: /Sponsor decision loop/i });
    let preview = within(decision).getByRole("region", { name: /Decision handoff preview/i });
    await waitFor(() => {
      expect(within(preview).getAllByText(/Expand workflow/i).length).toBeGreaterThan(0);
    });

    fireEvent.click(within(decision).getByRole("button", { name: /Select Hold value language/i }));

    preview = within(decision).getByRole("region", { name: /Decision handoff preview/i });
    expect(within(preview).getAllByText(/Hold value language/i).length).toBeGreaterThan(0);
    expect(within(preview).getByText(/Value report owner/i)).toBeInTheDocument();
    expect(within(preview).getByText(/Holding value language prevents unsupported ROI, causality, or productivity claims/i)).toBeInTheDocument();

    expectNoUnsafeUiLanguage(container.textContent, [
      uiTerm("workflow", "_", "family"),
      uiTerm("metric", "_", "id"),
      uiTerm("schema", "_", "version"),
      uiTerm("outcome", "_", "evidence", "_", "export"),
      uiTerm("agent", "_", "run"),
      "export_v1"
    ]);
    expect(container.textContent).not.toMatch(/\bMISSING\b|\bSUBMITTED\b|\bACCEPTED\b|\bREJECTED\b/);
  });

  it("copies the workspace selected decision handoff as a governed local draft", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText }
    });
    const fixture = withOutcomeReviewState("ACCEPTED");
    stubJourneyFetch(fixture.objects, fixture.details);
    renderWorkspace("/ai-value-workspace/decisions");

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Sponsor decision loop/i })).toBeInTheDocument();
    });

    const decision = screen.getByRole("region", { name: /Sponsor decision loop/i });
    fireEvent.click(within(decision).getByRole("button", { name: /Select Hold value language/i }));

    const bundle = within(decision).getByRole("region", { name: /Copy-ready decision handoff/i });
    expect(within(bundle).getByText(/Selected move: Hold value language/i)).toBeInTheDocument();

    fireEvent.click(within(bundle).getByRole("button", { name: /Copy handoff draft/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        expect.stringContaining("Selected move: Hold value language")
      );
    });
    expect(within(bundle).getByText(/Handoff draft copied/i)).toBeInTheDocument();
  });

  it("keeps practitioner working surfaces off every executive spine page", async () => {
    for (const path of [
      "/ai-value-workspace",
      "/ai-value-workspace/readiness",
      "/ai-value-workspace/sources",
      "/ai-value-workspace/vbd",
      "/ai-value-workspace/metrics",
      "/ai-value-workspace/case",
      "/ai-value-workspace/roi",
      "/ai-value-workspace/decisions"
    ]) {
      stubJourneyFetch(journeyObjects);
      const view = renderWorkspace(path);
      await waitFor(() => {
        expect(
          screen.getByRole("region", { name: /AI value workspace report frame/i })
        ).toBeInTheDocument();
      });

      expect(screen.queryByText(/Client Value Questions/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("region", { name: /Customer evidence review/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("region", { name: /Sponsor operating workflow/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /Blueprint Workshop/i })).not.toBeInTheDocument();
      view.unmount();
      vi.unstubAllGlobals();
    }
  });
});
