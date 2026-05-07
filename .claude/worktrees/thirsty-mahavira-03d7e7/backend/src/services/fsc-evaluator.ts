/**
 * Full State Coverage (FSC) — hard eligibility gate; all checks must pass.
 */

export interface FscEvaluationInput {
  readonly start_event_present: boolean;
  readonly terminal_or_abandonment_present: boolean;
  readonly valid_timestamp_ratio: number;
  readonly ordering_reconstructable: boolean;
  readonly trace_count: number;
  /**
   * When no retry sequences exist, callers must set `true`.
   * When retries exist, must be `true` only if failure→subsequent links are valid.
   */
  readonly retry_sequences_linkable: boolean;
  readonly error_occurred: boolean;
  readonly error_event_present: boolean;
}

export interface FscEvaluationResult {
  readonly eligible: boolean;
  readonly failed_checks: readonly string[];
  readonly checks: {
    readonly boundary_integrity: boolean;
    readonly temporal_integrity: boolean;
    readonly trace_integrity: boolean;
    readonly error_visibility: boolean;
  };
}

const TIMESTAMP_FLOOR = 0.95;

export function evaluateFsc(input: FscEvaluationInput): FscEvaluationResult {
  const boundary_integrity =
    input.start_event_present && input.terminal_or_abandonment_present;

  const temporal_integrity =
    input.valid_timestamp_ratio >= TIMESTAMP_FLOOR && input.ordering_reconstructable;

  const trace_integrity = input.trace_count >= 1 && input.retry_sequences_linkable;

  const error_visibility = !input.error_occurred || input.error_event_present;

  const failed: string[] = [];
  if (!boundary_integrity) {
    failed.push("boundary_integrity");
  }
  if (!temporal_integrity) {
    failed.push("temporal_integrity");
  }
  if (!trace_integrity) {
    failed.push("trace_integrity");
  }
  if (!error_visibility) {
    failed.push("error_visibility");
  }

  return {
    eligible: failed.length === 0,
    failed_checks: failed,
    checks: {
      boundary_integrity,
      temporal_integrity,
      trace_integrity,
      error_visibility
    }
  };
}
