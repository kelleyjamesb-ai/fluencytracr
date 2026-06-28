#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CONTRIBUTION_ALIGNMENT_FEATURE_STABILITY_REVIEW_SCHEMA_VERSION,
  contributionAlignmentFeatureStabilityReviewHash
} from "./run_ai_value_contribution_alignment_feature_stability_review.mjs";

export const CONTRIBUTION_ALIGNMENT_INTERNAL_NUMERIC_WEIGHT_DECISION_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_NUMERIC_WEIGHT_DECISION_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_INTERNAL_NUMERIC_WEIGHT_DECISION_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_contribution_alignment_internal_numeric_weight_decision_2026_06";

const READY_STATE = "PROMOTE_INTERNAL_NUMERIC_WEIGHT_OBJECT";
const HOLD_STATE = "HOLD_FOR_FEATURE_STABILITY_REVIEW";
const REJECT_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const ALLOWED_NEXT_STEP = "versioned_internal_weight_object_only";
const HELD_NEXT_STEP = "complete_feature_stability_review";

const FALSE_FEEDS = [
  "weight_values",
  "weighted_internal_model_frame",
  "research_model_feed",
  "model_output",
  "confidence_output",
  "probability_output",
  "bayesian_execution",
  "score_like_output",
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

const SOURCE_REF_FIELDS = [
  "schema_version",
  "review_id",
  "review_state",
  "review_hash"
];

const WEIGHT_DECISION_SCOPE_FIELDS = [
  "internal_only",
  "decision_only",
  "versioned_weight_object_authorized",
  "weight_values_present",
  "weighted_model_frame_authorized",
  "bayesian_execution_authorized",
  "customer_output_authorized",
  "requires_versioned_weight_object",
  "requires_later_weighted_model_frame_decision"
];

const BOUNDARY_POLICY_FIELDS = [
  "receives_feature_stability_review_only",
  "receives_full_source_payload",
  "receives_raw_rows",
  "receives_query_text",
  "receives_identifiers",
  "persists_decision",
  "creates_routes",
  "creates_ui",
  "creates_schemas",
  "creates_exports",
  "runs_live_connectors",
  "stores_weight_values",
  "implements_weighted_model",
  "implements_bayesian_model",
  "emits_model_output",
  "emits_confidence_output",
  "emits_probability",
  "emits_score_like_output",
  "emits_finance_output",
  "emits_customer_facing_output",
  "computes_roi",
  "claims_causality",
  "measures_productivity"
];

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "decision_id",
  "decision_state",
  "generated_at",
  "derivation_version",
  "source_bound",
  "source_feature_stability_review_ref",
  "weight_decision_scope",
  "allowed_next_step",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "boundary_policy",
  "validation_summary",
  "decision_hash"
]);

const ALLOWED_INPUT_FIELDS = new Set([
  "source_feature_stability_review",
  "generated_at"
]);

const REQUIRED_BLOCKED_USES = [
  "weight_values",
  "weighted_model_output",
  "research_model_feed",
  "model_output",
  "confidence_output",
  "probability_output",
  "bayesian_execution",
  "score_like_output",
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
  "Internal Numeric Weight Decision authorizes only a later versioned internal weight object.",
  "This decision contains no weight values and emits no weighted model output.",
  "Weights remain internal-only and cannot create confidence, probability, ROI, causality, productivity, finance, or customer-facing output.",
  "A later versioned weight object must bind back to this decision and the source feature stability review."
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
  /weight_?values/i,
  /posterior/i,
  /probability/i,
  /confidence/i,
  /^score$/i,
  /score_?like/i,
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

function sourceReviewFromInput(input) {
  const record = asRecord(input);
  return record.source_feature_stability_review ?? input;
}

function inputBoundaryGaps(input) {
  const record = asRecord(input);
  if (!Object.prototype.hasOwnProperty.call(record, "source_feature_stability_review")) return [];
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

function sourceRef(sourceReview) {
  return {
    schema_version:
      sourceReview?.schema_version === CONTRIBUTION_ALIGNMENT_FEATURE_STABILITY_REVIEW_SCHEMA_VERSION
        ? sourceReview.schema_version
        : null,
    review_id: safeId(sourceReview?.review_id, "contribution_alignment_feature_stability_review"),
    review_state:
      sourceReview?.review_state === "FEATURE_STABILITY_REVIEW_PASSED_FOR_INTERNAL_WEIGHT_DECISION"
        ? sourceReview.review_state
        : null,
    review_hash: safeHash(sourceReview?.review_hash)
  };
}

function hasForbiddenContent(value, path = "decision") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => hasForbiddenContent(item, `${path}[${index}]`));
  }
  if (value && typeof value === "object") {
    const gaps = [];
    for (const [key, nested] of Object.entries(value)) {
      const safeFalseFlag =
        nested === false &&
        (
          path === "decision.feeds" ||
          path === "decision.boundary_policy" ||
          path === "decision.weight_decision_scope"
        );
      if (!safeFalseFlag && FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
        gaps.push("decision contains forbidden field name");
        continue;
      }
      gaps.push(...hasForbiddenContent(nested, `${path}.${key}`));
    }
    return gaps;
  }
  if (typeof value !== "string") return [];
  if (
    path.startsWith("decision.blocked_uses[") ||
    path.startsWith("decision.required_caveats[")
  ) {
    return [];
  }
  return FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
    ? [`${path} contains unsafe source or output language`]
    : [];
}

function sourceReviewGaps(sourceReview) {
  const source = asRecord(sourceReview);
  const gaps = [];
  if (source.schema_version !== CONTRIBUTION_ALIGNMENT_FEATURE_STABILITY_REVIEW_SCHEMA_VERSION) {
    gaps.push("source_feature_stability_review.schema_version is invalid");
  }
  if (source.review_state !== "FEATURE_STABILITY_REVIEW_PASSED_FOR_INTERNAL_WEIGHT_DECISION") {
    gaps.push("source_feature_stability_review.review_state is not ready");
  }
  if (source.review_hash !== contributionAlignmentFeatureStabilityReviewHash(source)) {
    gaps.push("source_feature_stability_review.hash drifted");
  }
  if (source.validation_summary?.valid !== true) {
    gaps.push("source_feature_stability_review.validation_summary is not valid");
  }
  if (source.feature_stability?.weight_decision_ready !== true) {
    gaps.push("source_feature_stability_review.weight_decision_ready is false");
  }
  if (source.feature_stability?.numeric_weights_authorized !== false) {
    gaps.push("source_feature_stability_review already authorizes numeric weights");
  }
  if (source.feature_stability?.weight_values_present !== false) {
    gaps.push("source_feature_stability_review already contains weight values");
  }
  if (source.feeds?.internal_numeric_weight_decision !== true) {
    gaps.push("source_feature_stability_review does not feed weight decision");
  }
  const registry = asArray(source.feature_registry);
  if (registry.length !== 10) {
    gaps.push("source_feature_stability_review.feature_registry is unstable");
  }
  for (const feature of registry) {
    if (feature.stability_state !== "STABLE_FOR_INTERNAL_WEIGHT_DECISION") {
      gaps.push("source_feature_stability_review.feature is not stable");
    }
    if (feature.weight_candidate_role !== "candidate_internal_weight_input") {
      gaps.push("source_feature_stability_review.feature is not a weight candidate");
    }
    if (feature.numeric_value_present !== false) {
      gaps.push("source_feature_stability_review.feature contains numeric value");
    }
    if (feature.source_bound !== true) {
      gaps.push("source_feature_stability_review.feature is not source-bound");
    }
  }
  return sanitizeGaps(gaps);
}

function buildDecision(sourceReview, state, gaps) {
  const ready = state === READY_STATE;
  const decision = {
    schema_version: CONTRIBUTION_ALIGNMENT_INTERNAL_NUMERIC_WEIGHT_DECISION_SCHEMA_VERSION,
    decision_id: `contribution_alignment_internal_numeric_weight_decision_${sha256Json({
      review_id: sourceReview?.review_id ?? null,
      review_hash: sourceReview?.review_hash ?? null
    }).slice(0, 16)}`,
    decision_state: state,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: ready,
    source_feature_stability_review_ref: sourceRef(sourceReview),
    weight_decision_scope: {
      internal_only: true,
      decision_only: true,
      versioned_weight_object_authorized: ready,
      weight_values_present: false,
      weighted_model_frame_authorized: false,
      bayesian_execution_authorized: false,
      customer_output_authorized: false,
      requires_versioned_weight_object: ready,
      requires_later_weighted_model_frame_decision: true
    },
    allowed_next_step: ready ? ALLOWED_NEXT_STEP : HELD_NEXT_STEP,
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      versioned_internal_weight_object: ready,
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: {
      receives_feature_stability_review_only: state !== REJECT_STATE,
      ...falseMap(BOUNDARY_POLICY_FIELDS.filter((field) => field !== "receives_feature_stability_review_only"))
    },
    validation_summary: {
      schema_version: `${CONTRIBUTION_ALIGNMENT_INTERNAL_NUMERIC_WEIGHT_DECISION_SCHEMA_VERSION}_SUMMARY`,
      valid: ready,
      decision_state: state,
      gaps: ready ? [] : sanitizeGaps(gaps)
    }
  };
  decision.decision_hash = contributionAlignmentInternalNumericWeightDecisionHash(decision);
  return decision;
}

function rejectedDecision(gaps) {
  return buildDecision(null, REJECT_STATE, gaps);
}

export function contributionAlignmentInternalNumericWeightDecisionHash(decision) {
  const withoutHash = clone(decision);
  delete withoutHash.decision_hash;
  return sha256Json(withoutHash);
}

export function buildContributionAlignmentInternalNumericWeightDecisionFromObject(input) {
  const wrapperGaps = inputBoundaryGaps(input);
  if (wrapperGaps.length > 0) return rejectedDecision(wrapperGaps);
  const sourceReview = sourceReviewFromInput(input);
  const gaps = sourceReviewGaps(sourceReview);
  return buildDecision(sourceReview, gaps.length === 0 ? READY_STATE : HOLD_STATE, gaps);
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

function collectShapeGaps(decision) {
  const record = asRecord(decision);
  const gaps = [];
  gaps.push(...collectAllowedFieldsGaps(record, TOP_LEVEL_FIELDS, "decision"));
  if (record.schema_version !== CONTRIBUTION_ALIGNMENT_INTERNAL_NUMERIC_WEIGHT_DECISION_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  if (![READY_STATE, HOLD_STATE, REJECT_STATE].includes(record.decision_state)) {
    gaps.push("decision_state is invalid");
  }
  const ready = record.decision_state === READY_STATE;
  if (record.source_bound !== ready) gaps.push(`source_bound must be ${ready}`);
  if (ready && record.allowed_next_step !== ALLOWED_NEXT_STEP) {
    gaps.push(`allowed_next_step must be ${ALLOWED_NEXT_STEP}`);
  }
  if (!ready && record.allowed_next_step !== HELD_NEXT_STEP) {
    gaps.push(`allowed_next_step must be ${HELD_NEXT_STEP}`);
  }
  gaps.push(...collectRefGaps(record.source_feature_stability_review_ref, SOURCE_REF_FIELDS, "source_feature_stability_review_ref"));
  const scope = asRecord(record.weight_decision_scope);
  gaps.push(...collectRefGaps(scope, WEIGHT_DECISION_SCOPE_FIELDS, "weight_decision_scope"));
  for (const [field, expected] of Object.entries({
    internal_only: true,
    decision_only: true,
    versioned_weight_object_authorized: ready,
    weight_values_present: false,
    weighted_model_frame_authorized: false,
    bayesian_execution_authorized: false,
    customer_output_authorized: false,
    requires_versioned_weight_object: ready,
    requires_later_weighted_model_frame_decision: true
  })) {
    if (scope[field] !== expected) gaps.push(`weight_decision_scope.${field} must be ${expected}`);
  }
  const feeds = asRecord(record.feeds);
  if (feeds.versioned_internal_weight_object !== ready) {
    gaps.push(`feeds.versioned_internal_weight_object must be ${ready}`);
  }
  for (const feed of FALSE_FEEDS) {
    if (feeds[feed] !== false) gaps.push(`feeds.${feed} must be false`);
  }
  for (const key of Object.keys(feeds)) {
    if (key !== "versioned_internal_weight_object" && !FALSE_FEEDS.includes(key)) {
      gaps.push("feeds contains ungoverned field");
    }
  }
  const boundary = asRecord(record.boundary_policy);
  for (const field of BOUNDARY_POLICY_FIELDS) {
    const expected = field === "receives_feature_stability_review_only" && record.decision_state !== REJECT_STATE;
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
  if (summary.decision_state !== record.decision_state) {
    gaps.push("validation_summary.decision_state must match decision_state");
  }
  if (ready && asArray(summary.gaps).length !== 0) {
    gaps.push("validation_summary.gaps must be empty for ready decision");
  }
  if (record.decision_hash !== contributionAlignmentInternalNumericWeightDecisionHash(record)) {
    gaps.push("decision_hash must match decision body");
  }
  gaps.push(...hasForbiddenContent(record));
  return sanitizeGaps(gaps);
}

function collectSourceBindingGaps(decision, options = {}) {
  if (!options.sourceFeatureStabilityReview) return [];
  const expected = options.expectedDecision ??
    buildContributionAlignmentInternalNumericWeightDecisionFromObject(options.sourceFeatureStabilityReview);
  const actualWithoutHash = clone(decision);
  const expectedWithoutHash = clone(expected);
  delete actualWithoutHash.decision_hash;
  delete expectedWithoutHash.decision_hash;
  return stableStringify(actualWithoutHash) === stableStringify(expectedWithoutHash)
    ? []
    : ["sourceFeatureStabilityReview binding mismatch"];
}

export function validateContributionAlignmentInternalNumericWeightDecision(decision, options = {}) {
  const gaps = sanitizeGaps([
    ...collectShapeGaps(decision),
    ...collectSourceBindingGaps(decision, options)
  ]);
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid: gaps.length === 0 && decision?.decision_state === READY_STATE,
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
      "Usage: node scripts/run_ai_value_contribution_alignment_internal_numeric_weight_decision.mjs <feature-stability-review-json|- for stdin>"
    );
    process.exit(1);
  }
  const decision = buildContributionAlignmentInternalNumericWeightDecisionFromObject(inputFromCliPath(inputPath));
  process.stdout.write(`${JSON.stringify(decision, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
