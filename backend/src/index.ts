import { app } from "./app";
import { store } from "./store";

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

// Auto-initialize org from env vars on startup so the dashboard works without
// a manual "Initialize Organization" click.
// Set SEED_ORG_ID and SEED_ORG_NAME in the environment to enable this.
//
// When DATABASE_URL is configured the in-memory seed is intentionally skipped:
// the org middleware hydrates the real record from the database on the first
// request, so writing seed defaults here would mask persisted config
// (complianceMode, minGroupSize, org name) with stale hardcoded values.
const seedOrgId = process.env.SEED_ORG_ID?.trim();
const seedOrgName = process.env.SEED_ORG_NAME?.trim();
const databaseConfigured = !!process.env.DATABASE_URL?.trim();
if (seedOrgId && seedOrgName && !databaseConfigured && !store.orgs.has(seedOrgId)) {
  store.orgs.set(seedOrgId, {
    id: seedOrgId,
    name: seedOrgName,
    minGroupSize: 10,
    createdAt: new Date().toISOString(),
    complianceMode: "shadow",
  });
  console.log(`[seed] Auto-initialized org "${seedOrgName}" (${seedOrgId})`);
}
if (seedOrgId && seedOrgName && databaseConfigured) {
  console.log(`[seed] DATABASE_URL is set — skipping in-memory seed for org "${seedOrgId}", config will be hydrated from DB on first request`);
}

app.listen(port, () => {
  console.log(`Backend listening on ${port}`);
});
