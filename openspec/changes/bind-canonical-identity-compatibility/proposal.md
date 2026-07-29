# Change: Bind canonical identity compatibility

## Why

Slice D now authorizes one aggregate descriptive movement from exact admitted
evidence and comparison-privacy readback, but its private commitments do not
connect that claim to one immutable Discovery hypothesis, measurement-plan
version, metric-definition version, or Measurement Cell version. The HTML
readout currently labels any current Slice D bundle `source-bound` even when
that complete identity chain has not been proved.

Mutable IDs, latest-version lookups, or compatible-looking records must not
choose canonical lineage. Slice E adds one append-only compatibility binding
so a readout is called source-bound or canonical only after the complete
server-revalidated chain agrees.

## What Changes

- Add an optional, approved exact-slice binding to new Measurement Plan
  versions. Existing plans remain valid inputs to existing consumers but
  cannot establish Slice E authority without that binding.
- HMAC-attest new E-capable Value Hypothesis creation and stamp additive,
  server-owned, HMAC-attested parent-version commitments when an E-capable
  Measurement Plan or Measurement Cell Snapshot is created. Caller selectors
  locate those exact sources and edges but never choose lineage.
- Add one server-owned canonical identity core over an exact immutable Value
  Hypothesis version, Measurement Plan version, Measurement Cell Snapshot
  version, separately versioned canonical metric-definition commitment, exact
  slice/windows, Slice B/C.1 evidence lineage, current Slice D source graph,
  and the fixed readout renderer version.
- Bind that core into the Slice D manifest and packet before their
  content-addressed IDs are derived, then atomically persist one reserved,
  append-only final binding for the versioned deterministic rendered readout.
- Serialize E sealing with hypothesis, plan, and cell append writers through
  deterministic source-family advisory locks so a concurrent child cannot
  make a selected version stale without detection.
- Add one Slice-E-only append-only PostgreSQL family-head journal, maintained
  by source-table insert triggers, plus UPDATE/DELETE guards and restricted
  journal privileges. E sealing and readout must exact-match the durable head,
  so deleting a legitimately attested tail cannot resurrect stale authority.
- Require a Slice-E-specific, service-held HMAC creation attestation over the
  complete four-artifact bundle before canonical authority or bound headers
  can be returned. This does not reuse or modify the C.1 attestation system.
- Treat caller IDs and versions as equality selectors only. Reject missing,
  latest-only, stale, foreign, mutable, ambiguous, forked, or cross-spliced
  lineage without silently falling back to an unbound result.
- Rebuild and exact-compare the complete identity chain on current readout.
  Only a fully valid binding sets source-bound/canonical identity status.
- Preserve existing request and artifact compatibility additively; unbound
  legacy and Slice D-only paths remain non-canonical and lose authority to set
  the source-bound label.

## Impact

- Affected specs: `ai-value-platform`
- Affected code: shared Measurement Plan and canonical identity contracts;
  backend immutable AI Value persistence, aggregate claim authorization, value
  chain, HTML readout, and focused PostgreSQL verification
- One additive Slice E migration artifact for the family-head journal,
  source-table triggers, and ACLs is included and verified only in local/CI
  PostgreSQL. No production migration application, endpoint, deployment, C.1
  key/journal/provisioner change, Slice F trace,
  customer-facing output, model execution, canonical event, suppression
  reason, threshold, individual field, scoring, ranking, ROI, causality,
  attribution, productivity, or prediction
