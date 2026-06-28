import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildContributionAlignmentInternalPrototypeRunnerFromObject
} from "./run_ai_value_contribution_alignment_internal_prototype_runner.mjs";
import {
  buildContributionAlignmentRunnerReviewPacketFromObject,
  contributionAlignmentRunnerReviewPacketHash
} from "./run_ai_value_contribution_alignment_runner_review_packet.mjs";
import {
  buildContributionAlignmentModelPrototypeDesignReviewFromObject,
  contributionAlignmentModelPrototypeDesignReviewHash,
  validateContributionAlignmentModelPrototypeDesignReview
} from "./run_ai_value_contribution_alignment_model_prototype_design_review.mjs";

const FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";
const PACKET_PATH =
  "docs/contracts/ai-value-research-promotion-readiness-packet/examples/current-controlled-pilot-research-promotion-readiness-packet.json";
const RESEARCH_DESIGN_PATH =
  "docs/research/AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_DESIGN.md";
const RUNNER_IMPLEMENTATION_DECISION_PATH =
  "docs/research/AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_PROTOTYPE_RUNNER_IMPLEMENTATION_DECISION.md";

const REQUIRED_COMPONENTS = [
  "hypothesis_binding",
  "source_coverage",
  "milestone_continuity",
  "ai_fluency_construct_context_integrity",
  "psychological_context_integrity",
  "observed_vbd_alignment",
  "selected_metric_movement",
  "comparison_design_strength",
  "assumption_governance",
  "boundary_clearance"
];

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
  "payload_json",
  "source_package_payload",
  "runner_payload",
  "measurement_cell_payload",
  "numeric_weight",
  "confidence_score",
  "contribution_score",
  "probability",
  "roi",
  "ebitda",
  "finance_result",
  "customer_facing_result"
];

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const readText = (path) => readFileSync(path, "utf8");

function buildSourceRunner() {
  return buildContributionAlignmentInternalPrototypeRunnerFromObject(readJson(PACKET_PATH), {
    sourceFixture: readJson(FIXTURE_PATH),
    researchDesignText: readText(RESEARCH_DESIGN_PATH),
    implementationDecisionText: readText(RUNNER_IMPLEMENTATION_DECISION_PATH)
  });
}

function runnerOptions(sourceRunner) {
  return {
    sourceRunner,
    sourcePacket: readJson(PACKET_PATH),
    sourceFixture: readJson(FIXTURE_PATH),
    researchDesignText: readText(RESEARCH_DESIGN_PATH),
    implementationDecisionText: readText(RUNNER_IMPLEMENTATION_DECISION_PATH)
  };
}

function buildRunnerReviewPacket(sourceRunner = buildSourceRunner()) {
  return buildContributionAlignmentRunnerReviewPacketFromObject(
    sourceRunner,
    runnerOptions(sourceRunner)
  );
}

function validationOptions(sourceRunner, sourceReviewPacket) {
  return {
    sourceRunner,
    sourceReviewPacket,
    sourcePacket: readJson(PACKET_PATH),
    sourceFixture: readJson(FIXTURE_PATH),
    researchDesignText: readText(RESEARCH_DESIGN_PATH),
    implementationDecisionText: readText(RUNNER_IMPLEMENTATION_DECISION_PATH)
  };
}

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(
    ([nestedKey, nestedValue]) => nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

test("contribution alignment model prototype design review records model frame without model output", () => {
  const sourceRunner = buildSourceRunner();
  const sourceReviewPacket = buildRunnerReviewPacket(sourceRunner);
  const review = buildContributionAlignmentModelPrototypeDesignReviewFromObject(
    sourceReviewPacket,
    validationOptions(sourceRunner, sourceReviewPacket)
  );
  const validation = validateContributionAlignmentModelPrototypeDesignReview(
    review,
    validationOptions(sourceRunner, sourceReviewPacket)
  );
  const serialized = JSON.stringify(review);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(review.review_state, "READY_FOR_INTERNAL_MODEL_PROTOTYPE_DESIGN_RECORD");
  assert.equal(review.source_review_packet_ref.review_state, "READY_FOR_INTERNAL_MODEL_PROTOTYPE_DESIGN_REVIEW");
  assert.equal(review.design_strength_cap, "METHOD_DESIGN_ONLY");
  assert.equal(review.prototype_scope.internal_only, true);
  assert.equal(review.prototype_scope.design_only, true);
  assert.equal(review.prototype_scope.non_persistent, true);
  assert.equal(review.prototype_scope.model_implementation, false);
  assert.equal(review.prototype_scope.numeric_weights, false);
  assert.equal(review.prototype_scope.confidence_output, false);
  assert.equal(review.boundary_policy.emits_confidence_output, false);
  assert.equal(review.model_frame.model_family, "contribution_alignment_research");
  assert.equal(review.model_frame.result_emitted, false);
  assert.equal(review.model_frame.parameterization_authorized, false);
  assert.equal(review.model_frame.research_feed_authorized, false);
  assert.equal(review.model_frame.candidate_equation_frame, undefined);
  assert.equal(
    review.model_frame.candidate_review_checklist_frame,
    "Hard gates clear before descriptive component review; no downstream output is emitted."
  );
  assert.deepEqual(
    review.model_frame.component_definitions.map((component) => component.component_id),
    REQUIRED_COMPONENTS
  );
  assert.deepEqual(review.ai_fluency_model_scope.construct_dimensions, [
    "Confidence",
    "Usage Quality",
    "Behavior Change",
    "Leadership Reinforcement",
    "Capability Growth"
  ]);
  assert.deepEqual(review.ai_fluency_model_scope.psychological_context, [
    "attitude",
    "stated_ai_behavior_orientation",
    "behavioral_intent",
    "perceived_ai_impact"
  ]);
  assert.deepEqual(review.observed_vbd_model_scope.observed_behavior_dimensions, [
    "velocity",
    "breadth",
    "depth"
  ]);
  assert.equal(review.context_separation_rule, "construct_psychological_observed_metric_contexts_must_remain_distinct");
  assert.equal(review.feeds.internal_model_prototype_design_record, true);
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(review.feeds[feed], false, `${feed} must remain false`);
  }
  for (const key of FORBIDDEN_KEYS) {
    assert.equal(hasNestedKey(review, key), false, `${key} must not be emitted`);
  }
  assert.equal(serialized.includes("SELECT"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("confidence_score"), false);
  assert.equal(serialized.includes("f("), false);
  assert.equal(serialized.includes("equation"), false);
  assert.equal(serialized.includes("coefficient"), false);
  assert.equal(serialized.includes("likelihood"), false);
});

test("contribution alignment model prototype design review holds when runner review packet drifts", () => {
  const sourceRunner = buildSourceRunner();
  const sourceReviewPacket = buildRunnerReviewPacket(sourceRunner);
  sourceReviewPacket.selected_expectation_path_ref.expectation_path_id = "tampered_path";
  sourceReviewPacket.review_packet_hash = contributionAlignmentRunnerReviewPacketHash(sourceReviewPacket);

  const review = buildContributionAlignmentModelPrototypeDesignReviewFromObject(
    sourceReviewPacket,
    validationOptions(sourceRunner, sourceReviewPacket)
  );
  const validation = validateContributionAlignmentModelPrototypeDesignReview(
    review,
    validationOptions(sourceRunner, sourceReviewPacket)
  );

  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, true, validation.gaps.join("; "));
  assert.equal(review.review_state, "HOLD_FOR_VALID_RUNNER_REVIEW_PACKET");
  assert.equal(review.feeds.internal_model_prototype_design_record, false);
  assert.equal(review.validation_summary.valid, false);
  assert.ok(
    review.validation_summary.gaps.some((gap) =>
      gap.includes("review packet must match source-runner-bound expected envelope")
    ),
    review.validation_summary.gaps.join("; ")
  );
});

test("contribution alignment model prototype design review fails closed on missing source review packet", () => {
  const review = buildContributionAlignmentModelPrototypeDesignReviewFromObject(
    undefined,
    {
      sourceRunner: buildSourceRunner(),
      sourcePacket: readJson(PACKET_PATH),
      sourceFixture: readJson(FIXTURE_PATH),
      researchDesignText: readText(RESEARCH_DESIGN_PATH),
      implementationDecisionText: readText(RUNNER_IMPLEMENTATION_DECISION_PATH)
    }
  );
  const validation = validateContributionAlignmentModelPrototypeDesignReview(review, {
    sourceRunner: buildSourceRunner(),
    sourcePacket: readJson(PACKET_PATH),
    sourceFixture: readJson(FIXTURE_PATH),
    researchDesignText: readText(RESEARCH_DESIGN_PATH),
    implementationDecisionText: readText(RUNNER_IMPLEMENTATION_DECISION_PATH)
  });

  assert.equal(review.review_state, "HOLD_FOR_VALID_RUNNER_REVIEW_PACKET");
  assert.equal(review.feeds.internal_model_prototype_design_record, false);
  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("sourceReviewPacket is required")),
    validation.gaps.join("; ")
  );
});

test("contribution alignment model prototype design review validator fails closed on malformed top-level input", () => {
  const sourceRunner = buildSourceRunner();
  const sourceReviewPacket = buildRunnerReviewPacket(sourceRunner);
  const validation = validateContributionAlignmentModelPrototypeDesignReview(
    undefined,
    validationOptions(sourceRunner, sourceReviewPacket)
  );

  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("design review must be an object")),
    validation.gaps.join("; ")
  );
});

test("contribution alignment model prototype design review holds without copying unsafe held-source strings", () => {
  const sourceRunner = buildSourceRunner();
  const sourceReviewPacket = buildRunnerReviewPacket(sourceRunner);
  sourceReviewPacket.selected_expectation_path_ref.expected_pathway_metadata.expected_behavior =
    "executive claim: Glean delivered 24 percent cost reduction";
  sourceReviewPacket.context_separation.observed_vbd_context_ref.source_ref =
    "SELECT\nuser_id\nFROM production_event_rows";
  sourceReviewPacket.review_packet_hash = contributionAlignmentRunnerReviewPacketHash(sourceReviewPacket);

  const review = buildContributionAlignmentModelPrototypeDesignReviewFromObject(
    sourceReviewPacket,
    validationOptions(sourceRunner, sourceReviewPacket)
  );
  const validation = validateContributionAlignmentModelPrototypeDesignReview(
    review,
    validationOptions(sourceRunner, sourceReviewPacket)
  );
  const serialized = JSON.stringify(review);

  assert.equal(validation.valid, false);
  assert.equal(review.review_state, "HOLD_FOR_VALID_RUNNER_REVIEW_PACKET");
  assert.equal(serialized.includes("SELECT"), false);
  assert.equal(serialized.includes("production_event_rows"), false);
  assert.equal(serialized.includes("executive claim"), false);
  assert.equal(serialized.includes("cost reduction"), false);
});

test("contribution alignment model prototype design review compacts dirty runner review refs before emitting", () => {
  const sourceRunner = buildSourceRunner();
  const sourceReviewPacket = buildRunnerReviewPacket(sourceRunner);
  sourceReviewPacket.selected_expectation_path_ref.payload_json = {
    raw_rows: [{ email: "person@example.com" }]
  };
  sourceReviewPacket.milestone_review.compact_snapshot_refs[0].source_package_payload = {
    query_text: "SELECT user_id FROM raw_rows"
  };
  sourceReviewPacket.context_separation.observed_vbd_context_ref.measurement_cell_payload = {
    confidence_score: 0.81
  };
  sourceReviewPacket.review_packet_hash = contributionAlignmentRunnerReviewPacketHash(sourceReviewPacket);

  const review = buildContributionAlignmentModelPrototypeDesignReviewFromObject(
    sourceReviewPacket,
    validationOptions(sourceRunner, sourceReviewPacket)
  );
  const serialized = JSON.stringify(review);

  assert.equal(review.review_state, "HOLD_FOR_VALID_RUNNER_REVIEW_PACKET");
  assert.equal(hasNestedKey(review, "payload_json"), false);
  assert.equal(hasNestedKey(review, "raw_rows"), false);
  assert.equal(hasNestedKey(review, "source_package_payload"), false);
  assert.equal(hasNestedKey(review, "measurement_cell_payload"), false);
  assert.equal(hasNestedKey(review, "query_text"), false);
  assert.equal(hasNestedKey(review, "confidence_score"), false);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("person@example.com"), false);
});

test("contribution alignment model prototype design review rejects unsafe output and payload smuggling", () => {
  const sourceRunner = buildSourceRunner();
  const sourceReviewPacket = buildRunnerReviewPacket(sourceRunner);
  const review = buildContributionAlignmentModelPrototypeDesignReviewFromObject(
    sourceReviewPacket,
    validationOptions(sourceRunner, sourceReviewPacket)
  );
  review.payload_json = {
    raw_rows: [{ email: "person@example.com" }],
    model_result: { confidence_score: 0.91 },
    query_text: "SELECT user_id FROM raw_rows"
  };

  const validation = validateContributionAlignmentModelPrototypeDesignReview(
    review,
    validationOptions(sourceRunner, sourceReviewPacket)
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("payload_json")),
    validation.gaps.join("; ")
  );
});

test("contribution alignment model prototype design review rejects unsafe allowed-field values after rehash", () => {
  const sourceRunner = buildSourceRunner();
  const sourceReviewPacket = buildRunnerReviewPacket(sourceRunner);
  const review = buildContributionAlignmentModelPrototypeDesignReviewFromObject(
    sourceReviewPacket,
    validationOptions(sourceRunner, sourceReviewPacket)
  );
  review.model_frame.component_definitions[0].component_id = "probability_output";
  review.selected_path_model_ref.expected_pathway_metadata.metric_id = "model_result_metric";
  review.context_refs.observed_vbd_context_ref.source_ref = "prompt_transcript_ref";
  review.design_review_hash = contributionAlignmentModelPrototypeDesignReviewHash(review);

  const validation = validateContributionAlignmentModelPrototypeDesignReview(
    review,
    validationOptions(sourceRunner, sourceReviewPacket)
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("component_id")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("metric_id")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("source_ref")),
    validation.gaps.join("; ")
  );
});

test("contribution alignment model prototype design review rejects component definition tampering after rehash", () => {
  const sourceRunner = buildSourceRunner();
  const sourceReviewPacket = buildRunnerReviewPacket(sourceRunner);
  const review = buildContributionAlignmentModelPrototypeDesignReviewFromObject(
    sourceReviewPacket,
    validationOptions(sourceRunner, sourceReviewPacket)
  );
  review.model_frame.component_definitions[0].role = "alternate_review_role";
  review.model_frame.component_definitions[1].input_ref = "alternate_source_ref";
  review.design_review_hash = contributionAlignmentModelPrototypeDesignReviewHash(review);

  const validation = validateContributionAlignmentModelPrototypeDesignReview(
    review,
    validationOptions(sourceRunner, sourceReviewPacket)
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) =>
      gap.includes("model_frame.component_definitions must match governed component definitions")
    ),
    validation.gaps.join("; ")
  );
});

test("contribution alignment model prototype design review validation gaps do not echo unsafe values", () => {
  const sourceRunner = buildSourceRunner();
  const sourceReviewPacket = buildRunnerReviewPacket(sourceRunner);
  const review = buildContributionAlignmentModelPrototypeDesignReviewFromObject(
    sourceReviewPacket,
    validationOptions(sourceRunner, sourceReviewPacket)
  );
  review.blocked_uses = [
    ...review.blocked_uses,
    "SELECT user_id FROM raw_rows WHERE email = person@example.com"
  ];
  review.design_review_hash = contributionAlignmentModelPrototypeDesignReviewHash(review);

  const validation = validateContributionAlignmentModelPrototypeDesignReview(
    review,
    validationOptions(sourceRunner, sourceReviewPacket)
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

test("contribution alignment model prototype design review rejects malformed component definitions without throwing", () => {
  const sourceRunner = buildSourceRunner();
  const sourceReviewPacket = buildRunnerReviewPacket(sourceRunner);
  const review = buildContributionAlignmentModelPrototypeDesignReviewFromObject(
    sourceReviewPacket,
    validationOptions(sourceRunner, sourceReviewPacket)
  );
  review.model_frame.component_definitions = {};
  review.design_review_hash = contributionAlignmentModelPrototypeDesignReviewHash(review);

  const validation = validateContributionAlignmentModelPrototypeDesignReview(
    review,
    validationOptions(sourceRunner, sourceReviewPacket)
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) =>
      gap.includes("model_frame.component_definitions must be an array")
    ),
    validation.gaps.join("; ")
  );
});

test("contribution alignment model prototype design review rejects tampering after rehash", () => {
  const sourceRunner = buildSourceRunner();
  const sourceReviewPacket = buildRunnerReviewPacket(sourceRunner);
  const review = buildContributionAlignmentModelPrototypeDesignReviewFromObject(
    sourceReviewPacket,
    validationOptions(sourceRunner, sourceReviewPacket)
  );
  review.source_review_packet_ref.review_packet_id = "forged_review_packet";
  review.context_refs.observed_vbd_context_ref.ref_state = "missing";
  review.design_review_hash = contributionAlignmentModelPrototypeDesignReviewHash(review);

  const validation = validateContributionAlignmentModelPrototypeDesignReview(
    review,
    validationOptions(sourceRunner, sourceReviewPacket)
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("design review must match source-review-packet-bound expected envelope")),
    validation.gaps.join("; ")
  );
});

test("contribution alignment model prototype design review CLI emits compact design record", () => {
  const output = execFileSync(
    "node",
    [
      "scripts/run_ai_value_contribution_alignment_model_prototype_design_review.mjs",
      PACKET_PATH,
      `--source-fixture=${FIXTURE_PATH}`,
      `--research-design=${RESEARCH_DESIGN_PATH}`
    ],
    { encoding: "utf8" }
  );
  const review = JSON.parse(output);

  assert.equal(review.review_state, "READY_FOR_INTERNAL_MODEL_PROTOTYPE_DESIGN_RECORD");
  assert.equal(review.feeds.internal_model_prototype_design_record, true);
  assert.equal(review.feeds.model_output, false);
  assert.equal(review.feeds.probability_output, false);
  assert.equal(review.feeds.finance_output, false);
  assert.equal(review.feeds.customer_facing_output, false);
  assert.equal(output.includes("SELECT"), false);
  assert.equal(output.includes("person@example.com"), false);
});

test("contribution alignment model prototype design review CLI honors approved non-default research design path", () => {
  const tmpDir = mkdtempSync(join(tmpdir(), "ft-model-design-review-eq=-"));
  const copiedDesignPath = join(tmpDir, "copied-internal-research-design.md");
  writeFileSync(copiedDesignPath, readText(RESEARCH_DESIGN_PATH), "utf8");

  try {
    const output = execFileSync(
      "node",
      [
        "scripts/run_ai_value_contribution_alignment_model_prototype_design_review.mjs",
        PACKET_PATH,
        `--source-fixture=${FIXTURE_PATH}`,
        `--research-design=${copiedDesignPath}`
      ],
      { encoding: "utf8" }
    );
    const review = JSON.parse(output);

    assert.equal(review.review_state, "READY_FOR_INTERNAL_MODEL_PROTOTYPE_DESIGN_RECORD");
    assert.equal(review.feeds.internal_model_prototype_design_record, true);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
