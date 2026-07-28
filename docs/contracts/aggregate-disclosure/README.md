# Aggregate Disclosure Privacy Contract

This contract defines the Slice C boundary between restricted aggregate
storage and numeric disclosure. It applies only to:

- legacy metric rollups and dashboard projections;
- behavioral direct/connector rollups, signal and pattern reads, orientation,
  and workflow visibility;
- workflow classification aggregates and observability;
- Outcome Evidence aggregate reads; and
- enablement and spread projections.

It does not authorize AI Value inference, model eligibility, claims, exports,
readouts, economic interpretation, deployment, or live publication.

## Decisions

Privacy admission is independent from the existing product
`SURFACE`/`SUPPRESS` verdict:

- `RELEASE` means one complete server-authoritative fixed-window privacy domain
  may expose its bounded public projection.
- `HOLD` means storage may retain the aggregate, but every numeric read and
  derived consumer remains null, empty, or safety-held.

Privacy diagnostics are internal and are not additions to the five canonical
suppression reasons.

Covered HTTP responses expose the additive `privacy_decision` posture where
the response contract supports it. Product and privacy decisions remain
independent inside the restricted boundary. A privacy-held public transcript
must not encode a held-value-dependent product transition, reason, row
membership, bucket identity, or derived category. Legacy collection reads
therefore return an empty collection, and keyed reads return a fixed
value-independent `HOLD` shape.

## Required Release Context

`RELEASE` requires all of the following:

- non-empty `workflow_id`, `jbtd_id`, and `persona_id`;
- server-verified cohort, complete atomic-child lineage, hierarchy axis,
  canonical source, and one immutable temporal grid;
- stable canonical aggregate-safe contribution tokens;
- one stable non-person privacy slot and a separate content fingerprint;
- no suppressed child, ambiguous lineage, overlapping equation, or multi-window
  comparison; and
- a durable organization-wide replay receipt committed atomically with the
  admitted public projection.

Caller assertions cannot establish completeness, disjointness, source
authority, or contribution identity. Legacy rows missing the context above are
storage-only.

## Complementary And Temporal Protection

If any child is held, every dependent parent is held. Team, role, source, and
measure aliases share one collision domain when they can form equations over
the same population. Counts, totals, percentages, ratios, shares, bands, and
concentrations cannot be split into separately releasable families.

Slice C does not authorize adjacent, rolling, overlapping, alternate-width,
union, reordered, time-advanced, or multi-window numeric comparison. Those
values and derived trends remain held.

## Replay Journal

The local schema adds `aggregate_privacy_manifests`,
`aggregate_privacy_release_journal`, and
`aggregate_privacy_contribution_claims`. The manifest is the server-owned
completeness authority; callers cannot supply or override it. The release
transaction loads that manifest, evaluates the complete privacy domain and
existing organization-wide slot, lineage, and opaque contribution claims, then
commits the admitted projection, receipt, and contribution claims together.
The content fingerprint is recomputed over the exact projection values and
complete server-bound domain identity; a shape-only hash cannot authorize a
value substitution. A unique organization/contribution constraint prevents
the same canonical population from being released under a different slot,
source, axis, or window. The first admitted projection establishes the slot.
Exact replay returns the stored admitted projection, not a new caller-supplied
body. A changed fingerprint, contribution set, lineage, projection, grid,
window, or version returns `HOLD` and never mutates the established row.
Database unavailability also returns `HOLD`.

The journal also derives a collision fingerprint from only the exact
`(org_id, workflow_id, jbtd_id, persona_id)` slice. That fingerprint excludes
slot, lineage, source, axis, grid, window, and contribution membership, and is
unique per organization. As a result, an adjacent or alternate window cannot
create a second release by changing those labels or using a disjoint
contribution set. Slice C permits exact replay of one fixed release, not a
numeric time series.

The ADMIN-only `POST /orgs/:orgId/aggregate-privacy/releases` path is the
production integration point. It accepts a bounded candidate and exactly one
schema-valid `RELEASE` observability row, but never a manifest or contribution
list. Free-form JSON, product-suppressed rows, interpretation strings, and
multi-row projections are rejected before journal access. The transaction
reloads authority from server-owned storage. A held response exposes only a
fixed privacy posture; internal diagnostics and replay receipts are not
returned.
The observability read path may return an exact stored projection only when a
requested `privacy_slot_id` and concrete `fixed_window_id` resolve to a durable
`RELEASE` row and the stored response validates for the requested organization
and observation length. The fixed identity is an immutable UTC
`YYYY-MM-DD/YYYY-MM-DD` range; relative tokens such as `60d` never establish
release identity. Every other case returns the existing empty held projection.
The public write contract supplies `window_start` and `window_end` as separate
JSON Schema `date` fields; runtime validates each calendar date canonically
before deriving the internal range identity.

The receipt stores no prompts, outputs, raw events, individual identities,
claim semantics, model authority, or economic meaning. It is a privacy replay
control only and does not preempt the Slice E canonical compatibility chain.

The migration and route are locally implemented only in this slice. The
migration has not been applied to a live project, so no live release path is
being claimed.

## Value-Independent Output

When privacy is `HOLD` or the product verdict is `SUPPRESS`, public and derived
surfaces expose no hidden aggregate value, cohort size, evidence identifier,
original count, exact allowed/suppressed split, hidden-value-dependent result
count, bucket date, or derived category. Legacy held rows are not passed to
orientation or visibility consumers because their presence alone is
disclosive.
