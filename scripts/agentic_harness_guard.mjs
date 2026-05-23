#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";

const DEFAULT_DOC_EXTENSIONS = new Set([".md", ".mdc", ".txt", ".json"]);
const DEFAULT_DOC_ROOTS = ["docs", "harness", "agents", ".cursor", ".project"];
const DEFAULT_ROOT_FILES = ["README.md", "AGENTS.md", "CLAUDE.md", "CODEX.md", "SCOPE_GUARDRAILS.md"];
const CANONICAL_LIVE_STATE = new Set([".project/WORK_QUEUE.json", ".project/PROGRESS.md"]);
const PROVIDER_WORKTREE_PREFIXES = [
  ".claude/worktrees/",
  ".codex/worktrees/",
  ".cursor/worktrees/",
  ".windsurf/worktrees/",
  ".continue/worktrees/",
  ".gemini/worktrees/",
  ".roo/worktrees/",
  ".qoder/worktrees/",
  ".trae/worktrees/"
];

const toPosix = (value) => value.split(path.sep).join("/");

export function findTrackedProviderWorktrees(trackedFiles) {
  return trackedFiles.filter((file) => PROVIDER_WORKTREE_PREFIXES.some((prefix) => file.startsWith(prefix)));
}

export function findDuplicateLiveStatePaths(trackedFiles) {
  return trackedFiles.filter((file) => {
    const name = path.posix.basename(file);
    return (name === "WORK_QUEUE.json" || name === "PROGRESS.md") && !CANONICAL_LIVE_STATE.has(file);
  });
}

export function findDuplicateDocuments(documents) {
  const byHash = new Map();
  for (const document of documents) {
    const hash = crypto.createHash("sha256").update(document.content).digest("hex");
    const entries = byHash.get(hash) ?? [];
    entries.push(document.path);
    byHash.set(hash, entries);
  }

  return Array.from(byHash.values())
    .filter((paths) => paths.length > 1)
    .map((paths) => paths.sort());
}

export function reconcileProjectState({ workQueue, progressText }) {
  const errors = [];
  const warnings = [];
  const items = Array.isArray(workQueue?.items) ? workQueue.items : [];
  const inProgress = items.filter((item) => item.status === "in_progress").map((item) => item.id);

  if (inProgress.length > 1) {
    errors.push(`WORK_QUEUE.json has multiple in_progress items: ${inProgress.join(", ")}.`);
  }

  const progressMatches = Array.from(progressText.matchAll(/`([^`]+)`\*\* is \*\*in_progress\*\*/g)).map(
    (match) => match[1]
  );
  const byId = new Map(items.map((item) => [item.id, item]));
  for (const id of progressMatches) {
    const status = byId.get(id)?.status;
    if (!status) {
      warnings.push(`PROGRESS.md says ${id} is in_progress, but WORK_QUEUE.json has no matching item.`);
    } else if (status !== "in_progress") {
      warnings.push(`PROGRESS.md says ${id} is in_progress, but WORK_QUEUE.json says ${status}.`);
    }
  }

  return { errors, warnings };
}

export function analyzeHarnessState({ trackedFiles, documents, workQueue, progressText }) {
  const errors = [];
  const warnings = [];

  const providerWorktrees = findTrackedProviderWorktrees(trackedFiles);
  if (providerWorktrees.length > 0) {
    errors.push(`Tracked provider worktree files are not allowed: ${providerWorktrees.join(", ")}.`);
  }

  const duplicateLiveState = findDuplicateLiveStatePaths(trackedFiles);
  if (duplicateLiveState.length > 0) {
    errors.push(`Duplicate live state files are not allowed: ${duplicateLiveState.join(", ")}.`);
  }

  for (const duplicateGroup of findDuplicateDocuments(documents)) {
    errors.push(`Exact duplicate documents are not allowed: ${duplicateGroup.join(", ")}.`);
  }

  const projectState = reconcileProjectState({ workQueue, progressText });
  errors.push(...projectState.errors);
  warnings.push(...projectState.warnings);

  return { errors, warnings };
}

function listTrackedFiles(root) {
  const output = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" });
  return output.split(/\r?\n/).filter(Boolean);
}

function readJson(root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

function readText(root, relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function collectDocuments(root) {
  const documents = [];
  const tracked = new Set(listTrackedFiles(root));

  const maybeAdd = (relativePath) => {
    if (!tracked.has(relativePath)) {
      return;
    }
    const ext = path.extname(relativePath);
    if (!DEFAULT_DOC_EXTENSIONS.has(ext)) {
      return;
    }
    documents.push({
      path: relativePath,
      content: fs.readFileSync(path.join(root, relativePath), "utf8")
    });
  };

  for (const rootFile of DEFAULT_ROOT_FILES) {
    maybeAdd(rootFile);
  }

  for (const docRoot of DEFAULT_DOC_ROOTS) {
    const absoluteRoot = path.join(root, docRoot);
    if (!fs.existsSync(absoluteRoot)) {
      continue;
    }
    for (const relativePath of tracked) {
      if (relativePath === docRoot || relativePath.startsWith(`${docRoot}/`)) {
        maybeAdd(relativePath);
      }
    }
  }

  return documents;
}

export function analyzeRepository(root = process.cwd()) {
  const normalizedRoot = path.resolve(root);
  const trackedFiles = listTrackedFiles(normalizedRoot).map(toPosix);
  return analyzeHarnessState({
    trackedFiles,
    documents: collectDocuments(normalizedRoot),
    workQueue: readJson(normalizedRoot, ".project/WORK_QUEUE.json"),
    progressText: readText(normalizedRoot, ".project/PROGRESS.md")
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = analyzeRepository(process.cwd());
  for (const warning of result.warnings) {
    console.warn(`[agentic-harness] warning: ${warning}`);
  }
  if (result.errors.length > 0) {
    for (const error of result.errors) {
      console.error(`[agentic-harness] error: ${error}`);
    }
    process.exit(1);
  }
  console.log("[agentic-harness] Passed.");
}
