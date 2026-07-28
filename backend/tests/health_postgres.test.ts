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
  { tablename: "measurement_cell_snapshots" },
  { tablename: "ai_value_customer_data_model_snapshots" },
  { tablename: "aggregate_privacy_manifests" },
  { tablename: "aggregate_privacy_release_journal" },
  { tablename: "aggregate_privacy_contribution_claims" },
  { tablename: "aggregate_privacy_reservations" },
  { tablename: "cohort_producer_authorities" },
  { tablename: "cohort_producer_authority_revocations" },
  { tablename: "cohort_proof_journal" }
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

const REQUIRED_CUSTOMER_DATA_MODEL_SNAPSHOT_COLUMNS = [
  "customer_data_model_snapshot_id",
  "source_snapshot_id",
  "source_projection_id",
  "source_projection_hash",
  "source_gate_id",
  "source_gate_hash",
  "source_promotion_decision_id",
  "source_promotion_decision_hash",
  "implementation_decision_id",
  "implementation_decision_hash",
  "expectation_path_id",
  "expectation_path_version",
  "expectation_path_hash",
  "approved_blueprint_payload_hash",
  "value_driver",
  "milestone_day",
  "aggregate_source_system",
  "pipeline_boundary_hash",
  "source_refs_json",
  "aggregate_boundary_ref_json",
  "required_caveats_json",
  "blocked_uses_json"
];

const REQUIRED_CUSTOMER_DATA_MODEL_SNAPSHOT_COLUMN_ROWS =
  REQUIRED_CUSTOMER_DATA_MODEL_SNAPSHOT_COLUMNS.map((columnName) => ({
    table_name: "ai_value_customer_data_model_snapshots",
    column_name: columnName
  }));

const REQUIRED_COLUMN_ROWS = [
  ...REQUIRED_MEASUREMENT_CELL_SNAPSHOT_COLUMN_ROWS,
  ...REQUIRED_CUSTOMER_DATA_MODEL_SNAPSHOT_COLUMN_ROWS,
  ...[
    "org_id",
    "producer_key_id",
    "authority_version",
    "proof_policy_version",
    "producer_policy_version",
    "public_key_der_base64",
    "public_key_fingerprint",
    "valid_from",
    "expires_at"
  ].map((column_name) => ({
    table_name: "cohort_producer_authorities",
    column_name
  })),
  ...[
    "authority_id",
    "org_id",
    "producer_key_id",
    "authority_version",
    "revoked_at",
    "reason_code"
  ].map((column_name) => ({
    table_name: "cohort_producer_authority_revocations",
    column_name
  })),
  ...[
    "org_id",
    "reservation_key",
    "owner_kind",
    "owner_reference",
    "owner_content_hash",
    "workflow_id",
    "jbtd_id",
    "persona_id"
  ].map((column_name) => ({
    table_name: "aggregate_privacy_reservations",
    column_name
  })),
  ...[
    "org_id",
    "proof_id",
    "proof_hash",
    "producer_key_id",
    "authority_version",
    "workflow_id",
    "jbtd_id",
    "persona_id",
    "baseline_evidence_hash",
    "comparison_evidence_hash",
    "evidence_pair_hash",
    "admission_receipt_hash",
    "reservation_key",
    "decision"
  ].map((column_name) => ({
    table_name: "cohort_proof_journal",
    column_name
  }))
];

const REQUIRED_GUARD_ROWS = [
  ["cohort_producer_authorities_append_only", "cohort_producer_authorities"],
  [
    "cohort_producer_authority_revocations_append_only",
    "cohort_producer_authority_revocations"
  ],
  ["aggregate_privacy_reservations_append_only", "aggregate_privacy_reservations"],
  ["cohort_proof_journal_append_only", "cohort_proof_journal"],
  [
    "aggregate_privacy_release_journal_append_only",
    "aggregate_privacy_release_journal"
  ],
  ["aggregate_privacy_manifests_append_only", "aggregate_privacy_manifests"],
  [
    "aggregate_privacy_contribution_claims_append_only",
    "aggregate_privacy_contribution_claims"
  ]
].map(([tgname, table_name]) => ({
  tgname,
  table_name,
  table_schema: "public",
  function_name: "reject_mcii_privacy_authority_mutation",
  function_schema: "public",
  function_language: "plpgsql",
  function_source: `
    BEGIN
      RAISE EXCEPTION 'MCII privacy authority rows are append-only'
        USING ERRCODE = 'integrity_constraint_violation';
    END;
  `,
  function_security_definer: false,
  function_volatility: "v",
  tgenabled: "O",
  row_level: true,
  before_event: true,
  fires_insert: false,
  fires_delete: true,
  fires_update: true,
  fires_truncate: false
}));

const REQUIRED_CONSTRAINT_ROWS = [
  [
    "cohort_producer_authority_version_check",
    "cohort_producer_authorities",
    "CHECK (authority_version > 0)"
  ],
  [
    "cohort_producer_authority_time_check",
    "cohort_producer_authorities",
    "CHECK (expires_at > valid_from)"
  ],
  [
    "cohort_producer_authority_fingerprint_check",
    "cohort_producer_authorities",
    "CHECK (public_key_fingerprint ~ '^[0-9a-f]{64}$'::text)"
  ],
  [
    "cohort_producer_revocation_version_check",
    "cohort_producer_authority_revocations",
    "CHECK (authority_version > 0)"
  ],
  [
    "cohort_producer_revocation_reason_check",
    "cohort_producer_authority_revocations",
    "CHECK (reason_code ~ '^[A-Z][A-Z0-9_]{0,63}$'::text)"
  ],
  [
    "aggregate_privacy_reservation_owner_kind_check",
    "aggregate_privacy_reservations",
    "CHECK (owner_kind = ANY (ARRAY['SLICE_C_FIXED_WINDOW'::text, 'OUTCOME_COMPARISON_PROOF'::text]))"
  ],
  [
    "aggregate_privacy_reservation_key_check",
    "aggregate_privacy_reservations",
    "CHECK (reservation_key ~ '^[0-9a-f]{64}$'::text)"
  ],
  [
    "aggregate_privacy_reservation_content_hash_check",
    "aggregate_privacy_reservations",
    "CHECK (owner_content_hash ~ '^[0-9a-f]{64}$'::text)"
  ],
  [
    "cohort_proof_journal_decision_check",
    "cohort_proof_journal",
    "CHECK (decision = 'VERIFIED_PRIVACY_ONLY'::text)"
  ],
  [
    "cohort_proof_journal_baseline_count_check",
    "cohort_proof_journal",
    "CHECK (baseline_cohort_size >= 5)"
  ],
  [
    "cohort_proof_journal_comparison_count_check",
    "cohort_proof_journal",
    "CHECK (comparison_cohort_size >= 5)"
  ],
  [
    "cohort_proof_journal_baseline_window_check",
    "cohort_proof_journal",
    "CHECK (baseline_period_end > baseline_period_start)"
  ],
  [
    "cohort_proof_journal_comparison_window_check",
    "cohort_proof_journal",
    "CHECK (comparison_period_end > comparison_period_start)"
  ]
].map(([conname, table_name, constraint_definition]) => ({
  conname,
  table_name,
  constraint_definition,
  table_schema: "public",
  contype: "c",
  convalidated: true
}));

const mockDb = (
  tableRows: Array<{ tablename: string }>,
  columnRows = REQUIRED_COLUMN_ROWS,
  guardRows = REQUIRED_GUARD_ROWS,
  constraintRows = REQUIRED_CONSTRAINT_ROWS
) => ({
  getPrisma: () => ({
    $queryRawUnsafe: async (query: string) =>
      query.includes("information_schema.columns")
        ? columnRows
        : query.includes("pg_trigger")
          ? guardRows
          : query.includes("pg_constraint")
            ? constraintRows
          : tableRows,
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
    expect(response.body.missing_tables).toContain("ai_value_customer_data_model_snapshots");
    expect(response.body.missing_tables).toContain("ai_value_customer_data_model_snapshots");
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
        "measurement_cell_snapshots",
        "ai_value_customer_data_model_snapshots",
        "aggregate_privacy_manifests",
        "aggregate_privacy_release_journal",
        "aggregate_privacy_contribution_claims",
        "aggregate_privacy_reservations",
        "cohort_producer_authorities",
        "cohort_producer_authority_revocations",
        "cohort_proof_journal"
      ])
    );
  });

  it("fails readiness when an append-only privacy guard is missing", async () => {
    jest.doMock("../src/db", () =>
      mockDb(
        REQUIRED_TABLE_ROWS,
        REQUIRED_COLUMN_ROWS,
        REQUIRED_GUARD_ROWS.filter(
          (row) => row.tgname !== "aggregate_privacy_reservations_append_only"
        )
      )
    );

    const { app } = await import("../src/app");
    const response = await request(app)
      .get("/ops/db/readiness")
      .set({ "x-role": "EXEC_VIEWER" });

    expect(response.status).toBe(503);
    expect(response.body.status).toBe("schema_incomplete");
    expect(response.body.missing_guards).toEqual([
      "aggregate_privacy_reservations_append_only"
    ]);
  });

  it("fails readiness when a guard is disabled or attached to the wrong table", async () => {
    const wrongGuards = REQUIRED_GUARD_ROWS.map((row) =>
      row.tgname === "aggregate_privacy_reservations_append_only"
        ? { ...row, table_name: "cohort_proof_journal", tgenabled: "D" }
        : row
    );
    jest.doMock("../src/db", () =>
      mockDb(
        REQUIRED_TABLE_ROWS,
        REQUIRED_COLUMN_ROWS,
        wrongGuards
      )
    );

    const { app } = await import("../src/app");
    const response = await request(app)
      .get("/ops/db/readiness")
      .set({ "x-role": "EXEC_VIEWER" });

    expect(response.status).toBe(503);
    expect(response.body.missing_guards).toEqual([
      "aggregate_privacy_reservations_append_only"
    ]);
  });

  it("fails readiness when the guard function body is replaced", async () => {
    const permissiveGuards = REQUIRED_GUARD_ROWS.map((row) => ({
      ...row,
      function_source: "BEGIN RETURN OLD; END;"
    }));
    jest.doMock("../src/db", () =>
      mockDb(
        REQUIRED_TABLE_ROWS,
        REQUIRED_COLUMN_ROWS,
        permissiveGuards
      )
    );

    const { app } = await import("../src/app");
    const response = await request(app)
      .get("/ops/db/readiness")
      .set({ "x-role": "EXEC_VIEWER" });

    expect(response.status).toBe(503);
    expect(response.body.missing_guards).toEqual(
      expect.arrayContaining([
        "aggregate_privacy_reservations_append_only",
        "cohort_proof_journal_append_only"
      ])
    );
  });

  it("fails readiness when a required privacy check constraint is absent", async () => {
    jest.doMock("../src/db", () =>
      mockDb(
        REQUIRED_TABLE_ROWS,
        REQUIRED_COLUMN_ROWS,
        REQUIRED_GUARD_ROWS,
        REQUIRED_CONSTRAINT_ROWS.filter(
          (row) =>
            row.conname !== "aggregate_privacy_reservation_owner_kind_check"
        )
      )
    );

    const { app } = await import("../src/app");
    const response = await request(app)
      .get("/ops/db/readiness")
      .set({ "x-role": "EXEC_VIEWER" });

    expect(response.status).toBe(503);
    expect(response.body.missing_constraints).toEqual([
      "aggregate_privacy_reservation_owner_kind_check"
    ]);
  });

  it("fails readiness when a same-named check constraint is weakened", async () => {
    const weakenedConstraints = REQUIRED_CONSTRAINT_ROWS.map((row) =>
      row.conname === "aggregate_privacy_reservation_owner_kind_check"
        ? { ...row, constraint_definition: "CHECK (true)" }
        : row
    );
    jest.doMock("../src/db", () =>
      mockDb(
        REQUIRED_TABLE_ROWS,
        REQUIRED_COLUMN_ROWS,
        REQUIRED_GUARD_ROWS,
        weakenedConstraints
      )
    );

    const { app } = await import("../src/app");
    const response = await request(app)
      .get("/ops/db/readiness")
      .set({ "x-role": "EXEC_VIEWER" });

    expect(response.status).toBe(503);
    expect(response.body.missing_constraints).toEqual([
      "aggregate_privacy_reservation_owner_kind_check"
    ]);
  });

  it("preserves SQL literal bytes when comparing check definitions", async () => {
    const weakenedConstraints = REQUIRED_CONSTRAINT_ROWS.map((row) =>
      row.conname === "cohort_producer_authority_fingerprint_check"
        ? {
            ...row,
            constraint_definition:
              "CHECK (public_key_fingerprint ~ '^[0-9a-f ]{64}$'::text)"
          }
        : row
    );
    jest.doMock("../src/db", () =>
      mockDb(
        REQUIRED_TABLE_ROWS,
        REQUIRED_COLUMN_ROWS,
        REQUIRED_GUARD_ROWS,
        weakenedConstraints
      )
    );

    const { app } = await import("../src/app");
    const response = await request(app)
      .get("/ops/db/readiness")
      .set({ "x-role": "EXEC_VIEWER" });

    expect(response.status).toBe(503);
    expect(response.body.missing_constraints).toEqual([
      "cohort_producer_authority_fingerprint_check"
    ]);
  });

  it("preserves quoted identifier bytes when comparing check definitions", async () => {
    const weakenedConstraints = REQUIRED_CONSTRAINT_ROWS.map((row) =>
      row.conname === "cohort_producer_authority_version_check"
        ? {
            ...row,
            constraint_definition: 'CHECK ("AUTHORITY_VERSION" > 0)'
          }
        : row
    );
    jest.doMock("../src/db", () =>
      mockDb(
        REQUIRED_TABLE_ROWS,
        REQUIRED_COLUMN_ROWS,
        REQUIRED_GUARD_ROWS,
        weakenedConstraints
      )
    );

    const { app } = await import("../src/app");
    const response = await request(app)
      .get("/ops/db/readiness")
      .set({ "x-role": "EXEC_VIEWER" });

    expect(response.status).toBe(503);
    expect(response.body.missing_constraints).toEqual([
      "cohort_producer_authority_version_check"
    ]);
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
        "measurement_cell_snapshots",
        "ai_value_customer_data_model_snapshots"
      ])
    );
  });
});
