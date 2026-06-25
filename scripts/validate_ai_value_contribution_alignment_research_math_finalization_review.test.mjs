import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
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
  buildContributionAlignmentInternalModelPrototypeFromObject
} from "./run_ai_value_contribution_alignment_internal_model_prototype.mjs";
import {
  buildContributionAlignmentInternalModelPrototypeReviewPacketFromObject
} from "./run_ai_value_contribution_alignment_internal_model_prototype_review_packet.mjs";
import {
  buildContributionAlignmentInternalResearchDesignGateReviewFromObject
} from "./run_ai_value_contribution_alignment_internal_research_design_gate_review.mjs";
import {
  buildContributionAlignmentMethodPrototypeDecisionFromObject
} from "./run_ai_value_contribution_alignment_method_prototype_decision.mjs";
import {
  buildContributionAlignmentSmallInternalMethodPrototypeFromObject
} from "./run_ai_value_contribution_alignment_small_internal_method_prototype.mjs";
import {
  buildContributionAlignmentInternalMethodPrototypeReviewRecordFromObject,
  contributionAlignmentInternalMethodPrototypeReviewRecordHash
} from "./run_ai_value_contribution_alignment_internal_method_prototype_review_record.mjs";
import {
  buildContributionAlignmentResearchMathFinalizationReviewFromObject,
  contributionAlignmentResearchMathFinalizationReviewHash,
  validateContributionAlignmentResearchMathFinalizationReview
} from "./run_ai_value_contribution_alignment_research_math_finalization_review.mjs";

const FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";
const PACKET_PATH =
  "docs/contracts/ai-value-research-promotion-readiness-packet/examples/current-controlled-pilot-research-promotion-readiness-packet.json";
const RESEARCH_DESIGN_PATH =
  "docs/research/AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_DESIGN.md";
const RUNNER_IMPLEMENTATION_DECISION_PATH =
  "docs/research/AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_PROTOTYPE_RUNNER_IMPLEMENTATION_DECISION.md";

const FALSE_FEEDS = [
  "research_model_feed",
  "research_math_output",
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

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const readText = (path) => readFileSync(path, "utf8");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function chainOptions(overrides = {}) {
  return {
    sourcePacket: readJson(PACKET_PATH),
    sourceFixture: readJson(FIXTURE_PATH),
    researchDesignText: readText(RESEARCH_DESIGN_PATH),
    implementationDecisionText: readText(RUNNER_IMPLEMENTATION_DECISION_PATH),
    ...overrides
  };
}

let cachedReviewRecordChain = null;

function buildReviewRecord(overrides = {}) {
  const useCache = Object.keys(overrides).length === 0;
  if (useCache && cachedReviewRecordChain) {
    return clone(cachedReviewRecordChain);
  }
  const options = chainOptions(overrides);
  const sourceRunner = buildContributionAlignmentInternalPrototypeRunnerFromObject(
    options.sourcePacket,
    options
  );
  const sourceReviewPacket = buildContributionAlignmentRunnerReviewPacketFromObject(
    sourceRunner,
    { ...options, sourceRunner }
  );
  const sourceDesignReview = buildContributionAlignmentModelPrototypeDesignReviewFromObject(
    sourceReviewPacket,
    { ...options, sourceRunner, sourceReviewPacket }
  );
  const sourcePrototype = buildContributionAlignmentInternalModelPrototypeFromObject(
    sourceDesignReview,
    { ...options, sourceRunner, sourceReviewPacket, sourceDesignReview }
  );
  const sourcePrototypeReviewPacket =
    buildContributionAlignmentInternalModelPrototypeReviewPacketFromObject(
      sourcePrototype,
      { ...options, sourceRunner, sourceReviewPacket, sourceDesignReview, sourcePrototype }
    );
  const sourceGateReview = buildContributionAlignmentInternalResearchDesignGateReviewFromObject(
    sourcePrototypeReviewPacket,
    {
      ...options,
      sourceRunner,
      sourceReviewPacket,
      sourceDesignReview,
      sourcePrototype,
      sourcePrototypeReviewPacket
    }
  );
  const sourceDecision = buildContributionAlignmentMethodPrototypeDecisionFromObject(
    sourceGateReview,
    {
      ...options,
      sourceRunner,
      sourceReviewPacket,
      sourceDesignReview,
      sourcePrototype,
      sourcePrototypeReviewPacket,
      sourceGateReview
    }
  );
  const sourceMethodPrototype = buildContributionAlignmentSmallInternalMethodPrototypeFromObject(
    sourceDecision,
    {
      ...options,
      sourceRunner,
      sourceReviewPacket,
      sourceDesignReview,
      sourcePrototype,
      sourcePrototypeReviewPacket,
      sourceGateReview,
      sourceDecision
    }
  );
  const sourceReviewRecord =
    buildContributionAlignmentInternalMethodPrototypeReviewRecordFromObject(
      sourceMethodPrototype,
      {
        ...options,
        sourceRunner,
        sourceReviewPacket,
        sourceDesignReview,
        sourcePrototype,
        sourcePrototypeReviewPacket,
        sourceGateReview,
        sourceDecision,
        sourceMethodPrototype
      }
    );
  const chain = {
    options,
    sourceRunner,
    sourceReviewPacket,
    sourceDesignReview,
    sourcePrototype,
    sourcePrototypeReviewPacket,
    sourceGateReview,
    sourceDecision,
    sourceMethodPrototype,
    sourceReviewRecord
  };
  if (useCache) {
    cachedReviewRecordChain = clone(chain);
  }
  return chain;
}

function reviewOptions(chain, overrides = {}) {
  return {
    ...chain.options,
    sourceRunner: chain.sourceRunner,
    sourceReviewPacket: chain.sourceReviewPacket,
    sourceDesignReview: chain.sourceDesignReview,
    sourcePrototype: chain.sourcePrototype,
    sourcePrototypeReviewPacket: chain.sourcePrototypeReviewPacket,
    sourceGateReview: chain.sourceGateReview,
    sourceDecision: chain.sourceDecision,
    sourceMethodPrototype: chain.sourceMethodPrototype,
    sourceReviewRecord: chain.sourceReviewRecord,
    ...overrides
  };
}

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(
    ([nestedKey, nestedValue]) => nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

function encodedPayload() {
  return Buffer.from(JSON.stringify({
    raw_rows: [{ email: "person@example.com" }],
    query_text: "SELECT user_id FROM raw_rows"
  })).toString("base64url");
}

test("research math finalization review authorizes only a later data model promotion decision", () => {
  const chain = buildReviewRecord();
  const review = buildContributionAlignmentResearchMathFinalizationReviewFromObject(
    chain.sourceReviewRecord,
    reviewOptions(chain)
  );
  const validation = validateContributionAlignmentResearchMathFinalizationReview(
    review,
    reviewOptions(chain)
  );
  const serialized = JSON.stringify(review);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(review.finalization_review_state, "READY_FOR_RESEARCH_MATH_DATA_MODEL_PROMOTION_DECISION");
  assert.equal(review.finalization_review_scope.internal_only, true);
  assert.equal(review.finalization_review_scope.non_persistent, true);
  assert.equal(review.finalization_review_scope.compact_refs_only, true);
  assert.equal(review.finalization_review_scope.review_only, true);
  assert.equal(review.finalization_review_scope.data_model_promotion_decision, true);
  assert.equal(review.next_step_scope.allowed_next_step, "research_math_data_model_promotion_decision_only");
  assert.equal(review.next_step_scope.implements_research_math, false);
  assert.equal(review.next_step_scope.emits_numeric_result, false);
  assert.equal(review.next_step_scope.persists_research_inputs, false);
  assert.equal(review.source_review_record_ref.review_record_state, "PROMOTE_EXACT_SCOPE_RESEARCH_MATH_FINALIZATION_REVIEW");
  assert.equal(review.context_separation_requirements.ai_fluency_construct_context, "required_distinct_context");
  assert.equal(review.context_separation_requirements.ai_fluency_psychological_context, "required_distinct_context");
  assert.equal(review.context_separation_requirements.observed_vbd_context, "required_distinct_context");
  assert.equal(review.context_separation_requirements.selected_metric_movement_context, "required_distinct_context");
  assert.equal(review.feeds.research_math_data_model_promotion_decision, true);
  for (const feed of FALSE_FEEDS) {
    assert.equal(review.feeds[feed], false, `${feed} must remain false`);
  }
  for (const key of [
    "raw_rows",
    "query_text",
    "payload_json",
    "numeric_weight",
    "confidence_score",
    "probability",
    "roi",
    "ebitda",
    "finance_result",
    "customer_facing_result"
  ]) {
    assert.equal(hasNestedKey(review, key), false, `${key} must not be emitted`);
  }
  assert.equal(serialized.includes("SELECT"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("confidence_score"), false);
  assert.equal(serialized.includes("coefficient"), false);
});

test("research math finalization review does not echo encoded upstream ref payloads", () => {
  const chain = buildReviewRecord();
  const encoded = encodedPayload();
  chain.sourceReviewRecord.review_record_id = encoded;
  chain.sourceReviewRecord.review_record_hash = encoded;
  chain.sourceReviewRecord.source_method_prototype_ref.prototype_id = encoded;
  chain.sourceReviewRecord.source_method_prototype_ref.prototype_hash = encoded;

  const review = buildContributionAlignmentResearchMathFinalizationReviewFromObject(
    chain.sourceReviewRecord,
    reviewOptions(chain)
  );
  const validation = validateContributionAlignmentResearchMathFinalizationReview(
    review,
    reviewOptions(chain)
  );
  const serializedReview = JSON.stringify(review);
  const serializedValidation = JSON.stringify(validation);

  assert.equal(review.finalization_review_state, "HOLD_FOR_VALID_INTERNAL_METHOD_PROTOTYPE_REVIEW_RECORD");
  assert.equal(review.source_review_record_ref.review_record_id, null);
  assert.equal(review.source_review_record_ref.review_record_hash, null);
  assert.equal(review.source_review_record_ref.source_method_prototype_id, null);
  assert.equal(review.source_review_record_ref.source_method_prototype_hash, null);
  assert.equal(serializedReview.includes(encoded), false);
  assert.equal(serializedValidation.includes(encoded), false);
  assert.equal(serializedReview.includes("person@example.com"), false);
  assert.equal(serializedValidation.includes("person@example.com"), false);
  assert.equal(validation.valid, false);
});

test("research math finalization review holds on source review record drift", () => {
  const chain = buildReviewRecord();
  chain.sourceReviewRecord.finalization_review_scope.allowed_next_step =
    "prod.analytics.customer_ai_value_rollup_v1";
  chain.sourceReviewRecord.review_record_hash =
    contributionAlignmentInternalMethodPrototypeReviewRecordHash(chain.sourceReviewRecord);

  const review = buildContributionAlignmentResearchMathFinalizationReviewFromObject(
    chain.sourceReviewRecord,
    reviewOptions(chain)
  );
  const validation = validateContributionAlignmentResearchMathFinalizationReview(
    review,
    reviewOptions(chain)
  );

  assert.equal(review.finalization_review_state, "HOLD_FOR_VALID_INTERNAL_METHOD_PROTOTYPE_REVIEW_RECORD");
  assert.equal(review.feeds.research_math_data_model_promotion_decision, false);
  assert.equal(review.source_review_record_ref.allowed_next_step, null);
  assert.equal(
    JSON.stringify(review).includes("prod.analytics.customer_ai_value_rollup_v1"),
    false
  );
  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, true, validation.gaps.join("; "));
});

test("research math finalization review fails closed on missing source review record", () => {
  const chain = buildReviewRecord();
  const review = buildContributionAlignmentResearchMathFinalizationReviewFromObject(
    undefined,
    reviewOptions({ ...chain, sourceReviewRecord: undefined })
  );
  const validation = validateContributionAlignmentResearchMathFinalizationReview(
    review,
    reviewOptions({ ...chain, sourceReviewRecord: undefined })
  );

  assert.equal(review.finalization_review_state, "HOLD_FOR_VALID_INTERNAL_METHOD_PROTOTYPE_REVIEW_RECORD");
  assert.equal(review.feeds.research_math_data_model_promotion_decision, false);
  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("sourceReviewRecord is required")),
    validation.gaps.join("; ")
  );
});

test("research math finalization review rejects payload and source-system side doors", () => {
  const chain = buildReviewRecord();
  const review = buildContributionAlignmentResearchMathFinalizationReviewFromObject(
    chain.sourceReviewRecord,
    reviewOptions(chain)
  );
  review.payload_json = {
    raw_rows: [{ email: "person@example.com" }],
    query_text: "SELECT user_id FROM raw_rows",
    model_input_shape: {
      table_ref: "scio_apps.glean.scrubbed_agentspan_20260622",
      columns: ["actor_id", "prompt", "confidence_score"]
    }
  };

  const validation = validateContributionAlignmentResearchMathFinalizationReview(
    review,
    reviewOptions(chain)
  );
  const serialized = JSON.stringify(validation);

  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("scio_apps"), false);
  assert.equal(serialized.includes("actor_id"), false);
  assert.equal(serialized.includes("confidence_score"), false);
});

test("research math finalization review rejects math, finance, causality, and productivity synonyms", () => {
  const chain = buildReviewRecord();
  const review = buildContributionAlignmentResearchMathFinalizationReviewFromObject(
    chain.sourceReviewRecord,
    reviewOptions(chain)
  );
  review.review_basis = {
    component_weight: 0.2,
    posterior: 0.8,
    p_value: 0.01,
    arr_impact: "$42000",
    diff_in_diff: "lift",
    time_saved: "productivity_recapture"
  };
  review.finalization_review_hash =
    contributionAlignmentResearchMathFinalizationReviewHash(review);

  const validation = validateContributionAlignmentResearchMathFinalizationReview(
    review,
    reviewOptions(chain)
  );
  const serialized = JSON.stringify(validation);

  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("component_weight"), false);
  assert.equal(serialized.includes("posterior"), false);
  assert.equal(serialized.includes("arr_impact"), false);
  assert.equal(serialized.includes("diff_in_diff"), false);
  assert.equal(serialized.includes("time_saved"), false);
});

test("research math finalization review validation output does not echo unsafe values", () => {
  const chain = buildReviewRecord();
  const review = buildContributionAlignmentResearchMathFinalizationReviewFromObject(
    chain.sourceReviewRecord,
    reviewOptions(chain)
  );
  review.finalization_review_id = "SELECT user_id FROM raw_rows WHERE email = person@example.com";
  review.finalization_review_state = "confidence_output_ready";
  review["SELECT user_id FROM raw_rows"] = true;
  review.feeds.raw_rows = true;
  review.boundary_policy.query_text = true;
  review.finalization_review_hash =
    contributionAlignmentResearchMathFinalizationReviewHash(review);

  const validation = validateContributionAlignmentResearchMathFinalizationReview(
    review,
    reviewOptions(chain)
  );
  const serialized = JSON.stringify(validation);

  assert.equal(validation.valid, false);
  assert.equal(validation.finalization_review_id, null);
  assert.equal(validation.finalization_review_state, null);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("confidence_output_ready"), false);
  assert.equal(serialized.includes("raw_rows"), false);
  assert.equal(serialized.includes("query_text"), false);
});

test("research math finalization review rejects tampering after rehash", () => {
  const chain = buildReviewRecord();
  const review = buildContributionAlignmentResearchMathFinalizationReviewFromObject(
    chain.sourceReviewRecord,
    reviewOptions(chain)
  );
  review.source_review_record_ref.review_record_id = "forged_review_record";
  review.next_step_scope.allowed_next_step = "promote_customer_confidence_model";
  review.finalization_review_hash =
    contributionAlignmentResearchMathFinalizationReviewHash(review);

  const validation = validateContributionAlignmentResearchMathFinalizationReview(
    review,
    reviewOptions(chain)
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) =>
      gap.includes("research math finalization review must match source-review-record-bound expected envelope")
    ),
    validation.gaps.join("; ")
  );
});

test("research math finalization review CLI emits compact review gate", () => {
  const output = execFileSync(
    "node",
    [
      "scripts/run_ai_value_contribution_alignment_research_math_finalization_review.mjs",
      PACKET_PATH,
      `--source-fixture=${FIXTURE_PATH}`,
      `--research-design=${RESEARCH_DESIGN_PATH}`
    ],
    { encoding: "utf8" }
  );
  const review = JSON.parse(output);

  assert.equal(review.finalization_review_state, "READY_FOR_RESEARCH_MATH_DATA_MODEL_PROMOTION_DECISION");
  assert.equal(review.feeds.research_math_data_model_promotion_decision, true);
  assert.equal(review.feeds.research_model_feed, false);
  assert.equal(review.feeds.research_math_output, false);
  assert.equal(review.feeds.model_output, false);
  assert.equal(review.feeds.confidence_output, false);
  assert.equal(review.feeds.finance_output, false);
  assert.equal(review.feeds.customer_facing_output, false);
  assert.equal(output.includes("SELECT"), false);
  assert.equal(output.includes("person@example.com"), false);
});
