import { buildFluencyEventRecord } from "../src/store";
import {
  buildObservabilityRollup,
  emptyPatternDistribution,
  eventBelongsToOrg
} from "../src/observability_aggregate";
import { auditSuppressedObservabilityRows } from "../src/suppression_audit_log";
import { store } from "../src/store";

const now = new Date("2026-04-10T12:00:00.000Z");

const dispositionPair = (
  workflowId: string,
  runId: string,
  ts1: string,
  ts2: string,
  verification: boolean
) => [
  buildFluencyEventRecord(
    {
      event_type: "ai_output_disposition",
      timestamp: ts1,
      risk_class: "low",
      org_unit: "org:org-1",
      workflow_id: workflowId,
      disposition: "accepted",
      edit_distance_bucket: "none",
      verification_present: verification,
      time_to_action_ms: 100,
      run_id: runId
    },
    `e-${runId}-1`
  ),
  buildFluencyEventRecord(
    {
      event_type: "ai_output_disposition",
      timestamp: ts2,
      risk_class: "low",
      org_unit: "org:org-1",
      workflow_id: workflowId,
      disposition: "accepted",
      edit_distance_bucket: "none",
      verification_present: false,
      time_to_action_ms: 100,
      run_id: runId
    },
    `e-${runId}-2`
  )
];

describe("eventBelongsToOrg", () => {
  const [a] = dispositionPair("wf", "r1", "2026-04-09T00:00:00.000Z", "2026-04-09T00:01:00.000Z", true);
  it("matches org:orgId", () => {
    expect(eventBelongsToOrg(a, "org-1")).toBe(true);
  });
  it("rejects missing org_unit", () => {
    const noOrg = { ...a, org_unit: undefined } as typeof a;
    expect(eventBelongsToOrg(noOrg, "org-1")).toBe(false);
  });
});

describe("buildObservabilityRollup", () => {
  it("returns empty workflows when no org-scoped events", () => {
    const rows = buildObservabilityRollup([], "org-1", "60d", { now, minDisclosedExecutions: 2 });
    expect(rows).toEqual([]);
  });

  it("aggregates disclosed executions per workflow with ALLOWED disclosure when cohort met", () => {
    const events = [
      ...dispositionPair("wf-a", "r1", "2026-04-09T00:00:00.000Z", "2026-04-09T00:01:00.000Z", true),
      ...dispositionPair("wf-a", "r2", "2026-04-09T02:00:00.000Z", "2026-04-09T02:01:00.000Z", true),
      ...dispositionPair("wf-b", "r3", "2026-04-09T03:00:00.000Z", "2026-04-09T03:01:00.000Z", false)
    ];
    const rows = buildObservabilityRollup(events, "org-1", "60d", { now, minDisclosedExecutions: 2 });
    expect(rows).toHaveLength(2);
    const wfa = rows.find((r) => r.workflow_id === "wf-a");
    expect(wfa?.disclosure).toBe("ALLOWED");
    expect(wfa?.executions_disclosed).toBe(2);
    expect(wfa?.pattern_distribution?.["Calibrated Fluency"]).toBe("HIGH");
    expect(Object.values(wfa?.pattern_distribution ?? {}).every((v) => typeof v === "string")).toBe(true);
    const wfb = rows.find((r) => r.workflow_id === "wf-b");
    expect(wfb?.disclosure).toBe("SUPPRESSED");
    expect(wfb?.suppression_reasons).toContain("insufficient_disclosed_executions");
    expect(wfb?.pattern_distribution).toBeNull();
  });

  it("excludes events outside window", () => {
    const events = dispositionPair(
      "wf-old",
      "ro",
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:01:00.000Z",
      true
    );
    const rows = buildObservabilityRollup(events, "org-1", "60d", { now, minDisclosedExecutions: 1 });
    expect(rows).toEqual([]);
  });

  it("writes suppression audit rows for suppressed workflow disclosures", async () => {
    store.suppressionAuditLogs.clear();
    const events = dispositionPair(
      "wf-audit",
      "r-audit",
      "2026-04-09T00:00:00.000Z",
      "2026-04-09T00:01:00.000Z",
      false
    );
    const rows = buildObservabilityRollup(events, "org-1", "60d", { now, minDisclosedExecutions: 2 });
    const decidedAt = "2026-04-10T12:30:00.000Z";

    const written = await auditSuppressedObservabilityRows("org-1", rows, decidedAt);

    expect(written).toHaveLength(1);
    expect(written[0]).toMatchObject({
      orgId: "org-1",
      workflowId: "wf-audit",
      suppressionReason: "insufficient_disclosed_executions",
      decidedAt
    });
    expect(Array.from(store.suppressionAuditLogs.values())).toHaveLength(1);
  });
});

describe("emptyPatternDistribution", () => {
  it("zeros all pattern keys", () => {
    const z = emptyPatternDistribution();
    expect(Object.values(z).every((v) => v === 0)).toBe(true);
    expect(Object.keys(z)).toHaveLength(5);
  });
});
