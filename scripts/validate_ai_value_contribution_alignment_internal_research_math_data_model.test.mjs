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
  buildContributionAlignmentResearchMathFinalizationReviewFromObject
} from "./run_ai_value_contribution_alignment_research_math_finalization_review.mjs";
import {
  buildContributionAlignmentResearchMathDataModelPromotionDecisionFromObject,
  contributionAlignmentResearchMathDataModelPromotionDecisionHash
} from "./run_ai_value_contribution_alignment_research_math_data_model_promotion_decision.mjs";
import {
  buildContributionAlignmentInternalResearchMathDataModelFromObject,
  contributionAlignmentInternalResearchMathDataModelHash,
  validateContributionAlignmentInternalResearchMathDataModel
} from "./run_ai_value_contribution_alignment_internal_research_math_data_model.mjs";

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

let cachedPromotionDecisionChain = null;

function buildPromotionDecision(overrides = {}) {
  const useCache = Object.keys(overrides).length === 0;
  if (useCache && cachedPromotionDecisionChain) {
    return clone(cachedPromotionDecisionChain);
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
  const sourcePromotionDecision =
    buildContributionAlignmentResearchMathDataModelPromotionDecisionFromObject(
      sourceFinalizationReview,
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
        sourceReviewRecord,
        sourceFinalizationReview
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
    sourceFinalizationReview,
    sourcePromotionDecision
  };
  if (useCache) {
    cachedPromotionDecisionChain = clone(chain);
  }
  return chain;
}

function modelOptions(chain, overrides = {}) {
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
    sourcePromotionDecision: chain.sourcePromotionDecision,
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

test("internal research math data model emits compact context grain without results", () => {
  const chain = buildPromotionDecision();
  const dataModel =
    buildContributionAlignmentInternalResearchMathDataModelFromObject(
      chain.sourcePromotionDecision,
      modelOptions(chain)
    );
  const validation = validateContributionAlignmentInternalResearchMathDataModel(
    dataModel,
    modelOptions(chain)
  );
  const serialized = JSON.stringify(dataModel);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(dataModel.data_model_state, "READY_FOR_INTERNAL_RESEARCH_MATH_FINALIZATION_DESIGN");
  assert.equal(dataModel.data_model_scope.internal_only, true);
  assert.equal(dataModel.data_model_scope.non_persistent, true);
  assert.equal(dataModel.data_model_scope.compact_refs_only, true);
  assert.equal(dataModel.data_model_scope.model_result, false);
  assert.equal(dataModel.data_model_scope.numeric_weights, false);
  assert.equal(dataModel.data_model_scope.persistence_write, false);
  assert.equal(dataModel.data_model_scope.customer_output, false);
  assert.equal(dataModel.source_promotion_decision_ref.decision_state, "PROMOTE_INTERNAL_RESEARCH_MATH_DATA_MODEL_LAYER");
  assert.equal(dataModel.model_grain.approved_hypothesis_path, "one_selected_approved_expectation_path_ref");
  assert.equal(dataModel.model_grain.measurement_context, "one_source_bound_measurement_context_ref");
  assert.equal(dataModel.model_grain.milestone_evidence, "day_0_30_60_90_180_365_compact_refs");
  assert.equal(
    dataModel.model_grain.repeated_window_requirement,
    "required_before_later_separately_approved_customer_facing_promotion_review"
  );
  assert.deepEqual(
    dataModel.component_registry.map((component) => component.component_id),
    REQUIRED_COMPONENTS
  );
  assert.deepEqual(dataModel.context_partitions.ai_fluency_construct_context.construct_dimensions, [
    "Confidence",
    "Usage Quality",
    "Behavior Change",
    "Leadership Reinforcement",
    "Capability Growth"
  ]);
  assert.deepEqual(dataModel.context_partitions.ai_fluency_psychological_context.instrument_items, [
    "ai_attitude",
    "ai_behavior_toward_ai",
    "behavioral_intent"
  ]);
  assert.equal(dataModel.context_partitions.observed_vbd_context.context_role, "observed_work_behavior_context_only");
  assert.equal(dataModel.context_partitions.selected_metric_movement_context.context_role, "customer_owned_metric_movement_context_only");
  assert.equal(dataModel.research_design_boundary.allowed_method_family_metadata, "separate_future_design_only");
  assert.equal(dataModel.feeds.internal_research_math_finalization_design, true);
  for (const feed of FALSE_FEEDS) {
    assert.equal(dataModel.feeds[feed], false, `${feed} must remain false`);
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
    assert.equal(hasNestedKey(dataModel, key), false, `${key} must not be emitted`);
  }
  assert.equal(serialized.includes("SELECT"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("confidence_score"), false);
  assert.equal(serialized.includes("coefficient"), false);
  assert.equal(serialized.includes("likelihood"), false);
});

test("internal research math data model does not echo encoded upstream ref payloads", () => {
  const chain = buildPromotionDecision();
  const encoded = encodedPayload();
  chain.sourcePromotionDecision.decision_id = encoded;
  chain.sourcePromotionDecision.decision_hash = encoded;
  chain.sourcePromotionDecision.source_finalization_review_ref.finalization_review_id =
    encoded;
  chain.sourcePromotionDecision.source_finalization_review_ref.finalization_review_hash =
    encoded;

  const dataModel =
    buildContributionAlignmentInternalResearchMathDataModelFromObject(
      chain.sourcePromotionDecision,
      modelOptions(chain)
    );
  const validation = validateContributionAlignmentInternalResearchMathDataModel(
    dataModel,
    modelOptions(chain)
  );
  const serializedDataModel = JSON.stringify(dataModel);
  const serializedValidation = JSON.stringify(validation);

  assert.equal(dataModel.data_model_state, "HOLD_FOR_VALID_RESEARCH_MATH_DATA_MODEL_PROMOTION_DECISION");
  assert.equal(dataModel.source_promotion_decision_ref.decision_id, null);
  assert.equal(dataModel.source_promotion_decision_ref.decision_hash, null);
  assert.equal(dataModel.source_promotion_decision_ref.source_finalization_review_id, null);
  assert.equal(dataModel.source_promotion_decision_ref.source_finalization_review_hash, null);
  assert.equal(serializedDataModel.includes(encoded), false);
  assert.equal(serializedValidation.includes(encoded), false);
  assert.equal(serializedDataModel.includes("person@example.com"), false);
  assert.equal(serializedValidation.includes("person@example.com"), false);
  assert.equal(validation.valid, false);
});

test("internal research math data model holds on promotion decision drift", () => {
  const chain = buildPromotionDecision();
  chain.sourcePromotionDecision.data_model_layer_scope.allowed_next_step =
    "dashboard_slug_customer_value";
  chain.sourcePromotionDecision.decision_hash =
    contributionAlignmentResearchMathDataModelPromotionDecisionHash(
      chain.sourcePromotionDecision
    );

  const dataModel =
    buildContributionAlignmentInternalResearchMathDataModelFromObject(
      chain.sourcePromotionDecision,
      modelOptions(chain)
    );
  const validation = validateContributionAlignmentInternalResearchMathDataModel(
    dataModel,
    modelOptions(chain)
  );

  assert.equal(dataModel.data_model_state, "HOLD_FOR_VALID_RESEARCH_MATH_DATA_MODEL_PROMOTION_DECISION");
  assert.equal(dataModel.feeds.internal_research_math_finalization_design, false);
  assert.equal(dataModel.source_promotion_decision_ref.allowed_next_step, null);
  assert.equal(JSON.stringify(dataModel).includes("dashboard_slug_customer_value"), false);
  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, true, validation.gaps.join("; "));
  assert.ok(
    dataModel.validation_summary.gaps.some((gap) =>
      gap.includes("source_promotion_decision")
    ),
    dataModel.validation_summary.gaps.join("; ")
  );
});

test("internal research math data model fails closed on missing promotion decision", () => {
  const chain = buildPromotionDecision();
  const dataModel =
    buildContributionAlignmentInternalResearchMathDataModelFromObject(
      undefined,
      modelOptions({ ...chain, sourcePromotionDecision: undefined })
    );
  const validation = validateContributionAlignmentInternalResearchMathDataModel(
    dataModel,
    modelOptions({ ...chain, sourcePromotionDecision: undefined })
  );

  assert.equal(dataModel.data_model_state, "HOLD_FOR_VALID_RESEARCH_MATH_DATA_MODEL_PROMOTION_DECISION");
  assert.equal(dataModel.feeds.internal_research_math_finalization_design, false);
  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("sourcePromotionDecision is required")),
    validation.gaps.join("; ")
  );
});

test("internal research math data model rejects payload and feature-table smuggling", () => {
  const chain = buildPromotionDecision();
  const dataModel =
    buildContributionAlignmentInternalResearchMathDataModelFromObject(
      chain.sourcePromotionDecision,
      modelOptions(chain)
    );
  dataModel.payload_json = {
    raw_rows: [{ email: "person@example.com" }],
    model_input_shape: {
      table_ref: "scio_apps.glean.scrubbed_agentspan_20260622",
      columns: ["actor_id", "prompt", "confidence_score"]
    },
    query_text: "SELECT user_id FROM raw_rows"
  };

  const validation = validateContributionAlignmentInternalResearchMathDataModel(
    dataModel,
    modelOptions(chain)
  );
  const serialized = JSON.stringify(validation);

  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("scio_apps"), false);
  assert.equal(serialized.includes("actor_id"), false);
  assert.equal(serialized.includes("confidence_score"), false);
});

test("internal research math data model rejects result-like math and finance fields after rehash", () => {
  const chain = buildPromotionDecision();
  const dataModel =
    buildContributionAlignmentInternalResearchMathDataModelFromObject(
      chain.sourcePromotionDecision,
      modelOptions(chain)
    );
  dataModel.research_design_boundary.component_weight = 0.2;
  dataModel.research_design_boundary.posterior = 0.8;
  dataModel.research_design_boundary.p_value = 0.01;
  dataModel.research_design_boundary.arr_impact = "$42000";
  dataModel.research_design_boundary.diff_in_diff = "lift";
  dataModel.research_design_boundary.time_saved = "productivity_recapture";
  dataModel.data_model_hash =
    contributionAlignmentInternalResearchMathDataModelHash(dataModel);

  const validation = validateContributionAlignmentInternalResearchMathDataModel(
    dataModel,
    modelOptions(chain)
  );
  const serialized = JSON.stringify(validation);

  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("component_weight"), false);
  assert.equal(serialized.includes("posterior"), false);
  assert.equal(serialized.includes("p_value"), false);
  assert.equal(serialized.includes("arr_impact"), false);
  assert.equal(serialized.includes("$42000"), false);
  assert.equal(serialized.includes("diff_in_diff"), false);
  assert.equal(serialized.includes("time_saved"), false);
});

test("internal research math data model validation output does not echo unsafe values", () => {
  const chain = buildPromotionDecision();
  const dataModel =
    buildContributionAlignmentInternalResearchMathDataModelFromObject(
      chain.sourcePromotionDecision,
      modelOptions(chain)
    );
  dataModel.data_model_id = "SELECT user_id FROM raw_rows WHERE email = person@example.com";
  dataModel.data_model_state = "confidence_output_ready";
  dataModel["SELECT user_id FROM raw_rows"] = true;
  dataModel.data_model_scope["person@example.com"] = true;
  dataModel.feeds.raw_rows = true;
  dataModel.boundary_policy.query_text = true;
  dataModel.data_model_hash =
    contributionAlignmentInternalResearchMathDataModelHash(dataModel);

  const validation = validateContributionAlignmentInternalResearchMathDataModel(
    dataModel,
    modelOptions(chain)
  );
  const serialized = JSON.stringify(validation);

  assert.equal(validation.valid, false);
  assert.equal(validation.data_model_id, null);
  assert.equal(validation.data_model_state, null);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("confidence_output_ready"), false);
  assert.equal(serialized.includes("raw_rows"), false);
  assert.equal(serialized.includes("query_text"), false);
});

test("internal research math data model rejects tampering after rehash", () => {
  const chain = buildPromotionDecision();
  const dataModel =
    buildContributionAlignmentInternalResearchMathDataModelFromObject(
      chain.sourcePromotionDecision,
      modelOptions(chain)
    );
  dataModel.source_promotion_decision_ref.decision_id = "forged_decision";
  dataModel.model_grain.repeated_window_requirement = "optional_before_customer_output";
  dataModel.data_model_hash =
    contributionAlignmentInternalResearchMathDataModelHash(dataModel);

  const validation = validateContributionAlignmentInternalResearchMathDataModel(
    dataModel,
    modelOptions(chain)
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) =>
      gap.includes("internal research math data model must match source-decision-bound expected envelope")
    ),
    validation.gaps.join("; ")
  );
});

test("internal research math data model CLI emits compact internal model boundary", () => {
  const output = execFileSync(
    "node",
    [
      "scripts/run_ai_value_contribution_alignment_internal_research_math_data_model.mjs",
      PACKET_PATH,
      `--source-fixture=${FIXTURE_PATH}`,
      `--research-design=${RESEARCH_DESIGN_PATH}`
    ],
    { encoding: "utf8" }
  );
  const dataModel = JSON.parse(output);

  assert.equal(dataModel.data_model_state, "READY_FOR_INTERNAL_RESEARCH_MATH_FINALIZATION_DESIGN");
  assert.equal(dataModel.feeds.internal_research_math_finalization_design, true);
  assert.equal(dataModel.feeds.research_model_feed, false);
  assert.equal(dataModel.feeds.research_math_output, false);
  assert.equal(dataModel.feeds.model_output, false);
  assert.equal(dataModel.feeds.confidence_output, false);
  assert.equal(dataModel.feeds.finance_output, false);
  assert.equal(dataModel.feeds.customer_facing_output, false);
  assert.equal(output.includes("SELECT"), false);
  assert.equal(output.includes("person@example.com"), false);
});
