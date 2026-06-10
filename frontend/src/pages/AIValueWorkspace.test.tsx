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

describe("AIValueWorkspace", () => {
  it("renders a client-facing AI value workshop instead of internal object names", () => {
    const { container } = render(<MemoryRouter><AIValueWorkspace /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: /AI Value Workshop/i })).toBeInTheDocument();
    expect(screen.getByText(/Customer support case resolution/i)).toBeInTheDocument();
    expect(screen.getByText(/Capacity creation/i)).toBeInTheDocument();
    expect(screen.getByText(/Needs client assumptions/i)).toBeInTheDocument();
    expect(screen.getByText(/Internal planning only/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Workflow Canvas/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Value Signals/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Value Story/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Evidence Check/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Safe Language/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Executive Brief/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Value Signals/i }));
    expect(screen.getByText(/Are cases resolving faster/i)).toBeInTheDocument();
    expect(screen.getByText(/Support case management system/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Safe Language/i }));
    expect(screen.getByText(/What we can say now/i)).toBeInTheDocument();
    expect(screen.getByText(/What we cannot say/i)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(
      /workflow_state|metric_state|claim boundary|raw_prompt|raw_response|employee_id|user_id|manager_view|team_ranking|productivity_score|Glean proved ROI/i
    );
  });

  it("lets users move from value story to executive brief without database language", () => {
    render(<MemoryRouter><AIValueWorkspace /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: /Value Story/i }));
    expect(screen.getByText(/Most cautious/i)).toBeInTheDocument();
    expect(screen.getByText(/Working case/i)).toBeInTheDocument();
    expect(screen.getByText(/Expansion case/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Executive Brief/i }));
    expect(screen.getByText(/Decision for the sponsor/i)).toBeInTheDocument();
    expect(screen.getByText(/Hold for assumptions before external value claims/i)).toBeInTheDocument();
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
    const { container } = render(<MemoryRouter><AIValueWorkspace /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: /Connect live evidence/i }));

    await waitFor(() => {
      expect(screen.getByText("Live evidence", { selector: "span" })).toBeInTheDocument();
    });
    expect(screen.getByText(/Ready for sponsor validation/i)).toBeInTheDocument();
    expect(screen.getByText(/Shareable with caveats/i)).toBeInTheDocument();
    expect(screen.getByText(/Sales pipeline hygiene/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Value Signals/i }));
    expect(screen.getByText(/Opportunity data completeness/i)).toBeInTheDocument();
    expect(screen.getByText(/CRM reporting/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Safe Language/i }));
    expect(screen.getByText(/Proven ROI/i)).toBeInTheDocument();
    expect(screen.getByText(/AI caused the improvement/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Evidence Check/i }));
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

    const { container } = render(<MemoryRouter><AIValueWorkspace /></MemoryRouter>);
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

    render(<MemoryRouter><AIValueWorkspace /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: /Connect live evidence/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /Could not reach the evidence engine/i
      );
    });
    expect(screen.getByText("Example content", { selector: "span" })).toBeInTheDocument();
  });
});

describe("AIValueWorkspace journey continuity", () => {
  const journeyObjects = [
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
    }
  ];

  const journeyDetails: Record<string, Record<string, unknown>> = {
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

  const stubJourneyFetch = (objects: Array<Record<string, unknown>>) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        for (const [path, payload] of Object.entries(journeyDetails)) {
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
    const { container } = render(<MemoryRouter><AIValueWorkspace /></MemoryRouter>);

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

  it("shows ROI scenario readiness for the selected workflow", async () => {
    stubJourneyFetch(journeyObjects);
    const { container } = render(<MemoryRouter><AIValueWorkspace /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Selected workflow from Journey/i })).toBeInTheDocument();
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

  it("tells the client to finish Blueprint before value modeling when no workflow is selected", async () => {
    stubJourneyFetch([]);
    const { container } = render(<MemoryRouter><AIValueWorkspace /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Selected workflow from Journey/i })).toBeInTheDocument();
    });

    const handoff = screen.getByRole("region", { name: /Selected workflow from Journey/i });
    expect(within(handoff).getByText(/No workflow selected yet/i)).toBeInTheDocument();
    expect(
      within(handoff).getByText(/Finish the Blueprint workshop to choose the first client workflow before modeling value/i)
    ).toBeInTheDocument();
    expect(within(handoff).getByRole("link", { name: /Open Blueprint workshop/i })).toBeInTheDocument();
    const readiness = screen.getByRole("region", { name: /ROI scenario readiness/i });
    expect(within(readiness).getByText(/Value modeling not ready yet/i)).toBeInTheDocument();
    expect(
      within(readiness).getByText(/Finish Blueprint, outcome mapping, baseline, comparison, and assumptions before presenting stronger value language/i)
    ).toBeInTheDocument();
    expectNoUnsafeUiLanguage(container.textContent);
  });
});
