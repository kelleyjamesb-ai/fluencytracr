## Context

Existing contracts already define several mathematical layers, but they live
in different modules and governance documents. The registry exists to make
their implementation state explicit and machine-checkable without creating a
new execution surface.

## Decisions

- The registry is metadata-only. It can point to existing governed
  implementations, but those pointers are traceability metadata and are not
  callable from the registry.
- Specified, future, deprecated, and prohibited formulas must set
  `executable_reference_function: null`.
- AI Manager formula families remain docs-only customer-owned aggregate
  templates and must not emit dollars, hours saved, productivity lift, ROI, or
  causality.
- Economic value calculations such as modeled value draw and portfolio value
  draw are represented as `PROHIBITED`.
- Runtime-tunable numeric weights, thresholds, coefficients, caps, and
  multipliers are rejected by the shared metadata validator.

## Boundaries

Python continues to own statistical computation. TypeScript validation owns
contract shape, governance, and non-execution checks. This change adds no
Python statistical code and does not alter the confidence-engine artifact
boundary.
