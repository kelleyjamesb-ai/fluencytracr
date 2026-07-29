import fs from "node:fs";
import path from "node:path";

const migrationPath = path.resolve(
  __dirname,
  "../prisma/migrations/20260728230000_add_canonical_identity_family_head_journal/migration.sql"
);
const postPushPath = path.resolve(
  __dirname,
  "../prisma/post_push/20260728230000_canonical_identity_family_head.sql"
);
const schemaPath = path.resolve(__dirname, "../prisma/schema.prisma");
const workflowPaths = [
  path.resolve(__dirname, "../../.github/workflows/assurance-harness.yml"),
  path.resolve(__dirname, "../../.github/workflows/assurance-harness-full.yml")
];

const migrationSql = fs.readFileSync(migrationPath, "utf8");
const postPushSql = fs.readFileSync(postPushPath, "utf8");
const schema = fs.readFileSync(schemaPath, "utf8");

describe("Slice E canonical identity family-head migration", () => {
  it("adds one additive Prisma-backed immutable family journal", () => {
    expect(schema).toContain("model AiValueCanonicalIdentityFamilyHeadJournal");
    expect(schema).toContain('@@map("ai_value_canonical_identity_family_head_journal")');
    expect(schema).toContain(
      '@@unique([sourceKind, sourceRowId], map: "canonical_identity_family_source_row_key")'
    );
    expect(migrationSql).toContain(
      'CREATE TABLE "ai_value_canonical_identity_family_head_journal"'
    );
    expect(migrationSql).toContain('"canonical_identity_family_root_check"');
    expect(migrationSql).toContain('"canonical_identity_family_attestation_check"');
  });

  it.each([migrationSql, postPushSql])(
    "installs deterministic locks, strict backfill, triggers, guards, and least privilege",
    (sql) => {
      expect(sql.trimStart().startsWith("BEGIN;")).toBe(true);
      expect(sql.trimEnd().endsWith("COMMIT;")).toBe(true);
      expect(sql).toContain("canonical_identity_family_lock_key");
      expect(sql).toContain("pg_advisory_xact_lock");
      expect(sql).toContain("hashtextextended");
      expect(sql).toContain("append_canonical_identity_family_head");
      expect(sql).toContain("tail_version + 1");
      expect(sql).toContain("NEW.supersedes_id IS DISTINCT FROM tail_source_row_id");
      expect(sql).toContain("pg_catalog.row_number()");
      expect(sql).toContain("pg_catalog.lag(source_row_id)");
      expect(sql).toContain("canonical identity historical lineage is inconsistent");
      expect(sql).toContain("reject_canonical_identity_source_mutation");
      expect(sql).toContain("BEFORE UPDATE OR DELETE");
      expect(sql).toContain("fluencytracr_slice_e_owner");
      expect(sql).toContain("fluencytracr_slice_e_runtime");
      expect(sql).toContain("NOLOGIN NOSUPERUSER");
      expect(sql).toContain("LOGIN NOSUPERUSER");
      expect(sql).toContain("REVOKE CREATE ON SCHEMA public");
      expect(sql).toContain("GRANT SELECT, INSERT ON TABLE");
      expect(sql).toContain("canonical_identity_family_head_slice_e_runtime_select");
      expect(sql).not.toContain(
        "GRANT INSERT ON TABLE\n  public.ai_value_canonical_identity_family_head_journal"
      );
    }
  );

  it.each(workflowPaths)(
    "configures the exact Slice E runtime login in %s",
    (workflowPath) => {
      const workflow = fs.readFileSync(workflowPath, "utf8");
      expect(workflow).toContain(
        "SLICE_E_RUNTIME_DATABASE_URL: postgresql://fluencytracr_slice_e_runtime:"
      );
    }
  );

  it.each([migrationSql, postPushSql])(
    "uses the same source-envelope contract for attested and legacy rows",
    (sql) => {
      expect(sql).toContain("canonical_value_hypothesis_creation_attestation_v1");
      expect(sql).toContain("canonical_hypothesis_edge_v1");
      expect(sql).toContain("canonical_measurement_lineage_v1");
      expect(sql).toContain("hypothesis_semantic_commitment");
      expect(sql).toContain("plan_semantic_commitment");
      expect(sql).toContain("measurement_cell_semantic_commitment");
      expect(sql).toContain("UNATTESTED_LEGACY");
      expect(sql).toContain("ATTESTATION_PRESENT");
      expect(sql).toContain("^FT_E_HMAC_");
    }
  );
});
