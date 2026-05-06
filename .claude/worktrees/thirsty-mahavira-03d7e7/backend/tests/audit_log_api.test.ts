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
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 1, createdAt: "now" });
});

it("records dashboard access in audit log", async () => {
  const server = await startServer();
  await fetch(`${server.url}/orgs/org-1/dashboard/overview`, {
    headers: { "x-role": "EXEC_VIEWER" }
  });
  const response = await fetch(`${server.url}/orgs/org-1/audit-log`, {
    headers: { "x-role": "ADMIN" }
  });
  const payload = await response.json();
  await server.close();

  expect(response.status).toBe(200);
  expect(payload.logs.length).toBeGreaterThan(0);
  expect(payload.logs[0].action).toBe("dashboard_access");
});
