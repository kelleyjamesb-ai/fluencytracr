import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AIValueDiscovery } from "./AIValueDiscovery";

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
  });

  it("walks the client-facing discovery flow from objective to blueprint", async () => {
    const { container } = renderPage();

    expect(screen.getByRole("heading", { name: /Discovery & Blueprinting/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Client & Objective/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Use Case Discovery/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Blueprint Workshop/i })).toBeInTheDocument();

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

    expect(screen.getByText(/Day-in-the-life workshop: AI-assisted case resolution/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Create the workflow blueprint/i }));
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Open the value workshop/i })).toBeInTheDocument();
    });

    expect(container.textContent).not.toMatch(
      /schema_version|workflow_state|FT_AI_VALUE|engagement_id|priority_state/
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
    expect(screen.getByRole("status")).toHaveTextContent(/still need attention/i);
  });
});
