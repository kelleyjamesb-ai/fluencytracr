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

const workActivityOnlyPair = (
  workflowId: string,
  runId: string,
  ts1: string,
  ts2: string,
  options: { ambiguity?: boolean } = {}
) => [
  buildFluencyEventRecord(
    {
      event_type: "workflow_stage_transition",
      timestamp: ts1,
      risk_class: "medium",
      org_unit: "org:org-1",
      workflow_id: workflowId,
      stage_from: "not_started",
      stage_to: "started",
      ai_assisted: false,
      run_id: runId,
      ...(options.ambiguity
        ? { ambiguity_flag: true, ambiguity_reason_code: "AMB_EVIDENCE_INSUFFICIENT" }
        : {})
    } as any,
    `e-${runId}-1`
  ),
  buildFluencyEventRecord(
    {
      event_type: "workflow_stage_transition",
      timestamp: ts2,
      risk_class: "medium",
      org_unit: "org:org-1",
      workflow_id: workflowId,
      stage_from: "started",
      stage_to: "human_work_observed",
      ai_assisted: false,
      run_id: runId,
      ...(options.ambiguity
        ? { ambiguity_flag: true, ambiguity_reason_code: "AMB_EVIDENCE_INSUFFICIENT" }
        : {})
    } as any,
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

  it("surfaces ghost-use only as a residual observability pattern when residual preconditions persist", () => {
    const events = [];
    for (let i = 0; i < 5; i += 1) {
      events.push(
        ...workActivityOnlyPair("wf-ghost", `ghost-current-${i}`, "2026-04-05T00:00:00.000Z", "2026-04-05T00:01:00.000Z"),
        ...workActivityOnlyPair("wf-ghost", `ghost-previous-${i}`, "2026-01-15T00:00:00.000Z", "2026-01-15T00:01:00.000Z")
      );
    }

    const rows = buildObservabilityRollup(events, "org-1", "60d", { now, minDisclosedExecutions: 5 });
    const row = rows.find((r) => r.workflow_id === "wf-ghost");

    expect(row?.disclosure).toBe("ALLOWED");
    expect(row?.residual_patterns).toEqual({ ghost_use: "PRESENT" });
    expect(row?.pattern_distribution?.["Undertrust Avoidance"]).toBe("LOW");
    expect(row?.allowed_interpretation_hints).toContain("no observed AI evidence in window");
  });

  it("hard-bypasses ghost-use when positive evidence is present", () => {
    const events = [
      ...dispositionPair("wf-positive", "positive-current", "2026-04-05T00:00:00.000Z", "2026-04-05T00:01:00.000Z", true),
      ...workActivityOnlyPair("wf-positive", "positive-previous", "2026-01-15T00:00:00.000Z", "2026-01-15T00:01:00.000Z")
    ];

    const rows = buildObservabilityRollup(events, "org-1", "60d", { now, minDisclosedExecutions: 1 });
    const row = rows.find((r) => r.workflow_id === "wf-positive");

    expect(row?.residual_patterns).toEqual({ ghost_use: "ABSENT" });
    expect(row?.allowed_interpretation_hints).toContain("positive evidence hard-bypass applied");
  });

  it("suppresses ghost-use when ambiguity dominates the evaluation window", () => {
    const events = [];
    for (let i = 0; i < 5; i += 1) {
      events.push(
        ...workActivityOnlyPair(
          "wf-ambiguous",
          `ambiguous-current-${i}`,
          "2026-04-05T00:00:00.000Z",
          "2026-04-05T00:01:00.000Z",
          { ambiguity: true }
        ),
        ...workActivityOnlyPair(
          "wf-ambiguous",
          `ambiguous-previous-${i}`,
          "2026-01-15T00:00:00.000Z",
          "2026-01-15T00:01:00.000Z",
          { ambiguity: true }
        )
      );
    }

    const rows = buildObservabilityRollup(events, "org-1", "60d", { now, minDisclosedExecutions: 5 });
    const row = rows.find((r) => r.workflow_id === "wf-ambiguous");

    expect(row?.residual_patterns).toEqual({ ghost_use: "SUPPRESSED" });
    expect(row?.allowed_interpretation_hints).toContain("ambiguity suppression applied");
  });

  it("holds ghost-use when the persistence gate is not met", () => {
    const events = [];
    for (let i = 0; i < 5; i += 1) {
      events.push(
        ...workActivityOnlyPair("wf-no-persist", `persist-current-${i}`, "2026-04-05T00:00:00.000Z", "2026-04-05T00:01:00.000Z")
      );
    }

    const rows = buildObservabilityRollup(events, "org-1", "60d", { now, minDisclosedExecutions: 5 });
    const row = rows.find((r) => r.workflow_id === "wf-no-persist");

    expect(row?.residual_patterns).toEqual({ ghost_use: "ABSENT" });
    expect(row?.allowed_interpretation_hints).toContain("required windows persistence gate not met");
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
