#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { validateLedgerEntry } from "./agentic_harness_ledger.mjs";

function isInsideRepo(relativePath) {
  return typeof relativePath === "string" && relativePath.length > 0 && !path.isAbsolute(relativePath) && !relativePath.split("/").includes("..");
}

function existsUnderRoot(root, relativePath) {
  if (!isInsideRepo(relativePath)) {
    return false;
  }
  return fs.existsSync(path.join(root, relativePath));
}

export function evaluateLedgerEntry({ root = process.cwd(), entry }) {
  const errors = [];
  const warnings = [];
  const parsed = validateLedgerEntry(entry);

  if (!isInsideRepo(parsed.scope_ref)) {
    errors.push(`scope_ref must stay inside the repository: ${parsed.scope_ref}.`);
  } else if (!existsUnderRoot(root, parsed.scope_ref)) {
    errors.push(`scope_ref does not exist: ${parsed.scope_ref}.`);
  }

  if (parsed.handoff_ref && !isInsideRepo(parsed.handoff_ref)) {
    errors.push(`handoff_ref must stay inside the repository: ${parsed.handoff_ref}.`);
  } else if (parsed.handoff_ref && !existsUnderRoot(root, parsed.handoff_ref)) {
    warnings.push(`handoff_ref does not exist: ${parsed.handoff_ref}.`);
  }

  if (parsed.status === "COMPLETED" && parsed.verification_refs.length === 0) {
    errors.push("Completed ledger entries must include at least one verification_ref.");
  }

  if (!parsed.required_caveats.some((caveat) => caveat.toLowerCase().includes("development-harness"))) {
    errors.push("Ledger entries must carry a development-harness caveat.");
  }

  return { errors, warnings };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node scripts/agentic_harness_replay.mjs <ledger-entry.json>");
    process.exit(1);
  }
  const entry = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const result = evaluateLedgerEntry({ entry });
  for (const warning of result.warnings) {
    console.warn(`[agentic-replay] warning: ${warning}`);
  }
  if (result.errors.length > 0) {
    for (const error of result.errors) {
      console.error(`[agentic-replay] error: ${error}`);
    }
    process.exit(1);
  }
  console.log("[agentic-replay] Passed.");
}
