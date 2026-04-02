import { parseUpstreamIngestEvent, upstreamIngestEventSchema } from "../../src/boundary/boundary-schemas";

describe("boundary-schemas", () => {
  const validMinimal = {
    event_name: "execution_start",
    event_version: "1",
    org_id: "o1",
    workflow_id: "w1",
    timestamp: "2026-01-01T00:00:00.000Z",
    actor_type: "user",
    context: {},
    execution_id: "ex-1"
  };

  it("parses valid upstream payload", () => {
    const r = parseUpstreamIngestEvent(validMinimal);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.org_id).toBe("o1");
      expect(r.data.context).toEqual({});
    }
  });

  it("accepts optional source-id combinations", () => {
    const r = parseUpstreamIngestEvent({
      ...validMinimal,
      execution_id: undefined,
      workflow_run_id: "wr-1",
      run_id: "r-1",
      chat_id: "c-1",
      agent_run_id: "a-1",
      boundary_policy: { allow_composite_execution_id: true }
    });
    expect(r.ok).toBe(true);
  });

  it("rejects invalid boundary payload (missing actor)", () => {
    const r = parseUpstreamIngestEvent({
      ...validMinimal,
      actor_type: undefined,
      actor: undefined
    });
    expect(r.ok).toBe(false);
  });

  it("rejects unknown top-level keys in strict mode", () => {
    const r = parseUpstreamIngestEvent({
      ...validMinimal,
      extra_field: "nope"
    });
    expect(r.ok).toBe(false);
  });

  it("rejects malformed actor field types", () => {
    const r = parseUpstreamIngestEvent({
      ...validMinimal,
      actor_type: 123 as unknown as string
    });
    expect(r.ok).toBe(false);
  });

  it("rejects whitespace-only core fields", () => {
    const r = parseUpstreamIngestEvent({
      ...validMinimal,
      org_id: "   "
    });
    expect(r.ok).toBe(false);
  });

  it("upstreamIngestEventSchema safeParse matches parseUpstreamIngestEvent", () => {
    const a = upstreamIngestEventSchema.safeParse(validMinimal);
    const b = parseUpstreamIngestEvent(validMinimal);
    expect(a.success).toBe(b.ok);
  });
});
