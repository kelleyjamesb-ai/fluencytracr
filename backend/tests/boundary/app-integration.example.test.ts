import { exampleProcessIngestBody } from "../../src/boundary/app-integration.example";
import { InMemoryClassificationRepository } from "../../src/repositories/classification.repository";
import { InMemoryEventRepository } from "../../src/repositories/event.repository";
import { InMemoryWorkflowAggregateRepository } from "../../src/repositories/workflow-aggregate.repository";

describe("app-integration.example", () => {
  const deps = () => ({
    eventRepository: new InMemoryEventRepository(),
    classificationPipelineDeps: {
      classificationRepository: new InMemoryClassificationRepository(),
      workflowAggregateRepository: new InMemoryWorkflowAggregateRepository()
    }
  });

  it("runs boundary → canonical → persist → pipeline", async () => {
    const d = deps();
    const res = await exampleProcessIngestBody(
      {
        event_name: "execution_start",
        event_version: "1",
        org_id: "o1",
        workflow_id: "w1",
        timestamp: "2026-01-01T12:00:00.000Z",
        actor_type: "user",
        context: {},
        execution_id: "ex-int-1"
      },
      d
    );
    expect(res.status).toBe(202);
    const rows = await d.eventRepository.findByExecutionId("ex-int-1");
    expect(rows).toHaveLength(1);
    const out = await d.classificationPipelineDeps.classificationRepository.findByExecutionId("ex-int-1");
    expect(out).not.toBeNull();
  });

  it("returns 422 for boundary map actor failure", async () => {
    const res = await exampleProcessIngestBody(
      {
        event_name: "step",
        event_version: "1",
        org_id: "o1",
        workflow_id: "w1",
        timestamp: "2026-01-01T12:00:00.000Z",
        actor_type: "unknown-bot-xyz",
        context: {},
        execution_id: "ex-int-2"
      },
      deps()
    );
    expect(res.status).toBe(422);
  });
});
