import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  GleanClaimEvaluationSetSchema,
  GleanClaimRegistrySchema,
  GleanValueClaimReadinessSchema,
  UNIVERSAL_GLEAN_FORBIDDEN_CLAIM_INPUTS,
  buildGleanClaimEvaluationSet,
  buildGleanClaimEvaluationSetForRegistry,
  buildGleanClaimRegistry,
  mapClaimEvaluationToValueEvidenceClaimReadiness
} from "@fluencytracr/shared";

const repoRoot = resolve(__dirname, "../..");
const registryPath = resolve(
  repoRoot,
  "docs/contracts/glean-claim-registry/examples/default-claim-registry.json"
);
const evaluationsPath = resolve(
  repoRoot,
  "docs/contracts/glean-claim-registry/examples/org-northstar-claim-evaluations.json"
);

function loadRegistry(): unknown {
  return JSON.parse(readFileSync(registryPath, "utf8"));
}

function loadEvaluations(): unknown {
  return JSON.parse(readFileSync(evaluationsPath, "utf8"));
}

describe("GleanClaimRegistrySchema", () => {
  it("accepts the committed default claim registry example", () => {
    const parsed = buildGleanClaimRegistry(loadRegistry());

    expect(parsed.schema_version).toBe("GCR_2026_05");
    expect(parsed.claim_templates).toHaveLength(10);
    expect(parsed.claim_templates.map((template) => template.claim_id)).toContain("glean.roi.customer_value_to_cost");
    expect(parsed.claim_templates.find((template) => template.claim_type === "skill_reuse")?.required_lanes).toContain(
      "skill_lifecycle"
    );
    for (const template of parsed.claim_templates) {
      expect(template.forbidden_inputs).toEqual(expect.arrayContaining([...UNIVERSAL_GLEAN_FORBIDDEN_CLAIM_INPUTS]));
    }
    expect(GleanClaimRegistrySchema.parse(parsed)).toEqual(parsed);
  });

  it("rejects ROI templates that do not require assumptions or default to executive-safe language", () => {
    const registry = loadRegistry() as { claim_templates: Array<Record<string, unknown>> };
    const roiTemplate = registry.claim_templates.find((template) => template.claim_type === "roi")!;

    const result = GleanClaimRegistrySchema.safeParse({
      ...registry,
      claim_templates: [
        {
          ...roiTemplate,
          required_lanes: ["surface_usage"],
          default_language_mode: "executive_safe",
          safe_language_template: "This ROI claim is validated."
        }
      ]
    });

    expect(result.success).toBe(false);
  });

  it("rejects templates that omit any universal forbidden input", () => {
    const registry = loadRegistry() as { claim_templates: Array<Record<string, unknown>> };

    const result = GleanClaimRegistrySchema.safeParse({
      ...registry,
      claim_templates: [
        {
          ...registry.claim_templates[0],
          forbidden_inputs: ["direct_identifier"]
        }
      ]
    });

    expect(result.success).toBe(false);
  });
});

describe("GleanClaimEvaluationSetSchema", () => {
  it("accepts the committed org-window claim evaluation example", () => {
    const parsed = buildGleanClaimEvaluationSet(loadEvaluations());

    expect(parsed.schema_version).toBe("GCR_2026_05");
    expect(parsed.registry_id).toBe("glean-default-value-claims");
    expect(parsed.evaluations.find((evaluation) => evaluation.claim_type === "roi")?.language_mode).toBe("suppressed");
    expect(GleanClaimEvaluationSetSchema.parse(parsed)).toEqual(parsed);
  });

  it("validates evaluations against the referenced registry before mapping to value evidence", () => {
    const parsed = buildGleanClaimEvaluationSetForRegistry(loadEvaluations(), loadRegistry());
    const mapped = parsed.evaluations.map(mapClaimEvaluationToValueEvidenceClaimReadiness);

    expect(mapped).toHaveLength(parsed.evaluations.length);
    for (const claim of mapped) {
      expect(GleanValueClaimReadinessSchema.parse(claim)).toEqual(claim);
      expect(claim).not.toHaveProperty("missing_lanes");
    }
  });

  it("rejects evaluations whose claim id and type do not match the registry", () => {
    const evaluations = loadEvaluations() as { evaluations: Array<Record<string, unknown>> };

    expect(() =>
      buildGleanClaimEvaluationSetForRegistry(
        {
          ...evaluations,
          evaluations: [
            {
              ...evaluations.evaluations[1],
              claim_type: "time_saved",
              evaluation_state: "surface",
              evidence_state: "present",
              confidence_basis: "derived_aggregate",
              readiness_state: "customer_safe_with_caveats",
              language_mode: "customer_safe_with_caveats",
              approved_language: "This mismatched ROI claim is safe."
            }
          ]
        },
        loadRegistry()
      )
    ).toThrow(/claim_type mismatch/);
  });

  it("rejects suppressed evaluations that include approved language", () => {
    const evaluations = loadEvaluations() as { evaluations: Array<Record<string, unknown>> };

    const result = GleanClaimEvaluationSetSchema.safeParse({
      ...evaluations,
      evaluations: [
        {
          ...evaluations.evaluations[1],
          language_mode: "customer_safe_with_caveats",
          readiness_state: "customer_safe_with_caveats",
          approved_language: "This suppressed ROI claim is safe to share."
        }
      ]
    });

    expect(result.success).toBe(false);
  });

  it("rejects customer-safe ROI evaluations until assumption governance is approved", () => {
    const evaluations = loadEvaluations() as { evaluations: Array<Record<string, unknown>> };

    const result = GleanClaimEvaluationSetSchema.safeParse({
      ...evaluations,
      evaluations: [
        {
          ...evaluations.evaluations[1],
          evaluation_state: "surface",
          evidence_state: "present",
          confidence_basis: "assumption_backed",
          readiness_state: "customer_safe_with_caveats",
          language_mode: "customer_safe_with_caveats",
          reason_codes: [],
          approved_language: "This ROI claim is caveated and customer-safe."
        }
      ]
    });

    expect(result.success).toBe(false);
  });

  it("rejects customer-safe readiness when language remains internal-only", () => {
    const evaluations = loadEvaluations() as { evaluations: Array<Record<string, unknown>> };

    const result = GleanClaimEvaluationSetSchema.safeParse({
      ...evaluations,
      evaluations: [
        {
          ...evaluations.evaluations[0],
          readiness_state: "customer_safe",
          language_mode: "internal_only"
        }
      ]
    });

    expect(result.success).toBe(false);
  });

});
