import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSupportValueEvidencePack,
  validateSupportValueInput
} from "./generate_ai_value_support_pack.mjs";

const baseInput = {
  schema_version: "FT_AI_VALUE_SUPPORT_INPUT_2026_06",
  org_id: "org-northstar-enterprise",
  window_id: "2026-04-01_to_2026-05-31",
  workflow_family: "customer_support_case_resolution",
  workflow_value_hypothesis:
    "AI-assisted support work may be associated with faster case resolution, lower escalation, and improved knowledge reuse.",
  ai_work_evidence: {
    verdict: "SURFACE",
    suppression_reason: null,
    cohort_size: 42,
    window_days: 61,
    aggregate_patterns: {
      assistant_sessions: 1840,
      search_sessions: 2260,
      skill_invocations: 312,
      agent_runs: 148,
      verification_attached_episodes: 780,
      recovery_episodes: 96,
      abandonment_episodes: 41
    }
  },
  outcome_evidence: {
    source_type: "support_system",
    baseline_window: "2026-02-01_to_2026-03-31",
    comparison_window: "2026-04-01_to_2026-05-31",
    metrics: {
      median_resolution_hours: { baseline: 18.4, comparison: 15.1, unit: "hours" },
      escalation_rate: { baseline: 0.18, comparison: 0.14, unit: "share" },
      reopen_rate: { baseline: 0.075, comparison: 0.061, unit: "share" },
      backlog_count: { baseline: 1240, comparison: 1102, unit: "cases" }
    }
  },
  source_coverage: {
    ai_activity: "present",
    workflow: "present",
    outcome: "present",
    baseline: "present",
    trust: "present"
  },
  assumptions: [
    {
      assumption_id: "support-volume-mix-stable",
      owner: "customer",
      description: "Support volume mix is similar enough across baseline and comparison windows for directional review."
    }
  ]
};

test("buildSupportValueEvidencePack emits a caveated support value packet from aggregate inputs", () => {
  const pack = buildSupportValueEvidencePack(baseInput);

  assert.equal(pack.schema_version, "FT_AI_VALUE_SUPPORT_PACK_2026_06");
  assert.equal(pack.verdict, "SURFACE");
  assert.equal(pack.claim_confidence.overall_state, "CAVEATED");
  assert.deepEqual(
    pack.claim_confidence.claim_states.map((claim) => claim.state),
    ["SUPPORTED", "CAVEATED", "BLOCKED"]
  );
  assert.deepEqual(pack.value_routes, [
    "COST_REDUCTION",
    "CAPACITY_CREATION",
    "QUALITY_IMPROVEMENT",
    "EXPERIENCE_IMPROVEMENT"
  ]);
  assert.equal(pack.work_change_evidence.length > 0, true);
  assert.equal(pack.safe_claims.length > 0, true);
  assert.equal(pack.blocked_claims.some((claim) => claim.claim_type === "roi_proof"), true);
  assert.equal(pack.outcome_signal_recommendations.length >= 3, true);
  assert.match(pack.executive_summary, /caveated/i);
});

test("missing outcome evidence fails closed and emits no safe value claims", () => {
  const input = structuredClone(baseInput);
  input.source_coverage.outcome = "missing";
  delete input.outcome_evidence;

  const pack = buildSupportValueEvidencePack(input);

  assert.equal(pack.verdict, "SURFACE");
  assert.equal(pack.claim_confidence.overall_state, "MISSING");
  assert.equal(
    pack.claim_confidence.claim_states.some((claim) => claim.state === "MISSING"),
    true
  );
  assert.deepEqual(pack.safe_claims, []);
  assert.equal(
    pack.required_caveats.some((caveat) => caveat.includes("Outcome evidence is missing")),
    true
  );
  assert.equal(
    pack.next_actions.some((action) => action.action.includes("aggregate support outcome export")),
    true
  );
});

test("suppressed AI work evidence blocks downstream value language", () => {
  const input = structuredClone(baseInput);
  input.ai_work_evidence.verdict = "SUPPRESS";
  input.ai_work_evidence.suppression_reason = "INSUFFICIENT_VOLUME";
  input.ai_work_evidence.cohort_size = 3;

  const pack = buildSupportValueEvidencePack(input);

  assert.equal(pack.verdict, "SUPPRESS");
  assert.equal(pack.suppression_reason, "INSUFFICIENT_VOLUME");
  assert.equal(pack.claim_confidence.overall_state, "SUPPRESSED");
  assert.equal(
    pack.claim_confidence.claim_states.some((claim) => claim.state === "SUPPRESSED"),
    true
  );
  assert.deepEqual(pack.safe_claims, []);
  assert.equal(
    pack.blocked_claims.some((claim) => claim.claim_type === "suppressed_value_claim"),
    true
  );
});

test("rejects unsupported AI work verdicts before value claims", () => {
  const input = structuredClone(baseInput);
  input.ai_work_evidence.verdict = "SUPPRESSED";

  const result = validateSupportValueInput(input);

  assert.equal(result.valid, false);
  assert.equal(
    result.errors.includes("Invalid ai_work_evidence.verdict: SUPPRESSED"),
    true
  );
  assert.throws(
    () => buildSupportValueEvidencePack(input),
    /Invalid ai_work_evidence.verdict: SUPPRESSED/
  );
});

test("rejects surfaced AI work evidence below volume or time gates", () => {
  const lowVolume = structuredClone(baseInput);
  lowVolume.ai_work_evidence.cohort_size = 4;
  const shortWindow = structuredClone(baseInput);
  shortWindow.ai_work_evidence.window_days = 59;

  const lowVolumeResult = validateSupportValueInput(lowVolume);
  const shortWindowResult = validateSupportValueInput(shortWindow);

  assert.equal(lowVolumeResult.valid, false);
  assert.equal(
    lowVolumeResult.errors.includes(
      "ai_work_evidence.cohort_size must be at least 5 before SURFACE"
    ),
    true
  );
  assert.equal(shortWindowResult.valid, false);
  assert.equal(
    shortWindowResult.errors.includes(
      "ai_work_evidence.window_days must be at least 60 before SURFACE"
    ),
    true
  );
});

test("requires at least one usable outcome signal before emitting safe claims", () => {
  const input = structuredClone(baseInput);
  input.outcome_evidence.metrics = {};

  const pack = buildSupportValueEvidencePack(input);

  assert.equal(pack.claim_confidence.overall_state, "MISSING");
  assert.equal(pack.outcome_signal_recommendations[0].signal_id, "support_outcome_export");
  assert.deepEqual(pack.safe_claims, []);
});

test("direct identifiers or raw text are rejected before packet generation", () => {
  const unsafeInput = structuredClone(baseInput);
  unsafeInput.sample_ticket_text = "The customer asked for a password reset.";
  unsafeInput.owner_email = "person@example.com";

  const result = validateSupportValueInput(unsafeInput);

  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    "Forbidden field detected: owner_email",
    "Forbidden field detected: sample_ticket_text"
  ]);
  assert.throws(
    () => buildSupportValueEvidencePack(unsafeInput),
    /Forbidden field detected: owner_email/
  );
});

test("generated packet never contains ROI proof, causality, ranking, or raw content claims", () => {
  const pack = buildSupportValueEvidencePack(baseInput);
  const customerFacingLanguage = JSON.stringify({
    executive_summary: pack.executive_summary,
    safe_claims: pack.safe_claims,
    required_caveats: pack.required_caveats
  }).toLowerCase();

  assert.equal(customerFacingLanguage.includes("proved roi"), false);
  assert.equal(customerFacingLanguage.includes("caused productivity"), false);
  assert.equal(customerFacingLanguage.includes("manager ranking"), false);
  assert.equal(customerFacingLanguage.includes("ticket text"), false);
  assert.equal(customerFacingLanguage.includes("person@example.com"), false);
});
