#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  GleanSignalInventorySchema,
  GleanSignalReadinessMapSchema,
  GleanSourceRecordSchema
} = require("../shared/dist/index.js");

const DEFAULT_EXAMPLES_DIR = "docs/contracts/glean-signal-readiness/examples";

function parseArgs(argv) {
  const args = { examplesDir: DEFAULT_EXAMPLES_DIR };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--examples-dir") {
      args.examplesDir = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log("Usage: node scripts/validate_glean_readiness_examples.mjs [--examples-dir path]");
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function collectJsonFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const info = statSync(path);
    if (info.isDirectory()) {
      out.push(...collectJsonFiles(path));
      continue;
    }
    if (name.endsWith(".json")) {
      out.push(path);
    }
  }
  return out.sort();
}

function schemaFor(payload) {
  if (payload && typeof payload === "object" && payload.schema_version === "GSR_2026_05") {
    return { name: "readiness_map", schema: GleanSignalReadinessMapSchema };
  }
  if (payload && typeof payload === "object" && payload.schema_version === "GSR_INVENTORY_2026_05") {
    return { name: "inventory", schema: GleanSignalInventorySchema };
  }
  if (payload && typeof payload === "object" && typeof payload.source_type === "string") {
    return { name: "source_record", schema: GleanSourceRecordSchema };
  }
  throw new Error("unsupported Glean readiness example shape");
}

const args = parseArgs(process.argv.slice(2));
const examplesDir = resolve(process.cwd(), args.examplesDir);
const files = collectJsonFiles(examplesDir);
if (files.length === 0) {
  throw new Error(`No JSON examples found in ${args.examplesDir}`);
}

let failures = 0;
for (const file of files) {
  try {
    const payload = JSON.parse(readFileSync(file, "utf8"));
    const { name, schema } = schemaFor(payload);
    schema.parse(payload);
    console.log(`VALID ${name}: ${file}`);
  } catch (error) {
    failures += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`INVALID: ${file}`);
    console.error(message);
  }
}

if (failures > 0) {
  process.exit(1);
}

console.log(`Glean readiness examples valid (${files.length} files)`);
