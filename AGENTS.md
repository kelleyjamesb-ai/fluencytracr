## Every coding session (mandatory)

**Read [`docs/agent/SESSION_START.md`](docs/agent/SESSION_START.md) first** — how to start every time, where memory lives (queue, harness, git), and how queue + Anthropic-style harness fit together. Then continue with OpenSpec, queue, or harness sections below as applicable.

<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

## Agent execution (queue)

**START HERE (queue-driven work):** `agents/core/SYSTEM_PROMPT.md` → `.project/GOVERNANCE.md` → `.project/WORK_QUEUE.json` → `.project/PROGRESS.md`. Then `.antigravity/rules.md`.

## Local workspace vs GitHub

Treat **files in this Cursor workspace as source of truth** until you commit and push. Do not assume the remote default branch matches uncommitted local state.

## Repo map (start here)

| Area | Path |
| --- | --- |
| **Queue + session state** (one `in_progress` item) | [`.project/GOVERNANCE.md`](.project/GOVERNANCE.md), [`.project/WORK_QUEUE.json`](.project/WORK_QUEUE.json), [`.project/PROGRESS.md`](.project/PROGRESS.md) |
| **Agent navigation hub** (maps, contracts, evaluation) | [`docs/agent/README.md`](docs/agent/README.md) |
| **Long-running harness** (sessions, checklist, handoff) | [`harness/README.md`](harness/README.md) |
| **OpenSpec** (proposals, specs, validate) | [`openspec/AGENTS.md`](openspec/AGENTS.md) |
| **Architecture** | [`docs/ARCHITECTURE_MAP.md`](docs/ARCHITECTURE_MAP.md) |
| **CI truth** | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |

## Long-running agent harness (Codex, Claude, Cursor)

For multi-session work, follow [`harness/README.md`](harness/README.md). First session: [`harness/prompts/initializer.md`](harness/prompts/initializer.md). Later sessions: [`harness/prompts/incremental_session.md`](harness/prompts/incremental_session.md). Checklist: [`harness/feature_list.json`](harness/feature_list.json); handoff log: [`harness/agent-progress.txt`](harness/agent-progress.txt). After substantive edits, run checks in [`docs/agent/EVALUATION.md`](docs/agent/EVALUATION.md) (includes `./harness/scripts/verify.sh`).

## Cursor Cloud specific instructions

### Services overview

This is an npm workspaces monorepo with workspaces: `backend`, `frontend`, `shared`, `packages/fluencytracr-mcp`, `packages/glean-publisher`, `integrations/openai-agents`. It also has a Python component at the repo root (`requirements.txt`, `tests/`).

### Build order (must be followed)

1. `npm run build --workspace shared` — backend and frontend both depend on `@learnaire/shared`
2. `npm run generate --workspace backend` — generates Prisma client (required even for in-memory tests)

### Running tests

- **Backend (Jest):** `npm run test:ci --workspace backend` — tests blank `DATABASE_URL` and `DIRECT_URL` so no DB needed
- **Frontend (Vitest):** `npm test --workspace frontend`
- **Python (pytest):** `python3 -m pytest tests/ -q` — use `python3` not `python`
- **MCP package:** `npm run test --workspace @learnaire/fluencytracr-mcp`
- **Glean publisher:** `npm run test --workspace @learnaire/glean-publisher`

### Running dev servers

The backend requires Docker + PostgreSQL. Start Postgres via `sudo docker compose -f infra/docker-compose.yml up -d` (user/pass/db: `fluency`, port 5432). Then sync schema with `prisma db push` (not `prisma migrate deploy` — migrations have a pre-existing ordering issue with the `Organization` table). Copy `backend/.env.example` to `backend/.env` for `DATABASE_URL` and `JWT_SECRET`.

- **Backend:** `npm run dev --workspace backend` — Express on port 4000 (sets `DEV_HEADER_AUTH=true` for dev token generation)
- **Frontend:** `npm run dev --workspace frontend` — Vite on port 5173 with proxy to backend for `/api`, `/auth`, `/health`, `/orgs`
- **Auth:** `POST /auth/token` with `{"org_id": "...", "role": "ADMIN", "email": "..."}` — no real auth provider, JWT is self-issued

### Gotchas

- ESLint configs (`backend/.eslintrc.json`, `frontend/.eslintrc.json`) lack a TypeScript parser; `npm run lint` fails on all TS files. Lint is **not** part of CI.
- Prisma schema requires both `DATABASE_URL` and `DIRECT_URL` env vars. Tests blank them intentionally. For dev/push operations set both.
- The `version` key in `infra/docker-compose.yml` triggers a Docker Compose v2 deprecation warning — harmless.
- CI uses Node 20 and Python 3.11; Node 22 and Python 3.12 work locally without issues.
