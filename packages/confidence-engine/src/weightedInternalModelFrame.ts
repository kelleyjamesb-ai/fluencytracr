// Ported verbatim from
// scripts/run_ai_value_contribution_alignment_weighted_internal_model_frame.mjs
// under OpenSpec change add-confidence-engine-workspace (task 3.1, module 4).
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
import {
  CONTRIBUTION_ALIGNMENT_VERSIONED_WEIGHT_OBJECT_SCHEMA_VERSION,
  contributionAlignmentVersionedWeightObjectHash
} from "./versionedWeightObject";

type AnyRecord = Record<string, any>;

export const CONTRIBUTION_ALIGNMENT_WEIGHTED_INTERNAL_MODEL_FRAME_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_WEIGHTED_INTERNAL_MODEL_FRAME_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_WEIGHTED_INTERNAL_MODEL_FRAME_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_contribution_alignment_weighted_internal_model_frame_2026_06";

const READY_STATE = "WEIGHTED_INTERNAL_MODEL_FRAME_READY";
const HOLD_STATE = "HOLD_FOR_VERSIONED_WEIGHT_OBJECT";
const REJECT_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const FRAME_VERSION = "internal_weighted_feature_composition_frame_2026_06";
const READY_NEXT_STEP = "internal_bayesian_readiness_review_only";
const HELD_NEXT_STEP = "complete_versioned_weight_object";

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
  "aggregate_score_output",
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
  "frame_id",
  "frame_state",
  "generated_at",
  "derivation_version",
  "source_bound",
  "source_weight_object_ref",
  "source_weight_decision_ref",
  "source_feature_stability_review_ref",
  "frame_version",
  "frame_policy",
  "feature_weight_composition",
  "allowed_next_step",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "boundary_policy",
  "validation_summary",
  "frame_hash"
]);

const SOURCE_WEIGHT_OBJECT_REF_FIELDS = [
  "schema_version",
  "weight_object_id",
  "weight_object_state",
  "weight_version",
  "weight_object_hash"
];

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

const FRAME_POLICY_FIELDS = [
  "internal_only",
  "weighted_feature_composition_present",
  "feature_weights_source_bound",
  "aggregate_score_output_authorized",
  "weighted_internal_model_output_authorized",
  "confidence_output_authorized",
  "probability_output_authorized",
  "bayesian_execution_authorized",
  "customer_output_authorized"
];

const COMPOSITION_FIELDS = [
  "feature_id",
  "weight",
  "source_bound",
  "frame_role",
  "value_output_present"
];

const BOUNDARY_POLICY_FIELDS = [
  "receives_versioned_weight_object_only",
  "receives_weight_decision_ref",
  "receives_feature_stability_review_ref",
  "receives_full_source_payload",
  "receives_raw_rows",
  "receives_query_text",
  "receives_identifiers",
  "persists_frame",
  "creates_routes",
  "creates_ui",
  "creates_schemas",
  "creates_exports",
  "runs_live_connectors",
  "implements_weighted_model_output",
  "implements_bayesian_model",
  "emits_model_output",
  "emits_aggregate_score_output",
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
  "source_weight_object",
  "source_weight_decision",
  "source_feature_stability_review",
  "generated_at"
]);

const REQUIRED_BLOCKED_USES = [
  "weighted_internal_model_output",
  "research_model_feed",
  "aggregate_score_output",
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
  "Weighted Internal Model Frame is internal-only feature composition, not a model result.",
  "The frame carries source-bound weights forward without emitting aggregate score, confidence, probability, ROI, finance, causality, productivity, or customer-facing output.",
  "Bayesian execution remains blocked; this frame may only feed a later internal Bayesian readiness review.",
  "The frame must remain bound to the versioned weight object and upstream source refs."
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

function sourceWeightObjectFromInput(input: unknown): any {
  const record = asRecord(input);
  return record.source_weight_object ?? input;
}

function sourceWeightDecisionFromInput(input: unknown, options: AnyRecord = {}): any {
  const record = asRecord(input);
  return options.sourceWeightDecision ?? record.source_weight_decision ?? null;
}

function sourceFeatureReviewFromInput(input: unknown, options: AnyRecord = {}): any {
  const record = asRecord(input);
  return options.sourceFeatureStabilityReview ?? record.source_feature_stability_review ?? null;
}

function inputBoundaryGaps(input: unknown): string[] {
  const record = asRecord(input);
  if (!Object.prototype.hasOwnProperty.call(record, "source_weight_object")) return [];
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

function sourceWeightObjectRef(sourceWeightObject: any): AnyRecord {
  return {
    schema_version:
      sourceWeightObject?.schema_version === CONTRIBUTION_ALIGNMENT_VERSIONED_WEIGHT_OBJECT_SCHEMA_VERSION
        ? sourceWeightObject.schema_version
        : null,
    weight_object_id: safeId(
      sourceWeightObject?.weight_object_id,
      "contribution_alignment_versioned_weight_object"
    ),
    weight_object_state:
      sourceWeightObject?.weight_object_state === "VERSIONED_INTERNAL_WEIGHT_OBJECT_READY"
        ? sourceWeightObject.weight_object_state
        : null,
    weight_version:
      sourceWeightObject?.weight_version === "internal_structural_equal_weights_2026_06"
        ? sourceWeightObject.weight_version
        : null,
    weight_object_hash: safeHash(sourceWeightObject?.weight_object_hash)
  };
}

function sourceWeightDecisionRef(sourceDecision: any, sourceWeightObject: any): AnyRecord {
  const objectRef = asRecord(sourceWeightObject?.source_weight_decision_ref);
  return {
    schema_version:
      (sourceDecision?.schema_version ?? objectRef.schema_version) ===
      CONTRIBUTION_ALIGNMENT_INTERNAL_NUMERIC_WEIGHT_DECISION_SCHEMA_VERSION
        ? (sourceDecision?.schema_version ?? objectRef.schema_version)
        : null,
    decision_id: safeId(
      sourceDecision?.decision_id ?? objectRef.decision_id,
      "contribution_alignment_internal_numeric_weight_decision"
    ),
    decision_state:
      (sourceDecision?.decision_state ?? objectRef.decision_state) ===
      "PROMOTE_INTERNAL_NUMERIC_WEIGHT_OBJECT"
        ? (sourceDecision?.decision_state ?? objectRef.decision_state)
        : null,
    decision_hash: safeHash(sourceDecision?.decision_hash ?? objectRef.decision_hash)
  };
}

function sourceFeatureReviewRef(sourceReview: any, sourceWeightObject: any): AnyRecord {
  const objectRef = asRecord(sourceWeightObject?.source_feature_stability_review_ref);
  return {
    schema_version:
      (sourceReview?.schema_version ?? objectRef.schema_version) ===
      CONTRIBUTION_ALIGNMENT_FEATURE_STABILITY_REVIEW_SCHEMA_VERSION
        ? (sourceReview?.schema_version ?? objectRef.schema_version)
        : null,
    review_id: safeId(
      sourceReview?.review_id ?? objectRef.review_id,
      "contribution_alignment_feature_stability_review"
    ),
    review_state:
      (sourceReview?.review_state ?? objectRef.review_state) ===
      "FEATURE_STABILITY_REVIEW_PASSED_FOR_INTERNAL_WEIGHT_DECISION"
        ? (sourceReview?.review_state ?? objectRef.review_state)
        : null,
    review_hash: safeHash(sourceReview?.review_hash ?? objectRef.review_hash)
  };
}

function hasForbiddenContent(value: unknown, path = "frame"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => hasForbiddenContent(item, `${path}[${index}]`));
  }
  if (value && typeof value === "object") {
    const gaps: string[] = [];
    for (const [key, nested] of Object.entries(value)) {
      const safeFalseFlag =
        nested === false &&
        (
          path === "frame.feeds" ||
          path === "frame.boundary_policy" ||
          path === "frame.frame_policy" ||
          path.startsWith("frame.feature_weight_composition[")
        );
      if (!safeFalseFlag && FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
        gaps.push("frame contains forbidden field name");
        continue;
      }
      gaps.push(...hasForbiddenContent(nested, `${path}.${key}`));
    }
    return gaps;
  }
  if (typeof value !== "string") return [];
  if (
    path.startsWith("frame.blocked_uses[") ||
    path.startsWith("frame.required_caveats[")
  ) {
    return [];
  }
  return FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
    ? [`${path} contains unsafe source or output language`]
    : [];
}

function sourceFeatureReviewGaps(sourceReview: any, sourceWeightObject: any): string[] {
  if (!sourceReview) return [];
  const source = asRecord(sourceReview);
  const objectRef = asRecord(sourceWeightObject?.source_feature_stability_review_ref);
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
  if (objectRef.review_hash && source.review_hash && objectRef.review_hash !== source.review_hash) {
    gaps.push("source_feature_stability_review does not match weight object ref");
  }
  return sanitizeGaps(gaps);
}

function sourceWeightDecisionGaps(sourceDecision: any, sourceWeightObject: any): string[] {
  if (!sourceDecision) return [];
  const source = asRecord(sourceDecision);
  const objectRef = asRecord(sourceWeightObject?.source_weight_decision_ref);
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
  if (objectRef.decision_hash && source.decision_hash && objectRef.decision_hash !== source.decision_hash) {
    gaps.push("source_weight_decision does not match weight object ref");
  }
  return sanitizeGaps(gaps);
}

function sourceWeightObjectGaps(sourceWeightObject: any): string[] {
  const source = asRecord(sourceWeightObject);
  const gaps: string[] = [];
  if (source.schema_version !== CONTRIBUTION_ALIGNMENT_VERSIONED_WEIGHT_OBJECT_SCHEMA_VERSION) {
    gaps.push("source_weight_object.schema_version is invalid");
  }
  if (source.weight_object_state !== "VERSIONED_INTERNAL_WEIGHT_OBJECT_READY") {
    gaps.push("source_weight_object.weight_object_state is not ready");
  }
  if (source.weight_object_hash !== contributionAlignmentVersionedWeightObjectHash(source)) {
    gaps.push("source_weight_object.hash drifted");
  }
  if (source.validation_summary?.valid !== true) {
    gaps.push("source_weight_object.validation_summary is not valid");
  }
  if (source.source_bound !== true) {
    gaps.push("source_weight_object is not source-bound");
  }
  if (source.weight_version !== "internal_structural_equal_weights_2026_06") {
    gaps.push("source_weight_object.weight_version is invalid");
  }
  if (source.calibration_state !== "initial_internal_structural_weights_not_empirical_confidence") {
    gaps.push("source_weight_object.calibration_state is invalid");
  }
  if (source.weight_policy?.weights_sum_to_one !== true) {
    gaps.push("source_weight_object.weights_sum_to_one is false");
  }
  if (source.weight_policy?.all_weighted_components_source_bound !== true) {
    gaps.push("source_weight_object weights are not source-bound");
  }
  if (source.weight_policy?.weighted_model_output_authorized !== false) {
    gaps.push("source_weight_object already authorizes weighted model output");
  }
  if (source.weight_policy?.bayesian_execution_authorized !== false) {
    gaps.push("source_weight_object already authorizes Bayesian execution");
  }
  if (source.feeds?.weighted_internal_model_frame !== true) {
    gaps.push("source_weight_object does not feed weighted internal model frame");
  }
  const weights = asArray(source.weights);
  if (stableStringify(weights.map((weight) => weight.feature_id)) !== stableStringify(FEATURE_IDS)) {
    gaps.push("source_weight_object weights do not match governed feature registry");
  }
  const sum = Number(weights.reduce((total, weight) => total + Number(weight.weight ?? 0), 0).toFixed(6));
  if (sum !== 1) gaps.push("source_weight_object weights must sum to one");
  for (const weight of weights) {
    if (weight.weight !== 0.1) gaps.push("source_weight_object weights are not neutral equal weights");
    if (weight.source_bound !== true) gaps.push("source_weight_object weight is not source-bound");
  }
  return sanitizeGaps(gaps);
}

function buildComposition(sourceWeightObject: any): AnyRecord[] {
  return asArray(sourceWeightObject?.weights).map((weight) => ({
    feature_id: weight.feature_id,
    weight: weight.weight,
    source_bound: weight.source_bound === true,
    frame_role: "internal_weighted_feature_component",
    value_output_present: false
  }));
}

function buildFrame(
  sourceWeightObject: any,
  sourceDecision: any,
  sourceReview: any,
  state: string,
  gaps: string[]
): AnyRecord {
  const ready = state === READY_STATE;
  const composition = ready ? buildComposition(sourceWeightObject) : [];
  const frame: AnyRecord = {
    schema_version: CONTRIBUTION_ALIGNMENT_WEIGHTED_INTERNAL_MODEL_FRAME_SCHEMA_VERSION,
    frame_id: `contribution_alignment_weighted_internal_model_frame_${sha256Json({
      weight_object_id: sourceWeightObject?.weight_object_id ?? null,
      weight_object_hash: sourceWeightObject?.weight_object_hash ?? null,
      frame_version: FRAME_VERSION
    }).slice(0, 16)}`,
    frame_state: state,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: ready,
    source_weight_object_ref: sourceWeightObjectRef(sourceWeightObject),
    source_weight_decision_ref: sourceWeightDecisionRef(sourceDecision, sourceWeightObject),
    source_feature_stability_review_ref: sourceFeatureReviewRef(sourceReview, sourceWeightObject),
    frame_version: ready ? FRAME_VERSION : null,
    frame_policy: {
      internal_only: true,
      weighted_feature_composition_present: ready,
      feature_weights_source_bound: ready,
      aggregate_score_output_authorized: false,
      weighted_internal_model_output_authorized: false,
      confidence_output_authorized: false,
      probability_output_authorized: false,
      bayesian_execution_authorized: false,
      customer_output_authorized: false
    },
    feature_weight_composition: composition,
    allowed_next_step: ready ? READY_NEXT_STEP : HELD_NEXT_STEP,
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      internal_bayesian_readiness_review: ready,
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: {
      receives_versioned_weight_object_only: state !== REJECT_STATE,
      receives_weight_decision_ref: state !== REJECT_STATE,
      receives_feature_stability_review_ref: state !== REJECT_STATE,
      ...falseMap(
        BOUNDARY_POLICY_FIELDS.filter((field) =>
          ![
            "receives_versioned_weight_object_only",
            "receives_weight_decision_ref",
            "receives_feature_stability_review_ref"
          ].includes(field)
        )
      )
    },
    validation_summary: {
      schema_version: `${CONTRIBUTION_ALIGNMENT_WEIGHTED_INTERNAL_MODEL_FRAME_SCHEMA_VERSION}_SUMMARY`,
      valid: ready,
      frame_state: state,
      gaps: ready ? [] : sanitizeGaps(gaps)
    }
  };
  frame.frame_hash = contributionAlignmentWeightedInternalModelFrameHash(frame);
  return frame;
}

function rejectedFrame(): AnyRecord {
  const frame: AnyRecord = {
    schema_version: CONTRIBUTION_ALIGNMENT_WEIGHTED_INTERNAL_MODEL_FRAME_SCHEMA_VERSION,
    frame_id: null,
    frame_state: REJECT_STATE,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: false,
    feature_weight_composition: [],
    validation_summary: {
      schema_version: `${CONTRIBUTION_ALIGNMENT_WEIGHTED_INTERNAL_MODEL_FRAME_SCHEMA_VERSION}_SUMMARY`,
      valid: false,
      frame_state: REJECT_STATE,
      gaps: ["boundary leakage rejected"]
    }
  };
  frame.frame_hash = contributionAlignmentWeightedInternalModelFrameHash(frame);
  return frame;
}

export function contributionAlignmentWeightedInternalModelFrameHash(frame: unknown): string {
  const withoutHash = clone(frame);
  delete withoutHash.frame_hash;
  return sha256Json(withoutHash);
}

export function buildContributionAlignmentWeightedInternalModelFrameFromObject(
  input: unknown,
  options: AnyRecord = {}
): AnyRecord {
  const wrapperGaps = inputBoundaryGaps(input);
  if (wrapperGaps.length > 0) return rejectedFrame();
  const sourceWeightObject = sourceWeightObjectFromInput(input);
  const sourceDecision = sourceWeightDecisionFromInput(input, options);
  const sourceReview = sourceFeatureReviewFromInput(input, options);
  const gaps = sanitizeGaps([
    ...sourceWeightObjectGaps(sourceWeightObject),
    ...sourceWeightDecisionGaps(sourceDecision, sourceWeightObject),
    ...sourceFeatureReviewGaps(sourceReview, sourceWeightObject)
  ]);
  return buildFrame(sourceWeightObject, sourceDecision, sourceReview, gaps.length === 0 ? READY_STATE : HOLD_STATE, gaps);
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

function rejectValidation(frame: any): AnyRecord | null {
  if (frame?.frame_state !== REJECT_STATE) return null;
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid: false,
    gaps: ["boundary leakage rejected"]
  };
}

function collectShapeGaps(frame: any): string[] {
  const rejected = rejectValidation(frame);
  if (rejected) return rejected.gaps;

  const record = asRecord(frame);
  const gaps: string[] = [];
  gaps.push(...collectAllowedFieldsGaps(record, TOP_LEVEL_FIELDS, "frame"));
  if (record.schema_version !== CONTRIBUTION_ALIGNMENT_WEIGHTED_INTERNAL_MODEL_FRAME_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  if (![READY_STATE, HOLD_STATE].includes(record.frame_state)) {
    gaps.push("frame_state is invalid");
  }
  const ready = record.frame_state === READY_STATE;
  if (record.source_bound !== ready) gaps.push(`source_bound must be ${ready}`);
  if (record.frame_version !== (ready ? FRAME_VERSION : null)) {
    gaps.push(`frame_version must be ${ready ? FRAME_VERSION : "null"}`);
  }
  if (ready && record.allowed_next_step !== READY_NEXT_STEP) {
    gaps.push(`allowed_next_step must be ${READY_NEXT_STEP}`);
  }
  if (!ready && record.allowed_next_step !== HELD_NEXT_STEP) {
    gaps.push(`allowed_next_step must be ${HELD_NEXT_STEP}`);
  }

  gaps.push(...collectRefGaps(record.source_weight_object_ref, SOURCE_WEIGHT_OBJECT_REF_FIELDS, "source_weight_object_ref"));
  gaps.push(...collectRefGaps(record.source_weight_decision_ref, SOURCE_WEIGHT_DECISION_REF_FIELDS, "source_weight_decision_ref"));
  gaps.push(...collectRefGaps(record.source_feature_stability_review_ref, SOURCE_FEATURE_STABILITY_REVIEW_REF_FIELDS, "source_feature_stability_review_ref"));

  const policy = asRecord(record.frame_policy);
  gaps.push(...collectRefGaps(policy, FRAME_POLICY_FIELDS, "frame_policy"));
  for (const [field, expected] of Object.entries({
    internal_only: true,
    weighted_feature_composition_present: ready,
    feature_weights_source_bound: ready,
    aggregate_score_output_authorized: false,
    weighted_internal_model_output_authorized: false,
    confidence_output_authorized: false,
    probability_output_authorized: false,
    bayesian_execution_authorized: false,
    customer_output_authorized: false
  })) {
    if (policy[field] !== expected) gaps.push(`frame_policy.${field} must be ${expected}`);
  }

  const composition = asArray(record.feature_weight_composition);
  if (ready && stableStringify(composition.map((feature) => feature.feature_id)) !== stableStringify(FEATURE_IDS)) {
    gaps.push("feature_weight_composition must match governed feature registry");
  }
  if (!ready && composition.length !== 0) gaps.push("feature_weight_composition must be empty while held");
  const sum = Number(composition.reduce((total, feature) => total + Number(feature.weight ?? 0), 0).toFixed(6));
  if (ready && sum !== 1) gaps.push("feature_weight_composition weights must sum to one");
  for (const feature of composition) {
    gaps.push(...collectRefGaps(feature, COMPOSITION_FIELDS, "feature_weight_composition[]"));
    if (feature.weight !== 0.1) gaps.push("feature_weight_composition must keep neutral equal weights");
    if (feature.source_bound !== true) gaps.push("feature_weight_composition must remain source-bound");
    if (feature.frame_role !== "internal_weighted_feature_component") {
      gaps.push("feature_weight_composition.frame_role is invalid");
    }
    if (feature.value_output_present !== false) {
      gaps.push("feature_weight_composition must not contain value output");
    }
  }

  const feeds = asRecord(record.feeds);
  if (feeds.internal_bayesian_readiness_review !== ready) {
    gaps.push(`feeds.internal_bayesian_readiness_review must be ${ready}`);
  }
  for (const feed of FALSE_FEEDS) {
    if (feeds[feed] !== false) gaps.push(`feeds.${feed} must be false`);
  }
  for (const key of Object.keys(feeds)) {
    if (key !== "internal_bayesian_readiness_review" && !FALSE_FEEDS.includes(key)) {
      gaps.push("feeds contains ungoverned field");
    }
  }

  const boundary = asRecord(record.boundary_policy);
  for (const field of BOUNDARY_POLICY_FIELDS) {
    const expected = [
      "receives_versioned_weight_object_only",
      "receives_weight_decision_ref",
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
  if (summary.frame_state !== record.frame_state) {
    gaps.push("validation_summary.frame_state must match frame_state");
  }
  if (ready && asArray(summary.gaps).length !== 0) {
    gaps.push("validation_summary.gaps must be empty for ready frame");
  }
  if (record.frame_hash !== contributionAlignmentWeightedInternalModelFrameHash(record)) {
    gaps.push("frame_hash must match frame body");
  }
  gaps.push(...hasForbiddenContent(record));
  return sanitizeGaps(gaps);
}

function collectSourceBindingGaps(frame: unknown, options: AnyRecord = {}): string[] {
  const gaps: string[] = [];
  if (options.sourceWeightObject) {
    const objectGaps = sourceWeightObjectGaps(options.sourceWeightObject);
    if (objectGaps.length > 0) gaps.push(...objectGaps);
  }
  if (options.sourceWeightDecision) {
    const decisionGaps = sourceWeightDecisionGaps(
      options.sourceWeightDecision,
      options.sourceWeightObject
    );
    if (decisionGaps.length > 0) gaps.push(...decisionGaps);
  }
  if (options.sourceFeatureStabilityReview) {
    const reviewGaps = sourceFeatureReviewGaps(
      options.sourceFeatureStabilityReview,
      options.sourceWeightObject
    );
    if (reviewGaps.length > 0) gaps.push(...reviewGaps);
  }
  if (options.expectedFrame) {
    const actualWithoutHash = clone(frame);
    const expectedWithoutHash = clone(options.expectedFrame);
    delete actualWithoutHash.frame_hash;
    delete expectedWithoutHash.frame_hash;
    if (stableStringify(actualWithoutHash) !== stableStringify(expectedWithoutHash)) {
      gaps.push("composition binding mismatch against sourceWeightObject");
    }
  }
  return sanitizeGaps(gaps);
}

export function validateContributionAlignmentWeightedInternalModelFrame(frame: any, options: AnyRecord = {}): AnyRecord {
  if (frame?.frame_state === REJECT_STATE) {
    return rejectValidation(frame) as AnyRecord;
  }
  const gaps = sanitizeGaps([
    ...collectShapeGaps(frame),
    ...collectSourceBindingGaps(frame, options)
  ]);
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid: gaps.length === 0 && frame?.frame_state === READY_STATE,
    gaps
  };
}
