# Change: Add Glean readiness to Unified Telemetry bridge

## Why

Validated Glean readiness maps need a safe bridge into FluencyTracr's Unified Telemetry layer before they can contribute to EvidenceBundle derivation. The bridge should emit valid UT events only for computable signal families and preserve non-computable readiness state outside the strict UT event payload.

## What Changes

- Add `mapReadinessToUnifiedTelemetryCoverage` in shared code.
- Emit valid aggregate `UT_2026_04` events for `present` readiness entries.
- Return explicit non-computable signal notes for `missing`, `suppressed`, and `not_computed` entries.
- Add regression tests for UT schema validation and non-inference behavior.

## Impact

- Affected specs: `glean-signal-readiness`, `unified-telemetry`
- Affected code: `shared/src/`, backend tests
- Affected docs: `docs/contracts/glean-signal-readiness/README.md`
