import { store } from "../src/store";
import { applySuppression, suppressAndRollup, getEmployeeCount } from "../src/behavioral_signals";
import { BehavioralSignal } from "../src/behavioral_signals";

describe("Behavioral Signals - Suppression and Rollup", () => {
  beforeEach(() => {
    store.reset();

    // Create test org
    store.orgs.set("org-1", {
      id: "org-1",
      name: "Test Org",
      minGroupSize: 10,
      createdAt: "2026-01-01T00:00:00Z"
    });

    // Create functions
    store.functions.set("func-rd", {
      id: "func-rd",
      orgId: "org-1",
      name: "R&D"
    });

    store.functions.set("func-sales", {
      id: "func-sales",
      orgId: "org-1",
      name: "Sales"
    });

    // Create teams
    store.teams.set("team-eng", {
      id: "team-eng",
      orgId: "org-1",
      name: "Engineering",
      parentTeamId: undefined
    });

    store.teams.set("team-ds", {
      id: "team-ds",
      orgId: "org-1",
      name: "Data Science",
      parentTeamId: undefined
    });

    // Create employees
    // Engineering team: 10 members (not suppressed)
    for (let i = 0; i < 10; i++) {
      store.employees.set(`emp-eng-${i}`, {
        orgId: "org-1",
        employeeHash: `hash-eng-${i}`,
        teamIds: new Set(["team-eng"]),
        roleIds: new Set()
      });
    }

    // Data Science team: 3 members (suppressed, < 5)
    for (let i = 0; i < 3; i++) {
      store.employees.set(`emp-ds-${i}`, {
        orgId: "org-1",
        employeeHash: `hash-ds-${i}`,
        teamIds: new Set(["team-ds"]),
        roleIds: new Set()
      });
    }
  });

  describe("applySuppression", () => {
    test("suppresses team with count < 5", () => {
      const signals: BehavioralSignal[] = [
        {
          org_id: "org-1",
          group_id: "team-ds",
          group_type: "team",
          function_id: "func-rd",
          bucket_start: "2026-01-06",
          signal_name: "delegate_code_commit",
          count: 12,
          suppressed: false
        }
      ];

      const result = applySuppression(signals, 5);

      expect(result[0].suppressed).toBe(true);
      expect(result[0].count).toBe(0);
      expect(result[0].originalCount).toBe(12);
    });

    test("does not suppress team with count >= 5", () => {
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

      const result = applySuppression(signals, 5);

      expect(result[0].suppressed).toBe(false);
      expect(result[0].count).toBe(45);
    });

    test("does not suppress function-level aggregates", () => {
      const signals: BehavioralSignal[] = [
        {
          org_id: "org-1",
          group_id: "func-rd",
          group_type: "function",
          bucket_start: "2026-01-06",
          signal_name: "delegate_code_commit",
          count: 50,
          suppressed: false
        }
      ];

      const result = applySuppression(signals, 5);

      expect(result[0].suppressed).toBe(false);
      expect(result[0].count).toBe(50);
    });

    test("does not suppress org-level aggregates", () => {
      const signals: BehavioralSignal[] = [
        {
          org_id: "org-1",
          group_id: "org-1",
          group_type: "org",
          bucket_start: "2026-01-06",
          signal_name: "delegate_code_commit",
          count: 100,
          suppressed: false
        }
      ];

      const result = applySuppression(signals, 5);

      expect(result[0].suppressed).toBe(false);
      expect(result[0].count).toBe(100);
    });
  });

  describe("suppressAndRollup", () => {
    test("creates function rollup from team signals", () => {
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

      const result = suppressAndRollup(signals, 5);

      // Should have original team signal + function rollup + org rollup
      expect(result.length).toBeGreaterThan(1);

      const funcRollup = result.find(r => r.group_type === "function" && r.group_id === "func-rd");
      expect(funcRollup).toBeDefined();
      expect(funcRollup?.count).toBe(45);  // Should aggregate team count
    });

    test("includes suppressed counts in function rollup", () => {
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
        },
        {
          org_id: "org-1",
          group_id: "team-ds",
          group_type: "team",
          function_id: "func-rd",
          bucket_start: "2026-01-06",
          signal_name: "delegate_code_commit",
          count: 12,
          suppressed: false
        }
      ];

      const result = suppressAndRollup(signals, 5);

      // team-ds should be suppressed (3 members < 5)
      const teamDs = result.find(r => r.group_id === "team-ds");
      expect(teamDs?.suppressed).toBe(true);

      // Function rollup should include both teams (45 + 12 = 57)
      const funcRollup = result.find(r => r.group_type === "function" && r.group_id === "func-rd");
      expect(funcRollup?.count).toBe(57);
      expect(funcRollup?.includesRollup).toBe(true);  // Marked as including rollup
    });

    test("creates org rollup from all function rollups", () => {
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

      const result = suppressAndRollup(signals, 5);

      const orgRollup = result.find(r => r.group_type === "org" && r.group_id === "org-1");
      expect(orgRollup).toBeDefined();
      expect(orgRollup?.count).toBe(45);
    });
  });

  describe("getEmployeeCount", () => {
    test("returns correct count for team", () => {
      const count = getEmployeeCount("org-1", "team-eng", "team");
      expect(count).toBe(10);
    });

    test("returns correct count for small team", () => {
      const count = getEmployeeCount("org-1", "team-ds", "team");
      expect(count).toBe(3);
    });
  });
});
