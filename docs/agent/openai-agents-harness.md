# OpenAI Agents SDK harness

This repo has a vendor-neutral long-running harness under `harness/`. The OpenAI Agents SDK package is an optional development sidecar for working against that harness with code-first agents, tools, and specialist delegation.

This page is an adapter note. The canonical architecture spine is `docs/concepts/AGENTIC_EXECUTION_HARNESS.md`; do not copy that document's source map or governance rules here.

## Why it exists

- Use OpenAI Agents SDK orchestration for local development assistance when a manager agent should read repo harness docs, inspect checklist state, and call bounded specialists.
- Keep the product runtime independent of OpenAI-specific tooling.
- Preserve the repo source of truth: `docs/agent/SESSION_START.md`, `harness/README.md`, `harness/feature_list.json`, and `harness/agent-progress.txt`.
- Map future run capture to `docs/contracts/agent-run/README.md` and `docs/contracts/agent-run/ledger.md` instead of inventing a sidecar-specific ledger.

Official docs used for this sidecar:

- OpenAI Agents SDK install guidance: <https://developers.openai.com/api/docs/libraries#install-the-agents-sdk>
- Agents SDK quickstart: <https://developers.openai.com/api/docs/guides/agents/quickstart>
- Orchestration patterns: <https://developers.openai.com/api/docs/guides/agents/orchestration>
- Tool usage in the Agents SDK: <https://developers.openai.com/api/docs/guides/tools#usage-in-the-agents-sdk>

## Location

- Package: `integrations/openai-agents/`
- Root dev command: `npm run agent:dev -- "Summarize current harness state and next slice"`
- Root validation command: `npm run validate:agents`

## Environment

```bash
export OPENAI_API_KEY=sk-...
export OPENAI_AGENT_MODEL=gpt-5.5
```

`OPENAI_AGENT_MODEL` is optional. The default follows the current OpenAI quickstart example.

## Boundary

This sidecar may read allowlisted harness documents and recommend bounded development slices. It must not replace:

- The repo harness protocol
- OpenSpec approval gates
- Mechanical verification in `docs/agent/EVALUATION.md`
- Human-owned queue structure in `.project/WORK_QUEUE.json`

## GitHub readiness

Before publishing changes that touch this sidecar:

1. Run `npm install` after dependency changes.
2. Run `npm run validate:agents`.
3. Run the broader checks from `docs/agent/EVALUATION.md` if backend, frontend, shared, or governance-sensitive paths changed.
4. Stage only the sidecar, docs, lockfile, and CI files for the intended slice.
