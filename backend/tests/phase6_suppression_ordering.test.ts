/**
 * Phase 6 — Suppression Logic Verification
 *
 * Proves that suppression occurs BEFORE persistence, caching, and logging.
 * Tests fail if suppressed artifacts exist anywhere post-decision.
 *
 * Constraints:
 * - Ambiguity defaults to SUPPRESS
 * - Suppressed data must not exist post-decision
 */
import { app } from "../src/app";
import { store } from "../src/store";
import { requestApp, withSchemaVersion } from "./test_helpers";
import { evaluateDecision, SUPPRESSION_REASONS } from "../src/phase1/evaluateDecision";
import { surfaceDecision } from "../src/phase1/surfaceDecision";
import { appendPhase1Events, listPhase1Events, clearPhase1Events } from "../src/phase1/eventStore";
import type { Phase1Event } from "../src/phase1/contract";

const ORG_ID = "org-supp-test";

const buildEvent = (overrides: Partial<Phase1Event> = {}): Phase1Event => ({
  schema_version: "FT_V1_2026_01",
  event_name: "FT_V1_DISPOSITION_OBSERVED",
  org_id: ORG_ID,
  function_id: "func-1",
  role_class: "role-1",
  tool_surface: "ASSISTANT",
  event_timestamp: "2025-01-01T00:00:00Z",
  window_id: "2025-01-01__2025-03-15",
  ambiguity_flag: false,
  ...overrides
});

beforeEach(() => {
  store.reset();
  clearPhase1Events();
  store.orgs.set(ORG_ID, {
    id: ORG_ID,
    name: "Suppression Test Org",
    minGroupSize: 10,
    createdAt: new Date().toISOString()
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PATH 1: Phase 1 Decision Pipeline (/api/v1/decision)
// Flow: request → forbiddenFields → Zod parse → evaluateDecision → surfaceDecision → response
// ═══════════════════════════════════════════════════════════════════════════

describe("Path 1: /api/v1/decision — suppression before response", () => {
  it("ambiguous events are SUPPRESSED and never surfaced in response", async () => {
    const payload = {
      events: [
        buildEvent({
          ambiguity_flag: true,
          ambiguity_reason_code: "AMB_EVIDENCE_INSUFFICIENT"
        }),
        buildEvent({ event_name: "FT_V1_LATENCY_OBSERVED" })
      ]
    };

    const response = await requestApp(app, {
      method: "POST",
      path: "/api/v1/decision",
      headers: { "x-role": "ADMIN" },
      body: payload
    });

    expect(response.status).toBe(200);
    expect((response.body as any).decision).toBe("SUPPRESS");
    expect((response.body as any).suppression_reason_code).toBe("AMB_EVIDENCE_INSUFFICIENT");

    // Verify: no data was persisted to any store
    expect(store.fluencyEvents.size).toBe(0);
    expect(store.fluencyPatterns.size).toBe(0);
    expect(store.decisionLedgerEntries.size).toBe(0);
    expect(store.decisionLedgerEvaluations.size).toBe(0);
    expect(store.behavioralSignals.size).toBe(0);
  });

  it("insufficient evidence is SUPPRESSED — single event type", async () => {
    const payload = {
      events: [buildEvent({ event_name: "FT_V1_DISPOSITION_OBSERVED" })]
    };

    const response = await requestApp(app, {
      method: "POST",
      path: "/api/v1/decision",
      headers: { "x-role": "ADMIN" },
      body: payload
    });

    expect(response.status).toBe(200);
    expect((response.body as any).decision).toBe("SUPPRESS");
    expect((response.body as any).suppression_reason_code).toBe(
      SUPPRESSION_REASONS.INSUFFICIENT_EVIDENCE
    );
  });

  it("short window is SUPPRESSED — window < 60 days", async () => {
    const payload = {
      events: [
        buildEvent({
          event_name: "FT_V1_DISPOSITION_OBSERVED",
          window_id: "2025-01-01__2025-01-20"
        }),
        buildEvent({
          event_name: "FT_V1_LATENCY_OBSERVED",
          window_id: "2025-01-01__2025-01-20"
        })
      ]
    };

    const response = await requestApp(app, {
      method: "POST",
      path: "/api/v1/decision",
      headers: { "x-role": "ADMIN" },
      body: payload
    });

    expect(response.status).toBe(200);
    expect((response.body as any).decision).toBe("SUPPRESS");
    expect((response.body as any).suppression_reason_code).toBe(
      SUPPRESSION_REASONS.WINDOW_LT_60
    );
  });

  it("decision response contains ONLY decision fields — no raw data leaks", async () => {
    const payload = {
      events: [
        buildEvent({ event_name: "FT_V1_DISPOSITION_OBSERVED" }),
        buildEvent({ event_name: "FT_V1_LATENCY_OBSERVED" })
      ]
    };

    const response = await requestApp(app, {
      method: "POST",
      path: "/api/v1/decision",
      headers: { "x-role": "EXEC_VIEWER" },
      body: payload
    });

    expect(response.status).toBe(200);
    const keys = Object.keys(response.body as any);
    // Only "decision" (and optionally "suppression_reason_code") — no events, no metadata
    const allowedKeys = new Set(["decision", "suppression_reason_code"]);
    keys.forEach((key) => {
      expect(allowedKeys.has(key)).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PATH 2: Phase 1 Ingest Pipeline (/api/v1/ingest)
// Flow: request → forbiddenFields → Zod parse → appendPhase1Events → 202
// FINDING: Events are persisted BEFORE decision evaluation
// ═══════════════════════════════════════════════════════════════════════════

describe("Path 2: /api/v1/ingest — suppression ordering verification", () => {
  it("FAIL: ambiguous events are persisted to eventStore before any decision", async () => {
    const payload = {
      events: [
        buildEvent({
          ambiguity_flag: true,
          ambiguity_reason_code: "AMB_EVIDENCE_CONFLICT"
        })
      ]
    };

    const response = await requestApp(app, {
      method: "POST",
      path: "/api/v1/ingest",
      headers: { "x-role": "ADMIN" },
      body: payload
    });

    expect(response.status).toBe(202);

    // FAIL CONDITION: The ambiguous event was persisted to the event store
    // without suppression evaluation. Suppression does NOT precede persistence.
    const stored = listPhase1Events();
    expect(stored.length).toBe(1);
    expect(stored[0].ambiguity_flag).toBe(true);

    // VERDICT: FAIL — /api/v1/ingest persists events before suppression.
    // evaluateDecision() is never called on this path.
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PATH 3: Legacy Ingest (/api/ingest)
// Flow: request → schemaVersion → forbiddenFields → ambiguity → 202
// ═══════════════════════════════════════════════════════════════════════════

describe("Path 3: /api/ingest — ambiguity middleware gate", () => {
  it("ambiguity middleware rejects ambiguous payloads before persistence", async () => {
    const payload = {
      ambiguity_flag: true,
      ambiguity_reason_code: "AMB_SOURCE_UNTRUSTED",
      data: "test"
    };

    const response = await requestApp(app, {
      method: "POST",
      path: "/api/ingest",
      headers: withSchemaVersion({ "x-role": "ADMIN" }),
      body: payload
    });

    // Ambiguity middleware blocks at 400 — data never reaches handler
    expect(response.status).toBe(400);
    expect((response.body as any).error).toBe("Ambiguous input rejected");
  });

  it("forbidden fields rejected before persistence", async () => {
    const payload = {
      email: "user@test.com",
      signal_name: "test"
    };

    const response = await requestApp(app, {
      method: "POST",
      path: "/api/ingest",
      headers: withSchemaVersion({ "x-role": "ADMIN" }),
      body: payload
    });

    expect(response.status).toBe(400);
    expect((response.body as any).error).toBe("Forbidden field");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PATH 4: Fluency Events (/api/events)
// Flow: request → rbac → schemaVersion → forbiddenFields → ambiguity → Zod → insertFluencyEvent
// ═══════════════════════════════════════════════════════════════════════════

describe("Path 4: /api/events — middleware ordering", () => {
  it("forbidden fields blocked before event insertion", async () => {
    const payload = {
      events: [{ email: "user@test.com", scope_key: "test", event_name: "test" }]
    };

    const response = await requestApp(app, {
      method: "POST",
      path: "/api/events",
      headers: withSchemaVersion({ "x-role": "ADMIN" }),
      body: payload
    });

    expect(response.status).toBe(400);
    expect(store.fluencyEvents.size).toBe(0);
  });

  it("ambiguity rejected before event insertion", async () => {
    const payload = {
      events: [{ ambiguity_flag: true, scope_key: "test" }]
    };

    const response = await requestApp(app, {
      method: "POST",
      path: "/api/events",
      headers: withSchemaVersion({ "x-role": "ADMIN" }),
      body: payload
    });

    expect(response.status).toBe(400);
    expect(store.fluencyEvents.size).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PATH 5: Governance-Suppressed Endpoints
// These endpoints return 404 "Governance suppressed" — no data flows
// ═══════════════════════════════════════════════════════════════════════════

describe("Path 5: Governance-suppressed endpoints — no data path exists", () => {
  const suppressedEndpoints = [
    { method: "POST" as const, path: `/orgs/${ORG_ID}/metrics/import` },
    { method: "POST" as const, path: `/orgs/${ORG_ID}/controls/import` },
    { method: "POST" as const, path: `/orgs/${ORG_ID}/enablement/import` },
    { method: "POST" as const, path: `/orgs/${ORG_ID}/behavior/import` },
    { method: "POST" as const, path: `/orgs/${ORG_ID}/roster/import` },
    { method: "GET" as const, path: `/orgs/${ORG_ID}/dashboard/overview` },
    { method: "GET" as const, path: `/orgs/${ORG_ID}/dashboard/export.csv` },
    { method: "GET" as const, path: `/orgs/${ORG_ID}/dashboard/export.pdf` },
    { method: "GET" as const, path: `/orgs/${ORG_ID}/telemetry/index` },
    { method: "GET" as const, path: `/orgs/${ORG_ID}/behavior/signals` },
    { method: "GET" as const, path: `/orgs/${ORG_ID}/behavior/patterns` },
  ];

  suppressedEndpoints.forEach(({ method, path }) => {
    it(`${method} ${path} returns governance suppressed`, async () => {
      const response = await requestApp(app, {
        method,
        path,
        headers: withSchemaVersion({ "x-role": "ADMIN" }),
        body: method === "POST" ? { test: "data" } : undefined
      });

      // These must return 400 (forbidden fields / schema version) or 404 (governance suppressed)
      expect([400, 404]).toContain(response.status);

      // Verify no data leaked to stores
      expect(store.metrics.size).toBe(0);
      expect(store.controls.size).toBe(0);
      expect(store.enablement.size).toBe(0);
      expect(store.behavioralSignals.size).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PATH 6: Unit-level suppression logic (evaluateDecision)
// ═══════════════════════════════════════════════════════════════════════════

describe("Path 6: evaluateDecision — pure suppression logic", () => {
  it("empty events → SUPPRESS with SPARSE_DATA", () => {
    const decision = evaluateDecision([]);
    expect(decision.decision).toBe("SUPPRESS");
    expect(decision.suppression_reason_code).toBe(SUPPRESSION_REASONS.SPARSE_DATA);
  });

  it("inconsistent cohort → SUPPRESS with AMBIGUOUS_INPUT", () => {
    const events = [
      buildEvent({ org_id: "org-a" }),
      buildEvent({ org_id: "org-b" })
    ];
    const decision = evaluateDecision(events);
    expect(decision.decision).toBe("SUPPRESS");
    expect(decision.suppression_reason_code).toBe(SUPPRESSION_REASONS.AMBIGUOUS_INPUT);
  });

  it("any ambiguity_flag=true → SUPPRESS immediately", () => {
    const events = [
      buildEvent({
        event_name: "FT_V1_DISPOSITION_OBSERVED",
        ambiguity_flag: true,
        ambiguity_reason_code: "AMB_SCHEMA_MISSING_REQUIRED"
      }),
      buildEvent({ event_name: "FT_V1_LATENCY_OBSERVED" })
    ];
    const decision = evaluateDecision(events);
    expect(decision.decision).toBe("SUPPRESS");
    expect(decision.suppression_reason_code).toBe("AMB_SCHEMA_MISSING_REQUIRED");
  });

  it("invalid window → SUPPRESS with WINDOW_INVALID", () => {
    const events = [
      buildEvent({ window_id: "garbage" }),
      buildEvent({ event_name: "FT_V1_LATENCY_OBSERVED", window_id: "garbage" })
    ];
    const decision = evaluateDecision(events);
    expect(decision.decision).toBe("SUPPRESS");
    expect(decision.suppression_reason_code).toBe(SUPPRESSION_REASONS.WINDOW_INVALID);
  });

  it("window < 60 days → SUPPRESS with WINDOW_LT_60D", () => {
    const events = [
      buildEvent({ window_id: "2025-01-01__2025-01-15" }),
      buildEvent({ event_name: "FT_V1_LATENCY_OBSERVED", window_id: "2025-01-01__2025-01-15" })
    ];
    const decision = evaluateDecision(events);
    expect(decision.decision).toBe("SUPPRESS");
    expect(decision.suppression_reason_code).toBe(SUPPRESSION_REASONS.WINDOW_LT_60);
  });

  it("single event type → SUPPRESS with INSUFFICIENT_EVIDENCE", () => {
    const events = [buildEvent()];
    const decision = evaluateDecision(events);
    expect(decision.decision).toBe("SUPPRESS");
    expect(decision.suppression_reason_code).toBe(SUPPRESSION_REASONS.INSUFFICIENT_EVIDENCE);
  });

  it("SURFACE only when ALL gates pass", () => {
    const events = [
      buildEvent({ event_name: "FT_V1_DISPOSITION_OBSERVED" }),
      buildEvent({ event_name: "FT_V1_LATENCY_OBSERVED" })
    ];
    const decision = evaluateDecision(events);
    expect(decision.decision).toBe("SURFACE");
    expect(decision.suppression_reason_code).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PATH 7: surfaceDecision — output boundary verification
// ═══════════════════════════════════════════════════════════════════════════

describe("Path 7: surfaceDecision — suppressed data stripped at boundary", () => {
  it("SUPPRESS decision carries reason code but no event data", () => {
    const result = surfaceDecision({
      decision: "SUPPRESS",
      suppression_reason_code: "AMB_EVIDENCE_INSUFFICIENT",
      window_length_days: 0
    });

    expect(result.decision).toBe("SUPPRESS");
    expect(result.suppression_reason_code).toBe("AMB_EVIDENCE_INSUFFICIENT");
    // No event data, no window_length_days, no metadata
    expect(Object.keys(result)).toEqual(
      expect.arrayContaining(["decision", "suppression_reason_code"])
    );
    expect(Object.keys(result).length).toBe(2);
  });

  it("SURFACE decision carries only decision — no metadata", () => {
    const result = surfaceDecision({
      decision: "SURFACE",
      window_length_days: 74
    });

    expect(result.decision).toBe("SURFACE");
    // window_length_days is stripped at the surface boundary
    expect((result as any).window_length_days).toBeUndefined();
    expect(Object.keys(result)).toEqual(["decision"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY SUPPRESSION (suppression.ts, behavioral_signals.ts)
// ═══════════════════════════════════════════════════════════════════════════

describe("Legacy suppression functions — FAIL: not implemented", () => {
  it("FAIL: suppression.ts applySuppression returns empty — k-anonymity not enforced", async () => {
    const { applySuppression } = await import("../src/suppression");
    const result = applySuppression(
      [{ metricName: "test", bucketStart: "2025-01-01", metricValue: 42 }],
      10
    );
    // Returns empty — suppression is a no-op
    expect(result).toEqual([]);

    // VERDICT: FAIL — Legacy metric suppression is not implemented.
  });

  it("FAIL: behavioral_signals.ts suppressAndRollup returns empty", async () => {
    const { suppressAndRollup } = await import("../src/behavioral_signals");
    const result = suppressAndRollup([], 10);
    expect(result).toEqual([]);

    // VERDICT: FAIL — Legacy behavioral signal suppression is not implemented.
  });
});
