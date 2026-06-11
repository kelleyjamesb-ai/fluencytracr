# Change: Add AI Value real evidence materializer

## Why

The AI Value Workspace can ingest governed aggregate evidence, but the
client-facing object spine still depends on demo-seeded AI Value objects. A
local materializer is needed to turn existing aggregate verdict and outcome
stores into validated AI Value objects without weakening FluencyTracr
suppression or claim governance.

## What Changes

- Add a governed materialization path from V3 aggregate verdicts and
  customer-attested outcome evidence into AI Value objects.
- Materialize `evidence_readiness` from surfaced, aggregate-only V3 evidence
  through the existing AI Value engine validators.
- Materialize `outcome_evidence_export` from paired aggregate outcome evidence
  records as submitted evidence, not auto-accepted evidence.
- Preserve fail-closed behavior for suppressed, missing, misaligned, or
  low-trust evidence.
- Keep the work local and contract-safe: no production connector, raw rows,
  direct identifiers, ROI proof, causality, productivity measurement, HR
  analytics, ranking, autonomous customer action, or customer-facing economic
  output.

## Impact

- Affected specs: ai-value-platform, value-realization
- Affected code: backend AI Value API, materializer service, AI Value tests,
  docs/runbook
