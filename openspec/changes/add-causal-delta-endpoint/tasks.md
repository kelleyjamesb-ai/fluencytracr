## 1. Implementation
- [x] Add derive-on-read Causal Delta service.
- [x] Add `POST /api/v1/causal-delta`.
- [x] Reuse existing pattern detection.
- [x] Reject malformed timestamps and windows below 14 days.
- [x] Keep suppressed comparisons `INDETERMINATE`.

## 2. Contracts and Harness
- [x] Add Causal Delta contract doc.
- [x] Add LMSYS assurance fixtures for each shift outcome.

## 3. Verification
- [x] Add endpoint tests for improved, held, regressed, sparse-pre, sparse-post, overlapping-window guard, and malformed event_at.
- [x] Run focused backend tests.
- [x] Run seed selftest and governance checks.
