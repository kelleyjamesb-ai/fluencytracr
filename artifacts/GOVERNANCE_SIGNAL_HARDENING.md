# Governance / signal-precision hardening (backend)

## Changed files

- `backend/src/services/signal-detectors.ts` — recovery (explicit error only), verification (retrieval/search + flags), abandonment (explicit only), exports `isExplicitError` / `isRetryTrigger`
- `backend/src/services/pattern-classifier.ts` — `LatencyBucketForClassification`, FRICTION_LOOP skips when latency is `UNKNOWN`
- `backend/src/services/classification-pipeline.service.ts` — removed global UNKNOWN-bucket pre-suppression; classifier decides pattern-specific ambiguity
- `backend/src/controllers/observability.controller.ts` — executive boundary: always `CATEGORICAL_PREVALENCE`, bands only, `toExecutivePatternRows` + `toPrevalenceBand`
- `backend/tests/services/signal-detectors.test.ts` — scenarios A–D, C1/C2 verification
- `backend/tests/services/pattern-classifier.test.ts` — F UNKNOWN + friction+UNKNOWN
- `backend/tests/services/classification-pipeline.service.test.ts` — RECOVERY_MATURITY integration
- `backend/tests/controllers/observability.controller.test.ts` — numeric stored → categorical response
- `backend/tests/e2e/observability-controller.e2e.test.ts` — no `share`, `prevalence_band` required
- `backend/tests/governance/helpers/governance-matchers.ts` — pattern rows: no `share` in allowlist
- `backend/tests/governance/aggregation-safety.regression.test.ts` — boundary conversion assertions

## API / type follow-ons

- `ObservabilityWorkflowPayload.prevalence_mode` is now the literal `"CATEGORICAL_PREVALENCE"`; pattern rows always include `prevalence_band` and never `share`. Clients or OpenAPI that documented `share` on this endpoint must update.
