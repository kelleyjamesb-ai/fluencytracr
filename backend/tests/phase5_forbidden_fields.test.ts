import { containsForbiddenFields } from "@learnaire/shared";

describe("Phase 5A forbidden field enforcement", () => {
  it("blocks ordering and duration fields", () => {
    const payload = {
      order: 1,
      sequence: "first",
      streak: 3,
      duration: 120
    };

    expect(containsForbiddenFields(payload)).toBe(true);
  });

  it("blocks delta and trend fields", () => {
    const payload = {
      delta: 5,
      trend: "up",
      comparison: "baseline"
    };

    expect(containsForbiddenFields(payload)).toBe(true);
  });
});
