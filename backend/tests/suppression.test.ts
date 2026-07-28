import { applySuppression, rollupSuppressedToOrg, suppressAndRollup } from "../src/suppression";

const baseMetric = {
  metricName: "active_users",
  bucketStart: "2024-01-01",
  isUserCount: true,
  suppressed: false
};

it("suppresses small user counts", () => {
  const metrics = [{ ...baseMetric, groupKey: "team-1", metricValue: 3 }];
  const result = applySuppression(metrics, 5);
  expect(result[0].suppressed).toBe(true);
  expect(result[0].metricValue).toBeNull();
});

it("holds an org rollup when it contains suppressed child values", () => {
  const metrics = [
    { ...baseMetric, groupKey: "team-1", metricValue: 3, suppressed: true },
    { ...baseMetric, groupKey: "team-2", metricValue: 4, suppressed: true }
  ];
  const result = rollupSuppressedToOrg(metrics, 5);
  const orgMetric = result.find((metric) => metric.groupKey === "org");
  expect(orgMetric?.metricValue).toBeNull();
  expect(orgMetric?.suppressed).toBe(true);
});

it("suppresses org rollup when still below threshold", () => {
  const metrics = [{ ...baseMetric, groupKey: "team-1", metricValue: 3, suppressed: true }];
  const result = rollupSuppressedToOrg(metrics, 5);
  const orgMetric = result.find((metric) => metric.groupKey === "org");
  expect(orgMetric?.metricValue).toBeNull();
  expect(orgMetric?.suppressed).toBe(true);
});

it("runs suppression and rollup together", () => {
  const metrics = [
    { ...baseMetric, groupKey: "team-1", metricValue: 2 },
    { ...baseMetric, groupKey: "team-2", metricValue: 6 }
  ];
  const result = suppressAndRollup(metrics, 5);
  const team1 = result.find((metric) => metric.groupKey === "team-1");
  const orgMetric = result.find((metric) => metric.groupKey === "org");
  expect(team1?.metricValue).toBeNull();
  expect(team1?.suppressed).toBe(true);
  expect(orgMetric?.metricValue).toBeNull();
  expect(orgMetric?.suppressed).toBe(true);
});

it("holds caller-supplied parents that collide with derived children", () => {
  const metrics = [
    { ...baseMetric, groupKey: "org", groupType: "org", metricValue: 9 },
    { ...baseMetric, groupKey: "team-1", groupType: "team", metricValue: 4 },
    { ...baseMetric, groupKey: "team-2", groupType: "team", metricValue: 5 }
  ];

  const result = suppressAndRollup(metrics, 5);
  const parents = result.filter((metric) => metric.groupKey === "org");

  expect(parents.length).toBeGreaterThan(0);
  expect(parents.every((metric) => metric.suppressed && metric.metricValue === null)).toBe(true);
});

it("keeps team and role hierarchy axes in separate org partitions", () => {
  const result = suppressAndRollup([
    { ...baseMetric, groupKey: "team-1", groupType: "team", metricValue: 5 },
    { ...baseMetric, groupKey: "role-1", groupType: "role", metricValue: 7 }
  ], 5);
  const parents = result.filter((metric) => metric.groupKey === "org");

  expect(parents).toHaveLength(2);
  expect(parents.map((metric) => metric.groupType).sort()).toEqual(["role", "team"]);
  expect(parents.map((metric) => metric.metricValue).sort()).toEqual([5, 7]);
});
