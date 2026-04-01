# Agent navigation hub

**Local workspace files are the source of truth** until you commit and push. Prefer reading paths here over assuming GitHub’s default branch matches disk.

## Where durable knowledge lives

| Need | Location |
| --- | --- |
| Multi-session coding loop, checklist, handoff log | [`harness/README.md`](../../harness/README.md), [`harness/feature_list.json`](../../harness/feature_list.json), [`harness/agent-progress.txt`](../../harness/agent-progress.txt) |
| Spec-driven proposals and capabilities | [`openspec/AGENTS.md`](../../openspec/AGENTS.md), [`openspec/specs/`](../../openspec/specs/), [`openspec/changes/`](../../openspec/changes/) |
| Product architecture and APIs | [`docs/ARCHITECTURE_MAP.md`](../ARCHITECTURE_MAP.md), [`README.md`](../../README.md) canonical doc list |
| Scope and privacy guardrails | [`SCOPE_GUARDRAILS.md`](../../SCOPE_GUARDRAILS.md) |
| Contracts / events | [`FluencyTracr_V1_Event_Contract.md`](../../FluencyTracr_V1_Event_Contract.md), [`docs/contracts/`](../contracts/) |

## Task shape and verification

- **Definition of done for a chunk of work:** [`TASK_CONTRACT.md`](TASK_CONTRACT.md)
- **What to run to separate “built it” from “it works”:** [`EVALUATION.md`](EVALUATION.md)

## Root entrypoints for tools

- **Cursor / generic:** [`AGENTS.md`](../../AGENTS.md)
- **Claude Code:** [`CLAUDE.md`](../../CLAUDE.md) (also `.antigravity/rules.md` when using Antigravity)
