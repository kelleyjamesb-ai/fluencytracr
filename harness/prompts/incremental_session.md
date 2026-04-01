# Incremental session (every context window after the first)

You are continuing **long-running work**. Treat each session as a shift handoff: the previous engineer left notes and git history; you have **no memory** of their chat.

**Canonical protocol (read first):** [`docs/agent/SESSION_START.md`](../../docs/agent/SESSION_START.md) — queue + harness + memory + roles.

## Startup checklist

1. Run `pwd` (or equivalent) and confirm you are at the **repository root**.
2. `git log --oneline -20` — understand recent commits.
3. Read `harness/agent-progress.txt` from the bottom up (latest handoff first).
4. Read `harness/feature_list.json` and choose **one** item with `"passes": false` (highest priority / unblocked).
5. Run `./harness/scripts/bootstrap.sh` and fix any immediate breakage before new edits.
6. When your item touches Python under `tests/` or `src/`, run `./harness/scripts/verify.sh` (after `pip install -r requirements.txt` or equivalent). For backend/frontend/shared, follow [`docs/agent/EVALUATION.md`](../../docs/agent/EVALUATION.md).
7. Perform any **minimal smoke** not covered by scripts (e.g. a specific UI path).

## During the session

- Implement **only that one feature** end-to-end.
- Keep the tree in a **mergeable** state: small commits, clear messages.
- **Do not** mark `"passes": true` until you have verified the behavior (tests, manual check, or browser automation as appropriate).

## End of session

1. `git commit` with a descriptive message.
2. Append to `harness/agent-progress.txt`: date (UTC), tool name, what shipped, what was verified, and the **next** feature id to pick up.
3. Do **not** declare the whole project “done” while any checklist item remains `"passes": false`.
