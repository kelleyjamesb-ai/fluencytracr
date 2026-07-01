#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  validateHypothesisToMetricRecommendationPlan
} from "./run_ai_value_hypothesis_to_metric_recommendation.mjs";
import {
  validateReviewerApprovedMeasurementPlanContract
} from "./run_ai_value_reviewer_approved_measurement_plan_contract.mjs";
import {
  validateAggregateDataCollectionPlanningContract
} from "./run_ai_value_aggregate_data_collection_planning_contract.mjs";
import {
  validateComparisonDesignSourcePackagePreparationBinding
} from "./run_ai_value_comparison_design_source_package_preparation_binding.mjs";
import {
  validateReviewerOwnedComparisonDesignSourcePackageCollection
} from "./run_ai_value_reviewer_owned_comparison_design_source_package_collection.mjs";
import {
  validateContributionAlignmentComparisonDesignAdequacyEvidenceReview
} from "./run_ai_value_contribution_alignment_comparison_design_adequacy_evidence_review.mjs";
import {
  buildTriangulatedEvidenceAlignmentReview,
  validateTriangulatedEvidenceAlignmentReview
} from "./run_ai_value_triangulated_evidence_alignment_review.mjs";

export const MEASUREMENT_JOURNEY_STATE_MODEL_SCHEMA_VERSION =
  "FT_AI_VALUE_MEASUREMENT_JOURNEY_STATE_MODEL_2026_06";

export const MEASUREMENT_JOURNEY_STATE_IDS = Object.freeze([
  "NO_BLUEPRINT",
  "BLUEPRINT_RECEIVED",
  "METRICS_RECOMMENDED",
  "MEASUREMENT_PLAN_DRAFTED",
  "MEASUREMENT_PLAN_APPROVED",
  "DATA_COLLECTION_PLANNING_READY",
  "SOURCE_PACKAGE_COLLECTION_READY",
  "COMPARISON_DESIGN_REVIEWED",
  "EVIDENCE_ALIGNMENT_HELD",
  "EVIDENCE_ALIGNMENT_PARTIAL",
  "EVIDENCE_ALIGNMENT_ALIGNED",
  "EVIDENCE_ALIGNMENT_DIVERGENT",
  "MODEL_REVIEW_BLOCKED"
]);

const MODEL_REVIEW_POSTURE =
  "BLOCKED_UNTIL_GOVERNED_DIAGNOSTICS_EVIDENCE";
const BAYESIAN_CHAIN_HELD_STATE =
  "HOLD_FOR_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE";
const BAYESIAN_CHAIN_ALLOWED_NEXT_STEP =
  "complete_governed_diagnostics_sufficiency_evidence_source";

const RECOMMENDATION_READY_STATE =
  "CANDIDATE_RECOMMENDATIONS_ONLY_NOT_EVIDENCE";
const REVIEWER_APPROVED_PLAN_READY_STATE =
  "REVIEWER_APPROVED_MEASUREMENT_PLAN_READY_FOR_AGGREGATE_DATA_COLLECTION_PLANNING";
const AGGREGATE_PLANNING_READY_STATE =
  "AGGREGATE_DATA_COLLECTION_PLANNING_READY_FOR_COMPARISON_DESIGN_SOURCE_PACKAGE_PREPARATION";
const PREPARATION_READY_STATE =
  "COMPARISON_DESIGN_SOURCE_PACKAGE_PREPARATION_READY_FOR_REVIEWER_COLLECTION";
const COLLECTION_READY_STATE =
  "REVIEWER_OWNED_COMPARISON_DESIGN_SOURCE_PACKAGE_COLLECTED_FOR_REVIEW_ONLY";
const COMPARISON_REVIEW_READY_STATE =
  "COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEWED_FOR_GOVERNED_SOURCE_BINDING";

const TRIANGULATED_STATE_MAP = Object.freeze({
  HOLD_FOR_GOVERNED_EVIDENCE: "EVIDENCE_ALIGNMENT_HELD",
  PARTIAL_ALIGNMENT_FOR_REVIEW: "EVIDENCE_ALIGNMENT_PARTIAL",
  ALIGNED_FOR_REVIEW: "EVIDENCE_ALIGNMENT_ALIGNED",
  DIVERGENT_FOR_REVIEW: "EVIDENCE_ALIGNMENT_DIVERGENT"
});

const REQUIRED_BLOCKED_CLAIMS = Object.freeze([
  "journey_state_is_not_evidence",
  "metric_recommendation_is_not_evidence",
  "draft_selection_is_not_reviewer_approval",
  "approved_measurement_plan_is_not_observed_data",
  "source_package_collection_is_not_diagnostics_sufficiency",
  "comparison_design_review_is_not_global_evidence_satisfaction",
  "evidence_alignment_is_review_only",
  "model_review_posture_is_not_bayesian_readiness",
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
]);

const NOT_YET_EVIDENCE = Object.freeze([
  "measurement_journey_state",
  "candidate_metric_recommendations",
  "reviewer_metric_selection_draft",
  "reviewer_approved_measurement_plan",
  "aggregate_data_collection_plan",
  "source_package_collection_posture",
  "comparison_design_review_posture",
  "triangulated_alignment_review_posture",
  "model_review_posture"
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
  governed_diagnostics_sufficiency_evidence_source: false,
  diagnostics_evidence_packet: false,
  bayesian_promotion_decision_gate: false,
  internal_bayesian_execution_artifact_v1: false,
  posterior_interpretation_specification_gate: false,
  confidence_or_probability_output: false,
  customer_economic_output: false,
  live_connector_execution: false,
  route_or_ui_creation: false,
  schema_persistence_or_export_creation: false
});

const STATE_DEFINITIONS = Object.freeze({
  NO_BLUEPRINT: stateDefinition({
    state_id: "NO_BLUEPRINT",
    status_label: "No Blueprint yet",
    plain_language_description:
      "The measurement journey is waiting for a client Blueprint hypothesis.",
    source_contract_dependency: "Blueprint hypothesis intake",
    readiness_level: "held_before_planning",
    next_action: "complete_blueprint_hypothesis",
    user_should_do_next:
      "Supply the Blueprint hypothesis, value route, workflow or function scope, cohort scope, and approved metric library refs."
  }),
  BLUEPRINT_RECEIVED: stateDefinition({
    state_id: "BLUEPRINT_RECEIVED",
    status_label: "Blueprint received",
    plain_language_description:
      "A Blueprint hypothesis is present, but candidate aggregate metrics are not ready.",
    source_contract_dependency: "Hypothesis-to-Metric Recommendation",
    readiness_level: "planning_input_received",
    next_action: "complete_candidate_metric_recommendation",
    user_should_do_next:
      "Run candidate aggregate metric recommendation from approved metric library refs."
  }),
  METRICS_RECOMMENDED: stateDefinition({
    state_id: "METRICS_RECOMMENDED",
    status_label: "Metric options ready",
    plain_language_description:
      "Candidate aggregate metrics are available as planning inputs only.",
    source_contract_dependency: "Hypothesis-to-Metric Recommendation",
    readiness_level: "planning_recommendations_ready",
    next_action: "prepare_reviewer_metric_selection_draft",
    user_should_do_next:
      "Choose a candidate metric for a reviewer-owned draft measurement plan."
  }),
  MEASUREMENT_PLAN_DRAFTED: stateDefinition({
    state_id: "MEASUREMENT_PLAN_DRAFTED",
    status_label: "Draft measurement plan prepared",
    plain_language_description:
      "A reviewer metric-selection draft exists, but it is not approved.",
    source_contract_dependency: "Reviewer Metric Selection Draft Intake",
    readiness_level: "draft_only",
    next_action: "complete_reviewer_approved_measurement_plan",
    user_should_do_next:
      "Approve the selected metric, expected direction, lag, baseline posture, comparison condition, cohort, workflow or function identity, milestone schedule, and aggregate Measurement Cell grain."
  }),
  MEASUREMENT_PLAN_APPROVED: stateDefinition({
    state_id: "MEASUREMENT_PLAN_APPROVED",
    status_label: "Measurement plan approved",
    plain_language_description:
      "The reviewer-approved measurement plan is ready for aggregate data collection planning.",
    source_contract_dependency: "Reviewer-Approved Measurement Plan Contract",
    readiness_level: "approved_plan_ready",
    next_action: "complete_aggregate_data_collection_planning",
    user_should_do_next:
      "Prepare aggregate-only data collection planning against the approved measurement plan."
  }),
  DATA_COLLECTION_PLANNING_READY: stateDefinition({
    state_id: "DATA_COLLECTION_PLANNING_READY",
    status_label: "Collection planning ready",
    plain_language_description:
      "Aggregate data collection planning is ready for comparison-design source package preparation.",
    source_contract_dependency: "Aggregate Data Collection Planning Contract",
    readiness_level: "aggregate_collection_planning_ready",
    next_action: "collect_reviewer_owned_comparison_design_source_package",
    user_should_do_next:
      "Collect the reviewer-owned comparison-design source package using aggregate-only refs."
  }),
  SOURCE_PACKAGE_COLLECTION_READY: stateDefinition({
    state_id: "SOURCE_PACKAGE_COLLECTION_READY",
    status_label: "Source package received for review",
    plain_language_description:
      "The reviewer-owned comparison-design source package is collected for review only.",
    source_contract_dependency: "Reviewer-Owned Comparison Design Source Package Collection",
    readiness_level: "source_package_review_input_ready",
    next_action: "run_comparison_design_adequacy_evidence_review",
    user_should_do_next:
      "Run the Comparison Design Adequacy Evidence Review against the reviewer-owned package."
  }),
  COMPARISON_DESIGN_REVIEWED: stateDefinition({
    state_id: "COMPARISON_DESIGN_REVIEWED",
    status_label: "Comparison design reviewed",
    plain_language_description:
      "Comparison-design adequacy has been reviewed for source binding only.",
    source_contract_dependency: "Comparison Design Adequacy Evidence Review",
    readiness_level: "comparison_design_reviewed_only",
    next_action: "complete_triangulated_evidence_alignment_review",
    user_should_do_next:
      "Review stated, behavioral, and outcome aggregate refs for internal alignment posture."
  }),
  EVIDENCE_ALIGNMENT_HELD: stateDefinition({
    state_id: "EVIDENCE_ALIGNMENT_HELD",
    status_label: "Evidence alignment held",
    plain_language_description:
      "Triangulated evidence alignment is held for missing or invalid governed aggregate refs.",
    source_contract_dependency: "Triangulated Evidence Alignment Review",
    readiness_level: "alignment_review_held",
    next_action: "complete_governed_evidence_alignment_inputs",
    user_should_do_next:
      "Supply reviewer-owned stated, behavioral, and outcome aggregate refs that align to the same Blueprint context."
  }),
  EVIDENCE_ALIGNMENT_PARTIAL: stateDefinition({
    state_id: "EVIDENCE_ALIGNMENT_PARTIAL",
    status_label: "Source refs partially align for review only",
    plain_language_description:
      "Some reviewer-owned aggregate source refs share the expected context, and reviewer interpretation is still required.",
    source_contract_dependency: "Triangulated Evidence Alignment Review",
    readiness_level: "alignment_review_partial",
    next_action: "review_partial_alignment_posture",
    user_should_do_next:
      "Review which stated, behavioral, or outcome aggregate streams remain incomplete or mismatched."
  }),
  EVIDENCE_ALIGNMENT_ALIGNED: stateDefinition({
    state_id: "EVIDENCE_ALIGNMENT_ALIGNED",
    status_label: "Source refs align for review only",
    plain_language_description:
      "Reviewer-owned aggregate source refs share the expected context for internal review only.",
    source_contract_dependency: "Triangulated Evidence Alignment Review",
    readiness_level: "alignment_review_ready",
    next_action: "hold_for_governed_model_review_inputs",
    user_should_do_next:
      "Keep model review held until governed diagnostics sufficiency evidence is supplied elsewhere."
  }),
  EVIDENCE_ALIGNMENT_DIVERGENT: stateDefinition({
    state_id: "EVIDENCE_ALIGNMENT_DIVERGENT",
    status_label: "Source refs need reviewer interpretation",
    plain_language_description:
      "Reviewer-owned aggregate source refs do not currently align for internal review, but this is not an outcome verdict.",
    source_contract_dependency: "Triangulated Evidence Alignment Review",
    readiness_level: "alignment_review_divergent",
    next_action: "review_divergent_alignment_posture",
    user_should_do_next:
      "Review the stated, behavioral, and outcome aggregate refs before any model-review input is considered."
  }),
  MODEL_REVIEW_BLOCKED: stateDefinition({
    state_id: "MODEL_REVIEW_BLOCKED",
    status_label: "Held before model-review input",
    plain_language_description:
      "The visible product journey has reached model-review posture, but governed diagnostics evidence is still missing.",
    source_contract_dependency: "Governed Diagnostics Sufficiency Evidence Source",
    readiness_level: "model_review_input_blocked",
    next_action: BAYESIAN_CHAIN_ALLOWED_NEXT_STEP,
    user_should_do_next:
      "Complete governed diagnostics sufficiency evidence outside this UI-readiness state model."
  })
});

function stateDefinition(definition) {
  return Object.freeze({
    ...definition,
    blocked_claims: [...REQUIRED_BLOCKED_CLAIMS],
    what_is_not_yet_evidence: [...NOT_YET_EVIDENCE],
    allowed_ui_language: [
      "planning input",
      "review only",
      "held",
      "needs reviewer action",
      "aggregate-only refs",
      "model review remains blocked"
    ],
    blocked_ui_language: [
      "confidence",
      "probability",
      "posterior interpretation",
      "ROI",
      "finance output",
      "causality",
      "productivity",
      "customer-facing economic output",
      "individual or team scoring",
      "success",
      "failure"
    ]
  });
}

function stableString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

const FORBIDDEN_VALUE_PATTERNS = Object.freeze([
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\bselect\b[\s\S]{0,120}\bfrom\b/i,
  /\bsql\b/i,
  /\b(raw_rows?|row[-_\s]?level|raw\s+event|raw\s+record)\b/i,
  /\b(user_id|employee_id|person_level|person-level|identifier)\b/i,
  /\b(prompt|transcript)\b/i,
  /\bposterior\b/i,
  /\b(confidence|probability|score(?:_like)?)\b/i,
  /\b(?:roi|finance|financial|economic|causal|causality|caused|attribution|productivity)\b/i,
  /\bcustomer[-_\s]?facing\b/i,
  /\blive[-_\s]?connector\b/i,
  /\b(route[-_\s]?creation|ui[-_\s]?creation|schema[-_\s]?creation|persistence[-_\s]?write|export[-_\s]?creation)\b/i
]);

function containsUnsafeValue(value) {
  const raw = stableString(value);
  return FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(raw));
}

function safeScalar(value) {
  const raw = stableString(value);
  if (!raw || containsUnsafeValue(raw)) return null;
  return raw;
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

function clone(value) {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function sourceAliases(input) {
  return {
    sourceRecommendationPlan:
      input.sourceRecommendationPlan ?? input.source_recommendation_plan ?? null,
    reviewerMetricSelectionDraft:
      input.reviewerMetricSelectionDraft ??
      input.reviewer_metric_selection_draft ??
      input.draftMetricSelection ??
      input.draft_metric_selection ??
      null,
    sourceReviewerApprovedMeasurementPlan:
      input.sourceReviewerApprovedMeasurementPlan ??
      input.source_reviewer_approved_measurement_plan ??
      null,
    sourceAggregateDataCollectionPlanningContract:
      input.sourceAggregateDataCollectionPlanningContract ??
      input.source_aggregate_data_collection_planning_contract ??
      null,
    sourceComparisonDesignSourcePackagePreparationBinding:
      input.sourceComparisonDesignSourcePackagePreparationBinding ??
      input.source_comparison_design_source_package_preparation_binding ??
      null,
    reviewerOwnedComparisonDesignSourcePackage:
      input.reviewerOwnedComparisonDesignSourcePackage ??
      input.reviewer_owned_comparison_design_source_package ??
      null,
    sourceReviewerOwnedComparisonDesignSourcePackageCollection:
      input.sourceReviewerOwnedComparisonDesignSourcePackageCollection ??
      input.source_reviewer_owned_comparison_design_source_package_collection ??
      null,
    sourceRuntime: input.sourceRuntime ?? input.source_runtime ?? null,
    sourceGate: input.sourceGate ?? input.source_gate ?? null,
    aggregateMeasurementCellWindows:
      input.aggregateMeasurementCellWindows ??
      input.aggregate_measurement_cell_windows ??
      null,
    sourceComparisonDesignAdequacyReview:
      input.sourceComparisonDesignAdequacyReview ??
      input.source_comparison_design_adequacy_review ??
      null,
    reviewerOwnedTriangulatedEvidenceAlignment:
      input.reviewerOwnedTriangulatedEvidenceAlignment ??
      input.reviewer_owned_triangulated_evidence_alignment ??
      null,
    sourceTriangulatedEvidenceAlignmentReview:
      input.sourceTriangulatedEvidenceAlignmentReview ??
      input.source_triangulated_evidence_alignment_review ??
      null,
    modelReviewGatePosture:
      input.modelReviewGatePosture ?? input.model_review_gate_posture ?? null
  };
}

function sourceContractRefs(input, sources) {
  return {
    blueprint_hypothesis_ref:
      safeScalar(input.blueprint_hypothesis_ref) ||
      safeScalar(sources.sourceRecommendationPlan?.blueprint_hypothesis_ref) ||
      safeScalar(sources.sourceReviewerApprovedMeasurementPlan?.source_blueprint_hypothesis_ref) ||
      null,
    reviewer_approved_measurement_plan_ref:
      safeScalar(sources.sourceReviewerApprovedMeasurementPlan?.reviewer_approved_measurement_plan_ref),
    aggregate_data_collection_plan_ref:
      safeScalar(sources.sourceAggregateDataCollectionPlanningContract?.aggregate_data_collection_plan_ref),
    comparison_design_source_package_preparation_ref:
      safeScalar(
        sources.sourceComparisonDesignSourcePackagePreparationBinding
          ?.source_aggregate_data_collection_planning_ref
      ),
    reviewer_owned_source_package_ref:
      safeScalar(
        sources.sourceReviewerOwnedComparisonDesignSourcePackageCollection
          ?.reviewer_owned_source_package_ref
      ),
    comparison_design_adequacy_review_ref:
      safeScalar(
        sources.sourceComparisonDesignAdequacyReview?.evidence_satisfaction
          ?.reviewed_source_evidence_ref
      ),
    triangulated_evidence_alignment_ref:
      safeScalar(
        sources.sourceTriangulatedEvidenceAlignmentReview
          ?.reviewer_owned_triangulated_evidence_alignment_ref
      )
  };
}

function sourceContractHashes(sources) {
  return {
    recommendation_plan_hash: sources.sourceRecommendationPlan
      ? hashObject(sources.sourceRecommendationPlan)
      : null,
    reviewer_approved_measurement_plan_hash:
      sources.sourceReviewerApprovedMeasurementPlan?.contract_hash ?? null,
    aggregate_data_collection_planning_hash:
      sources.sourceAggregateDataCollectionPlanningContract?.contract_hash ?? null,
    comparison_design_source_package_preparation_hash:
      sources.sourceComparisonDesignSourcePackagePreparationBinding?.preparation_hash ?? null,
    reviewer_owned_source_package_collection_hash:
      sources.sourceReviewerOwnedComparisonDesignSourcePackageCollection?.collection_hash ?? null,
    comparison_design_adequacy_review_hash:
      sources.sourceComparisonDesignAdequacyReview?.review_hash ?? null,
    triangulated_evidence_alignment_review_hash:
      sources.sourceTriangulatedEvidenceAlignmentReview?.alignment_review_hash ?? null
  };
}

function recommendationReady(sourceRecommendationPlan) {
  if (!sourceRecommendationPlan) return { ready: false, gaps: ["missing_source_recommendation_plan"] };
  const validation = validateHypothesisToMetricRecommendationPlan(sourceRecommendationPlan);
  return {
    ready:
      validation.valid === true &&
      sourceRecommendationPlan.recommendation_state === RECOMMENDATION_READY_STATE,
    gaps: validation.gaps
  };
}

function draftReady(draft, sourceRecommendationPlan) {
  if (!draft || typeof draft !== "object") return { ready: false, gaps: ["missing_reviewer_metric_selection_draft"] };
  const blueprintRef =
    draft.sourceBlueprintHypothesisRef ??
    draft.source_blueprint_hypothesis_ref ??
    draft.source_blueprint_hypothesis ??
    null;
  const candidateRef =
    draft.candidateMetricRecommendationRef ??
    draft.candidate_metric_recommendation_ref ??
    null;
  const selectedMetric =
    draft.draftSelectedMetricCandidate ??
    draft.draft_selected_metric_candidate ??
    null;
  const expectedBlueprint = sourceRecommendationPlan?.blueprint_hypothesis_ref ?? null;
  const recommendationRefs = new Set(
    (sourceRecommendationPlan?.candidate_metric_recommendations ?? [])
      .map((candidate) => candidate.recommendation_ref)
      .filter(Boolean)
  );
  const gaps = [];
  if (!stableString(blueprintRef)) gaps.push("missing_draft_source_blueprint_hypothesis_ref");
  if (stableString(blueprintRef) && expectedBlueprint && blueprintRef !== expectedBlueprint) {
    gaps.push("draft_source_blueprint_hypothesis_ref_mismatch");
  }
  if (!stableString(candidateRef)) gaps.push("missing_draft_candidate_metric_recommendation_ref");
  if (stableString(candidateRef) && !recommendationRefs.has(candidateRef)) {
    gaps.push("draft_candidate_metric_recommendation_ref_not_found");
  }
  if (!stableString(selectedMetric)) gaps.push("missing_draft_selected_metric_candidate");
  if (
    draft.selectedMetricApproved === true ||
    draft.selected_metric_approved === true ||
    draft.createsGovernedApproval === true ||
    draft.creates_governed_approval === true ||
    draft.createsDiagnosticsEvidence === true ||
    draft.creates_diagnostics_evidence === true ||
    draft.comparisonDesignAdequacySatisfied === true ||
    draft.comparison_design_adequacy_satisfied === true ||
    draft.feedsBayesianPromotion === true ||
    draft.feeds_bayesian_promotion === true
  ) {
    gaps.push("draft_metric_selection_must_not_authorize_or_satisfy_downstream_claims");
  }
  return { ready: gaps.length === 0, gaps };
}

function reviewerApprovedPlanReady(sources) {
  const plan = sources.sourceReviewerApprovedMeasurementPlan;
  if (!plan) return { ready: false, gaps: ["missing_source_reviewer_approved_measurement_plan"] };
  const validation = validateReviewerApprovedMeasurementPlanContract(plan, {
    sourceRecommendationPlan: sources.sourceRecommendationPlan
  });
  return {
    ready: validation.valid === true && plan.contract_state === REVIEWER_APPROVED_PLAN_READY_STATE,
    gaps: validation.gaps
  };
}

function aggregatePlanningReady(sources) {
  const contract = sources.sourceAggregateDataCollectionPlanningContract;
  if (!contract) return { ready: false, gaps: ["missing_source_aggregate_data_collection_planning_contract"] };
  const validation = validateAggregateDataCollectionPlanningContract(contract, {
    sourceReviewerApprovedMeasurementPlan: sources.sourceReviewerApprovedMeasurementPlan,
    sourceRecommendationPlan: sources.sourceRecommendationPlan
  });
  return {
    ready: validation.valid === true && contract.contract_state === AGGREGATE_PLANNING_READY_STATE,
    gaps: validation.gaps
  };
}

function preparationReady(sources) {
  const artifact = sources.sourceComparisonDesignSourcePackagePreparationBinding;
  if (!artifact) return { ready: false, gaps: ["missing_source_comparison_design_source_package_preparation_binding"] };
  const validation = validateComparisonDesignSourcePackagePreparationBinding(artifact, {
    sourceRecommendationPlan: sources.sourceRecommendationPlan,
    sourceReviewerApprovedMeasurementPlan: sources.sourceReviewerApprovedMeasurementPlan,
    sourceAggregateDataCollectionPlanningContract:
      sources.sourceAggregateDataCollectionPlanningContract
  });
  return {
    ready: validation.valid === true && artifact.preparation_state === PREPARATION_READY_STATE,
    gaps: validation.gaps
  };
}

function collectionReady(sources) {
  const collection = sources.sourceReviewerOwnedComparisonDesignSourcePackageCollection;
  if (!collection) return { ready: false, gaps: ["missing_source_reviewer_owned_comparison_design_source_package_collection"] };
  const validation = validateReviewerOwnedComparisonDesignSourcePackageCollection(collection, {
    sourceRecommendationPlan: sources.sourceRecommendationPlan,
    sourceReviewerApprovedMeasurementPlan: sources.sourceReviewerApprovedMeasurementPlan,
    sourceAggregateDataCollectionPlanningContract:
      sources.sourceAggregateDataCollectionPlanningContract,
    sourceComparisonDesignSourcePackagePreparationBinding:
      sources.sourceComparisonDesignSourcePackagePreparationBinding,
    reviewerOwnedComparisonDesignSourcePackage:
      sources.reviewerOwnedComparisonDesignSourcePackage
  });
  return {
    ready: validation.valid === true && collection.collection_state === COLLECTION_READY_STATE,
    gaps: validation.gaps
  };
}

function comparisonReviewReady(sources) {
  const review = sources.sourceComparisonDesignAdequacyReview;
  if (!review) return { ready: false, gaps: ["missing_source_comparison_design_adequacy_review"] };
  const validation = validateContributionAlignmentComparisonDesignAdequacyEvidenceReview(review, {
    sourceRuntime: sources.sourceRuntime,
    sourceGate: sources.sourceGate,
    aggregateMeasurementCellWindows: sources.aggregateMeasurementCellWindows,
    comparisonDesignSourceEvidence:
      sources.sourceReviewerOwnedComparisonDesignSourcePackageCollection
  });
  return {
    ready: validation.valid === true && review.review_state === COMPARISON_REVIEW_READY_STATE,
    gaps: validation.gaps
  };
}

function triangulatedAlignmentState(sources) {
  const review = sources.sourceTriangulatedEvidenceAlignmentReview;
  if (!review) return { stateId: null, ready: false, gaps: ["missing_source_triangulated_evidence_alignment_review"] };
  const reviewState = review.triangulated_evidence_alignment_review_state;
  const mappedState = TRIANGULATED_STATE_MAP[reviewState];
  if (!mappedState) {
    return { stateId: null, ready: false, gaps: ["invalid_triangulated_evidence_alignment_review_state"] };
  }
  const validation = validateTriangulatedEvidenceAlignmentReview(review, {
    reviewerOwnedTriangulatedEvidenceAlignment:
      sources.reviewerOwnedTriangulatedEvidenceAlignment,
    sourceComparisonDesignAdequacyReview: sources.sourceComparisonDesignAdequacyReview
  });
  if (reviewState === "HOLD_FOR_GOVERNED_EVIDENCE") {
    let expectedHeldReview = null;
    if (
      sources.reviewerOwnedTriangulatedEvidenceAlignment &&
      sources.sourceComparisonDesignAdequacyReview
    ) {
      expectedHeldReview = buildTriangulatedEvidenceAlignmentReview({
        reviewerOwnedTriangulatedEvidenceAlignment:
          sources.reviewerOwnedTriangulatedEvidenceAlignment,
        sourceComparisonDesignAdequacyReview: sources.sourceComparisonDesignAdequacyReview
      });
    }
    const heldSourceBound =
      expectedHeldReview &&
      expectedHeldReview.triangulated_evidence_alignment_review_state ===
        "HOLD_FOR_GOVERNED_EVIDENCE" &&
      stableJson(expectedHeldReview) === stableJson(review);
    return {
      stateId: heldSourceBound ? "EVIDENCE_ALIGNMENT_HELD" : null,
      ready: Boolean(heldSourceBound),
      gaps: heldSourceBound
        ? review.gap_list ?? []
        : [
            ...validation.gaps,
            "held triangulated evidence alignment review requires source-bound held validation"
          ]
    };
  }
  return {
    stateId: validation.valid === true ? mappedState : null,
    ready: validation.valid === true,
    gaps: validation.gaps
  };
}

function modelReviewGateReady(sources) {
  const posture = sources.modelReviewGatePosture;
  if (!posture || typeof posture !== "object") return false;
  if (
    posture.next_visible_action !== "model_review_gating" &&
    posture.nextVisibleAction !== "model_review_gating"
  ) {
    return false;
  }
  const sourceHash =
    posture.source_triangulated_evidence_alignment_review_hash ??
    posture.sourceTriangulatedEvidenceAlignmentReviewHash ??
    null;
  const alignmentHash = sources.sourceTriangulatedEvidenceAlignmentReview?.alignment_review_hash;
  return Boolean(alignmentHash && sourceHash === alignmentHash);
}

function selectState(input, sources) {
  const refs = sourceContractRefs(input, sources);
  if (!stableString(refs.blueprint_hypothesis_ref)) {
    return { stateId: "NO_BLUEPRINT", blocker: "missing_blueprint_hypothesis" };
  }

  const recommendation = recommendationReady(sources.sourceRecommendationPlan);
  if (!recommendation.ready) {
    return {
      stateId: "BLUEPRINT_RECEIVED",
      blocker: recommendation.gaps[0] ?? "missing_candidate_metric_recommendation"
    };
  }

  let stateId = "METRICS_RECOMMENDED";
  let blocker = "missing_reviewer_metric_selection_draft";
  const draft = draftReady(sources.reviewerMetricSelectionDraft, sources.sourceRecommendationPlan);
  if (draft.ready) {
    stateId = "MEASUREMENT_PLAN_DRAFTED";
    blocker = "missing_reviewer_approved_measurement_plan";
  }

  const approvedPlan = reviewerApprovedPlanReady(sources);
  if (!approvedPlan.ready) return { stateId, blocker };
  stateId = "MEASUREMENT_PLAN_APPROVED";
  blocker = "missing_aggregate_data_collection_planning";

  const aggregatePlanning = aggregatePlanningReady(sources);
  if (!aggregatePlanning.ready) return { stateId, blocker };
  stateId = "DATA_COLLECTION_PLANNING_READY";
  blocker = "missing_reviewer_owned_source_package_collection";

  const preparation = preparationReady(sources);
  if (!preparation.ready) return { stateId, blocker };

  const collection = collectionReady(sources);
  if (!collection.ready) return { stateId, blocker };
  stateId = "SOURCE_PACKAGE_COLLECTION_READY";
  blocker = "missing_comparison_design_adequacy_review";

  const comparisonReview = comparisonReviewReady(sources);
  if (!comparisonReview.ready) return { stateId, blocker };
  stateId = "COMPARISON_DESIGN_REVIEWED";
  blocker = "missing_triangulated_evidence_alignment_review";

  const alignment = triangulatedAlignmentState(sources);
  if (alignment.ready && alignment.stateId) {
    stateId = alignment.stateId;
    blocker = stateId === "EVIDENCE_ALIGNMENT_HELD"
      ? "governed_evidence_alignment_inputs_held"
      : "governed_diagnostics_sufficiency_evidence_missing";
  } else if (sources.sourceTriangulatedEvidenceAlignmentReview) {
    blocker = alignment.gaps[0] ?? "invalid_triangulated_evidence_alignment_review";
  }

  if (
    alignment.ready &&
    alignment.stateId === "EVIDENCE_ALIGNMENT_ALIGNED" &&
    modelReviewGateReady(sources)
  ) {
    stateId = "MODEL_REVIEW_BLOCKED";
    blocker = "governed_diagnostics_sufficiency_evidence_missing";
  }

  return { stateId, blocker };
}

function customerSafeSummary(stateId) {
  const summaries = {
    NO_BLUEPRINT: "No measurement story can be shown until the Blueprint hypothesis is supplied.",
    BLUEPRINT_RECEIVED: "The Blueprint has been received and candidate aggregate metrics still need planning review.",
    METRICS_RECOMMENDED: "Candidate aggregate metrics can be shown as planning inputs only.",
    MEASUREMENT_PLAN_DRAFTED: "A draft measurement plan can be reviewed, but it is not approved.",
    MEASUREMENT_PLAN_APPROVED: "The approved measurement plan is ready for aggregate collection planning.",
    DATA_COLLECTION_PLANNING_READY: "Aggregate collection planning is ready for source package preparation.",
    SOURCE_PACKAGE_COLLECTION_READY: "The reviewer-owned source package is ready for adequacy review.",
    COMPARISON_DESIGN_REVIEWED: "Comparison design has been reviewed for source binding only.",
    EVIDENCE_ALIGNMENT_HELD: "Evidence alignment is held until governed aggregate refs are complete.",
    EVIDENCE_ALIGNMENT_PARTIAL: "Some reviewer-owned aggregate source refs align for review and some still need reviewer attention.",
    EVIDENCE_ALIGNMENT_ALIGNED: "Reviewer-owned aggregate source refs align for internal review only.",
    EVIDENCE_ALIGNMENT_DIVERGENT: "Reviewer-owned aggregate source refs need reviewer interpretation before model-review input.",
    MODEL_REVIEW_BLOCKED: "Model-review posture is visible, but governed diagnostics evidence is still missing."
  };
  return summaries[stateId];
}

function modelRecord({ input, sources, stateId, blocker }) {
  const state = clone(STATE_DEFINITIONS[stateId]);
  const record = {
    schema_version: MEASUREMENT_JOURNEY_STATE_MODEL_SCHEMA_VERSION,
    artifact_class: "measurement_journey_state_model",
    internal_only: true,
    aggregate_only: true,
    source_ref_only: true,
    fail_closed: true,
    ui_readiness_only: true,
    creates_evidence: false,
    diagnostics_evidence_satisfied: false,
    evidence_dimensions_satisfied: [],
    bayesian_readiness_authorized: false,
    promotion_authorized: false,
    posterior_interpretation_authorized: false,
    confidence_probability_authorized: false,
    customer_economic_output_authorized: false,
    measurement_journey_state: state,
    model_review_posture: MODEL_REVIEW_POSTURE,
    current_blocker: blocker,
    next_allowed_action: state.next_action,
    customer_safe_summary: customerSafeSummary(stateId),
    blocked_claims: [...REQUIRED_BLOCKED_CLAIMS],
    not_yet_evidence: [...NOT_YET_EVIDENCE],
    source_contract_refs: sourceContractRefs(input, sources),
    source_contract_hashes: sourceContractHashes(sources),
    ui_language_policy: {
      allowed_ui_language: [...state.allowed_ui_language],
      blocked_ui_language: [...state.blocked_ui_language],
      raw_state_tokens_render_directly: false
    },
    state_definitions: clone(STATE_DEFINITIONS),
    blocked_outputs: { ...BLOCKED_OUTPUTS },
    feeds: { ...FEEDS },
    bayesian_chain_state: {
      current_state: BAYESIAN_CHAIN_HELD_STATE,
      allowed_next_step: BAYESIAN_CHAIN_ALLOWED_NEXT_STEP,
      changed_by_this_state_model: false
    },
    state_model_hash: null
  };
  record.state_model_hash = measurementJourneyStateModelHash(record);
  return record;
}

export function measurementJourneyStateModelHash(model) {
  const body = clone(model);
  if (body && typeof body === "object") delete body.state_model_hash;
  return hashObject(body);
}

export function buildMeasurementJourneyStateModel(input = {}) {
  const sources = sourceAliases(input ?? {});
  const selection = selectState(input ?? {}, sources);
  return modelRecord({
    input: input ?? {},
    sources,
    stateId: selection.stateId,
    blocker: selection.blocker
  });
}

function hasEveryRequiredValue(values, required) {
  const set = new Set(Array.isArray(values) ? values : []);
  return required.every((value) => set.has(value));
}

function validateDefinitions(model, gaps) {
  const definitions = model?.state_definitions ?? {};
  for (const stateId of MEASUREMENT_JOURNEY_STATE_IDS) {
    const definition = definitions[stateId];
    if (!definition) {
      gaps.push(`state_definitions missing ${stateId}`);
      continue;
    }
    for (const field of [
      "state_id",
      "status_label",
      "plain_language_description",
      "source_contract_dependency",
      "readiness_level",
      "next_action",
      "user_should_do_next"
    ]) {
      if (!stableString(definition[field])) gaps.push(`${stateId}.${field} is required`);
    }
    for (const field of [
      "blocked_claims",
      "what_is_not_yet_evidence",
      "allowed_ui_language",
      "blocked_ui_language"
    ]) {
      if (!Array.isArray(definition[field]) || definition[field].length === 0) {
        gaps.push(`${stateId}.${field} must be a non-empty array`);
      }
    }
  }
  const extraStates = Object.keys(definitions).filter(
    (stateId) => !MEASUREMENT_JOURNEY_STATE_IDS.includes(stateId)
  );
  for (const stateId of extraStates) gaps.push(`unexpected state definition:${stateId}`);
}

function validateFalseFlags(model, gaps) {
  for (const field of [
    "creates_evidence",
    "diagnostics_evidence_satisfied",
    "bayesian_readiness_authorized",
    "promotion_authorized",
    "posterior_interpretation_authorized",
    "confidence_probability_authorized",
    "customer_economic_output_authorized"
  ]) {
    if (model?.[field] !== false) gaps.push(`${field} must be false`);
  }
  if (!Array.isArray(model?.evidence_dimensions_satisfied) || model.evidence_dimensions_satisfied.length !== 0) {
    gaps.push("evidence_dimensions_satisfied must be an empty array");
  }
  for (const field of Object.keys(BLOCKED_OUTPUTS)) {
    if (model?.blocked_outputs?.[field] !== false) {
      gaps.push(`blocked_outputs.${field} must be present and false`);
    }
  }
  for (const field of Object.keys(FEEDS)) {
    if (model?.feeds?.[field] !== false) {
      gaps.push(`feeds.${field} must be present and false`);
    }
  }
}

function validateRequiredOutputFields(model, gaps) {
  for (const field of [
    "measurement_journey_state",
    "model_review_posture",
    "current_blocker",
    "next_allowed_action",
    "customer_safe_summary",
    "blocked_claims",
    "not_yet_evidence",
    "source_contract_refs",
    "source_contract_hashes",
    "ui_language_policy",
    "state_model_hash"
  ]) {
    if (!Object.prototype.hasOwnProperty.call(model ?? {}, field)) {
      gaps.push(`${field} is required`);
    }
  }
}

function validateNoUnexpectedEvidenceHashes(model, gaps) {
  if (Object.prototype.hasOwnProperty.call(model ?? {}, "reviewed_source_evidence_hash")) {
    gaps.push("reviewed_source_evidence_hash must not be emitted");
  }
  if (Object.prototype.hasOwnProperty.call(model ?? {}, "source_evidence_hash")) {
    gaps.push("source_evidence_hash must not be emitted");
  }
  if (Object.prototype.hasOwnProperty.call(model ?? {}, "evidence_satisfied")) {
    gaps.push("evidence_satisfied must not be emitted");
  }
}

function collectSafeTextForUnsafeScan(model) {
  const values = [
    model?.current_blocker,
    model?.next_allowed_action,
    model?.customer_safe_summary,
    model?.model_review_posture,
    ...Object.values(model?.source_contract_refs ?? {})
  ];
  const collectState = (state) => {
    if (!state || typeof state !== "object") return;
    values.push(
      state.state_id,
      state.status_label,
      state.plain_language_description,
      state.source_contract_dependency,
      state.readiness_level,
      state.next_action,
      state.user_should_do_next,
      ...(Array.isArray(state.allowed_ui_language) ? state.allowed_ui_language : []),
      ...(Array.isArray(state.what_is_not_yet_evidence) ? state.what_is_not_yet_evidence : [])
    );
  };
  collectState(model?.measurement_journey_state);
  for (const state of Object.values(model?.state_definitions ?? {})) {
    collectState(state);
  }
  return values.filter((value) => value !== null && value !== undefined);
}

function validateSafeOutputText(model, gaps) {
  for (const value of collectSafeTextForUnsafeScan(model)) {
    if (typeof value !== "string") continue;
    if (containsUnsafeValue(value)) {
      gaps.push(`unsafe_output_value:${value.slice(0, 80)}`);
    }
  }
}

export function validateMeasurementJourneyStateModel(model, options = {}) {
  const gaps = [];
  if (model?.schema_version !== MEASUREMENT_JOURNEY_STATE_MODEL_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  if (model?.artifact_class !== "measurement_journey_state_model") {
    gaps.push("artifact_class is invalid");
  }
  for (const [field, expected] of Object.entries({
    internal_only: true,
    aggregate_only: true,
    source_ref_only: true,
    fail_closed: true,
    ui_readiness_only: true
  })) {
    if (model?.[field] !== expected) gaps.push(`${field} must be ${expected}`);
  }
  const activeStateId = model?.measurement_journey_state?.state_id;
  if (!MEASUREMENT_JOURNEY_STATE_IDS.includes(activeStateId)) {
    gaps.push("measurement_journey_state.state_id is invalid");
  }
  if (model?.model_review_posture !== MODEL_REVIEW_POSTURE) {
    gaps.push("model_review_posture must remain blocked");
  }
  if (!hasEveryRequiredValue(model?.blocked_claims, REQUIRED_BLOCKED_CLAIMS)) {
    gaps.push("blocked_claims must include every required blocked claim");
  }
  if (!hasEveryRequiredValue(model?.not_yet_evidence, NOT_YET_EVIDENCE)) {
    gaps.push("not_yet_evidence must include every required non-evidence item");
  }
  if (model?.ui_language_policy?.raw_state_tokens_render_directly !== false) {
    gaps.push("ui_language_policy.raw_state_tokens_render_directly must be false");
  }
  if (model?.bayesian_chain_state?.current_state !== BAYESIAN_CHAIN_HELD_STATE) {
    gaps.push("bayesian_chain_state.current_state must remain held");
  }
  if (model?.bayesian_chain_state?.allowed_next_step !== BAYESIAN_CHAIN_ALLOWED_NEXT_STEP) {
    gaps.push("bayesian_chain_state.allowed_next_step must remain governed diagnostics source completion");
  }
  if (model?.bayesian_chain_state?.changed_by_this_state_model !== false) {
    gaps.push("bayesian_chain_state.changed_by_this_state_model must be false");
  }
  validateDefinitions(model, gaps);
  validateFalseFlags(model, gaps);
  validateRequiredOutputFields(model, gaps);
  validateNoUnexpectedEvidenceHashes(model, gaps);
  validateSafeOutputText(model, gaps);
  if (model?.state_model_hash !== measurementJourneyStateModelHash(model ?? {})) {
    gaps.push("state_model_hash mismatch");
  }

  if (
    activeStateId &&
    activeStateId !== "NO_BLUEPRINT" &&
    options.sourceInput
  ) {
    const recomputed = buildMeasurementJourneyStateModel(options.sourceInput);
    const actualWithoutHash = clone(model);
    const recomputedWithoutHash = clone(recomputed);
    delete actualWithoutHash.state_model_hash;
    delete recomputedWithoutHash.state_model_hash;
    if (stableJson(actualWithoutHash) !== stableJson(recomputedWithoutHash)) {
      gaps.push("measurement_journey_state does not match source-bound recomputation");
    }
  } else if (activeStateId && activeStateId !== "NO_BLUEPRINT") {
    gaps.push("sourceInput is required for non-default state validation");
  }
  return { valid: unique(gaps).length === 0, gaps: unique(gaps) };
}

function readJson(path) {
  if (!path) return {};
  const input = path === "-" ? readFileSync(0, "utf8") : readFileSync(path, "utf8");
  return input.trim() ? JSON.parse(input) : {};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = readJson(process.argv[2]);
  const model = buildMeasurementJourneyStateModel(input);
  process.stdout.write(`${JSON.stringify(model, null, 2)}\n`);
}
