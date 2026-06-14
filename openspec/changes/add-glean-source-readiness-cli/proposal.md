# Change: Add Glean source readiness CLI

## Why

The source readiness adapter maps realistic Glean-style records to inventory in code, but operators need a repeatable command that turns source fixture files into a validated readiness map artifact. This makes the adapter reviewable without requiring live Glean data access.

## What Changes

- Add `scripts/generate_glean_readiness_from_sources.mjs`.
- Add root script `glean:readiness:sources`.
- Generate `org-northstar-source-derived-readiness-map.json` from source fixture files.
- Add CLI contract coverage for expected readiness statuses.

## Impact

- Affected specs: `glean-signal-readiness`
- Affected docs/artifacts: `docs/contracts/glean-signal-readiness/examples/`
- Affected code: `scripts/`, root `package.json`, backend tests
