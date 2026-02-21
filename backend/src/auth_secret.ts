const PREVIEW_FALLBACK_SECRET = "preview_jwt_secret_for_testing_only";

const canUseFallbackSecret = () => {
  if (process.env.ALLOW_INSECURE_AUTH_FALLBACK === "1") {
    return true;
  }
  return process.env.VERCEL_ENV === "preview";
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
