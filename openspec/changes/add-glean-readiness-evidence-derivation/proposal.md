# Change: Add Glean readiness EvidenceBundle derivation

## Why

Readiness maps identify which Glean signal families are computable, missing, suppressed, or not computed. FluencyTracr needs a safe derivation layer that can convert validated readiness into EvidenceBundle v1 evidence without inferring unavailable values or leaking readiness-only governance details into strict EvidenceBundle enums.

## What Changes

- Add a focused backend derivation module for EvidenceBundle v1 output from Glean readiness maps.
- Derive coverage instrumentation from `present` readiness entries.
- Carry non-present signal families into missing coverage with notes.
- Map readiness governance suppression to EvidenceBundle-compatible suppression semantics.
- Add regression tests for coverage, not-computed MCP usage, and suppressed AI Security.

## Impact

- Affected specs: `glean-signal-readiness`, `evidence-bundle`
- Affected code: `backend/src/evidence/`, backend tests
- Affected docs: `docs/contracts/evidence-bundle/v1/README.md`
