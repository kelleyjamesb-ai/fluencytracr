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
          { tablename: "ai_value_objects" },
          { tablename: "value_hypotheses" },
          { tablename: "measurement_plans" },
          { tablename: "source_package_refs" },
          { tablename: "evidence_snapshots" }
        ],
        auditEvent: {
          findFirst: async () => null,
          create: async () => ({})
        }
      }),
      disconnectPrisma: async () => undefined
    }));

    const { app } = await import("../src/app");
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.db).toBe("postgres");
  });

  it("fails readiness when a Phase 4 AI Value persistence table is missing", async () => {
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
          { tablename: "ai_value_objects" },
          { tablename: "value_hypotheses" },
          { tablename: "measurement_plans" },
          { tablename: "source_package_refs" }
        ],
        auditEvent: {
          findFirst: async () => null,
          create: async () => ({})
        }
      }),
      disconnectPrisma: async () => undefined
    }));

    const { app } = await import("../src/app");
    const response = await request(app).get("/health");

    expect(response.status).toBe(503);
    expect(response.body.status).toBe("degraded");
    expect(response.body.missing_tables).toContain("evidence_snapshots");
  });

  it("reports Phase 4 AI Value persistence tables in ops readiness schema gaps", async () => {
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
          { tablename: "ai_value_objects" },
          { tablename: "value_hypotheses" },
          { tablename: "measurement_plans" },
          { tablename: "source_package_refs" }
        ],
        auditEvent: {
          findFirst: async () => null,
          create: async () => ({})
        }
      }),
      disconnectPrisma: async () => undefined
    }));

    const { app } = await import("../src/app");
    const response = await request(app)
      .get("/ops/db/readiness")
      .set({ "x-role": "EXEC_VIEWER" });

    expect(response.status).toBe(503);
    expect(response.body.status).toBe("schema_incomplete");
    expect(response.body.missing_tables).toContain("evidence_snapshots");
    expect(response.body.required_tables).toEqual(
      expect.arrayContaining([
        "value_hypotheses",
        "measurement_plans",
        "source_package_refs",
        "evidence_snapshots"
      ])
    );
  });

  it("reports Phase 4 AI Value persistence tables in ops readiness error posture", async () => {
    jest.doMock("../src/db", () => ({
      getPrisma: () => ({
        $queryRawUnsafe: async () => {
          throw new Error("connection refused");
        },
        auditEvent: {
          findFirst: async () => null,
          create: async () => ({})
        }
      }),
      disconnectPrisma: async () => undefined
    }));

    const { app } = await import("../src/app");
    const response = await request(app)
      .get("/ops/db/readiness")
      .set({ "x-role": "EXEC_VIEWER" });

    expect(response.status).toBe(503);
    expect(response.body.status).toBe("unavailable");
    expect(response.body.required_tables).toEqual(
      expect.arrayContaining([
        "value_hypotheses",
        "measurement_plans",
        "source_package_refs",
        "evidence_snapshots"
      ])
    );
  });
});
