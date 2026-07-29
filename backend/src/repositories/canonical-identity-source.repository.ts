import { aiValueEngine } from "@fluencytracr/shared";
import type { Prisma } from "@prisma/client";

import { getPrisma } from "../db";

export type CanonicalIdentitySourceKind =
  | "VALUE_HYPOTHESIS"
  | "MEASUREMENT_PLAN"
  | "MEASUREMENT_CELL";

export interface CanonicalIdentitySourceRow {
  sourceKind: CanonicalIdentitySourceKind;
  rowId: string;
  orgId: string;
  stableId: string;
  version: number;
  predecessorRowId: string | null;
  semanticCommitment: string;
  validation: Record<string, unknown>;
  payload: Record<string, unknown>;
  authority: Record<string, unknown>;
}

export interface CanonicalIdentityJournalHead {
  sourceKind: CanonicalIdentitySourceKind;
  orgId: string;
  stableId: string;
  version: number;
  sourceRowId: string;
  predecessorRowId: string | null;
  sourceSemanticCommitment: string | null;
  sourceAttestationCommitment: string | null;
  attestationState: string;
}

export interface CanonicalIdentityExactSources {
  hypothesis: CanonicalIdentitySourceRow;
  plan: CanonicalIdentitySourceRow;
  measurementCell: CanonicalIdentitySourceRow;
  journalHeads: {
    hypothesis: CanonicalIdentityJournalHead;
    plan: CanonicalIdentityJournalHead;
    measurementCell: CanonicalIdentityJournalHead;
  };
  hypothesisPredecessorJournal: CanonicalIdentityJournalHead | null;
}

const record = (value: Prisma.JsonValue): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const canonicalIdentitySourceSemanticCommitment = (
  source: Omit<CanonicalIdentitySourceRow, "semanticCommitment">
): string => {
  const attestationField =
    source.sourceKind === "VALUE_HYPOTHESIS"
      ? "canonical_value_hypothesis_creation_attestation_v1"
      : source.sourceKind === "MEASUREMENT_PLAN"
        ? "canonical_hypothesis_edge_v1"
        : "canonical_measurement_lineage_v1";
  const { [attestationField]: _sourceAttestation, ...validationWithoutSourceAttestation } =
    source.validation;
  return aiValueEngine.aggregateClaimHash("FT_CANONICAL_IDENTITY_SOURCE_SEMANTICS_V1", {
    source_kind: source.sourceKind,
    source_row_id: source.rowId,
    org_id: source.orgId,
    stable_source_id: source.stableId,
    version: source.version,
    predecessor_row_id: source.predecessorRowId,
    payload: source.payload,
    validation: validationWithoutSourceAttestation,
    authority: source.authority
  });
};

const withCommitment = (
  source: Omit<CanonicalIdentitySourceRow, "semanticCommitment">
): CanonicalIdentitySourceRow => ({
  ...source,
  semanticCommitment: canonicalIdentitySourceSemanticCommitment(source)
});

const journalHead = async (
  sourceKind: CanonicalIdentitySourceKind,
  orgId: string,
  stableId: string
): Promise<CanonicalIdentityJournalHead | null> => {
  const row = await getPrisma().aiValueCanonicalIdentityFamilyHeadJournal.findFirst({
    where: { sourceKind, orgId, stableSourceId: stableId },
    orderBy: { version: "desc" }
  });
  return row
    ? {
        sourceKind: row.sourceKind as CanonicalIdentitySourceKind,
        orgId: row.orgId,
        stableId: row.stableSourceId,
        version: row.version,
        sourceRowId: row.sourceRowId,
        predecessorRowId: row.predecessorRowId,
        sourceSemanticCommitment: row.sourceSemanticCommitment,
        sourceAttestationCommitment: row.sourceAttestationCommitment,
        attestationState: row.attestationState
      }
    : null;
};

const journalVersion = async (
  sourceKind: CanonicalIdentitySourceKind,
  orgId: string,
  stableId: string,
  version: number
): Promise<CanonicalIdentityJournalHead | null> => {
  const row = await getPrisma().aiValueCanonicalIdentityFamilyHeadJournal.findUnique({
    where: {
      sourceKind_orgId_stableSourceId_version: {
        sourceKind,
        orgId,
        stableSourceId: stableId,
        version
      }
    }
  });
  return row
    ? {
        sourceKind: row.sourceKind as CanonicalIdentitySourceKind,
        orgId: row.orgId,
        stableId: row.stableSourceId,
        version: row.version,
        sourceRowId: row.sourceRowId,
        predecessorRowId: row.predecessorRowId,
        sourceSemanticCommitment: row.sourceSemanticCommitment,
        sourceAttestationCommitment: row.sourceAttestationCommitment,
        attestationState: row.attestationState
      }
    : null;
};

const journalMatches = (
  source: CanonicalIdentitySourceRow,
  head: CanonicalIdentityJournalHead | null
): head is CanonicalIdentityJournalHead =>
  Boolean(
    head &&
      head.sourceKind === source.sourceKind &&
      head.orgId === source.orgId &&
      head.stableId === source.stableId &&
      head.version === source.version &&
      head.sourceRowId === source.rowId &&
      head.predecessorRowId === source.predecessorRowId &&
      head.attestationState === "ATTESTATION_PRESENT" &&
      head.sourceSemanticCommitment === source.semanticCommitment &&
      typeof head.sourceAttestationCommitment === "string"
  );

export async function loadCanonicalIdentityExactSources(
  orgId: string,
  selector: aiValueEngine.CanonicalIdentitySelector
): Promise<CanonicalIdentityExactSources | null> {
  const parsed = aiValueEngine.CanonicalIdentitySelectorSchema.safeParse(selector);
  if (!parsed.success) return null;

  const [hypothesisRow, planRow, cellRow] = await Promise.all([
    getPrisma().valueHypothesis.findFirst({
      where: {
        orgId,
        valueHypothesisId: parsed.data.value_hypothesis_id,
        version: parsed.data.value_hypothesis_version
      }
    }),
    getPrisma().measurementPlan.findFirst({
      where: {
        orgId,
        measurementPlanId: parsed.data.measurement_plan_id,
        version: parsed.data.measurement_plan_version
      }
    }),
    getPrisma().measurementCellSnapshot.findFirst({
      where: {
        orgId,
        measurementCellId: parsed.data.measurement_cell_id,
        version: parsed.data.measurement_cell_version
      }
    })
  ]);
  if (!hypothesisRow || !planRow || !cellRow) return null;

  const hypothesis = withCommitment({
    sourceKind: "VALUE_HYPOTHESIS",
    rowId: hypothesisRow.id,
    orgId: hypothesisRow.orgId,
    stableId: hypothesisRow.valueHypothesisId,
    version: hypothesisRow.version,
    predecessorRowId: hypothesisRow.supersedesId,
    validation: record(hypothesisRow.validationJson),
    payload: record(hypothesisRow.payloadJson),
    authority: {
      status: hypothesisRow.status,
      workflow_family: hypothesisRow.workflowFamily,
      value_route: hypothesisRow.valueRoute,
      hypothesis_statement: hypothesisRow.hypothesisStatement,
      business_objective: hypothesisRow.businessObjective
    }
  });
  const plan = withCommitment({
    sourceKind: "MEASUREMENT_PLAN",
    rowId: planRow.id,
    orgId: planRow.orgId,
    stableId: planRow.measurementPlanId,
    version: planRow.version,
    predecessorRowId: planRow.supersedesId,
    validation: record(planRow.validationJson),
    payload: record(planRow.payloadJson),
    authority: {
      value_hypothesis_id: planRow.valueHypothesisId,
      workflow_family: planRow.workflowFamily,
      approved_aggregate_grain: planRow.approvedAggregateGrain,
      baseline_window_start: planRow.baselineWindowStart.toISOString(),
      baseline_window_end: planRow.baselineWindowEnd.toISOString(),
      comparison_window_start: planRow.comparisonWindowStart?.toISOString() ?? null,
      comparison_window_end: planRow.comparisonWindowEnd?.toISOString() ?? null,
      readiness_state: planRow.readinessState
    }
  });
  const measurementCell = withCommitment({
    sourceKind: "MEASUREMENT_CELL",
    rowId: cellRow.id,
    orgId: cellRow.orgId,
    stableId: cellRow.measurementCellId,
    version: cellRow.version,
    predecessorRowId: cellRow.supersedesId,
    validation: record(cellRow.validationJson),
    payload: record(cellRow.payloadJson),
    authority: {
      measurement_plan_id: cellRow.measurementPlanId,
      aggregate_source_system: cellRow.aggregateSourceSystem,
      value_hypothesis_id: cellRow.valueHypothesisId,
      value_hypothesis_ref: cellRow.valueHypothesisRef,
      approval_state: cellRow.approvalState,
      approved_by_role: cellRow.approvedByRole,
      metric_owner_approval_state: cellRow.metricOwnerApprovalState,
      metric_id: cellRow.metricId,
      metric_definition_ref: cellRow.metricDefinitionRef,
      metric_definition_hash: cellRow.metricDefinitionHash,
      metric_direction: cellRow.metricDirection,
      metric_unit: cellRow.metricUnit,
      workflow_id: cellRow.workflowId,
      cohort_key: cellRow.cohortKey,
      baseline_window_start: cellRow.baselineWindowStart.toISOString(),
      baseline_window_end: cellRow.baselineWindowEnd.toISOString(),
      comparison_window_start: cellRow.comparisonWindowStart.toISOString(),
      comparison_window_end: cellRow.comparisonWindowEnd.toISOString()
    }
  });

  const [hypothesisHead, planHead, measurementCellHead, hypothesisPredecessorJournal] =
    await Promise.all([
      journalHead("VALUE_HYPOTHESIS", orgId, hypothesis.stableId),
      journalHead("MEASUREMENT_PLAN", orgId, plan.stableId),
      journalHead("MEASUREMENT_CELL", orgId, measurementCell.stableId),
      hypothesis.version === 1
        ? Promise.resolve(null)
        : journalVersion("VALUE_HYPOTHESIS", orgId, hypothesis.stableId, hypothesis.version - 1)
    ]);
  if (
    !journalMatches(hypothesis, hypothesisHead) ||
    !journalMatches(plan, planHead) ||
    !journalMatches(measurementCell, measurementCellHead)
  ) {
    return null;
  }

  return {
    hypothesis,
    plan,
    measurementCell,
    journalHeads: {
      hypothesis: hypothesisHead,
      plan: planHead,
      measurementCell: measurementCellHead
    },
    hypothesisPredecessorJournal
  };
}
