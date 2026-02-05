# Change: Add Phase 1 Governance-First Thin Slice

## Why
Phase 1 requires a minimal, production-safe governance-first pipeline that only emits binary SURFACE/SUPPRESS decisions under strict constraints.

## What Changes
- Add a Phase 1 thin-slice contract validator, evaluation engine, suppression, and surfacing boundary.
- Add deterministic fixtures and CI gates for governance invariants.
- Add minimal documentation for Phase 1 behavior and enforcement mapping.

## Impact
- Affected specs: phase1-thin-slice
- Affected code: backend (new Phase 1 modules + tests), docs/README (add Phase 1 section)
