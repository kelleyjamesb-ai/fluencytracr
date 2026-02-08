/**
 * Phase 6 — Adversarial Validation
 *
 * Goal: Break FluencyTracr by extracting trends, progress narratives,
 * or performance signals.
 *
 * Every attack is documented with its outcome.
 * Any ambiguous result must SUPPRESS.
 * If any attack partially succeeds, FAIL.
 */
import { PrismaClient } from "@prisma/client";
import { app } from "../src/app";
import { store } from "../src/store";
import { requestApp, loginAs, withAuth, withSchemaVersion } from "./test_helpers";
import { evaluateDecision } from "../src/phase1/evaluateDecision";
import { surfaceDecision } from "../src/phase1/surfaceDecision";
import { appendPhase1Events, listPhase1Events, clearPhase1Events } from "../src/phase1/eventStore";
import { setPrismaClient, clearAuditLogsForTest } from "../src/audit_log";
import { containsForbiddenFields, GOVERNANCE_FORBIDDEN_FIELDS } from "@learnaire/shared";
import type { Phase1Event } from "../src/phase1/contract";

const _prisma = new PrismaClient();
beforeAll(() => { setPrismaClient(_prisma); });
afterAll(async () => { await _prisma.$disconnect(); });

const ORG_ID = "org-adversarial";

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

let adminCookie: string;
let viewerCookie: string;
beforeEach(async () => {
  store.reset();
  clearPhase1Events();
  await clearAuditLogsForTest();
  store.orgs.set(ORG_ID, {
    id: ORG_ID,
    name: "Adversarial Test Org",
    minGroupSize: 10,
    createdAt: new Date().toISOString()
  });
  adminCookie = await loginAs(app, "ADMIN");
  viewerCookie = await loginAs(app, "EXEC_VIEWER");
});

// ═══════════════════════════════════════════════════════════════════════════
// ATTACK 1: Attempt to infer TRENDS
// ═══════════════════════════════════════════════════════════════════════════

describe("Attack 1: Trend Inference", () => {
  it("ATTACK: submit events across multiple windows to derive trend", async () => {
    // Attacker submits two windows hoping to compare SURFACE rates
    const window1Events = [
      buildEvent({ event_name: "FT_V1_DISPOSITION_OBSERVED", window_id: "2025-01-01__2025-03-15" }),
      buildEvent({ event_name: "FT_V1_LATENCY_OBSERVED", window_id: "2025-01-01__2025-03-15" })
    ];
    const window2Events = [
      buildEvent({ event_name: "FT_V1_DISPOSITION_OBSERVED", window_id: "2025-03-16__2025-06-15" }),
      buildEvent({ event_name: "FT_V1_LATENCY_OBSERVED", window_id: "2025-03-16__2025-06-15" })
    ];

    // Each window gets an independent decision
    const decision1 = surfaceDecision(evaluateDecision(window1Events));
    const decision2 = surfaceDecision(evaluateDecision(window2Events));

    // Both return only "SURFACE" or "SUPPRESS" — no numeric data to compare
    expect(["SURFACE", "SUPPRESS"]).toContain(decision1.decision);
    expect(["SURFACE", "SUPPRESS"]).toContain(decision2.decision);

    // No count, no score, no delta between windows
    expect((decision1 as any).count).toBeUndefined();
    expect((decision1 as any).score).toBeUndefined();
    expect((decision1 as any).trend).toBeUndefined();
    expect((decision2 as any).delta).toBeUndefined();

    // RESULT: Attack MITIGATED at the output boundary.
    // Binary decisions cannot be mathematically compared for trends.
    // However: an attacker who can submit controlled inputs and observe
    // SURFACE/SUPPRESS over time could infer a 1-bit trend signal.
    // This is a PARTIAL SUCCESS — see verdict below.
  });

  it("ATTACK: attempt to inject trend fields into ingestion", async () => {
    const payload = {
      events: [{
        schema_version: "FT_V1_2026_01",
        event_name: "FT_V1_DISPOSITION_OBSERVED",
        org_id: ORG_ID,
        function_id: "func-1",
        role_class: "role-1",
        tool_surface: "ASSISTANT",
        event_timestamp: "2025-01-01T00:00:00Z",
        window_id: "2025-01-01__2025-03-15",
        ambiguity_flag: false,
        trend: "improving",
        delta: 5
      }]
    };

    const response = await requestApp(app, {
      method: "POST",
      path: "/api/v1/decision",
      headers: withAuth(adminCookie),
      body: payload
    });

    // Strict Zod schema rejects unknown fields
    expect(response.status).toBe(400);

    // RESULT: Attack BLOCKED — strict schema rejects trend/delta fields.
  });

  it("forbidden fields list blocks all trend-related keys", () => {
    const trendPayloads = [
      { trend: "up" },
      { delta: 5 },
      { change: 0.1 },
      { baseline: 100 },
      { comparison: "week-over-week" },
      { cumulative: 42 },
      { rate: 0.85 },
      { ratio: 1.5 }
    ];

    trendPayloads.forEach((payload) => {
      expect(containsForbiddenFields(payload)).toBe(true);
    });

    // RESULT: Attack BLOCKED — forbidden field gate catches all trend vocabulary.
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ATTACK 2: Attempt to correlate across TIME
// ═══════════════════════════════════════════════════════════════════════════

describe("Attack 2: Temporal Correlation", () => {
  it("ATTACK: decision endpoint does not return timestamps or window metadata", async () => {
    const payload = {
      events: [
        buildEvent({ event_name: "FT_V1_DISPOSITION_OBSERVED" }),
        buildEvent({ event_name: "FT_V1_LATENCY_OBSERVED" })
      ]
    };

    const response = await requestApp(app, {
      method: "POST",
      path: "/api/v1/decision",
      headers: withAuth(viewerCookie),
      body: payload
    });

    expect(response.status).toBe(200);
    const body = response.body as any;

    // No temporal data in response
    expect(body.window_id).toBeUndefined();
    expect(body.window_start).toBeUndefined();
    expect(body.window_end).toBeUndefined();
    expect(body.event_timestamp).toBeUndefined();
    expect(body.window_length_days).toBeUndefined();
    expect(body.generated_at).toBeUndefined();

    // RESULT: Attack BLOCKED — no temporal data in decision output.
  });

  it("ATTACK: attempt to link events by submitting same cohort across windows", async () => {
    // Submit events for the same cohort in different windows
    const earlyWindow = [
      buildEvent({ window_id: "2025-01-01__2025-03-15", event_name: "FT_V1_DISPOSITION_OBSERVED" }),
      buildEvent({ window_id: "2025-01-01__2025-03-15", event_name: "FT_V1_LATENCY_OBSERVED" })
    ];
    const lateWindow = [
      buildEvent({ window_id: "2025-04-01__2025-06-15", event_name: "FT_V1_DISPOSITION_OBSERVED" }),
      buildEvent({ window_id: "2025-04-01__2025-06-15", event_name: "FT_V1_LATENCY_OBSERVED" })
    ];

    // Decisions are independent — no cross-window state
    const d1 = surfaceDecision(evaluateDecision(earlyWindow));
    const d2 = surfaceDecision(evaluateDecision(lateWindow));

    // No reference to the other window in either decision
    expect(Object.keys(d1).sort()).toEqual(["decision"]);
    expect(Object.keys(d2).sort()).toEqual(["decision"]);

    // RESULT: Attack BLOCKED — evaluateDecision is stateless across windows.
  });

  it("ATTACK: cross-window keys are forbidden in schemas", () => {
    // Keys currently blocked by GOVERNANCE_FORBIDDEN_FIELDS
    const blockedPayloads = [
      { window_start: "2025-01-01" },
      { window_end: "2025-03-15" },
      { previous_window: "w1" }
    ];

    blockedPayloads.forEach((payload) => {
      expect(containsForbiddenFields(payload)).toBe(true);
    });

    // RESULT: Attack BLOCKED for explicit cross-window keys.
  });

  it("FINDING: 'history' and 'time_series' keys are NOT in forbidden list", () => {
    // These keys could enable temporal correlation but are not currently blocked
    const unblockedPayloads = [
      { history: [1, 2, 3] },
      { time_series: [] }
    ];

    unblockedPayloads.forEach((payload) => {
      expect(containsForbiddenFields(payload)).toBe(false);
    });

    // FINDING: These keys pass the forbidden field gate.
    // Phase 6 constraint: cannot modify privacy.ts (governance-controlled file).
    // This gap must be addressed in a future governance cycle.
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ATTACK 3: Attempt to reconstruct SUPPRESSED data
// ═══════════════════════════════════════════════════════════════════════════

describe("Attack 3: Suppressed Data Reconstruction", () => {
  it("ATTACK: suppressed decision carries only reason code, not event data", () => {
    const events = [
      buildEvent({
        ambiguity_flag: true,
        ambiguity_reason_code: "AMB_EVIDENCE_CONFLICT"
      })
    ];

    const decision = evaluateDecision(events);
    const output = surfaceDecision(decision);

    expect(output.decision).toBe("SUPPRESS");
    // The output contains ONLY decision + reason code
    expect((output as any).events).toBeUndefined();
    expect((output as any).org_id).toBeUndefined();
    expect((output as any).function_id).toBeUndefined();
    expect((output as any).window_id).toBeUndefined();
    expect((output as any).event_count).toBeUndefined();

    // RESULT: Attack BLOCKED — suppressed decision does not leak source data.
  });

  it("ATTACK: governance-suppressed endpoints return no data at all", async () => {
    const response = await requestApp(app, {
      method: "GET",
      path: `/orgs/${ORG_ID}/dashboard/overview?aggregation=org`,
      headers: withAuth(adminCookie)
    });

    expect(response.status).toBe(404);
    expect((response.body as any).error).toBe("Governance suppressed");

    // No metrics, no signals, no counts
    expect((response.body as any).metrics).toBeUndefined();
    expect((response.body as any).data).toBeUndefined();
    expect((response.body as any).signals).toBeUndefined();

    // RESULT: Attack BLOCKED — suppressed endpoints return only error.
  });

  it("ATTACK: orientation endpoint reveals no quantified data", async () => {
    const response = await requestApp(app, {
      method: "GET",
      path: `/api/orientation/${ORG_ID}?session_start=2025-01-01T00:00:00Z`,
      headers: withAuth(viewerCookie)
    });

    expect(response.status).toBe(200);
    const body = response.body as any;

    // Always SUPPRESSED — no quantified state
    expect(body.observation_detected.state).toBe("SUPPRESSED");
    expect(body.suppression_in_effect.state).toBe("IN_EFFECT");

    // Verify no forbidden fields in response
    expect(containsForbiddenFields(body)).toBe(false);

    // RESULT: Attack BLOCKED — orientation returns only suppressed state.
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ATTACK 4: Attempt to extract PERFORMANCE SIGNALS
// ═══════════════════════════════════════════════════════════════════════════

describe("Attack 4: Performance Signal Extraction", () => {
  it("ATTACK: attempt to inject scoring fields", async () => {
    const scoringPayloads = [
      { score: 85, metric: "fluency" },
      { points: 100, level: "advanced" },
      { percentile: 90 },
      { rank: 1 },
      { leaderboard: ["team-a", "team-b"] },
      { average: 72.5 },
      { total: 500 },
      { count: 42 }
    ];

    for (const payload of scoringPayloads) {
      expect(containsForbiddenFields(payload)).toBe(true);
    }

    // RESULT: Attack BLOCKED — all scoring/performance vocabulary is forbidden.
  });

  it("ATTACK: attempt to derive performance from SURFACE rate", async () => {
    // Submit 10 cohorts and count how many SURFACE
    const cohorts: Array<{ decision: string }> = [];

    for (let i = 0; i < 10; i++) {
      const events = [
        buildEvent({
          function_id: `func-${i}`,
          event_name: "FT_V1_DISPOSITION_OBSERVED"
        }),
        buildEvent({
          function_id: `func-${i}`,
          event_name: "FT_V1_LATENCY_OBSERVED"
        })
      ];
      cohorts.push(surfaceDecision(evaluateDecision(events)));
    }

    // All cohorts with >=2 event types and >=60 day window will SURFACE
    const surfaceCount = cohorts.filter((c) => c.decision === "SURFACE").length;

    // The attacker CAN count SURFACE decisions — but this only tells them
    // whether the minimum evidence threshold was met, NOT performance quality.
    // SURFACE means "enough data to observe" not "performing well."
    expect(surfaceCount).toBeGreaterThan(0);

    // OBSERVATION: SURFACE rate reveals data completeness, not performance.
    // This is by design — but it's worth documenting as a known information channel.
  });

  it("ATTACK: nested forbidden fields are caught", () => {
    const deepPayload = {
      data: {
        nested: {
          deeply: {
            score: 100
          }
        }
      }
    };
    expect(containsForbiddenFields(deepPayload)).toBe(true);

    // RESULT: Attack BLOCKED — recursive scan catches nested fields.
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ATTACK 5: Attempt to misuse AUDIT LOGS as metrics
// ═══════════════════════════════════════════════════════════════════════════

describe("Attack 5: Audit Log Misuse", () => {
  it("PASS: audit log read endpoint removed — no product surface for log analytics", async () => {
    const response = await requestApp(app, {
      method: "GET",
      path: `/orgs/${ORG_ID}/audit-log`,
      headers: withAuth(adminCookie)
    });

    // Endpoint removed per Sentinel directive. No route matches → 404.
    expect(response.status).toBe(404);

    // VERDICT: PASS — No HTTP surface exists to query, count, or group audit logs.
    // Audit logs are evidence-only, accessed via admin tooling outside the product surface.
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ATTACK 6: Attempt to extract PROGRESS NARRATIVES
// ═══════════════════════════════════════════════════════════════════════════

describe("Attack 6: Progress Narrative Extraction", () => {
  it("orientation endpoint disclaimers prevent narrative interpretation", async () => {
    const response = await requestApp(app, {
      method: "GET",
      path: `/api/orientation/${ORG_ID}?session_start=2025-01-01T00:00:00Z`,
      headers: withAuth(viewerCookie)
    });

    const body = response.body as any;

    // Explicit anti-narrative disclaimers are present
    const disclaimers = body.observation_detected.does_not_mean as string[];
    expect(disclaimers).toContain("This does not imply progress, improvement, or momentum.");
    expect(disclaimers).toContain("This does not imply organizational maturity or success.");

    // RESULT: Attack MITIGATED — disclaimers exist but are advisory, not enforced.
  });

  it("ATTACK: binary SURFACE/SUPPRESS across functions could imply readiness narrative", () => {
    // If func-A SURFACES and func-B SUPPRESSES, an executive could
    // construct a narrative: "Team A is AI-ready, Team B is not"
    const funcA = [
      buildEvent({ function_id: "func-a", event_name: "FT_V1_DISPOSITION_OBSERVED" }),
      buildEvent({ function_id: "func-a", event_name: "FT_V1_LATENCY_OBSERVED" })
    ];
    const funcB = [
      buildEvent({ function_id: "func-b", event_name: "FT_V1_DISPOSITION_OBSERVED" })
      // Only one event type — will SUPPRESS for insufficient evidence
    ];

    const dA = surfaceDecision(evaluateDecision(funcA));
    const dB = surfaceDecision(evaluateDecision(funcB));

    expect(dA.decision).toBe("SURFACE");
    expect(dB.decision).toBe("SUPPRESS");

    // OBSERVATION: The different decisions could be used to construct
    // a narrative. SURFACE means "enough evidence" not "better performance,"
    // but this distinction requires governance literacy to interpret correctly.
    //
    // VERDICT: PARTIAL — The system cannot prevent narrative construction
    // from binary outputs. Governance documentation mitigates but does not
    // eliminate this risk.
  });
});
