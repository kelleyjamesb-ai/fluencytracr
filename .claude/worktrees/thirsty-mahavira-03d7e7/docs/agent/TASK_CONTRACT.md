# Task contract (definition of done)

Use this pattern **before** large implementations so work is chunked, verifiable, and handoff-friendly.

## Per chunk (feature, fix, or refactor slice)

1. **Goal** — One sentence outcome.
2. **In scope / out of scope** — Bullets; explicit non-goals reduce drift.
3. **Success criteria** — Observable checks (tests passing, script output, UI behavior, API response). Avoid “looks good” without a signal.
4. **Verification plan** — Commands from [`EVALUATION.md`](EVALUATION.md) that an independent run can repeat (CI is the ultimate evaluator for merged work).
5. **Artifacts** — Files that must change (specs, code paths, docs). Link to OpenSpec change id if applicable.
6. **Rollback / risk** — What breaks if this is wrong; feature flags or revert strategy if any.

## After implementation

- Run the verification plan locally.
- Update [`harness/feature_list.json`](../../harness/feature_list.json) only by setting `"passes": true` **after** criteria are met (see [`harness/README.md`](../../harness/README.md)).
- Append a short block to [`harness/agent-progress.txt`](../../harness/agent-progress.txt) for the next session.

## Optional plan file

For bigger efforts, add a dated markdown file under `artifacts/plans/` (e.g. `artifacts/plans/2026-03-31-ingest-hardening.md`) with the same sections. Keep it short; the repo—not the chat—is the system of record.
