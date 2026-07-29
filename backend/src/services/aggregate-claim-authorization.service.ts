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
  readOutcomeComparisonPrivacyRelease,
  type OutcomeComparisonPrivacyReleaseResult
} from "../repositories/outcome-comparison-privacy.repository";
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
  persist: boolean;
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

const resolveAuthoritativeSourceGraph = async (
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

const buildBundle = (
  graph: AuthoritativeSourceGraph,
  comparison: Exclude<OutcomeComparisonPrivacyReleaseResult, { decision: "HOLD" }>
) => {
  const metric = objectRef((graph.exportRecord.payload.metrics as unknown[])[0]);
  if (!metric) throw new Error("AGGREGATE_CLAIM_METRIC_MISSING");
  const movement = aiValueEngine.buildAggregateObservedMovement({
    metricId: String(metric.metric_id),
    measurementUnit: comparison.projection.outcome_unit,
    baselineValue: comparison.projection.baseline_window.aggregate_value,
    comparisonValue: comparison.projection.comparison_window.aggregate_value
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
    request.comparisonPrivacyReceipt === undefined
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
    const bundle = buildBundle(graph, preSealComparison);
    const stored = await sealAiValueClaimBundleSerializable({
      orgId: request.orgId,
      sourceSnapshots: sourceRecords(graph),
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
    if (
      !currentSources ||
      !currentBundle ||
      !sourceSetMatches(sourceRecords(graph), currentSources) ||
      !deepEqual(currentBundle.claim.payload, bundle.claim) ||
      !deepEqual(currentBundle.packet.payload, bundle.packet) ||
      !deepEqual(currentBundle.manifest.payload, bundle.manifest) ||
      !aiValueEngine.aggregateClaimBundleReconciles({
        claim: currentBundle.claim.payload,
        packet: currentBundle.packet.payload,
        manifest: currentBundle.manifest.payload
      })
    ) {
      return held();
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
): Promise<aiValueEngine.AggregateAuthorizedPacketContent | null> => {
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
    const rebuilt = buildBundle(graph, comparison);
    if (
      !deepEqual(claim.data, rebuilt.claim) ||
      !deepEqual(packet.data, rebuilt.packet) ||
      !deepEqual(manifest.data, rebuilt.manifest)
    ) {
      return null;
    }
    return packet.data.content;
  } catch {
    return null;
  }
};
