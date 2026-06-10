/**
 * AI Value Engine — Fluency Baseline stage.
 *
 * Governs aggregate results from the "Explore Your AI Fluency" kickoff
 * instrument. Individuals are the only consumers of their individual
 * readouts; the platform accepts only cohort-level aggregates. Fail-closed
 * rules: cohorts below the minimum size must be marked suppressed and carry
 * no scores, respondent identifiers are rejected outright, and the baseline
 * is always optional context — it can inform a value investigation but
 * never scores, ranks, or compares people or teams.
 */

const RESULT_SCHEMA_VERSION = "FT_AI_VALUE_FLUENCY_BASELINE_VALIDATION_2026_06";

export const FLUENCY_BASELINE_SCHEMA_VERSION = "FT_AI_VALUE_FLUENCY_BASELINE_2026_06";

export const FLUENCY_MIN_COHORT_SIZE = 5;

export const FLUENCY_INSTRUMENT_IDS = new Set([
  "ai_fluency_long_v1",
  "ai_fluency_short_v1"
]);

export const FLUENCY_CONSTRUCTS = new Set([
  "confidence",
  "usage_quality",
  "behavior_change",
  "leadership_reinforcement",
  "capability_growth",
  "ai_attitude",
  "behavioral_intent",
  "perceived_ai_impact"
]);

const CORE_CONSTRUCTS = [
  "confidence",
  "usage_quality",
  "behavior_change",
  "leadership_reinforcement",
  "capability_growth"
];

const ALLOWED_COLLECTION_MODES = new Set(["kickoff", "followup"]);

const FORBIDDEN_KEY_PATTERNS = [
  /respondent_id/i,
  /(^|_)user(_|$)/i,
  /^user[A-Z]/,
  /email/i,
  /employee/i,
  /person_id/i,
  /person_level/i,
  /manager/i,
  /(^|_)name(_|$)/i,
  /raw_/i,
  /answer/i,
  /response_text/i,
  /hris/i
];

const FORBIDDEN_KEY_EXCEPTIONS = new Set(["cohort_label"]);

export interface FluencyBaselineValidationResult {
  schema_version: string;
  baseline_id: string | null;
  org_id: string | null;
  instrument_id: string | null;
  collection_mode: string | null;
  cohort_count: number;
  suppressed_cohort_count: number;
  valid: boolean;
  gaps: string[];
  feeds: {
    value_chain_context: boolean;
    individual_scoring: false;
    team_or_manager_ranking: false;
    customer_facing_economic_output: false;
  };
}

function isForbiddenKey(key: string): boolean {
  if (FORBIDDEN_KEY_EXCEPTIONS.has(key)) return false;
  return FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function collectForbiddenFields(value: any, fields: Set<string> = new Set()): Set<string> {
  if (!value || typeof value !== "object") return fields;
  if (Array.isArray(value)) {
    value.forEach((item) => collectForbiddenFields(item, fields));
    return fields;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (key === "governance") continue;
    if (isForbiddenKey(key)) fields.add(key);
    collectForbiddenFields(nested, fields);
  }
  return fields;
}

function collectCohortGaps(cohort: any, index: number): string[] {
  const gaps: string[] = [];
  const path = `cohorts[${index}]`;
  if (!cohort?.cohort_id) {
    gaps.push(`${path}.cohort_id is missing`);
  }
  if (!cohort?.cohort_label) {
    gaps.push(`${path}.cohort_label is missing`);
  }
  const count = cohort?.respondent_count;
  if (typeof count !== "number" || count < 0) {
    gaps.push(`${path}.respondent_count must be a non-negative number`);
    return gaps;
  }

  const suppressed = cohort?.suppressed === true;
  const scores = cohort?.construct_scores;

  if (count < FLUENCY_MIN_COHORT_SIZE) {
    // Fail closed: small cohorts must be explicitly suppressed and scoreless.
    if (!suppressed) {
      gaps.push(
        `${path} has fewer than ${FLUENCY_MIN_COHORT_SIZE} respondents and must be marked suppressed`
      );
    }
    if (scores && Object.keys(scores).length > 0) {
      gaps.push(`${path} is below the minimum cohort size and must not carry construct scores`);
    }
    return gaps;
  }

  if (suppressed) {
    if (scores && Object.keys(scores).length > 0) {
      gaps.push(`${path} is suppressed and must not carry construct scores`);
    }
    return gaps;
  }

  if (!scores || typeof scores !== "object" || Array.isArray(scores)) {
    gaps.push(`${path}.construct_scores is missing`);
    return gaps;
  }
  for (const construct of Object.keys(scores)) {
    if (!FLUENCY_CONSTRUCTS.has(construct)) {
      gaps.push(`${path}.construct_scores contains unknown construct: ${construct}`);
      continue;
    }
    const entry = scores[construct];
    const mean = entry?.mean;
    if (typeof mean !== "number" || mean < 1 || mean > 5) {
      gaps.push(`${path}.construct_scores.${construct}.mean must be between 1 and 5`);
    }
  }
  for (const construct of CORE_CONSTRUCTS) {
    if (!scores[construct]) {
      gaps.push(`${path}.construct_scores missing core construct ${construct}`);
    }
  }
  return gaps;
}

export function validateFluencyBaseline(baseline: any): FluencyBaselineValidationResult {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "baseline_id",
    "org_id",
    "instrument",
    "window",
    "collection_mode",
    "cohorts",
    "governance"
  ]) {
    if (!baseline?.[field]) {
      gaps.push(`${field} is missing`);
    }
  }
  if (baseline?.schema_version &&
      baseline.schema_version !== FLUENCY_BASELINE_SCHEMA_VERSION) {
    gaps.push(`schema_version is invalid: ${baseline.schema_version}`);
  }
  const instrumentId = baseline?.instrument?.instrument_id ?? null;
  if (baseline?.instrument && !FLUENCY_INSTRUMENT_IDS.has(instrumentId)) {
    gaps.push(`instrument.instrument_id is invalid: ${instrumentId}`);
  }
  if (baseline?.collection_mode &&
      !ALLOWED_COLLECTION_MODES.has(baseline.collection_mode)) {
    gaps.push(`collection_mode is invalid: ${baseline.collection_mode}`);
  }

  const cohorts = Array.isArray(baseline?.cohorts) ? baseline.cohorts : [];
  if (baseline?.cohorts && cohorts.length === 0) {
    gaps.push("cohorts must include at least one cohort");
  }
  cohorts.forEach((cohort: any, index: number) => {
    gaps.push(...collectCohortGaps(cohort, index));
  });

  const governance = baseline?.governance ?? {};
  for (const flag of [
    "respondent_identifiers_included",
    "person_level_results_shared",
    "used_for_individual_scoring",
    "used_for_team_ranking"
  ]) {
    if (governance[flag] !== false) {
      gaps.push(`governance.${flag} must be explicitly false`);
    }
  }

  for (const field of [...collectForbiddenFields(baseline)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }

  const suppressedCount = cohorts.filter((cohort: any) => cohort?.suppressed === true).length;
  const valid = gaps.length === 0;
  const hasUsableCohort = cohorts.some(
    (cohort: any) =>
      cohort?.suppressed !== true &&
      typeof cohort?.respondent_count === "number" &&
      cohort.respondent_count >= FLUENCY_MIN_COHORT_SIZE
  );

  return {
    schema_version: RESULT_SCHEMA_VERSION,
    baseline_id: baseline?.baseline_id ?? null,
    org_id: baseline?.org_id ?? null,
    instrument_id: instrumentId,
    collection_mode: baseline?.collection_mode ?? null,
    cohort_count: cohorts.length,
    suppressed_cohort_count: suppressedCount,
    valid,
    gaps,
    feeds: {
      value_chain_context: valid && hasUsableCohort,
      individual_scoring: false,
      team_or_manager_ranking: false,
      customer_facing_economic_output: false
    }
  };
}

/**
 * Aggregate, client-safe summary of a validated baseline for downstream
 * surfaces. Suppressed cohorts appear only as a count; no construct data
 * from them survives.
 */
export function summarizeFluencyBaseline(baseline: any): any {
  const cohorts = (baseline?.cohorts ?? []).filter(
    (cohort: any) => cohort?.suppressed !== true
  );
  const constructTotals: Record<string, { sum: number; weight: number }> = {};
  for (const cohort of cohorts) {
    const weight = cohort.respondent_count;
    for (const [construct, entry] of Object.entries(cohort.construct_scores ?? {})) {
      const mean = (entry as any)?.mean;
      if (typeof mean !== "number") continue;
      constructTotals[construct] = constructTotals[construct] ?? { sum: 0, weight: 0 };
      constructTotals[construct].sum += mean * weight;
      constructTotals[construct].weight += weight;
    }
  }
  const constructMeans = Object.fromEntries(
    Object.entries(constructTotals).map(([construct, { sum, weight }]) => [
      construct,
      weight > 0 ? Math.round((sum / weight) * 100) / 100 : null
    ])
  );
  return {
    schema_version: "FT_AI_VALUE_FLUENCY_BASELINE_SUMMARY_2026_06",
    baseline_id: baseline?.baseline_id ?? null,
    instrument_id: baseline?.instrument?.instrument_id ?? null,
    collection_mode: baseline?.collection_mode ?? null,
    window: baseline?.window ?? null,
    reported_cohorts: cohorts.length,
    suppressed_cohorts: (baseline?.cohorts ?? []).length - cohorts.length,
    total_respondents: cohorts.reduce(
      (sum: number, cohort: any) => sum + (cohort.respondent_count ?? 0),
      0
    ),
    construct_means: constructMeans,
    interpretation:
      "Aggregate kickoff fluency context. Directional only; never used to score or compare individuals or teams."
  };
}
