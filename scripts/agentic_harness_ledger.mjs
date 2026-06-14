#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const FORBIDDEN_KEYS = new Set([
  "prompt",
  "raw_prompt",
  "response",
  "raw_response",
  "raw_output",
  "message_text",
  "file_content",
  "diff",
  "patch",
  "user_email",
  "email",
  "user_id",
  "person_id"
]);

const PROVIDERS = new Set(["CURSOR", "OPENAI_AGENTS", "CODEX", "CLAUDE", "OTHER"]);
const SURFACES = new Set(["CURSOR_CLI", "CURSOR_EDITOR", "OPENAI_AGENTS_SDK", "CODEX_CLI", "CLAUDE_CODE", "OTHER"]);
const STATUSES = new Set(["PLANNED", "RUNNING", "COMPLETED", "FAILED", "ABORTED"]);
const RUN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const ALLOWED_KEYS = new Set([
  "schema_version",
  "repo_id",
  "run_id",
  "provider",
  "harness_surface",
  "branch_name",
  "scope_ref",
  "status",
  "event_batch_ref",
  "verification_refs",
  "handoff_ref",
  "pr_ref",
  "required_caveats"
]);

export function defaultLedgerPath(runId) {
  assertRunId(runId);
  return `artifacts/harness/checkpoints/${runId}.ledger.json`;
}

function assertString(value, key) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`invalid ledger field: ${key}`);
  }
}

function assertRunId(value) {
  assertString(value, "run_id");
  if (!RUN_ID_PATTERN.test(value)) {
    throw new Error("invalid ledger field: run_id");
  }
}

function confinedAbsolutePath(root, relativePath) {
  const absoluteRoot = path.resolve(root);
  const absolutePath = path.resolve(absoluteRoot, relativePath);
  if (absolutePath !== absoluteRoot && !absolutePath.startsWith(`${absoluteRoot}${path.sep}`)) {
    throw new Error("ledger output path escapes repository root");
  }
  return absolutePath;
}

function assertStringArray(value, key, { minItems = 0 } = {}) {
  if (!Array.isArray(value) || value.length < minItems) {
    throw new Error(`invalid ledger field: ${key}`);
  }
  if (!value.every((item) => typeof item === "string" && item.length > 0)) {
    throw new Error(`invalid ledger field: ${key}`);
  }
}

function rejectForbiddenKeys(value, pathParts = []) {
  if (!value || typeof value !== "object") {
    return;
  }
  for (const [key, nestedValue] of Object.entries(value)) {
    const nextPath = [...pathParts, key];
    if (FORBIDDEN_KEYS.has(key)) {
      throw new Error(`forbidden agent-run field: ${key}`);
    }
    rejectForbiddenKeys(nestedValue, nextPath);
  }
}

export function validateLedgerEntry(entry) {
  rejectForbiddenKeys(entry);

  for (const key of Object.keys(entry)) {
    if (!ALLOWED_KEYS.has(key)) {
      throw new Error(`unknown ledger field: ${key}`);
    }
  }

  if (entry.schema_version !== "AR_LEDGER_2026_05") {
    throw new Error("invalid ledger field: schema_version");
  }
  assertString(entry.repo_id, "repo_id");
  assertRunId(entry.run_id);
  assertString(entry.scope_ref, "scope_ref");
  if (!PROVIDERS.has(entry.provider)) {
    throw new Error("invalid ledger field: provider");
  }
  if (!SURFACES.has(entry.harness_surface)) {
    throw new Error("invalid ledger field: harness_surface");
  }
  if (!STATUSES.has(entry.status)) {
    throw new Error("invalid ledger field: status");
  }
  assertStringArray(entry.verification_refs, "verification_refs");
  assertStringArray(entry.required_caveats, "required_caveats", { minItems: 1 });

  return {
    ...entry,
    verification_refs: entry.verification_refs
  };
}

export async function writeLedgerEntry({ root = process.cwd(), entry, relativePath = defaultLedgerPath(entry.run_id) }) {
  const parsed = validateLedgerEntry(entry);
  const absolutePath = confinedAbsolutePath(root, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  return { path: relativePath, entry: parsed };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node scripts/agentic_harness_ledger.mjs <entry.json> [output.json]");
    process.exit(1);
  }
  const entry = JSON.parse(await fs.readFile(inputPath, "utf8"));
  const outputPath = process.argv[3] ?? defaultLedgerPath(entry.run_id);
  const result = await writeLedgerEntry({ entry, relativePath: outputPath });
  console.log(`[agentic-ledger] Wrote ${result.path}`);
}
