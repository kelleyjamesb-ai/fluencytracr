/**
 * Tests for 6B-A bug fix: AUTH_SEED_USERS assertion and /auth/login handler guard.
 */

// ---- Unit tests for assertAuthSeedUsersConfigured (isolated, no app import) ----

const loadAuthModule = () => require("../src/config/authSeedUsers");

describe("assertAuthSeedUsersConfigured — boot assertion", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.AUTH_SEED_USERS;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("throws when AUTH_SEED_USERS is not set", () => {
    const { assertAuthSeedUsersConfigured } = loadAuthModule();
    expect(() => assertAuthSeedUsersConfigured()).toThrow(/AUTH_SEED_USERS/);
  });

  it("throws when AUTH_SEED_USERS is empty string", () => {
    process.env.AUTH_SEED_USERS = "";
    const { assertAuthSeedUsersConfigured } = loadAuthModule();
    expect(() => assertAuthSeedUsersConfigured()).toThrow(/AUTH_SEED_USERS/);
  });

  it("throws when AUTH_SEED_USERS is not valid JSON", () => {
    process.env.AUTH_SEED_USERS = "not-json";
    const { assertAuthSeedUsersConfigured } = loadAuthModule();
    expect(() => assertAuthSeedUsersConfigured()).toThrow(/not valid JSON/);
  });

  it("throws when AUTH_SEED_USERS is not an array", () => {
    process.env.AUTH_SEED_USERS = '{"username":"a","password":"b"}';
    const { assertAuthSeedUsersConfigured } = loadAuthModule();
    expect(() => assertAuthSeedUsersConfigured()).toThrow(/must be a JSON array/);
  });

  it("throws when AUTH_SEED_USERS is an empty array", () => {
    process.env.AUTH_SEED_USERS = "[]";
    const { assertAuthSeedUsersConfigured } = loadAuthModule();
    expect(() => assertAuthSeedUsersConfigured()).toThrow(/at least one user/);
  });

  it("throws when a user entry is missing username", () => {
    process.env.AUTH_SEED_USERS = '[{"password":"b"}]';
    const { assertAuthSeedUsersConfigured } = loadAuthModule();
    expect(() => assertAuthSeedUsersConfigured()).toThrow(/username.*password/);
  });

  it("throws when a user entry is missing password", () => {
    process.env.AUTH_SEED_USERS = '[{"username":"a"}]';
    const { assertAuthSeedUsersConfigured } = loadAuthModule();
    expect(() => assertAuthSeedUsersConfigured()).toThrow(/username.*password/);
  });

  it("throws when a user entry has empty username", () => {
    process.env.AUTH_SEED_USERS = '[{"username":"","password":"b"}]';
    const { assertAuthSeedUsersConfigured } = loadAuthModule();
    expect(() => assertAuthSeedUsersConfigured()).toThrow(/username.*password/);
  });

  it("succeeds with valid seed users", () => {
    process.env.AUTH_SEED_USERS = '[{"username":"admin","password":"secret"}]';
    const { assertAuthSeedUsersConfigured } = loadAuthModule();
    expect(() => assertAuthSeedUsersConfigured()).not.toThrow();
  });
});

// ---- Integration tests for /auth/login handler ----

import { app } from "../src/app";
import { requestApp } from "./test_helpers";
import { _resetUsersForTesting } from "../src/auth/users";

describe("/auth/login handler", () => {
  it("returns 400 when username is missing", async () => {
    const res = await requestApp(app, {
      method: "POST",
      path: "/auth/login",
      body: { password: "admin-test" }
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    const res = await requestApp(app, {
      method: "POST",
      path: "/auth/login",
      body: { username: "admin" }
    });
    expect(res.status).toBe(400);
  });

  it("returns 401 for invalid credentials", async () => {
    const res = await requestApp(app, {
      method: "POST",
      path: "/auth/login",
      body: { username: "admin", password: "wrong" }
    });
    expect(res.status).toBe(401);
    expect((res.body as Record<string, unknown>).error).toBe("Invalid credentials");
  });

  it("returns 200 for valid credentials", async () => {
    const res = await requestApp(app, {
      method: "POST",
      path: "/auth/login",
      body: { username: "admin", password: "admin-test" }
    });
    expect(res.status).toBe(200);
    expect((res.body as Record<string, unknown>).role).toBe("ADMIN");
  });

  it("returns 503 when AUTH_SEED_USERS becomes corrupted at runtime", async () => {
    const original = process.env.AUTH_SEED_USERS;
    process.env.AUTH_SEED_USERS = "corrupted";
    _resetUsersForTesting();
    try {
      const res = await requestApp(app, {
        method: "POST",
        path: "/auth/login",
        body: { username: "admin", password: "admin-test" }
      });
      expect(res.status).toBe(503);
      const body = res.body as Record<string, unknown>;
      expect(body.error).toBe("Authentication service unavailable");
      // Must not leak stack traces or env contents
      expect(res.text).not.toContain("AUTH_SEED_USERS");
      expect(res.text).not.toContain("corrupted");
    } finally {
      process.env.AUTH_SEED_USERS = original;
      _resetUsersForTesting();
    }
  });

  it("does not leak stack traces on error", async () => {
    const original = process.env.AUTH_SEED_USERS;
    delete process.env.AUTH_SEED_USERS;
    _resetUsersForTesting();
    try {
      const res = await requestApp(app, {
        method: "POST",
        path: "/auth/login",
        body: { username: "admin", password: "admin-test" }
      });
      expect(res.status).toBe(503);
      expect(res.text).not.toContain("Error");
      expect(res.text).not.toContain("stack");
    } finally {
      process.env.AUTH_SEED_USERS = original;
      _resetUsersForTesting();
    }
  });
});
