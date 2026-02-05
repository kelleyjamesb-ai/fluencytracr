import { detectPatterns, getPreviousWeekBucket } from "../src/behavioral_patterns";
import { BehavioralSignal } from "../src/behavioral_signals";

describe("Behavioral Pattern Detection", () => {
  describe("detectPatterns", () => {
    test("suppresses behavioral patterns under TG5", () => {
      const currentWeek: BehavioralSignal[] = [
        {
          org_id: "org-1",
          group_id: "func-rd",
          group_type: "function",
          bucket_start: "2026-01-06",
          signal_name: "delegate_code_commit",
          count: 12,
          suppressed: false
        }
      ];

      const patterns = detectPatterns(currentWeek, [], "func-rd", "2026-01-06");
      expect(patterns).toEqual([]);
    });
  });

  describe("getPreviousWeekBucket", () => {
    test("does not compute prior windows under TG5", () => {
      expect(getPreviousWeekBucket("2026-01-13")).toBeNull();
    });
  });
});
