# Portable long-running agent harness (Codex, Claude, Cursor, etc.)

**Before this folder:** every coding session should begin with **[`docs/agent/SESSION_START.md`](../docs/agent/SESSION_START.md)** — it unifies **queue** (`.project/`) and **harness** (this folder), memory locations, and verification.

This folder is the **single source of truth** for multi-session **checklist + handoff + mechanical verify** patterns. It follows [Anthropic’s guidance on long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents): external memory, incremental progress, and explicit completion criteria—without tying the repo to one vendor SDK.

**Relation to `.project/`:** when both are in use, queue state and session narrative live in **`PROGRESS.md` / `WORK_QUEUE.json`** (see [`.project/GOVERNANCE.md`](../.project/GOVERNANCE.md)); this harness holds **`feature_list.json`** verification flags and optional **`agent-progress.txt`** mirroring — see `SESSION_START.md` for the full split.

**Relation to the agentic execution layer:** [`docs/concepts/AGENTIC_EXECUTION_HARNESS.md`](../docs/concepts/AGENTIC_EXECUTION_HARNESS.md) is the canonical architecture spine for scaled provider adapters, tool governance, and future ledger work. This folder remains the canonical checklist and handoff harness. Do not duplicate these files under provider-specific folders.

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

## Evaluation (separate from generation)

After substantive code changes, run the **evaluator** script so verification is mechanical, not self-reported:

```bash
./harness/scripts/verify.sh
```

Requires Python deps from `requirements.txt` (see [`docs/agent/EVALUATION.md`](../docs/agent/EVALUATION.md) for CI parity, Node tests, and governance gates). Prefer marking a `feature_list.json` item `"passes": true` only after the relevant checks in that doc pass.

## Relationship to other agents

- **`src/agent.py` / `MemoryManager`**: Python agent chat memory lives under `artifacts/runtime/` (see `MEMORY_FILE` in settings), separate from this harness.
- **`docs/archive/fluencytracr-harness/`**: Archived domain-specific batch analytics with its own `StateStore`; this is retained for history and must not become a parallel live state tree.
- **`.cursor/rules/`**: Cursor project rules that route Cursor Agent back to this harness and enforce bounded, verified slices.
- **`integrations/openai-agents/`**: Optional OpenAI Agents SDK development sidecar that reads this harness and delegates bounded specialist analysis. It does not replace `feature_list.json`, `agent-progress.txt`, OpenSpec, or mechanical verification.
- **Agent-run ledger**: Future durable execution metadata is framed in [`docs/contracts/agent-run/ledger.md`](../docs/contracts/agent-run/ledger.md). It points back to this harness and does not replace this folder.
