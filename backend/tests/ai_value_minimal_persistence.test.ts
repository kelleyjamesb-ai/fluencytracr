import fs from "node:fs";
import path from "node:path";

import {
  AiValuePersistenceAlreadyExistsError,
  AiValuePersistenceValidationError,
  persistAiValueEvidenceSnapshot,
  persistAiValueHypothesisFromMeasurementPlan,
  persistAiValueMeasurementPlan,
  persistAiValueSourcePackageRef
} from "../src/repositories/ai-value-minimal-persistence.repository";
import { store } from "../src/store";

const EXAMPLE_ROOT = path.resolve(__dirname, "../../docs/contracts");
const MIGRATION = path.resolve(
  __dirname,
  "../prisma/migrations/20260613180000_add_ai_value_minimal_persistence/migration.sql"
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

  it("does not introduce forbidden person-level, raw-content, or decisioning columns", () => {
    const migrationSql = fs.readFileSync(MIGRATION, "utf8").toLowerCase();
    const columnMatches = Array.from(migrationSql.matchAll(/"([a-z0-9_]+)"\s+[a-z]/g)).map(
      (match) => match[1]
    );

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
  });
});
