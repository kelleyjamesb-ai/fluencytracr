/**
 * AI Value Engine — Measurement Plan.
 *
 * Defines the upstream, customer/workflow-specific plan that declares which
 * Playbook evidence must be collected before evidence snapshots can be built.
 * It does not persist plans, compute claims, grant financial permission, or
 * create executive readouts.
 */

export const MEASUREMENT_PLAN_SCHEMA_VERSION =
  "FT_AI_VALUE_MEASUREMENT_PLAN_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_MEASUREMENT_PLAN_VALIDATION_2026_06";

const PLAYBOOK_GROUPS = [
  "layer_1_platform_telemetry",
  "layer_2_user_voice_empirical",
  "layer_3_business_system_outcomes",
  "governance_evidence",
  "assumption_evidence"
] as const;

const ALLOWED_VALUE_ROUTES = new Set([
  "cost_reduction",
  "capacity_creation",
  "quality_improvement",
  "risk_reduction",
  "experience_improvement",
  "revenue_expansion",
  "unclassified"
]);

const ALLOWED_AGGREGATE_GRAINS = new Set([
  "org",
  "function",
  "workflow_family",
  "workflow",
  "role_family",
  "cohort",
  "custom_aggregate"
]);

const ALLOWED_METRIC_CATEGORIES = new Set([
  "cycle_time",
  "throughput",
  "quality",
  "cost",
  "risk",
  "experience",
  "revenue",
  "capacity",
  "adoption",
  "readiness",
  "other"
]);

const ALLOWED_SOURCE_SYSTEM_TYPES = new Set([
  "bigquery_telemetry",
  "customer_system_of_record",
  "aggregate_survey_export",
  "aggregate_workforce_export",
  "finance_approved_assumption",
  "manual_customer_attestation",
  "not_selected"
]);

const ALLOWED_WINDOW_ALIGNMENT_STATES = new Set([
  "baseline_only",
  "baseline_and_comparison_selected",
  "comparison_pending",
  "not_ready"
]);

const ALLOWED_WORKFORCE_CONTEXT_TYPES = new Set([
  "aggregate_role_family_context",
  "aggregate_new_hire_cohort_context",
  "aggregate_training_completion_context",
  "aggregate_capacity_planning_context",
  "aggregate_time_to_productivity_context",
  "aggregate_hiring_plan_context"
]);

const ALLOWED_ASSUMPTION_APPROVAL_STATES = new Set([
  "not_required",
  "missing",
  "submitted",
  "approved",
  "rejected",
  "held"
]);

const ALLOWED_PLAN_READINESS = new Set([
  "draft",
  "ready_for_layer_1_snapshot",
  "ready_for_layer_1_plus_layer_2_snapshot",
  "ready_for_layer_1_plus_layer_3_snapshot",
  "ready_for_full_playbook_snapshot",
  "held_for_customer_exports",
  "held_for_governance",
  "not_ready"
]);

const ALLOWED_TOP_LEVEL_USES = new Set([
  "measurement_plan_design",
  "evidence_collection_planning",
  "source_package_request",
  "evidence_snapshot_preparation"
]);

const ALLOWED_VBD_VELOCITY_BASES = new Set([
  "workflow_run_growth",
  "active_usage_growth",
  "agent_run_growth",
  "artifact_output_growth",
  "not_applicable"
]);

const ALLOWED_VBD_BREADTH_SPREAD_DIMENSIONS = new Set([
  "function",
  "workflow_family",
  "workflow",
  "role_family",
  "cohort",
  "surface",
  "use_case"
]);

const REQUIRED_VBD_BREADTH_BLOCKED_DIMENSIONS = [
  "individual",
  "employee",
  "manager_ranking",
  "team_ranking",
  "manager_chain"
];

const ALLOWED_VBD_DEPTH_BASES = new Set([
  "repeat_workflow_behavior",
  "multi_step_workflow",
  "agent_lifecycle",
  "artifact_output_metadata",
  "verification_or_review_signal",
  "governed_action_boundary",
  "not_applicable"
]);

const VBD_DEPTH_BASES_REQUIRING_PAIRING = new Set([
  "agent_lifecycle",
  "artifact_output_metadata",
  "governed_action_boundary"
]);

const ALLOWED_VBD_CLAIM_BOUNDARY_USES = new Set([
  "ai_fluency_posture",
  "layer_1_operating_signal",
  "evidence_collection_planning",
  "source_availability_context"
]);

const UNSAFE_BLOCKED_USES = [
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

const WORKFORCE_BLOCKED_USES = [
  "people_decisioning",
  "manager_or_team_ranking",
  "individual_attribution",
  "productivity_claim"
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

const GOVERNED_KEYS = new Set([
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
  "aggregate_workforce_context_requirements",
  "blocked_uses",
  "allowed_uses",
  "privacy_boundary"
]);

export interface MeasurementPlanValidationResult {
  schema_version: string;
  measurement_plan_id: string | null;
  org_id: string | null;
  valid: boolean;
  gaps: string[];
  readiness: {
    can_build_evidence_snapshot: boolean;
    max_snapshot_type:
      | "TELEMETRY_SOURCE_AVAILABILITY"
      | "TELEMETRY_ONLY_CAVEATED"
      | "LAYER_1_PLUS_LAYER_2"
      | "LAYER_1_PLUS_LAYER_3"
      | "FULL_STACK_EVIDENCE"
      | "HELD_FOR_GOVERNANCE";
    can_build_claim_readiness: boolean;
    can_build_executive_readout: boolean;
  };
}

export interface BuildPlaybookMeasurementPlanInputs {
  orgId: string;
  workflowFamily: string;
  hypothesisStatement: string;
  businessObjective: string;
  valueRoute?: string;
  functionArea?: string;
  primaryMetricId?: string;
  primaryMetricName?: string;
  baselineWindowStart: string;
  baselineWindowEnd: string;
  comparisonWindowStart?: string;
  comparisonWindowEnd?: string;
  generatedAt?: string;
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

function normalizedSet(value: any): Set<string> {
  return new Set(stringsOf(value).map((item) => item.trim().toLowerCase()));
}

function blockedUsesInclude(plan: any, token: string): boolean {
  return normalizedSet(plan?.blocked_uses).has(token);
}

function workforceBlockedUsesInclude(plan: any, token: string): boolean {
  return normalizedSet(plan?.aggregate_workforce_context_requirements?.blocked_uses)
    .has(token);
}

function dateValue(value: any): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function requireStartBeforeEnd(
  start: any,
  end: any,
  startPath: string,
  endPath: string,
  gaps: string[]
): void {
  const startDate = dateValue(start);
  const endDate = dateValue(end);
  if (startDate === null || endDate === null) return;
  if (startDate >= endDate) {
    gaps.push(`${startPath} must be before ${endPath}`);
  }
}

function allowedUseUnsafe(use: string): boolean {
  return UNSAFE_ALLOWED_USE_PATTERNS.some((pattern) => pattern.test(use));
}

function isForbiddenKey(key: string): boolean {
  if (GOVERNED_KEYS.has(key)) return false;
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

function assumptionEvidenceExplicitlyNotRequired(plan: any): boolean {
  const assumptions = plan?.playbook_evidence_requirements?.assumption_evidence;
  return assumptions?.required === false &&
    plan?.assumptions?.assumption_approval_state === "not_required" &&
    stringsOf(plan?.readiness?.required_caveats).some((caveat) =>
      /assumption evidence.*not required|assumptions.*not required/i.test(caveat)
    );
}

function layer2HasUserVoiceExport(plan: any): boolean {
  return stringsOf(
    plan?.playbook_evidence_requirements?.layer_2_user_voice_empirical?.required_exports
  ).length > 0;
}

function collectTopLevelGaps(plan: any): string[] {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "measurement_plan_id",
    "org_id",
    "value_hypothesis",
    "workflow_scope",
    "metric_selection",
    "windows",
    "playbook_evidence_requirements",
    "source_package_requirements",
    "aggregate_workforce_context_requirements",
    "vbd_measurement_design",
    "assumptions",
    "privacy_boundary",
    "readiness",
    "allowed_uses",
    "blocked_uses",
    "created_at",
    "derivation_version"
  ]) {
    requireField(plan?.[field], field, gaps);
  }
  if (plan?.schema_version && plan.schema_version !== MEASUREMENT_PLAN_SCHEMA_VERSION) {
    gaps.push(`schema_version is invalid: ${plan.schema_version}`);
  }
  requireArray(plan?.allowed_uses, "allowed_uses", gaps);
  requireArray(plan?.blocked_uses, "blocked_uses", gaps);
  return gaps;
}

function vbdBlockedUsesInclude(plan: any, token: string): boolean {
  return normalizedSet(plan?.vbd_measurement_design?.vbd_claim_boundary?.blocked_uses)
    .has(token);
}

function collectVbdMeasurementDesignGaps(plan: any): string[] {
  const gaps: string[] = [];
  const design = plan?.vbd_measurement_design;
  requireField(design, "vbd_measurement_design", gaps);
  if (!design || typeof design !== "object") return gaps;

  const velocity = design.velocity;
  requireField(velocity, "vbd_measurement_design.velocity", gaps);
  if (velocity) {
    if (typeof velocity.required !== "boolean") {
      gaps.push("vbd_measurement_design.velocity.required must be boolean");
    }
    requireEnum(
      velocity.measurement_basis,
      ALLOWED_VBD_VELOCITY_BASES,
      "vbd_measurement_design.velocity.measurement_basis",
      gaps
    );
    if (typeof velocity.baseline_required !== "boolean") {
      gaps.push("vbd_measurement_design.velocity.baseline_required must be boolean");
    }
    if (typeof velocity.comparison_required !== "boolean") {
      gaps.push("vbd_measurement_design.velocity.comparison_required must be boolean");
    }
    requireArray(velocity.caveats, "vbd_measurement_design.velocity.caveats", gaps);
    if (velocity.required === true) {
      if (
        plan?.playbook_evidence_requirements?.layer_1_platform_telemetry
          ?.required !== true
      ) {
        gaps.push("VBD velocity requires Layer 1 platform telemetry");
      }
      if (plan?.source_package_requirements?.bigquery_source_required !== true) {
        gaps.push("VBD velocity requires BigQuery or equivalent Layer 1 telemetry source package");
      }
      if (velocity.baseline_required !== true) {
        gaps.push("VBD velocity requires baseline_required true");
      }
      const windowState = plan?.windows?.window_alignment_state;
      if (
        velocity.comparison_required !== true &&
        !["baseline_only", "comparison_pending"].includes(String(windowState))
      ) {
        gaps.push(
          "VBD velocity requires comparison_required true unless the window state is baseline_only or comparison_pending"
        );
      }
    }
  }

  const breadth = design.breadth;
  requireField(breadth, "vbd_measurement_design.breadth", gaps);
  if (breadth) {
    if (typeof breadth.required !== "boolean") {
      gaps.push("vbd_measurement_design.breadth.required must be boolean");
    }
    requireEnum(
      breadth.approved_aggregate_grain,
      ALLOWED_AGGREGATE_GRAINS,
      "vbd_measurement_design.breadth.approved_aggregate_grain",
      gaps
    );
    requireArray(
      breadth.allowed_spread_dimensions,
      "vbd_measurement_design.breadth.allowed_spread_dimensions",
      gaps
    );
    if (Array.isArray(breadth.allowed_spread_dimensions)) {
      for (const dimension of breadth.allowed_spread_dimensions) {
        if (!ALLOWED_VBD_BREADTH_SPREAD_DIMENSIONS.has(dimension)) {
          gaps.push(
            `vbd_measurement_design.breadth.allowed_spread_dimensions contains invalid dimension ${dimension}`
          );
        }
      }
    }
    requireArray(
      breadth.blocked_dimensions,
      "vbd_measurement_design.breadth.blocked_dimensions",
      gaps
    );
    requireArray(breadth.caveats, "vbd_measurement_design.breadth.caveats", gaps);
    if (breadth.required === true) {
      if (
        breadth.approved_aggregate_grain !==
        plan?.workflow_scope?.approved_aggregate_grain
      ) {
        gaps.push(
          "VBD breadth approved_aggregate_grain must match workflow_scope.approved_aggregate_grain"
        );
      }
      const blockedDimensions = normalizedSet(breadth.blocked_dimensions);
      for (const dimension of REQUIRED_VBD_BREADTH_BLOCKED_DIMENSIONS) {
        if (!blockedDimensions.has(dimension)) {
          gaps.push(
            `vbd_measurement_design.breadth.blocked_dimensions missing ${dimension}`
          );
        }
      }
    }
  }

  const depth = design.depth;
  requireField(depth, "vbd_measurement_design.depth", gaps);
  if (depth) {
    if (typeof depth.required !== "boolean") {
      gaps.push("vbd_measurement_design.depth.required must be boolean");
    }
    requireEnum(
      depth.measurement_basis,
      ALLOWED_VBD_DEPTH_BASES,
      "vbd_measurement_design.depth.measurement_basis",
      gaps
    );
    if (typeof depth.requires_quality_or_outcome_pairing !== "boolean") {
      gaps.push(
        "vbd_measurement_design.depth.requires_quality_or_outcome_pairing must be boolean"
      );
    }
    requireArray(depth.caveats, "vbd_measurement_design.depth.caveats", gaps);
    if (depth.required === true) {
      if (
        plan?.playbook_evidence_requirements?.layer_1_platform_telemetry
          ?.required !== true
      ) {
        gaps.push("VBD depth requires Layer 1 platform telemetry");
      }
      if (
        VBD_DEPTH_BASES_REQUIRING_PAIRING.has(depth.measurement_basis) &&
        depth.requires_quality_or_outcome_pairing !== true
      ) {
        gaps.push(
          "VBD depth agent, artifact, or governed-action basis requires quality or outcome pairing"
        );
      }
    }
  }

  const boundary = design.vbd_claim_boundary;
  requireField(boundary, "vbd_measurement_design.vbd_claim_boundary", gaps);
  if (boundary) {
    if (
      boundary.contributes_to_playbook_layer !== "layer_1_platform_telemetry"
    ) {
      gaps.push(
        "vbd_measurement_design.vbd_claim_boundary.contributes_to_playbook_layer must be layer_1_platform_telemetry"
      );
    }
    requireArray(
      boundary.allowed_uses,
      "vbd_measurement_design.vbd_claim_boundary.allowed_uses",
      gaps
    );
    if (Array.isArray(boundary.allowed_uses)) {
      for (const use of boundary.allowed_uses) {
        if (!ALLOWED_VBD_CLAIM_BOUNDARY_USES.has(use)) {
          gaps.push(
            `vbd_measurement_design.vbd_claim_boundary.allowed_uses contains blocked or unsupported use: ${use}`
          );
        }
        if (allowedUseUnsafe(String(use))) {
          gaps.push(
            `vbd_measurement_design.vbd_claim_boundary.allowed_uses contains blocked use: ${use}`
          );
        }
      }
    }
    requireArray(
      boundary.blocked_uses,
      "vbd_measurement_design.vbd_claim_boundary.blocked_uses",
      gaps
    );
    for (const use of UNSAFE_BLOCKED_USES) {
      if (!vbdBlockedUsesInclude(plan, use)) {
        gaps.push(
          `vbd_measurement_design.vbd_claim_boundary.blocked_uses missing ${use}`
        );
      }
    }
    if (boundary.claim_readiness !== undefined) {
      gaps.push("VBD must not compute claim_readiness");
    }
    if (boundary.financial_permission !== undefined) {
      gaps.push("VBD must not compute financial_permission");
    }
    if (boundary.executive_readout !== undefined) {
      gaps.push("VBD must not compute executive_readout");
    }
  }

  return gaps;
}

function collectValueHypothesisGaps(plan: any): string[] {
  const gaps: string[] = [];
  const hypothesis = plan?.value_hypothesis ?? {};
  requireField(
    hypothesis.hypothesis_statement,
    "value_hypothesis.hypothesis_statement",
    gaps
  );
  requireEnum(
    hypothesis.value_route,
    ALLOWED_VALUE_ROUTES,
    "value_hypothesis.value_route",
    gaps
  );
  requireField(hypothesis.business_objective, "value_hypothesis.business_objective", gaps);
  return gaps;
}

function collectWorkflowScopeGaps(plan: any): string[] {
  const gaps: string[] = [];
  const scope = plan?.workflow_scope ?? {};
  requireField(scope.workflow_family, "workflow_scope.workflow_family", gaps);
  requireEnum(
    scope.approved_aggregate_grain,
    ALLOWED_AGGREGATE_GRAINS,
    "workflow_scope.approved_aggregate_grain",
    gaps
  );
  if (Number(scope.minimum_cohort_threshold) < 5) {
    gaps.push("workflow_scope.minimum_cohort_threshold must be at least 5");
  }
  if (scope.included_surfaces !== undefined) {
    requireArray(scope.included_surfaces, "workflow_scope.included_surfaces", gaps);
  }
  if (scope.excluded_surfaces !== undefined) {
    requireArray(scope.excluded_surfaces, "workflow_scope.excluded_surfaces", gaps);
  }
  return gaps;
}

function collectMetricGaps(plan: any): string[] {
  const gaps: string[] = [];
  const primary = plan?.metric_selection?.primary_metric;
  requireField(primary, "metric_selection.primary_metric", gaps);
  if (!primary) return gaps;
  requireField(primary.metric_id, "metric_selection.primary_metric.metric_id", gaps);
  requireField(primary.metric_name, "metric_selection.primary_metric.metric_name", gaps);
  requireEnum(
    primary.metric_category,
    ALLOWED_METRIC_CATEGORIES,
    "metric_selection.primary_metric.metric_category",
    gaps
  );
  requireEnum(
    primary.source_system_type,
    ALLOWED_SOURCE_SYSTEM_TYPES,
    "metric_selection.primary_metric.source_system_type",
    gaps
  );
  if (plan?.metric_selection?.supporting_metrics !== undefined) {
    requireArray(
      plan.metric_selection.supporting_metrics,
      "metric_selection.supporting_metrics",
      gaps
    );
  }
  return gaps;
}

function collectWindowGaps(plan: any): string[] {
  const gaps: string[] = [];
  const windows = plan?.windows ?? {};
  requireField(windows.baseline_window_start, "windows.baseline_window_start", gaps);
  requireField(windows.baseline_window_end, "windows.baseline_window_end", gaps);
  requireEnum(
    windows.window_alignment_state,
    ALLOWED_WINDOW_ALIGNMENT_STATES,
    "windows.window_alignment_state",
    gaps
  );
  requireStartBeforeEnd(
    windows.baseline_window_start,
    windows.baseline_window_end,
    "baseline_window_start",
    "baseline_window_end",
    gaps
  );
  if (windows.comparison_window_start && !windows.comparison_window_end) {
    gaps.push("comparison_window_end is required when comparison_window_start is provided");
  }
  if (windows.window_alignment_state === "baseline_and_comparison_selected") {
    if (!windows.comparison_window_start) {
      gaps.push("baseline_and_comparison_selected requires comparison_window_start");
    }
    if (!windows.comparison_window_end) {
      gaps.push("baseline_and_comparison_selected requires comparison_window_end");
    }
  }
  if (windows.comparison_window_start && windows.comparison_window_end) {
    requireStartBeforeEnd(
      windows.comparison_window_start,
      windows.comparison_window_end,
      "comparison_window_start",
      "comparison_window_end",
      gaps
    );
  }
  return gaps;
}

function collectPlaybookRequirementGaps(plan: any): string[] {
  const gaps: string[] = [];
  const requirements = plan?.playbook_evidence_requirements ?? {};
  for (const group of PLAYBOOK_GROUPS) {
    const entry = requirements[group];
    requireField(entry, `playbook_evidence_requirements.${group}`, gaps);
    if (!entry) continue;
    if (typeof entry.required !== "boolean") {
      gaps.push(`playbook_evidence_requirements.${group}.required must be boolean`);
    }
  }
  const layer1 = requirements.layer_1_platform_telemetry;
  if (layer1) {
    requireArray(layer1.required_signals, "playbook_evidence_requirements.layer_1_platform_telemetry.required_signals", gaps);
    requireArray(layer1.optional_signals, "playbook_evidence_requirements.layer_1_platform_telemetry.optional_signals", gaps);
    requireArray(layer1.not_applicable_signals, "playbook_evidence_requirements.layer_1_platform_telemetry.not_applicable_signals", gaps);
  }
  for (const group of ["layer_2_user_voice_empirical", "layer_3_business_system_outcomes"]) {
    const entry = requirements[group];
    if (!entry) continue;
    requireArray(entry.required_exports, `playbook_evidence_requirements.${group}.required_exports`, gaps);
    requireArray(entry.optional_exports, `playbook_evidence_requirements.${group}.optional_exports`, gaps);
    requireArray(entry.not_applicable_exports, `playbook_evidence_requirements.${group}.not_applicable_exports`, gaps);
  }
  const governance = requirements.governance_evidence;
  if (governance) {
    requireArray(governance.required_controls, "playbook_evidence_requirements.governance_evidence.required_controls", gaps);
    requireArray(governance.optional_controls, "playbook_evidence_requirements.governance_evidence.optional_controls", gaps);
  }
  const assumptions = requirements.assumption_evidence;
  if (assumptions) {
    requireArray(assumptions.required_assumptions, "playbook_evidence_requirements.assumption_evidence.required_assumptions", gaps);
    requireArray(assumptions.optional_assumptions, "playbook_evidence_requirements.assumption_evidence.optional_assumptions", gaps);
    requireArray(assumptions.required_approvals, "playbook_evidence_requirements.assumption_evidence.required_approvals", gaps);
  }
  return gaps;
}

function collectSourcePackageGaps(plan: any): string[] {
  const gaps: string[] = [];
  const source = plan?.source_package_requirements;
  requireField(source, "source_package_requirements", gaps);
  if (!source) return gaps;
  for (const field of [
    "bigquery_source_required",
    "ai_fluency_baseline_required",
    "ai_fluency_retest_required",
    "system_of_record_export_required",
    "aggregate_workforce_context_required",
    "finance_or_business_owner_approval_required",
    "control_or_policy_owner_approval_required",
    "source_owner_attestation_required"
  ]) {
    if (typeof source[field] !== "boolean") {
      gaps.push(`source_package_requirements.${field} must be boolean`);
    }
  }
  const layer2Required =
    plan?.playbook_evidence_requirements?.layer_2_user_voice_empirical?.required === true;
  if (
    layer2Required &&
    source.ai_fluency_baseline_required === false &&
    !layer2HasUserVoiceExport(plan)
  ) {
    gaps.push("Layer 2 requires AI Fluency baseline or a user voice export");
  }
  const layer3Required =
    plan?.playbook_evidence_requirements?.layer_3_business_system_outcomes?.required === true;
  if (layer3Required && source.system_of_record_export_required !== true) {
    gaps.push("Layer 3 requires system_of_record_export_required");
  }
  if (
    plan?.assumptions?.financial_assumption_required === true &&
    source.finance_or_business_owner_approval_required !== true
  ) {
    gaps.push(
      "financial assumptions require finance_or_business_owner_approval_required"
    );
  }
  return gaps;
}

function collectWorkforceGaps(plan: any): string[] {
  const gaps: string[] = [];
  const workforce = plan?.aggregate_workforce_context_requirements;
  requireField(workforce, "aggregate_workforce_context_requirements", gaps);
  if (!workforce) return gaps;
  for (const field of ["allowed", "required", "source_owner_approval_required"]) {
    if (typeof workforce[field] !== "boolean") {
      gaps.push(`aggregate_workforce_context_requirements.${field} must be boolean`);
    }
  }
  if (workforce.allowed_context_types !== undefined) {
    if (!Array.isArray(workforce.allowed_context_types)) {
      gaps.push("aggregate_workforce_context_requirements.allowed_context_types must be an array");
    } else {
      for (const contextType of workforce.allowed_context_types) {
        if (!ALLOWED_WORKFORCE_CONTEXT_TYPES.has(contextType)) {
          gaps.push(
            `aggregate_workforce_context_requirements.allowed_context_types contains invalid type ${contextType}`
          );
        }
      }
    }
  }
  if (Number(workforce.minimum_cohort_threshold) < 5) {
    gaps.push(
      "aggregate_workforce_context_requirements.minimum_cohort_threshold must be at least 5"
    );
  }
  requireArray(
    workforce.blocked_uses,
    "aggregate_workforce_context_requirements.blocked_uses",
    gaps
  );
  if (workforce.required === true) {
    if (workforce.allowed !== true) {
      gaps.push("aggregate workforce context required requires allowed true");
    }
    if (workforce.source_owner_approval_required !== true) {
      gaps.push("aggregate workforce context requires source_owner_approval_required");
    }
    for (const use of WORKFORCE_BLOCKED_USES) {
      if (!workforceBlockedUsesInclude(plan, use)) {
        gaps.push(`aggregate_workforce_context_requirements.blocked_uses missing ${use}`);
      }
    }
  }
  return gaps;
}

function collectAssumptionGaps(plan: any): string[] {
  const gaps: string[] = [];
  const assumptions = plan?.assumptions;
  requireField(assumptions, "assumptions", gaps);
  if (!assumptions) return gaps;
  for (const field of [
    "productivity_recapture_required",
    "financial_assumption_required",
    "customer_owned_assumption_required"
  ]) {
    if (typeof assumptions[field] !== "boolean") {
      gaps.push(`assumptions.${field} must be boolean`);
    }
  }
  requireEnum(
    assumptions.assumption_approval_state,
    ALLOWED_ASSUMPTION_APPROVAL_STATES,
    "assumptions.assumption_approval_state",
    gaps
  );
  if (
    assumptions.productivity_recapture_required === true &&
    assumptions.customer_owned_assumption_required !== true
  ) {
    gaps.push("productivity recapture requires customer_owned_assumption_required");
  }
  if (assumptions.notes !== undefined) {
    requireArray(assumptions.notes, "assumptions.notes", gaps);
  }
  return gaps;
}

function collectPrivacyGaps(plan: any): string[] {
  const gaps: string[] = [];
  const boundary = plan?.privacy_boundary ?? {};
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
  const forbidden = Array.from(collectForbiddenFields(plan));
  if (forbidden.length > 0) {
    gaps.push(`Forbidden field(s) present: ${forbidden.sort().join(", ")}`);
  }
  return gaps;
}

function collectReadinessGaps(plan: any): string[] {
  const gaps: string[] = [];
  const readiness = plan?.readiness ?? {};
  requireEnum(
    readiness.measurement_plan_readiness,
    ALLOWED_PLAN_READINESS,
    "readiness.measurement_plan_readiness",
    gaps
  );
  for (const field of [
    "missing_requirements",
    "held_requirements",
    "required_caveats",
    "next_actions"
  ]) {
    requireArray(readiness[field], `readiness.${field}`, gaps);
  }
  if (readiness.measurement_plan_readiness === "ready_for_full_playbook_snapshot") {
    const requirements = plan?.playbook_evidence_requirements ?? {};
    if (requirements.layer_1_platform_telemetry?.required !== true) {
      gaps.push("ready_for_full_playbook_snapshot requires Layer 1 evidence");
    }
    if (requirements.layer_2_user_voice_empirical?.required !== true) {
      gaps.push("ready_for_full_playbook_snapshot requires Layer 2 evidence");
    }
    if (requirements.layer_3_business_system_outcomes?.required !== true) {
      gaps.push("ready_for_full_playbook_snapshot requires Layer 3 evidence");
    }
    if (requirements.governance_evidence?.required !== true) {
      gaps.push("ready_for_full_playbook_snapshot requires governance evidence");
    }
    if (
      !stringsOf(requirements.governance_evidence?.required_controls)
        .map((control) => control.trim())
        .includes("k_min_posture")
    ) {
      gaps.push(
        "ready_for_full_playbook_snapshot requires governance required_controls to include k_min_posture"
      );
    }
    if (
      requirements.assumption_evidence?.required !== true &&
      !assumptionEvidenceExplicitlyNotRequired(plan)
    ) {
      gaps.push(
        "ready_for_full_playbook_snapshot requires assumption evidence or explicitly not-required assumption caveat"
      );
    }
    if (
      requirements.assumption_evidence?.required === true &&
      plan?.assumptions?.assumption_approval_state !== "approved"
    ) {
      gaps.push(
        "ready_for_full_playbook_snapshot requires approved customer-owned assumptions or explicitly not-required assumptions"
      );
    }
    if (plan?.source_package_requirements?.source_owner_attestation_required !== true) {
      gaps.push("ready_for_full_playbook_snapshot requires source owner attestation");
    }
    if (stringsOf(readiness.missing_requirements).length > 0) {
      gaps.push("ready_for_full_playbook_snapshot requires missing_requirements to be empty");
    }
    if (stringsOf(readiness.held_requirements).length > 0) {
      gaps.push("ready_for_full_playbook_snapshot requires held_requirements to be empty");
    }
  }
  if (readiness.measurement_plan_readiness === "ready_for_layer_1_plus_layer_3_snapshot") {
    const requirements = plan?.playbook_evidence_requirements ?? {};
    if (requirements.layer_3_business_system_outcomes?.required !== true) {
      gaps.push("ready_for_layer_1_plus_layer_3_snapshot requires Layer 3 evidence");
    }
    if (plan?.source_package_requirements?.system_of_record_export_required !== true) {
      gaps.push(
        "ready_for_layer_1_plus_layer_3_snapshot requires system_of_record_export_required"
      );
    }
    if (plan?.source_package_requirements?.source_owner_attestation_required !== true) {
      gaps.push(
        "ready_for_layer_1_plus_layer_3_snapshot requires source_owner_attestation_required"
      );
    }
    if (stringsOf(readiness.missing_requirements).length > 0) {
      gaps.push(
        "ready_for_layer_1_plus_layer_3_snapshot requires missing_requirements to be empty"
      );
    }
    if (stringsOf(readiness.held_requirements).length > 0) {
      gaps.push(
        "ready_for_layer_1_plus_layer_3_snapshot requires held_requirements to be empty"
      );
    }
  }
  return gaps;
}

function collectUseGaps(plan: any): string[] {
  const gaps: string[] = [];
  for (const use of stringsOf(plan?.allowed_uses)) {
    if (!ALLOWED_TOP_LEVEL_USES.has(use)) {
      gaps.push(`allowed_uses contains unsupported use: ${use}`);
    }
    if (allowedUseUnsafe(use)) {
      gaps.push(`allowed_uses contains blocked use: ${use}`);
    }
  }
  for (const use of UNSAFE_BLOCKED_USES) {
    if (!blockedUsesInclude(plan, use)) {
      gaps.push(`blocked_uses missing ${use}`);
    }
  }
  if (plan?.claim_readiness !== undefined) {
    gaps.push("measurement plan must not compute claim_readiness");
  }
  if (plan?.financial_permission !== undefined) {
    gaps.push("measurement plan must not compute financial_permission");
  }
  if (plan?.executive_readout !== undefined) {
    gaps.push("measurement plan must not become an executive_readout");
  }
  return gaps;
}

function deriveMaxSnapshotType(plan: any): MeasurementPlanValidationResult["readiness"]["max_snapshot_type"] {
  const readiness = plan?.readiness?.measurement_plan_readiness;
  if (readiness === "held_for_governance") return "HELD_FOR_GOVERNANCE";
  if (readiness === "ready_for_full_playbook_snapshot") return "FULL_STACK_EVIDENCE";
  if (readiness === "ready_for_layer_1_plus_layer_3_snapshot") return "LAYER_1_PLUS_LAYER_3";
  if (readiness === "ready_for_layer_1_plus_layer_2_snapshot") return "LAYER_1_PLUS_LAYER_2";
  if (readiness === "ready_for_layer_1_snapshot" || readiness === "held_for_customer_exports" || readiness === "draft") {
    return "TELEMETRY_ONLY_CAVEATED";
  }
  return "TELEMETRY_SOURCE_AVAILABILITY";
}

function deriveReadiness(
  plan: any,
  valid: boolean
): MeasurementPlanValidationResult["readiness"] {
  const planReadiness = plan?.readiness?.measurement_plan_readiness;
  const maxSnapshotType = deriveMaxSnapshotType(plan);
  const canBuildEvidenceSnapshot = valid && planReadiness !== "not_ready";
  const canBuildClaimReadiness =
    valid &&
    (maxSnapshotType === "LAYER_1_PLUS_LAYER_3" ||
      maxSnapshotType === "FULL_STACK_EVIDENCE");
  const canBuildExecutiveReadout = canBuildClaimReadiness;
  return {
    can_build_evidence_snapshot: canBuildEvidenceSnapshot,
    max_snapshot_type: maxSnapshotType,
    can_build_claim_readiness: canBuildClaimReadiness,
    can_build_executive_readout: canBuildExecutiveReadout
  };
}

function safeIdPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function buildPlaybookMeasurementPlanDraft(
  inputs: BuildPlaybookMeasurementPlanInputs
): any {
  const createdAt = inputs.generatedAt ?? new Date().toISOString();
  const measurementPlanId = inputs.measurementPlanId ??
    `measurement_plan_${safeIdPart(inputs.orgId)}_${safeIdPart(inputs.workflowFamily)}_${safeIdPart(inputs.baselineWindowStart)}_${safeIdPart(inputs.baselineWindowEnd)}`;
  return {
    schema_version: MEASUREMENT_PLAN_SCHEMA_VERSION,
    measurement_plan_id: measurementPlanId,
    org_id: inputs.orgId,
    value_hypothesis: {
      value_hypothesis_id: null,
      hypothesis_statement: inputs.hypothesisStatement,
      value_route: inputs.valueRoute ?? "unclassified",
      business_objective: inputs.businessObjective,
      sponsor_role: null,
      owner_role: null
    },
    workflow_scope: {
      workflow_family: inputs.workflowFamily,
      workflow_name: null,
      function_area: inputs.functionArea ?? null,
      included_surfaces: [],
      excluded_surfaces: [],
      approved_aggregate_grain: "workflow_family",
      minimum_cohort_threshold: 5
    },
    metric_selection: {
      primary_metric: {
        metric_id: inputs.primaryMetricId ?? "primary_metric_pending",
        metric_name: inputs.primaryMetricName ?? "Primary outcome metric pending",
        metric_category: "cycle_time",
        source_system_type: "customer_system_of_record",
        metric_owner_role: null
      },
      supporting_metrics: []
    },
    windows: {
      baseline_window_start: inputs.baselineWindowStart,
      baseline_window_end: inputs.baselineWindowEnd,
      comparison_window_start: inputs.comparisonWindowStart ?? null,
      comparison_window_end: inputs.comparisonWindowEnd ?? null,
      window_alignment_state: inputs.comparisonWindowStart && inputs.comparisonWindowEnd
        ? "baseline_and_comparison_selected"
        : "comparison_pending"
    },
    playbook_evidence_requirements: {
      layer_1_platform_telemetry: {
        required: true,
        required_signals: [
          "workflow_run_count",
          "active_user_aggregate",
          "eligible_cohort_size",
          "suppression_or_blocked_event_posture"
        ],
        optional_signals: [
          "search_activity",
          "chat_or_assistant_activity",
          "ai_answer_activity",
          "skill_lifecycle_activity",
          "agent_lifecycle_activity",
          "artifact_output_metadata"
        ],
        not_applicable_signals: []
      },
      layer_2_user_voice_empirical: {
        required: true,
        required_exports: [
          "aggregate_ai_fluency_baseline",
          "aggregate_user_voice_or_workflow_observation"
        ],
        optional_exports: ["aggregate_ai_fluency_retest"],
        not_applicable_exports: []
      },
      layer_3_business_system_outcomes: {
        required: true,
        required_exports: [
          "customer_attested_kpi_baseline",
          "customer_attested_kpi_comparison",
          "system_of_record_outcome_export"
        ],
        optional_exports: [],
        not_applicable_exports: []
      },
      governance_evidence: {
        required: true,
        required_controls: [
          "source_readiness_state",
          "data_boundary_state",
          "k_min_posture",
          "forbidden_field_checks",
          "raw_content_exclusion"
        ],
        optional_controls: [
          "control_or_policy_owner_approval",
          "mcp_action_boundary_review"
        ]
      },
      assumption_evidence: {
        required: true,
        required_assumptions: ["customer_owned_assumptions"],
        optional_assumptions: [
          "productivity_recapture_assumption_if_relevant",
          "financial_assumption_approval_if_requested"
        ],
        required_approvals: [
          "customer_owned_assumptions",
          "aggregate_workforce_context_approval_if_used"
        ]
      }
    },
    source_package_requirements: {
      bigquery_source_required: true,
      ai_fluency_baseline_required: true,
      ai_fluency_retest_required: false,
      system_of_record_export_required: true,
      aggregate_workforce_context_required: false,
      finance_or_business_owner_approval_required: false,
      control_or_policy_owner_approval_required: false,
      source_owner_attestation_required: true
    },
    aggregate_workforce_context_requirements: {
      allowed: true,
      required: false,
      allowed_context_types: [
        "aggregate_role_family_context",
        "aggregate_new_hire_cohort_context",
        "aggregate_training_completion_context",
        "aggregate_capacity_planning_context",
        "aggregate_time_to_productivity_context",
        "aggregate_hiring_plan_context"
      ],
      source_owner_approval_required: false,
      minimum_cohort_threshold: 5,
      blocked_uses: WORKFORCE_BLOCKED_USES
    },
    vbd_measurement_design: {
      velocity: {
        required: true,
        measurement_basis: "workflow_run_growth",
        baseline_required: true,
        comparison_required: !["baseline_only", "comparison_pending"].includes(
          inputs.comparisonWindowStart && inputs.comparisonWindowEnd
            ? "baseline_and_comparison_selected"
            : "comparison_pending"
        ),
        caveats: [
          "Velocity is Layer 1 platform telemetry about aggregate AI-enabled work movement over time; it is not ROI, productivity, causality, or financial proof."
        ]
      },
      breadth: {
        required: true,
        approved_aggregate_grain: "workflow_family",
        allowed_spread_dimensions: [
          "function",
          "workflow_family",
          "workflow",
          "role_family",
          "cohort",
          "surface",
          "use_case"
        ],
        blocked_dimensions: REQUIRED_VBD_BREADTH_BLOCKED_DIMENSIONS,
        caveats: [
          "Breadth measures spread across approved aggregate slices only and cannot become person-level analytics, manager ranking, or team ranking."
        ]
      },
      depth: {
        required: true,
        measurement_basis: "repeat_workflow_behavior",
        requires_quality_or_outcome_pairing: false,
        caveats: [
          "Depth describes embedded repeatable workflow behavior as Layer 1 posture; business value requires Layer 3 outcome evidence or accepted quality/outcome evidence."
        ]
      },
      vbd_claim_boundary: {
        contributes_to_playbook_layer: "layer_1_platform_telemetry",
        allowed_uses: [
          "ai_fluency_posture",
          "layer_1_operating_signal",
          "evidence_collection_planning",
          "source_availability_context"
        ],
        blocked_uses: UNSAFE_BLOCKED_USES
      }
    },
    assumptions: {
      productivity_recapture_required: false,
      financial_assumption_required: false,
      customer_owned_assumption_required: true,
      assumption_approval_state: "held",
      notes: [
        "Customer-owned assumptions are held until approved by the customer or business owner."
      ]
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
      contains_hris_inference_from_ai_usage: false
    },
    readiness: {
      measurement_plan_readiness: "held_for_customer_exports",
      missing_requirements: [
        "layer_2_user_voice_empirical",
        "layer_3_business_system_outcomes"
      ],
      held_requirements: [
        "assumption_evidence",
        "source_owner_attestation"
      ],
      required_caveats: [
        "Layer 1 telemetry readiness is not full Playbook readiness.",
        "Layer 2 user voice or empirical evidence is required before stronger evidence snapshots can be generated.",
        "Layer 3 business system-of-record outcome evidence is required before claim readiness or executive readout planning.",
        "Customer-owned assumptions remain held until approved.",
        "This measurement plan does not compute claim readiness, financial permission, or executive readout output."
      ],
      next_actions: [
        "Collect aggregate AI Fluency baseline or user voice export.",
        "Collect customer-attested KPI baseline and comparison exports.",
        "Collect source owner attestation.",
        "Collect customer-owned assumptions.",
        "Collect aggregate workforce context approval if relevant."
      ]
    },
    allowed_uses: [
      "measurement_plan_design",
      "evidence_collection_planning",
      "source_package_request",
      "evidence_snapshot_preparation"
    ],
    blocked_uses: [
      ...UNSAFE_BLOCKED_USES,
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
    ],
    created_at: createdAt,
    updated_at: null,
    derivation_version: "ai_value_measurement_plan_builder_2026_06"
  };
}

export function validateMeasurementPlan(plan: any): MeasurementPlanValidationResult {
  const gaps = [
    ...collectTopLevelGaps(plan),
    ...collectValueHypothesisGaps(plan),
    ...collectWorkflowScopeGaps(plan),
    ...collectMetricGaps(plan),
    ...collectWindowGaps(plan),
    ...collectPlaybookRequirementGaps(plan),
    ...collectSourcePackageGaps(plan),
    ...collectWorkforceGaps(plan),
    ...collectVbdMeasurementDesignGaps(plan),
    ...collectAssumptionGaps(plan),
    ...collectPrivacyGaps(plan),
    ...collectReadinessGaps(plan),
    ...collectUseGaps(plan)
  ];
  const valid = gaps.length === 0;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    measurement_plan_id: plan?.measurement_plan_id ?? null,
    org_id: plan?.org_id ?? null,
    valid,
    gaps,
    readiness: deriveReadiness(plan, valid)
  };
}
