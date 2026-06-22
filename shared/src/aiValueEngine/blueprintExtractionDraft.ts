/**
 * AI Value Engine - Blueprint Extraction Draft.
 *
 * Contract-only adapter for upstream-parsed Blueprint documents. It shapes an
 * upload/extraction result into a governed review draft and, after human
 * approval, into a Blueprint validation input plus Data Spine source. It does
 * not parse documents, store raw text, persist files, create routes/UI, compute
 * ROI, prove causality, or create customer-facing financial output.
 */

import { validateBlueprint, type BlueprintValidationResult } from "./blueprint";

export const AI_VALUE_BLUEPRINT_EXTRACTION_DRAFT_SCHEMA_VERSION =
  "FT_AI_VALUE_BLUEPRINT_EXTRACTION_DRAFT_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_BLUEPRINT_EXTRACTION_DRAFT_VALIDATION_2026_06";

const DERIVATION_VERSION =
  "ai_value_blueprint_extraction_draft_2026_06";

const REQUIRED_BLOCKED_USES = [
  "realized_roi",
  "ebita_claim",
  "ebitda_claim",
  "financial_attribution",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "people_decisioning",
  "customer_facing_financial_output",
  "confidence_percentage",
  "probability_output"
];

const REQUIRED_FALSE_BOUNDARY_FIELDS = [
  "parser_productized",
  "live_pull_performed",
  "persisted",
  "creates_migrations",
  "creates_prisma_schema",
  "creates_backend_routes",
  "creates_frontend_ui",
  "stores_raw_document_text",
  "stores_uploaded_file",
  "emits_roi",
  "emits_financial_attribution",
  "emits_confidence_percentage",
  "emits_probability",
  "customer_facing_financial_output"
];

const ALLOWED_EXTRACTION_STATES = new Set([
  "unparsed",
  "parsed",
  "needs_review",
  "held",
  "blocked"
]);

const ALLOWED_APPROVAL_STATES = new Set([
  "pending_review",
  "approved",
  "rejected",
  "held"
]);

const ALLOWED_EXPECTED_BEHAVIORS = new Set([
  "knowledge_retrieval",
  "reuse",
  "delegation",
  "verification"
]);

const ALLOWED_EXPECTED_VBD_SIGNALS = new Set([
  "velocity",
  "breadth",
  "depth",
  "integration",
  "not_selected"
]);

const ALLOWED_VALUE_DRIVERS = new Set([
  "revenue",
  "cost",
  "capacity",
  "quality",
  "risk",
  "not_selected"
]);

const FORBIDDEN_FIELD_PATTERNS = [
  /^raw_document_text$/i,
  /^document_text$/i,
  /^file_contents?$/i,
  /raw_(?:document|file|content|prompt|response|transcript|row)/i,
  /prompt/i,
  /^responses?$/i,
  /response_text/i,
  /transcript/i,
  /email/i,
  /user_id/i,
  /employee_id/i,
  /respondent_email/i,
  /person_id/i,
  /person_identifier/i,
  /manager_ranking/i,
  /team_ranking/i,
  /people_decisioning/i,
  /^confidence_percentage$/i,
  /^confidence_percent$/i,
  /^probability$/i,
  /contribution_probability/i,
  /^roi$/i,
  /roi_proof/i,
  /realized_roi/i,
  /^ebita$/i,
  /^ebitda$/i,
  /financial_attribution/i,
  /^financial_output$/i,
  /^customer_facing_financial_output$/i,
  /^backend_routes?$/i,
  /^frontend_ui$/i,
  /^persistence_table$/i,
  /^schema_ref$/i
];

const FORBIDDEN_TEXT_PATTERNS = [
  /\bproved\b/i,
  /\bcaused\b/i,
  /\battributed\b/i,
  /\bROI proof\b/i,
  /\bEBITDA impact\b/i,
  /\bconfidence\s*(?:%|percentage)\b/i,
  /\bprobability\b/i
];

const GOVERNED_KEY_ALLOWLIST = new Set([
  "blocked_claims",
  "blocked_uses",
  "boundary_policy",
  "governance_boundaries"
]);

const FALSE_BOUNDARY_CONTAINERS = new Set([
  "boundary_policy",
  "feeds",
  "governance_boundaries"
]);

export interface BuildBlueprintExtractionDraftInput {
  draftId?: string;
  orgId: string;
  clientId: string;
  documentSourceRef: string;
  extractionState: string;
  approvalState: string;
  ownerRole: string;
  approverRole?: string | null;
  workflowFamily: string;
  workflowName: string;
  functionArea: string;
  cohortKey: string;
  valueHypothesis: string;
  valueRoute: string;
  baselineWindow: any;
  comparisonWindow: any;
  metricCandidates: any[];
  expectedBehaviorPathways?: any[];
  assumptions: any[];
  sourceRefs?: Record<string, any>;
  generatedAt?: string;
}

export interface BlueprintExtractionDraftValidationResult {
  schema_version: string;
  draft_id: string | null;
  org_id: string | null;
  client_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    blueprint_review_queue: boolean;
    blueprint_validation_input: boolean;
    data_spine_blueprint_source: boolean;
    measurement_cell_input: false;
    customer_facing_financial_output: false;
  };
}

function normalizeKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function safeIdPart(value: string): string {
  return normalizeKey(value).replace(/^_+|_+$/g, "");
}

function stringsOf(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function firstMetric(input: BuildBlueprintExtractionDraftInput): any {
  return Array.isArray(input.metricCandidates) && input.metricCandidates.length > 0
    ? input.metricCandidates[0]
    : {};
}

function finiteNumberOrNull(value: any): number | null {
  if (value === undefined || value === null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function expectedBehaviorPathways(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function requireField(value: any, path: string, gaps: string[]): void {
  if (value === undefined || value === null || value === "") {
    gaps.push(`${path} is missing`);
  }
}

function collectForbiddenFields(
  value: any,
  fields: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectForbiddenFields(item, fields, [...path, String(index)]));
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    const normalized = normalizeKey(key);
    const currentPath = [...path, key];
    const isFalseBoundaryFlag = nested === false &&
      currentPath.some((part) => FALSE_BOUNDARY_CONTAINERS.has(normalizeKey(part)));
    if (
      !isFalseBoundaryFlag &&
      !GOVERNED_KEY_ALLOWLIST.has(normalized) &&
      FORBIDDEN_FIELD_PATTERNS.some((pattern) => pattern.test(key) || pattern.test(normalized))
    ) {
      fields.add(currentPath.join("."));
    }
    collectForbiddenFields(nested, fields, currentPath);
  }
  return fields;
}

function collectUnsafeText(
  value: any,
  values: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (value === null || value === undefined) return values;
  if (typeof value === "string") {
    if (
      !path.some((part) =>
        ["blocked_claims", "blocked_uses", "required_caveats"].includes(normalizeKey(part))
      ) &&
      FORBIDDEN_TEXT_PATTERNS.some((pattern) => pattern.test(value))
    ) {
      values.add(`${path.join(".")}: ${value}`);
    }
    return values;
  }
  if (typeof value !== "object") return values;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectUnsafeText(item, values, [...path, String(index)]));
    return values;
  }
  for (const [key, nested] of Object.entries(value)) {
    collectUnsafeText(nested, values, [...path, key]);
  }
  return values;
}

function boundaryPolicy(): Record<string, false> {
  return Object.fromEntries(
    REQUIRED_FALSE_BOUNDARY_FIELDS.map((field) => [field, false])
  ) as Record<string, false>;
}

function sourceCoverage(): any {
  return {
    ai_activity: "PENDING",
    workflow: "PRESENT",
    outcome: "PENDING",
    baseline: "PRESENT",
    trust: "PENDING",
    assumptions: "PRESENT",
    suppression: "PENDING"
  };
}

function approvedAggregateInputs(input: BuildBlueprintExtractionDraftInput): any {
  return {
    case_population: {
      eligible_cases: null,
      cohort_key: input.cohortKey
    },
    ai_activity: {
      assistant_sessions: null,
      search_sessions: null,
      skill_invocations: null,
      agent_runs: null
    },
    outcome_signals: input.metricCandidates.map((metric) => ({
	      metric_id: metric.metric_id,
	      metric_name: metric.metric_name ?? metric.metric_id,
	      expected_direction: metric.expected_direction ?? "monitor",
	      expected_lag_days: finiteNumberOrNull(metric.expected_lag_days),
	      system_recommended: metric.system_recommended ?? null,
	      customer_selected: metric.customer_selected ?? null,
	      value_driver: metric.value_driver ?? "not_selected"
	    }))
	  };
}

function blueprintInput(input: BuildBlueprintExtractionDraftInput): any {
  return {
    schema_version: "FT_AI_VALUE_BLUEPRINT_2026_06",
    blueprint_id:
      `blueprint_${safeIdPart(input.orgId)}_${safeIdPart(input.workflowFamily)}`,
    org_id: input.orgId,
    workflow_family: input.workflowFamily,
    workflow_name: input.workflowName,
    business_owner: {
      role: input.approverRole ?? input.ownerRole
    },
    process_discovery: {
      current_state_steps: ["baseline workflow documented in approved Blueprint extraction"],
      future_state_steps: ["AI-enabled workflow hypothesis documented for review"]
    },
    value_hypothesis: input.valueHypothesis,
    value_routes: {
      primary: input.valueRoute,
      secondary: []
    },
    windows: {
      baseline: input.baselineWindow,
      comparison: input.comparisonWindow
    },
    source_requirements: {
      source_coverage: sourceCoverage(),
      approved_aggregate_inputs: approvedAggregateInputs(input)
    },
    assumption_ledger: input.assumptions,
    blocked_claims: [
      "roi_proof",
      "causality_claim",
      "individual_scoring",
      "team_or_manager_ranking",
      "hr_analytics",
      "dashboard_or_runtime_implementation"
    ],
    governance_boundaries: {
      requires_raw_data: false,
      requires_hr_analytics: false,
      requires_roi_calculation: false,
      requires_causality_claim: false,
      requires_individual_scoring: false,
      requires_dashboard: false,
      requires_runtime_service: false
    }
  };
}

function sourceState(approved: boolean, extractionState: string): string {
  if (approved) return "present";
  if (["held", "blocked"].includes(extractionState)) return extractionState;
  return "pending_approval";
}

export function buildBlueprintExtractionDraft(
  input: BuildBlueprintExtractionDraftInput
): any {
  const approved = input.approvalState === "approved";
  const extractionState = normalizeKey(input.extractionState);
  const draftId = input.draftId ??
    `blueprint_extraction_draft_${safeIdPart(input.orgId)}_${safeIdPart(input.workflowFamily)}`;
  const metric = firstMetric(input);
  const approvalState = normalizeKey(input.approvalState);
  const blueprintExpectationRef = draftId;
  const blueprint = approved ? blueprintInput(input) : null;
  return {
    schema_version: AI_VALUE_BLUEPRINT_EXTRACTION_DRAFT_SCHEMA_VERSION,
    draft_id: draftId,
    org_id: input.orgId,
    client_id: input.clientId,
    document_source_ref: input.documentSourceRef,
    source_posture: "upstream_structured_reference_only",
    extraction_state: extractionState,
    approval_state: approvalState,
    owner_role: input.ownerRole,
    approver_role: input.approverRole ?? null,
    workflow_family: input.workflowFamily,
    workflow_name: input.workflowName,
    function_area: input.functionArea,
    cohort_key: input.cohortKey,
    extracted_fields: {
      blueprint_expectation_ref: blueprintExpectationRef,
      blueprint_customer_approval_state: approved ? "approved" : approvalState,
      blueprint_customer_approver_role: input.approverRole ?? null,
      value_hypothesis: input.valueHypothesis,
      value_route: input.valueRoute,
      expected_behavior_pathways: expectedBehaviorPathways(
        input.expectedBehaviorPathways
      ),
      expected_metric_id: metric.metric_id ?? null,
	      expected_metric_name: metric.metric_name ?? metric.metric_id ?? null,
	      expected_metric_direction: metric.expected_direction ?? "monitor",
	      expected_metric_lag_days: metric.expected_lag_days ?? null,
	      expected_metric_system_recommended: metric.system_recommended ?? null,
	      expected_metric_customer_selected: metric.customer_selected ?? null,
      value_driver: metric.value_driver ?? "not_selected",
      metric_candidates: input.metricCandidates,
      baseline_window: input.baselineWindow,
      comparison_window: input.comparisonWindow,
      assumption_refs: input.assumptions.map((assumption) => assumption.assumption_id)
    },
    blueprint_validation_input: blueprint,
    data_spine_source: {
      state: sourceState(approved, extractionState),
      intake_mode: approved ? "blueprint_structured_import" : "blueprint_document_upload",
      source_ref: draftId,
      org_id: input.orgId,
      client_id: input.clientId,
      workflow_family: input.workflowFamily,
      function_area: input.functionArea,
      cohort_key: input.cohortKey,
      baseline_window: input.baselineWindow,
      comparison_window: input.comparisonWindow,
      owner_approval_state: approved ? "approved" : "submitted",
      review_state: approved ? "clear" : "needs_review",
      blueprint_expectation_ref: blueprintExpectationRef,
      blueprint_customer_approval_state: approved ? "approved" : approvalState,
      expected_metric_id: metric.metric_id ?? null,
      expected_metric_direction: metric.expected_direction ?? "monitor",
      aggregate_only: true,
      parser_productized: false,
      live_pull_performed: false
    },
    feeds: {
      blueprint_review_queue: true,
      blueprint_validation_input: approved,
      data_spine_blueprint_source: approved,
      measurement_cell_input: false,
      customer_facing_financial_output: false
    },
    source_refs: {
      document_source_ref: input.documentSourceRef,
      ...(input.sourceRefs ?? {})
    },
    allowed_uses: [
      "blueprint_extraction_review",
      "blueprint_approval_workflow",
      "data_spine_source_preparation"
    ],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: boundaryPolicy(),
    required_caveats: [
      "Source refs point to upstream-approved structured extraction outputs only.",
      "This contract does not parse Blueprint uploads, run BigQuery, pull live Glean data, or validate raw customer files.",
      "Approved Blueprint extraction can feed Blueprint validation and Data Spine source alignment only; it is not Measurement Cell input or value proof."
    ],
    generated_at: input.generatedAt ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
}

function blueprintFeeds(draft: any, valid: boolean): any {
  const approved = draft?.approval_state === "approved";
  const blueprintValidation: BlueprintValidationResult | null =
    approved ? validateBlueprint(draft?.blueprint_validation_input) : null;
  const blueprintReady = valid && approved && blueprintValidation?.valid === true;
  return {
    blueprint_review_queue: valid,
    blueprint_validation_input: blueprintReady,
    data_spine_blueprint_source: blueprintReady,
    measurement_cell_input: false,
    customer_facing_financial_output: false
  };
}

function collectExpectationGaps(draft: any): string[] {
  const gaps: string[] = [];
  const fields = draft?.extracted_fields ?? {};
  const dataSource = draft?.data_spine_source ?? {};
  const pathways = fields.expected_behavior_pathways;
  if (pathways !== undefined) {
    if (!Array.isArray(pathways)) {
      gaps.push("extracted_fields.expected_behavior_pathways must be an array");
    } else {
      pathways.forEach((pathway: any, index: number) => {
        const prefix = `extracted_fields.expected_behavior_pathways.${index}`;
        if (!ALLOWED_EXPECTED_BEHAVIORS.has(String(pathway?.behavior))) {
          gaps.push(`${prefix}.behavior is invalid`);
        }
        if (!ALLOWED_EXPECTED_VBD_SIGNALS.has(String(pathway?.expected_vbd_signal))) {
          gaps.push(`${prefix}.expected_vbd_signal is invalid`);
        }
        if (typeof pathway?.system_recommended !== "boolean") {
          gaps.push(`${prefix}.system_recommended must be boolean`);
        }
        if (typeof pathway?.customer_selected !== "boolean") {
          gaps.push(`${prefix}.customer_selected must be boolean`);
        }
        if (draft?.approval_state === "approved" && pathway?.customer_selected !== true) {
          gaps.push(`${prefix}.customer_selected must be true for approved Blueprint expectations`);
        }
      });
    }
  }
  const lag = fields.expected_metric_lag_days;
  if (lag !== undefined && lag !== null && (!Number.isFinite(Number(lag)) || Number(lag) < 0)) {
    gaps.push("extracted_fields.expected_metric_lag_days must be a non-negative number or null");
  }
  if (
    fields.expected_metric_system_recommended !== undefined &&
    fields.expected_metric_system_recommended !== null &&
    typeof fields.expected_metric_system_recommended !== "boolean"
  ) {
    gaps.push("extracted_fields.expected_metric_system_recommended must be boolean");
  }
  if (
    fields.expected_metric_customer_selected !== undefined &&
    fields.expected_metric_customer_selected !== null &&
    typeof fields.expected_metric_customer_selected !== "boolean"
  ) {
    gaps.push("extracted_fields.expected_metric_customer_selected must be boolean");
  }
  if (draft?.approval_state === "approved") {
    requireField(
      fields.blueprint_expectation_ref,
      "extracted_fields.blueprint_expectation_ref",
      gaps
    );
    requireField(
      dataSource.blueprint_expectation_ref,
      "data_spine_source.blueprint_expectation_ref",
      gaps
    );
    if (!Array.isArray(fields.metric_candidates) || fields.metric_candidates.length === 0) {
      gaps.push("extracted_fields.metric_candidates must include a customer-selected metric for approved Blueprint expectations");
    }
    requireField(
      fields.expected_metric_id,
      "extracted_fields.expected_metric_id",
      gaps
    );
    requireField(
      fields.expected_metric_direction,
      "extracted_fields.expected_metric_direction",
      gaps
    );
    if (typeof fields.expected_metric_system_recommended !== "boolean") {
      gaps.push("extracted_fields.expected_metric_system_recommended must be boolean for approved Blueprint expectations");
    }
  }
  if (
    draft?.approval_state === "approved" &&
    fields.expected_metric_customer_selected !== true
  ) {
    gaps.push("extracted_fields.expected_metric_customer_selected must be true for approved Blueprint expectations");
  }
  if (fields.value_driver !== undefined && !ALLOWED_VALUE_DRIVERS.has(String(fields.value_driver))) {
    gaps.push("extracted_fields.value_driver is invalid");
  }
  if (draft?.approval_state === "approved") {
    if (fields.blueprint_customer_approval_state !== "approved") {
      gaps.push("extracted_fields.blueprint_customer_approval_state must be approved");
    }
    requireField(
      fields.blueprint_customer_approver_role,
      "extracted_fields.blueprint_customer_approver_role",
      gaps
    );
  }
  if (
    fields.blueprint_expectation_ref &&
    dataSource.blueprint_expectation_ref &&
    fields.blueprint_expectation_ref !== dataSource.blueprint_expectation_ref
  ) {
    gaps.push("data_spine_source.blueprint_expectation_ref must match extracted_fields.blueprint_expectation_ref");
  }
  if (
    fields.expected_metric_id &&
    dataSource.expected_metric_id &&
    fields.expected_metric_id !== dataSource.expected_metric_id
  ) {
    gaps.push("data_spine_source.expected_metric_id must match extracted_fields.expected_metric_id");
  }
  if (
    fields.expected_metric_direction &&
    dataSource.expected_metric_direction &&
    fields.expected_metric_direction !== dataSource.expected_metric_direction
  ) {
    gaps.push("data_spine_source.expected_metric_direction must match extracted_fields.expected_metric_direction");
  }
  return gaps;
}

export function validateBlueprintExtractionDraft(
  draft: any
): BlueprintExtractionDraftValidationResult {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "draft_id",
    "org_id",
    "client_id",
    "document_source_ref",
    "source_posture",
    "extraction_state",
    "approval_state",
    "owner_role",
    "workflow_family",
    "workflow_name",
    "function_area",
    "cohort_key",
    "extracted_fields",
    "data_spine_source",
    "feeds",
    "allowed_uses",
    "blocked_uses",
    "boundary_policy",
    "required_caveats",
    "generated_at",
    "derivation_version"
  ]) {
    requireField(draft?.[field], field, gaps);
  }
  if (
    draft?.schema_version &&
    draft.schema_version !== AI_VALUE_BLUEPRINT_EXTRACTION_DRAFT_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${draft.schema_version}`);
  }
  if (!ALLOWED_EXTRACTION_STATES.has(String(draft?.extraction_state))) {
    gaps.push(`extraction_state is invalid: ${draft?.extraction_state}`);
  }
  if (!ALLOWED_APPROVAL_STATES.has(String(draft?.approval_state))) {
    gaps.push(`approval_state is invalid: ${draft?.approval_state}`);
  }
  if (draft?.approval_state === "approved") {
    requireField(draft?.approver_role, "approver_role", gaps);
    const blueprintValidation = validateBlueprint(draft?.blueprint_validation_input);
    if (!blueprintValidation.valid) {
      gaps.push(
        `blueprint_validation_input is invalid: ${blueprintValidation.gaps.join("; ")}`
      );
    }
  }
  if (draft?.data_spine_source?.org_id !== draft?.org_id) {
    gaps.push("data_spine_source.org_id must match draft org_id");
  }
  if (draft?.data_spine_source?.client_id !== draft?.client_id) {
    gaps.push("data_spine_source.client_id must match draft client_id");
  }
  if (draft?.data_spine_source?.aggregate_only !== true) {
    gaps.push("data_spine_source.aggregate_only must be true");
  }
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!stringsOf(draft?.blocked_uses).includes(use)) {
      gaps.push(`blocked_uses missing ${use}`);
    }
  }
  for (const flag of REQUIRED_FALSE_BOUNDARY_FIELDS) {
    if (draft?.boundary_policy?.[flag] !== false) {
      gaps.push(`boundary_policy.${flag} must be false`);
    }
  }
  if (draft?.feeds?.measurement_cell_input !== false) {
    gaps.push("feeds.measurement_cell_input must be false");
  }
  if (draft?.feeds?.customer_facing_financial_output !== false) {
    gaps.push("feeds.customer_facing_financial_output must be false");
  }
  gaps.push(...collectExpectationGaps(draft));
  for (const field of [...collectForbiddenFields(draft)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  for (const value of [...collectUnsafeText(draft)].sort()) {
    gaps.push(`Unsafe claim language present: ${value}`);
  }
  const valid = gaps.length === 0;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    draft_id: draft?.draft_id ?? null,
    org_id: draft?.org_id ?? null,
    client_id: draft?.client_id ?? null,
    valid,
    gaps,
    feeds: blueprintFeeds(draft, valid)
  };
}
