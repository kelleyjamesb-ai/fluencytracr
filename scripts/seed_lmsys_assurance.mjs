#!/usr/bin/env node
import { buildAssuranceCases } from "./seed_lmsys_assurance_transform.mjs";
import {
  backendUrlFromEnv,
  DEFAULT_BATCH_SIZE,
  ensureOrg,
  orgIdFromEvent,
  postEventsGroupedByOrg
} from "./seed_lmsys.mjs";

function uniqueOrgIds(cases) {
  const ids = new Set();
  for (const entry of cases) {
    if (entry.org_id) {
      ids.add(entry.org_id);
    }
    for (const event of entry.events ?? []) {
      ids.add(orgIdFromEvent(event));
    }
  }
  return [...ids].sort();
}

async function main() {
  const backendUrl = backendUrlFromEnv();
  const runLabel = process.env.ASSURANCE_RUN_ID ?? `seed-${Date.now().toString(36)}`;
  const cases = buildAssuranceCases({ runLabel });
  const events = cases.flatMap((entry) => entry.events ?? []);
  const orgIds = uniqueOrgIds(cases);

  for (const orgId of orgIds) {
    await ensureOrg({ backendUrl, orgId, name: `LMSYS Assurance ${orgId}` });
  }

  const posted = await postEventsGroupedByOrg({
    backendUrl,
    events,
    batchSize: Number(process.env.BATCH_SIZE ?? DEFAULT_BATCH_SIZE)
  });

  console.log(
    JSON.stringify(
      {
        status: "PASS",
        backend_url: backendUrl,
        run_label: runLabel,
        cases: cases.length,
        events_generated: events.length,
        ...posted
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(JSON.stringify({ status: "FAIL", error: error.message }, null, 2));
  process.exit(1);
});
