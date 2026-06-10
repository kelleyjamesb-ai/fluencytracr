import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  }
};

describe("AIValueJourney", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/review")) {
          return jsonResponse({ review_state: "ACCEPTED" });
        }
        for (const [path, payload] of Object.entries(detailPayloads)) {
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
            return jsonResponse({ objects });
          }
        }
        return jsonResponse({ objects: [] });
      })
    );
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
    expect(screen.getByText(/Median resolution time/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Escalation rate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Support case management system/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Open executive readout/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open Blueprint workshop/i })).toBeInTheDocument();

    expect(container.textContent).not.toMatch(
      /SUBMITTED|ACCEPTED|HOLD_FOR|outcome_evidence_export|executive_packet/
    );
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

    expect(container.textContent).not.toMatch(
      /metric_id|metrics_library|schema_version|claim boundary|Glean proved ROI|causality proof|productivity score/i
    );
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
    expect(screen.getByText(/Next client action/i)).toBeInTheDocument();
    expect(screen.getAllByText(/FluencyTracr aggregate evidence/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Customer export awaiting review/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Baseline window and comparison period/i)).toBeInTheDocument();
    expect(screen.getByText(/Conservative/i)).toBeInTheDocument();
    expect(screen.getByText(/Base case/i)).toBeInTheDocument();
    expect(screen.getByText(/Expanded/i)).toBeInTheDocument();
    expect(screen.getByText(/Caveated value investigation/i)).toBeInTheDocument();

    expect(container.textContent).not.toMatch(
      /workflow_state|scenario_state|claim_boundary|Claim Boundary|HOLD_FOR|FT_AI_VALUE|Glean proved ROI|causality proof|productivity score/i
    );
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
