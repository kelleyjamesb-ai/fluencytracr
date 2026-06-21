/**
 * AI Value Engine - VBD x Token Pilot Runner.
 *
 * Aggregate-only pilot orchestration for comparing VBD work-integration posture
 * with Token Efficiency posture across approved time windows. This runner emits
 * movement and intervention posture only; it does not persist, create routes/UI,
 * ingest data, feed reportability, compute ROI, prove causality, measure
 * productivity, rank people or groups, or create financial output.
 */

import {
  buildVbdTokenEfficiencyMapFromEvidenceSnapshotAndTokenSignal,
  validateVbdTokenEfficiencyMap
} from "./vbdTokenEfficiencyMap";

export const AI_VALUE_VBD_TOKEN_PILOT_RUN_SCHEMA_VERSION =
  "FT_AI_VALUE_VBD_TOKEN_PILOT_RUN_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_VBD_TOKEN_PILOT_RUN_VALIDATION_2026_06";

const DERIVATION_VERSION =
  "ai_value_vbd_token_pilot_runner_2026_06";

const SAFE_ALLOWED_USES = [
  "aggregate_strategy_planning",
  "pilot_rehearsal",
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
  "pilot_run_is_roi_proof",
  "pilot_run_is_productivity_proof",
  "pilot_run_is_financial_output",
  "pilot_run_computes_causality",
  "pilot_run_allows_person_or_team_comparison",
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

const ALLOWED_DECISIONS = new Set([
  "ready_for_strategy_review",
  "hold_for_more_windows",
  "hold_for_evidence"
]);

const ALLOWED_MOTIONS = new Set([
  "replicate_governed_pattern",
  "optimize_cost",
  "activate_workflow",
  "mitigate_friction",
  "hold_for_evidence"
]);

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
  /^pilot_run_is_roi_proof$/i,
  /^pilot_run_is_productivity_proof$/i,
  /^pilot_run_is_financial_output$/i,
  /^pilot_run_computes_causality$/i,
  /^pilot_run_allows_person_or_team_comparison$/i,
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
  /^creates_ingestion_jobs$/i,
  /^contains_direct_identifiers$/i,
  /^contains_raw_content$/i,
  /^contains_raw_rows$/i,
  /^contains_raw_files$/i,
  /^contains_raw_prompts$/i,
  /^contains_raw_responses$/i,
  /^contains_transcripts$/i,
  /^contains_query_text$/i,
  /^contains_file_contents$/i,
  /^contains_person_level_productivity$/i,
  /^contains_person_level_hris_records$/i,
  /^contains_hashed_or_joinable_person_identifiers$/i,
  /^contains_manager_or_team_ranking$/i,
  /^contains_people_decisioning$/i,
  /^contains_compensation_or_performance_inference$/i,
  /^contains_promotion_or_discipline_inference$/i,
  /^contains_attrition_prediction$/i,
  /^contains_hris_inference_from_ai_usage$/i
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

export interface BuildVbdTokenPilotRunWindowInput {
  window_id: string;
  window_label?: string;
  evidence_snapshot: any;
  token_efficiency_signal: any;
}

export interface BuildVbdTokenPilotRunInput {
  pilotRunId?: string;
  orgId?: string;
  workflowFamily?: string;
  workflowName?: string;
  functionArea?: string;
  generatedAt?: string;
  pilotScope?: any;
  windows: BuildVbdTokenPilotRunWindowInput[];
}

export interface VbdTokenPilotRunValidationResult {
  schema_version: string;
  pilot_run_id: string | null;
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

function workflowFamilyOf(snapshot: any): string | null {
  return snapshot?.workflow?.workflow_family ?? snapshot?.workflow_family ?? null;
}

function workflowNameOf(snapshot: any): string | null {
  return snapshot?.workflow?.workflow_name ?? snapshot?.workflow_name ?? null;
}

function functionAreaOf(snapshot: any): string | null {
  return snapshot?.workflow?.function_area ?? snapshot?.function_area ?? null;
}

function windowOf(snapshot: any): any {
  return snapshot?.window
    ? {
        window_start: snapshot.window.window_start,
        window_end: snapshot.window.window_end
      }
    : snapshot?.covered_window ?? null;
}

function tokenSummaryOf(signal: any): any {
  const summary = signal?.aggregate_token_summary ?? {};
  return {
    total_tokens: finiteOrNull(summary.total_tokens),
    aggregate_interaction_count: finiteOrNull(summary.aggregate_interaction_count),
    aggregate_workflow_count: finiteOrNull(summary.aggregate_workflow_count),
    high_intensity_workflow_share:
      finiteOrNull(summary.high_intensity_workflow_share),
    average_tokens_per_interaction:
      finiteOrNull(summary.average_tokens_per_interaction),
    average_tokens_per_workflow:
      finiteOrNull(summary.average_tokens_per_workflow)
  };
}

function finiteOrNull(value: any): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function pctChange(first: number | null, last: number | null): number | null {
  if (first === null || last === null || first === 0) return null;
  return Number(((last - first) / first).toFixed(4));
}

function numericChange(first: number | null, last: number | null): number | null {
  if (first === null || last === null) return null;
  return Number((last - first).toFixed(4));
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

function collectUnsafeMetadataValues(
  value: any,
  values: string[] = [],
  path: string[] = []
): string[] {
  if (typeof value === "string") {
    if (!isSafePolicyListPath(path) && isUnsafeMetadataValue(value)) {
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

function falseFeeds(): any {
  return {
    evidence_snapshot_context: true,
    vbd_token_efficiency_maps: true,
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

function defaultPilotScope(input: BuildVbdTokenPilotRunInput): any {
  const first = Array.isArray(input.windows) ? input.windows[0] : undefined;
  const snapshot = first?.evidence_snapshot;
  return {
    population_label: null,
    users_in_scope: null,
    approved_aggregate_grain:
      snapshot?.privacy_boundary?.approved_aggregate_grain ?? null,
    minimum_cohort_threshold:
      snapshot?.privacy_boundary?.minimum_cohort_threshold ?? null,
    synthetic_fixture: false
  };
}

function compareWindowInputs(
  a: BuildVbdTokenPilotRunWindowInput,
  b: BuildVbdTokenPilotRunWindowInput
): number {
  const aWindow = windowOf(a.evidence_snapshot);
  const bWindow = windowOf(b.evidence_snapshot);
  const aStart = String(aWindow?.window_start ?? "");
  const bStart = String(bWindow?.window_start ?? "");
  if (aStart !== bStart) return aStart < bStart ? -1 : 1;
  const aEnd = String(aWindow?.window_end ?? "");
  const bEnd = String(bWindow?.window_end ?? "");
  if (aEnd !== bEnd) return aEnd < bEnd ? -1 : 1;
  return String(a.window_id).localeCompare(String(b.window_id));
}

function duplicateWindowIds(windows: BuildVbdTokenPilotRunWindowInput[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const window of windows) {
    const id = String(window?.window_id ?? "");
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return [...duplicates].filter((id) => id !== "");
}

function buildWindowSequence(
  input: BuildVbdTokenPilotRunInput,
  generatedAt: string
): any[] {
  const windows = Array.isArray(input.windows) ? input.windows : [];
  return [...windows].sort(compareWindowInputs).map((windowInput) => {
    const map = buildVbdTokenEfficiencyMapFromEvidenceSnapshotAndTokenSignal(
      windowInput.evidence_snapshot,
      windowInput.token_efficiency_signal,
      {
        mapId: `vbd_token_efficiency_map_${safeIdPart(
          input.pilotRunId ?? "pilot_run"
        )}_${safeIdPart(String(windowInput.window_id ?? "window"))}`,
        generatedAt
      }
    );
    return {
      window_id: windowInput.window_id,
      window_label: windowInput.window_label ?? null,
      covered_window: map.covered_window,
      evidence_snapshot_id:
        windowInput.evidence_snapshot?.evidence_snapshot_id ?? null,
      token_efficiency_signal_id:
        windowInput.token_efficiency_signal?.token_efficiency_signal_id ?? null,
      vbd_posture: map.vbd_posture,
      token_posture: map.token_posture,
      strategy_zone: map.strategy_zone,
      token_summary: tokenSummaryOf(windowInput.token_efficiency_signal),
      vbd_token_efficiency_map: map,
      caveats: map.caveats
    };
  });
}

function windowBindingValue(window: any): any {
  const map = window?.vbd_token_efficiency_map ?? {};
  return {
    org_id: map.org_id ?? null,
    workflow_family: map.workflow_family ?? null,
    function_area: map.function_area ?? null,
    approved_aggregate_grain: map.approved_aggregate_grain ?? null,
    minimum_cohort_threshold: map.minimum_cohort_threshold ?? null
  };
}

function collectWindowBindingGaps(windowSequence: any[]): string[] {
  const gaps: string[] = [];
  const first = windowBindingValue(windowSequence[0]);
  windowSequence.forEach((window, index) => {
    if (index === 0) return;
    const current = windowBindingValue(window);
    for (const field of Object.keys(first)) {
      if (current[field] !== first[field]) {
        gaps.push(`window_sequence[${index}].${field} must match baseline window`);
      }
    }
  });
  return gaps;
}

function collectWindowMapSummaryGaps(window: any, index: number): string[] {
  const gaps: string[] = [];
  const map = window?.vbd_token_efficiency_map ?? {};
  for (const field of ["vbd_posture", "token_posture", "strategy_zone"]) {
    if (window?.[field] !== map?.[field]) {
      gaps.push(`window_sequence[${index}].${field} must match embedded vbd_token_efficiency_map.${field}`);
    }
  }
  return gaps;
}

function collectBuildGaps(
  input: BuildVbdTokenPilotRunInput,
  windowSequence: any[]
): string[] {
  const gaps: string[] = [];
  if (!Array.isArray(input.windows)) {
    return ["windows must be an array"];
  }
  if (input.windows.length < 2) {
    gaps.push("Pilot runner requires at least two windows to show movement over time.");
  }
  for (const duplicate of duplicateWindowIds(input.windows)) {
    gaps.push(`Duplicate window_id cannot build a pilot run: ${duplicate}`);
  }
  const unsafePilotScopeValues = collectUnsafeMetadataValues(input.pilotScope ?? {}, [], ["pilot_scope"]);
  if (unsafePilotScopeValues.length > 0) {
    gaps.push(
      `Forbidden metadata value(s) present: ${Array.from(new Set(unsafePilotScopeValues)).sort().join(", ")}`
    );
  }
  gaps.push(...collectWindowBindingGaps(windowSequence));
  for (const [index, window] of windowSequence.entries()) {
    const mapValidation = validateVbdTokenEfficiencyMap(window.vbd_token_efficiency_map);
    if (!mapValidation.valid) {
      gaps.push(
        `window_sequence[${index}].vbd_token_efficiency_map is invalid: ${mapValidation.gaps.join("; ")}`
      );
    }
    if (window.vbd_token_efficiency_map?.valid === false) {
      gaps.push(
        `window_sequence[${index}] held by map gap(s): ${stringsOf(
          window.vbd_token_efficiency_map?.gaps
        ).join("; ")}`
      );
    }
    gaps.push(...collectWindowMapSummaryGaps(window, index));
  }
  return gaps;
}

function movementSummary(windowSequence: any[]): any {
  const first = windowSequence[0] ?? null;
  const last = windowSequence[windowSequence.length - 1] ?? null;
  const firstSummary = first?.token_summary ?? {};
  const lastSummary = last?.token_summary ?? {};

  return {
    baseline_window_id: first?.window_id ?? null,
    comparison_window_id: last?.window_id ?? null,
    strategy_transition:
      first && last ? `${first.strategy_zone}_to_${last.strategy_zone}` : null,
    vbd_posture_transition:
      first && last ? `${first.vbd_posture}_to_${last.vbd_posture}` : null,
    token_posture_transition:
      first && last ? `${first.token_posture}_to_${last.token_posture}` : null,
    total_tokens_change_pct:
      pctChange(firstSummary.total_tokens, lastSummary.total_tokens),
    average_tokens_per_workflow_change_pct:
      pctChange(
        firstSummary.average_tokens_per_workflow,
        lastSummary.average_tokens_per_workflow
      ),
    high_intensity_workflow_share_change:
      numericChange(
        firstSummary.high_intensity_workflow_share,
        lastSummary.high_intensity_workflow_share
      ),
    interpretation:
      "Aggregate VBD and token movement is strategy context only; customer-owned outcome evidence is still required for value claims."
  };
}

function motionFor(finalZone: string, hasGaps: boolean): any {
  if (hasGaps || finalZone === "hold_for_evidence") {
    return {
      motion: "hold_for_evidence",
      rationale:
        "Do not advance the pilot readout until missing, held, invalid, or suppressed evidence is resolved."
    };
  }
  if (finalZone === "replicate_pattern") {
    return {
      motion: "replicate_governed_pattern",
      rationale:
        "The approved aggregate workflow pattern shows stronger work integration without high token intensity; replicate only inside the approved pilot scope."
    };
  }
  if (finalZone === "optimize_cost") {
    return {
      motion: "optimize_cost",
      rationale:
        "The approved aggregate workflow pattern shows work integration with high token intensity; review prompts, workflow design, and model routing."
    };
  }
  if (finalZone === "activate_workflow") {
    return {
      motion: "activate_workflow",
      rationale:
        "Token posture is not the main blocker; focus enablement and workflow design on increasing meaningful use."
    };
  }
  return {
    motion: "mitigate_friction",
    rationale:
      "Token intensity is high while VBD posture is shallow; review workflow friction, prompt quality, routing, and support needs."
  };
}

function caveatsFor(windowSequence: any[]): string[] {
  return unique([
    "VBD x Token Pilot Run is aggregate strategy context only.",
    "VBD and token usage together are not ROI proof, productivity proof, causality proof, EBITA proof, headcount proof, or customer-facing financial output.",
    "Customer-owned Layer 2, Layer 3, governance, and assumption evidence are still required before full Playbook-backed value claims.",
    "No individual attribution, manager ranking, team ranking, or people decisioning is supported.",
    ...windowSequence.flatMap((window) => stringsOf(window.caveats))
  ]);
}

function decisionFor(gaps: string[], windowSequence: any[]): string {
  if (gaps.some((gap) => /at least two windows/i.test(gap))) {
    return "hold_for_more_windows";
  }
  if (
    gaps.length > 0 ||
    windowSequence.some((window) => window.strategy_zone === "hold_for_evidence")
  ) {
    return "hold_for_evidence";
  }
  return "ready_for_strategy_review";
}

export function buildVbdTokenPilotRunFromWindowEvidence(
  input: BuildVbdTokenPilotRunInput
): any {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const windowSequence = buildWindowSequence(input, generatedAt);
  const gaps = collectBuildGaps(input, windowSequence);
  const pilotDecision = decisionFor(gaps, windowSequence);
  const finalZone =
    windowSequence[windowSequence.length - 1]?.strategy_zone ?? "hold_for_evidence";
  const motion = motionFor(finalZone, pilotDecision !== "ready_for_strategy_review");
  const firstSnapshot = Array.isArray(input.windows)
    ? input.windows[0]?.evidence_snapshot ?? null
    : null;
  const pilotScope = {
    ...defaultPilotScope(input),
    ...(input.pilotScope ?? {})
  };

  return {
    schema_version: AI_VALUE_VBD_TOKEN_PILOT_RUN_SCHEMA_VERSION,
    pilot_run_id: input.pilotRunId ??
      `vbd_token_pilot_run_${safeIdPart(String(input.orgId ?? firstSnapshot?.org_id ?? "unknown_org"))}_${safeIdPart(String(input.workflowFamily ?? workflowFamilyOf(firstSnapshot) ?? "unknown_workflow"))}`,
    org_id: input.orgId ?? firstSnapshot?.org_id ?? null,
    workflow_family:
      input.workflowFamily ?? workflowFamilyOf(firstSnapshot),
    workflow_name:
      input.workflowName ?? workflowNameOf(firstSnapshot),
    function_area:
      input.functionArea ?? functionAreaOf(firstSnapshot),
    generated_at: generatedAt,
    pilot_scope: pilotScope,
    approved_aggregate_grain: pilotScope.approved_aggregate_grain ?? null,
    minimum_cohort_threshold: pilotScope.minimum_cohort_threshold ?? null,
    valid: gaps.length === 0,
    gaps,
    pilot_decision: pilotDecision,
    window_count: windowSequence.length,
    window_sequence: windowSequence,
    movement_summary: movementSummary(windowSequence),
    recommended_next_motion: motion,
    allowed_uses: [...SAFE_ALLOWED_USES],
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    value_proof_policy: {
      pilot_run_is_roi_proof: false,
      pilot_run_is_productivity_proof: false,
      pilot_run_is_financial_output: false,
      pilot_run_computes_causality: false,
      pilot_run_allows_person_or_team_comparison: false,
      downstream_claim_strength_upgrade_allowed: false
    },
    feeds: falseFeeds(),
    persistence_policy: persistencePolicy(),
    caveats: caveatsFor(windowSequence),
    derivation_version: DERIVATION_VERSION
  };
}

export function validateVbdTokenPilotRun(
  run: any
): VbdTokenPilotRunValidationResult {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "pilot_run_id",
    "org_id",
    "workflow_family",
    "generated_at",
    "pilot_scope",
    "approved_aggregate_grain",
    "minimum_cohort_threshold",
    "valid",
    "gaps",
    "pilot_decision",
    "window_count",
    "window_sequence",
    "movement_summary",
    "recommended_next_motion",
    "allowed_uses",
    "blocked_uses",
    "value_proof_policy",
    "feeds",
    "persistence_policy",
    "caveats",
    "derivation_version"
  ]) {
    if (run?.[field] === undefined || run?.[field] === null || run?.[field] === "") {
      gaps.push(`${field} is missing`);
    }
  }
  if (
    run?.schema_version &&
    run.schema_version !== AI_VALUE_VBD_TOKEN_PILOT_RUN_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${run.schema_version}`);
  }
  if (typeof run?.valid !== "boolean") {
    gaps.push("valid must be boolean");
  }
  if (!Array.isArray(run?.gaps)) {
    gaps.push("gaps must be an array");
  }
  if (run?.valid === false && Array.isArray(run?.gaps) && run.gaps.length === 0) {
    gaps.push("invalid pilot runs must carry gaps");
  }
  if (run?.valid === true && Array.isArray(run?.gaps) && run.gaps.length > 0) {
    gaps.push("valid pilot runs must not carry gaps");
  }
  if (!ALLOWED_DECISIONS.has(String(run?.pilot_decision))) {
    gaps.push(`pilot_decision has invalid value ${String(run?.pilot_decision)}`);
  }
  const expectedPilotDecision = decisionFor(
    Array.isArray(run?.gaps) ? run.gaps : [],
    Array.isArray(run?.window_sequence) ? run.window_sequence : []
  );
  if (
    ALLOWED_DECISIONS.has(String(run?.pilot_decision)) &&
    run?.pilot_decision !== expectedPilotDecision
  ) {
    gaps.push(`pilot_decision must be ${expectedPilotDecision}`);
  }
  if (
    run?.valid === false &&
    !["hold_for_more_windows", "hold_for_evidence"].includes(String(run?.pilot_decision))
  ) {
    gaps.push("invalid pilot runs must use a hold pilot_decision");
  }
  if (Number(run?.minimum_cohort_threshold) < 5) {
    gaps.push("minimum_cohort_threshold must be at least 5");
  }
  const usersInScope = finiteOrNull(run?.pilot_scope?.users_in_scope);
  const minimumCohortThreshold = finiteOrNull(run?.minimum_cohort_threshold);
  if (
    usersInScope !== null &&
    minimumCohortThreshold !== null &&
    usersInScope < minimumCohortThreshold
  ) {
    gaps.push("pilot_scope.users_in_scope must be at least minimum_cohort_threshold when provided");
  }
  if (!Array.isArray(run?.window_sequence)) {
    gaps.push("window_sequence must be an array");
  } else {
    if (run.window_count !== run.window_sequence.length) {
      gaps.push("window_count must match window_sequence length");
    }
    run.window_sequence.forEach((window: any, index: number) => {
      for (const field of [
        "window_id",
        "covered_window",
        "evidence_snapshot_id",
        "token_efficiency_signal_id",
        "vbd_posture",
        "token_posture",
        "strategy_zone",
        "token_summary",
        "vbd_token_efficiency_map",
        "caveats"
      ]) {
        if (window?.[field] === undefined || window?.[field] === null || window?.[field] === "") {
          gaps.push(`window_sequence[${index}].${field} is missing`);
        }
      }
      const mapValidation = validateVbdTokenEfficiencyMap(window?.vbd_token_efficiency_map);
      if (!mapValidation.valid) {
        gaps.push(
          `window_sequence[${index}].vbd_token_efficiency_map is invalid: ${mapValidation.gaps.join("; ")}`
        );
      }
      gaps.push(...collectWindowMapSummaryGaps(window, index));
    });
    gaps.push(...collectWindowBindingGaps(run.window_sequence));
  }
  if (!ALLOWED_MOTIONS.has(String(run?.recommended_next_motion?.motion))) {
    gaps.push(
      `recommended_next_motion.motion has invalid value ${String(run?.recommended_next_motion?.motion)}`
    );
  }
  for (const use of SAFE_ALLOWED_USES) {
    if (!stringsOf(run?.allowed_uses).includes(use)) {
      gaps.push(`allowed_uses missing ${use}`);
    }
  }
  for (const use of stringsOf(run?.allowed_uses)) {
    if (!SAFE_ALLOWED_USES.includes(use)) {
      gaps.push(`allowed_uses contains unsupported use: ${use}`);
    }
  }
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!stringsOf(run?.blocked_uses).includes(use)) {
      gaps.push(`blocked_uses missing ${use}`);
    }
  }
  for (const flag of REQUIRED_FALSE_VALUE_PROOF_FLAGS) {
    if (run?.value_proof_policy?.[flag] !== false) {
      gaps.push(`value_proof_policy.${flag} must be false`);
    }
  }
  for (const field of REQUIRED_FALSE_FEEDS) {
    if (run?.feeds?.[field] !== false) {
      gaps.push(`feeds.${field} must be false`);
    }
  }
  for (const field of REQUIRED_FALSE_PERSISTENCE_FIELDS) {
    if (run?.persistence_policy?.[field] !== false) {
      gaps.push(`persistence_policy.${field} must be false`);
    }
  }
  const forbiddenKeys = collectForbiddenKeys(run);
  if (forbiddenKeys.length > 0) {
    gaps.push(`Forbidden field(s) present: ${Array.from(new Set(forbiddenKeys)).sort().join(", ")}`);
  }
  const unsafeMetadataValues = collectUnsafeMetadataValues(run);
  if (unsafeMetadataValues.length > 0) {
    gaps.push(
      `Forbidden metadata value(s) present: ${Array.from(new Set(unsafeMetadataValues)).sort().join(", ")}`
    );
  }
  if (!Array.isArray(run?.caveats) || run.caveats.length === 0) {
    gaps.push("caveats must contain at least one caveat");
  }

  return {
    schema_version: RESULT_SCHEMA_VERSION,
    pilot_run_id: run?.pilot_run_id ?? null,
    org_id: run?.org_id ?? null,
    valid: gaps.length === 0,
    gaps
  };
}
