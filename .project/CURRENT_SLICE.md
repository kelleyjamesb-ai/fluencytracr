# Current Slice Contract

- Work item id: `reuse-propagation-diagnostic-review-fix`
- Title: `Count reuse propagation coverage metrics at workflow granularity`
- Status: `completed`

## Summary

Addressed the review finding that `snapshot_join_coverage` named/confirmed/unmatched metrics counted runs instead of distinct workflows. This remains a dogfood diagnostic-only SQL contract fix.

## Scope Paths

- `sql/dogfood/reuse_propagation_diagnostic.sql`
- `tests/dogfood/test_velocity_double_count.py`
- `.project/CURRENT_SLICE.md`
- `.project/PROGRESS.md`

## Key Risks

- Candidate and unmatched workflow metrics can be overstated when one workflow has multiple runs.
- SQL must remain aggregate-only and research/dogfood scoped.
- Tests should verify the intended workflow-granularity contract without requiring BigQuery execution.

## Planned Checks

- Change coverage metrics to conditional distinct workflow counts.
- Add/extend SQL contract coverage for workflow-granularity counts.
- Run the focused dogfood SQL contract test.
- Run `git diff --check`.

## Evaluator Command Profile

- `.venv/bin/python -m pytest tests/dogfood/test_velocity_double_count.py`
- `git diff --check`

## Evaluator Pass Criteria

- `named_candidate_count`, `confirmed_reusable_candidate_count`, and `unmatched_agent_workflow_count` count distinct `workflow_key` values.
- Existing dogfood SQL contract tests still pass.
- No unrelated SQL or product behavior changes are introduced.

## Specialists To Consult

- Not used for this narrow review fix.

## Next Handoff Note

Completed: `named_candidate_count`, `confirmed_reusable_candidate_count`, and `unmatched_agent_workflow_count` now use conditional distinct `workflow_key` counts; focused dogfood SQL contract verification passed.
