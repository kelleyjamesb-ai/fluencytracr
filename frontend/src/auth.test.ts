import { AUTH_TOKEN_STORAGE_KEY, authFetch, withAuth } from "./auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("auth", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("withAuth adds role and bearer token headers", () => {
    localStorage.setItem("orgId", "org-1");
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "token-123");

    const init = withAuth("ADMIN");
    const headers = new Headers(init.headers);

    expect(headers.get("x-role")).toBe("ADMIN");
    expect(headers.get("x-org-id")).toBe("org-1");
    expect(headers.get("authorization")).toBe("Bearer token-123");
  });

  it("retries request after 401 when token refresh succeeds", async () => {
    localStorage.setItem("userEmail", "admin@fluencytracr.com");
    localStorage.setItem("orgId", "org-1");
    localStorage.setItem("role", "ADMIN");
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "stale-token");
    localStorage.setItem("isAuthenticated", "true");

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: "fresh-token" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );

    const response = await authFetch("ADMIN", "/orgs/org-1/policies");

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const retryHeaders = new Headers(fetchMock.mock.calls[2]?.[1]?.headers);
    expect(retryHeaders.get("authorization")).toBe("Bearer fresh-token");
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe("fresh-token");
    expect(localStorage.getItem("isAuthenticated")).toBe("true");
  });

  it("clears auth state after 401 when token refresh fails", async () => {
    localStorage.setItem("orgId", "org-1");
    localStorage.setItem("role", "ADMIN");
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "stale-token");
    localStorage.setItem("isAuthenticated", "true");

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 500 }));

    const response = await authFetch("ADMIN", "/orgs/org-1/policies");

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem("isAuthenticated")).toBeNull();
  });
});
