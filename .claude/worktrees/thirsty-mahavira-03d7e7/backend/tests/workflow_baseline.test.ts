import { classifyExecutionPattern, type ExecutionSignals } from "../src/execution_signals";
import {
  buildWorkflowPhase2ThresholdMap,
  percentileLinear,
  thresholdsFromExecutionSamples,
  WORKFLOW_BASELINE_MIN_EXECUTIONS
} from "../src/workflow_baseline";
import { buildFluencyEventRecord } from "../src/store";
describe("percentileLinear", () => {
  it("interpolates within sorted samples", () => {
    expect(percentileLinear([0, 10, 20], 0.5)).toBe(10);
    expect(percentileLinear([0, 10, 20], 0.25)).toBe(5);
  });
});

describe("thresholdsFromExecutionSamples", () => {
  it("falls back when below minimum execution count", () => {
    const t = thresholdsFromExecutionSamples([0, 1], [100, 200]);
    expect(t).toEqual({
      iteration_low: 1,
      iteration_high: 2,
      latency_high_ms: 10 * 60 * 1000
    });
  });

  it("derives iteration bounds from distribution when enough samples", () => {
    const t = thresholdsFromExecutionSamples(
      [0, 0, 0, 0, 0],
      [1_000, 1_000, 1_000, 1_000, 1_000]
    );
    expect(t.iteration_low).toBe(0);
    expect(t.iteration_high).toBeGreaterThanOrEqual(1);
    expect(t.latency_high_ms).toBeGreaterThanOrEqual(60_000);
  });
});

describe("PRD §16 baseline vs flat thresholds", () => {
  const baseSignals = (partial: Partial<ExecutionSignals>): ExecutionSignals => ({
    event_count: 4,
    iteration_depth: 0,
    verification_present: true,
    recovery_present: false,
    abandonment_present: false,
    latency_ms: 2 * 60 * 60 * 1000,
    last_disposition: "accepted",
    has_ai_usage: true,
    confidence_tier: "high",
    ...partial
  });

  it("high-iteration workflow baseline can downgrade Friction Loop to Calibrated Fluency", () => {
    const flat = classifyExecutionPattern(
      baseSignals({ iteration_depth: 5, latency_ms: 2 * 60 * 60 * 1000 })
    );
    expect(flat).toBe("Friction Loop");

    const baseline = thresholdsFromExecutionSamples([8, 8, 8, 8, 8], [100_000, 100_000, 100_000, 100_000, 100_000]);
    const withBaseline = classifyExecutionPattern(
      baseSignals({ iteration_depth: 5, latency_ms: 2 * 60 * 60 * 1000 }),
      baseline
    );
    expect(withBaseline).toBe("Calibrated Fluency");
  });
});

describe("buildWorkflowPhase2ThresholdMap", () => {
  const pair = (wf: string, run: string, hour: number) => [
    buildFluencyEventRecord(
      {
        event_type: "ai_output_disposition",
        timestamp: `2026-04-01T${String(hour).padStart(2, "0")}:00:00.000Z`,
        risk_class: "low",
        workflow_id: wf,
        org_unit: "org:o1",
        disposition: "accepted",
        edit_distance_bucket: "none",
        verification_present: true,
        time_to_action_ms: 1,
        run_id: run
      },
      `${wf}-${run}-1`
    ),
    buildFluencyEventRecord(
      {
        event_type: "ai_output_disposition",
        timestamp: `2026-04-01T${String(hour).padStart(2, "0")}:01:00.000Z`,
        risk_class: "low",
        workflow_id: wf,
        org_unit: "org:o1",
        disposition: "accepted",
        edit_distance_bucket: "none",
        verification_present: false,
        time_to_action_ms: 1,
        run_id: run
      },
      `${wf}-${run}-2`
    )
  ];

  it("keys each workflow_id and uses samples when >= min executions", () => {
    const events = [
      ...pair("wf-a", "a0", 10),
      ...pair("wf-a", "a1", 11),
      ...pair("wf-a", "a2", 12),
      ...pair("wf-b", "b0", 20),
      ...pair("wf-b", "b1", 21),
      ...pair("wf-b", "b2", 22)
    ];
    const map = buildWorkflowPhase2ThresholdMap(events);
    expect(map.has("wf-a")).toBe(true);
    expect(map.has("wf-b")).toBe(true);
    expect(WORKFLOW_BASELINE_MIN_EXECUTIONS).toBeGreaterThanOrEqual(3);
    const t = map.get("wf-a")!;
    expect(t.iteration_low).toBe(0);
  });
});
