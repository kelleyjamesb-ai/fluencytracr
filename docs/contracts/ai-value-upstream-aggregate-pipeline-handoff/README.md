# AI Value Upstream Aggregate Pipeline Handoff

Status: executable internal acceptance-review contract only. This contract does
not authorize backend routes, frontend UI, Prisma schema changes, migrations,
repository methods, persistence writes, live Glean, Sigma, or BigQuery
execution, ingestion jobs, export packages, rendered customer readouts,
contribution-model math, ROI, causality, productivity, probability, or
customer-facing financial output.

The Upstream Aggregate Pipeline Handoff sits after the Live Pipeline Concept
Review.

It answers:

```text
What compact manifest refs may a future upstream aggregate job hand to
FluencyTracr for validation?
```

It does not answer:

```text
Can FluencyTracr run the upstream job or persist pipeline runs?
```

## Inputs

The executable runner starts from the controlled aggregate fixture and
recomputes both required prerequisites:

```text
controlled aggregate fixture
-> Live Pipeline Concept Review
-> Controlled Aggregate Manifest Validation package
-> Upstream Aggregate Pipeline Handoff
```

The handoff requires:

- `READY_FOR_UPSTREAM_AGGREGATE_PIPELINE_DESIGN` from the concept review;
- `PASSED_CONTROLLED_AGGREGATE_MANIFEST_VALIDATION`;
- source system `bigquery_export` or `sigma_export`;
- compact source inventory manifest ref;
- compact aggregate extraction manifest ref;
- compact pipeline run review manifest ref;
- compact Data Spine alignment ref;
- compact Source Package Review Queue posture ref;
- compact refs only.

## Output

The only ready state is:

```text
READY_FOR_UPSTREAM_AGGREGATE_HANDOFF_ACCEPTANCE_REVIEW
```

Ready means the package shape can be used for future upstream handoff
acceptance testing. It does not authorize live execution, credentials, SQL
execution, dashboard execution, raw-row receipt, durable run storage, manifest
persistence, routes, UI, exports, research-model feed, finance output, or
customer-facing output.

Held or rejected states:

```text
HOLD_FOR_VALID_LIVE_PIPELINE_CONCEPT_REVIEW
REJECTED_FOR_BOUNDARY_LEAKAGE
```

## Required Boundary

Allowed future direction:

```text
approved Glean/customer environment
-> source-owner aggregate extraction
-> upstream k-min and suppression
-> reviewed aggregate manifest refs
-> FluencyTracr acceptance validation
```

Blocked direction:

```text
FluencyTracr credentials
-> FluencyTracr SQL/dashboard/API execution
-> raw rows, query text, identifiers, or full manifest payloads enter
   FluencyTracr
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
scripts/run_ai_value_upstream_aggregate_pipeline_handoff.mjs
```

Narrow verification:

```bash
npm run test:ai-value-upstream-aggregate-pipeline-handoff
```

CLI example:

```bash
npm run run:ai-value-upstream-aggregate-pipeline-handoff
```

Use `--source-system=sigma_export` to review the Sigma-shaped path.
