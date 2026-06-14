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

const SAFE_LINE_CONTEXT = /(\b(no|not|never|without|avoid|blocked|rejects?|forbidden|prohibited|out of scope|does not|do not|cannot|must not|is not|are not|should not|instead of|rather than|deprecated|legacy|quarantine|quarantined)\b|FORBIDDEN_TERMS)/i;
const SAFE_BLOCK_CONTEXT = /(\b(always blocked|blocked claims|blocked_claims|non-capabilities|what .* does not claim|what .* is not|must not include|must never include|must not contain|must not permit|must not appear|must not claim|does not include|do not claim|forbidden|prohibited|out of scope|rejected|rejects?|guardrails?|non-goals?)\b|FORBIDDEN_TERMS)/i;

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
  ".js",
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

const hasSafeBlockContext = (lines, index) => {
  for (let offset = 1; offset <= 20; offset += 1) {
    const candidate = lines[index - offset];
    if (candidate === undefined) {
      return false;
    }
    const trimmed = candidate.trim();
    if (trimmed === "") {
      continue;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      continue;
    }
    if (/^["'][^"']+["'],?$/.test(trimmed)) {
      continue;
    }
    return SAFE_BLOCK_CONTEXT.test(trimmed);
  }
  return false;
};

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
      for (const pattern of DISALLOWED) {
        if (pattern.test(line)) {
          if (SAFE_LINE_CONTEXT.test(line) || hasSafeBlockContext(lines, index)) {
            return;
          }
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
