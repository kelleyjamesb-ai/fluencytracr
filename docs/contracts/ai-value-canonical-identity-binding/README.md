# AI Value Canonical Identity Binding

Core schema version: `FT_CANONICAL_IDENTITY_CORE_V1`

Binding schema version: `FT_CANONICAL_IDENTITY_BINDING_V1`

Renderer version: `FT_CANONICAL_READOUT_RENDERER_V1`

Slice E binds one exact, current Discovery-to-readout lineage to one internal
aggregate descriptive claim. It does not create claim authority by itself.
Slice D source-graph authorization and C.1 comparison privacy must pass first,
and every Slice E source, edge, artifact, creation attestation, and rendered
byte must revalidate before the result may be labeled source-bound or
canonical-identity-bound.

This is an internal aggregate-only contract. It authorizes no customer-facing
output, ROI, causality, attribution, productivity measurement, prediction,
individual scoring, or ranking.

## Equality selector

`canonical_identity_selector` is optional for compatibility. When present, it
is strict and contains exactly:

- `value_hypothesis_id`
- `value_hypothesis_version`
- `measurement_plan_id`
- `measurement_plan_version`
- `measurement_cell_id`
- `measurement_cell_version`

All versions are positive integers. IDs and versions are equality selectors
only: they do not choose semantics, confer authority, or permit a latest-row
fallback. The server loads exact same-organization versions and proves that
each is the unique durable family head with the exact recorded predecessor and
parent edges.

If the selector is present and any selector or binding check fails, the entire
request returns the existing fixed redacted Slice D HOLD. It never downgrades
to an unbound authorization result. Existing callers that omit the selector
remain eligible only for the explicit `UNBOUND` compatibility path.

## Exact source requirements

A `BOUND` result requires:

1. One current HMAC-attested Value Hypothesis version.
2. One current Measurement Plan version with a valid
   `canonical_slice_binding_v1` and a server-stamped exact hypothesis edge.
3. One current Measurement Cell Snapshot with server-stamped exact plan and
   hypothesis edges.
4. One unique metrics-library entry matching both metric ID and the
   version-bearing `metric_definition_ref`.
5. An exact recomputation of
   `canonical_metric_definition_commitment_v1`.
6. Exact agreement across organization, workflow, JBTD, persona, aggregate
   grain, metric, source, unit, permitted direction, baseline/comparison
   windows, Slice D source graph, accepted evidence, and current C.1
   projection.
7. Exact agreement with the append-only family-head journal for the selected
   hypothesis, plan, and Measurement Cell families.

Missing, duplicate, foreign, stale, forked, skipped, unattested,
compatible-looking, or cross-spliced sources hold. The legacy Measurement Cell
`metric_definition_hash` is unchanged and never substitutes for the separate
Slice E metric-definition commitment.

## Canonical identity core

After D and C.1 pass, the server builds
`FT_CANONICAL_IDENTITY_CORE_V1`. The strict core contains only version numbers,
fixed policy/schema identifiers, and domain-separated commitments to:

- the authenticated organization;
- the exact hypothesis, plan, and Measurement Cell semantic projections;
- the hypothesis creation attestation and both child-edge attestations;
- the canonical metric definition;
- the approved exact slice and windows;
- the D source graph, accepted export, review, admission, C.1 receipt, and
  complete comparison projection; and
- `FT_CANONICAL_READOUT_RENDERER_V1`, the fixed claim policy, and the fixed
  descriptive template.

The core commitment is added to the D claim content, packet content, and
manifest core before any of their content hashes or IDs are derived. Therefore
an identity-chain or renderer-version change creates new D IDs.

## Deterministic rendering and final binding

After the final D IDs exist, `FT_CANONICAL_READOUT_RENDERER_V1` produces the
exact UTF-8 HTML body from the fixed aggregate packet projection. The rendered
body contains no binding ID, request-local data, authority headers, selector,
source-row locator, key identifier, MAC, or diagnostic material.

The server hashes those exact bytes under
`FT_CANONICAL_READOUT_BYTES_V1`, then creates one
`FT_CANONICAL_IDENTITY_BINDING_V1` containing:

- a packet-derived `binding_id`;
- `state: BOUND`;
- the canonical core commitment;
- final claim, packet, and manifest IDs and content hashes;
- the rendered-body commitment; and
- `customer_facing_output_authorized: false`.

The binding is the fourth reserved internal artifact:
`canonical_identity_compatibility_binding`. Generic object create, read, list,
and upsert paths must not expose or mutate it. One packet has one deterministic
binding ID. Exact replay may reuse exact bytes; a byte conflict holds and is
never overwritten.

## Creation authority

Deterministic hashes alone do not prove that the trusted service created a
bundle. Slice E requires a service-held
`FT_CANONICAL_ARTIFACT_CREATION_ATTESTATION_V1` HMAC over the authenticated
organization commitment, binding ID, canonical core commitment, and complete
attestable semantic hashes of the claim, packet, manifest, and binding.

The binding's attestable projection contains every authority-bearing public
binding byte but excludes only its own private attestation key ID and MAC,
avoiding a circular hash. The key ID and MAC exist only in the reserved
validation envelope. Secrets remain outside PostgreSQL and source control.
Slice E uses separate domains for hypothesis creation, plan edge, cell edge,
and bundle attestations and does not reuse or modify C.1 attestation state.

## Persistence and current readout

The existing serializable D seal is extended to take deterministic
source-family locks, lock the three exact durable journal heads and source
rows, reload every D and E source, and atomically insert-or-exact-compare all
four reserved artifacts. Post-commit authorization repeats C.1, source,
journal, artifact, renderer, and attestation reconciliation.

Current HTML readout repeats the complete chain. It may set both
`x-ai-value-source-bound: true` and
`x-ai-value-canonical-identity-bound: true` only when the exact current
binding, four-artifact HMAC, declared renderer version, and returned HTML bytes
all revalidate. The route returns the exact rebuilt bytes; it does not
independently render a second body.

A valid D-only bundle may retain its internal descriptive rendering for
compatibility, but its state is `UNBOUND`, both headers are false, and the body
must not call itself canonical or source-bound.

## Privacy and failure posture

The public-safe binding stores no raw IDs from the selector, internal row keys,
raw slice values, member tokens, user identifiers, emails, names, events,
prompts, responses, transcripts, source payloads, arbitrary prose, key IDs, or
MACs. Exact internal row locators may exist only in the private reserved
validation envelope.

Every external E failure uses the existing fixed D response:

```json
{
  "decision": "HOLD",
  "reason_family": "AGGREGATE_CLAIM_AUTHORIZATION_HELD",
  "persisted": []
}
```

It discloses no selector, candidate, locator, commitment, hash, or diagnostic
difference.

The synchronized JSON Schema is
[`canonical-identity-binding.schema.json`](../../../schemas/ai-value/canonical-identity-binding.schema.json).
The D integration schema is
[`aggregate-claim-authorization.schema.json`](../../../schemas/ai-value-intelligence/aggregate-claim-authorization.schema.json).
The governing behavioral requirements are in
[`bind-canonical-identity-compatibility`](../../../openspec/changes/bind-canonical-identity-compatibility/).
