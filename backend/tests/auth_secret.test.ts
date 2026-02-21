import { assertJwtSecretConfigured, resolveJwtSecret } from "../src/auth_secret";

describe("auth secret configuration", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalAllowInsecure = process.env.ALLOW_INSECURE_AUTH_FALLBACK;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.JWT_SECRET = originalJwtSecret;
    process.env.ALLOW_INSECURE_AUTH_FALLBACK = originalAllowInsecure;
  });

  it("requires JWT_SECRET in production", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "";
    process.env.ALLOW_INSECURE_AUTH_FALLBACK = "";

    expect(() => assertJwtSecretConfigured()).toThrow("JWT_SECRET must be configured");
  });

  it("allows local development fallback when explicitly local env", () => {
    process.env.NODE_ENV = "development";
    process.env.JWT_SECRET = "";
    process.env.ALLOW_INSECURE_AUTH_FALLBACK = "";

    const resolved = resolveJwtSecret();
    expect(resolved.secret).toBeTruthy();
    expect(resolved.isFallback).toBe(true);
  });
});
