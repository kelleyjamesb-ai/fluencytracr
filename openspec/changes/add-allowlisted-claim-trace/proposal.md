# Change: Add allowlisted claim trace

## Why

The canonical Slice E binding proves a current internal lineage but the legacy
HTML readout and generic packet selection remain an unsafe authority-shaped
surface. Slice F needs one bounded, read-only, aggregate-only projection that
shows the approved claim path without returning selectors, commitments, source
payloads, or unrestricted artifacts.

## What Changes

- Define one strict `FT_CANONICAL_CLAIM_TRACE_V1` authorized-or-fixed-held
  shared contract selected only by an exact current binding.
- Require a future route to revalidate the complete current authority chain
  and project only allowlisted aggregate fields.
- Demote generic packet selection and the legacy HTML path from trace
  authority while retaining additive compatibility behavior.

## Impact

- Affected specs: `ai-value-platform`
- Affected code: shared claim-trace contract, future backend read-only route,
  and legacy frontend authority demotion
- No database migration, persistence type, canonical event, suppression reason,
  threshold, override, identifier or commitment exposure, mutation, deployment,
  ROI, causality, scoring, ranking, productivity, prediction, or
  customer-facing output
