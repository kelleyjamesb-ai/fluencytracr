## Context

The immutable Section 7.5A registry assigns audit classifier closure to P12,
the audit P07 node jointly to Sections 7.5 and 7.4, and delivery-mechanism work
in P13 jointly to Sections 7.5 and 7.7. The checked-in 89-row inventory is
research evidence, not a closed semantic classifier or live delivery proof.

## Goals / Non-Goals

- Goals: close the docs-only classifier and five evidence-record interfaces for
  the exact Section 7.5.4 ownership projection.
- Non-goals: edit the inventory or registry, implement a SUT, create logging
  resources, access GCP, decide Section 7.7, deploy, qualify, or execute models.

## Decisions

- Preserve and byte-pin both the Section 7.5A registry and audit inventory.
- Treat all 89 inventory rows as the closed universe. Unknown or missing rows
  hold; Policy Denied applies to every applicable method with no exclusion.
- Require all five exclusion methods and the sink-error platform log.
- Separate route configuration, source and destination receipts, and
  independently rooted observations. Routing and delivery root sets are
  disjoint, and router buffering cannot prove delivery.
- Expose only a fixed aggregate projection whose complete preimage and digest
  are verified; raw identifier-bearing AuditLog fields remain restricted and
  cannot enter public records.
- Bind the audit mapping to the exact Section 7.4 node/formula and the other
  four structural records. Empty runtime registries prevent synthetic vectors
  from becoming evidence or authority.

## Migration Plan

No migration exists. This is docs/OpenSpec/offline verification only.

## Open Questions

None inside this slice. Actual delivery evidence and Section 7.7 decisions
require their separately authorized work.
