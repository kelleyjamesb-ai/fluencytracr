/**
 * AI Value Engine - EBITA Impact Bridge.
 *
 * Deterministic translation layer after governed value-scenario review. It maps validated
 * workflow value evidence into EBITA-relevant levers without calculating EBITA,
 * proving causality, ranking people, or deriving financial output from usage
 * telemetry.
 */

const RESULT_SCHEMA_VERSION = "FT_AI_VALUE_EBITA_BRIDGE_VALIDATION_2026_06";
export const EBITA_BRIDGE_SCHEMA_VERSION = "FT_AI_VALUE_EBITA_BRIDGE_2026_06";

const ALLOWED_EBITA_DRIVERS = new Set([
  "REVENUE_GROWTH",
  "OPERATING_COST_REDUCTION",
  "CAPACITY_CREATION",
  "QUALITY_COST_REDUCTION",
  "RISK_LOSS_REDUCTION",
  "RETENTION_OR_EXPANSION",
  "WORKING_CAPITAL_OR_CASH_TIMING"
]);

const ALLOWED_EVIDENCE_LEVELS = new Set([
  "MISSING",
  "DIRECTIONAL",
  "CAVEATED",
  "SUPPORTED",
  "FINANCE_VALIDATED",
  "BLOCKED"
]);

const ALLOWED_CLAIM_LEVELS = new Set([
  "NO_EBITA_CLAIM",
  "DIRECTIONAL_EBITA_LEVER",
  "MODELED_EBITA_SCENARIO",
  "FINANCE_VALIDATED_EBITA_CASE",
  "CUSTOMER_FACING_APPROVED"
]);

const ALLOWED_TRANSLATION_MODES = new Set([
  "NO_FINANCIAL_TRANSLATION",
  "DIRECTIONAL_EBITA_BRIDGE",
  "MODELED_EBITA_SCENARIO",
  "FINANCE_VALIDATED_EBITA_CASE",
  "CUSTOMER_FACING_APPROVED"
]);

const VALUE_ROUTE_TO_EBITA_DRIVERS: Record<string, string[]> = {
  REVENUE_EXPANSION: ["REVENUE_GROWTH", "RETENTION_OR_EXPANSION"],
  COST_REDUCTION: ["OPERATING_COST_REDUCTION"],
  CAPACITY_CREATION: ["CAPACITY_CREATION", "OPERATING_COST_REDUCTION"],
  QUALITY_IMPROVEMENT: ["QUALITY_COST_REDUCTION", "RETENTION_OR_EXPANSION"],
  RISK_REDUCTION: ["RISK_LOSS_REDUCTION"],
  EXPERIENCE_IMPROVEMENT: ["RETENTION_OR_EXPANSION"],
  UNCLASSIFIED: []
};

const REQUIRED_BLOCKED_CLAIMS = [
  "usage_proves_ebita",
  "ai_caused_ebita_without_causal_design",
  "headcount_reduction_from_usage",
  "individual_productivity_claim",
  "manager_or_team_ranking"
];

const MODED_CLAIM_LEVELS_REQUIRING_ASSUMPTIONS = new Set([
  "MODELED_EBITA_SCENARIO",
  "FINANCE_VALIDATED_EBITA_CASE",
  "CUSTOMER_FACING_APPROVED"
]);

const EVIDENCE_FIELDS = [
  "adoption_evidence",
  "workflow_evidence",
  "outcome_evidence",
  "financial_evidence",
  "overall_ebita_confidence"
];

const FORBIDDEN_LANGUAGE_PATTERNS = [
  /AI proved ROI/i,
  /AI caused EBITA/i,
  /AI saved \$?\d/i,
  /usage proves EBITA/i,
  /headcount reduction/i,
  /employees? (?:became|more) productive/i,
  /manager'?s team is underperforming/i
];

const FORBIDDEN_KEY_PATTERNS = [
  /(^|_)user(_|$)/i,
  /email/i,
  /employee/i,
  /manager/i,
  /person/i,
  /prompt/i,
  /response/i,
  /transcript/i,
  /file_content/i,
  /ticket_text/i,
  /raw_/i,
  /direct_identifiers/i,
  /hris/i,
  /individual/i,
  /productivity_measurement/i,
  /productivity_ranking/i,
  /people_decisioning/i,
  /compensation_or_performance_inference/i
];

const FORBIDDEN_KEY_SCAN_EXEMPTIONS = new Set([
  "safe_language",
  "financial_translation_policy"
]);

export interface EbitaBridgeValidationResult {
  schema_version: string;
  ebita_bridge_id: string | null;
  workflow_family: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    executive_readout: boolean;
    customer_facing_economic_output: boolean;
  };
}

export interface BuildEbitaBridgeInputs {
  blueprint: any;
  metricsLibrary: any;
  valueScenario: any;
  readiness: any;
  claimBoundary: any;
  roiScenario: any;
  ebitaBridgeId?: string;
}

function requireField(value: any, path: string, gaps: string[]): void {
  if (value === undefined || value === null || value === "") {
    gaps.push(`${path} is missing`);
  }
}

function requireFalse(value: any, path: string, gaps: string[]): void {
  if (value !== false) gaps.push(`${path} must be false`);
}

function requireTrue(value: any, path: string, gaps: string[]): void {
  if (value !== true) gaps.push(`${path} must be true`);
}

function arrayOf(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values: any[]): string[] {
  return [...new Set(values.filter(Boolean).map(String))];
}

function translationMode(bridge: any): string {
  return String(bridge?.financial_translation_policy?.mode ?? "");
}

function safeLanguageContainsForbiddenPhrase(phrases: any[]): boolean {
  return phrases.some((phrase) =>
    FORBIDDEN_LANGUAGE_PATTERNS.some((pattern) => pattern.test(String(phrase)))
  );
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

function roiGate(context: any): any {
  return context?.roiScenario?.financial_claim_gate ?? null;
}

function sourceAllowsCustomerFacing(context: any): boolean {
  const gate = roiGate(context);
  return Boolean(
    gate?.mode === "CUSTOMER_FACING_APPROVED" &&
      gate?.allowed_outputs?.customer_facing_economic_output === true &&
      gate?.data_sufficiency?.finance_owner_attested === true &&
      gate?.data_sufficiency?.legal_or_governance_approved === true
  );
}

function sourceAllowsCausality(context: any): boolean {
  const gate = roiGate(context);
  return Boolean(
    gate?.allowed_outputs?.causality_language === true &&
      gate?.data_sufficiency?.experimental_or_quasi_experimental_design === true
  );
}

function sourceAllowsFinanceValidated(context: any): boolean {
  const gate = roiGate(context);
  return Boolean(
    ["FINANCE_VALIDATED", "CUSTOMER_FACING_APPROVED"].includes(String(gate?.mode ?? "")) &&
      gate?.data_sufficiency?.finance_owner_attested === true &&
      gate?.data_sufficiency?.financial_assumptions_present === true
  );
}

function sourceAllowsRealizedFinancialClaim(context: any): boolean {
  const gate = roiGate(context);
  return Boolean(
    sourceAllowsFinanceValidated(context) &&
      gate?.allowed_outputs?.realized_roi_calculation === true &&
      gate?.data_sufficiency?.aggregate_only === true &&
      gate?.data_sufficiency?.baseline_present === true &&
      gate?.data_sufficiency?.comparison_present === true &&
      gate?.data_sufficiency?.outcome_metric_accepted === true &&
      gate?.data_sufficiency?.investment_costs_present === true &&
      gate?.data_sufficiency?.confounds_reviewed === true
  );
}

function collectTopLevelGaps(bridge: any): string[] {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "ebita_bridge_id",
    "source_refs",
    "workflow",
    "ebita_levers",
    "financial_translation_policy",
    "evidence_quality",
    "safe_language"
  ]) {
    requireField(bridge?.[field], field, gaps);
  }
  if (bridge?.schema_version && bridge.schema_version !== EBITA_BRIDGE_SCHEMA_VERSION) {
    gaps.push(`schema_version is invalid: ${bridge.schema_version}`);
  }
  return gaps;
}

function collectSourceRefGaps(bridge: any): string[] {
  const gaps: string[] = [];
  const refs = bridge?.source_refs ?? {};
  for (const field of [
    "blueprint_id",
    "metrics_library_id",
    "value_scenario_id",
    "readiness_id",
    "claim_boundary_id",
    "roi_scenario_id"
  ]) {
    requireField(refs[field], `source_refs.${field}`, gaps);
  }
  return gaps;
}

function collectWorkflowGaps(bridge: any): string[] {
  const gaps: string[] = [];
  const workflow = bridge?.workflow ?? {};
  for (const field of [
    "workflow_family",
    "workflow_name",
    "function",
    "value_routes",
    "baseline_window",
    "comparison_window"
  ]) {
    requireField(workflow[field], `workflow.${field}`, gaps);
  }
  if (!Array.isArray(workflow.value_routes) || workflow.value_routes.length === 0) {
    gaps.push("workflow.value_routes must include at least one route");
  }
  return gaps;
}

function collectLeverGaps(bridge: any): string[] {
  const gaps: string[] = [];
  const levers = bridge?.ebita_levers;
  const mode = translationMode(bridge);
  if (!Array.isArray(levers)) {
    gaps.push("ebita_levers must be an array");
    return gaps;
  }
  if (levers.length === 0 && mode !== "NO_FINANCIAL_TRANSLATION") {
    gaps.push("ebita_levers must include at least one lever");
  }
  levers.forEach((lever: any, index: number) => {
    const prefix = `ebita_levers[${index}]`;
    for (const field of [
      "lever_id",
      "value_route",
      "ebita_driver",
      "business_metric_id",
      "financial_assumption_ids",
      "evidence_level",
      "claim_level"
    ]) {
      requireField(lever?.[field], `${prefix}.${field}`, gaps);
    }
    if (lever?.ebita_driver && !ALLOWED_EBITA_DRIVERS.has(lever.ebita_driver)) {
      gaps.push(`${prefix}.ebita_driver is invalid: ${lever.ebita_driver}`);
    }
    if (
      lever?.value_route &&
      lever?.ebita_driver &&
      !arrayOf(VALUE_ROUTE_TO_EBITA_DRIVERS[lever.value_route]).includes(lever.ebita_driver)
    ) {
      gaps.push(
        `${prefix}.ebita_driver ${lever.ebita_driver} is not allowed for value_route ${lever.value_route}`
      );
    }
    if (lever?.evidence_level && !ALLOWED_EVIDENCE_LEVELS.has(lever.evidence_level)) {
      gaps.push(`${prefix}.evidence_level is invalid: ${lever.evidence_level}`);
    }
    if (lever?.claim_level && !ALLOWED_CLAIM_LEVELS.has(lever.claim_level)) {
      gaps.push(`${prefix}.claim_level is invalid: ${lever.claim_level}`);
    }
    if (
      MODED_CLAIM_LEVELS_REQUIRING_ASSUMPTIONS.has(String(lever?.claim_level)) &&
      (!Array.isArray(lever?.financial_assumption_ids) ||
        lever.financial_assumption_ids.length === 0)
    ) {
      gaps.push(
        `${prefix}.financial_assumption_ids must include at least one assumption for ${lever.claim_level}`
      );
    }
  });
  return gaps;
}

function collectEvidenceQualityGaps(bridge: any): string[] {
  const gaps: string[] = [];
  const quality = bridge?.evidence_quality ?? {};
  for (const field of EVIDENCE_FIELDS) {
    requireField(quality[field], `evidence_quality.${field}`, gaps);
    if (quality[field] && !ALLOWED_EVIDENCE_LEVELS.has(quality[field])) {
      gaps.push(`evidence_quality.${field} is invalid: ${quality[field]}`);
    }
  }
  return gaps;
}

function collectPolicyGaps(bridge: any, context: any): string[] {
  const gaps: string[] = [];
  const policy = bridge?.financial_translation_policy ?? {};
  const quality = bridge?.evidence_quality ?? {};
  const mode = translationMode(bridge);
  requireField(policy.mode, "financial_translation_policy.mode", gaps);
  if (policy.mode && !ALLOWED_TRANSLATION_MODES.has(policy.mode)) {
    gaps.push(`financial_translation_policy.mode is invalid: ${policy.mode}`);
  }

  if (mode === "NO_FINANCIAL_TRANSLATION") {
    if (policy.realized_ebita_claim_allowed !== false) {
      gaps.push(
        "financial_translation_policy.realized_ebita_claim_allowed must be false for NO_FINANCIAL_TRANSLATION"
      );
    }
    if (policy.causality_claim_allowed !== false) {
      gaps.push(
        "financial_translation_policy.causality_claim_allowed must be false for NO_FINANCIAL_TRANSLATION"
      );
    }
    if (policy.customer_facing_allowed !== false) {
      gaps.push(
        "financial_translation_policy.customer_facing_allowed must be false for NO_FINANCIAL_TRANSLATION"
      );
    }
  }

  if (mode === "DIRECTIONAL_EBITA_BRIDGE") {
    requireFalse(
      policy.realized_ebita_claim_allowed,
      "financial_translation_policy.realized_ebita_claim_allowed",
      gaps
    );
    requireFalse(
      policy.customer_facing_allowed,
      "financial_translation_policy.customer_facing_allowed",
      gaps
    );
  }

  if (mode === "MODELED_EBITA_SCENARIO") {
    if (policy.customer_owned_financials_required !== true) {
      gaps.push(
        "financial_translation_policy.customer_owned_financials_required must be true for MODELED_EBITA_SCENARIO"
      );
    }
    if (!["SUPPORTED", "FINANCE_VALIDATED"].includes(String(quality.financial_evidence))) {
      gaps.push(
        "evidence_quality.financial_evidence must be SUPPORTED or FINANCE_VALIDATED for MODELED_EBITA_SCENARIO"
      );
    }
    requireFalse(
      policy.realized_ebita_claim_allowed,
      "financial_translation_policy.realized_ebita_claim_allowed",
      gaps
    );
    requireFalse(
      policy.customer_facing_allowed,
      "financial_translation_policy.customer_facing_allowed",
      gaps
    );
  }

  if (mode === "FINANCE_VALIDATED_EBITA_CASE") {
    requireTrue(
      policy.customer_owned_financials_required,
      "financial_translation_policy.customer_owned_financials_required for FINANCE_VALIDATED_EBITA_CASE",
      gaps
    );
    if (quality.financial_evidence !== "FINANCE_VALIDATED") {
      gaps.push(
        "evidence_quality.financial_evidence must be FINANCE_VALIDATED for FINANCE_VALIDATED_EBITA_CASE"
      );
    }
    if (quality.overall_ebita_confidence !== "FINANCE_VALIDATED") {
      gaps.push(
        "evidence_quality.overall_ebita_confidence must be FINANCE_VALIDATED for FINANCE_VALIDATED_EBITA_CASE"
      );
    }
    if (!sourceAllowsFinanceValidated(context)) {
      gaps.push(
        "source roiScenario financial_claim_gate.mode must be FINANCE_VALIDATED or CUSTOMER_FACING_APPROVED for finance-validated EBITA output"
      );
    }
  }

  if (policy.realized_ebita_claim_allowed === true) {
    gaps.push("financial_translation_policy.realized_ebita_claim_allowed must be false");
  }
  if (policy.realized_ebita_claim_allowed === true && !sourceAllowsRealizedFinancialClaim(context)) {
    gaps.push(
      "source roiScenario financial_claim_gate.allowed_outputs.realized_roi_calculation must be approved for realized EBITA language"
    );
  }

  if (mode === "CUSTOMER_FACING_APPROVED") {
    gaps.push("CUSTOMER_FACING_APPROVED is not authorized for EBITA bridge output");
    requireFalse(
      policy.realized_ebita_claim_allowed,
      "financial_translation_policy.realized_ebita_claim_allowed for CUSTOMER_FACING_APPROVED",
      gaps
    );
    requireFalse(
      policy.customer_facing_allowed,
      "financial_translation_policy.customer_facing_allowed for CUSTOMER_FACING_APPROVED",
      gaps
    );
    if (quality.financial_evidence !== "FINANCE_VALIDATED") {
      gaps.push(
        "evidence_quality.financial_evidence must be FINANCE_VALIDATED for CUSTOMER_FACING_APPROVED"
      );
    }
    if (quality.overall_ebita_confidence !== "FINANCE_VALIDATED") {
      gaps.push(
        "evidence_quality.overall_ebita_confidence must be FINANCE_VALIDATED for CUSTOMER_FACING_APPROVED"
      );
    }
    if (!sourceAllowsCustomerFacing(context)) {
      gaps.push(
        "source roiScenario financial_claim_gate.mode must be CUSTOMER_FACING_APPROVED for customer-facing EBITA output"
      );
    }
  }

  if (policy.causality_claim_allowed === true && !sourceAllowsCausality(context)) {
    gaps.push("source roiScenario causality gate must be approved when causality_claim_allowed is true");
  }

  return gaps;
}

function collectSafeLanguageGaps(bridge: any): string[] {
  const gaps: string[] = [];
  const safeLanguage = bridge?.safe_language ?? {};
  const mode = translationMode(bridge);
  if (
    !Array.isArray(safeLanguage.allowed_phrases) ||
    safeLanguage.allowed_phrases.length === 0
  ) {
    gaps.push("safe_language.allowed_phrases must include at least one phrase");
  } else if (safeLanguageContainsForbiddenPhrase(safeLanguage.allowed_phrases)) {
    gaps.push("safe_language.allowed_phrases contains forbidden EBITA claim language");
  }
  if (
    mode !== "NO_FINANCIAL_TRANSLATION" &&
    (!Array.isArray(safeLanguage.required_caveats) ||
      safeLanguage.required_caveats.length === 0)
  ) {
    gaps.push("safe_language.required_caveats must include at least one caveat");
  }
  const blockedClaims = new Set(safeLanguage.blocked_claims ?? []);
  for (const claim of REQUIRED_BLOCKED_CLAIMS) {
    if (!blockedClaims.has(claim)) {
      gaps.push(`safe_language.blocked_claims missing ${claim}`);
    }
  }
  return gaps;
}

function collectForbiddenFieldGaps(bridge: any): string[] {
  return [...collectForbiddenFields(bridge)]
    .sort()
    .map((field) => `Forbidden field detected: ${field}`);
}

export function validateEbitaBridge(
  bridge: any,
  context?: { roiScenario?: any }
): EbitaBridgeValidationResult {
  const gaps = [
    ...collectTopLevelGaps(bridge),
    ...collectSourceRefGaps(bridge),
    ...collectWorkflowGaps(bridge),
    ...collectLeverGaps(bridge),
    ...collectEvidenceQualityGaps(bridge),
    ...collectPolicyGaps(bridge, context ?? {}),
    ...collectSafeLanguageGaps(bridge),
    ...collectForbiddenFieldGaps(bridge)
  ];
  const mode = translationMode(bridge);
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    ebita_bridge_id: bridge?.ebita_bridge_id ?? null,
    workflow_family: bridge?.workflow?.workflow_family ?? null,
    valid: gaps.length === 0,
    gaps,
    feeds: {
      executive_readout: gaps.length === 0 && mode !== "NO_FINANCIAL_TRANSLATION",
      customer_facing_economic_output:
        gaps.length === 0 &&
        mode === "CUSTOMER_FACING_APPROVED" &&
        bridge?.financial_translation_policy?.customer_facing_allowed === true
    }
  };
}

function valueRoutesFrom(inputs: BuildEbitaBridgeInputs): string[] {
  const blueprintRoutes = inputs.blueprint?.value_routes ?? {};
  const routes = [
    blueprintRoutes.primary,
    ...arrayOf(blueprintRoutes.secondary),
    inputs.valueScenario?.input?.value_route,
    inputs.roiScenario?.workflow?.value_route,
    inputs.readiness?.value_route
  ];
  return uniqueStrings(routes.length > 0 ? routes : ["UNCLASSIFIED"]);
}

function metricIdForRoute(inputs: BuildEbitaBridgeInputs, valueRoute: string): string {
  const scenarioMetric = arrayOf(inputs.valueScenario?.input?.metric_references).find(
    (metric: any) => metric?.value_route === valueRoute
  );
  const libraryMetric = arrayOf(inputs.metricsLibrary?.metrics).find(
    (metric: any) => metric?.value_route === valueRoute
  );
  return String(
    scenarioMetric?.metric_id ??
      libraryMetric?.metric_id ??
      arrayOf(inputs.valueScenario?.input?.metric_references)[0]?.metric_id ??
      "customer_owned_business_metric"
  );
}

function bridgeModeFromRoiScenario(roiScenario: any): string {
  const gate = roiScenario?.financial_claim_gate;
  if (!gate || gate.mode === "BLOCKED") return "NO_FINANCIAL_TRANSLATION";
  if (gate.mode === "CUSTOMER_FACING_APPROVED") return "CUSTOMER_FACING_APPROVED";
  if (gate.mode === "FINANCE_VALIDATED") return "FINANCE_VALIDATED_EBITA_CASE";
  if (
    gate.mode === "INTERNAL_MODELING" &&
    gate?.data_sufficiency?.financial_assumptions_present === true &&
    gate?.data_sufficiency?.outcome_metric_accepted === true
  ) {
    return "MODELED_EBITA_SCENARIO";
  }
  return "DIRECTIONAL_EBITA_BRIDGE";
}

function evidenceQualityForMode(mode: string): any {
  if (mode === "CUSTOMER_FACING_APPROVED" || mode === "FINANCE_VALIDATED_EBITA_CASE") {
    return {
      adoption_evidence: "SUPPORTED",
      workflow_evidence: "SUPPORTED",
      outcome_evidence: "SUPPORTED",
      financial_evidence: "FINANCE_VALIDATED",
      overall_ebita_confidence: "FINANCE_VALIDATED"
    };
  }
  if (mode === "MODELED_EBITA_SCENARIO") {
    return {
      adoption_evidence: "SUPPORTED",
      workflow_evidence: "SUPPORTED",
      outcome_evidence: "SUPPORTED",
      financial_evidence: "SUPPORTED",
      overall_ebita_confidence: "SUPPORTED"
    };
  }
  if (mode === "DIRECTIONAL_EBITA_BRIDGE") {
    return {
      adoption_evidence: "SUPPORTED",
      workflow_evidence: "SUPPORTED",
      outcome_evidence: "CAVEATED",
      financial_evidence: "CAVEATED",
      overall_ebita_confidence: "CAVEATED"
    };
  }
  return {
    adoption_evidence: "MISSING",
    workflow_evidence: "MISSING",
    outcome_evidence: "MISSING",
    financial_evidence: "MISSING",
    overall_ebita_confidence: "BLOCKED"
  };
}

function claimLevelForMode(mode: string): string {
  if (mode === "CUSTOMER_FACING_APPROVED") return "CUSTOMER_FACING_APPROVED";
  if (mode === "FINANCE_VALIDATED_EBITA_CASE") return "FINANCE_VALIDATED_EBITA_CASE";
  if (mode === "MODELED_EBITA_SCENARIO") return "MODELED_EBITA_SCENARIO";
  if (mode === "DIRECTIONAL_EBITA_BRIDGE") return "DIRECTIONAL_EBITA_LEVER";
  return "NO_EBITA_CLAIM";
}

function policyForMode(mode: string): any {
  return {
    mode,
    customer_owned_financials_required: [
      "MODELED_EBITA_SCENARIO",
      "FINANCE_VALIDATED_EBITA_CASE",
      "CUSTOMER_FACING_APPROVED"
    ].includes(mode),
    realized_ebita_claim_allowed: false,
    causality_claim_allowed: false,
    customer_facing_allowed: false
  };
}

function safeLanguageForMode(mode: string): any {
  if (mode === "NO_FINANCIAL_TRANSLATION") {
    return {
      allowed_phrases: ["No EBITA translation is available for this workflow yet."],
      required_caveats: [],
      blocked_claims: REQUIRED_BLOCKED_CLAIMS
    };
  }
  if (mode === "MODELED_EBITA_SCENARIO") {
    return {
      allowed_phrases: [
        "Customer-owned financial assumptions support a modeled EBITA scenario.",
        "This is a modeled scenario, not proven EBITA impact."
      ],
      required_caveats: ["Actual dollar math remains customer-owned and finance-reviewed."],
      blocked_claims: REQUIRED_BLOCKED_CLAIMS
    };
  }
  if (mode === "FINANCE_VALIDATED_EBITA_CASE") {
    return {
      allowed_phrases: [
        "Finance-attested assumptions support a finance-validated EBITA case for this workflow and window."
      ],
      required_caveats: ["This does not establish causality unless a separate causal design is approved."],
      blocked_claims: REQUIRED_BLOCKED_CLAIMS
    };
  }
  if (mode === "CUSTOMER_FACING_APPROVED") {
    return {
      allowed_phrases: [
        "This economic output remains internal-review only; customer-facing use requires a later exact-scope governance decision."
      ],
      required_caveats: ["Do not use as customer-facing economic output."],
      blocked_claims: REQUIRED_BLOCKED_CLAIMS
    };
  }
  return {
    allowed_phrases: [
      "This workflow may affect EBITA through identified financial levers.",
      "No realized EBITA claim is made."
    ],
    required_caveats: ["This is a directional bridge, not proven EBITA impact."],
    blocked_claims: REQUIRED_BLOCKED_CLAIMS
  };
}

export function buildEbitaBridgeFromValueObjects(inputs: BuildEbitaBridgeInputs): any {
  const workflowFamily =
    inputs.blueprint?.workflow_family ??
    inputs.valueScenario?.input?.workflow_family ??
    inputs.readiness?.workflow_family ??
    inputs.roiScenario?.workflow?.workflow_family ??
    "unknown_workflow";
  const routes = valueRoutesFrom(inputs);
  const mode = bridgeModeFromRoiScenario(inputs.roiScenario);
  const claimLevel = claimLevelForMode(mode);
  const evidenceQuality = evidenceQualityForMode(mode);
  const levers =
    mode === "NO_FINANCIAL_TRANSLATION"
      ? []
      : routes.flatMap((route) =>
          arrayOf(VALUE_ROUTE_TO_EBITA_DRIVERS[route]).map((driver: string) => ({
            lever_id: `lever_${String(route).toLowerCase()}_${driver.toLowerCase()}_v1`,
            value_route: route,
            ebita_driver: driver,
            business_metric_id: metricIdForRoute(inputs, route),
            financial_assumption_ids:
              claimLevel === "DIRECTIONAL_EBITA_LEVER" ? [] : ["customer_owned_financial_assumption"],
            evidence_level: evidenceQuality.overall_ebita_confidence,
            claim_level: claimLevel
          }))
        );

  return {
    schema_version: EBITA_BRIDGE_SCHEMA_VERSION,
    ebita_bridge_id:
      inputs.ebitaBridgeId ?? `ebita_bridge_${workflowFamily}_${String(routes[0] ?? "unclassified").toLowerCase()}_v1`,
    source_refs: {
      blueprint_id: inputs.blueprint?.blueprint_id ?? null,
      metrics_library_id: inputs.metricsLibrary?.library_id ?? null,
      value_scenario_id: inputs.valueScenario?.scenario_id ?? null,
      readiness_id: inputs.readiness?.readiness_id ?? null,
      claim_boundary_id: inputs.claimBoundary?.claim_boundary_id ?? null,
      roi_scenario_id: inputs.roiScenario?.roi_scenario_id ?? null
    },
    workflow: {
      workflow_family: workflowFamily,
      workflow_name:
        inputs.blueprint?.workflow_name ??
        inputs.roiScenario?.workflow?.workflow_name ??
        String(workflowFamily).replace(/_/g, " "),
      function: inputs.blueprint?.business_owner?.role ?? "customer_owned_function",
      value_routes: routes,
      baseline_window:
        inputs.blueprint?.windows?.baseline ??
        inputs.roiScenario?.baseline_comparison?.baseline_window?.rule ??
        "customer_owned_baseline_window",
      comparison_window:
        inputs.blueprint?.windows?.comparison ??
        inputs.roiScenario?.baseline_comparison?.comparison_window?.rule ??
        "customer_owned_comparison_window"
    },
    ebita_levers: levers,
    financial_translation_policy: policyForMode(mode),
    evidence_quality: evidenceQuality,
    safe_language: safeLanguageForMode(mode)
  };
}
