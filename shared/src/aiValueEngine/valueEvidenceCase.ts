/**
 * AI Value Engine — Value Evidence Case.
 *
 * Assembles the governed proof object for one workflow slice: client context,
 * AI Fluency summary, VBD state under the amended canon, the selected function
 * outcome metric, data-boundary status, outcome evidence review state,
 * baseline/comparison windows, customer-owned assumptions, evidence quality,
 * safe value language, scenario posture, sponsor decision, and the next
 * intervention/retest action. It answers "what can we safely say, what
 * supports it, what stays blocked, and what should the client do next" — it
 * does not calculate ROI, prove causality, score people, or rank teams.
 */

const RESULT_SCHEMA_VERSION = "FT_AI_VALUE_EVIDENCE_CASE_VALIDATION_2026_06";
export const VALUE_EVIDENCE_CASE_SCHEMA_VERSION = "FT_AI_VALUE_EVIDENCE_CASE_2026_06";

// Amended 2026-06-11 with human approval: Depth means workflow-integration
// embeddedness; the tool/surface repertoire view lives under Breadth.
const CANONICAL_VBD_DEFINITIONS: Record<string, string> = {
  velocity: "speed_to_adoption",
  breadth: "spread_across_org_functions_workflows_surfaces",
  depth: "workflow_integration_embeddedness"
};

const ALLOWED_VALUE_ROUTES = new Set([
  "COST_REDUCTION",
  "CAPACITY_CREATION",
  "QUALITY_IMPROVEMENT",
  "RISK_REDUCTION",
  "EXPERIENCE_IMPROVEMENT",
  "REVENUE_EXPANSION",
  "UNCLASSIFIED"
]);

const ALLOWED_DIRECTIONS = new Set(["IMPROVE", "REDUCE", "MAINTAIN"]);
const ALLOWED_FLUENCY = new Set(["READY", "MIXED", "LOW", "UNKNOWN"]);
const ALLOWED_VELOCITY = new Set(["INCREASING", "STALLING", "DECLINING", "UNKNOWN"]);
const ALLOWED_BREADTH = new Set(["EXPANDING", "LIMITED", "NARROWING", "UNKNOWN"]);
const ALLOWED_DEPTH = new Set(["DEEPENING", "SHALLOW", "FRAGMENTED", "UNKNOWN"]);

const ALLOWED_REVIEW_STATES = new Set([
  "ACCEPTED",
  "SUBMITTED",
  "CAVEATED",
  "MISSING",
  "REJECTED"
]);

const ALLOWED_WINDOW_ALIGNMENT = new Set(["EXACT_MATCH", "MISALIGNED", "MISSING"]);
const ALLOWED_ASSUMPTION_STATES = new Set(["PRESENT", "CAVEATED", "MISSING"]);
const ALLOWED_SCENARIO_BANDS = new Set(["CONSERVATIVE", "BASE_CASE", "EXPANDED"]);

const ALLOWED_DECISION_STATES = new Set([
  "PENDING",
  "SCALE",
  "COACH",
  "REDESIGN_WORKFLOW",
  "STRENGTHEN_EVIDENCE",
  "HOLD"
]);

export const EVIDENCE_LEVELS = [
  "MISSING",
  "DIRECTIONAL",
  "CAVEATED",
  "SUPPORTED",
  "STRONG",
  "BLOCKED"
] as const;

const EVIDENCE_RANK: Record<string, number> = {
  MISSING: 0,
  DIRECTIONAL: 1,
  CAVEATED: 2,
  SUPPORTED: 3,
  STRONG: 4
};

const CLAIM_LEVELS = [
  "OBSERVED_AI_ACTIVITY_ONLY",
  "INTERNAL_HYPOTHESIS_ONLY",
  "CAVEATED_VALUE_INVESTIGATION",
  "SUPPORTED_VALUE_MOVEMENT",
  "VALIDATED_VALUE_REALIZATION",
  "BLOCKED"
] as const;

const CLAIM_RANK: Record<string, number> = {
  OBSERVED_AI_ACTIVITY_ONLY: 0,
  INTERNAL_HYPOTHESIS_ONLY: 1,
  CAVEATED_VALUE_INVESTIGATION: 2,
  SUPPORTED_VALUE_MOVEMENT: 3,
  VALIDATED_VALUE_REALIZATION: 4
};

const MAX_CLAIM_BY_EVIDENCE: Record<string, string> = {
  MISSING: "OBSERVED_AI_ACTIVITY_ONLY",
  DIRECTIONAL: "INTERNAL_HYPOTHESIS_ONLY",
  CAVEATED: "CAVEATED_VALUE_INVESTIGATION",
  SUPPORTED: "SUPPORTED_VALUE_MOVEMENT",
  STRONG: "VALIDATED_VALUE_REALIZATION",
  BLOCKED: "BLOCKED"
};

const NON_CAUSAL_CAVEAT_PATTERN = /does not prove ROI or causality/i;
const CAUSALITY_CAVEAT_PATTERN = /does not (?:prove|establish) causality/i;
const CUSTOMER_FIGURES_CAVEAT_PATTERN = /customer-(?:approved|computed|owned)/i;

// Amended 2026-06-12: claim governance is two-tier.
//
// Privacy boundaries protect people, not claims; they never relax regardless
// of how strong the evidence gets. Amended 2026-06-12: every boundary in this
// list is individual-level. The hr_analytics token means person-level HR
// analytics; aggregated, cohort-suppressed HR analytics (attrition, capacity,
// engagement by function or cohort) are permitted evidence inputs under the
// data-boundary contract, same as any other aggregate.
export const PRIVACY_BOUNDARY_CLAIMS = [
  "individual_scoring",
  "team_or_manager_ranking",
  "hr_analytics",
  "productivity_measurement"
];

// Value claims are evidence-gated, not categorically banned. Each unlocks
// when its requirements are met, so the claims the platform supports are
// backed by real customer-owned data. Until a gate opens, its claim must
// stay in blocked_claims. Even when realized-value language unlocks, the
// platform itself never computes or stores economic figures — validated
// cases reference the customer's own approved numbers.
export const EVIDENCE_GATED_CLAIMS = [
  "roi_proof",
  "realized_roi_calculation",
  "customer_facing_economic_output",
  "causality_claim"
];

export const CLAIM_UNLOCK_REQUIREMENTS: Record<string, string> = {
  roi_proof:
    "Accepted aggregate outcome evidence with exact window alignment, resolved customer-owned assumptions, and customer-approved economic inputs.",
  realized_roi_calculation:
    "The customer computes realized ROI from its own approved inputs; the case references the customer's validated figures.",
  customer_facing_economic_output:
    "Economic figures are presented only as customer-computed, customer-approved values referenced by this case.",
  causality_claim:
    "An approved baseline/comparison evidence design (control or quasi-experimental) reviewed by the customer's analytics owner."
};

function customerValidationSatisfied(validation: any): boolean {
  return Boolean(
    validation &&
      validation.economic_inputs_approved === true &&
      validation.approved_by_role &&
      validation.validation_reference
  );
}

function causalityDesignApproved(design: any): boolean {
  return Boolean(
    design?.design_state === "APPROVED_COMPARISON_DESIGN" &&
      design?.approved_by_role &&
      design?.design_reference
  );
}

function sanitizeApprovedEvidenceDesign(design: any): any | null {
  if (!causalityDesignApproved(design)) return null;
  return {
    design_state: "APPROVED_COMPARISON_DESIGN",
    design_type: String(design.design_type ?? "approved_comparison_design"),
    approved_by_role: String(design.approved_by_role),
    design_reference: String(design.design_reference)
  };
}

/**
 * Which evidence-gated claims are unlocked for this case. ROI-family claims
 * unlock at the VALIDATED rung (token STRONG) — accepted evidence, aligned
 * windows, resolved assumptions, customer-approved economic inputs.
 * Causality additionally requires an approved comparison evidence design.
 */
function deriveClaimGateStates(evidenceCase: any): Record<string, boolean> {
  const validated =
    evidenceCase?.evidence_quality?.evidence_level === "STRONG" &&
    customerValidationSatisfied(evidenceCase?.customer_validation);
  return {
    roi_proof: validated,
    realized_roi_calculation: validated,
    customer_facing_economic_output: validated,
    causality_claim: validated && causalityDesignApproved(evidenceCase?.evidence_design)
  };
}

const GOVERNANCE_BOUNDARIES = [
  "production_connector",
  "dashboard",
  "realized_roi_calculation",
  "causality_claim",
  "individual_scoring",
  "hris_or_people_analytics",
  "productivity_ranking",
  "raw_prompt_or_response_storage",
  "direct_identifiers",
  "runtime_service",
  "autonomous_customer_actions",
  "customer_facing_economic_output"
];

const FORBIDDEN_KEY_PATTERNS = [
  /(^|_)user(_|$)/i,
  /email/i,
  /employee/i,
  /manager/i,
  /person/i,
  /prompt/i,
  /(^|_)response(_|$)/i,
  /transcript/i,
  /file_content/i,
  /ticket/i,
  /raw_/i,
  /hris/i,
  /actual_roi/i,
  /realized_roi/i,
  /roi_calculation/i,
  /dollar/i,
  /currency/i,
  /savings_amount/i,
  /productivity/i,
  /causal/i
];

// These subtrees intentionally name the banned concepts in order to govern
// them (policy flags, blocked-claim lists, boundary status), so the key scan
// skips them; their values are checked by dedicated rules instead.
const FORBIDDEN_KEY_SCAN_EXEMPTIONS = new Set([
  "safe_value_language",
  "blocked_claims",
  "economic_output_policy",
  "governance_boundaries",
  "data_boundary_status"
]);

const FORBIDDEN_CLAIM_PATTERNS = [
  /prov(?:ed|es) ROI/i,
  /AI caused/i,
  /caused .*improvement/i,
  /caused productivity/i,
  /saved money/i,
  /saved \$?\d/i,
  /employee/i,
  /manager/i,
  /team .*better/i
];

export interface ValueEvidenceCaseValidationResult {
  schema_version: string;
  value_evidence_case_id: string | null;
  workflow_family: string | null;
  evidence_level: string | null;
  allowed_claim_level: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    executive_readout: boolean;
    intervention_planning: boolean;
    customer_facing_economic_output: boolean;
  };
}

export interface BuildValueEvidenceCaseInputs {
  dataBoundary: any;
  roiScenario: any;
  readiness: any;
  outcomeEvidenceExport?: any;
  improvementLoop?: any;
  /**
   * Customer sign-off on the economic inputs behind realized-value language:
   * { economic_inputs_approved: true, approved_by_role, validation_reference }.
   * With supported evidence, this lifts the case to the VALIDATED rung and
   * unlocks the ROI-family claim gates. Free-form validation statements are
   * intentionally not persisted.
   */
  customerValidation?: any;
  /** Approved comparison evidence design; required to unlock causality. */
  evidenceDesign?: any;
}

export interface BuildValueEvidenceCaseOptions {
  caseId?: string;
  windowAlignment?: string;
  sponsorDecisionState?: string;
  sponsorDecisionOwnerRole?: string;
  engagementLabel?: string;
  functionArea?: string;
}

function requireField(value: any, path: string, gaps: string[]): void {
  if (value === undefined || value === null || value === "") {
    gaps.push(`${path} is missing`);
  }
}

function requireArray(value: any, path: string, gaps: string[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    gaps.push(`${path} must include at least one item`);
  }
}

function requireEnum(value: any, allowed: Set<string>, path: string, gaps: string[]): void {
  requireField(value, path, gaps);
  if (value && !allowed.has(value)) {
    gaps.push(`${path} is invalid: ${value}`);
  }
}

function isForbiddenKey(key: string): boolean {
  return FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function collectForbiddenFields(value: any, fields: Set<string> = new Set()): Set<string> {
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item) => collectForbiddenFields(item, fields));
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_KEY_SCAN_EXEMPTIONS.has(key)) continue;
    if (isForbiddenKey(key)) fields.add(key);
    collectForbiddenFields(nested, fields);
  }
  return fields;
}

function containsUnsafeClaimLanguage(value: any): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => containsUnsafeClaimLanguage(item));
  }
  if (value && typeof value === "object") {
    return Object.values(value).some((item) => containsUnsafeClaimLanguage(item));
  }
  return FORBIDDEN_CLAIM_PATTERNS.some((pattern) => pattern.test(String(value ?? "")));
}

function collectTopLevelGaps(evidenceCase: any): string[] {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "value_evidence_case_id",
    "source_refs",
    "client_context",
    "workflow",
    "ai_fluency_summary",
    "vbd_summary",
    "outcome_metric",
    "data_boundary_status",
    "outcome_evidence_status",
    "baseline_comparison",
    "customer_owned_assumptions",
    "evidence_quality",
    "safe_value_language",
    "blocked_claims",
    "scenario_posture",
    "sponsor_decision",
    "intervention_retest",
    "economic_output_policy",
    "governance_boundaries"
  ]) {
    requireField(evidenceCase?.[field], field, gaps);
  }
  if (
    evidenceCase?.schema_version &&
    evidenceCase.schema_version !== VALUE_EVIDENCE_CASE_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${evidenceCase.schema_version}`);
  }
  return gaps;
}

function collectSourceRefGaps(evidenceCase: any): string[] {
  const gaps: string[] = [];
  const refs = evidenceCase?.source_refs ?? {};
  requireField(refs.data_boundary_contract_id, "source_refs.data_boundary_contract_id", gaps);
  requireField(refs.roi_scenario_id, "source_refs.roi_scenario_id", gaps);
  requireField(refs.readiness_id, "source_refs.readiness_id", gaps);
  return gaps;
}

function collectClientContextGaps(evidenceCase: any): string[] {
  const gaps: string[] = [];
  const context = evidenceCase?.client_context ?? {};
  requireField(context.engagement_label, "client_context.engagement_label", gaps);
  requireField(context.function_area, "client_context.function_area", gaps);
  requireField(context.sponsor_role, "client_context.sponsor_role", gaps);
  return gaps;
}

function collectWorkflowGaps(evidenceCase: any): string[] {
  const gaps: string[] = [];
  const workflow = evidenceCase?.workflow ?? {};
  requireField(workflow.workflow_family, "workflow.workflow_family", gaps);
  requireField(workflow.workflow_name, "workflow.workflow_name", gaps);
  requireField(workflow.function_area, "workflow.function_area", gaps);
  requireEnum(workflow.value_route, ALLOWED_VALUE_ROUTES, "workflow.value_route", gaps);
  return gaps;
}

function collectFluencyGaps(evidenceCase: any): string[] {
  const gaps: string[] = [];
  const fluency = evidenceCase?.ai_fluency_summary ?? {};
  requireEnum(fluency.readiness, ALLOWED_FLUENCY, "ai_fluency_summary.readiness", gaps);
  requireField(fluency.basis, "ai_fluency_summary.basis", gaps);
  if (fluency.cohort_suppression_applied !== true) {
    gaps.push("ai_fluency_summary.cohort_suppression_applied must be true");
  }
  return gaps;
}

function collectVbdGaps(evidenceCase: any): string[] {
  const gaps: string[] = [];
  const summary = evidenceCase?.vbd_summary ?? {};
  const statusSets: Record<string, Set<string>> = {
    velocity: ALLOWED_VELOCITY,
    breadth: ALLOWED_BREADTH,
    depth: ALLOWED_DEPTH
  };
  for (const dimension of ["velocity", "breadth", "depth"]) {
    const entry = summary?.[dimension] ?? {};
    if (entry.definition !== CANONICAL_VBD_DEFINITIONS[dimension]) {
      gaps.push(
        `vbd_summary.${dimension}.definition must be ${CANONICAL_VBD_DEFINITIONS[dimension]}`
      );
    }
    requireEnum(entry.status, statusSets[dimension], `vbd_summary.${dimension}.status`, gaps);
  }
  requireField(summary.summary, "vbd_summary.summary", gaps);
  return gaps;
}

function collectOutcomeMetricGaps(evidenceCase: any): string[] {
  const gaps: string[] = [];
  const metric = evidenceCase?.outcome_metric ?? {};
  for (const field of ["metric_id", "metric_name", "measurement_unit", "source_system"]) {
    requireField(metric[field], `outcome_metric.${field}`, gaps);
  }
  requireEnum(
    metric.expected_direction,
    ALLOWED_DIRECTIONS,
    "outcome_metric.expected_direction",
    gaps
  );
  return gaps;
}

function collectDataBoundaryGaps(evidenceCase: any): string[] {
  const gaps: string[] = [];
  const boundary = evidenceCase?.data_boundary_status ?? {};
  requireField(boundary.contract_id, "data_boundary_status.contract_id", gaps);
  if (boundary.aggregate_only !== true) {
    gaps.push("data_boundary_status.aggregate_only must be true");
  }
  for (const field of [
    "raw_source_rows_allowed",
    "direct_identifiers_allowed",
    "raw_content_allowed"
  ]) {
    if (boundary[field] !== false) {
      gaps.push(`data_boundary_status.${field} must be false`);
    }
  }
  return gaps;
}

function collectOutcomeEvidenceGaps(evidenceCase: any): string[] {
  const gaps: string[] = [];
  const status = evidenceCase?.outcome_evidence_status ?? {};
  requireEnum(
    status.review_state,
    ALLOWED_REVIEW_STATES,
    "outcome_evidence_status.review_state",
    gaps
  );
  requireField(status.statement, "outcome_evidence_status.statement", gaps);
  return gaps;
}

function collectBaselineComparisonGaps(evidenceCase: any): string[] {
  const gaps: string[] = [];
  const windows = evidenceCase?.baseline_comparison ?? {};
  requireEnum(
    windows.window_alignment,
    ALLOWED_WINDOW_ALIGNMENT,
    "baseline_comparison.window_alignment",
    gaps
  );
  if (windows.window_alignment === "EXACT_MATCH") {
    requireField(windows.baseline_window, "baseline_comparison.baseline_window", gaps);
    requireField(windows.comparison_window, "baseline_comparison.comparison_window", gaps);
  }
  return gaps;
}

function collectAssumptionGaps(evidenceCase: any): string[] {
  const gaps: string[] = [];
  requireArray(evidenceCase?.customer_owned_assumptions, "customer_owned_assumptions", gaps);
  if (Array.isArray(evidenceCase?.customer_owned_assumptions)) {
    evidenceCase.customer_owned_assumptions.forEach((assumption: any, index: number) => {
      requireField(
        assumption?.assumption_id,
        `customer_owned_assumptions[${index}].assumption_id`,
        gaps
      );
      requireField(assumption?.owner, `customer_owned_assumptions[${index}].owner`, gaps);
      requireEnum(
        assumption?.state,
        ALLOWED_ASSUMPTION_STATES,
        `customer_owned_assumptions[${index}].state`,
        gaps
      );
    });
  }
  return gaps;
}

/**
 * The evidence ladder ceiling for the case, derived from the outcome-evidence
 * review state, window alignment, and customer-owned assumptions. Stronger
 * evidence levels than the ceiling fail closed.
 */
function evidenceCeiling(
  reviewState: string,
  windowAlignment: string,
  assumptionsAllPresent: boolean,
  customerValidated = false
): string {
  if (reviewState === "MISSING" || reviewState === "REJECTED") return "MISSING";
  if (reviewState === "SUBMITTED" || reviewState === "CAVEATED") return "DIRECTIONAL";
  if (reviewState === "ACCEPTED") {
    if (windowAlignment !== "EXACT_MATCH") return "DIRECTIONAL";
    if (!assumptionsAllPresent) return "CAVEATED";
    // VALIDATED (token STRONG): everything SUPPORTED requires, plus
    // customer-approved economic inputs recorded on the case.
    return customerValidated ? "STRONG" : "SUPPORTED";
  }
  return "MISSING";
}

function collectEvidenceQualityGaps(evidenceCase: any): string[] {
  const gaps: string[] = [];
  const quality = evidenceCase?.evidence_quality ?? {};
  const level = quality.evidence_level;
  requireField(level, "evidence_quality.evidence_level", gaps);
  requireField(quality.rationale, "evidence_quality.rationale", gaps);
  if (level && !(EVIDENCE_LEVELS as readonly string[]).includes(level)) {
    gaps.push(`evidence_quality.evidence_level is invalid: ${level}`);
    return gaps;
  }
  if (level && level !== "BLOCKED") {
    const reviewState = evidenceCase?.outcome_evidence_status?.review_state ?? "MISSING";
    const windowAlignment = evidenceCase?.baseline_comparison?.window_alignment ?? "MISSING";
    const assumptions = Array.isArray(evidenceCase?.customer_owned_assumptions)
      ? evidenceCase.customer_owned_assumptions
      : [];
    const assumptionsAllPresent =
      assumptions.length > 0 &&
      assumptions.every((assumption: any) => assumption?.state === "PRESENT");
    const ceiling = evidenceCeiling(
      reviewState,
      windowAlignment,
      assumptionsAllPresent,
      customerValidationSatisfied(evidenceCase?.customer_validation)
    );
    if (EVIDENCE_RANK[level] > EVIDENCE_RANK[ceiling]) {
      gaps.push(
        `evidence_quality.evidence_level exceeds what outcome evidence supports: ${level} > ${ceiling}`
      );
    }
  }
  return gaps;
}

function collectSafeLanguageGaps(evidenceCase: any): string[] {
  const gaps: string[] = [];
  const safe = evidenceCase?.safe_value_language ?? {};
  const claimLevel = safe.allowed_claim_level;
  requireField(claimLevel, "safe_value_language.allowed_claim_level", gaps);
  if (claimLevel && !(CLAIM_LEVELS as readonly string[]).includes(claimLevel)) {
    gaps.push(`safe_value_language.allowed_claim_level is invalid: ${claimLevel}`);
  }
  requireArray(safe.allowed_phrases, "safe_value_language.allowed_phrases", gaps);
  requireArray(safe.required_caveats, "safe_value_language.required_caveats", gaps);
  if (containsUnsafeClaimLanguage(safe.allowed_phrases)) {
    gaps.push("safe_value_language.allowed_phrases contains unsafe claim language");
  }
  const caveats = Array.isArray(safe.required_caveats) ? safe.required_caveats : [];
  const gates = deriveClaimGateStates(evidenceCase);
  if (gates.roi_proof) {
    // Realized-value language is unlocked: figures must be customer-owned
    // and causality must still be disclaimed until its own gate opens.
    if (!caveats.some((caveat: any) => CUSTOMER_FIGURES_CAVEAT_PATTERN.test(String(caveat)))) {
      gaps.push(
        "safe_value_language.required_caveats must state that realized-value figures are customer-approved or customer-computed"
      );
    }
    if (
      !gates.causality_claim &&
      !caveats.some((caveat: any) => CAUSALITY_CAVEAT_PATTERN.test(String(caveat)))
    ) {
      gaps.push(
        "safe_value_language.required_caveats must state that this does not prove causality"
      );
    }
  } else if (!caveats.some((caveat: any) => NON_CAUSAL_CAVEAT_PATTERN.test(String(caveat)))) {
    gaps.push(
      "safe_value_language.required_caveats must state that this does not prove ROI or causality"
    );
  }
  const evidenceLevel = evidenceCase?.evidence_quality?.evidence_level;
  if (
    claimLevel &&
    evidenceLevel &&
    (CLAIM_LEVELS as readonly string[]).includes(claimLevel) &&
    (EVIDENCE_LEVELS as readonly string[]).includes(evidenceLevel)
  ) {
    const maxClaim = MAX_CLAIM_BY_EVIDENCE[evidenceLevel];
    if (evidenceLevel === "BLOCKED") {
      if (claimLevel !== "BLOCKED") {
        gaps.push("safe_value_language.allowed_claim_level must be BLOCKED when evidence is BLOCKED");
      }
    } else if (
      claimLevel === "BLOCKED" ||
      CLAIM_RANK[claimLevel] > CLAIM_RANK[maxClaim]
    ) {
      if (claimLevel !== "BLOCKED") {
        gaps.push(
          `safe_value_language.allowed_claim_level exceeds the evidence level: ${claimLevel} > ${maxClaim}`
        );
      }
    }
  }
  const blockedClaims = new Set(
    Array.isArray(evidenceCase?.blocked_claims) ? evidenceCase.blocked_claims : []
  );
  for (const claim of PRIVACY_BOUNDARY_CLAIMS) {
    if (!blockedClaims.has(claim)) {
      gaps.push(`blocked_claims missing ${claim}`);
    }
  }
  for (const claim of EVIDENCE_GATED_CLAIMS) {
    if (!gates[claim] && !blockedClaims.has(claim)) {
      gaps.push(`blocked_claims missing ${claim}`);
    }
  }
  if (evidenceCase?.claim_gates !== undefined) {
    const entries = Array.isArray(evidenceCase.claim_gates) ? evidenceCase.claim_gates : [];
    for (const claim of EVIDENCE_GATED_CLAIMS) {
      const entry = entries.find((item: any) => item?.claim === claim);
      if (!entry) {
        gaps.push(`claim_gates missing ${claim}`);
        continue;
      }
      const expected = gates[claim] ? "UNLOCKED" : "LOCKED";
      if (entry.state !== expected) {
        gaps.push(`claim_gates.${claim} must be ${expected}`);
      }
    }
  }
  return gaps;
}

function collectCustomerValidationGaps(evidenceCase: any): string[] {
  const gaps: string[] = [];
  const validation = evidenceCase?.customer_validation;
  if (validation === undefined || validation === null) return gaps;
  if (validation.validation_statement !== undefined) {
    gaps.push("customer_validation.validation_statement must not be stored");
  }
  if (validation.economic_inputs_approved !== true) {
    gaps.push("customer_validation.economic_inputs_approved must be true");
  }
  requireField(validation.approved_by_role, "customer_validation.approved_by_role", gaps);
  requireField(
    validation.validation_reference,
    "customer_validation.validation_reference",
    gaps
  );
  return gaps;
}

function collectEvidenceDesignGaps(evidenceCase: any): string[] {
  const gaps: string[] = [];
  const design = evidenceCase?.evidence_design;
  if (design === undefined || design === null) return gaps;
  if (design.design_state !== "APPROVED_COMPARISON_DESIGN") {
    gaps.push("evidence_design.design_state must be APPROVED_COMPARISON_DESIGN");
  }
  requireField(design.design_type, "evidence_design.design_type", gaps);
  requireField(design.approved_by_role, "evidence_design.approved_by_role", gaps);
  requireField(design.design_reference, "evidence_design.design_reference", gaps);
  return gaps;
}

function collectScenarioPostureGaps(evidenceCase: any): string[] {
  const gaps: string[] = [];
  const posture = evidenceCase?.scenario_posture ?? {};
  requireField(posture.roi_scenario_id, "scenario_posture.roi_scenario_id", gaps);
  requireEnum(posture.band, ALLOWED_SCENARIO_BANDS, "scenario_posture.band", gaps);
  requireField(posture.posture_statement, "scenario_posture.posture_statement", gaps);
  return gaps;
}

function collectSponsorDecisionGaps(evidenceCase: any): string[] {
  const gaps: string[] = [];
  const decision = evidenceCase?.sponsor_decision ?? {};
  requireEnum(
    decision.decision_state,
    ALLOWED_DECISION_STATES,
    "sponsor_decision.decision_state",
    gaps
  );
  requireField(decision.decision_owner_role, "sponsor_decision.decision_owner_role", gaps);
  requireField(decision.decision_basis, "sponsor_decision.decision_basis", gaps);
  return gaps;
}

function collectInterventionRetestGaps(evidenceCase: any): string[] {
  const gaps: string[] = [];
  const retest = evidenceCase?.intervention_retest ?? {};
  requireField(retest.next_action, "intervention_retest.next_action", gaps);
  requireField(retest.retest_window_label, "intervention_retest.retest_window_label", gaps);
  requireField(
    retest.retest_measurement_plan,
    "intervention_retest.retest_measurement_plan",
    gaps
  );
  return gaps;
}

function collectEconomicPolicyGaps(evidenceCase: any): string[] {
  const gaps: string[] = [];
  const policy = evidenceCase?.economic_output_policy ?? {};
  for (const field of [
    "customer_facing_economic_output",
    "dollarized_output",
    "realized_roi_calculation"
  ]) {
    if (policy[field] !== false) {
      gaps.push(`economic_output_policy.${field} must be false`);
    }
  }
  for (const boundary of GOVERNANCE_BOUNDARIES) {
    if (evidenceCase?.governance_boundaries?.[boundary] !== false) {
      gaps.push(`governance_boundaries.${boundary} must be false`);
    }
  }
  return gaps;
}

export function validateValueEvidenceCase(
  evidenceCase: any
): ValueEvidenceCaseValidationResult {
  const gaps = [
    ...collectTopLevelGaps(evidenceCase),
    ...collectSourceRefGaps(evidenceCase),
    ...collectClientContextGaps(evidenceCase),
    ...collectWorkflowGaps(evidenceCase),
    ...collectFluencyGaps(evidenceCase),
    ...collectVbdGaps(evidenceCase),
    ...collectOutcomeMetricGaps(evidenceCase),
    ...collectDataBoundaryGaps(evidenceCase),
    ...collectOutcomeEvidenceGaps(evidenceCase),
    ...collectBaselineComparisonGaps(evidenceCase),
    ...collectAssumptionGaps(evidenceCase),
    ...collectEvidenceQualityGaps(evidenceCase),
    ...collectSafeLanguageGaps(evidenceCase),
    ...collectCustomerValidationGaps(evidenceCase),
    ...collectEvidenceDesignGaps(evidenceCase),
    ...collectScenarioPostureGaps(evidenceCase),
    ...collectSponsorDecisionGaps(evidenceCase),
    ...collectInterventionRetestGaps(evidenceCase),
    ...collectEconomicPolicyGaps(evidenceCase)
  ];
  const forbiddenFields = Array.from(collectForbiddenFields(evidenceCase));
  if (forbiddenFields.length > 0) {
    gaps.push(`Forbidden field(s): ${forbiddenFields.sort().join(", ")}`);
  }

  return {
    schema_version: RESULT_SCHEMA_VERSION,
    value_evidence_case_id: evidenceCase?.value_evidence_case_id ?? null,
    workflow_family: evidenceCase?.workflow?.workflow_family ?? null,
    evidence_level: evidenceCase?.evidence_quality?.evidence_level ?? null,
    allowed_claim_level: evidenceCase?.safe_value_language?.allowed_claim_level ?? null,
    valid: gaps.length === 0,
    gaps,
    feeds: {
      executive_readout: gaps.length === 0,
      intervention_planning: gaps.length === 0,
      customer_facing_economic_output: false
    }
  };
}

const firstMetric = (roiScenario: any): any =>
  Array.isArray(roiScenario?.metric_models) ? roiScenario.metric_models[0] ?? {} : {};

const SAFE_PHRASES_BY_LEVEL: Record<string, string[]> = {
  MISSING: [
    "Observed AI activity only; customer-owned outcome evidence is not yet accepted for this workflow slice.",
    "Value language is held until customer-owned outcome evidence is accepted.",
    "The next step is to close the outcome-evidence gap and retest."
  ],
  DIRECTIONAL: [
    "Aggregate evidence suggests this workflow is ready for value investigation.",
    "Outcome evidence has been received but not yet accepted, so this remains an internal hypothesis.",
    "The selected outcome metric can be tested against the approved baseline and comparison window."
  ],
  CAVEATED: [
    "Customer-owned outcome evidence supports a caveated value investigation for this workflow slice.",
    "Open customer-owned assumptions still need owner review before stronger value language.",
    "The next step is to resolve the open assumptions and retest on the same workflow slice."
  ],
  SUPPORTED: [
    "Customer-owned outcome evidence supports a caveated value movement readout for this workflow slice.",
    "Bounded movement on the selected outcome metric is supportable for the approved baseline and comparison window.",
    "The next step is to decide whether to scale, coach, or redesign, and when to remeasure."
  ],
  STRONG: [
    "Customer-validated realized value is supportable for this workflow slice: accepted outcome evidence, aligned windows, resolved assumptions, and customer-approved economic inputs.",
    "Realized-value figures are the customer's own, computed from inputs the customer approved and referenced by this case.",
    "The next step is to scale the workflow and remeasure on the same slice to keep the validation current."
  ],
  BLOCKED: [
    "Value language is blocked for this workflow slice until governance gates pass."
  ]
};

const REQUIRED_CAVEATS = [
  "This does not prove ROI or causality.",
  "All evidence is aggregate-only and workflow-sliced; no person-level data crosses into FluencyTracr.",
  "Customer-owned outcome data owns the value test; VBD and AI Fluency guide intervention planning only."
];

const VALIDATED_CAVEATS = [
  "Realized-value figures are customer-computed and customer-approved; FluencyTracr does not compute or store economic output.",
  "This supports realized value for this workflow slice and window; it does not prove causality.",
  "All evidence is aggregate-only and workflow-sliced; no person-level data crosses into FluencyTracr."
];

/**
 * Compose a Value Evidence Case from the existing governed objects. The
 * builder derives the evidence level fail-closed from the outcome-evidence
 * review state, window alignment, and customer-owned assumptions; callers
 * cannot build their way past the ladder.
 */
export function buildValueEvidenceCase(
  inputs: BuildValueEvidenceCaseInputs,
  options: BuildValueEvidenceCaseOptions = {}
): any {
  const {
    dataBoundary,
    roiScenario,
    readiness,
    outcomeEvidenceExport,
    improvementLoop,
    customerValidation,
    evidenceDesign
  } = inputs ?? ({} as BuildValueEvidenceCaseInputs);
  const metric = firstMetric(roiScenario);
  const workflowFamily = String(
    roiScenario?.workflow?.workflow_family ?? readiness?.workflow_family ?? "client_workflow"
  );
  const functionArea = String(
    options.functionArea ??
      improvementLoop?.workflow?.function_area ??
      workflowFamily
        .split("_")
        .slice(0, 2)
        .join(" ")
        .replace(/\b\w/g, (letter: string) => letter.toUpperCase())
  );

  const reviewState = ALLOWED_REVIEW_STATES.has(
    outcomeEvidenceExport?.review?.review_state
  )
    ? outcomeEvidenceExport.review.review_state
    : "MISSING";

  const baselineWindow = outcomeEvidenceExport?.windows?.baseline ?? null;
  const comparisonWindow = outcomeEvidenceExport?.windows?.comparison ?? null;
  const windowAlignment =
    options.windowAlignment ??
    (baselineWindow && comparisonWindow ? "EXACT_MATCH" : "MISSING");

  const assumptions = Array.isArray(roiScenario?.customer_owned_assumptions)
    ? roiScenario.customer_owned_assumptions.map((assumption: any) => ({
        assumption_id: String(assumption.assumption_id ?? "assumption"),
        state: ALLOWED_ASSUMPTION_STATES.has(assumption.state)
          ? assumption.state
          : "MISSING",
        owner: String(assumption.owner ?? "customer_owner")
      }))
    : [{ assumption_id: "customer_assumptions", state: "MISSING", owner: "customer_owner" }];
  const assumptionsAllPresent = assumptions.every(
    (assumption: any) => assumption.state === "PRESENT"
  );

  const customerValidated = customerValidationSatisfied(customerValidation);
  const approvedEvidenceDesign = sanitizeApprovedEvidenceDesign(evidenceDesign);
  const evidenceLevel = evidenceCeiling(
    reviewState,
    windowAlignment,
    assumptionsAllPresent,
    customerValidated
  );
  const claimLevel = MAX_CLAIM_BY_EVIDENCE[evidenceLevel];
  const validated = evidenceLevel === "STRONG";
  const causalityUnlocked = validated && causalityDesignApproved(approvedEvidenceDesign);

  const vbdContext = improvementLoop?.vbd_context ?? {};
  const statusOr = (value: any, allowed: Set<string>): string =>
    allowed.has(value) ? value : "UNKNOWN";

  const evidenceStatement: Record<string, string> = {
    MISSING:
      "Customer-owned outcome evidence is missing or was rejected, so value language is held at observed AI activity.",
    DIRECTIONAL:
      "Customer-owned outcome evidence is awaiting human acceptance or the windows are not aligned, so the case stays directional.",
    CAVEATED:
      "Customer-owned aggregate outcome evidence was accepted for the matching workflow slice and windows, with assumptions still open.",
    SUPPORTED:
      "Customer-owned aggregate outcome evidence was accepted with exact window alignment and resolved assumptions.",
    STRONG:
      "Customer-owned aggregate outcome evidence was accepted with exact window alignment, resolved assumptions, and customer-approved economic inputs."
  };

  const rationale: Record<string, string> = {
    MISSING:
      "Required customer-owned outcome evidence is absent or rejected for this workflow slice.",
    DIRECTIONAL:
      "Evidence exists but has not been accepted with exactly aligned windows, so rigor remains weak.",
    CAVEATED:
      "Accepted aggregate outcome evidence and exact baseline/comparison windows exist, but customer-owned assumptions remain caveated or missing.",
    SUPPORTED:
      "Accepted customer-owned aggregate outcome evidence, exact window alignment, and resolved assumptions support bounded movement for this workflow slice.",
    STRONG:
      "Accepted customer-owned aggregate outcome evidence, exact window alignment, resolved assumptions, and customer-approved economic inputs support realized-value language scoped to this workflow slice."
  };

  return {
    schema_version: VALUE_EVIDENCE_CASE_SCHEMA_VERSION,
    value_evidence_case_id:
      options.caseId ??
      `value_evidence_case_${workflowFamily.replace(/[^a-z0-9_]/gi, "_")}_v1`,
    source_refs: {
      data_boundary_contract_id: dataBoundary?.contract_id ?? null,
      roi_scenario_id: roiScenario?.roi_scenario_id ?? null,
      readiness_id: readiness?.readiness_id ?? roiScenario?.source_refs?.readiness_id ?? null,
      outcome_export_id: outcomeEvidenceExport?.export_id ?? null,
      improvement_loop_id: improvementLoop?.improvement_loop_id ?? null
    },
    client_context: {
      engagement_label:
        options.engagementLabel ?? `${functionArea} value engagement`,
      function_area: functionArea,
      sponsor_role: String(
        outcomeEvidenceExport?.attestation?.approved_by_role ?? "business_sponsor"
      )
    },
    workflow: {
      workflow_family: workflowFamily,
      workflow_name: String(roiScenario?.workflow?.workflow_name ?? functionArea),
      function_area: functionArea,
      value_route: String(roiScenario?.workflow?.value_route ?? "UNCLASSIFIED")
    },
    ai_fluency_summary: {
      readiness: statusOr(vbdContext.fluency_readiness, ALLOWED_FLUENCY),
      basis: "Aggregate AI Fluency baseline by function with small cohorts suppressed.",
      cohort_suppression_applied: true
    },
    vbd_summary: {
      velocity: {
        definition: CANONICAL_VBD_DEFINITIONS.velocity,
        status: statusOr(vbdContext.velocity_status, ALLOWED_VELOCITY)
      },
      breadth: {
        definition: CANONICAL_VBD_DEFINITIONS.breadth,
        status: statusOr(vbdContext.breadth_status, ALLOWED_BREADTH)
      },
      depth: {
        definition: CANONICAL_VBD_DEFINITIONS.depth,
        status: statusOr(vbdContext.depth_status, ALLOWED_DEPTH)
      },
      summary:
        "Velocity, Breadth, and Depth are the aggregate operating map for this workflow slice; they guide intervention planning and do not prove business impact."
    },
    outcome_metric: {
      metric_id: String(metric.metric_id ?? "selected_metric"),
      metric_name: String(metric.name ?? "Selected outcome metric"),
      measurement_unit: String(metric.measurement_unit ?? "customer-approved unit"),
      source_system: String(
        metric?.source_system?.source_name ?? "Customer-owned outcome system"
      ),
      expected_direction:
        String(metric.value_route ?? "") === "CAPACITY_CREATION" ? "REDUCE" : "IMPROVE"
    },
    data_boundary_status: {
      contract_id: dataBoundary?.contract_id ?? null,
      aggregate_only: true,
      raw_source_rows_allowed: false,
      direct_identifiers_allowed: false,
      raw_content_allowed: false,
      status: "ENFORCED"
    },
    outcome_evidence_status: {
      export_id: outcomeEvidenceExport?.export_id ?? null,
      review_state: reviewState,
      statement: evidenceStatement[evidenceLevel]
    },
    baseline_comparison: {
      baseline_window: baselineWindow,
      comparison_window: comparisonWindow,
      window_alignment: windowAlignment
    },
    customer_owned_assumptions: assumptions,
    evidence_quality: {
      evidence_level: evidenceLevel,
      rationale: rationale[evidenceLevel]
    },
    safe_value_language: {
      allowed_claim_level: claimLevel,
      allowed_phrases: SAFE_PHRASES_BY_LEVEL[evidenceLevel],
      required_caveats: validated ? VALIDATED_CAVEATS : REQUIRED_CAVEATS
    },
    blocked_claims: [
      ...PRIVACY_BOUNDARY_CLAIMS,
      ...EVIDENCE_GATED_CLAIMS.filter((claim) =>
        claim === "causality_claim" ? !causalityUnlocked : !validated
      )
    ],
    claim_gates: EVIDENCE_GATED_CLAIMS.map((claim) => ({
      claim,
      state:
        (claim === "causality_claim" ? causalityUnlocked : validated)
          ? "UNLOCKED"
          : "LOCKED",
      unlock_requirements: CLAIM_UNLOCK_REQUIREMENTS[claim]
    })),
    customer_validation: customerValidated
      ? {
          economic_inputs_approved: true,
          approved_by_role: String(customerValidation.approved_by_role),
          validation_reference: String(customerValidation.validation_reference)
        }
      : null,
    ...(approvedEvidenceDesign ? { evidence_design: approvedEvidenceDesign } : {}),
    scenario_posture: {
      roi_scenario_id: roiScenario?.roi_scenario_id ?? null,
      band: evidenceLevel === "SUPPORTED" || validated ? "BASE_CASE" : "CONSERVATIVE",
      posture_statement:
        evidenceLevel === "SUPPORTED" || validated
          ? "Plan with the base-case band; expand only after the sponsor accepts the bounded readout."
          : "Plan with the conservative band until outcome evidence is accepted and customer assumptions are resolved."
    },
    sponsor_decision: {
      decision_state: ALLOWED_DECISION_STATES.has(options.sponsorDecisionState ?? "")
        ? (options.sponsorDecisionState as string)
        : "PENDING",
      decision_owner_role:
        options.sponsorDecisionOwnerRole ??
        String(outcomeEvidenceExport?.attestation?.approved_by_role ?? "business_sponsor"),
      decision_basis:
        "Decide from the evidence level, open assumptions, and the recommended next action; stronger value language stays gated."
    },
    intervention_retest: {
      improvement_loop_id: improvementLoop?.improvement_loop_id ?? null,
      next_action:
        evidenceLevel === "SUPPORTED" || validated
          ? "Decide where to scale or redesign, then remeasure the same workflow slice in the next window."
          : "Close the highest-priority evidence or assumption gap, run the recommended intervention, and retest.",
      retest_window_label: String(
        improvementLoop?.retest_plan?.window_label ?? "30-45 days after intervention"
      ),
      retest_measurement_plan: String(
        improvementLoop?.retest_plan?.measurement_plan ??
          "Recheck aggregate AI Fluency, VBD movement, and the selected outcome metric on the same workflow slice and windows."
      )
    },
    economic_output_policy: {
      customer_facing_economic_output: false,
      dollarized_output: false,
      realized_roi_calculation: false
    },
    governance_boundaries: Object.fromEntries(
      GOVERNANCE_BOUNDARIES.map((boundary) => [boundary, false])
    )
  };
}
