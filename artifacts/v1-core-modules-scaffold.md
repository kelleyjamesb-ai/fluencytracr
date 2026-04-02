# v1 core modules scaffold

**Added (backend workspace, Jest):**

| Module | Path |
|--------|------|
| Canonical event schema | `backend/src/domain/canonical-event.schema.ts` |
| Execution state machine | `backend/src/domain/execution-state-machine.ts` |
| FSC evaluator | `backend/src/services/fsc-evaluator.ts` |
| Minimum signal gate | `backend/src/services/minimum-signal-gate.ts` |
| Pattern classifier | `backend/src/services/pattern-classifier.ts` |

**Tests:** `backend/tests/domain/*.test.ts`, `backend/tests/services/fsc-evaluator.test.ts`, `minimum-signal-gate.test.ts`, `pattern-classifier.test.ts`

**Run:** `npm run test:ci --workspace backend` (or jest with `--testPathPattern` for these paths).

**Note:** `ActorType` uses `"human" | "ai" | "system"` per spec; use `backend/src/services/ingest-actor-map.ts` at ingest boundaries only.

---

## Follow-on modules (trace, signals, suppression, aggregate)

| Module | Path |
|--------|------|
| Trace reconstruction | `backend/src/services/trace-reconstruction.service.ts` |
| Signal detectors | `backend/src/services/signal-detectors.ts` |
| Suppression engine | `backend/src/services/suppression-engine.ts` |
| Workflow aggregate | `backend/src/services/workflow-aggregate.service.ts` |
| Ingest actor map (boundary) | `backend/src/services/ingest-actor-map.ts` |

Tests: `backend/tests/services/trace-reconstruction.service.test.ts`, `signal-detectors.test.ts`, `suppression-engine.test.ts`, `workflow-aggregate.service.test.ts`, `ingest-actor-map.test.ts`.
