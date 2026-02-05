import { applySuppression, rollupSuppressedToOrg, suppressAndRollup } from "../src/suppression";

it("suppresses metrics by emitting no outputs under TG5", () => {
  const metrics = [{ metricName: "active_users", bucketStart: "2024-01-01", metricValue: 3 }];
  expect(applySuppression(metrics, 5)).toEqual([]);
});

it("rollups are suppressed under TG5", () => {
  const metrics = [{ metricName: "active_users", bucketStart: "2024-01-01", metricValue: 3 }];
  expect(rollupSuppressedToOrg(metrics, 5)).toEqual([]);
});

it("suppression and rollup returns empty under TG5", () => {
  const metrics = [{ metricName: "active_users", bucketStart: "2024-01-01", metricValue: 3 }];
  expect(suppressAndRollup(metrics, 5)).toEqual([]);
});
