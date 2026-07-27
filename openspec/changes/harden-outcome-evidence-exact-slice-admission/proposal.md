# Change: Harden Outcome Evidence Exact-Slice Admission

## Why

Outcome Evidence ingestion is intentionally storage-only and permits optional
join keys, but downstream materialization can currently pair baseline and
comparison records across JBTD/persona slices and accepted hand-authored
exports can be mistaken for authoritative evidence. Slice B needs one
fail-closed admission policy without turning storage, human review, suppression,
readiness, model eligibility, or claim authorization into the same decision.

## What Changes

- Add one pure exact-slice admission evaluator for organization-defined Outcome
  Evidence.
- Require an exact workflow, JBTD, persona, baseline window, and comparison
  window at the admission boundary while preserving legacy storage/replay.
- Reject incomplete, cross-slice, shifted-window, missing-pair, and ambiguous
  duplicate evidence from admission.
- Bind materialized exports to the admitted slice, windows, and source evidence
  IDs.
- Require the admission binding before an accepted export can attach to
  readiness or readout paths.
- Demote direct export PUT and human review to storage/review state when no
  authoritative admission binding exists.

## Impact

- Affected specs: `outcome-evidence`, `ai-value-platform`
- Affected code: shared Outcome Evidence contracts, backend materializer and
  routes, Outcome Evidence export validation, schemas, focused tests, and
  contract documentation
- Compatibility: storage/replay payloads with missing join keys remain
  supported but are explicitly non-admissive
- Governance: no new canonical event, suppression reason, threshold, override,
  ROI, causality, prediction, productivity, ranking, or customer-facing
  economic output
