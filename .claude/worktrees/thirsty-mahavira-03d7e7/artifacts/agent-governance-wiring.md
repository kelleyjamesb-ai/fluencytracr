# Agent governance wiring (completed)

**Date:** 2026-03-31

## What was added

| Path | Role |
| --- | --- |
| `agents/core/SYSTEM_PROMPT.md` | Startup order, execution loop, verification tiers, stop rules |
| `.project/GOVERNANCE.md` | Prescriptive rules; `.project` as active queue state; harness relationship |
| `.project/WORK_QUEUE.json` | Bounded items; exactly one `in_progress` |
| `.project/PROGRESS.md` | Last completed, current status, blockers, next step |
| `agents/review/REVIEW_RULES.md` | When review is required |
| `agents/review/ROUTING_RULES.json` | Reviewer routing hints |
| `agents/README.md` | Hub; distinguishes this tree from `src/agents/` |
| `agents/skills/README.md` | Placeholder for project-local skills |

## Entry points updated

- `CLAUDE.md`: START HERE chain before `.antigravity/rules.md`
- `AGENTS.md`: Agent execution section + repo map row for `.project/*`

## Relation to harness

- **Queue** (`.project/WORK_QUEUE.json`) = *what to do next* in bounded items.
- **Harness** (`harness/feature_list.json`, `verify.sh`) = *mechanical verification checklist*; flip `passes` only after verified per `docs/agent/EVALUATION.md`.

Humans may adjust queue item titles/status; agents may only change per-item `status` and optional `last_note` per `GOVERNANCE.md`. Humans maintain root `blueprint_ref` and `schema` docs in `WORK_QUEUE.json`.

**Not queue state:** this file is a **changelog / map** of governance wiring. It does not replace `.project/PROGRESS.md` for session status.

## Queue (phased, blueprint §17)

`WORK_QUEUE.json` lists **seven** items: `phase-01-schemas-ingest` … `phase-07-hardening-verify`, with `blueprint_ref` → `artifacts/FLUENCYTRACR_V1_IMPLEMENTATION_BLUEPRINT.md` §17.

- **`phase-03-fsc-min-signal`** is the usual **in_progress** focus (FSC + min signal before classify).
- **`phase-07-hardening-verify`** replaces the old standalone harness-verify item (verify + governance regression).
