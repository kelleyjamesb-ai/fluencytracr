import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const migrationPath = path.resolve(
  __dirname,
  "../prisma/migrations/20260728210000_add_outcome_comparison_privacy_release/migration.sql"
);
const postPushPath = path.resolve(
  __dirname,
  "../prisma/post_push/20260728210000_outcome_comparison_privacy_release.sql"
);
const prismaSchemaPath = path.resolve(__dirname, "../prisma/schema.prisma");

const migrationSql = fs.existsSync(migrationPath)
  ? fs.readFileSync(migrationPath, "utf8")
  : "";
const postPushSql = fs.existsSync(postPushPath)
  ? fs.readFileSync(postPushPath, "utf8")
  : "";
const prismaSchema = fs.readFileSync(prismaSchemaPath, "utf8");
const prismaCliPath = path.resolve(__dirname, "../../node_modules/.bin/prisma");

const renderPrismaSchemaDiff = (): string =>
  execFileSync(
    prismaCliPath,
    [
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema-datamodel",
      prismaSchemaPath,
      "--script"
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_URL:
          "postgresql://fluency:fluency@localhost:5432/fluency?schema=public",
        DIRECT_URL:
          "postgresql://fluency:fluency@localhost:5432/fluency?schema=public"
      }
    }
  );

describe("C.1 outcome comparison privacy migration", () => {
  it("adds one create-only typed atomic comparison release model", () => {
    expect(prismaSchema).toContain("model OutcomeComparisonPrivacyRelease");
    expect(prismaSchema).toContain(
      '@@map("outcome_comparison_privacy_releases")'
    );
    expect(migrationSql).toContain(
      'CREATE TABLE "outcome_comparison_privacy_releases"'
    );
    for (const column of [
      "policy_version",
      "proof_journal_id",
      "proof_hash",
      "reservation_key",
      "admission_receipt_hash",
      "baseline_evidence_hash",
      "comparison_evidence_hash",
      "projection_json",
      "projection_hash",
      "content_fingerprint",
      "claim_authority_effect",
      "claim_authorized",
      "model_authorized",
      "customer_publishable"
      ,"attestation_key_id"
      ,"creation_attestation"
    ]) {
      expect(migrationSql).toContain(`"${column}"`);
    }
  });

  it("installs versioned protected creation-attestation authority", () => {
    expect(migrationSql).toContain(
      'CREATE TABLE "outcome_comparison_attestation_keys"'
    );
    expect(migrationSql).toContain(
      'CREATE TABLE "outcome_comparison_attestation_key_activations"'
    );
    expect(migrationSql).toContain(
      'CREATE TABLE "outcome_comparison_attestation_key_revocations"'
    );
    expect(postPushSql).toContain(
      'ALTER TABLE "outcome_comparison_attestation_keys"'
    );
    expect(postPushSql).toContain(
      'ALTER TABLE "outcome_comparison_attestation_key_activations"'
    );
    expect(postPushSql).toContain(
      'ALTER TABLE "outcome_comparison_attestation_key_revocations"'
    );
    for (const script of [migrationSql, postPushSql]) {
      expect(script).toContain("CREATE EXTENSION IF NOT EXISTS pgcrypto");
      expect(script).toContain("fluencytracr_c1_runtime");
      expect(script).toContain("fluencytracr_c1_attestation_provisioner");
      expect(script).toContain(
        'CREATE OR REPLACE FUNCTION "stamp_outcome_comparison_creation_attestation"'
      );
      expect(script).toContain(
        'CREATE TRIGGER "outcome_comparison_creation_attestation_before_insert"'
      );
      expect(script).toContain(
        'CREATE OR REPLACE FUNCTION "verify_outcome_comparison_creation_attestation"'
      );
      expect(script).toContain(
        'CREATE OR REPLACE FUNCTION "outcome_comparison_attestation_readiness"'
      );
      expect(script).toContain("SECURITY DEFINER");
      expect(script).toContain(
        "FT_C1_CREATION_ATTESTATION_V1"
      );
      expect(script).toContain(
        "pg_catalog.date_trunc('milliseconds', pg_catalog.clock_timestamp())"
      );
      expect(script).toContain("session_user");
      expect(script).toContain("REVOKE ALL ON FUNCTION");
    }
    expect(prismaSchema).toContain(
      "model OutcomeComparisonAttestationKey"
    );
    expect(prismaSchema).toContain(
      "model OutcomeComparisonAttestationKeyActivation"
    );
    expect(prismaSchema).toContain(
      "model OutcomeComparisonAttestationKeyRevocation"
    );
    expect(prismaSchema).toContain("@db.Timestamptz(3)");
  });

  it("serializes every key-state decision on the provisioning lock", () => {
    for (const script of [migrationSql, postPushSql]) {
      for (const functionName of [
        "stamp_outcome_comparison_creation_attestation",
        "verify_outcome_comparison_creation_attestation",
        "outcome_comparison_attestation_readiness"
      ]) {
        const start = script.indexOf(`FUNCTION "${functionName}"`);
        expect(start).toBeGreaterThanOrEqual(0);
        const body = script.slice(start, script.indexOf("$$ LANGUAGE", start));
        const lock = body.indexOf("FT_C1_ATTESTATION_PROVISIONING_V1");
        const firstKeyRead = Math.min(
          ...[
            "outcome_comparison_attestation_keys",
            "outcome_comparison_attestation_key_activations",
            "outcome_comparison_attestation_key_revocations"
          ]
            .map((name) => body.indexOf(name))
            .filter((index) => index >= 0)
        );
        expect(lock).toBeGreaterThanOrEqual(0);
        expect(lock).toBeLessThan(firstKeyRead);
      }
    }
  });

  it("gives the runtime read-only C.0 access except for two guarded row locks", () => {
    for (const script of [migrationSql, postPushSql]) {
      const runtimeAclStart = script.indexOf(
        "GRANT SELECT, INSERT ON TABLE public.outcome_comparison_privacy_releases"
      );
      const codecStart = script.indexOf(
        'CREATE OR REPLACE FUNCTION "outcome_comparison_attestation_frame"'
      );
      const runtimeAcl = script.slice(runtimeAclStart, codecStart);
      expect(runtimeAcl).not.toContain("GRANT SELECT, INSERT, UPDATE ON TABLE");
      expect(runtimeAcl).toContain(
        "GRANT SELECT, UPDATE ON TABLE\n  public.cohort_producer_authorities,\n  public.ai_value_objects"
      );
      expect(runtimeAcl).toContain(
        "GRANT SELECT ON TABLE\n  public.cohort_producer_authority_revocations,\n  public.aggregate_privacy_reservations,\n  public.cohort_proof_journal"
      );
      expect(runtimeAcl).not.toContain(
        "FOR ALL TO fluencytracr_c1_runtime"
      );
      expect(runtimeAcl).toContain(
        "cohort_producer_authorities_c1_runtime_lock_only"
      );
      expect(runtimeAcl).toContain(
        "ai_value_objects_c1_runtime_lock_only"
      );
      expect(runtimeAcl).toContain(
        "ALTER TABLE public.outcome_evidence ENABLE ROW LEVEL SECURITY"
      );
      expect(runtimeAcl).toContain(
        "ALTER TABLE public.ai_value_objects ENABLE ROW LEVEL SECURITY"
      );
      expect(runtimeAcl).toContain(
        "outcome_evidence_c1_runtime_select"
      );
      expect(runtimeAcl).toContain(
        "ai_value_objects_c1_runtime_select"
      );
      expect(runtimeAcl).toContain(
        "ai_value_objects_c1_runtime_lock"
      );
      expect(runtimeAcl).toContain(
        "REVOKE ALL ON FUNCTION public.reject_c1_runtime_lock_only_mutation() FROM PUBLIC"
      );
      expect(runtimeAcl).not.toContain(
        "public.aggregate_privacy_manifests"
      );
      expect(runtimeAcl).not.toContain(
        "public.aggregate_privacy_contribution_claims"
      );
      expect(script).toContain(
        "REVOKE ALL ON FUNCTION extensions.digest(BYTEA, TEXT) FROM PUBLIC"
      );
      expect(script).toContain(
        "REVOKE ALL ON FUNCTION extensions.hmac(BYTEA, BYTEA, TEXT) FROM PUBLIC"
      );
      expect(script).toContain(
        "REVOKE ALL ON FUNCTION public.lock_outcome_evidence_family_mutation() FROM PUBLIC"
      );
      expect(script).toContain(
        "REVOKE ALL ON FUNCTION public.outcome_evidence_family_lock_key(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC"
      );
      expect(
        script.indexOf(
          "REVOKE ALL ON FUNCTION public.lock_outcome_evidence_family_mutation() FROM PUBLIC"
        )
      ).toBeGreaterThan(
        script.indexOf(
          'CREATE OR REPLACE FUNCTION "lock_outcome_evidence_family_mutation"'
        )
      );
      expect(
        script.indexOf(
          "REVOKE ALL ON FUNCTION public.outcome_evidence_family_lock_key(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC"
        )
      ).toBeGreaterThan(
        script.indexOf(
          'CREATE OR REPLACE FUNCTION "outcome_evidence_family_lock_key"'
        )
      );
      expect(script).toContain(
        "REVOKE ALL ON ALL TABLES IN SCHEMA public FROM fluencytracr_c1_attestation_provisioner"
      );
      expect(script).toContain(
        "REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM fluencytracr_c1_attestation_provisioner"
      );
      expect(script).toContain(
        "REVOKE CREATE ON SCHEMA public FROM PUBLIC"
      );
      expect(script).toContain(
        "REVOKE CREATE ON SCHEMA public FROM fluencytracr_c1_runtime"
      );
      expect(script).toContain(
        "REVOKE CREATE ON SCHEMA public FROM fluencytracr_c1_attestation_provisioner"
      );
      expect(script).not.toContain("registered_nonrevoked_count");
      expect(script).not.toContain("CONFIGURED_KEY_SET_MISMATCH");
      expect(script).toContain(
        "configured_active_key_id = ANY(configured_key_ids)"
      );
    }
  });

  it("constrains exact replay identity, typed projection, and fixed non-authority flags", () => {
    for (const script of [migrationSql, postPushSql]) {
      expect(script).toContain(
        'CONSTRAINT "outcome_comparison_release_policy_check"'
      );
      expect(script).toContain(
        'CONSTRAINT "outcome_comparison_release_decision_check"'
      );
      expect(script).toContain(
        'CONSTRAINT "outcome_comparison_release_hashes_check"'
      );
      expect(script).toContain(
        'CONSTRAINT "outcome_comparison_release_windows_check"'
      );
      expect(script).toContain(
        'CONSTRAINT "outcome_comparison_release_cohort_sizes_check"'
      );
      expect(script).toContain(
        'CONSTRAINT "outcome_comparison_release_non_authority_check"'
      );
      expect(script).toContain(
        'CONSTRAINT "outcome_comparison_release_identity_check"'
      );
      expect(script).toContain(
        'CONSTRAINT "outcome_comparison_release_values_check"'
      );
    }
    expect(migrationSql).toContain(
      'CREATE UNIQUE INDEX "outcome_comparison_release_proof_journal_key"'
    );
    expect(migrationSql).toContain(
      'CREATE UNIQUE INDEX "outcome_comparison_release_reservation_key"'
    );
    expect(prismaSchema).toContain(
      'name: "outcome_comparison_release_proof_journal_key", map: "outcome_comparison_release_proof_journal_key"'
    );
    expect(prismaSchema).toContain(
      'name: "outcome_comparison_release_reservation_key", map: "outcome_comparison_release_reservation_key"'
    );
  });

  it("makes Prisma db-push generate the exact replay index names readiness requires", () => {
    const generatedSql = renderPrismaSchemaDiff();
    expect(generatedSql).toContain(
      'CREATE UNIQUE INDEX "outcome_comparison_release_proof_journal_key" ON "outcome_comparison_privacy_releases"("org_id", "proof_journal_id")'
    );
    expect(generatedSql).toContain(
      'CREATE UNIQUE INDEX "outcome_comparison_release_reservation_key" ON "outcome_comparison_privacy_releases"("org_id", "reservation_key")'
    );
    expect(generatedSql).not.toContain(
      '"outcome_comparison_privacy_releases_org_id_proof_journal_id_key"'
    );
    expect(generatedSql).not.toContain(
      '"outcome_comparison_privacy_releases_org_id_reservation_key_key"'
    );
  });

  it("guards the release row and revokes Data API access", () => {
    for (const script of [migrationSql, postPushSql]) {
      expect(script).toContain(
        'CREATE TRIGGER "outcome_comparison_privacy_releases_append_only"'
      );
      expect(script).toContain(
        'ALTER TABLE public.outcome_comparison_privacy_releases ENABLE ROW LEVEL SECURITY'
      );
      expect(script).toContain(
        "REVOKE ALL ON TABLE public.outcome_comparison_privacy_releases FROM PUBLIC"
      );
      expect(script).toContain(
        "ARRAY['anon', 'authenticated', 'service_role']"
      );
      expect(script).toContain(
        "public.outcome_comparison_privacy_releases, public.cohort_producer_authorities"
      );
    }
  });

  it("locks every direct Outcome Evidence mutation on the repository family key", () => {
    for (const script of [migrationSql, postPushSql]) {
      expect(script).toContain(
        'CREATE OR REPLACE FUNCTION "outcome_evidence_family_lock_key"'
      );
      expect(script).toContain(
        'CREATE OR REPLACE FUNCTION "lock_outcome_evidence_family_mutation"'
      );
      expect(script).toContain(
        'CREATE TRIGGER "outcome_evidence_family_lock_before_mutation"'
      );
      expect(script).toContain(
        'BEFORE INSERT OR UPDATE OR DELETE ON "outcome_evidence"'
      );
      expect(script).toContain(
        "FT_OUTCOME_EVIDENCE_FAMILY_LOCK_V1"
      );
      expect(script).toContain("CALLED ON NULL INPUT");
      expect(script).toContain('IF old_lock_id <= new_lock_id THEN');
      expect(script).toContain("pg_catalog.pg_advisory_xact_lock(");
      expect(script).toContain("pg_catalog.hashtextextended(");
    }
  });

  it("constrains opaque evidence IDs and bounded metric descriptors in both schema paths", () => {
    for (const script of [migrationSql, postPushSql]) {
      expect(script).toContain(
        'CONSTRAINT "outcome_comparison_release_evidence_ids_check"'
      );
      expect(script).toContain(
        '"baseline_evidence_id" ~ \'^[a-z0-9][a-z0-9_-]{0,127}$\''
      );
      expect(script).toContain(
        '"comparison_evidence_id" ~ \'^[a-z0-9][a-z0-9_-]{0,127}$\''
      );
      expect(script).toContain(
        '"baseline_evidence_id" <> "comparison_evidence_id"'
      );
      expect(script).toContain(
        'CONSTRAINT "outcome_comparison_release_descriptors_check"'
      );
      expect(script).toContain(
        'char_length("outcome_metric") BETWEEN 1 AND 180'
      );
      expect(script).toContain(
        'char_length("outcome_unit") BETWEEN 1 AND 80'
      );
      expect(script).toContain(
        'char_length("source_system") BETWEEN 1 AND 120'
      );
    }
  });

  it("keeps migration and db-push companion behavior byte-aligned", () => {
    const migrationFunctions = migrationSql.slice(
      migrationSql.indexOf(
        'CREATE OR REPLACE FUNCTION "outcome_evidence_family_lock_key"'
      )
    );
    const postPushFunctions = postPushSql.slice(
      postPushSql.indexOf(
        'CREATE OR REPLACE FUNCTION "outcome_evidence_family_lock_key"'
      )
    );
    expect(migrationFunctions).not.toBe("");
    expect(postPushFunctions).toBe(migrationFunctions);
  });
});
