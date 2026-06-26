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
  CONTRIBUTION_ALIGNMENT_BAYESIAN_MODEL_SPECIFICATION_SCHEMA_VERSION,
  contributionAlignmentBayesianModelSpecificationHash,
  validateContributionAlignmentBayesianModelSpecification
} from "./run_ai_value_contribution_alignment_bayesian_model_specification.mjs";
import {
  CONTRIBUTION_ALIGNMENT_WEIGHTED_INTERNAL_MODEL_FRAME_SCHEMA_VERSION,
  contributionAlignmentWeightedInternalModelFrameHash
} from "./run_ai_value_contribution_alignment_weighted_internal_model_frame.mjs";

export const CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_GATE_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_GATE_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_GATE_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_contribution_alignment_internal_bayesian_execution_gate_2026_06";

const READY_STATE = "INTERNAL_BAYESIAN_EXECUTION_GATE_READY";
const HOLD_STATE = "HOLD_FOR_BAYESIAN_MODEL_SPECIFICATION";
const REJECT_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const GATE_VERSION = "internal_bayesian_execution_gate_2026_06";
const SPECIFICATION_VERSION = "bayesian_hierarchical_did_spec_2026_06";
const CANDIDATE_MODEL_FAMILY = "bayesian_hierarchical_difference_in_differences_candidate";
const READY_NEXT_STEP = "internal_bayesian_execution_runtime_only";
const HELD_NEXT_STEP = "complete_bayesian_model_specification";

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
  "gate_id",
  "gate_state",
  "generated_at",
  "derivation_version",
  "source_bound",
  "source_specification_ref",
  "source_readiness_review_ref",
  "source_frame_ref",
  "gate_version",
  "candidate_model_family",
  "gate_policy",
  "runtime_prerequisites",
  "execution_contract",
  "gated_feature_weights",
  "allowed_next_step",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "boundary_policy",
  "validation_summary",
  "gate_hash"
]);

const SOURCE_SPECIFICATION_REF_FIELDS = [
  "schema_version",
  "specification_id",
  "specification_state",
  "specification_version",
  "specification_hash"
];

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

const GATE_POLICY_FIELDS = [
  "internal_only",
  "execution_gate_only",
  "runtime_implementation_authorized",
  "bayesian_execution_authorized",
  "bayesian_model_output_authorized",
  "posterior_output_authorized",
  "confidence_output_authorized",
  "probability_output_authorized",
  "finance_output_authorized",
  "customer_output_authorized"
];

const RUNTIME_PREREQUISITE_FIELDS = [
  "aggregate_measurement_cell_windows_only",
  "source_specification_hash_bound",
  "governed_feature_weights_only",
  "deterministic_fixture_or_snapshot_only",
  "no_raw_rows_or_records",
  "no_identifiers",
  "no_query_text",
  "no_live_connectors",
  "posterior_output_review_required",
  "confidence_probability_language_blocked",
  "customer_output_blocked"
];

const EXECUTION_CONTRACT_FIELDS = [
  "unit_of_analysis",
  "estimand",
  "prior_specification_state",
  "likelihood_specification_state",
  "execution_scope",
  "execution_state"
];

const GATED_FEATURE_WEIGHT_FIELDS = [
  "feature_id",
  "weight",
  "source_bound",
  "gate_role",
  "output_value_present"
];

const BOUNDARY_POLICY_FIELDS = [
  "receives_bayesian_model_specification_only",
  "receives_bayesian_readiness_review_ref",
  "receives_weighted_frame_ref",
  "receives_full_source_payload",
  "receives_raw_rows",
  "receives_query_text",
  "receives_identifiers",
  "persists_gate",
  "creates_routes",
  "creates_ui",
  "creates_schemas",
  "creates_exports",
  "runs_live_connectors",
  "implements_bayesian_runtime",
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
  "source_specification",
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
  "Internal Bayesian Execution Gate authorizes only a later internal Bayesian execution runtime implementation.",
  "This gate does not run Bayesian execution or emit posterior, confidence, probability, score, ROI, finance, causality, productivity, or customer-facing output.",
  "Runtime inputs must remain aggregate measurement-cell-window fixtures or reviewed internal snapshots with no raw rows, query text, identifiers, live connectors, schemas, UI, exports, or persistence writes.",
  "Any posterior or output language must pass a later posterior/output review gate before confidence or probability language can appear."
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

function sourceSpecificationFromInput(input) {
  const record = asRecord(input);
  return record.source_specification ?? input;
}

function sourceReadinessReviewFromInput(input, options = {}) {
  const record = asRecord(input);
  return options.sourceReadinessReview ?? record.source_readiness_review ?? null;
}

function sourceFrameFromInput(input, options = {}) {
  const record = asRecord(input);
  return options.sourceFrame ?? record.source_frame ?? null;
}

function inputBoundaryGaps(input) {
  const record = asRecord(input);
  if (!Object.prototype.hasOwnProperty.call(record, "source_specification")) return [];
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

function sourceSpecificationRef(sourceSpecification) {
  return {
    schema_version:
      sourceSpecification?.schema_version ===
      CONTRIBUTION_ALIGNMENT_BAYESIAN_MODEL_SPECIFICATION_SCHEMA_VERSION
        ? sourceSpecification.schema_version
        : null,
    specification_id: safeId(
      sourceSpecification?.specification_id,
      "contribution_alignment_bayesian_model_specification"
    ),
    specification_state:
      sourceSpecification?.specification_state === "BAYESIAN_MODEL_SPECIFICATION_READY"
        ? sourceSpecification.specification_state
        : null,
    specification_version:
      sourceSpecification?.specification_version === SPECIFICATION_VERSION
        ? sourceSpecification.specification_version
        : null,
    specification_hash: safeHash(sourceSpecification?.specification_hash)
  };
}

function sourceReadinessReviewRef(sourceSpecification, sourceReadinessReview) {
  const specificationRef = asRecord(sourceSpecification?.source_readiness_review_ref);
  return {
    schema_version:
      (sourceReadinessReview?.schema_version ?? specificationRef.schema_version) ===
      CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_READINESS_REVIEW_SCHEMA_VERSION
        ? (sourceReadinessReview?.schema_version ?? specificationRef.schema_version)
        : null,
    review_id: safeId(
      sourceReadinessReview?.review_id ?? specificationRef.review_id,
      "contribution_alignment_internal_bayesian_readiness_review"
    ),
    review_state:
      (sourceReadinessReview?.review_state ?? specificationRef.review_state) ===
      "INTERNAL_BAYESIAN_READINESS_REVIEW_PASSED_FOR_MODEL_SPECIFICATION"
        ? (sourceReadinessReview?.review_state ?? specificationRef.review_state)
        : null,
    review_version:
      (sourceReadinessReview?.review_version ?? specificationRef.review_version) ===
      "internal_bayesian_readiness_review_2026_06"
        ? (sourceReadinessReview?.review_version ?? specificationRef.review_version)
        : null,
    review_hash: safeHash(sourceReadinessReview?.review_hash ?? specificationRef.review_hash)
  };
}

function sourceFrameRef(sourceSpecification, sourceFrame) {
  const specificationRef = asRecord(sourceSpecification?.source_frame_ref);
  return {
    schema_version:
      (sourceFrame?.schema_version ?? specificationRef.schema_version) ===
      CONTRIBUTION_ALIGNMENT_WEIGHTED_INTERNAL_MODEL_FRAME_SCHEMA_VERSION
        ? (sourceFrame?.schema_version ?? specificationRef.schema_version)
        : null,
    frame_id: safeId(
      sourceFrame?.frame_id ?? specificationRef.frame_id,
      "contribution_alignment_weighted_internal_model_frame"
    ),
    frame_state:
      (sourceFrame?.frame_state ?? specificationRef.frame_state) ===
      "WEIGHTED_INTERNAL_MODEL_FRAME_READY"
        ? (sourceFrame?.frame_state ?? specificationRef.frame_state)
        : null,
    frame_version:
      (sourceFrame?.frame_version ?? specificationRef.frame_version) ===
      "internal_weighted_feature_composition_frame_2026_06"
        ? (sourceFrame?.frame_version ?? specificationRef.frame_version)
        : null,
    frame_hash: safeHash(sourceFrame?.frame_hash ?? specificationRef.frame_hash)
  };
}

function hasForbiddenContent(value, path = "gate") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => hasForbiddenContent(item, `${path}[${index}]`));
  }
  if (value && typeof value === "object") {
    const gaps = [];
    for (const [key, nested] of Object.entries(value)) {
      const safeFalseFlag =
        nested === false &&
        (
          path === "gate.feeds" ||
          path === "gate.boundary_policy" ||
          path === "gate.gate_policy" ||
          path.startsWith("gate.gated_feature_weights[")
        );
      const safePrerequisiteGuardrail =
        path === "gate.runtime_prerequisites" &&
        RUNTIME_PREREQUISITE_FIELDS.includes(key) &&
        typeof nested === "boolean";
      if (
        !safeFalseFlag &&
        !safePrerequisiteGuardrail &&
        FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))
      ) {
        gaps.push("gate contains forbidden field name");
        continue;
      }
      gaps.push(...hasForbiddenContent(nested, `${path}.${key}`));
    }
    return gaps;
  }
  if (typeof value !== "string") return [];
  if (
    path.startsWith("gate.blocked_uses[") ||
    path.startsWith("gate.required_caveats[")
  ) {
    return [];
  }
  return FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
    ? [`${path} contains unsafe source or output language`]
    : [];
}

function sourceSpecificationGaps(sourceSpecification) {
  const source = asRecord(sourceSpecification);
  const gaps = [];
  const sourceValidation = validateContributionAlignmentBayesianModelSpecification(source);
  if (sourceValidation.valid !== true) {
    gaps.push("source_specification does not pass hardened Bayesian model specification validation");
  }
  if (source.schema_version !== CONTRIBUTION_ALIGNMENT_BAYESIAN_MODEL_SPECIFICATION_SCHEMA_VERSION) {
    gaps.push("source_specification.schema_version is invalid");
  }
  if (source.specification_state !== "BAYESIAN_MODEL_SPECIFICATION_READY") {
    gaps.push("source_specification.specification_state is not ready");
  }
  if (source.specification_hash !== contributionAlignmentBayesianModelSpecificationHash(source)) {
    gaps.push("sourceSpecification hash drifted");
  }
  if (source.validation_summary?.valid !== true) {
    gaps.push("source_specification.validation_summary is not valid");
  }
  if (source.source_bound !== true) {
    gaps.push("source_specification is not source-bound");
  }
  if (source.specification_policy?.execution_gate_authorized !== true) {
    gaps.push("source_specification does not authorize execution gate");
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
    if (source.specification_policy?.[field] !== false) {
      gaps.push(`source_specification.${field} must be false`);
    }
  }
  if (source.feeds?.internal_bayesian_execution_gate !== true) {
    gaps.push("source_specification does not feed internal Bayesian execution gate");
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
      gaps.push(`source_specification.feeds.${feed} must be false`);
    }
  }
  for (const [field, expected] of Object.entries({
    unit_of_analysis: "aggregate_measurement_cell_window",
    estimand: "aggregate_selected_metric_movement_difference_in_differences_candidate",
    prior_specification_state: "weakly_regularizing_internal_placeholder_not_calibrated",
    likelihood_specification_state: "aggregate_window_likelihood_placeholder_not_executed",
    execution_state: "not_executed"
  })) {
    if (source.model_contract?.[field] !== expected) {
      gaps.push(`source_specification.model_contract.${field} is invalid`);
    }
  }
  const weights = asArray(source.specified_feature_weights);
  if (stableStringify(weights.map((feature) => feature.feature_id)) !== stableStringify(FEATURE_IDS)) {
    gaps.push("source_specification weights do not match governed feature registry");
  }
  return sanitizeGaps(gaps);
}

function sourceReadinessReviewGaps(sourceReadinessReview, sourceSpecification) {
  if (!sourceReadinessReview) return [];
  const source = asRecord(sourceReadinessReview);
  const specificationRef = asRecord(sourceSpecification?.source_readiness_review_ref);
  const gaps = [];
  if (source.schema_version !== CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_READINESS_REVIEW_SCHEMA_VERSION) {
    gaps.push("source_readiness_review.schema_version is invalid");
  }
  if (source.review_state !== "INTERNAL_BAYESIAN_READINESS_REVIEW_PASSED_FOR_MODEL_SPECIFICATION") {
    gaps.push("source_readiness_review.review_state is not ready");
  }
  if (source.review_hash !== contributionAlignmentInternalBayesianReadinessReviewHash(source)) {
    gaps.push("source_readiness_review hash drifted");
  }
  if (specificationRef.review_hash && source.review_hash && specificationRef.review_hash !== source.review_hash) {
    gaps.push("source_readiness_review does not match model specification ref");
  }
  return sanitizeGaps(gaps);
}

function sourceFrameGaps(sourceFrame, sourceSpecification) {
  if (!sourceFrame) return [];
  const source = asRecord(sourceFrame);
  const specificationRef = asRecord(sourceSpecification?.source_frame_ref);
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
  if (specificationRef.frame_hash && source.frame_hash && specificationRef.frame_hash !== source.frame_hash) {
    gaps.push("source_frame does not match model specification ref");
  }
  return sanitizeGaps(gaps);
}

function buildGatedFeatureWeights(sourceSpecification) {
  return asArray(sourceSpecification?.specified_feature_weights).map((feature) => ({
    feature_id: feature.feature_id,
    weight: feature.weight,
    source_bound: feature.source_bound === true,
    gate_role: "eligible_for_later_internal_runtime_fixture",
    output_value_present: false
  }));
}

function buildRuntimePrerequisites(ready) {
  return Object.fromEntries(RUNTIME_PREREQUISITE_FIELDS.map((field) => [field, ready]));
}

function buildGate(sourceSpecification, sourceReadinessReview, sourceFrame, state, gaps) {
  const ready = state === READY_STATE;
  const modelContract = asRecord(sourceSpecification?.model_contract);
  const gate = {
    schema_version: CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_GATE_SCHEMA_VERSION,
    gate_id: `contribution_alignment_internal_bayesian_execution_gate_${sha256Json({
      specification_id: sourceSpecification?.specification_id ?? null,
      specification_hash: sourceSpecification?.specification_hash ?? null,
      gate_version: GATE_VERSION
    }).slice(0, 16)}`,
    gate_state: state,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: ready,
    source_specification_ref: sourceSpecificationRef(sourceSpecification),
    source_readiness_review_ref: sourceReadinessReviewRef(sourceSpecification, sourceReadinessReview),
    source_frame_ref: sourceFrameRef(sourceSpecification, sourceFrame),
    gate_version: ready ? GATE_VERSION : null,
    candidate_model_family: ready ? CANDIDATE_MODEL_FAMILY : null,
    gate_policy: {
      internal_only: true,
      execution_gate_only: true,
      runtime_implementation_authorized: ready,
      bayesian_execution_authorized: false,
      bayesian_model_output_authorized: false,
      posterior_output_authorized: false,
      confidence_output_authorized: false,
      probability_output_authorized: false,
      finance_output_authorized: false,
      customer_output_authorized: false
    },
    runtime_prerequisites: buildRuntimePrerequisites(ready),
    execution_contract: {
      unit_of_analysis: ready ? modelContract.unit_of_analysis : null,
      estimand: ready ? modelContract.estimand : null,
      prior_specification_state: ready ? modelContract.prior_specification_state : null,
      likelihood_specification_state: ready ? modelContract.likelihood_specification_state : null,
      execution_scope: ready ? "internal_deterministic_runtime_implementation_candidate" : null,
      execution_state: "not_executed"
    },
    gated_feature_weights: ready ? buildGatedFeatureWeights(sourceSpecification) : [],
    allowed_next_step: ready ? READY_NEXT_STEP : HELD_NEXT_STEP,
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      internal_bayesian_execution_runtime: ready,
      ...falseMap(FALSE_FEEDS)
    },
    boundary_policy: {
      receives_bayesian_model_specification_only: state !== REJECT_STATE,
      receives_bayesian_readiness_review_ref: state !== REJECT_STATE,
      receives_weighted_frame_ref: state !== REJECT_STATE,
      ...falseMap(
        BOUNDARY_POLICY_FIELDS.filter((field) =>
          ![
            "receives_bayesian_model_specification_only",
            "receives_bayesian_readiness_review_ref",
            "receives_weighted_frame_ref"
          ].includes(field)
        )
      )
    },
    validation_summary: {
      schema_version: `${CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_GATE_SCHEMA_VERSION}_SUMMARY`,
      valid: ready,
      gate_state: state,
      gaps: ready ? [] : sanitizeGaps(gaps)
    }
  };
  gate.gate_hash = contributionAlignmentInternalBayesianExecutionGateHash(gate);
  return gate;
}

function rejectedGate() {
  const gate = {
    schema_version: CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_GATE_SCHEMA_VERSION,
    gate_id: null,
    gate_state: REJECT_STATE,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: false,
    gated_feature_weights: [],
    validation_summary: {
      schema_version: `${CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_GATE_SCHEMA_VERSION}_SUMMARY`,
      valid: false,
      gate_state: REJECT_STATE,
      gaps: ["boundary leakage rejected"]
    }
  };
  gate.gate_hash = contributionAlignmentInternalBayesianExecutionGateHash(gate);
  return gate;
}

export function contributionAlignmentInternalBayesianExecutionGateHash(gate) {
  const withoutHash = clone(gate);
  delete withoutHash.gate_hash;
  return sha256Json(withoutHash);
}

export function buildContributionAlignmentInternalBayesianExecutionGateFromObject(input, options = {}) {
  const wrapperGaps = inputBoundaryGaps(input);
  if (wrapperGaps.length > 0) return rejectedGate();
  const sourceSpecification = sourceSpecificationFromInput(input);
  const sourceReadinessReview = sourceReadinessReviewFromInput(input, options);
  const sourceFrame = sourceFrameFromInput(input, options);
  const gaps = sanitizeGaps([
    ...sourceSpecificationGaps(sourceSpecification),
    ...sourceReadinessReviewGaps(sourceReadinessReview, sourceSpecification),
    ...sourceFrameGaps(sourceFrame, sourceSpecification)
  ]);
  return buildGate(
    sourceSpecification,
    sourceReadinessReview,
    sourceFrame,
    gaps.length === 0 ? READY_STATE : HOLD_STATE,
    gaps
  );
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

function rejectValidation(gate) {
  if (gate?.gate_state !== REJECT_STATE) return null;
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid: false,
    gaps: ["boundary leakage rejected"]
  };
}

function collectShapeGaps(gate) {
  const rejected = rejectValidation(gate);
  if (rejected) return rejected.gaps;

  const record = asRecord(gate);
  const gaps = [];
  gaps.push(...collectAllowedFieldsGaps(record, TOP_LEVEL_FIELDS, "gate"));
  if (record.schema_version !== CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_GATE_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  if (![READY_STATE, HOLD_STATE].includes(record.gate_state)) {
    gaps.push("gate_state is invalid");
  }
  const ready = record.gate_state === READY_STATE;
  if (record.source_bound !== ready) gaps.push(`source_bound must be ${ready}`);
  if (record.gate_version !== (ready ? GATE_VERSION : null)) {
    gaps.push(`gate_version must be ${ready ? GATE_VERSION : "null"}`);
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

  gaps.push(...collectRefGaps(record.source_specification_ref, SOURCE_SPECIFICATION_REF_FIELDS, "source_specification_ref"));
  gaps.push(...collectRefGaps(record.source_readiness_review_ref, SOURCE_READINESS_REVIEW_REF_FIELDS, "source_readiness_review_ref"));
  gaps.push(...collectRefGaps(record.source_frame_ref, SOURCE_FRAME_REF_FIELDS, "source_frame_ref"));

  const policy = asRecord(record.gate_policy);
  gaps.push(...collectRefGaps(policy, GATE_POLICY_FIELDS, "gate_policy"));
  for (const [field, expected] of Object.entries({
    internal_only: true,
    execution_gate_only: true,
    runtime_implementation_authorized: ready,
    bayesian_execution_authorized: false,
    bayesian_model_output_authorized: false,
    posterior_output_authorized: false,
    confidence_output_authorized: false,
    probability_output_authorized: false,
    finance_output_authorized: false,
    customer_output_authorized: false
  })) {
    if (policy[field] !== expected) gaps.push(`gate_policy.${field} must be ${expected}`);
  }

  const prerequisites = asRecord(record.runtime_prerequisites);
  gaps.push(...collectRefGaps(prerequisites, RUNTIME_PREREQUISITE_FIELDS, "runtime_prerequisites"));
  for (const field of RUNTIME_PREREQUISITE_FIELDS) {
    if (prerequisites[field] !== ready) gaps.push(`runtime_prerequisites.${field} must be ${ready}`);
  }

  const contract = asRecord(record.execution_contract);
  gaps.push(...collectRefGaps(contract, EXECUTION_CONTRACT_FIELDS, "execution_contract"));
  for (const [field, expected] of Object.entries({
    unit_of_analysis: ready ? "aggregate_measurement_cell_window" : null,
    estimand: ready ? "aggregate_selected_metric_movement_difference_in_differences_candidate" : null,
    prior_specification_state: ready ? "weakly_regularizing_internal_placeholder_not_calibrated" : null,
    likelihood_specification_state: ready ? "aggregate_window_likelihood_placeholder_not_executed" : null,
    execution_scope: ready ? "internal_deterministic_runtime_implementation_candidate" : null,
    execution_state: "not_executed"
  })) {
    if (contract[field] !== expected) gaps.push(`execution_contract.${field} is invalid`);
  }

  const weights = asArray(record.gated_feature_weights);
  if (ready && stableStringify(weights.map((feature) => feature.feature_id)) !== stableStringify(FEATURE_IDS)) {
    gaps.push("gated_feature_weights must match governed feature registry");
  }
  if (!ready && weights.length !== 0) gaps.push("gated_feature_weights must be empty while held");
  const sum = Number(weights.reduce((total, feature) => total + Number(feature.weight ?? 0), 0).toFixed(6));
  if (ready && sum !== 1) gaps.push("gated_feature_weights must sum to one");
  for (const weight of weights) {
    gaps.push(...collectRefGaps(weight, GATED_FEATURE_WEIGHT_FIELDS, "gated_feature_weights[]"));
    if (weight.weight !== 0.1) gaps.push("gated_feature_weights must keep neutral equal weights");
    if (weight.source_bound !== true) gaps.push("gated_feature_weights must remain source-bound");
    if (weight.gate_role !== "eligible_for_later_internal_runtime_fixture") {
      gaps.push("gated_feature_weights.gate_role is invalid");
    }
    if (weight.output_value_present !== false) {
      gaps.push("gated_feature_weights must not contain output values");
    }
  }

  const feeds = asRecord(record.feeds);
  if (feeds.internal_bayesian_execution_runtime !== ready) {
    gaps.push(`feeds.internal_bayesian_execution_runtime must be ${ready}`);
  }
  for (const feed of FALSE_FEEDS) {
    if (feeds[feed] !== false) gaps.push(`feeds.${feed} must be false`);
  }
  for (const key of Object.keys(feeds)) {
    if (key !== "internal_bayesian_execution_runtime" && !FALSE_FEEDS.includes(key)) {
      gaps.push("feeds contains ungoverned field");
    }
  }

  const boundary = asRecord(record.boundary_policy);
  for (const field of BOUNDARY_POLICY_FIELDS) {
    const expected = [
      "receives_bayesian_model_specification_only",
      "receives_bayesian_readiness_review_ref",
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
  if (summary.gate_state !== record.gate_state) {
    gaps.push("validation_summary.gate_state must match gate_state");
  }
  if (ready && asArray(summary.gaps).length !== 0) {
    gaps.push("validation_summary.gaps must be empty for ready gate");
  }
  if (record.gate_hash !== contributionAlignmentInternalBayesianExecutionGateHash(record)) {
    gaps.push("gate_hash must match gate body");
  }
  gaps.push(...hasForbiddenContent(record));
  return sanitizeGaps(gaps);
}

function collectSourceBindingGaps(gate, options = {}) {
  const gaps = [];
  if (options.sourceSpecification) {
    const specificationGaps = sourceSpecificationGaps(options.sourceSpecification);
    if (specificationGaps.length > 0) gaps.push(...specificationGaps);
  }
  if (options.sourceReadinessReview) {
    const reviewGaps = sourceReadinessReviewGaps(
      options.sourceReadinessReview,
      options.sourceSpecification
    );
    if (reviewGaps.length > 0) gaps.push(...reviewGaps);
  }
  if (options.sourceFrame) {
    const frameGaps = sourceFrameGaps(options.sourceFrame, options.sourceSpecification);
    if (frameGaps.length > 0) gaps.push(...frameGaps);
  }
  if (options.expectedGate) {
    const actualWithoutHash = clone(gate);
    const expectedWithoutHash = clone(options.expectedGate);
    delete actualWithoutHash.gate_hash;
    delete expectedWithoutHash.gate_hash;
    if (stableStringify(actualWithoutHash) !== stableStringify(expectedWithoutHash)) {
      gaps.push("Bayesian execution gate binding mismatch against sourceSpecification");
    }
  }
  return sanitizeGaps(gaps);
}

export function validateContributionAlignmentInternalBayesianExecutionGate(gate, options = {}) {
  if (gate?.gate_state === REJECT_STATE) {
    return rejectValidation(gate);
  }
  const gaps = sanitizeGaps([
    ...collectShapeGaps(gate),
    ...collectSourceBindingGaps(gate, options)
  ]);
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid: gaps.length === 0 && gate?.gate_state === READY_STATE,
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
      "Usage: node scripts/run_ai_value_contribution_alignment_internal_bayesian_execution_gate.mjs <bayesian-model-specification-json|- for stdin>"
    );
    process.exit(1);
  }
  const gate = buildContributionAlignmentInternalBayesianExecutionGateFromObject(inputFromCliPath(inputPath));
  process.stdout.write(`${JSON.stringify(gate, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
