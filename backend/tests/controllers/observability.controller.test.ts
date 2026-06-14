import { handleGetObservability } from "../../src/controllers/observability.controller";
import { InMemoryWorkflowAggregateRepository } from "../../src/repositories/workflow-aggregate.repository";
import { BehaviorPattern } from "../../src/services/pattern-classifier";
import { DEFAULT_PREVALENCE_MODE } from "../../src/services/workflow-aggregate.service";

describe("handleGetObservability", () => {
  it("returns org-scoped workflow aggregates", async () => {
    const repo = new InMemoryWorkflowAggregateRepository();
    await repo.upsertAggregate(
      {
        workflow_id: "w1",
        jbtd_id: null,
        persona_id: null,
        verdict: "SURFACE",
        suppression_reason: null,
        classified_execution_count: 2,
        suppressed_execution_count: 1,
        pattern_distribution: [],
        prevalence_mode: DEFAULT_PREVALENCE_MODE
      },
      "org-a"
    );
    const res = await handleGetObservability("org-a", { workflowAggregateRepository: repo });
    expect(res.status).toBe(200);
    const body = res.body as { org_id: string; workflows: unknown[] };
    expect(body.org_id).toBe("org-a");
    expect(body.workflows).toHaveLength(1);
    expect((body.workflows[0] as { workflow_id: string }).workflow_id).toBe("w1");
    const wf = body.workflows[0] as Record<string, unknown>;
    expect(wf.jbtd_id).toBeNull();
    expect(wf.persona_id).toBeNull();
    expect(wf).not.toHaveProperty("executions");
    expect(wf).not.toHaveProperty("diagnostics");
  });

  it("returns empty workflows safely for unknown org", async () => {
    const repo = new InMemoryWorkflowAggregateRepository();
    const res = await handleGetObservability("org-empty", { workflowAggregateRepository: repo });
    expect(res.status).toBe(200);
    const body = res.body as { workflows: unknown[] };
    expect(body.workflows).toEqual([]);
  });

  it("returns 400 for blank org id", async () => {
    const repo = new InMemoryWorkflowAggregateRepository();
    const res = await handleGetObservability("  ", { workflowAggregateRepository: repo });
    expect(res.status).toBe(400);
  });

  it("Scenario E: converts stored NUMERIC_SHARE rows to categorical bands and omits share", async () => {
    const repo = new InMemoryWorkflowAggregateRepository();
    await repo.upsertAggregate(
      {
        workflow_id: "w-num",
        jbtd_id: null,
        persona_id: null,
        verdict: "SURFACE",
        suppression_reason: null,
        classified_execution_count: 2,
        suppressed_execution_count: 0,
        prevalence_mode: "NUMERIC_SHARE",
        pattern_distribution: [
          { pattern: BehaviorPattern.BLIND_EFFICIENCY, count: 1, share: 0.25 },
          { pattern: BehaviorPattern.RECOVERY_MATURITY, count: 1, share: 0.75 }
        ]
      },
      "org-a"
    );
    const res = await handleGetObservability("org-a", { workflowAggregateRepository: repo });
    expect(res.status).toBe(200);
    const body = res.body as {
      workflows: ReadonlyArray<{
        prevalence_mode: string;
        pattern_distribution: ReadonlyArray<Record<string, unknown>>;
      }>;
    };
    expect(body.workflows[0]!.prevalence_mode).toBe("CATEGORICAL_PREVALENCE");
    const json = JSON.stringify(res.body);
    expect(json).not.toMatch(/"share"/);
    const bands = body.workflows[0]!.pattern_distribution.map((r) => r.prevalence_band).sort();
    expect(bands).toEqual(["HIGH", "MODERATE"]);
    for (const row of body.workflows[0]!.pattern_distribution) {
      expect(row).not.toHaveProperty("share");
    }
  });

  it("returns opaque JBTD and persona join keys when present", async () => {
    const repo = new InMemoryWorkflowAggregateRepository();
    await repo.upsertAggregate(
      {
        workflow_id: "w-sliced",
        jbtd_id: "manager-review",
        persona_id: "frontline-manager",
        verdict: "SURFACE",
        suppression_reason: null,
        classified_execution_count: 5,
        suppressed_execution_count: 0,
        pattern_distribution: [],
        prevalence_mode: DEFAULT_PREVALENCE_MODE
      },
      "org-a"
    );
    const res = await handleGetObservability("org-a", { workflowAggregateRepository: repo });
    expect(res.status).toBe(200);
    const body = res.body as { workflows: ReadonlyArray<Record<string, unknown>> };
    expect(body.workflows[0]!.jbtd_id).toBe("manager-review");
    expect(body.workflows[0]!.persona_id).toBe("frontline-manager");
  });

  it("does not expose suppressed slice buckets publicly", async () => {
    const repo = new InMemoryWorkflowAggregateRepository();
    await repo.upsertAggregate(
      {
        workflow_id: "w-small",
        jbtd_id: "manager-review",
        persona_id: "frontline-manager",
        verdict: "SUPPRESS",
        suppression_reason: "INSUFFICIENT_VOLUME",
        classified_execution_count: 0,
        suppressed_execution_count: 1,
        pattern_distribution: [],
        prevalence_mode: DEFAULT_PREVALENCE_MODE
      },
      "org-a"
    );
    const res = await handleGetObservability("org-a", { workflowAggregateRepository: repo });
    expect(res.status).toBe(200);
    const body = res.body as { workflows: unknown[] };
    expect(body.workflows).toEqual([]);
  });
});
