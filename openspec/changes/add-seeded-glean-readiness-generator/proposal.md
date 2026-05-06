# Change: Add seeded Glean readiness generator

## Why

The Glean Signal Readiness Map contract explains the target shape, but FluencyTracr needs a deterministic seeded example that stakeholders can inspect and future adapters can target. A seeded generator shows what is measurable now, what is missing, and what data access unlocks next without depending on live Glean exports.

## What Changes

- Add a seeded Glean signal inventory fixture for a demo org.
- Add shared generator logic that derives a validated `GSR_2026_05` readiness map from the inventory.
- Add a CLI script for producing the readiness map JSON from the fixture or another inventory file.
- Add a demo summary document for stakeholder review.

## Impact

- Affected specs: `glean-signal-readiness`
- Affected docs: `docs/contracts/glean-signal-readiness/`
- Affected code: `shared/src/`, `scripts/`, root `package.json`
