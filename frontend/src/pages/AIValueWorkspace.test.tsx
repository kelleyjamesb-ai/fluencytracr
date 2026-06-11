import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AIValueWorkspace } from "./AIValueWorkspace";

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

describe("AIValueWorkspace", () => {
  it("renders a multi-page workspace home instead of one long workshop page", () => {
    const { container } = renderWorkspace();

    expect(screen.getByRole("heading", { name: /AI Value Workspace/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Workspace Home/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Customer support case resolution/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Capacity creation/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Needs client assumptions/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Internal planning only/i).length).toBeGreaterThan(0);

    const workspaceNavigation = screen.getByRole("navigation", {
      name: /AI value workspace pages/i
    });
    expect(within(workspaceNavigation).getByRole("link", { name: /Blueprint Workshop/i })).toHaveAttribute(
      "href",
      "/ai-value-workspace/blueprint"
    );
    expect(within(workspaceNavigation).getByRole("link", { name: /Metrics & ROI Opportunities/i })).toHaveAttribute(
      "href",
      "/ai-value-workspace/metrics"
    );
    expect(within(workspaceNavigation).getByRole("link", { name: /Evidence Readiness/i })).toHaveAttribute(
      "href",
      "/ai-value-workspace/evidence"
    );
    expect(within(workspaceNavigation).getByRole("link", { name: /Executive Readout/i })).toHaveAttribute(
      "href",
      "/ai-value-workspace/readout"
    );
    expect(screen.queryByRole("button", { name: /Value Signals/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /ROI Scenario Readiness/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Customer Evidence Review/i })).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(
      /workflow_state|metric_state|claim boundary|raw_prompt|raw_response|employee_id|user_id|manager_view|team_ranking|productivity_score|Glean proved ROI/i
    );
  });

  it("renders the metrics page as a focused outcome and ROI opportunity view", () => {
    const { container } = renderWorkspace("/ai-value-workspace/metrics");

    expect(screen.getByRole("heading", { name: /Metrics & ROI Opportunities/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Client questions to metrics mapping/i })).toBeInTheDocument();
    expect(screen.getByText(/Are cases resolving faster/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Support case management system/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: /Customer Evidence Review/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Executive Operating Packet/i })).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/workflow_state|metric_state|claim boundary|raw_prompt|raw_response/i);
  });

  it("renders evidence and executive readout as separate focused pages", () => {
    const evidence = renderWorkspace("/ai-value-workspace/evidence");

    expect(screen.getByRole("heading", { name: /^Evidence Readiness$/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Customer evidence request/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Customer evidence review/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Executive Operating Packet/i })).not.toBeInTheDocument();
    evidence.unmount();

    const readout = renderWorkspace("/ai-value-workspace/readout");

    expect(screen.getByRole("heading", { name: /^Executive Readout$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Executive Operating Packet/i })).toBeInTheDocument();
    expect(screen.getByText(/Decision for the sponsor/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Customer Evidence Review/i })).not.toBeInTheDocument();
    expectNoUnsafeUiLanguage(readout.container.textContent);
  });
});

describe("AIValueWorkspace live evidence mode", () => {
  const fakeRun = {
    schema_version: "FT_AI_VALUE_SPINE_RUN_2026_06",
    decision: "READY_FOR_EXECUTIVE_VALIDATION",
    halted_at: null,
    customer_facing_economic_output: false,
    stages: {
      blueprint: {
        status: "VALID",
        generated: false,
        hold_reason: null,
        validation: {},
        object: {
          workflow_name: "Sales pipeline hygiene",
          workflow_family: "sales_pipeline_hygiene",
          value_routes: { primary: "QUALITY_IMPROVEMENT" }
        }
      },
      metrics: { status: "VALID", generated: false, hold_reason: null, validation: {}, object: {} },
      scenario: {
        status: "VALID",
        generated: true,
        hold_reason: null,
        validation: {},
        object: {
          input: {
            value_route: "QUALITY_IMPROVEMENT",
            metric_references: [
              {
                name: "Opportunity data completeness",
                measurement_unit: "share",
                source_system: { source_name: "CRM reporting" },
                allowed_claim_level: "CAVEATED_VALUE_INVESTIGATION"
              }
            ],
            scenario_bands: [
              { band: "CONSERVATIVE", interpretation: "Narrowest signal set." },
              { band: "BASE_CASE", interpretation: "All recommended signals." },
              { band: "EXPANDED", interpretation: "After client validation." }
            ]
          }
        }
      },
      readiness: {
        status: "VALID",
        generated: true,
        hold_reason: null,
        validation: {},
        object: {
          readiness_checks: {
            workflow_state: "PRESENT",
            metric_state: "PRESENT",
            baseline_state: "PRESENT",
            assumption_state: "PRESENT",
            scenario_state: "PRESENT",
            governance_state: "PRESENT"
          },
          decision_rationale: ["The workshop evidence cleared every readiness gate."],
          next_actions: ["Schedule the sponsor validation session."]
        }
      },
      claim_boundary: {
        status: "VALID",
        generated: true,
        hold_reason: null,
        validation: {},
        object: {
          claim_state: "CAVEATED",
          safe_claims: ["Aggregate signals support internal planning."],
          caveated_claims: ["The client validates operating assumptions first."],
          required_caveats: ["This is a pre-ROI planning artifact."],
          blocked_claims: ["roi_proof", "causality_claim"]
        }
      },
      executive_packet: {
        status: "VALID",
        generated: true,
        hold_reason: null,
        validation: {},
        object: { packet_id: "executive_packet_sales_pipeline_hygiene_v1" }
      }
    }
  };

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("object_type=blueprint")) {
          return jsonResponse({
            objects: [{ object_type: "blueprint", object_id: "bp_sales_pipeline" }]
          });
        }
        if (url.includes("object_type=metrics_library")) {
          return jsonResponse({
            objects: [{ object_type: "metrics_library", object_id: "ml_sales" }]
          });
        }
        if (url.includes("/spine/run")) {
          return jsonResponse({ run: fakeRun, persisted: [] });
        }
        return jsonResponse({ objects: [] });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("connects to the evidence engine and shows client-facing live content", async () => {
    const { container } = renderWorkspace();

    fireEvent.click(screen.getByRole("button", { name: /Connect live evidence/i }));

    await waitFor(() => {
      expect(screen.getByText("Live evidence", { selector: "span" })).toBeInTheDocument();
    });
    expect(screen.getAllByText(/Ready for sponsor validation/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Shareable with caveats/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Sales pipeline hygiene/i).length).toBeGreaterThan(0);

    const workspaceNavigation = screen.getByRole("navigation", {
      name: /AI value workspace pages/i
    });

    fireEvent.click(within(workspaceNavigation).getByRole("link", { name: /Metrics & ROI Opportunities/i }));
    expect(screen.getByText(/Opportunity data completeness/i)).toBeInTheDocument();
    expect(screen.getAllByText(/CRM reporting/i).length).toBeGreaterThan(0);

    fireEvent.click(within(workspaceNavigation).getByRole("link", { name: /Scenario Builder/i }));
    expect(screen.getByText(/Proven ROI/i)).toBeInTheDocument();
    expect(screen.getByText(/AI caused the improvement/i)).toBeInTheDocument();

    fireEvent.click(within(workspaceNavigation).getByRole("link", { name: /Evidence Readiness/i }));
    expect(screen.getAllByText("Workflow canvas").length).toBeGreaterThan(0);

    // Live mode must stay client-facing: no internal object or state names.
    expect(container.textContent).not.toMatch(
      /workflow_state|metric_state|claim boundary|READY_FOR_EXECUTIVE_VALIDATION|CAVEATED_VALUE_INVESTIGATION|raw_prompt|employee_id/
    );
  });

  it("shows the client kickoff context when the full value chain is available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("object_type=blueprint")) {
          return jsonResponse({
            objects: [{ object_type: "blueprint", object_id: "bp_sales_pipeline" }]
          });
        }
        if (url.includes("object_type=metrics_library")) {
          return jsonResponse({
            objects: [{ object_type: "metrics_library", object_id: "ml_sales" }]
          });
        }
        if (url.includes("object_type=engagement")) {
          return jsonResponse({
            objects: [{ object_type: "engagement", object_id: "engagement_v1" }]
          });
        }
        if (url.includes("object_type=fluency_baseline")) {
          return jsonResponse({
            objects: [{ object_type: "fluency_baseline", object_id: "baseline_v1" }]
          });
        }
        if (url.includes("/value-chain/run")) {
          return jsonResponse({
            run: {
              schema_version: "FT_AI_VALUE_CHAIN_RUN_2026_06",
              decision: fakeRun.decision,
              halted_at: null,
              customer_facing_economic_output: false,
              engagement: {
                status: "VALID",
                generated: false,
                hold_reason: null,
                validation: {},
                covers_workflow_family: true,
                object: {
                  client: { client_name: "Northstar Enterprise" },
                  business_objective: {
                    objective_statement:
                      "Create support capacity by reducing time spent locating trusted answers.",
                    positive_business_outcome:
                      "Faster resolution without quality loss."
                  }
                }
              },
              fluency_baseline: {
                status: "VALID",
                generated: false,
                hold_reason: null,
                validation: {},
                object: {},
                summary: {
                  total_respondents: 180,
                  suppressed_cohorts: 1,
                  construct_means: {
                    behavioral_intent: 3.94,
                    usage_quality: 2.88
                  }
                }
              },
              spine: fakeRun
            },
            persisted: []
          });
        }
        return jsonResponse({ objects: [] });
      })
    );

    const { container } = renderWorkspace("/ai-value-workspace/readiness");
    fireEvent.click(screen.getByRole("button", { name: /Connect live evidence/i }));

    await waitFor(() => {
      expect(screen.getByText("Live evidence", { selector: "span" })).toBeInTheDocument();
    });
    expect(screen.getByText(/Client kickoff/i)).toBeInTheDocument();
    expect(screen.getByText(/Northstar Enterprise/i)).toBeInTheDocument();
    expect(screen.getByText(/Create support capacity/i)).toBeInTheDocument();
    expect(screen.getByText(/180 participants/i)).toBeInTheDocument();
    expect(screen.getByText(/Strongest: Intent to use AI more/i)).toBeInTheDocument();
    expect(screen.getByText(/Biggest gap: Usage quality/i)).toBeInTheDocument();
    expect(screen.getByText(/1 small group withheld/i)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(
      /behavioral_intent|usage_quality|construct_means|respondent_id|cohort_id/
    );
  });

  it("shows a friendly error when the evidence engine is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 500 }))
    );

    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: /Connect live evidence/i }));

    await waitFor(() => {
      expect(screen.getAllByRole("alert").some((alert) =>
        /Could not reach the evidence engine/i.test(alert.textContent ?? "")
      )).toBe(true);
      expect(screen.getAllByRole("alert").some((alert) =>
        /The workshop is showing example content/i.test(alert.textContent ?? "")
      )).toBe(true);
    });
    expect(screen.getByText("Example content", { selector: "span" })).toBeInTheDocument();
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

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens with the same selected Blueprint workflow summarized by the Journey", async () => {
    stubJourneyFetch(journeyObjects);
    const { container } = renderWorkspace("/ai-value-workspace/blueprint");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Selected workflow from Journey/i })).toBeInTheDocument();
    });

    const handoff = screen.getByRole("region", { name: /Selected workflow from Journey/i });
    expect(within(handoff).getByText(/Support case resolution/i)).toBeInTheDocument();
    expect(within(handoff).getByText(/Capacity creation/i)).toBeInTheDocument();
    expect(within(handoff).getByText(/Customer export awaiting review/i)).toBeInTheDocument();
    expect(
      within(handoff).getByText(/This is the same workflow selected in Blueprint and summarized in the Journey/i)
    ).toBeInTheDocument();
    expect(within(handoff).getByRole("link", { name: /Back to Journey/i })).toBeInTheDocument();
    expectNoUnsafeUiLanguage(container.textContent);
  });

  it("turns Blueprint into an interactive client workshop board", async () => {
    stubJourneyFetch(journeyObjects);
    const { container } = renderWorkspace("/ai-value-workspace/blueprint");

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Blueprint workshop board/i })).toBeInTheDocument();
    });

    const board = screen.getByRole("region", { name: /Blueprint workshop board/i });
    expect(within(board).getByRole("heading", { name: /Blueprint workshop board/i })).toBeInTheDocument();
    expect(within(board).getByRole("heading", { name: /Current workflow/i })).toBeInTheDocument();
    expect(within(board).getByRole("heading", { name: /Target workflow/i })).toBeInTheDocument();
    expect(within(board).getByText(/Agent searches across knowledge sources before responding/i)).toBeInTheDocument();
    expect(within(board).getByText(/Glean Search and Assistant reduce time spent locating trusted answers/i)).toBeInTheDocument();

    expect(within(board).getByRole("heading", { name: /Workshop focus/i })).toBeInTheDocument();
    let focus = within(board).getByRole("region", { name: /Workshop focus/i });
    expect(within(focus).getByText(/Which case categories are in scope for the pilot/i)).toBeInTheDocument();
    fireEvent.click(
      within(board).getByRole("button", {
        name: /Focus decision: Which support owner signs off on baseline and comparison windows/i
      })
    );
    focus = within(board).getByRole("region", { name: /Workshop focus/i });
    expect(
      within(focus).getByText(/Which support owner signs off on baseline and comparison windows/i)
    ).toBeInTheDocument();
    expect(within(board).getByText(/Feeds Metrics and ROI opportunity mapping/i)).toBeInTheDocument();
    expect(within(board).getByText(/Feeds Evidence readiness/i)).toBeInTheDocument();
    expect(within(board).getByRole("link", { name: /Open Metrics mapping/i })).toHaveAttribute(
      "href",
      "/ai-value-workspace/metrics"
    );
    expect(within(board).getByRole("link", { name: /Open Evidence plan/i })).toHaveAttribute(
      "href",
      "/ai-value-workspace/evidence"
    );
    expectNoUnsafeUiLanguage(container.textContent);
  });

  it("shows ROI scenario readiness for the selected workflow", async () => {
    stubJourneyFetch(journeyObjects);
    const { container } = renderWorkspace("/ai-value-workspace/scenario");

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /ROI scenario readiness/i })).toBeInTheDocument();
    });

    const readiness = screen.getByRole("region", { name: /ROI scenario readiness/i });
    expect(within(readiness).getByText(/Ready for governed value modeling/i)).toBeInTheDocument();
    expect(within(readiness).getByText(/Support case resolution/i)).toBeInTheDocument();
    expect(within(readiness).getByText(/Capacity creation/i)).toBeInTheDocument();
    expect(within(readiness).getAllByText(/Baseline window/i).length).toBeGreaterThan(0);
    expect(within(readiness).getAllByText(/Comparison window/i).length).toBeGreaterThan(0);
    expect(within(readiness).getAllByText(/Customer-owned assumptions/i).length).toBeGreaterThan(0);
    expect(within(readiness).getAllByText(/Customer export awaiting review/i).length).toBeGreaterThan(0);
    expect(within(readiness).getByText(/No realized ROI claim/i)).toBeInTheDocument();
    expect(within(readiness).getByText(/No customer-facing economic figures/i)).toBeInTheDocument();
    expectNoUnsafeUiLanguage(container.textContent, [
      uiTerm("workflow", "_", "family"),
      uiTerm("metric", "_", "id"),
      uiTerm("schema", "_", "version"),
      uiTerm("FT", "_", "AI", "_", "VALUE")
    ]);
  });

  it("bridges client value questions to governed metrics and evidence needs", async () => {
    stubJourneyFetch(journeyObjects);
    const { container } = renderWorkspace("/ai-value-workspace/metrics");

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Client questions to metrics mapping/i })).toBeInTheDocument();
    });

    const bridge = screen.getByRole("region", { name: /Client questions to metrics mapping/i });
    expect(within(bridge).getByRole("heading", { name: /Questions to Metrics Bridge/i })).toBeInTheDocument();
    expect(within(bridge).getByText(/Where is the ROI opportunity/i)).toBeInTheDocument();
    expect(within(bridge).getByText(/Reduce median support resolution hours/i)).toBeInTheDocument();
    expect(within(bridge).getByText(/Median resolution time/i)).toBeInTheDocument();
    expect(within(bridge).getByText(/Capacity creation/i)).toBeInTheDocument();
    expect(within(bridge).getByText(/Support case management system/i)).toBeInTheDocument();
    expect(within(bridge).getAllByText(/hours/i).length).toBeGreaterThan(0);
    expect(within(bridge).getByText(/Compare against an approved pre-period window/i)).toBeInTheDocument();
    expect(within(bridge).getByText(/Support Operations/i)).toBeInTheDocument();
    expect(within(bridge).getByText(/Customer export awaiting review/i)).toBeInTheDocument();
    expect(within(bridge).getByText(/Modeled opportunity only; report with caveats after evidence review/i)).toBeInTheDocument();
    expect(within(bridge).getByText(/Feeds ROI Scenario Readiness and Customer Evidence Request/i)).toBeInTheDocument();

    expectNoUnsafeUiLanguage(container.textContent, [
      uiTerm("workflow", "_", "family"),
      uiTerm("metric", "_", "id"),
      uiTerm("schema", "_", "version"),
      uiTerm("metrics", "_", "library"),
      uiTerm("FT", "_", "AI", "_", "VALUE")
    ]);
    expect(bridge.textContent).not.toMatch(/Glean proved ROI|AI caused|realized ROI/i);
  });

  it("turns Metrics into an outcome and ROI opportunity map", async () => {
    stubJourneyFetch(journeyObjects);
    const { container } = renderWorkspace("/ai-value-workspace/metrics");

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Outcome and ROI opportunity map/i })).toBeInTheDocument();
    });

    const map = screen.getByRole("region", { name: /Outcome and ROI opportunity map/i });
    expect(within(map).getByRole("heading", { name: /Outcome and ROI opportunity map/i })).toBeInTheDocument();
    expect(within(map).getByText(/Support case resolution/i)).toBeInTheDocument();
    expect(within(map).getByText(/Where is the ROI opportunity/i)).toBeInTheDocument();
    expect(within(map).getByText(/Median resolution time/i)).toBeInTheDocument();
    expect(within(map).getByText(/Customer data needed/i)).toBeInTheDocument();
    expect(within(map).getByText(/Baseline and comparison window/i)).toBeInTheDocument();
    expect(within(map).getByText(/Evidence gap/i)).toBeInTheDocument();
    expect(within(map).getByText(/Customer export awaiting review/i)).toBeInTheDocument();
    expect(within(map).getByText(/Next gated action/i)).toBeInTheDocument();
    expect(within(map).getByRole("link", { name: /Open Evidence plan/i })).toHaveAttribute(
      "href",
      "/ai-value-workspace/evidence"
    );
    expect(within(map).getByRole("link", { name: /Open Scenario builder/i })).toHaveAttribute(
      "href",
      "/ai-value-workspace/scenario"
    );
    expect(screen.queryByRole("table", { name: /Recommended value signals/i })).not.toBeInTheDocument();
    expectNoUnsafeUiLanguage(container.textContent, [
      uiTerm("workflow", "_", "family"),
      uiTerm("metric", "_", "id"),
      uiTerm("schema", "_", "version"),
      uiTerm("FT", "_", "AI", "_", "VALUE")
    ]);
    expect(map.textContent).not.toMatch(/Glean proved ROI|AI caused|realized ROI|customer-facing economic/i);
  });

  it("shows a client-readable value spine trace inside the workshop", async () => {
    stubJourneyFetch(journeyObjects);
    const { container } = renderWorkspace();

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Client value spine trace/i })).toBeInTheDocument();
    });

    const trace = screen.getByRole("region", { name: /Client value spine trace/i });
    expect(within(trace).getByRole("heading", { name: /Client Value Spine Trace/i })).toBeInTheDocument();
    expect(within(trace).getByText(/Blueprint decision/i)).toBeInTheDocument();
    expect(within(trace).getByText(/Support case resolution/i)).toBeInTheDocument();
    expect(within(trace).getByText(/Feeds the metric and evidence plan/i)).toBeInTheDocument();
    expect(within(trace).getByText(/Outcome metric/i)).toBeInTheDocument();
    expect(within(trace).getByText(/Median resolution time/i)).toBeInTheDocument();
    expect(within(trace).getByText(/Feeds the customer evidence request/i)).toBeInTheDocument();
    expect(within(trace).getByText(/^Customer evidence$/i)).toBeInTheDocument();
    expect(within(trace).getAllByText(/Customer export awaiting review/i).length).toBeGreaterThan(0);
    expect(within(trace).getByText(/Feeds governed scenario language/i)).toBeInTheDocument();
    expect(within(trace).getByText(/^Value language$/i)).toBeInTheDocument();
    expect(within(trace).getByText(/Modeled opportunity only; report with caveats after evidence review/i)).toBeInTheDocument();
    expect(within(trace).getByText(/Feeds the executive packet/i)).toBeInTheDocument();
    expect(within(trace).getByText(/^Sponsor decision$/i)).toBeInTheDocument();
    expect(within(trace).getByText(/Review submitted customer evidence before sponsor expansion/i)).toBeInTheDocument();

    expectNoUnsafeUiLanguage(container.textContent, [
      uiTerm("workflow", "_", "family"),
      uiTerm("metric", "_", "id"),
      uiTerm("schema", "_", "version"),
      uiTerm("metrics", "_", "library"),
      uiTerm("FT", "_", "AI", "_", "VALUE")
    ]);
    expect(trace.textContent).not.toMatch(/Glean proved ROI|causality proof|productivity score|realized ROI/i);
  });

  it("shows the customer evidence request packet for the selected workflow", async () => {
    stubJourneyFetch(journeyObjects);
    const { container } = renderWorkspace("/ai-value-workspace/evidence");

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Customer evidence request/i })).toBeInTheDocument();
    });

    const request = screen.getByRole("region", { name: /Customer evidence request/i });
    expect(within(request).getByRole("heading", { name: /Customer Evidence Request/i })).toBeInTheDocument();
    expect(
      within(request).getByText(/Ask Support Operations for an aggregate Median resolution time export from Support case management system/i)
    ).toBeInTheDocument();
    expect(within(request).getAllByText(/Aggregate Workflow Window/i).length).toBeGreaterThan(0);
    expect(within(request).getAllByText(/Support Operations/i).length).toBeGreaterThan(0);
    expect(within(request).getByText(/Support Leader/i)).toBeInTheDocument();
    expect(
      within(request).getByText(/Review submitted customer export with Support Operations before stronger value language/i)
    ).toBeInTheDocument();
    expect(within(request).getByText(/No realized ROI claim/i)).toBeInTheDocument();
    expect(within(request).getByText(/No customer-facing economic figures/i)).toBeInTheDocument();
    expectNoUnsafeUiLanguage(container.textContent, [
      uiTerm("workflow", "_", "family"),
      uiTerm("metric", "_", "id"),
      uiTerm("schema", "_", "version"),
      uiTerm("source", "_", "system"),
      uiTerm("approved", "_", "grain"),
      uiTerm("FT", "_", "AI", "_", "VALUE")
    ]);
  });

  it("shows the customer evidence review workbench beside the request packet", async () => {
    stubJourneyFetch(journeyObjects);
    const { container } = renderWorkspace("/ai-value-workspace/evidence");

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Customer evidence review/i })).toBeInTheDocument();
    });

    const review = screen.getByRole("region", { name: /Customer evidence review/i });
    expect(within(review).getByRole("heading", { name: /Customer Evidence Review/i })).toBeInTheDocument();
    expect(within(review).getByText(/Customer export awaiting review/i)).toBeInTheDocument();
    expect(
      within(review).getByText(/Review the submitted aggregate export against Median resolution time/i)
    ).toBeInTheDocument();
    expect(within(review).getByText(/Support Operations reviews the submitted export/i)).toBeInTheDocument();
    expect(within(review).getByRole("button", { name: /^Accept$/ })).toBeInTheDocument();
    expect(within(review).getByRole("button", { name: /^Reject$/ })).toBeInTheDocument();
    expectNoUnsafeUiLanguage(container.textContent, [
      uiTerm("workflow", "_", "family"),
      uiTerm("metric", "_", "id"),
      uiTerm("schema", "_", "version"),
      uiTerm("outcome", "_", "evidence", "_", "export"),
      "export_v1"
    ]);
    expect(container.textContent).not.toMatch(/\bSUBMITTED\b|\bACCEPTED\b|\bREJECTED\b/);
  });

  it("shows a governed path from evidence to safe value language", async () => {
    stubJourneyFetch(journeyObjects);
    const evidence = renderWorkspace("/ai-value-workspace/evidence");

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Evidence to value language path/i })).toBeInTheDocument();
    });

    const path = screen.getByRole("region", { name: /Evidence to value language path/i });
    expect(within(path).getByRole("heading", { name: /Evidence to Value Language Path/i })).toBeInTheDocument();
    expect(within(path).getByText(/Aggregate work evidence/i)).toBeInTheDocument();
    expect(within(path).getByText(/Customer outcome evidence/i)).toBeInTheDocument();
    expect(within(path).getByText(/Scenario readiness/i)).toBeInTheDocument();
    expect(within(path).getByText(/Safe value language/i)).toBeInTheDocument();
    expect(within(path).getByText(/Blocked stronger claims/i)).toBeInTheDocument();
    expect(within(path).getByText(/Next action/i)).toBeInTheDocument();
    expect(within(path).getAllByText(/Customer export awaiting review/i).length).toBeGreaterThan(0);
    expect(
      within(path).getByText(/Modeled opportunity only; report with caveats after evidence review/i)
    ).toBeInTheDocument();
    expect(within(path).getByText(/No realized ROI claim/i)).toBeInTheDocument();
    expect(within(path).getByText(/No customer-facing economic figures/i)).toBeInTheDocument();
    expect(within(path).getByRole("link", { name: /Open Scenario builder/i })).toHaveAttribute(
      "href",
      "/ai-value-workspace/scenario"
    );
    expect(within(path).getByRole("link", { name: /Open Executive readout/i })).toHaveAttribute(
      "href",
      "/ai-value-workspace/readout"
    );
    expectNoUnsafeUiLanguage(evidence.container.textContent, [
      uiTerm("workflow", "_", "family"),
      uiTerm("metric", "_", "id"),
      uiTerm("schema", "_", "version"),
      uiTerm("outcome", "_", "evidence", "_", "export"),
      "export_v1"
    ]);
    evidence.unmount();

    stubJourneyFetch(journeyObjects);
    const scenario = renderWorkspace("/ai-value-workspace/scenario");

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Evidence to value language path/i })).toBeInTheDocument();
    });
    expectNoUnsafeUiLanguage(scenario.container.textContent, [
      uiTerm("workflow", "_", "family"),
      uiTerm("metric", "_", "id"),
      uiTerm("schema", "_", "version"),
      uiTerm("outcome", "_", "evidence", "_", "export"),
      "export_v1"
    ]);
  });

  it.each([
    {
      state: "ACCEPTED" as const,
      proofAnswer: /Accepted customer evidence is attached for caveated sponsor review/i,
      sponsorDecision: /Decide whether the accepted evidence is ready for a caveated sponsor readout/i,
      nextAction: /Prepare the caveated sponsor readout with accepted evidence/i,
      agentAction: /prepare the caveated readout/i
    },
    {
      state: "SUBMITTED" as const,
      proofAnswer: /A customer export is awaiting reviewer acceptance before stronger value language/i,
      sponsorDecision: /Hold stronger value language until the submitted customer export is accepted or rejected/i,
      nextAction: /Have Support Operations review the submitted aggregate export/i,
      agentAction: /route reviewer action/i
    },
    {
      state: "REJECTED" as const,
      proofAnswer: /A corrected aggregate customer export is still needed/i,
      sponsorDecision: /Hold stronger value language and request a corrected aggregate export/i,
      nextAction: /Ask Support Operations to resubmit the aggregate Median resolution time export/i,
      agentAction: /request the corrected aggregate export/i
    },
    {
      state: "MISSING" as const,
      proofAnswer: /The aggregate customer export has not arrived yet/i,
      sponsorDecision: /Hold stronger value language until the data owner submits the requested aggregate export/i,
      nextAction: /Ask Support Operations for an aggregate Median resolution time export/i,
      agentAction: /send the data-owner request/i
    }
  ])("carries $state evidence into workspace executive cadence", async ({
    state,
    proofAnswer,
    sponsorDecision,
    nextAction,
    agentAction
  }) => {
    const fixture = withOutcomeReviewState(state);
    stubJourneyFetch(fixture.objects, fixture.details);
    const readiness = renderWorkspace("/ai-value-workspace/readiness");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Client Value Questions/i })).toBeInTheDocument();
    });

    expect(screen.getAllByText(proofAnswer).length).toBeGreaterThan(0);
    expectNoUnsafeUiLanguage(readiness.container.textContent, [
      uiTerm("workflow", "_", "family"),
      uiTerm("metric", "_", "id"),
      uiTerm("schema", "_", "version"),
      uiTerm("outcome", "_", "evidence", "_", "export"),
      uiTerm("agent", "_", "run"),
      "export_v1"
    ]);
    expect(readiness.container.textContent).not.toMatch(/\bMISSING\b|\bSUBMITTED\b|\bACCEPTED\b|\bREJECTED\b/);
    readiness.unmount();

    const readout = renderWorkspace("/ai-value-workspace/readout");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Executive Operating Packet/i })).toBeInTheDocument();
    });

    expect(screen.getAllByText(sponsorDecision).length).toBeGreaterThan(0);
    expect(screen.getAllByText(nextAction).length).toBeGreaterThan(0);
    expect(screen.getAllByText(agentAction).length).toBeGreaterThan(0);

    expectNoUnsafeUiLanguage(readout.container.textContent, [
      uiTerm("workflow", "_", "family"),
      uiTerm("metric", "_", "id"),
      uiTerm("schema", "_", "version"),
      uiTerm("outcome", "_", "evidence", "_", "export"),
      uiTerm("agent", "_", "run"),
      "export_v1"
    ]);
    expect(readout.container.textContent).not.toMatch(/\bMISSING\b|\bSUBMITTED\b|\bACCEPTED\b|\bREJECTED\b/);
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
  ])("previews the workspace readout share workflow for $state evidence", async ({
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
    const { container } = renderWorkspace("/ai-value-workspace/readout");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Executive Readout Preview/i })).toBeInTheDocument();
    });

    const preview = screen.getByRole("region", { name: /Executive readout preview/i });
    expect(within(preview).getByRole("heading", { name: /Executive Readout Preview/i })).toBeInTheDocument();
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

  it("shows a guided sponsor operating workflow across readout and decisions", async () => {
    stubJourneyFetch(journeyObjects);
    const readout = renderWorkspace("/ai-value-workspace/readout");

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Sponsor operating workflow/i })).toBeInTheDocument();
    });

    const readoutWorkflow = screen.getByRole("region", { name: /Sponsor operating workflow/i });
    expect(within(readoutWorkflow).getByRole("heading", { name: /Sponsor Operating Workflow/i })).toBeInTheDocument();
    expect(within(readoutWorkflow).getByText(/Readout preview/i)).toBeInTheDocument();
    expect(within(readoutWorkflow).getAllByText(/Sponsor decision/i).length).toBeGreaterThan(0);
    expect(within(readoutWorkflow).getByText(/Handoff draft/i)).toBeInTheDocument();
    expect(within(readoutWorkflow).getAllByText(/Next operating loop/i).length).toBeGreaterThan(0);
    expect(within(readoutWorkflow).getAllByText(/Review pending/i).length).toBeGreaterThan(0);
    expect(within(readoutWorkflow).getAllByText(/Reviewer action needed/i).length).toBeGreaterThan(0);
    expect(within(readoutWorkflow).getByText(/Recommended: Collect stronger evidence/i)).toBeInTheDocument();
    expect(
      within(readoutWorkflow).getByText(/Customer Evidence Request and Evidence Review/i)
    ).toBeInTheDocument();
    expect(
      within(readoutWorkflow).getByText(/No task is created; no customer action is automated/i)
    ).toBeInTheDocument();
    expect(within(readoutWorkflow).getByRole("link", { name: /Open Sponsor decisions/i })).toHaveAttribute(
      "href",
      "/ai-value-workspace/decisions"
    );
    expectNoUnsafeUiLanguage(readout.container.textContent, [
      uiTerm("workflow", "_", "family"),
      uiTerm("metric", "_", "id"),
      uiTerm("schema", "_", "version"),
      uiTerm("outcome", "_", "evidence", "_", "export"),
      uiTerm("executive", "_", "packet"),
      "export_v1"
    ]);
    readout.unmount();

    stubJourneyFetch(journeyObjects);
    const decisions = renderWorkspace("/ai-value-workspace/decisions");

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Sponsor operating workflow/i })).toBeInTheDocument();
    });

    const decisionsWorkflow = screen.getByRole("region", { name: /Sponsor operating workflow/i });
    expect(within(decisionsWorkflow).getByRole("heading", { name: /Sponsor Operating Workflow/i })).toBeInTheDocument();
    expect(within(decisionsWorkflow).getByRole("link", { name: /Open Executive readout/i })).toHaveAttribute(
      "href",
      "/ai-value-workspace/readout"
    );
    expectNoUnsafeUiLanguage(decisions.container.textContent, [
      uiTerm("workflow", "_", "family"),
      uiTerm("metric", "_", "id"),
      uiTerm("schema", "_", "version"),
      uiTerm("outcome", "_", "evidence", "_", "export"),
      uiTerm("agent", "_", "run"),
      "export_v1"
    ]);
    expect(decisions.container.textContent).not.toMatch(/\bMISSING\b|\bSUBMITTED\b|\bACCEPTED\b|\bREJECTED\b/);
  });

  it.each([
    {
      state: "ACCEPTED" as const,
      status: /Caveated expansion review/i,
      recommended: /Recommended: Expand workflow/i,
      reason: /accepted customer evidence can support caveated expansion review/i,
      action: /Review expansion with caveats, assumptions, and blocked value language attached/i
    },
    {
      state: "SUBMITTED" as const,
      status: /Reviewer action needed/i,
      recommended: /Recommended: Collect stronger evidence/i,
      reason: /submitted customer evidence needs Support Operations review/i,
      action: /Accept the export only if the metric, source, export level, baseline window, and comparison window match the request/i
    },
    {
      state: "REJECTED" as const,
      status: /Corrected export needed/i,
      recommended: /Recommended: Request corrected export/i,
      reason: /rejected evidence cannot support value claims/i,
      action: /Keep stronger value language blocked until a corrected export is accepted/i
    },
    {
      state: "MISSING" as const,
      status: /Data-owner request needed/i,
      recommended: /Recommended: Collect stronger evidence/i,
      reason: /aggregate customer evidence has not arrived yet/i,
      action: /Ask Support Operations for an aggregate Median resolution time export/i
    }
  ])("shows a workspace sponsor decision follow-up loop for $state evidence", async ({
    state,
    status,
    recommended,
    reason,
    action
  }) => {
    const fixture = withOutcomeReviewState(state);
    stubJourneyFetch(fixture.objects, fixture.details);
    const { container } = renderWorkspace("/ai-value-workspace/decisions");

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Sponsor decision loop/i })).toBeInTheDocument();
    });

    const decision = screen.getByRole("region", { name: /Sponsor decision loop/i });
    expect(within(decision).getByRole("heading", { name: /Sponsor Decision/i })).toBeInTheDocument();
    expect(within(decision).getAllByText(status).length).toBeGreaterThan(0);
    expect(within(decision).getByText(recommended)).toBeInTheDocument();
    expect(within(decision).getAllByText(reason).length).toBeGreaterThan(0);
    expect(within(decision).getAllByText(action).length).toBeGreaterThan(0);

    for (const option of [
      "Expand workflow",
      "Collect stronger evidence",
      "Request corrected export",
      "Hold value language",
      "Return to Blueprint"
    ]) {
      expect(within(decision).getByRole("heading", { name: option })).toBeInTheDocument();
    }

    for (const target of [
      /Feeds Blueprint/i,
      /Feeds Customer Evidence Request/i,
      /Feeds Evidence Review/i,
      /Feeds ROI Scenario Readiness/i,
      /Feeds Executive Operating Packet/i
    ]) {
      expect(within(decision).getAllByText(target).length).toBeGreaterThan(0);
    }

    expect(within(decision).getByText(/prepares handoffs only; no customer action is automated/i)).toBeInTheDocument();
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

  it.each([
    {
      state: "ACCEPTED" as const,
      move: /Expand workflow/i,
      owner: /Sponsor and workflow owner/i,
      target: /Blueprint and Executive Operating Packet/i,
      required: /Accepted customer evidence, expansion boundary, and sponsor appetite/i,
      safeAction: /Prepare a caveated expansion handoff/i,
      caveat: /support only; it is not ROI proof and does not establish causality/i
    },
    {
      state: "SUBMITTED" as const,
      move: /Collect stronger evidence/i,
      owner: /Support Operations/i,
      target: /Customer Evidence Request and Evidence Review/i,
      required: /Reviewer decision on the submitted aggregate evidence/i,
      safeAction: /Route reviewer action before stronger value language moves forward/i,
      caveat: /Submitted evidence does not validate value yet/i
    },
    {
      state: "REJECTED" as const,
      move: /Request corrected export/i,
      owner: /Support Operations/i,
      target: /Customer Evidence Request and Evidence Review/i,
      required: /Corrected aggregate export matching metric, source, grain, and windows/i,
      safeAction: /Request corrected aggregate evidence before value review continues/i,
      caveat: /Rejected evidence cannot support value claims/i
    },
    {
      state: "MISSING" as const,
      move: /Collect stronger evidence/i,
      owner: /Support Operations/i,
      target: /Customer Evidence Request and Evidence Review/i,
      required: /Requested aggregate export from the customer-owned outcome system/i,
      safeAction: /Send the data-owner request before value language changes/i,
      caveat: /Missing evidence keeps value language in planning status/i
    }
  ])("previews the workspace selected decision handoff for $state evidence", async ({
    state,
    move,
    owner,
    target,
    required,
    safeAction,
    caveat
  }) => {
    const fixture = withOutcomeReviewState(state);
    stubJourneyFetch(fixture.objects, fixture.details);
    const { container } = renderWorkspace("/ai-value-workspace/decisions");

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Sponsor decision loop/i })).toBeInTheDocument();
    });

    const decision = screen.getByRole("region", { name: /Sponsor decision loop/i });
    const preview = within(decision).getByRole("region", { name: /Decision handoff preview/i });
    expect(within(preview).getByRole("heading", { name: /Decision Handoff Preview/i })).toBeInTheDocument();
    expect(within(preview).getByText(/Selected move/i)).toBeInTheDocument();
    expect(within(preview).getAllByText(move).length).toBeGreaterThan(0);
    expect(within(preview).getByText(/^Owner$/i)).toBeInTheDocument();
    expect(within(preview).getAllByText(owner).length).toBeGreaterThan(0);
    expect(within(preview).getByText(/Where this goes next/i)).toBeInTheDocument();
    expect(within(preview).getByText(target)).toBeInTheDocument();
    expect(within(preview).getByText(/Required evidence or input/i)).toBeInTheDocument();
    expect(within(preview).getByText(required)).toBeInTheDocument();
    expect(within(preview).getByText(/Safe next action/i)).toBeInTheDocument();
    expect(within(preview).getByText(safeAction)).toBeInTheDocument();
    expect(within(preview).getByText(caveat)).toBeInTheDocument();
    expect(within(preview).getByText(/No task is created; this preview only prepares the handoff/i)).toBeInTheDocument();

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

  it("updates the workspace decision handoff preview locally when a different move is selected", async () => {
    const fixture = withOutcomeReviewState("ACCEPTED");
    stubJourneyFetch(fixture.objects, fixture.details);
    const { container } = renderWorkspace("/ai-value-workspace/decisions");

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Sponsor decision loop/i })).toBeInTheDocument();
    });

    const decision = screen.getByRole("region", { name: /Sponsor decision loop/i });
    let preview = within(decision).getByRole("region", { name: /Decision handoff preview/i });
    expect(within(preview).getAllByText(/Expand workflow/i).length).toBeGreaterThan(0);

    fireEvent.click(within(decision).getByRole("button", { name: /Select Hold value language/i }));

    preview = within(decision).getByRole("region", { name: /Decision handoff preview/i });
    expect(within(preview).getAllByText(/Hold value language/i).length).toBeGreaterThan(0);
    expect(within(preview).getByText(/Value-readout owner/i)).toBeInTheDocument();
    expect(within(preview).getByText(/ROI Scenario Readiness and Executive Operating Packet/i)).toBeInTheDocument();
    expect(within(preview).getByText(/Blocked language, reviewed caveats, and unresolved evidence gaps/i)).toBeInTheDocument();
    expect(within(preview).getByText(/Prepare a hold-language handoff before sponsor sharing/i)).toBeInTheDocument();
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
    expect(within(bundle).getByText(/Copy-ready handoff/i)).toBeInTheDocument();
    expect(within(bundle).getByText(/Selected move: Hold value language/i)).toBeInTheDocument();
    expect(within(bundle).getByText(/Owner: Value-readout owner/i)).toBeInTheDocument();
    expect(within(bundle).getByText(/Safe next action: Prepare a hold-language handoff before sponsor sharing/i)).toBeInTheDocument();
    expect(within(bundle).getByText(/No task is created; this is a local handoff draft/i)).toBeInTheDocument();

    fireEvent.click(within(bundle).getByRole("button", { name: /Copy handoff draft/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        expect.stringContaining("Selected move: Hold value language")
      );
    });
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Owner: Value-readout owner"));
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("Safe next action: Prepare a hold-language handoff before sponsor sharing")
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("No task is created; this is a local handoff draft.")
    );
    expect(within(bundle).getByText(/Handoff draft copied/i)).toBeInTheDocument();
  });

  it("tells the client to finish Blueprint before value modeling when no workflow is selected", async () => {
    stubJourneyFetch([]);
    const blueprint = renderWorkspace("/ai-value-workspace/blueprint");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Selected workflow from Journey/i })).toBeInTheDocument();
    });

    const handoff = screen.getByRole("region", { name: /Selected workflow from Journey/i });
    expect(within(handoff).getByText(/No workflow selected yet/i)).toBeInTheDocument();
    expect(
      within(handoff).getByText(/Finish the Blueprint workshop to choose the first client workflow before modeling value/i)
    ).toBeInTheDocument();
    expect(within(handoff).getByRole("link", { name: /Open Blueprint workshop/i })).toBeInTheDocument();
    expectNoUnsafeUiLanguage(blueprint.container.textContent);
    blueprint.unmount();

    const scenario = renderWorkspace("/ai-value-workspace/scenario");

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /ROI scenario readiness/i })).toBeInTheDocument();
    });

    const readiness = screen.getByRole("region", { name: /ROI scenario readiness/i });
    expect(within(readiness).getByText(/Value modeling not ready yet/i)).toBeInTheDocument();
    expect(
      within(readiness).getByText(/Finish Blueprint, outcome mapping, baseline, comparison, and assumptions before presenting stronger value language/i)
    ).toBeInTheDocument();
    expectNoUnsafeUiLanguage(scenario.container.textContent);
    scenario.unmount();

    const evidence = renderWorkspace("/ai-value-workspace/evidence");

    await waitFor(() => {
      expect(screen.getByRole("region", { name: /Customer evidence request/i })).toBeInTheDocument();
    });

    const request = screen.getByRole("region", { name: /Customer evidence request/i });
    expect(within(request).getByText(/Evidence request not ready yet/i)).toBeInTheDocument();
    expect(
      within(request).getByText(/Finish Blueprint and outcome mapping before asking the client for an aggregate export/i)
    ).toBeInTheDocument();
    expectNoUnsafeUiLanguage(evidence.container.textContent);
  });
});
