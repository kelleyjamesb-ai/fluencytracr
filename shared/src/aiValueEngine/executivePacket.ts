/**
 * AI Value Engine — Executive Packet stage.
 *
 * Owns executive validation packet composition, validation, and the
 * markdown rendering used by readout artifacts. Logic migrated verbatim from
 * scripts/generate_ai_value_executive_packet.mjs per the migration contract.
 */

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

const REQUIRED_SECTIONS = [
  "workflow",
  "metrics",
  "scenario",
  "readiness",
  "claim_boundary",
  "next_actions"
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
  packetId?: string;
}

function containsForbiddenClaimLanguage(values: any): boolean {
  return (values ?? []).some((value: any) =>
    FORBIDDEN_CLAIM_PATTERNS.some((pattern) => pattern.test(String(value)))
  );
}

function requireField(value: any, path: string, gaps: string[]): void {
  if (!value) gaps.push(`${path} is missing`);
}

function sectionArray(section: any, path: string, gaps: string[]): void {
  if (!Array.isArray(section) || section.length === 0) {
    gaps.push(`${path} must include at least one item`);
  }
}

export function buildExecutiveValidationPacket({
  blueprint,
  metricsLibrary,
  scenario,
  readiness,
  claimBoundary,
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
      claim_boundary_id: claimBoundary.claim_boundary_id
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
    }
  };
}

export function validateExecutivePacket(packet: any): ExecutivePacketValidationResult {
  const gaps: string[] = [];
  for (const field of [
    "schema_version",
    "packet_id",
    "workflow_family",
    "value_route",
    "decision",
    "claim_state",
    "source_refs",
    "sections"
  ]) {
    requireField(packet?.[field], field, gaps);
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

export function renderExecutiveValidationMarkdown(packet: any): string {
  const metrics = packet.sections.metrics
    .map((metric: any) => `- ${metric.name} (${metric.metric_id}) - ${metric.measurement_unit}`)
    .join("\n");
  const caveats = packet.sections.claim_boundary.required_caveats
    .map((caveat: any) => `- ${caveat}`)
    .join("\n");
  const nextActions = packet.sections.next_actions
    .map((action: any) => `- ${action}`)
    .join("\n");
  return `# Customer Support AI Value Validation Packet

## Decision

${packet.decision}

## Workflow

${packet.workflow_name}

${packet.sections.workflow.hypothesis}

## Metrics

${metrics}

## Scenario

Value route: ${packet.value_route}

Scenario bands are planning ranges only. They are not realized ROI.

## Claim Boundary

Claim state: ${packet.claim_state}

${packet.sections.claim_boundary.safe_claims.map((claim: any) => `- ${claim}`).join("\n")}

## Required Caveats

${caveats}

## Next Actions

${nextActions}
`;
}
