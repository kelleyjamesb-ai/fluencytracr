#!/usr/bin/env node
import { createGunzip } from "node:zlib";
import { createReadStream, readdirSync, statSync } from "node:fs";
import { createInterface } from "node:readline";
import { join, resolve } from "node:path";

import { transformLmsysConversationToCanonicalEvents } from "./seed_lmsys_transform.mjs";

export const DEFAULT_DATA_DIR = "./data/lmsys";
export const DEFAULT_BATCH_SIZE = 500;
export const DEFAULT_MAX_RETRIES = 4;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value.trim();
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

function headers(adminToken) {
  return {
    "content-type": "application/json",
    authorization: `Bearer ${adminToken}`,
    "x-role": "ADMIN",
    "X-FluencyTracr-Schema-Version": "0.1"
  };
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

async function fetchJson(url, init) {
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

export async function executionAlreadyLoaded({ backendUrl, adminToken, executionId }) {
  const url = new URL("/api/traces/reconstructed", backendUrl);
  url.searchParams.set("execution_id", executionId);
  const { response, body } = await fetchJson(url, {
    method: "GET",
    headers: headers(adminToken)
  });
  if (response.status === 404) {
    return false;
  }
  if (!response.ok) {
    return false;
  }
  return Array.isArray(body?.traces) && body.traces.length > 0;
}

export async function postCanonicalBatch({
  backendUrl,
  adminToken,
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
      headers: headers(adminToken),
      body: JSON.stringify({ events })
    });
    if (response.ok) {
      return { ingested: events.length, status: response.status, body };
    }
    last = { status: response.status, body };
    if (![408, 429, 500, 502, 503, 504].includes(response.status) || attempt === maxRetries) {
      break;
    }
    await sleep(250 * 2 ** attempt);
  }
  const detail = JSON.stringify(last);
  throw new Error(`POST /api/events failed for batch of ${events.length}: ${detail}`);
}

export async function loadLmsysDataset(options = {}) {
  const backendUrl = options.backendUrl ?? requiredEnv("BACKEND_URL");
  const adminToken = options.adminToken ?? requiredEnv("ADMIN_TOKEN");
  const dataDir = options.dataDir ?? process.env.LMSYS_DATA_DIR ?? DEFAULT_DATA_DIR;
  const batchSize = options.batchSize ?? parsePositiveInt(process.env.BATCH_SIZE, DEFAULT_BATCH_SIZE, "BATCH_SIZE");
  const sampleLimit = options.sampleLimit ?? null;
  const files = collectJsonlFiles(dataDir);
  if (files.length === 0) {
    throw new Error(`No JSONL files found in ${dataDir}`);
  }

  const stats = {
    files: files.length,
    conversations_read: 0,
    conversations_skipped_idempotent: 0,
    events_generated: 0,
    events_posted: 0,
    batches_posted: 0
  };
  let batch = [];

  const flush = async () => {
    if (batch.length === 0) {
      return;
    }
    await postCanonicalBatch({ backendUrl, adminToken, events: batch });
    stats.events_posted += batch.length;
    stats.batches_posted += 1;
    batch = [];
  };

  for (const file of files) {
    for await (const line of readJsonLines(file)) {
      const record = JSON.parse(line);
      stats.conversations_read += 1;
      const events = transformLmsysConversationToCanonicalEvents(record);
      const executionId = events[0]?.execution_id;
      if (executionId && (await executionAlreadyLoaded({ backendUrl, adminToken, executionId }))) {
        stats.conversations_skipped_idempotent += 1;
        continue;
      }
      for (const event of events) {
        if (sampleLimit !== null && stats.events_generated >= sampleLimit) {
          await flush();
          return stats;
        }
        batch.push(event);
        stats.events_generated += 1;
        if (batch.length >= batchSize) {
          await flush();
        }
      }
    }
  }

  await flush();
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
