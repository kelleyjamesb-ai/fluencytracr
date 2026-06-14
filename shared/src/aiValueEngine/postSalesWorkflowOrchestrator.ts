/**
 * AI Value Engine - Post-Sales Workflow Orchestrator.
 *
 * Internal-only, non-route composition layer for the post-sales AI Value
 * workflow. It wires existing aggregate-safe contracts together without
 * creating persistence, routes, UI, ingestion jobs, claim readiness snapshots,
 * executive readout snapshots, ROI, EBITA, causality, productivity,
 * headcount, ranking, people decisioning, or customer-facing financial output.
 */

import {
  buildEvidenceGapReviewFromMeasurementPlanAndSnapshot,
  buildMeasurementPlanDraftFromAIFluencyIntake,
  validateAIFluencyIntakeBridge,
  type AIFluencyIntakeBridge,
  type AIFluencyIntakeBridgeBuildInputs,
  type EvidenceGapReview
} from "./aiFluencyIntakeBridge";
import {
  buildClaimReadinessHandoffFromEvidenceSnapshot,
  validateClaimReadinessHandoff,
  type ClaimReadinessHandoff
} from "./claimReadinessHandoff";
import {
  buildClientEvidenceRequestsFromEvidenceSnapshot,
  validateClientEvidenceRequest,
  type ClientEvidenceRequest
} from "./clientEvidenceRequest";
import {
  buildSourcePackageFromClientEvidenceEntry,
  validateClientEvidenceEntry,
  type ClientEvidenceEntryValidationResult
} from "./clientEvidenceEntry";
import {
  buildInitialCustomerJourney,
  validateCustomerJourney,
  type CustomerJourney
} from "./customerJourney";
import {
  buildEvidenceSnapshotInputFromMeasurementPlanAndSourcePackages,
  validateEvidenceCollectionAssembly,
  type EvidenceCollectionAssembly
} from "./evidenceCollectionAssembler";
import { validateEvidenceSnapshot } from "./evidenceSnapshot";
import { validateMeasurementPlan } from "./measurementPlan";
import { validateSourcePackage, type SourcePackage } from "./sourcePackages";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_POST_SALES_WORKFLOW_ORCHESTRATOR_VALIDATION_2026_06";

export const AI_VALUE_POST_SALES_WORKFLOW_ORCHESTRATOR_SCHEMA_VERSION =
  "FT_AI_VALUE_POST_SALES_WORKFLOW_ORCHESTRATOR_2026_06";

const DERIVATION_VERSION =
  "ai_value_post_sales_workflow_orchestrator_builder_2026_06";

const WORKFLOW_PHASE_IDS = [
  "ai_fluency_intake",
  "measurement_plan_draft",
  "initial_evidence_snapshot",
  "evidence_gap_review",
  "client_evidence_requests",
  "client_evidence_entry_to_source_packages",
  "updated_evidence_snapshot",
  "claim_readiness_handoff"
] as const;

const REQUIRED_FIELDS = [
  "schema_version",
  "orchestrator_id",
  "org_id",
  "customer_journey",
  "ai_fluency_intake_bridge",
  "initial_evidence_gap_review",
  "current_evidence_gap_review",
  "client_evidence_requests",
  "client_evidence_entry_reviews",
  "source_packages",
  "initial_evidence_snapshot",
  "evidence_collection_assembly",
  "evidence_snapshot",
  "claim_readiness_handoff",
  "workflow_phases",
  "coverage_summary",
  "governance",
  "privacy_boundary",
  "feeds",
  "persistence_policy",
  "allowed_uses",
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

const REQUIRED_CAVEATS = [
  "Post-sales workflow orchestration is internal-only and non-route; it does not create customer-facing output.",
  "AI Fluency intake and VBD are posture/context only and cannot become value proof.",
  "Client Evidence Requests identify missing evidence and do not improve claim readiness by themselves.",
  "Client Evidence Entries must validate before becoming Source Packages.",
  "Missing, held, suppressed, rejected, or not-computed evidence remains explicit and cannot be treated as support.",
  "Claim Readiness Handoff is non-persisted and cannot create claim readiness snapshots or executive readout snapshots.",
  "No ROI, EBITA, causality, productivity, headcount, individual attribution, ranking, people decisioning, or customer-facing financial output is authorized."
];

const SAFE_ALLOWED_USES = [
  "internal_post_sales_workflow_coordination",
  "ai_fluency_posture_review",
  "measurement_plan_draft",
  "evidence_gap_review",
  "client_evidence_request_planning",
  "client_evidence_entry_validation",
  "source_package_preparation",
  "evidence_snapshot_review",
  "claim_readiness_handoff_context"
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
  /raw_(?:rows?|prompt|response|transcript|content)/i,
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

const GOVERNED_KEY_ALLOWLIST = new Set([
  "privacy_boundary",
  "privacy_requirements",
  "blocked_uses",
  "blocked_claims",
  "required_caveats",
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
  "stores_raw_rows",
  "stores_raw_files",
  "people_decisioning_output",
  "manager_or_team_ranking_output",
  "team_or_manager_ranking"
]);

const UNSAFE_USE_PATTERNS = [
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
  /financial[_\s-]?(?:output|claim|value)/i
];

const EMAIL_VALUE_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

const FORBIDDEN_IDENTIFIER_VALUE_PATTERNS = [
  /(?:^|[\s:;,-])(?:user|employee|person|direct)[_\s-]?(?:id|identifier|email)(?:[\s:;,-]|$)/i,
  /(?:^|[\s:;,-])(?:hashed|joinable)[_\s-]?(?:id|identifier|user|person|employee)(?:[\s:;,-]|$)/i,
  /(?:^|[\s:;,-])(?:user|employee|person)[_\s-]?\d{2,}(?:[\s:;,-]|$)/i
];

export const PostSalesWorkflowOrchestratorSchema = {
  schema_version: AI_VALUE_POST_SALES_WORKFLOW_ORCHESTRATOR_SCHEMA_VERSION,
  workflow_phase_ids: [...WORKFLOW_PHASE_IDS],
  required_blocked_uses: REQUIRED_BLOCKED_USES,
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

export interface PostSalesWorkflowOrchestratorBuildInputs
  extends AIFluencyIntakeBridgeBuildInputs {
  orchestratorId?: string;
  customerJourneyId?: string;
  customerAccountId?: string;
  engagementId?: string;
  assemblyId?: string;
  handoffId?: string;
  initialSourcePackages?: any[];
  clientEvidenceEntries?: any[];
}

export interface ClientEvidenceEntryReview {
  entry_id: string | null;
  request_id: string | null;
  evidence_layer: string | null;
  entry_mode: string | null;
  validation_status: string | null;
  accepted_for_source_package: boolean;
  source_package_id: string | null;
  rejection_reasons: string[];
  validation_result: ClientEvidenceEntryValidationResult;
}

export interface PostSalesWorkflowPhase {
  phase_id: string;
  phase_status: string;
  produced_outputs: string[];
  blocked_outputs: string[];
  required_caveats: string[];
}

export interface PostSalesWorkflowOrchestrator {
  schema_version: string;
  orchestrator_id: string;
  org_id: string;
  customer_journey: CustomerJourney;
  ai_fluency_intake_bridge: AIFluencyIntakeBridge;
  initial_evidence_gap_review: EvidenceGapReview;
  current_evidence_gap_review: EvidenceGapReview;
  client_evidence_requests: {
    initial_requests: ClientEvidenceRequest[];
    current_requests: ClientEvidenceRequest[];
  };
  client_evidence_entry_reviews: ClientEvidenceEntryReview[];
  source_packages: SourcePackage[];
  initial_evidence_snapshot: any;
  evidence_collection_assembly: EvidenceCollectionAssembly;
  evidence_snapshot: any;
  claim_readiness_handoff: ClaimReadinessHandoff;
  workflow_phases: PostSalesWorkflowPhase[];
  coverage_summary: {
    coverage_status: string;
    layer_1_platform_telemetry_status: string | null;
    layer_2_user_voice_empirical_status: string | null;
    layer_3_business_system_outcomes_status: string | null;
    governance_evidence_status: string | null;
    assumption_evidence_status: string | null;
    aggregate_workforce_context_state: string | null;
    validated_client_evidence_entry_count: number;
    rejected_or_held_client_evidence_entry_count: number;
    source_package_count: number;
    financial_translation_allowed: boolean;
    customer_facing_financial_output_allowed: boolean;
  };
  governance: Record<string, boolean>;
  privacy_boundary: Record<string, boolean>;
  feeds: Record<string, boolean>;
  persistence_policy: Record<string, boolean>;
  allowed_uses: string[];
  blocked_uses: string[];
  required_caveats: string[];
  created_at: string;
  derivation_version: string;
}

export interface PostSalesWorkflowOrchestratorValidationResult {
  schema_version: string;
  orchestrator_id: string | null;
  org_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    post_sales_workflow_orchestrator: boolean;
    measurement_plan_draft: boolean;
    evidence_gap_review: boolean;
    client_evidence_requests: boolean;
    source_packages: boolean;
    evidence_snapshot: boolean;
    claim_readiness_handoff: boolean;
    claim_readiness_snapshot: false;
    executive_readout_snapshot: false;
    customer_facing_financial_output: false;
  };
}

function safeIdPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
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

function workflowPhase(
  phaseId: string,
  phaseStatus: string,
  producedOutputs: string[],
  requiredCaveats: string[] = []
): PostSalesWorkflowPhase {
  return {
    phase_id: phaseId,
    phase_status: phaseStatus,
    produced_outputs: producedOutputs,
    blocked_outputs: [
      ...REQUIRED_BLOCKED_USES,
      "claim_readiness_snapshot",
      "executive_readout_snapshot",
      "customer_facing_financial_output",
      "roi_output",
      "ebita_output",
      "causality_output",
      "productivity_output",
      "headcount_output",
      "people_decisioning_output",
      "manager_or_team_ranking_output"
    ],
    required_caveats: unique([...REQUIRED_CAVEATS, ...requiredCaveats])
  };
}

function buildWorkflowPhases(
  hasAcceptedEntries: boolean,
  hasRejectedEntries: boolean
): PostSalesWorkflowPhase[] {
  return [
    workflowPhase("ai_fluency_intake", "complete", ["ai_fluency_intake_bridge"]),
    workflowPhase("measurement_plan_draft", "complete", ["measurement_plan_draft"]),
    workflowPhase("initial_evidence_snapshot", "complete", ["initial_evidence_gap_review"]),
    workflowPhase("evidence_gap_review", "complete", ["current_evidence_gap_review"]),
    workflowPhase("client_evidence_requests", "complete", ["client_evidence_requests"]),
    workflowPhase(
      "client_evidence_entry_to_source_packages",
      hasAcceptedEntries ? "complete" : hasRejectedEntries ? "blocked" : "held",
      ["client_evidence_entry_reviews", "source_packages"],
      hasRejectedEntries
        ? ["Rejected or held client evidence cannot become Source Packages."]
        : []
    ),
    workflowPhase("updated_evidence_snapshot", "complete", ["evidence_snapshot"]),
    workflowPhase("claim_readiness_handoff", "complete", ["claim_readiness_handoff"])
  ];
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

function governancePolicy(): Record<string, boolean> {
  return {
    internal_only: true,
    aggregate_only: true,
    ai_fluency_baseline_is_value_proof: false,
    bigquery_source_availability_is_value_proof: false,
    vbd_is_layer_1_only: true,
    client_evidence_requests_upgrade_claim_readiness: false,
    invalid_entries_create_source_packages: false,
    source_packages_create_claims: false,
    claim_readiness_snapshot_created: false,
    executive_readout_snapshot_created: false,
    customer_facing_financial_output_allowed: false
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
    persists_executive_readout_snapshots: false
  };
}

function feeds(sourcePackageCount: number): Record<string, boolean> {
  return {
    post_sales_workflow_orchestrator: true,
    customer_journey: true,
    ai_fluency_intake_bridge: true,
    measurement_plan_draft: true,
    evidence_gap_review: true,
    client_evidence_requests: true,
    client_evidence_entry_reviews: true,
    source_packages: sourcePackageCount > 0,
    evidence_snapshot: true,
    claim_readiness_handoff: true,
    claim_readiness_snapshot: false,
    executive_readout_snapshot: false,
    customer_facing_financial_output: false,
    customer_facing_economic_output: false,
    roi_output: false,
    ebita_output: false,
    causality_output: false,
    productivity_output: false,
    headcount_output: false,
    people_decisioning_output: false,
    manager_or_team_ranking_output: false
  };
}

function aiFluencyIntakeState(value: any): "provided_validated" | "missing_placeholder" {
  return value === "provided_validated" ? "provided_validated" : "missing_placeholder";
}

function identityGapsForEntry(entry: any, orgId: string, measurementPlanId: string): string[] {
  const gaps: string[] = [];
  if (entry?.org_id !== orgId) {
    gaps.push("Client Evidence Entry org_id does not match orchestrator org_id.");
  }
  if (entry?.measurement_plan_id !== measurementPlanId) {
    gaps.push("Client Evidence Entry measurement_plan_id does not match Measurement Plan.");
  }
  return gaps;
}

function reviewEntry(
  entry: any,
  orgId: string,
  measurementPlanId: string,
  generatedAt: string
): {
  review: ClientEvidenceEntryReview;
  sourcePackage: SourcePackage | null;
} {
  const validation = validateClientEvidenceEntry(entry);
  const rejectionReasons = [...validation.gaps, ...identityGapsForEntry(entry, orgId, measurementPlanId)];
  let sourcePackage: SourcePackage | null = null;
  if (validation.valid && validation.feeds.source_package && rejectionReasons.length === 0) {
    try {
      sourcePackage = buildSourcePackageFromClientEvidenceEntry(entry, {
        generatedAt,
        sourcePackageId: `source_package_${safeIdPart(String(entry.entry_id))}`
      });
    } catch (error) {
      rejectionReasons.push(error instanceof Error ? error.message : String(error));
    }
  }
  return {
    review: {
      entry_id: validation.entry_id,
      request_id: validation.request_id,
      evidence_layer: entry?.evidence_layer ?? null,
      entry_mode: entry?.entry_mode ?? null,
      validation_status: entry?.validation_status ?? null,
      accepted_for_source_package: sourcePackage !== null,
      source_package_id: sourcePackage?.source_package_id ?? null,
      rejection_reasons: rejectionReasons,
      validation_result: validation
    },
    sourcePackage
  };
}

function coverageStatusOf(snapshot: any, layer: string): string | null {
  return snapshot?.playbook_coverage?.[layer]?.status ??
    snapshot?.playbook_layers?.[layer]?.evidence_state ??
    null;
}

function buildCoverageSummary(
  snapshot: any,
  handoff: ClaimReadinessHandoff,
  entryReviews: ClientEvidenceEntryReview[],
  sourcePackageCount: number
): PostSalesWorkflowOrchestrator["coverage_summary"] {
  return {
    coverage_status: String(snapshot?.playbook_coverage?.coverage_status ?? "unknown"),
    layer_1_platform_telemetry_status: coverageStatusOf(snapshot, "layer_1_platform_telemetry"),
    layer_2_user_voice_empirical_status: coverageStatusOf(snapshot, "layer_2_user_voice_empirical"),
    layer_3_business_system_outcomes_status: coverageStatusOf(snapshot, "layer_3_business_system_outcomes"),
    governance_evidence_status: coverageStatusOf(snapshot, "governance_evidence"),
    assumption_evidence_status: coverageStatusOf(snapshot, "assumption_evidence"),
    aggregate_workforce_context_state: snapshot?.aggregate_workforce_context?.context_state ?? null,
    validated_client_evidence_entry_count: entryReviews.filter(
      (review) => review.accepted_for_source_package
    ).length,
    rejected_or_held_client_evidence_entry_count: entryReviews.filter(
      (review) => !review.accepted_for_source_package
    ).length,
    source_package_count: sourcePackageCount,
    financial_translation_allowed:
      handoff.financial_boundary.financial_translation_allowed,
    customer_facing_financial_output_allowed:
      handoff.financial_boundary.customer_facing_financial_output_allowed
  };
}

export function buildPostSalesWorkflowOrchestrator(
  inputs: PostSalesWorkflowOrchestratorBuildInputs
): PostSalesWorkflowOrchestrator {
  const createdAt = inputs.generatedAt ?? new Date().toISOString();
  const orchestratorId = inputs.orchestratorId ??
    `post_sales_workflow_orchestrator_${safeIdPart(inputs.orgId)}_${safeIdPart(inputs.workflowFamily)}`;
  const bridge = buildMeasurementPlanDraftFromAIFluencyIntake({
    ...inputs,
    generatedAt: createdAt
  });
  const plan = bridge.measurement_plan_draft;
  const journey = buildInitialCustomerJourney({
    journeyId: inputs.customerJourneyId ??
      `customer_journey_${safeIdPart(inputs.orgId)}_${safeIdPart(inputs.workflowFamily)}`,
    orgId: inputs.orgId,
    customerAccountId: inputs.customerAccountId,
    engagementId: inputs.engagementId,
    createdAt,
    updatedAt: createdAt
  });
  const initialSourcePackages = (inputs.initialSourcePackages ?? []).map((pkg) =>
    clone(pkg)
  ) as SourcePackage[];
  const initialAssembly = buildEvidenceSnapshotInputFromMeasurementPlanAndSourcePackages(
    plan,
    initialSourcePackages,
    {
      assemblyId: `initial_evidence_collection_assembly_${safeIdPart(inputs.orgId)}_${safeIdPart(inputs.workflowFamily)}`,
      evidenceSnapshotId: `initial_evidence_snapshot_${safeIdPart(inputs.orgId)}_${safeIdPart(inputs.workflowFamily)}_${safeIdPart(plan.windows.baseline_window_start)}_${safeIdPart(plan.windows.baseline_window_end)}`,
      generatedAt: createdAt
    }
  );
  const initialEvidenceSnapshot = initialAssembly.draft_evidence_snapshot_input;

  const entryReviews: ClientEvidenceEntryReview[] = [];
  const derivedSourcePackages: SourcePackage[] = [];
  for (const entry of inputs.clientEvidenceEntries ?? []) {
    const { review, sourcePackage } = reviewEntry(
      entry,
      inputs.orgId,
      plan.measurement_plan_id,
      createdAt
    );
    entryReviews.push(review);
    if (sourcePackage) derivedSourcePackages.push(sourcePackage);
  }

  const sourcePackages = [
    ...initialSourcePackages,
    ...derivedSourcePackages
  ] as SourcePackage[];
  const assembly = buildEvidenceSnapshotInputFromMeasurementPlanAndSourcePackages(
    plan,
    sourcePackages,
    {
      assemblyId: inputs.assemblyId ??
        `evidence_collection_assembly_${safeIdPart(inputs.orgId)}_${safeIdPart(inputs.workflowFamily)}`,
      evidenceSnapshotId: inputs.evidenceSnapshotId ??
        `evidence_snapshot_${safeIdPart(inputs.orgId)}_${safeIdPart(inputs.workflowFamily)}_${safeIdPart(plan.windows.baseline_window_start)}_${safeIdPart(plan.windows.baseline_window_end)}`,
      generatedAt: createdAt
    }
  );
  const evidenceSnapshot = assembly.draft_evidence_snapshot_input;
  const handoff = buildClaimReadinessHandoffFromEvidenceSnapshot(evidenceSnapshot, {
    handoffId: inputs.handoffId ??
      `claim_readiness_handoff_${safeIdPart(String(evidenceSnapshot.evidence_snapshot_id))}`,
    createdAt
  });
  const currentGapReview = buildEvidenceGapReviewFromMeasurementPlanAndSnapshot(
    plan,
    evidenceSnapshot,
    {
      generatedAt: createdAt,
      evidenceSnapshotId: evidenceSnapshot.evidence_snapshot_id,
      aiFluencyIntakeState: aiFluencyIntakeState(
        bridge.ai_fluency_intake.intake_state
      )
    }
  );
  const currentRequests = buildClientEvidenceRequestsFromEvidenceSnapshot(
    evidenceSnapshot,
    {
      createdAt
    }
  );
  const acceptedEntries = entryReviews.some((review) => review.accepted_for_source_package);
  const rejectedEntries = entryReviews.some((review) => !review.accepted_for_source_package);
  return {
    schema_version: AI_VALUE_POST_SALES_WORKFLOW_ORCHESTRATOR_SCHEMA_VERSION,
    orchestrator_id: orchestratorId,
    org_id: inputs.orgId,
    customer_journey: journey,
    ai_fluency_intake_bridge: bridge,
    initial_evidence_gap_review: bridge.evidence_gap_review,
    current_evidence_gap_review: currentGapReview,
    client_evidence_requests: {
      initial_requests: bridge.client_evidence_requests,
      current_requests: currentRequests
    },
    client_evidence_entry_reviews: entryReviews,
    source_packages: sourcePackages,
    initial_evidence_snapshot: initialEvidenceSnapshot,
    evidence_collection_assembly: assembly,
    evidence_snapshot: evidenceSnapshot,
    claim_readiness_handoff: handoff,
    workflow_phases: buildWorkflowPhases(acceptedEntries, rejectedEntries),
    coverage_summary: buildCoverageSummary(
      evidenceSnapshot,
      handoff,
      entryReviews,
      sourcePackages.length
    ),
    governance: governancePolicy(),
    privacy_boundary: privacyBoundary(),
    feeds: feeds(sourcePackages.length),
    persistence_policy: persistencePolicy(),
    allowed_uses: SAFE_ALLOWED_USES,
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
    if (
      !GOVERNED_KEY_ALLOWLIST.has(key) &&
      FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key))
    ) {
      keys.add(key);
    }
    collectForbiddenKeys(nested, keys);
  }
  return keys;
}

function collectUnsafeAllowedUseValues(value: any, values: string[] = [], path: string[] = []): string[] {
  if (!value || typeof value !== "object") return values;
  if (Array.isArray(value)) {
    const currentKey = path.length > 0 ? path[path.length - 1] : "";
    if (["allowed_uses", "allowed_outputs", "produced_outputs"].includes(currentKey)) {
      for (const item of value) {
        const text = String(item);
        if (UNSAFE_USE_PATTERNS.some((pattern) => pattern.test(text))) {
          values.push(`${path.join(".")}: ${text}`);
        }
      }
    }
    value.forEach((item, index) => collectUnsafeAllowedUseValues(item, values, [...path, String(index)]));
    return values;
  }
  for (const [key, nested] of Object.entries(value)) {
    collectUnsafeAllowedUseValues(nested, values, [...path, key]);
  }
  return values;
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

function stableString(value: any): string {
  return JSON.stringify(value);
}

function collectWorkflowPhaseGaps(orchestrator: any): string[] {
  const gaps: string[] = [];
  const phases = orchestrator?.workflow_phases;
  if (!Array.isArray(phases)) {
    gaps.push("workflow_phases must be an array");
    return gaps;
  }
  const actual = phases.map((phase: any) => String(phase?.phase_id ?? ""));
  if (actual.length !== WORKFLOW_PHASE_IDS.length) {
    gaps.push("workflow_phases must include every required phase exactly once");
  }
  WORKFLOW_PHASE_IDS.forEach((phaseId, index) => {
    if (actual[index] !== phaseId) {
      gaps.push(`workflow_phases[${index}].phase_id must be ${phaseId}`);
    }
  });
  phases.forEach((phase: any, index: number) => {
    for (const use of REQUIRED_BLOCKED_USES) {
      if (!stringsOf(phase?.blocked_outputs).some((output) => normalizeToken(output).includes(use))) {
        const outputToken = use.replace(/_claim$/, "_output");
        if (!stringsOf(phase?.blocked_outputs).some((output) => normalizeToken(output).includes(outputToken))) {
          gaps.push(`workflow_phases[${index}].blocked_outputs must preserve ${use}`);
        }
      }
    }
    if (!Array.isArray(phase?.required_caveats) || phase.required_caveats.length === 0) {
      gaps.push(`workflow_phases[${index}].required_caveats must be present`);
    }
  });
  return gaps;
}

function collectPolicyGaps(orchestrator: any): string[] {
  const gaps: string[] = [];
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!hasToken(orchestrator?.blocked_uses, use)) {
      gaps.push(`blocked_uses must include ${use}`);
    }
  }
  for (const caveat of REQUIRED_CAVEATS) {
    if (!stringsOf(orchestrator?.required_caveats).includes(caveat)) {
      gaps.push(`required_caveats must include: ${caveat}`);
    }
  }
  for (const use of stringsOf(orchestrator?.allowed_uses)) {
    if (!SAFE_ALLOWED_USES.includes(normalizeToken(use))) {
      gaps.push(`allowed_uses contains unsupported use: ${use}`);
    }
  }
  for (const value of collectUnsafeAllowedUseValues(orchestrator)) {
    gaps.push(`Unsafe allowed or produced output detected: ${value}`);
  }
  return gaps;
}

function collectBoundaryGaps(orchestrator: any): string[] {
  const gaps: string[] = [];
  requireBoolean(orchestrator?.privacy_boundary?.aggregate_only, true, "privacy_boundary.aggregate_only", gaps);
  for (const flag of UNSAFE_PRIVACY_FALSE_FLAGS) {
    requireBoolean(orchestrator?.privacy_boundary?.[flag], false, `privacy_boundary.${flag}`, gaps);
  }
  for (const [key, expected] of Object.entries(governancePolicy())) {
    requireBoolean(orchestrator?.governance?.[key], expected, `governance.${key}`, gaps);
  }
  for (const [key, expected] of Object.entries(persistencePolicy())) {
    requireBoolean(orchestrator?.persistence_policy?.[key], expected, `persistence_policy.${key}`, gaps);
  }
  for (const [key, expected] of Object.entries(feeds(orchestrator?.source_packages?.length ?? 0))) {
    requireBoolean(orchestrator?.feeds?.[key], expected, `feeds.${key}`, gaps);
  }
  return gaps;
}

function collectIdentityGaps(orchestrator: any): string[] {
  const gaps: string[] = [];
  const orgId = orchestrator?.org_id;
  const plan = orchestrator?.ai_fluency_intake_bridge?.measurement_plan_draft ?? {};
  const planId = plan?.measurement_plan_id;
  if (orchestrator?.customer_journey?.org_id !== orgId) {
    gaps.push("customer_journey.org_id must match orchestrator org_id");
  }
  if (orchestrator?.ai_fluency_intake_bridge?.org_id !== orgId) {
    gaps.push("ai_fluency_intake_bridge.org_id must match orchestrator org_id");
  }
  if (
    stableString(orchestrator?.initial_evidence_gap_review) !==
    stableString(orchestrator?.ai_fluency_intake_bridge?.evidence_gap_review)
  ) {
    gaps.push("initial_evidence_gap_review must match ai_fluency_intake_bridge evidence_gap_review");
  }
  if (orchestrator?.evidence_collection_assembly?.measurement_plan_id !== planId) {
    gaps.push("evidence_collection_assembly.measurement_plan_id must match Measurement Plan");
  }
  if (
    orchestrator?.evidence_collection_assembly?.draft_evidence_snapshot_input?.evidence_snapshot_id !==
    orchestrator?.evidence_snapshot?.evidence_snapshot_id
  ) {
    gaps.push("evidence_collection_assembly draft evidence snapshot must match top-level evidence_snapshot");
  }
  if (
    stableString(orchestrator?.evidence_collection_assembly?.draft_evidence_snapshot_input) !==
    stableString(orchestrator?.evidence_snapshot)
  ) {
    gaps.push("evidence_collection_assembly draft evidence snapshot must equal top-level evidence_snapshot");
  }
  if (orchestrator?.initial_evidence_snapshot?.measurement_plan_id !== planId) {
    gaps.push("initial_evidence_snapshot.measurement_plan_id must match Measurement Plan");
  }
  if (orchestrator?.evidence_snapshot?.measurement_plan_id !== planId) {
    gaps.push("evidence_snapshot.measurement_plan_id must match Measurement Plan");
  }
  if (
    orchestrator?.claim_readiness_handoff?.evidence_snapshot_id !==
    orchestrator?.evidence_snapshot?.evidence_snapshot_id
  ) {
    gaps.push("claim_readiness_handoff.evidence_snapshot_id must match evidence_snapshot");
  }
  if (orchestrator?.claim_readiness_handoff?.measurement_plan_id !== planId) {
    gaps.push("claim_readiness_handoff.measurement_plan_id must match Measurement Plan");
  }
  if (orchestrator?.claim_readiness_handoff?.org_id !== orgId) {
    gaps.push("claim_readiness_handoff.org_id must match orchestrator org_id");
  }
  if (
    stableString(orchestrator?.claim_readiness_handoff?.workflow) !==
    stableString(orchestrator?.evidence_snapshot?.workflow)
  ) {
    gaps.push("claim_readiness_handoff.workflow must match evidence_snapshot workflow");
  }
  if (
    stableString(orchestrator?.claim_readiness_handoff?.window) !==
    stableString(orchestrator?.evidence_snapshot?.window)
  ) {
    gaps.push("claim_readiness_handoff.window must match evidence_snapshot window");
  }
  if (orchestrator?.current_evidence_gap_review?.measurement_plan_id !== planId) {
    gaps.push("current_evidence_gap_review.measurement_plan_id must match Measurement Plan");
  }
  for (const [index, request] of [
    ...(orchestrator?.client_evidence_requests?.initial_requests ?? []),
    ...(orchestrator?.client_evidence_requests?.current_requests ?? [])
  ].entries()) {
    if (request?.org_id !== orgId) {
      gaps.push(`client_evidence_requests request ${index} org_id must match orchestrator org_id`);
    }
    if (request?.measurement_plan_id !== planId) {
      gaps.push(`client_evidence_requests request ${index} measurement_plan_id must match Measurement Plan`);
    }
  }
  for (const [index, pkg] of (orchestrator?.source_packages ?? []).entries()) {
    if (pkg?.org_id !== orgId) {
      gaps.push(`source_packages[${index}].org_id must match orchestrator org_id`);
    }
  }
  return gaps;
}

function collectEntryReviewGaps(orchestrator: any): string[] {
  const gaps: string[] = [];
  const sourcePackageIds = new Set(
    (orchestrator?.source_packages ?? []).map((pkg: any) => String(pkg?.source_package_id ?? ""))
  );
  const acceptedReviewsByEntryId = new Map<string, any>();
  if (!Array.isArray(orchestrator?.client_evidence_entry_reviews)) {
    gaps.push("client_evidence_entry_reviews must be an array");
    return gaps;
  }
  for (const [index, review] of orchestrator.client_evidence_entry_reviews.entries()) {
    requireField(review?.validation_result, `client_evidence_entry_reviews[${index}].validation_result`, gaps);
    if (review?.entry_id !== review?.validation_result?.entry_id) {
      gaps.push(`client_evidence_entry_reviews[${index}].entry_id must match validation_result.entry_id`);
    }
    if (review?.request_id !== review?.validation_result?.request_id) {
      gaps.push(`client_evidence_entry_reviews[${index}].request_id must match validation_result.request_id`);
    }
    if (review?.validation_result?.org_id !== orchestrator?.org_id) {
      gaps.push(`client_evidence_entry_reviews[${index}].validation_result.org_id must match orchestrator org_id`);
    }
    if (
      review?.validation_result?.measurement_plan_id !==
      orchestrator?.ai_fluency_intake_bridge?.measurement_plan_draft?.measurement_plan_id
    ) {
      gaps.push(`client_evidence_entry_reviews[${index}].validation_result.measurement_plan_id must match Measurement Plan`);
    }
    if (review?.accepted_for_source_package === true) {
      if (review?.validation_result?.valid !== true) {
        gaps.push(`client_evidence_entry_reviews[${index}] accepted entry must have valid validation_result`);
      }
      if (review?.validation_result?.feeds?.source_package !== true) {
        gaps.push(`client_evidence_entry_reviews[${index}] accepted entry must feed source_package`);
      }
      if (!sourcePackageIds.has(String(review?.source_package_id ?? ""))) {
        gaps.push(`client_evidence_entry_reviews[${index}] accepted entry must reference a derived Source Package`);
      }
      if (stringsOf(review?.rejection_reasons).length > 0) {
        gaps.push(`client_evidence_entry_reviews[${index}] accepted entry must not carry rejection reasons`);
      }
      if (review?.entry_id) {
        acceptedReviewsByEntryId.set(String(review.entry_id), review);
      }
    } else if (review?.source_package_id !== null) {
      gaps.push(`client_evidence_entry_reviews[${index}] rejected entry must not reference a Source Package`);
    }
  }
  for (const [index, pkg] of (orchestrator?.source_packages ?? []).entries()) {
    const entryId = pkg?.source_refs?.client_evidence_entry_id;
    if (!entryId) continue;
    const review = acceptedReviewsByEntryId.get(String(entryId));
    if (!review) {
      gaps.push(
        `source_packages[${index}] references client evidence entry ${entryId} without an accepted review`
      );
      continue;
    }
    if (String(review.source_package_id ?? "") !== String(pkg?.source_package_id ?? "")) {
      gaps.push(
        `source_packages[${index}] provenance does not match accepted entry review source_package_id`
      );
    }
    if (String(pkg?.source_refs?.client_evidence_request_id ?? "") !== String(review.request_id ?? "")) {
      gaps.push(
        `source_packages[${index}] source_refs.client_evidence_request_id must match accepted entry review request_id`
      );
    }
    if (pkg?.source_package_type === "layer_2_user_voice_empirical_export" &&
        review.evidence_layer !== "layer_2_user_voice_empirical") {
      gaps.push(`source_packages[${index}] Layer 2 provenance must match review evidence_layer`);
    }
    if (pkg?.source_package_type === "layer_3_business_system_of_record_outcome_export" &&
        review.evidence_layer !== "layer_3_business_system_outcomes") {
      gaps.push(`source_packages[${index}] Layer 3 provenance must match review evidence_layer`);
    }
    if (pkg?.source_package_type === "governance_control_export" &&
        review.evidence_layer !== "governance_evidence") {
      gaps.push(`source_packages[${index}] governance provenance must match review evidence_layer`);
    }
    if (pkg?.source_package_type === "assumption_approval_export" &&
        review.evidence_layer !== "assumption_evidence") {
      gaps.push(`source_packages[${index}] assumption provenance must match review evidence_layer`);
    }
    if (pkg?.source_package_type === "aggregate_workforce_context_export" &&
        review.evidence_layer !== "aggregate_workforce_context") {
      gaps.push(`source_packages[${index}] workforce provenance must match review evidence_layer`);
    }
  }
  return gaps;
}

function collectContractValidationGaps(orchestrator: any): string[] {
  const gaps: string[] = [];
  const journeyResult = validateCustomerJourney(orchestrator?.customer_journey);
  if (!journeyResult.valid) {
    gaps.push(...journeyResult.gaps.map((gap) => `customer_journey: ${gap}`));
  }
  const bridgeResult = validateAIFluencyIntakeBridge(orchestrator?.ai_fluency_intake_bridge);
  if (!bridgeResult.valid) {
    gaps.push(...bridgeResult.gaps.map((gap) => `ai_fluency_intake_bridge: ${gap}`));
  }
  const planResult = validateMeasurementPlan(
    orchestrator?.ai_fluency_intake_bridge?.measurement_plan_draft
  );
  if (!planResult.valid) {
    gaps.push(...planResult.gaps.map((gap) => `measurement_plan_draft: ${gap}`));
  }
  for (const [index, request] of [
    ...(orchestrator?.client_evidence_requests?.initial_requests ?? []),
    ...(orchestrator?.client_evidence_requests?.current_requests ?? [])
  ].entries()) {
    const requestResult = validateClientEvidenceRequest(request);
    if (!requestResult.valid) {
      gaps.push(...requestResult.gaps.map((gap) => `client_evidence_requests[${index}]: ${gap}`));
    }
  }
  for (const [index, pkg] of (orchestrator?.source_packages ?? []).entries()) {
    const sourceResult = validateSourcePackage(pkg);
    if (!sourceResult.valid) {
      gaps.push(...sourceResult.gaps.map((gap) => `source_packages[${index}]: ${gap}`));
    }
  }
  const assemblyResult = validateEvidenceCollectionAssembly(
    orchestrator?.evidence_collection_assembly
  );
  if (!assemblyResult.valid) {
    gaps.push(...assemblyResult.gaps.map((gap) => `evidence_collection_assembly: ${gap}`));
  }
  const initialSnapshotResult = validateEvidenceSnapshot(
    orchestrator?.initial_evidence_snapshot
  );
  if (!initialSnapshotResult.valid) {
    gaps.push(...initialSnapshotResult.gaps.map((gap) => `initial_evidence_snapshot: ${gap}`));
  }
  const snapshotResult = validateEvidenceSnapshot(orchestrator?.evidence_snapshot);
  if (!snapshotResult.valid) {
    gaps.push(...snapshotResult.gaps.map((gap) => `evidence_snapshot: ${gap}`));
  }
  const handoffResult = validateClaimReadinessHandoff(
    orchestrator?.claim_readiness_handoff
  );
  if (!handoffResult.valid) {
    gaps.push(...handoffResult.gaps.map((gap) => `claim_readiness_handoff: ${gap}`));
  }
  return gaps;
}

function collectCoverageSummaryGaps(orchestrator: any): string[] {
  const gaps: string[] = [];
  const snapshot = orchestrator?.evidence_snapshot ?? {};
  const handoff = orchestrator?.claim_readiness_handoff ?? {};
  const summary = orchestrator?.coverage_summary ?? {};
  if (summary.coverage_status !== snapshot?.playbook_coverage?.coverage_status) {
    gaps.push("coverage_summary.coverage_status must match evidence_snapshot coverage_status");
  }
  if (summary.layer_2_user_voice_empirical_status !== coverageStatusOf(snapshot, "layer_2_user_voice_empirical")) {
    gaps.push("coverage_summary.layer_2_user_voice_empirical_status must match evidence snapshot");
  }
  if (summary.layer_3_business_system_outcomes_status !== coverageStatusOf(snapshot, "layer_3_business_system_outcomes")) {
    gaps.push("coverage_summary.layer_3_business_system_outcomes_status must match evidence snapshot");
  }
  if (
    summary.financial_translation_allowed !==
      handoff?.financial_boundary?.financial_translation_allowed
  ) {
    gaps.push("coverage_summary.financial_translation_allowed must match claim_readiness_handoff financial boundary");
  }
  if (summary.financial_translation_allowed === true) {
    if (snapshot?.playbook_coverage?.coverage_status !== "full_playbook_coverage") {
      gaps.push("coverage_summary.financial_translation_allowed requires full_playbook_coverage");
    }
    if (
      handoff?.financial_boundary?.financial_claim_governance_state !==
        "financial_translation_ready" ||
      handoff?.financial_boundary?.roi_claim_allowed !== true
    ) {
      gaps.push("coverage_summary.financial_translation_allowed requires financial_translation_ready handoff");
    }
  }
  if (summary.customer_facing_financial_output_allowed !== false) {
    gaps.push("coverage_summary.customer_facing_financial_output_allowed must be false");
  }
  return gaps;
}

export function validatePostSalesWorkflowOrchestrator(
  orchestrator: any
): PostSalesWorkflowOrchestratorValidationResult {
  const gaps: string[] = [];
  for (const field of REQUIRED_FIELDS) {
    requireField(orchestrator?.[field], field, gaps);
  }
  if (
    orchestrator?.schema_version &&
    orchestrator.schema_version !== AI_VALUE_POST_SALES_WORKFLOW_ORCHESTRATOR_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${orchestrator.schema_version}`);
  }
  for (const key of [...collectForbiddenKeys(orchestrator)].sort()) {
    gaps.push(`Forbidden field detected: ${key}`);
  }
  for (const value of collectForbiddenIdentifierValues(orchestrator)) {
    gaps.push(`Forbidden identifier value detected: ${value}`);
  }
  gaps.push(...collectWorkflowPhaseGaps(orchestrator));
  gaps.push(...collectPolicyGaps(orchestrator));
  gaps.push(...collectBoundaryGaps(orchestrator));
  gaps.push(...collectIdentityGaps(orchestrator));
  gaps.push(...collectEntryReviewGaps(orchestrator));
  gaps.push(...collectContractValidationGaps(orchestrator));
  gaps.push(...collectCoverageSummaryGaps(orchestrator));

  const valid = gaps.length === 0;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    orchestrator_id: orchestrator?.orchestrator_id ?? null,
    org_id: orchestrator?.org_id ?? null,
    valid,
    gaps,
    feeds: {
      post_sales_workflow_orchestrator: valid,
      measurement_plan_draft: valid && orchestrator?.feeds?.measurement_plan_draft === true,
      evidence_gap_review: valid && orchestrator?.feeds?.evidence_gap_review === true,
      client_evidence_requests: valid && orchestrator?.feeds?.client_evidence_requests === true,
      source_packages: valid && orchestrator?.feeds?.source_packages === true,
      evidence_snapshot: valid && orchestrator?.feeds?.evidence_snapshot === true,
      claim_readiness_handoff: valid && orchestrator?.feeds?.claim_readiness_handoff === true,
      claim_readiness_snapshot: false,
      executive_readout_snapshot: false,
      customer_facing_financial_output: false
    }
  };
}
