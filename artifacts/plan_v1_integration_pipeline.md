# Plan: FluencyTracr v1 application pipeline integration

## Objective
Wire canonical validation, trace reconstruction, FSC, minimum signal gate, signal detectors, pattern classifier, suppression engine, and workflow aggregation into repositories + HTTP-style controllers.

## Harness
- Single session deliverable: implementation + tests + `agent-progress` append.

## Seams
1. **Ingest boundary**: optional upstream `actor_type` mapping → canonical only before validation.
2. **Execution builder**: single `execution_id`, deterministic ordering, structural flags only.
3. **Classification pipeline**: DI-friendly deps, persist outcome, refresh per-workflow aggregate.
4. **Observability**: workflow aggregates only via `WorkflowAggregateRepository`.

## Verification
- `npm run test:ci --workspace backend` (new test files included).
