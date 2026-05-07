#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROTOTYPE_PATH = path.join(
  ROOT,
  "docs/integrations/glean/prototypes/value-evidence-pack-demo.html"
);

const requiredText = [
  "Glean Value Evidence Pack",
  "Synthetic executive demo data",
  "Executive Summary",
  "Claim Readiness",
  "Evidence Coverage",
  "Instrumentation Plan",
  "Glean Agent Answer",
  "customer-safe with caveats",
  "suppressed",
  "not computed",
  "ROI claims should be presented with coverage and assumption caveats"
];

const requiredClickTargets = [
  'data-view="overview"',
  'data-view="claims"',
  'data-view="surfaces"',
  'data-view="actions"',
  'data-view="agent"'
];

const forbiddenPatterns = [
  /prompt[_\s-]?text/i,
  /model[_\s-]?output[_\s-]?text/i,
  /raw[_\s-]?prompt/i,
  /raw[_\s-]?response/i,
  /transcript/i,
  /message[_\s-]?text/i,
  /query[_\s-]?text/i,
  /tool[_\s-]?payload/i,
  /file[_\s-]?content/i,
  /employee[_\s-]?id/i,
  /manager[_\s-]?id/i,
  /team[_\s-]?ranking/i,
  /user[_\s-]?id/i,
  /email/i,
  /productivity[_\s-]?score/i,
  /productivity\s+scoring/i
];

function fail(message) {
  console.error(`[value-evidence-prototype] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(PROTOTYPE_PATH)) {
  fail(`Missing prototype: ${PROTOTYPE_PATH}`);
}

const html = fs.readFileSync(PROTOTYPE_PATH, "utf8");

for (const text of requiredText) {
  if (!html.includes(text)) {
    fail(`Missing required text: ${text}`);
  }
}

for (const target of requiredClickTargets) {
  if (!html.includes(target)) {
    fail(`Missing required click target: ${target}`);
  }
}

for (const pattern of forbiddenPatterns) {
  if (pattern.test(html)) {
    fail(`Forbidden raw-data pattern present: ${pattern}`);
  }
}

if (/https?:\/\/|\/\/[a-z0-9.-]+\//i.test(html)) {
  fail("Prototype must not load external network resources.");
}

console.log(`[value-evidence-prototype] Valid: ${PROTOTYPE_PATH}`);
