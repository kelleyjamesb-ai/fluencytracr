# Change: EvidenceBundle Glean publisher CLI, optional GHA, and CI guardrails

## Why

Indexing governance evidence into Glean requires deterministic documents, required indexed fields, and automated checks so broken bundles never reach production indexers.

## What Changes

- Specify a **publisher CLI** that fetches org-level EvidenceBundles from FluencyTracr, maps them to Glean document payloads per `docs/integrations/glean/02-evidencebundle-to-glean-indexing.md`, validates required fields, and supports `dry-run` or HTTP POST to a configurable indexing endpoint.
- Specify an **optional** scheduled GitHub Actions workflow invoking the CLI.
- Specify **CI** validation of fixture bundles against the Glean indexing field contract (no live Glean required by default).

## Impact

- Affected specs: `glean-evidence-publisher` (new).
- Affected code: `packages/glean-publisher/`, `.github/workflows/`, `ci.yml`, fixtures under `packages/glean-publisher/test-fixtures/` or `backend/tests/fixtures/`.
