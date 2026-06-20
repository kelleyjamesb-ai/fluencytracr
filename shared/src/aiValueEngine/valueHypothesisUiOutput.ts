/**
 * AI Value Engine - Value Hypothesis UI Output Contract.
 *
 * Internal-only display contract for the thin review queue. It shapes what a
 * UI may render from deterministic readiness artifacts without creating a UI,
 * persistence, routes, financial output, ROI proof, causality, productivity
 * claims, confidence percentages, or probability output.
 */

export const AI_VALUE_UI_OUTPUT_SCHEMA_VERSION =
  "FT_AI_VALUE_UI_OUTPUT_2026_06";

const RESULT_SCHEMA_VERSION =
  "FT_AI_VALUE_UI_OUTPUT_VALIDATION_2026_06";

const DERIVATION_VERSION = "ai_value_ui_output_contract_2026_06";

const REQUIRED_FALSE_BOUNDARY_FIELDS = [
  "creates_frontend_ui",
  "creates_backend_routes",
  "creates_migrations",
  "creates_prisma_schema",
  "persists_output",
  "customer_facing_output",
  "customer_facing_financial_output",
  "financial_output",
  "roi_proof",
  "causality_claim",
  "productivity_claim",
  "confidence_percentage",
  "probability_output",
  "person_level_output",
  "manager_or_team_ranking"
];

const REQUIRED_BLOCKED_CLAIMS = [
  "roi_proof",
  "financial_attribution",
  "causality_claim",
  "productivity_claim",
  "confidence_percentage",
  "customer_facing_financial_output"
];

const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "ui_output_id",
  "display_mode",
  "org_id",
  "measurement_plan_id",
  "packet_id",
  "current_readiness_state",
  "current_review_label",
  "contribution_evidence_tier",
  "source_lanes",
  "held_lanes",
  "evidence_gaps",
  "required_caveats",
  "blocked_claims",
  "allowed_next_actions",
  "primary_next_action",
  "cards",
  "ui_sections",
  "boundary_policy",
  "generated_at",
  "derivation_version"
]);

const FORBIDDEN_FIELD_PATTERNS = [
  /^roi$/i,
  /roi_value/i,
  /realized_roi/i,
  /^ebita$/i,
  /^ebitda$/i,
  /ebitda_impact/i,
  /financial_attribution/i,
  /confidence_percentage/i,
  /confidence_percent/i,
  /^probability$/i,
  /contribution_probability/i,
  /productivity_lift/i,
  /customer_ready_financial_output/i,
  /^raw_rows?$/i,
  /user_id/i,
  /employee_id/i,
  /person_id/i,
  /manager_ranking/i,
  /team_ranking/i,
  /^creates_(?:backend_routes?|frontend_ui|migrations|prisma_schema)$/i,
  /^backend_routes?$/i,
  /^frontend_ui$/i,
  /^persistence_table$/i,
  /^schema_ref$/i
];

const FORBIDDEN_TEXT_PATTERNS = [
  /\bAI ROI proof\b/i,
  /\bROI proof\b/i,
  /\bproved\b/i,
  /\bcaused\b/i,
  /\battributed\b/i,
  /\bEBITDA impact\b/i,
  /\bfinancial attribution\b/i,
  /\bproductivity lift\b/i,
  /\bconfidence\s*(?:%|percentage)\b/i,
  /\bprobability\b/i,
  /\bcustomer-ready financial\b/i
];

const GOVERNED_KEY_ALLOWLIST = new Set([
  "blocked_claims",
  "boundary_policy",
  "required_caveats"
]);

const FALSE_BOUNDARY_CONTAINERS = new Set([
  "boundary_policy"
]);

const FORBIDDEN_TEXT_CONTEXT_ALLOWLIST = new Set([
  "blocked_claims",
  "boundary_policy",
  "required_caveats"
]);

export interface BuildValueHypothesisUiOutputInput {
  packet?: any | null;
  dataSpineReadiness?: any | null;
  generatedAt?: string;
}

export interface ValueHypothesisUiOutputValidationResult {
  schema_version: string;
  ui_output_id: string | null;
  org_id: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    internal_review_queue: boolean;
    customer_facing_output: false;
    financial_output: false;
    confidence_or_probability_output: false;
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

function sourceLanesFromDataSpine(dataSpine: any): any[] {
  return Object.entries(dataSpine?.source_readiness ?? {}).map(([laneId, source]: [string, any]) => ({
    lane_id: laneId,
    state: source?.review_state === "held" ? "held" : source?.state ?? "missing",
    review_state: source?.review_state ?? "needs_review",
    owner_approval_state: source?.owner_approval_state ?? "missing",
    source_ref: source?.source_ref ?? null
  }));
}

function sourceLanesFromPacket(packet: any): any[] {
  return Object.entries(packet?.evidence_sources ?? {}).map(([laneId, source]: [string, any]) => ({
    lane_id: laneId,
    state: source?.state ?? "missing",
    review_state: source?.state === "held" ? "held" : "clear",
    owner_approval_state: source?.owner_approval_state ?? null,
    source_ref: source?.source_ref ?? null
  }));
}

function isHeldLane(lane: any): boolean {
  return lane.state !== "present" ||
    lane.review_state === "held" ||
    lane.review_state === "needs_review" ||
    lane.owner_approval_state === "submitted" ||
    lane.owner_approval_state === "missing" ||
    lane.owner_approval_state === "held";
}

function collectForbidden(
  value: any,
  gaps: string[] = [],
  path: string[] = []
): string[] {
  if (value === null || value === undefined) return gaps;
  if (typeof value === "string") {
    if (path.some((part) => FORBIDDEN_TEXT_CONTEXT_ALLOWLIST.has(normalizeKey(part)))) {
      return gaps;
    }
    for (const pattern of FORBIDDEN_TEXT_PATTERNS) {
      if (pattern.test(value)) {
        gaps.push(`Forbidden UI output text detected at ${path.join(".")}: ${value}`);
        break;
      }
    }
    return gaps;
  }
  if (typeof value !== "object") return gaps;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectForbidden(item, gaps, [...path, String(index)]));
    return gaps;
  }
  for (const [key, nested] of Object.entries(value)) {
    const normalized = normalizeKey(key);
    const currentPath = [...path, key];
    const inFalseBoundaryContainer = currentPath.some((part) =>
      FALSE_BOUNDARY_CONTAINERS.has(normalizeKey(part))
    );
    const isFalseBoundaryFlag = nested === false && inFalseBoundaryContainer;
    if (
      !isFalseBoundaryFlag &&
      !GOVERNED_KEY_ALLOWLIST.has(normalized) &&
      FORBIDDEN_FIELD_PATTERNS.some((pattern) => pattern.test(key) || pattern.test(normalized))
    ) {
      gaps.push(`Forbidden UI output field detected: ${currentPath.join(".")}`);
    }
    collectForbidden(nested, gaps, currentPath);
  }
  return gaps;
}

function falseBoundaryPolicy(): Record<string, false> {
  return Object.fromEntries(
    REQUIRED_FALSE_BOUNDARY_FIELDS.map((field) => [field, false])
  ) as Record<string, false>;
}

function validationFeeds(valid: boolean): ValueHypothesisUiOutputValidationResult["feeds"] {
  return {
    internal_review_queue: valid,
    customer_facing_output: false,
    financial_output: false,
    confidence_or_probability_output: false
  };
}

export function buildValueHypothesisUiOutput(
  input: BuildValueHypothesisUiOutputInput
): any {
  const packet = input.packet ?? null;
  const dataSpine = input.dataSpineReadiness ?? null;
  const sourceLanes = sourceLanesFromDataSpine(dataSpine);
  const fallbackSourceLanes = sourceLanes.length > 0
    ? sourceLanes
    : sourceLanesFromPacket(packet);
  const heldLanes = fallbackSourceLanes
    .filter(isHeldLane)
    .map((lane) => lane.lane_id);
  const evidenceGaps = [
    ...stringsOf(dataSpine?.missing_evidence),
    ...stringsOf(packet?.missing_evidence)
  ].filter((item, index, array) => array.indexOf(item) === index);
  const blockedClaims = [
    ...REQUIRED_BLOCKED_CLAIMS,
    ...stringsOf(packet?.blocked_claims)
  ].filter((item, index, array) => array.indexOf(item) === index);
  const currentReadinessState = packet?.readiness?.readiness_state ??
    dataSpine?.readiness_state ??
    "NOT_READY";
  const currentReviewLabel = packet?.review_flow?.current_review_label ??
    "Glean review";
  const allowedNextActions = packet?.allowed_next_actions ??
    dataSpine?.next_actions ??
    ["collect_missing_aggregate_evidence"];

  return {
    schema_version: AI_VALUE_UI_OUTPUT_SCHEMA_VERSION,
    ui_output_id:
      `ai_value_ui_output_${safeIdPart(String(packet?.packet_id ?? dataSpine?.data_spine_readiness_id ?? "review_queue"))}`,
    display_mode: "internal_review_queue",
    org_id: packet?.org_id ?? dataSpine?.org_id ?? null,
    measurement_plan_id: packet?.measurement_plan_id ?? null,
    packet_id: packet?.packet_id ?? null,
    current_readiness_state: currentReadinessState,
    current_review_label: currentReviewLabel,
    contribution_evidence_tier:
      packet?.readiness?.contribution_evidence_tier ??
      packet?.contribution_evidence_tier ??
      "NONE",
    source_lanes: fallbackSourceLanes,
    held_lanes: heldLanes,
    evidence_gaps: evidenceGaps,
    required_caveats: [
      ...stringsOf(packet?.required_caveats),
      "Internal review queue only; not ROI proof, causality, productivity, financial attribution, confidence percentage, probability, or customer-facing financial output."
    ],
    blocked_claims: blockedClaims,
    allowed_next_actions: allowedNextActions,
    primary_next_action: evidenceGaps.length > 0
      ? "collect_missing_aggregate_evidence"
      : allowedNextActions[0] ?? "glean_review",
    cards: [
      {
        card_id: "readiness_summary",
        title: "Readiness",
        body: currentReadinessState,
        severity: heldLanes.length > 0 || evidenceGaps.length > 0 ? "review" : "ready"
      },
      {
        card_id: "source_alignment",
        title: "Source Alignment",
        body: heldLanes.length > 0 ? heldLanes.join(", ") : "All source lanes clear",
        severity: heldLanes.length > 0 ? "review" : "ready"
      },
      {
        card_id: "blocked_claims",
        title: "Blocked Claims",
        body: blockedClaims.join(", "),
        severity: "blocked"
      }
    ],
    ui_sections: [
      "readiness_summary",
      "source_alignment",
      "evidence_gaps",
      "required_caveats",
      "blocked_claims",
      "review_queue"
    ],
    boundary_policy: falseBoundaryPolicy(),
    generated_at: input.generatedAt ?? new Date(0).toISOString(),
    derivation_version: DERIVATION_VERSION
  };
}

function topLevelGaps(output: any): string[] {
  const gaps: string[] = [];
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return ["UI output must be an object"];
  }
  for (const field of [
    "schema_version",
    "ui_output_id",
    "display_mode",
    "current_readiness_state",
    "current_review_label",
    "source_lanes",
    "held_lanes",
    "evidence_gaps",
    "required_caveats",
    "blocked_claims",
    "allowed_next_actions",
    "primary_next_action",
    "cards",
    "ui_sections",
    "boundary_policy",
    "generated_at",
    "derivation_version"
  ]) {
    if (output?.[field] === undefined || output?.[field] === "") {
      gaps.push(`${field} is missing`);
    }
  }
  if (
    output?.schema_version &&
    output.schema_version !== AI_VALUE_UI_OUTPUT_SCHEMA_VERSION
  ) {
    gaps.push(`schema_version is invalid: ${output.schema_version}`);
  }
  if (output?.display_mode !== "internal_review_queue") {
    gaps.push("display_mode must be internal_review_queue");
  }
  for (const field of Object.keys(output ?? {})) {
    if (!ALLOWED_TOP_LEVEL_FIELDS.has(field)) {
      gaps.push(`Unsupported UI output field: ${field}`);
    }
  }
  return gaps;
}

function policyGaps(output: any): string[] {
  const gaps: string[] = [];
  for (const field of REQUIRED_FALSE_BOUNDARY_FIELDS) {
    if (output?.boundary_policy?.[field] !== false) {
      gaps.push(`boundary_policy.${field} must be false`);
    }
  }
  for (const claim of REQUIRED_BLOCKED_CLAIMS) {
    if (!stringsOf(output?.blocked_claims).includes(claim)) {
      gaps.push(`blocked_claims missing ${claim}`);
    }
  }
  return gaps;
}

export function validateValueHypothesisUiOutput(
  output: any
): ValueHypothesisUiOutputValidationResult {
  const gaps = [
    ...topLevelGaps(output),
    ...policyGaps(output),
    ...collectForbidden(output)
  ];
  const valid = gaps.length === 0;
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    ui_output_id: output?.ui_output_id ?? null,
    org_id: output?.org_id ?? null,
    valid,
    gaps,
    feeds: validationFeeds(valid)
  };
}
