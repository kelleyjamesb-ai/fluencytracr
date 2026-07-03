import { aiValueEngine } from "@fluencytracr/shared";

import {
  getAiValueObject,
  upsertAiValueObject
} from "./repositories/ai-value-object.repository";
import { listFluencyTracrVerdicts } from "./repositories/fluencytracr-verdict.repository";
import { listOutcomeEvidence } from "./repositories/outcome-evidence.repository";
import { listVelocityDistributions } from "./repositories/velocity-distribution.repository";
import type {
  AiValueObjectStoredRecord,
  FluencyTracrVerdictRecord,
  OutcomeEvidenceStoredRecord
} from "./store";
import {
  ForwardedDistributionLegacyCompatibleSchema,
  forwardedDistributionMatchesSlice
} from "./value_realization/forwarded_distribution";

type SourceCoverageLane =
  | "ai_activity"
  | "workflow"
  | "outcome"
  | "baseline"
  | "trust"
  | "assumptions"
  | "suppression";

export interface RealEvidenceMaterializerInput {
  orgId: string;
  blueprintId: string;
  metricsLibraryId: string;
  cohortId: string;
  workflowId: string;
  outcomeWorkflowId?: string;
}

export interface RealEvidenceMaterializerResult {
  customer_facing_economic_output: false;
  materialized: Array<{ object_type: string; object_id: string }>;
  held_reasons: string[];
  objects: {
    evidence_readiness: Record<string, unknown>;
    outcome_evidence_export?: Record<string, unknown>;
  };
  evidence_summary: {
    cohort_id: string;
    workflow_id: string;
    v3_verdict_id: string | null;
    v3_verdict: string | null;
    forwarded_distribution_used: boolean;
    velocity_observation_count: number;
    outcome_evidence_export_id: string | null;
  };
}

export class AiValueMaterializerNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiValueMaterializerNotFoundError";
  }
}

export class AiValueMaterializerValidationError extends Error {
  constructor(
    message: string,
    public readonly gaps: string[]
  ) {
    super(message);
    this.name = "AiValueMaterializerValidationError";
  }
}

const sanitizeIdSegment = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const objectPayload = async (
  orgId: string,
  objectType: string,
  objectId: string
): Promise<Record<string, unknown>> => {
  const record = await getAiValueObject(orgId, objectType, objectId);
  if (!record) {
    throw new AiValueMaterializerNotFoundError(`${objectType} ${objectId} not found`);
  }
  return record.payload;
};

const workflowFamilyOf = (payload: Record<string, unknown>, fallback: string): string =>
  typeof payload.workflow_family === "string" && payload.workflow_family.trim()
    ? payload.workflow_family
    : fallback;

const latestVerdict = (
  verdicts: FluencyTracrVerdictRecord[]
): FluencyTracrVerdictRecord | null =>
  [...verdicts].sort(
    (a, b) =>
      Date.parse(a.computed_at) - Date.parse(b.computed_at) ||
      Date.parse(a.created_at) - Date.parse(b.created_at)
  ).at(-1) ?? null;

const windowToRange = (
  value: unknown
): { token: string; start: string; end: string } | null => {
  if (typeof value !== "string") return null;
  const [startDate, endDate] = value.split("_to_");
  if (!startDate || !endDate) return null;
  return {
    token: value,
    start: `${startDate}T00:00:00.000Z`,
    end: `${endDate}T00:00:00.000Z`
  };
};

const dateToken = (iso: string): string => new Date(iso).toISOString().slice(0, 10);

const recordMatchesWindow = (
  record: OutcomeEvidenceStoredRecord,
  range: { start: string; end: string }
): boolean =>
  dateToken(record.period_start) === dateToken(range.start) &&
  dateToken(record.period_end) === dateToken(range.end);

const metricDefinitions = (metricsLibrary: Record<string, unknown>): any[] =>
  Array.isArray(metricsLibrary.metrics) ? metricsLibrary.metrics : [];

const matchingMetricDefinition = (
  metricsLibrary: Record<string, unknown>,
  evidence: OutcomeEvidenceStoredRecord
): any | null => {
  for (const metric of metricDefinitions(metricsLibrary)) {
    if (
      metric?.metric_id === evidence.outcome_metric &&
      metric?.measurement_unit === evidence.outcome_unit &&
      metric?.source_system?.source_name === evidence.source_system
    ) {
      return metric;
    }
  }
  return null;
};

const pairedOutcomeMetrics = (
  metricsLibrary: Record<string, unknown>,
  records: OutcomeEvidenceStoredRecord[],
  baselineRange: { start: string; end: string },
  comparisonRange: { start: string; end: string }
): Array<{ metric: any; baseline: OutcomeEvidenceStoredRecord; comparison: OutcomeEvidenceStoredRecord }> => {
  const pairs: Array<{ metric: any; baseline: OutcomeEvidenceStoredRecord; comparison: OutcomeEvidenceStoredRecord }> = [];
  const baselineRecords = records.filter((record) => recordMatchesWindow(record, baselineRange));
  const comparisonRecords = records.filter((record) => recordMatchesWindow(record, comparisonRange));

  for (const baseline of baselineRecords) {
    const comparison = comparisonRecords.find(
      (record) =>
        record.outcome_metric === baseline.outcome_metric &&
        record.outcome_unit === baseline.outcome_unit &&
        record.source_system === baseline.source_system
    );
    if (!comparison) continue;
    const metric = matchingMetricDefinition(metricsLibrary, baseline);
    if (!metric) continue;
    pairs.push({ metric, baseline, comparison });
  }

  return pairs;
};

const buildOutcomeEvidenceExport = (
  orgId: string,
  blueprint: Record<string, unknown>,
  metricsLibrary: Record<string, unknown>,
  outcomeWorkflowId: string | undefined,
  evidenceRecords: OutcomeEvidenceStoredRecord[],
  heldReasons: string[]
): Record<string, unknown> | null => {
  const windows = blueprint.windows as Record<string, unknown> | undefined;
  const baseline = windowToRange(windows?.baseline);
  const comparison = windowToRange(windows?.comparison);
  if (!baseline || !comparison) {
    heldReasons.push("Outcome evidence export held: blueprint windows are missing or invalid");
    return null;
  }

  const workflowFamily = workflowFamilyOf(blueprint, String(outcomeWorkflowId ?? ""));
  const scopedRecords = evidenceRecords.filter(
    (record) => !outcomeWorkflowId || record.workflow_id === outcomeWorkflowId
  );
  const pairs = pairedOutcomeMetrics(metricsLibrary, scopedRecords, baseline, comparison);
  if (pairs.length === 0) {
    heldReasons.push(
      "Outcome evidence export held: no paired baseline/comparison evidence aligned to the metrics library"
    );
    return null;
  }

  const firstMetric = pairs[0].metric;
  const familySegment = sanitizeIdSegment(workflowFamily);
  const exportObject = {
    schema_version: aiValueEngine.OUTCOME_EVIDENCE_EXPORT_SCHEMA_VERSION,
    export_id: `outcome_export_${familySegment}_real_evidence_v1`,
    org_id: orgId,
    workflow_family: workflowFamily,
    source_system: {
      source_type: firstMetric.source_system.source_type,
      source_name: firstMetric.source_system.source_name,
      approved_grain: firstMetric.source_system.approved_grain
    },
    attestation: {
      exported_by_role: "customer_data_owner",
      approved_by_role: "customer_business_sponsor",
      export_date: new Date().toISOString().slice(0, 10),
      contains_person_level_data: false,
      contains_raw_content: false
    },
    windows: {
      baseline: baseline.token,
      comparison: comparison.token
    },
    metrics: pairs.map(({ metric, baseline: baselineRecord, comparison: comparisonRecord }) => ({
      metric_id: metric.metric_id,
      measurement_unit: metric.measurement_unit,
      baseline_value: baselineRecord.aggregate_value,
      comparison_value: comparisonRecord.aggregate_value,
      eligible_population: Math.min(baselineRecord.cohort_size, comparisonRecord.cohort_size)
    })),
    review: {
      review_state: "SUBMITTED"
    }
  };

  const validation = aiValueEngine.validateOutcomeEvidenceExport(exportObject, {
    blueprint,
    metricsLibrary
  });
  if (!validation.valid || validation.cross_check_gaps.length > 0) {
    heldReasons.push(
      ...validation.gaps.map((gap) => `Outcome evidence export held: ${gap}`),
      ...validation.cross_check_gaps.map((gap) => `Outcome evidence export held: ${gap}`)
    );
    return null;
  }

  return exportObject;
};

const materializeOutcomeEvidenceExport = async (
  orgId: string,
  exportObject: Record<string, unknown> | null,
  materialized: Array<{ object_type: string; object_id: string }>,
  heldReasons: string[]
): Promise<Record<string, unknown> | undefined> => {
  if (!exportObject) return undefined;
  const exportId = String(exportObject.export_id);
  const existing = await getAiValueObject(orgId, "outcome_evidence_export", exportId);
  const existingState = aiValueEngine.reviewStateOf(existing?.payload);
  if (existingState === "ACCEPTED" || existingState === "REJECTED") {
    heldReasons.push(
      `Outcome evidence export ${exportId} is ${existingState} and was not overwritten`
    );
    return existing?.payload;
  }

  const validation = aiValueEngine.validateOutcomeEvidenceExport(exportObject);
  await upsertAiValueObject({
    orgId,
    objectType: "outcome_evidence_export",
    objectId: exportId,
    schemaVersion: String(exportObject.schema_version),
    workflowFamily: workflowFamilyOf(exportObject, exportId),
    payload: exportObject,
    validation: validation as unknown as Record<string, unknown>,
    valid: validation.valid
  });
  materialized.push({ object_type: "outcome_evidence_export", object_id: exportId });
  return exportObject;
};

const evidenceCoverageFromVerdict = (
  verdict: FluencyTracrVerdictRecord | null,
  heldReasons: string[]
): {
  overrides: Partial<Record<SourceCoverageLane, string>>;
  evidenceRefs: Record<string, string>;
  forwardedDistributionUsed: boolean;
} => {
  if (!verdict) {
    heldReasons.push("V3 verdict is missing for requested cohort and workflow");
    return { overrides: {}, evidenceRefs: {}, forwardedDistributionUsed: false };
  }

  const evidenceRefs: Record<string, string> = {
    v3_verdict_id: verdict.id
  };
  if (verdict.verdict !== "SURFACE") {
    heldReasons.push(`V3 verdict is SUPPRESS for ${verdict.cohort_id}/${verdict.workflow_id}`);
    return { overrides: {}, evidenceRefs, forwardedDistributionUsed: false };
  }

  const parsed = ForwardedDistributionLegacyCompatibleSchema.safeParse(
    verdict.payload_json.forwarded_distribution
  );
  if (!parsed.success) {
    heldReasons.push("V3 verdict is SURFACE but forwarded_distribution is missing or invalid");
    return { overrides: {}, evidenceRefs, forwardedDistributionUsed: false };
  }
  if (!forwardedDistributionMatchesSlice(parsed.data, {
    cohortId: verdict.cohort_id,
    workflowId: verdict.workflow_id,
    jbtdId: verdict.jbtd_id,
    personaId: verdict.persona_id,
    windowStart: verdict.window_start,
    windowEnd: verdict.window_end,
    calibrationId: verdict.calibration_id
  })) {
    heldReasons.push("V3 verdict is SURFACE but forwarded_distribution slice does not match verdict row");
    return { overrides: {}, evidenceRefs, forwardedDistributionUsed: false };
  }

  const quality = parsed.data.quality_signals;
  const overrides: Partial<Record<SourceCoverageLane, string>> = {
    ai_activity: "PRESENT",
    workflow: "PRESENT",
    suppression: "PRESENT"
  };

  if (quality.verification_rate > 0 || quality.recovery_rate > 0) {
    overrides.trust = "PRESENT";
  } else {
    heldReasons.push("V3 surfaced evidence trust lane held: verification and recovery evidence are absent");
  }

  return { overrides, evidenceRefs, forwardedDistributionUsed: true };
};

const persistReadiness = async (
  orgId: string,
  readiness: Record<string, unknown>,
  materialized: Array<{ object_type: string; object_id: string }>
) => {
  const validation = aiValueEngine.validateEvidenceReadiness(readiness);
  if (!validation.valid) {
    throw new AiValueMaterializerValidationError(
      "Materialized evidence readiness failed validation",
      validation.gaps
    );
  }
  const readinessId = String(readiness.readiness_id);
  await upsertAiValueObject({
    orgId,
    objectType: "evidence_readiness",
    objectId: readinessId,
    schemaVersion: String(readiness.schema_version),
    workflowFamily: workflowFamilyOf(readiness, readinessId),
    payload: readiness,
    validation: validation as unknown as Record<string, unknown>,
    valid: true
  });
  materialized.push({ object_type: "evidence_readiness", object_id: readinessId });
};

export async function materializeRealEvidence(
  input: RealEvidenceMaterializerInput
): Promise<RealEvidenceMaterializerResult> {
  const heldReasons: string[] = [];
  const materialized: Array<{ object_type: string; object_id: string }> = [];

  const blueprint = await objectPayload(input.orgId, "blueprint", input.blueprintId);
  const metricsLibrary = await objectPayload(
    input.orgId,
    "metrics_library",
    input.metricsLibraryId
  );

  const blueprintValidation = aiValueEngine.validateBlueprint(blueprint);
  const metricsValidation = aiValueEngine.validateMetricsLibrary(metricsLibrary);
  if (!blueprintValidation.valid || !metricsValidation.valid) {
    throw new AiValueMaterializerValidationError(
      "Upstream AI Value objects failed validation",
      [...blueprintValidation.gaps, ...metricsValidation.gaps]
    );
  }

  const verdict = latestVerdict(
    await listFluencyTracrVerdicts({
      orgId: input.orgId,
      cohortId: input.cohortId,
      workflowId: input.workflowId
    })
  );
  const velocityObservations = await listVelocityDistributions({
    orgId: input.orgId,
    workflowId: input.workflowId,
    jbtdId: verdict?.jbtd_id ?? null,
    personaId: verdict?.persona_id ?? null
  });
  const coverage = evidenceCoverageFromVerdict(verdict, heldReasons);

  const windows = blueprint.windows as Record<string, unknown> | undefined;
  const baseline = windowToRange(windows?.baseline);
  const comparison = windowToRange(windows?.comparison);
  const outcomeRecords = baseline && comparison && input.outcomeWorkflowId
    ? await listOutcomeEvidence(input.orgId, {
        workflow_id: input.outcomeWorkflowId,
        period_start: baseline.start,
        period_end: comparison.end
      })
    : [];

  const outcomeExport = await materializeOutcomeEvidenceExport(
    input.orgId,
    buildOutcomeEvidenceExport(
      input.orgId,
      blueprint,
      metricsLibrary,
      input.outcomeWorkflowId,
      outcomeRecords,
      heldReasons
    ),
    materialized,
    heldReasons
  );

  const familySegment = sanitizeIdSegment(
    workflowFamilyOf(blueprint, input.blueprintId)
  );
  const evidenceRefs = {
    ...coverage.evidenceRefs,
    velocity_observations_ref: `velocity_observations:${velocityObservations.length}`,
    ...(outcomeExport?.export_id
      ? { outcome_evidence_export_id: String(outcomeExport.export_id) }
      : {})
  };
  const spine = aiValueEngine.runSpine({
    blueprint,
    metricsLibrary,
    ids: {
      readinessId: `readiness_${familySegment}_real_evidence_v1`
    },
    sourceCoverageOverrides: coverage.overrides,
    evidenceRefs
  });
  const readiness = spine.stages.readiness.object as Record<string, unknown> | null;
  if (!readiness) {
    throw new AiValueMaterializerValidationError(
      "AI Value spine did not produce evidence readiness",
      [spine.stages.readiness.hold_reason ?? spine.decision]
    );
  }
  await persistReadiness(input.orgId, readiness, materialized);

  return {
    customer_facing_economic_output: false,
    materialized,
    held_reasons: heldReasons,
    objects: {
      evidence_readiness: readiness,
      ...(outcomeExport ? { outcome_evidence_export: outcomeExport } : {})
    },
    evidence_summary: {
      cohort_id: input.cohortId,
      workflow_id: input.workflowId,
      v3_verdict_id: verdict?.id ?? null,
      v3_verdict: verdict?.verdict ?? null,
      forwarded_distribution_used: coverage.forwardedDistributionUsed,
      velocity_observation_count: velocityObservations.length,
      outcome_evidence_export_id:
        typeof outcomeExport?.export_id === "string" ? outcomeExport.export_id : null
    }
  };
}
