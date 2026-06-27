#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  REQUIRED_APPROVED_MEASUREMENT_PLAN_MILESTONES,
  validateReviewerApprovedMeasurementPlanContract
} from "./run_ai_value_reviewer_approved_measurement_plan_contract.mjs";
import {
  validateAggregateDataCollectionPlanningContract
} from "./run_ai_value_aggregate_data_collection_planning_contract.mjs";

export const COMPARISON_DESIGN_SOURCE_PACKAGE_PREPARATION_BINDING_SCHEMA_VERSION =
  "FT_AI_VALUE_COMPARISON_DESIGN_SOURCE_PACKAGE_PREPARATION_BINDING_2026_06";

const READY_STATE =
  "COMPARISON_DESIGN_SOURCE_PACKAGE_PREPARATION_READY_FOR_REVIEWER_COLLECTION";
const HOLD_REVIEWER_APPROVED_PLAN_STATE = "HELD_FOR_REVIEWER_APPROVED_MEASUREMENT_PLAN";
const HOLD_AGGREGATE_PLANNING_STATE =
  "HELD_FOR_AGGREGATE_DATA_COLLECTION_PLANNING_CONTRACT";
const READY_NEXT_STEP = "collect_reviewer_owned_comparison_design_source_package_only";
const HOLD_REVIEWER_APPROVED_PLAN_NEXT_STEP = "complete_reviewer_approved_measurement_plan";
const HOLD_AGGREGATE_PLANNING_NEXT_STEP = "complete_aggregate_data_collection_planning";
const SOURCE_AGGREGATE_PLANNING_READY_STATE =
  "AGGREGATE_DATA_COLLECTION_PLANNING_READY_FOR_COMPARISON_DESIGN_SOURCE_PACKAGE_PREPARATION";
const SOURCE_AGGREGATE_PLANNING_READY_NEXT_STEP = "prepare_comparison_design_source_package_only";
const SOURCE_REVIEWER_APPROVED_PLAN_READY_STATE =
  "REVIEWER_APPROVED_MEASUREMENT_PLAN_READY_FOR_AGGREGATE_DATA_COLLECTION_PLANNING";
const BAYESIAN_CHAIN_HELD_STATE = "HOLD_FOR_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE";
const BAYESIAN_CHAIN_ALLOWED_NEXT_STEP = "complete_governed_diagnostics_sufficiency_evidence_source";

const HELD_STATE_NEXT_STEPS = Object.freeze({
  [HOLD_REVIEWER_APPROVED_PLAN_STATE]: HOLD_REVIEWER_APPROVED_PLAN_NEXT_STEP,
  [HOLD_AGGREGATE_PLANNING_STATE]: HOLD_AGGREGATE_PLANNING_NEXT_STEP
});

const REVIEWER_COLLECTION_CHECKLIST = Object.freeze([
  "treatment_group_definition",
  "comparison_group_definition",
  "rollout_or_comparison_design_type",
  "baseline_window",
  "comparison_window",
  "metric_direction_lag_confirmation",
  "approved_expectation_path_blueprint_hypothesis_binding",
  "cohort_identity_confirmation",
  "workflow_function_identity_confirmation",
  "aggregate_measurement_cell_grain_confirmation",
  "milestone_schedule_confirmation_T0_T30_T60_T90_T120_T180_T270_T365",
  "suppression_missing_held_window_review",
  "cross_slice_aggregation_prohibition_check",
  "person_level_identifier_exclusion_check",
  "raw_rows_query_text_prompts_transcripts_exclusion_check",
  "causality_claim_exclusion_check",
  "roi_finance_productivity_economic_output_exclusion_check",
  "reviewer_role",
  "reviewer_decision_placeholder"
]);

const FORBIDDEN_INPUT_BOUNDARIES = Object.freeze([
  "no_raw_rows",
  "no_identifiers",
  "no_query_text",
  "no_prompts",
  "no_transcripts",
  "no_person_level_data",
  "no_live_connectors",
  "no_routes",
  "no_schemas",
  "no_persistence",
  "no_exports",
  "no_posterior_interpretation",
  "no_confidence_or_probability_output",
  "no_roi_finance_causality_productivity_or_economic_output",
  "no_customer_facing_economic_claim"
]);

const REQUIRED_BLOCKED_CLAIMS = Object.freeze([
  "preparation_artifact_is_not_reviewed_evidence",
  "reviewer_collection_checklist_is_not_attestation",
  "selected_metric_is_not_observed_outcome_data",
  "aggregate_data_planning_is_not_live_data_collection",
  "comparison_design_preparation_is_not_comparison_design_adequacy",
  "evidence_satisfaction",
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
  "export_creation",
  "comparison_design_adequacy_not_satisfied"
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
  reviewer_owned_comparison_design_source_package_collection: false,
  comparison_design_source_package_intake: false,
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
  "preparation_state",
  "artifact_class",
  "internal_only",
  "aggregate_only",
  "source_ref_only",
  "fail_closed",
  "planning_preparation_only",
  "source_reviewer_approved_measurement_plan_ref",
  "source_reviewer_approved_measurement_plan_hash",
  "source_reviewer_approved_measurement_plan_contract_hash",
  "source_aggregate_data_collection_planning_ref",
  "source_aggregate_data_collection_planning_hash",
  "source_aggregate_data_collection_planning_contract_hash",
  "source_blueprint_hypothesis_ref",
  "selected_metric_id",
  "selected_metric_family",
  "selected_measurement_unit",
  "expected_movement_direction",
  "expected_lag_definition",
  "milestone_schedule",
  "baseline_source_posture",
  "comparison_condition",
  "cohort_identity",
  "workflow_function_identity",
  "aggregate_measurement_cell_grain",
  "suppression_missing_held_precheck_posture",
  "aggregate_collection_plan_posture",
  "forbidden_input_boundaries",
  "blocked_claims",
  "reviewer_collection_checklist",
  "reviewer_role_placeholder",
  "review_decision_placeholder",
  "preparation_ready",
  "source_package_created",
  "reviewed_evidence_created",
  "creates_evidence",
  "evidence_satisfied",
  "comparison_design_adequacy_satisfied",
  "diagnostics_evidence_satisfied",
  "governed_diagnostics_sufficiency_evidence_source_complete",
  "posterior_interpretation_authorized",
  "promotion_authorized",
  "blocked_outputs",
  "feeds",
  "bayesian_chain_state",
  "gap_list",
  "allowed_next_step",
  "preparation_hash"
]);

const ALLOWED_AGGREGATE_COLLECTION_POSTURE_FIELDS = Object.freeze([
  "collection_owner_role_ref",
  "aggregate_source_posture_ref",
  "source_system_posture_ref",
  "aggregate_export_manifest_plan_ref",
  "measurement_cell_binding_plan_ref",
  "privacy_boundary_attestation_ref",
  "raw_data_exclusion_attestation_ref",
  "live_connector_exclusion_attestation_ref",
  "reviewer_decision_ref",
  "planning_state"
]);

const FORBIDDEN_EXTRA_FIELD_NAME_PATTERN =
  /(?:live[-_\s]?connector|route|ui|schema|persistence|export|raw|identifier|query|prompt|transcript|person|individual|team|evidence|diagnostic|promotion|posterior|confidence|probability|roi|finance|financial|economic|causal|causality|productivity|score|authorized|created|satisfied|observed|assessment)/i;

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
    /\b(reviewed[-_\s]?evidence|evidence[-_\s]?created|source[-_\s]?package[-_\s]?collected|attestation[-_\s]?complete|adequacy[-_\s]?satisfied|satisfied|unlocked)\b/i
  ]
];

const NON_REVIEWED_PROVENANCE_PATTERN =
  /(?:^|[\s_.-])(?:draft|local|pending|generated|fixture|template|runtime(?:_only|-only)?|source(?:_hash_only|-hash-only)|hash(?:_only|-only)|example|default)(?:$|[\s_.-])/i;

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

function hashPreparation(artifact) {
  const { preparation_hash, ...hashable } = artifact;
  return hashObject(hashable);
}

function cloneJson(value) {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value));
}

function containsForbiddenValue(value) {
  const raw = stableString(value);
  return FORBIDDEN_VALUE_PATTERNS.some(([, pattern]) => pattern.test(raw));
}

function safeScalar(value) {
  const raw = stableString(value);
  if (!raw || containsForbiddenValue(raw) || NON_REVIEWED_PROVENANCE_PATTERN.test(raw)) {
    return null;
  }
  return raw;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function reviewerApprovedPlanState(sourceReviewerApprovedMeasurementPlan, sourceRecommendationPlan) {
  if (!sourceReviewerApprovedMeasurementPlan) {
    return {
      valid: false,
      gaps: ["missing_source_reviewer_approved_measurement_plan"]
    };
  }
  if (!sourceRecommendationPlan) {
    return {
      valid: false,
      gaps: ["missing_source_recommendation_plan_for_reviewer_approved_measurement_plan_validation"]
    };
  }
  const validation = validateReviewerApprovedMeasurementPlanContract(
    sourceReviewerApprovedMeasurementPlan,
    { sourceRecommendationPlan }
  );
  if (!validation.valid) {
    return {
      valid: false,
      gaps: validation.gaps.map((gap) => `source_reviewer_approved_measurement_plan_invalid:${gap}`)
    };
  }
  if (sourceReviewerApprovedMeasurementPlan.contract_state !== SOURCE_REVIEWER_APPROVED_PLAN_READY_STATE) {
    return {
      valid: false,
      gaps: ["source_reviewer_approved_measurement_plan_not_ready"]
    };
  }
  return { valid: true, gaps: [] };
}

function aggregatePlanningState({
  sourceReviewerApprovedMeasurementPlan,
  sourceRecommendationPlan,
  sourceAggregateDataCollectionPlanningContract
}) {
  if (!sourceAggregateDataCollectionPlanningContract) {
    return {
      valid: false,
      gaps: ["missing_source_aggregate_data_collection_planning_contract"]
    };
  }
  const validation = validateAggregateDataCollectionPlanningContract(
    sourceAggregateDataCollectionPlanningContract,
    { sourceReviewerApprovedMeasurementPlan, sourceRecommendationPlan }
  );
  if (!validation.valid) {
    return {
      valid: false,
      gaps: validation.gaps.map((gap) => `source_aggregate_data_collection_planning_invalid:${gap}`)
    };
  }
  if (sourceAggregateDataCollectionPlanningContract.contract_state !== SOURCE_AGGREGATE_PLANNING_READY_STATE) {
    return {
      valid: false,
      gaps: ["source_aggregate_data_collection_planning_not_ready"]
    };
  }
  if (sourceAggregateDataCollectionPlanningContract.allowed_next_step !== SOURCE_AGGREGATE_PLANNING_READY_NEXT_STEP) {
    return {
      valid: false,
      gaps: ["source_aggregate_data_collection_planning_next_step_not_preparation"]
    };
  }
  return { valid: true, gaps: [] };
}

function baseArtifact({
  sourceReviewerApprovedMeasurementPlan,
  sourceAggregateDataCollectionPlanningContract,
  preparationState,
  allowedNextStep,
  gaps
}) {
  const ready = preparationState === READY_STATE;
  const approvedMetric = sourceReviewerApprovedMeasurementPlan?.approved_selected_metric ?? {};
  const expectationPath = sourceReviewerApprovedMeasurementPlan?.approved_expectation_path ?? {};
  const baselineAndComparison =
    sourceReviewerApprovedMeasurementPlan?.approved_baseline_and_comparison ?? {};
  const approvedScope = sourceReviewerApprovedMeasurementPlan?.approved_scope ?? {};
  const approvedSchedule = sourceReviewerApprovedMeasurementPlan?.approved_milestone_schedule ?? {};
  const collectionSchedule =
    sourceAggregateDataCollectionPlanningContract?.planned_collection_schedule ?? {};
  const collectionReview =
    sourceAggregateDataCollectionPlanningContract?.collection_review ?? {};

  const artifact = {
    schema_version: COMPARISON_DESIGN_SOURCE_PACKAGE_PREPARATION_BINDING_SCHEMA_VERSION,
    preparation_state: preparationState,
    artifact_class: "comparison_design_source_package_preparation_binding",
    internal_only: true,
    aggregate_only: true,
    source_ref_only: true,
    fail_closed: true,
    planning_preparation_only: true,
    source_reviewer_approved_measurement_plan_ref:
      safeScalar(sourceReviewerApprovedMeasurementPlan?.reviewer_approved_measurement_plan_ref),
    source_reviewer_approved_measurement_plan_hash: sourceReviewerApprovedMeasurementPlan
      ? hashObject(sourceReviewerApprovedMeasurementPlan)
      : null,
    source_reviewer_approved_measurement_plan_contract_hash:
      sourceReviewerApprovedMeasurementPlan?.contract_hash ?? null,
    source_aggregate_data_collection_planning_ref:
      safeScalar(sourceAggregateDataCollectionPlanningContract?.aggregate_data_collection_plan_ref),
    source_aggregate_data_collection_planning_hash: sourceAggregateDataCollectionPlanningContract
      ? hashObject(sourceAggregateDataCollectionPlanningContract)
      : null,
    source_aggregate_data_collection_planning_contract_hash:
      sourceAggregateDataCollectionPlanningContract?.contract_hash ?? null,
    source_blueprint_hypothesis_ref:
      safeScalar(sourceReviewerApprovedMeasurementPlan?.source_blueprint_hypothesis_ref) ??
      safeScalar(sourceReviewerApprovedMeasurementPlan?.source_recommendation_plan_ref),
    selected_metric_id: safeScalar(approvedMetric.selected_metric_id),
    selected_metric_family: safeScalar(approvedMetric.selected_metric_family),
    selected_measurement_unit: safeScalar(approvedMetric.selected_measurement_unit),
    expected_movement_direction: safeScalar(expectationPath.expected_movement_direction),
    expected_lag_definition: safeScalar(expectationPath.expected_lag_definition),
    milestone_schedule: {
      required_milestones: [...REQUIRED_APPROVED_MEASUREMENT_PLAN_MILESTONES],
      approved_milestone_window_refs: cloneJson(approvedSchedule.milestone_window_refs ?? {}),
      planned_collection_window_refs: cloneJson(collectionSchedule.planned_collection_window_refs ?? {}),
      prepared_for_reviewer_collection: ready
    },
    baseline_source_posture: safeScalar(baselineAndComparison.baseline_value_source_ref),
    comparison_condition: safeScalar(baselineAndComparison.comparison_condition_ref),
    cohort_identity: safeScalar(approvedScope.cohort_identity),
    workflow_function_identity: safeScalar(approvedScope.workflow_function_identity),
    aggregate_measurement_cell_grain: safeScalar(approvedScope.aggregate_measurement_cell_grain),
    suppression_missing_held_precheck_posture:
      safeScalar(collectionReview.suppression_missing_held_collection_precheck_posture) ??
      safeScalar(approvedScope.suppression_missing_held_precheck_posture),
    aggregate_collection_plan_posture: {
      collection_owner_role_ref:
        safeScalar(sourceAggregateDataCollectionPlanningContract?.collection_owner_role_ref),
      aggregate_source_posture_ref:
        safeScalar(sourceAggregateDataCollectionPlanningContract?.aggregate_source_posture_ref),
      source_system_posture_ref:
        safeScalar(sourceAggregateDataCollectionPlanningContract?.source_system_posture_ref),
      aggregate_export_manifest_plan_ref:
        safeScalar(sourceAggregateDataCollectionPlanningContract?.aggregate_export_manifest_plan_ref),
      measurement_cell_binding_plan_ref:
        safeScalar(sourceAggregateDataCollectionPlanningContract?.measurement_cell_binding_plan_ref),
      privacy_boundary_attestation_ref:
        safeScalar(collectionReview.privacy_boundary_attestation_ref),
      raw_data_exclusion_attestation_ref:
        safeScalar(collectionReview.raw_data_exclusion_attestation_ref),
      live_connector_exclusion_attestation_ref:
        safeScalar(collectionReview.live_connector_exclusion_attestation_ref),
      reviewer_decision_ref: safeScalar(collectionReview.reviewer_decision_ref),
      planning_state: safeScalar(collectionReview.planning_state)
    },
    forbidden_input_boundaries: [...FORBIDDEN_INPUT_BOUNDARIES],
    blocked_claims: [...REQUIRED_BLOCKED_CLAIMS],
    reviewer_collection_checklist: [...REVIEWER_COLLECTION_CHECKLIST],
    reviewer_role_placeholder: "reviewer_role_to_be_supplied_by_governance_reviewer",
    review_decision_placeholder: "review_decision_to_be_supplied_later_by_reviewer",
    preparation_ready: ready,
    source_package_created: false,
    reviewed_evidence_created: false,
    creates_evidence: false,
    evidence_satisfied: false,
    comparison_design_adequacy_satisfied: false,
    diagnostics_evidence_satisfied: false,
    governed_diagnostics_sufficiency_evidence_source_complete: false,
    posterior_interpretation_authorized: false,
    promotion_authorized: false,
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
  artifact.preparation_hash = hashPreparation(artifact);
  return artifact;
}

export function buildComparisonDesignSourcePackagePreparationBinding({
  sourceRecommendationPlan,
  sourceReviewerApprovedMeasurementPlan,
  sourceAggregateDataCollectionPlanningContract
} = {}) {
  const reviewerState = reviewerApprovedPlanState(
    sourceReviewerApprovedMeasurementPlan,
    sourceRecommendationPlan
  );
  const gaps = [...reviewerState.gaps];
  let aggregateState = { valid: false, gaps: [] };
  if (reviewerState.valid) {
    aggregateState = aggregatePlanningState({
      sourceReviewerApprovedMeasurementPlan,
      sourceRecommendationPlan,
      sourceAggregateDataCollectionPlanningContract
    });
    gaps.push(...aggregateState.gaps);
  }

  let preparationState = READY_STATE;
  let allowedNextStep = READY_NEXT_STEP;
  if (!reviewerState.valid) {
    preparationState = HOLD_REVIEWER_APPROVED_PLAN_STATE;
    allowedNextStep = HOLD_REVIEWER_APPROVED_PLAN_NEXT_STEP;
  } else if (!aggregateState.valid) {
    preparationState = HOLD_AGGREGATE_PLANNING_STATE;
    allowedNextStep = HOLD_AGGREGATE_PLANNING_NEXT_STEP;
  }

  return baseArtifact({
    sourceReviewerApprovedMeasurementPlan,
    sourceAggregateDataCollectionPlanningContract,
    preparationState,
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

function validateNoForbiddenExtraFields(artifact, gaps) {
  if (!artifact || typeof artifact !== "object") return;
  for (const key of Object.keys(artifact)) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(key)) {
      gaps.push(`unexpected_top_level_field:${key}`);
      if (FORBIDDEN_EXTRA_FIELD_NAME_PATTERN.test(key)) {
        gaps.push(`forbidden_extra_field:${key}`);
      }
      scanUnsafeContractValues(artifact[key], gaps, `contract.${key}`);
    }
  }
}

function validateFalseFlags(artifact, gaps) {
  const falseFields = [
    "source_package_created",
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
    if (artifact?.[field] !== false) gaps.push(`${field} must be false`);
  }
  for (const field of Object.keys(artifact?.blocked_outputs ?? {})) {
    if (!Object.hasOwn(BLOCKED_OUTPUTS, field)) {
      gaps.push(`blocked_outputs.${field} is not an allowed blocked output key`);
    }
  }
  for (const field of Object.keys(BLOCKED_OUTPUTS)) {
    if (artifact?.blocked_outputs?.[field] !== false) {
      gaps.push(`blocked_outputs.${field} must be present and false`);
    }
  }
  for (const field of Object.keys(artifact?.feeds ?? {})) {
    if (!Object.hasOwn(FEEDS, field)) {
      gaps.push(`feeds.${field} is not an allowed feed key`);
    }
  }
  for (const field of Object.keys(FEEDS)) {
    if (artifact?.feeds?.[field] !== false) {
      gaps.push(`feeds.${field} must be present and false`);
    }
  }
}

function validateAggregateCollectionPostureKeys(artifact, gaps) {
  const posture = artifact?.aggregate_collection_plan_posture ?? {};
  for (const field of Object.keys(posture)) {
    if (!ALLOWED_AGGREGATE_COLLECTION_POSTURE_FIELDS.includes(field)) {
      gaps.push(
        `aggregate_collection_plan_posture.${field} is not an allowed aggregate collection posture key`
      );
    }
  }
}

function validateSourceBindings(artifact, options, gaps) {
  const ready = artifact?.preparation_state === READY_STATE;
  if (ready && !options?.sourceReviewerApprovedMeasurementPlan) {
    gaps.push("ready preparation validation requires sourceReviewerApprovedMeasurementPlan");
    return;
  }
  if (ready && !options?.sourceAggregateDataCollectionPlanningContract) {
    gaps.push("ready preparation validation requires sourceAggregateDataCollectionPlanningContract");
    return;
  }
  if (!options?.sourceReviewerApprovedMeasurementPlan) return;

  const reviewerState = reviewerApprovedPlanState(
    options.sourceReviewerApprovedMeasurementPlan,
    options.sourceRecommendationPlan
  );
  if (!reviewerState.valid) {
    gaps.push("sourceReviewerApprovedMeasurementPlan must validate for preparation validation");
    return;
  }

  const reviewerSource = options.sourceReviewerApprovedMeasurementPlan;
  if (artifact?.source_reviewer_approved_measurement_plan_hash !== hashObject(reviewerSource)) {
    gaps.push("source_reviewer_approved_measurement_plan_hash mismatch");
  }
  if (artifact?.source_reviewer_approved_measurement_plan_contract_hash !== reviewerSource.contract_hash) {
    gaps.push("source_reviewer_approved_measurement_plan_contract_hash mismatch");
  }
  if (
    artifact?.source_reviewer_approved_measurement_plan_ref !==
    reviewerSource.reviewer_approved_measurement_plan_ref
  ) {
    gaps.push("source_reviewer_approved_measurement_plan_ref must match source reviewer-approved measurement plan");
  }

  const sourceProjectionBindings = [
    ["source_blueprint_hypothesis_ref", reviewerSource.source_blueprint_hypothesis_ref],
    ["selected_metric_id", reviewerSource.approved_selected_metric?.selected_metric_id],
    ["selected_metric_family", reviewerSource.approved_selected_metric?.selected_metric_family],
    ["selected_measurement_unit", reviewerSource.approved_selected_metric?.selected_measurement_unit],
    [
      "expected_movement_direction",
      reviewerSource.approved_expectation_path?.expected_movement_direction
    ],
    ["expected_lag_definition", reviewerSource.approved_expectation_path?.expected_lag_definition],
    [
      "baseline_source_posture",
      reviewerSource.approved_baseline_and_comparison?.baseline_value_source_ref
    ],
    [
      "comparison_condition",
      reviewerSource.approved_baseline_and_comparison?.comparison_condition_ref
    ],
    ["cohort_identity", reviewerSource.approved_scope?.cohort_identity],
    ["workflow_function_identity", reviewerSource.approved_scope?.workflow_function_identity],
    ["aggregate_measurement_cell_grain", reviewerSource.approved_scope?.aggregate_measurement_cell_grain]
  ];
  for (const [field, sourceValue] of sourceProjectionBindings) {
    if (artifact?.[field] !== sourceValue) {
      gaps.push(`${field} must match source reviewer-approved measurement plan`);
    }
  }
  if (
    stableJson(artifact?.milestone_schedule?.approved_milestone_window_refs ?? {}) !==
    stableJson(reviewerSource.approved_milestone_schedule?.milestone_window_refs ?? {})
  ) {
    gaps.push(
      "milestone_schedule.approved_milestone_window_refs must match source reviewer-approved measurement plan"
    );
  }

  if (!options?.sourceAggregateDataCollectionPlanningContract) return;
  const aggregateState = aggregatePlanningState({
    sourceReviewerApprovedMeasurementPlan: options.sourceReviewerApprovedMeasurementPlan,
    sourceRecommendationPlan: options.sourceRecommendationPlan,
    sourceAggregateDataCollectionPlanningContract:
      options.sourceAggregateDataCollectionPlanningContract
  });
  if (!aggregateState.valid) {
    gaps.push("sourceAggregateDataCollectionPlanningContract must validate for preparation validation");
    return;
  }

  const aggregateSource = options.sourceAggregateDataCollectionPlanningContract;
  if (artifact?.source_aggregate_data_collection_planning_hash !== hashObject(aggregateSource)) {
    gaps.push("source_aggregate_data_collection_planning_hash mismatch");
  }
  if (artifact?.source_aggregate_data_collection_planning_contract_hash !== aggregateSource.contract_hash) {
    gaps.push("source_aggregate_data_collection_planning_contract_hash mismatch");
  }
  if (artifact?.source_aggregate_data_collection_planning_ref !== aggregateSource.aggregate_data_collection_plan_ref) {
    gaps.push("source_aggregate_data_collection_planning_ref must match source aggregate planning contract");
  }
  if (
    artifact?.suppression_missing_held_precheck_posture !==
    aggregateSource.collection_review?.suppression_missing_held_collection_precheck_posture
  ) {
    gaps.push("suppression_missing_held_precheck_posture must match source aggregate planning contract");
  }
  const aggregatePostureBindings = [
    ["collection_owner_role_ref", aggregateSource.collection_owner_role_ref],
    ["aggregate_source_posture_ref", aggregateSource.aggregate_source_posture_ref],
    ["source_system_posture_ref", aggregateSource.source_system_posture_ref],
    ["aggregate_export_manifest_plan_ref", aggregateSource.aggregate_export_manifest_plan_ref],
    ["measurement_cell_binding_plan_ref", aggregateSource.measurement_cell_binding_plan_ref],
    [
      "privacy_boundary_attestation_ref",
      aggregateSource.collection_review?.privacy_boundary_attestation_ref
    ],
    [
      "raw_data_exclusion_attestation_ref",
      aggregateSource.collection_review?.raw_data_exclusion_attestation_ref
    ],
    [
      "live_connector_exclusion_attestation_ref",
      aggregateSource.collection_review?.live_connector_exclusion_attestation_ref
    ],
    ["reviewer_decision_ref", aggregateSource.collection_review?.reviewer_decision_ref],
    ["planning_state", aggregateSource.collection_review?.planning_state]
  ];
  for (const [field, sourceValue] of aggregatePostureBindings) {
    if (artifact?.aggregate_collection_plan_posture?.[field] !== sourceValue) {
      gaps.push(
        `aggregate_collection_plan_posture.${field} must match source aggregate planning contract`
      );
    }
  }
  if (
    stableJson(artifact?.milestone_schedule?.planned_collection_window_refs ?? {}) !==
    stableJson(aggregateSource.planned_collection_schedule?.planned_collection_window_refs ?? {})
  ) {
    gaps.push("milestone_schedule.planned_collection_window_refs must match source aggregate planning contract");
  }
}

function validateRequiredReadyFields(artifact, gaps) {
  if (artifact?.preparation_state !== READY_STATE) return;
  const requiredScalarFields = [
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
    "baseline_source_posture",
    "comparison_condition",
    "cohort_identity",
    "workflow_function_identity",
    "aggregate_measurement_cell_grain",
    "suppression_missing_held_precheck_posture",
    "reviewer_role_placeholder",
    "review_decision_placeholder"
  ];
  for (const field of requiredScalarFields) {
    if (!stableString(artifact?.[field])) gaps.push(`ready preparation missing ${field}`);
  }
}

export function validateComparisonDesignSourcePackagePreparationBinding(artifact, options = {}) {
  const gaps = [];
  validateNoForbiddenExtraFields(artifact, gaps);
  if (artifact?.schema_version !== COMPARISON_DESIGN_SOURCE_PACKAGE_PREPARATION_BINDING_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  if (artifact?.artifact_class !== "comparison_design_source_package_preparation_binding") {
    gaps.push("artifact_class is invalid");
  }
  if (artifact?.internal_only !== true) gaps.push("internal_only must be true");
  if (artifact?.aggregate_only !== true) gaps.push("aggregate_only must be true");
  if (artifact?.source_ref_only !== true) gaps.push("source_ref_only must be true");
  if (artifact?.fail_closed !== true) gaps.push("fail_closed must be true");
  if (artifact?.planning_preparation_only !== true) gaps.push("planning_preparation_only must be true");
  scanUnsafeContractValues(
    {
      source_reviewer_approved_measurement_plan_ref:
        artifact?.source_reviewer_approved_measurement_plan_ref,
      source_aggregate_data_collection_planning_ref:
        artifact?.source_aggregate_data_collection_planning_ref,
      source_blueprint_hypothesis_ref: artifact?.source_blueprint_hypothesis_ref,
      selected_metric_id: artifact?.selected_metric_id,
      selected_metric_family: artifact?.selected_metric_family,
      selected_measurement_unit: artifact?.selected_measurement_unit,
      expected_movement_direction: artifact?.expected_movement_direction,
      expected_lag_definition: artifact?.expected_lag_definition,
      baseline_source_posture: artifact?.baseline_source_posture,
      comparison_condition: artifact?.comparison_condition,
      cohort_identity: artifact?.cohort_identity,
      workflow_function_identity: artifact?.workflow_function_identity,
      aggregate_measurement_cell_grain: artifact?.aggregate_measurement_cell_grain,
      suppression_missing_held_precheck_posture:
        artifact?.suppression_missing_held_precheck_posture,
      aggregate_collection_plan_posture: artifact?.aggregate_collection_plan_posture,
      reviewer_role_placeholder: artifact?.reviewer_role_placeholder,
      review_decision_placeholder: artifact?.review_decision_placeholder
    },
    gaps
  );
  if (!hasEveryRequiredValue(artifact?.blocked_claims, REQUIRED_BLOCKED_CLAIMS)) {
    gaps.push("blocked_claims must include every required blocked claim");
  }
  if (!hasEveryRequiredValue(artifact?.forbidden_input_boundaries, FORBIDDEN_INPUT_BOUNDARIES)) {
    gaps.push("forbidden_input_boundaries must include every required boundary");
  }
  for (const item of REVIEWER_COLLECTION_CHECKLIST) {
    if (!Array.isArray(artifact?.reviewer_collection_checklist) || !artifact.reviewer_collection_checklist.includes(item)) {
      gaps.push(`reviewer_collection_checklist missing ${item}`);
    }
  }
  for (const item of artifact?.reviewer_collection_checklist ?? []) {
    if (!REVIEWER_COLLECTION_CHECKLIST.includes(item)) {
      gaps.push(`reviewer_collection_checklist contains unexpected item ${item}`);
    }
  }
  if (
    JSON.stringify(artifact?.milestone_schedule?.required_milestones ?? []) !==
    JSON.stringify(REQUIRED_APPROVED_MEASUREMENT_PLAN_MILESTONES)
  ) {
    gaps.push("milestone_schedule must include T0/T30/T60/T90/T120/T180/T270/T365");
  }
  validateFalseFlags(artifact, gaps);
  validateAggregateCollectionPostureKeys(artifact, gaps);
  validateSourceBindings(artifact, options, gaps);
  validateRequiredReadyFields(artifact, gaps);
  if (artifact?.bayesian_chain_state?.current_state !== BAYESIAN_CHAIN_HELD_STATE) {
    gaps.push("bayesian_chain_state.current_state must remain held");
  }
  if (artifact?.bayesian_chain_state?.allowed_next_step !== BAYESIAN_CHAIN_ALLOWED_NEXT_STEP) {
    gaps.push("bayesian_chain_state.allowed_next_step must remain governed diagnostics source completion");
  }
  if (artifact?.bayesian_chain_state?.changed_by_this_artifact !== false) {
    gaps.push("bayesian_chain_state.changed_by_this_artifact must be false");
  }
  if (artifact?.preparation_state === READY_STATE) {
    if (artifact?.allowed_next_step !== READY_NEXT_STEP) {
      gaps.push("ready preparation allowed_next_step is invalid");
    }
    if (artifact?.preparation_ready !== true) {
      gaps.push("ready preparation preparation_ready must be true");
    }
  } else if (Object.hasOwn(HELD_STATE_NEXT_STEPS, artifact?.preparation_state)) {
    if (artifact?.preparation_ready !== false) {
      gaps.push("held preparation preparation_ready must be false");
    }
    const expectedNextStep = HELD_STATE_NEXT_STEPS[artifact.preparation_state];
    if (artifact?.allowed_next_step !== expectedNextStep) {
      gaps.push(`held preparation allowed_next_step must match ${expectedNextStep}`);
    }
  } else {
    gaps.push("preparation_state is invalid");
  }
  const ready = artifact?.preparation_state === READY_STATE;
  if (artifact?.milestone_schedule?.prepared_for_reviewer_collection !== ready) {
    gaps.push("milestone_schedule.prepared_for_reviewer_collection must match ready state");
  }
  if (artifact?.preparation_hash !== hashPreparation(artifact ?? {})) {
    gaps.push("preparation_hash mismatch");
  }
  return { valid: gaps.length === 0, gaps };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function main() {
  const inputPath = process.argv[2];
  const input = inputPath && inputPath !== "-" ? readJson(inputPath) : {};
  const artifact = buildComparisonDesignSourcePackagePreparationBinding({
    sourceRecommendationPlan: input.sourceRecommendationPlan ?? input.source_recommendation_plan,
    sourceReviewerApprovedMeasurementPlan:
      input.sourceReviewerApprovedMeasurementPlan ??
      input.source_reviewer_approved_measurement_plan,
    sourceAggregateDataCollectionPlanningContract:
      input.sourceAggregateDataCollectionPlanningContract ??
      input.source_aggregate_data_collection_planning_contract
  });
  process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) {
  main();
}
