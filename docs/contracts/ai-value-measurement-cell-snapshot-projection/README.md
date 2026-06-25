# AI Value Measurement Cell Snapshot Projection

Validator/runner: `scripts/run_ai_value_measurement_cell_snapshot_projection.mjs`

Schema version: `FT_AI_VALUE_MEASUREMENT_CELL_SNAPSHOT_PROJECTION_2026_06`

## Purpose

The Measurement Cell Snapshot Projection is the executable bridge from the
backend-internal `measurement_cell_snapshots` row shape into a compact
operator-review projection.

It proves that a persisted, governed Measurement Cell snapshot can be reduced
to a stable product data shape for later route/UI design without exposing the
stored row, full Measurement Cell payload, source package payloads, or customer
readout output.

This contract does not create backend routes, frontend UI, Prisma schema
changes, migrations, repository reads or writes, export packages, rendered
readouts, live BigQuery/Sigma/Glean execution, research-model feeds, model
output, ROI, EBITDA, causality, productivity, probability, score-like output,
or customer-facing output.

## Pass Boundary

A passed projection means only:

```text
INTERNAL_OPERATOR_PROJECTION_READY
```

Passed output may include only:

- snapshot identity and version;
- selected Blueprint expectation-path identity;
- value hypothesis binding refs;
- governed value driver;
- selected metric definition context;
- workflow/function/cohort context;
- milestone window context;
- compact aggregate-boundary refs;
- compact source refs;
- validation posture booleans and gap counts;
- caveats, blocked uses, false feeds, and a projection hash.

The projection is source-bound and compact. It must not pass through stored
`payload`, `assembly_payload`, full `validation`, full `assembly_validation`,
full `source_refs`, or full `blueprint_path_binding` JSON.

## Output Boundary

Every valid projection remains:

```text
display_mode: internal_operator_review
customer_visible: false
export_allowed: false
route_creation_allowed: false
frontend_ui_creation_allowed: false
```

The projection can support internal product/data-model review. It cannot be
treated as a customer-facing response, dashboard, export, executive report,
financial output, model result, or connector output.

## Fail-Closed Rules

The runner holds or rejects on:

- missing snapshot identity;
- missing selected expectation path identity;
- missing value hypothesis binding unless explicitly inapplicable;
- approval drift;
- metric drift or missing metric definition context;
- lag drift or invalid lag;
- unsupported value driver;
- non-milestone windows;
- milestone day outside Day 0 / 30 / 60 / 90 / 180 / 365;
- invalid baseline or comparison window ranges;
- missing, held, or invalid validation posture;
- source-system, review-state, source-export, review-hash, pipeline dry-run,
  or pipeline-boundary drift;
- unsafe refs, URLs, job/query/project/dataset/table/dashboard handles, or live
  connector handles;
- raw rows, dashboard rows, query text, SQL text, prompts, responses,
  transcripts, file contents, identifiers, row IDs, span IDs, or joinable
  person identifiers;
- full source package payloads;
- full operator handoff bundles;
- full Measurement Cell payloads;
- full Blueprint expectation-path registries;
- JSON smuggling through payload, validation, source refs, caveats, blocked
  uses, or compact posture fields;
- ROI, EBITDA, finance-output, causality, productivity, probability, model, or
  score-like fields;
- customer-facing route, UI, export, rendered readout, or live connector flags.

Rejected projections return `REJECTED_FOR_BOUNDARY_LEAKAGE` without echoing
unsafe values. Held projections return
`HOLD_FOR_VALID_MEASUREMENT_CELL_SNAPSHOT`.

## Non-Authorization

This contract does not authorize:

- `measurement_cell_series_snapshots`;
- Evidence Continuity persistence;
- backend read routes;
- frontend UI;
- rendered executive readouts;
- export packages;
- live BigQuery execution;
- live Sigma execution;
- live Glean queries;
- customer connector execution;
- customer-facing output;
- customer-facing financial output;
- model output;
- probability or score-like output;
- ROI, EBITDA, causality, productivity, or financial attribution.

## Validation

Run:

```bash
npm run test:ai-value-measurement-cell-snapshot-projection
```

Executable sample:

```bash
npm run run:ai-value-measurement-cell-snapshot-projection
```

Recommended adjacent checks:

```bash
npm run test:ai-value-measurement-cell-preflight-runner
npm run test --workspace backend -- --runTestsByPath tests/ai_value_minimal_persistence.test.ts
```
