import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  getAiValueDisplayLabel,
  AI_VALUE_LANGUAGE_SYSTEM_VERSION
} from "../shared/dist/aiValueEngine/index.js";

const readText = (path) => readFileSync(path, "utf8");

test("canonical language architecture docs cover the required vocabulary system", () => {
  const systemPath = "docs/architecture/CANONICAL_LANGUAGE_SYSTEM.md";
  const matrixPath = "docs/architecture/LANGUAGE_ALIGNMENT_MATRIX.md";
  const deprecationPath = "docs/architecture/TERMINOLOGY_DEPRECATION_PLAN.md";

  assert.equal(existsSync(systemPath), true, `${systemPath} missing`);
  assert.equal(existsSync(matrixPath), true, `${matrixPath} missing`);
  assert.equal(existsSync(deprecationPath), true, `${deprecationPath} missing`);

  const system = readText(systemPath);
  for (const heading of [
    "Executive Vocabulary",
    "Measurement Vocabulary",
    "Evidence Vocabulary",
    "Value Vocabulary",
    "Financial Vocabulary",
    "Governance Vocabulary",
    "Intervention Vocabulary",
    "Deprecated Vocabulary",
    "Executive Readout Vocabulary",
    "Productivity Recapture"
  ]) {
    assert.match(system, new RegExp(`## ${heading}`), `missing ${heading}`);
  }

  for (const concept of [
    "Value Hypothesis",
    "Measurement Plan",
    "Evidence Collection",
    "Value Realization",
    "Financial Translation",
    "Value Accounting",
    "Renewal Evidence",
    "Potential Value",
    "Emerging Value",
    "Measured Value",
    "Validated Value",
    "Realized Value"
  ]) {
    assert.match(system, new RegExp(concept), `missing ${concept}`);
  }
});

test("language alignment matrix preserves internal contracts through aliases", () => {
  const matrix = readText("docs/architecture/LANGUAGE_ALIGNMENT_MATRIX.md");
  for (const term of [
    "AI Fluency Baseline",
    "Velocity",
    "Breadth",
    "Depth",
    "Value Evidence Case",
    "Evidence Readiness",
    "ROI Scenario",
    "Financial Claim Gate",
    "EBITA Impact Bridge",
    "Executive Packet",
    "Intervention Engine",
    "Evidence Quality",
    "Directional",
    "Caveated",
    "Supported",
    "Finance Validated"
  ]) {
    assert.match(matrix, new RegExp(term), `missing ${term}`);
  }
  assert.match(matrix, /ROI Scenario \| Value Scenario \| Alias/);
  assert.match(matrix, /EBITA Impact Bridge \| Financial Translation \| Alias/);
});

test("canonical display labels translate internal states without renaming schemas", () => {
  assert.equal(AI_VALUE_LANGUAGE_SYSTEM_VERSION, "FT_AI_VALUE_LANGUAGE_SYSTEM_2026_06");

  assert.equal(getAiValueDisplayLabel("DIRECTIONAL"), "Estimate");
  assert.equal(getAiValueDisplayLabel("CAVEATED"), "Emerging Evidence");
  assert.equal(getAiValueDisplayLabel("SUPPORTED"), "Measured Value");
  assert.equal(getAiValueDisplayLabel("FINANCE_VALIDATED"), "Validated Value");
  assert.equal(getAiValueDisplayLabel("MODELED_EBITA_SCENARIO"), "Financial Translation");
  assert.equal(getAiValueDisplayLabel("realized_roi_calculation"), "Value Accounting");

  for (const schema of [
    "schemas/ai-value-intelligence/roi-scenario.schema.json",
    "schemas/ai-value-intelligence/executive-packet.schema.json",
    "schemas/ai-value-intelligence/value-evidence-case.schema.json"
  ]) {
    assert.equal(existsSync(schema), true, `${schema} must keep existing name`);
  }
});
