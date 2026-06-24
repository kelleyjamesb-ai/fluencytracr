import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildContributionAlignmentInternalPrototypeRunnerFromObject,
  contributionAlignmentInternalPrototypeRunnerHash
} from "./run_ai_value_contribution_alignment_internal_prototype_runner.mjs";
import {
  buildContributionAlignmentRunnerReviewPacketFromObject,
  contributionAlignmentRunnerReviewPacketHash,
  validateContributionAlignmentRunnerReviewPacket
} from "./run_ai_value_contribution_alignment_runner_review_packet.mjs";

const FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";
const PACKET_PATH =
  "docs/contracts/ai-value-research-promotion-readiness-packet/examples/current-controlled-pilot-research-promotion-readiness-packet.json";
const DESIGN_PATH =
  "docs/research/AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_DESIGN.md";
const IMPLEMENTATION_DECISION_PATH =
  "docs/research/AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_PROTOTYPE_RUNNER_IMPLEMENTATION_DECISION.md";

const REQUIRED_FALSE_FEEDS = [
  "research_model_feed",
  "model_implementation",
  "model_output",
  "numeric_weight_output",
  "confidence_output",
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
  "full_runner_payload",
  "payload_json",
  "numeric_weight",
  "confidence_score",
  "contribution_score",
  "probability",
  "roi",
  "ebitda",
  "finance_result"
];

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const readText = (path) => readFileSync(path, "utf8");
const clone = (value) => JSON.parse(JSON.stringify(value));

function buildRunner(overrides = {}) {
  return buildContributionAlignmentInternalPrototypeRunnerFromObject(readJson(PACKET_PATH), {
    sourceFixture: readJson(FIXTURE_PATH),
    researchDesignText: readText(DESIGN_PATH),
    implementationDecisionText: readText(IMPLEMENTATION_DECISION_PATH),
    ...overrides
  });
}

function validationOptions(sourceRunner) {
  return {
    sourceRunner,
    sourcePacket: readJson(PACKET_PATH),
    sourceFixture: readJson(FIXTURE_PATH),
    researchDesignText: readText(DESIGN_PATH),
    implementationDecisionText: readText(IMPLEMENTATION_DECISION_PATH)
  };
}

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(
    ([nestedKey, nestedValue]) => nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

test("contribution alignment runner review packet authorizes only internal model-prototype design drafting", () => {
  const runner = buildRunner();
  const review = buildContributionAlignmentRunnerReviewPacketFromObject(runner, validationOptions(runner));
  const validation = validateContributionAlignmentRunnerReviewPacket(review, validationOptions(runner));
  const serialized = JSON.stringify(review);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(review.review_state, "READY_FOR_INTERNAL_MODEL_PROTOTYPE_DESIGN_REVIEW");
  assert.equal(review.runner_ref.runner_state, "READY_FOR_INTERNAL_ALIGNMENT_REVIEW");
  assert.equal(review.design_authorization.internal_model_prototype_design_drafting, true);
  assert.equal(review.design_authorization.model_implementation, false);
  assert.equal(review.design_authorization.numeric_weights, false);
  assert.equal(review.design_authorization.confidence_output, false);
  assert.equal(review.design_authorization.customer_output, false);
  assert.equal(review.boundary_policy.emits_confidence_output, false);
  assert.equal(review.design_strength_cap, "METHOD_DESIGN_ONLY");
  assert.equal(review.feeds.internal_model_prototype_design_review, true);
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(review.feeds[feed], false, `${feed} must remain false`);
  }
  assert.equal(review.context_separation.ai_fluency_construct_context_ref.ref_state, "present");
  assert.equal(review.context_separation.ai_fluency_psychological_context_ref.ref_state, "context_only");
  assert.equal(review.context_separation.observed_vbd_context_ref.ref_state, "present");
  assert.equal(review.context_separation.selected_metric_movement_ref.ref_state, "aligned");
  assert.deepEqual(review.milestone_review.observed_milestones, [0, 30, 60, 90, 180, 365]);
  for (const key of FORBIDDEN_KEYS) {
    assert.equal(hasNestedKey(review, key), false, `${key} must not be emitted`);
  }
  assert.equal(serialized.includes("SELECT"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("confidence_score"), false);
});

test("contribution alignment runner review packet holds when runner binding drifts", () => {
  const runner = buildRunner();
  runner.selected_expectation_path_ref.expectation_path_id = "tampered_path";
  runner.runner_hash = contributionAlignmentInternalPrototypeRunnerHash(runner);

  const review = buildContributionAlignmentRunnerReviewPacketFromObject(runner, validationOptions(runner));
  const validation = validateContributionAlignmentRunnerReviewPacket(review, validationOptions(runner));

  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, true, validation.gaps.join("; "));
  assert.equal(review.review_state, "HOLD_FOR_VALID_INTERNAL_PROTOTYPE_RUNNER");
  assert.equal(review.feeds.internal_model_prototype_design_review, false);
  assert.equal(review.validation_summary.valid, false);
  assert.ok(
    review.validation_summary.gaps.some((gap) =>
      gap.includes("runner output must match source-bound expected envelope")
    ),
    review.validation_summary.gaps.join("; ")
  );
});

test("contribution alignment runner review packet fails closed on missing source runner", () => {
  const review = buildContributionAlignmentRunnerReviewPacketFromObject(undefined, {
    sourcePacket: readJson(PACKET_PATH),
    sourceFixture: readJson(FIXTURE_PATH),
    researchDesignText: readText(DESIGN_PATH),
    implementationDecisionText: readText(IMPLEMENTATION_DECISION_PATH)
  });
  const validation = validateContributionAlignmentRunnerReviewPacket(review, {
    sourcePacket: readJson(PACKET_PATH),
    sourceFixture: readJson(FIXTURE_PATH),
    researchDesignText: readText(DESIGN_PATH),
    implementationDecisionText: readText(IMPLEMENTATION_DECISION_PATH)
  });

  assert.equal(review.review_state, "HOLD_FOR_VALID_INTERNAL_PROTOTYPE_RUNNER");
  assert.equal(review.feeds.internal_model_prototype_design_review, false);
  assert.equal(review.validation_summary.valid, false);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("sourceRunner is required")),
    validation.gaps.join("; ")
  );
});

test("contribution alignment runner review packet validator fails closed on malformed top-level input", () => {
  const runner = buildRunner();
  const validation = validateContributionAlignmentRunnerReviewPacket(
    undefined,
    validationOptions(runner)
  );

  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("review packet must be an object")),
    validation.gaps.join("; ")
  );
});

test("contribution alignment runner review packet rejects unsafe model, finance, raw, and payload smuggling", () => {
  const runner = buildRunner();
  const review = buildContributionAlignmentRunnerReviewPacketFromObject(runner, validationOptions(runner));
  review.payload_json = {
    raw_rows: [{ email: "person@example.com" }],
    model_result: { confidence_score: 0.88 },
    query_text: "SELECT user_id FROM raw_rows"
  };

  const validation = validateContributionAlignmentRunnerReviewPacket(review, validationOptions(runner));

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("payload_json")),
    validation.gaps.join("; ")
  );
});

test("contribution alignment runner review packet compacts dirty nested runner refs before emitting", () => {
  const runner = buildRunner();
  runner.packet_ref.payload_json = {
    raw_rows: [{ email: "person@example.com" }],
    query_text: "SELECT user_id FROM raw_rows"
  };
  runner.research_design_ref.source_package_payload = {
    prompt: "copy transcript"
  };
  runner.implementation_decision_ref.measurement_cell_payload = {
    confidence_score: 0.91
  };
  runner.runner_hash = contributionAlignmentInternalPrototypeRunnerHash(runner);

  const review = buildContributionAlignmentRunnerReviewPacketFromObject(runner, validationOptions(runner));
  const serialized = JSON.stringify(review);

  assert.equal(review.review_state, "HOLD_FOR_VALID_INTERNAL_PROTOTYPE_RUNNER");
  assert.equal(hasNestedKey(review, "payload_json"), false);
  assert.equal(hasNestedKey(review, "raw_rows"), false);
  assert.equal(hasNestedKey(review, "query_text"), false);
  assert.equal(hasNestedKey(review, "source_package_payload"), false);
  assert.equal(hasNestedKey(review, "measurement_cell_payload"), false);
  assert.equal(hasNestedKey(review, "confidence_score"), false);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("person@example.com"), false);
});

test("contribution alignment runner review packet compacts selected path and snapshot refs before emitting", () => {
  const runner = buildRunner();
  runner.selected_expectation_path_ref.payload_json = {
    raw_rows: [{ email: "person@example.com" }]
  };
  runner.selected_expectation_path_ref.expected_pathway_metadata.source_refs_json = {
    query_text: "SELECT user_id FROM raw_rows"
  };
  runner.milestone_review.compact_snapshot_refs[0].payload_json = {
    prompt: "copy transcript"
  };
  runner.milestone_review.compact_snapshot_refs[0].source_package_payload = {
    confidence_score: 0.91
  };
  runner.runner_hash = contributionAlignmentInternalPrototypeRunnerHash(runner);

  const review = buildContributionAlignmentRunnerReviewPacketFromObject(runner, validationOptions(runner));
  const serialized = JSON.stringify(review);

  assert.equal(review.review_state, "HOLD_FOR_VALID_INTERNAL_PROTOTYPE_RUNNER");
  assert.equal(hasNestedKey(review, "payload_json"), false);
  assert.equal(hasNestedKey(review, "source_refs_json"), false);
  assert.equal(hasNestedKey(review, "source_package_payload"), false);
  assert.equal(hasNestedKey(review, "query_text"), false);
  assert.equal(hasNestedKey(review, "confidence_score"), false);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("person@example.com"), false);
});

test("contribution alignment runner review packet suppresses object and multiline SQL compact-ref smuggling", () => {
  const runner = buildRunner();
  runner.selected_expectation_path_ref.expected_pathway_metadata.metric_id = {
    innocent_key: "selected_metric"
  };
  runner.context_refs.observed_vbd_context_ref.source_ref = {
    innocent_key: "SELECT\nuser_id\nFROM production_event_rows"
  };
  runner.milestone_review.compact_snapshot_refs[0].snapshot_ref = {
    innocent_key: "snapshot_ref"
  };
  runner.runner_hash = contributionAlignmentInternalPrototypeRunnerHash(runner);

  const review = buildContributionAlignmentRunnerReviewPacketFromObject(
    runner,
    validationOptions(runner)
  );
  const serialized = JSON.stringify(review);

  assert.equal(review.review_state, "HOLD_FOR_VALID_INTERNAL_PROTOTYPE_RUNNER");
  assert.equal(serialized.includes("innocent_key"), false);
  assert.equal(serialized.includes("SELECT"), false);
  assert.equal(serialized.includes("production_event_rows"), false);
  assert.equal(review.selected_expectation_path_ref.expected_pathway_metadata.metric_id, null);
  assert.equal(review.context_separation.observed_vbd_context_ref.source_ref, null);
  assert.equal(review.milestone_review.compact_snapshot_refs[0].snapshot_ref, null);
});

test("contribution alignment runner review packet rejects unsafe strings inside allowed fields after rehash", () => {
  const runner = buildRunner();
  const review = buildContributionAlignmentRunnerReviewPacketFromObject(runner, validationOptions(runner));
  review.selected_expectation_path_ref.expected_pathway_metadata.metric_id = "model_result_metric";
  review.milestone_review.compact_snapshot_refs[0].snapshot_ref = "probability_output";
  review.context_separation.observed_vbd_context_ref.source_ref = "prompt_transcript_ref";
  review.context_separation.selected_metric_movement_ref.metric_id = "finance_output_ready";
  review.review_packet_hash = contributionAlignmentRunnerReviewPacketHash(review);

  const validation = validateContributionAlignmentRunnerReviewPacket(review, validationOptions(runner));

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("metric_id")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("snapshot_ref")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("source_ref")),
    validation.gaps.join("; ")
  );
});

test("contribution alignment runner review packet validation gaps do not echo unsafe values", () => {
  const runner = buildRunner();
  const review = buildContributionAlignmentRunnerReviewPacketFromObject(
    runner,
    validationOptions(runner)
  );
  review.blocked_uses = [
    ...review.blocked_uses,
    "SELECT user_id FROM raw_rows WHERE email = person@example.com"
  ];
  review.review_packet_hash = contributionAlignmentRunnerReviewPacketHash(review);

  const validation = validateContributionAlignmentRunnerReviewPacket(
    review,
    validationOptions(runner)
  );
  const serialized = JSON.stringify(validation);

  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("blocked_uses contains ungoverned value")),
    validation.gaps.join("; ")
  );
});

test("contribution alignment runner review packet rejects tampering after rehash", () => {
  const runner = buildRunner();
  const review = buildContributionAlignmentRunnerReviewPacketFromObject(runner, validationOptions(runner));
  review.runner_ref.runner_id = "forged_runner";
  review.context_separation.observed_vbd_context_ref.ref_state = "missing";
  review.review_packet_hash = contributionAlignmentRunnerReviewPacketHash(review);

  const validation = validateContributionAlignmentRunnerReviewPacket(review, validationOptions(runner));

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("review packet must match source-runner-bound expected envelope")),
    validation.gaps.join("; ")
  );
});

test("contribution alignment runner review packet CLI emits compact internal packet", () => {
  const output = execFileSync(
    "node",
    [
      "scripts/run_ai_value_contribution_alignment_runner_review_packet.mjs",
      PACKET_PATH,
      `--source-fixture=${FIXTURE_PATH}`,
      `--research-design=${DESIGN_PATH}`
    ],
    { encoding: "utf8" }
  );
  const review = JSON.parse(output);

  assert.equal(review.review_state, "READY_FOR_INTERNAL_MODEL_PROTOTYPE_DESIGN_REVIEW");
  assert.equal(review.feeds.internal_model_prototype_design_review, true);
  assert.equal(review.feeds.model_output, false);
  assert.equal(review.feeds.persistence_write, false);
  assert.equal(review.feeds.customer_facing_output, false);
  assert.equal(output.includes("SELECT"), false);
  assert.equal(output.includes("person@example.com"), false);
});

test("contribution alignment runner review packet CLI honors approved non-default research design path", () => {
  const tmpDir = mkdtempSync(join(tmpdir(), "ft-runner-review-packet-eq=-"));
  const copiedDesignPath = join(tmpDir, "copied-internal-research-design.md");
  writeFileSync(copiedDesignPath, readText(DESIGN_PATH), "utf8");

  try {
    const output = execFileSync(
      "node",
      [
        "scripts/run_ai_value_contribution_alignment_runner_review_packet.mjs",
        PACKET_PATH,
        `--source-fixture=${FIXTURE_PATH}`,
        `--research-design=${copiedDesignPath}`
      ],
      { encoding: "utf8" }
    );
    const review = JSON.parse(output);

    assert.equal(review.review_state, "READY_FOR_INTERNAL_MODEL_PROTOTYPE_DESIGN_REVIEW");
    assert.equal(review.feeds.internal_model_prototype_design_review, true);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
