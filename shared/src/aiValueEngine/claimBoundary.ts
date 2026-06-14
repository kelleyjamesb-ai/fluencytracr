/**
 * AI Value Engine — Claim Boundary stage.
 *
 * Owns claim boundary validation and the deterministic builder from a
 * validated Evidence Readiness object. Logic migrated verbatim from
 * scripts/validate_ai_value_claim_boundary.mjs per the migration contract.
 */

const RESULT_SCHEMA_VERSION = "FT_AI_VALUE_CLAIM_BOUNDARY_VALIDATION_2026_06";

const CLAIM_STATES = new Set([
  "CAVEATED",
  "INTERNAL_ONLY",
  "MISSING",
  "BLOCKED"
]);

const REVIEW_STATES = new Set([
  "READY_FOR_INTERNAL_REVIEW",
  "HOLD_FOR_CUSTOMER_INPUT",
  "STOP_FOR_GOVERNANCE_REVIEW"
]);

const REQUIRED_BLOCKED_CLAIMS = [
  "roi_proof",
  "causality_claim",
  "individual_scoring",
  "team_or_manager_ranking",
  "hr_analytics",
  "productivity_measurement",
  "customer_facing_economic_output"
];

const GOVERNANCE_BOUNDARIES = [
  "customer_facing_economic_output",
  "realized_roi_calculation",
  "causality_claim",
  "individual_scoring",
  "hr_analytics",
  "productivity_measurement"
];

const FORBIDDEN_CLAIM_PATTERNS = [
  /prov(?:ed|es) ROI/i,
  /caused productivity/i,
  /caused .*lift/i,
  /saved money/i,
  /saved \$?\d/i,
  /employee/i,
  /manager/i,
  /team .*better/i
];

const FORBIDDEN_KEY_PATTERNS = [
  /prompt/i,
  /response/i,
  /message_text/i,
  /file_content/i,
  /email/i,
  /user_id/i,
  /person_id/i,
  /employee/i,
  /manager/i,
  /customer_telemetry/i,
  /raw_/i,
  /ticket_text/i,
  /hris/i
];

export interface ClaimBoundaryValidationResult {
  schema_version: string;
  claim_boundary_id: string | null;
  workflow_family: string | null;
  value_route: string | null;
  claim_state: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    executive_packet: boolean;
    customer_facing_economic_output: boolean;
  };
}

function requireField(value: any, path: string, gaps: string[]): void {
  if (!value) gaps.push(`${path} is missing`);
}

function containsForbiddenClaimLanguage(claims: any): boolean {
  return (claims ?? []).some((claim: any) =>
    FORBIDDEN_CLAIM_PATTERNS.some((pattern) => pattern.test(claim))
  );
}

function isForbiddenKey(key: string): boolean {
  return FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function collectForbiddenFields(value: any, fields: Set<string> = new Set()): Set<string> {
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item) => collectForbiddenFields(item, fields));
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (key === "governance_boundaries") continue;
    if (isForbiddenKey(key)) fields.add(key);
    collectForbiddenFields(nested, fields);
  }
  return fields;
}

function collectTopLevelGaps(boundary: any): string[] {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "claim_boundary_id",
    "workflow_family",
    "value_route",
    "source_readiness_id",
    "claim_state",
    "safe_claims",
    "caveated_claims",
    "blocked_claims",
    "required_caveats",
    "review_state",
    "governance_boundaries"
  ]) {
    requireField(boundary?.[field], field, gaps);
  }
  if (boundary?.schema_version &&
      boundary.schema_version !== "FT_AI_VALUE_CLAIM_BOUNDARY_2026_06") {
    gaps.push(`schema_version is invalid: ${boundary.schema_version}`);
  }
  if (boundary?.claim_state && !CLAIM_STATES.has(boundary.claim_state)) {
    gaps.push(`claim_state is invalid: ${boundary.claim_state}`);
  }
  if (boundary?.review_state && !REVIEW_STATES.has(boundary.review_state)) {
    gaps.push(`review_state is invalid: ${boundary.review_state}`);
  }
  return gaps;
}

function collectClaimArrayGaps(boundary: any): string[] {
  const gaps: string[] = [];
  const blockingState = ["BLOCKED", "MISSING"].includes(boundary?.claim_state);
  if (!Array.isArray(boundary?.safe_claims) ||
      (!blockingState && boundary.safe_claims.length === 0)) {
    gaps.push("safe_claims must include at least one claim");
  }
  if (!Array.isArray(boundary?.required_caveats) ||
      boundary.required_caveats.length === 0) {
    gaps.push("required_caveats must include at least one caveat");
  }
  if (!Array.isArray(boundary?.caveated_claims)) {
    gaps.push("caveated_claims must be an array");
  }
  if (containsForbiddenClaimLanguage(boundary?.safe_claims)) {
    gaps.push("safe_claims contains forbidden claim language");
  }
  if (containsForbiddenClaimLanguage(boundary?.caveated_claims)) {
    gaps.push("caveated_claims contains forbidden claim language");
  }
  return gaps;
}

function collectBlockedClaimGaps(boundary: any): string[] {
  const gaps: string[] = [];
  const claims = new Set(boundary?.blocked_claims ?? []);
  for (const claim of REQUIRED_BLOCKED_CLAIMS) {
    if (!claims.has(claim)) gaps.push(`blocked_claims missing ${claim}`);
  }
  return gaps;
}

function collectGovernanceGaps(boundary: any): string[] {
  const gaps: string[] = [];
  for (const field of [...collectForbiddenFields(boundary)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }
  const boundaries = boundary?.governance_boundaries ?? {};
  for (const boundaryName of GOVERNANCE_BOUNDARIES) {
    if (boundaries[boundaryName] === true) {
      gaps.push(`governance_boundaries.${boundaryName} is true`);
    }
  }
  return gaps;
}

export function validateClaimBoundary(boundary: any): ClaimBoundaryValidationResult {
  const gaps = [
    ...collectTopLevelGaps(boundary),
    ...collectClaimArrayGaps(boundary),
    ...collectBlockedClaimGaps(boundary),
    ...collectGovernanceGaps(boundary)
  ];
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    claim_boundary_id: boundary?.claim_boundary_id ?? null,
    workflow_family: boundary?.workflow_family ?? null,
    value_route: boundary?.value_route ?? null,
    claim_state: boundary?.claim_state ?? null,
    valid: gaps.length === 0,
    gaps,
    feeds: {
      executive_packet:
        gaps.length === 0 &&
        !["BLOCKED", "MISSING"].includes(boundary?.claim_state),
      customer_facing_economic_output: false
    }
  };
}

export interface BuildClaimBoundaryOptions {
  claimBoundaryId?: string;
}

export function buildClaimBoundaryFromReadiness(
  readiness: any,
  options: BuildClaimBoundaryOptions = {}
): any {
  const heldForAssumptions = readiness?.decision === "HOLD_FOR_ASSUMPTIONS";
  const readyForExecutive =
    readiness?.decision === "READY_FOR_EXECUTIVE_VALIDATION";
  const blocked = !heldForAssumptions && !readyForExecutive;
  return {
    schema_version: "FT_AI_VALUE_CLAIM_BOUNDARY_2026_06",
    claim_boundary_id: options.claimBoundaryId ?? "claim_boundary_customer_support_v1",
    workflow_family: readiness?.workflow_family ?? null,
    value_route: readiness?.value_route ?? null,
    source_readiness_id: readiness?.readiness_id ?? null,
    claim_state: blocked
      ? "BLOCKED"
      : heldForAssumptions
        ? "INTERNAL_ONLY"
        : "CAVEATED",
    safe_claims: blocked
      ? []
      : [
          "Aggregate support metrics and AI work evidence can support internal planning for a capacity-creation investigation."
        ],
    caveated_claims: blocked
      ? []
      : heldForAssumptions
        ? ["Customer-owned assumptions must be reviewed before executive validation."]
        : ["This claim remains caveated because causality and realized ROI are not established."],
    blocked_claims: REQUIRED_BLOCKED_CLAIMS,
    required_caveats: [
      "This is a pre-ROI planning artifact.",
      blocked
        ? `Readiness decision ${readiness?.decision ?? "MISSING"} blocks claim-boundary progression.`
        : heldForAssumptions
        ? "Missing or caveated assumptions prevent external economic claims."
        : "Outcome movement cannot be attributed to AI without customer-owned validation."
    ],
    review_state: blocked
      ? "STOP_FOR_GOVERNANCE_REVIEW"
      : heldForAssumptions
      ? "READY_FOR_INTERNAL_REVIEW"
      : "HOLD_FOR_CUSTOMER_INPUT",
    governance_boundaries: {
      customer_facing_economic_output: false,
      realized_roi_calculation: false,
      causality_claim: false,
      individual_scoring: false,
      hr_analytics: false,
      productivity_measurement: false
    }
  };
}
