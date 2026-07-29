import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string): string =>
  fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");

const c1Migration = read(
  "../prisma/migrations/20260728210000_add_outcome_comparison_privacy_release/migration.sql"
);
const c1PostPush = read(
  "../prisma/post_push/20260728210000_outcome_comparison_privacy_release.sql"
);
const sliceEMigration = read(
  "../prisma/migrations/20260728230000_add_canonical_identity_family_head_journal/migration.sql"
);
const sliceEPostPush = read(
  "../prisma/post_push/20260728230000_canonical_identity_family_head.sql"
);
const c1Structure = read("../src/outcome-comparison-attestation-structure.ts");
const sliceEStructure = read(
  "../src/canonical-identity-family-head-structure.ts"
);
const assuranceRoles = read("../../scripts/assurance_precreate_restricted_roles.sql");
const c1PostgresVerifier = read(
  "../../scripts/verify_outcome_comparison_privacy_postgres.mjs"
);
const sliceEPostgresVerifier = read(
  "../../scripts/verify_aggregate_claim_authorization_postgres.mjs"
);
const c1ProvisioningScripts = [
  "../../scripts/provision_outcome_comparison_attestation_key.mjs",
  "../../scripts/activate_outcome_comparison_attestation_key.mjs",
  "../../scripts/revoke_outcome_comparison_attestation_key.mjs"
].map(read);

describe("Supabase PostgreSQL migration compatibility", () => {
  it.each([c1Migration, c1PostPush])(
    "uses the hosted Supabase pgcrypto namespace atomically",
    (sql) => {
      expect(sql.indexOf("BEGIN;")).toBeLessThan(
        sql.indexOf("CREATE SCHEMA IF NOT EXISTS extensions")
      );
      expect(sql.trimEnd().endsWith("COMMIT;")).toBe(true);
      expect(sql).toContain("CREATE SCHEMA IF NOT EXISTS extensions");
      expect(sql).toContain(
        "CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions"
      );
      expect(sql).toContain("extensions.digest");
      expect(sql).toContain("extensions.hmac");
      expect(sql).not.toContain("public.digest");
      expect(sql).not.toContain("public.hmac");
    }
  );

  it("attests the same hosted pgcrypto functions used by C.1", () => {
    expect(c1Structure).toContain(
      "'extensions.digest(bytea,text)'::regprocedure"
    );
    expect(c1Structure).toContain(
      "'extensions.hmac(bytea,bytea,text)'::regprocedure"
    );
    expect(c1Structure).not.toContain(
      "'public.digest(bytea,text)'::regprocedure"
    );
    expect(c1Structure).not.toContain(
      "'public.hmac(bytea,bytea,text)'::regprocedure"
    );
  });

  it.each([c1Migration, c1PostPush])(
    "removes hosted default grants from the C.1 journals, sequence, and functions",
    (sql) => {
      for (const role of ["anon", "authenticated", "service_role"]) {
        expect(sql).toContain(`'${role}'`);
      }
      expect(sql).toContain(
        "outcome_comparison_attestation_key_activations"
      );
      for (const existingC1Table of [
        "cohort_producer_authorities",
        "cohort_producer_authority_revocations",
        "aggregate_privacy_reservations",
        "cohort_proof_journal",
        "outcome_evidence",
        "ai_value_objects",
        "aggregate_privacy_release_journal"
      ]) {
        expect(sql).toContain(existingC1Table);
      }
      expect(sql).toContain("REVOKE ALL ON SEQUENCE");
      expect(sql).toContain(
        "REVOKE ALL ON FUNCTION public.outcome_comparison_attestation_frame"
      );
    }
  );

  it.each([sliceEMigration, sliceEPostPush])(
    "removes hosted default grants and uses temporary owner membership for Slice E",
    (sql) => {
      for (const role of ["anon", "authenticated", "service_role"]) {
        expect(sql).toContain(`'${role}'`);
      }
      expect(sql).toContain("'createrole_self_grant'");
      expect(sql).toContain("'set'");
      expect(sql).toContain(
        "REVOKE fluencytracr_slice_e_owner FROM CURRENT_USER"
      );
      expect(sql).toContain(
        "REVOKE ALL ON FUNCTION public.canonical_identity_family_lock_key"
      );
    }
  );

  it.each([c1Structure, sliceEStructure])(
    "permits only the unavoidable PostgreSQL 17 creator membership without SET or INHERIT",
    (structure) => {
      expect(structure).toContain("membership.admin_option");
      expect(structure).toContain("NOT membership.inherit_option");
      expect(structure).toContain("NOT membership.set_option");
      expect(structure).toContain(
        "SELECT datdba\n                   FROM pg_catalog.pg_database"
      );
    }
  );

  it.each([
    "../prisma/migrations/20260522123000_add_velocity_distribution_observations/migration.sql",
    "../prisma/migrations/20260522170000_add_v3_fluencytracr_verdicts/migration.sql",
    "../prisma/migrations/20260727220000_add_aggregate_privacy_release_journal/migration.sql"
  ])("closes public-schema access in %s", (migrationPath) => {
    const sql = read(migrationPath);
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    for (const role of ["anon", "authenticated", "service_role"]) {
      expect(sql).toContain(`'${role}'`);
    }
    expect(sql).toContain("REVOKE ALL ON TABLE");
  });

  it("makes CI reproduce Supabase public-schema default grants", () => {
    expect(assuranceRoles).toContain("CREATE ROLE service_role");
    expect(assuranceRoles).toContain(
      "ALTER DEFAULT PRIVILEGES IN SCHEMA public"
    );
    expect(assuranceRoles).toContain(
      "GRANT ALL ON TABLES TO anon, authenticated, service_role"
    );
    expect(assuranceRoles).toContain(
      "GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role"
    );
    expect(assuranceRoles).toContain(
      "GRANT ALL ON SEQUENCES TO anon, authenticated, service_role"
    );
  });

  it("uses direct restricted-role sessions in the PostgreSQL verifiers", () => {
    expect(c1PostgresVerifier).toContain(
      'provisionerDatabaseUrl.username = "fluencytracr_c1_attestation_provisioner"'
    );
    expect(c1PostgresVerifier).toContain("provisionerPrisma.$transaction");
    expect(c1PostgresVerifier).not.toContain(
      "SET LOCAL ROLE fluencytracr_c1_attestation_provisioner"
    );
    expect(sliceEPostgresVerifier).toContain(
      "sliceERuntimePrisma.valueHypothesis.create"
    );
    expect(sliceEPostgresVerifier).toContain(
      "owner-boundary privilege-drift rejection"
    );
  });

  it.each(c1ProvisioningScripts)(
    "requires the direct provisioner credential for key lifecycle operations",
    (script) => {
      expect(script).toContain(
        "C1_ATTESTATION_PROVISIONER_DATABASE_URL"
      );
      expect(script).toContain(
        "fluencytracr_c1_attestation_provisioner"
      );
      expect(script).toContain("session_user");
      expect(script).toContain("current_user");
      expect(script).not.toContain(
        "SET LOCAL ROLE fluencytracr_c1_attestation_provisioner"
      );
    }
  );
});
