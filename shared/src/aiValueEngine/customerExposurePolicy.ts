/**
 * AI Value Engine - Customer Exposure Policy.
 *
 * Contract-only projection for what post-sales AI Value workflow state may be
 * shown to a customer. It does not create routes, UI, ingestion, persistence,
 * exports, readouts, ROI, EBITA, causality, productivity, headcount,
 * individual attribution, ranking, people decisioning, or customer-facing
 * financial output.
 */

import {
  validatePostSalesWorkflowOrchestrator,
  type PostSalesWorkflowOrchestrator
} from "./postSalesWorkflowOrchestrator";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_CUSTOMER_EXPOSURE_POLICY_VALIDATION_2026_06";

export const AI_VALUE_CUSTOMER_EXPOSURE_POLICY_SCHEMA_VERSION =
  "FT_AI_VALUE_CUSTOMER_EXPOSURE_POLICY_2026_06";

const DERIVATION_VERSION =
  "ai_value_customer_exposure_policy_builder_2026_06";

const REQUIRED_EXPOSURE_SURFACE_IDS = [
  "ai_fluency_initial_posture",
  "evidence_gap_review",
  "client_evidence_requests",
  "client_evidence_entry_statuses",
  "validated_source_packages",
  "updated_evidence_snapshot",
  "claim_readiness_preview",
  "executive_readout_preparation",
  "export_package"
] as const;

const REQUIRED_FIELDS = [
  "schema_version",
  "policy_id",
  "org_id",
  "source_binding",
  "coverage_status",
  "exposure_decisions",
  "missing_evidence_visibility",
  "source_availability_boundary",
  "financial_claim_policy",
  "readout_policy",
  "export_policy",
  "privacy_boundary",
  "persistence_policy",
  "allowed_customer_outputs",
  "blocked_customer_outputs",
  "blocked_uses",
  "required_caveats",
  "created_at",
  "derivation_version"
] as const;

const REQUIRED_BLOCKED_USES = [
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

const REQUIRED_BLOCKED_CUSTOMER_OUTPUTS = [
  "value_proof",
  "roi_output",
  "ebita_output",
  "causality_output",
  "productivity_output",
  "headcount_output",
  "individual_attribution_output",
  "manager_or_team_ranking_output",
  "people_decisioning_output",
  "customer_facing_financial_output",
  "raw_data_export",
  "claim_readiness_snapshot_export",
  "executive_readout_snapshot_export"
];

const SAFE_CUSTOMER_OUTPUTS = [
  "ai_fluency_posture_summary",
  "evidence_gap_summary",
  "client_evidence_request_list",
  "client_evidence_entry_status_summary",
  "source_package_status_summary",
  "evidence_snapshot_coverage_summary",
  "claim_boundary_preview",
  "executive_readout_preparation_status"
];

const REQUIRED_CAVEATS = [
  "AI Fluency-only output is customer-visible as posture, not value proof.",
  "Evidence gaps and missing, held, suppressed, rejected, or not-computed evidence must remain visible.",
  "Client Evidence Requests are customer-visible evidence asks and do not improve claim readiness by themselves.",
  "Client Evidence Entry status may be customer-visible, but raw submitted rows, files, prompts, responses, transcripts, query text, file contents, and person-level records remain blocked.",
  "Validated Source Packages may be referenced only as aggregate evidence status, not raw evidence payloads.",
  "Evidence Snapshot exposure is limited to coverage status, caveats, blocked uses, and evidence gaps.",
  "Claim readiness preview is boundary-only and cannot create Claim Readiness Snapshots.",
  "Executive readout preparation is status-only until a later customer-facing readout contract allows more.",
  "Export remains blocked until explicit export governance exists.",
  "No ROI, EBITA, causality, productivity, headcount, individual attribution, ranking, people decisioning, or customer-facing financial output is authorized."
];

const UNSAFE_PRIVACY_FALSE_FLAGS = [
  "contains_direct_identifiers",
  "contains_raw_content",
  "contains_raw_rows",
  "contains_raw_prompts",
  "contains_raw_responses",
  "contains_transcripts",
  "contains_query_text",
  "contains_file_contents",
  "contains_person_level_productivity",
  "contains_person_level_hris_records",
  "contains_hashed_or_joinable_person_identifiers",
  "contains_manager_or_team_ranking",
  "contains_people_decisioning",
  "contains_compensation_or_performance_inference",
  "contains_promotion_or_discipline_inference",
  "contains_attrition_prediction",
  "contains_hris_inference_from_ai_usage"
];

const FORBIDDEN_KEY_PATTERNS = [
  /raw_(?:rows?|prompt|response|transcript|content|files?)/i,
  /^prompts?$/i,
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
  /joinable_(?:user|person|employee)_id/i,
  /person_level_productivity/i,
  /person_level_hris/i,
  /manager_ranking/i,
  /team_ranking/i,
  /people_decisioning/i,
  /compensation/i,
  /performance_rating/i,
  /promotion/i,
  /discipline/i,
  /attrition_prediction/i,
  /hris_inference/i
];

const FORBIDDEN_ECONOMIC_KEY_PATTERNS = [
  /(?:^|_)roi(?:_|$)/i,
  /ebita/i,
  /causality|causal/i,
  /productivity/i,
  /headcount/i,
  /customer_facing_(?:financial|economic)_output$/i,
  /financial_(?:output|impact|value|claim)$/i,
  /economic_(?:output|impact|value|claim)$/i,
  /value_proof/i
];

const GOVERNED_KEY_ALLOWLIST = new Set([
  "privacy_boundary",
  "blocked_uses",
  "blocked_customer_outputs",
  "blocked_claims",
  "required_caveats",
  "financial_claim_policy",
  "financial_exposure_state",
  "financial_claims_allowed",
  "finance_or_business_approval_present",
  "full_playbook_coverage_present",
  "upstream_financial_translation_allowed",
  "value_proof_allowed",
  "ai_fluency_baseline_is_value_proof",
  "bigquery_source_availability_is_value_proof",
  "vbd_is_value_proof",
  "customer_facing_financial_output_allowed",
  "customer_facing_readout_allowed",
  "manager_or_team_ranking",
  "people_decisioning",
  "contains_direct_identifiers",
  "contains_raw_content",
  "contains_raw_rows",
  "contains_raw_prompts",
  "contains_raw_responses",
  "contains_transcripts",
  "contains_query_text",
  "contains_file_contents",
  "contains_person_level_productivity",
  "contains_person_level_hris_records",
  "contains_hashed_or_joinable_person_identifiers",
  "contains_manager_or_team_ranking",
  "contains_people_decisioning",
  "contains_compensation_or_performance_inference",
  "contains_promotion_or_discipline_inference",
  "contains_attrition_prediction",
  "contains_hris_inference_from_ai_usage",
  "creates_backend_routes",
  "creates_frontend_ui",
  "creates_ingestion_jobs",
  "creates_migrations",
  "creates_prisma_schema",
  "stores_raw_rows",
  "stores_raw_files"
]);

const UNSAFE_OUTPUT_PATTERNS = [
  /(^|[_\s-])roi($|[_\s-])/i,
  /return[_\s-]?on[_\s-]?investment/i,
  /ebita/i,
  /causality|causal/i,
  /productivity/i,
  /headcount/i,
  /individual[_\s-]?(?:attribution|scoring)/i,
  /manager[_\s-]?(?:or[_\s-]?team[_\s-]?)?ranking/i,
  /team[_\s-]?ranking/i,
  /people[_\s-]?decisioning/i,
  /customer[_\s-]?facing[_\s-]?(?:financial|economic)/i,
  /financial[_\s-]?(?:output|claim|value|impact)/i,
  /value[_\s-]?proof/i,
  /raw[_\s-]?(?:data|rows?|files?)[_\s-]?export/i
];

const EMAIL_VALUE_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

const FORBIDDEN_IDENTIFIER_VALUE_PATTERNS = [
  /(?:^|[\s:;,-])(?:user|employee|person|direct)[_\s-]?(?:id|identifier|email)(?:[\s:;,-]|$)/i,
  /(?:^|[\s:;,-])(?:hashed|joinable)[_\s-]?(?:id|identifier|user|person|employee)(?:[\s:;,-]|$)/i,
  /(?:^|[\s:;,-])(?:user|employee|person)[_\s-]?\d{2,}(?:[\s:;,-]|$)/i
];

export const CustomerExposurePolicySchema = {
  schema_version: AI_VALUE_CUSTOMER_EXPOSURE_POLICY_SCHEMA_VERSION,
  required_exposure_surface_ids: [...REQUIRED_EXPOSURE_SURFACE_IDS],
  safe_customer_outputs: [...SAFE_CUSTOMER_OUTPUTS],
  required_blocked_uses: [...REQUIRED_BLOCKED_USES],
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

export interface CustomerExposureDecision {
  surface_id: typeof REQUIRED_EXPOSURE_SURFACE_IDS[number];
  customer_visible: boolean;
  customer_action_required: boolean;
  exposure_state:
    | "allowed"
    | "allowed_with_caveats"
    | "blocked"
    | "internal_only";
  exposure_scope: string;
  evidence_interpretation: string;
  value_proof_allowed: boolean;
  allowed_customer_outputs: string[];
  blocked_customer_outputs: string[];
  required_caveats: string[];
  source_refs: Record<string, any>;
}

export interface BuildCustomerExposurePolicyOptions {
  policyId?: string;
  createdAt?: string;
  financeOrBusinessApprovalPresent?: boolean;
  customerAssumptionApprovalPresent?: boolean;
  nonFinancialReadoutReviewApproved?: boolean;
  exportGovernance?: {
    approved: boolean;
    governance_document_ref?: string;
    approver_role?: string;
  };
}

export interface CustomerExposurePolicy {
  schema_version: string;
  policy_id: string;
  org_id: string;
  source_binding: {
    post_sales_workflow_orchestrator_id: string;
    evidence_snapshot_id: string;
    claim_readiness_handoff_id: string;
    measurement_plan_id: string;
    orchestrator_validated: boolean;
    evidence_snapshot_validated: boolean;
    claim_readiness_handoff_validated: boolean;
  };
  coverage_status: string;
  exposure_decisions: CustomerExposureDecision[];
  missing_evidence_visibility: {
    missing_evidence_visible: boolean;
    held_evidence_visible: boolean;
    suppressed_evidence_visible: boolean;
    rejected_evidence_visible: boolean;
    not_computed_evidence_visible: boolean;
    evidence_gap_count: number;
    client_evidence_request_count: number;
    client_evidence_entry_status_count: number;
    validated_source_package_count: number;
  };
  source_availability_boundary: {
    ai_fluency_baseline_is_value_proof: false;
    bigquery_source_availability_is_value_proof: false;
    vbd_is_value_proof: false;
    aggregate_workforce_context_upgrades_coverage: false;
    client_evidence_request_upgrades_claim_readiness: false;
  };
  financial_claim_policy: {
    full_playbook_coverage_present: boolean;
    finance_or_business_approval_present: boolean;
    customer_assumption_approval_present: boolean;
    upstream_financial_translation_allowed: boolean;
    financial_exposure_state: string;
    financial_claims_allowed: boolean;
    customer_facing_financial_output_allowed: boolean;
    blocked_claims: string[];
    required_unlock_conditions: string[];
  };
  readout_policy: {
    claim_readiness_preview_customer_visible: boolean;
    claim_readiness_preview_scope: string;
    executive_readout_preparation_status_customer_visible: boolean;
    customer_facing_readout_allowed: boolean;
    customer_facing_readout_state: string;
    readout_caveats_required: boolean;
  };
  export_policy: {
    export_allowed: boolean;
    export_state: string;
    export_governance_approved: boolean;
    governance_document_ref: string | null;
    allowed_export_sections: string[];
    blocked_export_sections: string[];
  };
  privacy_boundary: Record<string, boolean>;
  persistence_policy: Record<string, boolean>;
  allowed_customer_outputs: string[];
  blocked_customer_outputs: string[];
  blocked_uses: string[];
  required_caveats: string[];
  created_at: string;
  derivation_version: string;
}

export interface CustomerExposurePolicyValidationResult {
  schema_version: string;
  policy_id: string | null;
  org_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    customer_exposure_policy: boolean;
    customer_visible_posture: boolean;
    customer_visible_evidence_gaps: boolean;
    customer_visible_evidence_requests: boolean;
    customer_visible_entry_status: boolean;
    customer_facing_financial_output: false;
    export_package: boolean;
  };
}

function stringsOf(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value && value.trim() !== ""))];
}

function safeIdPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function hasToken(values: any, token: string): boolean {
  return stringsOf(values).map(normalizeToken).includes(token);
}

function requireField(value: any, path: string, gaps: string[]): void {
  if (value === undefined || value === null || value === "") {
    gaps.push(`${path} is missing`);
  }
}

function requireBoolean(value: any, expected: boolean, path: string, gaps: string[]): void {
  if (value !== expected) {
    gaps.push(`${path} must be ${expected}`);
  }
}

function privacyBoundary(): Record<string, boolean> {
  return {
    aggregate_only: true,
    contains_direct_identifiers: false,
    contains_raw_content: false,
    contains_raw_rows: false,
    contains_raw_prompts: false,
    contains_raw_responses: false,
    contains_transcripts: false,
    contains_query_text: false,
    contains_file_contents: false,
    contains_person_level_productivity: false,
    contains_person_level_hris_records: false,
    contains_hashed_or_joinable_person_identifiers: false,
    contains_manager_or_team_ranking: false,
    contains_people_decisioning: false,
    contains_compensation_or_performance_inference: false,
    contains_promotion_or_discipline_inference: false,
    contains_attrition_prediction: false,
    contains_hris_inference_from_ai_usage: false
  };
}

function persistencePolicy(): Record<string, boolean> {
  return {
    persisted: false,
    creates_migrations: false,
    creates_prisma_schema: false,
    creates_backend_routes: false,
    creates_frontend_ui: false,
    creates_ingestion_jobs: false,
    stores_raw_rows: false,
    stores_raw_files: false,
    creates_claim_readiness_snapshots: false,
    persists_claim_readiness_snapshots: false,
    creates_executive_readout_snapshots: false,
    persists_executive_readout_snapshots: false,
    creates_customer_facing_dashboard: false,
    creates_external_api_routes: false
  };
}

function blockedCustomerOutputs(): string[] {
  return [...REQUIRED_BLOCKED_CUSTOMER_OUTPUTS];
}

function decision(
  surfaceId: CustomerExposureDecision["surface_id"],
  options: {
    customerVisible: boolean;
    customerActionRequired?: boolean;
    exposureState: CustomerExposureDecision["exposure_state"];
    exposureScope: string;
    evidenceInterpretation: string;
    allowedCustomerOutputs: string[];
    requiredCaveats: string[];
    sourceRefs?: Record<string, any>;
  }
): CustomerExposureDecision {
  return {
    surface_id: surfaceId,
    customer_visible: options.customerVisible,
    customer_action_required: options.customerActionRequired ?? false,
    exposure_state: options.exposureState,
    exposure_scope: options.exposureScope,
    evidence_interpretation: options.evidenceInterpretation,
    value_proof_allowed: false,
    allowed_customer_outputs: options.allowedCustomerOutputs,
    blocked_customer_outputs: blockedCustomerOutputs(),
    required_caveats: unique([...REQUIRED_CAVEATS, ...options.requiredCaveats]),
    source_refs: options.sourceRefs ?? {}
  };
}

function evidenceGapCount(orchestrator: PostSalesWorkflowOrchestrator): number {
  return Array.isArray(orchestrator.current_evidence_gap_review?.evidence_gaps)
    ? orchestrator.current_evidence_gap_review.evidence_gaps.length
    : 0;
}

function clientEvidenceRequestCount(orchestrator: PostSalesWorkflowOrchestrator): number {
  return [
    ...(orchestrator.client_evidence_requests?.initial_requests ?? []),
    ...(orchestrator.client_evidence_requests?.current_requests ?? [])
  ].length;
}

function blockedClaimsOf(orchestrator: PostSalesWorkflowOrchestrator): string[] {
  return stringsOf(orchestrator.claim_readiness_handoff?.blocked_claims);
}

function coverageStatusOf(orchestrator: PostSalesWorkflowOrchestrator): string {
  return String(orchestrator.evidence_snapshot?.playbook_coverage?.coverage_status ?? "unknown");
}

function exportState(exportApproved: boolean): string {
  return exportApproved ? "approved_but_financial_output_still_blocked" : "blocked_until_export_governance";
}

export function buildCustomerExposurePolicyFromPostSalesWorkflow(
  orchestrator: PostSalesWorkflowOrchestrator,
  options: BuildCustomerExposurePolicyOptions = {}
): CustomerExposurePolicy {
  const validation = validatePostSalesWorkflowOrchestrator(orchestrator);
  if (!validation.valid) {
    throw new Error(
      `Post-Sales Workflow Orchestrator is invalid: ${validation.gaps.join("; ")}`
    );
  }

  const createdAt = options.createdAt ?? new Date().toISOString();
  const policyId = options.policyId ??
    `customer_exposure_policy_${safeIdPart(orchestrator.org_id)}_${safeIdPart(orchestrator.orchestrator_id)}`;
  const coverageStatus = coverageStatusOf(orchestrator);
  const fullPlaybookCoveragePresent = coverageStatus === "full_playbook_coverage";
  const exportApproved = options.exportGovernance?.approved === true;
  const readoutReviewApproved =
    options.nonFinancialReadoutReviewApproved === true &&
    orchestrator.claim_readiness_handoff?.executive_readout_boundary?.customer_facing_readout_allowed === true;
  const financeOrBusinessApprovalPresent =
    options.financeOrBusinessApprovalPresent === true;
  const customerAssumptionApprovalPresent =
    options.customerAssumptionApprovalPresent === true;
  const upstreamFinancialTranslationAllowed =
    orchestrator.claim_readiness_handoff?.financial_boundary?.financial_translation_allowed === true;
  const financialClaimsAllowed =
    fullPlaybookCoveragePresent &&
    financeOrBusinessApprovalPresent &&
    customerAssumptionApprovalPresent &&
    upstreamFinancialTranslationAllowed &&
    exportApproved;
  const financialExposureState = financialClaimsAllowed
    ? "financial_translation_ready"
    : "held_for_financial_claim_governance";

  const exposureDecisions: CustomerExposureDecision[] = [
    decision("ai_fluency_initial_posture", {
      customerVisible: true,
      exposureState: "allowed_with_caveats",
      exposureScope: "posture_only",
      evidenceInterpretation: "ai_fluency_posture_not_value_proof",
      allowedCustomerOutputs: ["ai_fluency_posture_summary"],
      requiredCaveats: [
        "AI Fluency baseline is stated posture and cannot support value proof."
      ],
      sourceRefs: {
        ai_fluency_intake_state:
          orchestrator.ai_fluency_intake_bridge?.ai_fluency_intake?.intake_state ?? null
      }
    }),
    decision("evidence_gap_review", {
      customerVisible: true,
      exposureState: "allowed_with_caveats",
      exposureScope: "missing_held_suppressed_and_requested_evidence_status",
      evidenceInterpretation: "evidence_gap_not_claim_support",
      allowedCustomerOutputs: ["evidence_gap_summary"],
      requiredCaveats: [
        "Missing evidence must stay visible and cannot be treated as support."
      ],
      sourceRefs: {
        evidence_gap_count: evidenceGapCount(orchestrator)
      }
    }),
    decision("client_evidence_requests", {
      customerVisible: true,
      customerActionRequired: clientEvidenceRequestCount(orchestrator) > 0,
      exposureState: "allowed_with_caveats",
      exposureScope: "actionable_aggregate_evidence_requests",
      evidenceInterpretation: "request_only_not_claim_readiness_upgrade",
      allowedCustomerOutputs: ["client_evidence_request_list"],
      requiredCaveats: [
        "Requests describe what evidence is needed and do not improve claim readiness."
      ],
      sourceRefs: {
        client_evidence_request_count: clientEvidenceRequestCount(orchestrator)
      }
    }),
    decision("client_evidence_entry_statuses", {
      customerVisible: true,
      exposureState: "allowed_with_caveats",
      exposureScope: "entry_status_only",
      evidenceInterpretation: "entry_status_not_raw_evidence",
      allowedCustomerOutputs: ["client_evidence_entry_status_summary"],
      requiredCaveats: [
        "Only validation status, rejection state, held state, and aggregate status may be shown."
      ],
      sourceRefs: {
        client_evidence_entry_status_count:
          orchestrator.client_evidence_entry_reviews.length
      }
    }),
    decision("validated_source_packages", {
      customerVisible: true,
      exposureState: "allowed_with_caveats",
      exposureScope: "aggregate_source_package_status_only",
      evidenceInterpretation: "validated_source_package_metadata_not_raw_payload",
      allowedCustomerOutputs: ["source_package_status_summary"],
      requiredCaveats: [
        "Validated Source Packages can be referenced as aggregate status only."
      ],
      sourceRefs: {
        validated_source_package_count: orchestrator.source_packages.length
      }
    }),
    decision("updated_evidence_snapshot", {
      customerVisible: true,
      exposureState: "allowed_with_caveats",
      exposureScope: "coverage_status_caveats_blocked_uses_and_gap_summary",
      evidenceInterpretation: "coverage_posture_not_financial_output",
      allowedCustomerOutputs: ["evidence_snapshot_coverage_summary"],
      requiredCaveats: stringsOf(orchestrator.evidence_snapshot?.required_caveats),
      sourceRefs: {
        evidence_snapshot_id: orchestrator.evidence_snapshot?.evidence_snapshot_id,
        coverage_status: coverageStatus
      }
    }),
    decision("claim_readiness_preview", {
      customerVisible: true,
      exposureState: "allowed_with_caveats",
      exposureScope: "boundary_preview_only",
      evidenceInterpretation: "claim_boundary_not_claim_output",
      allowedCustomerOutputs: ["claim_boundary_preview"],
      requiredCaveats: stringsOf(orchestrator.claim_readiness_handoff?.required_caveats),
      sourceRefs: {
        claim_readiness_handoff_id: orchestrator.claim_readiness_handoff?.handoff_id
      }
    }),
    decision("executive_readout_preparation", {
      customerVisible: true,
      exposureState: readoutReviewApproved ? "allowed_with_caveats" : "blocked",
      exposureScope: "preparation_status_only",
      evidenceInterpretation: "readout_preparation_not_readout_output",
      allowedCustomerOutputs: ["executive_readout_preparation_status"],
      requiredCaveats: stringsOf(
        orchestrator.claim_readiness_handoff?.executive_readout_boundary?.required_caveats
      ),
      sourceRefs: {
        customer_facing_readout_allowed: readoutReviewApproved
      }
    }),
    decision("export_package", {
      customerVisible: false,
      exposureState: "blocked",
      exposureScope: "blocked_until_export_governance",
      evidenceInterpretation: "export_not_authorized_by_contract",
      allowedCustomerOutputs: [],
      requiredCaveats: [
        "Export remains blocked until explicit export governance exists."
      ],
      sourceRefs: {
        export_governance_approved: exportApproved
      }
    })
  ];

  return {
    schema_version: AI_VALUE_CUSTOMER_EXPOSURE_POLICY_SCHEMA_VERSION,
    policy_id: policyId,
    org_id: orchestrator.org_id,
    source_binding: {
      post_sales_workflow_orchestrator_id: orchestrator.orchestrator_id,
      evidence_snapshot_id: orchestrator.evidence_snapshot.evidence_snapshot_id,
      claim_readiness_handoff_id: orchestrator.claim_readiness_handoff.handoff_id,
      measurement_plan_id: orchestrator.evidence_snapshot.measurement_plan_id,
      orchestrator_validated: true,
      evidence_snapshot_validated: true,
      claim_readiness_handoff_validated: true
    },
    coverage_status: coverageStatus,
    exposure_decisions: exposureDecisions,
    missing_evidence_visibility: {
      missing_evidence_visible: true,
      held_evidence_visible: true,
      suppressed_evidence_visible: true,
      rejected_evidence_visible: true,
      not_computed_evidence_visible: true,
      evidence_gap_count: evidenceGapCount(orchestrator),
      client_evidence_request_count: clientEvidenceRequestCount(orchestrator),
      client_evidence_entry_status_count:
        orchestrator.client_evidence_entry_reviews.length,
      validated_source_package_count: orchestrator.source_packages.length
    },
    source_availability_boundary: {
      ai_fluency_baseline_is_value_proof: false,
      bigquery_source_availability_is_value_proof: false,
      vbd_is_value_proof: false,
      aggregate_workforce_context_upgrades_coverage: false,
      client_evidence_request_upgrades_claim_readiness: false
    },
    financial_claim_policy: {
      full_playbook_coverage_present: fullPlaybookCoveragePresent,
      finance_or_business_approval_present: financeOrBusinessApprovalPresent,
      customer_assumption_approval_present: customerAssumptionApprovalPresent,
      upstream_financial_translation_allowed: upstreamFinancialTranslationAllowed,
      financial_exposure_state: financialExposureState,
      financial_claims_allowed: financialClaimsAllowed,
      customer_facing_financial_output_allowed: false,
      blocked_claims: blockedClaimsOf(orchestrator),
      required_unlock_conditions: [
        "full_playbook_coverage",
        "finance_or_business_owner_approval",
        "customer_assumption_approval",
        "safe_privacy_posture",
        "no_active_suppression",
        "upstream_financial_boundary_allows_translation",
        "export_governance_if_customer_facing"
      ]
    },
    readout_policy: {
      claim_readiness_preview_customer_visible: true,
      claim_readiness_preview_scope: "boundary_preview_only",
      executive_readout_preparation_status_customer_visible: true,
      customer_facing_readout_allowed: readoutReviewApproved,
      customer_facing_readout_state: readoutReviewApproved
        ? "allowed_with_caveats_non_financial_only"
        : "blocked_until_customer_facing_readout_contract_and_review",
      readout_caveats_required: true
    },
    export_policy: {
      export_allowed: false,
      export_state: exportState(exportApproved),
      export_governance_approved: exportApproved,
      governance_document_ref: options.exportGovernance?.governance_document_ref ?? null,
      allowed_export_sections: [],
      blocked_export_sections: [
        "raw_rows",
        "raw_files",
        "claim_readiness_snapshots",
        "executive_readout_snapshots",
        "customer_facing_financial_output"
      ]
    },
    privacy_boundary: privacyBoundary(),
    persistence_policy: persistencePolicy(),
    allowed_customer_outputs: [...SAFE_CUSTOMER_OUTPUTS],
    blocked_customer_outputs: blockedCustomerOutputs(),
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    required_caveats: [...REQUIRED_CAVEATS],
    created_at: createdAt,
    derivation_version: DERIVATION_VERSION
  };
}

function collectForbiddenKeys(value: any, keys: Set<string> = new Set()): Set<string> {
  if (!value || typeof value !== "object") return keys;
  if (Array.isArray(value)) {
    value.forEach((item) => collectForbiddenKeys(item, keys));
    return keys;
  }
  for (const [key, nested] of Object.entries(value)) {
    const normalized = normalizeToken(key);
    if (
      !GOVERNED_KEY_ALLOWLIST.has(normalized) &&
      (FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key)) ||
        FORBIDDEN_ECONOMIC_KEY_PATTERNS.some((pattern) => pattern.test(key)))
    ) {
      keys.add(key);
    }
    collectForbiddenKeys(nested, keys);
  }
  return keys;
}

function collectForbiddenIdentifierValues(
  value: any,
  values: string[] = [],
  path: string[] = []
): string[] {
  if (typeof value === "string") {
    if (
      EMAIL_VALUE_PATTERN.test(value) ||
      FORBIDDEN_IDENTIFIER_VALUE_PATTERNS.some((pattern) => pattern.test(value))
    ) {
      values.push(`${path.join(".")}: ${value}`);
    }
    return values;
  }
  if (!value || typeof value !== "object") return values;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectForbiddenIdentifierValues(item, values, [...path, String(index)])
    );
    return values;
  }
  for (const [key, nested] of Object.entries(value)) {
    collectForbiddenIdentifierValues(nested, values, [...path, key]);
  }
  return values;
}

function collectUnsafeAllowedOutputs(
  value: any,
  values: string[] = [],
  path: string[] = []
): string[] {
  if (!value || typeof value !== "object") return values;
  if (Array.isArray(value)) {
    const currentKey = path.length > 0 ? path[path.length - 1] : "";
    if (
      [
        "allowed_customer_outputs",
        "allowed_outputs",
        "allowed_export_sections",
        "allowed_uses"
      ].includes(currentKey)
    ) {
      for (const item of value) {
        const text = String(item);
        if (UNSAFE_OUTPUT_PATTERNS.some((pattern) => pattern.test(text))) {
          values.push(`${path.join(".")}: ${text}`);
        }
      }
    }
    value.forEach((item, index) =>
      collectUnsafeAllowedOutputs(item, values, [...path, String(index)])
    );
    return values;
  }
  for (const [key, nested] of Object.entries(value)) {
    collectUnsafeAllowedOutputs(nested, values, [...path, key]);
  }
  return values;
}

function decisionsBySurface(policy: any): Map<string, any> {
  return new Map(
    (Array.isArray(policy?.exposure_decisions) ? policy.exposure_decisions : [])
      .map((decisionEntry: any) => [String(decisionEntry?.surface_id ?? ""), decisionEntry])
  );
}

function collectDecisionGaps(policy: any): string[] {
  const gaps: string[] = [];
  const decisions = decisionsBySurface(policy);
  for (const surfaceId of REQUIRED_EXPOSURE_SURFACE_IDS) {
    if (!decisions.has(surfaceId)) {
      gaps.push(`exposure_decisions must include ${surfaceId}`);
    }
  }

  for (const surfaceId of [
    "ai_fluency_initial_posture",
    "evidence_gap_review",
    "client_evidence_requests",
    "client_evidence_entry_statuses",
    "validated_source_packages",
    "updated_evidence_snapshot",
    "claim_readiness_preview"
  ]) {
    const decisionEntry = decisions.get(surfaceId);
    if (!decisionEntry) continue;
    requireBoolean(decisionEntry.customer_visible, true, `${surfaceId}.customer_visible`, gaps);
    if (decisionEntry.exposure_state !== "allowed_with_caveats") {
      gaps.push(`${surfaceId}.exposure_state must be allowed_with_caveats`);
    }
    if (!Array.isArray(decisionEntry.required_caveats) ||
        decisionEntry.required_caveats.length === 0) {
      gaps.push(`${surfaceId}.required_caveats must carry caveats`);
    }
  }

  const aiFluency = decisions.get("ai_fluency_initial_posture");
  if (aiFluency) {
    requireBoolean(aiFluency.customer_visible, true, "ai_fluency_initial_posture.customer_visible", gaps);
    requireBoolean(aiFluency.value_proof_allowed, false, "ai_fluency_initial_posture.value_proof_allowed", gaps);
    if (aiFluency.exposure_scope !== "posture_only") {
      gaps.push("ai_fluency_initial_posture.exposure_scope must be posture_only");
    }
  }

  const gapReview = decisions.get("evidence_gap_review");
  if (gapReview) {
    requireBoolean(gapReview.customer_visible, true, "evidence_gap_review.customer_visible", gaps);
    if (!hasToken(gapReview.allowed_customer_outputs, "evidence_gap_summary")) {
      gaps.push("evidence_gap_review must allow evidence_gap_summary only as a caveated customer output");
    }
  }

  const requests = decisions.get("client_evidence_requests");
  if (requests) {
    requireBoolean(requests.customer_visible, true, "client_evidence_requests.customer_visible", gaps);
    if (requests.evidence_interpretation !== "request_only_not_claim_readiness_upgrade") {
      gaps.push("client_evidence_requests must be interpreted as request-only");
    }
  }

  const entryStatuses = decisions.get("client_evidence_entry_statuses");
  if (entryStatuses) {
    requireBoolean(entryStatuses.customer_visible, true, "client_evidence_entry_statuses.customer_visible", gaps);
    if (entryStatuses.exposure_scope !== "entry_status_only") {
      gaps.push("client_evidence_entry_statuses.exposure_scope must be entry_status_only");
    }
  }

  const snapshot = decisions.get("updated_evidence_snapshot");
  if (snapshot) {
    requireBoolean(snapshot.customer_visible, true, "updated_evidence_snapshot.customer_visible", gaps);
    if (snapshot.exposure_scope !== "coverage_status_caveats_blocked_uses_and_gap_summary") {
      gaps.push("updated_evidence_snapshot exposure must stay limited to coverage, caveats, blocked uses, and gaps");
    }
  }

  const claimPreview = decisions.get("claim_readiness_preview");
  if (claimPreview) {
    requireBoolean(claimPreview.customer_visible, true, "claim_readiness_preview.customer_visible", gaps);
    requireBoolean(claimPreview.value_proof_allowed, false, "claim_readiness_preview.value_proof_allowed", gaps);
    if (claimPreview.exposure_scope !== "boundary_preview_only") {
      gaps.push("claim_readiness_preview.exposure_scope must be boundary_preview_only");
    }
  }

  const readout = decisions.get("executive_readout_preparation");
  if (readout) {
    requireBoolean(readout.customer_visible, true, "executive_readout_preparation.customer_visible", gaps);
    if (readout.exposure_scope !== "preparation_status_only") {
      gaps.push("executive_readout_preparation.exposure_scope must be preparation_status_only");
    }
    if (!["blocked", "allowed_with_caveats"].includes(readout.exposure_state)) {
      gaps.push("executive_readout_preparation.exposure_state must be blocked or allowed_with_caveats");
    }
    if (!Array.isArray(readout.required_caveats) ||
        readout.required_caveats.length === 0) {
      gaps.push("executive_readout_preparation.required_caveats must carry caveats");
    }
  }

  const exportPackage = decisions.get("export_package");
  if (exportPackage) {
    requireBoolean(exportPackage.customer_visible, false, "export_package.customer_visible", gaps);
    if (exportPackage.exposure_state !== "blocked") {
      gaps.push("export_package.exposure_state must remain blocked");
    }
  }

  for (const [surfaceId, decisionEntry] of decisions.entries()) {
    if (decisionEntry?.value_proof_allowed !== false) {
      gaps.push(`${surfaceId}.value_proof_allowed must be false`);
    }
    for (const output of stringsOf(decisionEntry?.allowed_customer_outputs)) {
      if (!SAFE_CUSTOMER_OUTPUTS.includes(normalizeToken(output))) {
        gaps.push(`${surfaceId}.allowed_customer_outputs contains unsupported output: ${output}`);
      }
    }
    for (const blocked of REQUIRED_BLOCKED_CUSTOMER_OUTPUTS) {
      if (!hasToken(decisionEntry?.blocked_customer_outputs, blocked)) {
        gaps.push(`${surfaceId}.blocked_customer_outputs must include ${blocked}`);
      }
    }
  }

  return gaps;
}

function collectPolicyBoundaryGaps(policy: any): string[] {
  const gaps: string[] = [];
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!hasToken(policy?.blocked_uses, use)) {
      gaps.push(`blocked_uses must include ${use}`);
    }
  }
  for (const output of REQUIRED_BLOCKED_CUSTOMER_OUTPUTS) {
    if (!hasToken(policy?.blocked_customer_outputs, output)) {
      gaps.push(`blocked_customer_outputs must include ${output}`);
    }
  }
  for (const output of stringsOf(policy?.allowed_customer_outputs)) {
    if (!SAFE_CUSTOMER_OUTPUTS.includes(normalizeToken(output))) {
      gaps.push(`allowed_customer_outputs contains unsupported output: ${output}`);
    }
  }
  for (const caveat of REQUIRED_CAVEATS) {
    if (!stringsOf(policy?.required_caveats).includes(caveat)) {
      gaps.push(`required_caveats must include: ${caveat}`);
    }
  }
  for (const value of collectUnsafeAllowedOutputs(policy)) {
    gaps.push(`Unsafe allowed customer output detected: ${value}`);
  }

  requireBoolean(policy?.privacy_boundary?.aggregate_only, true, "privacy_boundary.aggregate_only", gaps);
  for (const flag of UNSAFE_PRIVACY_FALSE_FLAGS) {
    requireBoolean(policy?.privacy_boundary?.[flag], false, `privacy_boundary.${flag}`, gaps);
  }
  for (const [key, expected] of Object.entries(persistencePolicy())) {
    requireBoolean(policy?.persistence_policy?.[key], expected, `persistence_policy.${key}`, gaps);
  }
  for (const [key, expected] of Object.entries({
    ai_fluency_baseline_is_value_proof: false,
    bigquery_source_availability_is_value_proof: false,
    vbd_is_value_proof: false,
    aggregate_workforce_context_upgrades_coverage: false,
    client_evidence_request_upgrades_claim_readiness: false
  })) {
    requireBoolean(policy?.source_availability_boundary?.[key], expected, `source_availability_boundary.${key}`, gaps);
  }
  for (const [key, expected] of Object.entries({
    missing_evidence_visible: true,
    held_evidence_visible: true,
    suppressed_evidence_visible: true,
    rejected_evidence_visible: true,
    not_computed_evidence_visible: true
  })) {
    requireBoolean(policy?.missing_evidence_visibility?.[key], expected, `missing_evidence_visibility.${key}`, gaps);
  }
  return gaps;
}

function collectFinancialGaps(policy: any): string[] {
  const gaps: string[] = [];
  const financial = policy?.financial_claim_policy ?? {};
  const outputAllowed = financial.customer_facing_financial_output_allowed === true;
  const financialClaimsAllowed = financial.financial_claims_allowed === true;

  requireField(
    financial.financial_exposure_state,
    "financial_claim_policy.financial_exposure_state",
    gaps
  );
  if (outputAllowed || financialClaimsAllowed) {
    if (policy?.coverage_status !== "full_playbook_coverage") {
      gaps.push("financial claims require policy coverage_status full_playbook_coverage");
    }
    if (financial.full_playbook_coverage_present !== true) {
      gaps.push("financial claims require full_playbook_coverage");
    }
    if (financial.finance_or_business_approval_present !== true) {
      gaps.push("financial claims require finance_or_business_approval_present");
    }
    if (financial.customer_assumption_approval_present !== true) {
      gaps.push("financial claims require customer_assumption_approval_present");
    }
    if (financial.upstream_financial_translation_allowed !== true) {
      gaps.push("financial claims require upstream financial translation allowance");
    }
    if (!policy?.export_policy?.export_governance_approved) {
      gaps.push("customer-facing financial output requires export governance approval");
    }
    if (financial.financial_exposure_state !== "financial_translation_ready") {
      gaps.push("financial claims require financial_exposure_state financial_translation_ready");
    }
    if (hasToken(financial.blocked_claims, "roi_proof")) {
      gaps.push("financial claims require upstream blocked_claims to remove roi_proof");
    }
  }
  if (outputAllowed) {
    gaps.push("customer_facing_financial_output_allowed must remain false in this contract");
  }
  if (!financialClaimsAllowed && financial.financial_exposure_state === "financial_translation_ready") {
    gaps.push("financial_exposure_state cannot be financial_translation_ready unless financial claims are allowed");
  }
  return gaps;
}

function collectReadoutAndExportGaps(policy: any): string[] {
  const gaps: string[] = [];
  const readout = policy?.readout_policy ?? {};
  if (readout.claim_readiness_preview_customer_visible !== true) {
    gaps.push("claim_readiness_preview_customer_visible must be true for boundary-only preview");
  }
  if (readout.claim_readiness_preview_scope !== "boundary_preview_only") {
    gaps.push("claim_readiness_preview_scope must be boundary_preview_only");
  }
  if (readout.executive_readout_preparation_status_customer_visible !== true) {
    gaps.push("executive_readout_preparation_status_customer_visible must be true");
  }
  if (readout.readout_caveats_required !== true) {
    gaps.push("readout_caveats_required must be true");
  }
  if (
    readout.customer_facing_readout_allowed === true &&
    !/allowed_with_caveats_non_financial_only/.test(String(readout.customer_facing_readout_state ?? ""))
  ) {
    gaps.push("customer-facing readout can only be allowed as caveated non-financial status in this policy");
  }

  const exportPolicy = policy?.export_policy ?? {};
  if (exportPolicy.export_allowed === true) {
    if (exportPolicy.export_governance_approved !== true) {
      gaps.push("export_allowed requires export_governance_approved");
    }
    if (!exportPolicy.governance_document_ref) {
      gaps.push("export_allowed requires governance_document_ref");
    }
    for (const section of stringsOf(exportPolicy.allowed_export_sections)) {
      if (UNSAFE_OUTPUT_PATTERNS.some((pattern) => pattern.test(section))) {
        gaps.push(`allowed_export_sections contains unsafe section: ${section}`);
      }
    }
  }
  if (exportPolicy.export_allowed !== false) {
    gaps.push("export_allowed must remain false until export governance contract exists");
  }
  return gaps;
}

export function validateCustomerExposurePolicy(
  policy: any
): CustomerExposurePolicyValidationResult {
  const gaps: string[] = [];
  for (const field of REQUIRED_FIELDS) {
    requireField(policy?.[field], field, gaps);
  }
  if (
    policy?.schema_version &&
    policy.schema_version !== AI_VALUE_CUSTOMER_EXPOSURE_POLICY_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${policy.schema_version}`);
  }
  for (const field of [
    "post_sales_workflow_orchestrator_id",
    "evidence_snapshot_id",
    "claim_readiness_handoff_id",
    "measurement_plan_id"
  ]) {
    requireField(policy?.source_binding?.[field], `source_binding.${field}`, gaps);
  }
  for (const field of [
    "orchestrator_validated",
    "evidence_snapshot_validated",
    "claim_readiness_handoff_validated"
  ]) {
    requireBoolean(policy?.source_binding?.[field], true, `source_binding.${field}`, gaps);
  }
  for (const key of [...collectForbiddenKeys(policy)].sort()) {
    gaps.push(`Forbidden field detected: ${key}`);
  }
  for (const value of collectForbiddenIdentifierValues(policy)) {
    gaps.push(`Forbidden identifier value detected: ${value}`);
  }
  gaps.push(...collectDecisionGaps(policy));
  gaps.push(...collectPolicyBoundaryGaps(policy));
  gaps.push(...collectFinancialGaps(policy));
  gaps.push(...collectReadoutAndExportGaps(policy));

  const valid = gaps.length === 0;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    policy_id: policy?.policy_id ?? null,
    org_id: policy?.org_id ?? null,
    valid,
    gaps,
    feeds: {
      customer_exposure_policy: valid,
      customer_visible_posture: valid &&
        decisionsBySurface(policy).get("ai_fluency_initial_posture")?.customer_visible === true,
      customer_visible_evidence_gaps: valid &&
        decisionsBySurface(policy).get("evidence_gap_review")?.customer_visible === true,
      customer_visible_evidence_requests: valid &&
        decisionsBySurface(policy).get("client_evidence_requests")?.customer_visible === true,
      customer_visible_entry_status: valid &&
        decisionsBySurface(policy).get("client_evidence_entry_statuses")?.customer_visible === true,
      customer_facing_financial_output: false,
      export_package: valid && policy?.export_policy?.export_allowed === true
    }
  };
}
