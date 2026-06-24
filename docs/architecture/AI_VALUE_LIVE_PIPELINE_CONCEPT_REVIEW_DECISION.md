# AI Value Live Pipeline Concept Review Decision

Status: executable concept-review only. This document does not create backend
routes, frontend UI, Prisma schema changes, migrations, repository methods,
persistence writes, live Glean, Sigma, or BigQuery execution, ingestion jobs,
export packages, rendered customer readouts, contribution-model math, ROI,
causality, productivity, probability, or customer-facing financial output.

Phase: `phase-ai-value-live-pipeline-concept-review`

Decision: `LIVE_PIPELINE_HELD__CONCEPT_REVIEW_PROMOTED`

## 1. Purpose

The Live Pipeline Concept Gate proves only that it is safe to draft a separate
concept review. This decision records that separate review as an executable
design boundary, not connector implementation.

## 2. Decision

Promote an executable Live Pipeline Concept Review.

Do not promote live BigQuery, Sigma, Glean, or customer connector execution.

Decision value:

```text
LIVE_PIPELINE_HELD__CONCEPT_REVIEW_PROMOTED
```

The review may return:

```text
READY_FOR_UPSTREAM_AGGREGATE_PIPELINE_DESIGN
HOLD_FOR_VALID_LIVE_PIPELINE_CONCEPT_GATE
REJECTED_FOR_BOUNDARY_LEAKAGE
```

`READY_FOR_UPSTREAM_AGGREGATE_PIPELINE_DESIGN` means only that a future
source-owner aggregate handoff package can be designed against compact refs and
reviewed manifests. It does not authorize implementation.

## 3. Promoted Scope

Promoted:

- executable design-only review after the Live Pipeline Concept Gate;
- BigQuery-shaped and Sigma-shaped source-system paths;
- compact concept-gate refs;
- upstream aggregate-pipeline design requirements;
- package acceptance requirements for compact refs only;
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

This unlocks only an upstream aggregate handoff package validator/design slice.

Allowed next work:

```text
upstream aggregate handoff package validator
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
docs/contracts/ai-value-live-pipeline-concept-review/README.md
```

Runner:

```text
scripts/run_ai_value_live_pipeline_concept_review.mjs
```

Verification:

```bash
npm run test:ai-value-live-pipeline-concept-review
```

## 7. Verification

When this decision is changed, run:

```bash
npm run test:ai-value-live-pipeline-concept-review
git diff --check
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
```

Expected: all commands exit `0`.
