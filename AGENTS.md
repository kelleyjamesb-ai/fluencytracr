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

## Local workspace vs GitHub

Treat **files in this Cursor workspace as source of truth** until you commit and push. Do not assume the remote default branch matches uncommitted local state.

## Repo map (start here)

| Area | Path |
| --- | --- |
| **Agent navigation hub** (maps, contracts, evaluation) | [`docs/agent/README.md`](docs/agent/README.md) |
| **Long-running harness** (sessions, checklist, handoff) | [`harness/README.md`](harness/README.md) |
| **OpenSpec** (proposals, specs, validate) | [`openspec/AGENTS.md`](openspec/AGENTS.md) |
| **Architecture** | [`docs/ARCHITECTURE_MAP.md`](docs/ARCHITECTURE_MAP.md) |
| **CI truth** | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |

## Long-running agent harness (Codex, Claude, Cursor)

For multi-session work, follow [`harness/README.md`](harness/README.md). First session: [`harness/prompts/initializer.md`](harness/prompts/initializer.md). Later sessions: [`harness/prompts/incremental_session.md`](harness/prompts/incremental_session.md). Checklist: [`harness/feature_list.json`](harness/feature_list.json); handoff log: [`harness/agent-progress.txt`](harness/agent-progress.txt). After substantive edits, run checks in [`docs/agent/EVALUATION.md`](docs/agent/EVALUATION.md) (includes `./harness/scripts/verify.sh`).