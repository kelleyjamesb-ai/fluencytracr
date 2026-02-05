import fs from "fs";
import path from "path";
import { Phase1IngestPayloadSchema } from "../src/phase1/contract";
import { evaluateDecision, SUPPRESSION_REASONS } from "../src/phase1/evaluateDecision";
import { surfaceDecision } from "../src/phase1/surfaceDecision";

const fixturePath = (name: string) =>
  path.join(__dirname, "fixtures", "phase1", name);

const loadFixture = (name: string) => {
  const raw = fs.readFileSync(fixturePath(name), "utf8");
  return JSON.parse(raw);
};

it("rejects events with unknown fields", () => {
  const payload = {
    events: [
      {
        schema_version: "FT_V1_2026_01",
        event_name: "FT_V1_DISPOSITION_OBSERVED",
        org_id: "org-1",
        function_id: "func-1",
        role_class: "role-1",
        tool_surface: "ASSISTANT",
        event_timestamp: "2025-01-01T00:00:00Z",
        window_id: "2025-01-01__2025-03-01",
        ambiguity_flag: false,
        extra_field: "not-allowed"
      }
    ]
  };
  const parsed = Phase1IngestPayloadSchema.safeParse(payload);
  expect(parsed.success).toBe(false);
});

it("defaults to suppression on insufficient evidence", () => {
  const payload = loadFixture("fixture_c.json");
  const events = Phase1IngestPayloadSchema.parse({
    events: [payload.events[0]]
  }).events;
  const decision = evaluateDecision(events);
  expect(decision.decision).toBe("SUPPRESS");
  expect(decision.suppression_reason_code).toBe(SUPPRESSION_REASONS.INSUFFICIENT_EVIDENCE);
});

it("suppresses ambiguous inputs with reason code", () => {
  const payload = Phase1IngestPayloadSchema.parse(loadFixture("fixture_a.json"));
  const decision = evaluateDecision(payload.events);
  expect(decision.decision).toBe("SUPPRESS");
  expect(decision.suppression_reason_code).toBe("AMB_EVIDENCE_INSUFFICIENT");
});

it("suppresses when window length is under 60 days", () => {
  const payload = Phase1IngestPayloadSchema.parse(loadFixture("fixture_b.json"));
  const decision = evaluateDecision(payload.events);
  expect(decision.decision).toBe("SUPPRESS");
  expect(decision.suppression_reason_code).toBe(SUPPRESSION_REASONS.WINDOW_LT_60);
});

it("surfaces when governance gates pass", () => {
  const payload = Phase1IngestPayloadSchema.parse(loadFixture("fixture_c.json"));
  const decision = evaluateDecision(payload.events);
  expect(decision.decision).toBe("SURFACE");
  expect(decision.suppression_reason_code).toBeUndefined();
});

it("is deterministic for the same input", () => {
  const payload = Phase1IngestPayloadSchema.parse(loadFixture("fixture_c.json"));
  const first = evaluateDecision(payload.events);
  const second = evaluateDecision(payload.events);
  expect(JSON.stringify(first)).toBe(JSON.stringify(second));
});

it("surfaces only allowlisted fields", () => {
  const payload = Phase1IngestPayloadSchema.parse(loadFixture("fixture_b.json"));
  const decision = evaluateDecision(payload.events);
  const surfaced = surfaceDecision(decision);
  const keys = Object.keys(surfaced).sort();
  expect(keys).toEqual(["decision", "suppression_reason_code"].sort());
});

it("suppressed cohorts never surface", () => {
  const payload = Phase1IngestPayloadSchema.parse(loadFixture("fixture_a.json"));
  const decision = evaluateDecision(payload.events);
  const surfaced = surfaceDecision(decision);
  expect(surfaced.decision).toBe("SUPPRESS");
  expect(surfaced.suppression_reason_code).toBeDefined();
});
