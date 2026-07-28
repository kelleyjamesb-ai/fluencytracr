## Context

The repository currently makes privacy decisions inside several unrelated
modules:

1. generic metric rollups compute an org total from raw child values before
   child suppression;
2. behavioral rollups retain suppressed `originalCount` values and add them to
   visible function and org totals;
3. workflow aggregates and observability responses retain exact small
   cardinalities after a suppressed verdict;
4. Outcome Evidence reads return aggregate values and cohort sizes after a
   suppressed verdict; and
5. dashboard and behavioral-pattern queries expose multiple time buckets or
   adjacent comparisons without stable-cohort or non-overlap proof.

Filtering a suppressed row is not sufficient. Privacy must be evaluated over
the complete set of equations an authorized caller can observe across parent,
sibling, filter, source, and time-window queries.

## Goals

- Establish one authoritative, reusable disclosure decision.
- Make observable responses independent of the exact value of every held cell.
- Preserve independent `(workflow_id, jbtd_id, persona_id)` suppression.
- Preserve the existing five suppression reasons and all fixed thresholds.
- Keep ingestion/storage compatibility separate from disclosure authority.
- Keep Slice D claim semantics and Slice E canonical claim identity out of
  scope.

## Non-Goals

- Differential privacy, noise injection, query budgets, or tunable thresholds.
- New canonical events, suppression reasons, scores, rankings, or individual
  identifiers.
- Claim templates, model authorization, append-only claim trace, deployment,
  publication, or live proof.
- Authorizing moving-window or adjacent-window comparisons. Slice C holds them
  unless a later fixed-window contract supplies the missing proof.

## Decisions

### Covered surfaces

Slice C covers only these aggregate disclosure paths:

- legacy metric import, rollup, and dashboard projection;
- behavioral direct/connector import, rollup, signal query, pattern query,
  orientation, and workflow-visibility consumers;
- workflow classification aggregate and executive observability projection;
- aggregate Outcome Evidence HTTP reads; and
- enablement and spread aggregate projections.

V3 and Velocity paths that already null suppressed values and independently
gate exact slices receive regression coverage but no broader redesign unless a
test proves a bypass. AI Value inference, claim, model, export, readout, and
canonical identity artifacts are not covered by this authority.

### One aggregate disclosure policy

A pure `AggregateDisclosurePolicy` evaluates a complete privacy equation domain
and prior server-owned replay receipts before caller-selected filtering or
response shaping. A domain is bounded by:

- organization;
- exact mandatory workflow/JBTD/persona tuple for RELEASE;
- one privacy partition/equation identity spanning every algebraically related
  measure, hierarchy axis, and source mode;
- one server-owned immutable, non-overlapping temporal grid and granularity;
- one canonical fixed window;
- the approved disjoint hierarchy axis and source mode;
- measure or signal identities as cell attributes; and
- the atomic child cells and explicit parent-child lineage in that partition.

Missing or null exact-slice components are permitted only for legacy storage
and always HOLD. An undeclared cross-measure relationship, alternate source, or
cross-cutting axis also HOLDs. Separate query families cannot release
overlapping atomic lineage.

The domain has a stable server-owned slot identity that excludes values and
mutable submitted membership. A separate canonical content fingerprint covers
ordered atomic membership, values, lineage, canonical source provenance, and
window. Accepted source and identifier aliases normalize to the same slot. A
changed or incomplete content fingerprint cannot create a novel slot.

The pure decision is `RELEASE` or `HOLD`. Internal privacy diagnostics may identify
missing context, complementary suppression, ambiguous lineage, changed replay,
or unsafe windows, but those diagnostics are not canonical suppression
reasons and are not exposed as hidden-value-dependent metadata.

### Complete partitions, disjoint axes, and equation domains

The policy evaluates the complete partition, never only the rows selected by a
query. Team, role, and other cross-cutting axes are separate partitions unless
explicitly declared disjoint. They are never summed together by inference.
Caller-supplied parent rows cannot coexist as authority with server-derived
children for the same equation domain. Atomic lineage is checked across
measure names, hierarchy axes, and source modes, not only within one query
shape. One approved disjoint axis/source may release in a privacy domain;
overlapping alternate marginals HOLD.

Cohort membership, atomic-child enumeration, hierarchy lineage, canonical
source, axis disjointness, temporal grid, and completeness come from a
server-owned immutable privacy manifest or trusted canonical snapshot.
Caller-supplied assertions are candidate data only. If completeness cannot be
proved without new person-level data, the domain remains storage-only and
HOLDs.

Algebraic dependencies across counts, totals, percentages, ratios, shares,
bands, and concentrations are evaluated in the same privacy domain.
Undeclared dependencies HOLD rather than becoming separately releasable
measure families.

If any contributing child is suppressed, unknown, ambiguous, or storage-only,
every ancestor total containing that child is held. Released siblings may
remain visible because the dependent total is unavailable. A response
transcript must remain identical when only the exact value of a held child
changes.

### Storage is not disclosure

Existing aggregate ingestion remains additive and readable by internal storage
code. Missing exact slice, cohort, lineage, or fixed-window context produces a
storage-only row. Activity count never substitutes for cohort size. Suppressed
raw values may remain inside the restricted storage boundary only where
required for deterministic recomputation; no read surface or derived consumer
receives them.

Direct and connector imports normalize into the same privacy-domain shape.
Partial, mixed-source, or conflicting replacement cannot publish a new parent
beside stale children.

### Replay and temporal differencing

The pure policy receives prior replay receipts as input. An organization-wide,
durable, server-owned privacy journal shared by every principal, process,
direct importer, and connector worker records:

- stable privacy-domain slot identity and canonical content fingerprint;
- atomic-lineage fingerprint;
- value-independent public projection hash;
- temporal-grid and fixed-window identity;
- release version; and
- canonical-contribution fingerprint; and
- `RELEASE` or `HOLD`.

The journal receipt and admitted projection are committed atomically in the
same persistence transaction before a response can surface. Compare, decision,
version increment, and projection commit are serialized so concurrent first or
changed writes cannot both release. A failed, partial, unavailable, restart,
worker, principal, source-mode, or filter-dependent journal check returns HOLD.
The receipt is internal and confers no hypothesis,
measurement, evidence, model, readout, claim, or canonical-lineage authority.

An exact replay of the same complete family and value-independent disclosure
projection is allowed. A changed value for an already released family, a
partial replacement, or a novel overlapping equation is held.

The journal transaction also claims each opaque canonical contribution under a
unique organization/contribution key. A contribution already claimed by
another privacy slot holds the candidate, even when the caller changes source,
axis, lineage, or window labels. The content fingerprint is recomputed from
the exact projection and complete server-bound domain identity; the separate
public projection hash describes shape only and cannot authorize substituted
values.

An additional journal uniqueness key is derived from only the exact
organization/workflow/JBTD/persona slice. It deliberately excludes slot,
lineage, source, axis, temporal grid, window, and contribution membership.
Therefore an adjacent or otherwise alternate window for the same exact slice
collides even when every caller-visible label and contribution is changed.

The ADMIN-only release route accepts candidate data and the proposed
projection, never the manifest or canonical contribution list. It reloads
server authority inside the advisory-lock-governed `ReadCommitted` transaction
and returns a fixed HOLD posture when admission fails.

Release identity uses a concrete immutable UTC date range formatted
`YYYY-MM-DD/YYYY-MM-DD`. Relative observation labels such as `60d` or `90d`
describe the bounded projection but cannot establish release identity. A read
must supply the exact stored fixed-window id; reusing a relative token at a
later time cannot recompute or time-advance the stored projection.
The HTTP write boundary accepts separate JSON Schema `date` fields and
round-trip validates year, month, and day before deriving that internal range;
JavaScript date normalization cannot turn an impossible calendar date into an
alias.

Current moving-window time series and adjacent-week behavioral comparisons do
not carry a safe differencing mechanism. Every adjacent, rolling, overlapping,
or multi-window numeric comparison and derived trend therefore remains null,
empty, or held unconditionally in Slice C. A later separately governed
comparison contract would be required to relax this hold. One fixed, immutable,
non-overlapping bucket on the one approved grid and granularity may release
only when every other disclosure rule passes. Alternate widths, granularities,
unions, reordered windows, and time-advanced moving requests HOLD.

This privacy-domain identity is limited to privacy replay control. It is not
the append-only hypothesis/measurement/evidence/readout identity planned for
Slice E and has no claim-authorizing effect.

### Suppressed responses are value-independent

When product suppression or privacy HOLD applies:

- aggregate values and cohort sizes are null or omitted;
- suppressed evidence arrays are empty;
- exact classified/suppressed execution splits are zeroed or omitted;
- `include_suppressed` never returns hidden values or hidden-value-dependent
  row counts;
- pattern and trend consumers receive no raw stored signal; and
- suppression metadata cannot encode the held value.

Execution deduplication uses only an opaque server-side contribution token that
is stable and canonical for the same underlying contribution across direct and
connector ingestion, source/vendor aliases, caller identifiers, retries,
workers, restarts, and replay. A caller-supplied identifier cannot establish or
change that identity. It is never returned, logged in public output, or
interpreted as a person identifier. If the server cannot resolve canonical
contribution identity from existing aggregate-safe authority, the domain
HOLDs; it does not mint a fresh token per representation.

The public response shape remains additive or uses existing nullable/empty
representations. The five canonical suppression reasons remain unchanged.

## Acceptance Oracle

For any two datasets that differ only in a held value, held membership, or
sub-threshold contribution count, every observable transcript available to an
authorized caller must be byte-equivalent after normalizing only an explicitly
enumerated set of volatile transport fields. The transcript includes status,
body, import receipt, ordering, pagination totals/cursors, cache metadata,
audit/readback output, debug filters, and derived-consumer presence. Tests
exercise:

- parent plus sibling query sequences;
- direct and connector import parity;
- identifier/source aliases and cross-measure count/ratio/percentage equations;
- team/role overlap and false disjointness assertions;
- `include_suppressed`;
- suppressed Outcome Evidence and workflow observability;
- exact replay, restart, multi-principal access, partial replacement, and
  concurrent conflicting writes;
- adjacent, overlapping, alternate-width, union, reordered, and time-advanced
  windows; and
- dashboard, pattern, orientation, visibility, enablement, spread, audit,
  pagination, cache, and debug surfaces.

As a positive control, a complete fixed-window family may release when every
constituent cell independently passes existing gates.

## Risks And Mitigations

- **Legacy dashboards become sparse:** keep shapes stable with null/empty held
  values and document the privacy status; never fabricate a replacement value.
- **A release journal preempts Slice E:** key it only to non-person stable
  privacy slot/content/projection fingerprints and prohibit claim, model, or
  canonical-lineage authority. Store no prompts, outputs, individual
  identities, or economic semantics.
- **Raw-store consumers bypass the policy:** route every aggregate sink through
  the admitted projection and add raw-injection regression tests.
- **Over-broad hierarchy inference:** require one explicit axis and lineage;
  missing or mixed context holds.

## Migration

No backfill and no inferred identity. Existing rows remain storage-only until
new complete privacy context is supplied. Existing unsafe rollups and temporal
comparisons become held at read time. No deployment or live-data migration is
part of Slice C.
