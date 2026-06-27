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

const labelFromToken = (value: string): string =>
  value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

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

export function buildAiContributionReportingSpineViewModel(
  input: BuildAiContributionReportingSpineViewModelInput = {}
): AiContributionReportingSpineViewModel {
  const blueprintHypothesisRef = compactText(input.blueprintHypothesisRef) || null;
  const candidateMetricRecommendations = blueprintHypothesisRef
    ? buildRecommendations(input.questionMetricBridge, input.metricLibraryRef)
    : [];
  const selectedMetrics = input.selectedOutcomeMetricSelection?.metrics ?? [];
  const hasLocalSelection = selectedMetrics.length > 0;
  const selectedMetricPosture: AiContributionReportingSelectedMetricPosture = hasLocalSelection
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
    workflowFunctionScope: compactText(input.workflowFunctionScope, "Workflow scope pending"),
    valueRouteLabel: compactText(input.valueRouteLabel, "Value route pending"),
    candidateMetricRecommendationState:
      candidateMetricRecommendations.length > 0
        ? "CANDIDATE_RECOMMENDATIONS_ONLY_NOT_EVIDENCE"
        : "HELD_NOT_RECOMMENDED",
    candidateMetricRecommendations,
    recommendationsCreateEvidence: false,
    recommendationsAreSelectedMetrics: false,
    selectedMetricApproved: false,
    selectedMetricApprovalState: hasLocalSelection
      ? "LOCAL_SELECTION_NOT_REVIEWER_APPROVED"
      : "HOLD_FOR_REVIEWER_APPROVAL",
    selectedMetricPosture,
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
