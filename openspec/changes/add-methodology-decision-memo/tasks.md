## 1. Shared Helper

- [x] 1.1 Add `buildMethodologyDecisionMemo(workspace, selectedSnapshotId)`.
- [x] 1.2 Include decision state, snapshot, approval, financial effect, strongest safe language, blocked language, blocker rationale, high-sensitivity assumptions, covered/excluded surfaces, caveats, and upgrade actions.
- [x] 1.3 Keep memo output plain text and privacy-safe.

## 2. Review Workspace UI

- [x] 2.1 Add "Reviewer decision memo" section to `/methodology-review`.
- [x] 2.2 Render copyable plain text output for the selected snapshot.
- [x] 2.3 Keep the memo synchronized with selected snapshot changes.

## 3. Verification

- [x] 3.1 Add tests for finance-approved, customer-safe, rejected/draft/expired, and forbidden-field-safe memo output.
- [x] 3.2 Add frontend tests for memo visibility and selected snapshot updates.
- [x] 3.3 Run targeted backend/frontend tests, shared build, frontend build, docs sweep, and OpenSpec validation.
