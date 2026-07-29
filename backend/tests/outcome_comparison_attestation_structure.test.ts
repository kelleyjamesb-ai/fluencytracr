import { checkOutcomeComparisonAttestationStructureReadiness } from "../src/outcome-comparison-attestation-structure";

describe("C.1 exact attestation structural readiness", () => {
  it("pins trigger OIDs, runtime guard, pgcrypto, ACLs, and RLS posture", async () => {
    let inspectedSql = "";
    const client = {
      $queryRawUnsafe: jest.fn(async (sql: string) => {
        inspectedSql = sql;
        return [{ ok: true }];
      })
    };

    await expect(
      checkOutcomeComparisonAttestationStructureReadiness(client)
    ).resolves.toBe(true);
    expect(inspectedSql).toContain(
      "'public.reject_c1_runtime_lock_only_mutation()'::regprocedure"
    );
    expect(inspectedSql).toContain(
      "trigger_row.tgfoid <> expected.function_oid"
    );
    expect(inspectedSql).toContain(
      "trigger_row.tgattr <> ''::int2vector"
    );
    expect(inspectedSql).toContain(
      "outcome_evidence_family_lock_before_mutation"
    );
    expect(inspectedSql).toContain(
      "'public.lock_outcome_evidence_family_mutation()'::regprocedure"
    );
    expect(inspectedSql).toContain(
      "lock_outcome_evidence_family_mutation"
    );
    expect(inspectedSql).toContain(
      "outcome_evidence_family_lock_key"
    );
    expect(inspectedSql).toContain(
      "bd68316cdace1bcdd4677c8c1743c06147906336166f067f6ad9cdd6251d5e8d"
    );
    expect(inspectedSql).toContain(
      "e7f6252ddde2c4d762fc15e5c09b21150f6babeaffc69bdd3c7b4f7d0f4795a1"
    );
    expect(inspectedSql).toContain(
      "outcome_comparison_creation_attestation_before_insert"
    );
    expect(inspectedSql).toContain(
      "reject_c1_runtime_lock_only_mutation"
    );
    expect(inspectedSql).toContain(
      "'public.digest(bytea,text)'::regprocedure"
    );
    expect(inspectedSql).toContain(
      "'public.hmac(bytea,bytea,text)'::regprocedure"
    );
    expect(inspectedSql).toContain("function_language");
    expect(inspectedSql).toContain("function_binary");
    expect(inspectedSql).toContain("outcome_evidence");
    expect(inspectedSql).toContain("ai_value_objects");
    expect(inspectedSql).toContain("expected_rls");
    expect(inspectedSql).toContain("('outcome_evidence', true)");
    expect(inspectedSql).toContain("('ai_value_objects', true)");
    expect(inspectedSql).toContain(
      "outcome_evidence_c1_runtime_select"
    );
    expect(inspectedSql).toContain(
      "ai_value_objects_c1_runtime_select"
    );
    expect(inspectedSql).toContain(
      "ai_value_objects_c1_runtime_lock"
    );
    expect(inspectedSql).toContain(
      "provisioner_forbidden_table"
    );
    expect(inspectedSql).toContain(
      "provisioner_forbidden_sequence"
    );
    expect(inspectedSql).toContain(
      "has_schema_privilege"
    );
    expect(inspectedSql).toContain(
      "'fluencytracr_c1_runtime'"
    );
    expect(inspectedSql).toContain(
      "'fluencytracr_c1_attestation_provisioner'"
    );
    expect(inspectedSql).not.toContain(
      "'public.outcome_comparison_privacy_releases', 'SELECT,INSERT'"
    );
    expect(inspectedSql).not.toContain(
      "'public.cohort_producer_authorities', 'SELECT,UPDATE'"
    );
    expect(inspectedSql).not.toContain(
      "'public.ai_value_objects', 'SELECT,UPDATE'"
    );
    expect(inspectedSql).not.toContain(
      "public.aggregate_privacy_manifests"
    );
    expect(inspectedSql).not.toContain(
      "public.aggregate_privacy_contribution_claims"
    );
  });

  it("fails closed when the catalog query is unavailable", async () => {
    await expect(
      checkOutcomeComparisonAttestationStructureReadiness({
        $queryRawUnsafe: async () => {
          throw new Error("catalog unavailable");
        }
      })
    ).resolves.toBe(false);
  });
});
