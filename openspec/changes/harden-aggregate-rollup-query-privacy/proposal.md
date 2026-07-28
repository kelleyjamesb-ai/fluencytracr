# Change: Harden Aggregate Rollup And Query Privacy

## Why

Current aggregate paths suppress some child cells while still exposing exact
parent totals, suppressed cardinalities, or adjacent-window comparisons.
Authorized callers can therefore reconstruct values that the suppression
decision intended to withhold. Direct and connector imports can also replace
only part of a release family, creating a new equation beside stale siblings.

Slice C needs one fail-closed disclosure authority before aggregate values are
used by dashboards, behavioral patterns, observability, Outcome Evidence, or
derived consumers.

## What Changes

- Add one pure aggregate disclosure policy for complete privacy equation
  domains, with server-owned replay state as an explicit input.
- Hold dependent parent totals when any contributing child is suppressed,
  unknown, non-disjoint, or missing required privacy context.
- Make suppressed responses value-independent: no hidden aggregate value,
  cohort size, evidence identifier, or exact allowed/suppressed split.
- Keep fixed exact-slice releases independent by workflow, JBTD, and persona.
- Permit byte-stable replay of an identical released family while holding
  changed, partial, mixed-source, overlapping, or adjacent-window equations.
- Route the enumerated aggregate read surfaces and derived consumers through
  the same privacy-admitted projection.
- Preserve legacy ingestion as storage-only when the required privacy context
  is absent.

## Impact

- Affected specs: `aggregate-disclosure`, `outcome-evidence`
- Affected code: aggregate suppression/rollup services, behavioral import and
  query paths, workflow observability, Outcome Evidence reads, dashboard
  projections, enablement/spread projections, shared additive schemas,
  persistence keys, focused tests, and contract documentation
- Compatibility: legacy aggregate rows remain ingestible and stored but cannot
  become numeric public disclosure without complete privacy context
- Governance: no new canonical event, suppression reason, tunable threshold,
  override, individual field, score, ROI, causality, prediction, productivity,
  ranking, claim template, or customer-facing economic output
