# Change: Add Reliability Factor Output

## Why
Value-realization consumers need a bounded workflow-level reliability descriptor that qualifies surfaced evidence without changing FluencyTracr's fail-closed governance.

## What Changes
- Add additive `reliability_factor` and `reliability_components` fields to aggregate verdict payloads.
- Compute the factor deterministically from existing canonical observations only.
- Null both fields whenever the aggregate verdict or workflow disclosure is suppressed.
- Document the formula, limits, and AIOM-facing interpretation.
- Add LMSYS assurance fixtures and verifier checks for high, low, and suppressed Reliability Factor cases.

## Impact
- Affected specs: `fluencytracr-v1-verdict`, `ingestion`
- Affected code: shared schemas, aggregate verdict emitters, observability rollup, LMSYS assurance harness, docs.
- No new canonical events, no new suppression reasons, no endpoint, no suppression behavior changes.
