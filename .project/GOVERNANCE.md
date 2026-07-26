# Project governance (prescriptive)

## Source-of-truth hierarchy

1. **Signed product contract:** `artifacts/PRD_V1_BEHAVIORAL_OBSERVABILITY.md` (when the change affects product behavior).
2. **Agent execution state:** `.project/WORK_QUEUE.json` + `.project/PROGRESS.md` only.
3. **Verification checklist:** `harness/feature_list.json` — flip `passes` only after mechanical verification (`harness/scripts/verify.sh`, per `docs/agent/EVALUATION.md`).
4. **Workspace rules:** `.antigravity/rules.md`, root `AGENTS.md` / `CLAUDE.md`, Cursor rules.

If two sources conflict, **stop** and record the conflict in `PROGRESS.md` → `Blockers`.

## Active state location

- **`.project/`** is the **only** location for **active** agent session state (`WORK_QUEUE.json`, `PROGRESS.md`).
- Do **not** use `harness/agent-progress.txt` as a substitute for `PROGRESS.md` in the same session; optionally **mirror** a one-line summary to harness after completing a queue item if humans rely on harness logs.

## WORK_QUEUE rules

- **Exactly one** item with `"status": "in_progress"` at any time (or zero if idle).
- **Agents must not** add, delete, or merge queue items.
- **Agents may** only change: per-item `status`, and optional `last_note` (string, ≤500 chars).
- **Humans** add/rename/remove items and edit `title` / `bound` / `risk`; humans may edit root **`blueprint_ref`** and the **`schema`** documentation object. If a validator consumes this file, it must allow those root keys (see `schema.document` in the JSON).
- Tasks must be **small and bounded** (explicit paths or acceptance criteria in `title` / `bound`).

## Canonical runtime readiness-first gate

Every human-authorized, `risk: high` canonical-runtime qualification item beginning with Section 7.5 must follow [`docs/agent/CANONICAL_RUNTIME_PHASE_READINESS.md`](../docs/agent/CANONICAL_RUNTIME_PHASE_READINESS.md) before system-under-test implementation. A filled packet is queue-bound reference evidence, never a second active-state source. Its phase-specific mechanical evidence and exact packet must receive CODE/BUG/ADVERSARIAL design review; generic structural validation alone cannot declare readiness. `READINESS_GO` has `authority_effect: NONE` and grants no queue creation, implementation, GCP, credential, signing, deployment, qualification, persistence, model-execution, commit, push, PR, or merge authority.

After one implementation remediation batch, any material blocker in the replacement exact-tree panel requires `STOP_REARCHITECT`; return the item to pending/HOLD, record the blocker in `PROGRESS.md`, and do not start another repair loop under the same packet. Time or cost ceilings never weaken evidence or review gates.

## Session memory

- Long-term intent lives in **queue + PROGRESS + git commits**.
- Do **not** rely on chat history for scope; **re-read** the four startup files each session.

## Artifacts

- Outputs required by workspace rules (e.g. `artifacts/` when `.cursorrules` applies) go **only** where those rules say.
- Do **not** create parallel **live** queue state under `docs/` or `artifacts/` (no second `WORK_QUEUE` or `PROGRESS` substitute). **Meta** docs in `artifacts/` (e.g. how governance was wired) are fine—they document process; **authoritative** session state remains `.project/WORK_QUEUE.json` and `.project/PROGRESS.md`.

## Anti-drift

- **No** drive-by refactors, **no** new subsystems, **no** duplicate config trees.
- **No** “while we’re here” changes outside the **bound** for the current queue item.

## Blocker discipline

- If blocked: update `PROGRESS.md` → `Blockers`, revert item to `pending` if work cannot continue, **stop**.
- Do **not** invent workarounds that violate PRD, OpenSpec, or security rules.
