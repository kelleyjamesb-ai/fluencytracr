# AI Value Upstream Aggregate Pipeline Handoff Decision

Status: executable handoff acceptance-review only. This document does not
create backend routes, frontend UI, Prisma schema changes, migrations,
repository methods, persistence writes, live Glean, Sigma, or BigQuery
execution, ingestion jobs, export packages, rendered customer readouts,
contribution-model math, ROI, causality, productivity, probability, or
customer-facing financial output.

Phase: `phase-ai-value-upstream-aggregate-pipeline-handoff`

Decision: `LIVE_PIPELINE_HELD__UPSTREAM_HANDOFF_ACCEPTANCE_PROMOTED`

## 1. Purpose

The Live Pipeline Concept Review defines design-only requirements. This
decision promotes the next executable acceptance-review package shape for a
future source-owner upstream aggregate job.

It still does not authorize FluencyTracr to execute that job.

## 2. Decision

Promote an executable Upstream Aggregate Pipeline Handoff validator.

Do not promote live BigQuery, Sigma, Glean, or customer connector execution.

Decision value:

```text
LIVE_PIPELINE_HELD__UPSTREAM_HANDOFF_ACCEPTANCE_PROMOTED
```

The handoff may return:

```text
READY_FOR_UPSTREAM_AGGREGATE_HANDOFF_ACCEPTANCE_REVIEW
HOLD_FOR_VALID_LIVE_PIPELINE_CONCEPT_REVIEW
REJECTED_FOR_BOUNDARY_LEAKAGE
```

`READY_FOR_UPSTREAM_AGGREGATE_HANDOFF_ACCEPTANCE_REVIEW` means only that future
upstream package acceptance tests may use the compact handoff shape. It does
not authorize implementation, live execution, persistence, or customer output.

## 3. Promoted Scope

Promoted:

- executable acceptance-review package after the Live Pipeline Concept Review;
- BigQuery-shaped and Sigma-shaped source-system paths;
- compact concept-review refs;
- compact Source Inventory, Aggregate Extraction, and Pipeline Run Review
  manifest refs;
- compact Data Spine alignment and Source Package Review Queue posture refs;
- false-feed assertions for live execution, credentials, query handling,
  storage, projection, exports, research-model feed, and finance output.

## 4. Held Scope

Still blocked:

- live BigQuery execution by FluencyTracr;
- live Sigma execution by FluencyTracr;
- live Glean queries;
- customer connector execution;
- credentials, service accounts, OAuth tokens, or warehouse secrets;
- SQL text, query text, job IDs, query refs, API handles, dashboard URLs,
  export URLs, project refs, dataset refs, table refs, or live run handles;
- raw rows, dashboard rows, files, prompts, responses, transcripts, ticket
  contents, file contents, action rows, or identifiers;
- full manifest payload ingestion;
- controlled aggregate manifest persistence;
- pipeline-run persistence;
- connector-run persistence;
- `measurement_cell_series_snapshots`;
- customer projection;
- exports;
- routes;
- UI;
- research-model feed;
- ROI, EBITDA, finance output, causality, productivity, probability, or
  customer-facing financial output.

## 5. What This Unlocks

This unlocks only future acceptance testing against compact upstream aggregate
handoff refs.

Allowed next work:

```text
upstream package acceptance tests using compact handoff refs
```

Blocked next work:

```text
live connector implementation
warehouse credentials in FluencyTracr
SQL runner
dashboard runner
pipeline-run persistence
manifest persistence
customer-facing projection/export
```

## 6. Executable Proof

Contract:

```text
docs/contracts/ai-value-upstream-aggregate-pipeline-handoff/README.md
```

Runner:

```text
scripts/run_ai_value_upstream_aggregate_pipeline_handoff.mjs
```

Verification:

```bash
npm run test:ai-value-upstream-aggregate-pipeline-handoff
```

## 7. Verification

When this decision is changed, run:

```bash
npm run test:ai-value-upstream-aggregate-pipeline-handoff
git diff --check
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
```

Expected: all commands exit `0`.
