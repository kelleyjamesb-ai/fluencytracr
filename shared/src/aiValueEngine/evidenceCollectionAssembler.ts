/**
 * AI Value Engine - Evidence Collection Assembler.
 *
 * Non-persisted bridge from a validated Measurement Plan plus validated Source
 * Packages into a draft Evidence Snapshot input. This is not ingestion,
 * persistence, a route, or UI, and it cannot compute downstream claims.
 */

import {
  buildTelemetryEvidenceSnapshotDraft,
  validateEvidenceSnapshot
} from "./evidenceSnapshot";
import { validateMeasurementPlan } from "./measurementPlan";
import { validateSourcePackage } from "./sourcePackages";

export const EVIDENCE_COLLECTION_ASSEMBLY_SCHEMA_VERSION =
  "FT_AI_VALUE_EVIDENCE_COLLECTION_ASSEMBLY_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_EVIDENCE_COLLECTION_ASSEMBLY_VALIDATION_2026_06";

const PLAYBOOK_LAYERS = [
  "layer_1_platform_telemetry",
  "layer_2_user_voice_empirical",
  "layer_3_business_system_outcomes",
  "governance_evidence",
  "assumption_evidence"
];

const EVIDENCE_LANE_TO_PACKAGE_TYPE: Record<string, string> = {
  surface_usage: "layer_1_bigquery_telemetry_summary",
  skill_lifecycle: "layer_1_bigquery_telemetry_summary",
  agent_lifecycle: "layer_1_bigquery_telemetry_summary",
  mcp_action_boundary: "governance_control_export",
  artifact_output: "layer_1_bigquery_telemetry_summary",
  control_evidence: "governance_control_export",
  assumptions: "assumption_approval_export"
};

const PACKAGE_TYPE_TO_LAYER: Record<string, string> = {
  layer_1_bigquery_telemetry_summary: "layer_1_platform_telemetry",
  layer_2_user_voice_empirical_export: "layer_2_user_voice_empirical",
  layer_3_business_system_of_record_outcome_export:
    "layer_3_business_system_outcomes",
  governance_control_export: "governance_evidence",
  assumption_approval_export: "assumption_evidence"
};

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

const REQUIRED_LAYER_2_EXPORTS = [
  "aggregate_ai_fluency_baseline",
  "aggregate_ai_fluency_retest",
  "aggregate_user_voice_or_workflow_observation"
];

const REQUIRED_LAYER_3_EXPORTS = [
  "customer_attested_kpi_baseline",
  "customer_attested_kpi_comparison",
  "system_of_record_outcome_export"
];

const REQUIRED_ASSUMPTION_APPROVALS = [
  "customer_owned_assumptions",
  "finance_or_business_owner_approval",
  "aggregate_workforce_context_approval_if_used"
];

const SAFE_BLOCKED_USES = [
  "realized_roi",
  "ebita_claim",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "people_decisioning",
  "customer_facing_financial_output",
  "customer_facing_economic_output",
  "realized_roi_calculation",
  "roi_proof",
  "dollarized_output",
  "financial_value_claim",
  "usage_derived_financial_claim",
  "manager_ranking",
  "team_ranking",
  "person_level_hris_records",
  "hashed_or_joinable_person_identifiers",
  "compensation_or_performance_inference",
  "promotion_or_discipline_inference",
  "attrition_prediction",
  "hris_inference_from_ai_usage"
];

const DISALLOWED_ASSEMBLY_KEY_PATTERNS = [
  /raw_(?:rows?|prompt|response|transcript|content)/i,
  /raw_rows/i,
  /prompt/i,
  /^responses?$/i,
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
  /direct_identifier/i,
  /hashed_(?:user|person|employee)_id/i,
  /pseudonymous_(?:user|person|employee)_(?:id|identifier)/i,
  /tokenized_(?:user|person|employee)_(?:id|identifier)/i,
  /joinable_(?:user|person|employee)_identifier/i,
  /joinable_person_identifier/i,
  /person_level_hris/i,
  /person_level_productivity/i,
  /manager_ranking/i,
  /team_ranking/i,
  /manager_or_team_ranking/i,
  /people_decisioning/i,
  /compensation/i,
  /performance_rating/i,
  /performance_inference/i,
  /promotion/i,
  /discipline/i,
  /attrition_prediction/i,
  /hris_inference/i,
  /^roi$/i,
  /^ebita$/i,
  /^causality$/i,
  /^financial_impact$/i,
  /^financial_output$/i,
  /^customer_facing_financial_output$/i,
  /^customer_facing_economic_output$/i
];

const ALLOWED_PRIVACY_BOUNDARY_KEYS = new Set([
  "aggregate_only",
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
  "aggregate_workforce_context_allowed",
  "approved_aggregate_grain"
]);

const PLAN_PACKAGE_COMPARISON_FIELDS = [
  "org_id",
  "covered_window.window_start",
  "covered_window.window_end",
  "approved_aggregate_grain"
];

export const EvidenceCollectionAssemblySchema = {
  schema_version: EVIDENCE_COLLECTION_ASSEMBLY_SCHEMA_VERSION,
  persisted: false,
  creates_ingestion_jobs: false,
  creates_backend_routes: false,
  creates_frontend_ui: false,
  feeds: {
    evidence_snapshot_input: true,
    claim_readiness_snapshot: false,
    executive_readout_snapshot: false,
    customer_facing_economic_output: false
  }
} as const;

export interface EvidenceCollectionAssembly {
  schema_version: string;
  evidence_collection_assembly_id: string;
  org_id: string | null;
  measurement_plan_id: string | null;
  measurement_plan_validation_result: any;
  source_package_ids: string[];
  source_package_validation_results: any[];
  source_package_plan_mismatch_gaps: string[];
  draft_evidence_snapshot_input: any;
  feeds: {
    evidence_snapshot_input: boolean;
    claim_readiness_snapshot: false;
    executive_readout_snapshot: false;
    customer_facing_economic_output: false;
  };
  generated_at: string;
  derivation_version: string;
}

export interface EvidenceCollectionAssemblyValidationResult {
  schema_version: string;
  evidence_collection_assembly_id: string | null;
  org_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    evidence_snapshot_input: boolean;
    claim_readiness_snapshot: false;
    executive_readout_snapshot: false;
    customer_facing_economic_output: false;
  };
}

export interface BuildEvidenceCollectionAssemblyOptions {
  assemblyId?: string;
  evidenceSnapshotId?: string;
  generatedAt?: string;
}

function safeIdPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function stringsOf(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value && value.trim() !== ""))];
}

function mergeUnique(target: string[], values: string[]): string[] {
  return unique([...target, ...values]);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function normalizeKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function statusForPackageState(state: any): string {
  return ["present", "partial", "missing", "held", "suppressed", "not_computed"]
    .includes(String(state))
    ? String(state)
    : "held";
}

function confidenceForState(state: string): string {
  if (state === "present") return "medium";
  if (state === "partial") return "low";
  return "unknown";
}

function allSourcePackagesSafe(sourcePackageResults: any[]): boolean {
  return sourcePackageResults.every((result) => result.valid === true);
}

function getPath(value: any, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], value);
}

function expectedPackageValueForPlan(plan: any, path: string): any {
  if (path === "covered_window.window_start") {
    return plan?.windows?.baseline_window_start;
  }
  if (path === "covered_window.window_end") {
    return plan?.windows?.baseline_window_end;
  }
  if (path === "approved_aggregate_grain") {
    return plan?.workflow_scope?.approved_aggregate_grain;
  }
  return getPath(plan, path);
}

function collectPackagePlanMismatchGaps(plan: any, packages: any[]): string[] {
  const gaps: string[] = [];
  for (const pkg of packages) {
    for (const field of PLAN_PACKAGE_COMPARISON_FIELDS) {
      if (
        field === "approved_aggregate_grain" &&
        pkg?.source_package_type === "aggregate_workforce_context_export"
      ) {
        continue;
      }
      const expected = expectedPackageValueForPlan(plan, field);
      const actual = getPath(pkg, field);
      if (
        expected !== undefined &&
        expected !== null &&
        actual !== undefined &&
        actual !== null &&
        String(actual) !== String(expected)
      ) {
        gaps.push(
          `source package ${pkg?.source_package_id ?? "unknown"} ${field} (${actual}) does not match measurement plan (${expected})`
        );
      }
    }
  }
  return gaps;
}

function packageKMinClear(pkg: any): boolean {
  return pkg?.k_min_posture?.cohort_threshold_met === true &&
    Number(pkg?.minimum_cohort_threshold ?? 0) >= 5 &&
    Number(pkg?.k_min_posture?.minimum_cohort_threshold ?? 0) >= 5 &&
    Number(pkg?.k_min_posture?.suppressed_or_unknown_slices ?? 0) === 0 &&
    Number(pkg?.k_min_posture?.total_slices ?? 0) > 0 &&
    Number(pkg?.k_min_posture?.k_min_clear_slices ?? -1) ===
      Number(pkg?.k_min_posture?.total_slices ?? 0);
}

function packageCanFeedSourceRef(pkg: any): boolean {
  return ["present", "partial"].includes(String(pkg?.evidence_state)) &&
    packageKMinClear(pkg);
}

function findPackageByType(packages: any[], type: string): any | null {
  return packages.find((pkg) => pkg?.source_package_type === type) ?? null;
}

function packageCaveats(pkg: any): string[] {
  return [
    ...stringsOf(pkg?.caveats),
    ...stringsOf(pkg?.source_owner_attestation?.caveats)
  ];
}

function sourceReadinessIds(packages: any[]): string[] {
  return unique(
    packages
      .map((pkg) => pkg?.source_refs?.source_readiness_id)
      .filter(Boolean)
      .map(String)
  );
}

function sourcePackageIds(packages: any[]): string[] {
  return unique(packages.map((pkg) => pkg?.source_package_id).filter(Boolean).map(String));
}

function buildSourceRefs(packages: any[]): any {
  const layer1 = findPackageByType(packages, "layer_1_bigquery_telemetry_summary");
  const layer2 = findPackageByType(packages, "layer_2_user_voice_empirical_export");
  const layer3 = findPackageByType(
    packages,
    "layer_3_business_system_of_record_outcome_export"
  );
  const workforce = findPackageByType(packages, "aggregate_workforce_context_export");
  const governance = findPackageByType(packages, "governance_control_export");
  const assumption = findPackageByType(packages, "assumption_approval_export");

  return {
    bigquery_probe_result_id: layer1?.source_refs?.aggregate_probe_id ?? null,
    v3_verdict_ids: [],
    velocity_observation_ids: [],
    outcome_evidence_ids: layer3?.source_refs?.aggregate_outcome_export_id
      ? [layer3.source_refs.aggregate_outcome_export_id]
      : [],
    fluency_baseline_ids: layer2?.source_refs?.aggregate_export_id
      ? [layer2.source_refs.aggregate_export_id]
      : [],
    source_readiness_ids: sourceReadinessIds(packages),
    real_source_manifest_ids: [],
    aggregate_workforce_context_export_ids:
      workforce?.source_refs?.aggregate_workforce_context_export_id
        ? [workforce.source_refs.aggregate_workforce_context_export_id]
        : [],
    source_package_ids: sourcePackageIds(packages),
    governance_control_export_ids: governance?.source_refs?.governance_control_export_id
      ? [governance.source_refs.governance_control_export_id]
      : [],
    assumption_approval_export_ids: assumption?.source_refs?.assumption_approval_export_id
      ? [assumption.source_refs.assumption_approval_export_id]
      : [],
    notes: [
      "Evidence Collection Assembly stores source refs only; no raw rows or raw source content are retained."
    ]
  };
}

function buildTelemetrySummary(layer1Package: any, plan: any): any {
  const kMinPosture = layer1Package?.k_min_posture ?? {};
  const layer1KMinClear = layer1Package ? packageKMinClear(layer1Package) : false;
  return {
    probe_window_start:
      layer1Package?.covered_window?.window_start ??
      plan?.windows?.baseline_window_start ??
      null,
    probe_window_end:
      layer1Package?.covered_window?.window_end ??
      plan?.windows?.baseline_window_end ??
      null,
    aggregate_event_count: layer1KMinClear ? 1 : null,
    table_families_checked: layer1Package ? ["source_package_layer_1_summary"] : [],
    approved_field_coverage_summary: null,
    k_min_summary: {
      total_slices: Number(kMinPosture.total_slices ?? 0),
      k_min_clear_slices: Number(kMinPosture.k_min_clear_slices ?? 0),
      suppressed_or_unknown_slices: Number(kMinPosture.suppressed_or_unknown_slices ?? 0),
      minimum_cohort_threshold: Number(
        kMinPosture.minimum_cohort_threshold ??
          layer1Package?.minimum_cohort_threshold ??
          plan?.workflow_scope?.minimum_cohort_threshold ??
          0
      )
    }
  };
}

function buildAggregateWorkforceContext(workforcePackage: any): any | undefined {
  if (!workforcePackage) return undefined;
  const context = workforcePackage.aggregate_workforce_context ?? {};
  return {
    context_state: "provided_aggregate_safe",
    source_type: "aggregate_workforce_export",
    allowed_context_types: Array.isArray(context.allowed_context_types)
      ? context.allowed_context_types
      : [],
    source_owner_approval_state: context.source_owner_approval_state ?? "approved",
    minimum_cohort_threshold: workforcePackage.minimum_cohort_threshold,
    cohort_threshold_met: context.cohort_threshold_met === true &&
      workforcePackage.k_min_posture?.cohort_threshold_met === true,
    caveats: packageCaveats(workforcePackage)
  };
}

function setLayer(
  snapshot: any,
  layer: string,
  state: string,
  coveredSignals: string[],
  requiredSourceExports: string[] = [],
  requiredApprovals: string[] = [],
  caveats: string[] = []
): void {
  const normalizedState = statusForPackageState(state);
  snapshot.playbook_layers[layer] = {
    evidence_state: normalizedState,
    confidence: confidenceForState(normalizedState),
    caveats
  };
  snapshot.playbook_coverage[layer] = {
    status: normalizedState,
    covered_signals: ["present", "partial"].includes(normalizedState)
      ? coveredSignals
      : [],
    missing_signals: normalizedState === "missing"
      ? EXPECTED_COVERAGE_SIGNALS[layer]
      : [],
    held_signals: ["held", "suppressed", "not_computed"].includes(normalizedState)
      ? EXPECTED_COVERAGE_SIGNALS[layer]
      : [],
    caveats
  };
  if (requiredSourceExports.length > 0) {
    snapshot.playbook_coverage[layer].required_source_exports = requiredSourceExports;
  }
  if (requiredApprovals.length > 0 || layer === "assumption_evidence") {
    snapshot.playbook_coverage[layer].required_approvals = requiredApprovals;
  }
}

function applyPackageLayer(snapshot: any, pkg: any): void {
  const layer = PACKAGE_TYPE_TO_LAYER[pkg?.source_package_type];
  if (!layer) return;
  const caveats = packageCaveats(pkg);
  if (!packageKMinClear(pkg)) {
    setLayer(
      snapshot,
      layer,
      "suppressed",
      EXPECTED_COVERAGE_SIGNALS[layer],
      layer === "layer_2_user_voice_empirical"
        ? REQUIRED_LAYER_2_EXPORTS
        : layer === "layer_3_business_system_outcomes"
          ? REQUIRED_LAYER_3_EXPORTS
          : [],
      layer === "assumption_evidence" ? REQUIRED_ASSUMPTION_APPROVALS : [],
      mergeUnique(caveats, [
        `${layer} source package failed k-min cohort threshold and affected evidence is suppressed.`
      ])
    );
    snapshot.suppression.reason_codes = mergeUnique(
      snapshot.suppression.reason_codes,
      ["INSUFFICIENT_VOLUME"]
    );
    if (layer === "governance_evidence") {
      snapshot.suppression.suppressed_lanes = mergeUnique(
        snapshot.suppression.suppressed_lanes,
        ["mcp_action_boundary", "control_evidence"]
      );
    }
    if (layer === "assumption_evidence") {
      snapshot.suppression.suppressed_lanes = mergeUnique(
        snapshot.suppression.suppressed_lanes,
        ["assumptions"]
      );
    }
    return;
  }
  const state = statusForPackageState(pkg.evidence_state);
  if (layer === "layer_2_user_voice_empirical") {
    setLayer(
      snapshot,
      layer,
      state,
      EXPECTED_COVERAGE_SIGNALS[layer],
      REQUIRED_LAYER_2_EXPORTS,
      [],
      caveats
    );
    return;
  }
  if (layer === "layer_3_business_system_outcomes") {
    setLayer(
      snapshot,
      layer,
      state,
      EXPECTED_COVERAGE_SIGNALS[layer],
      REQUIRED_LAYER_3_EXPORTS,
      [],
      caveats
    );
    return;
  }
  if (layer === "assumption_evidence") {
    const assumptionState = pkg?.assumption_approval?.approval_state === "approved"
      ? state
      : "held";
    setLayer(
      snapshot,
      layer,
      assumptionState,
      EXPECTED_COVERAGE_SIGNALS[layer],
      [],
      REQUIRED_ASSUMPTION_APPROVALS,
      caveats
    );
    return;
  }
  setLayer(snapshot, layer, state, EXPECTED_COVERAGE_SIGNALS[layer], [], [], caveats);
}

function setLayerOneMissing(snapshot: any): void {
  setLayer(
    snapshot,
    "layer_1_platform_telemetry",
    "missing",
    EXPECTED_COVERAGE_SIGNALS.layer_1_platform_telemetry,
    [],
    [],
    [
      "Layer 1 platform telemetry source package is missing; evidence remains held for source package collection."
    ]
  );
  for (const lane of snapshot.evidence_lanes) {
    if (
      ["surface_usage", "skill_lifecycle", "agent_lifecycle", "artifact_output"]
        .includes(lane.lane)
    ) {
      lane.evidence_state = "missing";
      lane.classification = "not_available";
      lane.can_support_evidence_snapshot = false;
      lane.caveats = mergeUnique(lane.caveats, [
        "Layer 1 platform telemetry source package is missing; this lane cannot be treated as available."
      ]);
    }
  }
}

function setLayerOneSuppressed(snapshot: any, layer1Package: any): void {
  setLayer(
    snapshot,
    "layer_1_platform_telemetry",
    "suppressed",
    EXPECTED_COVERAGE_SIGNALS.layer_1_platform_telemetry,
    [],
    [],
    [
      "Layer 1 platform telemetry source package failed k-min cohort threshold and is suppressed for evidence posture."
    ]
  );
  snapshot.suppression.reason_codes = mergeUnique(
    snapshot.suppression.reason_codes,
    ["INSUFFICIENT_VOLUME"]
  );
  snapshot.suppression.suppressed_lanes = mergeUnique(
    snapshot.suppression.suppressed_lanes,
    ["surface_usage", "skill_lifecycle", "agent_lifecycle", "artifact_output"]
  );
  snapshot.aggregate_telemetry_summary.k_min_summary = {
    total_slices: Number(layer1Package?.k_min_posture?.total_slices ?? 0),
    k_min_clear_slices: Number(layer1Package?.k_min_posture?.k_min_clear_slices ?? 0),
    suppressed_or_unknown_slices: Number(
      layer1Package?.k_min_posture?.suppressed_or_unknown_slices ?? 0
    ),
    minimum_cohort_threshold: Number(
      layer1Package?.k_min_posture?.minimum_cohort_threshold ??
        layer1Package?.minimum_cohort_threshold ??
        0
    )
  };
}

function updateEvidenceLanes(snapshot: any, validPackages: any[]): void {
  for (const lane of snapshot.evidence_lanes) {
    const packageType = EVIDENCE_LANE_TO_PACKAGE_TYPE[lane.lane];
    const pkg = packageType ? findPackageByType(validPackages, packageType) : null;
    if (!pkg) continue;
    if (!packageKMinClear(pkg)) {
      lane.evidence_state = "suppressed";
      lane.classification = "not_available";
      lane.can_support_evidence_snapshot = false;
      lane.caveats = mergeUnique(lane.caveats, [
        ...packageCaveats(pkg),
        "Layer 1 telemetry source package failed k-min cohort threshold and cannot support this evidence lane."
      ]);
      continue;
    }
    if (pkg.evidence_state === "present") {
      if (
        packageType === "layer_1_bigquery_telemetry_summary" &&
        lane.lane !== "surface_usage"
      ) {
        lane.evidence_state = lane.evidence_state === "missing"
          ? "partial"
          : lane.evidence_state;
        lane.classification = lane.classification === "not_available"
          ? "partially_available"
          : lane.classification;
        lane.can_support_evidence_snapshot = true;
        lane.caveats = mergeUnique(lane.caveats, [
          ...packageCaveats(pkg),
          "Generic Layer 1 telemetry source package does not by itself prove this evidence lane is fully present."
        ]);
        continue;
      }
      lane.evidence_state = "present";
      lane.classification = "available_now";
      lane.can_support_evidence_snapshot = true;
      lane.caveats = mergeUnique(lane.caveats, packageCaveats(pkg));
    }
    if (pkg.evidence_state === "suppressed") {
      lane.evidence_state = "suppressed";
      lane.classification = "not_available";
      lane.can_support_evidence_snapshot = false;
      lane.caveats = mergeUnique(lane.caveats, packageCaveats(pkg));
    }
  }
}

function packagePresent(validPackages: any[], type: string): boolean {
  const pkg = findPackageByType(validPackages, type);
  return pkg?.evidence_state === "present" && packageKMinClear(pkg);
}

function allKMinClear(validPackages: any[]): boolean {
  return validPackages.length > 0 && validPackages.every(packageKMinClear);
}

function assumptionsPresent(validPackages: any[]): boolean {
  const pkg = findPackageByType(validPackages, "assumption_approval_export");
  return pkg?.evidence_state === "present" &&
    pkg?.assumption_approval?.approval_state === "approved" &&
    packageKMinClear(pkg);
}

function determineCoverageStatus(snapshot: any, validPackages: any[]): string {
  const layer1Package = findPackageByType(validPackages, "layer_1_bigquery_telemetry_summary");
  const layer1Ready = layer1Package &&
    ["present", "partial"].includes(String(snapshot.playbook_coverage.layer_1_platform_telemetry.status));
  const layer2Ready = packagePresent(validPackages, "layer_2_user_voice_empirical_export");
  const layer3Ready = packagePresent(
    validPackages,
    "layer_3_business_system_of_record_outcome_export"
  );
  const governanceReady = packagePresent(validPackages, "governance_control_export");
  const assumptionReady = assumptionsPresent(validPackages);
  if (!layer1Ready) return "layer_1_only";
  const fullReady =
    layer1Ready &&
    layer2Ready &&
    layer3Ready &&
    governanceReady &&
    assumptionReady &&
    allKMinClear(validPackages) &&
    snapshot.privacy_boundary.aggregate_only === true;

  if (fullReady) return "full_playbook_coverage";
  if (layer2Ready && layer3Ready) return "layer_1_plus_layer_2_and_layer_3";
  if (layer3Ready) return "layer_1_plus_partial_layer_3";
  if (layer2Ready) return "layer_1_plus_partial_layer_2";
  return "layer_1_only";
}

function applyCoverageStatus(snapshot: any, coverageStatus: string): void {
  snapshot.playbook_coverage.coverage_status = coverageStatus;
  if (coverageStatus === "full_playbook_coverage") {
    snapshot.snapshot_type = "FULL_STACK_EVIDENCE";
    snapshot.snapshot_readiness_decision = "READY_FOR_FULL_PLAYBOOK_SNAPSHOT";
    snapshot.suppression.held_lanes = [];
    snapshot.suppression.missing_lanes = [];
    snapshot.suppression.suppressed_lanes = [];
    snapshot.suppression.reason_codes = [];
    snapshot.suppression.hidden_values_exposed = false;
    snapshot.required_caveats = [
      "Full Playbook coverage is validated only for this aggregate workflow window and must retain privacy, suppression, source-binding, and claim-boundary controls."
    ];
    return;
  }
  if (coverageStatus === "layer_1_plus_partial_layer_3" ||
    coverageStatus === "layer_1_plus_layer_2_and_layer_3") {
    snapshot.snapshot_type = "LAYER_1_PLUS_LAYER_3";
    snapshot.snapshot_readiness_decision = "READY_FOR_CAVEATED_EVIDENCE_SNAPSHOT";
    return;
  }
  if (coverageStatus === "layer_1_plus_partial_layer_2") {
    snapshot.snapshot_type = "LAYER_1_PLUS_LAYER_2";
    snapshot.snapshot_readiness_decision = "READY_FOR_CAVEATED_EVIDENCE_SNAPSHOT";
    return;
  }
  snapshot.snapshot_type = "TELEMETRY_ONLY_CAVEATED";
  snapshot.snapshot_readiness_decision = "READY_FOR_CAVEATED_EVIDENCE_SNAPSHOT";
}

function collectAssemblyCaveats(plan: any, validPackages: any[], snapshot: any): string[] {
  const caveats = [
    ...stringsOf(plan?.readiness?.required_caveats),
    ...snapshot.required_caveats
  ];
  for (const pkg of validPackages) {
    caveats.push(...packageCaveats(pkg));
  }
  if (!findPackageByType(validPackages, "layer_1_bigquery_telemetry_summary")) {
    caveats.push(
      "Layer 1 platform telemetry source package is missing, so higher-layer exports cannot upgrade coverage without telemetry support."
    );
  }
  if (!findPackageByType(validPackages, "layer_2_user_voice_empirical_export")) {
    caveats.push(
      "Layer 2 user voice or empirical evidence is missing and must remain explicit as a caveat."
    );
  }
  if (!findPackageByType(validPackages, "layer_3_business_system_of_record_outcome_export")) {
    caveats.push(
      "Layer 3 business system-of-record outcome evidence is missing and must remain explicit as a caveat."
    );
  }
  if (!assumptionsPresent(validPackages)) {
    caveats.push(
      "Customer-owned assumptions are missing or unapproved, so financial translation remains blocked."
    );
  }
  if (
    validPackages.some((pkg) => pkg?.k_min_posture?.cohort_threshold_met === false)
  ) {
    caveats.push(
      "One or more source packages failed k-min cohort threshold and affected evidence remains suppressed or held."
    );
  }
  return unique(caveats);
}

function collectNextActions(plan: any, snapshot: any): string[] {
  return unique([
    ...stringsOf(plan?.readiness?.next_actions),
    ...stringsOf(snapshot.next_evidence_actions)
  ]);
}

function collectBlockedUses(plan: any, packages: any[], snapshot: any): string[] {
  return unique([
    ...SAFE_BLOCKED_USES,
    ...stringsOf(plan?.blocked_uses),
    ...stringsOf(snapshot.blocked_uses),
    ...packages.flatMap((pkg) => stringsOf(pkg?.blocked_uses))
  ]);
}

function containsForbiddenComputedKeys(
  value: any,
  found: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (!value || typeof value !== "object") return found;
  if (Array.isArray(value)) {
    value.forEach((item) => containsForbiddenComputedKeys(item, found, path));
    return found;
  }
  for (const [key, nested] of Object.entries(value)) {
    const fieldPath = [...path, key];
    const normalizedKey = normalizeKey(key);
    const isFalseBoundaryFlag = fieldPath.includes("feeds") && nested === false;
    const isAllowedPrivacyBoundaryKey =
      fieldPath.length === 3 &&
      normalizeKey(fieldPath[0]) === "draft_evidence_snapshot_input" &&
      normalizeKey(fieldPath[1]) === "privacy_boundary" &&
      ALLOWED_PRIVACY_BOUNDARY_KEYS.has(normalizedKey);
    if (
      !isFalseBoundaryFlag &&
      !isAllowedPrivacyBoundaryKey &&
      DISALLOWED_ASSEMBLY_KEY_PATTERNS.some((pattern) => pattern.test(normalizedKey))
    ) {
      found.add(fieldPath.join("."));
    }
    containsForbiddenComputedKeys(nested, found, fieldPath);
  }
  return found;
}

export function buildEvidenceSnapshotInputFromMeasurementPlanAndSourcePackages(
  measurementPlan: any,
  sourcePackages: any[] = [],
  options: BuildEvidenceCollectionAssemblyOptions = {}
): EvidenceCollectionAssembly {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const planResult = validateMeasurementPlan(measurementPlan);
  const packageResults = sourcePackages.map((pkg) => validateSourcePackage(pkg));
  const mismatchGaps = collectPackagePlanMismatchGaps(measurementPlan, sourcePackages);
  const validPackages = mismatchGaps.length === 0
    ? sourcePackages.filter((_, index) => packageResults[index].valid)
    : [];
  const sourceRefPackages = validPackages.filter(packageCanFeedSourceRef);
  const layer1Package = findPackageByType(validPackages, "layer_1_bigquery_telemetry_summary");
  const workforcePackage = findPackageByType(validPackages, "aggregate_workforce_context_export");
  const snapshot = buildTelemetryEvidenceSnapshotDraft({
    orgId: measurementPlan?.org_id ?? "unknown_org",
    workflowFamily: measurementPlan?.workflow_scope?.workflow_family ?? "unknown_workflow",
    workflowName: measurementPlan?.workflow_scope?.workflow_name ?? null,
    functionArea: measurementPlan?.workflow_scope?.function_area ?? null,
    windowStart: measurementPlan?.windows?.baseline_window_start ?? "",
    windowEnd: measurementPlan?.windows?.baseline_window_end ?? "",
    aggregateTelemetrySummary: buildTelemetrySummary(layer1Package, measurementPlan),
    aggregateWorkforceContext: buildAggregateWorkforceContext(workforcePackage),
    sourceRefs: buildSourceRefs(sourceRefPackages),
    generatedAt,
    evidenceSnapshotId: options.evidenceSnapshotId,
    measurementPlanId: measurementPlan?.measurement_plan_id
  });

  if (!layer1Package) {
    setLayerOneMissing(snapshot);
  } else if (!packageKMinClear(layer1Package)) {
    setLayerOneSuppressed(snapshot, layer1Package);
  }

  for (const pkg of validPackages) {
    if (
      pkg?.source_package_type === "layer_1_bigquery_telemetry_summary" &&
      !packageKMinClear(pkg)
    ) {
      continue;
    }
    applyPackageLayer(snapshot, pkg);
  }

  updateEvidenceLanes(snapshot, validPackages);
  const coverageStatus = determineCoverageStatus(snapshot, validPackages);
  applyCoverageStatus(snapshot, coverageStatus);
  snapshot.blocked_uses = collectBlockedUses(measurementPlan, validPackages, snapshot);
  snapshot.required_caveats = collectAssemblyCaveats(
    measurementPlan,
    validPackages,
    snapshot
  );
  snapshot.next_evidence_actions = collectNextActions(measurementPlan, snapshot);
  snapshot.derivation_version = "ai_value_evidence_collection_assembler_2026_06";

  const fallbackAssemblyId =
    `evidence_collection_assembly_${safeIdPart(String(measurementPlan?.org_id ?? "unknown_org"))}_${safeIdPart(String(measurementPlan?.workflow_scope?.workflow_family ?? "unknown_workflow"))}_${safeIdPart(String(measurementPlan?.windows?.baseline_window_start ?? "unknown_window"))}`;

  return {
    schema_version: EVIDENCE_COLLECTION_ASSEMBLY_SCHEMA_VERSION,
    evidence_collection_assembly_id: options.assemblyId ?? fallbackAssemblyId,
    org_id: measurementPlan?.org_id ?? null,
    measurement_plan_id: measurementPlan?.measurement_plan_id ?? null,
    measurement_plan_validation_result: planResult,
    source_package_ids: sourcePackageIds(sourcePackages),
    source_package_validation_results: packageResults,
    source_package_plan_mismatch_gaps: mismatchGaps,
    draft_evidence_snapshot_input: snapshot,
    feeds: {
      evidence_snapshot_input: planResult.valid &&
        mismatchGaps.length === 0 &&
        allSourcePackagesSafe(packageResults) &&
        validateEvidenceSnapshot(snapshot).valid,
      claim_readiness_snapshot: false,
      executive_readout_snapshot: false,
      customer_facing_economic_output: false
    },
    generated_at: generatedAt,
    derivation_version: "ai_value_evidence_collection_assembler_2026_06"
  };
}

export function validateEvidenceCollectionAssembly(
  assembly: any
): EvidenceCollectionAssemblyValidationResult {
  const gaps: string[] = [];
  if (!assembly || typeof assembly !== "object") {
    gaps.push("assembly is missing");
  }
  if (assembly?.schema_version !== EVIDENCE_COLLECTION_ASSEMBLY_SCHEMA_VERSION) {
    gaps.push("schema_version is invalid");
  }
  for (const field of [
    "evidence_collection_assembly_id",
    "org_id",
    "measurement_plan_id",
    "measurement_plan_validation_result",
    "source_package_ids",
    "source_package_validation_results",
    "source_package_plan_mismatch_gaps",
    "draft_evidence_snapshot_input",
    "feeds",
    "generated_at",
    "derivation_version"
  ]) {
    if (assembly?.[field] === undefined || assembly?.[field] === null) {
      gaps.push(`${field} is missing`);
    }
  }
  if (!Array.isArray(assembly?.source_package_ids)) {
    gaps.push("source_package_ids must be an array");
  }
  if (!Array.isArray(assembly?.source_package_validation_results)) {
    gaps.push("source_package_validation_results must be an array");
  }
  if (assembly?.measurement_plan_validation_result?.valid !== true) {
    gaps.push(
      `measurement plan invalid: ${stringsOf(assembly?.measurement_plan_validation_result?.gaps).join("; ")}`
    );
  }
  if (!Array.isArray(assembly?.source_package_plan_mismatch_gaps)) {
    gaps.push("source_package_plan_mismatch_gaps must be an array");
  }
  for (const result of assembly?.source_package_validation_results ?? []) {
    if (result?.valid !== true) {
      gaps.push(
        `source package ${result?.source_package_id ?? "unknown"} invalid: ${stringsOf(result?.gaps).join("; ")}`
      );
    }
    if (
      result?.feeds?.claim_readiness_context !== false ||
      result?.feeds?.executive_readout_context !== false ||
      result?.feeds?.customer_facing_economic_output !== false ||
      result?.feeds?.full_playbook_coverage !== false
    ) {
      gaps.push(`source package ${result?.source_package_id ?? "unknown"} exposes forbidden downstream feeds`);
    }
  }
  const mismatchGaps = stringsOf(assembly?.source_package_plan_mismatch_gaps);
  if (mismatchGaps.length > 0) {
    gaps.push(...mismatchGaps);
  }
  const snapshotResult = validateEvidenceSnapshot(
    assembly?.draft_evidence_snapshot_input
  );
  if (!snapshotResult.valid) {
    gaps.push(...snapshotResult.gaps.map((gap) => `draft evidence snapshot: ${gap}`));
  }
  if (assembly?.feeds?.claim_readiness_snapshot !== false) {
    gaps.push("feeds.claim_readiness_snapshot must be false");
  }
  if (assembly?.feeds?.executive_readout_snapshot !== false) {
    gaps.push("feeds.executive_readout_snapshot must be false");
  }
  if (assembly?.feeds?.customer_facing_economic_output !== false) {
    gaps.push("feeds.customer_facing_economic_output must be false");
  }
  const forbiddenComputedKeys = Array.from(containsForbiddenComputedKeys(assembly));
  if (forbiddenComputedKeys.length > 0) {
    gaps.push(
      `Forbidden computed field(s) present: ${forbiddenComputedKeys.sort().join(", ")}`
    );
  }
  const valid = gaps.length === 0;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    evidence_collection_assembly_id:
      assembly?.evidence_collection_assembly_id ?? null,
    org_id: assembly?.org_id ?? null,
    valid,
    gaps,
    feeds: {
      evidence_snapshot_input: valid,
      claim_readiness_snapshot: false,
      executive_readout_snapshot: false,
      customer_facing_economic_output: false
    }
  };
}
