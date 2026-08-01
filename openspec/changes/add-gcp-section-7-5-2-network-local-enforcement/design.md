## Context

Section 7.5.1 closed the parent documentation interfaces without satisfying the
full Section 7.5 runtime contract. The immutable Section 7.5A registry assigns
network/local mechanism gaps to P09 and P18 and gives P07 nine Section 7.4
acceptance nodes. This slice owns only five network/transport nodes; later
sections retain audit mapping and replay retention.

## Goals / Non-Goals

- Goals: define one closed docs-only contract, synthetic vectors, offline
  verifier, and exact ownership projection for the Section 7.5.2 bound.
- Non-goals: runtime records or satisfaction, persistence, audit mapping,
  replay retention, attempt semantics, GCP, credentials, provisioning,
  deployment, qualification, model execution, or later-section activation.

## Decisions

- Decision: preserve the 20-row Section 7.5A registry byte-for-byte and project
  ownership rather than editing historical rows, states, owners, or edges.
- Decision: use six closed record schemas sharing exact target, interval,
  authentication, freshness, and approved-contract bindings.
- Decision: use whole-interval Booleans only as synthetic contract vectors;
  actual runtime evidence registries remain empty, so these examples cannot
  create runtime satisfaction.
- Decision: bind the Section 7.4 trust time and trusted UTC policy by exact
  string equality. Conversion, rounding, alternate timezones, and caller
  replacement are rejected.
- Decision: parse and hash each explicit source from one descriptor-pinned read,
  rejecting symlinks, nonregular files, duplicate keys, noncanonical JSON, and
  source-pin drift.

## Risks / Trade-offs

- A valid synthetic bundle could be mistaken for live proof. The contract calls
  it structural only, keeps all runtime registries empty, reports authority
  `NONE`, and makes the terminal decision explicitly evidence-absent.
- A later slice could claim excluded P07 nodes. Exact included and excluded
  lists are executable and ownership expansion rejects.
- A point-in-time control could masquerade as interval evidence. Every record
  binds the same nonempty interval, and every required mechanism is named as
  whole-interval coverage.

## Migration Plan

No migration exists. This is a docs/OpenSpec/offline-verifier contract only.

## Open Questions

None inside this bounded slice. Runtime evidence sources and actual mechanism
implementation require separately authorized later work.
