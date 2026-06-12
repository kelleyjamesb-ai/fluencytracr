#!/usr/bin/env node
// Offline AI Value chain runner.
//
// Loads upstream object JSON files and runs the deterministic value chain
// (engagement + fluency baseline + outcome evidence -> blueprint -> metrics ->
// scenario -> readiness -> claim_boundary -> executive_packet) entirely in
// process, with no backend or database. Use it to exercise the full chain
// deterministically, regenerate the derived stage fixtures, or debug a hold.
//
// Run `npm run build --workspace shared` first.
//
// Flags (all optional; default to the committed customer-support examples):
//   --engagement <path> | --no-engagement
//   --baseline <path>   | --no-baseline
//   --evidence <path>   | --no-evidence
//   --blueprint <path>
//   --metrics <path>
//   --scenario <path>   (otherwise the engine derives the scenario)
//   --out-dir <dir>     write each generated stage object as <objectType>.json
//                       (default: print all generated objects as JSON to stdout)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { runValueChain } from "../shared/dist/aiValueEngine/index.js";

const EXAMPLES = "docs/contracts/ai-value-intelligence/examples";
const DEFAULTS = {
  engagement: `${EXAMPLES}/customer-support-engagement.json`,
  baseline: `${EXAMPLES}/customer-support-fluency-baseline.json`,
  evidence: `${EXAMPLES}/customer-support-outcome-evidence-export.json`,
  blueprint: `${EXAMPLES}/customer-support-blueprint.json`,
  metrics: `${EXAMPLES}/customer-support-metrics-library.json`
};

// Maps each generated spine stage to its persisted object type + id field,
// mirroring the backend value-chain/run route.
const GENERATED_STAGES = [
  { stage: "scenario", objectType: "value_scenario", idField: "scenario_id" },
  { stage: "readiness", objectType: "evidence_readiness", idField: "readiness_id" },
  { stage: "claim_boundary", objectType: "claim_boundary", idField: "claim_boundary_id" },
  { stage: "executive_packet", objectType: "executive_packet", idField: "packet_id" }
];

function parseArgs(argv) {
  const args = { ...DEFAULTS, scenario: null, outDir: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--engagement") args.engagement = argv[++i];
    else if (arg === "--no-engagement") args.engagement = null;
    else if (arg === "--baseline") args.baseline = argv[++i];
    else if (arg === "--no-baseline") args.baseline = null;
    else if (arg === "--evidence") args.evidence = argv[++i];
    else if (arg === "--no-evidence") args.evidence = null;
    else if (arg === "--blueprint") args.blueprint = argv[++i];
    else if (arg === "--metrics") args.metrics = argv[++i];
    else if (arg === "--scenario") args.scenario = argv[++i];
    else if (arg === "--out-dir") args.outDir = argv[++i];
    else if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: node scripts/run_ai_value_chain.mjs [--blueprint p] [--metrics p] [--engagement p|--no-engagement] [--baseline p|--no-baseline] [--evidence p|--no-evidence] [--scenario p] [--out-dir dir]"
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

function sanitizeIdSegment(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const blueprint = readJson(args.blueprint);
  const metricsLibrary = readJson(args.metrics);
  const familySegment = sanitizeIdSegment(blueprint.workflow_family ?? blueprint.blueprint_id);

  const run = runValueChain({
    engagement: args.engagement ? readJson(args.engagement) : undefined,
    fluencyBaseline: args.baseline ? readJson(args.baseline) : undefined,
    outcomeEvidenceExport: args.evidence ? readJson(args.evidence) : undefined,
    blueprint,
    metricsLibrary,
    scenario: args.scenario ? readJson(args.scenario) : undefined,
    ids: {
      readinessId: `readiness_${familySegment}_v1`,
      claimBoundaryId: `claim_boundary_${familySegment}_v1`,
      packetId: `executive_packet_${familySegment}_v1`
    }
  });

  console.error(`Decision: ${run.decision}`);
  console.error(`Halted at: ${run.halted_at ?? "(none - chain completed)"}`);

  if (!run.spine) {
    console.error("Chain halted before the spine ran; no objects generated.");
    process.exit(1);
  }

  const generated = {};
  for (const { stage, objectType } of GENERATED_STAGES) {
    const result = run.spine.stages[stage];
    if (result && result.status === "VALID" && result.generated && result.object) {
      generated[objectType] = result.object;
    } else {
      console.error(`  ! ${objectType}: ${result?.status ?? "NOT_RUN"}${result?.hold_reason ? ` (${result.hold_reason})` : ""}`);
    }
  }

  if (args.outDir) {
    const dir = resolve(process.cwd(), args.outDir);
    mkdirSync(dir, { recursive: true });
    for (const [objectType, object] of Object.entries(generated)) {
      const file = resolve(dir, `${objectType}.json`);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, `${JSON.stringify(object, null, 2)}\n`, "utf8");
      console.error(`  OK wrote ${args.outDir}/${objectType}.json`);
    }
  } else {
    process.stdout.write(`${JSON.stringify(generated, null, 2)}\n`);
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) main();
