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
        close: () => new Promise<void>((resolve, reject) => { server.closeAllConnections(); server.close((error) => (error ? reject(error) : resolve())); })
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

describe("/api/patterns", () => {
  beforeEach(() => {
    store.reset();
  });

  it("returns stored inference records without raw event processing", async () => {
    store.patternInferenceRecords.push(buildInferenceRecord("workflow-1"));
    store.patternInferenceRecords.push(buildInferenceRecord("workflow-2"));
    store.patternInferenceRecords.push(buildInferenceRecord("workflow-3"));
    store.patternInferenceRecords.push(buildInferenceRecord("workflow-4"));
    store.patternInferenceRecords.push(buildInferenceRecord("workflow-5"));

    const server = await startServer();
    const response = await fetch(`${server.url}/api/patterns?window=60d&scope=org`, {
      headers: { "x-role": "EXEC_VIEWER" }
    });
    const payload = await response.json();
    await server.close();

    expect(response.status).toBe(200);
    expect(payload.patterns.length).toBeGreaterThan(0);
  });

  it("rejects non-org scopes", async () => {
    store.patternInferenceRecords.push(buildInferenceRecord("workflow-1"));
    store.patternInferenceRecords.push(buildInferenceRecord("workflow-2"));
    store.patternInferenceRecords.push(buildInferenceRecord("workflow-3"));
    store.patternInferenceRecords.push(buildInferenceRecord("workflow-4"));
    store.patternInferenceRecords.push(buildInferenceRecord("workflow-5"));

    const server = await startServer();
    const response = await fetch(`${server.url}/api/patterns?window=60d&scope=function`, {
      headers: { "x-role": "EXEC_VIEWER" }
    });
    const payload = await response.json();
    await server.close();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Unsupported scope for inference records");
    expect(payload.supported_scopes).toEqual(["org"]);
    expect(payload.requested_scope).toBe("function");
  });
});
