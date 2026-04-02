/**
 * Governance regression: observability API contract stays minimal — no internal/debug fields on success or error paths.
 */

import { handleGetObservability } from "../../src/controllers/observability.controller";
import { InMemoryWorkflowAggregateRepository } from "../../src/repositories/workflow-aggregate.repository";
import { DEFAULT_PREVALENCE_MODE } from "../../src/services/workflow-aggregate.service";
import { expectGovernanceSafeObservabilityBody } from "./helpers/governance-matchers";
import { GOV_ORG, GOV_WF_ALPHA } from "./fixtures/governance.fixtures";
import { BehaviorPattern } from "../../src/services/pattern-classifier";

describe("governance regression — API contract", () => {
  it("DEFAULT_PREVALENCE_MODE remains categorical for executive defaults", () => {
    expect(DEFAULT_PREVALENCE_MODE).toBe("CATEGORICAL_PREVALENCE");
  });

  it("GET observability 400 body exposes only error code key", async () => {
    const repo = new InMemoryWorkflowAggregateRepository();
    const res = await handleGetObservability("   ", { workflowAggregateRepository: repo });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body as object).sort()).toEqual(["error"]);
    const err = res.body as { error: string };
    expect(typeof err.error).toBe("string");
    expect(err.error.length).toBeGreaterThan(0);
    expect(JSON.stringify(res.body).toLowerCase()).not.toMatch(/diagnostic|threshold|trace|execution_id/);
  });

  it("GET observability 200 body never includes diagnostics, suppression internals, or classification traces", async () => {
    const repo = new InMemoryWorkflowAggregateRepository();
    await repo.upsertAggregate(
      {
        workflow_id: GOV_WF_ALPHA,
        classified_execution_count: 1,
        suppressed_execution_count: 0,
        prevalence_mode: "CATEGORICAL_PREVALENCE",
        pattern_distribution: [{ pattern: BehaviorPattern.CALIBRATED_FLUENCY, count: 1, prevalence_band: "HIGH" }]
      },
      GOV_ORG
    );
    const res = await handleGetObservability(GOV_ORG, { workflowAggregateRepository: repo });
    expect(res.status).toBe(200);
    expectGovernanceSafeObservabilityBody(res.body);
    const raw = JSON.stringify(res.body).toLowerCase();
    expect(raw).not.toMatch(
      /diagnostic|suppression_reason|classification_trace|fsc_failed|min_signal|internal_debug/
    );
  });
});
