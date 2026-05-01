#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  generateGleanSignalReadinessMap,
  mapGleanSourcesToReadinessInventory
} = require("../shared/dist/index.js");

const DEFAULTS = {
  orgId: "org-northstar-enterprise",
  window: "weekly",
  generatedAt: "2026-05-01T13:00:00.000Z",
  workflowRun: "docs/contracts/glean-signal-readiness/examples/source-fixtures/workflow-run.sample.json",
  mcpUsage: "docs/contracts/glean-signal-readiness/examples/source-fixtures/mcp-usage.sample.json",
  aiSecurity: "docs/contracts/glean-signal-readiness/examples/source-fixtures/ai-security.sample.json",
  output: "docs/contracts/glean-signal-readiness/examples/org-northstar-source-derived-readiness-map.json"
};

function parseArgs(argv) {
  const args = { ...DEFAULTS, stdout: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--workflow-run") {
      args.workflowRun = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--mcp-usage") {
      args.mcpUsage = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--ai-security") {
      args.aiSecurity = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--org-id") {
      args.orgId = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--window") {
      args.window = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--generated-at") {
      args.generatedAt = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--output") {
      args.output = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--stdout") {
      args.stdout = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: node scripts/generate_glean_readiness_from_sources.mjs [--workflow-run path] [--mcp-usage path] [--ai-security path] [--output path] [--stdout]"
      );
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function readRecord(path) {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
}

const args = parseArgs(process.argv.slice(2));
const sourceExport = {
  schema_version: "GLEAN_SOURCE_EXPORT_2026_05",
  org_id: args.orgId,
  window: args.window,
  generated_at: args.generatedAt,
  records: [readRecord(args.workflowRun), readRecord(args.mcpUsage), readRecord(args.aiSecurity)]
};

const inventory = mapGleanSourcesToReadinessInventory(sourceExport);
const readinessMap = generateGleanSignalReadinessMap(inventory);
const output = `${JSON.stringify(readinessMap, null, 2)}\n`;

if (args.stdout) {
  process.stdout.write(output);
} else {
  const outputPath = resolve(process.cwd(), args.output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, output, "utf8");
  console.log(`Generated ${args.output}`);
}
