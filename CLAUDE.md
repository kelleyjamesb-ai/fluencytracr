## Every coding session (mandatory)

**Read [`docs/agent/SESSION_START.md`](docs/agent/SESSION_START.md) first** — start protocol, memory, and roles for long-running work (queue + harness).

<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# 🤖 Claude Code Entry Point

**Canonical every-session protocol:** [`docs/agent/SESSION_START.md`](docs/agent/SESSION_START.md).

**Queue track (when executing the backlog):** `agents/core/SYSTEM_PROMPT.md` → `.project/GOVERNANCE.md` → `.project/WORK_QUEUE.json` → `.project/PROGRESS.md`.

Before implementation, define or tighten the live slice contract in `.project/CURRENT_SLICE.md`. Treat it as the handoff artifact for context resets and do not work outside that declared scope unless you update the contract first.

**Then read and follow:** `.antigravity/rules.md`

## Long-running agent harness (shared with Codex)

For work that spans multiple context windows, use [`harness/README.md`](harness/README.md). First session: [`harness/prompts/initializer.md`](harness/prompts/initializer.md). Later sessions: [`harness/prompts/incremental_session.md`](harness/prompts/incremental_session.md). State: [`harness/feature_list.json`](harness/feature_list.json), [`harness/agent-progress.txt`](harness/agent-progress.txt).

**Navigation + evaluation:** [`docs/agent/README.md`](docs/agent/README.md) and [`docs/agent/EVALUATION.md`](docs/agent/EVALUATION.md). **Local workspace is source of truth** until pushed—same as [`AGENTS.md`](AGENTS.md).
