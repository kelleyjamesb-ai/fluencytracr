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
  buildContributionAlignmentInternalResearchDesignGateReviewFromObject,
  contributionAlignmentInternalResearchDesignGateReviewHash
} from "./run_ai_value_contribution_alignment_internal_research_design_gate_review.mjs";
import {
  buildContributionAlignmentMethodPrototypeDecisionFromObject,
  contributionAlignmentMethodPrototypeDecisionHash,
  validateContributionAlignmentMethodPrototypeDecision
} from "./run_ai_value_contribution_alignment_method_prototype_decision.mjs";

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

function buildGateReview(overrides = {}) {
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
  const gateReview = buildContributionAlignmentInternalResearchDesignGateReviewFromObject(
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
  return {
    options,
    sourceRunner,
    sourceReviewPacket,
    sourceDesignReview,
    sourcePrototype,
    sourcePrototypeReviewPacket,
    gateReview
  };
}

function decisionOptions(chain, overrides = {}) {
  return {
    ...chain.options,
    sourceRunner: chain.sourceRunner,
    sourceReviewPacket: chain.sourceReviewPacket,
    sourceDesignReview: chain.sourceDesignReview,
    sourcePrototype: chain.sourcePrototype,
    sourcePrototypeReviewPacket: chain.sourcePrototypeReviewPacket,
    sourceGateReview: chain.gateReview,
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

test("method prototype decision authorizes only a small internal method prototype", () => {
  const chain = buildGateReview();
  const decision = buildContributionAlignmentMethodPrototypeDecisionFromObject(
    chain.gateReview,
    decisionOptions(chain)
  );
  const validation = validateContributionAlignmentMethodPrototypeDecision(
    decision,
    decisionOptions(chain)
  );
  const serialized = JSON.stringify(decision);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(decision.decision_state, "PROMOTE_SMALL_INTERNAL_METHOD_PROTOTYPE");
  assert.equal(decision.decision_scope.internal_only, true);
  assert.equal(decision.decision_scope.non_persistent, true);
  assert.equal(decision.decision_scope.compact_refs_only, true);
  assert.equal(decision.decision_scope.small_internal_method_prototype, true);
  assert.equal(decision.decision_scope.research_model_feed, false);
  assert.equal(decision.decision_scope.model_result, false);
  assert.equal(decision.method_prototype_scope.allowed_output, "qualitative_component_posture_only");
  assert.equal(decision.method_prototype_scope.numeric_result_authorized, false);
  assert.equal(decision.method_prototype_scope.customer_output_authorized, false);
  assert.equal(decision.source_gate_review_ref.gate_state, "READY_FOR_EXACT_SCOPE_METHOD_PROTOTYPE_DECISION");
  assert.equal(decision.boundary_policy.feeds_research_model, false);
  assert.equal(decision.boundary_policy.emits_confidence_output, false);
  assert.equal(decision.boundary_policy.emits_finance_output, false);
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

test("method prototype decision holds on research-design gate review drift", () => {
  const chain = buildGateReview();
  chain.gateReview.gate_review_summary.context_separation_state = "collapsed";
  chain.gateReview.gate_review_hash =
    contributionAlignmentInternalResearchDesignGateReviewHash(chain.gateReview);

  const decision = buildContributionAlignmentMethodPrototypeDecisionFromObject(
    chain.gateReview,
    decisionOptions(chain)
  );
  const validation = validateContributionAlignmentMethodPrototypeDecision(
    decision,
    decisionOptions(chain)
  );

  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, true, validation.gaps.join("; "));
  assert.equal(decision.decision_state, "HOLD_FOR_VALID_INTERNAL_RESEARCH_DESIGN_GATE_REVIEW");
  assert.equal(decision.feeds.small_internal_method_prototype, false);
  assert.ok(
    decision.validation_summary.gaps.some((gap) =>
      gap.includes("research-design gate review must match source-review-packet-bound expected envelope")
    ),
    decision.validation_summary.gaps.join("; ")
  );
});

test("method prototype decision fails closed on missing gate review", () => {
  const chain = buildGateReview();
  const decision = buildContributionAlignmentMethodPrototypeDecisionFromObject(
    undefined,
    decisionOptions({ ...chain, gateReview: undefined })
  );
  const validation = validateContributionAlignmentMethodPrototypeDecision(
    decision,
    decisionOptions({ ...chain, gateReview: undefined })
  );

  assert.equal(decision.decision_state, "HOLD_FOR_VALID_INTERNAL_RESEARCH_DESIGN_GATE_REVIEW");
  assert.equal(decision.feeds.small_internal_method_prototype, false);
  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("sourceGateReview is required")),
    validation.gaps.join("; ")
  );
});

test("method prototype decision nulls non-string compact source refs", () => {
  const chain = buildGateReview();
  chain.gateReview.gate_review_id = 0.91;
  chain.gateReview.gate_state = true;
  chain.gateReview.gate_review_hash = 0.92;
  chain.gateReview.source_prototype_review_packet_ref.review_packet_id = false;
  chain.gateReview.source_prototype_review_packet_ref.review_packet_hash = 0.93;
  chain.gateReview.source_prototype_review_packet_ref.source_prototype_id = true;
  chain.gateReview.source_prototype_review_packet_ref.source_prototype_hash = 0.94;
  chain.gateReview.gate_review_summary.allowed_next_step = 0.95;
  chain.gateReview.gate_review_summary.evidence_scope = false;
  chain.gateReview.research_design_ref.design_hash = true;

  const decision = buildContributionAlignmentMethodPrototypeDecisionFromObject(
    chain.gateReview,
    decisionOptions(chain)
  );

  assert.equal(decision.decision_state, "HOLD_FOR_VALID_INTERNAL_RESEARCH_DESIGN_GATE_REVIEW");
  assert.deepEqual(decision.source_gate_review_ref, {
    gate_review_id: null,
    gate_state: null,
    gate_review_hash: null,
    source_review_packet_id: null,
    source_review_packet_hash: null,
    source_prototype_id: null,
    source_prototype_hash: null,
    allowed_next_step: null,
    evidence_scope: null,
    design_hash: null
  });
  assert.equal(JSON.stringify(decision.source_gate_review_ref).includes("0.91"), false);
  assert.equal(JSON.stringify(decision.source_gate_review_ref).includes("true"), false);
});

test("method prototype decision rejects payload smuggling", () => {
  const chain = buildGateReview();
  const decision = buildContributionAlignmentMethodPrototypeDecisionFromObject(
    chain.gateReview,
    decisionOptions(chain)
  );
  decision.payload_json = {
    raw_rows: [{ email: "person@example.com" }],
    model_result: { confidence_score: 0.91 },
    query_text: "SELECT user_id FROM raw_rows"
  };

  const validation = validateContributionAlignmentMethodPrototypeDecision(
    decision,
    decisionOptions(chain)
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("forbidden field name")),
    validation.gaps.join("; ")
  );
});

test("method prototype decision validation output does not echo unsafe ids, states, or keys", () => {
  const chain = buildGateReview();
  const decision = buildContributionAlignmentMethodPrototypeDecisionFromObject(
    chain.gateReview,
    decisionOptions(chain)
  );
  decision.decision_id = "SELECT user_id FROM raw_rows WHERE email = person@example.com";
  decision.decision_state = "confidence_output_ready";
  decision["SELECT user_id FROM raw_rows"] = true;
  decision.decision_scope["person@example.com"] = true;
  decision.feeds.raw_rows = true;
  decision.boundary_policy.query_text = true;
  decision.decision_hash = contributionAlignmentMethodPrototypeDecisionHash(decision);

  const validation = validateContributionAlignmentMethodPrototypeDecision(
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

test("method prototype decision validation gaps do not echo unsafe nested keys", () => {
  const chain = buildGateReview();
  const decision = buildContributionAlignmentMethodPrototypeDecisionFromObject(
    chain.gateReview,
    decisionOptions(chain)
  );
  decision.source_gate_review_ref["person@example.com"] = "SELECT user_id FROM raw_rows";
  decision.decision_hash = contributionAlignmentMethodPrototypeDecisionHash(decision);

  const validation = validateContributionAlignmentMethodPrototypeDecision(
    decision,
    decisionOptions(chain)
  );
  const serialized = JSON.stringify(validation);

  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("raw_rows"), false);
});

test("method prototype decision rejects tampering after rehash", () => {
  const chain = buildGateReview();
  const decision = buildContributionAlignmentMethodPrototypeDecisionFromObject(
    chain.gateReview,
    decisionOptions(chain)
  );
  decision.source_gate_review_ref.gate_review_id = "forged_gate";
  decision.method_prototype_scope.allowed_output = "numeric_result";
  decision.decision_hash = contributionAlignmentMethodPrototypeDecisionHash(decision);

  const validation = validateContributionAlignmentMethodPrototypeDecision(
    decision,
    decisionOptions(chain)
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) =>
      gap.includes("method prototype decision must match source-gate-bound expected envelope")
    ),
    validation.gaps.join("; ")
  );
});

test("method prototype decision CLI emits compact decision", () => {
  const output = execFileSync(
    "node",
    [
      "scripts/run_ai_value_contribution_alignment_method_prototype_decision.mjs",
      PACKET_PATH,
      `--source-fixture=${FIXTURE_PATH}`,
      `--research-design=${RESEARCH_DESIGN_PATH}`
    ],
    { encoding: "utf8" }
  );
  const decision = JSON.parse(output);

  assert.equal(decision.decision_state, "PROMOTE_SMALL_INTERNAL_METHOD_PROTOTYPE");
  assert.equal(decision.feeds.small_internal_method_prototype, true);
  assert.equal(decision.feeds.research_model_feed, false);
  assert.equal(decision.feeds.model_output, false);
  assert.equal(decision.feeds.confidence_output, false);
  assert.equal(decision.feeds.finance_output, false);
  assert.equal(decision.feeds.customer_facing_output, false);
  assert.equal(output.includes("SELECT"), false);
  assert.equal(output.includes("person@example.com"), false);
});
