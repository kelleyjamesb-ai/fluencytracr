#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  REQUIRED_APPROVED_MEASUREMENT_PLAN_MILESTONES
} from "./run_ai_value_reviewer_approved_measurement_plan_contract.mjs";
import {
  validateComparisonDesignSourcePackagePreparationBinding
} from "./run_ai_value_comparison_design_source_package_preparation_binding.mjs";

export const REVIEWER_OWNED_COMPARISON_DESIGN_SOURCE_PACKAGE_COLLECTION_SCHEMA_VERSION =
  "FT_AI_VALUE_REVIEWER_OWNED_COMPARISON_DESIGN_SOURCE_PACKAGE_COLLECTION_2026_06";

const READY_STATE =
  "REVIEWER_OWNED_COMPARISON_DESIGN_SOURCE_PACKAGE_COLLECTED_FOR_REVIEW_ONLY";
const HOLD_BINDING_STATE = "HOLD_FOR_BINDING";
const HOLD_MORE_INFORMATION_STATE = "HOLD_FOR_MORE_INFORMATION";
const READY_NEXT_STEP = "run_comparison_design_adequacy_evidence_review_only";
const HOLD_BINDING_NEXT_STEP = "prepare_comparison_design_source_package_only";
const HOLD_MORE_INFORMATION_NEXT_STEP =
  "collect_reviewer_owned_comparison_design_source_package_only";
const SOURCE_PREPARATION_READY_STATE =
  "COMPARISON_DESIGN_SOURCE_PACKAGE_PREPARATION_READY_FOR_REVIEWER_COLLECTION";
const SOURCE_PREPARATION_READY_NEXT_STEP =
  "collect_reviewer_owned_comparison_design_source_package_only";
const BAYESIAN_CHAIN_HELD_STATE =
  "HOLD_FOR_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE";
const BAYESIAN_CHAIN_ALLOWED_NEXT_STEP =
  "complete_governed_diagnostics_sufficiency_evidence_source";
const REQUIRED_REVIEW_DECISION = "COLLECTED_FOR_REVIEW_ONLY";

const HELD_STATE_NEXT_STEPS = Object.freeze({
  [HOLD_BINDING_STATE]: HOLD_BINDING_NEXT_STEP,
  [HOLD_MORE_INFORMATION_STATE]: HOLD_MORE_INFORMATION_NEXT_STEP
});

const ALLOWED_MILESTONE_SCHEDULE_FIELDS = Object.freeze([
  "required_milestones",
  "reviewer_owned_milestone_refs",
  "t365_plus_posture",
  "collection_ready_for_review_only"
]);

const ALLOWED_BAYESIAN_CHAIN_STATE_FIELDS = Object.freeze([
  "current_state",
  "allowed_next_step",
  "changed_by_this_artifact"
]);

const ATOMIC_EVIDENCE_GRAIN_SUPPORT = Object.freeze([
  "blueprint_hypothesis",
  "business_function",
  "prioritized_use_case",
  "workflow",
  "workflow_step",
  "cohort",
  "metric",
  "evidence_source",
  "observation_window",
  "governance_state"
]);

const AGGREGATE_MEASUREMENT_CELL_GRAIN =
  "Blueprint Hypothesis x Business Function x Prioritized Use Case x Workflow x Workflow Step x Cohort x Metric x Evidence Source x Milestone Window";

const REQUIRED_PACKAGE_FIELDS = Object.freeze([
  "reviewer_owned_source_package_ref",
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
  "review_decision"
]);

const ALLOWED_PACKAGE_INPUT_FIELDS = Object.freeze([
  ...REQUIRED_PACKAGE_FIELDS,
  "boundary_checks",
  "milestone_schedule_confirmation_refs"
]);

const REQUIRED_BOUNDARY_CHECKS = Object.freeze([
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
]);

const REQUIRED_BLOCKED_CLAIMS = Object.freeze([
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
]);

const BLOCKED_OUTPUTS = Object.freeze({
  posterior_interpretation: false,
  posterior_output: false,
  confidence_output: false,
  probability_output: false,
  score_like_output: false,
  customer_facing_output: false,
  customer_facing_economic_output: false,
  economic_output: false,
  roi_output: false,
  finance_output: false,
  causality_output: false,
  productivity_output: false,
  live_connector_execution: false,
  route_creation: false,
  ui_creation: false,
  schema_creation: false,
  persistence_write: false,
  export_creation: false,
  raw_rows: false,
  identifiers: false,
  query_text: false,
  prompts: false,
  transcripts: false,
  person_level_data: false,
  individual_scoring: false,
  team_scoring: false
});

const FEEDS = Object.freeze({
  comparison_design_adequacy_evidence_review: false,
  governed_diagnostics_sufficiency_evidence_source: false,
  diagnostics_evidence_packet: false,
  bayesian_promotion_decision_gate: false,
  posterior_interpretation_specification_gate: false,
  live_connector_execution: false,
  route_or_ui_creation: false,
  schema_persistence_or_export_creation: false
});

const ALLOWED_TOP_LEVEL_FIELDS = new Set([
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
  "expected_movement_direction",
  "expected_lag_definition",
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

const FORBIDDEN_EXTRA_FIELD_NAME_PATTERN =
  /(?:live[-_\s]?connector|route|ui|schema|persistence|export|raw|identifier|query|prompt|transcript|person|individual|team|diagnostic|promotion|posterior|confidence|probability|roi|finance|financial|economic|causal|causality|productivity|score|authorized|created|satisfied|observed|assessment|payload)/i;

const FORBIDDEN_VALUE_PATTERNS = [
  ["email_address", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
  ["raw_row_content", /\b(raw_rows?|row[-\s]?level|raw\s+event|raw\s+record)\b/i],
  ["identifier_value", /\b(user_id|employee_id|person_level|person-level|identifier)\b/i],
  ["prompt_or_transcript_value", /\b(prompt|transcript)\s*[:=]/i],
  ["query_text_value", /\b(select|insert|update|delete)\b[\s\S]{0,120}\b(from|where|table)\b/i],
  [
    "unsafe_claim_language",
    /\b(confident|confidence|probability|posterior|roi|finance|financial|economic|caused|causal|causality|attribution|productivity)\b/i
  ],
  [
    "blocked_output_language",
    /\b(customer[-_\s]?facing(?:[-_\s]?(?:output|economic))?|live[-_\s]?connector(?:[-_\s]?execution)?|route[-_\s]?creation|ui[-_\s]?creation|schema[-_\s]?creation|persistence[-_\s]?write|export[-_\s]?creation|individual[-_\s]?scoring|team[-_\s]?scoring|individual[-_\s]?or[-_\s]?team[-_\s]?scoring)\b/i
  ],
  [
    "evidence_completion_language",
    /\b(reviewed[-_\s]?evidence|evidence[-_\s]?created|attestation[-_\s]?complete|adequacy[-_\s]?satisfied|satisfied|unlocked|approved[-_\s]?as[-_\s]?evidence)\b/i
  ]
];

const NON_REVIEWED_PROVENANCE_PATTERN =
  /(?:^|[\s_.-])(?:draft|local|pending|generated|fixture|template|runtime(?:_only|-only)?|source(?:_hash_only|-hash-only)|hash(?:_only|-only)|example|default)(?:$|[\s_.-])/i;
const NON_READY_WINDOW_REF_PATTERN =
  /(?:^|[\s_.-])(?:stale|suppressed|held|hold|misaligned|missing)(?:$|[\s_.-])/i;

function stableString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashObject(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function hashCollection(record) {
  const { collection_hash, ...hashable } = record;
  return hashObject(hashable);
}

function containsForbiddenValue(value) {
  const raw = stableString(value);
  return FORBIDDEN_VALUE_PATTERNS.some(([, pattern]) => pattern.test(raw));
}

function safeScalar(value) {
  if (value !== null && value !== undefined && typeof value !== "string") {
    return null;
  }
  const raw = stableString(value);
  if (!raw || containsForbiddenValue(raw) || NON_REVIEWED_PROVENANCE_PATTERN.test(raw)) {
    return null;
  }
  return raw;
}

function cloneJson(value) {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function sourcePreparationState({
  sourceRecommendationPlan,
  sourceReviewerApprovedMeasurementPlan,
  sourceAggregateDataCollectionPlanningContract,
  sourceComparisonDesignSourcePackagePreparationBinding
}) {
  if (!sourceComparisonDesignSourcePackagePreparationBinding) {
    return {
      valid: false,
      gaps: ["missing_source_comparison_design_source_package_preparation_binding"]
    };
  }
  const validation = validateComparisonDesignSourcePackagePreparationBinding(
    sourceComparisonDesignSourcePackagePreparationBinding,
    {
      sourceRecommendationPlan,
      sourceReviewerApprovedMeasurementPlan,
      sourceAggregateDataCollectionPlanningContract
    }
  );
  if (!validation.valid) {
    return {
      valid: false,
      gaps: validation.gaps.map((gap) => `source_preparation_binding_invalid:${gap}`)
    };
  }
  if (
    sourceComparisonDesignSourcePackagePreparationBinding.preparation_state !==
    SOURCE_PREPARATION_READY_STATE
  ) {
    return { valid: false, gaps: ["source_preparation_binding_not_ready"] };
  }
  if (
    sourceComparisonDesignSourcePackagePreparationBinding.allowed_next_step !==
    SOURCE_PREPARATION_READY_NEXT_STEP
  ) {
    return {
      valid: false,
      gaps: ["source_preparation_binding_next_step_not_collection"]
    };
  }
  return { valid: true, gaps: [] };
}

function sanitizeReviewerOwnedPackage(sourcePackage, gaps) {
  if (!sourcePackage) {
    return { supplied: false, sanitized: {}, valid: false, gaps: ["missing_reviewer_owned_comparison_design_source_package"] };
  }

  const sanitized = {};
  for (const field of Object.keys(sourcePackage)) {
    if (!ALLOWED_PACKAGE_INPUT_FIELDS.includes(field)) {
      gaps.push(`unexpected_reviewer_owned_source_package_field:${field}`);
      if (FORBIDDEN_EXTRA_FIELD_NAME_PATTERN.test(field)) {
        gaps.push(`forbidden_reviewer_owned_source_package_field:${field}`);
      }
      scanUnsafeContractValues(sourcePackage[field], gaps, `reviewerOwnedPackage.${field}`);
    }
  }
  for (const field of REQUIRED_PACKAGE_FIELDS) {
    const raw = sourcePackage[field];
    if (!stableString(raw)) {
      sanitized[field] = null;
      gaps.push(`missing_${field}`);
      continue;
    }
    if (typeof raw !== "string") {
      sanitized[field] = null;
      gaps.push(`non_scalar_${field}`);
      scanUnsafeContractValues(raw, gaps, `reviewerOwnedPackage.${field}`);
      continue;
    }
    const safe = safeScalar(raw);
    if (!safe) {
      sanitized[field] = null;
      gaps.push(`unsafe_${field}`);
      continue;
    }
    sanitized[field] = safe;
  }

  const boundaryChecks = {};
  const sourceBoundaryChecks =
    sourcePackage.boundary_checks && typeof sourcePackage.boundary_checks === "object"
      ? sourcePackage.boundary_checks
      : {};
  for (const field of Object.keys(sourceBoundaryChecks)) {
    if (!REQUIRED_BOUNDARY_CHECKS.includes(field)) {
      gaps.push(`boundary_checks.${field} is not an allowed boundary check key`);
      scanUnsafeContractValues(
        sourceBoundaryChecks[field],
        gaps,
        `reviewerOwnedPackage.boundary_checks.${field}`
      );
    }
  }
  for (const field of REQUIRED_BOUNDARY_CHECKS) {
    const sourceValue = sourceBoundaryChecks[field];
    const raw = stableString(sourceValue);
    if (!raw) {
      boundaryChecks[field] = null;
      gaps.push(`missing_boundary_check:${field}`);
      continue;
    }
    if (typeof sourceValue !== "string") {
      boundaryChecks[field] = null;
      gaps.push(`non_scalar_boundary_check:${field}`);
      scanUnsafeContractValues(
        sourceValue,
        gaps,
        `reviewerOwnedPackage.boundary_checks.${field}`
      );
      continue;
    }
    if (raw !== "CLEAR") {
      boundaryChecks[field] = raw;
      gaps.push(`boundary_check_not_clear:${field}`);
      continue;
    }
    boundaryChecks[field] = "CLEAR";
  }

  const milestoneRefs = {};
  const sourceMilestoneRefs =
    sourcePackage.milestone_schedule_confirmation_refs &&
    typeof sourcePackage.milestone_schedule_confirmation_refs === "object"
      ? sourcePackage.milestone_schedule_confirmation_refs
      : {};
  for (const field of Object.keys(sourceMilestoneRefs)) {
    if (!REQUIRED_APPROVED_MEASUREMENT_PLAN_MILESTONES.includes(field)) {
      gaps.push(`milestone_schedule_confirmation_refs.${field} is not an allowed milestone key`);
      scanUnsafeContractValues(
        sourceMilestoneRefs[field],
        gaps,
        `reviewerOwnedPackage.milestone_schedule_confirmation_refs.${field}`
      );
    }
  }
  for (const milestone of REQUIRED_APPROVED_MEASUREMENT_PLAN_MILESTONES) {
    const raw = sourceMilestoneRefs[milestone];
    if (!stableString(raw)) {
      milestoneRefs[milestone] = null;
      gaps.push(`missing_milestone_schedule_confirmation_ref:${milestone}`);
      continue;
    }
    if (typeof raw !== "string") {
      milestoneRefs[milestone] = null;
      gaps.push(`non_scalar_milestone_schedule_confirmation_ref:${milestone}`);
      scanUnsafeContractValues(
        raw,
        gaps,
        `reviewerOwnedPackage.milestone_schedule_confirmation_refs.${milestone}`
      );
      continue;
    }
    const safe = safeScalar(raw);
    if (!safe) {
      milestoneRefs[milestone] = null;
      gaps.push(`unsafe_milestone_schedule_confirmation_ref:${milestone}`);
      continue;
    }
    if (NON_READY_WINDOW_REF_PATTERN.test(safe)) {
      milestoneRefs[milestone] = null;
      gaps.push(`non_ready_milestone_schedule_confirmation_ref:${milestone}`);
      continue;
    }
    milestoneRefs[milestone] = safe;
  }

  sanitized.boundary_checks = boundaryChecks;
  sanitized.milestone_schedule_confirmation_refs = milestoneRefs;

  if (sanitized.review_decision && sanitized.review_decision !== REQUIRED_REVIEW_DECISION) {
    gaps.push("review_decision_not_collected_for_review_only");
  }
  if (
    sanitized.suppression_missing_held_window_review &&
    sanitized.suppression_missing_held_window_review !== "CLEAR"
  ) {
    gaps.push("suppression_missing_held_window_review_not_clear");
  }
  if (
    sanitized.aggregate_measurement_cell_grain &&
    sanitized.aggregate_measurement_cell_grain !== AGGREGATE_MEASUREMENT_CELL_GRAIN
  ) {
    gaps.push("aggregate_measurement_cell_grain_not_canonical");
  }

  return { supplied: true, sanitized, valid: gaps.length === 0, gaps };
}

function validatePackageSourceAlignment(sanitizedPackage, sourcePreparation, gaps) {
  if (!sanitizedPackage || !sourcePreparation) return;
  const bindings = [
    [
      "source_blueprint_hypothesis_ref",
      sanitizedPackage.source_blueprint_hypothesis_ref,
      sourcePreparation.source_blueprint_hypothesis_ref
    ],
    ["metric", sanitizedPackage.metric, sourcePreparation.selected_metric_id],
    [
      "baseline_source_posture",
      sanitizedPackage.baseline_source_posture,
      sourcePreparation.baseline_source_posture
    ],
    [
      "comparison_condition",
      sanitizedPackage.comparison_condition,
      sourcePreparation.comparison_condition
    ],
    [
      "expected_movement_direction",
      sanitizedPackage.expected_movement_direction,
      sourcePreparation.expected_movement_direction
    ],
    [
      "expected_lag_definition",
      sanitizedPackage.expected_lag_definition,
      sourcePreparation.expected_lag_definition
    ],
    ["cohort", sanitizedPackage.cohort, sourcePreparation.cohort_identity],
    ["workflow", sanitizedPackage.workflow, sourcePreparation.workflow_function_identity],
    [
      "aggregate_measurement_cell_grain",
      sanitizedPackage.aggregate_measurement_cell_grain,
      AGGREGATE_MEASUREMENT_CELL_GRAIN
    ]
  ];
  for (const [field, value, expected] of bindings) {
    if (!stableString(value) || !stableString(expected)) continue;
    if (value !== expected) {
      gaps.push(`${field} must match source preparation binding`);
    }
  }
}

function baseRecord({
  sourceComparisonDesignSourcePackagePreparationBinding,
  reviewerOwnedComparisonDesignSourcePackage,
  sanitizedPackage,
  collectionState,
  allowedNextStep,
  gaps
}) {
  const collected = collectionState === READY_STATE;
  const source = sourceComparisonDesignSourcePackagePreparationBinding ?? {};
  const safePackage = sanitizedPackage ?? {};
  const milestoneRefs = safePackage.milestone_schedule_confirmation_refs ?? {};

  const record = {
    schema_version:
      REVIEWER_OWNED_COMPARISON_DESIGN_SOURCE_PACKAGE_COLLECTION_SCHEMA_VERSION,
    collection_state: collectionState,
    artifact_class: "reviewer_owned_comparison_design_source_package_collection",
    internal_only: true,
    aggregate_only: true,
    source_ref_only: true,
    fail_closed: true,
    reviewer_owned_package_collection_only: true,
    source_comparison_design_source_package_preparation_hash:
      sourceComparisonDesignSourcePackagePreparationBinding
        ? hashObject(sourceComparisonDesignSourcePackagePreparationBinding)
        : null,
    source_comparison_design_source_package_preparation_state:
      safeScalar(source.preparation_state),
    source_comparison_design_source_package_preparation_allowed_next_step:
      safeScalar(source.allowed_next_step),
    source_reviewer_approved_measurement_plan_ref:
      safeScalar(source.source_reviewer_approved_measurement_plan_ref),
    source_reviewer_approved_measurement_plan_hash:
      safeScalar(source.source_reviewer_approved_measurement_plan_hash),
    source_aggregate_data_collection_planning_ref:
      safeScalar(source.source_aggregate_data_collection_planning_ref),
    source_aggregate_data_collection_planning_hash:
      safeScalar(source.source_aggregate_data_collection_planning_hash),
    source_blueprint_hypothesis_ref: safeScalar(source.source_blueprint_hypothesis_ref),
    selected_metric_id: safeScalar(source.selected_metric_id),
    selected_metric_family: safeScalar(source.selected_metric_family),
    selected_measurement_unit: safeScalar(source.selected_measurement_unit),
    expected_movement_direction: safeScalar(source.expected_movement_direction),
    expected_lag_definition: safeScalar(source.expected_lag_definition),
    blueprint_hypothesis_role: "source_of_truth_for_measurement_plan",
    stated_evidence_posture: "ai_fluency_instrument_sed_refs_only_not_evidence_assessment",
    observed_behavioral_evidence_posture: "vbd_refs_only_not_evidence_assessment",
    downstream_outcome_evidence_posture:
      "business_operational_metric_refs_only_not_evidence_assessment",
    reviewer_owned_source_package_ref: safePackage.reviewer_owned_source_package_ref ?? null,
    reviewer_owned_source_package_hash: collected && reviewerOwnedComparisonDesignSourcePackage
      ? hashObject(reviewerOwnedComparisonDesignSourcePackage)
      : null,
    business_function: safePackage.business_function ?? null,
    prioritized_use_case: safePackage.prioritized_use_case ?? null,
    workflow: safePackage.workflow ?? null,
    workflow_step: safePackage.workflow_step ?? null,
    cohort: safePackage.cohort ?? null,
    metric: safePackage.metric ?? null,
    evidence_source: safePackage.evidence_source ?? null,
    observation_window: safePackage.observation_window ?? null,
    governance_state: safePackage.governance_state ?? null,
    treatment_group_definition: safePackage.treatment_group_definition ?? null,
    comparison_group_definition: safePackage.comparison_group_definition ?? null,
    rollout_or_comparison_design_type:
      safePackage.rollout_or_comparison_design_type ?? null,
    baseline_source_posture: safePackage.baseline_source_posture ?? null,
    comparison_condition: safePackage.comparison_condition ?? null,
    baseline_window: safePackage.baseline_window ?? null,
    comparison_window: safePackage.comparison_window ?? null,
    expected_movement_direction: safePackage.expected_movement_direction ?? null,
    expected_lag_definition: safePackage.expected_lag_definition ?? null,
    metric_direction_lag_confirmation_ref:
      safePackage.metric_direction_lag_confirmation_ref ?? null,
    approved_expectation_path_blueprint_hypothesis_binding_ref:
      safePackage.approved_expectation_path_blueprint_hypothesis_binding_ref ?? null,
    cohort_identity_confirmation_ref: safePackage.cohort_identity_confirmation_ref ?? null,
    workflow_function_identity_confirmation_ref:
      safePackage.workflow_function_identity_confirmation_ref ?? null,
    aggregate_measurement_cell_grain_confirmation_ref:
      safePackage.aggregate_measurement_cell_grain_confirmation_ref ?? null,
    aggregate_measurement_cell_grain: safePackage.aggregate_measurement_cell_grain ?? null,
    atomic_evidence_grain_support: [...ATOMIC_EVIDENCE_GRAIN_SUPPORT],
    milestone_schedule: {
      required_milestones: [...REQUIRED_APPROVED_MEASUREMENT_PLAN_MILESTONES],
      reviewer_owned_milestone_refs: cloneJson(milestoneRefs),
      t365_plus_posture:
        "T365_plus_requires_later_reviewer_owned_aggregate_window_ref_when_available",
      collection_ready_for_review_only: collected
    },
    suppression_missing_held_window_review:
      safePackage.suppression_missing_held_window_review ?? null,
    boundary_checks: { ...(safePackage.boundary_checks ?? {}) },
    reviewer_role_ref: safePackage.reviewer_role_ref ?? null,
    review_decision: collected ? safePackage.review_decision : "HOLD_FOR_MORE_INFORMATION",
    source_package_collected: collected,
    reviewed_evidence_created: false,
    creates_evidence: false,
    evidence_satisfied: false,
    comparison_design_adequacy_satisfied: false,
    diagnostics_evidence_satisfied: false,
    governed_diagnostics_sufficiency_evidence_source_complete: false,
    posterior_interpretation_authorized: false,
    promotion_authorized: false,
    blocked_claims: [...REQUIRED_BLOCKED_CLAIMS],
    blocked_outputs: { ...BLOCKED_OUTPUTS },
    feeds: { ...FEEDS },
    bayesian_chain_state: {
      current_state: BAYESIAN_CHAIN_HELD_STATE,
      allowed_next_step: BAYESIAN_CHAIN_ALLOWED_NEXT_STEP,
      changed_by_this_artifact: false
    },
    gap_list: unique(gaps),
    allowed_next_step: allowedNextStep
  };
  record.collection_hash = hashCollection(record);
  return record;
}

export function buildReviewerOwnedComparisonDesignSourcePackageCollection({
  sourceRecommendationPlan,
  sourceReviewerApprovedMeasurementPlan,
  sourceAggregateDataCollectionPlanningContract,
  sourceComparisonDesignSourcePackagePreparationBinding,
  reviewerOwnedComparisonDesignSourcePackage
} = {}) {
  const bindingState = sourcePreparationState({
    sourceRecommendationPlan,
    sourceReviewerApprovedMeasurementPlan,
    sourceAggregateDataCollectionPlanningContract,
    sourceComparisonDesignSourcePackagePreparationBinding
  });
  const gaps = [...bindingState.gaps];

  let packageState = { supplied: false, sanitized: {}, valid: false, gaps: [] };
  if (bindingState.valid) {
    const packageGaps = [];
    packageState = sanitizeReviewerOwnedPackage(
      reviewerOwnedComparisonDesignSourcePackage,
      packageGaps
    );
    packageGaps.push(...packageState.gaps.filter((gap) => !packageGaps.includes(gap)));
    validatePackageSourceAlignment(
      packageState.sanitized,
      sourceComparisonDesignSourcePackagePreparationBinding,
      packageGaps
    );
    packageState.valid = packageGaps.length === 0;
    packageState.gaps = packageGaps;
    gaps.push(...packageState.gaps);
  }

  let collectionState = READY_STATE;
  let allowedNextStep = READY_NEXT_STEP;
  if (!bindingState.valid) {
    collectionState = HOLD_BINDING_STATE;
    allowedNextStep = HOLD_BINDING_NEXT_STEP;
  } else if (!packageState.valid) {
    collectionState = HOLD_MORE_INFORMATION_STATE;
    allowedNextStep = HOLD_MORE_INFORMATION_NEXT_STEP;
  }

  return baseRecord({
    sourceComparisonDesignSourcePackagePreparationBinding,
    reviewerOwnedComparisonDesignSourcePackage,
    sanitizedPackage: packageState.sanitized,
    collectionState,
    allowedNextStep,
    gaps
  });
}

function hasEveryRequiredValue(values, requiredValues) {
  const set = new Set(Array.isArray(values) ? values : []);
  return requiredValues.every((value) => set.has(value));
}

function scanUnsafeContractValues(value, gaps, path = "contract") {
  if (value === null || value === undefined) return;
  if (typeof value === "string") {
    if (containsForbiddenValue(value)) gaps.push(`unsafe_contract_value:${path}`);
    if (NON_REVIEWED_PROVENANCE_PATTERN.test(value)) {
      gaps.push(`non_reviewed_contract_value:${path}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanUnsafeContractValues(item, gaps, `${path}[${index}]`));
    return;
  }
  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      scanUnsafeContractValues(nested, gaps, `${path}.${key}`);
    }
  }
}

function validateNoForbiddenExtraFields(record, gaps) {
  if (!record || typeof record !== "object") return;
  for (const key of Object.keys(record)) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(key)) {
      gaps.push(`unexpected_top_level_field:${key}`);
      if (FORBIDDEN_EXTRA_FIELD_NAME_PATTERN.test(key)) {
        gaps.push(`forbidden_extra_field:${key}`);
      }
      scanUnsafeContractValues(record[key], gaps, `contract.${key}`);
    }
  }
}

function validateFalseFlags(record, gaps) {
  const falseFields = [
    "reviewed_evidence_created",
    "creates_evidence",
    "evidence_satisfied",
    "comparison_design_adequacy_satisfied",
    "diagnostics_evidence_satisfied",
    "governed_diagnostics_sufficiency_evidence_source_complete",
    "posterior_interpretation_authorized",
    "promotion_authorized"
  ];
  for (const field of falseFields) {
    if (record?.[field] !== false) gaps.push(`${field} must be false`);
  }
  for (const field of Object.keys(record?.blocked_outputs ?? {})) {
    if (!Object.hasOwn(BLOCKED_OUTPUTS, field)) {
      gaps.push(`blocked_outputs.${field} is not an allowed blocked output key`);
    }
  }
  for (const field of Object.keys(BLOCKED_OUTPUTS)) {
    if (record?.blocked_outputs?.[field] !== false) {
      gaps.push(`blocked_outputs.${field} must be present and false`);
    }
  }
  for (const field of Object.keys(record?.feeds ?? {})) {
    if (!Object.hasOwn(FEEDS, field)) {
      gaps.push(`feeds.${field} is not an allowed feed key`);
    }
  }
  for (const field of Object.keys(FEEDS)) {
    if (record?.feeds?.[field] !== false) {
      gaps.push(`feeds.${field} must be present and false`);
    }
  }
}

function validateBoundaryChecks(record, gaps) {
  const checks = record?.boundary_checks ?? {};
  for (const field of Object.keys(checks)) {
    if (!REQUIRED_BOUNDARY_CHECKS.includes(field)) {
      gaps.push(`boundary_checks.${field} is not an allowed boundary check key`);
      scanUnsafeContractValues(checks[field], gaps, `boundary_checks.${field}`);
      continue;
    }
    if (
      checks[field] !== null &&
      checks[field] !== undefined &&
      typeof checks[field] !== "string"
    ) {
      gaps.push(`boundary_checks.${field} must be a scalar string`);
      scanUnsafeContractValues(checks[field], gaps, `boundary_checks.${field}`);
    }
  }
  const ready = record?.collection_state === READY_STATE;
  if (!ready) return;
  for (const field of REQUIRED_BOUNDARY_CHECKS) {
    if (checks[field] !== "CLEAR") {
      gaps.push(`boundary_checks.${field} must be explicitly CLEAR for collected state`);
    }
  }
}

function validateNestedObjectKeys(record, gaps) {
  const milestoneSchedule = record?.milestone_schedule ?? {};
  for (const field of Object.keys(milestoneSchedule)) {
    if (!ALLOWED_MILESTONE_SCHEDULE_FIELDS.includes(field)) {
      gaps.push(`milestone_schedule.${field} is not an allowed milestone schedule key`);
      scanUnsafeContractValues(milestoneSchedule[field], gaps, `contract.milestone_schedule.${field}`);
    }
  }
  const milestoneRefs = milestoneSchedule.reviewer_owned_milestone_refs ?? {};
  if (
    milestoneRefs !== null &&
    milestoneRefs !== undefined &&
    (typeof milestoneRefs !== "object" || Array.isArray(milestoneRefs))
  ) {
    gaps.push("milestone_schedule.reviewer_owned_milestone_refs must be an object");
  } else {
    for (const [field, value] of Object.entries(milestoneRefs)) {
      if (!REQUIRED_APPROVED_MEASUREMENT_PLAN_MILESTONES.includes(field)) {
        gaps.push(
          `milestone_schedule.reviewer_owned_milestone_refs.${field} is not an allowed milestone ref key`
        );
        scanUnsafeContractValues(
          value,
          gaps,
          `milestone_schedule.reviewer_owned_milestone_refs.${field}`
        );
        continue;
      }
      if (value !== null && value !== undefined && typeof value !== "string") {
        gaps.push(
          `milestone_schedule.reviewer_owned_milestone_refs.${field} must be a scalar string`
        );
        scanUnsafeContractValues(
          value,
          gaps,
          `milestone_schedule.reviewer_owned_milestone_refs.${field}`
        );
      }
    }
  }

  const bayesianChainState = record?.bayesian_chain_state ?? {};
  for (const field of Object.keys(bayesianChainState)) {
    if (!ALLOWED_BAYESIAN_CHAIN_STATE_FIELDS.includes(field)) {
      gaps.push(`bayesian_chain_state.${field} is not an allowed Bayesian chain key`);
      scanUnsafeContractValues(bayesianChainState[field], gaps, `contract.bayesian_chain_state.${field}`);
    }
  }
}

function validateSourceBinding(record, options, gaps) {
  const ready = record?.collection_state === READY_STATE;
  if (ready && !options?.sourceComparisonDesignSourcePackagePreparationBinding) {
    gaps.push("ready collection validation requires sourceComparisonDesignSourcePackagePreparationBinding");
    return;
  }
  if (!options?.sourceComparisonDesignSourcePackagePreparationBinding) return;

  const sourceState = sourcePreparationState({
    sourceRecommendationPlan: options.sourceRecommendationPlan,
    sourceReviewerApprovedMeasurementPlan: options.sourceReviewerApprovedMeasurementPlan,
    sourceAggregateDataCollectionPlanningContract:
      options.sourceAggregateDataCollectionPlanningContract,
    sourceComparisonDesignSourcePackagePreparationBinding:
      options.sourceComparisonDesignSourcePackagePreparationBinding
  });
  if (!sourceState.valid) {
    gaps.push("sourceComparisonDesignSourcePackagePreparationBinding must validate for collection validation");
    return;
  }
  const source = options.sourceComparisonDesignSourcePackagePreparationBinding;
  if (
    record?.source_comparison_design_source_package_preparation_hash !==
    hashObject(source)
  ) {
    gaps.push("source_comparison_design_source_package_preparation_hash mismatch");
  }
  if (record?.source_comparison_design_source_package_preparation_state !== source.preparation_state) {
    gaps.push("source_comparison_design_source_package_preparation_state must match source preparation binding");
  }
  if (
    record?.source_comparison_design_source_package_preparation_allowed_next_step !==
    source.allowed_next_step
  ) {
    gaps.push("source_comparison_design_source_package_preparation_allowed_next_step must match source preparation binding");
  }

  const sourceProjectionBindings = [
    ["source_reviewer_approved_measurement_plan_ref", source.source_reviewer_approved_measurement_plan_ref],
    ["source_reviewer_approved_measurement_plan_hash", source.source_reviewer_approved_measurement_plan_hash],
    ["source_aggregate_data_collection_planning_ref", source.source_aggregate_data_collection_planning_ref],
    ["source_aggregate_data_collection_planning_hash", source.source_aggregate_data_collection_planning_hash],
    ["source_blueprint_hypothesis_ref", source.source_blueprint_hypothesis_ref],
    ["selected_metric_id", source.selected_metric_id],
    ["selected_metric_family", source.selected_metric_family],
    ["selected_measurement_unit", source.selected_measurement_unit],
    ["expected_movement_direction", source.expected_movement_direction],
    ["expected_lag_definition", source.expected_lag_definition]
  ];
  for (const [field, sourceValue] of sourceProjectionBindings) {
    if (record?.[field] !== sourceValue) {
      gaps.push(`${field} must match source preparation binding`);
    }
  }
}

function validatePackageBinding(record, options, gaps) {
  const ready = record?.collection_state === READY_STATE;
  if (ready && !options?.reviewerOwnedComparisonDesignSourcePackage) {
    gaps.push("ready collection validation requires reviewerOwnedComparisonDesignSourcePackage");
    return;
  }
  if (!options?.reviewerOwnedComparisonDesignSourcePackage) return;

  const packageGaps = [];
  const packageState = sanitizeReviewerOwnedPackage(
    options.reviewerOwnedComparisonDesignSourcePackage,
    packageGaps
  );
  packageGaps.push(...packageState.gaps.filter((gap) => !packageGaps.includes(gap)));
  validatePackageSourceAlignment(
    packageState.sanitized,
    options.sourceComparisonDesignSourcePackagePreparationBinding,
    packageGaps
  );
  packageState.valid = packageGaps.length === 0;
  packageState.gaps = packageGaps;
  if (!packageState.valid) {
    gaps.push("reviewerOwnedComparisonDesignSourcePackage must validate for collection validation");
    return;
  }
  const sourcePackage = options.reviewerOwnedComparisonDesignSourcePackage;
  if (record?.reviewer_owned_source_package_hash !== hashObject(sourcePackage)) {
    gaps.push("reviewer_owned_source_package_hash mismatch");
  }
  const fieldBindings = [
    "reviewer_owned_source_package_ref",
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
    "review_decision"
  ];
  for (const field of fieldBindings) {
    if (record?.[field] !== packageState.sanitized[field]) {
      gaps.push(`${field} must match reviewer-owned source package`);
    }
  }
  if (
    stableJson(record?.milestone_schedule?.reviewer_owned_milestone_refs ?? {}) !==
    stableJson(packageState.sanitized.milestone_schedule_confirmation_refs ?? {})
  ) {
    gaps.push("milestone_schedule.reviewer_owned_milestone_refs must match reviewer-owned source package");
  }
  if (
    stableJson(record?.boundary_checks ?? {}) !==
    stableJson(packageState.sanitized.boundary_checks ?? {})
  ) {
    gaps.push("boundary_checks must match reviewer-owned source package");
  }
}

function validateRequiredReadyFields(record, gaps) {
  if (record?.collection_state !== READY_STATE) return;
  const requiredFields = [
    "source_comparison_design_source_package_preparation_hash",
    "source_reviewer_approved_measurement_plan_ref",
    "source_aggregate_data_collection_planning_ref",
    "source_blueprint_hypothesis_ref",
    "selected_metric_id",
    "selected_metric_family",
    "selected_measurement_unit",
    "expected_movement_direction",
    "expected_lag_definition",
    "reviewer_owned_source_package_ref",
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
    "aggregate_measurement_cell_grain",
    "reviewer_role_ref",
    "review_decision"
  ];
  for (const field of requiredFields) {
    if (!stableString(record?.[field])) gaps.push(`ready collection missing ${field}`);
  }
  if (record?.source_package_collected !== true) {
    gaps.push("ready collection source_package_collected must be true");
  }
}

function validateBlockedClaims(record, gaps) {
  if (!Array.isArray(record?.blocked_claims)) {
    gaps.push("blocked_claims must be an array");
    return;
  }
  if (!hasEveryRequiredValue(record.blocked_claims, REQUIRED_BLOCKED_CLAIMS)) {
    gaps.push("blocked_claims must include every required blocked claim");
  }
  const allowed = new Set(REQUIRED_BLOCKED_CLAIMS);
  const seen = new Set();
  for (const claim of record.blocked_claims) {
    if (typeof claim !== "string") {
      gaps.push("blocked_claims entries must be strings");
      scanUnsafeContractValues(claim, gaps, "blocked_claims");
      continue;
    }
    if (seen.has(claim)) {
      gaps.push(`blocked_claims contains duplicate claim:${claim}`);
    }
    seen.add(claim);
    if (!allowed.has(claim)) {
      gaps.push(`blocked_claims contains unexpected claim:${claim}`);
      scanUnsafeContractValues(claim, gaps, `blocked_claims.${claim}`);
    }
  }
}

export function validateReviewerOwnedComparisonDesignSourcePackageCollection(record, options = {}) {
  const gaps = [];
  validateNoForbiddenExtraFields(record, gaps);
  if (
    record?.schema_version !==
    REVIEWER_OWNED_COMPARISON_DESIGN_SOURCE_PACKAGE_COLLECTION_SCHEMA_VERSION
  ) {
    gaps.push("schema_version is invalid");
  }
  if (record?.artifact_class !== "reviewer_owned_comparison_design_source_package_collection") {
    gaps.push("artifact_class is invalid");
  }
  if (record?.internal_only !== true) gaps.push("internal_only must be true");
  if (record?.aggregate_only !== true) gaps.push("aggregate_only must be true");
  if (record?.source_ref_only !== true) gaps.push("source_ref_only must be true");
  if (record?.fail_closed !== true) gaps.push("fail_closed must be true");
  if (record?.reviewer_owned_package_collection_only !== true) {
    gaps.push("reviewer_owned_package_collection_only must be true");
  }
  scanUnsafeContractValues(
    {
      source_comparison_design_source_package_preparation_hash:
        record?.source_comparison_design_source_package_preparation_hash,
      source_reviewer_approved_measurement_plan_ref:
        record?.source_reviewer_approved_measurement_plan_ref,
      source_aggregate_data_collection_planning_ref:
        record?.source_aggregate_data_collection_planning_ref,
      source_blueprint_hypothesis_ref: record?.source_blueprint_hypothesis_ref,
      selected_metric_id: record?.selected_metric_id,
      selected_metric_family: record?.selected_metric_family,
      selected_measurement_unit: record?.selected_measurement_unit,
      expected_movement_direction: record?.expected_movement_direction,
      expected_lag_definition: record?.expected_lag_definition,
      reviewer_owned_source_package_ref: record?.reviewer_owned_source_package_ref,
      business_function: record?.business_function,
      prioritized_use_case: record?.prioritized_use_case,
      workflow: record?.workflow,
      workflow_step: record?.workflow_step,
      cohort: record?.cohort,
      metric: record?.metric,
      evidence_source: record?.evidence_source,
      observation_window: record?.observation_window,
      governance_state: record?.governance_state,
      treatment_group_definition: record?.treatment_group_definition,
      comparison_group_definition: record?.comparison_group_definition,
      rollout_or_comparison_design_type: record?.rollout_or_comparison_design_type,
      baseline_source_posture: record?.baseline_source_posture,
      comparison_condition: record?.comparison_condition,
      baseline_window: record?.baseline_window,
      comparison_window: record?.comparison_window,
      expected_movement_direction: record?.expected_movement_direction,
      expected_lag_definition: record?.expected_lag_definition,
      aggregate_measurement_cell_grain: record?.aggregate_measurement_cell_grain,
      milestone_schedule: record?.milestone_schedule,
      boundary_checks: record?.boundary_checks,
      reviewer_role_ref: record?.reviewer_role_ref,
      review_decision: record?.review_decision
    },
    gaps
  );
  validateBlockedClaims(record, gaps);
  if (
    JSON.stringify(record?.atomic_evidence_grain_support ?? []) !==
    JSON.stringify(ATOMIC_EVIDENCE_GRAIN_SUPPORT)
  ) {
    gaps.push("atomic_evidence_grain_support must include the required aggregate grain fields");
  }
  if (
    JSON.stringify(record?.milestone_schedule?.required_milestones ?? []) !==
    JSON.stringify(REQUIRED_APPROVED_MEASUREMENT_PLAN_MILESTONES)
  ) {
    gaps.push("milestone_schedule must include T0/T30/T60/T90/T120/T180/T270/T365");
  }
  validateFalseFlags(record, gaps);
  validateBoundaryChecks(record, gaps);
  validateNestedObjectKeys(record, gaps);
  validateSourceBinding(record, options, gaps);
  validatePackageBinding(record, options, gaps);
  validateRequiredReadyFields(record, gaps);
  if (record?.bayesian_chain_state?.current_state !== BAYESIAN_CHAIN_HELD_STATE) {
    gaps.push("bayesian_chain_state.current_state must remain held");
  }
  if (record?.bayesian_chain_state?.allowed_next_step !== BAYESIAN_CHAIN_ALLOWED_NEXT_STEP) {
    gaps.push("bayesian_chain_state.allowed_next_step must remain governed diagnostics source completion");
  }
  if (record?.bayesian_chain_state?.changed_by_this_artifact !== false) {
    gaps.push("bayesian_chain_state.changed_by_this_artifact must be false");
  }
  if (record?.collection_state === READY_STATE) {
    if (record?.allowed_next_step !== READY_NEXT_STEP) {
      gaps.push("ready collection allowed_next_step is invalid");
    }
    if (record?.review_decision !== REQUIRED_REVIEW_DECISION) {
      gaps.push("ready collection review_decision must remain collected for review only");
    }
  } else if (Object.hasOwn(HELD_STATE_NEXT_STEPS, record?.collection_state)) {
    if (record?.source_package_collected !== false) {
      gaps.push("held collection source_package_collected must be false");
    }
    if (record?.reviewer_owned_source_package_hash !== null) {
      gaps.push("held collection reviewer_owned_source_package_hash must be null");
    }
    const expectedNextStep = HELD_STATE_NEXT_STEPS[record.collection_state];
    if (record?.allowed_next_step !== expectedNextStep) {
      gaps.push(`held collection allowed_next_step must match ${expectedNextStep}`);
    }
  } else {
    gaps.push("collection_state is invalid");
  }
  const ready = record?.collection_state === READY_STATE;
  if (record?.milestone_schedule?.collection_ready_for_review_only !== ready) {
    gaps.push("milestone_schedule.collection_ready_for_review_only must match ready state");
  }
  if (record?.collection_hash !== hashCollection(record ?? {})) {
    gaps.push("collection_hash mismatch");
  }
  return { valid: gaps.length === 0, gaps };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function main() {
  const inputPath = process.argv[2];
  const input = inputPath && inputPath !== "-" ? readJson(inputPath) : {};
  const record = buildReviewerOwnedComparisonDesignSourcePackageCollection({
    sourceRecommendationPlan: input.sourceRecommendationPlan ?? input.source_recommendation_plan,
    sourceReviewerApprovedMeasurementPlan:
      input.sourceReviewerApprovedMeasurementPlan ??
      input.source_reviewer_approved_measurement_plan,
    sourceAggregateDataCollectionPlanningContract:
      input.sourceAggregateDataCollectionPlanningContract ??
      input.source_aggregate_data_collection_planning_contract,
    sourceComparisonDesignSourcePackagePreparationBinding:
      input.sourceComparisonDesignSourcePackagePreparationBinding ??
      input.source_comparison_design_source_package_preparation_binding,
    reviewerOwnedComparisonDesignSourcePackage:
      input.reviewerOwnedComparisonDesignSourcePackage ??
      input.reviewer_owned_comparison_design_source_package
  });
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) {
  main();
}
