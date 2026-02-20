import { app } from "../../src/app";
import { store } from "../../src/store";

const startServer = () => {
  return new Promise<{ url: string; close: () => Promise<void> }>((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      if (typeof address === "string" || address === null) {
        throw new Error("Unexpected address");
      }
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
      });
    });
  });
};

const buildInferenceRecord = (workflowId: string) => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 60);
  return {
    scope_key: `${workflowId}:MEDIUM`,
    scope_type: "WORKFLOW_RISK" as const,
    window_start: start.toISOString(),
    window_end: end.toISOString(),
    pattern: "CALIBRATED_FLUENCY" as const,
    confidence_level: "MEDIUM" as const,
    evidence_count: 40,
    coverage_days: 14,
    surface_mix: { CHAT: 10, DOC_BLOCK: 0, CODE_BLOCK: 0, SUMMARY: 0 },
    top_drivers: ["Driver A", "Driver B"],
    inference_version: "v0.1.0",
    parameter_hash: "hash",
    code_commit_hash: "hash",
    generated_at: end.toISOString()
  };
};

describe("/orgs/:orgId/telemetry/index", () => {
  beforeEach(() => {
    store.reset();
    store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 5, createdAt: "now" });
  });

  it("is admin-only", async () => {
    const server = await startServer();
    const response = await fetch(`${server.url}/orgs/org-1/telemetry/index?window=60d`, {
      headers: { "x-role": "EXEC_VIEWER" }
    });
    await server.close();
    expect(response.status).toBe(403);
  });

  it("returns telemetry index for admins", async () => {
    store.patternInferenceRecords.push(
      buildInferenceRecord("workflow-1"),
      buildInferenceRecord("workflow-2"),
      buildInferenceRecord("workflow-3"),
      buildInferenceRecord("workflow-4"),
      buildInferenceRecord("workflow-5")
    );

    const server = await startServer();
    const response = await fetch(`${server.url}/orgs/org-1/telemetry/index?window=60d`, {
      headers: { "x-role": "ADMIN" }
    });
    const payload = await response.json();
    await server.close();

    expect(response.status).toBe(200);
    expect(payload.operational_telemetry_index).toBeDefined();
  });
});
