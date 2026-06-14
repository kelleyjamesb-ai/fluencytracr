/**
 * AI Value Engine — Engagement Context stage.
 *
 * Owns the upstream spine objects from AI_VALUE_PLATFORM_ARCHITECTURE.md:
 * Client -> Business Objective -> Workstream -> Use Case. They travel as one
 * composite Engagement object so the platform can trace every downstream
 * blueprint back to the client objective it serves. All stakeholder fields
 * are role labels, never names, emails, or identifiers; the engine rejects
 * person-level content the same way every other stage does.
 */

const RESULT_SCHEMA_VERSION = "FT_AI_VALUE_ENGAGEMENT_VALIDATION_2026_06";

export const ENGAGEMENT_SCHEMA_VERSION = "FT_AI_VALUE_ENGAGEMENT_2026_06";

const ALLOWED_PRIORITY_STATES = new Set([
  "CANDIDATE",
  "PRIORITIZED",
  "PILOT_SELECTED",
  "DEFERRED"
]);

const ALLOWED_MEASURE_DIRECTIONS = new Set(["IMPROVE", "REDUCE", "MAINTAIN"]);

/**
 * Normalizes the objective shape: engagements may carry one
 * `business_objective` (legacy) or a `business_objectives` array. The value
 * review is held against this list, so at least one objective is required.
 */
export function objectivesOf(engagement: any): any[] {
  if (Array.isArray(engagement?.business_objectives)) {
    return engagement.business_objectives;
  }
  if (engagement?.business_objective) {
    return [engagement.business_objective];
  }
  return [];
}

const FORBIDDEN_KEY_PATTERNS = [
  /(^|_)user(_|$)/i,
  /^user[A-Z]/,
  /email/i,
  /employee/i,
  /manager_chain/i,
  /person_id/i,
  /person_level/i,
  /respondent/i,
  /prompt/i,
  /transcript/i,
  /file_content/i,
  /raw_/i,
  /hris/i,
  /(^|_)name(_|$)/i
];

// client_name and cohort-free display labels are legitimate account context.
const FORBIDDEN_KEY_EXCEPTIONS = new Set(["client_name", "name"]);

export interface EngagementValidationResult {
  schema_version: string;
  engagement_id: string | null;
  org_id: string | null;
  client_id: string | null;
  objective_id: string | null;
  objective_count: number;
  use_case_count: number;
  valid: boolean;
  gaps: string[];
  feeds: {
    blueprint_intake: boolean;
    customer_facing_economic_output: boolean;
  };
}

function requireField(input: any, field: string, path: string, gaps: string[]): void {
  if (!input?.[field]) {
    gaps.push(`${path}.${field} is missing`);
  }
}

function requireArray(input: any, field: string, path: string, gaps: string[]): void {
  if (!Array.isArray(input?.[field]) || input[field].length === 0) {
    gaps.push(`${path}.${field} must include at least one entry`);
  }
}

function isForbiddenKey(key: string): boolean {
  if (FORBIDDEN_KEY_EXCEPTIONS.has(key)) {
    return false;
  }
  return FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key));
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

function collectClientGaps(engagement: any): string[] {
  const gaps: string[] = [];
  const client = engagement?.client;
  if (!client) {
    gaps.push("client is missing");
    return gaps;
  }
  for (const field of [
    "client_id",
    "client_name",
    "industry",
    "company_size",
    "executive_sponsor_role",
    "technical_champion_role"
  ]) {
    requireField(client, field, "client", gaps);
  }
  requireArray(client, "strategic_objectives", "client", gaps);
  return gaps;
}

function collectObjectiveGaps(engagement: any): string[] {
  const gaps: string[] = [];
  const objectives = objectivesOf(engagement);
  if (objectives.length === 0) {
    gaps.push("business_objectives must include at least one objective");
    return gaps;
  }
  objectives.forEach((objective: any, index: number) => {
    const path = `business_objectives[${index}]`;
    for (const field of [
      "objective_id",
      "objective_statement",
      "challenge",
      "initiative",
      "positive_business_outcome",
      "decision_timeline",
      "owner_role"
    ]) {
      requireField(objective, field, path, gaps);
    }
    const measures = objective?.success_measures;
    if (measures !== undefined) {
      if (!Array.isArray(measures) || measures.length === 0) {
        gaps.push(`${path}.success_measures must include at least one measure when provided`);
      } else {
        measures.forEach((measure: any, mIndex: number) => {
          if (!measure?.measure) {
            gaps.push(`${path}.success_measures[${mIndex}].measure is missing`);
          }
          if (!ALLOWED_MEASURE_DIRECTIONS.has(measure?.expected_direction)) {
            gaps.push(
              `${path}.success_measures[${mIndex}].expected_direction is invalid: ${measure?.expected_direction}`
            );
          }
        });
      }
    }
  });
  const ids = objectives.map((objective: any) => objective?.objective_id).filter(Boolean);
  if (new Set(ids).size !== ids.length) {
    gaps.push("business_objectives contain duplicate objective ids");
  }
  return gaps;
}

function collectWorkstreamGaps(engagement: any): string[] {
  const gaps: string[] = [];
  const workstream = engagement?.workstream;
  if (!workstream) {
    gaps.push("workstream is missing");
    return gaps;
  }
  for (const field of ["workstream_id", "function", "sponsor_role"]) {
    requireField(workstream, field, "workstream", gaps);
  }
  requireArray(workstream, "role_families", "workstream", gaps);
  requireArray(workstream, "systems_in_scope", "workstream", gaps);
  if (typeof workstream.users_in_scope !== "number" || workstream.users_in_scope <= 0) {
    gaps.push("workstream.users_in_scope must be a positive aggregate count");
  }
  return gaps;
}

function collectUseCaseGaps(engagement: any): string[] {
  const gaps: string[] = [];
  const useCases = engagement?.use_cases;
  if (!Array.isArray(useCases) || useCases.length === 0) {
    gaps.push("use_cases must include at least one use case");
    return gaps;
  }
  useCases.forEach((useCase: any, index: number) => {
    const path = `use_cases[${index}]`;
    for (const field of [
      "use_case_id",
      "name",
      "description",
      "impact_rationale",
      "effort_rationale",
      "priority_state",
      "workflow_family"
    ]) {
      requireField(useCase, field, path, gaps);
    }
    requireArray(useCase, "impacted_functions", path, gaps);
    requireArray(useCase, "data_sources", path, gaps);
    if (useCase?.priority_state &&
        !ALLOWED_PRIORITY_STATES.has(useCase.priority_state)) {
      gaps.push(`${path}.priority_state is invalid: ${useCase.priority_state}`);
    }
  });
  return gaps;
}

function collectUseCaseObjectiveLinkGaps(engagement: any): string[] {
  const gaps: string[] = [];
  const objectiveIds = new Set(
    objectivesOf(engagement).map((objective: any) => objective?.objective_id)
  );
  (engagement?.use_cases ?? []).forEach((useCase: any, index: number) => {
    if (useCase?.objective_id && !objectiveIds.has(useCase.objective_id)) {
      gaps.push(
        `use_cases[${index}].objective_id ${useCase.objective_id} does not match any business objective`
      );
    }
  });
  return gaps;
}

export function validateEngagement(engagement: any): EngagementValidationResult {
  const gaps: string[] = [];
  for (const field of ["schema_version", "engagement_id", "org_id"]) {
    if (!engagement?.[field]) {
      gaps.push(`${field} is missing`);
    }
  }
  if (engagement?.schema_version &&
      engagement.schema_version !== ENGAGEMENT_SCHEMA_VERSION) {
    gaps.push(`schema_version is invalid: ${engagement.schema_version}`);
  }
  gaps.push(...collectClientGaps(engagement));
  gaps.push(...collectObjectiveGaps(engagement));
  gaps.push(...collectWorkstreamGaps(engagement));
  gaps.push(...collectUseCaseGaps(engagement));
  gaps.push(...collectUseCaseObjectiveLinkGaps(engagement));
  for (const field of [...collectForbiddenFields(engagement)].sort()) {
    gaps.push(`Forbidden field detected: ${field}`);
  }

  return {
    schema_version: RESULT_SCHEMA_VERSION,
    engagement_id: engagement?.engagement_id ?? null,
    org_id: engagement?.org_id ?? null,
    client_id: engagement?.client?.client_id ?? null,
    objective_id: objectivesOf(engagement)[0]?.objective_id ?? null,
    objective_count: objectivesOf(engagement).length,
    use_case_count: Array.isArray(engagement?.use_cases)
      ? engagement.use_cases.length
      : 0,
    valid: gaps.length === 0,
    gaps,
    feeds: {
      blueprint_intake: gaps.length === 0,
      customer_facing_economic_output: false
    }
  };
}

/**
 * Confirms a blueprint is actually traceable to the engagement: some use case
 * in the engagement must reference the blueprint's workflow family. This is
 * what keeps the value chain connected from client objective to readout.
 */
export function engagementCoversWorkflowFamily(
  engagement: any,
  workflowFamily: string | null | undefined
): boolean {
  if (!workflowFamily) return false;
  return (engagement?.use_cases ?? []).some(
    (useCase: any) => useCase?.workflow_family === workflowFamily
  );
}
