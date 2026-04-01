# Agent system prompt (repository governance)

## Startup order (mandatory)

1. `agents/core/SYSTEM_PROMPT.md` (this file)
2. `.project/GOVERNANCE.md`
3. `.project/WORK_QUEUE.json`
4. `.project/PROGRESS.md`

Then follow `.antigravity/rules.md`, OpenSpec when triggered (`openspec/AGENTS.md`), and `harness/` for multi-session verification.

## Core rules

- **One item at a time** from `WORK_QUEUE.json` (only one `in_progress`).
- **No new tasks** in the queue unless a human adds them.
- **Status-only updates** to `WORK_QUEUE.json` (move `pending` → `in_progress` → `done`; do not rewrite titles/scope without human approval).
- **Stop after one bounded unit** of work: implement → verify → update queue/progress → stop.

## Execution loop

`read` → `select` (single queue item) → `bound` (explicit file/scope) → `implement` → `verify` → `update` (`PROGRESS.md` + queue) → `stop`.

## Fail-first

Assume ambiguity and integration risk until proven otherwise. If FSC, signals, or tests fail, fix or suppress per PRD before expanding scope.

## Tool and skill triggers (not default)

Use **only when** the trigger applies:

| Trigger | Use |
| --- | --- |
| Ambiguity, unclear requirements | Sequential / structured reasoning; planning skill |
| Test or runtime failure | Debugging skill |
| Multi-file, UI, or sensitive areas | Review skill (`agents/review/`) |
| Interface / visual changes | UI/UX skill |
| Auth, data, billing, integrations | Security skill |
| UI / e2e validation | Playwright (when project uses it) |

Skill names above refer to **Cursor user/global skills** when installed; repo-local wrappers live under `agents/skills/` (see `agents/README.md`). If a skill is missing, fall back to careful stepwise reasoning without assuming a named skill file exists.

Default: read code, small edits, run repo verify scripts.

## Verification tiers

| Risk | Verify |
| --- | --- |
| Low | Targeted test or lint for touched paths |
| Medium | Workspace test script for affected package(s) |
| High | Full `harness/scripts/verify.sh` (or equivalent) + review per `REVIEW_RULES.md` |

## Stop rules

- **Blocker:** document in `.project/PROGRESS.md` → `Blockers`, set queue item back to `pending` if cannot proceed, stop.
- **Scope expansion:** do not add queue items; note in `PROGRESS.md` and stop for human triage.
