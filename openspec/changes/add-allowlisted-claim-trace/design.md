## Context

Slice D authorizes a bounded aggregate descriptive claim and Slice E binds its
current immutable lineage. The existing HTML path is additive compatibility,
not an authority-safe trace surface. Slice F projects only verified typed
values after a future backend revalidation and never uses a packet ID as a
selector.

## Decisions

- The future read-only endpoint is exactly
  `GET /api/v1/ai-value/claim-trace/:bindingId`. Its only selector is a
  canonical identity binding ID matching exactly
  `canonical_identity_binding_<64 lowercase hexadecimal characters>`; it is
  never returned.
- `AUTHORIZED` is a strict field-by-field projection of approved hypothesis,
  measurement, evidence, policy, one fixed-caveat movement, and current
  readout state. The server must not spread stored objects or envelopes.
- Every authenticated lookup or authority failure returns the byte-identical
  fixed `HOLD` response with no diagnostic oracle.
- The route is read-only, accepts no body or query parameters, uses no-store,
  and performs a final source/head re-read immediately before projection.
- The legacy HTML route remains compatible but explicitly non-authoritative;
  generic packet enumeration and packet-count readiness cease to choose a
  trace, with no replacement trace UI in Slice F.

## Non-Goals

No persistence, migration, identifier/commitment exposure, event, suppression
reason, threshold, override, scoring, ranking, ROI, causality, productivity,
prediction, deployment, or customer-facing output is introduced.
