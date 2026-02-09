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

it("rolls up suppressed values to org when possible", () => {
  const metrics = [
    { ...baseMetric, groupKey: "team-1", metricValue: 3, suppressed: true },
    { ...baseMetric, groupKey: "team-2", metricValue: 4, suppressed: true }
  ];
  const result = rollupSuppressedToOrg(metrics, 5);
  const orgMetric = result.find((metric) => metric.groupKey === "org");
  expect(orgMetric?.metricValue).toBe(7);
  expect(orgMetric?.suppressed).toBe(false);
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
  expect(orgMetric?.metricValue).toBe(8);
});
