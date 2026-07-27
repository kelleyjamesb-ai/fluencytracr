import crypto from "crypto";

const PREVIEW_FALLBACK_SECRET = "preview_jwt_secret_for_testing_only";

export const isAuthLockdownRequired = () => process.env.REQUIRE_AUTH_LOCKDOWN === "1";

const isManagedRuntime = () =>
  process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV?.trim());

export const isStrictRuntimeAuthenticationRequired = () => {
  if (isAuthLockdownRequired() || isManagedRuntime()) {
    return true;
  }
  return process.env.NODE_ENV !== "test" && process.env.NODE_ENV !== "development";
};

export const resolveJwtSecret = () => {
  const configured = process.env.JWT_SECRET?.trim();
  if (configured) {
    return { secret: configured, isFallback: false };
  }
  if (!isStrictRuntimeAuthenticationRequired()) {
    return { secret: PREVIEW_FALLBACK_SECRET, isFallback: true };
  }
  return { secret: null, isFallback: false };
};

export const assertJwtSecretConfigured = () => {
  if (!isStrictRuntimeAuthenticationRequired()) {
    return;
  }
  const { secret } = resolveJwtSecret();
  if (secret) {
    return;
  }
  throw new Error(
    "JWT_SECRET must be configured for this runtime."
  );
};

export const isAuthTokenIssuerAuthorized = (providedSecret: string | undefined) => {
  if (!isStrictRuntimeAuthenticationRequired()) {
    return true;
  }

  const issuerSecret = process.env.AUTH_TOKEN_ISSUER_SECRET?.trim();
  const provided = providedSecret?.trim();
  if (!issuerSecret || !provided) {
    return false;
  }

  const issuerBuffer = Buffer.from(issuerSecret);
  const providedBuffer = Buffer.from(provided);
  return issuerBuffer.length === providedBuffer.length && crypto.timingSafeEqual(issuerBuffer, providedBuffer);
};
