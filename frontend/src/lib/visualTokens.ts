export type Posture = "Scale" | "Stabilize" | "Study";

export type PatternName =
  | "Calibrated Fluency"
  | "Blind Efficiency"
  | "Recovery Maturity"
  | "Friction Loop"
  | "Undertrust Avoidance";

export type Confidence = "Medium" | "High";

export const postureTokens: Record<Posture, { label: string; colorClass: string }> = {
  Scale: { label: "Scale", colorClass: "bg-posture-scale/10 text-posture-scale ring-posture-scale/20" },
  Stabilize: {
    label: "Stabilize",
    colorClass: "bg-posture-stabilize/10 text-posture-stabilize ring-posture-stabilize/20"
  },
  Study: { label: "Study", colorClass: "bg-posture-study/10 text-posture-study ring-posture-study/20" }
};

export const patternTokens: Record<PatternName, { key: string; dotClass: string }> = {
  "Calibrated Fluency": {
    key: "calibrated",
    dotClass: "pattern-dot bg-pattern-calibrated"
  },
  "Blind Efficiency": {
    key: "blind",
    dotClass: "pattern-dot bg-pattern-blind"
  },
  "Recovery Maturity": {
    key: "recovery",
    dotClass: "pattern-dot bg-pattern-recovery"
  },
  "Friction Loop": {
    key: "friction",
    dotClass: "pattern-dot bg-pattern-friction"
  },
  "Undertrust Avoidance": {
    key: "undertrust",
    dotClass: "pattern-dot bg-pattern-undertrust"
  }
};

export const confidenceTokens: Record<Confidence, { label: string; className: string }> = {
  Medium: { label: "Medium confidence", className: "opacity-90 ring-foreground/10" },
  High: { label: "High confidence", className: "opacity-100 ring-foreground/20 font-medium" }
};

export type SectionKey = "overview" | "patterns" | "decisions" | "implications" | "evidence";

export const sectionTintClass: Record<SectionKey, string> = {
  overview: "bg-tint-overview",
  patterns: "bg-tint-patterns",
  decisions: "bg-tint-decisions",
  implications: "bg-tint-implications",
  evidence: "bg-tint-evidence"
};
