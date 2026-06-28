# AI Value Compact Source Wiring Hardening

Validator/runner:
`scripts/run_ai_value_compact_source_wiring_hardening.mjs`

Schema version:
`FT_AI_VALUE_COMPACT_SOURCE_WIRING_HARDENING_2026_06`

## Purpose

Compact Source Wiring Hardening is the executable bridge after the AI Value Data
Model Spine Readiness Lock. It turns the lock's allowed next step into a
source-bound, non-live descriptor posture for prepared BigQuery and Sigma
aggregate exports.

It does not run, query, store, expose, or customer-render those sources.

```text
Data Model Spine Readiness Lock
AND BigQuery Aggregate Connector Boundary Plan
AND Sigma Aggregate Connector Boundary Plan
AND all live wiring feeds remain false
=> COMPACT_SOURCE_WIRING_HARDENED_NON_LIVE
```

## Boundary Statement

Compact source wiring hardening is a non-live internal boundary review. It may
prepare only compact source-descriptor posture for later human review. It does
not authorize live BigQuery, Sigma, or Glean execution; credentials; SQL or
query storage; source/project/dataset/table/job/dashboard handles; raw-row
ingestion; routes; UI; exports; rendered readouts; model output; confidence,
probability, or score output; finance, ROI, causality, productivity, or
customer-facing output; or Measurement Cell Series persistence.

## Prepared And Held Sources

Prepared non-live descriptors:

- `bigquery_export`
- `sigma_export`

Held source:

- `glean_query`

Glean remains held until a later exact-scope source adapter boundary plan exists.
This contract must not treat Glean query access as prepared just because the
compact data model spine is ready.

## Descriptor Shape

Prepared descriptors may include only compact internal metadata:

- source system and category;
- boundary plan id and passed boundary state;
- boundary validation posture and zero validation-gap count;
- connector adapter run id;
- source owner role;
- no-live-execution mode;
- aggregate definition and output refs that are not SQL, job ids, URLs, table
  refs, source refs, hashes, or raw output handles;
- aggregate definition refs must use the governed
  `aggregate_definition_review_<source_system>_` prefix, and aggregate output
  refs must use the governed `reviewed_aggregate_output_<source_system>_`
  prefix;
- boundary plan and connector adapter ids must use governed compact prefixes for
  the prepared source system;
- governed aggregate output field names;
- aggregate grain;
- k-min, suppression, freshness, and legal/trust posture.

Descriptors must not contain project ids, dataset ids, table ids, dashboard ids,
workbook ids, connector run ids, query jobs, raw rows, dashboard rows, prompts,
responses, transcripts, user identifiers, employee aliases, source refs, source
hashes, customer-joinable refs, or compact ids intended for display.

## Fail-Closed Rules

The hardening record holds or rejects on:

- missing or invalid Data Model Spine Readiness Lock;
- missing or invalid BigQuery/Sigma aggregate connector boundary plan;
- Glean source preparation;
- live BigQuery, Sigma, Glean, or customer connector execution flags;
- credential, query execution, SQL/query text, warehouse handle, dashboard
  handle, workbook, job, project, dataset, table, connector, or API-run handles;
- raw rows, dashboard rows, prompts, responses, transcripts, files, identifiers,
  row ids, span ids, emails, or employee/person aliases;
- Source Package clearance, Measurement Cell creation, Measurement Cell snapshot
  write, Measurement Cell Series persistence, or Evidence Continuity persistence;
- backend routes, frontend UI, exports, rendered readouts, model feeds, model
  output, confidence math, probability, score-like output, finance output, ROI,
  causality, productivity, or customer-facing output;
- forged ready records after rehash;
- forged readiness-lock or boundary-plan binding;
- unsafe wrapper sidecars.

Rejected records do not echo unsafe values.

## Allowed Next Step

When hardened, the only allowed next step is:

```text
draft_non_live_connector_promotion_decision_requirements_only
```

That means requirements drafting for a future human decision. It is not a live
connector gate and does not authorize BigQuery/Sigma/Glean execution.

## Validation

Run:

```bash
npm run test:ai-value-compact-source-wiring-hardening
```

Executable sample:

```bash
npm run run:ai-value-compact-source-wiring-hardening
```

Recommended adjacent checks:

```bash
npm run test:ai-value-data-model-spine-readiness-lock
npm run test:ai-value-aggregate-connector-boundary-plan
```
