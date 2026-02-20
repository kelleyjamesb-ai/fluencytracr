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
        close: () => new Promise<void>((resolve, reject) => { server.closeAllConnections(); server.close((error) => (error ? reject(error) : resolve())); })
      });
    });
  });
};

beforeEach(() => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 1, createdAt: "now" });
});

it("exports dashboard CSV", async () => {
  const server = await startServer();
  const response = await fetch(`${server.url}/orgs/org-1/dashboard/export.csv`, {
    headers: { "x-role": "EXEC_VIEWER" }
  });
  const body = await response.text();
  await server.close();

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toMatch(/text\/csv/);
  expect(body).toMatch(/fluency_index/);
});

it("exports dashboard PDF", async () => {
  const server = await startServer();
  const response = await fetch(`${server.url}/orgs/org-1/dashboard/export.pdf`, {
    headers: { "x-role": "EXEC_VIEWER" }
  });
  const buffer = await response.arrayBuffer();
  await server.close();

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toMatch(/application\/pdf/);
  expect(Buffer.from(buffer).toString("utf8", 0, 8)).toMatch(/%PDF-1/);
});
