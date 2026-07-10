# Design: Snapshot Boundary And Longitudinal Synthetic Proof

## Scope

This change implements Phase 2B as an isolated synthetic prototype. It is not
production calibration and not a promotion decision.

## Source-Independent Snapshot Boundary

The current AI Fluency source path is:

```text
AI Fluency Google Sheet
-> Apps Script aggregate adapter
-> Aggregate Readiness Export
-> aggregate parser/import runner
-> governed aggregate source candidate
```

That path remains an adapter. The model-family boundary consumes a canonical
aggregate `AIFluencyInstrumentSnapshot` shape with source refs and source
hashes. The snapshot validator rejects respondent-level fields, direct
identifiers, raw survey rows, HR/personnel fields, confidence/probability/ROI
output fields, and unsafe source values.

Missing standard errors or reliability estimates remain visible. Missing
measurement uncertainty blocks full Fluency measurement-model authorization
but does not require respondent-level export.

## Persistence Boundary

Prisma/Postgres remains the current durable persistence stack. Existing AI
Value tables include hypotheses, measurement plans, source refs, evidence
snapshots, claim-readiness snapshots, executive-readout snapshots, pilot runs,
Measurement Cell snapshots, and customer data model snapshots.

No current promotion decision authorizes a dedicated
`ai_fluency_instrument_snapshots` table for this modeling slice. This change
therefore defines contract and projection shape only and does not add or write
any table, migration, backend repository, route, UI, export, or persistence
job.

## Longitudinal Proof Path

The Python implementation is a sibling path to the current DiD harness:

- `design_router.py` keeps unsupported designs fail-closed and preserves DiD
  routing for two-group pre/post designs.
- `longitudinal_types.py` defines aggregate synthetic inputs.
- `longitudinal_synthetic.py` generates clean, null, and negative-control
  scenarios.
- `longitudinal_model.py` fits a Bayesian Gaussian longitudinal smoke model
  with separate Velocity and Breadth exposures, Depth as synthetic pathway
  context only, and an explicit AR(1) residual diagnostic.
- `longitudinal_artifact.py` emits a strict internal-only artifact.

The model uses a closed-form Gaussian posterior approximation for this smoke
slice. The artifact labels this as
`closed_form_gaussian_posterior_smoke_not_nuts`, sets
`synthetic_smoke_only=true`, and sets `replicated_calibration_complete=false`.
Full NUTS sampler implementation, replicated interval coverage, null
false-eligibility, lag recovery, common-shock robustness, and model-selection
validation remain future work.

## TypeScript Boundary

TypeScript validates the Python-emitted artifact only. It does not compute
posterior values, diagnostics, pathway states, or model quantities. The schema
rejects unknown fields, hash drift, source-hash mismatch, unsafe output flags,
respondent/HR/person-level fields, forged unsupported-route claims, and any
attempt to authorize customer output, confidence, probability, ROI, finance,
causality, productivity, persistence, routes, UI, exports, readouts, or
connectors.

## Risks

- **Smoke proof overclaim:** mitigated by schema pins and docs stating no
  replicated calibration or production promotion.
- **Source coupling:** mitigated by adapter parity tests across Apps Script,
  controlled JSON, and future API fixtures.
- **Persistence creep:** mitigated by no backend/prisma edits and explicit
  future-table proposal language only.
- **DiD weakening:** mitigated by adding sibling modules instead of mutating
  the current DiD model or artifact schema.
