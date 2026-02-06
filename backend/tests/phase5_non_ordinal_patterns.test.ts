import { PATTERN_TYPES } from "@learnaire/shared";

describe("Phase 5A non-ordinal pattern labels", () => {
  it("uses categorical labels without numeric ordinals", () => {
    const hasDigits = (value: string) => /\d/.test(value);
    const forbiddenTokens = ["level", "stage", "tier", "rank", "first", "second", "third"];

    PATTERN_TYPES.forEach((pattern) => {
      expect(hasDigits(pattern)).toBe(false);
      forbiddenTokens.forEach((token) => {
        expect(pattern.toLowerCase()).not.toContain(token);
      });
    });
  });
});
