import { app } from "./app";
import { store } from "./store";

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

// Auto-initialize org from env vars on startup so the dashboard works without
// a manual "Initialize Organization" click.
// Set SEED_ORG_ID and SEED_ORG_NAME in the environment to enable this.
const seedOrgId = process.env.SEED_ORG_ID?.trim();
const seedOrgName = process.env.SEED_ORG_NAME?.trim();
if (seedOrgId && seedOrgName && !store.orgs.has(seedOrgId)) {
  store.orgs.set(seedOrgId, {
    id: seedOrgId,
    name: seedOrgName,
    minGroupSize: 10,
    createdAt: new Date().toISOString(),
    complianceMode: "shadow",
  });
  console.log(`[seed] Auto-initialized org "${seedOrgName}" (${seedOrgId})`);
}

app.listen(port, () => {
  console.log(`Backend listening on ${port}`);
});
