import { computeWorkflowVisibility, computeWorkflowVisibilitySummary } from "../src/workflow_visibility";
import type {
  BehavioralSignalRecord,
  FluencyEventRecord,
  WorkflowRegistryRecord,
  WorkflowVisibilityPolicyConfigRecord
} from "../src/store";
import { buildFluencyEventRecord } from "../src/store";
import type { FluencyEvent } from "@learnaire/shared";
const now = new Date("2026-02-18T00:00:00.000Z");
let eventCounter = 0;

const registry = (overrides: Partial<WorkflowRegistryRecord> = {}): WorkflowRegistryRecord => ({
  id: "reg-1",
  orgId: "org-1",
  workflowId: "workflow-1",
  displayName: "workflow-1",
  version: 1,
  riskClass: "medium",
  changeReason: "seed",
  changedByUser: "test-user",
  changedByRole: "ADMIN",
  createdAt: "2026-02-01T00:00:00.000Z",
  ...overrides
});

const policy = (
  overrides: Partial<WorkflowVisibilityPolicyConfigRecord> = {}
): WorkflowVisibilityPolicyConfigRecord => ({
  id: "pol-1",
  orgId: "org-1",
  versionName: "test-policy-v1",
  changeReason: "seed",
  changedByUser: "test-user",
  changedByRole: "ADMIN",
  windowDaysLow: 30,
  windowDaysMedium: 30,
  windowDaysHigh: 60,
  minEventsLow: 3,
  minEventsMedium: 5,
  minEventsHigh: 8,
  requireVerificationHigh: true,
  createdAt: "2026-02-01T00:00:00.000Z",
  ...overrides
});

const event = (overrides: Partial<FluencyEventRecord> = {}): FluencyEventRecord => {
  const eventId = overrides.event_id ?? `evt-auto-${eventCounter += 1}`;
  const merged: Record<string, unknown> = {
    event_type: "ai_output_disposition",
    timestamp: "2026-02-10T00:00:00.000Z",
    risk_class: "high",
    org_unit: "org:executive",
    workflow_id: "workflow-1",
    disposition: "accepted",
    edit_distance_bucket: "none",
    verification_present: false,
    time_to_action_ms: 1000,
    ...overrides
  };
  delete merged.event_id;
  delete merged.execution_id;
  return buildFluencyEventRecord(merged as FluencyEvent, eventId);
};
const v0Signal = (overrides: Partial<BehavioralSignalRecord> = {}): BehavioralSignalRecord => ({
  org_id: "org-1",
  group_id: "workflow-1",
  group_type: "org",
  bucket_start: "2026-02-10",
  signal_name: "invoke_ai",
  count: 1,
  suppressed: false,
  ...overrides
});

describe("computeWorkflowVisibility", () => {
  it("is deterministic for identical inputs", () => {
    const input = {
      now,
      registryEntry: registry({ riskClass: "medium" }),
      policyConfig: policy(),
      fluencyEvents: [
        event({ event_id: "evt-1", verification_present: true }),
        event({ event_id: "evt-2", verification_present: true }),
        event({ event_id: "evt-3", verification_present: true }),
        event({ event_id: "evt-4", verification_present: true }),
        event({ event_id: "evt-5", verification_present: true })
      ],
      v0Signals: []
    };

    const first = computeWorkflowVisibility("workflow-1", "60d", input);
    const second = computeWorkflowVisibility("workflow-1", "60d", input);
    expect(first).toBe("VISIBLE");
    expect(second).toBe(first);
  });

  it("requires verification evidence for high-risk workflows", () => {
    const state = computeWorkflowVisibility("workflow-1", "60d", {
      now,
      registryEntry: registry({ riskClass: "high" }),
      policyConfig: policy(),
      fluencyEvents: new Array(8).fill(null).map((_, i) => event({ event_id: `evt-${i + 1}` })),
      v0Signals: []
    });

    expect(state).toBe("NOT_ENOUGH_DATA_YET");
  });

  it("treats suppression as safety", () => {
    const state = computeWorkflowVisibility("workflow-1", "60d", {
      now,
      registryEntry: registry({ riskClass: "low" }),
      policyConfig: policy(),
      fluencyEvents: [event({ event_id: "evt-1" }), event({ event_id: "evt-2" }), event({ event_id: "evt-3" })],
      v0Signals: [v0Signal({ suppressed: true })]
    });

    expect(state).toBe("NOT_SHOWN_SAFETY");
  });

  it("uses risk class from registry and ignores event risk for thresholding", () => {
    const state = computeWorkflowVisibility("workflow-1", "60d", {
      now,
      registryEntry: registry({ riskClass: "low" }),
      policyConfig: policy(),
      fluencyEvents: [
        event({ event_id: "evt-1", risk_class: "high", verification_present: false }),
        event({ event_id: "evt-2", risk_class: "high", verification_present: false }),
        event({ event_id: "evt-3", risk_class: "high", verification_present: false })
      ],
      v0Signals: []
    });

    expect(state).toBe("VISIBLE");
  });

  it("keeps sparse high-risk workflows at NOT_ENOUGH_DATA_YET for 30d windows", () => {
    const state = computeWorkflowVisibility("workflow-1", "30d", {
      now,
      registryEntry: registry({ riskClass: "high" }),
      policyConfig: policy(),
      fluencyEvents: new Array(8).fill(null).map((_, i) =>
        event({ event_id: `evt-sparse-${i + 1}`, verification_present: true })
      ),
      v0Signals: []
    });

    expect(state).toBe("NOT_ENOUGH_DATA_YET");
  });

  it("suppresses output when dominant pattern is ambiguous", () => {
    const state = computeWorkflowVisibility("workflow-1", "60d", {
      now,
      registryEntry: registry({ riskClass: "medium" }),
      policyConfig: policy(),
      fluencyEvents: new Array(6).fill(null).map((_, i) =>
        event({ event_id: `evt-pattern-${i + 1}`, verification_present: true })
      ),
      v0Signals: [],
      patternInferenceRecords: [
        {
          scope_key: "workflow-1:MEDIUM",
          scope_type: "WORKFLOW_RISK",
          window_start: "2026-01-01T00:00:00.000Z",
          window_end: "2026-03-01T00:00:00.000Z",
          pattern: "CALIBRATED_FLUENCY",
          confidence_level: "HIGH",
          evidence_count: 10,
          coverage_days: 30,
          surface_mix: { CHAT: 1, DOC_BLOCK: 0, CODE_BLOCK: 0, SUMMARY: 0 },
          top_drivers: ["driver-a"],
          inference_version: "v0.1",
          parameter_hash: "hash-1",
          code_commit_hash: "commit-1",
          generated_at: "2026-02-18T00:00:00.000Z"
        },
        {
          scope_key: "workflow-1:MEDIUM",
          scope_type: "WORKFLOW_RISK",
          window_start: "2026-01-01T00:00:00.000Z",
          window_end: "2026-03-01T00:00:00.000Z",
          pattern: "FRICTION_LOOP",
          confidence_level: "HIGH",
          evidence_count: 10,
          coverage_days: 30,
          surface_mix: { CHAT: 1, DOC_BLOCK: 0, CODE_BLOCK: 0, SUMMARY: 0 },
          top_drivers: ["driver-b"],
          inference_version: "v0.1",
          parameter_hash: "hash-1",
          code_commit_hash: "commit-1",
          generated_at: "2026-02-18T00:00:00.000Z"
        }
      ]
    });

    expect(state).toBe("NOT_SHOWN_SAFETY");
  });

  it("suppresses when policy config is missing for the registry version", () => {
    const state = computeWorkflowVisibility("workflow-1", "60d", {
      now,
      registryEntry: registry({ riskClass: "medium" }),
      policyConfig: null,
      fluencyEvents: [event({ event_id: "evt-missing-policy-1" })],
      v0Signals: []
    });

    expect(state).toBe("NOT_SHOWN_SAFETY");
  });
});

describe("computeWorkflowVisibilitySummary", () => {
  it("returns summary counts only by visibility state", () => {
    const entries = [
      registry({ workflowId: "wf-visible", riskClass: "low", id: "r1" }),
      registry({ workflowId: "wf-data", riskClass: "medium", id: "r2" }),
      registry({ workflowId: "wf-safe", riskClass: "low", id: "r3" })
    ];

    const events = [
      event({ event_id: "evt-a", workflow_id: "wf-visible", verification_present: true }),
      event({ event_id: "evt-b", workflow_id: "wf-visible", verification_present: true }),
      event({ event_id: "evt-c", workflow_id: "wf-visible", verification_present: true }),
      event({ event_id: "evt-d", workflow_id: "wf-data", verification_present: true })
    ];

    const signals = [
      v0Signal({ group_id: "wf-safe", suppressed: true })
    ];

    const summary = computeWorkflowVisibilitySummary(entries, "60d", {
      now,
      policyConfigs: [
        policy({ id: "p1" })
      ],
      fluencyEvents: events,
      v0Signals: signals
    });

    expect(summary).toEqual({
      VISIBLE: 1,
      NOT_ENOUGH_DATA_YET: 1,
      NOT_SHOWN_SAFETY: 1
    });
  });
});
