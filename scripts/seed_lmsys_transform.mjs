#!/usr/bin/env node
// LMSYS-Chat-1M's public schema does not include `tstamp`; synthesize a stable,
// recent UTC timestamp from `conversation_id` so local assurance runs are repeatable.
export function syntheticTimestampForLmsysRecord(record) {
  const id = String(record?.conversation_id ?? "anon");
  let hash = 5381;
  for (const char of id) {
    hash = ((hash << 5) + hash + char.charCodeAt(0)) >>> 0;
  }
  const anchorMs = Date.UTC(2026, 4, 1);
  const offsetSeconds = hash % (30 * 24 * 60 * 60);
  return new Date(anchorMs + offsetSeconds * 1000).toISOString();
}

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const DEFAULT_RISK_CLASS = "medium";

export function stableHash(value, length = 12) {
  return createHash("sha256").update(String(value ?? "unknown")).digest("hex").slice(0, length);
}

export function stableSlug(value, fallback = "unknown") {
  const input = String(value ?? fallback).trim().toLowerCase();
  const slug = input.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug.slice(0, 80) : fallback;
}

export function lmsysOrgId(language) {
  return `lmsys-org-${stableHash(String(language ?? "unknown-language"), 16)}`;
}

export function lmsysWorkflowId(model) {
  const raw = String(model ?? "unknown-model");
  return `lmsys-workflow-${stableSlug(raw)}-${stableHash(raw, 8)}`;
}

export function lmsysRunId(conversationId) {
  const raw = String(conversationId ?? "");
  return `lmsys-exec-${stableSlug(raw, stableHash(raw, 12))}`;
}

export function resolvedBackendExecutionId(event) {
  if (event?.run_id) {
    return `exec:${event.workflow_id}:run:${event.run_id}`;
  }
  if (event?.workflow_run_id) {
    return `exec:${event.workflow_id}:wfrun:${event.workflow_run_id}`;
  }
  return null;
}

function toIsoTimestamp(value, record) {
  const fallback = syntheticTimestampForLmsysRecord(record);
  const candidate = value ?? fallback;
  const numeric = typeof candidate === "number" ? candidate : Number(candidate);
  const millis = Number.isFinite(numeric)
    ? numeric < 10_000_000_000
      ? numeric * 1000
      : numeric
    : Date.parse(String(candidate));
  if (!Number.isFinite(millis)) {
    throw new Error("invalid_lmsys_timestamp");
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

function messageTurnIndex(message, messageIndex) {
  const raw = message?.turn ?? message?.turn_index ?? message?.idx;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (Number.isFinite(n)) {
    return n;
  }
  return Math.floor(messageIndex / 2);
}

function moderationEntry(record, messageIndex) {
  const moderation = Array.isArray(record?.openai_moderation) ? record.openai_moderation : [];
  const entry = moderation[messageIndex];
  return entry && typeof entry === "object" ? entry : null;
}

function moderationFlagged(record, messageIndex) {
  return moderationEntry(record, messageIndex)?.flagged === true;
}

function baseFields({ timestamp, orgId, workflowId, runId }) {
  return {
    timestamp,
    risk_class: DEFAULT_RISK_CLASS,
    org_unit: `org:${orgId}`,
    workflow_id: workflowId,
    run_id: runId
  };
}

function stageEvent(fields, stageFrom, stageTo, aiAssisted) {
  return {
    ...fields,
    event_type: "workflow_stage_transition",
    stage_from: stageFrom,
    stage_to: stageTo,
    ai_assisted: aiAssisted
  };
}

function dispositionEvent(fields, disposition, options = {}) {
  return {
    ...fields,
    event_type: "ai_output_disposition",
    disposition,
    edit_distance_bucket: options.editDistanceBucket ?? "none",
    verification_present: options.verificationPresent === true,
    time_to_action_ms: options.timeToActionMs ?? 0
  };
}

function recoveryEvent(fields, cycles = 1, resolutionTimeMs = 0) {
  return {
    ...fields,
    event_type: "ai_recovery_loop",
    recovery_type: "re_prompt",
    cycles,
    resolution_time_ms: resolutionTimeMs
  };
}

function abandonmentEvent(fields, stage = "prompted") {
  return {
    ...fields,
    event_type: "ai_abandonment",
    abandonment_stage: stage,
    reason_bucket: "unknown"
  };
}

export function transformLmsysConversationToCanonicalEvents(record, options = {}) {
  const conversationId = String(record?.conversation_id ?? "").trim();
  if (conversationId.length === 0) {
    throw new Error("missing_conversation_id");
  }

  const orgId = lmsysOrgId(record?.language);
  const workflowId = lmsysWorkflowId(record?.model);
  const runId = lmsysRunId(conversationId);
  const baseIso = toIsoTimestamp(record?.tstamp ?? record?.timestamp ?? record?.created_at, record);
  const baseMs = Date.parse(baseIso);
  const messages = readMessages(record);
  const events = [];
  let sequence = 0;
  let started = false;
  let sawAssistant = false;
  let lastAssistantTurn = null;
  let assistantAttemptIndex = 0;

  const fieldsAt = (offsetMs = sequence * 1000) =>
    baseFields({
      timestamp: eventTimestamp(baseMs, offsetMs),
      orgId,
      workflowId,
      runId
    });

  const push = (event) => {
    events.push(event);
    sequence += 1;
  };

  for (let i = 0; i < messages.length; i += 1) {
    const role = messageRole(messages[i]);
    const turnIndex = messageTurnIndex(messages[i], i);
    const flagged = moderationFlagged(record, i);

    if (role === "user" && !started) {
      push(stageEvent(fieldsAt(), "not_started", "started", false));
      started = true;
    }

    if (role === "assistant") {
      if (!started) {
        push(stageEvent(fieldsAt(), "not_started", "started", false));
        started = true;
      }
      if (lastAssistantTurn === turnIndex) {
        push(recoveryEvent(fieldsAt(), 1, 0));
      }
      push(stageEvent(fieldsAt(), assistantAttemptIndex === 0 ? "started" : "attempt", "attempt", true));
      sawAssistant = true;
      lastAssistantTurn = turnIndex;
      assistantAttemptIndex += 1;
    }

    if (flagged) {
      push(dispositionEvent(fieldsAt(), "rejected"));
    }
  }

  if (!started) {
    push(stageEvent(fieldsAt(), "not_started", "started", false));
  }

  if (record?.redacted === true) {
    push(dispositionEvent(fieldsAt(), "edited", { editDistanceBucket: "heavy" }));
  }

  if (sawAssistant) {
    push(
      dispositionEvent(fieldsAt(), "accepted", {
        verificationPresent: options.verificationPresent === true,
        timeToActionMs: Math.max(0, sequence * 1000)
      })
    );
  } else {
    push(abandonmentEvent(fieldsAt(), "prompted"));
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
