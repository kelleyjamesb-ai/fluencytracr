import {
  aggregateFunctionWindows,
  CONFIDENCE_SCHEMA_VERSION,
  deriveIterationDepthLabel
} from "../../src/inference/confidence_layer";
import type { TaskEpisode } from "@learnaire/shared";

const buildEpisode = (overrides: Partial<TaskEpisode> = {}): TaskEpisode => {
  return {
    episode_id: overrides.episode_id ?? "episode-1",
    org_id: overrides.org_id ?? "org-1",
    function_id: overrides.function_id ?? "func-1",
    role_class: overrides.role_class ?? "IC",
    schema_version: CONFIDENCE_SCHEMA_VERSION,
    start_ts: overrides.start_ts ?? "2026-01-01T00:00:00Z",
    end_ts: overrides.end_ts ?? null,
    closure_reason: overrides.closure_reason ?? "EVENT_ADVANCE",
    ambiguity_state: overrides.ambiguity_state ?? { status: "CLEAR", reason_code: null },
    signal_primitives: overrides.signal_primitives ?? {
      iteration_count: 0,
      verification_present: false,
      recovery_present: false,
      latency_ms: null,
      abandonment: false
    }
  };
};

const windows = [
  { window_start: "2026-01-01T00:00:00Z", window_end: "2026-03-02T00:00:00Z" }
];

describe("FluencyTracr V1 Confidence Layer", () => {
  test("deriveIterationDepthLabel is non-ordinal under TG5", () => {
    expect(deriveIterationDepthLabel(0)).toBe("None");
    expect(deriveIterationDepthLabel(3)).toBe("None");
  });

  test("aggregateFunctionWindows suppresses outputs under TG5", () => {
    const episodes = [buildEpisode()];
    const outputs = aggregateFunctionWindows(episodes, windows, {
      contributor_counts: new Map([ ["func-1", 6] ]),
      ai_exposure_enabled: false,
      ai_amenable_functions: new Set(["func-1"])
    });

    expect(outputs).toEqual([]);
  });
});
