#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_SCHEMA_VERSION,
  contributionAlignmentInternalBayesianExecutionRuntimeHash,
  validateContributionAlignmentInternalBayesianExecutionRuntime
} from "./run_ai_value_contribution_alignment_internal_bayesian_execution_runtime.mjs";

export const CONTRIBUTION_ALIGNMENT_POSTERIOR_OUTPUT_REVIEW_GATE_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_POSTERIOR_OUTPUT_REVIEW_GATE_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_POSTERIOR_OUTPUT_REVIEW_GATE_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_contribution_alignment_posterior_output_review_gate_2026_06";

const READY_STATE =
  "POSTERIOR_ARTIFACT_CONTAINMENT_REVIEW_PASSED";
const HOLD_STATE = "HOLD_FOR_INTERNAL_BAYESIAN_EXECUTION_RUNTIME";
const REJECT_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const REVIEW_VERSION = "posterior_output_review_gate_2026_06";
const REVIEW_CLASS = "artifact_containment_only";
const READY_NEXT_STEP = "internal_diagnostics_and_model_adequacy_review_only";
const HELD_NEXT_STEP = "complete_internal_bayesian_execution_runtime";

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "review_id",
  "review_state",
  "review_class",
  "generated_at",
  "derivation_version",
  "source_bound",
  "source_runtime_ref",
  "review_version",
  "review_policy",
  "review_checks",
  "reviewed_fit_artifact_ref",
  "allowed_next_step",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "boundary_policy",
  "validation_summary",
  "review_hash"
]);

const SOURCE_RUNTIME_REF_FIELDS = [
  "schema_version",
  "runtime_id",
  "runtime_state",
  "runtime_version",
  "runtime_hash"
];

const REVIEW_POLICY_FIELDS = [
  "internal_only",
  "review_gate_only",
  "internal_interpretation_specification_authorized",
  "posterior_output_authorized",
  "confidence_output_authorized",
  "probability_output_authorized",
  "finance_output_authorized",
  "customer_output_authorized"
];

const REVIEW_CHECK_FIELDS = [
  "runtime_source_bound",
  "aggregate_only_runtime",
  "internal_fit_artifact_hash_bound",
  "posterior_candidate_held_for_review",
  "no_probability_value_present",
  "no_confidence_language_present",
  "no_customer_output_present",
  "diagnostics_missing_require_adequacy_review",
  "interpretation_specification_blocked"
];

const REVIEWED_FIT_ARTIFACT_REF_FIELDS = [
  "artifact_state",
  "estimand_parameter",
  "artifact_hash",
  "numeric_posterior_values_withheld",
  "output_value_present"
];

const FEED_FIELDS = [
  "internal_diagnostics_and_model_adequacy_review",
  "internal_posterior_interpretation_specification",
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

const BOUNDARY_POLICY_FIELDS = [
  "receives_internal_bayesian_execution_runtime_only",
  "receives_fit_artifact_ref",
  "receives_posterior_numeric_values",
  "receives_raw_rows",
  "receives_query_text",
  "receives_identifiers",
  "persists_review",
  "creates_routes",
  "creates_ui",
  "creates_schemas",
  "creates_exports",
  "runs_live_connectors",
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
  "source_runtime",
  "source_gate",
  "aggregate_measurement_cell_windows",
  "generated_at"
]);

const ALLOWED_SOURCE_RUNTIME_ENVELOPE_FIELDS = new Set([
  "source_runtime",
  "source_gate",
  "sourceGate",
  "aggregate_measurement_cell_windows",
  "aggregateMeasurementCellWindows"
]);

const REQUIRED_BLOCKED_USES = [
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
  "Posterior Output Review Gate is an artifact-containment review only.",
  "This gate does not authorize internal posterior interpretation specification, posterior output, confidence, probability, score, ROI, finance, causality, productivity, or customer-facing output.",
  "The gate reviews the internal fixture/prototype artifact by ref and hash; it does not echo posterior numeric values.",
  "Diagnostics, posterior predictive checks, prior sensitivity, comparison-design adequacy review, and calibration evidence remain required before any later interpretation review.",
  "Customer-facing confidence or probability language remains blocked until a later explicitly promoted contract authorizes that exact scope."
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

function sourceRuntimeFromInput(input) {
  const record = asRecord(input);
  const sourceRuntimeEnvelope = asRecord(record.source_runtime);
  if (sourceRuntimeEnvelope.source_runtime) return sourceRuntimeEnvelope.source_runtime;
  return record.source_runtime ?? input;
}

function sourceRuntimeValidationOptions(input) {
  const record = asRecord(input);
  const sourceRuntimeEnvelope = asRecord(record.source_runtime);
  const source = sourceRuntimeEnvelope.source_runtime ? sourceRuntimeEnvelope : record;
  return {
    sourceGate: source.source_gate ?? source.sourceGate,
    aggregateMeasurementCellWindows:
      source.aggregate_measurement_cell_windows ??
      source.aggregateMeasurementCellWindows
  };
}

function inputBoundaryGaps(input) {
  const record = asRecord(input);
  if (!Object.prototype.hasOwnProperty.call(record, "source_runtime")) return [];
  const sidecar = Object.fromEntries(
    Object.entries(record).filter(([key]) => !ALLOWED_INPUT_FIELDS.has(key))
  );
  const sourceRuntimeEnvelope = asRecord(record.source_runtime);
  const nestedSidecar =
    sourceRuntimeEnvelope.source_runtime
      ? Object.fromEntries(
          Object.entries(sourceRuntimeEnvelope).filter(
            ([key]) => !ALLOWED_SOURCE_RUNTIME_ENVELOPE_FIELDS.has(key)
          )
        )
      : {};
  return Object.keys(sidecar).length > 0 || Object.keys(nestedSidecar).length > 0
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

function sourceRuntimeRef(sourceRuntime) {
  return {
    schema_version:
      sourceRuntime?.schema_version ===
      CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_SCHEMA_VERSION
        ? sourceRuntime.schema_version
        : null,
    runtime_id: safeId(
      sourceRuntime?.runtime_id,
      "contribution_alignment_internal_bayesian_execution_runtime"
    ),
    runtime_state:
      sourceRuntime?.runtime_state ===
      "INTERNAL_BAYESIAN_FIXTURE_EXECUTION_PROTOTYPE_HELD_FOR_REVIEW"
        ? sourceRuntime.runtime_state
        : null,
    runtime_version:
      sourceRuntime?.runtime_version === "internal_bayesian_execution_runtime_2026_06"
        ? sourceRuntime.runtime_version
        : null,
    runtime_hash: safeHash(sourceRuntime?.runtime_hash)
  };
}

function artifactHash(artifact) {
  const withoutHash = clone(artifact);
  delete withoutHash.artifact_hash;
  return sha256Json(withoutHash);
}

function hasForbiddenContent(value, path = "review") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => hasForbiddenContent(item, `${path}[${index}]`));
  }
  if (value && typeof value === "object") {
    const gaps = [];
    for (const [key, nested] of Object.entries(value)) {
      const safeFalseFlag =
        nested === false &&
        (
          path === "review.feeds" ||
          path === "review.boundary_policy" ||
          path === "review.review_policy"
        );
      const safeReviewField =
        (
          path === "review.review_policy" &&
          REVIEW_POLICY_FIELDS.includes(key)
        ) ||
        (
          path === "review.review_checks" &&
          REVIEW_CHECK_FIELDS.includes(key)
        ) ||
        (
          path === "review.reviewed_fit_artifact_ref" &&
          REVIEWED_FIT_ARTIFACT_REF_FIELDS.includes(key)
        ) ||
        (
          path === "review.feeds" &&
          FEED_FIELDS.includes(key)
        ) ||
        (
          path === "review.boundary_policy" &&
          BOUNDARY_POLICY_FIELDS.includes(key)
        );
      if (
        !safeFalseFlag &&
        !safeReviewField &&
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

function sourceRuntimeGaps(sourceRuntime, validationOptions = {}) {
  const source = asRecord(sourceRuntime);
  const artifact = asRecord(source.internal_fit_artifact);
  const gaps = [];
  const runtimeValidation = validateContributionAlignmentInternalBayesianExecutionRuntime(source, {
    ...validationOptions
  });
  if (runtimeValidation.valid !== true) {
    gaps.push("source_runtime failed internal Bayesian execution runtime validation");
    gaps.push(...runtimeValidation.gaps.map((gap) => `source_runtime.${gap}`));
  }
  if (source.schema_version !== CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_SCHEMA_VERSION) {
    gaps.push("source_runtime.schema_version is invalid");
  }
  if (source.runtime_state !== "INTERNAL_BAYESIAN_FIXTURE_EXECUTION_PROTOTYPE_HELD_FOR_REVIEW") {
    gaps.push("source_runtime.runtime_state is not contained fixture prototype");
  }
  if (source.runtime_hash !== contributionAlignmentInternalBayesianExecutionRuntimeHash(source)) {
    gaps.push("sourceRuntime hash drifted");
  }
  if (source.validation_summary?.valid !== true) {
    gaps.push("source_runtime.validation_summary is not valid");
  }
  if (source.source_bound !== true) {
    gaps.push("source_runtime is not source-bound");
  }
  if (source.runtime_policy?.aggregate_only_runtime !== true) {
    gaps.push("source_runtime is not aggregate-only");
  }
  if (source.runtime_execution_class !== "internal_fixture_prototype_only") {
    gaps.push("source_runtime.runtime_execution_class is not fixture prototype only");
  }
  for (const field of [
    "posterior_output_review_gate_authorized",
    "posterior_output_authorized",
    "confidence_output_authorized",
    "probability_output_authorized",
    "finance_output_authorized",
    "customer_output_authorized"
  ]) {
    if (source.runtime_policy?.[field] !== false) {
      gaps.push(`source_runtime.${field} must be false`);
    }
  }
  if (source.allowed_next_step !== "internal_diagnostics_and_model_adequacy_review_only") {
    gaps.push("source_runtime.allowed_next_step must require diagnostics and model adequacy review");
  }
  for (const feed of [
    "posterior_output_review_gate",
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
      gaps.push(`source_runtime.feeds.${feed} must be false`);
    }
  }
  if (artifact.artifact_state !== "INTERNAL_POSTERIOR_CANDIDATE_HELD_FOR_OUTPUT_REVIEW") {
    gaps.push("source_runtime internal fit artifact is not held for review");
  }
  if (artifact.artifact_hash !== artifactHash(artifact)) {
    gaps.push("source_runtime internal fit artifact hash drifted");
  }
  if (artifact.probability_value_present !== false) {
    gaps.push("source_runtime internal fit artifact has probability value");
  }
  if (artifact.confidence_language_present !== false) {
    gaps.push("source_runtime internal fit artifact has confidence language");
  }
  if (artifact.customer_output_present !== false) {
    gaps.push("source_runtime internal fit artifact has customer output");
  }
  if (artifact.posterior_output_review_required !== true) {
    gaps.push("source_runtime internal fit artifact does not require output review");
  }
  for (const field of [
    "convergence_diagnostics_present",
    "posterior_predictive_checks_present",
    "prior_sensitivity_present",
    "comparison_design_adequacy_review_present",
    "calibration_evidence_present",
    "interpretation_ready"
  ]) {
    if (artifact[field] !== false) {
      gaps.push(`source_runtime internal fit artifact ${field} must be false`);
    }
  }
  return sanitizeGaps(gaps);
}

function reviewedFitArtifactRef(sourceRuntime, ready) {
  const artifact = asRecord(sourceRuntime?.internal_fit_artifact);
  return {
    artifact_state: ready ? artifact.artifact_state : null,
    estimand_parameter: ready ? artifact.estimand_parameter : null,
    artifact_hash: ready ? safeHash(artifact.artifact_hash) : null,
    numeric_posterior_values_withheld: ready,
    output_value_present: false
  };
}

function buildReviewChecks(sourceRuntime, ready) {
  const artifact = asRecord(sourceRuntime?.internal_fit_artifact);
  return {
    runtime_source_bound: ready,
    aggregate_only_runtime: ready && sourceRuntime?.runtime_policy?.aggregate_only_runtime === true,
    internal_fit_artifact_hash_bound: ready && artifact.artifact_hash === artifactHash(artifact),
    posterior_candidate_held_for_review:
      ready && artifact.artifact_state === "INTERNAL_POSTERIOR_CANDIDATE_HELD_FOR_OUTPUT_REVIEW",
    no_probability_value_present: ready && artifact.probability_value_present === false,
    no_confidence_language_present: ready && artifact.confidence_language_present === false,
    no_customer_output_present: ready && artifact.customer_output_present === false,
    diagnostics_missing_require_adequacy_review:
      ready &&
      artifact.convergence_diagnostics_present === false &&
      artifact.posterior_predictive_checks_present === false &&
      artifact.prior_sensitivity_present === false &&
      artifact.comparison_design_adequacy_review_present === false &&
      artifact.calibration_evidence_present === false,
    interpretation_specification_blocked: ready && artifact.interpretation_ready === false
  };
}

function buildReview(sourceRuntime, state, gaps) {
  const ready = state === READY_STATE;
  const review = {
    schema_version: CONTRIBUTION_ALIGNMENT_POSTERIOR_OUTPUT_REVIEW_GATE_SCHEMA_VERSION,
    review_id: `contribution_alignment_posterior_output_review_gate_${sha256Json({
      runtime_id: sourceRuntime?.runtime_id ?? null,
      runtime_hash: sourceRuntime?.runtime_hash ?? null,
      artifact_hash: sourceRuntime?.internal_fit_artifact?.artifact_hash ?? null,
      review_version: REVIEW_VERSION
    }).slice(0, 16)}`,
    review_state: state,
    review_class: ready ? REVIEW_CLASS : null,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: ready,
    source_runtime_ref: sourceRuntimeRef(sourceRuntime),
    review_version: ready ? REVIEW_VERSION : null,
    review_policy: {
      internal_only: true,
      review_gate_only: true,
      internal_interpretation_specification_authorized: false,
      posterior_output_authorized: false,
      confidence_output_authorized: false,
      probability_output_authorized: false,
      finance_output_authorized: false,
      customer_output_authorized: false
    },
    review_checks: buildReviewChecks(sourceRuntime, ready),
    reviewed_fit_artifact_ref: reviewedFitArtifactRef(sourceRuntime, ready),
    allowed_next_step: ready ? READY_NEXT_STEP : HELD_NEXT_STEP,
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: {
      internal_diagnostics_and_model_adequacy_review: ready,
      ...falseMap(
        FEED_FIELDS.filter((field) => field !== "internal_diagnostics_and_model_adequacy_review")
      )
    },
    boundary_policy: {
      receives_internal_bayesian_execution_runtime_only: state !== REJECT_STATE,
      receives_fit_artifact_ref: state !== REJECT_STATE,
      ...falseMap(
        BOUNDARY_POLICY_FIELDS.filter((field) =>
          ![
            "receives_internal_bayesian_execution_runtime_only",
            "receives_fit_artifact_ref"
          ].includes(field)
        )
      )
    },
    validation_summary: {
      schema_version: `${CONTRIBUTION_ALIGNMENT_POSTERIOR_OUTPUT_REVIEW_GATE_SCHEMA_VERSION}_SUMMARY`,
      valid: ready,
      review_state: state,
      gaps: ready ? [] : sanitizeGaps(gaps)
    }
  };
  review.review_hash = contributionAlignmentPosteriorOutputReviewGateHash(review);
  return review;
}

function rejectedReview() {
  const review = {
    schema_version: CONTRIBUTION_ALIGNMENT_POSTERIOR_OUTPUT_REVIEW_GATE_SCHEMA_VERSION,
    review_id: null,
    review_state: REJECT_STATE,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: false,
    reviewed_fit_artifact_ref: {
      artifact_state: null,
      estimand_parameter: null,
      artifact_hash: null,
      numeric_posterior_values_withheld: false,
      output_value_present: false
    },
    validation_summary: {
      schema_version: `${CONTRIBUTION_ALIGNMENT_POSTERIOR_OUTPUT_REVIEW_GATE_SCHEMA_VERSION}_SUMMARY`,
      valid: false,
      review_state: REJECT_STATE,
      gaps: ["boundary leakage rejected"]
    }
  };
  review.review_hash = contributionAlignmentPosteriorOutputReviewGateHash(review);
  return review;
}

export function contributionAlignmentPosteriorOutputReviewGateHash(review) {
  const withoutHash = clone(review);
  delete withoutHash.review_hash;
  return sha256Json(withoutHash);
}

export function buildContributionAlignmentPosteriorOutputReviewGateFromObject(input) {
  const wrapperGaps = inputBoundaryGaps(input);
  if (wrapperGaps.length > 0) return rejectedReview();
  const sourceRuntime = sourceRuntimeFromInput(input);
  const runtimeValidationOptions = sourceRuntimeValidationOptions(input);
  const gaps = sourceRuntimeGaps(sourceRuntime, runtimeValidationOptions);
  return buildReview(sourceRuntime, gaps.length === 0 ? READY_STATE : HOLD_STATE, gaps);
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

function rejectValidation(review) {
  if (review?.review_state !== REJECT_STATE) return null;
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid: false,
    gaps: ["boundary leakage rejected"]
  };
}

function collectShapeGaps(review) {
  const rejected = rejectValidation(review);
  if (rejected) return rejected.gaps;

  const record = asRecord(review);
  const gaps = [];
  gaps.push(...collectAllowedFieldsGaps(record, TOP_LEVEL_FIELDS, "review"));
  if (record.schema_version !== CONTRIBUTION_ALIGNMENT_POSTERIOR_OUTPUT_REVIEW_GATE_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  if (![READY_STATE, HOLD_STATE].includes(record.review_state)) {
    gaps.push("review_state is invalid");
  }
  const ready = record.review_state === READY_STATE;
  if (record.source_bound !== ready) gaps.push(`source_bound must be ${ready}`);
  if (record.review_class !== (ready ? REVIEW_CLASS : null)) {
    gaps.push(`review_class must be ${ready ? REVIEW_CLASS : "null"}`);
  }
  if (record.review_version !== (ready ? REVIEW_VERSION : null)) {
    gaps.push(`review_version must be ${ready ? REVIEW_VERSION : "null"}`);
  }
  if (ready && record.allowed_next_step !== READY_NEXT_STEP) {
    gaps.push(`allowed_next_step must be ${READY_NEXT_STEP}`);
  }
  if (!ready && record.allowed_next_step !== HELD_NEXT_STEP) {
    gaps.push(`allowed_next_step must be ${HELD_NEXT_STEP}`);
  }

  gaps.push(...collectRefGaps(record.source_runtime_ref, SOURCE_RUNTIME_REF_FIELDS, "source_runtime_ref"));

  const policy = asRecord(record.review_policy);
  gaps.push(...collectRefGaps(policy, REVIEW_POLICY_FIELDS, "review_policy"));
  for (const [field, expected] of Object.entries({
    internal_only: true,
    review_gate_only: true,
    internal_interpretation_specification_authorized: false,
    posterior_output_authorized: false,
    confidence_output_authorized: false,
    probability_output_authorized: false,
    finance_output_authorized: false,
    customer_output_authorized: false
  })) {
    if (policy[field] !== expected) gaps.push(`review_policy.${field} must be ${expected}`);
  }

  const checks = asRecord(record.review_checks);
  gaps.push(...collectRefGaps(checks, REVIEW_CHECK_FIELDS, "review_checks"));
  for (const field of REVIEW_CHECK_FIELDS) {
    if (checks[field] !== ready) gaps.push(`review_checks.${field} must be ${ready}`);
  }

  const artifactRef = asRecord(record.reviewed_fit_artifact_ref);
  gaps.push(...collectRefGaps(artifactRef, REVIEWED_FIT_ARTIFACT_REF_FIELDS, "reviewed_fit_artifact_ref"));
  if (ready) {
    if (artifactRef.artifact_state !== "INTERNAL_POSTERIOR_CANDIDATE_HELD_FOR_OUTPUT_REVIEW") {
      gaps.push("reviewed_fit_artifact_ref.artifact_state is invalid");
    }
    if (artifactRef.estimand_parameter !== "delta_ai_post") {
      gaps.push("reviewed_fit_artifact_ref.estimand_parameter is invalid");
    }
    if (!safeHash(artifactRef.artifact_hash)) {
      gaps.push("reviewed_fit_artifact_ref.artifact_hash is invalid");
    }
    if (artifactRef.numeric_posterior_values_withheld !== true) {
      gaps.push("reviewed_fit_artifact_ref must withhold numeric posterior values");
    }
    if (artifactRef.output_value_present !== false) {
      gaps.push("reviewed_fit_artifact_ref must not present output values");
    }
  } else {
    if (artifactRef.artifact_hash !== null) {
      gaps.push("reviewed_fit_artifact_ref.artifact_hash must be null while held");
    }
  }
  for (const forbidden of [
    "posterior_mean_internal",
    "posterior_sd_internal",
    "did_observed_estimate",
    "did_standard_error"
  ]) {
    if (Object.hasOwn(artifactRef, forbidden)) {
      gaps.push("reviewed_fit_artifact_ref must not echo posterior numeric values");
    }
  }

  const feeds = asRecord(record.feeds);
  if (feeds.internal_diagnostics_and_model_adequacy_review !== ready) {
    gaps.push(`feeds.internal_diagnostics_and_model_adequacy_review must be ${ready}`);
  }
  for (const field of FEED_FIELDS.filter((feed) => feed !== "internal_diagnostics_and_model_adequacy_review")) {
    if (feeds[field] !== false) gaps.push(`feeds.${field} must be false`);
  }
  for (const key of Object.keys(feeds)) {
    if (!FEED_FIELDS.includes(key)) gaps.push("feeds contains ungoverned field");
  }

  const boundary = asRecord(record.boundary_policy);
  for (const field of BOUNDARY_POLICY_FIELDS) {
    const expected = [
      "receives_internal_bayesian_execution_runtime_only",
      "receives_fit_artifact_ref"
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
  if (record.review_hash !== contributionAlignmentPosteriorOutputReviewGateHash(record)) {
    gaps.push("review_hash must match review body");
  }
  gaps.push(...hasForbiddenContent(record));
  return sanitizeGaps(gaps);
}

function collectSourceBindingGaps(review, options = {}) {
  const gaps = [];
  if (review?.review_state === READY_STATE && !options.sourceRuntime) {
    gaps.push("sourceRuntime is required for ready posterior output review validation");
  }
  if (options.sourceRuntime) {
    const runtimeValidationOptions = sourceRuntimeValidationOptions(options);
    const runtimeGaps = sourceRuntimeGaps(options.sourceRuntime, runtimeValidationOptions);
    if (runtimeGaps.length > 0) gaps.push(...runtimeGaps);
  }
  if (options.expectedReview) {
    const actualWithoutHash = clone(review);
    const expectedWithoutHash = clone(options.expectedReview);
    delete actualWithoutHash.review_hash;
    delete expectedWithoutHash.review_hash;
    if (stableStringify(actualWithoutHash) !== stableStringify(expectedWithoutHash)) {
      gaps.push("posterior output review binding mismatch against sourceRuntime");
    }
  }
  return sanitizeGaps(gaps);
}

export function validateContributionAlignmentPosteriorOutputReviewGate(review, options = {}) {
  if (review?.review_state === REJECT_STATE) {
    return rejectValidation(review);
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

function inputFromCliPath(path) {
  if (path === "-") return JSON.parse(readFileSync(0, "utf8"));
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function main() {
  const [, , inputPath] = process.argv;
  if (!inputPath) {
    console.error(
      "Usage: node scripts/run_ai_value_contribution_alignment_posterior_output_review_gate.mjs <internal-bayesian-execution-runtime-json|- for stdin>"
    );
    process.exit(1);
  }
  const review = buildContributionAlignmentPosteriorOutputReviewGateFromObject(inputFromCliPath(inputPath));
  process.stdout.write(`${JSON.stringify(review, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
