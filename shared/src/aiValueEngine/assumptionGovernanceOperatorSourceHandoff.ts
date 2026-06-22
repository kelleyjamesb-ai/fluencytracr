/**
 * AI Value Engine - Assumption / Governance Operator Source Handoff.
 *
 * Contract-only bridge from approved aggregate assumption or governance source
 * posture into the Operator Intake Adapter source shape. It does not approve
 * finance output, certify Source Package Review Queue clearance, assemble
 * Measurement Cells, persist output, create routes/UI/schemas, compute
 * confidence, calculate ROI, prove causality, emit productivity claims, or
 * create customer-facing financial output.
 */

export const AI_VALUE_ASSUMPTION_GOVERNANCE_OPERATOR_SOURCE_HANDOFF_SCHEMA_VERSION =
  "FT_AI_VALUE_ASSUMPTION_GOVERNANCE_OPERATOR_SOURCE_HANDOFF_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_ASSUMPTION_GOVERNANCE_OPERATOR_SOURCE_HANDOFF_VALIDATION_2026_06";

const DERIVATION_VERSION =
  "ai_value_assumption_governance_operator_source_handoff_2026_06";

const LANE_CONFIG = {
  assumption: {
    label: "Assumption context",
    intakeMode: "assumption_approval",
    packageType: "assumption_approval_export",
    refKey: "assumption_approval_export_id",
    sourcePosture: "validated_assumption_approval_source_posture",
    contextKey: "assumption_context",
    contextRole: "customer_owned_assumption_approval_context_only",
    dataSpineFeed: "data_spine_assumption_source",
    contextFeed: "assumption_context_fragment"
  },
  governance: {
    label: "Governance",
    intakeMode: "governance_attestation",
    packageType: "governance_control_export",
    refKey: "governance_control_export_id",
    sourcePosture: "validated_governance_attestation_source_posture",
    contextKey: "governance_context",
    contextRole: "governance_attestation_context_only",
    dataSpineFeed: "data_spine_governance_source",
    contextFeed: "governance_context_fragment"
  }
} as const;

type LaneKey = keyof typeof LANE_CONFIG;

const REQUIRED_BLOCKED_USES = [
  "realized_roi",
  "ebita_claim",
  "ebitda_claim",
  "financial_attribution",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "individual_scoring",
  "manager_or_team_ranking",
  "people_decisioning",
  "customer_facing_financial_output",
  "confidence_percentage",
  "probability_output"
];

const SAFE_ALLOWED_USES = [
  "operator_intake_assumption_source_preparation",
  "operator_intake_governance_source_preparation",
  "source_package_alignment_reference_preparation"
];

const REQUIRED_FALSE_BOUNDARY_FIELDS = [
  "persists_output",
  "creates_migrations",
  "creates_prisma_schema",
  "creates_backend_routes",
  "creates_frontend_ui",
  "creates_ingestion_jobs",
  "runs_bigquery",
  "runs_glean_query",
  "parses_uploaded_files",
  "ingests_raw_rows",
  "stores_raw_source_data",
  "contains_person_level_results",
  "contains_direct_identifiers",
  "assumption_approval_computes_roi",
  "governance_attestation_overrides_suppression",
  "feeds_measurement_cell_directly",
  "feeds_finance_context_investigation",
  "feeds_confidence_model",
  "emits_confidence_percentage",
  "emits_probability",
  "customer_facing_financial_output"
];

const ALLOWED_DECISIONS = new Set([
  "READY_FOR_OPERATOR_INTAKE",
  "HELD_NO_FEEDABLE_SOURCE",
  "BLOCKED"
]);

const FORBIDDEN_FIELD_PATTERNS = [
  /^raw_rows?$/i,
  /^rows$/i,
  /^events$/i,
  /^records$/i,
  /raw_(?:prompt|response|transcript|content|file|export|event|row)/i,
  /prompt/i,
  /^responses?$/i,
  /response_text/i,
  /transcript/i,
  /^query$/i,
  /query_text/i,
  /sql_text/i,
  /bigquery_sql/i,
  /^file_contents?$/i,
  /email/i,
  /user_id/i,
  /employee_id/i,
  /employee_email/i,
  /employee_name/i,
  /respondent_email/i,
  /respondent_id/i,
  /person_id/i,
  /person_identifier/i,
  /hashed_(?:user|person|employee)_id/i,
  /joinable_(?:user|person|employee)_identifier/i,
  /person_level_productivity/i,
  /person_level_hris/i,
  /manager_ranking/i,
  /team_ranking/i,
  /^confidence_percentage$/i,
  /^confidence_percent$/i,
  /^confidence_score$/i,
  /^confidence$/i,
  /^probability$/i,
  /probability_score/i,
  /probability_output/i,
  /contribution_probability/i,
  /contribution_likelihood/i,
  /ai_contribution_confidence/i,
  /contribution_confidence/i,
  /^roi$/i,
  /realized_roi/i,
  /roi_(?:value|amount|calculation|result|impact)/i,
  /^ebita$/i,
  /^ebitda$/i,
  /cost_savings/i,
  /savings_claim/i,
  /financial_impact/i,
  /financial_attribution/i,
  /^financial_output$/i,
  /^customer_facing_financial_output$/i,
  /causality_claim/i,
  /causal_proof/i,
  /productivity_claim/i,
  /productivity_lift/i,
  /^backend_routes?$/i,
  /^backend_route$/i,
  /^frontend_ui$/i,
  /^persistence_table$/i,
  /^schema_ref$/i,
  /operator_override/i,
  /force_ready/i
];

const EMAIL_VALUE_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

const DIRECT_IDENTIFIER_VALUE_PATTERN =
  /\b(?:respondent|employee|user|person)(?:[_:/-](?:id[_:/-]?)?)?[0-9a-f]{3,}\b/i;

const UNSAFE_VALUE_PATTERNS = [
  /raw_(?:prompt|response|transcript|content|file|export|event|row)/i,
  /(?:^|_)transcript(?:_|$)/i,
  /(?:^|_)select(?:_|$)/i,
  /(?:^|_)from_raw(?:_|$)/i,
  /(?:^|_)query_text(?:_|$)/i,
  /(?:^|_)sql_text(?:_|$)/i,
  /(?:^|_)bigquery_sql(?:_|$)/i,
  /(?:^|_)confidence_model(?:_|$)/i,
  /(?:^|_)confidence_percentage(?:_|$)/i,
  /(?:^|_)probability(?:_|$)/i,
  /(?:^|_)roi(?:_|$)/i,
  /(?:^|_)ebita(?:_|$)/i,
  /(?:^|_)ebitda(?:_|$)/i,
  /(?:^|_)financial_attribution(?:_|$)/i,
  /(?:^|_)customer_facing_financial(?:_|$)/i
];

export interface BuildAssumptionGovernanceOperatorSourceHandoffInput {
  lane: string;
  source: any;
  handoffId?: string;
  generatedAt?: string;
}

export interface AssumptionGovernanceOperatorSourceHandoffValidationResult {
  schema_version: string;
  handoff_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    operator_intake_source: boolean;
    data_spine_assumption_source: boolean;
    data_spine_governance_source: boolean;
    assumption_context_fragment: boolean;
    governance_context_fragment: boolean;
    measurement_cell_direct_feed: false;
    finance_context_investigation: false;
    confidence_model: false;
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

function requireField(value: any, path: string, gaps: string[]): void {
  if (value === undefined || value === null || value === "") {
    gaps.push(`${path} is missing`);
  }
}

function configFor(lane: any): (typeof LANE_CONFIG)[LaneKey] | null {
  const key = normalizeKey(String(lane ?? "")) as LaneKey;
  return key in LANE_CONFIG ? LANE_CONFIG[key] : null;
}

function laneKeyOf(lane: any): LaneKey | null {
  const key = normalizeKey(String(lane ?? "")) as LaneKey;
  return key in LANE_CONFIG ? key : null;
}

function boundaryPolicy(): Record<string, false> {
  return Object.fromEntries(
    REQUIRED_FALSE_BOUNDARY_FIELDS.map((field) => [field, false])
  ) as Record<string, false>;
}

function falseFeeds(): AssumptionGovernanceOperatorSourceHandoffValidationResult["feeds"] {
  return {
    operator_intake_source: false,
    data_spine_assumption_source: false,
    data_spine_governance_source: false,
    assumption_context_fragment: false,
    governance_context_fragment: false,
    measurement_cell_direct_feed: false,
    finance_context_investigation: false,
    confidence_model: false,
    customer_facing_financial_output: false
  };
}

function readyFeeds(
  lane: LaneKey
): AssumptionGovernanceOperatorSourceHandoffValidationResult["feeds"] {
  return {
    operator_intake_source: true,
    data_spine_assumption_source: lane === "assumption",
    data_spine_governance_source: lane === "governance",
    assumption_context_fragment: lane === "assumption",
    governance_context_fragment: lane === "governance",
    measurement_cell_direct_feed: false,
    finance_context_investigation: false,
    confidence_model: false,
    customer_facing_financial_output: false
  };
}

function sourceGaps(source: any, config: (typeof LANE_CONFIG)[LaneKey]): string[] {
  const gaps: string[] = [];
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return ["source must be an object"];
  }
  for (const field of [
    "source_ref",
    "org_id",
    "client_id",
    "workflow_family",
    "function_area",
    "cohort_key",
    "baseline_window",
    "comparison_window",
    "owner_role",
    "owner_approval_state",
    "review_state",
    "aggregate_only"
  ]) {
    requireField(source?.[field], `source.${field}`, gaps);
  }
  if (source?.state !== "present") gaps.push("source.state must be present");
  if (source?.intake_mode !== config.intakeMode) {
    gaps.push(`source.intake_mode must be ${config.intakeMode}`);
  }
  if (source?.owner_approval_state !== "approved") {
    gaps.push("source.owner_approval_state must be approved");
  }
  if (source?.review_state !== "clear") {
    gaps.push("source.review_state must be clear");
  }
  if (source?.aggregate_only !== true) {
    gaps.push("source.aggregate_only must be true");
  }
  if (source?.aligned === false) {
    gaps.push("source.aligned must not be false");
  }
  return gaps;
}

function operatorSourceFrom(source: any): any {
  return {
    ...source,
    aligned: source?.aligned !== false
  };
}

function contextFrom(
  source: any,
  config: (typeof LANE_CONFIG)[LaneKey]
): any {
  return {
    org_id: source?.org_id ?? null,
    client_id: source?.client_id ?? null,
    workflow_family: source?.workflow_family ?? null,
    function_area: source?.function_area ?? null,
    cohort_key: source?.cohort_key ?? null,
    baseline_window: source?.baseline_window ?? null,
    comparison_window: source?.comparison_window ?? null,
    owner_role: source?.owner_role ?? null,
    owner_approval_state: source?.owner_approval_state ?? null,
    source_review_state: source?.review_state ?? null,
    evidence_state: "present",
    context_role: config.contextRole,
    source_ref: source?.source_ref ?? null
  };
}

function sourcePackageReference(
  source: any,
  config: (typeof LANE_CONFIG)[LaneKey]
): any {
  return {
    source_package_type: config.packageType,
    source_refs: {
      [config.refKey]: source?.source_ref ?? null
    }
  };
}

function collectForbiddenFields(
  value: any,
  fields: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectForbiddenFields(item, fields, [...path, String(index)])
    );
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    const normalized = normalizeKey(key);
    const currentPath = [...path, key];
    const isFalseBoundaryFlag = nested === false &&
      currentPath.some((part) =>
        ["boundary_policy", "feeds"].includes(normalizeKey(part))
      );
    if (
      !isFalseBoundaryFlag &&
      !["blocked_uses"].includes(normalized) &&
      FORBIDDEN_FIELD_PATTERNS.some((pattern) => pattern.test(key) || pattern.test(normalized))
    ) {
      fields.add(currentPath.join("."));
    }
    collectForbiddenFields(nested, fields, currentPath);
  }
  return fields;
}

function isValueExemptPath(path: string[]): boolean {
  const first = normalizeKey(path[0] ?? "");
  return ["blocked_uses", "boundary_policy", "required_caveats"].includes(first);
}

function collectForbiddenValues(
  value: any,
  fields: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (typeof value === "string") {
    const normalizedValue = normalizeKey(value);
    if (
      !isValueExemptPath(path) &&
      (
        EMAIL_VALUE_PATTERN.test(value) ||
        DIRECT_IDENTIFIER_VALUE_PATTERN.test(value) ||
        UNSAFE_VALUE_PATTERNS.some((pattern) =>
          pattern.test(value) || pattern.test(normalizedValue)
        )
      )
    ) {
      fields.add(path.join(".") || "value");
    }
    return fields;
  }
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectForbiddenValues(item, fields, [...path, String(index)])
    );
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    collectForbiddenValues(nested, fields, [...path, key]);
  }
  return fields;
}

export function buildAssumptionGovernanceOperatorSourceHandoff(
  input: BuildAssumptionGovernanceOperatorSourceHandoffInput
): any {
  const laneKey = laneKeyOf(input.lane);
  const config = configFor(input.lane);
  const inputGaps = config
    ? sourceGaps(input.source, config)
    : [`lane is invalid: ${String(input.lane ?? "")}`];
  const blocked = !config || inputGaps.some((gap) =>
    ![
      "source.state must be present",
      "source.owner_approval_state must be approved",
      "source.review_state must be clear",
      "source.aggregate_only must be true",
      "source.aligned must not be false"
    ].includes(gap)
  );
  const ready = Boolean(config && inputGaps.length === 0);
  const decision = blocked
    ? "BLOCKED"
    : ready
      ? "READY_FOR_OPERATOR_INTAKE"
      : "HELD_NO_FEEDABLE_SOURCE";
  const operatorSource = ready ? operatorSourceFrom(input.source) : null;
  const context = ready && config ? contextFrom(input.source, config) : null;

  return {
    schema_version: AI_VALUE_ASSUMPTION_GOVERNANCE_OPERATOR_SOURCE_HANDOFF_SCHEMA_VERSION,
    handoff_id: input.handoffId ??
      `${safeIdPart(String(laneKey ?? "unknown"))}_operator_source_handoff_${safeIdPart(String(input.source?.source_ref ?? "none"))}`,
    lane_key: laneKey ?? normalizeKey(String(input.lane ?? "")),
    lane_label: config?.label ?? null,
    source_posture: config?.sourcePosture ?? "invalid_assumption_governance_source_posture",
    org_id: input.source?.org_id ?? null,
    client_id: input.source?.client_id ?? null,
    workflow_family: input.source?.workflow_family ?? null,
    function_area: input.source?.function_area ?? null,
    cohort_key: input.source?.cohort_key ?? null,
    source_ref: input.source?.source_ref ?? null,
    decision,
    input_gaps: inputGaps,
    operator_source: operatorSource,
    assumption_context: laneKey === "assumption" ? context : null,
    governance_context: laneKey === "governance" ? context : null,
    source_package_reference: ready && config
      ? sourcePackageReference(input.source, config)
      : null,
    feeds: ready && laneKey ? readyFeeds(laneKey) : falseFeeds(),
    allowed_uses: [...SAFE_ALLOWED_USES],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: boundaryPolicy(),
    required_caveats: [
      "Assumption / Governance Operator Source Handoff accepts approved aggregate assumption or governance source posture only.",
      "The handoff prepares Operator Intake source posture and Source Package alignment hints; it cannot certify Source Package Review Queue clearance or feed Measurement Cell directly.",
      "Assumption approval and governance attestation are context only, not ROI, causality, productivity, financial attribution, confidence percentage, probability, governance override, or customer-facing financial output."
    ],
    generated_at: input.generatedAt ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
}

function contextKeyFor(handoff: any): "assumption_context" | "governance_context" | null {
  if (handoff?.lane_key === "assumption") return "assumption_context";
  if (handoff?.lane_key === "governance") return "governance_context";
  return null;
}

function recomputeFeeds(
  handoff: any,
  valid: boolean
): AssumptionGovernanceOperatorSourceHandoffValidationResult["feeds"] {
  if (!valid || handoff?.decision !== "READY_FOR_OPERATOR_INTAKE") return falseFeeds();
  const laneKey = laneKeyOf(handoff?.lane_key);
  return laneKey ? readyFeeds(laneKey) : falseFeeds();
}

function collectReadySourceGaps(handoff: any): string[] {
  const gaps: string[] = [];
  const laneKey = laneKeyOf(handoff?.lane_key);
  const config = laneKey ? LANE_CONFIG[laneKey] : null;
  const contextKey = contextKeyFor(handoff);
  const context = contextKey ? handoff?.[contextKey] : null;
  for (const field of [
    "org_id",
    "client_id",
    "workflow_family",
    "function_area",
    "cohort_key",
    "source_ref",
    "operator_source",
    "source_package_reference"
  ]) {
    requireField(handoff?.[field], field, gaps);
  }
  if (!laneKey || !config || !contextKey) {
    gaps.push("lane_key must be assumption or governance");
    return gaps;
  }
  requireField(context, contextKey, gaps);
  if (handoff?.operator_source?.state !== "present") {
    gaps.push("operator_source.state must be present");
  }
  if (handoff?.operator_source?.intake_mode !== config.intakeMode) {
    gaps.push(`operator_source.intake_mode must be ${config.intakeMode}`);
  }
  if (handoff?.operator_source?.source_ref !== handoff?.source_ref) {
    gaps.push("operator_source.source_ref must match handoff source_ref");
  }
  if (!handoff?.operator_source?.owner_role) {
    gaps.push("operator_source.owner_role is required");
  }
  if (handoff?.operator_source?.owner_approval_state !== "approved") {
    gaps.push("operator_source.owner_approval_state must be approved");
  }
  if (handoff?.operator_source?.review_state !== "clear") {
    gaps.push("operator_source.review_state must be clear");
  }
  if (handoff?.operator_source?.aggregate_only !== true) {
    gaps.push("operator_source.aggregate_only must be true");
  }
  if (context?.source_ref !== handoff?.source_ref) {
    gaps.push(`${contextKey}.source_ref must match handoff source_ref`);
  }
  for (const key of [
    "org_id",
    "client_id",
    "workflow_family",
    "function_area",
    "cohort_key",
    "baseline_window",
    "comparison_window",
    "owner_approval_state",
    "source_review_state"
  ]) {
    const operatorSourceKey =
      key === "source_review_state" ? "review_state" : key;
    if (
      JSON.stringify(context?.[key] ?? null) !==
      JSON.stringify(handoff?.operator_source?.[operatorSourceKey] ?? null)
    ) {
      gaps.push(`${contextKey}.${key} must match operator_source.${operatorSourceKey}`);
    }
  }
  if (context?.context_role !== config.contextRole) {
    gaps.push(`${contextKey}.context_role must be ${config.contextRole}`);
  }
  if (handoff?.source_package_reference?.source_package_type !== config.packageType) {
    gaps.push(`source_package_reference.source_package_type must be ${config.packageType}`);
  }
  if (handoff?.source_package_reference?.source_refs?.[config.refKey] !== handoff?.source_ref) {
    gaps.push(`source_package_reference.source_refs.${config.refKey} must match handoff source_ref`);
  }
  const wrongRefKey = laneKey === "assumption"
    ? "governance_control_export_id"
    : "assumption_approval_export_id";
  if (handoff?.source_package_reference?.source_refs?.[wrongRefKey] !== undefined) {
    gaps.push(`source_package_reference.source_refs.${wrongRefKey} is not supported for ${laneKey}`);
  }
  return gaps;
}

export function validateAssumptionGovernanceOperatorSourceHandoff(
  handoff: any
): AssumptionGovernanceOperatorSourceHandoffValidationResult {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "handoff_id",
    "lane_key",
    "source_posture",
    "decision",
    "input_gaps",
    "feeds",
    "allowed_uses",
    "blocked_uses",
    "boundary_policy",
    "required_caveats",
    "generated_at",
    "derivation_version"
  ]) {
    requireField(handoff?.[field], field, gaps);
  }
  if (
    handoff?.schema_version &&
    handoff.schema_version !== AI_VALUE_ASSUMPTION_GOVERNANCE_OPERATOR_SOURCE_HANDOFF_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${handoff.schema_version}`);
  }
  const laneKey = laneKeyOf(handoff?.lane_key);
  if (!laneKey) {
    gaps.push("lane_key must be assumption or governance");
  }
  if (laneKey && handoff?.source_posture !== LANE_CONFIG[laneKey].sourcePosture) {
    gaps.push(`source_posture must be ${LANE_CONFIG[laneKey].sourcePosture}`);
  }
  if (handoff?.decision && !ALLOWED_DECISIONS.has(String(handoff.decision))) {
    gaps.push(`decision is invalid: ${handoff.decision}`);
  }
  if (Array.isArray(handoff?.input_gaps)) {
    const blockingInputGaps = handoff.input_gaps.filter((gap: any) =>
      ![
        "source.state must be present",
        "source.owner_approval_state must be approved",
        "source.review_state must be clear",
        "source.aggregate_only must be true",
        "source.aligned must not be false"
      ].includes(String(gap))
    );
    if (handoff?.decision === "BLOCKED") gaps.push(...blockingInputGaps);
  }
  if (handoff?.decision === "READY_FOR_OPERATOR_INTAKE") {
    gaps.push(...collectReadySourceGaps(handoff));
  } else {
    for (const field of [
      "operator_source",
      "assumption_context",
      "governance_context",
      "source_package_reference"
    ]) {
      if (handoff?.[field] !== null && handoff?.[field] !== undefined) {
        gaps.push(`held or blocked handoff must not carry ${field}`);
      }
    }
    for (const field of [
      "operator_intake_source",
      "data_spine_assumption_source",
      "data_spine_governance_source",
      "assumption_context_fragment",
      "governance_context_fragment"
    ]) {
      if (handoff?.feeds?.[field] !== false) {
        gaps.push(`held or blocked handoff cannot feed ${field}`);
      }
    }
  }
  for (const field of [
    "measurement_cell_direct_feed",
    "finance_context_investigation",
    "confidence_model",
    "customer_facing_financial_output"
  ]) {
    if (handoff?.feeds?.[field] !== false) {
      gaps.push(`feeds.${field} must be false`);
    }
  }
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!stringsOf(handoff?.blocked_uses).includes(use)) {
      gaps.push(`blocked_uses missing ${use}`);
    }
  }
  for (const use of SAFE_ALLOWED_USES) {
    if (!stringsOf(handoff?.allowed_uses).includes(use)) {
      gaps.push(`allowed_uses missing ${use}`);
    }
  }
  for (const use of stringsOf(handoff?.allowed_uses)) {
    if (!SAFE_ALLOWED_USES.includes(use)) {
      gaps.push(`allowed_uses contains unsupported use: ${use}`);
    }
  }
  for (const field of REQUIRED_FALSE_BOUNDARY_FIELDS) {
    if (handoff?.boundary_policy?.[field] !== false) {
      gaps.push(`boundary_policy.${field} must be false`);
    }
  }
  for (const field of [...collectForbiddenFields(handoff)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  for (const field of [...collectForbiddenValues(handoff)].sort()) {
    gaps.push(`Unsafe identifier value detected: ${field}`);
  }
  const valid = gaps.length === 0;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    handoff_id: handoff?.handoff_id ?? null,
    valid,
    gaps,
    feeds: recomputeFeeds(handoff, valid)
  };
}
