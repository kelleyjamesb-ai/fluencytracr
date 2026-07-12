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
import {
  validateContributionAlignmentInternalBayesianExecutionGate
} from "./run_ai_value_contribution_alignment_internal_bayesian_execution_gate.mjs";
import {
  REQUIRED_APPROVED_MEASUREMENT_PLAN_MILESTONES
} from "./run_ai_value_reviewer_approved_measurement_plan_contract.mjs";
import {
  REVIEWER_OWNED_COMPARISON_DESIGN_SOURCE_PACKAGE_COLLECTION_SCHEMA_VERSION
} from "./run_ai_value_reviewer_owned_comparison_design_source_package_collection.mjs";

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
const REVIEWER_OWNED_COLLECTION_READY_STATE =
  "REVIEWER_OWNED_COMPARISON_DESIGN_SOURCE_PACKAGE_COLLECTED_FOR_REVIEW_ONLY";
const REVIEWER_OWNED_COLLECTION_READY_NEXT_STEP =
  "run_comparison_design_adequacy_evidence_review_only";
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
  "source_gate",
  "aggregate_measurement_cell_windows",
  "comparison_design_source_evidence",
  "generated_at"
]);
const ALLOWED_SOURCE_RUNTIME_ENVELOPE_FIELDS = new Set([
  "source_runtime",
  "source_gate",
  "sourceGate",
  "aggregate_measurement_cell_windows",
  "aggregateMeasurementCellWindows",
  "generated_at"
]);
const AGGREGATE_MEASUREMENT_CELL_WINDOW_FIELDS = new Set([
  "aggregate_window_id",
  "comparison_role",
  "window_role",
  "selected_metric_mean",
  "selected_metric_standard_error",
  "cohort_size"
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

const REVIEWER_OWNED_COLLECTION_SCALAR_FIELDS = [
  "reviewer_owned_source_package_ref",
  "reviewer_owned_source_package_hash",
  "source_comparison_design_source_package_preparation_hash",
  "source_blueprint_hypothesis_ref",
  "business_function",
  "prioritized_use_case",
  "workflow",
  "workflow_step",
  "cohort",
  "metric",
  "evidence_source",
  "observation_window",
  "governance_state",
  "treatment_group_definition",
  "comparison_group_definition",
  "rollout_or_comparison_design_type",
  "baseline_source_posture",
  "comparison_condition",
  "baseline_window",
  "comparison_window",
  "expected_movement_direction",
  "expected_lag_definition",
  "metric_direction_lag_confirmation_ref",
  "approved_expectation_path_blueprint_hypothesis_binding_ref",
  "cohort_identity_confirmation_ref",
  "workflow_function_identity_confirmation_ref",
  "aggregate_measurement_cell_grain_confirmation_ref",
  "aggregate_measurement_cell_grain",
  "suppression_missing_held_window_review",
  "reviewer_role_ref",
  "review_decision",
  "collection_hash"
];

const REQUIRED_REVIEWER_OWNED_BOUNDARY_CHECKS = [
  "raw_rows_absent",
  "identifiers_absent",
  "query_text_absent",
  "prompts_transcripts_absent",
  "person_level_data_absent",
  "causality_claim_absent",
  "roi_finance_productivity_claims_absent",
  "confidence_probability_output_absent",
  "live_connector_persistence_export_authorization_absent",
  "cross_slice_aggregation_prohibition_clear"
];

const REVIEWER_OWNED_COLLECTION_FALSE_FIELDS = [
  "reviewed_evidence_created",
  "creates_evidence",
  "evidence_satisfied",
  "comparison_design_adequacy_satisfied",
  "diagnostics_evidence_satisfied",
  "governed_diagnostics_sufficiency_evidence_source_complete",
  "posterior_interpretation_authorized",
  "promotion_authorized"
];

const REVIEWER_OWNED_COLLECTION_FALSE_OUTPUT_FIELDS = [
  "posterior_interpretation",
  "posterior_output",
  "confidence_output",
  "probability_output",
  "score_like_output",
  "customer_facing_output",
  "customer_facing_economic_output",
  "economic_output",
  "roi_output",
  "finance_output",
  "causality_output",
  "productivity_output",
  "live_connector_execution",
  "route_creation",
  "ui_creation",
  "schema_creation",
  "persistence_write",
  "export_creation",
  "raw_rows",
  "identifiers",
  "query_text",
  "prompts",
  "transcripts",
  "person_level_data",
  "individual_scoring",
  "team_scoring"
];

const REVIEWER_OWNED_COLLECTION_FALSE_FEED_FIELDS = [
  "comparison_design_adequacy_evidence_review",
  "governed_diagnostics_sufficiency_evidence_source",
  "diagnostics_evidence_packet",
  "bayesian_promotion_decision_gate",
  "posterior_interpretation_specification_gate",
  "live_connector_execution",
  "route_or_ui_creation",
  "schema_persistence_or_export_creation"
];

const REVIEWER_OWNED_COLLECTION_ALLOWED_FIELDS = new Set([
  "schema_version",
  "collection_state",
  "artifact_class",
  "internal_only",
  "aggregate_only",
  "source_ref_only",
  "fail_closed",
  "reviewer_owned_package_collection_only",
  "source_comparison_design_source_package_preparation_hash",
  "source_comparison_design_source_package_preparation_state",
  "source_comparison_design_source_package_preparation_allowed_next_step",
  "source_reviewer_approved_measurement_plan_ref",
  "source_reviewer_approved_measurement_plan_hash",
  "source_aggregate_data_collection_planning_ref",
  "source_aggregate_data_collection_planning_hash",
  "source_blueprint_hypothesis_ref",
  "selected_metric_id",
  "selected_metric_family",
  "selected_measurement_unit",
  "expected_movement_direction",
  "expected_lag_definition",
  "blueprint_hypothesis_role",
  "stated_evidence_posture",
  "observed_behavioral_evidence_posture",
  "downstream_outcome_evidence_posture",
  "reviewer_owned_source_package_ref",
  "reviewer_owned_source_package_hash",
  "business_function",
  "prioritized_use_case",
  "workflow",
  "workflow_step",
  "cohort",
  "metric",
  "evidence_source",
  "observation_window",
  "governance_state",
  "treatment_group_definition",
  "comparison_group_definition",
  "rollout_or_comparison_design_type",
  "baseline_source_posture",
  "comparison_condition",
  "baseline_window",
  "comparison_window",
  "metric_direction_lag_confirmation_ref",
  "approved_expectation_path_blueprint_hypothesis_binding_ref",
  "cohort_identity_confirmation_ref",
  "workflow_function_identity_confirmation_ref",
  "aggregate_measurement_cell_grain_confirmation_ref",
  "aggregate_measurement_cell_grain",
  "atomic_evidence_grain_support",
  "milestone_schedule",
  "suppression_missing_held_window_review",
  "boundary_checks",
  "reviewer_role_ref",
  "review_decision",
  "source_package_collected",
  "reviewed_evidence_created",
  "creates_evidence",
  "evidence_satisfied",
  "comparison_design_adequacy_satisfied",
  "diagnostics_evidence_satisfied",
  "governed_diagnostics_sufficiency_evidence_source_complete",
  "posterior_interpretation_authorized",
  "promotion_authorized",
  "blocked_claims",
  "blocked_outputs",
  "feeds",
  "bayesian_chain_state",
  "gap_list",
  "allowed_next_step",
  "collection_hash"
]);

const REVIEWER_OWNED_COLLECTION_REQUIRED_BLOCKED_CLAIMS = [
  "source_package_collection_is_not_evidence_assessment",
  "reviewer_owned_package_is_not_reviewed_evidence",
  "reviewer_owned_package_is_not_comparison_design_adequacy",
  "preferred_defaults_are_not_reviewer_owned_facts",
  "blueprint_hypothesis_is_source_of_truth",
  "sed_is_stated_evidence_posture_only",
  "vbd_is_observed_behavioral_evidence_posture_only",
  "business_metrics_are_downstream_outcome_evidence_posture_only",
  "diagnostics_sufficiency_satisfaction",
  "bayesian_promotion",
  "posterior_interpretation",
  "confidence_output",
  "probability_output",
  "roi_output",
  "finance_output",
  "economic_output",
  "causality_claim",
  "productivity_output",
  "customer_facing_economic_output",
  "raw_rows",
  "identifiers",
  "query_text",
  "prompts",
  "transcripts",
  "person_level_data",
  "individual_or_team_scoring",
  "live_connector_execution",
  "route_creation",
  "ui_creation",
  "schema_creation",
  "persistence_write",
  "export_creation"
];

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
  /raw_?row/i,
  /^rows$/i,
  /^records$/i,
  /identifier/i,
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

const SENSITIVE_RUNTIME_ENVELOPE_VALUE_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\bselect\b[\s\S]+\bfrom\b/i,
  /secret:\/\//i,
  /\bbquxjob_/i
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
  /\b(?:user_id|employee_id|person_level|person-level|identifier)\b/i,
  /\b(?:prompt|transcript)\b/i,
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

const NON_REVIEWED_PROVENANCE_PATTERN =
  /(?:^|[\s_.-])(?:draft|local|pending|generated|fixture|template|runtime(?:_only|-only)?|source(?:_hash_only|-hash-only)|hash(?:_only|-only)|example|default)(?:$|[\s_.-])/i;
const NON_READY_WINDOW_REF_PATTERN =
  /(?:^|[\s_.-])(?:stale|suppressed|held|hold|misaligned|missing)(?:$|[\s_.-])/i;

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

function hasOwn(record, key) {
  return Object.prototype.hasOwnProperty.call(record, key);
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

function safeCollectionScalar(value) {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(raw))) return null;
  if (NON_REVIEWED_PROVENANCE_PATTERN.test(raw)) return null;
  return raw;
}

function sourceRuntimeFromInput(input) {
  const record = asRecord(input);
  const sourceRuntimeEnvelope = asRecord(record.source_runtime);
  if (hasOwn(sourceRuntimeEnvelope, "source_runtime")) {
    return sourceRuntimeEnvelope.source_runtime;
  }
  return record.source_runtime ?? input;
}

function sourceRuntimeValidationOptions(input) {
  const record = asRecord(input);
  const sourceRuntimeEnvelope = asRecord(record.source_runtime);
  const source = hasOwn(sourceRuntimeEnvelope, "source_runtime")
    ? sourceRuntimeEnvelope
    : record;
  return {
    sourceGate: source.source_gate ?? source.sourceGate,
    aggregateMeasurementCellWindows:
      source.aggregate_measurement_cell_windows ??
      source.aggregateMeasurementCellWindows
  };
}

function comparisonSourceEvidenceFromInput(input) {
  return asRecord(input).comparison_design_source_evidence ?? null;
}

function runtimeEnvelopeContentGaps(value, path = []) {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      runtimeEnvelopeContentGaps(item, [...path, String(index)])
    );
  }
  if (value && typeof value === "object") {
    const gaps = [];
    for (const [key, nested] of Object.entries(value)) {
      const currentPath = [...path, key];
      if (
        FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))
      ) {
        gaps.push("source runtime envelope contains forbidden field name");
        continue;
      }
      gaps.push(...runtimeEnvelopeContentGaps(nested, currentPath));
    }
    return gaps;
  }
  if (typeof value !== "string") return [];
  return SENSITIVE_RUNTIME_ENVELOPE_VALUE_PATTERNS.some((pattern) => pattern.test(value))
    ? ["source runtime envelope contains unsafe source content"]
    : [];
}

function aggregateWindowBoundaryGaps(value) {
  if (!Array.isArray(value)) return [];
  const gaps = [];
  for (const window of value) {
    const record = asRecord(window);
    if (
      Object.keys(record).some(
        (key) => !AGGREGATE_MEASUREMENT_CELL_WINDOW_FIELDS.has(key)
      )
    ) {
      gaps.push("aggregate measurement-cell window contains ungoverned field");
    }
    gaps.push(...runtimeEnvelopeContentGaps(window));
  }
  return gaps;
}

function inputBoundaryGaps(input) {
  const record = asRecord(input);
  if (!hasOwn(record, "source_runtime")) return [];
  const sidecar = Object.fromEntries(
    Object.entries(record).filter(([key]) => !ALLOWED_INPUT_FIELDS.has(key))
  );
  const sourceRuntimeEnvelope = asRecord(record.source_runtime);
  const nestedRuntimeEnvelope = hasOwn(sourceRuntimeEnvelope, "source_runtime");
  const nestedRuntime = sourceRuntimeEnvelope.source_runtime;
  const nestedRuntimeInvalid =
    nestedRuntimeEnvelope &&
    (nestedRuntime === null ||
      typeof nestedRuntime !== "object" ||
      Array.isArray(nestedRuntime) ||
      Object.keys(asRecord(nestedRuntime)).length === 0);
  const duplicateOuterRuntimeFields = nestedRuntimeEnvelope
    ? ["source_gate", "aggregate_measurement_cell_windows", "generated_at"].filter(
        (key) => hasOwn(record, key)
      )
    : [];
  const generatedAtInvalid =
    !nestedRuntimeEnvelope &&
    hasOwn(record, "generated_at") &&
    (typeof record.generated_at !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(record.generated_at) ||
      !Number.isFinite(Date.parse(record.generated_at)));
  const plainSourceGateGaps =
    !nestedRuntimeEnvelope && hasOwn(record, "source_gate") &&
    !validateContributionAlignmentInternalBayesianExecutionGate(record.source_gate).valid
      ? ["plain runtime wrapper contains invalid source gate"]
      : [];
  const plainAggregateWindowGaps =
    !nestedRuntimeEnvelope && hasOwn(record, "aggregate_measurement_cell_windows")
      ? aggregateWindowBoundaryGaps(record.aggregate_measurement_cell_windows)
      : [];
  const nestedSidecar =
    nestedRuntimeEnvelope
      ? Object.fromEntries(
          Object.entries(sourceRuntimeEnvelope).filter(
            ([key]) => !ALLOWED_SOURCE_RUNTIME_ENVELOPE_FIELDS.has(key)
          )
        )
      : {};
  const nestedContentGaps = nestedRuntimeEnvelope
    ? Object.entries(sourceRuntimeEnvelope)
        .filter(([key]) => key !== "source_runtime")
        .flatMap(([key, nested]) => {
          if (["source_gate", "sourceGate"].includes(key)) {
            return validateContributionAlignmentInternalBayesianExecutionGate(nested).valid
              ? []
              : ["source runtime envelope contains invalid source gate"];
          }
          if (["aggregate_measurement_cell_windows", "aggregateMeasurementCellWindows"].includes(key)) {
            return aggregateWindowBoundaryGaps(nested);
          }
          if (key === "generated_at") {
            return typeof nested === "string" &&
              /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(nested) &&
              Number.isFinite(Date.parse(nested))
              ? []
              : ["source runtime envelope contains invalid generated_at"];
          }
          return runtimeEnvelopeContentGaps(nested, [key]);
        })
    : [];
  return Object.keys(sidecar).length > 0 ||
    nestedRuntimeInvalid ||
    duplicateOuterRuntimeFields.length > 0 ||
    generatedAtInvalid ||
    plainSourceGateGaps.length > 0 ||
    plainAggregateWindowGaps.length > 0 ||
    Object.keys(nestedSidecar).length > 0 ||
    nestedContentGaps.length > 0
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

function collectionHashBody(collection) {
  const withoutHash = clone(collection);
  delete withoutHash.collection_hash;
  return withoutHash;
}

function reviewerOwnedCollectionHash(collection) {
  return sha256Json(collectionHashBody(collection));
}

function isReviewerOwnedCollection(sourcePackage) {
  const record = asRecord(sourcePackage);
  return (
    record.schema_version ===
      REVIEWER_OWNED_COMPARISON_DESIGN_SOURCE_PACKAGE_COLLECTION_SCHEMA_VERSION ||
    record.artifact_class === "reviewer_owned_comparison_design_source_package_collection"
  );
}

function reviewedSourceEvidenceHash(sourcePackage) {
  return sha256Json({
    schema_version: REVIEWED_SOURCE_EVIDENCE_HASH_SCHEMA_VERSION,
    evidence_dimension: "comparison_design_adequacy",
    reviewed_source_evidence_ref: EXPECTED_REVIEWED_SOURCE_EVIDENCE_REF,
    reviewer_owned_source_package_ref: sourcePackage?.reviewer_owned_source_package_ref ?? null,
    reviewer_owned_source_package_hash: sourcePackage?.reviewer_owned_source_package_hash ?? null,
    reviewer_owned_collection_hash: sourcePackage?.collection_hash ?? null,
    source_comparison_design_source_package_preparation_hash:
      sourcePackage?.source_comparison_design_source_package_preparation_hash ?? null,
    aggregate_only_scope: true,
    review_decision: "APPROVED_FOR_GOVERNED_DIAGNOSTICS_SOURCE_BINDING"
  });
}

function sourceEvidenceHash(sourcePackage) {
  return sha256Json({
    schema_version: DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SCHEMA_VERSION,
    evidence_dimension: "comparison_design_adequacy",
    source_evidence_ref: EXPECTED_REVIEWED_SOURCE_EVIDENCE_REF,
    reviewed_source_evidence_hash: reviewedSourceEvidenceHash(sourcePackage),
    reviewer_owned_source_package_ref: sourcePackage?.reviewer_owned_source_package_ref ?? null,
    reviewer_owned_source_package_hash: sourcePackage?.reviewer_owned_source_package_hash ?? null,
    reviewer_owned_collection_hash: sourcePackage?.collection_hash ?? null,
    source_comparison_design_source_package_preparation_hash:
      sourcePackage?.source_comparison_design_source_package_preparation_hash ?? null,
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

function sourceRuntimeGaps(sourceRuntime, validationOptions = {}) {
  const runtime = asRecord(sourceRuntime);
  const design = asRecord(runtime.aggregate_design_matrix);
  const artifact = asRecord(runtime.internal_fit_artifact);
  const gaps = [];
  const validation = validateContributionAlignmentInternalBayesianExecutionRuntime(runtime, {
    ...validationOptions
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

function objectKeysExactGaps(record, requiredFields, label) {
  const value = asRecord(record);
  const gaps = [];
  for (const field of requiredFields) {
    if (!Object.prototype.hasOwnProperty.call(value, field)) {
      gaps.push(`${label}.${field} is required`);
    }
  }
  for (const field of Object.keys(value)) {
    if (!requiredFields.includes(field)) {
      gaps.push(`${label}.${field} is not allowed`);
    }
  }
  return gaps;
}

function falseObjectGaps(record, requiredFields, label) {
  const gaps = objectKeysExactGaps(record, requiredFields, label);
  const value = asRecord(record);
  for (const field of requiredFields) {
    if (value[field] !== false) gaps.push(`${label}.${field} must be false`);
  }
  return gaps;
}

function blockedClaimsGaps(claims) {
  if (!Array.isArray(claims)) return ["blocked_claims must be an array"];
  const gaps = [];
  const allowed = new Set(REVIEWER_OWNED_COLLECTION_REQUIRED_BLOCKED_CLAIMS);
  const seen = new Set();
  for (const claim of claims) {
    if (typeof claim !== "string") {
      gaps.push("blocked_claims entries must be scalar strings");
      continue;
    }
    if (!allowed.has(claim)) {
      gaps.push(`blocked_claims contains unexpected claim:${claim}`);
    }
    if (seen.has(claim)) gaps.push(`blocked_claims contains duplicate claim:${claim}`);
    seen.add(claim);
  }
  for (const claim of REVIEWER_OWNED_COLLECTION_REQUIRED_BLOCKED_CLAIMS) {
    if (!seen.has(claim)) gaps.push(`blocked_claims missing required claim:${claim}`);
  }
  return gaps;
}

function reviewerOwnedCollectionGaps(sourcePackage) {
  if (!sourcePackage) return ["reviewer-owned comparison-design source package collection is required"];
  if (!isReviewerOwnedCollection(sourcePackage)) {
    return ["comparison design source evidence must be reviewer-owned package collection"];
  }
  const record = asRecord(sourcePackage);
  const gaps = [];
  for (const field of Object.keys(record)) {
    if (!REVIEWER_OWNED_COLLECTION_ALLOWED_FIELDS.has(field)) {
      gaps.push(`reviewer-owned collection unexpected field:${field}`);
      if (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(field))) {
        gaps.push("reviewer-owned collection contains forbidden field name");
      }
    }
  }
  if (
    record.schema_version !==
    REVIEWER_OWNED_COMPARISON_DESIGN_SOURCE_PACKAGE_COLLECTION_SCHEMA_VERSION
  ) {
    gaps.push("reviewer-owned collection schema_version is invalid");
  }
  if (record.artifact_class !== "reviewer_owned_comparison_design_source_package_collection") {
    gaps.push("reviewer-owned collection artifact_class is invalid");
  }
  if (record.collection_state !== REVIEWER_OWNED_COLLECTION_READY_STATE) {
    gaps.push("reviewer-owned collection is not ready for adequacy review");
  }
  if (record.allowed_next_step !== REVIEWER_OWNED_COLLECTION_READY_NEXT_STEP) {
    gaps.push("reviewer-owned collection allowed_next_step is not adequacy review");
  }
  for (const [field, expected] of Object.entries({
    internal_only: true,
    aggregate_only: true,
    source_ref_only: true,
    fail_closed: true,
    reviewer_owned_package_collection_only: true,
    source_package_collected: true
  })) {
    if (record[field] !== expected) gaps.push(`${field} must be ${expected}`);
  }
  for (const field of REVIEWER_OWNED_COLLECTION_FALSE_FIELDS) {
    if (record[field] !== false) gaps.push(`${field} must be false`);
  }
  for (const field of REVIEWER_OWNED_COLLECTION_SCALAR_FIELDS) {
    if (safeCollectionScalar(record[field]) === null) {
      gaps.push(`${field} must be a scalar string`);
    }
  }
  for (const field of [
    "reviewer_owned_source_package_hash",
    "source_comparison_design_source_package_preparation_hash",
    "collection_hash"
  ]) {
    if (safeHash(record[field]) === null) gaps.push(`${field} must be a valid hash`);
  }
  if (record.collection_hash !== reviewerOwnedCollectionHash(record)) {
    gaps.push("reviewer-owned collection hash is invalid");
  }
  if (record.suppression_missing_held_window_review !== "CLEAR") {
    gaps.push("suppression_missing_held_window_review must be CLEAR");
  }
  if (record.review_decision !== "COLLECTED_FOR_REVIEW_ONLY") {
    gaps.push("review_decision must be COLLECTED_FOR_REVIEW_ONLY");
  }
  const boundaryChecks = asRecord(record.boundary_checks);
  gaps.push(...objectKeysExactGaps(
    boundaryChecks,
    REQUIRED_REVIEWER_OWNED_BOUNDARY_CHECKS,
    "boundary_checks"
  ));
  for (const field of REQUIRED_REVIEWER_OWNED_BOUNDARY_CHECKS) {
    if (boundaryChecks[field] !== "CLEAR") gaps.push(`boundary_checks.${field} must be CLEAR`);
  }
  const milestoneSchedule = asRecord(record.milestone_schedule);
  const milestoneRefs = asRecord(milestoneSchedule.reviewer_owned_milestone_refs);
  if (
    stableStringify(milestoneSchedule.required_milestones ?? []) !==
    stableStringify(REQUIRED_APPROVED_MEASUREMENT_PLAN_MILESTONES)
  ) {
    gaps.push("milestone_schedule.required_milestones must include T0/T30/T60/T90/T120/T180/T270/T365");
  }
  if (milestoneSchedule.collection_ready_for_review_only !== true) {
    gaps.push("milestone_schedule.collection_ready_for_review_only must be true");
  }
  gaps.push(...objectKeysExactGaps(
    milestoneRefs,
    REQUIRED_APPROVED_MEASUREMENT_PLAN_MILESTONES,
    "milestone_schedule.reviewer_owned_milestone_refs"
  ));
  for (const milestone of REQUIRED_APPROVED_MEASUREMENT_PLAN_MILESTONES) {
    const value = milestoneRefs[milestone];
    if (safeCollectionScalar(value) === null) {
      gaps.push(`milestone_schedule.reviewer_owned_milestone_refs.${milestone} must be a scalar string`);
    }
    if (typeof value === "string" && NON_READY_WINDOW_REF_PATTERN.test(value)) {
      gaps.push(`milestone_schedule.reviewer_owned_milestone_refs.${milestone} must be current and review-ready`);
    }
  }
  gaps.push(...blockedClaimsGaps(record.blocked_claims));
  gaps.push(...falseObjectGaps(
    record.blocked_outputs,
    REVIEWER_OWNED_COLLECTION_FALSE_OUTPUT_FIELDS,
    "blocked_outputs"
  ));
  gaps.push(...falseObjectGaps(
    record.feeds,
    REVIEWER_OWNED_COLLECTION_FALSE_FEED_FIELDS,
    "feeds"
  ));
  const bayesianChainState = asRecord(record.bayesian_chain_state);
  if (
    bayesianChainState.current_state !==
    "HOLD_FOR_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE"
  ) {
    gaps.push("bayesian_chain_state.current_state must remain held");
  }
  if (
    bayesianChainState.allowed_next_step !==
    "complete_governed_diagnostics_sufficiency_evidence_source"
  ) {
    gaps.push("bayesian_chain_state.allowed_next_step must remain governed diagnostics source completion");
  }
  if (bayesianChainState.changed_by_this_artifact !== false) {
    gaps.push("bayesian_chain_state.changed_by_this_artifact must be false");
  }
  return sanitizeGaps(gaps);
}

function sourcePackageGaps(sourceRuntime, sourcePackage) {
  if (isReviewerOwnedCollection(sourcePackage)) {
    return reviewerOwnedCollectionGaps(sourcePackage);
  }
  if (!sourcePackage) return ["comparison design source evidence is required"];
  const record = asRecord(sourcePackage);
  const runtimeRef = asRecord(record.source_runtime_ref);
  const gaps = [
    "comparison design source evidence must be reviewer-owned package collection",
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
  if (isReviewerOwnedCollection(sourcePackage)) {
    return {
      schema_version:
        record.schema_version ===
        REVIEWER_OWNED_COMPARISON_DESIGN_SOURCE_PACKAGE_COLLECTION_SCHEMA_VERSION
          ? record.schema_version
          : null,
      source_package_id:
        typeof record.reviewer_owned_source_package_ref === "string"
          ? record.reviewer_owned_source_package_ref
          : null,
      package_state:
        record.collection_state === REVIEWER_OWNED_COLLECTION_READY_STATE
          ? record.collection_state
          : null,
      source_package_hash: ready ? safeHash(record.reviewer_owned_source_package_hash) : null,
      collection_hash: ready ? safeHash(record.collection_hash) : null,
      source_comparison_design_source_package_preparation_hash: ready
        ? safeHash(record.source_comparison_design_source_package_preparation_hash)
        : null
    };
  }
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
  const collection = isReviewerOwnedCollection(sourcePackage);
  const suppression = collection
    ? { suppressed_missing_held_windows_clear: record.suppression_missing_held_window_review === "CLEAR" }
    : asRecord(record.suppression_missing_held_window_review);
  return {
    treatment_definition_present: ready && Boolean(record.treatment_group_definition),
    comparison_definition_present: ready && Boolean(record.comparison_group_definition),
    pre_post_window_definition_present:
      ready && Boolean(record.baseline_window) && Boolean(record.comparison_window),
    rollout_or_comparison_design_type_present:
      ready && Boolean(record.rollout_or_comparison_design_type),
    aggregate_measurement_cell_grain: ready && Boolean(record.aggregate_measurement_cell_grain),
    same_metric_direction_lag_expectation_path_cohort_workflow_function_identity:
      ready &&
      Boolean(record.metric_direction_lag_confirmation_ref) &&
      Boolean(record.approved_expectation_path_blueprint_hypothesis_binding_ref) &&
      Boolean(record.cohort_identity_confirmation_ref) &&
      Boolean(record.workflow_function_identity_confirmation_ref),
    suppression_missing_held_window_review_present:
      ready && Boolean(record.suppression_missing_held_window_review),
    suppressed_missing_held_windows_clear: ready && suppression.suppressed_missing_held_windows_clear === true,
    no_unsupported_cross_slice_aggregation: ready,
    no_person_level_or_identifiable_fields: ready,
    causality_claim_authorized: false,
    reviewer_role: ready ? record.reviewer_role_ref : null,
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
    source_evidence_hash: ready ? sourceEvidenceHash(sourcePackage) : null,
    aggregate_only_scope: ready,
    suppressed_missing_held_windows_clear: ready,
    eligible_for_satisfied_representation: ready,
    placeholder_evidence: false,
    generated_fixture_evidence: false,
    evidence_satisfied: ready,
    missing_evidence: ready ? [] : missing
  };
}

function buildReview(sourceRuntime, sourcePackage, state, gaps, runtimeGaps = sourceRuntimeGaps(sourceRuntime)) {
  const ready = state === READY_STATE;
  const missing = missingEvidence(sourceRuntime, sourcePackage);
  const review = {
    schema_version: CONTRIBUTION_ALIGNMENT_COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEW_SCHEMA_VERSION,
    review_id: `contribution_alignment_comparison_design_adequacy_evidence_review_${sha256Json({
      runtime_hash: sourceRuntime?.runtime_hash ?? null,
      fixture_artifact_hash: sourceRuntime?.internal_fit_artifact?.artifact_hash ?? null,
      reviewer_owned_source_package_hash:
        sourcePackage?.reviewer_owned_source_package_hash ?? null,
      reviewer_owned_collection_hash: sourcePackage?.collection_hash ?? null,
      review_version: REVIEW_VERSION
    }).slice(0, 16)}`,
    review_state: state,
    review_class: REVIEW_CLASS,
    generated_at: "2026-06-26T00:00:00.000Z",
    derivation_version: DERIVATION_VERSION,
    source_bound: ready,
    source_runtime_ref: sourceRuntimeRef(sourceRuntime),
    source_package_ref: sourcePackageRef(sourcePackage, ready),
    evidence_dimension: "comparison_design_adequacy",
    review_version: REVIEW_VERSION,
    review_policy: {
      internal_only: true,
      aggregate_only: runtimeGaps.length === 0,
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
  review.review_hash = ready ? reviewHash(review) : null;
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
  review.review_hash = null;
  return review;
}

export function buildContributionAlignmentComparisonDesignAdequacyEvidenceReviewFromObject(input) {
  if (inputBoundaryGaps(input).length > 0) return rejectedReview();
  const sourceRuntime = sourceRuntimeFromInput(input);
  const runtimeValidationOptions = sourceRuntimeValidationOptions(input);
  const sourcePackage = comparisonSourceEvidenceFromInput(input);
  if (!isReviewerOwnedCollection(sourcePackage) && sourcePackageContentGaps(sourcePackage).length > 0) {
    return rejectedReview();
  }
  const runtimeGaps = sourceRuntimeGaps(sourceRuntime, runtimeValidationOptions);
  const packageGaps = sourcePackageGaps(sourceRuntime, sourcePackage);
  const gaps = sanitizeGaps([...runtimeGaps, ...packageGaps]);
  const state = gaps.length === 0 ? READY_STATE : HOLD_STATE;
  return buildReview(sourceRuntime, sourcePackage, state, gaps, runtimeGaps);
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
  if (ready && record.review_hash !== reviewHash(record)) {
    gaps.push("review_hash must match review body");
  }
  if (!ready && record.review_hash !== null) {
    gaps.push("review_hash must be null when held");
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
    const runtimeValidationOptions = sourceRuntimeValidationOptions(options);
    gaps.push(...sourceRuntimeGaps(options.sourceRuntime, runtimeValidationOptions));
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
      source_gate: options.sourceGate,
      aggregate_measurement_cell_windows: options.aggregateMeasurementCellWindows,
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
