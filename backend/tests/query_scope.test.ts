import { enforceScopeWhitelist, hasDisallowedScopes } from "../src/query_scope";

it("rejects disallowed scopes", () => {
  expect(() => enforceScopeWhitelist("employee")).toThrow();
  expect(() => enforceScopeWhitelist("org,employee")).toThrow();
});

it("rejects unknown scopes", () => {
  expect(() => enforceScopeWhitelist("foobar")).toThrow();
});

it("accepts allowed scopes", () => {
  expect(() => enforceScopeWhitelist("org,team,role,time_bucket")).not.toThrow();
});

it("detects disallowed scopes in nested payloads", () => {
  const payload = { query: { scope: "user" } };
  expect(hasDisallowedScopes(payload)).toBe(true);
});
