#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validateMetricsLibrary } from "../shared/dist/aiValueEngine/index.js";

export const SCHEMA_VERSION =
  "FT_AI_VALUE_HYPOTHESIS_TO_METRIC_RECOMMENDATION_PLAN_2026_06";

export const REQUIRED_MILESTONE_SCHEDULE = [
  "T0_baseline",
  "T30",
  "T60",
  "T90",
  "T120",
  "T180_6_month",
  "T270_9_month",
  "T365_12_month"
];

const READY_STATE = "CANDIDATE_METRIC_FAMILIES_DRAFTED_NOT_SELECTED_NOT_EVIDENCE";
const RECOMMENDATION_READY_STATE = "CANDIDATE_RECOMMENDATIONS_ONLY_NOT_EVIDENCE";
const HELD_RECOMMENDATION_STATE = "HELD_NOT_RECOMMENDED";
const READY_ALLOWED_NEXT_STEP = "ai_contribution_evidence_alignment_reporting_data_model_only";
const HELD_ALLOWED_NEXT_STEP = "hold_for_reviewer_evidence_collection";
const READY_LOCAL_NEXT_ACTION = "prepare_reviewer_metric_selection_draft_only";
const HELD_LOCAL_NEXT_ACTION = "resolve_held_hypothesis_or_metric_library_inputs";
const BAYESIAN_CHAIN_HELD_STATE = "HOLD_FOR_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE";
const BAYESIAN_CHAIN_ALLOWED_NEXT_STEP = "complete_governed_diagnostics_sufficiency_evidence_source";
const REVIEWER_APPROVAL_PLACEHOLDER = "REQUIRES_REVIEWER_APPROVAL_FROM_EXPECTATION_PATH";

const KNOWN_LIBRARY_REFS = new Set([
  "docs/contracts/ai-value-intelligence/examples/customer-support-metrics-library.json",
  "docs/contracts/ai-value-intelligence/examples/customer-success-50-synthetic-metrics-library.json",
  "docs/contracts/ai-value-intelligence/examples/sales-pipeline-metrics-library.json"
]);

const VALUE_ROUTE_ALIASES = new Map([
  ["CAPACITY_CREATION", "CAPACITY_CREATION"],
  ["capacity_creation", "CAPACITY_CREATION"],
  ["delivery_flow", "CAPACITY_CREATION"],
  ["throughput", "CAPACITY_CREATION"],
  ["COST_REDUCTION", "COST_REDUCTION"],
  ["cost_reduction", "COST_REDUCTION"],
  ["cost_context", "COST_REDUCTION"],
  ["reduce_costs", "COST_REDUCTION"],
  ["QUALITY_IMPROVEMENT", "QUALITY_IMPROVEMENT"],
  ["quality_improvement", "QUALITY_IMPROVEMENT"],
  ["quality", "QUALITY_IMPROVEMENT"],
  ["EXPERIENCE_IMPROVEMENT", "EXPERIENCE_IMPROVEMENT"],
  ["experience_improvement", "EXPERIENCE_IMPROVEMENT"],
  ["experience", "EXPERIENCE_IMPROVEMENT"],
  ["RISK_REDUCTION", "RISK_REDUCTION"],
  ["risk_reduction", "RISK_REDUCTION"],
  ["risk", "RISK_REDUCTION"],
  ["REVENUE_EXPANSION", "REVENUE_EXPANSION"],
  ["revenue_expansion", "REVENUE_EXPANSION"],
  ["sales_cycle", "REVENUE_EXPANSION"]
]);

const ROUTE_TO_FAMILY = new Map([
  ["CAPACITY_CREATION", "workflow_cycle_context"],
  ["COST_REDUCTION", "process_efficiency_context"],
  ["QUALITY_IMPROVEMENT", "quality_exception_context"],
  ["EXPERIENCE_IMPROVEMENT", "customer_experience_context"],
  ["RISK_REDUCTION", "risk_review_context"],
  ["REVENUE_EXPANSION", "stage_progression_context"]
]);

const PRIORITY_ORDER = new Map([
  ["P0", 0],
  ["P1", 1],
  ["P2", 2]
]);

const REQUIRED_BLOCKED_CLAIMS = [
  "recommendation_is_not_evidence",
  "selected_metric_not_approved",
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

function safeMetricLibraryRefs(values) {
  if (!Array.isArray(values)) return [];
  return values
    .map((ref) => safeScalar(ref))
    .filter((ref) => ref && KNOWN_LIBRARY_REFS.has(ref));
}

function normalizeRoute(route) {
  const raw = stableString(route);
  return VALUE_ROUTE_ALIASES.get(raw) ?? null;
}

function isAmbiguousHypothesis(statement) {
  const normalized = stableString(statement).toLowerCase();
  if (normalized.length < 40) return true;
  if (/\b(things|stuff|somehow|better|improve everything|do more)\b/.test(normalized)) {
    return true;
  }
  return false;
}

function loadMetricLibrary(ref) {
  const path = resolve(process.cwd(), ref);
  const library = JSON.parse(readFileSync(path, "utf8"));
  return { ref, library };
}

function loadMetricLibraries(refs) {
  return refs
    .filter((ref) => KNOWN_LIBRARY_REFS.has(ref))
    .map((ref) => loadMetricLibrary(ref));
}

function validateLoadedMetricLibraries(libraries) {
  const gaps = [];
  for (const { ref, library } of libraries) {
    const validation = validateMetricsLibrary(library);
    if (validation.valid !== true) {
      gaps.push(
        ...validation.gaps.map((gap) => `metric_library_validation_failed:${ref}:${gap}`)
      );
    }
  }
  return gaps;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function defaultReviewerApprovalFields(input) {
  return {
    approved_metric_selection_ref: null,
    source_blueprint_hypothesis_ref: safeScalar(input.blueprint_hypothesis_ref),
    selected_metric_id: null,
    selected_metric_family: null,
    selected_measurement_unit: null,
    metric_owner_role_ref: null,
    expected_movement_direction: "REQUIRES_REVIEWER_APPROVAL_FROM_EXPECTATION_PATH",
    expected_lag_definition: "REQUIRES_REVIEWER_APPROVAL_FROM_EXPECTATION_PATH",
    baseline_value_source_ref: null,
    comparison_condition_ref: null,
    milestone_schedule_ref: null,
    approval_state: "HOLD_FOR_REVIEW",
    approval_role_ref: null
  };
}

function buildHeldPlan(input, planningState, gaps) {
  return {
    schema_version: SCHEMA_VERSION,
    planning_state: planningState,
    planning_class: "hypothesis_to_metric_recommendation_planning_only",
    internal_only: true,
    aggregate_only: true,
    source_ref_only: true,
    fail_closed: true,
    blueprint_hypothesis_ref: safeScalar(input?.blueprint_hypothesis_ref),
    value_route: safeScalar(input?.value_route),
    normalized_value_route: normalizeRoute(input?.value_route),
    workflow_function_scope: safeScalar(input?.workflow_function_scope),
    cohort_scope: safeScalar(input?.cohort_scope),
    metric_library_refs: safeMetricLibraryRefs(input?.metric_library_refs),
    candidate_metric_recommendations: [],
    recommendation_state: HELD_RECOMMENDATION_STATE,
    recommendation_rationale: "Held because required planning inputs are missing, ambiguous, unsupported, or not source-ref backed.",
    required_reviewer_approval_fields: defaultReviewerApprovalFields(input ?? {}),
    required_milestone_schedule: {
      schedule_state: "REQUIRES_REVIEWER_APPROVAL",
      required_milestones: [...REQUIRED_MILESTONE_SCHEDULE]
    },
    expectation_path_derivation: {
      source_blueprint_hypothesis_ref: safeScalar(input?.blueprint_hypothesis_ref),
      expected_movement_direction: REVIEWER_APPROVAL_PLACEHOLDER,
      expected_lag_definition: REVIEWER_APPROVAL_PLACEHOLDER,
      derivation_state: "HELD_FOR_REVIEWER_APPROVED_EXPECTATION_PATH"
    },
    evidence_gap_list: unique(gaps),
    creates_evidence: false,
    recommendation_is_evidence: false,
    selected_metric_approved: false,
    diagnostics_evidence_satisfied: false,
    promotion_authorized: false,
    blocked_claims: [...REQUIRED_BLOCKED_CLAIMS],
    blocked_outputs: { ...BLOCKED_OUTPUTS },
    feeds: {
      comparison_design_source_package_intake: false,
      comparison_design_adequacy_evidence_review: false,
      governed_diagnostics_sufficiency_evidence_source: false,
      diagnostics_evidence_packet: false,
      bayesian_promotion_decision_gate: false
    },
    bayesian_chain_state: {
      current_state: BAYESIAN_CHAIN_HELD_STATE,
      allowed_next_step: BAYESIAN_CHAIN_ALLOWED_NEXT_STEP,
      changed_by_this_plan: false
    },
    local_planning_next_action: HELD_LOCAL_NEXT_ACTION,
    allowed_next_step: HELD_ALLOWED_NEXT_STEP
  };
}

function metricRecommendationFromEntry({ metric, libraryRef, libraryId, input, normalizedRoute }) {
  const candidateMetricFamily =
    ROUTE_TO_FAMILY.get(metric.value_route) ?? ROUTE_TO_FAMILY.get(normalizedRoute) ?? "unclassified_metric_context";
  const hypothesisRef = safeScalar(input.blueprint_hypothesis_ref);
  return {
    recommendation_ref: `hypothesis_metric_recommendation.${hypothesisRef}.${metric.metric_id}`,
    source_blueprint_hypothesis_ref: hypothesisRef,
    candidate_metric_family: candidateMetricFamily,
    candidate_metric_id: metric.metric_id,
    source_metric_library_ref: libraryRef,
    source_metric_library_id: libraryId,
    source_metric_library_workflow_family: metric.workflow_family,
    recommendation_rationale:
      `Metric library entry shares value route ${metric.value_route} and aggregate workflow scope ${metric.workflow_family}.`,
    expected_source_system_posture: {
      source_type: metric.source_system?.source_type ?? null,
      approved_grain: metric.source_system?.approved_grain ?? null,
      posture: "reviewer_owned_aggregate_source_required"
    },
    selected_metric_candidate_only: true,
    recommendation_is_evidence: false,
    selected_metric_approved: false,
    evidence_satisfied: false,
    measurement_unit: metric.measurement_unit,
    metric_owner_role_ref: metric.owner ?? null,
    metric_priority: metric.metric_priority,
    blocked_claims: unique([...(metric.blocked_claims ?? []), ...REQUIRED_BLOCKED_CLAIMS]),
    recommendation_state: "CANDIDATE_ONLY_NOT_SELECTED"
  };
}

function recommendationSort(a, b) {
  const priorityA = PRIORITY_ORDER.get(a.metric_priority) ?? 99;
  const priorityB = PRIORITY_ORDER.get(b.metric_priority) ?? 99;
  if (priorityA !== priorityB) return priorityA - priorityB;
  return a.candidate_metric_id.localeCompare(b.candidate_metric_id);
}

export function buildHypothesisToMetricRecommendationPlan(input = {}) {
  const gaps = [];
  const hypothesisRef = safeScalar(input.blueprint_hypothesis_ref) ?? "";
  const hypothesisStatement = stableString(input.blueprint_hypothesis_statement);
  const workflowScope = safeScalar(input.workflow_function_scope) ?? "";
  const cohortScope = safeScalar(input.cohort_scope) ?? "";
  const metricLibraryRefs = Array.isArray(input.metric_library_refs)
    ? input.metric_library_refs.map((ref) => safeScalar(ref)).filter(Boolean)
    : [];
  const normalizedRoute = normalizeRoute(input.value_route);

  if (!hypothesisRef) gaps.push("missing_blueprint_hypothesis_ref");
  if (!hypothesisStatement) gaps.push("missing_blueprint_hypothesis_statement");
  if (!workflowScope) gaps.push("missing_workflow_function_scope");
  if (!cohortScope) gaps.push("missing_cohort_scope");
  if (!metricLibraryRefs.length) gaps.push("missing_metric_library_refs");

  if (gaps.some((gap) => gap.startsWith("missing_blueprint_hypothesis"))) {
    return buildHeldPlan(input, "HOLD_FOR_BLUEPRINT_HYPOTHESIS", gaps);
  }

  if (isAmbiguousHypothesis(hypothesisStatement)) {
    return buildHeldPlan(input, "HOLD_FOR_AMBIGUOUS_BLUEPRINT_HYPOTHESIS", [
      ...gaps,
      "ambiguous_blueprint_hypothesis_statement"
    ]);
  }

  if (!normalizedRoute) {
    return buildHeldPlan(input, "HOLD_FOR_UNSUPPORTED_VALUE_ROUTE", [
      ...gaps,
      "unsupported_value_route"
    ]);
  }

  if (!metricLibraryRefs.length) {
    return buildHeldPlan(input, "HOLD_FOR_METRIC_LIBRARY_REFS", gaps);
  }

  const unknownRefs = metricLibraryRefs.filter((ref) => !KNOWN_LIBRARY_REFS.has(ref));
  if (unknownRefs.length) {
    return buildHeldPlan(input, "HOLD_FOR_METRIC_LIBRARY_REFS", [
      ...gaps,
      "unsupported_metric_library_ref"
    ]);
  }

  if (gaps.length) {
    return buildHeldPlan(input, "HOLD_FOR_BLUEPRINT_HYPOTHESIS", gaps);
  }

  const libraries = loadMetricLibraries(metricLibraryRefs);
  const libraryValidationGaps = validateLoadedMetricLibraries(libraries);
  if (libraryValidationGaps.length) {
    return buildHeldPlan(input, "HOLD_FOR_METRIC_LIBRARY_REFS", libraryValidationGaps);
  }

  const recommendations = [];
  for (const { ref, library } of libraries) {
    const metrics = Array.isArray(library.metrics) ? library.metrics : [];
    for (const metric of metrics) {
      if (metric.value_route !== normalizedRoute) continue;
      if (metric.workflow_family !== workflowScope) continue;
      recommendations.push(
        metricRecommendationFromEntry({
          metric,
          libraryRef: ref,
          libraryId: library.library_id,
          input,
          normalizedRoute
        })
      );
    }
  }

  if (!recommendations.length) {
    return buildHeldPlan(input, "HOLD_FOR_NO_SUPPORTED_METRIC_RECOMMENDATIONS", [
      "no_metric_library_entry_matches_value_route_and_workflow_scope"
    ]);
  }

  recommendations.sort(recommendationSort);

  return {
    schema_version: SCHEMA_VERSION,
    planning_state: READY_STATE,
    planning_class: "hypothesis_to_metric_recommendation_planning_only",
    internal_only: true,
    aggregate_only: true,
    source_ref_only: true,
    fail_closed: true,
    blueprint_hypothesis_ref: hypothesisRef,
    value_route: safeScalar(input.value_route),
    normalized_value_route: normalizedRoute,
    workflow_function_scope: workflowScope,
    cohort_scope: cohortScope,
    metric_library_refs: metricLibraryRefs,
    candidate_metric_recommendations: recommendations,
    recommendation_state: RECOMMENDATION_READY_STATE,
    recommendation_rationale:
      "Candidate aggregate metrics are recommended only from supplied metric library refs that match the Blueprint value route and workflow/function scope.",
    required_reviewer_approval_fields: defaultReviewerApprovalFields(input),
    required_milestone_schedule: {
      schedule_state: "REQUIRES_REVIEWER_APPROVAL",
      required_milestones: [...REQUIRED_MILESTONE_SCHEDULE],
      milestone_schedule_ref: null,
      missing_or_held_windows_fail_closed: true
    },
    expectation_path_derivation: {
      source_blueprint_hypothesis_ref: hypothesisRef,
      expected_movement_direction: REVIEWER_APPROVAL_PLACEHOLDER,
      expected_lag_definition: REVIEWER_APPROVAL_PLACEHOLDER,
      derivation_state: "REQUIRES_REVIEWER_APPROVAL_FROM_EXPECTATION_PATH",
      direction_and_lag_are_standalone_fields: false
    },
    evidence_gap_list: [],
    creates_evidence: false,
    recommendation_is_evidence: false,
    selected_metric_approved: false,
    diagnostics_evidence_satisfied: false,
    promotion_authorized: false,
    blocked_claims: [...REQUIRED_BLOCKED_CLAIMS],
    blocked_outputs: { ...BLOCKED_OUTPUTS },
    feeds: {
      comparison_design_source_package_intake: false,
      comparison_design_adequacy_evidence_review: false,
      governed_diagnostics_sufficiency_evidence_source: false,
      diagnostics_evidence_packet: false,
      bayesian_promotion_decision_gate: false
    },
    bayesian_chain_state: {
      current_state: BAYESIAN_CHAIN_HELD_STATE,
      allowed_next_step: BAYESIAN_CHAIN_ALLOWED_NEXT_STEP,
      changed_by_this_plan: false
    },
    local_planning_next_action: READY_LOCAL_NEXT_ACTION,
    allowed_next_step: READY_ALLOWED_NEXT_STEP
  };
}

const FORBIDDEN_KEYS = [
  "raw_rows",
  "user_id",
  "employee_id",
  "email",
  "blueprint_hypothesis_statement",
  "candidate_metric_name",
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
  [
    "unsafe_claim_language",
    /\b(confident|confidence|probability|posterior|roi|finance|financial|economic|caused|causal|causality|attribution|productivity)\b/i
  ]
];

const REQUIRED_REVIEWER_APPROVAL_NULL_FIELDS = [
  "approved_metric_selection_ref",
  "selected_metric_id",
  "selected_metric_family",
  "selected_measurement_unit",
  "metric_owner_role_ref",
  "baseline_value_source_ref",
  "comparison_condition_ref",
  "milestone_schedule_ref",
  "approval_role_ref"
];

function hasAllRequiredBlockedClaims(claims) {
  const claimSet = new Set(Array.isArray(claims) ? claims : []);
  return REQUIRED_BLOCKED_CLAIMS.every((claim) => claimSet.has(claim));
}

function validateReviewerApprovalFields(plan, gaps) {
  const approval = plan?.required_reviewer_approval_fields ?? {};
  if (approval.approval_state !== "HOLD_FOR_REVIEW") {
    gaps.push("selected metric approval_state must remain HOLD_FOR_REVIEW");
  }
  if (approval.source_blueprint_hypothesis_ref !== (plan?.blueprint_hypothesis_ref ?? null)) {
    gaps.push("source_blueprint_hypothesis_ref must match blueprint_hypothesis_ref");
  }
  for (const field of REQUIRED_REVIEWER_APPROVAL_NULL_FIELDS) {
    if (approval[field] !== null) {
      gaps.push(`required_reviewer_approval_fields.${field} must remain null`);
    }
  }
  if (approval.expected_movement_direction !== REVIEWER_APPROVAL_PLACEHOLDER) {
    gaps.push("required_reviewer_approval_fields.expected_movement_direction must require reviewer approval");
  }
  if (approval.expected_lag_definition !== REVIEWER_APPROVAL_PLACEHOLDER) {
    gaps.push("required_reviewer_approval_fields.expected_lag_definition must require reviewer approval");
  }
}

function collectRecommendationSourceGaps(recommendation, plan) {
  const gaps = [];
  const ref = recommendation.source_metric_library_ref;
  if (!KNOWN_LIBRARY_REFS.has(ref)) return gaps;

  let library;
  try {
    library = loadMetricLibrary(ref).library;
  } catch (error) {
    gaps.push(`candidate_metric_recommendations cannot load source_metric_library_ref: ${ref}`);
    return gaps;
  }

  const validation = validateMetricsLibrary(library);
  if (validation.valid !== true) {
    gaps.push(...validation.gaps.map((gap) => `candidate_metric_library_invalid:${ref}:${gap}`));
    return gaps;
  }

  const metric = library.metrics.find(
    (candidate) => candidate.metric_id === recommendation.candidate_metric_id
  );
  if (!metric) {
    gaps.push("candidate_metric_recommendations require candidate_metric_id present in source metric library");
    return gaps;
  }
  if (metric.value_route !== plan.normalized_value_route) {
    gaps.push("candidate_metric_recommendations candidate_metric_id must match normalized_value_route");
  }
  if (metric.workflow_family !== plan.workflow_function_scope) {
    gaps.push("candidate_metric_recommendations candidate_metric_id must match workflow_function_scope");
  }
  if (recommendation.source_metric_library_id !== library.library_id) {
    gaps.push("candidate_metric_recommendations source_metric_library_id must match source metric library");
  }
  if (recommendation.source_metric_library_workflow_family !== metric.workflow_family) {
    gaps.push("candidate_metric_recommendations source_metric_library_workflow_family must match source metric library entry");
  }
  return gaps;
}

export function validateHypothesisToMetricRecommendationPlan(plan) {
  const gaps = [];
  if (plan?.schema_version !== SCHEMA_VERSION) gaps.push("schema_version is invalid");
  if (plan?.internal_only !== true) gaps.push("internal_only must be true");
  if (plan?.aggregate_only !== true) gaps.push("aggregate_only must be true");
  if (plan?.source_ref_only !== true) gaps.push("source_ref_only must be true");
  if (plan?.creates_evidence !== false) gaps.push("creates_evidence must be false");
  if (plan?.recommendation_is_evidence !== false) gaps.push("recommendation_is_evidence must be false");
  if (plan?.selected_metric_approved !== false) gaps.push("selected_metric_approved must be false");
  if (plan?.diagnostics_evidence_satisfied !== false) gaps.push("diagnostics_evidence_satisfied must be false");
  if (plan?.promotion_authorized !== false) gaps.push("promotion_authorized must be false");
  if (plan?.planning_state === READY_STATE) {
    if (plan?.recommendation_state !== RECOMMENDATION_READY_STATE) {
      gaps.push("ready planning_state requires ready recommendation_state");
    }
    if (plan?.allowed_next_step !== READY_ALLOWED_NEXT_STEP) {
      gaps.push("ready planning allowed_next_step is invalid");
    }
    if (plan?.local_planning_next_action !== READY_LOCAL_NEXT_ACTION) {
      gaps.push("ready planning local_planning_next_action is invalid");
    }
  } else if (String(plan?.planning_state ?? "").startsWith("HOLD_")) {
    if (plan?.recommendation_state !== HELD_RECOMMENDATION_STATE) {
      gaps.push("held planning_state requires held recommendation_state");
    }
    if (plan?.allowed_next_step !== HELD_ALLOWED_NEXT_STEP) {
      gaps.push("held planning allowed_next_step is invalid");
    }
    if (plan?.local_planning_next_action !== HELD_LOCAL_NEXT_ACTION) {
      gaps.push("held planning local_planning_next_action is invalid");
    }
  } else {
    gaps.push("planning_state is invalid");
  }
  if (plan?.bayesian_chain_state?.current_state !== BAYESIAN_CHAIN_HELD_STATE) {
    gaps.push("bayesian_chain_state.current_state must remain held");
  }
  if (plan?.bayesian_chain_state?.allowed_next_step !== BAYESIAN_CHAIN_ALLOWED_NEXT_STEP) {
    gaps.push("bayesian_chain_state.allowed_next_step must remain governed diagnostics source completion");
  }
  if (plan?.bayesian_chain_state?.changed_by_this_plan !== false) {
    gaps.push("bayesian_chain_state.changed_by_this_plan must be false");
  }
  validateReviewerApprovalFields(plan, gaps);
  if (!hasAllRequiredBlockedClaims(plan?.blocked_claims)) {
    gaps.push("blocked_claims must include every required blocked claim");
  }
  if (
    JSON.stringify(plan?.required_milestone_schedule?.required_milestones ?? []) !==
    JSON.stringify(REQUIRED_MILESTONE_SCHEDULE)
  ) {
    gaps.push("required milestone schedule must include T0/T30/T60/T90/T120/T180/T270/T365");
  }
  for (const [field, value] of Object.entries(plan?.blocked_outputs ?? {})) {
    if (value !== false) gaps.push(`blocked_outputs.${field} must be false`);
  }
  for (const [field, value] of Object.entries(plan?.feeds ?? {})) {
    if (value !== false) gaps.push(`feeds.${field} must be false`);
  }
  for (const recommendation of plan?.candidate_metric_recommendations ?? []) {
    if (!recommendation.source_metric_library_ref) {
      gaps.push("candidate_metric_recommendations require source_metric_library_ref");
    }
    if (!KNOWN_LIBRARY_REFS.has(recommendation.source_metric_library_ref)) {
      gaps.push("candidate_metric_recommendations require allowlisted source_metric_library_ref");
    }
    if (!recommendation.candidate_metric_id) {
      gaps.push("candidate_metric_recommendations require candidate_metric_id");
    }
    gaps.push(...collectRecommendationSourceGaps(recommendation, plan));
    if (Object.hasOwn(recommendation, "candidate_metric_name")) {
      gaps.push("candidate_metric_recommendations must be source-ref-only and omit candidate_metric_name");
    }
    if (!hasAllRequiredBlockedClaims(recommendation.blocked_claims)) {
      gaps.push("candidate_metric_recommendations blocked_claims must include every required blocked claim");
    }
    if (recommendation.recommendation_is_evidence !== false) {
      gaps.push("candidate_metric_recommendations must not be evidence");
    }
    if (recommendation.selected_metric_approved !== false) {
      gaps.push("candidate_metric_recommendations must not approve selected metrics");
    }
    if (recommendation.evidence_satisfied !== false) {
      gaps.push("candidate_metric_recommendations must not satisfy evidence");
    }
  }
  if (Object.hasOwn(plan ?? {}, "blueprint_hypothesis_statement")) {
    gaps.push("plan must be source-ref-only and omit blueprint_hypothesis_statement");
  }
  const unsafePaths = [];
  const scanForbidden = (value, path = []) => {
    if (path.includes("blocked_outputs") || path.includes("blocked_claims")) return;
    if (value === null || value === undefined) return;
    if (typeof value === "string") {
      for (const [name, pattern] of FORBIDDEN_VALUE_PATTERNS) {
        if (pattern.test(value)) {
          unsafePaths.push(`${path.join(".") || "root"}:${name}`);
        }
      }
      return;
    }
    if (typeof value !== "object") return;
    for (const [key, nested] of Object.entries(value)) {
      const lowered = key.toLowerCase();
      if (FORBIDDEN_KEYS.includes(lowered)) {
        unsafePaths.push([...path, key].join("."));
      }
      scanForbidden(nested, [...path, key]);
    }
  };
  scanForbidden(plan);
  for (const unsafePath of unsafePaths) {
    gaps.push(`forbidden field present: ${unsafePath}`);
  }
  return {
    valid: gaps.length === 0,
    gaps
  };
}

function readInput(argv) {
  const inputArg = argv[0];
  if (!inputArg) return {};
  if (inputArg === "-") {
    return JSON.parse(readFileSync(0, "utf8"));
  }
  return JSON.parse(readFileSync(resolve(process.cwd(), inputArg), "utf8"));
}

function main() {
  const input = readInput(process.argv.slice(2));
  const plan = buildHypothesisToMetricRecommendationPlan(input);
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) {
  main();
}
