import {
  assertJwtSecretConfigured,
  isAuthTokenIssuerAuthorized,
  isStrictRuntimeAuthenticationRequired,
  resolveJwtSecret
} from "../src/auth_secret";

describe("auth secret configuration", () => {
  const managedKeys = [
    "NODE_ENV",
    "JWT_SECRET",
    "ALLOW_INSECURE_AUTH_FALLBACK",
    "ALLOW_INSECURE_AUTH_TOKEN_MINTING",
    "AUTH_TOKEN_ISSUER_SECRET",
    "REQUIRE_AUTH_LOCKDOWN",
    "VERCEL",
    "VERCEL_ENV"
  ] as const;
  const originalEnv = Object.fromEntries(
    managedKeys.map((key) => [key, process.env[key]])
  );

  afterEach(() => {
    for (const key of managedKeys) {
      const value = originalEnv[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it.each([
    [{ NODE_ENV: "production" }, true],
    [{ NODE_ENV: "staging" }, true],
    [{}, true],
    [{ NODE_ENV: "test" }, false],
    [{ NODE_ENV: "development" }, false],
    [{ NODE_ENV: "test", VERCEL: "1" }, true],
    [{ NODE_ENV: "development", VERCEL_ENV: "preview" }, true],
    [{ NODE_ENV: "test", REQUIRE_AUTH_LOCKDOWN: "1" }, true],
    [{ NODE_ENV: "development", REQUIRE_AUTH_LOCKDOWN: "1" }, true]
  ])("classifies the runtime fail closed for %o", (env, expected) => {
    for (const key of managedKeys) {
      delete process.env[key];
    }
    Object.assign(process.env, env);

    expect(isStrictRuntimeAuthenticationRequired()).toBe(expected);
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
    process.env.ALLOW_INSECURE_AUTH_FALLBACK = "1";
    process.env.REQUIRE_AUTH_LOCKDOWN = "";

    const resolved = resolveJwtSecret();
    expect(resolved.secret).toBeNull();
    expect(resolved.isFallback).toBe(false);
  });

  it("allows local development fallback when explicitly local env", () => {
    process.env.NODE_ENV = "development";
    process.env.JWT_SECRET = "";
    process.env.ALLOW_INSECURE_AUTH_FALLBACK = "";
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    delete process.env.REQUIRE_AUTH_LOCKDOWN;

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

  it("does not allow unauthenticated token minting in a managed development runtime", () => {
    process.env.NODE_ENV = "development";
    process.env.VERCEL_ENV = "preview";
    process.env.AUTH_TOKEN_ISSUER_SECRET = "";

    expect(isAuthTokenIssuerAuthorized(undefined)).toBe(false);
  });

  it("does not let insecure fallback reopen startup in a strict runtime", () => {
    process.env.NODE_ENV = "development";
    process.env.VERCEL = "1";
    process.env.JWT_SECRET = "";
    process.env.ALLOW_INSECURE_AUTH_FALLBACK = "1";

    expect(() => assertJwtSecretConfigured()).toThrow("JWT_SECRET must be configured");
    expect(resolveJwtSecret()).toEqual({ secret: null, isFallback: false });
  });
});
