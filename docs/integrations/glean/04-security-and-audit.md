# Glean Integration Security and Audit

References:
- EvidenceBundle v1: `docs/contracts/evidence-bundle/v1/README.md`
- `/api/ingest` API doc: `docs/api/ingest.md`
- Glean agent tooling: `docs/integrations/glean/03-glean-agent-tooling.md`

## Service identity tokens and org scope
- Use service identity tokens per integration service.
- Token scopes must be bound to `org_id` and operation type:
  - `evidence.read`
  - `evidence.publish`
  - `ingest.write`
- Reject cross-org access at API gateway and service layer.
- Rotate tokens on fixed schedule and on incident triggers.

## Authentication and ingestion constraints
- `/api/ingest` calls require:
  - `X-FluencyTracr-Schema-Version`
  - `Idempotency-Key`
  - authenticated integration identity
- Ingest payloads are metadata and sequence signals only.
- Forbidden fields policy blocks raw prompt text, model output text, transcript content, and direct identifiers.

## Audit logging requirements
Log all integration actions with:
- `timestamp_utc`
- `actor_identity`
- `org_id`
- `operation` (`publish_bundle`, `query_bundle`, `ingest_write`, `agent_response`)
- `window`
- `schema_version`
- `result` (`success|suppressed|rejected|error`)
- `suppression_applied`
- `suppression_reasons`
- `request_id` and `receipt_id` where applicable

## Incident handling for forbidden fields
Detection event:
- `forbidden_field_detected` at ingest or agent-response validation boundary.

Response runbook:
1. Reject request with deterministic error payload and `field_path`.
2. Record audit event with blocked operation metadata.
3. Raise security alert to governance and integration owners.
4. Quarantine source integration stream until configuration is corrected.
5. Require replay through `/api/ingest` after fix with new `Idempotency-Key`.

## Non-attribution and suppression enforcement
- Published and queried outputs remain org-level aggregate only.
- Suppression state and reason codes are immutable once computed for a given bundle snapshot.
- Audit records must never include raw content even in failure paths.

