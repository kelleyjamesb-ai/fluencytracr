#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildContributionAlignmentInternalPrototypeRunnerFromObject
} from "./run_ai_value_contribution_alignment_internal_prototype_runner.mjs";
import {
  buildContributionAlignmentRunnerReviewPacketFromObject
} from "./run_ai_value_contribution_alignment_runner_review_packet.mjs";
import {
  buildContributionAlignmentModelPrototypeDesignReviewFromObject,
  validateContributionAlignmentModelPrototypeDesignReview
} from "./run_ai_value_contribution_alignment_model_prototype_design_review.mjs";

export const CONTRIBUTION_ALIGNMENT_INTERNAL_MODEL_PROTOTYPE_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_MODEL_PROTOTYPE_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_INTERNAL_MODEL_PROTOTYPE_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_contribution_alignment_internal_model_prototype_2026_06";

const READY_STATE = "READY_FOR_INTERNAL_MODEL_PROTOTYPE_RECORD";
const HOLD_DESIGN_REVIEW_STATE = "HOLD_FOR_VALID_MODEL_PROTOTYPE_DESIGN_REVIEW";
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
  "prototype_id",
  "prototype_state",
  "generated_at",
  "derivation_version",
  "source_design_review_ref",
  "prototype_scope",
  "method_frame",
  "selected_path_ref",
  "milestone_ref",
  "context_refs",
  "component_reviews",
  "context_separation_rule",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "boundary_policy",
  "validation_summary",
  "prototype_hash"
]);

const PROTOTYPE_SCOPE_FIELDS = [
  "internal_only",
  "non_persistent",
  "compact_refs_only",
  "descriptive_contract_replay_only",
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
  "receives_compact_design_review_only",
  "receives_full_design_review_payload",
  "receives_raw_rows",
  "receives_query_text",
  "receives_prompts",
  "receives_transcripts",
  "receives_identifiers",
  "receives_source_package_payloads",
  "receives_full_measurement_cell_payloads",
  "persists_prototype",
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
  "Internal model prototype is non-persistent contract replay only.",
  "The prototype consumes compact design-review refs and hashes only.",
  "The prototype does not emit model results, weights, confidence output, probability, score-like output, finance output, ROI, causality, productivity, or customer-facing output.",
  "AI Fluency construct context, psychological context, observed VBD context, and selected customer metric movement remain distinct.",
  "The prototype is not promoted research model input and cannot feed customer reporting."
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

const COMPONENT_REVIEW_TRACE = COMPONENT_DEFINITIONS.map((component) => ({
  component_id: component.component_id,
  role: component.role,
  input_ref: component.input_ref,
  trace_state: "reviewable_contract_ref",
  emission_state: "not_emitted"
}));

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
  /design_?review_?payload/i,
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
  /design_review_payload/i,
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

function safeValidationScalar(value, allowedValues = []) {
  if (allowedValues.includes(value)) return value;
  if (typeof value !== "string") return null;
  if (/^contribution_alignment_internal_model_prototype_[0-9a-f]{16}$/.test(value)) {
    return value;
  }
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))) return null;
  if (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(value))) return null;
  return null;
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
  if (text.includes("design review must match source-review-packet-bound expected envelope")) {
    return "model_prototype_design_review: design review must match source-review-packet-bound expected envelope";
  }
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(text))) {
    return "model_prototype_design_review rejected unsafe or invalid content";
  }
  if (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(text))) {
    return "model_prototype_design_review rejected unsafe or invalid content";
  }
  return `model_prototype_design_review: ${text}`;
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

function compactSelectedPathRef(ref) {
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

function compactMilestoneRef(ref) {
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

function compactMilestoneReview(ref) {
  return {
    required_milestones: compactScalarArray(ref?.required_milestones),
    observed_milestones: compactScalarArray(ref?.observed_milestones),
    missing_milestones: compactScalarArray(ref?.missing_milestones),
    ready_windows: compactNumber(ref?.ready_windows) ?? 0,
    held_windows: compactNumber(ref?.held_windows) ?? 0,
    suppressed_windows: compactNumber(ref?.suppressed_windows) ?? 0,
    missing_windows: compactNumber(ref?.missing_windows) ?? 0,
    blocked_windows: compactNumber(ref?.blocked_windows) ?? 0,
    compact_snapshot_refs: (ref?.compact_snapshot_refs ?? []).map(compactMilestoneRef)
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

function compactContextRefs(refs) {
  return {
    ai_fluency_construct_context_ref: compactContextRef(
      refs?.ai_fluency_construct_context_ref
    ),
    ai_fluency_psychological_context_ref: compactContextRef(
      refs?.ai_fluency_psychological_context_ref
    ),
    observed_vbd_context_ref: compactContextRef(refs?.observed_vbd_context_ref),
    selected_metric_movement_ref: compactMetricMovementRef(
      refs?.selected_metric_movement_ref
    )
  };
}

function emptyContextRefs() {
  return compactContextRefs(null);
}

function compactSourceDesignReviewRef(review) {
  return {
    design_review_id: compactScalar(review?.design_review_id),
    review_state: compactScalar(review?.review_state),
    design_review_hash: compactScalar(review?.design_review_hash),
    source_review_packet_id:
      compactScalar(review?.source_review_packet_ref?.review_packet_id),
    source_review_packet_hash:
      compactScalar(review?.source_review_packet_ref?.review_packet_hash),
    design_strength_cap: compactScalar(review?.design_strength_cap),
    method_family: compactScalar(review?.model_frame?.model_family)
  };
}

function componentReviewsFor(review) {
  const definitions = Array.isArray(review?.model_frame?.component_definitions)
    ? review.model_frame.component_definitions
    : [];
  return definitions.map((component) => ({
    component_id: compactScalar(component?.component_id),
    role: compactScalar(component?.role),
    input_ref: compactScalar(component?.input_ref),
    trace_state: "reviewable_contract_ref",
    emission_state: "not_emitted"
  }));
}

function hasForbiddenContent(value, path = "review") {
  const gaps = [];
  const safeFalseBoundaryFlag =
    value === false &&
    (
      path.startsWith("review.feeds.") ||
      path.startsWith("review.boundary_policy.") ||
      path.startsWith("review.prototype_scope.") ||
      path.startsWith("review.method_frame.")
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
          path === "review.method_frame"
        );
      if (
        !safeNegativeBoundaryKey &&
        FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))
      ) {
        gaps.push("review contains forbidden field name");
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

function sourceDesignReviewValidationFor(review, options = {}) {
  if (!review) {
    return {
      valid: false,
      gaps: ["source design review is required"]
    };
  }
  return validateContributionAlignmentModelPrototypeDesignReview(review, {
    sourceRunner: options.sourceRunner,
    sourceReviewPacket: options.sourceReviewPacket,
    sourcePacket: options.sourcePacket,
    sourceFixture: options.sourceFixture,
    researchDesignText: options.researchDesignText,
    researchDesignPath: options.researchDesignPath,
    implementationDecisionText: options.implementationDecisionText,
    cwd: options.cwd ?? process.cwd()
  });
}

function prototypeStateFor(review, reviewValidation, contentGaps) {
  if (contentGaps.length > 0) return REJECT_BOUNDARY_STATE;
  const reviewReady =
    review?.review_state === "READY_FOR_INTERNAL_MODEL_PROTOTYPE_DESIGN_RECORD" &&
    review?.feeds?.internal_model_prototype_design_record === true &&
    reviewValidation.valid === true;
  return reviewReady ? READY_STATE : HOLD_DESIGN_REVIEW_STATE;
}

export function contributionAlignmentInternalModelPrototypeHash(prototype) {
  const withoutHash = { ...prototype };
  delete withoutHash.prototype_hash;
  return sha256Json(withoutHash);
}

function buildBasePrototype(sourceDesignReview, options = {}) {
  const review = clone(sourceDesignReview);
  const reviewValidation = sourceDesignReviewValidationFor(review, options);
  const preliminaryContentGaps = [];
  const prototypeState = prototypeStateFor(
    review,
    reviewValidation,
    preliminaryContentGaps
  );
  const readyForPrototype = prototypeState === READY_STATE;
  const validationGaps = sanitizeGaps(reviewValidation.gaps.map(safeValidationGap));

  let prototype = {
    schema_version: CONTRIBUTION_ALIGNMENT_INTERNAL_MODEL_PROTOTYPE_SCHEMA_VERSION,
    prototype_id: `contribution_alignment_internal_model_prototype_${sha256Json({
      design_review_id: review?.design_review_id ?? null,
      design_review_hash: review?.design_review_hash ?? null
    }).slice(0, 16)}`,
    prototype_state: prototypeState,
    generated_at: "2026-06-24T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_design_review_ref: compactSourceDesignReviewRef(review),
    prototype_scope: {
      internal_only: true,
      non_persistent: true,
      compact_refs_only: true,
      descriptive_contract_replay_only: true,
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
    method_frame: {
      model_family: "contribution_alignment_research",
      replay_mode: "descriptive_component_contract_replay",
      result_emitted: false,
      parameterization_authorized: false,
      research_feed_authorized: false,
      component_review_rule:
        "Governed components are traced as reviewable refs only; no downstream result is emitted."
    },
    selected_path_ref: readyForPrototype
      ? compactSelectedPathRef(review?.selected_path_model_ref)
      : null,
    milestone_ref: readyForPrototype
      ? compactMilestoneReview(review?.milestone_model_ref)
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
        },
    context_refs: readyForPrototype
      ? compactContextRefs(review?.context_refs)
      : emptyContextRefs(),
    component_reviews: readyForPrototype ? componentReviewsFor(review) : [],
    context_separation_rule:
      "construct_psychological_observed_metric_contexts_must_remain_distinct",
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      internal_model_prototype_record: readyForPrototype,
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: {
      receives_compact_design_review_only: true,
      receives_full_design_review_payload: false,
      receives_raw_rows: false,
      receives_query_text: false,
      receives_prompts: false,
      receives_transcripts: false,
      receives_identifiers: false,
      receives_source_package_payloads: false,
      receives_full_measurement_cell_payloads: false,
      persists_prototype: false,
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
      schema_version: `${CONTRIBUTION_ALIGNMENT_INTERNAL_MODEL_PROTOTYPE_SCHEMA_VERSION}_SUMMARY`,
      valid: readyForPrototype,
      prototype_state: prototypeState,
      gaps: validationGaps
    }
  };

  const contentGaps = hasForbiddenContent(prototype);
  if (contentGaps.length > 0) {
    prototype = {
      ...prototype,
      prototype_state: REJECT_BOUNDARY_STATE,
      feeds: {
        ...prototype.feeds,
        internal_model_prototype_record: false
      },
      validation_summary: {
        ...prototype.validation_summary,
        valid: false,
        prototype_state: REJECT_BOUNDARY_STATE,
        gaps: sanitizeGaps([...validationGaps, ...contentGaps])
      }
    };
  }
  prototype.prototype_hash = contributionAlignmentInternalModelPrototypeHash(prototype);
  return prototype;
}

export function buildContributionAlignmentInternalModelPrototypeFromObject(
  sourceDesignReview,
  options = {}
) {
  return buildBasePrototype(sourceDesignReview, {
    ...options,
    cwd: options.cwd ?? process.cwd()
  });
}

function collectShapeGaps(prototype) {
  const gaps = [];
  if (!isPlainObject(prototype)) return ["internal model prototype must be an object"];
  Object.keys(prototype).forEach((key, index) => {
    if (!TOP_LEVEL_FIELDS.has(key)) gaps.push(`unexpected top-level field at index ${index}`);
  });
  if (
    prototype.schema_version !==
    CONTRIBUTION_ALIGNMENT_INTERNAL_MODEL_PROTOTYPE_SCHEMA_VERSION
  ) {
    gaps.push("schema_version is invalid");
  }
  if (![READY_STATE, HOLD_DESIGN_REVIEW_STATE, REJECT_BOUNDARY_STATE].includes(prototype.prototype_state)) {
    gaps.push("prototype_state is invalid");
  }
  if (!isPlainObject(prototype.prototype_scope)) {
    gaps.push("prototype_scope is required");
  } else {
    for (const key of Object.keys(prototype.prototype_scope)) {
      if (!PROTOTYPE_SCOPE_FIELDS.includes(key)) {
        gaps.push("prototype_scope contains ungoverned field");
      }
    }
    for (const [field, expected] of Object.entries({
      internal_only: true,
      non_persistent: true,
      compact_refs_only: true,
      descriptive_contract_replay_only: true,
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
      if (prototype.prototype_scope[field] !== expected) {
        gaps.push(`prototype_scope.${field} must be ${expected}`);
      }
    }
  }
  if (prototype.method_frame?.model_family !== "contribution_alignment_research") {
    gaps.push("method_frame.model_family is invalid");
  }
  if (
    prototype.method_frame?.replay_mode !== "descriptive_component_contract_replay"
  ) {
    gaps.push("method_frame.replay_mode is invalid");
  }
  for (const field of [
    "result_emitted",
    "parameterization_authorized",
    "research_feed_authorized"
  ]) {
    if (prototype.method_frame?.[field] !== false) {
      gaps.push(`method_frame.${field} must remain false`);
    }
  }
  if (
    prototype.context_separation_rule !==
    "construct_psychological_observed_metric_contexts_must_remain_distinct"
  ) {
    gaps.push("context_separation_rule is invalid");
  }
  if (
    stableStringify(prototype.component_reviews) !==
    stableStringify(
      prototype.prototype_state === READY_STATE ? COMPONENT_REVIEW_TRACE : []
    )
  ) {
    gaps.push("component_reviews must match governed component review trace");
  }
  const feeds = prototype.feeds ?? {};
  if (
    feeds.internal_model_prototype_record !==
    (prototype.prototype_state === READY_STATE)
  ) {
    gaps.push("feeds.internal_model_prototype_record must be true only for ready internal prototypes");
  }
  for (const feed of FALSE_FEEDS) {
    if (feeds[feed] !== false) gaps.push(`feeds.${feed} must remain false`);
  }
  for (const key of Object.keys(feeds)) {
    if (key !== "internal_model_prototype_record" && !FALSE_FEEDS.includes(key)) {
      gaps.push("feeds contains ungoverned field");
    }
  }
  for (const field of BOUNDARY_POLICY_FIELDS) {
    if (field === "receives_compact_design_review_only") {
      if (prototype.boundary_policy?.[field] !== true) {
        gaps.push("boundary_policy.receives_compact_design_review_only must be true");
      }
    } else if (prototype.boundary_policy?.[field] !== false) {
      gaps.push(`boundary_policy.${field} must remain false`);
    }
  }
  for (const key of Object.keys(prototype.boundary_policy ?? {})) {
    if (!BOUNDARY_POLICY_FIELDS.includes(key)) {
      gaps.push("boundary_policy contains ungoverned field");
    }
  }
  gaps.push(...exactArrayGaps(prototype.blocked_uses, REQUIRED_BLOCKED_USES, "blocked_uses"));
  gaps.push(...exactArrayGaps(prototype.required_caveats, REQUIRED_CAVEATS, "required_caveats"));

  const validationSummary = prototype.validation_summary ?? {};
  if (validationSummary.prototype_state !== prototype.prototype_state) {
    gaps.push("validation_summary.prototype_state must match prototype_state");
  }
  if (validationSummary.valid !== (prototype.prototype_state === READY_STATE)) {
    gaps.push("validation_summary.valid must match prototype_state readiness");
  }
  if (!Array.isArray(validationSummary.gaps)) {
    gaps.push("validation_summary.gaps must be an array");
  } else if (prototype.prototype_state === READY_STATE && validationSummary.gaps.length > 0) {
    gaps.push("validation_summary.gaps must be empty for ready internal prototypes");
  }
  if (prototype.prototype_hash !== contributionAlignmentInternalModelPrototypeHash(prototype)) {
    gaps.push("prototype_hash must match compact internal model prototype");
  }
  return gaps;
}

function collectSourceBindingGaps(prototype, options = {}) {
  const gaps = [];
  if (!isPlainObject(prototype)) {
    gaps.push("internal model prototype must be an object");
    return gaps;
  }
  if (!options.sourceDesignReview) {
    gaps.push("sourceDesignReview is required for internal model prototype validation");
    return gaps;
  }
  const reviewValidation = sourceDesignReviewValidationFor(
    options.sourceDesignReview,
    options
  );
  if (!options.sourceReviewPacket) {
    gaps.push("sourceReviewPacket is required for internal model prototype validation");
  }
  if (!options.sourceRunner) {
    gaps.push("sourceRunner is required for internal model prototype validation");
  }
  if (!options.sourcePacket) {
    gaps.push("sourcePacket is required for internal model prototype validation");
  }
  if (!options.sourceFixture) {
    gaps.push("sourceFixture is required for internal model prototype validation");
  }
  if (!options.researchDesignText) {
    gaps.push("researchDesignText is required for internal model prototype validation");
  }
  if (!options.implementationDecisionText) {
    gaps.push("implementationDecisionText is required for internal model prototype validation");
  }
  const expectedPrototype = buildBasePrototype(options.sourceDesignReview, {
    sourceRunner: options.sourceRunner,
    sourceReviewPacket: options.sourceReviewPacket,
    sourcePacket: options.sourcePacket,
    sourceFixture: options.sourceFixture,
    researchDesignText: options.researchDesignText,
    researchDesignPath: options.researchDesignPath,
    implementationDecisionText: options.implementationDecisionText,
    cwd: options.cwd ?? process.cwd()
  });
  const expectedWithoutHash = clone(expectedPrototype);
  const actualWithoutHash = clone(prototype);
  delete expectedWithoutHash.prototype_hash;
  delete actualWithoutHash.prototype_hash;
  if (JSON.stringify(actualWithoutHash) !== JSON.stringify(expectedWithoutHash)) {
    gaps.push("internal model prototype must match source-design-review-bound expected envelope");
  }
  if (
    prototype.source_design_review_ref?.design_review_id !==
    options.sourceDesignReview.design_review_id
  ) {
    gaps.push("source_design_review_ref.design_review_id drifted");
  }
  if (
    prototype.source_design_review_ref?.design_review_hash !==
    options.sourceDesignReview.design_review_hash
  ) {
    gaps.push("source_design_review_ref.design_review_hash drifted");
  }
  const expectedState = prototypeStateFor(
    options.sourceDesignReview,
    reviewValidation,
    []
  );
  if (prototype.prototype_state !== expectedState) {
    gaps.push(`prototype_state must be ${expectedState}`);
  }
  return gaps;
}

export function validateContributionAlignmentInternalModelPrototype(
  prototype,
  options = {}
) {
  const gaps = sanitizeGaps([
    ...collectShapeGaps(prototype),
    ...collectSourceBindingGaps(prototype, options),
    ...hasForbiddenContent(prototype)
  ]);
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    prototype_id: safeValidationScalar(prototype?.prototype_id),
    prototype_state: safeValidationScalar(prototype?.prototype_state, [
      READY_STATE,
      HOLD_DESIGN_REVIEW_STATE,
      REJECT_BOUNDARY_STATE
    ]),
    envelope_valid: gaps.length === 0,
    valid: gaps.length === 0 && prototype?.prototype_state === READY_STATE,
    gaps
  };
}

function printUsageAndExit() {
  console.error(
    "Usage: node scripts/run_ai_value_contribution_alignment_internal_model_prototype.mjs <packet.json> --source-fixture=<fixture.json> --research-design=<design.md>"
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
  const sourceDesignReview = buildContributionAlignmentModelPrototypeDesignReviewFromObject(
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
  const prototype = buildContributionAlignmentInternalModelPrototypeFromObject(
    sourceDesignReview,
    {
      sourceRunner,
      sourceReviewPacket,
      sourceDesignReview,
      sourcePacket,
      sourceFixture,
      researchDesignText,
      researchDesignPath,
      implementationDecisionText,
      cwd
    }
  );
  const validation = validateContributionAlignmentInternalModelPrototype(prototype, {
    sourceRunner,
    sourceReviewPacket,
    sourceDesignReview,
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
  console.log(JSON.stringify(prototype, null, 2));
}
