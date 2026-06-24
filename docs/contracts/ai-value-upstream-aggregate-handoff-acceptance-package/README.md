# AI Value Upstream Aggregate Handoff Acceptance Package

Status: executable internal acceptance package only. This contract does not
authorize backend routes, frontend UI, Prisma schema changes, migrations,
repository methods, persistence writes, live Glean, Sigma, or BigQuery
execution, ingestion jobs, export packages, rendered customer readouts,
contribution-model math, ROI, causality, productivity, probability, or
customer-facing financial output.

The Upstream Aggregate Handoff Acceptance Package sits after the Upstream
Aggregate Pipeline Handoff.

It answers:

```text
Can FluencyTracr accept this compact upstream handoff ref package for internal
validation?
```

It does not answer:

```text
Can FluencyTracr run the upstream job, persist manifests, persist pipeline runs,
or produce customer output?
```

## Inputs

The executable runner starts from the controlled aggregate fixture and
recomputes the required prerequisite:

```text
controlled aggregate fixture
-> Upstream Aggregate Pipeline Handoff
-> Upstream Aggregate Handoff Acceptance Package
```

The acceptance package requires:

- `READY_FOR_UPSTREAM_AGGREGATE_HANDOFF_ACCEPTANCE_REVIEW` from the upstream
  handoff;
- source system `bigquery_export` or `sigma_export`;
- compact handoff ref;
- compact source inventory manifest ref;
- compact aggregate extraction manifest ref;
- compact pipeline run review manifest ref;
- compact Data Spine alignment ref;
- compact Source Package Review Queue posture ref;
- compact refs only;
- fixture-backed recomputation for passed validation.

## Output

The only passed state is:

```text
PASSED_UPSTREAM_AGGREGATE_HANDOFF_ACCEPTANCE_PACKAGE
```

Passed means the compact refs can be accepted for internal validation only. It
does not authorize live execution, credentials, SQL execution, dashboard
execution, raw-row receipt, durable run storage, manifest persistence, routes,
UI, exports, research-model feed, finance output, or customer-facing output.

Held or rejected states:

```text
HOLD_FOR_VALID_UPSTREAM_AGGREGATE_PIPELINE_HANDOFF
REJECTED_FOR_BOUNDARY_LEAKAGE
```

## Required Boundary

Allowed future direction:

```text
approved Glean/customer environment
-> source-owner aggregate extraction
-> upstream k-min and suppression
-> reviewed aggregate manifest refs
-> compact upstream handoff
-> FluencyTracr acceptance validation
```

Blocked direction:

```text
FluencyTracr credentials
-> FluencyTracr SQL/dashboard/API execution
-> raw rows, query text, identifiers, full manifest payloads, or dashboard
   handles enter FluencyTracr
-> durable run storage, manifest persistence, exports, customer output, or
   model/finance feeds
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
scripts/run_ai_value_upstream_aggregate_handoff_acceptance_package.mjs
```

Narrow verification:

```bash
npm run test:ai-value-upstream-aggregate-handoff-acceptance-package
```

CLI example:

```bash
npm run run:ai-value-upstream-aggregate-handoff-acceptance-package
```

Use `--source-system=sigma_export` to review the Sigma-shaped path.
