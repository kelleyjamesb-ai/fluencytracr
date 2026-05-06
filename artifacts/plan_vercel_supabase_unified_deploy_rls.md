# Plan: unified Vercel deployment and Supabase RLS hardening

## Scope

- Replace external backend rewrites with one root Vercel Services configuration.
- Add a backend service entrypoint that preserves the existing public route contract.
- Remove service-local Vercel configs so the root config is authoritative.
- Add a Prisma migration that enables RLS and revokes exposed-role access for public app tables.
- Update durable project state for this bounded slice.

## Fail-first checks

- Vercel Services currently has only one documented `routePrefix` per service, so non-`/api` backend routes need internal rewrites.
- Backend route prefix behavior can vary by service proxy shape, so the adapter should tolerate both prefix-stripped and prefix-preserved requests.
- Supabase live database credentials must stay out of the repo. The migration was applied from the operator environment after replacing Vercel's production database envs and verifying the working shared pooler URL.

## Verification

- `npm run build --workspace frontend`
- `npm run build --workspace backend`
- `npx openspec validate update-vercel-single-project-services --strict`
- Vercel production deployment after linking/deploying the canonical frontend project.
- Authenticated production `/health` returns `db: "ok"`.
- RLS is enabled on the existing public application tables covered by the migration.
