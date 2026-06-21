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

  it("renders the value realization spine as the only navigation", () => {
    const { container } = renderWorkspace();

    const nav = screen.getByRole("navigation", { name: /AI value workspace pages/i });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(7);
    expect(links.map((link) => within(link).getByRole("strong").textContent)).toEqual([
      "Overview",
      "AI Fluency",
      "VBD Map",
      "Outcome Metrics",
      "Evidence Case",
      "Value / ROI",
      "Decision & Retest"
    ]);
    expect(within(nav).queryByText(/Blueprint/i)).not.toBeInTheDocument();
    expect(within(nav).queryByText(/Scenario/i)).not.toBeInTheDocument();
    expect(within(nav).queryByText(/Readout/i)).not.toBeInTheDocument();

    expect(screen.getByText("The value realization spine")).toBeInTheDocument();
    expect(screen.getAllByText(/Assemble the value evidence case/i).length).toBeGreaterThan(0);
    const vbdFramework = screen.getByRole("region", { name: /Organizational AI Fluency framework/i });
    const phaseCards = screen.getByRole("region", { name: /Workspace phase cards/i });
    expect(vbdFramework).toBeInTheDocument();
    expect(within(vbdFramework).getByText("Deep but slow")).toBeInTheDocument();
    expect(within(vbdFramework).getByText("High-fluency flow")).toBeInTheDocument();
    expect(within(vbdFramework).getByText("Low integration")).toBeInTheDocument();
    expect(within(vbdFramework).getByText("Fast but shallow")).toBeInTheDocument();
    expect(within(vbdFramework).getByText(/Signals, not scores/i)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Velocity Breadth Depth map/i })).not.toBeInTheDocument();
    expect(Boolean(vbdFramework.compareDocumentPosition(phaseCards) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);

    expectNoUnsafeUiLanguage(container.textContent);
  });

  it("shows the governed source package review queue on the workspace overview", () => {
    const { container } = renderWorkspace();

    const queue = screen.getByRole("region", { name: /Source Package Review Queue/i });
    expect(queue).toBeInTheDocument();
    expect(within(queue).getByRole("heading", { name: /Source Package Review Queue/i })).toBeInTheDocument();
    expect(within(queue).getByText(/Evidence intake queue/i)).toBeInTheDocument();
    expect(
      within(queue).getByText(/Data Spine gate before Measurement Cell assembly/i)
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
    expect(within(queue).getByText("ROI assumption context")).toBeInTheDocument();
    expect(within(queue).getByText("Governance")).toBeInTheDocument();

    for (const status of ["parsed", "approved", "aligned", "held", "uploaded", "suppressed", "missing"]) {
      expect(within(queue).getAllByText(status).length).toBeGreaterThan(0);
    }
    expect(within(queue).getByText("3 of 6 lanes clear for Data Spine review")).toBeInTheDocument();
    expect(
      within(queue).getByText(/Held or suppressed lanes stay out of finance-context investigation readiness/i)
    ).toBeInTheDocument();
    expect(within(queue).getByText("Next action")).toBeInTheDocument();
    expect(within(queue).getByText(/Map parsed value routes to workflow_family/i)).toBeInTheDocument();
    expect(within(queue).getByText(/Resolve metric owner approval/i)).toBeInTheDocument();
    expect(within(queue).getByText(/Regenerate at aggregate threshold/i)).toBeInTheDocument();

    expect(within(queue).getByText("Data Spine alignment keys")).toBeInTheDocument();
    expect(within(queue).getByText("org_id")).toBeInTheDocument();
    expect(within(queue).getByText("client_id")).toBeInTheDocument();
    expect(within(queue).getByText("workflow_family")).toBeInTheDocument();
    expect(within(queue).getByText("function_area")).toBeInTheDocument();
    expect(within(queue).getByText("cohort_key")).toBeInTheDocument();
    expect(within(queue).getByText("baseline_window")).toBeInTheDocument();
    expect(within(queue).getByText("comparison_window")).toBeInTheDocument();
    expect(within(queue).getByText("Review queue labels")).toBeInTheDocument();
    expect(within(queue).getByText("metric_id")).toBeInTheDocument();
    expect(within(queue).getByText("source_ref")).toBeInTheDocument();
    expect(within(queue).getByText("owner_role")).toBeInTheDocument();
    expect(within(queue).getByText("review_state")).toBeInTheDocument();
    expect(within(queue).getAllByText("Clear for review")).toHaveLength(3);
    expect(within(queue).getAllByText("Hold before review")).toHaveLength(3);
    expect(within(queue).getByText(/aggregate evidence status only/i)).toBeInTheDocument();
    expect(within(queue).queryByText(/prepare_finance_context_investigation_packet/i)).not.toBeInTheDocument();

    expect(queue.textContent).not.toMatch(/confidence\s*%|probability|financial attribution|causal proof/i);
    expect(queue.textContent).not.toMatch(/individual|person-level|manager ranking|team ranking/i);
    expectNoUnsafeUiLanguage(container.textContent, [
      "ROI proof",
      "productivity proof",
      "customer-facing financial output"
    ]);
  });

  it("keeps the AI Fluency page focused on the organizational example", () => {
    const { container } = renderWorkspace("/ai-value-workspace/readiness");

    expect(screen.getByRole("region", { name: /Organizational AI Fluency example/i })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "AI Fluency" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /AI Fluency Baseline/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Aggregate results only")).not.toBeInTheDocument();
    expect(screen.queryByText("Signals, not scores")).not.toBeInTheDocument();
    expect(screen.queryByText("Confidence")).not.toBeInTheDocument();
    expect(screen.queryByText("Usage Quality")).not.toBeInTheDocument();

    // Practitioner clutter stays off the executive page.
    expect(screen.queryByRole("region", { name: /Velocity Breadth Depth map/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Client Value Questions/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Blueprint/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Client kickoff/i)).not.toBeInTheDocument();

    expectNoUnsafeUiLanguage(container.textContent);
  });

  it("replaces the client-assessment controls with the AI Org fluency example", () => {
    const { container } = renderWorkspace("/ai-value-workspace/readiness");

    const example = screen.getByRole("region", { name: /Organizational AI Fluency example/i });
    expect(
      within(example).getByRole("heading", { name: /AI Org Fluency example/i })
    ).toBeInTheDocument();
    expect(within(example).getByTitle(/Organizational AI Fluency example/i)).toHaveAttribute(
      "src",
      "/ai-fluency/organizational-results.html"
    );
    expect(screen.queryByText(/Send AI Fluency and view results/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Open client assessment/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Copy client link/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Show aggregate results/i })).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/explore-your-ai-fluency-instruments/i);

    expectNoUnsafeUiLanguage(container.textContent);
  });

  it("gives the VBD operating map its own spine step and redirects the old blueprint link", () => {
    const vbd = renderWorkspace("/ai-value-workspace/vbd");
    const vbdMap = screen.getByRole("region", { name: /Velocity Breadth Depth map/i });
    expect(vbdMap).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Organizational AI Fluency framework/i })).not.toBeInTheDocument();
    expect(within(vbdMap).getAllByText(/High-fluency flow/i).length).toBeGreaterThan(0);
    vbd.unmount();

    renderWorkspace("/ai-value-workspace/blueprint");
    expect(screen.queryByRole("region", { name: /Organizational AI Fluency framework/i })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Velocity Breadth Depth map/i })).toBeInTheDocument();
    const activeLink = screen.getByRole("link", { current: "page" });
    expect(activeLink).toHaveTextContent("VBD Map");
  });

  it("plots org functions from the AI Fluency results on the VBD map", () => {
    const { container } = renderWorkspace("/ai-value-workspace/vbd");

    const map = screen.getByRole("region", { name: /Velocity Breadth Depth map/i });
    expect(within(map).getByText(/Function cluster map/i)).toBeInTheDocument();
    const scoringModel = within(map).getByRole("region", { name: /Overall VBD scoring model/i });
    expect(within(scoringModel).getByText(/Overall VBD Score/i)).toBeInTheDocument();
    expect(within(scoringModel).getByText("53")).toBeInTheDocument();
    expect(within(scoringModel).getByText(/Velocity 0\.30 \+ Breadth 0\.30 \+ Depth 0\.40/i)).toBeInTheDocument();
    expect(within(scoringModel).getByText(/Integration Score/i)).toBeInTheDocument();
    expect(within(scoringModel).getByText(/Breadth 0\.40 \+ Depth 0\.60/i)).toBeInTheDocument();
    expect(within(scoringModel).getByText(/Fixed quadrant line 60/i)).toBeInTheDocument();
    expect(within(scoringModel).getByText(/not a configurable control/i)).toBeInTheDocument();
    expect(within(map).getAllByText(/Engineering \/ Software Development/i).length).toBeGreaterThan(0);
    expect(within(map).getAllByText(/Customer or Account Success/i).length).toBeGreaterThan(0);
    expect(within(map).getAllByText(/Finance or Accounting/i).length).toBeGreaterThan(0);
    expect(within(map).getAllByText(/Legal & Compliance/i).length).toBeGreaterThan(0);
    expect(within(map).getByText(/Measured AI surfaces:/i)).toBeInTheDocument();
    expect(within(map).getByText(/Search, Assistant, Skills, Agents, Artifacts, workflow automations/i)).toBeInTheDocument();
    expect(within(map).getByText(/Quadrant definitions/i)).toBeInTheDocument();
    expect(within(map).getByText(/Bubble size shows Overall VBD Score/i)).toBeInTheDocument();
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
    expect(within(definitions).getByText(/Quadrant Strength 79 · Quadrant Share 29%/)).toBeInTheDocument();
    expect(within(definitions).getByText(/Quadrant Strength 59 · Quadrant Share 18%/)).toBeInTheDocument();
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
      expect.stringContaining("Overall VBD Score 87")
    );
    expect(engineeringBubble).toHaveAttribute(
      "aria-label",
      expect.stringContaining("Integration Score 87")
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
    expect(screen.getByRole("region", { name: /Value evidence case/i })).toBeInTheDocument();
    evidence.unmount();

    const scenario = renderWorkspace("/ai-value-workspace/scenario");
    expect(screen.getByRole("region", { name: /Value and ROI readiness/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { current: "page" })).toHaveTextContent("Value / ROI");
    scenario.unmount();

    renderWorkspace("/ai-value-workspace/readout");
    const activeLink = screen.getByRole("link", { current: "page" });
    expect(activeLink).toHaveTextContent("Decision & Retest");
  });

  it("closes the loop from Decision & Retest back to the baseline", () => {
    renderWorkspace("/ai-value-workspace/decisions");
    const roiAccess = screen.getByRole("region", { name: /Value and ROI access/i });
    expect(roiAccess).toBeInTheDocument();
    expect(within(roiAccess).getByText(/selected outcome metric/i)).toBeInTheDocument();
    expect(within(roiAccess).queryByText(/No outcome metric selected/i)).not.toBeInTheDocument();
    expect(within(roiAccess).queryByText(/No workflow selected yet/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open Value \/ ROI screen/i })).toHaveAttribute(
      "href",
      "/ai-value-workspace/roi"
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
          return new Response("<html>Executive readout</html>", {
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


  it("turns the metrics page into the function outcome metric step", async () => {
    stubJourneyFetch(journeyObjects);
    const { container } = renderWorkspace("/ai-value-workspace/metrics");

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Outcome metric setup/i })).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "Outcome Metrics" })).toBeInTheDocument();
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

    // The old step-guide and duplicate opportunity map stay removed.
    expect(screen.queryByText(/Step 4 of 8/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Outcome and ROI opportunity map/i })).not.toBeInTheDocument();

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
      action: /Review the caveated readout with accepted evidence/i,
      caveat: /Accepted evidence is caveated support only; it is not ROI proof and does not establish causality/i
    },
    {
      state: "SUBMITTED" as const,
      status: /Review pending/i,
      included: /pending evidence section/i,
      held: /Stronger value language stays held until Support Operations accepts or rejects the export/i,
      owner: /Support Operations/i,
      action: /Accept the export only if the metric, source, export level, baseline window, and comparison window match the request/i,
      caveat: /Submitted evidence does not validate value yet/i
    },
    {
      state: "REJECTED" as const,
      status: /Corrected export needed/i,
      included: /corrected-export request/i,
      held: /Validated value language stays held until a corrected aggregate export is accepted/i,
      owner: /Support Operations/i,
      action: /Keep stronger value language blocked until a corrected export is accepted/i,
      caveat: /Rejected evidence cannot support value claims/i
    },
    {
      state: "MISSING" as const,
      status: /Data owner request needed/i,
      included: /customer evidence request/i,
      held: /Outcome validation and stronger ROI language stay held until the aggregate export arrives and passes review/i,
      owner: /Support Operations/i,
      action: /Ask Support Operations for an aggregate Median resolution time export/i,
      caveat: /Missing evidence keeps the readout in planning status/i
    }
  ])("carries $state evidence into the Decision & Retest readout", async ({
    state,
    status,
    included,
    held,
    owner,
    action,
    caveat
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
      expect(screen.getByRole("heading", { name: /Executive Readout Preview/i })).toBeInTheDocument();
    });

    const preview = screen.getByRole("region", { name: /Executive readout preview/i });
    expect(within(preview).getByText(status)).toBeInTheDocument();
    expect(within(preview).getByText(included)).toBeInTheDocument();
    expect(within(preview).getByText(held)).toBeInTheDocument();
    expect(within(preview).getAllByText(owner).length).toBeGreaterThan(0);
    expect(within(preview).getByText(action)).toBeInTheDocument();
    expect(within(preview).getByText(caveat)).toBeInTheDocument();

    fireEvent.click(within(preview).getByRole("button", { name: /Open executive readout/i }));
    await waitFor(() => {
      expect(open).toHaveBeenCalledWith("blob:workspace-readout-preview", "_blank", "noopener");
    });

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

  it("exposes Value and ROI readiness as its own workspace step", async () => {
    stubJourneyFetch(journeyObjects);
    const { container } = renderWorkspace("/ai-value-workspace/roi");

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Value and ROI readiness/i })).toBeInTheDocument();
    });

    const activeLink = screen.getByRole("link", { current: "page" });
    expect(activeLink).toHaveTextContent("Value / ROI");
    const roi = screen.getByRole("region", { name: /Value and ROI readiness/i });
    expect(within(roi).getByRole("heading", { name: /Value \/ ROI Readiness/i })).toBeInTheDocument();
    expect(within(roi).getByText(/Support case resolution/i)).toBeInTheDocument();
    expect(within(roi).getByText(/Median resolution time/i)).toBeInTheDocument();
    expect(within(roi).getByText(/Source and aggregation level/i)).toBeInTheDocument();
    expect(within(roi).getByText(/Owner review still needed/i)).toBeInTheDocument();
    expect(within(roi).queryByText(/Ready for governed value modeling/i)).not.toBeInTheDocument();
    expect(within(roi).getByText(/Baseline window/i)).toBeInTheDocument();
    expect(within(roi).getByText(/Comparison window/i)).toBeInTheDocument();
    expect(within(roi).getByText(/Customer-owned assumptions/i)).toBeInTheDocument();
    expect(within(roi).getByText(/Conservative/i)).toBeInTheDocument();
    expect(within(roi).getByText(/Base case/i)).toBeInTheDocument();
    expect(within(roi).getByText(/Expanded/i)).toBeInTheDocument();
    expect(within(roi).getByText(/Potential capacity-creation opportunity for customer-owned validation/i)).toBeInTheDocument();
    const roiBot = within(roi).getByRole("region", { name: /ROI Bot modeling context/i });
    expect(within(roiBot).getByRole("heading", { name: /ROI Bot companion lane/i })).toBeInTheDocument();
    expect(within(roiBot).getByText(/Source tags and pull dates required/i)).toBeInTheDocument();
    expect(within(roiBot).getByText(/Business or finance owner confirms pricing, volume, revenue, EBITDA, or cost assumptions/i)).toBeInTheDocument();
    expect(within(roiBot).getByText(/Does not change claim readiness/i)).toBeInTheDocument();
    expect(within(roiBot).getByText(/FluencyTracr governance/i)).toBeInTheDocument();
    expect(within(roiBot).getByText(/AI Fluency dashboard interpretation/i)).toBeInTheDocument();
    expect(within(roiBot).getByText(/VBD score or quadrant placement/i)).toBeInTheDocument();
    expect(
      within(roiBot).getByText(/does not prove ROI, productivity, causality, EBITDA movement, revenue movement, savings, or AI value attribution/i)
    ).toBeInTheDocument();
    expect(within(roi).getByText(/No realized ROI claim/i)).toBeInTheDocument();
    expect(within(roi).getByText(/No customer-facing economic figures/i)).toBeInTheDocument();
    expect(within(roi).getByText(/Review submitted customer export with Support Operations before stronger value language/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to Evidence Case/i })).toHaveAttribute(
      "href",
      "/ai-value-workspace/case"
    );
    expect(screen.getByRole("link", { name: /Continue to Decision & Retest/i })).toHaveAttribute(
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
    expect(within(preview).getByText(/Value-readout owner/i)).toBeInTheDocument();
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
      "/ai-value-workspace/vbd",
      "/ai-value-workspace/metrics",
      "/ai-value-workspace/roi",
      "/ai-value-workspace/decisions"
    ]) {
      stubJourneyFetch(journeyObjects);
      const view = renderWorkspace(path);
      await waitFor(() => {
        expect(
          screen.getByRole("navigation", { name: /AI value workspace pages/i })
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
