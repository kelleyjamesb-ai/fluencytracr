/**
 * Controller-level ingest e2e — boundary validation, append-only, pipeline trigger.
 */

import { createE2eInMemoryStack } from "../helpers/in-memory-dependencies";
import { postIngestPayload } from "../helpers/test-app.factory";
import { happyPathExecution } from "../fixtures/canonical-events.fixtures";
import { unmappableActorUpstream, validUpstreamIngest } from "../fixtures/upstream-events.fixtures";

describe("POST events controller e2e", () => {
  it("Scenario 1 (controller): happy path ingest persists append-only and classifies after last event", async () => {
    const stack = createE2eInMemoryStack(false);
    const exId = "ctl-happy-1";
    const canonical = happyPathExecution(exId);
    for (let i = 0; i < canonical.length; i += 1) {
      const res = await postIngestPayload(stack, canonical[i]!);
      expect(res.status).toBe(202);
      expect((res.body as { accepted: boolean }).accepted).toBe(true);
    }

    const all = await stack.eventRepository.findByExecutionId(exId);
    expect(all.length).toBe(3);
    expect(all.map((e) => e.event_name)).toEqual(["execution_start", "step", "ai_output_disposition"]);

    const outcome = await stack.classificationRepository.findByExecutionId(exId);
    expect(outcome?.status).toBe("ALLOWED");
  });

  it("maps upstream actor and accepts when applyActorMapping is true", async () => {
    const stack = createE2eInMemoryStack(true);
    const exId = "ctl-upstream-map";
    const payload = validUpstreamIngest(exId);
    const res = await postIngestPayload(stack, payload);
    expect(res.status).toBe(202);

    const rows = await stack.eventRepository.findByExecutionId(exId);
    expect(rows.length).toBe(1);
    expect(rows[0]!.actor_type).toBe("human");
  });

  it("Scenario 5: unmappable actor — 422, no persistence, no classification", async () => {
    const stack = createE2eInMemoryStack(true);
    const exId = "ctl-bad-actor";
    const res = await postIngestPayload(stack, unmappableActorUpstream(exId));
    expect(res.status).toBe(422);
    expect((res.body as { error?: string }).error).toBe("unknown_actor_label");

    const rows = await stack.eventRepository.findByExecutionId(exId);
    expect(rows.length).toBe(0);

    const outcome = await stack.classificationRepository.findByExecutionId(exId);
    expect(outcome).toBeNull();
  });
});
