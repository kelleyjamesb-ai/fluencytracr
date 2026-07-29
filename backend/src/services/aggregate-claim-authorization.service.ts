import {
  aiValueEngine,
  outcomeEvidenceAdmissionReceiptsMatch,
  type ExactCohortSlice
} from "@fluencytracr/shared";

import {
  acceptedReadinessBoundOutcomeEvidence,
  authoritativeOutcomeEvidenceReceipt,
  authoritativeReadinessOutcomeEvidenceReceipt,
  exactOutcomeEvidenceSliceSegment
} from "../outcome_evidence_admission_authority";
import {
  canonicalIdentityRuntimeCredentialIsReady,
  canonicalIdentityRuntimeTargetsPrimaryDatabase,
  getCanonicalIdentityRuntimePrisma
} from "../canonical-identity-runtime-client";
import { checkCanonicalIdentityFamilyHeadStructureReadiness } from "../canonical-identity-family-head-structure";
import { getPrisma } from "../db";
import {
  aiValueObjectSemanticHash,
  aiValueObjectUsesPrisma,
  getAiValueObject,
  listAiValueObjects,
  readAiValueClaimBundle,
  readAiValueObjectSet,
  sealAiValueClaimBundleSerializable,
  type AiValueObjectRef
} from "../repositories/ai-value-object.repository";
import {
  loadCanonicalIdentityExactSources,
  type CanonicalIdentityExactSources
} from "../repositories/canonical-identity-source.repository";
import {
  readOutcomeComparisonPrivacyRelease,
  type OutcomeComparisonPrivacyReleaseResult
} from "../repositories/outcome-comparison-privacy.repository";
import {
  canonicalArtifactBundleAttestationPayload,
  canonicalHypothesisAttestationPayload,
  canonicalMeasurementCellAttestationPayload,
  canonicalPlanEdgeAttestationPayload,
  createSliceEAttestation,
  verifySliceEAttestation
} from "./canonical-identity-attestation.service";
import type { AiValueObjectStoredRecord } from "../store";

type ComparisonReader = (
  receipt: unknown,
  expectedSlice: ExactCohortSlice
) => Promise<OutcomeComparisonPrivacyReleaseResult>;

export interface AggregateClaimAuthorizationRequest {
  orgId: string;
  blueprintId?: string;
  metricsLibraryId?: string;
  scenarioId?: string;
  outcomeEvidenceExportId?: string;
  outcomeEvidenceReadinessId?: string;
  comparisonPrivacyReceipt?: unknown;
  canonicalIdentitySelector?: aiValueEngine.CanonicalIdentitySelector;
  canonicalIdentitySelectorInvalid?: boolean;
  persist: boolean;
}

export interface AggregateClaimReadout {
  html: string;
  canonicalIdentityState: aiValueEngine.CanonicalIdentityState;
  sourceBound: boolean;
}

interface AuthoritativeSourceGraph {
  exportRecord: AiValueObjectStoredRecord;
  readinessRecord: AiValueObjectStoredRecord;
  blueprintRecord: AiValueObjectStoredRecord;
  metricsLibraryRecord: AiValueObjectStoredRecord;
  scenarioRecord: AiValueObjectStoredRecord;
  sourceGraphSeal: aiValueEngine.AggregateClaimSourceGraphSeal;
  expectedSlice: ExactCohortSlice;
}

interface CanonicalIdentityAuthority {
  sources: CanonicalIdentityExactSources;
  sliceBinding: aiValueEngine.CanonicalSliceBindingV1;
  core: aiValueEngine.CanonicalIdentityCore;
  coreCommitment: string;
}

const held = () => aiValueEngine.aggregateClaimFixedHeldResponse();

const objectRef = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const stringRef = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const deepEqual = (left: unknown, right: unknown): boolean =>
  aiValueEngine.aggregateClaimHash("FT_AGGREGATE_CLAIM_EXACT_COMPARE_V1", left) ===
  aiValueEngine.aggregateClaimHash("FT_AGGREGATE_CLAIM_EXACT_COMPARE_V1", right);

const exactHash = (domain: string, value: unknown): string =>
  aiValueEngine.aggregateClaimHash(domain, value);

const windowToken = (start: unknown, end: unknown): string | null => {
  if (typeof start !== "string" || typeof end !== "string") return null;
  const canonicalMidnight = /^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/;
  if (!canonicalMidnight.test(start) || !canonicalMidnight.test(end)) {
    return null;
  }
  return `${start.slice(0, 10)}_to_${end.slice(0, 10)}`;
};

const exactSourceRefs = (graph: AuthoritativeSourceGraph): AiValueObjectRef[] => [
  {
    objectType: "outcome_evidence_export",
    objectId: graph.exportRecord.object_id
  },
  {
    objectType: "evidence_readiness",
    objectId: graph.readinessRecord.object_id
  },
  {
    objectType: "blueprint",
    objectId: graph.blueprintRecord.object_id
  },
  {
    objectType: "metrics_library",
    objectId: graph.metricsLibraryRecord.object_id
  },
  {
    objectType: "value_scenario",
    objectId: graph.scenarioRecord.object_id
  }
];

const sourceRecords = (graph: AuthoritativeSourceGraph): AiValueObjectStoredRecord[] => [
  graph.exportRecord,
  graph.readinessRecord,
  graph.blueprintRecord,
  graph.metricsLibraryRecord,
  graph.scenarioRecord
];

const sourceSetMatches = (
  expected: ReadonlyArray<AiValueObjectStoredRecord>,
  actual: ReadonlyArray<AiValueObjectStoredRecord>
): boolean => {
  const byKey = new Map(
    actual.map((record) => [
      `${record.object_type}:${record.object_id}`,
      aiValueObjectSemanticHash(record)
    ])
  );
  return expected.every(
    (record) =>
      byKey.get(`${record.object_type}:${record.object_id}`) === aiValueObjectSemanticHash(record)
  );
};

const readinessByCommitment = async (
  orgId: string,
  readinessRefCommitment: string,
  readinessHash: string
): Promise<AiValueObjectStoredRecord | null> => {
  const matches = (await listAiValueObjects(orgId, "evidence_readiness")).filter(
    (record) => {
      const semanticHash = aiValueObjectSemanticHash(record);
      return (
        semanticHash === readinessHash &&
        aiValueEngine.aggregateClaimSourceRefCommitment(
          "evidence_readiness",
          record.object_id,
          semanticHash
        ) === readinessRefCommitment
      );
    }
  );
  return matches.length === 1 ? matches[0] : null;
};

export const resolveAuthoritativeSourceGraph = async (
  request: AggregateClaimAuthorizationRequest
): Promise<AuthoritativeSourceGraph | null> => {
  if (!request.outcomeEvidenceExportId || !request.outcomeEvidenceReadinessId) {
    return null;
  }
  const [exportRecord, readinessRecord] = await Promise.all([
    getAiValueObject(request.orgId, "outcome_evidence_export", request.outcomeEvidenceExportId),
    getAiValueObject(request.orgId, "evidence_readiness", request.outcomeEvidenceReadinessId)
  ]);
  if (
    !exportRecord ||
    !readinessRecord ||
    !acceptedReadinessBoundOutcomeEvidence(readinessRecord, exportRecord)
  ) {
    return null;
  }
  const admission = authoritativeOutcomeEvidenceReceipt(exportRecord);
  const readinessAdmission = authoritativeReadinessOutcomeEvidenceReceipt(readinessRecord);
  if (
    !admission ||
    !readinessAdmission ||
    !outcomeEvidenceAdmissionReceiptsMatch(admission, readinessAdmission)
  ) {
    return null;
  }
  const baselineToken = windowToken(
    admission.baseline_window.period_start,
    admission.baseline_window.period_end
  );
  const comparisonToken = windowToken(
    admission.comparison_window.period_start,
    admission.comparison_window.period_end
  );
  if (!baselineToken || !comparisonToken) return null;
  const segment = exactOutcomeEvidenceSliceSegment({
    workflowId: admission.workflow_id,
    jbtdId: admission.jbtd_id,
    personaId: admission.persona_id,
    baselineWindow: baselineToken,
    comparisonWindow: comparisonToken
  });
  if (
    exportRecord.object_id !== `outcome_export_${segment}_real_evidence_v1` ||
    readinessRecord.object_id !== `readiness_${segment}_real_evidence_v1` ||
    readinessRecord.validation.source_graph_authoritative !== true
  ) {
    return null;
  }
  const seal = aiValueEngine.AggregateClaimSourceGraphSealSchema.safeParse(
    readinessRecord.validation.aggregate_claim_source_graph
  );
  const readinessRefs = objectRef(readinessRecord.payload.source_refs);
  if (!seal.success || !readinessRefs) return null;
  const blueprintId = stringRef(readinessRefs.blueprint_id);
  const metricsLibraryId = stringRef(readinessRefs.metrics_library_id);
  const scenarioId = stringRef(readinessRefs.scenario_id);
  if (
    !blueprintId ||
    !metricsLibraryId ||
    !scenarioId ||
    seal.data.outcome_evidence_export_id !== exportRecord.object_id ||
    seal.data.blueprint_id !== blueprintId ||
    seal.data.metrics_library_id !== metricsLibraryId ||
    seal.data.scenario_id !== scenarioId ||
    (request.blueprintId !== undefined && request.blueprintId !== blueprintId) ||
    (request.metricsLibraryId !== undefined && request.metricsLibraryId !== metricsLibraryId) ||
    (request.scenarioId !== undefined && request.scenarioId !== scenarioId)
  ) {
    return null;
  }
  const records = await readAiValueObjectSet(request.orgId, [
    { objectType: "blueprint", objectId: blueprintId },
    { objectType: "metrics_library", objectId: metricsLibraryId },
    { objectType: "value_scenario", objectId: scenarioId }
  ]);
  if (!records) return null;
  const blueprintRecord = records.find((record) => record.object_type === "blueprint");
  const metricsLibraryRecord = records.find((record) => record.object_type === "metrics_library");
  const scenarioRecord = records.find((record) => record.object_type === "value_scenario");
  if (!blueprintRecord || !metricsLibraryRecord || !scenarioRecord) {
    return null;
  }
  const exportValidation = aiValueEngine.validateOutcomeEvidenceExport(exportRecord.payload, {
    blueprint: blueprintRecord.payload,
    metricsLibrary: metricsLibraryRecord.payload
  });
  const readinessValidation = aiValueEngine.validateEvidenceReadiness(readinessRecord.payload);
  if (
    !aiValueEngine.validateBlueprint(blueprintRecord.payload).valid ||
    !aiValueEngine.validateMetricsLibrary(metricsLibraryRecord.payload).valid ||
    !aiValueEngine.validateValueScenario(scenarioRecord.payload).valid ||
    !readinessValidation.valid ||
    !readinessValidation.feeds.claim_boundary ||
    !exportValidation.valid ||
    exportValidation.review_state !== "ACCEPTED" ||
    exportValidation.cross_check_gaps.length > 0 ||
    !aiValueEngine.aggregateClaimSourceGraphMatches(seal.data, {
      outcomeEvidenceExport: exportRecord.payload,
      blueprint: blueprintRecord.payload,
      metricsLibrary: metricsLibraryRecord.payload,
      scenario: scenarioRecord.payload
    })
  ) {
    return null;
  }
  return {
    exportRecord,
    readinessRecord,
    blueprintRecord,
    metricsLibraryRecord,
    scenarioRecord,
    sourceGraphSeal: seal.data,
    expectedSlice: {
      org_id: request.orgId,
      workflow_id: admission.workflow_id,
      jbtd_id: admission.jbtd_id,
      persona_id: admission.persona_id
    }
  };
};

const comparisonMatchesGraph = (
  graph: AuthoritativeSourceGraph,
  comparison: Exclude<OutcomeComparisonPrivacyReleaseResult, { decision: "HOLD" }>
): boolean => {
  const exportPayload = graph.exportRecord.payload;
  const admission = authoritativeOutcomeEvidenceReceipt(graph.exportRecord);
  const metrics = exportPayload.metrics;
  const sourceSystem = objectRef(exportPayload.source_system);
  const projection = comparison.projection;
  if (!admission || !Array.isArray(metrics) || metrics.length !== 1 || !sourceSystem) {
    return false;
  }
  const metric = objectRef(metrics[0]);
  if (!metric) return false;
  const baselineEvidenceIds = admission.baseline_window.evidence_ids;
  const comparisonEvidenceIds = admission.comparison_window.evidence_ids;
  return (
    projection.org_id === graph.expectedSlice.org_id &&
    projection.workflow_id === graph.expectedSlice.workflow_id &&
    projection.jbtd_id === graph.expectedSlice.jbtd_id &&
    projection.persona_id === graph.expectedSlice.persona_id &&
    projection.outcome_metric === metric.metric_id &&
    projection.outcome_unit === metric.measurement_unit &&
    projection.source_system === sourceSystem.source_name &&
    projection.baseline_window.period_start === admission.baseline_window.period_start &&
    projection.baseline_window.period_end === admission.baseline_window.period_end &&
    projection.comparison_window.period_start === admission.comparison_window.period_start &&
    projection.comparison_window.period_end === admission.comparison_window.period_end &&
    baselineEvidenceIds.length === 1 &&
    baselineEvidenceIds[0] === projection.baseline_window.evidence_id &&
    comparisonEvidenceIds.length === 1 &&
    comparisonEvidenceIds[0] === projection.comparison_window.evidence_id &&
    metric.baseline_value === projection.baseline_window.aggregate_value &&
    metric.comparison_value === projection.comparison_window.aggregate_value &&
    metric.eligible_population ===
      aiValueEngine.aggregateClaimCohortFloor(
        projection.baseline_window.cohort_size,
        projection.comparison_window.cohort_size
      )
  );
};

const canonicalSourceEnvelope = (
  source: { validation: Record<string, unknown> },
  field: string
): Record<string, unknown> | null => objectRef(source.validation[field]);

export const resolveCanonicalIdentityAuthority = async (
  graph: AuthoritativeSourceGraph,
  comparison: Exclude<OutcomeComparisonPrivacyReleaseResult, { decision: "HOLD" }>,
  selector: aiValueEngine.CanonicalIdentitySelector
): Promise<CanonicalIdentityAuthority | null> => {
  const runtimePrisma = getCanonicalIdentityRuntimePrisma();
  const primaryPrisma = getPrisma();
  if (
    !runtimePrisma ||
    !(await canonicalIdentityRuntimeCredentialIsReady(runtimePrisma)) ||
    !(await canonicalIdentityRuntimeTargetsPrimaryDatabase(
      primaryPrisma,
      runtimePrisma
    )) ||
    !(await checkCanonicalIdentityFamilyHeadStructureReadiness(runtimePrisma))
  ) {
    return null;
  }
  const sources = await loadCanonicalIdentityExactSources(graph.expectedSlice.org_id, selector);
  if (!sources) return null;
  const { hypothesis, plan, measurementCell } = sources;
  const hypothesisEnvelope = canonicalSourceEnvelope(
    hypothesis,
    "canonical_value_hypothesis_creation_attestation_v1"
  );
  const planEnvelope = canonicalSourceEnvelope(plan, "canonical_hypothesis_edge_v1");
  const cellEnvelope = canonicalSourceEnvelope(measurementCell, "canonical_measurement_lineage_v1");
  const sliceBinding = objectRef(plan.payload.canonical_slice_binding_v1);
  const parsedHypothesisEnvelope =
    aiValueEngine.CanonicalValueHypothesisCreationAttestationEnvelopeSchema.safeParse(
      hypothesisEnvelope
    );
  const parsedPlanEnvelope =
    aiValueEngine.CanonicalHypothesisEdgeAttestationEnvelopeSchema.safeParse(planEnvelope);
  const parsedCellEnvelope =
    aiValueEngine.CanonicalMeasurementLineageAttestationEnvelopeSchema.safeParse(cellEnvelope);
  if (
    !parsedHypothesisEnvelope.success ||
    !parsedPlanEnvelope.success ||
    !parsedCellEnvelope.success ||
    !sliceBinding ||
    !aiValueEngine.validateMeasurementPlan(plan.payload).valid ||
    parsedHypothesisEnvelope.data.hypothesis_semantic_commitment !==
      hypothesis.semanticCommitment ||
    parsedPlanEnvelope.data.plan_semantic_commitment !== plan.semanticCommitment ||
    parsedCellEnvelope.data.measurement_cell_semantic_commitment !==
      measurementCell.semanticCommitment ||
    parsedPlanEnvelope.data.hypothesis_row_id !== hypothesis.rowId ||
    parsedPlanEnvelope.data.hypothesis_version !== hypothesis.version ||
    parsedPlanEnvelope.data.hypothesis_semantic_commitment !== hypothesis.semanticCommitment ||
    parsedPlanEnvelope.data.hypothesis_creation_attestation_commitment !==
      sources.journalHeads.hypothesis.sourceAttestationCommitment ||
    parsedCellEnvelope.data.plan_row_id !== plan.rowId ||
    parsedCellEnvelope.data.plan_version !== plan.version ||
    parsedCellEnvelope.data.plan_semantic_commitment !== plan.semanticCommitment ||
    parsedCellEnvelope.data.plan_edge_attestation_commitment !==
      sources.journalHeads.plan.sourceAttestationCommitment ||
    parsedCellEnvelope.data.hypothesis_row_id !== hypothesis.rowId ||
    parsedCellEnvelope.data.hypothesis_version !== hypothesis.version ||
    parsedCellEnvelope.data.hypothesis_semantic_commitment !== hypothesis.semanticCommitment ||
    parsedCellEnvelope.data.hypothesis_creation_attestation_commitment !==
      sources.journalHeads.hypothesis.sourceAttestationCommitment ||
    plan.authority.value_hypothesis_id !== hypothesis.stableId ||
    measurementCell.authority.measurement_plan_id !== plan.stableId ||
    measurementCell.authority.value_hypothesis_id !== hypothesis.stableId ||
    measurementCell.authority.approval_state !== "approved" ||
    measurementCell.authority.metric_owner_approval_state !== "approved"
  ) {
    return null;
  }

  const bindingCandidate = {
    schema_version: sliceBinding.schema_version,
    plan_version: sliceBinding.plan_version,
    workflow_commitment: sliceBinding.workflow_commitment,
    jbtd_commitment: sliceBinding.jbtd_commitment,
    persona_commitment: sliceBinding.persona_commitment,
    baseline_window_start: sliceBinding.baseline_window_start,
    baseline_window_end: sliceBinding.baseline_window_end,
    comparison_window_start: sliceBinding.comparison_window_start,
    comparison_window_end: sliceBinding.comparison_window_end,
    metric_id: sliceBinding.metric_id,
    metric_definition_ref: sliceBinding.metric_definition_ref,
    canonical_metric_definition_commitment_v1:
      sliceBinding.canonical_metric_definition_commitment_v1,
    outcome_source_system: sliceBinding.outcome_source_system,
    measurement_unit: sliceBinding.measurement_unit,
    approved_direction: sliceBinding.approved_direction,
    approved_aggregate_grain: sliceBinding.approved_aggregate_grain,
    aggregate_only: sliceBinding.aggregate_only,
    approved_at: sliceBinding.approved_at,
    approved_by_role: sliceBinding.approved_by_role,
    approved_by_role_commitment: sliceBinding.approved_by_role_commitment,
    slice_commitment: sliceBinding.slice_commitment
  } as aiValueEngine.CanonicalSliceBindingV1;
  const bindingValidation = aiValueEngine.validateMeasurementPlan({
    ...plan.payload,
    canonical_slice_binding_v1: bindingCandidate
  });
  if (
    !bindingValidation.valid ||
    parsedPlanEnvelope.data.approved_aggregate_grain !==
      bindingCandidate.approved_aggregate_grain ||
    parsedPlanEnvelope.data.canonical_slice_commitment !== bindingCandidate.slice_commitment ||
    parsedCellEnvelope.data.approved_aggregate_grain !==
      bindingCandidate.approved_aggregate_grain ||
    parsedCellEnvelope.data.canonical_metric_definition_commitment_v1 !==
      bindingCandidate.canonical_metric_definition_commitment_v1 ||
    parsedCellEnvelope.data.canonical_direction !== bindingCandidate.approved_direction ||
    String(measurementCell.authority.metric_direction).toUpperCase() !==
      parsedCellEnvelope.data.canonical_direction
  ) {
    return null;
  }

  const hypothesisPredecessor =
    hypothesis.version === 1
      ? ({ state: "ROOT_V1" } as const)
      : sources.hypothesisPredecessorJournal &&
          sources.hypothesisPredecessorJournal.sourceRowId === hypothesis.predecessorRowId &&
          sources.hypothesisPredecessorJournal.attestationState === "ATTESTATION_PRESENT" &&
          sources.hypothesisPredecessorJournal.sourceSemanticCommitment &&
          sources.hypothesisPredecessorJournal.sourceAttestationCommitment
        ? ({
            state: "EXACT_PREDECESSOR",
            rowId: sources.hypothesisPredecessorJournal.sourceRowId,
            stableId: sources.hypothesisPredecessorJournal.stableId,
            version: sources.hypothesisPredecessorJournal.version,
            semanticCommitment: sources.hypothesisPredecessorJournal.sourceSemanticCommitment,
            attestationCommitment: sources.hypothesisPredecessorJournal.sourceAttestationCommitment
          } as const)
        : null;
  if (!hypothesisPredecessor) return null;
  const hypothesisPayload = canonicalHypothesisAttestationPayload({
    orgId: hypothesis.orgId,
    rowId: hypothesis.rowId,
    stableId: hypothesis.stableId,
    version: hypothesis.version,
    semanticCommitment: hypothesis.semanticCommitment,
    status: String(hypothesis.authority.status),
    predecessor: hypothesisPredecessor
  });
  const planPayload = canonicalPlanEdgeAttestationPayload({
    orgId: plan.orgId,
    rowId: plan.rowId,
    stableId: plan.stableId,
    version: plan.version,
    semanticCommitment: plan.semanticCommitment,
    readinessState: String(plan.authority.readiness_state),
    approvedAggregateGrain: String(bindingCandidate.approved_aggregate_grain),
    canonicalSliceCommitment: String(bindingCandidate.slice_commitment),
    canonicalMetricDefinitionCommitment: String(
      bindingCandidate.canonical_metric_definition_commitment_v1
    ),
    hypothesis: {
      rowId: hypothesis.rowId,
      stableId: hypothesis.stableId,
      version: hypothesis.version,
      semanticCommitment: hypothesis.semanticCommitment,
      attestationCommitment: sources.journalHeads.hypothesis.sourceAttestationCommitment!
    }
  });
  const cellPayload = canonicalMeasurementCellAttestationPayload({
    orgId: measurementCell.orgId,
    rowId: measurementCell.rowId,
    stableId: measurementCell.stableId,
    version: measurementCell.version,
    semanticCommitment: measurementCell.semanticCommitment,
    approvalState: String(measurementCell.authority.approval_state),
    metricOwnerApprovalState: String(measurementCell.authority.metric_owner_approval_state),
    approvedAggregateGrain: String(bindingCandidate.approved_aggregate_grain),
    canonicalMetricDefinitionCommitment: String(
      bindingCandidate.canonical_metric_definition_commitment_v1
    ),
    canonicalDirection: String(bindingCandidate.approved_direction),
    plan: {
      rowId: plan.rowId,
      stableId: plan.stableId,
      version: plan.version,
      semanticCommitment: plan.semanticCommitment,
      attestationCommitment: sources.journalHeads.plan.sourceAttestationCommitment!
    },
    hypothesis: {
      rowId: hypothesis.rowId,
      stableId: hypothesis.stableId,
      version: hypothesis.version,
      semanticCommitment: hypothesis.semanticCommitment,
      attestationCommitment: sources.journalHeads.hypothesis.sourceAttestationCommitment!
    }
  });
  if (
    parsedHypothesisEnvelope.data.mac !==
    sources.journalHeads.hypothesis.sourceAttestationCommitment
  ) {
    return null;
  }
  if (parsedPlanEnvelope.data.mac !== sources.journalHeads.plan.sourceAttestationCommitment) {
    return null;
  }
  if (
    parsedCellEnvelope.data.mac !== sources.journalHeads.measurementCell.sourceAttestationCommitment
  ) {
    return null;
  }
  if (
    !verifySliceEAttestation(
      "hypothesis_creation",
      hypothesisPayload,
      parsedHypothesisEnvelope.data
    )
  ) {
    return null;
  }
  if (!verifySliceEAttestation("plan_edge", planPayload, parsedPlanEnvelope.data)) {
    return null;
  }
  if (!verifySliceEAttestation("measurement_cell_edge", cellPayload, parsedCellEnvelope.data)) {
    return null;
  }

  let metricProjection: aiValueEngine.CanonicalMetricDefinitionProjection;
  try {
    metricProjection = aiValueEngine.resolveCanonicalMetricDefinition(
      graph.metricsLibraryRecord.payload,
      String(bindingCandidate.metric_id),
      String(bindingCandidate.metric_definition_ref)
    );
  } catch {
    return null;
  }
  const sourceSystem = objectRef(metricProjection.source_system);
  if (
    bindingCandidate.plan_version !== plan.version ||
    bindingCandidate.workflow_commitment !==
      aiValueEngine.canonicalSliceJoinKeyCommitment(
        "workflow_id",
        graph.expectedSlice.workflow_id
      ) ||
    bindingCandidate.jbtd_commitment !==
      aiValueEngine.canonicalSliceJoinKeyCommitment(
        "jbtd_id",
        graph.expectedSlice.jbtd_id
      ) ||
    bindingCandidate.persona_commitment !==
      aiValueEngine.canonicalSliceJoinKeyCommitment(
        "persona_id",
        graph.expectedSlice.persona_id
      ) ||
    bindingCandidate.baseline_window_start !== comparison.projection.baseline_window.period_start ||
    bindingCandidate.baseline_window_end !== comparison.projection.baseline_window.period_end ||
    bindingCandidate.comparison_window_start !==
      comparison.projection.comparison_window.period_start ||
    bindingCandidate.comparison_window_end !== comparison.projection.comparison_window.period_end ||
    bindingCandidate.metric_id !== comparison.projection.outcome_metric ||
    bindingCandidate.measurement_unit !== comparison.projection.outcome_unit ||
    bindingCandidate.outcome_source_system !== comparison.projection.source_system ||
    bindingCandidate.canonical_metric_definition_commitment_v1 !==
      aiValueEngine.canonicalMetricDefinitionCommitment(
        (graph.metricsLibraryRecord.payload.metrics as unknown[]).find(
          (entry) =>
            objectRef(entry)?.metric_id === bindingCandidate.metric_id &&
            objectRef(entry)?.metric_definition_ref === bindingCandidate.metric_definition_ref
        )
      ) ||
    sourceSystem?.source_name !== bindingCandidate.outcome_source_system ||
    sourceSystem?.approved_grain !== bindingCandidate.approved_aggregate_grain ||
    metricProjection.measurement_unit !== bindingCandidate.measurement_unit ||
    metricProjection.canonical_direction !== bindingCandidate.approved_direction ||
    measurementCell.authority.metric_id !== bindingCandidate.metric_id ||
    measurementCell.authority.aggregate_source_system !== bindingCandidate.outcome_source_system ||
    measurementCell.authority.metric_definition_ref !== bindingCandidate.metric_definition_ref ||
    measurementCell.authority.metric_unit !== bindingCandidate.measurement_unit ||
    aiValueEngine.canonicalSliceJoinKeyCommitment(
      "workflow_id",
      String(measurementCell.authority.workflow_id)
    ) !== bindingCandidate.workflow_commitment ||
    measurementCell.authority.baseline_window_start !== bindingCandidate.baseline_window_start ||
    measurementCell.authority.baseline_window_end !== bindingCandidate.baseline_window_end ||
    measurementCell.authority.comparison_window_start !==
      bindingCandidate.comparison_window_start ||
    measurementCell.authority.comparison_window_end !== bindingCandidate.comparison_window_end
  ) {
    return null;
  }

  const orgCommitment = exactHash("FT_CANONICAL_IDENTITY_ORG_V1", {
    org_id: graph.expectedSlice.org_id
  });
  const core = aiValueEngine.buildCanonicalIdentityCore({
    orgCommitment,
    hypothesisVersion: hypothesis.version,
    hypothesisSemanticCommitment: hypothesis.semanticCommitment,
    hypothesisCreationAttestationCommitment:
      sources.journalHeads.hypothesis.sourceAttestationCommitment!,
    planVersion: plan.version,
    planSemanticCommitment: plan.semanticCommitment,
    planEdgeAttestationCommitment: sources.journalHeads.plan.sourceAttestationCommitment!,
    measurementCellVersion: measurementCell.version,
    measurementCellSemanticCommitment: measurementCell.semanticCommitment,
    measurementCellEdgeAttestationCommitment:
      sources.journalHeads.measurementCell.sourceAttestationCommitment!,
    metricDefinitionCommitment: bindingCandidate.canonical_metric_definition_commitment_v1,
    canonicalSliceCommitment: bindingCandidate.slice_commitment,
    windowsCommitment: exactHash("FT_CANONICAL_IDENTITY_WINDOWS_V1", {
      baseline_window: comparison.projection.baseline_window,
      comparison_window: comparison.projection.comparison_window
    }),
    sourceGraphCommitment: aiValueEngine.aggregateClaimSourceGraphCommitment(graph.sourceGraphSeal)
      .source_graph_commitment,
    acceptedExportCommitment: exactHash(
      "FT_AGGREGATE_CLAIM_ACCEPTED_EXPORT_PAYLOAD_V1",
      graph.exportRecord.payload
    ),
    acceptedReviewCommitment: exactHash(
      "FT_AGGREGATE_CLAIM_ACCEPTED_REVIEW_V1",
      graph.exportRecord.payload.review
    ),
    admissionCommitment: exactHash(
      "FT_CANONICAL_IDENTITY_ADMISSION_V1",
      authoritativeOutcomeEvidenceReceipt(graph.exportRecord)
    ),
    comparisonReceiptCommitment: exactHash(
      "FT_CANONICAL_IDENTITY_COMPARISON_RECEIPT_V1",
      comparison.receipt
    ),
    comparisonProjectionCommitment: aiValueEngine.aggregateClaimComparisonProjectionCommitment(
      comparison.projection
    ),
    claimPolicyVersion: aiValueEngine.AGGREGATE_CLAIM_AUTHORIZATION_POLICY_VERSION,
    claimTemplateId: aiValueEngine.AGGREGATE_DESCRIPTIVE_CLAIM_TEMPLATE_ID
  });
  return {
    sources,
    sliceBinding: bindingCandidate,
    core,
    coreCommitment: aiValueEngine.canonicalIdentityCoreCommitment(core)
  };
};

const buildBundle = (
  graph: AuthoritativeSourceGraph,
  comparison: Exclude<OutcomeComparisonPrivacyReleaseResult, { decision: "HOLD" }>,
  canonicalIdentityCoreCommitment?: string,
  approvedMetricDirection?: string
) => {
  const metric = objectRef((graph.exportRecord.payload.metrics as unknown[])[0]);
  if (!metric) throw new Error("AGGREGATE_CLAIM_METRIC_MISSING");
  const movement = aiValueEngine.buildAggregateObservedMovement({
    metricId: String(metric.metric_id),
    measurementUnit: comparison.projection.outcome_unit,
    baselineValue: comparison.projection.baseline_window.aggregate_value,
    comparisonValue: comparison.projection.comparison_window.aggregate_value,
    approvedMetricDirection
  });
  return aiValueEngine.buildAggregateClaimAuthorizationBundle({
    sourceGraphSeal: graph.sourceGraphSeal,
    readinessId: graph.readinessRecord.object_id,
    readinessHash: aiValueObjectSemanticHash(graph.readinessRecord),
    acceptedExportPayloadHash: aiValueEngine.aggregateClaimHash(
      "FT_AGGREGATE_CLAIM_ACCEPTED_EXPORT_PAYLOAD_V1",
      graph.exportRecord.payload
    ),
    acceptedReviewHash: aiValueEngine.aggregateClaimHash(
      "FT_AGGREGATE_CLAIM_ACCEPTED_REVIEW_V1",
      graph.exportRecord.payload.review
    ),
    comparisonPrivacyReceipt: comparison.receipt,
    comparisonProjection: comparison.projection,
    canonicalIdentityCoreCommitment,
    policyState: aiValueEngine.aggregateClaimPolicyState(),
    claimContent: {
      policy_version: aiValueEngine.AGGREGATE_CLAIM_AUTHORIZATION_POLICY_VERSION,
      template_id: aiValueEngine.AGGREGATE_DESCRIPTIVE_CLAIM_TEMPLATE_ID,
      org_id: graph.expectedSlice.org_id,
      workflow_id: graph.expectedSlice.workflow_id,
      jbtd_id: graph.expectedSlice.jbtd_id,
      persona_id: graph.expectedSlice.persona_id,
      movement,
      caveats: [...aiValueEngine.AGGREGATE_CLAIM_CAVEATS],
      model_use_authorized: false,
      customer_facing_output_authorized: false
    }
  });
};

export const authorizeAggregateClaim = async (
  request: AggregateClaimAuthorizationRequest,
  dependencies: { readComparison?: ComparisonReader } = {}
) => {
  if (
    !request.persist ||
    !aiValueObjectUsesPrisma() ||
    request.comparisonPrivacyReceipt === undefined ||
    request.canonicalIdentitySelectorInvalid === true
  ) {
    return held();
  }
  const readComparison = dependencies.readComparison ?? readOutcomeComparisonPrivacyRelease;
  try {
    const graph = await resolveAuthoritativeSourceGraph(request);
    if (!graph) return held();
    const initialComparison = await readComparison(
      request.comparisonPrivacyReceipt,
      graph.expectedSlice
    );
    if (
      initialComparison.decision !== "ATOMIC_COMPARISON_PRIVACY_RELEASED" ||
      !comparisonMatchesGraph(graph, initialComparison)
    ) {
      return held();
    }
    const preSealComparison = await readComparison(
      request.comparisonPrivacyReceipt,
      graph.expectedSlice
    );
    if (
      preSealComparison.decision !== "ATOMIC_COMPARISON_PRIVACY_RELEASED" ||
      !comparisonMatchesGraph(graph, preSealComparison) ||
      !deepEqual(initialComparison, preSealComparison)
    ) {
      return held();
    }
    const canonicalAuthority = request.canonicalIdentitySelector
      ? await resolveCanonicalIdentityAuthority(
          graph,
          preSealComparison,
          request.canonicalIdentitySelector
        )
      : null;
    if (request.canonicalIdentitySelector && !canonicalAuthority) {
      return held();
    }
    const bundle = buildBundle(
      graph,
      preSealComparison,
      canonicalAuthority?.coreCommitment,
      canonicalAuthority?.sliceBinding.approved_direction
    );
    const renderedHtml = canonicalAuthority
      ? aiValueEngine.renderCanonicalAggregateClaimReadoutHtml(bundle.packet.content)
      : null;
    const binding =
      canonicalAuthority && renderedHtml
        ? aiValueEngine.buildCanonicalIdentityBinding({
            canonicalIdentityCoreCommitment: canonicalAuthority.coreCommitment,
            claimId: bundle.claim.claim_id,
            claimContentHash: bundle.claim.content_hash,
            packetId: bundle.packet.packet_id,
            packetContentHash: bundle.packet.content_hash,
            manifestId: bundle.manifest.manifest_id,
            manifestHash: bundle.manifest.manifest_hash,
            renderedBodyCommitment: aiValueEngine.canonicalReadoutBytesCommitment(renderedHtml)
          })
        : undefined;
    const bundleAttestation =
      canonicalAuthority && binding
        ? createSliceEAttestation(
            "four_artifact_bundle",
            canonicalArtifactBundleAttestationPayload({
              orgCommitment: canonicalAuthority.core.org_commitment,
              coreCommitment: canonicalAuthority.coreCommitment,
              binding,
              ...bundle
            })
          )
        : null;
    if (canonicalAuthority && (!binding || !bundleAttestation)) {
      return held();
    }
    const bindingValidation =
      canonicalAuthority && binding && bundleAttestation
        ? {
            canonical_identity_source_locator_v1: {
              selector: request.canonicalIdentitySelector,
              sources: [
                canonicalAuthority.sources.hypothesis,
                canonicalAuthority.sources.plan,
                canonicalAuthority.sources.measurementCell
              ].map((source) => ({
                source_kind: source.sourceKind,
                stable_id: source.stableId,
                version: source.version,
                row_id: source.rowId,
                predecessor_row_id: source.predecessorRowId,
                semantic_commitment: source.semanticCommitment
              }))
            },
            canonical_artifact_creation_attestation_v1: bundleAttestation
          }
        : undefined;
    const stored = await sealAiValueClaimBundleSerializable({
      orgId: request.orgId,
      sourceSnapshots: sourceRecords(graph),
      ...(canonicalAuthority
        ? {
            canonicalIdentitySources: [
              canonicalAuthority.sources.hypothesis,
              canonicalAuthority.sources.plan,
              canonicalAuthority.sources.measurementCell
            ].map((source) => ({
              sourceKind: source.sourceKind,
              stableId: source.stableId,
              version: source.version,
              rowId: source.rowId,
              predecessorRowId: source.predecessorRowId,
              semanticCommitment: source.semanticCommitment,
              attestationCommitment:
                canonicalAuthority.sources.journalHeads[
                  source.sourceKind === "VALUE_HYPOTHESIS"
                    ? "hypothesis"
                    : source.sourceKind === "MEASUREMENT_PLAN"
                      ? "plan"
                      : "measurementCell"
                ].sourceAttestationCommitment!
            })),
            binding,
            bindingValidation
          }
        : {}),
      ...bundle
    });
    if (!stored) return held();

    const postCommitComparison = await readComparison(
      request.comparisonPrivacyReceipt,
      graph.expectedSlice
    );
    if (
      postCommitComparison.decision !== "ATOMIC_COMPARISON_PRIVACY_RELEASED" ||
      !comparisonMatchesGraph(graph, postCommitComparison) ||
      !deepEqual(preSealComparison, postCommitComparison)
    ) {
      return held();
    }
    const [currentSources, currentBundle] = await Promise.all([
      readAiValueObjectSet(request.orgId, exactSourceRefs(graph)),
      readAiValueClaimBundle(request.orgId, bundle.packet.packet_id)
    ]);
    const postCommitCanonicalAuthority =
      canonicalAuthority && request.canonicalIdentitySelector
        ? await resolveCanonicalIdentityAuthority(
            graph,
            postCommitComparison,
            request.canonicalIdentitySelector
          )
        : null;
    const canonicalBundleInvalid =
      binding !== undefined &&
      (!currentBundle?.binding ||
        !deepEqual(currentBundle.binding.payload, binding) ||
        !deepEqual(
          currentBundle.binding.validation.canonical_artifact_creation_attestation_v1,
          bundleAttestation
        ) ||
        !verifySliceEAttestation(
          "four_artifact_bundle",
          canonicalArtifactBundleAttestationPayload({
            orgCommitment: canonicalAuthority!.core.org_commitment,
            coreCommitment: canonicalAuthority!.coreCommitment,
            binding,
            ...bundle
          }),
          currentBundle.binding.validation.canonical_artifact_creation_attestation_v1
        ) ||
        !aiValueEngine.canonicalIdentityBundleReconciles({
          claim: currentBundle.claim.payload,
          packet: currentBundle.packet.payload,
          manifest: currentBundle.manifest.payload,
          binding: currentBundle.binding.payload
        }) ||
        !postCommitCanonicalAuthority ||
        postCommitCanonicalAuthority.coreCommitment !== canonicalAuthority!.coreCommitment ||
        !deepEqual(postCommitCanonicalAuthority.sources, canonicalAuthority!.sources));
    if (
      !currentSources ||
      !currentBundle ||
      !sourceSetMatches(sourceRecords(graph), currentSources) ||
      !deepEqual(currentBundle.claim.payload, bundle.claim) ||
      !deepEqual(currentBundle.packet.payload, bundle.packet) ||
      !deepEqual(currentBundle.manifest.payload, bundle.manifest) ||
      canonicalBundleInvalid ||
      !aiValueEngine.aggregateClaimBundleReconciles({
        claim: currentBundle.claim.payload,
        packet: currentBundle.packet.payload,
        manifest: currentBundle.manifest.payload
      })
    ) {
      return held();
    }
    if (canonicalAuthority && binding) {
      return aiValueEngine.CanonicalIdentityAuthorizedResponseSchema.parse({
        decision: "AUTHORIZED",
        claim_authorization_state: "AUTHORIZED",
        canonical_identity_state: "BOUND",
        source_bound: true,
        canonical_identity_core_commitment: canonicalAuthority.coreCommitment,
        packet_id: bundle.packet.packet_id,
        persisted: [
          {
            object_type: aiValueEngine.INTERNAL_AGGREGATE_CLAIM_OBJECT_TYPE,
            object_id: bundle.claim.claim_id
          },
          {
            object_type: aiValueEngine.INTERNAL_AGGREGATE_PACKET_OBJECT_TYPE,
            object_id: bundle.packet.packet_id
          },
          {
            object_type: aiValueEngine.INTERNAL_AGGREGATE_MANIFEST_OBJECT_TYPE,
            object_id: bundle.manifest.manifest_id
          },
          {
            object_type: aiValueEngine.INTERNAL_CANONICAL_IDENTITY_BINDING_OBJECT_TYPE,
            object_id: binding.binding_id
          }
        ],
        customer_facing_output_authorized: false
      });
    }
    return aiValueEngine.AggregateClaimAuthorizedResponseSchema.parse({
      decision: "AUTHORIZED",
      claim_authorization_state: "AUTHORIZED",
      packet_id: bundle.packet.packet_id,
      persisted: [
        {
          object_type: aiValueEngine.INTERNAL_AGGREGATE_CLAIM_OBJECT_TYPE,
          object_id: bundle.claim.claim_id
        },
        {
          object_type: aiValueEngine.INTERNAL_AGGREGATE_PACKET_OBJECT_TYPE,
          object_id: bundle.packet.packet_id
        },
        {
          object_type: aiValueEngine.INTERNAL_AGGREGATE_MANIFEST_OBJECT_TYPE,
          object_id: bundle.manifest.manifest_id
        }
      ],
      customer_facing_output_authorized: false
    });
  } catch {
    return held();
  }
};

export const readAuthorizedAggregateClaim = async (
  orgId: string,
  packetId: string,
  dependencies: { readComparison?: ComparisonReader } = {}
): Promise<AggregateClaimReadout | null> => {
  if (!aiValueObjectUsesPrisma()) return null;
  const readComparison = dependencies.readComparison ?? readOutcomeComparisonPrivacyRelease;
  try {
    const stored = await readAiValueClaimBundle(orgId, packetId);
    if (!stored) return null;
    const claim = aiValueEngine.AggregateAuthorizedClaimArtifactSchema.safeParse(
      stored.claim.payload
    );
    const packet = aiValueEngine.AggregateAuthorizedPacketArtifactSchema.safeParse(
      stored.packet.payload
    );
    const manifest = aiValueEngine.AggregateClaimAuthorizationManifestSchema.safeParse(
      stored.manifest.payload
    );
    if (
      !claim.success ||
      !packet.success ||
      !manifest.success ||
      !aiValueEngine.aggregateClaimBundleReconciles({
        claim: claim.data,
        packet: packet.data,
        manifest: manifest.data
      })
    ) {
      return null;
    }
    const readinessRecord = await readinessByCommitment(
      orgId,
      manifest.data.core.readiness_ref_commitment,
      manifest.data.core.readiness_hash
    );
    const seal = aiValueEngine.AggregateClaimSourceGraphSealSchema.safeParse(
      readinessRecord?.validation.aggregate_claim_source_graph
    );
    if (!readinessRecord || !seal.success) return null;
    const graph = await resolveAuthoritativeSourceGraph({
      orgId,
      blueprintId: seal.data.blueprint_id,
      metricsLibraryId: seal.data.metrics_library_id,
      scenarioId: seal.data.scenario_id,
      outcomeEvidenceExportId: seal.data.outcome_evidence_export_id,
      outcomeEvidenceReadinessId: readinessRecord.object_id,
      persist: true
    });
    if (
      !graph ||
      !deepEqual(
        aiValueEngine.aggregateClaimSourceGraphCommitment(graph.sourceGraphSeal),
        manifest.data.core.source_graph
      ) ||
      aiValueEngine.aggregateClaimSliceCommitment({
        orgId: graph.expectedSlice.org_id,
        workflowId: graph.expectedSlice.workflow_id,
        jbtdId: graph.expectedSlice.jbtd_id,
        personaId: graph.expectedSlice.persona_id,
        sourceGraphCommitment: manifest.data.core.source_graph.source_graph_commitment
      }) !== manifest.data.core.slice_commitment ||
      aiValueObjectSemanticHash(graph.readinessRecord) !== manifest.data.core.readiness_hash ||
      aiValueEngine.aggregateClaimHash(
        "FT_AGGREGATE_CLAIM_ACCEPTED_EXPORT_PAYLOAD_V1",
        graph.exportRecord.payload
      ) !== manifest.data.core.accepted_export_payload_hash ||
      aiValueEngine.aggregateClaimHash(
        "FT_AGGREGATE_CLAIM_ACCEPTED_REVIEW_V1",
        graph.exportRecord.payload.review
      ) !== manifest.data.core.accepted_review_hash
    ) {
      return null;
    }
    const comparison = await readComparison(
      manifest.data.core.comparison_privacy_receipt,
      graph.expectedSlice
    );
    if (
      comparison.decision !== "ATOMIC_COMPARISON_PRIVACY_RELEASED" ||
      !comparisonMatchesGraph(graph, comparison) ||
      !deepEqual(comparison.receipt, manifest.data.core.comparison_privacy_receipt) ||
      aiValueEngine.aggregateClaimComparisonProjectionCommitment(comparison.projection) !==
        manifest.data.core.comparison_projection_commitment
    ) {
      return null;
    }
    const storedBinding = stored.binding
      ? aiValueEngine.CanonicalIdentityBindingSchema.safeParse(stored.binding.payload)
      : null;
    if (stored.binding && (!storedBinding || !storedBinding.success)) {
      return null;
    }
    const locator = stored.binding
      ? objectRef(stored.binding.validation.canonical_identity_source_locator_v1)
      : null;
    const selector = locator
      ? aiValueEngine.CanonicalIdentitySelectorSchema.safeParse(locator.selector)
      : null;
    if (stored.binding && (!selector || !selector.success)) {
      return null;
    }
    const canonicalAuthority =
      selector?.success === true
        ? await resolveCanonicalIdentityAuthority(graph, comparison, selector.data)
        : null;
    if (stored.binding && !canonicalAuthority) {
      return null;
    }
    const rebuilt = buildBundle(
      graph,
      comparison,
      canonicalAuthority?.coreCommitment,
      canonicalAuthority?.sliceBinding.approved_direction
    );
    if (
      !deepEqual(claim.data, rebuilt.claim) ||
      !deepEqual(packet.data, rebuilt.packet) ||
      !deepEqual(manifest.data, rebuilt.manifest)
    ) {
      return null;
    }
    if (stored.binding && storedBinding?.success && canonicalAuthority) {
      const html = aiValueEngine.renderCanonicalAggregateClaimReadoutHtml(rebuilt.packet.content);
      const rebuiltBinding = aiValueEngine.buildCanonicalIdentityBinding({
        canonicalIdentityCoreCommitment: canonicalAuthority.coreCommitment,
        claimId: rebuilt.claim.claim_id,
        claimContentHash: rebuilt.claim.content_hash,
        packetId: rebuilt.packet.packet_id,
        packetContentHash: rebuilt.packet.content_hash,
        manifestId: rebuilt.manifest.manifest_id,
        manifestHash: rebuilt.manifest.manifest_hash,
        renderedBodyCommitment: aiValueEngine.canonicalReadoutBytesCommitment(html)
      });
      const bundleAttestation =
        stored.binding.validation.canonical_artifact_creation_attestation_v1;
      if (
        !deepEqual(storedBinding.data, rebuiltBinding) ||
        !aiValueEngine.canonicalIdentityBundleReconciles({
          ...rebuilt,
          binding: storedBinding.data
        }) ||
        !verifySliceEAttestation(
          "four_artifact_bundle",
          canonicalArtifactBundleAttestationPayload({
            orgCommitment: canonicalAuthority.core.org_commitment,
            coreCommitment: canonicalAuthority.coreCommitment,
            binding: rebuiltBinding,
            ...rebuilt
          }),
          bundleAttestation
        )
      ) {
        return null;
      }
      return {
        html,
        canonicalIdentityState: "BOUND",
        sourceBound: true
      };
    }
    return {
      html: aiValueEngine.renderAggregateClaimReadoutHtml(packet.data.content),
      canonicalIdentityState: "UNBOUND",
      sourceBound: false
    };
  } catch {
    return null;
  }
};
