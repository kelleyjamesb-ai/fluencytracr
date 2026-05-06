import { detectPatterns, getPreviousWeekBucket } from "../src/behavioral_patterns";
import { BehavioralSignal } from "../src/behavioral_signals";

describe("Behavioral Pattern Detection", () => {
  describe("detectPatterns", () => {
    test("detects automation_emerging pattern", () => {
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

      const previousWeek: BehavioralSignal[] = [];

      const patterns = detectPatterns(currentWeek, previousWeek, "func-rd", "2026-01-06");

      expect(patterns).toHaveLength(1);
      expect(patterns[0].pattern_type).toBe("automation_emerging");
      expect(patterns[0].confidence).toBe("high");  // 12 >= 10 threshold
      expect(patterns[0].description).toContain("beginning to delegate");
    });

    test("detects approval_workflow_mature pattern", () => {
      const signals: BehavioralSignal[] = [
        {
          org_id: "org-1",
          group_id: "func-rd",
          group_type: "function",
          bucket_start: "2026-01-06",
          signal_name: "delegate_approval_request",
          count: 60,
          suppressed: false
        },
        {
          org_id: "org-1",
          group_id: "func-rd",
          group_type: "function",
          bucket_start: "2026-01-06",
          signal_name: "delegate_code_commit",
          count: 40,
          suppressed: false
        }
      ];

      const patterns = detectPatterns(signals, [], "func-rd", "2026-01-06");

      const approvalPattern = patterns.find(p => p.pattern_type === "approval_workflow_mature");
      expect(approvalPattern).toBeDefined();
      expect(approvalPattern?.confidence).toBe("high");
      expect(approvalPattern?.description).toContain("human approval");
    });

    test("detects cross_system_integration pattern", () => {
      const signals: BehavioralSignal[] = [
        {
          org_id: "org-1",
          group_id: "func-it",
          group_type: "function",
          bucket_start: "2026-01-06",
          signal_name: "delegate_record_create",
          count: 18,
          suppressed: false,
          metadata: { is_cross_system: true }
        },
        {
          org_id: "org-1",
          group_id: "func-it",
          group_type: "function",
          bucket_start: "2026-01-06",
          signal_name: "delegate_code_commit",
          count: 14,
          suppressed: false,
          metadata: { is_cross_system: true }
        },
        {
          org_id: "org-1",
          group_id: "func-it",
          group_type: "function",
          bucket_start: "2026-01-06",
          signal_name: "delegate_send_message",
          count: 22,
          suppressed: false,
          metadata: { is_cross_system: true }
        }
      ];

      const patterns = detectPatterns(signals, [], "func-it", "2026-01-06");

      const crossSystemPattern = patterns.find(p => p.pattern_type === "cross_system_integration");
      expect(crossSystemPattern).toBeDefined();
      expect(crossSystemPattern?.confidence).toBe("medium");
      expect(crossSystemPattern?.description).toContain("multiple systems");
    });

    test("detects human_review_dominant pattern", () => {
      const signals: BehavioralSignal[] = [
        {
          org_id: "org-1",
          group_id: "func-rd",
          group_type: "function",
          bucket_start: "2026-01-06",
          signal_name: "delegate_code_commit",
          count: 30,
          suppressed: false,
          metadata: { has_human_review: true }
        },
        {
          org_id: "org-1",
          group_id: "func-rd",
          group_type: "function",
          bucket_start: "2026-01-06",
          signal_name: "delegate_file_update",
          count: 25,
          suppressed: false,
          metadata: { has_human_review: true }
        },
        {
          org_id: "org-1",
          group_id: "func-rd",
          group_type: "function",
          bucket_start: "2026-01-06",
          signal_name: "delegate_send_message",
          count: 20,
          suppressed: false,
          metadata: { has_human_review: true }
        },
        {
          org_id: "org-1",
          group_id: "func-rd",
          group_type: "function",
          bucket_start: "2026-01-06",
          signal_name: "delegate_data_fetch",
          count: 10,
          suppressed: false,
          metadata: { has_human_review: true }  // All signals have review
        },
        {
          org_id: "org-1",
          group_id: "func-rd",
          group_type: "function",
          bucket_start: "2026-01-06",
          signal_name: "delegate_task_assign",
          count: 5,
          suppressed: false,
          metadata: { has_human_review: false }  // One without review for >75%
        }
      ];

      const patterns = detectPatterns(signals, [], "func-rd", "2026-01-06");

      const humanReviewPattern = patterns.find(p => p.pattern_type === "human_review_dominant");
      expect(humanReviewPattern).toBeDefined();
      expect(humanReviewPattern?.confidence).toBe("high");
      expect(humanReviewPattern?.description).toContain("human oversight");
    });

    test("detects data_intensive pattern", () => {
      const signals: BehavioralSignal[] = [
        {
          org_id: "org-1",
          group_id: "func-analytics",
          group_type: "function",
          bucket_start: "2026-01-06",
          signal_name: "delegate_data_fetch",
          count: 100,
          suppressed: false
        },
        {
          org_id: "org-1",
          group_id: "func-analytics",
          group_type: "function",
          bucket_start: "2026-01-06",
          signal_name: "delegate_file_update",
          count: 20,
          suppressed: false
        },
        {
          org_id: "org-1",
          group_id: "func-analytics",
          group_type: "function",
          bucket_start: "2026-01-06",
          signal_name: "delegate_send_message",
          count: 10,
          suppressed: false
        }
      ];

      const patterns = detectPatterns(signals, [], "func-analytics", "2026-01-06");

      const dataIntensivePattern = patterns.find(p => p.pattern_type === "data_intensive");
      expect(dataIntensivePattern).toBeDefined();
      expect(dataIntensivePattern?.confidence).toBe("high");
      expect(dataIntensivePattern?.description).toContain("data retrieval");
    });

    test("excludes suppressed signals from pattern detection", () => {
      const signals: BehavioralSignal[] = [
        {
          org_id: "org-1",
          group_id: "func-rd",
          group_type: "function",
          bucket_start: "2026-01-06",
          signal_name: "delegate_code_commit",
          count: 0,
          suppressed: true
        }
      ];

      const patterns = detectPatterns(signals, [], "func-rd", "2026-01-06");

      expect(patterns).toHaveLength(0);
    });

    test("does not detect patterns for team-level signals", () => {
      const signals: BehavioralSignal[] = [
        {
          org_id: "org-1",
          group_id: "team-eng",
          group_type: "team",
          function_id: "func-rd",
          bucket_start: "2026-01-06",
          signal_name: "delegate_code_commit",
          count: 45,
          suppressed: false
        }
      ];

      const patterns = detectPatterns(signals, [], "team-eng", "2026-01-06");

      expect(patterns).toHaveLength(0);  // Patterns only at function/org level
    });
  });

  describe("getPreviousWeekBucket", () => {
    test("returns previous week bucket date", () => {
      const current = "2026-01-13";  // Tuesday
      const previous = getPreviousWeekBucket(current);
      expect(previous).toBe("2026-01-06");  // Previous Tuesday
    });

    test("handles month boundary", () => {
      const current = "2026-02-03";
      const previous = getPreviousWeekBucket(current);
      expect(previous).toBe("2026-01-27");
    });
  });
});
