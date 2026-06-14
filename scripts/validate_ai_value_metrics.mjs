#!/usr/bin/env node
// Engine-backed wrapper: validation logic lives in the AI Value Engine
// (shared/src/aiValueEngine). Run `npm run build --workspace shared` first.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  validateMetricsLibrary,
  recommendMetricsForBlueprint as engineRecommendMetricsForBlueprint
} from "../shared/dist/aiValueEngine/index.js";

const DEFAULT_INPUT =
  "docs/contracts/ai-value-intelligence/examples/customer-support-metrics-library.json";

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    output: null
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--input") {
      args.input = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--output") {
      args.output = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: node scripts/validate_ai_value_metrics.mjs [--input path] [--output path]"
      );
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

export function validateAiValueMetricsLibrary(library) {
  return validateMetricsLibrary(library);
}

export const recommendMetricsForBlueprint = engineRecommendMetricsForBlueprint;

function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = resolve(process.cwd(), args.input);
  const library = JSON.parse(readFileSync(inputPath, "utf8"));
  const result = validateAiValueMetricsLibrary(library);
  const json = `${JSON.stringify(result, null, 2)}\n`;

  if (args.output) {
    writeFileSync(resolve(process.cwd(), args.output), json, "utf8");
    console.log(`Wrote ${args.output}`);
    return;
  }

  process.stdout.write(json);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) {
  main();
}
