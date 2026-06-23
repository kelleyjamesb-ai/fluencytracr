# AI Value Pipeline Promotion Decision

Status: productization boundary decision. This document does not create
backend routes, frontend UI, Prisma schema changes, migrations, repository
methods, persistence writes, live Glean, Sigma, or BigQuery execution,
ingestion jobs, export packages, rendered customer readouts, confidence math,
ROI, causality, productivity, probability, or customer-facing financial output.

Phase: `phase-ai-value-pipeline-promotion-decision`

Decision:
`PROMOTE_SAVED_FIXTURE_VALIDATION_BOUNDARY__HOLD_LIVE_PIPELINE_AND_MANIFEST_PERSISTENCE`

## 1. Purpose

The repo now has an executable saved-fixture path:

```text
saved scrubbed aggregate fixture
-> Controlled Aggregate Pipeline Dry Run
-> Controlled Aggregate Connector Adapter
-> Controlled Aggregate Manifest Validation
-> Source Inventory / Aggregate Extraction / Pipeline Run Review manifests
```

This decision records what that path promotes and what remains blocked before
a non-live BigQuery/Sigma aggregate connector boundary validator can begin.

## 2. Direct Answer

Promote the saved-fixture connector boundary for internal operator review.

Do not promote live BigQuery/Sigma execution.

Do not promote controlled aggregate manifest persistence.

Do not promote Measurement Cell Series persistence.

## 3. Promoted Scope

The following are promoted for internal operator review only:

- saved aggregate fixture adapter boundary;
- export-shaped aggregate review packet over `bigquery_export` and
  `sigma_export` source-system shapes;
- non-persisted Source Inventory Manifest validation;
- non-persisted Aggregate Extraction Manifest validation;
- non-persisted Pipeline Run Review Manifest validation;
- compact manifest refs and hashes;
- deterministic Source Package Review Queue posture refs as eligibility context
  only;
- approved expectation-path binding;
- Data Spine alignment envelope;
- false feed and false boundary-policy assertions;
- manual operator promotion-review context.

A passed manifest validation package may be described only as:

```text
PASSED_CONTROLLED_AGGREGATE_MANIFEST_VALIDATION
```

It must not be described as Source Package clearance, Measurement Cell
readiness, manifest persistence, live connector readiness, customer-facing
readiness, finance readiness, or confidence-model readiness.

## 4. Held Scope

The following remain blocked:

- live BigQuery execution by FluencyTracr;
- live Sigma execution by FluencyTracr;
- live Glean queries;
- customer connector execution;
- credentials, service accounts, OAuth tokens, or warehouse secrets;
- SQL text, query text, job IDs, query refs, dashboard URLs, API handles, or
  live run handles;
- raw rows, dashboard rows, prompt text, transcripts, files, direct
  identifiers, row IDs, span IDs, hashed identifiers, or joinable person keys;
- controlled aggregate manifest persistence;
- pipeline run persistence;
- connector run persistence;
- `measurement_cell_series_snapshots`;
- Evidence Continuity persistence;
- backend routes, frontend UI, export jobs, or customer share packages;
- confidence math, probability output, research-model promotion, ROI, EBITDA,
  finance output, causality, productivity, financial attribution, or
  customer-facing financial output.

## 5. Manifest Persistence Decision

Controlled aggregate manifest persistence is held.

Future persistence may be reconsidered only with a separate decision naming the
exact table scope and write path. That later decision must prove:

- manifests are recomputed from reviewed saved aggregate fixture inputs;
- persisted rows contain compact refs and hashes only;
- full manifest payloads are absent by default;
- raw source context, raw rows, query text, prompts, transcripts, identifiers,
  source package payloads, full handoff bundles, and full expectation-path
  registries cannot be stored;
- stale validation summaries cannot pass;
- wrapper-level JSONB smuggling cannot pass;
- live BigQuery/Sigma/Glean execution remains false;
- Source Package clearance, Measurement Cell readiness, Series persistence,
  finance output, confidence output, and customer-facing output remain false.

Until that decision exists, the manifest validation package is executable
review context only.

## 6. Series Persistence Decision

Measurement Cell Series persistence remains held by
[AI Value Measurement Cell Series Persistence Promotion Decision](./AI_VALUE_MEASUREMENT_CELL_SERIES_PERSISTENCE_PROMOTION_DECISION.md).

The repeated Day 0 / 30 / 60 / 90 / 180 / 365 pilot package is useful
continuity evidence, and backend-internal `measurement_cell_snapshots` are now
promoted separately. That still does not authorize durable Series product
state. A later Series decision must name the exact table, projection, and
read-path purpose before any `measurement_cell_series_snapshots` work starts.

## 7. Governed BigQuery/Sigma Boundary

The next safe BigQuery/Sigma work is a connector-boundary design and validator,
not a live connector.

Allowed next boundary:

```text
approved Glean/customer execution environment
-> aggregate extraction performed upstream
-> k-min and suppression enforced upstream
-> source-owner attestation
-> reviewed aggregate export ref
-> FluencyTracr saved aggregate connector-boundary validation
```

Blocked boundary:

```text
FluencyTracr receives credentials
-> FluencyTracr runs SQL/dashboard/API queries
-> FluencyTracr receives raw rows or query text
-> FluencyTracr stores pipeline runs or customer-facing output
```

The connector-boundary validator may define required metadata for:

- source system: `bigquery_export` or `sigma_export`;
- source owner role;
- source owner attestation;
- aggregate definition ref, not SQL text;
- approved output fields;
- aggregate grain;
- baseline and comparison windows;
- workflow/function/cohort binding;
- k-min and suppression posture;
- freshness posture;
- legal/trust review posture when required;
- blocked uses and false boundary policy.

It must reject:

- project/dataset/table names when they expose sensitive source detail;
- SQL/query text;
- job IDs, query IDs, API run IDs, dashboard URLs, export URLs, connector job
  IDs, and active run handles;
- credentials or secrets;
- raw rows, dashboard rows, row IDs, span IDs, prompts, transcripts, files, or
  identifiers;
- ROI, EBITDA, finance-output, causality, productivity, probability,
  confidence, score-like, or customer-facing output fields.

## 8. What This Unlocks

This decision unlocks only the next non-live executable layer:

```text
BigQuery/Sigma Aggregate Connector Boundary Plan
```

That layer now lives at
[AI Value Aggregate Connector Boundary Plan](../contracts/ai-value-aggregate-connector-boundary-plan/README.md).
It validates a reviewed aggregate export plan without executing it. It produces
an internal operator-review boundary decision, not a source package, not a
Measurement Cell, not a persisted manifest, and not a customer-facing output.

The BigQuery-specific non-live follow-on now lives at
[AI Value BigQuery Aggregate Export Review](../contracts/ai-value-bigquery-aggregate-export-review/README.md).
It accepts only a passed `bigquery_export` boundary plan and produces compact
upstream-attested aggregate export review metadata. It does not retain SQL,
query text, BigQuery job metadata, project/dataset/table refs, credentials, raw
rows, or customer-facing output, and it does not promote live connector
implementation.

## 9. Verification

When this decision is changed, run:

```bash
git diff --check
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
```

Expected: all commands exit `0`.
