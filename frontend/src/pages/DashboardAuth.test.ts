import {
  AUTH_TOKEN_STORAGE_KEY,
  AuthSessionChangedError,
  applyAuthToken
} from "../auth";
import { fetchDashboardRequest } from "./Dashboard";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const deferredResponse = () => {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

describe("Dashboard authenticated request containment", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubEnv("VITE_REQUIRE_AUTH", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("clears the owning session on a dashboard 401 without retrying", async () => {
    applyAuthToken("dashboard-token");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("unauthorized", { status: 401 }));

    const response = await fetchDashboardRequest(
      "ADMIN",
      "/orgs/org-1/policies"
    );

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
  });

  it("rejects a successful dashboard response after session rotation", async () => {
    applyAuthToken("old-dashboard-token");
    const pending = deferredResponse();
    vi.spyOn(globalThis, "fetch").mockReturnValue(pending.promise);

    const request = fetchDashboardRequest(
      "ADMIN",
      "/orgs/org-1/policies"
    );
    applyAuthToken("new-dashboard-token");
    pending.resolve(new Response("ok", { status: 200 }));

    await expect(request).rejects.toBeInstanceOf(AuthSessionChangedError);
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe(
      "new-dashboard-token"
    );
  });
});
