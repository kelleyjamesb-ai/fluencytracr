import fs from "node:fs";
import path from "node:path";

import {
  buildAiValueClaimReadinessHandoffInternal,
  AiValueRuntimeBuilderError
} from "../src/services/ai-value-runtime-builders.service";
import {
  persistAiValueHypothesisFromMeasurementPlan,
  persistAiValueMeasurementPlan,
  persistAiValueSourcePackageRef
} from "../src/repositories/ai-value-minimal-persistence.repository";
import { store } from "../src/store";

const EXAMPLE_ROOT = path.resolve(__dirname, "../../docs/contracts");
const REPO_ROOT = path.resolve(__dirname, "../..");

const readJson = (relativePath: string) =>
  JSON.parse(fs.readFileSync(path.join(EXAMPLE_ROOT, relativePath), "utf8"));

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const layer1Plan = () =>
  readJson("ai-value-measurement-plan/examples/layer-1-only-draft-plan.json");

const fullPlan = () =>
  readJson("ai-value-measurement-plan/examples/full-playbook-ready-plan.json");

const sourcePackage = (name: string) =>
  readJson(`ai-value-source-packages/examples/${name}.json`);

const layer1Package = () => sourcePackage("layer-1-bigquery-telemetry-package");
const layer2Package = () => sourcePackage("layer-2-user-voice-package");
const layer3Package = () => sourcePackage("layer-3-system-of-record-outcome-package");
const governancePackage = () => sourcePackage("governance-control-package");
const assumptionPackage = () => sourcePackage("assumption-approval-package");
const workforcePackage = () => sourcePackage("aggregate-workforce-context-package");

beforeEach(() => {
  store.reset();
});

const persistPlan = async (plan: any) => {
  const hypothesis = await persistAiValueHypothesisFromMeasurementPlan({
    measurementPlan: plan,
    version: 1,
    createdByRole: "value_realization_pm"
  });
  return persistAiValueMeasurementPlan({
    measurementPlan: plan,
    version: 1,
    valueHypothesisId: hypothesis.value_hypothesis_id,
    createdByRole: "value_realization_pm"
  });
};

const persistRefs = async (plan: any, packages: any[]) => {
  for (const pkg of packages) {
    await persistAiValueSourcePackageRef({
      sourcePackage: pkg,
      version: 1,
      measurementPlanId: plan.measurement_plan_id,
      workflowFamily: plan.workflow_scope.workflow_family,
      createdByRole: "data_platform_owner"
    });
  }
};

describe("AI Value runtime builders internal service", () => {
  it("builds a telemetry-only caveated handoff without full coverage or persisted handoff state", async () => {
    const plan = layer1Plan();
    const layer1 = layer1Package();
    await persistPlan(plan);
    await persistRefs(plan, [layer1]);

    const result = await buildAiValueClaimReadinessHandoffInternal({
      orgId: plan.org_id,
      measurementPlanId: plan.measurement_plan_id,
      sourcePackages: [layer1],
      evidenceSnapshotId: "runtime_snapshot_telemetry_only",
      handoffId: "runtime_handoff_telemetry_only",
      generatedAt: "2026-06-13T18:00:00.000Z",
      createdByRole: "value_realization_pm"
    });

    expect(result.evidenceSnapshot.playbook_coverage.coverage_status).toBe("layer_1_only");
    expect(result.evidenceSnapshot.required_caveats).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Layer 2/i),
        expect.stringMatching(/Layer 3/i)
      ])
    );
    expect(result.persistedEvidenceSnapshot.evidence_snapshot_id).toBe(
      "runtime_snapshot_telemetry_only"
    );
    expect(result.handoff.persistence_policy.persisted).toBe(false);
    expect(result.handoff.financial_boundary.roi_claim_allowed).toBe(false);
    expect(result.handoff.financial_boundary.ebita_claim_allowed).toBe(false);
    expect(result.handoff.financial_boundary.customer_facing_financial_output_allowed).toBe(false);
    expect(store.aiValueEvidenceSnapshots.size).toBe(1);
  });

  it("builds full Playbook coverage only when all required evidence packages are bound", async () => {
    const plan = fullPlan();
    const packages = [
      layer1Package(),
      layer2Package(),
      layer3Package(),
      governancePackage(),
      assumptionPackage()
    ];
    await persistPlan(plan);
    await persistRefs(plan, packages);

    const result = await buildAiValueClaimReadinessHandoffInternal({
      orgId: plan.org_id,
      measurementPlanId: plan.measurement_plan_id,
      sourcePackages: packages,
      evidenceSnapshotId: "runtime_snapshot_full_playbook",
      handoffId: "runtime_handoff_full_playbook",
      generatedAt: "2026-06-13T18:01:00.000Z",
      createdByRole: "value_realization_pm"
    });

    expect(result.evidenceSnapshot.playbook_coverage.coverage_status).toBe(
      "full_playbook_coverage"
    );
    expect(result.handoff.playbook_coverage.coverage_status).toBe(
      "full_playbook_coverage"
    );
    expect(result.handoff.executive_readout_boundary.customer_facing_readout_allowed).toBe(false);
    expect(result.handoff.financial_boundary.customer_facing_financial_output_allowed).toBe(false);
  });

  it("fails closed when a full Playbook plan is missing required source packages", async () => {
    const plan = fullPlan();
    const packages = [layer1Package(), layer2Package(), governancePackage(), assumptionPackage()];
    await persistPlan(plan);
    await persistRefs(plan, packages);

    await expect(
      buildAiValueClaimReadinessHandoffInternal({
        orgId: plan.org_id,
        measurementPlanId: plan.measurement_plan_id,
        sourcePackages: packages,
        evidenceSnapshotId: "runtime_snapshot_missing_layer_3",
        handoffId: "runtime_handoff_missing_layer_3",
        generatedAt: "2026-06-13T18:02:00.000Z",
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValueRuntimeBuilderError);

    expect(store.aiValueEvidenceSnapshots.size).toBe(0);
  });

  it("fails closed on unsafe source package privacy before evidence persistence", async () => {
    const plan = layer1Plan();
    const persistedLayer1 = layer1Package();
    const unsafeLayer1 = clone(persistedLayer1);
    unsafeLayer1.privacy_boundary.contains_direct_identifiers = true;
    await persistPlan(plan);
    await persistRefs(plan, [persistedLayer1]);

    await expect(
      buildAiValueClaimReadinessHandoffInternal({
        orgId: plan.org_id,
        measurementPlanId: plan.measurement_plan_id,
        sourcePackages: [unsafeLayer1],
        evidenceSnapshotId: "runtime_snapshot_unsafe_privacy",
        handoffId: "runtime_handoff_unsafe_privacy",
        generatedAt: "2026-06-13T18:03:00.000Z",
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValueRuntimeBuilderError);

    expect(store.aiValueEvidenceSnapshots.size).toBe(0);
  });

  it("fails closed on k-min or suppression before evidence persistence", async () => {
    const plan = layer1Plan();
    const suppressedLayer1 = layer1Package();
    suppressedLayer1.evidence_state = "suppressed";
    suppressedLayer1.k_min_posture.cohort_threshold_met = false;
    suppressedLayer1.k_min_posture.k_min_clear_slices = 0;
    suppressedLayer1.k_min_posture.suppressed_or_unknown_slices = 1;
    suppressedLayer1.caveats = [
      "Layer 1 package failed k-min and must remain suppressed."
    ];
    await persistPlan(plan);
    await persistRefs(plan, [suppressedLayer1]);

    await expect(
      buildAiValueClaimReadinessHandoffInternal({
        orgId: plan.org_id,
        measurementPlanId: plan.measurement_plan_id,
        sourcePackages: [suppressedLayer1],
        evidenceSnapshotId: "runtime_snapshot_suppressed",
        handoffId: "runtime_handoff_suppressed",
        generatedAt: "2026-06-13T18:04:00.000Z",
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValueRuntimeBuilderError);

    expect(store.aiValueEvidenceSnapshots.size).toBe(0);
  });

  it("keeps VBD and aggregate workforce context from upgrading coverage or financial flags", async () => {
    const plan = layer1Plan();
    const packages = [layer1Package(), workforcePackage()];
    await persistPlan(plan);
    await persistRefs(plan, packages);

    const result = await buildAiValueClaimReadinessHandoffInternal({
      orgId: plan.org_id,
      measurementPlanId: plan.measurement_plan_id,
      sourcePackages: packages,
      evidenceSnapshotId: "runtime_snapshot_workforce_context",
      handoffId: "runtime_handoff_workforce_context",
      generatedAt: "2026-06-13T18:05:00.000Z",
      createdByRole: "value_realization_pm"
    });

    expect(result.evidenceSnapshot.playbook_coverage.coverage_status).toBe("layer_1_only");
    expect(result.evidenceSnapshot.aggregate_workforce_context.context_state).toBe(
      "provided_aggregate_safe"
    );
    expect(result.handoff.financial_boundary.financial_translation_allowed).toBe(false);
    expect(result.handoff.blocked_claims).toEqual(
      expect.arrayContaining([
        "roi_proof",
        "ebita_claim",
        "customer_facing_economic_output"
      ])
    );
  });

  it("requires source packages to be bound to persisted source package refs", async () => {
    const plan = layer1Plan();
    const layer1 = layer1Package();
    await persistPlan(plan);

    await expect(
      buildAiValueClaimReadinessHandoffInternal({
        orgId: plan.org_id,
        measurementPlanId: plan.measurement_plan_id,
        sourcePackages: [layer1],
        evidenceSnapshotId: "runtime_snapshot_unbound_source",
        handoffId: "runtime_handoff_unbound_source",
        generatedAt: "2026-06-13T18:06:00.000Z",
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValueRuntimeBuilderError);

    expect(store.aiValueEvidenceSnapshots.size).toBe(0);
  });

  it("fails closed when a runtime source package drifts from the persisted ref", async () => {
    const plan = layer1Plan();
    const persistedLayer1 = layer1Package();
    const driftedLayer1 = clone(persistedLayer1);
    driftedLayer1.privacy_boundary.aggregate_only = false;
    await persistPlan(plan);
    await persistRefs(plan, [persistedLayer1]);

    await expect(
      buildAiValueClaimReadinessHandoffInternal({
        orgId: plan.org_id,
        measurementPlanId: plan.measurement_plan_id,
        sourcePackages: [driftedLayer1],
        evidenceSnapshotId: "runtime_snapshot_drifted_source",
        handoffId: "runtime_handoff_drifted_source",
        generatedAt: "2026-06-13T18:07:00.000Z",
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValueRuntimeBuilderError);

    expect(store.aiValueEvidenceSnapshots.size).toBe(0);
  });

  it("fails closed on ambiguous duplicate source package types", async () => {
    const plan = layer1Plan();
    const layer1 = layer1Package();
    const duplicateLayer1 = clone(layer1);
    duplicateLayer1.source_package_id = "source_package_layer_1_duplicate";
    duplicateLayer1.source_refs.aggregate_probe_id = "aggregate_probe_duplicate";
    await persistPlan(plan);
    await persistRefs(plan, [layer1, duplicateLayer1]);

    await expect(
      buildAiValueClaimReadinessHandoffInternal({
        orgId: plan.org_id,
        measurementPlanId: plan.measurement_plan_id,
        sourcePackages: [layer1, duplicateLayer1],
        evidenceSnapshotId: "runtime_snapshot_duplicate_source_type",
        handoffId: "runtime_handoff_duplicate_source_type",
        generatedAt: "2026-06-13T18:08:00.000Z",
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValueRuntimeBuilderError);

    expect(store.aiValueEvidenceSnapshots.size).toBe(0);
  });

  it("adds no public backend route or frontend UI", () => {
    const appSource = fs.readFileSync(path.join(REPO_ROOT, "backend/src/app.ts"), "utf8");
    expect(appSource).not.toContain("ai-value-runtime-builders.service");

    const frontendFiles = fs.readdirSync(path.join(REPO_ROOT, "frontend/src"));
    expect(frontendFiles).not.toContain("AiValueRuntimeBuilder.tsx");
  });
});
