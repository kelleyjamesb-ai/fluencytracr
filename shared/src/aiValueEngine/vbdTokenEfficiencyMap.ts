/**
 * AI Value Engine - VBD x Token Efficiency Map.
 *
 * Aggregate-only strategy composer that combines VBD work-integration posture
 * with Token Efficiency cost/intensity posture. The map emits strategy zones
 * and caveats only. It does not persist, create routes/UI/ingestion, compute
 * ROI, prove causality, measure productivity, rank people or groups, or create
 * customer-facing financial output.
 */

import { validateEvidenceSnapshot } from "./evidenceSnapshot";
import { validateTokenEfficiencySignal } from "./tokenEfficiencySignal";

export const AI_VALUE_VBD_TOKEN_EFFICIENCY_MAP_SCHEMA_VERSION =
  "FT_AI_VALUE_VBD_TOKEN_EFFICIENCY_MAP_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_VBD_TOKEN_EFFICIENCY_MAP_VALIDATION_2026_06";

const DERIVATION_VERSION =
  "ai_value_vbd_token_efficiency_map_2026_06";

const ALLOWED_VBD_POSTURES = new Set([
  "high_work_integration",
  "emerging_work_integration",
  "shallow_work_integration",
  "held",
  "suppressed",
  "unknown"
]);

const ALLOWED_TOKEN_POSTURES = new Set([
  "efficient",
  "moderate",
  "high_intensity",
  "held",
  "suppressed",
  "unknown"
]);

const ALLOWED_STRATEGY_ZONES = new Set([
  "replicate_pattern",
  "optimize_cost",
  "activate_workflow",
  "mitigate_friction",
  "hold_for_evidence"
]);

const SAFE_ALLOWED_USES = [
  "aggregate_strategy_planning",
  "workflow_design_review",
  "model_routing_review",
  "enablement_planning",
  "cost_exposure_review",
  "token_efficiency_review"
];

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

const REQUIRED_FALSE_VALUE_PROOF_FLAGS = [
  "map_is_roi_proof",
  "map_is_productivity_proof",
  "map_is_financial_output",
  "map_computes_causality",
  "map_allows_person_or_team_comparison",
  "downstream_claim_strength_upgrade_allowed"
];

const REQUIRED_FALSE_FEEDS = [
  "claim_readiness_snapshot",
  "executive_readout_snapshot",
  "reportability_readiness",
  "customer_facing_financial_output"
];

const REQUIRED_FALSE_PERSISTENCE_FIELDS = [
  "persisted",
  "creates_migrations",
  "creates_prisma_schema",
  "creates_backend_routes",
  "creates_frontend_ui",
  "creates_ingestion_jobs"
];

const FORBIDDEN_KEY_PATTERNS = [
  /^roi$/i,
  /^roi_output$/i,
  /^realized_roi$/i,
  /^ebita$/i,
  /^ebita_value$/i,
  /^ebita_claim$/i,
  /^productivity_score$/i,
  /^productivity_output$/i,
  /^productivity_claim$/i,
  /^causality$/i,
  /^causality_claim$/i,
  /^headcount_reduction_value$/i,
  /^headcount_reduction_claim$/i,
  /^financial_impact$/i,
  /^financial_output$/i,
  /^customer_facing_financial_output$/i,
  /^customer_facing_economic_output$/i,
  /^individual_attribution$/i,
  /^manager_or_team_ranking$/i,
  /^manager_ranking$/i,
  /^team_ranking$/i,
  /^people_decisioning$/i,
  /^raw_rows?$/i,
  /^raw_prompts?$/i,
  /^raw_responses?$/i,
  /^raw_transcripts?$/i,
  /^query_text$/i,
  /^sql_text$/i,
  /^file_contents?$/i,
  /^user_id$/i,
  /^employee_id$/i,
  /^employee_email$/i,
  /^employee_name$/i,
  /^person_id$/i,
  /^person_identifier$/i,
  /^hashed_(?:user|person|employee)_id$/i,
  /^joinable_(?:user|person|employee)_identifier$/i
];

const TRUE_ONLY_KEY_PATTERNS = [
  /^map_is_roi_proof$/i,
  /^map_is_productivity_proof$/i,
  /^map_is_financial_output$/i,
  /^map_computes_causality$/i,
  /^map_allows_person_or_team_comparison$/i,
  /^downstream_claim_strength_upgrade_allowed$/i,
  /^claim_readiness_snapshot$/i,
  /^executive_readout_snapshot$/i,
  /^reportability_readiness$/i,
  /^customer_facing_financial_output$/i,
  /^persisted$/i,
  /^creates_migrations$/i,
  /^creates_prisma_schema$/i,
  /^creates_backend_routes$/i,
  /^creates_frontend_ui$/i,
  /^creates_ingestion_jobs$/i
];

const EMAIL_VALUE_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

const UNSAFE_METADATA_VALUE_PATTERNS = [
  /(?:^|_)(?:raw_rows?|raw_query|raw_prompts?|raw_responses?|raw_transcripts?|raw_content)(?:_|$)/i,
  /(?:^|_)(?:prompt_text|query_text|sql_text|file_contents?)(?:_|$)/i,
  /(?:^|_)(?:employee_emails?|employee_names?|employee_ids?|user_emails?|user_names?|user_ids?|person_emails?|person_names?|person_ids?|person_identifiers?)(?:_|$)/i,
  /(?:^|_)(?:direct_identifiers?|direct_person_identifier|direct_names?)(?:_|$)/i,
  /(?:^|_)(?:hashed|joinable|pseudonymous|tokenized)_(?:ids?|identifiers?|users?|persons?|employees?)(?:_|$)/i,
  /(?:^|_)person_level_(?:productivity|hris|records?)(?:_|$)/i
];

const IDENTIFIER_METADATA_VALUE_PATTERNS = [
  /(?:^|_)(?:employee_emails?|employee_names?|employee_ids?|user_emails?|user_names?|user_ids?|person_emails?|person_names?|person_ids?|person_identifiers?)(?:_|$)/i,
  /(?:^|_)(?:direct_identifiers?|direct_person_identifier|direct_names?)(?:_|$)/i,
  /(?:^|_)(?:hashed|joinable|pseudonymous|tokenized)_(?:ids?|identifiers?|users?|persons?|employees?)(?:_|$)/i
];

const NEGATIVE_PRIVACY_CAVEAT_PATTERNS = [
  /\bno\b/i,
  /\bnot\b/i,
  /\bnever\b/i,
  /\bwithout\b/i,
  /\bblocked?\b/i,
  /\bexcluded?\b/i,
  /\bnot emitted\b/i,
  /\bare not emitted\b/i,
  /\bmust not\b/i,
  /\bcannot\b/i,
  /\bdoes not\b/i
];

export interface BuildVbdTokenEfficiencyMapOptions {
  mapId?: string;
  generatedAt?: string;
}

export interface VbdTokenEfficiencyMapValidationResult {
  schema_version: string;
  map_id: string | null;
  org_id: string | null;
  valid: boolean;
  gaps: string[];
}

function stringsOf(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
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

function normalizeKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function keyMatches(patterns: RegExp[], key: string): boolean {
  const normalized = normalizeKey(key);
  return patterns.some((pattern) => pattern.test(key) || pattern.test(normalized));
}

function evidenceState(value: any): string {
  return String(value?.evidence_state ?? "unknown");
}

function vbdDimensionState(value: any): string {
  const evidence = String(value?.evidence_state ?? "");
  if (["suppressed", "held", "not_computed"].includes(evidence)) {
    return evidence;
  }
  return String(value?.state ?? value?.evidence_state ?? "missing");
}

function positiveNumber(value: any): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0;
}

function snapshotMinimumCohortThreshold(snapshot: any): any {
  return snapshot?.privacy_boundary?.minimum_cohort_threshold ??
    snapshot?.aggregate_telemetry_summary?.k_min_summary?.minimum_cohort_threshold ??
    null;
}

function hasSuppressedVbdSlices(map: any): boolean {
  return [
    map?.velocity?.suppressed_or_unknown_slices,
    map?.breadth?.suppressed_or_unknown_slices,
    map?.depth?.suppressed_or_unknown_slices
  ].some((value) => positiveNumber(value) > 0);
}

function snapshotWorkflowFamily(snapshot: any): string | null {
  return snapshot?.workflow?.workflow_family ?? snapshot?.workflow_family ?? null;
}

function snapshotWorkflowName(snapshot: any): string | null {
  return snapshot?.workflow?.workflow_name ?? snapshot?.workflow_name ?? null;
}

function snapshotFunctionArea(snapshot: any): string | null {
  return snapshot?.workflow?.function_area ?? snapshot?.function_area ?? null;
}

function snapshotWindow(snapshot: any): any {
  return snapshot?.window
    ? {
        window_start: snapshot.window.window_start,
        window_end: snapshot.window.window_end
      }
    : snapshot?.covered_window ?? null;
}

function sameWindow(snapshot: any, tokenSignal: any): boolean {
  const window = snapshotWindow(snapshot);
  return window?.window_start === tokenSignal?.covered_window?.window_start &&
    window?.window_end === tokenSignal?.covered_window?.window_end;
}

function deriveVbdPosture(snapshot: any): string {
  const map = snapshot?.vbd_operating_map;
  if (!map) return "unknown";
  const states = [
    vbdDimensionState(map.velocity),
    vbdDimensionState(map.breadth),
    vbdDimensionState(map.depth),
    String(map.operating_mode ?? "missing")
  ];
  if (states.includes("suppressed")) return "suppressed";
  if (states.includes("held") ||
      states.includes("not_computed") ||
      states.includes("missing") ||
      hasSuppressedVbdSlices(map)) {
    return "held";
  }
  if (map.operating_mode === "high_fluency_flow") return "high_work_integration";
  if (map.depth?.state === "embedded" || map.breadth?.state === "broad") {
    return "emerging_work_integration";
  }
  if (
    map.depth?.state === "developing" ||
    map.breadth?.state === "emerging" ||
    ["fast_but_shallow", "deep_but_slow"].includes(String(map.operating_mode))
  ) {
    return "emerging_work_integration";
  }
  if (map.depth?.state === "shallow" || map.breadth?.state === "narrow") {
    return "shallow_work_integration";
  }
  return "unknown";
}

function deriveTokenPosture(signal: any): string {
  const state = evidenceState(signal);
  if (state === "suppressed") return "suppressed";
  if (["held", "not_computed"].includes(state)) return "held";
  if (!["present", "partial"].includes(state)) return "unknown";

  const summary = signal?.aggregate_token_summary ?? {};
  const highIntensityShare = Number(summary.high_intensity_workflow_share ?? 0);
  const averageTokensPerWorkflow = Number(summary.average_tokens_per_workflow ?? 0);
  if (highIntensityShare >= 0.5 || averageTokensPerWorkflow >= 5000) {
    return "high_intensity";
  }
  if (highIntensityShare >= 0.25 || averageTokensPerWorkflow >= 2500) {
    return "moderate";
  }
  return "efficient";
}

function deriveStrategyZone(vbdPosture: string, tokenPosture: string): string {
  if (
    ["held", "suppressed", "unknown"].includes(vbdPosture) ||
    ["held", "suppressed", "unknown"].includes(tokenPosture)
  ) {
    return "hold_for_evidence";
  }
  const highVbd = [
    "high_work_integration",
    "emerging_work_integration"
  ].includes(vbdPosture);
  const costReviewToken = ["high_intensity", "moderate"].includes(tokenPosture);
  if (highVbd && costReviewToken) return "optimize_cost";
  if (highVbd) return "replicate_pattern";
  if (tokenPosture === "high_intensity") return "mitigate_friction";
  return "activate_workflow";
}

function collectBindingGaps(snapshot: any, tokenSignal: any): string[] {
  const gaps: string[] = [];
  if (snapshot?.org_id !== tokenSignal?.org_id) {
    gaps.push("org_id must match between Evidence Snapshot and Token Efficiency Signal");
  }
  if (snapshotWorkflowFamily(snapshot) !== tokenSignal?.workflow_family) {
    gaps.push("workflow_family must match between Evidence Snapshot and Token Efficiency Signal");
  }
  if (!sameWindow(snapshot, tokenSignal)) {
    gaps.push("covered window must match between Evidence Snapshot and Token Efficiency Signal");
  }
  const snapshotGrain = snapshot?.privacy_boundary?.approved_aggregate_grain;
  if (snapshotGrain !== tokenSignal?.approved_aggregate_grain) {
    gaps.push("approved_aggregate_grain must match between Evidence Snapshot and Token Efficiency Signal");
  }
  const snapshotMinimum = snapshotMinimumCohortThreshold(snapshot);
  const tokenMinimum = tokenSignal?.minimum_cohort_threshold;
  if (
    snapshotMinimum !== undefined &&
    snapshotMinimum !== null &&
    tokenMinimum !== undefined &&
    tokenMinimum !== null &&
    Number(snapshotMinimum) !== Number(tokenMinimum)
  ) {
    gaps.push("minimum_cohort_threshold must match between Evidence Snapshot and Token Efficiency Signal");
  }
  const tokenPostureMinimum = tokenSignal?.k_min_posture?.minimum_cohort_threshold;
  if (
    snapshotMinimum !== undefined &&
    snapshotMinimum !== null &&
    tokenPostureMinimum !== undefined &&
    tokenPostureMinimum !== null &&
    Number(snapshotMinimum) !== Number(tokenPostureMinimum)
  ) {
    gaps.push("k_min_posture.minimum_cohort_threshold must match Evidence Snapshot minimum_cohort_threshold");
  }
  return gaps;
}

function collectForbiddenKeys(
  value: any,
  keys: string[] = [],
  path: string[] = []
): string[] {
  if (!value || typeof value !== "object") return keys;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectForbiddenKeys(item, keys, [...path, String(index)]));
    return keys;
  }
  for (const [key, nested] of Object.entries(value)) {
    const trueOnlyKey = keyMatches(TRUE_ONLY_KEY_PATTERNS, key);
    const disallowedKey = keyMatches(FORBIDDEN_KEY_PATTERNS, key);
    if (trueOnlyKey && nested === true) {
      keys.push([...path, key].join("."));
    } else if (disallowedKey && !trueOnlyKey) {
      keys.push([...path, key].join("."));
    }
    collectForbiddenKeys(nested, keys, [...path, key]);
  }
  return keys;
}

function isSafePolicyListPath(path: string[]): boolean {
  const normalizedPath = path.map(normalizeKey);
  return normalizedPath.length <= 2 &&
    (normalizedPath[0] === "allowed_uses" || normalizedPath[0] === "blocked_uses");
}

function isUnsafeMetadataValue(value: string): boolean {
  const normalizedValue = normalizeKey(value);
  return EMAIL_VALUE_PATTERN.test(value) ||
    UNSAFE_METADATA_VALUE_PATTERNS.some((pattern) => pattern.test(normalizedValue));
}

function containsDirectIdentifierValue(value: string): boolean {
  const normalizedValue = normalizeKey(value);
  return EMAIL_VALUE_PATTERN.test(value) ||
    IDENTIFIER_METADATA_VALUE_PATTERNS.some((pattern) => pattern.test(normalizedValue));
}

function isTopLevelCaveatPath(path: string[]): boolean {
  return normalizeKey(path[0] ?? "") === "caveats" && path.length <= 2;
}

function isNegativePrivacyCaveat(value: string): boolean {
  return NEGATIVE_PRIVACY_CAVEAT_PATTERNS.some((pattern) => pattern.test(value));
}

function collectUnsafeMetadataValues(
  value: any,
  values: string[] = [],
  path: string[] = []
): string[] {
  if (typeof value === "string") {
    const safeNegativeCaveat =
      isTopLevelCaveatPath(path) &&
      isNegativePrivacyCaveat(value) &&
      !containsDirectIdentifierValue(value);
    if (!isSafePolicyListPath(path) && !safeNegativeCaveat && isUnsafeMetadataValue(value)) {
      values.push(`${path.join(".")}: ${value}`);
    }
    return values;
  }
  if (!value || typeof value !== "object") return values;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectUnsafeMetadataValues(item, values, [...path, String(index)])
    );
    return values;
  }
  for (const [key, nested] of Object.entries(value)) {
    collectUnsafeMetadataValues(nested, values, [...path, key]);
  }
  return values;
}

function requiredCaveats(snapshot: any, tokenSignal: any): string[] {
  return unique([
    "VBD x Token Efficiency Map is aggregate strategy context only.",
    "Token usage is cost/intensity context and is not ROI, productivity, causality, or financial proof.",
    "VBD is Layer 1 work-integration posture and cannot create full Playbook coverage by itself.",
    ...stringsOf(snapshot?.required_caveats),
    ...stringsOf(tokenSignal?.caveats)
  ]);
}

function falseFeeds(): any {
  return {
    evidence_snapshot_context: true,
    claim_readiness_snapshot: false,
    executive_readout_snapshot: false,
    reportability_readiness: false,
    customer_facing_financial_output: false
  };
}

function persistencePolicy(): any {
  return {
    persisted: false,
    creates_migrations: false,
    creates_prisma_schema: false,
    creates_backend_routes: false,
    creates_frontend_ui: false,
    creates_ingestion_jobs: false
  };
}

export function buildVbdTokenEfficiencyMapFromEvidenceSnapshotAndTokenSignal(
  evidenceSnapshot: any,
  tokenEfficiencySignal: any,
  options: BuildVbdTokenEfficiencyMapOptions = {}
): any {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const snapshotValidation = validateEvidenceSnapshot(evidenceSnapshot);
  const tokenValidation = validateTokenEfficiencySignal(tokenEfficiencySignal);
  const gaps = [
    ...(!snapshotValidation.valid
      ? snapshotValidation.gaps.map((gap) => `evidence_snapshot: ${gap}`)
      : []),
    ...(!tokenValidation.valid
      ? tokenValidation.gaps.map((gap) => `token_efficiency_signal: ${gap}`)
      : []),
    ...collectBindingGaps(evidenceSnapshot, tokenEfficiencySignal)
  ];
  const hasBlockingGaps = gaps.length > 0;
  const vbdPosture = hasBlockingGaps ? "held" : deriveVbdPosture(evidenceSnapshot);
  const tokenPosture = hasBlockingGaps ? "held" : deriveTokenPosture(tokenEfficiencySignal);
  const strategyZone = hasBlockingGaps
    ? "hold_for_evidence"
    : deriveStrategyZone(vbdPosture, tokenPosture);
  const window = snapshotWindow(evidenceSnapshot);

  return {
    schema_version: AI_VALUE_VBD_TOKEN_EFFICIENCY_MAP_SCHEMA_VERSION,
    map_id: options.mapId ??
      `vbd_token_efficiency_map_${safeIdPart(String(evidenceSnapshot?.org_id ?? "unknown_org"))}_${safeIdPart(String(snapshotWorkflowFamily(evidenceSnapshot) ?? "unknown_workflow"))}`,
    org_id: evidenceSnapshot?.org_id ?? null,
    workflow_family: snapshotWorkflowFamily(evidenceSnapshot),
    workflow_name: snapshotWorkflowName(evidenceSnapshot),
    function_area: snapshotFunctionArea(evidenceSnapshot),
    covered_window: window,
    approved_aggregate_grain:
      evidenceSnapshot?.privacy_boundary?.approved_aggregate_grain ?? null,
    minimum_cohort_threshold:
      snapshotMinimumCohortThreshold(evidenceSnapshot) ??
      tokenEfficiencySignal?.minimum_cohort_threshold ??
      null,
    k_min_posture: tokenEfficiencySignal?.k_min_posture ?? null,
    valid: !hasBlockingGaps,
    gaps,
    vbd_posture: vbdPosture,
    token_posture: tokenPosture,
    strategy_zone: strategyZone,
    source_refs: {
      evidence_snapshot_id: evidenceSnapshot?.evidence_snapshot_id ?? null,
      token_efficiency_signal_id:
        tokenEfficiencySignal?.token_efficiency_signal_id ?? null,
      token_source_refs: tokenEfficiencySignal?.source_refs ?? {}
    },
    allowed_uses: [...SAFE_ALLOWED_USES],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    value_proof_policy: {
      map_is_roi_proof: false,
      map_is_productivity_proof: false,
      map_is_financial_output: false,
      map_computes_causality: false,
      map_allows_person_or_team_comparison: false,
      downstream_claim_strength_upgrade_allowed: false
    },
    feeds: falseFeeds(),
    persistence_policy: persistencePolicy(),
    caveats: requiredCaveats(evidenceSnapshot, tokenEfficiencySignal),
    generated_at: generatedAt,
    derivation_version: DERIVATION_VERSION
  };
}

export function validateVbdTokenEfficiencyMap(
  map: any
): VbdTokenEfficiencyMapValidationResult {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "map_id",
    "org_id",
    "workflow_family",
    "covered_window",
    "approved_aggregate_grain",
    "minimum_cohort_threshold",
    "k_min_posture",
    "valid",
    "gaps",
    "vbd_posture",
    "token_posture",
    "strategy_zone",
    "source_refs",
    "allowed_uses",
    "blocked_uses",
    "value_proof_policy",
    "feeds",
    "persistence_policy",
    "caveats",
    "generated_at",
    "derivation_version"
  ]) {
    if (map?.[field] === undefined || map?.[field] === null || map?.[field] === "") {
      gaps.push(`${field} is missing`);
    }
  }
  if (
    map?.schema_version &&
    map.schema_version !== AI_VALUE_VBD_TOKEN_EFFICIENCY_MAP_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${map.schema_version}`);
  }
  if (!ALLOWED_VBD_POSTURES.has(String(map?.vbd_posture))) {
    gaps.push(`vbd_posture has invalid value ${String(map?.vbd_posture)}`);
  }
  if (!ALLOWED_TOKEN_POSTURES.has(String(map?.token_posture))) {
    gaps.push(`token_posture has invalid value ${String(map?.token_posture)}`);
  }
  if (!ALLOWED_STRATEGY_ZONES.has(String(map?.strategy_zone))) {
    gaps.push(`strategy_zone has invalid value ${String(map?.strategy_zone)}`);
  }
  if (typeof map?.valid !== "boolean") {
    gaps.push("valid must be boolean");
  }
  if (!Array.isArray(map?.gaps)) {
    gaps.push("gaps must be an array");
  }
  if (map?.valid === true && Array.isArray(map?.gaps) && map.gaps.length > 0) {
    gaps.push("valid maps must not carry gaps");
  }
  if (map?.valid === false && String(map?.strategy_zone) !== "hold_for_evidence") {
    gaps.push("invalid maps must use strategy_zone hold_for_evidence");
  }
  if (map?.valid === false && Array.isArray(map?.gaps) && map.gaps.length === 0) {
    gaps.push("invalid maps must carry gaps");
  }
  const expectedStrategyZone = deriveStrategyZone(
    String(map?.vbd_posture ?? "unknown"),
    String(map?.token_posture ?? "unknown")
  );
  if (
    ALLOWED_VBD_POSTURES.has(String(map?.vbd_posture)) &&
    ALLOWED_TOKEN_POSTURES.has(String(map?.token_posture)) &&
    map?.strategy_zone !== expectedStrategyZone
  ) {
    gaps.push(
      `strategy_zone must be ${expectedStrategyZone} for vbd_posture ${String(map?.vbd_posture)} and token_posture ${String(map?.token_posture)}`
    );
  }
  if (Number(map?.minimum_cohort_threshold) < 5) {
    gaps.push("minimum_cohort_threshold must be at least 5");
  }
  if (map?.k_min_posture?.cohort_threshold_met === false &&
      String(map?.strategy_zone) !== "hold_for_evidence") {
    gaps.push("k-min failure must use strategy_zone hold_for_evidence");
  }
  for (const use of SAFE_ALLOWED_USES) {
    if (!stringsOf(map?.allowed_uses).includes(use)) {
      gaps.push(`allowed_uses missing ${use}`);
    }
  }
  for (const use of stringsOf(map?.allowed_uses)) {
    if (!SAFE_ALLOWED_USES.includes(use)) {
      gaps.push(`allowed_uses contains unsupported use: ${use}`);
    }
  }
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!stringsOf(map?.blocked_uses).includes(use)) {
      gaps.push(`blocked_uses missing ${use}`);
    }
  }
  for (const flag of REQUIRED_FALSE_VALUE_PROOF_FLAGS) {
    if (map?.value_proof_policy?.[flag] !== false) {
      gaps.push(`value_proof_policy.${flag} must be false`);
    }
  }
  for (const field of REQUIRED_FALSE_FEEDS) {
    if (map?.feeds?.[field] !== false) {
      gaps.push(`feeds.${field} must be false`);
    }
  }
  for (const field of REQUIRED_FALSE_PERSISTENCE_FIELDS) {
    if (map?.persistence_policy?.[field] !== false) {
      gaps.push(`persistence_policy.${field} must be false`);
    }
  }
  const forbiddenKeys = collectForbiddenKeys(map);
  if (forbiddenKeys.length > 0) {
    gaps.push(`Forbidden field(s) present: ${Array.from(new Set(forbiddenKeys)).sort().join(", ")}`);
  }
  const unsafeMetadataValues = collectUnsafeMetadataValues(map);
  if (unsafeMetadataValues.length > 0) {
    gaps.push(
      `Forbidden metadata value(s) present: ${Array.from(new Set(unsafeMetadataValues)).sort().join(", ")}`
    );
  }
  if (!Array.isArray(map?.caveats) || map.caveats.length === 0) {
    gaps.push("caveats must contain at least one caveat");
  }
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    map_id: map?.map_id ?? null,
    org_id: map?.org_id ?? null,
    valid: gaps.length === 0,
    gaps
  };
}
