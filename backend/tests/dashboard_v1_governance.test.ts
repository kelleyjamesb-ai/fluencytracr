import type { FluencyEvent } from "@learnaire/shared";
import { app } from "../src/app";
import { store, buildFluencyEventRecord } from "../src/store";
import type { Server } from "http";
import {
  BoardSnapshotResponseSchema,
  OrientationWorkflowVisibilitySummaryResponseSchema,
  WorkflowRegistryCreateVersionResponseSchema,
  WorkflowRegistryAuditResponseSchema,
  WorkflowRegistryVersionsResponseSchema,
  WorkflowRegistryWorkflowsResponseSchema
} from "@learnaire/shared";

const FORBIDDEN_FIELD_TOKENS = [
  "score",
  "rank",
  "trend",
  "delta",
  "improvement",
  "percent_change",
  "prior",
  "previous",
  "comparison"
];

const BOARD_METADATA_FORBIDDEN_TOKENS = ["sort", "order", "ranking"];
const openServers = new Set<Server>();

const closeServer = (server: Server) =>
  new Promise<void>((resolve, reject) => {
    server.close((error) => {
      openServers.delete(server);
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

const startServer = () => {
  return new Promise<{ url: string; close: () => Promise<void> }>((resolve) => {
    const server = app.listen(0, () => {
      openServers.add(server);
      const address = server.address();
      if (typeof address === "string" || address === null) {
        throw new Error("Unexpected address");
      }
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () => closeServer(server)
      });
    });
  });
};

const baseEvent = (workflowId: string, id: string, overrides: Record<string, unknown> = {}) => {
  const merged: Record<string, unknown> = {
    event_type: "ai_output_disposition",
    timestamp: new Date().toISOString(),
    risk_class: "high",
    org_unit: "org:executive",
    workflow_id: workflowId,
    disposition: "accepted",
    edit_distance_bucket: "none",
    verification_present: false,
    time_to_action_ms: 1000,
    ...overrides
  };
  delete merged.event_id;
  delete merged.execution_id;
  return buildFluencyEventRecord(merged as FluencyEvent, id);
};

const collectForbiddenFieldPaths = (
  value: unknown,
  forbiddenTokens: string[],
  path = "$"
): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => collectForbiddenFieldPaths(entry, forbiddenTokens, `${path}[${index}]`));
  }
  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => {
    const keyLower = key.toLowerCase();
    const currentPath = `${path}.${key}`;
    const matchesForbidden = forbiddenTokens.some((token) => keyLower.includes(token));
    const directMatches = matchesForbidden ? [currentPath] : [];
    return directMatches.concat(collectForbiddenFieldPaths(nested, forbiddenTokens, currentPath));
  });
};

const postWorkflowVersion = async (
  baseUrl: string,
  workflowId: string,
  role: "ADMIN" | "GOV_OPERATOR" | "EXEC_VIEWER" | "ENABLEMENT_LEAD",
  payload: Record<string, unknown>
) => {
  return fetch(`${baseUrl}/api/workflow-registry/org-1/workflows/${workflowId}/versions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": role
    },
    body: JSON.stringify(payload)
  });
};

beforeEach(() => {
  store.reset();
  store.orgs.set("org-1", {
    id: "org-1",
    name: "Governance Org",
    minGroupSize: 5,
    createdAt: new Date().toISOString(),
    complianceMode: "shadow"
  });
});

afterEach(async () => {
  const servers = Array.from(openServers);
  await Promise.allSettled(servers.map((server) => closeServer(server)));
});

describe("dashboard v1 governance enforcement", () => {
  it("rejects score/rank/trend/delta/improvement and prior-period keys across governance endpoints", async () => {
    const server = await startServer();
    await postWorkflowVersion(server.url, "wf-governance", "ADMIN", { risk_class: "low" });
    store.fluencyEvents.set("evt-1", baseEvent("wf-governance", "evt-1", { verification_present: true }));
    store.fluencyEvents.set("evt-2", baseEvent("wf-governance", "evt-2", { verification_present: true }));
    store.fluencyEvents.set("evt-3", baseEvent("wf-governance", "evt-3", { verification_present: true }));

    const responses = await Promise.all([
      fetch(`${server.url}/api/orientation/org-1?window=60d`, { headers: { "x-role": "EXEC_VIEWER" } }),
      fetch(`${server.url}/api/board-snapshot/org-1?window=60d`, { headers: { "x-role": "EXEC_VIEWER" } }),
      fetch(`${server.url}/api/workflows?org_id=org-1`, { headers: { "x-role": "EXEC_VIEWER" } }),
      fetch(`${server.url}/api/workflow-registry/org-1/workflows`, { headers: { "x-role": "EXEC_VIEWER" } }),
      fetch(`${server.url}/api/workflow-registry/org-1/workflows/wf-governance/versions`, { headers: { "x-role": "EXEC_VIEWER" } }),
      fetch(`${server.url}/api/workflow-registry/org-1/audit?workflow_id=wf-governance`, { headers: { "x-role": "EXEC_VIEWER" } })
    ]);

    const payloads = await Promise.all(responses.map((response) => response.json()));
    await server.close();

    responses.forEach((response) => expect(response.status).toBe(200));
    expect(OrientationWorkflowVisibilitySummaryResponseSchema.safeParse(payloads[0]).success).toBe(true);
    expect(BoardSnapshotResponseSchema.safeParse(payloads[1]).success).toBe(true);
    expect(WorkflowRegistryWorkflowsResponseSchema.safeParse(payloads[3]).success).toBe(true);
    expect(WorkflowRegistryVersionsResponseSchema.safeParse(payloads[4]).success).toBe(true);
    expect(WorkflowRegistryAuditResponseSchema.safeParse(payloads[5]).success).toBe(true);

    payloads.forEach((payload) => {
      const forbidden = collectForbiddenFieldPaths(payload, FORBIDDEN_FIELD_TOKENS);
      expect(forbidden).toEqual([]);
    });
  });

  it("returns deterministic visibility output for identical inputs", async () => {
    const server = await startServer();
    await postWorkflowVersion(server.url, "wf-deterministic", "ADMIN", { risk_class: "medium" });
    for (let i = 1; i <= 5; i += 1) {
      store.fluencyEvents.set(`det-${i}`, baseEvent("wf-deterministic", `det-${i}`, { verification_present: true }));
    }

    const first = await fetch(`${server.url}/api/board-snapshot/org-1?window=60d`, {
      headers: { "x-role": "EXEC_VIEWER" }
    });
    const second = await fetch(`${server.url}/api/board-snapshot/org-1?window=60d`, {
      headers: { "x-role": "EXEC_VIEWER" }
    });
    const firstPayload = await first.json();
    const secondPayload = await second.json();
    await server.close();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(firstPayload).toEqual(secondPayload);
  });

  it("requires verification evidence for high-risk workflow visibility", async () => {
    const server = await startServer();
    await postWorkflowVersion(server.url, "wf-high-risk", "ADMIN", { risk_class: "high" });
    for (let i = 1; i <= 8; i += 1) {
      store.fluencyEvents.set(`high-${i}`, baseEvent("wf-high-risk", `high-${i}`));
    }

    const withoutVerification = await fetch(`${server.url}/api/board-snapshot/org-1?window=60d`, {
      headers: { "x-role": "EXEC_VIEWER" }
    });
    const withoutVerificationPayload = await withoutVerification.json();
    const rowWithoutVerification = withoutVerificationPayload.workflows.find((row: any) => row.workflow_id === "wf-high-risk");
    expect(rowWithoutVerification.visibility_state).toBe("NOT_ENOUGH_DATA_YET");

    store.fluencyEvents.set(
      "high-verification-1",
      buildFluencyEventRecord(
        {
          event_type: "verification_signal",
          timestamp: new Date().toISOString(),
          risk_class: "high",
          org_unit: "org:executive",
          workflow_id: "wf-high-risk",
          verification_type: "policy_check",
          verification_latency_ms: 1000
        },
        "high-verification-1"
      )
    );
    const withVerification = await fetch(`${server.url}/api/board-snapshot/org-1?window=60d`, {
      headers: { "x-role": "EXEC_VIEWER" }
    });
    const withVerificationPayload = await withVerification.json();
    await server.close();

    const rowWithVerification = withVerificationPayload.workflows.find((row: any) => row.workflow_id === "wf-high-risk");
    expect(rowWithVerification.visibility_state).toBe("VISIBLE");
  });

  it("enforces suppression as NOT_SHOWN_SAFETY and cannot be overridden by additional evidence", async () => {
    const server = await startServer();
    await postWorkflowVersion(server.url, "wf-suppressed", "ADMIN", { risk_class: "low" });
    for (let i = 1; i <= 6; i += 1) {
      store.fluencyEvents.set(`sup-${i}`, baseEvent("wf-suppressed", `sup-${i}`, { verification_present: true }));
    }
    store.behavioralSignals.set("sig-suppressed", {
      org_id: "org-1",
      group_id: "wf-suppressed",
      group_type: "org",
      bucket_start: new Date().toISOString(),
      signal_name: "invoke_ai",
      count: 999,
      suppressed: true
    });

    const response = await fetch(`${server.url}/api/board-snapshot/org-1?window=60d`, {
      headers: { "x-role": "EXEC_VIEWER" }
    });
    const payload = await response.json();
    await server.close();

    const row = payload.workflows.find((workflow: any) => workflow.workflow_id === "wf-suppressed");
    expect(row.visibility_state).toBe("NOT_SHOWN_SAFETY");
    expect(row.working_style).toBeNull();
  });

  it("enforces role-based registry modification", async () => {
    const server = await startServer();

    const execViewerAttempt = await postWorkflowVersion(server.url, "wf-rbac", "EXEC_VIEWER", { risk_class: "low" });
    const enablementAttempt = await postWorkflowVersion(server.url, "wf-rbac", "ENABLEMENT_LEAD", { risk_class: "low" });
    const govOperatorAttempt = await postWorkflowVersion(server.url, "wf-rbac", "GOV_OPERATOR", { risk_class: "low" });
    const payload = await govOperatorAttempt.json();
    await server.close();

    expect(execViewerAttempt.status).toBe(403);
    expect(enablementAttempt.status).toBe(403);
    expect(govOperatorAttempt.status).toBe(201);
    expect(WorkflowRegistryCreateVersionResponseSchema.safeParse(payload).success).toBe(true);
  });

  it("returns board snapshot without sorting/ranking metadata", async () => {
    const server = await startServer();
    await postWorkflowVersion(server.url, "wf-b", "ADMIN", { risk_class: "low" });
    await postWorkflowVersion(server.url, "wf-a", "ADMIN", { risk_class: "low" });
    for (let i = 1; i <= 3; i += 1) {
      store.fluencyEvents.set(`wf-a-${i}`, baseEvent("wf-a", `wf-a-${i}`, { verification_present: true }));
    }

    const response = await fetch(`${server.url}/api/board-snapshot/org-1?window=60d`, {
      headers: { "x-role": "EXEC_VIEWER" }
    });
    const payload = await response.json();
    await server.close();

    expect(response.status).toBe(200);
    expect(BoardSnapshotResponseSchema.safeParse(payload).success).toBe(true);
    expect(payload.workflows.map((row: any) => row.workflow_display_name)).toEqual(["wf-a", "wf-b"]);

    const forbidden = collectForbiddenFieldPaths(
      payload,
      FORBIDDEN_FIELD_TOKENS.concat(BOARD_METADATA_FORBIDDEN_TOKENS)
    );
    expect(forbidden).toEqual([]);
  });

  it("creates a new version and baseline reset event when control configuration changes", async () => {
    const server = await startServer();

    const createV1 = await postWorkflowVersion(server.url, "wf-policy-version", "ADMIN", {
      risk_class: "medium",
      policy_config: {
        policy_version: "policy-v1",
        low_min_events: 3,
        medium_min_events: 5,
        high_min_events: 8,
        min_window_days: 30,
        high_sparse_min_events: 12,
        high_sparse_min_window_days: 60
      }
    });
    const createV2 = await postWorkflowVersion(server.url, "wf-policy-version", "ADMIN", {
      risk_class: "medium",
      policy_config: {
        policy_version: "policy-v2",
        low_min_events: 4,
        medium_min_events: 6,
        high_min_events: 9,
        min_window_days: 30,
        high_sparse_min_events: 12,
        high_sparse_min_window_days: 60
      }
    });

    const versionsResponse = await fetch(
      `${server.url}/api/workflow-registry/org-1/workflows/wf-policy-version/versions`,
      { headers: { "x-role": "EXEC_VIEWER" } }
    );
    const versionsPayload = await versionsResponse.json();
    const auditResponse = await fetch(
      `${server.url}/api/workflow-registry/org-1/audit?workflow_id=wf-policy-version`,
      { headers: { "x-role": "EXEC_VIEWER" } }
    );
    const auditPayload = await auditResponse.json();
    await server.close();

    expect(createV1.status).toBe(201);
    expect(createV2.status).toBe(201);
    expect(versionsResponse.status).toBe(200);
    expect(auditResponse.status).toBe(200);
    expect(versionsPayload.versions).toHaveLength(2);
    expect(versionsPayload.versions[0].version).toBe(1);
    expect(versionsPayload.versions[1].version).toBe(2);
    expect(versionsPayload.versions[0].policy_config.policy_version).toBe("policy-v1");
    expect(versionsPayload.versions[1].policy_config.policy_version).toBe("policy-v2");

    const resetEvents = auditPayload.events.filter((event: any) => event.action === "BASELINE_RESET");
    expect(resetEvents).toHaveLength(2);
    expect(resetEvents.map((event: any) => event.version).sort((a: number, b: number) => a - b)).toEqual([1, 2]);
  });
});
