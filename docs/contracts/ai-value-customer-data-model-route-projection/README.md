# AI Value Customer Data Model Route Projection

Schema version:
`FT_AI_VALUE_CUSTOMER_DATA_MODEL_ROUTE_PROJECTION_2026_06`

## Purpose

This contract authorizes one exact-scope, read-only status projection over
compact `ai_value_customer_data_model_snapshots`.

The projection answers:

```text
Can FluencyTracr show source-bound aggregate evidence status from the compact
customer data model without exposing internal snapshot rows or value claims?
```

The answer is limited to:

```text
SOURCE_BOUND_CUSTOMER_EVIDENCE_STATUS_READY
```

or:

```text
HOLD_FOR_CUSTOMER_DATA_MODEL_SNAPSHOTS
```

This is a customer-visible evidence status surface. It is not a rendered
readout, export package, financial output, economic output, model result,
confidence score, causal claim, productivity claim, or live connector path.

## Authorized Scope

This contract authorizes only:

- `GET /api/v1/ai-value/customer-data-model/projections`;
- a compact panel in the existing AI Value Workspace;
- latest-only reads from `ai_value_customer_data_model_snapshots`;
- org-scoped authorization through the existing request auth boundary;
- optional explicit URL `measurement_plan_id` filtering;
- approved, customer-safe aggregate evidence status labels, windows, caveats,
  blocked outputs, and next evidence action.

The route must return `cache-control: no-store` and boundary headers showing
that live connectors, exports, and customer-facing economic output are false,
including rejected query responses.

## Query Contract

Allowed query parameter:

- `measurement_plan_id` optional string.

When omitted, the route returns latest org-scoped projections using a compiled
route cap. When present, the route filters to that measurement plan.

The frontend must not apply a stored/local measurement-plan fallback when the
URL omits `measurement_plan_id`.

All other query parameters are rejected, including:

- `org_id`, `orgId`, `client_id`, or tenant selectors;
- BigQuery, Sigma, Glean, warehouse, connector, job, project, dataset, table,
  query, SQL, dashboard, workbook, export, or live execution parameters.

## Response Allowlist

Top-level response fields are limited to:

- `schema_version`;
- `projection_state`;
- `display_mode: customer_evidence_status`;
- `source_bound`;
- `filter_applied`;
- `live_connector_execution: false`;
- `boundary`;
- `allowed_customer_outputs`;
- `blocked_customer_outputs`;
- `projections`.

Each projection row may include only:

- `value_driver`;
- `metric.label`, `metric.unit`, `metric.direction`, and
  `metric.owner_review_state`;
- `workflow_context.function_area` and `workflow_context.workflow_label`;
- `milestone.day`, `milestone.baseline_window`, and
  `milestone.comparison_window`;
- `evidence_status.aggregate_review_state` and
  `evidence_status.validation_state`;
- `caveats`;
- `allowed_output`;
- `blocked_outputs`;
- `next_action`.

## Customer-Visible Scalar Policy

Customer-visible strings must not be derived by prettifying compact IDs such as
`metric_id`, `workflow_family`, snapshot refs, source refs, source-export refs,
pipeline refs, hashes, org IDs, client IDs, Measurement Cell IDs, connector
handles, warehouse handles, project/dataset/table handles, dashboard/workbook
handles, or claim-shaped language.

The route may emit only:

- exact approved enum mappings for `value_driver`, `metric.direction`, and
  route-owned review states;
- approved business-context labels that pass the compiled customer-label policy;
- fixed customer status labels for metric-owner review, aggregate export review,
  and validation posture;
- generic held labels when upstream text looks internal, compact, source-shaped,
  or otherwise unsafe.

Unsafe compact labels, connector-shaped labels, claim-shaped labels, and
hash-like values must hold to generic customer-safe wording instead of being
normalized, title-cased, or transformed into customer display copy.

The route must project only rows whose persisted validation posture is clear.
Held/gapful rows do not make the route ready. The UI must render the held state
when no clear rows exist or when the route fails. It must render every safe row
returned by the capped route response and must not substitute seeded examples.

## Non-Authorization

This contract does not authorize:

- exposing the stored `AiValueCustomerDataModelSnapshotStoredRecord` shape;
- exposing database row IDs, org IDs, client IDs, snapshot IDs,
  Measurement Cell IDs, workflow IDs, cohort keys, source refs,
  aggregate-boundary refs, hashes, pipeline refs, source-export refs, source
  packages, raw rows, query text, SQL text, prompts, responses, transcripts,
  identifiers, or warehouse handles;
- write routes;
- exports;
- rendered readouts;
- live BigQuery execution;
- live Sigma execution;
- live Glean queries;
- customer connector execution;
- research-model feeds;
- model output;
- confidence, probability, or score output;
- ROI, EBITDA, finance output, causality, productivity, value proof, financial
  attribution, or customer-facing financial output.

## Fail-Closed Rules

The route and UI must hold or reject when:

- no compact customer data model snapshots exist;
- auth org scope is missing or mismatched;
- query parameters are outside the allowlist;
- the repository would return superseded versions instead of latest-only rows;
- all latest rows are validation-held or gapful;
- a projection would include internal refs, IDs, hashes, source handles, raw
  content, connector handles, ID-derived customer labels, unsafe customer-visible
  scalar values, model/economic terms as outputs, or full stored row fields;
- frontend route errors would otherwise fall back to demo or seeded values.

Held responses remain empty and caveated. Rejected query responses do not echo
unsafe values.

## Validation

Run:

```bash
npm test --workspace backend -- --runTestsByPath tests/ai_value_customer_data_model_projection_api.test.ts --runInBand
npm test --workspace frontend -- AIValueWorkspace.test.tsx
```

Recommended adjacent checks:

```bash
npm test --workspace backend -- --runTestsByPath tests/ai_value_minimal_persistence.test.ts tests/ai_value_objects_api.test.ts tests/health_postgres.test.ts --runInBand
npm run build --workspace backend
npm run build --workspace frontend
python3 scripts/ci_v1_governance_gates.py
```
