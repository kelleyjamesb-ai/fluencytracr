/**
 * Maps pragmatic upstream ingest payloads to canonical event candidates (pre-`validateCanonicalEvent`).
 */

import type { ActorType, CanonicalEvent, CanonicalEventMetadata } from "../domain/canonical-event.schema";
import { mapActorType } from "./actor-type.adapter";
import { resolveExecutionIdentity, type ExecutionIdentitySource } from "./execution-id.adapter";
import type { UpstreamIngestEvent } from "./boundary-schemas";

export type IngestEventMappingResult =
  | {
      readonly ok: true;
      readonly canonical_event: CanonicalEvent;
    }
  | {
      readonly ok: false;
      readonly reason: string;
      readonly diagnostics: readonly string[];
    };

function preferActorLabel(input: UpstreamIngestEvent): string {
  const at = input.actor_type?.trim() ?? "";
  if (at.length > 0) {
    return at;
  }
  return input.actor?.trim() ?? "";
}

function buildUpstreamLineage(input: UpstreamIngestEvent): Record<string, string> {
  const lineage: Record<string, string> = {};
  const add = (k: string, v: string | undefined) => {
    const t = v?.trim();
    if (t !== undefined && t.length > 0) {
      lineage[k] = t;
    }
  };
  add("execution_id", input.execution_id);
  add("workflow_run_id", input.workflow_run_id);
  add("run_id", input.run_id);
  add("chat_id", input.chat_id);
  add("agent_run_id", input.agent_run_id);
  add("workflow_id", input.workflow_id);
  return lineage;
}

function toIdentitySource(input: UpstreamIngestEvent): ExecutionIdentitySource {
  return {
    execution_id: input.execution_id,
    workflow_run_id: input.workflow_run_id,
    run_id: input.run_id,
    chat_id: input.chat_id,
    agent_run_id: input.agent_run_id,
    workflow_id: input.workflow_id,
    allow_composite_fallback: input.boundary_policy?.allow_composite_execution_id === true
  };
}

/**
 * Transforms a boundary-validated upstream event into a canonical-shaped event.
 * Caller must run `validateCanonicalEvent` before persistence.
 */
export function mapUpstreamEventToCanonical(input: UpstreamIngestEvent): IngestEventMappingResult {
  const diagnostics: string[] = [];
  const label = preferActorLabel(input);
  const actorMap = mapActorType(label);
  if (!actorMap.ok) {
    diagnostics.push(`actor:${actorMap.reason}`);
    return { ok: false, reason: actorMap.reason, diagnostics };
  }
  const actor_type: ActorType = actorMap.actor_type;

  const idRes = resolveExecutionIdentity(toIdentitySource(input));
  if (!idRes.ok) {
    diagnostics.push(`identity:${idRes.reason}`);
    return { ok: false, reason: idRes.reason, diagnostics };
  }
  diagnostics.push(`identity_basis:${idRes.identity_basis}`);

  const upstream_lineage = buildUpstreamLineage(input);
  const baseMeta: CanonicalEventMetadata = {
    ...(input.metadata !== undefined ? { ...input.metadata } : {}),
    upstream_lineage: { ...upstream_lineage, resolved_execution_id: idRes.execution_id }
  };

  const canonical_event: CanonicalEvent = {
    event_name: input.event_name.trim(),
    event_version: input.event_version.trim(),
    org_id: input.org_id.trim(),
    workflow_id: input.workflow_id.trim(),
    timestamp: input.timestamp.trim(),
    actor_type,
    context: { ...input.context },
    metadata: baseMeta,
    execution_id: idRes.execution_id
  };

  return { ok: true, canonical_event };
}
