# FluencyTracr v1 — End-to-End Test Harness

## 1. Test Harness Summary

Executable integration coverage for the v1 path: **ingest boundary** (`validateInboundCanonicalEvent` + actor map) → **canonical validation** → **append-only `InMemoryEventRepository`** → **`runClassificationPipeline`** (execution build, FSC, minimum-signal, detectors, pattern classifier, suppression, classification + workflow aggregates) → **controller handlers** (`handlePostEvents`, `handleGetObservability`). Uses **Jest**, **deterministic ISO timestamps**, **in-memory repositories**, **no network** and **no DB**. Fail-closed assertions on status codes, suppression reasons, repository counts, and observability payload shape. **Scenario 4 (AMBIGUITY)** uses a **targeted `jest.spyOn`** on `classifyBehaviorPattern` (same technique as `classification-pipeline.service.test.ts`) because structural “natural ambiguity” without recovery/FSC side effects is tightly coupled to signal-detector ordering.

**Production fix (boundary):** Successful actor normalization now **drops** the upstream-only `actor` field so the canonical validator does not reject `unknown_field:actor` after mapping (`src/integration/v1-pipeline-types.ts`).

**Path note:** Jest is configured with `testMatch: **/tests/**/*.test.ts` under `backend/`. Implementations live in `backend/tests/...`, not `backend/src/tests/...` (would require `jest.config` changes).

---

## 2. File Tree

```
backend/tests/fixtures/canonical-events.fixtures.ts
backend/tests/fixtures/upstream-events.fixtures.ts
backend/tests/helpers/in-memory-dependencies.ts
backend/tests/helpers/test-app.factory.ts
backend/tests/e2e/pipeline.e2e.test.ts
backend/tests/e2e/suppression.e2e.test.ts
backend/tests/e2e/events-controller.e2e.test.ts
backend/tests/e2e/observability-controller.e2e.test.ts
backend/src/integration/v1-pipeline-types.ts   (boundary: strip `actor` after map)
```

---

## 3. Test Fixtures

- **`canonical-events.fixtures.ts`** — `happyPathExecution`, `fscMissingStartExecution`, `minimumSignalFailureExecution`, `happyPathWorkflowB`; shared `fixtureIds` + `TS` timestamps.
- **`upstream-events.fixtures.ts`** — `validUpstreamIngest` (`actor: "user"`), `unmappableActorUpstream` (`actor_type: "extraterrestrial"`).

---

## 4. Test Helpers

- **`createE2eInMemoryStack(applyActorMapping?)`** — wires `InMemoryEventRepository`, `InMemoryClassificationRepository`, `InMemoryWorkflowAggregateRepository` into `PostEventsControllerDeps` + `GetObservabilityControllerDeps`.
- **`postIngestPayload` / `getObservabilityForOrg`** — thin wrappers over `handlePostEvents` / `handleGetObservability`.

---

## 5. End-to-End Pipeline Test

`pipeline.e2e.test.ts`: **Scenario 1** (happy path ALLOWED + aggregate), **Scenario 2** (FSC → `INCOMPLETE_EXECUTION`, empty pattern distribution), **Scenario 3** (`INSUFFICIENT_SIGNAL`), **Scenario 6** (two workflows, workflow-scoped aggregates + org classification split).

---

## 6. Suppression Scenario Tests

`suppression.e2e.test.ts`: **Scenario 4** — spy forces classifier ambiguity → `SUPPRESSED` / `AMBIGUITY`. Scenarios 2–3 are also asserted in `pipeline.e2e.test.ts` (same suppression reasons).

---

## 7. Controller Integration Tests

`events-controller.e2e.test.ts`: **Scenario 1** — three sequential posts, append-only order, final classification **ALLOWED**; **upstream actor map** with `applyActorMapping: true`; **Scenario 5** — `422` / `unknown_actor_label`, zero events, null classification.

---

## 8. Observability Safety Tests

`observability-controller.e2e.test.ts`: **Scenario 7** — after mixed ALLOWED + suppressed executions, `GET`-style handler returns **200**; explicit **allowlist keys** per workflow and pattern row; **string scan** rejects substrings for execution correlation leaks, traces, rankings, trends, thresholds, diagnostics, raw payload phrases.

---

## 9. Notes on Running the Suite

```bash
cd backend
npm run test:ci -- --testPathPattern=e2e
```

Full backend: `npm run test:ci`.

---

## Mapping to requested `src/tests/...` paths

| Requested | Implemented |
|-----------|----------------|
| `src/tests/fixtures/...` | `backend/tests/fixtures/...` |
| `src/tests/helpers/...` | `backend/tests/helpers/...` |
| `src/tests/e2e/...` | `backend/tests/e2e/...` |
