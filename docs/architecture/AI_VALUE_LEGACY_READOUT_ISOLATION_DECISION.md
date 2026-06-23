# AI Value Legacy Readout Isolation Decision

Status: backend legacy readout route guard implemented. This document does not
create frontend UI, Prisma schema changes, migrations, repository methods,
persistence writes, live Glean or BigQuery execution, export packages,
source-bound rendered customer readouts, confidence math, ROI, causality,
productivity, probability, or customer-facing financial output.

Phase: `phase-ai-value-legacy-readout-isolation-decision`

Decision: `ROUTE_GUARD_IMPLEMENTED__UI_GUARD_AND_SOURCE_BOUND_PROJECTION_HELD`

## 1. Purpose

The current productization gate says the governed internal evidence spine is
operator-review ready, but customer productization remains blocked. The
remaining risk is that older generic object and rendered readout paths can make
the product appear more mature than the governed source-bound spine permits.

This decision isolates legacy readout behavior before Measurement Cell
persistence, source-bound customer projection, export governance, or confidence
research can proceed.

## 2. Scope

Legacy readout surfaces include:

- `executive_packet` objects stored through generic `ai_value_objects`;
- HTML/readout render paths built from legacy packets;
- frontend or journey links that open sponsor/executive readout output;
- prototype readout pages;
- any generic object detail response that returns full payloads rather than
  source-bound projections.

These surfaces may remain useful for demo, internal review, or historical
compatibility. They must not become product proof.

## 3. Decision

`ROUTE_GUARD_IMPLEMENTED__UI_GUARD_AND_SOURCE_BOUND_PROJECTION_HELD`

Reason:

- `ai_value_objects` is compatibility/demo storage, not authoritative proof;
- older `executive_packet` output is not source-bound Executive Readout
  Snapshot output;
- rendered HTML output can look customer-ready even when the newer governed
  snapshot/readout boundary says rendered customer readouts remain blocked;
- generic detail routes can expose full payloads, which is incompatible with a
  future customer projection boundary;
- source-bound readout projection, export governance, and legal/trust review
  are not yet promoted.
- the backend legacy readout HTML route now requires an internal reviewer/admin
  role, returns legacy/internal boundary headers, injects the required
  internal/prototype audience label into the HTML, and still fails closed when
  the stored packet no longer validates.
- the generic object detail route now blocks `EXEC_VIEWER` access to full
  legacy `executive_packet` payloads.
- the legacy HTML route no longer attaches outcome evidence by workflow-family
  fallback; it only renders outcome evidence when an explicit readiness source
  reference is present, valid for readout, and `ACCEPTED` with clean
  attachment cross-checks.
- shared legacy packet validation now fails closed on surprise top-level fields,
  unexpected nested section fields, unsafe source-ref keys or values, unsafe
  nested field keys after normalization, unsafe scalar values such as
  prompts/transcripts/query text/identifiers, unsafe finance/confidence language
  hidden behind caveats, and customer-facing, causal, or realized-financial
  authorization branches.

## 4. Allowed Current Use

Legacy readout paths may be described only as:

- `legacy compatibility surface`;
- `prototype surface`;
- `internal review surface`;
- `non-authoritative demo readout`;
- `not source-bound Executive Readout Snapshot output`.

They may be opened internally only when the audience boundary is clear.

## 5. Blocked Current Use

Do not describe or use legacy readout paths as:

- customer-facing rendered readout;
- source-bound Executive Readout Snapshot;
- export package;
- finance-ready artifact;
- ROI evidence;
- EBITDA evidence;
- causality evidence;
- productivity evidence;
- confidence or probability output;
- Measurement Cell continuity proof;
- authoritative product state;
- customer-safe claim output.

## 6. Implemented Route Guard

Before any new source-bound readout, customer projection, or export work, the
backend route layer must enforce all required postures for legacy readout
routes. The selected route decision is now implemented for the legacy HTML
route. A label-only guard remains insufficient.

| Guard posture | Requirement |
| --- | --- |
| `internal_only_label` | Implemented: response includes internal/prototype/legacy audience boundary |
| `role_limited` | Implemented: route is restricted to internal reviewer/admin roles |
| `source_bound_projection_required` | Customer-safe readout routes must use a separate projected source-bound contract |
| `export_blocked` | Implemented for legacy HTML: no download disposition, `no-store`, and export-authorized false header |
| `invalid_payload_fail_closed` | Implemented: stored packet that no longer validates cannot render |
| `generic_payload_exposure_denied` | Implemented: `EXEC_VIEWER` cannot fetch full `executive_packet` payloads through the generic detail route |
| `explicit_source_ref_only` | Implemented: outcome evidence is not attached by latest-workflow-family fallback |
| `accepted_evidence_only` | Implemented: submitted/rejected outcome evidence cannot attach even when explicitly referenced by readiness |
| `explicit_context_ref_only` | Implemented: engagement and AI Fluency kickoff context are not attached by workflow-family fallback |
| `stale_readiness_binding_denied` | Implemented: readiness must match packet workflow, value route, and upstream refs before it can provide outcome evidence |
| `nested_payload_smuggling_denied` | Implemented: runtime packet validation rejects unexpected nested section fields, unsafe source refs, and unsafe values hidden inside caveated text |

Route tests must cover:

- cross-org denial;
- role denial;
- generic payload exposure denial for customer-facing roles;
- invalid packet fail-closed behavior;
- raw/person-level payload rejection;
- finance/customer-facing output denial;
- no-export/no-store headers;
- explicit source-ref-only evidence attachment;
- accepted-only outcome evidence attachment;
- explicit context-ref-only engagement/fluency attachment;
- stale readiness binding denial;
- nested payload, source-ref, and caveat smuggling denial;
- caveat and blocked-claim carry-forward.

## 7. Required Future UI Guard

Before any UI or workflow link opens a legacy readout path, the UI must show
the audience boundary:

```text
Internal/prototype readout. Not source-bound customer output.
```

Future customer-facing readout UI must not reuse generic `executive_packet`
payloads. It must use a source-bound projection contract that carries:

- source refs;
- window provenance;
- caveats;
- blocked uses;
- blocked claims;
- missing/held/suppressed/not-computed evidence;
- privacy and k-min posture;
- audience boundary;
- export prohibition unless separately governed.

## 8. Persistence Boundary

`ai_value_objects` remains compatibility/demo storage only.

It must not become authority for:

- source-bound evidence proof;
- Measurement Cell continuity;
- Measurement Cell Series continuity;
- Claim Readiness state;
- Executive Readout state;
- customer-facing value state;
- finance or model readiness.

Authoritative future readout persistence, if promoted, must come from a
separate source-bound Executive Readout Snapshot projection and promotion
decision.

## 9. Promotion Impact

Measurement Cell snapshot persistence has been promoted separately for
backend-internal compact lineage only. This decision is now accounted for at the
legacy backend route level, but customer-facing readout/productization remains
blocked.

Remaining implementation, if promoted later, must decide whether to:

- add UI labels;
- replace legacy links with source-bound projection links;
- keep legacy routes internal/prototype only.

This decision does not authorize source-bound customer projection, exports,
frontend UI, rendered customer readouts, customer-facing financial output,
confidence math, ROI, causality, productivity, or probability output.

## 10. Verification

When this decision is changed, run:

```bash
git diff --check
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
```

Expected: all commands exit `0`.
