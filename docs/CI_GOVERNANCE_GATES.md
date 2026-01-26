# CI Governance Gates

Blocking invariants for FluencyTracr V1 Phase 2 signal evaluation:

- `window_length_days < 60` ⇒ `decision == SUPPRESS`
  - This includes 30–59 day windows as a subset; those windows may be evaluated but MUST NOT surface.
