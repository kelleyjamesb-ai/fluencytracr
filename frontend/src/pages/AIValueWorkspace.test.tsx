import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AIValueWorkspace } from "./AIValueWorkspace";

describe("AIValueWorkspace", () => {
  it("renders a client-facing AI value workshop instead of internal object names", () => {
    const { container } = render(<AIValueWorkspace />);

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
    render(<AIValueWorkspace />);

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

  const jsonResponse = (body: unknown) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" }
    });

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
    const { container } = render(<AIValueWorkspace />);

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

    const { container } = render(<AIValueWorkspace />);
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

    render(<AIValueWorkspace />);
    fireEvent.click(screen.getByRole("button", { name: /Connect live evidence/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /Could not reach the evidence engine/i
      );
    });
    expect(screen.getByText("Example content", { selector: "span" })).toBeInTheDocument();
  });
});
