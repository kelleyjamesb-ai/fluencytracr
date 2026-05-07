/**
 * Maps upstream ingest actor labels to canonical `ActorType` at the boundary only.
 * Canonical union stays `"human" | "ai" | "system"`; unknown labels fail closed.
 */

import type { ActorType } from "../domain/canonical-event.schema";

const UPSTREAM_TO_CANONICAL: Readonly<Record<string, ActorType>> = Object.freeze({
  human: "human",
  ai: "ai",
  agent: "ai",
  assistant: "ai",
  system: "system",
  integration: "system",
  service: "system"
});

export type ActorMapResult =
  | { readonly ok: true; readonly actor_type: ActorType }
  | { readonly ok: false; readonly error: "unknown_actor_label" };

export function mapUpstreamActorToCanonical(label: string): ActorMapResult {
  const key = label.trim().toLowerCase();
  const mapped = UPSTREAM_TO_CANONICAL[key];
  if (mapped === undefined) {
    return { ok: false, error: "unknown_actor_label" };
  }
  return { ok: true, actor_type: mapped };
}
