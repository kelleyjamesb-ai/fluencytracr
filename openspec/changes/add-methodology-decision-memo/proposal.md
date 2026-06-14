# Change: Add Methodology Decision Memo Export

## Why

The Methodology Review Workspace explains snapshot posture in-product, but CS, Value Engineering, Finance, and Governance reviewers need a plain-English memo they can copy into QBR prep, finance review, or governance handoff notes.

## What Changes

- Add `buildMethodologyDecisionMemo(workspace, selectedSnapshotId)` as a shared helper.
- Generate a plain-text decision memo with decision state, selected snapshot, approval state, financial claim effect, strongest safe language, blocked language, why stronger claims are blocked, high-sensitivity assumptions, covered/excluded surfaces, caveats, and upgrade actions.
- Add a copyable "Reviewer decision memo" section to `/methodology-review`.
- Add tests for internal-only, customer-safe, suppressed, and forbidden-field-safe memo behavior.

## Impact

- Affected specs: methodology-review-workspace
- Affected code: shared AI Work Value Graph schemas/helper, methodology review frontend page/tests, backend/read helper tests
- Affected outputs: reviewer-facing plain text only; no raw content, direct identifiers, rankings, manager views, or productivity scoring
