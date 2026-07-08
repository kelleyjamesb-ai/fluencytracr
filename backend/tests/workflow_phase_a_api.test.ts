import { app } from "../src/app";
import { store } from "../src/store";

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

beforeEach(() => {
  store.reset();
  store.orgs.set("org-1", {
    id: "org-1",
    name: "Phase A Org",
    minGroupSize: 5,
    createdAt: new Date().toISOString(),
    complianceMode: "shadow"
  });
});

describe("phase A workflow and control config endpoints", () => {
  it("registers and updates workflow risk class with admin/governance RBAC", async () => {
    const server = await startServer();

    const forbidden = await fetch(`${server.url}/api/workflows/register`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-role": "EXEC_VIEWER" },
      body: JSON.stringify({
        org_id: "org-1",
        workflow_id: "wf-1",
        display_name: "Workflow 1",
        risk_class: "low"
      })
    });

    const created = await fetch(`${server.url}/api/workflows/register`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-role": "ADMIN" },
      body: JSON.stringify({
        org_id: "org-1",
        workflow_id: "wf-1",
        display_name: "Workflow 1",
        risk_class: "low",
        change_reason: "initial"
      })
    });
    const createdPayload = await created.json();

    const updated = await fetch(`${server.url}/api/workflows/update-risk-class`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-role": "GOV_OPERATOR" },
      body: JSON.stringify({
        org_id: "org-1",
        workflow_id: "wf-1",
        display_name: "Workflow 1",
        risk_class: "high",
        change_reason: "raised"
      })
    });
    const updatedPayload = await updated.json();

    const list = await fetch(`${server.url}/api/workflows?org_id=org-1`, {
      headers: { "x-role": "EXEC_VIEWER" }
    });
    const listPayload = await list.json();
    await server.close();

    expect(forbidden.status).toBe(403);
    expect(created.status).toBe(201);
    expect(updated.status).toBe(201);
    expect(createdPayload.workflow_id).toBe("wf-1");
    expect(createdPayload.version).toBe(1);
    expect(updatedPayload.version).toBe(2);
    expect(list.status).toBe(200);
    expect(listPayload.workflows).toHaveLength(1);
    expect(listPayload.workflows[0].risk_class).toBe("high");
    expect(listPayload.workflows[0]).not.toHaveProperty("score");
    expect(listPayload.workflows[0]).not.toHaveProperty("rank");
  });

  it("rejects admin-created control config threshold overrides", async () => {
    const server = await startServer();

    const createConfig = await fetch(`${server.url}/api/control-config/create-version`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-role": "ADMIN" },
      body: JSON.stringify({
        org_id: "org-1",
        version_name: "cfg-v1",
        change_reason: "initial control profile",
        window_days_low: 30,
        window_days_medium: 30,
        window_days_high: 60,
        min_events_low: 3,
        min_events_medium: 5,
        min_events_high: 8,
        require_verification_high: true
      })
    });
    const configPayload = await createConfig.json();
    await server.close();

    expect(createConfig.status).toBe(400);
    expect(JSON.stringify(configPayload)).toContain("control_config_thresholds_compiled");
  });
});
