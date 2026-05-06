# Agents (governance)

This folder holds **instructions and review routing** for AI/human agents working the repo—not the Python agents under `src/agents/`.

- **Start here:** `agents/core/SYSTEM_PROMPT.md`
- **Rules:** `agents/review/REVIEW_RULES.md`, `agents/review/ROUTING_RULES.json`
- **Optional project skills:** `agents/skills/` (add thin wrappers only; do not duplicate Cursor global skills)
- **Execution state:** `.project/WORK_QUEUE.json`, `.project/PROGRESS.md` (see `.project/GOVERNANCE.md`)

Do not duplicate long policy text from `GOVERNANCE.md` or `SYSTEM_PROMPT.md` in other files.
