#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();

const SCAN_ROOTS = [
  "README.md",
  "docs",
  "frontend/src",
  "openspec"
];

const SKIP_PATHS = [
  ".git",
  "node_modules",
  "dist",
  "build",
  "__pycache__"
];

const ALLOWLIST_PATHS = new Set([
  "docs/en/SWARM_PROTOCOL.md",
  "docs/en/ZERO_CONFIG.md",
  "docs/en/ROADMAP.md"
]);

const SAFE_CONTEXT = /(\b(no|not|never|without|blocked|rejects?|forbidden|prohibited|out of scope|does not|do not|cannot|must not|is not|are not|should not|instead of|rather than|deprecated|legacy|quarantine|quarantined)\b|FORBIDDEN_TERMS)/i;

const DISALLOWED = [
  /FluencyScore/,
  /fluency[_\s-]?index/i,
  /fluency\s+score/i,
  /maturity\s+score/i,
  /productivity\s+score/i,
  /productivity\s+scoring/i,
  /team\s+ranking/i,
  /leaderboard/i,
  /team\s+drill[-\s]?down/i,
  /weighted\s+score/i,
  /weighted\s+interaction\s+score/i,
  /dashboard\s+score/i,
  /general\s+score/i,
  /composite\s+score/i,
  /individual\s+performance\s+score/i
];

const TEXT_EXTENSIONS = new Set([
  ".md",
  ".mdx",
  ".txt",
  ".html",
  ".json",
  ".ts",
  ".tsx"
]);

function* walk(target) {
  const absolute = path.join(ROOT, target);
  if (!fs.existsSync(absolute)) {
    return;
  }
  const stat = fs.statSync(absolute);
  if (stat.isFile()) {
    yield target;
    return;
  }
  for (const entry of fs.readdirSync(absolute)) {
    if (SKIP_PATHS.includes(entry)) {
      continue;
    }
    yield* walk(path.join(target, entry));
  }
}

const findings = [];

for (const root of SCAN_ROOTS) {
  for (const relativePath of walk(root)) {
    if (ALLOWLIST_PATHS.has(relativePath)) {
      continue;
    }
    if (!TEXT_EXTENSIONS.has(path.extname(relativePath))) {
      continue;
    }
    const text = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      const context = lines
        .slice(Math.max(0, index - 15), index + 1)
        .join(" ");
      if (SAFE_CONTEXT.test(context)) {
        return;
      }
      for (const pattern of DISALLOWED) {
        if (pattern.test(line)) {
          findings.push(`${relativePath}:${index + 1}: ${line.trim()}`);
          return;
        }
      }
    });
  }
}

if (findings.length > 0) {
  console.error("[semantic-drift] Found customer-facing scoring/ranking language:");
  findings.forEach((finding) => console.error(finding));
  process.exit(1);
}

console.log("[semantic-drift] Passed.");
