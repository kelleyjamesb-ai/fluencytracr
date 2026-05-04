/**
 * Deterministic canonical events for v1 e2e — fixed ISO timestamps, explicit event_id metadata.
 */

import type { CanonicalEvent } from "../../src/domain/canonical-event.schema";

const ORG = "org_e2e";
const WF_A = "workflow_alpha";
const WF_B = "workflow_beta";

export const TS = {
  t0: "2026-03-15T10:00:00.000Z",
  t1: "2026-03-15T10:00:30.000Z",
  t2: "2026-03-15T10:01:00.000Z",
  t3: "2026-03-15T10:01:30.000Z",
  t4: "2026-03-15T10:02:00.000Z"
} as const;

function base(over: Partial<CanonicalEvent> & { context?: Record<string, unknown> }, executionId: string): CanonicalEvent {
  return {
    event_name: "step",
    event_version: "1",
    org_id: ORG,
    workflow_id: WF_A,
    timestamp: TS.t0,
    actor_type: "human",
    context: {},
    ...over,
    context: { ...over.context },
    execution_id: executionId
  };
}

/** Scenario 1 + 6 (happy / mixed workflows): passes build, FSC, min-signal; BLIND_EFFICIENCY path (0 retries, LOW latency). */
export function happyPathExecution(executionId: string, workflowId: string = WF_A): CanonicalEvent[] {
  return [
    {
      ...base({ event_name: "execution_start", timestamp: TS.t0, metadata: { event_id: `${executionId}-e0` } }, executionId),
      workflow_id: workflowId
    },
    {
      ...base({ event_name: "step", timestamp: TS.t1, metadata: { event_id: `${executionId}-e1` } }, executionId),
      workflow_id: workflowId
    },
    {
      ...base(
        {
          event_name: "ai_output_disposition",
          timestamp: TS.t2,
          context: { disposition: "accepted" },
          metadata: { event_id: `${executionId}-e2` }
        },
        executionId
      ),
      workflow_id: workflowId
    }
  ];
}

/** Scenario 2: terminal + steps but no structural start → FSC boundary_integrity fails. */
export function fscMissingStartExecution(executionId: string): CanonicalEvent[] {
  return [
    base({ event_name: "step", timestamp: TS.t0, metadata: { event_id: `${executionId}-a` } }, executionId),
    base(
      {
        event_name: "ai_output_disposition",
        timestamp: TS.t2,
        context: { disposition: "accepted" },
        metadata: { event_id: `${executionId}-b` }
      },
      executionId
    )
  ];
}

/** Scenario 3: full boundary, no secondary channel (no step / retry_visibility / error visibility). */
export function minimumSignalFailureExecution(executionId: string): CanonicalEvent[] {
  return [
    base({ event_name: "execution_start", timestamp: TS.t0, metadata: { event_id: `${executionId}-s0` } }, executionId),
    base(
      {
        event_name: "ai_output_disposition",
        timestamp: TS.t2,
        context: { disposition: "accepted" },
        metadata: { event_id: `${executionId}-s1` }
      },
      executionId
    )
  ];
}

/** Workflow B copy for mixed-workflow safety (same org, different workflow_id). */
export function happyPathWorkflowB(executionId: string): CanonicalEvent[] {
  return happyPathExecution(executionId, WF_B);
}

export const fixtureIds = {
  org: ORG,
  workflowA: WF_A,
  workflowB: WF_B
};
