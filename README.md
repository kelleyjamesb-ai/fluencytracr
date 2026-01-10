# learnaire-fluency

Full-stack MVP for translating AI enablement into executive-safe fluency metrics.

## Monorepo layout
- `backend/` Node.js + TypeScript + Express + Prisma
- `frontend/` React + TypeScript + Vite
- `shared/` Shared types + JSON schemas
- `infra/` Docker compose for Postgres

## Quickstart
```bash
npm install
npm run migrate
npm run dev
```

## Scripts
- `npm run dev` - run dev servers
- `npm run test` - run tests
- `npm run lint` - run linters
- `npm run migrate` - run Prisma migrations
