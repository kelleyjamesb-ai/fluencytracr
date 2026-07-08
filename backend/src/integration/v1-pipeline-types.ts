/**
 * Minimal types and ingest-boundary helpers for v1 classification pipeline integration.
 * Canonical `ActorType` remains `"human" | "ai" | "system"` only.
 */

import type { CanonicalEvent, ValidationResult } from "../domain/canonical-event.schema";
import { validateCanonicalEvent } from "../domain/canonical-event.schema";
import { mapActorType } from "../boundary/actor-type.adapter";

export type IngestNormalizeFailureReason =
  | "unknown_actor_label"
  | "invalid_payload";

export type IngestNormalizeResult =
  | { readonly ok: true; readonly payload: Record<string, unknown> }
  | { readonly ok: false; readonly reason: IngestNormalizeFailureReason; readonly detail?: string };

/**
 * Resolves the execution correlation key used for grouping and repositories.
 * Prefer `execution_id` when present; otherwise use governed run lineage only.
 */
export function canonicalExecutionKey(event: CanonicalEvent): string {
  if (typeof event.execution_id === "string" && event.execution_id.length > 0) {
    return event.execution_id;
  }
  if (typeof event.workflow_run_id === "string" && event.workflow_run_id.length > 0) {
    return event.workflow_run_id;
  }
  if (typeof event.run_id === "string" && event.run_id.length > 0) {
    return event.run_id;
  }
  return "";
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function pickInboundActorLabel(raw: Record<string, unknown>): string | null {
  const at = raw.actor_type;
  const ac = raw.actor;
  if (typeof at === "string" && at.trim().length > 0) {
    return at;
  }
  if (typeof ac === "string" && ac.trim().length > 0) {
    return ac;
  }
  return null;
}

/**
 * Maps upstream `actor` / `actor_type` labels at the boundary only; does not validate the full event.
 */
export function normalizeInboundActorType(raw: unknown): IngestNormalizeResult {
  if (!isPlainObject(raw)) {
    return { ok: false, reason: "invalid_payload" };
  }
  const label = pickInboundActorLabel(raw);
  if (label === null) {
    return { ok: false, reason: "invalid_payload", detail: "actor_or_actor_type_required" };
  }
  const mapped = mapActorType(label);
  if (!mapped.ok) {
    return { ok: false, reason: "unknown_actor_label" };
  }
  const payload: Record<string, unknown> = { ...raw, actor_type: mapped.actor_type };
  delete payload.actor;
  return {
    ok: true,
    payload
  };
}

/**
 * When `applyActorMapping` is true, remaps `actor_type` then runs canonical validation.
 */
export function validateInboundCanonicalEvent(
  raw: unknown,
  options?: { readonly applyActorMapping?: boolean }
): ValidationResult<CanonicalEvent> {
  const apply = options?.applyActorMapping === true;
  let body: unknown = raw;
  if (apply) {
    const n = normalizeInboundActorType(raw);
    if (!n.ok) {
      if (n.reason === "unknown_actor_label") {
        return { ok: false, errors: ["unknown_actor_label"] };
      }
      return { ok: false, errors: ["invalid_payload"] };
    }
    body = n.payload;
  }
  return validateCanonicalEvent(body);
}
