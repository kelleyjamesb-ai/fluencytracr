# CI + Vercel remediation (2026-04-01)

## GitHub Actions fixes (in-repo)

### 1. Frontend tests (`Cannot find package 'vitest'`)

`@testing-library/jest-dom` is hoisted to the repo root; its `vitest` entry re-exports `vitest`, which must resolve from the root `node_modules`. Vitest was only under `frontend/node_modules`, so `npm test --workspace frontend` failed on CI.

**Fix:** add `vitest` as a **root** `devDependency` (aligned with `frontend`’s `^2.1.8`) and refresh `package-lock.json`.

### 2. Doc scripts (`rg: command not found`)

`scripts/ci_docs_contract_sweep.sh` and `scripts/ci_linkcheck_fluency_docs.sh` call **ripgrep** (`rg`). It is **not** preinstalled on `ubuntu-latest`.

**Fix:** in `ci.yml` `node-tests`, add:

`sudo apt-get update && sudo apt-get install -y ripgrep`

before steps that run those scripts.

### 3. Workflow hygiene

- `ci.yml` / `governance-gate.yml`: `actions/checkout@v5`, `actions/setup-node@v6`, Node **22**, `npm` cache, `upload-artifact@v5`, `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` (GitHub Actions JS runtime).
- `test.yml`: `checkout@v5`, `setup-python@v5`.
- `enforcement-state-gate.yml`: `checkout@v5`.

## Vercel (not fully fixable in YAML alone)

### Frontend — `Git author james-kelley-glean must have access`

The Vercel project is tied to a team/account where commits from **`james-kelley-glean`** are not allowed to deploy until that user is added.

**Do this in Vercel:** Project → **Settings → Git** (or **Team → Members**) → invite/add **`james-kelley-glean`** with deploy access, *or* adjust **Deployment Protection** / **Git** settings so your GitHub user is authorized. If the repo moved or the Vercel link is under another account, reconnect the correct Git integration.

### Backend — “Deployment has failed — run … `npx vercel`”

Use the CLI from the machine (or CI) with the same root as the linked project:

```bash
cd backend   # or repo root, matching how the Vercel project is configured
npx vercel --prod
```

Read the build log: common issues are wrong **Root Directory** (monorepo must use `frontend` vs `backend` vs repo root consistently), missing env vars (`DATABASE_URL`, etc.), or `npm run build` failing (e.g. Prisma generate, shared package build).

### Sanity checks

- Each Vercel project’s **Root Directory** matches where `package.json` / `vercel.json` apply (`frontend/`, `backend/`, or `.`).
- **Install command** for monorepos often needs to run from repo root (e.g. `npm install`) if workspaces are used.

## Local dev without `rg`

CI installs ripgrep automatically. On macOS you can `brew install ripgrep` to run `scripts/ci_docs_contract_sweep.sh` and `scripts/ci_linkcheck_fluency_docs.sh` locally.
