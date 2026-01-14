import { store } from "../src/store";
import { computeFluencyIndexPreview, runFluencyIndexJob } from "../src/fluency_service";

beforeEach(() => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 10, createdAt: "now" });
});

it("computes fluency index with full data", () => {
  store.metrics.set("org-1:org:2024-01-01:active_users_percent_of_assigned:", {
    orgId: "org-1",
    group_key: "org",
    group_type: "org",
    vendor: "all",
    bucket_start: "2024-01-01",
    metric_name: "active_users_percent_of_assigned",
    metric_value: 0.8,
    is_user_count: false,
    suppressed: false
  });
  store.metrics.set("org-1:org:2024-01-01:avg_sessions_per_active_user:", {
    orgId: "org-1",
    group_key: "org",
    group_type: "org",
    vendor: "all",
    bucket_start: "2024-01-01",
    metric_name: "avg_sessions_per_active_user",
    metric_value: 5,
    is_user_count: false,
    suppressed: false
  });
  store.metrics.set("org-1:org:2024-01-01:usage_frequency_band_rare_count:", {
    orgId: "org-1",
    group_key: "org",
    group_type: "org",
    vendor: "all",
    bucket_start: "2024-01-01",
    metric_name: "usage_frequency_band_rare_count",
    metric_value: 10,
    is_user_count: true,
    suppressed: false
  });
  store.metrics.set("org-1:org:2024-01-01:usage_frequency_band_occasional_count:", {
    orgId: "org-1",
    group_key: "org",
    group_type: "org",
    vendor: "all",
    bucket_start: "2024-01-01",
    metric_name: "usage_frequency_band_occasional_count",
    metric_value: 20,
    is_user_count: true,
    suppressed: false
  });
  store.metrics.set("org-1:org:2024-01-01:usage_frequency_band_regular_count:", {
    orgId: "org-1",
    group_key: "org",
    group_type: "org",
    vendor: "all",
    bucket_start: "2024-01-01",
    metric_name: "usage_frequency_band_regular_count",
    metric_value: 25,
    is_user_count: true,
    suppressed: false
  });
  store.metrics.set("org-1:org:2024-01-01:usage_frequency_band_habitual_count:", {
    orgId: "org-1",
    group_key: "org",
    group_type: "org",
    vendor: "all",
    bucket_start: "2024-01-01",
    metric_name: "usage_frequency_band_habitual_count",
    metric_value: 30,
    is_user_count: true,
    suppressed: false
  });
  store.metrics.set("org-1:org:2024-01-01:week_over_week_usage_growth_percent:", {
    orgId: "org-1",
    group_key: "org",
    group_type: "org",
    vendor: "all",
    bucket_start: "2024-01-01",
    metric_name: "week_over_week_usage_growth_percent",
    metric_value: 20,
    is_user_count: false,
    suppressed: false
  });
  store.metrics.set("org-1:org:2024-01-01:adoption_delta_post_training_percent:", {
    orgId: "org-1",
    group_key: "org",
    group_type: "org",
    vendor: "all",
    bucket_start: "2024-01-01",
    metric_name: "adoption_delta_post_training_percent",
    metric_value: 40,
    is_user_count: false,
    suppressed: false
  });
  store.controls.set("org-1:org:2024-01-01:ai_enabled_status:", {
    orgId: "org-1",
    group_key: "org",
    group_type: "org",
    vendor: "all",
    bucket_start: "2024-01-01",
    control_name: "ai_enabled_status",
    control_value: true,
    bucket_end: "2024-01-31"
  });
  store.controls.set("org-1:org:2024-01-01:data_retention_policy_status:", {
    orgId: "org-1",
    group_key: "org",
    group_type: "org",
    vendor: "all",
    bucket_start: "2024-01-01",
    control_name: "data_retention_policy_status",
    control_value: true,
    bucket_end: "2024-01-31"
  });
  store.controls.set("org-1:org:2024-01-01:model_training_opt_out_status:", {
    orgId: "org-1",
    group_key: "org",
    group_type: "org",
    vendor: "all",
    bucket_start: "2024-01-01",
    control_name: "model_training_opt_out_status",
    control_value: true,
    bucket_end: "2024-01-31"
  });
  store.controls.set("org-1:org:2024-01-01:external_sharing_disabled_status:", {
    orgId: "org-1",
    group_key: "org",
    group_type: "org",
    vendor: "all",
    bucket_start: "2024-01-01",
    control_name: "external_sharing_disabled_status",
    control_value: true,
    bucket_end: "2024-01-31"
  });

  const result = computeFluencyIndexPreview("org-1", "2024-01-01");
  expect(result.score).not.toBeNull();
  expect(result.dataCompleteness).toBe(1);
  expect(result.confidence).toBe(1);
});

it("reduces confidence when data is missing", () => {
  store.metrics.set("org-1:org:2024-01-01:active_users_percent_of_assigned:", {
    orgId: "org-1",
    group_key: "org",
    group_type: "org",
    vendor: "all",
    bucket_start: "2024-01-01",
    metric_name: "active_users_percent_of_assigned",
    metric_value: 0.8,
    is_user_count: false,
    suppressed: false
  });

  const result = computeFluencyIndexPreview("org-1", "2024-01-01");
  expect(result.score).not.toBeNull();
  expect(result.dataCompleteness).toBeLessThan(1);
});

it("stores fluency index metrics", () => {
  store.metrics.set("org-1:org:2024-01-01:active_users_percent_of_assigned:", {
    orgId: "org-1",
    group_key: "org",
    group_type: "org",
    vendor: "all",
    bucket_start: "2024-01-01",
    metric_name: "active_users_percent_of_assigned",
    metric_value: 0.8,
    is_user_count: false,
    suppressed: false
  });
  runFluencyIndexJob("org-1");
  const stored = Array.from(store.metrics.values()).find(
    (metric) => metric.metric_name === "fluency_index"
  );
  expect(stored).toBeDefined();
  const snapshot = store.fluencySnapshots.get("org-1:2024-01-01");
  expect(snapshot?.dimensionScores.coverage).toBe(80);
  expect(store.fluencyDimensions.size).toBeGreaterThan(0);
});
