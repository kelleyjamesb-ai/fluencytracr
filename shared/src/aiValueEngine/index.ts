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
  validateRoiScenario,
  buildRoiScenarioFromValueObjects,
  ROI_SCENARIO_SCHEMA_VERSION
} from "./roiScenario";
export type {
  RoiScenarioValidationResult,
  BuildRoiScenarioInputs
} from "./roiScenario";

export {
  validateEbitaBridge,
  buildEbitaBridgeFromValueObjects,
  EBITA_BRIDGE_SCHEMA_VERSION
} from "./ebitaBridge";
export type {
  EbitaBridgeValidationResult,
  BuildEbitaBridgeInputs
} from "./ebitaBridge";

export {
  validateValueImprovementLoop,
  buildValueImprovementLoopFromRoiScenario,
  VALUE_IMPROVEMENT_LOOP_SCHEMA_VERSION
} from "./valueImprovement";
export type {
  ValueImprovementLoopValidationResult,
  BuildValueImprovementLoopOptions
} from "./valueImprovement";

export {
  validateDataBoundaryContract,
  DATA_BOUNDARY_SCHEMA_VERSION
} from "./dataBoundary";
export type { DataBoundaryValidationResult } from "./dataBoundary";

export {
  validateValueEvidenceCase,
  buildValueEvidenceCase,
  VALUE_EVIDENCE_CASE_SCHEMA_VERSION
} from "./valueEvidenceCase";
export type {
  ValueEvidenceCaseValidationResult,
  BuildValueEvidenceCaseInputs,
  BuildValueEvidenceCaseOptions
} from "./valueEvidenceCase";

export {
  validateEvidenceSnapshot,
  buildTelemetryEvidenceSnapshotDraft,
  EVIDENCE_SNAPSHOT_SCHEMA_VERSION
} from "./evidenceSnapshot";
export type {
  EvidenceSnapshotValidationResult,
  BuildTelemetryEvidenceSnapshotInputs
} from "./evidenceSnapshot";

export {
  AI_VALUE_CLAIM_READINESS_HANDOFF_SCHEMA_VERSION,
  ClaimReadinessHandoffSchema,
  buildClaimReadinessHandoffFromEvidenceSnapshot,
  translateSnapshotBlockedUsesToBlockedClaims,
  validateClaimReadinessHandoff
} from "./claimReadinessHandoff";
export type {
  BuildClaimReadinessHandoffOptions,
  ClaimReadinessHandoff,
  ClaimReadinessHandoffValidationResult
} from "./claimReadinessHandoff";

export {
  AI_VALUE_CLAIM_READINESS_SNAPSHOT_SCHEMA_VERSION,
  ClaimReadinessSnapshotSchema,
  buildClaimReadinessSnapshotFromEvidenceSnapshotAndHandoff,
  validateClaimReadinessSnapshot
} from "./claimReadinessSnapshot";
export type {
  BuildClaimReadinessSnapshotOptions,
  ClaimReadinessSnapshot,
  ClaimReadinessSnapshotValidationResult
} from "./claimReadinessSnapshot";

export {
  AI_VALUE_EXECUTIVE_READOUT_SNAPSHOT_SCHEMA_VERSION,
  ExecutiveReadoutSnapshotSchema,
  buildExecutiveReadoutSnapshotFromClaimReadinessSnapshot,
  validateExecutiveReadoutSnapshot
} from "./executiveReadoutSnapshot";
export type {
  BuildExecutiveReadoutSnapshotOptions,
  ExecutiveReadoutSnapshot,
  ExecutiveReadoutSnapshotValidationResult
} from "./executiveReadoutSnapshot";

export {
  AI_VALUE_SOURCE_PACKAGE_SCHEMA_VERSION,
  SourcePackageSchema,
  validateSourcePackage
} from "./sourcePackages";
export type {
  SourcePackage,
  SourcePackageValidationResult
} from "./sourcePackages";

export {
  SCRUBBED_GLEAN_CLIENT_EXPORT_SCHEMA_VERSION,
  convertScrubbedGleanClientExportToEvidenceInputs,
  validateScrubbedGleanClientExport
} from "./scrubbedGleanClientExportConverter";
export type {
  ConvertScrubbedGleanClientExportOptions,
  ScrubbedGleanClientExportConversionResult
} from "./scrubbedGleanClientExportConverter";

export {
  AI_VALUE_PILOT_INTAKE_RUN_SCHEMA_VERSION,
  buildAiValuePilotIntakeRunFromScrubbedGleanExports,
  validateAiValuePilotIntakeRun
} from "./aiValuePilotIntakeRunner";
export type {
  AiValuePilotIntakeRun,
  AiValuePilotIntakeRunValidationResult,
  BuildAiValuePilotIntakeRunInput
} from "./aiValuePilotIntakeRunner";

export {
  AI_VALUE_TOKEN_EFFICIENCY_SIGNAL_SCHEMA_VERSION,
  TokenEfficiencySignalSchema,
  buildTokenEfficiencySignalFromAggregateSummary,
  validateTokenEfficiencySignal
} from "./tokenEfficiencySignal";
export type {
  AggregateTokenEfficiencySummary,
  BuildTokenEfficiencySignalOptions,
  TokenEfficiencySignalValidationResult
} from "./tokenEfficiencySignal";

export {
  AI_VALUE_VBD_TOKEN_EFFICIENCY_MAP_SCHEMA_VERSION,
  buildVbdTokenEfficiencyMapFromEvidenceSnapshotAndTokenSignal,
  validateVbdTokenEfficiencyMap
} from "./vbdTokenEfficiencyMap";
export type {
  BuildVbdTokenEfficiencyMapOptions,
  VbdTokenEfficiencyMapValidationResult
} from "./vbdTokenEfficiencyMap";

export {
  EVIDENCE_COLLECTION_ASSEMBLY_SCHEMA_VERSION,
  EvidenceCollectionAssemblySchema,
  buildEvidenceSnapshotInputFromMeasurementPlanAndSourcePackages,
  validateEvidenceCollectionAssembly
} from "./evidenceCollectionAssembler";
export type {
  BuildEvidenceCollectionAssemblyOptions,
  EvidenceCollectionAssembly,
  EvidenceCollectionAssemblyValidationResult
} from "./evidenceCollectionAssembler";

export {
  validateMeasurementPlan,
  buildPlaybookMeasurementPlanDraft,
  MEASUREMENT_PLAN_SCHEMA_VERSION
} from "./measurementPlan";
export type {
  MeasurementPlanValidationResult,
  BuildPlaybookMeasurementPlanInputs
} from "./measurementPlan";

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
  BuildExecutivePacketInputs,
  ExecutiveEbitaImpactSummary
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
  AI_VALUE_CUSTOMER_JOURNEY_SCHEMA_VERSION,
  CustomerJourneySchema,
  buildInitialCustomerJourney,
  validateCustomerJourney
} from "./customerJourney";
export type {
  BuildInitialCustomerJourneyInputs,
  CustomerJourney,
  CustomerJourneyStage,
  CustomerJourneyValidationResult
} from "./customerJourney";

export {
  AI_VALUE_CLIENT_EVIDENCE_REQUEST_SCHEMA_VERSION,
  ClientEvidenceRequestSchema,
  buildClientEvidenceRequestsFromEvidenceSnapshot,
  buildClientEvidenceRequestsFromMeasurementPlan,
  validateClientEvidenceRequest
} from "./clientEvidenceRequest";
export type {
  BuildClientEvidenceRequestOptions,
  ClientEvidenceRequest,
  ClientEvidenceRequestValidationResult
} from "./clientEvidenceRequest";

export {
  AI_VALUE_CLIENT_EVIDENCE_ENTRY_SCHEMA_VERSION,
  ClientEvidenceEntrySchema,
  buildSourcePackageFromClientEvidenceEntry,
  validateClientEvidenceEntry
} from "./clientEvidenceEntry";
export type {
  BuildSourcePackageFromClientEvidenceEntryOptions,
  ClientEvidenceEntry,
  ClientEvidenceEntryValidationResult
} from "./clientEvidenceEntry";

export {
  AI_VALUE_AI_FLUENCY_INTAKE_BRIDGE_SCHEMA_VERSION,
  AIFluencyIntakeBridgeSchema,
  buildEvidenceGapReviewFromMeasurementPlanAndSnapshot,
  buildMeasurementPlanDraftFromAIFluencyIntake,
  validateAIFluencyIntakeBridge
} from "./aiFluencyIntakeBridge";
export type {
  AIFluencyIntakeBridge,
  AIFluencyIntakeBridgeBuildInputs,
  AIFluencyIntakeBridgeValidationResult,
  BuildEvidenceGapReviewOptions,
  EvidenceGapReview
} from "./aiFluencyIntakeBridge";

export {
  AI_VALUE_POST_SALES_WORKFLOW_ORCHESTRATOR_SCHEMA_VERSION,
  PostSalesWorkflowOrchestratorSchema,
  buildPostSalesWorkflowOrchestrator,
  validatePostSalesWorkflowOrchestrator
} from "./postSalesWorkflowOrchestrator";
export type {
  ClientEvidenceEntryReview,
  PostSalesWorkflowOrchestrator,
  PostSalesWorkflowOrchestratorBuildInputs,
  PostSalesWorkflowOrchestratorValidationResult,
  PostSalesWorkflowPhase
} from "./postSalesWorkflowOrchestrator";

export {
  AI_VALUE_CUSTOMER_EXPOSURE_POLICY_SCHEMA_VERSION,
  CustomerExposurePolicySchema,
  buildCustomerExposurePolicyFromPostSalesWorkflow,
  validateCustomerExposurePolicy
} from "./customerExposurePolicy";
export type {
  BuildCustomerExposurePolicyOptions,
  CustomerExposureDecision,
  CustomerExposurePolicy,
  CustomerExposurePolicyValidationResult
} from "./customerExposurePolicy";

export {
  buildSupportPilotGleanReadinessMapFromRuntimeEvidence
} from "./supportPilotGleanReadinessAdapter";
export type {
  BuildSupportPilotGleanReadinessMapInput
} from "./supportPilotGleanReadinessAdapter";

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

export {
  AI_VALUE_LANGUAGE_SYSTEM_VERSION,
  AI_VALUE_EXECUTIVE_CONCEPT_HIERARCHY,
  AI_VALUE_EVIDENCE_LANGUAGE,
  getAiValueDisplayLabel,
  getAiValueDisplayLabels
} from "./language";
