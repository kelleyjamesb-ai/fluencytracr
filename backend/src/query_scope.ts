export const ALLOWED_SCOPES = ["org", "team", "role", "time_bucket"] as const;
export const DISALLOWED_SCOPES = ["employee", "user", "session", "document"] as const;

export type AllowedScope = (typeof ALLOWED_SCOPES)[number];

export const hasDisallowedScopes = (value: unknown): boolean => {
  if (!value) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((item) => hasDisallowedScopes(item));
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((item) => hasDisallowedScopes(item));
  }
  if (typeof value === "string") {
    const lowered = value.toLowerCase();
    return DISALLOWED_SCOPES.some((scope) => lowered.includes(scope));
  }
  return false;
};

export const enforceScopeWhitelist = (scope: string | undefined) => {
  if (!scope) {
    return;
  }
  const scopes = scope.split(",").map((item) => item.trim()).filter(Boolean);
  const disallowed = scopes.filter((item) => DISALLOWED_SCOPES.includes(item as any));
  if (disallowed.length > 0) {
    throw new Error("Disallowed scope requested");
  }
  const invalid = scopes.filter((item) => !ALLOWED_SCOPES.includes(item as any));
  if (invalid.length > 0) {
    throw new Error("Unknown scope requested");
  }
};
