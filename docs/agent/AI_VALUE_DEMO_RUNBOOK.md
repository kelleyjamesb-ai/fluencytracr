# AI Value Platform - end-to-end demo runbook

This is the path from a clean checkout to a clickable, fully populated AI Value
chain in the app (Discovery -> Workshop -> Journey -> in-app executive readout).

There are two ways to see the platform. Pick based on what you need.

---

## Option A - zero-setup sponsor readout (no database)

If you only need the **sponsor-ready executive readout artifact**, you do not
need Postgres, the backend, or the frontend:

```bash
npm run generate:ai-value-readout
# writes docs/contracts/ai-value-intelligence/examples/customer-support-executive-readout.html
```

To preview the chain itself without a database, run it in-process:

```bash
npm run run:ai-value-chain -- --out-dir /tmp/ai-value-chain
# prints the decision + halt status and writes the generated
# value_scenario / evidence_readiness / claim_boundary / executive_packet
```

To render the readout **with customer outcome evidence** attached:

```bash
npm run build --workspace shared
node scripts/generate_ai_value_readout_html.mjs \
  --evidence docs/contracts/ai-value-intelligence/examples/customer-support-outcome-evidence-export.json \
  --output /tmp/readout-with-evidence.html
```

---

## Option B - the full in-app click-through

The Journey/Workspace pages read live, org-scoped objects from the
`ai_value_objects` table, so the app is **empty until you seed it**. Run these
steps in order.

### 1. Start Postgres

```bash
docker compose -f infra/docker-compose.yml up -d postgres
cp backend/.env.example backend/.env   # if you don't already have one
```

`backend/.env` defaults to `postgresql://fluency:fluency@localhost:5432/fluency`.

### 2. Bring the database schema up

- **Fresh / empty database:**
  ```bash
  npm exec --workspace backend prisma migrate deploy
  ```
- **Existing dev DB built outside Prisma** (you hit `P3005: schema is not
  empty`): the schema was applied via `prisma db execute`/`db push` and has no
  migration history. Baseline it once, then deploy is a no-op:
  ```bash
  export DATABASE_URL="postgresql://fluency:fluency@localhost:5432/fluency?schema=public"
  export DIRECT_URL="$DATABASE_URL"
  npm run db:baseline
  ```
  `db:baseline` records every existing migration as already-applied (no DDL is
  run), which creates `_prisma_migrations` and unblocks future `migrate deploy`.

### 3. Build the engine and start the backend

```bash
npm run build --workspace shared
npm run dev --workspace backend     # sets DEV_HEADER_AUTH=true, serves on :4000
```

`DEV_HEADER_AUTH=true` lets the frontend and the seeder authenticate with
`x-role` / `x-org-id` headers instead of minted JWTs. `npm run dev` sets it
automatically; if you launch the backend another way, set it yourself (it is
documented in `backend/.env.example`). **Never enable it outside local dev.**

### 4. Seed the demo chain

With the backend running:

```bash
npm run seed:ai-value
# seeds engagement, fluency_baseline, blueprint, metrics_library, and an
# ACCEPTED outcome_evidence_export into org "org-northstar-enterprise", then
# runs the value chain to generate scenario / readiness / claim_boundary /
# executive_packet.
```

Override the target with `--org`, `--role`, or `--base` (or the
`AI_VALUE_ORG` / `AI_VALUE_ROLE` / `AI_VALUE_API_BASE` env vars).

### 5. Set the demo org in the browser and open the app

```bash
npm run dev --workspace frontend
```

The app defaults to org `org-1`, but the seed lives in
`org-northstar-enterprise`. Point the browser at it before opening the value
pages, either way:

- Visit `/login` and enter Organization ID `org-northstar-enterprise`, **or**
- In the browser console: `localStorage.setItem("orgId", "org-northstar-enterprise")`

Then open **`/ai-value`** (Value Journey). You should see every stage populated;
click into Discovery/Workshop, and use **Open executive readout** to view the
sponsor HTML rendered from the seeded packet.

---

## Troubleshooting

- **Pages are empty / "Sign in with an organization session":** the browser org
  doesn't match the seeded org. Redo step 5.
- **Seeder prints `HTTP 0` / connection error:** the backend isn't running or
  `DEV_HEADER_AUTH` is off. Redo step 3.
- **`P3005` on `migrate deploy`:** use `npm run db:baseline` (step 2).
- **`/ops/db/readiness` reports `schema_incomplete` for `ai_value_objects`:** the
  migration wasn't applied - run step 2.
