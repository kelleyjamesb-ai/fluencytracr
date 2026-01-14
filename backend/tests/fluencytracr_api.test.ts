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

beforeEach(() => {
  store.reset();
});

it("rejects event payloads containing person identifiers", async () => {
  const server = await startServer();
  const response = await fetch(`${server.url}/api/events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "ADMIN"
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
  const response = await fetch(`${server.url}/api/events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "ADMIN"
    },
    body: JSON.stringify({
      events: ["workflow-1", "workflow-2", "workflow-3"].map((id) => buildEvent(id))
    })
  });
  expect(response.status).toBe(200);

  const patternsResponse = await fetch(`${server.url}/api/patterns?window=60d&scope=org`, {
    headers: { "x-role": "EXEC_VIEWER" }
  });
  server.close();
  expect(patternsResponse.status).toBe(400);
});

it("suppresses patterns below Medium confidence", async () => {
  const server = await startServer();
  await fetch(`${server.url}/api/events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-role": "ADMIN"
    },
    body: JSON.stringify({
      events: ["workflow-1", "workflow-2", "workflow-3", "workflow-4", "workflow-5"].map((id) =>
        buildEvent(id)
      )
    })
  });

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
      "x-role": "ADMIN"
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
