#!/usr/bin/env node
// Engine-backed wrapper: packet composition, validation, and markdown
// rendering live in the AI Value Engine (shared/src/aiValueEngine).
// Run `npm run build --workspace shared` first.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildExecutiveValidationPacket as engineBuildExecutiveValidationPacket,
  validateExecutivePacket,
  renderExecutiveValidationMarkdown as engineRenderExecutiveValidationMarkdown
} from "../shared/dist/aiValueEngine/index.js";

const DEFAULT_OUTPUT_JSON =
  "docs/contracts/ai-value-intelligence/examples/customer-support-executive-packet.json";
const DEFAULT_OUTPUT_MD =
  "docs/contracts/ai-value-intelligence/examples/customer-support-executive-packet.md";

function readJson(path) {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
}

function parseArgs(argv) {
  const args = { outputJson: DEFAULT_OUTPUT_JSON, outputMarkdown: DEFAULT_OUTPUT_MD };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--output-json") {
      args.outputJson = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--output-md") {
      args.outputMarkdown = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: node scripts/generate_ai_value_executive_packet.mjs [--output-json path] [--output-md path]"
      );
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

export const buildExecutiveValidationPacket = engineBuildExecutiveValidationPacket;

export function validateExecutiveValidationPacket(packet) {
  return validateExecutivePacket(packet);
}

export const renderExecutiveValidationMarkdown =
  engineRenderExecutiveValidationMarkdown;

function main() {
  const args = parseArgs(process.argv.slice(2));
  const packet = buildExecutiveValidationPacket({
    blueprint: readJson(
      "docs/contracts/ai-value-intelligence/examples/customer-support-blueprint.json"
    ),
    metricsLibrary: readJson(
      "docs/contracts/ai-value-intelligence/examples/customer-support-metrics-library.json"
    ),
    scenario: readJson(
      "docs/contracts/ai-value-intelligence/examples/customer-support-value-scenario.json"
    ),
    readiness: readJson(
      "docs/contracts/ai-value-intelligence/examples/customer-support-evidence-readiness.json"
    ),
    claimBoundary: readJson(
      "docs/contracts/ai-value-intelligence/examples/customer-support-claim-boundary.json"
    )
  });
  const validation = validateExecutiveValidationPacket(packet);
  if (!validation.valid) {
    throw new Error(`Invalid executive packet: ${validation.gaps.join("; ")}`);
  }
  writeFileSync(
    resolve(process.cwd(), args.outputJson),
    `${JSON.stringify(packet, null, 2)}\n`,
    "utf8"
  );
  writeFileSync(
    resolve(process.cwd(), args.outputMarkdown),
    renderExecutiveValidationMarkdown(packet),
    "utf8"
  );
  console.log(`Wrote ${args.outputJson}`);
  console.log(`Wrote ${args.outputMarkdown}`);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) main();
