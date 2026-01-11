import {
  ALLOWED_CAPABILITIES,
  FORBIDDEN_CAPABILITIES,
  ROLE_CAPABILITIES,
  roleHasCapability,
  validateCapabilities
} from "../src/capabilities";

it("does not assign forbidden capabilities", () => {
  expect(() => validateCapabilities()).not.toThrow();
  const forbidden = new Set(FORBIDDEN_CAPABILITIES as readonly string[]);
  Object.values(ROLE_CAPABILITIES).forEach((caps) => {
    caps.forEach((capability) => {
      expect(forbidden.has(capability)).toBe(false);
    });
  });
});

it("all capabilities are from allowlist", () => {
  const allowed = new Set(ALLOWED_CAPABILITIES);
  Object.values(ROLE_CAPABILITIES).forEach((caps) => {
    caps.forEach((capability) => {
      expect(allowed.has(capability)).toBe(true);
    });
  });
});

it("role capability checks", () => {
  expect(roleHasCapability("EXEC_VIEWER", "VIEW_ORG_AGGREGATES")).toBe(true);
  expect(roleHasCapability("EXEC_VIEWER", "INGEST_DATA")).toBe(false);
});
