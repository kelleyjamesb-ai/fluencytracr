/**
 * AI Value Engine - Claim Readiness Handoff.
 *
 * Non-persisted bridge from a validated Evidence Snapshot into future claim
 * readiness contexts. It copies aggregate evidence posture forward and fails
 * closed when coverage, caveats, blocked uses, suppression, privacy, workforce
 * context, or VBD boundaries are missing or unsafe.
 */

import { EVIDENCE_SNAPSHOT_SCHEMA_VERSION, validateEvidenceSnapshot } from "./evidenceSnapshot";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_CLAIM_READINESS_HANDOFF_VALIDATION_2026_06";

export const AI_VALUE_CLAIM_READINESS_HANDOFF_SCHEMA_VERSION =
  "FT_AI_VALUE_CLAIM_READINESS_HANDOFF_2026_06";

export const BLOCKED_USE_TO_BLOCKED_CLAIM: Record<string, string> = {
  realized_roi: "roi_proof",
  realized_roi_calculation: "roi_proof",
  roi_proof: "roi_proof",
  ebita_claim: "ebita_claim",
  causality_claim: "causality_claim",
  productivity_claim: "productivity_claim",
  headcount_reduction_claim: "headcount_reduction_claim",
  individual_attribution: "individual_scoring",
  manager_or_team_ranking: "team_or_manager_ranking",
  manager_ranking: "team_or_manager_ranking",
  team_ranking: "team_or_manager_ranking",
  people_decisioning: "people_decisioning",
  customer_facing_financial_output: "customer_facing_economic_output",
  customer_facing_economic_output: "customer_facing_economic_output",
  dollarized_output: "customer_facing_economic_output",
  financial_value_claim: "customer_facing_economic_output",
  usage_derived_financial_claim: "customer_facing_economic_output",
  person_level_hris_records: "people_decisioning",
  hashed_or_joinable_person_identifiers: "individual_scoring",
  compensation_or_performance_inference: "people_decisioning",
  promotion_or_discipline_inference: "people_decisioning",
  attrition_prediction: "people_decisioning",
  hris_inference_from_ai_usage: "people_decisioning"
};

const REQUIRED_HANDOFF_FIELDS = [
  "schema_version",
  "handoff_id",
  "evidence_snapshot_id",
  "org_id",
  "measurement_plan_id",
  "workflow",
  "window",
  "snapshot_readiness_decision",
  "playbook_coverage",
  "source_refs",
  "required_caveats",
  "blocked_uses",
  "blocked_claims",
  "unmapped_blocked_uses",
  "suppression",
  "privacy_boundary",
  "aggregate_workforce_context",
  "vbd_operating_map",
  "financial_boundary",
  "executive_readout_boundary",
  "source_provenance",
  "persistence_policy",
  "created_at",
  "derivation_version"
];

const FINANCIAL_CLAIM_GOVERNANCE_STATES = new Set([
  "held",
  "internal_value_investigation",
  "financial_translation_ready",
  "blocked_for_insufficient_evidence",
  "blocked_for_privacy_or_suppression"
]);

const EVIDENCE_CONDITIONED_FINANCIAL_BLOCKED_USES = [
  "realized_roi",
  "realized_roi_calculation",
  "roi_proof",
  "dollarized_output",
  "financial_value_claim",
  "usage_derived_financial_claim"
];

const FINANCIAL_TRANSLATION_BLOCKED_USES = [
  "realized_roi",
  "realized_roi_calculation",
  "roi_proof"
];

const FINANCIAL_TRANSLATION_BLOCKED_CLAIMS = [
  "roi_proof"
];

const ALWAYS_BLOCKED_FINANCIAL_CLAIMS = [
  "ebita_claim",
  "customer_facing_economic_output"
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
  /financial_impact/i
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
  /direct_person_identifier/i,
  /person_(?:id|identifier)/i,
  /hashed_(?:user|person|employee)_id/i,
  /joinable_(?:user|person|employee)_identifier/i,
  /person_level_hris/i,
  /person_level_productivity/i,
  /manager_ranking/i,
  /team_ranking/i,
  /manager_or_team_ranking/i,
  /people_decisioning/i,
  /compensation/i,
  /performance_rating/i,
  /promotion/i,
  /discipline/i,
  /attrition_prediction/i,
  /hris_inference/i
];

const GOVERNED_KEY_ALLOWLIST = new Set([
  "aggregate_workforce_context",
  "blocked_uses",
  "blocked_claims",
  "blocked_sections",
  "blocked_interpretation",
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

const PRIVACY_BOUNDARY_ALLOWED_KEYS = new Set([
  "aggregate_only",
  ...UNSAFE_PRIVACY_FLAGS
]);

export const ClaimReadinessHandoffSchema = {
  schema_version: AI_VALUE_CLAIM_READINESS_HANDOFF_SCHEMA_VERSION,
  required_fields: REQUIRED_HANDOFF_FIELDS,
  blocked_use_translation: BLOCKED_USE_TO_BLOCKED_CLAIM,
  persistence_policy: {
    persisted: false,
    creates_migrations: false,
    creates_prisma_schema: false,
    creates_backend_routes: false,
    creates_frontend_ui: false,
    creates_ingestion_jobs: false
  }
} as const;

export interface ClaimReadinessHandoffValidationResult {
  schema_version: string;
  handoff_id: string | null;
  evidence_snapshot_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    claim_readiness_context: boolean;
    roi_scenario_context: boolean;
    ebita_bridge_context: boolean;
    executive_readout_context: boolean;
  };
}

export interface ClaimReadinessHandoff {
  schema_version: string;
  handoff_id: string;
  evidence_snapshot_id: string;
  org_id: string;
  measurement_plan_id: string;
  workflow: any;
  window: any;
  snapshot_readiness_decision: string;
  playbook_coverage: any;
  source_refs: any;
  required_caveats: string[];
  blocked_uses: string[];
  blocked_claims: string[];
  unmapped_blocked_uses: string[];
  suppression: any;
  privacy_boundary: any;
  aggregate_workforce_context: any;
  vbd_operating_map: any;
  financial_boundary: {
    financial_claim_governance_state: string;
    financial_translation_allowed: boolean;
    roi_claim_allowed: boolean;
    ebita_claim_allowed: boolean;
    customer_facing_financial_output_allowed: boolean;
    reasons: string[];
  };
  executive_readout_boundary: {
    executive_readout_allowed: boolean;
    customer_facing_readout_allowed: boolean;
    internal_only_readout_allowed: boolean;
    required_sections: string[];
    required_caveats: string[];
    blocked_sections: string[];
    reasons: string[];
  };
  source_provenance: {
    evidence_snapshot_schema_version: string;
    evidence_snapshot_derivation_version: string;
    source_refs: any;
    window: any;
    k_min_summary?: any | null;
    baseline_window?: any | null;
    comparison_window?: any | null;
    provenance_caveats: string[];
  };
  persistence_policy: {
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

export interface BuildClaimReadinessHandoffOptions {
  handoffId?: string;
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

function normalizeKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean).map(String))];
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

function sourceCaveatsForHandoff(snapshot: any): string[] {
  return uniqueStrings([
    ...stringsOf(snapshot?.required_caveats),
    ...caveatsFromObject(snapshot?.playbook_coverage),
    ...caveatsFromObject(snapshot?.playbook_layers),
    ...caveatsFromObject(snapshot?.evidence_lanes),
    ...caveatsFromObject(snapshot?.aggregate_workforce_context),
    ...caveatsFromObject(snapshot?.vbd_operating_map)
  ]);
}

function requiredCaveatsForValidation(handoff: any): string[] {
  return uniqueStrings([
    ...stringsOf(handoff?.required_caveats),
    ...caveatsFromObject(handoff?.playbook_coverage),
    ...caveatsFromObject(handoff?.aggregate_workforce_context),
    ...caveatsFromObject(handoff?.vbd_operating_map),
    ...caveatsFromObject(handoff?.source_provenance)
  ]);
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

function layerStatus(handoff: any, layer: string): string {
  return String(handoff?.playbook_coverage?.[layer]?.status ?? "");
}

function fullPlaybookCoveragePresent(handoff: any): boolean {
  return handoff?.playbook_coverage?.coverage_status === "full_playbook_coverage" &&
    ["present", "partial"].includes(layerStatus(handoff, "layer_1_platform_telemetry")) &&
    layerStatus(handoff, "layer_2_user_voice_empirical") === "present" &&
    layerStatus(handoff, "layer_3_business_system_outcomes") === "present" &&
    layerStatus(handoff, "governance_evidence") === "present" &&
    (layerStatus(handoff, "assumption_evidence") === "present" ||
      assumptionEvidenceExplicitlyNotRequired(handoff)) &&
    kMinThresholdMet(handoff);
}

function assumptionEvidenceExplicitlyNotRequired(handoff: any): boolean {
  const assumptions = handoff?.playbook_coverage?.assumption_evidence ?? {};
  return assumptions.status === "not_computed" &&
    stringsOf(assumptions.required_approvals).length === 0 &&
    stringsOf(assumptions.caveats).some((caveat) => /not required/i.test(caveat));
}

function kMinThresholdMet(handoff: any): boolean {
  const summary = handoff?.source_provenance?.k_min_summary;
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

function caveatsMention(handoff: any, pattern: RegExp): boolean {
  return stringsOf(handoff?.required_caveats).some((caveat) => pattern.test(caveat));
}

function snapshotCaveatsMention(snapshot: any, pattern: RegExp): boolean {
  return stringsOf(snapshot?.required_caveats).some((caveat) => pattern.test(caveat));
}

export function financeOrBusinessApprovalCaveated(value: any): boolean {
  return stringsOf(value?.required_caveats).some((caveat) => {
    const normalized = caveat
      .toLowerCase()
      .replace(/[_-]+/g, " ");
    const referencesFinancialApproval =
      /(finance|financial|business owner|financial assumption).{0,40}approval/.test(normalized) ||
      /approval.{0,40}(finance|financial|business owner|financial assumption)/.test(normalized);
    const approvalIsExplicitlyNotRequired =
      /\b(?:explicitly\s+)?not\s+required\b/.test(normalized);
    const approvalHasBlockedState =
      /missing|unapproved|held|caveated|not approved/.test(normalized);
    const approvalIsRequired =
      /requires? .{0,40}approval|approval .{0,40}required/.test(normalized);
    const approvalIsUnresolved =
      approvalHasBlockedState || (!approvalIsExplicitlyNotRequired && approvalIsRequired);
    return referencesFinancialApproval && approvalIsUnresolved;
  });
}

function snapshotReadinessAllowsRoiScenario(handoff: any): boolean {
  const readiness = String(handoff?.snapshot_readiness_decision ?? "");
  return readiness.length > 0 && !/HOLD|SUPPRESS|NOT_READY|GOVERNANCE/i.test(readiness);
}

function financialTranslationReadinessReasons(
  snapshot: any,
  blockedUses: string[],
  sourceProvenance?: ClaimReadinessHandoff["source_provenance"]
): string[] {
  const reasons: string[] = [];
  const coverage = snapshot?.playbook_coverage ?? {};
  const normalizedBlockedUses = blockedUses.map(normalizeToken);
  const coverageObject = sourceProvenance
    ? { ...snapshot, source_provenance: sourceProvenance }
    : snapshot;

  if (!fullPlaybookCoveragePresent(coverageObject)) {
    reasons.push("Full Playbook coverage is required for financial translation.");
  }
  if (coverage.layer_3_business_system_outcomes?.status !== "present") {
    reasons.push("Layer 3 business system-of-record outcome evidence is not present.");
  }
  if (
    coverage.assumption_evidence?.status !== "present" &&
    !assumptionEvidenceExplicitlyNotRequired({ playbook_coverage: coverage })
  ) {
    reasons.push("Assumption evidence is missing, held, suppressed, partial, not computed, or unapproved.");
  }
  if (financeOrBusinessApprovalCaveated(snapshot)) {
    reasons.push("Finance or business-owner approval is missing, held, or caveated.");
  }
  for (const use of FINANCIAL_TRANSLATION_BLOCKED_USES) {
    if (normalizedBlockedUses.includes(use)) {
      reasons.push(`Blocked use ${use} prevents governed ROI scenario review.`);
    }
  }
  if (privacyIsUnsafe(snapshot?.privacy_boundary)) {
    reasons.push("Privacy boundary is unsafe.");
  }
  if (suppressionIsActiveOrUnsafe(snapshot?.suppression)) {
    reasons.push("Suppression is active or fail-closed.");
  }

  return uniqueStrings(reasons);
}

function financialTranslationReady(
  snapshot: any,
  blockedUses: string[],
  sourceProvenance?: ClaimReadinessHandoff["source_provenance"]
): boolean {
  return financialTranslationReadinessReasons(
    snapshot,
    blockedUses,
    sourceProvenance
  ).length === 0;
}

function handoffBlockedUsesForFinancialState(
  snapshot: any,
  sourceProvenance: ClaimReadinessHandoff["source_provenance"]
): string[] {
  const originalBlockedUses = stringsOf(snapshot?.blocked_uses);
  const withoutConditionedFinancialUses = originalBlockedUses.filter((use) =>
    !EVIDENCE_CONDITIONED_FINANCIAL_BLOCKED_USES.includes(normalizeToken(use))
  );
  return financialTranslationReady(snapshot, withoutConditionedFinancialUses, sourceProvenance)
    ? withoutConditionedFinancialUses
    : originalBlockedUses;
}

function isForbiddenKey(key: string, path: string[]): boolean {
  const normalizedKey = normalizeKey(key);
  const normalizedPath = path.map(normalizeKey);
  const underPrivacyBoundary =
    normalizedPath.length === 2 && normalizedPath[0] === "privacy_boundary";
  if (underPrivacyBoundary && PRIVACY_BOUNDARY_ALLOWED_KEYS.has(normalizedKey)) {
    return false;
  }
  if (!underPrivacyBoundary && UNSAFE_PRIVACY_FLAGS.includes(normalizedKey)) {
    return true;
  }
  if (GOVERNED_KEY_ALLOWLIST.has(normalizedKey)) return false;
  return FORBIDDEN_FIELD_KEY_PATTERNS.some((pattern) => pattern.test(normalizedKey)) ||
    DISALLOWED_COMPUTED_FIELD_PATTERNS.some((pattern) => pattern.test(normalizedKey));
}

function collectForbiddenFields(
  value: any,
  fields: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item) => collectForbiddenFields(item, fields, path));
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    const fieldPath = [...path, key];
    if (isForbiddenKey(key, fieldPath)) fields.add(fieldPath.join("."));
    collectForbiddenFields(nested, fields, fieldPath);
  }
  return fields;
}

function safeIdPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function translateSnapshotBlockedUsesToBlockedClaims(
  blockedUses: any
): {
  blocked_claims: string[];
  unmapped_blocked_uses: string[];
} {
  const normalizedUses = uniqueStrings(stringsOf(blockedUses).map(normalizeToken));
  const blockedClaims = new Set<string>();
  const unmappedBlockedUses: string[] = [];

  for (const use of normalizedUses) {
    const translated = BLOCKED_USE_TO_BLOCKED_CLAIM[use];
    if (translated) {
      blockedClaims.add(translated);
    } else {
      unmappedBlockedUses.push(use);
    }
  }

  return {
    blocked_claims: [...blockedClaims],
    unmapped_blocked_uses: unmappedBlockedUses
  };
}

function buildFinancialBoundary(
  snapshot: any,
  blockedUses: string[],
  sourceProvenance: ClaimReadinessHandoff["source_provenance"]
): ClaimReadinessHandoff["financial_boundary"] {
  const reasons = financialTranslationReadinessReasons(
    snapshot,
    blockedUses,
    sourceProvenance
  );
  const translationReady = reasons.length === 0;
  return {
    financial_claim_governance_state: translationReady
      ? "financial_translation_ready"
      : privacyIsUnsafe(snapshot?.privacy_boundary) ||
          suppressionIsActiveOrUnsafe(snapshot?.suppression)
        ? "blocked_for_privacy_or_suppression"
        : "blocked_for_insufficient_evidence",
    financial_translation_allowed: translationReady,
    roi_claim_allowed: translationReady,
    ebita_claim_allowed: false,
    customer_facing_financial_output_allowed: false,
    reasons: translationReady
      ? [
          "Governed ROI scenario review may proceed internally; EBITA and customer-facing financial output remain blocked until separately authorized."
        ]
      : reasons
  };
}

function buildExecutiveReadoutBoundary(
  snapshot: any,
  financialBoundary: ClaimReadinessHandoff["financial_boundary"],
  requiredCaveats: string[] = stringsOf(snapshot?.required_caveats)
): ClaimReadinessHandoff["executive_readout_boundary"] {
  const reasons: string[] = [];
  const blockedSections = new Set<string>();
  const coverageStatus = String(snapshot?.playbook_coverage?.coverage_status ?? "");
  const readiness = String(snapshot?.snapshot_readiness_decision ?? "");
  const privacyUnsafe = privacyIsUnsafe(snapshot?.privacy_boundary);
  const suppressionActive = suppressionIsActiveOrUnsafe(snapshot?.suppression);

  if (/HOLD|SUPPRESS|NOT_READY|GOVERNANCE/i.test(readiness)) {
    reasons.push(`Snapshot readiness decision ${readiness || "missing"} blocks customer-facing readout.`);
  }
  if (coverageStatus === "layer_1_only") {
    reasons.push("Layer 1 only coverage allows internal or caveated review only.");
    [
      "roi",
      "ebita",
      "causality",
      "productivity",
      "financial_output"
    ].forEach((section) => blockedSections.add(section));
  }
  if (stringsOf(snapshot?.blocked_uses).map(normalizeToken).includes("customer_facing_financial_output")) {
    blockedSections.add("customer_facing_financial_output");
    reasons.push("Customer-facing financial output is blocked by the upstream snapshot.");
  }
  if (privacyUnsafe) {
    reasons.push("Privacy boundary is unsafe.");
  }
  if (suppressionActive) {
    reasons.push("Suppression is active or fail-closed.");
  }
  if (financialBoundary.customer_facing_financial_output_allowed !== true) {
    blockedSections.add("customer_facing_financial_output");
  }

  return {
    executive_readout_allowed: !privacyUnsafe && !/HOLD|SUPPRESS|NOT_READY|GOVERNANCE/i.test(readiness),
    customer_facing_readout_allowed: false,
    internal_only_readout_allowed: !privacyUnsafe,
    required_sections: [
      "evidence_snapshot_source",
      "playbook_coverage",
      "required_caveats",
      "blocked_claims",
      "suppression",
      "privacy_boundary"
    ],
    required_caveats: stringsOf(requiredCaveats),
    blocked_sections: [...blockedSections],
    reasons: uniqueStrings(reasons)
  };
}

function buildSourceProvenance(snapshot: any): ClaimReadinessHandoff["source_provenance"] {
  return {
    evidence_snapshot_schema_version: String(snapshot?.schema_version ?? ""),
    evidence_snapshot_derivation_version: String(snapshot?.derivation_version ?? ""),
    source_refs: deepClone(snapshot?.source_refs ?? {}),
    window: deepClone(snapshot?.window ?? {}),
    k_min_summary: deepClone(snapshot?.aggregate_telemetry_summary?.k_min_summary ?? null),
    baseline_window: null,
    comparison_window: null,
    provenance_caveats: [
      "Baseline and comparison windows are not first-class fields in the Evidence Snapshot; downstream outcome movement or financial translation review must remain explicitly caveated until those windows are attached."
    ]
  };
}

export function buildClaimReadinessHandoffFromEvidenceSnapshot(
  evidenceSnapshot: any,
  options: BuildClaimReadinessHandoffOptions = {}
): ClaimReadinessHandoff {
  const snapshotResult = validateEvidenceSnapshot(evidenceSnapshot);
  if (!snapshotResult.valid) {
    throw new Error(
      `Evidence Snapshot is invalid and cannot build Claim Readiness Handoff: ${snapshotResult.gaps.join("; ")}`
    );
  }

  const sourceProvenance = buildSourceProvenance(evidenceSnapshot);
  const handoffBlockedUses = handoffBlockedUsesForFinancialState(
    evidenceSnapshot,
    sourceProvenance
  );
  const translated = translateSnapshotBlockedUsesToBlockedClaims(handoffBlockedUses);
  const requiredCaveats = uniqueStrings([
    ...sourceCaveatsForHandoff(evidenceSnapshot),
    ...stringsOf(sourceProvenance.provenance_caveats)
  ]);
  if (translated.unmapped_blocked_uses.length > 0) {
    requiredCaveats.push(
      `Unmapped blocked uses must remain blocked downstream: ${translated.unmapped_blocked_uses.join(", ")}.`
    );
  }
  if (
    evidenceSnapshot?.vbd_operating_map?.operating_mode === "high_fluency_flow" &&
    evidenceSnapshot?.playbook_coverage?.coverage_status === "layer_1_only" &&
    !snapshotCaveatsMention(evidenceSnapshot, /high fluency flow.*Layer 1|Layer 1.*high fluency flow/i)
  ) {
    requiredCaveats.push(
      "High fluency flow is Layer 1 posture only and not full value proof."
    );
  }

  const financialBoundary = buildFinancialBoundary(
    evidenceSnapshot,
    handoffBlockedUses,
    sourceProvenance
  );
  const executiveReadoutBoundary = buildExecutiveReadoutBoundary(
    evidenceSnapshot,
    financialBoundary,
    requiredCaveats
  );
  return {
    schema_version: AI_VALUE_CLAIM_READINESS_HANDOFF_SCHEMA_VERSION,
    handoff_id: options.handoffId ??
      `claim_readiness_handoff_${safeIdPart(String(evidenceSnapshot.evidence_snapshot_id))}`,
    evidence_snapshot_id: String(evidenceSnapshot.evidence_snapshot_id),
    org_id: String(evidenceSnapshot.org_id),
    measurement_plan_id: String(evidenceSnapshot.measurement_plan_id),
    workflow: deepClone(evidenceSnapshot.workflow),
    window: deepClone(evidenceSnapshot.window),
    snapshot_readiness_decision: String(evidenceSnapshot.snapshot_readiness_decision),
    playbook_coverage: deepClone(evidenceSnapshot.playbook_coverage),
    source_refs: deepClone(evidenceSnapshot.source_refs),
    required_caveats: requiredCaveats,
    blocked_uses: handoffBlockedUses,
    blocked_claims: uniqueStrings([
      ...translated.blocked_claims,
      ...ALWAYS_BLOCKED_FINANCIAL_CLAIMS,
      "customer_facing_economic_output"
    ]),
    unmapped_blocked_uses: translated.unmapped_blocked_uses,
    suppression: deepClone(evidenceSnapshot.suppression),
    privacy_boundary: deepClone(evidenceSnapshot.privacy_boundary),
    aggregate_workforce_context: deepClone(evidenceSnapshot.aggregate_workforce_context),
    vbd_operating_map: deepClone(evidenceSnapshot.vbd_operating_map),
    financial_boundary: financialBoundary,
    executive_readout_boundary: executiveReadoutBoundary,
    source_provenance: sourceProvenance,
    persistence_policy: {
      persisted: false,
      creates_migrations: false,
      creates_prisma_schema: false,
      creates_backend_routes: false,
      creates_frontend_ui: false,
      creates_ingestion_jobs: false
    },
    created_at: options.createdAt ?? new Date().toISOString(),
    derivation_version: "ai_value_claim_readiness_handoff_builder_2026_06"
  };
}

function collectTopLevelGaps(handoff: any): string[] {
  const gaps: string[] = [];
  for (const field of REQUIRED_HANDOFF_FIELDS) {
    requireField(handoff?.[field], field, gaps);
  }
  if (
    handoff?.schema_version &&
    handoff.schema_version !== AI_VALUE_CLAIM_READINESS_HANDOFF_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${handoff.schema_version}`);
  }
  requireArray(handoff?.required_caveats, "required_caveats", gaps);
  requireArray(handoff?.blocked_uses, "blocked_uses", gaps);
  requireArray(handoff?.blocked_claims, "blocked_claims", gaps);
  requireArray(handoff?.unmapped_blocked_uses, "unmapped_blocked_uses", gaps);
  return gaps;
}

function collectBlockedClaimGaps(handoff: any): string[] {
  const gaps: string[] = [];
  const translated = translateSnapshotBlockedUsesToBlockedClaims(handoff?.blocked_uses);
  const blockedClaims = stringsOf(handoff?.blocked_claims).map(normalizeToken);
  for (const claim of translated.blocked_claims) {
    if (!blockedClaims.includes(normalizeToken(claim))) {
      gaps.push(`blocked_claims missing translated blocked claim ${claim}`);
    }
  }
  for (const use of translated.unmapped_blocked_uses) {
    const carriedInUnmapped = stringsOf(handoff?.unmapped_blocked_uses)
      .map(normalizeToken)
      .includes(use);
    const caveated = caveatsMention(handoff, new RegExp(use.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    if (!carriedInUnmapped && !caveated) {
      gaps.push(`unknown blocked use ${use} must be preserved in unmapped_blocked_uses or required_caveats`);
    }
  }
  return gaps;
}

function collectFinancialBoundaryGaps(handoff: any): string[] {
  const gaps: string[] = [];
  const boundary = handoff?.financial_boundary ?? {};
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
  requireArray(boundary.reasons, "financial_boundary.reasons", gaps);

  const mustBlockFinancialTranslation =
    !fullPlaybookCoveragePresent(handoff) ||
    privacyIsUnsafe(handoff?.privacy_boundary) ||
    suppressionIsActiveOrUnsafe(handoff?.suppression) ||
    FINANCIAL_TRANSLATION_BLOCKED_USES.some((use) =>
      stringsOf(handoff?.blocked_uses).map(normalizeToken).includes(use)
    ) ||
    FINANCIAL_TRANSLATION_BLOCKED_CLAIMS.some((claim) =>
      stringsOf(handoff?.blocked_claims).map(normalizeToken).includes(claim)
    ) ||
    financeOrBusinessApprovalCaveated(handoff);
  if (mustBlockFinancialTranslation) {
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
    if (boundary.financial_claim_governance_state === "customer_facing_financial_claim_allowed") {
      gaps.push("financial_boundary.financial_claim_governance_state must remain blocked or held until a future customer-facing financial governance contract exists");
    }
  } else {
    if (boundary.financial_claim_governance_state !== "financial_translation_ready") {
      gaps.push("financial_boundary.financial_claim_governance_state must be financial_translation_ready");
    }
    if (boundary.financial_translation_allowed !== true) {
      gaps.push("financial_boundary.financial_translation_allowed must be true");
    }
    if (boundary.roi_claim_allowed !== true) {
      gaps.push("financial_boundary.roi_claim_allowed must be true");
    }
  }
  if (boundary.ebita_claim_allowed !== false) {
    gaps.push("financial_boundary.ebita_claim_allowed must be false");
    if (boundary.financial_translation_allowed !== false) {
      gaps.push("financial_boundary.financial_translation_allowed must be false while EBITA remains blocked");
    }
  }
  if (boundary.customer_facing_financial_output_allowed !== false) {
    gaps.push("financial_boundary.customer_facing_financial_output_allowed must be false");
    if (boundary.financial_translation_allowed !== false) {
      gaps.push("financial_boundary.financial_translation_allowed must be false while customer-facing financial output is requested");
    }
  }
  return gaps;
}

function collectPlaybookCoverageGaps(handoff: any): string[] {
  const gaps: string[] = [];
  const coverage = handoff?.playbook_coverage ?? {};
  if (coverage.coverage_status === "full_playbook_coverage") {
    if (!["present", "partial"].includes(layerStatus(handoff, "layer_1_platform_telemetry"))) {
      gaps.push("full_playbook_coverage requires Layer 1 present or partial");
    }
    if (layerStatus(handoff, "layer_2_user_voice_empirical") !== "present") {
      gaps.push("full_playbook_coverage requires Layer 2 present");
    }
    if (layerStatus(handoff, "layer_3_business_system_outcomes") !== "present") {
      gaps.push("full_playbook_coverage requires Layer 3 present");
    }
    if (layerStatus(handoff, "governance_evidence") !== "present") {
      gaps.push("full_playbook_coverage requires governance evidence present");
    }
    if (
      layerStatus(handoff, "assumption_evidence") !== "present" &&
      !assumptionEvidenceExplicitlyNotRequired(handoff)
    ) {
      gaps.push(
        "full_playbook_coverage requires assumption evidence present or explicitly not required"
      );
    }
    if (!kMinThresholdMet(handoff)) {
      gaps.push("full_playbook_coverage requires k-min threshold met");
    }
    if (privacyIsUnsafe(handoff?.privacy_boundary)) {
      gaps.push("full_playbook_coverage requires safe privacy posture");
    }
  }
  return gaps;
}

function collectExecutiveBoundaryGaps(handoff: any): string[] {
  const gaps: string[] = [];
  const boundary = handoff?.executive_readout_boundary ?? {};
  for (const flag of [
    "executive_readout_allowed",
    "customer_facing_readout_allowed",
    "internal_only_readout_allowed"
  ]) {
    if (typeof boundary[flag] !== "boolean") {
      gaps.push(`executive_readout_boundary.${flag} must be boolean`);
    }
  }
  for (const field of [
    "required_sections",
    "required_caveats",
    "blocked_sections",
    "reasons"
  ]) {
    requireArray(boundary[field], `executive_readout_boundary.${field}`, gaps);
  }
  const handoffCaveats = stringsOf(handoff?.required_caveats);
  const boundaryCaveats = stringsOf(boundary.required_caveats);
  for (const caveat of requiredCaveatsForValidation(handoff)) {
    if (!handoffCaveats.includes(caveat)) {
      gaps.push("required_caveats must include every carried-forward evidence caveat");
      break;
    }
    if (!boundaryCaveats.includes(caveat)) {
      gaps.push("executive_readout_boundary.required_caveats must include every required caveat");
      break;
    }
  }
  for (const caveat of handoffCaveats) {
    if (!boundaryCaveats.includes(caveat)) {
      gaps.push("executive_readout_boundary.required_caveats must include every required caveat");
      break;
    }
  }
  const readiness = String(handoff?.snapshot_readiness_decision ?? "");
  if (
    /HOLD|SUPPRESS|NOT_READY|GOVERNANCE/i.test(readiness) &&
    boundary.customer_facing_readout_allowed !== false
  ) {
    gaps.push("executive_readout_boundary.customer_facing_readout_allowed must be false for held, suppressed, not-ready, or governance-failed snapshots");
  }
  if (
    privacyIsUnsafe(handoff?.privacy_boundary) &&
    (boundary.executive_readout_allowed !== false ||
      boundary.customer_facing_readout_allowed !== false)
  ) {
    gaps.push("executive_readout_boundary must fail closed when privacy is unsafe");
  }
  if (
    suppressionIsActiveOrUnsafe(handoff?.suppression) &&
    boundary.customer_facing_readout_allowed !== false
  ) {
    gaps.push("executive_readout_boundary.customer_facing_readout_allowed must be false when suppression is active or fail-closed");
  }
  if (
    handoff?.playbook_coverage?.coverage_status === "layer_1_only" &&
    boundary.customer_facing_readout_allowed !== false
  ) {
    gaps.push("layer_1_only handoff must not allow customer-facing readout");
  }
  return gaps;
}

function collectVbdGaps(handoff: any): string[] {
  const gaps: string[] = [];
  const map = handoff?.vbd_operating_map ?? {};
  if (map.contributes_to_playbook_layer !== "layer_1_platform_telemetry") {
    gaps.push("vbd_operating_map.contributes_to_playbook_layer must remain layer_1_platform_telemetry");
  }
  const blockedTokens = new Set([
    ...stringsOf(handoff?.blocked_uses).map(normalizeToken),
    ...stringsOf(handoff?.blocked_claims).map(normalizeToken)
  ]);
  const financialTranslationReady =
    handoff?.financial_boundary?.financial_claim_governance_state ===
      "financial_translation_ready";
  for (const use of stringsOf(map.blocked_interpretation).map(normalizeToken)) {
    if (
      financialTranslationReady &&
      FINANCIAL_TRANSLATION_BLOCKED_USES.includes(use)
    ) {
      continue;
    }
    const translated = BLOCKED_USE_TO_BLOCKED_CLAIM[use];
    if (!blockedTokens.has(use) && (!translated || !blockedTokens.has(translated))) {
      gaps.push(`VBD blocked_interpretation ${use} must carry into blocked_uses or blocked_claims`);
    }
  }
  if (
    map.operating_mode === "high_fluency_flow" &&
    handoff?.playbook_coverage?.coverage_status === "layer_1_only" &&
    !caveatsMention(handoff, /high fluency flow.*Layer 1|Layer 1.*high fluency flow/i)
  ) {
    gaps.push("high_fluency_flow with layer_1_only must carry the Layer 1 only caveat");
  }
  const requiredVbdBlockedClaims = [
    "causality_claim",
    "productivity_claim",
    "headcount_reduction_claim",
    "people_decisioning",
    "team_or_manager_ranking",
    "individual_scoring",
    "customer_facing_economic_output"
  ];
  if (!financialTranslationReady) {
    requiredVbdBlockedClaims.unshift("roi_proof", "ebita_claim");
  } else {
    requiredVbdBlockedClaims.unshift("ebita_claim");
  }
  for (const blocked of requiredVbdBlockedClaims) {
    if (!blockedTokens.has(blocked)) {
      gaps.push(`VBD boundary requires blocked claim/use ${blocked}`);
    }
  }
  return gaps;
}

function collectWorkforceGaps(handoff: any): string[] {
  const gaps: string[] = [];
  const blockedTokens = new Set([
    ...stringsOf(handoff?.blocked_uses).map(normalizeToken),
    ...stringsOf(handoff?.blocked_claims).map(normalizeToken)
  ]);
  for (const blocked of [
    "people_decisioning",
    "productivity_claim",
    "team_or_manager_ranking",
    "individual_scoring"
  ]) {
    if (!blockedTokens.has(blocked)) {
      gaps.push(`aggregate workforce context boundary requires blocked claim/use ${blocked}`);
    }
  }
  return gaps;
}

function collectSourceProvenanceGaps(handoff: any): string[] {
  const gaps: string[] = [];
  const provenance = handoff?.source_provenance ?? {};
  if (provenance.evidence_snapshot_schema_version !== EVIDENCE_SNAPSHOT_SCHEMA_VERSION) {
    gaps.push("source_provenance.evidence_snapshot_schema_version must match Evidence Snapshot schema version");
  }
  requireField(
    provenance.evidence_snapshot_derivation_version,
    "source_provenance.evidence_snapshot_derivation_version",
    gaps
  );
  requireField(provenance.source_refs, "source_provenance.source_refs", gaps);
  requireField(provenance.window, "source_provenance.window", gaps);
  requireArray(provenance.provenance_caveats, "source_provenance.provenance_caveats", gaps);
  if (
    (provenance.baseline_window === null || provenance.comparison_window === null) &&
    !stringsOf(provenance.provenance_caveats).some((caveat) =>
      /Baseline and comparison windows are not first-class/i.test(caveat)
    )
  ) {
    gaps.push("source_provenance must caveat missing first-class baseline/comparison windows");
  }
  return gaps;
}

function collectPersistencePolicyGaps(handoff: any): string[] {
  const gaps: string[] = [];
  const policy = handoff?.persistence_policy ?? {};
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

function collectForbiddenFieldGaps(handoff: any): string[] {
  const forbidden = Array.from(collectForbiddenFields(handoff)).sort();
  return forbidden.length > 0
    ? [`Forbidden field(s) present: ${forbidden.join(", ")}`]
    : [];
}

export function validateClaimReadinessHandoff(
  handoff: any
): ClaimReadinessHandoffValidationResult {
  const gaps = [
    ...collectTopLevelGaps(handoff),
    ...collectBlockedClaimGaps(handoff),
    ...collectPlaybookCoverageGaps(handoff),
    ...collectFinancialBoundaryGaps(handoff),
    ...collectExecutiveBoundaryGaps(handoff),
    ...collectVbdGaps(handoff),
    ...collectWorkforceGaps(handoff),
    ...collectSourceProvenanceGaps(handoff),
    ...collectPersistencePolicyGaps(handoff),
    ...collectForbiddenFieldGaps(handoff)
  ];
  const valid = gaps.length === 0;
  const roiScenarioReady = valid &&
    snapshotReadinessAllowsRoiScenario(handoff) &&
    handoff?.financial_boundary?.financial_claim_governance_state ===
      "financial_translation_ready" &&
    handoff?.financial_boundary?.financial_translation_allowed === true &&
    handoff?.financial_boundary?.roi_claim_allowed === true &&
    handoff?.financial_boundary?.customer_facing_financial_output_allowed === false;

  return {
    schema_version: RESULT_SCHEMA_VERSION,
    handoff_id: handoff?.handoff_id ?? null,
    evidence_snapshot_id: handoff?.evidence_snapshot_id ?? null,
    valid,
    gaps,
    feeds: {
      claim_readiness_context: valid,
      roi_scenario_context: roiScenarioReady,
      ebita_bridge_context: false,
      executive_readout_context: valid &&
        handoff?.executive_readout_boundary?.executive_readout_allowed === true
    }
  };
}
