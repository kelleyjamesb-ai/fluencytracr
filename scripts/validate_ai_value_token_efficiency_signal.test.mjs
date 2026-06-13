import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  AI_VALUE_TOKEN_EFFICIENCY_SIGNAL_SCHEMA_VERSION,
  buildTokenEfficiencySignalFromAggregateSummary,
  validateTokenEfficiencySignal
} from "../shared/dist/aiValueEngine/index.js";

const EXAMPLES = "docs/contracts/ai-value-token-efficiency-signal/examples";

const REQUIRED_BLOCKED_USES = [
  "realized_roi",
  "ebita_claim",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "people_decisioning",
  "customer_facing_financial_output"
];

const SUPPORTED_USES = [
  "cost_exposure_review",
  "model_usage_review",
  "workflow_intensity_review",
  "token_efficiency_review",
  "model_routing_review",
  "workflow_design_review",
  "evidence_collection_planning"
];

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

function validSummary(overrides = {}) {
  return {
    org_id: "org_example",
    workflow_family: "customer_support_case_resolution",
    workflow_name: "Support case resolution",
    function_area: "customer_support",
    generated_at: "2026-06-13T00:00:00.000Z",
    covered_window: {
      window_start: "2026-05-01",
      window_end: "2026-05-31"
    },
    approved_aggregate_grain: "workflow_family",
    minimum_cohort_threshold: 5,
    k_min_posture: {
      minimum_cohort_threshold: 5,
      cohort_threshold_met: true,
      total_slices: 12,
      k_min_clear_slices: 12,
      suppressed_or_unknown_slices: 0
    },
    aggregate_token_summary: {
      total_prompt_tokens: 120000,
      total_completion_tokens: 42000,
      total_tokens: 162000,
      model_families_observed: ["gpt-4.1", "gpt-4.1-mini"],
      aggregate_interaction_count: 840,
      aggregate_workflow_count: 120,
      high_intensity_workflow_share: 0.28,
      average_tokens_per_interaction: 193,
      average_tokens_per_workflow: 1350,
      prompt_to_completion_ratio: 2.86
    },
    source_refs: {
      aggregate_probe_id: "token_probe_customer_support_2026_05",
      source_readiness_id: "source_readiness_token_usage_2026_05"
    },
    source_owner_attestation: {
      attestation_state: "attested",
      attested_by_role: "data_platform_owner",
      attested_at: "2026-06-13T00:00:00.000Z",
      caveats: []
    },
    ...overrides
  };
}

function buildSignal(overrides = {}, options = {}) {
  return buildTokenEfficiencySignalFromAggregateSummary(validSummary(overrides), {
    signalId: "token_efficiency_signal_test",
    generatedAt: "2026-06-13T00:00:00.000Z",
    ...options
  });
}

function expectValid(signal) {
  const result = validateTokenEfficiencySignal(signal);
  assert.equal(result.valid, true, result.gaps.join("; "));
  return result;
}

function expectInvalid(signal, expectedGapPattern) {
  const result = validateTokenEfficiencySignal(signal);
  assert.equal(result.valid, false, "Expected Token Efficiency Signal to fail");
  assert.ok(
    result.gaps.some((gap) => expectedGapPattern.test(gap)),
    `Expected gap matching ${expectedGapPattern}; got: ${result.gaps.join("; ")}`
  );
}

test("builder creates a valid Layer 1 Token Efficiency Signal", () => {
  const signal = buildSignal();
  const result = expectValid(signal);

  assert.equal(signal.schema_version, AI_VALUE_TOKEN_EFFICIENCY_SIGNAL_SCHEMA_VERSION);
  assert.equal(signal.playbook_layer, "layer_1_platform_telemetry");
  assert.equal(signal.evidence_lane, "surface_usage");
  assert.equal(signal.coverage_contribution, "layer_1_cost_intensity_overlay");
  assert.equal(signal.full_playbook_coverage_contribution, false);
  assert.equal(result.feeds.layer_1_platform_telemetry, true);
  assert.equal(result.feeds.evidence_snapshot_context, true);
  assert.equal(result.feeds.full_playbook_coverage, false);
  assert.equal(result.feeds.claim_readiness, false);
  assert.equal(result.feeds.customer_facing_financial_output, false);
});

test("Token Efficiency supports only bounded cost/intensity planning uses", () => {
  const signal = buildSignal();
  expectValid(signal);

  for (const use of SUPPORTED_USES) {
    assert.ok(signal.allowed_uses.includes(use), `missing allowed use ${use}`);
  }
  for (const use of REQUIRED_BLOCKED_USES) {
    assert.ok(signal.blocked_uses.includes(use), `missing blocked use ${use}`);
  }
});

test("token usage remains cost/intensity context and not ROI proof", () => {
  const signal = buildSignal();
  expectValid(signal);

  assert.equal(signal.value_proof_policy.token_usage_is_roi_proof, false);
  assert.equal(signal.value_proof_policy.token_usage_is_productivity_proof, false);
  assert.equal(signal.value_proof_policy.token_usage_is_financial_output, false);
  assert.equal(signal.value_proof_policy.token_usage_computes_causality, false);
  assert.equal(signal.value_proof_policy.downstream_claim_strength_upgrade_allowed, false);
});

test("Token Efficiency cannot compute ROI, EBITA, productivity, causality, headcount, or financial impact", () => {
  for (const field of [
    "roi_output",
    "realized_roi",
    "ebita_value",
    "ebita_claim",
    "productivity_output",
    "productivity_claim",
    "causality_claim",
    "headcount_reduction_value",
    "headcount_reduction_claim",
    "financial_impact",
    "customer_facing_financial_output",
    "customer_facing_economic_output"
  ]) {
    const signal = buildSignal();
    signal[field] = "not allowed";
    expectInvalid(signal, new RegExp(`Forbidden field detected: ${field}`));
  }
});

test("raw, person-level, identifier, ranking, and people-decisioning fields fail", () => {
  for (const field of [
    "raw_rows",
    "prompt",
    "response",
    "raw_prompt",
    "raw_response",
    "transcript",
    "query_text",
    "file_contents",
    "user_id",
    "user_ids",
    "employee_id",
    "employee_ids",
    "user_name",
    "person_name",
    "direct_identifier",
    "direct_identifiers",
    "direct_name",
    "direct_names",
    "hashed_person_id",
    "hashed_identifier",
    "joinable_person_identifier",
    "joinable_identifier",
    "person_level_productivity",
    "manager_or_team_ranking",
    "people_decisioning"
  ]) {
    const signal = buildSignal();
    signal[field] = "not allowed";
    expectInvalid(signal, /Forbidden field detected/);
  }
});

test("present token summary requires explicit finite aggregate metrics", () => {
  for (const [field, value] of [
    ["total_prompt_tokens", null],
    ["total_completion_tokens", ""],
    ["total_tokens", Number.NaN],
    ["aggregate_interaction_count", -1],
    ["average_tokens_per_interaction", "not-a-number"]
  ]) {
    const signal = buildSignal();
    signal.aggregate_token_summary[field] = value;
    expectInvalid(
      signal,
      new RegExp(`aggregate_token_summary\\.${field} must be a non-negative number`)
    );
  }
});

test("high intensity workflow share must be a bounded share", () => {
  const signal = buildSignal();
  signal.aggregate_token_summary.high_intensity_workflow_share = 1.25;
  expectInvalid(
    signal,
    /aggregate_token_summary\.high_intensity_workflow_share must be between 0 and 1/
  );
});

test("raw content and direct-name field variants fail", () => {
  for (const field of [
    "raw_query",
    "prompt_text",
    "response_text",
    "llm_response",
    "query",
    "sql_text",
    "raw_prompts",
    "raw_responses",
    "raw_transcripts",
    "userName",
    "personName",
    "employeeName",
    "directPersonIdentifier",
    "managerTeamRanking",
    "person_level_hris",
    "hris_inference"
  ]) {
    const signal = buildSignal();
    signal[field] = "not allowed";
    expectInvalid(signal, /Forbidden field detected/);
  }
});

test("metadata and caveat values cannot smuggle identifiers or raw content", () => {
  const metadataSignal = buildSignal();
  metadataSignal.source_refs.aggregate_probe_id =
    "employee_id=E12345 raw_prompt=example james@example.com";
  expectInvalid(metadataSignal, /Forbidden metadata value/);

  const caveatedSignal = buildSignal();
  caveatedSignal.caveats.push("Do not include user_id=U123 or raw_response snippets.");
  expectInvalid(caveatedSignal, /Forbidden metadata value/);

  const safeWarning = buildSignal();
  safeWarning.caveats.push(
    "ROI, productivity, causality, headcount, and customer-facing financial output remain blocked uses."
  );
  expectValid(safeWarning);
});

test("metadata values cannot smuggle direct-name markers", () => {
  for (const marker of [
    "employee_name",
    "user_name",
    "person_name",
    "direct identifiers",
    "hashed identifiers",
    "joinable identifier",
    "manager/team ranking",
    "raw_query",
    "prompt_text",
    "raw_prompts",
    "raw_responses",
    "raw_transcripts"
  ]) {
    const signal = buildSignal();
    signal.source_refs.aggregate_probe_id = `${marker}=blocked`;
    expectInvalid(signal, /Forbidden metadata value/);
  }
});

test("claim readiness, readout, persistence, and infrastructure drift fields fail", () => {
  for (const field of [
    "claim_readiness",
    "claim_readiness_snapshot",
    "executive_readout",
    "executive_readout_snapshot",
    "readout",
    "readout_output",
    "persistence_policy",
    "persisted",
    "creates_backend_routes",
    "creates_frontend_ui",
    "creates_migrations",
    "creates_ingestion_jobs",
    "ingestion_jobs",
    "backend_routes",
    "frontend_ui",
    "migrations"
  ]) {
    const signal = buildSignal();
    signal[field] = "not allowed";
    expectInvalid(signal, /Forbidden field detected/);
  }
});

test("unsafe privacy flags fail", () => {
  const signal = buildSignal();
  signal.privacy_boundary.contains_direct_identifiers = true;
  expectInvalid(signal, /privacy_boundary\.contains_direct_identifiers must be false/);
});

test("k-min must be met for present token efficiency evidence", () => {
  const signal = buildSignal({
    k_min_posture: {
      minimum_cohort_threshold: 5,
      cohort_threshold_met: false,
      total_slices: 12,
      k_min_clear_slices: 8,
      suppressed_or_unknown_slices: 4
    }
  });
  expectInvalid(signal, /k_min_posture\.cohort_threshold_met must be true/);
});

test("allowed uses cannot include financial, productivity, causal, people, or customer-facing output claims", () => {
  for (const use of [
    "realized_roi",
    "ebita_claim",
    "productivity_claim",
    "causality_claim",
    "headcount_reduction_claim",
    "manager_or_team_ranking",
    "people_decisioning",
    "customer_facing_financial_output"
  ]) {
    const signal = buildSignal();
    signal.allowed_uses.push(use);
    expectInvalid(signal, /allowed_uses contains unsupported use/);
  }
});

test("Token Efficiency cannot upgrade Playbook coverage by itself", () => {
  const signal = buildSignal();
  signal.full_playbook_coverage_contribution = true;
  expectInvalid(signal, /full_playbook_coverage_contribution must be false/);
});

test("examples validate", () => {
  assert.ok(existsSync(`${EXAMPLES}/valid-token-efficiency-signal.json`));
  assert.ok(existsSync(`${EXAMPLES}/held-token-efficiency-signal.json`));
  for (const file of [
    "valid-token-efficiency-signal.json",
    "held-token-efficiency-signal.json"
  ]) {
    const signal = readJson(`${EXAMPLES}/${file}`);
    const result = validateTokenEfficiencySignal(signal);
    assert.equal(result.valid, true, `${file}: ${result.gaps.join("; ")}`);
  }

  const heldResult = validateTokenEfficiencySignal(
    readJson(`${EXAMPLES}/held-token-efficiency-signal.json`)
  );
  assert.equal(heldResult.feeds.layer_1_platform_telemetry, false);
  assert.equal(heldResult.feeds.evidence_snapshot_context, false);
});

test("contract docs and strategy doc exist", () => {
  assert.ok(existsSync("docs/architecture/AI_VALUE_TOKEN_USAGE_STRATEGY.md"));
  assert.ok(existsSync("docs/contracts/ai-value-token-efficiency-signal/README.md"));
});
