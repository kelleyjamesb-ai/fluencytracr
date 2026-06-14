/**
 * Observability controller e2e — executive-safe response shape (no leaks).
 */

import { createE2eInMemoryStack } from "../helpers/in-memory-dependencies";
import { postIngestPayload, getObservabilityForOrg } from "../helpers/test-app.factory";
import { fixtureIds, happyPathExecution, fscMissingStartExecution } from "../fixtures/canonical-events.fixtures";

const WORKFLOW_KEYS = new Set([
  "workflow_id",
  "jbtd_id",
  "persona_id",
  "classified_execution_count",
  "suppressed_execution_count",
  "pattern_distribution",
  "prevalence_mode"
]);

const PATTERN_KEYS = new Set(["pattern", "count", "prevalence_band"]);

function assertExecutiveSafeObservabilityPayload(body: unknown) {
  expect(body).not.toBeNull();
  expect(typeof body).toBe("object");
  const o = body as Record<string, unknown>;
  const topKeys = Object.keys(o).sort();
  expect(topKeys).toEqual(["org_id", "workflows"].sort());
  expect(typeof o.org_id).toBe("string");
  expect(Array.isArray(o.workflows)).toBe(true);

  const json = JSON.stringify(body).toLowerCase();
  expect(json).not.toMatch(/"execution_id"/);
  expect(json).not.toMatch(/trace_reconstructed|individual_trace|raw_event|event_payload/);
  expect(json).not.toMatch(/diagnostics|diagnostic\b/);
  expect(json).not.toMatch(/\branking\b|\brankings\b/);
  expect(json).not.toMatch(/\btrend\b|\btrends\b/);
  expect(json).not.toMatch(/\bthreshold\b/);

  for (const w of o.workflows as ReadonlyArray<Record<string, unknown>>) {
    const wk = Object.keys(w).sort();
    for (const k of wk) {
      expect(WORKFLOW_KEYS.has(k)).toBe(true);
    }
    expect(typeof w.workflow_id).toBe("string");
    expect(typeof w.classified_execution_count).toBe("number");
    expect(typeof w.suppressed_execution_count).toBe("number");
    expect(typeof w.prevalence_mode).toBe("string");
    expect(Array.isArray(w.pattern_distribution)).toBe(true);

    expect(w.prevalence_mode).toBe("CATEGORICAL_PREVALENCE");
    for (const p of w.pattern_distribution as ReadonlyArray<Record<string, unknown>>) {
      for (const pk of Object.keys(p)) {
        expect(PATTERN_KEYS.has(pk)).toBe(true);
      }
      expect(typeof p.pattern).toBe("string");
      expect(typeof p.count).toBe("number");
      expect(p).not.toHaveProperty("share");
      expect(typeof p.prevalence_band).toBe("string");
    }
  }
}

describe("GET observability controller e2e", () => {
  it("Scenario 7: executive-safe response after mixed outcomes", async () => {
    const stack = createE2eInMemoryStack(false);

    const exOk = "obs-ok";
    for (const ev of happyPathExecution(exOk)) {
      await postIngestPayload(stack, ev);
    }

    const exSup = "obs-sup";
    for (const ev of fscMissingStartExecution(exSup)) {
      await postIngestPayload(stack, ev);
    }

    const res = await getObservabilityForOrg(stack, fixtureIds.org);
    expect(res.status).toBe(200);
    assertExecutiveSafeObservabilityPayload(res.body);

    const body = res.body as { workflows: ReadonlyArray<{ workflow_id: string; suppressed_execution_count: number }> };
    const wf = body.workflows.find((w) => w.workflow_id === fixtureIds.workflowA);
    expect(wf).toBeDefined();
    expect(wf!.suppressed_execution_count).toBeGreaterThanOrEqual(1);
  });

  it("rejects empty org id with 400", async () => {
    const stack = createE2eInMemoryStack(false);
    const res = await getObservabilityForOrg(stack, "   ");
    expect(res.status).toBe(400);
  });
});
