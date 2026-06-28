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
  buildContributionAlignmentRunnerReviewPacketFromObject
} from "./run_ai_value_contribution_alignment_runner_review_packet.mjs";
import {
  buildContributionAlignmentModelPrototypeDesignReviewFromObject
} from "./run_ai_value_contribution_alignment_model_prototype_design_review.mjs";
import {
  buildContributionAlignmentInternalModelPrototypeFromObject,
  contributionAlignmentInternalModelPrototypeHash
} from "./run_ai_value_contribution_alignment_internal_model_prototype.mjs";
import {
  buildContributionAlignmentInternalModelPrototypeReviewPacketFromObject,
  contributionAlignmentInternalModelPrototypeReviewPacketHash,
  validateContributionAlignmentInternalModelPrototypeReviewPacket
} from "./run_ai_value_contribution_alignment_internal_model_prototype_review_packet.mjs";

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
  "prototype_payload",
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

function buildSourceRunner(overrides = {}) {
  return buildContributionAlignmentInternalPrototypeRunnerFromObject(readJson(PACKET_PATH), {
    sourceFixture: readJson(FIXTURE_PATH),
    researchDesignText: readText(RESEARCH_DESIGN_PATH),
    implementationDecisionText: readText(RUNNER_IMPLEMENTATION_DECISION_PATH),
    ...overrides
  });
}

function runnerOptions(sourceRunner, overrides = {}) {
  return {
    sourceRunner,
    sourcePacket: readJson(PACKET_PATH),
    sourceFixture: readJson(FIXTURE_PATH),
    researchDesignText: readText(RESEARCH_DESIGN_PATH),
    implementationDecisionText: readText(RUNNER_IMPLEMENTATION_DECISION_PATH),
    ...overrides
  };
}

function buildRunnerReviewPacket(sourceRunner = buildSourceRunner(), overrides = {}) {
  return buildContributionAlignmentRunnerReviewPacketFromObject(
    sourceRunner,
    runnerOptions(sourceRunner, overrides)
  );
}

function buildDesignReview(overrides = {}) {
  const sourceRunner = overrides.sourceRunner ?? buildSourceRunner(overrides.runnerOptions);
  const sourceReviewPacket =
    overrides.sourceReviewPacket ?? buildRunnerReviewPacket(sourceRunner, overrides.runnerOptions);
  const designReview = buildContributionAlignmentModelPrototypeDesignReviewFromObject(
    sourceReviewPacket,
    validationOptions(sourceRunner, sourceReviewPacket, overrides.runnerOptions)
  );
  return { sourceRunner, sourceReviewPacket, designReview };
}

function buildPrototype(overrides = {}) {
  const { sourceRunner, sourceReviewPacket, designReview } = buildDesignReview(overrides);
  const prototype = buildContributionAlignmentInternalModelPrototypeFromObject(
    designReview,
    prototypeOptions(sourceRunner, sourceReviewPacket, designReview, overrides.runnerOptions)
  );
  return { sourceRunner, sourceReviewPacket, designReview, prototype };
}

function validationOptions(sourceRunner, sourceReviewPacket, overrides = {}) {
  return {
    sourceRunner,
    sourceReviewPacket,
    sourcePacket: readJson(PACKET_PATH),
    sourceFixture: readJson(FIXTURE_PATH),
    researchDesignText: readText(RESEARCH_DESIGN_PATH),
    implementationDecisionText: readText(RUNNER_IMPLEMENTATION_DECISION_PATH),
    ...overrides
  };
}

function prototypeOptions(sourceRunner, sourceReviewPacket, sourceDesignReview, overrides = {}) {
  return {
    ...validationOptions(sourceRunner, sourceReviewPacket, overrides),
    sourceDesignReview
  };
}

function reviewPacketOptions(
  sourceRunner,
  sourceReviewPacket,
  sourceDesignReview,
  sourcePrototype,
  overrides = {}
) {
  return {
    ...prototypeOptions(sourceRunner, sourceReviewPacket, sourceDesignReview, overrides),
    sourcePrototype
  };
}

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(
    ([nestedKey, nestedValue]) => nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

test("contribution alignment internal model prototype review packet authorizes only internal research-design gate review", () => {
  const { sourceRunner, sourceReviewPacket, designReview, prototype } = buildPrototype();
  const reviewPacket = buildContributionAlignmentInternalModelPrototypeReviewPacketFromObject(
    prototype,
    reviewPacketOptions(sourceRunner, sourceReviewPacket, designReview, prototype)
  );
  const validation = validateContributionAlignmentInternalModelPrototypeReviewPacket(
    reviewPacket,
    reviewPacketOptions(sourceRunner, sourceReviewPacket, designReview, prototype)
  );
  const serialized = JSON.stringify(reviewPacket);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(reviewPacket.review_state, "READY_FOR_INTERNAL_RESEARCH_DESIGN_GATE_REVIEW");
  assert.equal(reviewPacket.source_prototype_ref.prototype_state, "READY_FOR_INTERNAL_MODEL_PROTOTYPE_RECORD");
  assert.equal(reviewPacket.review_scope.internal_only, true);
  assert.equal(reviewPacket.review_scope.non_persistent, true);
  assert.equal(reviewPacket.review_scope.compact_refs_only, true);
  assert.equal(reviewPacket.review_scope.internal_research_design_gate_review, true);
  assert.equal(reviewPacket.review_scope.research_model_feed, false);
  assert.equal(reviewPacket.review_scope.model_result, false);
  assert.equal(reviewPacket.review_scope.confidence_output, false);
  assert.deepEqual(reviewPacket.component_trace_review.required_components, REQUIRED_COMPONENTS);
  assert.deepEqual(reviewPacket.component_trace_review.observed_components, REQUIRED_COMPONENTS);
  assert.deepEqual(reviewPacket.component_trace_review.missing_components, []);
  assert.ok(
    reviewPacket.component_trace_review.component_refs.every(
      (component) =>
        component.trace_state === "reviewable_contract_ref" &&
        component.emission_state === "not_emitted"
    )
  );
  assert.equal(reviewPacket.context_separation_review.ai_fluency_construct_context_state, "present");
  assert.equal(reviewPacket.context_separation_review.psychological_context_state, "context_only");
  assert.equal(reviewPacket.context_separation_review.observed_vbd_context_state, "present");
  assert.equal(reviewPacket.context_separation_review.selected_metric_movement_state, "aligned");
  assert.equal(reviewPacket.boundary_policy.feeds_research_model, false);
  assert.equal(reviewPacket.boundary_policy.emits_confidence_output, false);
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(reviewPacket.feeds[feed], false, `${feed} must remain false`);
  }
  for (const key of FORBIDDEN_KEYS) {
    assert.equal(hasNestedKey(reviewPacket, key), false, `${key} must not be emitted`);
  }
  assert.equal(serialized.includes("SELECT"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("confidence_score"), false);
  assert.equal(serialized.includes("equation"), false);
  assert.equal(serialized.includes("coefficient"), false);
  assert.equal(serialized.includes("likelihood"), false);
});

test("contribution alignment internal model prototype review packet holds on prototype drift", () => {
  const { sourceRunner, sourceReviewPacket, designReview, prototype } = buildPrototype();
  prototype.component_reviews[0].trace_state = "scored";
  prototype.prototype_hash = contributionAlignmentInternalModelPrototypeHash(prototype);

  const reviewPacket = buildContributionAlignmentInternalModelPrototypeReviewPacketFromObject(
    prototype,
    reviewPacketOptions(sourceRunner, sourceReviewPacket, designReview, prototype)
  );
  const validation = validateContributionAlignmentInternalModelPrototypeReviewPacket(
    reviewPacket,
    reviewPacketOptions(sourceRunner, sourceReviewPacket, designReview, prototype)
  );

  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, true, validation.gaps.join("; "));
  assert.equal(reviewPacket.review_state, "HOLD_FOR_VALID_INTERNAL_MODEL_PROTOTYPE");
  assert.equal(reviewPacket.feeds.internal_research_design_gate_review, false);
  assert.equal(reviewPacket.validation_summary.valid, false);
  assert.ok(
    reviewPacket.validation_summary.gaps.some((gap) =>
      gap.includes("component_reviews must match governed component review trace")
    ),
    reviewPacket.validation_summary.gaps.join("; ")
  );
});

test("contribution alignment internal model prototype review packet fails closed on missing prototype", () => {
  const { sourceRunner, sourceReviewPacket, designReview } = buildPrototype();
  const reviewPacket = buildContributionAlignmentInternalModelPrototypeReviewPacketFromObject(
    undefined,
    reviewPacketOptions(sourceRunner, sourceReviewPacket, designReview, undefined)
  );
  const validation = validateContributionAlignmentInternalModelPrototypeReviewPacket(
    reviewPacket,
    {
      sourceRunner,
      sourceReviewPacket,
      sourceDesignReview: designReview,
      sourcePacket: readJson(PACKET_PATH),
      sourceFixture: readJson(FIXTURE_PATH),
      researchDesignText: readText(RESEARCH_DESIGN_PATH),
      implementationDecisionText: readText(RUNNER_IMPLEMENTATION_DECISION_PATH)
    }
  );

  assert.equal(reviewPacket.review_state, "HOLD_FOR_VALID_INTERNAL_MODEL_PROTOTYPE");
  assert.equal(reviewPacket.feeds.internal_research_design_gate_review, false);
  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("sourcePrototype is required")),
    validation.gaps.join("; ")
  );
});

test("contribution alignment internal model prototype review packet validator fails closed on malformed input", () => {
  const { sourceRunner, sourceReviewPacket, designReview, prototype } = buildPrototype();
  const validation = validateContributionAlignmentInternalModelPrototypeReviewPacket(
    undefined,
    reviewPacketOptions(sourceRunner, sourceReviewPacket, designReview, prototype)
  );

  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("prototype review packet must be an object")),
    validation.gaps.join("; ")
  );
});

test("contribution alignment internal model prototype review packet holds without copying unsafe held-source strings", () => {
  const { sourceRunner, sourceReviewPacket, designReview, prototype } = buildPrototype();
  prototype.selected_path_ref.expected_pathway_metadata.expected_behavior =
    "executive claim: Glean delivered 24 percent cost reduction";
  prototype.context_refs.observed_vbd_context_ref.source_ref =
    "SELECT\nuser_id\nFROM production_event_rows";
  prototype.prototype_hash = contributionAlignmentInternalModelPrototypeHash(prototype);

  const reviewPacket = buildContributionAlignmentInternalModelPrototypeReviewPacketFromObject(
    prototype,
    reviewPacketOptions(sourceRunner, sourceReviewPacket, designReview, prototype)
  );
  const validation = validateContributionAlignmentInternalModelPrototypeReviewPacket(
    reviewPacket,
    reviewPacketOptions(sourceRunner, sourceReviewPacket, designReview, prototype)
  );
  const serialized = JSON.stringify(reviewPacket);

  assert.equal(validation.valid, false);
  assert.equal(reviewPacket.review_state, "HOLD_FOR_VALID_INTERNAL_MODEL_PROTOTYPE");
  assert.equal(serialized.includes("SELECT"), false);
  assert.equal(serialized.includes("production_event_rows"), false);
  assert.equal(serialized.includes("executive claim"), false);
  assert.equal(serialized.includes("cost reduction"), false);
});

test("contribution alignment internal model prototype review packet rejects payload smuggling", () => {
  const { sourceRunner, sourceReviewPacket, designReview, prototype } = buildPrototype();
  const reviewPacket = buildContributionAlignmentInternalModelPrototypeReviewPacketFromObject(
    prototype,
    reviewPacketOptions(sourceRunner, sourceReviewPacket, designReview, prototype)
  );
  reviewPacket.payload_json = {
    raw_rows: [{ email: "person@example.com" }],
    model_result: { confidence_score: 0.92 },
    query_text: "SELECT user_id FROM raw_rows"
  };

  const validation = validateContributionAlignmentInternalModelPrototypeReviewPacket(
    reviewPacket,
    reviewPacketOptions(sourceRunner, sourceReviewPacket, designReview, prototype)
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("forbidden field name")),
    validation.gaps.join("; ")
  );
});

test("contribution alignment internal model prototype review packet validation output does not echo unsafe ids, states, or keys", () => {
  const { sourceRunner, sourceReviewPacket, designReview, prototype } = buildPrototype();
  const reviewPacket = buildContributionAlignmentInternalModelPrototypeReviewPacketFromObject(
    prototype,
    reviewPacketOptions(sourceRunner, sourceReviewPacket, designReview, prototype)
  );
  reviewPacket.review_packet_id = "SELECT user_id FROM raw_rows WHERE email = person@example.com";
  reviewPacket.review_state = "confidence_output_ready";
  reviewPacket["SELECT user_id FROM raw_rows"] = true;
  reviewPacket.review_scope["person@example.com"] = true;
  reviewPacket.feeds["raw_rows"] = true;
  reviewPacket.boundary_policy["query_text"] = true;
  reviewPacket.review_packet_hash =
    contributionAlignmentInternalModelPrototypeReviewPacketHash(reviewPacket);

  const validation = validateContributionAlignmentInternalModelPrototypeReviewPacket(
    reviewPacket,
    reviewPacketOptions(sourceRunner, sourceReviewPacket, designReview, prototype)
  );
  const serialized = JSON.stringify(validation);

  assert.equal(validation.valid, false);
  assert.equal(validation.review_packet_id, null);
  assert.equal(validation.review_state, null);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("confidence_output_ready"), false);
  assert.equal(serialized.includes("raw_rows"), false);
  assert.equal(serialized.includes("query_text"), false);
});

test("contribution alignment internal model prototype review packet validation propagates missing upstream source gaps", () => {
  const { prototype } = buildPrototype();
  const reviewPacket = buildContributionAlignmentInternalModelPrototypeReviewPacketFromObject(
    prototype,
    { sourcePrototype: prototype }
  );
  const validation = validateContributionAlignmentInternalModelPrototypeReviewPacket(
    reviewPacket,
    { sourcePrototype: prototype }
  );

  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("sourceDesignReview is required")),
    validation.gaps.join("; ")
  );
});

test("contribution alignment internal model prototype review packet rejects tampering after rehash", () => {
  const { sourceRunner, sourceReviewPacket, designReview, prototype } = buildPrototype();
  const reviewPacket = buildContributionAlignmentInternalModelPrototypeReviewPacketFromObject(
    prototype,
    reviewPacketOptions(sourceRunner, sourceReviewPacket, designReview, prototype)
  );
  reviewPacket.source_prototype_ref.prototype_id = "forged_prototype";
  reviewPacket.context_separation_review.observed_vbd_context_state = "missing";
  reviewPacket.review_packet_hash =
    contributionAlignmentInternalModelPrototypeReviewPacketHash(reviewPacket);

  const validation = validateContributionAlignmentInternalModelPrototypeReviewPacket(
    reviewPacket,
    reviewPacketOptions(sourceRunner, sourceReviewPacket, designReview, prototype)
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) =>
      gap.includes("prototype review packet must match source-prototype-bound expected envelope")
    ),
    validation.gaps.join("; ")
  );
});

test("contribution alignment internal model prototype review packet CLI emits compact packet", () => {
  const output = execFileSync(
    "node",
    [
      "scripts/run_ai_value_contribution_alignment_internal_model_prototype_review_packet.mjs",
      PACKET_PATH,
      `--source-fixture=${FIXTURE_PATH}`,
      `--research-design=${RESEARCH_DESIGN_PATH}`
    ],
    { encoding: "utf8" }
  );
  const reviewPacket = JSON.parse(output);

  assert.equal(reviewPacket.review_state, "READY_FOR_INTERNAL_RESEARCH_DESIGN_GATE_REVIEW");
  assert.equal(reviewPacket.feeds.internal_research_design_gate_review, true);
  assert.equal(reviewPacket.feeds.research_model_feed, false);
  assert.equal(reviewPacket.feeds.model_output, false);
  assert.equal(reviewPacket.feeds.confidence_output, false);
  assert.equal(reviewPacket.feeds.finance_output, false);
  assert.equal(reviewPacket.feeds.customer_facing_output, false);
  assert.equal(output.includes("SELECT"), false);
  assert.equal(output.includes("person@example.com"), false);
});

test("contribution alignment internal model prototype review packet CLI honors approved non-default research design path", () => {
  const tmpDir = mkdtempSync(join(tmpdir(), "ft-internal-model-prototype-review-eq=-"));
  const copiedDesignPath = join(tmpDir, "copied-internal-research-design.md");
  writeFileSync(copiedDesignPath, readText(RESEARCH_DESIGN_PATH), "utf8");

  try {
    const output = execFileSync(
      "node",
      [
        "scripts/run_ai_value_contribution_alignment_internal_model_prototype_review_packet.mjs",
        PACKET_PATH,
        `--source-fixture=${FIXTURE_PATH}`,
        `--research-design=${copiedDesignPath}`
      ],
      { encoding: "utf8" }
    );
    const reviewPacket = JSON.parse(output);

    assert.equal(reviewPacket.review_state, "READY_FOR_INTERNAL_RESEARCH_DESIGN_GATE_REVIEW");
    assert.equal(reviewPacket.feeds.internal_research_design_gate_review, true);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
