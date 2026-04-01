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

## Long-running agent harness (Codex, Claude, Cursor)

For multi-session work, follow the portable harness under [`harness/README.md`](harness/README.md). Use [`harness/prompts/initializer.md`](harness/prompts/initializer.md) for the first session and [`harness/prompts/incremental_session.md`](harness/prompts/incremental_session.md) for every later session. Checklist: [`harness/feature_list.json`](harness/feature_list.json); handoff log: [`harness/agent-progress.txt`](harness/agent-progress.txt).