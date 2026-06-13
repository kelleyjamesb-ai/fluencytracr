/**
 * AI Value Engine — Data Boundary & ROI Evidence Contract.
 *
 * This contract defines which organizational data can be useful for value
 * analysis, where sensitive raw data may exist, and which aggregate fields may
 * cross into FluencyTracr. It does not authorize production connectors,
 * direct identifiers, raw content storage, realized ROI calculation, causality
 * claims, person-level scoring, or customer-facing economic output.
 */

const RESULT_SCHEMA_VERSION = "FT_AI_VALUE_DATA_BOUNDARY_VALIDATION_2026_06";
export const DATA_BOUNDARY_SCHEMA_VERSION =
  "FT_AI_VALUE_DATA_BOUNDARY_ROI_EVIDENCE_2026_06";

const ALLOWED_SOURCE_CATEGORIES = new Set([
  "AI_WORK_EVIDENCE",
  "AI_FLUENCY_BASELINE",
  "WORKFLOW_PROCESS",
  "CUSTOMER_OUTCOME",
  "FINANCE_ASSUMPTION",
  "HRIS_ORG_CONTEXT",
  "ENABLEMENT_ACTIVITY",
  "CUSTOMER_REVENUE_EXPERIENCE",
  "QUALITY_RISK"
]);

const ALLOWED_VALUE_ROUTES = new Set([
  "COST_REDUCTION",
  "CAPACITY_CREATION",
  "QUALITY_IMPROVEMENT",
  "RISK_REDUCTION",
  "EXPERIENCE_IMPROVEMENT",
  "REVENUE_EXPANSION",
  "UNCLASSIFIED"
]);

const ALLOWED_SENSITIVITY_LEVELS = new Set([
  "LOW",
  "MODERATE",
  "HIGH",
  "RESTRICTED"
]);

const ALLOWED_EVIDENCE_LEVELS = new Set([
  "MISSING",
  "DIRECTIONAL",
  "CAVEATED",
  "SUPPORTED",
  "STRONG",
  "BLOCKED"
]);

const ALLOWED_CLAIM_LEVELS = new Set([
  "SOURCE_READINESS_ONLY",
  "INTERNAL_ONLY",
  "CAVEATED_VALUE_INVESTIGATION",
  "SUPPORTED_VALUE_MOVEMENT",
  "STRONG_VALUE_CLAIM_REQUIRES_DESIGN",
  "BLOCKED"
]);

const REQUIRED_EXISTING_CONTRACTS = [
  "metrics_library",
  "outcome_evidence_export",
  "roi_scenario",
  "value_improvement_loop",
  "reportability",
  "aggregate_api_push",
  "ai_value_measurement_model"
];

const CONTRACT_OUTPUT_FLAGS = [
  "aggregate_evidence_package",
  "value_evidence_case_input",
  "customer_facing_economic_output",
  "dollarized_output",
  "realized_roi_calculation",
  "causality_claim",
  "individual_scoring",
  // Legacy token retained for fixture compatibility. It means person-level
  // HR analytics, not aggregate HRIS-derived workforce context.
  "hr_analytics",
  "productivity_ranking"
];

const MUST_BE_FALSE_OUTPUT_FLAGS = [
  "customer_facing_economic_output",
  "dollarized_output",
  "realized_roi_calculation",
  "causality_claim",
  "individual_scoring",
  "hr_analytics",
  "productivity_ranking"
];

const FORBIDDEN_AGGREGATE_FIELD_PATTERNS = [
  /^raw_/i,
  /prompt/i,
  /response/i,
  /transcript/i,
  /ticket_text/i,
  /case_text/i,
  /message_text/i,
  /email/i,
  /employee_id/i,
  /employee_email/i,
  /employee_name/i,
  /employee_record/i,
  /employee_identifier/i,
  /direct_employee_identifier/i,
  /hashed_employee_id/i,
  /hashed_user_id/i,
  /hashed_person_id/i,
  /hashed_or_joinable_person_identifier/i,
  /pseudonymous_(?:employee|person|user)_identifier/i,
  /tokenized_(?:employee|person|user)_identifier/i,
  /joinable_(?:employee|person|user)_identifier/i,
  /\buser(?:_id|_email)?\b/i,
  /^user[A-Z]/,
  /person_id/i,
  /person_identifier/i,
  /person_level_hris/i,
  /person_level_(?:data|record|productivity|analytics)/i,
  /named_employee_productivity/i,
  /manager_chain/i,
  /manager_id/i,
  /manager_view/i,
  /manager_ranking/i,
  /team_ranking/i,
  /team_or_manager_ranking/i,
  /manager_or_team_ranking/i,
  /individual_productivity/i,
  /individual_scoring/i,
  /people_decisioning/i,
  /compensation/i,
  /performance_rating/i,
  /promotion/i,
  /discipline/i,
  /attrition_prediction/i,
  /hris_inference/i,
  /name/i,
  /direct_identifier/i
];

const REQUIRED_RAW_POLICY_FALSE_FLAGS = [
  "raw_rows_cross_boundary",
  "direct_identifiers_cross_boundary",
  "raw_content_cross_boundary",
  "persistent_raw_storage_in_fluencytracr"
];

const HRIS_ALLOWED_CLAIM_LEVELS = new Set([
  "INTERNAL_ONLY",
  "SOURCE_READINESS_ONLY",
  "CAVEATED_VALUE_INVESTIGATION",
  "SUPPORTED_VALUE_MOVEMENT",
  "STRONG_VALUE_CLAIM_REQUIRES_DESIGN"
]);

const OPTIONAL_ATTESTATION_FALSE_FLAGS = [
  "contains_person_level_hris_records",
  "contains_hashed_or_joinable_person_identifiers",
  "contains_person_level_productivity",
  "contains_manager_or_team_ranking",
  "contains_people_decisioning",
  "contains_compensation_or_performance_inference",
  "contains_hris_inference_from_ai_usage"
];

export interface DataBoundaryValidationResult {
  schema_version: string;
  contract_id: string | null;
  valid: boolean;
  source_count: number;
  allowed_upstream_sensitive_source_count: number;
  gaps: string[];
  vbd_definitions: {
    velocity: string | null;
    breadth: string | null;
    depth: string | null;
  };
  reconciliation: {
    conflicts_detected: boolean;
    aligned_contract_count: number;
  };
  feeds: {
    aggregate_evidence_package: boolean;
    value_evidence_case: boolean;
    customer_facing_economic_output: false;
  };
}

function requireField(value: any, path: string, gaps: string[]): void {
  if (value === undefined || value === null || value === "") {
    gaps.push(`${path} is missing`);
  }
}

function containsForbiddenAggregateField(value: any): boolean {
  return FORBIDDEN_AGGREGATE_FIELD_PATTERNS.some((pattern) =>
    pattern.test(String(value ?? ""))
  );
}

function collectTopLevelGaps(contract: any): string[] {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "contract_id",
    "purpose",
    "metric_pyramid",
    "vbd_definitions",
    "boundary_model",
    "organizational_data_sources",
    "reconciliation",
    "contract_outputs"
  ]) {
    requireField(contract?.[field], field, gaps);
  }
  if (contract?.schema_version &&
      contract.schema_version !== DATA_BOUNDARY_SCHEMA_VERSION) {
    gaps.push(`schema_version is invalid: ${contract.schema_version}`);
  }
  if (
    contract?.organizational_data_sources &&
    !Array.isArray(contract.organizational_data_sources)
  ) {
    gaps.push("organizational_data_sources must be an array");
  }
  if (
    Array.isArray(contract?.organizational_data_sources) &&
    contract.organizational_data_sources.length === 0
  ) {
    gaps.push("organizational_data_sources must include at least one source");
  }
  return gaps;
}

function collectMetricPyramidGaps(contract: any): string[] {
  const gaps: string[] = [];
  const pyramid = contract?.metric_pyramid ?? {};
  const northStar = pyramid.north_star_metric ?? {};
  if (northStar.name !== "Validated AI Value Movement") {
    gaps.push("metric_pyramid.north_star_metric.name must be Validated AI Value Movement");
  }
  for (const field of ["definition", "required_inputs"]) {
    requireField(northStar[field], `metric_pyramid.north_star_metric.${field}`, gaps);
  }
  const supporting = Array.isArray(pyramid.supporting_metrics)
    ? pyramid.supporting_metrics
    : [];
  const supportingNames = new Set(supporting.map((metric: any) => metric?.name));
  for (const name of ["AI Work Integration / VBD", "AI Capability Growth"]) {
    if (!supportingNames.has(name)) {
      gaps.push(`metric_pyramid.supporting_metrics missing ${name}`);
    }
  }
  return gaps;
}

function collectVbdGaps(contract: any): string[] {
  const gaps: string[] = [];
  const vbd = contract?.vbd_definitions ?? {};
  const expected = {
    velocity: "speed_to_adoption",
    breadth: "spread_across_org_functions_workflows_surfaces",
    depth: "workflow_integration_embeddedness"
  };
  for (const [dimension, value] of Object.entries(expected)) {
    if (vbd?.[dimension]?.definition !== value) {
      gaps.push(`vbd_definitions.${dimension}.definition must be ${value}`);
    }
    if (!Array.isArray(vbd?.[dimension]?.allowed_aggregate_fields) ||
        vbd[dimension].allowed_aggregate_fields.length === 0) {
      gaps.push(`vbd_definitions.${dimension}.allowed_aggregate_fields must include at least one field`);
    }
  }
  return gaps;
}

function collectBoundaryModelGaps(contract: any): string[] {
  const gaps: string[] = [];
  const model = contract?.boundary_model ?? {};
  for (const zone of [
    "source_system_zone",
    "transformation_boundary",
    "fluencytracr_boundary"
  ]) {
    requireField(model[zone], `boundary_model.${zone}`, gaps);
  }
  const fluencyBoundary = model.fluencytracr_boundary ?? {};
  if (fluencyBoundary.aggregate_only !== true) {
    gaps.push("boundary_model.fluencytracr_boundary.aggregate_only must be true");
  }
  for (const flag of [
    "raw_source_rows_allowed",
    "direct_identifiers_allowed",
    "raw_content_allowed"
  ]) {
    if (fluencyBoundary[flag] !== false) {
      gaps.push(`boundary_model.fluencytracr_boundary.${flag} must be false`);
    }
  }
  return gaps;
}

function collectSourceGaps(source: any, index: number): string[] {
  const gaps: string[] = [];
  const prefix = `organizational_data_sources[${index}]`;

  for (const field of [
    "source_id",
    "source_category",
    "source_name",
    "value_routes",
    "sensitivity",
    "raw_data_policy",
    "allowed_aggregate_fields",
    "required_attestation",
    "evidence_level",
    "allowed_claim_level"
  ]) {
    requireField(source?.[field], `${prefix}.${field}`, gaps);
  }

  if (source?.source_category &&
      !ALLOWED_SOURCE_CATEGORIES.has(source.source_category)) {
    gaps.push(`${prefix}.source_category is invalid: ${source.source_category}`);
  }
  if (source?.sensitivity &&
      !ALLOWED_SENSITIVITY_LEVELS.has(source.sensitivity)) {
    gaps.push(`${prefix}.sensitivity is invalid: ${source.sensitivity}`);
  }
  if (source?.evidence_level &&
      !ALLOWED_EVIDENCE_LEVELS.has(source.evidence_level)) {
    gaps.push(`${prefix}.evidence_level is invalid: ${source.evidence_level}`);
  }
  if (source?.allowed_claim_level &&
      !ALLOWED_CLAIM_LEVELS.has(source.allowed_claim_level)) {
    gaps.push(`${prefix}.allowed_claim_level is invalid: ${source.allowed_claim_level}`);
  }
  if (source?.source_category === "HRIS_ORG_CONTEXT") {
    if (!HRIS_ALLOWED_CLAIM_LEVELS.has(source?.allowed_claim_level)) {
      gaps.push(`${prefix}.source_category HRIS_ORG_CONTEXT has invalid aggregate workforce claim level ${source?.allowed_claim_level}`);
    }
  }

  if (!Array.isArray(source?.value_routes) || source.value_routes.length === 0) {
    gaps.push(`${prefix}.value_routes must include at least one route`);
  } else {
    for (const route of source.value_routes) {
      if (!ALLOWED_VALUE_ROUTES.has(route)) {
        gaps.push(`${prefix}.value_routes contains invalid route ${route}`);
      }
    }
  }

  const policy = source?.raw_data_policy ?? {};
  if (policy.allowed_upstream !== true) {
    gaps.push(`${prefix}.raw_data_policy.allowed_upstream must be true`);
  }
  requireField(policy.transform_boundary, `${prefix}.raw_data_policy.transform_boundary`, gaps);
  for (const flag of REQUIRED_RAW_POLICY_FALSE_FLAGS) {
    if (policy[flag] !== false) {
      gaps.push(`${prefix}.raw_data_policy.${flag} must be false`);
    }
  }

  if (
    !Array.isArray(source?.allowed_aggregate_fields) ||
    source.allowed_aggregate_fields.length === 0
  ) {
    gaps.push(`${prefix}.allowed_aggregate_fields must include at least one field`);
  } else {
    for (const field of source.allowed_aggregate_fields) {
      if (containsForbiddenAggregateField(field)) {
        gaps.push(`${prefix}.allowed_aggregate_fields contains forbidden field ${field}`);
      }
    }
  }

  const attestation = source?.required_attestation ?? {};
  for (const field of [
    "data_owner_role",
    "approved_grain",
    "baseline_comparison_required",
    "contains_person_level_data",
    "contains_raw_content"
  ]) {
    requireField(attestation[field], `${prefix}.required_attestation.${field}`, gaps);
  }
  if (attestation.contains_person_level_data !== false) {
    gaps.push(`${prefix}.required_attestation.contains_person_level_data must be false`);
  }
  if (attestation.contains_raw_content !== false) {
    gaps.push(`${prefix}.required_attestation.contains_raw_content must be false`);
  }
  for (const flag of OPTIONAL_ATTESTATION_FALSE_FLAGS) {
    if (attestation[flag] !== undefined && attestation[flag] !== false) {
      gaps.push(`${prefix}.required_attestation.${flag} must be false`);
    }
  }

  return gaps;
}

function collectReconciliationGaps(contract: any): string[] {
  const gaps: string[] = [];
  const reconciliation = contract?.reconciliation ?? {};
  if (reconciliation.conflicts_detected !== false) {
    gaps.push("reconciliation.conflicts_detected must be false");
  }
  const alignment = reconciliation.existing_contract_alignment ?? {};
  for (const contractName of REQUIRED_EXISTING_CONTRACTS) {
    requireField(
      alignment[contractName],
      `reconciliation.existing_contract_alignment.${contractName}`,
      gaps
    );
    if (alignment[contractName] === "CONFLICTS") {
      gaps.push(`reconciliation.existing_contract_alignment.${contractName} must not be CONFLICTS`);
    }
  }
  return gaps;
}

function collectOutputGaps(contract: any): string[] {
  const gaps: string[] = [];
  const outputs = contract?.contract_outputs ?? {};
  for (const flag of CONTRACT_OUTPUT_FLAGS) {
    requireField(outputs[flag], `contract_outputs.${flag}`, gaps);
  }
  if (outputs.aggregate_evidence_package !== true) {
    gaps.push("contract_outputs.aggregate_evidence_package must be true");
  }
  if (outputs.value_evidence_case_input !== true) {
    gaps.push("contract_outputs.value_evidence_case_input must be true");
  }
  for (const flag of MUST_BE_FALSE_OUTPUT_FLAGS) {
    if (outputs[flag] !== false) {
      gaps.push(`contract_outputs.${flag} must be false`);
    }
  }
  return gaps;
}

export function validateDataBoundaryContract(contract: any): DataBoundaryValidationResult {
  const sourceGaps = Array.isArray(contract?.organizational_data_sources)
    ? contract.organizational_data_sources.flatMap((source: any, index: number) =>
        collectSourceGaps(source, index)
      )
    : [];
  const gaps = [
    ...collectTopLevelGaps(contract),
    ...collectMetricPyramidGaps(contract),
    ...collectVbdGaps(contract),
    ...collectBoundaryModelGaps(contract),
    ...sourceGaps,
    ...collectReconciliationGaps(contract),
    ...collectOutputGaps(contract)
  ];
  const sources = Array.isArray(contract?.organizational_data_sources)
    ? contract.organizational_data_sources
    : [];
  const valid = gaps.length === 0;
  const alignment = contract?.reconciliation?.existing_contract_alignment ?? {};

  return {
    schema_version: RESULT_SCHEMA_VERSION,
    contract_id: contract?.contract_id ?? null,
    valid,
    source_count: sources.length,
    allowed_upstream_sensitive_source_count: sources.filter(
      (source: any) =>
        source?.raw_data_policy?.allowed_upstream === true &&
        ["HIGH", "RESTRICTED"].includes(source?.sensitivity)
    ).length,
    gaps,
    vbd_definitions: {
      velocity: contract?.vbd_definitions?.velocity?.definition ?? null,
      breadth: contract?.vbd_definitions?.breadth?.definition ?? null,
      depth: contract?.vbd_definitions?.depth?.definition ?? null
    },
    reconciliation: {
      conflicts_detected: contract?.reconciliation?.conflicts_detected === true,
      aligned_contract_count: REQUIRED_EXISTING_CONTRACTS.filter(
        (name) => alignment[name] && alignment[name] !== "CONFLICTS"
      ).length
    },
    feeds: {
      aggregate_evidence_package:
        valid && contract?.contract_outputs?.aggregate_evidence_package === true,
      value_evidence_case:
        valid && contract?.contract_outputs?.value_evidence_case_input === true,
      customer_facing_economic_output: false
    }
  };
}
