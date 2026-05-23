import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeHarnessState,
  findDuplicateDocuments,
  findDuplicateLiveStatePaths,
  findTrackedProviderWorktrees,
  reconcileProjectState
} from "./agentic_harness_guard.mjs";

test("findTrackedProviderWorktrees flags committed local provider worktree files", () => {
  assert.deepEqual(findTrackedProviderWorktrees([".claude/worktrees/demo/README.md", "docs/agent/README.md"]), [
    ".claude/worktrees/demo/README.md"
  ]);
});

test("findDuplicateLiveStatePaths only allows canonical live state paths", () => {
  assert.deepEqual(
    findDuplicateLiveStatePaths([
      ".project/WORK_QUEUE.json",
      ".project/PROGRESS.md",
      "docs/agent/WORK_QUEUE.json",
      "artifacts/PROGRESS.md"
    ]),
    ["docs/agent/WORK_QUEUE.json", "artifacts/PROGRESS.md"]
  );
});

test("findDuplicateDocuments ignores distinct pointer docs but flags exact duplicate content", () => {
  const duplicates = findDuplicateDocuments([
    { path: "AGENTS.md", content: "canonical instructions\n" },
    { path: "CODEX.md", content: "read AGENTS.md\n" },
    { path: "docs/a.md", content: "same body\n" },
    { path: "docs/b.md", content: "same body\n" }
  ]);

  assert.deepEqual(duplicates, [["docs/a.md", "docs/b.md"]]);
});

test("reconcileProjectState warns when PROGRESS current status disagrees with queue state", () => {
  const result = reconcileProjectState({
    workQueue: {
      items: [
        { id: "phase-01", status: "done" },
        { id: "phase-02", status: "pending" }
      ]
    },
    progressText: "- **`phase-01`** is **in_progress**.\n"
  });

  assert.equal(result.errors.length, 0);
  assert.deepEqual(result.warnings, [
    "PROGRESS.md says phase-01 is in_progress, but WORK_QUEUE.json says done."
  ]);
});

test("reconcileProjectState errors on multiple in-progress queue items", () => {
  const result = reconcileProjectState({
    workQueue: {
      items: [
        { id: "phase-01", status: "in_progress" },
        { id: "phase-02", status: "in_progress" }
      ]
    },
    progressText: ""
  });

  assert.deepEqual(result.errors, [
    "WORK_QUEUE.json has multiple in_progress items: phase-01, phase-02."
  ]);
});

test("analyzeHarnessState combines blocking errors and non-blocking warnings", () => {
  const result = analyzeHarnessState({
    trackedFiles: [".claude/worktrees/demo/README.md", ".project/WORK_QUEUE.json"],
    documents: [
      { path: "docs/a.md", content: "duplicate\n" },
      { path: "docs/b.md", content: "duplicate\n" }
    ],
    workQueue: { items: [{ id: "phase-01", status: "done" }] },
    progressText: "- **`phase-01`** is **in_progress**.\n"
  });

  assert.deepEqual(result.errors, [
    "Tracked provider worktree files are not allowed: .claude/worktrees/demo/README.md.",
    "Exact duplicate documents are not allowed: docs/a.md, docs/b.md."
  ]);
  assert.deepEqual(result.warnings, [
    "PROGRESS.md says phase-01 is in_progress, but WORK_QUEUE.json says done."
  ]);
});
