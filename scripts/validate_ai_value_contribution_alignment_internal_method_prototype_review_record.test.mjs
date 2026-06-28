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
  buildContributionAlignmentSmallInternalMethodPrototypeFromObject,
  contributionAlignmentSmallInternalMethodPrototypeHash
} from "./run_ai_value_contribution_alignment_small_internal_method_prototype.mjs";
import {
  buildContributionAlignmentInternalMethodPrototypeReviewRecordFromObject,
  contributionAlignmentInternalMethodPrototypeReviewRecordHash,
  validateContributionAlignmentInternalMethodPrototypeReviewRecord
} from "./run_ai_value_contribution_alignment_internal_method_prototype_review_record.mjs";

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

function chainOptions(overrides = {}) {
  return {
    sourcePacket: readJson(PACKET_PATH),
    sourceFixture: readJson(FIXTURE_PATH),
    researchDesignText: readText(RESEARCH_DESIGN_PATH),
    implementationDecisionText: readText(RUNNER_IMPLEMENTATION_DECISION_PATH),
    ...overrides
  };
}

function buildPrototype(overrides = {}) {
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
  return {
    options,
    sourceRunner,
    sourceReviewPacket,
    sourceDesignReview,
    sourcePrototype,
    sourcePrototypeReviewPacket,
    sourceGateReview,
    sourceDecision,
    sourceMethodPrototype
  };
}

function recordOptions(chain, overrides = {}) {
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

test("internal method prototype review record promotes only exact-scope research math finalization review", () => {
  const chain = buildPrototype();
  const record = buildContributionAlignmentInternalMethodPrototypeReviewRecordFromObject(
    chain.sourceMethodPrototype,
    recordOptions(chain)
  );
  const validation = validateContributionAlignmentInternalMethodPrototypeReviewRecord(
    record,
    recordOptions(chain)
  );
  const serialized = JSON.stringify(record);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(record.review_record_state, "PROMOTE_EXACT_SCOPE_RESEARCH_MATH_FINALIZATION_REVIEW");
  assert.equal(record.review_scope.internal_only, true);
  assert.equal(record.review_scope.non_persistent, true);
  assert.equal(record.review_scope.compact_refs_only, true);
  assert.equal(record.review_scope.review_record_only, true);
  assert.equal(record.review_scope.exact_scope_research_math_finalization_review, true);
  assert.equal(record.finalization_review_scope.allowed_next_step, "exact_scope_research_math_finalization_review_only");
  assert.equal(record.finalization_review_scope.implements_research_math, false);
  assert.equal(record.finalization_review_scope.emits_numeric_result, false);
  assert.equal(record.finalization_review_scope.emits_customer_output, false);
  assert.equal(record.source_method_prototype_ref.prototype_state, "READY_FOR_INTERNAL_METHOD_PROTOTYPE_REVIEW_RECORD");
  assert.deepEqual(
    record.component_posture_review.map((component) => component.component_id),
    REQUIRED_COMPONENTS
  );
  assert.equal(record.context_separation_review.ai_fluency_construct_context_state, "present");
  assert.equal(record.context_separation_review.psychological_context_state, "context_only");
  assert.equal(record.context_separation_review.observed_vbd_context_state, "present");
  assert.equal(record.context_separation_review.selected_metric_movement_state, "aligned");
  assert.equal(record.feeds.exact_scope_research_math_finalization_review, true);
  for (const feed of FALSE_FEEDS) {
    assert.equal(record.feeds[feed], false, `${feed} must remain false`);
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
    assert.equal(hasNestedKey(record, key), false, `${key} must not be emitted`);
  }
  assert.equal(serialized.includes("SELECT"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("confidence_score"), false);
  assert.equal(serialized.includes("coefficient"), false);
  assert.equal(serialized.includes("likelihood"), false);
});

test("internal method prototype review record holds on source prototype drift", () => {
  const chain = buildPrototype();
  chain.sourceMethodPrototype.qualitative_component_postures[0].numeric_role = "weight";
  chain.sourceMethodPrototype.prototype_hash =
    contributionAlignmentSmallInternalMethodPrototypeHash(chain.sourceMethodPrototype);

  const record = buildContributionAlignmentInternalMethodPrototypeReviewRecordFromObject(
    chain.sourceMethodPrototype,
    recordOptions(chain)
  );
  const validation = validateContributionAlignmentInternalMethodPrototypeReviewRecord(
    record,
    recordOptions(chain)
  );

  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, true, validation.gaps.join("; "));
  assert.equal(record.review_record_state, "HOLD_FOR_VALID_INTERNAL_METHOD_PROTOTYPE_REVIEW_RECORD");
  assert.equal(record.feeds.exact_scope_research_math_finalization_review, false);
  assert.ok(
    record.validation_summary.gaps.some((gap) =>
      gap.includes("source_method_prototype component posture must remain qualitative and non-numeric")
    ),
    record.validation_summary.gaps.join("; ")
  );
});

test("internal method prototype review record fails closed on missing source prototype", () => {
  const chain = buildPrototype();
  const record = buildContributionAlignmentInternalMethodPrototypeReviewRecordFromObject(
    undefined,
    recordOptions({ ...chain, sourceMethodPrototype: undefined })
  );
  const validation = validateContributionAlignmentInternalMethodPrototypeReviewRecord(
    record,
    recordOptions({ ...chain, sourceMethodPrototype: undefined })
  );

  assert.equal(record.review_record_state, "HOLD_FOR_VALID_INTERNAL_METHOD_PROTOTYPE_REVIEW_RECORD");
  assert.equal(record.feeds.exact_scope_research_math_finalization_review, false);
  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("sourceMethodPrototype is required")),
    validation.gaps.join("; ")
  );
});

test("internal method prototype review record nulls non-string compact source refs", () => {
  const chain = buildPrototype();
  chain.sourceMethodPrototype.prototype_id = 0.91;
  chain.sourceMethodPrototype.prototype_state = true;
  chain.sourceMethodPrototype.prototype_hash = 0.92;
  chain.sourceMethodPrototype.source_decision_ref.decision_id = false;
  chain.sourceMethodPrototype.source_decision_ref.decision_hash = 0.93;
  chain.sourceMethodPrototype.method_frame.output_kind = true;

  const record = buildContributionAlignmentInternalMethodPrototypeReviewRecordFromObject(
    chain.sourceMethodPrototype,
    recordOptions(chain)
  );

  assert.equal(record.review_record_state, "HOLD_FOR_VALID_INTERNAL_METHOD_PROTOTYPE_REVIEW_RECORD");
  assert.deepEqual(record.source_method_prototype_ref, {
    prototype_id: null,
    prototype_state: null,
    prototype_hash: null,
    source_decision_id: null,
    source_decision_hash: null,
    output_kind: null
  });
  assert.equal(JSON.stringify(record.source_method_prototype_ref).includes("0.91"), false);
  assert.equal(JSON.stringify(record.source_method_prototype_ref).includes("true"), false);
});

test("internal method prototype review record rejects payload smuggling", () => {
  const chain = buildPrototype();
  const record = buildContributionAlignmentInternalMethodPrototypeReviewRecordFromObject(
    chain.sourceMethodPrototype,
    recordOptions(chain)
  );
  record.payload_json = {
    raw_rows: [{ email: "person@example.com" }],
    model_result: { confidence_score: 0.91 },
    query_text: "SELECT user_id FROM raw_rows"
  };

  const validation = validateContributionAlignmentInternalMethodPrototypeReviewRecord(
    record,
    recordOptions(chain)
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("forbidden field name")),
    validation.gaps.join("; ")
  );
});

test("internal method prototype review record validation output does not echo unsafe ids, states, or keys", () => {
  const chain = buildPrototype();
  const record = buildContributionAlignmentInternalMethodPrototypeReviewRecordFromObject(
    chain.sourceMethodPrototype,
    recordOptions(chain)
  );
  record.review_record_id = "SELECT user_id FROM raw_rows WHERE email = person@example.com";
  record.review_record_state = "confidence_output_ready";
  record["SELECT user_id FROM raw_rows"] = true;
  record.review_scope["person@example.com"] = true;
  record.feeds.raw_rows = true;
  record.boundary_policy.query_text = true;
  record.review_record_hash = contributionAlignmentInternalMethodPrototypeReviewRecordHash(record);

  const validation = validateContributionAlignmentInternalMethodPrototypeReviewRecord(
    record,
    recordOptions(chain)
  );
  const serialized = JSON.stringify(validation);

  assert.equal(validation.valid, false);
  assert.equal(validation.review_record_id, null);
  assert.equal(validation.review_record_state, null);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("confidence_output_ready"), false);
  assert.equal(serialized.includes("raw_rows"), false);
  assert.equal(serialized.includes("query_text"), false);
});

test("internal method prototype review record validation gaps do not echo unsafe nested keys", () => {
  const chain = buildPrototype();
  const record = buildContributionAlignmentInternalMethodPrototypeReviewRecordFromObject(
    chain.sourceMethodPrototype,
    recordOptions(chain)
  );
  record.source_method_prototype_ref["person@example.com"] = "SELECT user_id FROM raw_rows";
  record.review_record_hash = contributionAlignmentInternalMethodPrototypeReviewRecordHash(record);

  const validation = validateContributionAlignmentInternalMethodPrototypeReviewRecord(
    record,
    recordOptions(chain)
  );
  const serialized = JSON.stringify(validation);

  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("raw_rows"), false);
});

test("internal method prototype review record rejects tampering after rehash", () => {
  const chain = buildPrototype();
  const record = buildContributionAlignmentInternalMethodPrototypeReviewRecordFromObject(
    chain.sourceMethodPrototype,
    recordOptions(chain)
  );
  record.source_method_prototype_ref.prototype_id = "forged_prototype";
  record.finalization_review_scope.allowed_next_step = "implement_research_math";
  record.review_record_hash = contributionAlignmentInternalMethodPrototypeReviewRecordHash(record);

  const validation = validateContributionAlignmentInternalMethodPrototypeReviewRecord(
    record,
    recordOptions(chain)
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) =>
      gap.includes("internal method prototype review record must match source-prototype-bound expected envelope")
    ),
    validation.gaps.join("; ")
  );
});

test("internal method prototype review record CLI emits compact promotion gate", () => {
  const output = execFileSync(
    "node",
    [
      "scripts/run_ai_value_contribution_alignment_internal_method_prototype_review_record.mjs",
      PACKET_PATH,
      `--source-fixture=${FIXTURE_PATH}`,
      `--research-design=${RESEARCH_DESIGN_PATH}`
    ],
    { encoding: "utf8" }
  );
  const record = JSON.parse(output);

  assert.equal(record.review_record_state, "PROMOTE_EXACT_SCOPE_RESEARCH_MATH_FINALIZATION_REVIEW");
  assert.equal(record.feeds.exact_scope_research_math_finalization_review, true);
  assert.equal(record.feeds.research_model_feed, false);
  assert.equal(record.feeds.research_math_output, false);
  assert.equal(record.feeds.model_output, false);
  assert.equal(record.feeds.confidence_output, false);
  assert.equal(record.feeds.finance_output, false);
  assert.equal(record.feeds.customer_facing_output, false);
  assert.equal(output.includes("SELECT"), false);
  assert.equal(output.includes("person@example.com"), false);
});
