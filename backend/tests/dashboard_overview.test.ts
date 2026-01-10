import { app } from "../src/app";
import { store } from "../src/store";

const startServer = () => {
  return new Promise<{ url: string; close: () => void }>((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      if (typeof address === "string" || address === null) {
        throw new Error("Unexpected address");
      }
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () => server.close()
      });
    });
  });
};

beforeEach(() => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 10, createdAt: "now" });
});

it("returns 12 points for 12w range", async () => {
  for (let i = 1; i <= 12; i += 1) {
    const bucket = `2024-01-${String(i).padStart(2, "0")}`;
    store.metrics.set(`org-1:org:${bucket}:weekly_active_users:`, {
      orgId: "org-1",
      group_key: "org",
      group_type: "org",
      vendor: "all",
      bucket_start: bucket,
      metric_name: "weekly_active_users",
      metric_value: 20,
      is_user_count: true,
      suppressed: false
    });
    store.metrics.set(`org-1:org:${bucket}:usage_trend_direction:`, {
      orgId: "org-1",
      group_key: "org",
      group_type: "org",
      vendor: "all",
      bucket_start: bucket,
      metric_name: "usage_trend_direction",
      metric_value: 50,
      is_user_count: false,
      suppressed: false
    });
    store.metrics.set(`org-1:org:${bucket}:active_users_percent_of_assigned:`, {
      orgId: "org-1",
      group_key: "org",
      group_type: "org",
      vendor: "all",
      bucket_start: bucket,
      metric_name: "active_users_percent_of_assigned",
      metric_value: 0.5,
      is_user_count: false,
      suppressed: false
    });
  }

  const server = await startServer();
  const response = await fetch(
    `${server.url}/orgs/org-1/dashboard/overview?range=12w&vendor=all&groupType=org`,
    { headers: { "x-role": "exec" } }
  );
  const payload = await response.json();
  server.close();

  expect(payload.coverage.weekly_active_users).toHaveLength(12);
  expect(payload.fluency_index.timeseries).toHaveLength(12);
});

it("returns suppressed values as null", async () => {
  store.metrics.set("org-1:team-1:2024-01-01:weekly_active_users:", {
    orgId: "org-1",
    group_key: "team-1",
    group_type: "team",
    vendor: "all",
    bucket_start: "2024-01-01",
    metric_name: "weekly_active_users",
    metric_value: null,
    is_user_count: true,
    suppressed: true
  });
  store.metrics.set("org-1:team-1:2024-01-01:usage_trend_direction:", {
    orgId: "org-1",
    group_key: "team-1",
    group_type: "team",
    vendor: "all",
    bucket_start: "2024-01-01",
    metric_name: "usage_trend_direction",
    metric_value: null,
    is_user_count: false,
    suppressed: true
  });

  const server = await startServer();
  const response = await fetch(
    `${server.url}/orgs/org-1/dashboard/overview?range=12w&vendor=all&groupType=team&group_key=team-1`,
    { headers: { "x-role": "exec" } }
  );
  const payload = await response.json();
  server.close();

  expect(payload.coverage.weekly_active_users[0].value).toBeNull();
  expect(payload.fluency_index.current).toBeNull();
});
