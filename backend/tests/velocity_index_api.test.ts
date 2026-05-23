import fs from "node:fs";
import path from "node:path";
import request from "supertest";

import { app } from "../src/app";
import * as db from "../src/db";
import { buildFluencyEventRecord, store, type FluencyEventRecord } from "../src/store";

const Ajv = require("ajv");

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const BASE_NOW = Date.now();

const headers = {
  "x-role": "ADMIN",
  "x-org-id": "org-1",
  "Content-Type": "application/json"
};

const isoDaysAgo = (days: number, offsetMs = 0): string =>
  new Date(BASE_NOW - days * MS_PER_DAY + offsetMs).toISOString();

const velocityWindow = (windowDays: number, endOffsetMs = 0): { window_start: string; window_end: string } => {
  const end = new Date(BASE_NOW + endOffsetMs);
  const start = new Date(end.getTime() - windowDays * MS_PER_DAY);
  return {
    window_start: start.toISOString(),
    window_end: end.toISOString()
  };
};

let eventCounter = 0;
const nextEventId = (): string => {
  eventCounter += 1;
  return `velocity-qm-event-${eventCounter}`;
};

const addEvent = (event: FluencyEventRecord): void => {
  store.fluencyEvents.set(event.event_id, event);
};

const disposition = (
  workflowId: string,
  runId: string,
  daysAgo: number,
  overrides: Partial<Extract<FluencyEventRecord, { event_type: "ai_output_disposition" }>> = {},
  offsetMs = 0
) =>
  buildFluencyEventRecord(
    {
      event_type: "ai_output_disposition",
      timestamp: isoDaysAgo(daysAgo, offsetMs),
      risk_class: "low",
      org_unit: "org:org-1",
      workflow_id: workflowId,
      run_id: runId,
      disposition: "accepted",
      edit_distance_bucket: "none",
      verification_present: true,
      time_to_action_ms: 100,
      ...overrides
    },
    nextEventId()
  );

const seedVerificationOnlyWorkflow = (workflowId: string, count: number): void => {
  for (let i = 0; i < count; i += 1) {
    for (const daysAgo of [5, 95]) {
      const runId = `${workflowId}-${daysAgo}-${i}`;
      addEvent(disposition(workflowId, runId, daysAgo, {}, 0));
    }
  }
};

const schemaPath = (name: string) => path.resolve(__dirname, "../../schemas", name);
const loadSchema = (name: string) => {
  const schema = JSON.parse(fs.readFileSync(schemaPath(name), "utf8"));
  delete schema.$schema;
  return schema;
};
const baseline = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../../calibration/velocity_baselines.json"), "utf8")
);

const validVelocityEvent = (eventName = "USER_FREQUENCY_OBSERVED", cohortSize = 30) => ({
  schema_version: "FT_V2_2026_05",
  event_name: eventName,
  workflow_id: "wf-velocity",
  ...velocityWindow(60),
  cohort_size: cohortSize,
  distribution: { p10: 0, p50: baseline.frequency_p50, p90: baseline.frequency_p99, p99: baseline.frequency_p99 },
  calibration_reference: baseline.calibration_id,
  privacy: { person_level_fields_included: false }
});

const distributionForEvent = (eventName: string, factor = 1) => {
  if (eventName === "USER_ENGAGEMENT_OBSERVED") {
    return {
      p10: baseline.engagement_p50 * factor,
      p50: baseline.engagement_p50 * factor,
      p90: baseline.engagement_p99 * factor,
      p99: baseline.engagement_p99 * factor
    };
  }
  if (eventName === "USER_BREADTH_OBSERVED") {
    return {
      p10: 0,
      p50: baseline.breadth_p50 * factor,
      p90: baseline.breadth_p99 * factor,
      p99: baseline.breadth_p99 * factor
    };
  }
  return {
    p10: 0,
    p50: baseline.frequency_p50 * factor,
    p90: baseline.frequency_p99 * factor,
    p99: baseline.frequency_p99 * factor
  };
};

const ingestVelocity = (body: Record<string, unknown>) =>
  request(app).post("/api/v2/ingest/velocity-distribution").set(headers).send(body);

const getVelocityIndex = (workflowId: string, windowDays = 60, extra = "") =>
  request(app)
    .get(`/api/v2/velocity-index?workflow_id=${workflowId}&window_days=${windowDays}${extra}`)
    .set({ "x-role": "EXEC_VIEWER", "x-org-id": "org-1" });

beforeEach(() => {
  store.reset();
  store.orgs.set("org-1", { id: "org-1", name: "Org", minGroupSize: 1, createdAt: "now" });
});

describe("V2 velocity schemas", () => {
  it.each([
    ["ft_v2_user_frequency_observed.schema.json", "USER_FREQUENCY_OBSERVED"],
    ["ft_v2_user_engagement_observed.schema.json", "USER_ENGAGEMENT_OBSERVED"],
    ["ft_v2_user_breadth_observed.schema.json", "USER_BREADTH_OBSERVED"]
  ])("accepts valid %s and rejects person-level fields", (fileName, eventName) => {
    const ajv = new Ajv({ allErrors: true, $data: true });
    const validate = ajv.compile(loadSchema(fileName));

    expect(validate(validVelocityEvent(eventName))).toBe(true);
    expect(validate({ ...validVelocityEvent(eventName), user_email: "person@example.com" })).toBe(false);
    expect(validate({ ...validVelocityEvent(eventName), privacy: { person_level_fields_included: true } })).toBe(false);
    expect(validate({
      ...validVelocityEvent(eventName),
      distribution: { p10: 10, p50: 9, p90: 11, p99: 12 }
    })).toBe(false);
  });
});

describe("V2 velocity persistence migration", () => {
  it("keeps the aggregate-only privacy guard at the database boundary", () => {
    const migrationSql = fs.readFileSync(
      path.resolve(
        __dirname,
        "../prisma/migrations/20260522123000_add_velocity_distribution_observations/migration.sql"
      ),
      "utf8"
    );

    expect(migrationSql).toContain("velocity_distribution_observations_person_level_false_chk");
    expect(migrationSql).toContain('CHECK ("person_level_fields_included" = false)');
  });
});

describe("POST /api/v2/ingest/velocity-distribution", () => {
  it("ingests valid aggregate-distribution velocity payloads", async () => {
    const res = await ingestVelocity(validVelocityEvent());

    expect(res.status).toBe(202);
    expect(res.body).toMatchObject({
      accepted: true,
      event_name: "USER_FREQUENCY_OBSERVED",
      workflow_id: "wf-velocity"
    });
  });

  it("allows in-memory velocity ingest without org scope when persistence is disabled", async () => {
    for (const eventName of [
      "USER_FREQUENCY_OBSERVED",
      "USER_ENGAGEMENT_OBSERVED",
      "USER_BREADTH_OBSERVED"
    ]) {
      const res = await request(app)
        .post("/api/v2/ingest/velocity-distribution")
        .set({ "x-role": "ADMIN", "Content-Type": "application/json" })
        .send({
          ...validVelocityEvent(eventName),
          workflow_id: "wf-velocity-memory-no-org",
          distribution: distributionForEvent(eventName)
        });
      expect(res.status).toBe(202);
    }

    const replayed = await request(app)
      .get("/api/v2/velocity-index?workflow_id=wf-velocity-memory-no-org&window_days=60")
      .set({ "x-role": "EXEC_VIEWER" });

    expect(replayed.status).toBe(200);
    expect(replayed.body.verdict).toBe("SURFACE");
    expect(replayed.body.velocity_index).toBeCloseTo(1, 3);
  });

  it("rejects payloads with person-resolving fields", async () => {
    const res = await ingestVelocity({ ...validVelocityEvent(), name: "Ada Lovelace" });

    expect(res.status).toBe(400);
    expect(res.body.reason_code).toBe("person_level_field_rejected");
  });

  it("rejects unordered percentile distributions", async () => {
    const res = await ingestVelocity({
      ...validVelocityEvent(),
      distribution: { p10: 10, p50: 9, p90: 11, p99: 12 }
    });

    expect(res.status).toBe(400);
    expect(res.body.reason_code).toBe("invalid_velocity_distribution");
  });
});

describe("GET /api/v2/velocity-index", () => {
  it("surfaces sub-indices and a flat-average velocity index", async () => {
    await ingestVelocity(validVelocityEvent("USER_FREQUENCY_OBSERVED"));
    await ingestVelocity({
      ...validVelocityEvent("USER_ENGAGEMENT_OBSERVED"),
      distribution: distributionForEvent("USER_ENGAGEMENT_OBSERVED")
    });
    await ingestVelocity({
      ...validVelocityEvent("USER_BREADTH_OBSERVED"),
      distribution: distributionForEvent("USER_BREADTH_OBSERVED")
    });

    const res = await getVelocityIndex("wf-velocity");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      workflow_id: "wf-velocity",
      window_days: 60,
      verdict: "SURFACE",
      suppression_reason: null,
      cohort_size: 30,
      calibration_reference: "scio-prod-60d-2026-05",
      evidence_grade: "QUALITATIVE"
    });
    expect(res.body.frequency_index).toBeCloseTo(1, 3);
    expect(res.body.engagement_index).toBeCloseTo(1, 3);
    expect(res.body.breadth_index).toBeCloseTo(1, 3);
    expect(res.body.velocity_index).toBeCloseTo(1, 3);
  });

  it("suppresses below minimum cohort volume", async () => {
    await ingestVelocity(validVelocityEvent("USER_FREQUENCY_OBSERVED", 4));

    const res = await getVelocityIndex("wf-velocity");

    expect(res.status).toBe(200);
    expect(res.body.verdict).toBe("SUPPRESS");
    expect(res.body.suppression_reason).toBe("INSUFFICIENT_VOLUME");
    expect(res.body.velocity_index).toBeNull();
  });

  it("suppresses when the requested window is too short", async () => {
    await ingestVelocity(validVelocityEvent());

    const res = await getVelocityIndex("wf-velocity", 30);

    expect(res.status).toBe(200);
    expect(res.body.verdict).toBe("SUPPRESS");
    expect(res.body.suppression_reason).toBe("INSUFFICIENT_TIME");
    expect(res.body.velocity_index).toBeNull();
  });

  it("does not surface stale or shorter distributions for a longer requested window", async () => {
    for (const eventName of [
      "USER_FREQUENCY_OBSERVED",
      "USER_ENGAGEMENT_OBSERVED",
      "USER_BREADTH_OBSERVED"
    ]) {
      await ingestVelocity({
        ...validVelocityEvent(eventName),
        ...velocityWindow(30)
      });
    }

    const res = await getVelocityIndex("wf-velocity", 60);

    expect(res.status).toBe(200);
    expect(res.body.verdict).toBe("SUPPRESS");
    expect(res.body.suppression_reason).toBe("INSUFFICIENT_VOLUME");
    expect(res.body.velocity_index).toBeNull();
  });

  it("suppresses ambiguity-dominant velocity windows", async () => {
    await ingestVelocity({
      ...validVelocityEvent("USER_FREQUENCY_OBSERVED"),
      ambiguity_rate: 0.25
    });

    const res = await getVelocityIndex("wf-velocity");

    expect(res.status).toBe(200);
    expect(res.body.verdict).toBe("SUPPRESS");
    expect(res.body.suppression_reason).toBe("HIGH_AMBIGUITY");
    expect(res.body.velocity_index).toBeNull();
  });

  it("applies per-slice gates independently", async () => {
    await ingestVelocity({
      ...validVelocityEvent("USER_FREQUENCY_OBSERVED", 30),
      jbtd_id: "manager-review",
      persona_id: "frontline-manager"
    });
    await ingestVelocity({
      ...validVelocityEvent("USER_ENGAGEMENT_OBSERVED", 30),
      jbtd_id: "manager-review",
      persona_id: "frontline-manager"
    });
    await ingestVelocity({
      ...validVelocityEvent("USER_BREADTH_OBSERVED", 30),
      jbtd_id: "manager-review",
      persona_id: "frontline-manager"
    });
    await ingestVelocity({
      ...validVelocityEvent("USER_FREQUENCY_OBSERVED", 1),
      jbtd_id: "manager-review",
      persona_id: "exec"
    });

    const large = await getVelocityIndex(
      "wf-velocity",
      60,
      "&jbtd_id=manager-review&persona_id=frontline-manager"
    );
    const small = await getVelocityIndex("wf-velocity", 60, "&jbtd_id=manager-review&persona_id=exec");

    expect(large.body.verdict).toBe("SURFACE");
    expect(small.body.verdict).toBe("SUPPRESS");
    expect(small.body.suppression_reason).toBe("INSUFFICIENT_VOLUME");
  });

  it("optionally applies velocity to Quality Multiplier when requested", async () => {
    seedVerificationOnlyWorkflow("wf-velocity-qm", 5);
    for (const eventName of [
      "USER_FREQUENCY_OBSERVED",
      "USER_ENGAGEMENT_OBSERVED",
      "USER_BREADTH_OBSERVED"
    ]) {
      await ingestVelocity({
        ...validVelocityEvent(eventName),
        workflow_id: "wf-velocity-qm",
        ...velocityWindow(90),
        distribution: distributionForEvent(eventName, 2)
      });
    }

    const base = await request(app)
      .get("/api/v1/quality-multiplier?workflow_id=wf-velocity-qm&window_days=90")
      .set({ "x-role": "EXEC_VIEWER", "x-org-id": "org-1" });
    const adjusted = await request(app)
      .get("/api/v1/quality-multiplier?workflow_id=wf-velocity-qm&window_days=90&include_velocity=true")
      .set({ "x-role": "EXEC_VIEWER", "x-org-id": "org-1" });

    expect(base.body.verdict).toBe("SURFACE");
    expect(adjusted.body.verdict).toBe("SURFACE");
    expect(adjusted.body.multiplier).toBeGreaterThan(base.body.multiplier);
    expect(adjusted.body.velocity_adjustment_factor).toBeGreaterThan(1);
  });

  it("replays velocity distributions from Prisma after in-memory cache is cleared", async () => {
    const persistedRows: any[] = [];
    const prisma = {
      v2VelocityDistributionObservation: {
        create: jest.fn(async ({ data }) => {
          persistedRows.push({
            id: `velocity-row-${persistedRows.length}`,
            ...data,
            ingestedAt: data.ingestedAt ?? new Date(),
            ingestSequence: BigInt(persistedRows.length + 1)
          });
        }),
        findMany: jest.fn(async () => persistedRows)
      }
    };
    const prismaSpy = jest.spyOn(db, "getPrisma").mockReturnValue(prisma as any);
    process.env.DATABASE_URL = "postgres://velocity-persistence-test";

    try {
      for (const eventName of [
        "USER_FREQUENCY_OBSERVED",
        "USER_ENGAGEMENT_OBSERVED",
        "USER_BREADTH_OBSERVED"
      ]) {
        const res = await ingestVelocity({
          ...validVelocityEvent(eventName),
          workflow_id: "wf-velocity-persisted",
          distribution: distributionForEvent(eventName)
        });
        expect(res.status).toBe(202);
      }
      expect(prisma.v2VelocityDistributionObservation.create).toHaveBeenCalledTimes(3);

      store.velocityDistributions.clear();

      const replayed = await getVelocityIndex("wf-velocity-persisted");

      expect(prisma.v2VelocityDistributionObservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            orgId: "org-1",
            workflowId: "wf-velocity-persisted",
            schemaVersion: "FT_V2_2026_05",
            personLevelFieldsIncluded: false
          })
        })
      );
      expect(replayed.status).toBe(200);
      expect(replayed.body.verdict).toBe("SURFACE");
      expect(replayed.body.velocity_index).toBeCloseTo(1, 3);
    } finally {
      delete process.env.DATABASE_URL;
      prismaSpy.mockRestore();
    }
  });

  it("uses the latest persisted observation when append-only replay has duplicates", async () => {
    const persistedRows: any[] = [];
    const prisma = {
      v2VelocityDistributionObservation: {
        create: jest.fn(async ({ data }) => {
          persistedRows.push({
            id: `velocity-row-${persistedRows.length}`,
            ...data,
            ingestedAt: new Date(Date.UTC(2026, 4, 22, 0, 0, persistedRows.length)),
            ingestSequence: BigInt(persistedRows.length + 1)
          });
        }),
        findMany: jest.fn(async ({ orderBy }) => {
          const direction = orderBy?.[0]?.ingestedAt ?? "asc";
          return [...persistedRows].sort((a, b) =>
            direction === "asc"
              ? Number(a.ingestSequence - b.ingestSequence)
              : Number(b.ingestSequence - a.ingestSequence)
          );
        })
      }
    };
    const prismaSpy = jest.spyOn(db, "getPrisma").mockReturnValue(prisma as any);
    process.env.DATABASE_URL = "postgres://velocity-latest-row-test";

    try {
      await ingestVelocity({
        ...validVelocityEvent("USER_FREQUENCY_OBSERVED"),
        workflow_id: "wf-velocity-latest-wins",
        distribution: distributionForEvent("USER_FREQUENCY_OBSERVED", 0.5)
      });
      await ingestVelocity({
        ...validVelocityEvent("USER_FREQUENCY_OBSERVED"),
        workflow_id: "wf-velocity-latest-wins",
        distribution: distributionForEvent("USER_FREQUENCY_OBSERVED", 2)
      });
      for (const eventName of ["USER_ENGAGEMENT_OBSERVED", "USER_BREADTH_OBSERVED"]) {
        await ingestVelocity({
          ...validVelocityEvent(eventName),
          workflow_id: "wf-velocity-latest-wins",
          distribution: distributionForEvent(eventName)
        });
      }

      store.velocityDistributions.clear();

      const replayed = await getVelocityIndex("wf-velocity-latest-wins");

      expect(replayed.status).toBe(200);
      expect(replayed.body.verdict).toBe("SURFACE");
      expect(replayed.body.frequency_index).toBe(1.5);
      expect(replayed.body.velocity_index).toBeCloseTo(1.167, 3);
    } finally {
      delete process.env.DATABASE_URL;
      prismaSpy.mockRestore();
    }
  });

  it("applies persisted velocity rows to Quality Multiplier after in-memory cache is cleared", async () => {
    const persistedRows: any[] = [];
    const prisma = {
      v1CanonicalEvent: {
        findMany: jest.fn(async () => {
          throw new Error("canonical events not mocked");
        })
      },
      v2VelocityDistributionObservation: {
        create: jest.fn(async ({ data }) => {
          persistedRows.push({
            id: `velocity-row-${persistedRows.length}`,
            ...data,
            ingestedAt: data.ingestedAt ?? new Date(),
            ingestSequence: BigInt(persistedRows.length + 1)
          });
        }),
        findMany: jest.fn(async () => persistedRows)
      }
    };
    const prismaSpy = jest.spyOn(db, "getPrisma").mockReturnValue(prisma as any);
    process.env.DATABASE_URL = "postgres://velocity-quality-multiplier-test";
    seedVerificationOnlyWorkflow("wf-velocity-qm-persisted", 5);

    try {
      for (const eventName of [
        "USER_FREQUENCY_OBSERVED",
        "USER_ENGAGEMENT_OBSERVED",
        "USER_BREADTH_OBSERVED"
      ]) {
        await ingestVelocity({
          ...validVelocityEvent(eventName),
          workflow_id: "wf-velocity-qm-persisted",
          ...velocityWindow(90),
          distribution: distributionForEvent(eventName, 2)
        });
      }

      store.velocityDistributions.clear();

      const base = await request(app)
        .get("/api/v1/quality-multiplier?workflow_id=wf-velocity-qm-persisted&window_days=90")
        .set({ "x-role": "EXEC_VIEWER", "x-org-id": "org-1" });
      const adjusted = await request(app)
        .get("/api/v1/quality-multiplier?workflow_id=wf-velocity-qm-persisted&window_days=90&include_velocity=true")
        .set({ "x-role": "EXEC_VIEWER", "x-org-id": "org-1" });

      expect(base.body.verdict).toBe("SURFACE");
      expect(adjusted.body.verdict).toBe("SURFACE");
      expect(prisma.v2VelocityDistributionObservation.findMany).toHaveBeenCalled();
      expect(adjusted.body.multiplier).toBeGreaterThan(base.body.multiplier);
      expect(adjusted.body.velocity_adjustment_factor).toBeGreaterThan(1);
    } finally {
      delete process.env.DATABASE_URL;
      prismaSpy.mockRestore();
    }
  });

  it("rejects persisted velocity ingest without an organization scope", async () => {
    const prismaSpy = jest.spyOn(db, "getPrisma").mockReturnValue({} as any);
    process.env.DATABASE_URL = "postgres://velocity-missing-org-test";

    try {
      const res = await request(app)
        .post("/api/v2/ingest/velocity-distribution")
        .set({ "x-role": "ADMIN", "Content-Type": "application/json" })
        .send(validVelocityEvent("USER_FREQUENCY_OBSERVED"));

      expect(res.status).toBe(400);
      expect(res.body.reason_code).toBe("missing_org_scope");
    } finally {
      delete process.env.DATABASE_URL;
      prismaSpy.mockRestore();
    }
  });

  it("fails closed when persisted velocity rows cannot be read", async () => {
    const prisma = {
      v2VelocityDistributionObservation: {
        findMany: jest.fn(async () => {
          throw new Error("database unavailable");
        })
      }
    };
    const prismaSpy = jest.spyOn(db, "getPrisma").mockReturnValue(prisma as any);
    process.env.DATABASE_URL = "postgres://velocity-read-failure-test";

    try {
      const res = await getVelocityIndex("wf-velocity-db-down");

      expect(res.status).toBe(200);
      expect(res.body.verdict).toBe("SUPPRESS");
      expect(res.body.suppression_reason).toBe("INSUFFICIENT_VOLUME");
      expect(res.body.velocity_index).toBeNull();
    } finally {
      delete process.env.DATABASE_URL;
      prismaSpy.mockRestore();
    }
  });
});
