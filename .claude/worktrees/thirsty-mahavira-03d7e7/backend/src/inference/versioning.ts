import crypto from "crypto";
import { MIN_DAYS, MIN_EVENTS } from "./gating";

export const INFERENCE_VERSION = "v0.1.0";

export const parameterHash = () => {
  const payload = JSON.stringify({
    MIN_EVENTS,
    MIN_DAYS,
    weights: { workflowCoverage: 0.67, patternConfidence: 0.33 }
  });
  return crypto.createHash("sha256").update(payload).digest("hex");
};
