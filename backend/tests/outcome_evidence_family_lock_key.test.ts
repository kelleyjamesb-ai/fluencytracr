const repository = require("../src/repositories/outcome-evidence.repository");

describe("Outcome Evidence family advisory lock key", () => {
  it("exports one stable value-framed key for repository and trigger parity", () => {
    expect(typeof repository.outcomeEvidenceFamilyLockKey).toBe("function");
    expect(
      repository.outcomeEvidenceFamilyLockKey({
        orgId: "org_alpha",
        workflowId: "workflow:renewal",
        jbtdId: "renewal",
        personaId: "account_exec"
      })
    ).toBe(
      '["FT_OUTCOME_EVIDENCE_FAMILY_LOCK_V1","org_alpha","workflow:renewal","renewal","account_exec"]'
    );
    expect(
      repository.outcomeEvidenceFamilyLockKey({
        orgId: "org_alpha",
        workflowId: "workflow:renewal",
        jbtdId: null,
        personaId: null
      })
    ).toBe(
      '["FT_OUTCOME_EVIDENCE_FAMILY_LOCK_V1","org_alpha","workflow:renewal",null,null]'
    );
  });
  it.each([
    [
      {
        orgId: 'org_"quoted"',
        workflowId: "workflow:\\escaped\nline",
        jbtdId: "job\tvalue",
        personaId: "persona_é"
      },
      '["FT_OUTCOME_EVIDENCE_FAMILY_LOCK_V1","org_\\\"quoted\\\"","workflow:\\\\escaped\\nline","job\\tvalue","persona_é"]'
    ],
    [
      {
        orgId: "org",
        workflowId: "workflow",
        jbtdId: "",
        personaId: null
      },
      '["FT_OUTCOME_EVIDENCE_FAMILY_LOCK_V1","org","workflow","",null]'
    ]
  ])(
    "uses JSON value framing without null or escaping collisions",
    (family, expected) => {
      expect(repository.outcomeEvidenceFamilyLockKey(family)).toBe(expected);
    }
  );
});
