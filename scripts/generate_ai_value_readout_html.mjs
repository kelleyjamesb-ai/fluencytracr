#!/usr/bin/env node
// Executive readout exporter.
//
// Composes a sponsor-ready, self-contained HTML readout from validated AI
// value objects: the executive packet, plus optional engagement context and
// an aggregate fluency kickoff baseline. Fail-closed: every input is
// validated through the AI Value Engine before rendering, and the readout
// always renders the claim state, required caveats, and blocked claims —
// they are part of the document, not optional styling.
//
// Run `npm run build --workspace shared` first.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  validateExecutivePacket,
  validateEngagement,
  validateFluencyBaseline,
  summarizeFluencyBaseline,
  renderExecutiveReadoutHtml
} from "../shared/dist/aiValueEngine/index.js";

export { renderExecutiveReadoutHtml };

const DEFAULT_PACKET =
  "docs/contracts/ai-value-intelligence/examples/customer-support-executive-packet.json";
const DEFAULT_ENGAGEMENT =
  "docs/contracts/ai-value-intelligence/examples/customer-support-engagement.json";
const DEFAULT_BASELINE =
  "docs/contracts/ai-value-intelligence/examples/customer-support-fluency-baseline.json";
const DEFAULT_OUTPUT =
  "docs/contracts/ai-value-intelligence/examples/customer-support-executive-readout.html";

function parseArgs(argv) {
  const args = {
    packet: DEFAULT_PACKET,
    engagement: DEFAULT_ENGAGEMENT,
    baseline: DEFAULT_BASELINE,
    output: DEFAULT_OUTPUT,
    noEngagement: false,
    noBaseline: false
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      i += 1;
      return argv[i];
    };
    if (arg === "--packet") args.packet = next();
    else if (arg === "--engagement") args.engagement = next();
    else if (arg === "--baseline") args.baseline = next();
    else if (arg === "--output") args.output = next();
    else if (arg === "--no-engagement") args.noEngagement = true;
    else if (arg === "--no-baseline") args.noBaseline = true;
    else if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: node scripts/generate_ai_value_readout_html.mjs [--packet path] [--engagement path|--no-engagement] [--baseline path|--no-baseline] [--output path]"
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const packet = readJson(args.packet);
  const packetValidation = validateExecutivePacket(packet);
  if (!packetValidation.valid) {
    console.error("Refusing to render: executive packet failed validation:");
    for (const gap of packetValidation.gaps) console.error(`- ${gap}`);
    process.exit(1);
  }

  let engagement = null;
  if (!args.noEngagement) {
    engagement = readJson(args.engagement);
    const validation = validateEngagement(engagement);
    if (!validation.valid) {
      console.error("Refusing to render: engagement failed validation:");
      for (const gap of validation.gaps) console.error(`- ${gap}`);
      process.exit(1);
    }
  }

  let fluencySummary = null;
  if (!args.noBaseline) {
    const baseline = readJson(args.baseline);
    const validation = validateFluencyBaseline(baseline);
    if (!validation.valid) {
      console.error("Refusing to render: fluency baseline failed validation:");
      for (const gap of validation.gaps) console.error(`- ${gap}`);
      process.exit(1);
    }
    fluencySummary = summarizeFluencyBaseline(baseline);
  }

  const html = renderExecutiveReadoutHtml({ packet, engagement, fluencySummary });
  const outputPath = resolve(process.cwd(), args.output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, html, "utf8");
  console.log(`Wrote ${args.output}`);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) main();
