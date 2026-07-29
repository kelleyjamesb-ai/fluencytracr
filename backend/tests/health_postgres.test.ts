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
  { tablename: "cohort_proof_journal" },
  { tablename: "outcome_comparison_attestation_keys" },
  { tablename: "outcome_comparison_attestation_key_activations" },
  { tablename: "outcome_comparison_attestation_key_revocations" },
  { tablename: "outcome_comparison_privacy_releases" }
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
  })),
  ...[
    "org_id",
    "policy_version",
    "proof_journal_id",
    "proof_hash",
    "reservation_key",
    "admission_receipt_hash",
    "workflow_id",
    "jbtd_id",
    "persona_id",
    "outcome_metric",
    "outcome_unit",
    "source_system",
    "baseline_period_start",
    "baseline_period_end",
    "baseline_evidence_id",
    "baseline_evidence_hash",
    "baseline_cohort_size",
    "baseline_aggregate_value",
    "comparison_period_start",
    "comparison_period_end",
    "comparison_evidence_id",
    "comparison_evidence_hash",
    "comparison_cohort_size",
    "comparison_aggregate_value",
    "projection_json",
    "projection_hash",
    "content_fingerprint",
    "decision",
    "comparison_privacy_only",
    "claim_authority_effect",
    "claim_authorized",
    "model_authorized",
    "customer_publishable",
    "attestation_key_id",
    "creation_attestation"
  ].map((column_name) => ({
    table_name: "outcome_comparison_privacy_releases",
    column_name
  })),
  ...["key_id", "algorithm", "secret_hash", "provisioned_at"].map(
    (column_name) => ({
      table_name: "outcome_comparison_attestation_keys",
      column_name
    })
  ),
  ...["activation_epoch", "key_id", "activated_at"].map((column_name) => ({
    table_name: "outcome_comparison_attestation_key_activations",
    column_name
  })),
  ...["key_id", "reason_code", "revoked_at"].map((column_name) => ({
    table_name: "outcome_comparison_attestation_key_revocations",
    column_name
  }))
];

const APPEND_ONLY_GUARD_ROWS = [
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
  ],
  [
    "outcome_comparison_privacy_releases_append_only",
    "outcome_comparison_privacy_releases"
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
  has_no_when_clause: true,
  argument_count: 0,
  row_level: true,
  before_event: true,
  fires_insert: false,
  fires_delete: true,
  fires_update: true,
  fires_truncate: false
}));

const OUTCOME_EVIDENCE_FAMILY_MUTATION_FUNCTION_SOURCE = `
DECLARE
  old_lock_key TEXT;
  new_lock_key TEXT;
  old_lock_id BIGINT;
  new_lock_id BIGINT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_lock_key := public.outcome_evidence_family_lock_key(
      NEW.org_id,
      NEW.workflow_id,
      NEW.jbtd_id,
      NEW.persona_id
    );
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(new_lock_key, 0)
    );
    RETURN NEW;
  END IF;

  old_lock_key := public.outcome_evidence_family_lock_key(
    OLD.org_id,
    OLD.workflow_id,
    OLD.jbtd_id,
    OLD.persona_id
  );

  IF TG_OP = 'DELETE' THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(old_lock_key, 0)
    );
    RETURN OLD;
  END IF;

  new_lock_key := public.outcome_evidence_family_lock_key(
    NEW.org_id,
    NEW.workflow_id,
    NEW.jbtd_id,
    NEW.persona_id
  );
  old_lock_id := pg_catalog.hashtextextended(old_lock_key, 0);
  new_lock_id := pg_catalog.hashtextextended(new_lock_key, 0);

  IF old_lock_id <= new_lock_id THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(old_lock_id);
    IF new_lock_id <> old_lock_id THEN
      PERFORM pg_catalog.pg_advisory_xact_lock(new_lock_id);
    END IF;
  ELSE
    PERFORM pg_catalog.pg_advisory_xact_lock(new_lock_id);
    PERFORM pg_catalog.pg_advisory_xact_lock(old_lock_id);
  END IF;

  RETURN NEW;
END;
`;

const REQUIRED_GUARD_ROWS = [
  ...APPEND_ONLY_GUARD_ROWS,
  {
    tgname: "outcome_evidence_family_lock_before_mutation",
    table_name: "outcome_evidence",
    table_schema: "public",
    function_name: "lock_outcome_evidence_family_mutation",
    function_schema: "public",
    function_language: "plpgsql",
    function_source: OUTCOME_EVIDENCE_FAMILY_MUTATION_FUNCTION_SOURCE,
    function_security_definer: false,
    function_volatility: "v",
    tgenabled: "O",
    has_no_when_clause: true,
    argument_count: 0,
    row_level: true,
    before_event: true,
    fires_insert: true,
    fires_delete: true,
    fires_update: true,
    fires_truncate: false
  }
];

const OUTCOME_EVIDENCE_FAMILY_KEY_FUNCTION_SOURCE = `
  SELECT
    '['
    || pg_catalog.to_json('FT_OUTCOME_EVIDENCE_FAMILY_LOCK_V1'::TEXT)::TEXT
    || ',' || pg_catalog.to_json(org_id_value)::TEXT
    || ',' || pg_catalog.to_json(workflow_id_value)::TEXT
    || ',' || COALESCE(pg_catalog.to_json(jbtd_id_value)::TEXT, 'null')
    || ',' || COALESCE(pg_catalog.to_json(persona_id_value)::TEXT, 'null')
    || ']';
`;

const REQUIRED_FAMILY_KEY_FUNCTION_ROWS = [
  {
    function_name: "outcome_evidence_family_lock_key",
    function_schema: "public",
    function_language: "sql",
    function_source: OUTCOME_EVIDENCE_FAMILY_KEY_FUNCTION_SOURCE,
    function_security_definer: false,
    function_volatility: "i",
    function_parallel: "s",
    argument_types: "text, text, text, text",
    return_type: "text",
    function_is_strict: false,
    function_config: ["search_path=pg_catalog"]
  }
];

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
  ],
  [
    "outcome_comparison_release_policy_check",
    "outcome_comparison_privacy_releases",
    "CHECK (policy_version = 'FT_OUTCOME_COMPARISON_PRIVACY_POLICY_2026_07'::text)"
  ],
  [
    "outcome_comparison_release_decision_check",
    "outcome_comparison_privacy_releases",
    "CHECK (decision = 'ATOMIC_COMPARISON_PRIVACY_RELEASED'::text)"
  ],
  [
    "outcome_comparison_release_identity_check",
    "outcome_comparison_privacy_releases",
    "CHECK ((org_id ~ '^[a-z0-9][a-z0-9:_-]{0,179}$'::text) AND (workflow_id ~ '^[a-z0-9][a-z0-9:_-]{0,179}$'::text) AND (jbtd_id ~ '^[a-z0-9][a-z0-9_-]{0,63}$'::text) AND (persona_id ~ '^[a-z0-9][a-z0-9_-]{0,63}$'::text))"
  ],
  [
    "outcome_comparison_release_evidence_ids_check",
    "outcome_comparison_privacy_releases",
    "CHECK ((baseline_evidence_id ~ '^[a-z0-9][a-z0-9_-]{0,127}$'::text) AND (comparison_evidence_id ~ '^[a-z0-9][a-z0-9_-]{0,127}$'::text) AND (baseline_evidence_id <> comparison_evidence_id))"
  ],
  [
    "outcome_comparison_release_descriptors_check",
    "outcome_comparison_privacy_releases",
    "CHECK (((char_length(outcome_metric) >= 1) AND (char_length(outcome_metric) <= 180)) AND ((char_length(outcome_unit) >= 1) AND (char_length(outcome_unit) <= 80)) AND ((char_length(source_system) >= 1) AND (char_length(source_system) <= 120)))"
  ],
  [
    "outcome_comparison_release_hashes_check",
    "outcome_comparison_privacy_releases",
    "CHECK ((proof_hash ~ '^[0-9a-f]{64}$'::text) AND (reservation_key ~ '^[0-9a-f]{64}$'::text) AND (admission_receipt_hash ~ '^[0-9a-f]{64}$'::text) AND (baseline_evidence_hash ~ '^[0-9a-f]{64}$'::text) AND (comparison_evidence_hash ~ '^[0-9a-f]{64}$'::text) AND (projection_hash ~ '^[0-9a-f]{64}$'::text) AND (content_fingerprint ~ '^[0-9a-f]{64}$'::text))"
  ],
  [
    "outcome_comparison_release_windows_check",
    "outcome_comparison_privacy_releases",
    "CHECK ((baseline_period_end > baseline_period_start) AND (comparison_period_end > comparison_period_start) AND (comparison_period_start >= baseline_period_end))"
  ],
  [
    "outcome_comparison_release_cohort_sizes_check",
    "outcome_comparison_privacy_releases",
    "CHECK ((baseline_cohort_size >= 5) AND (comparison_cohort_size >= 5))"
  ],
  [
    "outcome_comparison_release_values_check",
    "outcome_comparison_privacy_releases",
    "CHECK ((baseline_aggregate_value <> 'NaN'::double precision) AND (baseline_aggregate_value <> 'Infinity'::double precision) AND (baseline_aggregate_value <> '-Infinity'::double precision) AND (comparison_aggregate_value <> 'NaN'::double precision) AND (comparison_aggregate_value <> 'Infinity'::double precision) AND (comparison_aggregate_value <> '-Infinity'::double precision))"
  ],
  [
    "outcome_comparison_release_non_authority_check",
    "outcome_comparison_privacy_releases",
    "CHECK ((comparison_privacy_only IS TRUE) AND (claim_authority_effect = 'NONE'::text) AND (claim_authorized IS FALSE) AND (model_authorized IS FALSE) AND (customer_publishable IS FALSE))"
  ]
].map(([conname, table_name, constraint_definition]) => ({
  conname,
  table_name,
  constraint_definition,
  table_schema: "public",
  contype: "c",
  convalidated: true
}));

const REQUIRED_SECURITY_ROWS = [
  "cohort_producer_authorities",
  "cohort_producer_authority_revocations",
  "aggregate_privacy_reservations",
  "cohort_proof_journal",
  "outcome_comparison_attestation_keys",
  "outcome_comparison_attestation_key_activations",
  "outcome_comparison_attestation_key_revocations",
  "outcome_comparison_privacy_releases"
].map((table_name) => ({
  table_name,
  rls_enabled: true,
  anon_has_privilege: false,
  authenticated_has_privilege: false
}));

const REQUIRED_INDEX_ROWS = [
  {
    index_name: "outcome_comparison_release_proof_journal_key",
    table_name: "outcome_comparison_privacy_releases",
    table_schema: "public",
    is_unique: true,
    is_valid: true,
    is_ready: true,
    is_partial: false,
    has_expressions: false,
    index_method: "btree",
    column_names: ["org_id", "proof_journal_id"],
    key_column_count: 2,
    total_column_count: 2
  },
  {
    index_name: "outcome_comparison_release_reservation_key",
    table_name: "outcome_comparison_privacy_releases",
    table_schema: "public",
    is_unique: true,
    is_valid: true,
    is_ready: true,
    is_partial: false,
    has_expressions: false,
    index_method: "btree",
    column_names: ["org_id", "reservation_key"],
    key_column_count: 2,
    total_column_count: 2
  }
];

const mockDb = (
  tableRows: Array<{ tablename: string }>,
  columnRows = REQUIRED_COLUMN_ROWS,
  guardRows = REQUIRED_GUARD_ROWS,
  constraintRows = REQUIRED_CONSTRAINT_ROWS,
  securityRows = REQUIRED_SECURITY_ROWS,
  familyKeyFunctionRows = REQUIRED_FAMILY_KEY_FUNCTION_ROWS,
  indexRows = REQUIRED_INDEX_ROWS,
  attestationStructureOk = true
) => ({
  getPrisma: () => ({
    $queryRaw: async (query: TemplateStringsArray | { strings?: string[] }) =>
      (
        Array.isArray(query)
          ? query.join("")
          : Array.isArray(query?.strings)
            ? query.strings.join("")
            : ""
      ).includes("pg_postmaster_start_time")
        ? [{
            server_address: "127.0.0.1",
            server_port: "5432",
            server_started_at: "2026-07-29 12:00:00+00",
            database_name: "fluency",
            database_oid: "16384"
          }]
        : [{ ok: true, diagnostics: [] }],
    $queryRawUnsafe: async (query: string) =>
      query.includes("outcome_comparison_attestation_structure")
        ? [{ ok: attestationStructureOk }]
      : query.includes("canonical_identity_family_head_structure")
        ? [{ ok: true }]
      : query.includes("persistence_columns")
        ? columnRows
        : query.includes("privacy_unique_indexes")
          ? indexRows
        : query.includes("family_key_function")
          ? familyKeyFunctionRows
        : query.includes("security_table")
          ? securityRows
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
  const originalAttestationKeyId =
    process.env.C1_CREATION_ATTESTATION_ACTIVE_KEY_ID;
  const originalAttestationKeys =
    process.env.C1_CREATION_ATTESTATION_KEYS_JSON;
  const originalSliceEActiveKeyId =
    process.env.SLICE_E_CANONICAL_IDENTITY_ATTESTATION_ACTIVE_WRITE_KEY_ID;
  const originalSliceEActiveSecret =
    process.env.SLICE_E_CANONICAL_IDENTITY_ATTESTATION_ACTIVE_WRITE_SECRET;
  const originalSliceERetainedKeys =
    process.env.SLICE_E_CANONICAL_IDENTITY_ATTESTATION_RETAINED_READ_KEYS_JSON;

  beforeEach(() => {
    jest.resetModules();
    process.env.DATABASE_URL = "postgresql://fluency:fluency@localhost:5432/fluency?schema=public";
    process.env.DIRECT_URL = process.env.DATABASE_URL;
    process.env.C1_CREATION_ATTESTATION_ACTIVE_KEY_ID =
      "FT_C1_HMAC_PRIMARY";
    process.env.C1_CREATION_ATTESTATION_KEYS_JSON = JSON.stringify({
      FT_C1_HMAC_PRIMARY:
        "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE"
    });
    process.env.SLICE_E_CANONICAL_IDENTITY_ATTESTATION_ACTIVE_WRITE_KEY_ID =
      "FT_E_HMAC_PRIMARY";
    process.env.SLICE_E_CANONICAL_IDENTITY_ATTESTATION_ACTIVE_WRITE_SECRET =
      "AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI";
    process.env.SLICE_E_CANONICAL_IDENTITY_ATTESTATION_RETAINED_READ_KEYS_JSON =
      "{}";
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
    if (originalAttestationKeyId === undefined) {
      delete process.env.C1_CREATION_ATTESTATION_ACTIVE_KEY_ID;
    } else {
      process.env.C1_CREATION_ATTESTATION_ACTIVE_KEY_ID =
        originalAttestationKeyId;
    }
    if (originalAttestationKeys === undefined) {
      delete process.env.C1_CREATION_ATTESTATION_KEYS_JSON;
    } else {
      process.env.C1_CREATION_ATTESTATION_KEYS_JSON =
        originalAttestationKeys;
    }
    if (originalSliceEActiveKeyId === undefined) {
      delete process.env
        .SLICE_E_CANONICAL_IDENTITY_ATTESTATION_ACTIVE_WRITE_KEY_ID;
    } else {
      process.env.SLICE_E_CANONICAL_IDENTITY_ATTESTATION_ACTIVE_WRITE_KEY_ID =
        originalSliceEActiveKeyId;
    }
    if (originalSliceEActiveSecret === undefined) {
      delete process.env
        .SLICE_E_CANONICAL_IDENTITY_ATTESTATION_ACTIVE_WRITE_SECRET;
    } else {
      process.env.SLICE_E_CANONICAL_IDENTITY_ATTESTATION_ACTIVE_WRITE_SECRET =
        originalSliceEActiveSecret;
    }
    if (originalSliceERetainedKeys === undefined) {
      delete process.env
        .SLICE_E_CANONICAL_IDENTITY_ATTESTATION_RETAINED_READ_KEYS_JSON;
    } else {
      process.env.SLICE_E_CANONICAL_IDENTITY_ATTESTATION_RETAINED_READ_KEYS_JSON =
        originalSliceERetainedKeys;
    }
    jest.dontMock("../src/db");
    jest.dontMock("../src/canonical-identity-runtime-client");
  });

  it("reports postgres when database readiness succeeds", async () => {
    jest.doMock("../src/db", () => mockDb(REQUIRED_TABLE_ROWS));

    const { app } = await import("../src/app");
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.db).toBe("postgres");
  });

  it("fails readiness when Slice E runtime identity, credential, or HMAC configuration is unavailable", async () => {
    const primary = mockDb(REQUIRED_TABLE_ROWS).getPrisma();
    jest.doMock("../src/db", () => ({
      getPrisma: () => primary,
      disconnectPrisma: async () => undefined
    }));
    jest.doMock("../src/canonical-identity-runtime-client", () => ({
      getCanonicalIdentityRuntimePrisma: () => primary,
      canonicalIdentityRuntimeCredentialIsReady: async () => false,
      canonicalIdentityRuntimeTargetsPrimaryDatabase: async () => false
    }));
    delete process.env
      .SLICE_E_CANONICAL_IDENTITY_ATTESTATION_ACTIVE_WRITE_SECRET;

    const { app } = await import("../src/app");
    const response = await request(app)
      .get("/ops/db/readiness")
      .set({ "x-role": "EXEC_VIEWER" });

    expect(response.status).toBe(503);
    expect(response.body.missing_security).toEqual(
      expect.arrayContaining([
        "canonical_identity_runtime_credential",
        "canonical_identity_runtime_database",
        "canonical_identity_attestation_config"
      ])
    );
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

  it("fails readiness when exact creation-attestation structure drifts", async () => {
    jest.doMock("../src/db", () =>
      mockDb(
        REQUIRED_TABLE_ROWS,
        REQUIRED_COLUMN_ROWS,
        REQUIRED_GUARD_ROWS,
        REQUIRED_CONSTRAINT_ROWS,
        REQUIRED_SECURITY_ROWS,
        REQUIRED_FAMILY_KEY_FUNCTION_ROWS,
        REQUIRED_INDEX_ROWS,
        false
      )
    );

    const { app } = await import("../src/app");
    const response = await request(app)
      .get("/ops/db/readiness")
      .set({ "x-role": "EXEC_VIEWER" });

    expect(response.status).toBe(503);
    expect(response.body.missing_security).toContain(
      "outcome_comparison_attestation_structure"
    );
  });

  it("fails readiness when Outcome Evidence has an unexpected later trigger", async () => {
    const unexpectedTrigger = {
      ...REQUIRED_GUARD_ROWS.find(
        (row) =>
          row.tgname === "outcome_evidence_family_lock_before_mutation"
      )!,
      tgname: "zz_outcome_evidence_rewrite_after_lock",
      function_name: "rewrite_outcome_evidence_slice_after_lock"
    };
    jest.doMock("../src/db", () =>
      mockDb(
        REQUIRED_TABLE_ROWS,
        REQUIRED_COLUMN_ROWS,
        [...REQUIRED_GUARD_ROWS, unexpectedTrigger],
        REQUIRED_CONSTRAINT_ROWS,
        REQUIRED_SECURITY_ROWS,
        REQUIRED_FAMILY_KEY_FUNCTION_ROWS,
        REQUIRED_INDEX_ROWS,
        false
      )
    );

    const { app } = await import("../src/app");
    const response = await request(app)
      .get("/ops/db/readiness")
      .set({ "x-role": "EXEC_VIEWER" });

    expect(response.status).toBe(503);
    expect(response.body.missing_security).toContain(
      "outcome_comparison_attestation_structure"
    );
  });

  it("fails readiness when the exact checker rejects a column-filtered Outcome Evidence trigger", async () => {
    jest.doMock("../src/db", () =>
      mockDb(
        REQUIRED_TABLE_ROWS,
        REQUIRED_COLUMN_ROWS,
        REQUIRED_GUARD_ROWS,
        REQUIRED_CONSTRAINT_ROWS,
        REQUIRED_SECURITY_ROWS,
        REQUIRED_FAMILY_KEY_FUNCTION_ROWS,
        REQUIRED_INDEX_ROWS,
        false
      )
    );

    const { app } = await import("../src/app");
    const response = await request(app)
      .get("/ops/db/readiness")
      .set({ "x-role": "EXEC_VIEWER" });

    expect(response.status).toBe(503);
    expect(response.body.missing_security).toContain(
      "outcome_comparison_attestation_structure"
    );
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

  it("fails readiness when a C.0 table lacks RLS or grants a Data API role", async () => {
    const insecureRows = REQUIRED_SECURITY_ROWS.map((row) =>
      row.table_name === "cohort_proof_journal"
        ? {
            ...row,
            rls_enabled: false,
            authenticated_has_privilege: true
          }
        : row
    );
    jest.doMock("../src/db", () =>
      mockDb(
        REQUIRED_TABLE_ROWS,
        REQUIRED_COLUMN_ROWS,
        REQUIRED_GUARD_ROWS,
        REQUIRED_CONSTRAINT_ROWS,
        insecureRows
      )
    );

    const { app } = await import("../src/app");
    const response = await request(app)
      .get("/ops/db/readiness")
      .set({ "x-role": "EXEC_VIEWER" });

    expect(response.status).toBe(503);
    expect(response.body.status).toBe("schema_incomplete");
    expect(response.body.missing_security).toEqual(["cohort_proof_journal"]);
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

  it("fails readiness when the C.1 release table is missing", async () => {
    jest.doMock("../src/db", () =>
      mockDb(
        REQUIRED_TABLE_ROWS.filter(
          (row) => row.tablename !== "outcome_comparison_privacy_releases"
        )
      )
    );

    const { app } = await import("../src/app");
    const response = await request(app)
      .get("/ops/db/readiness")
      .set({ "x-role": "EXEC_VIEWER" });

    expect(response.status).toBe(503);
    expect(response.body.missing_tables).toEqual([
      "outcome_comparison_privacy_releases"
    ]);
  });

  it("fails readiness when the Outcome Evidence family mutation trigger is missing", async () => {
    jest.doMock("../src/db", () =>
      mockDb(
        REQUIRED_TABLE_ROWS,
        REQUIRED_COLUMN_ROWS,
        REQUIRED_GUARD_ROWS.filter(
          (row) =>
            row.tgname !== "outcome_evidence_family_lock_before_mutation"
        )
      )
    );

    const { app } = await import("../src/app");
    const response = await request(app)
      .get("/ops/db/readiness")
      .set({ "x-role": "EXEC_VIEWER" });

    expect(response.status).toBe(503);
    expect(response.body.missing_guards).toEqual([
      "outcome_evidence_family_lock_before_mutation"
    ]);
    expect(response.body.required_guards).toEqual(
      expect.arrayContaining([
        "outcome_evidence_family_lock_before_mutation",
        "outcome_evidence_family_lock_key_function"
      ])
    );
  });

  it.each([
    ["has a WHEN clause", { has_no_when_clause: false }],
    ["receives trigger arguments", { argument_count: 1 }]
  ])(
    "fails readiness when the Outcome Evidence family mutation trigger %s",
    async (_condition, patch) => {
      jest.doMock("../src/db", () =>
        mockDb(
          REQUIRED_TABLE_ROWS,
          REQUIRED_COLUMN_ROWS,
          REQUIRED_GUARD_ROWS.map((row) =>
            row.tgname === "outcome_evidence_family_lock_before_mutation"
              ? { ...row, ...patch }
              : row
          )
        )
      );

      const { app } = await import("../src/app");
      const response = await request(app)
        .get("/ops/db/readiness")
        .set({ "x-role": "EXEC_VIEWER" });

      expect(response.status).toBe(503);
      expect(response.body.missing_guards).toEqual([
        "outcome_evidence_family_lock_before_mutation"
      ]);
    }
  );

  it("fails readiness when the family lock key SQL codec is missing", async () => {
    jest.doMock("../src/db", () =>
      mockDb(
        REQUIRED_TABLE_ROWS,
        REQUIRED_COLUMN_ROWS,
        REQUIRED_GUARD_ROWS,
        REQUIRED_CONSTRAINT_ROWS,
        REQUIRED_SECURITY_ROWS,
        []
      )
    );

    const { app } = await import("../src/app");
    const response = await request(app)
      .get("/ops/db/readiness")
      .set({ "x-role": "EXEC_VIEWER" });

    expect(response.status).toBe(503);
    expect(response.body.missing_guards).toEqual([
      "outcome_evidence_family_lock_key_function"
    ]);
  });

  it.each([
    [
      "has a different four-argument overload",
      { argument_types: "text, text, uuid, text" }
    ],
    ["returns a non-text value", { return_type: "uuid" }],
    ["is STRICT", { function_is_strict: true }],
    [
      "has a different configured search path",
      { function_config: ["search_path=public, pg_catalog"] }
    ]
  ])(
    "fails readiness when the family lock key function %s",
    async (_condition, patch) => {
      jest.doMock("../src/db", () =>
        mockDb(
          REQUIRED_TABLE_ROWS,
          REQUIRED_COLUMN_ROWS,
          REQUIRED_GUARD_ROWS,
          REQUIRED_CONSTRAINT_ROWS,
          REQUIRED_SECURITY_ROWS,
          REQUIRED_FAMILY_KEY_FUNCTION_ROWS.map((row) => ({
            ...row,
            ...patch
          }))
        )
      );

      const { app } = await import("../src/app");
      const response = await request(app)
        .get("/ops/db/readiness")
        .set({ "x-role": "EXEC_VIEWER" });

      expect(response.status).toBe(503);
      expect(response.body.missing_guards).toEqual([
        "outcome_evidence_family_lock_key_function"
      ]);
    }
  );

  it("fails readiness when the C.1 table grants a Data API role", async () => {
    jest.doMock("../src/db", () =>
      mockDb(
        REQUIRED_TABLE_ROWS,
        REQUIRED_COLUMN_ROWS,
        REQUIRED_GUARD_ROWS,
        REQUIRED_CONSTRAINT_ROWS,
        REQUIRED_SECURITY_ROWS.map((row) =>
          row.table_name === "outcome_comparison_privacy_releases"
            ? { ...row, authenticated_has_privilege: true }
            : row
        )
      )
    );

    const { app } = await import("../src/app");
    const response = await request(app)
      .get("/ops/db/readiness")
      .set({ "x-role": "EXEC_VIEWER" });

    expect(response.status).toBe(503);
    expect(response.body.missing_security).toEqual([
      "outcome_comparison_privacy_releases"
    ]);
  });

  it("fails readiness when a C.1 unique replay index is missing", async () => {
    jest.doMock("../src/db", () =>
      mockDb(
        REQUIRED_TABLE_ROWS,
        REQUIRED_COLUMN_ROWS,
        REQUIRED_GUARD_ROWS,
        REQUIRED_CONSTRAINT_ROWS,
        REQUIRED_SECURITY_ROWS,
        REQUIRED_FAMILY_KEY_FUNCTION_ROWS,
        REQUIRED_INDEX_ROWS.filter(
          (row) =>
            row.index_name !==
            "outcome_comparison_release_proof_journal_key"
        )
      )
    );

    const { app } = await import("../src/app");
    const response = await request(app)
      .get("/ops/db/readiness")
      .set({ "x-role": "EXEC_VIEWER" });

    expect(response.status).toBe(503);
    expect(response.body.missing_indexes).toEqual([
      "outcome_comparison_release_proof_journal_key"
    ]);
    expect(response.body.required_indexes).toEqual([
      "outcome_comparison_release_proof_journal_key",
      "outcome_comparison_release_reservation_key"
    ]);
  });

  it("fails readiness when a C.1 unique replay index is invalid", async () => {
    jest.doMock("../src/db", () =>
      mockDb(
        REQUIRED_TABLE_ROWS,
        REQUIRED_COLUMN_ROWS,
        REQUIRED_GUARD_ROWS,
        REQUIRED_CONSTRAINT_ROWS,
        REQUIRED_SECURITY_ROWS,
        REQUIRED_FAMILY_KEY_FUNCTION_ROWS,
        REQUIRED_INDEX_ROWS.map((row) =>
          row.index_name === "outcome_comparison_release_reservation_key"
            ? { ...row, is_valid: false }
            : row
        )
      )
    );

    const { app } = await import("../src/app");
    const response = await request(app)
      .get("/ops/db/readiness")
      .set({ "x-role": "EXEC_VIEWER" });

    expect(response.status).toBe(503);
    expect(response.body.missing_indexes).toEqual([
      "outcome_comparison_release_reservation_key"
    ]);
  });

  it("fails readiness when a C.1 replay index is not unique", async () => {
    jest.doMock("../src/db", () =>
      mockDb(
        REQUIRED_TABLE_ROWS,
        REQUIRED_COLUMN_ROWS,
        REQUIRED_GUARD_ROWS,
        REQUIRED_CONSTRAINT_ROWS,
        REQUIRED_SECURITY_ROWS,
        REQUIRED_FAMILY_KEY_FUNCTION_ROWS,
        REQUIRED_INDEX_ROWS.map((row) =>
          row.index_name ===
          "outcome_comparison_release_proof_journal_key"
            ? { ...row, is_unique: false }
            : row
        )
      )
    );

    const { app } = await import("../src/app");
    const response = await request(app)
      .get("/ops/db/readiness")
      .set({ "x-role": "EXEC_VIEWER" });

    expect(response.status).toBe(503);
    expect(response.body.missing_indexes).toEqual([
      "outcome_comparison_release_proof_journal_key"
    ]);
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
