import type { UpstreamIngestEvent } from "../../src/boundary/boundary-schemas";
import { mapUpstreamEventToCanonical } from "../../src/boundary/ingest-event.mapper";
import { validateInternalCanonicalEvent } from "../../src/domain/canonical-event.schema";

const base = (over: Partial<UpstreamIngestEvent>): UpstreamIngestEvent => ({
  event_name: "step",
  event_version: "1",
  org_id: "o1",
  workflow_id: "w1",
  timestamp: "2026-01-01T12:00:00.000Z",
  actor_type: "human",
  context: {},
  execution_id: "ex-1",
  ...over
});

describe("ingest-event.mapper", () => {
  it("happy path with direct execution_id", () => {
    const r = mapUpstreamEventToCanonical(base({}));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.canonical_event.execution_id).toBe("ex-1");
      expect(r.canonical_event.actor_type).toBe("human");
	      const v = validateInternalCanonicalEvent(r.canonical_event);
      expect(v.ok).toBe(true);
    }
  });

  it("maps actor from upstream alias (actor field)", () => {
    const r = mapUpstreamEventToCanonical({
      event_name: "step",
      event_version: "1",
      org_id: "o1",
      workflow_id: "w1",
      timestamp: "2026-01-01T12:00:00.000Z",
      actor: "assistant",
      context: {},
      execution_id: "ex-1"
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.canonical_event.actor_type).toBe("ai");
  });

  it("prefers actor_type over actor when both set", () => {
    const r = mapUpstreamEventToCanonical(
      base({
        actor_type: "human",
        actor: "assistant"
      })
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.canonical_event.actor_type).toBe("human");
  });

  it("resolves workflow_run_id when execution_id absent", () => {
    const r = mapUpstreamEventToCanonical(
      base({
        execution_id: undefined,
        workflow_run_id: "wr-99"
      })
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.canonical_event.execution_id).toBe("wr-99");
	      const v = validateInternalCanonicalEvent(r.canonical_event);
      expect(v.ok).toBe(true);
    }
  });

  it("does not resolve chat_id as governed canonical execution lineage", () => {
    const r = mapUpstreamEventToCanonical(
      base({
        execution_id: undefined,
        workflow_run_id: undefined,
        run_id: undefined,
        chat_id: "chat-1",
        boundary_policy: { allow_composite_execution_id: true }
      })
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("missing_execution_identity");
  });

  it("does not carry chat_id or agent_run_id into canonical metadata lineage", () => {
    const r = mapUpstreamEventToCanonical(base({ chat_id: "chat-1", agent_run_id: "agent-1" }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      const lineage = (r.canonical_event.metadata as any)?.upstream_lineage ?? {};
      expect(lineage).not.toHaveProperty("chat_id");
      expect(lineage).not.toHaveProperty("agent_run_id");
	      const v = validateInternalCanonicalEvent(r.canonical_event);
      expect(v.ok).toBe(true);
    }
  });

  it("rejects unmappable actor", () => {
    const r = mapUpstreamEventToCanonical(base({ actor_type: "mars" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("unknown_actor_label");
  });

  it("rejects unresolved execution identity", () => {
    const r = mapUpstreamEventToCanonical(
      base({
        execution_id: undefined,
        chat_id: "only-chat",
        boundary_policy: undefined
      })
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("missing_execution_identity");
  });
});
