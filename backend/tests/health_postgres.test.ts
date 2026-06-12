import request from "supertest";

describe("health postgres disclosure", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalDirectUrl = process.env.DIRECT_URL;

  beforeEach(() => {
    jest.resetModules();
    process.env.DATABASE_URL = "postgresql://fluency:fluency@localhost:5432/fluency?schema=public";
    process.env.DIRECT_URL = process.env.DATABASE_URL;
  });

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }

    if (originalDirectUrl === undefined) {
      delete process.env.DIRECT_URL;
    } else {
      process.env.DIRECT_URL = originalDirectUrl;
    }
    jest.dontMock("../src/db");
  });

  it("reports postgres when database readiness succeeds", async () => {
    jest.doMock("../src/db", () => ({
      getPrisma: () => ({
        $queryRawUnsafe: async () => [
          { tablename: "Organization" },
          { tablename: "AuditEvent" },
          { tablename: "PolicyDocument" },
          { tablename: "PolicyMapping" },
          { tablename: "CanonicalControlStateHistory" },
          { tablename: "ComplianceEvent" },
          { tablename: "ComplianceDecision" },
          { tablename: "ai_value_objects" }
        ]
      }),
      disconnectPrisma: async () => undefined
    }));

    const { app } = await import("../src/app");
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.db).toBe("postgres");
  });
});
