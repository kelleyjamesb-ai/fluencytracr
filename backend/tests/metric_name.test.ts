import { MetricObservationSchema } from "@learnaire/shared";

it("rejects metric names outside allowlist", () => {
  const result = MetricObservationSchema.safeParse({
    group_key: "team-1",
    bucket_start: "2024-01-01",
    metric_name: "random_metric",
    metric_value: 12,
    is_user_count: true
  });
  expect(result.success).toBe(false);
});

it("accepts metric names from allowlist", () => {
  const result = MetricObservationSchema.safeParse({
    group_key: "team-1",
    bucket_start: "2024-01-01",
    metric_name: "daily_active_users",
    metric_value: 12,
    is_user_count: true
  });
  expect(result.success).toBe(true);
});
