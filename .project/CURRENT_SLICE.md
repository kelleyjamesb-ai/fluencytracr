# Current Slice Contract

- Work item id: `v4-signal-validation-review-fixes`
- Title: `Tighten V4 signal validation header handling and governance review comments`
- Status: `completed`

## Summary

Addressed the actionable V4 signal validation review findings by normalizing CSV row keys at ingestion and requiring the exact fixed `window_1`, `window_2`, and `window_3` export set before promotion. Rechecked the runbook predictive-claims comment; the flagged `non-predictive unless separately validated` language is already absent from this branch.

## Scope Paths

- `scripts/dogfood/run_v4_signal_validation.py`
- `tests/dogfood/test_v4_signal_validation.py`
- `.project/CURRENT_SLICE.md`
- `.project/PROGRESS.md`

## Key Risks

- Header schema validation could pass while metric readers silently miss values if row keys remain raw.
- Display-style headers such as `P50` or `Adopter Count P50` must not downgrade valid aggregate exports to HOLD.
- Non-contiguous exports such as `window_2`, `window_3`, and `window_4` must not satisfy the fixed-window promotion gate.
- V4 validation outputs must preserve aggregate-only, fail-closed, non-predictive governance constraints.

## Planned Checks

- Confirm the runbook no longer contains the predictive exception.
- Add regression coverage for case/format header variants.
- Add regression coverage for missing `window_1` plus extra `window_4`.
- Run the focused V4 signal validation dogfood tests.
- Compile the V4 validation harness.
- Run `git diff --check`.

## Evaluator Command Profile

- `.venv/bin/python -m pytest tests/dogfood/test_v4_signal_validation.py`
- `.venv/bin/python -m compileall scripts/dogfood/run_v4_signal_validation.py`
- `git diff --check`

## Evaluator Pass Criteria

- Variant CSV headers feed p50, coverage, and non-empty calculations.
- Promotion requires the exact fixed window export set, not only three matching files.
- Existing governance/fail-closed tests still pass.
- No predictive exception language remains in the V4 signal validation runbook.

## Specialists To Consult

- Not used for this narrow review fix.

## Next Handoff Note

Completed: row keys now normalize during CSV ingestion, display-style header variants are covered by regression tests, non-contiguous fixed windows hold instead of promote, and focused verification passed.
