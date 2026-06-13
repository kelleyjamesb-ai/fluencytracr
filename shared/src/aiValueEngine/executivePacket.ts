/**
 * AI Value Engine — Executive Packet stage.
 *
 * Owns executive validation packet composition, validation, and the
 * markdown rendering used by readout artifacts. Logic migrated verbatim from
 * scripts/generate_ai_value_executive_packet.mjs per the migration contract.
 */

import { getAiValueDisplayLabel } from "./language";

const RESULT_SCHEMA_VERSION = "FT_AI_VALUE_EXECUTIVE_PACKET_VALIDATION_2026_06";

const ALLOWED_DECISIONS = new Set([
  "READY_FOR_EXECUTIVE_VALIDATION",
  "HOLD_FOR_ASSUMPTIONS",
  "HOLD_FOR_SOURCE_COVERAGE",
  "HOLD_FOR_BASELINE",
  "STOP_FOR_GOVERNANCE_REVIEW"
]);

const ALLOWED_CLAIM_STATES = new Set([
  "CAVEATED",
  "INTERNAL_ONLY",
  "MISSING",
  "BLOCKED"
]);

const ALLOWED_EBITA_IMPACT_STATUSES = new Set([
  "NO_FINANCIAL_TRANSLATION",
  "DIRECTIONAL_EBITA_BRIDGE",
  "MODELED_EBITA_SCENARIO",
  "FINANCE_VALIDATED_EBITA_CASE",
  "CUSTOMER_FACING_APPROVED"
]);

const REQUIRED_SECTIONS = [
  "workflow",
  "metrics",
  "scenario",
  "readiness",
  "claim_boundary",
  "next_actions"
];

const FORBIDDEN_CLAIM_PATTERNS = [
  /proved ROI/i,
  /caused productivity/i,
  /caused .*lift/i,
  /saved money/i,
  /saved \$?\d/i,
  /employee/i,
  /manager/i,
  /team .*better/i
];

const FORBIDDEN_EBITA_LANGUAGE_PATTERNS = [
  /usage proves EBITA/i,
  /AI caused EBITA/i,
  /proved financial impact/i,
  /headcount reduction/i,
  /named employee/i,
  /individual productivity/i,
  /manager/i,
  /HRIS inference/i,
  /saved \$?\d/i,
  /\$\s?\d/
];

const REQUIRED_EBITA_BLOCKED_CLAIMS = [
  "usage_proves_ebita",
  "ai_caused_ebita_without_causal_design",
  "headcount_reduction_from_usage",
  "individual_productivity_claim",
  "individual_productivity_measurement",
  "named_employee_productivity",
  "manager_or_team_ranking",
  "team_or_manager_ranking",
  "hris_inference"
];

export interface ExecutivePacketValidationResult {
  schema_version: string;
  packet_id: string | null;
  decision: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    local_workspace_ui: boolean;
    customer_facing_economic_output: boolean;
  };
}

export interface BuildExecutivePacketInputs {
  blueprint: any;
  metricsLibrary: any;
  scenario: any;
  readiness: any;
  claimBoundary: any;
  roiScenario?: any;
  ebitaBridge?: any;
  packetId?: string;
}

export interface ExecutiveEbitaImpactSummary {
  status:
    | "NO_FINANCIAL_TRANSLATION"
    | "DIRECTIONAL_EBITA_BRIDGE"
    | "MODELED_EBITA_SCENARIO"
    | "FINANCE_VALIDATED_EBITA_CASE"
    | "CUSTOMER_FACING_APPROVED";
  realized_ebita_claim_allowed: boolean;
  customer_facing_allowed: boolean;
  causality_claim_allowed: boolean;
  primary_ebita_levers: string[];
  evidence_quality: {
    adoption_evidence: string;
    workflow_evidence: string;
    outcome_evidence: string;
    financial_evidence: string;
    overall_ebita_confidence: string;
  };
  allowed_phrases: string[];
  required_caveats: string[];
  blocked_claims: string[];
  next_evidence_actions: string[];
}

function containsForbiddenClaimLanguage(values: any): boolean {
  return (values ?? []).some((value: any) =>
    FORBIDDEN_CLAIM_PATTERNS.some((pattern) => pattern.test(String(value)))
  );
}

function containsForbiddenEbitaLanguage(values: any): boolean {
  return (values ?? []).some((value: any) =>
    FORBIDDEN_EBITA_LANGUAGE_PATTERNS.some((pattern) => pattern.test(String(value)))
  );
}

function requireField(value: any, path: string, gaps: string[]): void {
  if (!value) gaps.push(`${path} is missing`);
}

function sectionArray(section: any, path: string, gaps: string[]): void {
  if (!Array.isArray(section) || section.length === 0) {
    gaps.push(`${path} must include at least one item`);
  }
}

const uniqueStrings = (values: any[]): string[] => [
  ...new Set(values.filter(Boolean).map(String))
];

const ebitaEvidenceQuality = (bridge: any): ExecutiveEbitaImpactSummary["evidence_quality"] => ({
  adoption_evidence: String(bridge?.evidence_quality?.adoption_evidence ?? "MISSING"),
  workflow_evidence: String(bridge?.evidence_quality?.workflow_evidence ?? "MISSING"),
  outcome_evidence: String(bridge?.evidence_quality?.outcome_evidence ?? "MISSING"),
  financial_evidence: String(bridge?.evidence_quality?.financial_evidence ?? "MISSING"),
  overall_ebita_confidence: String(
    bridge?.evidence_quality?.overall_ebita_confidence ?? "MISSING"
  )
});

const evidenceIsPresent = (value: unknown): boolean =>
  !["", "MISSING", "BLOCKED", "SUPPRESSED"].includes(String(value ?? "").toUpperCase());

function roiGateAllowsCustomerFacing(roiScenario: any): boolean {
  const gate = roiScenario?.financial_claim_gate ?? {};
  return Boolean(
    gate.mode === "CUSTOMER_FACING_APPROVED" &&
      gate.allowed_outputs?.customer_facing_economic_output === true &&
      gate.data_sufficiency?.aggregate_only === true &&
      gate.data_sufficiency?.outcome_metric_accepted === true &&
      gate.data_sufficiency?.finance_owner_attested === true &&
      gate.data_sufficiency?.legal_or_governance_approved === true
  );
}

function roiGateAllowsRealizedFinancialLanguage(roiScenario: any): boolean {
  const gate = roiScenario?.financial_claim_gate ?? {};
  return Boolean(
    ["FINANCE_VALIDATED", "CUSTOMER_FACING_APPROVED"].includes(String(gate.mode ?? "")) &&
      gate.allowed_outputs?.realized_roi_calculation === true &&
      gate.data_sufficiency?.aggregate_only === true &&
      gate.data_sufficiency?.baseline_present === true &&
      gate.data_sufficiency?.comparison_present === true &&
      gate.data_sufficiency?.outcome_metric_accepted === true &&
      gate.data_sufficiency?.financial_assumptions_present === true &&
      gate.data_sufficiency?.investment_costs_present === true &&
      gate.data_sufficiency?.finance_owner_attested === true &&
      gate.data_sufficiency?.confounds_reviewed === true
  );
}

function roiGateAllowsCausalityLanguage(roiScenario: any): boolean {
  const gate = roiScenario?.financial_claim_gate ?? {};
  return Boolean(
    gate.allowed_outputs?.causality_language === true &&
      gate.data_sufficiency?.experimental_or_quasi_experimental_design === true
  );
}

function baselineOrComparisonWeak(roiScenario: any): boolean {
  const gate = roiScenario?.financial_claim_gate ?? {};
  const baselineState = String(
    roiScenario?.baseline_comparison?.baseline_window?.state ?? ""
  ).toUpperCase();
  const comparisonState = String(
    roiScenario?.baseline_comparison?.comparison_window?.state ?? ""
  ).toUpperCase();
  return !(
    gate.data_sufficiency?.baseline_present === true &&
    gate.data_sufficiency?.comparison_present === true
  ) || ["MISSING", "BLOCKED", "SUPPRESSED"].includes(baselineState) ||
    ["MISSING", "BLOCKED", "SUPPRESSED"].includes(comparisonState);
}

function statusForEbitaBridge(
  bridge: any,
  roiScenario: any,
  evidenceQuality: ExecutiveEbitaImpactSummary["evidence_quality"]
): ExecutiveEbitaImpactSummary["status"] {
  const rawStatus = String(
    bridge?.financial_translation_policy?.mode ?? "NO_FINANCIAL_TRANSLATION"
  );
  const status = ALLOWED_EBITA_IMPACT_STATUSES.has(rawStatus)
    ? rawStatus
    : "NO_FINANCIAL_TRANSLATION";
  if (
    !evidenceIsPresent(evidenceQuality.workflow_evidence) ||
    !evidenceIsPresent(evidenceQuality.outcome_evidence)
  ) {
    return "NO_FINANCIAL_TRANSLATION";
  }
  if (status === "CUSTOMER_FACING_APPROVED" && !roiGateAllowsCustomerFacing(roiScenario)) {
    return evidenceQuality.overall_ebita_confidence === "FINANCE_VALIDATED"
      ? "FINANCE_VALIDATED_EBITA_CASE"
      : "MODELED_EBITA_SCENARIO";
  }
  return status as ExecutiveEbitaImpactSummary["status"];
}

function defaultAllowedEbitaPhrases(status: ExecutiveEbitaImpactSummary["status"]): string[] {
  if (status === "NO_FINANCIAL_TRANSLATION") {
    return ["No EBITA translation is available for this workflow yet."];
  }
  if (status === "DIRECTIONAL_EBITA_BRIDGE") {
    return [
      "This workflow may affect EBITA through identified financial levers.",
      "No realized EBITA claim is made."
    ];
  }
  if (status === "MODELED_EBITA_SCENARIO") {
    return [
      "Customer-owned financial assumptions support a modeled EBITA scenario.",
      "This is a modeled scenario, not proven EBITA impact."
    ];
  }
  if (status === "FINANCE_VALIDATED_EBITA_CASE") {
    return [
      "Finance-attested assumptions support a finance-validated EBITA case for this workflow and window."
    ];
  }
  return [
    "This economic output is approved for customer-facing use within the stated scope and caveats."
  ];
}

function requiredEbitaCaveats(
  status: ExecutiveEbitaImpactSummary["status"],
  existingCaveats: any[]
): string[] {
  const caveats = [...existingCaveats.map(String)];
  if (status === "DIRECTIONAL_EBITA_BRIDGE") {
    caveats.push("This is a directional EBITA bridge, not proven financial impact.");
    caveats.push("No realized EBITA claim is allowed.");
  }
  if (status === "MODELED_EBITA_SCENARIO") {
    caveats.push("Customer-owned financial assumptions are required before dollarized claims.");
    caveats.push("Finance validation is required before realized EBITA language.");
    caveats.push("No realized EBITA claim is allowed.");
  }
  if (status === "FINANCE_VALIDATED_EBITA_CASE") {
    caveats.push(
      "Finance-validated language applies only within the stated workflow and window."
    );
  }
  if (status === "CUSTOMER_FACING_APPROVED") {
    caveats.push("Use only within the finance-approved scope and window.");
  }
  if (status === "NO_FINANCIAL_TRANSLATION") {
    caveats.push("No realized EBITA claim is allowed.");
  }
  return uniqueStrings(caveats);
}

function nextEbitaEvidenceActions(
  status: ExecutiveEbitaImpactSummary["status"],
  evidenceQuality: ExecutiveEbitaImpactSummary["evidence_quality"],
  roiScenario: any,
  causalityAllowed: boolean,
  customerFacingAllowed: boolean
): string[] {
  const actions: string[] = [];
  if (["MISSING", "DIRECTIONAL", "CAVEATED"].includes(evidenceQuality.financial_evidence)) {
    actions.push("Attach customer-owned financial assumptions.");
    actions.push("Confirm finance owner and approval state.");
  }
  if (["MISSING", "BLOCKED", "SUPPRESSED"].includes(evidenceQuality.outcome_evidence)) {
    actions.push(
      "Attach accepted customer-owned outcome evidence for the same workflow and window."
    );
  }
  if (baselineOrComparisonWeak(roiScenario)) {
    actions.push("Confirm baseline and comparison windows.");
  }
  if (status === "MODELED_EBITA_SCENARIO") {
    actions.push("Finance validation is required before realized EBITA language.");
  }
  if (!causalityAllowed) {
    actions.push(
      "Do not use causal language unless experimental or quasi-experimental evidence is available."
    );
  }
  if (!customerFacingAllowed) {
    actions.push(
      "Keep economic language internal or caveated until customer-facing approval is granted."
    );
  }
  return uniqueStrings(actions);
}

function buildEbitaImpactSummary(
  ebitaBridge: any,
  roiScenario: any
): ExecutiveEbitaImpactSummary | undefined {
  if (!ebitaBridge) return undefined;
  const evidenceQuality = ebitaEvidenceQuality(ebitaBridge);
  const status = statusForEbitaBridge(ebitaBridge, roiScenario, evidenceQuality);
  const bridgePolicy = ebitaBridge.financial_translation_policy ?? {};
  const rawBridgeStatus = String(bridgePolicy.mode ?? "NO_FINANCIAL_TRANSLATION");
  const realizedAllowed = Boolean(
    (status === "FINANCE_VALIDATED_EBITA_CASE" || status === "CUSTOMER_FACING_APPROVED") &&
      bridgePolicy.realized_ebita_claim_allowed === true &&
      evidenceQuality.overall_ebita_confidence === "FINANCE_VALIDATED" &&
      roiGateAllowsRealizedFinancialLanguage(roiScenario)
  );
  const customerFacingAllowed = Boolean(
    status === "CUSTOMER_FACING_APPROVED" &&
      bridgePolicy.customer_facing_allowed === true &&
      roiGateAllowsCustomerFacing(roiScenario)
  );
  const causalityAllowed = Boolean(
    bridgePolicy.causality_claim_allowed === true && roiGateAllowsCausalityLanguage(roiScenario)
  );
  const safeLanguage = ebitaBridge.safe_language ?? {};
  const sourcePhrases = status === "NO_FINANCIAL_TRANSLATION" || rawBridgeStatus !== status
    ? defaultAllowedEbitaPhrases(status)
    : Array.isArray(safeLanguage.allowed_phrases)
      ? safeLanguage.allowed_phrases
      : [];
  const allowedPhrases = uniqueStrings(sourcePhrases)
    .filter((phrase) => !containsForbiddenEbitaLanguage([phrase]));

  return {
    status,
    realized_ebita_claim_allowed: realizedAllowed,
    customer_facing_allowed: customerFacingAllowed,
    causality_claim_allowed: causalityAllowed,
    primary_ebita_levers:
      status === "NO_FINANCIAL_TRANSLATION"
        ? []
        : uniqueStrings((ebitaBridge.ebita_levers ?? []).map((lever: any) => lever.ebita_driver)),
    evidence_quality: evidenceQuality,
    allowed_phrases: allowedPhrases.length > 0 ? allowedPhrases : defaultAllowedEbitaPhrases(status),
    required_caveats: requiredEbitaCaveats(
      status,
      Array.isArray(safeLanguage.required_caveats) ? safeLanguage.required_caveats : []
    ),
    blocked_claims: uniqueStrings([
      ...(Array.isArray(safeLanguage.blocked_claims) ? safeLanguage.blocked_claims : []),
      ...REQUIRED_EBITA_BLOCKED_CLAIMS
    ]),
    next_evidence_actions: nextEbitaEvidenceActions(
      status,
      evidenceQuality,
      roiScenario,
      causalityAllowed,
      customerFacingAllowed
    )
  };
}

export function buildExecutiveValidationPacket({
  blueprint,
  metricsLibrary,
  scenario,
  readiness,
  claimBoundary,
  roiScenario,
  ebitaBridge,
  packetId
}: BuildExecutivePacketInputs): any {
  const recommendedMetrics = metricsLibrary.metrics
    .filter(
      (metric: any) =>
        metric.value_route === blueprint.value_routes.primary &&
        metric.allowed_claim_level !== "BLOCKED"
    )
    .map((metric: any) => ({
      metric_id: metric.metric_id,
      name: metric.name,
      value_route: metric.value_route,
      measurement_unit: metric.measurement_unit,
      owner: metric.owner
    }));

  return {
    schema_version: "FT_AI_VALUE_EXECUTIVE_PACKET_2026_06",
    packet_id: packetId ?? "executive_packet_customer_support_v1",
    workflow_family: blueprint.workflow_family,
    workflow_name: blueprint.workflow_name,
    value_route: blueprint.value_routes.primary,
    decision: readiness.decision,
    claim_state: claimBoundary.claim_state,
    customer_facing_economic_output: false,
    source_refs: {
      blueprint_id: blueprint.blueprint_id,
      metrics_library_id: metricsLibrary.library_id,
      scenario_id: scenario.scenario_id,
      readiness_id: readiness.readiness_id,
      claim_boundary_id: claimBoundary.claim_boundary_id,
      roi_scenario_id: roiScenario?.roi_scenario_id,
      ebita_bridge_id: ebitaBridge?.ebita_bridge_id
    },
    sections: {
      workflow: {
        hypothesis: blueprint.value_hypothesis,
        current_state_steps: blueprint.process_discovery.current_state_steps,
        future_state_steps: blueprint.process_discovery.future_state_steps
      },
      metrics: recommendedMetrics,
      scenario: {
        scenario_id: scenario.scenario_id,
        bands: scenario.input.scenario_bands,
        output_units: scenario.input.output_units
      },
      readiness: {
        decision: readiness.decision,
        checks: readiness.readiness_checks,
        rationale: readiness.decision_rationale
      },
      claim_boundary: {
        claim_state: claimBoundary.claim_state,
        safe_claims: claimBoundary.safe_claims,
        caveated_claims: claimBoundary.caveated_claims,
        blocked_claims: claimBoundary.blocked_claims,
        required_caveats: claimBoundary.required_caveats
      },
      next_actions: readiness.next_actions
    },
    ebita_impact_summary: buildEbitaImpactSummary(ebitaBridge, roiScenario)
  };
}

function validateEbitaImpactSummary(summary: any, gaps: string[]): void {
  if (summary === undefined) return;
  if (!summary || typeof summary !== "object") {
    gaps.push("ebita_impact_summary must be an object when present");
    return;
  }
  for (const field of [
    "status",
    "primary_ebita_levers",
    "evidence_quality",
    "allowed_phrases",
    "required_caveats",
    "blocked_claims",
    "next_evidence_actions"
  ]) {
    requireField(summary[field], `ebita_impact_summary.${field}`, gaps);
  }
  if (summary.status && !ALLOWED_EBITA_IMPACT_STATUSES.has(summary.status)) {
    gaps.push(`ebita_impact_summary.status is invalid: ${summary.status}`);
  }
  for (const field of [
    "realized_ebita_claim_allowed",
    "customer_facing_allowed",
    "causality_claim_allowed"
  ]) {
    if (summary[field] !== true && summary[field] !== false) {
      gaps.push(`ebita_impact_summary.${field} must be boolean`);
    }
  }
  for (const field of [
    "primary_ebita_levers",
    "allowed_phrases",
    "required_caveats",
    "blocked_claims",
    "next_evidence_actions"
  ]) {
    if (!Array.isArray(summary[field])) {
      gaps.push(`ebita_impact_summary.${field} must be an array`);
    }
  }
  const quality = summary.evidence_quality ?? {};
  for (const field of [
    "adoption_evidence",
    "workflow_evidence",
    "outcome_evidence",
    "financial_evidence",
    "overall_ebita_confidence"
  ]) {
    requireField(quality[field], `ebita_impact_summary.evidence_quality.${field}`, gaps);
  }
  if (containsForbiddenEbitaLanguage(summary.allowed_phrases)) {
    gaps.push("ebita_impact_summary.allowed_phrases contains forbidden financial claim language");
  }
  const blocked = new Set(summary.blocked_claims ?? []);
  for (const claim of REQUIRED_EBITA_BLOCKED_CLAIMS) {
    if (!blocked.has(claim)) {
      gaps.push(`ebita_impact_summary.blocked_claims missing ${claim}`);
    }
  }
  if (
    summary.status === "DIRECTIONAL_EBITA_BRIDGE" &&
    summary.realized_ebita_claim_allowed === true
  ) {
    gaps.push("ebita_impact_summary.realized_ebita_claim_allowed must be false for DIRECTIONAL_EBITA_BRIDGE");
  }
  if (
    summary.status === "MODELED_EBITA_SCENARIO" &&
    summary.realized_ebita_claim_allowed === true
  ) {
    gaps.push("ebita_impact_summary.realized_ebita_claim_allowed must be false for MODELED_EBITA_SCENARIO");
  }
  if (
    summary.realized_ebita_claim_allowed === true &&
    quality.overall_ebita_confidence !== "FINANCE_VALIDATED"
  ) {
    gaps.push("ebita_impact_summary.realized_ebita_claim_allowed requires FINANCE_VALIDATED confidence");
  }
  if (
    summary.customer_facing_allowed === true &&
    summary.status !== "CUSTOMER_FACING_APPROVED"
  ) {
    gaps.push("ebita_impact_summary.customer_facing_allowed requires CUSTOMER_FACING_APPROVED status");
  }
  if (
    summary.status === "CUSTOMER_FACING_APPROVED" &&
    summary.customer_facing_allowed !== true
  ) {
    gaps.push("ebita_impact_summary.customer_facing_allowed must be true for CUSTOMER_FACING_APPROVED");
  }
  if (
    summary.status !== "NO_FINANCIAL_TRANSLATION" &&
    (!evidenceIsPresent(quality.workflow_evidence) || !evidenceIsPresent(quality.outcome_evidence))
  ) {
    gaps.push("ebita_impact_summary cannot make a financial translation from usage evidence alone");
  }
}

export function validateExecutivePacket(packet: any): ExecutivePacketValidationResult {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "packet_id",
    "workflow_family",
    "value_route",
    "decision",
    "claim_state",
    "source_refs",
    "sections"
  ]) {
    requireField(packet?.[field], field, gaps);
  }
  if (packet?.schema_version &&
      packet.schema_version !== "FT_AI_VALUE_EXECUTIVE_PACKET_2026_06") {
    gaps.push(`schema_version is invalid: ${packet.schema_version}`);
  }
  if (packet?.decision && !ALLOWED_DECISIONS.has(packet.decision)) {
    gaps.push(`decision is invalid: ${packet.decision}`);
  }
  if (packet?.claim_state && !ALLOWED_CLAIM_STATES.has(packet.claim_state)) {
    gaps.push(`claim_state is invalid: ${packet.claim_state}`);
  }
  if (packet?.customer_facing_economic_output === true) {
    gaps.push("customer_facing_economic_output is true");
  }
  if (packet?.customer_facing_economic_output !== false) {
    gaps.push("customer_facing_economic_output must be false");
  }
  const sections = packet?.sections ?? {};
  for (const section of REQUIRED_SECTIONS) {
    requireField(sections[section], `sections.${section}`, gaps);
  }
  sectionArray(sections.metrics, "sections.metrics", gaps);
  sectionArray(sections.next_actions, "sections.next_actions", gaps);
  if (containsForbiddenClaimLanguage(sections?.claim_boundary?.safe_claims)) {
    gaps.push("sections.claim_boundary.safe_claims contains forbidden claim language");
  }
  if (containsForbiddenClaimLanguage(sections?.claim_boundary?.caveated_claims)) {
    gaps.push("sections.claim_boundary.caveated_claims contains forbidden claim language");
  }
  validateEbitaImpactSummary(packet?.ebita_impact_summary, gaps);
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    packet_id: packet?.packet_id ?? null,
    decision: packet?.decision ?? null,
    valid: gaps.length === 0,
    gaps,
    feeds: {
      local_workspace_ui: gaps.length === 0,
      customer_facing_economic_output: false
    }
  };
}

function renderEbitaImpactMarkdown(summary: ExecutiveEbitaImpactSummary | undefined): string {
  if (!summary) return "";
  const levers = summary.primary_ebita_levers.length
    ? summary.primary_ebita_levers.map((lever) => `- ${getAiValueDisplayLabel(lever)}`).join("\n")
    : "- No financial translation levers surfaced.";
  const quality = Object.entries(summary.evidence_quality)
    .map(
      ([field, value]) =>
        `- ${getAiValueDisplayLabel(field)}: ${getAiValueDisplayLabel(value)}`
    )
    .join("\n");
  const allowed = summary.allowed_phrases.map((phrase) => `- ${phrase}`).join("\n");
  const caveats = summary.required_caveats.map((caveat) => `- ${caveat}`).join("\n");
  const blocked = summary.blocked_claims
    .map((claim) => `- ${getAiValueDisplayLabel(claim)}`)
    .join("\n");
  const next = summary.next_evidence_actions.map((action) => `- ${action}`).join("\n");
  const realizedLine = summary.realized_ebita_claim_allowed
    ? "Realized financial language is allowed only within the finance-validated workflow and window."
    : "No realized financial claim is allowed.";
  return `
## Financial Translation

Status: ${getAiValueDisplayLabel(summary.status)}

${realizedLine}

Customer-facing economic language: ${summary.customer_facing_allowed ? "Approved for the stated scope." : "Not approved."}

Causality language: ${summary.causality_claim_allowed ? "Approved by evidence design." : "Not approved."}

### Primary financial levers

${levers}

### Evidence quality

${quality}

### Allowed language

${allowed}

### Required caveats

${caveats}

### Blocked claims

${blocked}

### Next evidence actions

${next}
`;
}

export function renderExecutiveValidationMarkdown(packet: any): string {
  const metrics = packet.sections.metrics
    .map((metric: any) => `- ${metric.name} - ${metric.measurement_unit}`)
    .join("\n");
  const caveats = packet.sections.claim_boundary.required_caveats
    .map((caveat: any) => `- ${caveat}`)
    .join("\n");
  const nextActions = packet.sections.next_actions
    .map((action: any) => `- ${action}`)
    .join("\n");
  return `# Customer Support AI Value Validation Packet

## Measurement Readiness

${getAiValueDisplayLabel(packet.decision)}

## Workflow

${packet.workflow_name}

${packet.sections.workflow.hypothesis}

## Metrics

${metrics}

## Scenario

Value route: ${packet.value_route}

Scenario bands are planning ranges only. They are not realized ROI.

## Value Realization

Claim state: ${getAiValueDisplayLabel(packet.claim_state)}

${packet.sections.claim_boundary.safe_claims.map((claim: any) => `- ${claim}`).join("\n")}

${renderEbitaImpactMarkdown(packet.ebita_impact_summary)}

## Required Caveats

${caveats}

## Next Actions

${nextActions}
`;
}
