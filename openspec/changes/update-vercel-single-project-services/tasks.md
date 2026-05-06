## 1. Implementation

- [x] 1.1 Replace the root Vercel rewrite config with a Services-based `vercel.json`.
- [x] 1.2 Add any required backend service entrypoint needed for Vercel Services compatibility.
- [x] 1.3 Remove or neutralize split-source `frontend/vercel.json` and `backend/vercel.json` ownership.
- [x] 1.4 Update durable project-state files for the migration slice and handoff.

## 2. Verification

- [x] 2.1 Run `npm run build --workspace frontend`.
- [x] 2.2 Run `npm run build --workspace backend`.
- [x] 2.3 Deploy a preview from the canonical Vercel project and verify `/`, `/health`, one `/api` route, `/auth`, and `/orgs`.

## 3. Cutover

- [x] 3.1 Confirm the unified preview behaves correctly with preserved public URLs.
- [x] 3.2 Remove reliance on the separate backend Vercel project.
- [x] 3.3 Record rollback notes and final project ownership in durable state.
