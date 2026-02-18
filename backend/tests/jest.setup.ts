import { disconnectPrisma } from "../src/db";

// Keep backend tests deterministic in local/sandbox runs where DB access may be blocked.
delete process.env.DATABASE_URL;
delete process.env.DIRECT_URL;
process.env.NODE_ENV = "test";

afterAll(async () => {
  await disconnectPrisma();
});
