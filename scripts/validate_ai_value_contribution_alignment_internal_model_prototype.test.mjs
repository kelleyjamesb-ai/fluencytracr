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
  buildContributionAlignmentModelPrototypeDesignReviewFromObject,
  contributionAlignmentModelPrototypeDesignReviewHash
} from "./run_ai_value_contribution_alignment_model_prototype_design_review.mjs";
import {
  buildContributionAlignmentInternalModelPrototypeFromObject,
  contributionAlignmentInternalModelPrototypeHash,
  validateContributionAlignmentInternalModelPrototype
} from "./run_ai_value_contribution_alignment_internal_model_prototype.mjs";

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
  "design_review_payload",
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

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(
    ([nestedKey, nestedValue]) => nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

test("contribution alignment internal model prototype emits non-persistent contract replay only", () => {
  const { sourceRunner, sourceReviewPacket, designReview } = buildDesignReview();
  const prototype = buildContributionAlignmentInternalModelPrototypeFromObject(
    designReview,
    prototypeOptions(sourceRunner, sourceReviewPacket, designReview)
  );
  const validation = validateContributionAlignmentInternalModelPrototype(
    prototype,
    prototypeOptions(sourceRunner, sourceReviewPacket, designReview)
  );
  const serialized = JSON.stringify(prototype);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(prototype.prototype_state, "READY_FOR_INTERNAL_MODEL_PROTOTYPE_RECORD");
  assert.equal(prototype.source_design_review_ref.review_state, "READY_FOR_INTERNAL_MODEL_PROTOTYPE_DESIGN_RECORD");
  assert.equal(prototype.prototype_scope.internal_only, true);
  assert.equal(prototype.prototype_scope.non_persistent, true);
  assert.equal(prototype.prototype_scope.compact_refs_only, true);
  assert.equal(prototype.prototype_scope.descriptive_contract_replay_only, true);
  assert.equal(prototype.prototype_scope.numeric_weights, false);
  assert.equal(prototype.prototype_scope.confidence_output, false);
  assert.equal(prototype.prototype_scope.model_result, false);
  assert.equal(prototype.method_frame.result_emitted, false);
  assert.equal(prototype.method_frame.parameterization_authorized, false);
  assert.equal(prototype.method_frame.research_feed_authorized, false);
  assert.equal(prototype.boundary_policy.emits_confidence_output, false);
  assert.deepEqual(
    prototype.component_reviews.map((component) => component.component_id),
    REQUIRED_COMPONENTS
  );
  assert.ok(
    prototype.component_reviews.every(
      (component) =>
        component.trace_state === "reviewable_contract_ref" &&
        component.emission_state === "not_emitted"
    )
  );
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(prototype.feeds[feed], false, `${feed} must remain false`);
  }
  for (const key of FORBIDDEN_KEYS) {
    assert.equal(hasNestedKey(prototype, key), false, `${key} must not be emitted`);
  }
  assert.equal(serialized.includes("SELECT"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("confidence_score"), false);
  assert.equal(serialized.includes("f("), false);
  assert.equal(serialized.includes("equation"), false);
  assert.equal(serialized.includes("coefficient"), false);
  assert.equal(serialized.includes("likelihood"), false);
});

test("contribution alignment internal model prototype holds on design review drift", () => {
  const { sourceRunner, sourceReviewPacket, designReview } = buildDesignReview();
  designReview.selected_path_model_ref.expectation_path_id = "tampered_path";
  designReview.prototype_scope.model_implementation = false;
  designReview.design_review_hash = contributionAlignmentModelPrototypeDesignReviewHash(designReview);

  const prototype = buildContributionAlignmentInternalModelPrototypeFromObject(
    designReview,
    prototypeOptions(sourceRunner, sourceReviewPacket, designReview)
  );
  const validation = validateContributionAlignmentInternalModelPrototype(
    prototype,
    prototypeOptions(sourceRunner, sourceReviewPacket, designReview)
  );

  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, true, validation.gaps.join("; "));
  assert.equal(prototype.prototype_state, "HOLD_FOR_VALID_MODEL_PROTOTYPE_DESIGN_REVIEW");
  assert.equal(prototype.feeds.internal_model_prototype_record, false);
  assert.equal(prototype.validation_summary.valid, false);
  assert.ok(
    prototype.validation_summary.gaps.some((gap) =>
      gap.includes("design review must match source-review-packet-bound expected envelope")
    ),
    prototype.validation_summary.gaps.join("; ")
  );
});

test("contribution alignment internal model prototype fails closed on missing design review", () => {
  const { sourceRunner, sourceReviewPacket } = buildDesignReview();
  const prototype = buildContributionAlignmentInternalModelPrototypeFromObject(
    undefined,
    prototypeOptions(sourceRunner, sourceReviewPacket, undefined)
  );
  const validation = validateContributionAlignmentInternalModelPrototype(prototype, {
    sourceRunner,
    sourceReviewPacket,
    sourcePacket: readJson(PACKET_PATH),
    sourceFixture: readJson(FIXTURE_PATH),
    researchDesignText: readText(RESEARCH_DESIGN_PATH),
    implementationDecisionText: readText(RUNNER_IMPLEMENTATION_DECISION_PATH)
  });

  assert.equal(prototype.prototype_state, "HOLD_FOR_VALID_MODEL_PROTOTYPE_DESIGN_REVIEW");
  assert.equal(prototype.feeds.internal_model_prototype_record, false);
  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("sourceDesignReview is required")),
    validation.gaps.join("; ")
  );
});

test("contribution alignment internal model prototype validator fails closed on malformed top-level input", () => {
  const { sourceRunner, sourceReviewPacket, designReview } = buildDesignReview();
  const validation = validateContributionAlignmentInternalModelPrototype(
    undefined,
    prototypeOptions(sourceRunner, sourceReviewPacket, designReview)
  );

  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("internal model prototype must be an object")),
    validation.gaps.join("; ")
  );
});

test("contribution alignment internal model prototype holds without copying unsafe held-source strings", () => {
  const { sourceRunner, sourceReviewPacket, designReview } = buildDesignReview();
  designReview.selected_path_model_ref.expected_pathway_metadata.expected_behavior =
    "executive claim: Glean delivered 24 percent cost reduction";
  designReview.context_refs.observed_vbd_context_ref.source_ref =
    "SELECT\nuser_id\nFROM production_event_rows";
  designReview.design_review_hash = contributionAlignmentModelPrototypeDesignReviewHash(designReview);

  const prototype = buildContributionAlignmentInternalModelPrototypeFromObject(
    designReview,
    prototypeOptions(sourceRunner, sourceReviewPacket, designReview)
  );
  const validation = validateContributionAlignmentInternalModelPrototype(
    prototype,
    prototypeOptions(sourceRunner, sourceReviewPacket, designReview)
  );
  const serialized = JSON.stringify(prototype);

  assert.equal(validation.valid, false);
  assert.equal(prototype.prototype_state, "HOLD_FOR_VALID_MODEL_PROTOTYPE_DESIGN_REVIEW");
  assert.equal(serialized.includes("SELECT"), false);
  assert.equal(serialized.includes("production_event_rows"), false);
  assert.equal(serialized.includes("executive claim"), false);
  assert.equal(serialized.includes("cost reduction"), false);
});

test("contribution alignment internal model prototype rejects payload smuggling", () => {
  const { sourceRunner, sourceReviewPacket, designReview } = buildDesignReview();
  const prototype = buildContributionAlignmentInternalModelPrototypeFromObject(
    designReview,
    prototypeOptions(sourceRunner, sourceReviewPacket, designReview)
  );
  prototype.payload_json = {
    raw_rows: [{ email: "person@example.com" }],
    model_result: { confidence_score: 0.93 },
    query_text: "SELECT user_id FROM raw_rows"
  };

  const validation = validateContributionAlignmentInternalModelPrototype(
    prototype,
    prototypeOptions(sourceRunner, sourceReviewPacket, designReview)
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("forbidden field name")),
    validation.gaps.join("; ")
  );
});

test("contribution alignment internal model prototype rejects component review tampering after rehash", () => {
  const { sourceRunner, sourceReviewPacket, designReview } = buildDesignReview();
  const prototype = buildContributionAlignmentInternalModelPrototypeFromObject(
    designReview,
    prototypeOptions(sourceRunner, sourceReviewPacket, designReview)
  );
  prototype.component_reviews[0].trace_state = "scored";
  prototype.component_reviews[1].emission_state = "emitted";
  prototype.prototype_hash = contributionAlignmentInternalModelPrototypeHash(prototype);

  const validation = validateContributionAlignmentInternalModelPrototype(
    prototype,
    prototypeOptions(sourceRunner, sourceReviewPacket, designReview)
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) =>
      gap.includes("component_reviews must match governed component review trace")
    ),
    validation.gaps.join("; ")
  );
});

test("contribution alignment internal model prototype validation gaps do not echo unsafe values", () => {
  const { sourceRunner, sourceReviewPacket, designReview } = buildDesignReview();
  const prototype = buildContributionAlignmentInternalModelPrototypeFromObject(
    designReview,
    prototypeOptions(sourceRunner, sourceReviewPacket, designReview)
  );
  prototype.blocked_uses = [
    ...prototype.blocked_uses,
    "SELECT user_id FROM raw_rows WHERE email = person@example.com"
  ];
  prototype.prototype_hash = contributionAlignmentInternalModelPrototypeHash(prototype);

  const validation = validateContributionAlignmentInternalModelPrototype(
    prototype,
    prototypeOptions(sourceRunner, sourceReviewPacket, designReview)
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

test("contribution alignment internal model prototype validation output does not echo unsafe ids, states, or keys", () => {
  const { sourceRunner, sourceReviewPacket, designReview } = buildDesignReview();
  const prototype = buildContributionAlignmentInternalModelPrototypeFromObject(
    designReview,
    prototypeOptions(sourceRunner, sourceReviewPacket, designReview)
  );
  prototype.prototype_id = "SELECT user_id FROM raw_rows WHERE email = person@example.com";
  prototype.prototype_state = "confidence_output_ready";
  prototype["SELECT user_id FROM raw_rows"] = true;
  prototype.prototype_scope["person@example.com"] = true;
  prototype.feeds["raw_rows"] = true;
  prototype.boundary_policy["query_text"] = true;
  prototype.prototype_hash = contributionAlignmentInternalModelPrototypeHash(prototype);

  const validation = validateContributionAlignmentInternalModelPrototype(
    prototype,
    prototypeOptions(sourceRunner, sourceReviewPacket, designReview)
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

test("contribution alignment internal model prototype validation propagates missing upstream source gaps", () => {
  const { designReview } = buildDesignReview();
  const prototype = buildContributionAlignmentInternalModelPrototypeFromObject(
    designReview,
    { sourceDesignReview: designReview }
  );
  const validation = validateContributionAlignmentInternalModelPrototype(prototype, {
    sourceDesignReview: designReview
  });

  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("sourceReviewPacket is required")),
    validation.gaps.join("; ")
  );
});

test("contribution alignment internal model prototype rejects tampering after rehash", () => {
  const { sourceRunner, sourceReviewPacket, designReview } = buildDesignReview();
  const prototype = buildContributionAlignmentInternalModelPrototypeFromObject(
    designReview,
    prototypeOptions(sourceRunner, sourceReviewPacket, designReview)
  );
  prototype.source_design_review_ref.design_review_id = "forged_design_review";
  prototype.context_refs.observed_vbd_context_ref.ref_state = "missing";
  prototype.prototype_hash = contributionAlignmentInternalModelPrototypeHash(prototype);

  const validation = validateContributionAlignmentInternalModelPrototype(
    prototype,
    prototypeOptions(sourceRunner, sourceReviewPacket, designReview)
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) =>
      gap.includes("internal model prototype must match source-design-review-bound expected envelope")
    ),
    validation.gaps.join("; ")
  );
});

test("contribution alignment internal model prototype CLI emits compact non-persistent record", () => {
  const output = execFileSync(
    "node",
    [
      "scripts/run_ai_value_contribution_alignment_internal_model_prototype.mjs",
      PACKET_PATH,
      `--source-fixture=${FIXTURE_PATH}`,
      `--research-design=${RESEARCH_DESIGN_PATH}`
    ],
    { encoding: "utf8" }
  );
  const prototype = JSON.parse(output);

  assert.equal(prototype.prototype_state, "READY_FOR_INTERNAL_MODEL_PROTOTYPE_RECORD");
  assert.equal(prototype.feeds.internal_model_prototype_record, true);
  assert.equal(prototype.feeds.model_output, false);
  assert.equal(prototype.feeds.confidence_output, false);
  assert.equal(prototype.feeds.probability_output, false);
  assert.equal(prototype.feeds.finance_output, false);
  assert.equal(prototype.feeds.customer_facing_output, false);
  assert.equal(output.includes("SELECT"), false);
  assert.equal(output.includes("person@example.com"), false);
});

test("contribution alignment internal model prototype CLI honors approved non-default research design path", () => {
  const tmpDir = mkdtempSync(join(tmpdir(), "ft-internal-model-prototype-eq=-"));
  const copiedDesignPath = join(tmpDir, "copied-internal-research-design.md");
  writeFileSync(copiedDesignPath, readText(RESEARCH_DESIGN_PATH), "utf8");

  try {
    const output = execFileSync(
      "node",
      [
        "scripts/run_ai_value_contribution_alignment_internal_model_prototype.mjs",
        PACKET_PATH,
        `--source-fixture=${FIXTURE_PATH}`,
        `--research-design=${copiedDesignPath}`
      ],
      { encoding: "utf8" }
    );
    const prototype = JSON.parse(output);

    assert.equal(prototype.prototype_state, "READY_FOR_INTERNAL_MODEL_PROTOTYPE_RECORD");
    assert.equal(prototype.feeds.internal_model_prototype_record, true);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
