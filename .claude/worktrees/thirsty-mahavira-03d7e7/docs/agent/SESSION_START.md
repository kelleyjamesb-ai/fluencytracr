# Every session — start here (long-running agent protocol)

This repository uses an **Anthropic-style harness** (external memory, mechanical verification, small increments) **plus** explicit **queue governance** under `.project/`. Follow this page **at the beginning of every coding session** so long-form work does not drift.

**Assume the model has no memory of prior chats.** Scope, status, and handoffs live **only** in the files below.

---

## 1. Confirm workspace

- Run `pwd` (or equivalent) and confirm you are at the **repository root**.
- **Disk is source of truth** until `git push`; do not assume the remote matches uncommitted work.

---

## 2. Git snapshot (recent history)

- `git log --oneline -20` — what shipped recently, which branch you are on.

---

## 3. Pick your execution track (then follow it)

You may use **one or both** tracks; they answer different questions.

### Track A — **Queue** (bounded tasks, human-owned backlog)

Use when `.project/WORK_QUEUE.json` has items you are meant to execute, or the human said “work the queue.”

**Read in this order (mandatory for queue work):**

1. [`agents/core/SYSTEM_PROMPT.md`](../../agents/core/SYSTEM_PROMPT.md)
2. [`.project/GOVERNANCE.md`](../../.project/GOVERNANCE.md)
3. [`.project/WORK_QUEUE.json`](../../.project/WORK_QUEUE.json)
4. [`.project/PROGRESS.md`](../../.project/PROGRESS.md)

**Rules (summary):** exactly **one** queue item `in_progress` at a time; agents change **status** (and optional `last_note`) only — **humans** add/remove/rename tasks. **Stop after one bounded unit:** implement → verify → update `PROGRESS.md` + queue → commit.

### Track B — **Harness** (checklist, verification, multi-session handoff)

Use for checklist-driven work, repo-wide verification gates, or when the human points you at `harness/`.

**Read:**

- [`harness/README.md`](../../harness/README.md) (design + links to Anthropic harness article)
- [`harness/agent-progress.txt`](../../harness/agent-progress.txt) — **latest block at bottom first** (handoff from last session)
- [`harness/feature_list.json`](../../harness/feature_list.json) — items with `"passes": false` are candidates for the **next** verified chunk

**Session flavor:**

- **First** harness-focused session on a thread of work: [`harness/prompts/initializer.md`](../../harness/prompts/initializer.md)
- **Every later** harness-focused session: [`harness/prompts/incremental_session.md`](../../harness/prompts/incremental_session.md)

**Rules (summary):** implement **one** checklist item (or one clear slice), **verify mechanically**, only then set `"passes": true`; append a short entry to `harness/agent-progress.txt` at end of session.

### Using **both** together (recommended mental model)

- **`.project/`** = authoritative **what we are doing now** (queue + narrative + blockers).
- **`harness/`** = authoritative **verified completion** of cross-cutting capabilities (`feature_list.json`) + **optional** human-readable handoff log (`agent-progress.txt`).
- Per [`.project/GOVERNANCE.md`](../../.project/GOVERNANCE.md): during queue work, **do not** treat `harness/agent-progress.txt` as a replacement for `PROGRESS.md`. You may **append a one-line mirror** to `agent-progress.txt` after a milestone if humans read the harness log — but **`PROGRESS.md` stays the session source of truth** for queue-driven work.

---

## 4. Memory — create, retain, and retrieve

| Kind | Location | Who updates | What to record |
| --- | --- | --- | --- |
| **Task backlog + status** | `.project/WORK_QUEUE.json` | Humans structure; agents **status only** | `pending` / `in_progress` / `done`, short `last_note` |
| **Session narrative, blockers, next step** | `.project/PROGRESS.md` | Agent **each session** | What you did, what you verified, what’s blocked, what’s next |
| **Checklist / definition of done (repo)** | `harness/feature_list.json` | Agent **after** mechanical verify | Flip `"passes"` only when verified (see rules in that file) |
| **Handoff between chat windows** | `harness/agent-progress.txt` | Agent **end of session** | Dated block: tool, shipped, verified, next feature id |
| **Durable code history** | `git` commits | Agent | Small, descriptive commits |
| **Python in-app agent memory** (optional) | `artifacts/runtime/` + `MEMORY_FILE` in settings | `MemoryManager` in `src/` | **Separate** from this coding harness; see `src/agent.py` |
| **Org/user memory** (optional) | Glean Memory MCP (if configured) | User / tool | When available; not a substitute for repo files |

**Creating “memory” for the next session** means **writing to disk** in the rows above — not relying on the chat UI.

---

## 5. Which “agent” should do what?

There is **no separate daemon** that runs the harness. **Any** coding agent (Cursor, Claude Code, Codex, cloud subagent) should:

1. Follow **this document** and the chosen **track(s)**.
2. Carry **explicit handoff text** when spawning subagents (paste current `PROGRESS.md` section or latest `agent-progress` block + the **single** task bound).

**Review / routing:** when doing structured review, use [`agents/review/REVIEW_RULES.md`](../../agents/review/REVIEW_RULES.md) and [`agents/review/ROUTING_RULES.json`](../../agents/review/ROUTING_RULES.json).

**Skills:** optional triggers described in [`agents/core/SYSTEM_PROMPT.md`](../../agents/core/SYSTEM_PROMPT.md) and [`agents/skills/README.md`](../../agents/skills/README.md).

---

## 6. Rules overlays (when they apply)

- **OpenSpec / proposals:** [`openspec/AGENTS.md`](../../openspec/AGENTS.md) when the task is spec, proposal, or ambiguous architecture (see also the OpenSpec block in root `AGENTS.md` / `CLAUDE.md`).
- **Antigravity / Cursor artifact rules:** [`.antigravity/rules.md`](../../.antigravity/rules.md) and root `.cursorrules` when those tools are active.
- **Product behavior:** [`artifacts/PRD_V1_BEHAVIORAL_OBSERVABILITY.md`](../../artifacts/PRD_V1_BEHAVIORAL_OBSERVABILITY.md) when changing observable product semantics.

---

## 7. Verification (mechanical, not self-reported)

Follow [`docs/agent/EVALUATION.md`](EVALUATION.md): Python `./harness/scripts/verify.sh`, Node `shared` build, `backend` / `frontend` tests as appropriate. Prefer marking harness checklist items `"passes": true` only after those commands pass.

---

## Quick copy-paste checklist

```
[ ] Repo root
[ ] git log --oneline -20
[ ] Read docs/agent/SESSION_START.md (this file)
[ ] Track A: SYSTEM_PROMPT → GOVERNANCE → WORK_QUEUE → PROGRESS
[ ] Track B: harness README → agent-progress (bottom) → feature_list → initializer OR incremental_session
[ ] OpenSpec / Antigravity if triggered
[ ] Implement one bounded unit → verify → update memory files → commit
[ ] Append harness/agent-progress.txt (and/or PROGRESS.md) for next session
```
