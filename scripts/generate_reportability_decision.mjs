#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { generateReportabilityDecision } = require("../shared/dist/index.js");

const DEFAULT_INPUT = "docs/contracts/glean-signal-readiness/examples/org-northstar-weekly-readiness-map.json";
const DEFAULT_OUTPUT = "docs/contracts/reportability/examples/org-northstar-roi-reportability-decision.json";

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    reportContext: "roi",
    stdout: false
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
    if (arg === "--report-context") {
      args.reportContext = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--stdout") {
      args.stdout = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: node scripts/generate_reportability_decision.mjs [--input path] [--output path] [--report-context roi] [--stdout]"
      );
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!args.input) {
    throw new Error("--input requires a path");
  }
  if (!args.output && !args.stdout) {
    throw new Error("--output requires a path unless --stdout is set");
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const inputPath = resolve(process.cwd(), args.input);
const readinessMap = JSON.parse(readFileSync(inputPath, "utf8"));
const decision = generateReportabilityDecision({
  report_context: args.reportContext,
  readiness_map: readinessMap
});
const output = `${JSON.stringify(decision, null, 2)}\n`;

if (args.stdout) {
  process.stdout.write(output);
} else {
  const outputPath = resolve(process.cwd(), args.output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, output, "utf8");
  console.log(`Generated ${args.output}`);
}
