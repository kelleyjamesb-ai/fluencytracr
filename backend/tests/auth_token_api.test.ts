import { app } from "../src/app";
import { store } from "../src/store";

const startServer = () => {
  return new Promise<{ url: string; close: () => Promise<void> }>((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Unexpected server address");
      }
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () =>
          new Promise<void>((resolveClose, reject) => server.close((error) => (error ? reject(error) : resolveClose())))
      });
    });
  });
};

describe("auth token api", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalJwtTtl = process.env.JWT_TTL_SECONDS;
  const originalRequireAuthLockdown = process.env.REQUIRE_AUTH_LOCKDOWN;

  beforeEach(() => {
    store.reset();
    store.orgs.set("org-1", {
      id: "org-1",
      name: "Auth Token Org",
      minGroupSize: 5,
      createdAt: new Date().toISOString(),
      complianceMode: "shadow"
    });
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "auth-token-test-secret";
    process.env.JWT_TTL_SECONDS = "900";
    process.env.REQUIRE_AUTH_LOCKDOWN = "1";
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.JWT_SECRET = originalJwtSecret;
    process.env.JWT_TTL_SECONDS = originalJwtTtl;
    process.env.REQUIRE_AUTH_LOCKDOWN = originalRequireAuthLockdown;
  });

  it("mints a token that can access protected endpoints", async () => {
    const server = await startServer();
    const mintResponse = await fetch(`${server.url}/auth/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "admin@fluencytracr.com",
        org_id: "org-1",
        role: "ADMIN"
      })
    });

    expect(mintResponse.status).toBe(201);
    const minted = (await mintResponse.json()) as { token: string; token_type: string; org_id: string; role: string };
    expect(minted.token).toMatch(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/);
    expect(minted.token_type).toBe("Bearer");
    expect(minted.org_id).toBe("org-1");
    expect(minted.role).toBe("ADMIN");

    const protectedResponse = await fetch(`${server.url}/api/workflows?org_id=org-1`, {
      headers: { authorization: `Bearer ${minted.token}` }
    });
    await server.close();

    expect(protectedResponse.status).toBe(200);
  });

  it("returns 400 for invalid token mint payload", async () => {
    const server = await startServer();
    const response = await fetch(`${server.url}/auth/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "admin@fluencytracr.com",
        org_id: "org-1",
        role: "NOT_A_ROLE"
      })
    });
    await server.close();

    expect(response.status).toBe(400);
  });

  it("returns 500 when JWT secret is missing", async () => {
    process.env.JWT_SECRET = "";
    const server = await startServer();
    const response = await fetch(`${server.url}/auth/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "admin@fluencytracr.com",
        org_id: "org-1",
        role: "ADMIN"
      })
    });
    await server.close();

    expect(response.status).toBe(500);
  });
});
