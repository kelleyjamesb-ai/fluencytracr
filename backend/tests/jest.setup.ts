import { disconnectPrisma } from "../src/db";

// Keep backend tests deterministic in local/sandbox runs where DB access may be blocked.
delete process.env.DATABASE_URL;
delete process.env.DIRECT_URL;
process.env.NODE_ENV = "test";

const originalConsoleWarn = console.warn.bind(console);
const RBAC_UNVERIFIED_ROLE_WARNING_PREFIX = "[SECURITY] Unverified privileged role claim";

beforeAll(() => {
  jest.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
    const [firstArg] = args;
    if (typeof firstArg === "string" && firstArg.startsWith(RBAC_UNVERIFIED_ROLE_WARNING_PREFIX)) {
      return;
    }
    originalConsoleWarn(...(args as Parameters<typeof console.warn>));
  });
});

afterAll(async () => {
  jest.restoreAllMocks();
  await disconnectPrisma();
});
