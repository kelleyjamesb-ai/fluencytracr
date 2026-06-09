#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_INPUT =
  "docs/contracts/ai-value-intelligence/examples/customer-support-claim-boundary.json";

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
  /proved ROI/i,
  /caused productivity/i,
  /caused .*lift/i,
  /saved money/i,
  /saved \$?\d/i,
  /employee/i,
  /manager/i,
  /team .*better/i
];

function parseArgs(argv) {
  const args = { input: DEFAULT_INPUT, output: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--input") {
      args.input = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--output") {
      args.output = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: node scripts/validate_ai_value_claim_boundary.mjs [--input path] [--output path]"
      );
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function requireField(value, path, gaps) {
  if (!value) gaps.push(`${path} is missing`);
}

function containsForbiddenClaimLanguage(claims) {
  return (claims ?? []).some((claim) =>
    FORBIDDEN_CLAIM_PATTERNS.some((pattern) => pattern.test(claim))
  );
}

function collectTopLevelGaps(boundary) {
  const gaps = [];
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

function collectClaimArrayGaps(boundary) {
  const gaps = [];
  for (const [field, label] of [
    ["safe_claims", "claim"],
    ["required_caveats", "caveat"]
  ]) {
    if (!Array.isArray(boundary?.[field]) || boundary[field].length === 0) {
      gaps.push(`${field} must include at least one ${label}`);
    }
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

function collectBlockedClaimGaps(boundary) {
  const gaps = [];
  const claims = new Set(boundary?.blocked_claims ?? []);
  for (const claim of REQUIRED_BLOCKED_CLAIMS) {
    if (!claims.has(claim)) gaps.push(`blocked_claims missing ${claim}`);
  }
  return gaps;
}

function collectGovernanceGaps(boundary) {
  const gaps = [];
  const boundaries = boundary?.governance_boundaries ?? {};
  for (const boundaryName of GOVERNANCE_BOUNDARIES) {
    if (boundaries[boundaryName] === true) {
      gaps.push(`governance_boundaries.${boundaryName} is true`);
    }
  }
  return gaps;
}

export function validateAiValueClaimBoundary(boundary) {
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
      executive_packet: gaps.length === 0,
      customer_facing_economic_output: false
    }
  };
}

export function buildClaimBoundaryFromReadiness(readiness) {
  const heldForAssumptions = readiness?.decision === "HOLD_FOR_ASSUMPTIONS";
  return {
    schema_version: "FT_AI_VALUE_CLAIM_BOUNDARY_2026_06",
    claim_boundary_id: "claim_boundary_customer_support_v1",
    workflow_family: readiness?.workflow_family ?? null,
    value_route: readiness?.value_route ?? null,
    source_readiness_id: readiness?.readiness_id ?? null,
    claim_state: heldForAssumptions ? "INTERNAL_ONLY" : "CAVEATED",
    safe_claims: [
      "Aggregate support metrics and AI work evidence can support internal planning for a capacity-creation investigation."
    ],
    caveated_claims: heldForAssumptions
      ? ["Customer-owned assumptions must be reviewed before executive validation."]
      : ["This claim remains caveated because causality and realized ROI are not established."],
    blocked_claims: REQUIRED_BLOCKED_CLAIMS,
    required_caveats: [
      "This is a pre-ROI planning artifact.",
      heldForAssumptions
        ? "Missing or caveated assumptions prevent external economic claims."
        : "Outcome movement cannot be attributed to AI without customer-owned validation."
    ],
    review_state: heldForAssumptions
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

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = resolve(process.cwd(), args.input);
  const boundary = JSON.parse(readFileSync(inputPath, "utf8"));
  const result = validateAiValueClaimBoundary(boundary);
  const json = `${JSON.stringify(result, null, 2)}\n`;
  if (args.output) {
    writeFileSync(resolve(process.cwd(), args.output), json, "utf8");
    console.log(`Wrote ${args.output}`);
    return;
  }
  process.stdout.write(json);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) main();
