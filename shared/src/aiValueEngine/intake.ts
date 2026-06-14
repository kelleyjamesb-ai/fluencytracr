/**
 * AI Value Engine — workshop intake adapter.
 *
 * Deterministically converts a structured Day-in-the-Life workshop capture
 * into a Workflow Blueprint draft. This is not artifact ingestion: the input
 * is an already-structured, aggregate-only object (typically captured during
 * a Blueprint workshop), and the produced draft must still pass
 * validateBlueprint before any downstream stage may run. Governance fields
 * (blocked claims, governance boundaries) are attached by the engine and can
 * never be relaxed by intake content.
 */

import { validateBlueprint, BlueprintValidationResult } from "./blueprint";

export const WORKSHOP_INTAKE_SCHEMA_VERSION = "FT_AI_VALUE_WORKSHOP_INTAKE_2026_06";

const BLUEPRINT_SCHEMA_VERSION = "FT_AI_VALUE_BLUEPRINT_2026_06";

const REQUIRED_BLOCKED_CLAIMS = [
  "roi_proof",
  "causality_claim",
  "individual_scoring",
  "team_or_manager_ranking",
  "hr_analytics",
  "dashboard_or_runtime_implementation"
];

const GOVERNANCE_BOUNDARIES = {
  requires_raw_data: false,
  requires_hr_analytics: false,
  requires_roi_calculation: false,
  requires_causality_claim: false,
  requires_individual_scoring: false,
  requires_dashboard: false,
  requires_runtime_service: false
};

export interface WorkshopIntakeResult {
  schema_version: string;
  intake_id: string | null;
  intake_gaps: string[];
  blueprint: any | null;
  blueprint_validation: BlueprintValidationResult | null;
}

const RESULT_SCHEMA_VERSION = "FT_AI_VALUE_WORKSHOP_INTAKE_RESULT_2026_06";

function requireField(input: any, field: string, gaps: string[]): void {
  if (!input?.[field]) {
    gaps.push(`${field} is missing`);
  }
}

function collectIntakeGaps(intake: any): string[] {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "intake_id",
    "org_id",
    "workflow_family",
    "workflow_name",
    "business_owner",
    "value_hypothesis",
    "value_routes",
    "windows",
    "source_coverage",
    "approved_aggregate_inputs",
    "assumptions"
  ]) {
    requireField(intake, field, gaps);
  }
  if (intake?.schema_version &&
      intake.schema_version !== WORKSHOP_INTAKE_SCHEMA_VERSION) {
    gaps.push(`schema_version is invalid: ${intake.schema_version}`);
  }
  if (!Array.isArray(intake?.current_state_steps) ||
      intake.current_state_steps.length === 0) {
    gaps.push("current_state_steps must include at least one step");
  }
  if (!Array.isArray(intake?.future_state_steps) ||
      intake.future_state_steps.length === 0) {
    gaps.push("future_state_steps must include at least one step");
  }
  if (!Array.isArray(intake?.assumptions)) {
    gaps.push("assumptions must be an array");
  }
  return gaps;
}

/**
 * Builds a Blueprint draft from a structured workshop intake and validates
 * it through the Blueprint stage. Fail closed: an intake with gaps produces
 * no blueprint, and a structurally complete intake still only "feeds"
 * downstream stages if the produced blueprint passes validateBlueprint.
 */
export function buildBlueprintDraftFromWorkshopIntake(intake: any): WorkshopIntakeResult {
  const intakeGaps = collectIntakeGaps(intake);
  if (intakeGaps.length > 0) {
    return {
      schema_version: RESULT_SCHEMA_VERSION,
      intake_id: intake?.intake_id ?? null,
      intake_gaps: intakeGaps,
      blueprint: null,
      blueprint_validation: null
    };
  }

  const blueprint = {
    schema_version: BLUEPRINT_SCHEMA_VERSION,
    blueprint_id: `bp_${intake.workflow_family}`,
    org_id: intake.org_id,
    workflow_family: intake.workflow_family,
    workflow_name: intake.workflow_name,
    business_owner: intake.business_owner,
    process_discovery: {
      client_question: intake.client_question ?? null,
      current_state_steps: intake.current_state_steps,
      future_state_steps: intake.future_state_steps,
      friction_points: intake.friction_points ?? [],
      expected_work_change: intake.expected_work_change ?? null
    },
    value_hypothesis: intake.value_hypothesis,
    value_routes: intake.value_routes,
    windows: intake.windows,
    source_requirements: {
      source_coverage: intake.source_coverage,
      approved_aggregate_inputs: intake.approved_aggregate_inputs
    },
    assumption_ledger: intake.assumptions,
    // Governance is engine-owned: intake content can never relax it.
    blocked_claims: REQUIRED_BLOCKED_CLAIMS,
    governance_boundaries: { ...GOVERNANCE_BOUNDARIES }
  };

  const blueprintValidation = validateBlueprint(blueprint);
  return {
    schema_version: RESULT_SCHEMA_VERSION,
    intake_id: intake.intake_id,
    intake_gaps: [],
    blueprint,
    blueprint_validation: blueprintValidation
  };
}
