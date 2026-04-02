# Project governance (prescriptive)

## Source-of-truth hierarchy

1. **Signed product contract:** `artifacts/PRD_V1_BEHAVIORAL_OBSERVABILITY.md` (when the change affects product behavior).
2. **Agent execution state:** `.project/WORK_QUEUE.json` + `.project/PROGRESS.md` + `.project/CURRENT_SLICE.md` only.
3. **Verification checklist:** `harness/feature_list.json` — flip `passes` only after mechanical verification (`harness/scripts/verify.sh`, per `docs/agent/EVALUATION.md`).
4. **Workspace rules:** `.antigravity/rules.md`, root `AGENTS.md` / `CLAUDE.md`, Cursor rules.

If two sources conflict, **stop** and record the conflict in `PROGRESS.md` → `Blockers`.

## Active state location

- **`.project/`** is the **only** location for **active** agent session state (`WORK_QUEUE.json`, `PROGRESS.md`, `CURRENT_SLICE.md`).
- **`CURRENT_SLICE.md`** is the authoritative live slice contract for the single bounded unit currently being executed. Define or tighten it before implementation, and update it before expanding scope.
- Do **not** use `harness/agent-progress.txt` as a substitute for `PROGRESS.md` in the same session; optionally **mirror** a one-line summary to harness after completing a queue item if humans rely on harness logs.

## WORK_QUEUE rules

- **Exactly one** item with `"status": "in_progress"` at any time (or zero if idle).
- **Agents must not** add, delete, or merge queue items.
- **Agents may** only change: per-item `status`, and optional `last_note` (string, ≤500 chars).
- **Humans** add/rename/remove items and edit `title` / `bound` / `risk`; humans may edit root **`blueprint_ref`** and the **`schema`** documentation object. If a validator consumes this file, it must allow those root keys (see `schema.document` in the JSON).
- Tasks must be **small and bounded** (explicit paths or acceptance criteria in `title` / `bound`).

## Session memory

- Long-term intent lives in **queue + current slice contract + PROGRESS + git commits**.
- Do **not** rely on chat history for scope; **re-read** the four startup files each session.

## Artifacts

- Outputs required by workspace rules (e.g. `artifacts/` when `.cursorrules` applies) go **only** where those rules say.
- Do **not** create parallel **live** queue state under `docs/` or `artifacts/` (no second `WORK_QUEUE`, `PROGRESS`, or live slice contract substitute). **Meta** docs in `artifacts/` (e.g. how governance was wired) are fine—they document process; **authoritative** session state remains under `.project/`.

## Anti-drift

- **No** drive-by refactors, **no** new subsystems, **no** duplicate config trees.
- **No** “while we’re here” changes outside the **bound** for the current queue item.

## Blocker discipline

- If blocked: update `PROGRESS.md` → `Blockers`, revert item to `pending` if work cannot continue, **stop**.
- Do **not** invent workarounds that violate PRD, OpenSpec, or security rules.
