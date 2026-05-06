import { handlePostEvents } from "../../src/controllers/events.controller";
import { InMemoryEventRepository } from "../../src/repositories/event.repository";
import { InMemoryClassificationRepository } from "../../src/repositories/classification.repository";
import { InMemoryWorkflowAggregateRepository } from "../../src/repositories/workflow-aggregate.repository";

describe("handlePostEvents", () => {
  const makeDeps = () => ({
    eventRepository: new InMemoryEventRepository(),
    classificationPipelineDeps: {
      classificationRepository: new InMemoryClassificationRepository(),
      workflowAggregateRepository: new InMemoryWorkflowAggregateRepository()
    }
  });

  it("returns 202 and persists valid canonical event", async () => {
    const deps = makeDeps();
    const body = {
      event_name: "execution_start",
      event_version: "1",
      org_id: "o1",
      workflow_id: "w1",
      timestamp: "2026-01-01T12:00:00.000Z",
      actor_type: "human",
      context: {},
      execution_id: "ex-http-1"
    };
    const res = await handlePostEvents(body, deps);
    expect(res.status).toBe(202);
    expect((res.body as { accepted: boolean }).accepted).toBe(true);
    expect((res.body as { execution_id: string }).execution_id).toBe("ex-http-1");
    const stored = await deps.eventRepository.findByExecutionId("ex-http-1");
    expect(stored).toHaveLength(1);
  });

  it("returns 400 for invalid schema", async () => {
    const deps = makeDeps();
    const res = await handlePostEvents({ foo: 1 }, deps);
    expect(res.status).toBe(400);
    expect((res.body as { accepted: boolean }).accepted).toBe(false);
  });

  it("returns 422 for unmappable actor when applyActorMapping is true", async () => {
    const deps = makeDeps();
    const body = {
      event_name: "execution_start",
      event_version: "1",
      org_id: "o1",
      workflow_id: "w1",
      timestamp: "2026-01-01T12:00:00.000Z",
      actor_type: "bot_from_mars",
      context: {},
      execution_id: "ex-http-2"
    };
    const res = await handlePostEvents(body, { ...deps, applyActorMapping: true });
    expect(res.status).toBe(422);
    expect((res.body as { error: string }).error).toBe("unknown_actor_label");
  });

  it("maps agent to ai and returns 202 when applyActorMapping is true", async () => {
    const deps = makeDeps();
    const body = {
      event_name: "execution_start",
      event_version: "1",
      org_id: "o1",
      workflow_id: "w1",
      timestamp: "2026-01-01T12:00:00.000Z",
      actor_type: "agent",
      context: {},
      execution_id: "ex-http-3"
    };
    const res = await handlePostEvents(body, { ...deps, applyActorMapping: true });
    expect(res.status).toBe(202);
    const stored = await deps.eventRepository.findByExecutionId("ex-http-3");
    expect(stored[0]!.actor_type).toBe("ai");
  });

  it("triggers classification pipeline after append (outcome persisted)", async () => {
    const deps = makeDeps();
    const body = {
      event_name: "step",
      event_version: "1",
      org_id: "o1",
      workflow_id: "w1",
      timestamp: "2026-01-01T12:00:00.000Z",
      actor_type: "human",
      context: {},
      execution_id: "ex-http-4"
    };
    await handlePostEvents(body, deps);
    const outcome = await deps.classificationPipelineDeps.classificationRepository.findByExecutionId(
      "ex-http-4"
    );
    expect(outcome).not.toBeNull();
    expect(outcome!.execution_id).toBe("ex-http-4");
  });
});
