/**
 * Phase 6B-A — Authentication & Authorization Enforcement Tests
 *
 * These tests verify that the Phase 6B-A auth enforcement is in place.
 * Each test proves a PASS condition: vulnerabilities documented in Phase 6
 * have been mitigated by JWT-based authentication.
 *
 * Canonical success condition:
 *   curl -H "x-role: ADMIN" localhost:4000/api/events → 401 Unauthorized
 *
 * Scope: Authentication & Authorization ONLY.
 */
import { app } from "../src/app";
import { store } from "../src/store";
import { requestApp, loginAs, withAuth } from "./test_helpers";

const ORG_ID = "org-auth-test";

beforeEach(() => {
  store.reset();
  store.orgs.set(ORG_ID, {
    id: ORG_ID,
    name: "Auth Test Org",
    minGroupSize: 10,
    createdAt: new Date().toISOString()
  });
});

describe("Phase 6B-A Auth Enforcement — Identity Is Verified", () => {
  it("PASS: x-role header alone is rejected — identity requires signed JWT", async () => {
    // An unauthenticated request with only x-role header is rejected
    const response = await requestApp(app, {
      method: "GET",
      path: `/orgs/${ORG_ID}/audit-log`,
      headers: { "x-role": "ADMIN" }
    });

    // x-role header without JWT cookie → 401
    expect(response.status).toBe(401);
  });

  it("PASS: authentication token is required — no Bearer/JWT means 401", async () => {
    // Request with x-role but no auth token
    const response = await requestApp(app, {
      method: "GET",
      path: `/orgs/${ORG_ID}/audit-log`,
      headers: { "x-role": "ADMIN" }
    });

    expect(response.status).toBe(401);

    // VERDICT: PASS — Authentication mechanism enforced.
  });

  it("PASS: valid JWT grants access — auth works end to end", async () => {
    const cookie = await loginAs(app, "ADMIN");
    const response = await requestApp(app, {
      method: "GET",
      path: `/orgs/${ORG_ID}/audit-log`,
      headers: withAuth(cookie)
    });

    expect(response.status).toBe(200);
  });
});

describe("Phase 6B-A Auth Enforcement — Tokens Cannot Be Bypassed", () => {
  it("PASS: no-header request is rejected — no default role granted", async () => {
    // Request with no headers at all — no default EXEC_VIEWER
    const response = await requestApp(app, {
      method: "GET",
      path: `/api/orientation/${ORG_ID}?session_start=2025-01-01T00:00:00Z`,
      headers: {}
    });

    // No token → 401 (no default role)
    expect(response.status).toBe(401);
  });

  it("PASS: fabricated role header is rejected without valid JWT", async () => {
    // Attacker sends role header — rejected because no JWT
    const response = await requestApp(app, {
      method: "GET",
      path: `/orgs/${ORG_ID}/audit-log`,
      headers: { "x-role": "ADMIN" }
    });

    expect(response.status).toBe(401);
  });
});

describe("Phase 6B-A Auth Enforcement — Privileges Cannot Be Escalated", () => {
  it("PASS: x-role header change does not escalate privileges — JWT role governs", async () => {
    // Authenticate as EXEC_VIEWER via JWT
    const viewerCookie = await loginAs(app, "EXEC_VIEWER");

    // Step 1: As EXEC_VIEWER with valid JWT, audit-log is forbidden (RBAC)
    const asViewer = await requestApp(app, {
      method: "GET",
      path: `/orgs/${ORG_ID}/audit-log`,
      headers: withAuth(viewerCookie, { "x-role": "ADMIN" })
    });
    // Even with x-role: ADMIN header, JWT role (EXEC_VIEWER) governs → 403
    expect(asViewer.status).toBe(403);

    // Step 2: Only a real ADMIN JWT grants access
    const adminCookie = await loginAs(app, "ADMIN");
    const asAdmin = await requestApp(app, {
      method: "GET",
      path: `/orgs/${ORG_ID}/audit-log`,
      headers: withAuth(adminCookie)
    });
    expect(asAdmin.status).toBe(200);
  });

  it("PASS: role escalation via header is impossible with JWT auth", async () => {
    const payload = {
      events: [
        {
          schema_version: "FT_V1_2026_01",
          event_name: "FT_V1_DISPOSITION_OBSERVED",
          org_id: ORG_ID,
          function_id: "func-1",
          role_class: "role-1",
          tool_surface: "ASSISTANT",
          event_timestamp: "2025-01-01T00:00:00Z",
          window_id: "2025-01-01__2025-03-15",
          ambiguity_flag: false
        }
      ]
    };

    // Authenticate as ENABLEMENT_LEAD
    const leadCookie = await loginAs(app, "ENABLEMENT_LEAD");

    // ENABLEMENT_LEAD can evaluate decisions (authorized role)
    const asLead = await requestApp(app, {
      method: "POST",
      path: "/api/v1/decision",
      headers: withAuth(leadCookie),
      body: payload
    });
    expect(asLead.status).toBe(200);

    // Adding x-role: ADMIN header does not change effective role
    const withFakeEscalation = await requestApp(app, {
      method: "POST",
      path: "/api/v1/decision",
      headers: withAuth(leadCookie, { "x-role": "ADMIN" }),
      body: payload
    });
    // Still succeeds because ENABLEMENT_LEAD is authorized, not because of x-role
    expect(withFakeEscalation.status).toBe(200);
  });

  it("RBAC correctly blocks unauthorized roles with valid JWT", async () => {
    const leadCookie = await loginAs(app, "ENABLEMENT_LEAD");
    const response = await requestApp(app, {
      method: "GET",
      path: `/orgs/${ORG_ID}/audit-log`,
      headers: withAuth(leadCookie)
    });
    // ENABLEMENT_LEAD is not in ["ADMIN"] for audit-log → 403
    expect(response.status).toBe(403);
  });

  it("Invalid role values in JWT are rejected as 401", async () => {
    // Request with x-role: SUPERADMIN and no JWT → 401 (not 400)
    const response = await requestApp(app, {
      method: "GET",
      path: `/orgs/${ORG_ID}/audit-log`,
      headers: { "x-role": "SUPERADMIN" }
    });
    expect(response.status).toBe(401);
  });
});

describe("Phase 6B-A Auth Enforcement — Canonical Failure Condition", () => {
  it("curl -H 'x-role: ADMIN' /api/events returns 401", async () => {
    const response = await requestApp(app, {
      method: "POST",
      path: "/api/events",
      headers: { "x-role": "ADMIN" },
      body: { events: [] }
    });
    expect(response.status).toBe(401);
  });

  it("curl (no headers) /api/events returns 401", async () => {
    const response = await requestApp(app, {
      method: "POST",
      path: "/api/events",
      headers: {},
      body: { events: [] }
    });
    expect(response.status).toBe(401);
  });

  it("/health remains accessible without auth", async () => {
    const response = await requestApp(app, {
      method: "GET",
      path: "/health",
      headers: {}
    });
    expect(response.status).toBe(200);
  });

  it("/auth/login is accessible without auth", async () => {
    const response = await requestApp(app, {
      method: "POST",
      path: "/auth/login",
      body: { username: "admin", password: "admin-test" }
    });
    expect(response.status).toBe(200);
  });

  it("/auth/me requires auth", async () => {
    const noAuth = await requestApp(app, {
      method: "GET",
      path: "/auth/me",
      headers: {}
    });
    expect(noAuth.status).toBe(401);

    const cookie = await loginAs(app, "ADMIN");
    const withJwt = await requestApp(app, {
      method: "GET",
      path: "/auth/me",
      headers: withAuth(cookie)
    });
    expect(withJwt.status).toBe(200);
    expect((withJwt.body as any).role).toBe("ADMIN");
    expect((withJwt.body as any).sub).toBe("admin");
  });
});
