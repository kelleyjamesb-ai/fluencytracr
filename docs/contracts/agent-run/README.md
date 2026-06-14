# Agent Run Event Contract

`AR_2026_05` is a provider-neutral event contract for development-harness observability. It can represent Cursor Agent, OpenAI Agents SDK, Codex, Claude Code, or another coding harness without making any one provider the product runtime.

## Purpose

- Normalize agent session, tool, delegation, result, error, and checkpoint events.
- Compare harness behavior across providers without raw prompt or response capture.
- Support future evaluation of tool reliability, verification discipline, and handoff quality.

For the broader execution architecture, see `docs/concepts/AGENTIC_EXECUTION_HARNESS.md`. For future durable run storage semantics, see `docs/contracts/agent-run/ledger.md`.

## Boundaries

Agent-run events are for development-harness telemetry. They are not FluencyTracr customer product events and must not include:

- raw prompts or responses
- raw file content
- diffs or patches
- emails or direct person identifiers
- individual performance judgments

## Source of Truth

- Zod schema: `shared/src/agentRunSchemas.ts`
- JSON Schema: `schemas/agent_run/agent_run_event.schema.json`
- Ledger JSON Schema: `schemas/agent_run/agent_run_ledger_entry.schema.json`
- Cursor project rules: `.cursor/rules/`

## Event Shape

Required fields:

- `schema_version`: `AR_2026_05`
- `event_id`: UUID
- `event_name`: namespaced event name such as `AR.RUN.STARTED.V1`
- `provider`: `CURSOR`, `OPENAI_AGENTS`, `CODEX`, `CLAUDE`, or `OTHER`
- `harness_surface`: concrete runtime surface
- `event_kind`: normalized event kind
- `event_timestamp`
- `repo_id`
- `session_id`
- `run_id`
- `payload`

Optional fields include `branch_name`, `parent_run_id`, `model`, `permission_mode`, `tool_call_id`, `tool_name`, `tool_status`, and `duration_ms`.

## Recommended Events

- `AR.RUN.STARTED.V1`
- `AR.TOOL.CALL_RECORDED.V1`
- `AR.DELEGATION.RECORDED.V1`
- `AR.ERROR.RECORDED.V1`
- `AR.RUN.COMPLETED.V1`
- `AR.CHECKPOINT.RECORDED.V1`

## Ledger Boundary

The ledger is a metadata-and-reference store for these events. The current implementation is a local writer under `scripts/agentic_harness_ledger.mjs` backed by `AgentRunLedgerEntrySchema`; durable backend persistence and replay APIs remain future work.

The ledger must not store provider traces directly unless they have been reduced to the allowed metadata shape. It does not replace `.project/`, `harness/`, or git history.
