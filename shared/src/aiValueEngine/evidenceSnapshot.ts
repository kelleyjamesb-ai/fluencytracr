/**
 * AI Value Engine — Evidence Snapshot.
 *
 * Defines the contract-only aggregate posture object that sits before claim
 * readiness and executive readouts. It captures what evidence is available,
 * missing, held, suppressed, or caveated for a workflow window. It does not
 * persist data, compute ROI, prove causality, score people, or create customer-
 * facing financial output.
 */

export const EVIDENCE_SNAPSHOT_SCHEMA_VERSION =
  "FT_AI_VALUE_EVIDENCE_SNAPSHOT_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_EVIDENCE_SNAPSHOT_VALIDATION_2026_06";

const REQUIRED_LANES = [
  "surface_usage",
  "skill_lifecycle",
  "agent_lifecycle",
  "mcp_action_boundary",
  "artifact_output",
  "control_evidence",
  "assumptions"
] as const;

const REQUIRED_PLAYBOOK_LAYERS = [
  "layer_1_platform_telemetry",
  "layer_2_user_voice_empirical",
  "layer_3_business_system_outcomes",
  "governance_evidence",
  "assumption_evidence"
] as const;

const ALLOWED_COVERAGE_STATUSES = new Set([
  "layer_1_only",
  "layer_1_plus_partial_layer_2",
  "layer_1_plus_partial_layer_3",
  "layer_1_plus_layer_2_and_layer_3",
  "full_playbook_coverage",
  "held_for_customer_exports",
  "held_for_governance"
]);

const EXPECTED_COVERAGE_SIGNALS: Record<string, string[]> = {
  layer_1_platform_telemetry: [
    "workflow_run_count",
    "search_activity",
    "chat_or_assistant_activity",
    "ai_answer_activity",
    "active_user_aggregate",
    "eligible_cohort_size",
    "connector_or_source_coverage",
    "skill_lifecycle_activity",
    "agent_lifecycle_activity",
    "artifact_output_metadata",
    "mcp_action_boundary_metadata",
    "control_or_policy_telemetry",
    "suppression_or_blocked_event_posture"
  ],
  layer_2_user_voice_empirical: [
    "aggregate_ai_fluency_baseline",
    "aggregate_ai_fluency_retest",
    "aggregate_confidence_or_readiness_survey",
    "aggregate_knowledge_access_satisfaction",
    "aggregate_workflow_observation",
    "aggregate_qualitative_proof_points",
    "customer_approved_time_and_motion_summary"
  ],
  layer_3_business_system_outcomes: [
    "customer_attested_kpi_baseline",
    "customer_attested_kpi_comparison",
    "source_system_name",
    "source_owner_attestation",
    "metric_owner_review",
    "finance_or_business_owner_approval",
    "aggregate_outcome_metric_movement",
    "minimum_cohort_threshold",
    "system_of_record_export_availability"
  ],
  governance_evidence: [
    "suppression_state",
    "k_min_posture",
    "source_readiness_state",
    "data_boundary_state",
    "approved_aggregate_grain",
    "held_suppressed_missing_lanes",
    "forbidden_field_checks",
    "raw_content_exclusion"
  ],
  assumption_evidence: [
    "customer_owned_assumptions",
    "productivity_recapture_assumption_if_relevant",
    "aggregate_workforce_context_approval_if_provided",
    "financial_assumption_approval_if_requested",
    "low_confidence_assumptions",
    "high_sensitivity_assumptions",
    "customer_facing_approval_state"
  ]
};

const LAYER_2_REQUIRED_SOURCE_EXPORTS = [
  "aggregate_ai_fluency_baseline",
  "aggregate_ai_fluency_retest",
  "aggregate_user_voice_or_workflow_observation"
];

const LAYER_3_REQUIRED_SOURCE_EXPORTS = [
  "customer_attested_kpi_baseline",
  "customer_attested_kpi_comparison",
  "system_of_record_outcome_export"
];

const ASSUMPTION_REQUIRED_APPROVALS = [
  "customer_owned_assumptions",
  "finance_or_business_owner_approval",
  "aggregate_workforce_context_approval_if_used"
];

const ALLOWED_SNAPSHOT_TYPES = new Set([
  "TELEMETRY_SOURCE_AVAILABILITY",
  "TELEMETRY_ONLY_CAVEATED",
  "LAYER_1_PLUS_LAYER_2",
  "LAYER_1_PLUS_LAYER_3",
  "FULL_STACK_EVIDENCE",
  "HELD_FOR_GOVERNANCE"
]);

const ALLOWED_CLASSIFICATIONS = new Set([
  "available_now",
  "partially_available",
  "derivable_with_existing_data",
  "requires_customer_export",
  "requires_new_instrumentation",
  "not_available",
  "unknown"
]);

const ALLOWED_EVIDENCE_STATES = new Set([
  "present",
  "partial",
  "missing",
  "held",
  "suppressed",
  "not_computed"
]);

const ALLOWED_PLAYBOOK_LAYER_VALUES = new Set(REQUIRED_PLAYBOOK_LAYERS);
const ALLOWED_CONFIDENCE_VALUES = new Set(["high", "medium", "low", "unknown"]);

const ALLOWED_WORKFORCE_CONTEXT_STATES = new Set([
  "not_provided",
  "provided_aggregate_safe",
  "held_for_approval",
  "suppressed",
  "blocked"
]);

const ALLOWED_WORKFORCE_SOURCE_TYPES = new Set([
  "aggregate_hris_derived_context",
  "aggregate_workforce_export",
  "aggregate_training_export",
  "aggregate_new_hire_cohort_export",
  "aggregate_capacity_planning_export",
  "customer_attested_assumption",
  "not_applicable"
]);

const ALLOWED_WORKFORCE_CONTEXT_TYPES = new Set([
  "aggregate_role_family_context",
  "aggregate_new_hire_cohort_context",
  "aggregate_training_completion_context",
  "aggregate_capacity_planning_context",
  "aggregate_time_to_productivity_context",
  "aggregate_hiring_plan_context"
]);

const ALLOWED_VBD_VELOCITY_STATES = new Set([
  "missing",
  "low",
  "moderate",
  "high",
  "not_computed",
  "suppressed"
]);

const ALLOWED_VBD_BREADTH_STATES = new Set([
  "missing",
  "narrow",
  "emerging",
  "broad",
  "not_computed",
  "suppressed"
]);

const ALLOWED_VBD_DEPTH_STATES = new Set([
  "missing",
  "shallow",
  "developing",
  "embedded",
  "not_computed",
  "suppressed"
]);

const ALLOWED_VBD_OPERATING_MODES = new Set([
  "low_integration",
  "fast_but_shallow",
  "deep_but_slow",
  "high_fluency_flow",
  "not_computed",
  "suppressed"
]);

const ALLOWED_VBD_INTERPRETATIONS = new Set([
  "ai_fluency_posture",
  "aggregate_ai_work_maturity_posture",
  "layer_1_operating_signal",
  "evidence_collection_planning",
  "source_availability_context",
  "claim_blocking_context"
]);

const UNSAFE_VBD_SIGNAL_PATTERNS = [
  /direct[_\s-]?identifier/i,
  /employee[_\s-]?id/i,
  /person[_\s-]?level/i,
  /individual[_\s-]?attribution/i,
  /manager[_\s-]?ranking/i,
  /team[_\s-]?ranking/i,
  /manager[_\s-]?chain/i,
  /people[_\s-]?decisioning/i,
  /hris[_\s-]?(?:outcome|inference|record)/i,
  /compensation/i,
  /performance/i,
  /promotion/i,
  /discipline/i,
  /attrition/i,
  /hashed|joinable|pseudonymous|tokenized/i,
  /raw[_\s-]?(?:row|content|prompt|response|transcript)/i
];

const ALLOWED_APPROVAL_STATES = new Set([
  "missing",
  "submitted",
  "approved",
  "rejected",
  "not_required"
]);

const HOLD_READINESS_DECISIONS = new Set([
  "HOLD_FOR_CUSTOMER_EXPORTS",
  "HOLD_FOR_NEW_INSTRUMENTATION",
  "HOLD_FOR_GOVERNANCE_APPROVAL"
]);

const EXECUTIVE_READY_SNAPSHOT_TYPES = new Set([
  "LAYER_1_PLUS_LAYER_3",
  "FULL_STACK_EVIDENCE"
]);

const TELEMETRY_ONLY_SNAPSHOT_TYPES = new Set([
  "TELEMETRY_SOURCE_AVAILABILITY",
  "TELEMETRY_ONLY_CAVEATED"
]);

const REQUIRED_TELEMETRY_BLOCKED_USES = [
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

const UNSAFE_ALLOWED_USE_PATTERNS = [
  /(^|[_\s-])roi($|[_\s-])/i,
  /ebita/i,
  /causality|causal/i,
  /productivity/i,
  /headcount/i,
  /individual[_\s-]?attribution|individual/i,
  /manager[_\s-]?(?:or[_\s-]?team[_\s-]?)?ranking/i,
  /team[_\s-]?ranking/i,
  /people[_\s-]?decisioning/i,
  /customer[_\s-]?facing[_\s-]?financial/i
];

const FORBIDDEN_FIELD_KEY_PATTERNS = [
  /(^|_)user(?:_id|_email)?($|_)/i,
  /email/i,
  /employee_id/i,
  /employee_email/i,
  /employee_name/i,
  /employee_record/i,
  /employee_identifier/i,
  /direct_employee_identifier/i,
  /hashed_employee_id/i,
  /hashed_user_id/i,
  /hashed_person_id/i,
  /pseudonymous_(?:employee|person|user)_identifier/i,
  /tokenized_(?:employee|person|user)_identifier/i,
  /joinable_(?:employee|person|user)_identifier/i,
  /person_id/i,
  /person_identifier/i,
  /person_level_hris/i,
  /person_level_(?:data|record|productivity|analytics)/i,
  /named_employee_productivity/i,
  /manager_chain/i,
  /manager_id/i,
  /manager_view/i,
  /manager_ranking/i,
  /team_ranking/i,
  /team_or_manager_ranking/i,
  /manager_or_team_ranking/i,
  /raw_rows/i,
  /raw_content/i,
  /query_text/i,
  /sql_text/i,
  /warehouse_query/i,
  /raw_table/i,
  /raw_dataset/i,
  /table_name/i,
  /prompt/i,
  /response/i,
  /transcript/i,
  /file_content/i,
  /people_decisioning/i,
  /compensation/i,
  /performance_rating/i,
  /promotion/i,
  /discipline/i,
  /attrition_prediction/i,
  /hris_inference/i,
  /individual_productivity/i,
  /productivity_rank/i,
  /productivity_score/i
];

const GOVERNED_POLICY_KEYS = new Set([
  "layer_1_platform_telemetry",
  "layer_2_user_voice_empirical",
  "layer_3_business_system_outcomes",
  "governance_evidence",
  "assumption_evidence",
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
  "contains_hris_inference_from_ai_usage",
  "aggregate_workforce_context",
  "aggregate_workforce_context_allowed",
  "aggregate_hris_derived_context",
  "blocked_uses",
  "allowed_uses",
  "blocked_interpretation",
  "allowed_interpretation",
  "required_caveats",
  "privacy_boundary",
  "suppression"
]);

const SAFE_DEFAULT_BLOCKED_USES = [
  ...REQUIRED_TELEMETRY_BLOCKED_USES,
  "realized_roi_calculation",
  "roi_proof",
  "dollarized_output",
  "financial_value_claim",
  "usage_derived_financial_claim",
  "customer_facing_economic_output",
  "manager_ranking",
  "team_ranking",
  "person_level_hris_records",
  "hashed_or_joinable_person_identifiers",
  "compensation_or_performance_inference",
  "promotion_or_discipline_inference",
  "attrition_prediction",
  "hris_inference_from_ai_usage"
];

export interface EvidenceSnapshotValidationResult {
  schema_version: string;
  evidence_snapshot_id: string | null;
  org_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    evidence_snapshot: boolean;
    claim_readiness: boolean;
    executive_readout: boolean;
  };
}

export interface BuildTelemetryEvidenceSnapshotInputs {
  orgId: string;
  workflowFamily: string;
  workflowName?: string;
  functionArea?: string;
  windowStart: string;
  windowEnd: string;
  aggregateTelemetrySummary?: any;
  aggregateWorkforceContext?: any;
  sourceRefs?: any;
  generatedAt?: string;
  evidenceSnapshotId?: string;
  measurementPlanId?: string;
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

function requireEnum(
  value: any,
  allowed: Set<string>,
  path: string,
  gaps: string[]
): void {
  requireField(value, path, gaps);
  if (value !== undefined && value !== null && value !== "" && !allowed.has(value)) {
    gaps.push(`${path} is invalid: ${value}`);
  }
}

function requireBoolean(
  value: any,
  expected: boolean,
  path: string,
  gaps: string[]
): void {
  if (value !== expected) {
    gaps.push(`${path} must be ${expected}`);
  }
}

function stringsOf(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function caveatsOf(snapshot: any): string[] {
  return stringsOf(snapshot?.required_caveats);
}

function caveatMentions(snapshot: any, pattern: RegExp): boolean {
  return caveatsOf(snapshot).some((caveat) => pattern.test(caveat));
}

function evidenceStateOfLayer(snapshot: any, layer: string): string | null {
  return snapshot?.playbook_layers?.[layer]?.evidence_state ?? null;
}

function coverageStateOfLayer(snapshot: any, layer: string): string | null {
  return snapshot?.playbook_coverage?.[layer]?.status ?? null;
}

function assumptionEvidenceExplicitlyNotRequired(snapshot: any): boolean {
  const assumptions = snapshot?.playbook_coverage?.assumption_evidence ?? {};
  return assumptions.status === "not_computed" &&
    stringsOf(assumptions.required_approvals).length === 0 &&
    stringsOf(assumptions.caveats).some((caveat) => /not required/i.test(caveat));
}

function layerIsPresent(snapshot: any, layer: string): boolean {
  return evidenceStateOfLayer(snapshot, layer) === "present";
}

function kMinThresholdMet(snapshot: any): boolean {
  const summary = snapshot?.aggregate_telemetry_summary?.k_min_summary;
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

function isMissingHeldSuppressedOrNotComputed(state: any): boolean {
  return ["missing", "held", "suppressed", "not_computed"].includes(String(state));
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function blockedUsesInclude(snapshot: any, token: string): boolean {
  return stringsOf(snapshot?.blocked_uses).map(normalizeToken).includes(token);
}

function vbdBlockedInterpretationIncludes(snapshot: any, token: string): boolean {
  return stringsOf(snapshot?.vbd_operating_map?.blocked_interpretation)
    .map(normalizeToken)
    .includes(token);
}

function valueLooksUnsafeForVbd(value: string): boolean {
  return UNSAFE_ALLOWED_USE_PATTERNS.some((pattern) => pattern.test(value)) ||
    UNSAFE_VBD_SIGNAL_PATTERNS.some((pattern) => pattern.test(value));
}

function hasOutcomeEvidenceReference(snapshot: any): boolean {
  return Array.isArray(snapshot?.source_refs?.outcome_evidence_ids) &&
    snapshot.source_refs.outcome_evidence_ids.length > 0;
}

function hasUnsafeAllowedUse(snapshot: any): string | null {
  for (const use of stringsOf(snapshot?.allowed_uses)) {
    if (UNSAFE_ALLOWED_USE_PATTERNS.some((pattern) => pattern.test(use))) {
      return use;
    }
  }
  return null;
}

function isForbiddenKey(key: string): boolean {
  if (GOVERNED_POLICY_KEYS.has(key)) return false;
  return FORBIDDEN_FIELD_KEY_PATTERNS.some((pattern) => pattern.test(key));
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

function collectTopLevelGaps(snapshot: any): string[] {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "evidence_snapshot_id",
    "org_id",
    "measurement_plan_id",
    "workflow",
    "window",
    "snapshot_type",
    "source_refs",
    "evidence_lanes",
    "playbook_layers",
    "playbook_coverage",
    "vbd_operating_map",
    "aggregate_telemetry_summary",
    "aggregate_workforce_context",
    "suppression",
    "privacy_boundary",
    "snapshot_readiness_decision",
    "allowed_uses",
    "blocked_uses",
    "required_caveats",
    "next_evidence_actions",
    "generated_at",
    "derivation_version"
  ]) {
    requireField(snapshot?.[field], field, gaps);
  }
  if (
    snapshot?.schema_version &&
    snapshot.schema_version !== EVIDENCE_SNAPSHOT_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${snapshot.schema_version}`);
  }
  requireEnum(snapshot?.snapshot_type, ALLOWED_SNAPSHOT_TYPES, "snapshot_type", gaps);
  requireField(snapshot?.workflow?.workflow_family, "workflow.workflow_family", gaps);
  requireField(snapshot?.window?.window_start, "window.window_start", gaps);
  requireField(snapshot?.window?.window_end, "window.window_end", gaps);
  requireArray(snapshot?.allowed_uses, "allowed_uses", gaps);
  requireArray(snapshot?.blocked_uses, "blocked_uses", gaps);
  requireArray(snapshot?.required_caveats, "required_caveats", gaps);
  requireArray(snapshot?.next_evidence_actions, "next_evidence_actions", gaps);
  return gaps;
}

function snapshotHasLayer3Coverage(snapshot: any): boolean {
  return snapshot?.playbook_layers?.layer_3_business_system_outcomes?.evidence_state === "present" &&
    snapshot?.playbook_coverage?.layer_3_business_system_outcomes?.status === "present";
}

function snapshotHasExecutableCoverageStatus(snapshot: any): boolean {
  return [
    "layer_1_plus_partial_layer_3",
    "layer_1_plus_layer_2_and_layer_3",
    "full_playbook_coverage"
  ].includes(
    String(snapshot?.playbook_coverage?.coverage_status ?? "")
  );
}

function collectSnapshotTypeReadinessGaps(snapshot: any): string[] {
  const gaps: string[] = [];
  if (!EXECUTIVE_READY_SNAPSHOT_TYPES.has(String(snapshot?.snapshot_type ?? ""))) {
    return gaps;
  }
  if (!snapshotHasExecutableCoverageStatus(snapshot)) {
    gaps.push(
      `${snapshot.snapshot_type} requires coverage_status with Layer 3 evidence`
    );
  }
  if (!snapshotHasLayer3Coverage(snapshot)) {
    gaps.push(`${snapshot.snapshot_type} requires Layer 3 coverage present`);
  }
  if (!hasOutcomeEvidenceReference(snapshot)) {
    gaps.push(`${snapshot.snapshot_type} requires outcome evidence source references`);
  }
  return gaps;
}

function privacyGrainCompatible(vbdGrain: any, privacyGrain: any): boolean {
  if (typeof privacyGrain !== "string" || privacyGrain.trim() === "") {
    return true;
  }
  if (vbdGrain === privacyGrain) return true;
  return `approved_aggregate_${vbdGrain}` === privacyGrain;
}

function layer3CoveragePresent(snapshot: any): boolean {
  return layerIsPresent(snapshot, "layer_3_business_system_outcomes") ||
    coverageStateOfLayer(snapshot, "layer_3_business_system_outcomes") === "present";
}

function collectVbdOperatingMapGaps(snapshot: any): string[] {
  const gaps: string[] = [];
  const map = snapshot?.vbd_operating_map;
  requireField(map, "vbd_operating_map", gaps);
  if (!map || typeof map !== "object") return gaps;

  const velocity = map.velocity;
  requireField(velocity, "vbd_operating_map.velocity", gaps);
  if (velocity) {
    requireEnum(
      velocity.state,
      ALLOWED_VBD_VELOCITY_STATES,
      "vbd_operating_map.velocity.state",
      gaps
    );
    requireEnum(
      velocity.evidence_state,
      ALLOWED_EVIDENCE_STATES,
      "vbd_operating_map.velocity.evidence_state",
      gaps
    );
    requireArray(velocity.source_signals, "vbd_operating_map.velocity.source_signals", gaps);
    requireArray(velocity.caveats, "vbd_operating_map.velocity.caveats", gaps);
    for (const signal of stringsOf(velocity.source_signals)) {
      if (valueLooksUnsafeForVbd(signal)) {
        gaps.push(`vbd_operating_map.velocity.source_signals contains unsafe signal: ${signal}`);
      }
    }
  }

  const breadth = map.breadth;
  requireField(breadth, "vbd_operating_map.breadth", gaps);
  if (breadth) {
    requireEnum(
      breadth.state,
      ALLOWED_VBD_BREADTH_STATES,
      "vbd_operating_map.breadth.state",
      gaps
    );
    requireField(
      breadth.approved_aggregate_grain,
      "vbd_operating_map.breadth.approved_aggregate_grain",
      gaps
    );
    requireArray(breadth.caveats, "vbd_operating_map.breadth.caveats", gaps);
    if (
      !privacyGrainCompatible(
        breadth.approved_aggregate_grain,
        snapshot?.privacy_boundary?.approved_aggregate_grain
      )
    ) {
      gaps.push(
        "vbd_operating_map.breadth.approved_aggregate_grain must match or be compatible with privacy_boundary.approved_aggregate_grain"
      );
    }
    if (
      (snapshot?.privacy_boundary?.approved_aggregate_grain === null ||
        snapshot?.privacy_boundary?.approved_aggregate_grain === undefined) &&
      breadth.state === "broad"
    ) {
      gaps.push(
        "vbd_operating_map.breadth cannot be broad when approved aggregate grain is missing or held"
      );
    }
    if (
      (snapshot?.privacy_boundary?.approved_aggregate_grain === null ||
        snapshot?.privacy_boundary?.approved_aggregate_grain === undefined) &&
      stringsOf(breadth.caveats).length === 0
    ) {
      gaps.push(
        "vbd_operating_map.breadth requires caveats when approved aggregate grain is missing or held"
      );
    }
    const expectedSuppressed =
      snapshot?.aggregate_telemetry_summary?.k_min_summary?.suppressed_or_unknown_slices;
    if (
      Number(expectedSuppressed ?? 0) > 0 &&
      Number(breadth.suppressed_or_unknown_slices ?? -1) !== Number(expectedSuppressed)
    ) {
      gaps.push(
        "vbd_operating_map.breadth.suppressed_or_unknown_slices must preserve aggregate telemetry suppressed_or_unknown_slices"
      );
    }
    if (
      breadth.covered_slices !== undefined &&
      Number(breadth.covered_slices) < 0
    ) {
      gaps.push("vbd_operating_map.breadth.covered_slices must be non-negative");
    }
  }

  const depth = map.depth;
  requireField(depth, "vbd_operating_map.depth", gaps);
  if (depth) {
    requireEnum(
      depth.state,
      ALLOWED_VBD_DEPTH_STATES,
      "vbd_operating_map.depth.state",
      gaps
    );
    requireEnum(
      depth.evidence_state,
      ALLOWED_EVIDENCE_STATES,
      "vbd_operating_map.depth.evidence_state",
      gaps
    );
    requireArray(depth.source_signals, "vbd_operating_map.depth.source_signals", gaps);
    requireArray(depth.caveats, "vbd_operating_map.depth.caveats", gaps);
    if (typeof depth.requires_layer_3_for_value_claim !== "boolean") {
      gaps.push(
        "vbd_operating_map.depth.requires_layer_3_for_value_claim must be boolean"
      );
    }
    for (const signal of stringsOf(depth.source_signals)) {
      if (valueLooksUnsafeForVbd(signal)) {
        gaps.push(`vbd_operating_map.depth.source_signals contains unsafe signal: ${signal}`);
      }
    }
    if (
      depth.state === "embedded" &&
      !layer3CoveragePresent(snapshot) &&
      depth.requires_layer_3_for_value_claim !== true
    ) {
      gaps.push(
        "embedded VBD depth requires Layer 3 for value claims when Layer 3 evidence is missing"
      );
    }
  }

  requireEnum(
    map.operating_mode,
    ALLOWED_VBD_OPERATING_MODES,
    "vbd_operating_map.operating_mode",
    gaps
  );
  if (map.contributes_to_playbook_layer !== "layer_1_platform_telemetry") {
    gaps.push(
      "vbd_operating_map.contributes_to_playbook_layer must be layer_1_platform_telemetry"
    );
  }
  requireArray(
    map.allowed_interpretation,
    "vbd_operating_map.allowed_interpretation",
    gaps
  );
  if (Array.isArray(map.allowed_interpretation)) {
    for (const interpretation of map.allowed_interpretation) {
      if (!ALLOWED_VBD_INTERPRETATIONS.has(interpretation)) {
        gaps.push(
          `vbd_operating_map.allowed_interpretation contains blocked or unsupported interpretation: ${interpretation}`
        );
      }
      if (valueLooksUnsafeForVbd(String(interpretation))) {
        gaps.push(
          `vbd_operating_map.allowed_interpretation contains unsafe interpretation: ${interpretation}`
        );
      }
    }
  }
  requireArray(
    map.blocked_interpretation,
    "vbd_operating_map.blocked_interpretation",
    gaps
  );
  for (const use of REQUIRED_TELEMETRY_BLOCKED_USES) {
    if (!vbdBlockedInterpretationIncludes(snapshot, use)) {
      gaps.push(`vbd_operating_map.blocked_interpretation missing ${use}`);
    }
  }

  if (
    map.operating_mode === "high_fluency_flow" &&
    snapshot?.playbook_coverage?.coverage_status === "layer_1_only" &&
    !caveatMentions(snapshot, /high fluency flow.*Layer 1.*(?:posture|telemetry).*not.*(?:full value proof|value proof|full Playbook)|Layer 1.*(?:posture|telemetry).*high fluency flow.*not.*(?:full value proof|value proof|full Playbook)/i)
  ) {
    gaps.push(
      "high_fluency_flow with layer_1_only coverage requires a caveat that it is Layer 1 posture only, not full value proof"
    );
  }
  if (map.claim_readiness !== undefined) {
    gaps.push("VBD must not compute claim_readiness");
  }
  if (map.financial_permission !== undefined) {
    gaps.push("VBD must not compute financial_permission");
  }
  if (map.executive_readout !== undefined) {
    gaps.push("VBD must not compute executive_readout");
  }
  if (map.customer_facing_financial_output !== undefined) {
    gaps.push("VBD must not authorize customer_facing_financial_output");
  }

  return gaps;
}

function collectPlaybookCoverageGaps(snapshot: any): string[] {
  const gaps: string[] = [];
  const coverage = snapshot?.playbook_coverage;
  requireField(coverage, "playbook_coverage", gaps);
  if (!coverage || typeof coverage !== "object") return gaps;

  requireEnum(
    coverage.coverage_status,
    ALLOWED_COVERAGE_STATUSES,
    "playbook_coverage.coverage_status",
    gaps
  );

  for (const layer of REQUIRED_PLAYBOOK_LAYERS) {
    const entry = coverage[layer];
    requireField(entry, `playbook_coverage.${layer}`, gaps);
    if (!entry) continue;
    requireEnum(
      entry.status,
      ALLOWED_EVIDENCE_STATES,
      `playbook_coverage.${layer}.status`,
      gaps
    );
    const layerEvidenceState = evidenceStateOfLayer(snapshot, layer);
    if (
      entry.status === "present" &&
      layerEvidenceState &&
      isMissingHeldSuppressedOrNotComputed(layerEvidenceState)
    ) {
      gaps.push(
        `playbook_coverage.${layer}.status cannot be present when playbook_layers.${layer}.evidence_state is ${layerEvidenceState}`
      );
    }
    if (
      entry.status === "partial" &&
      isMissingHeldSuppressedOrNotComputed(layerEvidenceState)
    ) {
      gaps.push(
        `playbook_coverage.${layer}.status cannot be partial when playbook_layers.${layer}.evidence_state is ${layerEvidenceState}`
      );
    }
    for (const field of ["covered_signals", "missing_signals", "held_signals", "caveats"]) {
      if (!Array.isArray(entry[field])) {
        gaps.push(`playbook_coverage.${layer}.${field} must be an array`);
      }
    }
    if (
      ["layer_2_user_voice_empirical", "layer_3_business_system_outcomes"].includes(layer) &&
      !Array.isArray(entry.required_source_exports)
    ) {
      gaps.push(`playbook_coverage.${layer}.required_source_exports must be an array`);
    }
    if (layer === "assumption_evidence" && !Array.isArray(entry.required_approvals)) {
      gaps.push("playbook_coverage.assumption_evidence.required_approvals must be an array");
    }

    const trackedSignals = new Set([
      ...stringsOf(entry.covered_signals),
      ...stringsOf(entry.missing_signals),
      ...stringsOf(entry.held_signals)
    ]);
    for (const signal of EXPECTED_COVERAGE_SIGNALS[layer]) {
      if (!trackedSignals.has(signal)) {
        gaps.push(`playbook_coverage.${layer} must track ${signal}`);
      }
    }
  }

  if (
    coverage.coverage_status === "full_playbook_coverage" &&
    TELEMETRY_ONLY_SNAPSHOT_TYPES.has(snapshot?.snapshot_type)
  ) {
    gaps.push(
      "BigQuery source availability alone cannot claim full_playbook_coverage"
    );
  }
  if (coverage.coverage_status === "full_playbook_coverage") {
    const layer1Status = coverage.layer_1_platform_telemetry?.status;
    if (!["present", "partial"].includes(String(layer1Status))) {
      gaps.push("full_playbook_coverage requires Layer 1 present or partial");
    }
    if (
      layer1Status === "partial" &&
      stringsOf(coverage.layer_1_platform_telemetry?.caveats).length === 0
    ) {
      gaps.push("full_playbook_coverage requires Layer 1 caveats when Layer 1 is partial");
    }
    if (coverage.layer_2_user_voice_empirical?.status !== "present") {
      gaps.push("full_playbook_coverage requires Layer 2 present");
    }
    if (coverage.layer_3_business_system_outcomes?.status !== "present") {
      gaps.push("full_playbook_coverage requires Layer 3 present");
    }
    if (coverage.governance_evidence?.status !== "present") {
      gaps.push("full_playbook_coverage requires governance evidence present");
    }
    const assumptions = coverage.assumption_evidence ?? {};
    if (
      assumptions.status !== "present" &&
      !assumptionEvidenceExplicitlyNotRequired(snapshot)
    ) {
      gaps.push(
        "full_playbook_coverage requires assumption evidence present or explicitly not required"
      );
    }
    if (!kMinThresholdMet(snapshot)) {
      gaps.push("full_playbook_coverage requires k-min threshold met");
    }
  }

  const governanceStatus = coverage.governance_evidence?.status;
  if (
    ["missing", "held"].includes(String(governanceStatus)) &&
    snapshot?.snapshot_type !== "TELEMETRY_SOURCE_AVAILABILITY" &&
    snapshot?.snapshot_readiness_decision !== "HOLD_FOR_GOVERNANCE_APPROVAL"
  ) {
    gaps.push(
      "snapshot_readiness_decision must be HOLD_FOR_GOVERNANCE_APPROVAL when governance evidence is missing or held"
    );
  }

  return gaps;
}

function collectEvidenceLaneGaps(snapshot: any): string[] {
  const gaps: string[] = [];
  const lanes = Array.isArray(snapshot?.evidence_lanes)
    ? snapshot.evidence_lanes
    : [];
  if (!Array.isArray(snapshot?.evidence_lanes)) {
    gaps.push("evidence_lanes must be an array");
    return gaps;
  }
  const laneNames = new Set(lanes.map((lane: any) => lane?.lane));
  for (const lane of REQUIRED_LANES) {
    if (!laneNames.has(lane)) {
      gaps.push(`evidence_lanes missing ${lane}`);
    }
  }
  lanes.forEach((lane: any, index: number) => {
    const prefix = `evidence_lanes[${index}]`;
    requireEnum(lane?.lane, new Set(REQUIRED_LANES), `${prefix}.lane`, gaps);
    requireEnum(
      lane?.classification,
      ALLOWED_CLASSIFICATIONS,
      `${prefix}.classification`,
      gaps
    );
    requireEnum(
      lane?.evidence_state,
      ALLOWED_EVIDENCE_STATES,
      `${prefix}.evidence_state`,
      gaps
    );
    requireEnum(
      lane?.playbook_layer,
      ALLOWED_PLAYBOOK_LAYER_VALUES,
      `${prefix}.playbook_layer`,
      gaps
    );
    if (typeof lane?.can_support_evidence_snapshot !== "boolean") {
      gaps.push(`${prefix}.can_support_evidence_snapshot must be boolean`);
    }
    if (typeof lane?.can_support_claim_readiness !== "boolean") {
      gaps.push(`${prefix}.can_support_claim_readiness must be boolean`);
    }
    if (!Array.isArray(lane?.caveats)) {
      gaps.push(`${prefix}.caveats must be an array`);
    }
  });
  return gaps;
}

function collectPlaybookLayerGaps(snapshot: any): string[] {
  const gaps: string[] = [];
  for (const layer of REQUIRED_PLAYBOOK_LAYERS) {
    const entry = snapshot?.playbook_layers?.[layer];
    requireField(entry, `playbook_layers.${layer}`, gaps);
    if (!entry) continue;
    requireEnum(
      entry.evidence_state,
      ALLOWED_EVIDENCE_STATES,
      `playbook_layers.${layer}.evidence_state`,
      gaps
    );
    requireEnum(
      entry.confidence,
      ALLOWED_CONFIDENCE_VALUES,
      `playbook_layers.${layer}.confidence`,
      gaps
    );
    if (!Array.isArray(entry.caveats)) {
      gaps.push(`playbook_layers.${layer}.caveats must be an array`);
    }
  }
  return gaps;
}

function collectPrivacyBoundaryGaps(snapshot: any): string[] {
  const gaps: string[] = [];
  const boundary = snapshot?.privacy_boundary ?? {};
  requireBoolean(boundary.aggregate_only, true, "privacy_boundary.aggregate_only", gaps);
  for (const flag of [
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
  ]) {
    requireBoolean(boundary[flag], false, `privacy_boundary.${flag}`, gaps);
  }
  const forbidden = Array.from(collectForbiddenFields(snapshot));
  if (forbidden.length > 0) {
    gaps.push(`Forbidden field(s) present: ${forbidden.sort().join(", ")}`);
  }
  return gaps;
}

function collectSuppressionGaps(snapshot: any): string[] {
  const gaps: string[] = [];
  const suppression = snapshot?.suppression ?? {};
  if (suppression.default_verdict !== "SUPPRESS") {
    gaps.push("suppression.default_verdict must be SUPPRESS");
  }
  requireBoolean(
    suppression.suppression_applies_per_slice,
    true,
    "suppression.suppression_applies_per_slice",
    gaps
  );
  requireBoolean(
    suppression.hidden_values_exposed,
    false,
    "suppression.hidden_values_exposed",
    gaps
  );
  for (const field of ["suppressed_lanes", "held_lanes", "missing_lanes", "reason_codes"]) {
    if (!Array.isArray(suppression[field])) {
      gaps.push(`suppression.${field} must be an array`);
    }
  }
  return gaps;
}

function collectCaveatGaps(snapshot: any): string[] {
  const gaps: string[] = [];
  const lanes = Array.isArray(snapshot?.evidence_lanes)
    ? snapshot.evidence_lanes
    : [];
  const hasIncompleteLane = lanes.some((lane: any) =>
    isMissingHeldSuppressedOrNotComputed(lane?.evidence_state)
  );
  if (
    hasIncompleteLane &&
    !caveatMentions(snapshot, /missing|held|suppressed|not computed|not_computed/i)
  ) {
    gaps.push(
      "required_caveats must mention missing, held, suppressed, or not computed evidence"
    );
  }
  const layer2State =
    coverageStateOfLayer(snapshot, "layer_2_user_voice_empirical") ??
    evidenceStateOfLayer(snapshot, "layer_2_user_voice_empirical");
  if (
    ["missing", "held", "suppressed", "not_computed"].includes(String(layer2State)) &&
    !caveatMentions(snapshot, /(user voice|empirical|survey).*(missing|held|suppressed|not computed|not_computed|not provided|unavailable)|(missing|held|suppressed|not computed|not_computed|not provided|unavailable).*(user voice|empirical|survey)/i)
  ) {
    gaps.push("Layer 2 user voice or empirical evidence is missing and must be caveated");
  }
  const layer3State =
    coverageStateOfLayer(snapshot, "layer_3_business_system_outcomes") ??
    evidenceStateOfLayer(snapshot, "layer_3_business_system_outcomes");
  if (
    ["missing", "held", "suppressed", "not_computed"].includes(String(layer3State)) &&
    !caveatMentions(snapshot, /(business system-of-record|system-of-record|business outcome|outcome evidence).*(missing|held|suppressed|not computed|not_computed|not provided|unavailable)|(missing|held|suppressed|not computed|not_computed|not provided|unavailable).*(business system-of-record|system-of-record|business outcome|outcome evidence)/i)
  ) {
    gaps.push(
      "Layer 3 business system-of-record outcome evidence is missing and must be caveated"
    );
  }
  const assumptionsLane = lanes.find((lane: any) => lane?.lane === "assumptions");
  const assumptionState = coverageStateOfLayer(snapshot, "assumption_evidence");
  const assumptionsNeedCaveat =
    !assumptionEvidenceExplicitlyNotRequired(snapshot) &&
    (["missing", "held", "suppressed", "not_computed"].includes(String(assumptionState)) ||
      ["missing", "held"].includes(String(assumptionsLane?.evidence_state)) ||
      assumptionsLane?.classification === "requires_customer_export");
  if (
    assumptionsNeedCaveat &&
    !caveatMentions(snapshot, /(customer-owned assumptions|customer owned assumptions|assumptions).*(missing|unapproved|held|customer export)|(missing|unapproved|held|customer export).*(customer-owned assumptions|customer owned assumptions|assumptions)/i)
  ) {
    gaps.push("customer-owned assumptions are missing or unapproved and must be caveated");
  }
  const workforceState = snapshot?.aggregate_workforce_context?.context_state;
  if (
    workforceState === "held_for_approval" &&
    !caveatMentions(snapshot, /aggregate workforce context.*held.*approval|held.*approval.*aggregate workforce context/i)
  ) {
    gaps.push("aggregate workforce context held for approval must be caveated");
  }
  if (
    workforceState === "blocked" &&
    !caveatMentions(snapshot, /workforce context.*(?:blocked|unsafe)|(?:blocked|unsafe).*workforce context/i)
  ) {
    gaps.push("blocked or unsafe workforce context must be caveated");
  }
  return gaps;
}

function collectUsePolicyGaps(snapshot: any): string[] {
  const gaps: string[] = [];
  if (
    TELEMETRY_ONLY_SNAPSHOT_TYPES.has(snapshot?.snapshot_type) ||
    snapshot?.playbook_coverage?.coverage_status === "layer_1_only"
  ) {
    for (const use of REQUIRED_TELEMETRY_BLOCKED_USES) {
      if (!blockedUsesInclude(snapshot, use)) {
        gaps.push(`blocked_uses missing ${use}`);
      }
    }
  }
  const unsafeAllowedUse = hasUnsafeAllowedUse(snapshot);
  if (unsafeAllowedUse) {
    gaps.push(`allowed_uses contains blocked use: ${unsafeAllowedUse}`);
  }
  if (
    stringsOf(snapshot?.allowed_uses).some((use) =>
      /agent.*financial|financial.*agent/i.test(use)
    ) &&
    !layerIsPresent(snapshot, "layer_3_business_system_outcomes")
  ) {
    gaps.push("agent lifecycle cannot support financial agent value without Layer 3");
  }
  if (
    stringsOf(snapshot?.allowed_uses).map(normalizeToken).some((use) =>
      (use.includes("artifact") && use.includes("business_value")) ||
      (use.includes("artifact") && use.includes("value_claim"))
    ) &&
    !layerIsPresent(snapshot, "layer_3_business_system_outcomes") &&
    !hasOutcomeEvidenceReference(snapshot)
  ) {
    gaps.push(
      "artifact output cannot support business value without Layer 3 or accepted quality/outcome evidence"
    );
  }
  return gaps;
}

function collectAggregateWorkforceContextGaps(snapshot: any): string[] {
  const gaps: string[] = [];
  const context = snapshot?.aggregate_workforce_context;
  requireField(context, "aggregate_workforce_context", gaps);
  requireEnum(
    context?.context_state,
    ALLOWED_WORKFORCE_CONTEXT_STATES,
    "aggregate_workforce_context.context_state",
    gaps
  );
  if (context?.source_type !== undefined) {
    requireEnum(
      context.source_type,
      ALLOWED_WORKFORCE_SOURCE_TYPES,
      "aggregate_workforce_context.source_type",
      gaps
    );
  }
  if (context?.source_owner_approval_state !== undefined) {
    requireEnum(
      context.source_owner_approval_state,
      ALLOWED_APPROVAL_STATES,
      "aggregate_workforce_context.source_owner_approval_state",
      gaps
    );
  }
  if (!Array.isArray(context?.caveats)) {
    gaps.push("aggregate_workforce_context.caveats must be an array");
  }
  if (context?.allowed_context_types !== undefined) {
    if (!Array.isArray(context.allowed_context_types)) {
      gaps.push("aggregate_workforce_context.allowed_context_types must be an array");
    } else {
      for (const type of context.allowed_context_types) {
        if (!ALLOWED_WORKFORCE_CONTEXT_TYPES.has(type)) {
          gaps.push(`aggregate_workforce_context.allowed_context_types contains invalid type ${type}`);
        }
      }
    }
  }
  if (context?.context_state === "provided_aggregate_safe") {
    const boundary = snapshot?.privacy_boundary ?? {};
    requireBoolean(
      boundary.aggregate_only,
      true,
      "privacy_boundary.aggregate_only",
      gaps
    );
    requireBoolean(
      boundary.aggregate_workforce_context_allowed,
      true,
      "privacy_boundary.aggregate_workforce_context_allowed",
      gaps
    );
    for (const flag of [
      "contains_direct_identifiers",
      "contains_person_level_hris_records",
      "contains_hashed_or_joinable_person_identifiers",
      "contains_person_level_productivity",
      "contains_manager_or_team_ranking",
      "contains_people_decisioning",
      "contains_compensation_or_performance_inference",
      "contains_promotion_or_discipline_inference",
      "contains_attrition_prediction",
      "contains_hris_inference_from_ai_usage"
    ]) {
      requireBoolean(boundary[flag], false, `privacy_boundary.${flag}`, gaps);
    }
    if (context.source_owner_approval_state !== "approved") {
      gaps.push("aggregate_workforce_context.source_owner_approval_state must be approved");
    }
    if (context.cohort_threshold_met !== true) {
      gaps.push("aggregate_workforce_context.cohort_threshold_met must be true");
    }
  }
  return gaps;
}

function sourceRefsWithDefaults(sourceRefs: any): any {
  return {
    bigquery_probe_result_id: null,
    v3_verdict_ids: [],
    velocity_observation_ids: [],
    outcome_evidence_ids: [],
    fluency_baseline_ids: [],
    source_readiness_ids: [],
    real_source_manifest_ids: [],
    aggregate_workforce_context_export_ids: [],
    notes: [],
    ...(sourceRefs ?? {})
  };
}

function defaultAggregateWorkforceContext(): any {
  return {
    context_state: "not_provided",
    source_type: "not_applicable",
    allowed_context_types: [],
    source_owner_approval_state: "not_required",
    minimum_cohort_threshold: null,
    cohort_threshold_met: null,
    caveats: [
      "Aggregate workforce context has not been provided; workforce context cannot strengthen the evidence posture."
    ]
  };
}

function workforceContextHasUnsafeHints(context: any): boolean {
  if (!context || typeof context !== "object") return false;
  const directFlags = [
    "contains_direct_identifiers",
    "contains_person_level_hris_records",
    "contains_hashed_or_joinable_person_identifiers",
    "contains_person_level_productivity",
    "contains_manager_or_team_ranking",
    "contains_people_decisioning",
    "contains_compensation_or_performance_inference",
    "contains_promotion_or_discipline_inference",
    "contains_attrition_prediction",
    "contains_hris_inference_from_ai_usage"
  ];
  return directFlags.some((flag) => context[flag] === true) ||
    Array.from(collectForbiddenFields(context)).length > 0;
}

function normalizeWorkforceContext(input: any): any {
  if (!input) return defaultAggregateWorkforceContext();
  if (workforceContextHasUnsafeHints(input)) {
    return {
      context_state: "blocked",
      source_type: input?.source_type ?? "not_applicable",
      allowed_context_types: [],
      source_owner_approval_state: input?.source_owner_approval_state ?? "missing",
      minimum_cohort_threshold: input?.minimum_cohort_threshold ?? null,
      cohort_threshold_met: false,
      caveats: [
        "Aggregate workforce context is blocked or unsafe because person-level or decisioning indicators were supplied."
      ]
    };
  }
  if (
    input.context_state === "provided_aggregate_safe" &&
    input.source_owner_approval_state === "approved" &&
    input.cohort_threshold_met === true
  ) {
    return {
      ...input,
      source_type: input.source_type ?? "aggregate_workforce_export",
      allowed_context_types: Array.isArray(input.allowed_context_types)
        ? input.allowed_context_types
        : [],
      caveats: Array.isArray(input.caveats) && input.caveats.length > 0
        ? input.caveats
        : [
            "Aggregate workforce context is customer-approved, cohort-safe, non-decisioning, and non-ranking."
          ]
    };
  }
  return {
    context_state: input.context_state === "blocked" ? "blocked" : "held_for_approval",
    source_type: input.source_type ?? "not_applicable",
    allowed_context_types: Array.isArray(input.allowed_context_types)
      ? input.allowed_context_types
      : [],
    source_owner_approval_state: input.source_owner_approval_state ?? "missing",
    minimum_cohort_threshold: input.minimum_cohort_threshold ?? null,
    cohort_threshold_met: input.cohort_threshold_met ?? null,
    caveats: [
      input.context_state === "blocked"
        ? "Aggregate workforce context is blocked or unsafe and cannot be used."
        : "Aggregate workforce context is held for approval and cannot be used until the source owner approves it."
    ]
  };
}

function buildEvidenceLanes(): any[] {
  return [
    {
      lane: "surface_usage",
      classification: "available_now",
      evidence_state: "present",
      playbook_layer: "layer_1_platform_telemetry",
      can_support_evidence_snapshot: true,
      can_support_claim_readiness: false,
      caveats: [
        "Surface usage is available as aggregate Layer 1 telemetry only."
      ]
    },
    {
      lane: "skill_lifecycle",
      classification: "partially_available",
      evidence_state: "partial",
      playbook_layer: "layer_1_platform_telemetry",
      can_support_evidence_snapshot: true,
      can_support_claim_readiness: false,
      caveats: [
        "Skill evidence is partial and not promoted for reusable expertise or financial claims."
      ]
    },
    {
      lane: "agent_lifecycle",
      classification: "derivable_with_existing_data",
      evidence_state: "partial",
      playbook_layer: "layer_1_platform_telemetry",
      can_support_evidence_snapshot: true,
      can_support_claim_readiness: false,
      caveats: [
        "Agent lifecycle is derivable as aggregate telemetry, but financial agent value requires Layer 3 evidence."
      ]
    },
    {
      lane: "mcp_action_boundary",
      classification: "requires_customer_export",
      evidence_state: "held",
      playbook_layer: "governance_evidence",
      can_support_evidence_snapshot: false,
      can_support_claim_readiness: false,
      caveats: [
        "MCP and action boundary evidence is held until an approved aggregate customer export exists."
      ]
    },
    {
      lane: "artifact_output",
      classification: "derivable_with_existing_data",
      evidence_state: "partial",
      playbook_layer: "layer_1_platform_telemetry",
      can_support_evidence_snapshot: true,
      can_support_claim_readiness: false,
      caveats: [
        "Artifact output metadata can describe output activity but cannot prove business value without outcome or quality evidence."
      ]
    },
    {
      lane: "control_evidence",
      classification: "requires_customer_export",
      evidence_state: "held",
      playbook_layer: "governance_evidence",
      can_support_evidence_snapshot: false,
      can_support_claim_readiness: false,
      caveats: [
        "Control evidence is held until approved customer or policy-owner aggregate export is available."
      ]
    },
    {
      lane: "assumptions",
      classification: "requires_customer_export",
      evidence_state: "held",
      playbook_layer: "assumption_evidence",
      can_support_evidence_snapshot: false,
      can_support_claim_readiness: false,
      caveats: [
        "Customer-owned assumptions are held until the customer or business owner approves them."
      ]
    }
  ];
}

function buildPlaybookLayers(): any {
  return {
    layer_1_platform_telemetry: {
      evidence_state: "partial",
      confidence: "medium",
      caveats: [
        "Layer 1 platform telemetry is available for source posture and aggregate evidence posture only."
      ]
    },
    layer_2_user_voice_empirical: {
      evidence_state: "missing",
      confidence: "unknown",
      caveats: [
        "Layer 2 user voice or empirical evidence is missing from this snapshot."
      ]
    },
    layer_3_business_system_outcomes: {
      evidence_state: "missing",
      confidence: "unknown",
      caveats: [
        "Layer 3 business system-of-record outcome evidence is missing from this snapshot."
      ]
    },
    governance_evidence: {
      evidence_state: "partial",
      confidence: "low",
      caveats: [
        "Governance evidence is partial; MCP/action and control evidence require approved aggregate exports."
      ]
    },
    assumption_evidence: {
      evidence_state: "held",
      confidence: "unknown",
      caveats: [
        "Customer-owned assumptions are held until approved by the customer or business owner."
      ]
    }
  };
}

function buildPlaybookCoverage(aggregateWorkforceContextAllowed: boolean): any {
  const layer1Covered = [
    "workflow_run_count",
    "search_activity",
    "chat_or_assistant_activity",
    "ai_answer_activity",
    "active_user_aggregate",
    "eligible_cohort_size",
    "connector_or_source_coverage",
    "skill_lifecycle_activity",
    "agent_lifecycle_activity",
    "artifact_output_metadata",
    "suppression_or_blocked_event_posture"
  ];
  const layer1Held = [
    "mcp_action_boundary_metadata",
    "control_or_policy_telemetry"
  ];
  const governanceCovered = [
    "suppression_state",
    "k_min_posture",
    "source_readiness_state",
    "data_boundary_state",
    "held_suppressed_missing_lanes",
    "forbidden_field_checks",
    "raw_content_exclusion"
  ];
  if (aggregateWorkforceContextAllowed) {
    governanceCovered.push("approved_aggregate_grain");
  }
  const governanceHeld = aggregateWorkforceContextAllowed
    ? []
    : ["approved_aggregate_grain"];
  const assumptionCovered = aggregateWorkforceContextAllowed
    ? ["aggregate_workforce_context_approval_if_provided"]
    : [];
  const assumptionHeld = EXPECTED_COVERAGE_SIGNALS.assumption_evidence.filter(
    (signal) => !assumptionCovered.includes(signal)
  );

  return {
    coverage_status: "layer_1_only",
    layer_1_platform_telemetry: {
      status: "partial",
      covered_signals: layer1Covered,
      missing_signals: [],
      held_signals: layer1Held,
      caveats: [
        "Layer 1 telemetry is partially covered; MCP/action boundary metadata and control or policy telemetry require approved aggregate exports."
      ]
    },
    layer_2_user_voice_empirical: {
      status: "missing",
      covered_signals: [],
      missing_signals: EXPECTED_COVERAGE_SIGNALS.layer_2_user_voice_empirical,
      held_signals: [],
      required_source_exports: LAYER_2_REQUIRED_SOURCE_EXPORTS,
      caveats: [
        "Layer 2 user voice or empirical evidence is missing and requires aggregate customer export."
      ]
    },
    layer_3_business_system_outcomes: {
      status: "missing",
      covered_signals: [],
      missing_signals: EXPECTED_COVERAGE_SIGNALS.layer_3_business_system_outcomes,
      held_signals: [],
      required_source_exports: LAYER_3_REQUIRED_SOURCE_EXPORTS,
      caveats: [
        "Layer 3 business system-of-record outcome evidence is missing and requires customer-attested KPI export."
      ]
    },
    governance_evidence: {
      status: "partial",
      covered_signals: governanceCovered,
      missing_signals: [],
      held_signals: governanceHeld,
      caveats: [
        "Governance evidence is partial; approved aggregate grain remains held unless customer-approved aggregate workforce context is provided."
      ]
    },
    assumption_evidence: {
      status: "held",
      covered_signals: assumptionCovered,
      missing_signals: [],
      held_signals: assumptionHeld,
      required_approvals: ASSUMPTION_REQUIRED_APPROVALS,
      caveats: [
        "Customer-owned assumptions are missing or unapproved and require customer or business-owner approval."
      ]
    }
  };
}

function buildVbdOperatingMap(
  aggregateTelemetrySummary: any,
  approvedAggregateGrain: string | null
): any {
  const kMinSummary = aggregateTelemetrySummary?.k_min_summary ?? {};
  const hasAggregateEvents =
    Number(aggregateTelemetrySummary?.aggregate_event_count ?? 0) > 0;
  const suppressedOrUnknown =
    kMinSummary.suppressed_or_unknown_slices === undefined ||
      kMinSummary.suppressed_or_unknown_slices === null
      ? null
      : Number(kMinSummary.suppressed_or_unknown_slices);
  const kMinClearSlices =
    kMinSummary.k_min_clear_slices === undefined ||
      kMinSummary.k_min_clear_slices === null
      ? null
      : Number(kMinSummary.k_min_clear_slices);
  const breadthCaveats = [
    "Breadth is interpreted only across approved aggregate workflow slices and cannot support person-level, manager, team, HRIS, or people-decisioning interpretation."
  ];
  if (!approvedAggregateGrain) {
    breadthCaveats.push(
      "Approved aggregate grain is missing or held, so breadth remains caveated and cannot be strengthened."
    );
  }
  if (Number(suppressedOrUnknown ?? 0) > 0) {
    breadthCaveats.push(
      "Suppressed or unknown slices are preserved and cannot be hidden inside covered breadth."
    );
  }

  return {
    velocity: {
      state: hasAggregateEvents ? "moderate" : "not_computed",
      evidence_state: hasAggregateEvents ? "partial" : "not_computed",
      source_signals: hasAggregateEvents
        ? ["workflow_run_count", "active_user_aggregate"]
        : [],
      caveats: [
        "Velocity is Layer 1 platform telemetry about aggregate activity movement over time; it is not ROI, productivity, causality, or financial proof."
      ]
    },
    breadth: {
      state: hasAggregateEvents ? "emerging" : "not_computed",
      approved_aggregate_grain: approvedAggregateGrain ?? "workflow_family",
      covered_slices: kMinClearSlices,
      suppressed_or_unknown_slices: suppressedOrUnknown,
      caveats: breadthCaveats
    },
    depth: {
      state: hasAggregateEvents ? "developing" : "not_computed",
      evidence_state: hasAggregateEvents ? "partial" : "not_computed",
      source_signals: hasAggregateEvents
        ? ["repeat_workflow_behavior", "artifact_output_metadata"]
        : [],
      requires_layer_3_for_value_claim: true,
      caveats: [
        "Depth is Layer 1 workflow embeddedness posture; business value requires Layer 3 outcomes or accepted quality/outcome evidence."
      ]
    },
    operating_mode: hasAggregateEvents ? "fast_but_shallow" : "not_computed",
    contributes_to_playbook_layer: "layer_1_platform_telemetry",
    allowed_interpretation: [
      "ai_fluency_posture",
      "aggregate_ai_work_maturity_posture",
      "layer_1_operating_signal",
      "evidence_collection_planning",
      "source_availability_context",
      "claim_blocking_context"
    ],
    blocked_interpretation: REQUIRED_TELEMETRY_BLOCKED_USES
  };
}

function safeIdPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function buildTelemetryEvidenceSnapshotDraft(
  inputs: BuildTelemetryEvidenceSnapshotInputs
): any {
  const aggregateWorkforceContext = normalizeWorkforceContext(
    inputs.aggregateWorkforceContext
  );
  const aggregateWorkforceContextAllowed =
    aggregateWorkforceContext.context_state === "provided_aggregate_safe";
  const aggregateTelemetrySummary = inputs.aggregateTelemetrySummary ?? {
    probe_window_start: inputs.windowStart,
    probe_window_end: inputs.windowEnd,
    aggregate_event_count: null,
    table_families_checked: [],
    approved_field_coverage_summary: null,
    k_min_summary: null
  };
  const approvedAggregateGrain = aggregateWorkforceContextAllowed
    ? "approved_aggregate_cohort"
    : null;
  const evidenceSnapshotId = inputs.evidenceSnapshotId ??
    `evidence_snapshot_${safeIdPart(inputs.orgId)}_${safeIdPart(inputs.workflowFamily)}_${safeIdPart(inputs.windowStart)}_${safeIdPart(inputs.windowEnd)}`;
  const measurementPlanId = inputs.measurementPlanId ??
    `measurement_plan_${safeIdPart(inputs.orgId)}_${safeIdPart(inputs.workflowFamily)}_${safeIdPart(inputs.windowStart)}_${safeIdPart(inputs.windowEnd)}`;
  const requiredCaveats = [
    "Telemetry-only evidence can support a caveated aggregate evidence posture only.",
    "Layer 2 user voice or empirical evidence is missing and must be supplied through an aggregate customer export.",
    "Layer 3 business system-of-record outcome evidence is missing and must be supplied through customer-attested aggregate KPI export.",
    "Customer-owned assumptions are missing or unapproved until a customer or business owner approves them.",
    "Missing, held, suppressed, or not computed evidence cannot be treated as supported evidence.",
    "No realized ROI, EBITA, causality, productivity, headcount reduction, individual attribution, manager or team ranking, people decisioning, or customer-facing financial output is supported."
  ];
  if (aggregateWorkforceContext.context_state === "not_provided") {
    requiredCaveats.push(
      "Aggregate workforce context has not been provided and cannot strengthen the evidence posture."
    );
  }
  if (aggregateWorkforceContext.context_state === "held_for_approval") {
    requiredCaveats.push(
      "Aggregate workforce context is held for approval and cannot be used until approved."
    );
  }
  if (aggregateWorkforceContext.context_state === "blocked") {
    requiredCaveats.push(
      "Aggregate workforce context is blocked or unsafe and cannot be used."
    );
  }

  return {
    schema_version: EVIDENCE_SNAPSHOT_SCHEMA_VERSION,
    evidence_snapshot_id: evidenceSnapshotId,
    org_id: inputs.orgId,
    measurement_plan_id: measurementPlanId,
    workflow: {
      workflow_family: inputs.workflowFamily,
      workflow_name: inputs.workflowName ?? null,
      function_area: inputs.functionArea ?? null
    },
    window: {
      window_start: inputs.windowStart,
      window_end: inputs.windowEnd,
      window_label: null
    },
    snapshot_type: "TELEMETRY_ONLY_CAVEATED",
    source_refs: sourceRefsWithDefaults(inputs.sourceRefs),
    evidence_lanes: buildEvidenceLanes(),
    playbook_layers: buildPlaybookLayers(),
    playbook_coverage: buildPlaybookCoverage(aggregateWorkforceContextAllowed),
    vbd_operating_map: buildVbdOperatingMap(
      aggregateTelemetrySummary,
      approvedAggregateGrain
    ),
    aggregate_telemetry_summary: aggregateTelemetrySummary,
    aggregate_workforce_context: aggregateWorkforceContext,
    suppression: {
      default_verdict: "SUPPRESS",
      suppression_applies_per_slice: true,
      hidden_values_exposed: false,
      suppressed_lanes: [],
      held_lanes: ["mcp_action_boundary", "control_evidence", "assumptions"],
      missing_lanes: [],
      reason_codes: ["HIGH_AMBIGUITY"]
    },
    privacy_boundary: {
      aggregate_only: true,
      contains_direct_identifiers: false,
      contains_raw_content: false,
      contains_person_level_productivity: false,
      contains_person_level_hris_records: false,
      contains_hashed_or_joinable_person_identifiers: false,
      contains_manager_or_team_ranking: false,
      contains_people_decisioning: false,
      contains_compensation_or_performance_inference: false,
      contains_promotion_or_discipline_inference: false,
      contains_attrition_prediction: false,
      contains_hris_inference_from_ai_usage: false,
      aggregate_workforce_context_allowed: aggregateWorkforceContextAllowed,
      approved_aggregate_grain: approvedAggregateGrain,
      minimum_cohort_threshold: aggregateWorkforceContext.minimum_cohort_threshold ?? null
    },
    snapshot_readiness_decision: "READY_FOR_CAVEATED_EVIDENCE_SNAPSHOT",
    allowed_uses: [
      "aggregate_evidence_posture_review",
      "source_availability_summary",
      "missing_evidence_planning",
      "claim_blocking_evaluation"
    ],
    blocked_uses: [...SAFE_DEFAULT_BLOCKED_USES],
    required_caveats: requiredCaveats,
    next_evidence_actions: [
      "Collect aggregate Layer 2 user voice or empirical evidence if the measurement plan requires stated evidence.",
      "Collect customer-attested aggregate Layer 3 system-of-record outcome evidence before value claims are evaluated.",
      "Collect approved aggregate workforce context only if needed for workflow-level value measurement.",
      "Keep claim readiness and executive readouts caveated until missing or held evidence lanes are resolved."
    ],
    generated_at: inputs.generatedAt ?? new Date().toISOString(),
    derivation_version: "ai_value_evidence_snapshot_builder_2026_06"
  };
}

export function validateEvidenceSnapshot(
  snapshot: any
): EvidenceSnapshotValidationResult {
  const gaps = [
    ...collectTopLevelGaps(snapshot),
    ...collectEvidenceLaneGaps(snapshot),
    ...collectPlaybookLayerGaps(snapshot),
    ...collectPlaybookCoverageGaps(snapshot),
    ...collectSnapshotTypeReadinessGaps(snapshot),
    ...collectVbdOperatingMapGaps(snapshot),
    ...collectPrivacyBoundaryGaps(snapshot),
    ...collectSuppressionGaps(snapshot),
    ...collectCaveatGaps(snapshot),
    ...collectUsePolicyGaps(snapshot),
    ...collectAggregateWorkforceContextGaps(snapshot)
  ];
  const valid = gaps.length === 0;
  const snapshotType = String(snapshot?.snapshot_type ?? "");
  const canFeedExecutiveReadout =
    snapshotType === "FULL_STACK_EVIDENCE" ||
    (snapshotType === "LAYER_1_PLUS_LAYER_3" &&
      snapshotHasExecutableCoverageStatus(snapshot) &&
      snapshotHasLayer3Coverage(snapshot) &&
      hasOutcomeEvidenceReference(snapshot));

  return {
    schema_version: RESULT_SCHEMA_VERSION,
    evidence_snapshot_id: snapshot?.evidence_snapshot_id ?? null,
    org_id: snapshot?.org_id ?? null,
    valid,
    gaps,
    feeds: {
      evidence_snapshot: valid,
      claim_readiness:
        valid && !HOLD_READINESS_DECISIONS.has(snapshot?.snapshot_readiness_decision),
      executive_readout:
        valid && EXECUTIVE_READY_SNAPSHOT_TYPES.has(snapshotType) && canFeedExecutiveReadout
    }
  };
}
