import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  GleanAiWorkEvidenceExportSchema,
  buildGleanClaimEvaluationSetForRegistry,
  mapGleanAiWorkEvidenceToClaimEvaluations,
  mapGleanAiWorkEvidenceToReadinessInventory
} from "@learnaire/shared";

const repoRoot = resolve(__dirname, "../..");
const exportPath = resolve(
  repoRoot,
  "docs/contracts/glean-ai-work-evidence/examples/org-northstar-ai-work-export.json"
);
const registryPath = resolve(
  repoRoot,
  "docs/contracts/glean-claim-registry/examples/default-claim-registry.json"
);

function loadExport(): unknown {
  return JSON.parse(readFileSync(exportPath, "utf8"));
}

function loadRegistry(): unknown {
  return JSON.parse(readFileSync(registryPath, "utf8"));
}

describe("Glean AI Work Evidence adapter", () => {
  it("maps metadata-only work evidence into readiness inventory", () => {
    const inventory = mapGleanAiWorkEvidenceToReadinessInventory(loadExport());
    const signalFamilies = inventory.signals.map((signal) => signal.signal_family);

    expect(signalFamilies).toEqual(["assistant", "skill_lifecycle", "agent_run", "mcp_usage", "insights", "ai_security"]);
    expect(inventory.signals.find((signal) => signal.signal_family === "skill_lifecycle")?.source_availability).toBe(
      "available"
    );
    expect(inventory.signals.find((signal) => signal.signal_family === "mcp_usage")?.source_availability).toBe(
      "approved_pending_export"
    );
    expect(inventory.signals.find((signal) => signal.signal_family === "insights")?.validation_evidence[0].note).toBe(
      "Artifact output metadata is available as aggregate counts and types without artifact contents."
    );
  });

  it("maps metadata-only work evidence into registry-aware claim evaluations", () => {
    const evaluations = mapGleanAiWorkEvidenceToClaimEvaluations(loadExport());
    const validated = buildGleanClaimEvaluationSetForRegistry(evaluations, loadRegistry());
    const byClaimId = Object.fromEntries(validated.evaluations.map((evaluation) => [evaluation.claim_id, evaluation]));

    expect(byClaimId["glean.time_saved.covered_surfaces"].language_mode).toBe("suppressed");
    expect(byClaimId["glean.time_saved.covered_surfaces"].reason_codes).toContain("assumption_dominates_result");
    expect(byClaimId["glean.roi.customer_value_to_cost"].language_mode).toBe("suppressed");
    expect(byClaimId["glean.skills.reusable_expertise_operationalized"].evidence_state).toBe("present");
    expect(byClaimId["glean.agents.auto_mode_operationalized"].evidence_state).toBe("present");
    expect(byClaimId["glean.mcp.governed_action_boundary"].evidence_state).toBe("not_computed");
    expect(byClaimId["glean.artifacts.output_backed_work"].evidence_state).toBe("present");
  });

  it("rejects raw fields before mapping", () => {
    const parsed = GleanAiWorkEvidenceExportSchema.safeParse({
      ...(loadExport() as { records: Array<Record<string, unknown>> }),
      records: [
        {
          ...(loadExport() as { records: Array<Record<string, unknown>> }).records[0],
          prompt_text: "unsafe"
        }
      ]
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects arbitrary action text in favor of closed action codes", () => {
    const parsed = GleanAiWorkEvidenceExportSchema.safeParse({
      ...(loadExport() as { records: Array<Record<string, unknown>> }),
      records: [
        {
          ...(loadExport() as { records: Array<Record<string, unknown>> }).records[3],
          recommended_next_action: {
            action: "Review tool payload for user@example.com",
            owner: "glean_admin",
            priority: "high"
          }
        }
      ]
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects duplicate lanes to avoid readiness and claim divergence", () => {
    const exportPayload = loadExport() as { records: Array<Record<string, unknown>> };
    const parsed = GleanAiWorkEvidenceExportSchema.safeParse({
      ...exportPayload,
      records: [exportPayload.records[0], exportPayload.records[0]]
    });

    expect(parsed.success).toBe(false);
  });
});
