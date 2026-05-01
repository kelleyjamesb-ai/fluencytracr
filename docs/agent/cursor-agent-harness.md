# Cursor agent harness

Cursor is an optional authoring harness for FluencyTracr. The repo source of truth remains the vendor-neutral harness under `harness/` and the session protocol in `docs/agent/SESSION_START.md`.

## What Cursor should use

- Project rules: `.cursor/rules/`
- Session protocol: `docs/agent/SESSION_START.md`
- Harness checklist: `harness/feature_list.json`
- Handoff log: `harness/agent-progress.txt`
- Verification guide: `docs/agent/EVALUATION.md`
- Agent-run contract: `docs/contracts/agent-run/README.md`

## Rules

The Cursor rules layer does three jobs:

1. `fluencytracr-session.mdc` starts every Cursor session from the repo protocol.
2. `harness-slice.mdc` keeps work to one bounded, verified slice.
3. `provider-boundary.mdc` keeps Cursor and OpenAI tooling as development accelerators, not product runtime dependencies.

## Relationship to OpenAI Agents SDK

The OpenAI Agents SDK sidecar in `integrations/openai-agents/` is useful for code-first orchestration and specialist delegation. Cursor is useful for repo-native authoring, project rules, and editor/CLI workflows. Both should emit or map to the same provider-neutral agent-run contract if we add runtime capture later.

## Agent-run event contract

Use `AR_2026_05` for normalized development-harness events across Cursor, OpenAI Agents SDK, Codex, Claude Code, or another provider.

Do not collect raw prompts, raw responses, file content, diffs, emails, direct person identifiers, or individual performance judgments.

## Verification

After changing Cursor rules or the agent-run contract:

```bash
npm test --workspace backend -- --runTestsByPath tests/agent_run_schema.test.ts
npm run build --workspace shared
bash scripts/ci_docs_contract_sweep.sh
bash scripts/ci_linkcheck_fluency_docs.sh
```
