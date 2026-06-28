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
  buildContributionAlignmentInternalModelPrototypeFromObject
} from "./run_ai_value_contribution_alignment_internal_model_prototype.mjs";
import {
  buildContributionAlignmentInternalModelPrototypeReviewPacketFromObject,
  contributionAlignmentInternalModelPrototypeReviewPacketHash
} from "./run_ai_value_contribution_alignment_internal_model_prototype_review_packet.mjs";
import {
  buildContributionAlignmentInternalResearchDesignGateReviewFromObject,
  contributionAlignmentInternalResearchDesignGateReviewHash,
  validateContributionAlignmentInternalResearchDesignGateReview
} from "./run_ai_value_contribution_alignment_internal_research_design_gate_review.mjs";

const FIXTURE_PATH =
  "docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json";
const PACKET_PATH =
  "docs/contracts/ai-value-research-promotion-readiness-packet/examples/current-controlled-pilot-research-promotion-readiness-packet.json";
const RESEARCH_DESIGN_PATH =
  "docs/research/AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_DESIGN.md";
const RUNNER_IMPLEMENTATION_DECISION_PATH =
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
  "payload_json",
  "source_package_payload",
  "review_packet_payload",
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

function buildPrototypeReviewPacket(overrides = {}) {
  const { sourceRunner, sourceReviewPacket, designReview, prototype } =
    buildPrototype(overrides);
  const prototypeReviewPacket =
    buildContributionAlignmentInternalModelPrototypeReviewPacketFromObject(
      prototype,
      prototypeReviewOptions(
        sourceRunner,
        sourceReviewPacket,
        designReview,
        prototype,
        overrides.runnerOptions
      )
    );
  return { sourceRunner, sourceReviewPacket, designReview, prototype, prototypeReviewPacket };
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

function prototypeReviewOptions(
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

function gateReviewOptions(
  sourceRunner,
  sourceReviewPacket,
  sourceDesignReview,
  sourcePrototype,
  sourcePrototypeReviewPacket,
  overrides = {}
) {
  return {
    ...prototypeReviewOptions(
      sourceRunner,
      sourceReviewPacket,
      sourceDesignReview,
      sourcePrototype,
      overrides
    ),
    sourcePrototypeReviewPacket
  };
}

function hasNestedKey(value, key) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasNestedKey(item, key));
  return Object.entries(value).some(
    ([nestedKey, nestedValue]) => nestedKey === key || hasNestedKey(nestedValue, key)
  );
}

test("contribution alignment internal research-design gate review authorizes only exact-scope method-prototype decision review", () => {
  const {
    sourceRunner,
    sourceReviewPacket,
    designReview,
    prototype,
    prototypeReviewPacket
  } = buildPrototypeReviewPacket();
  const gateReview = buildContributionAlignmentInternalResearchDesignGateReviewFromObject(
    prototypeReviewPacket,
    gateReviewOptions(
      sourceRunner,
      sourceReviewPacket,
      designReview,
      prototype,
      prototypeReviewPacket
    )
  );
  const validation = validateContributionAlignmentInternalResearchDesignGateReview(
    gateReview,
    gateReviewOptions(
      sourceRunner,
      sourceReviewPacket,
      designReview,
      prototype,
      prototypeReviewPacket
    )
  );
  const serialized = JSON.stringify(gateReview);

  assert.equal(validation.valid, true, validation.gaps.join("; "));
  assert.equal(gateReview.gate_state, "READY_FOR_EXACT_SCOPE_METHOD_PROTOTYPE_DECISION");
  assert.equal(
    gateReview.source_prototype_review_packet_ref.review_state,
    "READY_FOR_INTERNAL_RESEARCH_DESIGN_GATE_REVIEW"
  );
  assert.equal(gateReview.gate_scope.internal_only, true);
  assert.equal(gateReview.gate_scope.non_persistent, true);
  assert.equal(gateReview.gate_scope.compact_refs_only, true);
  assert.equal(gateReview.gate_scope.method_prototype_decision_review, true);
  assert.equal(gateReview.gate_scope.research_model_feed, false);
  assert.equal(gateReview.gate_scope.model_result, false);
  assert.equal(gateReview.gate_scope.confidence_output, false);
  assert.equal(gateReview.gate_review_summary.source_packet_state, "source_bound");
  assert.equal(gateReview.gate_review_summary.component_trace_state, "complete");
  assert.equal(gateReview.gate_review_summary.context_separation_state, "preserved");
  assert.equal(gateReview.gate_review_summary.output_boundary_state, "blocked_output_safe");
  assert.equal(
    gateReview.gate_review_summary.allowed_next_step,
    "exact_scope_method_prototype_decision_only"
  );
  assert.equal(gateReview.context_separation_review.ai_fluency_construct_context_state, "present");
  assert.equal(gateReview.context_separation_review.psychological_context_state, "context_only");
  assert.equal(gateReview.context_separation_review.observed_vbd_context_state, "present");
  assert.equal(gateReview.context_separation_review.selected_metric_movement_state, "aligned");
  for (const feed of REQUIRED_FALSE_FEEDS) {
    assert.equal(gateReview.feeds[feed], false, `${feed} must remain false`);
  }
  for (const key of FORBIDDEN_KEYS) {
    assert.equal(hasNestedKey(gateReview, key), false, `${key} must not be emitted`);
  }
  assert.equal(serialized.includes("SELECT"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("confidence_score"), false);
  assert.equal(serialized.includes("equation"), false);
  assert.equal(serialized.includes("coefficient"), false);
  assert.equal(serialized.includes("likelihood"), false);
});

test("contribution alignment internal research-design gate review holds on prototype review packet drift", () => {
  const {
    sourceRunner,
    sourceReviewPacket,
    designReview,
    prototype,
    prototypeReviewPacket
  } = buildPrototypeReviewPacket();
  prototypeReviewPacket.component_trace_review.missing_components = ["source_coverage"];
  prototypeReviewPacket.review_packet_hash =
    contributionAlignmentInternalModelPrototypeReviewPacketHash(prototypeReviewPacket);

  const gateReview = buildContributionAlignmentInternalResearchDesignGateReviewFromObject(
    prototypeReviewPacket,
    gateReviewOptions(
      sourceRunner,
      sourceReviewPacket,
      designReview,
      prototype,
      prototypeReviewPacket
    )
  );
  const validation = validateContributionAlignmentInternalResearchDesignGateReview(
    gateReview,
    gateReviewOptions(
      sourceRunner,
      sourceReviewPacket,
      designReview,
      prototype,
      prototypeReviewPacket
    )
  );

  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, true, validation.gaps.join("; "));
  assert.equal(gateReview.gate_state, "HOLD_FOR_VALID_INTERNAL_MODEL_PROTOTYPE_REVIEW_PACKET");
  assert.equal(gateReview.feeds.method_prototype_decision_review, false);
  assert.equal(gateReview.validation_summary.valid, false);
  assert.ok(
    gateReview.validation_summary.gaps.some((gap) =>
      gap.includes("prototype review packet must match source-prototype-bound expected envelope")
    ),
    gateReview.validation_summary.gaps.join("; ")
  );
});

test("contribution alignment internal research-design gate review fails closed on missing prototype review packet", () => {
  const { sourceRunner, sourceReviewPacket, designReview, prototype } =
    buildPrototypeReviewPacket();
  const gateReview = buildContributionAlignmentInternalResearchDesignGateReviewFromObject(
    undefined,
    gateReviewOptions(sourceRunner, sourceReviewPacket, designReview, prototype, undefined)
  );
  const validation = validateContributionAlignmentInternalResearchDesignGateReview(
    gateReview,
    gateReviewOptions(sourceRunner, sourceReviewPacket, designReview, prototype, undefined)
  );

  assert.equal(gateReview.gate_state, "HOLD_FOR_VALID_INTERNAL_MODEL_PROTOTYPE_REVIEW_PACKET");
  assert.equal(gateReview.feeds.method_prototype_decision_review, false);
  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("sourcePrototypeReviewPacket is required")),
    validation.gaps.join("; ")
  );
});

test("contribution alignment internal research-design gate review validator fails closed on malformed input", () => {
  const {
    sourceRunner,
    sourceReviewPacket,
    designReview,
    prototype,
    prototypeReviewPacket
  } = buildPrototypeReviewPacket();
  const validation = validateContributionAlignmentInternalResearchDesignGateReview(
    undefined,
    gateReviewOptions(
      sourceRunner,
      sourceReviewPacket,
      designReview,
      prototype,
      prototypeReviewPacket
    )
  );

  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("research-design gate review must be an object")),
    validation.gaps.join("; ")
  );
});

test("contribution alignment internal research-design gate review holds without copying unsafe held-source strings", () => {
  const {
    sourceRunner,
    sourceReviewPacket,
    designReview,
    prototype,
    prototypeReviewPacket
  } = buildPrototypeReviewPacket();
  prototypeReviewPacket.source_prototype_ref.prototype_id =
    "SELECT user_id FROM raw_rows WHERE email = person@example.com";
  prototypeReviewPacket.review_packet_hash =
    contributionAlignmentInternalModelPrototypeReviewPacketHash(prototypeReviewPacket);

  const gateReview = buildContributionAlignmentInternalResearchDesignGateReviewFromObject(
    prototypeReviewPacket,
    gateReviewOptions(
      sourceRunner,
      sourceReviewPacket,
      designReview,
      prototype,
      prototypeReviewPacket
    )
  );
  const validation = validateContributionAlignmentInternalResearchDesignGateReview(
    gateReview,
    gateReviewOptions(
      sourceRunner,
      sourceReviewPacket,
      designReview,
      prototype,
      prototypeReviewPacket
    )
  );
  const serialized = JSON.stringify(gateReview);

  assert.equal(validation.valid, false);
  assert.equal(gateReview.gate_state, "HOLD_FOR_VALID_INTERNAL_MODEL_PROTOTYPE_REVIEW_PACKET");
  assert.equal(serialized.includes("SELECT"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(gateReview.boundary_policy.receives_raw_rows, false);
});

test("contribution alignment internal research-design gate review rejects payload smuggling", () => {
  const {
    sourceRunner,
    sourceReviewPacket,
    designReview,
    prototype,
    prototypeReviewPacket
  } = buildPrototypeReviewPacket();
  const gateReview = buildContributionAlignmentInternalResearchDesignGateReviewFromObject(
    prototypeReviewPacket,
    gateReviewOptions(
      sourceRunner,
      sourceReviewPacket,
      designReview,
      prototype,
      prototypeReviewPacket
    )
  );
  gateReview.payload_json = {
    raw_rows: [{ email: "person@example.com" }],
    model_result: { confidence_score: 0.92 },
    query_text: "SELECT user_id FROM raw_rows"
  };

  const validation = validateContributionAlignmentInternalResearchDesignGateReview(
    gateReview,
    gateReviewOptions(
      sourceRunner,
      sourceReviewPacket,
      designReview,
      prototype,
      prototypeReviewPacket
    )
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("forbidden field name")),
    validation.gaps.join("; ")
  );
});

test("contribution alignment internal research-design gate review validation output does not echo unsafe ids, states, or keys", () => {
  const {
    sourceRunner,
    sourceReviewPacket,
    designReview,
    prototype,
    prototypeReviewPacket
  } = buildPrototypeReviewPacket();
  const gateReview = buildContributionAlignmentInternalResearchDesignGateReviewFromObject(
    prototypeReviewPacket,
    gateReviewOptions(
      sourceRunner,
      sourceReviewPacket,
      designReview,
      prototype,
      prototypeReviewPacket
    )
  );
  gateReview.gate_review_id = "SELECT user_id FROM raw_rows WHERE email = person@example.com";
  gateReview.gate_state = "confidence_output_ready";
  gateReview["SELECT user_id FROM raw_rows"] = true;
  gateReview.gate_scope["person@example.com"] = true;
  gateReview.feeds.raw_rows = true;
  gateReview.boundary_policy.query_text = true;
  gateReview.gate_review_hash =
    contributionAlignmentInternalResearchDesignGateReviewHash(gateReview);

  const validation = validateContributionAlignmentInternalResearchDesignGateReview(
    gateReview,
    gateReviewOptions(
      sourceRunner,
      sourceReviewPacket,
      designReview,
      prototype,
      prototypeReviewPacket
    )
  );
  const serialized = JSON.stringify(validation);

  assert.equal(validation.valid, false);
  assert.equal(validation.gate_review_id, null);
  assert.equal(validation.gate_state, null);
  assert.equal(serialized.includes("SELECT user_id"), false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("confidence_output_ready"), false);
  assert.equal(serialized.includes("raw_rows"), false);
  assert.equal(serialized.includes("query_text"), false);
});

test("contribution alignment internal research-design gate review validation propagates missing upstream source gaps", () => {
  const { prototypeReviewPacket } = buildPrototypeReviewPacket();
  const gateReview = buildContributionAlignmentInternalResearchDesignGateReviewFromObject(
    prototypeReviewPacket,
    { sourcePrototypeReviewPacket: prototypeReviewPacket }
  );
  const validation = validateContributionAlignmentInternalResearchDesignGateReview(
    gateReview,
    { sourcePrototypeReviewPacket: prototypeReviewPacket }
  );

  assert.equal(validation.valid, false);
  assert.equal(validation.envelope_valid, false);
  assert.ok(
    validation.gaps.some((gap) => gap.includes("sourcePrototype is required")),
    validation.gaps.join("; ")
  );
});

test("contribution alignment internal research-design gate review rejects tampering after rehash", () => {
  const {
    sourceRunner,
    sourceReviewPacket,
    designReview,
    prototype,
    prototypeReviewPacket
  } = buildPrototypeReviewPacket();
  const gateReview = buildContributionAlignmentInternalResearchDesignGateReviewFromObject(
    prototypeReviewPacket,
    gateReviewOptions(
      sourceRunner,
      sourceReviewPacket,
      designReview,
      prototype,
      prototypeReviewPacket
    )
  );
  gateReview.source_prototype_review_packet_ref.review_packet_id = "forged_packet";
  gateReview.context_separation_review.observed_vbd_context_state = "missing";
  gateReview.gate_review_hash =
    contributionAlignmentInternalResearchDesignGateReviewHash(gateReview);

  const validation = validateContributionAlignmentInternalResearchDesignGateReview(
    gateReview,
    gateReviewOptions(
      sourceRunner,
      sourceReviewPacket,
      designReview,
      prototype,
      prototypeReviewPacket
    )
  );

  assert.equal(validation.valid, false);
  assert.ok(
    validation.gaps.some((gap) =>
      gap.includes("research-design gate review must match source-review-packet-bound expected envelope")
    ),
    validation.gaps.join("; ")
  );
});

test("contribution alignment internal research-design gate review CLI emits compact gate review", () => {
  const output = execFileSync(
    "node",
    [
      "scripts/run_ai_value_contribution_alignment_internal_research_design_gate_review.mjs",
      PACKET_PATH,
      `--source-fixture=${FIXTURE_PATH}`,
      `--research-design=${RESEARCH_DESIGN_PATH}`
    ],
    { encoding: "utf8" }
  );
  const gateReview = JSON.parse(output);

  assert.equal(gateReview.gate_state, "READY_FOR_EXACT_SCOPE_METHOD_PROTOTYPE_DECISION");
  assert.equal(gateReview.feeds.method_prototype_decision_review, true);
  assert.equal(gateReview.feeds.research_model_feed, false);
  assert.equal(gateReview.feeds.model_output, false);
  assert.equal(gateReview.feeds.confidence_output, false);
  assert.equal(gateReview.feeds.finance_output, false);
  assert.equal(gateReview.feeds.customer_facing_output, false);
  assert.equal(output.includes("SELECT"), false);
  assert.equal(output.includes("person@example.com"), false);
});

test("contribution alignment internal research-design gate review CLI honors approved non-default research design path", () => {
  const tmpDir = mkdtempSync(join(tmpdir(), "ft-internal-research-design-gate-eq=-"));
  const copiedDesignPath = join(tmpDir, "copied-internal-research-design.md");
  writeFileSync(copiedDesignPath, readText(RESEARCH_DESIGN_PATH), "utf8");

  try {
    const output = execFileSync(
      "node",
      [
        "scripts/run_ai_value_contribution_alignment_internal_research_design_gate_review.mjs",
        PACKET_PATH,
        `--source-fixture=${FIXTURE_PATH}`,
        `--research-design=${copiedDesignPath}`
      ],
      { encoding: "utf8" }
    );
    const gateReview = JSON.parse(output);

    assert.equal(gateReview.gate_state, "READY_FOR_EXACT_SCOPE_METHOD_PROTOTYPE_DECISION");
    assert.equal(gateReview.feeds.method_prototype_decision_review, true);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
