#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  buildHypothesisToMetricRecommendationPlan,
  validateHypothesisToMetricRecommendationPlan
} from "./run_ai_value_hypothesis_to_metric_recommendation.mjs";

export const REVIEWER_APPROVED_MEASUREMENT_PLAN_SCHEMA_VERSION =
  "FT_AI_VALUE_REVIEWER_APPROVED_MEASUREMENT_PLAN_CONTRACT_2026_06";

export const REQUIRED_APPROVED_MEASUREMENT_PLAN_MILESTONES = [
  "T0_baseline",
  "T30",
  "T60",
  "T90",
  "T120",
  "T180_6_month",
  "T270_9_month",
  "T365_12_month"
];

const READY_STATE =
  "REVIEWER_APPROVED_MEASUREMENT_PLAN_READY_FOR_AGGREGATE_DATA_COLLECTION_PLANNING";
const HOLD_BLUEPRINT_STATE = "HELD_FOR_BLUEPRINT_HYPOTHESIS";
const HOLD_RECOMMENDATION_STATE = "HELD_FOR_CANDIDATE_METRIC_RECOMMENDATION";
const HOLD_APPROVAL_STATE = "HELD_FOR_REVIEWER_APPROVED_MEASUREMENT_PLAN";
const READY_DATA_COLLECTION_STATE = "READY_FOR_AGGREGATE_DATA_COLLECTION_PLANNING_ONLY";
const HOLD_APPROVAL_DATA_COLLECTION_STATE = "HELD_FOR_REVIEWER_APPROVED_MEASUREMENT_PLAN";
const HOLD_MILESTONE_DATA_COLLECTION_STATE = "HELD_FOR_AGGREGATE_MILESTONE_SCHEDULE";
const READY_NEXT_STEP = "aggregate_data_collection_planning_only";
const HOLD_APPROVAL_NEXT_STEP = "complete_reviewer_approved_measurement_plan";
const HOLD_RECOMMENDATION_NEXT_STEP = "complete_candidate_metric_recommendation";
const HOLD_BLUEPRINT_NEXT_STEP = "complete_blueprint_hypothesis";
const BAYESIAN_CHAIN_HELD_STATE = "HOLD_FOR_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE";
const BAYESIAN_CHAIN_ALLOWED_NEXT_STEP = "complete_governed_diagnostics_sufficiency_evidence_source";
const REQUIRED_APPROVAL_STATE = "APPROVED_FOR_AGGREGATE_DATA_COLLECTION_PLANNING";

const REQUIRED_REVIEWER_APPROVAL_FIELDS = [
  "reviewer_approved_measurement_plan_ref",
  "source_blueprint_hypothesis_ref",
  "source_candidate_metric_recommendation_ref",
  "selected_metric_id",
  "selected_metric_family",
  "selected_measurement_unit",
  "metric_owner_role_ref",
  "expected_movement_direction",
  "expected_lag_definition",
  "baseline_value_source_ref",
  "comparison_condition_ref",
  "milestone_schedule_ref",
  "cohort_identity",
  "workflow_function_identity",
  "aggregate_measurement_cell_grain",
  "suppression_missing_held_precheck_posture",
  "approval_state",
  "approval_role_ref",
  "reviewer_decision_ref"
];

const REQUIRED_BLOCKED_CLAIMS = [
  "candidate_recommendation_is_not_evidence",
  "approved_measurement_plan_is_not_observed_data",
  "measurement_spec_is_not_bayesian_readiness",
  "diagnostics_evidence_satisfaction",
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
  aggregate_data_collection_planning: false,
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

function containsForbiddenValue(value) {
  const raw = stableString(value);
  return FORBIDDEN_VALUE_PATTERNS.some(([, pattern]) => pattern.test(raw));
}

function safeScalar(value) {
  const raw = stableString(value);
  if (!raw || containsForbiddenValue(raw)) return null;
  return raw;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
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

function hashContract(contract) {
  const { contract_hash, ...hashable } = contract;
  return hashObject(hashable);
}

function sanitizeApproval(reviewerApproval = {}, gaps) {
  const sanitized = {};
  for (const field of REQUIRED_REVIEWER_APPROVAL_FIELDS) {
    const raw = stableString(reviewerApproval[field]);
    if (!raw) {
      sanitized[field] = null;
      gaps.push(`missing_${field}`);
      continue;
    }
    if (containsForbiddenValue(raw)) {
      sanitized[field] = null;
      gaps.push(`unsafe_${field}`);
      continue;
    }
    if (NON_REVIEWED_PROVENANCE_PATTERN.test(raw)) {
      sanitized[field] = null;
      gaps.push(`non_reviewed_approval_provenance:${field}`);
      continue;
    }
    sanitized[field] = raw;
  }

  const milestoneWindowRefs = {};
  const sourceMilestoneRefs =
    reviewerApproval?.milestone_window_refs && typeof reviewerApproval.milestone_window_refs === "object"
      ? reviewerApproval.milestone_window_refs
      : {};
  for (const milestone of REQUIRED_APPROVED_MEASUREMENT_PLAN_MILESTONES) {
    const raw = stableString(sourceMilestoneRefs[milestone]);
    if (!raw) {
      milestoneWindowRefs[milestone] = null;
      gaps.push(`missing_milestone_window_ref:${milestone}`);
      continue;
    }
    if (containsForbiddenValue(raw)) {
      milestoneWindowRefs[milestone] = null;
      gaps.push(`unsafe_milestone_window_ref:${milestone}`);
      continue;
    }
    if (NON_REVIEWED_PROVENANCE_PATTERN.test(raw)) {
      milestoneWindowRefs[milestone] = null;
      gaps.push(`non_reviewed_approval_provenance:milestone_window_ref:${milestone}`);
      continue;
    }
    if (NON_READY_WINDOW_REF_PATTERN.test(raw)) {
      milestoneWindowRefs[milestone] = null;
      gaps.push(`non_ready_milestone_window_ref:${milestone}`);
      continue;
    }
    milestoneWindowRefs[milestone] = raw;
  }
  sanitized.milestone_window_refs = milestoneWindowRefs;
  return sanitized;
}

function sourcePlanState(sourceRecommendationPlan) {
  if (!sourceRecommendationPlan) {
    return {
      valid: false,
      state: HOLD_BLUEPRINT_STATE,
      gaps: ["missing_source_recommendation_plan"]
    };
  }
  const validation = validateHypothesisToMetricRecommendationPlan(sourceRecommendationPlan);
  if (!validation.valid) {
    return {
      valid: false,
      state: String(sourceRecommendationPlan?.planning_state ?? "").includes("BLUEPRINT")
        ? HOLD_BLUEPRINT_STATE
        : HOLD_RECOMMENDATION_STATE,
      gaps: validation.gaps.map((gap) => `source_recommendation_plan_invalid:${gap}`)
    };
  }
  if (sourceRecommendationPlan.recommendation_state !== "CANDIDATE_RECOMMENDATIONS_ONLY_NOT_EVIDENCE") {
    return {
      valid: false,
      state: HOLD_RECOMMENDATION_STATE,
      gaps: ["source_recommendation_plan_not_recommendation_ready"]
    };
  }
  return { valid: true, state: null, gaps: [] };
}

function findSourceRecommendation(sourceRecommendationPlan, recommendationRef) {
  return (sourceRecommendationPlan?.candidate_metric_recommendations ?? []).find(
    (candidate) => candidate.recommendation_ref === recommendationRef
  );
}

function candidateMatchGaps(sourceRecommendation, approval) {
  const gaps = [];
  if (!sourceRecommendation) {
    gaps.push("source_candidate_metric_recommendation_ref_not_found");
    return gaps;
  }
  const comparisons = [
    ["selected_metric_id", "candidate_metric_id"],
    ["selected_metric_family", "candidate_metric_family"],
    ["selected_measurement_unit", "measurement_unit"],
    ["metric_owner_role_ref", "metric_owner_role_ref"]
  ];
  for (const [approvalField, recommendationField] of comparisons) {
    if (!stableString(approval[approvalField])) continue;
    if (approval[approvalField] !== sourceRecommendation[recommendationField]) {
      gaps.push(`${approvalField}_mismatch`);
    }
  }
  return gaps;
}

function baseContract({
  sourceRecommendationPlan,
  reviewerApproval,
  sanitizedApproval,
  sourceRecommendation,
  contractState,
  dataCollectionReadinessState,
  allowedNextStep,
  gaps
}) {
  const sourcePlanRef = safeScalar(sourceRecommendationPlan?.blueprint_hypothesis_ref);
  const sourcePlanHash = sourceRecommendationPlan ? hashObject(sourceRecommendationPlan) : null;
  const sourceRecommendationHash = sourceRecommendation ? hashObject(sourceRecommendation) : null;
  const milestoneMissing = gaps.some((gap) => gap.startsWith("missing_milestone_window_ref"));
  const ready = contractState === READY_STATE;

  const contract = {
    schema_version: REVIEWER_APPROVED_MEASUREMENT_PLAN_SCHEMA_VERSION,
    contract_state: contractState,
    contract_class: "reviewer_approved_measurement_plan_contract",
    internal_only: true,
    aggregate_only: true,
    source_ref_only: true,
    fail_closed: true,
    product_sequence: [
      "client_blueprint_hypothesis",
      "llm_candidate_metric_recommendations",
      "reviewer_metric_selection_draft",
      "reviewer_customer_approved_measurement_plan",
      "aggregate_data_collection_planning_readiness",
      "later_evidence_assessment",
      "later_bayesian_model_review"
    ],
    held_states: [
      "HELD_FOR_BLUEPRINT_HYPOTHESIS",
      "HELD_FOR_CANDIDATE_METRIC_RECOMMENDATION",
      "HELD_FOR_REVIEWER_APPROVED_MEASUREMENT_PLAN",
      "HELD_FOR_AGGREGATE_DATA_COLLECTION",
      "HELD_FOR_EVIDENCE_ASSESSMENT",
      "HELD_FOR_MODEL_REVIEW"
    ],
    source_recommendation_plan_ref: sourcePlanRef,
    source_recommendation_plan_hash: sourcePlanHash,
    source_candidate_metric_recommendation_ref:
      sanitizedApproval.source_candidate_metric_recommendation_ref ?? null,
    source_candidate_metric_recommendation_hash: sourceRecommendationHash,
    reviewer_approved_measurement_plan_ref:
      sanitizedApproval.reviewer_approved_measurement_plan_ref ?? null,
    reviewer_decision_ref: sanitizedApproval.reviewer_decision_ref ?? null,
    source_blueprint_hypothesis_ref: sanitizedApproval.source_blueprint_hypothesis_ref ?? sourcePlanRef,
    approved_selected_metric: {
      selected_metric_id: sanitizedApproval.selected_metric_id ?? null,
      selected_metric_family: sanitizedApproval.selected_metric_family ?? null,
      selected_measurement_unit: sanitizedApproval.selected_measurement_unit ?? null,
      metric_owner_role_ref: sanitizedApproval.metric_owner_role_ref ?? null,
      source_candidate_metric_recommendation_ref:
        sanitizedApproval.source_candidate_metric_recommendation_ref ?? null
    },
    approved_expectation_path: {
      expected_movement_direction: sanitizedApproval.expected_movement_direction ?? null,
      expected_lag_definition: sanitizedApproval.expected_lag_definition ?? null,
      direction_and_lag_approved_from_blueprint_expectation_path: ready
    },
    approved_baseline_and_comparison: {
      baseline_value_source_ref: sanitizedApproval.baseline_value_source_ref ?? null,
      comparison_condition_ref: sanitizedApproval.comparison_condition_ref ?? null,
      baseline_and_comparison_are_observed_data: false
    },
    approved_milestone_schedule: {
      milestone_schedule_ref: sanitizedApproval.milestone_schedule_ref ?? null,
      required_milestones: [...REQUIRED_APPROVED_MEASUREMENT_PLAN_MILESTONES],
      milestone_window_refs: sanitizedApproval.milestone_window_refs,
      schedule_approved: ready && !milestoneMissing,
      creates_measurement_cell_evidence: false
    },
    approved_scope: {
      cohort_identity: sanitizedApproval.cohort_identity ?? null,
      workflow_function_identity: sanitizedApproval.workflow_function_identity ?? null,
      aggregate_measurement_cell_grain:
        sanitizedApproval.aggregate_measurement_cell_grain ?? null,
      suppression_missing_held_precheck_posture:
        sanitizedApproval.suppression_missing_held_precheck_posture ?? null
    },
    review_roles: {
      approval_role_ref: sanitizedApproval.approval_role_ref ?? null,
      approval_state: sanitizedApproval.approval_state ?? null
    },
    measurement_spec_metric_spec_internal_contract: {
      measurement_spec_posture: ready
        ? "READY_FOR_MEASUREMENT_SPEC_METRIC_SPEC_DRAFTING_ONLY"
        : "HELD_FOR_REVIEWER_APPROVED_MEASUREMENT_PLAN",
      metric_spec_posture: ready
        ? "READY_FOR_SELECTED_METRIC_OPERATIONAL_DEFINITION_DRAFTING_ONLY"
        : "HELD_FOR_REVIEWER_APPROVED_MEASUREMENT_PLAN",
      versioned_contract_required: true,
      not_bayesian_artifact: true,
      not_evidence_by_itself: true
    },
    data_collection_readiness_state: dataCollectionReadinessState,
    data_collection_planning: {
      aggregate_only_future_collection_posture: ready,
      future_collection_may_use_only_approved_aggregate_sources: true,
      live_connector_execution_authorized: false,
      raw_rows_authorized: false,
      person_level_data_authorized: false
    },
    selected_metric_approved: ready,
    measurement_plan_approved: ready,
    source_candidate_metric_recommendation_is_evidence: false,
    source_candidate_metric_recommendation_selected_by_system: false,
    approved_plan_is_observed_data: false,
    measurement_spec_is_bayesian_readiness: false,
    creates_evidence: false,
    creates_runtime_evidence: false,
    diagnostics_evidence_satisfied: false,
    comparison_design_adequacy_satisfied: false,
    aggregate_data_observed: false,
    evidence_assessment_ready: false,
    posterior_interpretation_authorized: false,
    promotion_authorized: false,
    blocked_claims: [...REQUIRED_BLOCKED_CLAIMS],
    blocked_outputs: { ...BLOCKED_OUTPUTS },
    feeds: { ...FEEDS },
    bayesian_chain_state: {
      current_state: BAYESIAN_CHAIN_HELD_STATE,
      allowed_next_step: BAYESIAN_CHAIN_ALLOWED_NEXT_STEP,
      changed_by_this_contract: false
    },
    gap_list: unique(gaps),
    allowed_next_step: allowedNextStep
  };
  contract.contract_hash = hashContract(contract);
  return contract;
}

export function buildReviewerApprovedMeasurementPlanContract({
  sourceRecommendationPlan,
  reviewerApproval
} = {}) {
  const sourceState = sourcePlanState(sourceRecommendationPlan);
  const gaps = [...sourceState.gaps];
  const sanitizedApproval = sanitizeApproval(reviewerApproval ?? {}, gaps);
  const sourceRecommendation = findSourceRecommendation(
    sourceRecommendationPlan,
    sanitizedApproval.source_candidate_metric_recommendation_ref
  );

  if (sourceState.valid && sanitizedApproval.source_candidate_metric_recommendation_ref) {
    gaps.push(...candidateMatchGaps(sourceRecommendation, sanitizedApproval));
  }
  if (
    stableString(reviewerApproval?.approval_state) &&
    stableString(reviewerApproval?.approval_state) !== REQUIRED_APPROVAL_STATE
  ) {
    gaps.push("approval_state_not_approved");
  }
  if (
    sanitizedApproval.source_blueprint_hypothesis_ref &&
    sourceRecommendationPlan?.blueprint_hypothesis_ref &&
    sanitizedApproval.source_blueprint_hypothesis_ref !== sourceRecommendationPlan.blueprint_hypothesis_ref
  ) {
    gaps.push("source_blueprint_hypothesis_ref_mismatch");
  }
  if (
    sanitizedApproval.workflow_function_identity &&
    sourceRecommendationPlan?.workflow_function_scope &&
    sanitizedApproval.workflow_function_identity !== sourceRecommendationPlan.workflow_function_scope
  ) {
    gaps.push("workflow_function_identity_mismatch");
  }
  if (
    sanitizedApproval.cohort_identity &&
    sourceRecommendationPlan?.cohort_scope &&
    sanitizedApproval.cohort_identity !== sourceRecommendationPlan.cohort_scope
  ) {
    gaps.push("cohort_identity_mismatch");
  }
  if (
    sanitizedApproval.suppression_missing_held_precheck_posture &&
    sanitizedApproval.suppression_missing_held_precheck_posture !== "CLEAR"
  ) {
    gaps.push("suppression_missing_held_precheck_not_clear");
  }

  const recommendationGaps = gaps.filter(
    (gap) =>
      gap.startsWith("source_recommendation_plan_invalid") ||
      gap === "source_recommendation_plan_not_recommendation_ready" ||
      gap === "source_candidate_metric_recommendation_ref_not_found" ||
      gap.endsWith("_mismatch")
  );
  const missingBlueprint = !sourceState.valid && sourceState.state === HOLD_BLUEPRINT_STATE;
  const missingMilestones = gaps.some(
    (gap) =>
      gap.startsWith("missing_milestone_window_ref") ||
      gap.startsWith("unsafe_milestone_window_ref") ||
      gap.startsWith("non_ready_milestone_window_ref")
  );
  const missingApproval = gaps.includes("missing_reviewer_approved_measurement_plan_ref");

  let contractState = READY_STATE;
  let dataCollectionReadinessState = READY_DATA_COLLECTION_STATE;
  let allowedNextStep = READY_NEXT_STEP;
  if (!sourceState.valid && sourceState.state === HOLD_BLUEPRINT_STATE) {
    contractState = HOLD_BLUEPRINT_STATE;
    dataCollectionReadinessState = HOLD_APPROVAL_DATA_COLLECTION_STATE;
    allowedNextStep = HOLD_BLUEPRINT_NEXT_STEP;
  } else if (!sourceState.valid || recommendationGaps.length) {
    contractState = HOLD_RECOMMENDATION_STATE;
    dataCollectionReadinessState = HOLD_APPROVAL_DATA_COLLECTION_STATE;
    allowedNextStep = HOLD_RECOMMENDATION_NEXT_STEP;
  } else if (gaps.length) {
    contractState = missingBlueprint ? HOLD_BLUEPRINT_STATE : HOLD_APPROVAL_STATE;
    dataCollectionReadinessState = !missingApproval && missingMilestones
      ? HOLD_MILESTONE_DATA_COLLECTION_STATE
      : HOLD_APPROVAL_DATA_COLLECTION_STATE;
    allowedNextStep = missingBlueprint ? HOLD_BLUEPRINT_NEXT_STEP : HOLD_APPROVAL_NEXT_STEP;
  }

  return baseContract({
    sourceRecommendationPlan,
    reviewerApproval,
    sanitizedApproval,
    sourceRecommendation,
    contractState,
    dataCollectionReadinessState,
    allowedNextStep,
    gaps
  });
}

function hasEveryBlockedClaim(claims) {
  const set = new Set(Array.isArray(claims) ? claims : []);
  return REQUIRED_BLOCKED_CLAIMS.every((claim) => set.has(claim));
}

function validateFalseFlags(contract, gaps) {
  const falseFields = [
    "source_candidate_metric_recommendation_is_evidence",
    "source_candidate_metric_recommendation_selected_by_system",
    "approved_plan_is_observed_data",
    "measurement_spec_is_bayesian_readiness",
    "creates_evidence",
    "creates_runtime_evidence",
    "diagnostics_evidence_satisfied",
    "comparison_design_adequacy_satisfied",
    "aggregate_data_observed",
    "evidence_assessment_ready",
    "posterior_interpretation_authorized",
    "promotion_authorized"
  ];
  for (const field of falseFields) {
    if (contract?.[field] !== false) gaps.push(`${field} must be false`);
  }
  for (const field of Object.keys(BLOCKED_OUTPUTS)) {
    if (contract?.blocked_outputs?.[field] !== false) {
      gaps.push(`blocked_outputs.${field} must be present and false`);
    }
  }
  for (const field of Object.keys(FEEDS)) {
    if (contract?.feeds?.[field] !== false) {
      gaps.push(`feeds.${field} must be present and false`);
    }
  }
}

function validateNestedBoundaryFlags(contract, gaps) {
  const ready = contract?.contract_state === READY_STATE;
  if (contract?.approved_baseline_and_comparison?.baseline_and_comparison_are_observed_data !== false) {
    gaps.push("approved_baseline_and_comparison.baseline_and_comparison_are_observed_data must be false");
  }
  if (contract?.approved_milestone_schedule?.creates_measurement_cell_evidence !== false) {
    gaps.push("approved_milestone_schedule.creates_measurement_cell_evidence must be false");
  }
  if (contract?.approved_expectation_path?.direction_and_lag_approved_from_blueprint_expectation_path !== ready) {
    gaps.push("approved_expectation_path.direction_and_lag_approved_from_blueprint_expectation_path must match ready state");
  }
  if (contract?.approved_milestone_schedule?.schedule_approved !== ready) {
    gaps.push("approved_milestone_schedule.schedule_approved must match ready state");
  }
  if (contract?.measurement_spec_metric_spec_internal_contract?.versioned_contract_required !== true) {
    gaps.push("measurement_spec_metric_spec_internal_contract.versioned_contract_required must be true");
  }
  if (contract?.measurement_spec_metric_spec_internal_contract?.not_bayesian_artifact !== true) {
    gaps.push("measurement_spec_metric_spec_internal_contract.not_bayesian_artifact must be true");
  }
  if (contract?.measurement_spec_metric_spec_internal_contract?.not_evidence_by_itself !== true) {
    gaps.push("measurement_spec_metric_spec_internal_contract.not_evidence_by_itself must be true");
  }
  if (contract?.data_collection_planning?.future_collection_may_use_only_approved_aggregate_sources !== true) {
    gaps.push("data_collection_planning.future_collection_may_use_only_approved_aggregate_sources must be true");
  }
  if (contract?.data_collection_planning?.live_connector_execution_authorized !== false) {
    gaps.push("data_collection_planning.live_connector_execution_authorized must be false");
  }
  if (contract?.data_collection_planning?.raw_rows_authorized !== false) {
    gaps.push("data_collection_planning.raw_rows_authorized must be false");
  }
  if (contract?.data_collection_planning?.person_level_data_authorized !== false) {
    gaps.push("data_collection_planning.person_level_data_authorized must be false");
  }
}

function scanUnsafeContractValues(value, gaps, path = "contract") {
  if (value === null || value === undefined) return;
  if (typeof value === "string") {
    if (containsForbiddenValue(value)) {
      gaps.push(`unsafe_contract_value:${path}`);
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

function validateUnsafeEmittedApprovalValues(contract, gaps) {
  const checked = {
    reviewer_approved_measurement_plan_ref: contract?.reviewer_approved_measurement_plan_ref,
    reviewer_decision_ref: contract?.reviewer_decision_ref,
    source_recommendation_plan_ref: contract?.source_recommendation_plan_ref,
    source_candidate_metric_recommendation_ref: contract?.source_candidate_metric_recommendation_ref,
    source_blueprint_hypothesis_ref: contract?.source_blueprint_hypothesis_ref,
    approved_selected_metric: contract?.approved_selected_metric,
    approved_expectation_path: contract?.approved_expectation_path,
    approved_baseline_and_comparison: contract?.approved_baseline_and_comparison,
    approved_milestone_schedule: contract?.approved_milestone_schedule,
    approved_scope: contract?.approved_scope,
    review_roles: contract?.review_roles
  };
  scanUnsafeContractValues(checked, gaps);
}

function validateRequiredReadyFields(contract, gaps) {
  const requiredTopLevelRefs = [
    "reviewer_approved_measurement_plan_ref",
    "reviewer_decision_ref",
    "source_recommendation_plan_ref",
    "source_candidate_metric_recommendation_ref",
    "source_blueprint_hypothesis_ref"
  ];
  for (const field of requiredTopLevelRefs) {
    if (!stableString(contract?.[field])) {
      gaps.push(`ready contract requires ${field}`);
    }
  }
  const requiredSelectedFields = [
    "selected_metric_id",
    "selected_metric_family",
    "selected_measurement_unit",
    "metric_owner_role_ref",
    "source_candidate_metric_recommendation_ref"
  ];
  for (const field of requiredSelectedFields) {
    if (!stableString(contract?.approved_selected_metric?.[field])) {
      gaps.push(`ready contract requires approved_selected_metric.${field}`);
    }
  }
  if (!stableString(contract?.approved_expectation_path?.expected_movement_direction)) {
    gaps.push("ready contract requires approved_expectation_path.expected_movement_direction");
  }
  if (!stableString(contract?.approved_expectation_path?.expected_lag_definition)) {
    gaps.push("ready contract requires approved_expectation_path.expected_lag_definition");
  }
  if (!stableString(contract?.approved_baseline_and_comparison?.baseline_value_source_ref)) {
    gaps.push("ready contract requires approved_baseline_and_comparison.baseline_value_source_ref");
  }
  if (!stableString(contract?.approved_baseline_and_comparison?.comparison_condition_ref)) {
    gaps.push("ready contract requires approved_baseline_and_comparison.comparison_condition_ref");
  }
  if (!stableString(contract?.approved_milestone_schedule?.milestone_schedule_ref)) {
    gaps.push("ready contract requires approved_milestone_schedule.milestone_schedule_ref");
  }
  if (!stableString(contract?.approved_scope?.cohort_identity)) {
    gaps.push("ready contract requires approved_scope.cohort_identity");
  }
  if (!stableString(contract?.approved_scope?.workflow_function_identity)) {
    gaps.push("ready contract requires approved_scope.workflow_function_identity");
  }
  if (!stableString(contract?.approved_scope?.aggregate_measurement_cell_grain)) {
    gaps.push("ready contract requires approved_scope.aggregate_measurement_cell_grain");
  }
  if (!stableString(contract?.approved_scope?.suppression_missing_held_precheck_posture)) {
    gaps.push("ready contract requires approved_scope.suppression_missing_held_precheck_posture");
  }
  if (!stableString(contract?.review_roles?.approval_role_ref)) {
    gaps.push("ready contract requires review_roles.approval_role_ref");
  }
  if (contract?.review_roles?.approval_state !== REQUIRED_APPROVAL_STATE) {
    gaps.push("ready contract requires approved review_roles.approval_state");
  }
}

function validateNonReviewedProvenance(contract, gaps) {
  const guardedValues = {
    reviewer_approved_measurement_plan_ref: contract?.reviewer_approved_measurement_plan_ref,
    reviewer_decision_ref: contract?.reviewer_decision_ref,
    source_candidate_metric_recommendation_ref: contract?.source_candidate_metric_recommendation_ref,
    source_blueprint_hypothesis_ref: contract?.source_blueprint_hypothesis_ref,
    "review_roles.approval_role_ref": contract?.review_roles?.approval_role_ref,
    "approved_baseline_and_comparison.baseline_value_source_ref":
      contract?.approved_baseline_and_comparison?.baseline_value_source_ref,
    "approved_baseline_and_comparison.comparison_condition_ref":
      contract?.approved_baseline_and_comparison?.comparison_condition_ref,
    "approved_milestone_schedule.milestone_schedule_ref":
      contract?.approved_milestone_schedule?.milestone_schedule_ref
  };
  for (const [field, value] of Object.entries(guardedValues)) {
    const raw = stableString(value);
    if (raw && NON_REVIEWED_PROVENANCE_PATTERN.test(raw)) {
      gaps.push(`non_reviewed_approval_provenance:${field}`);
    }
  }
  for (const [milestone, ref] of Object.entries(
    contract?.approved_milestone_schedule?.milestone_window_refs ?? {}
  )) {
    const raw = stableString(ref);
    if (raw && NON_REVIEWED_PROVENANCE_PATTERN.test(raw)) {
      gaps.push(`non_reviewed_approval_provenance:milestone_window_ref:${milestone}`);
    }
    if (raw && NON_READY_WINDOW_REF_PATTERN.test(raw)) {
      gaps.push(`non_ready_milestone_window_ref:${milestone}`);
    }
  }
}

function validateSourceBinding(contract, options, gaps) {
  if (contract?.contract_state === READY_STATE && !options?.sourceRecommendationPlan) {
    gaps.push("ready contract validation requires sourceRecommendationPlan");
    return;
  }
  if (!options?.sourceRecommendationPlan) return;
  const sourceValidation = sourcePlanState(options.sourceRecommendationPlan);
  if (!sourceValidation.valid) {
    gaps.push("sourceRecommendationPlan must validate for contract validation");
    return;
  }
  const expectedSourceHash = hashObject(options.sourceRecommendationPlan);
  if (contract?.source_recommendation_plan_hash !== expectedSourceHash) {
    gaps.push("source_recommendation_plan_hash mismatch");
  }
  if (
    contract?.source_recommendation_plan_ref !==
    options.sourceRecommendationPlan.blueprint_hypothesis_ref
  ) {
    gaps.push("source_recommendation_plan_ref must match sourceRecommendationPlan blueprint_hypothesis_ref");
  }
  if (
    contract?.source_blueprint_hypothesis_ref !==
    options.sourceRecommendationPlan.blueprint_hypothesis_ref
  ) {
    gaps.push("source_blueprint_hypothesis_ref must match sourceRecommendationPlan blueprint_hypothesis_ref");
  }
  const sourceRecommendation = findSourceRecommendation(
    options.sourceRecommendationPlan,
    contract?.source_candidate_metric_recommendation_ref
  );
  if (!sourceRecommendation) {
    gaps.push("source_candidate_metric_recommendation_ref_not_found");
    return;
  }
  if (contract?.source_candidate_metric_recommendation_hash !== hashObject(sourceRecommendation)) {
    gaps.push("source_candidate_metric_recommendation_hash mismatch");
  }
  if (
    contract?.approved_selected_metric?.source_candidate_metric_recommendation_ref !==
    contract?.source_candidate_metric_recommendation_ref
  ) {
    gaps.push(
      "approved_selected_metric.source_candidate_metric_recommendation_ref must match source_candidate_metric_recommendation_ref"
    );
  }
  if (
    contract?.approved_scope?.workflow_function_identity !==
    options.sourceRecommendationPlan.workflow_function_scope
  ) {
    gaps.push("approved_scope.workflow_function_identity must match sourceRecommendationPlan workflow_function_scope");
  }
  if (contract?.approved_scope?.cohort_identity !== options.sourceRecommendationPlan.cohort_scope) {
    gaps.push("approved_scope.cohort_identity must match sourceRecommendationPlan cohort_scope");
  }
  const selected = contract?.approved_selected_metric ?? {};
  const expectedPairs = [
    ["selected_metric_id", "candidate_metric_id"],
    ["selected_metric_family", "candidate_metric_family"],
    ["selected_measurement_unit", "measurement_unit"],
    ["metric_owner_role_ref", "metric_owner_role_ref"]
  ];
  for (const [selectedField, recommendationField] of expectedPairs) {
    if (selected[selectedField] !== sourceRecommendation[recommendationField]) {
      gaps.push(`${selectedField} must match source candidate recommendation`);
    }
  }
}

export function validateReviewerApprovedMeasurementPlanContract(contract, options = {}) {
  const gaps = [];
  if (contract?.schema_version !== REVIEWER_APPROVED_MEASUREMENT_PLAN_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  if (contract?.internal_only !== true) gaps.push("internal_only must be true");
  if (contract?.aggregate_only !== true) gaps.push("aggregate_only must be true");
  if (contract?.source_ref_only !== true) gaps.push("source_ref_only must be true");
  if (contract?.fail_closed !== true) gaps.push("fail_closed must be true");
  validateUnsafeEmittedApprovalValues(contract, gaps);
  validateNonReviewedProvenance(contract, gaps);
  if (!hasEveryBlockedClaim(contract?.blocked_claims)) {
    gaps.push("blocked_claims must include every required blocked claim");
  }
  validateFalseFlags(contract, gaps);
  validateNestedBoundaryFlags(contract, gaps);
  validateSourceBinding(contract, options, gaps);
  if (
    JSON.stringify(contract?.approved_milestone_schedule?.required_milestones ?? []) !==
    JSON.stringify(REQUIRED_APPROVED_MEASUREMENT_PLAN_MILESTONES)
  ) {
    gaps.push("approved milestone schedule must include T0/T30/T60/T90/T120/T180/T270/T365");
  }
  for (const milestone of REQUIRED_APPROVED_MEASUREMENT_PLAN_MILESTONES) {
    const ref = contract?.approved_milestone_schedule?.milestone_window_refs?.[milestone];
    if (contract?.contract_state === READY_STATE && !ref) {
      gaps.push(`ready contract missing milestone_window_ref:${milestone}`);
    }
  }
  if (contract?.bayesian_chain_state?.current_state !== BAYESIAN_CHAIN_HELD_STATE) {
    gaps.push("bayesian_chain_state.current_state must remain held");
  }
  if (contract?.bayesian_chain_state?.allowed_next_step !== BAYESIAN_CHAIN_ALLOWED_NEXT_STEP) {
    gaps.push("bayesian_chain_state.allowed_next_step must remain governed diagnostics source completion");
  }
  if (contract?.bayesian_chain_state?.changed_by_this_contract !== false) {
    gaps.push("bayesian_chain_state.changed_by_this_contract must be false");
  }
  if (contract?.contract_state === READY_STATE) {
    validateRequiredReadyFields(contract, gaps);
    if (contract?.approved_scope?.suppression_missing_held_precheck_posture !== "CLEAR") {
      gaps.push("ready contract requires approved_scope.suppression_missing_held_precheck_posture CLEAR");
    }
    if (contract?.allowed_next_step !== READY_NEXT_STEP) {
      gaps.push("ready contract allowed_next_step is invalid");
    }
    if (contract?.data_collection_readiness_state !== READY_DATA_COLLECTION_STATE) {
      gaps.push("ready contract data_collection_readiness_state is invalid");
    }
    if (contract?.selected_metric_approved !== true) {
      gaps.push("ready contract selected_metric_approved must be true");
    }
    if (contract?.measurement_plan_approved !== true) {
      gaps.push("ready contract measurement_plan_approved must be true");
    }
  } else if (String(contract?.contract_state ?? "").startsWith("HELD_")) {
    if (contract?.selected_metric_approved !== false) {
      gaps.push("held contract selected_metric_approved must be false");
    }
    if (contract?.measurement_plan_approved !== false) {
      gaps.push("held contract measurement_plan_approved must be false");
    }
    if (
      ![
        HOLD_APPROVAL_DATA_COLLECTION_STATE,
        HOLD_MILESTONE_DATA_COLLECTION_STATE
      ].includes(contract?.data_collection_readiness_state)
    ) {
      gaps.push("held contract data_collection_readiness_state must remain held");
    }
    if (
      ![
        HOLD_APPROVAL_NEXT_STEP,
        HOLD_RECOMMENDATION_NEXT_STEP,
        HOLD_BLUEPRINT_NEXT_STEP
      ].includes(contract?.allowed_next_step)
    ) {
      gaps.push("held contract allowed_next_step is invalid");
    }
    if (contract?.data_collection_planning?.aggregate_only_future_collection_posture !== false) {
      gaps.push("held contract aggregate_only_future_collection_posture must be false");
    }
  } else {
    gaps.push("contract_state is invalid");
  }
  if (contract?.contract_hash !== hashContract(contract ?? {})) {
    gaps.push("contract_hash mismatch");
  }
  return { valid: gaps.length === 0, gaps };
}

function defaultSourceRecommendationPlan() {
  return buildHypothesisToMetricRecommendationPlan({
    blueprint_hypothesis_ref: "blueprint_hypothesis.customer_support.case_resolution.2026_06",
    blueprint_hypothesis_statement:
      "Improve support case resolution capacity while keeping escalation and quality posture governed.",
    value_route: "CAPACITY_CREATION",
    workflow_function_scope: "customer_support_case_resolution",
    cohort_scope: "eligible_support_cases_aggregate",
    metric_library_refs: [
      "docs/contracts/ai-value-intelligence/examples/customer-support-metrics-library.json"
    ]
  });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function main() {
  const sourceRecommendationPlan = defaultSourceRecommendationPlan();
  let reviewerApproval = null;
  const inputPath = process.argv[2];
  if (inputPath && inputPath !== "-") {
    const input = readJson(inputPath);
    reviewerApproval = input.reviewerApproval ?? input.reviewer_approval ?? input;
  }
  const contract = buildReviewerApprovedMeasurementPlanContract({
    sourceRecommendationPlan,
    reviewerApproval
  });
  process.stdout.write(`${JSON.stringify(contract, null, 2)}\n`);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) {
  main();
}
