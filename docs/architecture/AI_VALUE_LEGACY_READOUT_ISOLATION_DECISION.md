# AI Value Legacy Readout Isolation Decision

Status: decision only. This document does not create backend routes, frontend
UI, Prisma schema changes, migrations, repository methods, persistence writes,
live Glean or BigQuery execution, export packages, rendered customer readouts,
confidence math, ROI, causality, productivity, probability, or customer-facing
financial output.

Phase: `phase-ai-value-legacy-readout-isolation-decision`

Decision: `ROUTE_AND_UI_GUARD_REQUIRED`

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

`ROUTE_AND_UI_GUARD_REQUIRED`

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

## 6. Required Future Route Guard

Before any new source-bound readout, customer projection, or export work, the
backend route layer must enforce all required postures for legacy readout
routes. The selected decision is `ROUTE_AND_UI_GUARD_REQUIRED`; a label-only
guard is not sufficient.

| Guard posture | Requirement |
| --- | --- |
| `internal_only_label` | Response includes internal/prototype/legacy audience boundary |
| `role_limited` | Route is restricted to internal reviewer/admin roles |
| `source_bound_projection_required` | Customer-safe readout routes must use a separate projected source-bound contract |
| `export_blocked` | Route cannot be used to download or package customer-facing artifacts |
| `invalid_payload_fail_closed` | Stored packet that no longer validates cannot render |

Route tests must cover:

- cross-org denial;
- role denial;
- generic payload exposure denial for customer-facing roles;
- invalid packet fail-closed behavior;
- raw/person-level payload rejection;
- finance/customer-facing output denial;
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

Measurement Cell persistence promotion is blocked until this decision is
accounted for.

If implementation begins later, the implementation slice must decide whether
to:

- add route guard tests;
- add UI labels;
- isolate legacy readout routes from customer roles;
- replace legacy links with source-bound projection links;
- keep legacy routes internal/prototype only.

This decision does not itself authorize that implementation.

## 10. Verification

When this decision is changed, run:

```bash
git diff --check
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
```

Expected: all commands exit `0`.
