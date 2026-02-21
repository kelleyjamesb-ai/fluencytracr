export const AUTH_TOKEN_STORAGE_KEY = "authToken";
const isAuthRequired = () => (import.meta.env.VITE_REQUIRE_AUTH ?? "false").trim() === "true";

export const getStoredAuthToken = () => {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  return token?.trim() ?? "";
};

const getStoredSession = () => {
  const email = (localStorage.getItem("userEmail") ?? "admin@fluencytracr.com").trim();
  const orgId = (localStorage.getItem("orgId") ?? "org-1").trim();
  const role = (localStorage.getItem("role") ?? "ADMIN").trim();
  return { email, orgId, role };
};

const mintAuthTokenFromSession = async () => {
  const { email, orgId, role } = getStoredSession();
  if (!orgId || !role) {
    return null;
  }
  const response = await fetch("/auth/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      org_id: orgId,
      role
    })
  });
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as { token?: string };
  const token = payload.token?.trim();
  if (!token) {
    return null;
  }
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  localStorage.setItem("isAuthenticated", "true");
  return token;
};

export const withAuth = (role: string, init: RequestInit = {}): RequestInit => {
  void role;
  const headers = new Headers(init.headers ?? {});
  headers.set("x-role", "ADMIN");
  const orgId = (localStorage.getItem("orgId") ?? "").trim();
  if (orgId) {
    headers.set("x-org-id", orgId);
  }
  const token = getStoredAuthToken();
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  return {
    ...init,
    headers
  };
};

export const authFetch = (role: string, input: RequestInfo | URL, init: RequestInit = {}) => {
  return (async () => {
    const response = await fetch(input, withAuth(role, init));
    if (response.status !== 401) {
      return response;
    }
    const refreshed = await mintAuthTokenFromSession();
    if (!refreshed) {
      if (isAuthRequired()) {
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      }
      return response;
    }
    return fetch(input, withAuth(role, init));
  })();
};
