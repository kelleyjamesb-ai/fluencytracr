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
  buildContributionAlignmentMethodPrototypeDecisionFromObject,
  contributionAlignmentMethodPrototypeDecisionHash
} from "./run_ai_value_contribution_alignment_method_prototype_decision.mjs";
import {
  buildContributionAlignmentSmallInternalMethodPrototypeFromObject,
  contributionAlignmentSmallInternalMethodPrototypeHash,
  validateContributionAlignmentSmallInternalMethodPrototype
} from "./run_ai_value_contribution_alignment_small_internal_method_prototype.mjs";

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

function buildDecision(overrides = {}) {
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
  return {
    options,
    sourceRunner,
    sourceReviewPacket,
    sourceDesignReview,
    sourcePrototype,
    sourcePrototypeReviewPacket,
    sourceGateReview,
    sourceDecision
  };
}

function prototypeOptions(chain, overrides = {}) {
  return {
    ...chain.options,
    sourceRunner: chain.sourceRunner,
    sourceReviewPacket: chain.sourceReviewPacket,
    sourceDesignReview: chain.sourceDesignReview,
    sourcePrototype: chain.sourcePrototype,
    sourcePrototypeReviewPacket: chain.sourcePrototypeReviewPacket,
    sourceGateReview: chain.sourceGateReview,
    sourceDecision: chain.sourceDecision,
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

test("small internal method prototype emits qualitative component posture only", () => {
  const chain = buildDecision();
  const prototype = buildContributionAlignmentSmallInternalMethodPrototypeFromObject(
    chain.sourceDecision,
    prototypeOptions(chain)
  );
  const validation = validateContributionAlignmentSmallInternalMethodPrototype(
    prototype,
    prototypeOptions(chain)
  );
  const serialized = JSON.stringify(prototype);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(prototype.prototype_state, "READY_FOR_INTERNAL_METHOD_PROTOTYPE_REVIEW_RECORD");
  assert.equal(prototype.prototype_scope.internal_only, true);
  assert.equal(prototype.prototype_scope.non_persistent, true);
  assert.equal(prototype.prototype_scope.compact_refs_only, true);
  assert.equal(prototype.prototype_scope.qualitative_component_posture_only, true);
  assert.equal(prototype.prototype_scope.model_result, false);
  assert.equal(prototype.method_frame.output_kind, "qualitative_component_posture");
  assert.equal(prototype.method_frame.numeric_combination_authorized, false);
  assert.deepEqual(
    prototype.qualitative_component_postures.map((component) => component.component_id),
    REQUIRED_COMPONENTS
  );
  assert.ok(
    prototype.qualitative_component_postures.every(
      (component) =>
        component.review_posture === "included_for_internal_method_review" &&
        component.output_state === "not_emitted" &&
        component.numeric_role === "none"
    )
  );
  assert.equal(prototype.context_separation_review.ai_fluency_construct_context_state, "present");
  assert.equal(prototype.context_separation_review.psychological_context_state, "context_only");
  assert.equal(prototype.context_separation_review.observed_vbd_context_state, "present");
  assert.equal(prototype.context_separation_review.selected_metric_movement_state, "aligned");
  for (const feed of FALSE_FEEDS) {
    assert.equal(prototype.feeds[feed], false, `${feed} must remain false`);
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
    assert.equal(hasNestedKey(prototype, key), false, `${key} must not be emitted`);
  }
  assert.equal(serialized.includes("SELECT"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("confidence_score"), false);
  assert.equal(serialized.includes("coefficient"), false);
  assert.equal(serialized.includes("likelihood"), false);
});

test("small internal method prototype holds on decision drift", () => {
  const chain = buildDecision();
  chain.sourceDecision.method_prototype_scope.allowed_output = "numeric_result";
  chain.sourceDecision.decision_hash =
    contributionAlignmentMethodPrototypeDecisionHash(chain.sourceDecision);

  const prototype = buildContributionAlignmentSmallInternalMethodPrototypeFromObject(
    chain.sourceDecision,
    prototypeOptions(chain)
  );
  const validation = validateContributionAlignmentSmallInternalMethodPrototype(
    prototype,
    prototypeOptions(chain)
  );

  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, true, validation.gaps.join("; "));
  assert.equal(prototype.prototype_state, "HOLD_FOR_VALID_METHOD_PROTOTYPE_DECISION");
  assert.equal(prototype.feeds.internal_method_prototype_review, false);
  assert.ok(
    prototype.validation_summary.gaps.some((gap) =>
      gap.includes("method prototype decision must match source-gate-bound expected envelope")
    ),
    prototype.validation_summary.gaps.join("; ")
  );
});

test("small internal method prototype fails closed on missing decision", () => {
  const chain = buildDecision();
  const prototype = buildContributionAlignmentSmallInternalMethodPrototypeFromObject(
    undefined,
    prototypeOptions({ ...chain, sourceDecision: undefined })
  );
  const validation = validateContributionAlignmentSmallInternalMethodPrototype(
    prototype,
    prototypeOptions({ ...chain, sourceDecision: undefined })
  );

  assert.equal(prototype.prototype_state, "HOLD_FOR_VALID_METHOD_PROTOTYPE_DECISION");
  assert.equal(prototype.feeds.internal_method_prototype_review, false);
  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("sourceDecision is required")),
    validation.gaps.join("; ")
  );
});

test("small internal method prototype nulls non-string compact source refs", () => {
  const chain = buildDecision();
  chain.sourceDecision.decision_id = 0.91;
  chain.sourceDecision.decision_state = true;
  chain.sourceDecision.decision_hash = 0.92;
  chain.sourceDecision.source_gate_review_ref.gate_review_id = false;
  chain.sourceDecision.source_gate_review_ref.gate_review_hash = 0.93;
  chain.sourceDecision.method_prototype_scope.allowed_output = 0.94;
  chain.sourceDecision.method_prototype_scope.evidence_scope = true;

  const prototype = buildContributionAlignmentSmallInternalMethodPrototypeFromObject(
    chain.sourceDecision,
    prototypeOptions(chain)
  );

  assert.equal(prototype.prototype_state, "HOLD_FOR_VALID_METHOD_PROTOTYPE_DECISION");
  assert.deepEqual(prototype.source_decision_ref, {
    decision_id: null,
    decision_state: null,
    decision_hash: null,
    source_gate_review_id: null,
    source_gate_review_hash: null,
    allowed_output: null,
    evidence_scope: null
  });
  assert.equal(JSON.stringify(prototype.source_decision_ref).includes("0.91"), false);
  assert.equal(JSON.stringify(prototype.source_decision_ref).includes("true"), false);
});

test("small internal method prototype rejects payload smuggling", () => {
  const chain = buildDecision();
  const prototype = buildContributionAlignmentSmallInternalMethodPrototypeFromObject(
    chain.sourceDecision,
    prototypeOptions(chain)
  );
  prototype.payload_json = {
    raw_rows: [{ email: "person@example.com" }],
    model_result: { confidence_score: 0.91 },
    query_text: "SELECT user_id FROM raw_rows"
  };

  const validation = validateContributionAlignmentSmallInternalMethodPrototype(
    prototype,
    prototypeOptions(chain)
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("forbidden field name")),
    validation.gaps.join("; ")
  );
});

test("small internal method prototype validation output does not echo unsafe ids, states, or keys", () => {
  const chain = buildDecision();
  const prototype = buildContributionAlignmentSmallInternalMethodPrototypeFromObject(
    chain.sourceDecision,
    prototypeOptions(chain)
  );
  prototype.prototype_id = "SELECT user_id FROM raw_rows WHERE email = person@example.com";
  prototype.prototype_state = "confidence_output_ready";
  prototype["SELECT user_id FROM raw_rows"] = true;
  prototype.prototype_scope["person@example.com"] = true;
  prototype.feeds.raw_rows = true;
  prototype.boundary_policy.query_text = true;
  prototype.prototype_hash = contributionAlignmentSmallInternalMethodPrototypeHash(prototype);

  const validation = validateContributionAlignmentSmallInternalMethodPrototype(
    prototype,
    prototypeOptions(chain)
  );
  const serialized = JSON.stringify(validation);

  assert.equal(validation.valid, false);
  assert.equal(validation.prototype_id, null);
  assert.equal(validation.prototype_state, null);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("confidence_output_ready"), false);
  assert.equal(serialized.includes("raw_rows"), false);
  assert.equal(serialized.includes("query_text"), false);
});

test("small internal method prototype validation gaps do not echo unsafe nested keys", () => {
  const chain = buildDecision();
  const prototype = buildContributionAlignmentSmallInternalMethodPrototypeFromObject(
    chain.sourceDecision,
    prototypeOptions(chain)
  );
  prototype.source_decision_ref["person@example.com"] = "SELECT user_id FROM raw_rows";
  prototype.prototype_hash = contributionAlignmentSmallInternalMethodPrototypeHash(prototype);

  const validation = validateContributionAlignmentSmallInternalMethodPrototype(
    prototype,
    prototypeOptions(chain)
  );
  const serialized = JSON.stringify(validation);

  assert.equal(validation.valid, false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("raw_rows"), false);
});

test("small internal method prototype rejects tampering after rehash", () => {
  const chain = buildDecision();
  const prototype = buildContributionAlignmentSmallInternalMethodPrototypeFromObject(
    chain.sourceDecision,
    prototypeOptions(chain)
  );
  prototype.source_decision_ref.decision_id = "forged_decision";
  prototype.qualitative_component_postures[0].numeric_role = "weight";
  prototype.prototype_hash = contributionAlignmentSmallInternalMethodPrototypeHash(prototype);

  const validation = validateContributionAlignmentSmallInternalMethodPrototype(
    prototype,
    prototypeOptions(chain)
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) =>
      gap.includes("small internal method prototype must match source-decision-bound expected envelope")
    ),
    validation.gaps.join("; ")
  );
});

test("small internal method prototype CLI emits compact prototype", () => {
  const output = execFileSync(
    "node",
    [
      "scripts/run_ai_value_contribution_alignment_small_internal_method_prototype.mjs",
      PACKET_PATH,
      `--source-fixture=${FIXTURE_PATH}`,
      `--research-design=${RESEARCH_DESIGN_PATH}`
    ],
    { encoding: "utf8" }
  );
  const prototype = JSON.parse(output);

  assert.equal(prototype.prototype_state, "READY_FOR_INTERNAL_METHOD_PROTOTYPE_REVIEW_RECORD");
  assert.equal(prototype.feeds.internal_method_prototype_review, true);
  assert.equal(prototype.feeds.research_model_feed, false);
  assert.equal(prototype.feeds.model_output, false);
  assert.equal(prototype.feeds.confidence_output, false);
  assert.equal(prototype.feeds.finance_output, false);
  assert.equal(prototype.feeds.customer_facing_output, false);
  assert.equal(output.includes("SELECT"), false);
  assert.equal(output.includes("person@example.com"), false);
});
