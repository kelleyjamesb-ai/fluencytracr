# Change: Add AIVM Verdict Fields

## Why
FluencyTracr verdicts need to be readable in Glean's Value Realization grammar without changing V1 evidence, suppression, or privacy semantics.

## What Changes
- Add additive `value_type` and `evidence_grade` enum fields to V1 `SURFACE` / `SUPPRESS` verdict payloads.
- Derive `value_type` from existing canonical event classes only.
- Derive `evidence_grade` from cohort size and window length only.
- Document the deterministic AIVM mapping table.
- Add LMSYS assurance fixtures for reachable value-type and evidence-grade combinations.

## Impact
- Affected specs: `fluencytracr-v1-verdict`
- Affected code: shared schemas, V1 verdict emitters, inference tests, LMSYS assurance fixtures, contract docs
- No new canonical events, no new suppression reasons, no suppression behavior changes.
