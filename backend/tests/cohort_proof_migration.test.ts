import fs from "node:fs";
import path from "node:path";

const migrationPath = path.resolve(
  __dirname,
  "../prisma/migrations/20260728120000_add_cohort_proof_shared_reservation/migration.sql"
);
const postPushPath = path.resolve(
  __dirname,
  "../prisma/post_push/20260728120000_c0_constraints_and_guards.sql"
);

describe("C.0 privacy authority migration", () => {
  const sql = fs.readFileSync(migrationPath, "utf8");
  const postPushSql = fs.readFileSync(postPushPath, "utf8");

  it("creates all authority, journal, and shared reservation tables", () => {
    for (const table of [
      "cohort_producer_authorities",
      "cohort_producer_authority_revocations",
      "aggregate_privacy_reservations",
      "cohort_proof_journal"
    ]) {
      expect(sql).toContain(`CREATE TABLE "${table}"`);
    }
  });

  it("guards every authoritative privacy table against update and delete", () => {
    for (const trigger of [
      "cohort_producer_authorities_append_only",
      "cohort_producer_authority_revocations_append_only",
      "aggregate_privacy_reservations_append_only",
      "cohort_proof_journal_append_only",
      "aggregate_privacy_release_journal_append_only",
      "aggregate_privacy_manifests_append_only",
      "aggregate_privacy_contribution_claims_append_only"
    ]) {
      expect(sql).toContain(`CREATE TRIGGER "${trigger}"`);
      expect(postPushSql).toContain(`CREATE TRIGGER "${trigger}"`);
    }
    expect(sql).toContain("BEFORE UPDATE OR DELETE");
  });

  it("installs the same check constraints in migration and db-push CI", () => {
    for (const [constraint, expression] of [
      ["cohort_producer_authority_version_check", "CHECK (\"authority_version\" > 0)"],
      ["cohort_producer_authority_time_check", "CHECK (\"expires_at\" > \"valid_from\")"],
      ["cohort_producer_authority_fingerprint_check", "CHECK (\"public_key_fingerprint\" ~ '^[0-9a-f]{64}$')"],
      ["cohort_producer_revocation_version_check", "CHECK (\"authority_version\" > 0)"],
      ["cohort_producer_revocation_reason_check", "CHECK (\"reason_code\" ~ '^[A-Z][A-Z0-9_]{0,63}$')"],
      ["aggregate_privacy_reservation_owner_kind_check", "CHECK (\"owner_kind\" IN ('SLICE_C_FIXED_WINDOW', 'OUTCOME_COMPARISON_PROOF'))"],
      ["aggregate_privacy_reservation_key_check", "CHECK (\"reservation_key\" ~ '^[0-9a-f]{64}$')"],
      ["aggregate_privacy_reservation_content_hash_check", "CHECK (\"owner_content_hash\" ~ '^[0-9a-f]{64}$')"],
      ["cohort_proof_journal_decision_check", "CHECK (\"decision\" = 'VERIFIED_PRIVACY_ONLY')"],
      ["cohort_proof_journal_baseline_count_check", "CHECK (\"baseline_cohort_size\" >= 5)"],
      ["cohort_proof_journal_comparison_count_check", "CHECK (\"comparison_cohort_size\" >= 5)"],
      ["cohort_proof_journal_baseline_window_check", "CHECK (\"baseline_period_end\" > \"baseline_period_start\")"],
      ["cohort_proof_journal_comparison_window_check", "CHECK (\"comparison_period_end\" > \"comparison_period_start\")"]
    ]) {
      expect(sql).toContain(`CONSTRAINT "${constraint}"`);
      expect(postPushSql).toContain(`CONSTRAINT "${constraint}"`);
      expect(sql).toContain(expression);
      expect(postPushSql).toContain(expression);
    }
  });

  it("does not persist the raw proof or population commitment", () => {
    expect(sql).not.toMatch(/"raw_proof"|"signed_proof"|"population_commitment"/);
  });

  it("enables RLS and revokes public Data API roles on every C.0 table", () => {
    for (const table of [
      "cohort_producer_authorities",
      "cohort_producer_authority_revocations",
      "aggregate_privacy_reservations",
      "cohort_proof_journal"
    ]) {
      for (const script of [sql, postPushSql]) {
        expect(script).toContain(
          `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`
        );
        expect(script).toContain(
          `REVOKE ALL ON TABLE public.${table} FROM anon`
        );
        expect(script).toContain(
          `REVOKE ALL ON TABLE public.${table} FROM authenticated`
        );
      }
    }
  });
});
