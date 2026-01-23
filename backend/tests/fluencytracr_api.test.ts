import { app } from "../src/app";
import { store } from "../src/store";

const startServer = () => {
  return new Promise<{ url: string; close: () => void }>((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      if (typeof address === "string" || address === null) {
        throw new Error("Unexpected address");
      }
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () => server.close()
      });
    });
  });
};

const buildEvent = (workflowId: string, overrides: Partial<Record<string, unknown>> = {}) => ({
  event_type: "ai_output_disposition",
  timestamp: new Date().toISOString(),
  risk_class: "medium",
  org_unit: "org:executive",
  workflow_id: workflowId,
  disposition: "accepted",
  edit_distance_bucket: "none",
  verification_present: true,
  time_to_action_ms: 120000,
  ...overrides
});

const buildInferenceRecord = (
  workflowId: string,
  confidenceLevel: "WITHHOLD" | "LOW" | "MEDIUM" | "HIGH",
  pattern:
    | "CALIBRATED_FLUENCY"
    | "BLIND_EFFICIENCY"
    | "RECOVERY_MATURITY"
    | "FRICTION_LOOP"
    | "UNDERTRUST_AVOIDANCE"
    | "NO_PATTERN"
) => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 60);
  return {
    scope_key: `${workflowId}:MEDIUM`,
    scope_type: "WORKFLOW_RISK" as const,
    window_start: start.toISOString(),
    window_end: end.toISOString(),
    pattern,
    confidence_level: confidenceLevel,
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

beforeEach(() => {
  store.reset();
});

const schemaVersion = "0.1";

it("rejects event payloads containing person identifiers", async () => {
  const server = await startServer();
  const response = await fetch(`${server.url}/api/events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "ADMIN",
      "X-FluencyTracr-Schema-Version": schemaVersion
    },
    body: JSON.stringify({
      events: [
        buildEvent("workflow-1", {
          user_id: "user-1"
        })
      ]
    })
  });
  server.close();
  expect(response.status).toBe(400);
});

it("rejects pattern queries when cohort size is below minimum", async () => {
  const server = await startServer();
  store.patternInferenceRecords.push(
    buildInferenceRecord("workflow-1", "MEDIUM", "CALIBRATED_FLUENCY"),
    buildInferenceRecord("workflow-2", "MEDIUM", "CALIBRATED_FLUENCY"),
    buildInferenceRecord("workflow-3", "MEDIUM", "CALIBRATED_FLUENCY")
  );

  const patternsResponse = await fetch(`${server.url}/api/patterns?window=60d&scope=org`, {
    headers: { "x-role": "EXEC_VIEWER" }
  });
  server.close();
  expect(patternsResponse.status).toBe(400);
});

it("suppresses patterns below Medium confidence", async () => {
  const server = await startServer();
  store.patternInferenceRecords.push(
    buildInferenceRecord("workflow-1", "LOW", "CALIBRATED_FLUENCY"),
    buildInferenceRecord("workflow-2", "LOW", "CALIBRATED_FLUENCY"),
    buildInferenceRecord("workflow-3", "LOW", "CALIBRATED_FLUENCY"),
    buildInferenceRecord("workflow-4", "LOW", "CALIBRATED_FLUENCY"),
    buildInferenceRecord("workflow-5", "LOW", "CALIBRATED_FLUENCY")
  );

  const patternsResponse = await fetch(`${server.url}/api/patterns?window=60d&scope=org`, {
    headers: { "x-role": "EXEC_VIEWER" }
  });
  const payload = await patternsResponse.json();
  server.close();
  expect(payload.patterns).toHaveLength(0);
});

it("rejects ledger creation without a primary pattern", async () => {
  const server = await startServer();
  const response = await fetch(`${server.url}/api/ledger`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "EXEC_VIEWER"
    },
    body: JSON.stringify({
      decision: {
        title: "Guidance refresh",
        description: "Update guidance for verification flow.",
        decision_type: "guidance",
        scope: "org",
        decision_date: new Date().toISOString(),
        logged_by_role: "executive"
      },
      rationale: {
        signal_status_at_decision: "Emerging Pattern",
        confidence_at_decision: "Medium"
      }
    })
  });
  server.close();
  expect(response.status).toBe(400);
});

it("rejects ledger creation with confidence below Medium", async () => {
  const server = await startServer();
  const response = await fetch(`${server.url}/api/ledger`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "EXEC_VIEWER"
    },
    body: JSON.stringify({
      decision: {
        title: "Guidance refresh",
        description: "Update guidance for verification flow.",
        decision_type: "guidance",
        scope: "org",
        decision_date: new Date().toISOString(),
        logged_by_role: "executive"
      },
      rationale: {
        primary_pattern: "Calibrated Fluency",
        signal_status_at_decision: "Emerging Pattern",
        confidence_at_decision: "Low"
      }
    })
  });
  server.close();
  expect(response.status).toBe(400);
});

it("rejects ledger evaluation with confidence below Medium", async () => {
  const server = await startServer();
  const pastStart = new Date();
  pastStart.setDate(pastStart.getDate() - 90);
  const pastEnd = new Date();
  pastEnd.setDate(pastEnd.getDate() - 20);

  const createResponse = await fetch(`${server.url}/api/ledger`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "EXEC_VIEWER"
    },
    body: JSON.stringify({
      decision: {
        title: "Guidance refresh",
        description: "Update guidance for verification flow.",
        decision_type: "guidance",
        scope: "org",
        decision_date: pastStart.toISOString(),
        logged_by_role: "executive"
      },
      rationale: {
        primary_pattern: "Calibrated Fluency",
        signal_status_at_decision: "Emerging Pattern",
        confidence_at_decision: "Medium"
      },
      observation: {
        window_type: "rolling",
        window_length_days: 60,
        observation_start: pastStart.toISOString(),
        observation_end: pastEnd.toISOString(),
        status: "observing"
      }
    })
  });
  const entry = await createResponse.json();
  const evaluateResponse = await fetch(`${server.url}/api/ledger/${entry.ledger_id}/evaluate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "EXEC_VIEWER"
    },
    body: JSON.stringify({
      evaluation: {
        signal_movement: "aligned",
        observed_patterns: [{ pattern: "Calibrated Fluency", direction: "up" }],
        confidence: "Low",
        confounds: [],
        interpretation: "Signals appear aligned with the decision window."
      }
    })
  });
  server.close();
  expect(evaluateResponse.status).toBe(400);
});

it("rejects ledger evaluation when the observation window is incomplete", async () => {
  const server = await startServer();
  const createResponse = await fetch(`${server.url}/api/ledger`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "EXEC_VIEWER"
    },
    body: JSON.stringify({
      decision: {
        title: "Guidance refresh",
        description: "Update guidance for verification flow.",
        decision_type: "guidance",
        scope: "org",
        decision_date: new Date().toISOString(),
        logged_by_role: "executive"
      },
      rationale: {
        primary_pattern: "Calibrated Fluency",
        signal_status_at_decision: "Emerging Pattern",
        confidence_at_decision: "Medium"
      }
    })
  });
  const entry = await createResponse.json();
  const evaluateResponse = await fetch(`${server.url}/api/ledger/${entry.ledger_id}/evaluate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "EXEC_VIEWER"
    },
    body: JSON.stringify({
      evaluation: {
        signal_movement: "unchanged",
        observed_patterns: [{ pattern: "Calibrated Fluency", direction: "flat" }],
        confidence: "Medium",
        confounds: ["Seasonal schedule changes"],
        interpretation: "Signals appear stable within the observation window."
      }
    })
  });
  const evaluationPayload = await evaluateResponse.json();
  server.close();
  expect(evaluationPayload.status).toBe("observing");
});

it("rejects ledger evaluation when coverage is below threshold", async () => {
  const server = await startServer();
  const pastStart = new Date();
  pastStart.setDate(pastStart.getDate() - 80);
  const pastEnd = new Date();
  pastEnd.setDate(pastEnd.getDate() - 10);

  const createResponse = await fetch(`${server.url}/api/ledger`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "EXEC_VIEWER"
    },
    body: JSON.stringify({
      decision: {
        title: "Guidance refresh",
        description: "Update guidance for verification flow.",
        decision_type: "guidance",
        scope: "org",
        decision_date: pastStart.toISOString(),
        logged_by_role: "executive"
      },
      rationale: {
        primary_pattern: "Calibrated Fluency",
        signal_status_at_decision: "Emerging Pattern",
        confidence_at_decision: "Medium"
      },
      observation: {
        window_type: "rolling",
        window_length_days: 60,
        observation_start: pastStart.toISOString(),
        observation_end: pastEnd.toISOString(),
        status: "observing"
      }
    })
  });
  const entry = await createResponse.json();
  const evaluateResponse = await fetch(`${server.url}/api/ledger/${entry.ledger_id}/evaluate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "EXEC_VIEWER"
    },
    body: JSON.stringify({
      evaluation: {
        signal_movement: "aligned",
        observed_patterns: [{ pattern: "Calibrated Fluency", direction: "up" }],
        confidence: "Medium",
        confounds: [],
        interpretation: "Signals appear aligned with the decision window."
      }
    })
  });
  server.close();
  expect(evaluateResponse.status).toBe(400);
});

it("keeps ledger entries append-only when evaluations are added", async () => {
  const server = await startServer();
  const pastStart = new Date();
  pastStart.setDate(pastStart.getDate() - 90);
  const pastEnd = new Date();
  pastEnd.setDate(pastEnd.getDate() - 20);

  const eventTimestamp = new Date(pastStart);
  eventTimestamp.setDate(eventTimestamp.getDate() + 5);
  await fetch(`${server.url}/api/events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "ADMIN",
      "X-FluencyTracr-Schema-Version": schemaVersion
    },
    body: JSON.stringify({
      events: Array.from({ length: 25 }, (_, index) =>
        buildEvent(`workflow-${index % 6}`, { timestamp: eventTimestamp.toISOString() })
      )
    })
  });

  const createResponse = await fetch(`${server.url}/api/ledger`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "EXEC_VIEWER"
    },
    body: JSON.stringify({
      decision: {
        title: "Guidance refresh",
        description: "Update guidance for verification flow.",
        decision_type: "guidance",
        scope: "org",
        decision_date: pastStart.toISOString(),
        logged_by_role: "executive"
      },
      rationale: {
        primary_pattern: "Calibrated Fluency",
        signal_status_at_decision: "Emerging Pattern",
        confidence_at_decision: "Medium"
      },
      observation: {
        window_type: "rolling",
        window_length_days: 60,
        observation_start: pastStart.toISOString(),
        observation_end: pastEnd.toISOString(),
        status: "observing"
      }
    })
  });
  const entry = await createResponse.json();
  const originalCreatedAt = store.decisionLedgerEntries.get(entry.ledger_id)?.meta.created_at;

  const evaluateResponse = await fetch(`${server.url}/api/ledger/${entry.ledger_id}/evaluate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "EXEC_VIEWER"
    },
    body: JSON.stringify({
      evaluation: {
        signal_movement: "aligned",
        observed_patterns: [{ pattern: "Calibrated Fluency", direction: "up" }],
        confidence: "Medium",
        confounds: [],
        interpretation: "Signals appear aligned with the decision window."
      }
    })
  });
  const evaluationPayload = await evaluateResponse.json();
  server.close();
  expect(evaluationPayload.status).toBe("complete");
  expect(store.decisionLedgerEntries.get(entry.ledger_id)?.meta.created_at).toBe(originalCreatedAt);
  expect(store.decisionLedgerEvaluations.size).toBe(1);
});
