#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_READINESS_REVIEW_SCHEMA_VERSION,
  contributionAlignmentInternalBayesianReadinessReviewHash
} from "./run_ai_value_contribution_alignment_internal_bayesian_readiness_review.mjs";
import {
  CONTRIBUTION_ALIGNMENT_WEIGHTED_INTERNAL_MODEL_FRAME_SCHEMA_VERSION,
  contributionAlignmentWeightedInternalModelFrameHash
} from "./run_ai_value_contribution_alignment_weighted_internal_model_frame.mjs";

export const CONTRIBUTION_ALIGNMENT_BAYESIAN_MODEL_SPECIFICATION_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_BAYESIAN_MODEL_SPECIFICATION_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_BAYESIAN_MODEL_SPECIFICATION_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_contribution_alignment_bayesian_model_specification_2026_06";

const READY_STATE = "BAYESIAN_MODEL_SPECIFICATION_READY";
const HOLD_STATE = "HOLD_FOR_INTERNAL_BAYESIAN_READINESS_REVIEW";
const REJECT_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const SPECIFICATION_VERSION = "bayesian_hierarchical_did_spec_2026_06";
const CANDIDATE_MODEL_FAMILY = "bayesian_hierarchical_difference_in_differences_candidate";
const READY_NEXT_STEP = "internal_bayesian_execution_gate_only";
const HELD_NEXT_STEP = "complete_internal_bayesian_readiness_review";

const FEATURE_IDS = [
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
  "bayesian_execution",
  "bayesian_model_output",
  "posterior_output",
  "confidence_output",
  "probability_output",
  "score_like_output",
  "weighted_internal_model_output",
  "aggregate_score_output",
  "research_model_feed",
  "finance_output",
  "roi_output",
  "causality_output",
  "productivity_output",
  "customer_facing_output",
  "route_creation",
  "ui_creation",
  "schema_creation",
  "persistence_write",
  "export_creation",
  "live_connector_execution"
];

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "specification_id",
  "specification_state",
  "generated_at",
  "derivation_version",
  "source_bound",
  "source_readiness_review_ref",
  "source_frame_ref",
  "specification_version",
  "candidate_model_family",
  "specification_policy",
  "model_contract",
  "specified_feature_weights",
  "allowed_next_step",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "boundary_policy",
  "validation_summary",
  "specification_hash"
]);

const SOURCE_READINESS_REVIEW_REF_FIELDS = [
  "schema_version",
  "review_id",
  "review_state",
  "review_version",
  "review_hash"
];

const SOURCE_FRAME_REF_FIELDS = [
  "schema_version",
  "frame_id",
  "frame_state",
  "frame_version",
  "frame_hash"
];

const SPECIFICATION_POLICY_FIELDS = [
  "internal_only",
  "specification_only",
  "execution_gate_authorized",
  "bayesian_execution_authorized",
  "bayesian_model_output_authorized",
  "posterior_output_authorized",
  "confidence_output_authorized",
  "probability_output_authorized",
  "finance_output_authorized",
  "customer_output_authorized"
];

const MODEL_CONTRACT_FIELDS = [
  "unit_of_analysis",
  "estimand",
  "prior_specification_state",
  "likelihood_specification_state",
  "execution_state"
];

const SPECIFIED_FEATURE_WEIGHT_FIELDS = [
  "feature_id",
  "weight",
  "source_bound",
  "specification_role",
  "output_value_present"
];

const BOUNDARY_POLICY_FIELDS = [
  "receives_bayesian_readiness_review_only",
  "receives_weighted_frame_ref",
  "receives_full_source_payload",
  "receives_raw_rows",
  "receives_query_text",
  "receives_identifiers",
  "persists_specification",
  "creates_routes",
  "creates_ui",
  "creates_schemas",
  "creates_exports",
  "runs_live_connectors",
  "implements_bayesian_execution",
  "emits_bayesian_model_output",
  "emits_posterior_output",
  "emits_confidence_output",
  "emits_probability",
  "emits_score_like_output",
  "emits_finance_output",
  "emits_customer_facing_output",
  "computes_roi",
  "claims_causality",
  "measures_productivity"
];

const ALLOWED_INPUT_FIELDS = new Set([
  "source_readiness_review",
  "source_frame",
  "generated_at"
]);

const REQUIRED_BLOCKED_USES = [
  "bayesian_execution",
  "bayesian_model_output",
  "posterior_output",
  "confidence_output",
  "probability_output",
  "score_like_output",
  "weighted_internal_model_output",
  "aggregate_score_output",
  "research_model_feed",
  "finance_output",
  "roi",
  "causality_claim",
  "productivity_measurement",
  "customer_facing_output",
  "route_creation",
  "ui_creation",
  "schema_creation",
  "persistence_write",
  "export_creation",
  "live_connector_execution",
  "raw_data_storage"
];

const REQUIRED_CAVEATS = [
  "Bayesian Model Specification authorizes only a later internal execution gate.",
  "This specification does not run Bayesian execution or emit posterior, confidence, probability, score, ROI, finance, causality, productivity, or customer-facing output.",
  "Priors, likelihood, and estimand fields are specification placeholders until a later execution gate promotes exact runtime scope.",
  "The specification must remain bound to the Internal Bayesian Readiness Review and Weighted Internal Model Frame refs."
];

const FORBIDDEN_KEY_PATTERNS = [
  /raw_?rows?/i,
  /^rows$/i,
  /^records$/i,
  /query_?text/i,
  /\bsql\b/i,
  /prompt/i,
  /response/i,
  /transcript/i,
  /user_?id/i,
  /employee/i,
  /person_?id/i,
  /^email$/i,
  /payload_?json/i,
  /feature_?table/i,
  /warehouse/i,
  /dataset/i,
  /dashboard/i,
  /posterior/i,
  /probability/i,
  /confidence/i,
  /score/i,
  /^roi$/i,
  /finance/i,
  /financial/i,
  /caus(?:al|ality)/i,
  /productivity/i,
  /customer_?facing/i
];

const FORBIDDEN_VALUE_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\bselect\b[\s\S]+\bfrom\b/i,
  /\bsql\b/i,
  /\bbquxjob_/i,
  /https?:\/\//i,
  /secret:\/\//i,
  /raw[_-\s]?rows?/i,
  /query[_-\s]?text/i,
  /payload_json/i,
  /feature[_-\s]?table/i,
  /warehouse/i,
  /dataset/i,
  /dashboard/i,
  /posterior/i,
  /probability/i,
  /confidence[_-\s]?(?:score|output|percent|percentage|model|ready)/i,
  /score[_-\s]?(?:like|output|ready|field)?/i,
  /\broi\b/i,
  /finance[_-\s]?(?:output|claim|result|ready)/i,
  /financial[_-\s]?attribution/i,
  /causal(?:ity)?/i,
  /\bcaused\b/i,
  /\bproductivity\b/i,
  /customer[-_\s]?facing/i
];

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Json(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function clone(value) {
  if (value === undefined || value === null) return null;
  return JSON.parse(JSON.stringify(value));
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function falseMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, false]));
}

function sanitizeGaps(gaps) {
  return [...new Set(gaps.filter(Boolean))].sort();
}

function sourceReadinessReviewFromInput(input) {
  const record = asRecord(input);
  return record.source_readiness_review ?? input;
}

function sourceFrameFromInput(input, options = {}) {
  const record = asRecord(input);
  return options.sourceFrame ?? record.source_frame ?? null;
}

function inputBoundaryGaps(input) {
  const record = asRecord(input);
  if (!Object.prototype.hasOwnProperty.call(record, "source_readiness_review")) return [];
  const sidecar = Object.fromEntries(
    Object.entries(record).filter(([key]) => !ALLOWED_INPUT_FIELDS.has(key))
  );
  return Object.keys(sidecar).length > 0
    ? ["input wrapper rejected unsafe or unsupported content"]
    : [];
}

function safeId(value, prefix) {
  return typeof value === "string" && new RegExp(`^${prefix}_[0-9a-f]{16}$`).test(value)
    ? value
    : null;
}

function safeHash(value) {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value) ? value : null;
}

function sourceReadinessReviewRef(sourceReview) {
  return {
    schema_version:
      sourceReview?.schema_version ===
      CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_READINESS_REVIEW_SCHEMA_VERSION
        ? sourceReview.schema_version
        : null,
    review_id: safeId(
      sourceReview?.review_id,
      "contribution_alignment_internal_bayesian_readiness_review"
    ),
    review_state:
      sourceReview?.review_state ===
      "INTERNAL_BAYESIAN_READINESS_REVIEW_PASSED_FOR_MODEL_SPECIFICATION"
        ? sourceReview.review_state
        : null,
    review_version:
      sourceReview?.review_version === "internal_bayesian_readiness_review_2026_06"
        ? sourceReview.review_version
        : null,
    review_hash: safeHash(sourceReview?.review_hash)
  };
}

function sourceFrameRef(sourceFrame, sourceReview) {
  const reviewRef = asRecord(sourceReview?.source_frame_ref);
  return {
    schema_version:
      (sourceFrame?.schema_version ?? reviewRef.schema_version) ===
      CONTRIBUTION_ALIGNMENT_WEIGHTED_INTERNAL_MODEL_FRAME_SCHEMA_VERSION
        ? (sourceFrame?.schema_version ?? reviewRef.schema_version)
        : null,
    frame_id: safeId(
      sourceFrame?.frame_id ?? reviewRef.frame_id,
      "contribution_alignment_weighted_internal_model_frame"
    ),
    frame_state:
      (sourceFrame?.frame_state ?? reviewRef.frame_state) ===
      "WEIGHTED_INTERNAL_MODEL_FRAME_READY"
        ? (sourceFrame?.frame_state ?? reviewRef.frame_state)
        : null,
    frame_version:
      (sourceFrame?.frame_version ?? reviewRef.frame_version) ===
      "internal_weighted_feature_composition_frame_2026_06"
        ? (sourceFrame?.frame_version ?? reviewRef.frame_version)
        : null,
    frame_hash: safeHash(sourceFrame?.frame_hash ?? reviewRef.frame_hash)
  };
}

function hasForbiddenContent(value, path = "specification") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => hasForbiddenContent(item, `${path}[${index}]`));
  }
  if (value && typeof value === "object") {
    const gaps = [];
    for (const [key, nested] of Object.entries(value)) {
      const safeFalseFlag =
        nested === false &&
        (
          path === "specification.feeds" ||
          path === "specification.boundary_policy" ||
          path === "specification.specification_policy" ||
          path.startsWith("specification.specified_feature_weights[")
        );
      if (!safeFalseFlag && FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
        gaps.push("specification contains forbidden field name");
        continue;
      }
      gaps.push(...hasForbiddenContent(nested, `${path}.${key}`));
    }
    return gaps;
  }
  if (typeof value !== "string") return [];
  if (
    path.startsWith("specification.blocked_uses[") ||
    path.startsWith("specification.required_caveats[")
  ) {
    return [];
  }
  return FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
    ? [`${path} contains unsafe source or output language`]
    : [];
}

function sourceReadinessReviewGaps(sourceReview) {
  const source = asRecord(sourceReview);
  const gaps = [];
  if (source.schema_version !== CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_READINESS_REVIEW_SCHEMA_VERSION) {
    gaps.push("source_readiness_review.schema_version is invalid");
  }
  if (source.review_state !== "INTERNAL_BAYESIAN_READINESS_REVIEW_PASSED_FOR_MODEL_SPECIFICATION") {
    gaps.push("source_readiness_review.review_state is not ready");
  }
  if (source.review_hash !== contributionAlignmentInternalBayesianReadinessReviewHash(source)) {
    gaps.push("sourceReadinessReview hash drifted");
  }
  if (source.validation_summary?.valid !== true) {
    gaps.push("source_readiness_review.validation_summary is not valid");
  }
  if (source.source_bound !== true) {
    gaps.push("source_readiness_review is not source-bound");
  }
  if (source.review_policy?.model_specification_authorized !== true) {
    gaps.push("source_readiness_review does not authorize model specification");
  }
  for (const field of [
    "bayesian_execution_authorized",
    "bayesian_model_output_authorized",
    "posterior_output_authorized",
    "confidence_output_authorized",
    "probability_output_authorized",
    "finance_output_authorized",
    "customer_output_authorized"
  ]) {
    if (source.review_policy?.[field] !== false) {
      gaps.push(`source_readiness_review.${field} must be false`);
    }
  }
  if (source.feeds?.bayesian_model_specification !== true) {
    gaps.push("source_readiness_review does not feed Bayesian model specification");
  }
  for (const feed of [
    "bayesian_execution",
    "bayesian_model_output",
    "posterior_output",
    "confidence_output",
    "probability_output",
    "score_like_output",
    "finance_output",
    "roi_output",
    "causality_output",
    "productivity_output",
    "customer_facing_output"
  ]) {
    if (source.feeds?.[feed] !== false) {
      gaps.push(`source_readiness_review.feeds.${feed} must be false`);
    }
  }
  const weights = asArray(source.reviewed_feature_weights);
  if (stableStringify(weights.map((feature) => feature.feature_id)) !== stableStringify(FEATURE_IDS)) {
    gaps.push("source_readiness_review weights do not match governed feature registry");
  }
  return sanitizeGaps(gaps);
}

function sourceFrameGaps(sourceFrame, sourceReview) {
  if (!sourceFrame) return [];
  const source = asRecord(sourceFrame);
  const reviewRef = asRecord(sourceReview?.source_frame_ref);
  const gaps = [];
  if (source.schema_version !== CONTRIBUTION_ALIGNMENT_WEIGHTED_INTERNAL_MODEL_FRAME_SCHEMA_VERSION) {
    gaps.push("source_frame.schema_version is invalid");
  }
  if (source.frame_state !== "WEIGHTED_INTERNAL_MODEL_FRAME_READY") {
    gaps.push("source_frame.frame_state is not ready");
  }
  if (source.frame_hash !== contributionAlignmentWeightedInternalModelFrameHash(source)) {
    gaps.push("source_frame hash drifted");
  }
  if (reviewRef.frame_hash && source.frame_hash && reviewRef.frame_hash !== source.frame_hash) {
    gaps.push("source_frame does not match readiness review ref");
  }
  return sanitizeGaps(gaps);
}

function buildSpecifiedFeatureWeights(sourceReview) {
  return asArray(sourceReview?.reviewed_feature_weights).map((feature) => ({
    feature_id: feature.feature_id,
    weight: feature.weight,
    source_bound: feature.source_bound === true,
    specification_role: "internal_model_covariate_candidate",
    output_value_present: false
  }));
}

function buildSpecification(sourceReview, sourceFrame, state, gaps) {
  const ready = state === READY_STATE;
  const specification = {
    schema_version: CONTRIBUTION_ALIGNMENT_BAYESIAN_MODEL_SPECIFICATION_SCHEMA_VERSION,
    specification_id: `contribution_alignment_bayesian_model_specification_${sha256Json({
      review_id: sourceReview?.review_id ?? null,
      review_hash: sourceReview?.review_hash ?? null,
      specification_version: SPECIFICATION_VERSION
    }).slice(0, 16)}`,
    specification_state: state,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: ready,
    source_readiness_review_ref: sourceReadinessReviewRef(sourceReview),
    source_frame_ref: sourceFrameRef(sourceFrame, sourceReview),
    specification_version: ready ? SPECIFICATION_VERSION : null,
    candidate_model_family: ready ? CANDIDATE_MODEL_FAMILY : null,
    specification_policy: {
      internal_only: true,
      specification_only: true,
      execution_gate_authorized: ready,
      bayesian_execution_authorized: false,
      bayesian_model_output_authorized: false,
      posterior_output_authorized: false,
      confidence_output_authorized: false,
      probability_output_authorized: false,
      finance_output_authorized: false,
      customer_output_authorized: false
    },
    model_contract: {
      unit_of_analysis: ready ? "aggregate_measurement_cell_window" : null,
      estimand: ready ? "aggregate_selected_metric_movement_difference_in_differences_candidate" : null,
      prior_specification_state: ready ? "weakly_regularizing_internal_placeholder_not_calibrated" : null,
      likelihood_specification_state: ready ? "aggregate_window_likelihood_placeholder_not_executed" : null,
      execution_state: "not_executed"
    },
    specified_feature_weights: ready ? buildSpecifiedFeatureWeights(sourceReview) : [],
    allowed_next_step: ready ? READY_NEXT_STEP : HELD_NEXT_STEP,
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      internal_bayesian_execution_gate: ready,
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: {
      receives_bayesian_readiness_review_only: state !== REJECT_STATE,
      receives_weighted_frame_ref: state !== REJECT_STATE,
      ...falseMap(
        BOUNDARY_POLICY_FIELDS.filter((field) =>
          ![
            "receives_bayesian_readiness_review_only",
            "receives_weighted_frame_ref"
          ].includes(field)
        )
      )
    },
    validation_summary: {
      schema_version: `${CONTRIBUTION_ALIGNMENT_BAYESIAN_MODEL_SPECIFICATION_SCHEMA_VERSION}_SUMMARY`,
      valid: ready,
      specification_state: state,
      gaps: ready ? [] : sanitizeGaps(gaps)
    }
  };
  specification.specification_hash = contributionAlignmentBayesianModelSpecificationHash(specification);
  return specification;
}

function rejectedSpecification() {
  const specification = {
    schema_version: CONTRIBUTION_ALIGNMENT_BAYESIAN_MODEL_SPECIFICATION_SCHEMA_VERSION,
    specification_id: null,
    specification_state: REJECT_STATE,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: false,
    specified_feature_weights: [],
    validation_summary: {
      schema_version: `${CONTRIBUTION_ALIGNMENT_BAYESIAN_MODEL_SPECIFICATION_SCHEMA_VERSION}_SUMMARY`,
      valid: false,
      specification_state: REJECT_STATE,
      gaps: ["boundary leakage rejected"]
    }
  };
  specification.specification_hash = contributionAlignmentBayesianModelSpecificationHash(specification);
  return specification;
}

export function contributionAlignmentBayesianModelSpecificationHash(specification) {
  const withoutHash = clone(specification);
  delete withoutHash.specification_hash;
  return sha256Json(withoutHash);
}

export function buildContributionAlignmentBayesianModelSpecificationFromObject(input, options = {}) {
  const wrapperGaps = inputBoundaryGaps(input);
  if (wrapperGaps.length > 0) return rejectedSpecification();
  const sourceReview = sourceReadinessReviewFromInput(input);
  const sourceFrame = sourceFrameFromInput(input, options);
  const gaps = sanitizeGaps([
    ...sourceReadinessReviewGaps(sourceReview),
    ...sourceFrameGaps(sourceFrame, sourceReview)
  ]);
  return buildSpecification(sourceReview, sourceFrame, gaps.length === 0 ? READY_STATE : HOLD_STATE, gaps);
}

function collectAllowedFieldsGaps(record, fields, label) {
  return Object.keys(asRecord(record))
    .filter((key) => !fields.has(key))
    .map(() => `${label} contains ungoverned field`);
}

function collectRefGaps(record, fields, label) {
  const ref = asRecord(record);
  const gaps = [];
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(ref, field)) gaps.push(`${label}.${field} is required`);
  }
  gaps.push(...collectAllowedFieldsGaps(ref, new Set(fields), label));
  return gaps;
}

function rejectValidation(specification) {
  if (specification?.specification_state !== REJECT_STATE) return null;
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid: false,
    gaps: ["boundary leakage rejected"]
  };
}

function collectShapeGaps(specification) {
  const rejected = rejectValidation(specification);
  if (rejected) return rejected.gaps;

  const record = asRecord(specification);
  const gaps = [];
  gaps.push(...collectAllowedFieldsGaps(record, TOP_LEVEL_FIELDS, "specification"));
  if (record.schema_version !== CONTRIBUTION_ALIGNMENT_BAYESIAN_MODEL_SPECIFICATION_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  if (![READY_STATE, HOLD_STATE].includes(record.specification_state)) {
    gaps.push("specification_state is invalid");
  }
  const ready = record.specification_state === READY_STATE;
  if (record.source_bound !== ready) gaps.push(`source_bound must be ${ready}`);
  if (record.specification_version !== (ready ? SPECIFICATION_VERSION : null)) {
    gaps.push(`specification_version must be ${ready ? SPECIFICATION_VERSION : "null"}`);
  }
  if (record.candidate_model_family !== (ready ? CANDIDATE_MODEL_FAMILY : null)) {
    gaps.push("candidate_model_family is invalid");
  }
  if (ready && record.allowed_next_step !== READY_NEXT_STEP) {
    gaps.push(`allowed_next_step must be ${READY_NEXT_STEP}`);
  }
  if (!ready && record.allowed_next_step !== HELD_NEXT_STEP) {
    gaps.push(`allowed_next_step must be ${HELD_NEXT_STEP}`);
  }

  gaps.push(...collectRefGaps(record.source_readiness_review_ref, SOURCE_READINESS_REVIEW_REF_FIELDS, "source_readiness_review_ref"));
  gaps.push(...collectRefGaps(record.source_frame_ref, SOURCE_FRAME_REF_FIELDS, "source_frame_ref"));

  const policy = asRecord(record.specification_policy);
  gaps.push(...collectRefGaps(policy, SPECIFICATION_POLICY_FIELDS, "specification_policy"));
  for (const [field, expected] of Object.entries({
    internal_only: true,
    specification_only: true,
    execution_gate_authorized: ready,
    bayesian_execution_authorized: false,
    bayesian_model_output_authorized: false,
    posterior_output_authorized: false,
    confidence_output_authorized: false,
    probability_output_authorized: false,
    finance_output_authorized: false,
    customer_output_authorized: false
  })) {
    if (policy[field] !== expected) gaps.push(`specification_policy.${field} must be ${expected}`);
  }

  const contract = asRecord(record.model_contract);
  gaps.push(...collectRefGaps(contract, MODEL_CONTRACT_FIELDS, "model_contract"));
  for (const [field, expected] of Object.entries({
    unit_of_analysis: ready ? "aggregate_measurement_cell_window" : null,
    estimand: ready ? "aggregate_selected_metric_movement_difference_in_differences_candidate" : null,
    prior_specification_state: ready ? "weakly_regularizing_internal_placeholder_not_calibrated" : null,
    likelihood_specification_state: ready ? "aggregate_window_likelihood_placeholder_not_executed" : null,
    execution_state: "not_executed"
  })) {
    if (contract[field] !== expected) gaps.push(`model_contract.${field} is invalid`);
  }

  const weights = asArray(record.specified_feature_weights);
  if (ready && stableStringify(weights.map((feature) => feature.feature_id)) !== stableStringify(FEATURE_IDS)) {
    gaps.push("specified_feature_weights must match governed feature registry");
  }
  if (!ready && weights.length !== 0) gaps.push("specified_feature_weights must be empty while held");
  const sum = Number(weights.reduce((total, feature) => total + Number(feature.weight ?? 0), 0).toFixed(6));
  if (ready && sum !== 1) gaps.push("specified_feature_weights must sum to one");
  for (const weight of weights) {
    gaps.push(...collectRefGaps(weight, SPECIFIED_FEATURE_WEIGHT_FIELDS, "specified_feature_weights[]"));
    if (weight.weight !== 0.1) gaps.push("specified_feature_weights must keep neutral equal weights");
    if (weight.source_bound !== true) gaps.push("specified_feature_weights must remain source-bound");
    if (weight.specification_role !== "internal_model_covariate_candidate") {
      gaps.push("specified_feature_weights.specification_role is invalid");
    }
    if (weight.output_value_present !== false) {
      gaps.push("specified_feature_weights must not contain output values");
    }
  }

  const feeds = asRecord(record.feeds);
  if (feeds.internal_bayesian_execution_gate !== ready) {
    gaps.push(`feeds.internal_bayesian_execution_gate must be ${ready}`);
  }
  for (const feed of FALSE_FEEDS) {
    if (feeds[feed] !== false) gaps.push(`feeds.${feed} must be false`);
  }
  for (const key of Object.keys(feeds)) {
    if (key !== "internal_bayesian_execution_gate" && !FALSE_FEEDS.includes(key)) {
      gaps.push("feeds contains ungoverned field");
    }
  }

  const boundary = asRecord(record.boundary_policy);
  for (const field of BOUNDARY_POLICY_FIELDS) {
    const expected = [
      "receives_bayesian_readiness_review_only",
      "receives_weighted_frame_ref"
    ].includes(field);
    if (boundary[field] !== expected) gaps.push(`boundary_policy.${field} must be ${expected}`);
  }
  if (stableStringify(record.blocked_uses) !== stableStringify(REQUIRED_BLOCKED_USES)) {
    gaps.push("blocked_uses must match governed list");
  }
  if (stableStringify(record.required_caveats) !== stableStringify(REQUIRED_CAVEATS)) {
    gaps.push("required_caveats must match governed list");
  }
  const summary = asRecord(record.validation_summary);
  if (summary.valid !== ready) gaps.push(`validation_summary.valid must be ${ready}`);
  if (summary.specification_state !== record.specification_state) {
    gaps.push("validation_summary.specification_state must match specification_state");
  }
  if (ready && asArray(summary.gaps).length !== 0) {
    gaps.push("validation_summary.gaps must be empty for ready specification");
  }
  if (record.specification_hash !== contributionAlignmentBayesianModelSpecificationHash(record)) {
    gaps.push("specification_hash must match specification body");
  }
  gaps.push(...hasForbiddenContent(record));
  return sanitizeGaps(gaps);
}

function collectSourceBindingGaps(specification, options = {}) {
  const gaps = [];
  if (options.sourceReadinessReview) {
    const reviewGaps = sourceReadinessReviewGaps(options.sourceReadinessReview);
    if (reviewGaps.length > 0) gaps.push(...reviewGaps);
  }
  if (options.sourceFrame) {
    const frameGaps = sourceFrameGaps(options.sourceFrame, options.sourceReadinessReview);
    if (frameGaps.length > 0) gaps.push(...frameGaps);
  }
  if (options.expectedSpecification) {
    const actualWithoutHash = clone(specification);
    const expectedWithoutHash = clone(options.expectedSpecification);
    delete actualWithoutHash.specification_hash;
    delete expectedWithoutHash.specification_hash;
    if (stableStringify(actualWithoutHash) !== stableStringify(expectedWithoutHash)) {
      gaps.push("Bayesian specification binding mismatch against sourceReadinessReview");
    }
  }
  return sanitizeGaps(gaps);
}

export function validateContributionAlignmentBayesianModelSpecification(specification, options = {}) {
  if (specification?.specification_state === REJECT_STATE) {
    return rejectValidation(specification);
  }
  const gaps = sanitizeGaps([
    ...collectShapeGaps(specification),
    ...collectSourceBindingGaps(specification, options)
  ]);
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid: gaps.length === 0 && specification?.specification_state === READY_STATE,
    gaps
  };
}

function inputFromCliPath(path) {
  if (path === "-") return JSON.parse(readFileSync(0, "utf8"));
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function main() {
  const [, , inputPath] = process.argv;
  if (!inputPath) {
    console.error(
      "Usage: node scripts/run_ai_value_contribution_alignment_bayesian_model_specification.mjs <internal-bayesian-readiness-review-json|- for stdin>"
    );
    process.exit(1);
  }
  const specification = buildContributionAlignmentBayesianModelSpecificationFromObject(inputFromCliPath(inputPath));
  process.stdout.write(`${JSON.stringify(specification, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
