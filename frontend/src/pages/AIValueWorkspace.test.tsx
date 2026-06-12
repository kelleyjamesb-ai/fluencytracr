import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AIValueWorkspace } from "./AIValueWorkspace";
import {
  ACTIVE_AI_VALUE_BLUEPRINT_ID_KEY,
  ACTIVE_AI_VALUE_ENGAGEMENT_ID_KEY
} from "../lib/aiValueApi";

const uiTerm = (...parts: string[]) => parts.join("");
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
  });

  it("renders the value realization spine as the only navigation", () => {
    const { container } = renderWorkspace();

    const nav = screen.getByRole("navigation", { name: /AI value workspace pages/i });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(6);
    expect(links.map((link) => within(link).getByRole("strong").textContent)).toEqual([
      "Overview",
      "AI Fluency",
      "VBD Map",
      "Outcome Metrics",
      "Evidence Case",
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
    const vbdFramework = screen.getByRole("region", { name: /Organizational AI Fluency framework/i });
    const vbdMap = screen.getByRole("region", { name: /Velocity Breadth Depth map/i });
    expect(vbdFramework).toBeInTheDocument();
    expect(vbdMap).toBeInTheDocument();
    expect(Boolean(vbdFramework.compareDocumentPosition(vbdMap) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(within(vbdMap).getAllByText(/High-fluency flow/i).length).toBeGreaterThan(0);
    vbd.unmount();

    renderWorkspace("/ai-value-workspace/blueprint");
    expect(screen.getByRole("region", { name: /Organizational AI Fluency framework/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Velocity Breadth Depth map/i })).toBeInTheDocument();
    const activeLink = screen.getByRole("link", { current: "page" });
    expect(activeLink).toHaveTextContent("VBD Map");
  });

  it("plots org functions from the AI Fluency results on the VBD map", () => {
    const { container } = renderWorkspace("/ai-value-workspace/vbd");

    const map = screen.getByRole("region", { name: /Velocity Breadth Depth map/i });
    expect(within(map).getByText(/Function cluster map/i)).toBeInTheDocument();
    expect(within(map).getByText(/Engineering \/ Software Development/i)).toBeInTheDocument();
    expect(within(map).getByText(/Customer or Account Success/i)).toBeInTheDocument();
    expect(within(map).getByText(/Finance or Accounting/i)).toBeInTheDocument();
    expect(within(map).getByText(/Legal & Compliance/i)).toBeInTheDocument();
    expect(within(map).getByText(/Measured AI surfaces:/i)).toBeInTheDocument();
    expect(within(map).getByText(/Search, Assistant, Skills, Agents, Artifacts, workflow automations/i)).toBeInTheDocument();
    expect(within(map).getByText(/Quadrant definitions/i)).toBeInTheDocument();
    expect(within(map).getByText(/Bubble size shows combined Velocity, Breadth, and Depth/i)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Organizational AI Fluency framework/i })).toBeInTheDocument();
    const quadrantMap = within(map).getByLabelText("VBD quadrant map");
    expect(within(quadrantMap).getByText("Fast but shallow")).toBeInTheDocument();
    expect(within(quadrantMap).getByText("High-fluency flow")).toBeInTheDocument();
    expect(within(quadrantMap).getByText("Low integration")).toBeInTheDocument();
    expect(within(quadrantMap).getByText("Deep but slow")).toBeInTheDocument();
    expect(within(quadrantMap).getByText(/Adoption is ahead of workflow change/i)).toBeInTheDocument();
    expect(within(quadrantMap).getByText(/AI is embedded enough to scale/i)).toBeInTheDocument();
    expect(within(quadrantMap).getByText(/Find the work fit before scaling/i)).toBeInTheDocument();
    expect(within(quadrantMap).getByText(/Good use case, slow spread/i)).toBeInTheDocument();
    expect(within(quadrantMap).getAllByText("Watch for").length).toBe(4);
    expect(within(quadrantMap).getByText(/Low verification/i)).toBeInTheDocument();
    expect(within(quadrantMap).getByText(/Repeat use/i)).toBeInTheDocument();
    expect(within(quadrantMap).getByText(/Human-only fallback/i)).toBeInTheDocument();
    expect(within(quadrantMap).getByText(/Workflow drag/i)).toBeInTheDocument();
    const yAxis = container.querySelector(".ai-value-vbd-y-axis");
    expect(yAxis).toBeInstanceOf(HTMLElement);
    expect(within(yAxis as HTMLElement).getByText("High")).toHaveClass("ai-value-vbd-axis-high");
    expect(within(yAxis as HTMLElement).getByText("Velocity")).toHaveClass("ai-value-vbd-axis-title");
    expect(within(yAxis as HTMLElement).getByText("Low")).toHaveClass("ai-value-vbd-axis-low");
    expect(container.querySelectorAll(".ai-value-vbd-grid h4, .ai-value-vbd-grid .ai-value-map-label")).toHaveLength(0);
    expect(container.querySelectorAll(".ai-value-vbd-function-marker")).toHaveLength(0);
    const bubbles = container.querySelectorAll(".ai-value-vbd-function-bubble");
    expect(bubbles).toHaveLength(17);
    expect(Array.from(bubbles).every((bubble) => bubble instanceof HTMLElement && bubble.style.getPropertyValue("--vbd-bubble-size"))).toBe(true);
    const marketingBubble = container.querySelector(
      '[aria-label^="Marketing & Communications"]'
    );
    const businessOperationsBubble = container.querySelector(
      '[aria-label^="Corporate Strategy or Business Operations"]'
    );
    expect(marketingBubble).toBeInstanceOf(HTMLElement);
    expect(businessOperationsBubble).toBeInstanceOf(HTMLElement);
    expect(parseFloat((marketingBubble as HTMLElement).style.left)).toBeLessThan(50);
    expect(parseFloat((businessOperationsBubble as HTMLElement).style.left)).toBeLessThan(50);
    expect(
      Array.from(bubbles).some(
        (bubble) => bubble instanceof HTMLElement && bubble.style.getPropertyValue("--vbd-bubble-size") !== bubbles[0].style.getPropertyValue("--vbd-bubble-size")
      )
    ).toBe(true);
    expect(within(map).queryByText(/No functions here yet/i)).not.toBeInTheDocument();

    expectNoUnsafeUiLanguage(container.textContent);
  });

  it("redirects demoted evidence, scenario, and readout pages to spine steps", () => {
    const evidence = renderWorkspace("/ai-value-workspace/evidence");
    expect(screen.getByRole("region", { name: /Value evidence case/i })).toBeInTheDocument();
    evidence.unmount();

    const scenario = renderWorkspace("/ai-value-workspace/scenario");
    expect(screen.getByRole("region", { name: /Value evidence case/i })).toBeInTheDocument();
    scenario.unmount();

    renderWorkspace("/ai-value-workspace/readout");
    const activeLink = screen.getByRole("link", { current: "page" });
    expect(activeLink).toHaveTextContent("Decision & Retest");
  });

  it("closes the loop from Decision & Retest back to the baseline", () => {
    renderWorkspace("/ai-value-workspace/decisions");
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
    expect(within(bridge).getByRole("group", { name: /Select org function/i })).toBeInTheDocument();
    fireEvent.click(within(bridge).getByRole("button", { name: "Engineering / Software Development" }));
    const pullRequestCycle = within(bridge).getByRole("checkbox", { name: /Pull request cycle time/i });
    const releaseFrequency = within(bridge).getByRole("checkbox", { name: /Release frequency/i });
    expect(pullRequestCycle).toBeChecked();
    fireEvent.click(releaseFrequency);
    expect(releaseFrequency).toBeChecked();
    const watchPlan = within(bridge).getByRole("region", { name: /VBD metric watch plan/i });
    expect(within(watchPlan).getByText(/Engineering \/ Software Development/i)).toBeInTheDocument();
    expect(within(watchPlan).getByText(/Pull request cycle time/i)).toBeInTheDocument();
    expect(within(watchPlan).getByText(/Release frequency/i)).toBeInTheDocument();
    expect(within(watchPlan).getByText(/Compare selected outcomes against Velocity, Breadth, and Depth movement over time/i)).toBeInTheDocument();
    expect(within(bridge).getAllByText(/Support Operations/i).length).toBeGreaterThan(0);
    const candidateMetrics = screen.getByRole("article", { name: /Candidate outcome metrics/i });
    expect(candidateMetrics).toBeInTheDocument();
    expect(within(candidateMetrics).getByText(/Engineering \/ Software Development/i)).toBeInTheDocument();
    expect(within(candidateMetrics).getByText(/How fast are pull requests merging/i)).toBeInTheDocument();
    expect(within(candidateMetrics).getByText(/Pull request cycle time/i)).toBeInTheDocument();
    expect(within(candidateMetrics).queryByText(/Are cases resolving faster/i)).not.toBeInTheDocument();

    fireEvent.click(within(bridge).getByRole("button", { name: "Finance or Accounting" }));
    expect(within(candidateMetrics).getByText(/Finance or Accounting/i)).toBeInTheDocument();
    expect(within(candidateMetrics).getByText(/Is the close cycle getting shorter/i)).toBeInTheDocument();
    expect(within(candidateMetrics).getByText(/Close cycle time/i)).toBeInTheDocument();
    expect(within(candidateMetrics).queryByText(/How fast are pull requests merging/i)).not.toBeInTheDocument();

    // The old step-guide and duplicate opportunity map stay removed.
    expect(screen.queryByText(/Step 4 of 8/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Outcome and ROI opportunity map/i })).not.toBeInTheDocument();

    expectNoUnsafeUiLanguage(container.textContent, [
      uiTerm("metrics", "_", "library")
    ]);
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
