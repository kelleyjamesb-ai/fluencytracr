#!/usr/bin/env node
import { buildGleanDocument } from "./gleanDocument.js";

function fluencyHeaders(orgId: string): Record<string, string> {
  const token = process.env.FLUENCYTRACR_SERVICE_TOKEN;
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  if (process.env.FLUENCYTRACR_DEV_HEADERS === "true" || process.env.FLUENCYTRACR_DEV_HEADERS === "1") {
    return {
      "x-role": process.env.FLUENCYTRACR_DEV_ROLE ?? "GOV_OPERATOR",
      "x-org-id": orgId
    };
  }
  return {};
}

async function fetchBundle(orgId: string, window: string): Promise<unknown> {
  const base = (process.env.FLUENCYTRACR_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const url = new URL(`${base}/api/evidence/bundles/${encodeURIComponent(orgId)}`);
  url.searchParams.set("window", window);
  const res = await fetch(url.toString(), { headers: fluencyHeaders(orgId) });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`fetch bundle ${res.status}: ${t}`);
  }
  return res.json() as Promise<unknown>;
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  if (cmd === "dry-run") {
    const orgId = process.env.GLEAN_PUBLISHER_ORG_IDS?.split(",")[0]?.trim();
    const window = process.env.GLEAN_PUBLISHER_WINDOW ?? "weekly";
    if (!orgId) {
      console.error("Set GLEAN_PUBLISHER_ORG_IDS (comma-separated) for dry-run fetch mode.");
      process.exit(1);
    }
    const bundle = await fetchBundle(orgId, window);
    const doc = buildGleanDocument(bundle);
    console.log(JSON.stringify(doc, null, 2));
    return;
  }
  if (cmd === "publish") {
    const orgId = process.env.GLEAN_PUBLISHER_ORG_IDS?.split(",")[0]?.trim();
    const window = process.env.GLEAN_PUBLISHER_WINDOW ?? "weekly";
    const indexUrl = process.env.GLEAN_INDEXING_URL;
    if (!orgId || !indexUrl) {
      console.error("publish requires GLEAN_PUBLISHER_ORG_IDS and GLEAN_INDEXING_URL");
      process.exit(1);
    }
    const bundle = await fetchBundle(orgId, window);
    const doc = buildGleanDocument(bundle);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const tok = process.env.GLEAN_INDEXING_TOKEN;
    if (tok) {
      headers.Authorization = `Bearer ${tok}`;
    }
    const res = await fetch(indexUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(doc)
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(text);
      process.exit(1);
    }
    console.error(`[glean-publisher] publish OK ${res.status}`);
    return;
  }
  console.error("Usage: glean-publisher <dry-run|publish>");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
