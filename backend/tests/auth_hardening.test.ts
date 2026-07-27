import crypto from "crypto";
import http from "http";
import { app } from "../src/app";
import { store } from "../src/store";
import type { Role } from "@fluencytracr/shared";

const base64Url = (value: Buffer | string) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const signJwt = (
  payload: Record<string, unknown>,
  secret: string,
  header: Record<string, unknown> = { alg: "HS256", typ: "JWT" }
) => {
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signedContent = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createHmac("sha256", secret).update(signedContent).digest();
  return `${signedContent}.${base64Url(signature)}`;
};

const requestWithDuplicateAuthorization = (
  url: string,
  credentials: [string, string]
) =>
  new Promise<number>((resolve, reject) => {
    const target = new URL(url);
    const request = http.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: target.pathname + target.search,
        method: "GET",
        headers: {
          authorization: credentials
        }
      },
      (response) => {
        response.resume();
        response.on("end", () => resolve(response.statusCode ?? 0));
      }
    );
    request.on("error", reject);
    request.end();
  });

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
  const originalVercel = process.env.VERCEL;
  const originalVercelEnv = process.env.VERCEL_ENV;
  const originalLockdown = process.env.REQUIRE_AUTH_LOCKDOWN;
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
    delete process.env.DEV_HEADER_AUTH;
    delete process.env.REQUIRE_AUTH_LOCKDOWN;
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.JWT_SECRET = originalJwtSecret;
    process.env.DEV_HEADER_AUTH = originalDevHeaderAuth;
    process.env.VERCEL = originalVercel;
    process.env.VERCEL_ENV = originalVercelEnv;
    process.env.REQUIRE_AUTH_LOCKDOWN = originalLockdown;
  });

  it("returns 401 when JWT is missing", async () => {
    process.env.REQUIRE_AUTH_LOCKDOWN = "1";
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

  it("requires JWT when auth lockdown is enabled", async () => {
    process.env.REQUIRE_AUTH_LOCKDOWN = "1";
    const server = await startServer();
    const response = await fetch(`${server.url}/api/workflows?org_id=org-1`, {
      headers: { "x-role": "ADMIN", "x-org-id": "org-1" }
    });
    await server.close();

    expect(response.status).toBe(401);
  });

  it("rejects header auth in production even when DEV_HEADER_AUTH is enabled", async () => {
    process.env.DEV_HEADER_AUTH = "true";
    const server = await startServer();
    const response = await fetch(`${server.url}/api/workflows?org_id=org-1`, {
      headers: { "x-role": "ADMIN", "x-org-id": "org-1" }
    });
    await server.close();

    expect(response.status).toBe(401);
  });

  it("allows header auth only in explicit unmanaged local development", async () => {
    process.env.NODE_ENV = "development";
    process.env.DEV_HEADER_AUTH = "true";
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    delete process.env.REQUIRE_AUTH_LOCKDOWN;
    const server = await startServer();
    const response = await fetch(`${server.url}/api/workflows?org_id=org-1`, {
      headers: { "x-role": "ADMIN", "x-org-id": "org-1" }
    });
    await server.close();

    expect(response.status).toBe(200);
  });

  it("rejects header auth in managed development", async () => {
    process.env.NODE_ENV = "development";
    process.env.DEV_HEADER_AUTH = "true";
    process.env.VERCEL_ENV = "preview";
    const server = await startServer();
    const response = await fetch(`${server.url}/api/workflows?org_id=org-1`, {
      headers: { "x-role": "ADMIN", "x-org-id": "org-1" }
    });
    await server.close();

    expect(response.status).toBe(401);
  });

  it.each([
    ["lowercase scheme", "bearer token"],
    ["extra whitespace", "Bearer  token"],
    ["leading whitespace", " Bearer token"],
    ["multiple credentials", "Bearer token, Bearer other"],
    ["extra segment", "Bearer token extra"],
    ["malformed compact token", "Bearer not-a-jwt"]
  ])("rejects a present malformed Authorization header: %s", async (_label, authorization) => {
    process.env.NODE_ENV = "development";
    process.env.DEV_HEADER_AUTH = "true";
    const server = await startServer();
    const response = await fetch(`${server.url}/api/workflows?org_id=org-1`, {
      headers: {
        authorization,
        "x-role": "ADMIN",
        "x-org-id": "org-1"
      }
    });
    await server.close();

    expect(response.status).toBe(401);
  });

  it("rejects duplicate Authorization fields", async () => {
    const token = jwtHeaders("ADMIN", "org-1", jwtSecret).authorization;
    const server = await startServer();
    const status = await requestWithDuplicateAuthorization(
      `${server.url}/api/workflows?org_id=org-1`,
      [token, token]
    );
    await server.close();

    expect(status).toBe(401);
  });

  it.each([
    ["missing exp", { sub: "user", role: "ADMIN", org_id: "org-1" }],
    ["string exp", { sub: "user", role: "ADMIN", org_id: "org-1", exp: "9999999999" }],
    ["null exp", { sub: "user", role: "ADMIN", org_id: "org-1", exp: null }],
    ["expired exp", { sub: "user", role: "ADMIN", org_id: "org-1", exp: 1 }],
    ["blank org", { sub: "user", role: "ADMIN", org_id: "   ", exp: 9999999999 }]
  ])("rejects JWT payload with %s", async (_label, payload) => {
    const token = signJwt(payload, jwtSecret);
    const server = await startServer();
    const response = await fetch(`${server.url}/api/workflows?org_id=org-1`, {
      headers: { authorization: `Bearer ${token}` }
    });
    await server.close();

    expect(response.status).toBe(401);
  });

  it.each([
    ["wrong alg", { alg: "HS512", typ: "JWT" }],
    ["wrong typ", { alg: "HS256", typ: "JOSE" }],
    ["missing typ", { alg: "HS256" }]
  ])("rejects JWT header with %s", async (_label, header) => {
    const token = signJwt(
      {
        sub: "user",
        role: "ADMIN",
        org_id: "org-1",
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      jwtSecret,
      header
    );
    const server = await startServer();
    const response = await fetch(`${server.url}/api/workflows?org_id=org-1`, {
      headers: { authorization: `Bearer ${token}` }
    });
    await server.close();

    expect(response.status).toBe(401);
  });
});
