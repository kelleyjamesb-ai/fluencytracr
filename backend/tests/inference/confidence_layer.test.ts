import {
  aggregateFunctionWindows,
  CONFIDENCE_SCHEMA_VERSION,
  deriveIterationDepthLabel
} from "../../src/inference/confidence_layer";
import type { TaskEpisode } from "@fluencytracr/shared";

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

const buildInputs = (overrides: Partial<Parameters<typeof aggregateFunctionWindows>[2]> = {}) => {
  return {
    contributor_counts: overrides.contributor_counts ?? new Map([ ["func-1", 6] ]),
    parent_function_map: overrides.parent_function_map,
    ai_exposure_enabled: overrides.ai_exposure_enabled ?? false,
    ai_amenable_functions: overrides.ai_amenable_functions ?? new Set(["func-1"]),
    adjacency_signals_by_function: overrides.adjacency_signals_by_function,
    dispositions_by_episode: overrides.dispositions_by_episode,
    ambiguity_signals_by_episode: overrides.ambiguity_signals_by_episode
  };
};

const windows = [
  { window_start: "2026-01-01T00:00:00Z", window_end: "2026-03-02T00:00:00Z" },
  { window_start: "2026-03-03T00:00:00Z", window_end: "2026-05-02T00:00:00Z" }
];

describe("FluencyTracr V1 Confidence Layer", () => {
  test("ambiguous episodes do not contribute to latency or evidence", () => {
    const episodes = [
      buildEpisode({
        episode_id: "episode-ambiguous",
        signal_primitives: {
          iteration_count: 2,
          verification_present: true,
          recovery_present: true,
          latency_ms: 1200,
          abandonment: false
        }
      })
    ];

    const ambiguitySignals = new Map([
      ["episode-ambiguous", { no_advance: true, timeout: false, conflict: false, instrumentation_gap: false }]
    ]);

    const result = aggregateFunctionWindows(episodes, [windows[0]], buildInputs({
      ambiguity_signals_by_episode: ambiguitySignals
    }));

    expect(result[0].decision).toBe("SUPPRESS");
    expect(result[0].suppression_reason).toBe("HIGH_AMBIGUITY");
    expect(result[0].value_type).toBe("UNCLASSIFIED");
    expect(result[0].evidence_grade).toBe("QUALITATIVE");
    expect(result[0].signal_classes).toEqual([]);
    expect(result[0].positive_evidence_present).toBe(false);
    expect(result[0].ghost_use_evaluated).toBe(false);
  });

  test("positive evidence suppresses ghost use evaluation", () => {
    const episodes: TaskEpisode[] = [];
    for (let i = 0; i < 10; i += 1) {
      episodes.push(buildEpisode({
        episode_id: `win1-${i}`,
        start_ts: "2026-01-10T00:00:00Z",
        signal_primitives: {
          iteration_count: 0,
          verification_present: true,
          recovery_present: false,
          latency_ms: 100,
          abandonment: false
        }
      }));
    }
    for (let i = 0; i < 10; i += 1) {
      episodes.push(buildEpisode({
        episode_id: `win2-${i}`,
        start_ts: "2026-04-01T00:00:00Z",
        signal_primitives: {
          iteration_count: 0,
          verification_present: true,
          recovery_present: false,
          latency_ms: 120,
          abandonment: false
        }
      }));
    }

    const result = aggregateFunctionWindows(episodes, windows, buildInputs({
      ai_exposure_enabled: true,
      ai_amenable_functions: new Set(["func-1"]),
      adjacency_signals_by_function: new Map([ ["func-1", true] ])
    }));

    const secondWindow = result.find((entry) => entry.window_start === windows[1].window_start);
    expect(secondWindow?.positive_evidence_present).toBe(true);
    expect(secondWindow?.ghost_use_evaluated).toBe(false);
    expect(secondWindow?.value_type).toBe("ACCELERATION");
    expect(secondWindow?.evidence_grade).toBe("QUALITATIVE");
  });

  test("rolls up small teams to eligible parent function", () => {
    const episodes = [
      buildEpisode({
        episode_id: "child-1",
        function_id: "func-child",
        signal_primitives: {
          iteration_count: 1,
          verification_present: true,
          recovery_present: false,
          latency_ms: 50,
          abandonment: false
        }
      })
    ];

    const result = aggregateFunctionWindows(episodes, [windows[0]], buildInputs({
      contributor_counts: new Map([ ["func-child", 3], ["func-parent", 6] ]),
      parent_function_map: new Map([ ["func-child", "func-parent"] ]),
      ai_amenable_functions: new Set(["func-parent"])
    }));

    const parent = result.find((entry) => entry.function_id === "func-parent");
    const child = result.find((entry) => entry.function_id === "func-child");

    expect(parent?.rolled_up).toBe(true);
    expect(parent?.population_episodes).toBe(1);
    expect(child?.decision).toBe("SUPPRESS");
    expect(child?.suppression_reason).toBe("INSUFFICIENT_VOLUME");
    expect(child?.value_type).toBe("UNCLASSIFIED");
    expect(child?.evidence_grade).toBe("QUALITATIVE");
    expect(child?.rolled_up).toBe(true);
  });

  test("AIVM fields classify objective quality premium windows without changing suppression", () => {
    const objectiveWindows = [
      { window_start: "2026-01-01T00:00:00Z", window_end: "2026-04-01T00:00:00Z" },
      { window_start: "2026-04-02T00:00:00Z", window_end: "2026-07-01T00:00:00Z" }
    ];
    const episodes: TaskEpisode[] = [];
    for (let i = 0; i < 30; i += 1) {
      episodes.push(buildEpisode({
        episode_id: `quality-1-${i}`,
        start_ts: "2026-01-10T00:00:00Z",
        signal_primitives: {
          iteration_count: 0,
          verification_present: true,
          recovery_present: true,
          latency_ms: null,
          abandonment: false
        }
      }));
      episodes.push(buildEpisode({
        episode_id: `quality-2-${i}`,
        start_ts: "2026-04-10T00:00:00Z",
        signal_primitives: {
          iteration_count: 0,
          verification_present: true,
          recovery_present: true,
          latency_ms: null,
          abandonment: false
        }
      }));
    }

    const result = aggregateFunctionWindows(episodes, objectiveWindows, buildInputs({
      contributor_counts: new Map([ ["func-1", 30] ])
    }));
    const secondWindow = result.find((entry) => entry.window_start === objectiveWindows[1].window_start);
    expect(secondWindow?.decision).toBe("SURFACE");
    expect(secondWindow?.value_type).toBe("QUALITY_PREMIUM");
    expect(secondWindow?.evidence_grade).toBe("OBJECTIVE");
  });

  test("SURFACE aggregate emits reliability factor and components without changing the decision", () => {
    const episodes: TaskEpisode[] = [];
    for (let i = 0; i < 10; i += 1) {
      episodes.push(buildEpisode({
        episode_id: `reliable-1-${i}`,
        start_ts: "2026-01-10T00:00:00Z",
        signal_primitives: {
          iteration_count: i < 2 ? 3 : 0,
          verification_present: true,
          recovery_present: true,
          latency_ms: 100,
          abandonment: i === 0
        }
      }));
      episodes.push(buildEpisode({
        episode_id: `reliable-2-${i}`,
        start_ts: "2026-04-10T00:00:00Z",
        signal_primitives: {
          iteration_count: i < 2 ? 3 : 0,
          verification_present: true,
          recovery_present: true,
          latency_ms: 120,
          abandonment: i === 0
        }
      }));
    }

    const result = aggregateFunctionWindows(episodes, windows, buildInputs({
      contributor_counts: new Map([ ["func-1", 10] ])
    }));

    const secondWindow = result.find((entry) => entry.window_start === windows[1].window_start);
    expect(secondWindow?.decision).toBe("SURFACE");
    expect(secondWindow?.reliability_components).toEqual({
      abandonment_rate: 0.1,
      friction_loop_rate: 0.2,
      recovery_success_rate: 0.9,
      verification_presence_rate: 1
    });
    expect(secondWindow?.reliability_factor).toBe(0.9);
  });

  test("latency alone never surfaces and latency is ignored for ineligible roles", () => {
    const episodes = [
      buildEpisode({
        episode_id: "latency-only",
        start_ts: "2026-01-10T00:00:00Z",
        signal_primitives: {
          iteration_count: 0,
          verification_present: false,
          recovery_present: false,
          latency_ms: 1000,
          abandonment: false
        }
      }),
      buildEpisode({
        episode_id: "exec-latency",
        role_class: "EXEC",
        start_ts: "2026-01-12T00:00:00Z",
        signal_primitives: {
          iteration_count: 0,
          verification_present: false,
          recovery_present: false,
          latency_ms: 900,
          abandonment: false
        }
      })
    ];

    const result = aggregateFunctionWindows(episodes, [windows[0], windows[1]], buildInputs({
      contributor_counts: new Map([ ["func-1", 8] ])
    }));

    const firstWindow = result.find((entry) => entry.window_start === windows[0].window_start);
    expect(firstWindow?.decision).toBe("SUPPRESS");
    expect(firstWindow?.suppression_reason).toBe("NO_CONVERGENCE");
    expect(firstWindow?.signal_classes).toEqual(["INTERACTION", "LATENCY"]);
  });

  test("low volume and baseline instability suppress correctly", () => {
    const lowVolumeEpisodes = [
      buildEpisode({
        episode_id: "low-volume",
        start_ts: "2026-01-10T00:00:00Z",
        signal_primitives: {
          iteration_count: 1,
          verification_present: true,
          recovery_present: false,
          latency_ms: 100,
          abandonment: false
        }
      })
    ];

    const lowVolumeResult = aggregateFunctionWindows(lowVolumeEpisodes, [windows[0]], buildInputs({
      contributor_counts: new Map([ ["func-1", 8] ])
    }));

    expect(lowVolumeResult[0].decision).toBe("SUPPRESS");
    expect(lowVolumeResult[0].suppression_reason).toBe("INSUFFICIENT_VOLUME");
    expect(lowVolumeResult[0].reliability_factor).toBeNull();
    expect(lowVolumeResult[0].reliability_components).toBeNull();

    const baselineEpisodes: TaskEpisode[] = [];
    for (let i = 0; i < 10; i += 1) {
      baselineEpisodes.push(buildEpisode({
        episode_id: `base-1-${i}`,
        start_ts: "2026-01-12T00:00:00Z",
        signal_primitives: {
          iteration_count: 1,
          verification_present: true,
          recovery_present: false,
          latency_ms: 80,
          abandonment: false
        }
      }));
    }
    for (let i = 0; i < 10; i += 1) {
      baselineEpisodes.push(buildEpisode({
        episode_id: `base-2-${i}`,
        start_ts: "2026-04-10T00:00:00Z",
        signal_primitives: {
          iteration_count: 1,
          verification_present: false,
          recovery_present: true,
          latency_ms: 90,
          abandonment: false
        }
      }));
    }

    const baselineResult = aggregateFunctionWindows(baselineEpisodes, windows, buildInputs({
      contributor_counts: new Map([ ["func-1", 8] ])
    }));

    const secondWindow = baselineResult.find((entry) => entry.window_start === windows[1].window_start);
    expect(secondWindow?.decision).toBe("SUPPRESS");
    expect(secondWindow?.suppression_reason).toBe("BASELINE_UNSTABLE");
  });

  test("seasonal spikes without adjacent persistence suppress", () => {
    const episodes: TaskEpisode[] = [];
    for (let i = 0; i < 10; i += 1) {
      episodes.push(buildEpisode({
        episode_id: `seasonal-${i}`,
        start_ts: "2026-04-05T00:00:00Z",
        signal_primitives: {
          iteration_count: 1,
          verification_present: true,
          recovery_present: false,
          latency_ms: 110,
          abandonment: false
        }
      }));
    }

    const result = aggregateFunctionWindows(episodes, windows, buildInputs({
      contributor_counts: new Map([ ["func-1", 8] ])
    }));

    const spikeWindow = result.find((entry) => entry.window_start === windows[1].window_start);
    expect(spikeWindow?.decision).toBe("SUPPRESS");
    expect(spikeWindow?.suppression_reason).toBe("NO_CONVERGENCE");
  });

  test("aggregates do not expose individual attribution", () => {
    const episodes = [
      buildEpisode({
        episode_id: "privacy-1",
        start_ts: "2026-01-10T00:00:00Z",
        signal_primitives: {
          iteration_count: 1,
          verification_present: true,
          recovery_present: false,
          latency_ms: 100,
          abandonment: false
        }
      })
    ];

    const result = aggregateFunctionWindows(episodes, [windows[0]], buildInputs({
      contributor_counts: new Map([ ["func-1", 6] ])
    }));

    const aggregate = result[0];
    const keys = Object.keys(aggregate);
    expect(keys).not.toContain("episode_id");
    expect(keys).not.toContain("role_class");
    expect(keys).not.toContain("employee_id");
  });

  test("derives iteration depth labels with fixed thresholds", () => {
    expect(deriveIterationDepthLabel(0)).toBe("None");
    expect(deriveIterationDepthLabel(1)).toBe("Light");
    expect(deriveIterationDepthLabel(2)).toBe("Light");
    expect(deriveIterationDepthLabel(3)).toBe("Heavy");
  });
});
