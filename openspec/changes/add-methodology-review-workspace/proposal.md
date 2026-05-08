# Change: Add Methodology Review Workspace

## Why

The Methodology Snapshot Registry now governs financial and customer-facing claim language, but humans need an inspection surface before Strongest Safe Claim emits or suppresses value language. Reviewers should be able to see why a snapshot is customer-safe, internal-only, caveated, or suppressed without reading raw schema payloads.

## What Changes

- Add a methodology review summary helper that groups each snapshot by approval state, customer-safe claim effect, covered/excluded surfaces, high-sensitivity assumptions, caveats, blocked claim effects, and example claim posture.
- Add a reviewer-facing frontend/static workspace with snapshot list, selected detail, approval gate explanation, financial claim effect, assumptions, sensitivity tests, and safe/internal-only/suppressed examples.
- Add tests for claim gates and review summaries, including finance-approved internal-only behavior, customer-safe enablement, rejected/expired/draft suppression, and missing-snapshot deterministic downgrade.
- Preserve all existing privacy and governance boundaries.

## Impact

- Affected specs: methodology-review-workspace
- Affected code: shared methodology helper, backend/read helper tests, frontend review page and route
- Affected outputs: no new raw telemetry, no person-level or manager-level views, no automatic approval workflow
