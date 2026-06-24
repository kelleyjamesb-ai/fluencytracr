import request from "supertest";

const REQUIRED_TABLE_ROWS = [
  { tablename: "Organization" },
  { tablename: "AuditEvent" },
  { tablename: "PolicyDocument" },
  { tablename: "PolicyMapping" },
  { tablename: "CanonicalControlStateHistory" },
  { tablename: "ComplianceEvent" },
  { tablename: "ComplianceDecision" },
  { tablename: "ai_value_objects" },
  { tablename: "value_hypotheses" },
  { tablename: "measurement_plans" },
  { tablename: "source_package_refs" },
  { tablename: "evidence_snapshots" },
  { tablename: "ai_value_pilot_runs" },
  { tablename: "claim_readiness_snapshots" },
  { tablename: "executive_readout_snapshots" },
  { tablename: "measurement_cell_snapshots" }
];

const REQUIRED_MEASUREMENT_CELL_SNAPSHOT_COLUMNS = [
  "aggregate_source_system",
  "aggregate_export_review_ref",
  "aggregate_export_review_state",
  "aggregate_source_export_ref",
  "aggregate_export_review_hash",
  "pipeline_dry_run_ref",
  "pipeline_boundary_hash",
  "aggregate_boundary_ref_json"
];

const REQUIRED_MEASUREMENT_CELL_SNAPSHOT_COLUMN_ROWS =
  REQUIRED_MEASUREMENT_CELL_SNAPSHOT_COLUMNS.map((columnName) => ({
    table_name: "measurement_cell_snapshots",
    column_name: columnName
  }));

const mockDb = (
  tableRows: Array<{ tablename: string }>,
  columnRows = REQUIRED_MEASUREMENT_CELL_SNAPSHOT_COLUMN_ROWS
) => ({
  getPrisma: () => ({
    $queryRawUnsafe: async (query: string) =>
      query.includes("information_schema.columns") ? columnRows : tableRows,
    auditEvent: {
      findFirst: async () => null,
      create: async () => ({})
    }
  }),
  disconnectPrisma: async () => undefined
});

describe("health postgres disclosure", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalDirectUrl = process.env.DIRECT_URL;

  beforeEach(() => {
    jest.resetModules();
    process.env.DATABASE_URL = "postgresql://fluency:fluency@localhost:5432/fluency?schema=public";
    process.env.DIRECT_URL = process.env.DATABASE_URL;
  });

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }

    if (originalDirectUrl === undefined) {
      delete process.env.DIRECT_URL;
    } else {
      process.env.DIRECT_URL = originalDirectUrl;
    }
    jest.dontMock("../src/db");
  });

  it("reports postgres when database readiness succeeds", async () => {
    jest.doMock("../src/db", () => mockDb(REQUIRED_TABLE_ROWS));

    const { app } = await import("../src/app");
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.db).toBe("postgres");
  });

  it("fails readiness when a Phase 4 AI Value persistence table is missing", async () => {
    jest.doMock("../src/db", () => mockDb([
      { tablename: "Organization" },
      { tablename: "AuditEvent" },
      { tablename: "PolicyDocument" },
      { tablename: "PolicyMapping" },
      { tablename: "CanonicalControlStateHistory" },
      { tablename: "ComplianceEvent" },
      { tablename: "ComplianceDecision" },
      { tablename: "ai_value_objects" },
      { tablename: "value_hypotheses" },
      { tablename: "measurement_plans" },
      { tablename: "source_package_refs" }
    ]));

    const { app } = await import("../src/app");
    const response = await request(app).get("/health");

    expect(response.status).toBe(503);
    expect(response.body.status).toBe("degraded");
    expect(response.body.missing_tables).toContain("evidence_snapshots");
    expect(response.body.missing_tables).toContain("ai_value_pilot_runs");
    expect(response.body.missing_tables).toContain("claim_readiness_snapshots");
    expect(response.body.missing_tables).toContain("executive_readout_snapshots");
    expect(response.body.missing_tables).toContain("measurement_cell_snapshots");
  });

  it("reports Phase 4 AI Value persistence tables in ops readiness schema gaps", async () => {
    jest.doMock("../src/db", () => mockDb([
      { tablename: "Organization" },
      { tablename: "AuditEvent" },
      { tablename: "PolicyDocument" },
      { tablename: "PolicyMapping" },
      { tablename: "CanonicalControlStateHistory" },
      { tablename: "ComplianceEvent" },
      { tablename: "ComplianceDecision" },
      { tablename: "ai_value_objects" },
      { tablename: "value_hypotheses" },
      { tablename: "measurement_plans" },
      { tablename: "source_package_refs" }
    ]));

    const { app } = await import("../src/app");
    const response = await request(app)
      .get("/ops/db/readiness")
      .set({ "x-role": "EXEC_VIEWER" });

    expect(response.status).toBe(503);
    expect(response.body.status).toBe("schema_incomplete");
    expect(response.body.missing_tables).toContain("evidence_snapshots");
    expect(response.body.missing_tables).toContain("ai_value_pilot_runs");
    expect(response.body.missing_tables).toContain("claim_readiness_snapshots");
    expect(response.body.missing_tables).toContain("executive_readout_snapshots");
    expect(response.body.missing_tables).toContain("measurement_cell_snapshots");
    expect(response.body.required_tables).toEqual(
      expect.arrayContaining([
        "value_hypotheses",
        "measurement_plans",
        "source_package_refs",
        "evidence_snapshots",
        "ai_value_pilot_runs",
        "claim_readiness_snapshots",
        "executive_readout_snapshots",
        "measurement_cell_snapshots"
      ])
    );
  });

  it("fails readiness when measurement cell snapshot aggregate-boundary columns are missing", async () => {
    jest.doMock("../src/db", () => mockDb(REQUIRED_TABLE_ROWS, [
      {
        table_name: "measurement_cell_snapshots",
        column_name: "aggregate_source_system"
      }
    ]));

    const { app } = await import("../src/app");
    const response = await request(app)
      .get("/ops/db/readiness")
      .set({ "x-role": "EXEC_VIEWER" });

    expect(response.status).toBe(503);
    expect(response.body.status).toBe("schema_incomplete");
    expect(response.body.missing_tables).toEqual([]);
    expect(response.body.missing_columns).toEqual(
      expect.arrayContaining([
        "measurement_cell_snapshots.aggregate_export_review_ref",
        "measurement_cell_snapshots.pipeline_boundary_hash",
        "measurement_cell_snapshots.aggregate_boundary_ref_json"
      ])
    );
    expect(response.body.required_columns).toEqual(
      expect.arrayContaining([
        "measurement_cell_snapshots.aggregate_source_system",
        "measurement_cell_snapshots.aggregate_boundary_ref_json"
      ])
    );
  });

  it("reports missing measurement cell snapshot columns through health", async () => {
    jest.doMock("../src/db", () => mockDb(REQUIRED_TABLE_ROWS, [
      {
        table_name: "measurement_cell_snapshots",
        column_name: "aggregate_source_system"
      }
    ]));

    const { app } = await import("../src/app");
    const response = await request(app).get("/health");

    expect(response.status).toBe(503);
    expect(response.body.status).toBe("degraded");
    expect(response.body.error).toBe("database_schema_incomplete");
    expect(response.body.missing_tables).toEqual([]);
    expect(response.body.missing_columns).toEqual(
      expect.arrayContaining([
        "measurement_cell_snapshots.aggregate_export_review_ref",
        "measurement_cell_snapshots.pipeline_boundary_hash",
        "measurement_cell_snapshots.aggregate_boundary_ref_json"
      ])
    );
  });

  it("reports Phase 4 AI Value persistence tables in ops readiness error posture", async () => {
    jest.doMock("../src/db", () => ({
      getPrisma: () => ({
        $queryRawUnsafe: async () => {
          throw new Error("connection refused");
        },
        auditEvent: {
          findFirst: async () => null,
          create: async () => ({})
        }
      }),
      disconnectPrisma: async () => undefined
    }));

    const { app } = await import("../src/app");
    const response = await request(app)
      .get("/ops/db/readiness")
      .set({ "x-role": "EXEC_VIEWER" });

    expect(response.status).toBe(503);
    expect(response.body.status).toBe("unavailable");
    expect(response.body.required_tables).toEqual(
      expect.arrayContaining([
        "value_hypotheses",
        "measurement_plans",
        "source_package_refs",
        "evidence_snapshots",
        "ai_value_pilot_runs",
        "claim_readiness_snapshots",
        "executive_readout_snapshots",
        "measurement_cell_snapshots"
      ])
    );
  });
});
