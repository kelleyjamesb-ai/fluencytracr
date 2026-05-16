#!/usr/bin/env node
import { loadLmsysDataset } from "./seed_lmsys.mjs";

const DEFAULT_SAMPLE_LIMIT = 10_000;

function parseLimit() {
  const raw = process.env.SAMPLE_LIMIT;
  if (raw === undefined || raw === "") {
    return DEFAULT_SAMPLE_LIMIT;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("SAMPLE_LIMIT must be a positive integer");
  }
  return parsed;
}

loadLmsysDataset({ sampleLimit: parseLimit() })
  .then((stats) => {
    console.log(JSON.stringify({ status: "PASS", sample_limit: parseLimit(), ...stats }, null, 2));
  })
  .catch((error) => {
    console.error(JSON.stringify({ status: "FAIL", error: error.message }, null, 2));
    process.exit(1);
  });
