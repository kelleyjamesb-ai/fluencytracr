import {
  deriveEvidenceBundleFromGleanReadiness
} from "../src/evidence/gleanReadinessEvidence";
import * as fs from "node:fs";
import * as path from "node:path";

const Ajv = require("ajv");

const repoRoot = path.resolve(__dirname, "../..");

function readRepoJson(relativePath: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

const readinessMap = {
  schema_version: "GSR_2026_05",
  org_id: "org-northstar-enterprise",
  window: "weekly",
  generated_at: "2026-05-01T13:00:00.000Z",
  source_system: "Glean",
  entries: [
    {
      signal_family: "workflow_run",
      source_availability: "available",
      export_channel: "customer_event_logs",
      scrub_status: "scrubbed",
      stable_join_keys: ["run_id", "workflow_run_id"],
      derived_dimensions: ["usage_quality", "behavior_change", "coverage"],
      readiness_status: "present",
      suppression_applied: false,
      suppression_reasons: [],
      data_quality: {
        completeness: "verified",
        latency: "known",
        join_reliability: "stable"
      },
      validation_evidence: []
    },
    {
      signal_family: "agent_run",
      source_availability: "available",
      export_channel: "customer_event_logs",
      scrub_status: "scrubbed",
      stable_join_keys: ["run_id", "trace_id"],
      derived_dimensions: ["behavior_change", "capability_growth", "coverage"],
      readiness_status: "present",
      suppression_applied: false,
      suppression_reasons: [],
      data_quality: {
        completeness: "verified",
        latency: "known",
        join_reliability: "stable"
      },
      validation_evidence: []
    },
    {
      signal_family: "search_document_retrieval",
      source_availability: "available",
      export_channel: "customer_event_logs",
      scrub_status: "scrubbed",
      stable_join_keys: ["workflow_run_id", "action_run_id"],
      derived_dimensions: ["usage_quality", "calibration", "coverage"],
      readiness_status: "present",
      suppression_applied: false,
      suppression_reasons: [],
      data_quality: {
        completeness: "partial",
        latency: "known",
        join_reliability: "stable"
      },
      validation_evidence: []
    },
    {
      signal_family: "mcp_usage",
      source_availability: "approved_pending_export",
      export_channel: "customer_event_logs",
      scrub_status: "unknown",
      stable_join_keys: ["trace_id", "workflow_run_id"],
      derived_dimensions: ["capability_growth", "calibration"],
      readiness_status: "not_computed",
      suppression_applied: false,
      suppression_reasons: [],
      data_quality: {
        completeness: "unknown",
        latency: "unknown",
        join_reliability: "partial"
      },
      validation_evidence: []
    },
    {
      signal_family: "ai_security",
      source_availability: "available",
      export_channel: "customer_event_logs",
      scrub_status: "scrubbed",
      stable_join_keys: ["workflow_run_id"],
      derived_dimensions: ["leadership_reinforcement", "exposure"],
      readiness_status: "suppressed",
      suppression_applied: true,
      suppression_reasons: ["policy_review_required"],
      data_quality: {
        completeness: "partial",
        latency: "known",
        join_reliability: "partial"
      },
      validation_evidence: []
    }
  ],
  next_actions: []
};

describe("deriveEvidenceBundleFromGleanReadiness", () => {
  it("derives coverage from present Glean readiness entries", () => {
    const bundle = deriveEvidenceBundleFromGleanReadiness(readinessMap);

    expect(bundle.schema_version).toBe("evidence_bundle.v1");
    expect(bundle.coverage.instrumented_sources).toEqual([
      "workflow_run",
      "agent_run",
      "search_document_retrieval"
    ]);
    expect(bundle.coverage.missing_sources).toEqual(["mcp_usage", "ai_security"]);
  });

  it("keeps not-computed MCP usage from becoming present controls", () => {
    const bundle = deriveEvidenceBundleFromGleanReadiness(readinessMap);

    expect(bundle.exposure.unsanctioned_tool_class).toBe("not_computed");
    expect(bundle.calibration.escalation_to_safe_path_presence).toBe("not_computed");
    expect(bundle.coverage.coverage_notes).toContain("mcp_usage:not_computed");
  });

  it("maps suppressed AI Security to EvidenceBundle-compatible suppression semantics", () => {
    const bundle = deriveEvidenceBundleFromGleanReadiness(readinessMap);

    expect(bundle.suppression.suppression_applied).toBe(true);
    expect(bundle.suppression.suppression_reasons).toEqual(["privacy_policy_guardrail"]);
    expect(bundle.exposure.shadow_ai).toBe("suppressed");
    expect(bundle.coverage.coverage_notes).toContain("ai_security:suppressed:policy_review_required");
  });

  it("matches the committed demo fixture and EvidenceBundle JSON schema", () => {
    const sourceDerivedReadiness = readRepoJson(
      "docs/contracts/glean-signal-readiness/examples/org-northstar-source-derived-readiness-map.json"
    );
    const expectedBundle = readRepoJson(
      "docs/contracts/evidence-bundle/v1/examples/glean-readiness-derived.json"
    );
    const evidenceSchema = readRepoJson(
      "docs/contracts/evidence-bundle/v1/evidence-bundle.schema.json"
    );
    const bundle = deriveEvidenceBundleFromGleanReadiness(sourceDerivedReadiness);
    const validate = new Ajv({ allErrors: true, schemaId: "auto" }).compile(evidenceSchema);

    expect(bundle).toEqual(expectedBundle);
    expect(validate(bundle)).toBe(true);
  });
});
