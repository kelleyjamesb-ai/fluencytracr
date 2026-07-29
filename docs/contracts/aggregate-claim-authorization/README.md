# Aggregate Claim Authorization

Policy version: `FT_AGGREGATE_CLAIM_AUTHORIZATION_2026_07`

Slice D adds one server-owned authorization decision for one internal,
aggregate, descriptive metric movement. Slice E additively binds that result
to one exact canonical Discovery-to-readout lineage when a strict selector is
present and the complete current chain passes. Neither slice promotes import
approval, accepted review, exact-slice admission, C.1 comparison privacy,
readiness, or model eligibility into claim authority. Every state remains
independent and must reconcile for the same exact source graph.

The only authorized template is
`FT_AGGREGATE_DESCRIPTIVE_CLAIM_V1`. It copies one baseline and comparison
value from one successful C.1 readback, computes one bounded mechanical
movement, and labels it `OBSERVED_NON_ATTRIBUTABLE`. It authorizes no model
use and no customer-facing output. ROI, money, causality, attribution,
productivity, prediction, probability, confidence, individual performance,
ranking, improvement, impact, and customer-facing semantics are outside this
contract.

The builder recomputes the complete movement from the validated C.1
projection and rejects any caller-supplied delta, percent change, or direction
that differs. Current D readback rebuilds the complete claim, packet, and
manifest from the current authoritative source graph and C.1 projection before
rendering. A bound Slice E readback additionally rebuilds the exact
hypothesis, plan, Measurement Cell, metric definition, family heads, canonical
core, deterministic HTML body, final binding, and four-artifact creation
attestation. A coherently rehashed artifact substitution therefore remains
non-renderable even when its internal hashes agree with each other.

Before artifact generation, the movement unit must match the compiled generic
Slice D vocabulary: `cases`, `count`, `days`, `hours`, `minutes`, `months`,
`percent`, `percentage_points`, `rate`, `ratio`, `seconds`, `share`, or
`weeks`. This boundary rejects identifier-bearing values, customer-authored
prose, monetary units, scores, and unsupported semantic text even when an
upstream Outcome Evidence or C.1 schema can store that value. Extending the
vocabulary requires a reviewed contract version; it is not caller-tunable.

The movement metric identifier must independently match the compiled
server-owned Slice D vocabulary represented by the `movement.metric_id` enum
in the synchronized JSON Schema. The vocabulary contains only reviewed,
aggregate metric identifiers from the shipped metrics libraries. Arbitrary
customer text, person-shaped identifiers, and unsupported claim-language
identifiers never enter an authorized artifact or readout. Extending the
vocabulary requires a reviewed contract version; upstream storage or C.1
acceptance does not extend Slice D authority.

The C.1 projection source system must independently match the compiled
server-owned Slice D source-system vocabulary represented by the synchronized
runtime and JSON Schema definitions. The source label is validated transiently
and the reserved artifacts retain only a domain-separated commitment to the
complete C.1 projection. Upstream storage, review, and C.1 release remain
non-authorizing for this boundary.

Reserved Slice D payloads never store raw organization, workflow, JBTD,
persona, source-object, readiness, or C.1 evidence identifiers. The authority
uses those identifiers transiently to reconcile the exact upstream graph,
then stores only domain-separated commitments for the slice, source graph,
readiness reference, and complete C.1 projection. The authenticated
organization remains the database row's tenant/RLS envelope, and the reserved
row's `workflow_family` is null; neither value is duplicated into artifact
payloads. These private commitments are storage-minimization bindings, not
public pseudonyms or person-level signals. Slice E adds a separate
commitment-only canonical identity core and final binding without exposing the
underlying selectors or row locators.

## Authority chain

1. Real-evidence materialization persists its generated scenario and seals the
   exact blueprint, metrics library, scenario, and review-independent Outcome
   Evidence content into materializer-owned readiness validation.
2. Accepted review is evaluated independently. Only the `review` envelope may
   change without invalidating the materializer seal; the exact accepted
   review and full accepted export are bound by the authorization manifest.
3. The backend derives the exact slice and source graph from authoritative
   stored lineage. Request IDs are equality selectors only.
4. One C.1 receipt is used only as an opaque selector. Its complete current
   readback projection is the sole movement input and must reconcile with the
   accepted export.
5. A serializable transaction locks and reloads all five source rows in
   deterministic order, then insert-or-exact-compares the reserved internal
   claim, packet, and manifest.
6. Post-commit C.1, source, artifact, and manifest reconciliation must pass
   before authorization is returned. HTML readback repeats current
   reconciliation, including C.1 revocation state.
7. When `canonical_identity_selector` is present, Slice E loads exact explicit
   hypothesis, plan, and Measurement Cell versions, verifies their durable
   family heads, HMAC-attested source edges, canonical slice, and unique
   version-bearing metric definition, then builds the canonical core before D
   artifact IDs.
8. The fixed renderer builds exact HTML only after the final D IDs exist. Its
   byte commitment enters a packet-derived fourth binding, and one
   Slice-E-specific HMAC attests all four finalized artifact projections.
9. All four artifacts are inserted or exact-compared atomically. Post-commit
   authorization and every bound readout rebuild the complete D/E chain,
   renderer bytes, and creation attestation.

## Immutable internal artifacts

The reserved object types are:

- `aggregate_authorized_claim`
- `aggregate_authorized_packet`
- `aggregate_claim_authorization_manifest`
- `canonical_identity_compatibility_binding` for a Slice E `BOUND` result

They are excluded from generic create, read, list, and upsert paths. Existing
`claim_boundary` and `executive_packet` objects remain compatible but
non-authoritative.

Claim and packet content hashes exclude their envelope IDs. The manifest core
binds the opaque slice, source-graph, readiness, and C.1 projection
commitments; approved source-content hashes; the non-identifying C.1 receipt;
policy; template; and claim/packet content hashes. Its hash derives the
manifest ID and separate domain-derived claim and packet IDs. Exact replay may
reuse the same three rows; a conflicting row is never updated or adopted.

For Slice E, an optional `canonical_identity_core_commitment` is included in
the claim content, packet content, and manifest core before these hashes and
IDs are derived. The renderer version is inside the committed core. After the
final D IDs exist, the fourth binding commits to those IDs and hashes plus the
exact rendered HTML bytes. Exact replay may reuse the same three-row D bundle
or four-row E bundle; a conflicting row is never updated or adopted.

## Compatibility and response states

Existing callers that omit `canonical_identity_selector` remain on the
compatible D-only path. A valid D-only authorization may retain its legacy
three-artifact response. New state-aware consumers receive
`canonical_identity_state: UNBOUND`, `source_bound: false`, and the same three
persisted artifact references.

A complete Slice E authorization returns
`canonical_identity_state: BOUND`, `source_bound: true`, the canonical core
commitment, and exactly four persisted references, one for each reserved
artifact. Only that state may set both HTML headers true.

If a selector is supplied, invalid shape, missing versions, stale or forked
sources, foreign ownership, cross-spliced lineage, metric/slice/window/source
mismatch, renderer drift, artifact conflict, or attestation failure returns
the fixed HOLD below. The server never treats an invalid supplied selector as
selector absence and never falls back to an unbound result.

## Failure posture

Every unauthorized `/value-chain/run` response, including `persist: false`,
is exactly:

```json
{
  "decision": "HOLD",
  "reason_family": "AGGREGATE_CLAIM_AUTHORIZATION_HELD",
  "persisted": []
}
```

It contains no movement, claim, packet, manifest, hash, source, or diagnostic
material. Generic spine execution may keep compatible upstream stages but
holds its claim and executive stages with null objects. Missing, legacy,
direct, stale, substituted, revoked, or mismatched HTML packet reads render
only the fixed held page.

A current legacy D-only readout may remain descriptively renderable, but
`x-ai-value-source-bound` and
`x-ai-value-canonical-identity-bound` are both `false`. A bound readout sets
both headers to `true` only after the deterministic binding, all current
sources and family heads, the four-artifact creation attestation, the declared
renderer version, and the exact returned UTF-8 bytes revalidate. No
independently rendered body may receive bound headers.

The synchronized JSON Schema is
[`aggregate-claim-authorization.schema.json`](../../../schemas/ai-value-intelligence/aggregate-claim-authorization.schema.json).
The Slice E binding contract and schema are
[`ai-value-canonical-identity-binding`](../ai-value-canonical-identity-binding/)
and
[`canonical-identity-binding.schema.json`](../../../schemas/ai-value/canonical-identity-binding.schema.json).
The governing behavioral requirements are in
[`harden-aggregate-claim-authorization`](../../../openspec/changes/harden-aggregate-claim-authorization/).
Slice E behavior is governed by
[`bind-canonical-identity-compatibility`](../../../openspec/changes/bind-canonical-identity-compatibility/).

These contracts add no endpoint, canonical event, suppression reason, tunable
threshold, deployment, production key change, or customer-facing output.
