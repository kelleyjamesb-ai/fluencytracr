# Glean Integration Acceptance Tests

References:
- EvidenceBundle v1: `docs/contracts/evidence-bundle/v1/README.md`
- `/api/ingest` API doc: `docs/api/ingest.md`
- Glean indexing mapping: `docs/integrations/glean/02-evidencebundle-to-glean-indexing.md`
- Glean agent tooling: `docs/integrations/glean/03-glean-agent-tooling.md`

## Test prerequisites
- Valid service identity token with org-bound scopes.
- Test org with EvidenceBundle data for at least one window.
- Glean indexing credentials and searchable corpus target.
- Ingest client capable of posting metadata/event payloads to `/api/ingest`.

## Scenario 1: Publish EvidenceBundle, search in Glean, retrieve document

Goal:
- Verify indexed EvidenceBundle document is searchable and retrievable.

Steps:
1. Generate or fetch latest bundle for `org_test` and `window=weekly`.
2. Publish document to Glean with required indexed fields.
3. Query Glean for title `FluencyTracr EvidenceBundle weekly - org_test`.
4. Retrieve document payload and metadata.

Expected results:
- Document exists with `schema_version=evidence_bundle.v1`.
- `window`, `suppression_applied`, and key EvidenceBundle fields are present.
- No individual attribution or ranking fields exist.

Runnable-in-principle command skeleton:
```bash
curl -X POST "https://api.fluencytracr.example/api/ingest" \
  -H "X-FluencyTracr-Schema-Version: 0.1" \
  -H "Idempotency-Key: test-glean-publish-001" \
  -H "Authorization: Bearer $FT_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"events":[{"event_type":"verification_signal","timestamp":"2026-02-23T00:00:00.000Z","risk_class":"low","workflow_id":"wf-1","verification_type":"policy_check","verification_latency_ms":900}]}'
```

## Scenario 2: Agent calls evidence endpoint and returns safe answer

Goal:
- Verify bounded executive query path and safe output contract.

Steps:
1. Agent issues read-only query for org-level exposure and calibration for `window=30d`.
2. Agent retrieves evidence response.
3. Agent formats response using allowed template fields only.

Expected results:
- Response includes suppression metadata when applicable.
- Response excludes team/manager/user dimensions and ranking output.
- Response references only aggregate EvidenceBundle evidence fields.

## Scenario 3: Suppressed bundle returns suppressed with reason, not data

Goal:
- Verify suppression propagation into both Glean document and agent responses.

Steps:
1. Use dataset/window where suppression is triggered.
2. Publish suppressed bundle document.
3. Execute agent query for fragility and calibration posture.

Expected results:
- Glean document contains `suppression_applied=true` and non-empty `suppression_reasons`.
- Agent response states `suppressed` with reason codes.
- No reconstructed or inferred hidden values appear.

## Pass/fail criteria
- Pass only if all scenarios complete with suppression-safe, non-attribution outputs.
- Fail if any response includes individual attribution, rankings, or raw content.

