/**
 * AI Value Engine - Claim Readiness Snapshot.
 *
 * Contract-only, non-persisted claim posture derived from a validated Evidence
 * Snapshot and a validated Claim Readiness Handoff. It does not calculate ROI,
 * EBITA, productivity, causality, or customer-facing financial output.
 */

import {
  EVIDENCE_SNAPSHOT_SCHEMA_VERSION,
  validateEvidenceSnapshot
} from "./evidenceSnapshot";
import {
  AI_VALUE_CLAIM_READINESS_HANDOFF_SCHEMA_VERSION,
  type ClaimReadinessHandoff,
  financeOrBusinessApprovalCaveated,
  validateClaimReadinessHandoff
} from "./claimReadinessHandoff";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_CLAIM_READINESS_SNAPSHOT_VALIDATION_2026_06";

export const AI_VALUE_CLAIM_READINESS_SNAPSHOT_SCHEMA_VERSION =
  "FT_AI_VALUE_CLAIM_READINESS_SNAPSHOT_2026_06";

const DERIVATION_VERSION =
  "ai_value_claim_readiness_snapshot_builder_2026_06";

const REQUIRED_FIELDS = [
  "schema_version",
  "claim_readiness_snapshot_id",
  "evidence_snapshot_id",
  "handoff_id",
  "org_id",
  "measurement_plan_id",
  "workflow",
  "window",
  "snapshot_readiness_decision",
  "playbook_coverage",
  "coverage_status",
  "claim_readiness_state",
  "allowed_claim_modes",
  "blocked_uses",
  "blocked_claims",
  "unmapped_blocked_uses",
  "required_caveats",
  "suppression",
  "privacy_boundary",
  "aggregate_workforce_context",
  "vbd_operating_map",
  "financial_boundary",
  "executive_readout_boundary",
  "source_refs",
  "source_provenance",
  "derived_from",
  "validation",
  "persistence_policy",
  "created_at",
  "derivation_version"
] as const;

const ALLOWED_CLAIM_READINESS_STATES = new Set([
  "held_for_full_playbook_coverage",
  "ready_for_internal_claim_review",
  "blocked_for_privacy_or_suppression",
  "held_for_governance",
  "held_for_source_binding"
]);

const ALLOWED_CLAIM_MODES = new Set([
  "internal_evidence_review",
  "caveated_internal_playbook_gap_review",
  "source_bound_business_outcome_claim_planning",
  "governed_roi_scenario_review",
  "internal_executive_readout_planning"
]);

const FINANCIAL_CLAIM_GOVERNANCE_STATES = new Set([
  "held",
  "internal_value_investigation",
  "financial_translation_ready",
  "blocked_for_insufficient_evidence",
  "blocked_for_privacy_or_suppression"
]);

const FINANCIAL_TRANSLATION_BLOCKED_USES = [
  "realized_roi",
  "realized_roi_calculation",
  "roi_proof"
];

const FINANCIAL_TRANSLATION_BLOCKED_CLAIMS = [
  "roi_proof"
];

const REQUIRED_IMMUTABLE_BLOCKED_CLAIMS = [
  "ebita_claim",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_scoring",
  "team_or_manager_ranking",
  "people_decisioning",
  "customer_facing_economic_output"
];

const REQUIRED_TELEMETRY_BLOCKED_CLAIMS = [
  "roi_proof",
  ...REQUIRED_IMMUTABLE_BLOCKED_CLAIMS
];

const REQUIRED_IMMUTABLE_BLOCKED_USES = [
  "ebita_claim",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "people_decisioning",
  "customer_facing_financial_output"
];

const REQUIRED_TELEMETRY_BLOCKED_USES = [
  "realized_roi",
  ...REQUIRED_IMMUTABLE_BLOCKED_USES
];

const UNSAFE_PRIVACY_FLAGS = [
  "contains_direct_identifiers",
  "contains_raw_content",
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

const DISALLOWED_COMPUTED_FIELD_PATTERNS = [
  /roi_(?:value|amount|calculation|result)/i,
  /ebita_(?:value|amount|impact|calculation|result)/i,
  /dollar(?:ized)?_(?:value|amount|impact|output)/i,
  /time_saved_(?:value|amount|impact)/i,
  /productivity_lift/i,
  /financial_impact/i,
  /causal(?:ity)?_(?:delta|effect|claim|proof)/i
];

const FORBIDDEN_FIELD_KEY_PATTERNS = [
  /raw_(?:prompt|response|transcript|content|rows?)/i,
  /prompt/i,
  /response/i,
  /transcript/i,
  /query_text/i,
  /sql_text/i,
  /file_content/i,
  /email/i,
  /user_id/i,
  /employee_id/i,
  /hashed_(?:user|person|employee)_id/i,
  /joinable_(?:user|person|employee)_identifier/i,
  /person_level_hris/i,
  /person_level_productivity/i,
  /manager_ranking/i,
  /team_ranking/i,
  /compensation/i,
  /performance_rating/i,
  /promotion/i,
  /discipline/i,
  /attrition_prediction/i,
  /hris_inference/i
];

const GOVERNED_KEY_ALLOWLIST = new Set([
  "aggregate_workforce_context",
  "contains_raw_content",
  "contains_person_level_productivity",
  "contains_person_level_hris_records",
  "contains_hashed_or_joinable_person_identifiers",
  "contains_manager_or_team_ranking",
  "contains_compensation_or_performance_inference",
  "contains_promotion_or_discipline_inference",
  "contains_attrition_prediction",
  "contains_hris_inference_from_ai_usage",
  "blocked_uses",
  "blocked_claims",
  "financial_boundary",
  "financial_claim_governance_state",
  "financial_translation_allowed",
  "customer_facing_financial_output_allowed",
  "customer_facing_readout_allowed",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "hris_inference_from_ai_usage",
  "manager_or_team_ranking",
  "team_or_manager_ranking",
  "person_level_hris_records",
  "hashed_or_joinable_person_identifiers",
  "compensation_or_performance_inference",
  "promotion_or_discipline_inference"
]);

export const ClaimReadinessSnapshotSchema = {
  schema_version: AI_VALUE_CLAIM_READINESS_SNAPSHOT_SCHEMA_VERSION,
  required_fields: REQUIRED_FIELDS,
  allowed_claim_readiness_states: [...ALLOWED_CLAIM_READINESS_STATES],
  allowed_claim_modes: [...ALLOWED_CLAIM_MODES],
  required_blocked_claims: REQUIRED_TELEMETRY_BLOCKED_CLAIMS,
  persistence_policy: {
    backend_persistence_allowed: true,
    persisted: false,
    creates_migrations: false,
    creates_prisma_schema: false,
    creates_backend_routes: false,
    creates_frontend_ui: false,
    creates_ingestion_jobs: false
  }
} as const;

export interface ClaimReadinessSnapshotValidationResult {
  schema_version: string;
  claim_readiness_snapshot_id: string | null;
  evidence_snapshot_id: string | null;
  handoff_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    claim_readiness_snapshot: boolean;
    claim_review_context: boolean;
    executive_readout_snapshot: boolean;
    customer_facing_financial_output: boolean;
  };
}

export interface ClaimReadinessSnapshot {
  schema_version: string;
  claim_readiness_snapshot_id: string;
  evidence_snapshot_id: string;
  handoff_id: string;
  org_id: string;
  measurement_plan_id: string;
  workflow: any;
  window: any;
  snapshot_readiness_decision: string;
  playbook_coverage: any;
  coverage_status: string;
  claim_readiness_state: string;
  allowed_claim_modes: string[];
  blocked_uses: string[];
  blocked_claims: string[];
  unmapped_blocked_uses: string[];
  required_caveats: string[];
  suppression: any;
  privacy_boundary: any;
  aggregate_workforce_context: any;
  vbd_operating_map: any;
  financial_boundary: ClaimReadinessHandoff["financial_boundary"];
  executive_readout_boundary: ClaimReadinessHandoff["executive_readout_boundary"];
  source_refs: any;
  source_provenance: ClaimReadinessHandoff["source_provenance"];
  derived_from: {
    evidence_snapshot_id: string;
    evidence_snapshot_schema_version: string;
    evidence_snapshot_derivation_version: string;
    handoff_id: string;
    handoff_schema_version: string;
    handoff_derivation_version: string;
    builder: string;
  };
  validation: {
    evidence_snapshot_validated: boolean;
    claim_readiness_handoff_validated: boolean;
    source_binding_validated: boolean;
  };
  persistence_policy: {
    backend_persistence_allowed?: boolean;
    persisted: boolean;
    creates_migrations: boolean;
    creates_prisma_schema: boolean;
    creates_backend_routes: boolean;
    creates_frontend_ui: boolean;
    creates_ingestion_jobs: boolean;
  };
  created_at: string;
  derivation_version: string;
}

export interface BuildClaimReadinessSnapshotOptions {
  claimReadinessSnapshotId?: string;
  createdAt?: string;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function stringsOf(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
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

function safeIdPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function privacyIsUnsafe(boundary: any): boolean {
  if (boundary?.aggregate_only !== true) return true;
  return UNSAFE_PRIVACY_FLAGS.some((flag) => boundary?.[flag] === true);
}

function suppressionIsActiveOrUnsafe(suppression: any): boolean {
  return suppression?.default_verdict !== "SUPPRESS" ||
    suppression?.hidden_values_exposed !== false ||
    stringsOf(suppression?.suppressed_lanes).length > 0 ||
    stringsOf(suppression?.reason_codes).length > 0;
}

function layerStatus(snapshot: any, layer: string): string {
  return String(snapshot?.playbook_coverage?.[layer]?.status ?? "");
}

function assumptionEvidenceExplicitlyNotRequired(snapshot: any): boolean {
  const assumptions = snapshot?.playbook_coverage?.assumption_evidence ?? {};
  return assumptions.status === "not_computed" &&
    stringsOf(assumptions.required_approvals).length === 0 &&
    stringsOf(assumptions.caveats).some((caveat) => /not required/i.test(caveat));
}

function kMinThresholdMet(snapshot: any): boolean {
  const summary =
    snapshot?.source_provenance?.k_min_summary ??
    snapshot?.aggregate_telemetry_summary?.k_min_summary;
  if (!summary) return false;
  const totalSlices = Number(summary.total_slices ?? 0);
  const clearSlices = Number(summary.k_min_clear_slices ?? 0);
  const suppressedOrUnknown = Number(summary.suppressed_or_unknown_slices ?? 0);
  const threshold = Number(summary.minimum_cohort_threshold ?? 0);
  return totalSlices > 0 &&
    clearSlices === totalSlices &&
    suppressedOrUnknown === 0 &&
    threshold >= 5;
}

function fullPlaybookCoveragePresent(snapshot: any): boolean {
  return snapshot?.playbook_coverage?.coverage_status === "full_playbook_coverage" &&
    ["present", "partial"].includes(layerStatus(snapshot, "layer_1_platform_telemetry")) &&
    layerStatus(snapshot, "layer_2_user_voice_empirical") === "present" &&
    layerStatus(snapshot, "layer_3_business_system_outcomes") === "present" &&
    layerStatus(snapshot, "governance_evidence") === "present" &&
    (layerStatus(snapshot, "assumption_evidence") === "present" ||
      assumptionEvidenceExplicitlyNotRequired(snapshot)) &&
    kMinThresholdMet(snapshot) &&
    !privacyIsUnsafe(snapshot?.privacy_boundary);
}

function deriveClaimReadinessState(
  evidenceSnapshot: any,
  handoff: ClaimReadinessHandoff
): string {
  if (privacyIsUnsafe(evidenceSnapshot?.privacy_boundary)) {
    return "blocked_for_privacy_or_suppression";
  }
  if (/GOVERNANCE/i.test(String(evidenceSnapshot?.snapshot_readiness_decision ?? ""))) {
    return "held_for_governance";
  }
  if (fullPlaybookCoveragePresent({
    ...evidenceSnapshot,
    source_provenance: handoff.source_provenance
  })) {
    if (
      suppressionIsActiveOrUnsafe(evidenceSnapshot?.suppression) ||
      handoff.executive_readout_boundary?.customer_facing_readout_allowed === true
    ) {
      return "blocked_for_privacy_or_suppression";
    }
    return "ready_for_internal_claim_review";
  }
  return "held_for_full_playbook_coverage";
}

function allowedClaimModesForState(
  state: string,
  handoff: ClaimReadinessHandoff
): string[] {
  if (state === "ready_for_internal_claim_review") {
    const modes = [
      "internal_evidence_review",
      "source_bound_business_outcome_claim_planning"
    ];
    if (handoff.executive_readout_boundary?.executive_readout_allowed === true) {
      modes.push("internal_executive_readout_planning");
    }
    if (
      handoff.financial_boundary?.financial_claim_governance_state ===
        "financial_translation_ready" &&
      handoff.financial_boundary?.financial_translation_allowed === true &&
      handoff.financial_boundary?.roi_claim_allowed === true
    ) {
      modes.push("governed_roi_scenario_review");
    }
    return modes;
  }
  if (state === "blocked_for_privacy_or_suppression") {
    return [];
  }
  return [
    "internal_evidence_review",
    "caveated_internal_playbook_gap_review"
  ];
}

function matchingUpstreamObjects(
  evidenceSnapshot: any,
  handoff: ClaimReadinessHandoff
): boolean {
  return evidenceSnapshot?.evidence_snapshot_id === handoff?.evidence_snapshot_id &&
    evidenceSnapshot?.org_id === handoff?.org_id &&
    evidenceSnapshot?.measurement_plan_id === handoff?.measurement_plan_id &&
    JSON.stringify(evidenceSnapshot?.workflow) === JSON.stringify(handoff?.workflow) &&
    JSON.stringify(evidenceSnapshot?.window) === JSON.stringify(handoff?.window);
}

function isForbiddenKey(key: string): boolean {
  if (GOVERNED_KEY_ALLOWLIST.has(key)) return false;
  return FORBIDDEN_FIELD_KEY_PATTERNS.some((pattern) => pattern.test(key)) ||
    DISALLOWED_COMPUTED_FIELD_PATTERNS.some((pattern) => pattern.test(key));
}

function collectForbiddenFields(value: any, fields: Set<string> = new Set()): Set<string> {
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item) => collectForbiddenFields(item, fields));
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (isForbiddenKey(key)) fields.add(key);
    collectForbiddenFields(nested, fields);
  }
  return fields;
}

export function buildClaimReadinessSnapshotFromEvidenceSnapshotAndHandoff(
  evidenceSnapshot: any,
  handoff: any,
  options: BuildClaimReadinessSnapshotOptions = {}
): ClaimReadinessSnapshot {
  const snapshotResult = validateEvidenceSnapshot(evidenceSnapshot);
  if (!snapshotResult.valid) {
    throw new Error(
      `Evidence Snapshot is invalid and cannot build Claim Readiness Snapshot: ${snapshotResult.gaps.join("; ")}`
    );
  }

  const handoffResult = validateClaimReadinessHandoff(handoff);
  if (!handoffResult.valid) {
    throw new Error(
      `Claim Readiness Handoff is invalid and cannot build Claim Readiness Snapshot: ${handoffResult.gaps.join("; ")}`
    );
  }

  if (!matchingUpstreamObjects(evidenceSnapshot, handoff)) {
    throw new Error(
      "Evidence Snapshot and Claim Readiness Handoff do not match on evidence_snapshot_id, org_id, and measurement_plan_id"
    );
  }

  const claimReadinessState = deriveClaimReadinessState(evidenceSnapshot, handoff);
  return {
    schema_version: AI_VALUE_CLAIM_READINESS_SNAPSHOT_SCHEMA_VERSION,
    claim_readiness_snapshot_id: options.claimReadinessSnapshotId ??
      `claim_readiness_snapshot_${safeIdPart(String(evidenceSnapshot.evidence_snapshot_id))}`,
    evidence_snapshot_id: String(evidenceSnapshot.evidence_snapshot_id),
    handoff_id: String(handoff.handoff_id),
    org_id: String(evidenceSnapshot.org_id),
    measurement_plan_id: String(evidenceSnapshot.measurement_plan_id),
    workflow: deepClone(evidenceSnapshot.workflow),
    window: deepClone(evidenceSnapshot.window),
    snapshot_readiness_decision: String(evidenceSnapshot.snapshot_readiness_decision),
    playbook_coverage: deepClone(evidenceSnapshot.playbook_coverage),
    coverage_status: String(evidenceSnapshot.playbook_coverage?.coverage_status ?? ""),
    claim_readiness_state: claimReadinessState,
    allowed_claim_modes: allowedClaimModesForState(claimReadinessState, handoff),
    blocked_uses: stringsOf(handoff.blocked_uses),
    blocked_claims: stringsOf(handoff.blocked_claims),
    unmapped_blocked_uses: stringsOf(handoff.unmapped_blocked_uses),
    required_caveats: stringsOf(handoff.required_caveats),
    suppression: deepClone(evidenceSnapshot.suppression),
    privacy_boundary: deepClone(evidenceSnapshot.privacy_boundary),
    aggregate_workforce_context: deepClone(evidenceSnapshot.aggregate_workforce_context),
    vbd_operating_map: deepClone(evidenceSnapshot.vbd_operating_map),
    financial_boundary: deepClone(handoff.financial_boundary),
    executive_readout_boundary: deepClone(handoff.executive_readout_boundary),
    source_refs: deepClone(evidenceSnapshot.source_refs),
    source_provenance: deepClone(handoff.source_provenance),
    derived_from: {
      evidence_snapshot_id: String(evidenceSnapshot.evidence_snapshot_id),
      evidence_snapshot_schema_version: EVIDENCE_SNAPSHOT_SCHEMA_VERSION,
      evidence_snapshot_derivation_version: String(evidenceSnapshot.derivation_version),
      handoff_id: String(handoff.handoff_id),
      handoff_schema_version: AI_VALUE_CLAIM_READINESS_HANDOFF_SCHEMA_VERSION,
      handoff_derivation_version: String(handoff.derivation_version),
      builder: DERIVATION_VERSION
    },
    validation: {
      evidence_snapshot_validated: true,
      claim_readiness_handoff_validated: true,
      source_binding_validated: true
    },
    persistence_policy: {
      backend_persistence_allowed: true,
      persisted: false,
      creates_migrations: false,
      creates_prisma_schema: false,
      creates_backend_routes: false,
      creates_frontend_ui: false,
      creates_ingestion_jobs: false
    },
    created_at: options.createdAt ?? new Date().toISOString(),
    derivation_version: DERIVATION_VERSION
  };
}

function collectTopLevelGaps(snapshot: any): string[] {
  const gaps: string[] = [];
  for (const field of REQUIRED_FIELDS) {
    requireField(snapshot?.[field], field, gaps);
  }
  if (
    snapshot?.schema_version &&
    snapshot.schema_version !== AI_VALUE_CLAIM_READINESS_SNAPSHOT_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${snapshot.schema_version}`);
  }
  if (
    snapshot?.claim_readiness_state &&
    !ALLOWED_CLAIM_READINESS_STATES.has(snapshot.claim_readiness_state)
  ) {
    gaps.push(`claim_readiness_state is invalid: ${snapshot.claim_readiness_state}`);
  }
  requireArray(snapshot?.allowed_claim_modes, "allowed_claim_modes", gaps);
  requireArray(snapshot?.blocked_uses, "blocked_uses", gaps);
  requireArray(snapshot?.blocked_claims, "blocked_claims", gaps);
  requireArray(snapshot?.unmapped_blocked_uses, "unmapped_blocked_uses", gaps);
  requireArray(snapshot?.required_caveats, "required_caveats", gaps);
  if (
    snapshot?.coverage_status &&
    snapshot.coverage_status !== snapshot?.playbook_coverage?.coverage_status
  ) {
    gaps.push("coverage_status must match playbook_coverage.coverage_status");
  }
  return gaps;
}

function collectDerivationGaps(snapshot: any): string[] {
  const gaps: string[] = [];
  const derived = snapshot?.derived_from ?? {};
  if (derived.evidence_snapshot_id !== snapshot?.evidence_snapshot_id) {
    gaps.push("derived_from.evidence_snapshot_id must match evidence_snapshot_id");
  }
  if (derived.handoff_id !== snapshot?.handoff_id) {
    gaps.push("derived_from.handoff_id must match handoff_id");
  }
  if (derived.evidence_snapshot_schema_version !== EVIDENCE_SNAPSHOT_SCHEMA_VERSION) {
    gaps.push("derived_from.evidence_snapshot_schema_version must match Evidence Snapshot schema version");
  }
  if (derived.handoff_schema_version !== AI_VALUE_CLAIM_READINESS_HANDOFF_SCHEMA_VERSION) {
    gaps.push("derived_from.handoff_schema_version must match Claim Readiness Handoff schema version");
  }
  if (derived.builder !== DERIVATION_VERSION) {
    gaps.push("derived_from.builder must identify the governed Claim Readiness Snapshot builder");
  }
  requireField(
    derived.evidence_snapshot_derivation_version,
    "derived_from.evidence_snapshot_derivation_version",
    gaps
  );
  requireField(derived.handoff_derivation_version, "derived_from.handoff_derivation_version", gaps);
  return gaps;
}

function collectValidationGaps(snapshot: any): string[] {
  const gaps: string[] = [];
  requireBoolean(
    snapshot?.validation?.evidence_snapshot_validated,
    true,
    "validation.evidence_snapshot_validated",
    gaps
  );
  requireBoolean(
    snapshot?.validation?.claim_readiness_handoff_validated,
    true,
    "validation.claim_readiness_handoff_validated",
    gaps
  );
  requireBoolean(
    snapshot?.validation?.source_binding_validated,
    true,
    "validation.source_binding_validated",
    gaps
  );
  return gaps;
}

function collectClaimBoundaryGaps(snapshot: any): string[] {
  const gaps: string[] = [];
  const blockedClaims = stringsOf(snapshot?.blocked_claims).map(normalizeToken);
  const blockedUses = stringsOf(snapshot?.blocked_uses).map(normalizeToken);
  const financialTranslationReady =
    snapshot?.financial_boundary?.financial_claim_governance_state ===
      "financial_translation_ready" &&
    snapshot?.financial_boundary?.financial_translation_allowed === true &&
    snapshot?.financial_boundary?.roi_claim_allowed === true;
  const requiredBlockedClaims = financialTranslationReady
    ? REQUIRED_IMMUTABLE_BLOCKED_CLAIMS
    : REQUIRED_TELEMETRY_BLOCKED_CLAIMS;
  for (const claim of requiredBlockedClaims) {
    if (!blockedClaims.includes(claim)) {
      gaps.push(`blocked_claims missing ${claim}`);
    }
  }
  if (
    financialTranslationReady &&
    (FINANCIAL_TRANSLATION_BLOCKED_CLAIMS.some((claim) => blockedClaims.includes(claim)) ||
      FINANCIAL_TRANSLATION_BLOCKED_USES.some((use) => blockedUses.includes(use)))
  ) {
    gaps.push("ROI blockers must be removed before governed ROI scenario review or financial translation is allowed");
  }

  for (const mode of stringsOf(snapshot?.allowed_claim_modes)) {
    if (!ALLOWED_CLAIM_MODES.has(mode)) {
      gaps.push(`allowed_claim_modes contains unsupported mode ${mode}`);
    }
    if (
      mode === "governed_roi_scenario_review" &&
      !financialTranslationReady
    ) {
      gaps.push("governed_roi_scenario_review requires financial_translation_ready handoff boundary");
    }
    if (
      mode !== "governed_roi_scenario_review" &&
      /customer_facing|financial|roi|ebita|productivity|causality/i.test(mode)
    ) {
      gaps.push(`allowed_claim_modes contains blocked claim mode ${mode}`);
    }
  }

  if (
    snapshot?.playbook_coverage?.coverage_status !== "full_playbook_coverage" &&
    snapshot?.claim_readiness_state !== "held_for_full_playbook_coverage"
  ) {
    gaps.push("non-full Playbook coverage must remain held_for_full_playbook_coverage");
  }
  if (
    snapshot?.playbook_coverage?.coverage_status === "full_playbook_coverage" &&
    !fullPlaybookCoveragePresent(snapshot)
  ) {
    gaps.push("full_playbook_coverage requires Layer 1, Layer 2, Layer 3, governance, assumptions or explicit not-required status, k-min, and safe privacy");
  }
  if (
    snapshot?.playbook_coverage?.coverage_status === "full_playbook_coverage" &&
    stringsOf(snapshot?.source_refs?.outcome_evidence_ids).length === 0
  ) {
    gaps.push("BigQuery source availability alone cannot validate as full_playbook_coverage");
  }
  if (
    snapshot?.playbook_coverage?.coverage_status === "full_playbook_coverage" &&
    fullPlaybookCoveragePresent(snapshot) &&
    !suppressionIsActiveOrUnsafe(snapshot?.suppression) &&
    snapshot?.claim_readiness_state !== "ready_for_internal_claim_review"
  ) {
    gaps.push("full_playbook_coverage with safe posture must be ready_for_internal_claim_review");
  }
  const requiredBlockedUses = financialTranslationReady
    ? REQUIRED_IMMUTABLE_BLOCKED_USES
    : REQUIRED_TELEMETRY_BLOCKED_USES;
  for (const use of requiredBlockedUses) {
    if (!stringsOf(snapshot?.blocked_uses).map(normalizeToken).includes(use)) {
      gaps.push(`blocked_uses missing ${use}`);
    }
  }
  return gaps;
}

function caveatsFromObject(value: any): string[] {
  const caveats: string[] = [];
  if (!value || typeof value !== "object") return caveats;
  if (Array.isArray(value)) {
    return value.flatMap((item) => caveatsFromObject(item));
  }
  for (const [key, nested] of Object.entries(value)) {
    if (key === "caveats" || key === "provenance_caveats") {
      caveats.push(...stringsOf(nested));
    } else if (nested && typeof nested === "object") {
      caveats.push(...caveatsFromObject(nested));
    }
  }
  return caveats;
}

function collectCaveatGaps(snapshot: any): string[] {
  const gaps: string[] = [];
  const caveats = stringsOf(snapshot?.required_caveats);
  const boundaryCaveats = stringsOf(
    snapshot?.executive_readout_boundary?.required_caveats
  );
  const nestedCaveats = [
    ...caveatsFromObject(snapshot?.playbook_coverage),
    ...caveatsFromObject(snapshot?.aggregate_workforce_context),
    ...caveatsFromObject(snapshot?.vbd_operating_map),
    ...caveatsFromObject(snapshot?.source_provenance)
  ];
  for (const caveat of nestedCaveats) {
    if (!caveats.includes(caveat)) {
      gaps.push("required_caveats must include every carried-forward evidence caveat");
      break;
    }
  }
  for (const caveat of caveats) {
    if (!boundaryCaveats.includes(caveat)) {
      gaps.push("executive_readout_boundary.required_caveats must include every required caveat");
      break;
    }
  }
  const hasIncompleteCoverage = [
    "layer_1_platform_telemetry",
    "layer_2_user_voice_empirical",
    "layer_3_business_system_outcomes",
    "governance_evidence",
    "assumption_evidence"
  ].some((layer) =>
    ["missing", "held", "suppressed", "not_computed", "partial"].includes(layerStatus(snapshot, layer))
  );
  const hasSuppressedHeldOrMissing =
    stringsOf(snapshot?.suppression?.held_lanes).length > 0 ||
    stringsOf(snapshot?.suppression?.missing_lanes).length > 0 ||
    stringsOf(snapshot?.suppression?.suppressed_lanes).length > 0;
  if (
    (hasIncompleteCoverage || hasSuppressedHeldOrMissing) &&
    !caveats.some((caveat) => /missing|held|suppressed|not computed|not_computed|partial/i.test(caveat))
  ) {
    gaps.push("required_caveats must carry forward missing, held, suppressed, not computed, or partial evidence caveats");
  }
  return gaps;
}

function collectFinancialBoundaryGaps(snapshot: any): string[] {
  const gaps: string[] = [];
  const boundary = snapshot?.financial_boundary ?? {};
  if (
    boundary.financial_claim_governance_state &&
    !FINANCIAL_CLAIM_GOVERNANCE_STATES.has(boundary.financial_claim_governance_state)
  ) {
    gaps.push(
      `financial_boundary.financial_claim_governance_state is invalid: ${boundary.financial_claim_governance_state}`
    );
  }
  requireField(
    boundary.financial_claim_governance_state,
    "financial_boundary.financial_claim_governance_state",
    gaps
  );
  for (const flag of [
    "financial_translation_allowed",
    "roi_claim_allowed",
    "ebita_claim_allowed",
    "customer_facing_financial_output_allowed"
  ]) {
    if (typeof boundary[flag] !== "boolean") {
      gaps.push(`financial_boundary.${flag} must be boolean`);
    }
  }
  const financialTranslationRequested =
    boundary.financial_claim_governance_state === "financial_translation_ready" ||
    boundary.financial_translation_allowed === true ||
    boundary.roi_claim_allowed === true;
  const roiBlockersPresent =
    FINANCIAL_TRANSLATION_BLOCKED_CLAIMS.some((claim) =>
      stringsOf(snapshot?.blocked_claims).map(normalizeToken).includes(claim)
    ) ||
    FINANCIAL_TRANSLATION_BLOCKED_USES.some((use) =>
      stringsOf(snapshot?.blocked_uses).map(normalizeToken).includes(use)
    );
  const approvalCaveated = financeOrBusinessApprovalCaveated(snapshot);
  if (financialTranslationRequested) {
    const mayAllowFinancialTranslation =
      snapshot?.claim_readiness_state === "ready_for_internal_claim_review" &&
      snapshot?.playbook_coverage?.coverage_status === "full_playbook_coverage" &&
      fullPlaybookCoveragePresent(snapshot) &&
      !suppressionIsActiveOrUnsafe(snapshot?.suppression) &&
      !approvalCaveated;
    if (!mayAllowFinancialTranslation) {
      gaps.push("financial_boundary financial translation requires ready internal claim review, full Playbook coverage, safe privacy, k-min, and clear suppression");
    }
    if (approvalCaveated) {
      gaps.push("Finance or business-owner approval is missing, held, or caveated.");
    }
    if (roiBlockersPresent) {
      gaps.push("financial_boundary financial translation requires ROI blockers to be absent");
    }
    if (boundary.financial_claim_governance_state !== "financial_translation_ready") {
      gaps.push("financial_boundary.financial_claim_governance_state must be financial_translation_ready");
    }
    if (boundary.financial_translation_allowed !== true) {
      gaps.push("financial_boundary.financial_translation_allowed must be true");
    }
    if (boundary.roi_claim_allowed !== true) {
      gaps.push("financial_boundary.roi_claim_allowed must be true");
    }
  } else {
    for (const flag of [
      "financial_translation_allowed",
      "roi_claim_allowed",
      "ebita_claim_allowed",
      "customer_facing_financial_output_allowed"
    ]) {
      if (boundary[flag] !== false) {
        gaps.push(`financial_boundary.${flag} must be false`);
      }
    }
    if (boundary.financial_claim_governance_state === "financial_translation_ready") {
      gaps.push("financial_boundary.financial_claim_governance_state must not be financial_translation_ready");
    }
  }
  if (boundary.ebita_claim_allowed !== false) {
    gaps.push("financial_boundary.ebita_claim_allowed must be false");
  }
  if (boundary.customer_facing_financial_output_allowed !== false) {
    gaps.push("financial_boundary.customer_facing_financial_output_allowed must be false");
  }
  requireArray(boundary.reasons, "financial_boundary.reasons", gaps);
  return gaps;
}

function collectExecutiveBoundaryGaps(snapshot: any): string[] {
  const gaps: string[] = [];
  const boundary = snapshot?.executive_readout_boundary ?? {};
  for (const flag of [
    "executive_readout_allowed",
    "customer_facing_readout_allowed",
    "internal_only_readout_allowed"
  ]) {
    if (typeof boundary[flag] !== "boolean") {
      gaps.push(`executive_readout_boundary.${flag} must be boolean`);
    }
  }
  if (boundary.customer_facing_readout_allowed !== false) {
    gaps.push("executive_readout_boundary.customer_facing_readout_allowed must be false");
  }
  for (const field of [
    "required_sections",
    "required_caveats",
    "blocked_sections",
    "reasons"
  ]) {
    requireArray(boundary[field], `executive_readout_boundary.${field}`, gaps);
  }
  const boundaryCaveats = stringsOf(boundary.required_caveats);
  for (const caveat of stringsOf(snapshot?.required_caveats)) {
    if (!boundaryCaveats.includes(caveat)) {
      gaps.push("executive_readout_boundary.required_caveats must include every required caveat");
      break;
    }
  }
  return gaps;
}

function collectPrivacyAndSuppressionGaps(snapshot: any): string[] {
  const gaps: string[] = [];
  const boundary = snapshot?.privacy_boundary ?? {};
  requireBoolean(boundary.aggregate_only, true, "privacy_boundary.aggregate_only", gaps);
  for (const flag of UNSAFE_PRIVACY_FLAGS) {
    requireBoolean(boundary[flag], false, `privacy_boundary.${flag}`, gaps);
  }
  if (
    privacyIsUnsafe(boundary) &&
    snapshot?.claim_readiness_state !== "blocked_for_privacy_or_suppression"
  ) {
    gaps.push("unsafe privacy posture must block claim readiness");
  }
  if (
    suppressionIsActiveOrUnsafe(snapshot?.suppression) &&
    snapshot?.executive_readout_boundary?.customer_facing_readout_allowed !== false
  ) {
    gaps.push("suppression active or fail-closed posture must block customer-facing readout");
  }
  if (
    suppressionIsActiveOrUnsafe(snapshot?.suppression) &&
    snapshot?.claim_readiness_state === "ready_for_internal_claim_review"
  ) {
    gaps.push("suppression active or fail-closed posture must block claim readiness");
  }
  return gaps;
}

function collectPersistencePolicyGaps(snapshot: any): string[] {
  const gaps: string[] = [];
  const policy = snapshot?.persistence_policy ?? {};
  for (const flag of [
    "persisted",
    "creates_migrations",
    "creates_prisma_schema",
    "creates_backend_routes",
    "creates_frontend_ui",
    "creates_ingestion_jobs"
  ]) {
    requireBoolean(policy[flag], false, `persistence_policy.${flag}`, gaps);
  }
  return gaps;
}

function collectSourceProvenanceGaps(snapshot: any): string[] {
  const gaps: string[] = [];
  const provenance = snapshot?.source_provenance ?? {};
  if (provenance.evidence_snapshot_schema_version !== EVIDENCE_SNAPSHOT_SCHEMA_VERSION) {
    gaps.push("source_provenance.evidence_snapshot_schema_version must match Evidence Snapshot schema version");
  }
  requireField(provenance.evidence_snapshot_derivation_version, "source_provenance.evidence_snapshot_derivation_version", gaps);
  requireField(provenance.source_refs, "source_provenance.source_refs", gaps);
  requireField(provenance.window, "source_provenance.window", gaps);
  requireArray(provenance.provenance_caveats, "source_provenance.provenance_caveats", gaps);
  if (
    JSON.stringify(provenance.source_refs ?? {}) !==
    JSON.stringify(snapshot?.source_refs ?? {})
  ) {
    gaps.push("source_provenance.source_refs must match source_refs");
  }
  if (
    JSON.stringify(provenance.window ?? {}) !==
    JSON.stringify(snapshot?.window ?? {})
  ) {
    gaps.push("source_provenance.window must match window");
  }
  return gaps;
}

function collectForbiddenFieldGaps(snapshot: any): string[] {
  const forbidden = Array.from(collectForbiddenFields(snapshot)).sort();
  return forbidden.length > 0
    ? [`Forbidden field(s) present: ${forbidden.join(", ")}`]
    : [];
}

export function validateClaimReadinessSnapshot(
  snapshot: any
): ClaimReadinessSnapshotValidationResult {
  const gaps = [
    ...collectTopLevelGaps(snapshot),
    ...collectDerivationGaps(snapshot),
    ...collectValidationGaps(snapshot),
    ...collectClaimBoundaryGaps(snapshot),
    ...collectCaveatGaps(snapshot),
    ...collectFinancialBoundaryGaps(snapshot),
    ...collectExecutiveBoundaryGaps(snapshot),
    ...collectPrivacyAndSuppressionGaps(snapshot),
    ...collectPersistencePolicyGaps(snapshot),
    ...collectSourceProvenanceGaps(snapshot),
    ...collectForbiddenFieldGaps(snapshot)
  ];
  const valid = gaps.length === 0;

  return {
    schema_version: RESULT_SCHEMA_VERSION,
    claim_readiness_snapshot_id: snapshot?.claim_readiness_snapshot_id ?? null,
    evidence_snapshot_id: snapshot?.evidence_snapshot_id ?? null,
    handoff_id: snapshot?.handoff_id ?? null,
    valid,
    gaps,
    feeds: {
      claim_readiness_snapshot: valid,
      claim_review_context: valid &&
        snapshot?.claim_readiness_state === "ready_for_internal_claim_review",
      executive_readout_snapshot: false,
      customer_facing_financial_output: false
    }
  };
}
