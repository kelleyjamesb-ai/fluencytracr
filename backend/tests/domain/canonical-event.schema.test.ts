import {
  freezeCanonicalEvent,
  validateCanonicalEvent
} from "../../src/domain/canonical-event.schema";

const validBase = {
  event_name: "ai_output_disposition",
  event_version: "1",
  org_id: "org_1",
  workflow_id: "wf_1",
  timestamp: "2026-01-15T12:00:00.000Z",
  actor_type: "ai",
  context: { disposition: "accepted" },
  execution_id: "ex_1"
};

describe("validateCanonicalEvent", () => {
  it("accepts a valid event", () => {
    const r = validateCanonicalEvent(validBase);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.org_id).toBe("org_1");
      expect(r.value.execution_id).toBe("ex_1");
    }
  });

  it("rejects missing required field", () => {
    const { workflow_id: _w, ...rest } = validBase;
    const r = validateCanonicalEvent(rest);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.includes("workflow_id"))).toBe(true);
    }
  });

  it("rejects bad timestamp", () => {
    const r = validateCanonicalEvent({ ...validBase, timestamp: "not-a-date" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors).toContain("invalid_timestamp");
    }
  });

  it("rejects unknown top-level field", () => {
    const r = validateCanonicalEvent({ ...validBase, extra_field: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.startsWith("unknown_field:"))).toBe(true);
    }
  });

  it("rejects missing execution identity", () => {
    const { execution_id: _e, ...rest } = validBase;
    const r = validateCanonicalEvent(rest);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors).toContain("missing_execution_identity");
    }
  });

  it("accepts derivation via workflow_run_id", () => {
    const { execution_id: _e, ...rest } = validBase;
    const r = validateCanonicalEvent({ ...rest, workflow_run_id: "wr_1" });
    expect(r.ok).toBe(true);
  });

  it("accepts optional opaque JBTD and persona join keys", () => {
    const r = validateCanonicalEvent({
      ...validBase,
      jbtd_id: "manager-review_1",
      persona_id: "frontline-manager"
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.jbtd_id).toBe("manager-review_1");
      expect(r.value.persona_id).toBe("frontline-manager");
    }
  });

  it("rejects oversize or invalid opaque join keys", () => {
    const tooLong = validateCanonicalEvent({ ...validBase, jbtd_id: "a".repeat(65) });
    const invalid = validateCanonicalEvent({ ...validBase, persona_id: "Manager Review" });
    expect(tooLong.ok).toBe(false);
    expect(invalid.ok).toBe(false);
    if (!tooLong.ok) {
      expect(tooLong.errors).toContain("invalid_join_key:jbtd_id");
    }
    if (!invalid.ok) {
      expect(invalid.errors).toContain("invalid_join_key:persona_id");
    }
  });
});

describe("freezeCanonicalEvent", () => {
  it("returns a frozen object", () => {
    const v = validateCanonicalEvent(validBase);
    expect(v.ok).toBe(true);
    if (!v.ok) {
      return;
    }
    const f = freezeCanonicalEvent(v.value);
    expect(Object.isFrozen(f)).toBe(true);
    expect(Object.isFrozen(f.context)).toBe(true);
  });
});
