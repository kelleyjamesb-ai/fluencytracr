#!/usr/bin/env node
import assert from "node:assert/strict";

import {
  stableHash,
  transformLmsysConversationToCanonicalEvents
} from "./seed_lmsys_transform.mjs";
import {
  buildAssuranceCases,
  buildAssuranceEvents
} from "./seed_lmsys_assurance_transform.mjs";

function assertCanonicalOnly(event) {
  const allowed = new Set([
    "event_name",
    "event_version",
    "org_id",
    "workflow_id",
    "timestamp",
    "actor_type",
    "context",
    "metadata",
    "execution_id"
  ]);
  for (const key of Object.keys(event)) {
    assert.ok(allowed.has(key), `unexpected canonical field: ${key}`);
  }
}

function assertNoRawText(value) {
  const serialized = JSON.stringify(value);
  const forbidden = [
    "hello there",
    "private output",
    "192.0.2.1",
    "hashed_ip",
    "alice@example.com",
    "content"
  ];
  for (const token of forbidden) {
    assert.equal(serialized.includes(token), false, `leaked forbidden token: ${token}`);
  }
}

const sample = {
  conversation_id: "conv-abc",
  model: "gpt-4",
  language: "English",
  tstamp: 1700000000,
  ip: "192.0.2.1",
  hashed_ip: "abc123",
  redacted: true,
  conversation: [
    { role: "user", content: "hello there", turn: 0 },
    { role: "assistant", content: "private output", turn: 0 },
    { role: "assistant", content: "regenerated private output", turn: 0 },
    { role: "user", content: "alice@example.com", turn: 1 }
  ],
  openai_moderation: [{ flagged: false }, { flagged: true }, { flagged: false }, { flagged: false }]
};

const events = transformLmsysConversationToCanonicalEvents(sample);
assert.equal(events[0].event_name, "execution_start");
assert.equal(events[0].actor_type, "human");
assert.ok(events.some((event) => event.context?.step_kind === "retry"));
assert.ok(events.some((event) => event.context?.disposition === "rejected"));
assert.ok(events.some((event) => event.context?.disposition === "edited"));
assert.ok(events.some((event) => event.context?.disposition === "accepted"));
assert.equal(events[0].timestamp, "2023-11-14T22:13:20.000Z");
assert.equal(events[0].org_id, `lmsys-org-${stableHash("English", 16)}`);
for (const event of events) {
  assertCanonicalOnly(event);
  assert.equal(event.execution_id, "lmsys-exec-conv-abc");
}
assertNoRawText(events);

const abandoned = transformLmsysConversationToCanonicalEvents({
  conversation_id: "conv-no-assistant",
  model: "claude-v1",
  language: "Spanish",
  tstamp: 1700000000,
  conversation: [{ role: "user", content: "raw text", turn: 0 }],
  openai_moderation: []
});
assert.ok(abandoned.some((event) => event.context?.disposition === "abandoned"));
assertNoRawText(abandoned);

const cases = buildAssuranceCases({ minCohortSize: 5, iterationHighThreshold: 2 });
const ids = cases.map((entry) => entry.id).sort();
assert.deepEqual(ids, [
  "duplicate_execution_ids_across_orgs",
  "failure_success_recovery_maturity",
  "fast_completion_no_verification",
  "iteration_high_threshold_cluster",
  "no_terminal_event",
  "out_of_order_timestamps",
  "pii_boundary_rejection",
  "sub_threshold_workflow"
]);
assert.ok(cases.every((entry) => Array.isArray(entry.events) || Array.isArray(entry.invalid_payloads)));

const assuranceEvents = buildAssuranceEvents({ minCohortSize: 5, iterationHighThreshold: 2 });
assert.ok(assuranceEvents.length > 0);
assertNoRawText(assuranceEvents);

console.log("LMSYS assurance harness self-test PASS");
