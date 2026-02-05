# Change: Enforce GEM TG5 Governance Rules

## Why
We must make GEM TG5 FINAL enforceable in code with deterministic tests and CI proofs. Current behavior does not guarantee suppression, window isolation, or schema hardening.

## What Changes
- Add centralized forbidden-key enforcement and schema linting.
- Add a single global enforcement flag with fail-fast consistency checks.
- Enforce single-window inference with no cross-window state.
- Apply suppression before any serialization/response/export.
- Fail closed on ambiguous inputs and remove absence-as-negative outputs.
- Enforce binary visibility only and non-ordinal labels.
- Block export/API aggregation surfaces that enable ordering or trends.
- Add deterministic tests and CI checks for every GEM row.

## Impact
- Affected specs: governance-enforcement (new capability)
- Affected code: backend validation, inference, routing, contracts, serialization, CI scripts
- Breaking: **YES** (contract and behavior changes)
