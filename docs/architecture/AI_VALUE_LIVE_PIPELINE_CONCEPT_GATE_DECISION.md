# AI Value Live Pipeline Concept Gate Decision

Status: executable gate only. This document does not create backend routes,
frontend UI, Prisma schema changes, migrations, repository methods,
persistence writes, live Glean, Sigma, or BigQuery execution, ingestion jobs,
export packages, rendered customer readouts, contribution-model math, ROI,
causality, productivity, probability, or customer-facing financial output.

Phase: `phase-ai-value-live-pipeline-concept-gate`

Decision: `LIVE_PIPELINE_HELD__CONCEPT_GATE_PROMOTED`

## 1. Purpose

The repo now has a safe backend-internal landing point for reviewed aggregate
evidence:

```text
non-live BigQuery/Sigma aggregate export review
-> Measurement Cell preflight
-> compact Measurement Cell snapshot candidate
-> backend-internal measurement_cell_snapshots write path
```

The next infrastructure risk is pressure to jump from this reviewed aggregate
boundary into live BigQuery or Sigma connector work. This decision adds one
more executable gate before that can happen.

## 2. Decision

Promote an executable Live Pipeline Concept Gate.

Do not promote live BigQuery, Sigma, Glean, or customer connector execution.

Decision value:

```text
LIVE_PIPELINE_HELD__CONCEPT_GATE_PROMOTED
```

The gate may return:

```text
READY_FOR_SEPARATE_LIVE_PIPELINE_CONCEPT_REVIEW
HOLD_FOR_VALID_MEASUREMENT_CELL_PREFLIGHT
REJECTED_FOR_BOUNDARY_LEAKAGE
```

`READY_FOR_SEPARATE_LIVE_PIPELINE_CONCEPT_REVIEW` means only that a later
exact-scope live-pipeline concept review may be drafted. It does not authorize
implementation.

## 3. Promoted Scope

Promoted:

- executable validation of a proposed live-pipeline boundary;
- BigQuery-shaped and Sigma-shaped concept-gate paths;
- recomputed Measurement Cell preflight prerequisite proof;
- compact aggregate-boundary refs and hashes;
- upstream execution requirement;
- upstream k-min and suppression requirement;
- source-owner attestation requirement;
- legal/trust review requirement;
- false-feed assertions for live execution, storage, projection, export,
  research-model feed, and finance output.

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

This unlocks only the ability to evaluate whether a future live-pipeline
concept review is even safe to draft.

Allowed next work:

```text
live-pipeline concept review proposal
```

Blocked next work:

```text
live connector implementation
warehouse credentials in FluencyTracr
SQL runner
dashboard runner
pipeline-run persistence
customer-facing projection/export
```

## 6. Executable Proof

Contract:

```text
docs/contracts/ai-value-live-pipeline-concept-gate/README.md
```

Runner:

```text
scripts/run_ai_value_live_pipeline_concept_gate.mjs
```

Verification:

```bash
npm run test:ai-value-live-pipeline-concept-gate
```

The validator fails closed on live handles, credentials, raw rows, query text,
SQL text, prompts, transcripts, identifiers, Source Package clearance aliases,
Measurement Cell readiness aliases, Series persistence aliases,
customer-facing aliases, JSON payload aliases, ROI, EBITDA, finance-output,
causality, workforce productivity measurement, probability, contribution-model,
research-model, or score-like fields.

## 7. Verification

When this decision is changed, run:

```bash
npm run test:ai-value-live-pipeline-concept-gate
git diff --check
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
```

Expected: all commands exit `0`.
