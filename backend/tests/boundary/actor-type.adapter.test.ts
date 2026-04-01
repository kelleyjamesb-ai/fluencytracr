import {
  mapActorType,
  normalizeActorLabel,
  UPSTREAM_ACTOR_AI,
  UPSTREAM_ACTOR_HUMAN,
  UPSTREAM_ACTOR_SYSTEM
} from "../../src/boundary/actor-type.adapter";

describe("actor-type.adapter", () => {
  it("maps human aliases", () => {
    for (const l of ["human", "user", "Person", " EMPLOYEE "]) {
      const r = mapActorType(l);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.actor_type).toBe("human");
    }
  });

  it("maps ai aliases", () => {
    const labels = ["ai", "assistant", "agent", "bot", "copilot", "model"];
    for (const l of labels) {
      const r = mapActorType(l);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.actor_type).toBe("ai");
    }
  });

  it("maps system aliases", () => {
    const labels = ["system", "service", "tool", "workflow", "automation"];
    for (const l of labels) {
      const r = mapActorType(l);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.actor_type).toBe("system");
    }
  });

  it("rejects unknown labels", () => {
    const r = mapActorType("alien");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("unknown_actor_label");
  });

  it("rejects empty input", () => {
    expect(mapActorType("").ok).toBe(false);
    expect(mapActorType("   ").ok).toBe(false);
  });

  it("normalizes case and whitespace via normalizeActorLabel", () => {
    expect(normalizeActorLabel("  HuMaN  ")).toBe("human");
  });

  it("exposes mapping tables as non-empty records", () => {
    expect(Object.keys(UPSTREAM_ACTOR_HUMAN).length).toBeGreaterThan(0);
    expect(Object.keys(UPSTREAM_ACTOR_AI).length).toBeGreaterThan(0);
    expect(Object.keys(UPSTREAM_ACTOR_SYSTEM).length).toBeGreaterThan(0);
  });
});
