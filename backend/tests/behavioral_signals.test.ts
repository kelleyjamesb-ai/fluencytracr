import { applySuppression, suppressAndRollup, getEmployeeCount } from "../src/behavioral_signals";

const sampleSignals = [
  {
    org_id: "org-1",
    group_id: "team-1",
    group_type: "team" as const,
    function_id: "func-1",
    bucket_start: "2026-01-06",
    signal_name: "delegate_code_commit" as const,
    count: 5,
    suppressed: false
  }
];

describe("Behavioral Signals - TG5 Suppression", () => {
  it("applySuppression returns no outputs under TG5", () => {
    expect(applySuppression(sampleSignals, 5)).toEqual([]);
  });

  it("suppressAndRollup returns no outputs under TG5", () => {
    expect(suppressAndRollup(sampleSignals, 5)).toEqual([]);
  });

  it("getEmployeeCount returns zero under TG5", () => {
    expect(getEmployeeCount("org-1", "team-1", "team")).toBe(0);
  });
});
