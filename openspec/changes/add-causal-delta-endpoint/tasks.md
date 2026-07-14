## 1. Implementation
- [x] Add derive-on-read Causal Delta service.
- [x] Add `POST /api/v1/causal-delta`.
- [x] Reuse existing pattern detection.
- [x] Reject malformed timestamps and malformed window definitions.
- [x] Keep suppressed comparisons `INDETERMINATE`.

## 2. Contracts and Harness
- [x] Add Causal Delta contract doc.
- [x] Add LMSYS assurance fixtures for each shift outcome.

## 3. Verification
- [x] Add endpoint tests for improved, held, regressed, sparse-pre, sparse-post, overlapping-window guard, and malformed event_at.
- [x] Run focused backend tests.
- [x] Run seed selftest and governance checks.

## 4. Corrective Governance Hardening
- [x] 4.1 Replace the legacy 14-day/30-day defaults with the compiled 60-day surfacing floor.
- [x] 4.2 Make direct domain-helper and dogfood calls fail closed with `INSUFFICIENT_TIME` below 60 days.
- [x] 4.3 Update focused API, dogfood, and assurance-fixture regression coverage.
- [x] 4.4 Re-run strict OpenSpec, backend, dogfood, assurance, and governance verification.
