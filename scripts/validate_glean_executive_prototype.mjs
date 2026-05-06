#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROTOTYPE_PATH = path.join(
  ROOT,
  "docs/integrations/glean/prototypes/executive-readiness-demo.html"
);

const requiredText = [
  "Synthetic executive demo data",
  "AI Fluency Readiness",
  "Evidence Coverage",
  "Unlock Value",
  "Ask Glean Agent",
  "Executive Overview",
  "Signal Readiness",
  "Evidence Impact",
  "Unlock Plan",
  "Agent Brief"
];

const requiredClickTargets = [
  'data-view="overview"',
  'data-view="readiness"',
  'data-view="evidence"',
  'data-view="unlocks"',
  'data-view="agent"',
  'data-filter="present"',
  'data-filter="not_computed"',
  'data-filter="suppressed"',
  'data-filter="missing"'
];

const forbiddenTokens = [
  "prompt_text",
  "model_output_text",
  "transcript",
  "message_text",
  "employee_id",
  "manager_id",
  "team_ranking",
  "user_id"
];

function fail(message) {
  console.error(`[executive-prototype] ${message}`);
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

for (const token of forbiddenTokens) {
  if (html.includes(token)) {
    fail(`Forbidden raw-data token present: ${token}`);
  }
}

if (/https?:\/\//.test(html)) {
  fail("Prototype must not load external network resources.");
}

console.log(`[executive-prototype] Valid: ${PROTOTYPE_PATH}`);
