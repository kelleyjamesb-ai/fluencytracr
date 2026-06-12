/**
 * AI Value Engine — Governed ROI Scenario contract.
 *
 * This stage sits above value scenarios and evidence readiness. It creates a
 * stricter value-modeling artifact for planning conversations. Person-level
 * and raw-content claims remain hard-blocked; financial and aggregate workforce
 * outputs require explicit gates before they can be surfaced.
 */

const RESULT_SCHEMA_VERSION = "FT_AI_VALUE_ROI_SCENARIO_VALIDATION_2026_06";
export const ROI_SCENARIO_SCHEMA_VERSION = "FT_AI_VALUE_ROI_SCENARIO_2026_06";

const ALLOWED_VALUE_ROUTES = new Set([
  "COST_REDUCTION",
  "CAPACITY_CREATION",
  "QUALITY_IMPROVEMENT",
  "RISK_REDUCTION",
  "EXPERIENCE_IMPROVEMENT",
  "REVENUE_EXPANSION",
  "UNCLASSIFIED"
]);

const ALLOWED_STATES = new Set([
  "PRESENT",
  "CAVEATED",
  "MISSING",
  "SUPPRESSED",
  "BLOCKED"
]);

const ALLOWED_REVIEW_STATES = new Set([
  "ACCEPTED",
  "SUBMITTED",
  "REJECTED",
  "MISSING"
]);

const ALLOWED_READINESS_DECISIONS = new Set([
  "READY_FOR_EXECUTIVE_VALIDATION",
  "HOLD_FOR_ASSUMPTIONS",
  "HOLD_FOR_SOURCE_COVERAGE",
  "HOLD_FOR_BASELINE",
  "STOP_FOR_GOVERNANCE_REVIEW"
]);

const ALLOWED_CLAIM_LEVELS = new Set([
  "CAVEATED_VALUE_INVESTIGATION",
  "SOURCE_READINESS_ONLY",
  "INTERNAL_ONLY",
  "BLOCKED"
]);

const ALLOWED_MODEL_ROLES = new Set(["PRIMARY", "CONTEXT", "GUARDRAIL"]);
const REQUIRED_SCENARIO_BANDS = ["CONSERVATIVE", "BASE_CASE", "EXPANDED"];

const REQUIRED_COVERAGE_LANES = [
  "ai_activity",
  "workflow",
  "outcome",
  "baseline",
  "trust",
  "assumptions",
  "suppression"
];

const LEGACY_REQUIRED_BLOCKED_CLAIMS = [
  "roi_proof",
  "causality_claim",
  "individual_scoring",
  "team_or_manager_ranking",
  "hr_analytics",
  "productivity_measurement",
  "realized_roi_calculation",
  "customer_facing_economic_output"
];

const ALWAYS_BLOCKED_CLAIMS = [
  "individual_scoring",
  "named_employee_productivity",
  "individual_productivity_measurement",
  "team_or_manager_ranking",
  "productivity_ranking",
  "people_decisioning",
  "compensation_or_performance_inference",
  "hris_inference",
  "raw_prompt_or_response_storage",
  "direct_identifiers",
  "raw_content_storage"
];

const LEGACY_GOVERNANCE_BOUNDARIES = [
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

const PLATFORM_GOVERNANCE_BOUNDARIES = [
  "production_connector",
  "dashboard",
  "runtime_service",
  "autonomous_customer_actions"
];

const ALWAYS_BLOCKED_GOVERNANCE_BOUNDARIES = [
  ...PLATFORM_GOVERNANCE_BOUNDARIES,
  ...ALWAYS_BLOCKED_CLAIMS
];

const ECONOMIC_OUTPUT_FLAGS = [
  "customer_facing_economic_output",
  "dollarized_output",
  "realized_roi_calculation"
];

const ALLOWED_FINANCIAL_CLAIM_GATE_MODES = new Set([
  "BLOCKED",
  "INTERNAL_MODELING",
  "EXECUTIVE_CAVEATED",
  "FINANCE_VALIDATED",
  "CUSTOMER_FACING_APPROVED"
]);

const ALLOWED_WORKFORCE_ANALYTICS_GATE_MODES = new Set([
  "BLOCKED",
  "AGGREGATE_INTERNAL",
  "EXECUTIVE_CAVEATED",
  "FINANCE_OR_HR_ATTESTED"
]);

const FINANCIAL_GATE_REQUIREMENTS: Record<string, string[]> = {
  dollarized_output: [
    "aggregate_only",
    "outcome_metric_accepted",
    "financial_assumptions_present"
  ],
  realized_roi_calculation: [
    "aggregate_only",
    "baseline_present",
    "comparison_present",
    "outcome_metric_accepted",
    "financial_assumptions_present",
    "investment_costs_present",
    "finance_owner_attested",
    "confounds_reviewed"
  ],
  customer_facing_economic_output: [
    "finance_owner_attested",
    "legal_or_governance_approved"
  ],
  causality_language: [
    "experimental_or_quasi_experimental_design"
  ],
  aggregate_workflow_productivity: [
    "aggregate_only",
    "baseline_present",
    "comparison_present",
    "outcome_metric_accepted"
  ]
};

const FINANCIAL_OUTPUT_TO_LEGACY_BOUNDARY: Record<string, string> = {
  realized_roi_calculation: "realized_roi_calculation",
  customer_facing_economic_output: "customer_facing_economic_output",
  causality_language: "causality_claim",
  aggregate_workflow_productivity: "aggregate_workflow_productivity",
  dollarized_output: "dollarized_output"
};

const FINANCIAL_OUTPUT_FIELD_PATTERNS: Record<string, RegExp[]> = {
  dollarized_output: [
    /dollar/i,
    /currency/i,
    /savings_amount/i
  ],
  realized_roi_calculation: [
    /actual_roi/i,
    /realized_roi/i,
    /roi_calculation/i
  ],
  causality_language: [
    /causal/i,
    /causality_claim/i
  ],
  aggregate_workflow_productivity: [
    /^aggregate_workflow_productivity$/i
  ]
};

const WORKFORCE_ANALYTICS_OUTPUTS = [
  "aggregate_workforce_readiness",
  "aggregate_enablement_coverage",
  "aggregate_training_completion",
  "aggregate_ai_confidence",
  "aggregate_change_readiness",
  "aggregate_workflow_capacity",
  "aggregate_role_family_adoption"
];

const WORKFORCE_SAFETY_REQUIREMENTS = [
  "aggregate_only",
  "minimum_cohort_size_met",
  "no_direct_identifiers",
  "no_manager_ranking",
  "no_individual_decisioning",
  "no_sensitive_attribute_inference"
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
  /productivity_ranking/i,
  /people_decisioning/i,
  /compensation_or_performance_inference/i
];

const FORBIDDEN_CLAIM_PATTERNS = [
  /prov(?:ed|es) ROI/i,
  /caused productivity/i,
  /caused .*lift/i,
  /saved money/i,
  /saved \$?\d/i,
  /employee/i,
  /manager/i,
  /team .*better/i
];

const FORBIDDEN_KEY_SCAN_EXEMPTIONS = new Set([
  "safe_value_language",
  "blocked_claims",
  "economic_output_policy",
  "financial_claim_gate",
  "workforce_analytics_gate",
  "governance_boundaries"
]);

export interface RoiScenarioValidationResult {
  schema_version: string;
  roi_scenario_id: string | null;
  workflow_family: string | null;
  value_route: string | null;
  evidence_status: {
    readiness_decision: string | null;
    outcome_evidence_review_state: string | null;
  };
  valid: boolean;
  gaps: string[];
  feeds: {
    value_modeling: boolean;
    executive_readout: boolean;
    customer_facing_economic_output: boolean;
  };
}

export interface BuildRoiScenarioInputs {
  blueprint: any;
  metricsLibrary: any;
  valueScenario: any;
  readiness: any;
  outcomeEvidenceReviewState?: string;
  roiScenarioId?: string;
}

function requireField(value: any, path: string, gaps: string[]): void {
  if (value === undefined || value === null || value === "") {
    gaps.push(`${path} is missing`);
  }
}

function requireTrue(value: any, path: string, gaps: string[]): void {
  if (value !== true) {
    gaps.push(path);
  }
}

function isForbiddenKey(key: string): boolean {
  return FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function requestedFinancialOutputForKey(key: string): string | null {
  for (const [output, patterns] of Object.entries(FINANCIAL_OUTPUT_FIELD_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(key))) return output;
  }
  return null;
}

function collectFinancialOutputFields(
  value: any,
  outputs: Set<string> = new Set()
): Set<string> {
  if (!value || typeof value !== "object") return outputs;
  if (Array.isArray(value)) {
    value.forEach((item) => collectFinancialOutputFields(item, outputs));
    return outputs;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_KEY_SCAN_EXEMPTIONS.has(key)) continue;
    const output = requestedFinancialOutputForKey(key);
    if (output) outputs.add(output);
    collectFinancialOutputFields(nested, outputs);
  }
  return outputs;
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

function containsForbiddenClaimLanguage(claims: any): boolean {
  return (claims ?? []).some((claim: any) =>
    FORBIDDEN_CLAIM_PATTERNS.some((pattern) => pattern.test(String(claim)))
  );
}

function normalizeState(state: any): string {
  return String(state ?? "MISSING").toUpperCase();
}

function hasGateModel(scenario: any): boolean {
  return Boolean(scenario?.financial_claim_gate || scenario?.workforce_analytics_gate);
}

function governanceBoundariesFor(scenario: any): string[] {
  return hasGateModel(scenario)
    ? ALWAYS_BLOCKED_GOVERNANCE_BOUNDARIES
    : LEGACY_GOVERNANCE_BOUNDARIES;
}

function requiredBlockedClaimsFor(scenario: any): string[] {
  return hasGateModel(scenario)
    ? ALWAYS_BLOCKED_CLAIMS
    : LEGACY_REQUIRED_BLOCKED_CLAIMS;
}

function financialOutputRequested(scenario: any, output: string): boolean {
  const gate = scenario?.financial_claim_gate ?? {};
  const policy = scenario?.economic_output_policy ?? {};
  const boundary = FINANCIAL_OUTPUT_TO_LEGACY_BOUNDARY[output];
  return Boolean(
    gate?.allowed_outputs?.[output] === true ||
    policy?.[output] === true ||
    (boundary && scenario?.governance_boundaries?.[boundary] === true) ||
    collectFinancialOutputFields(scenario).has(output)
  );
}

function workforceOutputRequested(scenario: any, output: string): boolean {
  return scenario?.workforce_analytics_gate?.allowed_outputs?.[output] === true;
}

function firstMetric(metricsLibrary: any, metricId: any): any {
  return (metricsLibrary?.metrics ?? []).find((metric: any) => metric.metric_id === metricId) ?? null;
}

function collectTopLevelGaps(scenario: any): string[] {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "roi_scenario_id",
    "source_refs",
    "workflow",
    "evidence_status",
    "baseline_comparison",
    "metric_models",
    "customer_owned_assumptions",
    "scenario_bands",
    "safe_value_language",
    "economic_output_policy",
    "governance_boundaries"
  ]) {
    requireField(scenario?.[field], field, gaps);
  }
  if (scenario?.schema_version &&
      scenario.schema_version !== ROI_SCENARIO_SCHEMA_VERSION) {
    gaps.push(`schema_version is invalid: ${scenario.schema_version}`);
  }
  return gaps;
}

function collectSourceRefGaps(scenario: any): string[] {
  const gaps: string[] = [];
  const refs = scenario?.source_refs ?? {};
  for (const field of [
    "blueprint_id",
    "metrics_library_id",
    "value_scenario_id",
    "readiness_id"
  ]) {
    requireField(refs[field], `source_refs.${field}`, gaps);
  }
  return gaps;
}

function collectWorkflowGaps(scenario: any): string[] {
  const gaps: string[] = [];
  const workflow = scenario?.workflow ?? {};
  requireField(workflow.workflow_family, "workflow.workflow_family", gaps);
  requireField(workflow.workflow_name, "workflow.workflow_name", gaps);
  requireField(workflow.value_route, "workflow.value_route", gaps);
  if (workflow.value_route && !ALLOWED_VALUE_ROUTES.has(workflow.value_route)) {
    gaps.push(`workflow.value_route is invalid: ${workflow.value_route}`);
  }
  return gaps;
}

function collectEvidenceStatusGaps(scenario: any): string[] {
  const gaps: string[] = [];
  const status = scenario?.evidence_status ?? {};
  requireField(status.readiness_decision, "evidence_status.readiness_decision", gaps);
  requireField(
    status.outcome_evidence_review_state,
    "evidence_status.outcome_evidence_review_state",
    gaps
  );
  if (
    status.readiness_decision &&
    !ALLOWED_READINESS_DECISIONS.has(status.readiness_decision)
  ) {
    gaps.push(`evidence_status.readiness_decision is invalid: ${status.readiness_decision}`);
  }
  if (
    status.outcome_evidence_review_state &&
    !ALLOWED_REVIEW_STATES.has(status.outcome_evidence_review_state)
  ) {
    gaps.push(
      `evidence_status.outcome_evidence_review_state is invalid: ${status.outcome_evidence_review_state}`
    );
  }
  const coverage = status.source_coverage ?? {};
  for (const lane of REQUIRED_COVERAGE_LANES) {
    requireField(coverage[lane], `evidence_status.source_coverage.${lane}`, gaps);
    if (coverage[lane] && !ALLOWED_STATES.has(coverage[lane])) {
      gaps.push(`evidence_status.source_coverage.${lane} is invalid: ${coverage[lane]}`);
    }
  }
  return gaps;
}

function collectWindowGaps(scenario: any): string[] {
  const gaps: string[] = [];
  const windows = scenario?.baseline_comparison ?? {};
  for (const windowName of ["baseline_window", "comparison_window"]) {
    const window = windows[windowName] ?? {};
    requireField(window.state, `baseline_comparison.${windowName}.state`, gaps);
    requireField(window.owner, `baseline_comparison.${windowName}.owner`, gaps);
    requireField(window.rule, `baseline_comparison.${windowName}.rule`, gaps);
    if (window.state && !ALLOWED_STATES.has(window.state)) {
      gaps.push(`baseline_comparison.${windowName}.state is invalid: ${window.state}`);
    }
  }
  return gaps;
}

function collectMetricModelGaps(scenario: any): string[] {
  const gaps: string[] = [];
  if (!Array.isArray(scenario?.metric_models) || scenario.metric_models.length === 0) {
    gaps.push("metric_models must include at least one metric model");
    return gaps;
  }
  scenario.metric_models.forEach((metric: any, index: number) => {
    const prefix = `metric_models[${index}]`;
    for (const field of [
      "metric_id",
      "name",
      "value_route",
      "measurement_unit",
      "source_system",
      "baseline_rule",
      "comparison_rule",
      "formula_template",
      "allowed_claim_level",
      "value_model_role"
    ]) {
      requireField(metric?.[field], `${prefix}.${field}`, gaps);
    }
    if (metric?.allowed_claim_level &&
        !ALLOWED_CLAIM_LEVELS.has(metric.allowed_claim_level)) {
      gaps.push(`${prefix}.allowed_claim_level is invalid: ${metric.allowed_claim_level}`);
    }
    if (metric?.value_model_role && !ALLOWED_MODEL_ROLES.has(metric.value_model_role)) {
      gaps.push(`${prefix}.value_model_role is invalid: ${metric.value_model_role}`);
    }
  });
  return gaps;
}

function collectAssumptionGaps(scenario: any): string[] {
  const gaps: string[] = [];
  if (
    !Array.isArray(scenario?.customer_owned_assumptions) ||
    scenario.customer_owned_assumptions.length === 0
  ) {
    gaps.push("customer_owned_assumptions must include at least one assumption");
    return gaps;
  }
  scenario.customer_owned_assumptions.forEach((assumption: any, index: number) => {
    requireField(
      assumption.assumption_id,
      `customer_owned_assumptions[${index}].assumption_id`,
      gaps
    );
    requireField(assumption.state, `customer_owned_assumptions[${index}].state`, gaps);
    requireField(assumption.owner, `customer_owned_assumptions[${index}].owner`, gaps);
    if (assumption.state && !ALLOWED_STATES.has(assumption.state)) {
      gaps.push(`customer_owned_assumptions[${index}].state is invalid: ${assumption.state}`);
    }
  });
  return gaps;
}

function collectScenarioBandGaps(scenario: any): string[] {
  const gaps: string[] = [];
  if (!Array.isArray(scenario?.scenario_bands) || scenario.scenario_bands.length === 0) {
    gaps.push("scenario_bands must include governed scenario bands");
    return gaps;
  }
  const bands = new Set(scenario.scenario_bands.map((band: any) => band.band));
  for (const bandName of REQUIRED_SCENARIO_BANDS) {
    if (!bands.has(bandName)) gaps.push(`scenario_bands missing ${bandName}`);
  }
  scenario.scenario_bands.forEach((band: any, index: number) => {
    requireField(band.band, `scenario_bands[${index}].band`, gaps);
    requireField(band.interpretation, `scenario_bands[${index}].interpretation`, gaps);
    if (!Array.isArray(band.included_metric_ids) || band.included_metric_ids.length === 0) {
      gaps.push(`scenario_bands[${index}].included_metric_ids must include at least one metric`);
    }
  });
  return gaps;
}

function collectSafeLanguageGaps(scenario: any): string[] {
  const gaps: string[] = [];
  const language = scenario?.safe_value_language ?? {};
  requireField(language.allowed_claim_level, "safe_value_language.allowed_claim_level", gaps);
  if (
    language.allowed_claim_level &&
    !ALLOWED_CLAIM_LEVELS.has(language.allowed_claim_level)
  ) {
    gaps.push(
      `safe_value_language.allowed_claim_level is invalid: ${language.allowed_claim_level}`
    );
  }
  if (!Array.isArray(language.allowed_phrases) || language.allowed_phrases.length === 0) {
    gaps.push("safe_value_language.allowed_phrases must include at least one phrase");
  } else if (containsForbiddenClaimLanguage(language.allowed_phrases)) {
    gaps.push("safe_value_language.allowed_phrases contains forbidden claim language");
  }
  if (!Array.isArray(language.required_caveats) || language.required_caveats.length === 0) {
    gaps.push("safe_value_language.required_caveats must include at least one caveat");
  }
  const blockedClaims = new Set(language.blocked_claims ?? []);
  for (const claim of requiredBlockedClaimsFor(scenario)) {
    if (!blockedClaims.has(claim)) {
      gaps.push(`safe_value_language.blocked_claims missing ${claim}`);
    }
  }
  return gaps;
}

function collectEconomicPolicyGaps(scenario: any): string[] {
  const gaps: string[] = [];
  const policy = scenario?.economic_output_policy ?? {};
  requireField(policy.mode, "economic_output_policy.mode", gaps);
  for (const flag of ECONOMIC_OUTPUT_FLAGS) {
    if (policy[flag] !== true && policy[flag] !== false) {
      gaps.push(`economic_output_policy.${flag} must be boolean`);
    }
  }
  return gaps;
}

function collectFinancialClaimGateGaps(scenario: any): string[] {
  const gaps: string[] = [];
  const gate = scenario?.financial_claim_gate ?? null;
  const requestedOutputs = Object.keys(FINANCIAL_GATE_REQUIREMENTS).filter((output) =>
    financialOutputRequested(scenario, output)
  );

  if (!gate) {
    for (const output of requestedOutputs) {
      gaps.push(`financial_claim_gate is required when ${output} is allowed`);
    }
    return gaps;
  }

  requireField(gate.mode, "financial_claim_gate.mode", gaps);
  if (gate.mode && !ALLOWED_FINANCIAL_CLAIM_GATE_MODES.has(gate.mode)) {
    gaps.push(`financial_claim_gate.mode is invalid: ${gate.mode}`);
  }

  for (const output of requestedOutputs) {
    requireTrue(
      gate.allowed_outputs?.[output],
      `financial_claim_gate.allowed_outputs.${output} must be true when ${output} is requested`,
      gaps
    );
    if (gate.mode === "BLOCKED") {
      gaps.push(`financial_claim_gate.mode BLOCKED cannot allow ${output}`);
    }
    if (
      output === "customer_facing_economic_output" &&
      gate.mode !== "CUSTOMER_FACING_APPROVED"
    ) {
      gaps.push(
        "financial_claim_gate.allowed_outputs.customer_facing_economic_output requires mode CUSTOMER_FACING_APPROVED"
      );
    }
    for (const requirement of FINANCIAL_GATE_REQUIREMENTS[output]) {
      requireTrue(
        gate.data_sufficiency?.[requirement],
        `financial_claim_gate.allowed_outputs.${output} requires data_sufficiency.${requirement}`,
        gaps
      );
    }
  }
  return gaps;
}

function collectWorkforceAnalyticsGateGaps(scenario: any): string[] {
  const gaps: string[] = [];
  const gate = scenario?.workforce_analytics_gate ?? null;
  if (!gate) return gaps;

  requireField(gate.mode, "workforce_analytics_gate.mode", gaps);
  if (gate.mode && !ALLOWED_WORKFORCE_ANALYTICS_GATE_MODES.has(gate.mode)) {
    gaps.push(`workforce_analytics_gate.mode is invalid: ${gate.mode}`);
  }
  if (gate.hris_join_allowed !== false) {
    gaps.push("workforce_analytics_gate.hris_join_allowed must be false");
  }

  const requestedOutputs = WORKFORCE_ANALYTICS_OUTPUTS.filter((output) =>
    workforceOutputRequested(scenario, output)
  );
  for (const output of requestedOutputs) {
    if (gate.mode === "BLOCKED") {
      gaps.push(`workforce_analytics_gate.mode BLOCKED cannot allow ${output}`);
    }
    for (const requirement of WORKFORCE_SAFETY_REQUIREMENTS) {
      requireTrue(
        gate[requirement],
        `workforce_analytics_gate.allowed_outputs.${output} requires ${requirement}`,
        gaps
      );
    }
  }
  return gaps;
}

function collectGovernanceGaps(scenario: any): string[] {
  const gaps: string[] = [];
  for (const field of [...collectForbiddenFields(scenario)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  const boundaries = scenario?.governance_boundaries ?? {};
  for (const boundary of governanceBoundariesFor(scenario)) {
    if (boundaries[boundary] === true) {
      gaps.push(`governance_boundaries.${boundary} is true`);
    }
    if (boundaries[boundary] !== false) {
      gaps.push(`governance_boundaries.${boundary} must be false`);
    }
  }
  return gaps;
}

export function validateRoiScenario(scenario: any): RoiScenarioValidationResult {
  const gaps = [
    ...collectTopLevelGaps(scenario),
    ...collectSourceRefGaps(scenario),
    ...collectWorkflowGaps(scenario),
    ...collectEvidenceStatusGaps(scenario),
    ...collectWindowGaps(scenario),
    ...collectMetricModelGaps(scenario),
    ...collectAssumptionGaps(scenario),
    ...collectScenarioBandGaps(scenario),
    ...collectSafeLanguageGaps(scenario),
    ...collectEconomicPolicyGaps(scenario),
    ...collectFinancialClaimGateGaps(scenario),
    ...collectWorkforceAnalyticsGateGaps(scenario),
    ...collectGovernanceGaps(scenario)
  ];
  const readinessDecision = scenario?.evidence_status?.readiness_decision ?? null;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    roi_scenario_id: scenario?.roi_scenario_id ?? null,
    workflow_family: scenario?.workflow?.workflow_family ?? null,
    value_route: scenario?.workflow?.value_route ?? null,
    evidence_status: {
      readiness_decision: readinessDecision,
      outcome_evidence_review_state:
        scenario?.evidence_status?.outcome_evidence_review_state ?? null
    },
    valid: gaps.length === 0,
    gaps,
    feeds: {
      value_modeling: gaps.length === 0,
      executive_readout:
        gaps.length === 0 &&
        !["STOP_FOR_GOVERNANCE_REVIEW", "HOLD_FOR_SOURCE_COVERAGE"].includes(
          String(readinessDecision ?? "")
        ),
      customer_facing_economic_output:
        gaps.length === 0 &&
        scenario?.financial_claim_gate?.mode === "CUSTOMER_FACING_APPROVED" &&
        scenario?.financial_claim_gate?.allowed_outputs?.customer_facing_economic_output === true
    }
  };
}

function metricModelFor(metricReference: any, metricsLibrary: any, index: number): any {
  const metric = firstMetric(metricsLibrary, metricReference.metric_id) ?? {};
  return {
    metric_id: metricReference.metric_id,
    name: metricReference.name ?? metric.name ?? metricReference.metric_id,
    value_route: metricReference.value_route ?? metric.value_route,
    measurement_unit: metricReference.measurement_unit ?? metric.measurement_unit,
    source_system: metricReference.source_system ?? metric.source_system,
    baseline_rule:
      metric.baseline_rule ??
      "Attach a customer-approved baseline window before strengthening value language.",
    comparison_rule:
      metric.comparison_rule ??
      "Attach a customer-approved comparison window before strengthening value language.",
    formula_template: "aggregate comparison only; customer computes directional delta",
    allowed_claim_level:
      metricReference.allowed_claim_level ?? metric.allowed_claim_level ?? "BLOCKED",
    value_model_role: index === 0 ? "PRIMARY" : "CONTEXT"
  };
}

function firstMetricModelMetric(metrics: any[]): any {
  return metrics[0] ?? {};
}

export function buildRoiScenarioFromValueObjects(inputs: BuildRoiScenarioInputs): any {
  const { blueprint, metricsLibrary, valueScenario, readiness } = inputs;
  const workflowFamily =
    blueprint?.workflow_family ??
    valueScenario?.input?.workflow_family ??
    readiness?.workflow_family ??
    null;
  const valueRoute =
    blueprint?.value_routes?.primary ??
    valueScenario?.input?.value_route ??
    readiness?.value_route ??
    "UNCLASSIFIED";
  const metricReferences = Array.isArray(valueScenario?.input?.metric_references)
    ? valueScenario.input.metric_references
    : [];
  const metricModels = metricReferences.map((metric: any, index: number) =>
    metricModelFor(metric, metricsLibrary, index)
  );
  const primaryMetric = firstMetricModelMetric(metricModels);
  const sourceCoverage = readiness?.source_coverage ?? {};

  return {
    schema_version: ROI_SCENARIO_SCHEMA_VERSION,
    roi_scenario_id:
      inputs.roiScenarioId ??
      `roi_scenario_${workflowFamily ?? "unknown"}_${String(valueRoute).toLowerCase()}_v1`,
    source_refs: {
      blueprint_id: blueprint?.blueprint_id ?? null,
      metrics_library_id: metricsLibrary?.library_id ?? null,
      value_scenario_id: valueScenario?.scenario_id ?? null,
      readiness_id: readiness?.readiness_id ?? null
    },
    workflow: {
      workflow_family: workflowFamily,
      workflow_name:
        blueprint?.workflow_name ??
        String(workflowFamily ?? "Selected workflow").replace(/_/g, " "),
      value_route: valueRoute
    },
    evidence_status: {
      readiness_decision: readiness?.decision ?? "STOP_FOR_GOVERNANCE_REVIEW",
      outcome_evidence_review_state:
        inputs.outcomeEvidenceReviewState ??
        (sourceCoverage.outcome === "PRESENT" ? "ACCEPTED" : "MISSING"),
      source_coverage: {
        ai_activity: normalizeState(sourceCoverage.ai_activity),
        workflow: normalizeState(sourceCoverage.workflow),
        outcome: normalizeState(sourceCoverage.outcome),
        baseline: normalizeState(sourceCoverage.baseline),
        trust: normalizeState(sourceCoverage.trust),
        assumptions: normalizeState(sourceCoverage.assumptions),
        suppression: normalizeState(sourceCoverage.suppression)
      }
    },
    baseline_comparison: {
      baseline_window: {
        state: normalizeState(sourceCoverage.baseline),
        owner: primaryMetric.owner ?? "customer_data_owner",
        rule:
          primaryMetric.baseline_rule ??
          "Attach a customer-approved baseline window before strengthening value language."
      },
      comparison_window: {
        state: normalizeState(sourceCoverage.baseline),
        owner: primaryMetric.owner ?? "customer_data_owner",
        rule:
          primaryMetric.comparison_rule ??
          "Attach a customer-approved comparison window before strengthening value language."
      }
    },
    metric_models: metricModels,
    customer_owned_assumptions:
      valueScenario?.input?.customer_owned_assumptions ??
      (blueprint?.assumption_ledger ?? []),
    scenario_bands: valueScenario?.input?.scenario_bands ?? [],
    safe_value_language: {
      allowed_claim_level: valueScenario?.output?.claim_state ?? "BLOCKED",
      allowed_phrases:
        Array.isArray(valueScenario?.output?.safe_claims) &&
        valueScenario.output.safe_claims.length > 0
          ? valueScenario.output.safe_claims
          : ["Potential value opportunity for customer-owned validation."],
      required_caveats:
        Array.isArray(valueScenario?.output?.required_caveats) &&
        valueScenario.output.required_caveats.length > 0
          ? valueScenario.output.required_caveats
          : [
              "Scenario bands are planning ranges, not realized ROI.",
              "Outcome movement cannot be attributed to AI without separate validation."
            ],
      blocked_claims: ALWAYS_BLOCKED_CLAIMS
    },
    economic_output_policy: {
      mode: "MODELED_RANGE_ONLY",
      customer_facing_economic_output: false,
      dollarized_output: false,
      realized_roi_calculation: false
    },
    financial_claim_gate: {
      mode: "BLOCKED",
      data_sufficiency: {
        aggregate_only: false,
        baseline_present: false,
        comparison_present: false,
        outcome_metric_accepted: false,
        financial_assumptions_present: false,
        investment_costs_present: false,
        finance_owner_attested: false,
        confounds_reviewed: false,
        legal_or_governance_approved: false,
        experimental_or_quasi_experimental_design: false
      },
      allowed_outputs: {
        dollarized_output: false,
        realized_roi_calculation: false,
        customer_facing_economic_output: false,
        causality_language: false,
        aggregate_workflow_productivity: false
      }
    },
    workforce_analytics_gate: {
      mode: "BLOCKED",
      aggregate_only: false,
      minimum_cohort_size_met: false,
      no_direct_identifiers: false,
      no_manager_ranking: false,
      no_individual_decisioning: false,
      no_sensitive_attribute_inference: false,
      hris_join_allowed: false,
      allowed_outputs: {
        aggregate_workforce_readiness: false,
        aggregate_enablement_coverage: false,
        aggregate_training_completion: false,
        aggregate_ai_confidence: false,
        aggregate_change_readiness: false,
        aggregate_workflow_capacity: false,
        aggregate_role_family_adoption: false
      }
    },
    governance_boundaries: {
      production_connector: false,
      dashboard: false,
      individual_scoring: false,
      named_employee_productivity: false,
      individual_productivity_measurement: false,
      team_or_manager_ranking: false,
      productivity_ranking: false,
      people_decisioning: false,
      compensation_or_performance_inference: false,
      hris_inference: false,
      raw_prompt_or_response_storage: false,
      raw_content_storage: false,
      direct_identifiers: false,
      runtime_service: false,
      autonomous_customer_actions: false
    }
  };
}
