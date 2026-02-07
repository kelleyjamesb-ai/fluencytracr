import bcrypt from "bcryptjs";

process.env.GOVERNANCE_ENFORCEMENT = "ON";
process.env.JWT_SECRET = "test-jwt-secret-phase6b-not-for-production";
process.env.NODE_ENV = "test";

// Seed users: one per role used in tests. Cost factor 4 for test speed.
const hash = (pw: string) => bcrypt.hashSync(pw, 4);
process.env.AUTH_SEED_USERS = [
  `admin:${hash("admin-test")}:ADMIN`,
  `enablement:${hash("enablement-test")}:ENABLEMENT_LEAD`,
  `viewer:${hash("viewer-test")}:EXEC_VIEWER`
].join(",");
