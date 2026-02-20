export const AUTH_TOKEN_STORAGE_KEY = "authToken";

export const getStoredAuthToken = () => {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  return token?.trim() ?? "";
};

export const withAuth = (role: string, init: RequestInit = {}): RequestInit => {
  const headers = new Headers(init.headers ?? {});
  headers.set("x-role", role);
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
  return fetch(input, withAuth(role, init));
};
