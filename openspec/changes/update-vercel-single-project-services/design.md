## Context

The current deployment model uses two Vercel projects:

- `fluencytracr-frontend`
- `fluencytracr-backend`

The root Vercel config deploys the Vite frontend and rewrites backend traffic to the separate backend deployment URL. This keeps the public app surface unified, but it creates duplicated deploys, duplicated project settings, and split operational state.

The desired end state is one canonical Vercel project using Services, with the frontend and backend built from the same repository and deployed together. The route surface must remain unchanged so the migration does not also become an application behavior change.

## Goals

- Use one canonical Vercel project for both frontend and backend.
- Preserve current public routes:
  - `/`
  - `/api`
  - `/auth`
  - `/health`
  - `/orgs`
- Make the root `vercel.json` the only authoritative deployment config.
- Keep rollback straightforward by limiting the change to deployment topology and config ownership.

## Non-Goals

- Redesign backend routes.
- Move APIs under a new prefix such as `/backend` or `/server`.
- Change frontend API consumers.
- Refactor backend business logic unrelated to Vercel service entry.

## Decisions

### Decision: Keep `fluencytracr-frontend` as the canonical project

Rationale:

- It already represents the user-facing application.
- It is already configured with the Services framework preset in Vercel.
- Consolidating into the frontend project minimizes public-facing disruption.

### Decision: Preserve the public route contract

The migration will preserve the current URLs and responsibilities:

- frontend service owns `/`
- backend service owns `/api`, `/auth`, `/health`, and `/orgs`

Rationale:

- avoids frontend/client churn
- avoids breaking auth flows and health integrations
- keeps rollback limited to deployment settings

### Decision: Root `vercel.json` becomes the only deployment authority

The root config will define the Services topology. Service-local `vercel.json` files should be removed or reduced so they no longer act as independent deployment authorities.

Rationale:

- avoids future split-brain configuration
- makes deployment ownership obvious

## Proposed Implementation Shape

1. Replace the current root rewrite-based Vite config with an `experimentalServices` config.
2. Define a frontend service pointing at `frontend/`.
3. Define a backend service pointing at a Services-compatible backend entrypoint.
4. Map the backend service to the existing public route prefixes.
5. Remove the external rewrite dependency on `fluencytracr-backend.vercel.app`.
6. Retain the old backend project only until preview and production verification pass.

## Risks

### Services compatibility risk

The current backend is an Express app started by `backend/src/index.ts`, which uses `app.listen(...)`. Services may require a cleaner service entrypoint than the existing standalone server start path.

Mitigation:

- add a minimal backend Vercel service entrypoint only if required
- do not change backend routes themselves

### Config drift risk

Leaving `frontend/vercel.json` or `backend/vercel.json` as active deployment configs could reintroduce split ownership.

Mitigation:

- root config becomes canonical
- subordinate configs are removed or explicitly deprecated in the same slice

### Dashboard override risk

Current Vercel project settings include build/install overrides that may conflict with the Services config.

Mitigation:

- verify and clear incompatible overrides during cutover
- validate with a preview deployment before deleting the old backend project

## Verification Plan

### Local

- `npm run build --workspace frontend`
- `npm run build --workspace backend`

### Vercel preview

- deploy from the canonical frontend project only
- verify frontend root loads
- verify `/health`
- verify at least one representative `/api` route
- verify `/auth` and `/orgs` still route to the backend service

### Cutover

- once preview passes, promote the unified project path
- then disable or delete the separate backend Vercel project

## Rollback

If the Services migration fails, restore the previous root rewrite config and keep the separate backend project active. Because public routes remain unchanged, rollback is primarily a deployment config reversal.
