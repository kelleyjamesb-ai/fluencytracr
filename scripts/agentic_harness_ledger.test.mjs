import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { defaultLedgerPath, writeLedgerEntry } from "./agentic_harness_ledger.mjs";

const validEntry = {
  schema_version: "AR_LEDGER_2026_05",
  repo_id: "fluencytracr",
  run_id: "run-test-001",
  provider: "CODEX",
  harness_surface: "CODEX_CLI",
  branch_name: "codex/build-agentic-harness-runtime",
  scope_ref: "docs/concepts/AGENTIC_EXECUTION_HARNESS.md",
  status: "COMPLETED",
  event_batch_ref: "artifacts/harness/checkpoints/run-test-001.events.json",
  verification_refs: ["node scripts/agentic_harness_guard.mjs"],
  handoff_ref: "harness/agent-progress.txt",
  required_caveats: ["Development-harness telemetry only."]
};

test("defaultLedgerPath writes under harness checkpoints", () => {
  assert.equal(
    defaultLedgerPath("run-test-001"),
    "artifacts/harness/checkpoints/run-test-001.ledger.json"
  );
});

test("writeLedgerEntry validates and writes metadata-only ledger JSON", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ft-ledger-"));
  const relativePath = defaultLedgerPath(validEntry.run_id);

  const result = await writeLedgerEntry({ root, entry: validEntry, relativePath });
  const written = JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

  assert.equal(result.path, relativePath);
  assert.equal(written.run_id, validEntry.run_id);
  assert.deepEqual(written.verification_refs, validEntry.verification_refs);
});

test("writeLedgerEntry rejects forbidden raw fields before writing", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ft-ledger-"));
  const relativePath = defaultLedgerPath("run-test-raw");

  await assert.rejects(
    () =>
      writeLedgerEntry({
        root,
        relativePath,
        entry: {
          ...validEntry,
          run_id: "run-test-raw",
          raw_response: "not allowed"
        }
      }),
    /forbidden agent-run field: raw_response/
  );
  assert.equal(fs.existsSync(path.join(root, relativePath)), false);
});

test("writeLedgerEntry rejects non-string ledger array values before writing", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ft-ledger-"));
  const relativePath = defaultLedgerPath("run-test-array");

  await assert.rejects(
    () =>
      writeLedgerEntry({
        root,
        relativePath,
        entry: {
          ...validEntry,
          run_id: "run-test-array",
          verification_refs: [42]
        }
      }),
    /invalid ledger field: verification_refs/
  );

  await assert.rejects(
    () =>
      writeLedgerEntry({
        root,
        relativePath,
        entry: {
          ...validEntry,
          run_id: "run-test-array",
          required_caveats: [null]
        }
      }),
    /invalid ledger field: required_caveats/
  );

  assert.equal(fs.existsSync(path.join(root, relativePath)), false);
});
