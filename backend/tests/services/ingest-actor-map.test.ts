import { mapUpstreamActorToCanonical } from "../../src/services/ingest-actor-map";

describe("mapUpstreamActorToCanonical", () => {
  it("maps agent to ai", () => {
    const r = mapUpstreamActorToCanonical("agent");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.actor_type).toBe("ai");
    }
  });

  it("fails closed on unknown label", () => {
    const r = mapUpstreamActorToCanonical("ninja");
    expect(r.ok).toBe(false);
  });
});
