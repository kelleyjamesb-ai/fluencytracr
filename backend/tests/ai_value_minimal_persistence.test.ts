import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { aiValueEngine } from "@learnaire/shared";
import { Prisma } from "@prisma/client";

import * as db from "../src/db";
import {
  AiValuePersistenceAlreadyExistsError,
  AiValuePersistenceValidationError,
  persistAiValueMeasurementCellSnapshot,
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
const MEASUREMENT_CELL_SNAPSHOT_MIGRATION = path.resolve(
  __dirname,
  "../prisma/migrations/20260622180000_add_measurement_cell_snapshots/migration.sql"
);
const MEASUREMENT_CELL_PROMOTION_DECISION = path.resolve(
  __dirname,
  "../../docs/architecture/AI_VALUE_MEASUREMENT_CELL_PERSISTENCE_PROMOTION_DECISION.md"
);
const REPO_ROOT = path.resolve(__dirname, "../..");
let controlledRunnerDistReady = false;

const EXPECTED_MEASUREMENT_CELL_SNAPSHOT_BLOCKED_USES = [
  "realized_roi",
  "ebita_claim",
  "ebitda_claim",
  "financial_attribution",
  "causality_claim",
  "productivity_claim",
  "headcount_reduction_claim",
  "individual_attribution",
  "manager_or_team_ranking",
  "department_ranking",
  "people_decisioning",
  "customer_facing_financial_output",
  "customer_facing_prediction",
  "customer_facing_output",
  "customer_facing_economic_output",
  "snapshot_read_projection",
  "snapshot_read_route",
  "snapshot_export",
  "rendered_readout",
  "frontend_ui",
  "live_connector_execution",
  "live_bigquery_execution",
  "live_sigma_execution",
  "live_glean_query",
  "measurement_cell_series_persistence",
  "contribution_model",
  "research_model_feed",
  "probability_output",
  "score_output"
];

const ensureControlledRunnerDistReady = () => {
  if (controlledRunnerDistReady) return;
  execFileSync("npm", ["run", "build", "--workspace", "shared"], {
    cwd: REPO_ROOT,
    stdio: "pipe"
  });
  controlledRunnerDistReady = true;
};

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
  {
    const snapshot = readJson("ai-value-evidence-snapshot/examples/telemetry-only-caveated-snapshot.json");
    snapshot.source_refs.source_package_ids = [
      "source_package_layer_1_bigquery_example"
    ];
    return snapshot;
  };

const sourcePackage = () =>
  readJson("ai-value-source-packages/examples/layer-1-bigquery-telemetry-package.json");

const scrubbedLayer1Export = () => ({
  schema_version: "FT_AI_VALUE_SCRUBBED_GLEAN_CLIENT_EXPORT_2026_06",
  export_id: "scrubbed_glean_export_support_layer_1_2026_05",
  org_id: "org_example",
  measurement_plan_id: "measurement_plan_customer_support_2026_05",
  evidence_layer: "layer_1_platform_telemetry",
  source_owner_role: "data_platform_owner",
  approver_role: "data_platform_owner",
  attestation: {
    attestation_state: "attested",
    attested_by_role: "data_platform_owner",
    attested_at: "2026-06-16T00:00:00.000Z",
    caveats: [
      "Scrubbed aggregate export summary only; no raw rows or identifiers retained."
    ]
  },
  generated_at: "2026-06-16T00:00:00.000Z",
  covered_window: {
    window_start: "2026-05-01",
    window_end: "2026-05-31"
  },
  aggregate_grain: "workflow_family",
  minimum_cohort_threshold: 5,
  k_min_posture: {
    minimum_cohort_threshold: 5,
    cohort_threshold_met: true,
    total_slices: 12,
    k_min_clear_slices: 12,
    suppressed_or_unknown_slices: 0
  },
  evidence_state: "present",
  privacy_boundary: {
    aggregate_only: true,
    contains_direct_identifiers: false,
    contains_raw_content: false,
    contains_raw_rows: false,
    contains_raw_files: false,
    contains_raw_prompts: false,
    contains_raw_responses: false,
    contains_transcripts: false,
    contains_query_text: false,
    contains_file_contents: false,
    contains_person_level_productivity: false,
    contains_person_level_hris_records: false,
    contains_hashed_or_joinable_person_identifiers: false,
    contains_manager_or_team_ranking: false,
    contains_people_decisioning: false,
    contains_compensation_or_performance_inference: false,
    contains_promotion_or_discipline_inference: false,
    contains_attrition_prediction: false,
    contains_hris_inference_from_ai_usage: false
  },
  source_tables: [
    "scrubbed_llm_call",
    "scrubbed_client_analytics"
  ],
  table_families_checked: [
    "scrubbed_llm_call",
    "scrubbed_client_analytics"
  ],
  source_readiness_id: "source_readiness_support_layer_1_2026_05",
  aggregate_probe_id: "bq_probe_support_layer_1_2026_05",
  aggregate_entry_ref: "aggregate_entry_support_layer_1_2026_05",
  signal_families: [
    "assistant",
    "search_document_retrieval",
    "agent_run"
  ],
  covered_signal_families: [
    "assistant",
    "search_document_retrieval",
    "agent_run"
  ],
  allowed_uses: [
    "evidence_collection_input",
    "source_availability_summary"
  ],
  blocked_uses: [
    "realized_roi",
    "ebita_claim",
    "causality_claim",
    "productivity_claim",
    "headcount_reduction_claim",
    "individual_attribution",
    "manager_or_team_ranking",
    "people_decisioning",
    "customer_facing_financial_output"
  ],
  caveats: [
    "Layer 1 telemetry is source availability evidence only and cannot create full Playbook coverage by itself."
  ]
});

const pilotRunInput = () => {
  const snapshot = evidenceSnapshot();
  const sourcePackageId = sourcePackage().source_package_id;
  const handoff = aiValueEngine.buildClaimReadinessHandoffFromEvidenceSnapshot(
    snapshot,
    {
      handoffId: "claim_readiness_handoff_layer_1_example",
      createdAt: "2026-06-13T18:00:00.000Z"
    }
  );
  return {
    pilot_run_id: "pilot_run_support_layer_1_example",
    org_id: snapshot.org_id,
    measurement_plan_id: snapshot.measurement_plan_id,
    workflow_family: snapshot.workflow.workflow_family,
    source_package_ids: [sourcePackageId],
    evidence_snapshot_id: snapshot.evidence_snapshot_id,
    claim_readiness_handoff_id: handoff.handoff_id,
    coverage_status: snapshot.playbook_coverage.coverage_status,
    run_status: "completed_with_caveats",
    required_caveats: handoff.required_caveats,
    blocked_uses: handoff.blocked_uses,
    validation: {
      valid: true,
      evidence_snapshot_persisted: true,
      evidence_snapshot_version: 1,
      source_package_ref_versions: {
        [sourcePackageId]: 1
      },
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
  (claimSnapshot as any).derived_from.evidence_snapshot_persistence_version = 1;
  (claimSnapshot as any).source_provenance.evidence_snapshot_persistence_version = 1;
  (claimSnapshot as any).validation.evidence_snapshot_persistence_version = 1;
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
  (executiveReadoutSnapshot as any).derived_from.claim_readiness_snapshot_persistence_version = 1;
  (executiveReadoutSnapshot as any).source_provenance.claim_readiness_snapshot_persistence_version = 1;
  (executiveReadoutSnapshot as any).validation.claim_readiness_snapshot_persistence_version = 1;
  return { ...chain, executiveReadoutSnapshot };
};

const controlledMeasurementCellAssemblyRun = () => {
  ensureControlledRunnerDistReady();
  const script = `
    import { readFileSync } from "node:fs";
    import { buildControlledMeasurementCellAssemblyArtifactsFromObject } from "./scripts/run_ai_value_controlled_measurement_cell_assembly.mjs";
    const fixture = JSON.parse(readFileSync("docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json", "utf8"));
    const artifacts = buildControlledMeasurementCellAssemblyArtifactsFromObject(fixture, { cwd: process.cwd() });
    if (artifacts.assemblyValidation?.valid !== true || artifacts.assemblyRun?.decision !== "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER") {
      throw new Error(JSON.stringify(artifacts.assemblyValidation ?? artifacts.candidate?.validation_summary ?? {}));
    }
    process.stdout.write(JSON.stringify(artifacts.assemblyRun));
  `;
  return JSON.parse(
    execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: REPO_ROOT,
      encoding: "utf8"
    })
  );
};

const controlledMeasurementCellAssemblyRunsForMilestones = (milestoneDays: number[]) => {
  ensureControlledRunnerDistReady();
  const script = `
    import { readFileSync } from "node:fs";
    import { buildControlledMeasurementCellAssemblyArtifactsFromObject } from "./scripts/run_ai_value_controlled_measurement_cell_assembly.mjs";
    const fixture = JSON.parse(readFileSync("docs/contracts/ai-value-real-data-intake-packet-runner/examples/controlled-aggregate-fixture-review-ready.json", "utf8"));
    const milestoneDays = ${JSON.stringify(milestoneDays)};
    const runs = milestoneDays.map((milestoneDay) => {
      const variant = JSON.parse(JSON.stringify(fixture));
      variant.expected = {
        ...variant.expected,
        milestone_day: milestoneDay,
        window_mode: "milestone"
      };
      const artifacts = buildControlledMeasurementCellAssemblyArtifactsFromObject(variant, { cwd: process.cwd() });
      if (artifacts.assemblyValidation?.valid !== true || artifacts.assemblyRun?.decision !== "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER") {
        throw new Error(JSON.stringify({ milestoneDay, validation: artifacts.assemblyValidation ?? artifacts.candidate?.validation_summary ?? {} }));
      }
      return artifacts.assemblyRun;
    });
    process.stdout.write(JSON.stringify(runs));
  `;
  return JSON.parse(
    execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: REPO_ROOT,
      encoding: "utf8"
    })
  );
};

const persistSourceAndEvidencePrereqs = async (snapshot = evidenceSnapshot()) => {
  const pkg = sourcePackage();
  await persistAiValueSourcePackageRef({
    sourcePackage: pkg,
    version: 1,
    measurementPlanId: snapshot.measurement_plan_id,
    workflowFamily: snapshot.workflow.workflow_family,
    createdByRole: "data_platform_owner"
  });
  await persistAiValueEvidenceSnapshot({
    evidenceSnapshot: snapshot,
    version: 1,
    createdByRole: "value_realization_pm"
  });
  return { pkg, snapshot };
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

  it("promotes only compact internal Measurement Cell snapshot persistence", () => {
    const decision = fs.readFileSync(MEASUREMENT_CELL_PROMOTION_DECISION, "utf8");
    const migrationSql = fs.readFileSync(MEASUREMENT_CELL_SNAPSHOT_MIGRATION, "utf8");
    const table = tableBlock(migrationSql, "measurement_cell_snapshots");

    expect(decision).toContain("Decision: `PROMOTE_MEASUREMENT_CELL_SNAPSHOTS`");
    expect(decision).toContain("Measurement Cell Series persistence remains blocked");
    expect(migrationSql).toContain('CREATE TABLE "measurement_cell_snapshots"');
    expect(migrationSql).toContain("measurement_cell_snapshots_immutable_key");
    expect(migrationSql).toContain('"measurement_cell_assembly_run_id" TEXT NOT NULL');
    expect(migrationSql).toContain('"expectation_path_id" TEXT NOT NULL');
    expect(migrationSql).toContain('"expectation_path_version" INTEGER NOT NULL');
    expect(migrationSql).toContain('"expectation_path_hash" TEXT NOT NULL');
    expect(migrationSql).toContain('"approved_blueprint_payload_hash" TEXT NOT NULL');
    expect(migrationSql).toContain('"approved_at" TIMESTAMP(3) NOT NULL');
    expect(migrationSql).toContain('"approved_by_role" TEXT NOT NULL');
    expect(migrationSql).toContain('"approval_state" TEXT NOT NULL');
    expect(migrationSql).toContain('"milestone_day" INTEGER NOT NULL');
    expect(migrationSql).toContain('"value_hypothesis_id" TEXT');
    expect(migrationSql).toContain('"value_hypothesis_ref" TEXT');
    expect(migrationSql).toContain('"value_driver" TEXT NOT NULL');
    expect(migrationSql).toContain('"assembly_payload_json" JSONB');
    expect(migrationSql).toContain("measurement_cell_snapshots_value_driver_check");
    expect(migrationSql).toContain("measurement_cell_snapshots_supersedes_version_check");
    expect(migrationSql).toContain("measurement_cell_snapshots_assembly_payload_null_or_object_check");
    expect(migrationSql).toContain("ALTER TABLE public.measurement_cell_snapshots ENABLE ROW LEVEL SECURITY");
    expect(migrationSql).toContain("REVOKE ALL ON TABLE public.measurement_cell_snapshots");

    expect(table).not.toContain("measurement_cell_series");
    expect(table).not.toContain('"confidence');
    expect(table).not.toContain('"probability');
    expect(table).not.toContain('"roi');
    expect(table).not.toContain('"ebitda');
    expect(table).not.toContain('"financial_output"');
    expect(table).not.toContain('"causality');
    expect(table).not.toContain('"productivity');
    expect(table).not.toContain('"raw_rows"');
    expect(table).not.toContain('"row_id"');
    expect(table).not.toContain('"span_id"');
    expect(table).not.toContain('"trace_id"');
    expect(table).not.toContain('"email_hash"');
    expect(table).not.toContain('"user_hash"');
    expect(table).not.toContain('"person_hash"');
    expect(table).not.toContain('"employee_hash"');
    expect(table).not.toContain('"query_text"');
    expect(table).not.toContain('"sql_text"');
    expect(table).not.toContain('"prompt"');
    expect(table).not.toContain('"transcript"');
    expect(table).not.toContain('"user_id"');
    expect(migrationSql).not.toContain('CREATE TABLE "measurement_cell_series_snapshots"');
  });

  it("does not introduce forbidden person-level, raw-content, or decisioning columns", () => {
    const migrationSql = fs.readFileSync(MIGRATION, "utf8").toLowerCase();
    const pilotRunMigrationSql = fs.existsSync(PILOT_RUN_MIGRATION)
      ? fs.readFileSync(PILOT_RUN_MIGRATION, "utf8").toLowerCase()
      : "";
    const snapshotMigrationSql = fs.existsSync(SNAPSHOT_MIGRATION)
      ? fs.readFileSync(SNAPSHOT_MIGRATION, "utf8").toLowerCase()
      : "";
    const measurementCellSnapshotMigrationSql = fs.existsSync(MEASUREMENT_CELL_SNAPSHOT_MIGRATION)
      ? fs.readFileSync(MEASUREMENT_CELL_SNAPSHOT_MIGRATION, "utf8").toLowerCase()
      : "";
    const columnMatches = Array.from(
      `${migrationSql}\n${pilotRunMigrationSql}\n${snapshotMigrationSql}\n${measurementCellSnapshotMigrationSql}`.matchAll(/"([a-z0-9_]+)"\s+[a-z]/g)
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
      "row_id",
      "span_id",
      "trace_id",
      "email_hash",
      "user_hash",
      "person_hash",
      "employee_hash",
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
      "customer_facing_financial_output",
      "confidence",
      "confidence_score",
      "probability",
      "probability_score",
      "roi",
      "ebitda",
      "financial_output",
      "causality",
      "productivity"
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

  it("persists Source Package refs produced by the scrubbed Glean converter", async () => {
    const conversion = aiValueEngine.convertScrubbedGleanClientExportToEvidenceInputs(
      scrubbedLayer1Export(),
      {
        sourcePackageId: "source_package_scrubbed_layer_1_persistence_test"
      }
    );
    expect(conversion.valid).toBe(true);
    expect(conversion.source_package).toBeTruthy();

    const ref = await persistAiValueSourcePackageRef({
      sourcePackage: conversion.source_package,
      version: 1,
      measurementPlanId: "measurement_plan_customer_support_2026_05",
      workflowFamily: "customer_support_case_resolution",
      createdByRole: "data_platform_owner"
    });

    expect(ref.validation.valid).toBe(true);
    expect(ref.source_refs.source_export_id).toBe(
      "scrubbed_glean_export_support_layer_1_2026_05"
    );
    expect(ref.source_refs.aggregate_probe_id).toBe(
      "bq_probe_support_layer_1_2026_05"
    );
    expect(ref.source_refs.aggregate_entry_ref).toBe(
      "aggregate_entry_support_layer_1_2026_05"
    );
    expect(ref.source_refs.table_families_checked).toEqual([
      "scrubbed_llm_call",
      "scrubbed_client_analytics"
    ]);
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
    await persistSourceAndEvidencePrereqs();
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
    await persistSourceAndEvidencePrereqs(snapshot);
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
      required_caveats: executiveReadoutSnapshot.required_caveats,
      blocked_uses: executiveReadoutSnapshot.blocked_uses,
      validation: {
        valid: true,
        evidence_snapshot_persisted: true,
        evidence_snapshot_version: 1,
        source_package_ref_versions: {
          [sourcePackage().source_package_id]: 1
        },
        claim_readiness_handoff_validated: true,
        claim_readiness_snapshot_persisted: true,
        claim_readiness_snapshot_version: 1,
        executive_readout_snapshot_persisted: true,
        executive_readout_snapshot_version: 1
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
    expect(stored.required_caveats).toEqual(
      executiveReadoutSnapshot.required_caveats
    );
    expect(stored.blocked_uses).toEqual(executiveReadoutSnapshot.blocked_uses);
  });

  it("persists controlled pilot Measurement Cell snapshots append-only as compact internal snapshots", async () => {
    const assemblyRun = controlledMeasurementCellAssemblyRun();
    const stored = await persistAiValueMeasurementCellSnapshot({
      measurementCellAssemblyRun: assemblyRun,
      version: 1,
      createdByRole: "value_realization_pm"
    });

    expect(stored.measurement_cell_id).toBe(
      assemblyRun.measurement_cell.measurement_cell_id
    );
    expect(stored.measurement_cell_assembly_run_id).toBe(assemblyRun.run_id);
    expect(stored.measurement_plan_id).toBe(assemblyRun.measurement_plan_id);
    expect(stored.value_hypothesis_id).toBe(
      assemblyRun.measurement_plan.value_hypothesis.value_hypothesis_id
    );
    expect(stored.expectation_path_id).toBe(
      assemblyRun.measurement_cell.blueprint_alignment.expectation_path_id
    );
    expect(stored.expectation_path_version).toBe(1);
    expect(stored.expectation_path_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.approved_blueprint_payload_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.approval_state).toBe("approved");
    expect(stored.approved_at).toBe(
      assemblyRun.measurement_cell.blueprint_alignment.blueprint_customer_approved_at
    );
    expect(stored.approved_by_role).toBe("workflow_owner");
    expect(stored.value_driver).toBe("Capacity");
    expect(stored.metric_id).toBe("support_median_resolution_hours");
    expect(stored.metric_definition_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.metric_owner_approval_state).toBe("approved");
    expect(stored.metric_direction).toBe("decrease");
    expect(stored.metric_unit).toBe("hours");
    expect(stored.expected_metric_lag_days).toBe(30);
    expect(stored.window_mode).toBe("milestone");
    expect(stored.milestone_day).toBe(30);
    expect(stored.assembly_decision).toBe("READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER");
    expect(stored.assembly_payload).toBeNull();
    expect(stored.validation.valid).toBe(true);
    expect(stored.assembly_validation.valid).toBe(true);
    expect(stored.source_refs).toEqual(assemblyRun.measurement_cell.source_refs);
    expect(stored.source_refs).toEqual({
      blueprint_source_ref: "blueprint_parse_support_approved_day_30",
      ai_fluency_source_ref: "ai_fluency_support_day_30",
      vbd_source_ref: "scrubbed_glean_vbd_token_support_day_30",
      metric_source_ref: "support_metric_resolution_hours_day_30",
      token_source_ref: "scrubbed_glean_vbd_token_support_day_30"
    });
    expect(stored.blocked_uses).toEqual(
      EXPECTED_MEASUREMENT_CELL_SNAPSHOT_BLOCKED_USES
    );
    expect(stored.blueprint_path_binding).toMatchObject({
      expectation_path_id: stored.expectation_path_id,
      expectation_path_version: 1,
      approval_state: "approved",
      approved_by_role: "workflow_owner",
      value_driver: "Capacity",
      expected_metric_id: stored.metric_id
    });
    expect(stored.blueprint_path_binding).not.toHaveProperty("approved_expectation_paths");
    expect(stored.payload).not.toHaveProperty("value_proof_policy");
    expect(stored.payload).not.toHaveProperty("persistence_policy");
    expect(stored.payload).not.toHaveProperty("finance_review_context");
    expect(JSON.stringify(stored.payload).toLowerCase()).not.toContain("confidence");
    expect(JSON.stringify(stored.payload).toLowerCase()).not.toContain("probability");
    expect(JSON.stringify(stored.payload).toLowerCase()).not.toContain("roi");
    expect(JSON.stringify(stored.payload).toLowerCase()).not.toContain("ebitda");
    expect(store.aiValueMeasurementCellSnapshots.size).toBe(1);

    await expect(
      persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: assemblyRun,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceAlreadyExistsError);

    await expect(
      persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: assemblyRun,
        version: 2,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const superseded = Array.from(
      store.aiValueMeasurementCellSnapshots.values()
    ).find((record) => record.id === stored.id);
    if (!superseded) throw new Error("expected stored Measurement Cell snapshot");
    for (const field of [
      "baseline_window_start",
      "baseline_window_end",
      "comparison_window_start",
      "comparison_window_end"
    ] as const) {
      superseded[field] = new Date(superseded[field]).toISOString();
    }

    const corrected = await persistAiValueMeasurementCellSnapshot({
      measurementCellAssemblyRun: assemblyRun,
      version: 2,
      supersedesId: stored.id,
      createdByRole: "value_realization_pm"
    });
    expect(corrected.version).toBe(2);
    expect(corrected.supersedes_id).toBe(stored.id);
    expect(store.aiValueMeasurementCellSnapshots.size).toBe(2);
  });

  it("canonicalizes Measurement Cell snapshot caveats and blocked uses before persistence", async () => {
    const assemblyRun = controlledMeasurementCellAssemblyRun();
    assemblyRun.measurement_cell.required_caveats = [
      assemblyRun.measurement_cell.required_caveats[2],
      assemblyRun.measurement_cell.required_caveats[0],
      assemblyRun.measurement_cell.required_caveats[1],
      assemblyRun.measurement_cell.required_caveats[1]
    ];
    assemblyRun.measurement_cell.blocked_uses = [
      ...assemblyRun.measurement_cell.blocked_uses.slice().reverse(),
      assemblyRun.measurement_cell.blocked_uses[0]
    ];
    assemblyRun.measurement_cell_validation_result =
      aiValueEngine.validateMeasurementCell(assemblyRun.measurement_cell);

    const stored = await persistAiValueMeasurementCellSnapshot({
      measurementCellAssemblyRun: assemblyRun,
      version: 1,
      createdByRole: "value_realization_pm"
    });

    expect(stored.required_caveats).toEqual([
      "Measurement Cells are aggregate alignment objects, not ROI proof, financial attribution, causality, productivity measurement, or customer-facing financial output.",
      "Metric movement cannot rescue suppressed VBD, AI Fluency, or governance evidence.",
      "Bayesian modeling remains future research until a later governed decision promotes it."
    ]);
    expect(stored.blocked_uses).toEqual(
      EXPECTED_MEASUREMENT_CELL_SNAPSHOT_BLOCKED_USES
    );
  });

  it("binds Measurement Cell snapshots when only a value hypothesis ref is present", async () => {
    const assemblyRun = controlledMeasurementCellAssemblyRun();
    assemblyRun.measurement_plan.value_hypothesis.value_hypothesis_ref =
      assemblyRun.measurement_plan.value_hypothesis.value_hypothesis_id;
    assemblyRun.measurement_plan.value_hypothesis.value_hypothesis_id = null;

    const stored = await persistAiValueMeasurementCellSnapshot({
      measurementCellAssemblyRun: assemblyRun,
      version: 1,
      createdByRole: "value_realization_pm"
    });

    expect(stored.value_hypothesis_id).toBeNull();
    expect(stored.value_hypothesis_ref).toBe(
      assemblyRun.measurement_plan.value_hypothesis.value_hypothesis_ref
    );
    expect(stored.value_hypothesis_binding_state).toBe("bound");
  });

  it("rejects supersedes lineage on initial Measurement Cell snapshot versions", async () => {
    const assemblyRun = controlledMeasurementCellAssemblyRun();

    await expect(
      persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: assemblyRun,
        version: 1,
        supersedesId: "measurement_cell_snapshot_unrelated",
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);
  });

  it("rejects Measurement Cell snapshot corrections that skip the immediately previous version", async () => {
    const assemblyRun = controlledMeasurementCellAssemblyRun();
    const initial = await persistAiValueMeasurementCellSnapshot({
      measurementCellAssemblyRun: assemblyRun,
      version: 1,
      createdByRole: "value_realization_pm"
    });
    const corrected = await persistAiValueMeasurementCellSnapshot({
      measurementCellAssemblyRun: assemblyRun,
      version: 2,
      supersedesId: initial.id,
      createdByRole: "value_realization_pm"
    });

    await expect(
      persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: assemblyRun,
        version: 3,
        supersedesId: initial.id,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toThrow("immediately previous version");
    expect(corrected.supersedes_id).toBe(initial.id);
  });

  it("writes Measurement Cell snapshots through the Prisma branch with compact JSON only", async () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgresql://unit-test";
    const create = jest.fn(async ({ data }) => ({
      ...data,
      assemblyPayloadJson: null
    }));
    const getPrismaSpy = jest.spyOn(db, "getPrisma").mockReturnValue({
      measurementCellSnapshot: {
        create,
        findUnique: jest.fn()
      }
    } as any);

    try {
      const assemblyRun = controlledMeasurementCellAssemblyRun();
      const stored = await persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: assemblyRun,
        version: 1,
        createdByRole: "value_realization_pm"
      });

      expect(create).toHaveBeenCalledTimes(1);
      const data = create.mock.calls[0]?.[0]?.data;
      expect(data).toMatchObject({
        orgId: stored.org_id,
        measurementCellId: stored.measurement_cell_id,
        version: 1,
        approvalState: "approved",
        windowMode: "milestone",
        milestoneDay: 30
      });
      expect(data.assemblyPayloadJson).toBe(Prisma.DbNull);
      expect(JSON.stringify(data.payloadJson).toLowerCase()).not.toContain("raw_rows");
      expect(JSON.stringify(data.payloadJson).toLowerCase()).not.toContain("query_text");
      expect(JSON.stringify(data.payloadJson).toLowerCase()).not.toContain("confidence");
      expect(JSON.stringify(data.payloadJson).toLowerCase()).not.toContain("roi");
      expect(stored.assembly_payload).toBeNull();
    } finally {
      getPrismaSpy.mockRestore();
      if (previousDatabaseUrl === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = previousDatabaseUrl;
      }
    }
  });

  it("rejects skipped Measurement Cell snapshot correction lineage through the Prisma branch", async () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgresql://unit-test";
    let initialRow: any = null;
    const create = jest.fn(async ({ data }) => {
      const row = {
        ...data,
        assemblyPayloadJson: null
      };
      if (data.version === 1) {
        initialRow = row;
      }
      return row;
    });
    const findUnique = jest.fn(async ({ where }) =>
      where.id === initialRow?.id ? initialRow : null
    );
    const getPrismaSpy = jest.spyOn(db, "getPrisma").mockReturnValue({
      measurementCellSnapshot: {
        create,
        findUnique
      }
    } as any);

    try {
      const assemblyRun = controlledMeasurementCellAssemblyRun();
      const initial = await persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: assemblyRun,
        version: 1,
        createdByRole: "value_realization_pm"
      });
      const corrected = await persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: assemblyRun,
        version: 2,
        supersedesId: initial.id,
        createdByRole: "value_realization_pm"
      });

      expect(corrected.version).toBe(2);
      expect(corrected.supersedes_id).toBe(initial.id);

      await expect(
        persistAiValueMeasurementCellSnapshot({
          measurementCellAssemblyRun: assemblyRun,
          version: 3,
          supersedesId: initial.id,
          createdByRole: "value_realization_pm"
        })
      ).rejects.toThrow("immediately previous version");

      expect(findUnique).toHaveBeenCalledWith({ where: { id: initial.id } });
      expect(create).toHaveBeenCalledTimes(2);
    } finally {
      getPrismaSpy.mockRestore();
      if (previousDatabaseUrl === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = previousDatabaseUrl;
      }
    }
  });

  it("persists repeated milestone Measurement Cell snapshots as distinct cell identities, not versions", async () => {
    const milestoneDays = [0, 30, 60, 90, 180, 365];
    const assemblyRuns = controlledMeasurementCellAssemblyRunsForMilestones(milestoneDays);
    const stored = [];

    for (const assemblyRun of assemblyRuns) {
      stored.push(
        await persistAiValueMeasurementCellSnapshot({
          measurementCellAssemblyRun: assemblyRun,
          version: 1,
          createdByRole: "value_realization_pm"
        })
      );
    }

    expect(stored).toHaveLength(milestoneDays.length);
    expect(new Set(stored.map((record) => record.measurement_cell_id)).size).toBe(
      milestoneDays.length
    );
    expect(stored.map((record) => record.milestone_day).sort((a, b) => a - b)).toEqual(
      milestoneDays
    );
    expect(stored.every((record) => record.window_mode === "milestone")).toBe(true);
    expect(store.aiValueMeasurementCellSnapshots.size).toBe(milestoneDays.length);

    const day30 = stored.find((record) => record.milestone_day === 30);
    const day60Run = assemblyRuns.find(
      (run: any) => run.measurement_cell.time_window.days_since_launch === 60
    );
    const sameCellDifferentWindow = clone(day60Run);
    sameCellDifferentWindow.measurement_cell.measurement_cell_id =
      day30?.measurement_cell_id;
    sameCellDifferentWindow.measurement_cell_validation_result =
      aiValueEngine.validateMeasurementCell(sameCellDifferentWindow.measurement_cell);

    await expect(
      persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: sameCellDifferentWindow,
        version: 2,
        supersedesId: day30?.id,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toThrow(
      "Measurement Cell Snapshot correction cannot change selected path, metric, or milestone identity"
    );
  });

  it("fails drifted Measurement Cell snapshot bindings before persistence", async () => {
    const pathDrift = clone(controlledMeasurementCellAssemblyRun());
    pathDrift.measurement_cell.blueprint_alignment.expectation_path_id = "different_path";
    await expect(
      persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: pathDrift,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const approvalDrift = clone(controlledMeasurementCellAssemblyRun());
    approvalDrift.measurement_cell.blueprint_alignment.blueprint_customer_approval_state = "pending";
    await expect(
      persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: approvalDrift,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const approvalTimestampDrift = clone(controlledMeasurementCellAssemblyRun());
    delete approvalTimestampDrift.measurement_cell.blueprint_alignment.blueprint_customer_approved_at;
    delete approvalTimestampDrift.measurement_cell.blueprint_alignment.approved_expectation_path.approved_at;
    await expect(
      persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: approvalTimestampDrift,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const milestoneDrift = clone(controlledMeasurementCellAssemblyRun());
    milestoneDrift.measurement_cell.time_window.days_since_launch = null;
    await expect(
      persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: milestoneDrift,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const metricDrift = clone(controlledMeasurementCellAssemblyRun());
    metricDrift.measurement_cell.selected_metric.metric_id = "different_metric";
    await expect(
      persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: metricDrift,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const lagDrift = clone(controlledMeasurementCellAssemblyRun());
    lagDrift.measurement_cell.blueprint_alignment.expected_metric_lag_days = 60;
    await expect(
      persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: lagDrift,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);
  });

  it("fails Measurement Cell snapshot JSONB smuggling before persistence", async () => {
    const unsafePayload = clone(controlledMeasurementCellAssemblyRun());
    unsafePayload.measurement_cell.metric_movement.ai_contribution_confidence = 0.91;
    await expect(
      persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: unsafePayload,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const unsafeValidation = clone(controlledMeasurementCellAssemblyRun());
    unsafeValidation.measurement_cell_validation_result.score = 0.91;
    await expect(
      persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: unsafeValidation,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const unsafeSourceRefs = clone(controlledMeasurementCellAssemblyRun());
    unsafeSourceRefs.measurement_cell.source_refs.query_text = "SELECT * FROM raw_events";
    await expect(
      persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: unsafeSourceRefs,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const unsafeSourceRefNotes = clone(controlledMeasurementCellAssemblyRun());
    unsafeSourceRefNotes.measurement_cell.source_refs.notes = [
      "ROI confidence score ready for finance output."
    ];
    await expect(
      persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: unsafeSourceRefNotes,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const unsafeRequiredCaveat = clone(controlledMeasurementCellAssemblyRun());
    unsafeRequiredCaveat.measurement_cell.required_caveats = [
      ...unsafeRequiredCaveat.measurement_cell.required_caveats,
      "ROI confidence score ready for finance output."
    ];
    unsafeRequiredCaveat.measurement_cell_validation_result =
      aiValueEngine.validateMeasurementCell(unsafeRequiredCaveat.measurement_cell);
    await expect(
      persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: unsafeRequiredCaveat,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const unsafeNegativePostureCaveat = clone(controlledMeasurementCellAssemblyRun());
    unsafeNegativePostureCaveat.measurement_cell.required_caveats = [
      ...unsafeNegativePostureCaveat.measurement_cell.required_caveats,
      "ROI confidence output is not blocked for finance output."
    ];
    unsafeNegativePostureCaveat.measurement_cell_validation_result =
      aiValueEngine.validateMeasurementCell(unsafeNegativePostureCaveat.measurement_cell);
    await expect(
      persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: unsafeNegativePostureCaveat,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const unsafeBlockedUse = clone(controlledMeasurementCellAssemblyRun());
    unsafeBlockedUse.measurement_cell.blocked_uses = [
      ...unsafeBlockedUse.measurement_cell.blocked_uses,
      "ROI confidence output authorized for finance output"
    ];
    unsafeBlockedUse.measurement_cell_validation_result =
      aiValueEngine.validateMeasurementCell(unsafeBlockedUse.measurement_cell);
    await expect(
      persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: unsafeBlockedUse,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const unsafeSourceRefSummary = clone(controlledMeasurementCellAssemblyRun());
    unsafeSourceRefSummary.measurement_cell.source_refs.vbd_summary = {
      productivity_probability: 0.82
    };
    await expect(
      persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: unsafeSourceRefSummary,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const smuggledSourceRefNotesObject = clone(controlledMeasurementCellAssemblyRun());
    smuggledSourceRefNotesObject.measurement_cell.source_refs.notes = {
      package_ref: "source_package_compact_ref",
      table_family: "aggregate_summary"
    };
    await expect(
      persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: smuggledSourceRefNotesObject,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const smuggledSourceRefPackageArray = clone(controlledMeasurementCellAssemblyRun());
    smuggledSourceRefPackageArray.measurement_cell.source_refs.source_package_ids = [
      {
        source_package_id: "source_package_compact_ref",
        source_package_type: "layer_1_summary"
      }
    ];
    await expect(
      persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: smuggledSourceRefPackageArray,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const smuggledBlueprintSourceRef = clone(controlledMeasurementCellAssemblyRun());
    smuggledBlueprintSourceRef.measurement_cell.source_refs.blueprint_source_ref = {
      ref: "blueprint_review_ref_support_resolution"
    };
    await expect(
      persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: smuggledBlueprintSourceRef,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const unsafeIdentifierCases: Array<[
      string,
      (run: any, assemblyPayload: Record<string, unknown>) => void
    ]> = [
      [
        "row_id in source refs",
        (run: any) => {
          run.measurement_cell.source_refs.notes = "row_id:row_123";
        }
      ],
      [
        "bare row identifier in source refs",
        (run: any) => {
          run.measurement_cell.source_refs.notes = "row_123";
        }
      ],
      [
        "span_id in source refs",
        (run: any) => {
          run.measurement_cell.source_refs.notes = "span_id:span_123";
        }
      ],
      [
        "bare span identifier in source refs",
        (run: any) => {
          run.measurement_cell.source_refs.notes = "span_abc123";
        }
      ],
      [
        "trace_id in source refs",
        (run: any) => {
          run.measurement_cell.source_refs.notes = "trace_id:trace_123";
        }
      ],
      [
        "bare trace identifier in source refs",
        (run: any) => {
          run.measurement_cell.source_refs.notes = "trace_123";
        }
      ],
      [
        "email_hash in source refs",
        (run: any) => {
          run.measurement_cell.source_refs.notes = "email_hash:abc123";
        }
      ],
      [
        "hashed email in source refs",
        (run: any) => {
          run.measurement_cell.source_refs.notes = "hashed_email:abc123";
        }
      ],
      [
        "user_hash in source refs",
        (run: any) => {
          run.measurement_cell.source_refs.notes = "user_hash:abc123";
        }
      ],
      [
        "person_hash in source refs",
        (run: any) => {
          run.measurement_cell.source_refs.notes = "person_hash:abc123";
        }
      ],
      [
        "employee_hash in source refs",
        (run: any) => {
          run.measurement_cell.source_refs.notes = "employee_hash:abc123";
        }
      ],
      [
        "row_id in full assembly run",
        (run: any) => {
          run.measurement_cell.row_id = "row_123";
        }
      ],
      [
        "span_id in assembly payload",
        (_run: any, assemblyPayload: Record<string, unknown>) => {
          assemblyPayload.source_refs = {
            aggregate_probe_id: "aggregate_probe_ref",
            notes: "span_id:span_123"
          };
        }
      ]
    ];

    for (const [label, mutate] of unsafeIdentifierCases) {
      const unsafeIdentifierRun = clone(controlledMeasurementCellAssemblyRun());
      const assemblyPayload: Record<string, unknown> | null =
        label === "span_id in assembly payload"
          ? {
              assembly_run_id: unsafeIdentifierRun.run_id,
              assembly_decision: unsafeIdentifierRun.decision,
              measurement_cell_id:
                unsafeIdentifierRun.measurement_cell.measurement_cell_id,
              validation: {
                validator: "validateMeasurementCellAssemblyRun",
                valid: true
              },
              required_caveats: [],
              blocked_uses: unsafeIdentifierRun.measurement_cell.blocked_uses
            }
          : null;
      mutate(unsafeIdentifierRun, assemblyPayload ?? {});
      await expect(
        persistAiValueMeasurementCellSnapshot({
          measurementCellAssemblyRun: unsafeIdentifierRun,
          version: 1,
          createdByRole: "value_realization_pm",
          assemblyPayload
        })
      ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);
    }

    const unsafePathBinding = clone(controlledMeasurementCellAssemblyRun());
    unsafePathBinding.measurement_cell.blueprint_alignment.approved_expectation_paths = [
      unsafePathBinding.measurement_cell.blueprint_alignment.approved_expectation_path
    ];
    await expect(
      persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: unsafePathBinding,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const unsafeAssemblyPayload = controlledMeasurementCellAssemblyRun();
    await expect(
      persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: unsafeAssemblyPayload,
        version: 1,
        createdByRole: "value_realization_pm",
        assemblyPayload: {
          measurement_cell: unsafeAssemblyPayload.measurement_cell
        }
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const unsafeCompactAssemblyPayload = controlledMeasurementCellAssemblyRun();
    await expect(
      persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: unsafeCompactAssemblyPayload,
        version: 1,
        createdByRole: "value_realization_pm",
        assemblyPayload: {
          assembly_run_id: unsafeCompactAssemblyPayload.run_id,
          assembly_decision: unsafeCompactAssemblyPayload.decision,
          measurement_cell_id:
            unsafeCompactAssemblyPayload.measurement_cell.measurement_cell_id,
          source_refs: {
            aggregate_probe_id: "probe_valid",
            notes: "causality probability score ready"
          },
          validation: {
            validator: "validateMeasurementCellAssemblyRun",
            valid: true,
            score: 0.97
          },
          required_caveats: [],
          blocked_uses: unsafeCompactAssemblyPayload.measurement_cell.blocked_uses
        }
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const driftedCompactAssemblyPayload = controlledMeasurementCellAssemblyRun();
    await expect(
      persistAiValueMeasurementCellSnapshot({
        measurementCellAssemblyRun: driftedCompactAssemblyPayload,
        version: 1,
        createdByRole: "value_realization_pm",
        assemblyPayload: {
          assembly_run_id: "measurement_cell_assembly_run_drifted",
          assembly_decision: driftedCompactAssemblyPayload.decision,
          measurement_cell_id:
            driftedCompactAssemblyPayload.measurement_cell.measurement_cell_id,
          validation: {
            validator: "validateMeasurementCellAssemblyRun",
            valid: true,
            run_id: driftedCompactAssemblyPayload.run_id,
            measurement_cell_id:
              driftedCompactAssemblyPayload.measurement_cell.measurement_cell_id,
            gaps: []
          },
          required_caveats:
            driftedCompactAssemblyPayload.measurement_cell.required_caveats,
          blocked_uses:
            driftedCompactAssemblyPayload.measurement_cell.blocked_uses
        }
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    expect(store.aiValueMeasurementCellSnapshots.size).toBe(0);
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
    expect(stored.readout_state).toBe("blocked_for_privacy_or_suppression");
    expect(stored.customer_facing_readout_allowed).toBe(false);
    expect(stored.customer_facing_financial_output_allowed).toBe(false);
    expect(stored.required_caveats).toEqual(executiveReadoutSnapshot.required_caveats);
    expect(stored.blocked_claims).toContain("customer_facing_economic_output");
    expect(stored.validation.valid).toBe(true);
    expect(store.aiValueExecutiveReadoutSnapshots.size).toBe(1);
  });

  it("rejects readout state upgrades, forbidden fields, and unsupported sections", () => {
    const { executiveReadoutSnapshot } = buildExecutiveReadoutSnapshotInput();

    const upgradedState = clone(executiveReadoutSnapshot);
    upgradedState.readout_state = "internal_only_readout_ready";
    expect(aiValueEngine.validateExecutiveReadoutSnapshot(upgradedState).valid).toBe(false);

    const externalAudience = clone(executiveReadoutSnapshot);
    externalAudience.readout_audience = "customer";
    expect(aiValueEngine.validateExecutiveReadoutSnapshot(externalAudience).valid).toBe(false);

    const claimsPersistedState = clone(executiveReadoutSnapshot);
    claimsPersistedState.persistence_policy.persisted = true;
    expect(aiValueEngine.validateExecutiveReadoutSnapshot(claimsPersistedState).valid).toBe(false);

    const heldReadout = clone(executiveReadoutSnapshot);
    heldReadout.suppression.reason_codes = [];
    heldReadout.suppression.suppressed_lanes = [];
    heldReadout.suppression.held_lanes = [];
    heldReadout.suppression.missing_lanes = [];
    heldReadout.readout_state = "held_for_full_playbook_coverage";
    const heldResult = aiValueEngine.validateExecutiveReadoutSnapshot(heldReadout);
    expect(heldResult.valid).toBe(true);
    expect(heldResult.feeds.internal_executive_readout_context).toBe(false);

    const reasonCodeOnlySuppression = clone(heldReadout);
    reasonCodeOnlySuppression.suppression.reason_codes = ["HIGH_AMBIGUITY"];
    reasonCodeOnlySuppression.readout_state = "blocked_for_privacy_or_suppression";
    expect(aiValueEngine.validateExecutiveReadoutSnapshot(reasonCodeOnlySuppression).valid).toBe(true);
    const reasonCodeUpgrade = clone(reasonCodeOnlySuppression);
    reasonCodeUpgrade.readout_state = "internal_only_readout_ready";
    expect(aiValueEngine.validateExecutiveReadoutSnapshot(reasonCodeUpgrade).valid).toBe(false);

    const unsafeField = clone(executiveReadoutSnapshot);
    unsafeField.raw_rows = [{ user_id: "person-123" }];
    expect(aiValueEngine.validateExecutiveReadoutSnapshot(unsafeField).valid).toBe(false);

    const shadowAlias = clone(executiveReadoutSnapshot);
    (shadowAlias as any).readoutState = "internal_only_readout_ready";
    expect(aiValueEngine.validateExecutiveReadoutSnapshot(shadowAlias).valid).toBe(false);

    const nestedShadowAlias = clone(executiveReadoutSnapshot);
    (nestedShadowAlias.executive_readout_boundary as any).customerFacingReadoutAllowed = true;
    expect(aiValueEngine.validateExecutiveReadoutSnapshot(nestedShadowAlias).valid).toBe(false);

    const unsafeSection = clone(executiveReadoutSnapshot);
    unsafeSection.allowed_sections = [
      ...unsafeSection.allowed_sections,
      "customer_facing_financial_output"
    ];
    expect(aiValueEngine.validateExecutiveReadoutSnapshot(unsafeSection).valid).toBe(false);
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
    await expect(
      persistAiValuePilotRun({
        pilotRun: pilotRunInput(),
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    await persistSourceAndEvidencePrereqs();

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

    const inconsistentStatus = clone(pilotRunInput());
    inconsistentStatus.run_status = "completed";

    await expect(
      persistAiValuePilotRun({
        pilotRun: inconsistentStatus,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const unsafeValidationMetadata = clone(pilotRunInput());
    (unsafeValidationMetadata.validation as any).extra_customer_facing_readout_allowed = true;

    await expect(
      persistAiValuePilotRun({
        pilotRun: unsafeValidationMetadata,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const extraSourcePackageVersion = clone(pilotRunInput());
    (extraSourcePackageVersion.validation.source_package_ref_versions as any).unreferenced_package = 1;

    await expect(
      persistAiValuePilotRun({
        pilotRun: extraSourcePackageVersion,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    store.aiValueSourcePackageRefs.clear();
    await persistAiValueSourcePackageRef({
      sourcePackage: sourcePackage(),
      version: 1,
      measurementPlanId: null,
      workflowFamily: "customer_support_case_resolution",
      createdByRole: "data_platform_owner"
    });
    const unboundSourcePackageRef = clone(pilotRunInput());
    await expect(
      persistAiValuePilotRun({
        pilotRun: unboundSourcePackageRef,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);
    store.aiValueSourcePackageRefs.clear();
    await persistAiValueSourcePackageRef({
      sourcePackage: sourcePackage(),
      version: 1,
      measurementPlanId: "measurement_plan_other",
      workflowFamily: "customer_support_case_resolution",
      createdByRole: "data_platform_owner"
    });
    const wrongPlanSourcePackageRef = clone(pilotRunInput());
    await expect(
      persistAiValuePilotRun({
        pilotRun: wrongPlanSourcePackageRef,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    store.aiValueSourcePackageRefs.clear();
    await persistAiValueSourcePackageRef({
      sourcePackage: sourcePackage(),
      version: 1,
      measurementPlanId: "measurement_plan_customer_support_2026_05",
      workflowFamily: "customer_support_case_resolution",
      createdByRole: "data_platform_owner"
    });

    const conflictingEvidenceVersion = clone(pilotRunInput());
    (conflictingEvidenceVersion.validation as any).evidence_snapshot_persistence_version = 2;

    await expect(
      persistAiValuePilotRun({
        pilotRun: conflictingEvidenceVersion,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const missingHandoffCaveats = clone(pilotRunInput());
    missingHandoffCaveats.required_caveats = evidenceSnapshot().required_caveats;

    await expect(
      persistAiValuePilotRun({
        pilotRun: missingHandoffCaveats,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    expect(store.aiValuePilotRuns.size).toBe(0);
  });

  it("fails pilot run snapshot lineage when referenced snapshots are missing or drifted", async () => {
    const { snapshot, claimSnapshot, executiveReadoutSnapshot } =
      buildExecutiveReadoutSnapshotInput();
    await persistSourceAndEvidencePrereqs(snapshot);

    const missingClaimLineage = {
      ...pilotRunInput(),
      evidence_snapshot_id: snapshot.evidence_snapshot_id,
      claim_readiness_handoff_id: claimSnapshot.handoff_id,
      claim_readiness_snapshot_id: claimSnapshot.claim_readiness_snapshot_id,
      validation: {
        valid: true,
        evidence_snapshot_persisted: true,
        evidence_snapshot_version: 1,
        source_package_ref_versions: {
          [sourcePackage().source_package_id]: 1
        },
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

    const conflictingClaimVersion = clone(claimSnapshot);
    (conflictingClaimVersion.validation as any).evidence_snapshot_persistence_version = 2;
    await expect(
      persistAiValueClaimReadinessSnapshot({
        claimReadinessSnapshot: conflictingClaimVersion,
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
        evidence_snapshot_version: 1,
        source_package_ref_versions: {
          [sourcePackage().source_package_id]: 1
        },
        claim_readiness_handoff_validated: true,
        claim_readiness_snapshot_persisted: true,
        claim_readiness_snapshot_version: 1,
        executive_readout_snapshot_persisted: true,
        executive_readout_snapshot_version: 1
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

    const weakenedClaim = clone(claimSnapshot);
    weakenedClaim.suppression.reason_codes = [];
    await expect(
      persistAiValueClaimReadinessSnapshot({
        claimReadinessSnapshot: weakenedClaim,
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

    const upgradedReadout = clone(executiveReadoutSnapshot);
    upgradedReadout.readout_state = "internal_only_readout_ready";
    await expect(
      persistAiValueExecutiveReadoutSnapshot({
        executiveReadoutSnapshot: upgradedReadout,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const missingReadoutCaveat = clone(executiveReadoutSnapshot);
    missingReadoutCaveat.required_caveats = [];
    await expect(
      persistAiValueExecutiveReadoutSnapshot({
        executiveReadoutSnapshot: missingReadoutCaveat,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const missingReadoutBlockedClaim = clone(executiveReadoutSnapshot);
    missingReadoutBlockedClaim.blocked_claims =
      missingReadoutBlockedClaim.blocked_claims.filter(
        (claim: string) => claim !== "customer_facing_economic_output"
      );
    await expect(
      persistAiValueExecutiveReadoutSnapshot({
        executiveReadoutSnapshot: missingReadoutBlockedClaim,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);
  });

  it("binds claim/readout persistence to explicit upstream versions", async () => {
    const { snapshot, claimSnapshot, executiveReadoutSnapshot } =
      buildExecutiveReadoutSnapshotInput();
    await persistAiValueEvidenceSnapshot({
      evidenceSnapshot: snapshot,
      version: 1,
      createdByRole: "value_realization_pm"
    });

    await expect(
      persistAiValueClaimReadinessSnapshot({
        claimReadinessSnapshot: {
          ...claimSnapshot,
          derived_from: {
            ...claimSnapshot.derived_from,
            evidence_snapshot_persistence_version: 2
          },
          validation: {
            ...claimSnapshot.validation,
            evidence_snapshot_persistence_version: 2
          }
        },
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    await persistAiValueClaimReadinessSnapshot({
      claimReadinessSnapshot: claimSnapshot,
      version: 1,
      createdByRole: "value_realization_pm"
    });

    const correctedClaim = clone(claimSnapshot);
    correctedClaim.required_caveats = [
      ...correctedClaim.required_caveats,
      "Corrected version caveat."
    ];
    correctedClaim.executive_readout_boundary.required_caveats = [
      ...correctedClaim.executive_readout_boundary.required_caveats,
      "Corrected version caveat."
    ];
    const firstClaimRecord = [...store.aiValueClaimReadinessSnapshots.values()][0];
    await persistAiValueClaimReadinessSnapshot({
      claimReadinessSnapshot: correctedClaim,
      version: 2,
      supersedesId: firstClaimRecord.id,
      createdByRole: "value_realization_pm"
    });

    const conflictingReadoutVersion = clone(executiveReadoutSnapshot);
    (conflictingReadoutVersion.validation as any).claim_readiness_snapshot_persistence_version = 2;
    await expect(
      persistAiValueExecutiveReadoutSnapshot({
        executiveReadoutSnapshot: conflictingReadoutVersion,
        version: 1,
        createdByRole: "value_realization_pm"
      })
    ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);

    const storedReadout = await persistAiValueExecutiveReadoutSnapshot({
      executiveReadoutSnapshot,
      version: 1,
      createdByRole: "value_realization_pm"
    });
    expect(storedReadout.version).toBe(1);

    const readoutBoundToLatest = clone(executiveReadoutSnapshot);
    (readoutBoundToLatest as any).derived_from.claim_readiness_snapshot_persistence_version = 2;
    (readoutBoundToLatest as any).validation.claim_readiness_snapshot_persistence_version = 2;
    await expect(
      persistAiValueExecutiveReadoutSnapshot({
        executiveReadoutSnapshot: readoutBoundToLatest,
        version: 2,
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

    for (const unsafeTokenizedRef of [
      "roi_model_ref",
      "confidence_score",
      "probability_score",
      "finance_output",
      "prompt_text",
      "response_text"
    ]) {
      const tokenizedRefPlan = measurementPlan();
      await expect(
        persistAiValueMeasurementPlan({
          measurementPlan: tokenizedRefPlan,
          version: 1,
          valueHypothesisId:
            tokenizedRefPlan.value_hypothesis.value_hypothesis_id,
          createdByRole: "value_realization_pm",
          sourceRefs: {
            aggregate_export_id: unsafeTokenizedRef
          }
        })
      ).rejects.toBeInstanceOf(AiValuePersistenceValidationError);
    }

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
