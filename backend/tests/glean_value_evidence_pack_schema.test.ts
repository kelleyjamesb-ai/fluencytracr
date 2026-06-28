import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  GleanValueEvidencePackSchema,
  buildGleanValueEvidencePack
} from "@fluencytracr/shared";

const repoRoot = resolve(__dirname, "../..");
const examplePath = resolve(
  repoRoot,
  "docs/contracts/glean-value-evidence/examples/org-northstar-value-pack.json"
);

function loadExample(): unknown {
  return JSON.parse(readFileSync(examplePath, "utf8"));
}

describe("GleanValueEvidencePackSchema", () => {
  it("accepts the committed org-window value evidence pack example", () => {
    const parsed = buildGleanValueEvidencePack(loadExample());

    expect(parsed.schema_version).toBe("GVE_2026_05");
    expect(parsed.coverage_lanes.map((lane) => lane.lane)).toEqual([
      "surface_usage",
      "skill_lifecycle",
      "agent_lifecycle",
      "mcp_action_boundary",
      "artifact_output",
      "control_evidence",
      "assumptions"
    ]);
    expect(parsed.skill_lifecycle.skill_types).toContain("imported");
    expect(parsed.agent_lifecycle.agent_types).toContain("auto_mode");
    expect(parsed.claim_readiness.find((claim) => claim.claim_type === "roi")?.language_mode).toBe("suppressed");
    expect(GleanValueEvidencePackSchema.parse(parsed)).toEqual(parsed);
  });

  it("rejects raw content, direct identifier, and ranking fields", () => {
    const unsafeKeys = ["user_id", "prompt_text", "raw_response", "transcript", "team_ranking", "productivity_score"];

    for (const key of unsafeKeys) {
      const example = loadExample() as { skill_lifecycle: Record<string, unknown> };
      const result = GleanValueEvidencePackSchema.safeParse({
        ...example,
        skill_lifecycle: {
          ...example.skill_lifecycle,
          [key]: "unsafe"
        }
      });

      expect(result.success).toBe(false);
    }
  });

  it("rejects suppressed claims that still include customer-safe language", () => {
    const example = loadExample() as { claim_readiness: Array<Record<string, unknown>> };
    const result = GleanValueEvidencePackSchema.safeParse({
      ...example,
      claim_readiness: [
        {
          ...example.claim_readiness[1],
          readiness_state: "customer_safe",
          language_mode: "executive_safe",
          customer_safe_language: "This ROI claim is safe despite suppressed evidence."
        }
      ]
    });

    expect(result.success).toBe(false);
  });

  it("rejects suppressed claims that still include approved language", () => {
    const example = loadExample() as { claim_readiness: Array<Record<string, unknown>> };
    const result = GleanValueEvidencePackSchema.safeParse({
      ...example,
      claim_readiness: [
        {
          ...example.claim_readiness[1],
          approved_language: "This suppressed ROI claim is approved."
        }
      ]
    });

    expect(result.success).toBe(false);
  });

  it("rejects customer-safe ROI claim readiness until assumption governance is approved", () => {
    const example = loadExample() as { claim_readiness: Array<Record<string, unknown>> };
    const result = GleanValueEvidencePackSchema.safeParse({
      ...example,
      claim_readiness: [
        {
          ...example.claim_readiness[1],
          evaluation_state: "surface",
          evidence_state: "present",
          readiness_state: "customer_safe_with_caveats",
          language_mode: "customer_safe_with_caveats",
          reason_codes: [],
          customer_safe_language: "This ROI claim is customer-safe with caveats."
        }
      ]
    });

    expect(result.success).toBe(false);
  });

  it("rejects customer-safe readiness when language remains internal-only", () => {
    const example = loadExample() as { claim_readiness: Array<Record<string, unknown>> };
    const result = GleanValueEvidencePackSchema.safeParse({
      ...example,
      claim_readiness: [
        {
          ...example.claim_readiness[0],
          readiness_state: "customer_safe",
          language_mode: "internal_only"
        }
      ]
    });

    expect(result.success).toBe(false);
  });
});
