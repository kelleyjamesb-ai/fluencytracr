#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildContributionAlignmentInternalPrototypeRunnerFromObject
} from "./run_ai_value_contribution_alignment_internal_prototype_runner.mjs";
import {
  buildContributionAlignmentRunnerReviewPacketFromObject,
  validateContributionAlignmentRunnerReviewPacket
} from "./run_ai_value_contribution_alignment_runner_review_packet.mjs";

export const CONTRIBUTION_ALIGNMENT_MODEL_PROTOTYPE_DESIGN_REVIEW_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_MODEL_PROTOTYPE_DESIGN_REVIEW_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_MODEL_PROTOTYPE_DESIGN_REVIEW_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_contribution_alignment_model_prototype_design_review_2026_06";

const READY_STATE = "READY_FOR_INTERNAL_MODEL_PROTOTYPE_DESIGN_RECORD";
const HOLD_REVIEW_PACKET_STATE = "HOLD_FOR_VALID_RUNNER_REVIEW_PACKET";
const REJECT_BOUNDARY_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

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

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "design_review_id",
  "review_state",
  "generated_at",
  "derivation_version",
  "source_review_packet_ref",
  "prototype_scope",
  "design_strength_cap",
  "model_frame",
  "selected_path_model_ref",
  "milestone_model_ref",
  "context_refs",
  "ai_fluency_model_scope",
  "observed_vbd_model_scope",
  "context_separation_rule",
  "comparison_design_scope",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "boundary_policy",
  "validation_summary",
  "design_review_hash"
]);

const PROTOTYPE_SCOPE_FIELDS = [
  "internal_only",
  "design_only",
  "non_persistent",
  "compact_refs_only",
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
  "receives_compact_design_refs_only",
  "receives_full_runner_review_packet",
  "receives_raw_rows",
  "receives_query_text",
  "receives_prompts",
  "receives_transcripts",
  "receives_identifiers",
  "receives_source_package_payloads",
  "receives_full_measurement_cell_payloads",
  "persists_design_review",
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
  "Model prototype design review is internal method-design only.",
  "The design review records a candidate model frame and alignment-review components, not model math.",
  "The design review consumes compact refs and hashes only.",
  "The design review does not authorize model implementation, numeric weights, confidence output, probability, score-like output, finance output, ROI, causality, productivity, or customer-facing output.",
  "AI Fluency construct context, psychological context, observed VBD context, and selected customer metric movement remain distinct."
];

const COMPONENT_DEFINITIONS = [
  {
    component_id: "hypothesis_binding",
    role: "customer_approved_path_identity",
    input_ref: "selected_path_model_ref"
  },
  {
    component_id: "source_coverage",
    role: "reviewed_source_lane_posture",
    input_ref: "source_review_packet_ref"
  },
  {
    component_id: "milestone_continuity",
    role: "day_0_30_60_90_180_365_window_refs",
    input_ref: "milestone_model_ref"
  },
  {
    component_id: "ai_fluency_construct_context_integrity",
    role: "aggregate_construct_context_only",
    input_ref: "context_refs.ai_fluency_construct_context_ref"
  },
  {
    component_id: "psychological_context_integrity",
    role: "aggregate_stated_context_only",
    input_ref: "context_refs.ai_fluency_psychological_context_ref"
  },
  {
    component_id: "observed_vbd_alignment",
    role: "telemetry_derived_observed_work_behavior_context",
    input_ref: "context_refs.observed_vbd_context_ref"
  },
  {
    component_id: "selected_metric_movement",
    role: "customer_owned_metric_movement_context",
    input_ref: "context_refs.selected_metric_movement_ref"
  },
  {
    component_id: "comparison_design_strength",
    role: "method_only_until_later_promotion",
    input_ref: "comparison_design_scope"
  },
  {
    component_id: "assumption_governance",
    role: "reviewed_assumption_posture",
    input_ref: "source_review_packet_ref"
  },
  {
    component_id: "boundary_clearance",
    role: "fail_closed_output_boundary",
    input_ref: "boundary_policy"
  }
];

const REQUIRED_COMPONENT_IDS = COMPONENT_DEFINITIONS.map(
  (component) => component.component_id
);

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
  /runner_?payload/i,
  /measurement_?cell_?payload/i,
  /series_?payload/i,
  /payload_?json/i,
  /equation/i,
  /formula/i,
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
  /source_package_(?:payload|clearance|cleared|approved|passed)/i,
  /operator_source_handoff_bundle/i,
  /runner_review_packet_payload/i,
  /measurement_cell_payload/i,
  /measurement_cell_series_payload/i,
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
  /equation/i,
  /formula/i,
  /f\s*\(/i,
  /coefficient/i,
  /likelihood/i,
  /index/i,
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
  if (value.length !== expected.length) {
    gaps.push(`${path} must contain only governed values`);
  }
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

function compactScalarArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => compactScalar(item))
    .filter((item) => item !== null);
}

function safeValidationGap(gap) {
  const text = String(gap ?? "");
  if (text.includes("review packet must match source-runner-bound expected envelope")) {
    return "runner_review_packet: review packet must match source-runner-bound expected envelope";
  }
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(text))) {
    return "runner_review_packet rejected unsafe or invalid content";
  }
  if (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(text))) {
    return "runner_review_packet rejected unsafe or invalid content";
  }
  return `runner_review_packet: ${text}`;
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

function compactSelectedPathModelRef(ref) {
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

function compactMilestoneModelRef(ref) {
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

function compactSourceReviewPacketRef(reviewPacket) {
  return {
    review_packet_id: compactScalar(reviewPacket?.review_packet_id),
    review_state: compactScalar(reviewPacket?.review_state),
    review_packet_hash: compactScalar(reviewPacket?.review_packet_hash),
    runner_id: compactScalar(reviewPacket?.runner_ref?.runner_id),
    runner_hash: compactScalar(reviewPacket?.runner_ref?.runner_hash),
    packet_integrity_hash:
      compactScalar(reviewPacket?.runner_ref?.packet_ref?.packet_integrity_hash),
    design_strength_cap: compactScalar(reviewPacket?.design_strength_cap)
  };
}

function hasForbiddenContent(value, path = "review") {
  const gaps = [];
  const safeFalseBoundaryFlag =
    value === false &&
    (
      path.startsWith("review.feeds.") ||
      path.startsWith("review.boundary_policy.") ||
      path.startsWith("review.prototype_scope.") ||
      path.startsWith("review.model_frame.")
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
          path === "review.prototype_scope" ||
          path === "review.model_frame"
        );
      if (
        !safeNegativeBoundaryKey &&
        FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))
      ) {
        gaps.push(`${nestedPath} must not contain raw rows, query text, identifiers, model result, finance, customer-facing, or generic payload fields`);
      }
      gaps.push(...hasForbiddenContent(nested, nestedPath));
    }
    return gaps;
  }
  if (typeof value === "string") {
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

function sourceReviewPacketValidationFor(reviewPacket, options = {}) {
  if (!reviewPacket) {
    return {
      valid: false,
      gaps: ["source review packet is required"]
    };
  }
  return validateContributionAlignmentRunnerReviewPacket(reviewPacket, {
    sourceRunner: options.sourceRunner,
    sourcePacket: options.sourcePacket,
    sourceFixture: options.sourceFixture,
    researchDesignText: options.researchDesignText,
    researchDesignPath: options.researchDesignPath,
    implementationDecisionText: options.implementationDecisionText,
    cwd: options.cwd ?? process.cwd()
  });
}

function reviewStateFor(reviewPacket, reviewPacketValidation, contentGaps) {
  if (contentGaps.length > 0) return REJECT_BOUNDARY_STATE;
  const reviewPacketReady =
    reviewPacket?.review_state === "READY_FOR_INTERNAL_MODEL_PROTOTYPE_DESIGN_REVIEW" &&
    reviewPacket?.feeds?.internal_model_prototype_design_review === true &&
    reviewPacketValidation.valid === true;
  return reviewPacketReady ? READY_STATE : HOLD_REVIEW_PACKET_STATE;
}

export function contributionAlignmentModelPrototypeDesignReviewHash(review) {
  const withoutHash = { ...review };
  delete withoutHash.design_review_hash;
  return sha256Json(withoutHash);
}

function buildBaseDesignReview(sourceReviewPacket, options = {}) {
  const reviewPacket = clone(sourceReviewPacket);
  const reviewPacketValidation = sourceReviewPacketValidationFor(reviewPacket, options);
  const preliminaryContentGaps = [];
  const reviewState = reviewStateFor(
    reviewPacket,
    reviewPacketValidation,
    preliminaryContentGaps
  );
  const readyForDesignRecord = reviewState === READY_STATE;
  const validationGaps = sanitizeGaps(reviewPacketValidation.gaps.map(safeValidationGap));
  const selectedPathModelRef = readyForDesignRecord
    ? compactSelectedPathModelRef(reviewPacket?.selected_expectation_path_ref)
    : null;
  const milestoneModelRef = readyForDesignRecord
    ? {
        required_milestones: compactScalarArray(
          reviewPacket.milestone_review?.required_milestones
        ),
        observed_milestones: compactScalarArray(
          reviewPacket.milestone_review?.observed_milestones
        ),
        missing_milestones: compactScalarArray(
          reviewPacket.milestone_review?.missing_milestones
        ),
        ready_windows: compactNumber(reviewPacket.milestone_review?.ready_windows) ?? 0,
        held_windows: compactNumber(reviewPacket.milestone_review?.held_windows) ?? 0,
        suppressed_windows:
          compactNumber(reviewPacket.milestone_review?.suppressed_windows) ?? 0,
        missing_windows:
          compactNumber(reviewPacket.milestone_review?.missing_windows) ?? 0,
        blocked_windows:
          compactNumber(reviewPacket.milestone_review?.blocked_windows) ?? 0,
        compact_snapshot_refs: (
          reviewPacket.milestone_review?.compact_snapshot_refs ?? []
        ).map(compactMilestoneModelRef)
      }
    : {
        required_milestones: [],
        observed_milestones: [],
        missing_milestones: [],
        ready_windows: 0,
        held_windows: 0,
        suppressed_windows: 0,
        missing_windows: 0,
        blocked_windows: 0,
        compact_snapshot_refs: []
      };
  const contextRefs = readyForDesignRecord
    ? {
        ai_fluency_construct_context_ref: compactContextRef(
          reviewPacket.context_separation?.ai_fluency_construct_context_ref
        ),
        ai_fluency_psychological_context_ref: compactContextRef(
          reviewPacket.context_separation?.ai_fluency_psychological_context_ref
        ),
        observed_vbd_context_ref: compactContextRef(
          reviewPacket.context_separation?.observed_vbd_context_ref
        ),
        selected_metric_movement_ref: compactMetricMovementRef(
          reviewPacket.context_separation?.selected_metric_movement_ref
        )
      }
    : {
        ai_fluency_construct_context_ref: compactContextRef(null),
        ai_fluency_psychological_context_ref: compactContextRef(null),
        observed_vbd_context_ref: compactContextRef(null),
        selected_metric_movement_ref: compactMetricMovementRef(null)
      };

  let review = {
    schema_version: CONTRIBUTION_ALIGNMENT_MODEL_PROTOTYPE_DESIGN_REVIEW_SCHEMA_VERSION,
    design_review_id: `contribution_alignment_model_prototype_design_${sha256Json({
      review_packet_id: reviewPacket?.review_packet_id ?? null,
      review_packet_hash: reviewPacket?.review_packet_hash ?? null
    }).slice(0, 16)}`,
    review_state: reviewState,
    generated_at: "2026-06-24T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_review_packet_ref: compactSourceReviewPacketRef(reviewPacket),
    prototype_scope: {
      internal_only: true,
      design_only: true,
      non_persistent: true,
      compact_refs_only: true,
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
    model_frame: {
      model_family: "contribution_alignment_research",
      question_id: "approved_theory_of_change_alignment",
      result_emitted: false,
      parameterization_authorized: false,
      research_feed_authorized: false,
      candidate_review_checklist_frame:
        "Hard gates clear before descriptive component review; no downstream output is emitted.",
      component_definitions: clone(COMPONENT_DEFINITIONS)
    },
    selected_path_model_ref: selectedPathModelRef,
    milestone_model_ref: milestoneModelRef,
    context_refs: contextRefs,
    ai_fluency_model_scope: {
      construct_dimensions: [
        "Confidence",
        "Usage Quality",
        "Behavior Change",
        "Leadership Reinforcement",
        "Capability Growth"
      ],
      psychological_context: [
        "attitude",
        "stated_ai_behavior_orientation",
        "behavioral_intent",
        "perceived_ai_impact"
      ],
      use_as_context_only: true,
      can_upgrade_readiness: false,
      can_replace_observed_vbd: false
    },
    observed_vbd_model_scope: {
      observed_behavior_dimensions: ["velocity", "breadth", "depth"],
      source: "aggregate_telemetry_context_ref_only",
      can_be_replaced_by_psychological_context: false
    },
    context_separation_rule:
      "construct_psychological_observed_metric_contexts_must_remain_distinct",
    comparison_design_scope: {
      current_design_strength: "method_design_only",
      controlled_fixture_replay_only: true,
      live_pilot_inference_authorized: false,
      matched_comparison_authorized: false,
      experimental_design_authorized: false
    },
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      internal_model_prototype_design_record: readyForDesignRecord,
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: {
      receives_compact_design_refs_only: true,
      receives_full_runner_review_packet: false,
      receives_raw_rows: false,
      receives_query_text: false,
      receives_prompts: false,
      receives_transcripts: false,
      receives_identifiers: false,
      receives_source_package_payloads: false,
      receives_full_measurement_cell_payloads: false,
      persists_design_review: false,
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
      schema_version: `${CONTRIBUTION_ALIGNMENT_MODEL_PROTOTYPE_DESIGN_REVIEW_SCHEMA_VERSION}_SUMMARY`,
      valid: readyForDesignRecord,
      review_state: reviewState,
      gaps: validationGaps
    }
  };

  const contentGaps = hasForbiddenContent(review);
  if (contentGaps.length > 0) {
    review = {
      ...review,
      review_state: REJECT_BOUNDARY_STATE,
      feeds: {
        ...review.feeds,
        internal_model_prototype_design_record: false
      },
      validation_summary: {
        ...review.validation_summary,
        valid: false,
        review_state: REJECT_BOUNDARY_STATE,
        gaps: sanitizeGaps([...validationGaps, ...contentGaps])
      }
    };
  }
  review.design_review_hash = contributionAlignmentModelPrototypeDesignReviewHash(review);
  return review;
}

export function buildContributionAlignmentModelPrototypeDesignReviewFromObject(
  sourceReviewPacket,
  options = {}
) {
  return buildBaseDesignReview(sourceReviewPacket, {
    ...options,
    cwd: options.cwd ?? process.cwd()
  });
}

function collectShapeGaps(review) {
  const gaps = [];
  if (!isPlainObject(review)) return ["design review must be an object"];
  for (const key of Object.keys(review)) {
    if (!TOP_LEVEL_FIELDS.has(key)) gaps.push(`unexpected top-level field: ${key}`);
  }
  if (
    review.schema_version !==
    CONTRIBUTION_ALIGNMENT_MODEL_PROTOTYPE_DESIGN_REVIEW_SCHEMA_VERSION
  ) {
    gaps.push("schema_version is invalid");
  }
  if (![READY_STATE, HOLD_REVIEW_PACKET_STATE, REJECT_BOUNDARY_STATE].includes(review.review_state)) {
    gaps.push("review_state is invalid");
  }
  if (!isPlainObject(review.prototype_scope)) {
    gaps.push("prototype_scope is required");
  } else {
    for (const key of Object.keys(review.prototype_scope)) {
      if (!PROTOTYPE_SCOPE_FIELDS.includes(key)) {
        gaps.push(`prototype_scope.${key} is not allowed`);
      }
    }
    for (const [field, expected] of Object.entries({
      internal_only: true,
      design_only: true,
      non_persistent: true,
      compact_refs_only: true,
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
    })) {
      if (review.prototype_scope[field] !== expected) {
        gaps.push(`prototype_scope.${field} must be ${expected}`);
      }
    }
  }
  if (review.design_strength_cap !== "METHOD_DESIGN_ONLY") {
    gaps.push("design_strength_cap must remain METHOD_DESIGN_ONLY");
  }
  if (review.model_frame?.model_family !== "contribution_alignment_research") {
    gaps.push("model_frame.model_family is invalid");
  }
  for (const field of [
    "result_emitted",
    "parameterization_authorized",
    "research_feed_authorized"
  ]) {
    if (review.model_frame?.[field] !== false) {
      gaps.push(`model_frame.${field} must remain false`);
    }
  }
  if (!Array.isArray(review.model_frame?.component_definitions)) {
    gaps.push("model_frame.component_definitions must be an array");
  } else {
    const componentIds = review.model_frame.component_definitions.map(
      (component) => component?.component_id
    );
    gaps.push(...exactArrayGaps(componentIds, REQUIRED_COMPONENT_IDS, "model_frame.component_definitions"));
    if (
      stableStringify(review.model_frame.component_definitions) !==
      stableStringify(COMPONENT_DEFINITIONS)
    ) {
      gaps.push("model_frame.component_definitions must match governed component definitions");
    }
  }
  if (
    review.context_separation_rule !==
    "construct_psychological_observed_metric_contexts_must_remain_distinct"
  ) {
    gaps.push("context_separation_rule is invalid");
  }
  const feeds = review.feeds ?? {};
  if (
    feeds.internal_model_prototype_design_record !==
    (review.review_state === READY_STATE)
  ) {
    gaps.push("feeds.internal_model_prototype_design_record must be true only for ready design reviews");
  }
  for (const feed of FALSE_FEEDS) {
    if (feeds[feed] !== false) gaps.push(`feeds.${feed} must remain false`);
  }
  for (const key of Object.keys(feeds)) {
    if (key !== "internal_model_prototype_design_record" && !FALSE_FEEDS.includes(key)) {
      gaps.push(`feeds.${key} is not allowed`);
    }
  }
  for (const field of BOUNDARY_POLICY_FIELDS) {
    if (field === "receives_compact_design_refs_only") {
      if (review.boundary_policy?.[field] !== true) {
        gaps.push("boundary_policy.receives_compact_design_refs_only must be true");
      }
    } else if (review.boundary_policy?.[field] !== false) {
      gaps.push(`boundary_policy.${field} must remain false`);
    }
  }
  for (const key of Object.keys(review.boundary_policy ?? {})) {
    if (!BOUNDARY_POLICY_FIELDS.includes(key)) {
      gaps.push(`boundary_policy.${key} is not allowed`);
    }
  }
  gaps.push(...exactArrayGaps(review.blocked_uses, REQUIRED_BLOCKED_USES, "blocked_uses"));
  gaps.push(...exactArrayGaps(review.required_caveats, REQUIRED_CAVEATS, "required_caveats"));

  const validationSummary = review.validation_summary ?? {};
  if (validationSummary.review_state !== review.review_state) {
    gaps.push("validation_summary.review_state must match review_state");
  }
  if (validationSummary.valid !== (review.review_state === READY_STATE)) {
    gaps.push("validation_summary.valid must match review_state readiness");
  }
  if (!Array.isArray(validationSummary.gaps)) {
    gaps.push("validation_summary.gaps must be an array");
  } else if (review.review_state === READY_STATE && validationSummary.gaps.length > 0) {
    gaps.push("validation_summary.gaps must be empty for ready design reviews");
  }

  if (review.design_review_hash !== contributionAlignmentModelPrototypeDesignReviewHash(review)) {
    gaps.push("design_review_hash must match compact design review");
  }
  return gaps;
}

function collectSourceBindingGaps(review, options = {}) {
  const gaps = [];
  if (!isPlainObject(review)) {
    gaps.push("design review must be an object");
    return gaps;
  }
  if (!options.sourceReviewPacket) {
    gaps.push("sourceReviewPacket is required for design review validation");
    return gaps;
  }
  const reviewPacketValidation = sourceReviewPacketValidationFor(
    options.sourceReviewPacket,
    options
  );
  const expectedReview = buildBaseDesignReview(options.sourceReviewPacket, {
    sourceRunner: options.sourceRunner,
    sourcePacket: options.sourcePacket,
    sourceFixture: options.sourceFixture,
    researchDesignText: options.researchDesignText,
    researchDesignPath: options.researchDesignPath,
    implementationDecisionText: options.implementationDecisionText,
    cwd: options.cwd ?? process.cwd()
  });
  const expectedWithoutHash = clone(expectedReview);
  const actualWithoutHash = clone(review);
  delete expectedWithoutHash.design_review_hash;
  delete actualWithoutHash.design_review_hash;
  if (JSON.stringify(actualWithoutHash) !== JSON.stringify(expectedWithoutHash)) {
    gaps.push("design review must match source-review-packet-bound expected envelope");
  }
  if (
    review.source_review_packet_ref?.review_packet_id !==
    options.sourceReviewPacket.review_packet_id
  ) {
    gaps.push("source_review_packet_ref.review_packet_id drifted");
  }
  if (
    review.source_review_packet_ref?.review_packet_hash !==
    options.sourceReviewPacket.review_packet_hash
  ) {
    gaps.push("source_review_packet_ref.review_packet_hash drifted");
  }
  const expectedState = reviewStateFor(
    options.sourceReviewPacket,
    reviewPacketValidation,
    []
  );
  if (review.review_state !== expectedState) {
    gaps.push(`review_state must be ${expectedState}`);
  }
  return gaps;
}

export function validateContributionAlignmentModelPrototypeDesignReview(
  review,
  options = {}
) {
  const gaps = sanitizeGaps([
    ...collectShapeGaps(review),
    ...collectSourceBindingGaps(review, options),
    ...hasForbiddenContent(review)
  ]);
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    design_review_id: review?.design_review_id ?? null,
    review_state: review?.review_state ?? null,
    envelope_valid: gaps.length === 0,
    valid: gaps.length === 0 && review?.review_state === READY_STATE,
    gaps
  };
}

function printUsageAndExit() {
  console.error(
    "Usage: node scripts/run_ai_value_contribution_alignment_model_prototype_design_review.mjs <packet.json> --source-fixture=<fixture.json> --research-design=<design.md>"
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
    resolve(cwd, RUNNER_IMPLEMENTATION_DECISION_PATH),
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
  const sourceReviewPacket = buildContributionAlignmentRunnerReviewPacketFromObject(
    sourceRunner,
    {
      sourceRunner,
      sourcePacket,
      sourceFixture,
      researchDesignText,
      researchDesignPath,
      implementationDecisionText,
      cwd
    }
  );
  const review = buildContributionAlignmentModelPrototypeDesignReviewFromObject(
    sourceReviewPacket,
    {
      sourceRunner,
      sourceReviewPacket,
      sourcePacket,
      sourceFixture,
      researchDesignText,
      researchDesignPath,
      implementationDecisionText,
      cwd
    }
  );
  const validation = validateContributionAlignmentModelPrototypeDesignReview(review, {
    sourceRunner,
    sourceReviewPacket,
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
  console.log(JSON.stringify(review, null, 2));
}
