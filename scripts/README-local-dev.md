# Local Dev Backend With Postgres

Use this path for full-scale LMSYS runs. The in-memory backend reports
`db: "not_configured"` and is not suitable for 1M events.

## Option A: Local Docker Postgres

Start Postgres:

```bash
docker compose -f infra/docker-compose.yml up -d postgres
```

Export local database settings:

```bash
export DATABASE_URL="postgresql://fluency:fluency@localhost:5432/fluency?schema=public"
export DIRECT_URL="$DATABASE_URL"
export JWT_SECRET="dev-secret"
export DEV_HEADER_AUTH=true
```

Apply Prisma migrations:

```bash
npx prisma migrate deploy --schema backend/prisma/schema.prisma
```

Start the backend:

```bash
DEV_HEADER_AUTH=true npm run dev --workspace backend
```

Verify the backend is using Postgres:

```bash
curl -s http://localhost:4000/health
```

Expected health payload includes:

```json
{ "status": "ok", "db": "postgres" }
```

Run the LMSYS sample seed:

```bash
BACKEND_URL=http://localhost:4000 npm run seed:lmsys:sample
```

## Option B: Existing Supabase Postgres

Use this when the full 1M event run should use an existing Supabase project
instead of local Docker. Do not commit real credentials.

```bash
export DATABASE_URL="<supabase pooled connection string>"
export DIRECT_URL="<supabase direct connection string>"
export JWT_SECRET="dev-secret"
export DEV_HEADER_AUTH=true
npx prisma migrate deploy --schema backend/prisma/schema.prisma
DEV_HEADER_AUTH=true npm run dev --workspace backend
```

Then verify `/health` and run `npm run seed:lmsys:sample` the same way as the
local Docker path.

## Notes

- `DATABASE_URL` and `DIRECT_URL` are both required by Prisma.
- The LMSYS seed scripts use dev header auth locally, so the backend should be
  started with `DEV_HEADER_AUTH=true`.
- For full-scale seeding, keep Postgres running and use `npm run seed:lmsys`.
