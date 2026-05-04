/**
 * Raw upstream-shaped payloads (before canonical validation / actor mapping).
 */

import { fixtureIds, TS } from "./canonical-events.fixtures";

/** Valid upstream: maps to human, becomes canonical after applyActorMapping. */
export function validUpstreamIngest(executionId: string, workflowId: string = fixtureIds.workflowA): Record<string, unknown> {
  return {
    event_name: "execution_start",
    event_version: "1",
    org_id: fixtureIds.org,
    workflow_id: workflowId,
    timestamp: TS.t0,
    actor: "user",
    context: {},
    execution_id: executionId,
    metadata: { event_id: `${executionId}-u0` }
  };
}

/** Scenario 5: label not in actor-type.adapter maps → unknown_actor_label when applyActorMapping true. */
export function unmappableActorUpstream(executionId: string): Record<string, unknown> {
  return {
    event_name: "execution_start",
    event_version: "1",
    org_id: fixtureIds.org,
    workflow_id: fixtureIds.workflowA,
    timestamp: TS.t0,
    actor_type: "extraterrestrial",
    context: {},
    execution_id: executionId,
    metadata: { event_id: `${executionId}-bad-actor` }
  };
}
