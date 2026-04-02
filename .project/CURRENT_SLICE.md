# Current Slice Contract

- Work item id: `phase-03-fsc-min-signal`
- Title: `Phase 3 — FSC eligibility + minimum signal gates (hard pre-classify)`
- Status: `in_progress`

## Summary

Implement the current bounded slice for PRD phase 3: FSC eligibility and minimum-signal gating before any classification logic, with explicit reasons for incomplete execution and insufficient signal.

## Scope Paths

- `backend/`
- `shared/`
- `tests/`
- `artifacts/PRD_V1_BEHAVIORAL_OBSERVABILITY.md`

## Key Risks

- PRD mismatch between FSC gating and existing classification flow.
- Incorrect boundary between `INCOMPLETE_EXECUTION` and `INSUFFICIENT_SIGNAL`.
- Over-broad changes outside the current queue item.

## Planned Checks

- Targeted backend/shared tests covering FSC and minimum-signal gating.
- Governance-sensitive verification if contracts or disclosure behavior change.
- Strict repo verify only if the slice crosses package boundaries broadly enough to justify it.

## Evaluator Command Profile

`targeted` by default:

- `npm run build --workspace shared`
- `npm run test:ci --workspace backend`
- `python scripts/ci_v1_governance_gates.py` when governance-sensitive paths are touched

Escalate to `strict` only if the slice becomes cross-cutting:

- `./harness/scripts/verify.sh`
- `npm run build --workspace shared`
- `npm run test:ci --workspace backend`
- `npm test --workspace frontend`

## Evaluator Pass Criteria

- Only declared scope paths are changed.
- FSC and minimum-signal checks run before pattern classification.
- Tests covering the affected slice pass.
- No blocker remains unrecorded in `.project/PROGRESS.md`.

## Specialists To Consult

- Backend/domain specialist if PRD-to-code mapping is ambiguous.
- Review specialist if evaluator results suggest a regression risk.

## Next Handoff Note

Stay inside phase 03 scope. If implementation reveals missing or conflicting queue scope, update this contract and `.project/PROGRESS.md` before expanding work.
