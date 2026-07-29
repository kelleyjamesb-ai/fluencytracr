import fs from "node:fs";
import path from "node:path";

const C0_COMPANION =
  "backend/prisma/post_push/20260728120000_c0_constraints_and_guards.sql";
const C1_COMPANION =
  "backend/prisma/post_push/20260728210000_outcome_comparison_privacy_release.sql";
const HISTORICAL_SOURCE_RLS =
  "scripts/assurance_apply_historical_source_rls.sql";
const C0_VERIFIER = "node scripts/verify_cohort_proof_postgres.mjs";
const C1_VERIFIER =
  "node scripts/verify_outcome_comparison_privacy_postgres.mjs";
const ROLE_BOOTSTRAP =
  "scripts/assurance_precreate_restricted_roles.sql";
const DB_PUSH =
  "npx prisma db push --schema backend/prisma/schema.prisma --skip-generate";

describe("C.1 required CI schema companion", () => {
  it.each(["assurance-harness.yml", "assurance-harness-full.yml"])(
    "installs C.1 after C.0 in %s",
    (fileName) => {
      const workflow = fs.readFileSync(
        path.resolve(__dirname, `../../.github/workflows/${fileName}`),
        "utf8"
      );
      const c0Index = workflow.indexOf(C0_COMPANION);
      const c1Index = workflow.indexOf(C1_COMPANION);
      const historicalRlsIndex = workflow.indexOf(HISTORICAL_SOURCE_RLS);
      const roleIndex = workflow.indexOf(ROLE_BOOTSTRAP);
      const dbPushIndex = workflow.indexOf(DB_PUSH);

      expect(roleIndex).toBeGreaterThanOrEqual(0);
      expect(dbPushIndex).toBeGreaterThan(roleIndex);
      expect(c0Index).toBeGreaterThan(dbPushIndex);
      expect(c0Index).toBeGreaterThanOrEqual(0);
      expect(historicalRlsIndex).toBeGreaterThan(c0Index);
      expect(c1Index).toBeGreaterThan(historicalRlsIndex);
      expect(c1Index).toBeGreaterThan(c0Index);
      expect(workflow.match(new RegExp(ROLE_BOOTSTRAP, "g"))).toHaveLength(1);
      expect(workflow.match(new RegExp(C1_COMPANION, "g"))).toHaveLength(1);
      expect(
        workflow.match(new RegExp(HISTORICAL_SOURCE_RLS, "g"))
      ).toHaveLength(1);
      const c0VerifierIndex = workflow.indexOf(C0_VERIFIER);
      const c1VerifierIndex = workflow.indexOf(C1_VERIFIER);
      expect(c0VerifierIndex).toBeGreaterThanOrEqual(0);
      expect(c1VerifierIndex).toBeGreaterThan(c0VerifierIndex);
      expect(workflow.match(new RegExp(C1_VERIFIER, "g"))).toHaveLength(1);
      expect(workflow).toContain('C1_VERIFY_EPHEMERAL_DATABASE: "1"');
      expect(workflow).toContain("C1_RUNTIME_DATABASE_PASSWORD:");
      expect(workflow).toContain(
        "C1_RUNTIME_DATABASE_URL: postgresql://fluencytracr_c1_runtime:"
      );
      expect(workflow).toContain(
        "C1_CREATION_ATTESTATION_ACTIVE_KEY_ID: FT_C1_HMAC_PRIMARY"
      );
      expect(workflow).toContain("C1_CREATION_ATTESTATION_KEYS_JSON:");
      const jobName =
        fileName === "assurance-harness.yml"
          ? "assurance"
          : "full-scale-assurance";
      const jobIndex = workflow.indexOf(`  ${jobName}:`);
      const timeout = Number(
        workflow
          .slice(jobIndex)
          .match(/^\s{4}timeout-minutes:\s*(\d+)/m)?.[1]
      );
      expect(timeout).toBeGreaterThanOrEqual(
        fileName === "assurance-harness.yml" ? 15 : 90
      );
    }
  );

  it("precreates both restricted roles idempotently before post-push", () => {
    const sql = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../scripts/assurance_precreate_restricted_roles.sql"
      ),
      "utf8"
    );
    for (const role of ["anon", "authenticated"]) {
      expect(sql).toContain(
        `IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}')`
      );
      expect(sql).toContain(`CREATE ROLE ${role} NOLOGIN`);
    }
  });

  it("restores the exact historical source RLS posture before C.1", () => {
    const sql = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../scripts/assurance_apply_historical_source_rls.sql"
      ),
      "utf8"
    );
    expect(sql).toContain(
      "20260522053000_add_outcome_evidence_ingestion"
    );
    expect(sql).toContain("20260609220000_add_ai_value_objects");
    expect(sql).toContain(
      "ALTER TABLE public.outcome_evidence ENABLE ROW LEVEL SECURITY"
    );
    expect(sql).toContain(
      "ALTER TABLE public.ai_value_objects ENABLE ROW LEVEL SECURITY"
    );
    expect(sql).not.toContain("DISABLE ROW LEVEL SECURITY");
  });
});
