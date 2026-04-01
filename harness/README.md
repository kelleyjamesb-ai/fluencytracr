# Portable long-running agent harness (Codex, Claude, Cursor, etc.)

This folder is the **single source of truth** for multi-session work. It follows patterns from [Anthropic’s guidance on long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents): external memory, incremental progress, and explicit completion criteria—without tying the repo to one vendor SDK.

## Files

| Path | Purpose |
| --- | --- |
| [`feature_list.json`](feature_list.json) | Checklist of outcomes. Agents may **only** flip `passes` from `false` to `true` after verification—not remove or rewrite tests. |
| [`agent-progress.txt`](agent-progress.txt) | Append-only session handoff log (what changed, what to do next, open risks). |
| [`prompts/initializer.md`](prompts/initializer.md) | **First session only**: scaffold checklist, bootstrap, initial git commit. |
| [`prompts/incremental_session.md`](prompts/incremental_session.md) | **Every later session**: regain context, smoke test, one checklist item, commit. |
| [`../artifacts/harness/checkpoints/`](../artifacts/harness/checkpoints/) | Optional machine-readable snapshots (gitignored except `.gitkeep`). |

## Session loop (every incremental run)

1. Confirm working directory (`pwd` or equivalent).
2. Read recent git history (`git log --oneline -20`).
3. Read [`agent-progress.txt`](agent-progress.txt).
4. Read [`feature_list.json`](feature_list.json); pick the **highest-priority** item with `"passes": false`.
5. Run the repo bootstrap smoke (see root `package.json` / Python `pytest` as applicable for this monorepo).
6. Implement **one** checklist item; verify; mark `passes` only when verified.
7. Commit with a descriptive message; append a short entry to [`agent-progress.txt`](agent-progress.txt).

## Bootstrap

From repo root, use the same commands whether the session is Codex or Claude:

```bash
./harness/scripts/bootstrap.sh
```

Adjust that script as the project’s canonical dev entrypoint evolves.

## Relationship to other agents

- **`src/agent.py` / `MemoryManager`**: Python agent chat memory lives under `artifacts/runtime/` (see `MEMORY_FILE` in settings), separate from this harness.
- **`fluencytracr-harness/`**: Domain-specific batch analytics with its own `StateStore`; keep orchestration separate unless you explicitly merge workflows.
