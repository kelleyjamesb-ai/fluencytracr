const PREVIEW_FALLBACK_SECRET = "preview_jwt_secret_for_testing_only";

export const isAuthLockdownRequired = () => process.env.REQUIRE_AUTH_LOCKDOWN === "1";

const canUseFallbackSecret = () => {
  if (!isAuthLockdownRequired()) {
    return true;
  }
  if (process.env.ALLOW_INSECURE_AUTH_FALLBACK === "1") {
    return true;
  }
  return process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development";
};

export const resolveJwtSecret = () => {
  const configured = process.env.JWT_SECRET?.trim();
  if (configured) {
    return { secret: configured, isFallback: false };
  }
  if (canUseFallbackSecret()) {
    return { secret: PREVIEW_FALLBACK_SECRET, isFallback: true };
  }
  return { secret: null, isFallback: false };
};

export const assertJwtSecretConfigured = () => {
  if (!isAuthLockdownRequired()) {
    return;
  }
  const { secret } = resolveJwtSecret();
  if (secret) {
    return;
  }
  throw new Error(
    "JWT_SECRET must be configured for this runtime. Set JWT_SECRET or explicitly allow insecure fallback for local development."
  );
};
