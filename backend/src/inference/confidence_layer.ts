import type { TaskEpisode, FunctionWindowAggregate, IterationDepth } from "@learnaire/shared";

export const CONFIDENCE_SCHEMA_VERSION = "v1" as const;

export type WindowDefinition = {
  window_start: string;
  window_end: string;
};

export type AggregationInputs = {
  contributor_counts: Map<string, number>;
  parent_function_map?: Map<string, string>;
  ai_exposure_enabled: boolean;
  ai_amenable_functions: Set<string>;
  adjacency_signals_by_function?: Map<string, boolean>;
  dispositions_by_episode?: Map<string, string>;
  ambiguity_signals_by_episode?: Map<string, unknown>;
};

export const deriveIterationDepthLabel = (_iterationCount: number): IterationDepth => {
  return "None";
};

export const aggregateFunctionWindows = (
  _episodes: TaskEpisode[],
  _windows: WindowDefinition[],
  _inputs: AggregationInputs
): FunctionWindowAggregate[] => {
  return [];
};
