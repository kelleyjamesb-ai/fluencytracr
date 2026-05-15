#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const EVENT_VERSION = "1";

export function stableHash(value, length = 12) {
  return createHash("sha256").update(String(value ?? "unknown")).digest("hex").slice(0, length);
}

export function stableSlug(value, fallback = "unknown") {
  const input = String(value ?? fallback).trim().toLowerCase();
  const slug = input.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug.slice(0, 80) : fallback;
}

function toIsoTimestamp(value) {
  if (value === undefined || value === null || value === "") {
    throw new Error("missing_lmsys_tstamp");
  }
  const numeric = typeof value === "number" ? value : Number(value);
  const millis = Number.isFinite(numeric)
    ? numeric < 10_000_000_000
      ? numeric * 1000
      : numeric
    : Date.parse(String(value));
  if (!Number.isFinite(millis)) {
    throw new Error("invalid_lmsys_tstamp");
  }
  return new Date(millis).toISOString();
}

function eventTimestamp(baseMs, offsetMs) {
  return new Date(baseMs + offsetMs).toISOString();
}

function readMessages(record) {
  const conversation = Array.isArray(record?.conversation) ? record.conversation : [];
  return conversation.filter((message) => message && typeof message === "object");
}

function messageRole(message) {
  return String(message?.role ?? "").trim().toLowerCase();
}

function messageTurnIndex(message, fallbackIndex) {
  const raw = message?.turn ?? message?.turn_index ?? message?.idx;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : fallbackIndex;
}

function moderationEntry(record, messageIndex) {
  const moderation = Array.isArray(record?.openai_moderation) ? record.openai_moderation : [];
  const entry = moderation[messageIndex];
  return entry && typeof entry === "object" ? entry : null;
}

function moderationFlagged(record, messageIndex) {
  const entry = moderationEntry(record, messageIndex);
  return entry?.flagged === true;
}

function canonicalEvent({
  eventName,
  orgId,
  workflowId,
  executionId,
  timestamp,
  actorType,
  context = {},
  metadata = {}
}) {
  return {
    event_name: eventName,
    event_version: EVENT_VERSION,
    org_id: orgId,
    workflow_id: workflowId,
    timestamp,
    actor_type: actorType,
    context,
    metadata,
    execution_id: executionId
  };
}

export function transformLmsysConversationToCanonicalEvents(record, options = {}) {
  const conversationId = String(record?.conversation_id ?? "").trim();
  if (conversationId.length === 0) {
    throw new Error("missing_conversation_id");
  }
  const model = String(record?.model ?? "unknown-model");
  const language = String(record?.language ?? "unknown-language");
  const timestampInput = record?.tstamp ?? record?.timestamp ?? record?.created_at;
  const baseIso = toIsoTimestamp(timestampInput);
  const baseMs = Date.parse(baseIso);
  const orgId = `lmsys-org-${stableHash(language, 16)}`;
  const workflowId = `lmsys-workflow-${stableSlug(model)}-${stableHash(model, 8)}`;
  const executionId = `lmsys-exec-${stableSlug(conversationId, stableHash(conversationId, 12))}`;
  const messages = readMessages(record);
  const events = [];
  let sequence = 0;
  let sawStart = false;
  let sawAssistant = false;
  let lastAssistantTurn = null;
  let assistantAttempts = 0;

  const push = (eventName, actorType, context = {}, metadata = {}) => {
    events.push(
      canonicalEvent({
        eventName,
        orgId,
        workflowId,
        executionId,
        timestamp: eventTimestamp(baseMs, sequence * 1000),
        actorType,
        context,
        metadata: {
          event_id: `${executionId}-${String(sequence).padStart(6, "0")}`,
          sequence,
          source_dataset: "lmsys-chat-1m",
          ...metadata
        }
      })
    );
    sequence += 1;
  };

  for (let i = 0; i < messages.length; i += 1) {
    const message = messages[i];
    const role = messageRole(message);
    const turnIndex = messageTurnIndex(message, i);
    const flagged = moderationFlagged(record, i);

    if (role === "user" && !sawStart) {
      push("execution_start", "human", {
        source_event: "start",
        turn_index: turnIndex,
        structural_start: true
      });
      sawStart = true;
    }

    if (role === "assistant") {
      if (!sawStart) {
        push("execution_start", "system", {
          source_event: "start",
          turn_index: turnIndex,
          structural_start: true,
          inferred_start: true
        });
        sawStart = true;
      }
      if (lastAssistantTurn === turnIndex) {
        push("step", "human", {
          source_event: "retry",
          step_kind: "retry",
          turn_index: turnIndex,
          retry_visibility: true
        });
      }
      push("step", "ai", {
        source_event: "attempt",
        step_kind: "attempt",
        turn_index: turnIndex,
        assistant_attempt_index: assistantAttempts
      });
      sawAssistant = true;
      lastAssistantTurn = turnIndex;
      assistantAttempts += 1;
    }

    if (flagged) {
      push("ai_output_disposition", "human", {
        source_event: "reject",
        disposition: "rejected",
        turn_index: turnIndex
      });
    }
  }

  if (!sawStart) {
    push("execution_start", "system", {
      source_event: "start",
      structural_start: true,
      inferred_start: true
    });
  }

  if (record?.redacted === true) {
    push("ai_output_disposition", "human", {
      source_event: "edit",
      disposition: "edited"
    });
  }

  if (sawAssistant) {
    push("ai_output_disposition", "ai", {
      source_event: "complete",
      disposition: "accepted",
      terminal: true,
      verification_present: options.verificationPresent === true
    });
  } else {
    push("ai_output_disposition", "system", {
      source_event: "implicit_abandon",
      disposition: "abandoned",
      terminal: true
    });
  }

  return events;
}

export function transformLmsysJsonLine(line, options = {}) {
  const trimmed = String(line ?? "").trim();
  if (trimmed.length === 0) {
    return [];
  }
  return transformLmsysConversationToCanonicalEvents(JSON.parse(trimmed), options);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node scripts/seed_lmsys_transform.mjs <record.json>");
    process.exit(1);
  }
  const record = JSON.parse(readFileSync(inputPath, "utf8"));
  process.stdout.write(`${JSON.stringify(transformLmsysConversationToCanonicalEvents(record), null, 2)}\n`);
}
