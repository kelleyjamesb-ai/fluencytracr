import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AIValueJourney } from "./AIValueJourney";

const renderPage = () =>
  render(
    <MemoryRouter>
      <AIValueJourney />
    </MemoryRouter>
  );

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });

const uiTerm = (...parts: string[]) => parts.join("");
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const expectNoUnsafeUiLanguage = (
  text: string | null | undefined,
  extraTerms: string[] = []
) => {
  const terms = [
    uiTerm("workflow", "_", "state"),
    uiTerm("metric", "_", "id"),
    uiTerm("schema", "_", "version"),
    uiTerm("claim", " ", "boundary"),
    uiTerm("claim", " ", "boundaries"),
    uiTerm("Glean", " ", "proved", " ", "ROI"),
    uiTerm("causality", " ", "proof"),
    uiTerm("productivity", " ", "score"),
    ...extraTerms
  ];
  expect(text ?? "").not.toMatch(new RegExp(terms.map(escapeRegExp).join("|"), "i"));
};

const objects = [
  {
    object_type: "engagement",
    object_id: "engagement_northstar",
    workflow_family: null,
    valid: true,
    validation: { client_id: "client_northstar" }
  },
  {
    object_type: "metrics_library",
    object_id: "metrics_support",
    workflow_family: "customer_support_case_resolution",
    valid: true,
    validation: { metric_count: 2 }
  },
  {
    object_type: "value_scenario",
    object_id: "scenario_support",
    workflow_family: "customer_support_case_resolution",
    valid: true,
    validation: {}
  },
  {
    object_type: "roi_scenario",
    object_id: "roi_support",
    workflow_family: "customer_support_case_resolution",
    valid: true,
    validation: {}
  },
  {
    object_type: "fluency_baseline",
    object_id: "baseline_v1",
    workflow_family: null,
    valid: true,
    validation: {}
  },
  {
    object_type: "blueprint",
    object_id: "bp_support",
    workflow_family: "customer_support_case_resolution",
    valid: true,
    validation: {}
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
    object_type: "executive_packet",
    object_id: "packet_v1",
    workflow_family: "customer_support_case_resolution",
    valid: true,
    validation: {}
  }
];

const detailPayloads: Record<string, Record<string, unknown>> = {
  "engagement/engagement_northstar": {
    engagement_id: "engagement_northstar",
    client: {
      client_id: "client_northstar",
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
    blueprint_id: "bp_support",
    workflow_family: "customer_support_case_resolution",
    workflow_name: "Support case resolution",
    value_routes: {
      primary: "CAPACITY_CREATION",
      secondary: ["COST_REDUCTION"]
    }
  },
  "metrics_library/metrics_support": {
    library_id: "metrics_support",
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
      },
      {
        metric_id: "support_escalation_rate",
        workflow_family: "customer_support_case_resolution",
        name: "Escalation rate",
        value_route: "COST_REDUCTION",
        source_system: {
          source_type: "support_system",
          source_name: "Support case management system",
          approved_grain: "aggregate workflow window"
        },
        measurement_unit: "share",
        baseline_rule: "Compare against an approved pre-period escalation rate.",
        allowed_claim_level: "CAVEATED_VALUE_INVESTIGATION"
      }
    ]
  },
  "evidence_readiness/readiness_v1": {
    readiness_id: "readiness_v1",
    workflow_family: "customer_support_case_resolution",
    value_route: "CAPACITY_CREATION",
    source_coverage: {
      ai_activity: "PRESENT",
      workflow: "PRESENT",
      outcome: "CAVEATED",
      baseline: "MISSING",
      trust: "PRESENT",
      assumptions: "CAVEATED",
      suppression: "PRESENT"
    },
    next_actions: [
      "Review missing staffing, rollout, baseline, and metric assumptions with customer owners."
    ]
  },
  "value_scenario/scenario_support": {
    scenario_id: "scenario_support",
    input: {
      scenario_bands: [
        {
          band: "CONSERVATIVE",
          interpretation: "Use the narrowest customer-owned assumption set."
        },
        {
          band: "BASE_CASE",
          interpretation: "Use the approved baseline and comparison window."
        },
        {
          band: "EXPANDED",
          interpretation: "Use later customer validation after assumptions are reviewed."
        }
      ]
    },
    output: {
      claim_state: "CAVEATED_VALUE_INVESTIGATION",
      scenario_summary:
        "Governed value scenario draft for customer-owned validation of aggregate workflow metrics."
    }
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
        rule: "Compare against an approved pre-period window for the same workflow family."
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
        "Potential capacity-creation opportunity for customer-owned validation.",
        "Aggregate support metrics can support a caveated capacity investigation."
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

const cloneDetails = () =>
  JSON.parse(JSON.stringify(detailPayloads)) as Record<string, Record<string, unknown>>;

const withOutcomeReviewState = (state: "MISSING" | "SUBMITTED" | "ACCEPTED" | "REJECTED") => {
  const nextDetails = cloneDetails();
  const roiScenario = nextDetails["roi_scenario/roi_support"] as Record<string, any>;
  roiScenario.evidence_status.outcome_evidence_review_state = state;
  const nextObjects =
    state === "MISSING"
      ? objects.filter((item) => item.object_type !== "outcome_evidence_export")
      : objects.map((item) =>
          item.object_type === "outcome_evidence_export"
            ? { ...item, validation: { review_state: state } }
            : item
        );
  return { objects: nextObjects, details: nextDetails };
};

const stubJourneyFetch = (
  objectList: Array<Record<string, unknown>> = objects,
  payloads: Record<string, Record<string, unknown>> = detailPayloads
) => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/review")) {
        return jsonResponse({ review_state: "ACCEPTED" });
      }
      if (url.includes("/ai-value/readout/")) {
        return new Response("<html>Executive readout</html>", {
          status: 200,
          headers: { "content-type": "text/html" }
        });
      }
      for (const [path, payload] of Object.entries(payloads)) {
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
        if (init?.method === undefined || init.method === "GET") {
          return jsonResponse({ objects: objectList });
        }
      }
      return jsonResponse({ objects: [] });
    })
  );
};

describe("AIValueJourney", () => {
  beforeEach(() => {
    stubJourneyFetch();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the whole-system journey with ROI opportunity mapping", async () => {
    const { container } = renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Northstar Support/)).toBeInTheDocument();
    });
    expect(screen.getAllByText(/Human Readiness/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^Blueprint$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Execution Instrumentation/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Evidence & Measurement/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ROI \/ Value Opportunity Map/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Governed Value Scenario/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Executive Readout/i).length).toBeGreaterThan(0);

    expect(screen.getByText(/Needs client assumptions/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Customer export awaiting review/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Median resolution time/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Escalation rate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Support case management system/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: /Open executive readout/i }).length
    ).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /Open Blueprint workshop/i })).toBeInTheDocument();

    expect(container.textContent).not.toMatch(
      /SUBMITTED|ACCEPTED|HOLD_FOR|outcome_evidence_export|executive_packet/
    );
  });

  it("answers client value questions in plain language", async () => {
    const { container } = renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Northstar Support/)).toBeInTheDocument();
    });

    const questions = screen.getByRole("region", { name: /Client value questions/i });
    expect(within(questions).getByRole("heading", { name: /Client value questions/i })).toBeInTheDocument();
    expect(within(questions).getByText(/What workflow should change first/i)).toBeInTheDocument();
    expect(within(questions).getByText(/Support case resolution/i)).toBeInTheDocument();
    expect(within(questions).getByText(/Where is the ROI opportunity/i)).toBeInTheDocument();
    expect(within(questions).getByText(/Capacity creation/i)).toBeInTheDocument();
    expect(within(questions).getByText(/What can Glean show now/i)).toBeInTheDocument();
    expect(within(questions).getByText(/aggregate AI-enabled work/i)).toBeInTheDocument();
    expect(within(questions).getByText(/What proof is still missing/i)).toBeInTheDocument();
    expect(
      within(questions).getByText(/customer export is awaiting reviewer acceptance/i)
    ).toBeInTheDocument();
    expect(within(questions).getByText(/What can we safely say/i)).toBeInTheDocument();
    expect(within(questions).getByText(/do not present realized ROI or causality/i)).toBeInTheDocument();
    expect(within(questions).getByText(/What should the client do next/i)).toBeInTheDocument();
    expect(
      within(questions).getByText(/Have Support Operations review the submitted aggregate export/i)
    ).toBeInTheDocument();

    expectNoUnsafeUiLanguage(container.textContent);
  });

  it("shows the selected Blueprint workflow as the handoff into downstream value work", async () => {
    const { container } = renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Northstar Support/)).toBeInTheDocument();
    });

    const handoff = screen.getByRole("region", { name: /Selected workflow handoff/i });
    expect(within(handoff).getByRole("heading", { name: /Selected Workflow Handoff/i })).toBeInTheDocument();
    expect(within(handoff).getByText(/Support case resolution/i)).toBeInTheDocument();
    expect(within(handoff).getByText(/Capacity creation/i)).toBeInTheDocument();
    expect(within(handoff).getByText(/Customer export awaiting review/i)).toBeInTheDocument();
    expect(
      within(handoff).getByText(/Blueprint workflow feeds outcome mapping, evidence readiness, scenario builder, and executive packet/i)
    ).toBeInTheDocument();
    expect(within(handoff).getByRole("link", { name: /Continue in value workshop/i })).toBeInTheDocument();
    expect(within(handoff).getByRole("link", { name: /Refine Blueprint/i })).toBeInTheDocument();

    expectNoUnsafeUiLanguage(container.textContent, [
      uiTerm("workflow", "_", "family"),
      uiTerm("object", "_", "id")
    ]);
  });

  it("turns metrics into outcome and ROI opportunity mapping cards", async () => {
    const { container } = renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Northstar Support/)).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: /Outcome & ROI Opportunity Mapping/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Blueprint value route/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Outcome metric/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Customer system to connect/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/What Glean can show/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Scenario handoff/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Safe value language/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Support case resolution/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/aggregate workflow window/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Model as a governed value scenario/i).length).toBeGreaterThan(0);

    expectNoUnsafeUiLanguage(container.textContent, [
      uiTerm("metrics", "_", "library")
    ]);
  });

  it("bridges client value questions to governed metrics and evidence needs", async () => {
    const { container } = renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Northstar Support/)).toBeInTheDocument();
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
      uiTerm("metrics", "_", "library"),
      uiTerm("metric", "_", "id")
    ]);
    expect(bridge.textContent).not.toMatch(/Glean proved ROI|AI caused|realized ROI/i);
  });

  it("turns evidence readiness and scenarios into a client planning workflow", async () => {
    const { container } = renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Northstar Support/)).toBeInTheDocument();
    });

    expect(
      screen.getByRole("heading", { name: /Evidence Readiness & Scenario Plan/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Can trust now/i)).toBeInTheDocument();
    expect(screen.getByText(/Needs client evidence/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Value scenario/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Safe value language/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Next client action/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/FluencyTracr aggregate evidence/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Customer export awaiting review/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Baseline window and comparison period/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Conservative/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Base case/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Expanded/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Caveated value investigation/i).length).toBeGreaterThan(0);

    expectNoUnsafeUiLanguage(container.textContent, [
      uiTerm("scenario", "_", "state"),
      uiTerm("claim", "_", "boundary"),
      uiTerm("HOLD", "_", "FOR"),
      uiTerm("FT", "_", "AI", "_", "VALUE")
    ]);
  });

  it("shows a governed scenario builder with assumptions, evidence gates, and unlock conditions", async () => {
    const { container } = renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Northstar Support/)).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: /Governed Scenario Builder/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Customer-owned assumptions/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Baseline and comparison window/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Customer outcome export/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Scenario bands/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Ready to model/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Needs owner review/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Missing input/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/What unlocks stronger value language/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/Accept or reject the submitted customer outcome export/i).length
    ).toBeGreaterThan(0);
    expect(screen.getByText(/Attach baseline and comparison windows/i)).toBeInTheDocument();
    expect(screen.getByText(/Approve staffing, rollout, process, and metric assumptions/i)).toBeInTheDocument();
    expect(screen.getByText(/Scenario bands are ranges for planning, not proof/i)).toBeInTheDocument();

    expectNoUnsafeUiLanguage(container.textContent, [
      uiTerm("scenario", "_", "state"),
      uiTerm("claim", "_", "boundary"),
      uiTerm("HOLD", "_", "FOR"),
      uiTerm("FT", "_", "AI", "_", "VALUE"),
      uiTerm("employee", " ", "scoring"),
      uiTerm("department", " ", "ranking")
    ]);
  });

  it("surfaces ROI scenario readiness without exposing internal contract language", async () => {
    const { container } = renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Northstar Support/)).toBeInTheDocument();
    });

    const readiness = screen.getByRole("region", { name: /ROI scenario readiness/i });
    expect(
      within(readiness).getByRole("heading", { name: /ROI Scenario Readiness/i })
    ).toBeInTheDocument();
    expect(within(readiness).getByText(/Ready for governed value modeling/i)).toBeInTheDocument();
    expect(within(readiness).getByText(/Support case resolution/i)).toBeInTheDocument();
    expect(within(readiness).getByText(/Capacity creation/i)).toBeInTheDocument();
    expect(within(readiness).getByText(/Median resolution time/i)).toBeInTheDocument();
    expect(within(readiness).getByText(/Support case management system/i)).toBeInTheDocument();
    expect(within(readiness).getAllByText(/Baseline window/i).length).toBeGreaterThan(0);
    expect(within(readiness).getAllByText(/Comparison window/i).length).toBeGreaterThan(0);
    expect(within(readiness).getAllByText(/Customer-owned assumptions/i).length).toBeGreaterThan(0);
    expect(within(readiness).getAllByText(/Customer export awaiting review/i).length).toBeGreaterThan(0);
    expect(within(readiness).getByText(/Scenario bands are planning ranges, not proof/i)).toBeInTheDocument();
    expect(within(readiness).getByText(/No realized ROI claim/i)).toBeInTheDocument();
    expect(within(readiness).getByText(/No customer-facing economic figures/i)).toBeInTheDocument();
    expect(
      within(readiness).getByText(/Review customer assumptions and submitted outcome evidence before stronger value language/i)
    ).toBeInTheDocument();

    expectNoUnsafeUiLanguage(container.textContent, [
      uiTerm("object", "_", "id"),
      uiTerm("workflow", "_", "family"),
      uiTerm("FT", "_", "AI", "_", "VALUE"),
      uiTerm("CAVEATED", "_", "VALUE", "_", "INVESTIGATION"),
      uiTerm("MODELED", "_", "RANGE", "_", "ONLY")
    ]);
  });

  it("turns ROI readiness into a customer evidence request packet", async () => {
    const { container } = renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Northstar Support/)).toBeInTheDocument();
    });

    const request = screen.getByRole("region", { name: /Customer evidence request/i });
    expect(
      within(request).getByRole("heading", { name: /Customer Evidence Request/i })
    ).toBeInTheDocument();
    expect(
      within(request).getByText(/Ask Support Operations for an aggregate Median resolution time export from Support case management system/i)
    ).toBeInTheDocument();
    expect(within(request).getAllByText(/Aggregate Workflow Window/i).length).toBeGreaterThan(0);
    expect(within(request).getByText(/Baseline window owner/i)).toBeInTheDocument();
    expect(within(request).getAllByText(/Support Operations/i).length).toBeGreaterThan(0);
    expect(within(request).getByText(/Comparison window owner/i)).toBeInTheDocument();
    expect(within(request).getByText(/Assumption owner/i)).toBeInTheDocument();
    expect(within(request).getByText(/Support Leader/i)).toBeInTheDocument();
    expect(
      within(request).getByText(/Review submitted customer export with Support Operations before stronger value language/i)
    ).toBeInTheDocument();
    expect(within(request).getByText(/No realized ROI claim/i)).toBeInTheDocument();
    expect(within(request).getByText(/No customer-facing economic figures/i)).toBeInTheDocument();
    expect(
      within(request).getByText(/This request packet is a client data ask, not customer-facing economic output/i)
    ).toBeInTheDocument();

    expectNoUnsafeUiLanguage(container.textContent, [
      uiTerm("object", "_", "id"),
      uiTerm("workflow", "_", "family"),
      uiTerm("FT", "_", "AI", "_", "VALUE"),
      uiTerm("CAVEATED", "_", "VALUE", "_", "INVESTIGATION"),
      uiTerm("MODELED", "_", "RANGE", "_", "ONLY"),
      uiTerm("source", "_", "system"),
      uiTerm("approved", "_", "grain")
    ]);
  });

  it("shows a customer evidence review workbench for a submitted export", async () => {
    const { container } = renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Northstar Support/)).toBeInTheDocument();
    });

    const review = screen.getByRole("region", { name: /Customer evidence review/i });
    expect(
      within(review).getByRole("heading", { name: /Customer Evidence Review/i })
    ).toBeInTheDocument();
    expect(within(review).getByText(/Customer export awaiting review/i)).toBeInTheDocument();
    expect(
      within(review).getByText(/Review the submitted aggregate export against Median resolution time/i)
    ).toBeInTheDocument();
    expect(within(review).getAllByText(/Support case management system/i).length).toBeGreaterThan(0);
    expect(within(review).getAllByText(/Aggregate Workflow Window/i).length).toBeGreaterThan(0);
    expect(within(review).getByText(/Support Operations reviews the submitted export/i)).toBeInTheDocument();
    expect(within(review).getByText(/No realized ROI claim/i)).toBeInTheDocument();
    expect(within(review).getByText(/No customer-facing economic figures/i)).toBeInTheDocument();
    expect(within(review).getByRole("button", { name: /^Accept$/ })).toBeInTheDocument();
    expect(within(review).getByRole("button", { name: /^Reject$/ })).toBeInTheDocument();

    expectNoUnsafeUiLanguage(container.textContent, [
      uiTerm("object", "_", "id"),
      uiTerm("workflow", "_", "family"),
      uiTerm("outcome", "_", "evidence", "_", "export"),
      uiTerm("FT", "_", "AI", "_", "VALUE"),
      uiTerm("CAVEATED", "_", "VALUE", "_", "INVESTIGATION"),
      uiTerm("MODELED", "_", "RANGE", "_", "ONLY"),
      "export_v1"
    ]);
    expect(container.textContent).not.toMatch(/\bSUBMITTED\b|\bACCEPTED\b|\bREJECTED\b/);
  });

  it("shows customer evidence review waiting state when the export is missing", async () => {
    const missing = withOutcomeReviewState("MISSING");
    stubJourneyFetch(missing.objects, missing.details);
    const { container } = renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Northstar Support/)).toBeInTheDocument();
    });

    const review = screen.getByRole("region", { name: /Customer evidence review/i });
    expect(within(review).getByText(/Waiting for customer export/i)).toBeInTheDocument();
    expect(
      within(review).getByText(/Ask Support Operations for the aggregate Median resolution time export/i)
    ).toBeInTheDocument();
    expect(within(review).queryByRole("button", { name: /^Accept$/ })).not.toBeInTheDocument();
    expect(within(review).queryByRole("button", { name: /^Reject$/ })).not.toBeInTheDocument();
    expectNoUnsafeUiLanguage(container.textContent, [
      uiTerm("outcome", "_", "evidence", "_", "export"),
      "export_v1"
    ]);
    expect(container.textContent).not.toMatch(/\bMISSING\b|\bSUBMITTED\b|\bACCEPTED\b|\bREJECTED\b/);
  });

  it("shows customer evidence review accepted state without reviewer actions", async () => {
    const accepted = withOutcomeReviewState("ACCEPTED");
    stubJourneyFetch(accepted.objects, accepted.details);
    const { container } = renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Northstar Support/)).toBeInTheDocument();
    });

    const review = screen.getByRole("region", { name: /Customer evidence review/i });
    expect(within(review).getByText(/Customer export accepted/i)).toBeInTheDocument();
    expect(
      within(review).getByText(/Accepted evidence can support caveated value review/i)
    ).toBeInTheDocument();
    expect(within(review).queryByRole("button", { name: /^Accept$/ })).not.toBeInTheDocument();
    expect(within(review).queryByRole("button", { name: /^Reject$/ })).not.toBeInTheDocument();
    expect(within(review).getByText(/No realized ROI claim/i)).toBeInTheDocument();
    expectNoUnsafeUiLanguage(container.textContent, [
      uiTerm("outcome", "_", "evidence", "_", "export"),
      "export_v1"
    ]);
    expect(container.textContent).not.toMatch(/\bSUBMITTED\b|\bACCEPTED\b|\bREJECTED\b/);
  });

  it("shows customer evidence review rejected state with a resubmission action", async () => {
    const rejected = withOutcomeReviewState("REJECTED");
    stubJourneyFetch(rejected.objects, rejected.details);
    const { container } = renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Northstar Support/)).toBeInTheDocument();
    });

    const review = screen.getByRole("region", { name: /Customer evidence review/i });
    expect(within(review).getByText(/Customer export rejected/i)).toBeInTheDocument();
    expect(
      within(review).getByText(/Ask Support Operations to resubmit the aggregate export/i)
    ).toBeInTheDocument();
    expect(within(review).queryByRole("button", { name: /^Accept$/ })).not.toBeInTheDocument();
    expect(within(review).queryByRole("button", { name: /^Reject$/ })).not.toBeInTheDocument();
    expect(within(review).getByText(/No customer-facing economic figures/i)).toBeInTheDocument();
    expectNoUnsafeUiLanguage(container.textContent, [
      uiTerm("outcome", "_", "evidence", "_", "export"),
      "export_v1"
    ]);
    expect(container.textContent).not.toMatch(/\bSUBMITTED\b|\bACCEPTED\b|\bREJECTED\b/);
  });

  it("shows a sponsor operating packet with governed agentic follow-up", async () => {
    const { container } = renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Northstar Support/)).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: /Executive Operating Packet/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Sponsor decision/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Recommended next action/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Agentic follow-up/i)).toBeInTheDocument();
    expect(screen.getByText(/Value-readout agent/i)).toBeInTheDocument();
    expect(screen.getByText(/Evidence readiness agent/i)).toBeInTheDocument();
    expect(screen.getByText(/Blueprint and metrics agent/i)).toBeInTheDocument();
    expect(screen.getAllByText(/No realized ROI claim/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: /Open executive readout/i }).length
    ).toBeGreaterThan(0);

    expectNoUnsafeUiLanguage(container.textContent, [
      uiTerm("executive", "_", "packet"),
      uiTerm("agent", "_", "run"),
      uiTerm("raw", "_", "prompt"),
      uiTerm("raw", "_", "response"),
      uiTerm("autonomous", " ", "customer", " ", "action")
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
  ])("routes $state evidence into executive cadence language", async ({
    state,
    proofAnswer,
    sponsorDecision,
    nextAction,
    agentAction
  }) => {
    const fixture = withOutcomeReviewState(state);
    stubJourneyFetch(fixture.objects, fixture.details);
    const { container } = renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Northstar Support/)).toBeInTheDocument();
    });

    const questions = screen.getByRole("region", { name: /Client value questions/i });
    expect(within(questions).getByText(/What proof is still missing/i)).toBeInTheDocument();
    expect(within(questions).getByText(proofAnswer)).toBeInTheDocument();

    expect(screen.getAllByText(sponsorDecision).length).toBeGreaterThan(0);
    expect(screen.getAllByText(nextAction).length).toBeGreaterThan(0);
    expect(screen.getAllByText(agentAction).length).toBeGreaterThan(0);

    expectNoUnsafeUiLanguage(container.textContent, [
      uiTerm("outcome", "_", "evidence", "_", "export"),
      uiTerm("agent", "_", "run"),
      "export_v1"
    ]);
    expect(container.textContent).not.toMatch(/\bMISSING\b|\bSUBMITTED\b|\bACCEPTED\b|\bREJECTED\b/);
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
  ])("previews the executive readout share workflow for $state evidence", async ({
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
      value: vi.fn(() => "blob:readout-preview")
    });
    const { container } = renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Northstar Support/)).toBeInTheDocument();
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
      expect(open).toHaveBeenCalledWith("blob:readout-preview", "_blank", "noopener");
    });

    expectNoUnsafeUiLanguage(container.textContent, [
      uiTerm("outcome", "_", "evidence", "_", "export"),
      uiTerm("executive", "_", "packet"),
      "export_v1"
    ]);
    expect(container.textContent).not.toMatch(/\bMISSING\b|\bSUBMITTED\b|\bACCEPTED\b|\bREJECTED\b/);
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
  ])("shows a sponsor decision follow-up loop for $state evidence", async ({
    state,
    status,
    recommended,
    reason,
    action
  }) => {
    const fixture = withOutcomeReviewState(state);
    stubJourneyFetch(fixture.objects, fixture.details);
    const { container } = renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Northstar Support/)).toBeInTheDocument();
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
  ])("previews the selected decision handoff for $state evidence", async ({
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
    const { container } = renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Northstar Support/)).toBeInTheDocument();
    });

    const decision = screen.getByRole("region", { name: /Sponsor decision loop/i });
    const preview = within(decision).getByRole("region", { name: /Decision handoff preview/i });
    expect(within(preview).getByRole("heading", { name: /Decision Handoff Preview/i })).toBeInTheDocument();
    expect(within(preview).getByText(/Selected move/i)).toBeInTheDocument();
    expect(within(preview).getAllByText(move).length).toBeGreaterThan(0);
    expect(within(preview).getByText(/^Owner$/i)).toBeInTheDocument();
    expect(within(preview).getAllByText(owner).length).toBeGreaterThan(0);
    expect(within(preview).getByText(/Target object or workflow/i)).toBeInTheDocument();
    expect(within(preview).getByText(target)).toBeInTheDocument();
    expect(within(preview).getByText(/Required evidence or input/i)).toBeInTheDocument();
    expect(within(preview).getByText(required)).toBeInTheDocument();
    expect(within(preview).getByText(/Safe next action/i)).toBeInTheDocument();
    expect(within(preview).getByText(safeAction)).toBeInTheDocument();
    expect(within(preview).getByText(caveat)).toBeInTheDocument();
    expect(within(preview).getByText(/No task is created; this preview only prepares the handoff/i)).toBeInTheDocument();

    expectNoUnsafeUiLanguage(container.textContent, [
      uiTerm("outcome", "_", "evidence", "_", "export"),
      uiTerm("agent", "_", "run"),
      "export_v1"
    ]);
    expect(container.textContent).not.toMatch(/\bMISSING\b|\bSUBMITTED\b|\bACCEPTED\b|\bREJECTED\b/);
  });

  it("updates the decision handoff preview locally when a different move is selected", async () => {
    const fixture = withOutcomeReviewState("ACCEPTED");
    stubJourneyFetch(fixture.objects, fixture.details);
    const { container } = renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Northstar Support/)).toBeInTheDocument();
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
      uiTerm("outcome", "_", "evidence", "_", "export"),
      uiTerm("agent", "_", "run"),
      "export_v1"
    ]);
    expect(container.textContent).not.toMatch(/\bMISSING\b|\bSUBMITTED\b|\bACCEPTED\b|\bREJECTED\b/);
  });

  it("copies the selected decision handoff as a governed local draft", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText }
    });
    const fixture = withOutcomeReviewState("ACCEPTED");
    stubJourneyFetch(fixture.objects, fixture.details);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Northstar Support/)).toBeInTheDocument();
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

  it("lets a reviewer accept submitted evidence", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Accept$/ })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^Accept$/ }));
    await waitFor(() => {
      const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) =>
        String(call[0])
      );
      expect(calls.some((url) => url.includes("/export_v1/review"))).toBe(true);
    });
  });
});
