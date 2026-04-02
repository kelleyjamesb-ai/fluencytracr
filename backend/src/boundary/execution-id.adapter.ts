/**
 * Resolves upstream execution-related identifiers into a single correlation key for canonical events.
 * Composite IDs are opt-in only (fail-closed by default).
 */

export type IdentityBasis =
  | "execution_id"
  | "workflow_run_id"
  | "run_id"
  | "composite"
  | "unresolved";

export type ExecutionIdentitySource = Readonly<{
  execution_id?: string | undefined;
  workflow_run_id?: string | undefined;
  run_id?: string | undefined;
  chat_id?: string | undefined;
  agent_run_id?: string | undefined;
  workflow_id?: string | undefined;
  /** When true, may synthesize `${workflow_id}::${chat_id}` or `${workflow_id}::${agent_run_id}`. */
  allow_composite_fallback?: boolean | undefined;
}>;

export type ExecutionIdentityResolution =
  | {
      readonly ok: true;
      readonly execution_id: string;
      readonly identity_basis: IdentityBasis;
      readonly source_ids: Readonly<Record<string, string>>;
    }
  | {
      readonly ok: false;
      readonly identity_basis: "unresolved";
      readonly source_ids: Readonly<Record<string, string>>;
      readonly reason: string;
    };

function trimNonEmpty(v: string | undefined): string | undefined {
  if (typeof v !== "string") {
    return undefined;
  }
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

function collectSourceIds(source: ExecutionIdentitySource): Record<string, string> {
  const out: Record<string, string> = {};
  const put = (k: keyof ExecutionIdentitySource, v: string | undefined) => {
    if (k === "allow_composite_fallback") {
      return;
    }
    const x = trimNonEmpty(v);
    if (x !== undefined) {
      out[k as string] = x;
    }
  };
  put("execution_id", source.execution_id);
  put("workflow_run_id", source.workflow_run_id);
  put("run_id", source.run_id);
  put("chat_id", source.chat_id);
  put("agent_run_id", source.agent_run_id);
  put("workflow_id", source.workflow_id);
  return out;
}

/**
 * Priority: execution_id → workflow_run_id → run_id → (optional) composite → unresolved.
 * `chat_id` / `agent_run_id` participate only inside composite with `workflow_id`.
 */
export function resolveExecutionIdentity(source: ExecutionIdentitySource): ExecutionIdentityResolution {
  const source_ids = collectSourceIds(source);
  const ex = trimNonEmpty(source.execution_id);
  if (ex !== undefined) {
    return {
      ok: true,
      execution_id: ex,
      identity_basis: "execution_id",
      source_ids
    };
  }
  const wfRun = trimNonEmpty(source.workflow_run_id);
  if (wfRun !== undefined) {
    return {
      ok: true,
      execution_id: wfRun,
      identity_basis: "workflow_run_id",
      source_ids
    };
  }
  const run = trimNonEmpty(source.run_id);
  if (run !== undefined) {
    return {
      ok: true,
      execution_id: run,
      identity_basis: "run_id",
      source_ids
    };
  }

  if (source.allow_composite_fallback === true) {
    const wf = trimNonEmpty(source.workflow_id);
    const c = trimNonEmpty(source.chat_id);
    const a = trimNonEmpty(source.agent_run_id);
    if (wf !== undefined && c !== undefined) {
      return {
        ok: true,
        execution_id: `${wf}::${c}`,
        identity_basis: "composite",
        source_ids
      };
    }
    if (wf !== undefined && a !== undefined) {
      return {
        ok: true,
        execution_id: `${wf}::${a}`,
        identity_basis: "composite",
        source_ids
      };
    }
  }

  return {
    ok: false,
    identity_basis: "unresolved",
    source_ids,
    reason: "missing_execution_identity"
  };
}
