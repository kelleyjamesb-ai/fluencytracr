# Change: Consolidate Vercel frontend and backend into one Services project

## Why

The repository currently deploys the frontend and backend as two separate Vercel projects. This duplicates deployment triggers, settings, and operational troubleshooting even though both projects are sourced from the same repository and branch. The deployment topology should be simplified to one canonical Vercel project while preserving the current public route surface.

## What Changes

- Convert deployment topology from two Vercel projects to one canonical Vercel Services project.
- Keep the current public URLs unchanged: `/`, `/api`, `/auth`, `/health`, and `/orgs`.
- Replace external backend rewrites in the root Vercel config with internal service routing.
- Define one root-owned Vercel configuration as the canonical deployment source.
- Retire separate frontend/backend Vercel project ownership after the unified deployment is verified.

## Impact

- Affected specs: `deployment`
- Affected code:
  - `vercel.json`
  - `frontend/vercel.json`
  - `backend/vercel.json`
  - any backend Vercel service entrypoint needed for Services compatibility
  - project-state files under `.project/`
