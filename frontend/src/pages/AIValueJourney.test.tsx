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
    }
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
    expect(within(questions).getByText(/Baseline window and comparison period/i)).toBeInTheDocument();
    expect(within(questions).getByText(/What can we safely say/i)).toBeInTheDocument();
    expect(within(questions).getByText(/do not present realized ROI or causality/i)).toBeInTheDocument();
    expect(within(questions).getByText(/What should the client do next/i)).toBeInTheDocument();
    expect(
      within(questions).getByText(/Ask Support Operations for an aggregate Median resolution time export/i)
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
