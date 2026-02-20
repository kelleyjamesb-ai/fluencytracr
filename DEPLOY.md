# Deployment Guide

The frontend is a Vite/React SPA deployed on **Vercel**.
The Express backend is deployed as a standalone service on **Render** or **Fly.io**.

---

## 1. Deploy the Express backend

### Option A — Render

1. Create a new **Web Service** in [Render](https://render.com) and connect this repo.
2. Set **Root Directory** to `backend` (or leave blank and use the commands below).
3. Configure the service:

   | Field            | Value                                   |
   |------------------|-----------------------------------------|
   | **Environment**  | Node                                    |
   | **Build Command**| `npm install && npm run build --workspace backend` |
   | **Start Command**| `npm run start --workspace backend`      |

4. Add the required environment variables (see [Required env vars](#3-required-environment-variables)).

### Option B — Fly.io

```bash
# From the repo root
fly launch --name learnair-backend --no-deploy
fly secrets set DATABASE_URL="postgresql://..." CORS_ORIGIN="https://your-app.vercel.app"
fly deploy
```

Add a `fly.toml` in `backend/` if you need custom port or region settings:

```toml
[build]
  dockerfile = "Dockerfile"   # optional; Fly can detect Node automatically

[http_service]
  internal_port = 4000
  force_https   = true
```

---

## 2. Required environment variables (backend)

| Variable        | Required | Description |
|-----------------|----------|-------------|
| `DATABASE_URL`  | ✅       | PostgreSQL connection string used by Prisma.<br>Example: `postgresql://user:pass@host:5432/db?schema=public` |
| `DIRECT_URL`    | optional | Direct (non-pooled) Postgres URL for Prisma migrations / Supabase pooler setups.<br>Omit if connecting to Postgres directly. |
| `CORS_ORIGIN`   | ✅ (prod) | Comma-separated list of allowed frontend origins.<br>Example: `https://my-app.vercel.app` |
| `PORT`          | optional | HTTP port the server listens on. Defaults to `4000`. |

> **No JWT/auth secrets** are required by the current implementation — role-based access is
> carried via the `x-role` request header and enforced server-side by the RBAC middleware.
> If you add token-based auth later, add `JWT_SECRET` here.

### Database migrations

Run once after provisioning your database:

```bash
DATABASE_URL="postgresql://..." npm run migrate --workspace backend
```

---

## 3. Deploy the frontend to Vercel

### Vercel project settings

| Field              | Value                                     |
|--------------------|-------------------------------------------|
| **Framework**      | Vite (auto-detected)                      |
| **Root Directory** | *(leave blank — `vercel.json` is at root)*|
| **Build Command**  | `npm run build --workspace frontend`      |
| **Output Dir**     | `frontend/dist`                           |

### Required Vercel environment variable

Go to **Vercel → Project → Settings → Environment Variables** and add:

| Name                | Value                                          | Environment |
|---------------------|------------------------------------------------|-------------|
| `VITE_API_BASE_URL` | `https://<your-backend>.onrender.com` (or Fly) | Production  |

> Leave `VITE_API_BASE_URL` **empty** for Preview/Development deployments so that the
> Vite dev-server proxy (`vite.config.ts`) continues to route `/api` and `/orgs` to
> `localhost:4000`.

### No mocks in production builds

There is no Mock Service Worker (MSW) or any mock layer in this codebase.
All API calls go directly to the backend. No mock-disabling configuration is needed.

---

## 4. Local development

```bash
# 1. Install all workspace deps
npm install

# 2. Copy and fill in env files
cp backend/.env.example backend/.env
# Set DATABASE_URL in backend/.env (leave CORS_ORIGIN blank for local dev)

cp frontend/.env.example frontend/.env
# Leave VITE_API_BASE_URL empty — the Vite proxy handles /api + /orgs → localhost:4000

# 3. Run migrations
npm run migrate --workspace backend

# 4. Start both services
npm run dev --workspace backend   # http://localhost:4000
npm run dev --workspace frontend  # http://localhost:5173
```

---

## 5. Production smoke test

After deploying both services, run these checks:

### Backend health

```bash
BACKEND=https://your-backend.onrender.com

# Health check
curl -s "$BACKEND/health"

# Orientation summary (replace org-1 with a real org ID)
curl -s \
  -H "x-role: EXEC_VIEWER" \
  "$BACKEND/api/orientation/org-1?window=60d" | jq .

# Board snapshot
curl -s \
  -H "x-role: EXEC_VIEWER" \
  "$BACKEND/api/board-snapshot/org-1?window=60d" | jq .

# Workflow list
curl -s \
  -H "x-role: EXEC_VIEWER" \
  "$BACKEND/api/workflows?org_id=org-1" | jq .
```

Expected: each command returns a JSON payload (not an HTML error page or CORS error).

### Frontend network check

1. Open the Vercel deployment URL in your browser.
2. Open **DevTools → Network → Fetch/XHR**.
3. Log in and navigate to the main governance page.
4. Confirm that requests to `/api/orientation/:orgId`, `/api/workflows`, and
   `/api/board-snapshot/:orgId` show **Status 200** and target your backend host
   (not `localhost`).
