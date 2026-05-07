#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  GleanClaimEvaluationSetSchema,
  GleanClaimRegistrySchema,
  GleanValueEvidencePackSchema,
  buildGleanClaimEvaluationSetForRegistry,
  mapClaimEvaluationToValueEvidenceClaimReadiness
} from "../shared/dist/index.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(repoRoot, relativePath), "utf8"));
}

const registry = readJson("docs/contracts/glean-claim-registry/examples/default-claim-registry.json");
const evaluations = readJson("docs/contracts/glean-claim-registry/examples/org-northstar-claim-evaluations.json");
const valuePack = readJson("docs/contracts/glean-value-evidence/examples/org-northstar-value-pack.json");

GleanClaimRegistrySchema.parse(registry);
GleanClaimEvaluationSetSchema.parse(evaluations);
GleanValueEvidencePackSchema.parse(valuePack);
const validatedEvaluations = buildGleanClaimEvaluationSetForRegistry(evaluations, registry);
const mappedEvaluations = validatedEvaluations.evaluations.map(mapClaimEvaluationToValueEvidenceClaimReadiness);
const mappedByClaimId = new Map(mappedEvaluations.map((claim) => [claim.claim_id, claim]));

for (const template of registry.claim_templates) {
  if (template.claim_type === "roi") {
    const unsafeModes = template.allowed_language_modes.filter(
      (mode) => mode === "executive_safe" || mode === "customer_safe_with_caveats"
    );
    if (unsafeModes.length > 0) {
      throw new Error(`ROI template ${template.claim_id} allows customer-safe modes: ${unsafeModes.join(", ")}`);
    }
  }
}

for (const evaluation of evaluations.evaluations) {
  if (
    evaluation.claim_type === "roi" &&
    (evaluation.language_mode === "executive_safe" || evaluation.language_mode === "customer_safe_with_caveats")
  ) {
    throw new Error(`ROI evaluation ${evaluation.claim_id} uses customer-safe language.`);
  }
}

for (const claim of valuePack.claim_readiness) {
  const mappedClaim = mappedByClaimId.get(claim.claim_id);
  if (!mappedClaim) {
    throw new Error(`Value pack claim ${claim.claim_id} is missing from registry-aware evaluations.`);
  }
  if (JSON.stringify(claim) !== JSON.stringify(mappedClaim)) {
    throw new Error(`Value pack claim ${claim.claim_id} does not match registry-aware evaluation output.`);
  }
  if (
    claim.claim_type === "roi" &&
    (claim.language_mode === "executive_safe" || claim.language_mode === "customer_safe_with_caveats")
  ) {
    throw new Error(`Value pack ROI claim ${claim.claim_id} uses customer-safe language.`);
  }
}

console.log("Glean value governance gates passed.");
