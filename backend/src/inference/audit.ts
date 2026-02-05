import type { InferenceAuditRecord } from "./types";
import { INFERENCE_VERSION, parameterHash } from "./versioning";

export const buildAuditRecord = (): InferenceAuditRecord => {
  return {
    inference_version: INFERENCE_VERSION,
    parameter_hash: parameterHash()
  };
};
