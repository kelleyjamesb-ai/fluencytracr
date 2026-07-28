import { app } from "../src/app";
import { store } from "../src/store";

const startServer = () => {
  return new Promise<{ url: string; close: () => Promise<void> }>((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      if (typeof address === "string" || address === null) {
        throw new Error("Unexpected address");
      }
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
      });
    });
  });
};

beforeEach(() => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 10, createdAt: "now" });
});

it("does not expose held bucket membership for a 12w range", async () => {
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
    { headers: { "x-role": "EXEC_VIEWER" } }
  );
  const payload = await response.json();
  await server.close();

  expect(payload.coverage.weekly_active_users).toEqual([]);
  expect(payload.sessions_shape.bucket_start).toBeNull();
  expect(payload.spread.bucket_start).toBeNull();
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
    { headers: { "x-role": "ADMIN" } }
  );
  const payload = await response.json();
  await server.close();

  expect(payload.coverage.weekly_active_users).toEqual([]);
});

it("rejects a team filter when aggregation authorization is org-only", async () => {
  const server = await startServer();
  const response = await fetch(
    `${server.url}/orgs/org-1/dashboard/overview?aggregation=org&groupType=team&group_key=team-1`,
    { headers: { "x-role": "EXEC_VIEWER" } }
  );
  await server.close();

  expect(response.status).toBe(403);
});

it("holds a single legacy snapshot without server-owned privacy context", async () => {
  store.metrics.set("org-1:org:2024-01-01:usage_frequency_band_regular_count:", {
    orgId: "org-1",
    group_key: "org",
    group_type: "org",
    vendor: "all",
    bucket_start: "2024-01-01",
    metric_name: "usage_frequency_band_regular_count",
    metric_value: 20,
    is_user_count: true,
    suppressed: false
  });

  const server = await startServer();
  const response = await fetch(
    `${server.url}/orgs/org-1/dashboard/overview?range=12w&vendor=all&groupType=org`,
    { headers: { "x-role": "EXEC_VIEWER" } }
  );
  const payload = await response.json();
  await server.close();

  expect(payload.sessions_shape.frequency_bands.usage_frequency_band_regular_count).toBeNull();
});
