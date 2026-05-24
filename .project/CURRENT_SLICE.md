# Current Slice Contract

- Work item id: `reuse-propagation-pr275-conflict-reconciliation`
- Title: `Reconcile PR 275 reusable workflow propagation diagnostic with main`
- Status: `completed`

## Summary

Resolved PR #275 conflicts by preserving `main`'s V4 signal-validation and
join-key diagnostic updates while keeping the PR's separate reusable workflow
propagation diagnostic and workflow-granularity coverage fix.

## Scope Paths

- `docs/research/V4_SIGNAL_DISCOVERY_READOUT.md`
- `sql/dogfood/v4_signal_discovery_reuse_propagation.sql`
- `sql/dogfood/reuse_propagation_diagnostic.sql`
- `tests/dogfood/test_velocity_double_count.py`
- `.project/CURRENT_SLICE.md`
- `.project/PROGRESS.md`

## Key Risks

- Replacing `main`'s join-key diagnostic context could regress the unresolved
  reusable-workflow finding.
- Dropping the PR diagnostic would lose candidate/confirmed propagation
  coverage.
- The merged SQL contract test must cover both diagnostics without adding
  customer-facing V4 claims.

## Planned Checks

- Preserve `main`'s V4 signal-discovery probe and join-key readout.
- Preserve PR #275's reusable workflow propagation diagnostic and distinct
  workflow coverage counts.
- Run the focused dogfood SQL contract test.
- Run the focused V4 signal validation test touched by `main`.
- Compile the V4 validation harness.
- Run `git diff --check`.

## Evaluator Command Profile

- `.venv/bin/python -m pytest tests/dogfood/test_velocity_double_count.py tests/dogfood/test_v4_signal_validation.py`
- `.venv/bin/python -m compileall scripts/dogfood/run_v4_signal_validation.py`
- `git diff --check`

## Evaluator Pass Criteria

- PR #275 is no longer merge-conflicted against `main`.
- Dogfood SQL contract tests include the reusable propagation diagnostic and
  agent snapshot join-key diagnostic.
- V4 validation behavior from `main` remains intact.
- No V4 signal is promoted or productized.

## Specialists To Consult

- Not used for this focused merge reconciliation.

## Next Handoff Note

Completed locally: conflicts resolved and focused verification passed. Commit,
push, and re-check PR #275 mergeability.
