import {
  GleanSignalReadinessMapSchema,
  type GleanSignalReadinessEntry
} from "@learnaire/shared";

type EvidenceStatus = "present" | "not_present" | "suppressed" | "not_computed";

type EvidenceBundleFromReadiness = {
  schema_version: "evidence_bundle.v1";
  org_id: string;
  window: string;
  generated_at: string;
  suppression: {
    k_min: number;
    suppression_applied: boolean;
    suppression_reasons: Array<"privacy_policy_guardrail">;
  };
  coverage: {
    instrumented_sources: string[];
    missing_sources: string[];
    coverage_notes: string;
  };
  exposure: {
    shadow_ai: EvidenceStatus;
    unsanctioned_tool_class: EvidenceStatus;
  };
  calibration: {
    verification_presence: EvidenceStatus;
    recovery_presence: EvidenceStatus;
    escalation_to_safe_path_presence: EvidenceStatus;
  };
  fragility: {
    friction_loops_elevated: EvidenceStatus;
    rapid_abandonment_elevated: EvidenceStatus;
    blind_acceptance_risk_elevated: EvidenceStatus;
  };
  learning: {
    trend_direction: "not_computed";
  };
};

function evidenceStatus(entry: GleanSignalReadinessEntry | undefined): EvidenceStatus {
  if (!entry) {
    return "not_computed";
  }
  if (entry.readiness_status === "present") {
    return "present";
  }
  if (entry.readiness_status === "missing") {
    return "not_present";
  }
  return entry.readiness_status;
}

function findEntry(entries: GleanSignalReadinessEntry[], family: string): GleanSignalReadinessEntry | undefined {
  return entries.find((entry) => entry.signal_family === family);
}

function noteFor(entry: GleanSignalReadinessEntry): string {
  const suffix = entry.suppression_reasons.length > 0 ? `:${entry.suppression_reasons.join(",")}` : "";
  return `${entry.signal_family}:${entry.readiness_status}${suffix}`;
}

export function deriveEvidenceBundleFromGleanReadiness(raw: unknown): EvidenceBundleFromReadiness {
  const readinessMap = GleanSignalReadinessMapSchema.parse(raw);
  const presentEntries = readinessMap.entries.filter((entry) => entry.readiness_status === "present");
  const nonPresentEntries = readinessMap.entries.filter((entry) => entry.readiness_status !== "present");
  const aiSecurity = findEntry(readinessMap.entries, "ai_security");
  const mcpUsage = findEntry(readinessMap.entries, "mcp_usage");
  const searchRetrieval = findEntry(readinessMap.entries, "search_document_retrieval");
  const workflowRun = findEntry(readinessMap.entries, "workflow_run");
  const suppressed = readinessMap.entries.some((entry) => entry.readiness_status === "suppressed");

  return {
    schema_version: "evidence_bundle.v1",
    org_id: readinessMap.org_id,
    window: readinessMap.window,
    generated_at: readinessMap.generated_at,
    suppression: {
      k_min: 5,
      suppression_applied: suppressed,
      suppression_reasons: suppressed ? ["privacy_policy_guardrail"] : []
    },
    coverage: {
      instrumented_sources: presentEntries.map((entry) => entry.signal_family),
      missing_sources: nonPresentEntries.map((entry) => entry.signal_family),
      coverage_notes:
        nonPresentEntries.length > 0
          ? `Glean readiness non-computable signals: ${nonPresentEntries.map(noteFor).join("; ")}`
          : "All Glean readiness signals in this map are present."
    },
    exposure: {
      shadow_ai: evidenceStatus(aiSecurity),
      unsanctioned_tool_class: evidenceStatus(mcpUsage)
    },
    calibration: {
      verification_presence: evidenceStatus(searchRetrieval),
      recovery_presence: evidenceStatus(workflowRun),
      escalation_to_safe_path_presence: evidenceStatus(mcpUsage)
    },
    fragility: {
      friction_loops_elevated: "not_computed",
      rapid_abandonment_elevated: "not_computed",
      blind_acceptance_risk_elevated: "not_computed"
    },
    learning: {
      trend_direction: "not_computed"
    }
  };
}
