/**
 * AI Value Engine - Customer Journey.
 *
 * Contract-only post-sales journey state for moving from aggregate AI Fluency
 * intake through client evidence requests, safe aggregate evidence entry, and
 * later internal review stages. It does not create routes, UI, ingestion jobs,
 * persistence, claim readiness snapshots, executive readout snapshots, ROI,
 * EBITA, productivity, causality, or customer-facing financial output.
 */

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_CUSTOMER_JOURNEY_VALIDATION_2026_06";

export const AI_VALUE_CUSTOMER_JOURNEY_SCHEMA_VERSION =
  "FT_AI_VALUE_CUSTOMER_JOURNEY_2026_06";

const DERIVATION_VERSION =
  "ai_value_customer_journey_builder_2026_06";

const REQUIRED_JOURNEY_FIELDS = [
  "schema_version",
  "customer_journey_id",
  "org_id",
  "journey_status",
  "stages",
  "governance",
  "persistence_policy",
  "created_at",
  "updated_at",
  "derivation_version"
] as const;

export const CUSTOMER_JOURNEY_STAGE_IDS = [
  "post_sales_kickoff",
  "ai_fluency_intake",
  "initial_signal_capture",
  "measurement_plan_draft",
  "evidence_gap_review",
  "client_evidence_request",
  "client_evidence_entry",
  "evidence_snapshot_review",
  "claim_readiness_review",
  "executive_readout_preparation",
  "intervention_retest"
] as const;

const REQUIRED_STAGE_FIELDS = [
  "stage_id",
  "stage_status",
  "required_inputs",
  "produced_outputs",
  "evidence_layers_touched",
  "allowed_outputs",
  "blocked_outputs",
  "required_caveats",
  "owner_role",
  "customer_visible",
  "customer_action_required",
  "created_at",
  "updated_at"
] as const;

const ALLOWED_STAGE_STATUSES = new Set([
  "not_started",
  "in_progress",
  "blocked",
  "complete",
  "skipped",
  "held"
]);

const ALLOWED_JOURNEY_STATUSES = new Set([
  "active",
  "held",
  "complete",
  "archived"
]);

const ALLOWED_EVIDENCE_LAYERS = new Set([
  "layer_1_platform_telemetry",
  "layer_2_user_voice_empirical",
  "layer_3_business_system_outcomes",
  "governance_evidence",
  "assumption_evidence"
]);

const REQUIRED_BLOCKED_OUTPUTS = [
  "realized_roi",
  "ebita_claim",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "people_decisioning",
  "customer_facing_financial_output"
];

const CLIENT_ENTRY_BLOCKED_OUTPUTS = [
  "raw_rows",
  "raw_prompts",
  "raw_responses",
  "transcripts",
  "query_text",
  "file_contents",
  "direct_identifiers",
  "hashed_or_joinable_person_identifiers",
  "person_level_hris_records",
  "person_level_productivity"
];

const EARLY_STAGE_IDS = new Set([
  "post_sales_kickoff",
  "ai_fluency_intake",
  "initial_signal_capture",
  "measurement_plan_draft",
  "evidence_gap_review",
  "client_evidence_request"
]);

const CLAIM_OUTPUT_PATTERNS = [
  /(^|[_\s-])roi($|[_\s-])/i,
  /return[_\s-]?on[_\s-]?investment/i,
  /realized[_\s-]?roi/i,
  /ebita/i,
  /causal(?:ity)?[_\s-]?claim/i,
  /productivity[_\s-]?claim/i,
  /headcount[_\s-]?reduction/i,
  /financial[_\s-]?output/i,
  /financial[_\s-]?value/i,
  /dollar(?:ized)?[_\s-]?(?:output|value|impact)/i,
  /customer[_\s-]?facing[_\s-]?(?:financial|economic)/i
];

const PEOPLE_ANALYTICS_OUTPUT_PATTERNS = [
  /individual[_\s-]?(?:attribution|scoring|score|productivity)/i,
  /person[_\s-]?(?:scoring|score|productivity)/i,
  /employee[_\s-]?(?:scoring|score|productivity)/i,
  /manager[_\s-]?(?:or[_\s-]?team[_\s-]?)?ranking/i,
  /team[_\s-]?ranking/i,
  /manager[_\s-]?chain/i,
  /people[_\s-]?decisioning/i,
  /compensation/i,
  /performance[_\s-]?inference/i,
  /promotion/i,
  /discipline/i,
  /attrition[_\s-]?prediction/i,
  /hris[_\s-]?inference/i
];

const EVIDENCE_GAP_CAVEAT_PATTERNS = {
  layer_2: /(?:missing|held|requested|awaiting|not[_\s-]?support|cannot[_\s-]?be[_\s-]?treated[_\s-]?as[_\s-]?support).*(?:layer 2|layer_2)|(?:layer 2|layer_2).*(?:missing|held|requested|awaiting|not[_\s-]?support|cannot[_\s-]?be[_\s-]?treated[_\s-]?as[_\s-]?support)/i,
  layer_3: /(?:missing|held|requested|awaiting|not[_\s-]?support|cannot[_\s-]?be[_\s-]?treated[_\s-]?as[_\s-]?support).*(?:layer 3|layer_3)|(?:layer 3|layer_3).*(?:missing|held|requested|awaiting|not[_\s-]?support|cannot[_\s-]?be[_\s-]?treated[_\s-]?as[_\s-]?support)/i
};

const CLIENT_EVIDENCE_REQUEST_UNSAFE_OUTPUT_PATTERNS = [
  /claim/i,
  /proof/i,
  /readiness/i,
  /value[_\s-]?(?:case|proof|claim|readout|output)/i,
  /executive[_\s-]?readout/i,
  /financial[_\s-]?(?:output|claim|value)/i,
  /economic[_\s-]?(?:output|claim|value)/i
];

const FORBIDDEN_FIELD_KEY_PATTERNS = [
  /raw_(?:rows?|prompt|response|transcript|content)/i,
  /prompt/i,
  /^responses?$/i,
  /response_text/i,
  /transcript/i,
  /^query$/i,
  /query_text/i,
  /sql_text/i,
  /^file_contents?$/i,
  /file_content/i,
  /email/i,
  /user_id/i,
  /employee_id/i,
  /employee_email/i,
  /employee_name/i,
  /person_id/i,
  /person_identifier/i,
  /direct_identifier/i,
  /hashed_(?:user|person|employee)_id/i,
  /joinable_(?:user|person|employee)_identifier/i,
  /hashed_or_joinable_person_identifiers/i,
  /person_level_hris/i,
  /person_level_productivity/i,
  /manager_ranking/i,
  /team_ranking/i,
  /manager_chain/i,
  /people_decisioning/i,
  /compensation/i,
  /performance_rating/i,
  /promotion/i,
  /discipline/i,
  /attrition_prediction/i,
  /hris_inference/i
];

const GOVERNED_KEY_ALLOWLIST = new Set([
  "blocked_outputs",
  "contains_raw_rows",
  "contains_raw_prompts",
  "contains_raw_responses",
  "contains_transcripts",
  "contains_query_text",
  "contains_file_contents",
  "contains_direct_identifiers",
  "contains_hashed_or_joinable_person_identifiers",
  "contains_person_level_hris_records",
  "contains_person_level_productivity",
  "contains_manager_or_team_ranking",
  "contains_people_decisioning"
]);

const FORBIDDEN_EXACT_FIELD_KEYS = new Set([
  ...REQUIRED_BLOCKED_OUTPUTS,
  ...CLIENT_ENTRY_BLOCKED_OUTPUTS
]);

const UNSAFE_ENTRY_FLAGS = [
  "contains_raw_rows",
  "contains_raw_prompts",
  "contains_raw_responses",
  "contains_transcripts",
  "contains_query_text",
  "contains_file_contents",
  "contains_direct_identifiers",
  "contains_hashed_or_joinable_person_identifiers",
  "contains_person_level_hris_records",
  "contains_person_level_productivity",
  "contains_manager_or_team_ranking",
  "contains_people_decisioning"
];

export const CustomerJourneySchema = {
  schema_version: AI_VALUE_CUSTOMER_JOURNEY_SCHEMA_VERSION,
  required_fields: REQUIRED_JOURNEY_FIELDS,
  required_stage_fields: REQUIRED_STAGE_FIELDS,
  stage_ids: CUSTOMER_JOURNEY_STAGE_IDS,
  allowed_stage_statuses: [...ALLOWED_STAGE_STATUSES],
  allowed_evidence_layers: [...ALLOWED_EVIDENCE_LAYERS],
  required_blocked_outputs: REQUIRED_BLOCKED_OUTPUTS,
  persistence_policy: {
    persisted: false,
    creates_migrations: false,
    creates_prisma_schema: false,
    creates_backend_routes: false,
    creates_frontend_ui: false,
    creates_ingestion_jobs: false,
    creates_claim_readiness_snapshots: false,
    creates_executive_readout_snapshots: false
  }
} as const;

export interface CustomerJourneyStage {
  stage_id: string;
  stage_status: string;
  required_inputs: string[];
  produced_outputs: string[];
  evidence_layers_touched: string[];
  allowed_outputs: string[];
  blocked_outputs: string[];
  required_caveats: string[];
  owner_role: string;
  customer_visible: boolean;
  customer_action_required: boolean;
  created_at: string;
  updated_at: string;
  input_boundary?: {
    aggregate_only: boolean;
    source_owner_approved_or_attested: boolean;
    manual_entry_allowed: boolean;
    export_metadata_allowed: boolean;
    [key: string]: boolean;
  };
  causal_design?: {
    approved: boolean;
    design_id?: string;
    caveats: string[];
  };
}

export interface CustomerJourney {
  schema_version: string;
  customer_journey_id: string;
  org_id: string;
  customer_account_id?: string;
  engagement_id?: string;
  journey_status: string;
  stages: CustomerJourneyStage[];
  governance: {
    aggregate_only: boolean;
    ai_fluency_baseline_is_value_proof: boolean;
    bigquery_source_availability_is_value_proof: boolean;
    vbd_is_layer_1_only: boolean;
    customer_facing_financial_output_allowed: boolean;
    [key: string]: boolean;
  };
  persistence_policy: {
    persisted: boolean;
    creates_migrations: boolean;
    creates_prisma_schema: boolean;
    creates_backend_routes: boolean;
    creates_frontend_ui: boolean;
    creates_ingestion_jobs: boolean;
    creates_claim_readiness_snapshots: boolean;
    creates_executive_readout_snapshots: boolean;
  };
  created_at: string;
  updated_at: string;
  derivation_version: string;
}

export interface CustomerJourneyValidationResult {
  schema_version: string;
  customer_journey_id: string | null;
  org_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    customer_journey: boolean;
    measurement_plan_draft_context: boolean;
    client_evidence_request_context: boolean;
    client_evidence_entry_context: boolean;
    claim_readiness_snapshot: boolean;
    executive_readout_snapshot: boolean;
    customer_facing_financial_output: boolean;
  };
}

export interface BuildInitialCustomerJourneyInputs {
  journeyId: string;
  orgId: string;
  customerAccountId?: string;
  engagementId?: string;
  createdAt?: string;
  updatedAt?: string;
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function stringArray(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function isPlainObject(value: any): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

function requireBoolean(value: any, expected: boolean, path: string, gaps: string[]): void {
  if (value !== expected) {
    gaps.push(`${path} must be ${expected}`);
  }
}

function hasToken(values: any, token: string): boolean {
  return stringArray(values).map(normalizeToken).includes(token);
}

function requireBlockedOutputs(stage: any, outputs: string[], path: string, gaps: string[]): void {
  for (const blockedOutput of outputs) {
    if (!hasToken(stage?.blocked_outputs, blockedOutput)) {
      gaps.push(`${path}.blocked_outputs must include ${blockedOutput}`);
    }
  }
}

function collectForbiddenFields(value: any, fields: Set<string> = new Set()): Set<string> {
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item) => collectForbiddenFields(item, fields));
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (!GOVERNED_KEY_ALLOWLIST.has(key) &&
        (FORBIDDEN_EXACT_FIELD_KEYS.has(key) ||
         FORBIDDEN_FIELD_KEY_PATTERNS.some((pattern) => pattern.test(key)))) {
      fields.add(key);
    }
    collectForbiddenFields(nested, fields);
  }
  return fields;
}

function collectUnsafeOutputValues(stage: any): string[] {
  const values = [
    ...stringArray(stage?.allowed_outputs),
    ...stringArray(stage?.produced_outputs)
  ];
  return values.filter((value) =>
    CLAIM_OUTPUT_PATTERNS.some((pattern) => pattern.test(value)) ||
    PEOPLE_ANALYTICS_OUTPUT_PATTERNS.some((pattern) => pattern.test(value))
  );
}

function validateStage(stage: any, index: number, gaps: string[]): void {
  const path = `stages[${index}]`;
  for (const field of REQUIRED_STAGE_FIELDS) {
    requireField(stage?.[field], `${path}.${field}`, gaps);
  }

  if (stage?.stage_id && !CUSTOMER_JOURNEY_STAGE_IDS.includes(stage.stage_id)) {
    gaps.push(`${path}.stage_id is invalid: ${stage.stage_id}`);
  }
  if (stage?.stage_status && !ALLOWED_STAGE_STATUSES.has(stage.stage_status)) {
    gaps.push(`${path}.stage_status is invalid: ${stage.stage_status}`);
  }
  for (const field of [
    "required_inputs",
    "produced_outputs",
    "evidence_layers_touched",
    "allowed_outputs",
    "blocked_outputs",
    "required_caveats"
  ]) {
    requireArray(stage?.[field], `${path}.${field}`, gaps);
  }
  if (typeof stage?.customer_visible !== "boolean") {
    gaps.push(`${path}.customer_visible must be a boolean`);
  }
  if (typeof stage?.customer_action_required !== "boolean") {
    gaps.push(`${path}.customer_action_required must be a boolean`);
  }

  for (const layer of stringArray(stage?.evidence_layers_touched)) {
    if (!ALLOWED_EVIDENCE_LAYERS.has(layer)) {
      gaps.push(`${path}.evidence_layers_touched contains invalid layer: ${layer}`);
    }
  }

  const unsafeOutputs = collectUnsafeOutputValues(stage);
  for (const output of unsafeOutputs) {
    gaps.push(`${path} contains unsafe allowed or produced output: ${output}`);
  }

  requireBlockedOutputs(stage, REQUIRED_BLOCKED_OUTPUTS, path, gaps);
  if (EARLY_STAGE_IDS.has(stage?.stage_id)) {
    requireBlockedOutputs(stage, REQUIRED_BLOCKED_OUTPUTS, path, gaps);
  }

  if (stage?.stage_id === "evidence_gap_review") {
    const caveats = stringArray(stage.required_caveats).join(" ");
    if (!EVIDENCE_GAP_CAVEAT_PATTERNS.layer_2.test(caveats)) {
      gaps.push(`${path}.required_caveats must explicitly preserve missing Layer 2 evidence`);
    }
    if (!EVIDENCE_GAP_CAVEAT_PATTERNS.layer_3.test(caveats)) {
      gaps.push(`${path}.required_caveats must explicitly preserve missing Layer 3 evidence`);
    }
  }

  if (stage?.stage_id === "client_evidence_request") {
    const outputs = [
      ...stringArray(stage.allowed_outputs),
      ...stringArray(stage.produced_outputs)
    ];
    for (const output of outputs) {
      if (CLIENT_EVIDENCE_REQUEST_UNSAFE_OUTPUT_PATTERNS.some((pattern) => pattern.test(output))) {
        gaps.push(`${path} cannot create claim-equivalent outputs: ${output}`);
      }
    }
  }

  if (stage?.stage_id === "client_evidence_entry") {
    requireBlockedOutputs(stage, CLIENT_ENTRY_BLOCKED_OUTPUTS, path, gaps);
    const boundary = stage.input_boundary;
    if (!isPlainObject(boundary)) {
      gaps.push(`${path}.input_boundary is required for client evidence entry`);
    } else {
      requireBoolean(boundary.aggregate_only, true, `${path}.input_boundary.aggregate_only`, gaps);
      requireBoolean(
        boundary.source_owner_approved_or_attested,
        true,
        `${path}.input_boundary.source_owner_approved_or_attested`,
        gaps
      );
      for (const flag of UNSAFE_ENTRY_FLAGS) {
        requireBoolean(boundary[flag], false, `${path}.input_boundary.${flag}`, gaps);
      }
    }
  }

  if (stage?.stage_id === "intervention_retest") {
    if (stage?.causal_design?.approved !== true) {
      if (!hasToken(stage.blocked_outputs, "causality_claim")) {
        gaps.push(`${path}.blocked_outputs must include causality_claim without approved causal design`);
      }
    }
  }
}

function validateStageSet(stages: any[], gaps: string[]): void {
  const seen = new Set<string>();
  stages.forEach((stage, index) => {
    if (stage?.stage_id) {
      if (seen.has(stage.stage_id)) {
        gaps.push(`stages contains duplicate stage_id: ${stage.stage_id}`);
      }
      seen.add(stage.stage_id);
      const expected = CUSTOMER_JOURNEY_STAGE_IDS[index];
      if (expected && stage.stage_id !== expected) {
        gaps.push(`stages[${index}].stage_id must be ${expected}`);
      }
    }
    validateStage(stage, index, gaps);
  });

  for (const stageId of CUSTOMER_JOURNEY_STAGE_IDS) {
    if (!seen.has(stageId)) {
      gaps.push(`stages missing required stage: ${stageId}`);
    }
  }
}

export function validateCustomerJourney(journey: any): CustomerJourneyValidationResult {
  const gaps: string[] = [];

  for (const field of REQUIRED_JOURNEY_FIELDS) {
    requireField(journey?.[field], field, gaps);
  }
  if (journey?.schema_version &&
      journey.schema_version !== AI_VALUE_CUSTOMER_JOURNEY_SCHEMA_VERSION) {
    gaps.push(`schema_version is invalid: ${journey.schema_version}`);
  }
  if (journey?.journey_status && !ALLOWED_JOURNEY_STATUSES.has(journey.journey_status)) {
    gaps.push(`journey_status is invalid: ${journey.journey_status}`);
  }

  const stages = Array.isArray(journey?.stages) ? journey.stages : [];
  if (!Array.isArray(journey?.stages)) {
    gaps.push("stages must be an array");
  } else {
    validateStageSet(stages, gaps);
  }

  const governance = journey?.governance ?? {};
  requireBoolean(governance.aggregate_only, true, "governance.aggregate_only", gaps);
  requireBoolean(
    governance.ai_fluency_baseline_is_value_proof,
    false,
    "governance.ai_fluency_baseline_is_value_proof",
    gaps
  );
  requireBoolean(
    governance.bigquery_source_availability_is_value_proof,
    false,
    "governance.bigquery_source_availability_is_value_proof",
    gaps
  );
  requireBoolean(governance.vbd_is_layer_1_only, true, "governance.vbd_is_layer_1_only", gaps);
  requireBoolean(
    governance.customer_facing_financial_output_allowed,
    false,
    "governance.customer_facing_financial_output_allowed",
    gaps
  );

  const persistence = journey?.persistence_policy ?? {};
  for (const flag of [
    "persisted",
    "creates_migrations",
    "creates_prisma_schema",
    "creates_backend_routes",
    "creates_frontend_ui",
    "creates_ingestion_jobs",
    "creates_claim_readiness_snapshots",
    "creates_executive_readout_snapshots"
  ]) {
    requireBoolean(persistence[flag], false, `persistence_policy.${flag}`, gaps);
  }

  for (const field of [...collectForbiddenFields(journey)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }

  const valid = gaps.length === 0;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    customer_journey_id: journey?.customer_journey_id ?? null,
    org_id: journey?.org_id ?? null,
    valid,
    gaps,
    feeds: {
      customer_journey: valid,
      measurement_plan_draft_context: valid,
      client_evidence_request_context: valid,
      client_evidence_entry_context: valid,
      claim_readiness_snapshot: false,
      executive_readout_snapshot: false,
      customer_facing_financial_output: false
    }
  };
}

function blockedOutputsForStage(stageId: string): string[] {
  if (stageId === "client_evidence_entry") {
    return [...REQUIRED_BLOCKED_OUTPUTS, ...CLIENT_ENTRY_BLOCKED_OUTPUTS];
  }
  return [...REQUIRED_BLOCKED_OUTPUTS];
}

function buildStage(
  stageId: string,
  createdAt: string,
  overrides: Partial<CustomerJourneyStage> = {}
): CustomerJourneyStage {
  const stage: CustomerJourneyStage = {
    stage_id: stageId,
    stage_status: stageId === "post_sales_kickoff" ? "in_progress" : "not_started",
    required_inputs: [],
    produced_outputs: [],
    evidence_layers_touched: [],
    allowed_outputs: [],
    blocked_outputs: blockedOutputsForStage(stageId),
    required_caveats: [
      "Journey stage is aggregate-only and evidence-limited until required Playbook evidence is provided."
    ],
    owner_role: "post_sales_value_owner",
    customer_visible: true,
    customer_action_required: false,
    created_at: createdAt,
    updated_at: createdAt,
    ...overrides
  };
  return stage;
}

function defaultStages(createdAt: string): CustomerJourneyStage[] {
  return [
    buildStage("post_sales_kickoff", createdAt, {
      required_inputs: ["customer_context", "approved_aggregate_workflow_scope"],
      produced_outputs: ["post_sales_journey_opened"],
      evidence_layers_touched: ["governance_evidence"],
      allowed_outputs: ["journey_stage_state"]
    }),
    buildStage("ai_fluency_intake", createdAt, {
      required_inputs: ["aggregate_ai_fluency_baseline"],
      produced_outputs: ["initial_ai_fluency_posture"],
      evidence_layers_touched: ["layer_2_user_voice_empirical", "governance_evidence"],
      allowed_outputs: ["aggregate_ai_fluency_posture", "directional_capability_context"],
      required_caveats: [
        "AI Fluency baseline is aggregate context only and is not value proof."
      ]
    }),
    buildStage("initial_signal_capture", createdAt, {
      required_inputs: ["layer_1_source_availability_summary", "aggregate_ai_fluency_posture"],
      produced_outputs: ["initial_signal_capture_summary"],
      evidence_layers_touched: ["layer_1_platform_telemetry", "layer_2_user_voice_empirical"],
      allowed_outputs: ["source_availability_context", "initial_evidence_posture"]
    }),
    buildStage("measurement_plan_draft", createdAt, {
      required_inputs: ["value_hypothesis", "workflow_scope", "initial_evidence_posture"],
      produced_outputs: ["measurement_plan_draft"],
      evidence_layers_touched: [
        "layer_1_platform_telemetry",
        "layer_2_user_voice_empirical",
        "layer_3_business_system_outcomes",
        "governance_evidence",
        "assumption_evidence"
      ],
      allowed_outputs: ["measurement_plan_design", "source_package_request_planning"]
    }),
    buildStage("evidence_gap_review", createdAt, {
      required_inputs: ["measurement_plan_draft", "current_source_package_posture"],
      produced_outputs: ["evidence_gap_review_packet"],
      evidence_layers_touched: [
        "layer_1_platform_telemetry",
        "layer_2_user_voice_empirical",
        "layer_3_business_system_outcomes",
        "governance_evidence",
        "assumption_evidence"
      ],
      allowed_outputs: ["missing_evidence_summary", "customer_evidence_request_planning"],
      required_caveats: [
        "Missing Layer 2 user voice evidence must remain explicit and cannot be treated as support.",
        "Missing Layer 3 system-of-record outcome evidence must remain explicit and cannot be treated as support."
      ]
    }),
    buildStage("client_evidence_request", createdAt, {
      required_inputs: ["evidence_gap_review_packet", "measurement_plan_source_requirements"],
      produced_outputs: ["client_evidence_request_packet"],
      evidence_layers_touched: [
        "layer_2_user_voice_empirical",
        "layer_3_business_system_outcomes",
        "governance_evidence",
        "assumption_evidence"
      ],
      allowed_outputs: ["aggregate_evidence_request", "source_owner_attestation_request"],
      customer_action_required: true,
      required_caveats: [
        "Client evidence request is an evidence collection artifact only and cannot create claims."
      ]
    }),
    buildStage("client_evidence_entry", createdAt, {
      required_inputs: [
        "aggregate_export_metadata",
        "manual_aggregate_metric_entry",
        "source_owner_attestation"
      ],
      produced_outputs: ["validated_aggregate_client_evidence_entry"],
      evidence_layers_touched: [
        "layer_2_user_voice_empirical",
        "layer_3_business_system_outcomes",
        "governance_evidence",
        "assumption_evidence"
      ],
      allowed_outputs: ["source_package_candidate", "aggregate_attestation_record"],
      customer_action_required: true,
      input_boundary: {
        aggregate_only: true,
        source_owner_approved_or_attested: true,
        manual_entry_allowed: true,
        export_metadata_allowed: true,
        contains_raw_rows: false,
        contains_raw_prompts: false,
        contains_raw_responses: false,
        contains_transcripts: false,
        contains_query_text: false,
        contains_file_contents: false,
        contains_direct_identifiers: false,
        contains_hashed_or_joinable_person_identifiers: false,
        contains_person_level_hris_records: false,
        contains_person_level_productivity: false,
        contains_manager_or_team_ranking: false,
        contains_people_decisioning: false
      },
      required_caveats: [
        "Client evidence entry accepts aggregate, attested, privacy-safe evidence only."
      ]
    }),
    buildStage("evidence_snapshot_review", createdAt, {
      required_inputs: ["validated_source_packages", "measurement_plan"],
      produced_outputs: ["evidence_snapshot_review_packet"],
      evidence_layers_touched: [
        "layer_1_platform_telemetry",
        "layer_2_user_voice_empirical",
        "layer_3_business_system_outcomes",
        "governance_evidence",
        "assumption_evidence"
      ],
      allowed_outputs: ["evidence_snapshot_review_context", "coverage_status_review"]
    }),
    buildStage("claim_readiness_review", createdAt, {
      required_inputs: ["validated_evidence_snapshot", "claim_readiness_handoff"],
      produced_outputs: ["internal_claim_readiness_review_packet"],
      evidence_layers_touched: [
        "layer_1_platform_telemetry",
        "layer_2_user_voice_empirical",
        "layer_3_business_system_outcomes",
        "governance_evidence",
        "assumption_evidence"
      ],
      allowed_outputs: ["internal_claim_readiness_review_context"],
      customer_visible: false
    }),
    buildStage("executive_readout_preparation", createdAt, {
      required_inputs: ["claim_readiness_review_packet", "customer_exposure_policy"],
      produced_outputs: ["internal_executive_readout_preparation_packet"],
      evidence_layers_touched: [
        "layer_1_platform_telemetry",
        "layer_2_user_voice_empirical",
        "layer_3_business_system_outcomes",
        "governance_evidence",
        "assumption_evidence"
      ],
      allowed_outputs: ["internal_readout_preparation_context"],
      customer_visible: false
    }),
    buildStage("intervention_retest", createdAt, {
      required_inputs: ["intervention_plan", "aggregate_retest_design"],
      produced_outputs: ["intervention_retest_plan"],
      evidence_layers_touched: [
        "layer_2_user_voice_empirical",
        "layer_3_business_system_outcomes",
        "governance_evidence",
        "assumption_evidence"
      ],
      allowed_outputs: ["aggregate_retest_plan", "before_after_evidence_planning"],
      causal_design: {
        approved: false,
        caveats: [
          "Retest planning does not support causality claims without approved causal design."
        ]
      },
      required_caveats: [
        "Intervention retest can compare aggregate posture over time but cannot claim causality without approved causal design."
      ]
    })
  ];
}

export function buildInitialCustomerJourney(
  inputs: BuildInitialCustomerJourneyInputs
): CustomerJourney {
  const createdAt = inputs.createdAt ?? new Date().toISOString();
  const updatedAt = inputs.updatedAt ?? createdAt;
  return {
    schema_version: AI_VALUE_CUSTOMER_JOURNEY_SCHEMA_VERSION,
    customer_journey_id: inputs.journeyId,
    org_id: inputs.orgId,
    customer_account_id: inputs.customerAccountId,
    engagement_id: inputs.engagementId,
    journey_status: "active",
    stages: defaultStages(createdAt).map((stage) => ({
      ...stage,
      updated_at: updatedAt
    })),
    governance: {
      aggregate_only: true,
      ai_fluency_baseline_is_value_proof: false,
      bigquery_source_availability_is_value_proof: false,
      vbd_is_layer_1_only: true,
      customer_facing_financial_output_allowed: false
    },
    persistence_policy: {
      persisted: false,
      creates_migrations: false,
      creates_prisma_schema: false,
      creates_backend_routes: false,
      creates_frontend_ui: false,
      creates_ingestion_jobs: false,
      creates_claim_readiness_snapshots: false,
      creates_executive_readout_snapshots: false
    },
    created_at: createdAt,
    updated_at: updatedAt,
    derivation_version: DERIVATION_VERSION
  };
}
