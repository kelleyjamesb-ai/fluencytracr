/**
 * AI Value Engine — canonical object layer entry point.
 *
 * Single deterministic module owning the AI value object spine:
 * Blueprint -> Metrics Library -> Value Scenario -> Evidence Readiness ->
 * Claim Boundary -> Executive Packet.
 *
 * Contract: docs/concepts/AI_VALUE_ENGINE_CONTRACT.md. The engine is local
 * and deterministic; it owns validation, ordering, and claim governance and
 * does not own storage, APIs, ingestion, or customer-facing surfaces.
 */

export {
  validateBlueprint,
  blueprintToWorkshopResponse,
  blueprintToSupportValueInput,
  BLUEPRINT_ALLOWED_VALUE_ROUTES
} from "./blueprint";
export type { BlueprintValidationResult } from "./blueprint";

export { validateMetricsLibrary, recommendMetricsForBlueprint } from "./metrics";
export type { MetricsLibraryValidationResult } from "./metrics";

export {
  validateValueScenario,
  buildValueScenarioDraftFromBlueprintAndMetrics
} from "./scenario";
export type { ScenarioValidationResult } from "./scenario";

export {
  validateEvidenceReadiness,
  buildEvidenceReadinessFromObjects,
  deriveReadinessDecision
} from "./readiness";
export type { ReadinessValidationResult, BuildReadinessOptions } from "./readiness";

export {
  validateClaimBoundary,
  buildClaimBoundaryFromReadiness
} from "./claimBoundary";
export type {
  ClaimBoundaryValidationResult,
  BuildClaimBoundaryOptions
} from "./claimBoundary";

export {
  buildExecutiveValidationPacket,
  validateExecutivePacket,
  renderExecutiveValidationMarkdown
} from "./executivePacket";
export type {
  ExecutivePacketValidationResult,
  BuildExecutivePacketInputs
} from "./executivePacket";

export { runSpine, SPINE_RESULT_SCHEMA_VERSION } from "./spine";
export type {
  SpineRunInput,
  SpineRunResult,
  SpineStageResult,
  SpineStageStatus
} from "./spine";
