#!/usr/bin/env node
import { createGunzip } from "node:zlib";
import { createReadStream, readdirSync, statSync } from "node:fs";
import { createInterface } from "node:readline";
import { join, resolve } from "node:path";

import {
  resolvedBackendExecutionId,
  transformLmsysConversationToCanonicalEvents
} from "./seed_lmsys_transform.mjs";

export const DEFAULT_BACKEND_URL = "http://localhost:4000";
export const DEFAULT_DATA_DIR = "./data/lmsys";
export const DEFAULT_BATCH_SIZE = 500;
export const DEFAULT_MAX_RETRIES = 4;
export const DEFAULT_ORG_ID = "lmsys-org-assurance";
export const SCHEMA_VERSION = "0.1";

function env(name) {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : null;
}

function parsePositiveInt(value, fallback, label) {
  if (value === undefined || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return parsed;
}

export function backendUrlFromEnv() {
  return env("BACKEND_URL") ?? DEFAULT_BACKEND_URL;
}

export function orgIdFromEvent(event, fallback = env("ORG_ID") ?? DEFAULT_ORG_ID) {
  const orgUnit = typeof event?.org_unit === "string" ? event.org_unit : "";
  if (orgUnit.startsWith("org:")) {
    return orgUnit.slice(4).split(":")[0] || fallback;
  }
  return fallback;
}

export function requestHeaders(orgId = env("ORG_ID") ?? DEFAULT_ORG_ID) {
  const headers = {
    "content-type": "application/json",
    "x-role": "ADMIN",
    "x-org-id": orgId,
    "x-schema-version": SCHEMA_VERSION,
    "X-FluencyTracr-Schema-Version": SCHEMA_VERSION
  };

  const adminToken = env("ADMIN_TOKEN");
  const jwtSecret = env("JWT_SECRET");
  const devHeaderAuth = env("DEV_HEADER_AUTH") === "true";
  if (adminToken && jwtSecret && !devHeaderAuth) {
    headers.Authorization = `Bearer ${adminToken}`;
  }

  return headers;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function collectJsonlFiles(dir = DEFAULT_DATA_DIR) {
  const root = resolve(process.cwd(), dir);
  const out = [];
  function walk(path) {
    for (const name of readdirSync(path)) {
      const child = join(path, name);
      const info = statSync(child);
      if (info.isDirectory()) {
        walk(child);
        continue;
      }
      if (name.endsWith(".jsonl") || name.endsWith(".jsonl.gz")) {
        out.push(child);
      }
    }
  }
  walk(root);
  return out.sort();
}

async function* readJsonLines(file) {
  const input = file.endsWith(".gz")
    ? createReadStream(file).pipe(createGunzip())
    : createReadStream(file);
  const rl = createInterface({ input, crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      yield trimmed;
    }
  }
}

export async function fetchJson(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body = null;
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 500) };
    }
  }
  return { response, body };
}

export async function ensureOrg({ backendUrl, orgId, name = orgId }) {
  const url = new URL("/orgs", backendUrl);
  const { response, body } = await fetchJson(url, {
    method: "POST",
    headers: requestHeaders(orgId),
    body: JSON.stringify({ orgId, name, minGroupSize: 5 })
  });
  if (response.ok || response.status === 409) {
    return { status: response.status, body };
  }
  if (response.status === 400 && JSON.stringify(body ?? {}).includes("already")) {
    return { status: response.status, body };
  }
  throw new Error(`POST /orgs failed for ${orgId}: ${JSON.stringify({ status: response.status, body })}`);
}

export async function executionAlreadyLoaded({ backendUrl, orgId, executionId }) {
  const url = new URL("/api/traces/reconstructed", backendUrl);
  url.searchParams.set("execution_id", executionId);
  const { response, body } = await fetchJson(url, {
    method: "GET",
    headers: requestHeaders(orgId)
  });
  if (!response.ok) {
    return false;
  }
  return Array.isArray(body?.traces) && body.traces.length > 0;
}

export async function postCanonicalBatch({
  backendUrl,
  orgId,
  events,
  maxRetries = DEFAULT_MAX_RETRIES
}) {
  if (events.length === 0) {
    return { ingested: 0 };
  }
  const url = new URL("/api/events", backendUrl);
  let last = null;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const { response, body } = await fetchJson(url, {
      method: "POST",
      headers: requestHeaders(orgId),
      body: JSON.stringify({ events })
    });
    if (response.ok) {
      return { ingested: events.length, status: response.status, body };
    }
    last = { status: response.status, body };
    if ((response.status === 413 || response.status === 500) && events.length > 1) {
      const mid = Math.ceil(events.length / 2);
      const left = await postCanonicalBatch({
        backendUrl,
        orgId,
        events: events.slice(0, mid),
        maxRetries
      });
      const right = await postCanonicalBatch({
        backendUrl,
        orgId,
        events: events.slice(mid),
        maxRetries
      });
      return {
        ingested: left.ingested + right.ingested,
        status: 200,
        body: {
          split_batch: true,
          original_size: events.length,
          parts: [left.body, right.body]
        }
      };
    }
    if (![408, 429, 500, 502, 503, 504].includes(response.status) || attempt === maxRetries) {
      break;
    }
    await sleep(250 * 2 ** attempt);
  }
  throw new Error(`POST /api/events failed for ${orgId}: ${JSON.stringify(last)}`);
}

export async function postEventsGroupedByOrg({
  backendUrl,
  events,
  batchSize = DEFAULT_BATCH_SIZE,
  maxRetries = DEFAULT_MAX_RETRIES
}) {
  const stats = {
    events_posted: 0,
    batches_posted: 0,
    orgs: {}
  };
  const batches = new Map();

  const flushOrg = async (orgId) => {
    const batch = batches.get(orgId) ?? [];
    if (batch.length === 0) {
      return;
    }
    await postCanonicalBatch({ backendUrl, orgId, events: batch, maxRetries });
    stats.events_posted += batch.length;
    stats.batches_posted += 1;
    stats.orgs[orgId] = (stats.orgs[orgId] ?? 0) + batch.length;
    batches.set(orgId, []);
  };

  for (const event of events) {
    const orgId = orgIdFromEvent(event);
    const batch = batches.get(orgId) ?? [];
    batch.push(event);
    batches.set(orgId, batch);
    if (batch.length >= batchSize) {
      await flushOrg(orgId);
    }
  }

  for (const orgId of batches.keys()) {
    await flushOrg(orgId);
  }

  return stats;
}

export async function loadLmsysDataset(options = {}) {
  const backendUrl = options.backendUrl ?? backendUrlFromEnv();
  const dataDir = options.dataDir ?? env("LMSYS_DATA_DIR") ?? DEFAULT_DATA_DIR;
  const batchSize = options.batchSize ?? parsePositiveInt(process.env.BATCH_SIZE, DEFAULT_BATCH_SIZE, "BATCH_SIZE");
  const sampleLimit = options.sampleLimit ?? null;
  const files = collectJsonlFiles(dataDir);
  if (files.length === 0) {
    throw new Error(`No JSONL files found in ${dataDir}`);
  }

  const stats = {
    backend_url: backendUrl,
    files: files.length,
    conversations_read: 0,
    conversations_skipped_idempotent: 0,
    events_generated: 0,
    events_posted: 0,
    batches_posted: 0
  };
  const pendingByOrg = new Map();

  const flushOrg = async (orgId) => {
    const batch = pendingByOrg.get(orgId) ?? [];
    if (batch.length === 0) {
      return;
    }
    await postCanonicalBatch({ backendUrl, orgId, events: batch });
    stats.events_posted += batch.length;
    stats.batches_posted += 1;
    pendingByOrg.set(orgId, []);
  };

  const flushAll = async () => {
    for (const orgId of pendingByOrg.keys()) {
      await flushOrg(orgId);
    }
  };

  for (const file of files) {
    for await (const line of readJsonLines(file)) {
      const record = JSON.parse(line);
      stats.conversations_read += 1;
      const events = transformLmsysConversationToCanonicalEvents(record);
      const first = events[0];
      const orgId = orgIdFromEvent(first);
      const executionId = resolvedBackendExecutionId(first);
      if (executionId && (await executionAlreadyLoaded({ backendUrl, orgId, executionId }))) {
        stats.conversations_skipped_idempotent += 1;
        continue;
      }
      for (const event of events) {
        if (sampleLimit !== null && stats.events_generated >= sampleLimit) {
          await flushAll();
          return stats;
        }
        const eventOrgId = orgIdFromEvent(event);
        const batch = pendingByOrg.get(eventOrgId) ?? [];
        batch.push(event);
        pendingByOrg.set(eventOrgId, batch);
        stats.events_generated += 1;
        if (batch.length >= batchSize) {
          await flushOrg(eventOrgId);
        }
      }
    }
  }

  await flushAll();
  return stats;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  loadLmsysDataset()
    .then((stats) => {
      console.log(JSON.stringify({ status: "PASS", ...stats }, null, 2));
    })
    .catch((error) => {
      console.error(JSON.stringify({ status: "FAIL", error: error.message }, null, 2));
      process.exit(1);
    });
}
