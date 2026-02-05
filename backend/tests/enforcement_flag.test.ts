const loadModule = () => require("../src/config/enforcement");

describe("governance enforcement flag", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.GOVERNANCE_ENFORCEMENT;
    delete process.env.FLUENCYTRACR_GOVERNANCE_ENFORCEMENT;
    delete process.env.GOVERNANCE_ENFORCEMENT_MODE;
    delete process.env.ENFORCEMENT_MODE;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("requires explicit ON", () => {
    expect(() => loadModule()).toThrow(/GOVERNANCE_ENFORCEMENT/);
  });

  it("rejects conflicting sources", () => {
    process.env.GOVERNANCE_ENFORCEMENT = "ON";
    process.env.ENFORCEMENT_MODE = "ON";
    expect(() => loadModule()).toThrow(/Conflicting enforcement flags/);
  });

  it("accepts only primary flag set to ON", () => {
    process.env.GOVERNANCE_ENFORCEMENT = "ON";
    expect(() => loadModule()).not.toThrow();
  });
});
