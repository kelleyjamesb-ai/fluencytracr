import type { InferenceAuditRecord } from "./types";
import { INFERENCE_VERSION, parameterHash } from "./versioning";

export const buildAuditRecord = (scopesProcessed: number, withheldCount: number): InferenceAuditRecord => {
  return {
    inference_version: INFERENCE_VERSION,
    parameter_hash: parameterHash(),
    generated_at: new Date().toISOString(),
    scopes_processed: scopesProcessed,
    withheld_count: withheldCount
  };
};
