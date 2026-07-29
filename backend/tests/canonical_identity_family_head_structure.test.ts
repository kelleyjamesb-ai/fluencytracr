import { checkCanonicalIdentityFamilyHeadStructureReadiness } from "../src/canonical-identity-family-head-structure";

describe("Slice E canonical identity family-head structural readiness", () => {
  it("pins owners, roles, functions, triggers, constraints, RLS, and ACLs", async () => {
    let inspectedSql = "";
    const client = {
      $queryRawUnsafe: jest.fn(async (sql: string) => {
        inspectedSql = sql;
        return [{ ok: true }];
      })
    };

    await expect(checkCanonicalIdentityFamilyHeadStructureReadiness(client)).resolves.toBe(true);

    expect(inspectedSql).toContain("canonical_identity_family_head_structure");
    expect(inspectedSql).toContain("pg_catalog.sha256");
    expect(inspectedSql).not.toContain("public.digest");
    expect(inspectedSql).toContain("fluencytracr_slice_e_owner");
    expect(inspectedSql).toContain("fluencytracr_slice_e_runtime");
    expect(inspectedSql).toContain("ai_value_canonical_identity_family_head_journal");
    expect(inspectedSql).toContain(
      "'public.append_canonical_identity_family_head()'::regprocedure"
    );
    expect(inspectedSql).toContain(
      "'public.reject_canonical_identity_source_mutation()'::regprocedure"
    );
    expect(inspectedSql).toContain("trigger_row.tgfoid <> expected.function_oid");
    expect(inspectedSql).toContain("trigger_row.tgattr <> ''::int2vector");
    expect(inspectedSql).toContain("actual.body_hash");
    expect(inspectedSql).toContain("has_schema_privilege");
    expect(inspectedSql).toContain("pg_auth_members");
    expect(inspectedSql).toContain("'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'");
  });

  it("fails closed when catalog inspection is unavailable", async () => {
    await expect(
      checkCanonicalIdentityFamilyHeadStructureReadiness({
        $queryRawUnsafe: async () => {
          throw new Error("catalog unavailable");
        }
      })
    ).resolves.toBe(false);
  });
});
