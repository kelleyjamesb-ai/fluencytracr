# AI Value Live Pipeline Concept Review

Status: executable internal design-review contract only. This contract does not
authorize backend routes, frontend UI, Prisma schema changes, migrations,
repository methods, persistence writes, live Glean, Sigma, or BigQuery
execution, ingestion jobs, export packages, rendered customer readouts,
contribution-model math, ROI, causality, productivity, probability, or
customer-facing financial output.

The Live Pipeline Concept Review sits after the Live Pipeline Concept Gate.

It answers:

```text
What upstream aggregate-pipeline design requirements are safe to carry forward?
```

It does not answer:

```text
Can FluencyTracr run BigQuery, Sigma, Glean, or customer connector jobs?
```

## Inputs

The executable runner starts from the controlled aggregate fixture and
recomputes the Live Pipeline Concept Gate:

```text
controlled aggregate fixture
-> Measurement Cell preflight proof
-> Live Pipeline Concept Gate
-> Live Pipeline Concept Review
```

The review requires:

- `READY_FOR_SEPARATE_LIVE_PIPELINE_CONCEPT_REVIEW` from the gate;
- source system `bigquery_export` or `sigma_export`;
- compact Measurement Cell preflight ref;
- compact snapshot-candidate ref;
- compact aggregate source-export ref;
- pipeline-boundary hash;
- upstream execution requirement;
- compact-ref-only package requirement.

## Output

The only ready state is:

```text
READY_FOR_UPSTREAM_AGGREGATE_PIPELINE_DESIGN
```

Ready means the team may design the upstream aggregate package boundary. It
does not authorize implementation, credentials, SQL execution, raw-row receipt,
pipeline-run persistence, manifest persistence, exports, routes, UI,
research-model feed, finance output, or customer-facing output.

Held or rejected states:

```text
HOLD_FOR_VALID_LIVE_PIPELINE_CONCEPT_GATE
REJECTED_FOR_BOUNDARY_LEAKAGE
```

## Required Design Boundary

The review keeps execution upstream:

```text
approved Glean/customer environment
-> source-owner aggregate extraction
-> upstream k-min and suppression
-> reviewed aggregate manifests and compact refs
-> FluencyTracr validation
```

Blocked boundary:

```text
FluencyTracr credentials
-> FluencyTracr SQL/dashboard/API execution
-> raw rows, query text, or identifiers enter FluencyTracr
-> durable run storage, exports, customer output, or model/finance feeds
```

## Required False Feeds

These feeds must remain false:

- live BigQuery execution;
- live Sigma execution;
- live Glean query;
- customer connector execution;
- credential access;
- query execution;
- raw-row ingestion;
- dashboard-row ingestion;
- connector-run persistence;
- pipeline-run persistence;
- manifest persistence;
- Measurement Cell Series persistence;
- customer projection;
- export creation;
- research-model feed;
- finance output;
- customer-facing output.

## Runner

Executable runner:

```text
scripts/run_ai_value_live_pipeline_concept_review.mjs
```

Narrow verification:

```bash
npm run test:ai-value-live-pipeline-concept-review
```

CLI example:

```bash
npm run run:ai-value-live-pipeline-concept-review
```

Use `--source-system=sigma_export` to review the Sigma-shaped path.
