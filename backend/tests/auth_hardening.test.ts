import crypto from "crypto";
import { app } from "../src/app";
import { store } from "../src/store";
import type { Role } from "@learnaire/shared";

const base64Url = (value: Buffer | string) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const signJwt = (payload: Record<string, unknown>, secret: string) => {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signedContent = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac("sha256", secret).update(signedContent).digest();
  return `${signedContent}.${base64Url(signature)}`;
};

const jwtHeaders = (role: Role, orgId: string, secret: string) => {
  const token = signJwt(
    {
      sub: "auth-hardening-test-user",
      role,
      org_id: orgId,
      exp: Math.floor(Date.now() / 1000) + 3600
    },
    secret
  );
  return { authorization: `Bearer ${token}` };
};

const startServer = () => {
  return new Promise<{ url: string; close: () => Promise<void> }>((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        throw new Error("Unexpected server address");
      }
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () => new Promise<void>((resolveClose, reject) => server.close((error) => (error ? reject(error) : resolveClose())))
      });
    });
  });
};

describe("auth hardening", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalDevHeaderAuth = process.env.DEV_HEADER_AUTH;
  const jwtSecret = "auth-hardening-jwt-secret";

  beforeEach(() => {
    store.reset();
    store.orgs.set("org-1", {
      id: "org-1",
      name: "Auth Hardening Org 1",
      minGroupSize: 5,
      createdAt: new Date().toISOString(),
      complianceMode: "shadow"
    });
    store.orgs.set("org-2", {
      id: "org-2",
      name: "Auth Hardening Org 2",
      minGroupSize: 5,
      createdAt: new Date().toISOString(),
      complianceMode: "shadow"
    });
    process.env.JWT_SECRET = jwtSecret;
    process.env.NODE_ENV = "production";
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.JWT_SECRET = originalJwtSecret;
    process.env.DEV_HEADER_AUTH = originalDevHeaderAuth;
  });

  it("returns 401 when JWT is missing", async () => {
    const server = await startServer();
    const response = await fetch(`${server.url}/api/workflows?org_id=org-1`);
    await server.close();

    expect(response.status).toBe(401);
  });

  it("returns 403 when token org_id does not match requested org", async () => {
    const server = await startServer();
    const response = await fetch(`${server.url}/api/workflows?org_id=org-1`, {
      headers: jwtHeaders("ADMIN", "org-2", jwtSecret)
    });
    await server.close();

    expect(response.status).toBe(403);
  });

  it("returns 403 when JWT role lacks permission for endpoint", async () => {
    const server = await startServer();
    const response = await fetch(`${server.url}/api/workflows/register`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...jwtHeaders("EXEC_VIEWER", "org-1", jwtSecret)
      },
      body: JSON.stringify({
        org_id: "org-1",
        workflow_id: "wf-auth-test",
        display_name: "Auth Test",
        risk_class: "low",
        change_reason: "auth test"
      })
    });
    await server.close();

    expect(response.status).toBe(403);
  });

  it("ignores x-role in non-test environments", async () => {
    const server = await startServer();
    const response = await fetch(`${server.url}/api/workflows?org_id=org-1`, {
      headers: { "x-role": "ADMIN", "x-org-id": "org-1" }
    });
    await server.close();

    expect(response.status).toBe(401);
  });

  it("allows header auth in non-test environments when DEV_HEADER_AUTH is enabled", async () => {
    process.env.DEV_HEADER_AUTH = "true";
    const server = await startServer();
    const response = await fetch(`${server.url}/api/workflows?org_id=org-1`, {
      headers: { "x-role": "ADMIN", "x-org-id": "org-1" }
    });
    await server.close();

    expect(response.status).toBe(200);
  });
});
