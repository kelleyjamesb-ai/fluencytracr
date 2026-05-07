/**
 * Deterministic execution boundary for PRD Phase 1 (normalization layer).
 * Prefer platform run_id, then workflow_run_id, else one execution per ingested event.
 */
export function resolveFluencyExecutionId(
  workflowId: string,
  keys: { run_id?: string | undefined; workflow_run_id?: string | undefined; event_id: string }
): string {
  if (keys.run_id && keys.run_id.length > 0) {
    return `exec:${workflowId}:run:${keys.run_id}`;
  }
  if (keys.workflow_run_id && keys.workflow_run_id.length > 0) {
    return `exec:${workflowId}:wfrun:${keys.workflow_run_id}`;
  }
  return `exec:${workflowId}:singleton:${keys.event_id}`;
}
