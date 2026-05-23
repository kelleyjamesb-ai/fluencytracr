import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { evaluateLedgerEntry } from "./agentic_harness_replay.mjs";

const baseEntry = {
  schema_version: "AR_LEDGER_2026_05",
  repo_id: "fluencytracr",
  run_id: "run-replay-001",
  provider: "CODEX",
  harness_surface: "CODEX_CLI",
  scope_ref: "docs/concepts/AGENTIC_EXECUTION_HARNESS.md",
  status: "COMPLETED",
  verification_refs: ["npm run test:agentic-harness"],
  handoff_ref: "harness/agent-progress.txt",
  required_caveats: ["Development-harness telemetry only."]
};

test("evaluateLedgerEntry passes when scope, handoff, and verification metadata are present", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ft-replay-"));
  fs.mkdirSync(path.join(root, "docs/concepts"), { recursive: true });
  fs.mkdirSync(path.join(root, "harness"), { recursive: true });
  fs.writeFileSync(path.join(root, baseEntry.scope_ref), "# Harness\n");
  fs.writeFileSync(path.join(root, baseEntry.handoff_ref), "handoff\n");

  assert.deepEqual(evaluateLedgerEntry({ root, entry: baseEntry }), {
    errors: [],
    warnings: []
  });
});

test("evaluateLedgerEntry fails when completed runs lack verification refs", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ft-replay-"));
  fs.mkdirSync(path.join(root, "docs/concepts"), { recursive: true });
  fs.writeFileSync(path.join(root, baseEntry.scope_ref), "# Harness\n");

  const result = evaluateLedgerEntry({
    root,
    entry: {
      ...baseEntry,
      verification_refs: []
    }
  });

  assert.deepEqual(result.errors, ["Completed ledger entries must include at least one verification_ref."]);
});

test("evaluateLedgerEntry fails when scope_ref points outside the repo", () => {
  const result = evaluateLedgerEntry({
    root: fs.mkdtempSync(path.join(os.tmpdir(), "ft-replay-")),
    entry: {
      ...baseEntry,
      scope_ref: "../outside.md"
    }
  });

  assert.deepEqual(result.errors, ["scope_ref must stay inside the repository: ../outside.md."]);
});
