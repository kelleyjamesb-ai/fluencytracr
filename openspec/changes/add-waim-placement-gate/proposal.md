# Change: Add WAIM Placement Gate (Phase 3)

## Why
Phase 3 requires a machine-enforceable WAIM contract and a fail-closed placement gate that prevents orientation signals from surfacing outside explicitly allowed placements.

## What Changes
- Add WAIM v1 YAML contract as a first-class artifact.
- Implement placement gate with anti-habit suppression and fail-closed behavior.
- Add negative tests for non-appearance, non-persistence, and WAIM failure modes.

## Impact
- Affected specs: waim-placement-gate
- Affected code: backend API orientation signal handling, new governance artifact
