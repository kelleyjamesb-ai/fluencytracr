#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  REQUIRED_MILESTONE_SCHEDULE,
  buildHypothesisToMetricRecommendationPlan,
  validateHypothesisToMetricRecommendationPlan
} from "./run_ai_value_hypothesis_to_metric_recommendation.mjs";
import { validateMetricsLibrary } from "../shared/dist/aiValueEngine/index.js";

export const REPORTING_SPINE_SCHEMA_VERSION =
  "FT_AI_VALUE_CONTRIBUTION_REPORTING_SPINE_2026_06";

export const REQUIRED_REPORTING_SPINE_MILESTONES = [...REQUIRED_MILESTONE_SCHEDULE];

const READY_WITH_GAPS_STATE = "AI_CONTRIBUTION_REPORTING_SPINE_READY_WITH_EVIDENCE_GAPS";
const READY_FOR_UI_STATE =
  "AI_CONTRIBUTION_REPORTING_SPINE_READY_FOR_EXISTING_UI_INTEGRATION_INTERNAL_ONLY";
const HOLD_NEXT_STEP = "hold_for_reviewer_evidence_collection";
const COMPLETE_INPUTS_NEXT_STEP = "complete_missing_evidence_alignment_inputs";
const SOURCE_PACKAGE_NEXT_STEP = "prepare_comparison_design_source_package_only";
const DIAGNOSTICS_INPUT_NEXT_STEP =
  "identify_inputs_for_governed_diagnostics_sufficiency_review_only";
const PRODUCT_NEXT_STEP = "existing_ai_value_journey_workspace_reporting_integration_only";
const BAYESIAN_CHAIN_HELD_STATE = "HOLD_FOR_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE";
const BAYESIAN_CHAIN_ALLOWED_NEXT_STEP = "complete_governed_diagnostics_sufficiency_evidence_source";

const APPROVED_SELECTION_STATE = "APPROVED_FOR_COMPARISON_DESIGN_INTAKE";
const EXPECTATION_PLACEHOLDER = "REQUIRES_REVIEWER_APPROVAL_FROM_EXPECTATION_PATH";
const MILESTONE_RECONCILED_STATE = "RECONCILED_FOR_REPORTING_INPUT_ONLY";

const ROUTE_TO_FAMILY = new Map([
  ["CAPACITY_CREATION", "workflow_cycle_context"],
  ["COST_REDUCTION", "process_efficiency_context"],
  ["QUALITY_IMPROVEMENT", "quality_exception_context"],
  ["EXPERIENCE_IMPROVEMENT", "customer_experience_context"],
  ["RISK_REDUCTION", "risk_review_context"],
  ["REVENUE_EXPANSION", "stage_progression_context"]
]);

const KNOWN_LIBRARY_REFS = new Set([
  "docs/contracts/ai-value-intelligence/examples/customer-support-metrics-library.json",
  "docs/contracts/ai-value-intelligence/examples/customer-success-50-synthetic-metrics-library.json",
  "docs/contracts/ai-value-intelligence/examples/sales-pipeline-metrics-library.json"
]);

const SUPPORTED_OUTCOME_MILESTONE_SUFFIXES = new Set(["t0", "t30", "t60", "t90", "t180", "t365"]);
const DIRECTION_VALUES = new Set(["increase", "decrease", "maintain", "directional_review_required"]);

const EVIDENCE_ALIGNMENT_STATES = new Set([
  "NOT_READY",
  "HELD_FOR_MISSING_SAID_EVIDENCE",
  "HELD_FOR_MISSING_UNSAID_EVIDENCE",
  "HELD_FOR_MISSING_OUTCOME_EVIDENCE",
  "HELD_FOR_SUPPRESSED_OR_MISALIGNED_WINDOWS",
  "DIRECTIONALLY_ALIGNED_INTERNAL_ONLY",
  "READY_FOR_MODEL_REVIEW"
]);

const MODEL_ELIGIBILITY_STATUSES = new Set([
  "NOT_ELIGIBLE_FOR_MODEL_REVIEW",
  "HELD_FOR_EVIDENCE_GAPS",
  "HELD_FOR_COMPARISON_DESIGN_REVIEW",
  "HELD_FOR_DIAGNOSTICS_SUFFICIENCY_REVIEW",
  "ELIGIBLE_FOR_INTERNAL_MODEL_REVIEW_INPUT_ONLY"
]);

const ALLOWED_NEXT_STEPS = new Set([
  HOLD_NEXT_STEP,
  COMPLETE_INPUTS_NEXT_STEP,
  SOURCE_PACKAGE_NEXT_STEP,
  "run_comparison_design_adequacy_evidence_review_only",
  DIAGNOSTICS_INPUT_NEXT_STEP
]);

const REQUIRED_BLOCKED_CLAIMS = [
  "recommendation_is_not_evidence",
  "selected_metric_requires_reviewer_approval",
  "evidence_alignment_is_not_diagnostics_evidence",
  "model_review_posture_is_not_interpretation",
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
  person_level_data: false
});

const FEEDS = Object.freeze({
  bayesian_promotion_decision_gate: false,
  governed_diagnostics_sufficiency_evidence_source: false,
  diagnostics_evidence_packet: false,
  posterior_interpretation_specification_gate: false,
  confidence_or_probability_output: false,
  customer_economic_output: false,
  live_connector_execution: false,
  route_or_ui_creation: false,
  schema_persistence_or_export_creation: false
});

const DOWNSTREAM_SURFACES = [
  "frontend/src/pages/AIValueJourney.tsx",
  "frontend/src/pages/AIValueWorkspace.tsx",
  "frontend/src/pages/AIValueReadoutPrototype.tsx",
  "frontend/src/components/ClientQuestionMetricBridgePanel.tsx",
  "frontend/src/lib/aiValueMetricSelection.ts"
];

const SAFE_RENDER_FIELDS = [
  "blueprint_hypothesis_ref",
  "candidate_metric_recommendations",
  "selected_metric_approval_state",
  "milestone_measurement_plan",
  "evidence_alignment_state",
  "evidence_gap_list",
  "allowed_next_evidence_action",
  "model_review_input_posture",
  "blocked_claims"
];

const FORBIDDEN_KEYS = [
  "raw_rows",
  "user_id",
  "employee_id",
  "email",
  "query_text",
  "prompt",
  "transcript",
  "person_level_data",
  "confidence_percentage",
  "attribution_probability",
  "roi_value",
  "finance_output",
  "productivity_score"
];

const FORBIDDEN_VALUE_PATTERNS = [
  ["email_address", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
  ["raw_row_content", /\b(raw_rows?|row[-\s]?level|raw\s+event|raw\s+record)\b/i],
  ["identifier_value", /\b(user_id|employee_id|person_level|person-level|identifier)\b/i],
  ["prompt_or_transcript_value", /\b(prompt|transcript)\s*[:=]/i],
  ["query_text_value", /\b(select|insert|update|delete)\b[\s\S]{0,120}\b(from|where|table)\b/i],
  ["unsafe_economic_value", /\b(roi_value|productivity_score|confidence_percentage|attribution_probability)\b/i],
  [
    "unsafe_claim_language",
    /\b(confident|confidence|probability|posterior|roi|finance|economic|caused|causal|causality|attribution|productivity)\b/i
  ]
];

const NEXT_ACTIONS = new Map([
  ["missing_blueprint_hypothesis_ref", "clarify_blueprint_hypothesis"],
  ["missing_blueprint_hypothesis_statement", "clarify_blueprint_hypothesis"],
  ["ambiguous_blueprint_hypothesis_statement", "clarify_blueprint_hypothesis"],
  ["unsupported_value_route", "select_supported_blueprint_value_route"],
  ["missing_metric_library_refs", "supply_metric_library_refs"],
  ["unsupported_metric_library_ref", "supply_metric_library_refs"],
  ["missing_reviewer_metric_approval", "complete_reviewer_metric_selection_approval"],
  ["missing_expected_direction_or_lag_approval", "approve_expected_direction_and_lag"],
  ["missing_baseline_value_source_ref", "supply_baseline_value_source"],
  ["missing_comparison_condition_ref", "approve_comparison_condition"],
  ["missing_milestone_reconciliation", "complete_milestone_window_review"],
  ["missing_or_misaligned_milestone_windows", "complete_milestone_window_review"],
  ["missing_said_evidence_refs", "supply_said_evidence_refs"],
  ["missing_unsaid_behavioral_evidence_refs", "supply_unsaid_behavioral_evidence_refs"],
  ["missing_outcome_measurement_cell_refs", "supply_outcome_measurement_cell_refs"],
  ["missing_comparison_design_source_package", "complete_comparison_design_source_package"],
  ["missing_diagnostics_sufficiency_evidence", "collect_governed_diagnostics_sufficiency_evidence"]
]);

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

function safeRefArray(values, predicate) {
  if (!Array.isArray(values)) return [];
  return values.map((value) => safeScalar(value)).filter((value) => value && predicate(value));
}

function safeMilestoneRefs(refs) {
  const inputRefs = refs && typeof refs === "object" ? refs : {};
  return Object.fromEntries(
    REQUIRED_REPORTING_SPINE_MILESTONES.map((milestone) => [
      milestone,
      safeScalar(inputRefs[milestone])
    ])
  );
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function requiredBlockedClaimsPresent(claims) {
  const set = new Set(Array.isArray(claims) ? claims : []);
  return REQUIRED_BLOCKED_CLAIMS.every((claim) => set.has(claim));
}

function loadMetricLibrary(ref) {
  const library = JSON.parse(readFileSync(resolve(process.cwd(), ref), "utf8"));
  const validation = validateMetricsLibrary(library);
  return validation.valid === true ? library : null;
}

function sourceMetricById(ref, metricId) {
  if (!KNOWN_LIBRARY_REFS.has(ref)) return null;
  const library = loadMetricLibrary(ref);
  if (!library) return null;
  return library.metrics.find((metric) => metric.metric_id === metricId) ?? null;
}

function expectedFamilyForRoute(route) {
  return ROUTE_TO_FAMILY.get(route) ?? "unclassified_metric_context";
}

function recommendationMatchesSource(recommendation, suppliedMetricLibraryRefs) {
  const ref = stableString(recommendation?.source_metric_library_ref);
  const metricId = stableString(recommendation?.candidate_metric_id);
  if (!suppliedMetricLibraryRefs.has(ref)) return false;
  const metric = sourceMetricById(ref, metricId);
  if (!metric) return false;
  return (
    recommendation.candidate_metric_family === expectedFamilyForRoute(metric.value_route) &&
    recommendation.measurement_unit === metric.measurement_unit &&
    recommendation.metric_owner_role_ref === metric.owner &&
    recommendation.recommendation_state === "CANDIDATE_ONLY_NOT_SELECTED" &&
    recommendation.source_metric_library_id &&
    recommendation.source_metric_library_workflow_family === metric.workflow_family &&
    recommendation.expected_source_system_posture?.approved_grain === metric.source_system?.approved_grain
  );
}

function candidateSourceValidationGaps(recommendation, suppliedMetricLibraryRefs) {
  const gaps = [];
  const ref = stableString(recommendation?.source_metric_library_ref);
  const metricId = stableString(recommendation?.candidate_metric_id);
  if (!ref || !suppliedMetricLibraryRefs.has(ref)) {
    gaps.push("metric_library_refs must include every candidate source metric library ref");
  }
  if (!KNOWN_LIBRARY_REFS.has(ref)) {
    gaps.push("candidate source_metric_library_ref must be allowlisted");
    return gaps;
  }
  const metric = sourceMetricById(ref, metricId);
  if (!metric) {
    gaps.push("candidate_metric_id must exist in source metric library");
    return gaps;
  }
  if (recommendation.candidate_metric_family !== expectedFamilyForRoute(metric.value_route)) {
    gaps.push("candidate_metric_family must match source metric library value route");
  }
  if (recommendation.measurement_unit !== metric.measurement_unit) {
    gaps.push("candidate measurement_unit must match source metric library");
  }
  if (recommendation.metric_owner_role_ref !== metric.owner) {
    gaps.push("candidate metric_owner_role_ref must match source metric library");
  }
  if (recommendation.recommendation_state !== "CANDIDATE_ONLY_NOT_SELECTED") {
    gaps.push("candidate recommendation_state must remain CANDIDATE_ONLY_NOT_SELECTED");
  }
  const library = loadMetricLibrary(ref);
  if (library && recommendation.source_metric_library_id !== library.library_id) {
    gaps.push("candidate source_metric_library_id must match source metric library");
  }
  if (recommendation.source_metric_library_workflow_family !== metric.workflow_family) {
    gaps.push("candidate source_metric_library_workflow_family must match source metric library");
  }
  if (recommendation.expected_source_system_posture?.approved_grain !== metric.source_system?.approved_grain) {
    gaps.push("candidate expected_source_system_posture.approved_grain must match source metric library");
  }
  return gaps;
}

function selectedMetricSourceTuple(selection, candidateRecommendations) {
  const selectedMetricId = stableString(selection?.selected_metric_id);
  return candidateRecommendations.find(
    (recommendation) => stableString(recommendation.candidate_metric_id) === selectedMetricId
  ) ?? null;
}

function isApprovedSelection(selection, blueprintRef, candidateRecommendations) {
  if (!selection || typeof selection !== "object") return false;
  const candidate = selectedMetricSourceTuple(selection, candidateRecommendations);
  return Boolean(
    selection.approval_state === APPROVED_SELECTION_STATE &&
    stableString(selection.approved_metric_selection_ref) &&
    stableString(selection.source_blueprint_hypothesis_ref) === blueprintRef &&
    candidate &&
    stableString(selection.selected_metric_family) === candidate.candidate_metric_family &&
    stableString(selection.selected_measurement_unit) === candidate.measurement_unit &&
    stableString(selection.metric_owner_role_ref) === candidate.metric_owner_role_ref &&
    stableString(selection.approval_role_ref) &&
    !containsForbiddenValue(selection.approval_role_ref)
  );
}

function hasApprovedDirectionAndLag(selection) {
  return (
    DIRECTION_VALUES.has(stableString(selection?.expected_movement_direction)) &&
    stableString(selection?.expected_lag_definition) &&
    stableString(selection?.expected_lag_definition) !== EXPECTATION_PLACEHOLDER &&
    /^lag_definition\.[a-z0-9_.-]+$/i.test(stableString(selection?.expected_lag_definition)) &&
    !containsForbiddenValue(selection?.expected_lag_definition)
  );
}

function isSaidEvidenceRef(ref) {
  return /^(ai_fluency_aggregate|approved_ai_fluency_aggregate_ref|blueprint_hypothesis|approved_blueprint_hypothesis)\.[a-z0-9_.-]+$/i.test(ref);
}

function isUnsaidEvidenceRef(ref) {
  return /^(workflow_evidence|behavioral_workflow_evidence|aggregate_operator_review_ref)\.[a-z0-9_.-]+$/i.test(ref);
}

function isOutcomeMeasurementCellRef(ref) {
  const match = ref.match(/^measurement_cell\.[a-z0-9_.-]+\.([a-z0-9_]+)$/i);
  return Boolean(match && SUPPORTED_OUTCOME_MILESTONE_SUFFIXES.has(match[1].toLowerCase()));
}

function isComparisonDesignSourcePackageRef(ref) {
  return /^comparison_design_source_package\.[a-z0-9_.-]+$/i.test(ref);
}

function hasValidRefArray(values, predicate) {
  return safeRefArray(values, predicate).length > 0;
}

function hasMilestoneReadiness(status) {
  if (!status || typeof status !== "object") return false;
  const refs = status.milestone_refs ?? {};
  const hasAllRefs = REQUIRED_REPORTING_SPINE_MILESTONES.every((milestone) => stableString(refs[milestone]));
  return (
    stableString(status.schedule_ref) &&
    status.window_alignment_state === "ALIGNED_FOR_REPORTING" &&
    status.suppression_missing_held_review_state === "CLEAR" &&
    status.staleness_review_state === "CURRENT" &&
    status.unsupported_milestone_days_hold_for_reconciliation === true &&
    status.milestone_reconciliation_state === MILESTONE_RECONCILED_STATE &&
    hasAllRefs
  );
}

function hasMilestoneRefsAndClearWindows(status) {
  if (!status || typeof status !== "object") return false;
  const refs = status.milestone_refs ?? {};
  return (
    stableString(status.schedule_ref) &&
    status.window_alignment_state === "ALIGNED_FOR_REPORTING" &&
    status.suppression_missing_held_review_state === "CLEAR" &&
    status.staleness_review_state === "CURRENT" &&
    status.unsupported_milestone_days_hold_for_reconciliation === true &&
    REQUIRED_REPORTING_SPINE_MILESTONES.every((milestone) => stableString(refs[milestone]))
  );
}

function computeEvidenceGaps(input, recommendationPlan, approvedSelection, directionLagApproved) {
  const gaps = [...(recommendationPlan.evidence_gap_list ?? [])];
  if (recommendationPlan.recommendation_state !== "CANDIDATE_RECOMMENDATIONS_ONLY_NOT_EVIDENCE") {
    return unique(gaps);
  }
  if (!approvedSelection) gaps.push("missing_reviewer_metric_approval");
  const selection = input.selected_metric_approval ?? {};
  if (approvedSelection && !directionLagApproved) gaps.push("missing_expected_direction_or_lag_approval");
  if (approvedSelection && !stableString(selection.baseline_value_source_ref)) {
    gaps.push("missing_baseline_value_source_ref");
  }
  if (approvedSelection && !stableString(selection.comparison_condition_ref)) {
    gaps.push("missing_comparison_condition_ref");
  }
  if (approvedSelection && !hasMilestoneRefsAndClearWindows(input.milestone_window_status)) {
    gaps.push("missing_or_misaligned_milestone_windows");
  }
  if (
    approvedSelection &&
    hasMilestoneRefsAndClearWindows(input.milestone_window_status) &&
    input.milestone_window_status?.milestone_reconciliation_state !== MILESTONE_RECONCILED_STATE
  ) {
    gaps.push("missing_milestone_reconciliation");
  }
  if (approvedSelection && !hasValidRefArray(input.said_evidence_refs, isSaidEvidenceRef)) {
    gaps.push("missing_said_evidence_refs");
  }
  if (approvedSelection && !hasValidRefArray(input.unsaid_behavioral_evidence_refs, isUnsaidEvidenceRef)) {
    gaps.push("missing_unsaid_behavioral_evidence_refs");
  }
  if (
    approvedSelection &&
    !hasValidRefArray(input.aggregate_outcome_measurement_cell_refs, isOutcomeMeasurementCellRef)
  ) {
    gaps.push("missing_outcome_measurement_cell_refs");
  }
  if (
    approvedSelection &&
    (!isComparisonDesignSourcePackageRef(stableString(input.comparison_design_source_package_ref)) ||
      input.comparison_design_posture !== "READY_FOR_COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEW")
  ) {
    gaps.push("missing_comparison_design_source_package");
  }
  if (
    approvedSelection &&
    directionLagApproved &&
    hasMilestoneReadiness(input.milestone_window_status) &&
    hasValidRefArray(input.said_evidence_refs, isSaidEvidenceRef) &&
    hasValidRefArray(input.unsaid_behavioral_evidence_refs, isUnsaidEvidenceRef) &&
    hasValidRefArray(input.aggregate_outcome_measurement_cell_refs, isOutcomeMeasurementCellRef) &&
    isComparisonDesignSourcePackageRef(stableString(input.comparison_design_source_package_ref)) &&
    input.comparison_design_posture === "READY_FOR_COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEW"
  ) {
    gaps.push("missing_diagnostics_sufficiency_evidence");
  }
  return unique(gaps);
}

function evidenceAlignmentState(gaps, recommendationPlan) {
  if (recommendationPlan.planning_state === "HOLD_FOR_BLUEPRINT_HYPOTHESIS") {
    return "NOT_READY";
  }
  if (recommendationPlan.planning_state === "HOLD_FOR_AMBIGUOUS_BLUEPRINT_HYPOTHESIS") {
    return "NOT_READY";
  }
  if (recommendationPlan.planning_state === "HOLD_FOR_UNSUPPORTED_VALUE_ROUTE") {
    return "NOT_READY";
  }
  if (recommendationPlan.planning_state === "HOLD_FOR_METRIC_LIBRARY_REFS") {
    return "NOT_READY";
  }
  if (gaps.includes("missing_reviewer_metric_approval")) {
    return "NOT_READY";
  }
  if (gaps.includes("missing_expected_direction_or_lag_approval")) {
    return "NOT_READY";
  }
  if (
    gaps.includes("missing_baseline_value_source_ref") ||
    gaps.includes("missing_comparison_condition_ref") ||
    gaps.includes("missing_milestone_reconciliation") ||
    gaps.includes("missing_or_misaligned_milestone_windows")
  ) {
    return "HELD_FOR_SUPPRESSED_OR_MISALIGNED_WINDOWS";
  }
  if (gaps.includes("missing_said_evidence_refs")) return "HELD_FOR_MISSING_SAID_EVIDENCE";
  if (gaps.includes("missing_unsaid_behavioral_evidence_refs")) {
    return "HELD_FOR_MISSING_UNSAID_EVIDENCE";
  }
  if (gaps.includes("missing_outcome_measurement_cell_refs")) {
    return "HELD_FOR_MISSING_OUTCOME_EVIDENCE";
  }
  if (gaps.includes("missing_comparison_design_source_package")) {
    return "DIRECTIONALLY_ALIGNED_INTERNAL_ONLY";
  }
  return "READY_FOR_MODEL_REVIEW";
}

function firstNextEvidenceAction(gaps) {
  for (const gap of gaps) {
    if (NEXT_ACTIONS.has(gap)) return NEXT_ACTIONS.get(gap);
  }
  return "existing_ai_value_journey_workspace_reporting_integration";
}

function allowedNextStepForGaps(gaps) {
  if (!gaps.length) return DIAGNOSTICS_INPUT_NEXT_STEP;
  if (
    gaps.includes("missing_blueprint_hypothesis_ref") ||
    gaps.includes("missing_blueprint_hypothesis_statement") ||
    gaps.includes("ambiguous_blueprint_hypothesis_statement") ||
    gaps.includes("unsupported_value_route") ||
    gaps.includes("missing_metric_library_refs") ||
    gaps.includes("unsupported_metric_library_ref")
  ) {
    return HOLD_NEXT_STEP;
  }
  if (gaps.includes("missing_comparison_design_source_package")) return SOURCE_PACKAGE_NEXT_STEP;
  if (gaps.includes("missing_diagnostics_sufficiency_evidence")) return DIAGNOSTICS_INPUT_NEXT_STEP;
  return COMPLETE_INPUTS_NEXT_STEP;
}

function reportingStateFromPlan(recommendationPlan) {
  if (recommendationPlan.planning_state?.startsWith("HOLD_")) {
    return recommendationPlan.planning_state;
  }
  return READY_WITH_GAPS_STATE;
}

function safeInterpretationGuidance(alignmentState) {
  const held = alignmentState !== "READY_FOR_MODEL_REVIEW";
  return {
    guidance_state: held ? "HELD_SAFE_LANGUAGE" : "AGGREGATE_ALIGNMENT_INPUT_READY_SAFE_LANGUAGE",
    text: held
      ? "Aggregate reporting refs show which planning or evidence inputs are missing or held. Model review remains separate and governed."
      : "Aggregate planning, selected-metric, and evidence refs are present for internal model-review input preparation. Diagnostics sufficiency remains separately governed.",
    no_causality_claim: true,
    no_confidence_or_probability_language: true,
    no_roi_finance_productivity_claim: true,
    no_customer_facing_economic_output: true,
    no_individual_or_team_scoring: true,
    model_status_separate_from_interpretation: true
  };
}

function customerSafeInterpretationText(alignmentState) {
  return alignmentState === "READY_FOR_MODEL_REVIEW"
    ? "Aggregate planning, selected-metric, and evidence refs are present for internal model-review input preparation. Diagnostics sufficiency remains separately governed."
    : "Aggregate reporting refs show which planning or evidence inputs are missing or held. Model review remains separate and governed.";
}

function modelEligibilityStatus(alignmentState, gaps) {
  if (alignmentState === "READY_FOR_MODEL_REVIEW") {
    return "ELIGIBLE_FOR_INTERNAL_MODEL_REVIEW_INPUT_ONLY";
  }
  if (gaps.includes("missing_comparison_design_source_package")) {
    return "HELD_FOR_COMPARISON_DESIGN_REVIEW";
  }
  if (gaps.includes("missing_diagnostics_sufficiency_evidence")) {
    return "HELD_FOR_DIAGNOSTICS_SUFFICIENCY_REVIEW";
  }
  if (gaps.length > 0) return "HELD_FOR_EVIDENCE_GAPS";
  return "NOT_ELIGIBLE_FOR_MODEL_REVIEW";
}

function selectedMetricSummary(selection, approved) {
  if (!approved) {
    return {
      approved_metric_selection_ref: null,
      source_blueprint_hypothesis_ref: null,
      selected_metric_id: null,
      selected_metric_family: null,
      selected_measurement_unit: null,
      metric_owner_role_ref: null,
      expected_movement_direction: null,
      expected_lag_definition: null,
      baseline_value_source_ref: null,
      comparison_condition_ref: null,
      milestone_schedule_ref: null,
      approval_state: "HOLD_FOR_REVIEWER_APPROVAL",
      approval_role_ref: null
    };
  }
  return {
    approved_metric_selection_ref: safeScalar(selection.approved_metric_selection_ref),
    source_blueprint_hypothesis_ref: safeScalar(selection.source_blueprint_hypothesis_ref),
    selected_metric_id: safeScalar(selection.selected_metric_id),
    selected_metric_family: safeScalar(selection.selected_metric_family),
    selected_measurement_unit: safeScalar(selection.selected_measurement_unit),
    metric_owner_role_ref: safeScalar(selection.metric_owner_role_ref),
    expected_movement_direction: safeScalar(selection.expected_movement_direction),
    expected_lag_definition: safeScalar(selection.expected_lag_definition),
    baseline_value_source_ref: safeScalar(selection.baseline_value_source_ref),
    comparison_condition_ref: safeScalar(selection.comparison_condition_ref),
    milestone_schedule_ref: safeScalar(selection.milestone_schedule_ref),
    approval_state: APPROVED_SELECTION_STATE,
    approval_role_ref: safeScalar(selection.approval_role_ref)
  };
}

export function buildAiContributionReportingSpine(input = {}) {
  const recommendationPlan = buildHypothesisToMetricRecommendationPlan(input);
  const recommendationValidation = validateHypothesisToMetricRecommendationPlan(recommendationPlan);
  const candidateRecommendations =
    recommendationValidation.valid === true
      ? (recommendationPlan.candidate_metric_recommendations ?? [])
      : [];
  const approvedSelection = isApprovedSelection(
    input.selected_metric_approval,
    stableString(recommendationPlan.blueprint_hypothesis_ref),
    candidateRecommendations
  );
  const directionLagApproved = approvedSelection && hasApprovedDirectionAndLag(input.selected_metric_approval);
  const evidenceGaps = computeEvidenceGaps(
    input,
    recommendationPlan,
    approvedSelection,
    directionLagApproved
  );
  const alignmentState = evidenceAlignmentState(evidenceGaps, recommendationPlan);
  const reportingState =
    recommendationValidation.valid && recommendationPlan.recommendation_state === "CANDIDATE_RECOMMENDATIONS_ONLY_NOT_EVIDENCE"
      ? (alignmentState === "READY_FOR_MODEL_REVIEW" ? READY_FOR_UI_STATE : READY_WITH_GAPS_STATE)
      : reportingStateFromPlan(recommendationPlan);
  const safeMetricLibraryRefs = Array.isArray(recommendationPlan.metric_library_refs)
    ? recommendationPlan.metric_library_refs
        .map((ref) => safeScalar(ref))
        .filter((ref) => ref && KNOWN_LIBRARY_REFS.has(ref))
    : [];
  const safeSaidEvidenceRefs = safeRefArray(input.said_evidence_refs, isSaidEvidenceRef);
  const safeUnsaidEvidenceRefs = safeRefArray(input.unsaid_behavioral_evidence_refs, isUnsaidEvidenceRef);
  const safeOutcomeMeasurementCellRefs = safeRefArray(
    input.aggregate_outcome_measurement_cell_refs,
    isOutcomeMeasurementCellRef
  );
  const rawComparisonDesignSourcePackageRef = stableString(input.comparison_design_source_package_ref);
  const safeComparisonDesignSourcePackageRef = isComparisonDesignSourcePackageRef(rawComparisonDesignSourcePackageRef)
    ? rawComparisonDesignSourcePackageRef
    : null;

  return {
    schema_version: REPORTING_SPINE_SCHEMA_VERSION,
    reporting_spine_state: reportingState,
    reporting_spine_class: "ai_contribution_reporting_spine_internal_customer_safe_contract",
    internal_only: true,
    aggregate_only: true,
    source_ref_only: true,
    source_bound: false,
    validation_current: false,
    fail_closed: true,
    blueprint_hypothesis_ref: safeScalar(recommendationPlan.blueprint_hypothesis_ref),
    value_route: safeScalar(recommendationPlan.value_route),
    normalized_value_route: recommendationPlan.normalized_value_route ?? null,
    workflow_function_scope: safeScalar(recommendationPlan.workflow_function_scope),
    cohort_scope: safeScalar(recommendationPlan.cohort_scope),
    metric_library_refs: safeMetricLibraryRefs,
    candidate_metric_recommendation_state: recommendationPlan.recommendation_state,
    candidate_metric_recommendations: candidateRecommendations,
    recommendation_rationale: recommendationPlan.recommendation_rationale,
    recommendations_create_evidence: false,
    recommendations_are_selected_metrics: false,
    selected_metric_approved: Boolean(approvedSelection && directionLagApproved),
    selected_metric_approval_state: approvedSelection
      ? (directionLagApproved ? APPROVED_SELECTION_STATE : "HOLD_FOR_EXPECTATION_PATH_APPROVAL")
      : "HOLD_FOR_REVIEWER_APPROVAL",
    approved_measurement_plan_ref: approvedSelection
      ? safeScalar(input.selected_metric_approval.approved_metric_selection_ref)
      : null,
    selected_metric: selectedMetricSummary(
      input.selected_metric_approval,
      Boolean(approvedSelection && directionLagApproved)
    ),
    milestone_measurement_plan: {
      schedule_state: hasMilestoneReadiness(input.milestone_window_status)
        ? "MILESTONE_WINDOWS_READY_FOR_REPORTING_INPUT"
        : "HOLD_FOR_MILESTONE_WINDOW_REVIEW",
      required_milestones: [...REQUIRED_REPORTING_SPINE_MILESTONES],
      schedule_ref: safeScalar(input.milestone_window_status?.schedule_ref),
      milestone_refs: safeMilestoneRefs(input.milestone_window_status?.milestone_refs),
      milestone_reconciliation_state: safeScalar(input.milestone_window_status?.milestone_reconciliation_state),
      milestones_are_planning_only: true,
      unsupported_milestone_days_hold_for_reconciliation:
        input.milestone_window_status?.unsupported_milestone_days_hold_for_reconciliation === true
    },
    measurement_readiness_state: hasMilestoneReadiness(input.milestone_window_status)
      ? "AGGREGATE_MEASUREMENT_CONTEXT_READY_INTERNAL_ONLY"
      : "HELD_FOR_MISSING_MILESTONE_WINDOWS",
    said_evidence_state:
      safeSaidEvidenceRefs.length > 0
        ? "PRESENT_AGGREGATE_REVIEWED_REFS"
        : "HELD_FOR_MISSING_SAID_EVIDENCE",
    unsaid_evidence_state:
      safeUnsaidEvidenceRefs.length > 0
        ? "PRESENT_AGGREGATE_REVIEWED_REFS"
        : "HELD_FOR_MISSING_UNSAID_EVIDENCE",
    outcome_movement_state:
      safeOutcomeMeasurementCellRefs.length > 0
        ? "PRESENT_AGGREGATE_MEASUREMENT_CELL_REFS"
        : "HELD_FOR_MISSING_OUTCOME_EVIDENCE",
    said_evidence_refs: safeSaidEvidenceRefs,
    unsaid_behavioral_evidence_refs: safeUnsaidEvidenceRefs,
    aggregate_outcome_measurement_cell_refs: safeOutcomeMeasurementCellRefs,
    comparison_design_posture: safeComparisonDesignSourcePackageRef
      ? safeScalar(input.comparison_design_posture) || "SOURCE_PACKAGE_IN_PREPARATION"
      : "SOURCE_PACKAGE_MISSING",
    comparison_design_source_package_ref: safeComparisonDesignSourcePackageRef,
    evidence_alignment_state: alignmentState,
    evidence_gap_list: evidenceGaps,
    evidence_dimensions_satisfied: [],
    diagnostics_evidence_satisfied: false,
    model_eligibility_status: modelEligibilityStatus(alignmentState, evidenceGaps),
    model_review_input_posture:
      alignmentState === "READY_FOR_MODEL_REVIEW"
        ? "MODEL_REVIEW_INPUT_READY_DIAGNOSTICS_STILL_GOVERNED"
        : "MODEL_REVIEW_INPUT_HELD_FOR_EVIDENCE_GAPS",
    customer_safe_interpretation: customerSafeInterpretationText(alignmentState),
    customer_publishable: false,
    customer_safe_interpretation_guidance: safeInterpretationGuidance(alignmentState),
    existing_ui_integration_readiness: {
      readiness_state: "DOWNSTREAM_VIEW_MODEL_CONTRACT_READY_INTERNAL_ONLY",
      downstream_only: true,
      creates_new_ui: false,
      creates_routes: false,
      creates_schemas: false,
      persistence_write: false,
      export_creation: false,
      downstream_surfaces: [...DOWNSTREAM_SURFACES],
      safe_render_fields: [...SAFE_RENDER_FIELDS],
      blocked_render_fields: [
        "confidence_output",
        "probability_output",
        "roi_output",
        "finance_output",
        "causality_output",
        "productivity_output",
        "customer_facing_economic_output",
        "raw_rows",
        "identifiers",
        "query_text",
        "prompts",
        "transcripts",
        "person_level_data",
        "live_connector_execution"
      ]
    },
    blocked_claims: [...REQUIRED_BLOCKED_CLAIMS],
    blocked_outputs: { ...BLOCKED_OUTPUTS },
    feeds: { ...FEEDS },
    posterior_interpretation_authorized: false,
    promotion_authorized: false,
    bayesian_chain_state: {
      current_state: BAYESIAN_CHAIN_HELD_STATE,
      allowed_next_step: BAYESIAN_CHAIN_ALLOWED_NEXT_STEP,
      changed_by_this_spine: false
    },
    allowed_next_evidence_action: firstNextEvidenceAction(evidenceGaps),
    allowed_next_step: allowedNextStepForGaps(evidenceGaps),
    product_next_step: PRODUCT_NEXT_STEP
  };
}

export function validateAiContributionReportingSpine(spine) {
  const gaps = [];
  if (spine?.schema_version !== REPORTING_SPINE_SCHEMA_VERSION) gaps.push("schema_version is invalid");
  if (spine?.internal_only !== true) gaps.push("internal_only must be true");
  if (spine?.aggregate_only !== true) gaps.push("aggregate_only must be true");
  if (spine?.source_ref_only !== true) gaps.push("source_ref_only must be true");
  if (spine?.source_bound !== false) gaps.push("source_bound must be false for this planning/reporting spine");
  if (spine?.validation_current !== false) gaps.push("validation_current must be false for this planning/reporting spine");
  if (spine?.fail_closed !== true) gaps.push("fail_closed must be true");
  if (spine?.recommendations_create_evidence !== false) {
    gaps.push("recommendations_create_evidence must be false");
  }
  if (spine?.recommendations_are_selected_metrics !== false) {
    gaps.push("recommendations_are_selected_metrics must be false");
  }
  if (spine?.diagnostics_evidence_satisfied !== false) {
    gaps.push("diagnostics_evidence_satisfied must be false");
  }
  if (Array.isArray(spine?.evidence_dimensions_satisfied) && spine.evidence_dimensions_satisfied.length > 0) {
    gaps.push("evidence_dimensions_satisfied must remain empty");
  }
  if (spine?.posterior_interpretation_authorized !== false) {
    gaps.push("posterior_interpretation_authorized must be false");
  }
  if (spine?.promotion_authorized !== false) gaps.push("promotion_authorized must be false");
  if (spine?.customer_publishable !== false) gaps.push("customer_publishable must be false");
  if (!EVIDENCE_ALIGNMENT_STATES.has(spine?.evidence_alignment_state)) {
    gaps.push("evidence_alignment_state must use the evidence alignment result enum");
  }
  if (!MODEL_ELIGIBILITY_STATUSES.has(spine?.model_eligibility_status)) {
    gaps.push("model_eligibility_status is invalid");
  }
  if (!ALLOWED_NEXT_STEPS.has(spine?.allowed_next_step)) {
    gaps.push("allowed_next_step is invalid for evidence alignment");
  }
  if (spine?.product_next_step !== PRODUCT_NEXT_STEP) {
    gaps.push("product_next_step must name the downstream existing UI integration step");
  }
  if (!spine?.customer_safe_interpretation || containsForbiddenValue(spine.customer_safe_interpretation)) {
    gaps.push("customer_safe_interpretation must be present and safe");
  }
  if (!requiredBlockedClaimsPresent(spine?.blocked_claims)) {
    gaps.push("blocked_claims must include every required blocked claim");
  }
  if (
    JSON.stringify(spine?.milestone_measurement_plan?.required_milestones ?? []) !==
    JSON.stringify(REQUIRED_REPORTING_SPINE_MILESTONES)
  ) {
    gaps.push("milestone schedule must include T0/T30/T60/T90/T120/T180/T270/T365");
  }
  if (spine?.milestone_measurement_plan?.milestones_are_planning_only !== true) {
    gaps.push("milestones_are_planning_only must be true");
  }
  const suppliedMetricLibraryRefs = new Set(Array.isArray(spine?.metric_library_refs) ? spine.metric_library_refs : []);
  for (const recommendation of spine?.candidate_metric_recommendations ?? []) {
    gaps.push(...candidateSourceValidationGaps(recommendation, suppliedMetricLibraryRefs));
    if (recommendation.recommendation_is_evidence !== false) {
      gaps.push("candidate metric recommendations must not be evidence");
    }
    if (recommendation.selected_metric_approved !== false) {
      gaps.push("candidate metric recommendations must not approve selected metrics");
    }
    if (recommendation.evidence_satisfied !== false) {
      gaps.push("candidate metric recommendations must not satisfy evidence");
    }
  }
  for (const field of Object.keys(BLOCKED_OUTPUTS)) {
    if (spine?.blocked_outputs?.[field] !== false) {
      gaps.push(`blocked_outputs.${field} must be present and false`);
    }
  }
  for (const field of Object.keys(FEEDS)) {
    if (spine?.feeds?.[field] !== false) {
      gaps.push(`feeds.${field} must be present and false`);
    }
  }
  if (spine?.bayesian_chain_state?.current_state !== BAYESIAN_CHAIN_HELD_STATE) {
    gaps.push("bayesian_chain_state.current_state must remain held");
  }
  if (spine?.bayesian_chain_state?.allowed_next_step !== BAYESIAN_CHAIN_ALLOWED_NEXT_STEP) {
    gaps.push("bayesian_chain_state.allowed_next_step must remain governed diagnostics source completion");
  }
  if (spine?.bayesian_chain_state?.changed_by_this_spine !== false) {
    gaps.push("bayesian_chain_state.changed_by_this_spine must be false");
  }
  const ui = spine?.existing_ui_integration_readiness ?? {};
  if (ui.downstream_only !== true) gaps.push("existing UI integration must be downstream-only");
  for (const field of [
    "creates_new_ui",
    "creates_routes",
    "creates_schemas",
    "persistence_write",
    "export_creation"
  ]) {
    if (ui[field] !== false) gaps.push(`existing_ui_integration_readiness.${field} must be present and false`);
  }
  if (
    spine?.model_review_input_posture === "MODEL_REVIEW_INPUT_READY_DIAGNOSTICS_STILL_GOVERNED" &&
    spine?.evidence_alignment_state !== "READY_FOR_MODEL_REVIEW"
  ) {
    gaps.push("model review input posture cannot be ready unless evidence alignment input is ready");
  }
  if (
    spine?.selected_metric_approved === true &&
    !isApprovedSelection(
      spine.selected_metric,
      stableString(spine.blueprint_hypothesis_ref),
      spine.candidate_metric_recommendations ?? []
    )
  ) {
    gaps.push("selected_metric must bind to an approved source-library candidate tuple");
  }
  if (spine?.selected_metric_approved === true && !hasApprovedDirectionAndLag(spine.selected_metric)) {
    gaps.push("selected_metric expected direction and lag must be approved controlled values");
  }
  if (spine?.customer_safe_interpretation_guidance?.model_status_separate_from_interpretation !== true) {
    gaps.push("model status must remain separate from interpretation guidance");
  }

  const unsafePaths = [];
  const scanForbidden = (value, path = []) => {
    if (
      path.includes("blocked_outputs") ||
      path.includes("blocked_claims") ||
      path.includes("blocked_render_fields")
    ) {
      return;
    }
    if (value === null || value === undefined) return;
    if (typeof value === "string") {
      for (const [name, pattern] of FORBIDDEN_VALUE_PATTERNS) {
        if (pattern.test(value)) unsafePaths.push(`${path.join(".") || "root"}:${name}`);
      }
      return;
    }
    if (typeof value !== "object") return;
    for (const [key, nested] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.includes(key.toLowerCase())) {
        unsafePaths.push([...path, key].join("."));
      }
      scanForbidden(nested, [...path, key]);
    }
  };
  scanForbidden(spine);
  for (const unsafePath of unsafePaths) gaps.push(`forbidden content present: ${unsafePath}`);

  return {
    valid: gaps.length === 0,
    gaps
  };
}

function readInput(argv) {
  const inputArg = argv[0];
  if (!inputArg) return {};
  if (inputArg === "-") return JSON.parse(readFileSync(0, "utf8"));
  return JSON.parse(readFileSync(resolve(process.cwd(), inputArg), "utf8"));
}

function main() {
  const input = readInput(process.argv.slice(2));
  const spine = buildAiContributionReportingSpine(input);
  process.stdout.write(`${JSON.stringify(spine, null, 2)}\n`);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) {
  main();
}
