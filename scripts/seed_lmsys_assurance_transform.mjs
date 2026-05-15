#!/usr/bin/env node
const EVENT_VERSION = "1";

function iso(baseMs, offsetMs) {
  return new Date(baseMs + offsetMs).toISOString();
}

function event({
  id,
  orgId,
  workflowId,
  executionId,
  at,
  name,
  actor = "human",
  context = {},
  metadata = {}
}) {
  return {
    event_name: name,
    event_version: EVENT_VERSION,
    org_id: orgId,
    workflow_id: workflowId,
    timestamp: at,
    actor_type: actor,
    context,
    metadata: { event_id: id, ...metadata },
    execution_id: executionId
  };
}

function goldenExecution({ orgId, workflowId, executionId, baseMs, verification = false, prefix = executionId }) {
  return [
    event({
      id: `${prefix}-start`,
      orgId,
      workflowId,
      executionId,
      at: iso(baseMs, 0),
      name: "execution_start",
      actor: "human",
      context: { structural_start: true }
    }),
    event({
      id: `${prefix}-attempt`,
      orgId,
      workflowId,
      executionId,
      at: iso(baseMs, 30_000),
      name: "step",
      actor: "ai",
      context: { step_kind: "attempt", step_index: 0 }
    }),
    event({
      id: `${prefix}-complete`,
      orgId,
      workflowId,
      executionId,
      at: iso(baseMs, 45_000),
      name: "ai_output_disposition",
      actor: "ai",
      context: {
        disposition: "accepted",
        terminal: true,
        verification_present: verification
      }
    })
  ];
}

function recoveryExecution({ orgId, workflowId, executionId, baseMs, prefix = executionId }) {
  return [
    event({
      id: `${prefix}-start`,
      orgId,
      workflowId,
      executionId,
      at: iso(baseMs, 0),
      name: "execution_start",
      actor: "human",
      context: { structural_start: true }
    }),
    event({
      id: `${prefix}-error`,
      orgId,
      workflowId,
      executionId,
      at: iso(baseMs, 30_000),
      name: "execution_error",
      actor: "system",
      context: { error_signal: true }
    }),
    event({
      id: `${prefix}-retry`,
      orgId,
      workflowId,
      executionId,
      at: iso(baseMs, 60_000),
      name: "step",
      actor: "human",
      context: { step_kind: "retry", retry_visibility: true, step_index: 1 }
    }),
    event({
      id: `${prefix}-complete`,
      orgId,
      workflowId,
      executionId,
      at: iso(baseMs, 90_000),
      name: "ai_output_disposition",
      actor: "ai",
      context: { disposition: "accepted", terminal: true }
    })
  ];
}

function frictionExecution({ orgId, workflowId, executionId, baseMs, prefix = executionId }) {
  return [
    event({
      id: `${prefix}-start`,
      orgId,
      workflowId,
      executionId,
      at: iso(baseMs, 0),
      name: "execution_start",
      actor: "human",
      context: { structural_start: true }
    }),
    event({
      id: `${prefix}-reject-1`,
      orgId,
      workflowId,
      executionId,
      at: iso(baseMs, 60_000),
      name: "ai_output_disposition",
      actor: "human",
      context: { disposition: "rejected" }
    }),
    event({
      id: `${prefix}-retry-1`,
      orgId,
      workflowId,
      executionId,
      at: iso(baseMs, 120_000),
      name: "step",
      actor: "human",
      context: { step_kind: "retry", retry_visibility: true, step_index: 1 }
    }),
    event({
      id: `${prefix}-reject-2`,
      orgId,
      workflowId,
      executionId,
      at: iso(baseMs, 300_000),
      name: "ai_output_disposition",
      actor: "human",
      context: { disposition: "rejected" }
    }),
    event({
      id: `${prefix}-retry-2`,
      orgId,
      workflowId,
      executionId,
      at: iso(baseMs, 360_000),
      name: "step",
      actor: "human",
      context: { step_kind: "retry", retry_visibility: true, step_index: 2 }
    }),
    event({
      id: `${prefix}-complete`,
      orgId,
      workflowId,
      executionId,
      at: iso(baseMs, 660_000),
      name: "ai_output_disposition",
      actor: "ai",
      context: { disposition: "accepted", terminal: true }
    })
  ];
}

function noTerminalExecution({ orgId, workflowId, executionId, baseMs, prefix = executionId }) {
  return [
    event({
      id: `${prefix}-start`,
      orgId,
      workflowId,
      executionId,
      at: iso(baseMs, 0),
      name: "execution_start",
      actor: "human",
      context: { structural_start: true }
    }),
    event({
      id: `${prefix}-attempt`,
      orgId,
      workflowId,
      executionId,
      at: iso(baseMs, 60_000),
      name: "step",
      actor: "ai",
      context: { step_kind: "attempt", step_index: 0 }
    })
  ];
}

export function buildAssuranceCases(options = {}) {
  const minCohortSize = options.minCohortSize ?? 5;
  const baseMs = Date.parse(options.baseTimestamp ?? "2026-01-01T12:00:00.000Z");
  const org = "lmsys-org-assurance";
  const workflow = "lmsys-workflow-assurance";

  const subThresholdEvents = [];
  for (let i = 0; i < Math.max(1, minCohortSize - 1); i += 1) {
    subThresholdEvents.push(
      ...goldenExecution({
        orgId: org,
        workflowId: "lmsys-workflow-sub-threshold",
        executionId: `lmsys-exec-sub-threshold-${i}`,
        baseMs: baseMs + i * 120_000
      })
    );
  }

  const duplicateEvents = [
    ...goldenExecution({
      orgId: "lmsys-org-tenant-a",
      workflowId: "lmsys-workflow-shared-model",
      executionId: "lmsys-exec-duplicate-cross-org",
      baseMs,
      prefix: "tenant-a"
    }),
    ...goldenExecution({
      orgId: "lmsys-org-tenant-b",
      workflowId: "lmsys-workflow-shared-model",
      executionId: "lmsys-exec-duplicate-cross-org",
      baseMs: baseMs + 120_000,
      prefix: "tenant-b"
    })
  ];

  return [
    {
      id: "sub_threshold_workflow",
      description: "Workflow has fewer executions than MIN_COHORT_SIZE and must suppress aggregate surfacing.",
      expected: { aggregate: "SUPPRESSED" },
      events: subThresholdEvents
    },
    {
      id: "pii_boundary_rejection",
      description: "Forbidden raw-content and direct-identifier fields must be rejected before persistence.",
      expected: { post_status: "4xx" },
      invalid_payloads: [
        {
          event_name: "execution_start",
          event_version: EVENT_VERSION,
          org_id: org,
          workflow_id: workflow,
          timestamp: iso(baseMs, 0),
          actor_type: "human",
          context: {},
          execution_id: "lmsys-exec-pii-name",
          name: "Alice"
        },
        {
          event_name: "step",
          event_version: EVENT_VERSION,
          org_id: org,
          workflow_id: workflow,
          timestamp: iso(baseMs, 1_000),
          actor_type: "human",
          context: { content: "raw prompt body" },
          execution_id: "lmsys-exec-pii-content"
        },
        {
          event_name: "step",
          event_version: EVENT_VERSION,
          org_id: org,
          workflow_id: workflow,
          timestamp: iso(baseMs, 2_000),
          actor_type: "human",
          context: {},
          execution_id: "lmsys-exec-pii-email",
          email: "alice@example.com"
        }
      ]
    },
    {
      id: "out_of_order_timestamps",
      description: "Input order is shuffled; deterministic reconstruction must use event timestamps.",
      expected: { classification_status: "ALLOWED" },
      events: goldenExecution({
        orgId: org,
        workflowId: "lmsys-workflow-out-of-order",
        executionId: "lmsys-exec-out-of-order",
        baseMs
      }).reverse()
    },
    {
      id: "duplicate_execution_ids_across_orgs",
      description: "Same execution_id in two orgs must stay tenant-isolated.",
      expected: { tenant_isolation: "PASS" },
      events: duplicateEvents
    },
    {
      id: "no_terminal_event",
      description: "Open execution without a terminal event should fail closed or resolve to an allowed avoidance/friction pattern only with explicit lifecycle support.",
      expected: { accepted_patterns: ["FRICTION_LOOP", "UNDERTRUST_AVOIDANCE"], fallback_status: "SUPPRESSED" },
      events: noTerminalExecution({
        orgId: org,
        workflowId: "lmsys-workflow-no-terminal",
        executionId: "lmsys-exec-no-terminal",
        baseMs
      })
    },
    {
      id: "fast_completion_no_verification",
      description: "Fast completion with no verification should classify as BLIND_EFFICIENCY.",
      expected: { pattern: "BLIND_EFFICIENCY" },
      events: goldenExecution({
        orgId: org,
        workflowId: "lmsys-workflow-blind-efficiency",
        executionId: "lmsys-exec-blind-efficiency",
        baseMs,
        verification: false
      })
    },
    {
      id: "failure_success_recovery_maturity",
      description: "Failure followed by retry and success should classify as RECOVERY_MATURITY.",
      expected: { pattern: "RECOVERY_MATURITY" },
      events: recoveryExecution({
        orgId: org,
        workflowId: "lmsys-workflow-recovery-maturity",
        executionId: "lmsys-exec-recovery-maturity",
        baseMs
      })
    },
    {
      id: "iteration_high_threshold_cluster",
      description: "Executions clustered exactly at iteration_high_threshold with high latency should classify as FRICTION_LOOP.",
      expected: { pattern: "FRICTION_LOOP", iteration_high_threshold: options.iterationHighThreshold ?? 2 },
      events: frictionExecution({
        orgId: org,
        workflowId: "lmsys-workflow-friction-loop",
        executionId: "lmsys-exec-friction-loop",
        baseMs
      })
    }
  ];
}

export function buildAssuranceEvents(options = {}) {
  return buildAssuranceCases(options).flatMap((entry) => entry.events ?? []);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cases = buildAssuranceCases();
  console.log(JSON.stringify({ cases, event_count: buildAssuranceEvents().length }, null, 2));
}
