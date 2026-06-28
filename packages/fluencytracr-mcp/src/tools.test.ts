import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerFluencyTools } from "./tools.js";
import { GleanSignalReadinessMapSchema } from "@fluencytracr/shared";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const readinessFixturePath = path.join(
  repoRoot,
  "docs/contracts/glean-signal-readiness/examples/org-northstar-source-derived-readiness-map.json"
);
const valueEvidenceFixturePath = path.join(
  repoRoot,
  "docs/contracts/glean-value-evidence/examples/org-northstar-value-pack.json"
);

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
    const auditDir = mkdtempSync(path.join(tmpdir(), "fluency-mcp-audit-"));
    process.env.FLUENCYTRACR_BASE_URL = "http://example.test";
    process.env.FLUENCYTRACR_DEV_HEADERS = "true";
    process.env.FLUENCYTRACR_GLEAN_READINESS_MAP_PATH = readinessFixturePath;
    process.env.FLUENCYTRACR_GLEAN_VALUE_EVIDENCE_PACK_PATH = valueEvidenceFixturePath;
    process.env.FLUENCYTRACR_MCP_AUDIT_LOG = path.join(auditDir, "audit.jsonl");
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

  it("registers a strict signal readiness summary tool without raw readiness entries", async () => {
    const fetchMock = vi.fn() as unknown as typeof fetch;
    const { server, handlers } = captureTools();

    registerFluencyTools(server, fetchMock);

    const handler = handlers.get("fluency.get_signal_readiness_summary");
    expect(handler).toBeDefined();

    const result = await handler!({ org_id: "org-northstar-enterprise", window: "weekly" });
    const payload = JSON.parse(result.content[0].text);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(payload).toEqual(
      expect.objectContaining({
        org_id: "org-northstar-enterprise",
        source_system: "Glean",
        readiness_counts: {
          present: 3,
          missing: 0,
          suppressed: 1,
          not_computed: 1
        },
        ready_signal_families: ["workflow_run", "agent_run", "skill_lifecycle"],
        non_computable_signal_families: [
          {
            signal_family: "mcp_usage",
            readiness_status: "not_computed",
            suppression_reasons: []
          },
          {
            signal_family: "ai_security",
            readiness_status: "suppressed",
            suppression_reasons: ["policy_review_required"]
          }
        ],
        suppression_applied: true,
        suppression_reasons: ["policy_review_required"]
      })
    );
    expect(payload.entries).toBeUndefined();
    expect(payload.validation_evidence).toBeUndefined();
    expect(payload.stable_join_keys).toBeUndefined();
  });

  it("registers a trusted aggregate signal readiness map tool", async () => {
    const { server, handlers } = captureTools();

    registerFluencyTools(server, vi.fn() as unknown as typeof fetch);

    const handler = handlers.get("fluency.get_signal_readiness_map");
    expect(handler).toBeDefined();

    const result = await handler!({ org_id: "org-northstar-enterprise", window: "weekly" });
    const payload = JSON.parse(result.content[0].text);

    expect(() => GleanSignalReadinessMapSchema.parse(payload)).not.toThrow();
    expect(payload.entries.map((entry: { signal_family: string }) => entry.signal_family)).toEqual([
      "workflow_run",
      "agent_run",
      "skill_lifecycle",
      "mcp_usage",
      "ai_security"
    ]);
  });

  it("registers a strict value claim readiness summary tool", async () => {
    const { server, handlers } = captureTools();

    registerFluencyTools(server, vi.fn() as unknown as typeof fetch);

    const handler = handlers.get("fluency.get_value_claim_readiness_summary");
    expect(handler).toBeDefined();

    const result = await handler!({ org_id: "org-northstar", window: "weekly" });
    const payload = JSON.parse(result.content[0].text);

    expect(payload).toEqual(
      expect.objectContaining({
        org_id: "org-northstar",
        source_system: "Glean",
        value_posture: "directional",
        claim_readiness_counts: {
          customer_safe: 0,
          customer_safe_with_caveats: 2,
          internal_only: 0,
          not_computed: 1,
          suppressed: 1
        }
      })
    );
    expect(payload.customer_safe_claims.map((claim: { claim_id: string }) => claim.claim_id)).toContain(
      "glean.skills.reusable_expertise_operationalized"
    );
    expect(payload.non_computable_claims.map((claim: { claim_id: string }) => claim.claim_id)).toContain(
      "glean.roi.customer_value_to_cost"
    );
    expect(payload.claim_readiness).toBeUndefined();
  });

  it("evaluates a single value claim safety state", async () => {
    const { server, handlers } = captureTools();

    registerFluencyTools(server, vi.fn() as unknown as typeof fetch);

    const handler = handlers.get("fluency.evaluate_claim_safety");
    expect(handler).toBeDefined();

    const result = await handler!({
      org_id: "org-northstar",
      window: "weekly",
      claim_id: "glean.roi.customer_value_to_cost"
    } as { org_id: string; window: string });
    const payload = JSON.parse(result.content[0].text);

    expect(payload).toEqual(
      expect.objectContaining({
        claim_id: "glean.roi.customer_value_to_cost",
        language_mode: "suppressed"
      })
    );
    expect(payload.customer_safe_language).toBeUndefined();
  });

  it("returns only non-computable value claims", async () => {
    const { server, handlers } = captureTools();

    registerFluencyTools(server, vi.fn() as unknown as typeof fetch);

    const handler = handlers.get("fluency.get_non_computable_value_claims");
    expect(handler).toBeDefined();

    const result = await handler!({ org_id: "org-northstar", window: "weekly" });
    const payload = JSON.parse(result.content[0].text);

    expect(payload.map((claim: { claim_id: string }) => claim.claim_id)).toEqual([
      "glean.roi.customer_value_to_cost",
      "glean.mcp.governed_action_boundary"
    ]);
  });

  it("rejects extra top-level value tool inputs", async () => {
    const { server, handlers } = captureTools();

    registerFluencyTools(server, vi.fn() as unknown as typeof fetch);

    const handler = handlers.get("fluency.get_value_claim_readiness_summary");
    expect(handler).toBeDefined();

    const result = await handler!({
      org_id: "org-northstar",
      window: "weekly",
      user_id: "unsafe"
    } as { org_id: string; window: string });
    const payload = JSON.parse(result.content[0].text);

    expect(result.isError).toBe(true);
    expect(payload.reason_code).toBe("invalid_payload");
  });

  it("rejects extra top-level readiness tool inputs", async () => {
    const { server, handlers } = captureTools();

    registerFluencyTools(server, vi.fn() as unknown as typeof fetch);

    const handler = handlers.get("fluency.get_signal_readiness_summary");
    expect(handler).toBeDefined();

    const result = await handler!({
      org_id: "org-northstar-enterprise",
      window: "weekly",
      team_id: "team-1"
    } as { org_id: string; window: string });
    const payload = JSON.parse(result.content[0].text);

    expect(result.isError).toBe(true);
    expect(payload.reason_code).toBe("invalid_payload");
  });

  it("audits full value pack access as suppressed when suppressed claims are present", async () => {
    const { server, handlers } = captureTools();

    registerFluencyTools(server, vi.fn() as unknown as typeof fetch);

    const handler = handlers.get("fluency.get_value_evidence_pack");
    expect(handler).toBeDefined();

    await handler!({ org_id: "org-northstar", window: "weekly" });
    const auditLines = readFileSync(process.env.FLUENCYTRACR_MCP_AUDIT_LOG!, "utf8").trim().split("\n");
    const audit = JSON.parse(auditLines[auditLines.length - 1]);

    expect(audit).toEqual(
      expect.objectContaining({
        tool_name: "fluency.get_value_evidence_pack",
        result: "suppressed",
        suppression_applied: true
      })
    );
    expect(audit.suppression_reasons).toContain("roi_translation_not_approved");
  });

  it("returns deterministic not-found for unknown value claims", async () => {
    const { server, handlers } = captureTools();

    registerFluencyTools(server, vi.fn() as unknown as typeof fetch);

    const handler = handlers.get("fluency.evaluate_claim_safety");
    expect(handler).toBeDefined();

    const result = await handler!({
      org_id: "org-northstar",
      window: "weekly",
      claim_id: "glean.unknown.claim"
    } as { org_id: string; window: string });
    const payload = JSON.parse(result.content[0].text);

    expect(result.isError).toBe(true);
    expect(payload.reason_code).toBe("value_claim_not_found");

    const auditLines = readFileSync(process.env.FLUENCYTRACR_MCP_AUDIT_LOG!, "utf8").trim().split("\n");
    const audit = JSON.parse(auditLines[auditLines.length - 1]);
    expect(audit).toEqual(
      expect.objectContaining({
        tool_name: "fluency.evaluate_claim_safety",
        result: "rejected",
        reason_code: "value_claim_not_found"
      })
    );
  });

  it("redacts value evidence source errors", async () => {
    process.env.FLUENCYTRACR_GLEAN_VALUE_EVIDENCE_PACK_PATH = path.join(repoRoot, "missing-value-pack.json");
    const { server, handlers } = captureTools();

    registerFluencyTools(server, vi.fn() as unknown as typeof fetch);

    const handler = handlers.get("fluency.get_value_claim_readiness_summary");
    expect(handler).toBeDefined();

    const result = await handler!({ org_id: "org-northstar", window: "weekly" });
    const payload = JSON.parse(result.content[0].text);

    expect(result.isError).toBe(true);
    expect(payload).toEqual({
      error: "Value evidence source unavailable or invalid",
      reason_code: "value_evidence_source_error"
    });
    expect(result.content[0].text).not.toContain(repoRoot);
  });
});
