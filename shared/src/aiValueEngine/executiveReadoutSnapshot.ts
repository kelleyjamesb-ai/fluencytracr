/**
 * AI Value Engine - Executive Readout Snapshot.
 *
 * Backend-persistable, internal-only presentation posture derived from a
 * validated Claim Readiness Snapshot. It carries source binding, caveats, and
 * blocked claims forward; it does not render a customer-facing readout or
 * calculate ROI, EBITA, productivity, causality, or customer-facing economics.
 */

import {
  AI_VALUE_CLAIM_READINESS_SNAPSHOT_SCHEMA_VERSION,
  type ClaimReadinessSnapshot,
  validateClaimReadinessSnapshot
} from "./claimReadinessSnapshot";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_EXECUTIVE_READOUT_SNAPSHOT_VALIDATION_2026_06";

export const AI_VALUE_EXECUTIVE_READOUT_SNAPSHOT_SCHEMA_VERSION =
  "FT_AI_VALUE_EXECUTIVE_READOUT_SNAPSHOT_2026_06";

const DERIVATION_VERSION =
  "ai_value_executive_readout_snapshot_builder_2026_06";

const REQUIRED_FIELDS = [
  "schema_version",
  "executive_readout_snapshot_id",
  "org_id",
  "measurement_plan_id",
  "evidence_snapshot_id",
  "handoff_id",
  "claim_readiness_handoff_id",
  "claim_readiness_snapshot_id",
  "workflow",
  "window",
  "readout_audience",
  "readout_state",
  "playbook_coverage",
  "coverage_status",
  "evidence_gaps",
  "required_caveats",
  "blocked_uses",
  "blocked_claims",
  "unmapped_blocked_uses",
  "allowed_sections",
  "blocked_sections",
  "financial_boundary",
  "executive_readout_boundary",
  "vbd_boundary",
  "aggregate_workforce_context_boundary",
  "suppression",
  "privacy_boundary",
  "source_refs",
  "source_provenance",
  "derived_from",
  "validation",
  "persistence_policy",
  "created_at",
  "derivation_version"
] as const;

const ALLOWED_READOUT_STATES = new Set([
  "blocked_for_missing_claim_readiness_snapshot",
  "held_for_full_playbook_coverage",
  "internal_only_claim_review_ready",
  "internal_only_readout_ready",
  "blocked_for_privacy_or_suppression",
  "blocked_for_customer_facing_financial_output"
]);

const ALLOWED_SECTIONS = [
  "evidence_chain_summary",
  "playbook_coverage",
  "evidence_gaps",
  "required_caveats",
  "blocked_claims",
  "source_refs",
  "suppression_and_privacy_posture",
  "vbd_context",
  "aggregate_workforce_context",
  "next_evidence_actions"
];

const IMMUTABLE_BLOCKED_CLAIMS = [
  "ebita_claim",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_scoring",
  "team_or_manager_ranking",
  "people_decisioning",
  "customer_facing_economic_output"
];

const IMMUTABLE_BLOCKED_USES = [
  "ebita_claim",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "people_decisioning",
  "customer_facing_financial_output"
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

export const ExecutiveReadoutSnapshotSchema = {
  schema_version: AI_VALUE_EXECUTIVE_READOUT_SNAPSHOT_SCHEMA_VERSION,
  required_fields: REQUIRED_FIELDS,
  allowed_readout_states: [...ALLOWED_READOUT_STATES],
  allowed_sections: ALLOWED_SECTIONS,
  persistence_policy: {
    backend_persistence_allowed: true,
    persisted: false,
    creates_backend_routes: false,
    creates_frontend_ui: false,
    creates_ingestion_jobs: false,
    customer_facing_readout_allowed: false,
    customer_facing_financial_output_allowed: false
  }
} as const;

export interface ExecutiveReadoutSnapshotValidationResult {
  schema_version: string;
  executive_readout_snapshot_id: string | null;
  claim_readiness_snapshot_id: string | null;
  evidence_snapshot_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    executive_readout_snapshot: boolean;
    internal_executive_readout_context: boolean;
    customer_facing_readout: boolean;
    customer_facing_financial_output: boolean;
  };
}

export interface ExecutiveReadoutSnapshot {
  schema_version: string;
  executive_readout_snapshot_id: string;
  org_id: string;
  measurement_plan_id: string;
  evidence_snapshot_id: string;
  handoff_id: string;
  claim_readiness_handoff_id: string;
  claim_readiness_snapshot_id: string;
  workflow: any;
  window: any;
  readout_audience: string;
  readout_state: string;
  playbook_coverage: any;
  coverage_status: string;
  evidence_gaps: string[];
  required_caveats: string[];
  blocked_uses: string[];
  blocked_claims: string[];
  unmapped_blocked_uses: string[];
  allowed_sections: string[];
  blocked_sections: string[];
  financial_boundary: ClaimReadinessSnapshot["financial_boundary"];
  executive_readout_boundary: ClaimReadinessSnapshot["executive_readout_boundary"];
  vbd_boundary: any;
  aggregate_workforce_context_boundary: any;
  suppression: any;
  privacy_boundary: any;
  source_refs: any;
  source_provenance: any;
  derived_from: {
    claim_readiness_snapshot_id: string;
    claim_readiness_snapshot_schema_version: string;
    claim_readiness_snapshot_derivation_version: string;
    evidence_snapshot_id: string;
    handoff_id: string;
    builder: string;
  };
  validation: {
    claim_readiness_snapshot_validated: boolean;
    source_binding_validated: boolean;
    caveats_carried_forward: boolean;
    blocked_claims_carried_forward: boolean;
  };
  persistence_policy: {
    backend_persistence_allowed: boolean;
    persisted: boolean;
    creates_backend_routes: boolean;
    creates_frontend_ui: boolean;
    creates_ingestion_jobs: boolean;
    customer_facing_readout_allowed: boolean;
    customer_facing_financial_output_allowed: boolean;
  };
  created_at: string;
  derivation_version: string;
}

export interface BuildExecutiveReadoutSnapshotOptions {
  executiveReadoutSnapshotId?: string;
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

function safeIdPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
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

function suppressionBlocksReadout(suppression: any): boolean {
  return suppression?.default_verdict !== "SUPPRESS" ||
    suppression?.hidden_values_exposed !== false ||
    stringsOf(suppression?.suppressed_lanes).length > 0;
}

function privacyIsUnsafe(boundary: any): boolean {
  if (boundary?.aggregate_only !== true) return true;
  return UNSAFE_PRIVACY_FLAGS.some((flag) => boundary?.[flag] === true);
}

function deriveEvidenceGaps(snapshot: ClaimReadinessSnapshot): string[] {
  const gaps = stringsOf(snapshot.required_caveats).filter((caveat) =>
    /missing|held|suppressed|not computed|not_computed|partial|Layer 2|Layer 3|governance|assumption/i.test(caveat)
  );
  if (gaps.length > 0) return uniqueStrings(gaps);
  if (snapshot.coverage_status !== "full_playbook_coverage") {
    return ["Full Playbook coverage is not present; missing or held evidence must remain caveated."];
  }
  return [];
}

function deriveReadoutState(snapshot: ClaimReadinessSnapshot): string {
  if (privacyIsUnsafe(snapshot.privacy_boundary) || suppressionBlocksReadout(snapshot.suppression)) {
    return "blocked_for_privacy_or_suppression";
  }
  if (
    snapshot.financial_boundary?.customer_facing_financial_output_allowed === true ||
    snapshot.executive_readout_boundary?.customer_facing_readout_allowed === true
  ) {
    return "blocked_for_customer_facing_financial_output";
  }
  if (snapshot.coverage_status !== "full_playbook_coverage") {
    return "held_for_full_playbook_coverage";
  }
  if (
    snapshot.claim_readiness_state === "ready_for_internal_claim_review" &&
    snapshot.executive_readout_boundary?.executive_readout_allowed === true &&
    snapshot.executive_readout_boundary?.internal_only_readout_allowed === true
  ) {
    return "internal_only_readout_ready";
  }
  if (snapshot.claim_readiness_state === "ready_for_internal_claim_review") {
    return "internal_only_claim_review_ready";
  }
  return "held_for_full_playbook_coverage";
}

export function buildExecutiveReadoutSnapshotFromClaimReadinessSnapshot(
  claimReadinessSnapshot: any,
  options: BuildExecutiveReadoutSnapshotOptions = {}
): ExecutiveReadoutSnapshot {
  const claimValidation = validateClaimReadinessSnapshot(claimReadinessSnapshot);
  if (!claimValidation.valid) {
    throw new Error(
      `Claim Readiness Snapshot is invalid and cannot build Executive Readout Snapshot: ${claimValidation.gaps.join("; ")}`
    );
  }

  const snapshot = claimReadinessSnapshot as ClaimReadinessSnapshot;
  const blockedSections = uniqueStrings([
    ...stringsOf(snapshot.executive_readout_boundary?.blocked_sections),
    "roi_proof",
    "ebita_claim",
    "causality_claim",
    "productivity_claim",
    "headcount_reduction_claim",
    "individual_attribution",
    "manager_or_team_ranking",
    "people_decisioning",
    "customer_facing_financial_output",
    "customer_facing_economic_output"
  ]);

  return {
    schema_version: AI_VALUE_EXECUTIVE_READOUT_SNAPSHOT_SCHEMA_VERSION,
    executive_readout_snapshot_id: options.executiveReadoutSnapshotId ??
      `executive_readout_snapshot_${safeIdPart(String(snapshot.claim_readiness_snapshot_id))}`,
    org_id: String(snapshot.org_id),
    measurement_plan_id: String(snapshot.measurement_plan_id),
    evidence_snapshot_id: String(snapshot.evidence_snapshot_id),
    handoff_id: String(snapshot.handoff_id),
    claim_readiness_handoff_id: String(snapshot.handoff_id),
    claim_readiness_snapshot_id: String(snapshot.claim_readiness_snapshot_id),
    workflow: deepClone(snapshot.workflow),
    window: deepClone(snapshot.window),
    readout_audience: "internal_value_review",
    readout_state: deriveReadoutState(snapshot),
    playbook_coverage: deepClone(snapshot.playbook_coverage),
    coverage_status: String(snapshot.coverage_status),
    evidence_gaps: deriveEvidenceGaps(snapshot),
    required_caveats: stringsOf(snapshot.required_caveats),
    blocked_uses: stringsOf(snapshot.blocked_uses),
    blocked_claims: stringsOf(snapshot.blocked_claims),
    unmapped_blocked_uses: stringsOf(snapshot.unmapped_blocked_uses),
    allowed_sections: [...ALLOWED_SECTIONS],
    blocked_sections: blockedSections,
    financial_boundary: deepClone(snapshot.financial_boundary),
    executive_readout_boundary: deepClone(snapshot.executive_readout_boundary),
    vbd_boundary: {
      context_role: "layer_1_context_only",
      can_upgrade_coverage: false,
      can_authorize_financial_claims: false,
      vbd_operating_map: deepClone(snapshot.vbd_operating_map)
    },
    aggregate_workforce_context_boundary: {
      context_role: "aggregate_cohort_safe_context_only",
      can_upgrade_coverage: false,
      can_authorize_people_decisioning: false,
      can_authorize_financial_claims: false,
      aggregate_workforce_context: deepClone(snapshot.aggregate_workforce_context)
    },
    suppression: deepClone(snapshot.suppression),
    privacy_boundary: deepClone(snapshot.privacy_boundary),
    source_refs: deepClone(snapshot.source_refs),
    source_provenance: deepClone(snapshot.source_provenance),
    derived_from: {
      claim_readiness_snapshot_id: String(snapshot.claim_readiness_snapshot_id),
      claim_readiness_snapshot_schema_version:
        AI_VALUE_CLAIM_READINESS_SNAPSHOT_SCHEMA_VERSION,
      claim_readiness_snapshot_derivation_version: String(snapshot.derivation_version),
      evidence_snapshot_id: String(snapshot.evidence_snapshot_id),
      handoff_id: String(snapshot.handoff_id),
      builder: DERIVATION_VERSION
    },
    validation: {
      claim_readiness_snapshot_validated: true,
      source_binding_validated: true,
      caveats_carried_forward: true,
      blocked_claims_carried_forward: true
    },
    persistence_policy: {
      backend_persistence_allowed: true,
      persisted: false,
      creates_backend_routes: false,
      creates_frontend_ui: false,
      creates_ingestion_jobs: false,
      customer_facing_readout_allowed: false,
      customer_facing_financial_output_allowed: false
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
    snapshot.schema_version !== AI_VALUE_EXECUTIVE_READOUT_SNAPSHOT_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${snapshot.schema_version}`);
  }
  if (snapshot?.readout_state && !ALLOWED_READOUT_STATES.has(snapshot.readout_state)) {
    gaps.push(`readout_state is invalid: ${snapshot.readout_state}`);
  }
  if (
    snapshot?.coverage_status &&
    snapshot.coverage_status !== snapshot?.playbook_coverage?.coverage_status
  ) {
    gaps.push("coverage_status must match playbook_coverage.coverage_status");
  }
  for (const field of [
    "evidence_gaps",
    "required_caveats",
    "blocked_uses",
    "blocked_claims",
    "unmapped_blocked_uses",
    "allowed_sections",
    "blocked_sections"
  ]) {
    requireArray(snapshot?.[field], field, gaps);
  }
  return gaps;
}

function collectBoundaryGaps(snapshot: any): string[] {
  const gaps: string[] = [];
  const blockedClaims = stringsOf(snapshot?.blocked_claims).map(normalizeToken);
  const blockedUses = stringsOf(snapshot?.blocked_uses).map(normalizeToken);
  for (const claim of IMMUTABLE_BLOCKED_CLAIMS) {
    if (!blockedClaims.includes(claim)) {
      gaps.push(`blocked_claims missing ${claim}`);
    }
  }
  for (const use of IMMUTABLE_BLOCKED_USES) {
    if (!blockedUses.includes(use)) {
      gaps.push(`blocked_uses missing ${use}`);
    }
  }
  if (snapshot?.coverage_status !== "full_playbook_coverage") {
    if (!blockedClaims.includes("roi_proof")) {
      gaps.push("blocked_claims missing roi_proof");
    }
    if (!blockedUses.includes("realized_roi")) {
      gaps.push("blocked_uses missing realized_roi");
    }
  }
  requireBoolean(
    snapshot?.financial_boundary?.ebita_claim_allowed,
    false,
    "financial_boundary.ebita_claim_allowed",
    gaps
  );
  requireBoolean(
    snapshot?.financial_boundary?.customer_facing_financial_output_allowed,
    false,
    "financial_boundary.customer_facing_financial_output_allowed",
    gaps
  );
  requireBoolean(
    snapshot?.executive_readout_boundary?.customer_facing_readout_allowed,
    false,
    "executive_readout_boundary.customer_facing_readout_allowed",
    gaps
  );
  requireBoolean(
    snapshot?.persistence_policy?.creates_backend_routes,
    false,
    "persistence_policy.creates_backend_routes",
    gaps
  );
  requireBoolean(
    snapshot?.persistence_policy?.creates_frontend_ui,
    false,
    "persistence_policy.creates_frontend_ui",
    gaps
  );
  requireBoolean(
    snapshot?.persistence_policy?.creates_ingestion_jobs,
    false,
    "persistence_policy.creates_ingestion_jobs",
    gaps
  );
  requireBoolean(
    snapshot?.persistence_policy?.customer_facing_readout_allowed,
    false,
    "persistence_policy.customer_facing_readout_allowed",
    gaps
  );
  requireBoolean(
    snapshot?.persistence_policy?.customer_facing_financial_output_allowed,
    false,
    "persistence_policy.customer_facing_financial_output_allowed",
    gaps
  );
  requireBoolean(
    snapshot?.vbd_boundary?.can_upgrade_coverage,
    false,
    "vbd_boundary.can_upgrade_coverage",
    gaps
  );
  requireBoolean(
    snapshot?.vbd_boundary?.can_authorize_financial_claims,
    false,
    "vbd_boundary.can_authorize_financial_claims",
    gaps
  );
  requireBoolean(
    snapshot?.aggregate_workforce_context_boundary?.can_upgrade_coverage,
    false,
    "aggregate_workforce_context_boundary.can_upgrade_coverage",
    gaps
  );
  requireBoolean(
    snapshot?.aggregate_workforce_context_boundary?.can_authorize_people_decisioning,
    false,
    "aggregate_workforce_context_boundary.can_authorize_people_decisioning",
    gaps
  );
  requireBoolean(
    snapshot?.aggregate_workforce_context_boundary?.can_authorize_financial_claims,
    false,
    "aggregate_workforce_context_boundary.can_authorize_financial_claims",
    gaps
  );
  return gaps;
}

function collectPrivacyAndSuppressionGaps(snapshot: any): string[] {
  const gaps: string[] = [];
  requireBoolean(snapshot?.privacy_boundary?.aggregate_only, true, "privacy_boundary.aggregate_only", gaps);
  for (const flag of UNSAFE_PRIVACY_FLAGS) {
    requireBoolean(snapshot?.privacy_boundary?.[flag], false, `privacy_boundary.${flag}`, gaps);
  }
  if (
    (privacyIsUnsafe(snapshot?.privacy_boundary) ||
      suppressionBlocksReadout(snapshot?.suppression)) &&
    snapshot?.readout_state !== "blocked_for_privacy_or_suppression"
  ) {
    gaps.push("unsafe privacy or suppression must block executive readout snapshot");
  }
  return gaps;
}

function collectDerivationGaps(snapshot: any): string[] {
  const gaps: string[] = [];
  const derived = snapshot?.derived_from ?? {};
  if (derived.claim_readiness_snapshot_id !== snapshot?.claim_readiness_snapshot_id) {
    gaps.push("derived_from.claim_readiness_snapshot_id must match claim_readiness_snapshot_id");
  }
  if (derived.evidence_snapshot_id !== snapshot?.evidence_snapshot_id) {
    gaps.push("derived_from.evidence_snapshot_id must match evidence_snapshot_id");
  }
  if (derived.handoff_id !== snapshot?.handoff_id) {
    gaps.push("derived_from.handoff_id must match handoff_id");
  }
  if (
    derived.claim_readiness_snapshot_schema_version !==
    AI_VALUE_CLAIM_READINESS_SNAPSHOT_SCHEMA_VERSION
  ) {
    gaps.push("derived_from.claim_readiness_snapshot_schema_version must match Claim Readiness Snapshot schema version");
  }
  if (derived.builder !== DERIVATION_VERSION) {
    gaps.push("derived_from.builder must identify the governed Executive Readout Snapshot builder");
  }
  requireField(
    derived.claim_readiness_snapshot_derivation_version,
    "derived_from.claim_readiness_snapshot_derivation_version",
    gaps
  );
  return gaps;
}

function collectValidationGaps(snapshot: any): string[] {
  const gaps: string[] = [];
  for (const flag of [
    "claim_readiness_snapshot_validated",
    "source_binding_validated",
    "caveats_carried_forward",
    "blocked_claims_carried_forward"
  ]) {
    requireBoolean(snapshot?.validation?.[flag], true, `validation.${flag}`, gaps);
  }
  return gaps;
}

function collectSourceProvenanceGaps(snapshot: any): string[] {
  const gaps: string[] = [];
  const provenance = snapshot?.source_provenance ?? {};
  requireField(provenance.source_refs, "source_provenance.source_refs", gaps);
  requireField(provenance.window, "source_provenance.window", gaps);
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

export function validateExecutiveReadoutSnapshot(
  snapshot: any
): ExecutiveReadoutSnapshotValidationResult {
  const gaps = [
    ...collectTopLevelGaps(snapshot),
    ...collectBoundaryGaps(snapshot),
    ...collectPrivacyAndSuppressionGaps(snapshot),
    ...collectDerivationGaps(snapshot),
    ...collectValidationGaps(snapshot),
    ...collectSourceProvenanceGaps(snapshot)
  ];
  const valid = gaps.length === 0;
  const internalReadoutReady =
    snapshot?.readout_state === "internal_only_readout_ready" ||
    snapshot?.readout_state === "internal_only_claim_review_ready" ||
    snapshot?.readout_state === "held_for_full_playbook_coverage";

  return {
    schema_version: RESULT_SCHEMA_VERSION,
    executive_readout_snapshot_id: snapshot?.executive_readout_snapshot_id ?? null,
    claim_readiness_snapshot_id: snapshot?.claim_readiness_snapshot_id ?? null,
    evidence_snapshot_id: snapshot?.evidence_snapshot_id ?? null,
    valid,
    gaps,
    feeds: {
      executive_readout_snapshot: valid,
      internal_executive_readout_context: valid && internalReadoutReady,
      customer_facing_readout: false,
      customer_facing_financial_output: false
    }
  };
}
