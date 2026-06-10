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

describe("AIValueJourney", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/review")) {
          return jsonResponse({ review_state: "ACCEPTED" });
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

  it("shows the five-stage journey with live status", async () => {
    const { container } = renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Northstar/)).toBeInTheDocument();
    });
    expect(screen.getAllByText(/Fluency Kickoff/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Discovery & Blueprinting/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Value Workshop/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Client Evidence/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Executive Readout/i).length).toBeGreaterThan(0);

    expect(screen.getByText(/Needs client assumptions/i)).toBeInTheDocument();
    expect(screen.getByText(/1 export awaiting review/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open executive readout/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open discovery & blueprinting/i })).toBeInTheDocument();

    expect(container.textContent).not.toMatch(
      /SUBMITTED|ACCEPTED|HOLD_FOR|outcome_evidence_export|executive_packet/
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
