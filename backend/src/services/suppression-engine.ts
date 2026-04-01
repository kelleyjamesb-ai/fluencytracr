/**
 * PRD §21-style suppression hierarchy — first failing rule wins; fail-closed.
 */

export type SuppressionReason =
  | "INCOMPLETE_EXECUTION"
  | "INSUFFICIENT_SIGNAL"
  | "AMBIGUITY";

export interface SuppressionEngineInput {
  readonly fsc_eligible: boolean;
  readonly minimum_signal_allowed: boolean;
  readonly classification_possible: boolean;
  readonly classification_reason?: string;
}

export interface SuppressionDecision {
  readonly status: "ALLOWED" | "SUPPRESSED";
  readonly reason?: SuppressionReason;
  readonly diagnostics: ReadonlyArray<string>;
}

export function evaluateSuppression(
  input: SuppressionEngineInput
): SuppressionDecision {
  if (!input.fsc_eligible) {
    return {
      status: "SUPPRESSED",
      reason: "INCOMPLETE_EXECUTION",
      diagnostics: Object.freeze(["fsc_eligible_false"])
    };
  }
  if (!input.minimum_signal_allowed) {
    return {
      status: "SUPPRESSED",
      reason: "INSUFFICIENT_SIGNAL",
      diagnostics: Object.freeze(["minimum_signal_not_allowed"])
    };
  }
  if (!input.classification_possible) {
    const d = input.classification_reason
      ? (`classification_blocked:${input.classification_reason}` as const)
      : "classification_not_possible";
    return {
      status: "SUPPRESSED",
      reason: "AMBIGUITY",
      diagnostics: Object.freeze([d])
    };
  }
  return {
    status: "ALLOWED",
    diagnostics: Object.freeze(["all_gates_passed"])
  };
}
