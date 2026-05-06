# Current Slice Contract

- Work item id: `vercel-services-and-supabase-rls-hardening`
- Title: `Unify Vercel frontend/backend Services deployment and harden Supabase public-table RLS`
- Status: `completed`

## Summary

Implemented the approved Vercel Services consolidation slice, added a backend service adapter for preserved public routes, disconnected the old backend Vercel project from GitHub, and added a Prisma migration to enable RLS/revoke exposed-role access for public application tables.

## Scope Paths

- `.gitignore`
- `.agents/skills/supabase/SKILL.md`
- `.agents/skills/supabase-postgres-best-practices/SKILL.md`
- `skills-lock.json`
- `vercel.json`
- `frontend/vercel.json`
- `backend/vercel.json`
- `backend/package.json`
- `backend/tsconfig.json`
- `backend/src/vercel.ts`
- `backend/prisma/migrations/20260506120000_enable_rls_on_public_app_tables/migration.sql`
- `openspec/changes/update-vercel-single-project-services/tasks.md`
- `artifacts/plan_vercel_supabase_unified_deploy_rls.md`
- `.project/CURRENT_SLICE.md`
- `.project/PROGRESS.md`

## Key Risks

- Vercel Services uses one backend route prefix, so `/auth`, `/health`, and `/orgs` rely on internal rewrites into the backend adapter.
- Vercel's backend builder resolved workspace TypeScript paths through `shared/src`; `backend/tsconfig.json` now resolves `@learnaire/shared` to `shared/dist`, matching the build config and avoiding a runtime bundle error.
- Supabase's transaction-pooler URL on port `6543` rejected the reset database password; the working production runtime URL uses the shared pooler on port `5432`.
- Vercel envs are dashboard state, not repo state, so future clones still need `vercel env pull` for local runtime secrets.

## Planned Checks

- Parse `vercel.json`.
- Run strict OpenSpec validation for `update-vercel-single-project-services`.
- Build frontend and backend workspaces.
- Run Vercel build with Services support.
- Deploy a canonical frontend-project preview and smoke public routes.

## Evaluator Command Profile

`targeted` for this deployment/security slice:

- `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))"`
- `npx openspec validate update-vercel-single-project-services --strict`
- `npm run build --workspace frontend`
- `npm run build --workspace backend`
- `vercel build`
- `vercel deploy --prebuilt`
- production smoke against `learn-air-engable-tool-frontend.vercel.app`

## Evaluator Pass Criteria

- Root Vercel config defines `frontend` and `backend` services and contains no external backend rewrites.
- Service-local Vercel configs no longer act as independent deployment authorities.
- Production deployment from `learn-air-engable-tool-frontend` is READY and aliased.
- `/` returns frontend HTML; `/health`, `/api/ingest`, and `/orgs/...` reach the backend service; `/auth/token` issues a backend response.
- Authenticated DB-backed routes return `200` with `db: "ok"` after replacing production Supabase credentials and redeploying.
- Backend project is disconnected from GitHub so future pushes should not create duplicate backend Vercel checks.
- RLS migration is applied live and verified enabled on the existing public application tables covered by the migration.

## Specialists To Consult

- Vercel/deployment specialist if production promotion exposes Services-specific routing differences.
- Supabase/database specialist when applying the RLS migration to live.

## Next Handoff Note

Completed: unified Vercel Services production is deployed at `https://learn-air-engable-tool-frontend.vercel.app`, the old backend Vercel project has been disconnected from GitHub, production Supabase envs are replaced in Vercel, authenticated `/health` returns `db: "ok"`, and the live RLS migration has been applied and verified.
