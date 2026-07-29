import { afterEach, describe, expect, it, vi } from "vitest";
import * as aiValueApi from "./aiValueApi";
import { runAiValueChain, runAiValueSpine } from "./aiValueApi";

const ok = () =>
  new Response(
    JSON.stringify({
      run: {},
      persisted: []
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" }
    }
  );

describe("AI Value non-persistent workspace runs", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("forces persist false for the canonical spine run", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(ok());

    await runAiValueSpine("ADMIN", "blueprint-1", "metrics-1");

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body).toEqual({
      blueprint_id: "blueprint-1",
      metrics_library_id: "metrics-1",
      persist: false
    });
  });

  it("forces persist false for the full value chain run", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(ok());

    await runAiValueChain("ADMIN", {
      blueprintId: "blueprint-1",
      metricsLibraryId: "metrics-1",
      engagementId: "engagement-1",
      fluencyBaselineId: "baseline-1"
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body).toEqual({
      blueprint_id: "blueprint-1",
      metrics_library_id: "metrics-1",
      engagement_id: "engagement-1",
      fluency_baseline_id: "baseline-1",
      persist: false
    });
  });

  it("does not expose a legacy HTML readout request helper", () => {
    expect(aiValueApi).not.toHaveProperty("fetchReadoutHtml");
  });
});
