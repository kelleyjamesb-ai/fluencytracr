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
  "causal_delta_held",
  "causal_delta_improved",
  "causal_delta_indeterminate",
  "causal_delta_regressed",
  "duplicate_execution_ids_across_orgs",
  "failure_success_recovery_maturity",
  "fast_completion_no_verification",
  "friction_loop",
  "ghost_use_bypassed_by_positive_evidence",
  "ghost_use_does_not_persist",
  "ghost_use_residual_fires",
  "ghost_use_suppressed_by_ambiguity",
  "outcome_evidence_suppress_with_outcomes",
  "outcome_evidence_surface_no_outcomes",
  "outcome_evidence_surface_with_outcomes",
  "pii_boundary_rejection",
  "reliability_factor_high_reliability_workflow",
  "reliability_factor_low_reliability_workflow",
  "reliability_factor_suppressed_sparse_data_workflow",
  "sub_threshold_workflow",
  "undertrust_avoidance",
  "velocity_customer_above_calibration",
  "velocity_customer_low",
  "velocity_saturated_calibration_cohort"
]);
assert.ok(cases.every((entry) => Array.isArray(entry.events) || Array.isArray(entry.invalid_payloads)));
const velocityCases = cases.filter((entry) => entry.velocity_manifest);
assert.deepEqual(velocityCases.map((entry) => entry.id).sort(), [
  "velocity_customer_above_calibration",
  "velocity_customer_low",
  "velocity_saturated_calibration_cohort"
]);
for (const entry of velocityCases) {
  assert.equal(entry.velocity_manifest.source_contract, "docs/contracts/velocity-index.md");
  assert.equal(entry.velocity_manifest.distribution_only, true);
  assert.equal(entry.velocity_manifest.person_level_fields_included, false);
  assert.deepEqual(entry.velocity_manifest.canonical_events, [
    "USER_FREQUENCY_OBSERVED",
    "USER_ENGAGEMENT_OBSERVED",
    "USER_BREADTH_OBSERVED"
  ]);
  assert.equal(entry.velocity_distribution_payloads.length, 3);
  assert.ok(["SURFACE", "SUPPRESS"].includes(entry.expected.verdict));
  for (const payload of entry.velocity_distribution_payloads) {
    assert.equal(payload.workflow_id, entry.workflow_id);
    assert.equal(payload.schema_version, "FT_V2_2026_05");
    assert.equal(payload.privacy.person_level_fields_included, false);
    assert.ok(entry.velocity_manifest.canonical_events.includes(payload.event_name));
    assert.equal("user_email" in payload, false);
    assert.equal("name" in payload, false);
    assert.deepEqual(Object.keys(payload.distribution).sort(), ["p10", "p50", "p90", "p99"]);
  }
}
const outcomeEvidenceCases = cases.filter((entry) => entry.outcome_evidence_manifest);
assert.deepEqual(outcomeEvidenceCases.map((entry) => entry.id).sort(), [
  "outcome_evidence_suppress_with_outcomes",
  "outcome_evidence_surface_no_outcomes",
  "outcome_evidence_surface_with_outcomes"
]);
for (const entry of outcomeEvidenceCases) {
  assert.ok(["SURFACE", "SUPPRESS"].includes(entry.expected.outcome_verdict));
  assert.equal(typeof entry.expected.outcome_count, "number");
  for (const payload of entry.outcome_evidence ?? []) {
    assert.equal(payload.workflow_id, entry.workflow_id);
    assert.equal(payload.jbtd_id, null);
    assert.equal(payload.persona_id, null);
    assert.ok(payload.cohort_size >= 5);
  }
}
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

const causalDeltaCases = cases.filter((entry) => entry.expected?.causal_delta_shift);
assert.deepEqual(causalDeltaCases.map((entry) => entry.id).sort(), [
  "causal_delta_held",
  "causal_delta_improved",
  "causal_delta_indeterminate",
  "causal_delta_regressed"
]);
for (const entry of causalDeltaCases) {
  assert.equal(typeof entry.workflow_id, "string");
  assert.ok(entry.workflow_id.includes(entry.id.replaceAll("_", "-")));
  assert.ok(["IMPROVED", "HELD", "REGRESSED", "INDETERMINATE"].includes(entry.expected.causal_delta_shift));
  assert.equal(entry.causal_delta_manifest.endpoint, "/api/v1/causal-delta");
  assert.equal(entry.causal_delta_manifest.pre_window_days, 30);
  assert.equal(entry.causal_delta_manifest.post_window_days, 30);
  assert.equal(entry.causal_delta_manifest.no_statistical_claims, true);
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

const reliabilityCases = cases.filter((entry) => entry.reliability_factor_manifest);
assert.deepEqual(reliabilityCases.map((entry) => entry.id).sort(), [
  "reliability_factor_high_reliability_workflow",
  "reliability_factor_low_reliability_workflow",
  "reliability_factor_suppressed_sparse_data_workflow"
]);
for (const entry of reliabilityCases) {
  assert.ok(entry.workflow_id.includes(entry.id.replaceAll("_", "-")));
  assert.deepEqual(entry.reliability_factor_manifest.verdict_fields, [
    "reliability_factor",
    "reliability_components"
  ]);
  assert.equal(
    entry.reliability_factor_manifest.formula,
    "clamp01(0.5 + 0.25*verification_presence_rate + 0.25*recovery_success_rate - 0.25*abandonment_rate - 0.25*friction_loop_rate)"
  );
  assert.equal(entry.reliability_factor_manifest.rounding, "3_decimal_places");
  assert.ok(["SURFACE", "SUPPRESS"].includes(entry.expected.decision));
  if (entry.expected.decision === "SURFACE") {
    assert.equal(typeof entry.expected.reliability_factor, "number");
    assert.notEqual(entry.expected.reliability_components, null);
  } else {
    assert.equal(entry.expected.suppression, "sparse_data");
  }
  for (const event of entry.events) {
    assertFluencyEvent(event);
  }
}

const assuranceEvents = buildAssuranceEvents({ minCohortSize: 5, iterationHighThreshold: 2 });
assert.ok(assuranceEvents.length > 0);
for (const event of assuranceEvents) {
  assertFluencyEvent(event);
}
assertNoRawText(assuranceEvents);

console.log("LMSYS assurance harness self-test PASS");
