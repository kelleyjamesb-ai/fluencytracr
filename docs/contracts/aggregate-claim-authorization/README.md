# Aggregate Claim Authorization

Policy version: `FT_AGGREGATE_CLAIM_AUTHORIZATION_2026_07`

Slice D adds one server-owned authorization decision for one internal,
aggregate, descriptive metric movement. It does not promote import approval,
accepted review, exact-slice admission, C.1 comparison privacy, readiness, or
model eligibility into claim authority. Every state remains independent and
must reconcile for the same exact source graph.

The only authorized template is
`FT_AGGREGATE_DESCRIPTIVE_CLAIM_V1`. It copies one baseline and comparison
value from one successful C.1 readback, computes one bounded mechanical
movement, and labels it `OBSERVED_NON_ATTRIBUTABLE`. It authorizes no model
use and no customer-facing output. ROI, money, causality, attribution,
productivity, prediction, probability, confidence, individual performance,
ranking, improvement, impact, and customer-facing semantics are outside this
contract.

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

## Immutable internal artifacts

The reserved object types are:

- `aggregate_authorized_claim`
- `aggregate_authorized_packet`
- `aggregate_claim_authorization_manifest`

They are excluded from generic create, read, list, and upsert paths. Existing
`claim_boundary` and `executive_packet` objects remain compatible but
non-authoritative.

Claim and packet content hashes exclude their envelope IDs. The manifest core
binds all source, C.1, policy, template, claim-content, and packet-content
bytes. Its hash derives the manifest ID and separate domain-derived claim and
packet IDs. Exact replay may reuse the same three rows; a conflicting row is
never updated or adopted.

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

The synchronized JSON Schema is
[`aggregate-claim-authorization.schema.json`](../../../schemas/ai-value-intelligence/aggregate-claim-authorization.schema.json).
The governing behavioral requirements are in
[`harden-aggregate-claim-authorization`](../../../openspec/changes/harden-aggregate-claim-authorization/).

This implementation adds no table, endpoint, canonical event, suppression
reason, tunable threshold, migration, deployment, production key change, or
customer-facing output.
