/**
 * AI Value Engine - Value Hypothesis Readiness Packet Runner.
 *
 * Internal packet assembler for the governed readiness object. It turns aligned
 * planning, evidence, metric, assumption, and governance context into one
 * review packet. It does not persist, create routes/UI, calculate ROI, emit a
 * confidence percentage, prove causality, or create financial output.
 */

import {
  type BuildValueHypothesisReadinessOptions,
  type ValueHypothesisReadiness,
  buildValueHypothesisReadinessFromMeasurementPlanAndClaimSnapshot,
  validateValueHypothesisReadiness
} from "./valueHypothesisReadiness";
import { validateMeasurementCell } from "./measurementCell";

export const AI_VALUE_HYPOTHESIS_READINESS_PACKET_SCHEMA_VERSION =
  "FT_AI_VALUE_HYPOTHESIS_READINESS_PACKET_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_HYPOTHESIS_READINESS_PACKET_VALIDATION_2026_06";

const DERIVATION_VERSION =
  "ai_value_hypothesis_readiness_packet_runner_2026_06";

const REQUIRED_FIELDS = [
  "schema_version",
  "packet_id",
  "packet_type",
  "org_id",
  "measurement_plan_id",
  "claim_readiness_snapshot_id",
  "evidence_snapshot_id",
  "workflow",
  "window",
  "review_flow",
  "evidence_sources",
  "readiness",
  "readiness_state",
  "contribution_evidence_tier",
  "missing_evidence",
  "allowed_next_actions",
  "required_caveats",
  "blocked_claims",
  "blocked_uses",
  "review_boundaries",
  "source_refs",
  "source_provenance",
  "derived_from",
  "validation",
  "persistence_policy",
  "created_at",
  "derivation_version"
] as const;

const ALLOWED_NEXT_ACTIONS = new Set([
  "hold",
  "collect_missing_aggregate_evidence",
  "glean_review",
  "business_owner_review",
  "prepare_finance_context_investigation_packet"
]);

const REQUIRED_FALSE_BOUNDARY_FLAGS = [
  "customer_facing_output_allowed",
  "financial_output_allowed",
  "roi_proof_allowed",
  "causality_claim_allowed",
  "productivity_claim_allowed",
  "ebita_claim_allowed",
  "headcount_reduction_claim_allowed",
  "team_or_manager_ranking_allowed"
];

const REQUIRED_FALSE_PERSISTENCE_FIELDS = [
  "persisted",
  "creates_migrations",
  "creates_prisma_schema",
  "creates_backend_routes",
  "creates_frontend_ui",
  "creates_ingestion_jobs"
];

const FORBIDDEN_FIELD_KEY_PATTERNS = [
  /confidence_percent/i,
  /ai_contribution_confidence/i,
  /attribution_probability/i,
  /probability/i,
  /confidence_score/i,
  /confidence_adjusted_roi/i,
  /finance_ready/i,
  /formula_template/i,
  /coefficient/i,
  /weights?/i,
  /threshold/i,
  /new_suppression_reason/i,
  /roi_(?:value|amount|calculation|result)/i,
  /ebita_(?:value|amount|impact|calculation|result)/i,
  /ebitda_(?:value|amount|impact|calculation|result)/i,
  /dollar(?:ized)?_(?:value|amount|impact|output)/i,
  /hours?_saved/i,
  /time_saved_(?:value|amount|impact)/i,
  /productivity_lift/i,
  /financial_impact/i,
  /causal(?:ity)?_(?:delta|effect|proof|probability)/i,
  /raw_(?:prompt|response|transcript|content|rows?)/i,
  /prompt/i,
  /response/i,
  /transcript/i,
  /query_text/i,
  /sql_text/i,
  /file_content/i,
  /email/i,
  /user_id/i,
  /employee_id/i,
  /person_(?:id|identifier)/i,
  /hashed_(?:user|person|employee)_id/i,
  /joinable_(?:user|person|employee)_identifier/i,
  /person_level_hris/i,
  /person_level_productivity/i,
  /manager_ranking/i,
  /team_ranking/i
];

const GOVERNED_KEY_ALLOWLIST = new Set([
  "review_boundaries",
  "roi_proof_allowed",
  "causality_claim_allowed",
  "productivity_claim_allowed",
  "ebita_claim_allowed",
  "headcount_reduction_claim_allowed",
  "team_or_manager_ranking_allowed",
  "financial_output_allowed",
  "customer_facing_output_allowed",
  "source_refs",
  "source_provenance",
  "roi_bot_context",
  "emits_probability",
  "emits_causality",
  "pull_date",
  "blocked_claims",
  "blocked_uses",
  "no_customer_facing_financial_output",
  "no_confidence_percent"
]);

export interface SelectedMetricMovementInput {
  metric_id: string;
  state: "missing" | "held" | "present";
  baseline_window?: { start: string | null; end: string | null };
  comparison_window?: { start: string | null; end: string | null };
  source_ref?: string | null;
  owner_role?: string | null;
  expected_direction?: string | null;
  observed_direction?: string | null;
}

export interface RoiBotContextInput {
  present: boolean;
  scenario_context_only?: boolean;
  source_tags?: string[];
  pull_date?: string;
  assumptions_owner_role?: string;
  owner_approval_state?: "missing" | "submitted" | "approved" | "rejected" | "held";
}

export interface BuildValueHypothesisReadinessPacketInput {
  packetId?: string;
  generatedAt?: string;
  measurementPlan: any;
  claimReadinessSnapshot: any;
  selectedMetricMovement?: SelectedMetricMovementInput;
  measurementCell?: any;
  roiBotContext?: RoiBotContextInput;
  comparisonDesignState?: BuildValueHypothesisReadinessOptions["comparisonDesignState"];
}

export interface ValueHypothesisReadinessPacketValidationResult {
  schema_version: string;
  packet_id: string | null;
  org_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    glean_review: boolean;
    business_owner_review: boolean;
    finance_context_investigation: boolean;
    customer_facing_output: boolean;
    financial_output: boolean;
  };
}

export interface ValueHypothesisReadinessPacket {
  schema_version: string;
  packet_id: string;
  packet_type: "VALUE_HYPOTHESIS_READINESS_PACKET";
  org_id: string;
  measurement_plan_id: string;
  claim_readiness_snapshot_id: string;
  evidence_snapshot_id: string;
  workflow: any;
  window: any;
  review_flow: {
    current_review_label: string;
    review_sequence: string[];
    review_modes: string[];
  };
  evidence_sources: any;
  readiness: ValueHypothesisReadiness;
  readiness_state: string;
  contribution_evidence_tier: string;
  missing_evidence: string[];
  allowed_next_actions: string[];
  required_caveats: string[];
  blocked_claims: string[];
  blocked_uses: string[];
  review_boundaries: any;
  source_refs: any;
  source_provenance: any;
  derived_from: any;
  validation: any;
  persistence_policy: {
    persisted: boolean;
    creates_migrations: boolean;
    creates_prisma_schema: boolean;
    creates_backend_routes: boolean;
    creates_frontend_ui: boolean;
    creates_ingestion_jobs: boolean;
  };
  created_at: string;
  derivation_version: string;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function stringsOf(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function safeIdPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function requireField(value: any, path: string, gaps: string[]): void {
  if (value === undefined || value === null || value === "") {
    gaps.push(`${path} is missing`);
  }
}

function requireArray(value: any, path: string, gaps: string[]): void {
  if (!Array.isArray(value)) {
    gaps.push(`${path} must be an array`);
  }
}

function requireFalse(value: any, path: string, gaps: string[]): void {
  if (value !== false) {
    gaps.push(`${path} must be false`);
  }
}

function primaryMetricId(plan: any): string | null {
  return plan?.metric_selection?.primary_metric?.metric_id ?? null;
}

function expectedBaselineWindow(plan: any): { start: string | null; end: string | null } {
  return {
    start: plan?.windows?.baseline_window_start ?? null,
    end: plan?.windows?.baseline_window_end ?? null
  };
}

function expectedComparisonWindow(plan: any): { start: string | null; end: string | null } {
  return {
    start: plan?.windows?.comparison_window_start ?? null,
    end: plan?.windows?.comparison_window_end ?? null
  };
}

function windowsEqual(left: any, right: any): boolean {
  return (left?.start ?? null) === (right?.start ?? null) &&
    (left?.end ?? null) === (right?.end ?? null);
}

function sourceRefExists(sourceRefs: any, expected: string | null | undefined): boolean {
  if (!expected) return true;
  if (!sourceRefs || typeof sourceRefs !== "object") return false;
  if (Array.isArray(sourceRefs)) {
    return sourceRefs.some((item) => sourceRefExists(item, expected));
  }
  return Object.values(sourceRefs).some((value) => {
    if (String(value) === expected) return true;
    if (Array.isArray(value)) return value.some((item) => String(item) === expected);
    if (value && typeof value === "object") return sourceRefExists(value, expected);
    return false;
  });
}

function measurementCellBaselineWindow(cell: any): { start: string | null; end: string | null } {
  return {
    start: cell?.time_window?.baseline_window?.window_start ?? null,
    end: cell?.time_window?.baseline_window?.window_end ?? null
  };
}

function measurementCellComparisonWindow(cell: any): { start: string | null; end: string | null } {
  return {
    start: cell?.time_window?.comparison_window?.window_start ?? null,
    end: cell?.time_window?.comparison_window?.window_end ?? null
  };
}

function measurementCellDesignState(
  cell: any
): BuildValueHypothesisReadinessOptions["comparisonDesignState"] {
  switch (cell?.evidence_design?.design_type) {
    case "matched_comparison":
    case "staggered_rollout":
      return "matched_comparison_candidate";
    case "controlled_test":
      return "experimental_holdout_documented";
    case "calibrated_historical_model":
      return "customer_owned_research_design_candidate";
    case "pre_post":
    case "repeated_pre_post":
      return "pre_post";
    case "baseline_only":
      return "baseline_only";
    default:
      return "none";
  }
}

function measurementCellHasSuppression(cell: any): boolean {
  return cell?.governance?.suppression_state === "SUPPRESSED" ||
    cell?.ai_fluency_context?.suppression_state === "SUPPRESSED" ||
    cell?.vbd_context?.suppression_state === "SUPPRESSED" ||
    cell?.selected_metric?.suppression_state === "SUPPRESSED";
}

function assertMeasurementCellAligns(
  plan: any,
  claimSnapshot: any,
  measurementCell: any
): void {
  const planWorkflowId = plan?.workflow_scope?.workflow_id ?? null;
  const snapshotWorkflowId = claimSnapshot?.workflow?.workflow_id ?? null;
  const expectedWorkflowId = planWorkflowId ?? snapshotWorkflowId;
  const planCohortKey = plan?.workflow_scope?.cohort_key ?? null;
  const snapshotCohortKey = claimSnapshot?.workflow?.cohort_key ?? null;
  const expectedCohortKey = planCohortKey ?? snapshotCohortKey;

  if (
    measurementCell.function_area !==
    (plan?.workflow_scope?.function_area ?? null)
  ) {
    throw new Error("Measurement Cell function_area must match measurement plan function_area");
  }
  if (measurementCell.workflow_family !== plan?.workflow_scope?.workflow_family) {
    throw new Error(
      "Measurement Cell workflow_family must match measurement plan workflow_family"
    );
  }
  if (
    expectedWorkflowId &&
    measurementCell.workflow_id !== expectedWorkflowId
  ) {
    throw new Error("Measurement Cell workflow_id must match measurement plan workflow_id");
  }
  if (
    expectedCohortKey &&
    measurementCell.cohort_key !== expectedCohortKey
  ) {
    throw new Error("Measurement Cell cohort_key must match measurement plan cohort_key");
  }
  if (measurementCell.selected_metric?.metric_id !== primaryMetricId(plan)) {
    throw new Error("Measurement Cell selected_metric.metric_id must match measurement plan primary metric");
  }
  if (!windowsEqual(measurementCellBaselineWindow(measurementCell), expectedBaselineWindow(plan)) ||
      !windowsEqual(measurementCellComparisonWindow(measurementCell), expectedComparisonWindow(plan))) {
    throw new Error("Measurement Cell windows must align to measurement plan windows");
  }
  if (!sourceRefExists(claimSnapshot?.source_refs, measurementCell.selected_metric?.source_ref)) {
    throw new Error("Measurement Cell selected_metric.source_ref must be present in claim snapshot source_refs");
  }
  if (!sourceRefExists(claimSnapshot?.source_refs, measurementCell.vbd_context?.source_ref)) {
    throw new Error("Measurement Cell vbd_context.source_ref must be present in claim snapshot source_refs");
  }
  if (!sourceRefExists(claimSnapshot?.source_refs, measurementCell.ai_fluency_context?.source_ref)) {
    throw new Error("Measurement Cell ai_fluency_context.source_ref must be present in claim snapshot source_refs");
  }
}

function comparisonDesignRequiresMeasurementCellForFinanceContext(
  comparisonDesignState: string | null | undefined
): boolean {
  return [
    "pre_post",
    "matched_comparison_candidate",
    "customer_owned_research_design_candidate",
    "experimental_holdout_documented"
  ].includes(String(comparisonDesignState));
}

function measurementCellRequiredForFinanceContext(
  measurementCellContext: {
    selectedMetricMovement?: SelectedMetricMovementInput;
    comparisonDesignState?: BuildValueHypothesisReadinessOptions["comparisonDesignState"];
    validated: boolean;
    assumptionOwnerApproved: boolean;
  },
  selectedMetricMovement?: SelectedMetricMovementInput,
  comparisonDesignState?: BuildValueHypothesisReadinessOptions["comparisonDesignState"]
): boolean {
  if (measurementCellContext.assumptionOwnerApproved) return false;
  if (measurementCellContext.validated) return true;
  return selectedMetricMovement?.state === "present" &&
    comparisonDesignRequiresMeasurementCellForFinanceContext(comparisonDesignState);
}

function normalizeMeasurementCellInput(
  plan: any,
  claimSnapshot: any,
  measurementCell?: any
): {
  selectedMetricMovement?: SelectedMetricMovementInput;
  comparisonDesignState?: BuildValueHypothesisReadinessOptions["comparisonDesignState"];
  evidenceSource?: any;
  missingEvidence: string[];
  validated: boolean;
  assumptionOwnerApproved: boolean;
} {
  if (!measurementCell) {
    return {
      missingEvidence: [],
      validated: false,
      assumptionOwnerApproved: false
    };
  }

  if (measurementCell.org_id !== plan?.org_id) {
    throw new Error("Measurement Cell org_id must match measurement plan org_id");
  }
  const cellValidation = validateMeasurementCell(measurementCell);
  if (!cellValidation.valid) {
    throw new Error(
      `Measurement Cell is invalid and cannot build packet: ${cellValidation.gaps.join("; ")}`
    );
  }
  assertMeasurementCellAligns(plan, claimSnapshot, measurementCell);

  const metricMovementHeld = measurementCellHasSuppression(measurementCell) ||
    cellValidation.feeds.value_hypothesis_readiness_input !== true ||
    measurementCell.metric_movement?.movement_state !== "present";
  const financeContextHeld =
    cellValidation.feeds.finance_context_investigation_planning !== true;
  const selectedMetricMovement: SelectedMetricMovementInput = {
    metric_id: String(measurementCell.selected_metric.metric_id),
    state: metricMovementHeld ? "held" : "present",
    baseline_window: measurementCellBaselineWindow(measurementCell),
    comparison_window: measurementCellComparisonWindow(measurementCell),
    source_ref: measurementCell.selected_metric.source_ref ?? null,
    owner_role:
      measurementCell.blueprint_alignment?.owner_role ??
      measurementCell.selected_metric?.owner_role ??
      null,
    expected_direction:
      measurementCell.metric_movement?.expected_direction ??
      measurementCell.selected_metric?.metric_direction ??
      null,
    observed_direction:
      measurementCell.metric_movement?.moved_in_expected_direction === true
        ? "moved_in_expected_direction"
        : measurementCell.metric_movement?.moved_in_expected_direction === false
          ? "did_not_move_in_expected_direction"
          : "unknown"
  };

  return {
    selectedMetricMovement,
    comparisonDesignState: metricMovementHeld
      ? "pre_post"
      : measurementCellDesignState(measurementCell),
    evidenceSource: {
      state: financeContextHeld ? "held" : "present",
      measurement_cell_id: measurementCell.measurement_cell_id,
      source_bound: true,
      feeds_value_hypothesis_readiness:
        cellValidation.feeds.value_hypothesis_readiness_input === true,
      feeds_finance_context_investigation:
        cellValidation.feeds.finance_context_investigation_planning === true,
      design_type: measurementCell.evidence_design?.design_type ?? null,
      token_usage_role: "spend_or_intensity_context_only",
      yield_role: "review_context_only",
      source_refs: deepClone(measurementCell.source_refs ?? {})
    },
    missingEvidence: metricMovementHeld || financeContextHeld
      ? ["MEASUREMENT_CELL_HELD_OR_SUPPRESSED"]
      : [],
    validated: true,
    assumptionOwnerApproved:
      cellValidation.feeds.finance_context_investigation_planning === true
  };
}

function validateMetricMovementInput(
  plan: any,
  claimSnapshot: any,
  selectedMetricMovement?: SelectedMetricMovementInput
): void {
  if (!selectedMetricMovement) return;
  if (selectedMetricMovement.metric_id !== primaryMetricId(plan)) {
    throw new Error("selectedMetricMovement.metric_id must match measurement plan primary metric");
  }
  if (selectedMetricMovement.state === "present" && !selectedMetricMovement.owner_role) {
    throw new Error("selectedMetricMovement.owner_role is required when metric movement is present");
  }
  if (selectedMetricMovement.state === "present" && !selectedMetricMovement.source_ref) {
    throw new Error("selectedMetricMovement.source_ref is required when metric movement is present");
  }
  if (!windowsEqual(selectedMetricMovement.baseline_window, expectedBaselineWindow(plan)) ||
      !windowsEqual(selectedMetricMovement.comparison_window, expectedComparisonWindow(plan))) {
    throw new Error("selectedMetricMovement windows must align to measurement plan windows");
  }
  if (!sourceRefExists(claimSnapshot?.source_refs, selectedMetricMovement.source_ref)) {
    throw new Error("selectedMetricMovement.source_ref must be present in claim snapshot source_refs");
  }
}

function normalizedRoiBotContext(roiBotContext?: RoiBotContextInput): any {
  if (!roiBotContext) {
    return {
      present: false,
      scenario_context_only: true
    };
  }
  return {
    ...deepClone(roiBotContext),
    scenario_context_only: true
  };
}

function assertRoiBotContextIsSafe(roiBotContext?: RoiBotContextInput): void {
  if (!roiBotContext) return;
  if (roiBotContext.scenario_context_only === false) {
    throw new Error("roiBotContext.scenario_context_only must be true");
  }
  const forbidden = Array.from(collectForbiddenFields(roiBotContext)).sort();
  if (forbidden.length > 0) {
    throw new Error(`roiBotContext contains forbidden field(s): ${forbidden.join(", ")}`);
  }
  const serialized = JSON.stringify(roiBotContext);
  if (/\bproved\b|\bcaused\b|\battributed\b|\bROI\b|\bsavings\b|\bpayback\b|\bEBITDA impact\b|\bprobability\b|\bconfidence\s*%/i.test(serialized)) {
    throw new Error("roiBotContext contains unsafe value, probability, or financial-proof language");
  }
}

function currentReviewLabel(state: string): string {
  if (state === "SUPPRESSED" || state === "NOT_READY") return "Hold";
  if (state === "BUSINESS_OWNER_REVIEW_READY") return "Business-owner review";
  if (state === "FINANCE_CONTEXT_INVESTIGATION_READY") return "Finance-context review";
  return "Glean review";
}

function nextActionsForReadiness(readiness: ValueHypothesisReadiness): string[] {
  if (readiness.readiness_state === "SUPPRESSED" || readiness.readiness_state === "NOT_READY") {
    return ["hold", "collect_missing_aggregate_evidence"];
  }
  const actions = ["glean_review"];
  if (readiness.allowed_review_modes.includes("business_owner_value_hypothesis_review")) {
    actions.push("business_owner_review");
  }
  if (readiness.allowed_review_modes.includes("finance_context_investigation_packet")) {
    actions.push("prepare_finance_context_investigation_packet");
  }
  return actions;
}

function evidenceSourcesOf(
  measurementPlan: any,
  readiness: ValueHypothesisReadiness,
  selectedMetricMovement?: SelectedMetricMovementInput,
  roiBotContext?: RoiBotContextInput,
  measurementCellEvidenceSource?: any
): any {
  return {
    blueprint: {
      state: "present",
      source_ref: measurementPlan.measurement_plan_id,
      owner_role: measurementPlan.value_hypothesis?.owner_role ?? null
    },
    ai_fluency: {
      state: readiness.factors.ai_fluency_movement.state,
      role: "human_readiness_context_only",
      source_bound: true
    },
    vbd_token_context: {
      state: readiness.factors.vbd_movement.state,
      role: "workflow_integration_and_token_intensity_context_only",
      token_usage_role: "spend_or_intensity_context_only",
      source_bound: true
    },
    selected_metric_movement: {
      state: selectedMetricMovement?.state ?? "missing",
      metric_id: primaryMetricId(measurementPlan),
      source_ref: selectedMetricMovement?.source_ref ?? null,
      owner_role: selectedMetricMovement?.owner_role ?? null,
      window_aligned: readiness.factors.metric_movement.window_aligned,
      customer_owned_or_approved: true
    },
    roi_assumptions: {
      state: roiBotContext?.owner_approval_state === "approved" ? "present" : "held",
      ...normalizedRoiBotContext(roiBotContext)
    },
    governance: {
      state: readiness.factors.governance_clearance.state,
      hard_gate: true
    },
    ...(measurementCellEvidenceSource
      ? { measurement_cell: measurementCellEvidenceSource }
      : {})
  };
}

export function buildValueHypothesisReadinessPacket(
  input: BuildValueHypothesisReadinessPacketInput
): ValueHypothesisReadinessPacket {
  assertRoiBotContextIsSafe(input.roiBotContext);
  const measurementCellContext = normalizeMeasurementCellInput(
    input.measurementPlan,
    input.claimReadinessSnapshot,
    input.measurementCell
  );
  const selectedMetricMovement =
    measurementCellContext.selectedMetricMovement ?? input.selectedMetricMovement;
  const comparisonDesignState =
    measurementCellContext.comparisonDesignState ?? input.comparisonDesignState;
  validateMetricMovementInput(
    input.measurementPlan,
    input.claimReadinessSnapshot,
    selectedMetricMovement
  );
  const roiBotContext = normalizedRoiBotContext(input.roiBotContext);
  const readiness = buildValueHypothesisReadinessFromMeasurementPlanAndClaimSnapshot(
    input.measurementPlan,
    input.claimReadinessSnapshot,
    {
      valueHypothesisReadinessId: `${input.packetId ?? "value_hypothesis_readiness_packet"}_readiness`,
      createdAt: input.generatedAt,
      metricMovementState: selectedMetricMovement?.state ?? "missing",
      assumptionOwnerApproved: measurementCellContext.assumptionOwnerApproved,
      comparisonDesignState,
      roiBotContext
    }
  );
  const readinessValidation = validateValueHypothesisReadiness(readiness);
  if (!readinessValidation.valid) {
    throw new Error(
      `Value Hypothesis Readiness is invalid and cannot build packet: ${readinessValidation.gaps.join("; ")}`
    );
  }
  if (readiness.quality_gates.source_binding_validated !== true) {
    throw new Error("Value Hypothesis Readiness source binding must be validated before packet assembly");
  }
  const packet: ValueHypothesisReadinessPacket = {
    schema_version: AI_VALUE_HYPOTHESIS_READINESS_PACKET_SCHEMA_VERSION,
    packet_id: input.packetId ??
      `value_hypothesis_readiness_packet_${safeIdPart(readiness.value_hypothesis_readiness_id)}`,
    packet_type: "VALUE_HYPOTHESIS_READINESS_PACKET",
    org_id: readiness.org_id,
    measurement_plan_id: readiness.measurement_plan_id,
    claim_readiness_snapshot_id: readiness.claim_readiness_snapshot_id,
    evidence_snapshot_id: readiness.evidence_snapshot_id,
    workflow: deepClone(readiness.workflow),
    window: deepClone(readiness.window),
    review_flow: {
      current_review_label: currentReviewLabel(readiness.readiness_state),
      review_sequence: [
        "Glean review",
        "Business-owner review",
        "Finance-context review",
        "Retest decision"
      ],
      review_modes: [...readiness.allowed_review_modes]
    },
    evidence_sources: evidenceSourcesOf(
      input.measurementPlan,
      readiness,
      selectedMetricMovement,
      input.roiBotContext,
      measurementCellContext.evidenceSource
    ),
    readiness,
    readiness_state: readiness.readiness_state,
    contribution_evidence_tier: readiness.contribution_evidence_tier,
    missing_evidence: uniqueStrings([
      ...readiness.holds,
      ...measurementCellContext.missingEvidence,
      ...(measurementCellRequiredForFinanceContext(
        measurementCellContext,
        selectedMetricMovement,
        readiness.factors.comparison_design_strength.state
      )
        ? ["MEASUREMENT_CELL_REQUIRED_FOR_FINANCE_CONTEXT"]
        : [])
    ]),
    allowed_next_actions: nextActionsForReadiness(readiness),
    required_caveats: [...readiness.required_caveats],
    blocked_claims: [...readiness.blocked_claims],
    blocked_uses: [...readiness.blocked_uses],
    review_boundaries: deepClone(readiness.review_boundaries),
    source_refs: deepClone(readiness.source_refs),
    source_provenance: deepClone(readiness.source_provenance),
    derived_from: {
      measurement_plan_id: readiness.measurement_plan_id,
      claim_readiness_snapshot_id: readiness.claim_readiness_snapshot_id,
      value_hypothesis_readiness_id: readiness.value_hypothesis_readiness_id,
      runner: DERIVATION_VERSION
    },
    validation: {
      value_hypothesis_readiness_validated: true,
      measurement_cell_validated: measurementCellContext.validated,
      no_confidence_percent: true,
      no_customer_facing_financial_output: true
    },
    persistence_policy: {
      persisted: false,
      creates_migrations: false,
      creates_prisma_schema: false,
      creates_backend_routes: false,
      creates_frontend_ui: false,
      creates_ingestion_jobs: false
    },
    created_at: input.generatedAt ?? new Date().toISOString(),
    derivation_version: DERIVATION_VERSION
  };
  return packet;
}

function collectTopLevelGaps(packet: any): string[] {
  const gaps: string[] = [];
  for (const field of REQUIRED_FIELDS) requireField(packet?.[field], field, gaps);
  if (
    packet?.schema_version &&
    packet.schema_version !== AI_VALUE_HYPOTHESIS_READINESS_PACKET_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${packet.schema_version}`);
  }
  if (packet?.packet_type !== "VALUE_HYPOTHESIS_READINESS_PACKET") {
    gaps.push("packet_type must be VALUE_HYPOTHESIS_READINESS_PACKET");
  }
  for (const field of [
    "missing_evidence",
    "allowed_next_actions",
    "required_caveats",
    "blocked_claims",
    "blocked_uses"
  ]) {
    requireArray(packet?.[field], field, gaps);
  }
  return gaps;
}

function collectReadinessGaps(packet: any): string[] {
  const gaps: string[] = [];
  const validation = validateValueHypothesisReadiness(packet?.readiness);
  if (!validation.valid) {
    gaps.push(...validation.gaps.map((gap) => `readiness.${gap}`));
  }
  if (packet?.readiness_state !== packet?.readiness?.readiness_state) {
    gaps.push("readiness_state must match readiness.readiness_state");
  }
  if (packet?.contribution_evidence_tier !== packet?.readiness?.contribution_evidence_tier) {
    gaps.push("contribution_evidence_tier must match readiness.contribution_evidence_tier");
  }
  return gaps;
}

function collectReviewFlowGaps(packet: any): string[] {
  const gaps: string[] = [];
  const reviewFlow = packet?.review_flow ?? {};
  requireField(reviewFlow.current_review_label, "review_flow.current_review_label", gaps);
  requireArray(reviewFlow.review_sequence, "review_flow.review_sequence", gaps);
  requireArray(reviewFlow.review_modes, "review_flow.review_modes", gaps);
  const serialized = JSON.stringify(reviewFlow);
  if (/AIOM review/i.test(serialized)) {
    gaps.push("review_flow must use Glean review, not AIOM review");
  }
  if (/Glean[-\s]approved|Glean[-\s]validated|customer[-\s]ready|finance[-\s]approved|board[-\s]ready/i.test(serialized)) {
    gaps.push("review_flow must not imply Glean, finance, customer, or board approval");
  }
  if (!stringsOf(reviewFlow.review_sequence).includes("Glean review")) {
    gaps.push("review_flow.review_sequence must include Glean review");
  }
  return gaps;
}

function collectBoundaryAndPersistenceGaps(packet: any): string[] {
  const gaps: string[] = [];
  for (const flag of REQUIRED_FALSE_BOUNDARY_FLAGS) {
    requireFalse(packet?.review_boundaries?.[flag], `review_boundaries.${flag}`, gaps);
  }
  for (const flag of REQUIRED_FALSE_PERSISTENCE_FIELDS) {
    requireFalse(packet?.persistence_policy?.[flag], `persistence_policy.${flag}`, gaps);
  }
  return gaps;
}

function collectActionGaps(packet: any): string[] {
  const gaps: string[] = [];
  for (const action of stringsOf(packet?.allowed_next_actions)) {
    if (!ALLOWED_NEXT_ACTIONS.has(action)) {
      gaps.push(`allowed_next_actions contains unsupported action ${action}`);
    }
    if (/roi|financial_output|customer_facing|causality|productivity|confidence/i.test(action)) {
      gaps.push(`allowed_next_actions contains blocked action ${action}`);
    }
  }
  if (
    packet?.readiness_state === "SUPPRESSED" &&
    stringsOf(packet?.allowed_next_actions).some((action) =>
      !["hold", "collect_missing_aggregate_evidence"].includes(action)
    )
  ) {
    gaps.push("SUPPRESSED packets must allow only hold or missing aggregate evidence collection");
  }
  return gaps;
}

function collectMeasurementCellFinanceGateGaps(packet: any): string[] {
  const gaps: string[] = [];
  const financeContextRequested =
    packet?.readiness_state === "FINANCE_CONTEXT_INVESTIGATION_READY" ||
    stringsOf(packet?.allowed_next_actions).includes(
      "prepare_finance_context_investigation_packet"
    );
  if (!financeContextRequested) return gaps;

  const measurementCell = packet?.evidence_sources?.measurement_cell;
  if (
    packet?.validation?.measurement_cell_validated !== true ||
    measurementCell?.state !== "present" ||
    measurementCell?.feeds_finance_context_investigation !== true
  ) {
    gaps.push(
      "FINANCE_CONTEXT_INVESTIGATION_READY requires Measurement Cell evidence that is validated, present, aligned, not held, not suppressed, and finance-context feeding"
    );
  }
  return gaps;
}

function fieldKeyIsForbidden(key: string): boolean {
  const normalizedKey = normalizeKey(key);
  if (GOVERNED_KEY_ALLOWLIST.has(normalizedKey)) return false;
  return FORBIDDEN_FIELD_KEY_PATTERNS.some((pattern) => pattern.test(normalizedKey));
}

function collectForbiddenFields(value: any, fields: Set<string> = new Set()): Set<string> {
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item) => collectForbiddenFields(item, fields));
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (fieldKeyIsForbidden(key)) fields.add(key);
    collectForbiddenFields(nested, fields);
  }
  return fields;
}

function collectForbiddenFieldGaps(packet: any): string[] {
  const forbidden = Array.from(collectForbiddenFields(packet)).sort();
  return forbidden.length > 0
    ? [`Forbidden field(s) present: ${forbidden.join(", ")}`]
    : [];
}

function collectSourceBindingGaps(packet: any): string[] {
  const gaps: string[] = [];
  if (packet?.org_id !== packet?.readiness?.org_id) {
    gaps.push("org_id must match readiness.org_id");
  }
  if (packet?.measurement_plan_id !== packet?.readiness?.measurement_plan_id) {
    gaps.push("measurement_plan_id must match readiness.measurement_plan_id");
  }
  if (packet?.claim_readiness_snapshot_id !== packet?.readiness?.claim_readiness_snapshot_id) {
    gaps.push("claim_readiness_snapshot_id must match readiness.claim_readiness_snapshot_id");
  }
  if (JSON.stringify(packet?.source_refs ?? {}) !== JSON.stringify(packet?.readiness?.source_refs ?? {})) {
    gaps.push("source_refs must match readiness.source_refs");
  }
  if (JSON.stringify(packet?.window ?? {}) !== JSON.stringify(packet?.readiness?.window ?? {})) {
    gaps.push("window must match readiness.window");
  }
  return gaps;
}

export function validateValueHypothesisReadinessPacket(
  packet: any
): ValueHypothesisReadinessPacketValidationResult {
  const gaps = [
    ...collectTopLevelGaps(packet),
    ...collectReadinessGaps(packet),
    ...collectReviewFlowGaps(packet),
    ...collectBoundaryAndPersistenceGaps(packet),
    ...collectActionGaps(packet),
    ...collectMeasurementCellFinanceGateGaps(packet),
    ...collectSourceBindingGaps(packet),
    ...collectForbiddenFieldGaps(packet)
  ];
  const valid = gaps.length === 0;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    packet_id: packet?.packet_id ?? null,
    org_id: packet?.org_id ?? null,
    valid,
    gaps,
    feeds: {
      glean_review: valid && stringsOf(packet?.allowed_next_actions).includes("glean_review"),
      business_owner_review:
        valid && stringsOf(packet?.allowed_next_actions).includes("business_owner_review"),
      finance_context_investigation:
        valid &&
        stringsOf(packet?.allowed_next_actions).includes(
          "prepare_finance_context_investigation_packet"
        ),
      customer_facing_output: false,
      financial_output: false
    }
  };
}
