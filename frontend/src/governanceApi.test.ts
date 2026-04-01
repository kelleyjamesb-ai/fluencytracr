import { AUTH_TOKEN_STORAGE_KEY } from "./auth";
import { GovernanceApiError, governanceApi } from "./lib/governanceApi";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ctx = { orgId: "org-1", role: "ADMIN" };

describe("governanceApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("includes auth and role headers for API calls", async () => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "token-abc");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ policies: [] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await governanceApi.listPolicies(ctx);

    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("x-role")).toBe("ADMIN");
    expect(headers.get("authorization")).toBe("Bearer token-abc");
  });

  it("includes schema version and content-type headers where required", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ mode: "shadow" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await governanceApi.patchComplianceMode(ctx, "shadow", "test-rationale");

    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("X-FluencyTracr-Schema-Version")).toBe("0.1");
  });

  it("throws GovernanceApiError with error payload message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { "content-type": "application/json" }
      })
    );

    await expect(governanceApi.listPolicies(ctx)).rejects.toMatchObject<Partial<GovernanceApiError>>({
      name: "GovernanceApiError",
      message: "forbidden",
      status: 403
    });
  });

  it("uses fallback error message when error payload is not JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("server-error", { status: 500 }));

    await expect(governanceApi.listPolicies(ctx)).rejects.toMatchObject<Partial<GovernanceApiError>>({
      name: "GovernanceApiError",
      message: "Request failed: 500",
      status: 500
    });
  });
});
