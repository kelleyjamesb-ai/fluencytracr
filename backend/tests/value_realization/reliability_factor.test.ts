import {
  computeReliabilityFactor,
  reliabilityComponentsFromCanonicalEvents,
  reliabilityComponentsFromCounts
} from "../../src/value_realization/reliability_factor";

describe("Reliability Factor", () => {
  test("bounds every component rate between 0.0 and 1.0", () => {
    const components = reliabilityComponentsFromCounts({
      total: 4,
      abandonment: 8,
      frictionLoop: 6,
      recoverySuccess: 5,
      verificationPresence: 7
    });

    expect(components).toEqual({
      abandonment_rate: 1,
      friction_loop_rate: 1,
      recovery_success_rate: 1,
      verification_presence_rate: 1
    });
  });

  test("returns 1.0 for fully verified recovery with no abandonment or friction", () => {
    const factor = computeReliabilityFactor({
      abandonment_rate: 0,
      friction_loop_rate: 0,
      recovery_success_rate: 1,
      verification_presence_rate: 1
    });

    expect(factor).toBe(1);
  });

  test("returns 0.0 for full abandonment and friction with no positive reliability evidence", () => {
    const factor = computeReliabilityFactor({
      abandonment_rate: 1,
      friction_loop_rate: 1,
      recovery_success_rate: 0,
      verification_presence_rate: 0
    });

    expect(factor).toBe(0);
  });

  test("computes the documented composite from all four component rates", () => {
    const factor = computeReliabilityFactor({
      abandonment_rate: 0.2,
      friction_loop_rate: 0.1,
      recovery_success_rate: 0.4,
      verification_presence_rate: 0.8
    });

    expect(factor).toBe(0.725);
  });

  test("derives component rates from existing V1 canonical events only", () => {
    const components = reliabilityComponentsFromCanonicalEvents([
      { event_name: "FT_V1_VERIFICATION_PRESENCE_OBSERVED", verification_present: true },
      { event_name: "FT_V1_VERIFICATION_PRESENCE_OBSERVED", verification_present: false },
      { event_name: "FT_V1_RECOVERY_OBSERVED", recovery_present: true },
      { event_name: "FT_V1_RECOVERY_OBSERVED", recovery_present: true },
      { event_name: "FT_V1_ITERATION_DEPTH_OBSERVED", iteration_depth: "HEAVY" },
      { event_name: "FT_V1_ITERATION_DEPTH_OBSERVED", iteration_depth: "LIGHT" },
      { event_name: "FT_V1_ABANDONMENT_OBSERVED", abandonment_present: true },
      { event_name: "FT_V1_ABANDONMENT_OBSERVED", abandonment_present: false },
      { event_name: "FT_V1_LATENCY_OBSERVED", latency_ms: 120 }
    ]);

    expect(components).toEqual({
      abandonment_rate: 0.5,
      friction_loop_rate: 0.5,
      recovery_success_rate: 1,
      verification_presence_rate: 0.5
    });
  });
});
