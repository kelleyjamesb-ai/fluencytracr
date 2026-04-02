import {
  BehaviorPattern,
  classifyBehaviorPattern,
  type PatternClassificationInput
} from "../../src/services/pattern-classifier";

const base = (): PatternClassificationInput => ({
  abandonment_present: false,
  iteration_bucket: "NORMAL",
  raw_iteration_count: 1,
  verification_present: false,
  recovery_present: false,
  latency_bucket: "NORMAL"
});

describe("classifyBehaviorPattern", () => {
  it("classifies UNDERTRUST_AVOIDANCE when abandonment present", () => {
    const r = classifyBehaviorPattern({ ...base(), abandonment_present: true });
    expect(r.classified).toBe(true);
    expect(r.pattern).toBe(BehaviorPattern.UNDERTRUST_AVOIDANCE);
  });

  it("classifies FRICTION_LOOP when iteration and latency HIGH", () => {
    const r = classifyBehaviorPattern({
      ...base(),
      iteration_bucket: "HIGH",
      latency_bucket: "HIGH"
    });
    expect(r.classified).toBe(true);
    expect(r.pattern).toBe(BehaviorPattern.FRICTION_LOOP);
  });

  it("classifies RECOVERY_MATURITY when recovery present (after friction rules)", () => {
    const r = classifyBehaviorPattern({
      ...base(),
      recovery_present: true,
      iteration_bucket: "HIGH",
      latency_bucket: "LOW"
    });
    expect(r.classified).toBe(true);
    expect(r.pattern).toBe(BehaviorPattern.RECOVERY_MATURITY);
  });

  it("prefers FRICTION_LOOP over RECOVERY when both match", () => {
    const r = classifyBehaviorPattern({
      ...base(),
      recovery_present: true,
      iteration_bucket: "HIGH",
      latency_bucket: "HIGH"
    });
    expect(r.pattern).toBe(BehaviorPattern.FRICTION_LOOP);
  });

  it("classifies BLIND_EFFICIENCY", () => {
    const r = classifyBehaviorPattern({
      ...base(),
      raw_iteration_count: 0,
      verification_present: false
    });
    expect(r.classified).toBe(true);
    expect(r.pattern).toBe(BehaviorPattern.BLIND_EFFICIENCY);
  });

  it("classifies CALIBRATED_FLUENCY", () => {
    const r = classifyBehaviorPattern({
      ...base(),
      iteration_bucket: "LOW",
      verification_present: true,
      raw_iteration_count: 1
    });
    expect(r.classified).toBe(true);
    expect(r.pattern).toBe(BehaviorPattern.CALIBRATED_FLUENCY);
  });

  it("returns ambiguity when no rule matches", () => {
    const r = classifyBehaviorPattern({
      ...base(),
      iteration_bucket: "NORMAL",
      latency_bucket: "NORMAL",
      raw_iteration_count: 1,
      verification_present: true
    });
    expect(r.classified).toBe(false);
    expect(r.reason).toBe("AMBIGUITY");
  });
});
