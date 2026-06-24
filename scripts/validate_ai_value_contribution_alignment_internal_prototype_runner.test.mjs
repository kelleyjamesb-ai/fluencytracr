import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildContributionAlignmentInternalPrototypeRunnerFromObject,
  contributionAlignmentInternalPrototypeRunnerHash,
  validateContributionAlignmentInternalPrototypeRunner
} from "./run_ai_value_contribution_alignment_internal_prototype_runner.mjs";

const FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";
const PACKET_PATH =
  "docs/contracts/ai-value-research-promotion-readiness-packet/examples/current-controlled-pilot-research-promotion-readiness-packet.json";
const DESIGN_PATH =
  "docs/research/AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_DESIGN.md";
const IMPLEMENTATION_DECISION_PATH =
  "docs/research/AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_PROTOTYPE_RUNNER_IMPLEMENTATION_DECISION.md";

const REQUIRED_MILESTONES = [0, 30, 60, 90, 180, 365];

const FALSE_FEEDS = [
  "research_model_feed",
  "model_output",
  "numeric_weight_output",
  "probability_output",
  "score_like_output",
  "finance_output",
  "finance_context_investigation",
  "customer_facing_output",
  "customer_facing_export",
  "live_connector_execution",
  "route_creation",
  "ui_creation",
  "schema_creation",
  "persistence_write",
  "export_creation"
];

const FORBIDDEN_KEYS = [
  "raw_rows",
  "query_text",
  "sql_text",
  "prompt",
  "transcript",
  "user_id",
  "employee_id",
  "person_id",
  "email",
  "source_package_payload",
  "measurement_cell_payload",
  "confidence_score",
  "contribution_score",
  "probability",
  "roi",
  "ebitda",
  "model_result",
  "finance_result",
  "customer_facing_result",
  "payload_json"
];

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const readText = (path) => readFileSync(path, "utf8");
const clone = (value) => JSON.parse(JSON.stringify(value));

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(
    ([nestedKey, nestedValue]) => nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

test("contribution alignment prototype runner emits compact internal review envelope only", () => {
  const packet = readJson(PACKET_PATH);
  const runner = buildContributionAlignmentInternalPrototypeRunnerFromObject(packet, {
    sourceFixture: readJson(FIXTURE_PATH),
    researchDesignText: readText(DESIGN_PATH),
    implementationDecisionText: readText(IMPLEMENTATION_DECISION_PATH)
  });
  const validation = validateContributionAlignmentInternalPrototypeRunner(runner, {
    sourcePacket: packet,
    sourceFixture: readJson(FIXTURE_PATH),
    researchDesignText: readText(DESIGN_PATH),
    implementationDecisionText: readText(IMPLEMENTATION_DECISION_PATH)
  });
  const serialized = JSON.stringify(runner);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(runner.runner_state, "READY_FOR_INTERNAL_ALIGNMENT_REVIEW");
  assert.equal(
    runner.implementation_decision_ref.decision,
    "PROMOTE_NON_PERSISTENT_INTERNAL_RESEARCH_PROTOTYPE_RUNNER_IMPLEMENTATION__HOLD_MODEL_IMPLEMENTATION"
  );
  assert.equal(typeof runner.implementation_decision_ref.decision_hash, "string");
  assert.equal(runner.review_scope.internal_only, true);
  assert.equal(runner.review_scope.non_persistent, true);
  assert.equal(runner.review_scope.compact_refs_only, true);
  assert.equal(runner.review_scope.model_result_authorized, false);
  assert.equal(runner.review_scope.customer_output_authorized, false);
  assert.equal(runner.design_strength_cap, "METHOD_DESIGN_ONLY");
  assert.equal(runner.packet_ref.research_promotion_packet_id, packet.research_promotion_packet_id);
  assert.equal(runner.packet_ref.packet_integrity_hash, packet.packet_integrity_hash);
  assert.equal(runner.selected_expectation_path_ref.expectation_path_id, packet.expectation_path_id);
  assert.deepEqual(runner.milestone_review.observed_milestones, REQUIRED_MILESTONES);
  assert.equal(runner.context_refs.ai_fluency_construct_context_ref.ref_state, "present");
  assert.equal(runner.context_refs.ai_fluency_psychological_context_ref.ref_state, "context_only");
  assert.equal(runner.context_refs.observed_vbd_context_ref.ref_state, "present");
  assert.equal(runner.context_refs.selected_metric_movement_ref.ref_state, "aligned");
  assert.equal(runner.feeds.internal_alignment_review, true);
  for (const feed of FALSE_FEEDS) {
    assert.equal(runner.feeds[feed], false, `${feed} must remain false`);
  }
  for (const key of FORBIDDEN_KEYS) {
    assert.equal(hasNestedKey(runner, key), false, `${key} must not be emitted`);
  }
  assert.equal(serialized.includes("SELECT"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("confidence_score"), false);
});

test("contribution alignment prototype runner holds when packet source binding drifts", () => {
  const packet = clone(readJson(PACKET_PATH));
  packet.expectation_path_hash = "d".repeat(64);

  const runner = buildContributionAlignmentInternalPrototypeRunnerFromObject(packet, {
    sourceFixture: readJson(FIXTURE_PATH),
    researchDesignText: readText(DESIGN_PATH),
    implementationDecisionText: readText(IMPLEMENTATION_DECISION_PATH)
  });
  const validation = validateContributionAlignmentInternalPrototypeRunner(runner, {
    sourcePacket: packet,
    sourceFixture: readJson(FIXTURE_PATH),
    researchDesignText: readText(DESIGN_PATH),
    implementationDecisionText: readText(IMPLEMENTATION_DECISION_PATH)
  });

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(runner.runner_state, "HOLD_FOR_VALID_RESEARCH_PROMOTION_PACKET");
  assert.equal(runner.feeds.internal_alignment_review, false);
  assert.equal(runner.validation_summary.valid, false);
  assert.ok(
    runner.validation_summary.gaps.some((gap) =>
      gap.includes("research promotion packet must match source-fixture-bound output")
    ),
    runner.validation_summary.gaps.join("; ")
  );
});

test("contribution alignment prototype runner rejects unsafe result and payload smuggling", () => {
  const packet = readJson(PACKET_PATH);
  const runner = buildContributionAlignmentInternalPrototypeRunnerFromObject(packet, {
    sourceFixture: readJson(FIXTURE_PATH),
    researchDesignText: readText(DESIGN_PATH),
    implementationDecisionText: readText(IMPLEMENTATION_DECISION_PATH)
  });
  runner.payload_json = {
    raw_rows: [{ email: "person@example.com" }],
    model_result: { confidence_score: 0.91 },
    query_text: "SELECT user_id FROM raw_rows"
  };

  const validation = validateContributionAlignmentInternalPrototypeRunner(runner, {
    sourcePacket: packet,
    sourceFixture: readJson(FIXTURE_PATH),
    researchDesignText: readText(DESIGN_PATH),
    implementationDecisionText: readText(IMPLEMENTATION_DECISION_PATH)
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("payload_json")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("raw rows") || gap.includes("model")),
    validation.gaps.join("; ")
  );
});

test("contribution alignment prototype runner rejects compact ref tampering after rehash", () => {
  const packet = readJson(PACKET_PATH);
  const runner = buildContributionAlignmentInternalPrototypeRunnerFromObject(packet, {
    sourceFixture: readJson(FIXTURE_PATH),
    researchDesignText: readText(DESIGN_PATH),
    implementationDecisionText: readText(IMPLEMENTATION_DECISION_PATH)
  });
  runner.selected_expectation_path_ref.expectation_path_id = "tampered_path";
  runner.milestone_review.compact_snapshot_refs[0].snapshot_ref = "tampered_snapshot";
  runner.context_refs.selected_metric_movement_ref.metric_id = "tampered_metric";
  runner.runner_hash = contributionAlignmentInternalPrototypeRunnerHash(runner);

  const validation = validateContributionAlignmentInternalPrototypeRunner(runner, {
    sourcePacket: packet,
    sourceFixture: readJson(FIXTURE_PATH),
    researchDesignText: readText(DESIGN_PATH),
    implementationDecisionText: readText(IMPLEMENTATION_DECISION_PATH)
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("runner output must match source-bound expected envelope")),
    validation.gaps.join("; ")
  );
});

test("contribution alignment prototype runner rejects governance-array and posture smuggling", () => {
  const packet = readJson(PACKET_PATH);
  const runner = buildContributionAlignmentInternalPrototypeRunnerFromObject(packet, {
    sourceFixture: readJson(FIXTURE_PATH),
    researchDesignText: readText(DESIGN_PATH),
    implementationDecisionText: readText(IMPLEMENTATION_DECISION_PATH)
  });
  runner.blocked_uses.push("SELECT user_id FROM raw_rows");
  runner.required_caveats.push("prompt and transcript for person@example.com");
  runner.validation_summary.gaps.push("model_result confidence_score is ready");
  runner.feeds.confidence_score = false;
  runner.boundary_policy.raw_rows_payload = false;
  runner.runner_hash = contributionAlignmentInternalPrototypeRunnerHash(runner);

  const validation = validateContributionAlignmentInternalPrototypeRunner(runner, {
    sourcePacket: packet,
    sourceFixture: readJson(FIXTURE_PATH),
    researchDesignText: readText(DESIGN_PATH),
    implementationDecisionText: readText(IMPLEMENTATION_DECISION_PATH)
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("blocked_uses")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("required_caveats")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("validation_summary")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("feeds.confidence_score")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("boundary_policy.raw_rows_payload")),
    validation.gaps.join("; ")
  );
});

test("contribution alignment prototype runner holds when implementation decision text drifts", () => {
  const packet = readJson(PACKET_PATH);
  const runner = buildContributionAlignmentInternalPrototypeRunnerFromObject(packet, {
    sourceFixture: readJson(FIXTURE_PATH),
    researchDesignText: readText(DESIGN_PATH),
    implementationDecisionText: readText(IMPLEMENTATION_DECISION_PATH)
  });

  const validation = validateContributionAlignmentInternalPrototypeRunner(runner, {
    sourcePacket: packet,
    sourceFixture: readJson(FIXTURE_PATH),
    researchDesignText: readText(DESIGN_PATH),
    implementationDecisionText: "Decision: `HOLD_RESEARCH_PROTOTYPE_RUNNER_IMPLEMENTATION`"
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("implementation_decision_ref.decision_hash drifted")),
    validation.gaps.join("; ")
  );
});

test("contribution alignment prototype runner CLI emits compact non-persistent output", () => {
  const output = execFileSync(
    "node",
    [
      "scripts/run_ai_value_contribution_alignment_internal_prototype_runner.mjs",
      PACKET_PATH,
      `--source-fixture=${FIXTURE_PATH}`,
      `--research-design=${DESIGN_PATH}`
    ],
    { encoding: "utf8" }
  );
  const runner = JSON.parse(output);

  assert.equal(runner.runner_state, "READY_FOR_INTERNAL_ALIGNMENT_REVIEW");
  assert.equal(runner.feeds.internal_alignment_review, true);
  assert.equal(runner.feeds.persistence_write, false);
  assert.equal(runner.feeds.model_output, false);
  assert.equal(runner.feeds.customer_facing_output, false);
  assert.equal(output.includes("SELECT"), false);
  assert.equal(output.includes("person@example.com"), false);
});
