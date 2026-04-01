import { MetricObservationSchema } from "@learnaire/shared";

it("accepts any metric name (no allowlist enforced)", () => {
  const result = MetricObservationSchema.safeParse({
    group_key: "team-1",
    group_type: "team",
    bucket_start: "2024-01-01",
    metric_name: "random_metric",
    metric_value: 12,
    is_user_count: true
  });
  expect(result.success).toBe(true);
});

it("accepts metric names from allowlist", () => {
  const result = MetricObservationSchema.safeParse({
    group_key: "team-1",
    group_type: "team",
    bucket_start: "2024-01-01",
    metric_name: "daily_active_users",
    metric_value: 12,
    is_user_count: true
  });
  expect(result.success).toBe(true);
});
