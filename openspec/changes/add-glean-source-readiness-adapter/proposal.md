# Change: Add Glean source readiness adapter

## Why

The seeded readiness generator proves the target map shape, but FluencyTracr needs a bridge from realistic Glean-style source export records into the readiness inventory. This adapter keeps real-source mapping separate from EvidenceBundle derivation and preserves the privacy boundary before any downstream signal use.

## What Changes

- Add strict Glean-style source fixture schemas for WorkflowRun, MCP Usage, and AI Security records.
- Add `mapGleanSourcesToReadinessInventory` to produce `GSR_INVENTORY_2026_05`.
- Add source fixtures under the Glean readiness examples directory.
- Add regression tests for present, not-computed, suppressed, and unsafe-field behavior.

## Impact

- Affected specs: `glean-signal-readiness`
- Affected docs: `docs/contracts/glean-signal-readiness/examples/source-fixtures/`
- Affected code: `shared/src/`, `backend/tests/`
