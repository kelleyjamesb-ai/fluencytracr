// Ported verbatim from
// scripts/run_ai_value_contribution_alignment_versioned_weight_object.mjs
// under OpenSpec change add-confidence-engine-workspace (task 3.1, module 3).
// Byte-compatibility contract enforced by the golden parity suite.

import { sha256Json } from "./internal/hashing";
import {
  CONTRIBUTION_ALIGNMENT_FEATURE_STABILITY_REVIEW_SCHEMA_VERSION,
  contributionAlignmentFeatureStabilityReviewHash
} from "./featureStabilityReview";
import {
  CONTRIBUTION_ALIGNMENT_INTERNAL_NUMERIC_WEIGHT_DECISION_SCHEMA_VERSION,
  contributionAlignmentInternalNumericWeightDecisionHash
} from "./internalNumericWeightDecision";

type AnyRecord = Record<string, any>;

export const CONTRIBUTION_ALIGNMENT_VERSIONED_WEIGHT_OBJECT_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_VERSIONED_WEIGHT_OBJECT_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_VERSIONED_WEIGHT_OBJECT_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_contribution_alignment_versioned_weight_object_2026_06";

const READY_STATE = "VERSIONED_INTERNAL_WEIGHT_OBJECT_READY";
const HOLD_STATE = "HOLD_FOR_INTERNAL_NUMERIC_WEIGHT_DECISION";
const REJECT_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const WEIGHT_VERSION = "internal_structural_equal_weights_2026_06";
const CALIBRATION_STATE = "initial_internal_structural_weights_not_empirical_confidence";
const READY_NEXT_STEP = "weighted_internal_model_frame_only";
const HELD_NEXT_STEP = "complete_internal_numeric_weight_decision";

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
  "weighted_internal_model_output",
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

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "weight_object_id",
  "weight_object_state",
  "generated_at",
  "derivation_version",
  "source_bound",
  "source_weight_decision_ref",
  "source_feature_stability_review_ref",
  "weight_version",
  "calibration_state",
  "weight_policy",
  "weights",
  "allowed_next_step",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "boundary_policy",
  "validation_summary",
  "weight_object_hash"
]);

const SOURCE_WEIGHT_DECISION_REF_FIELDS = [
  "schema_version",
  "decision_id",
  "decision_state",
  "decision_hash"
];

const SOURCE_FEATURE_STABILITY_REVIEW_REF_FIELDS = [
  "schema_version",
  "review_id",
  "review_state",
  "review_hash"
];

const WEIGHT_POLICY_FIELDS = [
  "internal_only",
  "structural_initial_weights_only",
  "empirical_calibration_present",
  "weights_sum_to_one",
  "all_weighted_components_source_bound",
  "weighted_model_output_authorized",
  "bayesian_execution_authorized",
  "customer_output_authorized"
];

const WEIGHT_FIELDS = [
  "feature_id",
  "weight",
  "source_bound",
  "rationale"
];

const BOUNDARY_POLICY_FIELDS = [
  "receives_internal_numeric_weight_decision_only",
  "receives_feature_stability_review_ref",
  "receives_full_source_payload",
  "receives_raw_rows",
  "receives_query_text",
  "receives_identifiers",
  "persists_weight_object",
  "creates_routes",
  "creates_ui",
  "creates_schemas",
  "creates_exports",
  "runs_live_connectors",
  "implements_weighted_model_output",
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

const ALLOWED_INPUT_FIELDS = new Set([
  "source_weight_decision",
  "source_feature_stability_review",
  "generated_at"
]);

const REQUIRED_BLOCKED_USES = [
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
  "Versioned Weight Object is internal-only and contains neutral structural weights, not empirical confidence.",
  "Weights are equal initial weights over the approved source-bound feature registry.",
  "This object feeds only a later weighted internal model frame.",
  "It does not emit confidence, probability, score, ROI, finance, causality, productivity, Bayesian execution, or customer-facing output."
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

function sourceWeightDecisionFromInput(input: unknown): any {
  const record = asRecord(input);
  return record.source_weight_decision ?? input;
}

function sourceFeatureReviewFromInput(input: unknown, options: AnyRecord = {}): any {
  const record = asRecord(input);
  return options.sourceFeatureStabilityReview ?? record.source_feature_stability_review ?? null;
}

function inputBoundaryGaps(input: unknown): string[] {
  const record = asRecord(input);
  if (!Object.prototype.hasOwnProperty.call(record, "source_weight_decision")) return [];
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

function sourceWeightDecisionRef(sourceDecision: any): AnyRecord {
  return {
    schema_version:
      sourceDecision?.schema_version ===
      CONTRIBUTION_ALIGNMENT_INTERNAL_NUMERIC_WEIGHT_DECISION_SCHEMA_VERSION
        ? sourceDecision.schema_version
        : null,
    decision_id: safeId(
      sourceDecision?.decision_id,
      "contribution_alignment_internal_numeric_weight_decision"
    ),
    decision_state:
      sourceDecision?.decision_state === "PROMOTE_INTERNAL_NUMERIC_WEIGHT_OBJECT"
        ? sourceDecision.decision_state
        : null,
    decision_hash: safeHash(sourceDecision?.decision_hash)
  };
}

function sourceFeatureReviewRef(sourceReview: any, sourceDecision: any): AnyRecord {
  const decisionRef = asRecord(sourceDecision?.source_feature_stability_review_ref);
  return {
    schema_version:
      sourceReview?.schema_version === CONTRIBUTION_ALIGNMENT_FEATURE_STABILITY_REVIEW_SCHEMA_VERSION
        ? sourceReview.schema_version
        : decisionRef.schema_version === CONTRIBUTION_ALIGNMENT_FEATURE_STABILITY_REVIEW_SCHEMA_VERSION
          ? decisionRef.schema_version
          : null,
    review_id: safeId(
      sourceReview?.review_id ?? decisionRef.review_id,
      "contribution_alignment_feature_stability_review"
    ),
    review_state:
      (sourceReview?.review_state ?? decisionRef.review_state) ===
      "FEATURE_STABILITY_REVIEW_PASSED_FOR_INTERNAL_WEIGHT_DECISION"
        ? (sourceReview?.review_state ?? decisionRef.review_state)
        : null,
    review_hash: safeHash(sourceReview?.review_hash ?? decisionRef.review_hash)
  };
}

function hasForbiddenContent(value: unknown, path = "weight_object"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => hasForbiddenContent(item, `${path}[${index}]`));
  }
  if (value && typeof value === "object") {
    const gaps: string[] = [];
    for (const [key, nested] of Object.entries(value)) {
      const safeFalseFlag =
        nested === false &&
        (
          path === "weight_object.feeds" ||
          path === "weight_object.boundary_policy" ||
          path === "weight_object.weight_policy"
        );
      if (!safeFalseFlag && FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
        gaps.push("weight_object contains forbidden field name");
        continue;
      }
      gaps.push(...hasForbiddenContent(nested, `${path}.${key}`));
    }
    return gaps;
  }
  if (typeof value !== "string") return [];
  if (
    path.startsWith("weight_object.blocked_uses[") ||
    path.startsWith("weight_object.required_caveats[")
  ) {
    return [];
  }
  if (path === "weight_object.calibration_state" && value === CALIBRATION_STATE) return [];
  return FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
    ? [`${path} contains unsafe source or output language`]
    : [];
}

function sourceFeatureReviewGaps(sourceReview: any, sourceDecision: any): string[] {
  if (!sourceReview) return [];
  const source = asRecord(sourceReview);
  const decisionRef = asRecord(sourceDecision?.source_feature_stability_review_ref);
  const gaps: string[] = [];
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
  if (source.feeds?.internal_numeric_weight_decision !== true) {
    gaps.push("source_feature_stability_review does not feed weight decision");
  }
  if (
    decisionRef.review_hash &&
    source.review_hash &&
    decisionRef.review_hash !== source.review_hash
  ) {
    gaps.push("source_feature_stability_review does not match weight decision ref");
  }
  const registry = asArray(source.feature_registry);
  if (stableStringify(registry.map((feature) => feature.feature_id)) !== stableStringify(FEATURE_IDS)) {
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

function sourceWeightDecisionGaps(sourceDecision: any): string[] {
  const source = asRecord(sourceDecision);
  const gaps: string[] = [];
  if (source.schema_version !== CONTRIBUTION_ALIGNMENT_INTERNAL_NUMERIC_WEIGHT_DECISION_SCHEMA_VERSION) {
    gaps.push("source_weight_decision.schema_version is invalid");
  }
  if (source.decision_state !== "PROMOTE_INTERNAL_NUMERIC_WEIGHT_OBJECT") {
    gaps.push("source_weight_decision.decision_state is not ready");
  }
  if (source.decision_hash !== contributionAlignmentInternalNumericWeightDecisionHash(source)) {
    gaps.push("source_weight_decision.hash drifted");
  }
  if (source.validation_summary?.valid !== true) {
    gaps.push("source_weight_decision.validation_summary is not valid");
  }
  if (source.weight_decision_scope?.versioned_weight_object_authorized !== true) {
    gaps.push("source_weight_decision.versioned_weight_object_authorized is false");
  }
  if (source.weight_decision_scope?.weight_values_present !== false) {
    gaps.push("source_weight_decision already contains weight values");
  }
  if (source.weight_decision_scope?.weighted_model_frame_authorized !== false) {
    gaps.push("source_weight_decision already authorizes weighted model frame");
  }
  if (source.weight_decision_scope?.bayesian_execution_authorized !== false) {
    gaps.push("source_weight_decision already authorizes Bayesian execution");
  }
  if (source.feeds?.versioned_internal_weight_object !== true) {
    gaps.push("source_weight_decision does not feed versioned weight object");
  }
  return sanitizeGaps(gaps);
}

function buildWeights(): AnyRecord[] {
  return FEATURE_IDS.map((featureId) => ({
    feature_id: featureId,
    weight: 0.1,
    source_bound: true,
    rationale: "neutral_initial_structural_weight"
  }));
}

function buildWeightObject(sourceDecision: any, sourceReview: any, state: string, gaps: string[]): AnyRecord {
  const ready = state === READY_STATE;
  const weights = ready ? buildWeights() : [];
  const weightObject: AnyRecord = {
    schema_version: CONTRIBUTION_ALIGNMENT_VERSIONED_WEIGHT_OBJECT_SCHEMA_VERSION,
    weight_object_id: `contribution_alignment_versioned_weight_object_${sha256Json({
      decision_id: sourceDecision?.decision_id ?? null,
      decision_hash: sourceDecision?.decision_hash ?? null,
      weight_version: WEIGHT_VERSION
    }).slice(0, 16)}`,
    weight_object_state: state,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: ready,
    source_weight_decision_ref: sourceWeightDecisionRef(sourceDecision),
    source_feature_stability_review_ref: sourceFeatureReviewRef(sourceReview, sourceDecision),
    weight_version: ready ? WEIGHT_VERSION : null,
    calibration_state: ready ? CALIBRATION_STATE : null,
    weight_policy: {
      internal_only: true,
      structural_initial_weights_only: ready,
      empirical_calibration_present: false,
      weights_sum_to_one: ready,
      all_weighted_components_source_bound: ready,
      weighted_model_output_authorized: false,
      bayesian_execution_authorized: false,
      customer_output_authorized: false
    },
    weights,
    allowed_next_step: ready ? READY_NEXT_STEP : HELD_NEXT_STEP,
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      weighted_internal_model_frame: ready,
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: {
      receives_internal_numeric_weight_decision_only: state !== REJECT_STATE,
      receives_feature_stability_review_ref: state !== REJECT_STATE,
      ...falseMap(
        BOUNDARY_POLICY_FIELDS.filter((field) =>
          ![
            "receives_internal_numeric_weight_decision_only",
            "receives_feature_stability_review_ref"
          ].includes(field)
        )
      )
    },
    validation_summary: {
      schema_version: `${CONTRIBUTION_ALIGNMENT_VERSIONED_WEIGHT_OBJECT_SCHEMA_VERSION}_SUMMARY`,
      valid: ready,
      weight_object_state: state,
      gaps: ready ? [] : sanitizeGaps(gaps)
    }
  };
  weightObject.weight_object_hash = contributionAlignmentVersionedWeightObjectHash(weightObject);
  return weightObject;
}

function rejectedWeightObject(): AnyRecord {
  const weightObject: AnyRecord = {
    schema_version: CONTRIBUTION_ALIGNMENT_VERSIONED_WEIGHT_OBJECT_SCHEMA_VERSION,
    weight_object_id: null,
    weight_object_state: REJECT_STATE,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: false,
    weights: [],
    validation_summary: {
      schema_version: `${CONTRIBUTION_ALIGNMENT_VERSIONED_WEIGHT_OBJECT_SCHEMA_VERSION}_SUMMARY`,
      valid: false,
      weight_object_state: REJECT_STATE,
      gaps: ["boundary leakage rejected"]
    }
  };
  weightObject.weight_object_hash = contributionAlignmentVersionedWeightObjectHash(weightObject);
  return weightObject;
}

export function contributionAlignmentVersionedWeightObjectHash(weightObject: unknown): string {
  const withoutHash = clone(weightObject);
  delete withoutHash.weight_object_hash;
  return sha256Json(withoutHash);
}

export function buildContributionAlignmentVersionedWeightObjectFromObject(input: unknown, options: AnyRecord = {}): AnyRecord {
  const wrapperGaps = inputBoundaryGaps(input);
  if (wrapperGaps.length > 0) return rejectedWeightObject();
  const sourceDecision = sourceWeightDecisionFromInput(input);
  const sourceReview = sourceFeatureReviewFromInput(input, options);
  const gaps = sanitizeGaps([
    ...sourceWeightDecisionGaps(sourceDecision),
    ...sourceFeatureReviewGaps(sourceReview, sourceDecision)
  ]);
  return buildWeightObject(sourceDecision, sourceReview, gaps.length === 0 ? READY_STATE : HOLD_STATE, gaps);
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

function rejectValidation(weightObject: any): AnyRecord | null {
  if (weightObject?.weight_object_state !== REJECT_STATE) return null;
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid: false,
    gaps: ["boundary leakage rejected"]
  };
}

function collectShapeGaps(weightObject: any): string[] {
  const rejected = rejectValidation(weightObject);
  if (rejected) return rejected.gaps;

  const record = asRecord(weightObject);
  const gaps: string[] = [];
  gaps.push(...collectAllowedFieldsGaps(record, TOP_LEVEL_FIELDS, "weight_object"));
  if (record.schema_version !== CONTRIBUTION_ALIGNMENT_VERSIONED_WEIGHT_OBJECT_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  if (![READY_STATE, HOLD_STATE].includes(record.weight_object_state)) {
    gaps.push("weight_object_state is invalid");
  }
  const ready = record.weight_object_state === READY_STATE;
  if (record.source_bound !== ready) gaps.push(`source_bound must be ${ready}`);
  if (record.weight_version !== (ready ? WEIGHT_VERSION : null)) {
    gaps.push(`weight_version must be ${ready ? WEIGHT_VERSION : "null"}`);
  }
  if (record.calibration_state !== (ready ? CALIBRATION_STATE : null)) {
    gaps.push("calibration_state is invalid");
  }
  if (ready && record.allowed_next_step !== READY_NEXT_STEP) {
    gaps.push(`allowed_next_step must be ${READY_NEXT_STEP}`);
  }
  if (!ready && record.allowed_next_step !== HELD_NEXT_STEP) {
    gaps.push(`allowed_next_step must be ${HELD_NEXT_STEP}`);
  }

  gaps.push(...collectRefGaps(record.source_weight_decision_ref, SOURCE_WEIGHT_DECISION_REF_FIELDS, "source_weight_decision_ref"));
  gaps.push(...collectRefGaps(record.source_feature_stability_review_ref, SOURCE_FEATURE_STABILITY_REVIEW_REF_FIELDS, "source_feature_stability_review_ref"));

  const policy = asRecord(record.weight_policy);
  gaps.push(...collectRefGaps(policy, WEIGHT_POLICY_FIELDS, "weight_policy"));
  for (const [field, expected] of Object.entries({
    internal_only: true,
    structural_initial_weights_only: ready,
    empirical_calibration_present: false,
    weights_sum_to_one: ready,
    all_weighted_components_source_bound: ready,
    weighted_model_output_authorized: false,
    bayesian_execution_authorized: false,
    customer_output_authorized: false
  })) {
    if (policy[field] !== expected) gaps.push(`weight_policy.${field} must be ${expected}`);
  }

  const weights = asArray(record.weights);
  if (ready && stableStringify(weights.map((weight) => weight.feature_id)) !== stableStringify(FEATURE_IDS)) {
    gaps.push("weights must match governed feature registry");
  }
  if (!ready && weights.length !== 0) gaps.push("weights must be empty while held");
  const sum = Number(weights.reduce((total, weight) => total + Number(weight.weight ?? 0), 0).toFixed(6));
  if (ready && sum !== 1) gaps.push("weights must sum to one");
  for (const weight of weights) {
    gaps.push(...collectRefGaps(weight, WEIGHT_FIELDS, "weights[]"));
    if (weight.weight !== 0.1) gaps.push("weights must remain neutral equal weights");
    if (weight.source_bound !== true) gaps.push("weights must remain source-bound");
    if (weight.rationale !== "neutral_initial_structural_weight") {
      gaps.push("weights must use governed rationale");
    }
  }

  const feeds = asRecord(record.feeds);
  if (feeds.weighted_internal_model_frame !== ready) {
    gaps.push(`feeds.weighted_internal_model_frame must be ${ready}`);
  }
  for (const feed of FALSE_FEEDS) {
    if (feeds[feed] !== false) gaps.push(`feeds.${feed} must be false`);
  }
  for (const key of Object.keys(feeds)) {
    if (key !== "weighted_internal_model_frame" && !FALSE_FEEDS.includes(key)) {
      gaps.push("feeds contains ungoverned field");
    }
  }

  const boundary = asRecord(record.boundary_policy);
  for (const field of BOUNDARY_POLICY_FIELDS) {
    const expected = [
      "receives_internal_numeric_weight_decision_only",
      "receives_feature_stability_review_ref"
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
  if (summary.weight_object_state !== record.weight_object_state) {
    gaps.push("validation_summary.weight_object_state must match weight_object_state");
  }
  if (ready && asArray(summary.gaps).length !== 0) {
    gaps.push("validation_summary.gaps must be empty for ready object");
  }
  if (record.weight_object_hash !== contributionAlignmentVersionedWeightObjectHash(record)) {
    gaps.push("weight_object_hash must match weight object body");
  }
  gaps.push(...hasForbiddenContent(record));
  return sanitizeGaps(gaps);
}

function collectSourceBindingGaps(weightObject: unknown, options: AnyRecord = {}): string[] {
  const gaps: string[] = [];
  if (options.sourceWeightDecision) {
    const decisionGaps = sourceWeightDecisionGaps(options.sourceWeightDecision);
    if (decisionGaps.length > 0) gaps.push(...decisionGaps);
  }
  if (options.sourceFeatureStabilityReview) {
    const reviewGaps = sourceFeatureReviewGaps(
      options.sourceFeatureStabilityReview,
      options.sourceWeightDecision
    );
    if (reviewGaps.length > 0) gaps.push(...reviewGaps);
  }
  if (options.expectedWeightObject) {
    const actualWithoutHash = clone(weightObject);
    const expectedWithoutHash = clone(options.expectedWeightObject);
    delete actualWithoutHash.weight_object_hash;
    delete expectedWithoutHash.weight_object_hash;
    if (stableStringify(actualWithoutHash) !== stableStringify(expectedWithoutHash)) {
      gaps.push("weights binding mismatch against sourceWeightDecision");
    }
  }
  return sanitizeGaps(gaps);
}

export function validateContributionAlignmentVersionedWeightObject(weightObject: any, options: AnyRecord = {}): AnyRecord {
  if (weightObject?.weight_object_state === REJECT_STATE) {
    return rejectValidation(weightObject) as AnyRecord;
  }
  const gaps = sanitizeGaps([
    ...collectShapeGaps(weightObject),
    ...collectSourceBindingGaps(weightObject, options)
  ]);
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid: gaps.length === 0 && weightObject?.weight_object_state === READY_STATE,
    gaps
  };
}
