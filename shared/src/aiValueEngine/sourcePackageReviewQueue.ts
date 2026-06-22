/**
 * AI Value Engine - Source Package Review Queue.
 *
 * Contract-safe review queue for aggregate source lanes before Data Spine and
 * Measurement Cell handoff. It summarizes source posture only; it does not
 * parse files, run BigQuery, persist data, create routes/UI, emit finance
 * outputs, or feed Measurement Cell assembly.
 */

import { validateDataSpineIntakeReadiness } from "./dataSpineReadiness";
import { validateSourcePackage, type SourcePackage } from "./sourcePackages";

export const AI_VALUE_SOURCE_PACKAGE_REVIEW_QUEUE_SCHEMA_VERSION =
  "FT_AI_VALUE_SOURCE_PACKAGE_REVIEW_QUEUE_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_SOURCE_PACKAGE_REVIEW_QUEUE_VALIDATION_2026_06";

const DERIVATION_VERSION =
  "ai_value_source_package_review_queue_2026_06";

const LANE_KEYS = [
  "blueprint",
  "ai_fluency",
  "vbd_token",
  "customer_metric",
  "assumption",
  "governance"
] as const;

type LaneKey = (typeof LANE_KEYS)[number];

const LANE_LABELS: Record<LaneKey, string> = {
  blueprint: "Blueprint",
  ai_fluency: "AI Fluency",
  vbd_token: "VBD / Token",
  customer_metric: "Customer metric",
  assumption: "ROI assumption context",
  governance: "Governance"
};

const SOURCE_PACKAGE_TYPE_BY_LANE: Partial<Record<LaneKey, string>> = {
  ai_fluency: "layer_2_user_voice_empirical_export",
  vbd_token: "layer_1_bigquery_telemetry_summary",
  customer_metric: "layer_3_business_system_of_record_outcome_export",
  assumption: "assumption_approval_export",
  governance: "governance_control_export"
};

const SOURCE_PACKAGE_REF_KEY_BY_LANE: Partial<Record<LaneKey, string>> = {
  ai_fluency: "aggregate_export_id",
  vbd_token: "aggregate_probe_id",
  customer_metric: "aggregate_outcome_export_id",
  assumption: "assumption_approval_export_id",
  governance: "governance_control_export_id"
};

const DATA_SPINE_ALIGNMENT_KEYS = [
  "org_id",
  "client_id",
  "workflow_family",
  "function_area",
  "cohort_key",
  "baseline_window",
  "comparison_window"
] as const;

const READINESS_CHECKS = [
  "metric_id",
  "source_ref",
  "owner_role",
  "review_state",
  "aggregate_only",
  "source_package_validation"
] as const;

const ALLOWED_QUEUE_STATES = new Set([
  "DATA_SPINE_REVIEW_READY",
  "HELD_FOR_SOURCE_REVIEW",
  "BLOCKED_FOR_DATA_SPINE_VALIDATION"
]);

const ALLOWED_SOURCE_STATES = new Set([
  "missing",
  "present",
  "partial",
  "submitted",
  "pending_approval",
  "held",
  "suppressed",
  "blocked"
]);

const REQUIRED_BLOCKED_USES = [
  "realized_roi",
  "ebita_claim",
  "ebitda_claim",
  "financial_attribution",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "people_decisioning",
  "customer_facing_financial_output",
  "confidence_percentage",
  "probability_output"
];

const REQUIRED_FALSE_BOUNDARY_FLAGS = [
  "creates_migrations",
  "creates_prisma_schema",
  "creates_backend_routes",
  "creates_frontend_ui",
  "creates_ingestion_jobs",
  "persists_source_data",
  "runs_bigquery",
  "parses_uploaded_documents",
  "emits_confidence_percentage",
  "emits_probability",
  "computes_roi",
  "computes_causality",
  "computes_productivity",
  "emits_financial_attribution",
  "customer_facing_financial_output"
];

const FORBIDDEN_FIELD_PATTERNS = [
  /^raw_rows?$/i,
  /^rows$/i,
  /^events$/i,
  /^records$/i,
  /raw_(?:prompt|response|transcript|content|file|export|event|row)/i,
  /prompt/i,
  /^responses?$/i,
  /response_text/i,
  /transcript/i,
  /^query$/i,
  /query_text/i,
  /sql_text/i,
  /bigquery_sql/i,
  /^file_contents?$/i,
  /email/i,
  /user_id/i,
  /employee_id/i,
  /employee_email/i,
  /employee_name/i,
  /respondent_email/i,
  /person_id/i,
  /person_identifier/i,
  /hashed_(?:user|person|employee)_id/i,
  /joinable_(?:user|person|employee)_identifier/i,
  /person_level_productivity/i,
  /person_level_hris/i,
  /manager_ranking/i,
  /team_ranking/i,
  /manager_rank/i,
  /team_rank/i,
  /people_decisioning/i,
  /^confidence$/i,
  /^confidence_percentage$/i,
  /^confidence_percent$/i,
  /^probability$/i,
  /probability_score/i,
  /contribution_probability/i,
  /contribution_likelihood/i,
  /measurement_cell_input/i,
  /finance_context_investigation/i,
  /value_hypothesis_packet_runner/i,
  /^roi$/i,
  /roi_(?:value|amount|calculation|result|impact)/i,
  /realized_roi/i,
  /^computes_roi$/i,
  /^ebita$/i,
  /ebita_(?:value|amount|impact|calculation|result)/i,
  /^ebitda$/i,
  /ebitda_(?:value|amount|impact|calculation|result)/i,
  /dollar(?:ized)?_(?:value|amount|impact|output)/i,
  /financial_impact/i,
  /financial_attribution/i,
  /^financial_output$/i,
  /^customer_facing_economic_output$/i,
  /^customer_facing_financial_output$/i,
  /^probability_output$/i,
  /^confidence_score$/i,
  /^p_value$/i,
  /causality_claim/i,
  /causal_proof/i,
  /productivity_claim/i,
  /productivity_lift/i,
  /manager_score/i,
  /team_score/i,
  /^backend_routes?$/i,
  /^frontend_ui$/i,
  /^persistence_table$/i,
  /^schema_ref$/i
];

const TOP_LEVEL_GOVERNED_KEY_ALLOWLIST = new Set([
  "blocked_uses",
  "boundary_policy"
]);

const TOP_LEVEL_FEED_KEYS = new Set([
  "source_package_status_summary",
  "data_spine_review_context",
  "measurement_cell_input",
  "finance_context_investigation",
  "customer_facing_financial_output"
]);

const PRIVACY_AND_RAW_VALUE_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /(?:^|_)(?:user|employee|person|direct|manager)_(?:id|identifier|email)(?:_|$)/i,
  /(?:^|_)(?:user|employee|person|direct|manager)_[a-z]*\d[a-z0-9]*(?:_|$)/i,
  /(?:^|_)(?:hashed|joinable)_(?:id|identifier|user|person|employee)(?:_|$)/i,
  /(?:^|_)raw_(?:rows?|files?|prompt|response|transcript|content|events?)(?:_|$)/i,
  /(?:^|_)(?:prompt|transcript)(?:_|$)/i,
  /(?:^|_)select(?:_|$)/i,
  /(?:^|_)from_raw(?:_|$)/i,
  /(?:^|_)sql_text(?:_|$)/i,
  /(?:^|_)bigquery_sql(?:_|$)/i,
  /(?:^|_)file_contents?(?:_|$)/i,
  /(?:^|_)response_(?:text|body|content|message|raw|value)(?:_|$)/i,
  /(?:^|_)llm_response(?:_|$)/i
];

const CLAIM_AND_OUTPUT_VALUE_PATTERNS = [
  /^roi$/i,
  /(?:^|_)roi(?:_|$)/i,
  /realized_roi/i,
  /return_on_investment/i,
  /^ebita$/i,
  /(?:^|_)ebita(?:_|$)/i,
  /^ebitda$/i,
  /(?:^|_)ebitda(?:_|$)/i,
  /financial_(?:impact|output|claim|attribution)/i,
  /customer_facing_economic_output/i,
  /customer_facing_financial_output/i,
  /dollar(?:ized)?_(?:value|amount|impact|output)/i,
  /probability_output/i,
  /probability_score/i,
  /confidence_(?:score|percentage|percent)/i,
  /^confidence$/i,
  /(?:^|_)p_value(?:_|$)/i,
  /causality/i,
  /causal/i,
  /productivity_claim/i,
  /manager_(?:score|ranking)/i,
  /manager_rank/i,
  /team_(?:score|ranking)/i,
  /team_rank/i,
  /productivity_lift/i
];

const CAVEAT_VALUE_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /(?:^|_)(?:user|employee|person|direct|manager)_(?:id|identifier|email)(?:_|$)/i,
  /(?:^|_)(?:user|employee|person|direct|manager)_[a-z]*\d[a-z0-9]*(?:_|$)/i,
  /(?:^|_)(?:hashed|joinable)_(?:id|identifier|user|person|employee)(?:_|$)/i
];

const FORBIDDEN_VALUE_PATTERNS = [
  ...PRIVACY_AND_RAW_VALUE_PATTERNS,
  ...CLAIM_AND_OUTPUT_VALUE_PATTERNS
];

export interface BuildSourcePackageReviewQueueInput {
  dataSpineReadiness: any;
  sourcePackages?: SourcePackage[];
  generatedAt?: string;
}

export interface SourcePackageReviewQueueValidationResult {
  schema_version: string;
  source_package_review_queue_id: string | null;
  data_spine_readiness_id: string | null;
  org_id: string | null;
  client_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    source_package_status_summary: boolean;
    data_spine_review_context: boolean;
    measurement_cell_input: false;
    finance_context_investigation: false;
    customer_facing_financial_output: false;
  };
}

function normalizeKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function safeIdPart(value: string): string {
  return normalizeKey(value).replace(/^_+|_+$/g, "");
}

function stringsOf(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function requireField(value: any, path: string, gaps: string[]): void {
  if (value === undefined || value === null || value === "") {
    gaps.push(`${path} is missing`);
  }
}

function sourceReadyForReview(source: any): boolean {
  const state = source?.state ?? source?.source_state;
  return state === "present" &&
    Boolean(source?.source_ref) &&
    Boolean(source?.owner_role) &&
    source?.owner_approval_state === "approved" &&
    source?.review_state === "clear" &&
    source?.aggregate_only === true &&
    source?.aligned === true;
}

function packageBackedLane(laneKey: LaneKey): boolean {
  return Boolean(SOURCE_PACKAGE_TYPE_BY_LANE[laneKey]);
}

function packageReadyForReview(lane: any): boolean {
  if (!Array.isArray(lane?.source_package_ids) || lane.source_package_ids.length === 0) {
    return !packageBackedLane(lane?.lane_key);
  }
  if (!sourcePackageEvidenceSupportsLane(lane?.lane_key, lane)) {
    return false;
  }
  return lane.source_package_valid === true &&
    lane.source_package_alignment_clear === true &&
    lane.source_package_can_feed_evidence === true;
}

function laneReadyForDataSpineReview(lane: any): boolean {
  return sourceReadyForReview(lane) &&
    packageReadyForReview(lane) &&
    stringsOf(lane?.gaps).length === 0;
}

function sourceGapKey(laneKey: LaneKey): string {
  switch (laneKey) {
    case "blueprint": return "BLUEPRINT_APPROVAL_REQUIRED";
    case "ai_fluency": return "AI_FLUENCY_AGGREGATE_REQUIRED";
    case "vbd_token": return "VBD_TOKEN_AGGREGATE_REQUIRED";
    case "customer_metric": return "CUSTOMER_METRIC_REQUIRED";
    case "assumption": return "ASSUMPTION_APPROVAL_REQUIRED";
    case "governance": return "GOVERNANCE_ATTESTATION_REQUIRED";
  }
}

function packageGapKey(laneKey: LaneKey, suffix: string): string {
  return `${laneKey.toUpperCase()}_${suffix}`;
}

function laneChecklistGaps(laneKey: LaneKey, source: any): string[] {
  const gaps: string[] = [];
  if (!source?.owner_role) {
    gaps.push(packageGapKey(laneKey, "OWNER_ROLE_REQUIRED"));
  }
  if (laneKey === "customer_metric" && !source?.metric_id) {
    gaps.push(packageGapKey(laneKey, "METRIC_ID_REQUIRED"));
  }
  return gaps;
}

function expectedLaneGaps(laneKey: LaneKey, lane: any): string[] {
  const gaps: string[] = [];
  if (!sourceReadyForReview(lane)) gaps.push(sourceGapKey(laneKey));
  gaps.push(...laneChecklistGaps(laneKey, lane));
  if (lane?.source_package_valid === false) {
    gaps.push(packageGapKey(laneKey, "SOURCE_PACKAGE_INVALID"));
  }
  if (
    packageBackedLane(laneKey) &&
    (!Array.isArray(lane?.source_package_ids) || lane.source_package_ids.length === 0)
  ) {
    gaps.push(packageGapKey(laneKey, "SOURCE_PACKAGE_REQUIRED"));
  }
  if (
    packageBackedLane(laneKey) &&
    Array.isArray(lane?.source_package_ids) &&
    lane.source_package_ids.length > 0 &&
    !sourcePackageEvidencePresentAndTyped(laneKey, lane)
  ) {
    gaps.push(packageGapKey(laneKey, "SOURCE_PACKAGE_EVIDENCE_REQUIRED"));
  }
  if (
    packageBackedLane(laneKey) &&
    Array.isArray(lane?.source_package_ids) &&
    lane.source_package_ids.length > 0 &&
    sourceReadyForReview(lane) &&
    lane?.source_package_alignment_clear === true &&
    !sourcePackageEvidenceBoundToLane(laneKey, lane)
  ) {
    gaps.push(packageGapKey(laneKey, "SOURCE_PACKAGE_EVIDENCE_SOURCE_REF_MISMATCH"));
  }
  if (lane?.source_package_alignment_clear === false) {
    gaps.push(packageGapKey(laneKey, "SOURCE_PACKAGE_MISALIGNED"));
  }
  if (
    lane?.source_package_can_feed_evidence === false &&
    lane?.source_package_valid === true &&
    lane?.source_package_alignment_clear !== false
  ) {
    gaps.push(packageGapKey(laneKey, "SOURCE_PACKAGE_NOT_FEEDABLE"));
  }
  return [...new Set(gaps)];
}

function sourcePackagesForLane(laneKey: LaneKey, sourcePackages: SourcePackage[]): SourcePackage[] {
  const packageType = SOURCE_PACKAGE_TYPE_BY_LANE[laneKey];
  if (!packageType) return [];
  return sourcePackages.filter((pkg) => pkg?.source_package_type === packageType);
}

function packageEvidenceRecords(
  laneKey: LaneKey,
  packages: SourcePackage[],
  validationResults: ReturnType<typeof validateSourcePackage>[],
  alignmentResults: boolean[]
): any[] {
  const refKey = SOURCE_PACKAGE_REF_KEY_BY_LANE[laneKey];
  return packages.map((pkg, index) => {
    const validation = validationResults[index];
    const alignmentClear = alignmentResults[index] === true;
    return {
      source_package_id: pkg.source_package_id,
      source_package_type: pkg.source_package_type,
      evidence_state: pkg.evidence_state,
      source_ref: refKey ? pkg.source_refs?.[refKey] ?? null : null,
      validation_schema_version: validation.schema_version,
      validation_valid: validation.valid === true,
      alignment_clear: alignmentClear,
      can_feed_evidence:
        validation.valid === true &&
        validation.feeds.evidence_snapshot_source_ref === true &&
        alignmentClear
    };
  });
}

function sourcePackageEvidenceOf(lane: any): any[] {
  return Array.isArray(lane?.source_package_evidence)
    ? lane.source_package_evidence
    : [];
}

function laneSourceRef(lane: any): string | null {
  return typeof lane?.source_ref === "string" && lane.source_ref.length > 0
    ? lane.source_ref
    : null;
}

function sourcePackageEvidencePresentAndTyped(laneKey: LaneKey, lane: any): boolean {
  const packageIds = stringsOf(lane?.source_package_ids);
  if (packageIds.length === 0) return !packageBackedLane(laneKey);
  const evidence = sourcePackageEvidenceOf(lane);
  if (evidence.length !== packageIds.length) return false;
  const evidenceIds = evidence.map((item) => String(item?.source_package_id ?? ""));
  if (JSON.stringify([...evidenceIds].sort()) !== JSON.stringify([...packageIds].sort())) {
    return false;
  }
  return evidence.every((item) =>
    item?.source_package_type === SOURCE_PACKAGE_TYPE_BY_LANE[laneKey] &&
    typeof item?.validation_schema_version === "string"
  );
}

function sourcePackageEvidenceBoundToLane(laneKey: LaneKey, lane: any): boolean {
  if (!sourcePackageEvidencePresentAndTyped(laneKey, lane)) return false;
  const expectedSourceRef = laneSourceRef(lane);
  if (!expectedSourceRef) return false;
  return sourcePackageEvidenceOf(lane).every((item) => item?.source_ref === expectedSourceRef);
}

function sourcePackageEvidenceConsistent(laneKey: LaneKey, lane: any): boolean {
  if (!sourcePackageEvidencePresentAndTyped(laneKey, lane)) return false;
  if (!sourcePackageEvidenceBoundToLane(laneKey, lane)) return false;
  return sourcePackageEvidenceOf(lane).every((item) =>
    item.validation_valid === true &&
    item.alignment_clear === true &&
    item.can_feed_evidence === true
  );
}

function sourcePackageEvidenceSupportsLane(laneKey: LaneKey, lane: any): boolean {
  return LANE_KEYS.includes(laneKey) && sourcePackageEvidenceConsistent(laneKey, lane);
}

function packageEvidenceDerivedPosture(laneKey: LaneKey, lane: any): {
  valid: boolean | null;
  alignmentClear: boolean | null;
  canFeedEvidence: boolean | null;
} {
  const packageIds = stringsOf(lane?.source_package_ids);
  if (packageIds.length === 0) {
    return {
      valid: null,
      alignmentClear: null,
      canFeedEvidence: null
    };
  }
  const evidence = sourcePackageEvidenceOf(lane);
  const presentAndTyped = sourcePackageEvidencePresentAndTyped(laneKey, lane);
  const boundEvidence = sourcePackageEvidenceBoundToLane(laneKey, lane);
  const bindingSatisfied = !sourceReadyForReview(lane) || boundEvidence;
  return {
    valid:
      presentAndTyped &&
      evidence.every((item) => item?.validation_valid === true),
    alignmentClear:
      presentAndTyped &&
      bindingSatisfied &&
      evidence.every((item) => item?.alignment_clear === true),
    canFeedEvidence:
      presentAndTyped &&
      bindingSatisfied &&
      evidence.every((item) =>
        item?.validation_valid === true &&
        item?.alignment_clear === true &&
        item?.can_feed_evidence === true
      )
  };
}

function sameWindow(left: any, right: any): boolean {
  return Boolean(left?.window_start) &&
    Boolean(left?.window_end) &&
    left.window_start === right?.window_start &&
    left.window_end === right?.window_end;
}

function sourcePackageAlignedToSource(laneKey: LaneKey, pkg: SourcePackage, source: any): boolean {
  const packageContext = pkg as any;
  const refKey = SOURCE_PACKAGE_REF_KEY_BY_LANE[laneKey];
  const sourceRefMatches = !refKey ||
    !source?.source_ref ||
    pkg?.source_refs?.[refKey] === source.source_ref;
  const sourceOwnerRoleMatches = !source?.owner_role ||
    (
      packageContext?.source_owner_role === source.owner_role &&
      packageContext?.source_owner_attestation?.attested_by_role === source.owner_role
    );
  const optionalPackageContextMatches = [
    ["client_id", "client_id"],
    ["workflow_family", "workflow_family"],
    ["function_area", "function_area"],
    ["cohort_key", "cohort_key"],
    ["metric_id", "metric_id"]
  ].every(([pkgKey, sourceKey]) =>
    packageContext?.[pkgKey] === undefined ||
    packageContext?.[pkgKey] === null ||
    packageContext?.[pkgKey] === source?.[sourceKey]
  );
  const optionalBaselineWindowMatches =
    packageContext?.baseline_window === undefined ||
    packageContext?.baseline_window === null ||
    sameWindow(packageContext.baseline_window, source?.baseline_window);
  return pkg?.org_id === source?.org_id &&
    sameWindow(pkg?.covered_window, source?.comparison_window) &&
    sourceRefMatches &&
    sourceOwnerRoleMatches &&
    optionalPackageContextMatches &&
    optionalBaselineWindowMatches;
}

function buildLane(
  laneKey: LaneKey,
  source: any,
  sourcePackages: SourcePackage[]
): any {
  const packages = sourcePackagesForLane(laneKey, sourcePackages);
  const packageValidationResults = packages.map((pkg) => validateSourcePackage(pkg));
  const packageAlignmentResults = packages.map((pkg) =>
    sourcePackageAlignedToSource(laneKey, pkg, source)
  );
  const invalidPackage = packageValidationResults.find((result) => !result.valid);
  const misalignedPackage = packageAlignmentResults.includes(false);
  const nonFeedablePackage = packageValidationResults.find(
    (result) => result.valid && !result.feeds.evidence_snapshot_source_ref
  );
  const packageIds = packages.map((pkg) => pkg.source_package_id);
  const packageStates = packages.map((pkg) => String(pkg.evidence_state));
  const sourcePackageEvidence = packageEvidenceRecords(
    laneKey,
    packages,
    packageValidationResults,
    packageAlignmentResults
  );
  const sourceReady = sourceReadyForReview(source);
  const gaps: string[] = [];

  if (!sourceReady) gaps.push(sourceGapKey(laneKey));
  gaps.push(...laneChecklistGaps(laneKey, source));
  if (packageBackedLane(laneKey) && packageIds.length === 0) {
    gaps.push(packageGapKey(laneKey, "SOURCE_PACKAGE_REQUIRED"));
  }
  if (invalidPackage) gaps.push(packageGapKey(laneKey, "SOURCE_PACKAGE_INVALID"));
  if (misalignedPackage) gaps.push(packageGapKey(laneKey, "SOURCE_PACKAGE_MISALIGNED"));
  if (nonFeedablePackage) gaps.push(packageGapKey(laneKey, "SOURCE_PACKAGE_NOT_FEEDABLE"));

  const sourcePackageValid = packageValidationResults.length === 0
    ? null
    : packageValidationResults.every((result) => result.valid);
  const sourcePackageAlignmentClear = packageAlignmentResults.length === 0
    ? null
    : packageAlignmentResults.every((aligned) => aligned === true);
  const sourcePackageCanFeedEvidence = packageValidationResults.length === 0
    ? null
    : packageValidationResults.every((result, index) =>
      result.feeds.evidence_snapshot_source_ref && packageAlignmentResults[index] === true
    );

  const lane = {
    lane_key: laneKey,
    label: LANE_LABELS[laneKey],
    source_state: source?.state ?? "missing",
    intake_mode: source?.intake_mode ?? "missing",
    source_ref: source?.source_ref ?? null,
    owner_role: source?.owner_role ?? null,
    owner_approval_state: source?.owner_approval_state ?? "missing",
    review_state: source?.review_state ?? "needs_review",
    aggregate_only: source?.aggregate_only === true,
    aligned: source?.aligned === true,
    metric_id: source?.metric_id ?? null,
    source_package_ids: packageIds,
    source_package_evidence_state: packageStates.length === 0
      ? null
      : packageStates.length === 1
        ? packageStates[0]
        : "mixed",
    source_package_valid: sourcePackageValid,
    source_package_alignment_clear: sourcePackageAlignmentClear,
    source_package_can_feed_evidence: sourcePackageCanFeedEvidence,
    source_package_evidence: sourcePackageEvidence,
    data_spine_review_clear: false,
    gaps,
    next_action: gaps.length === 0
      ? "Keep lane source-bound for Data Spine review."
      : "Resolve held, missing, suppressed, unapproved, invalid, or misaligned aggregate source posture before downstream handoff."
  };

  lane.data_spine_review_clear = laneReadyForDataSpineReview(lane);
  return lane;
}

function baseFeeds(valid: boolean): SourcePackageReviewQueueValidationResult["feeds"] {
  return {
    source_package_status_summary: valid,
    data_spine_review_context: valid,
    measurement_cell_input: false,
    finance_context_investigation: false,
    customer_facing_financial_output: false
  };
}

function dataSpineReviewContext(dataSpineReadiness: any, validation: any): any {
  return {
    schema_version: validation?.schema_version ?? null,
    data_spine_readiness_id: validation?.data_spine_readiness_id ?? null,
    org_id: validation?.org_id ?? null,
    client_id: validation?.client_id ?? null,
    readiness_state: dataSpineReadiness?.readiness_state ?? null,
    valid: validation?.valid === true,
    gaps: stringsOf(validation?.gaps).map((_, index) =>
      `DATA_SPINE_VALIDATION_GAP_${index + 1}`
    )
  };
}

export function buildSourcePackageReviewQueue(
  input: BuildSourcePackageReviewQueueInput
): any {
  const dataSpineValidation = validateDataSpineIntakeReadiness(input.dataSpineReadiness);
  const sourcePackages = input.sourcePackages ?? [];
  const lanes = LANE_KEYS.map((laneKey) =>
    buildLane(
      laneKey,
      input.dataSpineReadiness?.source_readiness?.[laneKey],
      sourcePackages
    )
  );
  const allLanesClear = lanes.every((lane) => lane.data_spine_review_clear === true);
  const queueState = !dataSpineValidation.valid
    ? "BLOCKED_FOR_DATA_SPINE_VALIDATION"
    : allLanesClear
      ? "DATA_SPINE_REVIEW_READY"
      : "HELD_FOR_SOURCE_REVIEW";

  return {
    schema_version: AI_VALUE_SOURCE_PACKAGE_REVIEW_QUEUE_SCHEMA_VERSION,
    source_package_review_queue_id:
      `source_package_review_queue_${safeIdPart(String(input.dataSpineReadiness?.data_spine_readiness_id ?? "unknown"))}`,
    data_spine_readiness_id: input.dataSpineReadiness?.data_spine_readiness_id ?? null,
    org_id: input.dataSpineReadiness?.org_id ?? null,
    client_id: input.dataSpineReadiness?.client_id ?? null,
    workflow_family: input.dataSpineReadiness?.workflow_family ?? null,
    function_area: input.dataSpineReadiness?.function_area ?? null,
    cohort_key: input.dataSpineReadiness?.cohort_key ?? null,
    baseline_window: input.dataSpineReadiness?.baseline_window ?? null,
    comparison_window: input.dataSpineReadiness?.comparison_window ?? null,
    queue_state: queueState,
    data_spine_validation_result: dataSpineReviewContext(
      input.dataSpineReadiness,
      dataSpineValidation
    ),
    alignment_keys: [...DATA_SPINE_ALIGNMENT_KEYS],
    readiness_checks: [...READINESS_CHECKS],
    lanes,
    missing_evidence: [
      ...new Set(lanes.flatMap((lane) => stringsOf(lane.gaps)))
    ],
    next_actions: allLanesClear
      ? ["Pass the aligned source posture to the Data Spine gate; Measurement Cell readiness remains owned by the Data Spine and Measurement Cell validators."]
      : ["Resolve held or blocked source lanes before Data Spine or Measurement Cell handoff."],
    feeds: baseFeeds(true),
    blocked_uses: [...REQUIRED_BLOCKED_USES],
    boundary_policy: Object.fromEntries(
      REQUIRED_FALSE_BOUNDARY_FLAGS.map((flag) => [flag, false])
    ),
    required_caveats: [
      "Source Package Review Queue summarizes aggregate source posture only; it is not ROI proof, causality, productivity measurement, financial attribution, a confidence percentage, or customer-facing financial output.",
      "This review queue cannot feed Measurement Cell assembly or finance-context investigation directly.",
      "Source Packages remain evidence-input metadata and cannot override Data Spine, Measurement Cell, governance, or suppression gates."
    ],
    generated_at: input.generatedAt ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
}

function collectTopLevelGaps(queue: any): string[] {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "source_package_review_queue_id",
    "data_spine_readiness_id",
    "org_id",
    "client_id",
    "workflow_family",
    "function_area",
    "cohort_key",
    "baseline_window",
    "comparison_window",
    "queue_state",
    "data_spine_validation_result",
    "alignment_keys",
    "readiness_checks",
    "lanes",
    "missing_evidence",
    "next_actions",
    "feeds",
    "blocked_uses",
    "boundary_policy",
    "required_caveats",
    "generated_at",
    "derivation_version"
  ]) {
    requireField(queue?.[field], field, gaps);
  }
  if (
    queue?.schema_version &&
    queue.schema_version !== AI_VALUE_SOURCE_PACKAGE_REVIEW_QUEUE_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${queue.schema_version}`);
  }
  if (queue?.queue_state && !ALLOWED_QUEUE_STATES.has(String(queue.queue_state))) {
    gaps.push(`queue_state is invalid: ${queue.queue_state}`);
  }
  return gaps;
}

function sameStringSet(left: any, right: readonly string[]): boolean {
  const normalize = (value: any) =>
    Array.isArray(value) ? [...new Set(value.map((item) => String(item)))].sort() : [];
  return JSON.stringify(normalize(left)) === JSON.stringify([...right].sort());
}

function collectLaneGaps(queue: any): string[] {
  const gaps: string[] = [];
  const lanes: any[] = Array.isArray(queue?.lanes) ? queue.lanes : [];
  const seen = new Set<string>();

  for (const laneKey of LANE_KEYS) {
    if (!lanes.some((lane) => lane?.lane_key === laneKey)) {
      gaps.push(`lanes missing ${laneKey}`);
    }
  }

  for (const [index, lane] of lanes.entries()) {
    const path = `lanes[${index}]`;
    for (const field of [
      "lane_key",
      "label",
      "source_state",
      "intake_mode",
      "owner_approval_state",
      "review_state",
      "aggregate_only",
      "aligned",
      "source_package_ids",
      "source_package_evidence",
      "data_spine_review_clear",
      "gaps",
      "next_action"
    ]) {
      requireField(lane?.[field], `${path}.${field}`, gaps);
    }
    if (!LANE_KEYS.includes(lane?.lane_key)) {
      gaps.push(`${path}.lane_key is invalid: ${lane?.lane_key}`);
    }
    if (seen.has(String(lane?.lane_key))) {
      gaps.push(`duplicate lane_key ${lane?.lane_key}`);
    }
    seen.add(String(lane?.lane_key));
    if (!ALLOWED_SOURCE_STATES.has(String(lane?.source_state))) {
      gaps.push(`${path}.source_state is invalid: ${lane?.source_state}`);
    }
    if (lane?.data_spine_review_clear !== laneReadyForDataSpineReview(lane)) {
      gaps.push(`${path}.data_spine_review_clear must reflect source and source package posture`);
    }
    if (LANE_KEYS.includes(lane?.lane_key)) {
      for (const expectedGap of expectedLaneGaps(lane.lane_key, lane)) {
        if (!stringsOf(lane?.gaps).includes(expectedGap)) {
          gaps.push(`${path}.gaps missing ${expectedGap}`);
        }
      }
      const derivedPosture = packageEvidenceDerivedPosture(lane.lane_key, lane);
      if (lane?.source_package_valid !== derivedPosture.valid) {
        gaps.push(`${path}.source_package_valid must match compact source package evidence`);
      }
      if (lane?.source_package_alignment_clear !== derivedPosture.alignmentClear) {
        gaps.push(`${path}.source_package_alignment_clear must match compact source package evidence`);
      }
      if (lane?.source_package_can_feed_evidence !== derivedPosture.canFeedEvidence) {
        gaps.push(`${path}.source_package_can_feed_evidence must match compact source package evidence`);
      }
    }
  }
  return gaps;
}

function collectStateGaps(queue: any): string[] {
  const gaps: string[] = [];
  const lanes: any[] = Array.isArray(queue?.lanes) ? queue.lanes : [];
  const allLanesClear = lanes.length === LANE_KEYS.length &&
    lanes.every((lane) => laneReadyForDataSpineReview(lane));
  const dataSpineValid = queue?.data_spine_validation_result?.valid === true;
  const derivedState = !dataSpineValid
    ? "BLOCKED_FOR_DATA_SPINE_VALIDATION"
    : allLanesClear
      ? "DATA_SPINE_REVIEW_READY"
      : "HELD_FOR_SOURCE_REVIEW";
  const derivedMissing = [
    ...new Set(lanes.flatMap((lane) => stringsOf(lane?.gaps)))
  ].sort();

  if (!sameStringSet(queue?.alignment_keys, DATA_SPINE_ALIGNMENT_KEYS)) {
    gaps.push("alignment_keys must match Data Spine alignment keys");
  }
  if (!sameStringSet(queue?.readiness_checks, READINESS_CHECKS)) {
    gaps.push("readiness_checks must match source review readiness checks");
  }
  if (queue?.queue_state !== derivedState) {
    gaps.push("queue_state must match data spine validation and lane posture");
  }
  if (JSON.stringify(stringsOf(queue?.missing_evidence).sort()) !== JSON.stringify(derivedMissing)) {
    gaps.push("missing_evidence must match lane gaps");
  }
  return gaps;
}

function collectBoundaryGaps(queue: any): string[] {
  const gaps: string[] = [];
  for (const use of REQUIRED_BLOCKED_USES) {
    if (!stringsOf(queue?.blocked_uses).includes(use)) {
      gaps.push(`blocked_uses missing ${use}`);
    }
  }
  for (const flag of REQUIRED_FALSE_BOUNDARY_FLAGS) {
    if (queue?.boundary_policy?.[flag] !== false) {
      gaps.push(`boundary_policy.${flag} must be false`);
    }
  }
  if (queue?.feeds?.measurement_cell_input !== false) {
    gaps.push("feeds.measurement_cell_input must be false");
  }
  if (queue?.feeds?.finance_context_investigation !== false) {
    gaps.push("feeds.finance_context_investigation must be false");
  }
  if (queue?.feeds?.customer_facing_financial_output !== false) {
    gaps.push("feeds.customer_facing_financial_output must be false");
  }
  if (queue?.data_spine_validation_result?.feeds !== undefined) {
    gaps.push("data_spine_validation_result.feeds must not be exposed");
  }
  for (const field of [...collectForbiddenFields(queue)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  for (const value of [...collectForbiddenValues(queue)].sort()) {
    gaps.push(`Forbidden value detected: ${value}`);
  }
  return gaps;
}

function isAllowedGovernedKey(key: string, path: string[], value: any): boolean {
  const normalizedKey = normalizeKey(key);
  const normalizedPath = path.map(normalizeKey);
  if (normalizedPath.length === 1 && TOP_LEVEL_GOVERNED_KEY_ALLOWLIST.has(normalizedKey)) {
    return true;
  }
  if (
    normalizedPath.length === 2 &&
    normalizedPath[0] === "boundary_policy" &&
    REQUIRED_FALSE_BOUNDARY_FLAGS.includes(normalizedKey) &&
    value === false
  ) {
    return true;
  }
  if (
    normalizedPath.length === 2 &&
    normalizedPath[0] === "feeds" &&
    TOP_LEVEL_FEED_KEYS.has(normalizedKey)
  ) {
    return true;
  }
  return false;
}

function collectForbiddenFields(
  value: any,
  fields: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectForbiddenFields(item, fields, [...path, String(index)]));
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    const normalized = normalizeKey(key);
    const currentPath = [...path, key];
    const forbiddenBoundaryFlag = REQUIRED_FALSE_BOUNDARY_FLAGS.includes(normalized);
    if (
      !isAllowedGovernedKey(key, currentPath, nested) &&
      (
        forbiddenBoundaryFlag ||
        FORBIDDEN_FIELD_PATTERNS.some((pattern) => pattern.test(key) || pattern.test(normalized))
      )
    ) {
      fields.add(currentPath.join("."));
    }
    collectForbiddenFields(nested, fields, currentPath);
  }
  return fields;
}

function isValueCheckExemptPath(path: string[]): boolean {
  const normalizedPath = path.map(normalizeKey);
  return normalizedPath[0] === "blocked_uses" ||
    (normalizedPath[0] === "lanes" && normalizedPath[2] === "label") ||
    normalizedPath[0] === "boundary_policy";
}

function valuePatternsForPath(path: string[]): RegExp[] {
  const normalizedPath = path.map(normalizeKey);
  if (normalizedPath[0] === "required_caveats") {
    return CAVEAT_VALUE_PATTERNS;
  }
  return FORBIDDEN_VALUE_PATTERNS;
}

function collectForbiddenValues(
  value: any,
  values: Set<string> = new Set(),
  path: string[] = []
): Set<string> {
  if (typeof value === "string") {
    if (!isValueCheckExemptPath(path)) {
      const normalizedValue = normalizeKey(value);
      if (
        valuePatternsForPath(path).some((pattern) => pattern.test(value) || pattern.test(normalizedValue))
      ) {
        values.add(path.join(".") || "<root>");
      }
    }
    return values;
  }
  if (!value || typeof value !== "object") return values;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectForbiddenValues(item, values, [...path, String(index)]));
    return values;
  }
  for (const [key, nested] of Object.entries(value)) {
    collectForbiddenValues(nested, values, [...path, key]);
  }
  return values;
}

export function validateSourcePackageReviewQueue(
  queue: any
): SourcePackageReviewQueueValidationResult {
  const gaps = [
    ...collectTopLevelGaps(queue),
    ...collectLaneGaps(queue),
    ...collectStateGaps(queue),
    ...collectBoundaryGaps(queue)
  ];
  const valid = gaps.length === 0;

  return {
    schema_version: RESULT_SCHEMA_VERSION,
    source_package_review_queue_id: queue?.source_package_review_queue_id ?? null,
    data_spine_readiness_id: queue?.data_spine_readiness_id ?? null,
    org_id: queue?.org_id ?? null,
    client_id: queue?.client_id ?? null,
    valid,
    gaps,
    feeds: baseFeeds(valid)
  };
}
