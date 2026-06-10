/**
 * AI Value Engine — spine runner.
 *
 * Delegates to the per-stage engine entries in contract order and preserves
 * every fail-closed gate (AI_VALUE_ENGINE_CONTRACT.md): downstream objects
 * are never generated from unvalidated upstream objects, and a missing,
 * invalid, blocked, or held upstream stage produces an explicit held result
 * instead of silently proceeding.
 */

import {
  validateBlueprint,
  BlueprintValidationResult
} from "./blueprint";
import {
  validateMetricsLibrary,
  recommendMetricsForBlueprint,
  MetricsLibraryValidationResult
} from "./metrics";
import {
  validateValueScenario,
  buildValueScenarioDraftFromBlueprintAndMetrics,
  ScenarioValidationResult
} from "./scenario";
import {
  validateEvidenceReadiness,
  buildEvidenceReadinessFromObjects,
  ReadinessValidationResult
} from "./readiness";
import {
  validateClaimBoundary,
  buildClaimBoundaryFromReadiness,
  ClaimBoundaryValidationResult
} from "./claimBoundary";
import {
  buildExecutiveValidationPacket,
  validateExecutivePacket,
  ExecutivePacketValidationResult
} from "./executivePacket";

export const SPINE_RESULT_SCHEMA_VERSION = "FT_AI_VALUE_SPINE_RUN_2026_06";

export type SpineStageStatus = "VALID" | "INVALID" | "HELD" | "NOT_RUN";

export interface SpineStageResult<TValidation = any> {
  status: SpineStageStatus;
  validation: TValidation | null;
  object: any | null;
  generated: boolean;
  hold_reason: string | null;
}

export interface SpineRunInput {
  blueprint: any;
  metricsLibrary: any;
  /** Optional pre-existing scenario; a governed draft is derived when absent. */
  scenario?: any;
  /** Optional id overrides so the spine stays domain-agnostic. */
  ids?: {
    readinessId?: string;
    claimBoundaryId?: string;
    packetId?: string;
  };
}

export interface SpineRunResult {
  schema_version: string;
  decision: string;
  halted_at: string | null;
  customer_facing_economic_output: false;
  stages: {
    blueprint: SpineStageResult<BlueprintValidationResult>;
    metrics: SpineStageResult<MetricsLibraryValidationResult>;
    scenario: SpineStageResult<ScenarioValidationResult>;
    readiness: SpineStageResult<ReadinessValidationResult>;
    claim_boundary: SpineStageResult<ClaimBoundaryValidationResult>;
    executive_packet: SpineStageResult<ExecutivePacketValidationResult>;
  };
}

function notRun(): SpineStageResult {
  return { status: "NOT_RUN", validation: null, object: null, generated: false, hold_reason: null };
}

export function runSpine(input: SpineRunInput): SpineRunResult {
  const stages: SpineRunResult["stages"] = {
    blueprint: notRun(),
    metrics: notRun(),
    scenario: notRun(),
    readiness: notRun(),
    claim_boundary: notRun(),
    executive_packet: notRun()
  };

  const halted = (haltedAt: string, decision: string): SpineRunResult => ({
    schema_version: SPINE_RESULT_SCHEMA_VERSION,
    decision,
    halted_at: haltedAt,
    customer_facing_economic_output: false,
    stages
  });

  // Stage 1: Workflow Blueprint.
  const blueprintValidation = validateBlueprint(input.blueprint);
  stages.blueprint = {
    status: blueprintValidation.valid ? "VALID" : "INVALID",
    validation: blueprintValidation,
    object: input.blueprint ?? null,
    generated: false,
    hold_reason: blueprintValidation.valid ? null : "blueprint validation gaps"
  };
  if (!blueprintValidation.valid) {
    return halted("blueprint", "HOLD_FOR_BLUEPRINT");
  }

  // Stage 2: Metrics Library + recommendation gate.
  const metricsValidation = validateMetricsLibrary(input.metricsLibrary);
  const recommendation = recommendMetricsForBlueprint(
    input.blueprint,
    input.metricsLibrary
  );
  const metricsReady = metricsValidation.valid && recommendation.feeds.metrics_mapping;
  stages.metrics = {
    status: metricsValidation.valid ? (metricsReady ? "VALID" : "HELD") : "INVALID",
    validation: metricsValidation,
    object: input.metricsLibrary ?? null,
    generated: false,
    hold_reason: metricsReady
      ? null
      : metricsValidation.valid
        ? "no recommended metrics map to the blueprint value routes"
        : "metrics library validation gaps"
  };
  if (!metricsReady) {
    return halted("metrics", "HOLD_FOR_METRIC_MAPPING");
  }

  // Stage 3: Value Scenario (provided or derived from validated upstream).
  const scenarioObject =
    input.scenario ??
    buildValueScenarioDraftFromBlueprintAndMetrics(input.blueprint, input.metricsLibrary);
  const scenarioValidation = validateValueScenario(scenarioObject);
  stages.scenario = {
    status: scenarioValidation.valid ? "VALID" : "INVALID",
    validation: scenarioValidation,
    object: scenarioObject,
    generated: !input.scenario,
    hold_reason: scenarioValidation.valid ? null : "scenario validation gaps"
  };
  if (!scenarioValidation.valid) {
    return halted("scenario", "HOLD_FOR_SCENARIO");
  }

  // Stage 4: Evidence Readiness (always derived from validated objects).
  const readinessObject = buildEvidenceReadinessFromObjects(
    input.blueprint,
    input.metricsLibrary,
    scenarioObject,
    { readinessId: input.ids?.readinessId }
  );
  const readinessValidation = validateEvidenceReadiness(readinessObject);
  stages.readiness = {
    status: readinessValidation.valid ? "VALID" : "INVALID",
    validation: readinessValidation,
    object: readinessObject,
    generated: true,
    hold_reason: readinessValidation.valid ? null : "readiness validation gaps"
  };
  if (!readinessValidation.valid) {
    return halted("readiness", "STOP_FOR_GOVERNANCE_REVIEW");
  }
  if (!readinessValidation.feeds.claim_boundary) {
    stages.claim_boundary = {
      status: "HELD",
      validation: null,
      object: null,
      generated: false,
      hold_reason: `readiness decision ${readinessObject.decision} blocks claim boundary`
    };
    return halted("claim_boundary", readinessObject.decision);
  }

  // Stage 5: Claim Boundary.
  const claimBoundaryObject = buildClaimBoundaryFromReadiness(readinessObject, {
    claimBoundaryId: input.ids?.claimBoundaryId
  });
  const claimBoundaryValidation = validateClaimBoundary(claimBoundaryObject);
  stages.claim_boundary = {
    status: claimBoundaryValidation.valid ? "VALID" : "INVALID",
    validation: claimBoundaryValidation,
    object: claimBoundaryObject,
    generated: true,
    hold_reason: claimBoundaryValidation.valid ? null : "claim boundary validation gaps"
  };
  if (!claimBoundaryValidation.valid) {
    return halted("claim_boundary", "STOP_FOR_GOVERNANCE_REVIEW");
  }
  if (!claimBoundaryValidation.feeds.executive_packet) {
    stages.executive_packet = {
      status: "HELD",
      validation: null,
      object: null,
      generated: false,
      hold_reason: `claim state ${claimBoundaryObject.claim_state} blocks executive packet`
    };
    return halted("executive_packet", "STOP_FOR_GOVERNANCE_REVIEW");
  }

  // Stage 6: Executive Packet.
  const packet = buildExecutiveValidationPacket({
    blueprint: input.blueprint,
    metricsLibrary: input.metricsLibrary,
    scenario: scenarioObject,
    readiness: readinessObject,
    claimBoundary: claimBoundaryObject,
    packetId: input.ids?.packetId
  });
  const packetValidation = validateExecutivePacket(packet);
  stages.executive_packet = {
    status: packetValidation.valid ? "VALID" : "INVALID",
    validation: packetValidation,
    object: packet,
    generated: true,
    hold_reason: packetValidation.valid ? null : "executive packet validation gaps"
  };
  if (!packetValidation.valid) {
    return halted("executive_packet", "STOP_FOR_GOVERNANCE_REVIEW");
  }

  return {
    schema_version: SPINE_RESULT_SCHEMA_VERSION,
    decision: readinessObject.decision,
    halted_at: null,
    customer_facing_economic_output: false,
    stages
  };
}
