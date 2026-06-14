# Change: Add Glean Dogfood BigQuery Adapter

## Why

FluencyTracr needs a governed internal dogfood path that can exercise the V3
aggregate ingest contract on real scrubbed Glean BigQuery tables without
introducing customer data, raw rows, direct identifiers, or economic claims.

## What Changes

- Add a read-only `glean_dogfood_bq` Python adapter for the three in-scope
  scrubbed, date-sharded BigQuery table families.
- Pin broad source allowlists in code while emitting only narrow V3 aggregate
  payloads.
- Add connector-side k-min, forbidden-field, partition, and cost guards.
- Add a local dry-run CLI, synthetic fixtures, docs, mapping spec entry, and
  LMSYS assurance metadata.

## Impact

- Affected specs: `glean-dogfood-bq-adapter`
- Affected code: `src/connectors/glean_dogfood_bq/`,
  `scripts/run_dogfood_bq_ingest.py`,
  `tests/test_glean_dogfood_bq_adapter.py`,
  `tests/fixtures/glean_dogfood_bq/`,
  `docs/integrations/glean/dogfood-bq-adapter.md`,
  `docs/CONNECTOR_MAPPING_SPEC.md`,
  `scripts/seed_lmsys_assurance_transform.mjs`,
  `scripts/lmsys_harness_selftest.mjs`
