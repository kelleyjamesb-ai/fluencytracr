import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const BLUEPRINT_DOC = "docs/architecture/AI_VALUE_BLUEPRINT.md";
const CROSSWALK_DOC = "docs/architecture/AI_VALUE_BLUEPRINT_CONTRACT_CROSSWALK.md";

function readRequiredFile(path) {
  assert.equal(existsSync(path), true, `${path} must exist`);
  return readFileSync(path, "utf8");
}

function assertContains(text, phrase, label) {
  assert.ok(text.includes(phrase), `${label} must contain: ${phrase}`);
}

function trackATokenEfficiencyArtifactsExist() {
  const requiredFiles = [
    "docs/architecture/AI_VALUE_TOKEN_USAGE_STRATEGY.md",
    "docs/contracts/ai-value-token-efficiency-signal/README.md",
    "docs/contracts/ai-value-token-efficiency-signal/examples/valid-token-efficiency-signal.json",
    "docs/contracts/ai-value-token-efficiency-signal/examples/held-token-efficiency-signal.json",
    "shared/src/aiValueEngine/tokenEfficiencySignal.ts",
    "scripts/validate_ai_value_token_efficiency_signal.test.mjs"
  ];
  const packageJson = readRequiredFile("package.json");

  return requiredFiles.every((path) => existsSync(path)) &&
    packageJson.includes("\"test:ai-value-token-efficiency-signal\"");
}

test("AI Value Blueprint docs exist and preserve Layer 1 guardrails", () => {
  const blueprint = readRequiredFile(BLUEPRINT_DOC);

  [
    "docs-only architecture note",
    "post-sales external-client product journey",
    "AI Fluency is the starting point",
    "VBD remains Layer 1 AI fluency posture",
    "Token Efficiency is Layer 1 cost/intensity overlay only",
    "token usage is not ROI proof",
    "token usage is not value proof",
    "token usage is not productivity proof",
    "token usage is not causality proof",
    "token usage is not financial output",
    "Missing Layer 2 and Layer 3 evidence becomes client evidence requests",
    "Customer Exposure Policy must pass before external display",
    "No migrations, Prisma schema edits, backend routes, frontend UI, ingestion jobs, persistence, raw/person-level fields, identifiers, raw prompts/responses/transcripts/query/file contents/raw BigQuery rows, ROI, EBITA, productivity, causality, headcount, individual attribution, manager_or_team_ranking, people decisioning, or customer-facing financial output are authorized."
  ].forEach((phrase) => assertContains(blueprint, phrase, BLUEPRINT_DOC));

  const hasTrackAArtifacts = trackATokenEfficiencyArtifactsExist();
  if (hasTrackAArtifacts) {
    assertContains(blueprint, "Token Efficiency is `contract_only`", BLUEPRINT_DOC);
    assertContains(blueprint, "The current Track A contract authorizes only bounded Layer 1 cost/intensity review and evidence planning.", BLUEPRINT_DOC);
  } else {
    assert.match(
      blueprint,
      /Token Efficiency[\s\S]{0,240}(pending|in_progress|in progress)/i,
      "Token Efficiency must stay pending/in_progress when Track A artifacts are absent"
    );
    assert.doesNotMatch(
      blueprint,
      /Token Efficiency[\s\S]{0,240}\b(contract_only|implemented|available|landed|complete)\b/i,
      "Token Efficiency must not be described as contract_only or implemented without exact Track A artifacts and token test script"
    );
  }
});

test("AI Value Blueprint crosswalk maps required contracts and exposure states", () => {
  const crosswalk = readRequiredFile(CROSSWALK_DOC);

  [
    "docs/architecture/AI_VALUE_BLUEPRINT.md",
    "docs/contracts/ai-value-intelligence/README.md",
    "docs/contracts/ai-value-measurement-plan/README.md",
    "docs/contracts/ai-value-source-packages/README.md",
    "docs/contracts/ai-value-evidence-collection-assembler/README.md",
    "docs/contracts/ai-value-evidence-snapshot/README.md",
    "docs/contracts/ai-value-claim-readiness-handoff/README.md",
    "docs/contracts/ai-value-claim-readiness-snapshot/README.md",
    "docs/contracts/ai-value-executive-readout-snapshot/README.md",
    "docs/contracts/ai-value-customer-exposure-policy/README.md",
    "docs/contracts/ai-value-post-sales-workflow-orchestrator/README.md",
    "docs/contracts/ai-value-customer-journey/README.md",
    "docs/contracts/ai-value-client-evidence-request/README.md",
    "docs/contracts/ai-value-client-evidence-entry/README.md",
    "docs/contracts/ai-value-ai-fluency-intake-bridge/README.md",
    "docs/contracts/quality-multiplier.md",
    "docs/contracts/causal-delta.md",
    "docs/contracts/reliability-factor.md",
    "docs/contracts/value-confidence/README.md"
  ].forEach((phrase) => assertContains(crosswalk, phrase, CROSSWALK_DOC));

  [
    "Contract/doc status",
    "Schema status",
    "Persistence status",
    "Runtime status",
    "Customer exposure status",
    "bounded downstream context",
    "not ROI proof",
    "not value proof",
    "not productivity proof",
    "not causality proof",
    "not financial output"
  ].forEach((phrase) => assertContains(crosswalk, phrase, CROSSWALK_DOC));

  const hasTrackAArtifacts = trackATokenEfficiencyArtifactsExist();
  if (hasTrackAArtifacts) {
    assertContains(crosswalk, "`contract_only`: Track A artifacts are present", CROSSWALK_DOC);
    assertContains(crosswalk, "shared/src/aiValueEngine/tokenEfficiencySignal.ts", CROSSWALK_DOC);
    assertContains(crosswalk, "scripts/validate_ai_value_token_efficiency_signal.test.mjs", CROSSWALK_DOC);
    assertContains(crosswalk, "No persistence", CROSSWALK_DOC);
  } else {
    assert.match(
      crosswalk,
      /Token Efficiency[\s\S]{0,300}(pending|in_progress|in progress)/i,
      "Crosswalk must keep Token Efficiency pending/in_progress without Track A artifacts"
    );
    assert.doesNotMatch(
      crosswalk,
      /Token Efficiency[\s\S]{0,300}\b(contract_only|implemented|available|landed|complete)\b/i,
      "Crosswalk must not mark Token Efficiency contract_only or implemented without exact Track A artifacts"
    );
  }
});
