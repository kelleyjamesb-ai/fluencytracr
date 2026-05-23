# Current Slice Contract

- Work item id: `v4-signal-validation-review-fixes`
- Title: `Tighten V4 signal validation header handling and governance review comments`
- Status: `completed`

## Summary

Addressed the actionable V4 signal validation review finding by normalizing CSV row keys at ingestion so downstream metric readers use the same canonical headers as schema validation. Rechecked the runbook predictive-claims comment; the flagged `non-predictive unless separately validated` language is already absent from this branch.

## Scope Paths

- `scripts/dogfood/run_v4_signal_validation.py`
- `tests/dogfood/test_v4_signal_validation.py`
- `.project/CURRENT_SLICE.md`
- `.project/PROGRESS.md`

## Key Risks

- Header schema validation could pass while metric readers silently miss values if row keys remain raw.
- Display-style headers such as `P50` or `Adopter Count P50` must not downgrade valid aggregate exports to HOLD.
- V4 validation outputs must preserve aggregate-only, fail-closed, non-predictive governance constraints.

## Planned Checks

- Confirm the runbook no longer contains the predictive exception.
- Add regression coverage for case/format header variants.
- Run the focused V4 signal validation dogfood tests.
- Compile the V4 validation harness.
- Run `git diff --check`.

## Evaluator Command Profile

- `.venv/bin/python -m pytest tests/dogfood/test_v4_signal_validation.py`
- `.venv/bin/python -m compileall scripts/dogfood/run_v4_signal_validation.py`
- `git diff --check`

## Evaluator Pass Criteria

- Variant CSV headers feed p50, coverage, and non-empty calculations.
- Existing governance/fail-closed tests still pass.
- No predictive exception language remains in the V4 signal validation runbook.

## Specialists To Consult

- Not used for this narrow review fix.

## Next Handoff Note

Completed: row keys now normalize during CSV ingestion, display-style header variants are covered by regression tests, and focused verification passed.
