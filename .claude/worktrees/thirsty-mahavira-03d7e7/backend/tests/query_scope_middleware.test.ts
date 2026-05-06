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

it("rejects disallowed scopes in query", async () => {
  const server = await startServer();
  const response = await fetch(
    `${server.url}/orgs/org-1/dashboard/overview?scope=employee&range=12w`,
    { headers: { "x-role": "EXEC_VIEWER" } }
  );
  const payload = await response.json();
  await server.close();

  expect(response.status).toBe(400);
  expect(payload.error).toMatch(/scope/i);
});
