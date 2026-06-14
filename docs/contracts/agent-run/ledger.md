# Agent-Run Ledger

## Purpose

The agent-run ledger is the planned durable record for FluencyTracr development-harness runs. It records bounded agent work, tool governance, delegation, verification, and handoff evidence across providers without turning provider traces into customer product telemetry.

This is a contract framing document. It does not add storage, routes, schemas, product behavior, canonical events, or suppression reasons.

## Contract Status

Status: local schema and writer implemented; durable backend persistence and replay APIs are future work.

The current machine-validated contract remains `AR_2026_05` in:

- `shared/src/agentRunSchemas.ts`
- `schemas/agent_run/agent_run_event.schema.json`
- `docs/contracts/agent-run/README.md`

The local ledger entry contract is implemented in:

- `shared/src/agentRunSchemas.ts`
- `schemas/agent_run/agent_run_ledger_entry.schema.json`
- `scripts/agentic_harness_ledger.mjs`
- `scripts/agentic_harness_replay.mjs`

Future backend persistence must update those files and tests in the same PR.

## Source Events

The ledger is built from provider-neutral agent-run events:

- `AR.RUN.STARTED.V1`
- `AR.TOOL.CALL_RECORDED.V1`
- `AR.DELEGATION.RECORDED.V1`
- `AR.ERROR.RECORDED.V1`
- `AR.CHECKPOINT.RECORDED.V1`
- `AR.RUN.COMPLETED.V1`

These are development-harness events only. They are not FluencyTracr customer canonical events.

## Ledger Entry Shape

A future ledger entry should contain only metadata and references:

```json
{
  "schema_version": "AR_LEDGER_2026_05",
  "repo_id": "fluencytracr",
  "run_id": "run-2026-05-23-001",
  "provider": "CODEX",
  "harness_surface": "CODEX_CLI",
  "branch_name": "codex/agentic-harness-foundation",
  "scope_ref": "docs/concepts/AGENTIC_EXECUTION_HARNESS.md",
  "status": "COMPLETED",
  "event_batch_ref": "artifacts/harness/checkpoints/run-2026-05-23-001.json",
  "verification_refs": [
    "scripts/ci_docs_contract_sweep.sh",
    "python3 scripts/ci_v1_governance_gates.py"
  ],
  "handoff_ref": "harness/agent-progress.txt",
  "pr_ref": "pending",
  "required_caveats": [
    "Development-harness telemetry only.",
    "No raw prompt, raw response, file content, diff, secret, or direct identifier is stored."
  ]
}
```

## Allowed Metadata

- Repo, branch, commit, PR, and check references.
- Provider and harness surface.
- Permission mode.
- Tool name, status, duration, and coarse error class.
- Delegation target role.
- Verification command names and result references.
- Handoff file references.

## Forbidden Payloads

The ledger must not store:

- raw prompts or responses
- raw file content
- diffs or patches
- secrets
- emails or direct person identifiers
- person-level work metrics
- customer product telemetry
- customer raw GCE rows
- customer value evidence payloads

## Tool Governance

Ledger implementation must record enough metadata to evaluate tool discipline:

- Was the tool call inside the run scope?
- Was an approval required?
- Was an approval granted, rejected, or unavailable?
- Did the tool produce a usable result?
- Which verification followed the tool-mediated change?

Tool governance should be enforced by provider adapters before execution where possible and checked again through ledger validation.

## Relationship to Provider Traces

Provider traces are useful debugging material, but they are not automatically ledger entries. Before any trace is stored or exported, it must be reduced to the allowed metadata shape above.

Provider trace systems may capture more detail than this repo allows. The FluencyTracr ledger contract is the stricter boundary.

## Relationship to Repo Memory

The ledger does not replace:

- `.project/WORK_QUEUE.json`
- `.project/PROGRESS.md`
- `harness/feature_list.json`
- `harness/agent-progress.txt`
- git commits

It records execution evidence that points back to those canonical files.

## Non-Capabilities

The ledger does not:

- evaluate employee capability
- compare teams
- produce customer-facing value claims
- ingest customer product telemetry
- bypass repo review or verification
- replace human-owned scope decisions

## Future Work

Future implementation should add:

- a redaction test for provider trace adapters
- documentation for retention and export boundaries
- backend persistence, if needed, behind the same metadata-only schema
