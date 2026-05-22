# Change: Add outcome evidence ingestion

## Why

Value-realization consumers need customer-attested systems-of-record outcomes
beside workflow verdicts without FluencyTracr building connectors or computing
correlation.

## What Changes

- Add storage-only `POST /api/v1/outcome-evidence` for aggregate KPI outcomes.
- Add `GET /api/v1/outcome-evidence` to replay outcome evidence beside the
  unchanged workflow verdict and Reliability Factor.
- Add `outcome_evidence` persistence, schema, OpenAPI, tests, and docs.

## Impact

- Affected specs: outcome-evidence
- Affected code: backend API, Prisma persistence, shared schemas, OpenAPI docs
