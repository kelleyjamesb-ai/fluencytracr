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

## Measurement-Model Calibration Boundary

The follow-on `bayesian_fluency_measurement_model` remains non-runtime. The
current slice defines only the calibration contract:
`PREREQUISITES_DEFINED_CALIBRATION_INCOMPLETE`.

Calibration requires validated aggregate `AIFluencyInstrumentSnapshot` waves,
complete finite nonnegative aggregate uncertainty for the overall estimate and
all five dimensions, reliability or sufficient aggregate precision evidence,
coverage/missingness/respondent-composition posture, immutable source refs and
hashes, k-min posture, and explicit passing source-admissibility states. These
dimension-level snapshots may supply longitudinal context, but they are not
sufficient to identify a latent measurement model or comparable change across
waves. A later proposal must define privacy-safe aggregate sufficient
statistics, exact form/item/scoring versions, form compatibility or equating,
and longitudinal measurement-invariance gates before any calibration artifact
can exist.

This boundary does not fit latent traits, produce posterior output, authorize
customer-facing confidence or probability, create persistence, add routes/UI,
run connectors, admit real data, or emit ROI, causality, productivity, finance,
HR, ranking, or economic output. Missing uncertainty remains a HOLD condition
and must not be solved by respondent-level export or invented precision.
OpenSpec task `5.5` remains incomplete until calibration is implemented,
executed, and independently accepted.

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
Those fields remain truthful for the V1 smoke artifact. Later exact-scope
changes added state-space/NUTS concordance and accepted replicated interval
coverage, null false-signal, floor, lag-recovery, shock, and negative-control
evidence without converting the smoke artifact into a production or real-data
artifact.

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
