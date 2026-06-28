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
  buildContributionAlignmentInternalMethodPrototypeReviewRecordFromObject
} from "./run_ai_value_contribution_alignment_internal_method_prototype_review_record.mjs";
import {
  buildContributionAlignmentResearchMathFinalizationReviewFromObject,
  contributionAlignmentResearchMathFinalizationReviewHash
} from "./run_ai_value_contribution_alignment_research_math_finalization_review.mjs";
import {
  buildContributionAlignmentResearchMathDataModelPromotionDecisionFromObject,
  contributionAlignmentResearchMathDataModelPromotionDecisionHash,
  validateContributionAlignmentResearchMathDataModelPromotionDecision
} from "./run_ai_value_contribution_alignment_research_math_data_model_promotion_decision.mjs";

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
  const sourceFinalizationReview =
    buildContributionAlignmentResearchMathFinalizationReviewFromObject(
      sourceReviewRecord,
      {
        ...options,
        sourceRunner,
        sourceReviewPacket,
        sourceDesignReview,
        sourcePrototype,
        sourcePrototypeReviewPacket,
        sourceGateReview,
        sourceDecision,
        sourceMethodPrototype,
        sourceReviewRecord
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
    sourceReviewRecord,
    sourceFinalizationReview
  };
  if (useCache) {
    cachedReviewRecordChain = clone(chain);
  }
  return chain;
}

function decisionOptions(chain, overrides = {}) {
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
    sourceFinalizationReview: chain.sourceFinalizationReview,
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

test("research math data model promotion decision promotes only a compact internal data model layer", () => {
  const chain = buildReviewRecord();
  const decision =
    buildContributionAlignmentResearchMathDataModelPromotionDecisionFromObject(
      chain.sourceFinalizationReview,
      decisionOptions(chain)
    );
  const validation =
    validateContributionAlignmentResearchMathDataModelPromotionDecision(
      decision,
      decisionOptions(chain)
    );
  const serialized = JSON.stringify(decision);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(decision.decision_state, "PROMOTE_INTERNAL_RESEARCH_MATH_DATA_MODEL_LAYER");
  assert.equal(decision.decision_scope.internal_only, true);
  assert.equal(decision.decision_scope.non_persistent, true);
  assert.equal(decision.decision_scope.compact_refs_only, true);
  assert.equal(decision.decision_scope.decision_only, true);
  assert.equal(decision.decision_scope.internal_research_math_data_model_layer, true);
  assert.equal(decision.data_model_layer_scope.allowed_next_step, "internal_research_math_data_model_layer_only");
  assert.equal(decision.data_model_layer_scope.persists_research_inputs, false);
  assert.equal(decision.data_model_layer_scope.creates_physical_tables, false);
  assert.equal(decision.data_model_layer_scope.emits_numeric_result, false);
  assert.equal(decision.data_model_layer_scope.emits_customer_output, false);
  assert.equal(decision.source_finalization_review_ref.finalization_review_state, "READY_FOR_RESEARCH_MATH_DATA_MODEL_PROMOTION_DECISION");
  assert.equal(decision.context_partition_requirements.ai_fluency_construct_context, "required_distinct_context");
  assert.equal(decision.context_partition_requirements.ai_fluency_psychological_context, "required_distinct_context");
  assert.equal(decision.context_partition_requirements.observed_vbd_context, "required_distinct_context");
  assert.equal(decision.context_partition_requirements.selected_metric_movement_context, "required_distinct_context");
  assert.equal(decision.feeds.internal_research_math_data_model_layer, true);
  for (const feed of FALSE_FEEDS) {
    assert.equal(decision.feeds[feed], false, `${feed} must remain false`);
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
    assert.equal(hasNestedKey(decision, key), false, `${key} must not be emitted`);
  }
  assert.equal(serialized.includes("SELECT"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("confidence_score"), false);
  assert.equal(serialized.includes("coefficient"), false);
  assert.equal(serialized.includes("likelihood"), false);
});

test("research math data model promotion decision does not echo encoded upstream ref payloads", () => {
  const chain = buildReviewRecord();
  const encoded = encodedPayload();
  chain.sourceFinalizationReview.finalization_review_id = encoded;
  chain.sourceFinalizationReview.finalization_review_hash = encoded;
  chain.sourceFinalizationReview.source_review_record_ref.review_record_id = encoded;
  chain.sourceFinalizationReview.source_review_record_ref.review_record_hash = encoded;

  const decision =
    buildContributionAlignmentResearchMathDataModelPromotionDecisionFromObject(
      chain.sourceFinalizationReview,
      decisionOptions(chain)
    );
  const validation =
    validateContributionAlignmentResearchMathDataModelPromotionDecision(
      decision,
      decisionOptions(chain)
    );
  const serializedDecision = JSON.stringify(decision);
  const serializedValidation = JSON.stringify(validation);

  assert.equal(decision.decision_state, "HOLD_FOR_VALID_RESEARCH_MATH_FINALIZATION_REVIEW");
  assert.equal(decision.source_finalization_review_ref.finalization_review_id, null);
  assert.equal(decision.source_finalization_review_ref.finalization_review_hash, null);
  assert.equal(decision.source_finalization_review_ref.source_review_record_id, null);
  assert.equal(decision.source_finalization_review_ref.source_review_record_hash, null);
  assert.equal(serializedDecision.includes(encoded), false);
  assert.equal(serializedValidation.includes(encoded), false);
  assert.equal(serializedDecision.includes("person@example.com"), false);
  assert.equal(serializedValidation.includes("person@example.com"), false);
  assert.equal(validation.valid, false);
});

test("research math data model promotion decision holds on source finalization review drift", () => {
  const chain = buildReviewRecord();
  chain.sourceFinalizationReview.next_step_scope.allowed_next_step =
    "warehouse_ref:customer_value_rollup";
  chain.sourceFinalizationReview.finalization_review_hash =
    contributionAlignmentResearchMathFinalizationReviewHash(chain.sourceFinalizationReview);

  const decision =
    buildContributionAlignmentResearchMathDataModelPromotionDecisionFromObject(
      chain.sourceFinalizationReview,
      decisionOptions(chain)
    );
  const validation =
    validateContributionAlignmentResearchMathDataModelPromotionDecision(
      decision,
      decisionOptions(chain)
    );

  assert.equal(decision.decision_state, "HOLD_FOR_VALID_RESEARCH_MATH_FINALIZATION_REVIEW");
  assert.equal(decision.feeds.internal_research_math_data_model_layer, false);
  assert.equal(decision.source_finalization_review_ref.allowed_next_step, null);
  assert.equal(JSON.stringify(decision).includes("warehouse_ref:customer_value_rollup"), false);
  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, true, validation.gaps.join("; "));
  assert.ok(
    decision.validation_summary.gaps.some((gap) =>
      gap.includes("source_finalization_review")
    ),
    decision.validation_summary.gaps.join("; ")
  );
});

test("research math data model promotion decision fails closed on missing source finalization review", () => {
  const chain = buildReviewRecord();
  const decision =
    buildContributionAlignmentResearchMathDataModelPromotionDecisionFromObject(
      undefined,
      decisionOptions({ ...chain, sourceFinalizationReview: undefined })
    );
  const validation =
    validateContributionAlignmentResearchMathDataModelPromotionDecision(
      decision,
      decisionOptions({ ...chain, sourceFinalizationReview: undefined })
    );

  assert.equal(decision.decision_state, "HOLD_FOR_VALID_RESEARCH_MATH_FINALIZATION_REVIEW");
  assert.equal(decision.feeds.internal_research_math_data_model_layer, false);
  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("sourceFinalizationReview is required")),
    validation.gaps.join("; ")
  );
});

test("research math data model promotion decision holds when only the older review record is supplied", () => {
  const chain = buildReviewRecord();
  const decision =
    buildContributionAlignmentResearchMathDataModelPromotionDecisionFromObject(
      chain.sourceReviewRecord,
      decisionOptions({ ...chain, sourceFinalizationReview: undefined })
    );
  const validation =
    validateContributionAlignmentResearchMathDataModelPromotionDecision(
      decision,
      decisionOptions({ ...chain, sourceFinalizationReview: undefined })
    );

  assert.equal(decision.decision_state, "HOLD_FOR_VALID_RESEARCH_MATH_FINALIZATION_REVIEW");
  assert.equal(decision.feeds.internal_research_math_data_model_layer, false);
  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("sourceFinalizationReview is required")),
    validation.gaps.join("; ")
  );
});

test("research math data model promotion decision rejects payload smuggling", () => {
  const chain = buildReviewRecord();
  const decision =
    buildContributionAlignmentResearchMathDataModelPromotionDecisionFromObject(
      chain.sourceFinalizationReview,
      decisionOptions(chain)
    );
  decision.payload_json = {
    raw_rows: [{ email: "person@example.com" }],
    model_result: { confidence_score: 0.91 },
    query_text: "SELECT user_id FROM raw_rows"
  };

  const validation =
    validateContributionAlignmentResearchMathDataModelPromotionDecision(
      decision,
      decisionOptions(chain)
    );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("forbidden field name")),
    validation.gaps.join("; ")
  );
});

test("research math data model promotion decision rejects safe-looking warehouse and feature-table side doors", () => {
  const chain = buildReviewRecord();
  const decision =
    buildContributionAlignmentResearchMathDataModelPromotionDecisionFromObject(
      chain.sourceFinalizationReview,
      decisionOptions(chain)
    );
  decision.review_basis_ref = "scio_apps.glean.scrubbed_agentspan_20260622";
  decision.data_model_ref = "bquxjob_123";
  decision.source_finalization_review_ref.dry_run_ref = "roles/bigquery.jobUser";
  decision.model_input_shape = {
    table_ref: "sigma.example.com/dashboard/customer-ai-value",
    columns: ["actor_id", "prompt", "confidence_score"]
  };
  decision.decision_hash =
    contributionAlignmentResearchMathDataModelPromotionDecisionHash(decision);

  const validation =
    validateContributionAlignmentResearchMathDataModelPromotionDecision(
      decision,
      decisionOptions(chain)
    );
  const serialized = JSON.stringify(validation);

  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("scio_apps"), false);
  assert.equal(serialized.includes("bquxjob_123"), false);
  assert.equal(serialized.includes("bigquery.jobUser"), false);
  assert.equal(serialized.includes("sigma.example.com"), false);
  assert.equal(serialized.includes("actor_id"), false);
  assert.equal(serialized.includes("prompt"), false);
  assert.equal(serialized.includes("confidence_score"), false);
});

test("research math data model promotion decision rejects math, finance, causality, and productivity synonyms", () => {
  const chain = buildReviewRecord();
  const decision =
    buildContributionAlignmentResearchMathDataModelPromotionDecisionFromObject(
      chain.sourceFinalizationReview,
      decisionOptions(chain)
    );
  decision.method_metadata = {
    component_weight: 0.21,
    posterior: 0.79,
    p_value: 0.04,
    standard_error: 0.1,
    credible_interval: [0.2, 0.5],
    arr_impact: "$42000",
    cost_savings: "fte_reduction",
    payback_months: 7,
    treatment_group: "pilot",
    control_group: "holdout",
    diff_in_diff: "lift",
    time_saved: "productivity_recapture"
  };
  decision.decision_hash =
    contributionAlignmentResearchMathDataModelPromotionDecisionHash(decision);

  const validation =
    validateContributionAlignmentResearchMathDataModelPromotionDecision(
      decision,
      decisionOptions(chain)
    );
  const serialized = JSON.stringify(validation);

  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("component_weight"), false);
  assert.equal(serialized.includes("posterior"), false);
  assert.equal(serialized.includes("p_value"), false);
  assert.equal(serialized.includes("standard_error"), false);
  assert.equal(serialized.includes("arr_impact"), false);
  assert.equal(serialized.includes("$42000"), false);
  assert.equal(serialized.includes("diff_in_diff"), false);
  assert.equal(serialized.includes("time_saved"), false);
});

test("research math data model promotion decision rejects ungoverned false-feed smuggling", () => {
  const chain = buildReviewRecord();
  const decision =
    buildContributionAlignmentResearchMathDataModelPromotionDecisionFromObject(
      chain.sourceFinalizationReview,
      decisionOptions(chain)
    );
  decision.feeds.customer_facing_confidence = false;
  decision.boundary_policy.raw_rows_retained = false;
  decision.decision_hash =
    contributionAlignmentResearchMathDataModelPromotionDecisionHash(decision);

  const validation =
    validateContributionAlignmentResearchMathDataModelPromotionDecision(
      decision,
      decisionOptions(chain)
    );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("feeds contains ungoverned field")),
    validation.gaps.join("; ")
  );
  assert.ok(
    validation.gaps.some((gap) => gap.includes("boundary_policy contains ungoverned field")),
    validation.gaps.join("; ")
  );
});

test("research math data model promotion decision validation output does not echo unsafe values", () => {
  const chain = buildReviewRecord();
  const decision =
    buildContributionAlignmentResearchMathDataModelPromotionDecisionFromObject(
      chain.sourceFinalizationReview,
      decisionOptions(chain)
    );
  decision.decision_id = "SELECT user_id FROM raw_rows WHERE email = person@example.com";
  decision.decision_state = "confidence_output_ready";
  decision["SELECT user_id FROM raw_rows"] = true;
  decision.decision_scope["person@example.com"] = true;
  decision.feeds.raw_rows = true;
  decision.boundary_policy.query_text = true;
  decision.decision_hash =
    contributionAlignmentResearchMathDataModelPromotionDecisionHash(decision);

  const validation =
    validateContributionAlignmentResearchMathDataModelPromotionDecision(
      decision,
      decisionOptions(chain)
    );
  const serialized = JSON.stringify(validation);

  assert.equal(validation.valid, false);
  assert.equal(validation.decision_id, null);
  assert.equal(validation.decision_state, null);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("confidence_output_ready"), false);
  assert.equal(serialized.includes("raw_rows"), false);
  assert.equal(serialized.includes("query_text"), false);
});

test("research math data model promotion decision rejects tampering after rehash", () => {
  const chain = buildReviewRecord();
  const decision =
    buildContributionAlignmentResearchMathDataModelPromotionDecisionFromObject(
      chain.sourceFinalizationReview,
      decisionOptions(chain)
    );
  decision.source_finalization_review_ref.finalization_review_id = "forged_finalization_review";
  decision.data_model_layer_scope.allowed_next_step = "persist_research_math_inputs";
  decision.decision_hash =
    contributionAlignmentResearchMathDataModelPromotionDecisionHash(decision);

  const validation =
    validateContributionAlignmentResearchMathDataModelPromotionDecision(
      decision,
      decisionOptions(chain)
    );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) =>
      gap.includes("research math data model promotion decision must match source-finalization-review-bound expected envelope")
    ),
    validation.gaps.join("; ")
  );
});

test("research math data model promotion decision CLI emits compact promotion gate", () => {
  const output = execFileSync(
    "node",
    [
      "scripts/run_ai_value_contribution_alignment_research_math_data_model_promotion_decision.mjs",
      PACKET_PATH,
      `--source-fixture=${FIXTURE_PATH}`,
      `--research-design=${RESEARCH_DESIGN_PATH}`
    ],
    { encoding: "utf8" }
  );
  const decision = JSON.parse(output);

  assert.equal(decision.decision_state, "PROMOTE_INTERNAL_RESEARCH_MATH_DATA_MODEL_LAYER");
  assert.equal(decision.feeds.internal_research_math_data_model_layer, true);
  assert.equal(decision.feeds.research_model_feed, false);
  assert.equal(decision.feeds.research_math_output, false);
  assert.equal(decision.feeds.model_output, false);
  assert.equal(decision.feeds.confidence_output, false);
  assert.equal(decision.feeds.finance_output, false);
  assert.equal(decision.feeds.customer_facing_output, false);
  assert.equal(output.includes("SELECT"), false);
  assert.equal(output.includes("person@example.com"), false);
});
