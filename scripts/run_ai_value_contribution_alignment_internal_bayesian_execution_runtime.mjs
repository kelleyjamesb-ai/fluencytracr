#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_GATE_SCHEMA_VERSION,
  contributionAlignmentInternalBayesianExecutionGateHash
} from "./run_ai_value_contribution_alignment_internal_bayesian_execution_gate.mjs";

export const CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_SCHEMA_VERSION}_VALIDATION`;

const DERIVATION_VERSION =
  "ai_value_contribution_alignment_internal_bayesian_execution_runtime_2026_06";

const READY_STATE = "INTERNAL_BAYESIAN_FIXTURE_EXECUTION_PROTOTYPE_HELD_FOR_REVIEW";
const HOLD_STATE = "HOLD_FOR_INTERNAL_BAYESIAN_EXECUTION_GATE";
const REJECT_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const RUNTIME_VERSION = "internal_bayesian_execution_runtime_2026_06";
const RUNTIME_EXECUTION_CLASS = "internal_fixture_prototype_only";
const READY_NEXT_STEP = "internal_diagnostics_and_model_adequacy_review_only";
const HELD_NEXT_STEP = "complete_internal_bayesian_execution_gate";
const PRIOR_MEAN = 0;
const PRIOR_SD = 1;

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "runtime_id",
  "runtime_state",
  "runtime_execution_class",
  "generated_at",
  "derivation_version",
  "source_bound",
  "source_gate_ref",
  "runtime_version",
  "runtime_policy",
  "model_equation",
  "aggregate_design_matrix",
  "internal_fit_artifact",
  "allowed_next_step",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "boundary_policy",
  "validation_summary",
  "runtime_hash"
]);

const SOURCE_GATE_REF_FIELDS = [
  "schema_version",
  "gate_id",
  "gate_state",
  "gate_version",
  "gate_hash"
];

const RUNTIME_POLICY_FIELDS = [
  "internal_only",
  "runtime_only",
  "aggregate_only_runtime",
  "internal_execution_performed",
  "posterior_output_review_gate_authorized",
  "posterior_output_authorized",
  "confidence_output_authorized",
  "probability_output_authorized",
  "finance_output_authorized",
  "customer_output_authorized"
];

const MODEL_EQUATION_FIELDS = [
  "family",
  "unit_of_analysis",
  "estimand",
  "estimand_parameter",
  "likelihood",
  "linear_predictor",
  "prior_mean",
  "prior_sd",
  "sampler",
  "execution_note"
];

const AGGREGATE_DESIGN_MATRIX_FIELDS = [
  "window_count",
  "required_window_roles_present",
  "required_comparison_roles_present",
  "raw_row_count",
  "identifier_count",
  "query_text_present",
  "missing_window_count",
  "suppressed_window_count",
  "held_window_count",
  "minimum_cohort_size",
  "design_matrix_hash"
];

const INTERNAL_FIT_ARTIFACT_FIELDS = [
  "artifact_state",
  "estimand_parameter",
  "did_observed_estimate",
  "did_standard_error",
  "prior_mean",
  "prior_sd",
  "posterior_mean_internal",
  "posterior_sd_internal",
  "convergence_diagnostics_present",
  "posterior_predictive_checks_present",
  "prior_sensitivity_present",
  "residual_fit_checks_present",
  "comparison_design_adequacy_review_present",
  "calibration_evidence_present",
  "interpretation_ready",
  "probability_value_present",
  "confidence_language_present",
  "customer_output_present",
  "posterior_output_review_required",
  "artifact_hash"
];

const FEED_FIELDS = [
  "internal_diagnostics_and_model_adequacy_review",
  "posterior_output_review_gate",
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
  "receives_internal_bayesian_execution_gate_only",
  "receives_aggregate_measurement_cell_windows",
  "receives_raw_rows",
  "receives_query_text",
  "receives_identifiers",
  "persists_runtime",
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

const AGGREGATE_WINDOW_FIELDS = new Set([
  "aggregate_window_id",
  "comparison_role",
  "window_role",
  "selected_metric_mean",
  "selected_metric_standard_error",
  "cohort_size"
]);

const ALLOWED_INPUT_FIELDS = new Set([
  "source_gate",
  "aggregate_measurement_cell_windows",
  "generated_at"
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
  "Internal Bayesian Execution Runtime is contained as an internal fixture/prototype artifact only.",
  "The DiD and posterior fields are prototype fixture calculations only; they do not establish production Bayesian runtime readiness or interpretation readiness.",
  "Diagnostics, posterior predictive checks, prior sensitivity, comparison-design adequacy review, and calibration evidence are absent and required before any later interpretation review.",
  "This runtime does not emit posterior, confidence, probability, score, ROI, finance, causality, productivity, or customer-facing output.",
  "The runtime must remain bound to the Internal Bayesian Execution Gate and aggregate measurement-cell-window inputs with no raw rows, query text, identifiers, live connectors, schemas, UI, exports, or persistence writes."
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
  /confidence[_-\s]?(?:score|output|percent|percentage|model|ready)/i,
  /probability[_-\s]?(?:score|output|percent|percentage|model|ready)?/i,
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

function round6(value) {
  return Number(Number(value).toFixed(6));
}

function sanitizeGaps(gaps) {
  return [...new Set(gaps.filter(Boolean))].sort();
}

function falseMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, false]));
}

function sourceGateFromInput(input) {
  const record = asRecord(input);
  return record.source_gate ?? input;
}

function aggregateWindowsFromInput(input) {
  const record = asRecord(input);
  return asArray(record.aggregate_measurement_cell_windows);
}

function inputBoundaryGaps(input) {
  const record = asRecord(input);
  if (!Object.prototype.hasOwnProperty.call(record, "source_gate")) return [];
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

function sourceGateRef(sourceGate) {
  return {
    schema_version:
      sourceGate?.schema_version ===
      CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_GATE_SCHEMA_VERSION
        ? sourceGate.schema_version
        : null,
    gate_id: safeId(
      sourceGate?.gate_id,
      "contribution_alignment_internal_bayesian_execution_gate"
    ),
    gate_state:
      sourceGate?.gate_state === "INTERNAL_BAYESIAN_EXECUTION_GATE_READY"
        ? sourceGate.gate_state
        : null,
    gate_version:
      sourceGate?.gate_version === "internal_bayesian_execution_gate_2026_06"
        ? sourceGate.gate_version
        : null,
    gate_hash: safeHash(sourceGate?.gate_hash)
  };
}

function hasForbiddenContent(value, path = "runtime") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => hasForbiddenContent(item, `${path}[${index}]`));
  }
  if (value && typeof value === "object") {
    const gaps = [];
    for (const [key, nested] of Object.entries(value)) {
      const safeFalseFlag =
        nested === false &&
        (
          path === "runtime.feeds" ||
          path === "runtime.boundary_policy" ||
          path === "runtime.runtime_policy" ||
          path === "runtime.internal_fit_artifact"
        );
      const safeInternalFitKey =
        path === "runtime.internal_fit_artifact" &&
        INTERNAL_FIT_ARTIFACT_FIELDS.includes(key);
      const safeFeedKey =
        path === "runtime.feeds" &&
        FEED_FIELDS.includes(key);
      const safeAggregateDesignGuardrail =
        path === "runtime.aggregate_design_matrix" &&
        AGGREGATE_DESIGN_MATRIX_FIELDS.includes(key) &&
        (
          key === "raw_row_count" ||
          key === "identifier_count" ||
          key === "query_text_present"
        ) &&
        (nested === 0 || nested === false);
      if (
        !safeFalseFlag &&
        !safeInternalFitKey &&
        !safeFeedKey &&
        !safeAggregateDesignGuardrail &&
        FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))
      ) {
        gaps.push("runtime contains forbidden field name");
        continue;
      }
      gaps.push(...hasForbiddenContent(nested, `${path}.${key}`));
    }
    return gaps;
  }
  if (typeof value !== "string") return [];
  if (
    path.startsWith("runtime.blocked_uses[") ||
    path.startsWith("runtime.required_caveats[")
  ) {
    return [];
  }
  return FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
    ? [`${path} contains unsafe source or output language`]
    : [];
}

function sourceGateGaps(sourceGate) {
  const source = asRecord(sourceGate);
  const gaps = [];
  if (source.schema_version !== CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_GATE_SCHEMA_VERSION) {
    gaps.push("source_gate.schema_version is invalid");
  }
  if (source.gate_state !== "INTERNAL_BAYESIAN_EXECUTION_GATE_READY") {
    gaps.push("source_gate.gate_state is not ready");
  }
  if (source.gate_hash !== contributionAlignmentInternalBayesianExecutionGateHash(source)) {
    gaps.push("sourceGate hash drifted");
  }
  if (source.validation_summary?.valid !== true) {
    gaps.push("source_gate.validation_summary is not valid");
  }
  if (source.source_bound !== true) {
    gaps.push("source_gate is not source-bound");
  }
  if (source.gate_policy?.runtime_implementation_authorized !== true) {
    gaps.push("source_gate does not authorize internal runtime implementation");
  }
  if (source.feeds?.internal_bayesian_execution_runtime !== true) {
    gaps.push("source_gate does not feed internal Bayesian execution runtime");
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
    if (source.gate_policy?.[field] !== false) {
      gaps.push(`source_gate.${field} must be false`);
    }
  }
  for (const prerequisite of [
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
  ]) {
    if (source.runtime_prerequisites?.[prerequisite] !== true) {
      gaps.push(`source_gate.runtime_prerequisites.${prerequisite} must be true`);
    }
  }
  return sanitizeGaps(gaps);
}

function aggregateWindowGaps(windows) {
  const gaps = [];
  const records = asArray(windows);
  if (records.length !== 4) gaps.push("aggregate_measurement_cell_windows must contain exactly four aggregate windows");
  const rolePairs = new Set();
  for (const window of records) {
    const record = asRecord(window);
    for (const key of Object.keys(record)) {
      if (!AGGREGATE_WINDOW_FIELDS.has(key)) gaps.push("aggregate window contains ungoverned field");
    }
    if (!["ai_exposed", "comparison"].includes(record.comparison_role)) {
      gaps.push("aggregate window comparison_role is invalid");
    }
    if (!["baseline", "comparison"].includes(record.window_role)) {
      gaps.push("aggregate window window_role is invalid");
    }
    rolePairs.add(`${record.comparison_role}:${record.window_role}`);
    for (const numericField of [
      "selected_metric_mean",
      "selected_metric_standard_error",
      "cohort_size"
    ]) {
      if (typeof record[numericField] !== "number" || !Number.isFinite(record[numericField])) {
        gaps.push(`aggregate window ${numericField} must be finite number`);
      }
    }
    if (record.selected_metric_standard_error <= 0) {
      gaps.push("aggregate window selected_metric_standard_error must be positive");
    }
    if (record.cohort_size < 5) {
      gaps.push("aggregate window cohort_size must satisfy aggregate minimum");
    }
    if (typeof record.aggregate_window_id !== "string" || !/^agg_window_[a-z0-9_]+$/.test(record.aggregate_window_id)) {
      gaps.push("aggregate_window_id must be aggregate-only safe id");
    }
  }
  for (const required of [
    "ai_exposed:baseline",
    "ai_exposed:comparison",
    "comparison:baseline",
    "comparison:comparison"
  ]) {
    if (!rolePairs.has(required)) gaps.push(`aggregate window role pair ${required} is missing`);
  }
  return sanitizeGaps(gaps);
}

function findWindow(windows, comparisonRole, windowRole) {
  return asArray(windows).find(
    (window) =>
      window.comparison_role === comparisonRole &&
      window.window_role === windowRole
  );
}

function buildFitArtifact(windows) {
  const exposedBaseline = findWindow(windows, "ai_exposed", "baseline");
  const exposedComparison = findWindow(windows, "ai_exposed", "comparison");
  const controlBaseline = findWindow(windows, "comparison", "baseline");
  const controlComparison = findWindow(windows, "comparison", "comparison");
  const exposedDelta =
    exposedComparison.selected_metric_mean - exposedBaseline.selected_metric_mean;
  const controlDelta =
    controlComparison.selected_metric_mean - controlBaseline.selected_metric_mean;
  const didObservedEstimate = exposedDelta - controlDelta;
  const didVariance =
    exposedBaseline.selected_metric_standard_error ** 2 +
    exposedComparison.selected_metric_standard_error ** 2 +
    controlBaseline.selected_metric_standard_error ** 2 +
    controlComparison.selected_metric_standard_error ** 2;
  const didStandardError = Math.sqrt(didVariance);
  const priorVariance = PRIOR_SD ** 2;
  const posteriorVariance = 1 / ((1 / priorVariance) + (1 / didVariance));
  const posteriorMean =
    posteriorVariance * ((PRIOR_MEAN / priorVariance) + (didObservedEstimate / didVariance));
  const artifact = {
    artifact_state: "INTERNAL_POSTERIOR_CANDIDATE_HELD_FOR_OUTPUT_REVIEW",
    estimand_parameter: "delta_ai_post",
    did_observed_estimate: round6(didObservedEstimate),
    did_standard_error: round6(didStandardError),
    prior_mean: PRIOR_MEAN,
    prior_sd: PRIOR_SD,
    posterior_mean_internal: round6(posteriorMean),
    posterior_sd_internal: round6(Math.sqrt(posteriorVariance)),
    convergence_diagnostics_present: false,
    posterior_predictive_checks_present: false,
    prior_sensitivity_present: false,
    residual_fit_checks_present: false,
    comparison_design_adequacy_review_present: false,
    calibration_evidence_present: false,
    interpretation_ready: false,
    probability_value_present: false,
    confidence_language_present: false,
    customer_output_present: false,
    posterior_output_review_required: true
  };
  artifact.artifact_hash = sha256Json(artifact);
  return artifact;
}

function buildDesignMatrix(windows) {
  const cohorts = asArray(windows).map((window) => window.cohort_size);
  const design = {
    window_count: asArray(windows).length,
    required_window_roles_present: true,
    required_comparison_roles_present: true,
    raw_row_count: 0,
    identifier_count: 0,
    query_text_present: false,
    missing_window_count: 0,
    suppressed_window_count: 0,
    held_window_count: 0,
    minimum_cohort_size: Math.min(...cohorts),
    design_matrix_hash: sha256Json(
      asArray(windows).map((window) => ({
        aggregate_window_id: window.aggregate_window_id,
        comparison_role: window.comparison_role,
        window_role: window.window_role,
        selected_metric_mean: window.selected_metric_mean,
        selected_metric_standard_error: window.selected_metric_standard_error,
        cohort_size: window.cohort_size
      }))
    )
  };
  return design;
}

function buildModelEquation() {
  return {
    family: "bayesian_hierarchical_difference_in_differences",
    unit_of_analysis: "aggregate_measurement_cell_window",
    estimand: "aggregate_selected_metric_movement_difference_in_differences_candidate",
    estimand_parameter: "delta_ai_post",
    likelihood: "did_observed_estimate ~ Normal(delta_ai_post, did_standard_error)",
    linear_predictor:
      "mu_cell_window = alpha + alpha_cell + beta_post + beta_ai_exposed + delta_ai_post + weighted_covariate_terms",
    prior_mean: PRIOR_MEAN,
    prior_sd: PRIOR_SD,
    sampler: "closed_form_normal_normal_internal_candidate",
    execution_note: "aggregate_only_internal_runtime_candidate_held_for_output_review"
  };
}

function buildRuntime(sourceGate, windows, state, gaps) {
  const ready = state === READY_STATE;
  const runtime = {
    schema_version: CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_SCHEMA_VERSION,
    runtime_id: `contribution_alignment_internal_bayesian_execution_runtime_${sha256Json({
      gate_id: sourceGate?.gate_id ?? null,
      gate_hash: sourceGate?.gate_hash ?? null,
      aggregate_design_matrix: ready ? buildDesignMatrix(windows).design_matrix_hash : null,
      runtime_version: RUNTIME_VERSION
    }).slice(0, 16)}`,
    runtime_state: state,
    runtime_execution_class: ready ? RUNTIME_EXECUTION_CLASS : null,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: ready,
    source_gate_ref: sourceGateRef(sourceGate),
    runtime_version: ready ? RUNTIME_VERSION : null,
    runtime_policy: {
      internal_only: true,
      runtime_only: true,
      aggregate_only_runtime: ready,
      internal_execution_performed: ready,
      posterior_output_review_gate_authorized: false,
      posterior_output_authorized: false,
      confidence_output_authorized: false,
      probability_output_authorized: false,
      finance_output_authorized: false,
      customer_output_authorized: false
    },
    model_equation: ready ? buildModelEquation() : null,
    aggregate_design_matrix: ready ? buildDesignMatrix(windows) : null,
    internal_fit_artifact: ready ? buildFitArtifact(windows) : null,
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
      receives_internal_bayesian_execution_gate_only: state !== REJECT_STATE,
      receives_aggregate_measurement_cell_windows: state !== REJECT_STATE,
      ...falseMap(
        BOUNDARY_POLICY_FIELDS.filter((field) =>
          ![
            "receives_internal_bayesian_execution_gate_only",
            "receives_aggregate_measurement_cell_windows"
          ].includes(field)
        )
      )
    },
    validation_summary: {
      schema_version: `${CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_SCHEMA_VERSION}_SUMMARY`,
      valid: ready,
      runtime_state: state,
      gaps: ready ? [] : sanitizeGaps(gaps)
    }
  };
  runtime.runtime_hash = contributionAlignmentInternalBayesianExecutionRuntimeHash(runtime);
  return runtime;
}

function rejectedRuntime() {
  const runtime = {
    schema_version: CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_SCHEMA_VERSION,
    runtime_id: null,
    runtime_state: REJECT_STATE,
    generated_at: "2026-06-25T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: false,
    internal_fit_artifact: null,
    validation_summary: {
      schema_version: `${CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_SCHEMA_VERSION}_SUMMARY`,
      valid: false,
      runtime_state: REJECT_STATE,
      gaps: ["boundary leakage rejected"]
    }
  };
  runtime.runtime_hash = contributionAlignmentInternalBayesianExecutionRuntimeHash(runtime);
  return runtime;
}

export function contributionAlignmentInternalBayesianExecutionRuntimeHash(runtime) {
  const withoutHash = clone(runtime);
  delete withoutHash.runtime_hash;
  return sha256Json(withoutHash);
}

export function buildContributionAlignmentInternalBayesianExecutionRuntimeFromObject(input) {
  const wrapperGaps = inputBoundaryGaps(input);
  if (wrapperGaps.length > 0) return rejectedRuntime();
  const sourceGate = sourceGateFromInput(input);
  const windows = aggregateWindowsFromInput(input);
  const gaps = sanitizeGaps([
    ...sourceGateGaps(sourceGate),
    ...aggregateWindowGaps(windows)
  ]);
  return buildRuntime(sourceGate, windows, gaps.length === 0 ? READY_STATE : HOLD_STATE, gaps);
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

function rejectValidation(runtime) {
  if (runtime?.runtime_state !== REJECT_STATE) return null;
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid: false,
    gaps: ["boundary leakage rejected"]
  };
}

function collectShapeGaps(runtime) {
  const rejected = rejectValidation(runtime);
  if (rejected) return rejected.gaps;

  const record = asRecord(runtime);
  const gaps = [];
  gaps.push(...collectAllowedFieldsGaps(record, TOP_LEVEL_FIELDS, "runtime"));
  if (record.schema_version !== CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  if (![READY_STATE, HOLD_STATE].includes(record.runtime_state)) {
    gaps.push("runtime_state is invalid");
  }
  const ready = record.runtime_state === READY_STATE;
  if (record.source_bound !== ready) gaps.push(`source_bound must be ${ready}`);
  if (record.runtime_execution_class !== (ready ? RUNTIME_EXECUTION_CLASS : null)) {
    gaps.push(`runtime_execution_class must be ${ready ? RUNTIME_EXECUTION_CLASS : "null"}`);
  }
  if (record.runtime_version !== (ready ? RUNTIME_VERSION : null)) {
    gaps.push(`runtime_version must be ${ready ? RUNTIME_VERSION : "null"}`);
  }
  if (ready && record.allowed_next_step !== READY_NEXT_STEP) {
    gaps.push(`allowed_next_step must be ${READY_NEXT_STEP}`);
  }
  if (!ready && record.allowed_next_step !== HELD_NEXT_STEP) {
    gaps.push(`allowed_next_step must be ${HELD_NEXT_STEP}`);
  }

  gaps.push(...collectRefGaps(record.source_gate_ref, SOURCE_GATE_REF_FIELDS, "source_gate_ref"));

  const policy = asRecord(record.runtime_policy);
  gaps.push(...collectRefGaps(policy, RUNTIME_POLICY_FIELDS, "runtime_policy"));
  for (const [field, expected] of Object.entries({
    internal_only: true,
    runtime_only: true,
    aggregate_only_runtime: ready,
    internal_execution_performed: ready,
    posterior_output_review_gate_authorized: false,
    posterior_output_authorized: false,
    confidence_output_authorized: false,
    probability_output_authorized: false,
    finance_output_authorized: false,
    customer_output_authorized: false
  })) {
    if (policy[field] !== expected) gaps.push(`runtime_policy.${field} must be ${expected}`);
  }

  if (ready) {
    const equation = asRecord(record.model_equation);
    gaps.push(...collectRefGaps(equation, MODEL_EQUATION_FIELDS, "model_equation"));
    if (stableStringify(equation) !== stableStringify(buildModelEquation())) {
      gaps.push("model_equation must match governed Bayesian DiD equation");
    }

    const design = asRecord(record.aggregate_design_matrix);
    gaps.push(...collectRefGaps(design, AGGREGATE_DESIGN_MATRIX_FIELDS, "aggregate_design_matrix"));
    for (const [field, expected] of Object.entries({
      required_window_roles_present: true,
      required_comparison_roles_present: true,
      raw_row_count: 0,
      identifier_count: 0,
      query_text_present: false,
      missing_window_count: 0,
      suppressed_window_count: 0,
      held_window_count: 0
    })) {
      if (design[field] !== expected) gaps.push(`aggregate_design_matrix.${field} must be ${expected}`);
    }
    if (design.window_count !== 4) gaps.push("aggregate_design_matrix.window_count must be 4");
    if (typeof design.minimum_cohort_size !== "number" || design.minimum_cohort_size < 5) {
      gaps.push("aggregate_design_matrix.minimum_cohort_size must satisfy aggregate minimum");
    }

    const artifact = asRecord(record.internal_fit_artifact);
    gaps.push(...collectRefGaps(artifact, INTERNAL_FIT_ARTIFACT_FIELDS, "internal_fit_artifact"));
    for (const [field, expected] of Object.entries({
      artifact_state: "INTERNAL_POSTERIOR_CANDIDATE_HELD_FOR_OUTPUT_REVIEW",
      estimand_parameter: "delta_ai_post",
      prior_mean: PRIOR_MEAN,
      prior_sd: PRIOR_SD,
      convergence_diagnostics_present: false,
      posterior_predictive_checks_present: false,
      prior_sensitivity_present: false,
      residual_fit_checks_present: false,
      comparison_design_adequacy_review_present: false,
      calibration_evidence_present: false,
      interpretation_ready: false,
      probability_value_present: false,
      confidence_language_present: false,
      customer_output_present: false,
      posterior_output_review_required: true
    })) {
      if (artifact[field] !== expected) gaps.push(`internal_fit_artifact.${field} is invalid`);
    }
    const artifactWithoutHash = clone(artifact);
    delete artifactWithoutHash.artifact_hash;
    if (artifact.artifact_hash !== sha256Json(artifactWithoutHash)) {
      gaps.push("internal_fit_artifact.artifact_hash must match artifact body");
    }
  } else {
    if (record.model_equation !== null) gaps.push("model_equation must be null while held");
    if (record.aggregate_design_matrix !== null) {
      gaps.push("aggregate_design_matrix must be null while held");
    }
    if (record.internal_fit_artifact !== null) {
      gaps.push("internal_fit_artifact must be null while held");
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
      "receives_internal_bayesian_execution_gate_only",
      "receives_aggregate_measurement_cell_windows"
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
  if (summary.runtime_state !== record.runtime_state) {
    gaps.push("validation_summary.runtime_state must match runtime_state");
  }
  if (ready && asArray(summary.gaps).length !== 0) {
    gaps.push("validation_summary.gaps must be empty for ready runtime");
  }
  if (record.runtime_hash !== contributionAlignmentInternalBayesianExecutionRuntimeHash(record)) {
    gaps.push("runtime_hash must match runtime body");
  }
  gaps.push(...hasForbiddenContent(record));
  return sanitizeGaps(gaps);
}

function collectSourceBindingGaps(runtime, options = {}) {
  const gaps = [];
  const ready = runtime?.runtime_state === READY_STATE;
  const aggregateMeasurementCellWindows =
    options.aggregateMeasurementCellWindows ??
    options.aggregate_measurement_cell_windows;
  if (ready && !options.sourceGate) {
    gaps.push("sourceGate is required for ready internal Bayesian execution runtime validation");
  }
  if (ready && !Array.isArray(aggregateMeasurementCellWindows)) {
    gaps.push(
      "aggregateMeasurementCellWindows is required for ready internal Bayesian execution runtime validation"
    );
  }
  if (options.sourceGate) {
    const gateGaps = sourceGateGaps(options.sourceGate);
    if (gateGaps.length > 0) gaps.push(...gateGaps);
  }
  const expectedRuntime =
    options.sourceGate && Array.isArray(aggregateMeasurementCellWindows)
      ? buildContributionAlignmentInternalBayesianExecutionRuntimeFromObject({
          source_gate: options.sourceGate,
          aggregate_measurement_cell_windows: aggregateMeasurementCellWindows
        })
      : null;
  if (expectedRuntime) {
    const actualWithoutHash = clone(runtime);
    const expectedWithoutHash = clone(expectedRuntime);
    delete actualWithoutHash.runtime_hash;
    delete expectedWithoutHash.runtime_hash;
    if (stableStringify(actualWithoutHash) !== stableStringify(expectedWithoutHash)) {
      gaps.push("runtime binding mismatch against sourceGate");
    }
  }
  return sanitizeGaps(gaps);
}

export function validateContributionAlignmentInternalBayesianExecutionRuntime(runtime, options = {}) {
  if (runtime?.runtime_state === REJECT_STATE) {
    return rejectValidation(runtime);
  }
  const gaps = sanitizeGaps([
    ...collectShapeGaps(runtime),
    ...collectSourceBindingGaps(runtime, options)
  ]);
  return {
    schema_version: VALIDATION_SCHEMA_VERSION,
    valid: gaps.length === 0 && runtime?.runtime_state === READY_STATE,
    gaps
  };
}

function inputFromCliPath(path) {
  if (path === "-") return JSON.parse(readFileSync(0, "utf8"));
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function main() {
  const [, , inputPath, windowsPath, ...flags] = process.argv;
  if (!inputPath || !windowsPath) {
    console.error(
      "Usage: node scripts/run_ai_value_contribution_alignment_internal_bayesian_execution_runtime.mjs <internal-bayesian-execution-gate-json|- for stdin> <aggregate-windows-json> [--source-envelope]"
    );
    process.exit(1);
  }
  const sourceGate = inputFromCliPath(inputPath);
  const aggregateWindows = inputFromCliPath(windowsPath);
  const runtime = buildContributionAlignmentInternalBayesianExecutionRuntimeFromObject({
    source_gate: sourceGate,
    aggregate_measurement_cell_windows: aggregateWindows
  });
  if (flags.includes("--source-envelope")) {
    process.stdout.write(`${JSON.stringify({
      source_runtime: runtime,
      source_gate: sourceGate,
      aggregate_measurement_cell_windows: aggregateWindows
    }, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify(runtime, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
