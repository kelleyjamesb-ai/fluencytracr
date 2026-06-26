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

export const CONTRIBUTION_ALIGNMENT_COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEW_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEW_2026_06";

export const CONTRIBUTION_ALIGNMENT_COMPARISON_DESIGN_ADEQUACY_SOURCE_PACKAGE_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_COMPARISON_DESIGN_ADEQUACY_SOURCE_PACKAGE_2026_06";

const VALIDATION_SCHEMA_VERSION =
  `${CONTRIBUTION_ALIGNMENT_COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEW_SCHEMA_VERSION}_VALIDATION`;

const DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_2026_06";
const REVIEWED_SOURCE_EVIDENCE_HASH_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_COMPARISON_DESIGN_REVIEWED_SOURCE_EVIDENCE_HASH_2026_06";

const DERIVATION_VERSION =
  "ai_value_contribution_alignment_comparison_design_adequacy_evidence_review_2026_06";

const READY_STATE =
  "COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEWED_FOR_GOVERNED_SOURCE_BINDING";
const HOLD_STATE = "HOLD_FOR_COMPARISON_DESIGN_ADEQUACY_EVIDENCE";
const REJECT_STATE = "REJECTED_FOR_BOUNDARY_LEAKAGE";

const SOURCE_PACKAGE_READY_STATE =
  "COMPARISON_DESIGN_ADEQUACY_SOURCE_PACKAGE_REVIEWED_INTERNAL_ONLY";
const REVIEW_CLASS = "comparison_design_adequacy_evidence_review_only";
const REVIEW_VERSION = "comparison_design_adequacy_evidence_review_2026_06";
const HELD_NEXT_STEP = "complete_governed_diagnostics_sufficiency_evidence_source";
const EXPECTED_REVIEWED_SOURCE_EVIDENCE_REF =
  "internal_diagnostics_sufficiency_evidence.comparison_design_adequacy.2026_06";
const REQUIRED_RUNTIME_STATE =
  "INTERNAL_BAYESIAN_FIXTURE_EXECUTION_PROTOTYPE_HELD_FOR_REVIEW";
const REQUIRED_RUNTIME_CLASS = "internal_fixture_prototype_only";

const ALLOWED_INPUT_FIELDS = new Set([
  "source_runtime",
  "comparison_design_source_evidence",
  "generated_at"
]);

const SOURCE_PACKAGE_FIELDS = new Set([
  "schema_version",
  "source_package_id",
  "package_state",
  "internal_only",
  "aggregate_only",
  "reviewed_source_evidence_ref",
  "source_runtime_ref",
  "treatment_definition",
  "comparison_definition",
  "pre_post_window_definition",
  "rollout_or_comparison_design_type",
  "aggregate_measurement_cell_grain",
  "metric_direction_lag_expectation_path_cohort_workflow_function_identity_matched",
  "suppression_missing_held_window_review",
  "unsupported_cross_slice_aggregation_present",
  "person_level_or_identifiable_fields_present",
  "causality_claim_authorized",
  "reviewer_role",
  "review_decision",
  "placeholder_evidence",
  "generated_fixture_evidence",
  "source_package_hash"
]);

const SOURCE_RUNTIME_REF_FIELDS = [
  "runtime_hash",
  "fixture_artifact_hash"
];

const DEFINITION_FIELDS = [
  "defined",
  "aggregate_measurement_cell_grain",
  "measurement_cell_role"
];

const PRE_POST_FIELDS = [
  "defined",
  "pre_window_defined",
  "post_window_defined",
  "window_alignment"
];

const SUPPRESSION_REVIEW_FIELDS = [
  "missing_window_count_zero",
  "suppressed_window_count_zero",
  "held_window_count_zero",
  "suppressed_missing_held_windows_clear"
];

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "review_id",
  "review_state",
  "review_class",
  "generated_at",
  "derivation_version",
  "source_bound",
  "source_runtime_ref",
  "source_package_ref",
  "evidence_dimension",
  "review_version",
  "review_policy",
  "comparison_design_review",
  "evidence_satisfaction",
  "promotion_boundary",
  "allowed_next_step",
  "blocked_uses",
  "required_caveats",
  "feeds",
  "boundary_policy",
  "validation_summary",
  "review_hash"
]);

const REVIEW_POLICY_FIELDS = [
  "internal_only",
  "aggregate_only",
  "review_only",
  "evidence_source_binding_authorized",
  "promotion_authorized",
  "posterior_interpretation_authorized",
  "posterior_output_authorized",
  "confidence_output_authorized",
  "probability_output_authorized",
  "customer_output_authorized",
  "economic_output_authorized",
  "roi_output_authorized",
  "productivity_output_authorized",
  "causality_output_authorized",
  "finance_output_authorized"
];

const COMPARISON_REVIEW_FIELDS = [
  "treatment_definition_present",
  "comparison_definition_present",
  "pre_post_window_definition_present",
  "rollout_or_comparison_design_type_present",
  "aggregate_measurement_cell_grain",
  "same_metric_direction_lag_expectation_path_cohort_workflow_function_identity",
  "suppression_missing_held_window_review_present",
  "suppressed_missing_held_windows_clear",
  "no_unsupported_cross_slice_aggregation",
  "no_person_level_or_identifiable_fields",
  "causality_claim_authorized",
  "reviewer_role",
  "review_decision"
];

const EVIDENCE_SATISFACTION_FIELDS = [
  "evidence_dimension",
  "reviewed_source_evidence_ref",
  "reviewed_source_evidence_hash",
  "source_evidence_hash",
  "aggregate_only_scope",
  "suppressed_missing_held_windows_clear",
  "eligible_for_satisfied_representation",
  "placeholder_evidence",
  "generated_fixture_evidence",
  "evidence_satisfied",
  "missing_evidence"
];

const PROMOTION_BOUNDARY_FIELDS = [
  "promotion_authorized",
  "promotion_blocked",
  "posterior_interpretation_authorized",
  "confidence_probability_authorized",
  "customer_economic_output_authorized",
  "internal_bayesian_execution_artifact_v1_authorized"
];

const FEED_FIELDS = [
  "governed_diagnostics_sufficiency_evidence_source",
  "diagnostics_evidence_packet",
  "bayesian_promotion_decision_gate",
  "internal_bayesian_execution_artifact_v1",
  "posterior_interpretation",
  "posterior_output",
  "confidence_output",
  "probability_output",
  "customer_facing_output",
  "economic_output",
  "roi_output",
  "finance_output",
  "causality_output",
  "productivity_output",
  "route_creation",
  "ui_creation",
  "schema_creation",
  "persistence_write",
  "export_creation",
  "live_connector_execution"
];

const BOUNDARY_POLICY_FIELDS = [
  "receives_internal_bayesian_fixture_runtime_only",
  "receives_comparison_design_source_package",
  "receives_raw_rows",
  "receives_query_text",
  "receives_identifiers",
  "receives_prompts",
  "receives_transcripts",
  "receives_person_level_data",
  "runs_live_connectors",
  "persists_review",
  "creates_routes",
  "creates_ui",
  "creates_schemas",
  "creates_exports",
  "emits_posterior_output",
  "emits_confidence_output",
  "emits_probability",
  "emits_customer_facing_output",
  "emits_economic_output",
  "computes_roi",
  "claims_causality",
  "measures_productivity"
];

const REQUIRED_BLOCKED_USES = [
  "promotion_authorization",
  "posterior_interpretation",
  "posterior_output",
  "confidence_output",
  "probability_output",
  "customer_facing_output",
  "economic_output",
  "finance_output",
  "roi",
  "causality_claim",
  "productivity_measurement",
  "route_creation",
  "ui_creation",
  "schema_creation",
  "persistence_write",
  "export_creation",
  "live_connector_execution",
  "raw_rows",
  "query_text",
  "identifiers",
  "prompts",
  "transcripts",
  "person_level_data"
];

const REQUIRED_CAVEATS = [
  "Comparison Design Adequacy Evidence Review is internal-only and aggregate-only.",
  "The review may represent only comparison-design adequacy evidence and cannot complete the full governed diagnostics sufficiency evidence source.",
  "Default output is held unless explicit governed reviewed comparison-design source evidence is supplied.",
  "The review does not authorize promotion, posterior interpretation, confidence output, probability output, customer-facing output, economic output, live connectors, routes, UI, schemas, exports, or persistence."
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
  /connector/i
];

const FORBIDDEN_VALUE_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\bselect\b[\s\S]+\bfrom\b/i,
  /\bsql\b/i,
  /confidence/i,
  /probability/i,
  /score(?:_like)?/i,
  /placeholder/i,
  /generated[_\s-]?fixture/i,
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
  /customer[-_\s]?facing/i,
  /\broi\b/i,
  /finance[_-\s]?(?:output|claim|result|ready)/i,
  /financial[_-\s]?(?:output|attribution)/i,
  /causal(?:ity)?/i,
  /\bcaused\b/i,
  /\bproductivity\b/i
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

function falseMap(keys) {
  return Object.fromEntries(keys.map((key) => [key, false]));
}

function sanitizeGaps(gaps) {
  return [...new Set(gaps.filter(Boolean))].sort();
}

function safeHash(value) {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value) ? value : null;
}

function sourceRuntimeFromInput(input) {
  const record = asRecord(input);
  return record.source_runtime ?? input;
}

function comparisonSourceEvidenceFromInput(input) {
  return asRecord(input).comparison_design_source_evidence ?? null;
}

function inputBoundaryGaps(input) {
  const record = asRecord(input);
  if (!Object.prototype.hasOwnProperty.call(record, "source_runtime")) return [];
  const sidecar = Object.fromEntries(
    Object.entries(record).filter(([key]) => !ALLOWED_INPUT_FIELDS.has(key))
  );
  return Object.keys(sidecar).length > 0
    ? ["input wrapper rejected unsafe or unsupported content"]
    : [];
}

function collectAllowedFieldsGaps(record, fields, label) {
  return Object.keys(asRecord(record))
    .filter((key) => !fields.has(key))
    .map(() => `${label} contains ungoverned field`);
}

function collectRequiredFieldsGaps(record, fields, label) {
  const ref = asRecord(record);
  const gaps = [];
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(ref, field)) gaps.push(`${label}.${field} is required`);
  }
  gaps.push(...collectAllowedFieldsGaps(ref, new Set(fields), label));
  return gaps;
}

function sourcePackageHashBody(sourcePackage) {
  const withoutHash = clone(sourcePackage);
  delete withoutHash.source_package_hash;
  return withoutHash;
}

export function contributionAlignmentComparisonDesignAdequacySourcePackageHash(sourcePackage) {
  return sha256Json(sourcePackageHashBody(sourcePackage));
}

function reviewedSourceEvidenceHash(sourcePackage) {
  return sha256Json({
    schema_version: REVIEWED_SOURCE_EVIDENCE_HASH_SCHEMA_VERSION,
    evidence_dimension: "comparison_design_adequacy",
    reviewed_source_evidence_ref: EXPECTED_REVIEWED_SOURCE_EVIDENCE_REF,
    source_package_hash: contributionAlignmentComparisonDesignAdequacySourcePackageHash(sourcePackage),
    aggregate_only_scope: true,
    review_decision: "APPROVED_FOR_GOVERNED_DIAGNOSTICS_SOURCE_BINDING"
  });
}

function sourceEvidenceHash(sourceRuntime, sourcePackage) {
  return sha256Json({
    schema_version: DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SCHEMA_VERSION,
    evidence_dimension: "comparison_design_adequacy",
    source_evidence_ref: EXPECTED_REVIEWED_SOURCE_EVIDENCE_REF,
    reviewed_source_evidence_hash: reviewedSourceEvidenceHash(sourcePackage),
    source_runtime_hash: sourceRuntime?.runtime_hash ?? null,
    source_fixture_artifact_hash: sourceRuntime?.internal_fit_artifact?.artifact_hash ?? null,
    internal_only: true,
    aggregate_only: true,
    evidence_satisfied: true
  });
}

function reviewHash(review) {
  const withoutHash = clone(review);
  delete withoutHash.review_hash;
  return sha256Json(withoutHash);
}

export function contributionAlignmentComparisonDesignAdequacyEvidenceReviewHash(review) {
  return reviewHash(review);
}

function sourceRuntimeRef(sourceRuntime) {
  const runtime = asRecord(sourceRuntime);
  const artifact = asRecord(runtime.internal_fit_artifact);
  return {
    schema_version:
      runtime.schema_version === CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_SCHEMA_VERSION
        ? runtime.schema_version
        : null,
    runtime_id: typeof runtime.runtime_id === "string" ? runtime.runtime_id : null,
    runtime_state: runtime.runtime_state === REQUIRED_RUNTIME_STATE ? REQUIRED_RUNTIME_STATE : null,
    runtime_execution_class:
      runtime.runtime_execution_class === REQUIRED_RUNTIME_CLASS ? REQUIRED_RUNTIME_CLASS : null,
    runtime_hash: safeHash(runtime.runtime_hash),
    fixture_artifact_hash: safeHash(artifact.artifact_hash)
  };
}

function sourceRuntimeGaps(sourceRuntime) {
  const runtime = asRecord(sourceRuntime);
  const design = asRecord(runtime.aggregate_design_matrix);
  const artifact = asRecord(runtime.internal_fit_artifact);
  const gaps = [];
  const validation = validateContributionAlignmentInternalBayesianExecutionRuntime(runtime, {
    allowSelfContainedSourceValidation: true
  });
  if (validation.valid !== true) {
    gaps.push("source_runtime failed internal Bayesian execution runtime validation");
    gaps.push(...validation.gaps.map((gap) => `source_runtime.${gap}`));
  }
  if (runtime.schema_version !== CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_SCHEMA_VERSION) {
    gaps.push("source_runtime.schema_version is invalid");
  }
  if (runtime.runtime_state !== REQUIRED_RUNTIME_STATE) {
    gaps.push("source_runtime.runtime_state is not contained fixture prototype");
  }
  if (runtime.runtime_execution_class !== REQUIRED_RUNTIME_CLASS) {
    gaps.push("source_runtime.runtime_execution_class is not fixture prototype only");
  }
  if (runtime.runtime_hash !== contributionAlignmentInternalBayesianExecutionRuntimeHash(runtime)) {
    gaps.push("source_runtime hash drifted");
  }
  if (design.missing_window_count !== 0) gaps.push("source_runtime missing windows must be zero");
  if (design.suppressed_window_count !== 0) gaps.push("source_runtime suppressed windows must be zero");
  if (design.held_window_count !== 0) gaps.push("source_runtime held windows must be zero");
  if (design.raw_row_count !== 0) gaps.push("source_runtime raw row count must be zero");
  if (design.identifier_count !== 0) gaps.push("source_runtime identifier count must be zero");
  if (design.query_text_present !== false) gaps.push("source_runtime query text must be absent");
  if (!safeHash(artifact.artifact_hash)) {
    gaps.push("source_runtime fixture artifact hash is required");
  }
  return sanitizeGaps(gaps);
}

function sourcePackageContentGaps(value, path = "comparison_design_source_evidence") {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => sourcePackageContentGaps(item, `${path}[${index}]`));
  }
  if (value && typeof value === "object") {
    const gaps = [];
    for (const [key, nested] of Object.entries(value)) {
      const keyAllowed =
        (path === "comparison_design_source_evidence" && SOURCE_PACKAGE_FIELDS.has(key)) ||
        (path.endsWith(".source_runtime_ref") && SOURCE_RUNTIME_REF_FIELDS.includes(key)) ||
        (path.endsWith(".treatment_definition") && DEFINITION_FIELDS.includes(key)) ||
        (path.endsWith(".comparison_definition") && DEFINITION_FIELDS.includes(key)) ||
        (path.endsWith(".pre_post_window_definition") && PRE_POST_FIELDS.includes(key)) ||
        (path.endsWith(".suppression_missing_held_window_review") &&
          SUPPRESSION_REVIEW_FIELDS.includes(key));
      if (!keyAllowed && FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
        gaps.push("comparison design source evidence contains forbidden field name");
        continue;
      }
      gaps.push(...sourcePackageContentGaps(nested, `${path}.${key}`));
    }
    return gaps;
  }
  if (typeof value !== "string") return [];
  return FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
    ? ["comparison design source evidence contains unsafe source or output content"]
    : [];
}

function definitionGaps(definition, role) {
  const record = asRecord(definition);
  const gaps = collectRequiredFieldsGaps(
    record,
    DEFINITION_FIELDS,
    `${role}_definition`
  );
  if (record.defined !== true) gaps.push(`${role}_definition.defined must be true`);
  if (record.aggregate_measurement_cell_grain !== true) {
    gaps.push(`${role}_definition.aggregate_measurement_cell_grain must be true`);
  }
  if (record.measurement_cell_role !== role) {
    gaps.push(`${role}_definition.measurement_cell_role must be ${role}`);
  }
  return gaps;
}

function prePostWindowGaps(prePost) {
  const record = asRecord(prePost);
  const gaps = collectRequiredFieldsGaps(
    record,
    PRE_POST_FIELDS,
    "pre_post_window_definition"
  );
  if (record.defined !== true) gaps.push("pre_post_window_definition.defined must be true");
  if (record.pre_window_defined !== true) {
    gaps.push("pre_post_window_definition.pre_window_defined must be true");
  }
  if (record.post_window_defined !== true) {
    gaps.push("pre_post_window_definition.post_window_defined must be true");
  }
  if (
    record.window_alignment !==
    "same_metric_direction_lag_expectation_path_cohort_workflow_function_identity"
  ) {
    gaps.push("pre_post_window_definition.window_alignment is invalid");
  }
  return gaps;
}

function suppressionReviewGaps(review) {
  const record = asRecord(review);
  const gaps = collectRequiredFieldsGaps(
    record,
    SUPPRESSION_REVIEW_FIELDS,
    "suppression_missing_held_window_review"
  );
  for (const field of SUPPRESSION_REVIEW_FIELDS) {
    if (record[field] !== true) gaps.push(`suppression_missing_held_window_review.${field} must be true`);
  }
  return gaps;
}

function sourcePackageGaps(sourceRuntime, sourcePackage) {
  if (!sourcePackage) return ["comparison design source evidence is required"];
  const record = asRecord(sourcePackage);
  const runtimeRef = asRecord(record.source_runtime_ref);
  const gaps = [
    ...collectAllowedFieldsGaps(record, SOURCE_PACKAGE_FIELDS, "comparison_design_source_evidence"),
    ...collectRequiredFieldsGaps(
      runtimeRef,
      SOURCE_RUNTIME_REF_FIELDS,
      "comparison_design_source_evidence.source_runtime_ref"
    )
  ];
  if (record.schema_version !== CONTRIBUTION_ALIGNMENT_COMPARISON_DESIGN_ADEQUACY_SOURCE_PACKAGE_SCHEMA_VERSION) {
    gaps.push("comparison design source evidence schema_version is invalid");
  }
  if (record.package_state !== SOURCE_PACKAGE_READY_STATE) {
    gaps.push("comparison design source evidence package_state is invalid");
  }
  if (record.internal_only !== true) gaps.push("comparison design source evidence must be internal-only");
  if (record.aggregate_only !== true) gaps.push("comparison design source evidence must be aggregate-only");
  if (record.reviewed_source_evidence_ref !== EXPECTED_REVIEWED_SOURCE_EVIDENCE_REF) {
    gaps.push(`reviewed_source_evidence_ref must be ${EXPECTED_REVIEWED_SOURCE_EVIDENCE_REF}`);
  }
  if (runtimeRef.runtime_hash !== sourceRuntime?.runtime_hash) {
    gaps.push("comparison design source evidence runtime hash must match source runtime");
  }
  if (runtimeRef.fixture_artifact_hash !== sourceRuntime?.internal_fit_artifact?.artifact_hash) {
    gaps.push("comparison design source evidence fixture artifact hash must match source runtime");
  }
  gaps.push(...definitionGaps(record.treatment_definition, "treatment"));
  gaps.push(...definitionGaps(record.comparison_definition, "comparison"));
  gaps.push(...prePostWindowGaps(record.pre_post_window_definition));
  if (
    !["governed_comparison_group", "staggered_rollout_comparison"].includes(
      record.rollout_or_comparison_design_type
    )
  ) {
    gaps.push("rollout_or_comparison_design_type is invalid");
  }
  if (record.aggregate_measurement_cell_grain !== true) {
    gaps.push("aggregate_measurement_cell_grain must be true");
  }
  if (
    record.metric_direction_lag_expectation_path_cohort_workflow_function_identity_matched !== true
  ) {
    gaps.push("metric, direction, lag, expectation path, cohort, workflow/function identity must match");
  }
  gaps.push(...suppressionReviewGaps(record.suppression_missing_held_window_review));
  if (record.unsupported_cross_slice_aggregation_present !== false) {
    gaps.push("unsupported cross-slice aggregation must be absent");
  }
  if (record.person_level_or_identifiable_fields_present !== false) {
    gaps.push("person-level or identifiable fields must be absent");
  }
  if (record.causality_claim_authorized !== false) {
    gaps.push("causality claim must not be authorized");
  }
  if (record.reviewer_role !== "data_science_reviewer+governance_reviewer") {
    gaps.push("reviewer_role must be data_science_reviewer+governance_reviewer");
  }
  if (record.review_decision !== "APPROVED_FOR_GOVERNED_DIAGNOSTICS_SOURCE_BINDING") {
    gaps.push("review_decision must approve only governed source binding");
  }
  if (record.placeholder_evidence !== false) gaps.push("placeholder_evidence must be false");
  if (record.generated_fixture_evidence !== false) {
    gaps.push("generated_fixture_evidence must be false");
  }
  if (record.source_package_hash !== contributionAlignmentComparisonDesignAdequacySourcePackageHash(record)) {
    gaps.push("comparison design source package hash is invalid");
  }
  gaps.push(...sourcePackageContentGaps(sourcePackage));
  return sanitizeGaps(gaps);
}

function sourcePackageRef(sourcePackage, ready) {
  const record = asRecord(sourcePackage);
  return {
    schema_version:
      record.schema_version === CONTRIBUTION_ALIGNMENT_COMPARISON_DESIGN_ADEQUACY_SOURCE_PACKAGE_SCHEMA_VERSION
        ? record.schema_version
        : null,
    source_package_id: typeof record.source_package_id === "string" ? record.source_package_id : null,
    package_state: record.package_state === SOURCE_PACKAGE_READY_STATE ? record.package_state : null,
    source_package_hash: ready ? safeHash(record.source_package_hash) : null
  };
}

function missingEvidence(sourceRuntime, sourcePackage) {
  if (!sourcePackage) {
    return [
      "reviewed comparison-design adequacy source package",
      "treatment definition",
      "comparison definition",
      "pre/post window definition",
      "rollout or comparison design type",
      "aggregate Measurement Cell grain",
      "same metric, direction, lag, expectation path, cohort, workflow/function identity",
      "suppression/missing/held window review",
      "reviewer role",
      "review decision"
    ];
  }
  return sourcePackageGaps(sourceRuntime, sourcePackage);
}

function buildComparisonReview(sourcePackage, ready) {
  const record = asRecord(sourcePackage);
  const suppression = asRecord(record.suppression_missing_held_window_review);
  return {
    treatment_definition_present: ready,
    comparison_definition_present: ready,
    pre_post_window_definition_present: ready,
    rollout_or_comparison_design_type_present: ready,
    aggregate_measurement_cell_grain: ready,
    same_metric_direction_lag_expectation_path_cohort_workflow_function_identity: ready,
    suppression_missing_held_window_review_present: ready,
    suppressed_missing_held_windows_clear: ready && suppression.suppressed_missing_held_windows_clear === true,
    no_unsupported_cross_slice_aggregation: ready,
    no_person_level_or_identifiable_fields: ready,
    causality_claim_authorized: false,
    reviewer_role: ready ? record.reviewer_role : null,
    review_decision: ready
      ? "APPROVED_FOR_GOVERNED_DIAGNOSTICS_SOURCE_BINDING"
      : "HOLD_FOR_GOVERNED_COMPARISON_DESIGN_EVIDENCE"
  };
}

function buildEvidenceSatisfaction(sourceRuntime, sourcePackage, ready, missing) {
  const reviewedHash = ready ? reviewedSourceEvidenceHash(sourcePackage) : null;
  return {
    evidence_dimension: "comparison_design_adequacy",
    reviewed_source_evidence_ref: ready ? EXPECTED_REVIEWED_SOURCE_EVIDENCE_REF : null,
    reviewed_source_evidence_hash: reviewedHash,
    source_evidence_hash: ready ? sourceEvidenceHash(sourceRuntime, sourcePackage) : null,
    aggregate_only_scope: ready,
    suppressed_missing_held_windows_clear: ready,
    eligible_for_satisfied_representation: ready,
    placeholder_evidence: false,
    generated_fixture_evidence: false,
    evidence_satisfied: ready,
    missing_evidence: ready ? [] : missing
  };
}

function buildReview(sourceRuntime, sourcePackage, state, gaps) {
  const ready = state === READY_STATE;
  const missing = missingEvidence(sourceRuntime, sourcePackage);
  const review = {
    schema_version: CONTRIBUTION_ALIGNMENT_COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEW_SCHEMA_VERSION,
    review_id: `contribution_alignment_comparison_design_adequacy_evidence_review_${sha256Json({
      runtime_hash: sourceRuntime?.runtime_hash ?? null,
      fixture_artifact_hash: sourceRuntime?.internal_fit_artifact?.artifact_hash ?? null,
      source_package_hash: sourcePackage?.source_package_hash ?? null,
      review_version: REVIEW_VERSION
    }).slice(0, 16)}`,
    review_state: state,
    review_class: REVIEW_CLASS,
    generated_at: "2026-06-26T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: sourceRuntimeGaps(sourceRuntime).length === 0,
    source_runtime_ref: sourceRuntimeRef(sourceRuntime),
    source_package_ref: sourcePackageRef(sourcePackage, ready),
    evidence_dimension: "comparison_design_adequacy",
    review_version: REVIEW_VERSION,
    review_policy: {
      internal_only: true,
      aggregate_only: sourceRuntimeGaps(sourceRuntime).length === 0,
      review_only: true,
      evidence_source_binding_authorized: ready,
      promotion_authorized: false,
      posterior_interpretation_authorized: false,
      posterior_output_authorized: false,
      confidence_output_authorized: false,
      probability_output_authorized: false,
      customer_output_authorized: false,
      economic_output_authorized: false,
      roi_output_authorized: false,
      productivity_output_authorized: false,
      causality_output_authorized: false,
      finance_output_authorized: false
    },
    comparison_design_review: buildComparisonReview(sourcePackage, ready),
    evidence_satisfaction: buildEvidenceSatisfaction(sourceRuntime, sourcePackage, ready, missing),
    promotion_boundary: {
      promotion_authorized: false,
      promotion_blocked: true,
      posterior_interpretation_authorized: false,
      confidence_probability_authorized: false,
      customer_economic_output_authorized: false,
      internal_bayesian_execution_artifact_v1_authorized: false
    },
    allowed_next_step: HELD_NEXT_STEP,
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    feeds: falseMap(FEED_FIELDS),
    boundary_policy: {
      receives_internal_bayesian_fixture_runtime_only: state !== REJECT_STATE,
      receives_comparison_design_source_package: ready,
      ...falseMap(
        BOUNDARY_POLICY_FIELDS.filter((field) =>
          ![
            "receives_internal_bayesian_fixture_runtime_only",
            "receives_comparison_design_source_package"
          ].includes(field)
        )
      )
    },
    validation_summary: {
      schema_version:
        `${CONTRIBUTION_ALIGNMENT_COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEW_SCHEMA_VERSION}_SUMMARY`,
      valid: ready,
      review_state: state,
      gaps: ready ? [] : sanitizeGaps(gaps)
    }
  };
  review.review_hash = reviewHash(review);
  return review;
}

function rejectedReview() {
  const review = {
    schema_version: CONTRIBUTION_ALIGNMENT_COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEW_SCHEMA_VERSION,
    review_id: null,
    review_state: REJECT_STATE,
    review_class: REVIEW_CLASS,
    generated_at: "2026-06-26T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: false,
    promotion_boundary: {
      promotion_authorized: false,
      promotion_blocked: true,
      posterior_interpretation_authorized: false,
      confidence_probability_authorized: false,
      customer_economic_output_authorized: false,
      internal_bayesian_execution_artifact_v1_authorized: false
    },
    validation_summary: {
      schema_version:
        `${CONTRIBUTION_ALIGNMENT_COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEW_SCHEMA_VERSION}_SUMMARY`,
      valid: false,
      review_state: REJECT_STATE,
      gaps: ["boundary leakage rejected"]
    }
  };
  review.review_hash = reviewHash(review);
  return review;
}

export function buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject(input) {
  if (inputBoundaryGaps(input).length > 0) return rejectedReview();
  const sourceRuntime = sourceRuntimeFromInput(input);
  const sourcePackage = comparisonSourceEvidenceFromInput(input);
  if (sourcePackageContentGaps(sourcePackage).length > 0) return rejectedReview();
  const runtimeGaps = sourceRuntimeGaps(sourceRuntime);
  const packageGaps = sourcePackageGaps(sourceRuntime, sourcePackage);
  const gaps = sanitizeGaps([...runtimeGaps, ...packageGaps]);
  const state = gaps.length === 0 ? READY_STATE : HOLD_STATE;
  return buildReview(sourceRuntime, sourcePackage, state, gaps);
}

function hasForbiddenContent(value, path = "review") {
  if (Array.isArray(value)) {
    if (
      path === "review.blocked_uses" ||
      path === "review.required_caveats" ||
      path === "review.validation_summary.gaps" ||
      path === "review.evidence_satisfaction.missing_evidence"
    ) {
      return [];
    }
    return value.flatMap((item, index) => hasForbiddenContent(item, `${path}[${index}]`));
  }
  if (value && typeof value === "object") {
    const gaps = [];
    for (const [key, nested] of Object.entries(value)) {
      const safeField =
        (path === "review.review_policy" && REVIEW_POLICY_FIELDS.includes(key)) ||
        (path === "review.comparison_design_review" && COMPARISON_REVIEW_FIELDS.includes(key)) ||
        (path === "review.evidence_satisfaction" && EVIDENCE_SATISFACTION_FIELDS.includes(key)) ||
        (path === "review.promotion_boundary" && PROMOTION_BOUNDARY_FIELDS.includes(key)) ||
        (path === "review.feeds" && FEED_FIELDS.includes(key)) ||
        (path === "review.boundary_policy" && BOUNDARY_POLICY_FIELDS.includes(key));
      if (!safeField && FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
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
    path.startsWith("review.required_caveats[") ||
    path.startsWith("review.validation_summary.gaps[") ||
    path.startsWith("review.evidence_satisfaction.missing_evidence[") ||
    path === "review.comparison_design_review.review_decision"
  ) {
    return [];
  }
  return FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))
    ? [`${path} contains unsafe source or output language`]
    : [];
}

function validateShape(review) {
  if (review?.review_state === REJECT_STATE) return ["boundary leakage rejected"];
  const record = asRecord(review);
  const ready = record.review_state === READY_STATE;
  const gaps = [];
  gaps.push(...collectAllowedFieldsGaps(record, TOP_LEVEL_FIELDS, "review"));
  if (record.schema_version !== CONTRIBUTION_ALIGNMENT_COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEW_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  if (![READY_STATE, HOLD_STATE].includes(record.review_state)) {
    gaps.push("review_state is invalid");
  }
  if (record.review_class !== REVIEW_CLASS) gaps.push("review_class is invalid");
  if (record.evidence_dimension !== "comparison_design_adequacy") {
    gaps.push("evidence_dimension must be comparison_design_adequacy");
  }
  if (record.review_version !== REVIEW_VERSION) gaps.push("review_version is invalid");
  if (record.allowed_next_step !== HELD_NEXT_STEP) {
    gaps.push(`allowed_next_step must be ${HELD_NEXT_STEP}`);
  }
  const policy = asRecord(record.review_policy);
  gaps.push(...collectRequiredFieldsGaps(policy, REVIEW_POLICY_FIELDS, "review_policy"));
  for (const [field, expected] of Object.entries({
    internal_only: true,
    review_only: true,
    evidence_source_binding_authorized: ready,
    promotion_authorized: false,
    posterior_interpretation_authorized: false,
    posterior_output_authorized: false,
    confidence_output_authorized: false,
    probability_output_authorized: false,
    customer_output_authorized: false,
    economic_output_authorized: false,
    roi_output_authorized: false,
    productivity_output_authorized: false,
    causality_output_authorized: false,
    finance_output_authorized: false
  })) {
    if (policy[field] !== expected) gaps.push(`review_policy.${field} must be ${expected}`);
  }
  const comparison = asRecord(record.comparison_design_review);
  gaps.push(...collectRequiredFieldsGaps(
    comparison,
    COMPARISON_REVIEW_FIELDS,
    "comparison_design_review"
  ));
  for (const field of [
    "treatment_definition_present",
    "comparison_definition_present",
    "pre_post_window_definition_present",
    "rollout_or_comparison_design_type_present",
    "aggregate_measurement_cell_grain",
    "same_metric_direction_lag_expectation_path_cohort_workflow_function_identity",
    "suppression_missing_held_window_review_present",
    "suppressed_missing_held_windows_clear",
    "no_unsupported_cross_slice_aggregation",
    "no_person_level_or_identifiable_fields"
  ]) {
    if (comparison[field] !== ready) gaps.push(`comparison_design_review.${field} must be ${ready}`);
  }
  if (comparison.causality_claim_authorized !== false) {
    gaps.push("comparison_design_review.causality_claim_authorized must be false");
  }
  const evidence = asRecord(record.evidence_satisfaction);
  gaps.push(...collectRequiredFieldsGaps(evidence, EVIDENCE_SATISFACTION_FIELDS, "evidence_satisfaction"));
  for (const [field, expected] of Object.entries({
    evidence_dimension: "comparison_design_adequacy",
    reviewed_source_evidence_ref: ready ? EXPECTED_REVIEWED_SOURCE_EVIDENCE_REF : null,
    aggregate_only_scope: ready,
    suppressed_missing_held_windows_clear: ready,
    eligible_for_satisfied_representation: ready,
    placeholder_evidence: false,
    generated_fixture_evidence: false,
    evidence_satisfied: ready
  })) {
    if (evidence[field] !== expected) gaps.push(`evidence_satisfaction.${field} must be ${expected}`);
  }
  if (ready && safeHash(evidence.reviewed_source_evidence_hash) === null) {
    gaps.push("evidence_satisfaction.reviewed_source_evidence_hash is required");
  }
  if (ready && safeHash(evidence.source_evidence_hash) === null) {
    gaps.push("evidence_satisfaction.source_evidence_hash is required");
  }
  if (!ready && evidence.reviewed_source_evidence_hash !== null) {
    gaps.push("evidence_satisfaction.reviewed_source_evidence_hash must be null when held");
  }
  if (!ready && evidence.source_evidence_hash !== null) {
    gaps.push("evidence_satisfaction.source_evidence_hash must be null when held");
  }
  if (!Array.isArray(evidence.missing_evidence)) {
    gaps.push("evidence_satisfaction.missing_evidence must be an array");
  }
  if (ready && evidence.missing_evidence.length !== 0) {
    gaps.push("evidence_satisfaction.missing_evidence must be empty when ready");
  }
  const promotion = asRecord(record.promotion_boundary);
  gaps.push(...collectRequiredFieldsGaps(promotion, PROMOTION_BOUNDARY_FIELDS, "promotion_boundary"));
  for (const [field, expected] of Object.entries({
    promotion_authorized: false,
    promotion_blocked: true,
    posterior_interpretation_authorized: false,
    confidence_probability_authorized: false,
    customer_economic_output_authorized: false,
    internal_bayesian_execution_artifact_v1_authorized: false
  })) {
    if (promotion[field] !== expected) gaps.push(`promotion_boundary.${field} must be ${expected}`);
  }
  const feeds = asRecord(record.feeds);
  for (const field of FEED_FIELDS) {
    if (feeds[field] !== false) gaps.push(`feeds.${field} must be false`);
  }
  const boundary = asRecord(record.boundary_policy);
  for (const field of BOUNDARY_POLICY_FIELDS) {
    const expected =
      field === "receives_internal_bayesian_fixture_runtime_only" ||
      (field === "receives_comparison_design_source_package" && ready);
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
  if (ready && Array.isArray(summary.gaps) && summary.gaps.length !== 0) {
    gaps.push("validation_summary.gaps must be empty when ready");
  }
  if (record.review_hash !== reviewHash(record)) {
    gaps.push("review_hash must match review body");
  }
  gaps.push(...hasForbiddenContent(record));
  return sanitizeGaps(gaps);
}

function validateAgainstSources(review, options = {}) {
  const gaps = [];
  if (review?.review_state === READY_STATE && !options.sourceRuntime) {
    gaps.push("sourceRuntime is required for ready comparison-design evidence review validation");
  }
  if (review?.review_state === READY_STATE && !options.comparisonDesignSourceEvidence) {
    gaps.push("comparisonDesignSourceEvidence is required for ready comparison-design evidence review validation");
  }
  if (options.sourceRuntime) {
    gaps.push(...sourceRuntimeGaps(options.sourceRuntime));
    const actualRuntimeRef = asRecord(review.source_runtime_ref);
    const expectedRuntimeRef = sourceRuntimeRef(options.sourceRuntime);
    for (const [field, expected] of Object.entries(expectedRuntimeRef)) {
      if (actualRuntimeRef[field] !== expected) {
        gaps.push(`source_runtime_ref.${field} does not match sourceRuntime`);
      }
    }
  }
  if (options.comparisonDesignSourceEvidence) {
    gaps.push(...sourcePackageGaps(
      options.sourceRuntime,
      options.comparisonDesignSourceEvidence
    ));
    const expected = buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject({
      source_runtime: options.sourceRuntime,
      comparison_design_source_evidence: options.comparisonDesignSourceEvidence
    });
    const actualWithoutHash = clone(review);
    const expectedWithoutHash = clone(expected);
    delete actualWithoutHash.review_hash;
    delete expectedWithoutHash.review_hash;
    if (stableStringify(actualWithoutHash) !== stableStringify(expectedWithoutHash)) {
      gaps.push("comparison-design evidence review mismatch against source evidence");
    }
  }
  return sanitizeGaps(gaps);
}

export function validateContributionAlignmentComparisonDesignAdequacyEvidenceReview(
  review,
  options = {}
) {
  if (review?.review_state === REJECT_STATE) {
    return {
      schema_version: VALIDATION_SCHEMA_VERSION,
      valid: false,
      gaps: ["boundary leakage rejected"]
    };
  }
  const gaps = sanitizeGaps([
    ...validateShape(review),
    ...validateAgainstSources(review, options)
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
  const [, , sourceRuntimePath, sourceEvidencePath] = process.argv;
  if (!sourceRuntimePath) {
    console.error(
      "Usage: node scripts/run_ai_value_contribution_alignment_comparison_design_adequacy_evidence_review.mjs <internal-bayesian-execution-runtime-json|- for stdin> [comparison-design-source-evidence-json]"
    );
    process.exit(1);
  }
  const sourceRuntime = inputFromCliPath(sourceRuntimePath);
  const review = buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject(
    sourceEvidencePath
      ? {
          source_runtime: sourceRuntime,
          comparison_design_source_evidence: inputFromCliPath(sourceEvidencePath)
        }
      : sourceRuntime
  );
  process.stdout.write(`${JSON.stringify(review, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
