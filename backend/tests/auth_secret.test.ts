import { assertJwtSecretConfigured, isAuthTokenIssuerAuthorized, resolveJwtSecret } from "../src/auth_secret";

describe("auth secret configuration", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalAllowInsecure = process.env.ALLOW_INSECURE_AUTH_FALLBACK;
  const originalAllowInsecureTokenMinting = process.env.ALLOW_INSECURE_AUTH_TOKEN_MINTING;
  const originalIssuerSecret = process.env.AUTH_TOKEN_ISSUER_SECRET;
  const originalRequireAuthLockdown = process.env.REQUIRE_AUTH_LOCKDOWN;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.JWT_SECRET = originalJwtSecret;
    process.env.ALLOW_INSECURE_AUTH_FALLBACK = originalAllowInsecure;
    process.env.ALLOW_INSECURE_AUTH_TOKEN_MINTING = originalAllowInsecureTokenMinting;
    process.env.AUTH_TOKEN_ISSUER_SECRET = originalIssuerSecret;
    process.env.REQUIRE_AUTH_LOCKDOWN = originalRequireAuthLockdown;
  });

  it("requires JWT_SECRET in production", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "";
    process.env.ALLOW_INSECURE_AUTH_FALLBACK = "";
    process.env.REQUIRE_AUTH_LOCKDOWN = "";

    expect(() => assertJwtSecretConfigured()).toThrow("JWT_SECRET must be configured");
  });

  it("does not use the fallback JWT secret in production", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "";
    process.env.ALLOW_INSECURE_AUTH_FALLBACK = "";
    process.env.REQUIRE_AUTH_LOCKDOWN = "";

    const resolved = resolveJwtSecret();
    expect(resolved.secret).toBeNull();
    expect(resolved.isFallback).toBe(false);
  });

  it("allows local development fallback when explicitly local env", () => {
    process.env.NODE_ENV = "development";
    process.env.JWT_SECRET = "";
    process.env.ALLOW_INSECURE_AUTH_FALLBACK = "";

    const resolved = resolveJwtSecret();
    expect(resolved.secret).toBeTruthy();
    expect(resolved.isFallback).toBe(true);
  });

  it("does not allow token minting without issuer secret in production", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_TOKEN_ISSUER_SECRET = "";
    process.env.ALLOW_INSECURE_AUTH_TOKEN_MINTING = "1";

    expect(isAuthTokenIssuerAuthorized(undefined)).toBe(false);
  });
});
