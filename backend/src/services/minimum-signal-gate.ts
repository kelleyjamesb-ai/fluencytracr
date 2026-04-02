/**
 * Minimum signal set — classification allowed only with execution boundary plus at least one channel.
 */

export interface MinimumSignalGateInput {
  readonly execution_boundary_present: boolean;
  readonly retry_visibility: boolean;
  readonly step_logs_present: boolean;
  readonly error_visibility: boolean;
}

export interface MinimumSignalGateResult {
  readonly allowed: boolean;
  readonly failed_checks: readonly string[];
}

export function evaluateMinimumSignalGate(
  input: MinimumSignalGateInput
): MinimumSignalGateResult {
  const failed: string[] = [];

  if (!input.execution_boundary_present) {
    failed.push("execution_boundary");
  }

  const secondary =
    input.retry_visibility || input.step_logs_present || input.error_visibility;
  if (!secondary) {
    failed.push("minimum_signal_channel");
  }

  return {
    allowed: failed.length === 0,
    failed_checks: failed
  };
}
