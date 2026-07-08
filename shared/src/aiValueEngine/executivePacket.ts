/**
 * AI Value Engine — Executive Packet stage.
 *
 * Owns executive validation packet composition, validation, and the
 * markdown rendering used by readout artifacts. Logic migrated verbatim from
 * scripts/generate_ai_value_executive_packet.mjs per the migration contract.
 */

import { getAiValueDisplayLabel } from "./language";

const RESULT_SCHEMA_VERSION = "FT_AI_VALUE_EXECUTIVE_PACKET_VALIDATION_2026_06";

const ALLOWED_DECISIONS = new Set([
  "READY_FOR_EXECUTIVE_VALIDATION",
  "HOLD_FOR_ASSUMPTIONS",
  "HOLD_FOR_SOURCE_COVERAGE",
  "HOLD_FOR_BASELINE",
  "STOP_FOR_GOVERNANCE_REVIEW"
]);

const ALLOWED_CLAIM_STATES = new Set([
  "CAVEATED",
  "INTERNAL_ONLY",
  "MISSING",
  "BLOCKED"
]);

const ALLOWED_EBITA_IMPACT_STATUSES = new Set([
  "NO_FINANCIAL_TRANSLATION",
  "DIRECTIONAL_EBITA_BRIDGE",
  "MODELED_EBITA_SCENARIO",
  "FINANCE_VALIDATED_EBITA_CASE",
  "CUSTOMER_FACING_APPROVED"
]);

const ALLOWED_EBITA_EVIDENCE_QUALITY_VALUES = new Set([
  "MISSING",
  "BLOCKED",
  "SUPPRESSED",
  "DIRECTIONAL",
  "CAVEATED",
  "PRESENT",
  "SUPPORTED",
  "FINANCE_VALIDATED"
]);

const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "packet_id",
  "workflow_family",
  "workflow_name",
  "value_route",
  "decision",
  "claim_state",
  "customer_facing_economic_output",
  "source_refs",
  "sections",
  "ebita_impact_summary"
]);

const ALLOWED_SOURCE_REF_FIELDS = new Set([
  "blueprint_id",
  "metrics_library_id",
  "scenario_id",
  "readiness_id",
  "claim_boundary_id",
  "roi_scenario_id",
  "ebita_bridge_id",
  "engagement_id",
  "fluency_baseline_id"
]);

const REQUIRED_SOURCE_REF_FIELDS = [
  "blueprint_id",
  "metrics_library_id",
  "scenario_id",
  "readiness_id",
  "claim_boundary_id"
];

const LEGACY_ALLOWED_GOVERNANCE_FIELD_PATHS = new Set([
  "customer_facing_economic_output",
  "source_refs.roi_scenario_id",
  "source_refs.ebita_bridge_id",
  "ebita_impact_summary.customer_facing_allowed",
  "ebita_impact_summary.causality_claim_allowed",
  "ebita_impact_summary.evidence_quality.overall_ebita_confidence"
]);

const REQUIRED_SECTIONS = [
  "workflow",
  "metrics",
  "scenario",
  "readiness",
  "claim_boundary",
  "next_actions"
];

const SECTION_FIELDS = new Set(REQUIRED_SECTIONS);
const WORKFLOW_SECTION_FIELDS = new Set([
  "hypothesis",
  "current_state_steps",
  "future_state_steps"
]);
const METRIC_SECTION_FIELDS = new Set([
  "metric_id",
  "name",
  "value_route",
  "measurement_unit",
  "owner"
]);
const SCENARIO_SECTION_FIELDS = new Set(["scenario_id", "bands", "output_units"]);
const SCENARIO_BAND_FIELDS = new Set(["band", "interpretation", "included_metric_ids"]);
const READINESS_SECTION_FIELDS = new Set(["decision", "checks", "rationale"]);
const READINESS_CHECK_FIELDS = new Set([
  "workflow_state",
  "metric_state",
  "baseline_state",
  "assumption_state",
  "scenario_state",
  "governance_state"
]);
const CLAIM_BOUNDARY_SECTION_FIELDS = new Set([
  "claim_state",
  "safe_claims",
  "caveated_claims",
  "blocked_claims",
  "required_caveats"
]);
const EBITA_SUMMARY_FIELDS = new Set([
  "status",
  "realized_ebita_claim_allowed",
  "customer_facing_allowed",
  "causality_claim_allowed",
  "primary_ebita_levers",
  "evidence_quality",
  "allowed_phrases",
  "required_caveats",
  "blocked_claims",
  "next_evidence_actions"
]);
const EBITA_EVIDENCE_QUALITY_FIELDS = new Set([
  "adoption_evidence",
  "workflow_evidence",
  "outcome_evidence",
  "financial_evidence",
  "overall_ebita_confidence"
]);

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

const FORBIDDEN_EBITA_LANGUAGE_PATTERNS = [
  /usage proves EBITA/i,
  /AI caused EBITA/i,
  /proved financial impact/i,
  /headcount reduction/i,
  /named employee/i,
  /individual productivity/i,
  /manager/i,
  /HRIS inference/i,
  /saved \$?\d/i,
  /\$\s?\d/
];

const FORBIDDEN_PACKET_FIELD_PATTERNS = [
  /^raw_rows?$/i,
  /^raw_/i,
  /^score$/i,
  /_score$/i,
  /model_score/i,
  /readiness_score/i,
  /query_text/i,
  /sql_text/i,
  /query_id/i,
  /job_id/i,
  /bigquery/i,
  /sigma/i,
  /dashboard/i,
  /table_id/i,
  /table_name/i,
  /source_handle/i,
  /live_source/i,
  /export_url/i,
  /api_url/i,
  /prompt/i,
  /transcript/i,
  /user_?id/i,
  /user_identifier/i,
  /employee/i,
  /respondent/i,
  /email/i,
  /customer_facing/i,
  /confidence/i,
  /probability/i,
  /productivity/i,
  /causality/i,
  /finance_output/i,
  /financial_output/i,
  /financial_result/i,
  /financial_impact/i,
  /roi_estimate/i,
  /roi_output/i,
  /roi_calculation/i,
  /cost_savings/i,
  /revenue_lift/i,
  /payload_json/i,
  /validation_json/i
];

const HARD_FORBIDDEN_PACKET_VALUE_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /https?:\/\/\S+/i,
  /\b[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/i,
  /\bselect\s+.+\bfrom\b/i,
  /\braw_events?\b/i,
  /\braw_rows?\b/i,
  /\braw\s+events?\b/i,
  /\braw\s+rows?\b/i,
  /\bprompts?\b/i,
  /\btranscripts?\b/i,
  /\buser[_\s-]?ids?\b/i,
  /\bquery[_\s-]?text\b/i,
  /\bsql[_\s-]?text\b/i,
  /\bsigma\b/i,
  /\bbigquery\b/i,
  /\bdashboard[_\s-]?url\b/i,
  /\bsigma[_\s-]?dashboard\b/i,
  /\bbigquery[_\s-]?table\b/i,
  /\bjob[_\s-]?id\b/i,
  /\bjob_[A-Za-z0-9_-]+\b/i,
  /\btable[_\s-]?ref\b/i,
  /\btable_[A-Za-z0-9_-]+\b/i,
  /\bhigh\s+confidence\b/i,
  /\b(?:confidence|probability)\b/i,
  /\b(?:confidence|probability)\s*(?:score|percentage|percent|model|output)\b/i,
  /\b\d{1,3}%\s*(?:confidence|probability)\b/i,
  /\b\d{1,3}\s*percent\s*(?:confidence|probability)\b/i,
  /\bhigh\s+probability\b/i,
  /\$\s?\d/,
  /\brevenue\s+lift\b/i,
  /\bcost\s+savings?\b/i,
  /\b(?:individual|employee|named\s+employee)\s+productivity\b/i,
  /\bproductivity\s+(?:lift|gain|improvement|measurement|score|claim)\b/i,
  /\b(?:ROI|EBITA|EBITDA|finance|financial|customer[-_\s]?facing)\s*[-_\s]?ready\b/i
];

const CAVEAT_OVERRIDABLE_PACKET_VALUE_PATTERNS = [
  /\bcustomer[-_\s]?facing\b.*\b(?:economic|financial|finance)?\b.*\b(?:output|language)\b.*\b(?:approved|authorized|allowed|ready|safe)\b/i,
  /\b(?:economic|financial|finance)\b.*\b(?:output|language)\b.*\bcustomer[-_\s]?facing\b.*\b(?:approved|authorized|allowed|ready|safe)\b/i,
  /\bapproved\s+for\s+customer[-_\s]?facing\s+use\b/i,
  /\brealized\s+(?:ROI|EBITA|financial)\b.*\b(?:claim|output|calculation|impact)\b.*\b(?:allowed|approved|authorized)\b/i
];

const CONTEXTUAL_FORBIDDEN_PACKET_VALUE_PATTERNS = [
  /\bAI\s+caused\b/i,
  /\bcaused\s+(?:EBITA|ROI|productivity|financial\s+impact|outcome|lift)\b/i,
  /\bproved\s+(?:ROI|EBITA|financial\s+impact|causality|productivity)\b/i,
  /\b(?:ROI|EBITA|financial\s+impact|realized\s+financial\s+claim)\b\s+(?:is\s+)?(?:proven|proved|guaranteed)\b/i,
  /\bcaus(?:al(?:ity)?|ation)(?:\s+language)?\b.*\b(?:approved|authorized|allowed|supported|supports?|support)\b/i,
  /\b(?:approved|authorized|allowed|supported|supports?|support)\b.*\bcaus(?:al(?:ity)?|ation)(?:\s+language)?\b/i,
  /\b(?:causality|causation)\b.*\b(?:established|validated|proven|proved)\b/i,
  /\bcausal\s+evidence\b.*\b(?:strong|supported|available|ready|approved|established)\b/i,
  /\bcausal\s+claim\s+(?:ready|approved|authorized|allowed|supported)\b/i,
  /\bAI\s+(?:improved|increased|caused)\s+productivity\b/i,
  /\b(?:proves?|validates?|demonstrates?|establish(?:ed|es)?|shows?)\b.*\b(?:ROI|EBITA|EBITDA|financial\s+impact|EBITDA\s+impact|revenue\s+lift|cost\s+savings?|savings|causality|causation|productivity)\b/i,
  /\b(?:ROI|EBITA|EBITDA|financial\s+impact|EBITDA\s+impact)\b.*\b(?:is\s+)?(?:established|validated|proven|proved)\b/i,
  /\b(?:finance|financial|economic)\s+(?:case|impact|claim|output)\b.*\b(?:established|validated|proven|approved|ready)\b/i,
  /\bcustomer[-_\s]?facing\s+readout\b.*\b(?:safe|approved|authorized|allowed|ready)\b/i,
  /\b(?:this\s+packet\s+is\s+)?customer[-_\s]?facing\s+(?:safe|ready|approved|authorized|allowed)\b/i,
  /\bproductivity\b\s+(?:increased|improved)\b.*\b(?:after|from|because|due\s+to|following)\b/i,
  /\bproductivity\b.*\b(?:approved|authorized|allowed|supported|supports?|output|claim|lift|gain|improvement|measurement|score)\b/i,
  /\b(?:approved|authorized|allowed|supported|supports?)\b.*\bproductivity\b/i,
  /\b(?:this\s+packet\s+)?supports\s+(?:ROI|EBITA|EBITDA)\b/i,
  /\b(?:ROI|EBITA|EBITDA)\b\s+(?:is\s+)?(?:supported|approved|authorized|allowed)\b/i,
  /\b(?:ROI|EBITA|EBITDA|finance|financial|economic)\s+(?:support|approval)\s+(?:is\s+)?(?:available|approved|authorized|allowed|ready|safe)\b/i,
  /\b(?:finance|financial|economic)\s+support\s+is\s+available\b/i,
  /\b(?:ROI|EBITA|EBITDA|finance|financial|economic)\b.*\b(?:output|claim|calculation)\b.*\b(?:approved|authorized|allowed|supported|supports?)\b/i,
  /\b(?:approved|authorized|allowed|supported|supports?)\b.*\b(?:ROI|EBITA|EBITDA|finance|financial|economic)\b.*\b(?:output|claim|calculation)\b/i
];

const FORBIDDEN_SOURCE_REF_VALUE_PATTERNS = [
  /^https?:\/\//i,
  /^bq:\/\//i,
  /\bselect\s+.+\bfrom\b/i,
  /^(?:bq|bigquery|big_query|query|job|raw|table|dashboard|sigma|sql|prompt|transcript|user|users|email|respondent|employee|export|api|source|live)/i,
  /(?:^|[_-])(?:bq|bigquery|big_query|query|job|raw|table|dashboard|sigma|sql|prompt|transcript|user|users|email|respondent|employee|export|api|source|live)[a-z0-9_-]*(?:[_-]|$)/i,
  /(?:^|[_-])user(?:[_-]?(?:ids?|identifier))[a-z0-9_-]*(?:[_-]|$)/i,
  /(?:^|[_-])(?:query|job|raw)(?:[_-]|$)/i,
  /(?:^|_)bq(?:_|$)/i,
  /(?:^|_)bigquery(?:_|$)/i,
  /(?:^|_)big_query(?:_|$)/i,
  /(?:^|_)sigma(?:_|$)/i,
  /(?:^|_)dashboard(?:_|$)/i,
  /^query[_-]/i,
  /^job[_-]/i,
  /^raw[_-]/i,
  /raw[_-]?events?/i,
  /raw[_-]?rows?/i,
  /(?:^|[_-])table(?:[_-]|$)/i,
  /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/
];

const REQUIRED_EBITA_BLOCKED_CLAIMS = [
  "usage_proves_ebita",
  "ai_caused_ebita_without_causal_design",
  "headcount_reduction_from_usage",
  "individual_productivity_claim",
  "individual_productivity_measurement",
  "named_employee_productivity",
  "manager_or_team_ranking",
  "team_or_manager_ranking",
  "hris_inference"
];

export interface ExecutivePacketValidationResult {
  schema_version: string;
  packet_id: string | null;
  decision: string | null;
  valid: boolean;
  gaps: string[];
  feeds: {
    local_workspace_ui: boolean;
    customer_facing_economic_output: boolean;
  };
}

export interface BuildExecutivePacketInputs {
  blueprint: any;
  metricsLibrary: any;
  scenario: any;
  readiness: any;
  claimBoundary: any;
  roiScenario?: any;
  ebitaBridge?: any;
  packetContextRefs?: Record<string, string>;
  packetId?: string;
}

export interface ExecutiveEbitaImpactSummary {
  status:
    | "NO_FINANCIAL_TRANSLATION"
    | "DIRECTIONAL_EBITA_BRIDGE"
    | "MODELED_EBITA_SCENARIO"
    | "FINANCE_VALIDATED_EBITA_CASE"
    | "CUSTOMER_FACING_APPROVED";
  realized_ebita_claim_allowed: boolean;
  customer_facing_allowed: boolean;
  causality_claim_allowed: boolean;
  primary_ebita_levers: string[];
  evidence_quality: {
    adoption_evidence: string;
    workflow_evidence: string;
    outcome_evidence: string;
    financial_evidence: string;
    overall_ebita_confidence: string;
  };
  allowed_phrases: string[];
  required_caveats: string[];
  blocked_claims: string[];
  next_evidence_actions: string[];
}

function containsForbiddenClaimLanguage(values: any): boolean {
  return (Array.isArray(values) ? values : []).some((value: any) =>
    FORBIDDEN_CLAIM_PATTERNS.some((pattern) => pattern.test(String(value)))
  );
}

function containsForbiddenEbitaLanguage(values: any): boolean {
  return (Array.isArray(values) ? values : []).some((value: any) =>
    FORBIDDEN_EBITA_LANGUAGE_PATTERNS.some((pattern) => pattern.test(String(value)))
  );
}

function requireField(value: any, path: string, gaps: string[]): void {
  if (!value) gaps.push(`${path} is missing`);
}

function normalizeKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function isSafeDenialOrCaveat(value: string): boolean {
  return [
    /\bnot\s+proven\b/i,
    /\bnot\s+established\b/i,
    /\bnot\s+validated\b/i,
    /\bnot\s+approved\b/i,
    /\bnot\s+customer[-_\s]?facing\b/i,
    /\binternal\s+or\s+caveated\b/i,
    /\bdo\s+not\s+use\s+causal\s+language\b/i,
    /\bno\s+(?:causation|causal(?:ity)?)(?:\s+(?:language|claim|support))?\s+(?:is\s+)?(?:available|supported|allowed|approved|authorized)\b/i,
    /\bcausation\s+support\s+is\s+not\s+available\b/i,
    /\bno\s+customer[-_\s]?facing\b.*\b(?:output|language)\b.*\b(?:authorized|allowed|approved)\b/i,
    /\bno\s+(?:realized\s+)?(?:ROI|EBITA|financial|causal|causality|causation|productivity)\b.*\b(?:claim|output|language|proof|calculation)\b.*\b(?:is\s+)?(?:allowed|authorized|approved)?\b/i
  ].some((pattern) => pattern.test(value));
}

function packetScalarValueIsForbidden(value: unknown): boolean {
  const text = String(value);
  const trimmed = text.trim();
  if (/^[{[]/.test(trimmed)) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        return true;
      }
    } catch {
      // Non-JSON prose that starts with braces is handled by the text scanner.
    }
  }
  const hardPatternTextVariants = [text, normalizeKey(text)];
  if (
    HARD_FORBIDDEN_PACKET_VALUE_PATTERNS.some((pattern) =>
      hardPatternTextVariants.some((variant) => pattern.test(variant))
    )
  ) {
    return true;
  }
  if (
    (CAVEAT_OVERRIDABLE_PACKET_VALUE_PATTERNS.some((pattern) => pattern.test(text)) ||
      CONTEXTUAL_FORBIDDEN_PACKET_VALUE_PATTERNS.some((pattern) => pattern.test(text))) &&
    !isSafeDenialOrCaveat(text)
  ) {
    return true;
  }
  const fragments = text
    .split(/[.;:,\n]+|\s+(?:although|because|but|despite|even\s+though|though|notwithstanding|provided|unless|yet|however|while|and)\s+/i)
    .map((fragment) => fragment.trim())
    .filter(Boolean);
  for (const fragment of fragments.length > 0 ? fragments : [text]) {
    const hardPatternFragmentVariants = [fragment, normalizeKey(fragment)];
    if (
      HARD_FORBIDDEN_PACKET_VALUE_PATTERNS.some((pattern) =>
        hardPatternFragmentVariants.some((variant) => pattern.test(variant))
      )
    ) {
      return true;
    }
    if (isSafeDenialOrCaveat(fragment)) {
      continue;
    }
    if (
      CAVEAT_OVERRIDABLE_PACKET_VALUE_PATTERNS.some((pattern) => pattern.test(fragment)) ||
      CONTEXTUAL_FORBIDDEN_PACKET_VALUE_PATTERNS.some((pattern) => pattern.test(fragment))
    ) {
      return true;
    }
  }
  return false;
}

function collectForbiddenPacketFieldPaths(value: any, path: string[] = []): string[] {
  if (
    (typeof value === "string" || typeof value === "number") &&
    path.length > 0 &&
    packetScalarValueIsForbidden(value)
  ) {
    return [path.join(".")];
  }
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectForbiddenPacketFieldPaths(item, [...path, String(index)])
    );
  }

  const findings: string[] = [];
  for (const [key, nested] of Object.entries(value)) {
    const nextPath = [...path, key];
    const dotted = nextPath.join(".");
    const normalizedKey = normalizeKey(key);
    if (
      !LEGACY_ALLOWED_GOVERNANCE_FIELD_PATHS.has(dotted) &&
      FORBIDDEN_PACKET_FIELD_PATTERNS.some((pattern) => pattern.test(normalizedKey))
    ) {
      findings.push(dotted);
    }
    if (
      (typeof nested === "string" || typeof nested === "number") &&
      packetScalarValueIsForbidden(nested)
    ) {
      findings.push(dotted);
    }
    findings.push(...collectForbiddenPacketFieldPaths(nested, nextPath));
  }
  return findings;
}

function validateSourceRefs(sourceRefs: any, gaps: string[]): void {
  if (sourceRefs === undefined || sourceRefs === null) {
    return;
  }
  if (typeof sourceRefs !== "object" || Array.isArray(sourceRefs)) {
    gaps.push("source_refs must be an object");
    return;
  }
  for (const field of REQUIRED_SOURCE_REF_FIELDS) {
    if (typeof sourceRefs[field] !== "string" || sourceRefs[field].trim().length === 0) {
      gaps.push(`source_refs.${field} is missing`);
    }
  }
  for (const [field, value] of Object.entries(sourceRefs)) {
    if (!ALLOWED_SOURCE_REF_FIELDS.has(field)) {
      gaps.push(`Unexpected executive packet source ref: ${field}`);
      continue;
    }
    if (value === undefined || value === null) {
      continue;
    }
    const rawValue = typeof value === "string" ? value : "";
    const normalizedValue = normalizeKey(rawValue);
    if (
      typeof value !== "string" ||
      rawValue.trim().length === 0 ||
      rawValue !== rawValue.trim() ||
      !/^[a-z][a-z0-9_-]*$/.test(rawValue) ||
      FORBIDDEN_SOURCE_REF_VALUE_PATTERNS.some((pattern) =>
        pattern.test(rawValue) || pattern.test(normalizedValue)
      )
    ) {
      gaps.push(`Unsafe executive packet source ref value: source_refs.${field}`);
    }
  }
}

function collectUnexpectedKeys(
  value: any,
  allowedFields: Set<string>,
  path: string,
  gaps: string[]
): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return;
  }
  for (const field of Object.keys(value)) {
    if (!allowedFields.has(field)) {
      gaps.push(`Unexpected executive packet field: ${path}.${field}`);
    }
  }
}

function validateExecutivePacketNestedShape(packet: any, gaps: string[]): void {
  const sections = packet?.sections;
  collectUnexpectedKeys(sections, SECTION_FIELDS, "sections", gaps);
  collectUnexpectedKeys(sections?.workflow, WORKFLOW_SECTION_FIELDS, "sections.workflow", gaps);
  const metrics = Array.isArray(sections?.metrics) ? sections.metrics : [];
  metrics.forEach((metric: any, index: number) => {
    collectUnexpectedKeys(metric, METRIC_SECTION_FIELDS, `sections.metrics.${index}`, gaps);
  });
  collectUnexpectedKeys(sections?.scenario, SCENARIO_SECTION_FIELDS, "sections.scenario", gaps);
  const bands = Array.isArray(sections?.scenario?.bands) ? sections.scenario.bands : [];
  bands.forEach((band: any, index: number) => {
    collectUnexpectedKeys(band, SCENARIO_BAND_FIELDS, `sections.scenario.bands.${index}`, gaps);
  });
  collectUnexpectedKeys(sections?.readiness, READINESS_SECTION_FIELDS, "sections.readiness", gaps);
  collectUnexpectedKeys(
    sections?.readiness?.checks,
    READINESS_CHECK_FIELDS,
    "sections.readiness.checks",
    gaps
  );
  collectUnexpectedKeys(
    sections?.claim_boundary,
    CLAIM_BOUNDARY_SECTION_FIELDS,
    "sections.claim_boundary",
    gaps
  );
  collectUnexpectedKeys(packet?.ebita_impact_summary, EBITA_SUMMARY_FIELDS, "ebita_impact_summary", gaps);
  collectUnexpectedKeys(
    packet?.ebita_impact_summary?.evidence_quality,
    EBITA_EVIDENCE_QUALITY_FIELDS,
    "ebita_impact_summary.evidence_quality",
    gaps
  );
}

function validateStringField(value: any, path: string, gaps: string[]): void {
  if (typeof value !== "string" || value.length === 0) {
    gaps.push(`${path} must be a string`);
  }
}

function validatePresentStringField(value: any, path: string, gaps: string[]): void {
  if (value !== undefined && value !== null && typeof value !== "string") {
    gaps.push(`${path} must be a string`);
  }
}

function validateExecutivePacketNestedTypes(packet: any, gaps: string[]): void {
  const sections = packet?.sections ?? {};
  validateStringField(sections?.workflow?.hypothesis, "sections.workflow.hypothesis", gaps);
  stringArray(
    sections?.workflow?.current_state_steps,
    "sections.workflow.current_state_steps",
    gaps
  );
  stringArray(
    sections?.workflow?.future_state_steps,
    "sections.workflow.future_state_steps",
    gaps
  );

  const metrics = Array.isArray(sections.metrics) ? sections.metrics : [];
  metrics.forEach((metric: any, index: number) => {
    for (const field of METRIC_SECTION_FIELDS) {
      validateStringField(metric?.[field], `sections.metrics.${index}.${field}`, gaps);
    }
  });

  validateStringField(sections?.scenario?.scenario_id, "sections.scenario.scenario_id", gaps);
  stringArray(sections?.scenario?.output_units, "sections.scenario.output_units", gaps);
  if (!Array.isArray(sections?.scenario?.bands)) {
    gaps.push("sections.scenario.bands must be an array");
  }
  const bands = Array.isArray(sections?.scenario?.bands) ? sections.scenario.bands : [];
  bands.forEach((band: any, index: number) => {
    validateStringField(band?.band, `sections.scenario.bands.${index}.band`, gaps);
    validateStringField(
      band?.interpretation,
      `sections.scenario.bands.${index}.interpretation`,
      gaps
    );
    stringArray(
      band?.included_metric_ids,
      `sections.scenario.bands.${index}.included_metric_ids`,
      gaps
    );
  });

  validateStringField(sections?.readiness?.decision, "sections.readiness.decision", gaps);
  stringArray(sections?.readiness?.rationale, "sections.readiness.rationale", gaps);
  for (const field of READINESS_CHECK_FIELDS) {
    validateStringField(
      sections?.readiness?.checks?.[field],
      `sections.readiness.checks.${field}`,
      gaps
    );
  }

  validateStringField(
    sections?.claim_boundary?.claim_state,
    "sections.claim_boundary.claim_state",
    gaps
  );
  stringArray(sections?.claim_boundary?.safe_claims, "sections.claim_boundary.safe_claims", gaps);
  stringArray(
    sections?.claim_boundary?.caveated_claims,
    "sections.claim_boundary.caveated_claims",
    gaps
  );
  stringArray(
    sections?.claim_boundary?.blocked_claims,
    "sections.claim_boundary.blocked_claims",
    gaps
  );
  stringArray(
    sections?.claim_boundary?.required_caveats,
    "sections.claim_boundary.required_caveats",
    gaps
  );
  stringArray(sections.next_actions, "sections.next_actions", gaps, { requireItems: true });
}

function sectionArray(section: any, path: string, gaps: string[]): void {
  if (!Array.isArray(section) || section.length === 0) {
    gaps.push(`${path} must include at least one item`);
  }
}

function stringArray(
  section: any,
  path: string,
  gaps: string[],
  options: { requireItems?: boolean } = {}
): void {
  if (!Array.isArray(section)) {
    gaps.push(`${path} must be an array`);
    return;
  }
  if (options.requireItems && section.length === 0) {
    gaps.push(`${path} must include at least one item`);
  }
  section.forEach((item, index) => {
    if (typeof item !== "string") {
      gaps.push(`${path}.${index} must be a string`);
    }
  });
}

const uniqueStrings = (values: any[]): string[] => [
  ...new Set(values.filter(Boolean).map(String))
];

const ebitaEvidenceQuality = (bridge: any): ExecutiveEbitaImpactSummary["evidence_quality"] => ({
  adoption_evidence: String(bridge?.evidence_quality?.adoption_evidence ?? "MISSING"),
  workflow_evidence: String(bridge?.evidence_quality?.workflow_evidence ?? "MISSING"),
  outcome_evidence: String(bridge?.evidence_quality?.outcome_evidence ?? "MISSING"),
  financial_evidence: String(bridge?.evidence_quality?.financial_evidence ?? "MISSING"),
  overall_ebita_confidence: String(
    bridge?.evidence_quality?.overall_ebita_confidence ?? "MISSING"
  )
});

const evidenceIsPresent = (value: unknown): boolean =>
  !["", "MISSING", "BLOCKED", "SUPPRESSED"].includes(String(value ?? "").toUpperCase());

function baselineOrComparisonWeak(roiScenario: any): boolean {
  const gate = roiScenario?.financial_claim_gate ?? {};
  const baselineState = String(
    roiScenario?.baseline_comparison?.baseline_window?.state ?? ""
  ).toUpperCase();
  const comparisonState = String(
    roiScenario?.baseline_comparison?.comparison_window?.state ?? ""
  ).toUpperCase();
  return !(
    gate.data_sufficiency?.baseline_present === true &&
    gate.data_sufficiency?.comparison_present === true
  ) || ["MISSING", "BLOCKED", "SUPPRESSED"].includes(baselineState) ||
    ["MISSING", "BLOCKED", "SUPPRESSED"].includes(comparisonState);
}

function statusForEbitaBridge(
  bridge: any,
  roiScenario: any,
  evidenceQuality: ExecutiveEbitaImpactSummary["evidence_quality"]
): ExecutiveEbitaImpactSummary["status"] {
  const rawStatus = String(
    bridge?.financial_translation_policy?.mode ?? "NO_FINANCIAL_TRANSLATION"
  );
  const status = ALLOWED_EBITA_IMPACT_STATUSES.has(rawStatus)
    ? rawStatus
    : "NO_FINANCIAL_TRANSLATION";
  if (
    !evidenceIsPresent(evidenceQuality.workflow_evidence) ||
    !evidenceIsPresent(evidenceQuality.outcome_evidence)
  ) {
    return "NO_FINANCIAL_TRANSLATION";
  }
  if (status === "CUSTOMER_FACING_APPROVED") {
    return evidenceQuality.overall_ebita_confidence === "FINANCE_VALIDATED"
      ? "FINANCE_VALIDATED_EBITA_CASE"
      : "MODELED_EBITA_SCENARIO";
  }
  return status as ExecutiveEbitaImpactSummary["status"];
}

function defaultAllowedEbitaPhrases(status: ExecutiveEbitaImpactSummary["status"]): string[] {
  if (status === "NO_FINANCIAL_TRANSLATION") {
    return ["No EBITA translation is available for this workflow yet."];
  }
  if (status === "DIRECTIONAL_EBITA_BRIDGE") {
    return [
      "This workflow may affect EBITA through identified financial levers.",
      "No realized EBITA claim is made."
    ];
  }
  if (status === "MODELED_EBITA_SCENARIO") {
    return [
      "Customer-owned financial assumptions support a modeled EBITA scenario.",
      "This is a modeled scenario, not proven EBITA impact."
    ];
  }
  if (status === "FINANCE_VALIDATED_EBITA_CASE") {
    return [
      "Finance-attested assumptions support a finance-validated EBITA case for this workflow and window."
    ];
  }
  return [
    "This economic output remains internal-review only; customer-facing use requires a later exact-scope governance decision."
  ];
}

function requiredEbitaCaveats(
  status: ExecutiveEbitaImpactSummary["status"],
  existingCaveats: any[]
): string[] {
  const caveats = [...existingCaveats.map(String)];
  if (status === "DIRECTIONAL_EBITA_BRIDGE") {
    caveats.push("This is a directional EBITA bridge, not proven financial impact.");
    caveats.push("No realized EBITA claim is allowed.");
  }
  if (status === "MODELED_EBITA_SCENARIO") {
    caveats.push("Customer-owned financial assumptions are required before dollarized claims.");
    caveats.push("Finance validation is required before realized EBITA language.");
    caveats.push("No realized EBITA claim is allowed.");
  }
  if (status === "FINANCE_VALIDATED_EBITA_CASE") {
    caveats.push(
      "Finance-validated language applies only within the stated workflow and window."
    );
  }
  if (status === "CUSTOMER_FACING_APPROVED") {
    caveats.push("Use only within the finance-approved scope and window.");
  }
  if (status === "NO_FINANCIAL_TRANSLATION") {
    caveats.push("No realized EBITA claim is allowed.");
  }
  return uniqueStrings(caveats);
}

function nextEbitaEvidenceActions(
  status: ExecutiveEbitaImpactSummary["status"],
  evidenceQuality: ExecutiveEbitaImpactSummary["evidence_quality"],
  roiScenario: any,
  causalityAllowed: boolean,
  customerFacingAllowed: boolean
): string[] {
  const actions: string[] = [];
  if (["MISSING", "DIRECTIONAL", "CAVEATED"].includes(evidenceQuality.financial_evidence)) {
    actions.push("Attach customer-owned financial assumptions.");
    actions.push("Confirm finance owner and approval state.");
  }
  if (["MISSING", "BLOCKED", "SUPPRESSED"].includes(evidenceQuality.outcome_evidence)) {
    actions.push(
      "Attach accepted customer-owned outcome evidence for the same workflow and window."
    );
  }
  if (baselineOrComparisonWeak(roiScenario)) {
    actions.push("Confirm baseline and comparison windows.");
  }
  if (status === "MODELED_EBITA_SCENARIO") {
    actions.push("Finance validation is required before realized EBITA language.");
  }
  if (!causalityAllowed) {
    actions.push(
      "Do not use causal language unless experimental or quasi-experimental evidence is available."
    );
  }
  if (!customerFacingAllowed) {
    actions.push(
      "Keep economic language internal or caveated until customer-facing approval is granted."
    );
  }
  return uniqueStrings(actions);
}

function buildEbitaImpactSummary(
  ebitaBridge: any,
  roiScenario: any
): ExecutiveEbitaImpactSummary | undefined {
  if (!ebitaBridge) return undefined;
  const evidenceQuality = ebitaEvidenceQuality(ebitaBridge);
  const status = statusForEbitaBridge(ebitaBridge, roiScenario, evidenceQuality);
  const bridgePolicy = ebitaBridge.financial_translation_policy ?? {};
  const rawBridgeStatus = String(bridgePolicy.mode ?? "NO_FINANCIAL_TRANSLATION");
  const realizedAllowed = false;
  const customerFacingAllowed = false;
  const causalityAllowed = false;
  const safeLanguage = ebitaBridge.safe_language ?? {};
  const sourcePhrases = status === "NO_FINANCIAL_TRANSLATION" || rawBridgeStatus !== status
    ? defaultAllowedEbitaPhrases(status)
    : Array.isArray(safeLanguage.allowed_phrases)
      ? safeLanguage.allowed_phrases
      : [];
  const allowedPhrases = uniqueStrings(sourcePhrases)
    .filter((phrase) => !containsForbiddenEbitaLanguage([phrase]));

  return {
    status,
    realized_ebita_claim_allowed: realizedAllowed,
    customer_facing_allowed: customerFacingAllowed,
    causality_claim_allowed: causalityAllowed,
    primary_ebita_levers:
      status === "NO_FINANCIAL_TRANSLATION"
        ? []
        : uniqueStrings((ebitaBridge.ebita_levers ?? []).map((lever: any) => lever.ebita_driver)),
    evidence_quality: evidenceQuality,
    allowed_phrases: allowedPhrases.length > 0 ? allowedPhrases : defaultAllowedEbitaPhrases(status),
    required_caveats: requiredEbitaCaveats(
      status,
      Array.isArray(safeLanguage.required_caveats) ? safeLanguage.required_caveats : []
    ),
    blocked_claims: uniqueStrings([
      ...(Array.isArray(safeLanguage.blocked_claims) ? safeLanguage.blocked_claims : []),
      ...REQUIRED_EBITA_BLOCKED_CLAIMS
    ]),
    next_evidence_actions: nextEbitaEvidenceActions(
      status,
      evidenceQuality,
      roiScenario,
      causalityAllowed,
      customerFacingAllowed
    )
  };
}

function packetContextRefs(refs: Record<string, string> | undefined): Record<string, string> {
  const safeRefs: Record<string, string> = {};
  if (typeof refs?.engagement_id === "string") {
    safeRefs.engagement_id = refs.engagement_id;
  }
  if (typeof refs?.fluency_baseline_id === "string") {
    safeRefs.fluency_baseline_id = refs.fluency_baseline_id;
  }
  return safeRefs;
}

export function buildExecutiveValidationPacket({
  blueprint,
  metricsLibrary,
  scenario,
  readiness,
  claimBoundary,
  roiScenario,
  ebitaBridge,
  packetContextRefs: contextRefs,
  packetId
}: BuildExecutivePacketInputs): any {
  const recommendedMetrics = metricsLibrary.metrics
    .filter(
      (metric: any) =>
        metric.value_route === blueprint.value_routes.primary &&
        metric.allowed_claim_level !== "BLOCKED"
    )
    .map((metric: any) => ({
      metric_id: metric.metric_id,
      name: metric.name,
      value_route: metric.value_route,
      measurement_unit: metric.measurement_unit,
      owner: metric.owner
    }));

  return {
    schema_version: "FT_AI_VALUE_EXECUTIVE_PACKET_2026_06",
    packet_id: packetId ?? "executive_packet_customer_support_v1",
    workflow_family: blueprint.workflow_family,
    workflow_name: blueprint.workflow_name,
    value_route: blueprint.value_routes.primary,
    decision: readiness.decision,
    claim_state: claimBoundary.claim_state,
    customer_facing_economic_output: false,
    source_refs: {
      blueprint_id: blueprint.blueprint_id,
      metrics_library_id: metricsLibrary.library_id,
      scenario_id: scenario.scenario_id,
      readiness_id: readiness.readiness_id,
      claim_boundary_id: claimBoundary.claim_boundary_id,
      roi_scenario_id: roiScenario?.roi_scenario_id,
      ebita_bridge_id: ebitaBridge?.ebita_bridge_id,
      ...packetContextRefs(contextRefs)
    },
    sections: {
      workflow: {
        hypothesis: blueprint.value_hypothesis,
        current_state_steps: blueprint.process_discovery.current_state_steps,
        future_state_steps: blueprint.process_discovery.future_state_steps
      },
      metrics: recommendedMetrics,
      scenario: {
        scenario_id: scenario.scenario_id,
        bands: scenario.input.scenario_bands,
        output_units: scenario.input.output_units
      },
      readiness: {
        decision: readiness.decision,
        checks: readiness.readiness_checks,
        rationale: readiness.decision_rationale
      },
      claim_boundary: {
        claim_state: claimBoundary.claim_state,
        safe_claims: claimBoundary.safe_claims,
        caveated_claims: claimBoundary.caveated_claims,
        blocked_claims: claimBoundary.blocked_claims,
        required_caveats: claimBoundary.required_caveats
      },
      next_actions: readiness.next_actions
    },
    ebita_impact_summary: buildEbitaImpactSummary(ebitaBridge, roiScenario)
  };
}

function validateEbitaImpactSummary(summary: any, gaps: string[]): void {
  if (summary === undefined) return;
  if (!summary || typeof summary !== "object") {
    gaps.push("ebita_impact_summary must be an object when present");
    return;
  }
  for (const field of [
    "status",
    "primary_ebita_levers",
    "evidence_quality",
    "allowed_phrases",
    "required_caveats",
    "blocked_claims",
    "next_evidence_actions"
  ]) {
    requireField(summary[field], `ebita_impact_summary.${field}`, gaps);
  }
  if (summary.status && !ALLOWED_EBITA_IMPACT_STATUSES.has(summary.status)) {
    gaps.push(`ebita_impact_summary.status is invalid: ${summary.status}`);
  }
  for (const field of [
    "realized_ebita_claim_allowed",
    "customer_facing_allowed",
    "causality_claim_allowed"
  ]) {
    if (summary[field] !== true && summary[field] !== false) {
      gaps.push(`ebita_impact_summary.${field} must be boolean`);
    }
  }
  for (const field of [
    "primary_ebita_levers",
    "allowed_phrases",
    "required_caveats",
    "blocked_claims",
    "next_evidence_actions"
  ]) {
    stringArray(summary[field], `ebita_impact_summary.${field}`, gaps);
  }
  const quality = summary.evidence_quality ?? {};
  for (const field of [
    "adoption_evidence",
    "workflow_evidence",
    "outcome_evidence",
    "financial_evidence",
    "overall_ebita_confidence"
  ]) {
    requireField(quality[field], `ebita_impact_summary.evidence_quality.${field}`, gaps);
    if (
      typeof quality[field] !== "string" ||
      !ALLOWED_EBITA_EVIDENCE_QUALITY_VALUES.has(quality[field])
    ) {
      gaps.push(`ebita_impact_summary.evidence_quality.${field} is invalid: ${quality[field]}`);
    }
  }
  if (containsForbiddenEbitaLanguage(summary.allowed_phrases)) {
    gaps.push("ebita_impact_summary.allowed_phrases contains forbidden financial claim language");
  }
  const blocked = new Set(Array.isArray(summary.blocked_claims) ? summary.blocked_claims : []);
  for (const claim of REQUIRED_EBITA_BLOCKED_CLAIMS) {
    if (!blocked.has(claim)) {
      gaps.push(`ebita_impact_summary.blocked_claims missing ${claim}`);
    }
  }
  if (
    summary.status === "DIRECTIONAL_EBITA_BRIDGE" &&
    summary.realized_ebita_claim_allowed === true
  ) {
    gaps.push("ebita_impact_summary.realized_ebita_claim_allowed must be false for DIRECTIONAL_EBITA_BRIDGE");
  }
  if (
    summary.status === "MODELED_EBITA_SCENARIO" &&
    summary.realized_ebita_claim_allowed === true
  ) {
    gaps.push("ebita_impact_summary.realized_ebita_claim_allowed must be false for MODELED_EBITA_SCENARIO");
  }
  if (
    summary.realized_ebita_claim_allowed === true &&
    quality.overall_ebita_confidence !== "FINANCE_VALIDATED"
  ) {
    gaps.push("ebita_impact_summary.realized_ebita_claim_allowed requires FINANCE_VALIDATED confidence");
  }
  if (summary.status === "CUSTOMER_FACING_APPROVED") {
    gaps.push("ebita_impact_summary.status CUSTOMER_FACING_APPROVED is not authorized for executive packets");
  }
  if (summary.realized_ebita_claim_allowed === true) {
    gaps.push("ebita_impact_summary.realized_ebita_claim_allowed must be false");
  }
  if (summary.customer_facing_allowed === true) {
    gaps.push("ebita_impact_summary.customer_facing_allowed must be false");
  }
  if (summary.causality_claim_allowed === true) {
    gaps.push("ebita_impact_summary.causality_claim_allowed must be false");
  }
  if (
    summary.customer_facing_allowed === true &&
    summary.status !== "CUSTOMER_FACING_APPROVED"
  ) {
    gaps.push("ebita_impact_summary.customer_facing_allowed requires CUSTOMER_FACING_APPROVED status");
  }
  if (
    summary.status !== "NO_FINANCIAL_TRANSLATION" &&
    (!evidenceIsPresent(quality.workflow_evidence) || !evidenceIsPresent(quality.outcome_evidence))
  ) {
    gaps.push("ebita_impact_summary cannot make a financial translation from usage evidence alone");
  }
}

export function validateExecutivePacket(packet: any): ExecutivePacketValidationResult {
  const gaps: string[] = [];
  if (packet && typeof packet === "object" && !Array.isArray(packet)) {
    for (const field of Object.keys(packet)) {
      if (!ALLOWED_TOP_LEVEL_FIELDS.has(field)) {
        gaps.push(`Unexpected executive packet field: ${field}`);
      }
    }
  }
  const forbiddenFields = collectForbiddenPacketFieldPaths(packet);
  if (forbiddenFields.length > 0) {
    gaps.push(`Forbidden field(s) present: ${Array.from(new Set(forbiddenFields)).sort().join(", ")}`);
  }
  validateSourceRefs(packet?.source_refs, gaps);
  validateExecutivePacketNestedShape(packet, gaps);
  validateExecutivePacketNestedTypes(packet, gaps);
  for (const field of [
    "schema_version",
    "packet_id",
    "workflow_family",
    "workflow_name",
    "value_route",
    "decision",
    "claim_state",
    "source_refs",
    "sections"
  ]) {
    requireField(packet?.[field], field, gaps);
  }
  for (const field of [
    "schema_version",
    "packet_id",
    "workflow_family",
    "workflow_name",
    "value_route",
    "decision",
    "claim_state"
  ]) {
    validatePresentStringField(packet?.[field], field, gaps);
  }
  if (packet?.schema_version &&
      packet.schema_version !== "FT_AI_VALUE_EXECUTIVE_PACKET_2026_06") {
    gaps.push(`schema_version is invalid: ${packet.schema_version}`);
  }
  if (packet?.decision && !ALLOWED_DECISIONS.has(packet.decision)) {
    gaps.push(`decision is invalid: ${packet.decision}`);
  }
  if (packet?.claim_state && !ALLOWED_CLAIM_STATES.has(packet.claim_state)) {
    gaps.push(`claim_state is invalid: ${packet.claim_state}`);
  }
  if (packet?.customer_facing_economic_output === true) {
    gaps.push("customer_facing_economic_output is true");
  }
  if (packet?.customer_facing_economic_output !== false) {
    gaps.push("customer_facing_economic_output must be false");
  }
  const sections = packet?.sections ?? {};
  for (const section of REQUIRED_SECTIONS) {
    requireField(sections[section], `sections.${section}`, gaps);
  }
  sectionArray(sections.metrics, "sections.metrics", gaps);
  sectionArray(sections.next_actions, "sections.next_actions", gaps);
  if (containsForbiddenClaimLanguage(sections?.claim_boundary?.safe_claims)) {
    gaps.push("sections.claim_boundary.safe_claims contains forbidden claim language");
  }
  if (containsForbiddenClaimLanguage(sections?.claim_boundary?.caveated_claims)) {
    gaps.push("sections.claim_boundary.caveated_claims contains forbidden claim language");
  }
  validateEbitaImpactSummary(packet?.ebita_impact_summary, gaps);
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    packet_id: packet?.packet_id ?? null,
    decision: packet?.decision ?? null,
    valid: gaps.length === 0,
    gaps,
    feeds: {
      local_workspace_ui: gaps.length === 0,
      customer_facing_economic_output: false
    }
  };
}

function renderEbitaImpactMarkdown(summary: ExecutiveEbitaImpactSummary | undefined): string {
  if (!summary) return "";
  const levers = summary.primary_ebita_levers.length
    ? summary.primary_ebita_levers.map((lever) => `- ${getAiValueDisplayLabel(lever)}`).join("\n")
    : "- No financial translation levers surfaced.";
  const quality = Object.entries(summary.evidence_quality)
    .map(
      ([field, value]) =>
        `- ${getAiValueDisplayLabel(field)}: ${getAiValueDisplayLabel(value)}`
    )
    .join("\n");
  const allowed = summary.allowed_phrases.map((phrase) => `- ${phrase}`).join("\n");
  const caveats = summary.required_caveats.map((caveat) => `- ${caveat}`).join("\n");
  const blocked = summary.blocked_claims
    .map((claim) => `- ${getAiValueDisplayLabel(claim)}`)
    .join("\n");
  const next = summary.next_evidence_actions.map((action) => `- ${action}`).join("\n");
  const realizedLine = summary.realized_ebita_claim_allowed
    ? "Realized financial language is allowed only within the finance-validated workflow and window."
    : "No realized financial claim is allowed.";
  return `
## Financial Translation

Status: ${getAiValueDisplayLabel(summary.status)}

${realizedLine}

Customer-facing economic language: ${summary.customer_facing_allowed ? "Approved for the stated scope." : "Not approved."}

Causality language: ${summary.causality_claim_allowed ? "Approved by evidence design." : "Not approved."}

### Primary financial levers

${levers}

### Evidence quality

${quality}

### Allowed language

${allowed}

### Required caveats

${caveats}

### Blocked claims

${blocked}

### Next evidence actions

${next}
`;
}

export function renderExecutiveValidationMarkdown(packet: any): string {
  const metrics = packet.sections.metrics
    .map((metric: any) => `- ${metric.name} - ${metric.measurement_unit}`)
    .join("\n");
  const caveats = packet.sections.claim_boundary.required_caveats
    .map((caveat: any) => `- ${caveat}`)
    .join("\n");
  const nextActions = packet.sections.next_actions
    .map((action: any) => `- ${action}`)
    .join("\n");
  return `# Customer Support AI Value Validation Packet

## Measurement Readiness

${getAiValueDisplayLabel(packet.decision)}

## Workflow

${packet.workflow_name}

${packet.sections.workflow.hypothesis}

## Metrics

${metrics}

## Scenario

Value route: ${packet.value_route}

Scenario bands are planning ranges only. They are not realized ROI.

## Value Realization

Claim state: ${getAiValueDisplayLabel(packet.claim_state)}

${packet.sections.claim_boundary.safe_claims.map((claim: any) => `- ${claim}`).join("\n")}

${renderEbitaImpactMarkdown(packet.ebita_impact_summary)}

## Required Caveats

${caveats}

## Next Actions

${nextActions}
`;
}
