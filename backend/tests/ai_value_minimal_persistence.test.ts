import fs from "node:fs";
import path from "node:path";

import { aiValueEngine } from "@learnaire/shared";

import {
  AiValuePersistenceAlreadyExistsError,
  AiValuePersistenceValidationError,
  persistAiValueClaimReadinessSnapshot,
  persistAiValueEvidenceSnapshot,
  persistAiValueExecutiveReadoutSnapshot,
  persistAiValueHypothesisFromMeasurementPlan,
  persistAiValueMeasurementPlan,
  persistAiValuePilotRun,
  persistAiValueSourcePackageRef
} from "../src/repositories/ai-value-minimal-persistence.repository";
import { store } from "../src/store";

const EXAMPLE_ROOT = path.resolve(__dirname, "../../docs/contracts");
const MIGRATION = path.resolve(
  __dirname,
  "../prisma/migrations/20260613180000_add_ai_value_minimal_persistence/migration.sql"
);
const PILOT_RUN_MIGRATION = path.resolve(
  __dirname,
  "../prisma/migrations/20260616120000_add_ai_value_pilot_run_ledger/migration.sql"
);
const SNAPSHOT_MIGRATION = path.resolve(
  __dirname,
  "../prisma/migrations/20260616140000_add_ai_value_claim_and_executive_snapshots/migration.sql"
);
const PILOT_RUN_LINEAGE_MIGRATION = path.resolve(
  __dirname,
  "../prisma/migrations/20260616150000_promote_ai_value_pilot_run_snapshot_lineage/migration.sql"
);

const readJson = (relativePath: string) =>
  JSON.parse(fs.readFileSync(path.join(EXAMPLE_ROOT, relativePath), "utf8"));

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const tableBlock = (migrationSql: string, table: string) => {
  const start = migrationSql.indexOf(`CREATE TABLE "${table}"`);
  if (start < 0) return "";
  const end = migrationSql.indexOf(");", start);
  return migrationSql.slice(start, end + 2);
};

const measurementPlan = () =>
  readJson("ai-value-measurement-plan/examples/layer-1-only-draft-plan.json");

const evidenceSnapshot = () =>
  readJson("ai-value-evidence-snapshot/examples/telemetry-only-caveated-snapshot.json");

const sourcePackage = () =>
  readJson("ai-value-source-packages/examples/layer-1-bigquery-telemetry-package.json");

const pilotRunInput = () => {
  const snapshot = evidenceSnapshot();
  return {
    pilot_run_id: "pilot_run_support_layer_1_example",
    org_id: snapshot.org_id,
    measurement_plan_id: snapshot.measurement_plan_id,
    workflow_family: snapshot.workflow.workflow_family,
    source_package_ids: ["source_package_layer_1_bigquery_telemetry_example"],
    evidence_snapshot_id: snapshot.evidence_snapshot_id,
    claim_readiness_handoff_id: "claim_readiness_handoff_layer_1_example",
    coverage_status: snapshot.playbook_coverage.coverage_status,
    run_status: "completed_with_caveats",
    required_caveats: snapshot.required_caveats,
    blocked_uses: snapshot.blocked_uses,
    validation: {
      valid: true,
      evidence_snapshot_persisted: true,
      claim_readiness_handoff_validated: true,
      claim_readiness_snapshot_persisted: false,
      executive_readout_snapshot_persisted: false
    },
    generated_at: "2026-06-13T18:00:00.000Z"
  };
};

const buildClaimSnapshotInput = () => {
  const snapshot = evidenceSnapshot();
  snapshot.source_refs.governance_control_export_ids = ["governance_control_export_example"];
  snapshot.source_refs.assumption_approval_export_ids = ["assumption_approval_export_example"];
  const handoff = aiValueEngine.buildClaimReadinessHandoffFromEvidenceSnapshot(snapshot, {
    handoffId: "claim_readiness_handoff_persistence_example",
    createdAt: "2026-06-13T18:00:00.000Z"
  });
  const claimSnapshot =
    aiValueEngine.buildClaimReadinessSnapshotFromEvidenceSnapshotAndHandoff(
      snapshot,
      handoff,
      {
        claimReadinessSnapshotId: "claim_readiness_snapshot_persistence_example",
        createdAt: "2026-06-13T18:00:00.000Z"
      }
    );
  return { snapshot, handoff, claimSnapshot };
};

const buildExecutiveReadoutSnapshotInput = () => {
  const chain = buildClaimSnapshotInput();
  const executiveReadoutSnapshot =
    aiValueEngine.buildExecutiveReadoutSnapshotFromClaimReadinessSnapshot(
      chain.claimSnapshot,
      {
        executiveReadoutSnapshotId: "executive_readout_snapshot_persistence_example",
        createdAt: "2026-06-13T18:00:00.000Z"
      }
    );
  return { ...chain, executiveReadoutSnapshot };
};

beforeEach(() => {
  store.reset();
});

describe("AI Value minimal persistence migration", () => {
  it("creates only the approved aggregate tables with RLS and direct role revokes", () => {
    const migrationSql = fs.readFileSync(MIGRATION, "utf8");

    for (const table of [
      "value_hypotheses",
      "measurement_plans",
      "source_package_refs",
      "evidence_snapshots"
    ]) {
      expect(migrationSql).toContain(`CREATE TABLE "${table}"`);
      expect(migrationSql).toContain(`'${table}'`);
    }
    expect(migrationSql).toContain("ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY");
    expect(migrationSql).toContain("REVOKE ALL ON TABLE public.%I FROM %I");
    expect(migrationSql).toContain("ARRAY['anon', 'authenticated']");

    expect(migrationSql).not.toContain("claim_readiness_snapshots");
    expect(migrationSql).not.toContain("executive_readout_snapshots");
    expect(tableBlock(migrationSql, "source_package_refs")).not.toContain('"payload_json"');
  });

  it("adds a metadata-only pilot run ledger without snapshot/readout persistence", () => {
    const migrationSql = fs.readFileSync(PILOT_RUN_MIGRATION, "utf8");

    expect(migrationSql).toContain('CREATE TABLE "ai_value_pilot_runs"');
    expect(migrationSql).toContain("ai_value_pilot_runs_immutable_key");
    expect(migrationSql).toContain('"source_package_ids_json" JSONB NOT NULL');
    expect(migrationSql).toContain('"claim_readiness_snapshot_persisted" BOOLEAN NOT NULL');
    expect(migrationSql).toContain('"executive_readout_snapshot_persisted" BOOLEAN NOT NULL');
    expect(migrationSql).toContain('"blocked_uses_json" JSONB NOT NULL');
    expect(migrationSql).toContain("ALTER TABLE public.ai_value_pilot_runs ENABLE ROW LEVEL SECURITY");
    expect(migrationSql).toContain("REVOKE ALL ON TABLE public.ai_value_pilot_runs");

    expect(migrationSql).not.toContain("claim_readiness_snapshots");
    expect(migrationSql).not.toContain("executive_readout_snapshots");
    expect(tableBlock(migrationSql, "ai_value_pilot_runs")).not.toContain('"payload_json"');
    expect(tableBlock(migrationSql, "ai_value_pilot_runs")).not.toContain('"raw_rows"');
    expect(tableBlock(migrationSql, "ai_value_pilot_runs")).not.toContain('"user_id"');
  });

  it("promotes pilot run ledger lineage for persisted claim and executive snapshots", () => {
    const migrationSql = fs.readFileSync(PILOT_RUN_LINEAGE_MIGRATION, "utf8");

    expect(migrationSql).toContain('ALTER TABLE "ai_value_pilot_runs"');
    expect(migrationSql).toContain('"claim_readiness_snapshot_id" TEXT');
    expect(migrationSql).toContain('"executive_readout_snapshot_id" TEXT');
    expect(migrationSql).toContain("DROP CONSTRAINT IF EXISTS \"ai_value_pilot_runs_no_snapshot_persistence_check\"");
    expect(migrationSql).toContain("DROP CONSTRAINT IF EXISTS \"ai_value_pilot_runs_no_readout_persistence_check\"");
    expect(migrationSql).toContain("ai_value_pilot_runs_claim_snapshot_lineage_check");
    expect(migrationSql).toContain("ai_value_pilot_runs_executive_readout_lineage_check");
    expect(migrationSql).toContain("ai_value_pilot_runs_org_id_claim_readiness_snapshot_id_idx");
    expect(migrationSql).toContain("ai_value_pilot_runs_org_id_executive_readout_snapshot_id_idx");
    expect(migrationSql).not.toContain('"raw_rows"');
    expect(migrationSql).not.toContain('"user_id"');
    expect(migrationSql).not.toContain('"customer_facing_financial_output"');
  });

  it("adds source-bound claim and executive snapshot persistence tables", () => {
    const migrationSql = fs.readFileSync(SNAPSHOT_MIGRATION, "utf8");

    for (const table of ["claim_readiness_snapshots", "executive_readout_snapshots"]) {
      expect(migrationSql).toContain(`CREATE TABLE "${table}"`);
      expect(migrationSql).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
      expect(migrationSql).toContain(`REVOKE ALL ON TABLE public.${table}`);
      expect(tableBlock(migrationSql, table)).not.toContain('"raw_rows"');
      expect(tableBlock(migrationSql, table)).not.toContain('"user_id"');
      expect(tableBlock(migrationSql, table)).not.toContain('"customer_facing_financial_output"');
    }
    expect(migrationSql).toContain("claim_readiness_snapshots_immutable_key");
    expect(migrationSql).toContain("executive_readout_snapshots_immutable_key");
    expect(migrationSql).toContain('"customer_facing_readout_allowed" BOOLEAN NOT NULL');
    expect(migrationSql).toContain('"customer_facing_financial_output_allowed" BOOLEAN NOT NULL');
  });

  it("does not introduce forbidden person-level, raw-content, or decisioning columns", () => {
    const migrationSql = fs.readFileSync(MIGRATION, "utf8").toLowerCase();
    const pilotRunMigrationSql = fs.existsSync(PILOT_RUN_MIGRATION)
      ? fs.readFileSync(PILOT_RUN_MIGRATION, "utf8").toLowerCase()
      : "";
    const snapshotMigrationSql = fs.existsSync(SNAPSHOT_MIGRATION)
      ? fs.readFileSync(SNAPSHOT_MIGRATION, "utf8").toLowerCase()
      : "";
    const columnMatches = Array.from(
      `${migrationSql}\n${pilotRunMigrationSql}\n${snapshotMigrationSql}`.matchAll(/"([a-z0-9_]+)"\s+[a-z]/g)
    ).map((match) => match[1]);

    for (const forbidden of [
      "user_id",
      "employee_id",
      "employee_email",
      "employee_name",
      "person_id",
      "hashed_user_id",
      "hashed_employee_id",
      "joinable_person_identifier",
      "raw_rows",
      "raw_content",
      "raw_prompt",
      "raw_response",
      "transcript",
      "query_text",
      "file_contents",
      "person_level_hris",
      "person_level_productivity",
      "manager_id",
      "manager_ranking",
      "team_ranking",
      "people_decisioning",
      "customer_facing_financial_output"
    ]) {
      expect(columnMatches).not.toContain(forbidden);
    }
  });
});

describe("AI Value minimal persistence repository", () => {
  it("persists validated value hypotheses and measurement plans append-only", async () => {
    const plan = measurementPlan();

    const hypothesis = await persistAiValueHypothesisFromMeasurementPlan({
      measurementPlan: plan,
      version: 1,
      createdByRole: "value_realization_pm"
    });
    const storedPlan = await persistAiValueMeasurementPlan({
      measurementPlan: plan,
      version: 1,
      valueHypothesisId: hypothesis.value_hypothesis_id,
      createdByRole: "value_realization_pm"
    });

    expect(hypothesis.value_hypothesis_id).toBe(
      plan.value_hypothesis.value_hypothesis_id
    );
    expect(storedPlan.measurement_plan_id).toBe(plan.measurement_plan_id);
    expect(storedPlan.minimum_cohort_threshold).toBe(5);
    expect(storedPlan.validation.valid).toBe(true);
    expect(store.aiValueMeasurementPlans.size).toBe(1);

    await expect(
      persistAiValueMeasurementPlan({
        measurementPlan: plan,
        version: 1,
        valueHypothesisId: hypothesis.value_hypothesis_id,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceAlreadyExistsError);

    const correctedPlan = await persistAiValueMeasurementPlan({
      measurementPlan: plan,
      version: 2,
      valueHypothesisId: hypothesis.value_hypothesis_id,
      supersedesId: storedPlan.id,
      createdByRole: "value_realization_pm"
    });

    expect(correctedPlan.version).toBe(2);
    expect(correctedPlan.supersedes_id).toBe(storedPlan.id);
    expect(store.aiValueMeasurementPlans.size).toBe(2);
  });

  it("persists source package refs as metadata only after source package validation", async () => {
    const pkg = sourcePackage();
    const ref = await persistAiValueSourcePackageRef({
      sourcePackage: pkg,
      version: 1,
      measurementPlanId: "measurement_plan_customer_support_2026_05",
      workflowFamily: "customer_support_case_resolution",
      createdByRole: "data_platform_owner"
    });

    expect(ref.source_package_id).toBe(pkg.source_package_id);
    expect(ref.source_package_type).toBe("layer_1_bigquery_telemetry_summary");
    expect(ref.version).toBe(1);
    expect(ref.validation.valid).toBe(true);
    expect(ref.source_refs).toEqual(pkg.source_refs);
    expect(ref).not.toHaveProperty("payload");
    expect(ref).not.toHaveProperty("payload_json");
    expect(store.aiValueSourcePackageRefs.size).toBe(1);

    await expect(
      persistAiValueSourcePackageRef({
        sourcePackage: pkg,
        version: 1,
        measurementPlanId: "measurement_plan_customer_support_2026_05",
        workflowFamily: "customer_support_case_resolution",
        createdByRole: "data_platform_owner"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceAlreadyExistsError);

    const corrected = await persistAiValueSourcePackageRef({
      sourcePackage: pkg,
      version: 2,
      supersedesId: ref.id,
      measurementPlanId: "measurement_plan_customer_support_2026_05",
      workflowFamily: "customer_support_case_resolution",
      createdByRole: "data_platform_owner"
    });

    expect(corrected.version).toBe(2);
    expect(corrected.supersedes_id).toBe(ref.id);
    expect(store.aiValueSourcePackageRefs.size).toBe(2);
  });

  it("persists validated Evidence Snapshots with caveats, blocked uses, and k-min posture", async () => {
    const snapshot = evidenceSnapshot();
    snapshot.source_refs.governance_control_export_ids = ["governance_control_export_example"];
    snapshot.source_refs.assumption_approval_export_ids = ["assumption_approval_export_example"];
    const stored = await persistAiValueEvidenceSnapshot({
      evidenceSnapshot: snapshot,
      version: 1,
      createdByRole: "value_realization_pm"
    });

    expect(stored.evidence_snapshot_id).toBe(snapshot.evidence_snapshot_id);
    expect(stored.coverage_status).toBe("layer_1_only");
    expect(stored.privacy_aggregate_only).toBe(true);
    expect(stored.k_min_threshold_met).toBe(false);
    expect(stored.source_refs.governance_control_export_ids).toEqual([
      "governance_control_export_example"
    ]);
    expect(stored.source_refs.assumption_approval_export_ids).toEqual([
      "assumption_approval_export_example"
    ]);
    expect(stored.required_caveats).toEqual(snapshot.required_caveats);
    expect(stored.blocked_uses).toContain("customer_facing_financial_output");
    expect(store.aiValueEvidenceSnapshots.size).toBe(1);
  });

  it("persists metadata-only pilot runs append-only with caveats and blocked uses", async () => {
    const run = pilotRunInput();
    const stored = await persistAiValuePilotRun({
      pilotRun: run,
      version: 1,
      createdByRole: "value_realization_pm"
    });

    expect(stored.pilot_run_id).toBe(run.pilot_run_id);
    expect(stored.evidence_snapshot_id).toBe(run.evidence_snapshot_id);
    expect(stored.claim_readiness_handoff_id).toBe(run.claim_readiness_handoff_id);
    expect(stored.coverage_status).toBe("layer_1_only");
    expect(stored.run_status).toBe("completed_with_caveats");
    expect(stored.claim_readiness_snapshot_persisted).toBe(false);
    expect(stored.executive_readout_snapshot_persisted).toBe(false);
    expect(stored.source_package_ids).toEqual(run.source_package_ids);
    expect(stored.required_caveats).toEqual(run.required_caveats);
    expect(stored.blocked_uses).toContain("customer_facing_financial_output");
    expect(stored.validation.valid).toBe(true);
    expect(store.aiValuePilotRuns.size).toBe(1);

    await expect(
      persistAiValuePilotRun({
        pilotRun: run,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceAlreadyExistsError);

    const corrected = await persistAiValuePilotRun({
      pilotRun: run,
      version: 2,
      supersedesId: stored.id,
      createdByRole: "value_realization_pm"
    });

    expect(corrected.version).toBe(2);
    expect(corrected.supersedes_id).toBe(stored.id);
    expect(store.aiValuePilotRuns.size).toBe(2);
  });

  it("persists pilot run lineage when claim and executive snapshots are already persisted", async () => {
    const { snapshot, claimSnapshot, executiveReadoutSnapshot } =
      buildExecutiveReadoutSnapshotInput();
    await persistAiValueEvidenceSnapshot({
      evidenceSnapshot: snapshot,
      version: 1,
      createdByRole: "value_realization_pm"
    });
    await persistAiValueClaimReadinessSnapshot({
      claimReadinessSnapshot: claimSnapshot,
      version: 1,
      createdByRole: "value_realization_pm"
    });
    await persistAiValueExecutiveReadoutSnapshot({
      executiveReadoutSnapshot,
      version: 1,
      createdByRole: "value_realization_pm"
    });

    const run = {
      ...pilotRunInput(),
      pilot_run_id: "pilot_run_support_with_snapshot_lineage",
      evidence_snapshot_id: snapshot.evidence_snapshot_id,
      claim_readiness_handoff_id: claimSnapshot.handoff_id,
      claim_readiness_snapshot_id: claimSnapshot.claim_readiness_snapshot_id,
      executive_readout_snapshot_id: executiveReadoutSnapshot.executive_readout_snapshot_id,
      validation: {
        valid: true,
        evidence_snapshot_persisted: true,
        claim_readiness_handoff_validated: true,
        claim_readiness_snapshot_persisted: true,
        executive_readout_snapshot_persisted: true
      }
    };

    const stored = await persistAiValuePilotRun({
      pilotRun: run,
      version: 1,
      createdByRole: "value_realization_pm"
    });

    expect(stored.claim_readiness_snapshot_persisted).toBe(true);
    expect(stored.executive_readout_snapshot_persisted).toBe(true);
    expect(stored.claim_readiness_snapshot_id).toBe(
      claimSnapshot.claim_readiness_snapshot_id
    );
    expect(stored.executive_readout_snapshot_id).toBe(
      executiveReadoutSnapshot.executive_readout_snapshot_id
    );
  });

  it("persists source-bound Claim Readiness Snapshots after Evidence Snapshot persistence", async () => {
    const { snapshot, claimSnapshot } = buildClaimSnapshotInput();
    await persistAiValueEvidenceSnapshot({
      evidenceSnapshot: snapshot,
      version: 1,
      createdByRole: "value_realization_pm"
    });

    const stored = await persistAiValueClaimReadinessSnapshot({
      claimReadinessSnapshot: claimSnapshot,
      version: 1,
      createdByRole: "value_realization_pm"
    });

    expect(stored.claim_readiness_snapshot_id).toBe(claimSnapshot.claim_readiness_snapshot_id);
    expect(stored.evidence_snapshot_id).toBe(snapshot.evidence_snapshot_id);
    expect(stored.handoff_id).toBe(claimSnapshot.handoff_id);
    expect(stored.coverage_status).toBe("layer_1_only");
    expect(stored.claim_readiness_state).toBe("held_for_full_playbook_coverage");
    expect(stored.financial_boundary_state).toBe(
      claimSnapshot.financial_boundary.financial_claim_governance_state
    );
    expect(stored.customer_facing_readout_allowed).toBe(false);
    expect(stored.customer_facing_financial_output_allowed).toBe(false);
    expect(stored.required_caveats).toEqual(claimSnapshot.required_caveats);
    expect(stored.blocked_claims).toContain("customer_facing_economic_output");
    expect(stored.validation.valid).toBe(true);
    expect(store.aiValueClaimReadinessSnapshots.size).toBe(1);

    await expect(
      persistAiValueClaimReadinessSnapshot({
        claimReadinessSnapshot: claimSnapshot,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceAlreadyExistsError);
  });

  it("persists source-bound Executive Readout Snapshots after Claim Readiness persistence", async () => {
    const {
      snapshot: validSnapshot,
      claimSnapshot,
      executiveReadoutSnapshot
    } =
      buildExecutiveReadoutSnapshotInput();
    await persistAiValueEvidenceSnapshot({
      evidenceSnapshot: validSnapshot,
      version: 1,
      createdByRole: "value_realization_pm"
    });
    await persistAiValueClaimReadinessSnapshot({
      claimReadinessSnapshot: claimSnapshot,
      version: 1,
      createdByRole: "value_realization_pm"
    });

    const stored = await persistAiValueExecutiveReadoutSnapshot({
      executiveReadoutSnapshot,
      version: 1,
      createdByRole: "value_realization_pm"
    });

    expect(stored.executive_readout_snapshot_id).toBe(
      executiveReadoutSnapshot.executive_readout_snapshot_id
    );
    expect(stored.claim_readiness_snapshot_id).toBe(
      claimSnapshot.claim_readiness_snapshot_id
    );
    expect(stored.readout_state).toBe("held_for_full_playbook_coverage");
    expect(stored.customer_facing_readout_allowed).toBe(false);
    expect(stored.customer_facing_financial_output_allowed).toBe(false);
    expect(stored.required_caveats).toEqual(executiveReadoutSnapshot.required_caveats);
    expect(stored.blocked_claims).toContain("customer_facing_economic_output");
    expect(stored.validation.valid).toBe(true);
    expect(store.aiValueExecutiveReadoutSnapshots.size).toBe(1);
  });

  it("fails unsafe payloads before persistence", async () => {
    const unsafePlan = clone(measurementPlan());
    unsafePlan.raw_rows = [{ user_id: "person-123" }];

    await expect(
      persistAiValueMeasurementPlan({
        measurementPlan: unsafePlan,
        version: 1,
        valueHypothesisId: unsafePlan.value_hypothesis.value_hypothesis_id,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const unsafeSnapshot = clone(evidenceSnapshot());
    unsafeSnapshot.privacy_boundary.aggregate_only = false;

    await expect(
      persistAiValueEvidenceSnapshot({
        evidenceSnapshot: unsafeSnapshot,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    expect(store.aiValueMeasurementPlans.size).toBe(0);
    expect(store.aiValueEvidenceSnapshots.size).toBe(0);
  });

  it("fails unsafe pilot run ledger records before persistence", async () => {
    const unsafeRun = clone(pilotRunInput());
    unsafeRun.raw_rows = [{ user_id: "person-123" }];

    await expect(
      persistAiValuePilotRun({
        pilotRun: unsafeRun,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const unsafeSnapshotPersistence = clone(pilotRunInput());
    unsafeSnapshotPersistence.validation.claim_readiness_snapshot_persisted = true;

    await expect(
      persistAiValuePilotRun({
        pilotRun: unsafeSnapshotPersistence,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const unsafeExecutivePersistence = clone(pilotRunInput());
    unsafeExecutivePersistence.validation.executive_readout_snapshot_persisted = true;

    await expect(
      persistAiValuePilotRun({
        pilotRun: unsafeExecutivePersistence,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    expect(store.aiValuePilotRuns.size).toBe(0);
  });

  it("fails pilot run snapshot lineage when referenced snapshots are missing or drifted", async () => {
    const { snapshot, claimSnapshot, executiveReadoutSnapshot } =
      buildExecutiveReadoutSnapshotInput();
    await persistAiValueEvidenceSnapshot({
      evidenceSnapshot: snapshot,
      version: 1,
      createdByRole: "value_realization_pm"
    });

    const missingClaimLineage = {
      ...pilotRunInput(),
      evidence_snapshot_id: snapshot.evidence_snapshot_id,
      claim_readiness_handoff_id: claimSnapshot.handoff_id,
      claim_readiness_snapshot_id: claimSnapshot.claim_readiness_snapshot_id,
      validation: {
        valid: true,
        evidence_snapshot_persisted: true,
        claim_readiness_handoff_validated: true,
        claim_readiness_snapshot_persisted: true,
        executive_readout_snapshot_persisted: false
      }
    };

    await expect(
      persistAiValuePilotRun({
        pilotRun: missingClaimLineage,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    await persistAiValueClaimReadinessSnapshot({
      claimReadinessSnapshot: claimSnapshot,
      version: 1,
      createdByRole: "value_realization_pm"
    });
    await persistAiValueExecutiveReadoutSnapshot({
      executiveReadoutSnapshot,
      version: 1,
      createdByRole: "value_realization_pm"
    });

    const driftedExecutiveLineage = {
      ...missingClaimLineage,
      pilot_run_id: "pilot_run_support_with_drifted_readout_lineage",
      executive_readout_snapshot_id: executiveReadoutSnapshot.executive_readout_snapshot_id,
      claim_readiness_handoff_id: "different_handoff",
      validation: {
        valid: true,
        evidence_snapshot_persisted: true,
        claim_readiness_handoff_validated: true,
        claim_readiness_snapshot_persisted: true,
        executive_readout_snapshot_persisted: true
      }
    };

    await expect(
      persistAiValuePilotRun({
        pilotRun: driftedExecutiveLineage,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);
  });

  it("fails orphan, drifted, or unsafe claim/readout snapshots before persistence", async () => {
    const { snapshot, claimSnapshot, executiveReadoutSnapshot } =
      buildExecutiveReadoutSnapshotInput();

    await expect(
      persistAiValueClaimReadinessSnapshot({
        claimReadinessSnapshot: claimSnapshot,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    await persistAiValueEvidenceSnapshot({
      evidenceSnapshot: snapshot,
      version: 1,
      createdByRole: "value_realization_pm"
    });

    const driftedClaim = clone(claimSnapshot);
    driftedClaim.source_refs.bigquery_probe_result_id = "different_probe";
    await expect(
      persistAiValueClaimReadinessSnapshot({
        claimReadinessSnapshot: driftedClaim,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const unsafeClaim = clone(claimSnapshot);
    unsafeClaim.raw_rows = [{ user_id: "person-123" }];
    await expect(
      persistAiValueClaimReadinessSnapshot({
        claimReadinessSnapshot: unsafeClaim,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    await expect(
      persistAiValueExecutiveReadoutSnapshot({
        executiveReadoutSnapshot,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    await persistAiValueClaimReadinessSnapshot({
      claimReadinessSnapshot: claimSnapshot,
      version: 1,
      createdByRole: "value_realization_pm"
    });

    const unsafeReadout = clone(executiveReadoutSnapshot);
    unsafeReadout.executive_readout_boundary.customer_facing_readout_allowed = true;
    await expect(
      persistAiValueExecutiveReadoutSnapshot({
        executiveReadoutSnapshot: unsafeReadout,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);
  });

  it("fails unsafe scalar values hidden inside otherwise allowed source refs", async () => {
    const plan = measurementPlan();

    await expect(
      persistAiValueMeasurementPlan({
        measurementPlan: plan,
        version: 1,
        valueHypothesisId: plan.value_hypothesis.value_hypothesis_id,
        createdByRole: "value_realization_pm",
        sourceRefs: {
          aggregate_export_id: "jane@example.com"
        }
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const pkg = sourcePackage();
    pkg.source_refs = {
      aggregate_export_id: "raw_prompt_export_123"
    };

    await expect(
      persistAiValueSourcePackageRef({
        sourcePackage: pkg,
        version: 1,
        measurementPlanId: "measurement_plan_customer_support_2026_05",
        workflowFamily: "customer_support_case_resolution",
        createdByRole: "data_platform_owner"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const rawContentRefPlan = measurementPlan();
    await expect(
      persistAiValueMeasurementPlan({
        measurementPlan: rawContentRefPlan,
        version: 1,
        valueHypothesisId: rawContentRefPlan.value_hypothesis.value_hypothesis_id,
        createdByRole: "value_realization_pm",
        sourceRefs: {
          aggregate_export_id: "raw_content_export_123"
        }
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const sqlTextRefPlan = measurementPlan();
    await expect(
      persistAiValueMeasurementPlan({
        measurementPlan: sqlTextRefPlan,
        version: 1,
        valueHypothesisId: sqlTextRefPlan.value_hypothesis.value_hypothesis_id,
        createdByRole: "value_realization_pm",
        sourceRefs: {
          aggregate_export_id: "SELECT * FROM customer_exports"
        }
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    expect(store.aiValueMeasurementPlans.size).toBe(0);
    expect(store.aiValueSourcePackageRefs.size).toBe(0);
  });

  it("fails unsafe scalar metadata and source-ref keys before persistence", async () => {
    const plan = measurementPlan();

    await expect(
      persistAiValueMeasurementPlan({
        measurementPlan: plan,
        version: 1,
        valueHypothesisId: plan.value_hypothesis.value_hypothesis_id,
        createdByRole: "jane@example.com"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    await expect(
      persistAiValueMeasurementPlan({
        measurementPlan: plan,
        version: 1,
        valueHypothesisId: "person-123",
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    await expect(
      persistAiValueMeasurementPlan({
        measurementPlan: plan,
        version: 1,
        valueHypothesisId: plan.value_hypothesis.value_hypothesis_id,
        createdByRole: "value_realization_pm",
        sourceRefs: {
          email: "aggregate_export_123"
        }
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    await expect(
      persistAiValueMeasurementPlan({
        measurementPlan: plan,
        version: 1,
        valueHypothesisId: plan.value_hypothesis.value_hypothesis_id,
        createdByRole: "value_realization_pm",
        sourceRefs: {
          employee_hash: "abc123"
        }
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);
  });

  it("fails invalid persistence timestamps before writing", async () => {
    const plan = measurementPlan();
    plan.windows.baseline_window_start = "not-a-date";

    await expect(
      persistAiValueMeasurementPlan({
        measurementPlan: plan,
        version: 1,
        valueHypothesisId: plan.value_hypothesis.value_hypothesis_id,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const pkg = sourcePackage();
    pkg.generated_at = "not-a-date";

    await expect(
      persistAiValueSourcePackageRef({
        sourcePackage: pkg,
        version: 1,
        measurementPlanId: "measurement_plan_customer_support_2026_05",
        workflowFamily: "customer_support_case_resolution",
        createdByRole: "data_platform_owner"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const snapshot = evidenceSnapshot();
    snapshot.window.window_start = "not-a-date";

    await expect(
      persistAiValueEvidenceSnapshot({
        evidenceSnapshot: snapshot,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const snapshotWithInvalidWindowEnd = evidenceSnapshot();
    snapshotWithInvalidWindowEnd.window.window_end = "not-a-date";

    await expect(
      persistAiValueEvidenceSnapshot({
        evidenceSnapshot: snapshotWithInvalidWindowEnd,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const snapshotWithInvalidGeneratedAt = evidenceSnapshot();
    snapshotWithInvalidGeneratedAt.generated_at = "not-a-date";

    await expect(
      persistAiValueEvidenceSnapshot({
        evidenceSnapshot: snapshotWithInvalidGeneratedAt,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const run = pilotRunInput();
    run.generated_at = "not-a-date";

    await expect(
      persistAiValuePilotRun({
        pilotRun: run,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const {
      snapshot: validSnapshot,
      claimSnapshot,
      executiveReadoutSnapshot
    } =
      buildExecutiveReadoutSnapshotInput();
    await persistAiValueEvidenceSnapshot({
      evidenceSnapshot: validSnapshot,
      version: 1,
      createdByRole: "value_realization_pm"
    });

    const invalidClaimTimestamp = clone(claimSnapshot);
    invalidClaimTimestamp.created_at = "not-a-date";
    await expect(
      persistAiValueClaimReadinessSnapshot({
        claimReadinessSnapshot: invalidClaimTimestamp,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    await persistAiValueClaimReadinessSnapshot({
      claimReadinessSnapshot: claimSnapshot,
      version: 1,
      createdByRole: "value_realization_pm"
    });

    const invalidReadoutTimestamp = clone(executiveReadoutSnapshot);
    invalidReadoutTimestamp.created_at = "not-a-date";
    await expect(
      persistAiValueExecutiveReadoutSnapshot({
        executiveReadoutSnapshot: invalidReadoutTimestamp,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);
  });
});
