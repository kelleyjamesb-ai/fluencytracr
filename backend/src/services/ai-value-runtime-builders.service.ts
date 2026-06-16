import { aiValueEngine } from "@learnaire/shared";

import {
  AiValuePersistenceValidationError,
  listAiValueSourcePackageRefs,
  loadAiValueMeasurementPlan,
  persistAiValueClaimReadinessSnapshot,
  persistAiValueEvidenceSnapshot,
  persistAiValueExecutiveReadoutSnapshot,
  persistAiValuePilotRun
} from "../repositories/ai-value-minimal-persistence.repository";
import type {
  AiValueClaimReadinessSnapshotStoredRecord,
  AiValueEvidenceSnapshotStoredRecord,
  AiValueExecutiveReadoutSnapshotStoredRecord,
  AiValueMeasurementPlanStoredRecord,
  AiValuePilotRunStoredRecord,
  AiValueSourcePackageRefStoredRecord
} from "../store";

export class AiValueRuntimeBuilderError extends Error {
  gaps: string[];

  constructor(message: string, gaps: string[]) {
    super(message);
    this.name = "AiValueRuntimeBuilderError";
    this.gaps = gaps;
  }
}

export interface BuildAiValueRuntimeHandoffInput {
  orgId: string;
  measurementPlanId: string;
  measurementPlanVersion?: number;
  sourcePackages: Record<string, unknown>[];
  evidenceSnapshotId?: string;
  evidenceSnapshotVersion?: number;
  handoffId?: string;
  claimReadinessSnapshotId?: string;
  claimReadinessSnapshotVersion?: number;
  executiveReadoutSnapshotId?: string;
  executiveReadoutSnapshotVersion?: number;
  pilotRunId?: string;
  pilotRunVersion?: number;
  generatedAt?: string;
  createdByRole: string;
}

export interface AiValueRuntimeHandoffResult {
  measurementPlan: AiValueMeasurementPlanStoredRecord;
  sourcePackageRefs: AiValueSourcePackageRefStoredRecord[];
  assembly: ReturnType<typeof aiValueEngine.buildEvidenceSnapshotInputFromMeasurementPlanAndSourcePackages>;
  evidenceSnapshot: Record<string, unknown>;
  persistedEvidenceSnapshot: AiValueEvidenceSnapshotStoredRecord;
  handoff: ReturnType<typeof aiValueEngine.buildClaimReadinessHandoffFromEvidenceSnapshot>;
  claimReadinessSnapshot?: ReturnType<typeof aiValueEngine.buildClaimReadinessSnapshotFromEvidenceSnapshotAndHandoff>;
  persistedClaimReadinessSnapshot?: AiValueClaimReadinessSnapshotStoredRecord;
  executiveReadoutSnapshot?: ReturnType<typeof aiValueEngine.buildExecutiveReadoutSnapshotFromClaimReadinessSnapshot>;
  persistedExecutiveReadoutSnapshot?: AiValueExecutiveReadoutSnapshotStoredRecord;
  persistedPilotRun?: AiValuePilotRunStoredRecord;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const stringsOf = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

const packageKMinClear = (pkg: Record<string, unknown>): boolean => {
  const kMinPosture = asRecord(pkg.k_min_posture);
  return kMinPosture.cohort_threshold_met === true &&
    Number(pkg.minimum_cohort_threshold ?? 0) >= 5 &&
    Number(kMinPosture.minimum_cohort_threshold ?? 0) >= 5 &&
    Number(kMinPosture.suppressed_or_unknown_slices ?? 0) === 0 &&
    Number(kMinPosture.total_slices ?? 0) > 0 &&
    Number(kMinPosture.k_min_clear_slices ?? -1) === Number(kMinPosture.total_slices ?? 0);
};

const sourcePackageId = (pkg: Record<string, unknown>): string =>
  typeof pkg.source_package_id === "string" ? pkg.source_package_id : "";

const bindSourcePackagesToPersistedRefs = (
  sourcePackages: Record<string, unknown>[],
  sourcePackageRefs: AiValueSourcePackageRefStoredRecord[]
): string[] => {
  const gaps: string[] = [];
  if (sourcePackages.length === 0) {
    gaps.push("at least one full Source Package input is required for runtime assembly");
  }
  if (sourcePackageRefs.length === 0) {
    gaps.push("at least one persisted source package ref is required for runtime assembly");
  }
  const packagesById = new Map(sourcePackages.map((pkg) => [sourcePackageId(pkg), pkg]));
  const refsById = new Map(sourcePackageRefs.map((ref) => [ref.source_package_id, ref]));
  const typeCounts = new Map<string, number>();
  for (const pkg of sourcePackages) {
    const type = typeof pkg.source_package_type === "string" ? pkg.source_package_type : "unknown";
    typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
  }
  for (const [type, count] of typeCounts.entries()) {
    if (count > 1) {
      gaps.push(`source package type ${type} is duplicated and must be selected explicitly before runtime assembly`);
    }
  }

  for (const ref of sourcePackageRefs) {
    const pkg = packagesById.get(ref.source_package_id);
    if (!pkg) {
      gaps.push(`persisted source package ref ${ref.source_package_id} is missing its validated source package input`);
      continue;
    }
    const coveredWindow = asRecord(pkg.covered_window);
    const comparisons: Array<[string, unknown, unknown]> = [
      ["org_id", ref.org_id, pkg.org_id],
      ["source_package_type", ref.source_package_type, pkg.source_package_type],
      ["schema_version", ref.schema_version, pkg.schema_version],
      ["derivation_version", ref.derivation_version, pkg.derivation_version],
      ["approved_aggregate_grain", ref.approved_aggregate_grain, pkg.approved_aggregate_grain],
      ["minimum_cohort_threshold", ref.minimum_cohort_threshold, pkg.minimum_cohort_threshold],
      ["evidence_state", ref.evidence_state, pkg.evidence_state],
      ["covered_window.window_start", ref.covered_window_start.slice(0, 10), coveredWindow.window_start],
      ["covered_window.window_end", ref.covered_window_end.slice(0, 10), coveredWindow.window_end]
    ];
    for (const [field, expected, actual] of comparisons) {
      if (String(expected) !== String(actual)) {
        gaps.push(`source package ${ref.source_package_id} ${field} does not match persisted ref`);
      }
    }
    if (stableStringify(ref.source_refs) !== stableStringify(asRecord(pkg.source_refs))) {
      gaps.push(`source package ${ref.source_package_id} source_refs do not match persisted ref`);
    }
    if (stableStringify(ref.k_min_posture) !== stableStringify(asRecord(pkg.k_min_posture))) {
      gaps.push(`source package ${ref.source_package_id} k_min_posture does not match persisted ref`);
    }
    if (stableStringify(ref.privacy_boundary) !== stableStringify(asRecord(pkg.privacy_boundary))) {
      gaps.push(`source package ${ref.source_package_id} privacy_boundary does not match persisted ref`);
    }
  }

  for (const pkg of sourcePackages) {
    const id = sourcePackageId(pkg);
    if (!id || !refsById.has(id)) {
      gaps.push(`source package ${id || "unknown"} has no persisted metadata ref`);
    }
  }

  return gaps;
};

const suppressionOrKMinGaps = (
  sourcePackages: Record<string, unknown>[],
  evidenceSnapshot: Record<string, unknown>
): string[] => {
  const gaps: string[] = [];
  const suppression = asRecord(evidenceSnapshot.suppression);
  const suppressedLanes = stringsOf(suppression.suppressed_lanes);
  if (suppressedLanes.length > 0) {
    gaps.push("draft evidence snapshot has active suppression and cannot be persisted by the runtime builder");
  }
  if (
    suppression.hidden_values_exposed !== undefined &&
    suppression.hidden_values_exposed !== false
  ) {
    gaps.push("draft evidence snapshot suppression posture does not prove hidden values remain unexposed");
  }
  for (const pkg of sourcePackages) {
    if (!packageKMinClear(pkg)) {
      gaps.push(`source package ${sourcePackageId(pkg) || "unknown"} failed k-min and cannot feed runtime persistence`);
    }
  }
  return gaps;
};

const runStatusForCoverage = (
  coverageStatus: string,
  requiredCaveats: string[]
): string => {
  if (/held/i.test(coverageStatus)) {
    return coverageStatus === "held_for_governance"
      ? "held_for_governance"
      : "held_for_source_binding";
  }
  return requiredCaveats.length > 0 ? "completed_with_caveats" : "completed";
};

export async function buildAiValueClaimReadinessHandoffInternal(
  input: BuildAiValueRuntimeHandoffInput
): Promise<AiValueRuntimeHandoffResult> {
  const measurementPlan = await loadAiValueMeasurementPlan({
    orgId: input.orgId,
    measurementPlanId: input.measurementPlanId,
    version: input.measurementPlanVersion
  });
  if (!measurementPlan) {
    throw new AiValueRuntimeBuilderError("measurement plan not found", [
      "persisted Measurement Plan is required before runtime assembly"
    ]);
  }

  const planValidation = aiValueEngine.validateMeasurementPlan(measurementPlan.payload);
  if (!planValidation.valid) {
    throw new AiValueRuntimeBuilderError("persisted measurement plan failed validation", planValidation.gaps);
  }

  const sourcePackageRefs = await listAiValueSourcePackageRefs({
    orgId: input.orgId,
    measurementPlanId: input.measurementPlanId,
    latestOnly: true
  });
  const sourceBindingGaps = bindSourcePackagesToPersistedRefs(
    input.sourcePackages,
    sourcePackageRefs
  );
  if (sourceBindingGaps.length > 0) {
    throw new AiValueRuntimeBuilderError("source packages are not bound to persisted refs", sourceBindingGaps);
  }

  const assembly = aiValueEngine.buildEvidenceSnapshotInputFromMeasurementPlanAndSourcePackages(
    measurementPlan.payload,
    input.sourcePackages,
    {
      evidenceSnapshotId: input.evidenceSnapshotId,
      generatedAt: input.generatedAt
    }
  );
  const assemblyValidation = aiValueEngine.validateEvidenceCollectionAssembly(assembly);
  if (!assemblyValidation.valid) {
    throw new AiValueRuntimeBuilderError(
      "evidence collection assembly failed validation",
      assemblyValidation.gaps
    );
  }

  const evidenceSnapshot = assembly.draft_evidence_snapshot_input as Record<string, unknown>;
  const snapshotValidation = aiValueEngine.validateEvidenceSnapshot(evidenceSnapshot);
  if (!snapshotValidation.valid) {
    throw new AiValueRuntimeBuilderError("evidence snapshot failed validation", snapshotValidation.gaps);
  }

  const fullPlaybookPlan =
    measurementPlan.readiness_state === "ready_for_full_playbook_snapshot";
  const coverageStatus = String(asRecord(evidenceSnapshot.playbook_coverage).coverage_status ?? "");
  if (fullPlaybookPlan && coverageStatus !== "full_playbook_coverage") {
    throw new AiValueRuntimeBuilderError("full Playbook runtime build is missing required evidence", [
      "ready_for_full_playbook_snapshot measurement plans must produce full_playbook_coverage before persistence"
    ]);
  }

  const closedGaps = suppressionOrKMinGaps(input.sourcePackages, evidenceSnapshot);
  if (closedGaps.length > 0) {
    throw new AiValueRuntimeBuilderError("runtime builder failed closed", closedGaps);
  }

  const persistedEvidenceSnapshot = await persistAiValueEvidenceSnapshot({
    evidenceSnapshot,
    version: input.evidenceSnapshotVersion ?? 1,
    createdByRole: input.createdByRole
  }).catch((error) => {
    if (error instanceof AiValuePersistenceValidationError) {
      throw new AiValueRuntimeBuilderError("evidence snapshot persistence failed validation", error.gaps);
    }
    throw error;
  });

  const handoff = aiValueEngine.buildClaimReadinessHandoffFromEvidenceSnapshot(
    evidenceSnapshot,
    {
      handoffId: input.handoffId,
      createdAt: input.generatedAt
    }
  );
  const handoffValidation = aiValueEngine.validateClaimReadinessHandoff(handoff);
  if (!handoffValidation.valid) {
    throw new AiValueRuntimeBuilderError("claim readiness handoff failed validation", handoffValidation.gaps);
  }

  const shouldPersistClaimReadinessSnapshot = Boolean(
    input.claimReadinessSnapshotId || input.executiveReadoutSnapshotId
  );
  const claimReadinessSnapshot = shouldPersistClaimReadinessSnapshot
    ? aiValueEngine.buildClaimReadinessSnapshotFromEvidenceSnapshotAndHandoff(
        evidenceSnapshot,
        handoff,
        {
          claimReadinessSnapshotId: input.claimReadinessSnapshotId,
          createdAt: input.generatedAt
        }
      )
    : undefined;
  const persistedClaimReadinessSnapshot = claimReadinessSnapshot
    ? await persistAiValueClaimReadinessSnapshot({
        claimReadinessSnapshot: claimReadinessSnapshot as unknown as Record<string, unknown>,
        version: input.claimReadinessSnapshotVersion ?? 1,
        createdByRole: input.createdByRole
      }).catch((error) => {
        if (error instanceof AiValuePersistenceValidationError) {
          throw new AiValueRuntimeBuilderError("Claim Readiness Snapshot persistence failed validation", error.gaps);
        }
        throw error;
      })
    : undefined;

  const executiveReadoutSnapshot = input.executiveReadoutSnapshotId
    ? aiValueEngine.buildExecutiveReadoutSnapshotFromClaimReadinessSnapshot(
        claimReadinessSnapshot,
        {
          executiveReadoutSnapshotId: input.executiveReadoutSnapshotId,
          createdAt: input.generatedAt
        }
      )
    : undefined;
  const persistedExecutiveReadoutSnapshot = executiveReadoutSnapshot
    ? await persistAiValueExecutiveReadoutSnapshot({
        executiveReadoutSnapshot: executiveReadoutSnapshot as unknown as Record<string, unknown>,
        version: input.executiveReadoutSnapshotVersion ?? 1,
        createdByRole: input.createdByRole
      }).catch((error) => {
        if (error instanceof AiValuePersistenceValidationError) {
          throw new AiValueRuntimeBuilderError("Executive Readout Snapshot persistence failed validation", error.gaps);
        }
        throw error;
      })
    : undefined;

  const persistedPilotRun = input.pilotRunId
    ? await persistAiValuePilotRun({
        pilotRun: {
          pilot_run_id: input.pilotRunId,
          org_id: input.orgId,
          measurement_plan_id: input.measurementPlanId,
          workflow_family: measurementPlan.workflow_family,
          source_package_ids: sourcePackageRefs.map((ref) => ref.source_package_id),
          evidence_snapshot_id: persistedEvidenceSnapshot.evidence_snapshot_id,
          claim_readiness_handoff_id: handoff.handoff_id,
          coverage_status: coverageStatus,
          run_status: runStatusForCoverage(
            coverageStatus,
            stringsOf(handoff.required_caveats)
          ),
          required_caveats: stringsOf(handoff.required_caveats),
          blocked_uses: stringsOf(handoff.blocked_uses),
          validation: {
            valid: true,
            evidence_snapshot_persisted: true,
            claim_readiness_handoff_validated: true,
            claim_readiness_snapshot_persisted: Boolean(persistedClaimReadinessSnapshot),
            executive_readout_snapshot_persisted: Boolean(persistedExecutiveReadoutSnapshot)
          },
          ...(persistedClaimReadinessSnapshot
            ? {
                claim_readiness_snapshot_id:
                  persistedClaimReadinessSnapshot.claim_readiness_snapshot_id
              }
            : {}),
          ...(persistedExecutiveReadoutSnapshot
            ? {
                executive_readout_snapshot_id:
                  persistedExecutiveReadoutSnapshot.executive_readout_snapshot_id
              }
            : {}),
          generated_at: input.generatedAt ?? new Date().toISOString()
        },
        version: input.pilotRunVersion ?? 1,
        createdByRole: input.createdByRole
      }).catch((error) => {
        if (error instanceof AiValuePersistenceValidationError) {
          throw new AiValueRuntimeBuilderError("pilot run ledger persistence failed validation", error.gaps);
        }
        throw error;
      })
    : undefined;

  return {
    measurementPlan,
    sourcePackageRefs,
    assembly,
    evidenceSnapshot,
    persistedEvidenceSnapshot,
    handoff,
    ...(claimReadinessSnapshot ? { claimReadinessSnapshot } : {}),
    ...(persistedClaimReadinessSnapshot ? { persistedClaimReadinessSnapshot } : {}),
    ...(executiveReadoutSnapshot ? { executiveReadoutSnapshot } : {}),
    ...(persistedExecutiveReadoutSnapshot ? { persistedExecutiveReadoutSnapshot } : {}),
    ...(persistedPilotRun ? { persistedPilotRun } : {})
  };
}
