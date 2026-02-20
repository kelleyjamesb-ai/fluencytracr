import { app } from "../src/app";
import { store } from "../src/store";
import {
  BoardSnapshotResponseSchema,
  OrientationWorkflowVisibilitySummaryResponseSchema,
  WorkflowRegistryAuditResponseSchema,
  WorkflowRegistryCreateVersionResponseSchema,
  WorkflowRegistryVersionsResponseSchema,
  WorkflowRegistryWorkflowsResponseSchema
} from "@learnaire/shared";

const startServer = () => {
  return new Promise<{ url: string; close: () => Promise<void> }>((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      if (typeof address === "string" || address === null) {
        throw new Error("Unexpected address");
      }
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () => new Promise<void>((resolveClose, reject) => server.close((error) => (error ? reject(error) : resolveClose())))
      });
    });
  });
};

const baseEvent = (workflowId: string, id: string, verificationPresent = false) => ({
  event_id: id,
  event_type: "ai_output_disposition" as const,
  timestamp: new Date().toISOString(),
  risk_class: "high" as const,
  org_unit: "org:executive",
  workflow_id: workflowId,
  disposition: "accepted" as const,
  edit_distance_bucket: "none" as const,
  verification_present: verificationPresent,
  time_to_action_ms: 1000
});

const expectValidSchema = (result: ReturnType<typeof WorkflowRegistryVersionsResponseSchema.safeParse>) => {
  expect(result.success).toBe(true);
  if (!result.success) {
    throw new Error(result.error.message);
  }
};

beforeEach(() => {
  store.reset();
  store.orgs.set("org-1", {
    id: "org-1",
    name: "Test Org",
    minGroupSize: 5,
    createdAt: new Date().toISOString(),
    complianceMode: "shadow"
  });
});

describe("workflow registry and orientation API", () => {
  it("creates versioned registry entries and audit events", async () => {
    const server = await startServer();

    const first = await fetch(`${server.url}/api/workflow-registry/org-1/workflows/wf-1/versions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-role": "ADMIN",
        "x-sub": "user-1"
      },
      body: JSON.stringify({ risk_class: "low", change_reason: "initial registration" })
    });

    const second = await fetch(`${server.url}/api/workflow-registry/org-1/workflows/wf-1/versions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-role": "ADMIN",
        "x-sub": "user-1"
      },
      body: JSON.stringify({ risk_class: "high", change_reason: "risk corrected" })
    });

    const versionsResponse = await fetch(`${server.url}/api/workflow-registry/org-1/workflows/wf-1/versions`, {
      headers: { "x-role": "EXEC_VIEWER" }
    });
    const versionsPayload = await versionsResponse.json();
    const versionsSchema = WorkflowRegistryVersionsResponseSchema.safeParse(versionsPayload);

    const auditResponse = await fetch(`${server.url}/api/workflow-registry/org-1/audit?workflow_id=wf-1`, {
      headers: { "x-role": "EXEC_VIEWER" }
    });
    const auditPayload = await auditResponse.json();
    const auditSchema = WorkflowRegistryAuditResponseSchema.safeParse(auditPayload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expectValidSchema(versionsSchema);
    expect(auditSchema.success).toBe(true);
    expect(versionsPayload.versions).toHaveLength(2);
    expect(versionsPayload.versions[0].version).toBe(1);
    expect(versionsPayload.versions[1].version).toBe(2);
    expect(versionsPayload.versions[1].risk_class).toBe("high");
    expect(versionsPayload.versions[1].policy_config).toEqual({
      policy_version: "dashboard-v1-default-2026-02-18",
      low_min_events: 3,
      medium_min_events: 5,
      high_min_events: 8,
      min_window_days: 30,
      high_sparse_min_events: 12,
      high_sparse_min_window_days: 60
    });
    expect(auditPayload.events).toHaveLength(4);
    expect(auditPayload.events.some((event: any) => event.action === "BASELINE_RESET")).toBe(true);

    const workflowsResponse = await fetch(`${server.url}/api/workflow-registry/org-1/workflows`, {
      headers: { "x-role": "EXEC_VIEWER" }
    });
    const workflowsPayload = await workflowsResponse.json();
    const workflowsSchema = WorkflowRegistryWorkflowsResponseSchema.safeParse(workflowsPayload);
    expect(workflowsSchema.success).toBe(true);

    await server.close();
  });

  it("returns workflow_visibility_summary counts only", async () => {
    const server = await startServer();

    await fetch(`${server.url}/api/workflow-registry/org-1/workflows/wf-visible/versions`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-role": "ADMIN" },
      body: JSON.stringify({ risk_class: "low" })
    });
    await fetch(`${server.url}/api/workflow-registry/org-1/workflows/wf-data/versions`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-role": "ADMIN" },
      body: JSON.stringify({ risk_class: "medium" })
    });
    await fetch(`${server.url}/api/workflow-registry/org-1/workflows/wf-safe/versions`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-role": "ADMIN" },
      body: JSON.stringify({ risk_class: "high" })
    });

    store.fluencyEvents.set("evt-1", baseEvent("wf-visible", "evt-1", true));
    store.fluencyEvents.set("evt-2", baseEvent("wf-visible", "evt-2", true));
    store.fluencyEvents.set("evt-3", baseEvent("wf-visible", "evt-3", true));

    store.fluencyEvents.set("evt-4", baseEvent("wf-data", "evt-4", false));

    store.behavioralSignals.set("sig-1", {
      org_id: "org-1",
      group_id: "wf-safe",
      group_type: "org",
      bucket_start: "2026-02-10",
      signal_name: "invoke_ai",
      count: 1,
      suppressed: true
    });

    const response = await fetch(`${server.url}/api/orientation/org-1?window=60d`, {
      headers: { "x-role": "EXEC_VIEWER" }
    });
    const payload = await response.json();
    const schemaResult = OrientationWorkflowVisibilitySummaryResponseSchema.safeParse(payload);

    await server.close();

    expect(response.status).toBe(200);
    expect(schemaResult.success).toBe(true);
    expect(payload).toEqual({
      org_id: "org-1",
      workflow_visibility_summary: {
        visible: 1,
        not_enough_data_yet: 2,
        not_shown_safety: 0
      }
    });
  });

  it("allows GOV_OPERATOR to create control configuration versions", async () => {
    const server = await startServer();
    const response = await fetch(`${server.url}/api/workflow-registry/org-1/workflows/wf-gov/versions`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-role": "GOV_OPERATOR" },
      body: JSON.stringify({ risk_class: "medium", change_reason: "governance update" })
    });
    const payload = await response.json();
    const schemaResult = WorkflowRegistryCreateVersionResponseSchema.safeParse(payload);
    await server.close();

    expect(response.status).toBe(201);
    expect(schemaResult.success).toBe(true);
    expect(payload.risk_class).toBe("medium");
  });

  it("applies baseline reset so only post-reset evidence is evaluated", async () => {
    const server = await startServer();
    await fetch(`${server.url}/api/workflow-registry/org-1/workflows/wf-reset/versions`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-role": "ADMIN" },
      body: JSON.stringify({ risk_class: "low" })
    });

    store.fluencyEvents.set("old-1", {
      ...baseEvent("wf-reset", "old-1", true),
      timestamp: "2020-01-01T00:00:00.000Z"
    });
    store.fluencyEvents.set("old-2", {
      ...baseEvent("wf-reset", "old-2", true),
      timestamp: "2020-01-02T00:00:00.000Z"
    });
    store.fluencyEvents.set("old-3", {
      ...baseEvent("wf-reset", "old-3", true),
      timestamp: "2020-01-03T00:00:00.000Z"
    });
    store.fluencyEvents.set("old-4", {
      ...baseEvent("wf-reset", "old-4", true),
      timestamp: "2020-01-04T00:00:00.000Z"
    });
    store.fluencyEvents.set("old-5", {
      ...baseEvent("wf-reset", "old-5", true),
      timestamp: "2020-01-05T00:00:00.000Z"
    });
    store.fluencyEvents.set("new-1", {
      ...baseEvent("wf-reset", "new-1", true),
      timestamp: new Date().toISOString()
    });
    store.fluencyEvents.set("new-2", {
      ...baseEvent("wf-reset", "new-2", true),
      timestamp: new Date().toISOString()
    });

    const response = await fetch(`${server.url}/api/orientation/org-1?window=60d`, {
      headers: { "x-role": "EXEC_VIEWER" }
    });
    const payload = await response.json();
    const schemaResult = OrientationWorkflowVisibilitySummaryResponseSchema.safeParse(payload);
    await server.close();

    expect(response.status).toBe(200);
    expect(schemaResult.success).toBe(true);
    expect(payload.workflow_visibility_summary.not_enough_data_yet).toBe(1);
    expect(payload.workflow_visibility_summary.visible).toBe(0);
  });

  it("returns board snapshot in alphabetical order with neutral labels and no ranking fields", async () => {
    const server = await startServer();
    await fetch(`${server.url}/api/workflow-registry/org-1/workflows/wf-b/versions`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-role": "ADMIN" },
      body: JSON.stringify({ risk_class: "low" })
    });
    await fetch(`${server.url}/api/workflow-registry/org-1/workflows/wf-a/versions`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-role": "ADMIN" },
      body: JSON.stringify({ risk_class: "low" })
    });

    store.fluencyEvents.set("evt-a1", { ...baseEvent("wf-a", "evt-a1", true), timestamp: new Date().toISOString() });
    store.fluencyEvents.set("evt-a2", { ...baseEvent("wf-a", "evt-a2", true), timestamp: new Date().toISOString() });
    store.fluencyEvents.set("evt-a3", { ...baseEvent("wf-a", "evt-a3", true), timestamp: new Date().toISOString() });
    store.patternInferenceRecords.push({
      scope_key: "wf-a:LOW",
      scope_type: "WORKFLOW_RISK",
      window_start: "2026-01-01T00:00:00.000Z",
      window_end: "2026-03-01T00:00:00.000Z",
      pattern: "CALIBRATED_FLUENCY",
      confidence_level: "HIGH",
      evidence_count: 20,
      coverage_days: 20,
      surface_mix: { CHAT: 10, DOC_BLOCK: 0, CODE_BLOCK: 0, SUMMARY: 0 },
      top_drivers: ["driver"],
      inference_version: "v0.1",
      parameter_hash: "hash",
      code_commit_hash: "commit",
      generated_at: new Date().toISOString()
    });

    const response = await fetch(`${server.url}/api/board-snapshot/org-1?window=60d`, {
      headers: { "x-role": "EXEC_VIEWER" }
    });
    const payload = await response.json();
    const schemaResult = BoardSnapshotResponseSchema.safeParse(payload);
    await server.close();

    expect(response.status).toBe(200);
    expect(schemaResult.success).toBe(true);
    expect(payload.workflows.map((row: any) => row.workflow_display_name)).toEqual(["wf-a", "wf-b"]);
    expect(payload.workflows[0].working_style).toBe("Balanced AI use");
    expect(payload.workflows[1].working_style).toBeNull();
    expect(payload.workflows[0]).not.toHaveProperty("rank");
    expect(payload.workflows[0]).not.toHaveProperty("trend");
    expect(payload.workflows[0]).not.toHaveProperty("performance");
  });

  it("rejects non-60d window for orientation and board snapshot", async () => {
    const server = await startServer();

    const orientation = await fetch(`${server.url}/api/orientation/org-1?window=30d`, {
      headers: { "x-role": "EXEC_VIEWER" }
    });
    const board = await fetch(`${server.url}/api/board-snapshot/org-1?window=30d`, {
      headers: { "x-role": "EXEC_VIEWER" }
    });

    await server.close();

    expect(orientation.status).toBe(400);
    expect(board.status).toBe(400);
  });
});
