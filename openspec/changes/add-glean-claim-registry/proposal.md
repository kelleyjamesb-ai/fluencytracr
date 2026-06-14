# Change: Add Glean Claim Registry

## Why
The Glean Value Evidence Pack can carry claim readiness, but FluencyTracr needs a separate registry that defines which Glean value claims are allowed, which evidence lanes they require, which inputs are forbidden, and which language modes are permitted. Without this registry, customer-facing ROI/value language can drift into ad hoc assertions that are not supported by the current evidence state.

## What Changes
- Add a Glean Claim Registry contract for reusable claim templates and org-window claim evaluation records.
- Add shared Zod validation for `GCR_2026_05`.
- Add synthetic registry and evaluation examples covering time-saved, ROI, Skills, Auto Mode Agents, MCP/action, and control-effectiveness claims.
- Add targeted tests that reject unsafe ROI defaults, raw/direct/ranking inputs, and suppressed evaluations with approved language.

## Impact
- Affected specs: `glean-claim-registry`
- Affected docs: `docs/contracts/glean-claim-registry/`
- Affected code: `shared/src/`
- Affected tests: backend schema/example validation tests
