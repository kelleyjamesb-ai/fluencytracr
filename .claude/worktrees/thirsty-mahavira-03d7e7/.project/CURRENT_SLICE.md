# Current Slice Contract

- Work item id: `ci-frontend-test-toolchain-alignment`
- Title: `Frontend test toolchain alignment for CI matcher regression`
- Status: `completed`

## Summary

Aligned the frontend workspace test toolchain with the checked-in lockfile so CI and local runs resolve the same Vitest/Vite stack, restoring jest-dom matcher registration for `ProtectedRoute.test.tsx` under CI.

## Scope Paths

- `package.json`
- `package-lock.json`
- `frontend/package.json`
- `frontend/vite.config.ts`
- `frontend/src/test/setup.ts`
- `frontend/src/components/ProtectedRoute.test.tsx`

## Key Risks

- Root and frontend toolchain versions can resolve different `vitest` / `vite` instances.
- Lockfile refresh can introduce broader dependency churn than intended.
- Fixing matcher symptoms without addressing toolchain skew would leave CI unstable.

## Planned Checks

- Reproduce the frontend failure mode with dependency tree inspection and targeted test runs.
- Run the frontend Vitest suite after alignment.
- Confirm the workspace resolves a single valid Vitest/Vite line for frontend.

## Evaluator Command Profile

`targeted` by default:

- `npm ls vitest --all`
- `npm ls vite --all`
- `npm test --workspace frontend`

Escalate to `strict` only if the slice becomes cross-cutting:

- `./harness/scripts/verify.sh`
- `npm run build --workspace shared`
- `npm run test:ci --workspace backend`
- `npm test --workspace frontend`

## Evaluator Pass Criteria

- Only declared scope paths are changed.
- `npm ls vitest --all` and `npm ls vite --all` no longer report frontend-invalid resolutions.
- `npm test --workspace frontend` passes.
- No blocker remains unrecorded in `.project/PROGRESS.md`.

## Specialists To Consult

- Frontend/build specialist if package alignment creates dependency ambiguity.
- Review specialist if evaluator results suggest collateral CI risk.

## Next Handoff Note

Completed by realigning `frontend/package.json` to the locked `vite`/`vitest` versions already used in the workspace. Next bounded unit should return to phase-03 backend work unless new CI failures appear.
