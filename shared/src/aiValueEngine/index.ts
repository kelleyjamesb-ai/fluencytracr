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

export {
  buildBlueprintDraftFromWorkshopIntake,
  WORKSHOP_INTAKE_SCHEMA_VERSION
} from "./intake";
export type { WorkshopIntakeResult } from "./intake";

export {
  validateEngagement,
  engagementCoversWorkflowFamily,
  objectivesOf,
  ENGAGEMENT_SCHEMA_VERSION
} from "./engagement";
export type { EngagementValidationResult } from "./engagement";

export {
  validateFluencyBaseline,
  summarizeFluencyBaseline,
  FLUENCY_BASELINE_SCHEMA_VERSION,
  FLUENCY_MIN_COHORT_SIZE,
  FLUENCY_CONSTRUCTS,
  FLUENCY_INSTRUMENT_IDS
} from "./fluencyBaseline";
export type { FluencyBaselineValidationResult } from "./fluencyBaseline";

export {
  validateOutcomeEvidenceExport,
  applyOutcomeEvidenceReview,
  reviewStateOf,
  OUTCOME_EVIDENCE_EXPORT_SCHEMA_VERSION,
  OUTCOME_EVIDENCE_REVIEW_STATES
} from "./outcomeEvidenceExport";
export type {
  OutcomeEvidenceExportValidationResult,
  OutcomeEvidenceCrossCheckContext
} from "./outcomeEvidenceExport";

export { runValueChain, VALUE_CHAIN_RESULT_SCHEMA_VERSION } from "./valueChain";
export type { ValueChainRunInput, ValueChainRunResult } from "./valueChain";

export { runSpine, SPINE_RESULT_SCHEMA_VERSION } from "./spine";
export type {
  SpineRunInput,
  SpineRunResult,
  SpineStageResult,
  SpineStageStatus
} from "./spine";

export { renderExecutiveReadoutHtml } from "./readoutHtml";
export type { RenderExecutiveReadoutInputs } from "./readoutHtml";
