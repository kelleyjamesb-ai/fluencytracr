import type { Phase1Decision } from "./evaluateDecision";

export type Phase1SurfaceDecision = {
  decision: "SURFACE" | "SUPPRESS";
  suppression_reason_code?: string;
};

export const surfaceDecision = (decision: Phase1Decision): Phase1SurfaceDecision => {
  if (decision.decision === "SURFACE") {
    return { decision: "SURFACE" };
  }
  return {
    decision: "SUPPRESS",
    suppression_reason_code: decision.suppression_reason_code ?? "SUPP_UNSPECIFIED"
  };
};
