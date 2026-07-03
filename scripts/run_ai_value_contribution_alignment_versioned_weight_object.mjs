#!/usr/bin/env node

// Thin wrapper over packages/confidence-engine (module 3 of the ported spine).
// The verbatim implementation lives in
// packages/confidence-engine/src/versionedWeightObject.ts; this wrapper
// preserves the CLI and the named module exports byte-for-byte (OpenSpec
// change add-confidence-engine-workspace, task 4.1).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export {
  CONTRIBUTION_ALIGNMENT_VERSIONED_WEIGHT_OBJECT_SCHEMA_VERSION,
  contributionAlignmentVersionedWeightObjectHash,
  buildContributionAlignmentVersionedWeightObjectFromObject,
  validateContributionAlignmentVersionedWeightObject
} from "../packages/confidence-engine/dist/versionedWeightObject.js";

import {
  buildContributionAlignmentVersionedWeightObjectFromObject
} from "../packages/confidence-engine/dist/versionedWeightObject.js";

function inputFromCliPath(path) {
  if (path === "-") return JSON.parse(readFileSync(0, "utf8"));
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function main() {
  const [, , inputPath] = process.argv;
  if (!inputPath) {
    console.error(
      "Usage: node scripts/run_ai_value_contribution_alignment_versioned_weight_object.mjs <internal-numeric-weight-decision-json|- for stdin>"
    );
    process.exit(1);
  }
  const weightObject = buildContributionAlignmentVersionedWeightObjectFromObject(inputFromCliPath(inputPath));
  process.stdout.write(`${JSON.stringify(weightObject, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
