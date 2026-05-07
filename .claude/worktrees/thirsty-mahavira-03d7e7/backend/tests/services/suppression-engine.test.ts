import {
  evaluateSuppression,
  type SuppressionEngineInput
} from "../../src/services/suppression-engine";

describe("evaluateSuppression", () => {
  it("suppresses INCOMPLETE_EXECUTION when FSC false", () => {
    const input: SuppressionEngineInput = {
      fsc_eligible: false,
      minimum_signal_allowed: true,
      classification_possible: true
    };
    const d = evaluateSuppression(input);
    expect(d.status).toBe("SUPPRESSED");
    expect(d.reason).toBe("INCOMPLETE_EXECUTION");
    expect(d.diagnostics[0]).toBe("fsc_eligible_false");
  });

  it("suppresses INSUFFICIENT_SIGNAL when min signal false", () => {
    const input: SuppressionEngineInput = {
      fsc_eligible: true,
      minimum_signal_allowed: false,
      classification_possible: true
    };
    const d = evaluateSuppression(input);
    expect(d.status).toBe("SUPPRESSED");
    expect(d.reason).toBe("INSUFFICIENT_SIGNAL");
  });

  it("suppresses AMBIGUITY when classification not possible", () => {
    const input: SuppressionEngineInput = {
      fsc_eligible: true,
      minimum_signal_allowed: true,
      classification_possible: false,
      classification_reason: "no_match"
    };
    const d = evaluateSuppression(input);
    expect(d.status).toBe("SUPPRESSED");
    expect(d.reason).toBe("AMBIGUITY");
    expect(d.diagnostics[0]).toContain("classification_blocked");
  });

  it("allows when all gates pass", () => {
    const input: SuppressionEngineInput = {
      fsc_eligible: true,
      minimum_signal_allowed: true,
      classification_possible: true
    };
    const d = evaluateSuppression(input);
    expect(d.status).toBe("ALLOWED");
    expect(d.reason).toBeUndefined();
    expect(d.diagnostics[0]).toBe("all_gates_passed");
  });

  it("FSC failure wins over later failures", () => {
    const d = evaluateSuppression({
      fsc_eligible: false,
      minimum_signal_allowed: false,
      classification_possible: false
    });
    expect(d.reason).toBe("INCOMPLETE_EXECUTION");
  });

  it("min signal checked only after FSC passes", () => {
    const d = evaluateSuppression({
      fsc_eligible: true,
      minimum_signal_allowed: false,
      classification_possible: false
    });
    expect(d.reason).toBe("INSUFFICIENT_SIGNAL");
  });
});
