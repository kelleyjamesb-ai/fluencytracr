import {
  AUTH_TOKEN_STORAGE_KEY,
  AuthSessionChangedError,
  applyAuthToken,
  authFetch,
  clearAuthSession,
  getFrontendSessionContext,
  isFrontendAuthRequired,
  withAuth
} from "./auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const deferredResponse = () => {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

describe("auth", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses self-selected role and org headers only in local-example mode", () => {
    localStorage.setItem("orgId", "org-local");
    localStorage.setItem("role", "EXEC_VIEWER");

    const init = withAuth("", {
      headers: { "x-sub": "local-user" }
    });
    const headers = new Headers(init.headers);

    expect(headers.get("x-role")).toBe("EXEC_VIEWER");
    expect(headers.get("x-org-id")).toBe("org-local");
    expect(headers.get("x-sub")).toBe("local-user");
  });

  it("requires authentication for a production build without an explicit flag", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_REQUIRE_AUTH", "");

    expect(isFrontendAuthRequired()).toBe(true);
  });

  it("strips every caller-supplied authority header when auth is required", () => {
    vi.stubEnv("VITE_REQUIRE_AUTH", "true");
    localStorage.setItem("orgId", "org-local");
    localStorage.setItem("role", "ADMIN");
    applyAuthToken("verified-token");

    const init = withAuth("ADMIN", {
      headers: {
        authorization: "Bearer caller-token",
        "x-role": "ADMIN",
        "x-org-id": "org-attacker",
        "x-sub": "attacker"
      }
    });
    const headers = new Headers(init.headers);

    expect(headers.get("authorization")).toBe("Bearer verified-token");
    expect(headers.has("x-role")).toBe(false);
    expect(headers.has("x-org-id")).toBe(false);
    expect(headers.has("x-sub")).toBe(false);
  });

  it("ignores stale local identity and derives strict-mode UI context from the bearer", () => {
    vi.stubEnv("VITE_REQUIRE_AUTH", "true");
    localStorage.setItem("orgId", "org-local");
    localStorage.setItem("role", "ADMIN");
    const payload = btoa(
      JSON.stringify({ org_id: "org-token", role: "ADMIN" })
    ).replace(/=+$/g, "");
    applyAuthToken(`header.${payload}.signature`);

    expect(getFrontendSessionContext()).toEqual({
      orgId: "org-token",
      role: "ADMIN"
    });
  });

  it("makes one request, never mints or retries, and clears only the owning token on 401", async () => {
    vi.stubEnv("VITE_REQUIRE_AUTH", "true");
    applyAuthToken("stale-token");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("unauthorized", { status: 401 }));

    const response = await authFetch("ADMIN", "/orgs/org-1/policies");

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).not.toBe("/auth/token");
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem("isAuthenticated")).toBeNull();
  });

  it("does not clear a replacement token when an older request receives 401", async () => {
    vi.stubEnv("VITE_REQUIRE_AUTH", "true");
    applyAuthToken("old-token");
    const pending = deferredResponse();
    vi.spyOn(globalThis, "fetch").mockReturnValue(pending.promise);

    const request = authFetch("ADMIN", "/orgs/org-1/policies");
    applyAuthToken("replacement-token");
    pending.resolve(new Response("unauthorized", { status: 401 }));
    const response = await request;

    expect(response.status).toBe(401);
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe("replacement-token");
  });

  it("only lets the first concurrent 401 invalidate the shared session", async () => {
    vi.stubEnv("VITE_REQUIRE_AUTH", "true");
    applyAuthToken("shared-token");
    const first = deferredResponse();
    const second = deferredResponse();
    vi.spyOn(globalThis, "fetch")
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const firstRequest = authFetch("ADMIN", "/one");
    const secondRequest = authFetch("ADMIN", "/two");
    first.resolve(new Response("unauthorized", { status: 401 }));
    await firstRequest;
    applyAuthToken("new-token");
    second.resolve(new Response("unauthorized", { status: 401 }));
    await secondRequest;

    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe("new-token");
  });

  it("rejects a successful response after token rotation", async () => {
    vi.stubEnv("VITE_REQUIRE_AUTH", "true");
    applyAuthToken("old-token");
    const pending = deferredResponse();
    vi.spyOn(globalThis, "fetch").mockReturnValue(pending.promise);

    const request = authFetch("ADMIN", "/orgs/org-1/policies");
    applyAuthToken("new-token");
    pending.resolve(new Response("ok", { status: 200 }));

    await expect(request).rejects.toBeInstanceOf(AuthSessionChangedError);
  });

  it("rejects a successful response after logout and replacement with the same token", async () => {
    vi.stubEnv("VITE_REQUIRE_AUTH", "true");
    applyAuthToken("same-token");
    const pending = deferredResponse();
    vi.spyOn(globalThis, "fetch").mockReturnValue(pending.promise);

    const request = authFetch("ADMIN", "/orgs/org-1/policies");
    clearAuthSession();
    applyAuthToken("same-token");
    pending.resolve(new Response("ok", { status: 200 }));

    await expect(request).rejects.toBeInstanceOf(AuthSessionChangedError);
  });

  it("rejects a successful response after a cross-tab storage change", async () => {
    vi.stubEnv("VITE_REQUIRE_AUTH", "true");
    applyAuthToken("old-token");
    const pending = deferredResponse();
    vi.spyOn(globalThis, "fetch").mockReturnValue(pending.promise);

    const request = authFetch("ADMIN", "/orgs/org-1/policies");
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "cross-tab-token");
    window.dispatchEvent(
      new StorageEvent("storage", { key: AUTH_TOKEN_STORAGE_KEY })
    );
    pending.resolve(new Response("ok", { status: 200 }));

    await expect(request).rejects.toBeInstanceOf(AuthSessionChangedError);
  });
});
