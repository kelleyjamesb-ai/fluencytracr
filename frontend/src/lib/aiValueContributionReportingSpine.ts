export const REQUIRED_CONTRIBUTION_REPORTING_MILESTONES = [
  { key: "T0_baseline", label: "T0" },
  { key: "T30", label: "T30" },
  { key: "T60", label: "T60" },
  { key: "T90", label: "T90" },
  { key: "T120", label: "T120" },
  { key: "T180_6_month", label: "T180" },
  { key: "T270_9_month", label: "T270" },
  { key: "T365_12_month", label: "T365" }
] as const;

export type AiContributionReportingMilestone =
  (typeof REQUIRED_CONTRIBUTION_REPORTING_MILESTONES)[number];

export type AiContributionReportingTone = "good" | "warn" | "neutral";

export interface AiContributionReportingCandidateRecommendation {
  candidateMetricId: string;
  metricLabel: string;
  candidateMetricFamily: string;
  sourceMetricLibraryRef: string;
  expectedSourceSystemPosture: string;
  rationale: string;
  recommendationIsEvidence: false;
  selectedMetricApproved: false;
}

export interface AiContributionReportingSelectedMetricPosture {
  label: string;
  detail: string;
  metricLabel: string;
}

export type AiReviewerMetricSelectionDraftIntakeState =
  | "DRAFT_INTAKE_HELD_FOR_BLUEPRINT_HYPOTHESIS"
  | "DRAFT_INTAKE_HELD_FOR_CANDIDATE_RECOMMENDATION"
  | "DRAFT_INTAKE_HELD_FOR_DRAFT_SELECTION"
  | "DRAFT_INTAKE_PREPARED_REVIEW_REQUIRED";

export interface AiReviewerMetricSelectionDraftIntake {
  draftIntakeState: AiReviewerMetricSelectionDraftIntakeState;
  sourceBlueprintHypothesisRef: string | null;
  candidateMetricRecommendationRef: string | null;
  draftSelectedMetricCandidate: string | null;
  metricOwnerReviewerRole: string | null;
  expectedMovementDirection: "directional_review_required";
  lagContext: "HOLD_FOR_REVIEWER_EXPECTATION_PATH";
  milestoneSchedule: {
    scheduleState: "DRAFT_PLANNING_ONLY_REVIEW_REQUIRED";
    requiredMilestones: AiContributionReportingMilestone[];
    createsMeasurementCellEvidence: false;
  };
  baselineSourcePosture: "HOLD_FOR_BASELINE_SOURCE_REVIEW";
  comparisonCondition: "HOLD_FOR_COMPARISON_CONDITION_REVIEW";
  cohortIdentity: string;
  workflowFunctionIdentity: string;
  aggregateMeasurementCellGrain: "DRAFT_GRAIN_PENDING_REVIEW";
  suppressionMissingHeldPrecheckPosture: "HOLD_FOR_SUPPRESSION_MISSING_HELD_PRECHECK";
  reviewerDecisionPlaceholder: "HOLD_FOR_REVIEWER_DECISION";
  draftOnly: true;
  localFrontendStateOnly: true;
  selectedMetricApproved: false;
  createsGovernedApproval: false;
  createsDiagnosticsEvidence: false;
  comparisonDesignAdequacySatisfied: false;
  feedsBayesianPromotion: false;
}

export type AiComparisonDesignIntakeReadinessState =
  | "COMPARISON_DESIGN_INTAKE_HELD_FOR_BLUEPRINT_HYPOTHESIS"
  | "COMPARISON_DESIGN_INTAKE_HELD_FOR_CANDIDATE_RECOMMENDATION"
  | "COMPARISON_DESIGN_INTAKE_HELD_FOR_DRAFT_SELECTION"
  | "COMPARISON_DESIGN_INTAKE_HELD_FOR_REQUIRED_INTAKE_FIELDS"
  | "COMPARISON_DESIGN_INTAKE_READY_FOR_SOURCE_PACKAGE_DRAFT_REVIEW";

export type AiComparisonDesignSourcePackageDraftState =
  | "SOURCE_PACKAGE_DRAFT_NOT_STARTED"
  | "SOURCE_PACKAGE_DRAFT_HELD_FOR_CANDIDATE_RECOMMENDATION"
  | "SOURCE_PACKAGE_DRAFT_HELD_FOR_REQUIRED_INTAKE_FIELDS"
  | "SOURCE_PACKAGE_DRAFT_READY_FOR_REVIEW_PREPARATION";

export interface AiComparisonDesignIntakeReadinessReview {
  readinessState: AiComparisonDesignIntakeReadinessState;
  sourceBlueprintHypothesisRef: string | null;
  candidateMetricRecommendationRef: string | null;
  draftSelectedMetricCandidate: string | null;
  reviewerRole: string | null;
  reviewerDecisionPosture: "HOLD_FOR_REVIEWER_DECISION";
  expectedMovementDirection: "directional_review_required";
  lagContext: "HOLD_FOR_REVIEWER_EXPECTATION_PATH";
  milestoneSchedule: {
    scheduleState: "DRAFT_PLANNING_ONLY_REVIEW_REQUIRED";
    requiredMilestones: AiContributionReportingMilestone[];
    createsMeasurementCellEvidence: false;
  };
  baselineSourcePosture: "HOLD_FOR_BASELINE_SOURCE_REVIEW";
  comparisonCondition: "HOLD_FOR_COMPARISON_CONDITION_REVIEW";
  cohortIdentity: string;
  workflowFunctionIdentity: string;
  aggregateMeasurementCellGrain: "DRAFT_GRAIN_PENDING_REVIEW";
  suppressionMissingHeldPrecheckPosture: "HOLD_FOR_SUPPRESSION_MISSING_HELD_PRECHECK";
  comparisonDesignSourcePackageDraftState: AiComparisonDesignSourcePackageDraftState;
  missingFields: string[];
  readinessGaps: string[];
  allowedNextAction:
    | "clarify_blueprint_hypothesis"
    | "supply_candidate_metric_recommendation"
    | "prepare_reviewer_metric_selection_draft_intake"
    | "complete_required_comparison_design_intake_fields"
    | "complete_comparison_design_source_package_draft_review";
  draftReadinessOnly: true;
  sourceRefAndPostureOnly: true;
  selectedMetricApproved: false;
  createsGovernedApproval: false;
  createsDiagnosticsEvidence: false;
  comparisonDesignAdequacySatisfied: false;
  diagnosticsEvidenceSatisfied: false;
  feedsBayesianPromotion: false;
  promotionAuthorized: false;
}

export type AiComparisonDesignSourcePackageDraftAssemblyState =
  | "COMPARISON_DESIGN_SOURCE_PACKAGE_DRAFT_HELD_FOR_BLUEPRINT_HYPOTHESIS"
  | "COMPARISON_DESIGN_SOURCE_PACKAGE_DRAFT_HELD_FOR_CANDIDATE_RECOMMENDATION"
  | "COMPARISON_DESIGN_SOURCE_PACKAGE_DRAFT_HELD_FOR_DRAFT_SELECTION"
  | "COMPARISON_DESIGN_SOURCE_PACKAGE_DRAFT_HELD_FOR_REQUIRED_INTAKE_FIELDS"
  | "COMPARISON_DESIGN_SOURCE_PACKAGE_DRAFT_ASSEMBLED_REVIEW_REQUIRED";

export interface AiComparisonDesignSourcePackageDraftAssembly {
  draftAssemblyState: AiComparisonDesignSourcePackageDraftAssemblyState;
  draftStatus: "DRAFT_ASSEMBLY_ONLY_NOT_EVIDENCE";
  templateRef: string;
  sourceBlueprintHypothesisRef: string | null;
  candidateMetricRecommendationRef: string | null;
  draftSelectedMetricCandidate: string | null;
  metricOwnerReviewerRole: string | null;
  reviewerDecisionPlaceholder: "HOLD_FOR_REVIEWER_DECISION";
  expectedMovementDirection: "directional_review_required";
  expectedLagContext: "HOLD_FOR_REVIEWER_EXPECTATION_PATH";
  baselineSourcePosture: "HOLD_FOR_BASELINE_SOURCE_REVIEW";
  comparisonCondition: "HOLD_FOR_COMPARISON_CONDITION_REVIEW";
  cohortIdentity: string;
  workflowFunctionIdentity: string;
  aggregateMeasurementCellGrain: "DRAFT_GRAIN_PENDING_REVIEW";
  suppressionMissingHeldPrecheckPosture: "HOLD_FOR_SUPPRESSION_MISSING_HELD_PRECHECK";
  requiredMilestoneLabels: string[];
  forbiddenSourceInputs: string[];
  missingFields: string[];
  sourcePackageDraftCreated: boolean;
  sourcePackageCreated: false;
  reviewerOwnedEvidenceCollected: false;
  createsGovernedApproval: false;
  createsDiagnosticsEvidence: false;
  comparisonDesignAdequacySatisfied: false;
  diagnosticsEvidenceSatisfied: false;
  feedsGovernedDiagnosticsSufficiencySource: false;
  feedsBayesianPromotion: false;
  promotionAuthorized: false;
  allowedNextAction:
    | "clarify_blueprint_hypothesis"
    | "supply_candidate_metric_recommendation"
    | "prepare_reviewer_metric_selection_draft_intake"
    | "complete_required_comparison_design_intake_fields"
    | "complete_comparison_design_source_package_draft_review";
}

export type AiReviewerOwnedSourcePackageCollectionState =
  | "REVIEWER_OWNED_SOURCE_PACKAGE_COLLECTION_HELD_FOR_SOURCE_PACKAGE_DRAFT"
  | "REVIEWER_OWNED_SOURCE_PACKAGE_COLLECTION_HELD_FOR_SOURCE_PACKAGE_DRAFT_REVIEW";

export interface AiReviewerOwnedSourcePackageCollectionPosture {
  collectionState: AiReviewerOwnedSourcePackageCollectionState;
  draftAssemblyState: AiComparisonDesignSourcePackageDraftAssemblyState;
  requiredReviewerAttestations: string[];
  forbiddenSourceInputs: string[];
  reviewerOwnedSourcePackageSupplied: false;
  sourcePackageReviewReady: false;
  sourcePackageHashAuthorized: false;
  reviewedSourceEvidenceHashAuthorized: false;
  sourceEvidenceHashAuthorized: false;
  reviewedEvidenceManifestHashAuthorized: false;
  evidenceSatisfied: false;
  comparisonDesignAdequacySatisfied: false;
  diagnosticsEvidenceSatisfied: false;
  feedsGovernedDiagnosticsSufficiencySource: false;
  feedsBayesianPromotion: false;
  promotionAuthorized: false;
  allowedNextAction:
    | "clarify_blueprint_hypothesis"
    | "supply_candidate_metric_recommendation"
    | "prepare_reviewer_metric_selection_draft_intake"
    | "complete_required_comparison_design_intake_fields"
    | "complete_comparison_design_source_package_draft_review";
}

export interface AiContributionReportingSpineViewModel {
  reportingSpineState:
    | "HOLD_FOR_BLUEPRINT_HYPOTHESIS"
    | "HOLD_FOR_METRIC_LIBRARY_REFS"
    | "AI_CONTRIBUTION_REPORTING_SPINE_READY_WITH_EVIDENCE_GAPS";
  statusLabel: string;
  statusTone: AiContributionReportingTone;
  blueprintHypothesisRef: string | null;
  workflowFunctionScope: string;
  valueRouteLabel: string;
  candidateMetricRecommendationState:
    | "HELD_NOT_RECOMMENDED"
    | "CANDIDATE_RECOMMENDATIONS_ONLY_NOT_EVIDENCE";
  candidateMetricRecommendations: AiContributionReportingCandidateRecommendation[];
  recommendationsCreateEvidence: false;
  recommendationsAreSelectedMetrics: false;
  selectedMetricApproved: false;
  selectedMetricApprovalState:
    | "HOLD_FOR_REVIEWER_APPROVAL"
    | "LOCAL_SELECTION_NOT_REVIEWER_APPROVED";
  selectedMetricPosture: AiContributionReportingSelectedMetricPosture;
  reviewerMetricSelectionDraftIntake: AiReviewerMetricSelectionDraftIntake;
  comparisonDesignIntakeReadiness: AiComparisonDesignIntakeReadinessReview;
  comparisonDesignSourcePackageDraft: AiComparisonDesignSourcePackageDraftAssembly;
  reviewerOwnedSourcePackageCollection: AiReviewerOwnedSourcePackageCollectionPosture;
  milestonePlan: {
    scheduleState: "HOLD_FOR_MILESTONE_WINDOW_REVIEW";
    requiredMilestones: AiContributionReportingMilestone[];
    milestonesArePlanningOnly: true;
  };
  measurementReadinessState: "HELD_FOR_MISSING_MILESTONE_WINDOWS";
  evidenceAlignmentState: "NOT_READY";
  evidenceGapList: string[];
  allowedNextEvidenceAction:
    | "clarify_blueprint_hypothesis"
    | "supply_metric_library_refs"
    | "complete_reviewer_metric_selection_approval";
  allowedNextStep: "hold_for_reviewer_evidence_collection" | "complete_missing_evidence_alignment_inputs";
  modelReviewInputPosture: "MODEL_REVIEW_INPUT_HELD_FOR_EVIDENCE_GAPS";
  modelEligibilityStatus: "NOT_ELIGIBLE_FOR_MODEL_REVIEW" | "HELD_FOR_EVIDENCE_GAPS";
  bayesianChainState: {
    currentState: "HOLD_FOR_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE";
    allowedNextStep: "complete_governed_diagnostics_sufficiency_evidence_source";
    changedByThisSpine: false;
  };
  diagnosticsEvidenceSatisfied: false;
  promotionAuthorized: false;
  customerPublishable: false;
  blockedOutputs: Record<string, false>;
}

export interface AiContributionReportingBridgeItemLike {
  id: string;
  metricName: string;
  valueRouteLabel: string;
  sourceSystem: string;
  measurementUnit: string;
  owner: string;
  successMeasure?: string;
}

export interface AiContributionReportingBridgeLike {
  available: boolean;
  items: AiContributionReportingBridgeItemLike[];
}

export interface AiContributionReportingSelectedMetricLike {
  id: string;
  name: string;
  valueRoute?: string;
  sourceSystem?: string;
  measurementUnit?: string;
  owner?: string;
}

export interface AiContributionReportingSelectedMetricSelectionLike {
  metrics: AiContributionReportingSelectedMetricLike[];
}

export interface BuildAiContributionReportingSpineViewModelInput {
  blueprintHypothesisRef?: string | null;
  workflowFunctionScope?: string | null;
  valueRouteLabel?: string | null;
  metricLibraryRef?: string | null;
  questionMetricBridge?: AiContributionReportingBridgeLike | null;
  selectedOutcomeMetricSelection?: AiContributionReportingSelectedMetricSelectionLike | null;
}

export const CONTRIBUTION_REPORTING_BLOCKED_OUTPUTS = Object.freeze({
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

const COMPARISON_DESIGN_SOURCE_PACKAGE_INTAKE_TEMPLATE_REF =
  "docs/contracts/ai-value-contribution-alignment-governed-diagnostics-evidence-collection-packet/COMPARISON_DESIGN_SOURCE_PACKAGE_INTAKE_TEMPLATE.md";

const COMPARISON_DESIGN_DRAFT_FORBIDDEN_SOURCE_INPUTS = [
  "template_prose",
  "generated_examples",
  "fixture_defaults",
  "runtime_hashes_alone",
  "posterior_like_values",
  "raw_rows",
  "identifiers",
  "query_text",
  "prompts",
  "transcripts",
  "person_level_data",
  "live_connector_output"
];

const REVIEWER_OWNED_SOURCE_PACKAGE_REQUIRED_ATTESTATIONS = [
  "reviewer_approved_metric_selection",
  "approved_expectation_path_direction_lag",
  "milestone_window_alignment",
  "baseline_source_review",
  "comparison_condition_review",
  "cohort_identity_review",
  "workflow_function_identity_review",
  "aggregate_measurement_cell_grain_review",
  "suppression_missing_held_window_review",
  "cross_slice_aggregation_prohibition_review",
  "person_level_identifier_exclusion_review",
  "causality_claim_exclusion_review",
  "data_science_and_governance_reviewer_decision"
];

const compactText = (value: unknown, fallback = ""): string => {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  return text || fallback;
};

const escapedPatternText = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const joinedTerm = (...parts: string[]) => parts.join("");
const unsafeDisplayTerms = [
  joinedTerm("confi", "dence"),
  joinedTerm("proba", "bility"),
  joinedTerm("R", "OI"),
  joinedTerm("EB", "ITA"),
  joinedTerm("fin", "ance"),
  joinedTerm("fin", "ancial"),
  joinedTerm("caus", "ality"),
  joinedTerm("caus", "al"),
  joinedTerm("produc", "tivity"),
  joinedTerm("employ", "ee"),
  joinedTerm("indiv", "idual"),
  joinedTerm("person", "-level"),
  joinedTerm("team", " ranking"),
  joinedTerm("manager", " ranking"),
  joinedTerm("raw", " prompt"),
  joinedTerm("raw", " query"),
  joinedTerm("raw", " transcript"),
  joinedTerm("raw", " response"),
  joinedTerm("query", " text"),
  joinedTerm("trans", "cript"),
  joinedTerm("pr", "ompt")
];
const unsafeKeyPrefixes = ["user", "employ" + "ee", "person", "client", "org", "metric", "source", "review", "workflow"];
const unsafeKeySuffixes = ["id", "ref", "state", "key"];
const unsafeDisplayTextPattern = new RegExp(
  `\\b(${unsafeDisplayTerms.map(escapedPatternText).join("|")})\\b|(?:^|[\\s_.-])(?:${unsafeKeyPrefixes.join("|")})[_-](?:${unsafeKeySuffixes.join("|")})(?:$|[\\s_.-])|\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b|\\b(select|insert|update|delete|merge|with)\\b\\s+[^.?!]*\\b(from|into|table|where|join)\\b`,
  "i"
);

export const safeContributionReportingDisplayText = (
  value: unknown,
  fallback = "Planning input held for safe display review"
): string => {
  const text = compactText(value, fallback);
  return unsafeDisplayTextPattern.test(text) ? fallback : text;
};

const safeContributionReportingReadinessText = (value: unknown): string | null => {
  const text = compactText(value);
  return text && !unsafeDisplayTextPattern.test(text) ? text : null;
};

const reviewerRolePosture = (value: unknown): string | null =>
  compactText(value) ? "Metric owner / reviewer role supplied" : null;

const labelFromToken = (value: string): string =>
  value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const normalizeDraftMetricId = (value: unknown): string =>
  compactText(value)
    .replace(/^bridge-/, "")
    .replace(/\s+/g, "_")
    .toLowerCase();

const candidateFamily = (item: AiContributionReportingBridgeItemLike): string => {
  const route = compactText(item.valueRouteLabel, "metric planning").toLowerCase();
  if (/quality/.test(route)) return "quality_exception_context";
  if (/risk/.test(route)) return "risk_review_context";
  if (/experience/.test(route)) return "customer_experience_context";
  if (/revenue|growth/.test(route)) return "stage_progression_context";
  if (/cost/.test(route)) return "process_efficiency_context";
  return "workflow_cycle_context";
};

const buildRecommendations = (
  bridge: AiContributionReportingBridgeLike | null | undefined,
  metricLibraryRef: string | null | undefined
): AiContributionReportingCandidateRecommendation[] => {
  if (!compactText(metricLibraryRef)) return [];
  if (!bridge?.available || bridge.items.length === 0) return [];
  const sourceMetricLibraryRef = safeContributionReportingDisplayText(
    metricLibraryRef,
    "Existing aggregate metric library"
  );
  return bridge.items.slice(0, 4).map((item) => ({
    candidateMetricId: safeContributionReportingDisplayText(
      item.id,
      "candidate_aggregate_metric"
    ).replace(/\s+/g, "_").toLowerCase(),
    metricLabel: safeContributionReportingDisplayText(
      item.metricName,
      "Candidate aggregate metric held for safe display review"
    ),
    candidateMetricFamily: candidateFamily(item),
    sourceMetricLibraryRef,
    expectedSourceSystemPosture: safeContributionReportingDisplayText(
      item.sourceSystem,
      "Customer-owned aggregate outcome source"
    ),
    rationale: safeContributionReportingDisplayText(
      item.successMeasure,
      "Candidate aggregate metric from the existing outcome metric bridge."
    ),
    recommendationIsEvidence: false,
    selectedMetricApproved: false
  }));
};

export const evidenceGapLabel = (gap: string): string => {
  const labels: Record<string, string> = {
    missing_blueprint_hypothesis_ref: "Missing Blueprint hypothesis",
    missing_metric_library_refs: "Missing metric library reference",
    missing_reviewer_metric_approval: "Missing reviewer metric approval",
    missing_milestone_reconciliation: "Missing milestone window review",
    missing_said_evidence_refs: "Missing said evidence refs",
    missing_unsaid_behavioral_evidence_refs: "Missing unsaid behavioral evidence refs",
    missing_outcome_measurement_cell_refs: "Missing aggregate outcome Measurement Cell refs",
    missing_comparison_design_source_package: "Missing comparison-design source package"
  };
  return labels[gap] ?? labelFromToken(gap);
};

export const allowedNextEvidenceActionLabel = (action: string): string => {
  const labels: Record<string, string> = {
    clarify_blueprint_hypothesis: "Clarify Blueprint hypothesis",
    supply_metric_library_refs: "Supply metric library refs",
    complete_reviewer_metric_selection_approval: "Complete reviewer metric selection approval"
  };
  return labels[action] ?? labelFromToken(action);
};

export const modelReviewPostureLabel = (
  posture: AiContributionReportingSpineViewModel["modelReviewInputPosture"]
): string => {
  if (posture === "MODEL_REVIEW_INPUT_HELD_FOR_EVIDENCE_GAPS") {
    return "Held for evidence gaps";
  }
  return labelFromToken(posture);
};

export const reviewerMetricSelectionDraftIntakeStateLabel = (
  state: AiReviewerMetricSelectionDraftIntakeState
): string => {
  const labels: Record<AiReviewerMetricSelectionDraftIntakeState, string> = {
    DRAFT_INTAKE_HELD_FOR_BLUEPRINT_HYPOTHESIS: "Draft intake held",
    DRAFT_INTAKE_HELD_FOR_CANDIDATE_RECOMMENDATION: "Draft intake held",
    DRAFT_INTAKE_HELD_FOR_DRAFT_SELECTION: "Draft intake held",
    DRAFT_INTAKE_PREPARED_REVIEW_REQUIRED: "Draft selected metric prepared"
  };
  return labels[state];
};

export const comparisonDesignIntakeReadinessStateLabel = (
  state: AiComparisonDesignIntakeReadinessState
): string => {
  const labels: Record<AiComparisonDesignIntakeReadinessState, string> = {
    COMPARISON_DESIGN_INTAKE_HELD_FOR_BLUEPRINT_HYPOTHESIS:
      "Readiness held",
    COMPARISON_DESIGN_INTAKE_HELD_FOR_CANDIDATE_RECOMMENDATION:
      "Readiness held",
    COMPARISON_DESIGN_INTAKE_HELD_FOR_DRAFT_SELECTION: "Readiness held",
    COMPARISON_DESIGN_INTAKE_HELD_FOR_REQUIRED_INTAKE_FIELDS:
      "Readiness held",
    COMPARISON_DESIGN_INTAKE_READY_FOR_SOURCE_PACKAGE_DRAFT_REVIEW:
      "Ready for draft package review"
  };
  return labels[state];
};

export const comparisonDesignSourcePackageDraftStateLabel = (
  state: AiComparisonDesignSourcePackageDraftState
): string => {
  const labels: Record<AiComparisonDesignSourcePackageDraftState, string> = {
    SOURCE_PACKAGE_DRAFT_NOT_STARTED: "Draft package not started",
    SOURCE_PACKAGE_DRAFT_HELD_FOR_CANDIDATE_RECOMMENDATION:
      "Draft package held for candidate recommendation",
    SOURCE_PACKAGE_DRAFT_HELD_FOR_REQUIRED_INTAKE_FIELDS:
      "Draft package held for intake fields",
    SOURCE_PACKAGE_DRAFT_READY_FOR_REVIEW_PREPARATION:
      "Draft package ready for review preparation"
  };
  return labels[state];
};

export const comparisonDesignIntakeGapLabel = (gap: string): string => {
  const labels: Record<string, string> = {
    missing_source_blueprint_hypothesis_ref: "Missing source Blueprint hypothesis",
    missing_candidate_metric_recommendation_ref:
      "Missing candidate metric recommendation",
    missing_draft_selected_metric_candidate: "Missing draft selected metric",
    missing_metric_owner_reviewer_role: "Missing metric owner / reviewer role",
    reviewer_decision_pending: "Reviewer decision still pending",
    expected_direction_review_required: "Direction review required",
    lag_context_review_required: "Timing lag review required",
    baseline_source_review_required: "Baseline source review required",
    comparison_condition_review_required: "Comparison condition review required",
    measurement_cell_grain_review_required:
      "Aggregate Measurement Cell grain review required",
    suppression_missing_held_precheck_required:
      "Suppression / missing / held precheck required",
    source_package_draft_review_required:
      "Comparison-design source package draft review required",
    reviewer_approved_metric_selection:
      "Pending attestation: metric-selection review",
    approved_expectation_path_direction_lag:
      "Pending attestation: expectation path direction and lag review",
    milestone_window_alignment: "Pending attestation: milestone window alignment",
    baseline_source_review: "Pending attestation: baseline source review",
    comparison_condition_review:
      "Pending attestation: comparison condition review",
    cohort_identity_review: "Pending attestation: cohort identity review",
    workflow_function_identity_review:
      "Pending attestation: workflow / function identity review",
    aggregate_measurement_cell_grain_review:
      "Pending attestation: aggregate Measurement Cell grain review",
    suppression_missing_held_window_review:
      "Pending attestation: suppression / missing / held window review",
    cross_slice_aggregation_prohibition_review:
      "Pending attestation: cross-slice aggregation prohibition review",
    person_level_identifier_exclusion_review:
      "Pending attestation: person-level / identifier exclusion review",
    causality_claim_exclusion_review:
      "Pending attestation: no-causality-claim review",
    data_science_and_governance_reviewer_decision:
      "Pending attestation: data science and governance reviewer decision"
  };
  return labels[gap] ?? labelFromToken(gap);
};

export const comparisonDesignIntakeAllowedActionLabel = (action: string): string => {
  const labels: Record<string, string> = {
    clarify_blueprint_hypothesis: "Clarify Blueprint hypothesis",
    supply_candidate_metric_recommendation: "Supply candidate metric recommendation",
    prepare_reviewer_metric_selection_draft_intake:
      "Prepare selected metric draft intake",
    complete_required_comparison_design_intake_fields:
      "Complete required intake fields",
    complete_comparison_design_source_package_draft_review:
      "Complete comparison-design source package draft review"
  };
  return labels[action] ?? labelFromToken(action);
};

export const comparisonDesignSourcePackageDraftAssemblyStateLabel = (
  state: AiComparisonDesignSourcePackageDraftAssemblyState
): string => {
  const labels: Record<AiComparisonDesignSourcePackageDraftAssemblyState, string> = {
    COMPARISON_DESIGN_SOURCE_PACKAGE_DRAFT_HELD_FOR_BLUEPRINT_HYPOTHESIS:
      "Draft assembly held",
    COMPARISON_DESIGN_SOURCE_PACKAGE_DRAFT_HELD_FOR_CANDIDATE_RECOMMENDATION:
      "Draft assembly held",
    COMPARISON_DESIGN_SOURCE_PACKAGE_DRAFT_HELD_FOR_DRAFT_SELECTION:
      "Draft assembly held",
    COMPARISON_DESIGN_SOURCE_PACKAGE_DRAFT_HELD_FOR_REQUIRED_INTAKE_FIELDS:
      "Draft assembly held",
    COMPARISON_DESIGN_SOURCE_PACKAGE_DRAFT_ASSEMBLED_REVIEW_REQUIRED:
      "Draft review required"
  };
  return labels[state];
};

export const reviewerOwnedSourcePackageCollectionStateLabel = (
  state: AiReviewerOwnedSourcePackageCollectionState
): string => {
  const labels: Record<AiReviewerOwnedSourcePackageCollectionState, string> = {
    REVIEWER_OWNED_SOURCE_PACKAGE_COLLECTION_HELD_FOR_SOURCE_PACKAGE_DRAFT:
      "Collection held",
    REVIEWER_OWNED_SOURCE_PACKAGE_COLLECTION_HELD_FOR_SOURCE_PACKAGE_DRAFT_REVIEW:
      "Collection held"
  };
  return labels[state];
};

export const comparisonDesignSourcePackageDraftAllowedActionLabel = (
  action: string
): string => {
  const labels: Record<string, string> = {
    clarify_blueprint_hypothesis: "Clarify Blueprint hypothesis",
    supply_candidate_metric_recommendation: "Supply candidate metric recommendation",
    prepare_reviewer_metric_selection_draft_intake:
      "Prepare selected metric draft intake",
    complete_required_comparison_design_intake_fields:
      "Complete required intake fields",
    complete_comparison_design_source_package_draft_review:
      "Complete comparison-design source package draft review"
  };
  return labels[action] ?? labelFromToken(action);
};

export const reviewerOwnedSourcePackageCollectionAllowedActionLabel = (
  action: string
): string => {
  const labels: Record<string, string> = {
    clarify_blueprint_hypothesis: "Clarify Blueprint hypothesis",
    supply_candidate_metric_recommendation: "Supply candidate metric recommendation",
    prepare_reviewer_metric_selection_draft_intake:
      "Prepare selected metric draft intake",
    complete_required_comparison_design_intake_fields:
      "Complete required intake fields",
    complete_comparison_design_source_package_draft_review:
      "Complete comparison-design source package draft review"
  };
  return labels[action] ?? labelFromToken(action);
};

const buildReviewerMetricSelectionDraftIntake = ({
  blueprintHypothesisRef,
  candidateMetricRecommendations,
  selectedOutcomeMetricSelection,
  workflowFunctionScope
}: {
  blueprintHypothesisRef: string | null;
  candidateMetricRecommendations: AiContributionReportingCandidateRecommendation[];
  selectedOutcomeMetricSelection?: AiContributionReportingSelectedMetricSelectionLike | null;
  workflowFunctionScope: string;
}): AiReviewerMetricSelectionDraftIntake => {
  const selectedMetric = selectedOutcomeMetricSelection?.metrics?.[0] ?? null;
  const matchedRecommendation = selectedMetric
    ? candidateMetricRecommendations.find(
        (recommendation) =>
          normalizeDraftMetricId(recommendation.candidateMetricId) ===
          normalizeDraftMetricId(selectedMetric.id)
      )
    : null;
  const draftIntakeState: AiReviewerMetricSelectionDraftIntakeState =
    !blueprintHypothesisRef
      ? "DRAFT_INTAKE_HELD_FOR_BLUEPRINT_HYPOTHESIS"
      : candidateMetricRecommendations.length === 0 || (selectedMetric && !matchedRecommendation)
        ? "DRAFT_INTAKE_HELD_FOR_CANDIDATE_RECOMMENDATION"
        : !selectedMetric
          ? "DRAFT_INTAKE_HELD_FOR_DRAFT_SELECTION"
          : "DRAFT_INTAKE_PREPARED_REVIEW_REQUIRED";
  const draftPrepared = draftIntakeState === "DRAFT_INTAKE_PREPARED_REVIEW_REQUIRED";

  return {
    draftIntakeState,
    sourceBlueprintHypothesisRef: blueprintHypothesisRef,
    candidateMetricRecommendationRef: matchedRecommendation
      ? `candidate_metric_recommendation.${matchedRecommendation.candidateMetricId}`
      : null,
    draftSelectedMetricCandidate: draftPrepared
      ? safeContributionReportingReadinessText(selectedMetric?.name)
      : null,
    metricOwnerReviewerRole: draftPrepared
      ? reviewerRolePosture((selectedMetric as { owner?: string }).owner)
      : null,
    expectedMovementDirection: "directional_review_required",
    lagContext: "HOLD_FOR_REVIEWER_EXPECTATION_PATH",
    milestoneSchedule: {
      scheduleState: "DRAFT_PLANNING_ONLY_REVIEW_REQUIRED",
      requiredMilestones: [...REQUIRED_CONTRIBUTION_REPORTING_MILESTONES],
      createsMeasurementCellEvidence: false
    },
    baselineSourcePosture: "HOLD_FOR_BASELINE_SOURCE_REVIEW",
    comparisonCondition: "HOLD_FOR_COMPARISON_CONDITION_REVIEW",
    cohortIdentity: safeContributionReportingDisplayText(
      (selectedOutcomeMetricSelection as { functionArea?: string } | null | undefined)
        ?.functionArea,
      "Aggregate cohort pending reviewer intake"
    ),
    workflowFunctionIdentity: safeContributionReportingDisplayText(
      workflowFunctionScope,
      "Workflow/function pending"
    ),
    aggregateMeasurementCellGrain: "DRAFT_GRAIN_PENDING_REVIEW",
    suppressionMissingHeldPrecheckPosture: "HOLD_FOR_SUPPRESSION_MISSING_HELD_PRECHECK",
    reviewerDecisionPlaceholder: "HOLD_FOR_REVIEWER_DECISION",
    draftOnly: true,
    localFrontendStateOnly: true,
    selectedMetricApproved: false,
    createsGovernedApproval: false,
    createsDiagnosticsEvidence: false,
    comparisonDesignAdequacySatisfied: false,
    feedsBayesianPromotion: false
  };
};

const buildComparisonDesignIntakeReadiness = (
  draft: AiReviewerMetricSelectionDraftIntake
): AiComparisonDesignIntakeReadinessReview => {
  const missingFields = [
    !draft.sourceBlueprintHypothesisRef && "missing_source_blueprint_hypothesis_ref",
    !draft.candidateMetricRecommendationRef && "missing_candidate_metric_recommendation_ref",
    !draft.draftSelectedMetricCandidate && "missing_draft_selected_metric_candidate",
    !draft.metricOwnerReviewerRole && "missing_metric_owner_reviewer_role"
  ].filter(Boolean) as string[];
  const readinessState: AiComparisonDesignIntakeReadinessState =
    draft.draftIntakeState === "DRAFT_INTAKE_HELD_FOR_BLUEPRINT_HYPOTHESIS"
      ? "COMPARISON_DESIGN_INTAKE_HELD_FOR_BLUEPRINT_HYPOTHESIS"
      : draft.draftIntakeState === "DRAFT_INTAKE_HELD_FOR_CANDIDATE_RECOMMENDATION"
        ? "COMPARISON_DESIGN_INTAKE_HELD_FOR_CANDIDATE_RECOMMENDATION"
        : draft.draftIntakeState === "DRAFT_INTAKE_HELD_FOR_DRAFT_SELECTION"
          ? "COMPARISON_DESIGN_INTAKE_HELD_FOR_DRAFT_SELECTION"
          : missingFields.length > 0
            ? "COMPARISON_DESIGN_INTAKE_HELD_FOR_REQUIRED_INTAKE_FIELDS"
            : "COMPARISON_DESIGN_INTAKE_READY_FOR_SOURCE_PACKAGE_DRAFT_REVIEW";
  const comparisonDesignSourcePackageDraftState: AiComparisonDesignSourcePackageDraftState =
    draft.draftIntakeState === "DRAFT_INTAKE_PREPARED_REVIEW_REQUIRED" &&
    missingFields.length === 0
      ? "SOURCE_PACKAGE_DRAFT_READY_FOR_REVIEW_PREPARATION"
      : draft.draftIntakeState === "DRAFT_INTAKE_HELD_FOR_CANDIDATE_RECOMMENDATION"
        ? "SOURCE_PACKAGE_DRAFT_HELD_FOR_CANDIDATE_RECOMMENDATION"
      : draft.draftIntakeState === "DRAFT_INTAKE_HELD_FOR_BLUEPRINT_HYPOTHESIS" ||
          draft.draftIntakeState === "DRAFT_INTAKE_HELD_FOR_DRAFT_SELECTION"
        ? "SOURCE_PACKAGE_DRAFT_NOT_STARTED"
        : "SOURCE_PACKAGE_DRAFT_HELD_FOR_REQUIRED_INTAKE_FIELDS";
  const readinessGaps =
    comparisonDesignSourcePackageDraftState === "SOURCE_PACKAGE_DRAFT_READY_FOR_REVIEW_PREPARATION"
      ? [
          "reviewer_decision_pending",
          "expected_direction_review_required",
          "lag_context_review_required",
          "baseline_source_review_required",
          "comparison_condition_review_required",
          "measurement_cell_grain_review_required",
          "suppression_missing_held_precheck_required",
          "source_package_draft_review_required"
        ]
      : missingFields;
  const allowedNextAction: AiComparisonDesignIntakeReadinessReview["allowedNextAction"] =
    !draft.sourceBlueprintHypothesisRef
      ? "clarify_blueprint_hypothesis"
      : draft.draftIntakeState === "DRAFT_INTAKE_HELD_FOR_CANDIDATE_RECOMMENDATION"
        ? "supply_candidate_metric_recommendation"
      : draft.draftIntakeState !== "DRAFT_INTAKE_PREPARED_REVIEW_REQUIRED"
          ? "prepare_reviewer_metric_selection_draft_intake"
          : missingFields.length > 0
            ? "complete_required_comparison_design_intake_fields"
          : "complete_comparison_design_source_package_draft_review";

  return {
    readinessState,
    sourceBlueprintHypothesisRef: draft.sourceBlueprintHypothesisRef,
    candidateMetricRecommendationRef: draft.candidateMetricRecommendationRef,
    draftSelectedMetricCandidate: draft.draftSelectedMetricCandidate,
    reviewerRole: draft.metricOwnerReviewerRole,
    reviewerDecisionPosture: "HOLD_FOR_REVIEWER_DECISION",
    expectedMovementDirection: draft.expectedMovementDirection,
    lagContext: draft.lagContext,
    milestoneSchedule: {
      scheduleState: draft.milestoneSchedule.scheduleState,
      requiredMilestones: [...draft.milestoneSchedule.requiredMilestones],
      createsMeasurementCellEvidence: false
    },
    baselineSourcePosture: draft.baselineSourcePosture,
    comparisonCondition: draft.comparisonCondition,
    cohortIdentity: draft.cohortIdentity,
    workflowFunctionIdentity: draft.workflowFunctionIdentity,
    aggregateMeasurementCellGrain: draft.aggregateMeasurementCellGrain,
    suppressionMissingHeldPrecheckPosture: draft.suppressionMissingHeldPrecheckPosture,
    comparisonDesignSourcePackageDraftState,
    missingFields,
    readinessGaps,
    allowedNextAction,
    draftReadinessOnly: true,
    sourceRefAndPostureOnly: true,
    selectedMetricApproved: false,
    createsGovernedApproval: false,
    createsDiagnosticsEvidence: false,
    comparisonDesignAdequacySatisfied: false,
    diagnosticsEvidenceSatisfied: false,
    feedsBayesianPromotion: false,
    promotionAuthorized: false
  };
};

const buildComparisonDesignSourcePackageDraft = (
  readiness: AiComparisonDesignIntakeReadinessReview
): AiComparisonDesignSourcePackageDraftAssembly => {
  const draftAssemblyState: AiComparisonDesignSourcePackageDraftAssemblyState =
    readiness.readinessState ===
    "COMPARISON_DESIGN_INTAKE_HELD_FOR_BLUEPRINT_HYPOTHESIS"
      ? "COMPARISON_DESIGN_SOURCE_PACKAGE_DRAFT_HELD_FOR_BLUEPRINT_HYPOTHESIS"
      : readiness.readinessState ===
          "COMPARISON_DESIGN_INTAKE_HELD_FOR_CANDIDATE_RECOMMENDATION"
        ? "COMPARISON_DESIGN_SOURCE_PACKAGE_DRAFT_HELD_FOR_CANDIDATE_RECOMMENDATION"
        : readiness.readinessState ===
            "COMPARISON_DESIGN_INTAKE_HELD_FOR_DRAFT_SELECTION"
          ? "COMPARISON_DESIGN_SOURCE_PACKAGE_DRAFT_HELD_FOR_DRAFT_SELECTION"
          : readiness.readinessState ===
            "COMPARISON_DESIGN_INTAKE_HELD_FOR_REQUIRED_INTAKE_FIELDS"
            ? "COMPARISON_DESIGN_SOURCE_PACKAGE_DRAFT_HELD_FOR_REQUIRED_INTAKE_FIELDS"
            : "COMPARISON_DESIGN_SOURCE_PACKAGE_DRAFT_ASSEMBLED_REVIEW_REQUIRED";
  const sourcePackageDraftCreated =
    draftAssemblyState ===
    "COMPARISON_DESIGN_SOURCE_PACKAGE_DRAFT_ASSEMBLED_REVIEW_REQUIRED";
  const allowedNextAction: AiComparisonDesignSourcePackageDraftAssembly["allowedNextAction"] =
    sourcePackageDraftCreated
      ? "complete_comparison_design_source_package_draft_review"
      : readiness.allowedNextAction;

  return {
    draftAssemblyState,
    draftStatus: "DRAFT_ASSEMBLY_ONLY_NOT_EVIDENCE",
    templateRef: COMPARISON_DESIGN_SOURCE_PACKAGE_INTAKE_TEMPLATE_REF,
    sourceBlueprintHypothesisRef: readiness.sourceBlueprintHypothesisRef,
    candidateMetricRecommendationRef: readiness.candidateMetricRecommendationRef,
    draftSelectedMetricCandidate: readiness.draftSelectedMetricCandidate,
    metricOwnerReviewerRole: readiness.reviewerRole,
    reviewerDecisionPlaceholder: readiness.reviewerDecisionPosture,
    expectedMovementDirection: readiness.expectedMovementDirection,
    expectedLagContext: readiness.lagContext,
    baselineSourcePosture: readiness.baselineSourcePosture,
    comparisonCondition: readiness.comparisonCondition,
    cohortIdentity: readiness.cohortIdentity,
    workflowFunctionIdentity: readiness.workflowFunctionIdentity,
    aggregateMeasurementCellGrain: readiness.aggregateMeasurementCellGrain,
    suppressionMissingHeldPrecheckPosture:
      readiness.suppressionMissingHeldPrecheckPosture,
    requiredMilestoneLabels: readiness.milestoneSchedule.requiredMilestones.map(
      (milestone) => milestone.label
    ),
    forbiddenSourceInputs: [...COMPARISON_DESIGN_DRAFT_FORBIDDEN_SOURCE_INPUTS],
    missingFields: [...readiness.missingFields],
    sourcePackageDraftCreated,
    sourcePackageCreated: false,
    reviewerOwnedEvidenceCollected: false,
    createsGovernedApproval: false,
    createsDiagnosticsEvidence: false,
    comparisonDesignAdequacySatisfied: false,
    diagnosticsEvidenceSatisfied: false,
    feedsGovernedDiagnosticsSufficiencySource: false,
    feedsBayesianPromotion: false,
    promotionAuthorized: false,
    allowedNextAction
  };
};

const buildReviewerOwnedSourcePackageCollection = (
  draft: AiComparisonDesignSourcePackageDraftAssembly
): AiReviewerOwnedSourcePackageCollectionPosture => {
  const draftReviewRequired =
    draft.draftAssemblyState ===
    "COMPARISON_DESIGN_SOURCE_PACKAGE_DRAFT_ASSEMBLED_REVIEW_REQUIRED";

  return {
    collectionState: draftReviewRequired
      ? "REVIEWER_OWNED_SOURCE_PACKAGE_COLLECTION_HELD_FOR_SOURCE_PACKAGE_DRAFT_REVIEW"
      : "REVIEWER_OWNED_SOURCE_PACKAGE_COLLECTION_HELD_FOR_SOURCE_PACKAGE_DRAFT",
    draftAssemblyState: draft.draftAssemblyState,
    requiredReviewerAttestations: [
      ...REVIEWER_OWNED_SOURCE_PACKAGE_REQUIRED_ATTESTATIONS
    ],
    forbiddenSourceInputs: [...COMPARISON_DESIGN_DRAFT_FORBIDDEN_SOURCE_INPUTS],
    reviewerOwnedSourcePackageSupplied: false,
    sourcePackageReviewReady: false,
    sourcePackageHashAuthorized: false,
    reviewedSourceEvidenceHashAuthorized: false,
    sourceEvidenceHashAuthorized: false,
    reviewedEvidenceManifestHashAuthorized: false,
    evidenceSatisfied: false,
    comparisonDesignAdequacySatisfied: false,
    diagnosticsEvidenceSatisfied: false,
    feedsGovernedDiagnosticsSufficiencySource: false,
    feedsBayesianPromotion: false,
    promotionAuthorized: false,
    allowedNextAction: draft.allowedNextAction
  };
};

export const applyReviewerMetricSelectionDraftIntake = (
  spine: AiContributionReportingSpineViewModel,
  selectedOutcomeMetricSelection: AiContributionReportingSelectedMetricSelectionLike | null
): AiContributionReportingSpineViewModel => {
  const selectedMetric = selectedOutcomeMetricSelection?.metrics?.[0] ?? null;
  const reviewerMetricSelectionDraftIntake = buildReviewerMetricSelectionDraftIntake({
    blueprintHypothesisRef: spine.blueprintHypothesisRef,
    candidateMetricRecommendations: spine.candidateMetricRecommendations,
    selectedOutcomeMetricSelection,
    workflowFunctionScope: spine.workflowFunctionScope
  });
  const comparisonDesignIntakeReadiness =
    buildComparisonDesignIntakeReadiness(reviewerMetricSelectionDraftIntake);
  const comparisonDesignSourcePackageDraft =
    buildComparisonDesignSourcePackageDraft(comparisonDesignIntakeReadiness);
  const reviewerOwnedSourcePackageCollection =
    buildReviewerOwnedSourcePackageCollection(comparisonDesignSourcePackageDraft);

  if (
    !selectedMetric ||
    reviewerMetricSelectionDraftIntake.draftIntakeState !==
      "DRAFT_INTAKE_PREPARED_REVIEW_REQUIRED"
  ) {
    return {
      ...spine,
      reviewerMetricSelectionDraftIntake,
      comparisonDesignIntakeReadiness,
      comparisonDesignSourcePackageDraft,
      reviewerOwnedSourcePackageCollection
    };
  }

  return {
    ...spine,
    selectedMetricApprovalState: "LOCAL_SELECTION_NOT_REVIEWER_APPROVED",
    selectedMetricPosture: {
      label: "Local selection only",
      detail:
        "Draft metric intake still needs reviewer approval before comparison-design intake.",
      metricLabel: safeContributionReportingDisplayText(
        selectedMetric.name,
        "Selected metric held for safe display review"
      )
    },
    reviewerMetricSelectionDraftIntake,
    comparisonDesignIntakeReadiness,
    comparisonDesignSourcePackageDraft,
    reviewerOwnedSourcePackageCollection
  };
};

export function buildAiContributionReportingSpineViewModel(
  input: BuildAiContributionReportingSpineViewModelInput = {}
): AiContributionReportingSpineViewModel {
  const blueprintHypothesisRef = compactText(input.blueprintHypothesisRef) || null;
  const candidateMetricRecommendations = blueprintHypothesisRef
    ? buildRecommendations(input.questionMetricBridge, input.metricLibraryRef)
    : [];
  const selectedMetrics = input.selectedOutcomeMetricSelection?.metrics ?? [];
  const workflowFunctionScope = compactText(
    input.workflowFunctionScope,
    "Workflow scope pending"
  );
  const reviewerMetricSelectionDraftIntake = buildReviewerMetricSelectionDraftIntake({
    blueprintHypothesisRef,
    candidateMetricRecommendations,
    selectedOutcomeMetricSelection: input.selectedOutcomeMetricSelection,
    workflowFunctionScope
  });
  const comparisonDesignIntakeReadiness =
    buildComparisonDesignIntakeReadiness(reviewerMetricSelectionDraftIntake);
  const comparisonDesignSourcePackageDraft =
    buildComparisonDesignSourcePackageDraft(comparisonDesignIntakeReadiness);
  const reviewerOwnedSourcePackageCollection =
    buildReviewerOwnedSourcePackageCollection(comparisonDesignSourcePackageDraft);
  const hasPreparedDraftSelection =
    selectedMetrics.length > 0 &&
    reviewerMetricSelectionDraftIntake.draftIntakeState ===
      "DRAFT_INTAKE_PREPARED_REVIEW_REQUIRED";
  const selectedMetricPosture: AiContributionReportingSelectedMetricPosture = hasPreparedDraftSelection
    ? {
        label: "Local selection only",
        detail:
          "Browser-local metric choice still needs reviewer approval before comparison-design intake.",
        metricLabel: safeContributionReportingDisplayText(
          selectedMetrics[0]?.name,
          "Selected metric held for safe display review"
        )
      }
    : {
        label: "Held for reviewer approval",
        detail:
          "Reviewer approval is required before a selected metric can become comparison-design input.",
        metricLabel: "No reviewer-approved selected metric"
      };

  const evidenceGapList = blueprintHypothesisRef
    ? candidateMetricRecommendations.length > 0
      ? [
          "missing_reviewer_metric_approval",
          "missing_milestone_reconciliation",
          "missing_said_evidence_refs",
          "missing_unsaid_behavioral_evidence_refs",
          "missing_outcome_measurement_cell_refs",
          "missing_comparison_design_source_package"
        ]
      : ["missing_metric_library_refs"]
    : ["missing_blueprint_hypothesis_ref"];
  const allowedNextEvidenceAction = !blueprintHypothesisRef
    ? "clarify_blueprint_hypothesis"
    : candidateMetricRecommendations.length === 0
      ? "supply_metric_library_refs"
      : "complete_reviewer_metric_selection_approval";

  return {
    reportingSpineState: !blueprintHypothesisRef
      ? "HOLD_FOR_BLUEPRINT_HYPOTHESIS"
      : candidateMetricRecommendations.length === 0
        ? "HOLD_FOR_METRIC_LIBRARY_REFS"
        : "AI_CONTRIBUTION_REPORTING_SPINE_READY_WITH_EVIDENCE_GAPS",
    statusLabel: !blueprintHypothesisRef
      ? "Needs Blueprint hypothesis"
      : candidateMetricRecommendations.length === 0
        ? "Needs metric library refs"
        : "Evidence gaps remain",
    statusTone: "warn",
    blueprintHypothesisRef,
    workflowFunctionScope,
    valueRouteLabel: compactText(input.valueRouteLabel, "Value route pending"),
    candidateMetricRecommendationState:
      candidateMetricRecommendations.length > 0
        ? "CANDIDATE_RECOMMENDATIONS_ONLY_NOT_EVIDENCE"
        : "HELD_NOT_RECOMMENDED",
    candidateMetricRecommendations,
    recommendationsCreateEvidence: false,
    recommendationsAreSelectedMetrics: false,
    selectedMetricApproved: false,
    selectedMetricApprovalState: hasPreparedDraftSelection
      ? "LOCAL_SELECTION_NOT_REVIEWER_APPROVED"
      : "HOLD_FOR_REVIEWER_APPROVAL",
    selectedMetricPosture,
    reviewerMetricSelectionDraftIntake,
    comparisonDesignIntakeReadiness,
    comparisonDesignSourcePackageDraft,
    reviewerOwnedSourcePackageCollection,
    milestonePlan: {
      scheduleState: "HOLD_FOR_MILESTONE_WINDOW_REVIEW",
      requiredMilestones: [...REQUIRED_CONTRIBUTION_REPORTING_MILESTONES],
      milestonesArePlanningOnly: true
    },
    measurementReadinessState: "HELD_FOR_MISSING_MILESTONE_WINDOWS",
    evidenceAlignmentState: "NOT_READY",
    evidenceGapList,
    allowedNextEvidenceAction,
    allowedNextStep: blueprintHypothesisRef
      ? "complete_missing_evidence_alignment_inputs"
      : "hold_for_reviewer_evidence_collection",
    modelReviewInputPosture: "MODEL_REVIEW_INPUT_HELD_FOR_EVIDENCE_GAPS",
    modelEligibilityStatus: blueprintHypothesisRef
      ? "HELD_FOR_EVIDENCE_GAPS"
      : "NOT_ELIGIBLE_FOR_MODEL_REVIEW",
    bayesianChainState: {
      currentState: "HOLD_FOR_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE",
      allowedNextStep: "complete_governed_diagnostics_sufficiency_evidence_source",
      changedByThisSpine: false
    },
    diagnosticsEvidenceSatisfied: false,
    promotionAuthorized: false,
    customerPublishable: false,
    blockedOutputs: { ...CONTRIBUTION_REPORTING_BLOCKED_OUTPUTS }
  };
}
