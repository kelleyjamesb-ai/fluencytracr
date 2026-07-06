import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AIValueDiscovery } from "./AIValueDiscovery";
import {
  ACTIVE_AI_VALUE_BLUEPRINT_ID_KEY,
  ACTIVE_AI_VALUE_ENGAGEMENT_ID_KEY
} from "../lib/aiValueApi";

const renderPage = () =>
  render(
    <MemoryRouter>
      <AIValueDiscovery />
    </MemoryRouter>
  );

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });

describe("AIValueDiscovery", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/objects/engagement/")) {
          return jsonResponse(
            { object_type: "engagement", object_id: "engagement_x", valid: true },
            201
          );
        }
        if (url.includes("/intake/workshop")) {
          return jsonResponse(
            {
              intake_id: "intake_x",
              blueprint: { object_type: "blueprint", object_id: "bp_x", valid: true }
            },
            201
          );
        }
        return jsonResponse({ objects: [] });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("walks the client-facing discovery flow from objective to blueprint", async () => {
    const { container } = renderPage();

    expect(screen.getByRole("heading", { name: /Discovery & Blueprinting/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Client & Objective/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Use Case Discovery/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Blueprint Workshop/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /What carries forward/i })).toHaveTextContent(
      /client, sponsor outcome, objectives, and success measures/i
    );

    fireEvent.click(screen.getByRole("button", { name: /Load example engagement/i }));
    expect(screen.getByDisplayValue(/Northstar Enterprise/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Use Case Discovery/i }));
    expect(screen.getByDisplayValue(/AI-assisted case resolution/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Prioritize/i }));
    expect(screen.getByText(/Pick the pilot with the client/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Save engagement/i }));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/Engagement saved/i);
    });
    expect(localStorage.getItem(ACTIVE_AI_VALUE_ENGAGEMENT_ID_KEY)).toMatch(
      /engagement_northstar_enterprise_customer_support/i
    );

    expect(screen.getByText(/Day-in-the-life workshop: AI-assisted case resolution/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Create the workflow blueprint/i }));
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Open the value workshop/i })).toBeInTheDocument();
    });
    expect(localStorage.getItem(ACTIVE_AI_VALUE_BLUEPRINT_ID_KEY)).toBe("bp_x");
    expect(screen.getByRole("link", { name: /Open the value workshop/i }).getAttribute("href")).toContain(
      "blueprintId=bp_x"
    );

    expect(container.textContent).not.toMatch(
      /schema_version|workflow_state|FT_AI_VALUE|engagement_id|priority_state/
    );
  });

  it("renders the blueprint step as a client workshop canvas that feeds value mapping", () => {
    const { container } = renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Load example engagement/i }));
    fireEvent.click(screen.getByRole("button", { name: /Blueprint Workshop/i }));

    const canvas = screen.getByRole("region", { name: /Blueprint workshop canvas/i });
    expect(screen.getByRole("heading", { name: /Blueprint workshop canvas/i })).toBeInTheDocument();
    expect(within(canvas).getByText(/Current workflow/i)).toBeInTheDocument();
    expect(within(canvas).getByText(/Future workflow/i)).toBeInTheDocument();
    expect(within(canvas).getByText(/Friction, handoffs, and systems/i)).toBeInTheDocument();
    expect(within(canvas).getByText(/AI intervention candidates/i)).toBeInTheDocument();
    expect(within(canvas).getByText(/Feeds Metrics and ROI opportunity mapping/i)).toBeInTheDocument();
    expect(within(canvas).getByText(/Feeds Evidence readiness/i)).toBeInTheDocument();
    expect(within(canvas).getByText(/Feeds governed value scenario/i)).toBeInTheDocument();

    expect(within(canvas).getByText(/Knowledge lives in many disconnected systems/i)).toBeInTheDocument();
    expect(within(canvas).getByText(/support_case_management/i)).toBeInTheDocument();
    expect(within(canvas).getByText(/median_resolution_hours/i)).toBeInTheDocument();
    expect(within(canvas).getAllByText(/Capacity creation/i).length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(
      /schema_version|workflow_state|FT_AI_VALUE|engagement_id|priority_state|claim_boundary/
    );
  });

  it("shows friendly gap guidance when the engine rejects the capture", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(
          {
            error: "AI value object failed engine validation",
            reason: "ENGINE_VALIDATION_FAILED",
            gaps: ["client.industry is missing"]
          },
          422
        )
      )
    );

    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Load example engagement/i }));
    fireEvent.click(screen.getByRole("button", { name: /Prioritize/i }));
    fireEvent.click(screen.getByRole("button", { name: /Save engagement/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/client.industry is missing/i);
    });
    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "polite");
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(/still need attention/i);
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("marks required discovery fields and wires visible error text", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Start blank/i }));

    const clientName = screen.getByLabelText("Client name");
    expect(clientName).toHaveAttribute("aria-required", "true");
    expect(clientName).toHaveAttribute("aria-invalid", "true");
    expect(clientName).toHaveAccessibleDescription(/Required: enter the client name/i);

    fireEvent.change(clientName, { target: { value: "Northstar" } });
    expect(clientName).toHaveAttribute("aria-invalid", "false");
    expect(clientName).not.toHaveAccessibleDescription(/Required: enter the client name/i);

    const objectiveStatement = screen.getByLabelText("Objective 1 statement");
    expect(objectiveStatement).toHaveAttribute("aria-required", "true");
    expect(objectiveStatement).toHaveAttribute("aria-invalid", "true");
    expect(objectiveStatement).toHaveAccessibleDescription(
      /Required: capture the objective statement/i
    );

    fireEvent.click(screen.getByRole("button", { name: /Use Case Discovery/i }));
    const useCaseName = screen.getByLabelText("Use case 1 name");
    expect(useCaseName).toHaveAttribute("aria-required", "true");
    expect(useCaseName).toHaveAttribute("aria-invalid", "true");
    expect(useCaseName).toHaveAccessibleDescription(/Required: name the use case/i);

    fireEvent.click(screen.getByRole("button", { name: /Blueprint Workshop/i }));
    const clientQuestion = screen.getByLabelText("The client question on the wall");
    expect(clientQuestion).toHaveAttribute("aria-required", "true");
    expect(clientQuestion).toHaveAttribute("aria-invalid", "true");
    expect(clientQuestion).toHaveAccessibleDescription(/Required: capture the client question/i);
  });

  it("preserves objective links when an earlier objective row is blank", async () => {
    let savedEngagement: any = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/objects/engagement/")) {
          savedEngagement = JSON.parse(String(init?.body ?? "{}"));
          return jsonResponse(
            { object_type: "engagement", object_id: "engagement_x", valid: true },
            201
          );
        }
        return jsonResponse({ objects: [] });
      })
    );

    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Load example engagement/i }));
    fireEvent.change(screen.getByLabelText("Objective 1 statement"), {
      target: { value: "" }
    });

    fireEvent.click(screen.getByRole("button", { name: /Use Case Discovery/i }));
    for (const select of screen.getAllByLabelText(/Which objective does this serve/i)) {
      fireEvent.change(select, { target: { value: "1" } });
    }
    fireEvent.click(screen.getByRole("button", { name: /Prioritize/i }));
    fireEvent.click(screen.getByRole("button", { name: /Save engagement/i }));

    await waitFor(() => {
      expect(savedEngagement).not.toBeNull();
    });
    expect(savedEngagement.business_objectives).toHaveLength(1);
    const linkedObjectiveId = savedEngagement.business_objectives[0].objective_id;
    expect(linkedObjectiveId).toContain("hold_or_improve_answer_quality");
    expect(savedEngagement.use_cases).toHaveLength(2);
    expect(
      savedEngagement.use_cases.every(
        (useCase: Record<string, unknown>) => useCase.objective_id === linkedObjectiveId
      )
    ).toBe(true);
  });
});
