// Ported verbatim from
// scripts/run_ai_value_contribution_alignment_internal_bayesian_readiness_review.mjs
// under OpenSpec change add-confidence-engine-workspace (task 3.1, module 5).
// Byte-compatibility contract enforced by the golden parity suite.

import { sha256Json } from "./internal/hashing";
import {
  CONTRIBUTION_ALIGNMENT_VERSIONED_WEIGHT_OBJECT_SCHEMA_VERSION,
  contributionAlignmentVersionedWeightObjectHash
} from "./versionedWeightObject";
import {
  CONTRIBUTION_ALIGNMENT_WEIGHTED_INTERNAL_MODEL_FRAME_SCHEMA_VERSION,
  contributionAlignmentWeightedInternalModelFrameHash
} from "./weightedInternalModelFrame";

type AnyRecord = Record<string, any>;

export const CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_READINESS_REVIEW_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_READINESS_REVIEW_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_READINESS_REVIEW_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_contribution_alignment_internal_bayesian_readiness_review_2026_06";

const READY_STATE = "INTERNAL_BAYESIAN_READINESS_REVIEW_PASSED_FOR_MODEL_SPECIFICATION";
const HOLD_STATE = "HOLD_FOR_WEIGHTED_INTERNAL_MODEL_FRAME";
const REJECT_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const REVIEW_VERSION = "internal_bayesian_readiness_review_2026_06";
const CANDIDATE_MODEL_FAMILY = "bayesian_hierarchical_difference_in_differences_candidate";
const READY_NEXT_STEP = "bayesian_model_specification_only";
const HELD_NEXT_STEP = "complete_weighted_internal_model_frame";

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
  "review_id",
  "review_state",
  "generated_at",
  "derivation_version",
  "source_bound",
  "source_frame_ref",
  "source_weight_object_ref",
  "review_version",
  "candidate_model_family",
  "review_policy",
  "readiness_checks",
  "reviewed_feature_weights",
  "allowed_next_step",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "boundary_policy",
  "validation_summary",
  "review_hash"
]);

const SOURCE_FRAME_REF_FIELDS = [
  "schema_version",
  "frame_id",
  "frame_state",
  "frame_version",
  "frame_hash"
];

const SOURCE_WEIGHT_OBJECT_REF_FIELDS = [
  "schema_version",
  "weight_object_id",
  "weight_object_state",
  "weight_version",
  "weight_object_hash"
];

const REVIEW_POLICY_FIELDS = [
  "internal_only",
  "readiness_review_only",
  "model_specification_authorized",
  "bayesian_execution_authorized",
  "bayesian_model_output_authorized",
  "posterior_output_authorized",
  "confidence_output_authorized",
  "probability_output_authorized",
  "finance_output_authorized",
  "customer_output_authorized"
];

const READINESS_CHECK_FIELDS = [
  "weighted_frame_source_bound",
  "weighted_composition_present",
  "weights_sum_to_one",
  "repeated_milestone_context_required",
  "selected_metric_context_required",
  "comparison_design_strength_required",
  "no_score_or_output_present",
  "privacy_boundary_clear"
];

const REVIEWED_FEATURE_WEIGHT_FIELDS = [
  "feature_id",
  "weight",
  "source_bound",
  "readiness_role",
  "output_value_present"
];

const BOUNDARY_POLICY_FIELDS = [
  "receives_weighted_internal_model_frame_only",
  "receives_versioned_weight_object_ref",
  "receives_full_source_payload",
  "receives_raw_rows",
  "receives_query_text",
  "receives_identifiers",
  "persists_review",
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
  "source_frame",
  "source_weight_object",
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
  "Internal Bayesian Readiness Review authorizes only a later Bayesian model specification.",
  "This review does not run Bayesian execution or emit posterior, confidence, probability, score, ROI, finance, causality, productivity, or customer-facing output.",
  "The candidate family is Bayesian hierarchical difference-in-differences, but priors, likelihood, estimands, and execution remain unimplemented.",
  "The review must remain bound to the Weighted Internal Model Frame and Versioned Weight Object refs."
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

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as AnyRecord;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function clone(value: unknown): any {
  if (value === undefined || value === null) return null;
  return JSON.parse(JSON.stringify(value));
}

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as AnyRecord)
    : {};
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function falseMap(keys: readonly string[]): Record<string, boolean> {
  return Object.fromEntries(keys.map((key) => [key, false]));
}

function sanitizeGaps(gaps: string[]): string[] {
  return [...new Set(gaps.filter(Boolean))].sort();
}

function sourceFrameFromInput(input: unknown): any {
  const record = asRecord(input);
  return record.source_frame ?? input;
}

function sourceWeightObjectFromInput(input: unknown, options: AnyRecord = {}): any {
  const record = asRecord(input);
  return options.sourceWeightObject ?? record.source_weight_object ?? null;
}

function inputBoundaryGaps(input: unknown): string[] {
  const record = asRecord(input);
  if (!Object.prototype.hasOwnProperty.call(record, "source_frame")) return [];
  const sidecar = Object.fromEntries(
    Object.entries(record).filter(([key]) => !ALLOWED_INPUT_FIELDS.has(key))
  );
  return Object.keys(sidecar).length > 0
    ? ["input wrapper rejected unsafe or unsupported content"]
    : [];
}

function safeId(value: unknown, prefix: string): string | null {
  return typeof value === "string" && new RegExp(`^${prefix}_[0-9a-f]{16}$`).test(value)
    ? value
    : null;
}

function safeHash(value: unknown): string | null {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value) ? value : null;
}

function sourceFrameRef(sourceFrame: any): AnyRecord {
  return {
    schema_version:
      sourceFrame?.schema_version === CONTRIBUTION_ALIGNMENT_WEIGHTED_INTERNAL_MODEL_FRAME_SCHEMA_VERSION
        ? sourceFrame.schema_version
        : null,
    frame_id: safeId(
      sourceFrame?.frame_id,
      "contribution_alignment_weighted_internal_model_frame"
    ),
    frame_state:
      sourceFrame?.frame_state === "WEIGHTED_INTERNAL_MODEL_FRAME_READY"
        ? sourceFrame.frame_state
        : null,
    frame_version:
      sourceFrame?.frame_version === "internal_weighted_feature_composition_frame_2026_06"
        ? sourceFrame.frame_version
        : null,
    frame_hash: safeHash(sourceFrame?.frame_hash)
  };
}

function sourceWeightObjectRef(sourceWeightObject: any, sourceFrame: any): AnyRecord {
  const frameRef = asRecord(sourceFrame?.source_weight_object_ref);
  return {
    schema_version:
      (sourceWeightObject?.schema_version ?? frameRef.schema_version) ===
      CONTRIBUTION_ALIGNMENT_VERSIONED_WEIGHT_OBJECT_SCHEMA_VERSION
        ? (sourceWeightObject?.schema_version ?? frameRef.schema_version)
        : null,
    weight_object_id: safeId(
      sourceWeightObject?.weight_object_id ?? frameRef.weight_object_id,
      "contribution_alignment_versioned_weight_object"
    ),
    weight_object_state:
      (sourceWeightObject?.weight_object_state ?? frameRef.weight_object_state) ===
      "VERSIONED_INTERNAL_WEIGHT_OBJECT_READY"
        ? (sourceWeightObject?.weight_object_state ?? frameRef.weight_object_state)
        : null,
    weight_version:
      (sourceWeightObject?.weight_version ?? frameRef.weight_version) ===
      "internal_structural_equal_weights_2026_06"
        ? (sourceWeightObject?.weight_version ?? frameRef.weight_version)
        : null,
    weight_object_hash: safeHash(sourceWeightObject?.weight_object_hash ?? frameRef.weight_object_hash)
  };
}

function hasForbiddenContent(value: unknown, path = "review"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => hasForbiddenContent(item, `${path}[${index}]`));
  }
  if (value && typeof value === "object") {
    const gaps: string[] = [];
    for (const [key, nested] of Object.entries(value)) {
      const safeFalseFlag =
        nested === false &&
        (
          path === "review.feeds" ||
          path === "review.boundary_policy" ||
          path === "review.review_policy" ||
          path.startsWith("review.reviewed_feature_weights[")
        );
      const safePositiveReviewPath =
        path === "review.readiness_checks" ||
        path.startsWith("review.readiness_checks.");
      if (
        !safeFalseFlag &&
        !safePositiveReviewPath &&
        FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))
      ) {
        gaps.push("review contains forbidden field name");
        continue;
      }
      gaps.push(...hasForbiddenContent(nested, `${path}.${key}`));
    }
    return gaps;
  }
  if (typeof value !== "string") return [];
  if (
    path.startsWith("review.blocked_uses[") ||
    path.startsWith("review.required_caveats[")
  ) {
    return [];
  }
  return FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
    ? [`${path} contains unsafe source or output language`]
    : [];
}

function sourceFrameGaps(sourceFrame: any): string[] {
  const source = asRecord(sourceFrame);
  const gaps: string[] = [];
  if (source.schema_version !== CONTRIBUTION_ALIGNMENT_WEIGHTED_INTERNAL_MODEL_FRAME_SCHEMA_VERSION) {
    gaps.push("source_frame.schema_version is invalid");
  }
  if (source.frame_state !== "WEIGHTED_INTERNAL_MODEL_FRAME_READY") {
    gaps.push("source_frame.frame_state is not ready");
  }
  if (source.frame_hash !== contributionAlignmentWeightedInternalModelFrameHash(source)) {
    gaps.push("sourceFrame hash drifted");
  }
  if (source.validation_summary?.valid !== true) {
    gaps.push("source_frame.validation_summary is not valid");
  }
  if (source.source_bound !== true) {
    gaps.push("source_frame is not source-bound");
  }
  if (source.frame_policy?.weighted_feature_composition_present !== true) {
    gaps.push("source_frame weighted composition is missing");
  }
  for (const field of [
    "aggregate_score_output_authorized",
    "weighted_internal_model_output_authorized",
    "confidence_output_authorized",
    "probability_output_authorized",
    "bayesian_execution_authorized",
    "customer_output_authorized"
  ]) {
    if (source.frame_policy?.[field] !== false) {
      gaps.push(`source_frame.${field} must be false`);
    }
  }
  if (source.feeds?.internal_bayesian_readiness_review !== true) {
    gaps.push("source_frame does not feed internal Bayesian readiness review");
  }
  for (const feed of [
    "weighted_internal_model_output",
    "research_model_feed",
    "aggregate_score_output",
    "confidence_output",
    "probability_output",
    "bayesian_execution",
    "score_like_output",
    "finance_output",
    "roi_output",
    "causality_output",
    "productivity_output",
    "customer_facing_output"
  ]) {
    if (source.feeds?.[feed] !== false) gaps.push(`source_frame.feeds.${feed} must be false`);
  }
  const composition = asArray(source.feature_weight_composition);
  if (stableStringify(composition.map((feature) => feature.feature_id)) !== stableStringify(FEATURE_IDS)) {
    gaps.push("source_frame composition does not match governed feature registry");
  }
  const sum = Number(composition.reduce((total, feature) => total + Number(feature.weight ?? 0), 0).toFixed(6));
  if (sum !== 1) gaps.push("source_frame composition weights must sum to one");
  for (const feature of composition) {
    if (feature.weight !== 0.1) gaps.push("source_frame composition must keep neutral equal weights");
    if (feature.source_bound !== true) gaps.push("source_frame composition is not source-bound");
    if (feature.value_output_present !== false) gaps.push("source_frame composition contains output value");
  }
  return sanitizeGaps(gaps);
}

function sourceWeightObjectGaps(sourceWeightObject: any, sourceFrame: any): string[] {
  if (!sourceWeightObject) return [];
  const source = asRecord(sourceWeightObject);
  const frameRef = asRecord(sourceFrame?.source_weight_object_ref);
  const gaps: string[] = [];
  if (source.schema_version !== CONTRIBUTION_ALIGNMENT_VERSIONED_WEIGHT_OBJECT_SCHEMA_VERSION) {
    gaps.push("source_weight_object.schema_version is invalid");
  }
  if (source.weight_object_state !== "VERSIONED_INTERNAL_WEIGHT_OBJECT_READY") {
    gaps.push("source_weight_object.weight_object_state is not ready");
  }
  if (source.weight_object_hash !== contributionAlignmentVersionedWeightObjectHash(source)) {
    gaps.push("source_weight_object hash drifted");
  }
  if (frameRef.weight_object_hash && source.weight_object_hash && frameRef.weight_object_hash !== source.weight_object_hash) {
    gaps.push("source_weight_object does not match frame ref");
  }
  return sanitizeGaps(gaps);
}

function buildReviewedFeatureWeights(sourceFrame: any): AnyRecord[] {
  return asArray(sourceFrame?.feature_weight_composition).map((feature) => ({
    feature_id: feature.feature_id,
    weight: feature.weight,
    source_bound: feature.source_bound === true,
    readiness_role: "eligible_for_later_model_specification",
    output_value_present: false
  }));
}

function buildReview(sourceFrame: any, sourceWeightObject: any, state: string, gaps: string[]): AnyRecord {
  const ready = state === READY_STATE;
  const review: AnyRecord = {
    schema_version: CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_READINESS_REVIEW_SCHEMA_VERSION,
    review_id: `contribution_alignment_internal_bayesian_readiness_review_${sha256Json({
      frame_id: sourceFrame?.frame_id ?? null,
      frame_hash: sourceFrame?.frame_hash ?? null,
      review_version: REVIEW_VERSION
    }).slice(0, 16)}`,
    review_state: state,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: ready,
    source_frame_ref: sourceFrameRef(sourceFrame),
    source_weight_object_ref: sourceWeightObjectRef(sourceWeightObject, sourceFrame),
    review_version: ready ? REVIEW_VERSION : null,
    candidate_model_family: ready ? CANDIDATE_MODEL_FAMILY : null,
    review_policy: {
      internal_only: true,
      readiness_review_only: true,
      model_specification_authorized: ready,
      bayesian_execution_authorized: false,
      bayesian_model_output_authorized: false,
      posterior_output_authorized: false,
      confidence_output_authorized: false,
      probability_output_authorized: false,
      finance_output_authorized: false,
      customer_output_authorized: false
    },
    readiness_checks: {
      weighted_frame_source_bound: ready,
      weighted_composition_present: ready,
      weights_sum_to_one: ready,
      repeated_milestone_context_required: ready,
      selected_metric_context_required: ready,
      comparison_design_strength_required: ready,
      no_score_or_output_present: ready,
      privacy_boundary_clear: ready
    },
    reviewed_feature_weights: ready ? buildReviewedFeatureWeights(sourceFrame) : [],
    allowed_next_step: ready ? READY_NEXT_STEP : HELD_NEXT_STEP,
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      bayesian_model_specification: ready,
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: {
      receives_weighted_internal_model_frame_only: state !== REJECT_STATE,
      receives_versioned_weight_object_ref: state !== REJECT_STATE,
      ...falseMap(
        BOUNDARY_POLICY_FIELDS.filter((field) =>
          ![
            "receives_weighted_internal_model_frame_only",
            "receives_versioned_weight_object_ref"
          ].includes(field)
        )
      )
    },
    validation_summary: {
      schema_version: `${CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_READINESS_REVIEW_SCHEMA_VERSION}_SUMMARY`,
      valid: ready,
      review_state: state,
      gaps: ready ? [] : sanitizeGaps(gaps)
    }
  };
  review.review_hash = contributionAlignmentInternalBayesianReadinessReviewHash(review);
  return review;
}

function rejectedReview(): AnyRecord {
  const review: AnyRecord = {
    schema_version: CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_READINESS_REVIEW_SCHEMA_VERSION,
    review_id: null,
    review_state: REJECT_STATE,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: false,
    reviewed_feature_weights: [],
    validation_summary: {
      schema_version: `${CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_READINESS_REVIEW_SCHEMA_VERSION}_SUMMARY`,
      valid: false,
      review_state: REJECT_STATE,
      gaps: ["boundary leakage rejected"]
    }
  };
  review.review_hash = contributionAlignmentInternalBayesianReadinessReviewHash(review);
  return review;
}

export function contributionAlignmentInternalBayesianReadinessReviewHash(review: unknown): string {
  const withoutHash = clone(review);
  delete withoutHash.review_hash;
  return sha256Json(withoutHash);
}

export function buildContributionAlignmentInternalBayesianReadinessReviewFromObject(
  input: unknown,
  options: AnyRecord = {}
): AnyRecord {
  const wrapperGaps = inputBoundaryGaps(input);
  if (wrapperGaps.length > 0) return rejectedReview();
  const sourceFrame = sourceFrameFromInput(input);
  const sourceWeightObject = sourceWeightObjectFromInput(input, options);
  const gaps = sanitizeGaps([
    ...sourceFrameGaps(sourceFrame),
    ...sourceWeightObjectGaps(sourceWeightObject, sourceFrame)
  ]);
  return buildReview(sourceFrame, sourceWeightObject, gaps.length === 0 ? READY_STATE : HOLD_STATE, gaps);
}

function collectAllowedFieldsGaps(record: unknown, fields: Set<string>, label: string): string[] {
  return Object.keys(asRecord(record))
    .filter((key) => !fields.has(key))
    .map(() => `${label} contains ungoverned field`);
}

function collectRefGaps(record: unknown, fields: string[], label: string): string[] {
  const ref = asRecord(record);
  const gaps: string[] = [];
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(ref, field)) gaps.push(`${label}.${field} is required`);
  }
  gaps.push(...collectAllowedFieldsGaps(ref, new Set(fields), label));
  return gaps;
}

function rejectValidation(review: any): AnyRecord | null {
  if (review?.review_state !== REJECT_STATE) return null;
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid: false,
    gaps: ["boundary leakage rejected"]
  };
}

function collectShapeGaps(review: any): string[] {
  const rejected = rejectValidation(review);
  if (rejected) return rejected.gaps;

  const record = asRecord(review);
  const gaps: string[] = [];
  gaps.push(...collectAllowedFieldsGaps(record, TOP_LEVEL_FIELDS, "review"));
  if (record.schema_version !== CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_READINESS_REVIEW_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  if (![READY_STATE, HOLD_STATE].includes(record.review_state)) {
    gaps.push("review_state is invalid");
  }
  const ready = record.review_state === READY_STATE;
  if (record.source_bound !== ready) gaps.push(`source_bound must be ${ready}`);
  if (record.review_version !== (ready ? REVIEW_VERSION : null)) {
    gaps.push(`review_version must be ${ready ? REVIEW_VERSION : "null"}`);
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

  gaps.push(...collectRefGaps(record.source_frame_ref, SOURCE_FRAME_REF_FIELDS, "source_frame_ref"));
  gaps.push(...collectRefGaps(record.source_weight_object_ref, SOURCE_WEIGHT_OBJECT_REF_FIELDS, "source_weight_object_ref"));

  const policy = asRecord(record.review_policy);
  gaps.push(...collectRefGaps(policy, REVIEW_POLICY_FIELDS, "review_policy"));
  for (const [field, expected] of Object.entries({
    internal_only: true,
    readiness_review_only: true,
    model_specification_authorized: ready,
    bayesian_execution_authorized: false,
    bayesian_model_output_authorized: false,
    posterior_output_authorized: false,
    confidence_output_authorized: false,
    probability_output_authorized: false,
    finance_output_authorized: false,
    customer_output_authorized: false
  })) {
    if (policy[field] !== expected) gaps.push(`review_policy.${field} must be ${expected}`);
  }

  const checks = asRecord(record.readiness_checks);
  gaps.push(...collectRefGaps(checks, READINESS_CHECK_FIELDS, "readiness_checks"));
  for (const field of READINESS_CHECK_FIELDS) {
    if (checks[field] !== ready) gaps.push(`readiness_checks.${field} must be ${ready}`);
  }

  const weights = asArray(record.reviewed_feature_weights);
  if (ready && stableStringify(weights.map((feature) => feature.feature_id)) !== stableStringify(FEATURE_IDS)) {
    gaps.push("reviewed_feature_weights must match governed feature registry");
  }
  if (!ready && weights.length !== 0) gaps.push("reviewed_feature_weights must be empty while held");
  const sum = Number(weights.reduce((total, feature) => total + Number(feature.weight ?? 0), 0).toFixed(6));
  if (ready && sum !== 1) gaps.push("reviewed_feature_weights must sum to one");
  for (const weight of weights) {
    gaps.push(...collectRefGaps(weight, REVIEWED_FEATURE_WEIGHT_FIELDS, "reviewed_feature_weights[]"));
    if (weight.weight !== 0.1) gaps.push("reviewed_feature_weights must keep neutral equal weights");
    if (weight.source_bound !== true) gaps.push("reviewed_feature_weights must remain source-bound");
    if (weight.readiness_role !== "eligible_for_later_model_specification") {
      gaps.push("reviewed_feature_weights.readiness_role is invalid");
    }
    if (weight.output_value_present !== false) {
      gaps.push("reviewed_feature_weights must not contain output values");
    }
  }

  const feeds = asRecord(record.feeds);
  if (feeds.bayesian_model_specification !== ready) {
    gaps.push(`feeds.bayesian_model_specification must be ${ready}`);
  }
  for (const feed of FALSE_FEEDS) {
    if (feeds[feed] !== false) gaps.push(`feeds.${feed} must be false`);
  }
  for (const key of Object.keys(feeds)) {
    if (key !== "bayesian_model_specification" && !FALSE_FEEDS.includes(key)) {
      gaps.push("feeds contains ungoverned field");
    }
  }

  const boundary = asRecord(record.boundary_policy);
  for (const field of BOUNDARY_POLICY_FIELDS) {
    const expected = [
      "receives_weighted_internal_model_frame_only",
      "receives_versioned_weight_object_ref"
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
  if (summary.review_state !== record.review_state) {
    gaps.push("validation_summary.review_state must match review_state");
  }
  if (ready && asArray(summary.gaps).length !== 0) {
    gaps.push("validation_summary.gaps must be empty for ready review");
  }
  if (record.review_hash !== contributionAlignmentInternalBayesianReadinessReviewHash(record)) {
    gaps.push("review_hash must match review body");
  }
  gaps.push(...hasForbiddenContent(record));
  return sanitizeGaps(gaps);
}

function collectSourceBindingGaps(review: unknown, options: AnyRecord = {}): string[] {
  const gaps: string[] = [];
  if (options.sourceFrame) {
    const frameGaps = sourceFrameGaps(options.sourceFrame);
    if (frameGaps.length > 0) gaps.push(...frameGaps);
  }
  if (options.sourceWeightObject) {
    const weightGaps = sourceWeightObjectGaps(options.sourceWeightObject, options.sourceFrame);
    if (weightGaps.length > 0) gaps.push(...weightGaps);
  }
  if (options.expectedReview) {
    const actualWithoutHash = clone(review);
    const expectedWithoutHash = clone(options.expectedReview);
    delete actualWithoutHash.review_hash;
    delete expectedWithoutHash.review_hash;
    if (stableStringify(actualWithoutHash) !== stableStringify(expectedWithoutHash)) {
      gaps.push("Bayesian readiness binding mismatch against sourceFrame");
    }
  }
  return sanitizeGaps(gaps);
}

export function validateContributionAlignmentInternalBayesianReadinessReview(review: any, options: AnyRecord = {}): AnyRecord {
  if (review?.review_state === REJECT_STATE) {
    return rejectValidation(review) as AnyRecord;
  }
  const gaps = sanitizeGaps([
    ...collectShapeGaps(review),
    ...collectSourceBindingGaps(review, options)
  ]);
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid: gaps.length === 0 && review?.review_state === READY_STATE,
    gaps
  };
}
