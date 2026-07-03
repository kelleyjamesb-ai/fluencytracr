// Ported verbatim from
// scripts/run_ai_value_contribution_alignment_feature_stability_review.mjs
// under OpenSpec change add-confidence-engine-workspace (task 3.1, module 1).
// Byte-compatibility contract: identical output objects (including property
// insertion order and review_hash) for identical inputs. The golden parity
// suite enforces this against the predecessor script.

import { sha256Json } from "./internal/hashing";

type AnyRecord = Record<string, any>;

// Inlined from the research-lineage module (out of porting scope); equality
// with the .mjs original is pinned by the parity test suite.
export const CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_MATH_DATA_MODEL_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_MATH_DATA_MODEL_2026_06";

function internalResearchMathDataModelHash(dataModel: AnyRecord): string {
  const withoutHash = { ...dataModel };
  delete withoutHash.data_model_hash;
  return sha256Json(withoutHash);
}

export const CONTRIBUTION_ALIGNMENT_FEATURE_STABILITY_REVIEW_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_FEATURE_STABILITY_REVIEW_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_FEATURE_STABILITY_REVIEW_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_contribution_alignment_feature_stability_review_2026_06";

const READY_STATE = "FEATURE_STABILITY_REVIEW_PASSED_FOR_INTERNAL_WEIGHT_DECISION";
const HOLD_STATE = "HOLD_FOR_STABLE_INTERNAL_RESEARCH_MATH_DATA_MODEL";
const REJECT_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const ALLOWED_NEXT_STEP = "internal_numeric_weight_decision_only";
const HELD_NEXT_STEP = "stabilize_internal_research_math_data_model";

const REQUIRED_FEATURES: Array<[string, string]> = [
  ["hypothesis_binding", "approved_path_identity_context"],
  ["source_coverage", "reviewed_aggregate_source_context"],
  ["milestone_continuity", "day_0_30_60_90_180_365_ref_context"],
  ["ai_fluency_construct_context_integrity", "aggregate_construct_context"],
  ["psychological_context_integrity", "aggregate_attitude_behavior_intent_context"],
  ["observed_vbd_alignment", "observed_work_behavior_context"],
  ["selected_metric_movement", "customer_metric_movement_context"],
  ["comparison_design_strength", "future_design_strength_context"],
  ["assumption_governance", "assumption_review_context"],
  ["boundary_clearance", "fail_closed_boundary_context"]
];

const FALSE_FEEDS = [
  "numeric_weight_object",
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

const FEATURE_STABILITY_FIELDS = [
  "source_data_model_valid",
  "all_required_features_present",
  "context_partitions_distinct",
  "repeated_milestone_requirement_present",
  "forbidden_outputs_false",
  "weight_decision_ready",
  "numeric_weights_authorized",
  "weight_values_present",
  "bayesian_execution_authorized"
];

const SOURCE_REF_FIELDS = [
  "schema_version",
  "data_model_id",
  "data_model_state",
  "data_model_hash"
];

const FEATURE_FIELDS = [
  "feature_id",
  "evidence_role",
  "source_model_role",
  "source_output_state",
  "source_numeric_role",
  "stability_state",
  "weight_candidate_role",
  "numeric_value_present",
  "source_bound"
];

const BOUNDARY_POLICY_FIELDS = [
  "receives_compact_internal_data_model_only",
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
  "implements_numeric_weights",
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
  "review_id",
  "review_state",
  "generated_at",
  "derivation_version",
  "source_bound",
  "source_data_model_ref",
  "feature_stability",
  "feature_registry",
  "allowed_next_step",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "boundary_policy",
  "validation_summary",
  "review_hash"
]);

const ALLOWED_INPUT_FIELDS = new Set([
  "source_data_model",
  "generated_at"
]);

const REQUIRED_BLOCKED_USES = [
  "numeric_weights",
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
  "Feature Stability Review is an internal review gate only; it does not authorize numeric weights.",
  "Passing review authorizes only a later internal numeric weight decision.",
  "Feature candidates are compact context inputs, not numeric values, scores, probabilities, ROI, or customer-facing output.",
  "The review must remain source-bound to the internal research math data model id and hash."
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
  /numeric_?weights/i,
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
  /numeric[_-\s]?weights/i,
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
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as AnyRecord;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
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

function sourceDataModelFromInput(input: unknown): any {
  const record = asRecord(input);
  return record.source_data_model ?? input;
}

function inputBoundaryGaps(input: unknown): string[] {
  const record = asRecord(input);
  if (!Object.prototype.hasOwnProperty.call(record, "source_data_model")) return [];
  const sidecar = Object.fromEntries(
    Object.entries(record).filter(([key]) => !ALLOWED_INPUT_FIELDS.has(key))
  );
  if (Object.keys(sidecar).length === 0) return [];
  return ["input wrapper rejected unsafe or unsupported content"];
}

function safeId(value: unknown, prefix: string): string | null {
  return typeof value === "string" && new RegExp(`^${prefix}_[0-9a-f]{16}$`).test(value)
    ? value
    : null;
}

function safeHash(value: unknown): string | null {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value) ? value : null;
}

function sourceRef(sourceDataModel: any): AnyRecord {
  return {
    schema_version:
      sourceDataModel?.schema_version ===
      CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_MATH_DATA_MODEL_SCHEMA_VERSION
        ? sourceDataModel.schema_version
        : null,
    data_model_id: safeId(
      sourceDataModel?.data_model_id,
      "contribution_alignment_internal_research_math_data_model"
    ),
    data_model_state:
      sourceDataModel?.data_model_state ===
      "READY_FOR_INTERNAL_RESEARCH_MATH_FINALIZATION_DESIGN"
        ? sourceDataModel.data_model_state
        : null,
    data_model_hash: safeHash(sourceDataModel?.data_model_hash)
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
          path === "review.feature_stability" ||
          path.startsWith("review.feature_registry[")
        );
      const allowedBlockedUse =
        path === "review.blocked_uses" && REQUIRED_BLOCKED_USES.includes(nested as string);
      const allowedCaveat =
        path === "review.required_caveats" && REQUIRED_CAVEATS.includes(nested as string);
      if (
        !safeFalseFlag &&
        !allowedBlockedUse &&
        !allowedCaveat &&
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

function sourceDataModelGaps(sourceDataModel: any): string[] {
  const source = asRecord(sourceDataModel);
  const gaps: string[] = [];
  if (source.schema_version !== CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_MATH_DATA_MODEL_SCHEMA_VERSION) {
    gaps.push("source_data_model.schema_version is invalid");
  }
  if (source.data_model_state !== "READY_FOR_INTERNAL_RESEARCH_MATH_FINALIZATION_DESIGN") {
    gaps.push("source_data_model.data_model_state is not ready");
  }
  if (source.data_model_hash !== internalResearchMathDataModelHash(source)) {
    gaps.push("source_data_model.hash drifted");
  }
  if (source.validation_summary?.valid !== true) {
    gaps.push("source_data_model.validation_summary is not valid");
  }
  const componentRegistry = asArray(source.component_registry);
  if (stableStringify(componentRegistry.map((component) => component.component_id)) !== stableStringify(REQUIRED_FEATURES.map(([id]) => id))) {
    gaps.push("source_data_model.required_feature_registry is unstable");
  }
  for (const [featureId, evidenceRole] of REQUIRED_FEATURES) {
    const component = componentRegistry.find((candidate) => candidate.component_id === featureId);
    if (!component) continue;
    if (component.evidence_role !== evidenceRole) {
      gaps.push("source_data_model.feature_evidence_role drifted");
    }
    if (component.model_role !== "context_only") {
      gaps.push("source_data_model.feature_model_role drifted");
    }
    if (component.output_state !== "not_emitted") {
      gaps.push("source_data_model.feature_output_state drifted");
    }
    if (component.numeric_role !== "none") {
      gaps.push("source_data_model.feature_numeric_role drifted");
    }
  }
  if (
    source.model_grain?.milestone_evidence !== "day_0_30_60_90_180_365_compact_refs" ||
    source.model_grain?.repeated_window_requirement !==
      "required_before_later_separately_approved_customer_facing_promotion_review"
  ) {
    gaps.push("source_data_model.milestone_requirement is unstable");
  }
  if (
    source.context_partitions?.ai_fluency_construct_context?.substitutes_for_observed_vbd !== false ||
    source.context_partitions?.ai_fluency_psychological_context?.substitutes_for_observed_vbd !== false ||
    source.context_partitions?.observed_vbd_context?.substitutes_for_metric_movement !== false ||
    source.context_partitions?.selected_metric_movement_context?.substitutes_for_observed_vbd !== false
  ) {
    gaps.push("source_data_model.context_partitions are not distinct");
  }
  for (const field of [
    "research_model_feed",
    "research_math_output",
    "model_output",
    "numeric_weight_output",
    "confidence_output",
    "probability_output",
    "score_like_output",
    "finance_output",
    "customer_facing_output",
    "live_connector_execution",
    "route_creation",
    "ui_creation",
    "schema_creation",
    "persistence_write",
    "export_creation"
  ]) {
    if (source.feeds?.[field] !== false) {
      gaps.push("source_data_model.forbidden_output_feed is not false");
    }
  }
  return sanitizeGaps(gaps);
}

function buildFeatureRegistry(sourceDataModel: any, ready: boolean): AnyRecord[] {
  if (!ready) return [];
  return REQUIRED_FEATURES.map(([featureId]) => {
    const component = asArray(sourceDataModel.component_registry).find(
      (candidate) => candidate.component_id === featureId
    );
    return {
      feature_id: featureId,
      evidence_role: component.evidence_role,
      source_model_role: component.model_role,
      source_output_state: component.output_state,
      source_numeric_role: component.numeric_role,
      stability_state: "STABLE_FOR_INTERNAL_WEIGHT_DECISION",
      weight_candidate_role: "candidate_internal_weight_input",
      numeric_value_present: false,
      source_bound: true
    };
  });
}

function baseReview(sourceDataModel: any, state: string, gaps: string[]): AnyRecord {
  const ready = state === READY_STATE;
  const review: AnyRecord = {
    schema_version: CONTRIBUTION_ALIGNMENT_FEATURE_STABILITY_REVIEW_SCHEMA_VERSION,
    review_id: `contribution_alignment_feature_stability_review_${sha256Json({
      source_data_model_id: sourceDataModel?.data_model_id ?? null,
      source_data_model_hash: sourceDataModel?.data_model_hash ?? null
    }).slice(0, 16)}`,
    review_state: state,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: ready,
    source_data_model_ref: ready ? sourceRef(sourceDataModel) : sourceRef(sourceDataModel),
    feature_stability: {
      source_data_model_valid: ready,
      all_required_features_present: ready,
      context_partitions_distinct: ready,
      repeated_milestone_requirement_present: ready,
      forbidden_outputs_false: ready,
      weight_decision_ready: ready,
      numeric_weights_authorized: false,
      weight_values_present: false,
      bayesian_execution_authorized: false
    },
    feature_registry: buildFeatureRegistry(sourceDataModel, ready),
    allowed_next_step: ready ? ALLOWED_NEXT_STEP : HELD_NEXT_STEP,
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      internal_numeric_weight_decision: ready,
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: {
      receives_compact_internal_data_model_only: true,
      ...falseMap(BOUNDARY_POLICY_FIELDS.filter((field) => field !== "receives_compact_internal_data_model_only"))
    },
    validation_summary: {
      schema_version: `${CONTRIBUTION_ALIGNMENT_FEATURE_STABILITY_REVIEW_SCHEMA_VERSION}_SUMMARY`,
      valid: ready,
      review_state: state,
      gaps: ready ? [] : sanitizeGaps(gaps)
    }
  };
  review.review_hash = contributionAlignmentFeatureStabilityReviewHash(review);
  return review;
}

function rejectedReview(gaps: string[]): AnyRecord {
  const review: AnyRecord = {
    schema_version: CONTRIBUTION_ALIGNMENT_FEATURE_STABILITY_REVIEW_SCHEMA_VERSION,
    review_id: `contribution_alignment_feature_stability_review_${sha256Json({
      rejected: true
    }).slice(0, 16)}`,
    review_state: REJECT_STATE,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: false,
    source_data_model_ref: {
      schema_version: null,
      data_model_id: null,
      data_model_state: null,
      data_model_hash: null
    },
    feature_stability: {
      source_data_model_valid: false,
      all_required_features_present: false,
      context_partitions_distinct: false,
      repeated_milestone_requirement_present: false,
      forbidden_outputs_false: false,
      weight_decision_ready: false,
      numeric_weights_authorized: false,
      weight_values_present: false,
      bayesian_execution_authorized: false
    },
    feature_registry: [],
    allowed_next_step: HELD_NEXT_STEP,
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      internal_numeric_weight_decision: false,
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: {
      receives_compact_internal_data_model_only: false,
      ...falseMap(BOUNDARY_POLICY_FIELDS.filter((field) => field !== "receives_compact_internal_data_model_only"))
    },
    validation_summary: {
      schema_version: `${CONTRIBUTION_ALIGNMENT_FEATURE_STABILITY_REVIEW_SCHEMA_VERSION}_SUMMARY`,
      valid: false,
      review_state: REJECT_STATE,
      gaps: sanitizeGaps(gaps)
    }
  };
  review.review_hash = contributionAlignmentFeatureStabilityReviewHash(review);
  return review;
}

export function contributionAlignmentFeatureStabilityReviewHash(review: unknown): string {
  const withoutHash = clone(review);
  delete withoutHash.review_hash;
  return sha256Json(withoutHash);
}

export function buildContributionAlignmentFeatureStabilityReviewFromObject(input: unknown): AnyRecord {
  const wrapperGaps = inputBoundaryGaps(input);
  if (wrapperGaps.length > 0) {
    return rejectedReview(wrapperGaps);
  }
  const sourceDataModel = sourceDataModelFromInput(input);
  const gaps = sourceDataModelGaps(sourceDataModel);
  return baseReview(
    sourceDataModel,
    gaps.length === 0 ? READY_STATE : HOLD_STATE,
    gaps
  );
}

function collectAllowedFieldsGaps(record: unknown, allowedFields: Set<string>, label: string): string[] {
  return Object.keys(asRecord(record))
    .filter((key) => !allowedFields.has(key))
    .map(() => `${label} contains ungoverned field`);
}

function collectRefGaps(record: unknown, fields: string[], label: string): string[] {
  const gaps: string[] = [];
  const ref = asRecord(record);
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(ref, field)) {
      gaps.push(`${label}.${field} is required`);
    }
  }
  gaps.push(...collectAllowedFieldsGaps(ref, new Set(fields), label));
  return gaps;
}

function collectShapeGaps(review: unknown): string[] {
  const record = asRecord(review);
  const gaps: string[] = [];
  gaps.push(...collectAllowedFieldsGaps(record, TOP_LEVEL_FIELDS, "review"));
  if (record.schema_version !== CONTRIBUTION_ALIGNMENT_FEATURE_STABILITY_REVIEW_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  if (![READY_STATE, HOLD_STATE, REJECT_STATE].includes(record.review_state)) {
    gaps.push("review_state is invalid");
  }
  const ready = record.review_state === READY_STATE;
  if (record.source_bound !== ready) {
    gaps.push(`source_bound must be ${ready}`);
  }
  if (ready && record.allowed_next_step !== ALLOWED_NEXT_STEP) {
    gaps.push(`allowed_next_step must be ${ALLOWED_NEXT_STEP}`);
  }
  if (!ready && record.allowed_next_step !== HELD_NEXT_STEP) {
    gaps.push(`allowed_next_step must be ${HELD_NEXT_STEP}`);
  }
  gaps.push(...collectRefGaps(record.source_data_model_ref, SOURCE_REF_FIELDS, "source_data_model_ref"));
  const stability = asRecord(record.feature_stability);
  gaps.push(...collectRefGaps(stability, FEATURE_STABILITY_FIELDS, "feature_stability"));
  for (const field of [
    "source_data_model_valid",
    "all_required_features_present",
    "context_partitions_distinct",
    "repeated_milestone_requirement_present",
    "forbidden_outputs_false",
    "weight_decision_ready"
  ]) {
    if (stability[field] !== ready) {
      gaps.push(`feature_stability.${field} must be ${ready}`);
    }
  }
  for (const field of [
    "numeric_weights_authorized",
    "weight_values_present",
    "bayesian_execution_authorized"
  ]) {
    if (stability[field] !== false) {
      gaps.push(`feature_stability.${field} must be false`);
    }
  }
  const registry = asArray(record.feature_registry);
  if (ready) {
    if (stableStringify(registry.map((feature) => feature.feature_id)) !== stableStringify(REQUIRED_FEATURES.map(([id]) => id))) {
      gaps.push("feature_registry must match required feature set");
    }
  } else if (registry.length !== 0) {
    gaps.push("feature_registry must be empty unless review is ready");
  }
  for (const feature of registry) {
    gaps.push(...collectRefGaps(feature, FEATURE_FIELDS, "feature_registry.item"));
    if (feature.stability_state !== "STABLE_FOR_INTERNAL_WEIGHT_DECISION") {
      gaps.push("feature_registry.item.stability_state is invalid");
    }
    if (feature.weight_candidate_role !== "candidate_internal_weight_input") {
      gaps.push("feature_registry.item.weight_candidate_role is invalid");
    }
    if (feature.numeric_value_present !== false) {
      gaps.push("feature_registry.item.numeric_value_present must be false");
    }
    if (feature.source_bound !== true) {
      gaps.push("feature_registry.item.source_bound must be true");
    }
  }
  const feeds = asRecord(record.feeds);
  if (feeds.internal_numeric_weight_decision !== ready) {
    gaps.push(`feeds.internal_numeric_weight_decision must be ${ready}`);
  }
  for (const feed of FALSE_FEEDS) {
    if (feeds[feed] !== false) gaps.push(`feeds.${feed} must be false`);
  }
  for (const key of Object.keys(feeds)) {
    if (key !== "internal_numeric_weight_decision" && !FALSE_FEEDS.includes(key)) {
      gaps.push("feeds contains ungoverned field");
    }
  }
  const boundary = asRecord(record.boundary_policy);
  for (const field of BOUNDARY_POLICY_FIELDS) {
    const expected = field === "receives_compact_internal_data_model_only" && record.review_state !== REJECT_STATE;
    if (boundary[field] !== expected) {
      gaps.push(`boundary_policy.${field} must be ${expected}`);
    }
  }
  for (const key of Object.keys(boundary)) {
    if (!BOUNDARY_POLICY_FIELDS.includes(key)) {
      gaps.push("boundary_policy contains ungoverned field");
    }
  }
  if (stableStringify(record.blocked_uses) !== stableStringify(REQUIRED_BLOCKED_USES)) {
    gaps.push("blocked_uses must match governed list");
  }
  if (stableStringify(record.required_caveats) !== stableStringify(REQUIRED_CAVEATS)) {
    gaps.push("required_caveats must match governed list");
  }
  const summary = asRecord(record.validation_summary);
  if (summary.valid !== ready) {
    gaps.push(`validation_summary.valid must be ${ready}`);
  }
  if (summary.review_state !== record.review_state) {
    gaps.push("validation_summary.review_state must match review_state");
  }
  if (ready && asArray(summary.gaps).length !== 0) {
    gaps.push("validation_summary.gaps must be empty for ready review");
  }
  if (record.review_hash !== contributionAlignmentFeatureStabilityReviewHash(record)) {
    gaps.push("review_hash must match review body");
  }
  gaps.push(...hasForbiddenContent(record));
  return sanitizeGaps(gaps);
}

function collectSourceBindingGaps(review: unknown, options: AnyRecord = {}): string[] {
  if (!options.sourceDataModel) return [];
  const expected = options.expectedReview ?? buildContributionAlignmentFeatureStabilityReviewFromObject(options.sourceDataModel);
  const actualWithoutHash = clone(review);
  const expectedWithoutHash = clone(expected);
  delete actualWithoutHash.review_hash;
  delete expectedWithoutHash.review_hash;
  if (stableStringify(actualWithoutHash) !== stableStringify(expectedWithoutHash)) {
    return ["sourceDataModel binding mismatch"];
  }
  return [];
}

export function validateContributionAlignmentFeatureStabilityReview(review: unknown, options: AnyRecord = {}): AnyRecord {
  const gaps = sanitizeGaps([
    ...collectShapeGaps(review),
    ...collectSourceBindingGaps(review, options)
  ]);
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid: gaps.length === 0 && (review as AnyRecord)?.review_state === READY_STATE,
    gaps
  };
}
