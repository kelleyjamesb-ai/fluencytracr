import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerFluencyTools } from "./tools.js";

const evidenceBundle = {
  schema_version: "evidence_bundle.v1" as const,
  org_id: "org-1",
  window: "weekly",
  generated_at: "2026-05-01T12:00:00.000Z",
  suppression: {
    suppression_applied: false,
    suppression_reasons: []
  },
  coverage: {
    instrumented_sources: ["workflow_run"],
    missing_sources: ["mcp_usage"]
  },
  exposure: {
    shadow_ai: "not_present" as const,
    unsanctioned_tool_class: "not_computed" as const
  },
  calibration: {
    verification_presence: "present" as const,
    recovery_presence: "not_present" as const,
    escalation_to_safe_path_presence: "not_present" as const
  },
  fragility: {
    friction_loops_elevated: "not_present" as const,
    rapid_abandonment_elevated: "not_present" as const,
    blind_acceptance_risk_elevated: "not_present" as const
  },
  learning: {
    trend_direction: "stable" as const
  }
};

type RegisteredTool = (input: { org_id: string; window: string }) => Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}>;

function captureTools() {
  const handlers = new Map<string, RegisteredTool>();
  const server = {
    registerTool: (name: string, _config: unknown, handler: RegisteredTool) => {
      handlers.set(name, handler);
    }
  } as unknown as McpServer;

  return { server, handlers };
}

describe("registerFluencyTools", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.FLUENCYTRACR_BASE_URL = "http://example.test";
    process.env.FLUENCYTRACR_DEV_HEADERS = "true";
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("registers an agent-safe evidence summary tool that omits raw bundle-only fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(evidenceBundle), { status: 200 })
    ) as unknown as typeof fetch;
    const { server, handlers } = captureTools();

    registerFluencyTools(server, fetchMock);

    const handler = handlers.get("fluency.get_agent_evidence_summary");
    expect(handler).toBeDefined();

    const result = await handler!({ org_id: "org-1", window: "weekly" });
    const payload = JSON.parse(result.content[0].text);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://example.test/api/evidence/bundles/org-1?window=weekly",
      expect.objectContaining({ method: "GET" })
    );
    expect(payload).toEqual(
      expect.objectContaining({
        org_id: "org-1",
        suppression_applied: false,
        coverage_summary: {
          instrumented_sources: ["workflow_run"],
          missing_sources: ["mcp_usage"]
        }
      })
    );
    expect(payload.learning).toBeUndefined();
    expect(payload.suppression).toBeUndefined();
    expect(payload.coverage).toBeUndefined();
  });
});
