import { store } from "../store";
import type { PatternInferenceRecord } from "./types";
import { INFERENCE_VERSION, parameterHash } from "./versioning";
import type { WindowSize } from "./windowing";

export const runInference = (_window: WindowSize = "60d"): PatternInferenceRecord[] => {
  store.patternInferenceRecords = [];
  store.inferenceAuditLogs = [];

  return [];
};

export const buildEmptyRecord = (
  scopeType: PatternInferenceRecord["scope_type"],
  scopeKey: string,
  pattern: PatternInferenceRecord["pattern"]
): PatternInferenceRecord => {
  return {
    scope_key: scopeKey,
    scope_type: scopeType,
    pattern,
    inference_version: INFERENCE_VERSION,
    parameter_hash: parameterHash()
  };
};
