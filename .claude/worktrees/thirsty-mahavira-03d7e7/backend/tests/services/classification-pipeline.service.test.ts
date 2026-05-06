import type { CanonicalEvent } from "../../src/domain/canonical-event.schema";
import { InMemoryClassificationRepository } from "../../src/repositories/classification.repository";
import { InMemoryWorkflowAggregateRepository } from "../../src/repositories/workflow-aggregate.repository";
import * as patternClassifier from "../../src/services/pattern-classifier";
import { BehaviorPattern } from "../../src/services/pattern-classifier";
import { runClassificationPipeline } from "../../src/services/classification-pipeline.service";

const baseEvent = (
  over: Partial<CanonicalEvent> & { context?: Record<string, unknown> },
  executionId: string
): CanonicalEvent => ({
  event_name: "step",
  event_version: "1",
  org_id: "o1",
  workflow_id: "w1",
  timestamp: "2026-01-01T12:00:00.000Z",
  actor_type: "human",
  context: {},
  execution_id: executionId,
  ...over,
  context: { ...over.context }
});

/** Minimal stream that passes build, FSC, minimum signal, and classifies (BLIND_EFFICIENCY path). */
function goldenExecution(executionId: string): CanonicalEvent[] {
  return [
    baseEvent(
      {
        event_name: "execution_start",
        timestamp: "2026-01-01T12:00:00.000Z",
        metadata: { event_id: "g0" }
      },
      executionId
    ),
    baseEvent(
      {
        event_name: "step",
        timestamp: "2026-01-01T12:00:30.000Z",
        metadata: { event_id: "g1" }
      },
      executionId
    ),
    baseEvent(
      {
        event_name: "ai_output_disposition",
        timestamp: "2026-01-01T12:01:00.000Z",
        context: { disposition: "accepted" },
        metadata: { event_id: "g2" }
      },
      executionId
    )
  ];
}

describe("runClassificationPipeline", () => {
  it("suppresses when build fails (empty events)", async () => {
    const classRepo = new InMemoryClassificationRepository();
    const aggRepo = new InMemoryWorkflowAggregateRepository();
    const r = await runClassificationPipeline(
      {
        org_id: "o1",
        workflow_id: "w1",
        execution_id: "ex",
        events: []
      },
      { classificationRepository: classRepo, workflowAggregateRepository: aggRepo }
    );
    expect(r.build).toBeNull();
    expect(r.outcome.status).toBe("SUPPRESSED");
    expect(r.outcome.suppression_reason).toBe("INCOMPLETE_EXECUTION");
    const stored = await classRepo.findByExecutionId("ex");
    expect(stored?.status).toBe("SUPPRESSED");
  });

  it("suppresses when FSC fails (no start boundary)", async () => {
    const classRepo = new InMemoryClassificationRepository();
    const aggRepo = new InMemoryWorkflowAggregateRepository();
    const events: CanonicalEvent[] = [
      baseEvent(
        {
          event_name: "step",
          timestamp: "2026-01-01T12:00:00.000Z",
          metadata: { event_id: "n0" }
        },
        "ex-pipe-2"
      ),
      baseEvent(
        {
          event_name: "ai_output_disposition",
          timestamp: "2026-01-01T12:01:00.000Z",
          context: { disposition: "accepted" },
          metadata: { event_id: "n1" }
        },
        "ex-pipe-2"
      )
    ];
    const r = await runClassificationPipeline(
      { org_id: "o1", workflow_id: "w1", execution_id: "ex-pipe-2", events },
      { classificationRepository: classRepo, workflowAggregateRepository: aggRepo }
    );
    expect(r.build).not.toBeNull();
    expect(r.outcome.status).toBe("SUPPRESSED");
    expect(r.outcome.suppression_reason).toBe("INCOMPLETE_EXECUTION");
  });

  it("suppresses when minimum signal gate fails (boundary but no secondary channel)", async () => {
    const classRepo = new InMemoryClassificationRepository();
    const aggRepo = new InMemoryWorkflowAggregateRepository();
    const events: CanonicalEvent[] = [
      baseEvent(
        {
          event_name: "execution_start",
          timestamp: "2026-01-01T12:00:00.000Z",
          metadata: { event_id: "m0" }
        },
        "ex-pipe-3"
      ),
      baseEvent(
        {
          event_name: "ai_output_disposition",
          timestamp: "2026-01-01T12:01:00.000Z",
          context: { disposition: "accepted" },
          metadata: { event_id: "m1" }
        },
        "ex-pipe-3"
      )
    ];
    const r = await runClassificationPipeline(
      { org_id: "o1", workflow_id: "w1", execution_id: "ex-pipe-3", events },
      { classificationRepository: classRepo, workflowAggregateRepository: aggRepo }
    );
    expect(r.outcome.status).toBe("SUPPRESSED");
    expect(r.outcome.suppression_reason).toBe("INSUFFICIENT_SIGNAL");
  });

  it("suppresses on classifier ambiguity", async () => {
    const spy = jest
      .spyOn(patternClassifier, "classifyBehaviorPattern")
      .mockReturnValue({ classified: false, reason: "AMBIGUITY" });
    const classRepo = new InMemoryClassificationRepository();
    const aggRepo = new InMemoryWorkflowAggregateRepository();
    const events = goldenExecution("ex-pipe-amb");
    const r = await runClassificationPipeline(
      { org_id: "o1", workflow_id: "w1", execution_id: "ex-pipe-amb", events },
      { classificationRepository: classRepo, workflowAggregateRepository: aggRepo }
    );
    expect(r.outcome.status).toBe("SUPPRESSED");
    expect(r.outcome.suppression_reason).toBe("AMBIGUITY");
    spy.mockRestore();
  });

  it("allows and persists when all gates pass", async () => {
    const classRepo = new InMemoryClassificationRepository();
    const aggRepo = new InMemoryWorkflowAggregateRepository();
    const events = goldenExecution("ex-pipe-1");
    const r = await runClassificationPipeline(
      { org_id: "o1", workflow_id: "w1", execution_id: "ex-pipe-1", events },
      { classificationRepository: classRepo, workflowAggregateRepository: aggRepo }
    );
    expect(r.outcome.status).toBe("ALLOWED");
    expect(r.outcome.pattern).toBe(BehaviorPattern.BLIND_EFFICIENCY);
    const stored = await classRepo.findByExecutionId("ex-pipe-1");
    expect(stored?.status).toBe("ALLOWED");
    expect(stored?.pattern).toBe(BehaviorPattern.BLIND_EFFICIENCY);
    const agg = await aggRepo.findByWorkflowId("o1", "w1");
    expect(agg).not.toBeNull();
    expect(agg!.classified_execution_count).toBeGreaterThanOrEqual(1);
  });
});
