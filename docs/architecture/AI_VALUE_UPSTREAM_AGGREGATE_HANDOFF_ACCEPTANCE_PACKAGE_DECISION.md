# AI Value Upstream Aggregate Handoff Acceptance Package Decision

Status: executable handoff acceptance package only. This document does not
create backend routes, frontend UI, Prisma schema changes, migrations,
repository methods, persistence writes, live Glean, Sigma, or BigQuery
execution, ingestion jobs, export packages, rendered customer readouts,
contribution-model math, ROI, causality, productivity, probability, or
customer-facing financial output.

Phase: `phase-ai-value-upstream-aggregate-handoff-acceptance-package`

Decision: `LIVE_PIPELINE_HELD__UPSTREAM_HANDOFF_ACCEPTANCE_PACKAGE_PROMOTED`

## 1. Purpose

The Upstream Aggregate Pipeline Handoff defines compact refs that a future
source-owner upstream aggregate job may hand to FluencyTracr. This decision
promotes the next executable acceptance package that validates those compact
refs without authorizing execution, storage, UI, export, or customer output.

It still does not authorize FluencyTracr to execute that job.

## 2. Decision

Promote an executable Upstream Aggregate Handoff Acceptance Package validator.

Do not promote live BigQuery, Sigma, Glean, or customer connector execution.

Decision value:

```text
LIVE_PIPELINE_HELD__UPSTREAM_HANDOFF_ACCEPTANCE_PACKAGE_PROMOTED
```

The package may return:

```text
PASSED_UPSTREAM_AGGREGATE_HANDOFF_ACCEPTANCE_PACKAGE
HOLD_FOR_VALID_UPSTREAM_AGGREGATE_PIPELINE_HANDOFF
REJECTED_FOR_BOUNDARY_LEAKAGE
```

`PASSED_UPSTREAM_AGGREGATE_HANDOFF_ACCEPTANCE_PACKAGE` means only that compact
upstream handoff refs can be accepted for internal validation. It does not
authorize implementation, live execution, persistence, or customer output.

Durable persistence of upstream handoffs, acceptance packages, manifest
packages, pipeline runs, connector runs, or full package JSON is held by
`AI_VALUE_UPSTREAM_AGGREGATE_ACCEPTANCE_PERSISTENCE_DECISION.md`.

## 3. Promoted Scope

Promoted:

- executable acceptance package after the Upstream Aggregate Pipeline Handoff;
- BigQuery-shaped and Sigma-shaped source-system paths;
- fixture-backed recomputation for passed packages;
- compact upstream handoff ref;
- compact Source Inventory, Aggregate Extraction, and Pipeline Run Review
  manifest refs;
- compact Data Spine alignment and Source Package Review Queue posture refs;
- false-feed assertions for live execution, credentials, query handling,
  storage, projection, exports, research-model feed, and finance output.

The upstream pipeline handoff validator must keep denylist parity with this
acceptance package for encoded payload keys, dashboard handles, table handles,
workbook IDs, live execution aliases, persistence aliases, customer-output
aliases, and finance/model aliases before downstream validation consumes it.

## 4. Held Scope

Still blocked:

- live BigQuery execution by FluencyTracr;
- live Sigma execution by FluencyTracr;
- live Glean queries;
- customer connector execution;
- credentials, service accounts, OAuth tokens, or warehouse secrets;
- SQL text, query text, job IDs, query refs, API handles, dashboard URLs,
  dashboard handles, workbook IDs, export URLs, project refs, dataset refs,
  table refs, or live run handles;
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
- ROI, EBITA, EBITDA, finance output, causality, productivity, probability,
  score-like fields, contribution-model fields, or customer-facing financial
  output.

## 5. What This Unlocks

This unlocks only future acceptance testing against compact upstream aggregate
handoff refs.

Allowed next work:

```text
operator acceptance tests using compact handoff refs
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
docs/contracts/ai-value-upstream-aggregate-handoff-acceptance-package/README.md
```

Runner:

```text
scripts/run_ai_value_upstream_aggregate_handoff_acceptance_package.mjs
```

Verification:

```bash
npm run test:ai-value-upstream-aggregate-handoff-acceptance-package
```

## 7. Verification

When this decision is changed, run:

```bash
npm run test:ai-value-upstream-aggregate-handoff-acceptance-package
git diff --check
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
```

Expected: all commands exit `0`.
