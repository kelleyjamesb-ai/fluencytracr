/**
 * Canonical ingest envelope — strict validation, unknown fields rejected, execution identity required.
 */

export type ActorType = "human" | "ai" | "system";

export type CanonicalEventContext = Record<string, unknown>;

export type CanonicalEventMetadata = Record<string, unknown>;

export type CanonicalEvent = Readonly<{
  event_name: string;
  event_version: string;
  org_id: string;
  workflow_id: string;
  timestamp: string;
  actor_type: ActorType;
  context: CanonicalEventContext;
  metadata?: CanonicalEventMetadata;
  execution_id?: string;
  workflow_run_id?: string;
  run_id?: string;
  chat_id?: string;
  agent_run_id?: string;
}>;

const ACTOR_TYPES: ReadonlySet<string> = new Set(["human", "ai", "system"]);

const TOP_LEVEL_KEYS = new Set([
  "event_name",
  "event_version",
  "org_id",
  "workflow_id",
  "timestamp",
  "actor_type",
  "context",
  "metadata",
  "execution_id",
  "workflow_run_id",
  "run_id",
  "chat_id",
  "agent_run_id"
]);

/** JSON-Schema-like shape for documentation and external boundary checks (not a runtime validator). */
export const CANONICAL_EVENT_JSON_SCHEMA = {
  $id: "https://fluencytracr.local/schemas/canonical-event.json",
  type: "object",
  additionalProperties: false,
  required: ["event_name", "event_version", "org_id", "workflow_id", "timestamp", "actor_type", "context"],
  properties: {
    event_name: { type: "string", minLength: 1 },
    event_version: { type: "string", minLength: 1 },
    org_id: { type: "string", minLength: 1 },
    workflow_id: { type: "string", minLength: 1 },
    timestamp: { type: "string", format: "date-time" },
    actor_type: { enum: ["human", "ai", "system"] },
    context: { type: "object" },
    metadata: { type: "object" },
    execution_id: { type: "string", minLength: 1 },
    workflow_run_id: { type: "string", minLength: 1 },
    run_id: { type: "string", minLength: 1 },
    chat_id: { type: "string", minLength: 1 },
    agent_run_id: { type: "string", minLength: 1 }
  },
  oneOf: [
    { required: ["execution_id"] },
    {
      anyOf: [
        { required: ["workflow_run_id"] },
        { required: ["run_id"] },
        { required: ["chat_id"] },
        { required: ["agent_run_id"] }
      ]
    }
  ]
} as const;

export type ValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: readonly string[] };

function isIso8601Timestamp(s: string): boolean {
  if (typeof s !== "string" || s.length < 10) {
    return false;
  }
  const t = Date.parse(s);
  return Number.isFinite(t);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function hasExecutionIdentity(raw: Record<string, unknown>): boolean {
  if (isNonEmptyString(raw.execution_id)) {
    return true;
  }
  return (
    isNonEmptyString(raw.workflow_run_id) ||
    isNonEmptyString(raw.run_id) ||
    isNonEmptyString(raw.chat_id) ||
    isNonEmptyString(raw.agent_run_id)
  );
}

/**
 * Deep-freezes the event and shallow-freezes nested context/metadata objects.
 */
export function freezeCanonicalEvent(event: CanonicalEvent): CanonicalEvent {
  const frozenContext = Object.freeze({ ...event.context });
  const frozenMeta =
    event.metadata !== undefined ? Object.freeze({ ...event.metadata }) : undefined;
  return Object.freeze({
    ...event,
    context: frozenContext,
    ...(frozenMeta !== undefined ? { metadata: frozenMeta } : {})
  });
}

export function validateCanonicalEvent(input: unknown): ValidationResult<CanonicalEvent> {
  const errors: string[] = [];

  if (!isPlainObject(input)) {
    return { ok: false, errors: ["root_must_be_object"] };
  }

  for (const key of Object.keys(input)) {
    if (!TOP_LEVEL_KEYS.has(key)) {
      errors.push(`unknown_field:${key}`);
    }
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  if (!isNonEmptyString(input.event_name)) {
    errors.push("missing_or_empty:event_name");
  }
  if (!isNonEmptyString(input.event_version)) {
    errors.push("missing_or_empty:event_version");
  }
  if (!isNonEmptyString(input.org_id)) {
    errors.push("missing_or_empty:org_id");
  }
  if (!isNonEmptyString(input.workflow_id)) {
    errors.push("missing_or_empty:workflow_id");
  }
  if (!isNonEmptyString(input.timestamp)) {
    errors.push("missing_or_empty:timestamp");
  } else if (!isIso8601Timestamp(input.timestamp)) {
    errors.push("invalid_timestamp");
  }
  if (!isNonEmptyString(input.actor_type) || !ACTOR_TYPES.has(input.actor_type)) {
    errors.push("invalid_actor_type");
  }
  if (!isPlainObject(input.context)) {
    errors.push("context_must_be_object");
  }

  if (input.metadata !== undefined && !isPlainObject(input.metadata)) {
    errors.push("metadata_must_be_object");
  }

  const idFields = ["execution_id", "workflow_run_id", "run_id", "chat_id", "agent_run_id"] as const;
  for (const f of idFields) {
    const v = input[f];
    if (v !== undefined && v !== null && typeof v !== "string") {
      errors.push(`invalid_type:${f}`);
    }
    if (typeof v === "string" && v.length === 0) {
      errors.push(`empty_string:${f}`);
    }
  }

  if (!hasExecutionIdentity(input)) {
    errors.push("missing_execution_identity");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const event: CanonicalEvent = {
    event_name: input.event_name as string,
    event_version: input.event_version as string,
    org_id: input.org_id as string,
    workflow_id: input.workflow_id as string,
    timestamp: input.timestamp as string,
    actor_type: input.actor_type as ActorType,
    context: input.context as CanonicalEventContext,
    ...(input.metadata !== undefined
      ? { metadata: input.metadata as CanonicalEventMetadata }
      : {}),
    ...(isNonEmptyString(input.execution_id) ? { execution_id: input.execution_id } : {}),
    ...(isNonEmptyString(input.workflow_run_id) ? { workflow_run_id: input.workflow_run_id } : {}),
    ...(isNonEmptyString(input.run_id) ? { run_id: input.run_id } : {}),
    ...(isNonEmptyString(input.chat_id) ? { chat_id: input.chat_id } : {}),
    ...(isNonEmptyString(input.agent_run_id) ? { agent_run_id: input.agent_run_id } : {})
  };

  return { ok: true, value: event };
}
