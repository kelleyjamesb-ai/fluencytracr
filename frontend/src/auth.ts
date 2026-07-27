export const AUTH_TOKEN_STORAGE_KEY = "authToken";
export const AUTH_STATE_CHANGED_EVENT = "fluencytracr:auth-state-changed";

let authSessionRevision = 0;
const authListeners = new Set<() => void>();

export class AuthSessionChangedError extends Error {
  constructor() {
    super("Authentication session changed while the request was in flight");
    this.name = "AuthSessionChangedError";
  }
}

export const isFrontendAuthRequired = () =>
  import.meta.env.PROD ||
  (import.meta.env.VITE_REQUIRE_AUTH ?? "false").trim() === "true";

export const getStoredAuthToken = () => {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  return token?.trim() ?? "";
};

const notifyAuthChanged = () => {
  authSessionRevision += 1;
  authListeners.forEach((listener) => listener());
  window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
};

export const applyAuthToken = (value: string) => {
  const token = value.trim();
  if (!token) {
    clearAuthSession();
    return;
  }
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  localStorage.setItem("isAuthenticated", "true");
  notifyAuthChanged();
};

export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem("isAuthenticated");
  notifyAuthChanged();
};

export const applyLocalExampleSession = ({
  email,
  orgId,
  role
}: {
  email: string;
  orgId: string;
  role: string;
}) => {
  clearAuthSession();
  localStorage.setItem("userEmail", email.trim());
  localStorage.setItem("orgId", orgId.trim());
  localStorage.setItem("role", role.trim());
};

export const subscribeToAuthSession = (listener: () => void) => {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
};

export const getAuthSessionSnapshot = () =>
  `${authSessionRevision}:${getStoredAuthToken()}`;

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (
      event.key === AUTH_TOKEN_STORAGE_KEY ||
      event.key === "isAuthenticated" ||
      event.key === null
    ) {
      notifyAuthChanged();
    }
  });
}

const getStoredLocalExampleSession = () => {
  const orgId = (localStorage.getItem("orgId") ?? "org-1").trim();
  const role = (localStorage.getItem("role") ?? "ADMIN").trim();
  return { orgId, role };
};

const decodeStoredTokenContext = () => {
  try {
    const payloadSegment = getStoredAuthToken().split(".")[1];
    if (!payloadSegment) return null;
    const normalized = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
    const orgId = typeof payload.org_id === "string" ? payload.org_id.trim() : "";
    const role = typeof payload.role === "string" ? payload.role.trim() : "";
    if (
      !orgId ||
      !["ADMIN", "GOV_OPERATOR", "EXEC_VIEWER", "ENABLEMENT_LEAD"].includes(role)
    ) {
      return null;
    }
    return { orgId, role };
  } catch {
    return null;
  }
};

export const getFrontendSessionContext = () => {
  if (!isFrontendAuthRequired()) {
    return getStoredLocalExampleSession();
  }
  const tokenContext = decodeStoredTokenContext();
  return {
    orgId: tokenContext?.orgId ?? "",
    // Client-decoded claims drive display/routing only. Every protected
    // operation is still authorized from the backend-verified JWT.
    role: tokenContext?.role ?? "EXEC_VIEWER"
  };
};

interface RequestAuthSnapshot {
  token: string;
  revision: number;
}

const currentRequestAuthSnapshot = (): RequestAuthSnapshot => ({
  token: getStoredAuthToken(),
  revision: authSessionRevision
});

const buildAuthenticatedRequest = (
  role: string,
  init: RequestInit
): { init: RequestInit; snapshot: RequestAuthSnapshot } => {
  const snapshot = currentRequestAuthSnapshot();
  const headers = new Headers(init.headers ?? {});
  headers.delete("authorization");

  if (isFrontendAuthRequired()) {
    headers.delete("x-role");
    headers.delete("x-org-id");
    headers.delete("x-sub");
  } else {
    const localSession = getStoredLocalExampleSession();
    headers.set("x-role", role.trim() || localSession.role || "ADMIN");
    if (localSession.orgId) {
      headers.set("x-org-id", localSession.orgId);
    }
  }

  if (snapshot.token) {
    headers.set("authorization", `Bearer ${snapshot.token}`);
  }

  return {
    init: {
      ...init,
      headers
    },
    snapshot
  };
};

const requestStillOwnsSession = (snapshot: RequestAuthSnapshot) =>
  authSessionRevision === snapshot.revision &&
  getStoredAuthToken() === snapshot.token;

const invalidateIfCurrent = (snapshot: RequestAuthSnapshot) => {
  if (requestStillOwnsSession(snapshot)) {
    clearAuthSession();
  }
};

export const withAuth = (role: string, init: RequestInit = {}): RequestInit =>
  buildAuthenticatedRequest(role, init).init;

export const authFetch = (
  role: string,
  input: RequestInfo | URL,
  init: RequestInit = {}
) => {
  const request = buildAuthenticatedRequest(role, init);
  return (async () => {
    const response = await fetch(input, request.init);
    if (response.status === 401) {
      invalidateIfCurrent(request.snapshot);
      return response;
    }
    if (response.ok && !requestStillOwnsSession(request.snapshot)) {
      throw new AuthSessionChangedError();
    }
    return response;
  })();
};
