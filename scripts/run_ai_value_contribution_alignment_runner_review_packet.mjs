#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildContributionAlignmentInternalPrototypeRunnerFromObject,
  validateContributionAlignmentInternalPrototypeRunner
} from "./run_ai_value_contribution_alignment_internal_prototype_runner.mjs";

export const CONTRIBUTION_ALIGNMENT_RUNNER_REVIEW_PACKET_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_RUNNER_REVIEW_PACKET_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_RUNNER_REVIEW_PACKET_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_contribution_alignment_runner_review_packet_2026_06";

const READY_STATE = "READY_FOR_INTERNAL_MODEL_PROTOTYPE_DESIGN_REVIEW";
const HOLD_RUNNER_STATE = "HOLD_FOR_VALID_INTERNAL_PROTOTYPE_RUNNER";
const REJECT_BOUNDARY_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const IMPLEMENTATION_DECISION_PATH =
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

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "review_packet_id",
  "review_state",
  "generated_at",
  "derivation_version",
  "runner_ref",
  "design_authorization",
  "design_strength_cap",
  "source_bound_posture",
  "selected_expectation_path_ref",
  "milestone_review",
  "context_separation",
  "model_prototype_design_requirements",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "boundary_policy",
  "validation_summary",
  "review_packet_hash"
]);

const RUNNER_REF_FIELDS = new Set([
  "runner_id",
  "runner_state",
  "runner_hash",
  "packet_ref",
  "research_design_ref",
  "implementation_decision_ref",
  "design_strength_cap"
]);

const DESIGN_AUTHORIZATION_FIELDS = [
  "internal_model_prototype_design_drafting",
  "model_implementation",
  "numeric_weights",
  "confidence_output",
  "model_result",
  "probability_output",
  "score_like_output",
  "finance_output",
  "customer_output",
  "route_creation",
  "ui_creation",
  "schema_creation",
  "persistence_write",
  "export_creation",
  "live_connector_execution"
];

const BOUNDARY_POLICY_FIELDS = [
  "receives_compact_runner_envelope_only",
  "receives_full_runner_payload",
  "receives_raw_rows",
  "receives_query_text",
  "receives_prompts",
  "receives_transcripts",
  "receives_identifiers",
  "receives_source_package_payloads",
  "receives_full_measurement_cell_payloads",
  "persists_review_packet",
  "creates_routes",
  "creates_ui",
  "creates_schemas",
  "creates_exports",
  "runs_live_connectors",
  "feeds_research_model",
  "emits_model_result",
  "emits_numeric_weights",
  "emits_confidence_output",
  "emits_probability",
  "emits_score_like_output",
  "emits_finance_output",
  "emits_customer_facing_output",
  "computes_roi",
  "claims_causality",
  "measures_productivity"
];

const REQUIRED_BLOCKED_USES = [
  "model_implementation",
  "research_model_feed",
  "model_output",
  "numeric_weights",
  "confidence_output",
  "contribution_model_output",
  "probability_output",
  "score_like_output",
  "finance_output",
  "finance_context_investigation",
  "roi",
  "ebitda",
  "financial_attribution",
  "causality_claim",
  "productivity_measurement",
  "customer_facing_output",
  "customer_facing_export",
  "live_connector_execution",
  "route_creation",
  "ui_creation",
  "schema_creation",
  "persistence_write",
  "raw_data_storage"
];

const REQUIRED_CAVEATS = [
  "Runner review packet is internal method-design gating only.",
  "Ready state authorizes only drafting a separate internal model-prototype design review.",
  "The packet consumes compact runner refs and hashes only.",
  "The packet does not authorize model implementation, numeric weights, confidence output, probability, score-like output, finance output, ROI, causality, productivity, or customer-facing output.",
  "AI Fluency construct context, psychological context, observed VBD context, and selected customer metric movement remain distinct."
];

const REQUIRED_DESIGN_REQUIREMENTS = [
  "approved_path_binding_required",
  "source_review_posture_required",
  "milestone_continuity_required",
  "ai_fluency_construct_context_separated",
  "psychological_context_separated",
  "observed_vbd_context_separated",
  "selected_customer_metric_movement_required",
  "assumption_governance_required",
  "blocked_output_review_required",
  "separate_promotion_decision_required"
];

const FORBIDDEN_KEY_PATTERNS = [
  /raw_?rows?/i,
  /^rows$/i,
  /^records$/i,
  /^events$/i,
  /query_?text/i,
  /sql_?text/i,
  /\bsql\b/i,
  /prompt/i,
  /response/i,
  /transcript/i,
  /raw_?text/i,
  /survey_?item/i,
  /respondent/i,
  /user_?id/i,
  /employee_?id/i,
  /person_?id/i,
  /^email$/i,
  /row_?id/i,
  /span_?id/i,
  /hashed.*identifier/i,
  /joinable.*identifier/i,
  /source_?package_?payload/i,
  /handoff_?bundle_?payload/i,
  /measurement_?cell_?payload/i,
  /series_?payload/i,
  /full_?runner_?payload/i,
  /payload_?json/i,
  /model_?result/i,
  /model_?output/i,
  /numeric_?weight/i,
  /confidence_?score/i,
  /contribution_?score/i,
  /probability/i,
  /posterior/i,
  /\broi\b/i,
  /ebitda/i,
  /finance_?result/i,
  /finance_?output/i,
  /causality/i,
  /productivity/i,
  /customer_?facing_?result/i,
  /customer_?facing_?output/i,
  /export_?payload/i,
  /route_?payload/i,
  /ui_?payload/i,
  /credential/i,
  /secret/i
];

const FORBIDDEN_VALUE_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\bselect\b[\s\S]+\bfrom\b/i,
  /\bsql\b/i,
  /\bbquxjob_/i,
  /https?:\/\//i,
  /\braw rows?\b/i,
  /raw[_-\s]?rows?/i,
  /\bquery text\b/i,
  /query[_-\s]?text/i,
  /\bsql text\b/i,
  /prompt/i,
  /transcript/i,
  /(?:^|_)(?:user|employee|person|respondent)_(?:id|identifier|email|name)(?:_|$)/i,
  /hashed[_-\s]?(?:user|person|employee|respondent)/i,
  /joinable[_-\s]?(?:user|person|employee|respondent)/i,
  /row[_-\s]?id/i,
  /span[_-\s]?id/i,
  /person@example\.com/i,
  /source_package_(?:payload|clearance|cleared|approved|passed)/i,
  /operator_source_handoff_bundle/i,
  /measurement_cell_payload/i,
  /measurement_cell_series_payload/i,
  /approved_expectation_paths/i,
  /payload_json/i,
  /validation_json/i,
  /source_refs_json/i,
  /blueprint_path_binding_json/i,
  /research[_-\s]?model/i,
  /model[_-\s]?(?:result|output|outputs|training|feed|approved|approval|authorized|authorization)/i,
  /statistical[_-\s]?model[_-\s]?selection/i,
  /durable[_-\s]?research[_-\s]?inputs/i,
  /feature[_-\s]?table/i,
  /prediction[_-\s]?output/i,
  /^\s*[\[{]/,
  /\bconfidence score\b/i,
  /confidence[_-\s]?(?:score|percentage|percent|model|output|ready)/i,
  /\bcontribution score\b/i,
  /customer[-_\s]?facing\s+confidence/i,
  /\bprobability of contribution\b/i,
  /probability/i,
  /score[_-\s]?(?:like|output|ready|field)?/i,
  /numeric[_-\s]?weight/i,
  /finance[_-\s]?(?:output|claim|result|ready)/i,
  /financial[_-\s]?attribution/i,
  /\bproved roi\b/i,
  /\bpredicted roi\b/i,
  /\brealized roi\b/i,
  /\broi\b/i,
  /\bebitda\b/i,
  /causal(?:ity)?/i,
  /\bcaused\b/i,
  /\bproductivity\b/i,
  /\bcustomer-facing confidence\b/i
];

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Text(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function sha256Json(value) {
  return sha256Text(stableStringify(value));
}

function clone(value) {
  if (value === undefined || value === null) return null;
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function falseMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, false]));
}

function sanitizeGaps(gaps) {
  return [...new Set(gaps.filter(Boolean))].sort();
}

function exactArrayGaps(value, expected, path) {
  const gaps = [];
  if (!Array.isArray(value)) return [`${path} must be an array`];
  if (value.length !== expected.length) gaps.push(`${path} must contain only governed values`);
  for (const item of expected) {
    if (!value.includes(item)) gaps.push(`${path} missing ${item}`);
  }
  value.forEach((item, index) => {
    if (!expected.includes(item)) {
      gaps.push(`${path} contains ungoverned value at index ${index}`);
    }
  });
  return gaps;
}

function compactScalar(value, allowedUnsafeValues = []) {
  if (value === undefined || value === null) return null;
  if (!["string", "number", "boolean"].includes(typeof value)) return null;
  if (allowedUnsafeValues.includes(value)) return value;
  if (
    typeof value === "string" &&
    FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
  ) {
    return null;
  }
  return value;
}

function compactNumber(value) {
  return Number.isFinite(value) ? value : null;
}

function compactBoolean(value) {
  return typeof value === "boolean" ? value : false;
}

function compactScalarArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => compactScalar(item))
    .filter((item) => item !== null);
}

function safeValidationGap(gap) {
  const text = String(gap ?? "");
  if (text.includes("runner output must match source-bound expected envelope")) {
    return "internal_prototype_runner: runner output must match source-bound expected envelope";
  }
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(text))) {
    return "internal_prototype_runner rejected unsafe or invalid source-runner content";
  }
  if (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(text))) {
    return "internal_prototype_runner rejected unsafe or invalid source-runner content";
  }
  return `internal_prototype_runner: ${text}`;
}

function compactContextRef(ref) {
  return {
    ref_state: compactScalar(ref?.ref_state),
    context_ref: compactScalar(ref?.context_ref),
    source_ref: compactScalar(ref?.source_ref),
    context_scope: compactScalar(ref?.context_scope),
    readiness_effect: compactScalar(ref?.readiness_effect),
    source_hash: compactScalar(ref?.source_hash)
  };
}

function compactMetricMovementRef(ref) {
  return {
    ref_state: compactScalar(ref?.ref_state),
    context_ref: compactScalar(ref?.context_ref),
    source_ref: compactScalar(ref?.source_ref),
    metric_id: compactScalar(ref?.metric_id),
    metric_direction: compactScalar(ref?.metric_direction),
    metric_lag_days: compactNumber(ref?.metric_lag_days),
    movement_state: compactScalar(ref?.movement_state),
    freshness_state: compactScalar(ref?.freshness_state),
    window_status: compactScalar(ref?.window_status),
    window_alignment_state: compactScalar(ref?.window_alignment_state),
    source_hash: compactScalar(ref?.source_hash)
  };
}

function compactExpectedPathwayMetadata(metadata) {
  return {
    expected_behavior: compactScalar(metadata?.expected_behavior),
    observed_vbd_signal: compactScalar(metadata?.observed_vbd_signal),
    metric_id: compactScalar(metadata?.metric_id),
    metric_direction: compactScalar(metadata?.metric_direction),
    metric_lag_days: compactNumber(metadata?.metric_lag_days),
    value_driver: compactScalar(metadata?.value_driver)
  };
}

function compactSelectedExpectationPathRef(ref) {
  return {
    approved_blueprint_ref: compactScalar(ref?.approved_blueprint_ref),
    value_hypothesis_ref: compactScalar(ref?.value_hypothesis_ref),
    approved_blueprint_payload_hash: compactScalar(ref?.approved_blueprint_payload_hash),
    expectation_path_id: compactScalar(ref?.expectation_path_id),
    expectation_path_version: compactScalar(ref?.expectation_path_version),
    expectation_path_hash: compactScalar(ref?.expectation_path_hash),
    approved_at: compactScalar(ref?.approved_at),
    approved_by_role: compactScalar(ref?.approved_by_role),
    approval_state: compactScalar(ref?.approval_state),
    expected_pathway_metadata: compactExpectedPathwayMetadata(
      ref?.expected_pathway_metadata
    )
  };
}

function compactReviewSnapshotRef(ref) {
  return {
    window_id: compactScalar(ref?.window_id),
    milestone_day: compactNumber(ref?.milestone_day),
    status: compactScalar(ref?.status),
    snapshot_ref: compactScalar(ref?.snapshot_ref),
    assembly_run_ref: compactScalar(ref?.assembly_run_ref),
    metric_id: compactScalar(ref?.metric_id),
    metric_direction: compactScalar(ref?.metric_direction),
    metric_lag_days: compactNumber(ref?.metric_lag_days),
    expectation_path_id: compactScalar(ref?.expectation_path_id),
    expectation_path_version: compactScalar(ref?.expectation_path_version),
    expectation_path_hash: compactScalar(ref?.expectation_path_hash),
    value_hypothesis_ref: compactScalar(ref?.value_hypothesis_ref),
    value_driver: compactScalar(ref?.value_driver)
  };
}

function compactRunnerRef(runner) {
  return {
    runner_id: compactScalar(runner?.runner_id),
    runner_state: compactScalar(runner?.runner_state),
    runner_hash: compactScalar(runner?.runner_hash),
    packet_ref: {
      research_promotion_packet_id:
        compactScalar(runner?.packet_ref?.research_promotion_packet_id),
      packet_integrity_hash: compactScalar(runner?.packet_ref?.packet_integrity_hash),
      packet_decision: compactScalar(runner?.packet_ref?.packet_decision),
      source_fixture_bound: compactBoolean(runner?.packet_ref?.source_fixture_bound),
      packet_validation_valid: compactBoolean(runner?.packet_ref?.packet_validation_valid)
    },
    research_design_ref: {
      design_path: compactScalar(runner?.research_design_ref?.design_path),
      design_hash: compactScalar(runner?.research_design_ref?.design_hash),
      design_decision: compactScalar(runner?.research_design_ref?.design_decision),
      design_posture: compactScalar(
        runner?.research_design_ref?.design_posture,
        ["HOLD_RESEARCH_MODEL_IMPLEMENTATION"]
      ),
      design_validation_valid:
        compactBoolean(runner?.research_design_ref?.design_validation_valid)
    },
    implementation_decision_ref: {
      decision: compactScalar(runner?.implementation_decision_ref?.decision),
      decision_path: compactScalar(runner?.implementation_decision_ref?.decision_path),
      decision_hash: compactScalar(runner?.implementation_decision_ref?.decision_hash),
      implementation_scope:
        compactScalar(runner?.implementation_decision_ref?.implementation_scope),
      model_implementation_posture:
        compactScalar(
          runner?.implementation_decision_ref?.model_implementation_posture,
          ["HOLD_RESEARCH_MODEL_IMPLEMENTATION"]
        ),
      customer_output_posture:
        compactScalar(runner?.implementation_decision_ref?.customer_output_posture)
    },
    design_strength_cap: compactScalar(runner?.design_strength_cap)
  };
}

function hasForbiddenContent(value, path = "review") {
  const gaps = [];
  const safeFalseBoundaryFlag =
    value === false &&
    (
      path.startsWith("review.feeds.") ||
      path.startsWith("review.boundary_policy.") ||
      path.startsWith("review.design_authorization.")
    );
  if (safeFalseBoundaryFlag) return gaps;
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      gaps.push(...hasForbiddenContent(item, `${path}[${index}]`));
    });
    return gaps;
  }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      const nestedPath = `${path}.${key}`;
      const safeNegativeBoundaryKey =
        nested === false &&
        (
          path === "review.feeds" ||
          path === "review.boundary_policy" ||
          path === "review.design_authorization"
        );
      if (
        !safeNegativeBoundaryKey &&
        FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))
      ) {
        gaps.push(`${nestedPath} must not contain raw rows, query text, identifiers, model, finance, customer-facing, or generic payload fields`);
      }
      gaps.push(...hasForbiddenContent(nested, nestedPath));
    }
    return gaps;
  }
  if (typeof value === "string") {
    if (
      [
        "review.runner_ref.research_design_ref.design_posture",
        "review.runner_ref.implementation_decision_ref.model_implementation_posture"
      ].includes(path) &&
      value === "HOLD_RESEARCH_MODEL_IMPLEMENTATION"
    ) {
      return gaps;
    }
    if (
      path.startsWith("review.blocked_uses[") &&
      REQUIRED_BLOCKED_USES.includes(value)
    ) {
      return gaps;
    }
    if (
      path.startsWith("review.required_caveats[") &&
      REQUIRED_CAVEATS.includes(value)
    ) {
      return gaps;
    }
    for (const pattern of FORBIDDEN_VALUE_PATTERNS) {
      if (pattern.test(value)) {
        gaps.push(`${path} contains unsafe model, finance, raw, identifier, or customer-facing language`);
      }
    }
  }
  return gaps;
}

function sourceRunnerValidationFor(runner, options = {}) {
  if (!runner) {
    return {
      valid: false,
      gaps: ["source runner is required"]
    };
  }
  return validateContributionAlignmentInternalPrototypeRunner(runner, {
    sourcePacket: options.sourcePacket,
    sourceFixture: options.sourceFixture,
    researchDesignText: options.researchDesignText,
    researchDesignPath: options.researchDesignPath,
    implementationDecisionText: options.implementationDecisionText,
    cwd: options.cwd ?? process.cwd()
  });
}

function reviewStateFor(runner, runnerValidation, reviewContentGaps) {
  if (reviewContentGaps.length > 0) return REJECT_BOUNDARY_STATE;
  const runnerReady =
    runner?.runner_state === "READY_FOR_INTERNAL_ALIGNMENT_REVIEW" &&
    runner?.feeds?.internal_alignment_review === true &&
    runnerValidation.valid === true;
  return runnerReady ? READY_STATE : HOLD_RUNNER_STATE;
}

export function contributionAlignmentRunnerReviewPacketHash(reviewPacket) {
  const withoutHash = { ...reviewPacket };
  delete withoutHash.review_packet_hash;
  return sha256Json(withoutHash);
}

function buildBaseReviewPacket(sourceRunner, options = {}) {
  const runner = clone(sourceRunner);
  const runnerValidation = sourceRunnerValidationFor(runner, options);
  const preliminaryContentGaps = [];
  const reviewState = reviewStateFor(runner, runnerValidation, preliminaryContentGaps);
  const readyForDesignReview = reviewState === READY_STATE;
  const validationGaps = sanitizeGaps(runnerValidation.gaps.map(safeValidationGap));

  let reviewPacket = {
    schema_version: CONTRIBUTION_ALIGNMENT_RUNNER_REVIEW_PACKET_SCHEMA_VERSION,
    review_packet_id: `contribution_alignment_runner_review_${sha256Json({
      runner_id: runner?.runner_id ?? null,
      runner_hash: runner?.runner_hash ?? null,
      packet_ref: runner?.packet_ref ?? null
    }).slice(0, 16)}`,
    review_state: reviewState,
    generated_at: "2026-06-24T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    runner_ref: compactRunnerRef(runner),
    design_authorization: {
      internal_model_prototype_design_drafting: readyForDesignReview,
      model_implementation: false,
      numeric_weights: false,
      confidence_output: false,
      model_result: false,
      probability_output: false,
      score_like_output: false,
      finance_output: false,
      customer_output: false,
      route_creation: false,
      ui_creation: false,
      schema_creation: false,
      persistence_write: false,
      export_creation: false,
      live_connector_execution: false
    },
    design_strength_cap: "METHOD_DESIGN_ONLY",
    source_bound_posture: {
      source_runner_valid: runnerValidation.valid,
      runner_state: compactScalar(runner?.runner_state),
      runner_hash: compactScalar(runner?.runner_hash),
      packet_decision: compactScalar(runner?.packet_ref?.packet_decision),
      packet_integrity_hash: compactScalar(runner?.packet_ref?.packet_integrity_hash),
      source_fixture_bound: compactBoolean(runner?.packet_ref?.source_fixture_bound),
      interpretation_cap: "METHOD_DESIGN_ONLY"
    },
    selected_expectation_path_ref: compactSelectedExpectationPathRef(
      runner?.selected_expectation_path_ref
    ),
    milestone_review: {
      required_milestones: compactScalarArray(
        runner?.milestone_review?.required_milestones
      ),
      observed_milestones: compactScalarArray(
        runner?.milestone_review?.observed_milestones
      ),
      missing_milestones: compactScalarArray(
        runner?.milestone_review?.missing_milestones
      ),
      ready_windows: compactNumber(runner?.milestone_review?.ready_windows) ?? 0,
      held_windows: compactNumber(runner?.milestone_review?.held_windows) ?? 0,
      suppressed_windows:
        compactNumber(runner?.milestone_review?.suppressed_windows) ?? 0,
      missing_windows: compactNumber(runner?.milestone_review?.missing_windows) ?? 0,
      blocked_windows: compactNumber(runner?.milestone_review?.blocked_windows) ?? 0,
      compact_snapshot_refs: (runner?.milestone_review?.compact_snapshot_refs ?? []).map(
        compactReviewSnapshotRef
      )
    },
    context_separation: {
      ai_fluency_construct_context_ref: compactContextRef(
        runner?.context_refs?.ai_fluency_construct_context_ref
      ),
      ai_fluency_psychological_context_ref: compactContextRef(
        runner?.context_refs?.ai_fluency_psychological_context_ref
      ),
      observed_vbd_context_ref: compactContextRef(
        runner?.context_refs?.observed_vbd_context_ref
      ),
      selected_metric_movement_ref: compactMetricMovementRef(
        runner?.context_refs?.selected_metric_movement_ref
      ),
      separation_rule:
        "AI Fluency construct context, psychological context, observed VBD context, and selected customer metric movement must not be collapsed."
    },
    model_prototype_design_requirements: [...REQUIRED_DESIGN_REQUIREMENTS],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      internal_model_prototype_design_review: readyForDesignReview,
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: {
      receives_compact_runner_envelope_only: true,
      receives_full_runner_payload: false,
      receives_raw_rows: false,
      receives_query_text: false,
      receives_prompts: false,
      receives_transcripts: false,
      receives_identifiers: false,
      receives_source_package_payloads: false,
      receives_full_measurement_cell_payloads: false,
      persists_review_packet: false,
      creates_routes: false,
      creates_ui: false,
      creates_schemas: false,
      creates_exports: false,
      runs_live_connectors: false,
      feeds_research_model: false,
      emits_model_result: false,
      emits_numeric_weights: false,
      emits_confidence_output: false,
      emits_probability: false,
      emits_score_like_output: false,
      emits_finance_output: false,
      emits_customer_facing_output: false,
      computes_roi: false,
      claims_causality: false,
      measures_productivity: false
    },
    validation_summary: {
      schema_version: `${CONTRIBUTION_ALIGNMENT_RUNNER_REVIEW_PACKET_SCHEMA_VERSION}_SUMMARY`,
      valid: readyForDesignReview,
      review_state: reviewState,
      gaps: validationGaps
    }
  };

  const reviewContentGaps = hasForbiddenContent(reviewPacket);
  if (reviewContentGaps.length > 0) {
    reviewPacket = {
      ...reviewPacket,
      review_state: REJECT_BOUNDARY_STATE,
      design_authorization: {
        ...reviewPacket.design_authorization,
        internal_model_prototype_design_drafting: false
      },
      feeds: {
        ...reviewPacket.feeds,
        internal_model_prototype_design_review: false
      },
      validation_summary: {
        ...reviewPacket.validation_summary,
        valid: false,
        review_state: REJECT_BOUNDARY_STATE,
        gaps: sanitizeGaps([...validationGaps, ...reviewContentGaps])
      }
    };
  }
  reviewPacket.review_packet_hash =
    contributionAlignmentRunnerReviewPacketHash(reviewPacket);
  return reviewPacket;
}

export function buildContributionAlignmentRunnerReviewPacketFromObject(
  sourceRunner,
  options = {}
) {
  return buildBaseReviewPacket(sourceRunner, {
    ...options,
    cwd: options.cwd ?? process.cwd()
  });
}

function collectShapeGaps(reviewPacket) {
  const gaps = [];
  if (!isPlainObject(reviewPacket)) return ["review packet must be an object"];
  for (const key of Object.keys(reviewPacket)) {
    if (!TOP_LEVEL_FIELDS.has(key)) gaps.push(`unexpected top-level field: ${key}`);
  }
  if (reviewPacket.schema_version !== CONTRIBUTION_ALIGNMENT_RUNNER_REVIEW_PACKET_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  if (![READY_STATE, HOLD_RUNNER_STATE, REJECT_BOUNDARY_STATE].includes(reviewPacket.review_state)) {
    gaps.push("review_state is invalid");
  }

  if (!isPlainObject(reviewPacket.runner_ref)) {
    gaps.push("runner_ref is required");
  } else {
    for (const key of Object.keys(reviewPacket.runner_ref)) {
      if (!RUNNER_REF_FIELDS.has(key)) gaps.push(`runner_ref.${key} is not allowed`);
    }
  }

  if (!isPlainObject(reviewPacket.design_authorization)) {
    gaps.push("design_authorization is required");
  } else {
    for (const key of Object.keys(reviewPacket.design_authorization)) {
      if (!DESIGN_AUTHORIZATION_FIELDS.includes(key)) {
        gaps.push(`design_authorization.${key} is not allowed`);
      }
    }
    if (
      reviewPacket.design_authorization.internal_model_prototype_design_drafting !==
      (reviewPacket.review_state === READY_STATE)
    ) {
      gaps.push("design_authorization.internal_model_prototype_design_drafting must match ready review state");
    }
    for (const field of DESIGN_AUTHORIZATION_FIELDS) {
      if (field === "internal_model_prototype_design_drafting") continue;
      if (reviewPacket.design_authorization[field] !== false) {
        gaps.push(`design_authorization.${field} must remain false`);
      }
    }
  }

  if (reviewPacket.design_strength_cap !== "METHOD_DESIGN_ONLY") {
    gaps.push("design_strength_cap must remain METHOD_DESIGN_ONLY");
  }

  const feeds = reviewPacket.feeds ?? {};
  if (
    feeds.internal_model_prototype_design_review !==
    (reviewPacket.review_state === READY_STATE)
  ) {
    gaps.push("feeds.internal_model_prototype_design_review must be true only for ready review packets");
  }
  for (const feed of FALSE_FEEDS) {
    if (feeds[feed] !== false) gaps.push(`feeds.${feed} must remain false`);
  }
  for (const key of Object.keys(feeds)) {
    if (key !== "internal_model_prototype_design_review" && !FALSE_FEEDS.includes(key)) {
      gaps.push(`feeds.${key} is not allowed`);
    }
  }

  for (const field of BOUNDARY_POLICY_FIELDS) {
    if (field === "receives_compact_runner_envelope_only") {
      if (reviewPacket.boundary_policy?.[field] !== true) {
        gaps.push("boundary_policy.receives_compact_runner_envelope_only must be true");
      }
    } else if (reviewPacket.boundary_policy?.[field] !== false) {
      gaps.push(`boundary_policy.${field} must remain false`);
    }
  }
  for (const key of Object.keys(reviewPacket.boundary_policy ?? {})) {
    if (!BOUNDARY_POLICY_FIELDS.includes(key)) {
      gaps.push(`boundary_policy.${key} is not allowed`);
    }
  }

  gaps.push(
    ...exactArrayGaps(
      reviewPacket.model_prototype_design_requirements,
      REQUIRED_DESIGN_REQUIREMENTS,
      "model_prototype_design_requirements"
    )
  );
  gaps.push(...exactArrayGaps(reviewPacket.blocked_uses, REQUIRED_BLOCKED_USES, "blocked_uses"));
  gaps.push(
    ...exactArrayGaps(reviewPacket.required_caveats, REQUIRED_CAVEATS, "required_caveats")
  );

  const validationSummary = reviewPacket.validation_summary ?? {};
  if (validationSummary.review_state !== reviewPacket.review_state) {
    gaps.push("validation_summary.review_state must match review_state");
  }
  if (validationSummary.valid !== (reviewPacket.review_state === READY_STATE)) {
    gaps.push("validation_summary.valid must match review_state readiness");
  }
  if (!Array.isArray(validationSummary.gaps)) {
    gaps.push("validation_summary.gaps must be an array");
  } else if (
    reviewPacket.review_state === READY_STATE &&
    validationSummary.gaps.length > 0
  ) {
    gaps.push("validation_summary.gaps must be empty for ready review packets");
  }

  if (
    reviewPacket.review_packet_hash !==
    contributionAlignmentRunnerReviewPacketHash(reviewPacket)
  ) {
    gaps.push("review_packet_hash must match compact review packet");
  }

  return gaps;
}

function collectSourceBindingGaps(reviewPacket, options = {}) {
  const gaps = [];
  if (!isPlainObject(reviewPacket)) {
    gaps.push("review packet must be an object");
    return gaps;
  }
  if (!options.sourceRunner) {
    gaps.push("sourceRunner is required for review packet validation");
    return gaps;
  }
  const runnerValidation = sourceRunnerValidationFor(options.sourceRunner, options);
  const expectedReviewPacket = buildBaseReviewPacket(options.sourceRunner, {
    sourcePacket: options.sourcePacket,
    sourceFixture: options.sourceFixture,
    researchDesignText: options.researchDesignText,
    researchDesignPath: options.researchDesignPath,
    implementationDecisionText: options.implementationDecisionText,
    cwd: options.cwd ?? process.cwd()
  });
  const expectedWithoutHash = clone(expectedReviewPacket);
  const actualWithoutHash = clone(reviewPacket);
  delete expectedWithoutHash.review_packet_hash;
  delete actualWithoutHash.review_packet_hash;
  if (JSON.stringify(actualWithoutHash) !== JSON.stringify(expectedWithoutHash)) {
    gaps.push("review packet must match source-runner-bound expected envelope");
  }
  if (reviewPacket.runner_ref?.runner_id !== options.sourceRunner.runner_id) {
    gaps.push("runner_ref.runner_id drifted");
  }
  if (reviewPacket.runner_ref?.runner_hash !== options.sourceRunner.runner_hash) {
    gaps.push("runner_ref.runner_hash drifted");
  }
  const expectedState = reviewStateFor(options.sourceRunner, runnerValidation, []);
  if (reviewPacket.review_state !== expectedState) {
    gaps.push(`review_state must be ${expectedState}`);
  }
  return gaps;
}

export function validateContributionAlignmentRunnerReviewPacket(
  reviewPacket,
  options = {}
) {
  const gaps = sanitizeGaps([
    ...collectShapeGaps(reviewPacket),
    ...collectSourceBindingGaps(reviewPacket, options),
    ...hasForbiddenContent(reviewPacket)
  ]);
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    review_packet_id: reviewPacket?.review_packet_id ?? null,
    review_state: reviewPacket?.review_state ?? null,
    envelope_valid: gaps.length === 0,
    valid: gaps.length === 0 && reviewPacket?.review_state === READY_STATE,
    gaps
  };
}

function printUsageAndExit() {
  console.error(
    "Usage: node scripts/run_ai_value_contribution_alignment_runner_review_packet.mjs <packet.json> --source-fixture=<fixture.json> --research-design=<design.md>"
  );
  process.exit(1);
}

function cliOptions(argv) {
  const packetPath = argv.filter((arg) => !arg.startsWith("--")).at(-1);
  const sourceFixturePrefix = "--source-fixture=";
  const researchDesignPrefix = "--research-design=";
  const sourceFixtureArg = argv.find((arg) => arg.startsWith(sourceFixturePrefix));
  const researchDesignArg = argv.find((arg) => arg.startsWith(researchDesignPrefix));
  return {
    packetPath,
    sourceFixturePath: sourceFixtureArg?.slice(sourceFixturePrefix.length),
    researchDesignPath: researchDesignArg?.slice(researchDesignPrefix.length)
  };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
const currentPath = fileURLToPath(import.meta.url);
if (invokedPath === currentPath) {
  const { packetPath, sourceFixturePath, researchDesignPath } = cliOptions(
    process.argv.slice(2)
  );
  if (!packetPath || !sourceFixturePath || !researchDesignPath) printUsageAndExit();
  const cwd = process.cwd();
  const sourcePacket = JSON.parse(readFileSync(resolve(cwd, packetPath), "utf8"));
  const sourceFixture = JSON.parse(readFileSync(resolve(cwd, sourceFixturePath), "utf8"));
  const researchDesignText = readFileSync(resolve(cwd, researchDesignPath), "utf8");
  const implementationDecisionText = readFileSync(
    resolve(cwd, IMPLEMENTATION_DECISION_PATH),
    "utf8"
  );
  const sourceRunner = buildContributionAlignmentInternalPrototypeRunnerFromObject(
    sourcePacket,
    {
      sourceFixture,
      researchDesignText,
      researchDesignPath,
      implementationDecisionText,
      cwd
    }
  );
  const reviewPacket = buildContributionAlignmentRunnerReviewPacketFromObject(
    sourceRunner,
    {
      sourcePacket,
      sourceFixture,
      researchDesignText,
      researchDesignPath,
      implementationDecisionText,
      cwd
    }
  );
  const validation = validateContributionAlignmentRunnerReviewPacket(reviewPacket, {
    sourceRunner,
    sourcePacket,
    sourceFixture,
    researchDesignText,
    researchDesignPath,
    implementationDecisionText,
    cwd
  });
  if (!validation.valid) {
    console.error(JSON.stringify(validation, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(reviewPacket, null, 2));
}
