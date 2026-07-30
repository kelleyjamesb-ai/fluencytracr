import crypto from "crypto";

import type { Role } from "@fluencytracr/shared";
import { aiValueEngine } from "@fluencytracr/shared";
import express, { type Express } from "express";
import request from "supertest";

jest.mock("../src/services/canonical-claim-trace.service", () => ({
  readCanonicalClaimTrace: jest.fn()
}));

import { app } from "../src/app";
import { readCanonicalClaimTrace } from "../src/services/canonical-claim-trace.service";
import { store } from "../src/store";

let capturedVercelServiceApp: Express | undefined;
const vercelListen = jest
  .spyOn(express.application, "listen")
  .mockImplementation(function (this: Express) {
    capturedVercelServiceApp = this;
    return {} as ReturnType<Express["listen"]>;
  });
jest.requireActual("../src/vercel");
vercelListen.mockRestore();
if (!capturedVercelServiceApp) {
  throw new Error("Vercel service adapter did not register its Express app");
}
const vercelServiceApp = capturedVercelServiceApp;

const jwtSecret = "slice-f-route-test-secret";
const bindingId = `canonical_identity_binding_${"1".repeat(64)}`;
const tracePath = `/api/v1/ai-value/claim-trace/${bindingId}`;
const base64Url = (value: Buffer | string) => Buffer.from(value).toString("base64url");
const bearer = (role: Role, orgId: string) => {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      sub: "slice-f-route-test",
      role,
      org_id: orgId,
      exp: Math.floor(Date.now() / 1000) + 3600
    })
  );
  const content = `${header}.${payload}`;
  const signature = base64Url(crypto.createHmac("sha256", jwtSecret).update(content).digest());
  return `Bearer ${content}.${signature}`;
};

const authorizedTrace = aiValueEngine.buildCanonicalClaimTraceAuthorized({
  hypothesisVersion: 1,
  planVersion: 2,
  measurementCellVersion: 3,
  metricId: "support_median_resolution_hours",
  measurementUnit: "hours",
  approvedDirection: "DECREASE",
  movement: {
    metric_id: "support_median_resolution_hours",
    measurement_unit: "hours",
    baseline_value: 18.4,
    comparison_value: 15.1,
    absolute_delta: -3.3,
    percent_change: -17.934783,
    observed_direction: "DECREASE",
    approved_metric_direction: "DECREASE",
    claim_label: "OBSERVED_NON_ATTRIBUTABLE"
  },
  policyState: aiValueEngine.aggregateClaimPolicyState(),
  caveats: [...aiValueEngine.AGGREGATE_CLAIM_CAVEATS]
});

const traceService = readCanonicalClaimTrace as jest.MockedFunction<typeof readCanonicalClaimTrace>;
const originalNodeEnv = process.env.NODE_ENV;
const originalJwtSecret = process.env.JWT_SECRET;
const originalDevHeaderAuth = process.env.DEV_HEADER_AUTH;

beforeEach(() => {
  process.env.NODE_ENV = "production";
  process.env.JWT_SECRET = jwtSecret;
  delete process.env.DEV_HEADER_AUTH;
  traceService.mockReset();
  traceService.mockResolvedValue(aiValueEngine.canonicalClaimTraceFixedHold());
});

afterAll(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
  if (originalDevHeaderAuth === undefined) delete process.env.DEV_HEADER_AUTH;
  else process.env.DEV_HEADER_AUTH = originalDevHeaderAuth;
});

describe("canonical claim trace API", () => {
  it.each<Role>(["ADMIN", "ENABLEMENT_LEAD"])(
    "allows %s to receive the fixed trace result",
    async (role) => {
      traceService.mockResolvedValue(authorizedTrace);

      const response = await request(app)
        .get(tracePath)
        .set("authorization", bearer(role, "org-northstar"));

      expect(response.status).toBe(200);
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(aiValueEngine.CanonicalClaimTraceSchema.safeParse(response.body).success).toBe(true);
      expect(response.body).toEqual(authorizedTrace);
    }
  );

  it.each<Role>(["GOV_OPERATOR", "EXEC_VIEWER", "MANAGER", "EMPLOYEE"])(
    "forbids %s from claim trace",
    async (role) => {
      const response = await request(app)
        .get(tracePath)
        .set("authorization", bearer(role, "org-northstar"));

      expect(response.status).toBe(403);
      expect(traceService).not.toHaveBeenCalled();
    }
  );

  it("does not allow role or org header spoofing", async () => {
    const response = await request(app)
      .get(tracePath)
      .set("authorization", bearer("EXEC_VIEWER", "org-foreign"))
      .set("x-role", "ADMIN")
      .set("x-org-id", "org-northstar");

    expect(response.status).toBe(403);
    expect(traceService).not.toHaveBeenCalled();
  });

  it("does not replace an allowed JWT organization with an org header", async () => {
    traceService.mockImplementation(async (orgId) =>
      orgId === "org-northstar" ? authorizedTrace : aiValueEngine.canonicalClaimTraceFixedHold()
    );

    const response = await request(app)
      .get(tracePath)
      .set("authorization", bearer("ADMIN", "org-northstar"))
      .set("x-org-id", "org-foreign");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(authorizedTrace);
  });

  it.each(["org_id", "orgId"])(
    "returns the fixed HOLD when %s conflicts with the signed organization",
    async (orgKey) => {
      traceService.mockResolvedValue(authorizedTrace);

      const response = await request(app)
        .get(`${tracePath}?${orgKey}=org-foreign`)
        .set("authorization", bearer("ADMIN", "org-northstar"));

      expect(response.status).toBe(200);
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.body).toEqual(aiValueEngine.canonicalClaimTraceFixedHold());
    }
  );

  it.each([
    ["case-variant route", tracePath.replace("/api/v1/ai-value", "/API/v1/AI-VALUE")],
    ["single trailing slash", `${tracePath}/`]
  ])("returns the fixed HOLD for %s with a conflicting organization query", async (_label, path) => {
    traceService.mockResolvedValue(authorizedTrace);

    const response = await request(app)
      .get(`${path}?org_id=org-foreign`)
      .set("authorization", bearer("ADMIN", "org-northstar"));

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body).toEqual(aiValueEngine.canonicalClaimTraceFixedHold());
  });

  it("keeps ordinary org-scope enforcement outside the exact trace path", async () => {
    const response = await request(app)
      .get(`${tracePath}/extra?org_id=org-foreign`)
      .set("authorization", bearer("ADMIN", "org-northstar"));

    expect(response.status).toBe(403);
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("keeps org-scope enforcement for a non-GET trace path", async () => {
    const response = await request(app)
      .post(`${tracePath}?orgId=org-foreign`)
      .set("authorization", bearer("ADMIN", "org-northstar"));

    expect(response.status).toBe(403);
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("returns byte-identical HOLD for authenticated lookup failures", async () => {
    traceService.mockImplementation(async (_orgId, requestedBindingId) =>
      requestedBindingId === bindingId
        ? authorizedTrace
        : aiValueEngine.canonicalClaimTraceFixedHold()
    );
    const paths = [
      "/api/v1/ai-value/claim-trace/not-a-binding",
      `/api/v1/ai-value/claim-trace/canonical_identity_binding_${"0".repeat(64)}`,
      `${tracePath}?packetId=aggregate_packet_guessed`
    ];
    const bodies: string[] = [];

    for (const path of paths) {
      const response = await request(app)
        .get(path)
        .set("authorization", bearer("ADMIN", "org-northstar"));
      expect(response.status).toBe(200);
      bodies.push(response.text);
    }

    expect(new Set(bodies).size).toBe(1);
    expect(JSON.parse(bodies[0])).toEqual(aiValueEngine.canonicalClaimTraceFixedHold());
  });

  it.each(["%", "%ZZ"])(
    "returns the byte-identical fixed HOLD for malformed percent selector %s",
    async (selector) => {
      traceService.mockResolvedValue(authorizedTrace);
      const ordinaryHold = await request(app)
        .get("/api/v1/ai-value/claim-trace/not-a-binding")
        .set("authorization", bearer("ADMIN", "org-northstar"));
      const malformed = await request(app)
        .get(`/api/v1/ai-value/claim-trace/${selector}`)
        .set("authorization", bearer("ADMIN", "org-northstar"));

      expect(malformed.status).toBe(200);
      expect(malformed.headers["cache-control"]).toBe("no-store");
      expect(malformed.headers["content-type"]).toMatch(/application\/json/);
      expect(malformed.text).toBe(ordinaryHold.text);
      expect(malformed.body).toEqual(aiValueEngine.canonicalClaimTraceFixedHold());
    }
  );

  it("keeps malformed percent selectors behind JWT and role authorization", async () => {
    const malformedPath = "/api/v1/ai-value/claim-trace/%";
    const missing = await request(app).get(malformedPath);
    const forged = await request(app)
      .get(malformedPath)
      .set("authorization", `${bearer("ADMIN", "org-northstar")}forged`);
    const forbidden = await request(app)
      .get(malformedPath)
      .set("authorization", bearer("EXEC_VIEWER", "org-northstar"));

    expect(missing.status).toBe(401);
    expect(forged.status).toBe(401);
    expect(forbidden.status).toBe(403);
    expect(missing.headers["cache-control"]).toBe("no-store");
    expect(forged.headers["cache-control"]).toBe("no-store");
    expect(forbidden.headers["cache-control"]).toBe("no-store");
    expect(traceService).not.toHaveBeenCalled();
  });

  it("returns one result-independent 405 boundary for every authorized HEAD request", async () => {
    traceService
      .mockResolvedValueOnce(authorizedTrace)
      .mockResolvedValueOnce(aiValueEngine.canonicalClaimTraceFixedHold());
    const paths = [
      tracePath,
      `/api/v1/ai-value/claim-trace/canonical_identity_binding_${"0".repeat(64)}`,
      "/api/v1/ai-value/claim-trace/%"
    ];
    const responses = [];

    for (const path of paths) {
      responses.push(
        await request(app)
          .head(path)
          .set("authorization", bearer("ADMIN", "org-northstar"))
      );
    }

    const boundaryShape = (response: (typeof responses)[number]) => ({
      status: response.status,
      cacheControl: response.headers["cache-control"],
      allow: response.headers["allow"],
      contentLength: response.headers["content-length"],
      contentType: response.headers["content-type"],
      body: response.text ?? ""
    });
    const shapes = responses.map(boundaryShape);
    expect(new Set(shapes.map((shape) => JSON.stringify(shape))).size).toBe(1);
    expect(shapes[0]).toEqual({
      status: 405,
      cacheControl: "no-store",
      allow: "GET",
      contentLength: undefined,
      contentType: undefined,
      body: ""
    });
    expect(traceService).not.toHaveBeenCalled();
  });

  it.each(["%", "%ZZ"])(
    "returns fixed HOLD after the Vercel adapter normalizes stripped selector %s",
    async (selector) => {
      traceService.mockResolvedValue(authorizedTrace);
      const ordinaryHold = await request(vercelServiceApp)
        .get("/v1/ai-value/claim-trace/not-a-binding")
        .set("authorization", bearer("ADMIN", "org-northstar"));
      const malformed = await request(vercelServiceApp)
        .get(`/v1/ai-value/claim-trace/${selector}`)
        .set("authorization", bearer("ADMIN", "org-northstar"));

      expect(malformed.status).toBe(200);
      expect(malformed.headers["cache-control"]).toBe("no-store");
      expect(malformed.headers["content-type"]).toMatch(/application\/json/);
      expect(malformed.text).toBe(ordinaryHold.text);
      expect(malformed.body).toEqual(aiValueEngine.canonicalClaimTraceFixedHold());
    }
  );

  it("returns one result-independent HEAD boundary after Vercel normalization", async () => {
    traceService
      .mockResolvedValueOnce(authorizedTrace)
      .mockResolvedValueOnce(aiValueEngine.canonicalClaimTraceFixedHold());
    const paths = [
      `/v1/ai-value/claim-trace/${bindingId}`,
      `/v1/ai-value/claim-trace/canonical_identity_binding_${"0".repeat(64)}`,
      "/v1/ai-value/claim-trace/%"
    ];
    const responses = [];

    for (const path of paths) {
      responses.push(
        await request(vercelServiceApp)
          .head(path)
          .set("authorization", bearer("ADMIN", "org-northstar"))
      );
    }

    const shapes = responses.map((response) => ({
      status: response.status,
      cacheControl: response.headers["cache-control"],
      allow: response.headers["allow"],
      contentLength: response.headers["content-length"],
      contentType: response.headers["content-type"],
      body: response.text ?? ""
    }));
    expect(new Set(shapes.map((shape) => JSON.stringify(shape))).size).toBe(1);
    expect(shapes[0]).toEqual({
      status: 405,
      cacheControl: "no-store",
      allow: "GET",
      contentLength: undefined,
      contentType: undefined,
      body: ""
    });
    expect(traceService).not.toHaveBeenCalled();
  });

  it("returns the same HOLD when a GET body is present", async () => {
    traceService.mockResolvedValue(authorizedTrace);
    const held = await request(app)
      .get("/api/v1/ai-value/claim-trace/not-a-binding")
      .set("authorization", bearer("ADMIN", "org-northstar"));
    const withBody = await request(app)
      .get(tracePath)
      .set("authorization", bearer("ADMIN", "org-northstar"))
      .send({ ignored: true });

    expect(held.status).toBe(200);
    expect(withBody.status).toBe(200);
    expect(withBody.text).toBe(held.text);
    expect(JSON.parse(withBody.text)).toEqual(aiValueEngine.canonicalClaimTraceFixedHold());
  });

  it.each([
    ["empty JSON object", "application/json", "{}"],
    ["JSON array", "application/json", "[]"],
    ["JSON org_id", "application/json", '{"org_id":"org-foreign"}'],
    ["JSON orgId", "application/json", '{"orgId":"org-foreign"}'],
    ["plain text", "text/plain", "unexpected"],
    ["malformed JSON", "application/json", "{"],
    ["oversized JSON", "application/json", "x".repeat(1024 * 101)]
  ])("returns the fixed HOLD for a nonempty GET body: %s", async (_label, type, body) => {
    traceService.mockResolvedValue(authorizedTrace);

    const response = await request(app)
      .get(tracePath)
      .set("authorization", bearer("ADMIN", "org-northstar"))
      .set("content-type", type)
      .send(body);

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body).toEqual(aiValueEngine.canonicalClaimTraceFixedHold());
  });

  it("requires a valid JWT before serving the trace", async () => {
    const missing = await request(app).get(tracePath);
    const forged = await request(app)
      .get(tracePath)
      .set("authorization", `${bearer("ADMIN", "org-northstar")}forged`);

    expect(missing.status).toBe(401);
    expect(forged.status).toBe(401);
    expect(missing.headers["cache-control"]).toBe("no-store");
    expect(forged.headers["cache-control"]).toBe("no-store");
    expect(traceService).not.toHaveBeenCalled();
  });

  it("sets no-store on an RBAC denial", async () => {
    const response = await request(app)
      .get(tracePath)
      .set("authorization", bearer("EXEC_VIEWER", "org-northstar"));

    expect(response.status).toBe(403);
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it.each(["post", "put", "patch", "delete"] as const)(
    "does not expose a %s mutation path for a claim trace",
    async (method) => {
      const persistedBefore = Array.from(store.aiValueObjects.entries());
      const response = await request(app)
        [method](tracePath)
        .set("authorization", bearer("ADMIN", "org-northstar"))
        .send({ mutation: true });

      expect(response.status).toBe(404);
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(traceService).not.toHaveBeenCalled();
      expect(Array.from(store.aiValueObjects.entries())).toEqual(persistedBefore);
    }
  );
});
