#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";

import {
  stableHash,
  syntheticTimestampForLmsysRecord,
  transformLmsysConversationToCanonicalEvents
} from "./seed_lmsys_transform.mjs";
import {
  buildAssuranceCases,
  buildAssuranceEvents
} from "./seed_lmsys_assurance_transform.mjs";

const require = createRequire(import.meta.url);
const { FluencyEventSchema } = require("../shared/dist/fluencyTracrSchemas.js");

function assertFluencyEvent(event) {
  const parsed = FluencyEventSchema.safeParse(event);
  assert.equal(parsed.success, true, parsed.success ? "" : parsed.error.message);
  assert.equal("event_name" in event, false, "old canonical event_name shape leaked");
  assert.equal("context" in event, false, "old canonical context shape leaked");
  assert.equal("metadata" in event, false, "old canonical metadata shape leaked");
  assert.equal("execution_id" in event, false, "old execution_id field leaked");
}

function assertNoRawText(value) {
  const serialized = JSON.stringify(value);
  const forbidden = [
    "hello there",
    "private output",
    "192.0.2.1",
    "hashed_ip",
    "alice@example.com",
    "message_text",
    "raw prompt body"
  ];
  for (const token of forbidden) {
    assert.equal(serialized.includes(token), false, `leaked forbidden token: ${token}`);
  }
}

const sample = {
  conversation_id: "conv-abc",
  model: "gpt-4",
  language: "English",
  ip: "192.0.2.1",
  hashed_ip: "abc123",
  redacted: true,
  turn: 2,
  conversation: [
    { role: "user", content: "hello there", turn: 0 },
    { role: "assistant", content: "private output", turn: 0 },
    { role: "assistant", content: "regenerated private output", turn: 0 },
    { role: "user", content: "alice@example.com", turn: 1 }
  ],
  openai_moderation: [{ flagged: false }, { flagged: true }, { flagged: false }, { flagged: false }]
};

const events = transformLmsysConversationToCanonicalEvents(sample);
assert.equal(events[0].event_type, "workflow_stage_transition");
assert.equal(events[0].stage_from, "not_started");
assert.equal(events[0].stage_to, "started");
assert.ok(events.some((event) => event.event_type === "ai_recovery_loop"));
assert.ok(events.some((event) => event.event_type === "ai_output_disposition" && event.disposition === "rejected"));
assert.ok(events.some((event) => event.event_type === "ai_output_disposition" && event.disposition === "edited"));
assert.ok(events.some((event) => event.event_type === "ai_output_disposition" && event.disposition === "accepted"));
assert.equal(events[0].timestamp, syntheticTimestampForLmsysRecord(sample));
assert.equal(events[0].org_unit, `org:lmsys-org-${stableHash("English", 16)}`);
assert.equal(events[0].workflow_id, `lmsys-workflow-gpt-4-${stableHash("gpt-4", 8)}`);
assert.equal(events[0].run_id, "lmsys-exec-conv-abc");
for (const event of events) {
  assertFluencyEvent(event);
  assert.equal(event.run_id, "lmsys-exec-conv-abc");
}
assertNoRawText(events);

const abandoned = transformLmsysConversationToCanonicalEvents({
  conversation_id: "conv-no-assistant",
  model: "claude-v1",
  language: "Spanish",
  conversation: [{ role: "user", content: "raw text", turn: 0 }],
  openai_moderation: []
});
assert.ok(abandoned.some((event) => event.event_type === "ai_abandonment"));
for (const event of abandoned) {
  assertFluencyEvent(event);
}
assertNoRawText(abandoned);

const cases = buildAssuranceCases({ minCohortSize: 5, iterationHighThreshold: 2 });
const ids = cases.map((entry) => entry.id).sort();
assert.deepEqual(ids, [
  "aivm_acceleration_objective",
  "aivm_acceleration_qualitative",
  "aivm_quality_premium_objective",
  "aivm_quality_premium_qualitative",
  "aivm_unclassified_objective",
  "aivm_unclassified_qualitative",
  "calibrated_fluency",
  "duplicate_execution_ids_across_orgs",
  "failure_success_recovery_maturity",
  "fast_completion_no_verification",
  "friction_loop",
  "ghost_use_bypassed_by_positive_evidence",
  "ghost_use_does_not_persist",
  "ghost_use_residual_fires",
  "ghost_use_suppressed_by_ambiguity",
  "pii_boundary_rejection",
  "sub_threshold_workflow",
  "undertrust_avoidance"
]);
assert.ok(cases.every((entry) => Array.isArray(entry.events) || Array.isArray(entry.invalid_payloads)));
const ghostUseCases = cases.filter((entry) => entry.expected?.ghost_use);
assert.deepEqual(ghostUseCases.map((entry) => entry.id).sort(), [
  "ghost_use_bypassed_by_positive_evidence",
  "ghost_use_does_not_persist",
  "ghost_use_residual_fires",
  "ghost_use_suppressed_by_ambiguity"
]);
for (const entry of ghostUseCases) {
  assert.equal(typeof entry.workflow_id, "string");
  assert.ok(entry.workflow_id.includes(entry.id.replaceAll("_", "-")));
  assert.equal(entry.expected.framing, "observability_only");
  assert.equal(entry.ghost_use_manifest.required_windows, 2);
  assert.equal(entry.ghost_use_manifest.ambiguity_dominance_threshold, 0.2);
  assert.ok(["SURFACE", "BYPASS", "SUPPRESS", "SUPPRESS_PERSISTENCE"].includes(entry.expected.ghost_use));
}

const aivmCases = cases.filter((entry) => entry.aivm_manifest);
assert.equal(aivmCases.length, 6);
assert.deepEqual(
  aivmCases
    .map((entry) => `${entry.expected.value_type}:${entry.expected.evidence_grade}`)
    .sort(),
  [
    "ACCELERATION:OBJECTIVE",
    "ACCELERATION:QUALITATIVE",
    "QUALITY_PREMIUM:OBJECTIVE",
    "QUALITY_PREMIUM:QUALITATIVE",
    "UNCLASSIFIED:OBJECTIVE",
    "UNCLASSIFIED:QUALITATIVE"
  ]
);
for (const entry of aivmCases) {
  assert.ok(entry.workflow_id.includes(entry.id.replaceAll("_", "-")));
  assert.deepEqual(entry.aivm_manifest.verdict_fields, ["value_type", "evidence_grade"]);
  assert.ok(Array.isArray(entry.aivm_manifest.canonical_evidence));
  assert.ok(["ACCELERATION", "QUALITY_PREMIUM", "UNCLASSIFIED"].includes(entry.expected.value_type));
  assert.ok(["OBJECTIVE", "QUALITATIVE"].includes(entry.expected.evidence_grade));
  if (entry.expected.evidence_grade === "OBJECTIVE") {
    assert.equal(entry.aivm_manifest.cohort_size, 30);
    assert.equal(entry.aivm_manifest.window_length_days, 90);
  }
}

const assuranceEvents = buildAssuranceEvents({ minCohortSize: 5, iterationHighThreshold: 2 });
assert.ok(assuranceEvents.length > 0);
for (const event of assuranceEvents) {
  assertFluencyEvent(event);
}
assertNoRawText(assuranceEvents);

console.log("LMSYS assurance harness self-test PASS");
