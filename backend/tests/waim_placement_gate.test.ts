import fs from "fs";
import path from "path";
import { loadWaim } from "../src/waim/waim";
import { shouldSuppressPlacement } from "../src/waim/placementGate";

const now = new Date("2026-02-05T12:00:00Z");

const baseContext = {
  role: "individual_contributor",
  workflow: "document_editing",
  signal: "verification_presence",
  trigger_event: "HUMAN_CORRECTION",
  trigger_phase: "post_ai_insertion",
  trigger_before: "content_share",
  trigger_without_human_use: null,
  session_start: new Date("2026-02-05T11:50:00Z"),
  workflow_step: "step-1",
  session_event_count: 2,
  now
};

it("fails closed when WAIM is missing", () => {
  const waim = loadWaim("/tmp/waim-missing.yaml");
  const suppressed = shouldSuppressPlacement(waim, baseContext);
  expect(suppressed).toBe(true);
});

it("fails closed when WAIM is malformed", () => {
  const filePath = path.join("/tmp", `waim-malformed-${Date.now()}.yaml`);
  fs.writeFileSync(filePath, "version: v1\nplacements: invalid\n");
  const waim = loadWaim(filePath);
  const suppressed = shouldSuppressPlacement(waim, baseContext);
  expect(suppressed).toBe(true);
  fs.unlinkSync(filePath);
});

it("suppresses when placement does not match WAIM", () => {
  const waim = loadWaim();
  const suppressed = shouldSuppressPlacement(waim, {
    ...baseContext,
    workflow: "unknown_workflow"
  });
  expect(suppressed).toBe(true);
});

it("suppresses under anti-habit guard", () => {
  const waim = loadWaim();
  const suppressed = shouldSuppressPlacement(waim, baseContext);
  expect(suppressed).toBe(true);
});

it("suppresses when listed but wrong context", () => {
  const waim = loadWaim();
  const suppressed = shouldSuppressPlacement(waim, {
    ...baseContext,
    trigger_phase: "pre_ai_insertion"
  });
  expect(suppressed).toBe(true);
});

it("enforces cooldown suppression", () => {
  const waim = loadWaim();
  const suppressed = shouldSuppressPlacement(waim, {
    ...baseContext,
    session_event_count: 1,
    session_start: new Date("2026-02-05T11:59:30Z")
  });
  expect(suppressed).toBe(true);
});

it("non-deterministic suppression is not 100% allow", () => {
  const waim = loadWaim();
  const context = {
    ...baseContext,
    session_event_count: 1,
    session_start: new Date("2026-02-05T10:00:00Z")
  };
  let suppressedCount = 0;
  for (let i = 0; i < 20; i += 1) {
    if (shouldSuppressPlacement(waim, context)) {
      suppressedCount += 1;
    }
  }
  expect(suppressedCount).toBeGreaterThan(0);
});
