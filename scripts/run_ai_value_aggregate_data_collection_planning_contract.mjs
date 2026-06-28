#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  REQUIRED_APPROVED_MEASUREMENT_PLAN_MILESTONES,
  validateReviewerApprovedMeasurementPlanContract
} from "./run_ai_value_reviewer_approved_measurement_plan_contract.mjs";

export const AGGREGATE_DATA_COLLECTION_PLANNING_SCHEMA_VERSION =
  "FT_AI_VALUE_AGGREGATE_DATA_COLLECTION_PLANNING_CONTRACT_2026_06";

const READY_STATE =
  "AGGREGATE_DATA_COLLECTION_PLANNING_READY_FOR_COMPARISON_DESIGN_SOURCE_PACKAGE_PREPARATION";
const HOLD_REVIEWER_APPROVED_PLAN_STATE = "HELD_FOR_REVIEWER_APPROVED_MEASUREMENT_PLAN";
const HOLD_AGGREGATE_COLLECTION_STATE = "HELD_FOR_AGGREGATE_DATA_COLLECTION_PLANNING";
const HOLD_MILESTONE_COLLECTION_STATE = "HELD_FOR_AGGREGATE_MILESTONE_COLLECTION_PLAN";
const READY_NEXT_STEP = "prepare_comparison_design_source_package_only";
const HOLD_REVIEWER_APPROVED_PLAN_NEXT_STEP = "complete_reviewer_approved_measurement_plan";
const HOLD_AGGREGATE_COLLECTION_NEXT_STEP = "complete_aggregate_data_collection_planning";
const BAYESIAN_CHAIN_HELD_STATE = "HOLD_FOR_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE";
const BAYESIAN_CHAIN_ALLOWED_NEXT_STEP = "complete_governed_diagnostics_sufficiency_evidence_source";
const REQUIRED_COLLECTION_PLANNING_STATE = "APPROVED_FOR_AGGREGATE_COLLECTION_PLANNING";

const HELD_STATE_NEXT_STEPS = Object.freeze({
  [HOLD_REVIEWER_APPROVED_PLAN_STATE]: HOLD_REVIEWER_APPROVED_PLAN_NEXT_STEP,
  [HOLD_AGGREGATE_COLLECTION_STATE]: HOLD_AGGREGATE_COLLECTION_NEXT_STEP,
  [HOLD_MILESTONE_COLLECTION_STATE]: HOLD_AGGREGATE_COLLECTION_NEXT_STEP
});

const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "contract_state",
  "contract_class",
  "internal_only",
  "aggregate_only",
  "source_ref_only",
  "fail_closed",
  "source_reviewer_approved_measurement_plan_ref",
  "source_reviewer_approved_measurement_plan_hash",
  "source_reviewer_approved_measurement_plan_contract_hash",
  "aggregate_data_collection_plan_ref",
  "collection_owner_role_ref",
  "aggregate_source_posture_ref",
  "source_system_posture_ref",
  "aggregate_export_manifest_plan_ref",
  "measurement_cell_binding_plan_ref",
  "planned_collection_schedule",
  "source_measurement_plan_projection",
  "collection_review",
  "future_collection_authorizations",
  "aggregate_data_collection_planning_ready",
  "aggregate_data_collection_plan_is_observed_data",
  "aggregate_data_observed",
  "creates_evidence",
  "creates_runtime_evidence",
  "evidence_assessment_ready",
  "comparison_design_source_package_created",
  "comparison_design_adequacy_satisfied",
  "diagnostics_evidence_satisfied",
  "posterior_interpretation_authorized",
  "promotion_authorized",
  "blocked_claims",
  "blocked_outputs",
  "feeds",
  "bayesian_chain_state",
  "gap_list",
  "allowed_next_step",
  "contract_hash"
]);

const FORBIDDEN_EXTRA_FIELD_NAME_PATTERN =
  /(?:live[-_\s]?connector|route|ui|schema|persistence|export|raw|identifier|query|prompt|transcript|person|individual|team|evidence|diagnostic|promotion|posterior|confidence|probability|roi|finance|financial|economic|causal|causality|productivity|score|authorized|created|satisfied|observed|assessment)/i;

const REQUIRED_COLLECTION_PLAN_FIELDS = [
  "aggregate_data_collection_plan_ref",
  "source_reviewer_approved_measurement_plan_ref",
  "collection_owner_role_ref",
  "aggregate_source_posture_ref",
  "source_system_posture_ref",
  "aggregate_export_manifest_plan_ref",
  "measurement_cell_binding_plan_ref",
  "suppression_missing_held_collection_precheck_posture",
  "privacy_boundary_attestation_ref",
  "raw_data_exclusion_attestation_ref",
  "live_connector_exclusion_attestation_ref",
  "reviewer_decision_ref",
  "planning_state"
];

const REQUIRED_BLOCKED_CLAIMS = [
  "aggregate_data_collection_plan_is_not_observed_data",
  "aggregate_collection_plan_is_not_evidence",
  "data_collection_planning_is_not_connector_execution",
  "data_collection_planning_is_not_persistence",
  "data_collection_planning_is_not_evidence_assessment",
  "comparison_design_adequacy_not_satisfied",
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

function containsForbiddenValue(value) {
  const raw = stableString(value);
  return FORBIDDEN_VALUE_PATTERNS.some(([, pattern]) => pattern.test(raw));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function sanitizeCollectionPlan(plan = {}, gaps) {
  const sanitized = {};
  for (const field of REQUIRED_COLLECTION_PLAN_FIELDS) {
    const raw = stableString(plan[field]);
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
      gaps.push(`non_reviewed_collection_plan_provenance:${field}`);
      continue;
    }
    sanitized[field] = raw;
  }

  const plannedWindowRefs = {};
  const sourceWindowRefs =
    plan?.planned_collection_window_refs && typeof plan.planned_collection_window_refs === "object"
      ? plan.planned_collection_window_refs
      : {};
  for (const milestone of REQUIRED_APPROVED_MEASUREMENT_PLAN_MILESTONES) {
    const raw = stableString(sourceWindowRefs[milestone]);
    if (!raw) {
      plannedWindowRefs[milestone] = null;
      gaps.push(`missing_planned_collection_window_ref:${milestone}`);
      continue;
    }
    if (containsForbiddenValue(raw)) {
      plannedWindowRefs[milestone] = null;
      gaps.push(`unsafe_planned_collection_window_ref:${milestone}`);
      continue;
    }
    if (NON_REVIEWED_PROVENANCE_PATTERN.test(raw)) {
      plannedWindowRefs[milestone] = null;
      gaps.push(`non_reviewed_collection_plan_provenance:planned_collection_window_ref:${milestone}`);
      continue;
    }
    if (NON_READY_WINDOW_REF_PATTERN.test(raw)) {
      plannedWindowRefs[milestone] = null;
      gaps.push(`non_ready_planned_collection_window_ref:${milestone}`);
      continue;
    }
    plannedWindowRefs[milestone] = raw;
  }
  sanitized.planned_collection_window_refs = plannedWindowRefs;
  return sanitized;
}

function sourceReviewerPlanState(sourceReviewerApprovedMeasurementPlan, sourceRecommendationPlan) {
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
  if (
    sourceReviewerApprovedMeasurementPlan.contract_state !==
    "REVIEWER_APPROVED_MEASUREMENT_PLAN_READY_FOR_AGGREGATE_DATA_COLLECTION_PLANNING"
  ) {
    return {
      valid: false,
      gaps: ["source_reviewer_approved_measurement_plan_not_ready_for_collection_planning"]
    };
  }
  return { valid: true, gaps: [] };
}

function baseContract({
  sourceReviewerApprovedMeasurementPlan,
  sanitizedPlan,
  contractState,
  allowedNextStep,
  gaps
}) {
  const ready = contractState === READY_STATE;
  const sourceHash = sourceReviewerApprovedMeasurementPlan
    ? hashObject(sourceReviewerApprovedMeasurementPlan)
    : null;
  const contract = {
    schema_version: AGGREGATE_DATA_COLLECTION_PLANNING_SCHEMA_VERSION,
    contract_state: contractState,
    contract_class: "aggregate_data_collection_planning_contract",
    internal_only: true,
    aggregate_only: true,
    source_ref_only: true,
    fail_closed: true,
    source_reviewer_approved_measurement_plan_ref:
      sourceReviewerApprovedMeasurementPlan?.reviewer_approved_measurement_plan_ref ?? null,
    source_reviewer_approved_measurement_plan_hash: sourceHash,
    source_reviewer_approved_measurement_plan_contract_hash:
      sourceReviewerApprovedMeasurementPlan?.contract_hash ?? null,
    aggregate_data_collection_plan_ref:
      sanitizedPlan.aggregate_data_collection_plan_ref ?? null,
    collection_owner_role_ref: sanitizedPlan.collection_owner_role_ref ?? null,
    aggregate_source_posture_ref: sanitizedPlan.aggregate_source_posture_ref ?? null,
    source_system_posture_ref: sanitizedPlan.source_system_posture_ref ?? null,
    aggregate_export_manifest_plan_ref:
      sanitizedPlan.aggregate_export_manifest_plan_ref ?? null,
    measurement_cell_binding_plan_ref:
      sanitizedPlan.measurement_cell_binding_plan_ref ?? null,
    planned_collection_schedule: {
      required_milestones: [...REQUIRED_APPROVED_MEASUREMENT_PLAN_MILESTONES],
      planned_collection_window_refs: sanitizedPlan.planned_collection_window_refs,
      schedule_ready: ready
    },
    source_measurement_plan_projection: {
      selected_metric_id:
        sourceReviewerApprovedMeasurementPlan?.approved_selected_metric?.selected_metric_id ?? null,
      selected_metric_family:
        sourceReviewerApprovedMeasurementPlan?.approved_selected_metric?.selected_metric_family ?? null,
      expected_movement_direction:
        sourceReviewerApprovedMeasurementPlan?.approved_expectation_path?.expected_movement_direction ?? null,
      expected_lag_definition:
        sourceReviewerApprovedMeasurementPlan?.approved_expectation_path?.expected_lag_definition ?? null,
      baseline_value_source_ref:
        sourceReviewerApprovedMeasurementPlan?.approved_baseline_and_comparison?.baseline_value_source_ref ?? null,
      comparison_condition_ref:
        sourceReviewerApprovedMeasurementPlan?.approved_baseline_and_comparison?.comparison_condition_ref ?? null,
      cohort_identity:
        sourceReviewerApprovedMeasurementPlan?.approved_scope?.cohort_identity ?? null,
      workflow_function_identity:
        sourceReviewerApprovedMeasurementPlan?.approved_scope?.workflow_function_identity ?? null,
      aggregate_measurement_cell_grain:
        sourceReviewerApprovedMeasurementPlan?.approved_scope?.aggregate_measurement_cell_grain ?? null
    },
    collection_review: {
      suppression_missing_held_collection_precheck_posture:
        sanitizedPlan.suppression_missing_held_collection_precheck_posture ?? null,
      privacy_boundary_attestation_ref:
        sanitizedPlan.privacy_boundary_attestation_ref ?? null,
      raw_data_exclusion_attestation_ref:
        sanitizedPlan.raw_data_exclusion_attestation_ref ?? null,
      live_connector_exclusion_attestation_ref:
        sanitizedPlan.live_connector_exclusion_attestation_ref ?? null,
      reviewer_decision_ref: sanitizedPlan.reviewer_decision_ref ?? null,
      planning_state: sanitizedPlan.planning_state ?? null
    },
    future_collection_authorizations: {
      aggregate_future_collection_planning_only: ready,
      live_connector_execution_authorized: false,
      raw_rows_authorized: false,
      person_level_data_authorized: false,
      persistence_write_authorized: false,
      export_authorized: false
    },
    aggregate_data_collection_planning_ready: ready,
    aggregate_data_collection_plan_is_observed_data: false,
    aggregate_data_observed: false,
    creates_evidence: false,
    creates_runtime_evidence: false,
    evidence_assessment_ready: false,
    comparison_design_source_package_created: false,
    comparison_design_adequacy_satisfied: false,
    diagnostics_evidence_satisfied: false,
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

export function buildAggregateDataCollectionPlanningContract({
  sourceReviewerApprovedMeasurementPlan,
  sourceRecommendationPlan,
  aggregateDataCollectionPlan
} = {}) {
  const sourceState = sourceReviewerPlanState(
    sourceReviewerApprovedMeasurementPlan,
    sourceRecommendationPlan
  );
  const gaps = [...sourceState.gaps];
  const sanitizedPlan = sanitizeCollectionPlan(aggregateDataCollectionPlan ?? {}, gaps);

  if (
    sanitizedPlan.source_reviewer_approved_measurement_plan_ref &&
    sourceReviewerApprovedMeasurementPlan?.reviewer_approved_measurement_plan_ref &&
    sanitizedPlan.source_reviewer_approved_measurement_plan_ref !==
      sourceReviewerApprovedMeasurementPlan.reviewer_approved_measurement_plan_ref
  ) {
    gaps.push("source_reviewer_approved_measurement_plan_ref_mismatch");
  }
  if (
    stableString(aggregateDataCollectionPlan?.planning_state) &&
    stableString(aggregateDataCollectionPlan?.planning_state) !== REQUIRED_COLLECTION_PLANNING_STATE
  ) {
    gaps.push("planning_state_not_approved_for_aggregate_collection_planning");
  }
  if (
    sanitizedPlan.suppression_missing_held_collection_precheck_posture &&
    sanitizedPlan.suppression_missing_held_collection_precheck_posture !== "CLEAR"
  ) {
    gaps.push("suppression_missing_held_collection_precheck_not_clear");
  }

  const missingPlan = gaps.includes("missing_aggregate_data_collection_plan_ref");
  const collectionWindowGaps = gaps.filter(
    (gap) =>
      gap.startsWith("missing_planned_collection_window_ref") ||
      gap.startsWith("unsafe_planned_collection_window_ref") ||
      gap.startsWith("non_ready_planned_collection_window_ref")
  );

  let contractState = READY_STATE;
  let allowedNextStep = READY_NEXT_STEP;
  if (!sourceState.valid) {
    contractState = HOLD_REVIEWER_APPROVED_PLAN_STATE;
    allowedNextStep = HOLD_REVIEWER_APPROVED_PLAN_NEXT_STEP;
  } else if (missingPlan) {
    contractState = HOLD_AGGREGATE_COLLECTION_STATE;
    allowedNextStep = HOLD_AGGREGATE_COLLECTION_NEXT_STEP;
  } else if (collectionWindowGaps.length) {
    contractState = HOLD_MILESTONE_COLLECTION_STATE;
    allowedNextStep = HOLD_AGGREGATE_COLLECTION_NEXT_STEP;
  } else if (gaps.length) {
    contractState = HOLD_AGGREGATE_COLLECTION_STATE;
    allowedNextStep = HOLD_AGGREGATE_COLLECTION_NEXT_STEP;
  }

  return baseContract({
    sourceReviewerApprovedMeasurementPlan,
    sanitizedPlan,
    contractState,
    allowedNextStep,
    gaps
  });
}

function hasEveryBlockedClaim(claims) {
  const set = new Set(Array.isArray(claims) ? claims : []);
  return REQUIRED_BLOCKED_CLAIMS.every((claim) => set.has(claim));
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

function validateNoForbiddenExtraFields(contract, gaps) {
  if (!contract || typeof contract !== "object") return;
  for (const key of Object.keys(contract)) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(key) && FORBIDDEN_EXTRA_FIELD_NAME_PATTERN.test(key)) {
      gaps.push(`forbidden_extra_field:${key}`);
    }
  }
}

function validateReadyCollectionPlanBindings(contract, gaps) {
  if (contract?.contract_state !== READY_STATE) return;
  const requiredBindings = [
    ["aggregate_data_collection_plan_ref", contract?.aggregate_data_collection_plan_ref],
    [
      "source_reviewer_approved_measurement_plan_ref",
      contract?.source_reviewer_approved_measurement_plan_ref
    ],
    ["collection_owner_role_ref", contract?.collection_owner_role_ref],
    ["aggregate_source_posture_ref", contract?.aggregate_source_posture_ref],
    ["source_system_posture_ref", contract?.source_system_posture_ref],
    ["aggregate_export_manifest_plan_ref", contract?.aggregate_export_manifest_plan_ref],
    ["measurement_cell_binding_plan_ref", contract?.measurement_cell_binding_plan_ref],
    [
      "collection_review.suppression_missing_held_collection_precheck_posture",
      contract?.collection_review?.suppression_missing_held_collection_precheck_posture
    ],
    [
      "collection_review.privacy_boundary_attestation_ref",
      contract?.collection_review?.privacy_boundary_attestation_ref
    ],
    [
      "collection_review.raw_data_exclusion_attestation_ref",
      contract?.collection_review?.raw_data_exclusion_attestation_ref
    ],
    [
      "collection_review.live_connector_exclusion_attestation_ref",
      contract?.collection_review?.live_connector_exclusion_attestation_ref
    ],
    ["collection_review.reviewer_decision_ref", contract?.collection_review?.reviewer_decision_ref],
    ["collection_review.planning_state", contract?.collection_review?.planning_state]
  ];
  for (const [path, value] of requiredBindings) {
    if (!stableString(value)) gaps.push(`ready contract missing ${path}`);
  }
}

function validateFalseFlags(contract, gaps) {
  const falseFields = [
    "aggregate_data_collection_plan_is_observed_data",
    "aggregate_data_observed",
    "creates_evidence",
    "creates_runtime_evidence",
    "evidence_assessment_ready",
    "comparison_design_source_package_created",
    "comparison_design_adequacy_satisfied",
    "diagnostics_evidence_satisfied",
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
  if (contract?.future_collection_authorizations?.aggregate_future_collection_planning_only !== ready) {
    gaps.push("future_collection_authorizations.aggregate_future_collection_planning_only must match ready state");
  }
  if (contract?.future_collection_authorizations?.live_connector_execution_authorized !== false) {
    gaps.push("future_collection_authorizations.live_connector_execution_authorized must be false");
  }
  if (contract?.future_collection_authorizations?.raw_rows_authorized !== false) {
    gaps.push("future_collection_authorizations.raw_rows_authorized must be false");
  }
  if (contract?.future_collection_authorizations?.person_level_data_authorized !== false) {
    gaps.push("future_collection_authorizations.person_level_data_authorized must be false");
  }
  if (contract?.future_collection_authorizations?.persistence_write_authorized !== false) {
    gaps.push("future_collection_authorizations.persistence_write_authorized must be false");
  }
  if (contract?.future_collection_authorizations?.export_authorized !== false) {
    gaps.push("future_collection_authorizations.export_authorized must be false");
  }
  if (contract?.planned_collection_schedule?.schedule_ready !== ready) {
    gaps.push("planned_collection_schedule.schedule_ready must match ready state");
  }
}

function validateSourceBinding(contract, options, gaps) {
  if (contract?.contract_state === READY_STATE && !options?.sourceReviewerApprovedMeasurementPlan) {
    gaps.push("ready contract validation requires sourceReviewerApprovedMeasurementPlan");
    return;
  }
  if (!options?.sourceReviewerApprovedMeasurementPlan) return;
  const sourceState = sourceReviewerPlanState(
    options.sourceReviewerApprovedMeasurementPlan,
    options.sourceRecommendationPlan
  );
  if (!sourceState.valid) {
    gaps.push("sourceReviewerApprovedMeasurementPlan must validate for contract validation");
    return;
  }
  if (
    contract?.source_reviewer_approved_measurement_plan_hash !==
    hashObject(options.sourceReviewerApprovedMeasurementPlan)
  ) {
    gaps.push("source_reviewer_approved_measurement_plan_hash mismatch");
  }
  if (
    contract?.source_reviewer_approved_measurement_plan_contract_hash !==
    options.sourceReviewerApprovedMeasurementPlan.contract_hash
  ) {
    gaps.push("source_reviewer_approved_measurement_plan_contract_hash mismatch");
  }
  if (
    contract?.source_reviewer_approved_measurement_plan_ref !==
    options.sourceReviewerApprovedMeasurementPlan.reviewer_approved_measurement_plan_ref
  ) {
    gaps.push("source_reviewer_approved_measurement_plan_ref must match source reviewer-approved measurement plan");
  }
  const sourceProjectionBindings = [
    [
      "selected_metric_id",
      options.sourceReviewerApprovedMeasurementPlan.approved_selected_metric?.selected_metric_id
    ],
    [
      "selected_metric_family",
      options.sourceReviewerApprovedMeasurementPlan.approved_selected_metric?.selected_metric_family
    ],
    [
      "expected_movement_direction",
      options.sourceReviewerApprovedMeasurementPlan.approved_expectation_path?.expected_movement_direction
    ],
    [
      "expected_lag_definition",
      options.sourceReviewerApprovedMeasurementPlan.approved_expectation_path?.expected_lag_definition
    ],
    [
      "baseline_value_source_ref",
      options.sourceReviewerApprovedMeasurementPlan.approved_baseline_and_comparison
        ?.baseline_value_source_ref
    ],
    [
      "comparison_condition_ref",
      options.sourceReviewerApprovedMeasurementPlan.approved_baseline_and_comparison
        ?.comparison_condition_ref
    ],
    [
      "cohort_identity",
      options.sourceReviewerApprovedMeasurementPlan.approved_scope?.cohort_identity
    ],
    [
      "workflow_function_identity",
      options.sourceReviewerApprovedMeasurementPlan.approved_scope?.workflow_function_identity
    ],
    [
      "aggregate_measurement_cell_grain",
      options.sourceReviewerApprovedMeasurementPlan.approved_scope?.aggregate_measurement_cell_grain
    ]
  ];
  for (const [field, sourceValue] of sourceProjectionBindings) {
    if (contract?.source_measurement_plan_projection?.[field] !== sourceValue) {
      gaps.push(
        `source_measurement_plan_projection.${field} must match source reviewer-approved measurement plan`
      );
    }
  }
}

export function validateAggregateDataCollectionPlanningContract(contract, options = {}) {
  const gaps = [];
  validateNoForbiddenExtraFields(contract, gaps);
  if (contract?.schema_version !== AGGREGATE_DATA_COLLECTION_PLANNING_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  if (contract?.internal_only !== true) gaps.push("internal_only must be true");
  if (contract?.aggregate_only !== true) gaps.push("aggregate_only must be true");
  if (contract?.source_ref_only !== true) gaps.push("source_ref_only must be true");
  if (contract?.fail_closed !== true) gaps.push("fail_closed must be true");
  scanUnsafeContractValues(
    {
      aggregate_data_collection_plan_ref: contract?.aggregate_data_collection_plan_ref,
      collection_owner_role_ref: contract?.collection_owner_role_ref,
      aggregate_source_posture_ref: contract?.aggregate_source_posture_ref,
      source_system_posture_ref: contract?.source_system_posture_ref,
      aggregate_export_manifest_plan_ref: contract?.aggregate_export_manifest_plan_ref,
      measurement_cell_binding_plan_ref: contract?.measurement_cell_binding_plan_ref,
      planned_collection_schedule: contract?.planned_collection_schedule,
      source_measurement_plan_projection: contract?.source_measurement_plan_projection,
      collection_review: contract?.collection_review
    },
    gaps
  );
  if (!hasEveryBlockedClaim(contract?.blocked_claims)) {
    gaps.push("blocked_claims must include every required blocked claim");
  }
  validateFalseFlags(contract, gaps);
  validateNestedBoundaryFlags(contract, gaps);
  validateSourceBinding(contract, options, gaps);
  validateReadyCollectionPlanBindings(contract, gaps);
  if (
    JSON.stringify(contract?.planned_collection_schedule?.required_milestones ?? []) !==
    JSON.stringify(REQUIRED_APPROVED_MEASUREMENT_PLAN_MILESTONES)
  ) {
    gaps.push("planned collection schedule must include T0/T30/T60/T90/T120/T180/T270/T365");
  }
  for (const milestone of REQUIRED_APPROVED_MEASUREMENT_PLAN_MILESTONES) {
    const ref = contract?.planned_collection_schedule?.planned_collection_window_refs?.[milestone];
    if (contract?.contract_state === READY_STATE && !ref) {
      gaps.push(`ready contract missing planned_collection_window_ref:${milestone}`);
    }
    if (stableString(ref) && NON_READY_WINDOW_REF_PATTERN.test(stableString(ref))) {
      gaps.push(`non_ready_planned_collection_window_ref:${milestone}`);
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
    if (contract?.allowed_next_step !== READY_NEXT_STEP) {
      gaps.push("ready contract allowed_next_step is invalid");
    }
    if (contract?.aggregate_data_collection_planning_ready !== true) {
      gaps.push("ready contract aggregate_data_collection_planning_ready must be true");
    }
    if (contract?.collection_review?.planning_state !== REQUIRED_COLLECTION_PLANNING_STATE) {
      gaps.push("ready contract collection_review.planning_state must be approved");
    }
    if (contract?.collection_review?.suppression_missing_held_collection_precheck_posture !== "CLEAR") {
      gaps.push("ready contract requires collection_review.suppression_missing_held_collection_precheck_posture CLEAR");
    }
  } else if (Object.hasOwn(HELD_STATE_NEXT_STEPS, contract?.contract_state)) {
    if (contract?.aggregate_data_collection_planning_ready !== false) {
      gaps.push("held contract aggregate_data_collection_planning_ready must be false");
    }
    const expectedNextStep = HELD_STATE_NEXT_STEPS[contract.contract_state];
    if (contract?.allowed_next_step !== expectedNextStep) {
      gaps.push(`held contract allowed_next_step must match ${expectedNextStep}`);
    }
  } else {
    gaps.push("contract_state is invalid");
  }
  if (contract?.contract_hash !== hashContract(contract ?? {})) {
    gaps.push("contract_hash mismatch");
  }
  return { valid: gaps.length === 0, gaps };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function main() {
  const inputPath = process.argv[2];
  const input = inputPath && inputPath !== "-" ? readJson(inputPath) : {};
  const contract = buildAggregateDataCollectionPlanningContract({
    sourceReviewerApprovedMeasurementPlan:
      input.sourceReviewerApprovedMeasurementPlan ?? input.source_reviewer_approved_measurement_plan,
    sourceRecommendationPlan: input.sourceRecommendationPlan ?? input.source_recommendation_plan,
    aggregateDataCollectionPlan:
      input.aggregateDataCollectionPlan ?? input.aggregate_data_collection_plan
  });
  process.stdout.write(`${JSON.stringify(contract, null, 2)}\n`);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) {
  main();
}
