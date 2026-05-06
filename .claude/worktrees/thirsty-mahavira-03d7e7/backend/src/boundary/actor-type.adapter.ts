/**
 * Boundary-only mapping from upstream actor labels to canonical ActorType.
 * Core domain union is not widened.
 */

import type { ActorType } from "../domain/canonical-event.schema";

export type UpstreamActorLabel = string;

export type ActorMappingResult =
  | { readonly ok: true; readonly actor_type: ActorType }
  | { readonly ok: false; readonly reason: string };

/** Labels that map to canonical `"human"` (lowercase keys after normalization). */
export const UPSTREAM_ACTOR_HUMAN: Readonly<Record<string, true>> = Object.freeze({
  human: true,
  user: true,
  person: true,
  employee: true
});

/** Labels that map to canonical `"ai"`. */
export const UPSTREAM_ACTOR_AI: Readonly<Record<string, true>> = Object.freeze({
  ai: true,
  assistant: true,
  agent: true,
  bot: true,
  copilot: true,
  model: true
});

/** Labels that map to canonical `"system"`. */
export const UPSTREAM_ACTOR_SYSTEM: Readonly<Record<string, true>> = Object.freeze({
  system: true,
  service: true,
  tool: true,
  workflow: true,
  automation: true
});

export function normalizeActorLabel(input: UpstreamActorLabel): string {
  return input.trim().toLowerCase();
}

export function mapActorType(input: UpstreamActorLabel): ActorMappingResult {
  const normalized = normalizeActorLabel(input);
  if (normalized.length === 0) {
    return { ok: false, reason: "empty_actor_label" };
  }
  if (UPSTREAM_ACTOR_HUMAN[normalized] === true) {
    return { ok: true, actor_type: "human" };
  }
  if (UPSTREAM_ACTOR_AI[normalized] === true) {
    return { ok: true, actor_type: "ai" };
  }
  if (UPSTREAM_ACTOR_SYSTEM[normalized] === true) {
    return { ok: true, actor_type: "system" };
  }
  return { ok: false, reason: "unknown_actor_label" };
}
