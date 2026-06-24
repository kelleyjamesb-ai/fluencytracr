# AI Value Upstream Aggregate Acceptance Persistence Decision

Status: physical data-model boundary decision. This document does not create
backend routes, frontend UI, Prisma schema changes, migrations, repository
methods, persistence writes, live Glean, Sigma, or BigQuery execution,
ingestion jobs, export packages, rendered customer readouts, contribution-model
math, ROI, causality, productivity, probability, or customer-facing financial
output.

Phase: `phase-ai-value-upstream-aggregate-acceptance-persistence-decision`

Decision:
`HOLD_UPSTREAM_ACCEPTANCE_PERSISTENCE__MEASUREMENT_CELL_SNAPSHOT_REMAINS_PROMOTED`

## 1. Purpose

The Upstream Aggregate Pipeline Handoff and Upstream Aggregate Handoff
Acceptance Package now prove that saved, reviewed, aggregate BigQuery/Sigma
fixture paths can produce compact handoff refs for internal validation.

This decision answers a separate physical data-model question:

```text
Should the upstream handoff or acceptance package become a persisted table now?
```

Answer: no.

## 2. Decision

Do not persist upstream handoffs, acceptance packages, manifest packages,
pipeline runs, connector runs, or full package JSON.

The only promoted physical table in this lane remains:

```text
measurement_cell_snapshots
```

The upstream handoff and acceptance package remain executable validation layers
that may feed a later Measurement Cell preflight / snapshot write only after
that downstream write path recomputes compact proof and passes its own
fail-closed persistence validation.

## 3. Why This Is Held

The acceptance package output is compact enough for transient validation, but
persisting it wholesale would still create durable manifest or pipeline state
by another name.

Held persistence includes:

- `upstream_aggregate_pipeline_handoffs`;
- `upstream_aggregate_handoff_acceptance_packages`;
- `upstream_aggregate_handoff_acceptance_snapshots`;
- `controlled_aggregate_manifest_snapshots`;
- `pipeline_run_review_manifest_snapshots`;
- `pipeline_runs`;
- `connector_runs`;
- `measurement_cell_series_snapshots`.

## 4. Authorized Current Shape

Authorized current shape:

```text
saved scrubbed aggregate fixture
-> non-live aggregate export / manifest / handoff validators
-> compact acceptance package output
-> Measurement Cell preflight recomputation
-> compact measurement_cell_snapshots row when promoted snapshot gates pass
```

The persisted row, if any, is the validated Measurement Cell snapshot. The
upstream package is not itself the durable product record.

## 5. Promotion Requirements Before Any Future Upstream Table

Any future upstream acceptance persistence decision must name the exact table,
columns, write path, and read path. Before a migration is allowed, red/green
tests must prove rejection of:

- pipeline-handoff-only persistence bypass;
- passed acceptance packages without source-fixture-backed recomputation;
- stale `validation_summary.valid` values;
- package-hash drift after accepted-ref drift;
- full emitted package JSON;
- full manifest payloads;
- generic `payload_json`, `validation_json`, `source_refs_json`, or equivalent
  wrapper JSONB smuggling;
- raw rows, dashboard rows, prompts, transcripts, files, ticket contents,
  action rows, row IDs, span IDs, user identifiers, employee identifiers,
  person identifiers, respondent identifiers, emails, or joinable person keys;
- SQL text, query text, query refs, job IDs, project refs, dataset refs, table
  refs, dashboard URLs, dashboard handles, workbook IDs, export URLs, API
  handles, connector handles, or live run handles;
- credentials, service accounts, OAuth tokens, warehouse secrets, or token
  values;
- source package clearance aliases;
- Measurement Cell readiness aliases;
- Series persistence aliases;
- customer-facing route, UI, projection, export, or share package aliases;
- ROI, EBITA, EBITDA, finance-output, causality, productivity, probability,
  contribution-model, confidence, score-like, model-output, or customer-facing
  financial fields;
- BigQuery/Sigma/Glean live execution aliases or any false feed set to true.

## 6. Executable Hardening Requirement

The upstream pipeline handoff validator must remain at least as strict as the
acceptance package boundary for unsafe source refs and smuggling aliases. It
must reject encoded payload keys, dashboard handles, table handles, workbook
IDs, SQL/query-text variants, raw-row aliases, live-execution aliases,
persistence aliases, customer-output aliases, and finance/model aliases before
any downstream acceptance or persistence flow may use it.

## 7. What This Unlocks

This unlocks only continued internal validation of compact upstream aggregate
handoff refs and downstream Measurement Cell snapshot preflight proof.

It does not unlock:

- new Prisma models;
- migrations;
- repository writes for upstream packages;
- live connectors;
- durable manifest or pipeline state;
- Measurement Cell Series persistence;
- customer-facing output;
- confidence research inputs;
- finance output.
